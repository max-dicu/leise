'use strict';
// Insel-Bosse: jede Insel (nicht die Dimension) hat eigene Riesen-Bosse mit Kurzfilm und eine eigene Zuflucht.
// Auf Asgard: Thor, Odin und Loki (eigene Entwürfe nach den nordischen Sagen). Auf der Insel zählt nur, was dort passiert.
(function () {
  const L = window.L, T = THREE, P = L.player;
  const G = () => L.GEO;
  function part(geo, color, sx, sy, sz, x, y, z, parent, o) { const m = new T.Mesh(geo, L.mat(color, o)); m.scale.set(sx, sy, sz); m.position.set(x, y, z); m.castShadow = !(o && o.noShadow); if (parent) parent.add(m); return m; }
  const grp = (p, x, y, z) => { const g = new T.Group(); g.position.set(x || 0, y || 0, z || 0); if (p) p.add(g); return g; };

  // ---------- Bosse ----------
  const B = {
    thor: { name: 'THOR', title: 'Gott des Donners', icon: '⚡', kind: 'human', scale: 13, speed: 9, abil: ['bolt', 'stomp'], prop: 'hammer',
      app: { skin: '#e3b48f', hair: 'lang', hairColor: '#a83a1c', beard: 'vollbart', brows: 'buschig', mouth: 'ernst', top: 'weste', topColor: '#5a3a20', pants: 'cargo', pantsColor: '#3a3a2a', shoeType: 'stiefel', shoes: '#3a2a1a', build: 'extrem', height: 'sehr_gross', hat: 'stirnband', hatColor: '#8a8a8a' }, cape: '#7a1a1a' },
    odin: { name: 'ODIN', title: 'Der Allvater', icon: '🦅', kind: 'human', scale: 14, speed: 7, abil: ['throw', 'stomp'], prop: 'speer', proj: 'speer', ravens: true,
      app: { skin: '#d8b090', hair: 'lang', hairColor: '#b8b8b8', beard: 'langbart', brows: 'buschig', glasses: 'augenklappe', mouth: 'ernst', top: 'mantel', topColor: '#2a2a3a', pants: 'anzughose', pantsColor: '#1a1a24', shoeType: 'stiefel', shoes: '#1a1a1a', build: 'kraeftig', height: 'sehr_gross', hat: 'sonnenhut', hatColor: '#2a2a33' }, cape: '#1a1a2a' },
    loki: { name: 'LOKI', title: 'Der Gestaltwandler', icon: '🎭', kind: 'human', scale: 12, speed: 10, abil: ['clones', 'throw'], prop: 'dolch', proj: 'dolch',
      app: { skin: '#e8c8a8', hair: 'zurueck', hairColor: '#111111', beard: 'kinnbart', brows: 'boese', mouth: 'grinsen', top: 'mantel', topColor: '#3a2a4a', pants: 'skinny', pantsColor: '#141414', shoeType: 'stiefel', shoes: '#141414', build: 'schmal', height: 'sehr_gross', hat: 'keine' }, cape: '#2a1a3a' },
    ymir: { name: 'YMIR', title: 'Der Frostriese', icon: '🧊', kind: 'human', scale: 15, speed: 8.5, abil: ['frost', 'stomp'], spikes: '#dff2ff',
      app: { skin: '#bcd8f0', hair: 'wuschel', hairColor: '#f4f8ff', beard: 'langbart', brows: 'buschig', mouth: 'offen', top: 'tanktop', topColor: '#8aa8c8', pants: 'zerrissen', pantsColor: '#6a80a0', shoeType: 'barfuss', build: 'extrem', height: 'sehr_gross', hat: 'keine' } },
    lava: { name: 'LAVATITAN', title: 'Herz des Vulkans', icon: '🌋', kind: 'human', scale: 14, speed: 6.5, abil: ['erupt', 'throw'], proj: 'lava', glow: '#ff6a10',
      app: { skin: '#3a2a24', hair: 'glatze', mouth: 'zaehne', brows: 'boese', top: 'tanktop', topColor: '#2a1a14', pants: 'zerrissen', pantsColor: '#2a1a14', shoeType: 'barfuss', build: 'extrem', height: 'sehr_gross', hat: 'keine', eyes: '#ff8a20' } },
    geist: { name: 'GEISTERKÖNIGIN', title: 'Herrin der Gruft', icon: '👻', kind: 'human', scale: 12, speed: 8, abil: ['teleport', 'scream'], ghost: true,
      app: { skin: '#e8eef4', hair: 'lang', hairColor: '#f2f2f2', mouth: 'offen', top: 'mantel', topColor: '#d8e0e8', pants: 'rock', pantsColor: '#c8d0d8', shoeType: 'barfuss', build: 'schmal', height: 'sehr_gross', hat: 'krone', hatColor: '#9aa8b8', eyes: '#40e0ff' } },
    wurm: { name: 'SANDWURM', title: 'Schrecken der Dünen', icon: '🪱', kind: 'worm', speed: 14, abil: ['burrow'] },
    urwald: { name: 'URWALDWÄCHTER', title: 'Hüter des Dschungels', icon: '🌿', kind: 'beast', scale: 7, speed: 8, abil: ['throw', 'stomp'], proj: 'stein' },
    sporen: { name: 'SPORENKÖNIG', title: 'Der giftige Riese', icon: '🍄', kind: 'mush', speed: 6, abil: ['cloud', 'stomp'] },
    golem: { name: 'KRISTALLGOLEM', title: 'Wächter der Kristalle', icon: '💎', kind: 'crystal', speed: 7, abil: ['shards', 'stomp'], proj: 'splitter' }
  };
  B.nina = { name: 'NINA', title: 'Die Walross-Oma', icon: '👵', kind: 'human', scale: 11, speed: 5, abil: ['summon', 'sweep', 'sweep'], prop: 'besen', oma: true, life: 300,
    app: { skin: '#e8c0a0', hair: 'wellig', hairColor: '#d8d8dc', beard: 'kein', brows: 'dick', mouth: 'grinsen', nose: 'knubbel', eyes: '#4a2f1c', glasses: 'rund', glassesColor: '#8a6a3a', top: 'pullover', topColor: '#a04a6a', pants: 'rock', pantsColor: '#5a4a6a', shoeType: 'lackschuh', shoes: '#3a2a2a', build: 'kraeftig', height: 'mittel', hat: 'keine' } };
  const BIG = 2.5; // alle Insel-Bosse viel größer
  const BY_ISL = { oma: ['nina'], asgard: ['thor', 'odin', 'loki'], eis: ['ymir'], wueste: ['wurm'], dschungel: ['urwald'], vulkan: ['lava'], pilz: ['sporen'], kristall: ['golem'], geist: ['geist'] };
  L.ISLAND_BOSSES = B;

  // ---------- Modelle ----------
  function propOf(b, rig) {
    const hand = rig.hand; if (!hand) return;
    if (b.prop === 'hammer') { part(G().cyl, '#5a3a20', 0.04, 0.5, 0.04, 0, -0.1, 0, hand); part(G().box, '#8a8f96', 0.24, 0.16, 0.16, 0, -0.38, 0, hand); }
    else if (b.prop === 'speer') { const s = part(G().cyl, '#6a4a2a', 0.02, 1.6, 0.02, 0, 0.2, 0, hand); s.rotation.x = 0.2; part(G().cone, '#e8e8f0', 0.05, 0.18, 0.05, 0, 1.0, 0.16, hand, { basic: true }); }
    else if (b.prop === 'besen') {
      const bg = grp(hand, 0, 0, 0.03); bg.rotation.x = -1.1; rig.broom = bg;
      part(G().cyl, '#8a5a2a', 0.035, 1.6, 0.035, 0, -0.55, 0, bg);
      const br = grp(bg, 0, -1.3, 0);
      const head = new T.Mesh(new T.CylinderGeometry(0.09, 0.34, 0.8, 16, 1), L.mat('#e0bc5a')); head.position.y = -0.42; head.castShadow = true; br.add(head);
      for (let k = 0; k < 18; k++) { const a = k / 18 * 6.283, s2 = part(G().box, k % 2 ? '#c89a3a' : '#f0d070', 0.035, 0.85, 0.035, Math.sin(a) * 0.24, -0.45, Math.cos(a) * 0.24, br, { noShadow: true }); s2.rotation.set(Math.cos(a) * 0.35, 0, -Math.sin(a) * 0.35); }
      for (const y of [-0.06, -0.2]) { const ring = new T.Mesh(new T.CylinderGeometry(0.13 + (-y) * 0.5, 0.13 + (-y) * 0.5, 0.06, 14), L.mat('#b03a3a')); ring.position.y = y; br.add(ring); }
    }
    else if (b.prop === 'dolch') { part(G().box, '#c8c8d0', 0.03, 0.3, 0.06, 0, -0.25, 0, hand); part(G().box, '#3a2a4a', 0.1, 0.03, 0.04, 0, -0.1, 0, hand); }
  }
  function buildHumanBoss(b) {
    const rig = L.buildHuman(Object.assign({ name: b.name }, b.app), true);
    if (b.cape) { const c = grp(rig.torso, 0, 0.6, -0.2); part(G().box, b.cape, 0.62, 1.4, 0.03, 0, -0.7, 0, c); rig.cape = c; }
    if (b.spikes) for (const s of [-1, 1]) for (let k = 0; k < 3; k++) { const sp = part(G().cone, b.spikes, 0.06, 0.25, 0.06, s * (0.18 + k * 0.06), 0.66, -0.05 + k * 0.04, rig.torso, { noShadow: true }); sp.rotation.z = -s * 0.5; }
    if (b.glow) { rig.root.traverse((o) => { if (o.isMesh && o.material && o.material.color) o.material = o.material.clone(); }); for (let k = 0; k < 9; k++) part(G().box, b.glow, 0.02, 0.18 + (k % 3) * 0.08, 0.01, (k % 3 - 1) * 0.1, 0.15 + Math.floor(k / 3) * 0.17, 0.165, rig.torso, { basic: true, noShadow: true }).rotation.z = (k % 2 ? 0.4 : -0.4); }
    if (b.ghost) rig.root.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0.55; o.material.depthWrite = false; } });
    if (b.oma) {
      // dick, faltig, volles welliges Haar
      part(G().sph, b.app.topColor, 0.34, 0.32, 0.3, 0, 0.22, 0.1, rig.torso);
      part(G().sph, b.app.pantsColor, 0.36, 0.2, 0.3, 0, -0.05, 0, rig.hips);
      for (let k = 0; k < 11; k++) { const a = 1.0 + k * 0.42; part(G().sph, k % 2 ? b.app.hairColor : '#c8c8cc', 0.11, 0.1, 0.11, Math.sin(a) * 0.16, 0.2 + (k % 3) * 0.06, Math.cos(a) * 0.16 - 0.02, rig.head); }
      for (let k = 0; k < 3; k++) part(G().box, '#b08870', 0.12 - k * 0.02, 0.006, 0.005, 0, 0.255 + k * 0.018, 0.132, rig.head, { noShadow: true });
      for (const s of [-1, 1]) for (let k = 0; k < 2; k++) { const w = part(G().box, '#b08870', 0.04, 0.005, 0.005, s * 0.09, 0.13 - k * 0.025, 0.132, rig.head, { noShadow: true }); w.rotation.z = s * 0.5; }
    }
    propOf(b, rig);
    rig.root.scale.multiplyScalar(b.scale * BIG);
    return { rig, anim: (st) => { L.animHuman(rig, st); if (rig.cape) rig.cape.rotation.x = 0.1 + st.speed * 0.25; } };
  }
  function buildWorm() {
    const root = new T.Group(), segs = [];
    for (let k = 0; k < 16; k++) { const s = grp(root); const r = 4.2 - k * 0.18; part(G().sph, k % 2 ? '#b8905a' : '#a07848', r, r, r * 1.1, 0, 0, 0, s); if (k % 2) part(G().box, '#8a6a3a', r * 1.9, 0.4, r * 0.3, 0, 0, 0, s, { noShadow: true }); segs.push(s); }
    const h = segs[0];
    part(G().cyl, '#3a1010', 3.2, 0.6, 3.2, 0, 0, 3.5, h).rotation.x = Math.PI / 2;
    for (let k = 0; k < 14; k++) { const a = k / 14 * 6.283, t = part(G().cone, '#f2eee0', 0.35, 1.6, 0.35, Math.cos(a) * 2.6, Math.sin(a) * 2.6, 3.8, h, { noShadow: true }); t.rotation.x = Math.PI / 2; t.rotation.z = a; t.rotateX(0.5); }
    L.scene.add(root);
    return { rig: { root }, segs, anim: () => {} };
  }
  function buildMush() {
    const root = new T.Group(), body = grp(root), legs = [], arms = [];
    for (const s of [-1, 1]) { const l = grp(body, s * 3, 10, 0); part(G().cyl, '#e8dcc8', 1.6, 10, 1.6, 0, -5, 0, l); part(G().sph, '#c8b8a0', 2.2, 1.2, 2.8, 0, -10, 0.6, l); legs.push(l); }
    part(G().cyl, '#f0e6d4', 4.5, 12, 4.5, 0, 16, 0, body);
    const cap = part(G().sph, '#c02a2a', 13, 6, 13, 0, 24, 0, body);
    for (let k = 0; k < 14; k++) { const a = k * 2.4, r = 3 + (k % 4) * 2.4; part(G().sph, '#ffffff', 1.4, 0.7, 1.4, Math.cos(a) * r, 28.5 - r * 0.25, Math.sin(a) * r, body, { noShadow: true }); }
    for (const s of [-1, 1]) { part(G().sph, '#d8ff40', 0.9, 0.9, 0.5, s * 1.6, 19, 4.3, body, { basic: true, noShadow: true }); const a = grp(body, s * 4.8, 19, 0); part(G().cyl, '#e8dcc8', 1.1, 9, 1.1, 0, -4.5, 0, a); part(G().sph, '#c02a2a', 2, 2, 2, 0, -9.5, 0, a); arms.push(a); }
    root.scale.setScalar(BIG * 0.8); L.scene.add(root); cap.castShadow = true;
    return { rig: { root }, anim: (st) => { const w = Math.sin(st.phase) * st.speed; legs[0].rotation.x = w * 0.5; legs[1].rotation.x = -w * 0.5; arms[0].rotation.x = -w * 0.4 + (st.atk || 0) * -1.4; arms[1].rotation.x = w * 0.4 + (st.atk || 0) * -1.4; body.position.y = Math.abs(Math.sin(st.phase)) * 0.6 * st.speed; } };
  }
  function buildCrystal() {
    const root = new T.Group(), body = grp(root), legs = [], arms = [], cA = '#80d8ff', cB = '#c0a0ff';
    for (const s of [-1, 1]) { const l = grp(body, s * 3.4, 12, 0); part(G().box, '#5a6a80', 3, 12, 3, 0, -6, 0, l); part(G().cone, cA, 2.2, 4, 2.2, 0, -10, 1.6, l).rotation.x = 1.2; legs.push(l); }
    part(G().box, '#6a7a90', 10, 10, 6, 0, 17, 0, body);
    for (let k = 0; k < 12; k++) { const c = part(G().cone, k % 2 ? cA : cB, 1.2 + (k % 3) * 0.5, 5 + (k % 4) * 2, 1.2 + (k % 3) * 0.5, (k % 5 - 2) * 2, 22 + (k % 3), -2 + (k % 2) * 1.5, body, { noShadow: true }); c.rotation.set((k % 3 - 1) * 0.5, 0, (k % 5 - 2) * 0.25); }
    part(G().box, '#4a5a70', 5, 4, 4.5, 0, 24, 1, body);
    for (const s of [-1, 1]) { part(G().box, cA, 0.9, 0.6, 0.3, s * 1.2, 24.5, 3.3, body, { basic: true, noShadow: true }); const a = grp(body, s * 6.5, 21, 0); part(G().box, '#5a6a80', 2.6, 10, 2.6, 0, -5, 0, a); part(G().cone, cA, 2.4, 4, 2.4, 0, -11, 0, a).rotation.x = Math.PI; arms.push(a); }
    root.scale.setScalar(BIG * 0.8); L.scene.add(root);
    return { rig: { root }, anim: (st) => { const w = Math.sin(st.phase) * st.speed; legs[0].rotation.x = w * 0.45; legs[1].rotation.x = -w * 0.45; arms[0].rotation.x = -w * 0.35 + (st.atk || 0) * -1.6; arms[1].rotation.x = w * 0.35 + (st.atk || 0) * -1.6; } };
  }
  function buildBeast(b) {
    const rig = L.buildRufer(); rig.root.scale.setScalar(b.scale * BIG); L.tintRig(rig.root, '#3a6a2a', 0.65);
    for (let k = 0; k < 10; k++) part(G().sph, k % 2 ? '#2e7a2a' : '#5a8a30', 0.4, 0.3, 0.4, (k % 5 - 2) * 0.25, 1.6 + (k % 3) * 0.2, -0.3, rig.root, { noShadow: true });
    L.scene.add(rig.root);
    return { rig, anim: (st) => L.animBeast(rig, { mode: st.speed > 0.2 ? 'walk' : 'search', phase: st.phase }) };
  }
  function buildBoss(id) {
    const b = B[id];
    let m;
    if (b.kind === 'human') { m = buildHumanBoss(b); L.scene.add(m.rig.root); }
    else if (b.kind === 'worm') m = buildWorm();
    else if (b.kind === 'mush') m = buildMush();
    else if (b.kind === 'crystal') m = buildCrystal();
    else m = buildBeast(b);
    return m;
  }

  // ---------- Zuflucht auf jeder Insel ----------
  const SAFE_R = 8;
  function buildShelter(I) {
    let sx = I.x + 40, sz = I.z + 40;
    for (let k = 0; k < 60; k++) {
      const a = k * 0.9, d = 40 + k * 3, x = I.x + Math.sin(a) * d, z = I.z + Math.cos(a) * d;
      let ok = true; for (let i = -12; i <= 12 && ok; i += 4) for (let j = -12; j <= 12 && ok; j += 4) if (L.queryBoxes(x + i, z + j, 2).length) ok = false;
      if (ok) { sx = x; sz = z; break; }
    }
    const g = new T.Group(); L.scene.add(g); if (I.group) { L.scene.remove(g); I.group.add(g); }
    const col = I.bldCol[0], dark = '#2a2a30';
    part(G().cyl, '#5a5a62', SAFE_R + 1.5, 0.5, SAFE_R + 1.5, sx, 0.25, sz, g);
    const ring = new T.Mesh(new T.RingGeometry(SAFE_R - 0.6, SAFE_R, 48), new T.MeshBasicMaterial({ color: 0x40ffa0, transparent: true, opacity: 0.8, fog: false })); ring.rotation.x = -Math.PI / 2; ring.position.set(sx, 0.52, sz); g.add(ring);
    for (let k = 0; k < 8; k++) { if (k === 2) continue; const a = k / 8 * 6.283, px = sx + Math.sin(a) * (SAFE_R + 0.6), pz = sz + Math.cos(a) * (SAFE_R + 0.6); part(G().box, col, 1.2, 7, 1.2, px, 3.5, pz, g); L.addBox(px - 0.6, pz - 0.6, px + 0.6, pz + 0.6, 7, 'building'); }
    part(G().cone, dark, SAFE_R + 3, 5, SAFE_R + 3, sx, 9.5, sz, g);
    part(G().cyl, col, SAFE_R + 2, 0.6, SAFE_R + 2, sx, 7.2, sz, g);
    const sign = new T.Sprite(new T.SpriteMaterial({ map: L.textTex('🛡️ ZUFLUCHT', 512, 96, '#0c1a12', '#40ffa0', 'bold 60px Arial'), depthTest: true, fog: false })); sign.scale.set(9, 1.7, 1); sign.position.set(sx, 13.5, sz); g.add(sign);
    const beam = new T.Mesh(new T.CylinderGeometry(1.2, 1.2, 160, 10, 1, true), new T.MeshBasicMaterial({ color: 0x40ffa0, transparent: true, opacity: 0.22, blending: T.AdditiveBlending, depthWrite: false, fog: false })); beam.position.set(sx, 90, sz); g.add(beam);
    I.shelter = { x: sx, z: sz, ring };
  }
  const islandAt = (x, z) => { for (const I of L.ISL || []) if (!I.dim && Math.hypot(x - I.x, z - I.z) < I.r + 250) return I; return null; };
  L.islandAt = islandAt;
  L.islandSafe = (x, z) => { const I = islandAt(x, z); return !!(I && I.shelter && Math.hypot(x - I.shelter.x, z - I.shelter.z) < SAFE_R); };
  L.islandKeepOut = function (e) {
    if (!e.isl || !e.isl.shelter) return;
    const S = e.isl.shelter, dx = e.x - S.x, dz = e.z - S.z, d = Math.hypot(dx, dz);
    if (d < SAFE_R + 0.8) { const k = (SAFE_R + 1) / (d || 1); e.x = S.x + dx * k; e.z = S.z + dz * k; }
  };

  // ---------- Effekte und Angriffe ----------
  const fx = []; // {t, dur, kind, x, z, mesh, ...}
  const ringGeo = new T.RingGeometry(0.8, 1, 40);
  function telegraph(x, z, r, dur, color, onHit, kind) {
    const m = new T.Mesh(ringGeo, new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, side: T.DoubleSide, fog: false, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.15, z); m.scale.setScalar(r); L.scene.add(m);
    fx.push({ t: 0, dur, kind: 'tele', x, z, r, mesh: m, onHit, fxKind: kind });
  }
  function hurtIf(x, z, r, dmg, cause) {
    if (!P.alive || L.cine || (P.spawnProt > 0) || L.islandSafe(P.x, P.z)) return;
    const d = Math.hypot(P.x - x, P.z - z); if (d > r) return;
    const sneak = P.stance !== 'stand' && !P.vehicle;
    L.hurtPlayer(dmg * (sneak ? 0.6 : 1) * (1 - d / r * 0.4) * (L.md ? L.md.dmg : 1), cause);
    if (P.alive && !P.vehicle) { const k = 10; P.vx = (P.x - x) / (d || 1) * k; P.vz = (P.z - z) / (d || 1) * k; P.vy = 5; P.air = true; P.knockT = 0.8; }
  }
  function column(x, z, color, h) {
    const m = new T.Mesh(new T.CylinderGeometry(1.2, 2.4, h, 10, 1, true), new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, blending: T.AdditiveBlending, depthWrite: false, fog: false })); m.position.set(x, h / 2, z); L.scene.add(m);
    fx.push({ t: 0, dur: 0.45, kind: 'flash', mesh: m });
  }
  const PROJ = {
    speer: () => { const g = new T.Group(); part(G().cyl, '#e8e0a0', 0.5, 14, 0.5, 0, 0, 0, g, { basic: true }).rotation.x = Math.PI / 2; part(G().cone, '#ffffff', 1, 3, 1, 0, 0, 8, g, { basic: true }).rotation.x = Math.PI / 2; return g; },
    dolch: () => { const g = new T.Group(); part(G().box, '#b080ff', 0.5, 0.3, 5, 0, 0, 0, g, { basic: true }); return g; },
    lava: () => { const g = new T.Group(); part(G().sph, '#ff6a10', 3, 3, 3, 0, 0, 0, g, { basic: true }); return g; },
    stein: () => { const g = new T.Group(); part(G().sph, '#5a5040', 3, 2.6, 3, 0, 0, 0, g); part(G().sph, '#2e7a2a', 1.4, 1, 1.4, 0, 2, 0, g); return g; },
    splitter: () => { const g = new T.Group(); part(G().cone, '#80d8ff', 1, 5, 1, 0, 0, 0, g, { basic: true }).rotation.x = Math.PI / 2; return g; }
  };
  function throwAt(from, tx, tz, kind, dmg, cause) {
    const m = PROJ[kind](); L.scene.add(m);
    telegraph(tx, tz, 6, 1.6, 0xff4040, null);
    fx.push({ t: 0, dur: 1.6, kind: 'proj', mesh: m, sx: from.x, sy: from.y, sz: from.z, tx, tz, dmg, cause, pk: kind });
  }
  function updateFx(dt) {
    for (let i = fx.length - 1; i >= 0; i--) {
      const f = fx[i]; f.t += dt; const u = Math.min(1, f.t / f.dur);
      if (f.kind === 'tele') { f.mesh.material.opacity = 0.4 + Math.sin(f.t * 18) * 0.35; f.mesh.scale.setScalar(f.r * (0.3 + 0.7 * u)); if (u >= 1) { L.scene.remove(f.mesh); fx.splice(i, 1); if (f.onHit) f.onHit(); } }
      else if (f.kind === 'flash') { f.mesh.material.opacity = 0.9 * (1 - u); if (u >= 1) { L.scene.remove(f.mesh); fx.splice(i, 1); } }
      else if (f.kind === 'proj') {
        const x = L.lerp(f.sx, f.tx, u), z = L.lerp(f.sz, f.tz, u), y = L.lerp(f.sy, 0.5, u) + Math.sin(u * Math.PI) * 30;
        const px = f.mesh.position.x, py = f.mesh.position.y, pz = f.mesh.position.z;
        f.mesh.position.set(x, y, z); f.mesh.lookAt(x + (x - px), y + (y - py), z + (z - pz));
        if (f.pk === 'lava' && Math.random() < dt * 30) L.fx('#3a3a3a', x, y, z, 1, 0.5, { size: 1, life: 1.2 });
        if (u >= 1) { L.scene.remove(f.mesh); fx.splice(i, 1); L.fx(f.pk === 'splitter' ? '#80d8ff' : f.pk === 'dolch' ? '#b080ff' : '#ff8030', f.tx, 1, f.tz, 26, 10, { basic: true, size: 0.5, life: 0.9 }); L.decal(f.tx, f.tz, 3, '#1a1a1a'); L.snd.explosion({ x: f.tx, y: 1, z: f.tz }); hurtIf(f.tx, f.tz, 6.5, f.dmg, f.cause); }
      } else if (f.kind === 'cloud') {
        f.mesh.material.opacity = 0.35 * Math.min(1, f.t) * (1 - Math.max(0, u - 0.8) * 5); f.mesh.rotation.y += dt * 0.3;
        if (Math.random() < dt * 6) L.fx('#a0ff60', f.x + L.rand(-5, 5), L.rand(0.5, 4), f.z + L.rand(-5, 5), 1, 0.3, { size: 0.3, life: 1.2 });
        if (P.alive && Math.hypot(P.x - f.x, P.z - f.z) < 7 && !L.islandSafe(P.x, P.z) && !L.cine) { f.acc = (f.acc || 0) + dt * 9; if (f.acc >= 3) { L.hurtPlayer(f.acc, 'In der Giftwolke des Sporenkönigs erstickt'); f.acc = 0; } }
        if (u >= 1) { L.scene.remove(f.mesh); fx.splice(i, 1); }
      } else if (f.kind === 'clone') {
        const c = f; c.ph += dt * 6; const d = Math.hypot(P.x - c.x, P.z - c.z);
        if (d > 7) { const a = Math.atan2(P.x - c.x, P.z - c.z); c.x += Math.sin(a) * 9 * dt; c.z += Math.cos(a) * 9 * dt; c.yaw = a; }
        c.m.anim({ mode: 'run', phase: c.ph, speed: 1 }); c.m.rig.root.position.set(c.x, 0, c.z); c.m.rig.root.rotation.set(0, c.yaw, 0);
        if (d <= 7 || u >= 1) { L.fx('#b080ff', c.x, 8, c.z, 40, 10, { basic: true, size: 0.6, life: 1 }); L.scene.remove(c.m.rig.root); fx.splice(i, 1); if (d <= 7) L.msg('🎭 Nur ein Trugbild von Loki!', 1800); }
      }
    }
  }

  // ---------- Boss-Ablauf pro Insel ----------
  let boss = null;
  L.islandBoss = null;
  const homeOrDim = () => !L.curIsland || L.curIsland.dim;
  function nextFor(I) { const list = BY_ISL[I.id]; if (!list) return null; I.bossIdx = ((I.bossIdx === undefined ? Math.floor(Math.random() * list.length) - 1 : I.bossIdx) + 1) % list.length; return list[I.bossIdx]; }
  function spawn(I) {
    const id = nextFor(I); if (!id) return;
    const b = B[id], m = buildBoss(id);
    const a = Math.atan2(P.x - I.x, P.z - I.z) + Math.PI + L.rand(-0.6, 0.6), d = Math.min(I.r - 80, Math.max(160, Math.hypot(P.x - I.x, P.z - I.z) + 120));
    let x = P.x + Math.sin(a) * 140, z = P.z + Math.cos(a) * 140;
    if (Math.hypot(x - I.x, z - I.z) > I.r - 60) { x = I.x + Math.sin(a) * (I.r - 120); z = I.z + Math.cos(a) * (I.r - 120); }
    boss = L.islandBoss = { id, b, m, I, x, z, yaw: Math.atan2(P.x - x, P.z - z), ph: 0, life: 300, cd: 3, active: true, rise: 0, worm: id === 'wurm' ? { under: true, path: [] } : null, tpCd: 2, hist: [] };
    pose(0);
    L.banner(b.icon + ' ' + b.name, b.title + ' ist erwacht! Schleich oder lauf zur 🛡️ Zuflucht!');
    L.snd.boss && L.snd.boss();
    if (b.life) boss.life = b.life;
    boss.kind = 'iboss'; boss.rig = m.rig; boss.hp = boss.maxHp = BHP[id] || 5000; boss.hitR = 150; boss.bigR = 6 + (b.scale || 6) * BIG * 0.25;
    if (id === 'nina') { ninaIntro(); return; }
    // Kurzfilm: Kamera schaut auf den Boss
    const cx = x, cz = z, h = id === 'wurm' ? 25 : (b.scale || 1) * BIG * 1.6 + 8;
    if (L.startCine) L.startCine(b.icon + ' ' + b.name + ' – ' + b.title, 4.2, (t) => { const u = t / 4.2, ang = boss.yaw + 0.8 + u * 0.9, dist = 55 - u * 15; return { x: cx + Math.sin(ang) * dist * BIG, y: h * 0.5 + 6 + u * 8, z: cz + Math.cos(ang) * dist * BIG, lx: boss.x, ly: h * (id === 'wurm' ? 0.4 : 0.7), lz: boss.z }; });
    L.shake = Math.max(L.shake, 1.2);
  }
  // ---------- NINA: Mini-See, Schaum, Walrosse ----------
  const lakes = [], mins = [];
  // Leben der Insel-Bosse (jeder anders)
  const BHP = { thor: 6000, odin: 5500, loki: 4000, ymir: 7000, lava: 7000, geist: 3500, wurm: 8000, urwald: 5000, sporen: 5000, golem: 6500, nina: 4500 };
  const MINHP = { zimt: 350, roller: 300, naegel: 420, locken: 320, schaum: 330, strick: 380, kaktus: 450, auge: 300, gold: 600 };
  // Lebensbalken oben in der Mitte
  let hpBar = null, hpT = 0;
  L.showBossHp = function (name, hp, max) {
    if (!hpBar) { hpBar = document.createElement('div'); hpBar.id = 'bossHp'; hpBar.style.cssText = 'position:fixed;left:50%;top:58px;transform:translateX(-50%);width:min(420px,80vw);z-index:14;pointer-events:none;text-align:center;font-weight:800;color:#fff;text-shadow:0 1px 3px #000;font-size:14px'; hpBar.innerHTML = '<div></div><div style="height:12px;background:#0009;border:2px solid #fff;border-radius:7px;overflow:hidden;margin-top:2px"><i style="display:block;height:100%;background:linear-gradient(90deg,#c01a1a,#ff6a3a);width:100%"></i></div>'; document.body.appendChild(hpBar); }
    hpBar.hidden = false; hpBar.firstChild.textContent = name + ' – ' + Math.max(0, Math.ceil(hp)) + ' / ' + max;
    hpBar.querySelector('i').style.width = L.clamp(hp / max, 0, 1) * 100 + '%'; hpT = 8;
  };
  setInterval(() => { if (hpBar && !hpBar.hidden) { hpT -= 0.5; if (hpT <= 0 || L.state !== 'game') hpBar.hidden = true; } }, 500);
  L.islandTargets = function () {
    const a = [];
    if (boss && boss.active && boss.hp > 0 && !L.cine && boss.m && boss.m.rig.root.visible) a.push(boss);
    for (const m of mins) if (m.landed && !m.leave && !m.dead) { if (m.kind !== 'nmin') { m.kind = 'nmin'; m.rig = m.r; m.hp = m.maxHp = MINHP[m.v] || 350; m.hitR = 20; m.bigR = 3; } a.push(m); }
    return a;
  };
  L.islandHit = function (e, dmg, src) {
    if (!(dmg > 0)) return;
    if (e.kind === 'nmin') {
      if (e.dead) return; e.hp -= dmg; L.blood(e.x, 2.5 * (e.S || 1), e.z, 8);
      if (e.hp <= 0) { e.dead = true; e.leave = 0.01; L.blood(e.x, 2, e.z, 30, true); L.snd.splat && L.snd.splat({ x: e.x, y: 1, z: e.z }); if (src === P && L.gotKillCoins) L.gotKillCoins(40); }
      return;
    }
    if (e !== boss || boss.hp <= 0) return;
    boss.hp -= dmg; boss.life = Math.max(boss.life, 25);
    L.fx('#ff5030', boss.x, (boss.b.scale || 6) * BIG * 1.2, boss.z, 6, 6, { basic: true, size: 0.6, life: 0.5 });
    L.showBossHp(boss.b.icon + ' ' + boss.b.name, boss.hp, boss.maxHp);
    if (boss.hp <= 0) {
      const b = boss.b, x = boss.x, z = boss.z;
      L.explode(x, 4, z, 18, 0, null, true); L.shake = Math.max(L.shake, 1.5);
      L.banner('🏆 ' + b.name + ' BESIEGT!', 'Unglaublich! Sammle die Beute ein.');
      for (let i = 0; i < 4; i++) L.spawnItem(i < 2 ? 'artefakt' : 'gold', x + L.rand(-8, 8), z + L.rand(-8, 8), 1);
      if (src === P && L.gotBossCoins) L.gotBossCoins(300, b.name);
      if (L.bossReward) L.bossReward(boss.id, x, z, 0, 'defeat');
      despawn(null);
    }
  };
  const VARS = ['zimt', 'roller', 'naegel', 'locken', 'schaum', 'strick', 'kaktus', 'auge', 'gold', 'zimt', 'roller', 'naegel'];
  function makeLake(x, z) {
    const g = new T.Group(); g.position.set(x, 0, z); L.scene.add(g);
    const w = new T.Mesh(new T.CircleGeometry(7, 32), new T.MeshLambertMaterial({ color: 0x3a8ac0, transparent: true, opacity: 0.9 })); w.rotation.x = -Math.PI / 2; w.position.y = 0.06; g.add(w);
    for (let k = 0; k < 14; k++) { const a = k / 14 * 6.283; part(G().sph, k % 2 ? '#8a8a8a' : '#a8a098', 0.9, 0.5, 0.9, Math.sin(a) * 7.3, 0.2, Math.cos(a) * 7.3, g); }
    const foam = []; for (let k = 0; k < 16; k++) { const f = part(G().sph, '#ffffff', 0.6, 0.45, 0.6, L.rand(-4.5, 4.5), 0, L.rand(-4.5, 4.5), g, { noShadow: true }); f.visible = false; foam.push(f); }
    const lk = { g, x, z, foam, t: 0 }; lakes.push(lk); return lk;
  }
  function decorate(r, v) {
    const bd = r.body, box = G().box, sph = G().sph, cone = G().cone;
    if (v === 'zimt') { L.tintRig(r.root, '#b07840', 0.45); for (let k = 0; k < 3; k++) { const t2 = new T.Mesh(new T.TorusGeometry(1 - k * 0.3, 0.22, 8, 20), L.mat('#c08848')); t2.rotation.x = Math.PI / 2; t2.position.set(0, 1.05 + k * 0.12, -0.3); bd.add(t2); } for (let k = 0; k < 4; k++) part(box, '#fff8e8', 0.08, 0.04, 1.6, (k - 1.5) * 0.35, 1.35, -0.3, bd, { noShadow: true }).rotation.y = k * 0.6; }
    else if (v === 'roller') { part(box, '#1a1a1a', 1.3, 0.14, 3.4, 0, -1.08, 0, bd); part(box, '#e03a2a', 1.32, 0.05, 3.4, 0, -1.16, 0, bd); for (const z of [-1.5, 1.5]) { const w2 = part(G().cyl, '#111', 0.42, 0.3, 0.42, 0, -1.4, z, bd); w2.rotation.z = Math.PI / 2; } part(box, '#333', 0.1, 1.8, 0.1, 0, -0.2, 1.8, bd); part(box, '#333', 1.4, 0.1, 0.1, 0, 0.7, 1.8, bd); }
    else if (v === 'naegel') { for (const f of r.flips) for (let k = 0; k < 4; k++) { const n = part(cone, '#d0103a', 0.07, 0.9, 0.07, (k - 1.5) * 0.14, -0.1, 0.5, f, { noShadow: true }); n.rotation.x = Math.PI / 2; } }
    else if (v === 'locken') { for (let k = 0; k < 5; k++) { const c = part(G().cyl, k % 2 ? '#ff8fc0' : '#7fc8ff', 0.16, 0.5, 0.16, (k - 2) * 0.22, 0.65, -0.1, r.head); c.rotation.z = Math.PI / 2; } }
    else if (v === 'schaum') { L.tintRig(r.root, '#e8f0f8', 0.4); for (let k = 0; k < 14; k++) part(sph, '#ffffff', 0.35, 0.3, 0.35, L.rand(-1.2, 1.2), L.rand(0.4, 1.1), L.rand(-1.8, 1.8), bd, { noShadow: true }); }
    else if (v === 'strick') { part(sph, '#c02a4a', 1.58, 1.2, 1.7, 0, 0.05, -0.35, bd); for (let k = 0; k < 3; k++) { const t2 = new T.Mesh(new T.TorusGeometry(1.55, 0.08, 6, 24), L.mat('#ffffff')); t2.position.set(0, 0.05, -0.9 + k * 0.5); bd.add(t2); } }
    else if (v === 'kaktus') { L.tintRig(r.root, '#4a8a3a', 0.5); for (let k = 0; k < 16; k++) { const sp = part(cone, '#e8e0a0', 0.07, 0.5, 0.07, L.rand(-1, 1), 1.1 + Math.random() * 0.2, L.rand(-1.8, 1.4), bd, { noShadow: true }); sp.rotation.set(L.rand(-0.4, 0.4), 0, L.rand(-0.5, 0.5)); } }
    else if (v === 'auge') { for (let k = 0; k < 9; k++) { const x = L.rand(-1.1, 1.1), y = L.rand(0.2, 1.1), z = L.rand(-1.5, 1.6); part(sph, '#ffffff', 0.25, 0.25, 0.25, x, y, z, bd, { noShadow: true }); part(sph, '#111', 0.11, 0.11, 0.11, x * 1.08, y * 1.08, z + 0.15, bd, { noShadow: true }); } }
    else if (v === 'gold') { L.tintRig(r.root, '#d4af37', 0.35); part(cone, '#ffd040', 0.4, 0.5, 0.4, 0, 0.75, -0.1, r.head, { noShadow: true }); }
  }
  L.decorateWalross = decorate;
  L.WALROSS_VARS = ['zimt', 'roller', 'naegel', 'locken', 'schaum', 'strick', 'kaktus', 'auge', 'gold', ''];
  const STATS = { zimt: { dmg: 22, slow: 2.5 }, roller: { dmg: 25 }, naegel: { dmg: 40 }, locken: { dmg: 25 }, schaum: { dmg: 22, knock: 18 }, strick: { dmg: 28 }, kaktus: { dmg: 34 }, auge: { dmg: 25, hear: 1.6 }, gold: { dmg: 30 } };
  const NAMES = { zimt: 'Zimtschnecken-Walross', roller: 'E-Roller-Walross', naegel: 'Fingernagel-Walross', locken: 'Lockenwickler-Walross', schaum: 'Schaum-Walross', strick: 'Strickpulli-Walross', kaktus: 'Kaktus-Walross', auge: 'Hundert-Augen-Walross', gold: 'Gold-Walross' };
  function summon(lk, n) {
    for (let k = 0; k < n; k++) {
      const v = VARS[(mins.length + k) % VARS.length], r = L.buildWalross(); decorate(r, v); r.root.scale.setScalar(3); r.root.visible = false; L.scene.add(r.root);
      const a = Math.random() * 6.28, d = Math.random() * 4;
      mins.push({ r, v, x: lk.x, z: lk.z, yaw: a, ph: Math.random() * 6, emerge: -k * 0.5, cd: 0, lk, S: 3 });
    }
  }
  function updateLakes(dt) {
    for (const lk of lakes) { lk.t += dt; lk.foam.forEach((f, k) => { const on = lk.t > 0.5; f.visible = on; if (on) { const u = (lk.t * 1.5 + k * 0.37) % 1; f.position.y = u * 2.2; f.scale.setScalar(0.4 + u * 0.8); } }); if (lk.t > 0.5 && Math.random() < dt * 25) L.fx('#ffffff', lk.x + L.rand(-4, 4), 0.5, lk.z + L.rand(-4, 4), 2, 2, { size: 0.35, life: 1.2 }); }
  }
  function updateMins(dt, cine) {
    const I = boss && boss.I;
    for (let i = mins.length - 1; i >= 0; i--) {
      const m = mins[i]; m.ph += dt * 3;
      if (!m.landed) {
        m.emerge += dt;
        if (m.emerge < 0) { m.r.root.visible = false; continue; }
        m.r.root.visible = true;
        if (m.jx === undefined) {
          const a = Math.random() * 6.28, dd = 18 + Math.random() * 20; m.sx = m.lk.x; m.sz = m.lk.z; m.jx = m.lk.x + Math.sin(a) * dd; m.jz = m.lk.z + Math.cos(a) * dd; m.yaw = a;
          L.fx('#ffffff', m.sx, 0.5, m.sz, 40, 14, { size: 0.9, life: 1.2 }); L.fx('#7ac8ff', m.sx, 0.5, m.sz, 25, 10, { size: 0.6, life: 1 });
          L.snd.splat && L.snd.splat({ x: m.sx, y: 1, z: m.sz }); L.snd.walross && L.snd.walross({ x: m.sx, y: 3, z: m.sz });
        }
        const u = Math.min(1, m.emerge / 1.3);
        m.x = L.lerp(m.sx, m.jx, u); m.z = L.lerp(m.sz, m.jz, u);
        m.r.root.position.set(m.x, -7 + u * 7 + Math.sin(u * Math.PI) * 24, m.z);
        m.r.root.rotation.set(0, m.yaw, 0); m.r.root.rotateX(-0.9 + u * 1.5);
        L.animWalrossMon(m.r, { mode: 'run', phase: m.ph * 4 });
        if (u < 0.25 && Math.random() < dt * 30) L.fx('#e8f8ff', m.x, Math.max(0.5, m.r.root.position.y - 3), m.z, 2, 3, { size: 0.5, life: 0.8 });
        if (u >= 1) { m.landed = true; L.shake = Math.max(L.shake, 0.6); L.fx('#8a7a60', m.x, 0.5, m.z, 30, 12, { size: 0.8, life: 1.4 }); L.snd.stomp && L.snd.stomp({ x: m.x, y: 0, z: m.z }); m.r.root.rotation.set(0, m.yaw, 0); }
        continue;
      }
      if (m.leave) { m.leave += dt; m.r.root.position.y = -m.leave * 2.5; if (m.leave > 1.6) { L.scene.remove(m.r.root); mins.splice(i, 1); } continue; }
      if (cine) { L.animWalrossMon(m.r, { mode: 'search', phase: m.ph }); m.r.root.position.set(m.x, 0, m.z); continue; }
      // hören: wer nicht schleicht, wird gejagt (100 km/h). Wer schleicht, wird nur beim direkten Anrempeln bemerkt
      const st = STATS[m.v], d = Math.hypot(P.x - m.x, P.z - m.z), loud = P.stance === 'stand' || !!P.vehicle;
      const canHunt = P.alive && !P.gone && I && L.curIsland === I && !L.islandSafe(P.x, P.z) && !(P.spawnProt > 0) && !L.cine;
      const hunt = canHunt && ((loud && d < 130 * (st.hear || 1)) || d < 1.8 * (m.S || 1));
      let tx, tz, spd;
      if (hunt) { tx = P.x; tz = P.z; spd = 100 / 3.6; }
      else { m.wt = (m.wt || 0) - dt; if (!m.wx || m.wt <= 0) { const a = Math.random() * 6.28, dd = 6 + Math.random() * 30; m.wx = m.lk.x + Math.sin(a) * dd; m.wz = m.lk.z + Math.cos(a) * dd; m.wt = 4 + Math.random() * 4; } tx = m.wx; tz = m.wz; spd = 4; }
      const dd = Math.hypot(tx - m.x, tz - m.z);
      if (dd > 1.5) { m.yaw += L.angDiff(m.yaw, Math.atan2(tx - m.x, tz - m.z)) * Math.min(1, dt * 6); const n = Math.ceil(spd * dt / 1); for (let s = 0; s < n; s++) { L.collide(m.x + Math.sin(m.yaw) * spd * dt / n, m.z + Math.cos(m.yaw) * spd * dt / n, 1.4 * (m.S || 1), 0, RES); m.x = RES.x; m.z = RES.z; } }
      // zuschlagen
      m.cd -= dt;
      if (hunt && d < 2.8 * (m.S || 1) * 0.8 && m.cd <= 0) {
        m.cd = 1.3; L.hurtPlayer(st.dmg * (L.md ? L.md.dmg : 1), 'Von einem ' + NAMES[m.v] + ' erwischt');
        if (P.alive && !P.vehicle) { const k = st.knock || 9; P.vx = (P.x - m.x) / (d || 1) * k; P.vz = (P.z - m.z) / (d || 1) * k; P.vy = 4; P.air = true; P.knockT = 0.7; }
        if (st.slow) { P.slowT = st.slow; L.msg('🍥 Klebriger Zuckerguss – du bist langsamer!', 1500); }
        L.snd.splat && L.snd.splat({ x: m.x, y: 1, z: m.z });
      }
      L.animWalrossMon(m.r, { mode: hunt ? 'run' : 'walk', phase: m.ph * (hunt ? 2.5 : 1) });
      m.r.root.position.set(m.x, 0, m.z); m.r.root.rotation.set(0, m.yaw, 0);
    }
    if (P.slowT > 0) { P.slowT -= dt; P.vx *= 0.88; P.vz *= 0.88; }
  }
  const RES = { x: 0, z: 0 };
  function clearNina() { for (const lk of lakes) L.scene.remove(lk.g); lakes.length = 0; for (const m of mins) L.scene.remove(m.r.root); mins.length = 0; }
  // Kurzfilm: NINA erscheint, beschwört den See, Schaum quillt, die Walrosse kommen
  function ninaIntro() {
    const b0 = boss; b0.ct = 0; b0.intro = true;
    b0.lakeX = b0.x + Math.sin(b0.yaw) * 40; b0.lakeZ = b0.z + Math.cos(b0.yaw) * 40;
    L.banner('👵 NINA', 'Die Walross-Oma ist da! Schleich – die Walrosse hören dich sonst!');
    L.startCine('👵 NINA – DIE WALROSS-OMA', 11.5, (t) => {
      const B0 = boss || b0, fx2 = Math.sin(B0.yaw), fz2 = Math.cos(B0.yaw);
      if (t < 2.4) { const a = B0.yaw + 0.5 + t * 0.15; return { x: B0.x + Math.sin(a) * 80, y: 30, z: B0.z + Math.cos(a) * 80, lx: B0.x, ly: 38, lz: B0.z }; }
      if (t < 4.6) return { x: B0.lakeX + fz2 * 16 + fx2 * 10, y: 8, z: B0.lakeZ - fx2 * 16 + fz2 * 10, lx: B0.lakeX, ly: 1, lz: B0.lakeZ };
      const u = (t - 4.6) / 6.9; return { x: B0.lakeX + fx2 * (36 + u * 14) + fz2 * 18, y: 6 + u * 6, z: B0.lakeZ + fz2 * (36 + u * 14) - fx2 * 18, lx: B0.lakeX, ly: 11, lz: B0.lakeZ };
    });
  }
  // Boss nur hinstellen und bewegen lassen (während des Kurzfilms)
  function pose(dt) {
    const m = boss.m; boss.ph += dt;
    if (boss.id === 'nina') {
      boss.ct = (boss.ct || 0) + dt;
      if (boss.ct > 2.2 && !boss.lk) { boss.lk = makeLake(boss.lakeX, boss.lakeZ); L.snd.thunder && L.snd.thunder(0.3); L.shake = 0.8; }
      if (boss.ct > 4.4 && !boss.sum1) { boss.sum1 = true; summon(boss.lk, 10); }
      m.anim({ mode: 'walk', phase: 0, speed: 0 });
      const rig = m.rig; if (boss.ct > 1.6 && boss.ct < 4.6) { rig.arms[0].arm.rotation.x = -2.7; rig.arms[0].arm.rotation.z = 0.2; }
      rig.root.position.set(boss.x, 0, boss.z); rig.root.rotation.set(0, boss.yaw, 0);
      return;
    }
    if (boss.worm) { m.segs.forEach((s, k) => { const u = k / 15, up = Math.min(1, boss.ph / 2); s.position.set(Math.sin(boss.ph * 2 + k * 0.5) * 1.5, -6 + up * 30 * Math.max(0, 1 - u * 1.1) - k * 1.2, -k * 1.8); s.rotation.x = -1.2 * (1 - u); }); m.rig.root.position.set(boss.x, 0, boss.z); m.rig.root.rotation.y = boss.yaw; if (Math.random() < dt * 20) L.fx('#d8b878', boss.x + L.rand(-5, 5), 1, boss.z + L.rand(-5, 5), 2, 4, { size: 0.7, life: 1 }); return; }
    m.anim({ mode: 'walk', phase: boss.ph * 0.6, speed: 0.05, atk: 0 });
    m.rig.root.position.set(boss.x, boss.b.ghost ? 3 : 0, boss.z); m.rig.root.rotation.set(0, boss.yaw, 0);
  }
  function despawn(msg) {
    if (!boss) return;
    if (boss.ravens) for (const r of boss.ravens) L.scene.remove(r);
    for (const m of mins) m.leave = m.leave || 0.01;
    setTimeout(() => { for (const lk of lakes) L.scene.remove(lk.g); lakes.length = 0; }, 2000);
    L.scene.remove(boss.m.rig.root);
    for (let i = fx.length - 1; i >= 0; i--) { const f = fx[i]; if (f.kind === 'clone') { L.scene.remove(f.m.rig.root); fx.splice(i, 1); } }
    if (msg) L.msg(msg, 5000);
    boss.I.bossT = 600;
    boss = L.islandBoss = null;
  }
  function seeTarget() {
    if (!P.alive || P.gone || L.islandSafe(P.x, P.z) || (P.spawnProt > 0)) return null;
    const d = Math.hypot(P.x - boss.x, P.z - boss.z);
    if (L.hiddenFrom && L.hiddenFrom(P, d, 10)) return null;
    return P;
  }
  function updateBoss(dt) {
    const b = boss.b, m = boss.m, I = boss.I;
    boss.life -= dt; boss.cd -= dt; boss.ph += dt;
    if (boss.life <= 0) {
      // überlebt: Riesenkiste an der Zuflucht der Insel
      if (P.alive && !P.gone && L.curIsland === I && L.bossReward) { const S = I.shelter || { x: I.x, z: I.z }; L.bossReward(boss.id, S.x + 5, S.z, 0.5, 'survive'); }
      despawn(b.icon + ' ' + b.name + ' zieht sich zurück … (' + I.name + ')'); return;
    }
    const tgt = seeTarget();
    let tx = boss.tx, tz = boss.tz;
    if (tgt) { tx = tgt.x; tz = tgt.z; boss.lastSeen = 0; }
    else { boss.lastSeen = (boss.lastSeen || 0) + dt; if (tx === undefined || Math.hypot(tx - boss.x, tz - boss.z) < 15 || boss.lastSeen > 8) { const a = Math.random() * 6.28, dd = Math.random() * (I.r - 150); tx = I.x + Math.sin(a) * dd; tz = I.z + Math.cos(a) * dd; boss.lastSeen = 0; } }
    boss.tx = tx; boss.tz = tz;
    const dT = Math.hypot(tx - boss.x, tz - boss.z), dP = Math.hypot(P.x - boss.x, P.z - boss.z);
    let speed = 0;
    // Geisterkönigin: springt durch die Luft zu dir
    if (boss.id === 'geist') { boss.tpCd -= dt; if (tgt && boss.tpCd <= 0 && dP > 25) { boss.tpCd = 6; L.fx('#c8f0ff', boss.x, 10, boss.z, 50, 12, { basic: true, size: 0.7, life: 1 }); const a = Math.random() * 6.28; boss.x = P.x + Math.sin(a) * 16; boss.z = P.z + Math.cos(a) * 16; L.fx('#c8f0ff', boss.x, 10, boss.z, 50, 12, { basic: true, size: 0.7, life: 1 }); L.msg('👻 Die Geisterkönigin taucht direkt neben dir auf!', 2000); L.snd.langer && L.snd.langer({ x: boss.x, y: 5, z: boss.z }); } }
    if (dT > (tgt ? 14 : 8) && !(boss.atk > 0)) {
      speed = b.speed * (tgt ? 1 : 0.55);
      const want = Math.atan2(tx - boss.x, tz - boss.z);
      boss.yaw += L.clamp(L.angDiff(boss.yaw, want), -1.2 * dt, 1.2 * dt);
      boss.x += Math.sin(boss.yaw) * speed * dt; boss.z += Math.cos(boss.yaw) * speed * dt;
      const di = Math.hypot(boss.x - I.x, boss.z - I.z); if (di > I.r - 30) { boss.x = I.x + (boss.x - I.x) / di * (I.r - 30); boss.z = I.z + (boss.z - I.z) / di * (I.r - 30); }
    } else if (tgt) boss.yaw += L.clamp(L.angDiff(boss.yaw, Math.atan2(P.x - boss.x, P.z - boss.z)), -2 * dt, 2 * dt);
    // nicht in die Zuflucht hinein
    if (I.shelter) { const S = I.shelter, sd = Math.hypot(boss.x - S.x, boss.z - S.z), lim = SAFE_R + 6; if (sd < lim) { boss.x = S.x + (boss.x - S.x) / (sd || 1) * lim; boss.z = S.z + (boss.z - S.z) / (sd || 1) * lim; } }
    // Angriffe
    if (tgt && boss.cd <= 0) {
      const ab = L.pick(b.abil), hy = (b.scale || 10) * 1.5 * BIG;
      if (ab === 'stomp' && dP < 36) { boss.cd = 4; boss.atk = 1; telegraph(boss.x, boss.z, 32, 1.1, 0xff3030, () => { L.snd.stomp({ x: boss ? boss.x : P.x, y: 0, z: boss ? boss.z : P.z }); L.shake = Math.max(L.shake, 1.4); if (boss) { L.fx('#7a6a50', boss.x, 0.5, boss.z, 30, 12, { size: 0.4, life: 1.4 }); hurtIf(boss.x, boss.z, 32, 60, b.name + ' hat dich zertrampelt'); } }); }
      else if (ab === 'bolt') { boss.cd = 2.6; boss.atk = 0.8; const x = P.x + P.vx * 0.8, z = P.z + P.vz * 0.8; telegraph(x, z, 6, 1.2, 0x80c8ff, () => { column(x, z, 0xc8e0ff, 200); L.env.bolt = 1; L.snd.thunder(0.02); L.fx('#c8e0ff', x, 1, z, 30, 12, { basic: true, size: 0.6, life: 0.6 }); L.decal(x, z, 3, '#111'); hurtIf(x, z, 6, 50, 'Von Thors Blitz getroffen'); }); }
      else if (ab === 'erupt') { boss.cd = 2.8; boss.atk = 0.8; for (let k = 0; k < 3; k++) { const x = P.x + L.rand(-8, 8) * (k ? 1 : 0), z = P.z + L.rand(-8, 8) * (k ? 1 : 0); telegraph(x, z, 5, 1.3 + k * 0.25, 0xff6a10, () => { column(x, z, 0xff6a10, 40); L.fx('#ff6a10', x, 1, z, 30, 14, { basic: true, size: 0.6, life: 1 }); L.decal(x, z, 3, '#1a0a05'); hurtIf(x, z, 5, 40, 'Von einer Lava-Fontäne erwischt'); }); } }
      else if (ab === 'throw' && b.proj) { boss.cd = 2.4; boss.atk = 0.8; const from = { x: boss.x + Math.sin(boss.yaw) * 4, y: hy, z: boss.z + Math.cos(boss.yaw) * 4 }; throwAt(from, P.x + P.vx * 1.4, P.z + P.vz * 1.4, b.proj, 45, b.proj === 'speer' ? 'Von Odins Speer durchbohrt' : b.proj === 'dolch' ? 'Von Lokis Dolch getroffen' : b.proj === 'lava' ? 'Von einem Lavabrocken getroffen' : 'Von einem Felsbrocken getroffen'); }
      else if (ab === 'shards') { boss.cd = 3; boss.atk = 0.8; for (let k = -1; k <= 1; k++) { const from = { x: boss.x, y: 22, z: boss.z }; throwAt(from, P.x + k * 7 + P.vx, P.z + P.vz, 'splitter', 35, 'Von Kristallsplittern durchbohrt'); } }
      else if (ab === 'frost' && dP < 45) { boss.cd = 4; boss.atk = 1; boss.frost = 2.2; L.msg('🧊 Ymir atmet eisige Kälte!', 1800); }
      else if (ab === 'cloud') { boss.cd = 4.5; boss.atk = 0.8; const m2 = new T.Mesh(G().sph, new T.MeshBasicMaterial({ color: 0x90e040, transparent: true, opacity: 0, depthWrite: false, fog: false })); m2.scale.set(7, 4, 7); m2.position.set(P.x, 3, P.z); L.scene.add(m2); fx.push({ t: 0, dur: 9, kind: 'cloud', mesh: m2, x: P.x, z: P.z }); L.msg('☠️ Giftsporen! Raus aus der Wolke!', 2000); }
      else if (ab === 'clones') { boss.cd = 7; boss.atk = 0.8; for (let k = 0; k < 3; k++) { const cm = buildHumanBoss(b); L.scene.add(cm.rig.root); const a = k / 3 * 6.28 + Math.random(), cx = P.x + Math.sin(a) * 45, cz = P.z + Math.cos(a) * 45; fx.push({ t: 0, dur: 10, kind: 'clone', m: cm, x: cx, z: cz, yaw: 0, ph: k }); L.fx('#b080ff', cx, 8, cz, 30, 10, { basic: true, size: 0.6, life: 1 }); } L.msg('🎭 Loki teilt sich – welcher ist der echte?', 2500); }
      else if (ab === 'scream' && dP < 40) { boss.cd = 5; boss.atk = 1; telegraph(boss.x, boss.z, 28, 1.3, 0xc8f0ff, () => { L.snd.langer && L.snd.langer({ x: P.x, y: 2, z: P.z }); L.shake = Math.max(L.shake, 1); if (boss) hurtIf(boss.x, boss.z, 28, 35, 'Vom Schrei der Geisterkönigin umgeworfen'); }); }
      else if (ab === 'summon') { boss.cd = 7; if (mins.length < 16) { boss.atk = 1.4; const a = Math.atan2(P.x - boss.x, P.z - boss.z) + L.rand(-0.8, 0.8), x = boss.x + Math.sin(a) * 25, z = boss.z + Math.cos(a) * 25; telegraph(x, z, 7, 1.6, 0x3a8ac0, () => { if (!boss) return; summon(makeLake(x, z), 4); L.msg('🫧 NINA beschwört einen neuen See – noch mehr Walrosse!', 2500); }); } }
      else if (ab === 'sweep' && dP < 30) { boss.cd = 3.5; boss.atk = 1; const x = boss.x + Math.sin(boss.yaw) * 12, z = boss.z + Math.cos(boss.yaw) * 12; telegraph(x, z, 13, 1.1, 0xff60a0, () => { if (boss) { L.fx('#d8b860', x, 1, z, 30, 10, { size: 0.4, life: 1 }); hurtIf(x, z, 13, 38, 'Von Ninas Kehrbesen weggefegt'); } }); }
      else if (ab === 'teleport') boss.cd = 1;
      else boss.cd = 0.5;
    }
    // Ymirs Frostatem: Kegel nach vorne
    if (boss.frost > 0) {
      boss.frost -= dt;
      for (let k = 0; k < 6; k++) { const s = Math.random() * 40, sp = (Math.random() - 0.5) * s * 0.5; L.fx(Math.random() < 0.5 ? '#e8f8ff' : '#a8d8ff', boss.x + Math.sin(boss.yaw) * (8 + s) + Math.cos(boss.yaw) * sp, 18 - s * 0.4, boss.z + Math.cos(boss.yaw) * (8 + s) - Math.sin(boss.yaw) * sp, 1, 2, { size: 0.8, life: 0.7 }); }
      const ang = Math.abs(L.angDiff(boss.yaw, Math.atan2(P.x - boss.x, P.z - boss.z)));
      if (dP < 48 && ang < 0.45 && P.alive && !L.islandSafe(P.x, P.z) && !L.cine) { boss.fAcc = (boss.fAcc || 0) + dt * 22; P.vx *= 0.9; P.vz *= 0.9; if (boss.fAcc >= 4) { L.hurtPlayer(boss.fAcc, 'Von Ymirs Frostatem erfroren'); boss.fAcc = 0; } }
    }
    boss.atk = Math.max(0, (boss.atk || 0) - dt);
    // Sandwurm: unter dem Sand, taucht unter dir auf
    if (boss.worm) {
      const W = boss.worm;
      W.t = (W.t || 0) + dt;
      if (W.under) {
        if (Math.random() < dt * 12) L.fx('#d8b878', boss.x + L.rand(-4, 4), 0.5, boss.z + L.rand(-4, 4), 2, 3, { size: 0.6, life: 1 });
        if (Math.random() < dt * 1.5) L.shake = Math.max(L.shake, Math.max(0, 0.6 - dP / 200));
        if (tgt && dP < 12 && !W.tele) { W.tele = true; boss.cd = 99; telegraph(P.x, P.z, 9, 1.4, 0xd8a050, () => { if (!boss) return; W.under = false; W.t = 0; W.x = boss.x = W.px; W.z = boss.z = W.pz; hurtIf(W.px, W.pz, 9, 65, 'Vom Sandwurm verschlungen'); L.shake = 1.6; L.snd.stomp({ x: W.px, y: 0, z: W.pz }); L.fx('#d8b878', W.px, 2, W.pz, 60, 16, { size: 0.8, life: 1.6 }); }); W.px = P.x; W.pz = P.z; L.msg('🪱 Der Boden bebt unter dir – WEG HIER!', 1500); }
      } else if (W.t > 2.6) { W.under = true; W.tele = false; boss.cd = 1; }
      const up = W.under ? 0 : Math.sin(Math.min(1, W.t / 2.6) * Math.PI);
      m.segs.forEach((s, k) => { const u = k / 15; const y = W.under ? -12 : -6 + up * 34 * Math.max(0, 1 - u * 1.1) + Math.sin(boss.ph * 3 + k) * 0.5; s.position.set(Math.sin(boss.ph * 2 + k * 0.5) * 1.5, y - k * 1.2 * (W.under ? 0 : 1), -k * 3.6 * (W.under ? 1 : 0.5)); s.rotation.x = W.under ? 0 : -1.2 * (1 - u); });
      m.rig.root.position.set(boss.x, 0, boss.z); m.rig.root.rotation.y = boss.yaw;
    } else {
      const st = { mode: speed > 0.5 ? (tgt ? 'run' : 'walk') : 'walk', phase: boss.ph * (speed > 0.5 ? 2.2 : 0.6), speed: speed > 0.5 ? 1 : 0.05, atk: boss.atk };
      if (boss.atk > 0 && boss.b.kind === 'human') st.swing = 1 - boss.atk;
      m.anim(st);
      const fly = b.ghost ? 3 + Math.sin(boss.ph * 1.5) * 1.5 : 0;
      m.rig.root.position.set(boss.x, fly, boss.z); m.rig.root.rotation.set(0, boss.yaw, 0);
      if (speed > 0.5 && Math.random() < dt * (speed / 3)) { L.snd.stomp && Math.random() < 0.15 && L.snd.stomp({ x: boss.x, y: 0, z: boss.z }); L.fx('#7a6a50', boss.x, 0.5, boss.z, 4, 4, { size: 0.4, life: 0.8 }); }
    }
    // Odins Raben kreisen über dir
    if (b.ravens) {
      if (!boss.ravens) { boss.ravens = []; for (let k = 0; k < 2; k++) { const r = new T.Group(); part(G().sph, '#111', 0.8, 0.6, 1.4, 0, 0, 0, r); for (const s of [-1, 1]) { const w = part(G().box, '#111', 2.4, 0.1, 0.9, s * 1.4, 0, 0, r); w.userData.s = s; } L.scene.add(r); boss.ravens.push(r); } }
      boss.ravens.forEach((r, k) => { const a = boss.ph * 0.9 + k * Math.PI; r.position.set(P.x + Math.sin(a) * 18, 22 + Math.sin(boss.ph * 2 + k) * 2, P.z + Math.cos(a) * 18); r.rotation.y = a + Math.PI / 2; r.children.forEach((c) => { if (c.userData.s) c.rotation.z = c.userData.s * Math.sin(boss.ph * 10) * 0.5; }); });
    }
  }
  function cleanupRavens() { if (boss && boss.ravens) for (const r of boss.ravens) L.scene.remove(r); }

  // ---------- jedes Bild ----------
  L.updateIslandBosses = function (dt) {
    for (const I of L.ISL || []) if (!I.dim && I.built && !I.shelter && BY_ISL[I.id]) buildShelter(I);
    const I = L.curIsland;
    for (const J of L.ISL || []) if (J.shelter) J.shelter.ring.material.color.setHex(boss && boss.I === J ? 0x40ffa0 : 0x40c0ff);
    updateFx(dt);
    updateLakes(dt); updateMins(dt, !!L.cine);
    if (boss) {
      if (L.state !== 'game' || (I !== boss.I && P.alive) || (L.round && L.round.over)) { cleanupRavens(); despawn(I !== boss.I ? null : null); return; }
      if (!L.cine) updateBoss(dt); else pose(dt);
      return;
    }
    if (!I || I.dim || !BY_ISL[I.id] || L.state !== 'game' || !P.alive || L.cine) return;
    if (I.bossT === undefined) I.bossT = L.rand(70, 110);
    I.bossT -= dt;
    if (I.bossT <= 12 && !I.warned) { I.warned = true; const nx = B[BY_ISL[I.id][((I.bossIdx === undefined ? -1 : I.bossIdx) + 1) % BY_ISL[I.id].length]]; L.msg('⚠️ Der Boden zittert … ' + (I.id === 'asgard' ? 'ein Gott' : 'ein Riese') + ' erwacht gleich auf ' + I.name + '! Zur 🛡️ Zuflucht oder schleichen!', 6000); }
    if (I.bossT <= 0) { I.warned = false; spawn(I); }
  };
  // Timer-Text für die Anzeige
  L.islandBossText = function () {
    if (L.inMoon && L.inMoon(P.x)) return L.moonBossText ? L.moonBossText() : null;
    if (L.inDim(P.x)) return L.dimBossText ? L.dimBossText() : null;
    const I = L.curIsland; if (!I || I.dim || !BY_ISL[I.id]) return null;
    if (boss && boss.I === I) return `${boss.b.icon} ${boss.b.name} ist da – noch ${L.fmt(Math.max(0, boss.life))} · 🛡️ Zuflucht = sicher`;
    const list = BY_ISL[I.id], nx = B[list[((I.bossIdx === undefined ? -1 : I.bossIdx) + 1) % list.length]];
    return `${nx.icon} ${I.id === 'asgard' ? 'Ein Gott' : nx.name} in ${L.fmt(Math.max(0, I.bossT === undefined ? 90 : I.bossT))}`;
  };
  // Wegweiser zur Zuflucht, solange ein Insel-Boss da ist
  L.islandNav = function () { const mn = L.moonNav && L.moonNav(); if (mn) return mn; const I = L.curIsland; if (!boss || !I || boss.I !== I || !I.shelter || L.islandSafe(P.x, P.z)) return null; return I.shelter; };
  L.clearIslandBosses = function () { clearNina(); cleanupRavens(); if (boss) { L.scene.remove(boss.m.rig.root); boss = L.islandBoss = null; } for (const f of fx) { if (f.mesh) L.scene.remove(f.mesh); if (f.m) L.scene.remove(f.m.rig.root); } fx.length = 0; for (const I of L.ISL || []) { I.bossT = undefined; I.warned = false; } };
})();
