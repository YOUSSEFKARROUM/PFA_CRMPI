/* Contenu et comportements propres à chaque diapositive. */
(function (D) {
  'use strict';
  const { $, $$, el, pt, pstr, level, mean, fr } = D;
  const INK = D.colors.INK;
  const EMERALD = D.colors.EMERALD;

  const CHAPTERS = ['Contexte', 'Méthode', 'Réalisation', 'Produit', 'Conclusion'];
  const DOMAINS = ['Gouvernance', 'Accès &|Identités', 'Infrastructure|& Réseau', 'Incidents &|Continuité', 'Sensibilisation|& Formation'];
  const DOM_ROWS = ['Gouvernance', 'Accès & Identités', 'Infrastructure & Réseau', 'Incidents & Continuité', 'Sensibilisation & Formation'];
  const DOM_SHORT = ['GOUV.', 'ACCÈS', 'INFRA.', 'INCID.', 'SENSIB.'];
  const SEV_COLOR = { Critique: '#D24A2E', Haute: '#D9822B', Moyenne: '#8A8A1F', Basse: '#0A7D68' };
  const PROFILE_KEYS = ['finance', 'commerce', 'techno'];
  const PROFILES = {
    finance: { org: 'PME Finance', scores: [50, 55, 35, 50, 30], recs: [
      ['Haute', 'Dispenser une formation cybersécurité annuelle à tous les employés', 'Sensibilisation & Formation'],
      ['Haute', 'Tester la vigilance via des simulations de phishing', 'Sensibilisation & Formation'],
      ['Haute', 'Intégrer un module cybersécurité à l\'onboarding', 'Sensibilisation & Formation']] },
    commerce: { org: 'PME Commerce', scores: [25, 20, 20, 15, 20], recs: [
      ['Critique', 'Créer un plan de réponse aux incidents documenté', 'Incidents & Continuité'],
      ['Critique', 'Tester les sauvegardes trimestriellement', 'Incidents & Continuité'],
      ['Haute', 'Élaborer un plan de continuité métier (BCP/DRP)', 'Incidents & Continuité']] },
    techno: { org: 'PME Technologie', scores: [80, 90, 95, 80, 70], recs: [
      ['Moyenne', 'Documenter et faire signer la politique d\'utilisation acceptable', 'Sensibilisation & Formation'],
      ['Moyenne', 'Sensibiliser aux risques d\'ingénierie sociale', 'Sensibilisation & Formation'],
      ['Moyenne', 'Documenter une politique de télétravail sécurisé', 'Sensibilisation & Formation']] },
  };
  const FILM_CHAPTERS = [[0, 'Accueil'], [11, 'Les 5 domaines'], [24, 'Préparation'], [35, 'Questionnaire'], [52, 'Résultat'], [58, 'Rejouer · cohérence'], [72, 'Priorités'], [78, 'Rapport PDF · QR'], [94, 'Badge'], [101, 'Historique']];
  const INCIDENTS = { total: 879, direct: 109, cols: 40, pitch: 14.5, seed: 879 };
  const COVER_PERIOD_MS = 3200;

  const NOTES = JSON.parse(document.getElementById('notesData').textContent);

  function mulberry32(seed) {
    let a = seed;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function html(tag, cls, text, parent) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    if (parent) parent.appendChild(node);
    return node;
  }

  /* ---------- 0 : couverture ---------- */
  const cover = { radar: null, timer: 0, idx: 0, score: 0 };
  function coverShow(key, animate) {
    const p = PROFILES[key];
    const global = Math.round(mean(p.scores));
    const lv = level(global);
    if (animate) cover.radar.animate(p.scores, 1100, 0, lv.c); else cover.radar.set(p.scores, lv.c);
    $('#coverOrg').textContent = 'Profil de test · ' + p.org;
    if (animate) D.countTo($('#coverScore'), global, 900, cover.score); else $('#coverScore').textContent = global;
    cover.score = global;
    const node = $('#coverLevel');
    node.textContent = lv.n;
    node.style.color = lv.c;
  }
  const coverHook = {
    build() {
      const svg = $('#coverPent');
      const c = { cx: 270, cy: 290, R: 205 };
      cover.radar = D.Radar(svg, { cx: c.cx, cy: c.cy, R: c.R, labels: [], halo: false, scale: false, color: '#D9822B' });
      const outer = [0, 1, 2, 3, 4].map((i) => pt(c.cx, c.cy, c.R, i));
      el('polygon', { points: pstr(outer), fill: 'none', stroke: INK, 'stroke-width': 2, 'stroke-linejoin': 'round', pathLength: 1, class: 'draw' }, svg);
      outer.forEach((p, i) => {
        const g = el('g', { class: 'cv', style: '--i:' + i }, svg);
        el('circle', { cx: p.x, cy: p.y, r: 4.5, fill: '#FAF8F2', stroke: INK, 'stroke-width': 1.5 }, g);
        const q = pt(c.cx, c.cy, c.R + 24, i);
        const anchor = q.cos > 0.3 ? 'start' : q.cos < -0.3 ? 'end' : 'middle';
        el('text', { x: q.x, y: q.y + (i === 0 ? 0 : 5) + (i === 2 || i === 3 ? 8 : 0), 'text-anchor': anchor, 'font-family': 'IBM Plex Mono', 'font-size': 13, 'font-weight': 500, 'letter-spacing': '.1em', fill: 'rgba(16,32,47,.55)', text: DOM_SHORT[i] }, g);
      });
    },
    enter() {
      cover.idx = 0;
      coverShow('finance', false);
      if (D.INSTANT) return;
      cover.timer = setInterval(() => {
        cover.idx = (cover.idx + 1) % PROFILE_KEYS.length;
        coverShow(PROFILE_KEYS[cover.idx], true);
      }, COVER_PERIOD_MS);
    },
    leave() { clearInterval(cover.timer); },
  };

  /* ---------- 1 : constat ---------- */
  const constatHook = {
    build() {
      const svg = $('#dotMatrix');
      const { total, direct, cols, pitch, seed } = INCIDENTS;
      const rand = mulberry32(seed);
      const order = Array.from({ length: total }, (_, i) => i);
      for (let i = total - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); const t = order[i]; order[i] = order[j]; order[j] = t; }
      const rank = new Map(order.slice(0, direct).map((idx, k) => [idx, k]));
      for (let i = 0; i < total; i++) {
        const row = Math.floor(i / cols);
        const x = (i % cols) * pitch + 5;
        const y = row * pitch + 5;
        el('circle', { cx: x, cy: y, r: 4.6, fill: '#cfc9b8', class: 'mdot', style: '--r:' + row }, svg);
        if (rank.has(i)) el('circle', { cx: x, cy: y, r: 4.6, fill: '#D24A2E', class: 'mdot hi', style: '--k:' + rank.get(i) }, svg);
      }
    },
  };

  /* ---------- 4 : méthode ---------- */
  const methodeHook = {
    build() {
      const svg = $('#domPent');
      const c = { cx: 400, cy: 300, R: 175 };
      [0.25, 0.5, 0.75].forEach((k) => el('polygon', { points: pstr([0, 1, 2, 3, 4].map((i) => pt(c.cx, c.cy, c.R * k, i))), fill: 'none', stroke: D.colors.GRID }, svg));
      const outer = [0, 1, 2, 3, 4].map((i) => pt(c.cx, c.cy, c.R, i));
      outer.forEach((p) => el('line', { x1: c.cx, y1: c.cy, x2: p.x, y2: p.y, stroke: D.colors.GRID }, svg));
      el('polygon', { points: pstr(outer), fill: 'none', stroke: INK, 'stroke-width': 2.5, 'stroke-linejoin': 'round', pathLength: 1, class: 'draw' }, svg);
      const inner = [0.55, 0.85, 0.4, 0.7, 0.5].map((r, i) => pt(c.cx, c.cy, c.R * r, i));
      el('polygon', { points: pstr(inner), fill: EMERALD, 'fill-opacity': 0.2, stroke: EMERALD, 'stroke-width': 2.5, 'stroke-linejoin': 'round', class: 'inner-shape' }, svg);
      outer.forEach((p, i) => {
        el('circle', { cx: p.x, cy: p.y, r: 9, fill: EMERALD, class: 'pv', style: '--i:' + i }, svg);
        const q = pt(c.cx, c.cy, c.R + 34, i);
        const lines = DOMAINS[i].split('|');
        const anchor = q.cos > 0.3 ? 'start' : q.cos < -0.3 ? 'end' : 'middle';
        const block = (lines.length - 1) * 30 + 20;
        const y0 = i === 0 ? q.y - 6 - block : i === 2 || i === 3 ? q.y + 26 : q.y - block / 2 + 10;
        const g = el('g', { class: 'pl', style: '--i:' + i }, svg);
        const text = el('text', { x: q.x, y: y0, 'text-anchor': anchor, 'font-family': 'Fraunces', 'font-weight': 500, 'font-size': 26, fill: INK }, g);
        lines.forEach((line, k) => el('tspan', { x: q.x, dy: k === 0 ? 0 : 30, text: line }, text));
      });
      D.logoMark($('#nmLogo'), INK, EMERALD);
    },
  };

  /* ---------- 5 : moteur de score ---------- */
  const engine = { radar: null, key: 'finance', score: 0, swap: 0 };
  function renderRecs(p) {
    const list = $('#pRecs');
    list.textContent = '';
    p.recs.forEach((r, i) => {
      const card = html('div', 'pr', undefined, list);
      html('div', 'no', '0' + (i + 1), card).style.color = SEV_COLOR[r[0]];
      const body = html('div', '', undefined, card);
      html('div', 'sv', r[0], body).style.color = SEV_COLOR[r[0]];
      html('div', 'tt', r[1], body);
      html('div', 'dm', r[2], body);
    });
  }
  function showProfile(key, animate, fromZero) {
    const p = PROFILES[key];
    if (!p) return;
    engine.key = key;
    const exact = mean(p.scores);
    const global = Math.round(exact);
    const lv = level(global);
    $$('.pbtn').forEach((b) => b.classList.toggle('on', b.dataset.p === key));
    $('#pOrg').textContent = 'Profil de test · ' + p.org;
    const scoreNode = $('#pScore');
    scoreNode.style.color = lv.c;
    if (animate) D.countTo(scoreNode, global, 900, fromZero ? 0 : engine.score); else scoreNode.textContent = global;
    engine.score = global;
    if (fromZero) engine.radar.reset();
    if (animate) engine.radar.animate(p.scores, 900, fromZero ? 350 : 0, lv.c); else engine.radar.set(p.scores, lv.c);
    const seal = $('#pLevel');
    const list = $('#pRecs');
    const commit = () => { seal.textContent = lv.n; seal.style.color = lv.c; renderRecs(p); seal.classList.remove('swap'); list.classList.remove('swap'); };
    clearTimeout(engine.swap);
    if (!animate || D.INSTANT) { commit(); return; }
    seal.classList.add('swap');
    list.classList.add('swap');
    engine.swap = setTimeout(commit, 250);
  }
  const moteurHook = {
    build() {
      engine.radar = D.Radar($('#profRadar'), { cx: 262, cy: 205, R: 130, lab: 30, fs: 15, color: EMERALD,
        labels: ['Gouvernance', 'Accès &|Identités', 'Infra.|& Réseau', 'Incidents|& Continuité', 'Sensibilisation'] });
      $$('.pbtn').forEach((b) => {
        b.addEventListener('mousedown', (e) => e.preventDefault());
        b.addEventListener('click', () => showProfile(b.dataset.p, true));
      });
    },
    enter() { showProfile(D.PRINT ? 'finance' : engine.key, !D.INSTANT, true); },
    key(slide, e) {
      const idx = ['1', '2', '3'].indexOf(e.key);
      if (idx < 0) return false;
      showProfile(PROFILE_KEYS[idx], true);
      return true;
    },
  };

  /* ---------- 9 : le film ---------- */
  const film = { video: null, box: null, items: [] };
  function filmSync() {
    const v = film.video;
    const t = v.currentTime || 0;
    $('#filmTime').textContent = D.fmt(t);
    $('#filmBar').style.transform = 'scaleX(' + (v.duration ? t / v.duration : 0) + ')';
    let current = 0;
    FILM_CHAPTERS.forEach((c, i) => { if (t >= c[0] - 0.05) current = i; });
    film.items.forEach((li, i) => { li.classList.toggle('on', i === current); li.classList.toggle('done', i < current); });
  }
  function filmPlay() { film.box.classList.add('playing'); const p = film.video.play(); if (p && p.catch) p.catch(() => film.box.classList.remove('playing')); }
  function filmToggle() { if (film.video.paused) filmPlay(); else film.video.pause(); }
  function filmSource() {
    const raw = atob($('#filmData').textContent.trim());
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    return URL.createObjectURL(new Blob([bytes], { type: 'video/mp4' }));
  }
  const filmHook = {
    build() {
      film.video = $('#film');
      film.box = $('#filmBox');
      const list = $('#filmChapters');
      film.items = FILM_CHAPTERS.map((c) => {
        const li = html('li', '', undefined, list);
        html('span', '', D.fmt(c[0]), li);
        li.appendChild(document.createTextNode(c[1]));
        li.addEventListener('click', () => { film.video.currentTime = c[0]; filmPlay(); });
        return li;
      });
      if (D.PRINT) return;
      film.video.src = filmSource();
      film.video.addEventListener('timeupdate', filmSync);
      film.video.addEventListener('seeked', filmSync);
      film.box.addEventListener('click', filmToggle);
    },
    enter() {
      if (D.PRINT) return;
      film.video.pause();
      film.video.currentTime = 0;
      film.box.classList.remove('playing');
      filmSync();
    },
    step(slide, st) { if (!D.PRINT && st >= 1) filmPlay(); },
    leave() { if (film.video) film.video.pause(); },
    key(slide, e) {
      if (e.key.toLowerCase() !== 'p') return false;
      filmToggle();
      return true;
    },
  };

  /* ---------- 1 : sommaire ---------- */
  const sommaireHook = {
    build() {
      const svg = $('#tocPent');
      const pts = [0, 1, 2, 3, 4].map((i) => pt(200, 210, 150, i));
      el('polygon', { points: pstr(pts), fill: 'none', stroke: INK, 'stroke-width': 2, 'stroke-linejoin': 'round', pathLength: 1, class: 'draw' }, svg);
      pts.forEach((p, i) => {
        const g = el('g', { class: 'cv', style: '--i:' + i }, svg);
        el('circle', { cx: p.x, cy: p.y, r: 24, fill: '#FAF8F2', stroke: EMERALD, 'stroke-width': 2 }, g);
        el('text', { x: p.x, y: p.y + 6, 'text-anchor': 'middle', 'font-family': 'IBM Plex Mono', 'font-weight': 600, 'font-size': 17, fill: EMERALD, text: '0' + (i + 1) }, g);
      });
    },
  };

  D.init({
    chapters: CHAPTERS,
    notes: NOTES,
    demoSlide: 's-film',
    hooks: {
      's-cover': coverHook, 's-constat': constatHook, 's-methode': methodeHook, 's-moteur': moteurHook,
      's-film': filmHook, 's-sommaire': sommaireHook,
    },
  });
  window.__deck = { goTo: D.goTo, next: D.next, prev: D.prev, showProfile, state: D.state };
})(Deck);
