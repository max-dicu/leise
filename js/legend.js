'use strict';
// Boss-Waffen: Jeder Boss hat eigene Belohnungen.
// Besiegst du ihn, lässt er sie fallen. Überlebst du ihn, erscheint am sicheren Ort (Zuflucht / Burger) eine Riesenkiste –
// nur wer sie öffnet, bekommt die Sachen. Alles eigene Entwürfe.
(function () {
  const L = window.L, T = THREE, P = L.player, E = L.ents, I = L.ITEMS;
  const LEG = {
    thorhammer: { name: 'Donnerhammer', icon: '⚒️', legend: 'hammer', dmg: 150, rate: 1.2, noise: 120, range: 140 },
    odinspeer: { name: 'Allvater-Speer', icon: '🔱', legend: 'spear', dmg: 260, rate: 1.0, noise: 60, range: 250 },
    lokidolch: { name: 'Trickster-Dolch', icon: '🗡️', legend: 'dagger', dmg: 140, rate: 0.45, noise: 10, range: 3.6 },
    eisstab: { name: 'Frost-Stab', icon: '❄️', legend: 'frost', dmg: 60, rate: 0.8, noise: 50, range: 130 },
    lavafaust: { name: 'Lava-Faust', icon: '🌋', legend: 'lava', dmg: 200, rate: 1.1, noise: 150, range: 220 },
    geisterlaterne: { name: 'Geister-Laterne', icon: '🏮', legend: 'ghost', dmg: 0, rate: 1, noise: 0, range: 0, cd: 25 },
    wurmzahn: { name: 'Wurmzahn-Klinge', icon: '🦷', legend: 'tooth', dmg: 180, rate: 0.8, noise: 40, range: 4.8 },
    urwaldbogen: { name: 'Urwald-Bogen', icon: '🏹', legend: 'bow', dmg: 150, rate: 0.7, noise: 8, range: 240 },
    kristallwerfer: { name: 'Kristall-Werfer', icon: '💎', legend: 'crystal', dmg: 35, pellets: 7, rate: 0.9, noise: 110, range: 70, spread: 0.06 },
    ninabesen: { name: 'Ninas Besen', icon: '🧹', legend: 'broom', dmg: 90, rate: 1.0, noise: 30, range: 6.5 },
    burgerkanone: { name: 'Burger-Kanone', icon: '🍔', legend: 'burger', dmg: 220, rate: 1.1, noise: 160, range: 260 }
  };
  for (const [k, d] of Object.entries(LEG)) I[k] = Object.assign({ slot: 'waffe', ammo: null, mag: 1, spread: 0, energy: true, boss: true }, d);
  I.sporenbombe = { name: 'Sporen-Bombe', slot: 'granate', icon: '🍄', stack: 10, throwable: 'spore', boss: true };

  // Belohnungen je Boss
  const LOOT = {
    thor: [['thorhammer', 1]], odin: [['odinspeer', 1]], loki: [['lokidolch', 1]], ymir: [['eisstab', 1]], lava: [['lavafaust', 1]],
    geist: [['geisterlaterne', 1]], wurm: [['wurmzahn', 1]], urwald: [['urwaldbogen', 1]], sporen: [['sporenbombe', 6]], golem: [['kristallwerfer', 1]],
    nina: [['ninabesen', 1]], bernhard: [['burgerkanone', 1]]
  };
  const NAMES = { bernhard: 'BERNHARD' };
  const bossName = (id) => NAMES[id] || ((L.ISLAND_BOSSES && L.ISLAND_BOSSES[id]) ? L.ISLAND_BOSSES[id].name : id.toUpperCase());

  // ---------- Modelle (an L.buildItem angehängt) ----------
  const G = () => L.GEO;
  function part(geo, color, sx, sy, sz, x, y, z, parent, o) { const m = new T.Mesh(geo, L.mat(color, o)); m.scale.set(sx, sy, sz); m.position.set(x, y, z); if (parent) parent.add(m); return m; }
  const along = (m) => { m.rotation.x = Math.PI / 2; return m; };
  function legModel(type) {
    const g = new T.Group(), box = G().box, cyl = G().cyl, sph = G().sph, cone = G().cone;
    switch (type) {
      case 'thorhammer': along(part(cyl, '#5a3a20', 0.035, 0.5, 0.035, 0, 0, 0.15, g)); part(box, '#9aa4b0', 0.2, 0.16, 0.16, 0, 0, 0.45, g); for (const s of [-1, 1]) part(box, '#d4af37', 0.03, 0.17, 0.17, s * 0.07, 0, 0.45, g); part(sph, '#9ae0ff', 0.04, 0.04, 0.04, 0, 0.09, 0.45, g, { basic: true }); break;
      case 'odinspeer': along(part(cyl, '#6a4a2a', 0.022, 1.7, 0.022, 0, 0, 0.5, g)); along(part(cone, '#e8d070', 0.05, 0.22, 0.05, 0, 0, 1.45, g)); part(box, '#d4af37', 0.1, 0.02, 0.04, 0, 0, 1.3, g); break;
      case 'lokidolch': part(box, '#3a6a3a', 0.03, 0.05, 0.3, 0, 0, 0.22, g); part(box, '#d4af37', 0.12, 0.03, 0.03, 0, 0, 0.06, g); part(box, '#2a1a3a', 0.03, 0.04, 0.12, 0, 0, -0.03, g); break;
      case 'eisstab': along(part(cyl, '#8ab0d0', 0.025, 1.1, 0.025, 0, 0, 0.3, g)); { const c = along(part(cone, '#c8f0ff', 0.08, 0.25, 0.08, 0, 0, 0.95, g, { basic: true })); c.material.transparent = true; c.material.opacity = 0.85; } break;
      case 'lavafaust': part(sph, '#3a2a24', 0.13, 0.11, 0.15, 0, 0, 0.05, g); for (let k = 0; k < 4; k++) part(box, '#ff6a10', 0.02, 0.02, 0.1, -0.06 + k * 0.04, 0.08, 0.08, g, { basic: true }); break;
      case 'geisterlaterne': part(box, '#2a2a2a', 0.14, 0.02, 0.14, 0, 0.12, 0, g); part(box, '#2a2a2a', 0.14, 0.02, 0.14, 0, -0.08, 0, g); { const c = part(box, '#b0ffd0', 0.11, 0.18, 0.11, 0, 0.02, 0, g, { basic: true }); c.material.transparent = true; c.material.opacity = 0.8; } part(box, '#2a2a2a', 0.02, 0.08, 0.02, 0, 0.17, 0, g); break;
      case 'wurmzahn': part(box, '#4a3a2a', 0.04, 0.05, 0.16, 0, 0, 0, g); { const c = along(part(cone, '#f0e8d0', 0.07, 0.65, 0.04, 0, 0, 0.4, g)); c.rotation.z = 0.15; } break;
      case 'urwaldbogen': { const b = new T.Mesh(new T.TorusGeometry(0.42, 0.02, 6, 16, Math.PI), L.mat('#3a6a2a')); b.rotation.set(0, Math.PI / 2, Math.PI / 2); b.position.z = 0.05; g.add(b); part(box, '#e8e8d8', 0.005, 0.84, 0.005, 0, 0, 0.05, g); for (let k = 0; k < 3; k++) part(sph, '#60c040', 0.04, 0.03, 0.04, 0, -0.3 + k * 0.3, 0.05 + Math.abs(k - 1) * 0.0, g); break; }
      case 'kristallwerfer': part(box, '#3a3a4a', 0.07, 0.09, 0.55, 0, 0, 0.22, g); for (let k = 0; k < 4; k++) { const c = part(cone, k % 2 ? '#a0e0ff' : '#c0a0ff', 0.04, 0.16, 0.04, (k - 1.5) * 0.04, 0.1, 0.1 + k * 0.1, g, { basic: true }); c.rotation.z = (k - 1.5) * 0.3; } part(box, '#3a3a4a', 0.05, 0.13, 0.06, 0, -0.08, 0, g); break;
      case 'ninabesen': along(part(cyl, '#8a5a2a', 0.025, 1.3, 0.025, 0, 0, 0.35, g)); { const h = new T.Mesh(new T.CylinderGeometry(0.05, 0.16, 0.42, 12), L.mat('#e0bc5a')); h.rotation.x = Math.PI / 2; h.position.z = 1.1; g.add(h); const r = new T.Mesh(new T.CylinderGeometry(0.07, 0.07, 0.04, 12), L.mat('#b03a3a')); r.rotation.x = Math.PI / 2; r.position.z = 0.93; g.add(r); } break;
      case 'burgerkanone': along(part(cyl, '#c02a2a', 0.07, 0.6, 0.07, 0, 0, 0.25, g)); part(sph, '#d8a050', 0.09, 0.05, 0.09, 0, 0.11, 0.1, g); part(box, '#5a3a20', 0.13, 0.03, 0.13, 0, 0.07, 0.1, g); part(box, '#5a3a20', 0.05, 0.12, 0.06, 0, -0.08, 0.02, g); break;
      case 'sporenbombe': part(sph, '#e8e0d0', 0.05, 0.07, 0.05, 0, -0.03, 0, g); part(sph, '#c02a4a', 0.1, 0.06, 0.1, 0, 0.04, 0, g); for (let k = 0; k < 4; k++) part(sph, '#ffffff', 0.02, 0.012, 0.02, Math.sin(k * 1.6) * 0.06, 0.08, Math.cos(k * 1.6) * 0.06, g); break;
      default: return null;
    }
    return g;
  }
  const obi = L.buildItem;
  L.buildItem = function (type, inHand) {
    if (LEG[type] || type === 'sporenbombe') { const g = legModel(type); if (g) { g.traverse((o) => { if (o.isMesh) o.castShadow = true; }); return g; } }
    return obi(type, inHand);
  };

  // ---------- Hilfen ----------
  const camDir = () => { const d = new T.Vector3(); L.camera.getWorldDirection(d); return d; };
  const handPos = () => { const h = new T.Vector3(); if (P.rig && P.rig.hand) P.rig.hand.getWorldPosition(h); else h.set(P.x, (P.y || 0) + 1.4, P.z); return h; };
  const targets = () => (L._targets ? L._targets() : []);
  const centerOf = (e) => { if (e.rig && e.rig.root) { const b = new T.Box3().setFromObject(e.rig.root); if (isFinite(b.min.y)) return b.getCenter(new T.Vector3()); } return new T.Vector3(e.x, (e.y || 0) + 1.3, e.z); };
  function aimHit(range) { const o = L.camera.position, d = camDir(); const h = L.rayHit(o, d, range + P.camDist, P.camDist + 0.3); return { h, end: new T.Vector3().copy(o).addScaledVector(d, h.t), dir: d }; }
  function stun(e, s) { if (L.MK && L.MK[e.kind]) e.stunT = Math.max(e.stunT || 0, s); }
  function area(x, y, z, r, dmg, skip) { for (const e of targets()) { if (e === skip || e.kind === 'bern') continue; const d = Math.hypot(e.x - x, e.z - z); if (d < r + (e.bigR || 0)) L.damageEnt(e, dmg * (1 - Math.min(d, r) / (r * 1.6)), x, z, P); } }
  function bolt(x, y, z) {
    const pts = []; for (let i = 0; i <= 10; i++) { const u = i / 10; pts.push(new T.Vector3(x + (i && i < 10 ? L.rand(-2, 2) : 0), L.lerp(y + 70, y, u), z + (i && i < 10 ? L.rand(-2, 2) : 0))); }
    const ln = new T.Line(new T.BufferGeometry().setFromPoints(pts), new T.LineBasicMaterial({ color: 0xc8f0ff, fog: false })); L.scene.add(ln); setTimeout(() => L.scene.remove(ln), 200);
    L.env.bolt = 1; L.snd.thunder && L.snd.thunder(0.02); L.fx('#c8f0ff', x, y + 0.5, z, 40, 12, { basic: true, size: 0.4, life: 0.7 }); L.shake = Math.max(L.shake, 0.6);
  }
  // Nahkampf im Bogen vor dir
  function melee(range, arc, dmg, knock, stunS, fxCol) {
    P.swing = 0; P.hammerHit = true; L.snd.swing && L.snd.swing();
    const fx = Math.sin(P.camYaw), fz = Math.cos(P.camYaw); let n = 0;
    for (const e of targets()) {
      if (e.kind === 'bern') continue;
      const dx = e.x - P.x, dz = e.z - P.z, d = Math.hypot(dx, dz), reach = range + (e.bigR || 0);
      if (d > reach || (d > 0.5 && (dx * fx + dz * fz) / d < arc)) continue;
      const sneak = P.stance !== 'stand' && e.state !== 'chase' && e.state !== 'attack';
      L.damageEnt(e, dmg * (sneak ? 2 : 1), P.x, P.z, P); n++;
      if (stunS) stun(e, stunS);
      if (knock && L.MK && L.MK[e.kind] && !e.dead) { const k = knock / Math.max(d, 0.5); const nx = e.x + dx * k, nz = e.z + dz * k; if (!L.queryBoxes(nx, nz, 0.8).length) { e.x = nx; e.z = nz; } }
      L.fx(fxCol, e.x, 1.5, e.z, 10, 4, { basic: true, size: 0.15, life: 0.5 });
    }
    return n;
  }

  // ---------- Geschosse (Speer, Lava, Pfeil, Burger, geworfener Hammer) ----------
  const projs = [], zones = [], poison = [];
  let ghostT = 0;
  function launch(kind, mesh, speed, dmg, opt) {
    const from = handPos(), dir = camDir();
    mesh.position.copy(from); mesh.lookAt(from.clone().add(dir)); L.scene.add(mesh);
    projs.push(Object.assign({ kind, g: mesh, vel: dir.clone().multiplyScalar(speed), t: 0, dmg, grav: 0 }, opt || {}));
  }
  function seekTarget(range) {
    const d = camDir(), o = L.camera.position; let best = null, bs = 0.9;
    for (const e of targets()) { if (e.kind === 'bern') continue; const c = centerOf(e), v = c.clone().sub(o), dist = v.length(); if (dist > range) continue; const s = v.normalize().dot(d); if (s > bs) { bs = s; best = e; } }
    return best;
  }
  function projHit(p, x, y, z, ent, mult) {
    if (p.kind === 'spear') { if (ent) { L.damageEnt(ent, p.dmg * (mult || 1), P.x, P.z, P); L.fx('#ffe080', x, y, z, 20, 6, { basic: true, size: 0.2, life: 0.6 }); } else L.fx('#c8b080', x, y, z, 10, 3, { size: 0.2, life: 0.6 }); }
    else if (p.kind === 'lava') { L.explode(x, y, z, 6, p.dmg, P, true); L.grenadeBlow && L.grenadeBlow('molotow', x, y, z); }
    else if (p.kind === 'arrow') { if (ent) { L.damageEnt(ent, p.dmg * (mult || 1), P.x, P.z, P); poison.push({ e: ent, t: 5, acc: 0 }); L.fx('#60e040', x, y, z, 14, 3, { basic: true, size: 0.15, life: 0.8 }); } }
    else if (p.kind === 'burger') { L.explode(x, y, z, 7, p.dmg, P, true); for (const c of ['#d8a050', '#5a3a20', '#60c040', '#e03a2a', '#ffd040']) L.fx(c, x, y + 0.5, z, 8, 9, { size: 0.3, life: 1.2 }); }
  }
  function updateProjs(dt) {
    for (let i = projs.length - 1; i >= 0; i--) {
      const p = projs[i]; p.t += dt;
      if (p.kind === 'hammer') {
        // fliegt drehend zum Ziel, Blitz einschlagen lassen, zurück in die Hand
        const u = p.t / p.dur, back = handPos();
        if (u < 1) p.g.position.lerpVectors(p.from, p.to, u); else p.g.position.lerpVectors(p.to, back, Math.min(1, u - 1));
        p.g.rotation.set(0, Math.atan2(p.to.x - p.from.x, p.to.z - p.from.z), 0); p.g.rotateX(p.t * 26);
        if (u >= 1 && !p.struck) { p.struck = true; bolt(p.to.x, p.to.y, p.to.z); if (p.ent) L.damageEnt(p.ent, p.dmg * (p.mult || 1), P.x, P.z, P); area(p.to.x, p.to.y, p.to.z, 7, p.dmg * 0.6, p.ent); }
        if (Math.random() < dt * 50) L.fx('#9ae0ff', p.g.position.x, p.g.position.y, p.g.position.z, 1, 0.6, { basic: true, size: 0.15, life: 0.3 });
        if (u >= 2) { L.scene.remove(p.g); projs.splice(i, 1); }
        continue;
      }
      if (p.seek && !p.seek.dead) { const c = centerOf(p.seek), want = c.sub(p.g.position).normalize().multiplyScalar(p.vel.length()); p.vel.lerp(want, Math.min(1, dt * 6)); }
      p.vel.y -= p.grav * dt;
      const from = p.g.position.clone(), step = p.vel.length() * dt, dir = p.vel.clone().normalize();
      const h = L.rayHit(from, dir, step + 0.5, 0);
      if (h.ent || h.wall || h.t < step) {
        const hp = from.clone().addScaledVector(dir, Math.min(h.t, step));
        L.scene.remove(p.g); projs.splice(i, 1); projHit(p, hp.x, hp.y, hp.z, h.ent, h.mult); continue;
      }
      p.g.position.addScaledVector(dir, step); p.g.lookAt(p.g.position.clone().add(dir));
      if (p.kind === 'burger') p.g.rotateX(p.t * 8);
      const gy = Math.max(L.seaFloor(p.g.position.x, p.g.position.z), 0);
      if (p.g.position.y < gy || p.t > 6) { L.scene.remove(p.g); projs.splice(i, 1); projHit(p, p.g.position.x, Math.max(gy, p.g.position.y), p.g.position.z, null); continue; }
      if (Math.random() < dt * 40) L.fx(p.kind === 'lava' ? '#ff6a10' : p.kind === 'arrow' ? '#80ff60' : p.kind === 'spear' ? '#ffe080' : '#ffd090', p.g.position.x, p.g.position.y, p.g.position.z, 1, 0.4, { basic: true, size: 0.15, life: 0.4 });
    }
  }

  // ---------- Schießen ----------
  function legendFire(w, d) {
    P.fireCd = d.rate;
    const kind = d.legend;
    L.makeNoise && d.noise && L.makeNoise(P.x, P.z, d.noise, P);
    P.recoil = Math.min(1.2, (P.recoil || 0) + 0.6);
    if (kind === 'hammer') {
      const a = aimHit(d.range), from = handPos(), m = L.buildItem('thorhammer'); m.scale.setScalar(2.4); m.position.copy(from); L.scene.add(m);
      projs.push({ kind: 'hammer', g: m, from, to: a.end.clone(), t: 0, dur: Math.min(0.5, 0.12 + from.distanceTo(a.end) / 300), dmg: d.dmg, ent: a.h.ent, mult: a.h.mult });
      L.snd.swing && L.snd.swing();
    } else if (kind === 'spear') {
      const m = L.buildItem('odinspeer'); m.scale.setScalar(1.6); launch('spear', m, 110, d.dmg, { seek: seekTarget(d.range) });
      L.snd.swing && L.snd.swing();
    } else if (kind === 'lava') {
      const m = new T.Mesh(L.GEO.sph, new T.MeshBasicMaterial({ color: 0xff6a10 })); m.scale.setScalar(0.45); launch('lava', m, 70, d.dmg);
      L.snd.gun && L.snd.gun('gewehr', { x: P.x, y: 1.5, z: P.z });
    } else if (kind === 'bow') {
      const m = new T.Group(); const s = new T.Mesh(L.GEO.cyl, L.mat('#6a4a2a')); s.scale.set(0.015, 0.8, 0.015); s.rotation.x = Math.PI / 2; m.add(s); const tip = new T.Mesh(L.GEO.cone, L.mat('#60c040', { basic: true })); tip.scale.set(0.04, 0.1, 0.04); tip.rotation.x = Math.PI / 2; tip.position.z = 0.45; m.add(tip);
      launch('arrow', m, 150, d.dmg, { grav: 3 });
    } else if (kind === 'burger') {
      const m = new T.Group(); for (const [c, y, s] of [['#d8a050', 0.09, 0.16], ['#60c040', 0.04, 0.17], ['#5a3a20', 0, 0.16], ['#ffd040', -0.03, 0.17], ['#c8904a', -0.07, 0.15]]) { const l = new T.Mesh(L.GEO.sph, L.mat(c)); l.scale.set(s, 0.035, s); l.position.y = y; m.add(l); } m.scale.setScalar(2.2); launch('burger', m, 55, d.dmg, { grav: 9 });
      L.snd.gun && L.snd.gun('gewehr', { x: P.x, y: 1.5, z: P.z });
    } else if (kind === 'frost') {
      const a = aimHit(d.range), hand = handPos();
      L.tracer && L.tracer(hand, a.end); L.fx('#c8f0ff', a.end.x, a.end.y, a.end.z, 26, 6, { basic: true, size: 0.25, life: 0.9 });
      if (a.h.ent) { L.damageEnt(a.h.ent, d.dmg * a.h.mult, P.x, P.z, P); stun(a.h.ent, 4); }
      for (const e of targets()) if (Math.hypot(e.x - a.end.x, e.z - a.end.z) < 5) stun(e, 3);
      L.snd.gun && L.snd.gun('pistole', { x: P.x, y: 1.5, z: P.z });
    } else if (kind === 'crystal') {
      const o = L.camera.position, hand = handPos();
      for (let k = 0; k < d.pellets; k++) {
        const dir = camDir(); dir.x += L.rand(-d.spread, d.spread); dir.y += L.rand(-d.spread, d.spread); dir.z += L.rand(-d.spread, d.spread); dir.normalize();
        const h = L.rayHit(o, dir, d.range + P.camDist, P.camDist + 0.3), end = new T.Vector3().copy(o).addScaledVector(dir, h.t);
        L.tracer && L.tracer(hand, end); if (h.ent) L.damageEnt(h.ent, d.dmg * h.mult, P.x, P.z, P);
      }
      L.snd.gun && L.snd.gun('schrotflinte', { x: P.x, y: 1.5, z: P.z });
    } else if (kind === 'dagger') {
      const n = melee(d.range, 0.5, d.dmg, 0, 0, '#60ff80');
      if (n) for (const m of E.monsters) if (m.prey === P && Math.hypot(m.x - P.x, m.z - P.z) > 2) { m.prey = null; m.state = 'search'; m.timer = 3; }
    } else if (kind === 'tooth') {
      melee(d.range, 0.2, d.dmg, 2, 0.8, '#f0e8d0'); L.shake = Math.max(L.shake, 0.3);
    } else if (kind === 'broom') {
      // Rundum-Feger: alles in der Nähe wird weggefegt
      const n = melee(d.range, -1.1, d.dmg, 7, 1.5, '#e0bc5a');
      for (let k = 0; k < 24; k++) { const a = k / 24 * 6.283; L.fx('#e8d8a0', P.x + Math.sin(a) * 3, (P.y || 0) + 0.5, P.z + Math.cos(a) * 3, 1, 3, { size: 0.35, life: 0.6 }); }
      if (n) L.msg('🧹 Weggefegt!', 900);
    } else if (kind === 'ghost') {
      const now = performance.now();
      if ((w.cdUntil || 0) > now) { L.msg('🏮 Die Laterne lädt noch ' + Math.ceil((w.cdUntil - now) / 1000) + ' s', 1200); P.fireCd = 0.3; return true; }
      w.cdUntil = now + d.cd * 1000; ghostT = 10;
      L.msg('🏮 Geisternebel! 10 Sekunden lang verlieren die Monster deine Spur.', 3000);
      L.snd.teleport && L.snd.teleport({ x: P.x, y: 1, z: P.z });
    }
    return true;
  }
  const owf = L.weaponFire;
  L.weaponFire = function (w, d) { if (d && d.legend) return legendFire(w, d); return owf ? owf(w, d) : false; };

  // Sporen-Bombe: Giftwolke (dir selbst macht sie nichts)
  const ogb = L.grenadeBlow;
  L.grenadeBlow = function (type, x, y, z) {
    if (type === 'sporenbombe') { zones.push({ x, z, r: 8, t: 0, dur: 10, acc: 0 }); L.nz && L.nz({ dur: 1.2, f: 400, type: 'lowpass', vol: 0.3, pos: { x, y, z } }); return; }
    return ogb ? ogb(type, x, y, z) : L.explode(x, y, z, 9, 160, P);
  };

  // ---------- Riesenkiste am sicheren Ort ----------
  const chests = [];
  function chestMesh(label) {
    const g = new T.Group();
    const b = new T.Mesh(L.GEO.boxB, L.mat('#5a2a7a')); b.scale.set(1.2, 0.8, 0.8); g.add(b);
    for (const x of [-0.45, 0, 0.45]) { const s = new T.Mesh(L.GEO.boxB, L.mat('#d4af37')); s.scale.set(0.08, 0.82, 0.82); s.position.x = x; g.add(s); }
    const lid = new T.Group(); lid.position.set(0, 0.8, -0.42); g.add(lid);
    const lm = new T.Mesh(L.GEO.boxB, L.mat('#6a3a8a')); lm.scale.set(1.24, 0.14, 0.84); lm.position.z = 0.42; lid.add(lm);
    const lk = new T.Mesh(L.GEO.box, L.mat('#ffd040', { basic: true })); lk.scale.set(0.18, 0.2, 0.06); lk.position.set(0, 0.62, 0.42); g.add(lk);
    g.scale.setScalar(3.4);
    // Lichtsäule, damit man sie von weitem sieht
    const beam = new T.Mesh(new T.CylinderGeometry(0.35, 0.35, 60, 12, 1, true), new T.MeshBasicMaterial({ color: 0xffd040, transparent: true, opacity: 0.35, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }));
    beam.position.y = 30; g.add(beam); beam.scale.set(1 / 3.4, 1 / 3.4, 1 / 3.4); beam.position.y = 30 / 3.4;
    const tag = new T.Sprite(new T.SpriteMaterial({ map: L.textTex('🎁 ' + label, 512, 90, '#3a1a4a', '#ffd040', 'bold 44px Arial'), depthTest: false, transparent: true }));
    tag.scale.set(1.6, 0.28, 1); tag.position.y = 1.6; g.add(tag);
    g.userData = { lid, beam };
    return g;
  }
  L.spawnGiantChest = function (x, z, y, items, label) {
    const g = chestMesh(label); g.position.set(x, y || 0, z); L.scene.add(g);
    chests.push({ x, z, y: y || 0, g, items, label, open: false, t: 0 });
    L.snd.horn && L.snd.horn({ x, y: 5, z });
  };
  function nearChest() { for (const c of chests) if (!c.open && Math.hypot(P.x - c.x, P.z - c.z) < 5 && Math.abs((P.y || 0) - c.y) < 4) return c; return null; }
  const och = L.crateHint, oci = L.crateInteract;
  L.crateHint = () => { if (!P.vehicle) { const c = nearChest(); if (c) return 'E: 🎁 ' + c.label + ' öffnen'; } return och ? och() : null; };
  L.crateInteract = function () {
    const c = !P.vehicle && nearChest();
    if (!c) return oci ? oci() : false;
    c.open = true; c.t = 0;
    const got = [];
    for (const [ty, n] of c.items) { const left = L.giveItem(ty, n, I[ty] ? I[ty].mag : undefined); if (left > 0) L.spawnItem(ty, P.x + L.rand(-1.5, 1.5), P.z + L.rand(-1.5, 1.5), left, undefined, undefined, undefined, P.y, true); got.push(I[ty].icon + ' ' + I[ty].name + (n > 1 ? ' ×' + n : '')); }
    if (L.round) L.round.coins = (L.round.coins || 0) + 150;
    L.banner('🎁 ' + c.label, got.join(' · ') + ' · 🪙 +150');
    L.snd.codeOk ? L.snd.codeOk() : (L.snd.pickup && L.snd.pickup());
    L.fx('#ffd040', c.x, c.y + 3, c.z, 60, 10, { basic: true, size: 0.3, life: 1.4 });
    return true;
  };
  function updateChests(dt) {
    const t = performance.now() / 1000;
    for (let i = chests.length - 1; i >= 0; i--) {
      const c = chests[i], u = c.g.userData;
      u.beam.material.opacity = c.open ? Math.max(0, u.beam.material.opacity - dt * 0.3) : 0.25 + Math.sin(t * 3) * 0.1;
      if (!c.open && Math.random() < dt * 6) L.fx('#ffe080', c.x + L.rand(-2, 2), c.y + L.rand(0.5, 3.5), c.z + L.rand(-2, 2), 1, 0.6, { basic: true, size: 0.15, life: 1 });
      if (c.open) { c.t += dt; const e = 1 - Math.pow(1 - Math.min(1, c.t / 0.8), 3); u.lid.rotation.x = -1.9 * e; if (c.t > 40) { L.scene.remove(c.g); chests.splice(i, 1); } }
    }
  }

  // ---------- Belohnung nach dem Boss ----------
  // how: 'defeat' = besiegt (Sachen fallen hier auf den Boden) · 'survive' = überlebt (Riesenkiste am sicheren Ort)
  L.bossReward = function (id, x, z, y, how) {
    const items = (LOOT[id] || []).concat([['gold', 2], ['medkit', 1]]);
    const name = bossName(id);
    if (how === 'survive') {
      L.spawnGiantChest(x, z, y, items, name + '-KISTE');
      L.msg('🎁 Du hast ' + name + ' überlebt! Am sicheren Ort steht jetzt eine RIESENKISTE – öffne sie (E)!', 8000);
    } else {
      for (const [ty, n] of items) L.spawnItem(ty, x + L.rand(-4, 4), z + L.rand(-4, 4), n, I[ty] ? I[ty].mag : undefined, undefined, undefined, y || 0, true);
      L.msg('⭐ ' + name + ' hat seine Boss-Waffe fallen lassen: ' + (LOOT[id] || []).map(([t]) => I[t].icon + ' ' + I[t].name).join(', ') + ' – heb sie auf!', 8000);
    }
  };

  // ---------- jedes Bild ----------
  L.updateLegend = function (dt) {
    updateProjs(dt); updateChests(dt);
    // Geisternebel um dich
    if (ghostT > 0) {
      ghostT -= dt;
      if (Math.random() < dt * 30) L.fx(Math.random() < 0.5 ? '#c0ffe0' : '#e8fff4', P.x + L.rand(-2.5, 2.5), (P.y || 0) + L.rand(0.3, 2.2), P.z + L.rand(-2.5, 2.5), 1, 0.4, { size: 0.9, life: 1.4, g: -0.1, grow: 1.2 });
      for (const m of E.monsters) if (m.prey === P && Math.hypot(m.x - P.x, m.z - P.z) > 1.5) { m.prey = null; m.state = 'search'; m.timer = 4; }
      if (P.rig) P.rig.root.traverse((o) => { if (o.isMesh && o.material && !o.userData.gh) { o.userData.gh = true; o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0.45; } });
      if (ghostT <= 0 && P.rig) P.rig.root.traverse((o) => { if (o.isMesh && o.userData.gh) { o.material.opacity = 1; o.material.transparent = false; o.userData.gh = false; } });
    }
    // Sporenwolken
    for (let i = zones.length - 1; i >= 0; i--) {
      const z = zones[i]; z.t += dt; z.acc += dt;
      if (Math.random() < dt * 25) L.fx(Math.random() < 0.5 ? '#80c040' : '#c0e080', z.x + L.rand(-z.r, z.r) * 0.7, L.rand(0.3, 3), z.z + L.rand(-z.r, z.r) * 0.7, 1, 0.4, { size: 1.6, life: 2.5, g: -0.05, grow: 1.3 });
      if (z.acc > 0.5) { z.acc = 0; for (const e of targets()) if (e.kind !== 'bern' && Math.hypot(e.x - z.x, e.z - z.z) < z.r + (e.bigR || 0)) L.damageEnt(e, 14, z.x, z.z, P); }
      if (z.t > z.dur) zones.splice(i, 1);
    }
    // Gift vom Urwald-Bogen
    for (let i = poison.length - 1; i >= 0; i--) {
      const p = poison[i]; p.t -= dt; p.acc += dt;
      if (p.acc > 0.5) { p.acc = 0; if (!p.e.dead) { L.damageEnt(p.e, 6, P.x, P.z, P); L.fx('#60e040', p.e.x, 2, p.e.z, 3, 1, { basic: true, size: 0.12, life: 0.6 }); } }
      if (p.t <= 0 || p.e.dead) poison.splice(i, 1);
    }
  };
  L.clearLegend = function () {
    for (const p of projs) L.scene.remove(p.g); projs.length = 0; zones.length = 0; poison.length = 0; ghostT = 0;
    for (const c of chests) L.scene.remove(c.g); chests.length = 0;
  };
  L.BOSS_LOOT = LOOT;
})();
