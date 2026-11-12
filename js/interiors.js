'use strict';
// Begehbare Gebäude: Stockwerke mit Treppen bis aufs Dach, Zimmer mit Einrichtung (nach der Apokalypse),
// Schränke, Schubladen, Kühlschränke und Spinde zum Öffnen – mit Beute. Das Innere entsteht, wenn man in die Nähe kommt.
(function () {
  const L = window.L, T = THREE, P = L.player;
  const FH = 3.2, WT = 0.3, NEAR = 45, FAR = 95;
  const C1 = new T.Color(), D = new T.Object3D();
  const active = [];
  L.indoor = null;
  function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  L.roomGrid = (B) => (B.tower ? [1, 1] : [Math.max(1, Math.round(B.w / 11)), Math.max(1, Math.round(B.d / 11))]);
  L.doorPos = (B) => { const [cols, rows] = L.roomGrid(B); return B.doorSide === 'w' ? B.z - B.d / 2 + (Math.floor(rows / 2) + 0.5) * B.d / rows : B.x - B.w / 2 + (Math.floor(cols / 2) + 0.5) * B.w / cols; };
  const towerB = { x: 38, z: 38, w: 24, d: 24, h: 62, tower: true, id: 99999, poi: 'stadt' };

  // ---------- Höhe des Bodens im Gebäude (Stockwerke, Treppen, Dach) ----------
  function layout(B) {
    if (B.lay) return B.lay;
    const nf = B.tower ? Math.floor(B.h / 3.4) : Math.max(1, Math.floor((B.h - 0.4) / FH));
    const fh = B.tower ? B.h / nf : FH;
    const ix1 = B.x - B.w / 2 + WT, ix2 = B.x + B.w / 2 - WT, iz1 = B.z - B.d / 2 + WT, iz2 = B.z + B.d / 2 - WT;
    const sl = Math.min(7, (iz2 - iz1) * 0.45), stair = { x1: ix1 + 0.2, x2: ix1 + 1.9, z1: iz1 + 0.4, z2: iz1 + 0.4 + sl };
    const roofAccess = !B.pitched;
    B.lay = { nf, fh, ix1, ix2, iz1, iz2, stair, roofAccess, levels: [] };
    for (let k = 0; k < nf; k++) B.lay.levels.push(k * fh);
    return B.lay;
  }
  // Bodenhöhe an (x,z) für jemanden auf Höhe y – oder null, wenn man nicht im Gebäude ist
  L.floorAt = function (x, z, y) {
    for (const B of active) {
      if (B.tower && L.tower && !L.towerSafe()) continue;
      const Ly = B.lay, inner = x > Ly.ix1 && x < Ly.ix2 && z > Ly.iz1 && z < Ly.iz2;
      const outer = x > B.x - B.w / 2 - 0.3 && x < B.x + B.w / 2 + 0.3 && z > B.z - B.d / 2 - 0.3 && z < B.z + B.d / 2 + 0.3;
      if (!outer) continue;
      const S = Ly.stair, inStair = x > S.x1 && x < S.x2 && z > S.z1 && z < S.z2;
      let best = -1;
      if (inner) {
        best = 0;
        for (let k = 1; k < Ly.nf; k++) if (!inStair && Ly.levels[k] <= y + 0.7) best = Math.max(best, Ly.levels[k]);
        if (inStair) for (let k = 0; k < Ly.nf; k++) {
          const top = k + 1 < Ly.nf ? Ly.levels[k + 1] : (Ly.roofAccess ? B.h : null); if (top === null) continue;
          const f = L.clamp((z - S.z1) / (S.z2 - S.z1), 0, 1), hk = Ly.levels[k] + f * (top - Ly.levels[k]);
          if (hk <= y + 0.7) best = Math.max(best, hk);
        }
      }
      if (Ly.roofAccess && B.h <= y + 0.7 && !(inStair && inner)) best = Math.max(best, B.h);
      if (best >= 0) return best;
    }
    return null;
  };

  // ---------- Möbel-Baukasten ----------
  const ROOMS = {
    stadt: ['wohnen', 'schlafen', 'kueche', 'buero', 'lager', 'bad'],
    krankenhaus: ['kranken', 'kranken', 'buero', 'lager'],
    polizei: ['wache', 'buero', 'wache', 'lager'],
    supermarkt: ['laden', 'laden', 'lager'],
    land: ['wohnen', 'schlafen', 'kueche', 'bad'],
    dorf: ['wohnen', 'schlafen', 'kueche', 'bad'],
    militaer: ['wache', 'lager', 'lager'],
    schiff: ['schlafen', 'schlafen', 'schlafen', 'kueche', 'wohnen', 'bad', 'lager']
  };
  function furnish(I, R, room, x1, z1, x2, z2, y, poi) {
    const box = (cx, cz, w, h, d, col, ry, rx, yy) => { I.parts.push([cx, y + (yy || 0), cz, w, h, d, ry || 0, col, rx || 0]); };
    const cw = x2 - x1, cd = z2 - z1, mx = (x1 + x2) / 2, mz = (z1 + z2) / 2;
    const tilt = () => (R() < 0.3 ? (R() - 0.5) * 1.6 : 0);
    const cont = (cx, cz, ry, type) => {
      const dims = { schrank: [1.2, 2, 0.6, '#6a4a30'], kommode: [1.1, 0.9, 0.5, '#7a5a3a'], kuehl: [0.8, 1.8, 0.7, '#d8d8d4'], spind: [0.6, 1.9, 0.5, '#5a6a72'], kiste: [1, 0.7, 0.7, '#7a6a40'], medizin: [1, 1.6, 0.4, '#e8e8e8'] }[type];
      I.conts.push({ x: cx, y, z: cz, ry, type, w: dims[0], h: dims[1], d: dims[2], col: dims[3], key: I.B.id + ':' + I.conts.length });
    };
    const wallSpot = (side, f) => side === 0 ? [L.lerp(x1 + 0.8, x2 - 0.8, f), z1 + 0.45, 0] : side === 1 ? [L.lerp(x1 + 0.8, x2 - 0.8, f), z2 - 0.45, Math.PI] : side === 2 ? [x1 + 0.45, L.lerp(z1 + 0.8, z2 - 0.8, f), Math.PI / 2] : [x2 - 0.45, L.lerp(z1 + 0.8, z2 - 0.8, f), -Math.PI / 2];
    // Teppich / Boden
    if (R() < 0.6) box(mx, mz, cw * 0.5, 0.02, cd * 0.4, L.pick(['#6a2a2a', '#2a3a5a', '#4a4a30', '#5a3a5a']), 0, 0, 0.01);
    if (room === 'wohnen') {
      const s = wallSpot(Math.floor(R() * 4), 0.5); box(s[0], s[1], 2.2, 0.8, 0.9, '#5a4a6a', s[2], tilt()); box(mx, mz, 1.2, 0.45, 0.7, '#6a4a30', 0, tilt());
      const t2 = wallSpot(Math.floor(R() * 4), 0.3); box(t2[0], t2[1], 1.4, 0.9, 0.2, '#1a1a1a', t2[2], tilt(), 0.6);
      const c = wallSpot(Math.floor(R() * 4), 0.8); cont(c[0], c[1], c[2], 'kommode');
    } else if (room === 'schlafen') {
      const b = wallSpot(Math.floor(R() * 4), 0.4); box(b[0], b[1], 1.6, 0.5, 2.1, '#d8d0c0', b[2], tilt() * 0.3); box(b[0], b[1], 1.6, 0.15, 2.1, L.pick(['#8a2a2a', '#2a4a8a', '#3a6a3a']), b[2], 0, 0.5);
      const w = wallSpot(Math.floor(R() * 4), 0.85); cont(w[0], w[1], w[2], 'schrank');
      const n = wallSpot(Math.floor(R() * 4), 0.15); cont(n[0], n[1], n[2], 'kommode');
    } else if (room === 'kueche') {
      const s = Math.floor(R() * 4); for (let k = 0; k < 3; k++) { const p = wallSpot(s, 0.2 + k * 0.3); box(p[0], p[1], 1.0, 0.9, 0.6, '#b8b0a0', p[2]); }
      const f = wallSpot((s + 1) % 4, 0.5); cont(f[0], f[1], f[2], 'kuehl');
      const c = wallSpot((s + 2) % 4, 0.3); cont(c[0], c[1], c[2], 'schrank');
      box(mx, mz, 1.2, 0.75, 0.8, '#7a5a3a', R() * 3, tilt()); for (let k = 0; k < 3; k++) box(mx + (R() - 0.5) * 2, mz + (R() - 0.5) * 2, 0.45, 0.9, 0.45, '#6a4a30', R() * 3, tilt());
    } else if (room === 'buero') {
      for (let k = 0; k < 2; k++) { const p = wallSpot(Math.floor(R() * 4), 0.25 + k * 0.5); box(p[0], p[1], 1.5, 0.75, 0.8, '#5a5a5a', p[2], tilt() * 0.4); box(p[0], p[1], 0.5, 0.35, 0.05, '#101820', p[2], 0, 0.8); }
      const fc = wallSpot(Math.floor(R() * 4), 0.9); cont(fc[0], fc[1], fc[2], 'kommode');
      for (let k = 0; k < 8; k++) box(x1 + R() * cw, z1 + R() * cd, 0.3, 0.01, 0.22, '#f0ece0', R() * 3);
    } else if (room === 'lager') {
      for (let k = 0; k < 6; k++) box(x1 + 1 + R() * (cw - 2), z1 + 1 + R() * (cd - 2), 0.9, 0.7 + R() * 0.6, 0.9, L.pick(['#8a7040', '#6a5a30', '#7a6a50']), R() * 3, tilt() * 0.4);
      const s = wallSpot(Math.floor(R() * 4), 0.5); box(s[0], s[1], 2.4, 2, 0.5, '#4a4a4a', s[2]);
      const k1 = wallSpot(Math.floor(R() * 4), 0.2); cont(k1[0], k1[1], k1[2], 'kiste');
    } else if (room === 'bad') {
      const s = wallSpot(Math.floor(R() * 4), 0.3); box(s[0], s[1], 0.7, 0.5, 1.6, '#e8e8e8', s[2]);
      const m = wallSpot(Math.floor(R() * 4), 0.7); cont(m[0], m[1], m[2], 'medizin');
    } else if (room === 'kranken') {
      for (let k = 0; k < 3; k++) { const p = wallSpot(k % 2 ? 0 : 1, 0.2 + k * 0.3); box(p[0], p[1], 1, 0.7, 2, '#e8e8f0', p[2], tilt() * 0.3); }
      const m = wallSpot(2, 0.5); cont(m[0], m[1], m[2], 'medizin');
    } else if (room === 'wache') {
      for (let k = 0; k < 3; k++) { const p = wallSpot(0, 0.2 + k * 0.3); cont(p[0], p[1], p[2], 'spind'); }
      box(mx, mz, 1.6, 0.75, 0.8, '#3a3a40', 0, tilt() * 0.4);
    } else {
      for (let k = 0; k < 2; k++) { const p = wallSpot(k, 0.5); box(p[0], p[1], cw * 0.7, 1.8, 0.5, '#7a7a70', p[2]); }
      const k1 = wallSpot(2, 0.5); cont(k1[0], k1[1], k1[2], 'kiste');
    }
    // mehr Kleinkram, damit nichts leer wirkt
    for (let k = 0; k < 4 + Math.floor(R() * 4); k++) {
      const px = x1 + 0.6 + R() * (cw - 1.2), pz = z1 + 0.6 + R() * (cd - 1.2), q = R();
      if (q < 0.2) { box(px, pz, 0.45, 0.9, 0.45, '#6a4a30', R() * 3, tilt()); }
      else if (q < 0.35) { box(px, pz, 0.35, 0.35, 0.35, '#7a5a3a', 0); box(px, pz, 0.5, 0.6, 0.5, '#3a7a3a', 0, 0, 0.35); }
      else if (q < 0.5) { box(px, pz, 0.6, 0.5, 0.45, L.pick(['#8a7040', '#6a5a30']), R() * 3, tilt() * 0.3); }
      else if (q < 0.62) { box(px, pz, 0.08, 1.6, 0.08, '#2a2a2a', 0); box(px, pz, 0.45, 0.35, 0.45, '#e8d8a0', 0, 0, 1.6); }
      else if (q < 0.75) { const s = wallSpot(Math.floor(R() * 4), R()); box(s[0], s[1], 1.8, 2, 0.4, '#5a4030', s[2]); for (let b = 0; b < 3; b++) box(s[0], s[1], 1.6, 0.3, 0.3, L.pick(['#a03030', '#3050a0', '#30a050', '#d0a030']), s[2], 0, 0.3 + b * 0.6); }
      else if (q < 0.87) { box(px, pz, 0.7, 0.02, 0.5, '#f0ece0', R() * 3, 0, 0.01); }
      else { box(px, pz, 0.5, 0.25, 0.9, '#3a2a20', R() * 3, 1.57, 0.25); }
    }
    // Spuren der Apokalypse: Schutt, Blut, Bretter vor den Fenstern
    for (let k = 0; k < 3; k++) if (R() < 0.6) box(x1 + R() * cw, z1 + R() * cd, 0.3 + R() * 0.6, 0.15 + R() * 0.3, 0.3 + R() * 0.6, '#6a6660', R() * 3, R());
    if (R() < 0.45) box(x1 + R() * cw, z1 + R() * cd, 0.8 + R(), 0.01, 0.6 + R(), '#4a0a0a', R() * 3, 0, 0.012);
    if (R() < 0.5) { const s = wallSpot(Math.floor(R() * 4), R()); for (let k = 0; k < 3; k++) box(s[0], s[1], 1.6, 0.18, 0.06, '#6a4a2a', s[2], 0, 1.0 + k * 0.4); }
    // Beute auf dem Boden
    if (R() < 0.55) I.loose.push({ x: x1 + 0.8 + R() * (cw - 1.6), z: z1 + 0.8 + R() * (cd - 1.6), y, key: I.B.id + ':f' + I.loose.length });
  }

  // ---------- Inneres eines Gebäudes erzeugen ----------
  const matWall = new T.MeshLambertMaterial({ color: 0xb8b0a0 }), matFloor = new T.MeshLambertMaterial({ color: 0x8a7a68 }), matStair = new T.MeshLambertMaterial({ color: 0x6a6460 });
  function build(B) {
    const Ly = layout(B), R = rng(B.id * 7919 + 13), g = new T.Group(); L.scene.add(g);
    const I = { B, g, boxes: [], parts: [], conts: [], loose: [], items: [] };
    B.state = B.state || { opened: {}, taken: {} };
    const wallMesh = (x1, z1, x2, z2, y0, y1, mat) => { const m = new T.Mesh(L.GEO.boxB, mat || matWall); m.scale.set(x2 - x1, y1 - y0, z2 - z1); m.position.set((x1 + x2) / 2, y0, (z1 + z2) / 2); g.add(m); return m; };
    const wallBox = (x1, z1, x2, z2, y0, y1) => { wallMesh(x1, z1, x2, z2, y0, y1); I.boxes.push(L.addBoxY(x1, z1, x2, z2, y0, y1, 'building')); };
    const X1 = B.x - B.w / 2, X2 = B.x + B.w / 2, Z1 = B.z - B.d / 2, Z2 = B.z + B.d / 2;
    if (!B.tower) {
      B.box.on = false;
      // Außenwände mit Tür im Süden
      wallBox(X1, Z1, X2, Z1 + WT, 0, B.h); wallBox(X2 - WT, Z1, X2, Z2, 0, B.h);
      if (B.doorSide === 'w') {
        const dz = L.doorPos(B);
        wallBox(X1, Z2 - WT, X2, Z2, 0, B.h);
        wallBox(X1, Z1, X1 + WT, dz - 1.1, 0, B.h); wallBox(X1, dz + 1.1, X1 + WT, Z2, 0, B.h); wallBox(X1, dz - 1.1, X1 + WT, dz + 1.1, 2.6, B.h);
      } else {
        const dx = L.doorPos(B);
        wallBox(X1, Z1, X1 + WT, Z2, 0, B.h);
        wallBox(X1, Z2 - WT, dx - 1.1, Z2, 0, B.h); wallBox(dx + 1.1, Z2 - WT, X2, Z2, 0, B.h); wallBox(dx - 1.1, Z2 - WT, dx + 1.1, Z2, 2.6, B.h);
      }
    }
    const S = Ly.stair;
    for (let k = 0; k < Ly.nf; k++) {
      const y = Ly.levels[k];
      // Boden (mit Loch über der Treppe)
      if (k > 0) { wallMesh(S.x2, Ly.iz1, Ly.ix2, Ly.iz2, y - 0.15, y, matFloor); wallMesh(Ly.ix1, S.z2, S.x2, Ly.iz2, y - 0.15, y, matFloor); }
      else wallMesh(Ly.ix1, Ly.iz1, Ly.ix2, Ly.iz2, 0, 0.02, matFloor);
      // Treppe nach oben
      const top = k + 1 < Ly.nf ? Ly.levels[k + 1] : (Ly.roofAccess ? B.h : null);
      if (top !== null) {
        const n = Math.ceil((top - y) / 0.25);
        for (let s = 0; s < n; s++) { const st = new T.Mesh(L.GEO.boxB, matStair); const zz = S.z1 + (s + 0.5) * (S.z2 - S.z1) / n; st.scale.set(S.x2 - S.x1, (s + 1) * (top - y) / n, (S.z2 - S.z1) / n); st.position.set((S.x1 + S.x2) / 2, y, zz); g.add(st); }
        const rail = new T.Mesh(L.GEO.boxB, L.mat('#3a3a3a')); rail.scale.set(0.08, 1, S.z2 - S.z1); rail.position.set(S.x2 + 0.04, y + (top - y) / 2, (S.z1 + S.z2) / 2); g.add(rail);
      }
      // Zimmer: Wände mit Durchgängen
      const [cols, rows] = L.roomGrid(B), ch = k + 1 < Ly.nf ? Ly.fh - 0.15 : (B.h - y);
      const cw = (Ly.ix2 - Ly.ix1) / cols, rd = (Ly.iz2 - Ly.iz1) / rows;
      for (let c = 1; c < cols; c++) { const wx = Ly.ix1 + c * cw; for (let r = 0; r < rows; r++) { const za = Ly.iz1 + r * rd, zb = za + rd, zm = (za + zb) / 2; wallBox(wx - 0.1, za, wx + 0.1, zm - 0.75, y, y + ch); wallBox(wx - 0.1, zm + 0.75, wx + 0.1, zb, y, y + ch); } }
      for (let r = 1; r < rows; r++) { const wz = Ly.iz1 + r * rd; for (let c = 0; c < cols; c++) { let xa = Ly.ix1 + c * cw, xb = xa + cw; if (c === 0) xa = Math.max(xa, S.x2 + 0.3); const xm = (xa + xb) / 2; wallBox(xa, wz - 0.1, xm - 0.75, wz + 0.1, y, y + ch); wallBox(xm + 0.75, wz - 0.1, xb, wz + 0.1, y, y + ch); } }
      // Einrichtung je Zimmer
      const kinds = ROOMS[B.poi] || ROOMS.stadt;
      for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
        let x1 = Ly.ix1 + c * cw + (c ? 0.15 : 0), x2 = Ly.ix1 + (c + 1) * cw - (c < cols - 1 ? 0.15 : 0), z1 = Ly.iz1 + r * rd + (r ? 0.15 : 0), z2 = Ly.iz1 + (r + 1) * rd - (r < rows - 1 ? 0.15 : 0);
        if (c === 0 && r === 0) x1 = S.x2 + 0.3; // Platz für die Treppe
        if (B.tower && R() < 0.5) continue;
        furnish(I, R, kinds[Math.floor(R() * kinds.length)], x1, z1, x2, z2, y, B.poi);
      }
    }
    // Möbel als eine Instanz-Gruppe
    const parts = I.parts.concat(I.conts.map((c) => [c.x, c.y, c.z, c.w, c.h, c.d, c.ry, c.col, 0]));
    if (parts.length) {
      const m = new T.InstancedMesh(L.GEO.boxB, new T.MeshLambertMaterial({ color: 0xffffff }), parts.length);
      parts.forEach((p, i) => { D.position.set(p[0], p[1], p[2]); D.rotation.set(0, p[6], p[8]); D.scale.set(p[3], p[4], p[5]); D.updateMatrix(); m.setMatrixAt(i, D.matrix); m.setColorAt(i, C1.set(p[7])); });
      m.castShadow = false; m.receiveShadow = true; g.add(m);
    }
    // Türen der Behälter (geschlossen dunkle Front, offen weggeklappt)
    for (const c of I.conts) {
      const door = new T.Mesh(L.GEO.boxB, L.mat(c.type === 'kuehl' ? '#c8c8c4' : c.type === 'spind' ? '#4a5a62' : '#5a3a20'));
      door.scale.set(c.w * 0.96, c.h * (c.type === 'kommode' ? 0.4 : 0.92), 0.05);
      const fx = Math.sin(c.ry), fz = Math.cos(c.ry);
      door.position.set(c.x + fx * (c.d / 2 + 0.03), c.y + (c.type === 'kommode' ? c.h * 0.5 : c.h * 0.04), c.z + fz * (c.d / 2 + 0.03)); door.rotation.y = c.ry; g.add(door); c.door = door;
      if (B.state.opened[c.key]) openLook(c);
    }
    // Beute auf dem Boden
    for (const f of I.loose) if (!B.state.taken[f.key]) { const it = L.spawnItem(L.rollLoot(B.poi), f.x, f.z, undefined, undefined, undefined, undefined, f.y, true); it.bkey = f.key; it.bstate = B.state; I.items.push(it); }
    B.int = I; active.push(B);
  }
  function openLook(c) {
    const fx = Math.sin(c.ry), fz = Math.cos(c.ry);
    if (c.type === 'kommode') { c.door.position.x += fx * 0.4; c.door.position.z += fz * 0.4; }
    else { c.door.rotation.y = c.ry + 1.7; c.door.position.x += Math.cos(c.ry) * c.w * 0.45 + fx * c.w * 0.35; c.door.position.z += -Math.sin(c.ry) * c.w * 0.45 + fz * c.w * 0.35; }
  }
  function destroy(B) {
    const I = B.int; if (!I) return;
    L.scene.remove(I.g);
    for (const b of I.boxes) L.removeBox(b);
    for (const it of I.items) if (it.mesh.parent) L.removeLocalItem(it);
    if (!B.tower) B.box.on = true;
    B.int = null; const i = active.indexOf(B); if (i >= 0) active.splice(i, 1);
  }

  // ---------- Behälter öffnen ----------
  L.nearestContainer = function () {
    let best = null, bd = 1.9;
    for (const B of active) for (const c of B.int.conts) {
      if (B.state.opened[c.key] || Math.abs((P.y || 0) - c.y) > 1.4) continue;
      const d = Math.hypot(P.x - c.x, P.z - c.z); if (d < bd) { bd = d; best = c; best.B = B; }
    }
    return best;
  };
  const CNAME = { schrank: 'Schrank', kommode: 'Schublade', kuehl: 'Kühlschrank', spind: 'Spind', kiste: 'Kiste', medizin: 'Medizinschrank' };
  L.containerName = (c) => CNAME[c.type];
  L.openContainer = function (c) {
    const B = c.B; B.state.opened[c.key] = true; openLook(c);
    L.nz({ dur: 0.5, f: 500 + Math.random() * 300, type: 'bandpass', q: 3, vol: 0.25 });
    L.makeNoise(P.x, P.z, 6, P);
    const R = Math.random(), n = R < 0.3 ? 0 : R < 0.8 ? 1 : 2;
    const poi = c.type === 'medizin' ? 'krankenhaus' : c.type === 'spind' ? 'polizei' : c.type === 'kuehl' ? 'supermarkt' : B.poi;
    const fx = Math.sin(c.ry), fz = Math.cos(c.ry);
    for (let k = 0; k < n; k++) { const it = L.spawnItem(L.rollLoot(poi), c.x + fx * (c.d / 2 + 0.6) + (k - 0.5) * 0.6, c.z + fz * (c.d / 2 + 0.6), undefined, undefined, undefined, undefined, c.y, true); B.int.items.push(it); }
    L.msg(n ? `🗄️ ${CNAME[c.type]} geöffnet – da ist etwas drin!` : `🗄️ ${CNAME[c.type]} ist leer.`, 1800);
  };

  // ---------- pro Bild: Inneres in der Nähe erzeugen, weit weg wieder abbauen ----------
  let scanT = 0;
  L.updateInteriors = function (dt) {
    scanT -= dt;
    if (scanT <= 0) {
      scanT = 0.5;
      const list = (L.buildings || []).concat([towerB]);
      const near = [];
      for (const B of list) { const d = Math.max(Math.abs(P.x - B.x) - B.w / 2, Math.abs(P.z - B.z) - B.d / 2); if (d < NEAR && !B.int) near.push([d, B]); }
      near.sort((a, b) => a[0] - b[0]);
      for (const [, B] of near.slice(0, 2)) if (active.length < 6) build(B);
      for (let i = active.length - 1; i >= 0; i--) { const B = active[i], d = Math.max(Math.abs(P.x - B.x) - B.w / 2, Math.abs(P.z - B.z) - B.d / 2); if (d > FAR) destroy(B); }
    }
    // drinnen? (für Kamera und Anzeige)
    L.indoor = null;
    for (const B of active) { const Ly = B.lay; if (P.x > Ly.ix1 && P.x < Ly.ix2 && P.z > Ly.iz1 && P.z < Ly.iz2 && (P.y || 0) < B.h - 0.5) { let k = 0; for (let j = 0; j < Ly.nf; j++) if (Ly.levels[j] <= (P.y || 0) + 0.5) k = j; L.indoor = { B, floor: k, ceil: k + 1 < Ly.nf ? Ly.levels[k + 1] : B.h }; } }
  };
  L.clearInteriors = function () { for (let i = active.length - 1; i >= 0; i--) destroy(active[i]); for (const B of L.buildings || []) B.state = null; towerB.state = null; };
})();
