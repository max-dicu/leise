'use strict';
// Der Leerenwurm: Boss der Dimension (eigener Entwurf). 1000 Leben, mit Waffen besiegbar:
// Der Panzer hält fast alles ab – verwundbar ist das leuchtende Maul, wenn er auftaucht, und vor allem der Kopf,
// wenn er nach einem Sturzangriff kurz benommen am Boden liegt. Solange er lebt, ist das Portal nach Hause versiegelt.
(function () {
  const L = window.L, T = THREE, P = L.player;
  const G = () => L.GEO;
  const MAXHP = 1000, RESPAWN = 180, FIRST = 25, NSEG = 22;
  function part(geo, color, sx, sy, sz, x, y, z, parent, o) { const m = new T.Mesh(geo, L.mat(color, o)); m.scale.set(sx, sy, sz); m.position.set(x, y, z); m.castShadow = !(o && o.noShadow); if (parent) parent.add(m); return m; }
  const inDim = () => L.inDim(P.x);

  // ---------- Modell ----------
  function build() {
    const root = new T.Group(), segs = [];
    const glow = new T.MeshBasicMaterial({ color: 0x40e0ff, fog: false });
    for (let k = 0; k < NSEG; k++) {
      const s = new T.Group(), r = 7 - k * 0.24;
      part(G().sph, k % 2 ? '#6a3aa0' : '#52288a', r, r, r * 1.15, 0, 0, 0, s, { emissive: '#2a0a50', ei: 0.6 });
      const ring = new T.Mesh(new T.TorusGeometry(r * 0.99, 0.45, 6, 24), glow); s.add(ring);
      if (k > 0 && k % 2 === 0) for (const sd of [-1, 0, 1]) { const c = part(G().cone, '#c080ff', 0.9, 3.6, 0.9, sd * r * 0.45, r * 0.95, 0, s, { emissive: '#6030c0', ei: 0.8 }); c.rotation.z = -sd * 0.4; }
      root.add(s); segs.push(s);
    }
    // Kopf: rundes Maul mit Zahnringen, leuchtende Augen
    const h = segs[0];
    const mouth = part(G().cyl, '#ff40d0', 4.8, 0.5, 4.8, 0, 0, 7.4, h, { basic: true, noShadow: true }); mouth.rotation.x = Math.PI / 2;
    for (let ring = 0; ring < 2; ring++) for (let k = 0; k < 16; k++) { const a = k / 16 * 6.283, rr = 4.8 - ring * 1.5, t = part(G().cone, '#f4f0ff', 0.45, 2, 0.45, Math.cos(a) * rr, Math.sin(a) * rr, 7.9 - ring * 0.7, h, { noShadow: true }); t.rotation.x = Math.PI / 2; t.rotation.z = a; t.rotateX(-0.6); }
    for (const sd of [-1, 1]) for (let k = 0; k < 3; k++) part(G().sph, '#40e0ff', 0.6, 0.6, 0.4, sd * 5, 2.2 - k * 1.4, 4.8, h, { basic: true, noShadow: true });
    L.scene.add(root);
    return { root, segs, mouth };
  }

  // ---------- Zustand ----------
  const W = { alive: false, hp: MAXHP, t: 0, timer: FIRST, state: 'none', ent: null, trail: [] };
  L.dimWorm = null;
  L._dimW = W; // für Tests
  function spawn() {
    const m = build();
    const ang = Math.random() * 6.28;
    W.alive = true; W.hp = MAXHP; W.m = m; W.state = 'swim'; W.st = 0; W.ang = ang; W.rad = 140; W.cd = 0;
    W.head = new T.Vector3(L.DIM.x + Math.sin(ang) * 140, -40, L.DIM.z + Math.cos(ang) * 140);
    W.trail = []; for (let k = 0; k < NSEG * 6; k++) W.trail.push(W.head.clone());
    W.ent = { kind: 'dwurm', x: W.head.x, z: W.head.z, hp: MAXHP, dead: false, sph: [] };
    L.dimWorm = W.ent;
    if (inDim()) {
      L.banner('🪱 DER LEERENWURM', 'Er versiegelt das Portal! Schieß auf das leuchtende Maul – und auf den Kopf, wenn er benommen am Boden liegt.');
      if (L.snd.bossRoar) L.snd.bossRoar({ x: W.head.x, y: 0, z: W.head.z });
      L.shake = Math.max(L.shake, 1.2);
      giveCrate();
    } else L.msg('🪱 Der Leerenwurm ist in der Dimension zurück.', 3500);
  }
  // Waffenkiste beim Checkpoint, damit man nie ganz ohne Waffen dasteht
  function giveCrate() {
    const c = L.dimCheckpoint(), x = c.x + 10, z = c.z - 6;
    const list = [['gewehr', 1, 30], ['gewehrmuni', 4], ['gewehrmuni', 4], ['granate', 5], ['schrotflinte', 1, 6], ['schrot', 3], ['medkit', 1], ['bandage', 3]];
    list.forEach((e, k) => L.spawnItem(e[0], x + (k % 4) * 1.4, z + Math.floor(k / 4) * 1.4, e[1], e[2], undefined, undefined, undefined, true));
    L.msg('📦 Beim Checkpoint liegt eine Waffenkiste: Sturmgewehr, Munition, Granaten, Medkit!', 6000);
  }
  function remove() { if (W.m) L.scene.remove(W.m.root); W.m = null; W.ent = null; L.dimWorm = null; }

  // Treffer (von Schüssen und Explosionen über damageEnt)
  L.dimWormHit = function (dmg, src) {
    if (!W.alive || W.state === 'die') return;
    const d = dmg * 0.35;
    W.hp = Math.max(0, W.hp - d); W.ent.hp = W.hp;
    L.fx('#ff60e0', W.head.x, W.head.y, W.head.z, 4, 3, { basic: true, size: 0.25, life: 0.5 });
    if (W.hp <= 0) die();
  };
  function die() {
    W.state = 'die'; W.st = 0; W.ent.dead = true; W.wasKilled = true;
    L.banner('🪱 LEERENWURM BESIEGT!', 'Das Portal ist wieder offen – flieh nach Hause!');
    if (L.snd.bossRoar) L.snd.bossRoar({ x: W.head.x, y: 5, z: W.head.z });
    if (L.round) L.round.coins = (L.round.coins || 0) + 50;
    if (!inDim()) L.msg('🪱 Der Leerenwurm ist gestorben.', 3500);
    L.msg('🪙 +50 Münzen für den Leerenwurm (nur wenn du entkommst)', 5000);
  }

  // ---------- Effekte ----------
  const fx = [];
  const ringGeo = new T.RingGeometry(0.8, 1, 40);
  function tele(x, z, r, dur, color, cb) { const m = new T.Mesh(ringGeo, new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, side: T.DoubleSide, depthWrite: false, fog: false })); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.2, z); m.scale.setScalar(r); L.scene.add(m); fx.push({ k: 'tele', t: 0, dur, m, r, cb }); }
  function orb(from, tx, tz) {
    const m = new T.Mesh(G().sph, new T.MeshBasicMaterial({ color: 0xff40d0, fog: false })); m.scale.setScalar(1.6); L.scene.add(m);
    tele(tx, tz, 5, 1.5, 0xff40d0, null);
    fx.push({ k: 'orb', t: 0, dur: 1.5, m, sx: from.x, sy: from.y, sz: from.z, tx, tz });
  }
  function hurt(x, z, r, dmg, cause) {
    if (!P.alive || L.cine || !inDim() || (P.spawnProt > 0)) return;
    const d = Math.hypot(P.x - x, P.z - z); if (d > r) return;
    L.hurtPlayer(dmg * (1 - d / r * 0.4) * (L.md ? L.md.dmg : 1), cause);
    if (P.alive && !P.vehicle) { const k = 11; P.vx = (P.x - x) / (d || 1) * k; P.vz = (P.z - z) / (d || 1) * k; P.vy = 6; P.air = true; P.knockT = 0.9; }
  }
  function updateFx(dt) {
    for (let i = fx.length - 1; i >= 0; i--) {
      const f = fx[i]; f.t += dt; const u = Math.min(1, f.t / f.dur);
      if (f.k === 'tele') { f.m.material.opacity = 0.45 + Math.sin(f.t * 18) * 0.35; f.m.scale.setScalar(f.r * (0.3 + 0.7 * u)); if (u >= 1) { L.scene.remove(f.m); fx.splice(i, 1); if (f.cb) f.cb(); } }
      else if (f.k === 'orb') {
        f.m.position.set(L.lerp(f.sx, f.tx, u), L.lerp(f.sy, 0.8, u) + Math.sin(u * Math.PI) * 12, L.lerp(f.sz, f.tz, u));
        if (Math.random() < dt * 30) L.fx('#ff80e0', f.m.position.x, f.m.position.y, f.m.position.z, 1, 0.5, { basic: true, size: 0.4, life: 0.6 });
        if (u >= 1) { L.scene.remove(f.m); fx.splice(i, 1); L.fx('#ff40d0', f.tx, 1, f.tz, 26, 9, { basic: true, size: 0.5, life: 0.8 }); L.snd.explosion({ x: f.tx, y: 1, z: f.tz }); hurt(f.tx, f.tz, 5, 25, 'Von der Leerenkugel des Wurms getroffen'); }
      }
    }
  }

  // ---------- Bewegung: der Kopf führt, der Körper folgt seiner Spur ----------
  const tmp = new T.Vector3();
  function moveHead(tx, ty, tz, speed, dt) {
    tmp.set(tx - W.head.x, ty - W.head.y, tz - W.head.z); const d = tmp.length();
    if (d > 0.01) W.head.addScaledVector(tmp.normalize(), Math.min(d, speed * dt));
    return d;
  }
  function layout(dt) {
    const tr = W.trail; tr.unshift(W.head.clone()); while (tr.length > NSEG * 6 + 2) tr.pop();
    const segs = W.m.segs;
    for (let k = 0; k < NSEG; k++) {
      const p = tr[Math.min(tr.length - 1, k * 6)], q = tr[Math.min(tr.length - 1, k * 6 + 3)];
      segs[k].position.copy(p);
      if (q.distanceToSquared(p) > 0.0001) segs[k].lookAt(p.x * 2 - q.x, p.y * 2 - q.y, p.z * 2 - q.z);
    }
    if (W.lookAt) segs[0].lookAt(W.lookAt.x, W.lookAt.y, W.lookAt.z);
    // Trefferzonen: Maul (verwundbar), Kopf am Boden (sehr verwundbar), Körper (Panzer)
    const sph = W.ent.sph; sph.length = 0;
    const h = W.head, open = W.state === 'rise' || W.state === 'spit', stun = W.state === 'stun';
    if (h.y > -6) sph.push([h.x, h.y, h.z, 7, stun ? 1.6 : open ? 1 : 0.2]);
    for (let k = 2; k < NSEG; k += 3) { const p = segs[k].position; if (p.y > -4) sph.push([p.x, p.y, p.z, 4.5 - k * 0.12, 0.12]); }
    W.ent.x = h.x; W.ent.z = h.z;
  }

  // ---------- Kampf ----------
  function update(dt) {
    W.t += dt; W.st += dt;
    const D = L.DIM, toP = Math.atan2(P.x - D.x, P.z - D.z);
    W.m.mouth.material.color.setHex(W.state === 'stun' ? 0xffffff : (W.state === 'rise' || W.state === 'spit') ? 0xff40d0 : 0x6a2060);
    W.lookAt = null;
    if (W.state === 'swim') {
      // kreist in der Leere unter der Insel, taucht mit dem Rücken auf
      W.ang += dt * 0.35; W.rad = L.lerp(W.rad, 90, dt * 0.3);
      const cx = P.x + Math.sin(W.ang) * W.rad, cz = P.z + Math.cos(W.ang) * W.rad;
      moveHead(cx, -10 + Math.sin(W.t * 1.3) * 9, cz, 34, dt);
      if (Math.random() < dt * 0.6 && L.snd.ruferStep) L.snd.ruferStep({ x: W.head.x, y: 0, z: W.head.z });
      if (W.st > 6 + Math.random() * 3) { W.state = 'rise'; W.st = 0; const a = Math.atan2(W.head.x - P.x, W.head.z - P.z); W.rx = P.x + Math.sin(a) * 38; W.rz = P.z + Math.cos(a) * 38; L.msg('🪱 Der Leerenwurm taucht auf – ziel auf das leuchtende Maul!', 2200); if (L.snd.screech) L.snd.screech({ x: W.rx, y: 10, z: W.rz }); L.shake = Math.max(L.shake, 0.8); }
    } else if (W.state === 'rise') {
      moveHead(W.rx, 30, W.rz, 40, dt);
      W.lookAt = { x: P.x, y: P.y + 1, z: P.z };
      if (W.st > 1.2) { W.state = 'spit'; W.st = 0; W.spits = 0; }
    } else if (W.state === 'spit') {
      W.lookAt = { x: P.x, y: P.y + 1, z: P.z };
      W.head.y = 30 + Math.sin(W.t * 2) * 1.5;
      if (W.st > 0.9 * (W.spits + 1) && W.spits < 3) { W.spits++; orb(W.head, P.x + P.vx * 1.2 + L.rand(-3, 3), P.z + P.vz * 1.2 + L.rand(-3, 3)); }
      if (W.st > 3.6) { W.state = 'aim'; W.st = 0; W.lx = P.x; W.lz = P.z; tele(W.lx, W.lz, 9, 1.4, 0xff2040, null); L.msg('⚠️ Er stürzt sich auf dich – AUSWEICHEN!', 1400); }
    } else if (W.state === 'aim') {
      W.lookAt = { x: W.lx, y: 0, z: W.lz };
      W.head.y += dt * 6;
      if (W.st > 1.4) { W.state = 'lunge'; W.st = 0; }
    } else if (W.state === 'lunge') {
      const d = moveHead(W.lx, 2, W.lz, 70, dt);
      if (d < 2) { W.state = 'stun'; W.st = 0; L.shake = 1.6; L.snd.stomp && L.snd.stomp({ x: W.lx, y: 0, z: W.lz }); L.fx('#9a50ff', W.lx, 1, W.lz, 50, 14, { basic: true, size: 0.6, life: 1.2 }); L.decal(W.lx, W.lz, 6, '#1a0a2a'); hurt(W.lx, W.lz, 9, 45, 'Vom Leerenwurm zerschmettert'); L.msg('💫 Der Wurm ist benommen – JETZT auf den Kopf schießen!', 2500); }
    } else if (W.state === 'stun') {
      W.head.y = 2.2 + Math.sin(W.st * 8) * 0.3;
      if (W.st > 3.2) { W.state = 'dive'; W.st = 0; const a = Math.atan2(W.head.x - D.x, W.head.z - D.z); W.dx = D.x + Math.sin(a) * 620; W.dz = D.z + Math.cos(a) * 620; }
    } else if (W.state === 'dive') {
      moveHead(W.dx, -60, W.dz, 50, dt);
      if (W.st > 3) { W.state = 'swim'; W.st = 0; W.ang = Math.atan2(W.head.x - P.x, W.head.z - P.z); W.rad = 160; }
    } else if (W.state === 'die') {
      // Todeskampf: windet sich, leuchtet, dann versinkt er im Boden
      const u = W.st;
      if (u < 3.5) { W.head.x += Math.sin(u * 9) * dt * 12; W.head.z += Math.cos(u * 7) * dt * 12; W.head.y = 20 + Math.sin(u * 6) * 8; W.lookAt = { x: W.head.x, y: 80, z: W.head.z + 5 }; if (Math.random() < dt * 20) L.fx(Math.random() < 0.5 ? '#ff40d0' : '#40e0ff', W.head.x + L.rand(-6, 6), W.head.y + L.rand(-6, 6), W.head.z + L.rand(-6, 6), 6, 8, { basic: true, size: 0.5, life: 1 }); L.shake = Math.max(L.shake, 0.6); }
      else { W.head.y -= dt * (8 + (u - 3.5) * 6); if (Math.random() < dt * 25) L.fx('#2a1a3a', W.head.x + L.rand(-5, 5), 1, W.head.z + L.rand(-5, 5), 3, 5, { size: 0.8, life: 1.5 }); }
      if (u > 3.5 && !W.loot) { W.loot = true; const lx = L.clamp(W.head.x, D.x - 400, D.x + 400), lz = L.clamp(W.head.z, D.z - 400, D.z + 400); for (let k = 0; k < 6; k++) L.spawnItem(k < 3 ? 'artefakt' : 'gold', lx + L.rand(-8, 8), lz + L.rand(-8, 8), 1, undefined, undefined, undefined, undefined, true); }
      if (u > 9) { W.alive = false; W.loot = false; remove(); W.timer = RESPAWN; return; }
    }
    // Schaden, wenn der Körper dich streift
    if (W.state !== 'die' && P.alive && inDim()) for (let k = 0; k < NSEG; k += 2) { const p = W.m.segs[k].position; if (p.y > -2 && Math.hypot(P.x - p.x, P.z - p.z) < 4.5 && Math.abs(P.y + 1 - p.y) < 5) { W.touchCd = (W.touchCd || 0) - dt; if (W.touchCd <= 0) { W.touchCd = 1.2; hurt(p.x, p.z, 6, 20, 'Vom Leerenwurm gestreift'); } break; } }
    layout(dt);
  }

  // ---------- jedes Bild ----------
  let lastIn = false;
  L.updateDimBoss = function (dt) {
    if (L.state !== 'game') return;
    updateFx(dt);
    const here = inDim();
    if (W.m) W.m.root.visible = here;
    if (!W.alive) {
      // Timer läuft immer – erstes Erscheinen erst, wenn man die Dimension betreten hat
      if (here) W.seen = true;
      if (W.seen) { W.timer -= dt; if (W.timer <= 0 && !L.cine) spawn(); }
    } else if (here && !L.cine) update(dt);
    else if (!here && W.state === 'die') { W.st += dt; if (W.st > 9) { W.alive = false; W.loot = false; remove(); W.timer = RESPAWN; } }
    else if (here) layout(0);
    if (here !== lastIn) { lastIn = here; if (here && W.alive && W.state !== 'die') L.msg('🪱 Der Leerenwurm lauert hier – das Portal ist versiegelt!', 5000); }
    updateBar(here);
    // Portal nach Hause: rot und versiegelt, solange der Wurm lebt
    if (L.dimPortal && L.dimPortal.disc) L.dimPortal.disc.material.color.setHex(L.dimPortalSealed() ? 0xff2040 : 0x40e0ff);
  };
  L.dimPortalSealed = () => W.alive && W.state !== 'die';
  // Lebensbalken nur in der Dimension
  const bar = document.createElement('div'); bar.id = 'wormBar'; bar.hidden = true;
  bar.style.cssText = 'position:fixed;left:50%;top:52px;transform:translateX(-50%);width:min(420px,80vw);z-index:7;text-align:center;color:#fff;font-weight:800;text-shadow:0 0 4px #000;pointer-events:none';
  bar.innerHTML = '<div>🪱 LEERENWURM <span></span></div><div style="height:12px;background:#0009;border:2px solid #ff40d0;border-radius:6px;overflow:hidden"><i style="display:block;height:100%;background:linear-gradient(90deg,#ff40d0,#9a50ff)"></i></div>';
  document.body.appendChild(bar);
  function updateBar(here) {
    bar.hidden = !(here && W.alive && W.state !== 'die');
    if (!bar.hidden) { bar.querySelector('span').textContent = Math.ceil(W.hp) + ' / ' + MAXHP; bar.querySelector('i').style.width = (W.hp / MAXHP * 100).toFixed(1) + '%'; }
  }
  L.dimBossText = () => (W.alive && W.state !== 'die' ? '🪱 Leerenwurm: Portal versiegelt' : W.seen ? '🪱 Leerenwurm kommt ' + (W.wasKilled ? 'wieder ' : '') + 'in ' + L.fmt(Math.max(0, W.timer)) : '');
  L.clearDimBoss = function () { remove(); for (const f of fx) L.scene.remove(f.m); fx.length = 0; W.alive = false; W.seen = false; W.timer = FIRST; W.loot = false; bar.hidden = true; lastIn = false; };
})();
