'use strict';
// Militärbasis: 9 m hohe Glaswände (mit dem Auto zerbrechlich – sehr laut!) und DIE WAHRE CAROLINA.
// Sie ist das einzige Monster in der Basis und kann nicht hinaus. Sie hört Laufen nur aus der Nähe, Rennen weiter,
// Schleichen gar nicht – Autos, Schüsse und Glas dagegen sehr weit. Wenn sie dich erwischt: ein Schlag, tot (außer Admin).
(function () {
  const L = window.L, T = THREE, P = L.player, E = L.ents;
  const RES = { x: 0, z: 0 };
  // ---------- Glaswände ----------
  let panels = null;
  const glassMat = new T.MeshPhongMaterial({ color: 0xbfe6f5, transparent: true, opacity: 0.26, shininess: 120, specular: 0xffffff, depthWrite: false, side: T.DoubleSide });
  const frameMat = new T.MeshLambertMaterial({ color: 0x4a4e54 });
  const H = 9, PW = 6;
  function wall(x1, z1, x2, z2) {
    const len = Math.hypot(x2 - x1, z2 - z1), n = Math.max(1, Math.round(len / PW)), alongX = Math.abs(x2 - x1) > Math.abs(z2 - z1);
    for (let i = 0; i < n; i++) {
      const a = i / n, b = (i + 1) / n, ax = L.lerp(x1, x2, a), az = L.lerp(z1, z2, a), bx = L.lerp(x1, x2, b), bz = L.lerp(z1, z2, b), cx = (ax + bx) / 2, cz = (az + bz) / 2, w = len / n;
      const m = new T.Mesh(L.GEO.boxB, glassMat); m.scale.set(alongX ? w : 0.15, H, alongX ? 0.15 : w); m.position.set(cx, 0, cz); m.renderOrder = 2; L.scene.add(m);
      const post = new T.Mesh(L.GEO.boxB, frameMat); post.scale.set(0.35, H + 0.3, 0.35); post.position.set(ax, 0, az); L.scene.add(post);
      const bx1 = alongX ? Math.min(ax, bx) : cx - 0.25, bx2 = alongX ? Math.max(ax, bx) : cx + 0.25, bz1 = alongX ? cz - 0.25 : Math.min(az, bz), bz2 = alongX ? cz + 0.25 : Math.max(az, bz);
      const box = L.addBox(bx1, bz1, bx2, bz2, H, 'building');
      panels.push({ i: panels.length, m, box, ax, az, bx, bz, cx, cz, broken: false });
    }
    const top = new T.Mesh(L.GEO.boxB, frameMat); top.scale.set(alongX ? len : 0.4, 0.35, alongX ? 0.4 : len); top.position.set((x1 + x2) / 2, H, (z1 + z2) / 2); L.scene.add(top);
  }
  function buildWalls() {
    const M = L.MIL; panels = [];
    wall(M.x1, M.z1, M.x2, M.z1); wall(M.x1, M.z1, M.x1, M.z2); wall(M.x2, M.z1, M.x2, M.z2);
    wall(M.x1, M.z2, M.gate - 8, M.z2); wall(M.gate + 8, M.z2, M.x2, M.z2);
  }
  function segDist(px, pz, p) { const dx = p.bx - p.ax, dz = p.bz - p.az, l2 = dx * dx + dz * dz, t = L.clamp(((px - p.ax) * dx + (pz - p.az) * dz) / l2, 0, 1); return Math.hypot(px - (p.ax + dx * t), pz - (p.az + dz * t)); }
  function shatter(p, net) {
    if (p.broken) return; p.broken = true; p.m.visible = false; L.removeBox(p.box);
    for (let k = 0; k < 5; k++) L.fx(k % 2 ? '#e8fbff' : '#a8dcf0', p.cx + L.rand(-2, 2), L.rand(0.5, 7), p.cz + L.rand(-2, 2), 14, 7, { basic: true, size: 0.18, life: 1.4 });
    const d = Math.hypot(P.x - p.cx, P.z - p.cz), v = Math.max(0.1, 1 - d / 400);
    L.snd.crash && L.snd.crash(1, { x: p.cx, y: 2, z: p.cz });
    L.nz && L.nz({ dur: 1.4, f: 5200, type: 'highpass', vol: 0.55 * v }); L.nz && L.nz({ dur: 0.6, f: 2600, type: 'bandpass', q: 1, vol: 0.4 * v });
    L.shake = Math.max(L.shake, 0.5 * v);
    alertTo(p.cx, p.cz, true);
    if (!net) { L.msg('💥 KLIRRR! Die Glaswand ist zerbrochen – das war SEHR laut! Steig aus und schleich, sonst findet sie dich!', 6000); if (L.mp && L.mp.send && L.net && L.net.connected) L.mp.send({ t: 'glass', i: p.i }); }
  }
  L.glassRemote = (i) => { if (panels && panels[i]) shatter(panels[i], true); };
  function restoreWalls() { if (!panels) return; for (const p of panels) if (p.broken) { p.broken = false; p.m.visible = true; p.box = L.addBox(p.box.x1, p.box.z1, p.box.x2, p.box.z2, H, 'building'); } }
  // Auto fährt in die Glaswand: kurz vorher zerbrechen (sonst prallt es ab)
  function carVsGlass() {
    const v = P.vehicle; if (!v || !panels || Math.abs(v.speed) < 5 || (v.alt || 0) > H) return;
    const fx = Math.sin(v.yaw) * Math.sign(v.speed), fz = Math.cos(v.yaw) * Math.sign(v.speed), look = v.t.len * 0.5 + Math.abs(v.speed) * 0.12 + 0.6;
    const px = v.x + fx * look, pz = v.z + fz * look;
    if (!L.inMil(px, pz, 6)) return;
    for (const p of panels) if (!p.broken && Math.abs(p.cx - v.x) < 40 && Math.abs(p.cz - v.z) < 40 && (segDist(px, pz, p) < (v.t.wid || 2) * 0.5 + 0.6 || segDist(v.x, v.z, p) < 1)) { shatter(p); v.speed *= 0.75; v.hp -= 8; }
  }

  // ---------- Die wahre Carolina ----------
  let C = null;
  const HP = 4000;
  function build() {
    const app = Object.assign({}, L.DEFAULT_CHAR, { name: 'Carolina', skin: '#e8d2c4', hair: 'emo', hairColor: '#0e0e12', eyes: '#3a2a3a', brows: 'boese', mouth: 'ernst',
      top: 'tanktop', topColor: '#141418', pants: 'skinny', pantsColor: '#141418', shoeType: 'stiefel', shoes: '#0e0e0e', build: 'extrem', height: 'sehr_gross' });
    const r = L.buildHuman(app, true), skin = L.mat('#e8d2c4'), blk = L.mat('#0e0e12');
    const add = (par, geo, mt, sx, sy, sz, x, y, z) => { const m = new T.Mesh(geo, mt); m.scale.set(sx, sy, sz); m.position.set(x, y, z); m.castShadow = true; par.add(m); return m; };
    // großer hängender Bauch (unter dem kurzen Top heraus)
    const belly = new T.Group(); belly.position.set(0, 0.05, 0.12); r.torso.add(belly);
    add(belly, L.GEO.sph, skin, 0.42, 0.36, 0.34, 0, -0.08, 0.1); add(belly, L.GEO.sph, skin, 0.36, 0.26, 0.3, 0, -0.3, 0.12);
    add(belly, L.GEO.sph, L.mat('#c8a898'), 0.03, 0.03, 0.02, 0, -0.1, 0.43);
    r.belly = belly;
    // breite Hüften, Nietengürtel
    add(r.hips, L.GEO.sph, blk, 0.44, 0.22, 0.32, 0, -0.02, 0);
    for (let k = 0; k < 10; k++) { const a = k / 10 * 6.283; add(r.hips, L.GEO.sph, L.mat('#c8c8d0'), 0.025, 0.025, 0.025, Math.sin(a) * 0.43, 0.08, Math.cos(a) * 0.31); }
    // Emo: Pony über einem Auge, dunkle Schminke, Piercings, pinke Strähne, gestreifte Armstulpen
    add(r.head, L.GEO.box, blk, 0.2, 0.16, 0.04, -0.05, 0.22, 0.15).rotation.z = 0.4;
    add(r.head, L.GEO.box, L.mat('#ff3a9a'), 0.03, 0.18, 0.04, 0.07, 0.24, 0.14);
    for (const s of [-1, 1]) add(r.head, L.GEO.box, blk, 0.07, 0.035, 0.01, s * 0.06, 0.155, 0.152);
    add(r.head, L.GEO.sph, L.mat('#d0d0d8'), 0.012, 0.012, 0.012, 0.02, 0.06, 0.155);
    add(r.head, L.GEO.sph, L.mat('#d0d0d8'), 0.01, 0.01, 0.01, 0.075, 0.2, 0.13);
    for (const a of r.arms) for (let k = 0; k < 4; k++) add(a.elbow, L.GEO.box, L.mat(k % 2 ? '#c02a2a' : '#141418'), 0.13, 0.05, 0.13, 0, -0.06 - k * 0.055, 0);
    r.root.scale.set(2.9, 1.9, 2.5);
    r.root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    L.scene.add(r.root);
    return r;
  }
  function spawnC() {
    const M = L.MIL, rig = build();
    C = { kind: 'carolina', rig, x: (M.x1 + M.x2) / 2, z: (M.z1 + M.z2) / 2, yaw: 0, hp: HP, state: 'wander', tx: 0, tz: 0, t: 0, ph: 0, searchT: 0, cd: 0, bigR: 2, hitR: 40, stepT: 0, growlT: 0, dead: false, deadT: 0 };
    pickGoal();
  }
  function pickGoal() { const M = L.MIL; C.tx = L.rand(M.x1 + 15, M.x2 - 15); C.tz = L.rand(M.z1 + 15, M.z2 - 15); }
  function alertTo(x, z, loud) {
    if (!C || C.dead) return;
    const M = L.MIL; C.tx = L.clamp(x, M.x1 + 3, M.x2 - 3); C.tz = L.clamp(z, M.z1 + 3, M.z2 - 3);
    C.state = 'chase'; C.searchT = 0; if (loud) C.rage = 6;
    if (C.growlT <= 0 && Math.hypot(P.x - C.x, P.z - C.z) < 150) { C.growlT = 3; L.snd.bossRoar ? L.snd.bossRoar({ x: C.x, y: 3, z: C.z }) : L.tn && L.tn({ f: 90, fTo: 50, dur: 1.2, type: 'sawtooth', vol: 0.25 }); }
  }
  // Schüsse, Explosionen … (laute Geräusche) hört sie weit
  const omn = L.makeNoise;
  L.makeNoise = function (x, z, inten, src) {
    const r = omn ? omn(x, z, inten, src) : undefined;
    if (C && !C.dead && inten >= 40 && L.MIL && L.inMil(x, z, 40) && Math.hypot(x - C.x, z - C.z) < inten * 0.9) alertTo(x, z, inten > 150);
    return r;
  };
  // Geräusche des Spielers
  function playerNoise() {
    if (!P.alive || P.gone || L.cine) return 0;
    const v = P.vehicle; if (v) return Math.abs(v.speed) > 1.5 ? 70 : 25;
    const hsp = Math.hypot(P.vx, P.vz);
    if (P.flying || hsp < 0.4) return 0;
    if (P.stance === 'crouch' || P.stance === 'crawl') return 0;
    return P.mode === 'run' ? 24 : 9;
  }
  function updateC(dt) {
    if (!C) return;
    const M = L.MIL, rig = C.rig;
    if (C.dead) { C.deadT += dt; L.animHuman(rig, { mode: 'dead' }); rig.root.position.set(C.x, 0, C.z); if (C.deadT > 240) { L.scene.remove(rig.root); spawnC(); } return; }
    C.t += dt; C.cd -= dt; C.growlT -= dt; C.rage = Math.max(0, (C.rage || 0) - dt);
    // nur in der Nähe aktiv rechnen
    const dP = Math.hypot(P.x - C.x, P.z - C.z);
    const nr = playerNoise();
    if (nr > 0 && dP < nr) alertTo(P.x, P.z, false);
    // Bewegung
    const spd = C.state === 'chase' ? (C.rage > 0 ? 9 : 7) : C.state === 'search' ? 2.5 : 2.2;
    let dx = C.tx - C.x, dz = C.tz - C.z, d = Math.hypot(dx, dz);
    if (C.state === 'search') { C.searchT -= dt; C.yaw += Math.sin(C.t * 1.3) * dt; if (C.searchT <= 0) { C.state = 'wander'; pickGoal(); } }
    else if (d < 2) { if (C.state === 'chase') { C.state = 'search'; C.searchT = 6; } else pickGoal(); }
    else {
      const want = Math.atan2(dx, dz); C.yaw += L.angDiff(C.yaw, want) * Math.min(1, dt * 5);
      const nx = C.x + Math.sin(C.yaw) * spd * dt, nz = C.z + Math.cos(C.yaw) * spd * dt;
      L.collide(nx, nz, 1.6, undefined, RES);
      const moved = Math.hypot(RES.x - C.x, RES.z - C.z);
      C.x = L.clamp(RES.x, M.x1 + 2.5, M.x2 - 2.5); C.z = L.clamp(RES.z, M.z1 + 2.5, M.z2 - 2.5);
      if (moved < spd * dt * 0.2) { C.stuck = (C.stuck || 0) + dt; if (C.stuck > 1.5) { C.stuck = 0; if (C.state === 'wander') pickGoal(); else C.yaw += 1.2; } } else C.stuck = 0;
    }
    // Erwischt: ein Schlag (Admin bleibt heil)
    const reach = 2.6 + (P.vehicle ? P.vehicle.t.len * 0.4 : 0);
    if (P.alive && !P.gone && dP < reach && Math.abs((P.y || 0) - 0) < 4 && C.cd <= 0 && (C.state === 'chase' || dP < 1.8)) {
      C.cd = 1.2; C.yaw = Math.atan2(P.x - C.x, P.z - C.z); L.shake = Math.max(L.shake, 1);
      L.snd.stomp && L.snd.stomp({ x: C.x, y: 1, z: C.z });
      if (P.vehicle && L._leaveVehicle && !(L.suitOn && L.suitOn())) L._leaveVehicle(true);
      L.hurtPlayer(99999, 'Die wahre Carolina hat dich gefunden');
      if (P.alive && L.suitOn && L.suitOn()) L.msg('🛡️ Carolina schlägt zu – aber der Anzug hält.', 2000);
    }
    // Aussehen
    C.ph += dt * (C.state === 'chase' ? 9 : 4);
    rig.root.position.set(C.x, 0, C.z); rig.root.rotation.set(0, C.yaw, 0);
    L.animHuman(rig, { mode: C.state === 'chase' ? 'run' : 'walk', phase: C.ph, speed: C.state === 'search' ? 0.1 : 1 });
    if (rig.belly) { const j = Math.sin(C.ph * 2) * (C.state === 'chase' ? 0.06 : 0.03); rig.belly.scale.set(1 - j * 0.5, 1 + j, 1); rig.belly.position.y = 0.05 - Math.abs(j) * 0.3; }
    // schwere Schritte
    C.stepT -= dt * (C.state === 'chase' ? 2.2 : 1);
    if (C.stepT <= 0 && C.state !== 'search') { C.stepT = 0.9; if (dP < 60) { L.tn && L.tn({ f: 55, fTo: 30, dur: 0.35, vol: Math.max(0.03, 0.3 * (1 - dP / 60)), pos: { x: C.x, y: 0, z: C.z } }); if (dP < 30) L.shake = Math.max(L.shake, 0.08 * (1 - dP / 30)); } }
  }
  L.extraTargets = () => (C && !C.dead && L.MIL ? [C] : []);
  L.carolinaHit = function (dmg, src) {
    if (!C || C.dead || !(dmg > 0)) return;
    C.hp -= dmg; L.blood && L.blood(C.x, 2.5, C.z, 8);
    if (L.showBossHp) L.showBossHp('🖤 DIE WAHRE CAROLINA', C.hp, HP);
    if (src) alertTo(src.x, src.z, true);
    if (C.hp <= 0) {
      C.dead = true; C.deadT = 0; L.banner('🖤 DIE WAHRE CAROLINA IST BESIEGT', 'In 4 Minuten ist sie wieder da …');
      if (src === P && L.gotKillCoins) L.gotKillCoins(400);
      for (const t of ['sniper', 'scharfmuni', 'lmg', 'medkit']) L.spawnItem(t, C.x + L.rand(-3, 3), C.z + L.rand(-3, 3), 1);
    }
  };
  // andere Monster kommen nicht in die Basis
  let pushT = 0;
  function keepMonstersOut(dt) {
    pushT -= dt; if (pushT > 0) return; pushT = 0.25;
    const M = L.MIL;
    for (const m of E.monsters) {
      if (m.dead || !L.inMil(m.x, m.z, 1)) continue;
      const dl = m.x - M.x1, dr = M.x2 - m.x, dt2 = m.z - M.z1, db = M.z2 - m.z, mn = Math.min(dl, dr, dt2, db);
      if (mn === dl) m.x = M.x1 - 3; else if (mn === dr) m.x = M.x2 + 3; else if (mn === dt2) m.z = M.z1 - 3; else m.z = M.z2 + 3;
      if (m.prey === P && L.inMil(P.x, P.z)) { m.prey = null; m.state = 'search'; m.timer = 3; }
    }
  }
  let toldT = 0;
  L.updateCarolina = function (dt) {
    if (!L.MIL || L.state !== 'game') return;
    if (!panels) buildWalls();
    if (!C) spawnC();
    carVsGlass();
    if (!L._isClient || !L._isClient()) keepMonstersOut(dt);
    updateC(dt);
    toldT -= dt;
    if (toldT <= 0 && L.inMil(P.x, P.z, 4) && P.alive) { toldT = 120; L.banner('🖤 HIER LEBT DIE WAHRE CAROLINA', 'Sie hört dich laufen – aber nicht schleichen (C). Nicht rennen, nicht schießen!'); }
  };
  L.clearCarolina = function () { restoreWalls(); if (C) { L.scene.remove(C.rig.root); C = null; } toldT = 0; };
})();
