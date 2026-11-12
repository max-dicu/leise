'use strict';
// Die Spielwelt: Karte, Gebäude, Kollision, Tag/Nacht und Wetter
(function () {
  const L = window.L, T = THREE;
  const HALF = L.HALF = 1500;
  const R = L.mulberry(20261111);
  const rr = (a, b) => a + R() * (b - a);
  const rpick = (a) => a[Math.floor(R() * a.length)];

  L.POIS = [
    { id: 'stadt', name: 'Altheim (Stadt)', x: 0, z: 0, r: 390, icon: '🏙️' },
    { id: 'krankenhaus', name: 'Krankenhaus', x: 114, z: -114, r: 32, icon: '🏥', sub: true },
    { id: 'polizei', name: 'Polizeiwache', x: -114, z: 114, r: 32, icon: '🚓', sub: true },
    { id: 'supermarkt', name: 'Supermarkt', x: 190, z: 190, r: 32, icon: '🛒', sub: true },
    { id: 'militaer', name: 'Militärbasis Graufels', x: 950, z: -900, r: 170, icon: '🪖' },
    { id: 'hof', name: 'Birkenhof', x: -950, z: 750, r: 150, icon: '🚜' },
    { id: 'tanke1', name: 'Tankstelle Ost', x: 700, z: -35, r: 40, icon: '⛽' },
    { id: 'tanke2', name: 'Tankstelle Süd', x: -35, z: 800, r: 40, icon: '⛽' },
    { id: 'wald', name: 'Dunkelforst', x: -850, z: -850, r: 380, icon: '🌲' },
    { id: 'bunker', name: 'Bunker 7', x: -1100, z: -1070, r: 30, icon: '🔒', sub: true },
    { id: 'dorf', name: 'Kleinfeld (Dorf)', x: -1100, z: -150, r: 140, icon: '🏘️' },
    { id: 'funk', name: 'Funkstation Hochberg', x: 1100, z: 500, r: 60, icon: '📡' },
    { id: 'krater', name: 'Absturzkrater', x: 380, z: 1050, r: 90, icon: '☄️' },
    { id: 'camping', name: 'Campingplatz Seeblick', x: -450, z: 1180, r: 110, icon: '⛺' },
    { id: 'windpark', name: 'Windpark', x: 1180, z: 1150, r: 200, icon: '🌀' },
    { id: 'sperre', name: 'Autobahnsperre Nord', x: 0, z: -1485, r: 30, icon: '🚧', sub: true }
  ];
  L.poiAt = function (x, z) {
    for (const p of L.POIS) if (p.sub && L.dist(x, z, p.x, p.z) < p.r) return p.id;
    let best = null, bd = 1e9;
    for (const p of L.POIS) { if (p.sub) continue; const d = L.dist(x, z, p.x, p.z); if (d < p.r && d < bd) { bd = d; best = p.id; } }
    return best || 'land';
  };
  L.fields = [{ x1: -1180, z1: 560, x2: -990, z2: 940 }, { x1: -900, z1: 830, x2: -760, z2: 990 }, { x1: -300, z1: -700, x2: -150, z2: -480 }];
  L.lake = { x1: -600, z1: 1270, x2: -300, z2: 1410 };

  // ---------- Kollision (Raster aus Rechtecken) ----------
  const CELL = 32, grid = new Map();
  let qid = 0;
  const ck = (cx, cz) => (cx + 200) * 1000 + (cz + 200);
  L.addBox = function (x1, z1, x2, z2, h, kind) {
    const b = { x1: Math.min(x1, x2), x2: Math.max(x1, x2), z1: Math.min(z1, z2), z2: Math.max(z1, z2), h, kind: kind || 'b', on: true, _q: 0 };
    for (let cx = Math.floor(b.x1 / CELL); cx <= Math.floor(b.x2 / CELL); cx++)
      for (let cz = Math.floor(b.z1 / CELL); cz <= Math.floor(b.z2 / CELL); cz++) {
        const k = ck(cx, cz); let a = grid.get(k);
        if (!a) { a = []; grid.set(k, a); }
        a.push(b);
      }
    return b;
  };
  const qbuf = [];
  L.queryBoxes = function (x, z, r) {
    qid++; qbuf.length = 0;
    for (let cx = Math.floor((x - r) / CELL); cx <= Math.floor((x + r) / CELL); cx++)
      for (let cz = Math.floor((z - r) / CELL); cz <= Math.floor((z + r) / CELL); cz++) {
        const a = grid.get(ck(cx, cz)); if (!a) continue;
        for (const b of a) {
          if (b._q === qid || !b.on) continue;
          b._q = qid;
          if (x + r < b.x1 || x - r > b.x2 || z + r < b.z1 || z - r > b.z2) continue;
          qbuf.push(b);
        }
      }
    return qbuf;
  };
  // schiebt einen Kreis aus allen Hindernissen heraus
  L.collide = function (x, z, r, y, res) {
    res.x = x; res.z = z; res.hit = false; res.nx = 0; res.nz = 0;
    const list = L.queryBoxes(x, z, r + 0.5).slice();
    for (let pass = 0; pass < 2; pass++) for (const b of list) {
      if (y !== undefined && b.h < y + 0.35) continue;
      const cx = L.clamp(res.x, b.x1, b.x2), cz = L.clamp(res.z, b.z1, b.z2);
      let dx = res.x - cx, dz = res.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      if (d2 > 1e-8) {
        const d = Math.sqrt(d2), p = r - d; dx /= d; dz /= d;
        res.x += dx * p; res.z += dz * p; res.nx = dx; res.nz = dz;
      } else {
        const l = res.x - b.x1, rt = b.x2 - res.x, tp = res.z - b.z1, bt = b.z2 - res.z, m = Math.min(l, rt, tp, bt);
        if (m === l) { res.x = b.x1 - r; res.nx = -1; res.nz = 0; }
        else if (m === rt) { res.x = b.x2 + r; res.nx = 1; res.nz = 0; }
        else if (m === tp) { res.z = b.z1 - r; res.nz = -1; res.nx = 0; }
        else { res.z = b.z2 + r; res.nz = 1; res.nx = 0; }
      }
      res.hit = true; res.box = b;
    }
    return res;
  };
  L.blockedAt = function (x, y, z) {
    const l = L.queryBoxes(x, z, 0.05);
    for (const b of l) if (y < b.h && x >= b.x1 && x <= b.x2 && z >= b.z1 && z <= b.z2) return true;
    return false;
  };
  // Sichtlinie (wird durch Gebäude unterbrochen)
  L.los = function (ax, ay, az, bx, by, bz) {
    const d = Math.hypot(bx - ax, by - ay, bz - az), n = Math.ceil(d / 2.5);
    for (let i = 1; i < n; i++) {
      const t = i / n;
      if (L.blockedAt(ax + (bx - ax) * t, ay + (by - ay) * t, az + (bz - az) * t)) return false;
    }
    return true;
  };
  L.gateOpen = false;
  L.clampWorld = function (o) {
    const lim = HALF - 3;
    o.x = L.clamp(o.x, -lim, lim);
    if (L.gateOpen && Math.abs(o.x) < 7) o.z = L.clamp(o.z, -HALF - 30, lim);
    else o.z = L.clamp(o.z, -lim, lim);
  };

  // ---------- Straßen ----------
  L.roads = [];
  function road(x1, z1, x2, z2, w, hw) {
    const r = { w, hw: !!hw };
    if (z1 === z2) { r.dir = 'x'; r.rx1 = Math.min(x1, x2); r.rx2 = Math.max(x1, x2); r.rz1 = z1 - w / 2; r.rz2 = z1 + w / 2; }
    else { r.dir = 'z'; r.rz1 = Math.min(z1, z2); r.rz2 = Math.max(z1, z2); r.rx1 = x1 - w / 2; r.rx2 = x1 + w / 2; }
    L.roads.push(r);
  }
  road(-HALF, 0, HALF, 0, 14, true);
  road(0, -HALF, 0, HALF, 14, true);
  for (let i = -5; i <= 5; i++) { if (i === 0) continue; const p = i * 76; road(p, -380, p, 380, 10); road(-380, p, 380, p, 10); }
  road(950, 0, 950, -745, 9);
  road(-950, 0, -950, 700, 9);
  road(-1100, 0, -1100, -1052, 9);
  road(0, 500, 1078, 500, 9);
  road(380, 380, 380, 1005, 9);
  road(-470, 1150, 1180, 1150, 9);
  L.onRoad = function (x, z) {
    for (const r of L.roads) if (x >= r.rx1 && x <= r.rx2 && z >= r.rz1 && z <= r.rz2) return true;
    return false;
  };
  L.free = function (x, z, r) {
    if (Math.abs(x) > HALF - 12 || Math.abs(z) > HALF - 12) return false;
    if (L.onRoad(x, z)) return false;
    if (x > L.lake.x1 - 3 && x < L.lake.x2 + 3 && z > L.lake.z1 - 3 && z < L.lake.z2 + 3) return false;
    return L.queryBoxes(x, z, r).length === 0;
  };

  // ---------- Materialien ----------
  const matCache = {};
  L.mat = function (color, o) {
    const key = color + '|' + (o ? JSON.stringify(o) : '');
    if (matCache[key]) return matCache[key];
    let m;
    if (o && o.basic) {
      m = new T.MeshBasicMaterial({ color, transparent: !!(o.opacity || o.add), opacity: o.opacity || 1, side: o.double ? T.DoubleSide : T.FrontSide });
      if (o.add) { m.blending = T.AdditiveBlending; m.depthWrite = false; }
    } else if (o && o.metal !== undefined) {
      m = new T.MeshStandardMaterial({ color, metalness: o.metal, roughness: o.rough || 0.5, emissive: o.emissive || 0x000000 });
    } else {
      m = new T.MeshLambertMaterial({ color });
      if (o && o.emissive) { m.emissive = new T.Color(o.emissive); m.emissiveIntensity = o.ei || 1; }
      if (o && o.opacity) { m.transparent = true; m.opacity = o.opacity; }
      if (o && o.double) m.side = T.DoubleSide;
    }
    matCache[key] = m;
    return m;
  };
  L.GEO = {
    box: new T.BoxGeometry(1, 1, 1),
    boxB: new T.BoxGeometry(1, 1, 1).translate(0, 0.5, 0),
    sph: new T.SphereGeometry(1, 14, 10),
    cyl: new T.CylinderGeometry(1, 1, 1, 12),
    cylB: new T.CylinderGeometry(1, 1, 1, 12).translate(0, 0.5, 0),
    cone: new T.ConeGeometry(1, 1, 10)
  };
  function mesh(geo, color, sx, sy, sz, x, y, z, o) {
    const m = new T.Mesh(geo, L.mat(color, o));
    m.scale.set(sx, sy, sz); m.position.set(x, y, z);
    m.castShadow = !(o && o.noShadow); m.receiveShadow = true;
    L.scene.add(m);
    return m;
  }
  L.textTex = function (text, w, h, bg, fg, font) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.fillStyle = fg; g.font = font || `bold ${Math.floor(h * 0.6)}px Arial`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, w / 2, h / 2 + 2);
    const t = new T.CanvasTexture(c);
    return t;
  };
  function sign(text, x, y, z, w, h, ry, bg, fg) {
    const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshLambertMaterial({ map: L.textTex(text, 512, Math.round(512 * h / w), bg || '#1b1b1b', fg || '#e8e2cc'), side: T.DoubleSide }));
    m.position.set(x, y, z); m.rotation.y = ry || 0;
    L.scene.add(m);
    return m;
  }

  // ---------- Sammellisten für Instanzen ----------
  const inst = { low: [], mid: [], tall: [], roof: [], pine: [], pineTrunk: [], leafy: [], leafTrunk: [], wreck: [], wreckTop: [], fence: [], lampPole: [], lampHead: [], bale: [] };
  L.mapRects = [];
  L.lootSpots = [];
  L.vehSpots = [];
  L.spawnSpots = [];
  L.animated = [];
  L.interact = {};

  function lootAround(x, z, w, d, n, poi) {
    for (let i = 0; i < n; i++) {
      const side = Math.floor(R() * 4);
      let lx = x, lz = z;
      if (side === 0) { lx = x + rr(-w / 2, w / 2); lz = z - d / 2 - 1.6; }
      else if (side === 1) { lx = x + rr(-w / 2, w / 2); lz = z + d / 2 + 1.6; }
      else if (side === 2) { lx = x - w / 2 - 1.6; lz = z + rr(-d / 2, d / 2); }
      else { lx = x + w / 2 + 1.6; lz = z + rr(-d / 2, d / 2); }
      L.lootSpots.push({ x: lx, z: lz, poi: poi || L.poiAt(lx, lz) });
    }
  }
  function building(x, z, w, d, h, color, o) {
    o = o || {};
    const cls = h < 10 ? 'low' : h < 28 ? 'mid' : 'tall';
    inst[cls].push({ x, z, w, d, h, color });
    L.addBox(x - w / 2, z - d / 2, x + w / 2, z + d / 2, h, 'building');
    L.mapRects.push({ x, z, w, d, c: o.mapC || '#3b3b40' });
    if (o.roof) inst.roof.push({ x, y: h, z, w: w + 0.6, h: o.roofH || Math.min(w, d) * 0.45, d: d + 0.6, color: o.roof });
    if (o.loot !== 0) lootAround(x, z, w, d, o.loot || 2, o.poi);
  }
  function house(x, z, poi) {
    const w = rr(9, 13), d = rr(8, 12), h = rr(4.5, 7);
    building(x, z, w, d, h, rpick(['#d9cfb8', '#e6dccb', '#c9b79a', '#b9a58a', '#d4c4a8', '#a8b0a0', '#cfc0b0']), { roof: rpick(['#8a3b2a', '#6d3324', '#4b4b50', '#7a5532']), loot: 2, poi, mapC: '#5a4a40' });
  }

  // ---------- Bauabschnitte ----------

  // ---------- Der Turm: höchstes Gebäude der Stadt, einziger sicherer Ort vor den Monstern ----------
  // Innen (Erdgeschoss) kommt kein Monster hinein. Nur MAMA IVA kann ihn zerstören, wenn es drinnen zu laut ist.
  L.TOWER = { x: 38, z: 38, half: 12, h: 62 };
  L.inTower = (x, z, m) => { const T0 = L.TOWER, r = 10.8 + (m || 0); return Math.abs(x - T0.x) < r && Math.abs(z - T0.z) < r; };
  L.tower = { down: false, boxes: [], segs: [], group: null, fall: null };
  L.towerSafe = () => !L.tower.down;
  function buildTower() {
    const T0 = L.TOWER, cx = T0.x, cz = T0.z, H = T0.h, hf = T0.half, g = new T.Group(); L.scene.add(g); L.tower.group = g;
    const add = (seg, color, sx, sy, sz, x, y, z, o) => { const m = new T.Mesh(L.GEO.box, L.mat(color, o)); m.scale.set(sx, sy, sz); m.position.set(x, y, z); m.castShadow = !(o && o.basic); m.receiveShadow = true; seg.add(m); return m; };
    const floors = 8, fh = H / floors;
    for (let f = 0; f < floors; f++) {
      const seg = new T.Group(); seg.position.set(cx, f * fh, cz); g.add(seg);
      const y = fh / 2, wall = '#2c3542', glass = { emissive: '#ffd88a', ei: 0.5 };
      if (f === 0) {
        // Erdgeschoss mit großem Tor nach Süden
        add(seg, wall, hf * 2, fh, 0.8, 0, y, -hf + 0.4); add(seg, wall, 0.8, fh, hf * 2, -hf + 0.4, y, 0); add(seg, wall, 0.8, fh, hf * 2, hf - 0.4, y, 0);
        add(seg, wall, hf - 3, fh, 0.8, -(hf + 3) / 2, y, hf - 0.4); add(seg, wall, hf - 3, fh, 0.8, (hf + 3) / 2, y, hf - 0.4);
        add(seg, wall, 6, fh - 4.5, 0.8, 0, fh - (fh - 4.5) / 2, hf - 0.4);
        add(seg, '#6a7380', hf * 2 - 1.6, 0.1, hf * 2 - 1.6, 0, 0.05, 0);
        add(seg, '#fff2c0', 6, 0.15, 6, 0, fh - 0.3, 0, { basic: true });
        add(seg, '#2a8a3a', 6.4, 1.1, 0.2, 0, 5.2, hf + 0.05, { basic: true });
      } else {
        add(seg, wall, hf * 2, fh, hf * 2, 0, y, 0);
        for (const [sx, sz, x, z] of [[hf * 2 - 2, 0.1, 0, hf + 0.02], [hf * 2 - 2, 0.1, 0, -hf - 0.02], [0.1, hf * 2 - 2, hf + 0.02, 0], [0.1, hf * 2 - 2, -hf - 0.02, 0]])
          add(seg, '#3a4a5a', sx, fh * 0.55, sz, x, y, z, Math.random() < 0.5 ? glass : undefined);
      }
      add(seg, '#9aa4b0', hf * 2 + 0.6, 0.5, hf * 2 + 0.6, 0, fh, 0);
      L.tower.segs.push({ seg, y0: f * fh });
    }
    const top = new T.Group(); top.position.set(cx, H, cz); g.add(top);
    add(top, '#9aa4b0', 0.5, 9, 0.5, 0, 4.5, 0);
    add(top, '#ff2020', 1, 1, 1, 0, 9.3, 0, { basic: true });
    L.tower.segs.push({ seg: top, y0: H });
    // Kollision: Außenwände mit Tor
    const B = (x1, z1, x2, z2) => L.tower.boxes.push(L.addBox(cx + x1, cz + z1, cx + x2, cz + z2, H, 'building'));
    B(-hf, -hf, hf, -hf + 0.8); B(-hf, -hf, -hf + 0.8, hf); B(hf - 0.8, -hf, hf, hf); B(-hf, hf - 0.8, -3, hf); B(3, hf - 0.8, hf, hf);
    L.mapRects.push({ x: cx, z: cz, w: hf * 2, d: hf * 2, c: '#2a6ad0' });
    sign('TURM · SICHERER ORT', cx, 6.4, cz + hf + 0.12, 10, 1.4, 0, '#123', '#7cf');
  }
  L.towerDestroy = function () {
    const TW = L.tower; if (TW.down) return;
    TW.down = true;
    for (const b of TW.boxes) b.on = false;
    const T0 = L.TOWER;
    TW.fall = TW.segs.map((s, i) => ({ s, vx: L.rand(-3, 3), vz: L.rand(-3, 3), vy: 0, rx: L.rand(-0.5, 0.5), rz: L.rand(-0.5, 0.5), delay: (TW.segs.length - i) * 0.12 }));
    TW.fallT = 0;
    L.snd.explosion({ x: T0.x, y: 30, z: T0.z }); L.snd.stomp({ x: T0.x, y: 0, z: T0.z });
    L.shake = Math.max(L.shake, 1.4);
    L.banner('DER TURM STÜRZT EIN!', 'MAMA IVA hat dich gehört – lauf!');
    const P = L.player;
    if (P.alive && !P.gone && L.inTower(P.x, P.z, 1)) L.hurtPlayer(45 * (L.md ? L.md.dmg : 1), 'Vom einstürzenden Turm erschlagen');
  };
  L.towerRestore = function () {
    const TW = L.tower; if (!TW.group) return;
    TW.down = false; TW.fall = null; TW.group.visible = true;
    for (const b of TW.boxes) b.on = true;
    for (const s of TW.segs) { s.seg.position.set(L.TOWER.x, s.y0, L.TOWER.z); s.seg.rotation.set(0, 0, 0); s.seg.visible = true; }
  };
  L.updateTower = function (dt) {
    const TW = L.tower; if (!TW.fall) return;
    TW.fallT += dt;
    const T0 = L.TOWER;
    for (const f of TW.fall) {
      if (TW.fallT < f.delay) continue;
      const p = f.s.seg.position;
      f.vy -= 14 * dt; p.x += f.vx * dt; p.z += f.vz * dt; p.y += f.vy * dt;
      f.s.seg.rotation.x += f.rx * dt; f.s.seg.rotation.z += f.rz * dt;
      if (p.y < -12) f.s.seg.visible = false;
    }
    if (Math.random() < dt * 30 && TW.fallT < 5) L.fx(Math.random() < 0.5 ? '#8a8378' : '#5a554e', T0.x + L.rand(-16, 16), L.rand(1, 25), T0.z + L.rand(-16, 16), 3, 8, { size: 1.2, life: 2.5 });
    if (TW.fallT > 6) { TW.fall = null; TW.group.visible = false; }
  };
  function buildCity() {
    const specials = {
      '6,3': () => { building(114, -114, 52, 40, 22, '#e3e1da', { loot: 7, poi: 'krankenhaus', mapC: '#c95050' }); sign('KRANKENHAUS', 114, 16, -114 + 20.3, 22, 4, 0, '#b02020', '#ffffff'); },
      '3,6': () => { building(-114, 114, 42, 30, 12, '#5f7491', { loot: 7, poi: 'polizei', mapC: '#4060a0' }); sign('POLIZEI', -114, 9, 114 + 15.3, 14, 3, 0, '#1d3d70', '#ffffff'); },
      '7,7': () => { building(190, 190, 50, 34, 8, '#c9c2b0', { loot: 8, poi: 'supermarkt', mapC: '#60a060' }); sign('SUPERMARKT', 190, 6, 190 + 17.3, 20, 3, 0, '#2f7a3a', '#ffffff'); },
      '5,5': () => buildTower(),
      '1,1': () => { for (let i = 0; i < 30; i++) inst_tree(-266 + rr(-28, 28), -266 + rr(-28, 28), true); L.lootSpots.push({ x: -266, z: -266, poi: 'stadt' }); }
    };
    for (let kx = 0; kx < 10; kx++) for (let kz = 0; kz < 10; kz++) {
      const cx = -342 + 76 * kx, cz = -342 + 76 * kz, key = kx + ',' + kz;
      if (specials[key]) { specials[key](); continue; }
      const dc = Math.hypot(cx, cz);
      for (const lx of [-1, 1]) for (const lz of [-1, 1]) {
        if (R() < 0.08) { const px = cx + lx * 15, pz = cz + lz * 15, py = R() < 0.5 ? 0 : Math.PI / 2; parked(px, pz, py, true); continue; }
        const w = rr(16, 26), d = rr(16, 26);
        const h = dc < 160 ? rr(24, 48) : dc < 290 ? rr(11, 30) : rr(6, 14);
        building(cx + lx * 15 + rr(-1.5, 1.5), cz + lz * 15 + rr(-1.5, 1.5), w, d, h,
          rpick(['#9a9890', '#b5ab9a', '#8f8a86', '#a39486', '#7d838a', '#c2b8a3', '#8a7f72', '#6f747a', '#a8a39a']), { loot: 2, poi: 'stadt' });
      }
    }
    // Straßenlaternen
    for (let i = -5; i <= 5; i++) for (let j = -9; j <= 9; j += 2) {
      const p = i * 76 + 6.5, q = j * 38;
      inst.lampPole.push({ x: p, y: 0, z: q, w: 0.18, h: 7, d: 0.18, color: '#2a2a2a' });
      inst.lampHead.push({ x: p - 0.8, y: 6.9, z: q, w: 1.6, h: 0.25, d: 0.5, color: '#ffe2a0' });
    }
    // Autos in der Stadt
    const civ = ['kleinwagen', 'limousine', 'kleinwagen', 'pickup', 'limousine', 'motorrad', 'roller', 'sportwagen'];
    for (let i = 0; i < 16; i++) {
      const lineI = rpick([-4, -3, -2, -1, 1, 2, 3, 4]) * 76, along = rr(-360, 360);
      if (R() < 0.5) L.vehSpots.push({ x: lineI + 2.5, z: along, yaw: R() < 0.5 ? 0 : Math.PI, type: civ[i % civ.length] });
      else L.vehSpots.push({ x: along, z: lineI + 2.5, yaw: R() < 0.5 ? Math.PI / 2 : -Math.PI / 2, type: civ[i % civ.length] });
    }
    // E-Roller
    L.vehSpots.push({ x: 78.5, z: -40, yaw: 0, type: 'joyort10' }, { x: -73.5, z: 30, yaw: Math.PI, type: 'joyort6e' },
      { x: 30, z: 154.5, yaw: Math.PI / 2, type: 'joyort10' }, { x: -200, z: -149.5, yaw: -Math.PI / 2, type: 'joyort6e' },
      { x: -470, z: 1157, yaw: Math.PI / 2, type: 'joyort10' }, { x: -1095, z: -60, yaw: 0, type: 'joyort6e' });
    L.vehSpots.push({ x: 175, z: 210, yaw: 0, type: 'sportwagen' }, { x: -100, z: 132, yaw: 0, type: 'limousine' }, { x: -126, z: 132, yaw: 0, type: 'motorrad' });
  }
  function buildVillage() {
    for (let z = -290; z <= -30; z += 27) {
      if (Math.abs(z + 150) < 20) continue;
      house(-1100 - 17 + rr(-2, 2), z, 'dorf');
      house(-1100 + 17 + rr(-2, 2), z + 10, 'dorf');
    }
    // Kirche
    building(-1140, -150, 14, 26, 11, '#d8d0c0', { roof: '#4b4b50', roofH: 7, loot: 2, poi: 'dorf' });
    building(-1140, -168, 6, 6, 26, '#d8d0c0', { loot: 0 });
    mesh(L.GEO.cone, '#3d3d42', 4.4, 9, 4.4, -1140, 30.5, -168);
    L.vehSpots.push({ x: -1095, z: -200, yaw: 0, type: 'kleinwagen' }, { x: -1105, z: -90, yaw: Math.PI, type: 'roller' });
    L.lootSpots.push({ x: -1122, z: -150, poi: 'dorf' });
  }
  function buildFarm() {
    building(-915, 745, 24, 16, 9, '#8b2f22', { roof: '#3a3a3a', roofH: 6, loot: 4, poi: 'hof', mapC: '#8b2f22' });
    sign('BIRKENHOF', -915, 7, 745 + 8.4, 9, 1.6, 0, '#e8dfc6', '#5a2a15');
    building(-985, 735, 12, 10, 6, '#e8e0cc', { roof: '#8a3b2a', loot: 3, poi: 'hof' });
    building(-950, 700, 10, 8, 4, '#7a6a52', { roof: '#3a3a3a', loot: 2, poi: 'hof' });
    mesh(L.GEO.cylB, '#b8b8b0', 4, 18, 4, -895, 0, 772);
    mesh(L.GEO.sph, '#a0a0a0', 4, 2.5, 4, -895, 18, 772);
    L.addBox(-899, 768, -891, 776, 20, 'building');
    for (let i = 0; i < 14; i++) {
      const x = rr(-1150, -1010), z = rr(600, 900);
      inst.bale.push({ x, y: 0.75, z, w: 1.5, h: 1.5, d: 1.5, color: '#c8a85a', ry: R() * 3 });
      L.addBox(x - 0.8, z - 0.8, x + 0.8, z + 0.8, 1.5, 'prop');
    }
    L.vehSpots.push({ x: -930, z: 715, yaw: 0, type: 'pickup' }, { x: -960, z: 765, yaw: 1.5, type: 'cross' });
  }
  function buildMilitary() {
    const x1 = 790, x2 = 1110, z1 = -1060, z2 = -740, gate = 950;
    fenceLine(x1, z1, x2, z1); fenceLine(x1, z1, x1, z2); fenceLine(x2, z1, x2, z2);
    fenceLine(x1, z2, gate - 8, z2); fenceLine(gate + 8, z2, x2, z2);
    L.addBox(x1, z1 - 0.3, x2, z1 + 0.3, 3, 'fence'); L.addBox(x1 - 0.3, z1, x1 + 0.3, z2, 3, 'fence');
    L.addBox(x2 - 0.3, z1, x2 + 0.3, z2, 3, 'fence');
    L.addBox(x1, z2 - 0.3, gate - 8, z2 + 0.3, 3, 'fence'); L.addBox(gate + 8, z2 - 0.3, x2, z2 + 0.3, 3, 'fence');
    sign('MILITÄRISCHER SICHERHEITSBEREICH', gate, 4.2, z2 + 0.5, 14, 1.6, 0, '#b02020', '#ffffff');
    // Hangars
    const hg = new T.CylinderGeometry(10, 10, 30, 18, 1, false, 0, Math.PI);
    for (const hx of [830, 870, 910]) {
      const m = new T.Mesh(hg, L.mat('#6b6f5e')); m.rotation.x = Math.PI / 2; m.rotation.z = Math.PI / 2;
      m.position.set(hx, 0, -1015); m.castShadow = true; m.receiveShadow = true; L.scene.add(m);
      L.addBox(hx - 10, -1030, hx + 10, -1000, 10, 'building');
      L.mapRects.push({ x: hx, z: -1015, w: 20, d: 30, c: '#4a5040' });
      lootAround(hx, -1015, 20, 30, 3, 'militaer');
    }
    for (const bz of [-1000, -965, -930]) building(1050, bz, 34, 11, 4.5, '#5d6449', { loot: 3, poi: 'militaer', mapC: '#4a5040' });
    for (let i = 0; i < 6; i++) {
      const tx = 840 + (i % 3) * 22, tz = -860 + Math.floor(i / 3) * 24;
      inst.roof.push({ x: tx, y: 0, z: tz, w: 8, h: 3.5, d: 10, color: '#56603f' });
      L.addBox(tx - 4, tz - 5, tx + 4, tz + 5, 3.5, 'prop');
      L.lootSpots.push({ x: tx, z: tz + 6.5, poi: 'militaer' });
    }
    // Kisten
    for (let i = 0; i < 12; i++) {
      const cx = 960 + (i % 4) * 3.2, cz = -905 + Math.floor(i / 4) * 3.2;
      mesh(L.GEO.boxB, '#5b5236', 2.4, 1.6 + (i % 3) * 0.8, 2.4, cx, 0, cz);
      L.addBox(cx - 1.2, cz - 1.2, cx + 1.2, cz + 1.2, 2, 'prop');
    }
    L.lootSpots.push({ x: 968, z: -893, poi: 'militaer' }, { x: 955, z: -900, poi: 'militaer' }, { x: 975, z: -880, poi: 'militaer' });
    // Wachtürme
    for (const [wx, wz] of [[800, -1050], [1100, -1050], [800, -750], [1100, -750]]) {
      for (const [ox, oz] of [[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]]) mesh(L.GEO.boxB, '#4a3d2a', 0.25, 9, 0.25, wx + ox, 0, wz + oz);
      mesh(L.GEO.boxB, '#5a4a32', 4, 2.4, 4, wx, 9, wz);
      mesh(L.GEO.boxB, '#3a3a3a', 4.6, 0.3, 4.6, wx, 11.4, wz);
      L.addBox(wx - 2, wz - 2, wx + 2, wz + 2, 11, 'prop');
    }
    // Hubschrauberlandeplatz mit kaputtem Hubschrauber
    helipad(1050, -810);
    const heli = L.buildHeli('#4a5240'); heli.root.position.set(1050, 0, -850); heli.root.rotation.set(0.05, 0.7, 0.25); L.scene.add(heli.root);
    L.addBox(1044, -856, 1056, -844, 3, 'prop');
    L.vehSpots.push({ x: 930, z: -790, yaw: 0, type: 'jeep' }, { x: 970, z: -790, yaw: 0, type: 'jeep' }, { x: 1000, z: -960, yaw: 1.57, type: 'jeep' }, { x: 990, z: -800, yaw: 3.1, type: 'motorrad' });
  }
  function helipad(x, z) {
    const m = new T.Mesh(new T.CircleGeometry(11, 32), new T.MeshLambertMaterial({ map: L.textTex('H', 256, 256, '#3a3a3c', '#e8e8e8', 'bold 190px Arial') }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, 0.05, z); m.receiveShadow = true; L.scene.add(m);
    L.mapRects.push({ x, z, w: 18, d: 18, c: '#555' });
  }
  function fenceLine(x1, z1, x2, z2) {
    const len = Math.hypot(x2 - x1, z2 - z1), n = Math.max(1, Math.round(len / 6));
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n, x = x1 + (x2 - x1) * t, z = z1 + (z2 - z1) * t;
      inst.fence.push({ x, y: 0, z, w: len / n, h: 3, d: 0.12, color: '#7d8288', ry: Math.atan2(-(z2 - z1), x2 - x1) });
    }
  }
  function buildGas(x, z, alongX, poi) {
    const cw = alongX ? 22 : 12, cd = alongX ? 12 : 22;
    mesh(L.GEO.boxB, '#e8e8e8', cw, 0.8, cd, x, 5, z);
    mesh(L.GEO.boxB, '#c0302a', cw + 0.2, 0.3, cd + 0.2, x, 5.4, z, { noShadow: true });
    for (const [ox, oz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const px = x + ox * (cw / 2 - 1), pz = z + oz * (cd / 2 - 1);
      mesh(L.GEO.boxB, '#cfcfcf', 0.5, 5, 0.5, px, 0, pz);
      L.addBox(px - 0.3, pz - 0.3, px + 0.3, pz + 0.3, 5, 'prop');
    }
    for (const o of [-4, 4]) {
      const px = alongX ? x + o : x, pz = alongX ? z : z + o;
      mesh(L.GEO.boxB, '#2f6db0', 1, 1.8, 0.7, px, 0, pz);
      L.addBox(px - 0.6, pz - 0.5, px + 0.6, pz + 0.5, 1.8, 'prop');
    }
    const sx = alongX ? x : x - 20, sz = alongX ? z - 20 : z;
    building(sx, sz, alongX ? 16 : 10, alongX ? 10 : 16, 4.5, '#d9d4c8', { loot: 6, poi, mapC: '#a05050' });
    sign('TANKE · SHOP', sx, 3.6, alongX ? sz + 5.3 : sz, 8, 1.4, alongX ? 0 : Math.PI / 2, '#c0302a', '#ffffff');
    mesh(L.GEO.boxB, '#888', 0.4, 9, 0.4, x + (alongX ? 13 : -8), 0, z + (alongX ? 8 : -13));
    sign('⛽ 1,89', x + (alongX ? 13 : -8), 9.5, z + (alongX ? 8 : -13), 3.5, 2.2, alongX ? 0 : Math.PI / 2, '#c0302a', '#ffffff');
    L.vehSpots.push({ x: alongX ? x - 4 : x - 3, z: alongX ? z + 3 : z - 4, yaw: alongX ? Math.PI / 2 : 0, type: rpick(['limousine', 'kleinwagen', 'pickup']) });
    L.vehSpots.push({ x: alongX ? x + 6 : x + 3, z: alongX ? z - 3 : z + 7, yaw: alongX ? -Math.PI / 2 : Math.PI, type: rpick(['motorrad', 'sportwagen', 'kleinwagen']) });
  }
  function buildBunker() {
    const mound = new T.Mesh(new T.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), L.mat('#3c5230'));
    mound.scale.set(16, 7, 14); mound.position.set(-1100, 0, -1083); mound.receiveShadow = true; mound.castShadow = true; L.scene.add(mound);
    L.addBox(-1114, -1096, -1086, -1070, 7, 'building');
    mesh(L.GEO.boxB, '#77756e', 9, 4.5, 5, -1100, 0, -1066);
    L.addBox(-1104.5, -1068.5, -1095.5, -1063.5, 4.5, 'building');
    const door = mesh(L.GEO.boxB, '#3b4045', 3.6, 3.1, 0.25, -1100, 0, -1063.45, { metal: 0.8, rough: 0.4 });
    sign('BUNKER 7', -1100, 3.8, -1063.4, 3.6, 0.6, 0, '#222', '#e0c040');
    const pad = mesh(L.GEO.box, '#1a1a1a', 0.5, 0.7, 0.12, -1097.3, 1.5, -1063.35);
    const led = mesh(L.GEO.box, '#ff2020', 0.12, 0.08, 0.05, -1097.3, 1.75, -1063.28, { basic: true });
    L.interact.bunker = { x: -1100, z: -1060.5, door, led, pad };
    L.mapRects.push({ x: -1100, z: -1078, w: 30, d: 28, c: '#2c3c25' });
  }
  function buildRadio() {
    building(1112, 488, 10, 8, 4, '#a9a59a', { loot: 3, poi: 'funk' });
    sign('FUNKSTATION', 1106.9, 3.2, 488, 6, 0.9, -Math.PI / 2, '#204070', '#ffffff');
    // Gittermast
    const tx = 1126, tz = 515, H = 60;
    for (const [ox, oz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const m = mesh(L.GEO.boxB, '#b04030', 0.25, H, 0.25, tx + ox * 1.6, 0, tz + oz * 1.6);
      m.rotation.set(oz * 0.012, 0, -ox * 0.012);
    }
    for (let y = 4; y < H; y += 6) {
      mesh(L.GEO.box, '#d8d8d8', 3.4, 0.15, 0.15, tx, y, tz - 1.55, { noShadow: true });
      mesh(L.GEO.box, '#d8d8d8', 3.4, 0.15, 0.15, tx, y, tz + 1.55, { noShadow: true });
      mesh(L.GEO.box, '#d8d8d8', 0.15, 0.15, 3.4, tx - 1.55, y, tz, { noShadow: true });
      mesh(L.GEO.box, '#d8d8d8', 0.15, 0.15, 3.4, tx + 1.55, y, tz, { noShadow: true });
    }
    L.addBox(tx - 2, tz - 2, tx + 2, tz + 2, H, 'building');
    const lamp = mesh(L.GEO.sph, '#ff2020', 0.5, 0.5, 0.5, tx, H + 0.5, tz, { basic: true });
    L.animated.push((t) => { lamp.visible = Math.sin(t * 3) > 0; });
    mesh(L.GEO.boxB, '#5a5a4a', 2, 1.6, 1.4, 1100, 0, 480);
    L.addBox(1099, 479.3, 1101, 480.7, 1.6, 'prop');
    helipad(1078, 528);
    L.interact.radio = { x: 1105.2, z: 488, pad: { x: 1078, z: 528 } };
    L.vehSpots.push({ x: 1090, z: 505, yaw: 0, type: 'jeep' });
  }
  function buildCrater() {
    const cx = 380, cz = 1050;
    const ring = new T.Mesh(new T.TorusGeometry(42, 9, 8, 40), L.mat('#3b2a1e'));
    ring.rotation.x = Math.PI / 2; ring.scale.set(1, 1, 0.35); ring.position.set(cx, 0, cz); ring.receiveShadow = true; L.scene.add(ring);
    const pod = mesh(L.GEO.cyl, '#2a2a30', 4.5, 12, 4.5, cx + 4, 4, cz - 3, { metal: 0.9, rough: 0.3 });
    pod.rotation.set(0.5, 0, 0.3);
    for (let i = 0; i < 4; i++) {
      const rg = mesh(L.GEO.cyl, '#50ff90', 4.7, 0.3, 4.7, 0, -4.5 + i * 3, 0, { basic: true, noShadow: true });
      pod.add(rg); rg.scale.set(1.04, 0.025, 1.04); rg.position.set(0, -0.35 + i * 0.25, 0);
    }
    L.addBox(cx - 2, cz - 8, cx + 10, cz + 3, 9, 'prop');
    for (let i = 0; i < 25; i++) {
      const a = R() * 6.28, d = rr(12, 50), s = rr(0.6, 2.4);
      const m = mesh(L.GEO.box, rpick(['#2a2a30', '#4a3a2a', '#303a30']), s, s * 0.6, s * 1.3, cx + Math.cos(a) * d, s * 0.25, cz + Math.sin(a) * d, { metal: 0.6, rough: 0.6 });
      m.rotation.set(R(), R() * 3, R());
    }
    for (let i = 0; i < 5; i++) { const a = R() * 6.28, d = rr(10, 40); L.lootSpots.push({ x: cx + Math.cos(a) * d, z: cz + Math.sin(a) * d, poi: 'krater' }); }
    L.mapRects.push({ x: cx, z: cz, w: 20, d: 20, c: '#40ff80' });
  }
  function buildCamping() {
    const lk = L.lake;
    const water = new T.Mesh(new T.PlaneGeometry(lk.x2 - lk.x1, lk.z2 - lk.z1), new T.MeshPhongMaterial({ color: '#2d5f7a', shininess: 80, transparent: true, opacity: 0.88 }));
    water.rotation.x = -Math.PI / 2; water.position.set((lk.x1 + lk.x2) / 2, 0.08, (lk.z1 + lk.z2) / 2); L.scene.add(water);
    L.addBox(lk.x1, lk.z1, lk.x2, lk.z2, 0.9, 'water');
    for (let i = 0; i < 10; i++) {
      const x = -540 + (i % 5) * 35 + rr(-4, 4), z = i < 5 ? 1185 : 1215 + rr(0, 10);
      if (i % 3 === 0) {
        building(x, z, 3, 7, 2.8, '#eeeeea', { loot: 2, poi: 'camping', mapC: '#888' });
      } else {
        const tent = mesh(L.GEO.cone, rpick(['#c04a2a', '#2a6ac0', '#3a8a3a', '#d0a020']), 2.6, 2.4, 2.6, x, 1.2, z);
        tent.geometry = new T.ConeGeometry(1, 1, 4); tent.rotation.y = 0.78;
        L.addBox(x - 1.5, z - 1.5, x + 1.5, z + 1.5, 2.4, 'prop');
        L.lootSpots.push({ x: x + 2.5, z, poi: 'camping' });
      }
    }
    // Lagerfeuer
    const fire = mesh(L.GEO.cone, '#ff8a20', 0.6, 1.1, 0.6, -450, 0.55, 1200, { basic: true, noShadow: true });
    L.animated.push((t) => { fire.scale.y = 1 + Math.sin(t * 13) * 0.15 + Math.sin(t * 7.3) * 0.1; });
    building(-410, 1235, 14, 9, 4, '#8a6a4a', { roof: '#4a3020', loot: 4, poi: 'camping' });
    sign('CAMPING SEEBLICK', -410, 3.2, 1230.4, 8, 1.3, 0, '#2a5a2a', '#f0ead0');
    mesh(L.GEO.boxB, '#6a4a2a', 3, 0.4, 18, -450, 0.3, 1278);
    L.vehSpots.push({ x: -500, z: 1157, yaw: Math.PI / 2, type: 'limousine' }, { x: -420, z: 1157, yaw: -Math.PI / 2, type: 'roller' });
  }
  function buildWindpark() {
    for (const [x, z] of [[1050, 1080], [1170, 1060], [1300, 1100], [1080, 1240], [1210, 1250], [1340, 1270]]) {
      mesh(L.GEO.cylB, '#e8e8e8', 1.6, 70, 1.6, x, 0, z);
      L.addBox(x - 1.7, z - 1.7, x + 1.7, z + 1.7, 70, 'building');
      mesh(L.GEO.box, '#dcdcdc', 2.4, 2.4, 6, x, 71, z);
      const hub = new T.Group(); hub.position.set(x, 71, z + 3.2); L.scene.add(hub);
      for (let i = 0; i < 3; i++) {
        const b = new T.Mesh(L.GEO.box, L.mat('#f0f0f0')); b.scale.set(1.2, 26, 0.3); b.position.y = 13;
        const p = new T.Group(); p.rotation.z = i * Math.PI * 2 / 3; p.add(b); hub.add(p); b.castShadow = true;
      }
      const sp = 0.4 + R() * 0.3;
      L.animated.push((t) => { hub.rotation.z = t * sp; });
      L.mapRects.push({ x, z, w: 5, d: 5, c: '#ddd' });
    }
    building(1150, 1120, 8, 6, 3.5, '#9a9a90', { loot: 3, poi: 'windpark' });
    L.vehSpots.push({ x: 1165, z: 1140, yaw: 0, type: 'pickup' });
  }
  function buildSperre() {
    const gate = mesh(L.GEO.boxB, '#d8b020', 14, 1.4, 0.6, 0, 0, -1494);
    const stripe = new T.Mesh(L.GEO.boxB, L.mat('#1a1a1a')); stripe.scale.set(0.15, 1.02, 1.05); gate.add(stripe);
    for (let i = -3; i <= 3; i++) { const s = new T.Mesh(L.GEO.boxB, L.mat('#1a1a1a')); s.scale.set(0.07, 1.02, 1.04); s.position.x = i * 0.14; gate.add(s); }
    const gbox = L.addBox(-7, -1494.4, 7, -1493.6, 1.4, 'gate');
    for (const x of [-10, 10]) { mesh(L.GEO.boxB, '#9a9a96', 6, 1.1, 1.2, x, 0, -1480); L.addBox(x - 3, -1480.6, x + 3, -1479.4, 1.1, 'prop'); }
    building(15, -1486, 4, 4, 3, '#b8b8b0', { loot: 2, poi: 'sperre' });
    const btn = mesh(L.GEO.box, '#e02020', 0.4, 0.4, 0.2, 12.9, 1.4, -1486, { basic: true });
    sign('SPERRZONE · KEIN DURCHGANG', 0, 4.5, -1490, 16, 1.8, 0, '#b02020', '#ffffff');
    mesh(L.GEO.boxB, '#555', 0.3, 4, 0.3, -8, 0, -1490); mesh(L.GEO.boxB, '#555', 0.3, 4, 0.3, 8, 0, -1490);
    L.interact.gate = { x: 12, z: -1486, gate, gbox, btn };
  }
  // ---------- Bergkette am Kartenrand (hinter diesen Bergen kann MAMA IVA auftauchen) ----------
  L.mountains = [];
  function buildMountains() {
    for (const [x, z, r, h] of [[-1360, 600, 95, 58], [1370, -470, 100, 62], [600, -1370, 95, 55], [-850, 1390, 90, 52], [1385, 200, 85, 50]]) {
      const geo = new T.ConeGeometry(r, h, 28, 7);
      geo.translate(0, h / 2, 0);
      const pos = geo.attributes.position, cols = [];
      for (let i = 0; i < pos.count; i++) {
        const vx = pos.getX(i), vy = pos.getY(i), vz = pos.getZ(i);
        // zerklüftete Felsen: Seiten etwas verbeulen (Spitze und Fuß bleiben)
        if (vy > 1 && vy < h - 1) {
          const n = (L.noise2(vx * 0.08 + x, vz * 0.08 + z) - 0.5) * 18;
          const f = 1 + n / Math.max(10, Math.hypot(vx, vz));
          pos.setX(i, vx * f); pos.setZ(i, vz * f); pos.setY(i, vy + n * 0.3);
        }
        const yy = pos.getY(i), snow = yy > h * 0.72;
        const g = 0.38 + L.noise2(vx * 0.2, vz * 0.2) * 0.12;
        if (snow) cols.push(0.92, 0.94, 0.97); else cols.push(g * 1.05, g, g * 0.88);
      }
      geo.setAttribute('color', new T.Float32BufferAttribute(cols, 3));
      geo.computeVertexNormals();
      const m = new T.Mesh(geo, new T.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
      m.position.set(x, 0, z); m.castShadow = true; m.receiveShadow = true;
      L.scene.add(m);
      const c = r * 0.8;
      L.addBox(x - c, z - c, x + c, z + c, h, 'building');
      L.mapRects.push({ x, z, w: r * 1.7, d: r * 1.7, c: '#7a7468' });
      L.mountains.push({ x, z, r, h });
    }
  }
  // Höhe der Berge an einer Stelle (0 = flacher Boden)
  L.mountainH = function (x, z) {
    let best = 0;
    for (const m of L.mountains) { const d = Math.hypot(x - m.x, z - m.z); if (d < m.r) best = Math.max(best, m.h * (1 - d / m.r)); }
    return best;
  };

  function scatteredHouses() {
    const country = L.roads.filter((r) => r.rx2 - r.rx1 > 300 || r.rz2 - r.rz1 > 300);
    let placed = 0, tries = 0;
    while (placed < 26 && tries++ < 600) {
      const r = rpick(country);
      const x = r.dir === 'x' ? rr(r.rx1, r.rx2) : (r.rx1 + r.rx2) / 2 + (R() < 0.5 ? -1 : 1) * rr(16, 30);
      const z = r.dir === 'z' ? rr(r.rz1, r.rz2) : (r.rz1 + r.rz2) / 2 + (R() < 0.5 ? -1 : 1) * rr(16, 30);
      if (L.poiAt(x, z) !== 'land' && L.poiAt(x, z) !== 'wald') continue;
      if (!L.free(x, z, 14)) continue;
      house(x, z, 'land');
      if (R() < 0.4) L.vehSpots.push({ x: x + 9, z: z + 2, yaw: R() * 6, type: rpick(['kleinwagen', 'pickup', 'limousine', 'cross']) });
      placed++;
    }
  }
  function perimeter() {
    const e = HALF - 1.5;
    fenceLine(-HALF, -e, -8, -e); fenceLine(8, -e, HALF, -e);
    fenceLine(-HALF, e, HALF, e); fenceLine(-e, -HALF, -e, HALF); fenceLine(e, -HALF, e, HALF);
  }
  function wreck(x, z, ry) {
    ry = ry === undefined ? (R() < 0.5 ? 0 : Math.PI / 2) + rr(-0.15, 0.15) : ry;
    // ausgebrannt: verkohlt/rostig, platte Reifen (tief), Dach eingedrückt
    const c = rpick(['#2a2420', '#3a2a20', '#4a2e1e', '#1e1c1a', '#5a3420']);
    inst.wreck.push({ x, y: 0.25, z, w: 1.9, h: 0.75, d: 4.3, color: c, ry });
    inst.wreckTop.push({ x, y: 0.95, z, w: 1.7, h: 0.4, d: 2.1, color: '#141210', ry });
    const along = Math.abs(Math.sin(ry)) > 0.7;
    L.addBox(x - (along ? 2.2 : 1), z - (along ? 1 : 2.2), x + (along ? 2.2 : 1), z + (along ? 1 : 2.2), 1.6, 'wreck');
  }
  // Verlassene Fahrzeuge auf den Straßen – alle fahrbar (manche schon beschädigt)
  const CIVIL = ['kleinwagen', 'limousine', 'kleinwagen', 'pickup', 'sportwagen', 'motorrad', 'cross', 'roller', 'limousine', 'kleinwagen', 'pickup'];
  function parked(x, z, yaw, worn, type, gap) {
    gap = gap || 7;
    for (const s of L.vehSpots) if (Math.abs(s.x - x) < gap && Math.abs(s.z - z) < gap) return false;
    L.vehSpots.push({ x, z, yaw, type: type || rpick(CIVIL), worn });
    return true;
  }
  // Viele zusätzliche E-Roller und Motorräder (Gehwege in der Stadt und bei allen Orten)
  function extraBikes() {
    const types = ['joyort10', 'joyort6e', 'joyort10', 'joyort6e', 'motorrad', 'cross', 'joyort10', 'joyort6e', 'motorrad', 'cross'];
    let placed = 0, tries = 0;
    while (placed < 90 && tries++ < 3000) {
      let x, z;
      if (R() < 0.5) {
        const line = rpick([-5, -4, -3, -2, -1, 1, 2, 3, 4, 5]) * 76 + (R() < 0.5 ? -6.8 : 6.8), along = rr(-370, 370);
        if (R() < 0.5) { x = line; z = along; } else { x = along; z = line; }
      } else {
        const p = rpick(L.POIS.filter((q) => q.id !== 'wald' && q.id !== 'stadt'));
        x = p.x + rr(-p.r, p.r) * 0.8; z = p.z + rr(-p.r, p.r) * 0.8;
      }
      if (Math.abs(x) > HALF - 20 || Math.abs(z) > HALF - 20) continue;
      if (L.queryBoxes(x, z, 1.6).length) continue;
      if (x > L.lake.x1 - 3 && x < L.lake.x2 + 3 && z > L.lake.z1 - 3 && z < L.lake.z2 + 3) continue;
      if (parked(x, z, R() * Math.PI * 2, R() < 0.5, types[placed % types.length], 3)) placed++;
    }
  }
  function wrecks() {
    for (let i = 0; i < 90; i++) {
      const r = rpick(L.roads), len = Math.max(r.rx2 - r.rx1, r.rz2 - r.rz1);
      if (len < 50) continue;
      const lane = rr(-r.w * 0.3, r.w * 0.3);
      const x = r.dir === 'x' ? rr(r.rx1 + 10, r.rx2 - 10) : (r.rx1 + r.rx2) / 2 + lane;
      const z = r.dir === 'z' ? rr(r.rz1 + 10, r.rz2 - 10) : (r.rz1 + r.rz2) / 2 + lane;
      if (Math.abs(x) < 15 && z < -1440) continue;
      if (L.queryBoxes(x, z, 5).length) continue;
      const yaw = (r.dir === 'x' ? Math.PI / 2 : 0) + (R() < 0.5 ? Math.PI : 0) + rr(-0.25, 0.25);
      parked(x, z, yaw, true);
    }
  }
  function inst_tree(x, z, leafy) {
    if (!L.free(x, z, 1.2)) return false;
    if (leafy) {
      const h = rr(3, 4.5), s = rr(2.4, 4);
      inst.leafTrunk.push({ x, y: 0, z, w: 1, h, d: 1, color: '#4a3524' });
      inst.leafy.push({ x, y: h + s * 0.6, z, w: s, h: s * 0.9, d: s, color: rpick(['#3c6a2a', '#4a7a30', '#2f5a24', '#557f35']), ry: R() * 3 });
    } else {
      const h = rr(7, 15), s = rr(1.8, 3.2);
      inst.pineTrunk.push({ x, y: 0, z, w: 1, h: 2.5, d: 1, color: '#3d2a1c' });
      inst.pine.push({ x, y: 2, z, w: s, h, d: s, color: rpick(['#1f4220', '#24502a', '#1a3a1c', '#2b5530']), ry: R() * 3 });
    }
    L.addBox(x - 0.4, z - 0.4, x + 0.4, z + 0.4, 12, 'tree');
    return true;
  }
  function trees() {
    for (let i = 0; i < 4200; i++) {
      const a = R() * 6.28, d = Math.sqrt(R()) * 400;
      const x = -850 + Math.cos(a) * d, z = -850 + Math.sin(a) * d;
      if (Math.hypot(x + 1100, z + 1070) < 40) continue;
      inst_tree(x, z, R() < 0.12);
    }
    for (let i = 0; i < 2600; i++) {
      const x = rr(-HALF + 15, HALF - 15), z = rr(-HALF + 15, HALF - 15);
      const p = L.poiAt(x, z);
      if (p !== 'land') continue;
      if (Math.max(Math.abs(x), Math.abs(z)) < 420) continue;
      inst_tree(x, z, R() < 0.55);
    }
    // Waldstücke verteilt
    for (const [fx, fz, fr] of [[600, -600, 120], [-500, 500, 110], [700, 800, 90], [-300, -1200, 140], [1300, -150, 100], [-1300, 400, 120]]) {
      for (let i = 0; i < 260; i++) { const a = R() * 6.28, d = Math.sqrt(R()) * fr; inst_tree(fx + Math.cos(a) * d, fz + Math.sin(a) * d, R() < 0.3); }
    }
  }
  function lootCountryside() {
    for (let i = 0; i < 70; i++) {
      const x = rr(-HALF + 30, HALF - 30), z = rr(-HALF + 30, HALF - 30);
      if (!L.free(x, z, 2)) continue;
      L.lootSpots.push({ x, z, poi: L.poiAt(x, z) });
    }
  }

  // ---------- Boden und Straßenflächen ----------
  L.zoneColor = function (x, z, out) {
    const n = L.fbm(x * 0.008 + 100, z * 0.008 + 100), n2 = L.noise2(x * 0.03, z * 0.03);
    let r = 0.30 + n * 0.08, g = 0.42 + n * 0.1, b = 0.18 + n * 0.05;
    const mix = (cr, cg, cb, t) => { if (t <= 0) return; if (t > 1) t = 1; r += (cr - r) * t; g += (cg - g) * t; b += (cb - b) * t; };
    mix(0.47, 0.45, 0.27, (n2 - 0.62) * 3);
    mix(0.16, 0.26, 0.11, (420 - Math.hypot(x + 850, z + 850)) / 80);
    mix(0.40, 0.40, 0.38, (410 - Math.max(Math.abs(x), Math.abs(z))) / 30);
    if (x > 785 && x < 1115 && z > -1065 && z < -735) mix(0.52, 0.48, 0.36, 1);
    for (const f of L.fields) if (x > f.x1 && x < f.x2 && z > f.z1 && z < f.z2) {
      const k = Math.floor((z - f.z1) / 40) % 3;
      const c = [[0.72, 0.62, 0.28], [0.42, 0.30, 0.18], [0.36, 0.52, 0.20]][k];
      mix(c[0], c[1], c[2], 0.9);
    }
    mix(0.45, 0.38, 0.26, (75 - Math.hypot(x + 940, z - 745)) / 20);
    const kd = Math.hypot(x - 380, z - 1050);
    mix(0.12, 0.09, 0.07, (60 - kd) / 15);
    mix(0.24, 0.14, 0.08, (100 - kd) / 40 * 0.6);
    const lk = L.lake;
    if (x > lk.x1 - 25 && x < lk.x2 + 25 && z > lk.z1 - 25 && z < lk.z2 + 25) mix(0.72, 0.66, 0.46, 1);
    out.r = r; out.g = g; out.b = b;
    return out;
  };
  function buildGround() {
    const seg = 200, geo = new T.PlaneGeometry(HALF * 2, HALF * 2, seg, seg);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position, cols = new Float32Array(pos.count * 3), c = {};
    for (let i = 0; i < pos.count; i++) {
      L.zoneColor(pos.getX(i), pos.getZ(i), c);
      cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new T.BufferAttribute(cols, 3));
    const cv = document.createElement('canvas'); cv.width = cv.height = 256;
    const g = cv.getContext('2d'), id = g.createImageData(256, 256);
    for (let i = 0; i < id.data.length; i += 4) {
      const v = 190 + Math.random() * 65;
      id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255;
    }
    g.putImageData(id, 0, 0);
    for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.12})`; g.fillRect(Math.random() * 256, Math.random() * 256, 2 + Math.random() * 5, 2 + Math.random() * 5); }
    const tex = new T.CanvasTexture(cv); tex.wrapS = tex.wrapT = T.RepeatWrapping; tex.repeat.set(300, 300);
    const m = new T.Mesh(geo, new T.MeshPhongMaterial({ map: tex, vertexColors: true, shininess: 0 }));
    m.receiveShadow = true;
    L.scene.add(m);
    L.ground = m;
  }
  function roadTex(highway) {
    const c = document.createElement('canvas'); c.width = 64; c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = '#3a3a3d'; g.fillRect(0, 0, 64, 128);
    for (let i = 0; i < 600; i++) { const v = 40 + Math.random() * 40; g.fillStyle = `rgb(${v},${v},${v + 2})`; g.fillRect(Math.random() * 64, Math.random() * 128, 1.5, 1.5); }
    g.fillStyle = '#d8d8d0';
    g.fillRect(2, 0, 2, 128); g.fillRect(60, 0, 2, 128);
    if (highway) { g.fillRect(31, 0, 2.5, 64); }
    const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping;
    return t;
  }
  function buildRoads() {
    const hw = roadTex(true), st = roadTex(false);
    L.roads.forEach((r, i) => {
      const len = r.dir === 'x' ? r.rx2 - r.rx1 : r.rz2 - r.rz1;
      const tex = (r.hw ? hw : st).clone(); tex.needsUpdate = true; tex.repeat.set(1, len / 14);
      const geo = new T.PlaneGeometry(r.w, len); geo.rotateX(-Math.PI / 2);
      if (r.dir === 'x') geo.rotateY(Math.PI / 2);
      const m = new T.Mesh(geo, new T.MeshLambertMaterial({ map: tex }));
      m.position.set((r.rx1 + r.rx2) / 2, 0.03 + (r.hw ? 0.01 : 0) + i * 0.0004, (r.rz1 + r.rz2) / 2);
      m.receiveShadow = true;
      L.scene.add(m);
    });
  }
  // ---------- Fassaden ----------
  function facade(cols, rows, lit) {
    const c = document.createElement('canvas'); c.width = 128; c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = lit ? '#000' : '#f2f2f2'; g.fillRect(0, 0, 128, 128);
    const m = 8, cw = (128 - m * 2) / cols, ch = (128 - m * 2) / rows;
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      const x = m + i * cw + cw * 0.18, y = m + j * ch + ch * 0.2, w = cw * 0.64, h = ch * 0.55;
      if (lit) { if (Math.random() < 0.3) { g.fillStyle = Math.random() < 0.5 ? '#ffd27a' : '#ffe9b0'; g.fillRect(x, y, w, h); } }
      else { g.fillStyle = '#3c4552'; g.fillRect(x, y, w, h); g.fillStyle = 'rgba(255,255,255,0.15)'; g.fillRect(x, y, w, h * 0.3); }
    }
    return new T.CanvasTexture(c);
  }
  function boxTopUV(geo) {
    const uv = geo.attributes.uv;
    for (let f = 2; f <= 3; f++) for (let k = 0; k < 4; k++) uv.setXY(f * 4 + k, 0.02, 0.02);
    uv.needsUpdate = true;
    return geo;
  }
  function makeInst(list, geo, mat, shadow) {
    const m = new T.InstancedMesh(geo, mat, Math.max(1, list.length));
    const o = new T.Object3D(), col = new T.Color();
    list.forEach((b, i) => {
      o.position.set(b.x, b.y || 0, b.z); o.rotation.set(0, b.ry || 0, 0); o.scale.set(b.w, b.h, b.d); o.updateMatrix();
      m.setMatrixAt(i, o.matrix); col.set(b.color); m.setColorAt(i, col);
    });
    m.count = list.length;
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.castShadow = shadow; m.receiveShadow = true; m.frustumCulled = false;
    L.scene.add(m);
    return m;
  }
  function flush() {
    L.windowMats = [];
    for (const [cls, cr] of [['low', [3, 2]], ['mid', [4, 6]], ['tall', [5, 14]]]) {
      const mat = new T.MeshLambertMaterial({ map: facade(cr[0], cr[1], false), emissiveMap: facade(cr[0], cr[1], true), emissive: new T.Color('#ffffff'), emissiveIntensity: 0 });
      L.windowMats.push(mat);
      makeInst(inst[cls], boxTopUV(new T.BoxGeometry(1, 1, 1).translate(0, 0.5, 0)), mat, true);
    }
    const roofGeo = new T.BufferGeometry();
    const v = [-0.5, 0, -0.5, 0.5, 0, -0.5, 0, 1, -0.5, -0.5, 0, 0.5, 0, 1, 0.5, 0.5, 0, 0.5,
      -0.5, 0, -0.5, 0, 1, -0.5, 0, 1, 0.5, -0.5, 0, -0.5, 0, 1, 0.5, -0.5, 0, 0.5,
      0.5, 0, -0.5, 0.5, 0, 0.5, 0, 1, 0.5, 0.5, 0, -0.5, 0, 1, 0.5, 0, 1, -0.5];
    roofGeo.setAttribute('position', new T.Float32BufferAttribute(v, 3)); roofGeo.computeVertexNormals();
    makeInst(inst.roof, roofGeo, new T.MeshLambertMaterial({ side: T.DoubleSide }), true);
    makeInst(inst.pineTrunk, new T.CylinderGeometry(0.22, 0.32, 1, 6).translate(0, 0.5, 0), new T.MeshLambertMaterial(), true);
    makeInst(inst.pine, new T.ConeGeometry(1, 1, 7).translate(0, 0.5, 0), new T.MeshLambertMaterial(), true);
    makeInst(inst.leafTrunk, new T.CylinderGeometry(0.25, 0.35, 1, 6).translate(0, 0.5, 0), new T.MeshLambertMaterial(), true);
    makeInst(inst.leafy, new T.IcosahedronGeometry(1, 0), new T.MeshLambertMaterial(), true);
    makeInst(inst.wreck, new T.BoxGeometry(1, 1, 1), new T.MeshLambertMaterial(), true);
    makeInst(inst.wreckTop, new T.BoxGeometry(1, 1, 1), new T.MeshLambertMaterial(), true);
    makeInst(inst.fence, new T.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), new T.MeshLambertMaterial({ transparent: true, opacity: 0.55 }), false);
    makeInst(inst.lampPole, new T.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), new T.MeshLambertMaterial(), true);
    L.lampMat = new T.MeshBasicMaterial({ color: '#ffffff' });
    makeInst(inst.lampHead, new T.BoxGeometry(1, 1, 1), L.lampMat, false);
    makeInst(inst.bale, new T.CylinderGeometry(1, 1, 1, 12).rotateZ(Math.PI / 2).scale(0.5, 0.5, 0.5), new T.MeshLambertMaterial(), true);
  }
  // ---------- Kartenbild für Minimap ----------
  function buildMapCanvas() {
    const S = 1024, k = S / (HALF * 2), c = document.createElement('canvas'); c.width = c.height = S;
    const g = c.getContext('2d'), col = {};
    for (let px = 0; px < S; px += 8) for (let pz = 0; pz < S; pz += 8) {
      L.zoneColor(px / k - HALF, pz / k - HALF, col);
      g.fillStyle = `rgb(${col.r * 255 | 0},${col.g * 255 | 0},${col.b * 255 | 0})`;
      g.fillRect(px, pz, 8, 8);
    }
    g.fillStyle = '#2d5f7a';
    g.fillRect((L.lake.x1 + HALF) * k, (L.lake.z1 + HALF) * k, (L.lake.x2 - L.lake.x1) * k, (L.lake.z2 - L.lake.z1) * k);
    for (const r of L.roads) { g.fillStyle = r.hw ? '#d8d0b0' : '#a8a49a'; g.fillRect((r.rx1 + HALF) * k, (r.rz1 + HALF) * k, Math.max(2, (r.rx2 - r.rx1) * k), Math.max(2, (r.rz2 - r.rz1) * k)); }
    for (const b of L.mapRects) { g.fillStyle = b.c; g.fillRect((b.x - b.w / 2 + HALF) * k, (b.z - b.d / 2 + HALF) * k, Math.max(1.5, b.w * k), Math.max(1.5, b.d * k)); }
    L.mapCanvas = c; L.mapScale = k;
  }

  L.buildWorld = function (scene) {
    L.scene = scene;
    buildGround(); buildRoads();
    buildCity(); buildVillage(); buildFarm(); buildMilitary();
    buildGas(700, -35, true, 'tanke1'); buildGas(-35, 800, false, 'tanke2');
    buildBunker(); buildRadio(); buildCrater(); buildCamping(); buildWindpark(); buildSperre(); buildMountains();
    scatteredHouses(); perimeter(); wrecks(); trees(); extraBikes(); lootCountryside();
    flush(); buildMapCanvas();
    // Startpunkte für Spieler (auf Landstraßen)
    L.spawnSpots = [[-600, 6], [600, -6], [6, -600], [-6, 620], [-944, 300], [956, -400], [-1094, -480], [520, 1144], [-200, 1156], [700, 506], [-1300, -6], [1300, 6], [6, 1300], [-6, -1250]];
  };

  // ---------- Himmel, Licht, Tag/Nacht, Wetter ----------
  const WEATHER = {
    klar: { cloud: 0.1, rain: 0, fog: 0, label: '☀️ Klar' },
    wolkig: { cloud: 0.7, rain: 0, fog: 0.1, label: '☁️ Wolkig' },
    regen: { cloud: 0.9, rain: 0.7, fog: 0.25, label: '🌧️ Regen' },
    nebel: { cloud: 0.5, rain: 0, fog: 0.85, label: '🌫️ Nebel' },
    gewitter: { cloud: 1, rain: 1, fog: 0.3, storm: true, label: '⛈️ Gewitter' }
  };
  L.env = { time: 8, weather: 'klar', wT: 240, cloud: 0.1, rain: 0, fog: 0, bolt: 0, day: 1, hearMul: 1, nextBolt: 10 };
  L.initEnv = function (scene) {
    const E = L.env;
    E.hemi = new T.HemisphereLight(0xbfd8ff, 0x4a5a3a, 0.6); scene.add(E.hemi);
    E.sun = new T.DirectionalLight(0xfff2dd, 1); scene.add(E.sun); scene.add(E.sun.target);
    E.sun.castShadow = true;
    E.sun.shadow.mapSize.set(2048, 2048);
    const sc = E.sun.shadow.camera; sc.left = -90; sc.right = 90; sc.top = 90; sc.bottom = -90; sc.near = 10; sc.far = 500;
    E.sun.shadow.bias = -0.0008;
    scene.fog = new T.Fog(0x8fb0d0, 100, 700);
    scene.background = new T.Color(0x8fb0d0);
    // Sterne
    const sg = new T.BufferGeometry(), sp = [];
    for (let i = 0; i < 1500; i++) {
      const a = Math.random() * 6.28, e = Math.random() * 1.4 + 0.1, d = 900;
      sp.push(Math.cos(a) * Math.cos(e) * d, Math.sin(e) * d, Math.sin(a) * Math.cos(e) * d);
    }
    sg.setAttribute('position', new T.Float32BufferAttribute(sp, 3));
    E.stars = new T.Points(sg, new T.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false }));
    scene.add(E.stars);
    E.moon = new T.Mesh(new T.SphereGeometry(25, 16, 12), new T.MeshBasicMaterial({ color: 0xe8ecff, fog: false, transparent: true }));
    scene.add(E.moon);
    E.sunDisc = new T.Mesh(new T.SphereGeometry(30, 16, 12), new T.MeshBasicMaterial({ color: 0xfff0c0, fog: false, transparent: true }));
    scene.add(E.sunDisc);
    // Regen
    const rn = 2200, rg = new T.BufferGeometry(), rp = new Float32Array(rn * 6);
    for (let i = 0; i < rn; i++) {
      const x = (Math.random() - 0.5) * 80, y = Math.random() * 40, z = (Math.random() - 0.5) * 80;
      rp.set([x, y, z, x + 0.05, y + 0.9, z], i * 6);
    }
    rg.setAttribute('position', new T.BufferAttribute(rp, 3));
    E.rainMesh = new T.LineSegments(rg, new T.LineBasicMaterial({ color: 0xaabbd0, transparent: true, opacity: 0 }));
    E.rainMesh.frustumCulled = false;
    scene.add(E.rainMesh);
    // Taschenlampe & Scheinwerfer & Mündungsfeuer (feste Anzahl Lichter)
    E.flash = new T.SpotLight(0xfff4dd, 0, 45, 0.45, 0.5, 1.2); scene.add(E.flash); scene.add(E.flash.target);
    E.head = new T.SpotLight(0xfff0d0, 0, 90, 0.55, 0.5, 1); scene.add(E.head); scene.add(E.head.target);
    E.muzzle = new T.PointLight(0xffb060, 0, 18, 2); scene.add(E.muzzle);
    E.boom = new T.PointLight(0xff8030, 0, 60, 2); scene.add(E.boom);
    E.glow = new T.PointLight(0x40ff80, 1.4, 70, 2); E.glow.position.set(384, 8, 1047); scene.add(E.glow);
    E.campfire = new T.PointLight(0xff9030, 1.2, 30, 2); E.campfire.position.set(-450, 2, 1200); scene.add(E.campfire);
    L.applyShadowSetting();
  };
  L.applyShadowSetting = function () {
    if (L.renderer) L.renderer.shadowMap.enabled = !!L.S().shadows;
    if (L.env.sun) L.env.sun.castShadow = !!L.S().shadows;
  };
  L.setWeather = function (w) { L.env.weather = w; L.env.wT = L.rand(180, 360); };
  L.randomWeather = function () {
    const r = Math.random();
    L.setWeather(r < 0.35 ? 'klar' : r < 0.6 ? 'wolkig' : r < 0.8 ? 'regen' : r < 0.9 ? 'nebel' : 'gewitter');
  };
  const cSky = new T.Color(), cTmp = new T.Color(), cNight = new T.Color(0.015, 0.02, 0.05), cDay = new T.Color(0.52, 0.68, 0.86), cDusk = new T.Color(0.85, 0.5, 0.32), cGrey = new T.Color(0.46, 0.48, 0.52);
  L.updateEnv = function (dt, cam, focus, paused) {
    const E = L.env, S = L.S();
    if (!paused) {
      E.time = (E.time + dt * 24 / 960) % 24;
      E.wT -= dt;
      if (E.wT <= 0) L.randomWeather();
    }
    const W = WEATHER[E.weather];
    const ap = (v, t) => v + L.clamp(t - v, -dt * 0.03, dt * 0.03);
    E.cloud = ap(E.cloud, W.cloud); E.rain = ap(E.rain, W.rain); E.fog = ap(E.fog, W.fog);
    const a = (E.time - 6) / 24 * Math.PI * 2, el = Math.sin(a);
    const day = L.clamp(el * 4 + 0.25, 0, 1); E.day = day;
    const dusk = L.clamp(1 - Math.abs(el) * 5, 0, 1) * 0.8;
    cSky.copy(cNight).lerp(cDay, day); cSky.lerp(cDusk, dusk * day);
    cTmp.copy(cGrey).multiplyScalar(0.25 + day * 0.75); cSky.lerp(cTmp, E.cloud * 0.75);
    // Gewitter
    if (W.storm && !paused) {
      E.nextBolt -= dt;
      if (E.nextBolt <= 0) { E.nextBolt = L.rand(5, 16); E.bolt = 1; L.snd.thunder(L.rand(0.3, 2.5)); }
    }
    E.bolt = Math.max(0, E.bolt - dt * 3);
    if (E.bolt > 0) cSky.lerp(cTmp.setRGB(0.8, 0.82, 0.95), E.bolt * 0.7);
    L.scene.background.copy(cSky);
    L.scene.fog.color.copy(cSky);
    const far = S.view * (1 - E.fog * 0.82) * (1 - E.rain * 0.25) * (0.55 + day * 0.45);
    L.scene.fog.far = Math.max(60, far); L.scene.fog.near = Math.max(10, far * 0.15);
    // Licht
    const sd = new T.Vector3(Math.cos(a) * 0.8, el, 0.35).normalize();
    const nightAmt = 1 - day;
    E.sun.position.set(focus.x + (el > 0 ? sd.x : -sd.x) * 200, (el > 0 ? Math.max(sd.y, 0.15) : Math.max(-sd.y, 0.3)) * 200, focus.z + sd.z * 200);
    E.sun.target.position.set(focus.x, 0, focus.z);
    E.sun.intensity = day * 1.05 * (1 - E.cloud * 0.6) + nightAmt * 0.18;
    E.sun.color.setRGB(1, 0.92 + day * 0.05 - dusk * 0.2, 0.85 - dusk * 0.35).lerp(cTmp.setRGB(0.6, 0.7, 1), nightAmt);
    E.hemi.intensity = 0.12 + day * 0.48 * (1 - E.cloud * 0.3) + E.bolt * 1.6;
    E.hemi.color.copy(cSky).lerp(cTmp.setRGB(1, 1, 1), 0.4);
    E.stars.position.copy(cam.position);
    E.stars.material.opacity = nightAmt * (1 - E.cloud * 0.9);
    E.moon.position.set(cam.position.x - sd.x * 700, cam.position.y + Math.max(-el, 0.1) * 500, cam.position.z - sd.z * 700);
    E.moon.material.opacity = nightAmt * (1 - E.cloud * 0.8);
    E.sunDisc.position.set(cam.position.x + sd.x * 750, cam.position.y + el * 600, cam.position.z + sd.z * 750);
    E.sunDisc.material.opacity = day * (1 - E.cloud);
    for (const m of L.windowMats || []) m.emissiveIntensity = nightAmt * 0.9;
    if (L.lampMat) L.lampMat.color.setRGB(0.4 + nightAmt * 0.6, 0.38 + nightAmt * 0.5, 0.3 + nightAmt * 0.3);
    E.glow.intensity = 0.6 + nightAmt * 1.6;
    E.campfire.intensity = (0.5 + nightAmt * 1.5) * (0.85 + Math.random() * 0.3);
    // Regen
    E.rainMesh.visible = E.rain > 0.02;
    if (E.rainMesh.visible) {
      E.rainMesh.material.opacity = E.rain * 0.55;
      const p = E.rainMesh.geometry.attributes.position, arr = p.array;
      for (let i = 0; i < arr.length; i += 6) {
        arr[i + 1] -= dt * 32; arr[i + 4] -= dt * 32;
        if (arr[i + 1] < -2) { arr[i + 1] += 40; arr[i + 4] += 40; }
      }
      p.needsUpdate = true;
      E.rainMesh.position.set(cam.position.x, cam.position.y - 12, cam.position.z);
    }
    E.hearMul = (1 - E.rain * 0.22) * (W.storm ? 0.8 : 1) * (1 + nightAmt * 0.15);
    L.ambient.set(0.025 + E.cloud * 0.03 + (W.storm ? 0.05 : 0), E.rain * 0.12);
    E.label = W.label;
  };
})();
