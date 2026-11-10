/* Moteur de présentation : scène 1600 × 900, étapes, HUD, chronomètre, notes, impression.
   Aucune dépendance, aucun appel réseau. */
var Deck = (function () {
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const STAGE_W = 1600;
  const STAGE_H = 900;
  const GRID = 'rgba(16,32,47,.14)';
  const INK = '#10202F';
  const EMERALD = '#0A7D68';
  const LEVELS = [
    { max: 25, n: 'Critique', c: '#D24A2E' },
    { max: 50, n: 'Faible', c: '#D9822B' },
    { max: 75, n: 'Moyen', c: '#8A8A1F' },
    { max: Infinity, n: 'Avancé', c: EMERALD },
  ];
  const DEFAULT_MINUTES = 10;
  const WARN_RATIO = 0.9;

  const query = new URLSearchParams(location.search);
  const PRINT = query.has('print');
  const FORCE_MOTION = query.has('motion');
  const REDUCED = !FORCE_MOTION && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const INSTANT = PRINT || REDUCED;
  const MINUTES = Math.max(1, parseFloat(query.get('min')) || DEFAULT_MINUTES);

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  function el(tag, attrs, parent) {
    const node = document.createElementNS(SVG_NS, tag);
    Object.keys(attrs || {}).forEach((k) => {
      if (k === 'text') node.textContent = attrs[k];
      else node.setAttribute(k, attrs[k]);
    });
    if (parent) parent.appendChild(node);
    return node;
  }
  function pt(cx, cy, r, i) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a), cos: Math.cos(a), sin: Math.sin(a) };
  }
  const pstr = (pts) => pts.map((p) => p.x.toFixed(1) + ',' + p.y.toFixed(1)).join(' ');
  const level = (v) => LEVELS.find((l) => v < l.max);
  const ease = (t) => 1 - Math.pow(1 - t, 3);
  const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
  const pad = (n) => (n < 10 ? '0' : '') + n;
  const fmt = (s) => pad(Math.floor(s / 60)) + ':' + pad(Math.floor(s % 60));
  const fr = (n, d) => n.toFixed(d === undefined ? 1 : d).replace('.', ',');

  function logoMark(svg, stroke, fill, sw) {
    const ratios = [0.55, 0.85, 0.4, 0.7, 0.5];
    const outer = ratios.map((_, i) => pt(50, 52, 42, i));
    const inner = ratios.map((r, i) => pt(50, 52, 42 * r, i));
    el('polygon', { points: pstr(outer), fill: 'none', stroke, 'stroke-width': sw || 5, 'stroke-linejoin': 'round' }, svg);
    el('polygon', { points: pstr(inner), fill, 'fill-opacity': 0.85 }, svg);
  }

  function tween(dur, delay, onFrame, onDone) {
    if (INSTANT) { onFrame(1); if (onDone) onDone(); return () => {}; }
    let raf = 0;
    let start = 0;
    let cancelled = false;
    const frame = (now) => {
      if (cancelled) return;
      if (!start) start = now + (delay || 0);
      const t = Math.min(1, Math.max(0, (now - start) / dur));
      onFrame(ease(t));
      if (t < 1) raf = requestAnimationFrame(frame);
      else if (onDone) onDone();
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelled = true; cancelAnimationFrame(raf); };
  }

  function countTo(node, to, dur, from) {
    const a = from || 0;
    return tween(dur || 1200, 0, (k) => { node.textContent = String(Math.round(a + (to - a) * k)); });
  }

  /* Radar gradué : anneaux, axes, graduations tous les 10 points, libellés et valeurs. */
  function Radar(svg, o) {
    const g = el('g', {}, svg);
    [0.25, 0.5, 0.75, 1].forEach((k) => {
      el('polygon', { points: pstr([0, 1, 2, 3, 4].map((i) => pt(o.cx, o.cy, o.R * k, i))), fill: 'none', stroke: GRID, 'stroke-width': k === 1 ? 1.4 : 1 }, g);
      if (o.scale !== false) {
        el('text', { x: o.cx + 6, y: o.cy - o.R * k + 4, 'font-family': 'IBM Plex Mono', 'font-size': o.sfs || 10, fill: 'rgba(16,32,47,.42)', text: String(k * 100) }, g);
      }
    });
    for (let i = 0; i < 5; i++) {
      const end = pt(o.cx, o.cy, o.R, i);
      el('line', { x1: o.cx, y1: o.cy, x2: end.x, y2: end.y, stroke: GRID }, g);
      for (let t = 1; t <= 10; t++) {
        const p = pt(o.cx, o.cy, (o.R * t) / 10, i);
        const half = t % 5 === 0 ? 4.5 : 2.5;
        el('line', { x1: p.x - p.sin * half, y1: p.y + p.cos * half, x2: p.x + p.sin * half, y2: p.y - p.cos * half, stroke: 'rgba(16,32,47,.34)', 'stroke-width': 1 }, g);
      }
    }
    const poly = el('polygon', { fill: o.color, 'fill-opacity': 0.16, stroke: o.color, 'stroke-width': 2.5, 'stroke-linejoin': 'round' }, svg);
    const halo = el('circle', { r: 10, fill: '#D24A2E', class: 'halo', visibility: 'hidden' }, svg);
    const dots = [0, 1, 2, 3, 4].map(() => el('circle', { r: 5, fill: o.color }, svg));
    const values = (o.labels || []).map((label, j) => {
      const p = pt(o.cx, o.cy, o.R + o.lab, j);
      const lines = label.split('|');
      const anchor = p.cos > 0.3 ? 'start' : p.cos < -0.3 ? 'end' : 'middle';
      const y = p.y - (lines.length - 1) * 9 + (j === 0 ? -6 : 0) + (j >= 2 && j <= 3 ? 10 : 0);
      const text = el('text', { x: p.x, y, 'text-anchor': anchor, 'font-family': 'Inter', 'font-size': o.fs, fill: INK }, svg);
      lines.forEach((line, k) => el('tspan', { x: p.x, dy: k === 0 ? 0 : o.fs + 3, text: line }, text));
      return el('tspan', { x: p.x, dy: o.fs + 8, 'font-family': 'IBM Plex Mono', 'font-weight': 600, 'font-size': o.fs + 1 }, text);
    });
    let current = [0, 0, 0, 0, 0];
    let stop = () => {};

    function set(v, colour) {
      current = v.slice();
      const pts = v.map((x, i) => pt(o.cx, o.cy, (o.R * Math.max(0, x)) / 100, i));
      poly.setAttribute('points', pstr(pts));
      if (colour) { poly.setAttribute('fill', colour); poly.setAttribute('stroke', colour); }
      const min = Math.min.apply(null, v);
      const weakest = v.indexOf(min);
      pts.forEach((p, i) => {
        dots[i].setAttribute('cx', p.x); dots[i].setAttribute('cy', p.y);
        if (colour) dots[i].setAttribute('fill', colour);
        if (values[i]) { values[i].textContent = Math.round(v[i]) + ' %'; values[i].setAttribute('fill', level(v[i]).c); }
      });
      const showHalo = o.halo !== false && min > 0 && !PRINT;
      halo.setAttribute('visibility', showHalo ? 'visible' : 'hidden');
      halo.setAttribute('cx', pts[weakest].x); halo.setAttribute('cy', pts[weakest].y);
      return weakest;
    }
    function animate(target, dur, delay, colour) {
      stop();
      const from = current.slice();
      stop = tween(dur || 900, delay || 0, (k) => set(target.map((t, i) => from[i] + (t - from[i]) * k), colour));
    }
    set(current);
    return { set, animate, reset: () => { stop(); set([0, 0, 0, 0, 0]); } };
  }

  /* ---------------- navigation ---------------- */
  const state = { cur: -1, step: 0, t0: 0, tSlide: 0, returnTo: -1 };
  let slides = [];
  let cfg = { chapters: [], notes: [], hooks: {} };
  const hook = (i, name, arg) => {
    const h = cfg.hooks[slides[i] && slides[i].id];
    return h && h[name] ? h[name](slides[i], arg) : undefined;
  };
  const maxStep = (i) => parseInt(slides[i].dataset.steps || '0', 10);
  const budgetOf = (i) => (parseFloat(slides[i].dataset.budget || '0') * MINUTES) / DEFAULT_MINUTES;

  function applyStep() {
    const s = slides[state.cur];
    [1, 2, 3].forEach((n) => s.classList.toggle('s' + n, state.step >= n));
    const max = maxStep(state.cur);
    $('#stepDots').innerHTML = Array.from({ length: max }, (_, k) => '<i class="sd' + (k < state.step ? ' on' : '') + '"></i>').join('');
    hook(state.cur, 'step', state.step);
  }

  function updateHud(ch) {
    const box = $('#hudCh');
    box.style.opacity = ch < 0 ? 0 : 1;
    if (ch < 0) return;
    const svg = $('#chPent');
    svg.textContent = '';
    const pts = [0, 1, 2, 3, 4].map((i) => pt(28, 30, 21, i));
    pts.forEach((p, i) => {
      const q = pts[(i + 1) % 5];
      const on = i + 1 <= ch || (i === 4 && ch === 4);
      el('line', { x1: p.x, y1: p.y, x2: q.x, y2: q.y, stroke: on ? EMERALD : GRID, 'stroke-width': on ? 1.6 : 1 }, svg);
    });
    pts.forEach((p, i) => el('circle', { cx: p.x, cy: p.y, r: i === ch ? 5.5 : 3.2, fill: i <= ch ? EMERALD : '#FAF8F2', stroke: i <= ch ? EMERALD : 'rgba(16,32,47,.4)' }, svg));
    $('#chLabel').textContent = pad(ch + 1) + ' · ' + cfg.chapters[ch];
  }

  function updateNotes() {
    const i = state.cur;
    $('#notesHead').textContent = 'Notes · diapositive ' + (i + 1) + ' / ' + slides.length + ' · objectif ' + Math.round(budgetOf(i)) + ' s';
    const body = $('#notesBody');
    body.textContent = '';
    String(cfg.notes[i] || '').split('\n').forEach((line, k) => {
      if (k) body.appendChild(document.createElement('br'));
      body.appendChild(document.createTextNode(line));
    });
  }

  function goTo(i, st) {
    const target = Math.max(0, Math.min(slides.length - 1, i));
    if (target !== state.cur) {
      if (state.cur >= 0) { hook(state.cur, 'leave'); slides[state.cur].classList.remove('active', 's1', 's2', 's3'); }
      if (state.cur === 0 && !state.t0) state.t0 = Date.now();
      state.cur = target;
      state.tSlide = Date.now();
      slides[target].classList.add('active');
      $$('.count', slides[target]).forEach((n) => countTo(n, parseFloat(n.dataset.to), 1300));
      hook(target, 'enter');
      $('#cnt').textContent = pad(target + 1) + ' / ' + pad(slides.length);
      $('#progFill').style.transform = 'scaleX(' + target / (slides.length - 1) + ')';
      updateHud(parseInt(slides[target].dataset.chapter, 10));
      updateNotes();
      try { history.replaceState(null, '', '#' + (target + 1)); } catch (e) { /* file:// sans historique : sans effet */ }
    }
    state.step = Math.max(0, Math.min(maxStep(target), st || 0));
    applyStep();
  }
  const next = () => (state.step < maxStep(state.cur) ? goTo(state.cur, state.step + 1) : goTo(state.cur + 1, 0));
  const prev = () => (state.step > 0 ? goTo(state.cur, state.step - 1) : state.cur > 0 ? goTo(state.cur - 1, maxStep(state.cur - 1)) : undefined);

  function tick() {
    const box = $('#timer');
    if (!box.classList.contains('on')) return;
    const total = state.t0 ? (Date.now() - state.t0) / 1000 : 0;
    const limit = MINUTES * 60;
    const budget = budgetOf(state.cur);
    $('#tTotal').textContent = fmt(total) + ' / ' + fmt(limit);
    $('#tSlide').textContent = budget ? 'diapo ' + fmt((Date.now() - state.tSlide) / 1000) + ' / ' + fmt(budget) : '';
    box.classList.toggle('warn', total >= limit * WARN_RATIO && total < limit);
    box.classList.toggle('over', total >= limit);
  }

  function fit() {
    const s = Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H);
    $('#stage').style.setProperty('--s', s);
  }
  const overlayOpen = () => $('#help').classList.contains('on');
  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
  }
  function jumpTo(id) {
    const idx = slides.findIndex((s) => s.id === id);
    if (idx < 0) return;
    if (state.cur === idx && state.returnTo >= 0) { const back = state.returnTo; state.returnTo = -1; goTo(back, 0); return; }
    state.returnTo = state.cur;
    goTo(idx, 0);
  }

  function onKey(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key;
    if (k === 'Escape') { $('#help').classList.remove('on'); $('#notes').classList.remove('on'); return; }
    if (hook(state.cur, 'key', e) === true) { e.preventDefault(); return; }
    const lower = k.length === 1 ? k.toLowerCase() : k;
    const actions = {
      ArrowRight: next, PageDown: next, ' ': next, Enter: next,
      ArrowLeft: prev, PageUp: prev, Backspace: prev,
      Home: () => goTo(0, 0), End: () => goTo(slides.length - 1, 0),
      t: () => { $('#timer').classList.toggle('on'); tick(); },
      n: () => $('#notes').classList.toggle('on'),
      h: () => $('#help').classList.toggle('on'), '?': () => $('#help').classList.toggle('on'),
      r: () => { state.t0 = state.cur > 0 ? Date.now() : 0; state.tSlide = Date.now(); tick(); },
      f: toggleFullscreen,
      d: () => jumpTo(cfg.demoSlide),
    };
    if (actions[lower]) { e.preventDefault(); actions[lower](); }
  }

  function init(options) {
    cfg = Object.assign({ chapters: [], notes: [], hooks: {}, demoSlide: '' }, options);
    slides = $$('.slide');
    if (FORCE_MOTION) document.documentElement.classList.add('motion');
    Object.keys(cfg.hooks).forEach((id) => { const s = document.getElementById(id); if (s && cfg.hooks[id].build) cfg.hooks[id].build(s); });
    if (PRINT) {
      document.documentElement.classList.add('print');
      document.body.classList.add('print');
      slides.forEach((s, i) => {
        s.classList.add('active', 's1', 's2', 's3');
        $$('.count', s).forEach((n) => { n.textContent = n.dataset.to; });
        hook(i, 'enter');
        hook(i, 'step', maxStep(i));
      });
      return;
    }
    fit();
    window.addEventListener('resize', fit);
    document.addEventListener('keydown', onKey);
    $('#stage').addEventListener('click', (e) => {
      if (overlayOpen()) { $('#help').classList.remove('on'); return; }
      if (e.target.closest('[data-ui]')) return;
      next();
    });
    setInterval(tick, 250);
    const fromHash = parseInt(location.hash.slice(1), 10);
    goTo(fromHash >= 1 && fromHash <= slides.length ? fromHash - 1 : 0, 0);
    if (state.cur > 0) state.t0 = Date.now();
  }

  return {
    init, goTo, next, prev, state, PRINT, INSTANT,
    $, $$, el, pt, pstr, level, mean, pad, fmt, fr, logoMark, tween, countTo, Radar,
    colors: { INK, EMERALD, GRID },
  };
})();
