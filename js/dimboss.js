'use strict';
// Der Leerenwurm: Boss der Dimension (eigener Entwurf), 50-mal so groß wie früher.
// Allein 250 Leben, zu zweit bis viert 500. Verwundbar ist sein leuchtendes Maul, wenn er auftaucht –
// und besonders, wenn er brüllt. Solange er lebt, ist das Portal nach Hause versiegelt.
(function () {
  const L = window.L, T = THREE, P = L.player;
  const G = () => L.GEO;
  const S = 50, NSEG = 22, RESPAWN = 180, FIRST = 25, R0 = 7 * S;
  const maxHp = () => (L.remotes && [...L.remotes.values()].some((r) => r.inRound) ? 500 : 250);
  function part(geo, color, sx, sy, sz, x, y, z, parent, o) { const m = new T.Mesh(geo, L.mat(color, o)); m.scale.set(sx, sy, sz); m.position.set(x, y, z); if (parent) parent.add(m); return m; }
  const inDim = () => L.inDim(P.x);

  // ---------- Modell (riesig, nicht vom Nebel verschluckt) ----------
  function build() {
    const root = new T.Group(), segs = [];
    const glow = new T.MeshBasicMaterial({ color: 0x40e0ff, fog: false });
    for (let k = 0; k < NSEG; k++) {
      const s = new T.Group(), r = R0 * (1 - k * 0.034);
      part(G().sph, k % 2 ? '#6a3aa0' : '#52288a', r, r, r * 1.15, 0, 0, 0, s, { emissive: '#2a0a50', ei: 0.7 });
      s.add(new T.Mesh(new T.TorusGeometry(r * 0.99, r * 0.065, 6, 28), glow));
      if (k > 0 && k % 2 === 0) for (const sd of [-1, 0, 1]) { const c = part(G().cone, '#c080ff', r * 0.13, r * 0.5, r * 0.13, sd * r * 0.45, r * 0.95, 0, s, { emissive: '#6030c0', ei: 0.8 }); c.rotation.z = -sd * 0.4; }
      root.add(s); segs.push(s);
    }
    const h = segs[0], r = R0;
    const mouth = part(G().cyl, '#ff40d0', r * 0.68, r * 0.07, r * 0.68, 0, 0, r * 1.06, h, { basic: true }); mouth.rotation.x = Math.PI / 2;
    for (let ring = 0; ring < 2; ring++) for (let k = 0; k < 16; k++) { const a = k / 16 * 6.283, rr = r * (0.68 - ring * 0.21), t = part(G().cone, '#f4f0ff', r * 0.065, r * 0.28, r * 0.065, Math.cos(a) * rr, Math.sin(a) * rr, r * (1.13 - ring * 0.1), h); t.rotation.x = Math.PI / 2; t.rotation.z = a; t.rotateX(-0.6); }
    for (const sd of [-1, 1]) for (let k = 0; k < 3; k++) part(G().sph, '#40e0ff', r * 0.085, r * 0.085, r * 0.06, sd * r * 0.71, r * (0.31 - k * 0.2), r * 0.69, h, { basic: true });
    root.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); o.material.fog = false; o.castShadow = false; o.frustumCulled = false; } });
    L.scene.add(root);
    return { root, segs, mouth };
  }

  // ---------- Zustand ----------
  const W = { alive: false, hp: 250, max: 250, t: 0, timer: FIRST, state: 'none', ent: null, trail: [] };
  L.dimWorm = null; L._dimW = W;
  function spawn() {
    W.m = build(); W.max = maxHp(); W.hp = W.max; W.alive = true; W.state = 'circle'; W.st = 0; W.ang = Math.random() * 6.28; W.wasKilled = false;
    W.head = new T.Vector3(L.DIM.x + Math.sin(W.ang) * 2600, -400, L.DIM.z + Math.cos(W.ang) * 2600);
    W.trail = [W.head.clone()];
    W.ent = { kind: 'dwurm', x: W.head.x, z: W.head.z, hp: W.hp, dead: false, sph: [] };
    L.dimWorm = W.ent;
    if (inDim()) {
      L.banner('🪱 DER LEERENWURM', 'Riesig! Er versiegelt das Portal. Schieß auf das leuchtende Maul, wenn er auftaucht!');
      if (L.snd.bossRoar) L.snd.bossRoar({ x: P.x, y: 0, z: P.z });
      L.shake = Math.max(L.shake, 1.4);
      giveCrate();
    } else L.msg('🪱 Der Leerenwurm ist in der Dimension zurück.', 3500);
  }
  function giveCrate() {
    const c = L.dimCheckpoint(), x = c.x + 10, z = c.z - 6;
    [['gewehr', 1, 30], ['gewehrmuni', 4], ['gewehrmuni', 4], ['granate', 5], ['schrotflinte', 1, 6], ['schrot', 3], ['medkit', 1], ['bandage', 3]]
      .forEach((e, k) => L.spawnItem(e[0], x + (k % 4) * 1.4, z + Math.floor(k / 4) * 1.4, e[1], e[2], undefined, undefined, undefined, true));
    L.msg('📦 Beim Checkpoint liegt eine Waffenkiste: Sturmgewehr, Munition, Granaten, Medkit!', 6000);
  }
  function remove() { if (W.m) L.scene.remove(W.m.root); W.m = null; W.ent = null; L.dimWorm = null; }
  L.dimWormHit = function (dmg) {
    if (!W.alive || W.state === 'die') return;
    W.hp = Math.max(0, W.hp - dmg * 0.35); W.ent.hp = W.hp;
    L.fx('#ff60e0', P.x + (W.head.x - P.x) * 0.15, 6, P.z + (W.head.z - P.z) * 0.15, 4, 3, { basic: true, size: 0.4, life: 0.5 });
    if (W.hp <= 0) die();
  };
  function die() {
    W.state = 'die'; W.st = 0; W.ent.dead = true; W.wasKilled = true;
    L.banner('🪱 LEERENWURM BESIEGT!', 'Das Portal ist wieder offen – flieh nach Hause!');
    if (L.snd.bossRoar) L.snd.bossRoar({ x: P.x, y: 5, z: P.z });
    if (L.round) L.round.coins = (L.round.coins || 0) + 50;
    L.msg('🪙 +50 Münzen für den Leerenwurm (nur wenn du entkommst)', 5000);
    if (!inDim()) L.msg('🪱 Der Leerenwurm ist gestorben.', 3500);
  }

  // ---------- Angriffe ----------
  const fx = [], ringGeo = new T.RingGeometry(0.8, 1, 40);
  function tele(x, z, r, dur, color, cb) { const m = new T.Mesh(ringGeo, new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, side: T.DoubleSide, depthWrite: false, fog: false })); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.2, z); m.scale.setScalar(r); L.scene.add(m); fx.push({ k: 'tele', t: 0, dur, m, r, cb }); }
  function hurt(x, z, r, dmg, cause) {
    if (!P.alive || L.cine || !inDim() || (P.spawnProt > 0)) return;
    const d = Math.hypot(P.x - x, P.z - z); if (d > r) return;
    L.hurtPlayer(dmg * (1 - d / r * 0.4) * (L.md ? L.md.dmg : 1), cause);
    if (P.alive && !P.vehicle) { const k = 11; P.vx = (P.x - x) / (d || 1) * k; P.vz = (P.z - z) / (d || 1) * k; P.vy = 6; P.air = true; P.knockT = 0.9; }
  }
  function orb(tx, tz) {
    const from = mouthPos(), m = new T.Mesh(G().sph, new T.MeshBasicMaterial({ color: 0xff40d0, fog: false })); m.scale.setScalar(6); L.scene.add(m);
    tele(tx, tz, 7, 2.2, 0xff40d0, null);
    fx.push({ k: 'orb', t: 0, dur: 2.2, m, sx: from.x, sy: from.y, sz: from.z, tx, tz });
  }
  function updateFx(dt) {
    for (let i = fx.length - 1; i >= 0; i--) {
      const f = fx[i]; f.t += dt; const u = Math.min(1, f.t / f.dur);
      if (f.k === 'tele') { f.m.material.opacity = 0.45 + Math.sin(f.t * 18) * 0.35; f.m.scale.setScalar(f.r * (0.3 + 0.7 * u)); if (u >= 1) { L.scene.remove(f.m); fx.splice(i, 1); if (f.cb) f.cb(); } }
      else if (f.k === 'orb') {
        f.m.position.set(L.lerp(f.sx, f.tx, u), L.lerp(f.sy, 1, u * u), L.lerp(f.sz, f.tz, u));
        if (Math.random() < dt * 30) L.fx('#ff80e0', f.m.position.x, f.m.position.y, f.m.position.z, 2, 2, { basic: true, size: 1, life: 0.6 });
        if (u >= 1) { L.scene.remove(f.m); fx.splice(i, 1); L.fx('#ff40d0', f.tx, 1, f.tz, 30, 12, { basic: true, size: 0.6, life: 0.8 }); L.snd.explosion({ x: f.tx, y: 1, z: f.tz }); hurt(f.tx, f.tz, 7, 25, 'Von der Leerenkugel des Wurms getroffen'); }
      }
    }
  }

  // ---------- Bewegung: Kopf führt, der Körper folgt seiner Spur ----------
  const tmp = new T.Vector3();
  function moveHead(tx, ty, tz, speed, dt) { tmp.set(tx - W.head.x, ty - W.head.y, tz - W.head.z); const d = tmp.length(); if (d > 0.01) W.head.addScaledVector(tmp.normalize(), Math.min(d, speed * dt)); return d; }
  function mouthPos() { const s = W.m.segs[0], v = new T.Vector3(0, 0, R0 * 1.05); s.localToWorld(v); return v; }
  function layout() {
    const tr = W.trail;
    if (tr[0].distanceTo(W.head) > 25) { tr.unshift(W.head.clone()); if (tr.length > 600) tr.pop(); }
    else tr[0].copy(W.head);
    const segs = W.m.segs; let ti = 0, acc = 0;
    for (let k = 0; k < NSEG; k++) {
      const want = k * R0 * 1.55;
      while (ti < tr.length - 1 && acc + tr[ti].distanceTo(tr[ti + 1]) < want) { acc += tr[ti].distanceTo(tr[ti + 1]); ti++; }
      const p = tr[ti]; segs[k].position.copy(p);
      const q = tr[Math.min(tr.length - 1, ti + 1)];
      if (q.distanceToSquared(p) > 1) segs[k].lookAt(p.x * 2 - q.x, p.y * 2 - q.y, p.z * 2 - q.z);
    }
    if (W.lookAt) segs[0].lookAt(W.lookAt.x, W.lookAt.y, W.lookAt.z);
    // Trefferzone: das Maul (nur wenn er aufgetaucht ist)
    const sph = W.ent.sph; sph.length = 0;
    if (W.state === 'spit' || W.state === 'roar' || W.state === 'rise') { const mp = mouthPos(); sph.push([mp.x, mp.y, mp.z, R0 * 0.62, W.state === 'roar' ? 1.6 : W.state === 'spit' ? 1 : 0.5]); }
    W.ent.x = W.head.x; W.ent.z = W.head.z;
  }
  function update(dt) {
    W.t += dt; W.st += dt;
    const D = L.DIM;
    W.m.mouth.material.color.setHex(W.state === 'roar' ? 0xffffff : (W.state === 'spit' || W.state === 'rise') ? 0xff40d0 : 0x6a2060);
    W.lookAt = null;
    if (W.state === 'circle') {
      // zieht riesige Kreise durch die Leere um die Insel
      W.ang += dt * 0.11;
      moveHead(D.x + Math.sin(W.ang) * 2600, 150 + Math.sin(W.t * 0.4) * 650, D.z + Math.cos(W.ang) * 2600, 420, dt);
      if (Math.random() < dt * 0.4) L.shake = Math.max(L.shake, 0.25);
      if (W.st > 9 + Math.random() * 3) { W.state = 'rise'; W.st = 0; const a = Math.atan2(W.head.x - P.x, W.head.z - P.z); W.rx = P.x + Math.sin(a) * 620; W.rz = P.z + Math.cos(a) * 620; L.msg('🪱 Der Leerenwurm taucht auf – schieß auf das leuchtende Maul!', 2500); if (L.snd.screech) L.snd.screech({ x: P.x, y: 10, z: P.z }); }
    } else if (W.state === 'rise') {
      const d = moveHead(W.rx, 300, W.rz, 650, dt);
      W.lookAt = { x: P.x, y: P.y, z: P.z };
      if (d < 20 || W.st > 6) { W.state = 'spit'; W.st = 0; W.spits = 0; }
    } else if (W.state === 'spit') {
      W.lookAt = { x: P.x, y: P.y, z: P.z }; W.head.y = 300 + Math.sin(W.t * 1.5) * 12;
      if (W.st > 1 * (W.spits + 1) && W.spits < 5) { W.spits++; orb(P.x + P.vx * 1.4 + L.rand(-4, 4), P.z + P.vz * 1.4 + L.rand(-4, 4)); }
      if (W.st > 6) { W.state = 'roar'; W.st = 0; L.msg('💫 Er brüllt – das Maul steht weit offen: JETZT feuern!', 2500); if (L.snd.bossRoar) L.snd.bossRoar({ x: P.x, y: 5, z: P.z }); L.shake = 1.5; for (let k = 0; k < 3; k++) { const x = P.x + L.rand(-14, 14), z = P.z + L.rand(-14, 14); tele(x, z, 10, 1.6 + k * 0.4, 0x9a50ff, () => { L.fx('#9a50ff', x, 1, z, 40, 14, { basic: true, size: 0.7, life: 1 }); hurt(x, z, 10, 30, 'Vom Beben des Leerenwurms erwischt'); }); } }
    } else if (W.state === 'roar') {
      W.lookAt = { x: P.x, y: P.y + 40, z: P.z }; W.head.y = 290 + Math.sin(W.st * 9) * 8;
      if (W.st > 4) { W.state = 'retreat'; W.st = 0; }
    } else if (W.state === 'retreat') {
      W.ang = Math.atan2(W.head.x - D.x, W.head.z - D.z);
      moveHead(D.x + Math.sin(W.ang) * 2600, -300, D.z + Math.cos(W.ang) * 2600, 520, dt);
      if (W.st > 5) { W.state = 'circle'; W.st = 0; }
    } else if (W.state === 'die') {
      const u = W.st;
      if (u < 4) { W.lookAt = { x: W.head.x, y: W.head.y + 2000, z: W.head.z + 200 }; W.head.y += Math.sin(u * 5) * 6; if (Math.random() < dt * 20) L.fx(Math.random() < 0.5 ? '#ff40d0' : '#40e0ff', P.x + L.rand(-60, 60), L.rand(10, 80), P.z + L.rand(-60, 60), 6, 10, { basic: true, size: 1.2, life: 1.2 }); L.shake = Math.max(L.shake, 0.7); }
      else W.head.y -= dt * (250 + (u - 4) * 200);
      if (u > 4 && !W.loot) { W.loot = true; for (let k = 0; k < 6; k++) L.spawnItem(k < 3 ? 'artefakt' : 'gold', P.x + L.rand(-10, 10), P.z + L.rand(-10, 10), 1, undefined, undefined, undefined, undefined, true); }
      if (u > 11) { W.alive = false; W.loot = false; remove(); W.timer = RESPAWN; return; }
    }
    layout();
  }

  // ---------- jedes Bild ----------
  let lastIn = false;
  L.updateDimBoss = function (dt) {
    if (L.state !== 'game') return;
    updateFx(dt);
    const here = inDim();
    if (W.m) W.m.root.visible = here;
    if (!W.alive) { if (here) W.seen = true; if (W.seen) { W.timer -= dt; if (W.timer <= 0 && !L.cine) spawn(); } }
    else if (here && !L.cine) update(dt);
    else if (!here && W.state === 'die') { W.st += dt; if (W.st > 11) { W.alive = false; W.loot = false; remove(); W.timer = RESPAWN; } }
    if (here !== lastIn) { lastIn = here; if (here && W.alive && W.state !== 'die') L.msg('🪱 Der Leerenwurm lauert hier – das Portal ist versiegelt!', 5000); }
    updateBar(here);
    if (L.dimPortal && L.dimPortal.disc) L.dimPortal.disc.material.color.setHex(L.dimPortalSealed() ? 0xff2040 : 0x40e0ff);
  };
  L.dimPortalSealed = () => W.alive && W.state !== 'die';
  const bar = document.createElement('div'); bar.id = 'wormBar'; bar.hidden = true;
  bar.style.cssText = 'position:fixed;left:50%;top:52px;transform:translateX(-50%);width:min(420px,80vw);z-index:7;text-align:center;color:#fff;font-weight:800;text-shadow:0 0 4px #000;pointer-events:none';
  bar.innerHTML = '<div>🪱 LEERENWURM <span></span></div><div style="height:12px;background:#0009;border:2px solid #ff40d0;border-radius:6px;overflow:hidden"><i style="display:block;height:100%;background:linear-gradient(90deg,#ff40d0,#9a50ff)"></i></div>';
  document.body.appendChild(bar);
  function updateBar(here) {
    bar.hidden = !(here && W.alive && W.state !== 'die');
    if (!bar.hidden) { bar.querySelector('span').textContent = Math.ceil(W.hp) + ' / ' + W.max; bar.querySelector('i').style.width = (W.hp / W.max * 100).toFixed(1) + '%'; }
  }
  L.dimBossText = () => (W.alive && W.state !== 'die' ? '🪱 Leerenwurm: Portal versiegelt' : W.seen ? '🪱 Leerenwurm kommt ' + (W.wasKilled ? 'wieder ' : '') + 'in ' + L.fmt(Math.max(0, W.timer)) : '');
  L.clearDimBoss = function () { remove(); for (const f of fx) L.scene.remove(f.m); fx.length = 0; W.alive = false; W.seen = false; W.timer = FIRST; W.loot = false; bar.hidden = true; lastIn = false; };
})();
