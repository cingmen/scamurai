// Diagram aliran uang debrief (SVG statis berparameter, styles.md).
import { h } from '../core/dom.js';

export function flowDiagram(aliran = {}) {
  const nodes = aliran.nodes || [];
  const edges = aliran.edges || [];
  const rowH = 62;
  const height = Math.max(140, nodes.length * rowH + 16);
  const width = 440;
  const nodeW = 300;
  const nodeH = 42;
  const x = (width - nodeW) / 2;

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', aliran.alt || 'Diagram aliran uang penipuan');

  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  defs.innerHTML = '<marker id="flowArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#8D867C"/></marker>';
  svg.append(defs);

  const positions = new Map();
  nodes.forEach((node, index) => {
    const y = 8 + index * rowH;
    positions.set(node.id, { x, y });
  });

  edges.forEach((edge) => {
    const from = positions.get(edge.from);
    const to = positions.get(edge.to);
    if (!from || !to) return;
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const startY = from.y + nodeH;
    const endY = to.y;
    const midY = startY + (endY - startY) / 2;
    const label = edge.label;
    path.setAttribute('d', `M ${width / 2} ${startY} C ${width / 2} ${midY}, ${width / 2} ${midY}, ${width / 2} ${endY - 4}`);
    path.setAttribute('class', 'c-flow__edge');
    svg.append(path);
    if (label) {
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', String(width / 2 + 8));
      text.setAttribute('y', String(midY + 4));
      text.setAttribute('class', 'c-flow__label');
      text.setAttribute('style', 'font-size:9px;fill:#8D867C');
      text.textContent = label;
      svg.append(text);
    }
  });

  nodes.forEach((node) => {
    const { y } = positions.get(node.id);
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', String(x));
    rect.setAttribute('y', String(y));
    rect.setAttribute('width', String(nodeW));
    rect.setAttribute('height', String(nodeH));
    rect.setAttribute('rx', '10');
    rect.setAttribute('class', `c-flow__node${node.tone === 'danger' ? ' c-flow__node--danger' : ''}`);
    svg.append(rect);

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', String(width / 2));
    text.setAttribute('y', String(y + 26));
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('class', 'c-flow__label');
    text.textContent = node.label;
    svg.append(text);
  });

  return h('div', { class: 'c-flow' }, svg);
}
