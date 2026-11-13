'use strict';
// Jahreszeiten nach dem echten Datum (Deutschland): Winter Dez–Feb, Frühling Mär–Mai, Sommer Jun–Aug, Herbst Sep–Nov.
// Gilt nur für die Hauptkarte: eigenes Wetter, verschneite Wiesen/Dächer/Bäume, bunte Blätter, Blüten …
(function () {
  const L = window.L, T = THREE;
  const m = new Date().getMonth();
  const id = m === 11 || m <= 1 ? 'winter' : m <= 4 ? 'fruehling' : m <= 7 ? 'sommer' : 'herbst';
  const SEASONS = {
    winter: { name: 'Winter', icon: '❄️', w: [['schnee', 38], ['frost', 20], ['wolkig', 17], ['nebel', 15], ['schneesturm', 10]] },
    fruehling: { name: 'Frühling', icon: '🌸', w: [['klar', 30], ['wolkig', 20], ['schauer', 30], ['regen', 8], ['nebel', 6], ['gewitter', 6]] },
    sommer: { name: 'Sommer', icon: '☀️', w: [['klar', 42], ['hitze', 20], ['wolkig', 15], ['gewitter', 15], ['schauer', 8]] },
    herbst: { name: 'Herbst', icon: '🍂', w: [['nebel', 24], ['regen', 26], ['wolkig', 18], ['sturm', 18], ['klar', 14]] }
  };
  const S = L.SEASON = Object.assign({ id }, SEASONS[id]);
  L.seasonWeather = function () {
    let sum = 0; for (const [, p] of S.w) sum += p;
    let r = Math.random() * sum; for (const [w, p] of S.w) { r -= p; if (r <= 0) return w; }
    return S.w[0][0];
  };

  // ---------- Aussehen der Welt ----------
  const snow = new T.Color(0.93, 0.95, 0.98), c = new T.Color();
  function tintInst(mesh, fn) {
    if (!mesh || !mesh.instanceColor) return;
    for (let i = 0; i < mesh.count; i++) { mesh.getColorAt(i, c); fn(c, i); mesh.setColorAt(i, c); }
    mesh.instanceColor.needsUpdate = true;
  }
  const AUT = ['#d2691e', '#e8a020', '#b8401a', '#c8a030', '#9a3a1a', '#e07a20'];
  let applied = false;
  function apply() {
    applied = true;
    const g = L.ground && L.ground.geometry, col = g && g.attributes.color;
    if (col) {
      const a = col.array;
      for (let i = 0; i < a.length; i += 3) {
        c.setRGB(a[i], a[i + 1], a[i + 2]);
        if (id === 'winter') c.lerp(snow, 0.78);
        else if (id === 'herbst') c.lerp(new T.Color(0.55, 0.45, 0.22), 0.25);
        else if (id === 'sommer') c.lerp(new T.Color(0.62, 0.62, 0.3), 0.12);
        else c.lerp(new T.Color(0.35, 0.7, 0.3), 0.1);
        a[i] = c.r; a[i + 1] = c.g; a[i + 2] = c.b;
      }
      col.needsUpdate = true;
    }
    if (id === 'winter') {
      tintInst(L.instLeafy, (cc) => cc.lerp(snow, 0.7));
      tintInst(L.instPine, (cc) => cc.lerp(snow, 0.45));
      tintInst(L.instRoof, (cc) => cc.lerp(snow, 0.75));
      winterDeco();
    } else if (id === 'herbst') {
      tintInst(L.instLeafy, (cc, i) => cc.set(AUT[(i * 7) % AUT.length]));
    } else if (id === 'fruehling') {
      tintInst(L.instLeafy, (cc, i) => (i % 4 === 0 ? cc.set(i % 8 === 0 ? '#f4b8d0' : '#ffffff') : cc.lerp(new T.Color('#8ad060'), 0.45)));
    } else {
      tintInst(L.instLeafy, (cc) => cc.lerp(new T.Color('#2a6a20'), 0.25));
    }
  }

  // ---------- Winter: Schneemänner und geschmückte Tannen ----------
  const snowmen = []; let balls = null, stars = null, twT = 0, baseCols = null;
  function snowman(x, z, rot) {
    const g = new T.Group(), W = L.mat('#f4f7fb'), blk = L.mat('#1a1a1a');
    const add = (geo, mt, sx, sy, sz, px, py, pz) => { const m = new T.Mesh(geo, mt); m.scale.set(sx, sy, sz); m.position.set(px, py, pz); m.castShadow = true; g.add(m); return m; };
    add(L.GEO.sph, W, 0.85, 0.8, 0.85, 0, 0.75, 0); add(L.GEO.sph, W, 0.62, 0.6, 0.62, 0, 1.95, 0); add(L.GEO.sph, W, 0.45, 0.45, 0.45, 0, 2.85, 0);
    for (const s of [-1, 1]) add(L.GEO.sph, blk, 0.06, 0.06, 0.06, s * 0.15, 2.95, 0.4);
    for (let k = 0; k < 3; k++) add(L.GEO.sph, blk, 0.07, 0.07, 0.07, 0, 1.75 + k * 0.25, 0.6 - Math.abs(k - 1) * 0.04);
    const nose = add(L.GEO.cone, L.mat('#ff7a20'), 0.07, 0.35, 0.07, 0, 2.85, 0.55); nose.rotation.x = Math.PI / 2;
    add(L.GEO.cyl, blk, 0.32, 0.45, 0.32, 0, 3.45, 0); add(L.GEO.cyl, blk, 0.48, 0.05, 0.48, 0, 3.25, 0);
    const sc = new T.Mesh(new T.TorusGeometry(0.42, 0.1, 6, 16), L.mat('#d02a2a')); sc.rotation.x = Math.PI / 2; sc.position.y = 2.5; g.add(sc);
    for (const s of [-1, 1]) { const a = add(L.GEO.cyl, L.mat('#5a3a20'), 0.04, 0.9, 0.04, s * 0.85, 2.1, 0); a.rotation.z = s * 1.0; }
    g.position.set(x, 0, z); g.rotation.y = rot; L.scene.add(g); snowmen.push(g);
  }
  function winterDeco() {
    // 30 Schneemänner auf freien Flächen
    for (let i = 0, n = 0; i < 3000 && n < 30; i++) {
      const x = L.rand(-1400, 1400), z = L.rand(-1400, 1400);
      if (L.queryBoxes(x, z, 3).length || L.mountainH(x, z) > 0 || L.waterDepth(x, z) > -0.2 || L.inTower(x, z, 8)) continue;
      snowman(x, z, Math.random() * 6.28); n++;
    }
    // Tannen als Weihnachtsbäume: Kugeln/Lichter und ein Stern oben
    const pm = L.instPine; if (!pm) return;
    const N = Math.min(pm.count, 1600), mtx = new T.Matrix4(), pos = new T.Vector3(), q = new T.Quaternion(), sc = new T.Vector3(), o = new T.Object3D(), cc = new T.Color();
    balls = new T.InstancedMesh(new T.SphereGeometry(1, 6, 5), new T.MeshBasicMaterial(), N * 7);
    stars = new T.InstancedMesh(new T.OctahedronGeometry(1, 0), new T.MeshBasicMaterial({ color: 0xffd040 }), N);
    let bi = 0;
    const COLS = ['#ff2a3a', '#ffd040', '#3aa0ff', '#ff40c0', '#ffffff', '#40ff80', '#ff8a20'];
    for (let i = 0; i < N; i++) {
      pm.getMatrixAt(i, mtx); mtx.decompose(pos, q, sc);
      if (Math.abs(pos.x) > 1500 || Math.abs(pos.z) > 1500) continue;
      for (let k = 0; k < 7; k++) {
        const hh = 0.15 + (k / 7) * 0.7, rr = sc.x * (1 - hh) * 0.92, a = k * 2.4 + i;
        o.position.set(pos.x + Math.cos(a) * rr, pos.y + sc.y * hh, pos.z + Math.sin(a) * rr); o.rotation.set(0, 0, 0); o.scale.setScalar(Math.max(0.12, sc.x * 0.09)); o.updateMatrix();
        balls.setMatrixAt(bi, o.matrix); balls.setColorAt(bi, cc.set(COLS[(i + k) % COLS.length])); bi++;
      }
      o.position.set(pos.x, pos.y + sc.y + 0.25, pos.z); o.scale.set(sc.x * 0.18, sc.x * 0.25, sc.x * 0.08); o.updateMatrix(); stars.setMatrixAt(i, o.matrix);
    }
    balls.count = bi; balls.instanceMatrix.needsUpdate = true; if (balls.instanceColor) balls.instanceColor.needsUpdate = true; balls.frustumCulled = false;
    stars.count = N; stars.instanceMatrix.needsUpdate = true; stars.frustumCulled = false;
    L.scene.add(balls); L.scene.add(stars);
    if (balls.instanceColor) baseCols = Float32Array.from(balls.instanceColor.array);
  }
  function updateWinter(dt) {
    twT -= dt;
    if (twT > 0) return; twT = 0.5;
    const P = L.player;
    for (const s of snowmen) s.visible = Math.abs(s.position.x - P.x) < 180 && Math.abs(s.position.z - P.z) < 180;
    // Lichterkette blinkt (nachts besonders schön)
    if (balls && balls.instanceColor) {
      const arr = balls.instanceColor, a = arr.array;
      for (let k = 0; k < 500 && baseCols; k++) { const i = Math.floor(Math.random() * balls.count) * 3, f = Math.random() < 0.4 ? 0.3 : 1; a[i] = baseCols[i] * f; a[i + 1] = baseCols[i + 1] * f; a[i + 2] = baseCols[i + 2] * f; }
      arr.needsUpdate = true;
    }
  }

  // ---------- Partikel: Blätter, Blüten, Pollen, Atemwölkchen ----------
  const onHome = (x) => !L.curIsland && !L.inDim(x) && !(L.inMoon && L.inMoon(x));
  const oue = L.updateEnv;
  L.updateEnv = function (dt, cam, focus, paused) {
    oue(dt, cam, focus, paused);
    if (!applied && L.ground && L.instLeafy) apply();
    if (paused || L.state !== 'game' || !cam || !onHome(cam.position.x)) return;
    if (id === 'winter') updateWinter(dt);
    const P = L.player, E = L.env, wind = L.WEATHER && L.WEATHER[E.weather] && L.WEATHER[E.weather].wind;
    const px = cam.position.x, pz = cam.position.z, R = L.rand;
    if (id === 'herbst' && Math.random() < dt * (wind ? 30 : 8)) L.fx(AUT[Math.floor(Math.random() * AUT.length)], px + R(-25, 25), R(6, 14), pz + R(-25, 25), 1, wind ? 4 : 1, { size: 0.18, life: 5, g: 0.6 });
    if (id === 'fruehling' && E.rain < 0.2 && Math.random() < dt * 6) L.fx(Math.random() < 0.5 ? '#f8c8dc' : '#ffffff', px + R(-20, 20), R(4, 10), pz + R(-20, 20), 1, 1, { size: 0.12, life: 5, g: 0.4 });
    if (id === 'sommer' && E.day > 0.5 && E.rain < 0.1 && Math.random() < dt * 4) L.fx('#fff6b0', px + R(-15, 15), R(0.5, 3), pz + R(-15, 15), 1, 0.3, { basic: true, size: 0.06, life: 3, g: -0.05 });
    if (id === 'winter' && P && P.alive && !P.vehicle && Math.random() < dt * 1.2) L.fx('#ffffff', P.x + Math.sin(P.yaw) * 0.35, (P.y || 0) + 1.65, P.z + Math.cos(P.yaw) * 0.35, 3, 0.4, { size: 0.12, life: 1.2, g: -0.05, grow: 1.5 });
  };
  // Zur Rundenbeginn passendes Wetter (Hauptkarte)
  setTimeout(() => { if (L.state !== 'game') L.env.weather = L.seasonWeather(); }, 0);
})();
