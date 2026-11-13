'use strict';
// Kreuzfahrtschiff (begehbar, Ziel am Ticketschalter wählen, Überfahrt als Kurzfilm) und „Der Wächter“ auf dem Turmdach mit Wappen-Signal
(function () {
  const L = window.L, T = THREE, P = L.player;
  // ---------- Schiffsmodell (Außenhaut) ----------
  function shipModel(w, d, h) {
    const g = new T.Group(), box = L.GEO.boxB;
    const add = (c, sx, sy, sz, x, y, z, o) => { const m = new T.Mesh(box, L.mat(c, o)); m.scale.set(sx, sy, sz); m.position.set(x, y, z); g.add(m); return m; };
    add('#f4f4f2', w + 0.4, h + 6, d + 0.4, 0, -6, 0);
    add('#1e3a6a', w + 0.5, 2.5, d + 0.5, 0, -6, 0);
    add('#c02a2a', w + 0.5, 0.6, d + 0.5, 0, -3.6, 0);
    const bow = new T.Mesh(new T.ConeGeometry(w / 2 + 0.2, 26, 4), L.mat('#f4f4f2')); bow.rotation.x = Math.PI / 2; bow.rotation.y = Math.PI / 4; bow.scale.set(1, 1, 0.5); bow.position.set(0, -1, d / 2 + 12); g.add(bow);
    for (let k = 0; k < Math.floor(h / 3.2); k++) for (const s of [-1, 1]) add('#20303e', 0.06, 0.9, d * 0.92, s * (w / 2 + 0.22), k * 3.2 + 1.2, 0, { noShadow: true });
    for (const s of [-1, 1]) for (let k = 0; k < 6; k++) add('#f08020', 1.6, 1.4, 6, s * (w / 2 + 1.2), h - 6, -d * 0.35 + k * d * 0.14);
    for (let k = 0; k < 2; k++) { const f = new T.Mesh(L.GEO.cylB, L.mat('#c02a2a')); f.scale.set(3, 9, 3); f.position.set(0, h, -d * 0.15 + k * 14); g.add(f); add('#1a1a1a', 6.2, 1.2, 6.2, 0, h + 8, -d * 0.15 + k * 14); }
    add('#3aa0e0', w * 0.5, 0.4, 14, 0, h + 0.1, d * 0.2);
    for (let k = 0; k < 8; k++) add('#f2f2f2', 0.8, 0.5, 2, -w * 0.3 + (k % 4) * 3, h, d * 0.35 + Math.floor(k / 4) * 3);
    return g;
  }
  // ---------- Anleger: Heimat (Schiff begehbar) und jede Insel ----------
  const docks = [];
  let homeShip = null, built = false, overlay = null;
  function setup() {
    built = true;
    // begehbares Schiff vor dem Oststrand (Tür im Westen, zum Strand hin)
    const B = { x: 1540, z: 900, w: 24, d: 110, h: 22.4, poi: 'schiff', id: 77777, doorSide: 'w', ship: true };
    B.box = L.addBox(B.x - B.w / 2, B.z - B.d / 2, B.x + B.w / 2, B.z + B.d / 2, B.h, 'building');
    L.buildings.push(B); homeShip = B;
    const m = shipModel(B.w, B.d, B.h); m.position.set(B.x, 0, B.z); L.scene.add(m);
    // Laufsteg vom Strand
    const plank = new T.Mesh(L.GEO.boxB, L.mat('#7a5a3a')); plank.scale.set(B.x - B.w / 2 - 1480, 0.25, 2.4); plank.position.set((1480 + B.x - B.w / 2) / 2, -0.2, L.doorPos(B)); L.scene.add(plank);
    docks.push({ id: 'home', name: '🏠 Heimat (Altheim)', x: B.x - B.w / 2 + 3, z: L.doorPos(B), sx: B.x, sz: B.z, yaw: 0, model: m, land: { x: 1490, z: L.doorPos(B) } });
    for (const I of L.ISL) {
      if (I.dim) continue;
      const a = Math.atan2(-I.x, -I.z);
      const dx = I.x + Math.sin(a) * (I.r - 12), dz = I.z + Math.cos(a) * (I.r - 12);
      docks.push({ id: I.id, name: I.icon + ' ' + I.name, x: dx, z: dz, sx: I.x + Math.sin(a) * (I.r + 80), sz: I.z + Math.cos(a) * (I.r + 80), yaw: a, land: { x: dx, z: dz }, I });
    }
  }
  function buildIslandDock(d) {
    if (d.built || !d.I || !d.I.built) return;
    d.built = true;
    const m = shipModel(24, 110, 22.4); m.position.set(d.sx, 0, d.sz); m.rotation.y = d.yaw; d.I.group.add(m); d.model = m;
    const sign = new T.Mesh(L.GEO.boxB, L.mat('#1e3a6a')); sign.scale.set(0.2, 3, 0.2); sign.position.set(d.x, 0, d.z); d.I.group.add(sign);
    const board = new T.Mesh(new T.PlaneGeometry(3, 1.2), new T.MeshLambertMaterial({ map: L.textTex('⚓ KREUZFAHRT', 256, 100, '#1e3a6a', '#ffffff', 'bold 30px sans-serif'), side: T.DoubleSide }));
    board.position.set(d.x, 3.4, d.z); board.rotation.y = d.yaw; d.I.group.add(board);
  }
  // ---------- Ticketschalter ----------
  function nearDock() { for (const d of docks) if (Math.hypot(P.x - d.x, P.z - d.z) < 3.2 && Math.abs(P.y || 0) < 2) return d; return null; }
  L.cruiseHint = () => (P.vehicle ? null : nearDock() ? 'E: Kreuzfahrt-Ticket – Ziel wählen' : null);
  L.cruiseInteract = function () {
    const d = nearDock(); if (!d || P.vehicle) return false;
    openPicker(d); return true;
  };
  function openPicker(from) {
    if (!overlay) {
      overlay = document.createElement('div'); overlay.className = 'overlay'; overlay.id = 'cruisePick';
      overlay.innerHTML = '<div class="panel"><h2>🛳️ Kreuzfahrt <small>Wohin soll es gehen?</small></h2><div id="cruiseList" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px;margin:10px 0"></div><button class="btn" id="cruiseClose">Abbrechen</button></div>';
      document.getElementById('hud').parentNode.appendChild(overlay);
      overlay.querySelector('#cruiseClose').onclick = closePicker;
    }
    const list = overlay.querySelector('#cruiseList'); list.innerHTML = '';
    const mv = myVehNear(from), info = overlay.querySelector('#cruiseVeh') || (() => { const d = document.createElement('p'); d.id = 'cruiseVeh'; d.className = 'small'; list.parentNode.insertBefore(d, list); return d; })();
    info.textContent = mv ? '🚗 Dein ' + mv.t.name + ' kommt mit an Bord und steht am Ziel neben dir.' : '🚗 Tipp: Park dein Fahrzeug am Anleger (in der Nähe), dann nimmt das Schiff es mit.';
    for (const d of docks) {
      if (d === from) continue;
      const b = document.createElement('button'); b.className = 'btn'; b.textContent = d.name;
      b.onclick = () => { closePicker(); sail(from, d); };
      list.appendChild(b);
    }
    [...list.querySelectorAll('button')].forEach((b, i) => { b.textContent = (i + 1) + ') ' + b.textContent; });
    overlay.hidden = false; L.uiBlock = true; if (L.unlock) L.unlock();
  }
  // Ziel auch mit den Zahlentasten wählen (falls die Maus gefangen ist)
  document.addEventListener('keydown', (e) => {
    if (!overlay || overlay.hidden) return;
    const n = parseInt(e.key, 10), bs = [...overlay.querySelectorAll('#cruiseList button')];
    if (n >= 1 && n <= bs.length) { e.preventDefault(); bs[n - 1].click(); }
    if (e.key === 'Escape') closePicker();
  });
  function closePicker() { if (overlay) overlay.hidden = true; L.uiBlock = false; }
  // ---------- Überfahrt als Kurzfilm ----------
  let voyage = null;
  // dein zuletzt gefahrenes Fahrzeug, wenn es am Anleger steht
  function myVehNear(from) {
    const v = L.myVeh, t = v && v.t;
    if (!v || !L.ents.vehicles.includes(v) || t.police || t.boat || t.sub || t.plane || v.hp <= 0 || v.occupied || P.vehicle === v) return null;
    return Math.hypot(v.x - from.x, v.z - from.z) < 110 ? v : null;
  }
  // sicheren Platz an Land neben der Ankunft suchen
  function landSpot(cx, cz) {
    for (let k = 0; k < 120; k++) { const a = k * 0.75, d = 7 + k * 0.6, x = cx + Math.sin(a) * d, z = cz + Math.cos(a) * d; if (L.waterDepth(x, z) < -0.2 && !L.queryBoxes(x, z, 3).length) return { x, z }; }
    return { x: cx + 6, z: cz };
  }
  // Sonnendeck: Pool, Liegen, Schirme, Bar, Palmen, Tanzfläche, Lichterketten, Reling
  function decorateDeck(g, w, d, h) {
    const box = L.GEO.boxB, add = (c, sx, sy, sz, x, y, z, o) => { const m = new T.Mesh(box, L.mat(c, o)); m.scale.set(sx, sy, sz); m.position.set(x, y, z); g.add(m); return m; };
    for (const s of [-1, 1]) add('#d8dde2', 0.12, 1.1, d * 0.96, s * (w / 2 - 0.1), h, 0);
    add('#d8dde2', w, 1.1, 0.12, 0, h, -d / 2 + 0.2); add('#d8dde2', w, 1.1, 0.12, 0, h, d / 2 - 0.2);
    add('#c8a070', w - 0.6, 0.05, d * 0.9, 0, h + 0.01, 0);
    const towels = ['#ff5a8a', '#40a0ff', '#ffd040', '#60e080'];
    for (let k = 0; k < 10; k++) { const x = (k % 2 ? 1 : -1) * (w * 0.3), z = d * 0.05 + Math.floor(k / 2) * 4.5; add('#f2f2f2', 1.2, 0.45, 2.4, x, h + 0.05, z); add(towels[k % 4], 1.0, 0.06, 1.8, x, h + 0.5, z + 0.1); }
    for (let k = 0; k < 4; k++) { const x = (k % 2 ? 1 : -1) * (w * 0.3) + 1.8, z = d * 0.08 + Math.floor(k / 2) * 9; const p = new T.Mesh(L.GEO.cylB, L.mat('#888')); p.scale.set(0.06, 2.6, 0.06); p.position.set(x, h, z); g.add(p); const u = new T.Mesh(L.GEO.cone, L.mat(k % 2 ? '#ff5a5a' : '#ffd040')); u.scale.set(1.8, 0.6, 1.8); u.position.set(x, h + 2.7, z); g.add(u); }
    add('#5a3a20', 6, 1.1, 1.2, 0, h, -d * 0.12); add('#2a2a2a', 6.2, 0.1, 1.4, 0, h + 1.1, -d * 0.12);
    for (let k = 0; k < 5; k++) add('#c02a2a', 0.5, 0.75, 0.5, -2.4 + k * 1.2, h, -d * 0.12 + 1.2);
    for (const [c, x] of [['#40c0ff', -1.8], ['#ff8a2a', 0], ['#60e080', 1.8]]) add(c, 0.3, 0.35, 0.3, x, h + 1.2, -d * 0.12);
    for (const s of [-1, 1]) for (let k = 0; k < 3; k++) { const x = s * (w / 2 - 1.5), z = -d * 0.05 + k * 10; add('#8a5a3a', 0.9, 0.7, 0.9, x, h, z); const tr = new T.Mesh(L.GEO.cylB, L.mat('#7a5a3a')); tr.scale.set(0.18, 3.4, 0.18); tr.position.set(x, h + 0.7, z); g.add(tr); for (let l = 0; l < 5; l++) { const lf = new T.Mesh(L.GEO.box, L.mat('#2e8a3a')); lf.scale.set(0.3, 0.06, 2.2); lf.position.set(x + Math.sin(l * 1.26) * 0.9, h + 4.1, z + Math.cos(l * 1.26) * 0.9); lf.rotation.y = l * 1.26; lf.rotation.x = 0.35; g.add(lf); } }
    const df = new T.Group(); df.position.set(0, h + 0.03, -d * 0.3); g.add(df); g.userData.dance = [];
    for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) { const t2 = new T.Mesh(L.GEO.boxB, new T.MeshBasicMaterial({ color: 0xffffff })); t2.scale.set(1.4, 0.05, 1.4); t2.position.set((i - 2.5) * 1.45, 0, (j - 2.5) * 1.45); df.add(t2); g.userData.dance.push(t2); }
    for (const s of [-1, 1]) for (let k = 0; k < 20; k++) { const b = new T.Mesh(L.GEO.sph, new T.MeshBasicMaterial({ color: [0xff4060, 0xffd040, 0x40c0ff, 0x60ff80][k % 4] })); b.scale.setScalar(0.12); b.position.set(s * (w / 2 - 0.3), h + 3.2 - Math.abs(Math.sin(k / 19 * Math.PI)) * 0.6, -d * 0.45 + k * d * 0.045); g.add(b); }
    for (const s of [-1, 1]) add('#3a2a4a', 4, 0.7, 1.6, s * 4, h, d * 0.38);
  }
  L._cruise = { docks, sail: (a, b) => sail(a, b), get voyage() { return voyage; } };
  function sail(from, to) {
    const W0 = 24, D0 = 110, H0 = 22.4, m = shipModel(W0, D0, H0); decorateDeck(m, W0, D0, H0); L.scene.add(m);
    const a0 = Math.atan2(to.sx - from.sx, to.sz - from.sz);
    // startet genau dort, wo das geparkte Schiff liegt (das wird solange ausgeblendet), dreht dann Richtung Ziel
    voyage = { m, from, to, t: 0, dur: 45, yaw: from.yaw || 0, a0, veh: myVehNear(from), W: W0, D: D0, H: H0, lx: 0, lz: 8, first: true };
    if (from.model) from.model.visible = false;
    m.position.set(from.sx, 0, from.sz); m.rotation.set(0, voyage.yaw, 0);
    if (voyage.veh) { voyage.veh.rig.root.visible = false; voyage.veh.x = voyage.veh.z = 1e7; }
    L.snd.horn({ x: from.sx, y: 20, z: from.sz });
    L.banner('🛳️ LEINEN LOS!', 'Kurs auf ' + to.name + ' – 45 Sekunden chillen an Deck: Pool, Bar, Tanzfläche!');
    L.voyageOn = true;
  }
  // an Deck stehen: Boden ist das Sonnendeck
  const ofa = L.floorAt;
  L.floorAt = function (x, z, y) {
    const V = voyage;
    if (V && L.voyageOn) { const c = Math.cos(V.yaw), s = Math.sin(V.yaw), dx = x - V.m.position.x, dz = z - V.m.position.z, lx = dx * c - dz * s, lz = dx * s + dz * c; if (Math.abs(lx) < V.W / 2 + 0.5 && Math.abs(lz) < V.D / 2 + 0.5) return V.H + V.m.position.y + 0.06; }
    return ofa ? ofa(x, z, y) : null;
  };
  const angLerp = (a, b, u) => a + L.angDiff(a, b) * u;
  // Kurs: erst vom Anleger wegdrehen, geradeaus fahren, am Ende in die Liegeposition eindrehen
  function courseYaw(V, e) {
    const ys = V.from.yaw || 0, ye = V.to.yaw || 0;
    if (e < 0.12) return angLerp(ys, V.a0, e / 0.12);
    if (e > 0.86) return angLerp(V.a0, ye, (e - 0.86) / 0.14);
    return V.a0;
  }
  let fadeEl = null;
  function fade() {
    if (!fadeEl) { fadeEl = document.createElement('div'); fadeEl.style.cssText = 'position:fixed;inset:0;background:#000;opacity:0;pointer-events:none;z-index:40;transition:opacity .35s'; document.body.appendChild(fadeEl); }
    fadeEl.style.opacity = '1'; setTimeout(() => { fadeEl.style.opacity = '0'; }, 450);
  }
  function updateVoyage(dt) {
    const V = voyage; if (!V) return;
    const px0 = V.m.position.x, pz0 = V.m.position.z, yaw0 = V.yaw;
    V.t += dt;
    const k = Math.min(1, V.t / V.dur), e = k * k * (3 - 2 * k);
    const x = L.lerp(V.from.sx, V.to.sx, e), z = L.lerp(V.from.sz, V.to.sz, e);
    V.yaw = courseYaw(V, e);
    V.m.position.set(x, Math.sin(V.t * 0.8) * 0.4 * (1 - Math.max(0, (e - 0.9) * 10)), z); V.m.rotation.set(0, V.yaw, Math.sin(V.t * 0.5) * 0.015);
    // geparkte Schiffe: Abfahrt wieder zeigen, sobald wir weg sind – Ziel ausblenden, wenn wir ankommen (sonst fährt man hinein)
    if (V.from.model && !V.from.model.visible && Math.hypot(x - V.from.sx, z - V.from.sz) > 250) V.from.model.visible = true;
    if (V.to.model && V.to.model.visible && Math.hypot(x - V.to.sx, z - V.to.sz) < 400) V.to.model.visible = false;
    if (Math.random() < dt * 20) L.fx('#f0f8ff', x - Math.sin(V.yaw) * 60, 0, z - Math.cos(V.yaw) * 60, 3, 3, { size: 1, life: 1.5 });
    // Tanzfläche blinkt
    const tt = performance.now() / 1000; (V.m.userData.dance || []).forEach((t2, i) => t2.material.color.setHSL(((i * 0.13 + Math.floor(tt * 3) * 0.17) % 1), 1, 0.55));
    // der Spieler bleibt an Deck (fährt mit, kann herumlaufen)
    const c = Math.cos(V.yaw), s = Math.sin(V.yaw), c0 = Math.cos(yaw0), s0 = Math.sin(yaw0);
    if (V.first) { V.first = false; V.lx = 0; V.lz = 8; }
    else { const dx = P.x - px0, dz = P.z - pz0; V.lx = dx * c0 - dz * s0; V.lz = dx * s0 + dz * c0; }
    V.lx = L.clamp(V.lx, -V.W / 2 + 0.8, V.W / 2 - 0.8); V.lz = L.clamp(V.lz, -V.D / 2 + 1, V.D / 2 - 1);
    P.x = x + V.lx * c + V.lz * s; P.z = z - V.lx * s + V.lz * c;
    if (P.y < V.H - 1) { P.y = V.H + 0.5; P.vy = 0; }
    if (P.vehicle && L._leaveVehicle) L._leaveVehicle(true);
    if (Math.floor(V.t) % 15 === 0 && Math.floor(V.t - dt) % 15 !== 0 && V.t < V.dur - 2) L.msg('🛳️ Ankunft in ' + Math.ceil(V.dur - V.t) + ' s – ' + V.to.name, 2500);
    if (V.t >= V.dur) {
      L.scene.remove(V.m); L.voyageOn = false; fade();
      if (V.to.model) V.to.model.visible = true; if (V.from.model) V.from.model.visible = true;
      P.x = V.to.land.x; P.z = V.to.land.z; P.y = 0.5; P.vx = P.vz = 0; P.air = true; P.spawnProt = Math.max(P.spawnProt || 0, 10);
      L.msg('🛳️ Angekommen: ' + V.to.name, 5000);
      if (V.veh) {
        const sp = landSpot(V.to.land.x, V.to.land.z), v = V.veh;
        v.x = sp.x; v.z = sp.z; v.yaw = Math.atan2(V.to.land.x - V.to.sx, V.to.land.z - V.to.sz); v.speed = 0; v.lat = 0; v.alt = 0; v.vy = 0; v.sink = 0; v.isl = L.islandAt ? L.islandAt(sp.x, sp.z) : null;
        v.rig.root.visible = true; v.rig.root.position.set(v.x, 0, v.z); v.rig.root.rotation.set(0, v.yaw, 0);
        if (L.mp && L.mp.send) L.mp.send({ t: 'vmove', id: v.id, x: v.x, z: v.z, yaw: v.yaw });
        L.msg('🚗 Dein ' + v.t.name + ' steht neben dir an Land.', 5000);
      }
      voyage = null;
    }
  }

  // ---------- Der Wächter: steht auf dem Turmdach und passt auf dich auf ----------
  let guard = null, signal = null, greeted = false;
  function buildGuard() {
    const rig = L.buildHuman({ name: 'Der Wächter', special: 'waechter' }, true), cape = rig.cape;
    rig.root.position.set(L.TOWER.x + 8, L.TOWER.h, L.TOWER.z + 8); rig.root.rotation.y = Math.PI / 4;
    L.scene.add(rig.root); guard = { rig, cape, ph: 0 };
    // Wappen-Signal: Lichtkegel vom Dach in den Himmel, Wappen auf den Wolken (eigener Entwurf: Turm im Schild)
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
    g.fillStyle = '#ffe070'; g.beginPath(); g.ellipse(128, 128, 124, 90, 0, 0, 6.28); g.fill();
    g.fillStyle = '#141414'; g.beginPath(); g.moveTo(128, 50); g.lineTo(180, 70); g.lineTo(176, 140); g.lineTo(128, 200); g.lineTo(80, 140); g.lineTo(76, 70); g.closePath(); g.fill();
    g.fillStyle = '#ffe070'; g.fillRect(118, 80, 20, 80); g.fillRect(106, 74, 44, 12); g.beginPath(); g.moveTo(108, 160); g.lineTo(148, 160); g.lineTo(128, 182); g.fill();
    const emblem = new T.Mesh(new T.PlaneGeometry(90, 90), new T.MeshBasicMaterial({ map: new T.CanvasTexture(c), transparent: true, opacity: 0.85, blending: T.AdditiveBlending, depthWrite: false, fog: false, side: T.DoubleSide }));
    const sc = document.createElement('canvas'); sc.width = 16; sc.height = 256; const sg2 = sc.getContext('2d'); for (let k = 0; k < 16; k++) { sg2.fillStyle = k % 2 ? '#111111' : '#ffffff'; sg2.fillRect(0, k * 16, 16, 16); }
    const stripe = new T.CanvasTexture(sc); stripe.wrapS = stripe.wrapT = T.RepeatWrapping; stripe.repeat.set(1, 3);
    const beam = new T.Mesh(new T.CylinderGeometry(22, 1.2, 300, 20, 1, true), new T.MeshBasicMaterial({ map: stripe, transparent: true, opacity: 0.45, depthWrite: false, fog: false, side: T.DoubleSide }));
    const sg = new T.Group(); sg.add(beam); beam.position.y = 150; sg.add(emblem); emblem.position.y = 300; emblem.rotation.x = -Math.PI / 2 + 0.5;
    sg.position.set(L.TOWER.x, L.TOWER.h + 2, L.TOWER.z); sg.rotation.set(-0.35, 0.6, 0); L.scene.add(sg); signal = sg;
  }
  function updateGuard(dt) {
    if (!guard && L.TOWER && L.state === 'game') buildGuard();
    if (!guard) return;
    const up = L.towerSafe ? L.towerSafe() : true;
    guard.rig.root.visible = up && !L.inDim(P.x);
    // Signal: wenn ein Boss da ist oder es Nacht ist
    signal.visible = up && !L.inDim(P.x) && !(L.onIsl && L.onIsl(P.x, P.z));
    if (signal.visible) signal.rotation.y = 0.6 + Math.sin(performance.now() / 4000) * 0.15;
    guard.ph += dt;
    const near = Math.hypot(P.x - guard.rig.root.position.x, P.z - guard.rig.root.position.z) < 25 && Math.abs((P.y || 0) - L.TOWER.h) < 3;
    if (near) guard.rig.root.rotation.y += L.angDiff(guard.rig.root.rotation.y, Math.atan2(P.x - guard.rig.root.position.x, P.z - guard.rig.root.position.z)) * Math.min(1, dt * 2);
    L.animHuman(guard.rig, { mode: 'walk', phase: 0, speed: 0 });
    for (const a of guard.rig.arms) a.arm.rotation.z = (a === guard.rig.arms[0] ? 1 : -1) * 0.25;
    guard.cape.rotation.x = 0.15 + Math.sin(guard.ph * 1.7) * 0.12;
    if (near && !greeted) { greeted = true; L.msg('🦸 Der Wächter: „Ich halte hier oben Wache. Solange du leise bist, bist du im Turm sicher.“', 7000); }
    if (!near) greeted = false;
  }

  L.updateExtras = function (dt) {
    if (!built && L.buildings && L.ISL) setup();
    for (const d of docks) if (d.I) buildIslandDock(d);
    updateVoyage(dt);
    updateGuard(dt);
  };
  L.clearExtras = function () { if (voyage) { L.scene.remove(voyage.m); voyage = null; } L.voyageOn = false; for (const d of docks) if (d.model) d.model.visible = true; closePicker(); };
})();
