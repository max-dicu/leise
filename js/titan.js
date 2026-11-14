'use strict';
// Der Titanenmond: ein zerstörter, orange glühender Planet in einer anderen Dimension. Das Portal liegt ganz hinten auf dem Mond.
// Dort wartet THANATOS, der Titan (eigener Entwurf). Wer ihn besiegt, bekommt für immer den EWIGKEITSHANDSCHUH mit sechs Steinen –
// für jeden Skin nutzbar. Thanatos ist schwer: viel Leben, drei Phasen, und der Handschuh macht ihm nur ein Viertel Schaden.
(function () {
  const L = window.L, T = THREE, P = L.player, E = L.ents;
  const TT = L.TITAN = { x: 92000, z: 0 }, TR = 1100;
  L.inTitan = (x, z) => x > 88000 && x < 96000 && Math.abs(z || 0) < 4000;
  setTimeout(() => { const od = L.dimLand; L.dimLand = (x, z) => (L.inTitan(x, z) ? Math.hypot(x - TT.x, z - TT.z) < TR : od ? od(x, z) : false); }, 0);
  const MOONP = () => ({ x: (L.MOON ? L.MOON.x : 120000) + 1180, z: 0 });
  const BACKP = { x: TT.x - 950, z: 0 };
  const ARENA = { x: TT.x + 150, z: 0 };
  const basic = (c, o) => new T.MeshBasicMaterial(Object.assign({ color: c, fog: false }, o || {}));
  const ease = (u) => { u = L.clamp(u, 0, 1); return u * u * (3 - 2 * u); };
  const isClientNet = () => L.net && L.net.role === 'client';

  // ---------- Portale ----------
  function portal(col1, col2) {
    const g = new T.Group();
    const ring = new T.Mesh(new T.TorusGeometry(9, 1.1, 12, 48), basic(col1)); g.add(ring);
    const disc = new T.Mesh(new T.CircleGeometry(8.2, 48), basic(col2, { transparent: true, opacity: 0.6, side: T.DoubleSide, blending: T.AdditiveBlending, depthWrite: false })); g.add(disc);
    const sw = []; for (let k = 0; k < 4; k++) { const s = new T.Mesh(new T.TorusGeometry(2 + k * 1.6, 0.18, 6, 32), basic(k % 2 ? col1 : 0xffffff, { transparent: true, opacity: 0.8 })); g.add(s); sw.push(s); }
    for (let k = 0; k < 10; k++) { const a = k / 10 * 6.283, c = new T.Mesh(L.GEO.cone, basic(col1)); c.scale.set(0.6, 3, 0.6); c.position.set(Math.cos(a) * 10.2, Math.sin(a) * 10.2, 0); c.rotation.z = a - Math.PI / 2; g.add(c); }
    const light = new T.PointLight(col2, 2, 60, 2); g.add(light);
    g.traverse((o) => { if (o.isMesh) o.frustumCulled = false; });
    L.scene.add(g); return { g, disc, sw };
  }
  let pMoon = null, pBack = null, travel = null;
  function updatePortals(dt) {
    const t = performance.now() / 1000, mp = MOONP();
    if (!pMoon && L.inMoon && L.inMoon(P.x)) { pMoon = portal(0xff7a20, 0xffc060); pMoon.g.position.set(mp.x, 10.5, mp.z); pMoon.g.rotation.y = Math.PI / 2; }
    if (!pBack && L.inTitan(P.x, P.z)) { pBack = portal(0x9a9aff, 0xd0d0ff); pBack.g.position.set(BACKP.x, 10.5, BACKP.z); pBack.g.rotation.y = Math.PI / 2; }
    for (const p of [pMoon, pBack]) if (p) { p.sw.forEach((s, k) => { s.rotation.z = t * (k % 2 ? 1.6 : -1.2); }); p.disc.material.opacity = 0.5 + Math.sin(t * 3) * 0.15; }
    if (travel) { travel.t += dt; L.backFade && (L.backFade.style.background = travel.toT ? '#ffb060' : '#c0c0ff', L.backFade.style.opacity = String(travel.t < 1.6 ? Math.max(0, (travel.t - 1.2) / 0.4) : Math.max(0, 1 - (travel.t - 1.6) / 0.6))); if (travel.t > 1.6 && !travel.done) doTravel(); if (travel.t > 2.3) { travel = null; if (L.backFade) L.backFade.style.opacity = '0'; } return; }
    if (!P.alive || L.cine || P.vehicle) return;
    if (pMoon && L.inMoon(P.x) && Math.hypot(P.x - mp.x, P.z - mp.z) < 6) startTravel(true);
    if (pBack && L.inTitan(P.x, P.z) && Math.hypot(P.x - BACKP.x, P.z - BACKP.z) < 6) startTravel(false);
  }
  function startTravel(toT) {
    travel = { toT, t: 0 };
    const c = toT ? MOONP() : BACKP;
    L.startCine(toT ? '🪐 DURCH DAS PORTAL ZUM TITANENMOND' : '🌕 ZURÜCK ZUM MOND', 2.2, (t) => { const a = t * 1.2; return { x: c.x - Math.cos(a) * (24 - t * 9), y: 12, z: c.z + Math.sin(a) * (24 - t * 9), lx: c.x, ly: 10, lz: c.z }; });
    for (let k = 0; k < 6; k++) L.tn && L.tn({ f: 160 + k * 110, fTo: 1800, dur: 0.9, type: 'sine', vol: 0.1, delay: k * 0.2 });
  }
  function doTravel() {
    travel.done = true;
    const toT = travel.toT, mp = MOONP();
    if (toT) { if (!world) build(); P.x = BACKP.x + 14; P.z = BACKP.z; } else { P.x = mp.x - 14; P.z = mp.z; }
    P.y = 1; P.vx = P.vz = P.vy = 0; P.air = true; P.spawnProt = Math.max(P.spawnProt || 0, 6); P.yaw = toT ? Math.PI / 2 : -Math.PI / 2;
    if (L.endCine && L.cine) L.endCine();
    if (toT) L.banner('🪐 DER TITANENMOND', B && !B.dead ? 'Ganz hinten in den Ruinen wartet THANATOS. Besiege ihn für den Ewigkeitshandschuh!' : 'Thanatos ist besiegt – er kehrt bald zurück …');
    else L.banner('🌕 ZURÜCK AUF DEM MOND', 'Das Portal zum Titanenmond bleibt offen.');
  }

  // ---------- die Welt ----------
  let world = null;
  function cvTex(w, h, fn) { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; return t; }
  function build() {
    const g = new T.Group(); L.scene.add(g);
    let s = 77; const R = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const gt = cvTex(256, 256, (c, w, h) => { c.fillStyle = '#6e4028'; c.fillRect(0, 0, w, h); for (let i = 0; i < 3000; i++) { c.fillStyle = `rgba(${Math.random() < 0.5 ? '60,30,15' : '200,130,80'},${(Math.random() * 0.25).toFixed(2)})`; c.fillRect(Math.random() * w, Math.random() * h, 2, 2); } c.strokeStyle = 'rgba(40,20,10,0.45)'; for (let k = 0; k < 14; k++) { c.beginPath(); let x = Math.random() * w, y = Math.random() * h; c.moveTo(x, y); for (let i = 0; i < 8; i++) { x += (Math.random() - 0.5) * 40; y += (Math.random() - 0.5) * 40; c.lineTo(x, y); } c.stroke(); } });
    gt.repeat.set(60, 60);
    const ground = new T.Mesh(new T.CylinderGeometry(TR, TR * 0.9, 30, 80), [new T.MeshLambertMaterial({ color: 0x6a3a22 }), new T.MeshLambertMaterial({ map: gt }), new T.MeshLambertMaterial({ color: 0x3a2014 })]);
    ground.position.set(TT.x, -15.02, TT.z); ground.receiveShadow = true; g.add(ground);
    const under = new T.Mesh(new T.ConeGeometry(TR * 0.9, 900, 40), new T.MeshLambertMaterial({ color: 0x3a2418 })); under.rotation.x = Math.PI; under.position.set(TT.x, -480, TT.z); g.add(under);
    const stone = L.mat('#7a6656'), stoneD = L.mat('#5a483c'), boxes = [];
    const solid = (x, z, hx, hz, h) => boxes.push(L.addBox(x - hx, z - hz, x + hx, z + hz, h, 'building'));
    // Ruinen: zerbrochene Säulen, Bögen, schräge Platten, Felsen
    for (let i = 0; i < 480; i++) {
      const a = R() * 6.283, d = 60 + Math.sqrt(R()) * (TR - 90), x = TT.x + Math.sin(a) * d, z = TT.z + Math.cos(a) * d;
      if (Math.hypot(x - ARENA.x, z - ARENA.z) < 70 || Math.hypot(x - BACKP.x, z - BACKP.z) < 40) continue;
      const k = R();
      if (k < 0.35) { const h = 6 + R() * 22, r = 1.4 + R() * 1.6, c = new T.Mesh(L.GEO.cylB, k < 0.15 ? stone : stoneD); c.scale.set(r, h, r); c.position.set(x, 0, z); c.rotation.z = (R() - 0.5) * 0.25; g.add(c); const cap = new T.Mesh(L.GEO.box, stone); cap.scale.set(r * 2.6, 1, r * 2.6); cap.position.set(x, h, z); cap.rotation.y = R() * 3; if (R() < 0.6) g.add(cap); solid(x, z, r * 0.8, r * 0.8, h); }
      else if (k < 0.5) { const w = 10 + R() * 14, h = 12 + R() * 10, ry = R() * 3; const ar = new T.Group(); ar.position.set(x, 0, z); ar.rotation.y = ry; g.add(ar); for (const sd of [-1, 1]) { const p = new T.Mesh(L.GEO.boxB, stoneD); p.scale.set(2.2, h, 2.2); p.position.x = sd * w / 2; ar.add(p); } if (R() < 0.7) { const top = new T.Mesh(L.GEO.box, stone); top.scale.set(w + 3, 2.2, 2.6); top.position.y = h + 1; top.rotation.z = (R() - 0.5) * 0.2; ar.add(top); } solid(x + Math.cos(ry) * w / 2, z - Math.sin(ry) * w / 2, 1.2, 1.2, h); solid(x - Math.cos(ry) * w / 2, z + Math.sin(ry) * w / 2, 1.2, 1.2, h); }
      else if (k < 0.75) { const sl = new T.Mesh(L.GEO.box, R() < 0.5 ? stone : stoneD); const w = 6 + R() * 16; sl.scale.set(w, 1.5 + R() * 2, 4 + R() * 8); sl.position.set(x, 1.5, z); sl.rotation.set((R() - 0.5) * 0.9, R() * 3, (R() - 0.5) * 0.9); g.add(sl); solid(x, z, w * 0.3, w * 0.3, 3); }
      else { const r = 2 + R() * 6, b = new T.Mesh(new T.DodecahedronGeometry(r), L.mat('#6a4a36')); b.position.set(x, r * 0.5, z); b.rotation.set(R() * 3, R() * 3, 0); g.add(b); solid(x, z, r * 0.7, r * 0.7, r * 1.2); }
    }
    // riesiger zerbrochener Ring hinter der Arena
    const ringG = new T.Group(); ringG.position.set(ARENA.x + 260, 0, ARENA.z); ringG.rotation.y = Math.PI / 2; g.add(ringG);
    const rg = new T.Mesh(new T.TorusGeometry(120, 9, 10, 64, Math.PI * 1.4), stoneD); rg.rotation.z = -0.3; ringG.add(rg);
    // Arena-Kreis
    const ar = new T.Mesh(new T.RingGeometry(55, 60, 64).rotateX(-Math.PI / 2), basic(0xff7a30, { transparent: true, opacity: 0.5 })); ar.position.set(ARENA.x, 0.05, ARENA.z); g.add(ar);
    // Himmel: Planet mit Ringen, zerbrochener Mond, schwebende Felsen
    const sky = new T.Group(); g.add(sky);
    const pl = new T.Mesh(new T.SphereGeometry(1400, 40, 24), basic(0xc06a3a)); pl.position.set(TT.x + 5000, 2200, TT.z - 4000); sky.add(pl);
    const prg = new T.Mesh(new T.RingGeometry(1800, 2800, 80), basic(0xe8b080, { transparent: true, opacity: 0.55, side: T.DoubleSide })); prg.position.copy(pl.position); prg.rotation.set(1.2, 0.3, 0.2); sky.add(prg);
    for (let k = 0; k < 14; k++) { const m = new T.Mesh(new T.DodecahedronGeometry(80 + R() * 220), basic(0x7a5a48)); m.position.set(TT.x - 3000 + R() * 6000, 900 + R() * 1800, TT.z - 5000 + R() * 2500); sky.add(m); }
    const floats = []; for (let k = 0; k < 40; k++) { const m = new T.Mesh(new T.DodecahedronGeometry(3 + R() * 12), L.mat('#6a4a36')); const a = R() * 6.283, d = 200 + R() * 1200; m.position.set(TT.x + Math.sin(a) * d, 40 + R() * 160, TT.z + Math.cos(a) * d); g.add(m); floats.push({ m, y: m.position.y, ph: R() * 6 }); }
    sky.traverse((o) => { o.frustumCulled = false; });
    world = { g, boxes, floats, sky };
  }
  // Licht und Himmel
  const oue = L.updateEnv;
  L.updateEnv = function (dt, cam, focus, paused) {
    oue(dt, cam, focus, paused);
    if (!cam || !L.inTitan(cam.position.x, cam.position.z) || cam.position.y > 1000) return;
    const E2 = L.env;
    L.scene.background.set('#7a3a1e'); L.scene.fog.color.set('#9a5228'); L.scene.fog.near = 150; L.scene.fog.far = 1800;
    if (E2.stars) E2.stars.material.opacity = 0.15; if (E2.sunDisc) E2.sunDisc.material.opacity = 0; if (E2.moon) E2.moon.material.opacity = 0; if (E2.rainMesh) E2.rainMesh.visible = false;
    E2.hemi.intensity = 0.62; E2.hemi.color.set('#ffb070'); E2.hemi.groundColor.set('#6a3018');
    E2.sun.intensity = 0.7; E2.sun.color.set('#ffa060');
  };

  // ---------- THANATOS ----------
  const MAXHP = 10000;
  let B = null, respawnT = 0, deadInfo = null;
  function buildBoss() {
    const rig = L.buildHuman(Object.assign({}, L.DEFAULT_CHAR, { name: 'Thanatos', skin: '#6c7686', hair: 'glatze', eyes: '#e8e0ff', brows: 'boese', mouth: 'ernst', beard: 'kein', top: 'anzug', topColor: '#28305a', pants: 'anzughose', pantsColor: '#28305a', shoeType: 'stiefel', shoes: '#c8a030', build: 'extrem', height: 'sehr_gross' }), true);
    const gold = new T.MeshStandardMaterial({ color: 0xd8a830, metalness: 0.8, roughness: 0.3, emissive: 0x2a1a00 });
    const P3 = (geo, m, sx, sy, sz, x, y, z, par) => { const o = new T.Mesh(geo, m); o.scale.set(sx, sy, sz); o.position.set(x, y, z); o.castShadow = true; par.add(o); return o; };
    P3(L.GEO.box, gold, 0.6, 0.42, 0.36, 0, 0.42, 0.02, rig.torso);
    for (const s of [-1, 1]) { P3(L.GEO.sph, gold, 0.24, 0.14, 0.24, s * 0.36, 0.6, 0, rig.torso); P3(L.GEO.sph, basic(0xf0e8ff), 0.03, 0.02, 0.01, s * 0.06, 0.14, 0.165, rig.head); }
    P3(L.GEO.sph, gold, 0.19, 0.12, 0.2, 0, 0.28, -0.01, rig.head);
    for (const s of [-1, 1]) { const c = P3(L.GEO.cone, gold, 0.04, 0.24, 0.04, s * 0.16, 0.36, -0.02, rig.head); c.rotation.z = -s * 0.4; }
    for (let k = 0; k < 5; k++) P3(L.GEO.box, basic(0x4a5060), 0.012, 0.06, 0.01, -0.04 + k * 0.02, 0.0, 0.16, rig.head);
    // Handschuh mit sechs Steinen (linke Hand)
    const gl = new T.Group(); gl.position.set(0, -0.28, 0.02); rig.arms[1].elbow.add(gl);
    P3(L.GEO.sph, gold, 0.12, 0.14, 0.11, 0, 0, 0, gl);
    const gems = []; STONES.forEach((st, k) => { gems.push(P3(L.GEO.sph, basic(st.col), 0.028, 0.028, 0.02, k < 5 ? (k - 2) * 0.045 : 0, k < 5 ? -0.08 : 0.03, 0.1, gl)); });
    rig.root.scale.setScalar(2.9);
    rig.root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    L.scene.add(rig.root);
    return { rig, gl, gems };
  }
  function spawnBoss() {
    const r = buildBoss();
    B = { kind: 'thanatos', rig: r.rig, gl: r.gl, x: ARENA.x, z: ARENA.z, y: 0, yaw: -Math.PI / 2, hp: MAXHP, dead: false, act: null, actT: 0, cd: 2, slamCd: 8, beamCd: 6, telCd: 12, pilCd: 10, metCd: 14, healed: false, awake: false, hitR: 60, bigR: 4, ph: 0, fx: [] };
    L.thanatos = B;
  }
  const phase = () => (B.hp > MAXHP * 0.66 ? 1 : B.hp > MAXHP * 0.33 ? 2 : 3);
  L.thanatosHit = function (dmg, src) {
    if (!B || B.dead || !(dmg > 0)) return;
    dmg *= 0.35; // dicke Titanen-Panzerung
    if (L._gauntletFiring) dmg *= 0.2; // der Handschuh wirkt kaum gegen seinen eigenen Meister
    B.lastHit = performance.now();
    if (!B.awake) wake();
    B.hp -= dmg; L.blood && L.blood(B.x, 6, B.z, 6);
    if (L.showBossHp) L.showBossHp('🟣 THANATOS – PHASE ' + phase(), Math.max(0, B.hp), MAXHP);
    if (B.hp <= 0) die(src);
  };
  function wake() {
    B.awake = true;
    L.banner('🟣 THANATOS ERWACHT', '„Ich bin unausweichlich.“ – Weich seinen Angriffen aus: Rote Kreise = gleich kommt was! Springen hilft gegen die Schockwelle.');
    L.snd.bossRoar && L.snd.bossRoar({ x: B.x, y: 10, z: B.z }); L.shake = Math.max(L.shake, 1);
  }
  function die(src) {
    B.dead = true; B.act = 'die'; B.actT = 0;
    if (src === P && L.gotBossCoins) L.gotBossCoins(2000, 'Thanatos');
    L.banner('🟣 THANATOS IST BESIEGT', 'Er zerfällt zu Staub … nimm dir den EWIGKEITSHANDSCHUH!');
    L.startCine('🟣 DAS ENDE DES TITANEN', 6, (t) => { if (!B) return null; const a = -Math.PI / 2 + 0.6 + t * 0.15; return { x: B.x + Math.sin(a) * 22, y: 8, z: B.z + Math.cos(a) * 22, lx: B.x, ly: 4 + Math.max(0, 3 - t), lz: B.z }; });
  }
  // Angriffs-Effekte
  function telegraph(x, z, r, t, onHit) {
    const m = new T.Mesh(new T.RingGeometry(r * 0.85, r, 40).rotateX(-Math.PI / 2), basic(0xff2020, { transparent: true, opacity: 0.8, side: T.DoubleSide, depthWrite: false }));
    m.position.set(x, 0.08, z); L.scene.add(m); B.fx.push({ kind: 'tele', m, t: 0, dur: t, x, z, r, onHit });
  }
  function hurtIf(cond, dmg, why, kx, kz) { if (!cond || !P.alive || !L.inTitan(P.x, P.z)) return; L.hurtPlayer(dmg, why); if (kx !== undefined) { P.vx = kx; P.vz = kz; P.vy = 6; P.air = true; P.knockT = 0.5; } L.shake = Math.max(L.shake, 0.6); }
  function updateBoss(dt) {
    const rig = B.rig, inT = L.inTitan(P.x, P.z);
    for (let i = B.fx.length - 1; i >= 0; i--) {
      const f = B.fx[i]; f.t += dt; const u = f.t / f.dur;
      if (f.kind === 'tele') { f.m.material.opacity = 0.4 + Math.sin(f.t * 20) * 0.4; if (u >= 1) { L.scene.remove(f.m); B.fx.splice(i, 1); if (f.onHit) f.onHit(f); } continue; }
      if (f.kind === 'wave') { f.r += dt * 20; f.m.scale.setScalar(f.r); f.m.material.opacity = Math.max(0, 0.9 - f.r / 30); const dP = Math.hypot(P.x - f.x, P.z - f.z); if (!f.hit && Math.abs(dP - f.r) < 1.5 && (P.y || 0) < 0.8) { f.hit = true; const a = Math.atan2(P.x - f.x, P.z - f.z); hurtIf(true, 45, 'Von der Schockwelle des Titanen getroffen', Math.sin(a) * 14, Math.cos(a) * 14); } if (f.r > 30) { L.scene.remove(f.m); B.fx.splice(i, 1); } continue; }
      if (f.kind === 'spike' || f.kind === 'beam' || f.kind === 'met') { if (f.upd) f.upd(f, dt); if (u >= 1) { L.scene.remove(f.m); B.fx.splice(i, 1); } }
    }
    if (B.dead) {
      B.actT += dt; L.animHuman(rig, { mode: 'dead' });
      rig.root.rotation.set(0, B.yaw, 0);
      if (B.actT < 1.5) { L.animHuman(rig, { mode: 'crouch', phase: 0, speed: 0 }); }
      const k = L.clamp((B.actT - 2) / 3, 0, 1); rig.root.scale.setScalar(2.9 * (1 - k * 0.98));
      if (B.actT > 2 && Math.random() < dt * 60) L.fx(Math.random() < 0.5 ? '#6c7686' : '#4a4038', B.x + L.rand(-3, 3), L.rand(1, 9) * (1 - k), B.z + L.rand(-3, 3), 2, 3, { size: 0.3, life: 1.6, g: -1 });
      if (B.actT > 5 && !deadInfo) { L.scene.remove(rig.root); deadInfo = dropGauntlet(B.x, B.z); }
      return;
    }
    // ohne Spieler: Leben langsam zurück, Kampf zurücksetzen
    if (!inT || !P.alive) { if (B.awake) { B.idleT = (B.idleT || 0) + dt; if (B.idleT > 60) { B.hp = MAXHP; B.awake = false; B.healed = false; B.x = ARENA.x; B.z = ARENA.z; B.act = null; } } return; }
    B.idleT = 0;
    const dx = P.x - B.x, dz = P.z - B.z, d = Math.hypot(dx, dz);
    if (!B.awake) { L.animHuman(rig, { mode: 'walk', phase: 0, speed: 0 }); rig.root.position.set(B.x, 0, B.z); rig.root.rotation.set(0, B.yaw, 0); if (d < 110) wake(); return; }
    const ph = phase(), fast = ph === 3 ? 2.0 : ph === 2 ? 1.6 : 1.3;
    // heilt sich, wenn er 4 s nicht getroffen wird
    if (B.awake && performance.now() - (B.lastHit || 0) > 4000 && B.hp < MAXHP) { B.hp = Math.min(MAXHP, B.hp + MAXHP * 0.015 * dt); if (Math.random() < dt * 6) L.fx('#40ff80', B.x + L.rand(-3, 3), L.rand(1, 9), B.z + L.rand(-3, 3), 1, 1.5, { basic: true, size: 0.25, life: 0.7, g: -2 }); if (L.showBossHp && Math.random() < dt * 4) L.showBossHp('🟣 THANATOS – heilt sich!', B.hp, MAXHP); }
    B.cd -= dt; B.slamCd -= dt; B.beamCd -= dt; B.telCd -= dt; B.pilCd -= dt; B.metCd -= dt;
    // Zeit-Stein: einmal heilen in Phase 3
    if (ph === 3 && !B.healed && !B.act) { B.healed = true; B.act = 'heal'; B.actT = 0; L.banner('🟢 ZEIT-STEIN', 'Thanatos dreht die Zeit zurück und heilt sich!'); }
    if (!B.act) {
      if (B.telCd <= 0 && ph >= 2 && d > 25) { B.act = 'tele'; B.actT = 0; B.telCd = 14 / fast; }
      else if (d < 9 && B.cd <= 0) { B.act = 'punch'; B.actT = 0; B.cd = 1.6 / fast; }
      else if (B.slamCd <= 0 && d < 30) { B.act = 'slam'; B.actT = 0; B.slamCd = 9 / fast; }
      else if (B.beamCd <= 0 && d > 12 && d < 90) { B.act = 'beam'; B.actT = 0; B.beamCd = 8 / fast; }
      else if (B.pilCd <= 0 && ph >= 2) { B.act = 'pillars'; B.actT = 0; B.pilCd = 11 / fast; }
      else if (B.metCd <= 0 && ph >= 3) { B.act = 'meteors'; B.actT = 0; B.metCd = 13; }
    }
    const want = Math.atan2(dx, dz); B.yaw += L.angDiff(B.yaw, want) * Math.min(1, dt * 3);
    let mode = 'walk', spd = 0;
    B.actT += dt; const t = B.actT;
    const [aR, aL] = rig.arms;
    if (!B.act) { if (d > 6) { spd = 5.5 * fast; mode = d > 30 ? 'run' : 'walk'; } }
    B.ph += dt * (mode === 'run' ? 4 : 2.6) * (spd > 0 ? 1 : 0.2);
    B.x += Math.sin(B.yaw) * spd * dt; B.z += Math.cos(B.yaw) * spd * dt;
    { const r = Math.hypot(B.x - TT.x, B.z - TT.z); if (r > TR - 20) { B.x = TT.x + (B.x - TT.x) / r * (TR - 20); B.z = TT.z + (B.z - TT.z) / r * (TR - 20); } }
    L.animHuman(rig, { mode, phase: B.ph, speed: spd > 0 ? 1 : 0.1 });
    let y = 0;
    switch (B.act) {
      case 'punch':
        aR.arm.rotation.x = t < 0.55 ? -0.4 - t * 2 : -1.6; aR.elbow.rotation.x = t < 0.55 ? -1.8 : -0.1;
        if (t > 0.55 && !B.hitDone) { B.hitDone = true; const dd = Math.hypot(P.x - B.x, P.z - B.z); const a = Math.atan2(P.x - B.x, P.z - B.z); hurtIf(dd < 11, 60, 'Vom Titanen zerschmettert', Math.sin(a) * 16, Math.cos(a) * 16); L.snd.stomp && L.snd.stomp({ x: B.x, y: 4, z: B.z }); }
        if (t > 0.9) { B.act = null; B.hitDone = false; }
        break;
      case 'slam':
        for (const a of rig.arms) { a.arm.rotation.x = -3; a.elbow.rotation.x = -0.2; }
        y = t < 0.8 ? Math.sin(t / 0.8 * Math.PI / 2) * 9 : Math.max(0, 9 - (t - 0.8) * 45);
        if (t > 1.0 && !B.hitDone) { B.hitDone = true; L.shake = Math.max(L.shake, 1.3); L.snd.explosion && L.snd.explosion({ x: B.x, y: 1, z: B.z }); const m = new T.Mesh(new T.TorusGeometry(1, 0.08, 6, 64), basic(0xffa060, { transparent: true, opacity: 0.9 })); m.rotation.x = Math.PI / 2; m.position.set(B.x, 0.5, B.z); L.scene.add(m); B.fx.push({ kind: 'wave', m, r: 1, x: B.x, z: B.z, t: 0, dur: 99 }); L.decal && L.decal(B.x, B.z, 8, '#2a1a10'); }
        if (t > 1.5) { B.act = null; B.hitDone = false; }
        break;
      case 'beam': {
        aL.arm.rotation.x = -1.6; aL.elbow.rotation.x = 0;
        if (t < 1.1) { B.aim = { x: P.x, z: P.z }; if (Math.random() < dt * 30) { const gp = new T.Vector3(); B.gl.getWorldPosition(gp); L.fx('#c040ff', gp.x, gp.y, gp.z, 2, 2, { basic: true, size: 0.4, life: 0.4 }); } }
        else if (!B.beam) {
          const gp = new T.Vector3(); B.gl.getWorldPosition(gp); const end = new T.Vector3(B.aim.x + (B.aim.x - B.x) * 0.6, 1, B.aim.z + (B.aim.z - B.z) * 0.6);
          const len = gp.distanceTo(end), m = new T.Mesh(new T.CylinderGeometry(1.1, 1.1, len, 12, 1, true), basic(0xc040ff, { transparent: true, opacity: 0.85, blending: T.AdditiveBlending, depthWrite: false }));
          m.position.copy(gp).lerp(end, 0.5); m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), end.clone().sub(gp).normalize()); L.scene.add(m);
          B.beam = { a: gp, b: end, tick: 0 }; B.fx.push({ kind: 'beam', m, t: 0, dur: 1.2 }); L.env.bolt = 0.4; L.tn && L.tn({ f: 120, fTo: 80, dur: 1.2, type: 'sawtooth', vol: 0.3 });
        } else {
          B.beam.tick -= dt;
          if (B.beam.tick <= 0) { B.beam.tick = 0.2; const a = B.beam.a, b = B.beam.b, ab = b.clone().sub(a), pp = new T.Vector3(P.x, (P.y || 0) + 1, P.z), u = L.clamp(pp.clone().sub(a).dot(ab) / ab.lengthSq(), 0, 1), cl = a.clone().addScaledVector(ab, u); hurtIf(cl.distanceTo(pp) < 2.6, 14, 'Vom Kraft-Stein verbrannt'); }
        }
        if (t > 2.4) { B.act = null; B.beam = null; }
        break;
      }
      case 'tele':
        if (t < 0.4) rig.root.visible = Math.random() < 0.5;
        else if (!B.hitDone) { B.hitDone = true; L.fx('#4080ff', B.x, 6, B.z, 30, 6, { basic: true, size: 0.5, life: 0.6 }); const a = P.yaw + Math.PI; B.x = P.x + Math.sin(a) * 6; B.z = P.z + Math.cos(a) * 6; rig.root.visible = true; L.fx('#4080ff', B.x, 6, B.z, 30, 6, { basic: true, size: 0.5, life: 0.6 }); L.snd.teleport && L.snd.teleport({ x: B.x, y: 4, z: B.z }); L.msg('🔵 Raum-Stein: Er ist HINTER dir!', 1500); }
        if (t > 0.5) { B.act = 'punch'; B.actT = 0.2; B.hitDone = false; }
        break;
      case 'pillars':
        aL.arm.rotation.x = -2.6;
        if (!B.hitDone) { B.hitDone = true; L.msg('🔴 Realitäts-Stein: Weg aus den roten Kreisen!', 1800); for (let k = 0; k < 6; k++) { const x = P.x + (k ? L.rand(-9, 9) : 0), z = P.z + (k ? L.rand(-9, 9) : 0); telegraph(x, z, 3.2, 1.3, (f) => spike(f.x, f.z)); } }
        if (t > 1.6) { B.act = null; B.hitDone = false; }
        break;
      case 'meteors':
        aL.arm.rotation.x = -3; aR.arm.rotation.x = -3;
        if (!B.hitDone) { B.hitDone = true; L.banner('☄️ METEORREGEN', 'Thanatos reißt Stücke vom Mond herunter!'); for (let k = 0; k < 12; k++) setTimeout(() => { if (B && !B.dead) { const x = P.x + L.rand(-14, 14), z = P.z + L.rand(-14, 14); telegraph(x, z, 6, 1.4, (f) => meteor(f.x, f.z)); } }, k * 300); }
        if (t > 2) { B.act = null; B.hitDone = false; }
        break;
      case 'heal':
        for (const a of rig.arms) a.arm.rotation.x = -2.2;
        B.hp = Math.min(MAXHP * 0.5, B.hp + MAXHP * 0.1 * dt);
        if (Math.random() < dt * 30) L.fx('#40ff80', B.x + L.rand(-4, 4), L.rand(0, 10), B.z + L.rand(-4, 4), 1, 2, { basic: true, size: 0.3, life: 0.8, g: -2 });
        if (L.showBossHp) L.showBossHp('🟣 THANATOS – PHASE ' + phase(), B.hp, MAXHP);
        if (t > 2) B.act = null;
        break;
    }
    rig.root.position.set(B.x, y, B.z); rig.root.rotation.set(0, B.yaw, 0);
    // Steine im Handschuh leuchten
    B.gl.children.forEach((c, k) => { if (k) c.scale.setScalar((0.028 + Math.sin(performance.now() / 200 + k) * 0.006) * (B.act === 'beam' ? 1.6 : 1)); });
  }
  function spike(x, z) {
    const m = new T.Mesh(L.GEO.cone, L.mat('#8a4a3a')); m.scale.set(2.6, 0.1, 2.6); m.position.set(x, 0, z); L.scene.add(m);
    B.fx.push({ kind: 'spike', m, t: 0, dur: 2.5, upd: (f) => { const k = Math.min(1, f.t / 0.15) * (f.t > 2 ? Math.max(0, 1 - (f.t - 2) * 2) : 1); f.m.scale.y = 9 * k; f.m.position.y = 4.5 * k; } });
    L.fx('#8a5a40', x, 0.5, z, 14, 6, { size: 0.5, life: 0.8 });
    hurtIf(Math.hypot(P.x - x, P.z - z) < 3.4 && (P.y || 0) < 6, 50, 'Von einer Felssäule aufgespießt', 0, 0);
  }
  function meteor(x, z) {
    const m = new T.Mesh(new T.DodecahedronGeometry(2.2), new T.MeshBasicMaterial({ color: 0xff6a20 })); m.position.set(x + 40, 120, z - 30); L.scene.add(m);
    B.fx.push({ kind: 'met', m, t: 0, dur: 0.6, upd: (f) => { const u = f.t / 0.6; f.m.position.set(x + 40 * (1 - u), 120 * (1 - u), z - 30 * (1 - u)); if (u > 0.95 && !f.boom) { f.boom = true; L.fx('#ff8a30', x, 1, z, 26, 10, { basic: true, size: 0.5, life: 0.8 }); L.snd.explosion && L.snd.explosion({ x, y: 1, z }); L.decal && L.decal(x, z, 4, '#1a0e08'); L.shake = Math.max(L.shake, 0.5); hurtIf(Math.hypot(P.x - x, P.z - z) < 7, 45, 'Von einem Meteor getroffen'); } } });
  }
  function dropGauntlet(x, z) {
    const g = gauntletModel(); g.scale.setScalar(6); g.position.set(x, 3, z); L.scene.add(g);
    const lt = new T.PointLight(0xffd060, 3, 40, 2); g.add(lt);
    return { g, x, z };
  }
  // Waffenmodell
  const STONES = [
    { id: 'kraft', name: 'Kraft-Stein', col: 0xb040ff, css: '#b040ff', cd: 3 },
    { id: 'raum', name: 'Raum-Stein', col: 0x3080ff, css: '#3080ff', cd: 2 },
    { id: 'real', name: 'Realitäts-Stein', col: 0xff2030, css: '#ff2030', cd: 6 },
    { id: 'seele', name: 'Seelen-Stein', col: 0xff9020, css: '#ff9020', cd: 8 },
    { id: 'zeit', name: 'Zeit-Stein', col: 0x30ff70, css: '#30ff70', cd: 12 },
    { id: 'geist', name: 'Geist-Stein', col: 0xffe030, css: '#ffe030', cd: 10 },
    { id: 'snap', name: '✨ Schnipp (alle Steine)', col: 0xffffff, css: '#ffffff', cd: 120 }
  ];
  function gauntletModel() {
    const g = new T.Group(), gold = new T.MeshStandardMaterial({ color: 0xe0b040, metalness: 0.8, roughness: 0.3, emissive: 0x3a2400 });
    const hand = new T.Mesh(L.GEO.box, gold); hand.scale.set(0.16, 0.2, 0.08); g.add(hand);
    for (let k = 0; k < 4; k++) { const f = new T.Mesh(L.GEO.box, gold); f.scale.set(0.035, 0.12, 0.04); f.position.set(-0.06 + k * 0.04, 0.15, 0); g.add(f); }
    const th = new T.Mesh(L.GEO.box, gold); th.scale.set(0.035, 0.09, 0.04); th.position.set(0.1, 0.04, 0); th.rotation.z = -0.6; g.add(th);
    const cuff = new T.Mesh(L.GEO.cyl, gold); cuff.scale.set(0.1, 0.12, 0.07); cuff.position.y = -0.15; g.add(cuff);
    STONES.slice(0, 6).forEach((s, k) => { const m = new T.Mesh(L.GEO.sph, basic(s.col)); m.scale.setScalar(k === 5 ? 0.035 : 0.018); m.position.set(k === 5 ? 0 : -0.06 + k * 0.04, k === 5 ? -0.02 : 0.2, 0.045); g.add(m); });
    return g;
  }
  L.ITEMS.ewigkeitshandschuh = { name: 'Ewigkeitshandschuh', slot: 'waffe', icon: '🧤', dmg: 0, rate: 0.6, noise: 60, range: 250, ammo: null, mag: 1, spread: 0, energy: true, gauntlet: true };
  const obi = L.buildItem;
  L.buildItem = function (type) { if (type === 'ewigkeitshandschuh') { const g = gauntletModel(); g.rotation.x = -0.3; return g; } return obi(type); };
  L.hasGauntlet = () => !!(L.save && L.save.gauntlet);
  // zu Rundenbeginn: in die Schnellleiste (jeder Skin)
  L.gauntletStart = function () {
    if (!L.hasGauntlet()) return;
    if ([P.hot, P.bag].some((a) => a.some((x) => x && x.type === 'ewigkeitshandschuh'))) return;
    const i = P.hot.findIndex((x) => !x), it = { type: 'ewigkeitshandschuh', count: 1, mag: 1 };
    if (i >= 0) P.hot[i] = it; else { const b = P.bag.findIndex((x) => !x); if (b >= 0) P.bag[b] = it; else P.hot[0] = it; }
  };

  // ---------- Handschuh benutzen ----------
  const G = { stone: 0, cd: {}, anim: 0, col: 0xffffff, hud: null };
  function hud() {
    if (G.hud) return G.hud;
    const d = document.createElement('div'); d.id = 'gauntHud';
    d.style.cssText = 'position:fixed;left:50%;bottom:96px;transform:translateX(-50%);z-index:14;display:none;gap:6px;align-items:center;background:rgba(0,0,0,.55);padding:5px 10px;border-radius:14px;font:bold 12px Arial,sans-serif;color:#fff';
    STONES.forEach((s, k) => { const b = document.createElement('button'); b.style.cssText = `width:30px;height:30px;border-radius:50%;border:3px solid #444;background:${s.css};cursor:pointer;font-size:12px;padding:0`; if (s.id === 'snap') b.textContent = '✨'; b.title = s.name; b.onclick = (e) => { e.preventDefault(); e.stopPropagation(); G.stone = k; }; d.appendChild(b); });
    const gear = document.createElement('button'); gear.textContent = '⚙️'; gear.title = 'Einstellen (J)'; gear.style.cssText = 'width:30px;height:30px;border-radius:50%;border:2px solid #e0b040;background:#2a2030;cursor:pointer;padding:0'; gear.onclick = (e) => { e.preventDefault(); e.stopPropagation(); openPanel(); }; d.appendChild(gear);
    const lab = document.createElement('span'); lab.style.marginLeft = '6px'; d.appendChild(lab);
    const cs = document.createElement('style'); cs.textContent = 'body.cinema #gauntHud{visibility:hidden}'; document.head.appendChild(cs);
    document.body.appendChild(d); G.hud = d; return d;
  }
  addEventListener('keydown', (e) => { if (e.code === 'KeyN' && !L.chatOpen && L.selType && L.selType() === 'ewigkeitshandschuh') G.stone = (G.stone + 1) % STONES.length; });
  const aim = () => { const d = new T.Vector3(); L.camera.getWorldDirection(d); return d; };
  const handPos = () => { const h = new T.Vector3(); if (P.rig && P.rig.hand) P.rig.hand.getWorldPosition(h); else h.set(P.x, (P.y || 0) + 1.4, P.z); return h; };
  const MK = () => L.MK || {};
  // Einstellungen (Taste J / ⚙️): Wen trifft es, wie lange, welche Art
  const CFG = L.gauntletCfg = { who: 'alle', zeit: 8, geistArt: 'kaempfen', geistDauer: 20, realArt: 'blasen', realDauer: 15, raumArt: 'selbst', kraft: 2 };
  try { Object.assign(CFG, JSON.parse(localStorage.getItem('gauntletCfg') || '{}')); } catch (e) { /* egal */ }
  const saveCfg = () => { try { localStorage.setItem('gauntletCfg', JSON.stringify(CFG)); } catch (e) { /* egal */ } };
  const isRemote = (e) => e.kind === 'remote';
  const allowed = (e) => (isRemote(e) ? CFG.who !== 'monster' : CFG.who !== 'spieler');
  const tgts = () => (L._targets ? L._targets() : []).filter(allowed);
  // Effekt an einen Mitspieler schicken
  const toPlayer = (e, m) => { if (isRemote(e) && L.mp && L.mp.sendTo) L.mp.sendTo(e.pid, Object.assign({ t: 'gnt', by: (L.save.char || {}).name || 'Mitspieler' }, m)); };
  const fxs = [];
  function beamFx(a, b, col, w, dur) { const len = a.distanceTo(b), m = new T.Mesh(new T.CylinderGeometry(w, w, len, 10, 1, true), basic(col, { transparent: true, opacity: 0.9, blending: T.AdditiveBlending, depthWrite: false })); m.position.copy(a).lerp(b, 0.5); m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), b.clone().sub(a).normalize()); L.scene.add(m); fxs.push({ m, t: 0, dur }); }
  function ringFx(x, y, z, col, r, dur) { const m = new T.Mesh(new T.TorusGeometry(1, 0.1, 6, 48), basic(col, { transparent: true, opacity: 0.9, blending: T.AdditiveBlending, depthWrite: false })); m.rotation.x = Math.PI / 2; m.position.set(x, y, z); L.scene.add(m); fxs.push({ m, t: 0, dur, grow: r }); }
  const dmg = (e, n) => { if (isRemote(e)) { toPlayer(e, { e: 'dmg', d: Math.min(95, n / 6) }); return; } L._gauntletFiring = true; try { L.damageEnt(e, n, P.x, P.z, P); } finally { L._gauntletFiring = false; } };
  const mind = new Set(), warped = new Set(), frozen = new Set();
  function warp(e, art, dur) {
    e.warpT = dur; e.warpArt = art; warped.add(e); e.prey = null; e.calmT = dur; e.state = 'idle';
    const root = e.rig && e.rig.root; if (!root) return;
    if (e.baseScale === undefined) e.baseScale = root.scale.x;
    if (art === 'schaf') { if (!e.wool) { e.wool = new T.Mesh(L.GEO.sph, L.mat('#f4f2ea')); e.wool.scale.set(0.8, 0.6, 1); e.wool.position.y = 1.2; root.add(e.wool); } e.wool.visible = true; root.scale.setScalar(e.baseScale * 0.6); }
    else root.scale.setScalar(e.baseScale * 0.3);
    L.fx('#ff4060', e.x, 1, e.z, 14, 4, { basic: true, size: 0.3, life: 0.8 });
  }
  function updMind(dt) {
    for (const e of [...frozen]) { e.frozenT -= dt; if (e.frozenT <= 0 || e.dead) { frozen.delete(e); continue; } e.x = e.frzPos.x; e.z = e.frzPos.z; e.stunT = Math.max(e.stunT || 0, 0.2); if (e.rig && e.rig.root) e.rig.root.position.set(e.x, e.rig.root.position.y, e.z); }
    for (const e of [...warped]) { e.warpT -= dt; if (e.rig && e.rig.root && e.baseScale !== undefined) e.rig.root.scale.setScalar(e.baseScale * (e.warpArt === 'schaf' ? 0.6 : 0.3)); e.prey = null; if (e.warpT <= 0 || e.dead) { warped.delete(e); if (e.rig && e.baseScale !== undefined) e.rig.root.scale.setScalar(e.baseScale); if (e.wool) e.wool.visible = false; } }
    for (const e of [...mind]) {
      e.allyT -= dt; if (e.allyT <= 0 || e.dead) { mind.delete(e); continue; }
      e.prey = null; e.calmT = 1;
      // Verbündete greifen das nächste andere Monster an
      let best = null, bd = 60; for (const o of L.ents.monsters) { if (o === e || o.dead || mind.has(o)) continue; const d = Math.hypot(o.x - e.x, o.z - e.z); if (d < bd) { bd = d; best = o; } }
      if (best) { const a = Math.atan2(best.x - e.x, best.z - e.z); if (bd > 2.2) { e.x += Math.sin(a) * 6 * dt; e.z += Math.cos(a) * 6 * dt; e.yaw = a; } else { e.atkT = (e.atkT || 0) - dt; if (e.atkT <= 0) { e.atkT = 0.8; L.damageEnt(best, 35, e.x, e.z, P); } } }
      if (Math.random() < dt * 3) L.fx('#ffe030', e.x, 3, e.z, 1, 1, { basic: true, size: 0.15, life: 0.5 });
    }
  }
  // Wirkung auf MICH (von einem anderen Spieler mit Handschuh)
  const ME = { freezeT: 0, ctrlT: 0, ctrl: null, shrinkT: 0, fx: null, pos: null };
  L.gauntletRemote = function (m) {
    if (!P.alive || L.state !== 'game' || (L.suitOn && L.suitOn())) return;
    const by = String(m.by || 'Jemand').slice(0, 18);
    if (m.e === 'dmg') L.hurtPlayer(m.d || 20, 'Vom Ewigkeitshandschuh von ' + by + ' getroffen');
    else if (m.e === 'freeze') { ME.freezeT = Math.min(60, m.d || 8); ME.pos = { x: P.x, y: P.y || 0, z: P.z }; L.msg('🟢 ' + by + ' hat die Zeit für dich angehalten (' + Math.round(ME.freezeT) + ' s)!', 3000); }
    else if (m.e === 'ctrl') { ME.ctrlT = Math.min(60, m.d || 15); ME.ctrl = { x: m.x, z: m.z }; L.msg('🟡 ' + by + ' kontrolliert deinen Geist – du läufst, wohin er will!', 3000); }
    else if (m.e === 'shrink') { ME.shrinkT = Math.min(60, m.d || 15); L.msg('🔴 ' + by + ' hat deine Realität verändert – du bist winzig!', 3000); }
    else if (m.e === 'tele') { P.x = m.x; P.z = m.z; P.y = 2; P.vx = P.vz = 0; P.air = true; L.msg('🔵 ' + by + ' hat dich weggeschleudert!', 2500); }
  };
  function updMe(dt) {
    if (!ME.fx) { ME.fx = document.createElement('div'); ME.fx.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:12;display:none'; document.body.appendChild(ME.fx); }
    let tint = null;
    if (ME.freezeT > 0) { ME.freezeT -= dt; P.x = ME.pos.x; P.z = ME.pos.z; P.y = ME.pos.y; P.vx = P.vz = P.vy = 0; tint = 'rgba(40,255,120,.18)'; if (ME.freezeT <= 0) L.msg('⏱️ Die Zeit läuft wieder.', 1500); }
    if (ME.ctrlT > 0) { ME.ctrlT -= dt; const dx = ME.ctrl.x - P.x, dz = ME.ctrl.z - P.z, d = Math.hypot(dx, dz); if (d > 1.5) { P.x += dx / d * 3.5 * dt; P.z += dz / d * 3.5 * dt; P.yaw = Math.atan2(dx, dz); } P.vx = P.vz = 0; tint = 'rgba(255,224,48,.15)'; }
    if (ME.shrinkT > 0) { ME.shrinkT -= dt; if (P.rig) P.rig.root.scale.setScalar(0.3); P.vx *= 0.5; P.vz *= 0.5; tint = tint || 'rgba(255,60,90,.1)'; if (ME.shrinkT <= 0 && P.rig) { P.rig.root.scale.setScalar(1); L.msg('Du bist wieder normal groß.', 1500); } }
    ME.fx.style.display = tint ? 'block' : 'none'; if (tint) ME.fx.style.background = tint;
  }
  // ---------- Einstellungsfenster ----------
  let panel = null;
  function openPanel() {
    if (!panel) {
      panel = document.createElement('div');
      panel.style.cssText = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:70;background:rgba(20,16,28,.96);border:2px solid #e0b040;border-radius:14px;padding:16px 20px;color:#fff;font:14px Arial,sans-serif;width:min(420px,92vw);max-height:86vh;overflow:auto';
      document.body.appendChild(panel);
    }
    const sel = (key, opts) => '<select data-k="' + key + '" style="width:100%;padding:4px;margin:3px 0 9px">' + opts.map(([v, t]) => '<option value="' + v + '"' + (String(CFG[key]) === String(v) ? ' selected' : '') + '>' + t + '</option>').join('') + '</select>';
    const rng = (key, a, b, unit) => '<input type="range" data-k="' + key + '" min="' + a + '" max="' + b + '" value="' + CFG[key] + '" style="width:75%"> <b data-v="' + key + '">' + CFG[key] + unit + '</b><br>';
    panel.innerHTML = '<h3 style="margin:0 0 10px;color:#ffd060">🧤 Ewigkeitshandschuh – einstellen</h3>'
      + '<b>Wirkt auf</b>' + sel('who', [['alle', 'Alle (Monster und Spieler)'], ['monster', 'Nur Monster'], ['spieler', 'Nur Spieler']])
      + '<b style="color:#b040ff">🟣 Kraft – Stärke</b><br>' + rng('kraft', 1, 3, '') + '<br>'
      + '<b style="color:#3080ff">🔵 Raum</b>' + sel('raumArt', [['selbst', 'Mich selbst hinteleportieren'], ['gegner', 'Gegner in Blickrichtung wegschleudern']])
      + '<b style="color:#ff2030">🔴 Realität</b>' + sel('realArt', [['blasen', 'In Seifenblasen auflösen'], ['schaf', 'In harmlose Schafe verwandeln'], ['schrumpf', 'Winzig schrumpfen']]) + 'Dauer: ' + rng('realDauer', 5, 60, ' s')
      + '<br><b style="color:#30ff70">🟢 Zeit anhalten – wie lange</b><br>' + rng('zeit', 2, 60, ' s')
      + '<br><b style="color:#ffe030">🟡 Geist</b>' + sel('geistArt', [['kaempfen', 'Monster kämpfen für mich'], ['ruhig', 'Monster vergessen mich']]) + 'Dauer: ' + rng('geistDauer', 5, 60, ' s')
      + '<small style="opacity:.8">Spieler im Umkreis laufen per Geist dorthin, wo du hinschaust.</small><br><br>'
      + '<button data-close style="width:100%;padding:8px;font-weight:700;background:#e0b040;border:0;border-radius:8px;cursor:pointer">Fertig</button>';
    panel.querySelectorAll('[data-k]').forEach((el) => { el.oninput = () => { const k = el.dataset.k; CFG[k] = el.type === 'range' ? +el.value : el.value; const v = panel.querySelector('[data-v="' + k + '"]'); if (v) v.textContent = el.value + (k === 'kraft' ? '' : ' s'); saveCfg(); }; });
    panel.querySelector('[data-close]').onclick = closePanel;
    panel.style.display = 'block'; L.uiBlock = true; if (L.unlock) L.unlock();
  }
  function closePanel() { if (!panel || panel.style.display === 'none') return; panel.style.display = 'none'; L.uiBlock = false; if (L.state === 'game' && !L.paused && L.lock) L.lock(); }
  addEventListener('keydown', (e) => { if (e.code === 'KeyJ' && !L.chatOpen && L.state === 'game' && L.selType && L.selType() === 'ewigkeitshandschuh') { if (panel && panel.style.display !== 'none') closePanel(); else openPanel(); } else if (e.code === 'Escape' && panel && panel.style.display !== 'none') closePanel(); });
  L.gauntletPanel = openPanel;
  const owf = L.weaponFire;
  L.weaponFire = function (w, d) {
    if (!d || !d.gauntlet) return owf(w, d);
    const S = STONES[G.stone], now = performance.now() / 1000;
    if ((G.cd[S.id] || 0) > now) { L.msg('⏳ ' + S.name + ' lädt noch ' + Math.ceil(G.cd[S.id] - now) + ' s', 900); P.fireCd = 0.3; return true; }
    G.cd[S.id] = now + S.cd; P.fireCd = 0.6; G.anim = 0.8; G.col = S.col;
    const o = L.camera.position, dir = aim(), hp = handPos(), y = P.y || 0;
    switch (S.id) {
      case 'kraft': {
        const h = L.rayHit(o, dir, 250, P.camDist + 0.3), end = o.clone().addScaledVector(dir, h.t);
        beamFx(hp, end, S.col, 0.7, 0.5); L.env.bolt = 0.6; L.shake = Math.max(L.shake, 0.6);
        const kp = [0.5, 1, 1.8][CFG.kraft - 1] || 1;
        if (h.ent && allowed(h.ent)) dmg(h.ent, 900 * kp);
        for (const e of tgts()) if (e !== h.ent && Math.hypot(e.x - end.x, e.z - end.z) < 10 * kp + (e.bigR || 0)) dmg(e, 400 * kp);
        L.fx('#d080ff', end.x, end.y, end.z, 40, 12, { basic: true, size: 0.6, life: 0.8 }); L.snd.explosion && L.snd.explosion({ x: end.x, y: end.y, z: end.z });
        break;
      }
      case 'raum': {
        if (CFG.raumArt === 'gegner') {
          // alle in der Blickrichtung (bis 80 m) weit weg teleportieren
          let n = 0;
          for (const e of tgts()) { if (e.kind === 'thanatos' || e.dead) continue; const ex = e.x - P.x, ez = e.z - P.z, ed = Math.hypot(ex, ez); if (ed > 80 || (ex * dir.x + ez * dir.z) / (ed || 1) < 0.85) continue;
            ringFx(e.x, 1, e.z, S.col, 3, 0.6); const a = Math.random() * 6.28, d = L.rand(250, 400);
            if (isRemote(e)) toPlayer(e, { e: 'tele', x: e.x + Math.sin(a) * d, z: e.z + Math.cos(a) * d }); else if (MK()[e.kind]) { e.x += Math.sin(a) * d; e.z += Math.cos(a) * d; e.prey = null; if (e.frzPos) { e.frzPos.x = e.x; e.frzPos.z = e.z; } }
            n++; }
          L.msg('🔵 Raum-Stein: ' + n + ' weggeschleudert.', 2000); break;
        }
        const h = L.rayHit(o, dir, 300, P.camDist + 0.3), end = o.clone().addScaledVector(dir, Math.max(2, h.t - 1.5));
        ringFx(P.x, y + 1, P.z, S.col, 3, 0.6); P.x = end.x; P.z = end.z; P.y = Math.max(0, end.y - 1); P.vx = P.vz = P.vy = 0; P.air = true; ringFx(P.x, P.y + 1, P.z, S.col, 3, 0.6);
        L.snd.teleport && L.snd.teleport({ x: P.x, y: P.y, z: P.z }); break;
      }
      case 'real': {
        const h = L.rayHit(o, dir, 120, P.camDist + 0.3), end = o.clone().addScaledVector(dir, h.t);
        ringFx(end.x, Math.max(0.3, end.y), end.z, S.col, 15, 0.9);
        let n = 0;
        for (const e of tgts()) {
          if (e.dead || Math.hypot(e.x - end.x, e.z - end.z) > 15 + (e.bigR || 0)) continue; n++;
          if (isRemote(e)) { toPlayer(e, { e: CFG.realArt === 'blasen' ? 'dmg' : 'shrink', d: CFG.realArt === 'blasen' ? 60 : CFG.realDauer }); continue; }
          if (!MK()[e.kind]) { dmg(e, 600); continue; }
          if (CFG.realArt === 'blasen') { dmg(e, 1e9); for (let k = 0; k < 6; k++) L.fx(k % 2 ? '#ff4060' : '#ffd0e0', e.x, 1 + k * 0.4, e.z, 3, 3, { basic: true, size: 0.35, life: 1.4, g: -2 }); }
          else warp(e, CFG.realArt, CFG.realDauer);
        }
        L.msg('🔴 Realität: ' + n + ' ' + ({ blasen: 'zu Seifenblasen', schaf: 'in harmlose Schafe verwandelt', schrumpf: 'geschrumpft' })[CFG.realArt] + '.', 2200);
        break;
      }
      case 'seele': {
        let n = 0; for (const e of tgts()) { if (Math.hypot(e.x - P.x, e.z - P.z) > 25 + (e.bigR || 0)) continue; dmg(e, 150); n++; beamFx(new T.Vector3(e.x, 1.4, e.z), hp, S.col, 0.08, 0.6); }
        P.hp = Math.min(100, P.hp + 30 + n * 10); ringFx(P.x, y + 1, P.z, S.col, 25, 0.8); L.msg('🟠 Seelen-Stein: ' + n + ' Seelen entzogen – du bist geheilt.', 2000); break;
      }
      case 'zeit': {
        const dur = CFG.zeit; let n = 0;
        for (const e of tgts()) { if (e.dead || Math.hypot(e.x - P.x, e.z - P.z) > 60) continue; if (isRemote(e)) { toPlayer(e, { e: 'freeze', d: dur }); n++; } else if (MK()[e.kind]) { e.stunT = Math.max(e.stunT || 0, dur); e.frozenT = dur; e.frzPos = { x: e.x, z: e.z }; frozen.add(e); n++; } }
        for (let k = 0; k < 3; k++) setTimeout(() => ringFx(P.x, y + 1 + k, P.z, S.col, 60, 1.2), k * 200);
        L.msg('🟢 Zeit-Stein: ' + n + ' für ' + dur + ' Sekunden eingefroren.', 2500); break;
      }
      case 'geist': {
        let n = 0; const dur = CFG.geistDauer, h = L.rayHit(o, dir, 200, P.camDist + 0.3), goal = o.clone().addScaledVector(dir, h.t);
        for (const e of tgts()) {
          if (e.dead || Math.hypot(e.x - P.x, e.z - P.z) > 50) continue;
          if (isRemote(e)) { toPlayer(e, { e: 'ctrl', x: goal.x, z: goal.z, d: dur }); n++; continue; }
          if (!MK()[e.kind]) continue; n++;
          if (CFG.geistArt === 'ruhig') { e.prey = null; e.state = 'idle'; e.calmT = dur; }
          else { e.allyT = dur; e.prey = null; e.calmT = dur; mind.add(e); }
        }
        ringFx(P.x, y + 2, P.z, S.col, 50, 1);
        L.msg('🟡 Geist-Stein: ' + n + (CFG.geistArt === 'ruhig' ? ' vergessen dich' : ' kämpfen jetzt für dich') + ' (' + dur + ' s). Spieler laufen dorthin, wo du hinschaust.', 3000); break;
      }
      case 'snap': {
        const all = (L.ents.monsters || []).filter((m) => !m.dead && L.worldOf && L.worldOf(m.x, m.z) === L.worldOf(P.x, P.z));
        const half = all.filter(() => Math.random() < 0.5);
        if (L.backFade) { L.backFade.style.background = '#ffffff'; L.backFade.style.opacity = '0.9'; setTimeout(() => { L.backFade.style.opacity = '0'; }, 250); }
        L.tn && L.tn({ f: 2400, fTo: 1800, dur: 0.08, type: 'square', vol: 0.4 }); L.shake = Math.max(L.shake, 0.8);
        half.forEach((m, k) => setTimeout(() => { if (m.dead) return; for (let j = 0; j < 4; j++) L.fx('#6a5a4a', m.x + L.rand(-0.5, 0.5), 0.5 + j * 0.5, m.z + L.rand(-0.5, 0.5), 3, 2, { size: 0.3, life: 2, g: -1 }); dmg(m, 1e9); }, 600 + k * 40));
        L.banner('✨ SCHNIPP', half.length + ' Monster zerfallen zu Staub.');
        break;
      }
    }
    L.makeNoise(P.x, P.z, 60, P);
    return true;
  };
  const oapa = L.afterPlayerAnim;
  L.afterPlayerAnim = function (r, dt) {
    if (oapa) oapa(r, dt);
    if (r !== P.rig) return;
    const held = L.selType && L.selType() === 'ewigkeitshandschuh';
    const h = hud(); h.style.display = held && L.state === 'game' ? 'flex' : 'none';
    if (held) { [...h.children].forEach((b, k) => { if (b.tagName === 'BUTTON' && k < STONES.length) { const rdy = (G.cd[STONES[k].id] || 0) <= performance.now() / 1000; b.style.borderColor = k === G.stone ? '#fff' : '#333'; b.style.opacity = rdy ? '1' : '0.35'; b.style.transform = k === G.stone ? 'scale(1.2)' : ''; } }); h.lastChild.textContent = STONES[G.stone].name + ' · N = wechseln · J = einstellen'; }
    if (G.anim > 0) {
      G.anim -= dt; const s = Math.sin((0.8 - G.anim) / 0.8 * Math.PI);
      const a = r.arms[0]; a.arm.rotation.x = -1.4 - s * 1.3; a.elbow.rotation.x = 0;
      if (Math.random() < dt * 40) { const p = handPos(); L.fx('#' + new T.Color(G.col).getHexString(), p.x, p.y, p.z, 1, 1.5, { basic: true, size: 0.15, life: 0.4 }); }
    }
    for (let i = fxs.length - 1; i >= 0; i--) { const f = fxs[i]; f.t += dt; const u = f.t / f.dur; if (f.grow) f.m.scale.setScalar(1 + u * f.grow); f.m.material.opacity = 0.9 * (1 - u); if (u >= 1) { L.scene.remove(f.m); f.m.geometry.dispose(); f.m.material.dispose(); fxs.splice(i, 1); } }
  };

  // ---------- jedes Bild ----------
  L.updateTitan = function (dt) {
    updMind(dt); updMe(dt);
    updatePortals(dt);
    const here = L.inTitan(P.x, P.z);
    if (!world && (here || (L.inMoon && L.inMoon(P.x) && Math.hypot(P.x - MOONP().x, P.z) < 200))) build();
    if (world) { world.g.visible = here || !!travel; if (world.g.visible) { const t = performance.now() / 1000; for (const f of world.floats) { f.m.position.y = f.y + Math.sin(t * 0.4 + f.ph) * 3; f.m.rotation.y += dt * 0.05; } } }
    if (!here) { if (B && B.rig) B.rig.root.visible = false; }
    if (here && P.y < -60 && P.alive) { P.x = BACKP.x + 14; P.z = BACKP.z; P.y = 2; P.vy = 0; P.air = true; L.hurtPlayer(25, 'Vom Titanenmond ins All gefallen'); L.msg('🪐 Du bist von der Kante gefallen – zurück zum Portal.', 3500); }
    if (!B && here) { if (respawnT <= 0) spawnBoss(); else respawnT -= dt; }
    if (B) {
      if (here && B.act !== 'tele' && !(B.dead && deadInfo)) B.rig.root.visible = true;
      updateBoss(dt);
      if (B.dead && deadInfo) { L.thanatos = null; B = null; respawnT = 600; }
    }
    if (deadInfo) {
      deadInfo.g.rotation.y += dt; deadInfo.g.position.y = 3 + Math.sin(performance.now() / 400) * 0.5;
      if (P.alive && Math.hypot(P.x - deadInfo.x, P.z - deadInfo.z) < 4) {
        L.scene.remove(deadInfo.g); deadInfo = null;
        const first = !L.hasGauntlet(); L.save.gauntlet = true; L.persist && L.persist();
        L.gauntletStart();
        L.banner('🧤 DER EWIGKEITSHANDSCHUH', (first ? 'Für immer freigeschaltet – mit jedem Skin! ' : '') + 'Nimm ihn in die Hand: Klick = Stein benutzen, N = Stein wechseln.');
        L.snd.codeOk && L.snd.codeOk();
      }
    }
  };
  L.titanBossText = () => (B && B.awake && !B.dead ? '🟣 THANATOS – Phase ' + phase() : !B && respawnT > 0 ? '🟣 Thanatos kehrt in ' + L.fmt(respawnT) + ' zurück' : null);
  L._gaunt = () => deadInfo;
  L.titanTargets = () => (B && !B.dead && L.inTitan(P.x, P.z) && B.rig.root.visible ? [B] : []);
  L.titanWaypoints = () => [[BACKP.x, BACKP.z, '🌕', 'Portal zum Mond'], [ARENA.x, ARENA.z, '🟣', 'Thanatos']];
  L.moonPortalPos = MOONP;
  L.clearTitan = function () {
    if (B) { L.scene.remove(B.rig.root); for (const f of B.fx) L.scene.remove(f.m); } B = null; L.thanatos = null; respawnT = 0;
    if (deadInfo) { L.scene.remove(deadInfo.g); deadInfo = null; }
    travel = null; G.anim = 0;
  };
})();
