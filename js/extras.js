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
    docks.push({ id: 'home', name: '🏠 Heimat (Altheim)', x: B.x - B.w / 2 + 3, z: L.doorPos(B), sx: B.x, sz: B.z, land: { x: 1490, z: L.doorPos(B) } });
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
    const m = shipModel(24, 110, 22.4); m.position.set(d.sx, 0, d.sz); m.rotation.y = d.yaw; d.I.group.add(m);
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
    for (const d of docks) {
      if (d === from) continue;
      const b = document.createElement('button'); b.className = 'btn'; b.textContent = d.name;
      b.onclick = () => { closePicker(); sail(from, d); };
      list.appendChild(b);
    }
    overlay.hidden = false; L.uiBlock = true; if (L.unlock) L.unlock();
  }
  function closePicker() { if (overlay) overlay.hidden = true; L.uiBlock = false; }
  // ---------- Überfahrt als Kurzfilm ----------
  let voyage = null;
  function sail(from, to) {
    const m = shipModel(24, 110, 22.4); L.scene.add(m);
    const a0 = Math.atan2(to.sx - from.sx, to.sz - from.sz);
    voyage = { m, from, to, t: 0, dur: 11, yaw: a0 };
    L.snd.horn({ x: from.sx, y: 20, z: from.sz });
    L.banner('🛳️ LEINEN LOS!', 'Kurs auf ' + to.name);
    L.startCine('KREUZFAHRT NACH ' + to.name.replace(/^\S+ /, '').toUpperCase(), voyage.dur, (t) => {
      const V = voyage; if (!V) return null;
      const k = t / V.dur, e = k * k * (3 - 2 * k);
      const x = L.lerp(V.from.sx, V.to.sx, e), z = L.lerp(V.from.sz, V.to.sz, e);
      const side = V.yaw + Math.PI / 2, d = 140 - Math.sin(k * Math.PI) * 40;
      return { x: x + Math.sin(side + t * 0.08) * d, y: 40 + Math.sin(k * Math.PI) * 30, z: z + Math.cos(side + t * 0.08) * d, lx: x, ly: 8, lz: z };
    });
  }
  function updateVoyage(dt) {
    const V = voyage; if (!V) return;
    V.t += dt;
    const k = Math.min(1, V.t / V.dur), e = k * k * (3 - 2 * k);
    const x = L.lerp(V.from.sx, V.to.sx, e), z = L.lerp(V.from.sz, V.to.sz, e);
    V.m.position.set(x, Math.sin(V.t * 0.8) * 0.4, z); V.m.rotation.set(Math.sin(V.t * 0.6) * 0.02, V.yaw, Math.sin(V.t * 0.5) * 0.03);
    if (Math.random() < dt * 20) L.fx('#f0f8ff', x - Math.sin(V.yaw) * 60, 0, z - Math.cos(V.yaw) * 60, 3, 3, { size: 1, life: 1.5 });
    // Spieler fährt mit (für Inseln, Wetter, Musik unterwegs)
    P.x = x; P.z = z; P.y = 0;
    if (V.t >= V.dur || !L.cine) {
      L.scene.remove(V.m);
      P.x = V.to.land.x; P.z = V.to.land.z; P.y = 0.5; P.vx = P.vz = 0; P.air = true; P.spawnProt = Math.max(P.spawnProt || 0, 10);
      L.msg('🛳️ Angekommen: ' + V.to.name, 5000);
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
    const beam = new T.Mesh(new T.CylinderGeometry(22, 1.2, 300, 20, 1, true), new T.MeshBasicMaterial({ color: 0xfff0b0, transparent: true, opacity: 0.12, blending: T.AdditiveBlending, depthWrite: false, fog: false, side: T.DoubleSide }));
    const sg = new T.Group(); sg.add(beam); beam.position.y = 150; sg.add(emblem); emblem.position.y = 300; emblem.rotation.x = -Math.PI / 2 + 0.5;
    sg.position.set(L.TOWER.x, L.TOWER.h + 2, L.TOWER.z); sg.rotation.set(-0.35, 0.6, 0); L.scene.add(sg); signal = sg;
  }
  function updateGuard(dt) {
    if (!guard && L.TOWER && L.state === 'game') buildGuard();
    if (!guard) return;
    const up = L.towerSafe ? L.towerSafe() : true;
    guard.rig.root.visible = up && !L.inDim(P.x);
    // Signal: wenn ein Boss da ist oder es Nacht ist
    signal.visible = up && !L.inDim(P.x) && ((L.boss && !L.boss.dead) || !!L.wboss || L.env.day < 0.35);
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
  L.clearExtras = function () { if (voyage) { L.scene.remove(voyage.m); voyage = null; } closePicker(); };
})();
