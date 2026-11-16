// Runtime helpers + components. Tag markup is plain strings, expanded before Alpine starts.
// Add a tag to C, use it anywhere. All copy comes from DATA.i18n through t().

const LANG = () => (document.documentElement.lang === 'fr' ? 'fr' : 'en');
const LOCALE = { en: 'en-GB', fr: 'fr-FR' };

function icu(msg, vars = {}) {
  let out = '', i = 0;
  const close = (from) => { let depth = 0; for (let j = from; j < msg.length; j++) { if (msg[j] === '{') depth++; else if (msg[j] === '}') { depth--; if (!depth) return j; } } return msg.length - 1; };
  while (i < msg.length) {
    if (msg[i] !== '{') { out += msg[i++]; continue; }
    const end = close(i);
    const inner = msg.slice(i + 1, end);
    const parts = []; let buf = '', d = 0;
    for (const ch of inner) { if (ch === ',') { if (!d) { parts.push(buf); buf = ''; continue; } } if (ch === '{') d++; if (ch === '}') d--; buf += ch; }
    parts.push(buf);
    if (parts[1] && parts[1].trim() === 'plural') {
      const name = parts[0].trim();
      const body = parts.slice(2).join(',');
      const n = Number(vars[name] ?? 0);
      const exact = new RegExp('(^|\\s)=' + n + '\\s*\\{').exec(body);
      let chosen = '';
      if (exact) {
        const start = exact.index + exact[0].length;
        const stop = closeIn(body, start);
        chosen = body.slice(start, stop);
      } else {
        const cat = new Intl.PluralRules(LOCALE[LANG()]).select(n);
        const re = new RegExp('(^|\\s)' + cat + '\\s*\\{');
        const m = re.exec(body);
        if (m) { const start = m.index + m[0].length; chosen = body.slice(start, closeIn(body, start)); }
        else { const o = /(^|\s)other\s*\{/.exec(body); if (o) { const start = o.index + o[0].length; chosen = body.slice(start, closeIn(body, start)); } }
      }
      out += icu(chosen.trim().replace(/#/g, fmtNum(n, { maximumFractionDigits: 2 })), vars);
    } else if (parts[1] && parts[1].trim() === 'select') {
      const name = parts[0].trim();
      const body = parts.slice(2).join(',');
      const val = String(vars[name] ?? '');
      const re = new RegExp('(^|\\s)' + val.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\{');
      const m = re.exec(body);
      if (m) { const start = m.index + m[0].length; out += icu(body.slice(start, closeIn(body, start)), vars); }
    } else {
      const key = parts[0].trim();
      out += vars[key] ?? '';
    }
    i = end + 1;
  }
  return out;
}
function closeIn(str, from) { let depth = 0; for (let j = from; j < str.length; j++) { if (str[j] === '{') depth++; else if (str[j] === '}') { if (!depth) return j; depth--; } } return str.length; }

const missingKeys = new Set();
function t(key, vars) {
  const lang = LANG();
  const table = (window.DATA && DATA.i18n[lang]) || {};
  let msg = table[key];
  if (msg == null) { msg = (window.DATA && DATA.i18n.en[key]); if (msg != null && lang !== 'en') missingKeys.add(lang + ':' + key); }
  if (msg == null) { missingKeys.add('missing:' + key); return key; }
  return icu(msg, vars);
}
function tHtml(key, vars) {
  return t(key, vars).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}
function tx(obj) { return obj == null ? '' : (typeof obj === 'string' ? obj : (obj[LANG()] ?? obj.en ?? '')); }
function T(key, vars) { return t(key, vars); }

function fmtNum(n, opts = {}) { return new Intl.NumberFormat(LOCALE[LANG()], opts).format(n); }
function fmtMoney(n, currency = 'EUR') { return new Intl.NumberFormat(LOCALE[LANG()], { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(n)); }
function fmtDate(iso, opts = { day: 'numeric', month: 'short', year: 'numeric' }) {
  const d = new Date(iso); if (isNaN(d)) return String(iso);
  return new Intl.DateTimeFormat(LOCALE[LANG()], { timeZone: 'Europe/Paris', ...opts }).format(d);
}
function fmtTime(iso) {
  const d = new Date(iso); if (isNaN(d)) return '';
  return new Intl.DateTimeFormat(LOCALE[LANG()], { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' }).format(d);
}
function dayKey(iso) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));
}
function fmtWhen(iso) {
  const k = dayKey(iso), nowK = dayKey(DATA.now);
  const yesterday = new Date(new Date(DATA.now).getTime() - 864e5);
  if (k === nowK) return t('common.todayAt', { time: fmtTime(iso) });
  if (k === dayKey(yesterday.toISOString())) return t('common.yesterdayAt', { time: fmtTime(iso) });
  return t('common.at', { date: fmtDate(iso, { day: 'numeric', month: 'short' }), time: fmtTime(iso) });
}
function relTime(iso) {
  const diff = Math.max(0, new Date(DATA.now) - new Date(iso));
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t('common.justNow');
  if (mins < 60) return t('common.minutesAgo', { n: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t('common.hoursAgo', { n: hours });
  return t('common.daysAgo', { n: Math.floor(hours / 24) });
}
function parseNum(v) { return Number(String(v).replace(/[^\d.,-]/g, '').replace(/\s/g, '').replace(',', '.')); }
// Field type → user-facing label (generic, used by catalogue + builder inspector)
function typeLabel(type) {
  const k = { select: 'text', textarea: 'text', json: 'object', datetime: 'date', file: 'file', url: 'url', number: 'number', bool: 'bool' }[type] || 'text';
  return t('builder.type.' + k);
}
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ---- Icons: one hand-drawn 24px set, stroke-only. No brand logos. -----------
const ICONS = {
  mail: '<rect x="3.2" y="6" width="17.6" height="12" rx="1.6"/><path d="m4 7.2 8 5.8 8-5.8"/>',
  folder: '<path d="M3.4 8.2a2 2 0 0 1 2-2h3.5l2 2h7.7a2 2 0 0 1 2 2v7.4a2 2 0 0 1-2 2H5.4a2 2 0 0 1-2-2z"/>',
  chat: '<path d="M4.2 6.5a2 2 0 0 1 2-2h11.6a2 2 0 0 1 2 2v6.8a2 2 0 0 1-2 2H9.5L5 19v-3.7h-.8a2 2 0 0 1 0-4z"/><path d="M8 9.5h8"/>',
  page: '<path d="M6.2 3.6h7.6l4 4v12.8H6.2z"/><path d="M13.8 3.6v4h4M9 12h6M9 15.5h6"/>',
  calendar: '<rect x="3.8" y="5.8" width="16.4" height="14" rx="2"/><path d="M8 3.5v4M16 3.5v4M3.8 10.5h16.4M8 14h2M14 14h2"/>',
  branch: '<circle cx="6.5" cy="5" r="1.6"/><circle cx="17.5" cy="9" r="1.6"/><circle cx="6.5" cy="19" r="1.6"/><path d="M6.5 6.6v10.8M8 9h4.5a5 5 0 0 1 5 5v-3.4"/>',
  hash: '<path d="M9.2 3.8 7.3 20.2M16.7 3.8l-1.9 16.4M3.8 9h16.4M3 15h16.4"/>',
  github: '<circle cx="6.4" cy="6" r="2"/><circle cx="6.4" cy="18" r="2"/><circle cx="17.4" cy="10" r="2"/><path d="M6.4 8v8M8.4 6h4.4a2.6 2.6 0 0 1 2.6 2.6v1.4M8.4 18H13a2.6 2.6 0 0 0 2.6-2.6V12"/>',
  layers: '<path d="M12 3.6 20 8l-8 4.4L4 8zM4 12l8 4.4 8-4.4M4 16l8 4.4 8-4.4"/>',
  card: '<rect x="3.2" y="6" width="17.6" height="12" rx="2"/><path d="M3.2 10h17.6M7 14.6h4"/>',
  code: '<path d="m8.5 7.5-4.6 4.5 4.6 4.5M15.5 7.5l4.6 4.5-4.6 4.5"/>',
  bolt: '<path d="M13.4 3.2 5.8 13.4h5.3L10 20.8l8-11h-5.4z"/>',
  phone: '<rect x="6.5" y="3" width="11" height="18" rx="2.4"/><path d="M10 18.2h4"/>',
  check: '<path d="m4.6 12.4 4.9 4.9L19.4 7.4"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  alert: '<path d="M12 4.2 3 19.6h18z"/><path d="M12 9.2v5M12 17.1h.01"/>',
  info: '<circle cx="12" cy="12" r="8.6"/><path d="M12 11v5M12 7.8h.01"/>',
  clock: '<circle cx="12" cy="12" r="8.6"/><path d="M12 7.4V12l3.2 2"/>',
  'chevron-down': '<path d="m6.5 9.5 5.5 5.5 5.5-5.5"/>',
  'chevron-right': '<path d="m9.5 6.5 5.5 5.5-5.5 5.5"/>',
  'chevron-left': '<path d="M14.5 6.5 9 12l5.5 5.5"/>',
  'chevron-up': '<path d="m6.5 14.5 5.5-5.5 5.5 5.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  search: '<circle cx="10.6" cy="10.6" r="6.4"/><path d="m15.3 15.3 4.5 4.5"/>',
  filter: '<path d="M4 6.5h16M6.5 12h11M9.5 17.5h5"/>',
  play: '<path d="M8.2 5.4v13.2l10-6.6z" fill="currentColor" stroke="none"/>',
  pause: '<path d="M8.8 5.5v13M15.2 5.5v13" stroke-width="2.6"/>',
  undo: '<path d="M5 9.5A7 7 0 1 1 6.5 16M5 4.5v5h5"/>',
  redo: '<path d="M19 9.5A7 7 0 1 0 17.5 16M19 4.5v5h-5"/>',
  'zoom-in': '<circle cx="10.6" cy="10.6" r="6.4"/><path d="m15.3 15.3 4.5 4.5M10.6 7.8v5.6M7.8 10.6h5.6"/>',
  'zoom-out': '<circle cx="10.6" cy="10.6" r="6.4"/><path d="m15.3 15.3 4.5 4.5M7.8 10.6h5.6"/>',
  fit: '<path d="M4.5 9V4.5H9M15 4.5h4.5V9M19.5 15v4.5H15M9 19.5H4.5V15"/>',
  keyboard: '<rect x="2.8" y="6.2" width="18.4" height="11.6" rx="2"/><path d="M6.5 9.6h.01M10 9.6h.01M13.5 9.6h.01M17 9.6h.01M8 13.4h8"/>',
  sun: '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6"/>',
  moon: '<path d="M20 14.2A8.2 8.2 0 0 1 9.8 4a8.4 8.4 0 1 0 10.2 10.2z"/>',
  user: '<circle cx="12" cy="8.2" r="3.7"/><path d="M4.8 20c.7-3.6 3.7-5.6 7.2-5.6s6.5 2 7.2 5.6"/>',
  logout: '<path d="M10 4.5H5.8a1.8 1.8 0 0 0-1.8 1.8v11.4a1.8 1.8 0 0 0 1.8 1.8H10M15 8l4 4-4 4M19 12H9"/>',
  trash: '<path d="M4.8 7h14.4M9.5 7V4.8h5V7M6.6 7l.9 12.4h9l.9-12.4M10 10.6v5.4M14 10.6v5.4"/>',
  copy: '<rect x="8" y="8" width="11.6" height="11.6" rx="2"/><path d="M16 8V6.2A2.2 2.2 0 0 0 13.8 4H6.2A2.2 2.2 0 0 0 4 6.2v7.6A2.2 2.2 0 0 0 6.2 16H8"/>',
  link: '<path d="M10 13.8a4 4 0 0 0 5.7 0l2.6-2.6a4 4 0 0 0-5.7-5.7l-1.4 1.4M14 10.2a4 4 0 0 0-5.7 0l-2.6 2.6a4 4 0 0 0 5.7 5.7l1.4-1.4"/>',
  eye: '<path d="M2.8 12S6 6.4 12 6.4 21.2 12 21.2 12 18 17.6 12 17.6 2.8 12 2.8 12z"/><circle cx="12" cy="12" r="2.8"/>',
  refresh: '<path d="M19.4 12a7.4 7.4 0 1 1-2.2-5.2M19.4 4.6v4.8h-4.8"/>',
  'wifi-off': '<path d="M3 3l18 18M8.5 15.5a5 5 0 0 1 6 0M5 12a10 10 0 0 1 4-2.3M15 9.7a10 10 0 0 1 4 2.3M2 8.5a14 14 0 0 1 3.4-2M18.6 6.5A14 14 0 0 1 22 8.5M12 18.6h.01"/>',
  external: '<path d="M14 4.5h5.5V10M19 5 11 13M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5H5.5A1.5 1.5 0 0 1 4 18.5V7.5A1.5 1.5 0 0 1 5.5 6H10"/>',
  sliders: '<path d="M4 7h9M17 7h3M4 17h5M13 17h7M13 4.5V9.5M9 14.5v5"/>',
  shield: '<path d="M12 3.5 4.8 6v6c0 4.4 3.1 7.4 7.2 8.5 4.1-1.1 7.2-4.1 7.2-8.5V6z"/><path d="m8.8 12 2.2 2.2 4.2-4.4"/>',
  book: '<path d="M4.5 5.2A2 2 0 0 1 6.5 3.5H19v17H6.5a2 2 0 0 0-2 1.7z"/><path d="M4.5 18.4h14.5"/>',
  grid: '<rect x="3.8" y="3.8" width="7" height="7" rx="1.6"/><rect x="13.2" y="3.8" width="7" height="7" rx="1.6"/><rect x="3.8" y="13.2" width="7" height="7" rx="1.6"/><rect x="13.2" y="13.2" width="7" height="7" rx="1.6"/>',
  list: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
  map: '<path d="m3.5 6.5 5-2 7 2 5-2v13l-5 2-7-2-5 2zM8.5 4.5v13M15.5 6.5v13"/>',
  more: '<circle cx="5.5" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="18.5" cy="12" r="1.2" fill="currentColor" stroke="none"/>',
  'arrow-right': '<path d="M4.5 12h15M13.5 6l6 6-6 6"/>',
  download: '<path d="M12 4v10.5M7.5 10l4.5 4.5 4.5-4.5M4.5 19.5h15"/>',
  bell: '<path d="M18 9.5a6 6 0 0 0-12 0c0 6-2.5 7-2.5 7h17S18 15.5 18 9.5z"/><path d="M10 20h4"/>',
  globe: '<circle cx="12" cy="12" r="8.6"/><path d="M3.5 12h17M12 3.4c2.4 2.4 3.6 5.4 3.6 8.6s-1.2 6.2-3.6 8.6c-2.4-2.4-3.6-5.4-3.6-8.6S9.6 5.8 12 3.4z"/>',
  palette: '<path d="M12 3.5a8.5 8.5 0 0 0 0 17c1.4 0 2-.8 2-1.8 0-.9-.6-1.4-.6-2.2 0-1 .8-1.8 1.8-1.8h1.6a3.7 3.7 0 0 0 3.7-3.7c0-4.1-3.8-7.5-8.5-7.5z"/><circle cx="8" cy="9" r="1.1" fill="currentColor" stroke="none"/><circle cx="12" cy="7" r="1.1" fill="currentColor" stroke="none"/><circle cx="16" cy="9.5" r="1.1" fill="currentColor" stroke="none"/>',
  grip: '<circle cx="9" cy="6" r="1.2" fill="currentColor" stroke="none"/><circle cx="15" cy="6" r="1.2" fill="currentColor" stroke="none"/><circle cx="9" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="9" cy="18" r="1.2" fill="currentColor" stroke="none"/><circle cx="15" cy="18" r="1.2" fill="currentColor" stroke="none"/>',
  dot: '<circle cx="12" cy="12" r="3.4" fill="currentColor" stroke="none"/>',
  activity: '<path d="M3 12h4l2.5-7 4 14L16.5 12H21"/>',
  'arrow-left': '<path d="M19.5 12h-15M10.5 6l-6 6 6 6"/>',
  star: '<path d="m12 3.8 2.5 5.2 5.7.8-4.1 4 1 5.7-5.1-2.7-5.1 2.7 1-5.7-4.1-4 5.7-.8z"/>',
  split: '<path d="M5 4v5.5a4 4 0 0 0 4 4h10M15 9.5l4 4-4 4M5 20v-4.5a4 4 0 0 1 4-4"/>'
};

function ICON(name, cls = '', size = 16, sw = 1.65) {
  const inner = ICONS[name] || ICONS.dot;
  return `<svg aria-hidden="true" focusable="false" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" class="${cls}">${inner}</svg>`;
}
const SERVICE_ICON = { gmail: 'mail', drive: 'folder', slack: 'hash', notion: 'page', calendar: 'calendar', github: 'github', linear: 'layers', stripe: 'card', webhook: 'code', discord: 'chat', flow: 'branch' };
const svc = (id) => (window.DATA?.services || []).find(s => s.id === id) || { id, name: id, color: '#77767b', state: 'none' };
const svcColor = (id) => (id === 'flow' ? 'var(--mute)' : svc(id).color);
const svcIcon = (id) => SERVICE_ICON[id] || 'bolt';
function SVC(id, size = 32, cls = '') {
  const s = svc(id);
  return `<span class="svc ${cls}" aria-hidden="true" style="--svc:${s.color};width:${size}px;height:${size}px">${ICON(svcIcon(id), '', Math.round(size * 0.53))}</span>`;
}
function initials(name) { return String(name || '').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase(); }
function serviceName(id) { return id === 'flow' ? t('builder.kindCondition') : svc(id).name; }

// ---- Global UI plumbing ----------------------------------------------------
function setTheme(v) {
  localStorage.setItem('area.theme', v);
  document.documentElement.dataset.theme = v === 'system' ? (matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light') : v;
  document.documentElement.style.colorScheme = document.documentElement.dataset.theme;
  document.dispatchEvent(new CustomEvent('area:theme', { detail: v }));
}
function setDensity(v) { localStorage.setItem('area.density', v); document.documentElement.dataset.density = v; }
function setMotion(v) {
  localStorage.setItem('area.motion', v ? 'reduced' : 'normal');
  document.documentElement.dataset.motion = v ? 'reduced' : 'normal';
}
function setLang(l) { localStorage.setItem('area.lang', l); location.reload(); }
function announce(msg, assertive) {
  const el = document.getElementById(assertive ? 'alert-live' : 'polite-live');
  if (!el) return; el.textContent = ''; setTimeout(() => { el.textContent = msg; }, 30);
}
function toast(message, opts = {}) {
  const host = document.getElementById('toasts');
  if (!host) return;
  const el = document.createElement('div'); el.className = 'toast';
  const span = document.createElement('span'); span.textContent = message; el.appendChild(span);
  let timer;
  const remove = () => { clearTimeout(timer); el.remove(); };
  if (opts.action) {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = opts.action;
    b.addEventListener('click', () => { if (opts.onAction) opts.onAction(); remove(); });
    el.appendChild(b);
  }
  const close = document.createElement('button');
  close.type = 'button'; close.className = 'btn-icon btn-ghost btn-sm'; close.setAttribute('aria-label', t('common.dismiss'));
  close.innerHTML = ICON('x', '', 14); close.style.color = 'inherit';
  close.addEventListener('click', remove); el.appendChild(close);
  host.appendChild(el);
  announce(message);
  timer = setTimeout(remove, opts.timeout || 6500);
  el.addEventListener('mouseenter', () => clearTimeout(timer));
  el.addEventListener('mouseleave', () => { timer = setTimeout(remove, 2500); });
}
function openDialog(id) { const d = document.getElementById(id); if (d && d.showModal) { d.showModal(); announce(d.getAttribute('data-announce') || '', true); } }
function closeDialog(id) { const d = document.getElementById(id); if (d && d.open) d.close(); }
function sparkSvg(values, w = 84, h = 22, tone = 'ok') {
  const max = Math.max(...values, 1); const bw = w / values.length;
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true" class="block">${values.map((v, i) => {
    const bh = Math.max(2, Math.round((v / max) * (h - 2)));
    return `<rect x="${(i * bw).toFixed(1)}" y="${h - bh}" width="${Math.max(1, bw - 1.5).toFixed(1)}" height="${bh}" rx="1" fill="currentColor" opacity="${i === values.length - 1 ? 0.95 : 0.28}"/>`;
  }).join('')}</svg>`;
}
function dayChart(values, labels) {
  const max = Math.max(...values, 1);
  return `<div class="flex items-end gap-[3px] h-20" aria-hidden="true">${values.map((v, i) =>
    `<div class="flex-1 rounded-t-[3px]" style="height:${Math.max(6, (v / max) * 100)}%;background:var(--accent);opacity:${i === values.length - 1 ? 0.95 : 0.22}" title="${labels ? labels[i] : ''}: ${v}"></div>`).join('')}</div>`;
}
function statusTone(st) { return st === 'ok' ? 'ok' : st === 'failed' || st === 'fail' ? 'bad' : st === 'running' ? 'accent' : 'neutral'; }
function statusIcon(st) { return st === 'ok' ? 'check' : (st === 'failed' || st === 'fail') ? 'x' : st === 'running' ? 'refresh' : 'dot'; }
function parseRefs(value) {
  const out = []; let last = 0; const re = /\{\{\s*([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\s*\}\}/g; let m;
  const str = String(value ?? '');
  while ((m = re.exec(str))) {
    if (m.index > last) out.push({ kind: 'text', text: str.slice(last, m.index) });
    out.push({ kind: 'ref', id: m[1], key: m[2], raw: m[0] }); last = m.index + m[0].length;
  }
  if (last < str.length) out.push({ kind: 'text', text: str.slice(last) });
  return out;
}
const X = (p, k) => p[':' + k] ?? JSON.stringify(p[k] ?? '');

// ---- Shell pieces ----------------------------------------------------------
const NAV_PRIMARY = [
  ['index.html', 'workflows', 'grid', 'nav.workflows'],
  ['runs.html', 'runs', 'activity', 'nav.runs'],
  ['services.html', 'services', 'bolt', 'nav.services']
];
const NAV_SECOND = [
  ['mobile.html', 'mobile', 'phone', 'nav.mobile'],
  ['settings.html', 'settings', 'sliders', 'nav.settings']
];
function navLink(href, key, icon, labelKey, active, extra = '') {
  const on = active === key;
  return `<a href="${href}" ${on ? 'aria-current="page"' : ''} class="flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-[13.5px] ${on ? 'bg-fill font-semibold text-ink' : 'text-mute hover:bg-fill hover:text-ink'} ${extra}">${ICON(icon, 'shrink-0', 17)}<span x-show="!sideCollapsed" class="truncate">${t(labelKey)}</span>${on ? `<span x-show="!sideCollapsed" class="ml-auto w-1.5 h-1.5 rounded-full bg-accent" aria-hidden="true"></span>` : ''}</a>`;
}
function connectedMini() {
  const list = DATA.services.filter(s => s.state !== 'none').slice(0, 5);
  return `<div class="mt-5">
    <div class="flex items-center justify-between px-2 mb-1.5">
      <span class="text-[10.5px] font-semibold tracking-[.09em] uppercase text-faint">${t('nav.connected')}</span>
      <a href="services.html" class="text-[11px] text-mute hover:text-ink underline-offset-2 hover:underline">${t('nav.manage')}</a>
    </div>
    <div class="space-y-0.5">${list.map(s => `<a href="services.html?s=${s.id}" class="flex items-center gap-2 px-2 py-[5px] rounded-lg hover:bg-fill">
      ${SVC(s.id, 21)}
      <span class="text-[12.5px] truncate ${s.state === 'connected' ? 'text-mute' : 'text-ink'}">${esc(s.name)}</span>
      ${s.state === 'expired' ? `<span class="ml-auto text-warn" title="${t('common.expired')}">${ICON('alert', '', 13)}<span class="sr-only">${t('common.expired')}</span></span>` : ''}
    </a>`).join('')}</div></div>`;
}
function accountBox(active) {
  return `<div class="mt-auto pt-3 relative">
    <button type="button" @click="acct=!acct" :aria-expanded="acct" aria-haspopup="dialog" class="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-fill text-left">
      <span class="w-8 h-8 rounded-full grid place-items-center text-[12px] font-semibold shrink-0" style="background:var(--accent-soft);color:var(--accent)">${DATA.account.initials}</span>
      <span x-show="!sideCollapsed" class="min-w-0 flex-1"><span class="block text-[12.5px] font-semibold truncate">${esc(DATA.account.name)}</span><span class="block text-[11px] text-mute truncate">${esc(DATA.account.email)}</span></span>
      <span x-show="!sideCollapsed">${ICON('chevron-up', 'text-mute', 14)}</span>
    </button>
    <div x-show="acct" x-cloak x-transition.opacity.duration.120ms @click.outside="acct=false" @keydown.escape.window="acct=false" role="dialog" aria-label="${t('nav.menu')}" class="absolute bottom-full left-0 mb-1.5 w-[244px] card p-2 shadow-pop z-50 rise">
      <div class="px-2 pt-1 pb-2 text-[10.5px] font-semibold tracking-[.08em] uppercase text-faint">${t('common.theme')}</div>
      <div class="seg w-full mb-2">${[['light', 'common.light'], ['dark', 'common.dark'], ['system', 'common.system']].map(([v, k]) => `<button type="button" class="flex-1 justify-center" aria-pressed="${(localStorage.getItem('area.theme') || 'system') === v}" onclick="setTheme('${v}');this.parentNode.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===this)))">${t(k)}</button>`).join('')}</div>
      <div class="px-2 pb-1.5 text-[10.5px] font-semibold tracking-[.08em] uppercase text-faint">${t('common.language')}</div>
      <div class="seg w-full mb-2"><button type="button" class="flex-1 justify-center" aria-pressed="${LANG() === 'en'}" onclick="setLang('en')" lang="en">English</button><button type="button" class="flex-1 justify-center" aria-pressed="${LANG() === 'fr'}" onclick="setLang('fr')" lang="fr">Français</button></div>
      <div class="border-t border-line mt-1 pt-1">
        <a href="states.html" class="flex items-center gap-2 px-2 py-2 rounded-lg text-[12.5px] text-mute hover:bg-fill hover:text-ink">${ICON('grid', '', 15)} ${t('nav.states')}</a>
        <a href="onboarding.html" class="flex items-center gap-2 px-2 py-2 rounded-lg text-[12.5px] text-mute hover:bg-fill hover:text-ink">${ICON('star', '', 15)} ${t('settings.screens')}</a>
        <a href="signin.html" class="flex items-center gap-2 px-2 py-2 rounded-lg text-[12.5px] text-mute hover:bg-fill hover:text-ink">${ICON('logout', '', 15)} ${t('nav.signout')}</a>
      </div>
      <p class="px-2 pt-2 pb-1 text-[10.5px] text-faint flex items-center gap-1.5">${ICON('shield', '', 12)} ${t('app.server')}</p>
    </div>
  </div>`;
}
function mobileHeader() {
  return `<div class="lg:hidden h-14 shrink-0 flex items-center gap-2 px-4 border-b border-line bg-card">
    <button type="button" @click="navOpen=true" class="btn btn-ghost btn-icon" aria-label="${t('nav.openMenu')}">${ICON('list', '', 19)}</button>
    <a href="index.html" class="flex items-center gap-2 ml-1"><span class="text-[17px] font-semibold tracking-tight">area<span class="text-accent">.</span></span></a>
    <a href="settings.html" class="ml-auto" aria-label="${t('nav.settings')}"><span class="w-8 h-8 rounded-full grid place-items-center text-[12px] font-semibold" style="background:var(--accent-soft);color:var(--accent)">${DATA.account.initials}</span></a>
  </div>`;
}
function drawer(active) {
  return `<div x-show="navOpen" x-cloak class="lg:hidden fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label="${t('nav.openMenu')}">
    <div class="absolute inset-0" style="background:rgba(18,16,22,.42)" @click="navOpen=false"></div>
    <div class="absolute left-0 top-0 bottom-0 w-[280px] flex flex-col p-3 fade-in" style="background:var(--side);border-right:1px solid var(--line)">
      <div class="flex items-center justify-between px-1 pb-4">
        <a href="index.html" class="flex items-center gap-2 py-1">${BRAND_MARK(24)}<span class="text-[18px] font-semibold tracking-tight">area<span class="text-accent">.</span></span></a>
        <button type="button" @click="navOpen=false" class="btn btn-ghost btn-icon" aria-label="${t('nav.closeMenu')}">${ICON('x', '', 18)}</button>
      </div>
      ${NAV_PRIMARY.map(n => navLink(n[0], n[1], n[2], n[3], active)).join('')}
      <div class="mt-4 mb-1 px-2.5 text-[10.5px] font-semibold tracking-[.09em] uppercase text-faint">${t('nav.account')}</div>
      ${NAV_SECOND.map(n => navLink(n[0], n[1], n[2], n[3], active)).join('')}
      <a href="states.html" class="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13.5px] ${active === 'states' ? 'bg-fill font-semibold' : 'text-mute hover:bg-fill'}">${ICON('grid', '', 17)} ${t('nav.states')}</a>
      <div class="mt-auto border-t border-line pt-2">
        <div class="flex items-center gap-2 px-2 py-2"><span class="w-8 h-8 rounded-full grid place-items-center text-[12px] font-semibold" style="background:var(--accent-soft);color:var(--accent)">${DATA.account.initials}</span><span class="text-[12px] truncate">${esc(DATA.account.email)}</span></div>
        <button type="button" class="w-full text-left px-2 py-2 rounded-lg text-[12.5px] text-mute hover:bg-fill" onclick="setTheme(document.documentElement.dataset.theme==='dark'?'light':'dark')">${ICON('sun', '', 15)} <span class="ml-1">${t('common.theme')}</span></button>
        <div class="flex gap-1 px-2 py-1"><button class="btn btn-sm flex-1" aria-pressed="${LANG() === 'en'}" onclick="setLang('en')">English</button><button class="btn btn-sm flex-1" aria-pressed="${LANG() === 'fr'}" onclick="setLang('fr')" lang="fr">Français</button></div>
        <a href="signin.html" class="flex items-center gap-2 px-2 py-2 rounded-lg text-[12.5px] text-mute hover:bg-fill">${ICON('logout', '', 15)} ${t('nav.signout')}</a>
      </div>
    </div></div>`;
}
function BRAND_MARK(size = 26) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 26 26" aria-hidden="true" class="shrink-0"><path d="M7 19.5C7 13 12.5 7 19.5 7" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round"/><circle cx="7" cy="19.5" r="3.1" fill="var(--accent)"/><circle cx="19.5" cy="7" r="2.6" fill="var(--card)" stroke="var(--accent)" stroke-width="2"/></svg>`;
}

// ---- Cross-screen helpers --------------------------------------------------
function runsFor(wfId) { return DATA.runs.filter(r => r.wf === wfId).sort((a, b) => new Date(b.at) - new Date(a.at)); }
function lastRun(wfId) { return runsFor(wfId)[0] || null; }
function wfNodeName(n) { return n.name ? tx(n.name) : tx((svc(n.svc).triggers || []).concat(svc(n.svc).actions || []).find(c => c.id === n.comp)?.name || { en: '—', fr: '—' }); }
function wfNodes(w) { return w.nodes || []; }
function wfServices(w) { return [...new Set(wfNodes(w).map(n => n.svc))]; }
function wfTriggerNode(w) { return wfNodes(w).find(n => n.id === 'trigger') || wfNodes(w)[0]; }
function wfCondition(w) { return wfNodes(w).find(n => n.comp === 'condition'); }
function usedIn(id) { return DATA.workflows.filter(w => wfNodes(w).some(n => n.svc === id)).length; }
function expiredSvc(w) { return wfServices(w).find(id => svc(id).state === 'expired') || null; }
function wfStatus(w) {
  if (w.state === 'draft') return 'draft';
  const exp = expiredSvc(w);
  if (exp) return 'attention';
  const lr = lastRun(w.id);
  if (lr && lr.status === 'failed' && w.on) return 'attention';
  return w.on ? 'on' : 'off';
}
function wfStatusLabel(w) {
  const st = wfStatus(w);
  if (st === 'draft') return t('common.draft');
  if (st === 'off') return t('common.paused');
  if (st === 'attention') { const e = expiredSvc(w); return e ? t('dash.statusAttention', { step: svc(e).name }) : t('common.needsAttention'); }
  return t('common.active');
}
function statusPill(w) { const s = wfStatus(w); return s === 'attention' ? 'warn' : s === 'draft' ? 'neutral' : s === 'off' ? 'neutral' : 'ok'; }
function sparkFor(w) {
  const rs = runsFor(w.id).slice(0, 7).reverse();
  const base = rs.map(r => r.status === 'ok' ? 5 : 1);
  while (base.length < 7) base.unshift(3);
  return base;
}
function runStepName(run) { return run.path[run.path.length - 1]?.id || 'trigger'; }
function runWorkflow(run) { return DATA.workflows.find(w => w.id === run.wf); }
function fmtDuration(ms) { return ((ms || 0) / 1000).toFixed(1) + ' s'; }
function dateLong(d = DATA.now) { return new Intl.DateTimeFormat(LOCALE[LANG()], { timeZone: 'Europe/Paris', weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(d)); }

// ---- Components ------------------------------------------------------------
const C = {
  'ui-shell': (p, s) => `<div x-data="{navOpen:false, acct:false, sideCollapsed: localStorage.getItem('area.sideCollapsed')==='1'}" class="h-screen">
    <a href="#main" class="skip">${t('nav.skip')}</a>
    <div class="h-full flex">
      <aside :class="sideCollapsed ? 'w-16' : 'w-[248px]'" class="hidden lg:flex shrink-0 flex-col p-3 gap-0.5 transition-[width] duration-200 ease-out overflow-hidden" style="background:var(--side);border-right:1px solid var(--line)">
        <div class="px-1 pb-3 pt-2 flex items-center justify-between gap-1">
          <a href="index.html" class="inline-flex items-center gap-2.5 rounded-lg min-w-0" :aria-label="sideCollapsed?'area':'area'">
            ${BRAND_MARK(25)}
            <span x-show="!sideCollapsed" class="text-[19px] font-semibold tracking-tight leading-none truncate">area<span class="text-accent">.</span></span>
          </a>
          <button type="button" @click="sideCollapsed=!sideCollapsed; localStorage.setItem('area.sideCollapsed', sideCollapsed?'1':'0')" class="btn btn-ghost btn-icon btn-sm shrink-0" :aria-expanded="!sideCollapsed" :aria-label="sideCollapsed?'Expand sidebar':'Collapse sidebar'" :title="sideCollapsed?'Expand sidebar':'Collapse sidebar'" x-html="ICON(sideCollapsed?'chevron-right':'chevron-left','',15)"></button>
        </div>
        <div x-show="!sideCollapsed" class="px-2.5 pb-1 text-[10.5px] font-semibold tracking-[.09em] uppercase text-faint">${t('nav.work')}</div>
        ${NAV_PRIMARY.map(n => navLink(n[0], n[1], n[2], n[3], p.active)).join('')}
        <div x-show="!sideCollapsed" class="mt-4 px-2.5 pb-1 text-[10.5px] font-semibold tracking-[.09em] uppercase text-faint">${t('nav.account')}</div>
        ${NAV_SECOND.map(n => navLink(n[0], n[1], n[2], n[3], p.active)).join('')}
        <div x-show="!sideCollapsed">${connectedMini()}</div>
        ${accountBox(p.active)}
      </aside>
      ${drawer(p.active)}
      <main id="main" tabindex="-1" class="flex-1 min-w-0 h-screen flex flex-col overflow-hidden">
        ${mobileHeader()}
        <div class="flex-1 min-h-0 overflow-hidden">${s}</div>
      </main>
    </div>
    <div id="polite-live" class="sr-only" aria-live="polite" aria-atomic="true"></div>
    <div id="alert-live" class="sr-only" aria-live="assertive" aria-atomic="true"></div>
    <div id="toasts" role="region" aria-label="${t('common.help')}"></div>
  </div>`,

  'ui-bar': (p, s) => `<header class="h-[56px] shrink-0 flex items-center gap-3 px-4 sm:px-6 border-b border-line bg-card">
    <div class="min-w-0 flex-1">
      ${p.heading || p['heading-key'] ? `<h1 class="text-[16px] font-semibold truncate">${p['heading-key'] ? t(p['heading-key']) : p.heading}</h1>` : ''}
      ${p.sub || p['sub-key'] ? `<p class="text-[12px] text-mute truncate">${p['sub-key'] ? t(p['sub-key']) : p.sub}</p>` : ''}
    </div>
    <div class="flex items-center gap-2 shrink-0">${s}</div>
  </header>`,

  'ui-logo': p => `<a href="${p.href || 'index.html'}" class="inline-flex items-center gap-2.5">${BRAND_MARK(Number(p.size || 26))}<span class="font-semibold tracking-tight" style="font-size:${p.size ? Number(p.size) * 0.72 : 20}px">area<span class="text-accent">.</span></span></a>`,

  'ui-icon': p => ICON(p.name, p.class || '', Number(p.size || 16)),

  'ui-btn': (p, s, a) => {
    const variant = p.variant === 'accent' ? 'btn-accent' : p.variant === 'danger' ? 'btn-danger' : p.variant === 'quiet' ? 'btn-quiet' : p.variant === 'ghost' ? 'btn-ghost' : '';
    const size = p.size === 'sm' ? 'btn-sm' : '';
    const cls = `btn ${variant} ${size} ${p.square ? 'btn-icon' : ''} ${p.class || ''}`;
    const attrs = a.replace(/\sclass="[^"]*"/, '');
    if (p.href) return `<a href="${p.href}" ${attrs} class="${cls}">${s}</a>`;
    return `<button type="${p.type || 'button'}" ${attrs} class="${cls}">${s}</button>`;
  },

  'ui-svc': p => {
    const idE = p[':id'] || JSON.stringify(p.id || 'gmail');
    const size = Number(p.size || 32);
    return `<span class="svc ${p.class || ''}" aria-hidden="true" style="width:${size}px;height:${size}px" :style="'--svc:'+svcColor(${idE})" x-html="ICON(svcIcon(${idE}),'',${Math.round(size * 0.53)})"></span>`;
  },

  'ui-switch': (p, s, a) => {
    const bind = p[':bind'] || JSON.stringify(p.bind || false);
    const label = p[':label'] ? `:aria-label="${esc(p[':label'])}"` : `aria-label="${esc(p.label || t('common.on'))}"`;
    const hostClick = p['@click'] || p['@click.stop'];
    const attrs = a.replace(/\sclass="[^"]*"/, '').replace(/\s:bind="[^"]*"/, '').replace(/\s:label="[^"]*"/, '');
    return `<button type="button" role="switch" class="sw ${p.class || ''}" ${p.size === 'sm' ? 'data-size="sm"' : ''} :aria-checked="${bind}" ${label} ${hostClick ? '' : `@click.stop="${bind}=!${bind}"`} ${attrs}></button>`;
  },

  'ui-badge': (p, s) => {
    const tone = p[':tone'] ? `:class="'pill-' + (${p[':tone']})"` : '';
    return `<span class="pill ${p.tone ? 'pill-' + p.tone : ''} ${p.class || ''}" ${tone}>${p.icon ? ICON(p.icon, '', Number(p.iconsize || 12)) : ''}<span>${s}</span></span>`;
  },

  'ui-banner': (p, s) => {
    const map = { warn: ['warn', 'alert'], bad: ['bad', 'alert'], ok: ['ok', 'check'], accent: ['accent', 'info'], neutral: ['neutral', 'info'] };
    const [tone, icon] = map[p.tone] || map.neutral;
    const bg = tone === 'neutral' ? 'var(--fill)' : `var(--${tone}-soft)`;
    const title = p[':title'] ? `<div class="text-[13px] font-semibold" x-text="${p[':title']}"></div>` : p.title ? `<div class="text-[13px] font-semibold">${p.title}</div>` : '';
    const body = p[':body'] ? `<div class="text-[12.5px] text-mute mt-0.5" x-text="${p[':body']}"></div>` : p.body ? `<div class="text-[12.5px] text-mute mt-0.5">${p.body}</div>` : '';
    return `<div class="rounded-xl p-3.5 flex items-start gap-3 ${p.class || ''}" style="background:${bg}" role="${p.alert ? 'alert' : 'status'}">
      <span class="mt-0.5 shrink-0 tone-${tone}">${ICON(p.icon || icon, '', 17)}</span>
      <div class="min-w-0 flex-1">${title}${body}${s}</div>
    </div>`;
  },

  'ui-empty': (p, s) => `<div class="text-center ${p.compact ? 'py-8 px-4' : 'py-14 px-6'}">
    <span class="w-12 h-12 rounded-2xl inline-grid place-items-center mb-3" style="background:var(--fill);color:var(--mute)">${ICON(p.icon || 'layers', '', 22)}</span>
    <h3 class="text-[15px] font-semibold" ${p[':title'] ? `x-text="${p[':title']}"` : ''}>${p['title-key'] ? t(p['title-key']) : (p.title || '')}</h3>
    <p class="text-[13px] text-mute mt-1 max-w-[42ch] mx-auto leading-relaxed" ${p[':body'] ? `x-text="${p[':body']}"` : ''}>${p['body-key'] ? t(p['body-key']) : (p.body || '')}</p>
    ${s ? `<div class="mt-4 flex items-center justify-center gap-2 flex-wrap">${s}</div>` : ''}
  </div>`,

  'ui-kbd': (p, s) => `<kbd class="kbd">${s}</kbd>`,

  'ui-lang': p => `<div class="seg" role="group" aria-label="${t('common.language')}"><button type="button" aria-pressed="${LANG() === 'en'}" onclick="setLang('en')" lang="en">English</button><button type="button" aria-pressed="${LANG() === 'fr'}" onclick="setLang('fr')" lang="fr">Français</button></div>`,

  'ui-theme-seg': p => `<div class="seg" role="group" aria-label="${t('common.theme')}">${[['light', 'common.light', 'sun'], ['dark', 'common.dark', 'moon'], ['system', 'common.system', 'sliders']].map(([v, k, i]) => `<button type="button" aria-pressed="${(localStorage.getItem('area.theme') || 'system') === v}" onclick="setTheme('${v}');this.parentNode.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===this)))" class="gap-1.5">${ICON(i, '', 13)}${t(k)}</button>`).join('')}</div>`,

  'ui-spark': p => `<span class="inline-block ${p.tone === 'bad' ? 'text-bad' : p.tone === 'accent' ? 'text-accent' : 'text-ok'}" aria-hidden="true" x-html="sparkSvg(${p.data}, ${p.w || 84}, ${p.h || 22})"></span>`,

  'ui-avatar': p => `<span class="rounded-full grid place-items-center font-semibold shrink-0" style="width:${p.size || 32}px;height:${p.size || 32}px;font-size:${Math.round((p.size || 32) * 0.36)}px;background:var(--accent-soft);color:var(--accent)">${p.initials || initials(DATA.account.name)}</span>`,

  'ui-modal': (p, s) => {
    const title = p.title ? `<h2 class="text-[16px] font-semibold" x-text="${p.title}"></h2>` : `<h2 class="text-[16px] font-semibold">${p['title-key'] ? t(p['title-key']) : ''}</h2>`;
    const desc = p.desc ? `<p class="text-[12.5px] text-mute mt-1 leading-relaxed" x-text="${p.desc}"></p>` : p['desc-key'] ? `<p class="text-[12.5px] text-mute mt-1 leading-relaxed">${t(p['desc-key'])}</p>` : '';
    return `<dialog id="${p.id}" class="dlg ${p.wide ? 'wide' : ''}" aria-labelledby="${p.id}-title" ${p.announce ? `data-announce="${esc(p.announce)}"` : ''}>
      <div class="dlg-card">
        <div class="flex items-start gap-4 px-5 pt-5 pb-4 border-b border-line">
          <div class="min-w-0 flex-1">${title}${desc}</div>
          <button type="button" class="btn btn-ghost btn-icon -mt-1 -mr-1" onclick="closeDialog('${p.id}')" aria-label="${t('common.close')}">${ICON('x', '', 17)}</button>
        </div>
        <div class="p-5">${s}</div>
      </div>
    </dialog>`;
  }
};

function expand(root) {
  const sel = Object.keys(C).join(',');
  while (root.querySelector(sel)) {
    [...root.querySelectorAll(sel)].reverse().forEach(el => {
      const p = Object.fromEntries([...el.attributes].map(a => [a.name, a.value]));
      const a = [...el.attributes].map(x => `${x.name}="${x.value.replace(/"/g, '&quot;')}"`).join(' ');
      const tag = C[el.localName];
      if (!tag) return;
      const tpl = document.createElement('template');
      tpl.innerHTML = tag(p, el.innerHTML, a);
      el.replaceWith(tpl.content);
    });
  }
  root.querySelectorAll('template').forEach(tp => expand(tp.content));
}
expand(document);
if (missingKeys.size) console.warn('[area] missing i18n keys:', [...missingKeys].join(', '));
window.t = t; window.tHtml = tHtml; window.tx = tx; window.T = T;
window.ICON = ICON; window.SVC = SVC; window.svc = svc; window.svcColor = svcColor; window.svcIcon = svcIcon;
window.toast = toast; window.announce = announce; window.setTheme = setTheme; window.setLang = setLang;
window.setDensity = setDensity; window.setMotion = setMotion; window.openDialog = openDialog; window.closeDialog = closeDialog;
window.fmtNum = fmtNum; window.fmtMoney = fmtMoney; window.fmtWhen = fmtWhen; window.relTime = relTime;
window.sparkSvg = sparkSvg; window.dayChart = dayChart; window.parseRefs = parseRefs; window.serviceName = serviceName;
window.typeLabel = typeLabel; window.initials = initials; window.statusIcon = statusIcon; window.statusTone = statusTone; window.fmtTime = fmtTime; window.parseNum = parseNum;
window.runsFor = runsFor; window.lastRun = lastRun; window.wfNodeName = wfNodeName; window.wfServices = wfServices;
window.wfTriggerNode = wfTriggerNode; window.wfStatus = wfStatus; window.wfStatusLabel = wfStatusLabel; window.statusPill = statusPill;
window.sparkFor = sparkFor; window.usedIn = usedIn; window.fmtDuration = fmtDuration; window.dateLong = dateLong; window.runWorkflow = runWorkflow;
window.wfCondition = wfCondition; window.wfNodes = wfNodes;

