'use strict';
// Unterwasserwelt (Riffe, Fische, Blasen, Nitro-Kristalle, Tiefenjäger), U-Boot, Portal und die Dimension
// (schwebende Inseln in der unendlichen Leere des Weltalls, mit Korallen, Quallen, schwarzen Löchern, eigenen Monstern und Checkpoint).
(function () {
  const L = window.L, T = THREE, P = L.player;
  const isClient = () => L.net && L.net.role === 'client';
  const C1 = new T.Color();
  const DUMMY = new T.Object3D();
  function hash(a, b, s) { let h = (a * 374761393 + b * 668265263 + (s || 0) * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return () => { h = (h + 0x6D2B79F5) | 0; let t = Math.imul(h ^ (h >>> 15), 1 | h); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  // Farbspeicher gleich in voller Größe anlegen (sonst ist er leer, weil count = 0 – dann wäre alles schwarz)
  function inst(geo, n, o) { const m = new T.InstancedMesh(geo, o || L.mat('#ffffff'), n); m.instanceColor = new T.InstancedBufferAttribute(new Float32Array(n * 3).fill(1), 3); m.count = 0; return m; }
  function add(m, x, y, z, sx, sy, sz, ry, color, rx) { DUMMY.position.set(x, y, z); DUMMY.scale.set(sx, sy, sz); DUMMY.rotation.set(rx || 0, ry || 0, 0); DUMMY.updateMatrix(); m.setMatrixAt(m.count, DUMMY.matrix); if (color) m.setColorAt(m.count, C1.set(color)); m.count++; }
  function done(g, list) { for (const m of list) { if (!m.count) { g.remove(m); continue; } m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; } }

  // ---------- Unterwasser-Abschnitte (werden um dich herum erzeugt, so weit du tauchst) ----------
  const CH = 160, chunks = new Map();
  const coral = ['#ff5a6a', '#ff9a3a', '#ffd040', '#c050ff', '#40d0ff', '#ff70c0', '#60e080', '#ff3a9a', '#7a5aff', '#30f0d0', '#ffef60', '#ff6a2a', '#e060ff', '#5af0ff'];
  const glowCoral = new T.MeshLambertMaterial({ color: 0xffffff, emissive: 0x302040 });
  const crystalMat = new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45, blending: T.AdditiveBlending, depthWrite: false });
  const crystals = [];
  function buildChunk(cx, cz) {
    const R = hash(cx, cz, 7), g = new T.Group(); L.scene.add(g);
    const sph = L.GEO.sph, cone = L.GEO.cone, cyl = L.GEO.cylB, box = L.GEO.box;
    const mS = inst(sph, 260, glowCoral), mC = inst(cone, 200, glowCoral), mY = inst(cyl, 300, glowCoral), mK = inst(L.GEO.boxB, 120, glowCoral), fish = inst(new T.ConeGeometry(0.35, 1.2, 5).rotateX(Math.PI / 2), 72, new T.MeshLambertMaterial({ color: 0xffffff }));
    for (const m of [mS, mC, mY, mK, fish]) g.add(m);
    const ch = { g, fish, school: [], cx, cz, crystals: [] };
    const pick = () => coral[Math.floor(R() * coral.length)];
    // Korallenriffe: Geweih-, Hirn-, Fächer-, Röhren-Korallen und Anemonen
    for (let i = 0; i < 40; i++) {
      const x = (cx + R()) * CH, z = (cz + R()) * CH, h = L.seaFloor(x, z);
      if (h > -3 || h < -5000) continue;
      const k = R(), c = pick(), s = 0.6 + R() * 1.6;
      if (k < 0.25) { for (let b = 0; b < 5; b++) { const a = b * 1.26 + R(); add(mY, x + Math.sin(a) * 0.3 * s, h, z + Math.cos(a) * 0.3 * s, 0.12 * s, (1.2 + R() * 1.4) * s, 0.12 * s, a, c, 0.35 + R() * 0.3); } }
      else if (k < 0.42) { add(mS, x, h + 0.3 * s, z, 1.1 * s, 0.7 * s, 1.1 * s, 0, c); add(mS, x, h + 0.55 * s, z, 0.8 * s, 0.35 * s, 0.8 * s, 0, pick()); }
      else if (k < 0.6) { add(mK, x, h, z, 0.06, 1.8 * s, 1.6 * s, R() * 3, c, (R() - 0.5) * 0.3); }
      else if (k < 0.78) { for (let b = 0; b < 6; b++) add(mY, x + (R() - 0.5) * 1.2 * s, h, z + (R() - 0.5) * 1.2 * s, 0.18 * s, (0.6 + R() * 1.5) * s, 0.18 * s, 0, b % 2 ? c : pick()); }
      else { for (let b = 0; b < 8; b++) { const a = b * 0.785; add(mC, x + Math.sin(a) * 0.25 * s, h + 0.5 * s, z + Math.cos(a) * 0.25 * s, 0.1 * s, 0.9 * s, 0.1 * s, 0, c, Math.sin(a) * 0.5); } add(mS, x, h + 0.2 * s, z, 0.35 * s, 0.25 * s, 0.35 * s, 0, pick()); }
    }
    // zweiter Fischschwarm in anderer Farbe
    { const fc2 = pick(), fx2 = (cx + 0.3) * CH, fz2 = (cz + 0.7) * CH, fh2 = L.seaFloor(fx2, fz2); if (fh2 < -6 && fh2 > -5000) for (let i = 0; i < 24; i++) { ch.school.push({ a: R() * 6.28, r: 2 + R() * 6, y: fh2 * (0.3 + R() * 0.5), sp: 0.5 + R() * 0.7, x: fx2, z: fz2 }); add(fish, fx2, fh2 * 0.5, fz2, 0.8, 0.8, 0.8, 0, fc2); } }
    for (let i = 0; i < 28; i++) {
      const x = (cx + R()) * CH, z = (cz + R()) * CH, h = L.seaFloor(x, z);
      if (h > -3 || h < -5000) continue;
      const k = R();
      if (k < 0.35) { // Koralle
        const c = coral[Math.floor(R() * coral.length)], s = 0.6 + R() * 1.8;
        add(mY, x, h, z, 0.3 * s, 1.6 * s, 0.3 * s, 0, c); add(mS, x, h + 1.7 * s, z, 0.9 * s, 0.6 * s, 0.9 * s, 0, c);
        add(mS, x + 0.8 * s, h + 1 * s, z, 0.5 * s, 0.5 * s, 0.5 * s, 0, coral[Math.floor(R() * coral.length)]);
      } else if (k < 0.65) { // Seetang
        const n = 2 + Math.floor(R() * 4); for (let j = 0; j < n; j++) add(mY, x + R() * 2, h, z + R() * 2, 0.12, 4 + R() * 9, 0.12, 0, R() < 0.5 ? '#2e7a3a' : '#4a9a3a', (R() - 0.5) * 0.2);
      } else if (k < 0.85) { // Felsen
        const s = 1 + R() * 4; add(mS, x, h, z, s, s * 0.6, s * 0.8, R() * 3, R() < 0.5 ? '#5a6068' : '#4a4a52');
      } else { // Seesterne, Muscheln
        add(mC, x, h + 0.1, z, 0.6, 0.15, 0.6, R() * 3, R() < 0.5 ? '#ff6a3a' : '#f0e0c0');
      }
    }
    // Fischschwarm
    const fc = coral[Math.floor(R() * coral.length)], fx = (cx + 0.5) * CH, fz = (cz + 0.5) * CH, fh = L.seaFloor(fx, fz);
    if (fh < -6 && fh > -5000) for (let i = 0; i < 24; i++) { ch.school.push({ a: R() * 6.28, r: 3 + R() * 8, y: fh * (0.3 + R() * 0.5), sp: 0.4 + R() * 0.6, x: fx, z: fz }); add(fish, fx, fh * 0.5, fz, 1, 1, 1, 0, fc); }
    // Nitro-Kristallwürfel (durchsichtig, leuchtend)
    if (R() < 0.75) for (let i = 0; i < 2; i++) {
      const x = (cx + R()) * CH, z = (cz + R()) * CH, h = L.seaFloor(x, z);
      if (h > -8 || h < -5000) continue;
      const m = new T.Mesh(box, crystalMat.clone()); m.scale.setScalar(2.2); m.position.set(x, h * (0.3 + R() * 0.5), z); g.add(m);
      const q = new T.Mesh(box, L.mat('#ffffff', { basic: true })); q.scale.set(0.5, 0.9, 0.12); m.add(q);
      ch.crystals.push(m);
    }
    done(g, [mS, mC, mY, mK, fish]);
    return ch;
  }
  function updateChunks(dt) {
    const sub = P.vehicle && P.vehicle.t.sub, deep = L.underwater || sub;
    const ccx = Math.floor(P.x / CH), ccz = Math.floor(P.z / CH);
    if (deep) for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) { const k = (ccx + i) + ',' + (ccz + j); if (!chunks.has(k)) chunks.set(k, buildChunk(ccx + i, ccz + j)); }
    for (const [k, ch] of chunks) {
      if (Math.abs(ch.cx - ccx) > 3 || Math.abs(ch.cz - ccz) > 3 || !deep) { L.scene.remove(ch.g); chunks.delete(k); continue; }
      // Fische schwimmen im Kreis
      if (ch.school.length && ch.fish.parent) {
        ch.school.forEach((f, i) => { f.a += dt * f.sp; DUMMY.position.set(f.x + Math.sin(f.a) * f.r, f.y + Math.sin(f.a * 2) * 0.6, f.z + Math.cos(f.a) * f.r); DUMMY.rotation.set(0, f.a + Math.PI / 2, 0); DUMMY.scale.setScalar(1); DUMMY.updateMatrix(); ch.fish.setMatrixAt(i, DUMMY.matrix); });
        ch.fish.instanceMatrix.needsUpdate = true;
      }
      for (const c of ch.crystals) {
        if (!c.parent) continue;
        c.rotation.y += dt * 1.5; c.rotation.x += dt * 0.7;
        c.material.color.setHSL((performance.now() / 3000 + c.position.x * 0.01) % 1, 0.9, 0.6);
        const v = P.vehicle;
        if (v && v.t.sub && L.dist(v.x, v.z, c.position.x, c.position.z) < 5 && Math.abs((v.alt || 0) - c.position.y) < 5) {
          ch.g.remove(c);
          L.nitro = Math.min(3, (L.nitro || 0) + 1);
          L.snd.pickup(); L.tn({ f: 880, fTo: 1760, dur: 0.3, type: 'triangle', vol: 0.15 });
          L.msg('⚡ Nitro geladen (' + L.nitro + '/3) – Leertaste zum Boosten!', 2500);
        }
      }
    }
  }

  // ---------- U-Boot: tauchen, steigen, Nitro ----------
  L.nitro = 0;
  L.updateSub = function (v, dt, up, down, boost) {
    const floor = L.seaFloor(v.x, v.z) + 1.6, top = L.WATER_Y - 0.9;
    let vy = v.vy || 0;
    if (up) vy += (8 - vy) * Math.min(1, dt * 2.5); else if (down) vy += (-10 - vy) * Math.min(1, dt * 2.5); else vy += (0 - vy) * Math.min(1, dt * 2);
    v.alt = L.clamp((v.alt === undefined ? top : v.alt) + vy * dt, floor, top);
    if (v.alt <= floor || v.alt >= top) vy = 0;
    v.vy = vy;
    // Nitro
    if (boost && L.nitro > 0 && !(v.boostT > 0)) { L.nitro--; v.boostT = 3; L.snd.charge({ x: v.x, y: v.alt, z: v.z }); L.msg('🚀 NITRO!', 1200); }
    if (v.boostT > 0) { v.boostT -= dt; v.speed = Math.max(v.speed, v.t.vmax / 3.6 * 1.8); if (Math.random() < dt * 40) bubble(v, 3); }
    // Blasen
    if (Math.abs(v.speed) > 2 && Math.random() < dt * 14) bubble(v, 1);
  };
  function bubble(v, n) { const bx = v.x - Math.sin(v.yaw) * 6, bz = v.z - Math.cos(v.yaw) * 6; L.fx('#e8f8ff', bx, (v.alt || 0) + 1.4, bz, n, 1.2, { size: 0.18, life: 2.5, g: -2.5 }); }

  // ---------- Tiefenjäger: lange, leuchtende Raubfische – nur minimal langsamer als dein U-Boot ----------
  const hunters = [];
  function buildHunter() {
    const g = new T.Group(), segs = [];
    for (let i = 0; i < 9; i++) { const s = new T.Mesh(L.GEO.sph, L.mat(i % 2 ? '#1a1a2a' : '#2a2a3e')); const r = 1.6 - i * 0.12; s.scale.set(r, r, r * 1.6); g.add(s); segs.push(s); }
    const jaw = new T.Mesh(L.GEO.cone, L.mat('#0a0a10')); jaw.scale.set(1.4, 2.4, 1.4); jaw.rotation.x = Math.PI / 2; segs[0].add(jaw); jaw.position.z = 1.2;
    for (let k = 0; k < 8; k++) { const t = new T.Mesh(L.GEO.cone, L.mat('#f0f0ff')); t.scale.set(0.12, 0.5, 0.12); t.position.set(Math.sin(k / 8 * 6.28) * 0.9, Math.cos(k / 8 * 6.28) * 0.9, 1.2); t.rotation.x = Math.PI / 2; segs[0].add(t); }
    for (const s of [-1, 1]) { const e = new T.Mesh(L.GEO.sph, L.mat('#7cff6a', { basic: true })); e.scale.setScalar(0.3); e.position.set(s * 0.9, 0.6, 0.6); segs[0].add(e); }
    const lure = new T.Mesh(L.GEO.sph, L.mat('#7cffff', { basic: true })); lure.scale.setScalar(0.4); lure.position.set(0, 2.6, 1.6); segs[0].add(lure);
    L.scene.add(g); return { g, segs };
  }
  function updateHunters(dt) {
    const v = P.vehicle, sub = v && v.t.sub && (v.alt || 0) < -12;
    const diver = !v && L.underwaterDive && P.y < -8;
    if ((sub || diver) && hunters.length < 3 && Math.random() < dt * 0.15 && L.openSea(P.x, P.z) > 200 && !isClient()) {
      const a = Math.random() * 6.28, h = buildHunter(), y = Math.max(L.seaFloor(P.x, P.z) + 6, (v ? (v.alt || 0) : P.y) - 10);
      h.x = P.x + Math.sin(a) * 140; h.z = P.z + Math.cos(a) * 140; h.y = y; h.trail = []; h.bite = 0; hunters.push(h);
      L.msg('🐟 Ein Tiefenjäger hat dich entdeckt! Nitro-Kristalle helfen beim Entkommen.', 3500);
      L.tn({ f: 90, fTo: 60, dur: 1.5, type: 'sawtooth', vol: 0.25, pos: { x: h.x, y: h.y, z: h.z }, ref: 30 });
    }
    for (let i = hunters.length - 1; i >= 0; i--) {
      const h = hunters[i];
      const tx = v ? v.x : P.x, ty = v ? (v.alt || 0) + 1.4 : P.y, tz = v ? v.z : P.z, d = Math.hypot(tx - h.x, ty - h.y, tz - h.z);
      const sp = v && v.t.sub ? Math.max(8, v.t.vmax / 3.6 * 0.93) : 12;
      if (d > 1) { h.x += (tx - h.x) / d * sp * dt; h.y += (ty - h.y) / d * sp * dt; h.z += (tz - h.z) / d * sp * dt; }
      h.y = Math.min(h.y, L.WATER_Y - 2); h.y = Math.max(h.y, L.seaFloor(h.x, h.z) + 2);
      h.trail.unshift([h.x, h.y, h.z]); if (h.trail.length > 60) h.trail.pop();
      h.segs.forEach((s, k) => { const p = h.trail[Math.min(h.trail.length - 1, k * 3)]; s.position.set(p[0], p[1] + Math.sin(performance.now() / 200 + k) * 0.3, p[2]); if (k === 0) s.lookAt(tx, ty, tz); });
      h.bite -= dt;
      if (d < 7 && h.bite <= 0 && v && v.t.sub) { h.bite = 2; v.hp -= 25; L.snd.crash(0.8, { x: h.x, y: h.y, z: h.z }); L.shake = Math.max(L.shake, 1); L.msg('🐟 Der Tiefenjäger beißt ins U-Boot! (' + Math.max(0, Math.round(v.hp / v.t.hp * 100)) + '%)', 2000); if (v.hp <= 0) L.msg('💥 Das U-Boot ist kaputt – raus und hoch!', 3000); }
      // Schwimmer/Taucher und Boote werden auch gebissen
      if (d < 4.5 && h.bite <= 0 && !(v && v.t.sub) && P.alive) { h.bite = 1.6; if (v) { v.hp -= 20; L.hurtPlayer(12 * (L.md ? L.md.dmg : 1), 'Vom Tiefenjäger aus dem Boot gerissen'); } else L.hurtPlayer(24 * (L.md ? L.md.dmg : 1), 'Vom Tiefenjäger gebissen'); L.blood(P.x, P.y + 1, P.z, 12); L.shake = Math.max(L.shake, 0.7); }
      if (!sub && !diver && d > 250 || d > 600) { L.scene.remove(h.g); hunters.splice(i, 1); }
    }
  }

  // ---------- Portal in der Tiefsee ----------
  let portal = null;
  function buildPortal(x, y, z, color) {
    const g = new T.Group(); g.position.set(x, y, z); L.scene.add(g);
    const ring = new T.Mesh(new T.TorusGeometry(14, 1.6, 12, 48), new T.MeshBasicMaterial({ color, fog: false })); g.add(ring);
    const disc = new T.Mesh(new T.CircleGeometry(13, 48), new T.MeshBasicMaterial({ color: 0x9a40ff, transparent: true, opacity: 0.55, side: T.DoubleSide, blending: T.AdditiveBlending, depthWrite: false, fog: false })); g.add(disc);
    const swirl = []; for (let k = 0; k < 4; k++) { const s = new T.Mesh(new T.TorusGeometry(4 + k * 2.6, 0.25, 6, 32), new T.MeshBasicMaterial({ color: k % 2 ? 0x40e0ff : 0xff60ff, transparent: true, opacity: 0.7, fog: false })); g.add(s); swirl.push(s); }
    const light = new T.PointLight(color, 3, 120, 2); g.add(light);
    return { g, ring, disc, swirl };
  }
  function travel(toDim) {
    // Kurzfilm: durch das Portal
    const v = P.vehicle;
    if (v && L._leaveVehicle) L._leaveVehicle(true);
    const from = toDim ? L.PORTAL : L.DIM_PORTAL;
    L.banner(toDim ? '🌀 DAS PORTAL' : '🌀 ZURÜCK', toDim ? 'Du wirst in eine andere Dimension gezogen …' : 'Zurück in die Heimat …');
    for (let k = 0; k < 6; k++) setTimeout(() => L.tn({ f: 200 + k * 120, fTo: 2000, dur: 0.8, type: 'sine', vol: 0.12 }), k * 400);
    L.startCine(toDim ? 'DURCH DAS PORTAL' : 'ZURÜCK DURCH DAS PORTAL', 5, (t) => {
      const a = t * 2.2, d = 40 - t * 7, y = (from.y || 0) + Math.sin(t) * 4;
      if (t > 4.3) L.env.bolt = 1;
      return { x: from.x + Math.sin(a) * d, y: y + 6, z: from.z + Math.cos(a) * d, lx: from.x, ly: y, lz: from.z };
    });
    pending = { toDim, t: 0 };
  }
  let pending = null;
  // Ortswechsel am Ende des Kurzfilms (oder sofort, wenn er übersprungen wurde)
  function doTravel() {
    const toDim = pending.toDim; pending = null;
    const c = toDim ? L.dimCheckpoint() : { x: 1490, z: 200 };
    P.x = c.x; P.z = c.z; P.y = toDim ? 0.5 : 0; P.vx = P.vz = P.vy = 0; P.air = true; P.spawnProt = Math.max(P.spawnProt || 0, 15);
    L.msg(toDim ? '🌌 Willkommen in der Dimension. Fall nicht in die Leere!' : '🏠 Du bist wieder in der Heimat.', 6000);
  }
  function updatePortal(dt) {
    if (pending) { pending.t += dt; if (pending.t > 4.6 || !L.cine) doTravel(); return; }
    if (!portal) {
      portal = buildPortal(L.PORTAL.x, L.PORTAL.y, L.PORTAL.z, 0xc060ff);
      portal.g.rotation.y = 0.6;
    }
    const t = performance.now() / 1000;
    portal.swirl.forEach((s, k) => { s.rotation.z = t * (k % 2 ? 1.5 : -1.2); });
    portal.disc.material.opacity = 0.45 + Math.sin(t * 3) * 0.15;
    portal.g.visible = L.dist(P.x, P.z, L.PORTAL.x, L.PORTAL.z) < 1500 && !L.inDim(P.x);
    const v = P.vehicle, py = v ? (v.alt || 0) : P.y;
    if (!L.cine && P.alive && L.dist(P.x, P.z, L.PORTAL.x, L.PORTAL.z) < 16 && Math.abs(py - L.PORTAL.y) < 18) travel(true);
    if (L.dimPortal && !L.cine && P.alive && L.dist(P.x, P.z, L.DIM_PORTAL.x, L.DIM_PORTAL.z) < 10) {
      if (L.dimPortalSealed && L.dimPortalSealed()) {
        // versiegelt: zurückgestoßen
        const a = Math.atan2(P.x - L.DIM_PORTAL.x, P.z - L.DIM_PORTAL.z); P.x = L.DIM_PORTAL.x + Math.sin(a) * 12; P.z = L.DIM_PORTAL.z + Math.cos(a) * 12; P.vx = Math.sin(a) * 8; P.vz = Math.cos(a) * 8;
        if (!(L.sealMsgT > performance.now())) { L.sealMsgT = performance.now() + 3000; L.msg('🔒 Das Portal ist versiegelt – besiege zuerst den Leerenwurm!', 3000); L.snd.codeBad(); }
      } else travel(false);
    }
  }

  // ---------- Die Dimension: schwebende Inseln in der Leere des Weltalls ----------
  const DIM = L.DIM, plats = [];
  L.dimLand = (x, z) => plats.some((p) => {
    if (!p.bridge) return Math.hypot(x - p.x, z - p.z) < p.r;
    const dx = x - p.x, dz = z - p.z, along = dx * Math.sin(p.a) + dz * Math.cos(p.a), across = dx * Math.cos(p.a) - dz * Math.sin(p.a);
    return Math.abs(along) < p.len / 2 + 12 && Math.abs(across) < 5.5;
  });
  L.DIM_PORTAL = { x: DIM.x - 300, z: DIM.z, y: 8 };
  L.dimCheckpoint = () => ({ x: DIM.x + 6, z: DIM.z + 6 });
  const dimIsl = { id: 'dim', dim: true, name: 'Die Dimension', icon: '🌌', x: DIM.x, z: DIM.z, r: 520, tint: '#06020c', weather: 'klar',
    mon: ['langer', 'starrende', 'flieger', 'greifer', 'schwelle', 'rufer'], monTint: '#5a20a0',
    npc: { top: ['anzug', 'kittel'], topColor: ['#6a3a8a', '#1a1a1a', '#40d0ff'], hat: ['keine', 'zylinder'] }, veh: [], vehCol: '#6a3a8a', music: ['drift', 'nightB'], ground: ['#d8d0a0'] };
  plats.push({ x: DIM.x, z: DIM.z, r: 520 });
  for (let k = 0; k < 6; k++) { const a = k / 6 * 6.28 + 0.3, d = 760; plats.push({ x: DIM.x + Math.sin(a) * d, z: DIM.z + Math.cos(a) * d, r: 150 }); }
  dimIsl.build = function (I) {
    const g = new T.Group(); L.scene.add(g); I.group = g;
    const R = hash(3, 9, 1);
    // Inseln aus hellem Endstein mit Korallen-Unterseite
    for (const p of plats) {
      const top = new T.Mesh(new T.CylinderGeometry(p.r, p.r * 0.55, 30, 40), L.mat('#d8d0a0')); top.position.set(p.x, -15.02, p.z); top.receiveShadow = true; g.add(top);
      const under = new T.Mesh(new T.ConeGeometry(p.r * 0.55, p.r * 0.8, 24), L.mat('#8a7a50')); under.rotation.x = Math.PI; under.position.set(p.x, -30 - p.r * 0.4, p.z); g.add(under);
    }
    // Brücken zwischen den Inseln (aus Kristall)
    for (let k = 1; k < 7; k++) {
      const p = plats[k], a = Math.atan2(p.x - DIM.x, p.z - DIM.z), len = 760 - 520 - 150 + 40, mx = DIM.x + Math.sin(a) * (520 + len / 2 - 20), mz = DIM.z + Math.cos(a) * (520 + len / 2 - 20);
      const b = new T.Mesh(L.GEO.box, L.mat('#a080ff', { emissive: '#4020a0', ei: 0.5 })); b.scale.set(10, 1, len + 20); b.position.set(mx, -0.5, mz); b.rotation.y = a; g.add(b);
      plats.push({ x: mx, z: mz, r: 7, bridge: true, a, len });
    }
    const sph = L.GEO.sph, cone = L.GEO.cone, cyl = L.GEO.cylB;
    const mC = inst(cone, 300), mS = inst(sph, 300), mY = inst(cyl, 300);
    for (const m of [mC, mS, mY]) g.add(m);
    for (let i = 0; i < 260; i++) {
      const p = plats[Math.floor(R() * 7)], a = R() * 6.28, d = Math.sqrt(R()) * (p.r - 20), x = p.x + Math.sin(a) * d, z = p.z + Math.cos(a) * d;
      if (Math.hypot(x - DIM.x, z - DIM.z) < 30) continue;
      const k = R();
      if (k < 0.4) { const s = 1 + R() * 3; add(mC, x, s * 2.5, z, s, s * 5, s, R() * 3, R() < 0.5 ? '#9a50ff' : '#40e0ff', (R() - 0.5) * 0.5); L.addBox(x - s * 0.6, z - s * 0.6, x + s * 0.6, z + s * 0.6, s * 4, 'building'); }
      else if (k < 0.75) { const c = coral[Math.floor(R() * coral.length)], s = 1 + R() * 2.5; add(mY, x, 0, z, 0.4 * s, 2 * s, 0.4 * s, 0, c); add(mS, x, 2.2 * s, z, s, 0.7 * s, s, 0, c); }
      else { const s = 3 + R() * 6; add(mY, x, 0, z, s * 0.3, s * 3, s * 0.3, 0, '#2a1a3a'); add(mS, x, s * 3, z, s * 1.2, s * 0.5, s * 1.2, 0, '#e0d060'); L.addBox(x - s * 0.3, z - s * 0.3, x + s * 0.3, z + s * 0.3, s * 3, 'building'); }
    }
    done(g, [mC, mS, mY]);
    // Quallen schweben in der Luft
    I.jelly = [];
    for (let k = 0; k < 24; k++) {
      const j = new T.Group(), c = coral[k % coral.length];
      const bell = new T.Mesh(sph, new T.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.5, blending: T.AdditiveBlending, depthWrite: false })); bell.scale.set(3, 2, 3); j.add(bell);
      for (let t2 = 0; t2 < 6; t2++) { const tt = new T.Mesh(L.GEO.box, new T.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.4 })); tt.scale.set(0.1, 6, 0.1); tt.position.set(Math.sin(t2) * 1.5, -4, Math.cos(t2) * 1.5); j.add(tt); }
      const a = R() * 6.28, d = R() * 900; j.position.set(DIM.x + Math.sin(a) * d, 20 + R() * 80, DIM.z + Math.cos(a) * d); g.add(j); I.jelly.push({ j, ph: R() * 6 });
    }
    // schwarze Löcher, ferne Planeten und Nebel als Kulisse
    I.holes = [];
    for (let k = 0; k < 4; k++) {
      const a = k * 1.7 + 0.5, hx = DIM.x + Math.sin(a) * 2600, hz = DIM.z + Math.cos(a) * 2600, hy = 200 + k * 160;
      const hole = new T.Mesh(sph, new T.MeshBasicMaterial({ color: 0x000000, fog: false })); hole.scale.setScalar(110 + k * 30); hole.position.set(hx, hy, hz); g.add(hole);
      const disk = new T.Mesh(new T.RingGeometry(150 + k * 40, 330 + k * 60, 64), new T.MeshBasicMaterial({ color: k % 2 ? 0xff9a40 : 0xb070ff, transparent: true, opacity: 0.6, side: T.DoubleSide, blending: T.AdditiveBlending, depthWrite: false, fog: false }));
      disk.position.copy(hole.position); disk.rotation.set(1.2 + k * 0.2, 0, 0.4); g.add(disk); I.holes.push(disk);
    }
    for (let k = 0; k < 3; k++) { const pl = new T.Mesh(sph, new T.MeshBasicMaterial({ color: ['#4060c0', '#c06040', '#40a080'][k], fog: false })); pl.scale.setScalar(260 + k * 90); const a = k * 2.2 + 2; pl.position.set(DIM.x + Math.sin(a) * 4200, -600 + k * 500, DIM.z + Math.cos(a) * 4200); g.add(pl); }
    // Checkpoint und Rückkehr-Portal
    const ob = new T.Mesh(L.GEO.boxB, L.mat('#2a1a3a')); ob.scale.set(3, 9, 3); ob.position.set(DIM.x, 0, DIM.z); g.add(ob);
    L.addBox(DIM.x - 1.6, DIM.z - 1.6, DIM.x + 1.6, DIM.z + 1.6, 9, 'building');
    const beam = new T.Mesh(new T.CylinderGeometry(2, 3, 300, 12, 1, true), new T.MeshBasicMaterial({ color: 0x40e0ff, transparent: true, opacity: 0.35, blending: T.AdditiveBlending, depthWrite: false, fog: false })); beam.position.set(DIM.x, 160, DIM.z); g.add(beam); I.beam = beam;
    const back = buildPortal(L.DIM_PORTAL.x, 14, L.DIM_PORTAL.z, 0x40e0ff); back.g.rotation.y = Math.PI / 2; g.add(back.g); L.dimPortal = back;
    I.built = true;
  };
  L.ISL.push(dimIsl); L.ISLANDS.push(dimIsl);
  function updateDim(dt) {
    const I = dimIsl; if (!I.built) return;
    const t = performance.now() / 1000;
    for (const q of I.jelly) { q.ph += dt; q.j.position.y += Math.sin(q.ph) * dt * 2; q.j.children[0].scale.y = 2 + Math.sin(q.ph * 3) * 0.3; }
    for (const h of I.holes) h.rotation.z += dt * 0.1;
    if (L.dimPortal) L.dimPortal.swirl.forEach((s, k) => { s.rotation.z = t * (k % 2 ? 1.5 : -1.2); });
    // in die Leere gefallen
    if (L.inDim(P.x) && !(L.inMoon && L.inMoon(P.x)) && P.y < -90 && P.alive && !P.vehicle) {
      const c = L.dimCheckpoint(); P.x = c.x; P.z = c.z; P.y = 2; P.vy = 0; P.air = true;
      L.hurtPlayer(30, 'In die unendliche Leere gefallen');
      L.msg('🌌 Du bist in die Leere gefallen – zurück zum Checkpoint.', 4000);
    }
  }

  // ---------- pro Bild ----------
  L.updateOcean2 = function (dt) {
    updateChunks(dt);
    updateHunters(dt);
    updatePortal(dt);
    updateDim(dt);
  };
  L.clearOcean = function () { for (const h of hunters) L.scene.remove(h.g); hunters.length = 0; L.nitro = 0; };
})();
