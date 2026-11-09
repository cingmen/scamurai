// Render beranda tanpa browser: DOM shim kecil + fetch/localStorage stub.
// Mode default mengganti shell di index.html; --check membandingkannya.
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const indexPath = path.join(rootDir, 'index.html');
const CHECK = process.argv.includes('--check');
const MARKER = 'data-prerendered-home="1"';

class Node {
  constructor() {
    this.children = [];
    this.parent = null;
  }
}

class Text extends Node {
  constructor(value) {
    super();
    this.value = String(value);
  }
  get textContent() { return this.value; }
  set textContent(value) { this.value = String(value); }
}

class Element extends Node {
  constructor(tagName) {
    super();
    this.tagName = String(tagName).toLowerCase();
    this.attributes = {};
    this.dataset = {};
    this.style = {};
    this.className = '';
  }

  appendChild(child) {
    if (child instanceof Node) {
      child.parent = this;
      this.children.push(child);
    } else {
      this.children.push(new Text(child));
    }
    return child;
  }

  append(...children) {
    for (const child of children) {
      if (Array.isArray(child)) this.append(...child);
      else this.appendChild(child);
    }
  }

  removeChild(child) {
    const index = this.children.indexOf(child);
    if (index !== -1) {
      this.children.splice(index, 1);
      child.parent = null;
    }
    return child;
  }

  get firstChild() { return this.children[0] || null; }
  get lastChild() { return this.children[this.children.length - 1] || null; }

  setAttribute(name, value) {
    this.attributes[String(name)] = String(value);
  }

  addEventListener() { /* event tidak diperlukan saat render statis */ }

  get textContent() {
    return this.children.map((child) => child.textContent || '').join('');
  }

  set textContent(value) {
    this.children = [];
    this.appendChild(new Text(value));
  }

  querySelector() { return null; }
  querySelectorAll() { return []; }
}

class Document {
  constructor(baseURI) {
    this.baseURI = baseURI;
  }
  createElement(tagName) { return new Element(tagName); }
  createTextNode(value) { return new Text(value); }
}

const voidTags = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

function escapeText(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\u00a0/g, '&nbsp;');
}

function escapeAttr(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

function kebabCase(name) {
  return String(name).replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);
}

function serialize(node) {
  if (node instanceof Text) return escapeText(node.value);
  const tag = node.tagName;
  const attrs = [];
  if (node.className) attrs.push(`class="${escapeAttr(node.className)}"`);
  for (const [name, value] of Object.entries(node.attributes)) {
    if (name === 'class') continue;
    attrs.push(`${name}="${escapeAttr(value)}"`);
  }
  const style = Object.entries(node.style)
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([name, value]) => `${kebabCase(name)}: ${value};`)
    .join(' ');
  if (style) attrs.push(`style="${escapeAttr(style)}"`);
  for (const [name, value] of Object.entries(node.dataset)) {
    attrs.push(`data-${kebabCase(name)}="${escapeAttr(value)}"`);
  }
  const open = `<${tag}${attrs.length ? ` ${attrs.join(' ')}` : ''}>`;
  if (voidTags.has(tag)) return open;
  return `${open}${node.children.map(serialize).join('')}</${tag}>`;
}

function installGlobals() {
  globalThis.Node = Node;
  globalThis.document = new Document('http://localhost/');
  const storage = new Map();
  globalThis.localStorage = {
    getItem(key) { return storage.has(key) ? storage.get(key) : null; },
    setItem(key, value) { storage.set(key, String(value)); },
    removeItem(key) { storage.delete(key); },
    clear() { storage.clear(); },
  };
  globalThis.window = {
    addEventListener() {},
    removeEventListener() {},
    location: { protocol: 'http:' },
  };
  globalThis.fetch = async (input) => {
    const url = new URL(String(input), 'http://localhost/');
    const filePath = path.join(rootDir, decodeURIComponent(url.pathname.replace(/^\//, '')));
    const body = await readFile(filePath, 'utf8');
    return {
      ok: true,
      status: 200,
      async json() { return JSON.parse(body); },
    };
  };
}

export async function renderHome() {
  installGlobals();
  const { render } = await import('../js/screens/home.js');
  const app = new Element('main');
  app.setAttribute('id', 'app');
  await render(app);
  const home = app.firstChild;
  if (!home || home.className !== 'scr-home') {
    throw new Error('Render beranda tidak menghasilkan .scr-home.');
  }
  home.setAttribute('data-prerendered-home', '1');
  return serialize(home);
}

function findShell(html) {
  const startToken = '<div class="scr-home" data-prerendered-home="1">';
  const start = html.indexOf(startToken);
  if (start === -1) return null;
  let depth = 0;
  let end = -1;
  const tagPattern = /<div\b[^>]*>|<\/div>/g;
  tagPattern.lastIndex = start;
  for (let match = tagPattern.exec(html); match; match = tagPattern.exec(html)) {
    if (match[0].startsWith('</')) depth -= 1;
    else depth += 1;
    if (depth === 0) {
      end = match.index + match[0].length;
      break;
    }
  }
  if (end === -1) return null;
  return { start, end, html: html.slice(start, end) };
}

const generated = await renderHome();
const indexHtml = await readFile(indexPath, 'utf8');
const current = findShell(indexHtml);

if (!current) {
  console.error('✗ Shell prerender tidak ditemukan di index.html.');
  process.exit(1);
}

if (CHECK) {
  if (current.html === generated) {
    console.log('✓ Shell prerender sinkron dengan home.js.');
    process.exit(0);
  }
  console.error('✗ Shell prerender berbeda dari output home.js.');
  console.error('  Jalankan: npm run prerender:home');
  process.exit(1);
}

if (current.html !== generated) {
  const next = `${indexHtml.slice(0, current.start)}${generated}${indexHtml.slice(current.end)}`;
  await writeFile(indexPath, next, 'utf8');
  console.log('✓ Shell prerender diperbarui dari home.js.');
} else {
  console.log('✓ Shell prerender sudah sinkron.');
}
