'use strict';
// Anzug-Portale: Ziel auf der Karte wählen → vor dir öffnet sich ein Portal (je nach Zielwelt anders) →
// durchgehen → am Ziel kommst du aus einem Portal, das sich hinter dir schließt. Nur mit dem Wächter-Anzug.
(function () {
  const L = window.L, T = THREE, P = L.player;
  const G = () => L.GEO;
  // Aussehen je Welt: Ring, Innenfläche, Deko, Partikel
  const THEMES = {
    home: { ring: 0x40a0ff, inner: 0x9ad0ff, deco: 'stars', dc: '#ffffff', fx: '#9ad0ff', name: 'Heimat' },
    eis: { ring: 0xbfe8ff, inner: 0x40c0ff, deco: 'spikes', dc: '#e8f8ff', fx: '#e8f8ff', name: 'Eisland' },
    wueste: { ring: 0xe8b860, inner: 0xff9a30, deco: 'spikes', dc: '#d8a050', fx: '#e8c890', name: 'Wüste' },
    dschungel: { ring: 0x2e8a3a, inner: 0x60e080, deco: 'leaves', dc: '#3aa040', fx: '#80ff80', name: 'Dschungel' },
    vulkan: { ring: 0x3a1a10, inner: 0xff5010, deco: 'flames', dc: '#ff8020', fx: '#ff6a10', name: 'Vulkan' },
    asgard: { ring: 0xffd040, inner: 0xfff0a0, deco: 'rainbow', dc: '#ffd040', fx: '#fff0a0', name: 'Asgard' },
    pilz: { ring: 0xc040ff, inner: 0xff70d0, deco: 'dots', dc: '#ffffff', fx: '#ff9ae0', name: 'Pilzinsel' },
    kristall: { ring: 0x80d8ff, inner: 0xc0a0ff, deco: 'crystals', dc: '#a0e0ff', fx: '#c0a0ff', name: 'Kristallinsel' },
    geist: { ring: 0x6a7a70, inner: 0xb0ffd0, deco: 'wisps', dc: '#d0ffe8', fx: '#c0ffe0', name: 'Geisterinsel' },
    oma: { ring: 0xff8fc0, inner: 0xffd0e8, deco: 'dots', dc: '#ff4f9a', fx: '#ffb7d5', name: 'Omas Garteninsel' },
    dim: { ring: 0x2a0050, inner: 0xff40d0, deco: 'crystals', dc: '#9a50ff', fx: '#ff40d0', name: 'Dimension' },
    titan: { ring: 0xff7a20, inner: 0xffc060, deco: 'flames', dc: '#ff9a40', fx: '#ffb060', name: 'Titanenmond' },
    moon: { ring: 0xc8c8d0, inner: 0x101030, deco: 'stars', dc: '#ffffff', fx: '#ffffff', name: 'Mond' }
  };
  function worldAt(x, z) {
    if (L.inTitan && L.inTitan(x, z)) return 'titan';
    if (L.inMoon && L.inMoon(x)) return 'moon';
    if (L.inDim(x)) return 'dim';
    const I = L.islandAt ? L.islandAt(x, z) : null;
    return I && THEMES[I.id] ? I.id : 'home';
  }
  function build(th) {
    const g = new T.Group(), Tm = THEMES[th];
    const ring = new T.Mesh(new T.TorusGeometry(2.2, 0.28, 12, 40), new T.MeshBasicMaterial({ color: Tm.ring, fog: false })); g.add(ring);
    const inner = new T.Mesh(new T.CircleGeometry(2.0, 40), new T.MeshBasicMaterial({ color: Tm.inner, transparent: true, opacity: 0.75, side: T.DoubleSide, blending: T.AdditiveBlending, depthWrite: false, fog: false })); g.add(inner);
    const swirl = []; for (let k = 0; k < 4; k++) { const s = new T.Mesh(new T.TorusGeometry(0.5 + k * 0.38, 0.05, 6, 30), new T.MeshBasicMaterial({ color: k % 2 ? Tm.ring : 0xffffff, transparent: true, opacity: 0.7, fog: false })); g.add(s); swirl.push(s); }
    const deco = new T.Group(); g.add(deco);
    for (let k = 0; k < 14; k++) {
      const a = k / 14 * 6.283, x = Math.cos(a) * 2.45, y = Math.sin(a) * 2.45; let m;
      if (Tm.deco === 'spikes' || Tm.deco === 'crystals' || Tm.deco === 'flames') { m = new T.Mesh(G().cone, new T.MeshBasicMaterial({ color: new T.Color(Tm.dc), fog: false, transparent: Tm.deco === 'flames', opacity: 0.9 })); m.scale.set(0.16, Tm.deco === 'crystals' ? 0.8 : 0.6, 0.16); m.rotation.z = a - Math.PI / 2; }
      else if (Tm.deco === 'leaves') { m = new T.Mesh(G().box, new T.MeshBasicMaterial({ color: new T.Color(Tm.dc), fog: false })); m.scale.set(0.5, 0.12, 0.04); m.rotation.z = a; }
      else if (Tm.deco === 'rainbow') { m = new T.Mesh(G().sph, new T.MeshBasicMaterial({ color: new T.Color().setHSL(k / 14, 1, 0.55), fog: false })); m.scale.setScalar(0.22); }
      else { m = new T.Mesh(G().sph, new T.MeshBasicMaterial({ color: new T.Color(Tm.dc), fog: false, transparent: true, opacity: 0.8 })); m.scale.setScalar(Tm.deco === 'wisps' ? 0.3 : 0.12); }
      m.position.set(x, y, 0); deco.add(m);
    }
    g.traverse((o) => { if (o.isMesh) o.frustumCulled = false; });
    g.userData = { ring, inner, swirl, deco, th };
    L.scene.add(g); return g;
  }
  let entry = null, exits = [];
  // offene Portale (vom Anzug-Träger): alle Spieler sehen sie und können hindurchgehen
  const open = [], LIFE = 30;
  function openPortal(o) {
    if (open.some((q) => q.id === o.id)) return;
    const g = build(o.th); g.position.set(o.x, o.y, o.z); g.rotation.y = o.yaw; g.scale.setScalar(0.01);
    open.push({ g, id: o.id, x: o.x, y: o.y, z: o.z, tx: o.tx, tz: o.tz, th: o.th, t: 0, mine: !!o.mine });
    while (open.length > 4) { L.scene.remove(open[0].g); open.shift(); }
  }
  L.portalRemote = function (m) { if (THEMES[m.th]) { openPortal(m); if (Math.hypot(P.x - m.x, P.z - m.z) < 300) L.msg('🌀 Ein Portal nach ' + THEMES[m.th].name + ' hat sich geöffnet – du kannst hindurchgehen!', 3500); } };
  // Ziel festlegen und Portal vor dir öffnen
  L.suitPortalTo = function (x, z, label) {
    if (!(L.suitOn && L.suitOn()) || !P.alive) return;
    if (P.vehicle && L._leaveVehicle) L._leaveVehicle(true);
    const th = worldAt(x, z), yaw = P.camYaw, d = 4;
    const px = P.x + Math.sin(yaw) * d, pz = P.z + Math.cos(yaw) * d, py = (P.y || 0) + 1.9;
    const o = { t: 'portal', id: Math.floor(Math.random() * 1e9), x: px, y: py, z: pz, yaw, tx: x, tz: z, th };
    openPortal(Object.assign({ mine: true }, o));
    if (L.mp && L.mp.send && L.net && L.net.connected) L.mp.send(o);
    L.snd.teleport && L.snd.teleport({ x: px, y: py, z: pz });
    L.msg('🌀 Portal nach ' + (label || THEMES[th].name) + ' geöffnet – geh hindurch!', 4000);
  };
  function groundAt(x, z) { const f = L.seaFloor(x, z); return f > -0.5 ? Math.max(0, f) : L.WATER_Y; }
  function arrive(e) {
    const x = e.tx, z = e.tz, y = groundAt(x, z);
    // Lichtblitz
    let fl = document.getElementById('portalFlash');
    if (!fl) { fl = document.createElement('div'); fl.id = 'portalFlash'; fl.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:40;opacity:0;transition:opacity .45s'; document.body.appendChild(fl); }
    fl.style.background = '#' + new T.Color(THEMES[e.th].inner).getHexString(); fl.style.opacity = '0.9'; setTimeout(() => { fl.style.opacity = '0'; }, 120);
    const yaw = P.camYaw;
    P.x = x; P.z = z; P.y = y + 0.1; P.vx = P.vz = P.vy = 0; P.air = true; P.spawnProt = Math.max(P.spawnProt || 0, 2);
    if (L.underwaterDive) L.underwaterDive = false;
    // Ausgangsportal hinter dir, schließt sich
    const g = build(e.th); g.position.set(x - Math.sin(yaw) * 2.2, y + 1.9, z - Math.cos(yaw) * 2.2); g.rotation.y = yaw;
    exits.push({ g, t: 0, th: e.th });
    L.snd.teleport && L.snd.teleport({ x, y: y + 1, z }); L.shake = Math.max(L.shake, 0.4);
    L.msg('✨ Angekommen: ' + THEMES[e.th].name, 2500);
  }
  function anim(g, t, dt) {
    const u = g.userData; u.ring.rotation.z += dt * 1.5; u.deco.rotation.z -= dt * 0.6;
    u.swirl.forEach((s, k) => { s.rotation.z += dt * (k % 2 ? 3 : -2.4); s.scale.setScalar(1 + Math.sin(t * 4 + k) * 0.08); });
    u.inner.material.opacity = 0.55 + Math.sin(t * 6) * 0.2;
    if (Math.random() < dt * 30) { const a = Math.random() * 6.28, w = new T.Vector3(Math.cos(a) * 2.2, Math.sin(a) * 2.2, 0); g.localToWorld(w); L.fx(THEMES[u.th].fx, w.x, w.y, w.z, 2, 1.2, { basic: true, size: 0.12, life: 0.8 }); }
  }
  L.updateSuitPortals = function (dt) {
    for (let i = open.length - 1; i >= 0; i--) {
      const e = open[i]; e.t += dt;
      const grow = Math.min(1, e.t / 0.7), shrink = e.t > LIFE - 0.8 ? Math.max(0, (LIFE - e.t) / 0.8) : 1;
      e.g.scale.setScalar(grow * shrink * (1 + Math.sin(grow * Math.PI) * 0.15));
      e.g.visible = Math.hypot(P.x - e.x, P.z - e.z) < 2500;
      if (e.g.visible) anim(e.g, e.t, dt);
      e.cd = (e.cd || 0) - dt;
      const dh = Math.hypot(P.x - e.x, P.z - e.z);
      if (e.t > 0.5 && e.cd <= 0 && dh < 1.7 && Math.abs((P.y || 0) + 1 - e.y) < 3.5 && P.alive && !P.vehicle && !L.cine) { e.cd = 3; arrive(e); }
      if (e.t > LIFE) { L.scene.remove(e.g); open.splice(i, 1); }
    }
    for (let i = exits.length - 1; i >= 0; i--) {
      const x = exits[i]; x.t += dt; anim(x.g, x.t, dt);
      const s = x.t < 1.0 ? 1 : Math.max(0, 1 - (x.t - 1.0) / 0.7); x.g.scale.setScalar(s * (x.t > 1 ? 1 : 1 + Math.sin(x.t * 3) * 0.05));
      if (x.t > 1.0 && x.t < 1.1) L.snd.teleport && L.snd.teleport({ x: x.g.position.x, y: x.g.position.y, z: x.g.position.z });
      if (s <= 0) { L.scene.remove(x.g); exits.splice(i, 1); }
    }
  };
  L.clearSuitPortals = function () { for (const e of open) L.scene.remove(e.g); open.length = 0; if (entry) L.scene.remove(entry.g); entry = null; for (const x of exits) L.scene.remove(x.g); exits = []; };
  // Ziel-Knöpfe für andere Welten (nur mit Anzug, auf der Karte)
  L.suitWorldTargets = function () {
    const out = [['🏠 Heimat (Altheim)', 30, 30]];
    if (L.TITAN) out.push(['🪐 Titanenmond', L.TITAN.x - 936, L.TITAN.z]);
    for (const I of L.ISL || []) { if (I.moon) out.push(['🌕 Mond', L.moonCheckpoint().x, L.moonCheckpoint().z]); else if (I.dim) out.push(['🌌 Dimension', L.dimCheckpoint().x, L.dimCheckpoint().z]); else out.push([I.icon + ' ' + I.name, I.x + 25, I.z + 25]); }
    return out;
  };
})();
