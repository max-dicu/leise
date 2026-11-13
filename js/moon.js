'use strict';
// Der Mond: Mit der Rakete von der Heimatinsel hinfliegen. Weltall mit Erde, schwarzen Löchern, Wurmloch, Planeten, Nebeln.
// Aliens, Mondfahrzeuge – und BERNHARD DER VERSCHLUCKER: frisst die Erde und dann den Mond. Einziger sicherer Ort: der Burger.
(function () {
  const L = window.L, T = THREE, P = L.player;
  const G = () => L.GEO;
  const MOON = L.MOON = { x: 120000, z: 0 }, MR = 1400;
  L.inMoon = (x) => x > 100000;
  function part(geo, color, sx, sy, sz, x, y, z, parent, o) { const m = new T.Mesh(geo, L.mat(color, o)); m.scale.set(sx, sy, sz); m.position.set(x, y, z); if (parent) parent.add(m); return m; }
  const basic = (c, o) => new T.MeshBasicMaterial(Object.assign({ color: c, fog: false }, o || {}));
  // Boden des Mondes: eine große Scheibe, daneben die Leere
  setTimeout(() => { const od = L.dimLand; L.dimLand = (x, z) => (L.inMoon(x) ? Math.hypot(x - MOON.x, z - MOON.z) < MR : od ? od(x, z) : false); }, 0);
  const LAND = { x: MOON.x - 60, z: MOON.z + 20 }, BURGER = { x: MOON.x + 160, z: MOON.z + 90, r: 12 };
  L.moonCheckpoint = () => ({ x: LAND.x + 8, z: LAND.z + 8 });
  L.inBurger = (x, z) => L.inMoon(x) && Math.hypot(x - BURGER.x, z - BURGER.z) < BURGER.r;

  // ---------- Bilder (Leinwand-Texturen) ----------
  function earthTex() {
    const c = document.createElement('canvas'); c.width = 512; c.height = 256; const g = c.getContext('2d');
    g.fillStyle = '#1e5aa8'; g.fillRect(0, 0, 512, 256);
    let s = 3; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    g.fillStyle = '#3a8a3a'; for (let i = 0; i < 18; i++) { g.beginPath(); g.ellipse(r() * 512, 40 + r() * 176, 20 + r() * 60, 12 + r() * 40, r() * 3, 0, 6.283); g.fill(); }
    g.fillStyle = '#c8b070'; for (let i = 0; i < 6; i++) { g.beginPath(); g.ellipse(r() * 512, 70 + r() * 110, 10 + r() * 25, 8 + r() * 15, r() * 3, 0, 6.283); g.fill(); }
    g.fillStyle = 'rgba(255,255,255,0.75)'; for (let i = 0; i < 40; i++) { g.beginPath(); g.ellipse(r() * 512, r() * 256, 15 + r() * 50, 4 + r() * 8, r() * 0.5, 0, 6.283); g.fill(); }
    g.fillStyle = '#f2f6fa'; g.fillRect(0, 0, 512, 14); g.fillRect(0, 242, 512, 14);
    return new T.CanvasTexture(c);
  }
  function glowTex(inner, outer) {
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    const gr = g.createRadialGradient(64, 64, 4, 64, 64, 64); gr.addColorStop(0, inner); gr.addColorStop(1, outer); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    return new T.CanvasTexture(c);
  }

  // ---------- Mond als eigene "Insel" ----------
  const moonIsl = { id: 'mond', dim: true, moon: true, name: 'Der Mond', icon: '🌕', x: MOON.x, z: MOON.z, r: MR, tint: '#05060a', weather: 'klar',
    mon: ['marsianer', 'greifer', 'flieger', 'blockling', 'marsianer', 'schwelle'], monTint: '#a0ffb0',
    npc: { top: ['regenjacke'], topColor: ['#f2f2f2', '#e8e8e8'], hat: ['helm'] }, veh: ['mondrover', 'mondbuggy', 'mondrover'], vehCol: '#e8e8ec', music: ['drift', 'nightB'], ground: ['#8a8a8e'] };
  moonIsl.build = function (I) {
    const g = new T.Group(); L.scene.add(g); I.group = g;
    // Mondboden mit Farbflecken, darunter Gestein
    const geo = new T.CircleGeometry(MR, 120); geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position, cols = new Float32Array(pos.count * 3), C = new T.Color();
    for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), z = pos.getZ(i), n = Math.sin(x * 0.02) * Math.cos(z * 0.017) + Math.sin(x * 0.005 + z * 0.007); C.setRGB(0.5, 0.5, 0.53).multiplyScalar(0.85 + n * 0.08 + Math.random() * 0.06); cols[i * 3] = C.r; cols[i * 3 + 1] = C.g; cols[i * 3 + 2] = C.b; }
    geo.setAttribute('color', new T.BufferAttribute(cols, 3));
    const ground = new T.Mesh(geo, new T.MeshLambertMaterial({ vertexColors: true })); ground.position.set(MOON.x, 0.01, MOON.z); ground.receiveShadow = true; g.add(ground);
    const under = new T.Mesh(new T.ConeGeometry(MR, MR * 0.9, 48), L.mat('#5a5a60')); under.rotation.x = Math.PI; under.position.set(MOON.x, -MR * 0.45, MOON.z); g.add(under);
    I.surface = [ground, under];
    // Krater
    for (let k = 0; k < 60; k++) {
      const a = Math.random() * 6.28, d = Math.sqrt(Math.random()) * (MR - 60), x = MOON.x + Math.sin(a) * d, z = MOON.z + Math.cos(a) * d, r = 6 + Math.random() * 30;
      if (Math.hypot(x - LAND.x, z - LAND.z) < 40 || Math.hypot(x - BURGER.x, z - BURGER.z) < 40) continue;
      const rim = new T.Mesh(new T.TorusGeometry(r, r * 0.12, 6, 28), L.mat('#9a9a9e')); rim.rotation.x = Math.PI / 2; rim.position.set(x, 0.2, z); g.add(rim);
      const bowl = new T.Mesh(new T.CircleGeometry(r, 28), L.mat('#5a5a5e')); bowl.rotation.x = -Math.PI / 2; bowl.position.set(x, 0.05, z); g.add(bowl);
    }
    for (let k = 0; k < 120; k++) { const a = Math.random() * 6.28, d = Math.sqrt(Math.random()) * (MR - 40), s = 0.5 + Math.random() * 3; part(G().sph, Math.random() < 0.5 ? '#7a7a80' : '#6a6a70', s, s * 0.6, s * 0.8, MOON.x + Math.sin(a) * d, 0, MOON.z + Math.cos(a) * d, g); }
    // Alien-Basis: Glaskuppeln mit Antennen
    for (let k = 0; k < 5; k++) { const x = MOON.x - 300 + k * 50, z = MOON.z - 260 + (k % 2) * 40; const d = new T.Mesh(new T.SphereGeometry(14, 20, 12, 0, 6.283, 0, Math.PI / 2), new T.MeshLambertMaterial({ color: 0x80ffc0, transparent: true, opacity: 0.45 })); d.position.set(x, 0, z); g.add(d); part(G().cyl, '#c0c0c8', 0.3, 18, 0.3, x, 9, z, g); part(G().sph, '#40ff80', 1, 1, 1, x, 18.5, z, g, { basic: true }); L.addBox(x - 10, z - 10, x + 10, z + 10, 14, 'building'); }
    // Landeplatz mit Rakete (Heimflug)
    part(G().cyl, '#4a4a50', 14, 0.4, 14, LAND.x, 0.2, LAND.z, g);
    I.rocket = buildRocket(); I.rocket.position.set(LAND.x, 0.4, LAND.z); g.add(I.rocket);
    // Burger – der einzige sichere Ort
    buildBurger(g);
    // Weltall: Erde, schwarze Löcher, Wurmloch, Planeten, Nebel, Galaxie
    const sky = new T.Group(); g.add(sky); I.sky = sky;
    const earth = new T.Mesh(new T.SphereGeometry(2200, 40, 28), new T.MeshBasicMaterial({ map: earthTex(), fog: false })); earth.position.set(MOON.x - 9000, 5200, MOON.z - 11000); sky.add(earth); I.earth = earth;
    const atmo = new T.Mesh(new T.SphereGeometry(2350, 32, 20), basic(0x6ab0ff, { transparent: true, opacity: 0.18, side: T.BackSide })); atmo.position.copy(earth.position); sky.add(atmo); I.atmo = atmo;
    I.holes = [];
    for (const [hx, hy, hz, s, col] of [[22000, 9000, 14000, 1300, 0xff9a40], [-20000, 12000, 18000, 900, 0xb070ff]]) {
      const hole = new T.Mesh(new T.SphereGeometry(s, 24, 16), basic(0x000000)); hole.position.set(MOON.x + hx, hy, MOON.z + hz); sky.add(hole);
      const disk = new T.Mesh(new T.RingGeometry(s * 1.4, s * 3.2, 64), basic(col, { transparent: true, opacity: 0.7, side: T.DoubleSide, blending: T.AdditiveBlending, depthWrite: false })); disk.position.copy(hole.position); disk.rotation.set(1.25, 0.2, 0.3); sky.add(disk); I.holes.push(disk);
    }
    const worm = new T.Group(); worm.position.set(MOON.x + 9000, 7000, MOON.z - 16000); sky.add(worm); I.worm = worm;
    for (let k = 0; k < 6; k++) { const tr = new T.Mesh(new T.TorusGeometry(900 - k * 120, 40, 8, 48), basic(k % 2 ? 0x40e0ff : 0xff40d0, { transparent: true, opacity: 0.7, blending: T.AdditiveBlending, depthWrite: false })); worm.add(tr); }
    worm.add(new T.Mesh(new T.CircleGeometry(700, 48), new T.MeshBasicMaterial({ map: glowTex('#ffffff', '#2a0060'), fog: false, transparent: true, side: T.DoubleSide })));
    worm.lookAt(MOON.x, 0, MOON.z);
    for (const [px, py, pz, s, c, ring] of [[-26000, 4000, -6000, 1600, '#d8a060', 1], [14000, 3000, -24000, 1100, '#c06040', 0], [-8000, 9000, 26000, 2000, '#e0c890', 0], [26000, 2500, 2000, 700, '#6aa0ff', 0]]) {
      const pl = new T.Mesh(new T.SphereGeometry(s, 32, 20), new T.MeshLambertMaterial({ color: c })); pl.material.fog = false; pl.position.set(MOON.x + px, py, MOON.z + pz); sky.add(pl);
      for (let b = 0; b < 4; b++) { const band = new T.Mesh(new T.TorusGeometry(s * 1.001, s * 0.06, 6, 40), basic(new T.Color(c).multiplyScalar(0.75))); band.position.copy(pl.position); band.rotation.x = Math.PI / 2; band.position.y += (b - 1.5) * s * 0.3; band.scale.setScalar(Math.cos((b - 1.5) * 0.3)); sky.add(band); }
      if (ring) { const rg = new T.Mesh(new T.RingGeometry(s * 1.4, s * 2.3, 64), basic(0xe8d0a0, { transparent: true, opacity: 0.75, side: T.DoubleSide })); rg.position.copy(pl.position); rg.rotation.set(1.2, 0.3, 0); sky.add(rg); }
    }
    for (const [nx, ny, nz, s, a, b] of [[0, 14000, 30000, 18000, '#ff60c0', 'rgba(60,0,80,0)'], [-30000, 9000, -20000, 16000, '#40c0ff', 'rgba(0,20,60,0)'], [24000, 16000, -10000, 14000, '#a060ff', 'rgba(20,0,40,0)']]) {
      const sp = new T.Sprite(new T.SpriteMaterial({ map: glowTex(a, b), transparent: true, opacity: 0.55, depthWrite: false, fog: false })); sp.scale.set(s, s, 1); sp.position.set(MOON.x + nx, ny, MOON.z + nz); sky.add(sp);
    }
    { const gx = document.createElement('canvas'); gx.width = gx.height = 256; const gg = gx.getContext('2d'); gg.translate(128, 128); for (let i = 0; i < 1400; i++) { const t2 = i / 1400 * 12, r = t2 * 9; for (const arm of [0, Math.PI]) { gg.fillStyle = 'rgba(255,' + (200 + Math.random() * 55 | 0) + ',255,' + (0.5 - t2 / 30) + ')'; gg.fillRect(Math.cos(t2 + arm) * r + (Math.random() - 0.5) * 10, Math.sin(t2 + arm) * r + (Math.random() - 0.5) * 10, 2, 2); } }
      const gs = new T.Sprite(new T.SpriteMaterial({ map: new T.CanvasTexture(gx), transparent: true, depthWrite: false, fog: false, blending: T.AdditiveBlending })); gs.scale.set(12000, 12000, 1); gs.position.set(MOON.x - 4000, 20000, MOON.z + 24000); sky.add(gs); }
    I.built = true;
  };
  L.ISL.push(moonIsl); L.ISLANDS.push(moonIsl);

  function buildBurger(g) {
    const B = BURGER, bun = '#d89a48', segs = 20;
    // unteres Brötchen als Ring mit Eingang
    for (let k = 0; k < segs; k++) {
      if (k === 0 || k === 1) continue; // Tür
      const a = (k + 0.5) / segs * 6.283, x = B.x + Math.sin(a) * (B.r + 0.8), z = B.z + Math.cos(a) * (B.r + 0.8);
      const w = part(G().box, bun, 4.2, 5, 2, x, 2.5, z, g); w.rotation.y = a;
      L.addBox(x - 1.4, z - 1.4, x + 1.4, z + 1.4, 5, 'building');
    }
    part(G().cyl, '#f2e0b0', B.r, 0.2, B.r, B.x, 0.1, B.z, g);
    // Patty, Käse, Salat, Tomate, oberes Brötchen mit Sesam
    part(G().cyl, '#5a3220', B.r + 1.6, 2.4, B.r + 1.6, B.x, 6.2, B.z, g);
    const ch = part(G().box, '#ffcc30', (B.r + 2) * 2, 0.6, (B.r + 2) * 2, B.x, 7.6, B.z, g); ch.rotation.y = 0.785;
    part(G().cyl, '#5ab040', B.r + 2.4, 0.9, B.r + 2.4, B.x, 8.2, B.z, g);
    for (let k = 0; k < 6; k++) { const a = k * 1.05; part(G().cyl, '#d83a2a', 3, 0.6, 3, B.x + Math.sin(a) * B.r * 0.7, 8.9, B.z + Math.cos(a) * B.r * 0.7, g); }
    const top = part(G().sph, bun, B.r + 1.4, 8, B.r + 1.4, B.x, 9.2, B.z, g);
    for (let k = 0; k < 30; k++) { const a = Math.random() * 6.28, d = Math.random() * B.r * 0.9; part(G().sph, '#fff6e0', 0.5, 0.25, 0.8, B.x + Math.sin(a) * d, 9.2 + Math.sqrt(Math.max(0, 1 - (d / (B.r + 1.4)) ** 2)) * 8, B.z + Math.cos(a) * d, g, { noShadow: true }); }
    const sign = new T.Sprite(new T.SpriteMaterial({ map: L.textTex('🍔 SICHER', 512, 96, '#3a1a08', '#ffd040', 'bold 64px Arial'), fog: false })); sign.scale.set(16, 3, 1); sign.position.set(B.x, 21, B.z); g.add(sign);
    const lamp = new T.PointLight(0xffd080, 1.2, 30); lamp.position.set(B.x, 4, B.z); g.add(lamp);
  }
  function buildRocket() {
    const r = new T.Group();
    part(G().cylB, '#f2f2f2', 3, 30, 3, 0, 0, 0, r);
    part(G().cone, '#c02a2a', 3, 9, 3, 0, 34.5, 0, r);
    for (let k = 0; k < 3; k++) part(G().cylB, '#1e3a6a', 3.05, 1.2, 3.05, 0, 8 + k * 7, 0, r);
    for (let k = 0; k < 4; k++) { const f = part(G().box, '#c02a2a', 0.4, 7, 4, Math.sin(k * 1.57) * 3.6, 3.5, Math.cos(k * 1.57) * 3.6, r); f.rotation.y = k * 1.57; }
    part(G().sph, '#80d0ff', 1.2, 1.2, 0.4, 0, 22, 3, r, { basic: true });
    const flame = part(G().cone, '#ff8020', 2.6, 14, 2.6, 0, -7, 0, r, { basic: true }); flame.rotation.x = Math.PI; flame.visible = false; r.userData.flame = flame;
    return r;
  }
  // ---------- Rakete auf der Heimatinsel ----------
  let home = null;
  const origBuild = L.buildWorld;
  L.buildWorld = function (scene) {
    origBuild(scene);
    let spot = { x: -700, z: 900 };
    for (let k = 0; k < 400; k++) { const a = k * 0.7, d = 650 + k * 1.5, x = Math.sin(a) * d, z = Math.cos(a) * d; if (Math.abs(x) > 1350 || Math.abs(z) > 1350) continue; let ok = true; for (let i = -24; i <= 24 && ok; i += 6) for (let j = -24; j <= 24 && ok; j += 6) if (L.queryBoxes(x + i, z + j, 2).length || L.waterDepth(x + i, z + j) > -0.2 || L.mountainH(x + i, z + j) > 0.1) ok = false; if (ok) { spot = { x, z }; break; } }
    const g = new T.Group(); L.scene.add(g);
    part(G().cyl, '#6a6a70', 16, 0.6, 16, spot.x, 0.3, spot.z, g);
    for (let k = 0; k < 4; k++) part(G().box, '#d02a2a', 0.8, 34, 0.8, spot.x + 9 + (k % 2) * 4, 17, spot.z - 2 + Math.floor(k / 2) * 4, g);
    for (let k = 0; k < 6; k++) part(G().box, '#c8c8c8', 4.8, 0.4, 4.8, spot.x + 11, 4 + k * 6, spot.z, g);
    const rk = buildRocket(); rk.position.set(spot.x, 0.6, spot.z); g.add(rk);
    L.addBox(spot.x - 3.5, spot.z - 3.5, spot.x + 3.5, spot.z + 3.5, 40, 'building'); L.addBox(spot.x + 8.5, spot.z - 2.5, spot.x + 13.5, spot.z + 2.5, 34, 'building');
    home = { x: spot.x, z: spot.z, rocket: rk };
    L.ROCKET = home;
    L.POIS.push({ id: 'rakete', name: 'Raketenstart (zum Mond)', x: spot.x, z: spot.z, r: 14, icon: '🚀', sub: true });
  };
  // ---------- Starten / Landen ----------
  let trip = null;
  const near = () => {
    if (P.vehicle || !P.alive) return null;
    if (home && !L.inMoon(P.x) && Math.hypot(P.x - home.x, P.z - home.z) < 9) return 'up';
    if (L.inMoon(P.x) && Math.hypot(P.x - LAND.x, P.z - LAND.z) < 9) return 'down';
    return null;
  };
  L.moonHint = () => { const n = near(); return n === 'up' ? 'E: 🚀 Zum Mond fliegen' : n === 'down' ? 'E: 🚀 Zurück zur Erde fliegen' : null; };
  L.moonInteract = function () {
    const n = near(); if (!n || trip) return false;
    const fromX = n === 'up' ? home.x : LAND.x, fromZ = n === 'up' ? home.z : LAND.z, rk = n === 'up' ? home.rocket : moonIsl.rocket;
    trip = { n, t: 0, rk, fromX, fromZ };
    rk.userData.flame.visible = true;
    L.banner('🚀 3 … 2 … 1 … START!', n === 'up' ? 'Auf zum Mond!' : 'Zurück zur Erde!');
    L.snd.explosion && L.snd.explosion({ x: fromX, y: 0, z: fromZ });
    L.startCine(n === 'up' ? '🚀 FLUG ZUM MOND' : '🚀 RÜCKFLUG ZUR ERDE', 7, (t) => { const y = rk.position.y + 15; return { x: fromX + 70 - t * 3, y: 12 + t * 8, z: fromZ + 60, lx: fromX, ly: y, lz: fromZ }; });
    return true;
  };
  function updateTrip(dt) {
    if (!trip) return;
    trip.t += dt; const rk = trip.rk;
    rk.position.y = 0.6 + Math.max(0, trip.t - 1) ** 2 * 6;
    rk.userData.flame.scale.set(2.6, 14 + Math.random() * 6, 2.6);
    if (Math.random() < dt * 40) L.fx('#d8d8d8', trip.fromX + L.rand(-6, 6), 1, trip.fromZ + L.rand(-6, 6), 3, 6, { size: 1.2, life: 2, g: -0.1, grow: 1 });
    P.x = trip.fromX + 6; P.z = trip.fromZ + 6;
    if (trip.t > 7 || !L.cine) {
      rk.position.y = 0.6; rk.userData.flame.visible = false;
      const up = trip.n === 'up'; trip = null;
      if (up) { P.x = LAND.x + 10; P.z = LAND.z + 10; L.msg('🌕 Willkommen auf dem Mond! Wenig Schwerkraft – spring mal! Der 🍔 Burger ist der einzige sichere Ort.', 7000); }
      else { P.x = home.x + 12; P.z = home.z + 12; L.msg('🌍 Zurück auf der Erde.', 4000); }
      P.y = 0.5; P.vx = P.vz = P.vy = 0; P.air = true; P.spawnProt = Math.max(P.spawnProt || 0, 10);
    }
  }

  // ---------- BERNHARD DER VERSCHLUCKER ----------
  let bern = null, bTimer = 45, bWarned = false;
  function buildBernhard() {
    const g = new T.Group(), skin = '#e8b090', shirt = '#c02a2a';
    const belly = new T.Mesh(new T.SphereGeometry(3000, 48, 32), new T.MeshLambertMaterial({ color: skin })); belly.material.fog = false; g.add(belly);
    const tee = new T.Mesh(new T.SphereGeometry(3010, 48, 24, 0, 6.283, 0, 1.1), new T.MeshLambertMaterial({ color: shirt })); tee.material.fog = false; g.add(tee);
    const navel = new T.Mesh(new T.SphereGeometry(140, 16, 12), basic(0x8a5030)); navel.position.set(0, -300, 2990); g.add(navel);
    // normal großer Kopf (ganz oben – winzig im Verhältnis), Ärmchen und Beinchen
    const head = new T.Group(); head.position.set(0, 3040, 0); g.add(head);
    head.add(new T.Mesh(new T.SphereGeometry(40, 20, 14), new T.MeshLambertMaterial({ color: skin })));
    for (const s of [-1, 1]) { const e = new T.Mesh(new T.SphereGeometry(7, 10, 8), basic(0xffffff)); e.position.set(s * 14, 10, 36); head.add(e); const p2 = new T.Mesh(new T.SphereGeometry(3.5, 8, 6), basic(0x111111)); p2.position.set(s * 14, 10, 42); head.add(p2); }
    const mouth = new T.Mesh(new T.SphereGeometry(14, 14, 10), basic(0x3a0a0a)); mouth.scale.set(1.3, 0.6, 0.4); mouth.position.set(0, -12, 36); head.add(mouth); g.userData.mouth = mouth;
    const cap = new T.Mesh(new T.CylinderGeometry(42, 42, 14, 20), new T.MeshLambertMaterial({ color: 0x1e3a8a })); cap.position.y = 34; head.add(cap);
    for (const s of [-1, 1]) { const arm = new T.Mesh(new T.CylinderGeometry(60, 50, 900, 12), new T.MeshLambertMaterial({ color: skin })); arm.position.set(s * 2950, 600, 200); arm.rotation.z = s * 1.2; g.add(arm); const leg = new T.Mesh(new T.CylinderGeometry(120, 90, 700, 12), new T.MeshLambertMaterial({ color: 0x2a3a6a })); leg.position.set(s * 900, -3050, 0); g.add(leg); }
    g.traverse((o) => { if (o.isMesh) { o.material.fog = false; o.frustumCulled = false; } });
    L.scene.add(g); return g;
  }
  function startBernhard() {
    const I = moonIsl; if (!I.earth) return;
    if (!bern || !bern.g) bern = { g: buildBernhard() };
    bern.phase = 'cine'; bern.t = 0; bern.g.visible = true;
    const E0 = I.earth.position;
    bern.g.position.set(E0.x - 14000, E0.y + 4000, E0.z - 6000); bern.g.scale.setScalar(0.3);
    L.banner('🍔 BERNHARD DER VERSCHLUCKER', 'Er frisst alles … zuerst die Erde. Dann DICH.');
    L.startCine('😱 BERNHARD DER VERSCHLUCKER', 7, (t) => {
      const Ep = I.earth.position, b = bern.g.position;
      if (t < 4.5) return { x: Ep.x + 9000, y: Ep.y + 1500, z: Ep.z + 9000, lx: (Ep.x + b.x) / 2, ly: (Ep.y + b.y) / 2, lz: (Ep.z + b.z) / 2 };
      return { x: MOON.x + 60, y: 40, z: MOON.z + 60, lx: b.x, ly: b.y, lz: b.z };
    });
  }
  function updateBernhard(dt) {
    const I = moonIsl;
    if (!bern || bern.phase === 'gone' || !bern.phase) {
      if (L.inMoon(P.x) && I.built && !L.cine && L.state === 'game') { bTimer -= dt; if (bTimer <= 12 && !bWarned) { bWarned = true; L.msg('⚠️ Etwas Riesiges nähert sich der Erde … Geh in die Nähe vom 🍔 Burger!', 6000); } if (bTimer <= 0) { bTimer = 180; bWarned = false; startBernhard(); } }
      return;
    }
    if (!L.inMoon(P.x)) { bern.g.visible = false; bern.phase = 'gone'; if (I.earth) { I.earth.visible = true; I.atmo.visible = true; } return; }
    bern.t += dt; const b = bern.g, Ep = I.earth.position;
    if (bern.phase === 'cine') {
      // fliegt zur Erde und beißt sie mit einem Happs weg
      if (bern.t < 3) b.position.lerp(new T.Vector3(Ep.x, Ep.y + 2600, Ep.z - 1500), dt * 1.2);
      if (bern.t > 3 && I.earth.visible) { I.earth.visible = false; I.atmo.visible = false; L.shake = 1.5; L.snd.bossRoar && L.snd.bossRoar({ x: P.x, y: 5, z: P.z }); L.msg('🌍💥 Bernhard hat die ERDE mit einem Happs verschluckt!', 5000); }
      if (bern.t > 3.2) { const s = Math.min(1, 0.3 + (bern.t - 3.2) * 0.3); b.scale.setScalar(s); }
      if (bern.t > 7 || !L.cine) { bern.phase = 'approach'; bern.t = 0; bern.from = b.position.clone(); L.msg('😱 Bernhard fliegt auf DICH zu! Ab in den 🍔 Burger!', 6000); }
    } else if (bern.phase === 'approach') {
      // fliegt auf den Mond zu – man sieht ihn immer größer werden
      const u = Math.min(1, bern.t / 22), to = new T.Vector3(MOON.x, 2600, MOON.z);
      b.position.lerpVectors(bern.from, to, u * u * (3 - 2 * u)); b.scale.setScalar(1);
      b.lookAt(MOON.x, 0, MOON.z);
      bern.g.userData.mouth.scale.set(1.3, 0.6 + u * 1.2, 0.4);
      if (Math.random() < dt * (0.5 + u * 3)) L.shake = Math.max(L.shake, u * 0.8);
      if (u >= 1) eatMoon();
    } else if (bern.phase === 'eat') {
      if (bern.t > 2.5) {
        // der Mond setzt sich wieder zusammen
        for (const m of I.surface) m.visible = true; I.group.visible = true;
        bern.phase = 'leave'; bern.t = 0; bern.from = b.position.clone();
        L.msg('🌕 Bernhard zieht weiter … der Mond setzt sich wieder zusammen.', 5000);
      }
    } else if (bern.phase === 'leave') {
      const u = Math.min(1, bern.t / 8); b.position.lerpVectors(bern.from, new T.Vector3(MOON.x + 40000, 30000, MOON.z + 40000), u); b.scale.setScalar(1 - u * 0.7);
      if (u >= 1) { bern.phase = 'gone'; b.visible = false; I.earth.visible = true; I.atmo.visible = true; L.msg('🌍 Die Erde ist wieder da. Bernhard kommt in 3 Minuten wieder.', 5000); }
    }
  }
  function eatMoon() {
    bern.phase = 'eat'; bern.t = 0;
    L.shake = 2; L.env.bolt = 1;
    flashScreen();
    L.snd.bossRoar && L.snd.bossRoar({ x: P.x, y: 5, z: P.z }); L.snd.explosion && L.snd.explosion({ x: P.x, y: 5, z: P.z });
    for (const m of moonIsl.surface) m.visible = false;
    if (P.alive && !L.inBurger(P.x, P.z)) { P.vehicle && L._leaveVehicle && L._leaveVehicle(true); L.hurtPlayer(99999, 'Von Bernhard dem Verschlucker mit dem ganzen Mond verschluckt'); }
    else if (P.alive) L.msg('🍔 Im Burger überlebt! Bernhard hat den Mond verschluckt – nur der Burger blieb übrig.', 6000);
  }
  let flashEl = null;
  function flashScreen() {
    if (!flashEl) { flashEl = document.createElement('div'); flashEl.style.cssText = 'position:fixed;inset:0;background:#000;opacity:0;pointer-events:none;z-index:40;transition:opacity .6s'; document.body.appendChild(flashEl); }
    flashEl.style.opacity = '1'; setTimeout(() => { flashEl.style.opacity = '0'; }, 1300);
  }
  L.moonBossText = function () {
    if (!L.inMoon(P.x)) return null;
    if (bern && bern.phase === 'approach') return '😱 BERNHARD frisst gleich den Mond! In den 🍔 Burger! (' + Math.max(0, Math.ceil(22 - bern.t)) + ' s)';
    if (bern && (bern.phase === 'cine' || bern.phase === 'eat' || bern.phase === 'leave')) return '🍔 BERNHARD DER VERSCHLUCKER';
    return '🍔 Bernhard kommt in ' + L.fmt(Math.max(0, bTimer));
  };
  L.moonNav = () => (L.inMoon(P.x) && bern && bern.phase === 'approach' && !L.inBurger(P.x, P.z) ? BURGER : null);
  L.moonTargets = () => [[LAND.x, LAND.z, '🚀', 'Rakete (Heimflug)'], [BURGER.x, BURGER.z, '🍔', 'Burger (sicher)']];

  // ---------- jedes Bild ----------
  L.updateMoon = function (dt) {
    updateTrip(dt);
    if (L.state !== 'game') return;
    const I = moonIsl;
    if (I.built && L.inMoon(P.x)) {
      for (const d of I.holes) d.rotation.z += dt * 0.05;
      if (I.worm) I.worm.rotation.z += dt * 0.2;
      if (I.earth && I.earth.visible) I.earth.rotation.y += dt * 0.01;
      // aus dem Mond gefallen
      if (P.y < -90 && P.alive && !P.vehicle) { const c = L.moonCheckpoint(); P.x = c.x; P.z = c.z; P.y = 2; P.vy = 0; P.air = true; L.hurtPlayer(25, 'Vom Mond ins All gefallen'); L.msg('🌌 Ins All gefallen – zurück zum Landeplatz.', 4000); }
    }
    updateBernhard(dt);
  };
  L._moonDbg = { setT: (v) => { bTimer = v; }, bern: () => bern, isl: () => moonIsl };
  L.clearMoon = function () { trip = null; bTimer = 45; if (bern && bern.g) { bern.g.visible = false; bern.phase = 'gone'; } if (moonIsl.earth) { moonIsl.earth.visible = true; moonIsl.atmo.visible = true; } if (moonIsl.surface) for (const m of moonIsl.surface) m.visible = true; };
})();
