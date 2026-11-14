'use strict';
// Titan-Rüstung: mehr Waffen und sichtbare Animationen (eigener Entwurf).
// Hand-Blaster, Brust-Strahl, rote Laser, Raketen-Salve (teilt sich in viele Zielsuch-Raketen)
// und ein Modul-Platz (N wechselt): Energieschild, Doppel-Strahl (Hände zusammen), Schulter-Minigun, Mini-Raketen.
(function () {
  const L = window.L, T = THREE, P = L.player, I = L.ITEMS;
  const on = () => !!(L.titanOn && L.titanOn());
  const A = (name, icon, rate, extra) => Object.assign({ name, slot: 'waffe', icon, dmg: 0, rate, noise: 80, range: 140, ammo: null, mag: 1, spread: 0, energy: true, ta: true }, extra || {});
  Object.assign(I, {
    ta_blaster: A('Hand-Blaster', '✋', 0.28, { range: 150 }),
    ta_brust: A('Brust-Strahl', '🔆', 5, { range: 300, noise: 140 }),
    ta_laser: A('Rote Laser', '🟥', 3, { range: 30, noise: 50 }),
    ta_salve: A('Raketen-Salve', '🚀', 7, { range: 200, noise: 200 }),
    ta_modul: A('Rüstungs-Modul', '🛡️', 0.6, { range: 200 })
  });
  const MODS = [
    { id: 'schild', name: '🛡️ Energieschild', cd: 14 },
    { id: 'doppel', name: '🙌 Doppel-Strahl', cd: 6 },
    { id: 'minigun', name: '🔥 Schulter-Minigun', cd: 0 },
    { id: 'rakete', name: '🚀 Mini-Raketen', cd: 0 }
  ];
  const S = { mod: 0, cd: {}, anim: null, animT: 0, animDur: 0.5, shieldT: 0, shield: null, glowH: null, glowC: null, fx: [], missiles: [], beam: null };
  L.titanArmorStart = function () {
    if (!on()) return;
    P.hot[0] = { type: 'ta_blaster', count: 1, mag: 1 }; P.hot[1] = { type: 'ta_brust', count: 1, mag: 1 }; P.hot[2] = { type: 'ta_laser', count: 1, mag: 1 };
    P.hot[3] = { type: 'ta_salve', count: 1, mag: 1 }; P.hot[4] = { type: 'ta_modul', count: 1, mag: 1 };
    P.sel = 0;
    L.msg('🤖 Titan-Rüstung: 1 Hand-Blaster · 2 Brust-Strahl · 3 Rote Laser · 4 Raketen-Salve · 5 Modul (N wechselt: Schild, Doppel-Strahl, Minigun, Raketen) · V fliegen', 8000);
  };
  const obi = L.buildItem;
  L.buildItem = function (type) { if (I[type] && I[type].ta) return new T.Group(); return obi(type); };
  // Schaden blocken, solange der Schild an ist
  L.dmgBlock = function (dmg) {
    if (!(S.shieldT > 0)) return false;
    if (S.shield) { S.shield.material.opacity = 0.75; S.hitFlash = 0.25; }
    L.nz && L.nz({ dur: 0.12, f: 2600, type: 'bandpass', vol: 0.2 });
    return true;
  };
  // ---------- Hilfen ----------
  const V3 = () => new T.Vector3();
  const aim = () => { const d = V3(); L.camera.getWorldDirection(d); return d; };
  const hand = (i) => { const r = P.rig, h = V3(); if (r && r.arms && r.arms[i]) { r.arms[i].elbow.updateMatrixWorld(true); r.arms[i].elbow.localToWorld(h.set(0, -0.32, 0.05)); } else h.set(P.x, (P.y || 0) + 1.4, P.z); return h; };
  const chest = () => { const r = P.rig, h = V3(); if (r && r.torso) { r.torso.updateMatrixWorld(true); r.torso.localToWorld(h.set(0, 0.42, 0.24)); } else h.set(P.x, (P.y || 0) + 1.4, P.z); return h; };
  const targets = () => (L._targets ? L._targets() : []).filter((e) => e.kind !== 'remote');
  const glowMat = (c, o) => new T.MeshBasicMaterial({ color: c, transparent: true, opacity: o === undefined ? 0.9 : o, blending: T.AdditiveBlending, depthWrite: false });
  function beam(a, b, col, w, dur, core) {
    const len = a.distanceTo(b), g = new T.Group();
    const m = new T.Mesh(new T.CylinderGeometry(w, w, len, 12, 1, true), glowMat(col, 0.85)); g.add(m);
    if (core) { const c = new T.Mesh(new T.CylinderGeometry(w * 0.4, w * 0.4, len, 8, 1, true), glowMat(0xffffff, 0.95)); g.add(c); }
    g.position.copy(a).lerp(b, 0.5); g.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), b.clone().sub(a).normalize()); L.scene.add(g);
    S.fx.push({ m: g, t: 0, dur, kind: 'beam' }); return g;
  }
  function flash(p, col, size, dur) { const m = new T.Mesh(L.GEO.sph, glowMat(col, 0.9)); m.position.copy(p); m.scale.setScalar(size); L.scene.add(m); S.fx.push({ m, t: 0, dur, kind: 'flash', size }); }
  function ringAt(p, col, r, dur) { const m = new T.Mesh(new T.TorusGeometry(1, 0.08, 6, 40), glowMat(col, 0.9)); m.position.copy(p); m.lookAt(p.clone().add(aim())); L.scene.add(m); S.fx.push({ m, t: 0, dur, kind: 'ring', size: r }); }
  const play = (a, d) => { S.anim = a; S.animT = 0; S.animDur = d; };
  const shot = (from, range, dmg, col, w) => {
    const o = L.camera.position, dir = aim(), h = L.rayHit(o, dir, range + P.camDist, P.camDist + 0.3), end = o.clone().addScaledVector(dir, h.t);
    beam(from, end, col, w, 0.18, true); flash(from, col, w * 3, 0.15); flash(end, col, w * 4, 0.25);
    L.fx('#' + new T.Color(col).getHexString(), end.x, end.y, end.z, 10, 5, { basic: true, size: 0.25, life: 0.5 });
    if (h.ent) L.damageEnt(h.ent, dmg * h.mult, P.x, P.z, P);
    return { h, end };
  };
  // ---------- Feuern ----------
  const owf = L.weaponFire;
  L.weaponFire = function (w, d) {
    if (!d || !d.ta) return owf(w, d);
    const now = performance.now() / 1000;
    P.fireCd = d.rate;
    switch (w.type) {
      case 'ta_blaster': {
        S.hand = ((S.hand || 0) + 1) % 2; play(S.hand ? 'palmL' : 'palmR', 0.3);
        shot(hand(S.hand), 150, 55, 0x80e0ff, 0.12); P.recoil = 0.4;
        L.tn && L.tn({ f: 900, fTo: 300, dur: 0.18, type: 'sawtooth', vol: 0.12 });
        break;
      }
      case 'ta_brust': {
        play('unibeam', 1.5); S.beam = { t: 0, tick: 0 };
        L.tn && L.tn({ f: 200, fTo: 1400, dur: 0.5, type: 'sawtooth', vol: 0.14 });
        break;
      }
      case 'ta_laser': {
        play('laser', 0.9); S.laser = { t: 0, hit: new Set() };
        L.tn && L.tn({ f: 1800, fTo: 1600, dur: 0.8, type: 'square', vol: 0.06 });
        break;
      }
      case 'ta_salve': {
        play('salve', 0.6);
        const o = L.camera.position, dir = aim(), from = chest().add(new T.Vector3(0, 0.6, 0));
        const m = new T.Mesh(L.GEO.cone, new T.MeshLambertMaterial({ color: 0xc8c8d0 })); m.scale.set(0.18, 0.7, 0.18); m.position.copy(from); L.scene.add(m);
        S.missiles.push({ m, p: from.clone(), v: dir.clone().multiplyScalar(45).add(new T.Vector3(0, 8, 0)), t: 0, big: true });
        L.snd.gun && L.snd.gun('gewehr', { x: P.x, y: 2, z: P.z });
        L.msg('🚀 Raketen-Salve: teilt sich gleich in viele Zielsuch-Raketen!', 2000);
        break;
      }
      case 'ta_modul': {
        const M = MODS[S.mod];
        if ((S.cd[M.id] || 0) > now) { L.msg('⏳ ' + M.name + ' lädt noch ' + Math.ceil(S.cd[M.id] - now) + ' s', 900); P.fireCd = 0.3; break; }
        S.cd[M.id] = now + M.cd;
        if (M.id === 'schild') {
          S.shieldT = 6; play('shield', 0.6);
          if (!S.shield) { S.shield = new T.Mesh(new T.IcosahedronGeometry(1.6, 1), new T.MeshBasicMaterial({ color: 0x60d8ff, transparent: true, opacity: 0.35, wireframe: true, blending: T.AdditiveBlending, depthWrite: false })); L.scene.add(S.shield); }
          L.msg('🛡️ Energieschild: 6 Sekunden kein Schaden!', 2500); L.snd.teleport && L.snd.teleport({ x: P.x, y: P.y, z: P.z });
        } else if (M.id === 'doppel') {
          play('doppel', 1.0); P.fireCd = 1;
          setTimeout(() => {
            const a = hand(0).lerp(hand(1), 0.5), r = shot(a, 220, 700, 0xffc070, 0.45);
            ringAt(a, 0xffe0a0, 2.5, 0.4); L.shake = Math.max(L.shake, 0.8); L.env.bolt = 0.4;
            for (const e of targets()) if (e !== r.h.ent && Math.hypot(e.x - r.end.x, e.z - r.end.z) < 8 + (e.bigR || 0)) L.damageEnt(e, 300, P.x, P.z, P);
            L.snd.explosion && L.snd.explosion({ x: r.end.x, y: r.end.y, z: r.end.z });
          }, 350);
        } else if (M.id === 'minigun') { owf({ type: 'schulterkanone', count: 1, mag: 1 }, I.schulterkanone); play('palmR', 0.1); }
        else if (M.id === 'rakete') { owf({ type: 'minirakete', count: 1, mag: 1 }, I.minirakete); }
        break;
      }
    }
    L.makeNoise(P.x, P.z, d.noise, P);
    return true;
  };
  addEventListener('keydown', (e) => { if (e.code === 'KeyN' && !L.chatOpen && L.selType && L.selType() === 'ta_modul') { S.mod = (S.mod + 1) % MODS.length; L.msg('Modul: ' + MODS[S.mod].name, 1200); } });

  // ---------- jedes Bild ----------
  L.updateTitanArmor = function (dt) {
    for (let i = S.fx.length - 1; i >= 0; i--) {
      const f = S.fx[i]; f.t += dt; const u = f.t / f.dur;
      if (f.kind === 'flash') f.m.scale.setScalar(f.size * (1 + u));
      if (f.kind === 'ring') f.m.scale.setScalar(1 + u * f.size);
      f.m.traverse((o) => { if (o.material) o.material.opacity = 0.9 * (1 - u); });
      if (u >= 1) { L.scene.remove(f.m); f.m.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); S.fx.splice(i, 1); }
    }
    // Brust-Strahl: 0,4 s aufladen, dann 1 s Dauerstrahl
    if (S.beam) {
      const B = S.beam; B.t += dt; const c = chest();
      if (!S.glowC) { S.glowC = new T.Mesh(L.GEO.sph, glowMat(0xc8f8ff, 0.9)); L.scene.add(S.glowC); }
      S.glowC.visible = true; S.glowC.position.copy(c); S.glowC.scale.setScalar(0.12 + Math.min(1, B.t / 0.4) * 0.3);
      if (B.t > 0.4) {
        B.tick -= dt;
        if (B.tick <= 0) {
          B.tick = 0.1; const o = L.camera.position, dir = aim(), h = L.rayHit(o, dir, 300 + P.camDist, P.camDist + 0.3), end = o.clone().addScaledVector(dir, h.t);
          beam(c, end, 0x9ae8ff, 0.5, 0.12, true); flash(end, 0xc8f8ff, 1.5, 0.15);
          if (h.ent) L.damageEnt(h.ent, 70 * h.mult, P.x, P.z, P);
          L.env.bolt = 0.25; L.shake = Math.max(L.shake, 0.3);
        }
      }
      if (B.t > 1.4) { S.beam = null; S.glowC.visible = false; }
    }
    // rote Laser: fegen von links nach rechts
    if (S.laser) {
      const Z = S.laser; Z.t += dt; const u = Math.min(1, Z.t / 0.7), yaw = P.camYaw - 0.9 + u * 1.8;
      for (let k = 0; k < 2; k++) {
        const from = hand(k), dir = new T.Vector3(Math.sin(yaw + (k ? 0.05 : -0.05)), -0.04, Math.cos(yaw + (k ? 0.05 : -0.05))), end = from.clone().addScaledVector(dir, 28);
        beam(from, end, 0xff2020, 0.03, 0.06, false);
      }
      for (const e of targets()) {
        if (Z.hit.has(e)) continue; const dx = e.x - P.x, dz = e.z - P.z, d = Math.hypot(dx, dz); if (d > 28 + (e.bigR || 0)) continue;
        if (Math.abs(L.angDiff(yaw, Math.atan2(dx, dz))) < 0.12) { Z.hit.add(e); L.damageEnt(e, 260, P.x, P.z, P); L.fx('#ff4040', e.x, 1.5, e.z, 12, 4, { basic: true, size: 0.2, life: 0.5 }); }
      }
      if (Z.t > 0.75) S.laser = null;
    }
    // Raketen: die große teilt sich nach 0,6 s in 8 Zielsuch-Raketen
    for (let i = S.missiles.length - 1; i >= 0; i--) {
      const M = S.missiles[i]; M.t += dt;
      if (M.big && M.t > 0.6) {
        L.scene.remove(M.m); S.missiles.splice(i, 1); flash(M.p, 0xffc060, 1.2, 0.3);
        const list = targets().filter((e) => !e.dead && Math.hypot(e.x - M.p.x, e.z - M.p.z) < 140).sort((a, b) => Math.hypot(a.x - M.p.x, a.z - M.p.z) - Math.hypot(b.x - M.p.x, b.z - M.p.z)).slice(0, 8);
        for (let k = 0; k < 8; k++) { const m = new T.Mesh(L.GEO.cone, new T.MeshLambertMaterial({ color: 0xd8d8e0 })); m.scale.set(0.08, 0.35, 0.08); m.position.copy(M.p); L.scene.add(m); const a = k / 8 * 6.283; S.missiles.push({ m, p: M.p.clone(), v: new T.Vector3(Math.sin(a) * 14, 6, Math.cos(a) * 14), t: 0, tgt: list[k % Math.max(1, list.length)] || null, dir: M.v.clone().normalize() }); }
        continue;
      }
      if (!M.big) {
        const tg = M.tgt && !M.tgt.dead ? new T.Vector3(M.tgt.x, (M.tgt.y || 0) + 1.2, M.tgt.z) : M.p.clone().addScaledVector(M.dir, 40);
        const want = tg.clone().sub(M.p).normalize().multiplyScalar(55); M.v.lerp(want, Math.min(1, dt * (2 + M.t * 4)));
      }
      M.p.addScaledVector(M.v, dt); M.m.position.copy(M.p); M.m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), M.v.clone().normalize());
      if (Math.random() < dt * 40) L.fx('#ffb060', M.p.x, M.p.y, M.p.z, 1, 0.5, { basic: true, size: 0.12, life: 0.35 });
      const hitT = M.tgt && !M.tgt.dead && M.p.distanceTo(new T.Vector3(M.tgt.x, (M.tgt.y || 0) + 1.2, M.tgt.z)) < 2;
      if (!M.big && (hitT || M.p.y < (L.floorAt ? (L.floorAt(M.p.x, M.p.z, M.p.y) || 0) : 0) + 0.2 || M.t > 5)) {
        L.scene.remove(M.m); S.missiles.splice(i, 1);
        L.fx('#ffa040', M.p.x, M.p.y, M.p.z, 18, 7, { basic: true, size: 0.35, life: 0.6 }); L.snd.explosion && L.snd.explosion({ x: M.p.x, y: M.p.y, z: M.p.z });
        for (const e of targets()) if (Math.hypot(e.x - M.p.x, e.z - M.p.z) < 4.5 + (e.bigR || 0)) L.damageEnt(e, 160, M.p.x, M.p.z, P);
      }
    }
    // Schild
    if (S.shieldT > 0) {
      S.shieldT -= dt; S.hitFlash = Math.max(0, (S.hitFlash || 0) - dt);
      S.shield.visible = true; S.shield.position.set(P.x, (P.y || 0) + 1.1, P.z); S.shield.rotation.y += dt * 0.8;
      S.shield.material.opacity = S.hitFlash > 0 ? 0.75 : 0.25 + Math.sin(performance.now() / 120) * 0.08;
      if (S.shieldT <= 0) { S.shield.visible = false; L.msg('🛡️ Schild aus.', 1200); }
    }
    // Modul-Anzeige
    if (!hudEl) { hudEl = document.createElement('div'); hudEl.style.cssText = 'position:fixed;left:50%;bottom:96px;transform:translateX(-50%);z-index:14;display:none;background:rgba(0,0,0,.55);padding:5px 12px;border-radius:12px;font:bold 13px Arial,sans-serif;color:#fff;cursor:pointer'; hudEl.onclick = (e) => { e.stopPropagation(); S.mod = (S.mod + 1) % MODS.length; }; document.body.appendChild(hudEl); }
    const held = on() && L.selType && L.selType() === 'ta_modul' && L.state === 'game' && !L.cine;
    hudEl.style.display = held ? 'block' : 'none';
    if (held) hudEl.textContent = MODS[S.mod].name + ' · N / antippen = wechseln';
  };
  let hudEl = null;
  // ---------- Animationen ----------
  const oapa = L.afterPlayerAnim;
  L.afterPlayerAnim = function (r, dt) {
    if (oapa) oapa(r, dt);
    if (r !== P.rig || !on()) return;
    const [aR, aL] = r.arms;
    // Handflächen leuchten beim Blaster
    if (!S.glowH) { S.glowH = [0, 1].map(() => { const m = new T.Mesh(L.GEO.sph, glowMat(0x9ae8ff, 0.9)); m.visible = false; L.scene.add(m); return m; }); }
    S.glowH.forEach((m) => { m.visible = false; });
    if (!S.anim) return;
    S.animT += dt; const u = Math.min(1, S.animT / S.animDur), s = Math.sin(u * Math.PI);
    const glow = (i, k) => { const m = S.glowH[i]; m.visible = true; m.position.copy(hand(i)); m.scale.setScalar(k); };
    switch (S.anim) {
      case 'palmR': aR.arm.rotation.x = -1.57; aR.arm.rotation.z = 0; aR.elbow.rotation.x = 0; glow(0, 0.1 + s * 0.12); break;
      case 'palmL': aL.arm.rotation.x = -1.57; aL.arm.rotation.z = 0; aL.elbow.rotation.x = 0; glow(1, 0.1 + s * 0.12); break;
      case 'unibeam': r.torso.rotation.x = -0.25; for (const a of r.arms) { a.arm.rotation.x = 0.5; a.arm.rotation.z = (a === aR ? -0.7 : 0.7); a.elbow.rotation.x = -0.3; } break;
      case 'laser': for (const a of r.arms) { a.arm.rotation.x = -1.5; a.arm.rotation.z = (a === aR ? -0.35 : 0.35); a.elbow.rotation.x = 0; } r.torso.rotation.y = -0.9 + Math.min(1, S.animT / 0.7) * 1.8; glow(0, 0.06); glow(1, 0.06); S.glowH.forEach((m) => m.material.color.set(0xff3030)); break;
      case 'salve': for (const a of r.arms) { a.arm.rotation.x = -0.3; a.arm.rotation.z = (a === aR ? -0.9 : 0.9) * s; } r.torso.rotation.x = -0.15 * s; break;
      case 'shield': for (const a of r.arms) { a.arm.rotation.x = -1.2 * s; a.arm.rotation.z = (a === aR ? -1.2 : 1.2) * s; } break;
      case 'doppel': for (const a of r.arms) { a.arm.rotation.x = -1.57; a.arm.rotation.z = (a === aR ? 0.25 : -0.25); a.elbow.rotation.x = 0; } r.torso.rotation.x = 0.1; glow(0, 0.1 + u * 0.25); glow(1, 0.1 + u * 0.25); S.glowH.forEach((m) => m.material.color.set(0xffd080)); break;
    }
    if (S.anim !== 'laser' && S.anim !== 'doppel') S.glowH.forEach((m) => m.material.color.set(0x9ae8ff));
    if (u >= 1) S.anim = null;
  };
  L.clearTitanArmor = function () {
    for (const f of S.fx) L.scene.remove(f.m); S.fx.length = 0; for (const M of S.missiles) L.scene.remove(M.m); S.missiles.length = 0;
    S.beam = null; S.laser = null; S.shieldT = 0; if (S.shield) S.shield.visible = false; if (S.glowC) S.glowC.visible = false; S.anim = null;
  };
})();
