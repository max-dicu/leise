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
    if (home && !L.inMoon(P.x) && Math.hypot(P.x - home.x, P.z - home.z) < 18) return 'up';
    if (L.inMoon(P.x) && Math.hypot(P.x - LAND.x, P.z - LAND.z) < 18) return 'down';
    return null;
  };
  L.moonHint = () => { const n = near(); return n === 'up' ? 'E: 🚀 Zum Mond fliegen' : n === 'down' ? 'E: 🚀 Zurück zur Erde fliegen' : null; };
  const DUR = 17;
  L.moonInteract = function () {
    const n = near(); if (!n || trip) return false;
    const fromX = n === 'up' ? home.x : LAND.x, fromZ = n === 'up' ? home.z : LAND.z, rk = n === 'up' ? home.rocket : moonIsl.rocket;
    trip = { n, t: 0, rk, fromX, fromZ, cam: { x: fromX + 70, y: 12, z: fromZ + 60, lx: fromX, ly: 15, lz: fromZ } };
    rk.userData.flame.visible = true;
    L.banner('🚀 3 … 2 … 1 … START!', n === 'up' ? 'Auf zum Mond!' : 'Zurück zur Erde!');
    L.snd.explosion && L.snd.explosion({ x: fromX, y: 0, z: fromZ });
    L.startCine(n === 'up' ? '🚀 FLUG ZUM MOND' : '🚀 RÜCKFLUG ZUR ERDE', DUR, () => trip && trip.cam);
    return true;
  };
  function streaks(on, at) {
    if (!trip.st) { trip.st = []; for (let k = 0; k < 40; k++) { const m = new T.Mesh(G().box, new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, fog: false })); m.scale.set(0.3, 0.3, 60 + Math.random() * 80); L.scene.add(m); trip.st.push({ m, o: new T.Vector3(L.rand(-120, 120), L.rand(-80, 80), L.rand(-400, 400)) }); } }
    for (const q of trip.st) { q.m.visible = on; if (on) { q.o.z -= 900 * 0.033; if (q.o.z < -400) q.o.z += 800; q.m.position.copy(at.p).addScaledVector(at.f, q.o.z).add(at.r.clone().multiplyScalar(q.o.x)).add(new T.Vector3(0, q.o.y, 0)); q.m.lookAt(q.m.position.clone().add(at.f)); } }
  }
  function updateTrip(dt) {
    if (!trip) return;
    trip.t += dt; const t = trip.t, up = trip.n === 'up', I = moonIsl, c = trip.cam;
    // A: Start (0–4 s)
    if (t < 4) {
      const rk = trip.rk; rk.position.y = 0.6 + Math.max(0, t - 1) ** 2 * 7; rk.userData.flame.scale.set(2.6, 14 + Math.random() * 6, 2.6);
      if (Math.random() < dt * 50) L.fx('#d8d8d8', trip.fromX + L.rand(-8, 8), 1, trip.fromZ + L.rand(-8, 8), 3, 8, { size: 1.5, life: 2.5, g: -0.1, grow: 1.2 });
      if (t < 1.2) L.shake = Math.max(L.shake, 0.4);
      P.x = trip.fromX + 6; P.z = trip.fromZ + 6;
      Object.assign(c, { x: trip.fromX + 60 - t * 4, y: 6 + t * 10, z: trip.fromZ + 55, lx: trip.fromX, ly: rk.position.y + 18, lz: trip.fromZ });
    }
    // B: Flug durchs All (4–11 s) – vor der Kulisse beim Mond
    else if (t < 11) {
      if (!trip.space) {
        trip.space = true; trip.rk.position.y = 0.6; trip.rk.userData.flame.visible = false;
        P.x = LAND.x + 10; P.z = LAND.z + 10; P.y = 0.5; // Mond-Kulisse laden
        trip.fly = buildRocket(); trip.fly.userData.flame.visible = true; L.scene.add(trip.fly);
        trip.fly.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); o.material.fog = false; o.frustumCulled = false; } });
      }
      if (I.earth && !trip.path) {
        const E0 = I.earth.position.clone(), M0 = new T.Vector3(LAND.x, 2500, LAND.z), dir = M0.clone().sub(E0).normalize();
        trip.path = up ? { a: E0.clone().addScaledVector(dir, 3200), b: M0 } : { a: new T.Vector3(LAND.x, 400, LAND.z), b: E0.clone().addScaledVector(dir, 2600) };
      }
      if (trip.path) {
        const u = (t - 4) / 7, e = u * u * (3 - 2 * u), p = new T.Vector3().lerpVectors(trip.path.a, trip.path.b, e), f = trip.path.b.clone().sub(trip.path.a).normalize();
        trip.fly.position.copy(p); trip.fly.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), f);
        trip.fly.userData.flame.scale.set(2.6, 16 + Math.random() * 8, 2.6);
        const r = new T.Vector3().crossVectors(f, new T.Vector3(0, 1, 0)).normalize();
        const cp = p.clone().addScaledVector(r, 70).addScaledVector(f, -90).add(new T.Vector3(0, 25, 0));
        Object.assign(c, { x: cp.x, y: cp.y, z: cp.z, lx: p.x + f.x * 60, ly: p.y + f.y * 60, lz: p.z + f.z * 60 });
        streaks(true, { p, f, r });
        // Rückflug: Eintritt in die Atmosphäre glüht
        if (!up && u > 0.7 && Math.random() < dt * 40) L.fx(Math.random() < 0.5 ? '#ff8a2a' : '#ffd040', p.x + L.rand(-6, 6), p.y + L.rand(-6, 6), p.z + L.rand(-6, 6), 2, 10, { basic: true, size: 3, life: 0.6 });
      }
    }
    // C: Landung (11–17 s)
    else {
      if (!trip.landing) {
        trip.landing = true; streaks(false); if (trip.fly) L.scene.remove(trip.fly);
        const pad = up ? { x: LAND.x, z: LAND.z, rk: I.rocket } : { x: home.x, z: home.z, rk: home.rocket };
        trip.pad = pad; if (!up) { P.x = home.x + 12; P.z = home.z + 12; P.y = 0.5; }
        pad.rk.userData.flame.visible = true; pad.rk.position.y = 420;
        L.msg(up ? '🌕 Landeanflug auf den Mond …' : '🌍 Landeanflug auf die Erde …', 3000);
      }
      const pad = trip.pad, u = Math.min(1, (t - 11) / 5.2), e = 1 - (1 - u) * (1 - u) * (1 - u);
      pad.rk.position.y = 0.6 + (1 - e) * 420; pad.rk.userData.flame.scale.set(2.6, 6 + (1 - u) * 14 + Math.random() * 4, 2.6);
      if (pad.rk.position.y < 40 && Math.random() < dt * 60) L.fx(up ? '#a0a0a8' : '#c8b890', pad.x + L.rand(-14, 14), 0.8, pad.z + L.rand(-14, 14), 3, 12, { size: 2, life: 2.5, g: -0.05, grow: 1.4 });
      if (pad.rk.position.y < 3) L.shake = Math.max(L.shake, 0.3);
      Object.assign(c, { x: pad.x + 55, y: 8 + (1 - u) * 30, z: pad.z + 45, lx: pad.x, ly: pad.rk.position.y + 12, lz: pad.z });
      if (!up) { P.x = home.x + 12; P.z = home.z + 12; } else { P.x = LAND.x + 10; P.z = LAND.z + 10; }
    }
    if (t > DUR || (!L.cine && t > 0.5)) {
      if (trip.st) for (const q of trip.st) L.scene.remove(q.m); if (trip.fly) L.scene.remove(trip.fly);
      const pad = trip.pad || (up ? { rk: I.rocket } : { rk: home.rocket });
      if (pad.rk) { pad.rk.position.y = 0.6; pad.rk.userData.flame.visible = false; }
      trip.rk.position.y = 0.6; trip.rk.userData.flame.visible = false;
      trip = null;
      if (up) { P.x = LAND.x + 10; P.z = LAND.z + 10; L.msg('🌕 Willkommen auf dem Mond! Wenig Schwerkraft – spring mal! Der 🍔 Burger ist der einzige sichere Ort.', 7000); }
      else { P.x = home.x + 12; P.z = home.z + 12; L.msg('🌍 Zurück auf der Erde.', 4000); }
      P.y = 0.5; P.vx = P.vz = P.vy = 0; P.air = true; P.spawnProt = Math.max(P.spawnProt || 0, 10);
    }
  }

  // ---------- BERNHARD DER VERSCHLUCKER (eigener Entwurf) ----------
  // Kilometergroß, Oberkörper frei, fleckige verschwitzte Haut, Speckrollen, Haare, Adern, Sabber.
  // Ablauf: frisst die Erde (Kurzfilm) → fliegt her → JAGT DICH 10 MINUTEN (beißt immer wieder zu) → frisst den Mond → zieht weiter.
  let bern = null, bTimer = 45, bWarned = false;
  // Bernhard hat sehr viel Leben – treffen kann man ihn nur, wenn er herunterkommt (Zubeißen)
  const BERN_HP = 25000;
  L.bernTarget = function () {
    if (!bern || !bern.g || !bern.g.visible || !L.inMoon(P.x)) return null;
    if (!['hunt', 'aim', 'chomp', 'rise'].includes(bern.phase)) return null;
    if (!(bern.hp > 0)) bern.hp = bern.hp === undefined ? BERN_HP : bern.hp;
    if (!(bern.hp > 0)) return null;
    const p = bern.g.position;
    return { kind: 'bern', rig: { root: bern.g }, x: p.x, z: p.z, hp: bern.hp, hitR: 1e9 };
  };
  L.bernHit = function (dmg) {
    if (!bern || !(bern.hp > 0) || !(dmg > 0)) return;
    bern.hp -= dmg; if (L.showBossHp) L.showBossHp('😈 BERNHARD', bern.hp, BERN_HP);
    if (bern.hp <= 0) {
      bern.hp = 0; bern.killed = true; if (L.gotKillCoins) L.gotKillCoins(1000);
      if (L.bossReward) L.bossReward('bernhard', P.x + 3, P.z + 3, P.y || 0, 'defeat');
      L.banner('🏆 BERNHARD IST BESIEGT!', 'Und jetzt holt MAMA IVA sich den Rest …');
      startIvaEnd();
    }
  };
  const HUNT = 600, CHOMP_R = 34;
  const phong = (c, o) => { const m = new T.MeshPhongMaterial(Object.assign({ color: c, shininess: 60, specular: 0x554433, fog: false }, o || {})); return m; };
  function mottled(geo, base) {
    const p = geo.attributes.position, cols = new Float32Array(p.count * 3), C = new T.Color(), B0 = new T.Color(base);
    const blot = [new T.Color('#c08070'), new T.Color('#d8b080'), new T.Color('#b0a070'), new T.Color('#e8a0a0')];
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), n = Math.sin(x * 0.004 + y * 0.003) * Math.cos(z * 0.0035 - y * 0.002) + Math.sin(x * 0.011 + z * 0.009) * 0.5;
      C.copy(B0).lerp(blot[(Math.abs(Math.floor(n * 3)) % 4)], Math.min(0.55, Math.abs(n) * 0.5)).multiplyScalar(0.9 + Math.random() * 0.08);
      cols[i * 3] = C.r; cols[i * 3 + 1] = C.g; cols[i * 3 + 2] = C.b;
    }
    geo.setAttribute('color', new T.BufferAttribute(cols, 3));
    return geo;
  }
  function onSphere(parent, R, lat, lon, mesh, out) { const v = new T.Vector3(Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon)); mesh.position.copy(v).multiplyScalar(R + (out || 0)); mesh.lookAt(mesh.position.clone().add(v)); parent.add(mesh); return mesh; }
  function buildBernhard() {
    const g = new T.Group(), body = new T.Group(); g.add(body);
    const skin = '#d8a48a', skinM = new T.MeshPhongMaterial({ vertexColors: true, shininess: 70, specular: 0x665544, fog: false });
    const BR = 3400;
    // Riesenbauch (fleckig, glänzend vor Schweiß)
    const belly = new T.Mesh(mottled(new T.SphereGeometry(BR, 64, 48), skin), skinM); belly.scale.set(1.08, 1, 1.12); body.add(belly);
    // Speckrollen / Falten
    for (let k = 0; k < 6; k++) { const y = -BR * 0.15 - k * BR * 0.13, r = Math.sqrt(Math.max(0, 1 - (y / BR) ** 2)) * BR * 1.1; const roll = new T.Mesh(new T.TorusGeometry(r, BR * (0.06 + k * 0.01), 10, 64), phong('#c08a72')); roll.rotation.x = Math.PI / 2; roll.position.y = y; roll.scale.set(1, 1.12 / 1.08, 1); body.add(roll); }
    for (let k = 0; k < 3; k++) { const fold = new T.Mesh(new T.TorusGeometry(BR * 0.55 - k * 260, 70, 8, 40, Math.PI), phong('#a8705a')); fold.position.set(0, -BR * 0.35 - k * 220, BR * 0.93); fold.rotation.z = Math.PI; body.add(fold); }
    // Dehnungsstreifen, Adern, Haare, Schweiß
    for (let k = 0; k < 70; k++) { const sm = new T.Mesh(L.GEO.box, phong(k % 3 ? '#b06070' : '#9a4a6a')); sm.scale.set(40, 22 + Math.random() * 30, 600 + Math.random() * 900); onSphere(body, BR * 1.06, -0.9 + Math.random() * 1.1, -1.6 + Math.random() * 3.2, sm, 8); sm.rotateZ(Math.random() * 3); }
    for (let k = 0; k < 220; k++) { const hr = new T.Mesh(L.GEO.cone, phong('#2a1a10')); hr.scale.set(18, 22, 120 + Math.random() * 160); onSphere(body, BR * 1.07, -0.2 + Math.random() * 0.9, -1.2 + Math.random() * 2.4, hr, 20); hr.rotateX(Math.PI / 2); }
    const sweat = []; for (let k = 0; k < 60; k++) { const d = new T.Mesh(L.GEO.sph, new T.MeshPhongMaterial({ color: 0xe8f4ff, shininess: 120, transparent: true, opacity: 0.7, fog: false })); d.scale.setScalar(50 + Math.random() * 60); onSphere(body, BR * 1.07, -0.6 + Math.random() * 1.3, -1.5 + Math.random() * 3, d, 30); sweat.push(d); }
    // tiefer Bauchnabel
    const navel = new T.Mesh(new T.SphereGeometry(260, 16, 12), phong('#4a2018')); onSphere(body, BR * 1.07, -0.25, 0, navel, -60);
    const navR = new T.Mesh(new T.TorusGeometry(300, 80, 8, 24), phong('#b07a62')); onSphere(body, BR * 1.07, -0.25, 0, navR, 0);
    // Brust (Männerbrüste) mit Haaren
    for (const s of [-1, 1]) { const ch = new T.Mesh(mottled(new T.SphereGeometry(1500, 28, 20), skin), skinM); ch.position.set(s * 1300, BR * 0.62, BR * 0.62); ch.scale.set(1, 0.85, 0.7); body.add(ch); const np = new T.Mesh(new T.SphereGeometry(170, 12, 10), phong('#8a4a40')); np.position.set(s * 1300, BR * 0.55, BR * 0.62 + 1030); body.add(np); }
    // Arme: massig, mit Klauen
    const arms = [];
    for (const s of [-1, 1]) {
      const sh = new T.Group(); sh.position.set(s * BR * 0.98, BR * 0.55, 0); body.add(sh);
      const up = new T.Mesh(mottled(new T.CylinderGeometry(800, 650, 3600, 20), skin), skinM); up.position.y = -1800; sh.add(up);
      const el = new T.Group(); el.position.y = -3600; sh.add(el);
      const fo = new T.Mesh(mottled(new T.CylinderGeometry(650, 520, 3200, 20), skin), skinM); fo.position.y = -1600; el.add(fo);
      const hand = new T.Mesh(mottled(new T.SphereGeometry(800, 18, 14), skin), skinM); hand.position.y = -3500; hand.scale.set(1, 0.8, 0.6); el.add(hand);
      for (let f = 0; f < 4; f++) { const fi = new T.Mesh(new T.CylinderGeometry(150, 130, 900, 10), skinM); fi.position.set((f - 1.5) * 320, -4200, 200); fi.rotation.x = 0.3; el.add(fi); const cl = new T.Mesh(L.GEO.cone, phong('#d8c890')); cl.scale.set(110, 380, 110); cl.position.set((f - 1.5) * 320, -4750, 380); cl.rotation.x = Math.PI + 0.4; el.add(cl); }
      sh.rotation.z = s * 0.45; arms.push({ sh, el, s });
    }
    // Beine (kurz, dick)
    for (const s of [-1, 1]) { const lg = new T.Mesh(mottled(new T.CylinderGeometry(1000, 800, 2600, 18), skin), skinM); lg.position.set(s * 1500, -BR - 900, 0); body.add(lg); const ft = new T.Mesh(mottled(new T.SphereGeometry(1000, 16, 12), skin), skinM); ft.position.set(s * 1500, -BR - 2300, 400); ft.scale.set(1, 0.5, 1.4); body.add(ft); }
    // Kopf: massiv, Glatze mit Adern und Narben, Doppelkinn
    const head = new T.Group(); head.position.set(0, BR + 900, 600); body.add(head);
    for (let k = 0; k < 3; k++) { const chin = new T.Mesh(mottled(new T.SphereGeometry(1500 - k * 180, 28, 20), skin), skinM); chin.position.set(0, -900 - k * 260, 300 + k * 120); chin.scale.set(1, 0.45, 0.9); head.add(chin); }
    const skull = new T.Mesh(mottled(new T.SphereGeometry(1600, 40, 30), skin), skinM); skull.scale.set(1, 1.05, 0.95); head.add(skull);
    for (let k = 0; k < 14; k++) { const vn = new T.Mesh(new T.CylinderGeometry(28, 28, 700 + Math.random() * 600, 6), phong('#8a3a5a')); onSphere(head, 1600, 0.3 + Math.random() * 1.1, -1.4 + Math.random() * 2.8, vn, 10); vn.rotateX(Math.PI / 2); vn.rotateZ(Math.random() * 3); }
    for (let k = 0; k < 3; k++) { const sc = new T.Mesh(L.GEO.box, phong('#b05a5a')); sc.scale.set(60, 40, 700); onSphere(head, 1600, 0.6 + k * 0.2, -0.5 + k * 0.5, sc, 15); }
    // Augen: gelblich, blutunterlaufen, wütende Brauen
    const eyes = [];
    for (const s of [-1, 1]) {
      const eg = new T.Group(); eg.position.set(s * 560, 250, 1380); head.add(eg);
      eg.add(new T.Mesh(new T.SphereGeometry(300, 20, 16), phong('#f0e0a0')));
      for (let v = 0; v < 6; v++) { const vv = new T.Mesh(L.GEO.box, new T.MeshBasicMaterial({ color: 0xc02020, fog: false })); vv.scale.set(10, 10, 200); onSphere(eg, 300, (Math.random() - 0.5) * 1.2, Math.random() * 6.28, vv, 2); }
      const iris = new T.Mesh(new T.SphereGeometry(120, 14, 10), new T.MeshBasicMaterial({ color: 0x8a1a10, fog: false })); iris.position.z = 230; eg.add(iris);
      const pup = new T.Mesh(new T.SphereGeometry(60, 10, 8), new T.MeshBasicMaterial({ color: 0x000000, fog: false })); pup.position.z = 300; eg.add(pup);
      const brow = new T.Mesh(L.GEO.box, phong('#2a1a10')); brow.scale.set(700, 140, 160); brow.position.set(s * 560, 620, 1450); brow.rotation.z = -s * 0.45; head.add(brow);
      eyes.push(eg);
    }
    const nose = new T.Mesh(mottled(new T.SphereGeometry(380, 16, 12), skin), skinM); nose.position.set(0, -50, 1600); nose.scale.set(1, 0.8, 0.9); head.add(nose);
    // Maul mit Kiefer, schiefen Zähnen, Zunge und Sabber
    const jaw = new T.Group(); jaw.position.set(0, -500, 700); head.add(jaw);
    const cav = new T.Mesh(new T.SphereGeometry(900, 24, 16), new T.MeshBasicMaterial({ color: 0x2a0606, fog: false })); cav.scale.set(1.2, 0.5, 0.6); cav.position.set(0, -250, 650); head.add(cav);
    const lowJ = new T.Mesh(mottled(new T.SphereGeometry(1100, 24, 16), skin), skinM); lowJ.scale.set(1.1, 0.42, 0.75); lowJ.position.set(0, -350, 200); jaw.add(lowJ);
    const tongue = new T.Mesh(new T.SphereGeometry(600, 16, 12), phong('#c0405a')); tongue.scale.set(1, 0.3, 1); tongue.position.set(0, -120, 500); jaw.add(tongue);
    for (let k = 0; k < 14; k++) { const a = (k / 13 - 0.5) * 2.3, t1 = new T.Mesh(L.GEO.cone, phong(k % 3 ? '#e8d890' : '#c8b060')); t1.scale.set(90, 260 + Math.random() * 160, 90); t1.position.set(Math.sin(a) * 1000, -40, 700 + Math.cos(a) * 420); t1.rotation.z = (Math.random() - 0.5) * 0.5; jaw.add(t1); const t2 = new T.Mesh(L.GEO.cone, phong('#e8d890')); t2.scale.set(90, 240 + Math.random() * 140, 90); t2.position.set(Math.sin(a) * 1000, -430, 1480 + Math.cos(a) * 200 - 600); t2.rotation.x = Math.PI; head.add(t2); }
    const drool = []; for (let k = 0; k < 5; k++) { const d = new T.Mesh(new T.CylinderGeometry(25, 12, 1, 6), new T.MeshPhongMaterial({ color: 0xd8f0ff, transparent: true, opacity: 0.7, shininess: 120, fog: false })); d.position.set(-600 + k * 300, -900, 1300); head.add(d); drool.push(d); }
    g.traverse((o) => { if (o.isMesh) { o.material.fog = false; o.frustumCulled = false; o.castShadow = false; } });
    L.scene.add(g);
    g.userData = { body, belly, arms, head, jaw, eyes, drool, sweat, headY: BR + 900 };
    return g;
  }
  // Bewegung jeden Frame: atmen, schmatzen, Arme schwingen, auf dich schauen
  function animB(dt, open) {
    const u = bern.g.userData, t = performance.now() / 1000;
    const br = 1 + Math.sin(t * 0.9) * 0.035; u.belly.scale.set(1.08 * br, 1 / br * 1.0, 1.12 * br);
    u.jaw.rotation.x = L.lerp(u.jaw.rotation.x, open ? 0.65 + Math.sin(t * 6) * 0.08 : 0.08 + Math.max(0, Math.sin(t * 2.2)) * 0.15, Math.min(1, dt * 4));
    for (const a of u.arms) { a.sh.rotation.x = Math.sin(t * 0.7 + a.s) * 0.35 - (open ? 0.6 : 0); a.el.rotation.x = -0.5 - Math.max(0, Math.sin(t * 0.9 + a.s)) * 0.6; }
    u.drool.forEach((d, i) => { const l = 1200 + Math.sin(t * 1.5 + i) * 500 + (open ? 900 : 0); d.scale.y = l; d.position.y = -900 - l / 2; });
    if (Math.random() < dt * 4) { const s = L.pick(u.sweat), wp = new T.Vector3(); s.getWorldPosition(wp); if (L.inMoon(P.x)) L.fx('#d8f0ff', wp.x, wp.y, wp.z, 2, 40, { size: 30, life: 2, g: 1 }); }
    // Kopf und Augen verfolgen dich
    const hp = new T.Vector3(); u.head.getWorldPosition(hp); u.head.lookAt(P.x, P.y + 2, P.z); u.head.rotation.x = L.clamp(u.head.rotation.x, -0.8, 0.8);
    for (const e of u.eyes) e.lookAt(P.x, P.y + 2, P.z);
  }
  function startBernhard() {
    const I = moonIsl; if (!I.earth) return;
    if (!bern || !bern.g) bern = { g: buildBernhard() };
    bern.phase = 'cine'; bern.t = 0; bern.g.visible = true; bern.frags = []; bern.hp = BERN_HP;
    const E0 = I.earth.position;
    bern.g.position.set(E0.x - 30000, E0.y + 9000, E0.z - 14000); bern.g.rotation.set(0, 0, 0); bern.g.scale.setScalar(1);
    L.banner('😈 BERNHARD DER VERSCHLUCKER', 'Er frisst ganze Welten … zuerst die Erde. Dann jagt er DICH.');
    L.startCine('😈 BERNHARD DER VERSCHLUCKER', 9, (t) => {
      const Ep = I.earth.position, b = bern.g.position;
      if (t < 5.5) return { x: Ep.x + 16000, y: Ep.y + 3000, z: Ep.z + 16000, lx: (Ep.x + b.x) / 2, ly: (Ep.y + b.y) / 2, lz: (Ep.z + b.z) / 2 };
      return { x: MOON.x + 80, y: 30, z: MOON.z + 80, lx: b.x, ly: b.y + 2000, lz: b.z };
    });
  }
  function biteEarth() {
    const I = moonIsl, Ep = I.earth.position.clone();
    I.earth.visible = false; I.atmo.visible = false; L.shake = 1.6;
    L.snd.bossRoar && L.snd.bossRoar({ x: P.x, y: 5, z: P.z });
    for (let k = 0; k < 16; k++) { const f = new T.Mesh(new T.DodecahedronGeometry(250 + Math.random() * 450), new T.MeshBasicMaterial({ color: k % 3 ? 0x2a6ac0 : 0x3a8a3a, fog: false })); f.position.copy(Ep).add(new T.Vector3(L.rand(-1500, 1500), L.rand(-1500, 1500), L.rand(-1500, 1500))); f.userData.v = new T.Vector3(L.rand(-1, 1), L.rand(-0.4, 1), L.rand(-1, 1)).multiplyScalar(1600); L.scene.add(f); bern.frags.push(f); }
    L.msg('🌍💥 Bernhard hat die ERDE mit einem Bissen zerfetzt und verschluckt!', 5000);
  }
  function headWorld(out) { bern.g.userData.head.getWorldPosition(out); return out; }
  function updateBernhard(dt) {
    const I = moonIsl;
    if (!bern || !bern.phase || bern.phase === 'gone') {
      if (L.inMoon(P.x) && I.built && !L.cine && L.state === 'game') {
        bTimer -= dt;
        if (bTimer <= 12 && !bWarned) { bWarned = true; L.msg('⚠️ Etwas Gigantisches nähert sich der Erde … bleib in der Nähe vom 🍔 Burger!', 6000); }
        if (bTimer <= 0) { bTimer = 180; bWarned = false; startBernhard(); }
      }
      return;
    }
    if (!L.inMoon(P.x)) { if (iva) endIva(); bern.g.visible = false; bern.phase = 'gone'; for (const f of bern.frags || []) L.scene.remove(f); if (I.earth) { I.earth.visible = true; I.atmo.visible = true; } return; }
    bern.t += dt; const b = bern.g, Ep = I.earth.position;
    for (const f of bern.frags || []) { f.position.addScaledVector(f.userData.v, dt); f.rotation.x += dt; f.rotation.y += dt * 0.7; }
    if (bern.phase === 'cine') {
      animB(dt, bern.t > 2.5 && bern.t < 4.5);
      if (bern.t < 4.2) b.position.lerp(new T.Vector3(Ep.x - 2500, Ep.y - 7000, Ep.z - 9000), dt * 0.9);
      b.lookAt(Ep.x, b.position.y, Ep.z);
      if (bern.t > 4.2 && I.earth.visible) biteEarth();
      if (bern.t > 9 || !L.cine) { bern.phase = 'approach'; bern.t = 0; bern.from = b.position.clone(); L.msg('😈 Bernhard hat DICH entdeckt! Er jagt dich jetzt 10 Minuten – nur der 🍔 Burger ist sicher!', 7000); }
    } else if (bern.phase === 'approach') {
      animB(dt, false);
      const u = Math.min(1, bern.t / 15), to = new T.Vector3(P.x - 2000, 9000, P.z - 9000);
      b.position.lerpVectors(bern.from, to, u * u * (3 - 2 * u)); b.lookAt(P.x, b.position.y, P.z);
      if (Math.random() < dt * 2) L.shake = Math.max(L.shake, u * 0.6);
      if (u >= 1) { bern.phase = 'hunt'; bern.t = 0; bern.huntT = HUNT; bern.next = 14; }
    } else if (bern.phase === 'hunt' || bern.phase === 'aim' || bern.phase === 'chomp' || bern.phase === 'rise') {
      bern.huntT -= dt;
      if (bern.phase === 'hunt') {
        // schwebt über dir und folgt dir
        animB(dt, false);
        const want = new T.Vector3(P.x - 1500, 8500 + Math.sin(bern.t * 0.4) * 600, P.z - 8000);
        b.position.lerp(want, Math.min(1, dt * 0.25)); b.rotation.set(0, Math.atan2(P.x - b.position.x, P.z - b.position.z), 0);
        bern.next -= dt;
        if (bern.next <= 0) {
          bern.next = 20 + Math.random() * 10;
          if (L.inBurger(P.x, P.z)) { L.msg('😤 Bernhard hämmert wütend auf den Burger – aber er kommt nicht rein!', 3000); L.shake = 0.9; }
          else { bern.phase = 'aim'; bern.st = 0; bern.tx = P.x + P.vx * 1.5; bern.tz = P.z + P.vz * 1.5; ring(bern.tx, bern.tz); L.msg('⚠️ BERNHARD BEISST ZU – RAUS AUS DEM ROTEN KREIS!', 2500); L.snd.bossRoar && L.snd.bossRoar({ x: P.x, y: 5, z: P.z }); }
        }
        if (bern.huntT <= 0) { bern.phase = 'final'; bern.t = 0; bern.from = b.position.clone(); L.msg('😱 Die 10 Minuten sind um – Bernhard frisst jetzt den GANZEN MOND! In den 🍔 Burger!', 6000); }
      } else if (bern.phase === 'aim') {
        bern.st += dt; animB(dt, true);
        if (bern.st > 5) { bern.phase = 'chomp'; bern.st = 0; bern.chompFrom = b.position.clone(); bern.chompRot = b.rotation.y; }
      } else if (bern.phase === 'chomp') {
        // stürzt mit dem Kopf voran herab und beißt zu
        bern.st += dt; animB(dt, bern.st < 1.0);
        const u = Math.min(1, bern.st / 1.1), pitch = 1.25 * u, yaw = Math.atan2(bern.tx - bern.chompFrom.x, bern.tz - bern.chompFrom.z), hy = b.userData.headY;
        const fwd = new T.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
        const target = new T.Vector3(bern.tx, 600, bern.tz).addScaledVector(fwd, -Math.sin(pitch) * hy).add(new T.Vector3(0, -Math.cos(pitch) * hy, 0));
        b.position.lerpVectors(bern.chompFrom, target, u * u); b.rotation.set(0, yaw, 0); b.rotateX(pitch);
        if (u >= 1 && !bern.bit) {
          bern.bit = true; L.shake = 2; L.snd.explosion && L.snd.explosion({ x: bern.tx, y: 0, z: bern.tz });
          L.fx('#8a8a8e', bern.tx, 2, bern.tz, 60, 30, { size: 3, life: 2 }); L.decal(bern.tx, bern.tz, CHOMP_R * 0.6, '#2a2a2e');
          if (P.alive && Math.hypot(P.x - bern.tx, P.z - bern.tz) < CHOMP_R && !L.inBurger(P.x, P.z)) { if (P.vehicle && L._leaveVehicle) L._leaveVehicle(true); L.hurtPlayer(99999, 'Von Bernhard dem Verschlucker verschluckt'); }
        }
        if (bern.st > 1.8) { bern.phase = 'rise'; bern.st = 0; bern.bit = false; bern.riseFrom = b.position.clone(); }
      } else if (bern.phase === 'rise') {
        bern.st += dt; animB(dt, false);
        const u = Math.min(1, bern.st / 3); b.position.lerpVectors(bern.riseFrom, new T.Vector3(P.x - 1500, 8500, P.z - 8000), u * u * (3 - 2 * u)); b.rotation.set(0, b.rotation.y, 0); b.rotateX(1.25 * (1 - u));
        if (u >= 1) bern.phase = 'hunt';
      }
    } else if (bern.phase === 'final') {
      animB(dt, true);
      const u = Math.min(1, bern.t / 12), to = new T.Vector3(MOON.x, 4500, MOON.z - 3000);
      b.position.lerpVectors(bern.from, to, u * u * (3 - 2 * u)); b.rotation.set(0, Math.atan2(MOON.x - b.position.x, MOON.z - b.position.z), 0);
      if (Math.random() < dt * 3) L.shake = Math.max(L.shake, u);
      if (u >= 1) eatMoon();
    } else if (bern.phase === 'eat') {
      animB(dt, true);
      if (bern.t > 2.5) { for (const m of I.surface) m.visible = true; startIvaEnd(); }
    } else if (bern.phase === 'iva') {
      updateIvaEnd(dt);
    } else if (bern.phase === 'leave') {
      animB(dt, false);
      const u = Math.min(1, bern.t / 10); b.position.lerpVectors(bern.from, new T.Vector3(MOON.x + 60000, 40000, MOON.z + 60000), u);
      if (u >= 1) { bern.phase = 'gone'; b.visible = false; for (const f of bern.frags) L.scene.remove(f); bern.frags = []; I.earth.visible = true; I.atmo.visible = true; L.msg('🌍 Die Erde ist wieder da. Bernhard kommt in 3 Minuten wieder.', 5000); }
    }
  }
  // ---------- Kurzfilm: MAMA IVA steigt aus der Erde, zieht Bernhard herunter und frisst ihn mit einem gigantischen Maul ----------
  let iva = null;
  function buildMaw() {
    const g = new T.Group(), flesh = (c) => new T.MeshBasicMaterial({ color: c, fog: false, side: T.DoubleSide });
    const throat = new T.Mesh(new T.SphereGeometry(1, 32, 24, 0, 6.283, 0, Math.PI / 2), flesh(0x2a0004)); throat.rotation.x = -Math.PI / 2; throat.scale.set(1, 1, 1.6); g.add(throat);
    for (let r = 0; r < 5; r++) { const ring = new T.Mesh(new T.TorusGeometry(0.9 - r * 0.16, 0.05, 8, 40), flesh(r % 2 ? 0x6a0a14 : 0x4a0008)); ring.position.z = -r * 0.28; g.add(ring); }
    const lip = new T.Mesh(new T.TorusGeometry(1, 0.16, 12, 48), new T.MeshPhongMaterial({ color: 0x8a2030, shininess: 90, fog: false })); g.add(lip);
    for (let r = 0; r < 3; r++) for (let k = 0; k < 26; k++) { const a = k / 26 * 6.283, rr = 0.95 - r * 0.2, t1 = new T.Mesh(L.GEO.cone, new T.MeshPhongMaterial({ color: r ? 0xd8c890 : 0xf0e8c8, shininess: 60, fog: false })); t1.scale.set(0.05, 0.22 + Math.random() * 0.12, 0.05); t1.position.set(Math.cos(a) * rr, Math.sin(a) * rr, -r * 0.18); t1.rotation.z = a + Math.PI / 2; t1.rotateX(0.5); g.add(t1); }
    const strings = []; for (let k = 0; k < 9; k++) { const st = new T.Mesh(new T.CylinderGeometry(0.012, 0.02, 1, 6), new T.MeshPhongMaterial({ color: 0xd8e8f0, transparent: true, opacity: 0.7, shininess: 120, fog: false })); st.position.set(-0.6 + k * 0.15, 0, 0.05); g.add(st); strings.push(st); }
    const tongue = new T.Mesh(new T.SphereGeometry(0.4, 16, 12), new T.MeshPhongMaterial({ color: 0xa02040, shininess: 80, fog: false })); tongue.scale.set(1, 0.35, 1.6); tongue.position.set(0, -0.45, -0.4); g.add(tongue);
    g.userData = { strings, tongue };
    g.traverse((o) => { if (o.isMesh) o.frustumCulled = false; });
    return g;
  }
  function startIvaEnd() {
    const I = moonIsl;
    bern.phase = 'iva'; bern.t = 0; bern.from = bern.g.position.clone();
    I.earth.visible = true; I.atmo.visible = true;
    for (const f of bern.frags) L.scene.remove(f); bern.frags = [];
    const E0 = I.earth.position.clone(), d = new T.Vector3(MOON.x, 0, MOON.z).sub(E0).normalize();
    const rig = L.buildKoloss(); rig.root.children.forEach((c, i) => { if (c !== rig.hull) c.visible = false; });
    rig.root.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); o.material.fog = false; o.frustumCulled = false; } });
    const K = 230; rig.root.scale.setScalar(K); rig.root.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d); L.scene.add(rig.root);
    const maw = buildMaw(); maw.scale.setScalar(1); maw.visible = false; L.scene.add(maw);
    const tend = []; for (let k = 0; k < 24; k++) { const m = new T.Mesh(new T.SphereGeometry(1, 10, 8), new T.MeshPhongMaterial({ color: k % 2 ? 0x3d2f22 : 0x5c4840, shininess: 40, fog: false })); m.frustumCulled = false; m.visible = false; L.scene.add(m); tend.push(m); }
    const glow = new T.Mesh(new T.SphereGeometry(2600, 32, 20), new T.MeshBasicMaterial({ color: 0xff1010, transparent: true, opacity: 0, side: T.BackSide, fog: false, blending: T.AdditiveBlending, depthWrite: false })); glow.position.copy(E0); L.scene.add(glow);
    const side = new T.Vector3().crossVectors(d, new T.Vector3(0, 1, 0)).normalize();
    iva = { rig, K, d, E0, side, maw, tend, glow, chunks: [] };
    L.banner('👹 MAMA IVA', '… sie hat Hunger.');
    L.startCine('👹 MAMA IVA HAT HUNGER', 15, () => iva && iva.cam);
    iva.cam = { x: 0, y: 0, z: 0, lx: 0, ly: 0, lz: 0 };
  }
  function updateIvaEnd(dt) {
    const V = iva, t = bern.t, b = bern.g, d = V.d, E0 = V.E0;
    animB(dt, true);
    // MAMA IVA steigt aus der Erde (Oberkörper), rotes Glühen, Herzschlag
    const rise = L.clamp(t / 3, 0, 1), surf = E0.clone().addScaledVector(d, 2200);
    V.rig.root.position.copy(surf).addScaledVector(d, -V.K * 8 + rise * V.K * 6);
    V.glow.material.opacity = Math.min(0.35, t * 0.12);
    if (Math.floor(t * 1.4) !== Math.floor((t - dt) * 1.4) && L.snd.heart) L.snd.heart();
    const headW = new T.Vector3(); V.rig.head.getWorldPosition(headW);
    const mawPos = headW.clone().addScaledVector(d, V.K * 2);
    // Fangarm schnappt Bernhard (2–5 s) und zieht ihn herunter
    if (t > 2 && t < 10) {
      const grab = L.clamp((t - 2) / 1.2, 0, 1), pull = L.clamp((t - 3.5) / 4, 0, 1);
      const bp = new T.Vector3().lerpVectors(bern.from, mawPos.clone().addScaledVector(d, 2500), pull * pull);
      b.position.copy(bp); b.scale.setScalar(1 - pull * 0.75);
      V.tend.forEach((m, i) => { const u = i / (V.tend.length - 1) * grab; m.visible = true; m.position.lerpVectors(headW, bp, u).add(V.side.clone().multiplyScalar(Math.sin(u * Math.PI * 3 + t * 4) * 600 * (1 - u))); m.scale.setScalar(260 - i * 6); });
      if (t > 2 && !V.screamed) { V.screamed = true; L.snd.scream && L.snd.scream({ x: P.x, y: 5, z: P.z }); }
    }
    // das Maul wächst – Kopf und Brust werden zu einem gigantischen Schlund (5–9 s)
    if (t > 5) {
      const g2 = L.clamp((t - 5) / 4, 0, 1), sc = 200 + g2 * g2 * 3200;
      V.maw.visible = true; V.maw.position.copy(mawPos); V.maw.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), d); V.maw.scale.setScalar(sc);
      V.maw.userData.strings.forEach((st, i) => { st.scale.y = 0.5 + Math.sin(t * 3 + i) * 0.4 + g2 * 0.5; });
      V.maw.userData.tongue.position.z = -0.4 + Math.sin(t * 5) * 0.15;
      V.rig.head.visible = g2 < 0.4;
    }
    // Bernhard verschwindet im Schlund (9–12 s): zermalmt, Fetzen fliegen
    if (t > 9 && t < 12.5) {
      const u = L.clamp((t - 9) / 2.5, 0, 1);
      b.position.lerpVectors(b.position, mawPos.clone().addScaledVector(d, -600), dt * 2.5); b.scale.setScalar(Math.max(0.02, 0.25 * (1 - u)));
      if (u >= 1) b.visible = false;
      if (Math.random() < dt * 14) { const ch = new T.Mesh(new T.DodecahedronGeometry(80 + Math.random() * 220), new T.MeshPhongMaterial({ color: Math.random() < 0.6 ? 0x8a0a10 : 0xd8a48a, shininess: 80, fog: false })); ch.frustumCulled = false; ch.position.copy(mawPos).add(new T.Vector3(L.rand(-900, 900), L.rand(-900, 900), L.rand(-900, 900))); ch.userData.v = d.clone().multiplyScalar(L.rand(400, 1200)).add(new T.Vector3(L.rand(-600, 600), L.rand(-600, 600), L.rand(-600, 600))); L.scene.add(ch); V.chunks.push(ch); }
      if (Math.random() < dt * 3) { L.shake = Math.max(L.shake, 1.2); L.snd.explosion && L.snd.explosion({ x: P.x, y: 5, z: P.z }); L.snd.splat && L.snd.splat({ x: P.x, y: 2, z: P.z }); }
    }
    for (const ch of V.chunks) { ch.position.addScaledVector(ch.userData.v, dt); ch.userData.v.addScaledVector(d, -300 * dt); ch.rotation.x += dt * 2; }
    // Maul schließt sich, MAMA IVA sinkt zurück (12.5–15 s)
    if (t > 12.5) { const u = L.clamp((t - 12.5) / 2.5, 0, 1); V.maw.scale.setScalar(3400 * (1 - u) + 1); V.rig.root.position.addScaledVector(d, -V.K * 6 * dt / 2.5); V.glow.material.opacity = 0.35 * (1 - u); for (const m of V.tend) m.visible = false; }
    // Kamera: erst weit (IVA + Bernhard), dann nah am Schlund
    const far = E0.clone().addScaledVector(d, 19000).addScaledVector(V.side, 7000).add(new T.Vector3(0, 3500, 0));
    const close = mawPos.clone().addScaledVector(d, 9000).addScaledVector(V.side, 3500).add(new T.Vector3(0, 1500, 0));
    const k = t < 4.5 ? 0 : t < 6 ? (t - 4.5) / 1.5 : t < 12.5 ? 1 : 1 - L.clamp((t - 12.5) / 2, 0, 1);
    const cp = new T.Vector3().lerpVectors(far, close, k), look = k < 0.5 ? b.position.clone().lerp(headW, 0.5) : mawPos;
    Object.assign(V.cam, { x: cp.x, y: cp.y, z: cp.z, lx: look.x, ly: look.y, lz: look.z });
    if (t > 15 || (!L.cine && t > 1)) endIva();
  }
  function endIva() {
    const V = iva; if (!V) return;
    L.scene.remove(V.rig.root); L.scene.remove(V.maw); L.scene.remove(V.glow); for (const m of V.tend) L.scene.remove(m); for (const c of V.chunks) L.scene.remove(c);
    iva = null; bern.phase = 'gone'; bern.g.visible = false; bern.g.scale.setScalar(1);
    // überlebt (nicht besiegt): Riesenkiste im Burger
    if (!bern.killed && P.alive && !P.gone && L.inMoon(P.x) && L.bossReward) L.bossReward('bernhard', BURGER.x, BURGER.z, 0.2, 'survive');
    bern.killed = false;
    moonIsl.earth.visible = true; moonIsl.atmo.visible = true;
    L.msg('👹 MAMA IVA hat Bernhard gefressen … Er kommt in 3 Minuten wieder. Wenn er sich traut.', 7000);
  }
  const rings = [];
  function ring(x, z) {
    const m = new T.Mesh(new T.RingGeometry(CHOMP_R - 3, CHOMP_R, 64), new T.MeshBasicMaterial({ color: 0xff2020, transparent: true, opacity: 0.85, side: T.DoubleSide, fog: false, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.3, z); L.scene.add(m); rings.push({ m, t: 0 });
  }
  function updateRings(dt) { for (let i = rings.length - 1; i >= 0; i--) { const r = rings[i]; r.t += dt; r.m.material.opacity = 0.5 + Math.sin(r.t * 14) * 0.35; if (r.t > 6.2) { L.scene.remove(r.m); rings.splice(i, 1); } } }
  function eatMoon() {
    bern.phase = 'eat'; bern.t = 0;
    L.shake = 2; L.env.bolt = 1; flashScreen();
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
    const ph = bern && bern.phase;
    if (ph === 'aim' || ph === 'chomp') return '⚠️ BERNHARD BEISST ZU – RAUS AUS DEM ROTEN KREIS!';
    if (ph === 'hunt' || ph === 'rise') return '😈 BERNHARD jagt dich – noch ' + L.fmt(Math.max(0, bern.huntT)) + ' · nur der 🍔 Burger ist sicher';
    if (ph === 'final') return '😱 BERNHARD FRISST DEN MOND! In den 🍔 Burger! (' + Math.max(0, Math.ceil(12 - bern.t)) + ' s)';
    if (ph === 'iva') return '👹 MAMA IVA FRISST BERNHARD';
    if (ph === 'cine' || ph === 'approach' || ph === 'eat' || ph === 'leave') return '😈 BERNHARD DER VERSCHLUCKER';
    return '🍔 Bernhard kommt in ' + L.fmt(Math.max(0, bTimer));
  };
  L.moonNav = () => (L.inMoon(P.x) && bern && ['hunt', 'aim', 'chomp', 'rise', 'final', 'approach'].includes(bern.phase) && !L.inBurger(P.x, P.z) ? BURGER : null);
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
    updateRings(dt);
  };
  L._moonDbg = { setT: (v) => { bTimer = v; }, bern: () => bern, isl: () => moonIsl };
  L.clearMoon = function () { trip = null; bTimer = 45; if (bern && bern.g) { bern.g.visible = false; bern.phase = 'gone'; } if (moonIsl.earth) { moonIsl.earth.visible = true; moonIsl.atmo.visible = true; } if (moonIsl.surface) for (const m of moonIsl.surface) m.visible = true; };
})();
