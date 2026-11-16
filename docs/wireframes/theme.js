// Design tokens + base styles. Everything visual starts here; components only compose these.
tailwind.config = {
  theme: {
    extend: {
      colors: {
        win: 'var(--win)', side: 'var(--side)', card: 'var(--card)', sunken: 'var(--sunken)',
        ink: 'var(--ink)', mute: 'var(--mute)', line: 'var(--line)', fill: 'var(--fill)',
        accent: 'var(--accent)', 'on-accent': 'var(--on-accent)', ok: 'var(--ok)', bad: 'var(--bad)',
        warn: 'var(--warn)', yes: 'var(--yes)', no: 'var(--no)'
      },
      fontFamily: { sans: ['Inter', 'Cantarell', 'system-ui', 'sans-serif'], mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'] },
      borderRadius: { xl2: '14px' },
      boxShadow: { card: '0 1px 2px rgba(20,18,26,.06), 0 4px 14px rgba(20,18,26,.04)', pop: '0 8px 30px rgba(20,18,26,.14)' }
    }
  }
};

const STORED_THEME = localStorage.getItem('area.theme') || 'system';
function resolvedTheme() {
  return STORED_THEME === 'system'
    ? (matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light')
    : STORED_THEME;
}
function applyTheme() {
  document.documentElement.dataset.theme = resolvedTheme();
  document.documentElement.style.colorScheme = resolvedTheme();
}
applyTheme();
matchMedia('(prefers-color-scheme:dark)').addEventListener('change', () => { if (STORED_THEME === 'system') applyTheme(); });

const STORED_LANG = localStorage.getItem('area.lang') || (navigator.language || 'en').slice(0, 2).toLowerCase() === 'fr' ? 'fr' : 'en';
function applyLang() {
  document.documentElement.lang = STORED_LANG;
  document.documentElement.dataset.lang = STORED_LANG;
}
applyLang();

const reducedMotionSetting = localStorage.getItem('area.motion') === 'reduced';
if (reducedMotionSetting) document.documentElement.dataset.motion = 'reduced';
const density = localStorage.getItem('area.density') === 'compact' ? 'compact' : 'comfortable';
document.documentElement.dataset.density = density;

document.head.insertAdjacentHTML('beforeend', `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<style>
:root{
  --win:#f7f6f3; --side:#efede9; --card:#ffffff; --sunken:#f2f0ec;
  --ink:#1d1b21; --mute:#5f5d66; --faint:#8b8992;
  --line:rgba(29,27,33,.11); --line-strong:rgba(29,27,33,.22);
  --fill:rgba(29,27,33,.055); --fill-hover:rgba(29,27,33,.095);
  --accent:#1b6fc4; --accent-soft:rgba(27,111,196,.12); --on-accent:#ffffff; --focus:#1b6fc4;
  --ok:#17764a; --ok-soft:rgba(23,118,74,.12);
  --bad:#bb1d28; --bad-soft:rgba(187,29,40,.10);
  --warn:#8a5a00; --warn-soft:rgba(138,90,0,.12);
  --yes:#17764a; --no:#7b3f93;
  --cv:#f1efeb; --dot:rgba(29,27,33,.15); --grid:rgba(29,27,33,.05);
  --shade:0 1px 2px rgba(20,18,26,.05),0 4px 16px rgba(20,18,26,.04);
  --radius:13px;
}
[data-theme=dark]{
  --win:#1c1b1e; --side:#171619; --card:#262529; --sunken:#211f24;
  --ink:#f4f2f5; --mute:#b6b3bc; --faint:#8d8a94;
  --line:rgba(255,255,255,.12); --line-strong:rgba(255,255,255,.26);
  --fill:rgba(255,255,255,.07); --fill-hover:rgba(255,255,255,.12);
  --accent:#7ab0f0; --accent-soft:rgba(122,176,240,.16); --on-accent:#0c1c2e; --focus:#8dbcf5;
  --ok:#6bdc9b; --ok-soft:rgba(107,220,155,.15); --bad:#ff8d80; --bad-soft:rgba(255,141,128,.14);
  --warn:#f0c34c; --warn-soft:rgba(240,195,76,.14);
  --yes:#6bdc9b; --no:#d3a6e6;
  --cv:#19181b; --dot:rgba(255,255,255,.13); --grid:rgba(255,255,255,.045);
  --shade:0 1px 2px rgba(0,0,0,.5),0 6px 20px rgba(0,0,0,.28);
}
*{box-sizing:border-box}
html,body{height:100%}
body{background:var(--win);color:var(--ink);font-family:Inter,Cantarell,system-ui,sans-serif;font-weight:450;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
h1,h2,h3,h4{font-weight:620;letter-spacing:-.014em;line-height:1.25;margin:0}
p{margin:0}
button,a{-webkit-tap-highlight-color:transparent}
::selection{background:var(--accent-soft);color:var(--ink)}
:where(a,button,input,select,textarea,[tabindex]):focus-visible{outline:3px solid var(--focus);outline-offset:2px;border-radius:8px}
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.skip{position:fixed;left:12px;top:-60px;z-index:90;background:var(--card);border:1px solid var(--line);padding:10px 16px;border-radius:10px;font-weight:600;transition:top .12s}
.skip:focus{top:12px}
.num{font-variant-numeric:tabular-nums;font-feature-settings:"tnum"}
.mono{font-family:"IBM Plex Mono",ui-monospace,monospace;font-variant-ligatures:none}

/* Surfaces */
.card{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);box-shadow:var(--shade)}
.panel{background:var(--card);border:1px solid var(--line);border-radius:var(--radius)}
.inset{background:var(--sunken);border-radius:10px}
.hair{border-bottom:1px solid var(--line)}

/* Controls */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:36px;padding:0 14px;border-radius:9px;background:var(--fill);border:1px solid transparent;font-size:14px;font-weight:600;color:var(--ink);cursor:pointer;white-space:nowrap;transition:background .14s,border-color .14s,color .14s}
.btn:hover{background:var(--fill-hover)}
.btn:disabled{opacity:.45;cursor:not-allowed}
.btn[aria-disabled=true]{opacity:.45;cursor:not-allowed}
.btn-accent{background:var(--accent);color:var(--on-accent)}
.btn-accent:hover{background:var(--accent);filter:brightness(1.06)}
.btn-quiet{background:transparent;border-color:var(--line)}
.btn-quiet:hover{background:var(--fill)}
.btn-ghost{background:transparent}
.btn-ghost:hover{background:var(--fill)}
.btn-danger{color:var(--bad);background:var(--bad-soft)}
.btn-danger:hover{background:var(--bad-soft);filter:brightness(.97)}
.btn-sm{min-height:30px;padding:0 10px;font-size:13px;border-radius:8px}
.btn-icon{width:36px;min-height:36px;padding:0}
.btn-sm.btn-icon{width:30px;min-height:30px}
.btn-pill{border-radius:99px}
.input,.select,.textarea{width:100%;background:var(--card);border:1px solid var(--line-strong);border-radius:8px;padding:8px 10px;font:inherit;font-size:14px;color:var(--ink);min-height:38px;transition:border-color .14s,box-shadow .14s}
.textarea{min-height:84px;resize:vertical;line-height:1.5}
.input:hover,.select:hover{background:var(--card)}
.input::placeholder,.textarea::placeholder{color:var(--faint)}
.input:focus,.select:focus,.textarea:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-soft)}
.input[aria-invalid=true],.textarea[aria-invalid=true]{border-color:var(--bad);box-shadow:0 0 0 3px var(--bad-soft)}
.select{appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' fill='none' stroke='%235f5d66' stroke-width='1.8' stroke-linecap='round'%3E%3Cpath d='M3 5.5 7 9.5l4-4'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 10px center;padding-right:30px}
[data-theme=dark] .select{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' fill='none' stroke='%23b6b3bc' stroke-width='1.8' stroke-linecap='round'%3E%3Cpath d='M3 5.5 7 9.5l4-4'/%3E%3C/svg%3E")}
.label{display:block;font-size:12px;font-weight:600;color:var(--mute);letter-spacing:.01em}
.hint{font-size:12px;color:var(--mute)}
.err{font-size:12px;color:var(--bad);font-weight:500}
.kbd{font-family:"IBM Plex Mono",monospace;font-size:11px;font-weight:500;background:var(--fill);border:1px solid var(--line);border-bottom-color:var(--line-strong);border-radius:5px;padding:1px 5px;color:var(--mute);white-space:nowrap}

/* Status */
.pill{display:inline-flex;align-items:center;gap:5px;border-radius:99px;padding:3px 9px;font-size:11.5px;font-weight:600;background:var(--fill);color:var(--mute);white-space:nowrap}
.pill-ok{background:var(--ok-soft);color:var(--ok)} .pill-bad{background:var(--bad-soft);color:var(--bad)}
.pill-warn{background:var(--warn-soft);color:var(--warn)} .pill-accent{background:var(--accent-soft);color:var(--accent)}
.tone-ok{color:var(--ok)} .tone-bad{color:var(--bad)} .tone-warn{color:var(--warn)} .tone-accent{color:var(--accent)} .tone-no{color:var(--no)}
.sw{width:44px;height:26px;border-radius:99px;background:var(--fill);position:relative;transition:background .16s;flex:none;border:1px solid var(--line)}
.sw::after{content:"";position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:99px;background:var(--card);box-shadow:0 1px 3px rgba(0,0,0,.25);transition:transform .18s cubic-bezier(.2,.7,.2,1)}
.sw[aria-checked=true]{background:var(--accent);border-color:transparent}
.sw[aria-checked=true]::after{transform:translateX(18px);background:#fff}
.sw[data-size=sm]{width:38px;height:22px}.sw[data-size=sm]::after{width:16px;height:16px}.sw[data-size=sm][aria-checked=true]::after{transform:translateX(16px)}

/* Service mark */
.svc{display:inline-grid;place-items:center;flex:none;border-radius:29%;background:color-mix(in srgb,var(--svc) 13%,transparent);color:var(--svc)}
[data-theme=dark] .svc{background:color-mix(in srgb,var(--svc) 20%,transparent)}
.svc svg{stroke-width:1.65}

/* Tabs */
.tabs{display:flex;gap:2px;border-bottom:1px solid var(--line)}
.tab{position:relative;padding:9px 10px 8px;font-size:13px;font-weight:560;color:var(--mute);border-radius:7px 7px 0 0;border:0;background:transparent;cursor:pointer;white-space:nowrap}
.tab:hover{color:var(--ink);background:var(--fill)}
.tab[aria-selected=true]{color:var(--ink);font-weight:620}
.tab[aria-selected=true]::after{content:"";position:absolute;left:8px;right:8px;bottom:-1px;height:2px;border-radius:2px;background:var(--accent)}
.seg{display:inline-flex;padding:2px;background:var(--fill);border-radius:9px;gap:2px}
.seg button{border-radius:7px;padding:5px 10px;font-size:12.5px;font-weight:600;color:var(--mute);display:inline-flex;gap:6px;align-items:center}
.seg button[aria-pressed=true]{background:var(--card);color:var(--ink);box-shadow:0 1px 2px rgba(0,0,0,.1)}

/* Rows & lists */
.rowlink{display:flex;align-items:center;gap:14px;padding:14px 16px;transition:background .12s}
.rowlink:hover{background:var(--fill)}
.rowlink:focus-within{background:var(--fill)}
.divide-line>*+*{border-top:1px solid var(--line)}

/* Editor surface */
.canvas-bg{background-color:var(--cv);background-image:radial-gradient(var(--dot) 1.15px,transparent 1.15px);background-size:22px 22px}
.node{background:var(--card);border:1px solid var(--line-strong);border-radius:12px;box-shadow:var(--shade);width:248px;position:absolute;transition:box-shadow .14s,border-color .14s}
.node[data-selected=true]{border-color:var(--accent);box-shadow:0 0 0 2px var(--accent),var(--shade)}
.node[data-invalid=true]{border-color:var(--warn)}
.node[data-dim=true]{opacity:.42}
.node[data-run=ok]{border-color:color-mix(in srgb,var(--ok) 65%,var(--line-strong))}
.node[data-run=fail]{border-color:var(--bad);box-shadow:0 0 0 2px var(--bad-soft),var(--shade)}
.port{width:14px;height:14px;border-radius:99px;background:var(--card);border:2.5px solid var(--line-strong);position:absolute;z-index:5;transition:transform .12s,border-color .12s,background .12s}
.port:hover,.port:focus-visible{transform:scale(1.25);border-color:var(--accent);background:var(--accent-soft)}
.port[data-live=true]{border-color:var(--accent);background:var(--accent-soft)}
.port[data-accept=true]{border-color:var(--ok);background:var(--ok-soft);transform:scale(1.3)}
.edge-hit{pointer-events:stroke;cursor:pointer}
.ref{display:inline-flex;align-items:center;gap:4px;max-width:100%;font-family:"IBM Plex Mono",monospace;font-size:11.5px;font-weight:500;padding:1px 6px;border-radius:5px;background:var(--accent-soft);color:var(--accent);vertical-align:baseline;border:1px solid transparent}
.ref:hover{border-color:var(--accent)}
.ref b{font-weight:600;opacity:.72}
.slot{border:1px dashed var(--line-strong);border-radius:9px;padding:7px 9px;min-height:50px;text-align:left;transition:border-color .12s,background .12s}
.slot[data-over=true],.slot[data-active=true]{border-color:var(--accent);background:var(--accent-soft);border-style:solid}

/* Transitions used to explain state changes, not to decorate */
.fade-in{animation:fadeIn .18s ease-out}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
.rise{animation:rise .2s cubic-bezier(.2,.7,.2,1)}
@keyframes rise{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
.flash{animation:flash .55s ease-out}
@keyframes flash{0%{background:var(--accent-soft)}100%{background:transparent}}
.spin{animation:spin 1s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}

/* Dialog */
dialog.dlg{border:0;padding:0;background:transparent;max-width:min(560px,calc(100vw - 32px));width:100%;color:var(--ink);max-height:calc(100vh - 40px)}
dialog.dlg::backdrop{background:rgba(18,16,22,.38);backdrop-filter:blur(1.5px)}
.dlg-card{background:var(--card);border:1px solid var(--line);border-radius:16px;box-shadow:0 24px 70px rgba(15,13,20,.28);overflow:hidden;animation:rise .18s ease-out}
dialog.wide{max-width:min(760px,calc(100vw - 32px))}

/* Toast */
#toasts{position:fixed;left:50%;transform:translateX(-50%);bottom:20px;z-index:90;display:flex;flex-direction:column;gap:8px;align-items:center;width:max-content;max-width:calc(100vw - 32px)}
.toast{display:flex;align-items:center;gap:12px;background:var(--ink);color:var(--win);padding:9px 10px 9px 14px;border-radius:11px;font-size:13px;font-weight:500;box-shadow:0 10px 30px rgba(0,0,0,.25);animation:rise .18s ease-out}
.toast button{color:inherit;font-weight:700;text-decoration:underline;text-underline-offset:2px;padding:3px 6px;border-radius:5px}
[data-theme=dark] .toast{background:var(--card);color:var(--ink);border:1px solid var(--line-strong)}

/* Scrollbars, only where content clearly scrolls */
.scroll{scrollbar-width:thin;scrollbar-color:var(--line-strong) transparent}
.scroll::-webkit-scrollbar{width:10px;height:10px}
.scroll::-webkit-scrollbar-thumb{background:var(--line-strong);border-radius:99px;border:3px solid transparent;background-clip:content-box}

/* Small helpers */
.hide-scroll::-webkit-scrollbar{display:none}
.data-table{width:100%;border-collapse:collapse;font-size:13px}
.data-table th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--mute);font-weight:600;padding:7px 10px;border-bottom:1px solid var(--line)}
.data-table td{padding:9px 10px;border-bottom:1px solid var(--line);vertical-align:top}
.data-table tr:last-child td{border-bottom:0}
pre.code{font-family:"IBM Plex Mono",monospace;font-size:11.5px;line-height:1.65;background:var(--sunken);border:1px solid var(--line);border-radius:9px;padding:11px 12px;overflow:auto;margin:0;color:var(--ink)}
.gutter{width:248px;flex:none}
@media (max-width:1023px){.gutter{width:100%}}

/* Phone preview */
.phone{width:344px;flex:none;background:var(--card);border:8px solid #2c2a30;border-radius:34px;height:716px;overflow:hidden;box-shadow:0 18px 50px rgba(20,18,26,.18);position:relative}
[data-theme=dark] .phone{border-color:#3a383f}
.phone-screen{height:100%;display:flex;flex-direction:column;background:var(--win);overflow:hidden}

/* Density */
[data-density=compact] .rowlink{padding-top:10px;padding-bottom:10px}
[data-density=compact] .data-table td{padding-top:6px;padding-bottom:6px}

@media (prefers-reduced-motion:reduce){
  *,*::before,*::after{animation-duration:.001ms!important;animation-iteration-count:1!important;transition-duration:.001ms!important;scroll-behavior:auto!important}
}
[data-motion=reduced] *, [data-motion=reduced] *::before, [data-motion=reduced] *::after{animation-duration:.001ms!important;animation-iteration-count:1!important;transition-duration:.001ms!important}
[x-cloak]{display:none!important}
</style>`);
