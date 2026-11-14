'use strict';
// Naturgewalten: Tornados ziehen über die Karte, Tsunamis rollen vom Meer aufs Land
(function () {
  const L = window.L, T = THREE;
  const isClient = () => L.net && L.net.role === 'client';
  const isHost = () => L.net && L.net.role === 'host';
  const P = L.player;
  const tors = [];
  let tsu = null;
  L.tornados = tors;
  L.tsunamiInfo = () => tsu;

  // ---------- Tornado ----------
  const funnelMat = new T.MeshLambertMaterial({ color: 0x6a6660, transparent: true, opacity: 0.55, side: T.DoubleSide, depthWrite: false });
  const funnelMat2 = new T.MeshLambertMaterial({ color: 0x4a4640, transparent: true, opacity: 0.4, side: T.DoubleSide, depthWrite: false });
  function buildFunnel() {
    const g = new T.Group(), rings = [];
    for (let i = 0; i < 9; i++) {
      const y0 = i * 9, r0 = 2 + i * i * 0.32, r1 = 2 + (i + 1) * (i + 1) * 0.32;
      const m = new T.Mesh(new T.CylinderGeometry(r1, r0, 9.5, 14, 1, true), i % 2 ? funnelMat : funnelMat2);
      m.position.y = y0 + 4.5; g.add(m); rings.push(m);
    }
    // Trümmer, die herumwirbeln
    const debris = [];
    for (let i = 0; i < 26; i++) {
      const d = new T.Mesh(L.GEO.box, L.mat(L.pick(['#5a4a3a', '#3a3a3a', '#7a6a50', '#2a4a2a'])));
      d.scale.set(L.rand(0.3, 1.4), L.rand(0.2, 0.8), L.rand(0.3, 1.2)); g.add(d);
      debris.push({ m: d, a: Math.random() * 6.28, r: L.rand(4, 18), y: L.rand(1, 50), s: L.rand(1.5, 3.5) });
    }
    return { g, rings, debris };
  }
  L.spawnTornado = function (x, z, id) {
    const f = buildFunnel(); L.scene.add(f.g);
    const t = { id: id || Math.floor(Math.random() * 1e9), x, z, nx: x, nz: z, tx: x, tz: z, life: L.rand(80, 120), age: 0, f, rumT: 0 };
    f.g.position.set(x, 0, z);
    tors.push(t);
    const d = L.dist(P.x, P.z, x, z);
    L.msg(d < 600 ? '🌪️ Ein Tornado ist ganz in deiner Nähe! Bleib weg von ihm!' : '🌪️ Auf der Karte ist ein Tornado aufgetaucht.', 6000);
    return t;
  };
  function removeTornado(i) { L.scene.remove(tors[i].f.g); tors.splice(i, 1); }
  function pushThing(o, cx, cz, dt, strong) {
    const dx = cx - o.x, dz = cz - o.z, d = Math.hypot(dx, dz) || 1;
    const pull = (1 - d / 45) * strong;
    // reinziehen + herumwirbeln
    o.x += (dx / d * pull * 6 - dz / d * pull * 9) * dt;
    o.z += (dz / d * pull * 6 + dx / d * pull * 9) * dt;
  }
  function updateTornados(dt) {
    for (let i = tors.length - 1; i >= 0; i--) {
      const t = tors[i];
      t.age += dt;
      if (!isClient()) {
        t.life -= dt;
        if (L.dist(t.x, t.z, t.tx, t.tz) < 20) { t.tx = L.clamp(t.x + L.rand(-400, 400), -1450, 1450); t.tz = L.clamp(t.z + L.rand(-400, 400), -1450, 1450); }
        const a = Math.atan2(t.tx - t.x, t.tz - t.z);
        t.x += Math.sin(a) * 9 * dt; t.z += Math.cos(a) * 9 * dt;
        if (t.life <= 0) { removeTornado(i); continue; }
      } else { const k = Math.min(1, dt * 4); t.x += (t.nx - t.x) * k; t.z += (t.nz - t.z) * k; if (performance.now() - (t.seen || 0) > 3000) { removeTornado(i); continue; } }
      // Aussehen
      const grow = Math.min(1, t.age / 4) * (t.life < 4 && !isClient() ? t.life / 4 : 1);
      t.f.g.position.set(t.x, 0, t.z); t.f.g.scale.set(grow, Math.max(0.05, grow), grow);
      t.f.rings.forEach((r, k) => { r.rotation.y += dt * (3 + k * 0.3); r.position.x = Math.sin(t.age * 1.3 + k * 0.6) * k * 0.4; });
      for (const d of t.f.debris) { d.a += dt * d.s; d.m.position.set(Math.sin(d.a) * d.r, d.y + Math.sin(t.age + d.a) * 2, Math.cos(d.a) * d.r); d.m.rotation.x += dt * 3; d.m.rotation.y += dt * 2; }
      const dP = L.dist(P.x, P.z, t.x, t.z);
      if (Math.random() < dt * 20 && dP < 400) L.fx(Math.random() < 0.5 ? '#6a5a44' : '#4a4a46', t.x + L.rand(-12, 12), 0.5, t.z + L.rand(-12, 12), 2, 6, { size: 1.2, life: 1.5, g: -2 });
      t.rumT -= dt;
      if (t.rumT <= 0 && dP < 700) { t.rumT = 0.45; L.nz({ dur: 0.9, f: 260, type: 'lowpass', vol: 0.5, pos: { x: t.x, y: 10, z: t.z }, ref: 40 }); L.nz({ dur: 0.9, f: 1200, type: 'bandpass', q: 0.5, vol: 0.15, pos: { x: t.x, y: 20, z: t.z }, ref: 40 }); }
      // Wirkung auf den eigenen Spieler
      if (P.alive && !P.gone && dP < 45 && grow > 0.5 && !(L.inTower && L.towerSafe() && L.inTower(P.x, P.z))) {
        const v = P.vehicle;
        if (v && !(P.seat > 0)) { pushThing(v, t.x, t.z, dt, 1); if (dP < 9 && Math.random() < dt * 2) { v.speed *= 0.3; L.hurtPlayer(8, 'Vom Tornado durchgeschüttelt'); } }
        else if (!v) {
          pushThing(P, t.x, t.z, dt, 1.3);
          if (dP < 10 && !P.air) {
            const a = Math.atan2(P.x - t.x, P.z - t.z) + 1.4;
            P.vx = Math.sin(a) * 18; P.vz = Math.cos(a) * 18; P.vy = 14; P.air = true; P.tumble = 0.01; P.knockT = 2;
            L.msg('🌪️ Der Tornado hat dich hochgerissen!', 2500);
          }
        }
        L.shake = Math.max(L.shake, (1 - dP / 45) * 0.8);
      }
      // Monster und NPCs (nur der Host rechnet)
      if (!isClient()) {
        for (const m of L.ents.monsters) {
          if (m.dead || m.fly) continue;
          const d = L.dist(m.x, m.z, t.x, t.z); if (d > 45) continue;
          pushThing(m, t.x, t.z, dt, 1.2);
          if (d < 9) L.damageEnt(m, 40 * dt, t.x, t.z, null);
        }
        for (const n of L.ents.npcs) { if (n.dead) continue; const d = L.dist(n.x, n.z, t.x, t.z); if (d < 45) pushThing(n, t.x, t.z, dt, 1.2); if (d < 9) L.damageEnt(n, 40 * dt, t.x, t.z, null); }
        for (const v of L.ents.vehicles) { if (v === P.vehicle || v.occupied) continue; const d = L.dist(v.x, v.z, t.x, t.z); if (d < 35) { pushThing(v, t.x, t.z, dt, 0.8); v.yaw += dt * 2; v.rig.root.position.set(v.x, v.rig.root.position.y, v.z); v.rig.root.rotation.set(0, v.yaw, 0); } }
      }
    }
    // neuer Tornado: bei Gewitter öfter
    if (!isClient() && L.round && !L.round.over) {
      L.round.torT = (L.round.torT === undefined ? L.rand(90, 180) : L.round.torT) - dt * (L.env.weather === 'gewitter' ? 3 : 1);
      if (L.round.torT <= 0 && tors.length < 3) {
        L.round.torT = L.rand(150, 300);
        const CI = L.curIsland;
        for (let i = 0; i < 30; i++) {
          let x = L.rand(-1400, 1400), z = L.rand(-1400, 1400);
          if (CI) { const a2 = Math.random() * 6.28, d2 = Math.sqrt(Math.random()) * (CI.r - 80); x = CI.x + Math.sin(a2) * d2; z = CI.z + Math.cos(a2) * d2; if (L.dist(x, z, P.x, P.z) < 120) continue; L.spawnTornado(x, z); break; }
          if (L.dist(x, z, P.x, P.z) < 250 || (L.inTower && L.inTower(x, z, 40))) continue;
          L.spawnTornado(x, z); break;
        }
      }
    }
  }

  // ---------- Tsunami ----------
  // eine riesige Welle rollt von einer Seite (West, Ost oder Süd) vom Meer aufs Land und läuft dann aus
  const TSU_WARN = 25, TSU_SPEED = 26, TSU_H = 24, TSU_INLAND = 520;
  L.startTsunami = function (side, send) {
    if (tsu) return;
    const g = new T.Group(); L.scene.add(g);
    const W = 5200;
    const wall = new T.Mesh(new T.BoxGeometry(W, 1, 40), new T.MeshPhongMaterial({ color: 0x2a6a88, transparent: true, opacity: 0.88, shininess: 80 })); wall.position.y = 0.5; g.add(wall);
    // Wellenfront: schräg nach vorne gekippt, als würde sie gleich brechen
    const front = new T.Mesh(new T.BoxGeometry(W, 1, 1), new T.MeshPhongMaterial({ color: 0x3a82a0, transparent: true, opacity: 0.9, shininess: 80 }));
    front.rotation.x = 0.35; g.add(front);
    const foam = new T.Mesh(new T.BoxGeometry(W, 1, 6), new T.MeshLambertMaterial({ color: 0xf0f6ff })); g.add(foam);
    // side: 0 = West (x-), 1 = Ost (x+), 2 = Süd (z+)
    g.rotation.y = side === 0 ? Math.PI / 2 : side === 1 ? -Math.PI / 2 : Math.PI;
    tsu = { side, t: -TSU_WARN, g, wall, front, foam, hitT: 0 };
    const name = ['Westen', 'Osten', 'Süden'][side];
    tsu.warned = !(L.atHome && !L.atHome() && !L.curIsland);
    if (tsu.warned) L.banner('🌊 TSUNAMI-WARNUNG', `Eine Riesenwelle rollt aus dem ${name} über die ganze Karte! Rette dich in den 🗼 Turm, flieg mit dem T10 hoch oder setz dich ins Auto!`);
    if (tsu.warned) for (let k = 0; k < 6; k++) setTimeout(() => L.snd.alarm({ x: P.x, y: 5, z: P.z }), k * 1300);
    if (send && isHost()) L.mp.send({ t: 'tsu', side });
  };
  // Abstand der Wellenfront von der Kartenmitte (vom Meer aus nach innen)
  const frontPos = (t) => L.FAR - t * TSU_SPEED;
  // wie weit ein Punkt „hinter“ der Welle liegt (positiv = Welle ist schon da)
  function coordOf(side, x, z) { return side === 0 ? -x : side === 1 ? x : z; }
  function updateTsunami(dt) {
    if (!tsu) {
      if (!isClient() && L.round && !L.round.over) {
        L.round.tsuT = (L.round.tsuT === undefined ? L.rand(420, 600) : L.round.tsuT) - dt;
        if (L.round.tsuT <= 0) { L.round.tsuT = L.rand(540, 780); L.startTsunami(Math.floor(Math.random() * 3), true); }
      }
      return;
    }
    const S = tsu; S.t += dt;
    const fp = frontPos(Math.max(0, S.t));
    const stopAt = -1520, tStop = (L.FAR - stopAt) / TSU_SPEED;
    const front = S.t < tStop ? fp : stopAt;
    // Höhe: volle Höhe übers Meer, wird über das Land langsam etwas kleiner, läuft am anderen Ende aus
    const landK = L.clamp((1500 - front) / 3000, 0, 1);
    let h = TSU_H * (1 - landK * 0.5);
    if (S.t >= tStop) h *= Math.max(0, 1 - (S.t - tStop) / 6);
    if (S.t < 0) h = 0;
    // Mesh: Welle steht quer zur Seite, Wasser dahinter bis zum Meer
    const depthBehind = Math.min(L.FAR + 300 - front, front > 1500 ? 1e9 : 90);
    const g = S.g;
    g.visible = S.t > -2 && !L.inDim(L.camera.position.x);
    if (!S.warned && L.atHome && L.atHome() && S.t < 10) { S.warned = true; L.banner('🌊 TSUNAMI!', 'Eine Riesenwelle rollt gerade über die Heimat – rette dich in den 🗼 Turm oder nach oben!'); }
    const cx = S.side === 0 ? -front : S.side === 1 ? front : 0, cz = S.side === 2 ? front : 0;
    g.position.set(cx, 0, cz);
    S.wall.scale.set(1, Math.max(0.1, h), depthBehind / 40); S.wall.position.set(0, h / 2 + L.WATER_Y, -depthBehind / 2);
    S.front.scale.set(1, Math.max(0.1, h * 1.05), 9); S.front.position.set(0, L.WATER_Y + h / 2, -3);
    S.frontNow = front; S.hNow = h;
    S.foam.position.set(0, L.WATER_Y + h + 0.2, -1); S.foam.scale.set(1, 0.6, 1);
    if (S.t > tStop + 7) { L.scene.remove(S.g); tsu = null; return; }
    if (S.t < 0 || h < 1) return;
    // Rauschen
    S.hitT -= dt;
    const pc = coordOf(S.side, P.x, P.z), dist = pc - front;
    if (S.hitT <= 0 && !L.inDim(P.x)) { S.hitT = 0.4; if (Math.abs(dist) < 500) { L.nz({ dur: 0.9, f: 400, type: 'lowpass', vol: 0.6 * (1 - Math.abs(dist) / 500), ref: 30 }); L.shake = Math.max(L.shake, (1 - Math.abs(dist) / 500) * 0.8); } }
    // Wirkung: alles, was die Welle erwischt (hinter der Front, unter der Wellenhöhe)
    const hit = (x, z, y) => { const c = coordOf(S.side, x, z); return c > front - 4 && c < front + 60 && (y || 0) < h + L.WATER_Y && !(L.towerSafe && L.towerSafe() && L.inTower(x, z)); };
    const dir = S.side === 0 ? [1, 0] : S.side === 1 ? [-1, 0] : [0, -1];
    if (P.alive && !P.gone && !L.inDim(P.x) && hit(P.x, P.z, P.y)) {
      const v = P.vehicle;
      if (v && !(P.seat > 0)) { v.x += dir[0] * 14 * dt; v.z += dir[1] * 14 * dt; v.speed *= 0.9; }
      else if (!v) { P.vx = dir[0] * 14; P.vz = dir[1] * 14; P.knockT = 0.5; }
      L.hurtPlayer(30 * dt * (P.vehicle ? 0.5 : 1) * (L.md ? L.md.dmg : 1), 'Vom Tsunami mitgerissen');
      if (!(S.msgT > 0)) { S.msgT = 4; L.msg('🌊 Die Welle reißt dich mit!', 2500); }
    }
    S.msgT = (S.msgT || 0) - dt;
    if (!isClient()) {
      for (const m of L.ents.monsters) { if (m.dead || m.fly || !hit(m.x, m.z, 0)) continue; m.x += dir[0] * 12 * dt; m.z += dir[1] * 12 * dt; L.damageEnt(m, 25 * dt, m.x, m.z, null); }
      for (const n of L.ents.npcs) { if (n.dead || !hit(n.x, n.z, 0)) continue; n.x += dir[0] * 12 * dt; n.z += dir[1] * 12 * dt; L.damageEnt(n, 25 * dt, n.x, n.z, null); }
      for (const v of L.ents.vehicles) { if (v === P.vehicle || v.occupied || !hit(v.x, v.z, v.alt || 0)) continue; v.x += dir[0] * 10 * dt; v.z += dir[1] * 10 * dt; v.rig.root.position.x = v.x; v.rig.root.position.z = v.z; }
    }
  }

  // ---------- Schnittstellen ----------
  L.updateNature = function (dt) { updateTornados(dt); updateTsunami(dt); };
  L.clearNature = function () {
    while (tors.length) removeTornado(0);
    if (tsu) { L.scene.remove(tsu.g); tsu = null; }
  };
  // Host → Mitspieler: Tornado-Positionen
  L.natureState = () => tors.map((t) => [t.id, Math.round(t.x), Math.round(t.z)]);
  L.applyNature = function (list) {
    for (const a of list || []) {
      let t = tors.find((q) => q.id === a[0]);
      if (!t) t = L.spawnTornado(a[1], a[2], a[0]);
      t.nx = a[1]; t.nz = a[2]; t.seen = performance.now();
    }
  };
})();
