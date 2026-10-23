// Minimal dependency-free SVG line chart.
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// series: [{ label, points: [{x: 'YYYY-MM-DD', y}], cls }]; marks: [{x, label}] vertical; refs: [{y, label}] horizontal
export function lineChart(series, { height = 180, marks = [], refs = [], unit = '' } = {}) {
  const pts = series.flatMap((s) => s.points);
  if (pts.length < 1) return '<p class="muted">Not enough data yet.</p>';
  const W = 340, H = height, L = 38, R = 8, T = 10, B = 22;
  const xs = [...pts.map((p) => Date.parse(p.x)), ...marks.map((m) => Date.parse(m.x))];
  const ys = [...pts.map((p) => p.y), ...refs.map((r) => r.y)];
  let x0 = Math.min(...xs), x1 = Math.max(...xs);
  if (x0 === x1) { x0 -= 864e5; x1 += 864e5; }
  let y0 = Math.min(...ys), y1 = Math.max(...ys);
  const pad = (y1 - y0) * 0.1 || Math.max(1, y1 * 0.05);
  y0 = Math.max(0, y0 - pad); y1 += pad;
  const sx = (x) => L + ((Date.parse(x) - x0) / (x1 - x0)) * (W - L - R);
  const sy = (y) => T + (1 - (y - y0) / (y1 - y0)) * (H - T - B);
  const ticks = [y0, (y0 + y1) / 2, y1];
  let svg = `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img">`;
  for (const t of ticks) {
    svg += `<line x1="${L}" x2="${W - R}" y1="${sy(t)}" y2="${sy(t)}" class="grid"/>`;
    svg += `<text x="${L - 4}" y="${sy(t) + 3}" text-anchor="end" class="axis">${Math.round(t)}</text>`;
  }
  const d0 = new Date(x0).toISOString().slice(0, 7), d1 = new Date(x1).toISOString().slice(0, 7);
  svg += `<text x="${L}" y="${H - 6}" class="axis">${d0}</text><text x="${W - R}" y="${H - 6}" text-anchor="end" class="axis">${d1}</text>`;
  for (const r of refs) svg += `<line x1="${L}" x2="${W - R}" y1="${sy(r.y)}" y2="${sy(r.y)}" class="ref"/><text x="${W - R}" y="${sy(r.y) - 3}" text-anchor="end" class="axis ref-t">${esc(r.label)}</text>`;
  for (const m of marks) svg += `<line x1="${sx(m.x)}" x2="${sx(m.x)}" y1="${T}" y2="${H - B}" class="mark"/><text x="${sx(m.x) + 3}" y="${T + 9}" class="axis mark-t">${esc(m.label)}</text>`;
  for (const s of series) {
    const p = [...s.points].sort((a, b) => a.x.localeCompare(b.x));
    if (!p.length) continue;
    if (!s.noLine) svg += `<polyline fill="none" class="line ${s.cls || ''}" points="${p.map((q) => `${sx(q.x).toFixed(1)},${sy(q.y).toFixed(1)}`).join(' ')}"/>`;
    if (!s.noDots) for (const q of p) svg += `<circle cx="${sx(q.x).toFixed(1)}" cy="${sy(q.y).toFixed(1)}" r="2.5" class="dot ${s.cls || ''}"><title>${q.x}: ${Math.round(q.y * 10) / 10}${unit}</title></circle>`;
  }
  svg += '</svg>';
  const legend = series.length > 1 ? `<div class="legend">${series.map((s) => `<span class="lg ${s.cls || ''}">${esc(s.label)}</span>`).join('')}</div>` : '';
  return svg + legend;
}
