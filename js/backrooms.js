'use strict';
// Die Backrooms – Heimdall beamt dich hierher (asgard.js). 100 Level, jedes eine 2 × 2 km große Welt, die nahtlos umläuft
// (wer hinten rausläuft, kommt vorne wieder rein) und in 40-m-Stücken rund um den Spieler entsteht – also endlos.
// Ausgänge: Türen (EXIT = nächstes Level, ??? = Sprung nach vorn, ◀ = ein Level zurück) und flackernde Glitch-Wände (zufälliges Level).
// Raus kommt man über das Pause-Menü: „🌈 Zurück beamen“. Eigene Umsetzung der Internet-Legende, alle Level selbst entworfen.
(function () {
  const L = window.L, T = THREE, P = L.player;
  const X0 = 81000, SPAN = 2000, CELL = 5, CN = 8, CH = CELL * CN, PER = SPAN / CELL, CPER = SPAN / CH, NLEV = 100;
  const zc = (n) => (n - 49.5) * 2400;
  L.inBack = (x) => x > 78000 && x < 84000;
  L.BACK_N = NLEV;
  setTimeout(() => { const od = L.dimLand; L.dimLand = (x, z) => (L.inBack(x) ? true : od ? od(x, z) : false); }, 0);
  const mod = (a, m) => ((a % m) + m) % m;
  function h3(a, b, c) { let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) + Math.imul(c | 0, 1442695041)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; h = Math.imul(h ^ (h >>> 15), 2246822519); h ^= h >>> 13; return (h >>> 0) / 4294967296; }

  // ---------- Level ----------
  const THEMES = [
    { name: 'Die Lobby', wall: 'wallpaper', wc: '#cdbb6a', floor: 'carpet', fc: '#9a8a52', ceil: 'tiles', cc: '#d8d2b0', light: '#fff6d0', fog: '#8a7d4a', fogFar: 55, dens: 0.42, H: 3.2, lightP: 0.6, flick: 0.05, pill: 0.03, hemi: 1.0 },
    { name: 'Die Lagerhalle', wall: 'concrete', wc: '#8a8a86', floor: 'concrete', fc: '#6a6a66', ceil: 'concrete', cc: '#5a5a58', light: '#e8f0ff', fog: '#3a3c40', fogFar: 48, dens: 0.22, H: 5, lightP: 0.35, flick: 0.15, pill: 0.25, extra: 'crates', hemi: 0.75 },
    { name: 'Die Rohrgänge', wall: 'concrete', wc: '#5a4a40', floor: 'concrete', fc: '#3a3230', ceil: 'concrete', cc: '#2a2420', light: '#ff9a50', fog: '#1a1210', fogFar: 30, dens: 0.6, H: 2.8, lightP: 0.22, flick: 0.3, pill: 0, extra: 'pipes', hemi: 0.5 },
    { name: 'Die Elektrostation', wall: 'brick', wc: '#7a4a38', floor: 'concrete', fc: '#4a4440', ceil: 'concrete', cc: '#3a3634', light: '#d0e0ff', fog: '#1e2024', fogFar: 35, dens: 0.5, H: 3.4, lightP: 0.3, flick: 0.35, pill: 0.05, extra: 'machines', hemi: 0.6 },
    { name: 'Das leere Büro', wall: 'plain', wc: '#d8d8d0', floor: 'carpet', fc: '#5a6a7a', ceil: 'tiles', cc: '#e8e8e0', light: '#ffffff', fog: '#9aa0a4', fogFar: 60, dens: 0.3, H: 3, lightP: 0.6, flick: 0.04, pill: 0.02, extra: 'desks', hemi: 1.05 },
    { name: 'Das Hotel', wall: 'wood', wc: '#6a4228', floor: 'carpet', fc: '#7a1a1a', ceil: 'plain', cc: '#3a2a20', light: '#ffc870', fog: '#1a100a', fogFar: 35, dens: 0.55, H: 3.2, lightP: 0.35, flick: 0.1, pill: 0, hemi: 0.65 },
    { name: 'Lichter aus', wall: 'wallpaper', wc: '#4a4630', floor: 'carpet', fc: '#2a281a', ceil: 'tiles', cc: '#2a2a24', light: '#806a40', fog: '#000000', fogFar: 18, dens: 0.45, H: 3.2, lightP: 0.05, flick: 0.6, pill: 0, hemi: 0.14, dark: true },
    { name: 'Die Poolräume', wall: 'pool', wc: '#e8f2f4', floor: 'pool', fc: '#d8eef2', ceil: 'pool', cc: '#f0f6f8', light: '#ffffff', fog: '#cfe6ee', fogFar: 70, dens: 0.2, H: 4.5, lightP: 0.4, flick: 0, pill: 0.2, extra: 'water', hemi: 1.2 },
    { name: 'Die roten Räume', wall: 'plain', wc: '#8a1a1a', floor: 'carpet', fc: '#4a0a0a', ceil: 'plain', cc: '#3a0808', light: '#ff3030', fog: '#2a0404', fogFar: 35, dens: 0.45, H: 3.2, lightP: 0.35, flick: 0.2, pill: 0, hemi: 0.6 },
    { name: 'Die endlose Halle', wall: 'concrete', wc: '#bab4a4', floor: 'tilesF', fc: '#a8a290', ceil: 'tiles', cc: '#cfc9b8', light: '#fff4d8', fog: '#7a745e', fogFar: 80, dens: 0.05, H: 6, lightP: 0.5, flick: 0.05, pill: 0.35, hemi: 0.95 },
    { name: 'Die überfluteten Flure', wall: 'wallpaper', wc: '#7a8a6a', floor: 'carpet', fc: '#3a4a3a', ceil: 'tiles', cc: '#8a9a80', light: '#d8ffe0', fog: '#2a3a30', fogFar: 40, dens: 0.5, H: 3, lightP: 0.35, flick: 0.15, pill: 0, extra: 'water', hemi: 0.75 },
    { name: 'Das Schachbrett', wall: 'plain', wc: '#e8e8e8', floor: 'checker', fc: '#161616', ceil: 'plain', cc: '#f4f4f4', light: '#ffffff', fog: '#d0d0d0', fogFar: 60, dens: 0.35, H: 3.6, lightP: 0.5, flick: 0.08, pill: 0.05, hemi: 1.1 },
    { name: 'Das Spielzimmer', wall: 'wallpaper', wc: '#f4c8d8', floor: 'carpet', fc: '#a8d8f0', ceil: 'plain', cc: '#fff0c8', light: '#fff0f8', fog: '#e8c8e0', fogFar: 55, dens: 0.4, H: 3, lightP: 0.5, flick: 0.1, pill: 0, extra: 'toys', hemi: 1.05 },
    { name: 'Die Krankenhausflure', wall: 'plain', wc: '#a8c8b0', floor: 'tilesF', fc: '#c8d8cc', ceil: 'tiles', cc: '#e0e8e0', light: '#e8fff0', fog: '#5a7060', fogFar: 45, dens: 0.55, H: 3, lightP: 0.45, flick: 0.25, pill: 0, hemi: 0.85 },
    { name: 'Die Bibliothek', wall: 'books', wc: '#5a3a20', floor: 'wood', fc: '#6a4a2a', ceil: 'wood', cc: '#3a2614', light: '#ffd890', fog: '#1e140a', fogFar: 40, dens: 0.5, H: 4, lightP: 0.3, flick: 0.05, pill: 0.05, hemi: 0.7 },
    { name: 'Der Dachboden', wall: 'wood', wc: '#8a6a48', floor: 'wood', fc: '#7a5a38', ceil: 'wood', cc: '#5a4028', light: '#ffcc88', fog: '#2a2014', fogFar: 35, dens: 0.35, H: 2.6, lightP: 0.22, flick: 0.2, pill: 0.3, extra: 'crates', hemi: 0.65 },
    { name: 'Die Neonflure', wall: 'plain', wc: '#1e1a2a', floor: 'checker', fc: '#2a1a3a', ceil: 'plain', cc: '#141020', light: '#ff40e0', fog: '#100818', fogFar: 40, dens: 0.45, H: 3.4, lightP: 0.45, flick: 0.15, pill: 0.05, hemi: 0.6 }
  ];
  const END = { name: 'Der letzte Raum', wall: 'plain', wc: '#e8e6f0', floor: 'tilesF', fc: '#d8d6e0', ceil: 'plain', cc: '#f4f4f8', light: '#ffffff', fog: '#e4e2ee', fogFar: 70, dens: 0.06, H: 8, lightP: 0.6, flick: 0, pill: 0.06, hemi: 0.85, end: true };
  const shade = (hex, k) => '#' + new T.Color(hex).offsetHSL(k * 0.12, 0, k * 0.12).getHexString();
  function levelDef(n) {
    const base = n === NLEV - 1 ? END : n < THEMES.length ? THEMES[n] : THEMES[Math.floor(h3(n, 7, 3) * THEMES.length)];
    const d = Object.assign({}, base, { n });
    if (n >= THEMES.length && !base.end) {
      const j = (k) => h3(n, k, 11) - 0.5;
      d.dens = L.clamp(base.dens + j(1) * 0.2, 0.03, 0.65);
      d.H = Math.max(2.6, base.H + j(2) * 1.2);
      d.wc = shade(base.wc, j(3)); d.fc = shade(base.fc, j(4));
      d.flick = Math.min(0.7, base.flick + n / 400);
      d.fogFar = Math.max(16, base.fogFar * (1 - n / 260));
      d.hemi = base.hemi * (1 - n / 320);
    }
    d.seed = n * 7919 + 13;
    return d;
  }
  L.backLevelName = (n) => levelDef(n).name;

  // ---------- Texturen (selbst gemalt) ----------
  function cv(w, h, fn) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); fn(g, w, h); const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 4; return t; }
  function speck(g, w, h, n, a, dark) { for (let i = 0; i < n; i++) { g.fillStyle = `rgba(${dark ? '0,0,0' : '255,255,255'},${(Math.random() * a).toFixed(3)})`; g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2); } }
  function stains(g, w, h, n) { for (let i = 0; i < n; i++) { g.fillStyle = `rgba(90,60,20,${(0.04 + Math.random() * 0.08).toFixed(3)})`; g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, 6 + Math.random() * 26, 4 + Math.random() * 18, Math.random() * 3, 0, 6.3); g.fill(); } }
  function board(g, w, h, c) { g.fillStyle = shade(c, -0.6); g.fillRect(0, h - 14, w, 14); g.fillStyle = 'rgba(255,255,255,0.15)'; g.fillRect(0, h - 14, w, 2); }
  const PAINT = {
    wallpaper(g, w, h, c) { g.fillStyle = c; g.fillRect(0, 0, w, h); g.fillStyle = shade(c, -0.25); for (let x = 0; x < w; x += 16) g.fillRect(x, 0, 3, h); g.globalAlpha = 0.3; for (let y = 10; y < h; y += 24) for (let x = 8; x < w; x += 16) { g.beginPath(); g.moveTo(x, y - 4); g.lineTo(x + 4, y); g.lineTo(x, y + 4); g.lineTo(x - 4, y); g.fill(); } g.globalAlpha = 1; speck(g, w, h, 700, 0.1, true); stains(g, w, h, 5); board(g, w, h, c); },
    concrete(g, w, h, c) { g.fillStyle = c; g.fillRect(0, 0, w, h); speck(g, w, h, 2500, 0.18, true); speck(g, w, h, 900, 0.12); g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 1; for (let k = 0; k < 3; k++) { g.beginPath(); let x = Math.random() * w, y = Math.random() * h; g.moveTo(x, y); for (let i = 0; i < 6; i++) { x += (Math.random() - 0.5) * 30; y += Math.random() * 20; g.lineTo(x, y); } g.stroke(); } g.fillStyle = 'rgba(0,0,0,0.15)'; g.fillRect(0, h / 2, w, 2); },
    brick(g, w, h, c) { g.fillStyle = shade(c, 0.5); g.fillRect(0, 0, w, h); for (let y = 0, r = 0; y < h; y += 16, r++) for (let x = (r % 2) * -16; x < w; x += 32) { g.fillStyle = shade(c, (Math.random() - 0.5) * 0.4); g.fillRect(x + 1, y + 1, 30, 14); } speck(g, w, h, 900, 0.12, true); },
    plain(g, w, h, c) { g.fillStyle = c; g.fillRect(0, 0, w, h); speck(g, w, h, 600, 0.06, true); stains(g, w, h, 2); board(g, w, h, c); },
    wood(g, w, h, c) { for (let x = 0; x < w; x += 32) { g.fillStyle = shade(c, (Math.random() - 0.5) * 0.35); g.fillRect(x, 0, 32, h); g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x, 0, 2, h); g.strokeStyle = 'rgba(0,0,0,0.12)'; for (let k = 0; k < 4; k++) { g.beginPath(); const gx = x + 6 + Math.random() * 20; g.moveTo(gx, 0); g.bezierCurveTo(gx + 6, h / 3, gx - 6, h / 1.5, gx, h); g.stroke(); } } },
    pool(g, w, h, c) { g.fillStyle = c; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(80,140,170,0.35)'; for (let k = 0; k <= w; k += 16) { g.fillRect(k, 0, 2, h); g.fillRect(0, k, w, 2); } speck(g, w, h, 300, 0.05, true); },
    books(g, w, h, c) { g.fillStyle = shade(c, -0.4); g.fillRect(0, 0, w, h); for (let y = 0; y < h - 20; y += 64) { g.fillStyle = c; g.fillRect(0, y + 56, w, 8); for (let x = 2; x < w;) { const bw = 4 + Math.random() * 8, bh = 34 + Math.random() * 20; g.fillStyle = `hsl(${Math.floor(Math.random() * 360)},${30 + Math.random() * 40}%,${20 + Math.random() * 30}%)`; g.fillRect(x, y + 56 - bh, bw, bh); x += bw + 1; } } board(g, w, h, c); },
    carpet(g, w, h, c) { g.fillStyle = c; g.fillRect(0, 0, w, h); speck(g, w, h, 4000, 0.14, true); speck(g, w, h, 1500, 0.08); stains(g, w, h, 4); },
    tiles(g, w, h, c) { g.fillStyle = c; g.fillRect(0, 0, w, h); speck(g, w, h, 1500, 0.07, true); g.fillStyle = 'rgba(0,0,0,0.22)'; for (let k = 0; k <= w; k += 64) { g.fillRect(k, 0, 3, h); g.fillRect(0, k, w, 3); } stains(g, w, h, 3); },
    tilesF(g, w, h, c) { g.fillStyle = c; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 64) for (let x = 0; x < w; x += 64) { g.fillStyle = shade(c, (Math.random() - 0.5) * 0.15); g.fillRect(x + 2, y + 2, 60, 60); } speck(g, w, h, 800, 0.06, true); },
    checker(g, w, h, c) { for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.fillStyle = (x + y) % 2 ? c : '#e8e8e8'; g.fillRect(x * w / 4, y * h / 4, w / 4, h / 4); } speck(g, w, h, 600, 0.06, true); }
  };

  // ---------- Zustand ----------
  let cur = null, LX = 0, LZ = 0, M = null; // aktuelles Level, Ursprung, Materialien/Geometrien
  const chunks = new Map(), spawnedItems = new Set();
  const root = new T.Group(); root.visible = false;
  const pl = new T.PointLight(0xffffff, 0, 22, 1.6);
  let inScene = false;
  function addToScene() { if (inScene || !L.scene) return; inScene = true; L.scene.add(root); L.scene.add(pl); L.scene.add(water); }
  const water = new T.Mesh(new T.PlaneGeometry(320, 320).rotateX(-Math.PI / 2), new T.MeshPhongMaterial({ color: 0x7ac8e0, transparent: true, opacity: 0.45, shininess: 120, specular: 0xffffff, depthWrite: false }));
  water.visible = false; water.renderOrder = 3;
  water.material.map = cv(128, 128, (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(120,170,200,0.5)'; for (let k = 0; k < 14; k++) { g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, 10 + Math.random() * 20, 4 + Math.random() * 8, 0, 0, 6.3); g.stroke(); } });
  water.material.map.repeat.set(40, 40);

  function setLevel(n) {
    addToScene();
    if (cur && cur.n === n) return;
    disposeAll();
    const D = cur = levelDef(n);
    LX = X0 - SPAN / 2; LZ = zc(n) - SPAN / 2;
    const tex = (kind, c, rx, ry) => { const t = cv(256, 256, (g, w, h) => PAINT[kind](g, w, h, c)); t.repeat.set(rx, ry); return t; };
    const lam = (map) => new T.MeshLambertMaterial({ map });
    M = {
      wallGeo: new T.BoxGeometry(CELL + 0.3, D.H, 0.3).translate(0, D.H / 2, 0),
      pillGeo: new T.BoxGeometry(0.9, D.H, 0.9).translate(0, D.H / 2, 0),
      lightGeo: new T.PlaneGeometry(1.3, 0.65).rotateX(Math.PI / 2),
      floorGeo: new T.PlaneGeometry(CH, CH).rotateX(-Math.PI / 2),
      ceilGeo: new T.PlaneGeometry(CH, CH).rotateX(Math.PI / 2),
      wall: lam(tex(D.wall, D.wc, 2, 1)),
      floor: D.floor === 'pool' ? new T.MeshPhongMaterial({ map: tex('pool', D.fc, 16, 16), shininess: 90 }) : lam(tex(D.floor, D.fc, 16, 16)),
      ceil: lam(tex(D.ceil, D.cc, 16, 16)),
      light: new T.MeshBasicMaterial({ color: D.light }),
      box: new T.MeshLambertMaterial({ color: 0xffffff }),
      pipe: new T.MeshLambertMaterial({ color: 0x6a6a64 }),
      door: new T.MeshLambertMaterial({ color: 0x8a6a48 }),
      frame: new T.MeshLambertMaterial({ color: 0x3a3a3a }),
      glitch: new T.MeshBasicMaterial({ color: 0xff00ff, transparent: true, opacity: 0.85 }),
      signs: {}
    };
    if (D.wall === 'pool') M.wall.color.set('#ffffff');
    water.visible = false;
  }
  function signMat(type) {
    if (M.signs[type]) return M.signs[type];
    const S = { next: ['EXIT ▶', '#0a5a1a', '#7aff9a'], skip: ['? ? ?', '#5a0a0a', '#ff6a6a'], back: ['◀ ZURÜCK', '#0a2a5a', '#7ab0ff'], home: ['🌈 ASGARD', '#5a4a0a', '#ffe070'] }[type];
    return (M.signs[type] = new T.MeshBasicMaterial({ map: L.textTex(S[0], 256, 96, S[1], S[2], 'bold 52px Arial') }));
  }
  function disposeAll() {
    for (const c of chunks.values()) dropChunk(c);
    chunks.clear();
    if (M) { for (const k in M) { const v = M[k]; if (v && v.dispose) { if (v.map) v.map.dispose(); v.dispose(); } } for (const k in M.signs) { M.signs[k].map.dispose(); M.signs[k].dispose(); } }
    M = null; cur = null;
  }
  function dropChunk(c) {
    root.remove(c.g);
    c.g.traverse((o) => { if (o.isInstancedMesh && o.dispose) o.dispose(); });
    for (const b of c.boxes) L.removeBox(b);
  }
  function instMesh(geo, mat, list, setM, colors) {
    if (!list.length) return null;
    const m = new T.InstancedMesh(geo, mat, list.length), o = new T.Object3D();
    if (colors) m.instanceColor = new T.InstancedBufferAttribute(new Float32Array(list.length * 3).fill(1), 3);
    list.forEach((q, i) => { o.position.set(0, 0, 0); o.rotation.set(0, 0, 0); o.scale.set(1, 1, 1); setM(o, q, i); o.updateMatrix(); m.setMatrixAt(i, o.matrix); if (colors && q.col) { const c = new T.Color(q.col); m.instanceColor.setXYZ(i, c.r, c.g, c.b); } });
    m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.frustumCulled = false;
    return m;
  }
  // ein 40-m-Stück bauen (cx/cz = Stück-Nummer ab dem Level-Ursprung, darf außerhalb 0…49 liegen – die Welt läuft um)
  function buildChunk(cx, cz) {
    const D = cur, g = new T.Group(), boxes = [], ox = LX + cx * CH, oz = LZ + cz * CH;
    const walls = [], pills = [], lights = [], props = [], pipes = [], doors = [], glitches = [];
    const pcx = mod(cx, CPER), pcz = mod(cz, CPER);
    const dB = L.clamp(D.dens * 1.8, 0.04, 0.92), dI = D.dens * 0.35;
    const spawnish = (gi, gj) => Math.abs(gi - PER / 2) <= 1 && Math.abs(gj - PER / 2) <= 1;
    // Ausgänge und Glitch-Wand in diesem Stück
    let doorCell = null, glitchCell = null;
    if (h3(pcx, pcz, D.seed + 20) < (D.end ? 0.5 : 0.24)) doorCell = [Math.floor(h3(pcx, pcz, D.seed + 21) * CN), Math.floor(h3(pcx, pcz, D.seed + 22) * CN)];
    if (!D.end && h3(pcx, pcz, D.seed + 30) < 0.06) glitchCell = [Math.floor(h3(pcx, pcz, D.seed + 31) * CN), Math.floor(h3(pcx, pcz, D.seed + 32) * CN)];
    for (let i = 0; i < CN; i++) for (let j = 0; j < CN; j++) {
      const gi = mod(cx * CN + i, PER), gj = mod(cz * CN + j, PER), x = ox + i * CELL, z = oz + j * CELL, sp = spawnish(gi, gj);
      // Wände an den Zellkanten: Raumgrenzen alle 4 Zellen (immer mit Durchgang), dazwischen einzelne Stellwände
      const bW = gi % 4 === 0, bN = gj % 4 === 0;
      const gapW = bW && Math.floor(h3(gi, Math.floor(gj / 4), D.seed + 5) * 4) === gj % 4, gapN = bN && Math.floor(h3(Math.floor(gi / 4), gj, D.seed + 6) * 4) === gi % 4;
      const isDoor = doorCell && doorCell[0] === i && doorCell[1] === j && !sp, isGl = glitchCell && glitchCell[0] === i && glitchCell[1] === j && !sp && !isDoor;
      if (!sp && !gapW && h3(gi, gj, D.seed) < (bW ? dB : dI)) walls.push({ x, z: z + CELL / 2, r: 1 });
      if (isGl) glitches.push({ x: x + CELL / 2, z });
      else if (!sp && (isDoor || (!gapN && h3(gi, gj, D.seed + 1) < (bN ? dB : dI)))) walls.push({ x: x + CELL / 2, z, r: 0 });
      if (isDoor) doors.push({ x: x + CELL / 2, z, type: D.end ? 'home' : (() => { const r = h3(gi, gj, D.seed + 23); return r < 0.68 ? 'next' : r < 0.86 && D.n > 0 ? 'back' : 'skip'; })(), open: 0 });
      if (!sp && h3(gi, gj, D.seed + 2) < D.pill) pills.push({ x, z });
      if ((gi + gj) % 2 === 0 && h3(gi, gj, D.seed + 3) < D.lightP) lights.push({ x: x + CELL / 2, z: z + CELL / 2, fl: h3(gi, gj, D.seed + 4) < D.flick, ph: h3(gi, gj, 99) * 50 });
      // Dinge im Raum
      const pr = h3(gi, gj, D.seed + 7), px = x + CELL / 2 + (h3(gi, gj, D.seed + 8) - 0.5) * 1.6, pz = z + CELL / 2 + (h3(gi, gj, D.seed + 9) - 0.5) * 1.6;
      if (!sp && !isDoor) {
        if (D.extra === 'crates' && pr < 0.16) { const s = 1.2 + pr * 5; props.push({ x: px, z: pz, w: s, h: s * (pr < 0.06 ? 1.6 : 1), d: s, col: pr < 0.08 ? '#8a6a3a' : '#6a5030', box: true }); }
        if (D.extra === 'desks' && pr < 0.22) { props.push({ x: px, z: pz, w: 1.6, h: 0.75, d: 0.8, col: '#b8b0a0', box: true }); props.push({ x: px, z: pz - 0.15, y: 0.75, w: 0.55, h: 0.4, d: 0.08, col: '#202428' }); props.push({ x: px, z: pz + 0.7, w: 0.5, h: 0.5, d: 0.5, col: '#3a3a44' }); }
        if (D.extra === 'machines' && pr < 0.14) { props.push({ x: px, z: pz, w: 1.4, h: 2.2, d: 1, col: '#5a6066', box: true }); props.push({ x: px + 0.4, z: pz + 0.51, y: 1.8, w: 0.12, h: 0.12, d: 0.04, col: pr < 0.07 ? '#ff3020' : '#30ff60', blink: true }); }
        if (D.extra === 'toys' && pr < 0.2) { const c = ['#ff5a5a', '#5ab0ff', '#ffd040', '#7aff7a', '#ff8ad8'][Math.floor(pr * 25) % 5]; props.push({ x: px, z: pz, w: 0.5, h: 0.5, d: 0.5, col: c }); }
      }
      // Vorräte (nur einmal pro Stelle)
      if (!sp && h3(gi, gj, D.seed + 40) < 0.012) {
        const key = D.n + ':' + gi + ':' + gj;
        if (!spawnedItems.has(key)) { spawnedItems.add(key); const r = h3(gi, gj, D.seed + 41); L.spawnItem(r < 0.55 ? 'wasser' : r < 0.75 ? 'riegel' : r < 0.9 ? 'konserve' : 'verband', x + CELL / 2, z + CELL / 2, 1, undefined, undefined, undefined, 0, true); }
      }
    }
    for (const w of walls) {
      if (w.r) boxes.push(L.addBox(w.x - 0.18, w.z - CELL / 2 - 0.15, w.x + 0.18, w.z + CELL / 2 + 0.15, D.H, 'building'));
      else boxes.push(L.addBox(w.x - CELL / 2 - 0.15, w.z - 0.18, w.x + CELL / 2 + 0.15, w.z + 0.18, D.H, 'building'));
      if (D.extra === 'pipes' && h3(Math.round(w.x), Math.round(w.z), D.seed + 50) < 0.7) pipes.push({ x: w.x + (w.r ? 0.35 : 0), z: w.z + (w.r ? 0 : 0.35), r: w.r, y: D.H - 0.35 - h3(Math.round(w.x), Math.round(w.z), 3) * 0.5 });
    }
    for (const p of pills) boxes.push(L.addBox(p.x - 0.45, p.z - 0.45, p.x + 0.45, p.z + 0.45, D.H, 'building'));
    for (const p of props) if (p.box) boxes.push(L.addBox(p.x - p.w / 2, p.z - p.d / 2, p.x + p.w / 2, p.z + p.d / 2, p.h, 'prop'));
    const add = (m) => { if (m) g.add(m); return m; };
    add(instMesh(M.wallGeo, M.wall, walls, (o, q) => { o.position.set(q.x, 0, q.z); o.rotation.y = q.r ? Math.PI / 2 : 0; }));
    add(instMesh(M.pillGeo, M.wall, pills, (o, q) => o.position.set(q.x, 0, q.z)));
    const lm = add(instMesh(M.lightGeo, M.light, lights, (o, q) => o.position.set(q.x, D.H - 0.02, q.z), true));
    add(instMesh(L.GEO.boxB, M.box, props, (o, q) => { o.position.set(q.x, q.y || 0, q.z); o.scale.set(q.w, q.h, q.d); }, true));
    add(instMesh(L.GEO.cyl, M.pipe, pipes, (o, q) => { o.position.set(q.x, q.y, q.z); o.rotation.set(q.r ? Math.PI / 2 : 0, 0, q.r ? 0 : Math.PI / 2); o.scale.set(0.12, CELL + 0.3, 0.12); }));
    const fl = new T.Mesh(M.floorGeo, M.floor); fl.position.set(ox + CH / 2, 0, oz + CH / 2); g.add(fl);
    const ce = new T.Mesh(M.ceilGeo, M.ceil); ce.position.set(ox + CH / 2, D.H, oz + CH / 2); g.add(ce);
    // Türen (auf beiden Seiten der Wand)
    for (const d of doors) {
      const dg = new T.Group(); dg.position.set(d.x, 0, d.z); g.add(dg);
      for (const s of [-1, 1]) {
        const side = new T.Group(); side.position.z = s * 0.16; side.rotation.y = s < 0 ? Math.PI : 0; dg.add(side);
        const fr = new T.Mesh(L.GEO.box, M.frame); fr.scale.set(1.5, 2.35, 0.04); fr.position.set(0, 1.17, 0.01); side.add(fr);
        const hinge = new T.Group(); hinge.position.set(-0.6, 0, 0.04); side.add(hinge);
        const pan = new T.Mesh(L.GEO.box, M.door); pan.scale.set(1.2, 2.2, 0.06); pan.position.set(0.6, 1.1, 0); hinge.add(pan);
        const knob = new T.Mesh(L.GEO.sph, L.mat('#d8c070')); knob.scale.setScalar(0.05); knob.position.set(1.05, 1.05, 0.06); hinge.add(knob);
        const sg = new T.Mesh(new T.PlaneGeometry(0.9, 0.34), signMat(d.type)); sg.position.set(0, 2.55, 0.05); side.add(sg);
        (d.hinges = d.hinges || []).push(hinge);
      }
      d.g = dg;
    }
    // Glitch-Wände: flackern, keine Kollision – wer reinläuft, fällt durch („noclip“)
    for (const q of glitches) { const m = new T.Mesh(M.wallGeo, M.glitch.clone()); m.position.set(q.x, 0, q.z); g.add(m); q.m = m; }
    root.add(g);
    return { g, boxes, cx, cz, lm, lights, doors, glitches };
  }
  // Stücke um den Spieler laden/entladen
  function stream(force) {
    const px = P.x - LX, pz = P.z - LZ, ccx = Math.floor(px / CH), ccz = Math.floor(pz / CH), R = cur.fogFar > 56 ? 3 : 2;
    for (const [k, c] of chunks) if (Math.abs(c.cx - ccx) > R + 1 || Math.abs(c.cz - ccz) > R + 1) { dropChunk(c); chunks.delete(k); }
    const need = [];
    for (let i = -R; i <= R; i++) for (let j = -R; j <= R; j++) { const k = (ccx + i) + ',' + (ccz + j); if (!chunks.has(k)) need.push([ccx + i, ccz + j, i * i + j * j]); }
    need.sort((a, b) => a[2] - b[2]);
    for (let n = 0; n < need.length && (force || n < 4); n++) chunks.set(need[n][0] + ',' + need[n][1], buildChunk(need[n][0], need[n][1]));
  }
  // nahtlos umlaufen: Spieler und alle Stücke um 2 km verschieben
  function wrap() {
    let dx = 0, dz = 0;
    if (P.x < LX) dx = SPAN; else if (P.x >= LX + SPAN) dx = -SPAN;
    if (P.z < LZ) dz = SPAN; else if (P.z >= LZ + SPAN) dz = -SPAN;
    if (!dx && !dz) return;
    P.x += dx; P.z += dz; L.camera.position.x += dx; L.camera.position.z += dz;
    const old = [...chunks.values()]; chunks.clear();
    for (const c of old) {
      c.g.position.x += dx; c.g.position.z += dz; c.cx += dx / CH; c.cz += dz / CH;
      for (const b of c.boxes) L.removeBox(b);
      c.boxes = c.boxes.map((b) => L.addBox(b.x1 + dx, b.z1 + dz, b.x2 + dx, b.z2 + dz, b.h, b.kind));
      for (const d of c.doors) { d.x += dx; d.z += dz; }
      for (const q of c.glitches) { q.x += dx; q.z += dz; }
      chunks.set(c.cx + ',' + c.cz, c);
    }
  }

  // ---------- Betreten / Wechseln ----------
  const hud = document.createElement('div');
  hud.style.cssText = 'position:fixed;top:54px;left:50%;transform:translateX(-50%);z-index:30;pointer-events:none;font:bold 15px Arial,sans-serif;color:#fff6c8;background:rgba(40,34,10,.62);padding:5px 14px;border-radius:10px;text-shadow:0 1px 3px #000;display:none;text-align:center';
  document.body.appendChild(hud);
  const fade = document.createElement('div');
  fade.style.cssText = 'position:fixed;inset:0;z-index:60;pointer-events:none;background:#000;opacity:0;transition:none';
  document.body.appendChild(fade);
  L.backFade = fade;
  const cst = document.createElement('style'); cst.textContent = 'body.cinema #brHud{visibility:hidden}'; document.head.appendChild(cst); hud.id = 'brHud';
  function showHud() { if (!cur) { hud.style.display = 'none'; return; } hud.style.display = 'block'; hud.innerHTML = `🟨 BACKROOMS · LEVEL ${cur.n} – ${cur.name}<br><span style="font-size:11px;font-weight:normal;opacity:.85">Ausgänge: Türen 🚪 · Heimweg: Pause-Menü → 🌈 Zurück beamen</span>`; }
  function beamBtn() { const b = L.$ && L.$('pBeam'); if (b) b.hidden = !(cur && L.inBack(P.x)); }
  L.backSpawn = (n) => ({ x: X0 + 2.5, z: zc(n) + 2.5 });
  // in Level n setzen (von Heimdall oder durch eine Tür)
  L.backEnter = function (n, y) {
    n = L.clamp(n | 0, 0, NLEV - 1);
    if (P.vehicle && L._leaveVehicle) L._leaveVehicle(true);
    setLevel(n);
    const s = L.backSpawn(n);
    P.x = s.x; P.z = s.z; P.y = y || 0; P.vx = P.vz = P.vy = 0; P.air = (y || 0) > 0.1; P.flying = 0; P.swim = false;
    P.spawnProt = Math.max(P.spawnProt || 0, 5);
    root.visible = true; stream(true); showHud(); beamBtn();
    L.save.backMax = Math.max(L.save.backMax || 0, n); if (L.persist) L.persist();
    L.banner('🟨 LEVEL ' + n, cur.name + (n === 0 ? ' – summende Neonröhren, feuchter Teppich, kein Ende in Sicht …' : n === NLEV - 1 ? ' – das letzte Level. Die goldene Tür bringt dich nach Asgard.' : ''));
  };
  L.backLeft = function () { root.visible = false; water.visible = false; pl.intensity = 0; hud.style.display = 'none'; L.indoor = null; beamBtn(); leftT = 0; };
  let trans = null, leftT = 0;
  function goLevel(n, how) {
    if (trans) return;
    trans = { t: 0, n: L.clamp(n, 0, NLEV - 1), how };
    if (how === 'glitch') { L.msg('⚠️ D̷u̵ ̶f̴ä̷l̸l̶s̸t̶ ̷d̸u̵r̸c̷h̶ ̴d̸i̷e̸ ̴W̵a̶n̷d̷ ̸…', 2500); for (let k = 0; k < 8; k++) L.nz && L.nz({ dur: 0.08, f: 300 + Math.random() * 4000, type: 'bandpass', vol: 0.25, delay: k * 0.06 }); }
    else { L.snd.door && L.snd.door(); }
  }
  function updateTrans(dt) {
    const tr = trans; tr.t += dt;
    const gl = tr.how === 'glitch';
    if (tr.t < 0.7) { fade.style.background = gl ? (Math.random() < 0.5 ? '#ff00ff' : '#00ffff') : '#000'; fade.style.opacity = String(Math.min(1, tr.t / 0.6)); P.vx = P.vz = 0; return; }
    if (!tr.done) { tr.done = true; L.backEnter(tr.n, gl ? 2.5 : 0); fade.style.background = '#000'; }
    fade.style.opacity = String(Math.max(0, 1 - (tr.t - 0.7) / 0.7));
    if (tr.t > 1.4) { fade.style.opacity = '0'; trans = null; }
  }
  // nahe Tür
  function nearDoor() {
    if (!cur || trans || !L.inBack(P.x)) return null;
    let best = null, bd = 2.3;
    for (const c of chunks.values()) for (const d of c.doors) { const dd = Math.hypot(P.x - d.x, P.z - d.z); if (dd < bd) { bd = dd; best = d; } }
    return best;
  }
  const target = (d) => d.type === 'next' ? cur.n + 1 : d.type === 'back' ? cur.n - 1 : d.type === 'skip' ? cur.n + 2 + Math.floor(h3(Math.round(d.x), Math.round(d.z), 77) * 5) : -1;
  const och = L.crateHint, oci = L.crateInteract;
  L.crateHint = () => {
    const d = nearDoor();
    if (d) { if (d.type === 'home') return 'E: 🌈 Goldene Tür – zurück nach Asgard'; const n = Math.min(NLEV - 1, target(d)); return 'E: 🚪 ' + (d.type === 'next' ? 'EXIT → Level ' + n : d.type === 'back' ? 'Zurück → Level ' + n : '??? → irgendwo weiter vorne …'); }
    return och ? och() : null;
  };
  L.crateInteract = function () {
    const d = nearDoor(); if (!d) return oci ? oci() : false;
    if (d.type === 'home') { if (L.beamHome) L.beamHome(); return true; }
    d.opening = true; goLevel(Math.min(NLEV - 1, target(d)), 'door');
    return true;
  };

  // ---------- Geräusche ----------
  let humG = null, humOn = false, sndT = 6;
  function hum(on) {
    const A = L.audio; if (!A || !A.ctx || on === humOn) return;
    if (!humG) {
      const c = A.ctx, g = c.createGain(); g.gain.value = 0;
      const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420;
      for (const [fr, ty] of [[60, 'sawtooth'], [120, 'sine'], [180.5, 'sine']]) { const o = c.createOscillator(); o.type = ty; o.frequency.value = fr; o.connect(f); o.start(); }
      f.connect(g); g.connect(A.sfx || A.master); humG = g;
    }
    humOn = on; humG.gain.setTargetAtTime(on ? 0.05 : 0, A.ctx.currentTime, 0.4);
  }
  function ambient(dt) {
    sndT -= dt; if (sndT > 0) return; sndT = 7 + Math.random() * 14;
    const a = Math.random() * 6.28, d = 15 + Math.random() * 30, pos = { x: P.x + Math.sin(a) * d, y: 1, z: P.z + Math.cos(a) * d }, r = Math.random();
    if (r < 0.4) for (let k = 0; k < 6; k++) L.nz && L.nz({ dur: 0.07, f: 500, type: 'bandpass', vol: 0.12, pos, delay: k * 0.45 });
    else if (r < 0.65) for (let k = 0; k < 3; k++) L.nz && L.nz({ dur: 0.1, f: 260, vol: 0.25, pos, delay: k * 0.28 });
    else if (r < 0.85) L.tn && L.tn({ f: 1200, fTo: 1180, dur: 1.4, type: 'sine', vol: 0.03 });
    else L.nz && L.nz({ dur: 1.8, f: 140, fTo: 90, vol: 0.12, pos });
  }

  // ---------- jedes Bild ----------
  const tmpC = new T.Color();
  L.updateBackrooms = function (dt) {
    addToScene();
    if (trans) updateTrans(dt);
    const inside = cur && L.inBack(P.x);
    if (!inside) {
      if (cur && !trans && !(L.beamBusy && L.beamBusy())) { leftT += dt; if (leftT > 2) { disposeAll(); L.backLeft(); } }
      return;
    }
    leftT = 0;
    if (P.y > 60) return; // im Beam (Tunnel)
    root.visible = true;
    wrap(); stream(false);
    L.indoor = { ceil: cur.H, back: true };
    // Lichter flackern
    const t = performance.now() / 1000;
    for (const c of chunks.values()) {
      if (!c.lm) continue; let ch = false;
      c.lights.forEach((q, i) => { if (!q.fl) return; const on = Math.sin(t * 7 + q.ph) + Math.sin(t * 23 + q.ph * 3) > (cur.n > 30 ? 0.2 : 0.9) || Math.random() < 0.02 ? 0.12 : 1; tmpC.set(cur.light).multiplyScalar(on); c.lm.instanceColor.setXYZ(i, on, on, on); ch = true; });
      if (ch) c.lm.instanceColor.needsUpdate = true;
      for (const d of c.doors) if (d.opening || d.hinges) { const want = d.opening ? -1.3 : 0; for (const h of d.hinges) h.rotation.y += (want - h.rotation.y) * Math.min(1, dt * 6); }
      for (const q of c.glitches) { q.m.material.color.setHSL(Math.random(), 1, 0.5); q.m.material.opacity = 0.4 + Math.random() * 0.6; q.m.position.y = (Math.random() - 0.5) * 0.15; if (!trans && P.alive && Math.hypot(P.x - q.x, P.z - q.z) < 1.4) { let n = Math.floor(Math.random() * NLEV); if (n === cur.n) n = (n + 7) % NLEV; goLevel(n, 'glitch'); } }
    }
    if (cur.extra === 'water') { water.visible = true; water.position.set(Math.round(P.x / 8) * 8, 0.08, Math.round(P.z / 8) * 8); water.material.map.offset.set(t * 0.01, t * 0.013); } else water.visible = false;
    ambient(dt);
    if (P.alive && Math.random() < dt * 0.4 && cur.dark) L.msg('🔦 Es ist stockdunkel … nur dein Licht hilft dir.', 2000);
  };
  // Licht, Nebel, Kamera
  const oue = L.updateEnv;
  L.updateEnv = function (dt, cam, focus, paused) {
    oue(dt, cam, focus, paused);
    const on = !!(cur && cam && L.inBack(cam.position.x) && cam.position.y < 60);
    hum(on && !L.paused);
    if (!on) { pl.intensity = 0; return; }
    const E = L.env, D = cur, t = performance.now() / 1000;
    const flick = D.flick > 0.2 && Math.sin(t * 13) + Math.sin(t * 37) > 1.75 ? 0.6 : 1;
    L.scene.background.set(D.fog); L.scene.fog.color.set(D.fog); L.scene.fog.near = 1.5; L.scene.fog.far = D.fogFar;
    if (E.stars) E.stars.material.opacity = 0; if (E.sunDisc) E.sunDisc.material.opacity = 0; if (E.moon) E.moon.material.opacity = 0;
    if (E.milky) E.milky.material.opacity = 0; if (E.planets) E.planets.visible = false; if (E.rainMesh) E.rainMesh.visible = false;
    E.sun.intensity = 0; E.hemi.intensity = D.hemi * flick; E.hemi.color.set(D.light); E.hemi.groundColor.set(D.fc);
    if (L.ambient && L.ambient.set) L.ambient.set(0, 0);
    pl.color.set(D.light); pl.intensity = (D.dark ? 1.6 : 0.55) * flick; pl.position.set(cam.position.x, Math.min(cam.position.y + 0.3, D.H - 0.2), cam.position.z);
    if (cam.position.y > D.H - 0.3) cam.position.y = D.H - 0.3;
    cam.far = D.fogFar + 40; cam.near = 0.1; cam.updateProjectionMatrix();
  };
  L.clearBackrooms = function () { disposeAll(); spawnedItems.clear(); trans = null; fade.style.opacity = '0'; L.backLeft(); hum(false); };
})();
