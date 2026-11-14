'use strict';
// Polizei: unzerstörbare KI-Streifen (Autos, Motorräder, Quads …) fahren auf der Heimatinsel herum.
// Sie jagen nur, wer mit dem Fahrzeug über 100 km/h fährt (bis 500 km/h), teilen sich auf und versuchen dich zu umzingeln.
// Berühren sie dich, bist du festgenommen (Kurzfilm) – mit Medkit/Bandage wachst du woanders auf, aber ohne deine Sachen.
(function () {
  const L = window.L, T = THREE, P = L.player, E = L.ents;
  const TYPES = ['polizei_auto', 'polizei_auto', 'polizei_sport', 'polizei_suv', 'polizei_motorrad', 'polizei_motorrad', 'polizei_quad', 'polizei_cross'];
  const VMAX = 500 / 3.6;
  const host = () => !(L._isClient && L._isClient());
  const units = () => E.vehicles.filter((v) => v.t.police);

  // ---------- Orte ----------
  function landOk(x, z, r) { return Math.abs(x) < 1420 && Math.abs(z) < 1420 && !L.queryBoxes(x, z, r || 3).length && L.waterDepth(x, z) < -0.2 && L.mountainH(x, z) < 0.2 && !L.inTower(x, z, 6) && !(L.inWorkshop && L.inWorkshop(x, z)); }
  function farFromPlayers(x, z, d) { for (const p of L._players()) if (Math.hypot(p.x - x, p.z - z) < d) return false; return true; }
  function roadSpot(minD) {
    const R = L.roads;
    for (let k = 0; k < 300; k++) {
      const r = R[Math.floor(Math.random() * R.length)];
      const x = L.rand(r.rx1 + 2, r.rx2 - 2), z = L.rand(r.rz1 + 1, r.rz2 - 1);
      if (!landOk(x, z, 2.5)) continue;
      if (minD && !farFromPlayers(x, z, minD)) continue;
      return { x, z, yaw: r.dir === 'x' ? (Math.random() < 0.5 ? 1 : -1) * Math.PI / 2 : (Math.random() < 0.5 ? 0 : Math.PI) };
    }
    return { x: 300, z: 300, yaw: 0 };
  }
  L.spawnPolice = function () {
    if (!host()) return;
    TYPES.forEach((ty, i) => {
      const s = roadSpot(350);
      L._g.spawnVehicle({ type: ty, x: s.x, z: s.z, yaw: s.yaw });
      const v = E.vehicles[E.vehicles.length - 1];
      v.ai = { idx: i, state: 'patrol', goal: null, goalT: 0, stuck: 0, rev: 0, unst: 0, seen: 99, scanT: Math.random() * 0.3, camp: { x: v.x, z: v.z, t: 0 } };
    });
  };
  function relocate(v) {
    const s = roadSpot(220); v.x = s.x; v.z = s.z; v.yaw = s.yaw; v.speed = 0; v.lat = 0; v.alt = 0; v.sink = 0;
    v.rig.root.position.set(v.x, 0, v.z); v.rig.root.rotation.set(0, v.yaw, 0);
    const a = v.ai; a.stuck = 0; a.rev = 0; a.unst = 0; a.goal = null; a.camp = { x: v.x, z: v.z, t: 0 };
  }

  // ---------- Sehen ----------
  const isP = (p) => p === P;
  function valid(p) {
    if (!p) return false;
    if (isP(p)) { if (!P.alive || P.gone || P.spawnProt > 0 || L.cine || caught || (L.suitOn && L.suitOn())) return false; }
    else if (!p.alive || p.gone || !p.inRound) return false;
    if (L.onIsl && L.onIsl(p.x, p.z)) return false;
    if (L.safeIn && L.safeIn(p.x, p.z)) return false;
    return Math.abs(p.x) < 1550 && Math.abs(p.z) < 1550;
  }
  // Höhe über dem Boden (Fliegen, Flugzeug, Heli, Sprung …)
  function heightOf(p) {
    if (isP(p)) { const v = P.vehicle; if (v) return Math.max(v.alt || 0, v.y || 0); const y = P.y || 0, f = L.floorAt ? L.floorAt(P.x, P.z, y) : null; return y - (typeof f === 'number' ? f : 0); }
    return Math.max(0, p.y || 0);
  }
  // In der Luft: Polizei schießt (aus dem Streifenwagen) – festnehmen geht nur am Boden
  function shoot(v, p, h, d) {
    const from = new THREE.Vector3(v.x, 1.7, v.z), hit = Math.random() < Math.max(0.15, 0.55 - d / 350);
    const to = new THREE.Vector3(p.x + (hit ? 0 : L.rand(-3, 3)), h + 1 + (hit ? 0 : L.rand(-2, 3)), p.z + (hit ? 0 : L.rand(-3, 3)));
    if (L.tracer) L.tracer(from, to);
    L.snd.gun && L.snd.gun('pistole', { x: v.x, y: 1.6, z: v.z });
    if (!hit) return;
    if (isP(p)) { if (P.vehicle) { P.vehicle.hp -= 14; if (Math.random() < 0.35) L.hurtPlayer(4, 'Von der Polizei abgeschossen'); } else L.hurtPlayer(7, 'Von der Polizei abgeschossen'); }
    else if (p.pid !== undefined && L.mp && L.mp.sendTo) L.mp.sendTo(p.pid, { t: 'pvp', dmg: 7, by: 'der Polizei' });
  }
  function los(ax, az, bx, bz) {
    const d = Math.hypot(bx - ax, bz - az), n = Math.ceil(d / 3);
    for (let i = 1; i < n; i++) { const t = i / n; if (L.blockedAt(L.lerp(ax, bx, t), 1.6, L.lerp(az, bz, t))) return false; }
    return true;
  }
  function inVeh(p) { return isP(p) ? !!P.vehicle : !!p.inVeh; }
  function sneaking(p) { return isP(p) ? (P.stance !== 'stand' && !P.vehicle) : (p.stance !== 'stand' && !p.inVeh); }
  // nur wer mit einem Fahrzeug schneller als 100 km/h fährt, wird gejagt
  function speeding(p) {
    if (!inVeh(p)) return false;
    const sp = isP(p) ? Math.abs(P.vehicle.speed || 0) : Math.hypot(velOf(p).vx, velOf(p).vz);
    return sp * 3.6 > 100;
  }
  function spot(v) {
    let best = null, bd = 1e9;
    for (const p of L._players()) {
      if (!valid(p) || !speeding(p)) continue;
      const d = Math.hypot(p.x - v.x, p.z - v.z);
      let range = inVeh(p) ? 230 : sneaking(p) ? 28 : 120;
      if (isP(p) && L.indoor) range = 6;
      if (L.env && L.env.day < 0.35 && !inVeh(p)) range *= 0.6;
      if (d > range || d > bd) continue;
      if (!los(v.x, v.z, p.x, p.z)) continue;
      best = p; bd = d;
    }
    return best;
  }
  // Geschwindigkeit der Spieler schätzen (für Vorhalten/Abfangen)
  const vel = new Map();
  function trackVel(dt) {
    for (const p of L._players()) {
      const k = isP(p) ? 'P' : 'r' + p.pid, o = vel.get(k);
      if (o) { const vx = (p.x - o.x) / dt, vz = (p.z - o.z) / dt; if (Math.hypot(vx, vz) < 400) { o.vx += (vx - o.vx) * 0.2; o.vz += (vz - o.vz) * 0.2; } o.x = p.x; o.z = p.z; }
      else vel.set(k, { x: p.x, z: p.z, vx: 0, vz: 0 });
    }
  }
  const velOf = (p) => vel.get(isP(p) ? 'P' : 'r' + p.pid) || { vx: 0, vz: 0 };
  function tell(p, text) { if (isP(p)) L.msg(text, 3500); else if (L.mp && L.mp.sendTo) L.mp.sendTo(p.pid, { t: 'msg', text }); }

  // ---------- KI pro Streife ----------
  L.updatePoliceCar = function (v, dt) {
    const a = v.ai || (v.ai = { idx: 0, state: 'patrol', goal: null, goalT: 0, stuck: 0, rev: 0, unst: 0, seen: 99, scanT: 0, camp: { x: v.x, z: v.z, t: 0 } });
    v.hp = v.t.hp; v.sink = 0;
    if (L.state !== 'game' || L.cine) { L._drive(v, dt, 0, 0, true); return; }
    // umsehen
    a.scanT -= dt;
    if (a.scanT <= 0) {
      a.scanT = 0.25;
      const p = spot(v);
      if (p) {
        if (a.state !== 'chase' || a.target !== p) { if (!p._copMsgT || performance.now() > p._copMsgT) { p._copMsgT = performance.now() + 15000; tell(p, '🚨 Die Polizei hat dich gesehen – hau ab!'); } }
        a.state = 'chase'; a.target = p; a.lx = p.x; a.lz = p.z; a.seen = 0;
        // Funk: Streifen in der Nähe helfen mit
        for (const o of units()) { const b = o.ai; if (!b || o === v) continue; if (b.state !== 'chase' && Math.hypot(o.x - v.x, o.z - v.z) < 600) { b.state = 'chase'; b.target = p; b.lx = p.x; b.lz = p.z; b.seen = 2; } else if (b.state === 'chase' && b.target === p) { b.lx = p.x; b.lz = p.z; b.seen = Math.min(b.seen, 1); } }
      }
    }
    a.seen += dt;
    if (a.state === 'chase') {
      a.slowT = a.target && speeding(a.target) ? 0 : (a.slowT || 0) + dt;
      if (a.target && a.slowT > 3) { const p = a.target; if (!p._calmMsgT || performance.now() > p._calmMsgT) { p._calmMsgT = performance.now() + 15000; tell(p, '🚓 Unter 100 km/h – die Polizei lässt dich in Ruhe.'); } a.state = 'patrol'; a.goal = null; a.target = null; a.slowT = 0; }
      else if (!valid(a.target)) { a.state = 'patrol'; a.goal = null; a.target = null; }
      else if (a.seen > 9) { a.state = 'search'; a.searchT = 14; a.goal = { x: a.lx, z: a.lz }; }
    } else if (a.state === 'search') {
      a.searchT -= dt;
      if (!a.goal || Math.hypot(a.goal.x - v.x, a.goal.z - v.z) < 15) a.goal = { x: a.lx + L.rand(-70, 70), z: a.lz + L.rand(-70, 70) };
      if (a.searchT <= 0) { a.state = 'patrol'; a.goal = null; }
    }
    // Ziel bestimmen
    let gx, gz, desired;
    if (a.state === 'chase') {
      const p = a.target, pv = velOf(p), d = Math.hypot(p.x - v.x, p.z - v.z), role = a.idx % 4;
      const lead = d < 35 ? 0.25 : role === 1 ? 2.2 : 0.9;
      gx = p.x + pv.vx * lead; gz = p.z + pv.vz * lead;
      if (d > 45 && (role === 2 || role === 3)) { const ang = Math.atan2(pv.vx || (p.x - v.x), pv.vz || (p.z - v.z)), s = role === 2 ? 1 : -1; gx += Math.cos(ang) * s * 28; gz -= Math.sin(ang) * s * 28; }
      desired = VMAX;
    } else {
      a.goalT += dt;
      if (!a.goal || Math.hypot(a.goal.x - v.x, a.goal.z - v.z) < 20 || a.goalT > 70) { a.goal = roadSpot(0); a.goalT = 0; }
      gx = a.goal.x; gz = a.goal.z; desired = a.state === 'search' ? 26 : 14;
    }
    const want = Math.atan2(gx - v.x, gz - v.z), diff = L.angDiff(v.yaw, want), ad = Math.abs(diff), sp = v.speed;
    let str = L.clamp(diff * 2.4, -1, 1), cap = desired;
    if (ad > 0.35) cap = Math.min(cap, 45); if (ad > 0.8) cap = Math.min(cap, 22); if (ad > 1.6) cap = Math.min(cap, 11);
    const dg = Math.hypot(gx - v.x, gz - v.z); if (a.state === 'chase' && dg < 25) cap = Math.min(cap, Math.max(9, dg * 1.2));
    let thr = sp < cap ? 1 : sp > cap * 1.15 ? -1 : 0, hb = ad > 1.3 && sp > 14;
    // nicht ins tiefe Wasser
    const look = Math.max(8, sp * 0.9), ax = v.x + Math.sin(v.yaw) * look, az = v.z + Math.cos(v.yaw) * look;
    if (L.waterDepth(ax, az) > 0.5) { thr = sp > 2 ? -1 : 0; if (L.waterDepth(v.x + Math.sin(want) * 10, v.z + Math.cos(want) * 10) > 0.5) str = 0; }
    // nicht in die Werkstatt
    if (L.inWorkshop && L.inWorkshop(v.x, v.z)) { a.rev = Math.max(a.rev, 1); }
    // festgefahren → zurücksetzen, notfalls woanders hin
    if (thr > 0 && Math.abs(sp) < 1.5 && a.rev <= 0) { a.stuck += dt; if (a.stuck > 1.2) { a.rev = 1.3; a.stuck = 0; a.unst++; } }
    else if (Math.abs(sp) > 4) { a.stuck = 0; if (a.rev <= 0) a.unst = Math.max(0, a.unst - dt * 0.2); }
    if (a.rev > 0) { a.rev -= dt; thr = -1; str = -Math.sign(diff || 1); hb = false; }
    if (a.unst > 4) relocate(v);
    // nicht an einer Stelle campen
    a.camp.t += dt;
    if (a.camp.t > 25) { if (Math.hypot(v.x - a.camp.x, v.z - a.camp.z) < 10 && a.state !== 'chase' && farFromPlayers(v.x, v.z, 120)) relocate(v); a.camp = { x: v.x, z: v.z, t: 0 }; }
    L._drive(v, dt, thr, str, hb);
    v.hp = v.t.hp;
    // in der Luft: schießen
    a.fireCd = (a.fireCd || 0) - dt;
    if (a.state === 'chase' && a.target && valid(a.target) && a.fireCd <= 0) {
      const p = a.target, h = heightOf(p), d = Math.hypot(p.x - v.x, p.z - v.z);
      if (h > 3 && d < 170 && los(v.x, v.z, p.x, p.z)) { a.fireCd = 0.9 + Math.random() * 0.7; shoot(v, p, h, d); }
    }
    // Festnahme: Berührung – nur wenn man wirklich unten am Boden ist
    for (const p of L._players()) {
      if (!valid(p) || a.state !== 'chase' || a.target !== p) continue; // nur wen sie gerade jagen
      if (heightOf(p) > 2.5) continue;
      const pr = isP(p) ? (P.vehicle ? P.vehicle.t.len * 0.5 : 0.5) : (p.inVeh ? 2.2 : 0.5);
      if (Math.hypot(p.x - v.x, p.z - v.z) < v.t.len * 0.5 + pr + 0.3) arrest(p, v);
    }
  };
  // ---------- Festnahme ----------
  const arrestCd = new Map();
  function arrest(p, v) {
    const k = isP(p) ? 'P' : 'r' + p.pid;
    if ((arrestCd.get(k) || 0) > performance.now()) return;
    arrestCd.set(k, performance.now() + 12000);
    // Streifen stellen sich um den Gefangenen
    const near = units().filter((o) => o !== v).sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z)).slice(0, 3);
    near.forEach((o, i) => { const ang = i / 3 * 6.28 + 0.5, x = p.x + Math.sin(ang) * 9, z = p.z + Math.cos(ang) * 9; if (Math.hypot(o.x - p.x, o.z - p.z) < 400 && landOk(x, z, 1.5)) { o.x = x; o.z = z; o.yaw = Math.atan2(p.x - x, p.z - z); o.speed = 0; o.rig.root.position.set(x, 0, z); o.rig.root.rotation.set(0, o.yaw, 0); } });
    v.speed = 0;
    for (const o of units()) if (o.ai && o.ai.target === p) { o.ai.state = 'patrol'; o.ai.target = null; o.ai.goal = null; }
    if (isP(p)) L.policeCaught(); else if (L.mp && L.mp.sendTo) L.mp.sendTo(p.pid, { t: 'caught' });
  }
  let caught = null;
  L.policeCaught = function () {
    if (caught || !P.alive || P.gone) return;
    caught = { t: 0 };
    L.banner('🚔 FESTGENOMMEN!', 'Die Polizei hat dich geschnappt …');
    for (let k = 0; k < 6; k++) setTimeout(() => L.tn && L.tn({ f: k % 2 ? 700 : 960, dur: 0.38, type: 'sawtooth', vol: 0.06 }), k * 420);
    const cx = P.x, cz = P.z;
    L.startCine('🚔 FESTGENOMMEN', 4.5, (t) => { const ang = t * 0.8, d = 16 - t * 1.6; return { x: cx + Math.sin(ang) * d, y: 3 + t * 1.3, z: cz + Math.cos(ang) * d, lx: cx, ly: 1, lz: cz }; });
  };
  // Nach dem Wiederbeleben: woanders aufwachen, alle Sachen weg (Tresor bleibt)
  L.policeRelease = function () {
    if (!P.caught) return false;
    P.caught = false;
    P.hot = [{ type: 'hammer', count: 1 }, null, null, null, null]; P.bag = new Array(P.bag.length || 15).fill(null); P.sel = 0;
    let best = null, bd = -1;
    for (let k = 0; k < 120; k++) {
      const x = L.rand(-1300, 1300), z = L.rand(-1300, 1300); if (!landOk(x, z, 2)) continue;
      let md = 1e9; for (const o of units()) md = Math.min(md, Math.hypot(o.x - x, o.z - z));
      if (md > bd) { bd = md; best = { x, z }; } if (md > 600) break;
    }
    if (best) { P.x = best.x; P.z = best.z; P.y = 0; P.vx = P.vz = 0; }
    P.spawnProt = Math.max(P.spawnProt || 0, 8);
    L.msg('👮 Du bist an einem anderen Ort aufgewacht – die Polizei hat dir ALLES abgenommen.', 7000);
    return true;
  };

  // ---------- jedes Bild (alle Spieler): Blaulicht, Sirene, Festnahme-Ablauf ----------
  let chasedBefore = false, sirenT = 0, sirenHi = false;
  L.updatePolice = function (dt) {
    if (L.state !== 'game') return;
    trackVel(Math.max(dt, 1 / 120));
    const tt = performance.now() / 1000, list = units();
    let nearest = 1e9;
    for (const v of list) {
      const u = v.rig.root.userData.siren, moving = Math.abs(v.speed) > 6 || (v.ai && v.ai.state === 'chase');
      if (u) { const on = moving ? Math.sin(tt * 14) > 0 : Math.sin(tt * 3) > 0.6; u.mr.material.color.setHex(on ? 0xff2020 : 0x400808); u.mb.material.color.setHex(on ? 0x081040 : 0x2050ff); }
      if (moving && Math.abs(v.speed) > 8) nearest = Math.min(nearest, Math.hypot(v.x - P.x, v.z - P.z));
    }
    // Sirene, wenn eine schnelle Streife in der Nähe ist
    sirenT -= dt;
    if (nearest < 170 && sirenT <= 0 && L.tn) { sirenT = 0.45; sirenHi = !sirenHi; L.tn({ f: sirenHi ? 960 : 700, dur: 0.42, type: 'sawtooth', vol: 0.05 * (1 - nearest / 170) }); }
    // Abgehängt?
    if (host()) {
      const chased = list.some((v) => v.ai && v.ai.state === 'chase' && v.ai.target === P);
      if (chasedBefore && !chased && P.alive && !caught) L.msg('😮‍💨 Du hast die Polizei abgehängt!', 4000);
      chasedBefore = chased;
    }
    // Festnahme: nach dem Kurzfilm stirbst du (mit Medkit/Bandage kannst du dich wiederbeleben)
    if (caught) {
      caught.t += dt;
      if (caught.t > 4.6 || (!L.cine && caught.t > 0.6)) {
        caught = null; P.caught = true;
        if (P.vehicle && L._leaveVehicle) L._leaveVehicle(true);
        L._killPlayer('Von der Polizei geschnappt');
      }
    }
  };
  L.clearPolice = function () { caught = null; P.caught = false; vel.clear(); arrestCd.clear(); chasedBefore = false; };
})();
