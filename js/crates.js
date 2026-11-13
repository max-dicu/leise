'use strict';
// Kisten überall (Heimat, Inseln, Meeresgrund): Waffen, Munition, Münzen, Heilzeug – jede anders.
// Unter Wasser kommt man nur mit dem Taucheranzug dran. Der liegt jede Runde oben auf dem Turm (einer pro Spieler, höchstens 4).
(function () {
  const L = window.L, T = THREE, P = L.player, E = L.ents;
  const crates = [];
  let built = false;
  function landOk(x, z) { return !L.queryBoxes(x, z, 1.6).length && L.waterDepth(x, z) < -0.2 && L.mountainH(x, z) < 0.2; }
  function crateMesh(under) {
    const g = new T.Group(), wood = under ? '#2a5a7a' : '#8a6a3a', band = under ? '#c8d8e0' : '#3a3a3a';
    const b = new T.Mesh(L.GEO.boxB, L.mat(wood)); b.scale.set(1.2, 0.8, 0.8); g.add(b);
    for (const x of [-0.45, 0.45]) { const s = new T.Mesh(L.GEO.boxB, L.mat(band)); s.scale.set(0.08, 0.82, 0.82); s.position.x = x; g.add(s); }
    const lid = new T.Mesh(L.GEO.boxB, L.mat(under ? '#3a6a8a' : '#9a7a4a')); lid.scale.set(1.24, 0.12, 0.84); lid.position.y = 0.8; g.add(lid);
    const lock = new T.Mesh(L.GEO.box, L.mat('#ffd040', { basic: true })); lock.scale.set(0.16, 0.18, 0.06); lock.position.set(0, 0.62, 0.42); g.add(lock);
    const glow = L.makeGlow ? L.makeGlow() : null; if (glow) { glow.position.y = 0.4; g.add(glow); }
    g.userData.lid = lid;
    return g;
  }
  function addCrate(x, z, y, under, isl) {
    const m = crateMesh(under); m.position.set(x, y, z); m.rotation.y = Math.random() * 6.28; L.scene.add(m);
    crates.push({ x, z, y, under, isl, m, open: false });
  }
  function build() {
    built = true;
    // Heimat: 70 Kisten an Land
    for (let i = 0, n = 0; i < 2000 && n < 70; i++) { const x = L.rand(-1400, 1400), z = L.rand(-1400, 1400); if (!landOk(x, z) || L.inTower(x, z, 4)) continue; addCrate(x, z, 0, false); n++; }
    // Inseln: je 14
    for (const I of L.ISL || []) { if (I.dim) continue; for (let i = 0, n = 0; i < 400 && n < 14; i++) { const a = Math.random() * 6.28, d = Math.sqrt(Math.random()) * (I.r - 60), x = I.x + Math.sin(a) * d, z = I.z + Math.cos(a) * d; if (!landOk(x, z)) continue; addCrate(x, z, 0, false, I); n++; } }
    // Meeresgrund: 45 Schatzkisten (nur mit Taucheranzug)
    for (let i = 0, n = 0; i < 3000 && n < 45; i++) {
      const a = Math.random() * 6.28, d = 1560 + Math.random() * 900, x = Math.sin(a) * d * (Math.abs(Math.sin(a)) > 0.5 ? 1 : 1), z = Math.cos(a) * d;
      const sf = L.seaFloor(x, z); if (sf > -4 || sf < -120) continue;
      addCrate(x, z, sf, true); n++;
    }
  }
  // Inhalt: jede Kiste anders
  function loot(c) {
    const R = Math.random(), out = [];
    const coins = Math.round((c.under ? 30 : 8) + Math.random() * (c.under ? 90 : 45));
    const guns = c.under ? ['gewehr', 'schrotflinte', 'pistole'] : ['minipistole', 'pistole', 'schrotflinte', 'gewehr'];
    if (R < (c.under ? 0.55 : 0.35)) { const w = L.pick(guns); out.push([w, 1, Math.floor(L.ITEMS[w].mag * 0.6)]); }
    const ammo = ['9mm', 'schrot', 'gewehrmuni']; for (let k = 0, n = 1 + Math.floor(Math.random() * 3); k < n; k++) out.push([L.pick(ammo), 1]);
    if (Math.random() < 0.4) out.push(['granate', 1 + Math.floor(Math.random() * 2)]);
    if (Math.random() < 0.45) out.push([L.pick(['bandage', 'verband', 'medkit', 'spritze']), 1]);
    if (c.under && Math.random() < 0.6) out.push(['gold', 1 + Math.floor(Math.random() * 2)]);
    return { coins, out };
  }
  function nearest() {
    let best = null, bd = 2.4;
    for (const c of crates) { if (c.open) continue; const d = Math.hypot(P.x - c.x, P.z - c.z); if (d < bd && Math.abs((P.y || 0) - c.y) < 2.6) { bd = d; best = c; } }
    return best;
  }
  L.crateHint = () => { if (P.vehicle) return null; const c = nearest(); return c ? 'E: ' + (c.under ? '💎 Schatzkiste' : '📦 Kiste') + ' öffnen' : null; };
  L.crateInteract = function () {
    if (P.vehicle) return false; const c = nearest(); if (!c) return false;
    c.open = true; c.m.userData.lid.rotation.x = -1.9; c.m.userData.lid.position.z = -0.35; c.m.userData.lid.position.y = 1.0;
    const L0 = loot(c); if (L.round) L.round.coins = (L.round.coins || 0) + L0.coins;
    const got = ['🪙 +' + L0.coins];
    for (const [ty, n, mag] of L0.out) { const left = L.giveItem(ty, n, mag); if (left > 0) L.spawnItem(ty, P.x + L.rand(-1, 1), P.z + L.rand(-1, 1), left, mag, undefined, undefined, P.y, true); got.push(L.ITEMS[ty].icon + (n > 1 ? '×' + n : '')); }
    L.msg((c.under ? '💎 Schatzkiste: ' : '📦 Kiste: ') + got.join(' '), 4000);
    L.snd.pickup && L.snd.pickup(); L.fx('#ffd040', c.x, c.y + 1, c.z, 20, 4, { basic: true, size: 0.15, life: 0.8 });
    return true;
  };

  // ---------- Taucheranzug ----------
  L.hasDiveSuit = () => [P.hot, P.bag].some((a) => a && a.some((it) => it && it.type === 'taucheranzug'));
  // beim Rundenstart (nur der Host): Anzüge oben auf den Turm legen – einer pro Spieler
  L.spawnDiveSuits = function () {
    const n = Math.min(4, 1 + (L.remotes ? [...L.remotes.values()].filter((r) => r.inRound || r.got !== undefined).length : 0));
    const T0 = L.TOWER;
    for (let k = 0; k < n; k++) L.spawnItem('taucheranzug', T0.x - 3 + k * 2, T0.z + 2, 1, undefined, undefined, undefined, T0.h);
  };
  // jede Runde neu: alte Anzüge aus dem Inventar und dem Versteck entfernen
  L.stripDiveSuits = function () {
    for (const a of [P.hot, P.bag]) if (a) for (let i = 0; i < a.length; i++) if (a[i] && a[i].type === 'taucheranzug') a[i] = null;
    if (L.save.stash) L.save.stash = L.save.stash.filter((it) => it.type !== 'taucheranzug');
  };

  // ---------- jedes Bild ----------
  let hadSuit = false;
  L.updateCrates = function (dt) {
    if (L.state !== 'game') return;
    if (!built) build();
    const t = performance.now() / 1000;
    for (const c of crates) {
      const vis = Math.abs(c.x - P.x) < 160 && Math.abs(c.z - P.z) < 160; c.m.visible = vis;
      if (vis && c.under && !c.open && Math.random() < dt * 2) L.fx('#e8f8ff', c.x, c.y + 1, c.z, 1, 0.3, { size: 0.12, life: 1.5, g: -0.5 });
    }
    const s = L.hasDiveSuit();
    if (s && !hadSuit) L.msg('🤿 Taucheranzug an! Im Wasser: C = abtauchen, Leertaste = auftauchen. Kein Ertrinken. Schatzkisten am Meeresgrund!', 7000);
    hadSuit = s;
  };
  L.clearCrates = function () { for (const c of crates) L.scene.remove(c.m); crates.length = 0; built = false; hadSuit = false; };
})();
