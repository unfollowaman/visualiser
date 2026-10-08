let lastW = 0, lastH = 0, ticking = false;
function computeGrid() {
  const w = document.documentElement.clientWidth, h = window.innerHeight;
  const narrow = w < 760;
  const pad = w < 640 ? 14 : 28;
  const cols = narrow ? 6 : (w < 1100 ? 10 : 14);
  const S = Math.floor((w - 2 * pad) / cols);
  const rows = Math.max(narrow ? 12 : 8, Math.floor((h - 68) / S));
  return { S, cols, rows, narrow, w, h };
}
function applyGrid() {
  const g = computeGrid(), r = document.documentElement.style;
  lastW = g.w; lastH = g.h;
  r.setProperty('--s', g.S + 'px');
  r.setProperty('--cols', g.cols);
  r.setProperty('--rows', g.rows);
  r.setProperty('--gutter', Math.max(3, Math.round(g.S * 0.07)) + 'px');
  window.dispatchEvent(new CustomEvent('gridchange', { detail: g }));
}
function onResize() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(function () {
    ticking = false;
    const w = document.documentElement.clientWidth, h = window.innerHeight;
    if (w !== lastW || Math.abs(h - lastH) > 150) applyGrid();
  });
}
window.addEventListener('resize', onResize);
window.addEventListener('orientationchange', onResize);
applyGrid();
