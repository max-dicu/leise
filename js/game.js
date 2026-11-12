'use strict';
// Spiellogik: Spieler, Inventar, Waffen, Fahrzeuge, Monster, Stelzer, MAMA IVA, NPCs, Fluchtwege
(function () {
  const L = window.L, T = THREE;

  L.ITEMS = {
    hammer: { name: 'Hammer', slot: 'hammer', icon: '🔨' },
    minipistole: { name: 'Mini-Pistole', slot: 'waffe', icon: '🔫', dmg: 22, rate: 0.22, noise: 65, range: 70, ammo: '9mm', mag: 10, spread: 0.014 },
    pistole: { name: 'Pistole', slot: 'waffe', icon: '🔫', dmg: 34, rate: 0.32, noise: 110, range: 100, ammo: '9mm', mag: 15, spread: 0.01 },
    schrotflinte: { name: 'Schrotflinte', slot: 'waffe', icon: '💥', dmg: 15, pellets: 9, rate: 0.9, noise: 150, range: 40, ammo: 'schrot', mag: 6, spread: 0.07 },
    gewehr: { name: 'Sturmgewehr', slot: 'waffe', icon: '🎯', dmg: 28, rate: 0.11, auto: true, noise: 150, range: 160, ammo: 'gewehrmuni', mag: 30, spread: 0.016 },
    granate: { name: 'Granate', slot: 'granate', icon: '💣', stack: 10 },
    konserve: { name: 'Konserve', slot: 'essen', icon: '🥫', food: 35, stack: 8 },
    brot: { name: 'Brot', slot: 'essen', icon: '🍞', food: 25, stack: 8 },
    apfel: { name: 'Apfel', slot: 'essen', icon: '🍎', food: 12, water: 6, stack: 8 },
    riegel: { name: 'Energieriegel', slot: 'essen', icon: '🍫', food: 15, stam: 40, stack: 8 },
    wasser: { name: 'Wasser', slot: 'trinken', icon: '💧', water: 40, stack: 8 },
    cola: { name: 'Cola', slot: 'trinken', icon: '🥤', water: 25, stam: 30, stack: 8 },
    saft: { name: 'Saft', slot: 'trinken', icon: '🧃', water: 30, food: 5, stack: 8 },
    verband: { name: 'Verband', slot: 'bag', icon: '🩹', heal: 35, stack: 6 },
    medkit: { name: 'Medikit', slot: 'bag', icon: '💊', heal: 80, stack: 3 },
    '9mm': { name: '9mm-Munition', slot: 'bag', icon: '🟡', stack: 120, amount: 15 },
    schrot: { name: 'Schrotpatronen', slot: 'bag', icon: '🔴', stack: 48, amount: 8 },
    gewehrmuni: { name: 'Gewehrmunition', slot: 'bag', icon: '🟤', stack: 150, amount: 30 },
    sicherung: { name: 'Sicherung', slot: 'bag', icon: '🔌', stack: 3 },
    gold: { name: 'Goldbarren', slot: 'bag', icon: '🪙', stack: 10 },
    uhr: { name: 'Taschenuhr', slot: 'bag', icon: '⌚', stack: 5 },
    artefakt: { name: 'Alien-Artefakt', slot: 'bag', icon: '🔮', stack: 3 }
  };
  const ITEMS = L.ITEMS;
  // Schnellleiste: 5 freie Plätze, jeder Gegenstand passt überall hin. P.sel = -1 heißt: nichts in der Hand
  L.HOT_N = 5;
  L.selectSlot = function (i) { P.sel = P.sel === i ? -1 : i; };
  // findet in Schnellleiste und Rucksack den ersten passenden Gegenstand
  function findItem(fn) {
    for (let i = 0; i < P.hot.length; i++) if (P.hot[i] && fn(P.hot[i])) return { arr: P.hot, i };
    for (let i = 0; i < P.bag.length; i++) if (P.bag[i] && fn(P.bag[i])) return { arr: P.bag, i };
    return null;
  }
  const MDIFF = { leicht: { hear: 0.7, speed: 0.85, count: 0.6, dmg: 0.7 }, normal: { hear: 1, speed: 1, count: 1, dmg: 1 }, schwer: { hear: 1.25, speed: 1.12, count: 1.35, dmg: 1.25 }, albtraum: { hear: 1.5, speed: 1.25, count: 1.8, dmg: 1.6 } };
  const NDIFF = { leicht: { acc: 0.45, dmg: 0.6 }, normal: { acc: 0.75, dmg: 0.85 }, schwer: { acc: 1, dmg: 1 }, albtraum: { acc: 1.25, dmg: 1.3 } };
  L.md = MDIFF.normal; L.nd = NDIFF.normal;
  L.ents = { monsters: [], walkers: [], npcs: [], vehicles: [], items: [], grenades: [] };
  L.boss = null;
  const E = L.ents, P = L.player = {};
  // ---------- Mehrspieler-Grundlagen ----------
  let NID = 1;
  L.byId = new Map();
  const NET = () => (L.net ? L.net.role : 'solo');
  const isClient = () => NET() === 'client', isHost = () => NET() === 'host';
  // alle Mitspieler (bis zu 3 neben einem selbst)
  L.remotes = new Map();
  const remotesList = () => [...L.remotes.values()];
  const isRemote = (e) => !!e && e.kind === 'remote';
  // aus Sicht des Hosts: Mitspieler, die gerade lebend in der Runde sind
  const RPs = () => (isHost() ? remotesList().filter((r) => r.inRound && r.alive && !r.gone) : []);
  function players() { const a = []; if (P.alive && !P.gone) a.push(P); for (const r of RPs()) a.push(r); return a; }
  function nearestPlayer(x, z) { let best = null, bd = 1e9; for (const p of players()) { const d = L.dist(x, z, p.x, p.z); if (d < bd) { bd = d; best = p; } } return [best, bd]; }
  function hurtRemote(r, dmg, cause, kx, kz, ky, sneak) { L.mp.sendTo(r.pid, { t: 'hurt', dmg, cause, kx, kz, ky, sneak }); }
  function hurtAny(t, dmg, cause) { if (t === P) L.hurtPlayer(dmg, cause); else if (isRemote(t)) hurtRemote(t, dmg, cause); }
  function dps(t, dmg, cause) {
    if (t === P) L.hurtPlayer(dmg, cause);
    else if (isRemote(t)) { t.acc = (t.acc || 0) + dmg; if (t.acc >= 8) { hurtRemote(t, t.acc, cause); t.acc = 0; } }
  }
  function nearDist(x, z, dP) { let d = dP; for (const r of RPs()) d = Math.min(d, L.dist(r.x, r.z, x, z)); return d; }
  const validTarget = (t) => t && (t === P || RPs().includes(t));
  // wer sitzt am Steuer von Fahrzeug v? (Name für Hinweise)
  function driverName(v) { for (const r of remotesList()) if (r.inVeh && r.vehId === v.id && !(r.seat > 0)) return r.name; return 'deinem Freund'; }
  const RES = {}, V1 = new T.Vector3(), V2 = new T.Vector3(), V3 = new T.Vector3();
  L.shake = 0;

  // ---------- Effekte ----------
  const FX = { pool: [], decals: [], di: 0, tracers: [], ti: 0 };
  let glowTex = null;
  L.initFx = function () {
    for (let i = 0; i < 380; i++) {
      const m = new T.Mesh(L.GEO.box, L.mat('#8a0a0a')); m.visible = false; L.scene.add(m);
      FX.pool.push({ m, life: 0, vx: 0, vy: 0, vz: 0, g: 1, grow: 0 });
    }
    const dg = new T.CircleGeometry(1, 12); dg.rotateX(-Math.PI / 2);
    for (let i = 0; i < 80; i++) {
      const m = new T.Mesh(dg, new T.MeshLambertMaterial({ color: '#4a0606', transparent: true, opacity: 0.85, depthWrite: false }));
      m.visible = false; L.scene.add(m); FX.decals.push(m);
    }
    for (let i = 0; i < 16; i++) {
      const m = new T.Mesh(L.GEO.cyl, new T.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.8, blending: T.AdditiveBlending, depthWrite: false }));
      m.visible = false; L.scene.add(m); FX.tracers.push({ m, life: 0 });
    }
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,240,180,0.9)'); gr.addColorStop(1, 'rgba(255,240,180,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    glowTex = new T.CanvasTexture(c);
    L.flashBall = new T.Mesh(new T.SphereGeometry(1, 16, 12), new T.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false }));
    L.scene.add(L.flashBall);
  };
  L.fx = function (color, x, y, z, n, spd, o) {
    o = o || {};
    for (let k = 0; k < n; k++) {
      const p = FX.pool.find((q) => q.life <= 0);
      if (!p) return;
      p.m.material = L.mat(color, o.basic ? { basic: true } : undefined);
      const s = (o.size || 0.08) * (0.6 + Math.random() * 0.8);
      p.m.scale.set(s, s, s); p.m.position.set(x, y, z); p.m.visible = true;
      p.vx = (Math.random() - 0.5) * spd * 2 + (o.vx || 0); p.vz = (Math.random() - 0.5) * spd * 2 + (o.vz || 0);
      p.vy = Math.random() * spd + (o.up || 1); p.g = o.g === undefined ? 1 : o.g;
      p.life = (o.life || 1.2) * (0.6 + Math.random() * 0.6); p.grow = o.grow || 0;
    }
  };
  L.decal = function (x, z, r, color) {
    const m = FX.decals[FX.di++ % FX.decals.length];
    m.position.set(x, 0.04 + Math.random() * 0.01, z); m.scale.set(r, 1, r * (0.7 + Math.random() * 0.5)); m.rotation.y = Math.random() * 3;
    m.material.color.set(color || '#4a0606'); m.visible = true;
  };
  L.blood = function (x, y, z, n, big) {
    L.fx('#8a0a0a', x, y, z, n || 14, big ? 5 : 3, { size: big ? 0.12 : 0.07, life: 1.4 });
    L.fx('#5a0404', x, y, z, Math.ceil((n || 14) / 2), 2, { size: 0.1 });
    L.decal(x + (Math.random() - 0.5), z + (Math.random() - 0.5), big ? 1.6 : 0.6 + Math.random() * 0.6);
  };
  L.tracer = function (a, b) {
    const t = FX.tracers[FX.ti++ % FX.tracers.length];
    L.seg(t.m, a, b); t.m.scale.x = t.m.scale.z = 0.025; t.m.visible = true; t.life = 0.06;
  };
  L.makeGlow = function () {
    const s = new T.Sprite(new T.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: 0.6 }));
    s.scale.set(0.9, 0.9, 0.9);
    return s;
  };
  function updateFx(dt) {
    for (const p of FX.pool) {
      if (p.life <= 0) continue;
      p.life -= dt;
      p.vy -= 9.8 * p.g * dt;
      p.m.position.x += p.vx * dt; p.m.position.y += p.vy * dt; p.m.position.z += p.vz * dt;
      if (p.m.position.y < 0.03 && p.g > 0) { p.m.position.y = 0.03; p.vx *= 0.3; p.vz *= 0.3; p.vy = 0; }
      if (p.grow) p.m.scale.multiplyScalar(1 + p.grow * dt);
      if (p.life <= 0) p.m.visible = false;
    }
    for (const t of FX.tracers) if (t.life > 0) { t.life -= dt; if (t.life <= 0) t.m.visible = false; }
    const fb = L.flashBall;
    if (fb.material.opacity > 0) { fb.material.opacity = Math.max(0, fb.material.opacity - dt * 2.5); fb.scale.multiplyScalar(1 + dt * 2); }
    L.env.muzzle.intensity = Math.max(0, L.env.muzzle.intensity - dt * 60);
    L.env.boom.intensity = Math.max(0, L.env.boom.intensity - dt * 8);
  }

  // ---------- Geräusche ----------
  L.makeNoise = function (x, z, rad, src) {
    if (rad <= 0) return;
    const hm = L.env.hearMul * L.md.hear;
    // im Turm zu laut (rennen, schießen, hupen …) → MAMA IVA kommt und reißt ihn ein
    const B0 = L.boss;
    if (!isClient() && B0 && !B0.dead && !B0.leaving && !B0.towerAtk && rad >= 20 && L.towerSafe() && L.inTower(x, z, 1)) {
      B0.towerAtk = true; B0.smashT = 0; B0.smashed = false;
      L.msg('⚠️ MAMA IVA hat dich im Turm gehört! Sie kommt, um ihn einzureißen …', 7000);
      if (NET() !== 'solo') L.mp.send({ t: 'towerWarn' });
    }
    if (src === P) P.noiseShow = Math.max(P.noiseShow, rad);
    if (isClient()) { if (rad >= 4) L.mp.send({ t: 'nz', x, z, r: rad }); return; }
    for (const m of E.monsters) {
      if (m.dead) continue;
      const d = L.dist(x, z, m.x, m.z), R = rad * hm * (MK[m.kind].hear || 1);
      if (d < R) monsterHear(m, x, z, 1 - d / R, d, src);
    }
    if (rad >= 40) for (const w of E.walkers) { if (!w.dead && L.dist(x, z, w.x, w.z) < rad * 2.4 * hm) walkerHear(w, x, z); }
    if (L.boss && !L.boss.dead && rad >= 6 && L.dist(x, z, L.boss.x, L.boss.z) < rad * 3.5 * hm) { L.boss.tx = x; L.boss.tz = z; }
    if (rad >= 60) for (const n of E.npcs) if (!n.dead && L.dist(x, z, n.x, n.z) < rad) { n.alertX = x; n.alertZ = z; n.alertT = 6; }
  };

  // ---------- Treffer-Kugeln für Schüsse ----------
  function spheres(e) {
    const out = [];
    if (e.kind === 'viktor') {
      const s = e.rig.s;
      if (e.anim === 'crawl') { const f = 0.45 * s; out.push([e.x, 1.3 * s, e.z, 0.35 * s, 1], [e.x + Math.sin(e.yaw) * f, 2.0 * s, e.z + Math.cos(e.yaw) * f, 0.35 * s, 1], [e.x + Math.sin(e.yaw) * f * 1.6, 2.5 * s, e.z + Math.cos(e.yaw) * f * 1.6, 0.24 * s, 2]); }
      else out.push([e.x, 1.3 * s, e.z, 0.35 * s, 1], [e.x, 2.1 * s, e.z, 0.35 * s, 1], [e.x, 2.8 * s, e.z, 0.24 * s, 2]);
    } else if (e.kind === 'daniel') out.push([e.x, 1.0, e.z, 0.65, 1], [e.x, 1.9, e.z, 0.8, 1], [e.x, 2.5, e.z, 0.25, 2]);
    else if (MK[e.kind]) { for (const h of MK[e.kind].hit) out.push([e.x, h[0], e.z, h[1], h[2]]); }
    else if (e.kind === 'npc') {
      const lowY = e.mode === 'crouch' ? 0.6 : 1;
      out.push([e.x, 0.9 * lowY, e.z, 0.42, 1], [e.x, 1.4 * lowY, e.z, 0.35, 1], [e.x, 1.75 * lowY, e.z, 0.17, 2]);
    } else if (e.kind === 'remote') {
      const low = e.stance === 'crawl' ? 0.3 : e.stance === 'crouch' ? 0.65 : 1;
      out.push([e.x, e.y + 0.9 * low, e.z, 0.42, 1], [e.x, e.y + 1.4 * low, e.z, 0.35, 1], [e.x, e.y + 1.75 * low, e.z, 0.17, 2]);
    } else if (e.kind === 'walker') {
      out.push([e.x, e.hy, e.z, 6.5, 1], [e.x + Math.sin(e.yaw) * 7, e.hy - 0.3, e.z + Math.cos(e.yaw) * 7, 1.3, 3]);
    } else if (e.kind === 'boss') {
      out.push([e.x, e.hy, e.z, 6, 1], [e.x, e.hy + 8, e.z, 7, 1], [e.x, e.hy + 20, e.z, 2.6, 2]);
    }
    return out;
  }
  function allTargets() {
    const a = [];
    for (const m of E.monsters) if (!m.dead) a.push(m);
    for (const n of E.npcs) if (!n.dead) a.push(n);
    for (const w of E.walkers) if (!w.dead) a.push(w);
    if (L.boss && !L.boss.dead) a.push(L.boss);
    for (const r of remotesList()) if (r.inRound && r.alive && !r.gone && !r.inVeh) a.push(r);
    return a;
  }
  L.rayHit = function (o, d, maxD, minT) {
    let best = null, bt = maxD;
    for (const e of allTargets()) {
      if (L.dist(o.x, o.z, e.x, e.z) > maxD + 30) continue;
      for (const s of spheres(e)) {
        const cx = s[0] - o.x, cy = s[1] - o.y, cz = s[2] - o.z;
        const t = cx * d.x + cy * d.y + cz * d.z;
        if (t < minT) continue;
        const d2 = cx * cx + cy * cy + cz * cz - t * t;
        if (d2 > s[3] * s[3]) continue;
        const th = t - Math.sqrt(s[3] * s[3] - d2);
        if (th < bt) { bt = th; best = { ent: e, mult: s[4], t: th }; }
      }
    }
    // Gebäude oder Boden davor?
    let groundT = d.y < 0 ? -o.y / d.y : 1e9;
    for (let t = minT; t < Math.min(bt, groundT); t += 1.2) {
      const x = o.x + d.x * t, y = o.y + d.y * t, z = o.z + d.z * t;
      if (L.blockedAt(x, y, z)) return { ent: null, t, wall: true };
    }
    if (groundT < bt) return { ent: null, t: groundT, wall: true };
    return best || { ent: null, t: maxD };
  };

  // ---------- Schaden ----------
  L.hurtPlayer = function (dmg, cause, fx, fz) {
    if (!P.alive || dmg <= 0 || L.cine) return;
    P.hp -= dmg; P.hurtFlash = Math.min(1, P.hurtFlash + dmg / 40);
    L.snd.hurt(); L.shake = Math.min(1.2, L.shake + dmg / 60);
    if (dmg > 8) L.blood(P.x, P.y + 1.2, P.z, Math.min(30, dmg / 2), dmg > 40);
    if (P.hp <= 0) { P.hp = 0; killPlayer(cause); }
  };
  function killPlayer(cause) {
    P.alive = false; P.deathT = 0; P.cause = cause;
    // Tod: MAMA IVA fängt wieder bei Stufe 1 an
    L.save.ivaLvl = 0; L.persist();
    if (P.vehicle) leaveVehicle(true);
    L.blood(P.x, 1, P.z, 40, true); L.decal(P.x, P.z, 2.4); L.snd.splat({ x: P.x, y: 1, z: P.z });
    L.music.set('night');
  }
  L.damageEnt = function (e, dmg, fromX, fromZ, src) {
    if (e.dead) return;
    if (e.kind === 'remote') { if (src === P) { L.mp.sendTo(e.pid, { t: 'pvp', dmg, by: (L.save.char || {}).name || 'Mitspieler' }); L.blood(e.x, e.y + 1.2, e.z, 10); } return; }
    if (isClient()) { if (src === P) L.mp.send({ t: 'dmg', id: e.key, dmg }); L.blood(e.x, e.kind === 'walker' ? e.hy : 1.5, e.z, 6); return; }
    e.hp -= dmg;
    const hy = e.kind === 'walker' ? e.hy : e.kind === 'boss' ? e.hy + 8 : 1.5;
    if (e.kind === 'walker' || e.kind === 'boss') L.fx('#ffb040', e.x, hy, e.z, 6, 4, { basic: true, size: 0.15, life: 0.5 });
    else L.blood(e.x, hy, e.z, 10);
    const byPlayer = src && (src === P || isRemote(src));
    if (MK[e.kind] && byPlayer && (e.calmT || 0) <= 0) { e.state = 'chase'; e.tx = src.x; e.tz = src.z; e.prey = src; }
    if (e.kind === 'npc' && byPlayer) { e.hostile = true; e.alertT = 10; }
    if (e.kind === 'walker' && byPlayer) walkerHear(e, src.x, src.z);
    if (e.hp <= 0) killEnt(e, src);
  };
  function killEnt(e, src) {
    e.dead = true; e.deadT = 0;
    if (src === P) P.kills++;
    if (MK[e.kind]) {
      if (MK[e.kind].metal) { L.fx('#ffb040', e.x, e.fly ? 16 : 2, e.z, 30, 8, { basic: true, size: 0.3, life: 1 }); L.snd.explosion({ x: e.x, y: 2, z: e.z }); }
      else { L.blood(e.x, 1.2, e.z, 30, true); L.decal(e.x, e.z, 2); L.snd.splat({ x: e.x, y: 1, z: e.z }); }
    }
    if (e.kind === 'npc') { L.blood(e.x, 1, e.z, 25, true); L.decal(e.x, e.z, 1.8); dropNpcLoot(e); }
    if (e.kind === 'walker') { L.explode(e.x, e.hy, e.z, 12, 0, null, true); L.msg('💥 Ein Stelzer ist zerstört!'); for (let i = 0; i < 2; i++) L.spawnItem('artefakt', e.x + L.rand(-6, 6), e.z + L.rand(-6, 6), 1); }
    if (e.kind === 'boss') { calmMonsters(); L.explode(e.x, e.hy, e.z, 20, 0, null, true); L.banner('MAMA IVA IST GEFALLEN', 'Unglaublich. Sammle seine Beute ein.'); for (let i = 0; i < 6; i++) L.spawnItem(i < 3 ? 'artefakt' : 'gold', e.x + L.rand(-10, 10), e.z + L.rand(-10, 10), 1); }
  }

  // ---------- Inventar ----------
  L.giveItem = function (type, count, mag) {
    const d = ITEMS[type]; count = count || 1;
    if (!d) return count;
    // erst auf gleiche Stapel (Schnellleiste und Rucksack), sonst in einen freien Rucksack-Platz
    if (d.stack) for (const it of P.hot.concat(P.bag)) if (it && it.type === type && it.count < d.stack) {
      const add = Math.min(d.stack - it.count, count); it.count += add; count -= add;
      if (count <= 0) return 0;
    }
    while (count > 0) {
      let arr = P.bag, i = P.bag.findIndex((x) => !x);
      if (i < 0) { arr = P.hot; i = P.hot.findIndex((x) => !x); }
      if (i < 0) return count;
      const add = d.stack ? Math.min(d.stack, count) : 1;
      arr[i] = { type, count: add, mag: d.slot === 'waffe' ? (mag !== undefined ? mag : Math.floor(d.mag * 0.6)) : undefined };
      count -= add;
    }
    return 0;
  };
  L.countBag = (type) => P.bag.reduce((s, it) => s + (it && it.type === type ? it.count : 0), 0);
  function takeBag(type, n) {
    for (let i = 0; i < P.bag.length && n > 0; i++) {
      const it = P.bag[i];
      if (!it || it.type !== type) continue;
      const k = Math.min(it.count, n); it.count -= k; n -= k;
      if (it.count <= 0) P.bag[i] = null;
    }
  }
  L.allPlayerItems = function () {
    const out = [];
    for (const it of P.hot) if (it && it.type !== 'hammer') out.push(Object.assign({}, it));
    for (const it of P.bag) if (it && it.type !== 'hammer') out.push(Object.assign({}, it));
    return out;
  };
  L.useConsumable = function (it) {
    const d = ITEMS[it.type];
    if (d.food) P.food = Math.min(100, P.food + d.food);
    if (d.water) P.water = Math.min(100, P.water + d.water);
    if (d.stam) P.stam = Math.min(100, P.stam + d.stam);
    if (d.heal) { P.hp = Math.min(100, P.hp + d.heal); L.snd.heal(); }
    else if (d.slot === 'trinken') L.snd.drink(); else L.snd.eat();
    it.count--;
  };
  L.dropItem = function (it) {
    const x = P.x + Math.sin(P.yaw) * 1.2, z = P.z + Math.cos(P.yaw) * 1.2;
    if (isClient()) L.mp.send({ t: 'drop', type: it.type, count: it.count, mag: it.mag, x, z });
    else L.spawnItem(it.type, x, z, it.count, it.mag);
  };

  // ---------- Gegenstände in der Welt ----------
  L.spawnItem = function (type, x, z, count, mag, note, id) {
    const g = new T.Group(), m = L.buildItem(note !== undefined ? 'note' : type);
    m.scale.setScalar(1.7); g.add(m);
    const glow = L.makeGlow(); glow.position.y = 0.1; g.add(glow);
    g.position.set(x, 0.35, z); L.scene.add(g);
    const it = { type, x, z, count: count || (ITEMS[type] && ITEMS[type].amount) || 1, mag, mesh: g, inner: m, note, ph: Math.random() * 6 };
    it.id = id || NID++; L.byId.set('i' + it.id, it);
    E.items.push(it);
    if (isHost() && !L._bulk) L.mp.send({ t: 'iadd', it: [it.id, type, x, z, it.count, mag === undefined ? null : mag, note === undefined ? null : note] });
    return it;
  };
  function removeItem(it) {
    L.scene.remove(it.mesh); const i = E.items.indexOf(it); if (i >= 0) E.items.splice(i, 1);
    L.byId.delete('i' + it.id);
    if (isHost()) L.mp.send({ t: 'irem', id: it.id });
  }
  function updateItems(dt, t) {
    for (const it of E.items) {
      const d = L.dist(P.x, P.z, it.x, it.z), vis = d < 70;
      it.mesh.visible = vis;
      if (vis) { it.inner.rotation.y = t * 1.2 + it.ph; it.mesh.position.y = 0.35 + Math.sin(t * 2 + it.ph) * 0.08; }
    }
  }
  const LT = {
    stadt: 'konserve:3 brot:2 apfel:2 riegel:2 wasser:3 cola:2 saft:2 verband:2 9mm:2 minipistole:1 granate:0.5 uhr:1 gold:0.4',
    krankenhaus: 'verband:5 medkit:3 wasser:2 saft:1',
    polizei: 'pistole:3 9mm:4 schrotflinte:1.5 schrot:2 granate:1.5 verband:1',
    supermarkt: 'konserve:4 brot:3 apfel:3 riegel:3 wasser:4 cola:3 saft:3',
    militaer: 'gewehr:2.5 gewehrmuni:4 granate:3 pistole:1.5 9mm:2 medkit:1.5 verband:1 riegel:1',
    hof: 'schrotflinte:2 schrot:3 apfel:3 brot:2 wasser:2 saft:1',
    tanke1: 'riegel:3 cola:3 wasser:2 konserve:1 minipistole:0.6 9mm:1',
    tanke2: 'riegel:3 cola:3 wasser:2 konserve:1 minipistole:0.6 9mm:1',
    dorf: 'konserve:2 brot:2 apfel:2 wasser:2 saft:1 schrotflinte:0.6 schrot:1 minipistole:0.8 9mm:1 verband:1 uhr:1 gold:0.3',
    camping: 'konserve:2 riegel:2 wasser:3 cola:1 minipistole:0.7 9mm:1 verband:1',
    krater: 'artefakt:2 granate:1 gewehrmuni:1',
    funk: 'verband:1 wasser:1 riegel:1 9mm:1',
    windpark: 'wasser:1 riegel:1 verband:1 9mm:1',
    sperre: 'gewehrmuni:1 granate:1 verband:1',
    bunker: 'konserve:1 wasser:1',
    wald: 'apfel:2 wasser:1 9mm:0.5 verband:0.5',
    land: 'apfel:2 wasser:2 brot:1 konserve:1 9mm:0.6 schrot:0.5 minipistole:0.3 uhr:0.3'
  };
  const LTP = {};
  for (const k in LT) LTP[k] = LT[k].split(' ').map((s) => { const [t, w] = s.split(':'); return [t, +w]; });
  function rollLoot(poi) {
    const tab = LTP[poi] || LTP.land;
    let sum = 0; for (const e of tab) sum += e[1];
    let r = Math.random() * sum;
    for (const e of tab) { r -= e[1]; if (r <= 0) return e[0]; }
    return tab[0][0];
  }

  // ---------- Spieler ----------
  function resetPlayer() {
    Object.assign(P, {
      x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, yaw: 0, camYaw: 0, camPitch: 0.25, hp: 100, food: 100, water: 100, stam: 100,
      stance: 'stand', mode: 'idle', alive: true, vehicle: null, belted: false, sel: 0, hot: [{ type: 'hammer', count: 1 }, null, null, null, null], bag: new Array(15).fill(null),
      safe: L.save.safe ? Object.assign({}, L.save.safe) : null, fireCd: 0, swing: -1, throwT: -1, eatT: -1, reloadT: -1,
      phase: 0, stepAcc: 0, noiseShow: 0, knockT: 0, air: false, tumble: 0, hurtFlash: 0, exhausted: false, flash: false,
      aiming: false, kills: 0, deathT: 0, cause: '', beltWarnT: 0, camDist: 4, freeLookT: 0, starve: 0, gone: false, seat: 0, animSt: { mode: 'walk' }
    });
    if (P.rig) L.scene.remove(P.rig.root);
    P.rig = L.buildHuman(L.save.char || L.DEFAULT_CHAR);
    L.scene.add(P.rig.root);
  }
  function selItem() { return P.sel >= 0 && P.hot[P.sel] ? P.hot[P.sel] : null; }
  function selType() { const it = selItem(); return it ? it.type : null; }
  L.selType = selType;
  const SPEED = { crawl: 1.1, crouch: 2.1, walk: 4.0, run: 7.3, idle: 0 };
  const STEP = { crawl: [0.5, 0, 0.015], crouch: [0.6, 0, 0.03], walk: [0.75, 7, 0.1], run: [1.1, 24, 0.22] };
  function updatePlayer(dt) {
    if (!P.alive) {
      P.deathT += dt;
      P.animSt = { mode: 'dead' };
      L.animHuman(P.rig, P.animSt);
      if (P.deathT > 3.5 && !L.round.over) L.endRound('death', P.cause);
      return;
    }
    // Hunger, Durst, Ausdauer
    P.food -= dt * 100 / 1500;
    P.water -= dt * 100 / 1100 * (P.mode === 'run' ? 2 : 1);
    if (P.food <= 0 || P.water <= 0) { P.food = Math.max(0, P.food); P.water = Math.max(0, P.water); P.hp -= 0.6 * dt; if (P.hp <= 0) { P.hp = 0; killPlayer(P.food <= 0 ? 'Verhungert' : 'Verdurstet'); return; } }
    else if (P.food > 60 && P.water > 60 && P.hp < 100) P.hp = Math.min(100, P.hp + 0.25 * dt);
    P.noiseShow = Math.max(0, P.noiseShow - dt * 30);
    P.hurtFlash = Math.max(0, P.hurtFlash - dt * 0.8);
    P.fireCd -= dt;
    P.tpCd = Math.max(0, (P.tpCd || 0) - dt);
    if (L.cine) { if (P.vehicle) { P.vehicle.speed *= Math.max(0, 1 - dt * 2); } return; }
    if (L.hit('KeyL')) { P.flash = !P.flash; L.snd.key(); }
    if (P.vehicle) { if (P.seat > 0) updatePassenger(dt); else updateDriving(dt); return; }
    const S = L.S(), sens = 0.0022 * S.sens;
    P.camYaw -= L.mouse.dx * sens;
    P.camPitch = L.clamp(P.camPitch + L.mouse.dy * sens, -0.6, 1.2);
    const block = L.uiBlock;
    if (!block) {
      if (L.hit('KeyC')) P.stance = P.stance === 'crouch' ? 'stand' : 'crouch';
      if (L.hit('KeyX')) P.stance = P.stance === 'crawl' ? 'crouch' : 'crawl';
      for (let i = 0; i < 5; i++) if (L.hit('Digit' + (i + 1))) L.selectSlot(i);
    }
    const fIn = block ? 0 : (L.keys.KeyW ? 1 : 0) - (L.keys.KeyS ? 1 : 0);
    const rIn = block ? 0 : (L.keys.KeyD ? 1 : 0) - (L.keys.KeyA ? 1 : 0);
    const moving = (fIn || rIn) && P.knockT <= 0 && P.eatT < 0;
    P.aiming = !block && L.mouse.right && (selType() && ITEMS[selType()].slot === 'waffe');
    let sprint = !block && (L.keys.ShiftLeft || L.keys.ShiftRight);
    if (sprint && moving && P.stance !== 'stand') P.stance = 'stand';
    if (P.stam <= 1) P.exhausted = true;
    if (P.stam > 25) P.exhausted = false;
    sprint = sprint && moving && !P.exhausted && !P.aiming;
    P.mode = !moving ? (P.stance === 'stand' ? 'idle' : P.stance) : P.stance === 'crawl' ? 'crawl' : P.stance === 'crouch' ? 'crouch' : sprint ? 'run' : 'walk';
    let spd = SPEED[P.mode] || 0;
    if (P.aiming && P.mode === 'walk') spd = 2.6;
    const sy = Math.sin(P.camYaw), cy = Math.cos(P.camYaw);
    let mx = sy * fIn - cy * rIn, mz = cy * fIn + sy * rIn;
    const ml = Math.hypot(mx, mz) || 1; mx /= ml; mz /= ml;
    if (!P.air && P.knockT <= 0) {
      const k = Math.min(1, dt * 14);
      P.vx += (mx * spd - P.vx) * k; P.vz += (mz * spd - P.vz) * k;
    } else if (!P.air) { P.vx *= 1 - Math.min(1, dt * 5); P.vz *= 1 - Math.min(1, dt * 5); }
    P.knockT -= dt;
    if (sprint) P.stam = Math.max(0, P.stam - 16 * dt); else P.stam = Math.min(100, P.stam + (P.stance === 'stand' ? 11 : 15) * dt);
    if (!block && L.hit('Space') && !P.air && P.stance !== 'crawl' && P.stam > 8) { P.vy = 6.2; P.air = true; P.stam -= 8; P.stance = 'stand'; }
    // Schwerkraft
    if (P.air || P.y > 0) {
      P.vy -= 20 * dt; P.y += P.vy * dt;
      if (P.y <= 0) {
        const hs = Math.hypot(P.vx, P.vz), impact = -P.vy;
        P.y = 0; P.vy = 0; P.air = false;
        L.snd.land({ x: P.x, y: 0, z: P.z });
        L.makeNoise(P.x, P.z, P.tumble > 0 ? 20 : 9, P);
        if (P.tumble > 0) {
          const dmg = Math.max(0, (hs - 5) * 1.6) + Math.max(0, (impact - 8) * 2);
          if (dmg > 0) L.hurtPlayer(dmg, P.ejected ? 'Durch die Windschutzscheibe geflogen' : 'Hart aufgeschlagen');
          P.knockT = 0.9; P.tumble = 0; P.ejected = false;
        } else if (impact > 13) L.hurtPlayer((impact - 13) * 4, 'Gestürzt');
      }
    }
    P.tumble = P.tumble > 0 ? P.tumble + dt * 9 : 0;
    // Bewegung mit Kollision
    L.collide(P.x + P.vx * dt, P.z + P.vz * dt, 0.38, P.y, RES);
    P.x = RES.x; P.z = RES.z;
    for (const v of E.vehicles) {
      const d = L.dist(P.x, P.z, v.x, v.z);
      if (d > 5) continue;
      for (const c of vehCircles(v)) {
        const dd = L.dist(P.x, P.z, c[0], c[1]), min = c[2] + 0.38;
        if (dd < min && dd > 0.001) { P.x = c[0] + (P.x - c[0]) / dd * min; P.z = c[1] + (P.z - c[1]) / dd * min; }
      }
    }
    L.clampWorld(P);
    // Richtung der Figur
    const hsp = Math.hypot(P.vx, P.vz);
    if (P.aiming || P.swing >= 0 || P.throwT >= 0) P.yaw += L.angDiff(P.yaw, P.camYaw) * Math.min(1, dt * 15);
    else if (hsp > 0.4 && P.knockT <= 0) P.yaw += L.angDiff(P.yaw, Math.atan2(P.vx, P.vz)) * Math.min(1, dt * 10);
    // Schritte und Lautstärke
    if (!P.air && hsp > 0.3 && STEP[P.mode]) {
      P.stepAcc += hsp * dt;
      const st = STEP[P.mode];
      if (P.stepAcc > st[0]) {
        P.stepAcc = 0;
        L.snd.step({ x: P.x, y: 0, z: P.z }, st[2], L.onRoad(P.x, P.z));
        L.makeNoise(P.x, P.z, st[1], P);
      }
    }
    P.phase += dt * (P.mode === 'run' ? 11 : P.mode === 'walk' ? 7.5 : P.mode === 'crouch' ? 5.5 : 4) * (hsp > 0.3 ? 1 : 0.15);
    // Aktionen
    if (!block) playerActions(dt);
    updateActions(dt);
    // Animation
    const r = P.rig;
    r.root.position.set(P.x, P.y, P.z); r.root.rotation.y = P.yaw;
    const st = selType();
    L.setHeld(r, P.eatT >= 0 ? P.eatType : st);
    P.animSt = {
      mode: P.tumble > 0 ? 'tumble' : P.air ? 'jump' : P.mode === 'idle' ? 'walk' : P.mode, tumble: P.tumble,
      phase: P.phase, speed: L.clamp(hsp / 4, 0, 1), aim: P.aiming || (P.fireCd > 0 && st && ITEMS[st] && ITEMS[st].slot === 'waffe'),
      pitch: -P.camPitch * 0.6, swing: P.swing, throwT: P.throwT, eat: P.eatT >= 0
    };
    L.animHuman(r, P.animSt);
  }
  function playerActions() {
    const st = selType();
    // Interaktion
    if (L.hit('KeyE')) interact();
    if (L.hit('KeyF')) { const v = nearestVehicle(); if (v) enterVehicle(v); }
    if (L.hit('KeyQ')) useHealing();
    if (L.hit('KeyG')) throwGrenade();
    if (L.hit('KeyR')) reload();
    if (!st) return; // leere Hand
    const d = ITEMS[st];
    if (st === 'hammer') { if (L.mouse.click && P.swing < 0) { P.swing = 0; P.hammerHit = false; L.snd.swing(); } return; }
    if (d.slot === 'waffe') {
      if (P.reloadT >= 0) return;
      if ((d.auto ? L.mouse.left : L.mouse.click) && P.fireCd <= 0) fire();
      return;
    }
    if (d.slot === 'granate') { if (L.mouse.click) throwGrenade(); return; }
    if (d.heal) { if (L.mouse.click) useHealing(selItem()); return; }
    if (d.slot === 'essen' || d.slot === 'trinken') {
      if (L.mouse.click && P.eatT < 0) { P.eatT = 0; P.eatType = st; P.eatSlot = P.sel; }
    }
  }
  function updateActions(dt) {
    if (P.swing >= 0) {
      P.swing += dt / 0.65;
      if (P.swing > 0.42 && !P.hammerHit) { P.hammerHit = true; meleeHit(); }
      if (P.swing >= 1) P.swing = -1;
    }
    if (P.throwT >= 0) { P.throwT += dt / 0.6; if (P.throwT >= 1) P.throwT = -1; }
    if (P.eatT >= 0) {
      P.eatT += dt;
      if (P.eatT > 1.3) {
        const h = P.hot[P.eatSlot];
        if (h && h.type === P.eatType) { L.useConsumable(h); if (h.count <= 0) P.hot[P.eatSlot] = null; }
        P.eatT = -1;
      }
    }
    if (P.reloadT >= 0) {
      P.reloadT += dt;
      if (P.reloadT > 1.4) {
        P.reloadT = -1;
        const w = P.reloadW;
        if (w) { const d = ITEMS[w.type], need = d.mag - w.mag, have = L.countBag(d.ammo), n = Math.min(need, have); takeBag(d.ammo, n); w.mag += n; }
      }
    }
  }
  function useHealing(it) {
    if (P.hp >= 100) { L.msg('Du bist nicht verletzt.'); return; }
    let f = null;
    if (it) f = { arr: P.hot, i: P.hot.indexOf(it) };
    else f = findItem((x) => x.type === 'verband' && P.hp >= 60) || findItem((x) => x.type === 'medkit' || x.type === 'verband');
    if (!f || f.i < 0) { L.msg('Kein Verband oder Medikit dabei.'); return; }
    L.useConsumable(f.arr[f.i]); if (f.arr[f.i].count <= 0) f.arr[f.i] = null;
    L.msg('🩹 Verarztet');
  }
  // die Waffe in der Hand – sonst die erste Waffe in der Schnellleiste
  function curWeapon() {
    const it = selItem(); if (it && ITEMS[it.type].slot === 'waffe') return it;
    return P.hot.find((x) => x && ITEMS[x.type].slot === 'waffe') || null;
  }
  function reload() {
    const w = curWeapon(); P.reloadW = w;
    if (!w || P.reloadT >= 0) return;
    const d = ITEMS[w.type];
    if (w.mag >= d.mag) return;
    if (L.countBag(d.ammo) <= 0) { L.msg('Keine ' + ITEMS[d.ammo].name + ' im Rucksack!'); return; }
    P.reloadT = 0; L.snd.reload();
  }
  function meleeHit() {
    const fx = Math.sin(P.camYaw), fz = Math.cos(P.camYaw);
    let hit = false;
    for (const e of allTargets()) {
      if (e.kind === 'walker' || e.kind === 'boss') continue;
      const dx = e.x - P.x, dz = e.z - P.z, d = Math.hypot(dx, dz);
      if (d > 2.6 || (dx * fx + dz * fz) / (d || 1) < 0.3) continue;
      const sneak = (P.stance !== 'stand') && (e.state === 'wander' || e.state === 'search' || e.state === 'idle');
      const dmg = sneak ? 90 : 34;
      if (sneak) L.msg('🔨 Schleich-Angriff! (x2,6 Schaden)');
      L.damageEnt(e, dmg, P.x, P.z, P); hit = true;
    }
    if (hit) { L.snd.hammerHit({ x: P.x, y: 1, z: P.z }); L.makeNoise(P.x, P.z, 12, P); }
  }
  function fire() {
    const w = selItem(), d = ITEMS[w.type];
    if (w.mag <= 0) { L.snd.empty(); P.fireCd = 0.3; if (L.countBag(d.ammo) > 0) reload(); else L.msg('Keine Munition!'); return; }
    w.mag--; P.fireCd = d.rate;
    const cam = L.camera, o = cam.position, dir = V1;
    cam.getWorldDirection(dir);
    const hand = V2; P.rig.hand.getWorldPosition(hand);
    let lastEnd = null;
    for (let p = 0; p < (d.pellets || 1); p++) {
      const dd = V3.copy(dir);
      const sp = d.spread * (P.aiming ? 0.5 : 1.3) * (P.mode === 'run' ? 2 : 1);
      dd.x += (Math.random() - 0.5) * sp * 2; dd.y += (Math.random() - 0.5) * sp * 2; dd.z += (Math.random() - 0.5) * sp * 2; dd.normalize();
      const h = L.rayHit(o, dd, d.range + P.camDist, P.camDist + 0.3);
      const end = new T.Vector3().copy(o).addScaledVector(dd, h.t);
      if (h.ent) L.damageEnt(h.ent, d.dmg * h.mult * (L.dist(P.x, P.z, h.ent.x, h.ent.z) > d.range * 0.7 ? 0.7 : 1), P.x, P.z, P);
      else if (h.wall) L.fx('#c8b890', end.x, end.y, end.z, 3, 1.5, { size: 0.05, life: 0.4 });
      L.tracer(hand, end); lastEnd = end;
    }
    if (NET() !== 'solo' && lastEnd) L.mp.send({ t: 'shot', a: [hand.x, hand.y, hand.z], b: [lastEnd.x, lastEnd.y, lastEnd.z], w: w.type });
    L.snd.gun(w.type, { x: P.x, y: 1.5, z: P.z });
    L.makeNoise(P.x, P.z, d.noise, P);
    L.env.muzzle.position.copy(hand); L.env.muzzle.intensity = 4;
    P.camPitch -= d.pellets ? 0.05 : 0.012; L.shake = Math.max(L.shake, d.pellets ? 0.25 : 0.06);
  }
  function throwGrenade() {
    const f = findItem((x) => x.type === 'granate');
    if (!f) { L.msg('Keine Granate dabei.'); return; }
    if (P.throwT >= 0) return;
    const g = f.arr[f.i];
    g.count--; if (g.count <= 0) f.arr[f.i] = null;
    P.throwT = 0;
    const dir = V1; L.camera.getWorldDirection(dir);
    const m = L.buildItem('granate'); m.scale.setScalar(1.4);
    m.position.set(P.x + Math.sin(P.yaw) * 0.5, P.y + 1.7, P.z + Math.cos(P.yaw) * 0.5); L.scene.add(m);
    E.grenades.push({ m, vx: dir.x * 17 + P.vx, vy: dir.y * 17 + 4, vz: dir.z * 17 + P.vz, fuse: 2.8 });
    L.snd.swing();
  }
  function updateGrenades(dt) {
    for (let i = E.grenades.length - 1; i >= 0; i--) {
      const g = E.grenades[i], p = g.m.position;
      g.vy -= 9.8 * dt; p.x += g.vx * dt; p.y += g.vy * dt; p.z += g.vz * dt;
      if (p.y < 0.1) { p.y = 0.1; if (g.vy < -2) L.makeNoise(p.x, p.z, 6, null); g.vy = -g.vy * 0.35; g.vx *= 0.6; g.vz *= 0.6; }
      L.collide(p.x, p.z, 0.12, p.y, RES);
      if (RES.hit) { p.x = RES.x; p.z = RES.z; const dn = g.vx * RES.nx + g.vz * RES.nz; g.vx -= 1.6 * dn * RES.nx; g.vz -= 1.6 * dn * RES.nz; }
      g.m.rotation.x += dt * 8;
      g.fuse -= dt;
      if (g.fuse <= 0) { L.scene.remove(g.m); E.grenades.splice(i, 1); L.explode(p.x, p.y, p.z, 9, 160, P); }
    }
  }
  L.explode = function (x, y, z, rad, dmg, src, big, fromNet) {
    L.snd.explosion({ x, y, z });
    if (!isClient()) L.makeNoise(x, z, big ? 400 : 260, src);
    L.env.boom.position.set(x, y + 2, z); L.env.boom.intensity = 6;
    const fb = L.flashBall; fb.position.set(x, y + 1, z); fb.scale.setScalar(rad * 0.35); fb.material.opacity = 0.9;
    L.fx('#ffb040', x, y + 0.5, z, 24, 9, { basic: true, size: 0.2, life: 0.7 });
    L.fx('#3a3a3a', x, y + 1, z, 20, 3, { size: 0.6, life: 2.2, g: -0.15, grow: 0.8 });
    L.fx('#2a2018', x, y + 0.5, z, 16, 7, { size: 0.15, life: 1.6 });
    L.decal(x, z, rad * 0.4, '#151210');
    const pd = Math.hypot(P.x - x, P.y + 1 - y, P.z - z);
    L.shake = Math.max(L.shake, L.clamp(1.4 - pd / 60, 0, 1.4));
    if (dmg && pd < rad && P.alive && !P.gone) {
      L.hurtPlayer(dmg * (1 - pd / rad) * (P.vehicle ? 0.6 : 1), 'Von einer Explosion zerrissen');
      if (!P.vehicle) { const k = 12 * (1 - pd / rad); P.vx = (P.x - x) / (pd || 1) * k; P.vz = (P.z - z) / (pd || 1) * k; P.vy = 5 * (1 - pd / rad); P.air = true; P.tumble = 0.01; P.knockT = 1; }
    }
    // Mehrspieler: wer die Explosion nicht selbst ausgelöst hat, bekommt sie geschickt
    if (isClient()) { if (!fromNet) L.mp.send({ t: 'boom', x, y, z, rad, dmg, big: !!big }); return; }
    if (isHost() && !fromNet) L.mp.send({ t: 'boom', x, y, z, rad, dmg, big: !!big });
    if (!dmg) return;
    for (const e of allTargets()) {
      if (e.kind === 'remote') continue;
      const d = L.dist(e.x, e.z, x, z);
      if (d < rad + (e.kind === 'walker' ? 6 : e.kind === 'boss' ? 6 : 0)) L.damageEnt(e, dmg * (1 - Math.min(d, rad) / (rad + 6)) * (e.kind === 'walker' || e.kind === 'boss' ? 2.5 : 1), x, z, src);
    }
    for (const v of E.vehicles) { const d = L.dist(v.x, v.z, x, z); if (d < rad) v.hp -= dmg * (1 - d / rad); }
  };

  // ---------- Interaktion ----------
  function nearestItem() {
    let best = null, bd = 2.3;
    for (const it of E.items) { const d = L.dist(P.x, P.z, it.x, it.z); if (d < bd) { bd = d; best = it; } }
    return best;
  }
  // Welcher Sitz ist frei? 0 = Fahrer, 1+ = Mitfahrer, -1 = voll
  function seatFor(v) {
    const seats = v.rig.seats || [v.rig.seat];
    if (!v.occupied) return 0;
    for (let s = 1; s < seats.length; s++) if (!remotesList().some((r) => r.inVeh && r.vehId === v.id && r.seat === s)) return s;
    return -1;
  }
  function nearestVehicle() {
    let best = null, bd = 3.8;
    for (const v of E.vehicles) { const d = L.dist(P.x, P.z, v.x, v.z); if (d < bd && v.hp > 0 && seatFor(v) >= 0) { bd = d; best = v; } }
    return best;
  }
  L.interactHint = function () {
    if (!P.alive) return '';
    if (P.vehicle) {
      const t = P.vehicle.t;
      if (P.seat > 0) return (t.kind === 'car' ? `F aussteigen · B ${P.belted ? 'Gurt lösen' : 'anschnallen'}` : 'F absteigen') + (P.vehicle.occupied ? ' · du fährst mit' : ' · E: ans Steuer');
      return t.kind === 'car' ? `F aussteigen · B ${P.belted ? 'Gurt lösen' : 'anschnallen'} · H Hupe · Leertaste Handbremse` : 'F absteigen · H Hupe · Leertaste Handbremse';
    }
    const it = nearestItem();
    if (it) return it.note !== undefined ? 'E: Zettel lesen' : `E: ${ITEMS[it.type].name}${it.count > 1 ? ' ×' + it.count : ''} aufheben`;
    const v = nearestVehicle();
    if (v && seatFor(v) > 0) return `F oder E: bei ${driverName(v)} mitfahren (${v.t.name}, Platz ${seatFor(v) + 1})`;
    if (v) return `F oder E: ${v.t.kind === 'car' ? 'einsteigen' : 'aufsteigen'} (${v.t.name}, max. ${v.t.vmax} km/h, ${(v.rig.seats || [1]).length} Plätze, Zustand ${Math.round(v.hp / v.t.hp * 100)}%)`;
    const I = L.interact, R = L.round;
    if (L.dist(P.x, P.z, I.bunker.x, I.bunker.z) < 3) return R.bunkerOpen ? 'Bunker offen – geh hinein!' : 'E: Code am Bunker eingeben';
    if (L.dist(P.x, P.z, I.radio.x, I.radio.z) < 3) {
      if (R.radio === 'idle') return L.countBag('sicherung') > 0 ? 'E: Sicherung einsetzen und Hubschrauber rufen' : 'Funkgerät ohne Strom – eine Sicherung fehlt';
      return 'Der Hubschrauber ist unterwegs!';
    }
    if (L.heli && L.heli.state === 'landed' && L.dist(P.x, P.z, L.heli.x, L.heli.z) < 7) return 'E: In den Hubschrauber steigen';
    if (L.dist(P.x, P.z, I.gate.x, I.gate.z) < 3) return R.gate === 'closed' ? 'E: Schranke öffnen (löst Alarm aus!)' : R.gate === 'opening' ? 'Schranke öffnet sich ...' : 'Schranke offen – raus hier!';
    return '';
  };
  function interact() {
    const it = nearestItem();
    if (it) {
      if (isClient()) { L.mp.send({ t: 'pick', id: it.id }); removeItem(it); return; }
      if (it.note !== undefined) {
        L.round.found[it.note] = true;
        L.snd.pickup(); removeItem(it);
        L.ui.showNote(`„Wer das liest: Die ${it.note + 1}. Ziffer für Bunker 7 ist ${L.round.code[it.note]}. Der Bunker liegt im Dunkelforst. Viel Glück.“`);
        return;
      }
      const left = L.giveItem(it.type, it.count, it.mag);
      if (left === it.count) { L.msg('🎒 Rucksack voll!'); return; }
      L.snd.pickup();
      L.msg(`+ ${ITEMS[it.type].icon} ${ITEMS[it.type].name}${it.count - left > 1 ? ' ×' + (it.count - left) : ''}`);
      if (left > 0) { it.count = left; L.msg('🎒 Rucksack voll – Rest liegt noch da.'); } else removeItem(it);
      return;
    }
    const veh = nearestVehicle();
    if (veh) { enterVehicle(veh); return; }
    const I = L.interact, R = L.round;
    if (L.dist(P.x, P.z, I.bunker.x, I.bunker.z) < 3 && !R.bunkerOpen) { L.ui.openKeypad(); return; }
    if (L.dist(P.x, P.z, I.radio.x, I.radio.z) < 3 && R.radio === 'idle') {
      if (L.countBag('sicherung') <= 0) { L.msg('🔌 Ohne Sicherung kein Strom. Such in der Militärbasis!'); return; }
      takeBag('sicherung', 1); R.radio = 'calling'; R.radioT = 90; R.radioPing = 0;
      if (isClient()) L.mp.send({ t: 'radio' });
      L.banner('HUBSCHRAUBER GERUFEN', 'Überlebe 90 Sekunden. Das Funkgerät ist laut ...');
      return;
    }
    if (L.heli && L.heli.state === 'landed' && L.dist(P.x, P.z, L.heli.x, L.heli.z) < 7) { L.endRound('escape', 'Hubschrauber'); return; }
    if (L.dist(P.x, P.z, I.gate.x, I.gate.z) < 3 && R.gate === 'closed') {
      R.gate = 'opening'; R.gateT = 30; R.alarmT = 0;
      if (isClient()) L.mp.send({ t: 'gate' });
      L.banner('SCHRANKE ÖFFNET SICH', '30 Sekunden Alarm – alles in der Nähe hört dich!');
    }
  }
  L.tryCode = function (code) {
    const R = L.round;
    if (code === R.code.join('')) {
      R.bunkerOpen = true; R.doorT = 0; L.snd.codeOk(); L.snd.door();
      if (isClient()) L.mp.send({ t: 'bunker' });
      L.interact.bunker.led.material = L.mat('#20ff40', { basic: true });
      L.msg('🔓 Code richtig! Die Bunkertür öffnet sich.');
      return true;
    }
    L.snd.codeBad(); L.makeNoise(P.x, P.z, 35, P);
    return false;
  };

  // ---------- Fahrzeuge ----------
  function vehCircles(v) {
    const t = v.t, fx = Math.sin(v.yaw), fz = Math.cos(v.yaw);
    if (t.kind === 'bike') return [[v.x, v.z, 0.6]];
    const o = t.len * 0.3, r = t.wid * 0.55;
    return [[v.x + fx * o, v.z + fz * o, r], [v.x - fx * o, v.z - fz * o, r]];
  }
  function spawnVehicle(sp) {
    const t = L.VTYPES[sp.type]; if (!t) return;
    const rig = L.buildVehicle(sp.type); L.scene.add(rig.root);
    const hp = sp.hp !== undefined ? sp.hp : sp.worn ? Math.round(t.hp * L.rand(0.45, 1)) : t.hp;
    const v = { type: sp.type, t, rig, x: sp.x, z: sp.z, yaw: sp.yaw, speed: 0, steer: 0, hp, wheel: 0, lean: 0 };
    v.id = sp.id || NID++; v.key = 'v' + v.id; L.byId.set(v.key, v);
    E.vehicles.push(v);
    rig.root.position.set(sp.x, 0, sp.z); rig.root.rotation.y = sp.yaw;
  }
  function enterVehicle(v) {
    const seat = seatFor(v);
    if (seat < 0) { L.msg('Kein Platz mehr frei.'); return; }
    P.vehicle = v; P.seat = seat; P.belted = false; P.stance = 'stand'; P.vx = P.vz = 0; P.beltWarnT = 2;
    P.freeLookT = 0; P.camYaw = v.yaw;
    if (NET() !== 'solo') L.mp.send({ t: 'venter', id: v.id, seat });
    L.snd.key();
    if (seat > 0) { L.msg(`👥 Du fährst bei ${driverName(v)} mit${v.t.kind === 'car' ? ' – B zum Anschnallen!' : ' – halt dich fest!'}`); return; }
    L.msg(v.t.kind === 'car' ? `🚗 ${v.t.name} – B zum Anschnallen!` : v.t.scooter ? `🛴 ${v.t.name} – fast lautlos, bis 100 km/h. Ohne Gurt, fahr vorsichtig!` : `🏍️ ${v.t.name} – ohne Gurt, fahr vorsichtig!`);
    L.snd.key();
  }
  function leaveVehicle(silent) {
    const v = P.vehicle; if (!v) return;
    if ((v.alt || 0) > 1.5 && v.hp > 0 && !silent) { L.msg('✈️ Erst landen! (C oder Shift = runter, nur auf dem Boden aussteigen)', 2500); return; }
    if (silent && (v.alt || 0) > 1.5) { v.vy = 0; }
    const kmh = Math.abs(v.speed) * 3.6;
    const seat = P.seat || 0, st = (v.rig.seats || [v.rig.seat])[seat] || v.rig.seat;
    // auf der Seite des eigenen Sitzes aussteigen
    const rx = -Math.cos(v.yaw), rz = Math.sin(v.yaw), fx = Math.sin(v.yaw), fz = Math.cos(v.yaw);
    const side = (v.t.kind === 'car' ? v.t.wid / 2 + 0.9 : 1.1) * (st.x >= 0 ? 1 : -1);
    P.x = v.x - rx * side + fx * st.z; P.z = v.z - rz * side + fz * st.z; P.y = 0;
    L.collide(P.x, P.z, 0.4, 0, RES); P.x = RES.x; P.z = RES.z;
    P.vehicle = null; P.belted = false; P.seat = 0;
    L.engine.set(false, 0);
    if (NET() !== 'solo') L.mp.send({ t: 'vleave', id: v.id, seat, x: v.x, z: v.z, yaw: v.yaw, hp: v.hp });
    if (!silent && kmh > 20) {
      P.vx = Math.sin(v.yaw) * v.speed * 0.6; P.vz = Math.cos(v.yaw) * v.speed * 0.6; P.vy = 2; P.air = true; P.tumble = 0.01;
      L.hurtPlayer((kmh - 20) * 0.5, 'Aus dem fahrenden Fahrzeug gesprungen');
    }
  }
  function eject(v, spd, kmh) {
    const fx = Math.sin(v.yaw), fz = Math.cos(v.yaw);
    const seat = P.seat || 0;
    P.vehicle = null; P.belted = false; P.seat = 0; L.engine.set(false, 0);
    if (NET() !== 'solo') L.mp.send({ t: 'vleave', id: v.id, seat, x: v.x, z: v.z, yaw: v.yaw, hp: v.hp });
    P.x = v.x + fx * (v.t.len * 0.55); P.z = v.z + fz * (v.t.len * 0.55); P.y = (v.alt || 0) + 1.3;
    L.collide(P.x, P.z, 0.4, 0, RES); P.x = RES.x; P.z = RES.z;
    P.vx = fx * spd * 0.62; P.vz = fz * spd * 0.62; P.vy = 4 + spd * 0.08;
    P.air = true; P.tumble = 0.01; P.ejected = true; P.knockT = 2;
    L.fx('#bfe0f0', P.x, 1.3, P.z, 26, 4, { size: 0.06, vx: fx * spd * 0.3, vz: fz * spd * 0.3, life: 1.2 });
    L.snd.glass({ x: P.x, y: 1, z: P.z }, 1);
    L.msg(v.t.kind === 'car' ? `💥 Nicht angeschnallt – bei ${Math.round(kmh)} km/h durch die Windschutzscheibe!` : `💥 Bei ${Math.round(kmh)} km/h vom ${v.t.name} geschleudert!`);
  }
  function crash(v, impact, isPlayer) {
    const kmh = impact * 3.6;
    v.hp -= kmh * (v.type === 'jeep' ? 0.3 : 0.55);
    L.snd.crash(L.clamp(kmh / 120, 0.1, 1), { x: v.x, y: 1, z: v.z });
    L.makeNoise(v.x, v.z, 60 + kmh * 0.8, isPlayer ? P : null);
    L.fx('#9a9a9a', v.x, 1, v.z, Math.min(20, kmh / 5), 3, { size: 0.08 });
    if (!isPlayer) return;
    // fährt der Freund mit, bekommt er den Unfall auch ab
    for (const r of remotesList()) if (r.inVeh && r.vehId === v.id && r.seat > 0) L.mp.sendTo(r.pid, { t: 'vcrash', id: v.id, impact });
    L.crashHurt(v, impact);
  }
  // Unfallschaden für den Spieler (Fahrer oder Mitfahrer)
  L.crashHurt = function (v, impact) {
    const kmh = impact * 3.6;
    L.shake = Math.max(L.shake, L.clamp(kmh / 80, 0.2, 1.5));
    if (kmh < 18 || !P.alive) return;
    const helm = (L.save.char || {}).hat === 'helm';
    if (v.t.kind === 'car') {
      if (P.belted) L.hurtPlayer((kmh - 18) * 0.28, `Unfall mit ${Math.round(kmh)} km/h (angeschnallt)`);
      else {
        L.hurtPlayer((kmh - 18) * 0.7 + (kmh > 45 ? 10 : 0), `Unfall mit ${Math.round(kmh)} km/h – nicht angeschnallt`);
        if (kmh > 45 && P.alive) eject(v, impact, kmh);
      }
    } else {
      L.hurtPlayer((kmh - 15) * 0.55 * (helm ? 0.6 : 1), `Motorradunfall mit ${Math.round(kmh)} km/h`);
      if (kmh > 28 && P.alive) eject(v, impact, kmh);
    }
  };
  // Mitfahrer: der Freund steuert, man kann sich umsehen, anschnallen, aussteigen oder ans Steuer wechseln
  function updatePassenger(dt) {
    const v = P.vehicle, t = v.t, block = L.uiBlock;
    const sens = 0.0022 * L.S().sens;
    if (L.mouse.dx || L.mouse.dy) P.freeLookT = 1.5;
    P.camYaw -= L.mouse.dx * sens; P.camPitch = L.clamp(P.camPitch + L.mouse.dy * sens, -0.3, 1.0);
    P.freeLookT -= dt;
    if (P.freeLookT <= 0) P.camYaw += L.angDiff(P.camYaw, v.yaw) * Math.min(1, dt * 3);
    if (!block) {
      if (L.hit('KeyF')) { leaveVehicle(false); return; }
      if (L.hit('KeyB') && t.kind === 'car') { P.belted = !P.belted; L.snd.belt(P.belted); L.msg(P.belted ? '✅ Angeschnallt' : '⚠️ Gurt gelöst'); }
      if (L.hit('KeyE') && !v.occupied && v.hp > 0) {
        // Fahrer ist ausgestiegen: selbst ans Steuer
        if (NET() !== 'solo') L.mp.send({ t: 'vleave', id: v.id, seat: P.seat, x: v.x, z: v.z, yaw: v.yaw, hp: v.hp });
        P.seat = 0; v.netPose = null; v.speed = 0; v.lat = 0;
        if (NET() !== 'solo') L.mp.send({ t: 'venter', id: v.id, seat: 0 });
        L.msg('🚗 Du sitzt jetzt am Steuer'); L.snd.key();
        return;
      }
      for (let i = 0; i < 5; i++) if (L.hit('Digit' + (i + 1))) L.selectSlot(i);
    }
    P.x = v.x; P.z = v.z; P.y = v.alt || 0;
    const rpm = Math.abs(v.speed) / (t.vmax / 3.6);
    L.engine.set(v.occupied && v.hp > 0, t.electric ? rpm : (rpm * 3) % 1 * 0.5 + rpm * 0.6, t.kind === 'bike', t.electric);
    const r = P.rig, s = (v.rig.seats || [v.rig.seat])[P.seat] || v.rig.seat, cy = Math.cos(v.yaw), sy = Math.sin(v.yaw);
    r.root.position.set(v.x + s.x * cy + s.z * sy, s.y + (v.alt || 0), v.z - s.x * sy + s.z * cy);
    r.root.rotation.set(0, v.yaw, 0); r.root.rotateZ(-v.lean);
    L.setHeld(r, null);
    P.animSt = { mode: t.scooter ? 'scooter' : t.kind === 'bike' ? 'ride' : 'sit' };
    L.animHuman(r, P.animSt);
    if (!v.occupied && !P.noDriverMsg) { P.noDriverMsg = true; L.msg('Der Fahrer ist ausgestiegen – E: selbst ans Steuer, F: aussteigen'); }
    if (v.occupied) P.noDriverMsg = false;
  }
  function updateDriving(dt) {
    const v = P.vehicle, t = v.t, block = L.uiBlock;
    const S = L.S(), sens = 0.0022 * S.sens;
    if (L.mouse.dx || L.mouse.dy) P.freeLookT = 1.5;
    P.camYaw -= L.mouse.dx * sens; P.camPitch = L.clamp(P.camPitch + L.mouse.dy * sens, -0.3, 1.0);
    P.freeLookT -= dt;
    if (P.freeLookT <= 0) P.camYaw += L.angDiff(P.camYaw, v.yaw) * Math.min(1, dt * 3);
    if (!block) {
      if (L.hit('KeyF')) { leaveVehicle(false); return; }
      if (L.hit('KeyB') && t.kind === 'car') { P.belted = !P.belted; L.snd.belt(P.belted); L.msg(P.belted ? '✅ Angeschnallt' : '⚠️ Gurt gelöst'); }
      if (L.hit('KeyH')) { L.snd.hupe({ x: v.x, y: 1, z: v.z }); L.makeNoise(v.x, v.z, 150, P); }
      for (let i = 0; i < 5; i++) if (L.hit('Digit' + (i + 1))) L.selectSlot(i);
    }
    if (!block && L.hit('KeyT') && t.teleport) { if (P.tpCd > 0) L.msg('⏳ Teleport lädt noch … ' + Math.ceil(P.tpCd) + ' s', 1200); else teleportVehicle(v); }
    if (t.fly) updateFlight(v, dt, !block && L.keys.Space, !block && (L.keys.KeyC || L.keys.ShiftLeft || L.keys.ShiftRight));
    driveVehicle(v, dt, block ? 0 : (L.keys.KeyW ? 1 : 0) - (L.keys.KeyS ? 1 : 0), block ? 0 : (L.keys.KeyA ? 1 : 0) - (L.keys.KeyD ? 1 : 0), !block && L.keys.Space && !t.fly, true);
    if (!P.vehicle) return;
    P.x = v.x; P.z = v.z; P.y = v.alt || 0;
    // Gurtwarner
    if (t.kind === 'car' && !P.belted && Math.abs(v.speed) > 4) { P.beltWarnT -= dt; if (P.beltWarnT <= 0) { P.beltWarnT = 4; L.snd.beltWarn(); } }
    // Motorgeräusch und Lärm
    const rpm = Math.abs(v.speed) / (t.vmax / 3.6);
    L.engine.set(v.hp > 0, t.electric ? rpm : (rpm * 3) % 1 * 0.5 + rpm * 0.6, t.kind === 'bike', t.electric);
    v.noiseAcc = (v.noiseAcc || 0) + dt;
    // E-Roller sind fast lautlos
    if (v.noiseAcc > 0.5) { v.noiseAcc = 0; L.makeNoise(v.x, v.z, v.hp > 0 ? (t.electric ? 3 + Math.abs(v.speed) * 0.35 : 16 + Math.abs(v.speed) * 1.1) : 0, P); }
    // Figur auf dem Sitz
    const r = P.rig, s = v.rig.seat, cy = Math.cos(v.yaw), sy = Math.sin(v.yaw);
    r.root.position.set(v.x + s.x * cy + s.z * sy, s.y + (v.alt || 0), v.z - s.x * sy + s.z * cy);
    r.root.rotation.set(0, v.yaw, 0);
    if (t.kind === 'bike') r.root.rotation.z = 0;
    r.root.rotateZ(-v.lean);
    L.setHeld(r, null);
    P.animSt = { mode: t.scooter ? 'scooter' : t.kind === 'bike' ? 'ride' : 'sit' };
    L.animHuman(r, P.animSt);
    if (v.hp <= 0 && Math.abs(v.speed) < 0.5 && !v.deadMsg) { v.deadMsg = true; L.msg('🔥 Das Fahrzeug ist kaputt. Steig aus!'); }
  }
  function driveVehicle(v, dt, thr, str, hb, isPlayer) {
    const t = v.t, onR = L.onRoad(v.x, v.z) || (v.alt || 0) > 0.5, vmax = t.vmax / 3.6 * (onR ? 1 : t.off) * (v.hp > 0 ? 1 : 0);
    if (v.hp <= 0) thr = 0;
    if (thr > 0) { if (v.speed < -0.5) v.speed += 16 * dt; else if (v.speed < vmax) v.speed = Math.min(vmax, v.speed + t.acc * dt * (1 - Math.max(0, v.speed) / (vmax * 1.15 + 0.01))); }
    else if (thr < 0) { if (v.speed > 0.5) v.speed -= 15 * dt; else v.speed = Math.max(-8, v.speed - 4 * dt); }
    else v.speed -= Math.sign(v.speed) * Math.min(Math.abs(v.speed), (1.2 + Math.abs(v.speed) * 0.04) * dt);
    if (v.speed > vmax) v.speed -= (v.speed - vmax) * Math.min(1, 1.5 * dt);
    // Handbremse bremst nur leicht – so kann man in die Kurve rutschen
    if (hb) v.speed -= Math.sign(v.speed) * Math.min(Math.abs(v.speed), 5 * dt);
    // Geschwindigkeit als Richtung in der Welt (vorwärts + seitlich rutschen)
    const lat0 = v.lat || 0;
    const f0x = Math.sin(v.yaw), f0z = Math.cos(v.yaw);
    const Vx = f0x * v.speed - f0z * lat0, Vz = f0z * v.speed + f0x * lat0;
    // Lenkung: dreht langsam ein, stellt sich von selbst zurück, bei hohem Tempo weniger stark
    v.steer += (str - v.steer) * Math.min(1, dt * (str ? 3.5 : 6));
    const spd = Math.abs(v.speed), top = t.vmax / 3.6;
    const turn = (t.kind === 'bike' ? 1.7 : 1.35) * L.clamp(spd / 6, 0, 1) * L.lerp(1, 0.4, L.clamp(spd / top, 0, 1)) * (hb ? 1.5 : 1);
    v.yaw += v.steer * turn * Math.sign(v.speed) * dt;
    const fx = Math.sin(v.yaw), fz = Math.cos(v.yaw), rx = -fz, rz = fx;
    // alte Bewegungsrichtung auf die neue Fahrzeugrichtung umrechnen
    v.speed = Vx * fx + Vz * fz;
    let lat = Vx * rx + Vz * rz;
    // Haftung der Reifen: normal hoch, mit Handbremse sehr gering (= Drift)
    const grip = hb ? 2.4 : (spd > 14 && Math.abs(v.steer) > 0.85 ? 4.5 : 8);
    lat *= Math.exp(-grip * dt);
    if (!hb && Math.abs(lat) > 0.5) v.speed += Math.sign(v.speed) * Math.abs(lat) * 0.15 * grip * dt * 0.3;
    v.lat = lat;
    const before = v.speed, latBefore = lat;
    // in kleinen Schritten bewegen und dabei jedes Mal auf Wände prüfen
    const alt = v.alt || 0, mvx = (fx * v.speed + rx * lat) * dt, mvz = (fz * v.speed + rz * lat) * dt;
    const nSub = Math.min(40, Math.max(1, Math.ceil(Math.hypot(mvx, mvz) / 0.4)));
    let impact = 0;
    for (let k = 0; k < nSub; k++) {
      v.x += mvx / nSub; v.z += mvz / nSub;
      let hit = false;
      for (const c of vehCircles(v)) {
        L.collide(c[0], c[1], c[2], alt + 0.2, RES);
        if (RES.hit) {
          hit = true;
          v.x += RES.x - c[0]; v.z += RES.z - c[1];
          const into = -((fx * before + rx * latBefore) * RES.nx + (fz * before + rz * latBefore) * RES.nz);
          if (into > impact) impact = into;
        }
      }
      if (hit) break;
    }
    // Driften: Reifenquietschen, Rauch, Lärm
    if (Math.abs(lat) > 3 && spd > 5) {
      v.driftT = (v.driftT || 0) - dt;
      if (v.driftT <= 0) {
        v.driftT = 0.12;
        const bx = v.x - fx * t.len * 0.4, bz = v.z - fz * t.len * 0.4;
        if (L.dist(P.x, P.z, v.x, v.z) < 150) {
          L.fx('#cfcfcf', bx, 0.3, bz, 2, 0.6, { size: 0.35, life: 1.2, g: -0.1, grow: 1.1 });
          L.snd.screech({ x: v.x, y: 0.5, z: v.z }, L.clamp(Math.abs(lat) / 12, 0.05, 0.3));
          if (Math.random() < 0.3) L.decal(bx, bz, 0.35, '#141414');
        }
        if (isPlayer) L.makeNoise(v.x, v.z, 35, P);
      }
    }
    // Zusammenstöße mit anderen Fahrzeugen
    for (const o of E.vehicles) {
      if (o === v || L.dist(o.x, o.z, v.x, v.z) > 7 || Math.abs((o.alt || 0) - alt) > 2) continue;
      for (const a of vehCircles(v)) for (const b of vehCircles(o)) {
        const d = L.dist(a[0], a[1], b[0], b[1]), min = a[2] + b[2];
        if (d < min && d > 0.001) {
          const nx = (a[0] - b[0]) / d, nz = (a[1] - b[1]) / d;
          v.x += nx * (min - d); v.z += nz * (min - d);
          const into = -((fx * before + rx * latBefore) * nx + (fz * before + rz * latBefore) * nz);
          if (into > impact) impact = into;
          o.speed += before * 0.3;
        }
      }
    }
    if (impact > 2.5) { v.speed = -before * 0.15; v.lat = -latBefore * 0.2; crash(v, impact, isPlayer); }
    else if (impact > 0) { v.speed *= 0.8; v.lat *= 0.5; }
    // Monster und Menschen überfahren
    if (Math.abs(v.speed) > 3 && alt < 2) for (const e of allTargets()) {
      if (e.kind === 'walker' || e.kind === 'boss' || e.fly) continue;
      if (L.dist(e.x, e.z, v.x + fx * t.len * 0.4, v.z + fz * t.len * 0.4) > (t.kind === 'bike' ? 1.2 : t.wid * 0.7 + 0.5)) continue;
      const sp = Math.abs(v.speed);
      if (MK[e.kind] && MK[e.kind].heavy) { L.damageEnt(e, sp * 5, v.x, v.z, isPlayer ? P : null); v.speed *= 0.1; crash(v, sp * 0.7, isPlayer); }
      else { L.damageEnt(e, sp * 7, v.x, v.z, isPlayer ? P : null); v.speed *= 0.85; L.snd.splat({ x: e.x, y: 1, z: e.z }); }
      e.x += fx * 3; e.z += fz * 3;
    }
    L.clampWorld(v);
    // Optik
    v.wheel += v.speed * dt / 0.35;
    for (const w of v.rig.wheels) w.rotation.x = v.wheel;
    for (const s of v.rig.steer) s.rotation.y = v.steer * 0.45;
    v.lean = t.kind === 'bike' ? L.clamp(v.steer * v.speed / 40, -0.5, 0.5) : 0;
    v.rig.root.position.set(v.x, alt, v.z);
    v.rig.root.rotation.set(0, v.yaw, 0);
    if (t.kind === 'bike') v.rig.root.rotateZ(-v.lean);
    if (alt > 0.5 && v.vy) v.rig.root.rotateX(-L.clamp(v.vy / 40, -0.3, 0.3));
  }
  // ---------- JOYOR T10: Fliegen ----------
  // Boden unter dem Fahrzeug: Berg oder Dach
  function flyFloor(x, z) {
    let h = L.mountainH(x, z);
    for (const b of L.queryBoxes(x, z, 0.4)) if (b.kind !== 'water' && b.kind !== 'tree' && x > b.x1 && x < b.x2 && z > b.z1 && z < b.z2) h = Math.max(h, b.h);
    return h;
  }
  function updateFlight(v, dt, up, down) {
    const floor = flyFloor(v.x, v.z);
    let vy = v.vy || 0;
    if (v.hp <= 0) { up = false; down = true; }
    // Leertaste = hoch, C oder Shift = schnell runter, nichts drücken = langsam sinken
    if (up) vy += (14 - vy) * Math.min(1, dt * 3);
    else if (down) vy += (-20 - vy) * Math.min(1, dt * 3);
    else vy += ((v.alt > floor + 0.3 ? -6 : 0) - vy) * Math.min(1, dt * 2);
    v.alt = Math.min(250, (v.alt || 0) + vy * dt);
    if (v.alt <= floor) { v.alt = floor; vy = Math.max(0, vy); }
    v.vy = vy;
  }
  // geparkte Fahrzeuge in der Luft sinken langsam auf den Boden
  function settleVehicle(v, dt) {
    if (!(v.alt > 0)) return;
    const floor = v.t.fly ? flyFloor(v.x, v.z) : 0;
    v.vy = Math.max(-15, (v.vy || 0) - 12 * dt);
    v.alt = Math.max(floor, v.alt + v.vy * dt);
    if (v.alt <= floor) v.vy = 0;
    v.rig.root.position.y = v.alt;
  }
  // ---------- JOYOR T6E Pro: Teleport nach vorne, danach 5 Sekunden Pause ----------
  function spotFree(x, z, v) {
    if (Math.abs(x) > 1480 || Math.abs(z) > 1480 || L.mountainH(x, z) > 0.3) return false;
    if (L.queryBoxes(x, z, 1.3).length) return false;
    for (const o of E.vehicles) if (o !== v && L.dist(o.x, o.z, x, z) < 3) return false;
    return true;
  }
  function teleportVehicle(v) {
    const fx = Math.sin(v.yaw), fz = Math.cos(v.yaw);
    for (let d = 60; d >= 12; d -= 4) {
      const x = v.x + fx * d, z = v.z + fz * d;
      if (!spotFree(x, z, v)) continue;
      L.fx('#a050ff', v.x, 1, v.z, 30, 5, { basic: true, size: 0.25, life: 0.8 });
      v.x = x; v.z = z; v.lat = 0; v.alt = 0; v.vy = 0;
      P.x = x; P.z = z; P.tpCd = 5;
      L.fx('#a050ff', x, 1, z, 40, 6, { basic: true, size: 0.3, life: 0.9 });
      L.snd.teleport({ x, y: 1, z });
      L.shake = Math.max(L.shake, 0.25);
      v.rig.root.position.set(v.x, 0, v.z);
      return true;
    }
    L.msg('🚫 Vorne ist kein freier Platz zum Teleportieren.', 2000);
    return false;
  }
  // Fahrzeug, das gerade vom anderen Spieler gesteuert wird (Position kommt übers Netz)
  function netVeh(v, dt) {
    const p = v.netPose, k = Math.min(1, dt * 10);
    if (L.dist(v.x, v.z, p.x, p.z) > 20) { v.x = p.x; v.z = p.z; } // Teleport: sofort springen statt gleiten
    v.x += (p.x - v.x) * k; v.z += (p.z - v.z) * k; v.yaw += L.angDiff(v.yaw, p.yaw) * k;
    v.alt = (v.alt || 0) + ((p.alt || 0) - (v.alt || 0)) * k;
    v.speed = p.speed || 0; v.steer = p.steer || 0; if (p.hp !== undefined) v.hp = p.hp;
    v.wheel += v.speed * dt / 0.35;
    for (const w of v.rig.wheels) w.rotation.x = v.wheel;
    for (const s of v.rig.steer) s.rotation.y = v.steer * 0.45;
    v.lean = v.t.kind === 'bike' ? L.clamp(v.steer * v.speed / 40, -0.5, 0.5) : 0;
    v.rig.root.position.set(v.x, v.alt || 0, v.z); v.rig.root.rotation.set(0, v.yaw, 0);
    if (v.t.kind === 'bike') v.rig.root.rotateZ(-v.lean);
    v.rig.root.visible = L.dist(P.x, P.z, v.x, v.z) < 300;
    if (p.until && performance.now() > p.until) v.netPose = null;
  }
  function updateVehicles(dt) {
    for (const v of E.vehicles) {
      if (v === P.vehicle && !(P.seat > 0)) continue;
      if (v.netPose) { netVeh(v, dt); continue; }
      if (v === P.vehicle) continue;
      if (Math.abs(v.speed) > 0.05 && !isClient()) driveVehicle(v, dt, 0, 0, false, false);
      settleVehicle(v, dt);
      v.rig.root.visible = L.dist(P.x, P.z, v.x, v.z) < (v.t.kind === 'bike' ? 200 : 300);
      if (v.hp <= 0 && Math.random() < dt * 4 && v.rig.root.visible) L.fx('#2a2a2a', v.x, 1.5, v.z, 1, 0.4, { size: 0.5, life: 2, g: -0.2, grow: 0.6 });
    }
    const pv = P.vehicle, H = L.env.head;
    if (pv && L.env.day < 0.6) {
      const fx = Math.sin(pv.yaw), fz = Math.cos(pv.yaw);
      H.position.set(pv.x + fx * pv.t.len * 0.5, 1, pv.z + fz * pv.t.len * 0.5);
      H.target.position.set(pv.x + fx * 30, 0, pv.z + fz * 30); H.intensity = 2.2;
    } else H.intensity = 0;
  }

  // ---------- Viktor und Daniel ----------
  // [umherlaufen, Geräusch nachgehen, Jagd]
  const MSPD = { viktor: [1.9, 6.5, 8.8], lange: [2.2, 7.2, 10], daniel: [1.6, 5.5, 7] };
  // Alle Monsterarten: Modell, Animation, Tempo, Leben, Reichweite, Schaden, Geräusche, Trefferzonen [Höhe, Radius, Kopfschuss-Faktor]
  const MK = L.MK = {
    viktor: { build: (v) => L.buildViktor(v), anim: (r, s) => L.animViktor(r, s), hp: 110, r: 0.45, reach: 2.9, grab: 2.4, atk: 0.85, wind: 0.4, dmg: 35, veh: 35, knock: 10, up: 4.5, chase: 'crawl', view: 260,
      voice: (p) => L.snd.viktor(p), idle: (p) => L.snd.click(p), hit: [] },
    daniel: { build: () => L.buildDaniel(), anim: (r, s) => L.animDaniel(r, s), spd: MSPD.daniel, hp: 280, r: 0.8, reach: 3.2, grab: 2.6, atk: 1.1, wind: 0.55, dmg: 45, veh: 50, knock: 15, up: 6, heavy: true, view: 260,
      cause: 'Daniel hat dich zerquetscht', voice: (p) => L.snd.daniel(p), idle: (p) => L.snd.heavy(p, 0.2), hit: [] },
    langer: { build: () => L.buildLanger(), anim: (r, s) => L.animBeast(r, s), spd: [1.5, 5.5, 9.5], hp: 140, r: 0.4, reach: 3.4, grab: 2.8, atk: 0.9, wind: 0.45, dmg: 40, veh: 35, knock: 11, up: 5, view: 300,
      cause: 'Der Gesichtslose hat dich geholt', voice: (p) => L.snd.langer(p), idle: (p) => L.snd.langerIdle(p), hit: [[1.4, 0.3, 1], [2.3, 0.3, 1], [3.1, 0.2, 2]] },
    rufer: { build: () => L.buildRufer(), anim: (r, s) => L.animBeast(r, s), spd: [1.5, 4.5, 8], hp: 650, r: 1.1, reach: 6.5, grab: 5.5, atk: 1.5, wind: 0.6, dmg: 60, veh: 70, knock: 18, up: 8, heavy: true, view: 480,
      cause: 'Der Rufer hat dich zertreten', voice: (p) => L.snd.rufer(p), idle: (p) => { L.snd.ruferStep(p); if (Math.random() < 0.4) L.snd.ruferIdle(p); }, hit: [[3.5, 0.9, 1], [6, 1, 1], [9, 1.1, 2]] },
    blockling: { build: () => L.buildBlockling(), anim: (r, s) => L.animBeast(r, s), spd: [2.2, 7, 10.5], hp: 55, r: 0.4, reach: 2.2, grab: 2, atk: 0.6, wind: 0.3, dmg: 25, veh: 25, knock: 8, up: 4, view: 220,
      cause: 'Ein Blockling hat dich erwischt', voice: (p) => L.snd.blockling(p), idle: (p) => L.snd.blocklingIdle(p), hit: [[0.9, 0.3, 1], [1.6, 0.3, 2]] },
    schwelle: { build: () => L.buildSchwelle(), anim: (r, s) => L.animBeast(r, s), spd: [1.4, 6, 12.5], hp: 90, r: 0.5, reach: 2.6, grab: 2.4, atk: 0.7, wind: 0.35, dmg: 40, veh: 35, knock: 10, up: 4.5, hear: 0.6, view: 240,
      cause: 'Der Schwellengänger hat dich gepackt', voice: (p) => L.snd.schwelle(p), idle: (p) => L.snd.schwelleIdle(p), hit: [[1.0, 0.45, 1], [1.1, 0.25, 2]] },
    greifer: { build: () => L.buildGreifer(), anim: (r, s) => L.animBeast(r, s), spd: [1.8, 6.5, 9.5], hp: 380, r: 1.6, reach: 4.5, grab: 3.8, atk: 1.0, wind: 0.5, dmg: 55, veh: 55, knock: 14, up: 6, heavy: true, metal: true, view: 320,
      cause: 'Ein Greifer hat dich gepackt', voice: (p) => L.snd.greifer(p), idle: (p) => L.snd.greiferIdle(p), hit: [[3.1, 1.6, 1], [3.8, 0.5, 2]] },
    marsianer: { build: () => L.buildMarsianer(), anim: (r, s) => L.animBeast(r, s), spd: [1.3, 4.5, 7], hp: 160, r: 0.8, reach: 2.8, grab: 2.4, atk: 0.9, wind: 0.45, dmg: 45, veh: 40, knock: 9, up: 4, view: 260,
      cause: 'Ein Marsianer hat dich gepackt', voice: (p) => L.snd.marsianer(p), idle: (p) => L.snd.marsianerIdle(p), hit: [[1.55, 0.85, 1], [1.7, 0.3, 2]] },
    starrende: { build: () => L.buildStarrende(), anim: (r, s) => L.animBeast(r, s), spd: [1.2, 6, 11], hp: 120, r: 0.4, reach: 2.4, grab: 2.2, atk: 0.6, wind: 0.3, dmg: 50, veh: 40, knock: 9, up: 4, view: 260,
      cause: 'Die Starrende hat dich erwischt, als du weggeschaut hast', voice: (p) => L.snd.starrende(p), idle: (p) => L.snd.starrendeIdle(p), hit: [[1.2, 0.3, 1], [1.9, 0.25, 1], [2.3, 0.2, 2]] },
    flieger: { build: () => L.buildFlieger(), anim: (r, s) => L.animBeast(r, s), spd: [7, 13, 16], hp: 300, r: 3, fly: true, metal: true, view: 520,
      cause: 'Im schwarzen Rauch erstickt', voice: (p) => L.snd.flieger(p), idle: (p) => L.snd.fliegerIdle(p), hit: [[16, 3.4, 1], [15.4, 0.9, 2]] }
  };
  function spawnMonster(kind, x, z, variant, id) {
    const D = MK[kind] || MK.viktor;
    const rig = D.build(variant);
    L.scene.add(rig.root);
    const m = {
      kind, variant, rig, x, z, yaw: Math.random() * 6.28, hp: kind === 'viktor' ? (variant === 'lange' ? 150 : 110) : D.hp, fly: !!D.fly,
      state: 'wander', tx: x, tz: z, home: { x, z }, timer: Math.random() * 5, phase: Math.random() * 10, atk: 0, hitDone: false,
      cd: 0, dead: false, deadT: 0, prey: null, anim: 'walk', stuckT: 0, detT: 0, lastX: x, lastZ: z, lod: 0, voice: 0
    };
    m.spd = (kind === 'viktor' ? (variant === 'lange' ? MSPD.lange : MSPD.viktor) : D.spd).map((s) => s * L.md.speed);
    m.id = id || NID++; m.key = 'm' + m.id; L.byId.set(m.key, m);
    E.monsters.push(m);
    return m;
  }
  function monsterHear(m, x, z, inten, d, src) {
    if (m.state === 'attack' || m.calmT > 0) return;
    const was = m.state;
    const off = d * 0.08;
    m.tx = x + L.rand(-off, off); m.tz = z + L.rand(-off, off);
    m.prey = src || null;
    m.state = (inten > 0.45 && d < 35) || was === 'chase' ? 'chase' : 'investigate';
    m.timer = 12;
    if (was === 'wander' || was === 'search' || was === 'listen') m.alertT = 0.6;
    if ((was === 'wander' || was === 'search' || was === 'listen') && m.voice <= 0) {
      m.voice = 4;
      if (L.dist(P.x, P.z, m.x, m.z) < 120) MK[m.kind].voice({ x: m.x, y: 2.5, z: m.z });
    }
    if (m.kind === 'rufer' && m.state === 'chase' && !(m.callCd > 0)) ruferCall(m);
  }
  // schaut der Spieler gerade auf dieses Monster? (Blickrichtung der Kamera + freie Sicht)
  function lookedAt(m) {
    const cam = L.camera; cam.getWorldDirection(V3);
    const dx = m.x - cam.position.x, dy = 1.8 - cam.position.y, dz = m.z - cam.position.z, d = Math.hypot(dx, dy, dz) || 1;
    if ((dx * V3.x + dy * V3.y + dz * V3.z) / d < 0.8) return false;
    return L.los(m.x, 2, m.z, P.x, (P.y || 0) + 1.5, P.z);
  }
  // Der Rufer ruft alle Monster in der Nähe zu dir
  function ruferCall(m) {
    m.callCd = 25; m.sirenT = 10;
    L.snd.rufer({ x: m.x, y: 9, z: m.z });
    for (const o of E.monsters) if (o !== m && !o.dead && o.state !== 'chase' && o.state !== 'attack' && L.dist(o.x, o.z, m.x, m.z) < 260) {
      o.state = 'investigate'; o.tx = m.tx + L.rand(-10, 10); o.tz = m.tz + L.rand(-10, 10); o.timer = 20;
    }
    if (L.dist(P.x, P.z, m.x, m.z) < 350) L.msg('📯 Der Rufer ruft die anderen Monster herbei!', 4000);
  }
  // Ziel in der Raserei: nächster Spieler, der nicht im Turm ist
  function frenzyTarget(m) {
    let best = null, bd = 450;
    for (const p of players()) {
      if (L.towerSafe() && L.inTower(p.x, p.z)) continue;
      const d = L.dist(p.x, p.z, m.x, m.z); if (d < bd) { bd = d; best = p; }
    }
    return best;
  }
  // nach MAMA IVA: alle Monster rennen weg und beruhigen sich
  function calmMonsters() {
    if (!L.frenzy) return;
    L.frenzy = false;
    for (const m of E.monsters) {
      if (m.dead) continue;
      const [p] = nearestPlayer(m.x, m.z);
      const a = p ? Math.atan2(m.x - p.x, m.z - p.z) : Math.random() * 6.28;
      m.state = 'investigate'; m.alertT = 0; m.prey = null; m.timer = 25; m.calmT = 25;
      m.tx = L.clamp(m.x + Math.sin(a) * 220, -1480, 1480); m.tz = L.clamp(m.z + Math.cos(a) * 220, -1480, 1480);
    }
    L.msg('😮‍💨 MAMA IVA ist weg – die Monster laufen davon.', 6000);
  }
  // Monster bleiben draußen vor dem Turm
  function keepOutOfTower(e) {
    if (!L.towerSafe() || !L.inTower(e.x, e.z, 1.5)) return;
    const T0 = L.TOWER, dx = e.x - T0.x, dz = e.z - T0.z, lim = T0.half + 1.5;
    if (Math.abs(dx) > Math.abs(dz)) e.x = T0.x + Math.sign(dx || 1) * lim; else e.z = T0.z + Math.sign(dz || 1) * lim;
  }
  const safeIn = (x, z) => L.towerSafe() && L.inTower(x, z);
  function monsterVictims(m) {
    const list = [];
    if (P.alive && !P.gone && !safeIn(P.x, P.z) && (P.y || 0) < 2.5) list.push({ e: P, x: P.x, z: P.z, moving: Math.hypot(P.vx, P.vz) > 0.4 || (P.vehicle && Math.abs(P.vehicle.speed) > 0.5), sneaking: P.stance !== 'stand' && !P.vehicle });
    for (const rp of RPs()) if (Math.abs(rp.x - m.x) < 5 && Math.abs(rp.z - m.z) < 5 && !safeIn(rp.x, rp.z) && (rp.y || 0) < 2.5) list.push({ e: rp, x: rp.x, z: rp.z, moving: rp.moving, sneaking: rp.stance !== 'stand' && !rp.inVeh });
    for (const n of E.npcs) if (!n.dead && Math.abs(n.x - m.x) < 4 && Math.abs(n.z - m.z) < 4) list.push({ e: n, x: n.x, z: n.z, moving: n.moving, sneaking: false });
    return list;
  }
  function moveToward(e, tx, tz, spd, dt, r) {
    const want = Math.atan2(tx - e.x, tz - e.z);
    let yaw = want;
    if (e.stuckT > 0) { yaw = want + e.detour; e.stuckT -= dt; }
    e.yaw += L.angDiff(e.yaw, yaw) * Math.min(1, dt * 5);
    const nx = e.x + Math.sin(e.yaw) * spd * dt, nz = e.z + Math.cos(e.yaw) * spd * dt;
    L.collide(nx, nz, r, 0, RES);
    const moved = Math.hypot(RES.x - e.x, RES.z - e.z);
    e.x = RES.x; e.z = RES.z;
    L.clampWorld(e);
    if (spd > 0.5 && moved < spd * dt * 0.3 && e.stuckT <= 0) { e.stuckT = 1.5; e.detour = (Math.random() < 0.5 ? -1 : 1) * L.rand(1, 1.8); }
  }
  function updateMonster(m, dt) {
    if (m.fly) return updateFlier(m, dt);
    const D = MK[m.kind];
    const dP = L.dist(P.x, P.z, m.x, m.z), rig = m.rig, dN = nearDist(m.x, m.z, dP);
    rig.root.visible = dP < (m.variant === 'lange' ? 300 : D.view);
    if (m.dead) {
      m.deadT += dt;
      D.anim(rig, { mode: 'dead' });
      rig.root.position.set(m.x, 0, m.z); rig.root.rotation.y = m.yaw;
      return m.deadT < 45;
    }
    // weit weg: grob und selten rechnen
    if (dN > 450 && !L.frenzy) {
      m.lod += dt; if (m.lod < 0.5) return true; dt = m.lod; m.lod = 0;
    }
    m.calmT = (m.calmT || 0) - dt; m.callCd = (m.callCd || 0) - dt;
    // Raserei, solange MAMA IVA da ist: alle stürmen auf den nächsten Spieler zu
    if (L.frenzy && m.state !== 'attack') {
      m.frT = (m.frT || 0) - dt;
      if (m.frT <= 0) {
        m.frT = 0.5;
        const t = frenzyTarget(m);
        if (t) { if (m.state !== 'chase' && dP < 120 && m.voice <= 0) { m.voice = 5; D.voice({ x: m.x, y: 2.5, z: m.z }); } m.state = 'chase'; m.tx = t.x; m.tz = t.z; m.prey = t; m.timer = 5; m.alertT = 0; }
        else if (m.state === 'chase') { m.state = 'search'; m.timer = 3; }
      }
    }
    // Die Starrende: kommt näher, sobald du wegschaust – schaust du sie an, erstarrt sie
    if (m.kind === 'starrende') {
      const dS = L.dist(P.x, P.z, m.x, m.z);
      if (dS < 90 && P.alive && !P.gone && !safeIn(P.x, P.z) && m.state !== 'attack') { m.state = 'chase'; m.tx = P.x; m.tz = P.z; m.prey = P; m.timer = 5; m.alertT = 0; }
      if (dS < 90 && lookedAt(m)) {
        m.frozen = true; m.anim = 'search';
        rig.root.position.set(m.x, 0, m.z); rig.root.rotation.y = m.yaw;
        return true;
      }
      if (m.frozen && dS < 40 && m.voice <= 0) { m.voice = 3; D.voice({ x: m.x, y: 2, z: m.z }); }
      m.frozen = false;
    }
    // Der Rufer heult immer wieder seine Sirene – weit über die Karte zu hören
    if (m.kind === 'rufer') {
      m.sirenT = (m.sirenT === undefined ? L.rand(5, 25) : m.sirenT) - dt;
      if (m.sirenT <= 0) { m.sirenT = m.state === 'chase' ? L.rand(8, 12) : L.rand(25, 45); if (dP < 700) D.voice({ x: m.x, y: 9, z: m.z }); }
    }
    // Der Gesichtslose springt beim Jagen ein Stück nach vorne (mit Rauschen)
    if (m.kind === 'langer' && m.state === 'chase' && !(m.alertT > 0)) {
      m.blinkT = (m.blinkT === undefined ? 3 : m.blinkT) - dt;
      const dT = L.dist(m.x, m.z, m.tx, m.tz);
      if (m.blinkT <= 0 && dT > 14) {
        m.blinkT = L.rand(2.5, 4.5);
        const k = Math.min(10, dT - 6) / dT, nx = m.x + (m.tx - m.x) * k, nz = m.z + (m.tz - m.z) * k;
        if (!L.queryBoxes(nx, nz, 0.6).length && !safeIn(nx, nz)) { m.x = nx; m.z = nz; if (dP < 90) L.snd.radio({ x: m.x, y: 2, z: m.z }); }
      }
    }
    m.cd -= dt; m.voice -= dt; m.phase += dt * (m.state === 'chase' ? 9 : m.state === 'investigate' ? 6 : 3.2);
    const r = D.r;
    if (m.state === 'attack') {
      m.atk += dt / D.atk;
      const wind = D.wind;
      if (m.atk >= wind && !m.hitDone) {
        m.hitDone = true;
        const v = m.victim, reach = D.reach;
        if (v && L.dist(v.x, v.z, m.x, m.z) < reach) monsterStrike(m, v);
      }
      if (m.atk >= 1) { m.state = 'listen'; m.timer = 3.5; }
    } else if (m.state === 'listen' || m.state === 'search') {
      m.timer -= dt;
      if (m.timer <= 0) { m.state = 'wander'; m.timer = 0; }
    } else if (m.state === 'investigate' || m.state === 'chase') {
      if (m.alertT > 0) {
        // kurz zusammenzucken und zum Geräusch drehen, dann losrennen
        m.alertT -= dt;
        m.yaw += L.angDiff(m.yaw, Math.atan2(m.tx - m.x, m.tz - m.z)) * Math.min(1, dt * 8);
      } else moveToward(m, m.tx, m.tz, (m.state === 'chase' ? m.spd[2] : m.spd[1]) * (L.frenzy && m.state === 'chase' ? 2.3 : 1), dt, r);
      m.timer -= dt;
      if (L.dist(m.x, m.z, m.tx, m.tz) < 1.6 || m.timer <= 0) { m.state = 'search'; m.timer = L.rand(4, 7); }
    } else {
      m.timer -= dt;
      if (m.timer <= 0 || L.dist(m.x, m.z, m.tx, m.tz) < 2) {
        if (Math.random() < 0.3) { m.state = 'listen'; m.timer = L.rand(3, 6); }
        else if (Math.random() < 0.3) {
          // wandert zu einem anderen Ort auf der Karte
          const p = L.pick(L.POIS);
          m.tx = L.clamp(p.x + L.rand(-p.r, p.r) * 0.7, -1480, 1480); m.tz = L.clamp(p.z + L.rand(-p.r, p.r) * 0.7, -1480, 1480);
          m.home = { x: m.tx, z: m.tz }; m.timer = L.rand(60, 160);
        } else { m.tx = L.clamp(m.x + L.rand(-150, 150), -1480, 1480); m.tz = L.clamp(m.z + L.rand(-150, 150), -1480, 1480); m.timer = L.rand(15, 35); }
      }
      if (m.state === 'wander') moveToward(m, m.tx, m.tz, m.spd[0], dt, r);
    }
    keepOutOfTower(m);
    // Opfer ertasten
    if (m.state !== 'attack' && m.cd <= 0 && dN < 30) {
      for (const v of monsterVictims(m)) {
        const d = L.dist(v.x, v.z, m.x, m.z);
        const touch = v.sneaking ? 1.1 : 1.7;
        const hunting = m.state === 'chase' || m.state === 'investigate';
        // direkt angestoßen (unter 0,8 m) spürt er dich immer – auch wenn du still liegst
        if ((d < touch && (v.moving || hunting)) || d < 0.8 || (hunting && d < D.grab && L.dist(v.x, v.z, m.tx, m.tz) < 4)) {
          m.state = 'attack'; m.atk = 0; m.hitDone = false; m.victim = v.e; m.cd = 2.5;
          m.yaw = Math.atan2(v.x - m.x, v.z - m.z);
          if (dP < 60) D.voice({ x: m.x, y: 2.5, z: m.z });
          break;
        }
      }
    }
    // Klick-Geräusche in der Nähe (damit man sie hört)
    if (dP < 80 && Math.random() < dt * 0.3) D.idle({ x: m.x, y: 2.6, z: m.z });
    if (m.state === 'chase' && dP < 110 && m.voice <= 0 && m.kind !== 'rufer') { m.voice = L.rand(4, 7); D.voice({ x: m.x, y: 2.5, z: m.z }); }
    if (!rig.root.visible) return true;
    const anim = m.state === 'attack' ? 'attack' : m.alertT > 0 ? 'alert' : m.state === 'chase' ? (D.chase || 'run') : m.state === 'investigate' ? 'run' : m.state === 'wander' ? 'walk' : 'search';
    m.anim = anim;
    D.anim(rig, { mode: anim, phase: m.phase, atk: m.atk });
    rig.root.position.set(m.x, 0, m.z); rig.root.rotation.y = m.yaw;
    return true;
  }
  // ---------- Flugmaschine: fliegt mit Suchlicht, verrät dich an die anderen und wirft schwarzen Rauch ----------
  function updateFlier(m, dt) {
    const D = MK.flieger, dP = L.dist(P.x, P.z, m.x, m.z), rig = m.rig;
    rig.root.visible = dP < D.view;
    if (m.dead) { m.deadT += dt; D.anim(rig, { mode: 'dead' }); rig.root.position.set(m.x, 0, m.z); return m.deadT < 45; }
    m.phase += dt; m.cd -= dt; m.calmT = (m.calmT || 0) - dt; m.alertT = 0;
    if (L.frenzy) { m.frT = (m.frT || 0) - dt; if (m.frT <= 0) { m.frT = 0.5; const t = frenzyTarget(m); if (t) { m.state = 'chase'; m.tx = t.x; m.tz = t.z; m.prey = t; m.timer = 5; } } }
    if (m.state === 'chase' || m.state === 'investigate') {
      m.timer -= dt;
      if (L.dist(m.x, m.z, m.tx, m.tz) < 4 || m.timer <= 0) { m.state = 'search'; m.timer = L.rand(4, 8); }
    } else {
      m.timer -= dt;
      if (m.timer <= 0) { const p = L.pick(L.POIS); m.state = 'wander'; m.tx = L.clamp(p.x + L.rand(-p.r, p.r), -1480, 1480); m.tz = L.clamp(p.z + L.rand(-p.r, p.r), -1480, 1480); m.timer = L.rand(40, 90); }
    }
    const spd = (m.state === 'chase' ? m.spd[2] * (L.frenzy ? 1.6 : 1) : m.state === 'investigate' ? m.spd[1] : m.state === 'wander' ? m.spd[0] : 0);
    if (spd > 0) {
      m.yaw += L.angDiff(m.yaw, Math.atan2(m.tx - m.x, m.tz - m.z)) * Math.min(1, dt * 1.5);
      m.x += Math.sin(m.yaw) * spd * dt; m.z += Math.cos(m.yaw) * spd * dt; L.clampWorld(m);
    } else m.yaw += dt * 0.4;
    // Suchlicht: wer darunter steht und nicht schleicht, wird verraten
    m.scanT = (m.scanT || 0) - dt;
    if (m.scanT <= 0) {
      m.scanT = 0.4;
      for (const p of players()) {
        if (L.dist(p.x, p.z, m.x, m.z) > 9 || safeIn(p.x, p.z)) continue;
        const sneak = p === P ? (P.stance !== 'stand' && !P.vehicle) : (p.stance !== 'stand' && !p.inVeh);
        const moving = p === P ? Math.hypot(P.vx, P.vz) > 0.4 || !!P.vehicle : p.moving;
        if (sneak && !moving) continue;
        if (m.state !== 'chase' && dP < 150) { L.snd.flieger({ x: m.x, y: 16, z: m.z }); if (p === P) L.msg('🛸 Die Flugmaschine hat dich im Licht entdeckt!', 3500); }
        m.state = 'chase'; m.tx = p.x; m.tz = p.z; m.prey = p; m.timer = 10;
        L.makeNoise(p.x, p.z, 60, null);
        break;
      }
    }
    if (m.state === 'chase' && m.cd <= 0 && m.prey && validTarget(m.prey) && L.dist(m.x, m.z, m.prey.x, m.prey.z) < 14 && !safeIn(m.prey.x, m.prey.z)) { m.cd = 7; L.dropSmoke(m.prey.x, m.prey.z, true); }
    if (dP < 60 && Math.random() < dt * 0.5) D.idle({ x: m.x, y: 16, z: m.z });
    m.anim = m.state === 'chase' ? 'run' : 'walk';
    if (!rig.root.visible) return true;
    D.anim(rig, { mode: 'fly', phase: m.phase, fast: m.state === 'chase' });
    rig.root.position.set(m.x, 0, m.z); rig.root.rotation.y = m.yaw;
    return true;
  }
  // schwarzer Rauch: schadet allen, die drinstehen (im Auto ist man geschützt)
  const smokes = [];
  L.dropSmoke = function (x, z, send) {
    smokes.push({ x, z, t: 8, coughT: 0 });
    L.snd.explosion({ x, y: 2, z });
    if (send && isHost()) L.mp.send({ t: 'smoke', x, z });
  };
  function updateSmoke(dt) {
    for (let i = smokes.length - 1; i >= 0; i--) {
      const s = smokes[i]; s.t -= dt;
      if (s.t <= 0) { smokes.splice(i, 1); continue; }
      if (Math.random() < dt * 30) L.fx(Math.random() < 0.5 ? '#111111' : '#262626', s.x + L.rand(-6, 6), L.rand(0.3, 3), s.z + L.rand(-6, 6), 2, 1.5, { size: 1.6, life: 2.5, g: -0.3, grow: 1.2 });
      const inCar = P.vehicle && P.vehicle.t.kind === 'car';
      if (P.alive && !P.gone && !inCar && L.dist(P.x, P.z, s.x, s.z) < 7) {
        P.hp -= 9 * dt * L.md.dmg; P.hurtFlash = Math.min(1, P.hurtFlash + dt);
        s.coughT -= dt; if (s.coughT <= 0) { s.coughT = 0.9; L.snd.hurt(); L.msg('😷 Schwarzer Rauch! Raus hier!', 1500); }
        if (P.hp <= 0) { P.hp = 0; killPlayer(MK.flieger.cause); }
      }
    }
  }
  function monsterStrike(m, v) {
    const dmul = L.md.dmg;
    const dx = (v === P ? P.x : v.x) - m.x, dz = (v === P ? P.z : v.z) - m.z, d = Math.hypot(dx, dz) || 1;
    if (v === P) {
      const sneaking = P.stance !== 'stand' && !P.vehicle;
      const D = MK[m.kind];
      let dmg = sneaking ? D.dmg * dmul : 999;
      if (P.vehicle) dmg = D.veh * dmul;
      const k = D.knock;
      L.blood(P.x, 1.3, P.z, 25, true);
      L.snd.splat({ x: P.x, y: 1, z: P.z });
      L.hurtPlayer(dmg, m.kind === 'viktor' ? `Viktor (${({ grey: 'mit Hut', red: 'mit Schal', blue: 'mit schiefem Kopf', lange: 'der Lange' })[m.variant]}) hat dich erwischt` : D.cause);
      if (P.alive && !P.vehicle) {
        P.vx = dx / d * k; P.vz = dz / d * k; P.vy = D.up; P.air = true; P.tumble = 0.01; P.knockT = 1.2;
        L.msg('😱 Getroffen und weggeschleudert! Bleib leise ...');
      }
    } else if (isRemote(v)) {
      const sneaking = v.stance !== 'stand' && !v.inVeh;
      const D = MK[m.kind];
      let dmg = sneaking ? D.dmg * dmul : 999;
      if (v.inVeh) dmg = D.veh * dmul;
      const k = D.knock;
      hurtRemote(v, dmg, m.kind === 'viktor' ? 'Viktor hat dich erwischt' : D.cause, dx / d * k, dz / d * k, D.up, sneaking);
      L.blood(v.x, 1.3, v.z, 20, true); L.snd.splat({ x: v.x, y: 1, z: v.z });
    } else {
      L.damageEnt(v, 120, m.x, m.z, m);
      L.snd.scream({ x: v.x, y: 1.5, z: v.z });
    }
  }

  // ---------- Stelzer ----------
  function spawnWalker(x, z, id) {
    const rig = L.buildWalker(); L.scene.add(rig.root);
    const w = { kind: 'walker', rig, x, z, yaw: Math.random() * 6.28, hy: 22, hp: 1600, state: 'patrol', tx: x, tz: z, t: Math.random() * 10, sweep: 0, fireT: 0, chargeT: 0, cool: 0, hornT: L.rand(20, 60), dead: false, deadT: 0, aimX: x, aimZ: z };
    initGait(w, rig);
    w.id = id || NID++; w.key = 'w' + w.id; L.byId.set(w.key, w);
    E.walkers.push(w);
    return w;
  }
  function initGait(w, rig) {
    for (const lg of rig.legs) {
      const a = w.yaw + lg.angle;
      lg.footPos.set(w.x + Math.sin(a) * rig.footR, 0, w.z + Math.cos(a) * rig.footR); lg.t = 1;
    }
  }
  const OUT = new T.Vector3();
  function gait(w, rig, dt, speed, stride, stepDur, lift, onStep) {
    const stepping = rig.legs.filter((l) => l.t < 1).length, maxStep = speed > 4 ? 2 : 1;
    for (const lg of rig.legs) {
      const a = w.yaw + lg.angle;
      lg.hip.set(w.x + Math.sin(a) * rig.hipR, w.hy - 1, w.z + Math.cos(a) * rig.hipR);
      const lead = speed * stepDur * 1.2;
      const hx = w.x + Math.sin(a) * rig.footR + Math.sin(w.yaw) * lead, hz = w.z + Math.cos(a) * rig.footR + Math.cos(w.yaw) * lead;
      if (lg.t >= 1 && stepping < maxStep && Math.hypot(lg.footPos.x - hx, lg.footPos.z - hz) > stride) { lg.from.copy(lg.footPos); lg.to.set(hx, 0, hz); lg.t = 0; }
      if (lg.t < 1) {
        lg.t = Math.min(1, lg.t + dt / stepDur);
        lg.footPos.lerpVectors(lg.from, lg.to, lg.t); lg.footPos.y = Math.sin(lg.t * Math.PI) * lift;
        if (lg.t >= 1 && onStep) onStep(lg.footPos);
      }
      OUT.set(Math.sin(a), 0, Math.cos(a));
      L.ik(lg.hip, lg.footPos, rig.legA, rig.legB, lg.kneePos, OUT);
      L.seg(lg.up, lg.hip, lg.kneePos); L.seg(lg.low, lg.kneePos, lg.footPos);
      lg.knee.position.copy(lg.kneePos); lg.foot.position.copy(lg.footPos); lg.glow.position.copy(lg.hip);
    }
  }
  function walkerHear(w, x, z) { if (w.state === 'patrol') { w.state = 'hunt'; w.tx = x; w.tz = z; } else if (w.state === 'hunt') { w.tx = x; w.tz = z; } }
  function canSee(fromX, fromY, fromZ, maxD, t) {
    t = t || P;
    if (!t.alive || t.gone) return false;
    const d = L.dist(fromX, fromZ, t.x, t.z);
    if (d > maxD) return false;
    return L.los(fromX, fromY, fromZ, t.x, (t.y || 0) + 1.2, t.z);
  }
  function updateWalker(w, dt) {
    const rig = w.rig, dP = L.dist(P.x, P.z, w.x, w.z);
    if (w.dead) {
      w.deadT += dt;
      w.hy = Math.max(3, w.hy - dt * 12);
      rig.hull.position.set(w.x, w.hy, w.z); rig.hull.rotation.set(Math.min(0.5, w.deadT * 0.4), w.yaw, 0.3);
      rig.cone.visible = rig.spot.visible = rig.beam.g.visible = false;
      return true;
    }
    w.t += dt; w.cool -= dt; w.hornT -= dt;
    if (w.hornT <= 0) { w.hornT = L.rand(35, 80); L.snd.horn({ x: w.x, y: 22, z: w.z }); }
    const far = nearDist(w.x, w.z, dP) > 700;
    let speed = 0;
    if (w.state === 'patrol' || w.state === 'hunt') {
      if (w.state === 'patrol' && (L.dist(w.x, w.z, w.tx, w.tz) < 20)) {
        const p = Math.random() < 0.6 ? L.pick(L.POIS) : { x: L.rand(-1300, 1300), z: L.rand(-1300, 1300) };
        w.tx = p.x + L.rand(-80, 80); w.tz = p.z + L.rand(-80, 80);
      }
      if (w.state === 'hunt' && L.dist(w.x, w.z, w.tx, w.tz) < 15) { w.state = 'patrol'; }
      speed = w.state === 'hunt' ? 6 : 3.2;
      const want = Math.atan2(w.tx - w.x, w.tz - w.z);
      w.yaw += L.clamp(L.angDiff(w.yaw, want), -0.5 * dt, 0.5 * dt);
      w.x += Math.sin(w.yaw) * speed * dt; w.z += Math.cos(w.yaw) * speed * dt;
      L.clampWorld(w);
    }
    // Suchscheinwerfer
    w.sweep = Math.sin(w.t * 0.45) * 0.9;
    const la = w.yaw + w.sweep, ld = 38;
    const gx = w.x + Math.sin(la) * ld, gz = w.z + Math.cos(la) * ld;
    const night = 1 - L.env.day;
    if (!far) {
      const top = V1.set(w.x + Math.sin(w.yaw) * 6.8, w.hy - 0.3, w.z + Math.cos(w.yaw) * 6.8);
      const len = Math.hypot(gx - top.x, -top.y, gz - top.z);
      rig.cone.position.copy(top); rig.cone.scale.set(9, len, 9);
      rig.cone.quaternion.setFromUnitVectors(V2.set(0, -1, 0), V3.set(gx - top.x, -top.y, gz - top.z).normalize());
      rig.cone.material.opacity = 0.03 + night * 0.08;
      rig.spot.position.set(gx, 0.12, gz); rig.spot.scale.setScalar(9); rig.spot.material.opacity = 0.12 + night * 0.35;
    }
    rig.cone.visible = rig.spot.visible = !far;
    // Entdecken
    if (w.state !== 'fire' && w.cool <= 0) {
      for (const t of players()) {
        const dT = L.dist(t.x, t.z, w.x, w.z), mv = t === P ? Math.hypot(P.vx, P.vz) : (t.moving ? 1 : 0);
        const inSpot = L.dist(t.x, t.z, gx, gz) < 9 && !(t.stance === 'crawl' && mv < 0.3);
        const close = dT < 22 && t.stance === 'stand' && mv > 0.5;
        const flash = t.flash && night > 0.4 && dT < 120 && Math.abs(L.angDiff(w.yaw, Math.atan2(t.x - w.x, t.z - w.z))) < 1.2;
        if ((inSpot || close || flash) && canSee(w.x, w.hy - 2, w.z, 160, t)) {
          w.state = 'fire'; w.chargeT = 1.3; w.fireT = 3; w.aimX = t.x; w.aimZ = t.z; w.target = t;
          L.snd.charge({ x: w.x, y: w.hy, z: w.z });
          const txt = '⚠️ Ein Stelzer hat dich entdeckt! Versteck dich hinter Gebäuden!';
          if (t === P) L.msg(txt); else if (isRemote(t)) L.mp.sendTo(t.pid, { t: 'msg', text: txt });
          break;
        }
      }
    }
    if (w.state === 'fire') {
      const T = validTarget(w.target) ? w.target : P;
      const see = canSee(w.x, w.hy - 2, w.z, 170, T);
      w.yaw += L.clamp(L.angDiff(w.yaw, Math.atan2(T.x - w.x, T.z - w.z)), -1.2 * dt, 1.2 * dt);
      if (see) { const k = Math.min(1, dt * 1.6); w.aimX += (T.x - w.aimX) * k; w.aimZ += (T.z - w.aimZ) * k; }
      if (w.chargeT > 0) { w.chargeT -= dt; rig.eye.scale.setScalar(1.05 + (1.3 - w.chargeT) * 0.6); }
      else {
        w.fireT -= dt;
        const a = V1.set(w.x + Math.sin(w.yaw) * 7, w.hy - 0.3, w.z + Math.cos(w.yaw) * 7), b = V2.set(w.aimX, 0.5, w.aimZ);
        rig.beam.g.visible = true; L.setBeam(rig.beam, a, b, 0.7 + Math.random() * 0.25);
        if (Math.random() < dt * 8) { L.fx('#ff8030', w.aimX, 0.3, w.aimZ, 3, 3, { basic: true, size: 0.15, life: 0.5 }); L.decal(w.aimX, w.aimZ, 1.2, '#1a1008'); }
        if (Math.random() < dt * 3) L.snd.ray({ x: w.aimX, y: 1, z: w.aimZ });
        if (T.alive && L.dist(T.x, T.z, w.aimX, w.aimZ) < 2.6 && see) dps(T, 45 * dt * L.md.dmg, 'Vom Hitzestrahl eines Stelzers verbrannt');
        for (const n of E.npcs) if (!n.dead && L.dist(n.x, n.z, w.aimX, w.aimZ) < 2.5) L.damageEnt(n, 60 * dt, w.x, w.z, w);
        if (w.fireT <= 0) { w.state = see ? 'fire' : 'hunt'; if (!see) { w.tx = T.x; w.tz = T.z; } w.chargeT = see ? 1 : 0; w.fireT = 3; w.cool = see ? 0 : 5; if (!see) rig.beam.g.visible = false; }
      }
    } else { rig.beam.g.visible = false; rig.eye.scale.set(1.05, 1.05, 0.55); }
    // Körper und Beine
    w.hy = 22 + Math.sin(w.t * 1.7) * 0.4;
    if (far) { rig.root.visible = dP < L.S().view + 200; if (!rig.root.visible) return true; }
    rig.root.visible = true;
    rig.hull.position.set(w.x, w.hy, w.z); rig.hull.rotation.set(Math.sin(w.t) * 0.03, w.yaw, Math.sin(w.t * 0.8) * 0.03);
    for (let i = 0; i < rig.cables.length; i++) rig.cables[i].rotation.set(Math.sin(w.t * 1.3 + i) * 0.25, 0, Math.cos(w.t + i * 2) * 0.25);
    gait(w, rig, dt, speed, 7, speed > 4 ? 0.55 : 0.75, 3.5, (fp) => {
      const d = L.dist(P.x, P.z, fp.x, fp.z);
      if (d < 200) L.snd.heavy({ x: fp.x, y: 0, z: fp.z }, 0.6);
      if (d < 60) L.shake = Math.max(L.shake, (60 - d) / 150);
    });
    return true;
  }

  // ---------- MAMA IVA (der Riesen-Boss) ----------
  // Sie erscheint entweder hinter einem Berg oder bricht aus dem Boden, bleibt eine Weile und versinkt dann wieder.
  function spawnBoss() {
    const rig = L.buildKoloss(); L.scene.add(rig.root);
    const stay = L.S().bossMin * 60;
    const fromMountain = L.mountains && L.mountains.length && Math.random() < 0.5;
    let x, z;
    if (fromMountain) {
      // hinter dem Berg, der dem Spieler am nächsten ist (vom Spieler aus gesehen dahinter)
      const m = L.mountains.slice().sort((p, q) => L.dist(p.x, p.z, P.x, P.z) - L.dist(q.x, q.z, P.x, P.z))[0];
      const a = Math.atan2(m.x - P.x, m.z - P.z);
      // auf dem hinteren Hang: so ragen Kopf und Schultern beim Aufsteigen über den Gipfel
      x = L.clamp(m.x + Math.sin(a) * m.r * 0.4, -1485, 1485); z = L.clamp(m.z + Math.cos(a) * m.r * 0.4, -1485, 1485);
    } else {
      // aus dem Boden, 220–350 m vom Spieler entfernt
      x = P.x + 260; z = P.z;
      for (let k = 0; k < 40; k++) {
        const a = Math.random() * 6.28, d = L.rand(220, 350), tx = P.x + Math.sin(a) * d, tz = P.z + Math.cos(a) * d;
        if (Math.abs(tx) < 1450 && Math.abs(tz) < 1450 && L.mountainH(tx, tz) === 0) { x = tx; z = tz; break; }
      }
    }
    const how = fromMountain ? "berg" : "boden";
    const b = { kind: "boss", rig, x, z, yaw: 0, hy: 30, hp: 8000, t: 0, life: stay, tx: P.x + L.rand(-150, 150), tz: P.z + L.rand(-150, 150), stompT: 0, stompCd: 0, beamT: 0, beamCd: 4, leaving: true, dead: false, deadT: 0, aimX: 0, aimZ: 0, roarT: 3,
      how, emerge: -L.FUSION_T, emergeDur: fromMountain ? 9 : 8, rootY: fromMountain ? -50 : -62, startY: fromMountain ? -50 : -62, sinking: 0 };
    b.yaw = Math.atan2(P.x - b.x, P.z - b.z);
    // jedes Mal schneller und stärker – bis man stirbt
    const lvl = Math.min(10, L.save.ivaLvl || 0);
    L.save.ivaLvl = lvl + 1; L.persist();
    b.lvl = lvl; b.spdMul = 1 + lvl * 0.15; b.dmgMul = 1 + lvl * 0.25; b.hp *= 1 + lvl * 0.3;
    initGait(b, rig);
    rig.root.position.y = b.rootY;
    L.boss = b;
    L.frenzy = true;
    if (isHost()) L.mp.send({ t: "boss", x: b.x, z: b.z, yaw: b.yaw, how, lvl: b.lvl });
    L.bossAppear(b);
  }
  // ---------- GIGA-CAPY: steigt aus dem Boden, packt MAMA IVA und zieht sie in die Tiefe ----------
  // Zeitplan (Sekunden): 0–5 aufsteigen · 5–7,5 brüllen · 7,5–9,5 packen · 9,5–15 MAMA IVA versinkt · 10,5–16 GIGA-CAPY taucht hinterher
  L.CAPY_TOTAL = 16.5;
  L.capyStart = function (b) {
    if (b.capy) return;
    const rig = L.buildGigaCapy(); L.scene.add(rig.root);
    // neben MAMA IVA, etwas zum Spieler hin – damit man GIGA-CAPY ganz sieht
    const a = Math.atan2(P.x - b.x, P.z - b.z) + (Math.random() < 0.5 ? 1 : -1) * 1.0;
    const x = b.x + Math.sin(a) * 55, z = b.z + Math.cos(a) * 55;
    b.capy = { rig, x, z, yaw: Math.atan2(b.x - x, b.z - z), y: -85, roared: false, rumbleT: 0 };
    rig.root.position.set(x, -85, z); rig.root.rotation.y = b.capy.yaw;
    L.banner('GIGA-CAPY ERWACHT', 'Ein riesiges Capybara bricht aus dem Boden …');
    if (L.cineCapy) L.cineCapy(b);
  };
  const ease3 = (k) => 1 - Math.pow(1 - L.clamp(k, 0, 1), 3);
  // gibt zurück, wie weit MAMA IVA schon im Boden ist (0 … 1)
  L.capyUpdate = function (b, dt) {
    const c = b.capy; if (!c) return Math.min(1, b.sinking / 7);
    const t = b.sinking, r = c.rig;
    // Höhe
    if (t < 5) c.y = -85 * (1 - ease3(t / 5));
    else if (t < 10.5) c.y = 0;
    else c.y = -90 * ease3((t - 10.5) / 5.5);
    // beim Packen ein Stück auf MAMA IVA zu
    const reach = L.clamp((t - 7.5) / 2, 0, 1) * 18;
    r.root.position.set(c.x + Math.sin(c.yaw) * reach, c.y + L.mountainH(c.x, c.z), c.z + Math.cos(c.yaw) * reach);
    r.root.rotation.y = c.yaw;
    // Arme: hängen → hochreißen (Brüllen) → nach vorne packen
    let armX = 0, elbowX = 0, lean = 0;
    if (t >= 5 && t < 7.5) { const k = ease3((t - 5) / 0.8); armX = -2.5 * k; elbowX = -0.5 * k; lean = -0.12 * k; }
    else if (t >= 7.5) { const k = ease3((t - 7.5) / 1.2); armX = L.lerp(-2.5, -1.25, k); elbowX = L.lerp(-0.5, -0.9, k); lean = L.lerp(-0.12, 0.38, k); }
    for (let i = 0; i < 2; i++) { r.arms[i].arm.rotation.set(armX + Math.sin(t * 3 + i) * 0.05, 0, (i ? -1 : 1) * 0.18); r.arms[i].elbow.rotation.x = elbowX; }
    r.torso.rotation.x = lean;
    r.head.rotation.set(t >= 5 && t < 7.5 ? -0.35 : 0.1, 0, Math.sin(t * 0.8) * 0.06);
    if (t >= 5 && !c.roared) { c.roared = true; L.snd.capyRoar({ x: c.x, y: 50, z: c.z }); L.shake = Math.max(L.shake, 0.9); }
    // Beben, Staub und Steine beim Auf- und Abtauchen
    if (t < 5 || t > 9.5) {
      const d = L.dist(P.x, P.z, c.x, c.z);
      L.shake = Math.max(L.shake, L.clamp((450 - d) / 450, 0, 0.9));
      if (Math.random() < dt * 14) L.fx(Math.random() < 0.5 ? '#5a4630' : '#3a3a36', c.x + L.rand(-18, 18), 0.5, c.z + L.rand(-18, 18), 3, 10, { size: 0.9, life: 2 });
      c.rumbleT -= dt; if (c.rumbleT <= 0) { c.rumbleT = 0.6; L.snd.stomp({ x: c.x, y: 0, z: c.z }); }
    }
    if (t > 9.5) L.bossRise(b, dt);
    if (t >= 9.5 && !c.pulled) { c.pulled = true; L.msg('🦫 GIGA-CAPY zieht MAMA IVA in die Tiefe!', 5000); }
    return t < 9.5 ? 0 : ease3((t - 9.5) / 5.5);
  };
  L.capyRemove = function (b) { if (b && b.capy) { L.scene.remove(b.capy.rig.root); b.capy = null; } };

  // Effekte beim Erscheinen (auch auf den Geräten der Mitspieler)
  L.bossAppear = function (b) {
    // erst verschmelzen alle Monster zu MAMA IVA, dann steigt sie auf
    L.towerRestore();
    L.fusionStart(b.x, b.z);
    if (b.how === "boden") {
      L.decal(b.x, b.z, 30, "#1a120c");
      L.fx("#5a4630", b.x, 1, b.z, 40, 14, { size: 0.9, life: 2.5 });
    }
    const lv = (b.lvl || 0) + 1;
    L.banner("MAMA IVA ENTSTEHT – STUFE " + lv, (lv > 1 ? "Schneller und stärker als letztes Mal! " : "") + "Alle Monster drehen durch! Schaff es zum 🗼 TURM in der Stadtmitte (Karte: M)");
    L.msg('🗼 Nur im Turm bist du vor den Monstern sicher – aber sei dort leise, sonst reißt MAMA IVA ihn ein!', 9000);
    if (L.cineBossAppear) L.cineBossAppear(b);
  };
  // Aufsteigen / Versinken: gemeinsame Optik für Host und Mitspieler
  L.bossRise = function (b, dt) {
    const d = L.dist(P.x, P.z, b.x, b.z);
    if (Math.random() < dt * 12) {
      if (b.how === "boden" || b.sinking) L.fx(Math.random() < 0.5 ? "#5a4630" : "#3a3a36", b.x + L.rand(-14, 14), 0.5, b.z + L.rand(-14, 14), 3, 9, { size: 0.7, life: 1.8 });
      else L.fx("#6a6458", b.x + L.rand(-20, 20), L.mountainH(b.x, b.z) + 30, b.z + L.rand(-20, 20), 2, 6, { size: 0.6, life: 2 });
    }
    L.shake = Math.max(L.shake, L.clamp((420 - d) / 420, 0, 0.8));
    b.rumbleT = (b.rumbleT || 0) - dt;
    if (b.rumbleT <= 0) { b.rumbleT = 0.7; L.snd.stomp({ x: b.x, y: 0, z: b.z }); }
  };
  function updateBoss(dt) {
    const b = L.boss, rig = b.rig, dP = L.dist(P.x, P.z, b.x, b.z);
    if (b.dead) {
      b.deadT += dt; b.hy = Math.max(6, b.hy - dt * 10);
      rig.hull.position.set(b.x, b.hy, b.z); rig.hull.rotation.set(Math.min(1.2, b.deadT * 0.5), b.yaw, 0);
      rig.beam.g.visible = false;
      if (b.deadT > 60) { L.scene.remove(rig.root); L.boss = null; if (isHost()) L.mp.send({ t: 'bossGone' }); }
      return;
    }
    b.t += dt; b.stompCd -= dt; b.beamCd -= dt; b.roarT -= dt;
    if (b.roarT <= 0) { b.roarT = L.rand(15, 30); L.snd.bossRoar({ x: b.x, y: 40, z: b.z }); }
    if (b.emerge < b.emergeDur) {
      // langsam aus dem Boden / hinter dem Berg hervor
      b.emerge += dt;
      const k = L.clamp(b.emerge / b.emergeDur, 0, 1), ease = 1 - Math.pow(1 - k, 3);
      b.rootY = b.startY * (1 - ease);
      if (b.emerge > 0) L.bossRise(b, dt);
      if (k >= 1) { b.rootY = 0; b.leaving = false; L.msg('👹 MAMA IVA ist da – ' + Math.round(b.life / 60) + ' Minuten lang!'); }
    } else if (!b.sinking) {
      b.life -= dt;
      if (b.life <= 0) {
        b.sinking = 0.001; b.leaving = true; rig.beam.g.visible = false;
        L.capyStart(b);
        if (isHost()) L.mp.send({ t: 'capy', x: b.capy.x, z: b.capy.z, yaw: b.capy.yaw });
      }
    } else {
      b.sinking += dt;
      // GIGA-CAPY zieht MAMA IVA in den Boden
      b.rootY = -72 * L.capyUpdate(b, dt);
      if (b.sinking >= L.CAPY_TOTAL) { calmMonsters(); L.capyRemove(b); L.scene.remove(rig.root); L.boss = null; L.round.bossT = L.S().bossMin * 60; if (isHost()) L.mp.send({ t: 'bossGone' }); L.msg('Ruhe … ' + L.S().bossMin + ' Minuten Pause, dann kommt MAMA IVA wieder.', 6000); return; }
    }
    // Ziel: Spieler im Umkreis jagen, sonst letztem Lärm folgen
    // MAMA IVA hört jeden, der nicht schleicht – egal wie weit weg. Nur im Turm ist man sicher, solange man leise ist
    const TW = L.TOWER;
    if (b.towerAtk && !L.towerSafe()) b.towerAtk = false;
    if (b.towerAtk) { b.tx = TW.x; b.tz = TW.z; }
    else if (!b.leaving) {
      let best = null, bd = 1e9;
      for (const t of players()) {
        const loud = t === P ? (P.stance === 'stand' || P.vehicle) : (t.stance === 'stand' || t.inVeh);
        if (!loud || safeIn(t.x, t.z)) continue;
        const d = L.dist(t.x, t.z, b.x, b.z); if (d < bd) { bd = d; best = t; }
      }
      if (best) { b.tx = best.x; b.tz = best.z; }
    }
    const [nearP, dNear] = nearestPlayer(b.x, b.z);
    const dT = L.dist(b.x, b.z, b.tx, b.tz);
    let speed = 0;
    if (!b.leaving && b.stompT <= 0 && dT > (b.towerAtk ? 34 : 12)) {
      speed = (b.towerAtk ? 11 : 7.5) * (b.spdMul || 1);
      const want = Math.atan2(b.tx - b.x, b.tz - b.z);
      b.yaw += L.clamp(L.angDiff(b.yaw, want), -0.45 * dt, 0.45 * dt);
      b.x += Math.sin(b.yaw) * speed * dt; b.z += Math.cos(b.yaw) * speed * dt;
      L.clampWorld(b);
    } else if (!b.leaving && !b.towerAtk && dT <= 12 && b.stompT <= 0) { b.tx = P.x + L.rand(-200, 200); b.tz = P.z + L.rand(-200, 200); }
    // Turm einreißen: ausholen, zuschlagen
    if (b.towerAtk && !b.leaving && dT <= 35 && b.stompT <= 0) {
      b.smashT += dt;
      b.yaw += L.clamp(L.angDiff(b.yaw, Math.atan2(TW.x - b.x, TW.z - b.z)), -dt, dt);
      if (b.smashT > 1.6 && !b.smashed) {
        b.smashed = true; L.towerDestroy();
        if (NET() !== 'solo') L.mp.send({ t: 'tower', down: 1 });
        for (const rp of RPs()) if (L.inTower(rp.x, rp.z, 1)) hurtRemote(rp, 45 * L.md.dmg, 'Vom einstürzenden Turm erschlagen');
      }
      if (b.smashT > 3.2) { b.towerAtk = false; b.smashT = 0; b.smashed = false; }
    }
    // Stampfen
    if (!b.leaving && nearP && dNear < 24 && b.stompCd <= 0 && b.stompT <= 0) { b.stompT = 1.4 / Math.min(1.6, b.spdMul || 1); }
    if (b.stompT > 0) {
      b.stompT -= dt;
      if (b.stompT <= 0) {
        b.stompCd = 6 / (b.spdMul || 1);
        L.snd.stomp({ x: b.x, y: 0, z: b.z }); L.shake = 1.6;
        L.fx('#6a5a40', b.x, 0.5, b.z, 30, 12, { size: 0.4, life: 1.5 });
        L.makeNoise(b.x, b.z, 200, null);
        const d = L.dist(P.x, P.z, b.x, b.z);
        if (d < 26 && P.alive) {
          const sneaking = P.stance !== 'stand' && !P.vehicle;
          L.hurtPlayer((sneaking ? 40 : 85) * L.md.dmg * (b.dmgMul || 1) * (1 - d / 40), 'Von MAMA IVA zertrampelt');
          if (P.alive && !P.vehicle) { const k = 16; P.vx = (P.x - b.x) / (d || 1) * k; P.vz = (P.z - b.z) / (d || 1) * k; P.vy = 7; P.air = true; P.tumble = 0.01; P.knockT = 1.5; }
        }
        for (const n of E.npcs) if (!n.dead && L.dist(n.x, n.z, b.x, b.z) < 26) L.damageEnt(n, 200, b.x, b.z, b);
        for (const rp of RPs()) {
          const d2 = L.dist(rp.x, rp.z, b.x, b.z);
          if (d2 < 26) { const sn = rp.stance !== 'stand' && !rp.inVeh; hurtRemote(rp, (sn ? 40 : 85) * L.md.dmg * (b.dmgMul || 1) * (1 - d2 / 40), 'Von MAMA IVA zertrampelt', (rp.x - b.x) / (d2 || 1) * 16, (rp.z - b.z) / (d2 || 1) * 16, 7, sn); }
        }
        if (isHost()) L.mp.send({ t: 'stomp', x: b.x, z: b.z });
      }
    }
    // Brust-Strahl
    const chest = V1.set(b.x + Math.sin(b.yaw) * 3, b.hy + 9, b.z + Math.cos(b.yaw) * 3);
    if (!b.leaving && b.beamT <= 0 && b.beamCd <= 0) for (const t of players()) {
      const dT = L.dist(t.x, t.z, b.x, b.z), standing = t === P ? (P.stance === 'stand' || P.vehicle) : (t.stance === 'stand' || t.inVeh);
      if (dT > 25 && dT < 110 && standing && canSee(chest.x, chest.y, chest.z, 110, t)) {
        b.beamT = 3.5; b.target = t; b.aimX = t.x + L.rand(-8, 8); b.aimZ = t.z + L.rand(-8, 8); L.snd.charge({ x: b.x, y: b.hy, z: b.z });
        break;
      }
    }
    if (b.beamT > 0) {
      b.beamT -= dt;
      const T = validTarget(b.target) ? b.target : P;
      const see = canSee(chest.x, chest.y, chest.z, 130, T);
      if (see) { const k = Math.min(1, dt * 1.3); b.aimX += (T.x - b.aimX) * k; b.aimZ += (T.z - b.aimZ) * k; }
      if (b.beamT < 2.8) {
        rig.beam.g.visible = true; L.setBeam(rig.beam, chest, V2.set(b.aimX, 0.5, b.aimZ), 1.3);
        if (Math.random() < dt * 8) L.decal(b.aimX, b.aimZ, 1.6, '#1a1008');
        if (Math.random() < dt * 3) L.snd.ray({ x: b.aimX, y: 1, z: b.aimZ });
        if (T.alive && see && L.dist(T.x, T.z, b.aimX, b.aimZ) < 3.2) dps(T, 60 * dt * L.md.dmg * (b.dmgMul || 1), 'Vom Strahl von MAMA IVA verbrannt');
      }
      if (b.beamT <= 0) { rig.beam.g.visible = false; b.beamCd = 7 / (b.spdMul || 1); }
    } else rig.beam.g.visible = false;
    // Optik
    b.hy = 30 + Math.sin(b.t * 1.2) * 0.6 - (b.stompT > 0 ? Math.sin((1.4 - b.stompT) / 1.4 * Math.PI) * -3 : 0);
    rig.hull.position.set(b.x, b.hy, b.z); rig.hull.rotation.set(0, b.yaw, Math.sin(b.t * 0.9) * 0.04);
    rig.root.position.y = b.rootY + L.mountainH(b.x, b.z);
    const sw = Math.sin(b.t * 1.4);
    const sm = b.smashT > 0 ? (b.smashT < 1.3 ? -2.9 * (b.smashT / 1.3) : b.smashT < 1.65 ? -2.9 + (b.smashT - 1.3) / 0.35 * 3.8 : 0.9 * Math.max(0, 1 - (b.smashT - 1.65))) : 0;
    rig.arms[0].arm.rotation.set(-sw * 0.3 - (b.stompT > 0 ? 1.5 : 0) + sm, 0, 0.3); rig.arms[1].arm.rotation.set(sw * 0.3 - (b.stompT > 0 ? 1.5 : 0) + sm, 0, -0.3);
    rig.thin[0].arm.rotation.set(-1.2 + Math.sin(b.t * 2.1) * 0.4, 0, 0.6); rig.thin[1].arm.rotation.set(-1.2 + Math.cos(b.t * 1.9) * 0.4, 0, -0.6);
    rig.thin[0].elbow.rotation.x = -0.8 + Math.sin(b.t * 2.6) * 0.3; rig.thin[1].elbow.rotation.x = -0.8 + Math.cos(b.t * 2.3) * 0.3;
    rig.neck.rotation.set(0.15, Math.sin(b.t * 0.5) * 0.5, Math.sin(b.t * 0.7) * 0.25);
    rig.mouth.scale.y = 0.3 + (b.roarT > 12 ? 0.4 : 0);
    rig.core.scale.setScalar(1.5 + Math.sin(b.t * 6) * 0.2);
    gait(b, rig, dt, speed, 10, 0.85, 5, (fp) => {
      const d = L.dist(P.x, P.z, fp.x, fp.z);
      L.snd.stomp({ x: fp.x, y: 0, z: fp.z });
      L.shake = Math.max(L.shake, L.clamp((200 - d) / 200, 0, 0.9));
      L.makeNoise(fp.x, fp.z, 0, null);
    });
  }

  // ---------- NPCs (andere Überlebende) ----------
  function spawnNpc(x, z, hostile, id, app, wpn) {
    const appearance = app || L.randomAppearance();
    const rig = L.buildHuman(appearance); L.scene.add(rig.root);
    const r = Math.random(), weapon = wpn || (r < 0.6 ? 'pistole' : r < 0.78 ? 'schrotflinte' : r < 0.9 ? 'gewehr' : 'hammer');
    const n = { kind: 'npc', rig, x, z, yaw: Math.random() * 6.28, hp: 100, hostile, weapon, mag: 99, state: 'wander', tx: x, tz: z, phase: 0, shootCd: 1, dead: false, deadT: 0, moving: false, mode: 'walk', alertT: 0, stepAcc: 0, stuckT: 0, lod: 0 };
    L.setHeld(rig, weapon);
    n.app = appearance; n.id = id || NID++; n.key = 'n' + n.id; L.byId.set(n.key, n);
    E.npcs.push(n);
    return n;
  }
  function dropNpcLoot(n) {
    if (n.weapon !== 'hammer') L.spawnItem(n.weapon, n.x + 0.5, n.z, 1, Math.floor(ITEMS[n.weapon].mag * 0.5));
    L.spawnItem(L.pick(['konserve', 'wasser', 'riegel', 'cola', 'verband', '9mm', 'schrot']), n.x - 0.5, n.z + 0.4);
    if (Math.random() < 0.3) L.spawnItem(L.pick(['gold', 'uhr', 'granate']), n.x, n.z - 0.6);
  }
  function updateNpc(n, dt) {
    const dP = L.dist(P.x, P.z, n.x, n.z), rig = n.rig;
    rig.root.visible = dP < 220;
    if (n.dead) { n.deadT += dt; L.animHuman(rig, { mode: 'dead' }); rig.root.position.set(n.x, 0, n.z); rig.root.rotation.y = n.yaw; return n.deadT < 60; }
    if (nearDist(n.x, n.z, dP) > 400) { n.lod += dt; if (n.lod < 0.5) return true; dt = n.lod; n.lod = 0; }
    n.shootCd -= dt; n.alertT -= dt;
    // Bedrohung durch Monster
    let threat = null, td = 26;
    for (const m of E.monsters) { if (m.dead) continue; const d = L.dist(m.x, m.z, n.x, n.z); if (d < td && (m.state === 'chase' || m.state === 'investigate' || d < 10)) { td = d; threat = m; } }
    const [tgt, dT] = nearestPlayer(n.x, n.z);
    const seesPlayer = n.hostile && tgt && dT < 40 && L.los(n.x, 1.6, n.z, tgt.x, 1.2, tgt.z) && (Math.abs(L.angDiff(n.yaw, Math.atan2(tgt.x - n.x, tgt.z - n.z))) < 1.3 || dT < 8 || n.alertT > 0);
    let spd = 0;
    if (threat) {
      n.state = 'flee';
      if (n.weapon !== 'hammer' && td < 18 && n.shootCd <= 0) { npcShoot(n, threat); }
      const ax = n.x - threat.x, az = n.z - threat.z, al = Math.hypot(ax, az) || 1;
      n.tx = n.x + ax / al * 30; n.tz = n.z + az / al * 30; spd = 6.3; n.mode = 'run';
    } else if (seesPlayer) {
      n.state = 'fight'; n.alertT = 5;
      n.yaw += L.angDiff(n.yaw, Math.atan2(tgt.x - n.x, tgt.z - n.z)) * Math.min(1, dt * 6);
      if (n.weapon === 'hammer') { n.tx = tgt.x; n.tz = tgt.z; spd = dT > 1.8 ? 5.5 : 0; n.mode = 'run'; if (dT < 2 && n.shootCd <= 0) { n.shootCd = 1.2; hurtAny(tgt, 12 * L.nd.dmg, 'Von einem Überlebenden erschlagen'); L.snd.hammerHit({ x: tgt.x, y: 1, z: tgt.z }); } }
      else { if (n.shootCd <= 0) npcShoot(n, tgt); spd = dT < 10 ? -2 : dT > 28 ? 3 : 0; n.tx = tgt.x; n.tz = tgt.z; n.mode = 'walk'; }
    } else {
      if (n.state !== 'wander' || L.dist(n.x, n.z, n.tx, n.tz) < 3) {
        n.state = 'wander';
        const p = Math.random() < 0.7 ? L.pick(L.POIS) : { x: n.x + L.rand(-200, 200), z: n.z + L.rand(-200, 200), r: 20 };
        n.tx = L.clamp(p.x + L.rand(-(p.r || 40), p.r || 40) * 0.6, -1450, 1450); n.tz = L.clamp(p.z + L.rand(-(p.r || 40), p.r || 40) * 0.6, -1450, 1450);
      }
      spd = 3.2; n.mode = 'walk';
    }
    if (spd !== 0) {
      if (spd > 0) moveToward(n, n.tx, n.tz, spd, dt, 0.4);
      else { const a = Math.atan2(n.x - (tgt || P).x, n.z - (tgt || P).z); L.collide(n.x + Math.sin(a) * 2 * dt, n.z + Math.cos(a) * 2 * dt, 0.4, 0, RES); n.x = RES.x; n.z = RES.z; }
      n.moving = true;
      n.stepAcc += Math.abs(spd) * dt;
      if (n.stepAcc > 0.8) { n.stepAcc = 0; L.makeNoise(n.x, n.z, spd > 5 ? 24 : 8, n); }
    } else n.moving = false;
    n.phase += dt * (spd > 5 ? 11 : 7.5) * (n.moving ? 1 : 0.1);
    if (!rig.root.visible) return true;
    L.animHuman(rig, { mode: n.mode === 'run' && n.moving ? 'run' : 'walk', phase: n.phase, speed: n.moving ? 1 : 0, aim: n.state === 'fight' && n.weapon !== 'hammer' });
    rig.root.position.set(n.x, 0, n.z); rig.root.rotation.y = n.yaw;
    return true;
  }
  function npcShoot(n, target) {
    const d = ITEMS[n.weapon];
    n.shootCd = d.rate * 4 + L.rand(0.6, 1.4);
    const tx = target === P ? P.x : target.x, tz = target === P ? P.z : target.z, dist = L.dist(n.x, n.z, tx, tz);
    n.yaw = Math.atan2(tx - n.x, tz - n.z);
    L.snd.gun(n.weapon, { x: n.x, y: 1.5, z: n.z });
    L.makeNoise(n.x, n.z, d.noise, n);
    const a = V1.set(n.x, 1.4, n.z), b = V2.set(tx + L.rand(-1, 1), 1.2, tz + L.rand(-1, 1));
    L.tracer(a, b);
    if (isHost()) L.mp.send({ t: 'shot', a: [a.x, a.y, a.z], b: [b.x, b.y, b.z], w: n.weapon });
    const hitP = L.clamp(0.75 - dist / 80, 0.08, 0.75) * L.nd.acc * (target === P && P.stance !== 'stand' ? 0.6 : 1);
    if (Math.random() < hitP) {
      if (target === P || isRemote(target)) hurtAny(target, d.dmg * (d.pellets ? 3 : 1) * 0.6 * L.nd.dmg, 'Von einem anderen Überlebenden erschossen');
      else L.damageEnt(target, d.dmg * (d.pellets ? 3 : 1), n.x, n.z, n);
    }
  }

  // ---------- Hubschrauber ----------
  function updateHeli(dt) {
    const R = L.round, H = L.heli;
    if (R.radio === 'calling') {
      R.radioT -= dt; R.radioPing -= dt;
      if (R.radioPing <= 0) { R.radioPing = 8; L.snd.radio({ x: L.interact.radio.x, y: 2, z: L.interact.radio.z }); L.makeNoise(L.interact.radio.x, L.interact.radio.z, 140, null); }
      if (R.radioT <= 0) {
        R.radio = 'arriving';
        const rig = L.buildHeli('#2a3a4a'); L.scene.add(rig.root);
        L.heli = { rig, x: 1078 + 900, y: 80, z: 528 - 300, state: 'arriving', t: 0 };
        L.banner('HUBSCHRAUBER IM ANFLUG', 'Lauf zum Landeplatz an der Funkstation!');
      }
    }
    if (!H) return;
    H.t += dt;
    const pad = L.interact.radio.pad;
    if (H.state === 'arriving') {
      const dx = pad.x - H.x, dz = pad.z - H.z, d = Math.hypot(dx, dz);
      const sp = Math.min(40, d * 0.4 + 5);
      if (d > 1) { H.x += dx / d * sp * dt; H.z += dz / d * sp * dt; }
      H.y = Math.max(0, L.lerp(H.y, d < 60 ? 0 : 60, dt * 0.5));
      if (d < 2 && H.y < 0.5) { H.state = 'landed'; H.y = 0; H.t = 0; L.banner('HUBSCHRAUBER GELANDET', 'Steig ein (E) – er wartet nur 40 Sekunden!'); }
    } else if (H.state === 'landed') {
      if (H.t > 40) { H.state = 'leaving'; H.t = 0; L.msg('Der Hubschrauber startet ohne dich ...'); R.radio = 'idle'; }
    } else if (H.state === 'leaving') {
      H.y += dt * 8; H.x += dt * 25;
      if (H.y > 150) { L.scene.remove(H.rig.root); L.heli = null; return; }
    }
    H.rig.root.position.set(H.x, H.y, H.z); H.rig.root.rotation.y = -Math.PI / 2;
    H.rig.rotor.rotation.y += dt * 30;
    H.noiseT = (H.noiseT || 0) - dt;
    if (H.noiseT <= 0) { H.noiseT = 0.09; L.snd.rotor({ x: H.x, y: H.y + 3, z: H.z }); }
    H.bigNoise = (H.bigNoise || 0) - dt;
    if (H.bigNoise <= 0) { H.bigNoise = 3; L.makeNoise(H.x, H.z, 180, null); }
  }

  // ---------- Runde ----------
  L.respawnQueue = [];
  function clearAll() {
    for (const m of E.monsters) L.scene.remove(m.rig.root);
    for (const w of E.walkers) L.scene.remove(w.rig.root);
    for (const n of E.npcs) L.scene.remove(n.rig.root);
    for (const v of E.vehicles) L.scene.remove(v.rig.root);
    for (const it of E.items) L.scene.remove(it.mesh);
    for (const g of E.grenades) L.scene.remove(g.m);
    if (L.boss) L.scene.remove(L.boss.rig.root);
    if (L.heli) L.scene.remove(L.heli.rig.root);
    E.monsters = []; E.walkers = []; E.npcs = []; E.vehicles = []; E.items = []; E.grenades = [];
    L.boss = null; L.heli = null; L.respawnQueue = []; L.byId.clear();
  }
  function farSpot(minD) {
    for (let i = 0; i < 60; i++) {
      const x = L.rand(-1450, 1450), z = L.rand(-1450, 1450);
      if (L.dist(x, z, P.x, P.z) < minD) continue;
      if (L.queryBoxes(x, z, 1.5).length) continue;
      return [x, z];
    }
    return [P.x + minD, P.z];
  }
  function randVariant() { const r = Math.random(); return r < 0.28 ? 'grey' : r < 0.56 ? 'red' : r < 0.84 ? 'blue' : 'lange'; }
  L.startRound = function (loadout) {
    const S = L.S();
    L.md = MDIFF[S.monsterDiff] || MDIFF.normal; L.nd = NDIFF[S.npcDiff] || NDIFF.normal;
    clearAll();
    resetPlayer();
    for (const it of loadout || []) {
      const left = L.giveItem(it.type, it.count, it.mag);
      if (left > 0) L.save.stash.push(Object.assign({}, it, { count: left }));
    }
    const sp = L.pick(L.spawnSpots); P.x = sp[0]; P.z = sp[1]; P.yaw = P.camYaw = Math.random() * 6.28;
    L.round = {
      over: false, time: 0, code: [0, 1, 2, 3].map(() => L.randi(0, 9)), found: [false, false, false, false],
      bunkerOpen: false, doorT: 0, radio: 'idle', radioT: 0, gate: 'closed', gateT: 0, alarmT: 0, bossT: S.bossMin * 60, warned: false
    };
    // Tür und Schranke zurücksetzen
    const I = L.interact;
    I.bunker.door.position.y = 0; I.bunker.led.material = L.mat('#ff2020', { basic: true });
    I.gate.gate.position.x = 0; I.gate.gbox.on = true; L.gateOpen = false;
    // Gegenstände
    // Mehrspieler: als Host in der Nähe des Freundes starten lassen (der Freund bekommt einen Punkt ganz in der Nähe)
    L._bulk = true;
    const spots = L.lootSpots.slice().sort(() => Math.random() - 0.5);
    let n = 0;
    for (const s of spots) {
      if (Math.random() > 0.45) continue;
      L.spawnItem(rollLoot(s.poi), s.x, s.z);
      n++;
    }
    const mil = spots.filter((s) => s.poi === 'militaer');
    for (let i = 0; i < 2 && i < mil.length; i++) L.spawnItem('sicherung', mil[i].x + 0.6, mil[i].z, 1);
    const extra = spots.filter((s) => s.poi === 'dorf' || s.poi === 'windpark');
    if (extra.length) L.spawnItem('sicherung', extra[0].x + 0.6, extra[0].z, 1);
    const notePois = ['stadt', 'dorf', 'hof', 'tanke1', 'tanke2', 'camping', 'funk', 'windpark', 'militaer', 'krankenhaus', 'polizei', 'supermarkt'].sort(() => Math.random() - 0.5);
    let ni = 0;
    for (const poi of notePois) {
      if (ni >= 4) break;
      const s = spots.find((q) => q.poi === poi);
      if (!s) continue;
      L.spawnItem('note', s.x - 0.6, s.z + 0.3, 1, undefined, ni); ni++;
    }
    for (const v of L.vehSpots) spawnVehicle(v);
    // Monster
    // Alle Monster sind von Anfang an auf der Karte verteilt (es kommen keine neuen dazu)
    const cm = Math.min(L.md.count, 1.2);
    const place = (kind, n) => {
      let made = 0, tries = 0;
      while (made < n && tries++ < n * 6) {
        let x, z;
        if (Math.random() < 0.6) { const p = L.pick(L.POIS); x = p.x + L.rand(-p.r, p.r) * 0.85; z = p.z + L.rand(-p.r, p.r) * 0.85; }
        else { x = L.rand(-1450, 1450); z = L.rand(-1450, 1450); }
        if (L.dist(x, z, P.x, P.z) < 120 || L.queryBoxes(x, z, 1.2).length) continue;
        if (L.inTower(x, z, 4)) continue;
        spawnMonster(kind, x, z, kind === 'viktor' ? randVariant() : undefined);
        if (kind === 'blockling') for (let k = 0; k < 2; k++) spawnMonster(kind, x + L.rand(-4, 4), z + L.rand(-4, 4));
        made++;
      }
    };
    place('viktor', Math.round(115 * cm));
    place('daniel', Math.round(38 * cm));
    place('langer', Math.round(24 * cm));
    place('rufer', Math.round(14 * cm));
    place('starrende', Math.round(16 * cm));
    for (const k of ['rufer', 'langer', 'starrende']) {
      for (let i = 0; i < 30; i++) {
        const a = Math.random() * 6.28, d = L.rand(150, 240), x = P.x + Math.sin(a) * d, z = P.z + Math.cos(a) * d;
        if (Math.abs(x) > 1450 || Math.abs(z) > 1450 || L.queryBoxes(x, z, 1.5).length || L.inTower(x, z, 4)) continue;
        spawnMonster(k, x, z); break;
      }
    }
    place('blockling', Math.round(9 * cm)); // je 3 zusammen
    place('schwelle', Math.round(18 * cm));
    place('greifer', Math.round(10 * cm));
    place('flieger', Math.round(6 * cm));
    L.frenzy = false; smokes.length = 0; L.towerRestore();
    for (let i = 0; i < Math.max(6, Math.round(20 * L.md.count)); i++) {
      const [x, z] = farSpot(400); spawnWalker(x, z);
      // um jeden Stelzer kriechen Marsianer herum
      for (let k = 0; k < 2; k++) { const mx = x + L.rand(-25, 25), mz = z + L.rand(-25, 25); if (!L.queryBoxes(mx, mz, 1).length && !L.inTower(mx, mz, 4)) spawnMonster('marsianer', L.clamp(mx, -1480, 1480), L.clamp(mz, -1480, 1480)); }
    }
    for (let i = 0; i < S.npcCount; i++) {
      const [x, z] = farSpot(80);
      const hostile = S.npcMode === 'feindlich' ? true : S.npcMode === 'friedlich' ? false : Math.random() < 0.4;
      spawnNpc(x, z, hostile);
    }
    L.env.time = L.rand(6.5, 10); L.randomWeather();
    L.state = 'game'; L.paused = false;
    L.music.set('calm');
    L._bulk = false;
    L.msg('Finde einen Weg hinaus: Bunker-Code, Funkstation oder Autobahnsperre. Sei leise.', 7000);
    if (isHost()) L.mp.sendStart();
  };
  L.endRound = function (result, why) {
    const R = L.round;
    if (R.over) return;
    R.over = true;
    L.engine.set(false, 0);
    if (P.vehicle) { if (NET() !== 'solo') L.mp.send({ t: 'vleave', id: P.vehicle.id, seat: P.seat || 0, x: P.vehicle.x, z: P.vehicle.z, yaw: P.vehicle.yaw, hp: P.vehicle.hp }); P.vehicle = null; }
    P.gone = true;
    if (P.rig && result === 'escape') P.rig.root.visible = false;
    if (NET() !== 'solo') L.mp.send({ t: 'done', result, why });
    const items = L.allPlayerItems();
    if (result === 'escape') L.save.stats.escapes++; else L.save.stats.deaths++;
    L.save.safe = P.safe ? Object.assign({}, P.safe) : null;
    L.persist();
    L.ui.showEnd(result, why, items);
  };

  // ---------- Fluchtwege prüfen ----------
  function updateEscapes(dt) {
    const R = L.round, I = L.interact;
    if (R.bunkerOpen) {
      R.doorT = Math.min(1, R.doorT + dt / 3); I.bunker.door.position.y = R.doorT * 3;
      if (R.doorT > 0.8 && P.alive && L.dist(P.x, P.z, I.bunker.x, I.bunker.z - 1.5) < 2.6) L.endRound('escape', 'Bunker 7');
    }
    if (R.gate === 'opening' && !isClient()) {
      R.gateT -= dt; R.alarmT -= dt;
      if (R.alarmT <= 0) { R.alarmT = 1.2; L.snd.alarm({ x: 0, y: 3, z: -1490 }); L.makeNoise(0, -1490, 320, null); }
      I.gate.gate.position.x = (1 - R.gateT / 30) * 15;
      if (R.gateT <= 0) { R.gate = 'open'; I.gate.gbox.on = false; L.gateOpen = true; L.banner('SCHRANKE OFFEN', 'Raus aus der Sperrzone – nach Norden!'); }
    }
    if (R.gate === 'open' && P.alive && P.z < -1500) L.endRound('escape', 'Autobahnsperre');
  }

  // ---------- Hauptupdate ----------
  L.updateGame = function (dt, t) {
    const R = L.round;
    R.time += dt;
    // Boss-Timer
    if (!L.boss && !isClient()) {
      R.bossT -= dt;
      if (R.bossT < 30 && !R.warned) { R.warned = true; L.banner('DER BODEN BEBT ...', 'In 30 Sekunden kommt MAMA IVA.'); L.snd.horn({ x: P.x + 400, y: 50, z: P.z }); }
      if (R.bossT <= 0) { R.warned = false; spawnBoss(); }
    }
    if (!P.gone) updatePlayer(dt);
    if (isClient()) L.mp.puppets(dt);
    else {
      for (let i = E.monsters.length - 1; i >= 0; i--) if (!updateMonster(E.monsters[i], dt)) { L.byId.delete(E.monsters[i].key); L.scene.remove(E.monsters[i].rig.root); E.monsters.splice(i, 1); }
      for (const w of E.walkers) updateWalker(w, dt);
      if (L.boss) updateBoss(dt);
      for (let i = E.npcs.length - 1; i >= 0; i--) if (!updateNpc(E.npcs[i], dt)) { L.byId.delete(E.npcs[i].key); L.scene.remove(E.npcs[i].rig.root); E.npcs.splice(i, 1); }
    }
    if (NET() !== 'solo') L.mp.update(dt);
    updateVehicles(dt);
    updateGrenades(dt);
    updateItems(dt, t);
    if (!isClient()) updateHeli(dt);
    updateEscapes(dt);
    updateFx(dt);
    updateSmoke(dt);
    L.updateFusion(dt);
    L.updateTower(dt);
    // Musik je nach Lage
    let danger = 0;
    for (const m of E.monsters) {
      if (m.dead) continue;
      const d = L.dist(P.x, P.z, m.x, m.z);
      if (d < 40 && (m.state === 'chase' || m.state === 'attack') && m.prey === P) danger = Math.max(danger, 3);
      else if (d < 35) danger = Math.max(danger, 2);
      else if (d < 70 && m.state !== 'wander') danger = Math.max(danger, 1);
    }
    for (const w of E.walkers) if (!w.dead && w.state === 'fire' && L.dist(P.x, P.z, w.x, w.z) < 200) danger = 3;
    P.danger = danger;
    let stat = 0;
    for (const m of E.monsters) {
      if (m.kind !== 'langer' || m.dead) continue;
      const d = L.dist(P.x, P.z, m.x, m.z); if (d > 40) continue;
      stat = Math.max(stat, (1 - d / 40) * (lookedAt(m) ? 1 : 0.35));
    }
    L.staticAmt = stat;
    if (stat > 0.25 && Math.random() < dt * stat * 3) L.snd.langerIdle({ x: P.x, y: 1.5, z: P.z });
    if (!P.alive) L.music.set('night');
    else if (L.boss && !L.boss.dead) { L.bossMusicLvl = L.boss.lvl || 0; L.music.set('boss'); }
    else if (danger >= 3) L.music.set('chase');
    else if (danger >= 1) L.music.set('tension');
    else {
      L.bgT = (L.bgT || 0) + dt;
      const list = L.env.day < 0.4 ? ['night', 'drift', 'nightB', 'lonely'] : ['calm', 'wander', 'lonely', 'drift'];
      L.music.set(list[Math.floor(L.bgT / 30) % list.length]);
    }
    // Herzschlag bei Nähe
    if (danger >= 2 && P.alive) { P.heartT = (P.heartT || 0) - dt; if (P.heartT <= 0) { P.heartT = danger >= 3 ? 0.55 : 0.85; L.snd.heart(0.25); } }
    // Natur
    if (Math.random() < dt * 0.25) { if (L.env.day > 0.5 && L.env.rain < 0.2) L.snd.bird(); else if (L.env.day < 0.3) L.snd.cricket(); }
    // Taschenlampe
    const F = L.env.flash;
    if (P.flash && P.alive) {
      F.intensity = 2.4;
      const dir = V1; L.camera.getWorldDirection(dir);
      F.position.set(P.x, P.y + (P.stance === 'crawl' ? 0.5 : 1.5), P.z);
      F.target.position.set(P.x + dir.x * 20, P.y + dir.y * 20 + 1, P.z + dir.z * 20);
    } else F.intensity = 0;
  };
  L.updateMenuFx = updateFx;
  // interne Funktionen für den Mehrspieler-Teil (mp.js)
  L._g = { spawnMonster, spawnWalker, spawnNpc, spawnVehicle, clearAll, resetPlayer, removeItem, initGait, gait, MDIFF, NDIFF, players, farSpot };
})();
