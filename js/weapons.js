'use strict';
// Neue Waffen: Taschenpistole, Revolver, MP, Pumpgun, Scharfschützengewehr (Zoom), Minigun, Maschinengewehr, Armbrust,
// Raketenwerfer, Flammenwerfer, Blend-/Rauch-/Molotow-Granaten – dazu die eingebauten Waffen der Titan-Rüstung.
(function () {
  const L = window.L, T = THREE, P = L.player, E = L.ents, I = L.ITEMS;
  Object.assign(I, {
    taschenpistole: { name: 'Taschenpistole', slot: 'waffe', icon: '🔫', dmg: 18, rate: 0.18, noise: 45, range: 50, ammo: '9mm', mag: 6, spread: 0.02 },
    revolver: { name: 'Revolver', slot: 'waffe', icon: '🔫', dmg: 58, rate: 0.6, noise: 140, range: 110, ammo: '9mm', mag: 6, spread: 0.008 },
    mp: { name: 'Maschinenpistole', slot: 'waffe', icon: '🔫', dmg: 19, rate: 0.07, auto: true, noise: 100, range: 70, ammo: '9mm', mag: 32, spread: 0.03 },
    pumpgun: { name: 'Pumpgun', slot: 'waffe', icon: '💥', dmg: 17, pellets: 8, rate: 0.75, noise: 160, range: 35, ammo: 'schrot', mag: 8, spread: 0.08 },
    sniper: { name: 'Scharfschützengewehr', slot: 'waffe', icon: '🎯', dmg: 170, rate: 1.4, noise: 200, range: 450, ammo: 'scharfmuni', mag: 5, spread: 0.0008, zoom: 4 },
    minigun: { name: 'Minigun', slot: 'waffe', icon: '🔥', dmg: 22, rate: 0.045, auto: true, noise: 230, range: 150, ammo: 'gewehrmuni', mag: 200, spread: 0.035 },
    lmg: { name: 'Maschinengewehr', slot: 'waffe', icon: '🎯', dmg: 30, rate: 0.09, auto: true, noise: 180, range: 170, ammo: 'gewehrmuni', mag: 100, spread: 0.025 },
    armbrust: { name: 'Armbrust', slot: 'waffe', icon: '🏹', dmg: 95, rate: 1.1, noise: 6, range: 120, ammo: 'bolzen', mag: 1, spread: 0.004 },
    raketenwerfer: { name: 'Raketenwerfer', slot: 'waffe', icon: '🚀', dmg: 0, rate: 1.6, noise: 220, range: 400, ammo: 'raketen', mag: 1, spread: 0, rocket: true },
    flammenwerfer: { name: 'Flammenwerfer', slot: 'waffe', icon: '🔥', dmg: 0, rate: 0.06, auto: true, noise: 60, range: 16, ammo: 'treibstoff', mag: 100, spread: 0, flame: true },
    blendgranate: { name: 'Blendgranate', slot: 'granate', icon: '💥', stack: 10, throwable: 'flash' },
    rauchgranate: { name: 'Rauchgranate', slot: 'granate', icon: '💨', stack: 10, throwable: 'smoke' },
    molotow: { name: 'Molotow-Cocktail', slot: 'granate', icon: '🍾', stack: 10, throwable: 'fire' },
    scharfmuni: { name: 'Scharfschützen-Munition', slot: 'bag', icon: '🔶', stack: 40, amount: 5 },
    raketen: { name: 'Raketen', slot: 'bag', icon: '🧨', stack: 10, amount: 2 },
    treibstoff: { name: 'Treibstoff', slot: 'bag', icon: '⛽', stack: 300, amount: 100 },
    bolzen: { name: 'Armbrust-Bolzen', slot: 'bag', icon: '➶', stack: 30, amount: 6 },
    // Titan-Rüstung (eingebaut, ohne Munition)
    repulsor: { name: 'Hand-Blaster', slot: 'waffe', icon: '✋', dmg: 48, rate: 0.3, noise: 90, range: 140, ammo: null, mag: 1, spread: 0.004, energy: true, beamCol: 0x80e0ff },
    schulterkanone: { name: 'Schulter-Minigun', slot: 'waffe', icon: '🔥', dmg: 20, rate: 0.05, auto: true, noise: 200, range: 160, ammo: null, mag: 1, spread: 0.03, energy: true, beamCol: 0xffd060 },
    minirakete: { name: 'Mini-Raketen', slot: 'waffe', icon: '🚀', dmg: 0, rate: 0.9, noise: 200, range: 400, ammo: null, mag: 1, spread: 0, rocket: true, energy: true },
    brustlaser: { name: 'Brust-Laser', slot: 'waffe', icon: '🔆', dmg: 400, rate: 6, noise: 120, range: 300, ammo: null, mag: 1, spread: 0, energy: true, laser: true }
  });
  const V1 = new T.Vector3(), V2 = new T.Vector3();
  function aimRay(spread) {
    const dir = new T.Vector3(); L.camera.getWorldDirection(dir);
    if (spread) { dir.x += (Math.random() - 0.5) * spread * 2; dir.y += (Math.random() - 0.5) * spread * 2; dir.z += (Math.random() - 0.5) * spread * 2; dir.normalize(); }
    return dir;
  }
  function handPos() { const h = new T.Vector3(); if (P.rig && P.rig.hand) P.rig.hand.getWorldPosition(h); else h.set(P.x, (P.y || 0) + 1.4, P.z); return h; }
  // ---------- Raketen ----------
  const rockets = [];
  function launchRocket(dmg) {
    const dir = aimRay(0), from = handPos();
    const g = new T.Group(); const body = new T.Mesh(L.GEO.cyl, L.mat('#5a6050')); body.scale.set(0.12, 0.7, 0.12); body.rotation.x = Math.PI / 2; g.add(body);
    const tip = new T.Mesh(L.GEO.cone, L.mat('#c02a2a')); tip.scale.set(0.12, 0.25, 0.12); tip.rotation.x = Math.PI / 2; tip.position.z = 0.45; g.add(tip);
    const fl = new T.Mesh(L.GEO.cone, new T.MeshBasicMaterial({ color: 0xffa030 })); fl.scale.set(0.12, 0.5, 0.12); fl.rotation.x = -Math.PI / 2; fl.position.z = -0.6; g.add(fl);
    g.position.copy(from); g.lookAt(from.clone().add(dir)); L.scene.add(g);
    rockets.push({ g, dir, t: 0, dmg: dmg || 230 });
  }
  function boom(x, y, z, r, dmg) { L.explode(x, y, z, r, dmg, P, true); }
  // ---------- Feuer- und Rauchfelder ----------
  const zones = [];
  // ---------- Schuss-Haken (von fire() in game.js gerufen) ----------
  L.weaponFire = function (w, d) {
    if (!d) return false;
    if (d.energy) {
      // Rüstungswaffen: keine Munition
      P.fireCd = d.rate; P.recoil = Math.min(1.2, (P.recoil || 0) + (d.laser || d.rocket ? 1.2 : 0.35));
      if (d.rocket) { launchRocket(180); L.snd.gun('gewehr', { x: P.x, y: 1.5, z: P.z }); L.makeNoise(P.x, P.z, d.noise, P); return true; }
      const dir = aimRay(d.spread), o = L.camera.position, h = L.rayHit(o, dir, d.range + P.camDist, P.camDist + 0.3), end = new T.Vector3().copy(o).addScaledVector(dir, h.t), hand = handPos();
      if (d.laser) {
        const len = hand.distanceTo(end), m = new T.Mesh(new T.CylinderGeometry(0.35, 0.35, len, 10, 1, true), new T.MeshBasicMaterial({ color: 0xc8f8ff, transparent: true, opacity: 0.9, blending: T.AdditiveBlending, depthWrite: false, fog: false }));
        m.position.copy(hand).lerp(end, 0.5); m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), end.clone().sub(hand).normalize()); L.scene.add(m); beams.push({ m, t: 0 });
        L.env.bolt = 0.6; L.shake = Math.max(L.shake, 0.4); L.fx('#c8f8ff', end.x, end.y, end.z, 30, 10, { basic: true, size: 0.4, life: 0.6 });
      } else L.tracer(hand, end);
      if (h.ent) L.damageEnt(h.ent, d.dmg * h.mult, P.x, P.z, P);
      L.snd.gun(d.laser ? 'gewehr' : 'pistole', { x: P.x, y: 1.5, z: P.z }); L.makeNoise(P.x, P.z, d.noise, P);
      return true;
    }
    if (d.rocket) {
      if (w.mag <= 0) return false;
      w.mag--; P.fireCd = d.rate; P.recoil = 1.2; launchRocket(240);
      L.snd.gun('gewehr', { x: P.x, y: 1.5, z: P.z }); L.makeNoise(P.x, P.z, d.noise, P); L.shake = Math.max(L.shake, 0.3);
      return true;
    }
    if (d.flame) {
      if (w.mag <= 0) return false;
      w.mag--; P.fireCd = d.rate;
      const dir = aimRay(0), from = handPos();
      for (let k = 0; k < 3; k++) { const s = 2 + Math.random() * d.range; L.fx(Math.random() < 0.5 ? '#ff7a20' : '#ffd040', from.x + dir.x * s + L.rand(-0.6, 0.6), from.y + dir.y * s + L.rand(-0.4, 0.6), from.z + dir.z * s + L.rand(-0.6, 0.6), 1, 1.5, { basic: true, size: 0.35, life: 0.4 }); }
      const fx2 = Math.sin(P.camYaw), fz2 = Math.cos(P.camYaw);
      for (const e of (L._targets ? L._targets() : [])) { const dx = e.x - P.x, dz = e.z - P.z, dd = Math.hypot(dx, dz); if (dd > d.range || dd < 0.1) continue; if ((dx * fx2 + dz * fz2) / dd < 0.85) continue; L.damageEnt(e, 7, P.x, P.z, P); }
      if (Math.random() < 0.2) L.makeNoise(P.x, P.z, d.noise, P);
      return true;
    }
    return false;
  };
  // Zoom beim Zielen (Scharfschützengewehr)
  L.weaponZoom = function () { const st = L.selType && L.selType(); const d = st && I[st]; return P.aiming && d && d.zoom ? d.zoom : 1; };
  // ---------- Wurf-Granaten ----------
  L.throwableType = function () { const st = L.selType && L.selType(); return st && I[st] && I[st].throwable ? st : 'granate'; };
  L.grenadeBlow = function (type, x, y, z) {
    if (type === 'granate' || !I[type] || !I[type].throwable) { L.explode(x, y, z, 9, 160, P); return; }
    const kind = I[type].throwable;
    if (kind === 'flash') {
      L.fx('#ffffff', x, y + 1, z, 50, 14, { basic: true, size: 0.5, life: 0.5 }); L.snd.explosion({ x, y, z }); L.makeNoise(x, z, 60, P);
      for (const m of E.monsters) { if (m.dead) continue; const d = Math.hypot(m.x - x, m.z - z); if (d < 26) { m.stunT = 6; m.state = 'search'; m.prey = null; m.alertT = 0; m.timer = 6; m.cd = 6; } }
      const pd = Math.hypot(P.x - x, P.z - z);
      if (pd < 18 && !(L.suitOn && L.suitOn())) flash(1 - pd / 18);
      L.msg('💥 Blendgranate! Die Monster sind geblendet.', 2000);
    } else if (kind === 'smoke') {
      zones.push({ kind: 'smoke', x, z, r: 11, t: 0, dur: 14 });
      L.snd.explosion && L.nz && L.nz({ dur: 1.5, f: 800, type: 'bandpass', vol: 0.3, pos: { x, y, z } });
    } else if (kind === 'fire') {
      zones.push({ kind: 'fire', x, z, r: 6, t: 0, dur: 8 }); L.snd.explosion({ x, y, z }); L.makeNoise(x, z, 30, P);
      L.decal(x, z, 5, '#1a0a05');
    }
  };
  let flashEl = null;
  function flash(k) {
    if (!flashEl) { flashEl = document.createElement('div'); flashEl.style.cssText = 'position:fixed;inset:0;background:#fff;pointer-events:none;z-index:41;opacity:0;transition:opacity 2.5s'; document.body.appendChild(flashEl); }
    flashEl.style.transition = 'none'; flashEl.style.opacity = String(Math.min(1, 0.4 + k)); requestAnimationFrame(() => { flashEl.style.transition = 'opacity 2.5s'; flashEl.style.opacity = '0'; });
  }
  // ---------- jedes Bild ----------
  const beams = [];
  L.updateWeapons = function (dt) {
    updateAxes(dt);
    for (let i = beams.length - 1; i >= 0; i--) { const b = beams[i]; b.t += dt; b.m.material.opacity = 0.9 * (1 - b.t / 0.4); if (b.t > 0.4) { L.scene.remove(b.m); beams.splice(i, 1); } }
    for (let i = rockets.length - 1; i >= 0; i--) {
      const r = rockets[i]; r.t += dt; const step = 75 * dt, p = r.g.position;
      let hit = false;
      for (let k = 0; k < 4 && !hit; k++) {
        p.addScaledVector(r.dir, step / 4);
        const gy = L.floorAt ? (L.floorAt(p.x, p.z, p.y) || 0) : 0;
        if (p.y <= Math.max(gy, L.seaFloor(p.x, p.z)) + 0.2 || L.blockedAt(p.x, p.y, p.z)) hit = true;
        else for (const e of (L._targets ? L._targets() : [])) if (Math.hypot(e.x - p.x, e.z - p.z) < (e.kind === 'walker' || e.kind === 'boss' || e.kind === 'wboss' || e.kind === 'tentakel' ? 9 : 2.2) && Math.abs((e.y || e.hy || 1) - p.y) < 12) { hit = true; break; }
      }
      if (Math.random() < dt * 40) L.fx('#d8d8d8', p.x, p.y, p.z, 1, 0.5, { size: 0.3, life: 1, g: -0.1, grow: 0.8 });
      if (hit || r.t > 6) { L.scene.remove(r.g); rockets.splice(i, 1); boom(p.x, p.y, p.z, 8, r.dmg); }
    }
    for (let i = zones.length - 1; i >= 0; i--) {
      const z = zones[i]; z.t += dt;
      if (z.kind === 'smoke') {
        if (Math.random() < dt * 25) L.fx(Math.random() < 0.5 ? '#9a9a9a' : '#c8c8c8', z.x + L.rand(-z.r, z.r) * 0.7, L.rand(0.5, 4), z.z + L.rand(-z.r, z.r) * 0.7, 1, 0.4, { size: 2.2, life: 3.5, g: -0.05, grow: 1.4 });
        if (Math.hypot(P.x - z.x, P.z - z.z) < z.r) for (const m of E.monsters) if (m.prey === P && Math.hypot(m.x - P.x, m.z - P.z) > 3) { m.prey = null; m.state = 'search'; m.timer = 4; }
      } else {
        if (Math.random() < dt * 30) L.fx(Math.random() < 0.5 ? '#ff6a10' : '#ffd040', z.x + L.rand(-z.r, z.r) * 0.8, 0.5, z.z + L.rand(-z.r, z.r) * 0.8, 1, 1.5, { basic: true, size: 0.5, life: 0.7, g: -0.6 });
        z.acc = (z.acc || 0) + dt;
        if (z.acc > 0.5) { z.acc = 0; for (const e of (L._targets ? L._targets() : [])) if (Math.hypot(e.x - z.x, e.z - z.z) < z.r) L.damageEnt(e, 18, z.x, z.z, P); if (Math.hypot(P.x - z.x, P.z - z.z) < z.r) L.hurtPlayer(7, 'Im eigenen Feuer verbrannt'); }
      }
      if (z.t > z.dur) zones.splice(i, 1);
    }
  };
  L.clearWeapons = function () { for (const a of axes) L.scene.remove(a.m); axes.length = 0; for (const r of rockets) L.scene.remove(r.g); rockets.length = 0; zones.length = 0; for (const b of beams) L.scene.remove(b.m); beams.length = 0; };
  // ---------- neue Waffen auch in Kisten und Gebäuden ----------
  const NEW = ['taschenpistole', 'revolver', 'mp', 'pumpgun', 'sniper', 'minigun', 'lmg', 'armbrust', 'raketenwerfer', 'flammenwerfer', 'blendgranate', 'rauchgranate', 'molotow', 'scharfmuni', 'raketen', 'treibstoff', 'bolzen', 'scharfmuni', 'bolzen', 'blendgranate'];
  L.NEW_WEAPONS = NEW;
  const orr = L.rollLoot;
  if (orr) L.rollLoot = (poi) => (Math.random() < (poi === 'militaer' || poi === 'polizei' ? 0.45 : 0.25) ? L.pick(NEW) : orr(poi));

  // ---------- Animationen ----------
  // Donneraxt: fliegt drehend zum Ziel und kommt zurück in die Hand
  const axes = [];
  L.axeThrow = function (from, to) {
    const m = L.buildItem('donneraxt'); m.scale.setScalar(2.2); m.position.copy(from); L.scene.add(m);
    axes.push({ m, from, to, t: 0, dur: Math.min(0.45, 0.12 + from.distanceTo(to) / 400) });
  };
  function updateAxes(dt) {
    for (let i = axes.length - 1; i >= 0; i--) {
      const a = axes[i]; a.t += dt; const u = a.t / a.dur, back = new T.Vector3(); if (P.rig && P.rig.hand) P.rig.hand.getWorldPosition(back); else back.copy(a.from);
      if (u < 1) a.m.position.lerpVectors(a.from, a.to, u); else a.m.position.lerpVectors(a.to, back, Math.min(1, u - 1));
      a.m.rotation.set(0, Math.atan2(a.to.x - a.from.x, a.to.z - a.from.z), 0); a.m.rotateX(a.t * 28);
      if (Math.random() < dt * 60) L.fx('#9ae0ff', a.m.position.x, a.m.position.y, a.m.position.z, 1, 0.5, { basic: true, size: 0.15, life: 0.3 });
      if (u >= 2) { L.scene.remove(a.m); axes.splice(i, 1); L.shake = Math.max(L.shake, 0.15); }
    }
  }
  L.axeOut = () => axes.length > 0;
  // nach der Spieler-Animation: Rückstoß, Axt weg während des Wurfs, Düsen und Schulterkanone der Titan-Rüstung
  L.afterPlayerAnim = function (r, dt) {
    P.recoil = Math.max(0, (P.recoil || 0) - dt * 7);
    if (P.recoil > 0) for (const a of r.arms || []) { a.arm.rotation.x -= P.recoil * 0.28; if (a.elbow) a.elbow.rotation.x += P.recoil * 0.2; }
    if (r.held) r.held.visible = !(r.heldType === 'donneraxt' && axes.length);
    if (r.scannon) {
      const st = L.selType && L.selType(), on = st === 'schulterkanone';
      r.scannon.rotation.x += ((on ? -0.25 : 0.5) - r.scannon.rotation.x) * Math.min(1, dt * 8);
      if (on && P.fireCd > 0) { r.scannon.rotation.z += dt * 40; }
    }
    if (r.app && r.app.special === 'titan') {
      if (!r.jets) {
        r.jets = [];
        for (const s of [-1, 1]) { const f = new T.Mesh(L.GEO.cone, new T.MeshBasicMaterial({ color: 0x60d0ff, transparent: true, opacity: 0.8, blending: T.AdditiveBlending, depthWrite: false })); f.scale.set(0.12, 0.6, 0.12); f.rotation.x = Math.PI; f.position.set(s * 0.1, -0.15, -0.36); r.torso.add(f); r.jets.push(f); }
        for (const l of r.legs) { const f = new T.Mesh(L.GEO.cone, new T.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: 0.8, blending: T.AdditiveBlending, depthWrite: false })); f.scale.set(0.1, 0.5, 0.1); f.rotation.x = Math.PI; f.position.set(0, -0.8, 0); l.knee.add(f); r.jets.push(f); }
      }
      const fl = !!P.flying;
      for (const f of r.jets) { f.visible = fl; if (fl) { const k = 0.8 + Math.random() * 0.5; f.scale.y = (f.parent === r.torso ? 0.6 : 0.5) * k; } }
      if (fl && Math.random() < dt * 25) L.fx('#ffc080', P.x + L.rand(-0.2, 0.2), (P.y || 0) - 0.1, P.z + L.rand(-0.2, 0.2), 1, 1, { basic: true, size: 0.12, life: 0.4, g: 4 });
    }
  };
})();
