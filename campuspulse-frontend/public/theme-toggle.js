const STORAGE_KEY = 'campuspulse-theme';
const DARK_ROUTES = new Map([
  ['/feed', '/dark/feed'], ['/login', '/dark/login'], ['/directory/faculty', '/dark/directory/faculty'],
  ['/profile', '/dark/profile'], ['/study', '/dark/study'], ['/clubs', '/dark/clubs'],
]);
const DARK_MODE_ROUTES = new Map([...DARK_ROUTES].map(([light, dark]) => [dark, light]));

function readTheme() {
  try { return localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light'; }
  catch { return 'light'; }
}
function writeTheme(theme) {
  try { localStorage.setItem(STORAGE_KEY, theme); } catch {}
}
function routePair(pathname) {
  if (DARK_ROUTES.has(pathname)) return { light: pathname, dark: DARK_ROUTES.get(pathname) };
  if (DARK_MODE_ROUTES.has(pathname)) return { light: DARK_MODE_ROUTES.get(pathname), dark: pathname };
  const match = pathname.match(/^\/screens\/(light|dark)\/(feed|login|faculty|profile|study|clubs)\.html$/);
  if (!match) return null;
  const light = `/screens/light/${match[2]}.html`;
  const dark = `/screens/dark/${match[2]}.html`;
  return { light, dark };
}
function addThemeStyles() {
  if (document.getElementById('campuspulse-theme-styles')) return;
  const style = document.createElement('style');
  style.id = 'campuspulse-theme-styles';
  style.textContent = `
    .campuspulse-theme-toggle{position:fixed;right:20px;bottom:20px;z-index:10000;width:46px;height:46px;border:1px solid rgba(23,36,30,.18);border-radius:50%;display:grid;place-items:center;background:#17241e;color:#fffefa;box-shadow:0 8px 24px rgba(0,0,0,.18);font:600 20px/1 'DM Sans',sans-serif;cursor:pointer;transition:transform .18s ease,background-color .2s ease,color .2s ease}
    .campuspulse-theme-toggle:hover{transform:translateY(-2px)}
    html.dark .campuspulse-theme-toggle{background:#d8f078;color:#17241e;border-color:#d8f078}
    .campuspulse-theme-reveal{position:fixed;z-index:20000;width:24px;height:24px;left:0;top:0;border-radius:50%;pointer-events:none;transform:scale(0);transform-origin:center;background:#17241e;animation:campuspulse-radial-reveal .68s cubic-bezier(.2,.72,.18,1) forwards}
    @keyframes campuspulse-radial-reveal{to{transform:scale(var(--reveal-scale))}}
    @media(prefers-reduced-motion:reduce){.campuspulse-theme-toggle{transition:none}.campuspulse-theme-reveal{display:none}}
  `;
  document.head.append(style);
}
function updateToggle(button, theme) {
  button.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
  button.setAttribute('aria-pressed', String(theme === 'dark'));
  button.title = `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`;
  button.textContent = theme === 'dark' ? '☀' : '☾';
}
function addReveal(event, theme, onComplete) {
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (reduced || !document.body) { onComplete(); return; }
  const x = Number.isFinite(event?.clientX) && event.clientX > 0 ? event.clientX : window.innerWidth - 42;
  const y = Number.isFinite(event?.clientY) && event.clientY > 0 ? event.clientY : window.innerHeight - 42;
  const radius = 12;
  const distance = Math.max(Math.hypot(x, y), Math.hypot(window.innerWidth - x, y), Math.hypot(x, window.innerHeight - y), Math.hypot(window.innerWidth - x, window.innerHeight - y));
  const reveal = document.createElement('span');
  reveal.className = 'campuspulse-theme-reveal';
  reveal.style.left = `${x - radius}px`;
  reveal.style.top = `${y - radius}px`;
  reveal.style.backgroundColor = theme === 'dark' ? '#17241e' : '#f7f6f1';
  reveal.style.setProperty('--reveal-scale', String(Math.ceil(distance / radius) + 1));
  reveal.addEventListener('animationend', () => { reveal.remove(); onComplete(); }, { once: true });
  document.body.append(reveal);
}
function mountControl() {
  if (document.querySelector('.campuspulse-theme-toggle')) return;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'campuspulse-theme-toggle';
  button.dataset.campuspulseThemeToggle = '';
  button.setAttribute('aria-label', 'Switch to dark mode');
  document.body.append(button);
  updateToggle(button, readTheme());
}

addThemeStyles();
const initialTheme = readTheme();
const pair = routePair(location.pathname);
if (pair && ((initialTheme === 'dark' && location.pathname === pair.light) || (initialTheme === 'light' && location.pathname === pair.dark))) {
  location.replace(initialTheme === 'dark' ? pair.dark : pair.light);
} else {
  document.documentElement.classList.toggle('dark', initialTheme === 'dark');
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountControl, { once: true });
else mountControl();
document.addEventListener('click', (event) => {
  const button = event.target.closest('.campuspulse-theme-toggle');
  if (!button) return;
  event.preventDefault();
  const nextTheme = readTheme() === 'dark' ? 'light' : 'dark';
  const currentPair = routePair(location.pathname);
  if (currentPair) {
    addReveal(event, nextTheme, () => {
      writeTheme(nextTheme);
      location.assign(nextTheme === 'dark' ? currentPair.dark : currentPair.light);
    });
    return;
  }
  addReveal(event, nextTheme, () => {});
  writeTheme(nextTheme);
  document.documentElement.classList.toggle('dark', nextTheme === 'dark');
  document.querySelectorAll('.campuspulse-theme-toggle').forEach(control => updateToggle(control, nextTheme));
});
