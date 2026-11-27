const THEME_KEY = 'campuspulse-theme';
const LEGACY_KEY = 'academiaos-theme';

function storedTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY) || localStorage.getItem(LEGACY_KEY);
    return saved === 'dark' ? 'dark' : 'light';
  } catch { return 'light'; }
}
function syncControls(theme) {
  document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
    button.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
    button.setAttribute('aria-pressed', String(theme === 'dark'));
    button.title = `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`;
    const icon = button.querySelector('[data-theme-icon]');
    const iconText = theme === 'dark' ? '☀' : '☾';
    if (icon && icon.textContent !== iconText) icon.textContent = iconText;
  });
}
function radialReveal(event, theme) {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || !document.body) return;
  const x = Number.isFinite(event?.clientX) && event.clientX > 0 ? event.clientX : window.innerWidth - 42;
  const y = Number.isFinite(event?.clientY) && event.clientY > 0 ? event.clientY : window.innerHeight - 42;
  const radius = 12;
  const reach = Math.max(Math.hypot(x, y), Math.hypot(innerWidth - x, y), Math.hypot(x, innerHeight - y), Math.hypot(innerWidth - x, innerHeight - y));
  const reveal = document.createElement('span');
  reveal.className = 'campuspulse-theme-reveal';
  reveal.style.left = `${x - radius}px`;
  reveal.style.top = `${y - radius}px`;
  reveal.style.backgroundColor = theme === 'dark' ? '#17241e' : '#f7f6f1';
  reveal.style.setProperty('--reveal-scale', String(Math.ceil(reach / radius) + 1));
  document.body.append(reveal);
  reveal.addEventListener('animationend', () => reveal.remove(), { once: true });
}
function ensureControl() {
  const hasPortalToggle = document.querySelector('[data-theme-toggle]:not(.campuspulse-theme-toggle-floating)');
  const floating = document.querySelector('.campuspulse-theme-toggle-floating');
  if (hasPortalToggle) { floating?.remove(); return; }
  if (floating || !document.body) return;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'campuspulse-theme-toggle-floating';
  button.dataset.themeToggle = '';
  button.innerHTML = '<span data-theme-icon aria-hidden="true">☾</span>';
  button.setAttribute('aria-label', 'Switch to dark mode');
  document.body.append(button);
  syncControls(storedTheme());
}

export function initializeTheme() {
  const theme = storedTheme();
  try { localStorage.setItem(THEME_KEY, theme); } catch {}
  document.documentElement.classList.toggle('dark', theme === 'dark');
  window.CampusPulseTheme = { getTheme: storedTheme };
  syncControls(theme);
  ensureControl();
  const observer = new MutationObserver(() => { ensureControl(); syncControls(storedTheme()); });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-theme-toggle]');
    if (!button) return;
    event.preventDefault();
    const next = storedTheme() === 'dark' ? 'light' : 'dark';
    radialReveal(event, next);
    try { localStorage.setItem(THEME_KEY, next); } catch {}
    document.documentElement.classList.toggle('dark', next === 'dark');
    syncControls(next);
    window.dispatchEvent(new CustomEvent('campuspulse:theme-change', { detail: { theme: next } }));
  });
}
