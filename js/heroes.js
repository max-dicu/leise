'use strict';
// Helden-Skins (nur mit Geheimcode): Der grüne Koloss, Der Netzläufer, Thor, Loki und das Walross.
// Eigene Entwürfe (Thor und Loki nach der nordischen Sage). Jeder Held hat eigene Werte (Leben, Tempo, Sprung),
// eigene Fähigkeiten in der Schnellleiste und eigene Animationen.
(function () {
  const L = window.L, T = THREE, P = L.player, I = L.ITEMS;
  const V = () => new T.Vector3();
  // ---------- Codes (gespeichert wird nur ein Hash) ----------
  const HK = { koloss: '1qyy18hg9g4', netz: '1btageg4jep', thor: '5l1a2rgjhh', loki: 'ny67xmzrrt', walross: 'u50gz5uakp' };
  const NAMES = { koloss: '💚 Der grüne Koloss', netz: '🕸️ Der Netzläufer', thor: '⚡ Thor', loki: '🐍 Loki', walross: '🦭 Walross' };
  const keyOf = (sp) => (typeof sp === 'string' && sp.startsWith('h_') ? sp.slice(2) : null);
  L.heroToken = (id) => { const k = L.save && L.save.heroKeys && L.save.heroKeys[id]; return k && L.hash53(L.hash53(k)) === HK[id] ? L.hash53(k) : null; };
  L.heroCheck = (code) => { for (const id in HK) if (L.hash53(L.hash53(code)) === HK[id]) return id; return null; };
  L.heroUnlock = (id, code) => { L.save.heroKeys = L.save.heroKeys || {}; L.save.heroKeys[id] = code; L.persist(); };
  for (const id in NAMES) L.SKINS.push(['h_' + id, NAMES[id]]);
  const heroOk = (app, id) => !!(app && typeof app.hk === 'string' && L.hash53(app.hk) === HK[id]);
  L.heroId = () => { const id = P.rig && P.rig.app && keyOf(P.rig.app.special); return id && L.heroToken(id) ? id : null; };

  // ---------- Werte ----------
  const STATS = {
    koloss: { dmg: 0.3, spd: 1.45, jump: 2.4, noFall: true, regen: 3, items: ['kolossfaust', 'donnerklatscher', 'erdbebensprung'] },
    netz: { dmg: 0.75, spd: 1.35, jump: 2.1, noFall: true, regen: 0.5, items: ['netzschuss', 'netzschwinger', 'netzbombe'] },
    thor: { dmg: 0.45, spd: 1.15, jump: 1.5, noFall: true, regen: 1, fly: true, items: ['thorhammer', 'gewitter'] },
    loki: { dmg: 0.8, spd: 1.2, jump: 1.3, noFall: false, regen: 0.5, items: ['lokidolch', 'lokizepter', 'illusion', 'tarnung'] },
    walross: { dmg: 0.55, spd: 0.85, jump: 0.9, noFall: false, regen: 1, swim: 3.5, items: ['stosszahn', 'bauchplatscher', 'walrossbruell'] }
  };
  const st = () => { const id = L.heroId(); return id ? STATS[id] : null; };
  L.heroDmgMul = () => { const s = st(); return s ? s.dmg : 1; };
  L.heroSpeed = () => { const s = st(); return s ? s.spd : 1; };
  L.heroSwim = () => { const s = st(); return s && s.swim ? s.swim : 1; };
  L.heroJump = () => { const s = st(); return s ? s.jump : 1; };
  L.heroNoFall = () => { const s = st(); return !!(s && s.noFall); };
  L.heroFly = () => { const s = st(); return !!(s && s.fly); };
  L.heroInvis = () => H.invisT > 0;

  // ---------- Fähigkeiten als Gegenstände ----------
  const A = (name, icon, rate, extra) => Object.assign({ name, slot: 'waffe', icon, dmg: 0, rate, noise: 30, range: 120, ammo: null, mag: 1, spread: 0, energy: true, hero: true }, extra || {});
  Object.assign(I, {
    kolossfaust: A('Koloss-Faust', '👊', 0.6, { noise: 50 }),
    donnerklatscher: A('Donnerklatscher', '👏', 3, { noise: 120 }),
    erdbebensprung: A('Erdbeben-Sprung', '💥', 4, { noise: 120 }),
    netzschuss: A('Netzschuss', '🕸️', 0.35),
    netzschwinger: A('Netzschwinger', '🧗', 0.9),
    netzbombe: A('Netzbombe', '🕷️', 2.5),
    gewitter: A('Gewitter', '🌩️', 5, { noise: 140 }),
    lokizepter: A('Zepter', '🔱', 0.5, { noise: 40 }),
    illusion: A('Illusionen', '👥', 12),
    tarnung: A('Tarnung', '🫥', 25, { noise: 0 }),
    stosszahn: A('Stoßzahn-Angriff', '🦷', 1.5, { noise: 60 }),
    bauchplatscher: A('Bauchplatscher', '🌊', 4, { noise: 100 }),
    walrossbruell: A('Walross-Gebrüll', '📢', 15, { noise: 150 })
  });
  const HERO_ITEMS = new Set(Object.keys(I).filter((k) => I[k].hero));
  // Modelle in der Hand
  const obi = L.buildItem;
  L.buildItem = function (type) {
    if (type === 'lokizepter') { const g = new T.Group(); const s = new T.Mesh(L.GEO.cyl, L.mat('#c8a030')); s.scale.set(0.025, 1.1, 0.025); s.position.y = 0.2; g.add(s); const gem = new T.Mesh(L.GEO.sph, L.mat('#40ffa0', { basic: true })); gem.scale.setScalar(0.07); gem.position.y = 0.78; g.add(gem); for (const sd of [-1, 1]) { const b = new T.Mesh(L.GEO.cone, L.mat('#c8a030')); b.scale.set(0.02, 0.2, 0.02); b.position.set(sd * 0.06, 0.82, 0); b.rotation.z = -sd * 0.5; g.add(b); } return g; }
    if (HERO_ITEMS.has(type)) return new T.Group(); // Fäuste, Netze, Zähne: nichts in der Hand
    return obi(type);
  };
  // Start der Runde: Fähigkeiten in die Schnellleiste
  L.heroStart = function () {
    for (let k = 0; k < P.hot.length; k++) if (P.hot[k] && HERO_ITEMS.has(P.hot[k].type)) P.hot[k] = null;
    const s = st(); if (!s) return;
    s.items.forEach((t, k) => { P.hot[k + 1] = { type: t, count: 1, mag: 1 }; });
    P.sel = 1;
    L.msg(NAMES[L.heroId()] + ': Fähigkeiten liegen auf den Tasten 2–' + (s.items.length + 1) + '.', 6000);
  };

  // ---------- Aussehen ----------
  const part = (geo, c, sx, sy, sz, x, y, z, par, o) => { const m = new T.Mesh(geo, typeof c === 'string' ? L.mat(c, o) : c); m.scale.set(sx, sy, sz); m.position.set(x, y, z); m.castShadow = true; par.add(m); return m; };
  const webTex = (() => { let t = null; return () => t || (t = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); g.fillStyle = '#0c0c12'; g.fillRect(0, 0, 128, 128); g.strokeStyle = 'rgba(70,72,88,0.9)'; g.lineWidth = 1.5; for (let k = 0; k < 12; k++) { const a = k / 12 * 6.283; g.beginPath(); g.moveTo(64, 64); g.lineTo(64 + Math.cos(a) * 90, 64 + Math.sin(a) * 90); g.stroke(); } for (let r = 10; r < 90; r += 12) { g.beginPath(); for (let k = 0; k <= 12; k++) { const a = k / 12 * 6.283; g.lineTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r); } g.stroke(); } return new T.CanvasTexture(c); })()); })();
  function cape(r, col) { const c = new T.Group(); c.position.set(0, 0.6, -0.2); r.torso.add(c); part(L.GEO.box, col, 0.62, 1.35, 0.03, 0, -0.68, 0, c); r.cape = c; return c; }
  function build(app, id) {
    const base = { name: app.name };
    let r;
    if (id === 'koloss') {
      r = L.buildHuman(Object.assign({}, L.DEFAULT_CHAR, base, { skin: '#5a9a3a', hair: 'kurz', hairColor: '#141414', brows: 'boese', mouth: 'zaehne', eyes: '#2a6a1a', top: 'tanktop', topColor: '#5a9a3a', pants: 'zerrissen', pantsColor: '#5a2a7a', shoeType: 'barfuss', shoes: '#5a9a3a', build: 'extrem', height: 'sehr_gross' }));
      for (const a of r.arms) { part(L.GEO.sph, '#4e8c32', 0.17, 0.2, 0.17, 0, -0.12, 0, a.arm); part(L.GEO.sph, '#4e8c32', 0.15, 0.17, 0.15, 0, -0.12, 0, a.elbow); }
      part(L.GEO.sph, '#4e8c32', 0.42, 0.3, 0.26, 0, 0.42, 0.04, r.torso);
      r.root.scale.setScalar(1.55);
    } else if (id === 'netz') {
      r = L.buildHuman(Object.assign({}, L.DEFAULT_CHAR, base, { hair: 'glatze', top: 'trikot', topColor: '#123a52', pants: 'skinny', pantsColor: '#123a52', shoeType: 'sneaker', shoes: '#0a1a2a', build: 'schmal', height: 'mittel', beard: 'kein', glasses: 'keine', hat: 'keine' }));
      const wm = new T.MeshPhongMaterial({ map: webTex(), shininess: 60, specular: 0x404050 });
      r.head.children.forEach((c) => { c.visible = false; });
      r.root.traverse((o) => { if (o.isMesh) o.material = wm; });
      // runder Kopf mit Maske und großen weißen Augenlinsen
      part(L.GEO.sph, wm, 0.165, 0.2, 0.175, 0, 0.13, 0.01, r.head);
      part(L.GEO.sph, wm, 0.11, 0.07, 0.12, 0, 0.02, 0.03, r.head);
      for (const s of [-1, 1]) { const rim = part(L.GEO.sph, '#050507', 0.066, 0.05, 0.02, s * 0.068, 0.15, 0.158, r.head); rim.rotation.z = s * 0.45; const e = part(L.GEO.sph, '#f4f8ff', 0.056, 0.04, 0.021, s * 0.068, 0.15, 0.162, r.head, { basic: true }); e.rotation.z = s * 0.45; }
      // glatte, runde Arme, Beine und Oberkörper über den eckigen Grundformen
      for (const a of r.arms) { part(L.GEO.sph, wm, 0.085, 0.18, 0.085, 0, -0.14, 0, a.arm); part(L.GEO.sph, wm, 0.075, 0.17, 0.075, 0, -0.14, 0, a.elbow); part(L.GEO.sph, wm, 0.06, 0.07, 0.05, 0, -0.32, 0.01, a.elbow); }
      for (const l of r.legs) { part(L.GEO.sph, wm, 0.1, 0.24, 0.1, 0, -0.2, 0, l.leg); part(L.GEO.sph, wm, 0.085, 0.24, 0.085, 0, -0.2, 0, l.knee); }
      part(L.GEO.sph, wm, 0.27, 0.36, 0.17, 0, 0.3, 0.01, r.torso);
      part(L.GEO.sph, wm, 0.22, 0.13, 0.15, 0, 0.0, 0, r.hips);
    } else if (id === 'thor') {
      r = L.buildHuman(Object.assign({}, L.DEFAULT_CHAR, base, { skin: '#e8c0a0', hair: 'lang', hairColor: '#e0b850', beard: 'vollbart', eyes: '#3a7ad0', brows: 'dick', top: 'weste', topColor: '#30323a', pants: 'anzughose', pantsColor: '#24262c', shoeType: 'stiefel', shoes: '#3a3030', build: 'muskuloes', height: 'gross' }));
      cape(r, '#a01818');
      for (let k = 0; k < 6; k++) part(L.GEO.cyl, '#c8ccd4', 0.07, 0.02, 0.07, (k % 2 ? 0.1 : -0.1), 0.48 - Math.floor(k / 2) * 0.13, 0.17, r.torso, { metal: 0.8, rough: 0.3 }).rotation.x = Math.PI / 2;
    } else if (id === 'loki') {
      r = L.buildHuman(Object.assign({}, L.DEFAULT_CHAR, base, { skin: '#e8d0c0', hair: 'lang', hairColor: '#141414', brows: 'gebogen', mouth: 'grinsen', eyes: '#3a8a4a', top: 'mantel', topColor: '#1a4a2a', pants: 'anzughose', pantsColor: '#141414', shoeType: 'stiefel', shoes: '#141414', build: 'schmal', height: 'gross' }));
      cape(r, '#1a5a2a');
      for (const s of [-1, 1]) { const h = new T.Group(); h.position.set(s * 0.08, 0.3, 0.06); r.head.add(h); for (let k = 0; k < 4; k++) { const c = part(L.GEO.cone, '#d8b040', 0.03 - k * 0.005, 0.12, 0.03 - k * 0.005, s * k * 0.015, 0.05 + k * 0.08, -k * 0.05, h, { metal: 0.7, rough: 0.3 }); c.rotation.x = -0.6 - k * 0.15; } }
      part(L.GEO.box, '#d8b040', 0.2, 0.05, 0.05, 0, 0.26, 0.12, r.head, { metal: 0.7, rough: 0.3 });
    } else {
      r = L.buildHuman(Object.assign({}, L.DEFAULT_CHAR, base, { skin: '#8a5a3a', hair: 'glatze', top: 'tshirt', topColor: '#8a5a3a', pants: 'kurz', pantsColor: '#8a5a3a', shoeType: 'barfuss', shoes: '#6a4428', build: 'extrem', height: 'gross' }));
      r.head.children.forEach((c) => { c.visible = false; });
      const br = '#7a4a2e', dk = '#5a3420';
      part(L.GEO.sph, br, 0.6, 0.56, 0.52, 0, -0.04, 0.04, r.torso); r.head.position.z += 0.07; r.head.position.y += 0.04;
      part(L.GEO.sph, br, 0.3, 0.14, 0.28, 0, -0.06, 0, r.head); // Nackenfalte
      part(L.GEO.sph, br, 0.26, 0.24, 0.27, 0, 0.1, 0.02, r.head); // Kopf
      part(L.GEO.sph, '#8a5838', 0.2, 0.13, 0.14, 0, 0.04, 0.16, r.head); // Schnauze
      part(L.GEO.sph, dk, 0.05, 0.02, 0.02, 0, 0.12, 0.27, r.head);
      for (const s of [-1, 1]) {
        part(L.GEO.sph, '#9a6a48', 0.1, 0.09, 0.08, s * 0.07, 0.02, 0.24, r.head); // Barthaar-Polster
        part(L.GEO.sph, '#141414', 0.022, 0.024, 0.015, s * 0.12, 0.2, 0.2, r.head, { basic: true }); // Auge
        part(L.GEO.sph, '#141414', 0.012, 0.02, 0.01, s * 0.025, 0.1, 0.29, r.head, { basic: true }); // Nasenloch
        const tusk = part(L.GEO.cone, '#f4ecd8', 0.028, 0.48, 0.028, s * 0.06, -0.24, 0.24, r.head, { metal: 0.1, rough: 0.6 }); tusk.rotation.set(Math.PI - 0.12, 0, -s * 0.06);
        for (let k = 0; k < 18; k++) { const hr = part(L.GEO.cyl, '#e8d8b0', 0.004, 0.08, 0.004, s * (0.03 + (k % 6) * 0.017), -0.02 + Math.floor(k / 6) * 0.03, 0.3, r.head); hr.rotation.set(1.3 + Math.floor(k / 6) * 0.15, 0, s * (0.2 + (k % 6) * 0.08)); }
        for (let k = 0; k < 4; k++) { const hr = part(L.GEO.cyl, '#c8b890', 0.004, 0.07, 0.004, s * (0.08 + k * 0.03), 0.3, 0.06 - k * 0.04, r.head); hr.rotation.z = -s * 0.4; }
      }
      for (const a of r.arms) { part(L.GEO.sph, dk, 0.1, 0.05, 0.22, 0, -0.32, 0.08, a.elbow); }
    }
    r.app = Object.assign({}, r.app, { special: 'h_' + id, hk: app.hk, name: app.name });
    r.heroId = id;
    return r;
  }
  const obh = L.buildHuman;
  L.buildHuman = function (app, force) {
    const id = app && keyOf(app.special);
    if (id && HK[id]) {
      if (!force && !heroOk(app, id)) return obh(Object.assign({}, app, { special: '' }), force);
      return build(app, id);
    }
    return obh(app, force);
  };

  // ---------- Effekte ----------
  const H = { anim: null, animT: 0, invisT: 0, dashT: 0, dashHit: null, slam: null, wasAir: false, webs: [], fxs: [], clones: [], anchor: null };
  const targets = () => (L._targets ? L._targets() : []).filter((e) => e.kind !== 'remote');
  const fwd = () => { const d = V(); L.camera.getWorldDirection(d); d.y = 0; d.normalize(); return d; };
  const aim = () => { const d = V(); L.camera.getWorldDirection(d); return d; };
  const handPos = () => { const h = V(); if (P.rig && P.rig.hand) P.rig.hand.getWorldPosition(h); else h.set(P.x, (P.y || 0) + 1.4, P.z); return h; };
  function hitArea(x, y, z, r, dmg, knock, stun, skip) {
    let n = 0;
    for (const e of targets()) {
      if (skip && skip.has(e)) continue;
      const ey = e.y !== undefined ? e.y : (e.hy !== undefined ? e.hy * 0.5 : 0);
      const d = Math.hypot(e.x - x, e.z - z);
      if (d > r + (e.bigR || 0) || Math.abs(ey - y) > r + 25) continue;
      L.damageEnt(e, dmg * (1 - Math.min(d, r) / (r * 1.6)), P.x, P.z, P); n++;
      if (skip) skip.add(e);
      if (e.kind && L.MK && L.MK[e.kind] && !e.dead) {
        if (knock) { const a = Math.atan2(e.x - x, e.z - z); e.x += Math.sin(a) * knock; e.z += Math.cos(a) * knock; }
        if (stun) e.stunT = Math.max(e.stunT || 0, stun);
      }
    }
    return n;
  }
  function ring(x, y, z, col, maxR, dur, flat) {
    const m = new T.Mesh(new T.TorusGeometry(1, 0.12, 6, 48), new T.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.9, depthWrite: false, blending: T.AdditiveBlending }));
    m.position.set(x, y, z); if (flat !== false) m.rotation.x = Math.PI / 2; L.scene.add(m); H.fxs.push({ m, t: 0, dur, maxR, kind: 'ring' }); return m;
  }
  function line(a, b, col, dur, w) {
    const len = a.distanceTo(b), m = new T.Mesh(new T.CylinderGeometry(w || 0.03, w || 0.03, len, 5, 1, true), new T.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.95, depthWrite: false }));
    m.position.copy(a).lerp(b, 0.5); m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), b.clone().sub(a).normalize()); L.scene.add(m); H.fxs.push({ m, t: 0, dur, kind: 'line' }); return m;
  }
  function bolt(x, z, y0) {
    const pts = []; let px = x + L.rand(-8, 8), pz = z + L.rand(-8, 8);
    for (let k = 0; k <= 10; k++) { const u = k / 10; pts.push(new T.Vector3(L.lerp(px, x, u) + (k && k < 10 ? L.rand(-3, 3) : 0), L.lerp(y0 + 140, y0, u), L.lerp(pz, z, u) + (k && k < 10 ? L.rand(-3, 3) : 0))); }
    const l = new T.Line(new T.BufferGeometry().setFromPoints(pts), new T.LineBasicMaterial({ color: 0xc8f0ff, fog: false })); L.scene.add(l); H.fxs.push({ m: l, t: 0, dur: 0.25, kind: 'bolt' });
    L.env.bolt = 1; L.fx('#c8f0ff', x, y0 + 1, z, 20, 9, { basic: true, size: 0.4, life: 0.6 }); L.decal && L.decal(x, z, 2.5, '#1a1a1a');
  }
  const play = (a, dur) => { H.anim = a; H.animT = 0; H.animDur = dur || 0.5; };
  const boom = (vol) => { L.nz && L.nz({ dur: 0.9, f: 200, fTo: 60, vol: vol || 0.7 }); L.tn && L.tn({ f: 60, fTo: 30, dur: 0.6, vol: vol || 0.6 }); };

  // ---------- Fähigkeiten auslösen ----------
  const owf = L.weaponFire;
  L.weaponFire = function (w, d) {
    if (!d || !d.hero) return owf(w, d);
    P.fireCd = d.rate;
    const t = w.type, f = fwd(), hp = handPos(), y = (P.y || 0);
    switch (t) {
      case 'kolossfaust': {
        play('punch', 0.4);
        setTimeout(() => { const n = hitArea(P.x + f.x * 2.6, y + 1, P.z + f.z * 2.6, 3.2, 380, 6); if (n) { L.shake = Math.max(L.shake, 0.6); boom(0.6); L.fx('#c8b090', P.x + f.x * 2.6, y + 1.2, P.z + f.z * 2.6, 14, 6, { size: 0.3, life: 0.6 }); } else L.snd.swing && L.snd.swing(); }, 140);
        break;
      }
      case 'donnerklatscher': {
        play('clap', 0.7);
        setTimeout(() => {
          boom(1); L.shake = Math.max(L.shake, 1); L.env.bolt = 0.3;
          const m = ring(P.x + f.x * 2, y + 1.5, P.z + f.z * 2, 0xffffff, 30, 0.7, false); m.lookAt(P.x + f.x * 10, y + 1.5, P.z + f.z * 10);
          for (const e of targets()) { const dx = e.x - P.x, dz = e.z - P.z, dd = Math.hypot(dx, dz); if (dd > 32 + (e.bigR || 0) || (dx * f.x + dz * f.z) / (dd || 1) < 0.75) continue; L.damageEnt(e, 170 * (1 - dd / 40), P.x, P.z, P); if (L.MK && L.MK[e.kind] && !e.dead) { e.x += dx / (dd || 1) * 10; e.z += dz / (dd || 1) * 10; e.stunT = Math.max(e.stunT || 0, 2); } }
          for (let k = 0; k < 20; k++) L.fx('#d8c8a8', P.x + f.x * (3 + k * 1.4), y + 0.5, P.z + f.z * (3 + k * 1.4), 2, 5, { size: 0.5, life: 0.8 });
        }, 320);
        break;
      }
      case 'erdbebensprung': {
        play('slamUp', 3); P.vy = 17; P.air = true; P.vx = f.x * 16; P.vz = f.z * 16; P.knockT = 1.2; H.slam = { r: 13, dmg: 320, col: 0xd8b070 };
        L.snd.land && L.snd.land({ x: P.x, y, z: P.z }); break;
      }
      case 'netzschuss': {
        play('shoot', 0.3);
        const o = L.camera.position, dir = aim(), h = L.rayHit(o, dir, 90 + P.camDist, P.camDist + 0.3), end = o.clone().addScaledVector(dir, h.t);
        line(hp, end, 0xf0f8ff, 0.35, 0.025); L.fx('#f0f8ff', end.x, end.y, end.z, 8, 2, { basic: true, size: 0.12, life: 0.8 });
        if (h.ent) { L.damageEnt(h.ent, 25, P.x, P.z, P); if (L.MK && L.MK[h.ent.kind] && !h.ent.dead) { h.ent.stunT = Math.max(h.ent.stunT || 0, 5); web(h.ent.x, 0.2, h.ent.z, 1.4, 5); } }
        L.nz && L.nz({ dur: 0.12, f: 4000, type: 'highpass', vol: 0.18 });
        break;
      }
      case 'netzschwinger': {
        const o = L.camera.position, dir = aim(), h = L.rayHit(o, dir, 140, P.camDist + 0.3);
        let anc = o.clone().addScaledVector(dir, Math.min(h.t, 140)); if (h.t >= 139) anc.y = Math.max(anc.y, y + 30);
        const to = anc.clone().sub(V().set(P.x, y + 1, P.z)), dist = to.length(); to.normalize();
        P.vx = to.x * Math.min(32, 10 + dist * 0.5); P.vz = to.z * Math.min(32, 10 + dist * 0.5); P.vy = Math.max(7, to.y * 22 + 6); P.air = true; P.knockT = 1.4;
        H.anchor = { p: anc, t: 0 }; play('swing', 1.2);
        L.nz && L.nz({ dur: 0.2, f: 3000, type: 'highpass', vol: 0.2 });
        break;
      }
      case 'netzbombe': {
        play('shoot', 0.4);
        const o = L.camera.position, dir = aim(), h = L.rayHit(o, dir, 45, P.camDist + 0.3), end = o.clone().addScaledVector(dir, h.t);
        const gy = Math.max(0, L.floorAt ? (L.floorAt(end.x, end.z, end.y + 1) || 0) : 0);
        line(hp, end, 0xf0f8ff, 0.3, 0.02);
        setTimeout(() => { hitArea(end.x, gy + 1, end.z, 9, 40, 0, 6); web(end.x, gy, end.z, 9, 6); L.nz && L.nz({ dur: 0.4, f: 2500, type: 'bandpass', vol: 0.3 }); }, 200);
        break;
      }
      case 'gewitter': {
        play('raise', 1.2);
        const o = L.camera.position, dir = aim(), h = L.rayHit(o, dir, 160, P.camDist + 0.3), end = o.clone().addScaledVector(dir, h.t);
        const gy = h.ent ? Math.max(0, end.y - 2) : Math.max(0, end.y);
        L.snd.thunder && L.snd.thunder(0.1);
        for (let k = 0; k < 6; k++) setTimeout(() => { const x = end.x + L.rand(-9, 9), z = end.z + L.rand(-9, 9); bolt(x, z, gy); hitArea(x, gy + 1, z, 6, 210, 3, 1); if (k % 2 === 0) L.snd.thunder && L.snd.thunder(0); }, 250 + k * 190);
        break;
      }
      case 'lokizepter': {
        play('shoot', 0.3);
        const o = L.camera.position, dir = aim(), h = L.rayHit(o, dir, 150 + P.camDist, P.camDist + 0.3), end = o.clone().addScaledVector(dir, h.t);
        line(hp, end, 0x40ffa0, 0.25, 0.12); L.fx('#40ffa0', end.x, end.y, end.z, 14, 5, { basic: true, size: 0.25, life: 0.6 });
        if (h.ent) L.damageEnt(h.ent, 120 * h.mult, P.x, P.z, P);
        L.tn && L.tn({ f: 600, fTo: 1400, dur: 0.25, type: 'sawtooth', vol: 0.12 });
        break;
      }
      case 'illusion': {
        play('cast', 0.6);
        for (let k = 0; k < 3; k++) {
          const a = P.yaw + (k - 1) * 0.9, rig = L.buildHuman(P.rig.app, true); rig.root.position.set(P.x, y, P.z); L.scene.add(rig.root);
          H.clones.push({ rig, x: P.x, z: P.z, y, a, t: 0, ph: k });
          L.fx('#40ffa0', P.x, y + 1, P.z, 10, 3, { basic: true, size: 0.2, life: 0.8 });
        }
        L.msg('🐍 Drei Illusionen locken die Monster weg – nach 8 Sekunden explodieren sie!', 3500);
        break;
      }
      case 'tarnung': {
        H.invisT = 10; play('cast', 0.5);
        for (const e of targets()) if (e.prey === P) { e.prey = null; e.state = 'search'; e.timer = 3; }
        L.fx('#40ffa0', P.x, y + 1, P.z, 24, 3, { basic: true, size: 0.2, life: 1 });
        L.msg('🫥 Unsichtbar für 10 Sekunden – die Monster verlieren dich.', 3000);
        break;
      }
      case 'stosszahn': {
        play('dash', 0.5); H.dashT = 0.45; H.dashHit = new Set(); P.vx = f.x * 26; P.vz = f.z * 26; P.knockT = 0.5;
        L.snd.heavy && L.snd.heavy({ x: P.x, y: 1, z: P.z }, 0.5); break;
      }
      case 'bauchplatscher': {
        play('slamUp', 2); P.vy = 10; P.air = true; P.vx = f.x * 6; P.vz = f.z * 6; P.knockT = 0.8; H.slam = { r: 10, dmg: 210, col: 0x80d0ff, splash: true }; break;
      }
      case 'walrossbruell': {
        play('roar', 1.4);
        L.snd.bossRoar ? L.snd.bossRoar({ x: P.x, y: 2, z: P.z }) : boom(0.6); L.shake = Math.max(L.shake, 0.6);
        ring(P.x, y + 1.6, P.z, 0xffe0a0, 35, 1, true);
        for (const e of targets()) { const dd = Math.hypot(e.x - P.x, e.z - P.z); if (dd > 35 || !L.MK || !L.MK[e.kind] || e.dead) continue; e.stunT = Math.max(e.stunT || 0, 4); e.prey = null; const a = Math.atan2(e.x - P.x, e.z - P.z); e.tx = e.x + Math.sin(a) * 60; e.tz = e.z + Math.cos(a) * 60; L.damageEnt(e, 30, P.x, P.z, P); }
        break;
      }
    }
    L.makeNoise(P.x, P.z, d.noise, P);
    return true;
  };
  function web(x, y, z, r, life) {
    const m = new T.Mesh(new T.SphereGeometry(r, 12, 6, 0, 6.283, 0, Math.PI / 2), new T.MeshBasicMaterial({ color: 0xf0f8ff, wireframe: true, transparent: true, opacity: 0.8 }));
    m.position.set(x, y, z); L.scene.add(m); H.fxs.push({ m, t: 0, dur: life, kind: 'web' });
  }

  // ---------- jedes Bild ----------
  L.updateHeroes = function (dt) {
    for (let i = H.fxs.length - 1; i >= 0; i--) {
      const f = H.fxs[i]; f.t += dt; const u = f.t / f.dur;
      if (f.kind === 'ring') { f.m.scale.setScalar(1 + u * f.maxR); f.m.material.opacity = 0.9 * (1 - u); }
      else if (f.kind === 'line' || f.kind === 'web') { if (f.m.material) f.m.material.opacity = (f.kind === 'web' ? 0.8 : 0.95) * Math.min(1, (1 - u) * 3); }
      if (u >= 1) { L.scene.remove(f.m); if (f.m.geometry) f.m.geometry.dispose(); if (f.m.material) f.m.material.dispose(); H.fxs.splice(i, 1); }
    }
    for (let i = H.clones.length - 1; i >= 0; i--) {
      const c = H.clones[i]; c.t += dt; c.ph += dt * 7;
      c.x += Math.sin(c.a) * 3.2 * dt; c.z += Math.cos(c.a) * 3.2 * dt;
      c.rig.root.position.set(c.x, c.y, c.z); c.rig.root.rotation.y = c.a; L.animHuman(c.rig, { mode: 'walk', phase: c.ph, speed: 1 });
      if (Math.random() < dt * 6) L.fx('#40ffa0', c.x, c.y + 1, c.z, 1, 1, { basic: true, size: 0.1, life: 0.6 });
      if (!L._isClient || !L._isClient()) for (const e of L.ents.monsters) { if (e.dead || Math.hypot(e.x - c.x, e.z - c.z) > 60) continue; if (e.prey === P || e.state === 'chase') { e.prey = null; e.state = 'investigate'; e.tx = c.x; e.tz = c.z; e.timer = 4; } }
      if (c.t > 8) { L.scene.remove(c.rig.root); H.clones.splice(i, 1); hitArea(c.x, c.y + 1, c.z, 5, 90, 3); L.fx('#40ffa0', c.x, c.y + 1, c.z, 30, 7, { basic: true, size: 0.3, life: 0.8 }); boom(0.4); }
    }
    const s = st();
    if (!s) { H.invisT = 0; return; }
    if (P.alive && s.regen) P.hp = Math.min(100, P.hp + s.regen * dt);
    if (H.invisT > 0) { H.invisT -= dt; if (P.rig) P.rig.root.visible = Math.random() < 0.04; if (H.invisT <= 0) L.msg('🐍 Die Tarnung ist vorbei.', 2000); }
    if (H.dashT > 0) {
      H.dashT -= dt; const f = fwd(); P.vx = f.x * 26; P.vz = f.z * 26;
      if (hitArea(P.x + f.x * 1.5, (P.y || 0) + 1, P.z + f.z * 1.5, 2.8, 230, 7, 1, H.dashHit)) { L.shake = Math.max(L.shake, 0.5); boom(0.5); }
      if (Math.random() < dt * 30) L.fx('#e8f4ff', P.x, (P.y || 0) + 0.3, P.z, 1, 2, { size: 0.3, life: 0.5 });
    }
    if (H.anchor) { H.anchor.t += dt; if (!H.anchor.m) H.anchor.m = line(handPos(), H.anchor.p, 0xf0f8ff, 0.9, 0.02); else { L.scene.remove(H.anchor.m); H.fxs = H.fxs.filter((q) => q.m !== H.anchor.m); H.anchor.m = line(handPos(), H.anchor.p, 0xf0f8ff, 0.05, 0.02); } if (H.anchor.t > 0.8) H.anchor = null; }
    // Landung nach Sprung-Angriffen
    if (H.wasAir && !P.air && H.slam) {
      const S = H.slam; H.slam = null; const y = P.y || 0;
      hitArea(P.x, y + 1, P.z, S.r, S.dmg, 8, 1.5);
      ring(P.x, y + 0.3, P.z, S.col, S.r * 1.3, 0.7); boom(1); L.shake = Math.max(L.shake, 1.2);
      L.decal && L.decal(P.x, P.z, S.r * 0.5, '#2a2018');
      for (let k = 0; k < 24; k++) { const a = k / 24 * 6.283; L.fx(S.splash ? '#e8f4ff' : '#8a7a60', P.x + Math.sin(a) * 2, y + 0.3, P.z + Math.cos(a) * 2, 2, 8, { size: 0.5, life: 1 }); }
      play('land', 0.5);
    }
    H.wasAir = !!P.air;
  };

  // ---------- Animationen ----------
  const oapa = L.afterPlayerAnim;
  L.afterPlayerAnim = function (r, dt) {
    if (oapa) oapa(r, dt);
    if (!r || !r.heroId || r !== P.rig) return;
    const id = r.heroId, [aR, aL] = r.arms;
    // Grundhaltung
    if (id === 'koloss') { r.torso.rotation.x += 0.18; for (const a of r.arms) a.arm.rotation.z += (a === aR ? -0.25 : 0.25); }
    if (id === 'thor' && P.flying) { aR.arm.rotation.x = -3.0; aR.elbow.rotation.x = 0; r.body.rotation.x = 0.9; }
    if (r.cape) r.cape.rotation.x = 0.15 + Math.min(1.1, Math.hypot(P.vx, P.vz) * 0.06) + (P.flying ? 0.5 : 0) + Math.sin(performance.now() / 300) * 0.05;
    if (!H.anim) return;
    H.animT += dt; const u = Math.min(1, H.animT / H.animDur), s = Math.sin(u * Math.PI);
    switch (H.anim) {
      case 'punch': aR.arm.rotation.x = u < 0.35 ? -0.6 - u * 3 : -1.65 + (u - 0.35) * 1.5; aR.elbow.rotation.x = u < 0.35 ? -1.6 : -0.1; r.torso.rotation.y = u < 0.35 ? 0.4 : -0.35 * s; break;
      case 'clap': for (const a of r.arms) { a.arm.rotation.x = -1.5; a.arm.rotation.z = (a === aR ? -1 : 1) * (u < 0.45 ? 1.4 : Math.max(0, 1.4 - (u - 0.45) * 8)); a.elbow.rotation.x = -0.1; } break;
      case 'slamUp': for (const a of r.arms) { a.arm.rotation.x = -3.0; a.elbow.rotation.x = -0.3; } if (P.vy < 0) for (const a of r.arms) a.arm.rotation.x = -2.2; break;
      case 'land': for (const a of r.arms) { a.arm.rotation.x = -0.5 + s * 0.4; } r.body.position.y = -0.3 * s; break;
      case 'shoot': aR.arm.rotation.x = -1.55; aR.elbow.rotation.x = 0; break;
      case 'swing': aR.arm.rotation.x = -2.9; aR.arm.rotation.z = -0.2; aR.elbow.rotation.x = 0; for (const l of r.legs) l.knee.rotation.x = 0.8; break;
      case 'raise': aR.arm.rotation.x = -3.1; aR.elbow.rotation.x = 0; aL.arm.rotation.x = -1.4 * s; break;
      case 'cast': for (const a of r.arms) { a.arm.rotation.x = -1.4; a.arm.rotation.z = (a === aR ? -0.4 : 0.4) * s; } break;
      case 'dash': r.body.rotation.x = 0.6; for (const a of r.arms) a.arm.rotation.x = 0.6; break;
      case 'roar': r.head.rotation.x = -0.5 * s; for (const a of r.arms) { a.arm.rotation.z = (a === aR ? -1.2 : 1.2) * s; a.arm.rotation.x = -0.4; } break;
    }
    if (u >= 1 && H.anim !== 'slamUp') H.anim = null;
    if (H.anim === 'slamUp' && !P.air && H.animT > 0.3) H.anim = null;
  };
  L.clearHeroes = function () {
    for (const f of H.fxs) L.scene.remove(f.m); H.fxs.length = 0;
    for (const c of H.clones) L.scene.remove(c.rig.root); H.clones.length = 0;
    H.invisT = 0; H.dashT = 0; H.slam = null; H.anchor = null; H.anim = null;
  };
})();
