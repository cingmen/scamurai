// Helper DOM kecil. Semua teks dari data JSON masuk sebagai text node,
// tidak pernah sebagai HTML mentah (PRD §19.6).

/** Buat elemen. attrs: class,dataset,style,on*,aria-*, atau atribut lain. */
export function h(tag, attrs = null, ...children) {
  const node = document.createElement(tag);
  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      if (value === null || value === undefined || value === false) continue;
      if (key === 'class') node.className = value;
      else if (key === 'dataset') Object.assign(node.dataset, value);
      else if (key === 'style' && typeof value === 'object') Object.assign(node.style, value);
      else if (key === 'text') node.textContent = String(value);
      else if (key.startsWith('on') && typeof value === 'function') {
        node.addEventListener(key.slice(2).toLowerCase(), value);
      } else if (value === true) node.setAttribute(key, '');
      else node.setAttribute(key, String(value));
    }
  }
  append(node, children);
  return node;
}

/** Tambahkan anak (string/angka → text node; array → rekursif; null diabaikan). */
export function append(parent, children) {
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    if (Array.isArray(child)) append(parent, child);
    else if (child instanceof Node) parent.appendChild(child);
    else parent.appendChild(document.createTextNode(String(child)));
  }
  return parent;
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
}

export function replace(node, ...children) {
  clear(node);
  append(node, children);
  return node;
}

/** Scroll kontainer ke bawah (dipakai chat/sim). */
export function scrollToEnd(node) {
  if (!node) return;
  node.scrollTop = node.scrollHeight;
}

/** Tangani Escape + trap fokus sederhana untuk dialog. */
export function trapFocus(container) {
  const selector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
  function onKey(event) {
    if (event.key !== 'Tab') return;
    const focusable = [...container.querySelectorAll(selector)].filter(
      (el) => !el.disabled && el.offsetParent !== null,
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
  container.addEventListener('keydown', onKey);
  return () => container.removeEventListener('keydown', onKey);
}

export function mountPoint() {
  return document.getElementById('app');
}
