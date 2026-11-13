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
    } else if (id === 'herbst') {
      tintInst(L.instLeafy, (cc, i) => cc.set(AUT[(i * 7) % AUT.length]));
    } else if (id === 'fruehling') {
      tintInst(L.instLeafy, (cc, i) => (i % 4 === 0 ? cc.set(i % 8 === 0 ? '#f4b8d0' : '#ffffff') : cc.lerp(new T.Color('#8ad060'), 0.45)));
    } else {
      tintInst(L.instLeafy, (cc) => cc.lerp(new T.Color('#2a6a20'), 0.25));
    }
  }

  // ---------- Partikel: Blätter, Blüten, Pollen, Atemwölkchen ----------
  const onHome = (x) => !L.curIsland && !L.inDim(x) && !(L.inMoon && L.inMoon(x));
  const oue = L.updateEnv;
  L.updateEnv = function (dt, cam, focus, paused) {
    oue(dt, cam, focus, paused);
    if (!applied && L.ground && L.instLeafy) apply();
    if (paused || L.state !== 'game' || !cam || !onHome(cam.position.x)) return;
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
