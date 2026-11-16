// Shared workflow surface used by the builder (edit) and the run page (replay).
// One model: nodes + edges. Canvas, keyboard, mapping panel and outline all read from it.
function flow(opts = {}) {
  const qs = new URLSearchParams(location.search);
  const wfId = opts.wfId || qs.get('wf') || 'invoices';
  const wf = DATA.workflows.find(w => w.id === wfId) || DATA.workflows[0];
  const clone = (v) => JSON.parse(JSON.stringify(v));
  const W = 248, H = 84, COND_H = 134;

  return {
    mode: opts.mode || 'edit',
    ro: (opts.mode || 'edit') === 'replay',
    wfId: wf.id, wf, wfName: wf.name,
    nodes: clone(wf.nodes), edges: clone(wf.edges),
    sel: wf.nodes[0]?.id || null,
    hoverEdge: null, selectedEdge: null,
    cam: { x: 40, y: 40, k: 1 },
    snap: true, dirty: false, savedAt: null,
    tab: 'configure', focusField: null, flashField: null,
    drawer: false, paletteOpen: false, issuesOpen: false,
    palette: { q: '', idx: 0, after: null, edge: null, port: null, returnFocus: null },
    map: { source: null, target: null, q: '', hover: null, dragging: false },
    connectFor: null,
    dataLinks: true, traceSource: null,
    test: null,
    run: null, runIdx: 0, playing: false, playTimer: null,
    runFilter: qs.get('failed') === '1' ? 'failed' : 'all',
    runWf: qs.get('wf') || '',
    past: [], future: [],
    link: null, drag: null, panning: null, caret: null, historyOnce: false,
    spaceDown: false,
    _uid: 1,

    // ---- Graph -------------------------------------------------------------
    get mapById() { return Object.fromEntries(this.nodes.map(n => [n.id, n])); },
    get cur() { return this.mapById[this.sel] || null; },
    node(id) { return this.mapById[id]; },
    isCond(n) { return !!n && (n.comp === 'condition' || n.kind === 'condition'); },
    isTrigger(n) { return !!n && n.id === 'trigger'; },
    kindOf(n) { return this.isCond(n) ? 'condition' : this.isTrigger(n) ? 'trigger' : 'action'; },
    kindLabel(n) { return t(this.kindOf(n) === 'condition' ? 'builder.kindCondition' : this.kindOf(n) === 'trigger' ? 'builder.kindTrigger' : 'builder.kindAction'); },
    compOf(n) {
      if (!n || this.isCond(n)) return null;
      const s = svc(n.svc);
      return (s.triggers || []).concat(s.actions || []).find(c => c.id === n.comp) || null;
    },
    nameOf(n) { if (!n) return ''; if (n.name) return tx(n.name); const c = this.compOf(n); return c ? tx(c.name) : '—'; },
    paramsOf(n) {
      if (!n) return [];
      if (this.isCond(n)) return [
        { key: 'left', labelKey: 'builder.conditionField', type: 'text', accepts: ['text', 'number', 'date', 'url'] },
        { key: 'right', labelKey: 'builder.conditionValue', type: 'text', accepts: ['text', 'number'] }
      ];
      return this.compOf(n)?.params || [];
    },
    paramLabel(p) { return p.label ? tx(p.label) : t(p.labelKey || 'common.unknown'); },
    typeLabel(type) {
      const k = { select: 'text', textarea: 'text', json: 'object', datetime: 'date', file: 'file', url: 'url', number: 'number', bool: 'bool' }[type] || 'text';
      return t('builder.type.' + k);
    },
    outputsOf(n) {
      if (!n || this.isCond(n)) return [];
      return (this.compOf(n)?.outputs || []).map(o => ({ ...o, value: n.sample?.[o.key] ?? o.sample ?? '' }));
    },
    outputValue(n, key) { const o = this.outputsOf(n).find(x => x.key === key); return o ? o.value : undefined; },
    heightOf(n) { return this.isCond(n) ? COND_H : H; },
    inp(n) { return { x: n.x, y: n.y + 28 }; },
    outp(n, port) {
      if (this.isCond(n)) return { x: n.x + W, y: n.y + (port === 'yes' ? 64 : 90) };
      return { x: n.x + W, y: n.y + 28 };
    },
    curve(a, b) { const d = Math.max(46, Math.abs(b.x - a.x) / 2); return `M${a.x},${a.y} C${a.x + d},${a.y} ${b.x - d},${b.y} ${b.x},${b.y}`; },
    outEdge(id, port = 'out') { return this.edges.find(e => e.from === id && (port === 'out' ? e.port === 'out' : e.port === port)); },
    inEdge(id) { return this.edges.find(e => e.to === id); },
    branchOf(id) { const e = this.inEdge(id); return e && (e.port === 'yes' || e.port === 'no') ? e.port : null; },

    get steps() {
      const map = {}; let count = 0; const seen = new Set();
      const walk = (id, branch) => {
        if (!id || seen.has(id)) return;
        const n = this.node(id); if (!n) return;
        seen.add(id); map[id] = { no: ++count, branch };
        const outs = this.edges.filter(e => e.from === id);
        if (this.isCond(n)) {
          const y = outs.find(e => e.port === 'yes'), no = outs.find(e => e.port === 'no');
          if (y) walk(y.to, 'yes'); if (no) walk(no.to, 'no');
        } else {
          const o = outs.find(e => e.port === 'out'); if (o) walk(o.to, branch);
        }
      };
      walk('trigger', null);
      this.nodes.forEach(n => { if (!map[n.id]) { map[n.id] = { no: ++count, branch: 'loose' }; } });
      return map;
    },
    stepOf(id) { return this.steps[id]?.no ?? 0; },
    get stepCount() { return t('builder.stepCount', { n: this.nodes.length }); },
    branchOfStep(id) { return this.steps[id]?.branch; },
    get ancestorsMap() {
      const out = {}; const walk = (id, acc) => {
        this.edges.filter(e => e.to === id).forEach(e => { if (!acc.has(e.from)) { acc.add(e.from); walk(e.from, acc); } });
        return acc;
      };
      this.nodes.forEach(n => { out[n.id] = walk(n.id, new Set()); });
      return out;
    },
    sourcesFor(id) {
      const anc = this.ancestorsMap[id] || new Set();
      return this.nodes.filter(n => anc.has(n.id) && n.id !== id)
        .sort((a, b) => this.stepOf(a.id) - this.stepOf(b.id));
    },
    reaches(fromId, toId, seen = new Set()) {
      if (fromId === toId) return true;
      if (seen.has(fromId)) return false; seen.add(fromId);
      return this.edges.filter(e => e.from === fromId).some(e => this.reaches(e.to, toId, seen));
    },
    canConnect(fromId, port, toId) {
      if (!fromId || !toId) return { ok: false, reasonKey: 'builder.reasonMissing' };
      if (fromId === toId) return { ok: false, reasonKey: 'builder.reasonSelf' };
      const to = this.node(toId); const from = this.node(fromId);
      if (!to || !from) return { ok: false, reasonKey: 'builder.reasonMissing' };
      if (this.isTrigger(to)) return { ok: false, reasonKey: 'builder.reasonTrigger' };
      if (this.edges.some(e => e.to === toId && !(e.from === fromId && e.port === port))) return { ok: false, reasonKey: 'builder.reasonIncoming' };
      if (this.reaches(toId, fromId)) return { ok: false, reasonKey: 'builder.reasonCycle' };
      if (this.isCond(to)) {
        const anc = this.ancestorsMap[toId] || new Set();
        if ([...anc].some(x => this.isCond(this.node(x))) || this.isCond(from)) return { ok: false, reasonKey: 'builder.reasonNested' };
      }
      const used = this.edges.find(e => e.from === fromId && e.port === port && e.to !== toId);
      if (used && !this.isCond(from)) { /* replacing the single output is allowed */ }
      return { ok: true };
    },
    validTargets(id, port = 'out') {
      const current = this.outEdge(id, port)?.to;
      return this.nodes.filter(n => n.id !== current && this.canConnect(id, port, n.id).ok);
    },
    connectOptions(id) {
      if (!id) return [];
      const ports = this.isCond(this.node(id)) ? ['yes', 'no'] : ['out'];
      const out = [];
      ports.forEach(port => this.validTargets(id, port).forEach(n => out.push({ id: n.id, port, name: this.nameOf(n) })));
      return out;
    },

    // ---- Geometry ----------------------------------------------------------
    get worldStyle() { return `transform:translate(${this.cam.x}px,${this.cam.y}px) scale(${this.cam.k});transform-origin:0 0`; },
    get zoomPct() { return Math.round(this.cam.k * 100); },
    pt(e) {
      const r = this.$refs.viewport.getBoundingClientRect();
      return { x: (e.clientX - r.left - this.cam.x) / this.cam.k, y: (e.clientY - r.top - this.cam.y) / this.cam.k };
    },
    fit() {
      const vp = this.$refs.viewport; if (!vp || !this.nodes.length) return;
      const pad = 70;
      const minX = Math.min(...this.nodes.map(n => n.x)) - pad, minY = Math.min(...this.nodes.map(n => n.y)) - pad;
      const maxX = Math.max(...this.nodes.map(n => n.x + W)) + pad, maxY = Math.max(...this.nodes.map(n => n.y + this.heightOf(n))) + pad;
      const k = Math.min(1, Math.max(0.28, Math.min(vp.clientWidth / (maxX - minX), vp.clientHeight / (maxY - minY))));
      this.cam = { k, x: Math.round((vp.clientWidth - (maxX - minX) * k) / 2 - minX * k), y: Math.round((vp.clientHeight - (maxY - minY) * k) / 2 - minY * k) };
    },
    zoomTo(k, cx, cy) {
      const vp = this.$refs.viewport; if (!vp) return;
      const nk = Math.min(1.6, Math.max(0.3, k));
      const px = cx ?? vp.clientWidth / 2, py = cy ?? vp.clientHeight / 2;
      const wx = (px - this.cam.x) / this.cam.k, wy = (py - this.cam.y) / this.cam.k;
      this.cam = { k: nk, x: px - wx * nk, y: py - wy * nk };
    },
    zoom(f = 1.15, cx, cy) { this.zoomTo(this.cam.k * f, cx, cy); },
    resetZoom() { this.zoomTo(1); },
    wheel(e) {
      if (e.ctrlKey || e.metaKey) {
        const r = this.$refs.viewport.getBoundingClientRect();
        this.zoomTo(this.cam.k * (e.deltaY < 0 ? 1.08 : 0.93), e.clientX - r.left, e.clientY - r.top);
      } else {
        this.cam.x -= e.deltaX; this.cam.y -= e.deltaY;
      }
    },
    midOf(e) {
      const a = this.outp(this.node(e.from), e.port), b = this.inp(this.node(e.to));
      return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    },
    get edgeSvg() {
      return this.edges.map((e, i) => {
        const a = this.node(e.from), b = this.node(e.to);
        if (!a || !b) return '';
        const p = this.outp(a, e.port), q = this.inp(b);
        const active = this.hoverEdge === i || this.selectedEdge === i;
        let stroke = active ? 'var(--accent)' : 'var(--line-strong)';
        if (this.run) {
          const inRun = this.run.path.some(s => s.id === e.from) && this.run.path.some(s => s.id === e.to);
          const prev = this.run.path.find(s => s.id === e.from);
          if (prev && prev.decision) stroke = (prev.decision === 'yes' && e.port === 'yes') || (prev.decision === 'no' && e.port === 'no') ? 'var(--ok)' : 'var(--line)';
          else stroke = inRun ? 'var(--ok)' : 'var(--line)';
        }
        if (this.test?.seen?.includes(e.from) && this.test?.seen?.includes(e.to)) stroke = 'var(--ok)';
        const width = active ? 2.6 : 1.9;
        return `<path d="${this.curve(p, q)}" fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" ${this.ro ? '' : ''}/>` +
          (e.port === 'yes' ? `<g><rect x="${p.x + 10}" y="${p.y - 19}" width="30" height="17" rx="5" fill="var(--ok-soft)"/><text x="${p.x + 25}" y="${p.y - 6.5}" text-anchor="middle" font-size="10.5" font-weight="650" fill="var(--yes)">${t('builder.branchYes')}</text></g>` : '') +
          (e.port === 'no' ? `<g><rect x="${p.x + 10}" y="${p.y - 19}" width="26" height="17" rx="5" fill="var(--fill)"/><text x="${p.x + 23}" y="${p.y - 6.5}" text-anchor="middle" font-size="10.5" font-weight="650" fill="var(--mute)">${t('builder.branchNo')}</text></g>` : '');
      }).join('');
    },
    get traceSvg() {
      if (this.ro || !this.dataLinks) return '';
      const pairs = [];
      const addFor = (nodeId) => {
        const n = this.node(nodeId); if (!n) return;
        this.paramsOf(n).forEach(p => parseRefs(n.values?.[p.key] || '').filter(r => r.kind === 'ref').forEach(r => {
          if (r.id === nodeId) return;
          pairs.push({ from: r.id, to: nodeId, key: r.key });
        }));
      };
      if (this.traceSource) { this.nodes.forEach(n => { this.paramsOf(n).forEach(p => this.refsOfValue(n, p.key).forEach(r => { if (r.id === this.traceSource) pairs.push({ from: r.id, to: n.id, key: r.key }); })); }); }
      else if (this.sel) addFor(this.sel);
      return [...new Map(pairs.map(x => [x.from + x.to + x.key, x])).values()].map(x => {
        const a = this.node(x.from), b = this.node(x.to); if (!a || !b) return '';
        const p = this.outp(a, 'out'), q = this.inp(b);
        return `<path d="${this.curve(p, q)}" fill="none" stroke="var(--accent)" stroke-width="1.6" stroke-dasharray="2 6" stroke-linecap="round" opacity=".55"/>`;
      }).join('');
    },
    get minimap() {
      const pad = 12, mw = 150, mh = 96;
      const xs = this.nodes.map(n => n.x), ys = this.nodes.map(n => n.y);
      const minX = Math.min(...xs, 0) - 20, minY = Math.min(...ys, 0) - 20;
      const maxX = Math.max(...this.nodes.map(n => n.x + W), 1) + 20, maxY = Math.max(...this.nodes.map(n => n.y + this.heightOf(n)), 1) + 20;
      const s = Math.min((mw - pad * 2) / (maxX - minX), (mh - pad * 2) / (maxY - minY));
      const tx = (x) => pad + (x - minX) * s, ty = (y) => pad + (y - minY) * s;
      const vp = this.$refs.viewport;
      const view = vp ? { x: tx(-this.cam.x / this.cam.k), y: ty(-this.cam.y / this.cam.k), w: (vp.clientWidth / this.cam.k) * s, h: (vp.clientHeight / this.cam.k) * s } : null;
      return { w: mw, h: mh, rects: this.nodes.map(n => ({ x: tx(n.x), y: ty(n.y), w: Math.max(8, W * s), h: Math.max(5, this.heightOf(n) * s), sel: n.id === this.sel, bad: this.isIssueNode(n.id) })), view };
    },
    get minimapSvg() {
      const m = this.minimap;
      return `<svg width="${m.w}" height="${m.h}" aria-hidden="true" style="display:block">
        <rect x="0" y="0" width="${m.w}" height="${m.h}" rx="6" fill="var(--sunken)"></rect>
        ${m.rects.map(r => `<rect x="${r.x.toFixed(1)}" y="${r.y.toFixed(1)}" width="${r.w.toFixed(1)}" height="${r.h.toFixed(1)}" rx="2" fill="${r.bad ? 'var(--warn)' : r.sel ? 'var(--accent)' : 'var(--faint)'}" opacity="${r.sel ? 0.95 : 0.5}"></rect>`).join('')}
        ${m.view ? `<rect x="${m.view.x.toFixed(1)}" y="${m.view.y.toFixed(1)}" width="${Math.max(4, m.view.w).toFixed(1)}" height="${Math.max(4, m.view.h).toFixed(1)}" rx="3" fill="none" stroke="var(--accent)" stroke-width="1.2"></rect>` : ''}
      </svg>`;
    },
    minimapJump(e) {
      const r = this.$refs.viewport.getBoundingClientRect();
      const mm = this.$refs.minimap.getBoundingClientRect();
      const ratioX = (e.clientX - mm.left) / mm.width, ratioY = (e.clientY - mm.top) / mm.height;
      const xs = this.nodes.map(n => n.x), ys = this.nodes.map(n => n.y);
      const minX = Math.min(...xs, 0) - 20, minY = Math.min(...ys, 0) - 20;
      const maxX = Math.max(...this.nodes.map(n => n.x + W), 1) + 20, maxY = Math.max(...this.nodes.map(n => n.y + this.heightOf(n)), 1) + 20;
      const wx = minX + ratioX * (maxX - minX), wy = minY + ratioY * (maxY - minY);
      this.cam.x = r.width / 2 - wx * this.cam.k; this.cam.y = r.height / 2 - wy * this.cam.k;
    },

    // ---- Pointer -----------------------------------------------------------
    downCanvas(e) {
      if (e.button !== 0 && e.button !== 1) return;
      const start = { x: e.clientX, y: e.clientY, cx: this.cam.x, cy: this.cam.y };
      this.panning = start;
      this.sel = null; this.selectedEdge = null;
    },
    downNode(e, n) {
      if (this.ro) { this.sel = n.id; return; }
      if (e.target.closest('button,a,input,select,textarea,.port')) return;
      this.sel = n.id; this.selectedEdge = null;
      const p = this.pt(e);
      this.drag = { id: n.id, dx: p.x - n.x, dy: p.y - n.y, moved: false, ox: n.x, oy: n.y };
      this.historyOnce = false;
    },
    move(e) {
      const p = this.pt(e);
      if (this.drag) {
        const n = this.node(this.drag.id); if (!n) return;
        let x = p.x - this.drag.dx, y = p.y - this.drag.dy;
        if (this.snap && !e.altKey) { x = Math.round(x / 8) * 8; y = Math.round(y / 8) * 8; }
        if (!this.drag.moved && Math.abs(x - this.drag.ox) + Math.abs(y - this.drag.oy) > 2) {
          this.drag.moved = true; this.pushHistory();
        }
        n.x = Math.max(0, x); n.y = Math.max(0, y);
        this.dirty = true;
      }
      if (this.panning) {
        this.cam.x = this.panning.cx + (e.clientX - this.panning.x);
        this.cam.y = this.panning.cy + (e.clientY - this.panning.y);
      }
      if (this.link) { this.link.x = p.x; this.link.y = p.y; this.link.target = this.hitNode(e); }
      if (this.map.dragging) this.map.hover = this.hitSlot(e);
    },
    hitNode(e) {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const card = el?.closest('[data-node]');
      return card ? card.getAttribute('data-node') : null;
    },
    hitSlot(e) { const el = document.elementFromPoint(e.clientX, e.clientY); const s = el?.closest('[data-slot]'); return s ? s.getAttribute('data-slot') : null; },
    up(e) {
      if (this.link) {
        const to = this.hitNode(e), l = this.link;
        this.link = null;
        if (to) this.connect(l.from, l.port, to);
      }
      this.drag = null; this.panning = null; this.map.dragging = false; this.map.hover = null;
    },
    startLink(e, n, port) {
      if (this.ro) return;
      e.stopPropagation();
      const p = this.pt(e);
      this.link = { from: n.id, port, x: p.x, y: p.y, target: null };
      this.sel = n.id;
    },
    connect(fromId, port, toId) {
      const res = this.canConnect(fromId, port, toId);
      if (!res.ok) { toast(t('builder.connectionFail', { reason: t(res.reasonKey) }), { timeout: 5000 }); announce(t('builder.connectionFail', { reason: t(res.reasonKey) }), true); return false; }
      this.pushHistory();
      this.edges = this.edges.filter(e => !(e.from === fromId && e.port === port) && e.to !== toId);
      this.edges.push({ from: fromId, port, to: toId });
      this.dirty = true;
      toast(t('builder.connected', { name: this.nameOf(this.node(toId)) }));
      return true;
    },
    connectTo(toId, port) {
      if (!this.sel) return;
      this.connect(this.sel, port || 'out', toId);
      closeDialog('connect-dialog');
    },
    removeEdge(e) {
      if (this.ro || !e) return;
      this.pushHistory();
      this.edges = this.edges.filter(x => x !== e);
      this.selectedEdge = null; this.hoverEdge = null; this.dirty = true;
      toast(t('builder.disconnected'), { action: t('common.undo'), onAction: () => this.undo() });
    },
    disconnectOutgoing() {
      if (!this.cur) return;
      const list = this.edges.filter(e => e.from === this.sel);
      if (!list.length) return;
      this.pushHistory(); this.edges = this.edges.filter(e => e.from !== this.sel); this.dirty = true;
      toast(t('builder.disconnected'), { action: t('common.undo'), onAction: () => this.undo() });
    },
    edgeActions(e, i) { this.hoverEdge = i; this.selectedEdge = i; },

    // ---- History & save ----------------------------------------------------
    pushHistory() {
      this.past.push({ nodes: clone(this.nodes), edges: clone(this.edges) });
      if (this.past.length > 40) this.past.shift();
      this.future = []; this.dirty = true;
    },
    undo() {
      if (!this.past.length) return;
      this.future.push({ nodes: clone(this.nodes), edges: clone(this.edges) });
      const s = this.past.pop(); this.nodes = s.nodes; this.edges = s.edges; this.dirty = true;
      announce(t('builder.reverted'));
    },
    redo() {
      if (!this.future.length) return;
      this.past.push({ nodes: clone(this.nodes), edges: clone(this.edges) });
      const s = this.future.pop(); this.nodes = s.nodes; this.edges = s.edges; this.dirty = true;
      announce(t('builder.reverted'));
    },
    save() {
      if (this.ro) return;
      const blocking = this.issues.filter(x => x.blocking);
      if (blocking.length) {
        this.issuesOpen = true;
        toast(t('builder.saveBlocked', { n: blocking.length }), { timeout: 5000 });
        announce(t('builder.issueFirst', { issue: blocking[0].text }), true);
        return;
      }
      this.dirty = false; this.savedAt = new Date().toISOString(); this.issuesOpen = false;
      const refs = this.nodes.reduce((a, n) => a + this.paramsOf(n).reduce((b, p) => b + parseRefs(n.values?.[p.key] || '').filter(r => r.kind === 'ref').length, 0), 0);
      toast(t('builder.savedToast') + ' — ' + t('builder.referenceCheck', { n: refs }));
      announce(t('builder.saved'), true);
    },
    // ---- References & validation ------------------------------------------
    refToken(id, key) { return `{{ ${id}.${key} }}`; },
    refsOfValue(n, key) { return parseRefs(n?.values?.[key] || '').filter(r => r.kind === 'ref'); },
    paramValue(n, p) { return n?.values?.[p.key] ?? ''; },
    hasRefs(v) { return /\{\{/.test(String(v || '')); },
    resolve(str) {
      return String(str ?? '').replace(/\{\{\s*([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\s*\}\}/g, (m, id, key) => {
        const n = this.node(id); if (!n) return '—';
        const v = n.sample?.[key];
        return v == null || v === '' ? '—' : String(v);
      });
    },
    previewOf(n, key) { return this.resolve(n?.values?.[key]); },
    outputType(n, key) { return this.outputsOf(n).find(o => o.key === key)?.type || 'text'; },
    refCount(id, key) {
      let c = 0;
      this.nodes.forEach(n => this.paramsOf(n).forEach(p => this.refsOfValue(n, p.key).forEach(r => { if (r.id === id && r.key === key) c++; })));
      return c;
    },
    totalRefs() { return this.nodes.reduce((a, n) => a + this.paramsOf(n).reduce((b, p) => b + this.refsOfValue(n, p.key).length, 0), 0); },
    get reachable() {
      const set = new Set();
      if (!this.node('trigger')) return set;
      const walk = (id) => { if (!id || set.has(id)) return; if (!this.node(id)) return; set.add(id); this.edges.filter(e => e.from === id).forEach(e => walk(e.to)); };
      walk('trigger'); return set;
    },
    isIssueNode(id) { return this.issues.some(x => x.node === id); },
    get issues() {
      const out = []; const seenMsg = new Set();
      const add = (o) => { const k = (o.text || '') + '|' + (o.field || ''); if (!seenMsg.has(k)) { seenMsg.add(k); out.push({ blocking: true, ...o }); } };
      const triggers = this.nodes.filter(n => this.isTrigger(n));
      if (!triggers.length) add({ text: t('builder.warningNoTrigger'), node: null });
      const conditions = this.nodes.filter(n => this.isCond(n));
      conditions.forEach(c => {
        if (!this.outEdge(c.id, 'yes')) add({ text: t('builder.warningBranch'), node: c.id, field: 'left' });
        if (!this.outEdge(c.id, 'no')) add({ text: t('builder.warningBranch'), node: c.id, field: 'left' });
        const anc = this.ancestorsMap[c.id] || new Set();
        if ([...anc].some(x => this.isCond(this.node(x)))) add({ text: t('builder.warningNested'), node: c.id });
      });
      this.nodes.forEach(n => {
        if (!this.isTrigger(n)) {
          const ins = this.edges.filter(e => e.to === n.id);
          if (!ins.length) add({ text: t('builder.warningMissingInput', { name: this.nameOf(n) }), node: n.id });
          if (ins.length > 1) add({ text: t('builder.warningMerge', { name: this.nameOf(n) }), node: n.id });
          if (!this.reachable.has(n.id)) add({ text: t('builder.warningUnreachable', { name: this.nameOf(n) }), node: n.id });
        }
        if (!this.isCond(n)) {
          this.paramsOf(n).forEach(p => {
            if (p.required && !String(n.values?.[p.key] || '').trim()) add({ text: t('builder.warningRequired', { field: this.paramLabel(p), name: this.nameOf(n) }), node: n.id, field: p.key });
          });
        } else if (!String(n.values?.left || '').trim()) {
          add({ text: t('builder.warningRequired', { field: t('builder.conditionField'), name: this.nameOf(n) }), node: n.id, field: 'left' });
        }
        this.paramsOf(n).forEach(p => this.refsOfValue(n, p.key).forEach(r => {
          const src = this.node(r.id);
          if (!src || !this.outputsOf(src).some(o => o.key === r.key)) add({ text: t('builder.warningMissingRef', { key: `{{ ${r.id}.${r.key} }}` }), node: n.id, field: p.key });
        }));
      });
      if (!this.nodes.some(n => !this.isTrigger(n) && !this.isCond(n))) add({ text: t('builder.warningNoReaction'), node: null });
      return out;
    },
    get issuesCount() { return this.issues.length; },
    get valid() { return this.issues.length === 0; },
    issueClick(i) {
      if (i.node) { this.sel = i.node; this.tab = i.field ? 'configure' : this.tab; this.focusField = i.field || null; this.focusNode(i.node); }
      this.issuesOpen = false;
    },
    requiredMissing(n) { return this.paramsOf(n).find(p => p.required && !String(n.values?.[p.key] || '').trim()); },

    // ---- Data mapping ------------------------------------------------------
    get sourcesData() {
      if (!this.cur) return [];
      return this.sourcesFor(this.sel).map(n => ({
        id: n.id, step: this.stepOf(n.id), name: this.nameOf(n), svc: n.svc, kind: this.kindOf(n),
        outputs: this.outputsOf(n).filter(o => !this.map.q || (o.key + ' ' + tx(o.label) + ' ' + o.type).toLowerCase().includes(this.map.q.toLowerCase()))
      })).filter(g => g.outputs.length);
    },
    get targetsData() {
      if (!this.cur) return [];
      return this.paramsOf(this.cur).map(p => ({
        p, key: p.key, label: this.paramLabel(p), type: p.type, required: !!p.required,
        value: this.cur.values?.[p.key] || '',
        refs: this.refsOfValue(this.cur, p.key),
        preview: this.previewOf(this.cur, p.key),
        used: this.refsOfValue(this.cur, p.key).length
      }));
    },
    outputLabel(n, key) { return tx(this.outputsOf(n).find(o => o.key === key)?.label) || key; },
    sourceValue(g, key) { return this.outputValue(this.node(g.id), key); },
    refLabel(id, key) {
      const n = this.node(id);
      const step = this.stepOf(id);
      return `{{ ${id}.${key} }}`;
    },
    pickSource(g, o) {
      if (this.map.target) { this.insertRef(this.map.target, g.id, o.key); return; }
      if (this.map.source && this.map.source.id === g.id && this.map.source.key === o.key) { this.map.source = null; announce(t('builder.selectionCleared')); return; }
      this.map.source = { id: g.id, key: o.key, step: g.step, name: g.name, label: tx(o.label) };
      announce(t('builder.dataPicking', { value: `${g.step}.${o.key}` }));
    },
    pickTarget(tgt) {
      if (this.map.source) { this.insertRef(tgt.key, this.map.source.id, this.map.source.key); return; }
      if (this.map.target === tgt.key) { this.map.target = null; announce(t('builder.selectionCleared')); return; }
      this.map.target = tgt.key;
      announce(t('builder.dataTargeting', { field: tgt.label }));
    },
    insertRef(targetKey, sourceId, sourceKey) {
      if (!this.cur || this.ro) return;
      const param = this.paramsOf(this.cur).find(p => p.key === targetKey);
      if (!param) return;
      const out = this.outputsOf(this.node(sourceId)).find(o => o.key === sourceKey);
      const compatible = out && (param.accepts || []).includes(out.type);
      this.pushHistory();
      const current = String(this.cur.values?.[param.key] || '');
      const token = this.refToken(sourceId, sourceKey);
      const replace = !/\{\{/.test(current) && ['number', 'date', 'file', 'url', 'bool'].includes(param.type);
      const sep = current && !/\s$/.test(current) ? ' ' : '';
      this.cur.values[param.key] = replace ? token : (current + sep + token).trimStart();
      if (!compatible && out) toast(t('builder.dataTypeWarn', { field: this.paramLabel(param), type: t('builder.type.' + param.type), value: sourceKey, actual: t('builder.type.' + out.type) }), { timeout: 6000 });
      this.map.source = null; this.map.target = null;
      this.flashField = param.key;
      setTimeout(() => { this.flashField = null; }, 700);
      this.dirty = true;
      announce(t('builder.dataInserted', { value: sourceKey, field: this.paramLabel(param) }));
    },
    removeRefAt(paramKey, index) {
      if (!this.cur || this.ro) return;
      let i = 0;
      const current = String(this.cur.values?.[paramKey] || '');
      const next = current.replace(/\{\{\s*([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\s*\}\}/g, (m) => (i++ === index ? '' : m)).replace(/\s{2,}/g, ' ').trim();
      this.pushHistory();
      this.cur.values[paramKey] = next;
      const param = this.paramsOf(this.cur).find(p => p.key === paramKey);
      toast(t('builder.dataRemoved', { field: this.paramLabel(param) }));
    },
    dragSource(e, g, o) {
      try { e.dataTransfer.setData('text/plain', JSON.stringify({ id: g.id, key: o.key })); e.dataTransfer.effectAllowed = 'copy'; } catch (_) { }
      this.map.dragging = true;
    },
    dropTarget(e, key) {
      e.preventDefault();
      let data = null;
      try { data = JSON.parse(e.dataTransfer.getData('text/plain')); } catch (_) { }
      if (data) this.insertRef(key, data.id, data.key);
      this.map.dragging = false; this.map.hover = null;
    },
    dragOverSlot(e, key) { e.preventDefault(); this.map.hover = key; },
    clearPick() { this.map.source = null; this.map.target = null; announce(t('builder.selectionCleared')); },
    openMap(key) {
      this.tab = 'data'; this.focusField = key || this.focusField;
      this.$nextTick(() => { const el = document.getElementById('slot-' + (key || '')); el?.scrollIntoView({ block: 'nearest' }); });
    },
    gotoField(key) {
      this.tab = 'configure'; this.focusField = key;
      this.$nextTick(() => { const el = document.getElementById('f-' + (this.cur?.id || '') + '-' + key); el?.focus(); });
    },
    trackCaret(e, key) { this.caret = { key, pos: e.target.selectionStart }; },
    insertInlineRef(id, key) {
      if (!this.cur || this.ro) return;
      const field = this.focusField || this.caret?.key || this.paramsOf(this.cur)[0]?.key;
      if (!field) return;
      const token = this.refToken(id, key);
      const current = String(this.cur.values?.[field] || '');
      const at = this.caret && this.caret.key === field ? this.caret.pos : current.length;
      const before = current.slice(0, at), after = current.slice(at);
      const sepB = before && !/\s$/.test(before) ? ' ' : '';
      const sepA = after && !/^\s/.test(after) ? ' ' : '';
      this.pushHistory();
      this.cur.values[field] = before + sepB + token + sepA + after;
      this.dirty = true;
      this.caret = { key: field, pos: (before + sepB + token).length };
      this.$nextTick(() => { const el = document.getElementById('f-' + this.cur.id + '-' + field); el?.focus(); el?.setSelectionRange(this.caret.pos, this.caret.pos); });
      toast(t('builder.dataInserted', { value: key, field: this.paramLabel(this.paramsOf(this.cur).find(p => p.key === field)) }));
    },

    // ---- Palette & node operations ----------------------------------------
    get paletteEntries() {
      const q = this.palette.q.toLowerCase().trim();
      const rows = [];
      const hasTrigger = this.nodes.some(n => this.isTrigger(n));
      const hasCond = this.nodes.some(n => this.isCond(n));
      rows.push({ key: 'flow:condition', svc: 'flow', comp: 'condition', kind: 'condition', name: t('builder.addCondition'), blurb: t('builder.addConditionBody'), disabled: hasCond, reasonKey: 'builder.paletteConditionExists' });
      DATA.services.forEach(s => {
        [...(s.triggers || []).map(c => ({ ...c, kind: 'trigger' })), ...(s.actions || []).map(c => ({ ...c, kind: 'action' }))].forEach(c => {
          rows.push({ key: s.id + ':' + c.id, svc: s.id, comp: c.id, kind: c.kind, name: tx(c.name), blurb: tx(c.blurb), disabled: c.kind === 'trigger' && hasTrigger, reasonKey: 'builder.paletteTriggerExists' });
        });
      });
      return rows.filter(r => !q || (r.name + ' ' + r.blurb + ' ' + svc(r.svc).name + ' ' + this.kindLabel(r)).toLowerCase().includes(q));
    },
    openPalette(afterId, edgeIndex, port, e) {
      if (this.ro) return;
      this.palette = { q: '', idx: 0, after: afterId === undefined ? (this.sel || null) : afterId, edge: edgeIndex ?? null, port: port || null };
      openDialog('palette-dialog');
      this.$nextTick(() => document.getElementById('palette-search')?.focus());
    },
    paletteKey(e) {
      const n = this.paletteEntries.length;
      if (e.key === 'ArrowDown') { e.preventDefault(); this.palette.idx = (this.palette.idx + 1) % Math.max(n, 1); }
      if (e.key === 'ArrowUp') { e.preventDefault(); this.palette.idx = (this.palette.idx - 1 + Math.max(n, 1)) % Math.max(n, 1); }
      if (e.key === 'Enter') { e.preventDefault(); const it = this.paletteEntries[this.palette.idx]; if (it) this.paletteChoose(it); }
    },
    paletteChoose(it) {
      if (it.disabled) { toast(t(it.reasonKey), { timeout: 4500 }); return; }
      this.addEntry(it);
    },
    addEntry(it) {
      const n = {};
      if (it.kind === 'condition') {
        n.id = this.uniqueId(); n.svc = 'flow'; n.comp = 'condition'; n.kind = 'condition';
        n.values = { left: '', op: 'gt', right: '' };
      } else {
        const comp = (svc(it.svc).triggers || []).concat(svc(it.svc).actions || []).find(c => c.id === it.comp);
        n.id = it.kind === 'trigger' ? 'trigger' : this.uniqueId();
        n.svc = it.svc; n.comp = it.comp;
        n.values = {};
        (comp?.params || []).forEach(p => { n.values[p.key] = p.type === 'select' ? (p.options?.[0]?.value || '') : ''; });
        n.sample = {};
      }
      const after = this.palette.edge != null ? null : (this.palette.after ? this.node(this.palette.after) : null);
      this.pushHistory();
      if (it.kind === 'trigger') {
        const root = this.nodes.find(x => !this.inEdge(x.id) && !this.isTrigger(x));
        n.x = Math.max(0, Math.min(...this.nodes.map(x => x.x), 340) - 300); n.y = 130;
        this.nodes.push(n);
        if (root) this.edges.push({ from: 'trigger', port: 'out', to: root.id });
      } else {
        const x = after ? after.x + 300 : Math.max(...this.nodes.map(v => v.x), 40) + 300;
        const y = after ? after.y : 130;
        n.x = x; n.y = y;
        if (this.palette.edge != null) {
          const e = this.edges[this.palette.edge];
          this.edges.splice(this.palette.edge, 1);
          this.nodes.push(n);
          if (e) { this.edges.push({ from: e.from, port: e.port, to: n.id }); this.shiftSubtree(e.to, 300, 0); this.edges.push({ from: n.id, port: this.isCond(n) ? 'yes' : 'out', to: e.to }); }
        } else if (after) {
          this.nodes.push(n);
          const out = this.edges.find(e => e.from === after.id && e.port === 'out');
          if (out) {
            const succ = out.to;
            this.edges = this.edges.filter(e => e !== out);
            this.edges.push({ from: after.id, port: 'out', to: n.id });
            this.shiftSubtree(succ, 300, 0);
            this.edges.push({ from: n.id, port: this.isCond(n) ? 'yes' : 'out', to: succ });
          } else {
            const port = this.isCond(after) ? (this.palette.port || 'yes') : 'out';
            this.edges.push({ from: after.id, port, to: n.id });
          }
        } else {
          this.nodes.push(n);
        }
      }
      this.sel = n.id; this.tab = 'configure'; this.focusField = null;
      this.paletteOpen = false; this.dirty = true;
      closeDialog('palette-dialog');
      this.$nextTick(() => { this.focusNode(n.id); document.getElementById('node-' + n.id)?.focus(); });
      toast(after ? t('builder.added', { name: this.nameOf(n), after: this.nameOf(after) }) : t('builder.addedEnd', { name: this.nameOf(n) }));
    },
    uniqueId() { let i = 1; while (this.node('node_' + i)) i++; return 'node_' + i; },
    shiftSubtree(id, dx, dy, seen = new Set()) {
      if (!id || seen.has(id)) return; seen.add(id);
      const n = this.node(id); if (!n) return;
      n.x += dx; n.y += dy;
      this.edges.filter(e => e.from === id).forEach(e => this.shiftSubtree(e.to, dx, dy, seen));
    },
    openConnect(id) {
      if (this.ro) return;
      this.sel = id || this.sel;
      openDialog('connect-dialog');
      this.$nextTick(() => document.getElementById('connect-first')?.focus());
    },
    get connectTargets() { return this.sel ? this.connectOptions(this.sel) : []; },
    requestDelete() {
      if (this.ro || !this.cur) return;
      if (localStorage.getItem('area.confirmDelete') === '1' && !this.isTrigger(this.cur)) { openDialog('delete-dialog'); return; }
      this.deleteNode();
    },
    deleteNode() {
      const n = this.cur; if (!n || this.ro) return;
      this.pushHistory();
      const incoming = this.inEdge(n.id);
      const outgoing = this.isCond(n) ? null : this.outEdge(n.id, 'out');
      const succ = outgoing?.to;
      this.nodes = this.nodes.filter(x => x.id !== n.id);
      this.edges = this.edges.filter(e => e.from !== n.id && e.to !== n.id);
      if (incoming && succ && !this.isCond(n) && this.canConnect(incoming.from, incoming.port, succ).ok) {
        this.edges.push({ from: incoming.from, port: incoming.port, to: succ });
      }
      this.sel = this.node('trigger') ? 'trigger' : (this.nodes[0]?.id || null);
      this.dirty = true;
      closeDialog('delete-dialog');
      const name = this.nameOf(n);
      toast(t('builder.deleted', { name }), { action: t('common.undo'), onAction: () => this.undo() });
      this.$nextTick(() => { if (this.sel) document.getElementById('node-' + this.sel)?.focus(); });
    },
    duplicateNode() {
      if (this.ro || !this.cur) return;
      const src = this.cur;
      this.pushHistory();
      const copy = clone(src); copy.id = this.uniqueId(); copy.x = src.x + 300; copy.y = src.y + 110;
      if (copy.name) copy.name = (typeof copy.name === 'string' ? copy.name : tx(copy.name)) + ' · ' + t('common.copy');
      const out = this.isCond(src) ? null : this.outEdge(src.id, 'out');
      if (out) { this.edges = this.edges.filter(e => e !== out); this.shiftSubtree(out.to, 300, 110); }
      this.nodes.push(copy);
      this.edges.push({ from: src.id, port: this.isCond(src) ? 'yes' : 'out', to: copy.id });
      if (out) this.edges.push({ from: copy.id, port: this.isCond(copy) ? 'yes' : 'out', to: out.to });
      this.sel = copy.id; this.dirty = true;
      announce(t('builder.duplicated'));
      this.$nextTick(() => document.getElementById('node-' + copy.id)?.focus());
    },
    renameNode(e) {
      if (!this.cur) return;
      const v = String(e.target.value || '').trim();
      this.cur.name = v || undefined;
      this.dirty = true;
    },
    renameWorkflow(e) {
      const v = String(e.target.value || '').trim();
      this.wfName = v || t('builder.untitled');
      this.dirty = true;
    },

    // ---- Outline & keyboard ------------------------------------------------
    get outlineRows() {
      const rows = [];
      const chain = (id, depth, tag) => {
        let guard = 0;
        while (id && guard++ < 50) {
          const n = this.node(id); if (!n) return;
          rows.push({ n, depth, tag });
          if (this.isCond(n)) {
            const y = this.outEdge(n.id, 'yes'), no = this.outEdge(n.id, 'no');
            if (y) chain(y.to, depth + 1, 'yes'); else rows.push({ empty: 'yes', depth: depth + 1, cond: n.id, port: 'yes' });
            if (no) chain(no.to, depth + 1, 'no'); else rows.push({ empty: 'no', depth: depth + 1, cond: n.id, port: 'no' });
            return;
          }
          id = this.outEdge(n.id, 'out')?.to || null; tag = null;
        }
      };
      if (this.node('trigger')) chain('trigger', 0, null); else rows.push({ empty: 'trigger', depth: 0 });
      return rows;
    },
    focusNode(id) {
      this.sel = id;
      this.$nextTick(() => {
        const vp = this.$refs.viewport; if (!vp) return;
        const n = this.node(id); if (!n) return;
        const sx = n.x * this.cam.k + this.cam.x, sy = n.y * this.cam.k + this.cam.y;
        if (sx < 40 || sy < 40 || sx + W * this.cam.k > vp.clientWidth - 40 || sy + H * this.cam.k > vp.clientHeight - 40) {
          this.cam.x = vp.clientWidth / 2 - (n.x + W / 2) * this.cam.k;
          this.cam.y = vp.clientHeight / 2 - (n.y + H / 2) * this.cam.k;
        }
        document.getElementById('node-' + id)?.focus();
      });
    },
    nodeKey(e, n) {
      if (this.ro && !['Enter', 'Escape'].includes(e.key)) return;
      if (e.key === 'Enter') { e.preventDefault(); this.sel = n.id; this.tab = 'configure'; announce(this.nameOf(n)); return; }
      if (e.key === 'Escape') { this.sel = null; this.selectedEdge = null; return; }
      if (this.ro) return;
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.preventDefault();
        const step = e.shiftKey ? 40 : 8;
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
        this.pushHistory();
        n.x = Math.max(0, n.x + dx); n.y = Math.max(0, n.y + dy); this.dirty = true;
        announce(`${this.nameOf(n)} · ${Math.round(n.x)}, ${Math.round(n.y)}`);
        return;
      }
      if (e.key === 'c' || e.key === 'C') { e.preventDefault(); this.openConnect(n.id); return; }
      if (e.key === 'n' || e.key === 'N') { e.preventDefault(); this.openPalette(n.id); return; }
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); this.requestDelete(); }
    },
    init() {
      this.$nextTick(() => {
        if (this.mode === 'replay') return;
        this.cam = { k: 0.95, x: 48, y: 56 };
        this.$nextTick(() => this.fitIfNarrow());
      });
      this._keyHandler = (e) => this.hotkeys(e);
      window.addEventListener('keydown', this._keyHandler);
      if (this.mode === 'replay') {
        const asked = qs.get('run');
        const first = (asked && DATA.runs.find(r => r.id === asked)) || this.runList[0] || DATA.runs[0];
        if (first) this.loadRun(first.id);
      }
    },
    fitIfNarrow() {
      const vp = this.$refs.viewport; if (!vp) return;
      const t = this.node('trigger'); if (!t) return;
      if (t.x * this.cam.k + this.cam.x < 16) this.cam.x = 48;
    },
    hotkeys(e) {
      const tag = (e.target?.tagName || '').toLowerCase();
      const typing = ['input', 'textarea', 'select'].includes(tag) || e.target?.isContentEditable;
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === 's') { e.preventDefault(); if (this.mode === 'edit') this.save(); return; }
      if (meta && e.key.toLowerCase() === 'k') { e.preventDefault(); this.openPalette(this.sel); return; }
      if (meta && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) this.redo(); else this.undo(); return; }
      if (typing) {
        if (e.key === 'Escape' && (this.map.source || this.map.target)) this.clearPick();
        return;
      }
      if (e.key === '?') { e.preventDefault(); openDialog('keys-dialog'); return; }
      if (e.key === 'Escape') {
        if (this.map.source || this.map.target) this.clearPick();
        else { this.sel = null; this.selectedEdge = null; }
        return;
      }
      if (this.mode === 'replay') return;
      if (e.key === '+' || e.key === '=') { e.preventDefault(); this.zoom(1.15); }
      if (e.key === '-') { e.preventDefault(); this.zoom(0.87); }
      if (e.key === '0') { e.preventDefault(); this.fit(); }
      if (e.key === '/') { e.preventDefault(); this.openPalette(this.sel); }
    },

    // ---- Test run ----------------------------------------------------------
    evaluate(n) {
      if (!n || !this.isCond(n)) return null;
      const left = this.resolve(n.values.left), right = this.resolve(n.values.right), op = n.values.op;
      const l = String(left), r = String(right);
      if (op === 'empty') return l.trim() === '' ? 'yes' : 'no';
      if (op === 'notEmpty') return l.trim() !== '' ? 'yes' : 'no';
      if (op === 'contains') return l.toLowerCase().includes(r.toLowerCase()) ? 'yes' : 'no';
      if (op === 'eq') return l.trim().toLowerCase() === r.trim().toLowerCase() ? 'yes' : 'no';
      const ln = parseNum(l), rn = parseNum(r);
      if (!isFinite(ln) || !isFinite(rn)) return null;
      if (op === 'gt') return ln > rn ? 'yes' : 'no';
      if (op === 'lt') return ln < rn ? 'yes' : 'no';
      if (op === 'gte') return ln >= rn ? 'yes' : 'no';
      if (op === 'lte') return ln <= rn ? 'yes' : 'no';
      return null;
    },
    get opLabel() { return t('builder.op.' + (this.cur?.values?.op || 'gt')); },
    get conditionPreview() {
      if (!this.cur || !this.isCond(this.cur)) return null;
      const left = this.resolve(this.cur.values.left) || '…';
      const right = this.resolve(this.cur.values.right) || '…';
      const branch = this.evaluate(this.cur) === 'yes' ? t('builder.branchYes') : t('builder.branchNo');
      return t('builder.conditionPreview', { left, operator: t('builder.op.' + (this.cur.values.op || 'gt')), right, branch });
    },
    startTest() {
      if (this.ro) return;
      this.stopTest();
      if (!this.node('trigger')) { toast(t('builder.runNoTrigger')); return; }
      const path = []; const seen = []; let id = 'trigger'; let failed = null; let guard = 0;
      while (id && guard++ < 40) {
        const n = this.node(id); if (!n) break;
        const miss = this.requiredMissing(n);
        if (miss) { failed = { node: n.id, field: miss.key }; break; }
        path.push({ id, ms: id === 'trigger' ? 0 : 90 + ((this.stepOf(id) * 137) % 620) });
        seen.push(id);
        if (this.isCond(n)) {
          const dec = this.evaluate(n);
          if (!dec) { failed = { node: n.id, field: 'left' }; break; }
          path[path.length - 1].decision = dec;
          id = this.outEdge(id, dec)?.to || null;
        } else id = this.outEdge(id, 'out')?.to || null;
      }
      this.test = { path, seen: [], all: seen, done: false, running: true, failed, idx: 0 };
      this.sel = 'trigger';
      const tick = () => {
        if (!this.test) return;
        if (this.test.idx >= path.length) {
          this.test.running = false; this.test.done = true;
          const total = path.reduce((a, s) => a + Math.max(s.ms, 40), 0);
          this.test.total = total;
          toast(t('builder.runDone', { duration: `${(total / 1000).toFixed(1)} s` }) + ' — ' + t('builder.runDoneBody', { steps: path.length, service: svc(this.node(path[path.length - 1]?.id)?.svc || 'gmail').name }));
          announce(t('builder.runDone', { duration: `${(total / 1000).toFixed(1)} s` }), true);
          return;
        }
        const step = path[this.test.idx];
        this.test.seen.push(step.id); this.sel = step.id; this.test.idx++;
        this.focusNode(step.id);
        this.test.timer = setTimeout(tick, 620);
      };
      if (failed) {
        const n = this.node(failed.node), field = this.paramsOf(n).find(p => p.key === failed.field);
        this.sel = failed.node; this.tab = 'configure'; this.focusField = failed.field;
        toast(t('builder.runFailed', { name: this.nameOf(n) }), { timeout: 6000 });
        announce(t('builder.runMissing', { field: this.paramLabel(field || { labelKey: 'common.unknown' }), name: this.nameOf(n) }), true);
        this.test.running = false; this.test.done = false;
        return;
      }
      setTimeout(tick, 180);
    },
    stopTest() { if (this.test?.timer) clearTimeout(this.test.timer); this.test = null; },
    st(id) {
      if (this.test) {
        if (this.test.seen.includes(id)) return 'ok';
        if (this.test.done && !this.test.all.includes(id)) return 'skip';
        return '';
      }
      if (!this.run) return '';
      const idx = this.run.path.findIndex(p => p.id === id);
      if (idx < 0) return this.runDone ? 'skip' : '';
      if (idx > this.runIdx) return this.runDone ? '' : '';
      return this.run.path[idx].status === 'fail' ? 'fail' : 'ok';
    },
    get runDone() { return !!this.run && this.runIdx >= this.run.path.length - 1; },

    // ---- Replay ------------------------------------------------------------
    loadRun(id) {
      const run = DATA.runs.find(r => r.id === id) || DATA.runs.find(r => r.wf === this.wfId) || DATA.runs[0];
      if (!run) return;
      this.run = run; this.runIdx = run.path.length - 1;
      const w = DATA.workflows.find(x => x.id === run.wf);
      if (w && w.id !== this.wfId) { this.wfId = w.id; this.wf = w; this.wfName = w.name; this.nodes = JSON.parse(JSON.stringify(w.nodes)); this.edges = JSON.parse(JSON.stringify(w.edges)); }
      const fail = run.path.find(p => p.status === 'fail');
      this.sel = fail ? fail.id : run.path[0]?.id || null;
      this.stopPlay();
      this.$nextTick(() => {
        if (fail) { this.cam.k = 0.85; this.centerOn(fail.id); }
        else this.frameStart();
      });
    },
    frameStart() {
      const vp = this.$refs.viewport; if (!vp) return;
      const t = this.node('trigger') || this.nodes[0]; if (!t) return;
      const k = vp.clientWidth < 720 ? 0.8 : 0.95;
      this.cam = { k, x: 44 - t.x * k, y: Math.round(vp.clientHeight / 2 - (t.y + this.heightOf(t) / 2) * k) };
    },
    centerOn(id) {
      const vp = this.$refs.viewport; if (!vp) return;
      const n = this.node(id); if (!n) return;
      if (this.cam.k < 0.6) this.cam.k = 0.85;
      const k = this.cam.k;
      this.cam.x = vp.clientWidth / 2 - (n.x + W / 2) * k;
      this.cam.y = vp.clientHeight / 2 - (n.y + this.heightOf(n) / 2) * k;
    },
    selectRun(run) { this.loadRun(run.id); },
    get curRunStep() { return this.run?.path.find(p => p.id === this.sel) || null; },
    get runSteps() { return this.run?.path || []; },
    get runProgress() { return this.run ? this.runIdx : 0; },
    get curStepIndex() { return this.run ? this.run.path.findIndex(p => p.id === this.sel) : -1; },
    get curStepNo() { return Math.max(0, this.curStepIndex + 1); },
    get reachedCount() { return (this.run?.path || []).filter(p => p.status === 'ok').length; },
    isPending(id) {
      if (!this.run) return false;
      const idx = this.run.path.findIndex(p => p.id === id);
      return idx >= 0 && idx > this.runIdx;
    },
    stepNameOf(id) { return this.nameOf(this.node(id)); },
    runTitle(r) { const w = DATA.workflows.find(x => x.id === r?.wf); return w ? tx(w.name) : (r?.wf || ''); },
    runStepName(r, id) {
      const w = DATA.workflows.find(x => x.id === r?.wf);
      const n = w?.nodes.find(x => x.id === id);
      return n ? wfNodeName(n) : id;
    },
    runSummary(r) {
      const out = r?.path[0]?.outputs || {};
      const fail = r?.path.find(p => p.status === 'fail');
      if (fail) return t('runs.failedAt', { step: this.runStepName(r, fail.id) });
      const v = out.subject ?? out.title ?? out.name ?? out.from ?? Object.values(out).find(x => x != null);
      return v == null ? '' : String(v);
    },
    runStatusLabel(r) { return t(r?.status === 'ok' ? 'runs.filterOk' : 'runs.filterFailed'); },
    runStatusTone(r) { return r?.status === 'ok' ? 'ok' : 'bad'; },
    get runFilterLabel() {
      return t(this.runFilter === 'failed' ? 'runs.filterFailed' : this.runFilter === 'ok' ? 'runs.filterOk' : 'runs.filterAll');
    },
    get runEmptyTitle() {
      return this.runFilter === 'failed' ? t('runs.emptyFailed') : this.runFilter === 'ok' ? t('runs.emptyOk') : t('runs.emptyTitle');
    },
    get runEmptyBody() { return this.runFilter === 'all' ? t('runs.emptyBody') : t('runs.emptyFilterBody'); },
    get runGroupList() {
      const g = this.runGroups;
      return [
        { key: 'today', label: t('runs.today'), runs: g.today },
        { key: 'yesterday', label: t('runs.yesterday'), runs: g.yesterday },
        { key: 'earlier', label: t('runs.earlier'), runs: g.earlier }
      ].filter(x => x.runs.length);
    },
    applyRunFilter() {
      const first = this.runList[0];
      if (first && !this.runList.some(r => r.id === this.run?.id)) this.loadRun(first.id);
    },
    retryRun() {
      if (!this.run) return;
      toast(t('runs.retried'));
      announce(t('runs.retried'), true);
    },
    exportRun() {
      if (!this.run) return;
      toast(t('runs.exported'));
    },
    copyStep() {
      const s = this.curRunStep;
      if (!s) return;
      const payload = {
        step: this.nameOf(this.cur), id: s.id, ms: s.ms, status: s.status,
        decision: s.decision, inputs: s.inputs || {}, outputs: s.outputs || {},
        error: s.error ? t(s.error) : undefined
      };
      if (navigator.clipboard) navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      toast(t('runs.copiedStep'));
    },
    setProgress(v) {
      if (!this.run) return;
      this.runIdx = Number(v);
      const s = this.run.path[this.runIdx]; if (s) this.sel = s.id;
    },
    play() {
      if (!this.run || !this.run.path.length) return;
      if (this.playing) { this.stopPlay(); announce(t('runs.pause')); return; }
      if (this.runIdx >= this.run.path.length - 1) this.runIdx = -1;
      this.playing = true;
      const tick = () => {
        if (!this.playing) return;
        if (this.runIdx >= this.run.path.length - 1) { this.playing = false; return; }
        this.runIdx++;
        const s = this.run.path[this.runIdx]; if (s) this.sel = s.id;
        this.playTimer = setTimeout(tick, 760);
      };
      this.playTimer = setTimeout(tick, 120);
      announce(t('runs.play'));
    },
    stopPlay() { this.playing = false; if (this.playTimer) clearTimeout(this.playTimer); },
    stepMs(id) { return this.run?.path.find(p => p.id === id)?.ms || 0; },
    totalMs() { return (this.run?.path || []).reduce((a, s) => a + s.ms, 0); },
    get runDuration() { return this.run ? (this.run.duration / 1000).toFixed(1) + ' s' : ''; },
    get failedStep() { return this.run?.path.find(p => p.status === 'fail') || null; },
    get failedNode() { return this.failedStep ? this.node(this.failedStep.id) : null; },
    get errorServiceId() { return this.failedNode?.svc; },
    get branchExplain() {
      const c = this.nodes.find(n => this.isCond(n)); if (!c) return '';
      const cs = this.run?.path.find(p => p.id === c.id); if (!cs?.decision) return '';
      const inputs = cs.inputs || {};
      return t('runs.conditionWhy', { left: inputs.left ?? '…', operator: t('builder.op.' + (inputs.op || c.values.op)), right: inputs.right ?? '…', branch: cs.decision === 'yes' ? t('runs.branchYes') : t('runs.branchNo') });
    },
    get curInputs() {
      if (!this.curRunStep) return [];
      const s = this.curRunStep;
      if (this.isTrigger(this.cur)) return Object.entries(s.outputs || {}).map(([k, v]) => [k, v]);
      if (this.isCond(this.cur)) {
        const i = s.inputs || {};
        return [['left', i.left], ['op', t('builder.op.' + (i.op || 'gt'))], ['right', i.right]].filter(x => x[1] != null);
      }
      return Object.entries(s.inputs || {});
    },
    get curOutputs() {
      const s = this.curRunStep; if (!s) return [];
      if (this.isCond(this.cur)) return [];
      return Object.entries(s.outputs || {});
    },
    togglePlay() { this.playing ? this.stopPlay() : this.play(); },
    get groupedRuns() {
      const groups = { today: [], yesterday: [], earlier: [] };
      const todayK = dayKey(DATA.now), yK = dayKey(new Date(new Date(DATA.now).getTime() - 864e5).toISOString());
      DATA.runs.forEach(r => {
        const k = dayKey(r.at);
        if (k === todayK) groups.today.push(r); else if (k === yK) groups.yesterday.push(r); else groups.earlier.push(r);
      });
      return groups;
    },
    get runList() {
      return DATA.runs.filter(r => (!this.runWf || r.wf === this.runWf) && (this.runFilter === 'all' || (this.runFilter === 'failed' ? r.status === 'failed' : r.status === 'ok')));
    },
    get runGroups() {
      const out = { today: [], yesterday: [], earlier: [] };
      const todayK = dayKey(DATA.now), yK = dayKey(new Date(new Date(DATA.now).getTime() - 864e5).toISOString());
      this.runList.forEach(r => {
        const k = dayKey(r.at);
        if (k === todayK) out.today.push(r); else if (k === yK) out.yesterday.push(r); else out.earlier.push(r);
      });
      return out;
    },
    runTone(r) { return r.status === 'ok' ? 'ok' : 'bad'; },
    roTest() { return !!this.run; },
    hasRunFor(id) { return !!this.run?.path.some(p => p.id === id); }
  };
}

