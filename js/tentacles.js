'use strict';
// Fliegende Tentakel-Stelzer (zweite Version der riesigen Kampfmaschinen): Kuppel mit rotem Auge und 16 Tentakeln,
// schweben über der Heimatinsel und über dem Meer, hupen wie die Stelzer, packen mit den Tentakeln zu und schießen Hitzestrahlen.
(function () {
  const L = window.L, T = THREE, P = L.player;
  const G = () => L.GEO;
  const list = [];
  L.tentacleEnts = list;
  function part(geo, color, sx, sy, sz, x, y, z, parent, o) { const m = new T.Mesh(geo, L.mat(color, o)); m.scale.set(sx, sy, sz); m.position.set(x, y, z); if (parent) parent.add(m); return m; }
  function build() {
    const root = new T.Group(), hull = new T.Group(); root.add(hull);
    part(G().sph, '#3a3a44', 9, 4.5, 9, 0, 0, 0, hull, { metal: 0.8, rough: 0.35 });
    part(G().sph, '#2a2a30', 7.5, 3, 7.5, 0, 2.6, 0, hull, { metal: 0.8, rough: 0.3 });
    part(G().cyl, '#ff3010', 9.2, 0.6, 9.2, 0, -1.2, 0, hull, { basic: true });
    const eye = part(G().sph, '#ff2010', 1.6, 1.6, 1.2, 0, 0.2, 8.4, hull, { basic: true });
    for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283; part(G().sph, '#ffb020', 0.5, 0.5, 0.5, Math.sin(a) * 8.6, -0.6, Math.cos(a) * 8.6, hull, { basic: true }); }
    const tents = [];
    for (let k = 0; k < 16; k++) {
      const a = k / 16 * 6.283, segs = [];
      for (let j = 0; j < 11; j++) { const r = 0.9 - j * 0.07; const m = part(G().sph, j % 2 ? '#4a4a54' : '#3a3a44', r, 1.4, r, 0, 0, 0, root, { metal: 0.6, rough: 0.4 }); segs.push(m); }
      const tip = part(G().sph, '#ff4020', 0.35, 0.35, 0.35, 0, 0, 0, root, { basic: true }); segs.push(tip);
      tents.push({ a, segs, ph: Math.random() * 6 });
    }
    root.traverse((o) => { if (o.isMesh) o.castShadow = false; });
    L.scene.add(root);
    return { root, hull, eye, tents };
  }
  function spawn(x, z, sea) {
    const r = build(), e = { kind: 'tentakel', rig: r, x, z, y: 38, yaw: Math.random() * 6.28, hp: 2600, dead: false, deadT: 0, sea, tx: x, tz: z, cd: 3, hornT: L.rand(8, 30), grab: 0, sph: [], ph: Math.random() * 6 };
    list.push(e); return e;
  }
  let built = false;
  function populate() {
    built = true;
    for (let k = 0, n = 0; k < 400 && n < 5; k++) { const x = L.rand(-1200, 1200), z = L.rand(-1200, 1200); if (L.inTower(x, z, 80)) continue; spawn(x, z, false); n++; }
    for (let k = 0; k < 4; k++) { const a = k / 4 * 6.283 + 0.4, d = 1750 + Math.random() * 300; spawn(Math.sin(a) * d, Math.cos(a) * d, true); }
  }
  // Treffer durch Waffen
  L.tentHit = function (e, dmg) {
    if (e.dead) return; e.hp -= dmg;
    L.fx('#ffb040', e.x, e.y, e.z, 6, 5, { basic: true, size: 0.4, life: 0.5 });
    if (e.hp <= 0) { e.dead = true; e.deadT = 0; L.explode(e.x, e.y, e.z, 14, 0, null, true); L.msg('💥 Ein Tentakel-Stelzer stürzt ab!', 3000); for (let i = 0; i < 2; i++) L.spawnItem('artefakt', e.x + L.rand(-8, 8), e.z + L.rand(-8, 8), 1); }
  };
  const beams = [];
  function ray(e, tx, ty, tz) {
    const from = new T.Vector3(); e.rig.eye.getWorldPosition(from);
    const to = new T.Vector3(tx, ty, tz), len = from.distanceTo(to);
    const m = new T.Mesh(new T.CylinderGeometry(0.35, 0.35, len, 8, 1, true), new T.MeshBasicMaterial({ color: 0xff6020, transparent: true, opacity: 0.85, blending: T.AdditiveBlending, depthWrite: false, fog: false }));
    m.position.copy(from).lerp(to, 0.5); m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), to.clone().sub(from).normalize()); L.scene.add(m); beams.push({ m, t: 0 });
    L.snd.ray && L.snd.ray({ x: e.x, y: e.y, z: e.z });
    L.fx('#ff8030', tx, ty, tz, 20, 8, { basic: true, size: 0.4, life: 0.6 }); L.decal(tx, tz, 2.4, '#1a0a05');
  }
  const loud = () => (P.stance === 'stand' || !!P.vehicle) && !L.underwaterDive;
  L.updateTentacles = function (dt) {
    if (L.state !== 'game') return;
    if (!built) populate();
    for (let i = beams.length - 1; i >= 0; i--) { const b = beams[i]; b.t += dt; b.m.material.opacity = 0.85 * (1 - b.t / 0.35); if (b.t > 0.35) { L.scene.remove(b.m); beams.splice(i, 1); } }
    const home = !L.inDim(P.x) && !(L.onIsl && L.onIsl(P.x, P.z));
    for (const e of list) {
      const r = e.rig, d = Math.hypot(P.x - e.x, P.z - e.z), vis = d < 900 && home;
      r.root.visible = vis;
      e.ph += dt;
      if (e.dead) { e.deadT += dt; e.y = Math.max(-4, e.y - dt * 14); r.root.position.set(e.x, e.y, e.z); r.hull.rotation.z = Math.min(1.2, e.deadT * 0.6); if (e.deadT > 30) { e.dead = false; e.hp = 2600; e.y = 38; e.deadT = 0; r.hull.rotation.z = 0; } layoutTents(e); continue; }
      if (!vis && d > 1600) continue;
      // jagen: wer laut ist (nicht schleicht), wird bemerkt
      const canHunt = P.alive && !P.gone && home && !L.cine && !(P.spawnProt > 0) && !(L.safeIn && L.safeIn(P.x, P.z));
      const hunting = canHunt && ((loud() && d < 260) || d < 6);
      if (hunting) { e.tx = P.x; e.tz = P.z; }
      else { if (Math.hypot(e.tx - e.x, e.tz - e.z) < 30) { if (e.sea) { const a = Math.random() * 6.28, dd = 1650 + Math.random() * 450; e.tx = Math.sin(a) * dd; e.tz = Math.cos(a) * dd; } else { e.tx = L.rand(-1300, 1300); e.tz = L.rand(-1300, 1300); } } }
      const want = Math.atan2(e.tx - e.x, e.tz - e.z), dd = Math.hypot(e.tx - e.x, e.tz - e.z), sp = hunting ? 16 : 7;
      e.yaw += L.angDiff(e.yaw, want) * Math.min(1, dt * 1.2);
      if (dd > (hunting ? 6 : 2)) { e.x += Math.sin(want) * sp * dt; e.z += Math.cos(want) * sp * dt; }
      const ground = Math.max(0, L.mountainH ? L.mountainH(e.x, e.z) : 0), wantY = ground + (hunting && d < 40 ? 22 : 34) + Math.sin(e.ph * 0.8) * 3;
      e.y += (wantY - e.y) * Math.min(1, dt * 1.2);
      r.root.position.set(e.x, e.y, e.z); r.hull.rotation.set(Math.sin(e.ph * 0.7) * 0.05, e.yaw, Math.sin(e.ph * 0.5) * 0.05);
      // Hupe und Strahl-Geräusche
      e.hornT -= dt; if (e.hornT <= 0 && d < 700) { e.hornT = L.rand(25, 60); L.snd.horn && L.snd.horn({ x: e.x, y: e.y, z: e.z }); }
      // Angriffe
      e.cd -= dt;
      if (hunting && e.cd <= 0) {
        if (d < 20) {
          e.cd = 4; e.grab = 1; L.snd.charge && L.snd.charge({ x: e.x, y: e.y, z: e.z }); L.msg('🐙 Tentakel greifen nach dir – weg hier!', 1500);
          e.act = { t: 0.9, kind: 'grab' };
        } else if (d < 160) {
          e.cd = 3.5; const tx = P.x + P.vx * 0.4, tz = P.z + P.vz * 0.4;
          e.act = { t: 0.6, kind: 'ray', tx, tz };
        }
      }
      // verzögerte Angriffe ausführen
      if (e.act) { e.act.t -= dt; if (e.act.t <= 0) { const a = e.act; e.act = null; const safe = L.safeIn && L.safeIn(P.x, P.z);
        if (a.kind === 'grab' && P.alive && Math.hypot(P.x - e.x, P.z - e.z) < 22 && !safe) { L.hurtPlayer(32 * (L.md ? L.md.dmg : 1), 'Von den Tentakeln eines Stelzers gepackt'); if (P.alive && !P.vehicle) { P.vy = 13; P.vx = (P.x - e.x) * 0.4; P.vz = (P.z - e.z) * 0.4; P.air = true; P.tumble = 0.01; P.knockT = 1.2; } else if (P.vehicle) P.vehicle.speed *= 0.3; L.shake = Math.max(L.shake, 0.8); }
        if (a.kind === 'ray') { ray(e, a.tx, Math.max(0.5, P.y + 1), a.tz); if (P.alive && Math.hypot(P.x - a.tx, P.z - a.tz) < 4 && !safe) L.hurtPlayer(26 * (L.md ? L.md.dmg : 1), 'Vom Hitzestrahl eines Tentakel-Stelzers getroffen'); } } }
      e.grab = Math.max(0, e.grab - dt * 0.8);
      layoutTents(e);
      // Trefferzonen für Waffen
      e.sph.length = 0; e.sph.push([e.x, e.y, e.z, 9, 1], [e.x + Math.sin(e.yaw) * 8.4, e.y + 0.2, e.z + Math.cos(e.yaw) * 8.4, 1.8, 2.5]);
    }
  };
  // Tentakel hängen herab, schlängeln sich und greifen beim Angriff nach unten/vorne
  function layoutTents(e) {
    const t = performance.now() / 1000, r = e.rig;
    for (const tn of r.tents) {
      let x = Math.sin(tn.a + e.yaw) * 7, y = -1.5, z = Math.cos(tn.a + e.yaw) * 7; // relativ zum Körper
      for (let j = 0; j < tn.segs.length; j++) {
        const w = Math.sin(t * 1.8 + tn.ph + j * 0.5) * (0.6 + j * 0.08), reach = e.grab * (j * 0.9);
        x += Math.sin(tn.a + e.yaw) * (0.5 + reach * 0.3) + Math.cos(tn.a) * w * 0.4; z += Math.cos(tn.a + e.yaw) * (0.5 + reach * 0.3) - Math.sin(tn.a) * w * 0.4; y -= 2.1 - e.grab * 0.8;
        tn.segs[j].position.set(x, y, z);
      }
    }
  }
  L.clearTentacles = function () { for (const e of list) L.scene.remove(e.rig.root); list.length = 0; built = false; for (const b of beams) L.scene.remove(b.m); beams.length = 0; };
})();
