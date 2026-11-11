'use strict';
// 3D-Modelle und Animationen: Spieler/NPCs, Viktor, Daniel, Stelzer, Koloss, Fahrzeuge, Gegenstände
(function () {
  const L = window.L, T = THREE;
  const UP = new T.Vector3(0, 1, 0);
  const G = () => L.GEO;
  function part(geo, color, sx, sy, sz, x, y, z, parent, o) {
    const m = new T.Mesh(geo, L.mat(color, o));
    m.scale.set(sx, sy, sz); m.position.set(x, y, z);
    m.castShadow = !(o && o.noShadow);
    if (parent) parent.add(m);
    return m;
  }
  const grp = (parent, x, y, z) => { const g = new T.Group(); g.position.set(x || 0, y || 0, z || 0); if (parent) parent.add(g); return g; };
  function shade(hex, f) {
    const c = new T.Color(hex); c.multiplyScalar(f);
    return '#' + c.getHexString();
  }

  // ---------- Aussehen ----------
  L.CHAR_OPTS = {
    skin: ['#f1d2b6', '#e3b48f', '#c98e65', '#a46a45', '#7a4a2e', '#4e2f1e'],
    hair: ['kurz', 'lang', 'glatze', 'irokese', 'locken', 'zopf', 'seitenscheitel'],
    hairColor: ['#1a1410', '#4a2f1c', '#8a5a2b', '#d8b46a', '#a83a1c', '#9a9a9a', '#2850c0', '#d04a9a'],
    eyes: ['#5a3a1c', '#2a6ac0', '#3a8a4a', '#6a6a6a', '#1a1a1a'],
    brows: ['normal', 'dick', 'boese', 'hoch'],
    mouth: ['normal', 'laecheln', 'ernst', 'offen', 'grinsen'],
    nose: ['klein', 'normal', 'gross', 'spitz'],
    beard: ['kein', 'stoppel', 'vollbart', 'schnurrbart', 'kinnbart'],
    glasses: ['keine', 'brille', 'sonnenbrille'],
    hat: ['keine', 'muetze', 'cap', 'helm', 'stirnband'],
    top: ['tshirt', 'jacke', 'hoodie', 'weste'],
    topColor: ['#2a4a8a', '#8a2a2a', '#2a6a3a', '#2a2a2a', '#d8d0c0', '#c08a2a', '#6a3a8a', '#4a5a3a'],
    pantsColor: ['#2a3550', '#1e1e22', '#5a4a32', '#4a5a3a', '#7a7a7a', '#6a2a2a'],
    shoes: ['#1a1a1a', '#e8e8e8', '#6a4a2a', '#8a1a1a'],
    build: ['schmal', 'normal', 'kraeftig'],
    height: ['klein', 'mittel', 'gross'],
    scar: ['keine', 'wange', 'auge']
  };
  L.DEFAULT_CHAR = { name: 'Überlebender', skin: '#e3b48f', hair: 'kurz', hairColor: '#4a2f1c', eyes: '#2a6ac0', brows: 'normal', mouth: 'normal', nose: 'normal', beard: 'kein', glasses: 'keine', hat: 'keine', top: 'jacke', topColor: '#2a4a8a', pantsColor: '#2a3550', shoes: '#1a1a1a', build: 'normal', height: 'mittel', scar: 'keine' };
  L.randomAppearance = function () {
    const a = {}, O = L.CHAR_OPTS;
    for (const k in O) a[k] = L.pick(O[k]);
    if (Math.random() < 0.6) a.hat = 'keine';
    if (Math.random() < 0.6) a.glasses = 'keine';
    if (Math.random() < 0.5) a.beard = 'kein';
    a.scar = Math.random() < 0.85 ? 'keine' : a.scar;
    return a;
  };

  // ---------- Mensch (Spieler und NPCs) ----------
  L.buildHuman = function (app) {
    const A = Object.assign({}, L.DEFAULT_CHAR, app || {});
    const bw = { schmal: 0.85, normal: 1, kraeftig: 1.25 }[A.build] || 1;
    const hs = { klein: 0.92, mittel: 1, gross: 1.08 }[A.height] || 1;
    const root = new T.Group(), body = grp(root), hips = grp(body, 0, 0.95, 0);
    const box = G().box, skin = A.skin, hc = A.hairColor;
    const sleeve = A.top === 'tshirt' || A.top === 'weste' ? skin : A.topColor;
    const legs = [], arms = [];
    for (const s of [-1, 1]) {
      const leg = grp(hips, s * 0.11 * bw, 0, 0);
      part(box, A.pantsColor, 0.16 * bw, 0.46, 0.17 * bw, 0, -0.23, 0, leg);
      const knee = grp(leg, 0, -0.46, 0);
      part(box, A.pantsColor, 0.14 * bw, 0.44, 0.15 * bw, 0, -0.22, 0, knee);
      part(box, A.shoes, 0.15 * bw, 0.1, 0.27, 0, -0.47, 0.05, knee);
      legs.push({ leg, knee });
    }
    const torso = grp(hips);
    part(box, A.topColor, 0.44 * bw, 0.6, 0.25 * bw, 0, 0.31, 0, torso);
    part(box, '#1c1c1c', 0.45 * bw, 0.06, 0.26 * bw, 0, 0.03, 0, torso);
    if (A.top === 'jacke') { part(box, shade(A.topColor, 0.6), 0.02, 0.56, 0.01, 0, 0.32, 0.127 * bw, torso); part(box, shade(A.topColor, 0.8), 0.46 * bw, 0.07, 0.27 * bw, 0, 0.6, 0, torso); }
    if (A.top === 'hoodie') { part(box, shade(A.topColor, 0.85), 0.3, 0.2, 0.12, 0, 0.62, -0.16 * bw, torso); part(box, shade(A.topColor, 0.7), 0.24 * bw, 0.14, 0.02, 0, 0.18, 0.128 * bw, torso); }
    if (A.top === 'weste') { part(box, shade(A.topColor, 0.55), 0.46 * bw, 0.5, 0.27 * bw, 0, 0.33, 0, torso); part(box, '#d8d0c0', 0.14 * bw, 0.45, 0.01, 0, 0.35, 0.137 * bw, torso); }
    const neck = grp(torso, 0, 0.62, 0);
    part(box, skin, 0.1, 0.08, 0.1, 0, 0.02, 0, neck);
    const head = grp(neck, 0, 0.04, 0);
    part(box, skin, 0.25, 0.29, 0.26, 0, 0.15, 0, head);
    const fz = 0.131;
    for (const s of [-1, 1]) {
      part(box, '#f4f4f0', 0.06, 0.04, 0.01, s * 0.058, 0.18, fz, head, { noShadow: true });
      part(box, A.eyes, 0.028, 0.034, 0.012, s * 0.058, 0.18, fz + 0.004, head, { noShadow: true });
      const brow = part(box, A.brows === 'dick' ? shade(hc, 0.8) : hc, 0.07, A.brows === 'dick' ? 0.03 : 0.016, 0.012, s * 0.058, A.brows === 'hoch' ? 0.235 : 0.218, fz + 0.004, head, { noShadow: true });
      if (A.brows === 'boese') brow.rotation.z = s * 0.3;
      if (A.brows === 'hoch') brow.rotation.z = -s * 0.15;
    }
    const nose = { klein: [0.03, 0.04, 0.03], normal: [0.04, 0.06, 0.04], gross: [0.055, 0.08, 0.06], spitz: [0.03, 0.07, 0.07] }[A.nose] || [0.04, 0.06, 0.04];
    part(box, shade(skin, 0.9), nose[0], nose[1], nose[2], 0, 0.135, fz + nose[2] / 2 - 0.005, head, { noShadow: true });
    const mc = '#6a2a2a';
    if (A.mouth === 'laecheln' || A.mouth === 'grinsen') {
      part(box, mc, 0.07, 0.016, 0.01, 0, 0.075, fz, head, { noShadow: true });
      for (const s of [-1, 1]) { const c = part(box, mc, 0.03, 0.014, 0.01, s * 0.045, 0.083, fz, head, { noShadow: true }); c.rotation.z = s * 0.5; }
      if (A.mouth === 'grinsen') part(box, '#f0f0f0', 0.06, 0.012, 0.012, 0, 0.08, fz + 0.002, head, { noShadow: true });
    } else if (A.mouth === 'offen') part(box, '#3a1010', 0.06, 0.04, 0.01, 0, 0.075, fz, head, { noShadow: true });
    else part(box, A.mouth === 'ernst' ? '#4a2020' : mc, 0.09, A.mouth === 'ernst' ? 0.012 : 0.016, 0.01, 0, 0.078, fz, head, { noShadow: true });
    if (A.beard === 'stoppel') part(box, shade(skin, 0.72), 0.256, 0.1, 0.266, 0, 0.06, 0, head, { noShadow: true });
    if (A.beard === 'vollbart') { part(box, hc, 0.27, 0.13, 0.28, 0, 0.055, 0.005, head); part(box, hc, 0.16, 0.08, 0.06, 0, 0.0, 0.12, head); }
    if (A.beard === 'schnurrbart') part(box, hc, 0.11, 0.025, 0.02, 0, 0.1, fz + 0.006, head, { noShadow: true });
    if (A.beard === 'kinnbart') part(box, hc, 0.06, 0.07, 0.04, 0, 0.03, 0.12, head, { noShadow: true });
    if (A.scar === 'wange') part(box, '#8a3a3a', 0.012, 0.07, 0.01, 0.08, 0.12, fz + 0.002, head, { noShadow: true });
    if (A.scar === 'auge') part(box, '#8a3a3a', 0.012, 0.1, 0.01, -0.058, 0.18, fz + 0.009, head, { noShadow: true });
    if (A.glasses !== 'keine') {
      const gc = A.glasses === 'sonnenbrille' ? '#0a0a0a' : '#222';
      for (const s of [-1, 1]) part(box, gc, 0.075, 0.055, A.glasses === 'sonnenbrille' ? 0.014 : 0.006, s * 0.058, 0.18, fz + 0.012, head, { noShadow: true });
      part(box, gc, 0.05, 0.012, 0.01, 0, 0.19, fz + 0.012, head, { noShadow: true });
    }
    const hairTop = A.hat === 'keine' || A.hat === 'stirnband';
    if (A.hair !== 'glatze') {
      if (A.hair === 'irokese') part(box, hc, 0.05, 0.13, 0.26, 0, 0.36, 0, head);
      else if (A.hair === 'locken') { for (let i = 0; i < 9; i++) part(box, hc, 0.11, 0.1, 0.11, ((i % 3) - 1) * 0.085, 0.33, (Math.floor(i / 3) - 1) * 0.085, head); }
      else {
        if (hairTop) part(box, hc, 0.27, 0.07, 0.28, 0, 0.32, 0, head);
        part(box, hc, 0.27, 0.16, 0.04, 0, 0.24, -0.125, head);
        if (A.hair === 'seitenscheitel' && hairTop) part(box, hc, 0.14, 0.05, 0.28, 0.07, 0.36, 0, head);
        if (A.hair === 'lang') { part(box, hc, 0.28, 0.42, 0.05, 0, 0.12, -0.14, head); for (const s of [-1, 1]) part(box, hc, 0.03, 0.3, 0.2, s * 0.135, 0.17, -0.03, head); }
        if (A.hair === 'zopf') part(box, hc, 0.07, 0.28, 0.07, 0, 0.12, -0.18, head);
      }
    }
    if (A.hat === 'muetze') { part(box, A.topColor === '#2a2a2a' ? '#8a2a2a' : '#2a2a2a', 0.28, 0.13, 0.29, 0, 0.34, 0, head); part(box, '#d8d0c0', 0.29, 0.04, 0.3, 0, 0.28, 0, head); }
    if (A.hat === 'cap') { part(box, '#b02a2a', 0.27, 0.07, 0.28, 0, 0.33, 0, head); part(box, '#b02a2a', 0.22, 0.02, 0.12, 0, 0.3, 0.18, head); }
    if (A.hat === 'helm') { part(box, '#2a2a2a', 0.31, 0.2, 0.32, 0, 0.3, 0, head); part(box, '#101820', 0.27, 0.09, 0.02, 0, 0.19, 0.155, head, { opacity: 0.75 }); }
    if (A.hat === 'stirnband') part(box, '#c02020', 0.265, 0.04, 0.275, 0, 0.27, 0, head);
    let hand = null;
    for (const s of [-1, 1]) {
      const arm = grp(torso, s * (0.22 * bw + 0.06), 0.55, 0);
      part(box, sleeve === skin ? A.topColor : sleeve, 0.12 * bw, s === 1 && A.top === 'tshirt' ? 0.16 : 0.32, 0.13 * bw, 0, A.top === 'tshirt' ? -0.08 : -0.16, 0, arm);
      if (A.top === 'tshirt' || A.top === 'weste') part(box, skin, 0.105 * bw, 0.18, 0.115 * bw, 0, -0.24, 0, arm);
      const elbow = grp(arm, 0, -0.32, 0);
      part(box, A.top === 'tshirt' || A.top === 'weste' ? skin : A.topColor, 0.11 * bw, 0.3, 0.12 * bw, 0, -0.15, 0, elbow);
      part(box, skin, 0.09, 0.1, 0.1, 0, -0.34, 0, elbow);
      arms.push({ arm, elbow });
      if (s === -1) { hand = grp(elbow, 0, -0.36, 0.03); }
    }
    root.scale.setScalar(hs);
    root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    return { root, body, hips, torso, neck, head, legs, arms, hand, held: null, heldType: null, app: A, kind: 'human' };
  };
  // was der Mensch in der Hand hält
  L.setHeld = function (rig, type) {
    if (rig.heldType === type) return;
    if (rig.held) { rig.hand.remove(rig.held); rig.held = null; }
    rig.heldType = type;
    if (!type || type === 'leer') return;
    const m = L.buildItem(type, true);
    if (!m) return;
    rig.hand.add(m); rig.held = m;
  };

  // Animation Mensch
  L.animHuman = function (r, s) {
    const legs = r.legs, arms = r.arms, ph = s.phase || 0, sp = s.speed || 0;
    r.body.rotation.set(0, 0, 0); r.body.position.set(0, 0, 0);
    r.hips.position.y = 0.95; r.torso.rotation.set(0, 0, 0); r.neck.rotation.set(0, 0, 0);
    for (const l of legs) { l.leg.rotation.set(0, 0, 0); l.knee.rotation.set(0, 0, 0); }
    for (const a of arms) { a.arm.rotation.set(0, 0, 0); a.elbow.rotation.set(0, 0, 0); }
    const m = s.mode;
    if (m === 'dead') {
      r.body.rotation.x = -Math.PI / 2; r.body.position.set(0, 0.14, -0.95);
      arms[0].arm.rotation.z = 1.2; arms[1].arm.rotation.z = -1.4; legs[0].leg.rotation.z = 0.25; legs[1].leg.rotation.z = -0.2;
      return;
    }
    if (m === 'tumble') {
      r.body.rotation.x = s.tumble || 0; r.body.position.y = 0.4;
      arms[0].arm.rotation.z = 2; arms[1].arm.rotation.z = -2; legs[0].leg.rotation.x = -0.6; legs[1].leg.rotation.x = 0.5;
      return;
    }
    if (m === 'scooter') {
      legs[0].leg.rotation.x = -0.18; legs[1].leg.rotation.x = 0.22;
      legs[0].knee.rotation.x = 0.25; legs[1].knee.rotation.x = 0.15;
      for (const a of arms) { a.arm.rotation.x = -0.95; a.elbow.rotation.x = -0.35; }
      r.torso.rotation.x = 0.12;
      return;
    }
    if (m === 'sit' || m === 'ride') {
      r.hips.position.y = m === 'ride' ? 0.75 : 0.55;
      for (const l of legs) { l.leg.rotation.x = m === 'ride' ? -1.1 : -1.45; l.knee.rotation.x = m === 'ride' ? 1.3 : 1.45; }
      legs[0].leg.rotation.z = m === 'ride' ? 0.25 : 0; legs[1].leg.rotation.z = m === 'ride' ? -0.25 : 0;
      for (const a of arms) { a.arm.rotation.x = -1.05; a.elbow.rotation.x = -0.35; }
      r.torso.rotation.x = m === 'ride' ? 0.3 : 0;
      return;
    }
    if (m === 'crawl') {
      r.body.rotation.x = Math.PI / 2 * 0.94; r.body.position.set(0, 0.2, -0.9);
      r.neck.rotation.x = -1.15;
      for (let i = 0; i < 2; i++) {
        const w = Math.sin(ph + i * Math.PI) * sp;
        arms[i].arm.rotation.x = -2.6 + w * 0.55; arms[i].elbow.rotation.x = -0.6 - Math.max(0, w) * 0.5;
        legs[i].leg.rotation.x = -w * 0.35; legs[i].knee.rotation.x = 0.3 + Math.max(0, -w) * 0.8;
        legs[i].leg.rotation.z = (i ? -1 : 1) * 0.12;
      }
    } else if (m === 'crouch') {
      r.hips.position.y = 0.62; r.torso.rotation.x = 0.4; r.neck.rotation.x = -0.3;
      for (let i = 0; i < 2; i++) {
        const w = Math.sin(ph + i * Math.PI) * sp;
        legs[i].leg.rotation.x = -1.05 + w * 0.4; legs[i].knee.rotation.x = 1.55 - w * 0.25;
        arms[i].arm.rotation.x = -0.4 - w * 0.3; arms[i].elbow.rotation.x = -0.7;
      }
    } else if (m === 'jump') {
      for (const l of legs) { l.leg.rotation.x = -0.6; l.knee.rotation.x = 1.0; }
      arms[0].arm.rotation.z = 0.5; arms[1].arm.rotation.z = -0.5; arms[0].arm.rotation.x = arms[1].arm.rotation.x = -0.6;
    } else {
      const run = m === 'run', amp = (run ? 0.95 : 0.55) * sp;
      r.hips.position.y = 0.95 + (run ? Math.abs(Math.sin(ph)) * 0.06 : Math.abs(Math.sin(ph)) * 0.025 * sp);
      r.torso.rotation.x = run ? 0.25 : 0.03;
      for (let i = 0; i < 2; i++) {
        const w = Math.sin(ph + i * Math.PI);
        legs[i].leg.rotation.x = w * amp;
        legs[i].knee.rotation.x = Math.max(0, Math.sin(ph + i * Math.PI - 1.4)) * (run ? 1.5 : 0.8) * sp;
        arms[i].arm.rotation.x = -w * amp * 0.85;
        arms[i].elbow.rotation.x = run ? -1.3 : -0.2 * sp;
      }
      if (sp < 0.05) { const b = Math.sin(ph * 0.3) * 0.02; r.torso.rotation.x = b; arms[0].arm.rotation.z = 0.06; arms[1].arm.rotation.z = -0.06; }
    }
    // Oberkörper-Aktionen (rechter Arm = arms[0] hat die Hand)
    const ra = arms[0], la = arms[1];
    if (s.aim) {
      ra.arm.rotation.set(-Math.PI / 2 - (s.pitch || 0), 0, 0); ra.elbow.rotation.x = 0;
      la.arm.rotation.set(-1.35 - (s.pitch || 0), 0, -0.55); la.elbow.rotation.x = -0.5;
    }
    if (s.swing !== undefined && s.swing >= 0) {
      const t = s.swing;
      ra.arm.rotation.x = t < 0.35 ? L.lerp(-0.3, -2.9, t / 0.35) : L.lerp(-2.9, -0.4, Math.min(1, (t - 0.35) / 0.2));
      ra.elbow.rotation.x = t < 0.35 ? -0.8 : -0.15;
    }
    if (s.eat) { ra.arm.rotation.x = -1.9 + Math.sin(ph * 4) * 0.08; ra.elbow.rotation.x = -1.9; ra.arm.rotation.z = 0.35; }
    if (s.throwT !== undefined && s.throwT >= 0) {
      const t = s.throwT;
      ra.arm.rotation.x = t < 0.4 ? L.lerp(0, -2.8, t / 0.4) : L.lerp(-2.8, -1.0, Math.min(1, (t - 0.4) / 0.2));
    }
    if (m === 'crawl' && (s.aim || s.swing >= 0)) { ra.arm.rotation.x -= 0.6; }
  };

  // ---------- Viktor (vier Varianten) ----------
  const VIK = {
    grey: { body: '#8a867d', dark: '#4b4842', face: '#d8d1c1', hat: true },
    red: { body: '#7b2a24', dark: '#40140f', face: '#cdbfae', scarf: true },
    blue: { body: '#3b4e68', dark: '#1c2738', face: '#c6cbd3', tilt: 0.35 },
    lange: { body: '#2c2925', dark: '#141210', face: '#ebe5d8' }
  };
  let badgeTex = null, danielTex = null;
  L.buildViktor = function (v) {
    const V = VIK[v] || VIK.grey, s = v === 'lange' ? 1.25 : 1;
    const box = G().box, sph = G().sph;
    const root = new T.Group(), body = grp(root), hips = grp(body, 0, 1.46 * s, 0);
    const legs = [], arms = [];
    for (const sd of [-1, 1]) {
      const leg = grp(hips, sd * 0.07 * s, 0, 0);
      part(box, V.body, 0.065 * s, 0.73 * s, 0.065 * s, 0, -0.365 * s, 0, leg);
      const knee = grp(leg, 0, -0.73 * s, 0);
      part(box, V.body, 0.055 * s, 0.73 * s, 0.055 * s, 0, -0.365 * s, 0, knee);
      part(box, V.dark, 0.07 * s, 0.04 * s, 0.22 * s, 0, -0.74 * s, 0.07 * s, knee);
      legs.push({ leg, knee });
    }
    const torso = grp(hips);
    part(box, V.body, 0.1 * s, 0.5 * s, 0.075 * s, 0, 0.25 * s, 0, torso);
    part(box, V.body, 0.19 * s, 0.42 * s, 0.085 * s, 0, 0.68 * s, 0, torso);
    for (let i = 0; i < 4; i++) part(box, V.dark, 0.12 * s, 0.014 * s, 0.087 * s, 0, (0.12 + i * 0.09) * s, 0, torso, { noShadow: true });
    if (!badgeTex) badgeTex = L.textTex('VIKTOR', 128, 40, '#d9d3c3', '#111', 'bold 26px monospace');
    const badge = new T.Mesh(new T.PlaneGeometry(0.17 * s, 0.055 * s), new T.MeshLambertMaterial({ map: badgeTex }));
    badge.position.set(0, 0.78 * s, 0.044 * s); torso.add(badge);
    const neck = grp(torso, 0, 0.9 * s, 0);
    part(box, V.face, 0.035 * s, 0.3 * s, 0.035 * s, 0, 0.15 * s, 0, neck);
    const head = grp(neck, 0, 0.29 * s, 0);
    part(sph, V.face, 0.075 * s, 0.19 * s, 0.08 * s, 0, 0.17 * s, 0, head);
    part(sph, shade(V.face, 0.75), 0.05 * s, 0.18 * s, 0.07 * s, 0.03 * s, 0.17 * s, -0.01 * s, head, { noShadow: true });
    for (const sd of [-1, 1]) {
      const sock = part(sph, '#050404', 0.022 * s, 0.052 * s, 0.014 * s, sd * 0.032 * s, 0.24 * s, 0.07 * s, head, { noShadow: true });
      sock.rotation.z = sd * 0.15;
      part(sph, '#fffae6', 0.008 * s, 0.008 * s, 0.006 * s, sd * 0.032 * s, 0.232 * s, 0.083 * s, head, { basic: true, noShadow: true });
    }
    const mouth = part(sph, '#050404', 0.02 * s, 0.02 * s, 0.012 * s, 0, 0.085 * s, 0.075 * s, head, { noShadow: true });
    const teeth = grp(head, 0, 0.085 * s, 0.085 * s);
    for (let k = -3; k <= 3; k++) part(box, '#e9e2cf', 0.006 * s, 0.014 * s, 0.004 * s, k * 0.009 * s, 0, 0, teeth, { noShadow: true });
    teeth.visible = false;
    if (V.hat) {
      part(G().cyl, '#121010', 0.11 * s, 0.012 * s, 0.11 * s, 0, 0.355 * s, 0, head);
      part(G().cyl, '#121010', 0.07 * s, 0.2 * s, 0.07 * s, 0, 0.46 * s, 0, head);
    }
    if (V.scarf) {
      part(box, '#4a120e', 0.1 * s, 0.07 * s, 0.1 * s, 0, 0.03 * s, 0, neck);
      part(box, '#4a120e', 0.04 * s, 0.32 * s, 0.02 * s, 0.035 * s, -0.12 * s, 0.05 * s, neck);
    }
    for (const sd of [-1, 1]) {
      const arm = grp(torso, sd * 0.11 * s, 0.88 * s, 0);
      part(box, V.body, 0.048 * s, 0.84 * s, 0.048 * s, 0, -0.42 * s, 0, arm);
      const elbow = grp(arm, 0, -0.84 * s, 0);
      part(box, V.body, 0.042 * s, 1.1 * s, 0.042 * s, 0, -0.55 * s, 0, elbow);
      const hand = grp(elbow, 0, -1.1 * s, 0);
      const fingers = [];
      for (let f = 0; f < 4; f++) {
        const fg = grp(hand, (f - 1.5) * 0.02 * s, 0, 0);
        part(box, V.body, 0.013 * s, 0.24 * s, 0.013 * s, 0, -0.12 * s, 0, fg);
        fg.rotation.z = (f - 1.5) * 0.1; fingers.push(fg);
      }
      arms.push({ arm, elbow, hand, fingers });
    }
    return { root, body, hips, torso, neck, head, legs, arms, mouth, teeth, s, tilt: V.tilt || 0, kind: 'viktor' };
  };
  L.animViktor = function (r, st) {
    const s = r.s, ph = st.phase || 0, m = st.mode;
    r.body.rotation.set(0, 0, 0); r.body.position.set(0, 0, 0);
    r.hips.position.y = 1.46 * s; r.torso.rotation.set(0, 0, 0); r.neck.rotation.set(0, 0, r.tilt);
    r.head.rotation.set(0, 0, 0);
    for (const l of r.legs) { l.leg.rotation.set(0, 0, 0); l.knee.rotation.set(0, 0, 0); }
    for (const a of r.arms) { a.arm.rotation.set(0, 0, 0); a.elbow.rotation.set(0, 0, 0); for (const f of a.fingers) f.rotation.x = 0; }
    r.mouth.scale.set(0.02 * s, 0.02 * s, 0.012 * s); r.teeth.visible = false;
    if (m === 'dead') {
      r.body.rotation.x = -Math.PI / 2; r.body.position.set(0, 0.08, -1.4 * s);
      r.arms[0].arm.rotation.z = 1.4; r.arms[1].arm.rotation.z = -1.2; r.neck.rotation.z = 0.8;
      return;
    }
    if (m === 'crawl') {
      r.hips.position.y = 0.9 * s;
      r.torso.rotation.x = 1.25; r.neck.rotation.x = -1.05; r.head.rotation.z = Math.sin(ph * 0.5) * 0.3;
      for (let i = 0; i < 2; i++) {
        const w = Math.sin(ph + i * Math.PI);
        r.arms[i].arm.rotation.x = -1.25 + w * 0.45; r.arms[i].elbow.rotation.x = -1.25 + Math.max(0, w) * 0.4;
        r.arms[i].arm.rotation.z = (i ? -1 : 1) * 0.25;
        r.legs[i].leg.rotation.x = -0.9 - w * 0.35; r.legs[i].knee.rotation.x = 1.8;
        r.legs[i].leg.rotation.z = (i ? -1 : 1) * 0.2;
      }
      r.mouth.scale.y = 0.04 * s; r.teeth.visible = true;
      return;
    }
    if (m === 'alert') {
      // Kopf ruckt zum Geräusch, Arme spreizen sich, Maul auf
      r.neck.rotation.set(-0.25, 0, r.tilt + 0.65);
      r.torso.rotation.x = -0.08;
      r.arms[0].arm.rotation.set(-0.3, 0, 0.45); r.arms[1].arm.rotation.set(-0.3, 0, -0.45);
      for (const a of r.arms) for (const f of a.fingers) f.rotation.x = -0.5;
      r.mouth.scale.set(0.035 * s, 0.05 * s, 0.012 * s); r.teeth.visible = true;
      return;
    }
    const run = m === 'run', walk = m === 'walk';
    if (run || walk) {
      const amp = run ? 0.75 : 0.42;
      r.torso.rotation.x = run ? 0.3 : 0.08;
      r.hips.position.y = 1.46 * s + Math.abs(Math.sin(ph)) * 0.05 * s;
      for (let i = 0; i < 2; i++) {
        const w = Math.sin(ph + i * Math.PI);
        r.legs[i].leg.rotation.x = w * amp;
        r.legs[i].knee.rotation.x = Math.max(0, Math.sin(ph + i * Math.PI - 1.3)) * (run ? 1.2 : 0.6);
        r.arms[i].arm.rotation.x = -w * amp * 0.6 + (run ? -0.3 : 0);
        r.arms[i].arm.rotation.z = (i ? -1 : 1) * 0.08;
        r.arms[i].elbow.rotation.x = -0.15;
      }
      r.neck.rotation.x = Math.sin(ph * 0.5) * 0.1;
    } else if (m === 'search' || m === 'idle') {
      r.neck.rotation.y = Math.sin(ph * 0.6) * 0.9;
      r.neck.rotation.z = r.tilt + Math.sin(ph * 0.37) * 0.35;
      r.arms[0].arm.rotation.z = 0.08 + Math.sin(ph * 0.5) * 0.04; r.arms[1].arm.rotation.z = -0.08;
    }
    if (m === 'attack') {
      const t = st.atk || 0;
      r.torso.rotation.x = 0.3 + t * 0.3;
      for (const a of r.arms) { a.arm.rotation.x = L.lerp(-0.5, -1.9, Math.min(1, t * 2)); a.elbow.rotation.x = -0.2; for (const f of a.fingers) f.rotation.x = -0.4; }
      r.arms[0].arm.rotation.z = 0.25; r.arms[1].arm.rotation.z = -0.25;
      r.mouth.scale.set(0.04 * s, 0.06 * s, 0.012 * s); r.teeth.visible = true;
    }
  };

  // ---------- Daniel ----------
  L.buildDaniel = function () {
    const box = G().box, sph = G().sph, sk = '#8f766a', sd = '#5c4840';
    const root = new T.Group(), body = grp(root), hips = grp(body, 0, 1.15, 0);
    const legs = [], arms = [];
    for (const s of [-1, 1]) {
      const leg = grp(hips, s * 0.23, 0, 0);
      part(box, sk, 0.34, 0.6, 0.38, 0, -0.3, 0, leg);
      part(box, '#24252a', 0.4, 0.38, 0.44, 0, -0.14, 0, leg);
      const knee = grp(leg, 0, -0.6, 0);
      part(box, sk, 0.28, 0.5, 0.3, 0, -0.25, 0, knee);
      part(box, '#161311', 0.3, 0.1, 0.44, 0, -0.52, 0.06, knee);
      legs.push({ leg, knee });
    }
    const torso = grp(hips);
    part(box, sk, 0.78, 0.42, 0.5, 0, 0.21, 0, torso);
    part(box, '#121214', 0.82, 0.13, 0.54, 0, 0.02, 0, torso);
    if (!danielTex) danielTex = L.textTex('DANIEL', 128, 32, '#121214', '#d2b46a', 'bold 24px monospace');
    const plate = new T.Mesh(new T.PlaneGeometry(0.4, 0.1), new T.MeshLambertMaterial({ map: danielTex }));
    plate.position.set(0, 0.02, 0.272); torso.add(plate);
    part(box, sk, 1.2, 0.62, 0.64, 0, 0.72, 0, torso);
    for (const s of [-1, 1]) part(box, sd, 0.5, 0.24, 0.1, s * 0.27, 0.8, 0.31, torso);
    for (let r = 0; r < 3; r++) for (const s of [-1, 1]) part(box, sd, 0.13, 0.09, 0.06, s * 0.08, 0.34 + r * 0.11, 0.25, torso, { noShadow: true });
    part(box, sk, 0.62, 0.22, 0.42, 0, 1.08, -0.03, torso);
    for (const s of [-1, 1]) part(sph, sk, 0.32, 0.3, 0.32, s * 0.64, 0.95, 0, torso);
    const neck = grp(torso, 0, 1.12, 0);
    const head = grp(neck, 0, 0, 0.04);
    part(box, sk, 0.3, 0.36, 0.32, 0, 0.2, 0, head);
    part(box, '#2e221e', 0.32, 0.07, 0.34, 0, 0.4, 0, head);
    part(box, '#2e221e', 0.3, 0.035, 0.03, 0, 0.27, 0.165, head, { noShadow: true });
    for (const s of [-1, 1]) part(sph, '#ff3a20', 0.025, 0.02, 0.01, s * 0.07, 0.24, 0.165, head, { basic: true, noShadow: true });
    const mouth = part(box, '#080505', 0.08, 0.02, 0.01, 0, 0.1, 0.165, head, { noShadow: true });
    for (const s of [-1, 1]) {
      const arm = grp(torso, s * 0.74, 0.9, 0);
      part(sph, sk, 0.22, 0.36, 0.22, 0, -0.3, 0, arm);
      part(box, 'rgb(110,50,55)', 0.02, 0.4, 0.02, s * 0.12, -0.3, 0.12, arm, { noShadow: true });
      const elbow = grp(arm, 0, -0.6, 0);
      part(sph, sk, 0.18, 0.32, 0.18, 0, -0.28, 0, elbow);
      part(box, sd, 0.26, 0.24, 0.26, 0, -0.62, 0, elbow);
      arms.push({ arm, elbow });
    }
    return { root, body, hips, torso, neck, head, legs, arms, mouth, kind: 'daniel' };
  };
  L.animDaniel = function (r, st) {
    const ph = st.phase || 0, m = st.mode;
    r.body.rotation.set(0, 0, 0); r.body.position.set(0, 0, 0);
    r.hips.position.y = 1.15; r.torso.rotation.set(0, 0, 0); r.neck.rotation.set(0, 0, 0);
    for (const l of r.legs) { l.leg.rotation.set(0, 0, 0); l.knee.rotation.set(0, 0, 0); }
    for (let i = 0; i < 2; i++) { r.arms[i].arm.rotation.set(0, 0, (i ? -1 : 1) * 0.35); r.arms[i].elbow.rotation.set(-0.3, 0, 0); }
    r.mouth.scale.y = 0.02;
    if (m === 'dead') { r.body.rotation.x = -Math.PI / 2; r.body.position.set(0, 0.3, -1.1); return; }
    if (m === 'alert') {
      // Daniel richtet sich auf, ballt die Fäuste und brüllt
      r.torso.rotation.x = -0.12; r.neck.rotation.set(-0.2, 0, 0);
      for (let i = 0; i < 2; i++) { r.arms[i].arm.rotation.set(-0.7, 0, (i ? -1 : 1) * 0.6); r.arms[i].elbow.rotation.x = -1.4; }
      r.mouth.scale.y = 0.06;
      return;
    }
    if (m === 'walk' || m === 'run') {
      const run = m === 'run', amp = run ? 0.8 : 0.38;
      r.torso.rotation.x = run ? 0.32 : 0.05;
      r.body.rotation.z = Math.sin(ph) * (run ? 0.04 : 0.07);
      r.hips.position.y = 1.15 + Math.abs(Math.sin(ph)) * (run ? 0.08 : 0.03);
      for (let i = 0; i < 2; i++) {
        const w = Math.sin(ph + i * Math.PI);
        r.legs[i].leg.rotation.x = w * amp; r.legs[i].knee.rotation.x = Math.max(0, Math.sin(ph + i * Math.PI - 1.3)) * (run ? 1.2 : 0.6);
        r.arms[i].arm.rotation.x = -w * amp * 0.7; r.arms[i].elbow.rotation.x = run ? -1.2 : -0.4;
      }
      if (run) r.mouth.scale.y = 0.05;
    } else if (m === 'search' || m === 'idle') {
      r.neck.rotation.y = Math.sin(ph * 0.5) * 0.7;
      r.torso.scale.x = 1 + Math.sin(ph * 1.5) * 0.015;
    }
    if (m === 'attack') {
      const t = st.atk || 0, up = t < 0.5;
      for (const a of r.arms) { a.arm.rotation.x = up ? L.lerp(-0.3, -2.9, t * 2) : L.lerp(-2.9, -0.6, Math.min(1, (t - 0.5) * 4)); a.elbow.rotation.x = -0.3; }
      r.torso.rotation.x = up ? -0.15 : 0.4;
      r.mouth.scale.y = 0.06;
    }
  };

  // ---------- Stelzer (Alien-Läufer) und Koloss ----------
  const _d = new T.Vector3(), _b = new T.Vector3(), _o = new T.Vector3();
  L.ik = function (hip, foot, a, b, out, outward) {
    _d.subVectors(foot, hip);
    let len = _d.length();
    len = L.clamp(len, Math.abs(a - b) + 0.01, a + b - 0.01);
    _d.normalize();
    const along = (a * a - b * b + len * len) / (2 * len), h = Math.sqrt(Math.max(0, a * a - along * along));
    _b.copy(outward).multiplyScalar(0.35).add(UP).normalize();
    _b.addScaledVector(_d, -_b.dot(_d)).normalize();
    out.copy(hip).addScaledVector(_d, along).addScaledVector(_b, h);
  };
  L.seg = function (m, a, b) {
    _o.subVectors(b, a);
    const len = _o.length();
    m.position.copy(a).addScaledVector(_o, 0.5);
    m.quaternion.setFromUnitVectors(UP, _o.normalize());
    m.scale.y = len;
  };
  function alienLegs(root, n, r1, r2, mat) {
    const legs = [];
    for (let i = 0; i < n; i++) {
      const up = part(G().cyl, mat, r1, 1, r1, 0, 0, 0, root, { metal: 0.7, rough: 0.45 });
      const low = part(G().cyl, mat, r2, 1, r2, 0, 0, 0, root, { metal: 0.7, rough: 0.45 });
      const knee = part(G().sph, '#2a2018', r1 * 1.7, r1 * 1.7, r1 * 1.7, 0, 0, 0, root, { metal: 0.6, rough: 0.5 });
      const foot = part(G().cyl, '#2a2018', r1 * 2.4, r1 * 0.8, r1 * 2.4, 0, 0, 0, root, { metal: 0.6, rough: 0.5 });
      const glow = part(G().sph, '#ff6a20', r1 * 0.9, r1 * 0.9, r1 * 0.9, 0, 0, 0, root, { basic: true, noShadow: true });
      legs.push({ up, low, knee, foot, glow, angle: i / n * Math.PI * 2, footPos: new T.Vector3(), from: new T.Vector3(), to: new T.Vector3(), t: 1, hip: new T.Vector3(), kneePos: new T.Vector3() });
    }
    return legs;
  }
  L.buildWalker = function () {
    const root = new T.Group(), hull = grp(root);
    const metal = '#4a3b2c';
    part(G().sph, metal, 7, 1.9, 7, 0, 0, 0, hull, { metal: 0.75, rough: 0.4 });
    part(G().sph, '#5a4836', 4.2, 2.3, 4.2, 0, 1.1, -0.5, hull, { metal: 0.7, rough: 0.35 });
    part(G().cyl, '#ff5a1e', 7.06, 0.22, 7.06, 0, -0.1, 0, hull, { basic: true, noShadow: true });
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2;
      const fin = part(G().box, '#3a2c20', 0.3, 0.9, 2.4, Math.sin(a) * 5.6, 1.2, Math.cos(a) * 5.6, hull, { metal: 0.7, rough: 0.4 });
      fin.rotation.y = a;
    }
    const housing = part(G().cyl, '#2a2018', 1.5, 1.4, 1.5, 0, -0.3, 6.3, hull, { metal: 0.8, rough: 0.3 });
    housing.rotation.x = Math.PI / 2;
    const eye = part(G().sph, '#ff2a10', 1.05, 1.05, 0.55, 0, -0.3, 7.05, hull, { basic: true, noShadow: true });
    const cables = [];
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * Math.PI * 2, piv = grp(hull, Math.sin(a) * 2.5, -1.5, Math.cos(a) * 2.5);
      const len = 4 + Math.random() * 6;
      part(G().cyl, '#2a221a', 0.12, len, 0.12, 0, -len / 2, 0, piv, { noShadow: true });
      part(G().sph, '#ff6a20', 0.22, 0.22, 0.22, 0, -len, 0, piv, { basic: true, noShadow: true });
      cables.push(piv);
    }
    const legs = alienLegs(root, 3, 0.55, 0.4, '#3d3024');
    const cone = new T.Mesh(new T.ConeGeometry(1, 1, 24, 1, true).translate(0, -0.5, 0), new T.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.07, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }));
    root.add(cone);
    const spot = new T.Mesh(new T.CircleGeometry(1, 28), new T.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.3, blending: T.AdditiveBlending, depthWrite: false }));
    spot.rotation.x = -Math.PI / 2; root.add(spot);
    const beam = beamMesh(); root.add(beam.g);
    return { root, hull, eye, legs, cone, spot, beam, cables, legA: 14, legB: 15, hipR: 4.5, footR: 13 };
  };
  function beamMesh() {
    const g = new T.Group();
    const outer = new T.Mesh(G().cyl, new T.MeshBasicMaterial({ color: 0xff6a20, transparent: true, opacity: 0.55, blending: T.AdditiveBlending, depthWrite: false }));
    const core = new T.Mesh(G().cyl, new T.MeshBasicMaterial({ color: 0xfff0c0, transparent: true, opacity: 0.9, blending: T.AdditiveBlending, depthWrite: false }));
    g.add(outer); g.add(core); g.visible = false;
    return { g, outer, core };
  }
  L.setBeam = function (bm, a, b, width) {
    L.seg(bm.outer, a, b); L.seg(bm.core, a, b);
    bm.outer.scale.x = bm.outer.scale.z = width;
    bm.core.scale.x = bm.core.scale.z = width * 0.35;
  };
  // Der Koloss: Daniels Körper, Viktors Kopf und Spinnenarme, auf drei Alien-Beinen
  L.buildKoloss = function () {
    const root = new T.Group(), pelvis = grp(root);
    const sk = '#8f766a', sd = '#5c4840', box = G().box, sph = G().sph;
    part(sph, '#3d2f22', 6.5, 3.2, 6.5, 0, 0, 0, pelvis, { metal: 0.75, rough: 0.4 });
    part(G().cyl, '#ff3010', 6.6, 0.4, 6.6, 0, -0.4, 0, pelvis, { basic: true, noShadow: true });
    const torso = grp(pelvis, 0, 2.5, 0);
    part(box, sk, 6.5, 4.5, 4.6, 0, 2.2, 0, torso);
    part(box, '#121214', 7, 1.1, 5, 0, 0.6, 0, torso);
    if (!danielTex) danielTex = L.textTex('DANIEL', 128, 32, '#121214', '#d2b46a', 'bold 24px monospace');
    const plate = new T.Mesh(new T.PlaneGeometry(3.6, 0.9), new T.MeshLambertMaterial({ map: danielTex })); plate.position.set(0, 0.6, 2.52); torso.add(plate);
    part(box, sk, 11, 6, 6, 0, 7.4, 0, torso);
    for (const s of [-1, 1]) part(box, sd, 4.6, 2.2, 0.8, s * 2.5, 8.3, 3, torso);
    for (let r = 0; r < 3; r++) for (const s of [-1, 1]) part(box, sd, 1.2, 0.9, 0.6, s * 0.75, 3.4 + r * 1.05, 2.35, torso, { noShadow: true });
    const core = part(sph, '#ff2200', 1.5, 1.5, 0.8, 0, 6.3, 3.05, torso, { basic: true, noShadow: true });
    if (!badgeTex) badgeTex = L.textTex('VIKTOR', 128, 40, '#d9d3c3', '#111', 'bold 26px monospace');
    const badge = new T.Mesh(new T.PlaneGeometry(2.4, 0.75), new T.MeshLambertMaterial({ map: badgeTex })); badge.position.set(-3.2, 9.6, 3.02); torso.add(badge);
    part(box, sk, 6, 2.2, 4, 0, 10.9, -0.3, torso);
    for (const s of [-1, 1]) part(sph, sk, 3, 2.8, 3, s * 6, 9.4, 0, torso);
    const arms = [], thin = [];
    for (const s of [-1, 1]) {
      const arm = grp(torso, s * 6.8, 8.8, 0);
      part(sph, sk, 2.1, 3.4, 2.1, 0, -2.8, 0, arm);
      const elbow = grp(arm, 0, -5.6, 0);
      part(sph, sk, 1.7, 3, 1.7, 0, -2.6, 0, elbow);
      part(box, sd, 2.4, 2.2, 2.4, 0, -5.7, 0, elbow);
      arms.push({ arm, elbow });
      const ta = grp(torso, s * 3.6, 10.5, -2.3);
      part(box, '#2c2925', 0.45, 9, 0.45, 0, -4.5, 0, ta);
      const te = grp(ta, 0, -9, 0);
      part(box, '#2c2925', 0.38, 11, 0.38, 0, -5.5, 0, te);
      const th = grp(te, 0, -11, 0);
      for (let f = 0; f < 4; f++) { const fg = grp(th, (f - 1.5) * 0.25, 0, 0); part(box, '#2c2925', 0.13, 2.6, 0.13, 0, -1.3, 0, fg); fg.rotation.z = (f - 1.5) * 0.15; }
      thin.push({ arm: ta, elbow: te });
    }
    const neck = grp(torso, 0, 11.6, 0);
    part(box, '#ebe5d8', 0.45, 4, 0.45, 0, 2, 0, neck);
    const head = grp(neck, 0, 4, 0);
    part(sph, '#ebe5d8', 1.1, 2.7, 1.15, 0, 2.4, 0, head);
    for (const s of [-1, 1]) {
      part(sph, '#050404', 0.32, 0.72, 0.2, s * 0.45, 3.4, 1.0, head, { noShadow: true });
      part(sph, '#ff3a20', 0.13, 0.13, 0.08, s * 0.45, 3.3, 1.17, head, { basic: true, noShadow: true });
    }
    const mouth = part(sph, '#050404', 0.35, 0.3, 0.2, 0, 1.2, 1.0, head, { noShadow: true });
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * Math.PI * 2, sp = part(G().cone, '#4a3b2c', 0.25, 1.6, 0.25, Math.sin(a) * 0.9, 5.2, Math.cos(a) * 0.9, head, { metal: 0.7, rough: 0.4 });
      sp.rotation.set(Math.cos(a) * 0.35, 0, -Math.sin(a) * 0.35);
    }
    part(G().cyl, '#ff5a1e', 1.05, 0.15, 1.05, 0, 4.6, 0, head, { basic: true, noShadow: true });
    const legs = alienLegs(root, 3, 1.0, 0.75, '#3d3024');
    const beam = beamMesh(); root.add(beam.g);
    return { root, hull: pelvis, torso, arms, thin, neck, head, mouth, core, legs, beam, legA: 19, legB: 21, hipR: 5, footR: 17 };
  };

  // ---------- Fahrzeuge ----------
  L.VTYPES = {
    kleinwagen: { name: 'Kleinwagen', vmax: 140, acc: 6.5, hp: 100, kind: 'car', len: 3.8, wid: 1.7, off: 0.6, h: 1.45 },
    limousine: { name: 'Limousine', vmax: 185, acc: 7.5, hp: 120, kind: 'car', len: 4.8, wid: 1.85, off: 0.55, h: 1.45 },
    sportwagen: { name: 'Sportwagen', vmax: 260, acc: 12, hp: 90, kind: 'car', len: 4.4, wid: 1.9, off: 0.45, h: 1.2 },
    pickup: { name: 'Pickup', vmax: 165, acc: 6.8, hp: 160, kind: 'car', len: 5.2, wid: 2.0, off: 0.85, h: 1.8 },
    jeep: { name: 'Militär-Jeep', vmax: 135, acc: 7, hp: 230, kind: 'car', len: 4.3, wid: 2.0, off: 0.95, h: 1.7 },
    motorrad: { name: 'Motorrad', vmax: 220, acc: 12.5, hp: 60, kind: 'bike', len: 2.1, wid: 0.8, off: 0.6 },
    cross: { name: 'Crossmaschine', vmax: 150, acc: 10, hp: 60, kind: 'bike', len: 2.0, wid: 0.8, off: 0.95 },
    roller: { name: 'Roller', vmax: 75, acc: 5, hp: 40, kind: 'bike', len: 1.8, wid: 0.7, off: 0.5 },
    joyort10: { name: 'JOYOR T10', vmax: 100, acc: 9, hp: 45, kind: 'bike', scooter: true, electric: true, len: 1.3, wid: 0.6, off: 0.55 },
    joyort6e: { name: 'JOYOR T6E Pro', vmax: 100, acc: 8.5, hp: 50, kind: 'bike', scooter: true, electric: true, len: 1.3, wid: 0.65, off: 0.65 }
  };
  const CAR_COLORS = ['#b02a2a', '#2a4a8a', '#e8e8e8', '#1a1a1a', '#7a7a7a', '#c0a020', '#2a6a3a', '#5a2a6a', '#d06a20'];
  L.buildVehicle = function (type) {
    const t = L.VTYPES[type], root = new T.Group(), box = G().box;
    const color = type === 'jeep' ? '#4a5a3a' : L.pick(CAR_COLORS);
    const wheels = [], steer = [];
    const wheelGeo = new T.CylinderGeometry(1, 1, 1, 14).rotateZ(Math.PI / 2);
    const mkWheel = (x, y, z, r, w, parent) => {
      const piv = grp(parent || root, x, y, z);
      const wm = new T.Mesh(wheelGeo, L.mat('#151515')); wm.scale.set(w, r, r); wm.castShadow = true; piv.add(wm);
      const rim = new T.Mesh(wheelGeo, L.mat('#9a9a9a')); rim.scale.set(w * 1.05, r * 0.5, r * 0.5); piv.add(rim);
      wheels.push(wm); return piv;
    };
    let seat, seats, glassZ = 0;
    if (t.kind === 'car') {
      const L2 = t.len, W = t.wid, low = type === 'sportwagen';
      part(box, color, W, low ? 0.55 : 0.7, L2, 0, low ? 0.55 : 0.7, 0, root);
      if (type === 'pickup') {
        part(box, '#1d2228', W * 0.92, 0.7, L2 * 0.38, 0, 1.4, L2 * 0.08, root);
        part(box, color, W * 0.94, 0.08, L2 * 0.36, 0, 1.78, L2 * 0.08, root);
        for (const s of [-1, 1]) part(box, color, 0.08, 0.5, L2 * 0.4, s * W * 0.46, 1.25, -L2 * 0.27, root);
        part(box, color, W, 0.5, 0.08, 0, 1.25, -L2 * 0.48, root);
        glassZ = L2 * 0.28;
      } else if (type === 'jeep') {
        part(box, '#2a2a2a', W * 0.9, 0.08, 0.06, 0, 1.75, L2 * 0.12, root);
        for (const s of [-1, 1]) { part(box, '#2a2a2a', 0.08, 0.75, 0.08, s * W * 0.44, 1.4, L2 * 0.12, root); part(box, '#2a2a2a', 0.08, 0.9, 0.08, s * W * 0.44, 1.45, -L2 * 0.3, root); }
        part(box, '#2a2a2a', W * 0.9, 0.08, L2 * 0.42, 0, 1.88, -L2 * 0.09, root);
        part(box, '#5a6a4a', 0.5, 0.5, 0.25, 0, 1.0, -L2 * 0.5, root);
        glassZ = L2 * 0.12;
      } else {
        const ch = low ? 0.45 : 0.6, cl = L2 * (low ? 0.42 : 0.5);
        part(box, '#1d2228', W * 0.9, ch, cl, 0, (low ? 0.8 : 1.05) + ch / 2, -L2 * 0.05, root, { opacity: 0.85 });
        part(box, color, W * 0.92, 0.07, cl * 0.92, 0, (low ? 0.8 : 1.05) + ch + 0.03, -L2 * 0.05, root);
        glassZ = cl / 2 - L2 * 0.05;
      }
      for (const s of [-1, 1]) {
        part(box, '#fff8d0', 0.3, 0.14, 0.05, s * W * 0.33, low ? 0.65 : 0.8, L2 / 2 + 0.01, root, { basic: true, noShadow: true });
        part(box, '#c01010', 0.3, 0.12, 0.05, s * W * 0.35, low ? 0.65 : 0.85, -L2 / 2 - 0.01, root, { basic: true, noShadow: true });
      }
      const r = 0.36, wz = L2 * 0.33;
      for (const s of [-1, 1]) {
        steer.push(mkWheel(s * W * 0.46, r, wz, r, 0.25));
        mkWheel(s * W * 0.46, r, -wz, r, 0.25);
      }
      seat = { x: W * 0.22, y: 0.25, z: -L2 * 0.03 };
      // Fahrer, Beifahrer, zwei Rücksitze (Sportwagen nur zwei Sitze; beim Pickup sitzt man hinten auf der Ladefläche)
      const back = type === 'pickup' ? { y: 0.6, z: -L2 * 0.32 } : { y: 0.25, z: -L2 * 0.27 };
      seats = [seat, { x: -W * 0.22, y: 0.25, z: -L2 * 0.03 }];
      if (type !== 'sportwagen') seats.push({ x: W * 0.22, y: back.y, z: back.z }, { x: -W * 0.22, y: back.y, z: back.z });
    } else if (t.scooter) {
      // E-Roller: Trittbrett, Lenkstange, kleine Räder, Schriftzug
      const t10 = type === 'joyort10';
      const col = t10 ? '#1a1a1a' : '#2a2c33', acc = t10 ? '#e03a2a' : '#2a8ae0';
      const dw = t10 ? 0.22 : 0.27, wr = t10 ? 0.14 : 0.17;
      part(box, col, dw, 0.08, 1.0, 0, 0.22, 0, root);
      part(box, '#0e0e0e', dw * 0.9, 0.012, 0.88, 0, 0.265, 0, root);
      part(box, acc, dw + 0.01, 0.02, 1.0, 0, 0.2, 0, root);
      const stem = part(box, col, 0.06, 1.05, 0.06, 0, 0.75, 0.5, root);
      stem.rotation.x = -0.12;
      if (!t10) { for (const s of [-1, 1]) part(box, '#888', 0.04, 0.3, 0.04, s * 0.07, 0.34, 0.47, root); }
      part(box, '#222', 0.6, 0.04, 0.04, 0, 1.25, 0.57, root);
      for (const s of [-1, 1]) part(box, acc, 0.12, 0.05, 0.05, s * 0.26, 1.25, 0.57, root);
      part(box, '#fff8d0', 0.09, 0.06, 0.04, 0, 1.05, 0.6, root, { basic: true, noShadow: true });
      part(box, '#c01010', 0.12, 0.04, 0.03, 0, 0.3, -0.52, root, { basic: true, noShadow: true });
      const label = new T.Mesh(new T.PlaneGeometry(0.85, 0.075), new T.MeshLambertMaterial({ map: L.textTex(t.name, 512, 46, col, '#ffffff', 'bold 34px Arial'), side: T.DoubleSide }));
      label.rotation.y = Math.PI / 2; label.position.set(dw / 2 + 0.006, 0.22, 0); root.add(label);
      steer.push(mkWheel(0, wr, 0.55, wr, t10 ? 0.07 : 0.09));
      mkWheel(0, wr, -0.5, wr, t10 ? 0.07 : 0.09);
      seat = { x: 0, y: 0.27, z: -0.05 };
      seats = [seat, { x: 0, y: 0.27, z: -0.42 }];
    } else {
      const cc = type === 'cross' ? '#e0a020' : type === 'roller' ? '#6ab0d0' : color;
      part(box, '#2a2a2a', 0.18, 0.25, t.len * 0.6, 0, 0.55, 0, root);
      part(box, cc, 0.36, 0.3, 0.6, 0, 0.85, 0.25, root);
      part(box, '#111', 0.3, 0.12, 0.6, 0, 0.92, -0.3, root);
      part(box, '#888', 0.7, 0.05, 0.05, 0, 1.15, 0.65, root);
      part(box, '#fff8d0', 0.15, 0.15, 0.06, 0, 0.95, 0.78, root, { basic: true, noShadow: true });
      const r = type === 'roller' ? 0.26 : 0.34;
      steer.push(mkWheel(0, r, t.len * 0.4, r, 0.14));
      mkWheel(0, r, -t.len * 0.38, r, 0.16);
      seat = { x: 0, y: 0.15, z: -0.25 };
      seats = [seat, { x: 0, y: 0.22, z: -0.72 }];
    }
    root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    return { root, wheels, steer, seat, seats, glassZ, color };
  };
  L.buildHeli = function (color) {
    const root = new T.Group(), box = G().box;
    part(G().sph, color, 1.8, 1.6, 3.2, 0, 2, 0, root);
    part(box, '#1d2228', 1.6, 1, 1.4, 0, 2.4, 1.9, root, { opacity: 0.85 });
    part(box, color, 0.5, 0.6, 6, 0, 2.4, -4.5, root);
    part(box, color, 0.15, 1.6, 1, 0, 3.2, -7.3, root);
    for (const s of [-1, 1]) part(box, '#222', 0.12, 0.12, 4.5, s * 1.3, 0.3, 0, root);
    const rotor = grp(root, 0, 3.8, 0);
    part(box, '#1a1a1a', 0.4, 0.06, 13, 0, 0, 0, rotor); part(box, '#1a1a1a', 13, 0.06, 0.4, 0, 0, 0, rotor);
    root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    return { root, rotor };
  };

  // ---------- Gegenstände ----------
  L.buildItem = function (type, inHand) {
    const g = new T.Group(), box = G().box, cyl = G().cyl, sph = G().sph;
    const d = L.ITEMS[type] || {};
    const gun = (len, h, col, mag) => {
      part(box, col, 0.06, 0.08, len, 0, 0, len / 2 - 0.05, g);
      part(box, col, 0.05, 0.13, 0.06, 0, -0.08, 0, g).rotation.x = -0.2;
      if (mag) part(box, '#1a1a1a', 0.04, 0.12, 0.05, 0, -0.08, len * 0.4, g);
      part(box, '#111', 0.03, 0.03, 0.12, 0, 0.02, len, g);
    };
    switch (type) {
      case 'hammer':
        part(box, '#8a5a2b', 0.035, 0.36, 0.035, 0, -0.12, 0, g);
        part(box, '#7a7a80', 0.06, 0.07, 0.17, 0, -0.32, 0.02, g);
        break;
      case 'minipistole': gun(0.16, 0.1, '#2a2a2a'); break;
      case 'pistole': gun(0.22, 0.12, '#1a1a1a'); break;
      case 'schrotflinte': gun(0.85, 0.1, '#5a3a1a'); part(box, '#3a2a1a', 0.06, 0.12, 0.25, 0, -0.03, -0.15, g); break;
      case 'gewehr': gun(0.75, 0.1, '#2f3a28', true); part(box, '#2f3a28', 0.06, 0.12, 0.22, 0, -0.02, -0.14, g); break;
      case 'granate': part(sph, '#3d4a2a', 0.06, 0.075, 0.06, 0, 0, 0, g); part(box, '#999', 0.02, 0.06, 0.02, 0.02, 0.07, 0, g); break;
      case 'konserve': part(cyl, '#b8b8b8', 0.05, 0.1, 0.05, 0, 0, 0, g); part(cyl, '#c03a2a', 0.052, 0.06, 0.052, 0, 0, 0, g); break;
      case 'brot': part(box, '#b07a3a', 0.12, 0.08, 0.22, 0, 0, 0, g); break;
      case 'apfel': part(sph, '#c02a1a', 0.05, 0.05, 0.05, 0, 0, 0, g); break;
      case 'riegel': part(box, '#4a2a1a', 0.04, 0.02, 0.12, 0, 0, 0, g); break;
      case 'wasser': part(cyl, '#7ab8e8', 0.035, 0.22, 0.035, 0, 0, 0, g, { opacity: 0.8 }); part(cyl, '#2a6ac0', 0.02, 0.03, 0.02, 0, 0.12, 0, g); break;
      case 'cola': part(cyl, '#c01010', 0.035, 0.12, 0.035, 0, 0, 0, g); break;
      case 'saft': part(box, '#e8a020', 0.06, 0.14, 0.04, 0, 0, 0, g); break;
      case 'verband': part(box, '#f0f0f0', 0.1, 0.06, 0.1, 0, 0, 0, g); break;
      case 'medkit': part(box, '#f0f0f0', 0.22, 0.14, 0.16, 0, 0, 0, g); part(box, '#c01010', 0.12, 0.03, 0.161, 0, 0, 0, g); part(box, '#c01010', 0.03, 0.12, 0.161, 0, 0, 0, g); break;
      case '9mm': part(box, '#c0a020', 0.12, 0.08, 0.08, 0, 0, 0, g); break;
      case 'schrot': part(box, '#c03020', 0.12, 0.08, 0.08, 0, 0, 0, g); break;
      case 'gewehrmuni': part(box, '#6a5030', 0.14, 0.09, 0.1, 0, 0, 0, g); break;
      case 'sicherung': part(box, '#e0c020', 0.08, 0.14, 0.05, 0, 0, 0, g); part(box, '#111', 0.081, 0.04, 0.051, 0, 0, 0, g); break;
      case 'gold': part(box, '#e8c040', 0.16, 0.06, 0.08, 0, 0, 0, g, { emissive: '#604010' }); break;
      case 'uhr': part(cyl, '#d8b040', 0.05, 0.015, 0.05, 0, 0, 0, g, { emissive: '#302008' }); break;
      case 'artefakt': part(new T.OctahedronGeometry(1), '#a040ff', 0.08, 0.12, 0.08, 0, 0, 0, g, { basic: true }); break;
      case 'note': part(box, '#f4f0e0', 0.2, 0.005, 0.27, 0, 0, 0, g, { emissive: '#606050' }); break;
      default: part(box, '#888', 0.1, 0.1, 0.1, 0, 0, 0, g);
    }
    if (inHand) {
      if (d.slot === 'waffe') g.rotation.x = Math.PI / 2;
      if (type === 'hammer') g.rotation.x = 0;
    }
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    return g;
  };
})();
