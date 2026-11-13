'use strict';
// Inseln im Meer rund um die Heimat – jede eine eigene kleine Welt mit Landschaft, Gebäuden, Wetter, Monstern, Menschen und Checkpoint.
// Dazu Gefahren auf dem Meer: Riesenhaie springen, Meeresriesen waten hinterher, Wasserhosen.
(function () {
  const L = window.L, T = THREE, P = L.player;
  const isClient = () => L.net && L.net.role === 'client';
  // ---------- die Inseln ----------
  const ISL = [
    { id: 'eis', name: 'Eisland', icon: '❄️', x: 0, z: -6500, r: 700, ground: ['#e9eff5', '#d6e1ec'], beach: '#c4d2de', tint: '#cfe2ff', sky: '#b8cce0', weather: 'schnee',
      tree: 'tanne', treeCol: ['#2a4a3a', '#f4f8fc'], bld: 'iglu', bldCol: ['#f2f6fa', '#dde8f2'], mon: ['viktor', 'langer', 'walross', 'schwelle', 'greifer', 'rollerviktor'], monTint: '#cfe4ff',
      npc: { top: ['regenjacke', 'jacke', 'pullover'], topColor: ['#c02a2a', '#2a6ac0', '#f2f2f2', '#1e2f5a'], hat: ['muetze', 'beanie'] }, veh: ['jeep', 'pickup', 'cross'], vehCol: '#f2f2f2', music: ['night', 'drift', 'nightB'] },
    { id: 'wueste', name: 'Wüsteninsel', icon: '🏜️', x: 6500, z: 0, r: 700, ground: ['#e3c487', '#d4ae6c'], beach: '#e8d09a', tint: '#f0d090', sky: '#e8d4a8', weather: 'sand',
      tree: 'kaktus', treeCol: ['#3a7a3a', '#4a8a40'], bld: 'pyramide', bldCol: ['#d8b878', '#c8a060'], mon: ['daniel', 'rufer', 'blockling', 'marsianer', 'capydaniel', 'greifer'], monTint: '#e8c890',
      npc: { top: ['tshirt', 'tanktop', 'hemd'], topColor: ['#f2f2f2', '#e8c020', '#d8b46a', '#a83a1c'], hat: ['sonnenhut', 'cowboy', 'bandana'] }, veh: ['pickup', 'jeep', 'cross'], vehCol: '#d8b46a', music: ['lonely', 'wander'] },
    { id: 'dschungel', name: 'Dschungelinsel', icon: '🌴', x: 0, z: 6500, r: 700, ground: ['#3e7a32', '#2e6428'], beach: '#d8c890', tint: '#7ab870', sky: '#9cc8a0', weather: 'regen',
      tree: 'dschungel', treeCol: ['#1e5a22', '#2e7a2a'], bld: 'huette', bldCol: ['#8a6a40', '#6a5030'], mon: ['schwelle', 'blockling', 'starrende', 'capydaniel', 'marsianer', 'rufer'], monTint: '#6ab060',
      npc: { top: ['tanktop', 'weste', 'trikot'], topColor: ['#3a8a3a', '#2a6a6a', '#8a5a2b'], hat: ['bandana', 'keine'] }, veh: ['jeep', 'cross', 'motorrad'], vehCol: '#4a5a3a', music: ['wander', 'calm'] },
    { id: 'vulkan', name: 'Vulkaninsel', icon: '🌋', x: -6500, z: 0, r: 700, ground: ['#3a3230', '#2a2422'], beach: '#4a4442', tint: '#a04a30', sky: '#806050', weather: 'asche',
      tree: 'tot', treeCol: ['#1a1412', '#2a2220'], bld: 'stein', bldCol: ['#4a3e3a', '#2e2624'], mon: ['daniel', 'greifer', 'rufer', 'langer', 'walross', 'flieger'], monTint: '#ff6a30',
      npc: { top: ['lederjacke', 'kittel', 'anzug'], topColor: ['#1a1a1a', '#e07020', '#7a7a7a'], hat: ['helm', 'keine'] }, veh: ['jeep', 'pickup', 'motorrad'], vehCol: '#2a2a2a', music: ['tension', 'nightB'], volcano: true },
    { id: 'asgard', name: 'Götterinsel Asgard', icon: '⚡', x: 4800, z: -4800, r: 700, ground: ['#7ab060', '#9ac070'], beach: '#e8dca0', tint: '#ffe8a0', sky: '#c8d8f0', weather: 'klar',
      tree: 'gold', treeCol: ['#6a4a20', '#e8c040'], bld: 'halle', bldCol: ['#e8c040', '#c89a30'], mon: ['viktor', 'daniel', 'rollerviktor', 'capydaniel', 'rufer', 'starrende'], monTint: '#ffd870',
      npc: { top: ['weste', 'anzug', 'kittel'], topColor: ['#e8c020', '#c02a2a', '#2a6ac0', '#f2f2f2'], hat: ['krone', 'helm', 'stirnband'] }, veh: ['sportwagen', 'limousine', 'motorrad'], vehCol: '#e8c040', music: ['calm', 'wander'], bridge: true, lightning: true },
    { id: 'pilz', name: 'Pilzinsel', icon: '🍄', x: 4800, z: 4800, r: 700, ground: ['#6a4a7a', '#5a3a6a'], beach: '#b8a0c0', tint: '#c080e0', sky: '#b090d0', weather: 'nebel',
      tree: 'pilz', treeCol: ['#f0e8d8', '#d04a4a'], bld: 'pilzhaus', bldCol: ['#d04a9a', '#e07020'], mon: ['blockling', 'marsianer', 'schwelle', 'starrende', 'flieger', 'langer'], monTint: '#d080ff',
      npc: { top: ['hoodie', 'pullover', 'tshirt'], topColor: ['#d04a9a', '#6a3a8a', '#e8c020'], hat: ['beanie', 'cap', 'keine'] }, veh: ['kleinwagen', 'roller', 'joyort10'], vehCol: '#d04a9a', music: ['drift', 'lonely'] },
    { id: 'kristall', name: 'Kristallinsel', icon: '💎', x: -4800, z: 4800, r: 700, ground: ['#8a9ab0', '#7a8aa0'], beach: '#c0c8d8', tint: '#80c8ff', sky: '#a0c8e8', weather: 'klar',
      tree: 'kristall', treeCol: ['#60c8ff', '#a080ff'], bld: 'kristallturm', bldCol: ['#80d8ff', '#c0a0ff'], mon: ['greifer', 'flieger', 'langer', 'starrende', 'rufer', 'marsianer'], monTint: '#80d0ff',
      npc: { top: ['anzug', 'hemd', 'regenjacke'], topColor: ['#2a6ac0', '#f2f2f2', '#6a3a8a'], hat: ['keine', 'zylinder'] }, veh: ['sportwagen', 'joyort6e', 'kleinwagen'], vehCol: '#80d8ff', music: ['drift', 'calm'] },
    { id: 'geist', name: 'Geisterinsel', icon: '👻', x: -4800, z: -4800, r: 700, ground: ['#4a4a44', '#3a3a36'], beach: '#6a6a60', tint: '#9aa0a8', sky: '#707880', weather: 'nebel',
      tree: 'tot', treeCol: ['#2a2622', '#3a3430'], bld: 'gruft', bldCol: ['#6a6a66', '#4a4a46'], mon: ['starrende', 'langer', 'viktor', 'schwelle', 'rufer', 'daniel'], monTint: '#b0c0c8',
      npc: { top: ['anzug', 'kittel', 'lederjacke'], topColor: ['#1a1a1a', '#7a7a7a', '#f2f2f2'], hat: ['zylinder', 'keine'] }, veh: ['limousine', 'kleinwagen', 'roller'], vehCol: '#1a1a1a', music: ['night', 'nightB'] },
    { id: 'oma', name: 'Omas Garteninsel', icon: '🧶', x: 6500, z: 6500, r: 650, ground: ['#7ab85a', '#6aa84a'], beach: '#e8dca0', tint: '#ffe0f0', sky: '#f0d8e8', weather: 'klar',
      tree: 'obst', treeCol: ['#5a3a20', '#3a8a3a'], bld: 'haeuschen', bldCol: ['#f2e8d8', '#e8c8c8', '#d8e8f0'], mon: ['walross', 'rufer', 'blockling', 'schwelle', 'langer', 'starrende'], monTint: '#ffb0d0',
      npc: { top: ['pullover', 'weste', 'hemd'], topColor: ['#a04a6a', '#d8b46a', '#6a3a8a', '#f2f2f2'], hat: ['keine', 'sonnenhut'] }, veh: ['kleinwagen', 'roller', 'limousine'], vehCol: '#e8a0c0', music: ['calm', 'wander'] }
  ];
  L.ISL = ISL;
  for (const I of ISL) L.ISLANDS.push(I);
  L.curIsland = null;

  // ---------- Hilfen ----------
  const C1 = new T.Color(), C2 = new T.Color();
  function rnd(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const mat = (c, o) => L.mat(c, o);
  function inst(geo, color, n) { const m = new T.InstancedMesh(geo, mat('#ffffff'), n); m.castShadow = true; m.receiveShadow = true; m.count = 0; m.userData.col = color; return m; }
  const DUMMY = new T.Object3D();
  function addInst(m, x, y, z, sx, sy, sz, ry, color, rx) {
    DUMMY.position.set(x, y, z); DUMMY.scale.set(sx, sy, sz); DUMMY.rotation.set(rx || 0, ry || 0, 0); DUMMY.updateMatrix();
    m.setMatrixAt(m.count, DUMMY.matrix); m.setColorAt(m.count, C1.set(color)); m.count++;
  }
  // Monster einfärben (passend zur Insel)
  const tintCache = new Map();
  L.tintRig = function (root, tint, amt) {
    root.traverse((o) => {
      if (!o.isMesh || !o.material || !o.material.color || o.material.transparent) return;
      const key = o.material.uuid + tint + amt;
      let m = tintCache.get(key);
      if (!m) { m = o.material.clone(); m.color.lerp(C2.set(tint), amt); tintCache.set(key, m); }
      o.material = m;
    });
  };

  // ---------- Insel bauen ----------
  function buildIsland(I) {
    const R = rnd(I.x * 7 + I.z * 13 + 99), g = new T.Group(); L.scene.add(g); I.group = g;
    const r = I.r, ext = r + 160;
    // Boden: Land, Strand, Meeresboden
    const seg = 110, geo = new T.PlaneGeometry(ext * 2, ext * 2, seg, seg); geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position, cols = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) + I.x, z = pos.getZ(i) + I.z, d = Math.hypot(x - I.x, z - I.z);
      const h = d <= r ? 0.01 : Math.min(-0.07, L.seaFloor(x, z));
      pos.setY(i, h);
      if (d <= r - 25) C1.set(I.ground[(Math.sin(x * 0.05) + Math.cos(z * 0.043) > 0) ? 0 : 1]).multiplyScalar(0.92 + Math.random() * 0.12);
      else if (d <= r + 40) C1.set(I.beach);
      else C1.set(I.beach).lerp(C2.set('#2e3a40'), L.clamp((d - r - 40) / 120, 0, 1));
      cols[i * 3] = C1.r; cols[i * 3 + 1] = C1.g; cols[i * 3 + 2] = C1.b;
    }
    geo.setAttribute('color', new T.BufferAttribute(cols, 3)); geo.computeVertexNormals();
    const ground = new T.Mesh(geo, new T.MeshLambertMaterial({ vertexColors: true })); ground.position.set(I.x, 0, I.z); ground.receiveShadow = true; g.add(ground);
    const box = L.GEO.box, boxB = L.GEO.boxB, sph = L.GEO.sph, cone = L.GEO.cone, cyl = L.GEO.cylB;
    const mB = inst(boxB, '#fff', 800), mR = inst(new T.ConeGeometry(1, 1, 4).translate(0, 0.5, 0).rotateY(Math.PI / 4), '#fff', 200), mS = inst(sph, '#fff', 500), mC = inst(cone, '#fff', 900), mY = inst(cyl, '#fff', 1200);
    for (const m of [mB, mR, mS, mC, mY]) g.add(m);
    const spots = [];
    const free = (x, z, rad) => Math.hypot(x - I.x, z - I.z) < r - rad - 20 && Math.hypot(x - I.x, z - I.z) > 40 && spots.every((s) => Math.hypot(s[0] - x, s[1] - z) > s[2] + rad + 6);
    const place = (rad) => { for (let k = 0; k < 40; k++) { const a = R() * 6.28, d = Math.sqrt(R()) * (r - 40), x = I.x + Math.sin(a) * d, z = I.z + Math.cos(a) * d; if (free(x, z, rad)) { spots.push([x, z, rad]); return [x, z]; } } return null; };
    const bc = () => I.bldCol[Math.floor(R() * I.bldCol.length)];
    // Gebäude
    for (let i = 0; i < 26; i++) {
      const big = i < 3, rad = big ? 24 : 9, p = place(rad); if (!p) continue;
      const [x, z] = p, ry = R() * 6.28;
      if (I.bld === 'iglu') {
        const s = big ? 14 : 6; addInst(mS, x, 0, z, s, s * 0.7, s, 0, bc()); addInst(mB, x + Math.sin(ry) * s, 0, z + Math.cos(ry) * s, s * 0.5, s * 0.45, s * 0.6, ry, '#e2ecf4');
        L.addBox(x - s * 0.7, z - s * 0.7, x + s * 0.7, z + s * 0.7, s * 0.7, 'building');
      } else if (I.bld === 'pyramide') {
        if (big) { const s = 34 + R() * 20; addInst(mR, x, 0, z, s, s * 0.95, s, 0, '#d8b878'); L.addBox(x - s * 0.6, z - s * 0.6, x + s * 0.6, z + s * 0.6, s * 0.9, 'building'); }
        else { const w = 8 + R() * 6; addInst(mB, x, 0, z, w, 4 + R() * 3, w * 0.8, ry, bc()); addInst(mB, x, 6.5, z, w * 0.4, 0.4, w * 0.3, ry, '#a07a50'); L.addBox(x - w / 2, z - w / 2, x + w / 2, z + w / 2, 6, 'building'); }
      } else if (I.bld === 'huette') {
        const w = big ? 16 : 7; addInst(mY, x, 0, z, w * 0.55, 1.6, w * 0.55, 0, '#5a4028'); addInst(mY, x, 1.6, z, w * 0.5, 3, w * 0.5, 0, bc()); addInst(mC, x, 4.6 + w * 0.3, z, w * 0.75, w * 0.6, w * 0.75, 0, '#c8a860');
        L.addBox(x - w * 0.5, z - w * 0.5, x + w * 0.5, z + w * 0.5, 4.6, 'building');
      } else if (I.bld === 'stein') {
        const w = big ? 18 : 8, h = big ? 14 : 5 + R() * 4; addInst(mB, x, 0, z, w, h, w * 0.8, ry, bc()); addInst(mB, x, h, z, w * 1.05, 0.6, w * 0.85, ry, '#1a1412');
        L.addBox(x - w / 2, z - w / 2, x + w / 2, z + w / 2, h, 'building');
      } else if (I.bld === 'halle') {
        const w = big ? 18 : 9, l = big ? 46 : 16, h = big ? 12 : 6;
        addInst(mB, x, 0, z, w, h, l, ry, '#a07a40'); addInst(mR, x, h, z, w * 0.75, h * 0.7, l * 0.62, ry, bc());
        if (big) for (const s of [-1, 1]) { addInst(mY, x + Math.cos(ry) * s * w * 0.7, 0, z - Math.sin(ry) * s * w * 0.7, 2.5, h * 2.4, 2.5, 0, '#e8c040'); addInst(mS, x + Math.cos(ry) * s * w * 0.7, h * 2.4 + 2, z - Math.sin(ry) * s * w * 0.7, 3, 3, 3, 0, '#fff0a0'); }
        L.addBox(x - Math.max(w, l) / 2, z - Math.max(w, l) / 2, x + Math.max(w, l) / 2, z + Math.max(w, l) / 2, h, 'building');
      } else if (I.bld === 'pilzhaus') {
        const s = big ? 16 : 7; addInst(mY, x, 0, z, s * 0.35, s * 1.1, s * 0.35, 0, '#f0e8d8'); addInst(mS, x, s * 1.15, z, s, s * 0.45, s, 0, bc());
        for (let k = 0; k < 5; k++) addInst(mS, x + Math.sin(k * 1.3) * s * 0.6, s * 1.3, z + Math.cos(k * 1.3) * s * 0.6, s * 0.12, s * 0.06, s * 0.12, 0, '#ffffff');
        L.addBox(x - s * 0.35, z - s * 0.35, x + s * 0.35, z + s * 0.35, s * 1.2, 'building');
      } else if (I.bld === 'kristallturm') {
        const s = big ? 10 : 4; for (let k = 0; k < (big ? 5 : 3); k++) addInst(mC, x + (R() - 0.5) * s, (big ? 22 : 8) * 0.5 * (1 - k * 0.15), z + (R() - 0.5) * s, s * 0.7, (big ? 44 : 16) * (1 - k * 0.15), s * 0.7, R() * 3, bc(), (R() - 0.5) * 0.3);
        L.addBox(x - s, z - s, x + s, z + s, big ? 40 : 14, 'building');
      } else if (I.bld === 'haeuschen') {
        // Omas Häuschen: weiße Wände, rotes Dach, Schornstein, Blumenkästen
        const w = big ? 16 : 8, d2 = w * 0.8, h = big ? 7 : 4;
        addInst(mB, x, 0, z, w, h, d2, ry, bc()); addInst(mR, x, h, z, w * 0.82, h * 0.75, d2 * 0.82, ry, '#b04a3a');
        addInst(mB, x + Math.cos(ry) * w * 0.25, h, z - Math.sin(ry) * w * 0.25, 1, h * 0.8, 1, ry, '#8a5a4a');
        for (const s2 of [-1, 1]) addInst(mB, x + Math.sin(ry) * d2 * 0.51 + Math.cos(ry) * s2 * w * 0.25, h * 0.35, z + Math.cos(ry) * d2 * 0.51 - Math.sin(ry) * s2 * w * 0.25, w * 0.2, 0.4, 0.5, ry, s2 > 0 ? '#e04a8a' : '#e8c020');
        L.addBox(x - w / 2, z - w / 2, x + w / 2, z + w / 2, h, 'building');
      } else {
        // Gruft und Grabsteine
        if (big) { addInst(mB, x, 0, z, 12, 8, 16, ry, bc()); addInst(mR, x, 8, z, 9, 5, 12, ry, '#3a3a36'); L.addBox(x - 8, z - 8, x + 8, z + 8, 8, 'building'); }
        else for (let k = 0; k < 6; k++) { const gx = x + (k % 3) * 3 - 3, gz = z + Math.floor(k / 3) * 4 - 2; addInst(mB, gx, 0, gz, 1.2, 1.4 + R() * 0.6, 0.3, ry, bc()); }
      }
    }
    // Bäume und Pflanzen
    for (let i = 0; i < 220; i++) {
      const p = place(3); if (!p) continue;
      const [x, z] = p, s = 0.7 + R() * 0.8, c0 = I.treeCol[0], c1 = I.treeCol[1];
      if (I.tree === 'tanne') { addInst(mY, x, 0, z, 0.4 * s, 3 * s, 0.4 * s, 0, '#4a3020'); addInst(mC, x, 6 * s, z, 3 * s, 8 * s, 3 * s, 0, c0); addInst(mC, x, 8.5 * s, z, 2 * s, 3 * s, 2 * s, 0, c1); }
      else if (I.tree === 'kaktus') { addInst(mY, x, 0, z, 0.6 * s, 5 * s, 0.6 * s, 0, c0); addInst(mY, x + 0.9 * s, 2 * s, z, 0.4 * s, 2 * s, 0.4 * s, 0, c1); addInst(mY, x - 0.9 * s, 2.6 * s, z, 0.4 * s, 1.8 * s, 0.4 * s, 0, c1); }
      else if (I.tree === 'dschungel') { addInst(mY, x, 0, z, 0.7 * s, 14 * s, 0.7 * s, 0, '#4a3a20'); addInst(mS, x, 14 * s, z, 5 * s, 3 * s, 5 * s, 0, c0); addInst(mS, x + 2 * s, 12 * s, z, 3 * s, 2 * s, 3 * s, 0, c1); }
      else if (I.tree === 'gold') { addInst(mY, x, 0, z, 0.5 * s, 6 * s, 0.5 * s, 0, c0); addInst(mS, x, 7 * s, z, 3.5 * s, 3 * s, 3.5 * s, 0, c1); }
      else if (I.tree === 'pilz') { addInst(mY, x, 0, z, 0.6 * s, 4 * s, 0.6 * s, 0, c0); addInst(mS, x, 4.2 * s, z, 3 * s, 1.4 * s, 3 * s, 0, R() < 0.5 ? c1 : '#6a8aff'); }
      else if (I.tree === 'obst') { addInst(mY, x, 0, z, 0.4 * s, 3 * s, 0.4 * s, 0, '#6a4a2a'); addInst(mS, x, 4 * s, z, 2.6 * s, 2.2 * s, 2.6 * s, 0, c1); for (let k = 0; k < 4; k++) addInst(mS, x + Math.sin(k * 1.6) * 1.9 * s, 3.6 * s + (k % 2) * 0.8 * s, z + Math.cos(k * 1.6) * 1.9 * s, 0.32 * s, 0.32 * s, 0.32 * s, 0, k % 2 ? '#d02a2a' : '#e8c020'); }
      else if (I.tree === 'kristall') { addInst(mC, x, 2.5 * s, z, 1.2 * s, 5 * s, 1.2 * s, R() * 3, R() < 0.5 ? c0 : c1, (R() - 0.5) * 0.4); }
      else { addInst(mY, x, 0, z, 0.35 * s, 6 * s, 0.35 * s, 0, c0); for (let k = 0; k < 3; k++) addInst(mY, x, 3.5 * s + k, z, 0.12 * s, 2.5 * s, 0.12 * s, 0, c1); }
      L.addBox(x - 0.5, z - 0.5, x + 0.5, z + 0.5, 6, 'tree');
    }
    // Besonderheiten
    if (I.volcano) {
      const vx = I.x - 250, vz = I.z + 120; addInst(mC, vx, 60, vz, 160, 120, 160, 0, '#2a2220'); addInst(mC, vx, 112, vz, 40, 16, 40, 0, '#ff5a1e');
      const lava = new T.PointLight(0xff5020, 3, 400, 2); lava.position.set(vx, 130, vz); g.add(lava); I.vol = { x: vx, z: vz, h: 120 };
      L.addBox(vx - 100, vz - 100, vx + 100, vz + 100, 120, 'building');
    }
    if (I.bridge) {
      // Regenbogenbrücke hinaus aufs Meer
      const bc2 = ['#ff3030', '#ff9020', '#ffe020', '#30c040', '#3080ff', '#8040e0'];
      for (let k = 0; k < 60; k++) { const d = r - 40 + k * 8, a = 2.4, bx = I.x + Math.sin(a) * d, bz = I.z + Math.cos(a) * d; for (let c = 0; c < 6; c++) addInst(mB, bx + Math.cos(a) * (c - 2.5) * 1.6, 0.2 + Math.sin(k / 59 * Math.PI) * 30, bz - Math.sin(a) * (c - 2.5) * 1.6, 1.6, 0.4, 8.2, a, bc2[c]); }
    }
    // Checkpoint: Obelisk mit Lichtsäule in der Mitte
    addInst(mB, I.x, 0, I.z, 3, 9, 3, 0, '#5a5a62'); addInst(mR, I.x, 9, I.z, 2.4, 2.5, 2.4, 0, '#8a8a92');
    L.addBox(I.x - 1.6, I.z - 1.6, I.x + 1.6, I.z + 1.6, 11, 'building');
    const beamM = new T.MeshBasicMaterial({ color: 0x40e0ff, transparent: true, opacity: 0.35, blending: T.AdditiveBlending, depthWrite: false, fog: false });
    const beam = new T.Mesh(new T.CylinderGeometry(2, 3, 300, 12, 1, true), beamM); beam.position.set(I.x, 160, I.z); g.add(beam); I.beam = beam;
    // leere Gruppen entfernen (sonst hängt bei manchen Grafiktreibern das Zeichnen)
    for (const m of [mB, mR, mS, mC, mY]) { if (!m.count) { g.remove(m); continue; } m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; }
    I.built = true;
  }
  L.islandCheckpoint = (I) => ({ x: I.x + 6, z: I.z + 6 });

  // ---------- Bewohner: Monster, Menschen, Fahrzeuge ----------
  function populate(I) {
    if (isClient()) { I.populated = true; return; }
    const R = rnd(Date.now() & 0xffff), g = L._g;
    const spot = (minD) => { for (let k = 0; k < 40; k++) { const a = R() * 6.28, d = 60 + Math.sqrt(R()) * (I.r - 90), x = I.x + Math.sin(a) * d, z = I.z + Math.cos(a) * d; if (!L.queryBoxes(x, z, 2).length && L.dist(x, z, P.x, P.z) > minD) return [x, z]; } return [I.x + 80, I.z]; };
    for (const k of I.mon) for (let i = 0; i < 6; i++) {
      const [x, z] = spot(90), m = g.spawnMonster(k, x, z, k === 'viktor' ? L.pick(['grey', 'red', 'blue', 'lange']) : undefined);
      m.isl = I; L.tintRig(m.rig.root, I.monTint, 0.45);
    }
    for (let i = 0; i < 10; i++) { const [x, z] = spot(80), m = g.spawnMonster('walross', x, z, L.pick(L.WALROSS_VARS || [''])); m.isl = I; }
    for (let i = 0; i < 8; i++) {
      const [x, z] = spot(40), a = L.randomAppearance();
      a.top = L.pick(I.npc.top); a.topColor = L.pick(I.npc.topColor); a.hat = L.pick(I.npc.hat);
      const n = g.spawnNpc(x, z, i < 3, undefined, a); n.isl = I;
    }
    for (let i = 0; i < 6; i++) {
      const [x, z] = spot(20);
      g.spawnVehicle({ type: L.pick(I.veh), x, z, yaw: R() * 6.28 });
      const v = L.ents.vehicles[L.ents.vehicles.length - 1]; v.isl = I;
      L.tintRig(v.rig.root, I.vehCol, 0.6);
    }
    // Boote an der Küste
    if (!I.moon) for (let i = 0; i < 3; i++) { const a = Math.random() * 6.28; g.spawnVehicle({ type: L.pick(['jetski', 'motorboot', 'jetski']), x: I.x + Math.sin(a) * (I.r + 28), z: I.z + Math.cos(a) * (I.r + 28), yaw: a + 1.57 }); L.ents.vehicles[L.ents.vehicles.length - 1].isl = I; }
    for (let i = 0; i < 200; i++) { const [x, z] = spot(10); L.spawnItem(L.pick(['konserve', 'wasser', 'verband', 'bandage', 'tabletten', 'medkit', 'spritze', '9mm', 'schrot', 'riegel', 'cola', 'gold', 'granate']), x, z, 1); }
    I.populated = true;
  }
  // zufälliges Wanderziel auf der eigenen Insel
  L.islandWander = (e) => { const I = e.isl, a = Math.random() * 6.28, d = Math.sqrt(Math.random()) * (I.r - 60); return { x: I.x + Math.sin(a) * d, z: I.z + Math.cos(a) * d }; };

  // ---------- Meer: Riesenhaie, Meeresriesen, Wasserhosen ----------
  const sharks = [], giants = [];
  function buildShark() {
    const g = new T.Group(), c = '#5a6a78';
    const b = new T.Mesh(L.GEO.sph, mat(c)); b.scale.set(1.6, 1.4, 6); g.add(b);
    const belly = new T.Mesh(L.GEO.sph, mat('#d8dde0')); belly.scale.set(1.3, 0.9, 5.2); belly.position.y = -0.5; g.add(belly);
    const fin = new T.Mesh(L.GEO.cone, mat(c)); fin.scale.set(0.4, 3, 1.6); fin.position.set(0, 2.2, -0.5); g.add(fin);
    const tail = new T.Mesh(L.GEO.cone, mat(c)); tail.scale.set(0.3, 3.4, 1.4); tail.position.set(0, 0.6, -6.6); tail.rotation.x = -0.6; g.add(tail);
    for (const s of [-1, 1]) { const e = new T.Mesh(L.GEO.sph, mat('#050505')); e.scale.set(0.25, 0.25, 0.25); e.position.set(s * 1.1, 0.5, 4.2); g.add(e); }
    const mouth = new T.Mesh(L.GEO.box, mat('#3a0a0a')); mouth.scale.set(1.6, 0.5, 1.2); mouth.position.set(0, -0.6, 4.8); g.add(mouth);
    for (let k = -3; k <= 3; k++) { const tt = new T.Mesh(L.GEO.cone, mat('#ffffff')); tt.scale.set(0.12, 0.35, 0.12); tt.rotation.x = Math.PI; tt.position.set(k * 0.22, -0.3, 5.3); g.add(tt); }
    g.scale.setScalar(1.6); L.scene.add(g); return g;
  }
  function openSea(x, z) { let o = Math.max(Math.abs(x) - 1500, z - 1500, -z - 1650); for (const I of ISL) if (!I.dim) o = Math.min(o, Math.hypot(x - I.x, z - I.z) - I.r); return o; }
  L.openSea = openSea;
  function updateSea(dt) {
    if (L.inDim(P.x) || L.voyageOn) return;
    const ref = P.vehicle || P, alt = P.vehicle ? (P.vehicle.alt || 0) : (P.y || 0), os = openSea(P.x, P.z);
    // Riesenhaie springen vor dir aus dem Wasser
    L.sharkT = (L.sharkT === undefined ? 6 : L.sharkT) - dt;
    if (os > 300 && alt < 35 && alt > -2 && L.sharkT <= 0 && P.alive && !L.cine) {
      L.sharkT = L.rand(7, 14);
      const yaw = P.vehicle ? P.vehicle.yaw : P.yaw, sp = P.vehicle ? Math.max(5, Math.abs(P.vehicle.speed)) : 2;
      const ahead = 2.6 * sp, cx = P.x + Math.sin(yaw) * ahead, cz = P.z + Math.cos(yaw) * ahead, side = Math.random() < 0.5 ? 1 : -1;
      const sx = cx + Math.cos(yaw) * 40 * side, sz = cz - Math.sin(yaw) * 40 * side;
      sharks.push({ g: buildShark(), t: 0, dur: 2.6, sx, sz, ex: cx - Math.cos(yaw) * 40 * side, ez: cz + Math.sin(yaw) * 40 * side, h: 14 + Math.random() * 18, hit: false });
      L.msg('🦈 Ein Riesenhai springt aus dem Wasser – weich aus!', 2500);
      L.nz({ dur: 0.8, f: 600, type: 'bandpass', vol: 0.4, pos: { x: sx, y: 0, z: sz }, ref: 40 });
    }
    for (let i = sharks.length - 1; i >= 0; i--) {
      const s = sharks[i]; s.t += dt; const u = s.t / s.dur;
      const x = L.lerp(s.sx, s.ex, u), z = L.lerp(s.sz, s.ez, u), y = L.WATER_Y - 4 + Math.sin(u * Math.PI) * (s.h + 4);
      s.g.position.set(x, y, z); s.g.rotation.set(-Math.cos(u * Math.PI) * 0.9, Math.atan2(s.ex - s.sx, s.ez - s.sz), 0);
      if ((u < 0.08 || u > 0.92) && Math.random() < 0.6) L.fx('#e8f4ff', x, 0, z, 6, 6, { size: 0.6, life: 1 });
      const py = (P.vehicle ? (P.vehicle.alt || 0) : P.y) + 1;
      if (!s.hit && P.alive && Math.hypot(P.x - x, P.z - z) < 7 && Math.abs(py - y) < 7) {
        s.hit = true; L.hurtPlayer(35 * (L.md ? L.md.dmg : 1), 'Von einem Riesenhai erwischt');
        if (P.vehicle) { P.vehicle.speed *= 0.4; P.vehicle.vy = -6; } L.shake = Math.max(L.shake, 1);
      }
      if (u >= 1) { L.scene.remove(s.g); sharks.splice(i, 1); }
    }
    // Meeresriesen waten auf dem Meeresgrund hinterher (tun nichts, sind aber riesig)
    if (os > 600 && giants.length < 2 && Math.random() < dt * 0.05 && !isClient()) {
      const rig = L.buildRufer(); rig.root.scale.setScalar(8); L.tintRig(rig.root, '#2a4a5a', 0.6); L.scene.add(rig.root);
      const a = Math.random() * 6.28; giants.push({ rig, x: P.x + Math.sin(a) * 500, z: P.z + Math.cos(a) * 500, yaw: 0, ph: 0 });
      L.msg('🌊 Ein Meeresriese stapft durch das Meer auf dich zu!', 4000);
    }
    for (let i = giants.length - 1; i >= 0; i--) {
      const G0 = giants[i], d = L.dist(G0.x, G0.z, P.x, P.z);
      // stampft auf, wenn er dich erreicht (Wellen + Schaden)
      G0.cd = (G0.cd || 0) - dt;
      if (d < 34 && G0.cd <= 0 && P.alive && (P.y || 0) < 20) { G0.cd = 3; L.hurtPlayer(28 * (L.md ? L.md.dmg : 1), 'Vom Meeresriesen unter Wasser gedrückt'); L.shake = Math.max(L.shake, 1); L.fx('#e8f4ff', P.x, 0, P.z, 30, 10, { size: 1, life: 1.2 }); if (P.vehicle) { P.vehicle.speed *= 0.3; P.vehicle.hp -= 15; } }
      G0.yaw += L.angDiff(G0.yaw, Math.atan2(P.x - G0.x, P.z - G0.z)) * Math.min(1, dt);
      if (d > 30) { G0.x += Math.sin(G0.yaw) * 22 * dt; G0.z += Math.cos(G0.yaw) * 22 * dt; }
      G0.ph += dt * 1.5;
      L.animBeast(G0.rig, { mode: 'walk', phase: G0.ph });
      G0.rig.root.position.set(G0.x, -9, G0.z); G0.rig.root.rotation.set(0, G0.yaw, 0);
      if (Math.random() < dt * 3) L.fx('#e8f4ff', G0.x + L.rand(-10, 10), 0, G0.z + L.rand(-10, 10), 4, 6, { size: 1, life: 1.2 });
      if (Math.random() < dt * 0.3) L.snd.ruferStep({ x: G0.x, y: 0, z: G0.z });
      if (d > 1400 || openSea(G0.x, G0.z) < 150) { L.scene.remove(G0.rig.root); giants.splice(i, 1); }
    }
    // Wasserhosen auf dem Meer
    if (os > 400 && L.tornados && L.tornados.length < 1 && Math.random() < dt * 0.01 && !isClient()) { const a = Math.random() * 6.28; L.spawnTornado(P.x + Math.sin(a) * 350, P.z + Math.cos(a) * 350); }
  }
  L.clearSea = () => { for (const s of sharks) L.scene.remove(s.g); for (const G0 of giants) L.scene.remove(G0.rig.root); sharks.length = 0; giants.length = 0; };

  // ---------- Inselgefahren: Lavabomben, Blitze ----------
  const bombs = [];
  function updateHazards(I, dt) {
    if (I && I.vol && Math.random() < dt * 0.6) {
      const a = Math.random() * 6.28, d = L.rand(5, 60), tx = P.x + Math.sin(a) * d, tz = P.z + Math.cos(a) * d;
      const m = new T.Mesh(L.GEO.sph, new T.MeshBasicMaterial({ color: 0xff6a20 })); m.scale.setScalar(1.6); L.scene.add(m);
      bombs.push({ m, t: 0, dur: 3.2, sx: I.vol.x, sz: I.vol.z, sy: I.vol.h + 10, tx, tz });
    }
    if (I && I.lightning && Math.random() < dt * 0.25) {
      const a = Math.random() * 6.28, d = L.rand(8, 80), x = P.x + Math.sin(a) * d, z = P.z + Math.cos(a) * d;
      L.env.bolt = 1; L.snd.thunder(0.05); L.fx('#c8e0ff', x, 1, z, 30, 10, { basic: true, size: 0.6, life: 0.6 }); L.decal(x, z, 2.5, '#1a1a1a');
      if (L.dist(P.x, P.z, x, z) < 5 && P.alive && !P.vehicle) L.hurtPlayer(30, 'Vom Blitz der Götter getroffen');
    }
    for (let i = bombs.length - 1; i >= 0; i--) {
      const b = bombs[i]; b.t += dt; const u = b.t / b.dur;
      b.m.position.set(L.lerp(b.sx, b.tx, u), L.lerp(b.sy, 0.5, u) + Math.sin(u * Math.PI) * 80, L.lerp(b.sz, b.tz, u));
      if (Math.random() < dt * 30) L.fx('#3a3a3a', b.m.position.x, b.m.position.y, b.m.position.z, 1, 0.5, { size: 1.2, life: 1.5, g: -0.3 });
      if (u >= 1) {
        L.scene.remove(b.m); bombs.splice(i, 1);
        L.fx('#ff8030', b.tx, 1, b.tz, 30, 12, { basic: true, size: 0.6, life: 1 }); L.decal(b.tx, b.tz, 3, '#1a0a05'); L.snd.explosion({ x: b.tx, y: 1, z: b.tz });
        if (L.dist(P.x, P.z, b.tx, b.tz) < 6 && P.alive) L.hurtPlayer(40 * (L.md ? L.md.dmg : 1), 'Von einer Lavabombe getroffen');
      }
    }
  }

  // ---------- pro Bild ----------
  let lastIsl = null;
  L.updateIslands = function (dt) {
    let cur = null;
    for (const I of ISL) {
      const d = L.dist(P.x, P.z, I.x, I.z);
      if (d < 3200 && !I.built) (I.build || buildIsland)(I);
      if (I.group) I.group.visible = d < 3600;
      if (d < 1300 && !I.populated && L.state === 'game') populate(I);
      if (d < I.r + 250) cur = I;
      if (I.beam) { const done = L.save.checkpoints && L.save.checkpoints[I.id]; I.beam.material.color.set(done ? 0x50ff70 : 0x40e0ff); I.beam.material.opacity = 0.25 + Math.sin(performance.now() / 400) * 0.1; }
      // Checkpoint erreicht
      if (d < 9 && P.alive && !(L.save.checkpoints && L.save.checkpoints[I.id])) {
        L.save.checkpoints = L.save.checkpoints || {}; L.save.checkpoints[I.id] = true; L.persist();
        L.banner('✅ CHECKPOINT: ' + I.name.toUpperCase(), 'Ab jetzt kannst du im Menü hier starten.'); L.snd.codeOk();
      }
    }
    L.curIsland = cur;
    if (cur !== lastIsl) {
      if (cur) { L.banner(cur.icon + ' ' + cur.name.toUpperCase(), 'Eine neue Welt. Pass auf – hier ist alles anders.'); L.setWeather(cur.weather); L.env.wT = 99999; }
      else if (lastIsl) { L.randomWeather(); }
      lastIsl = cur;
    }
    L.envTint = cur ? { color: cur.tint, amt: cur.dim ? 0.97 : 0.45 } : null;
    updateSea(dt);
    updateHazards(cur, dt);
  };
  L.clearIslands = function () {
    L.clearSea();
    for (const b of bombs) L.scene.remove(b.m); bombs.length = 0;
    for (const I of ISL) I.populated = false;
  };
})();
