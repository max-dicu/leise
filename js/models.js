'use strict';
// 3D-Modelle und Animationen: Spieler/NPCs, Viktor, Daniel, Stelzer, Koloss, Fahrzeuge, Gegenstände
(function () {
  const L = window.L, T = THREE;
  const UP = new T.Vector3(0, 1, 0);
  const G = () => L.GEO;
  function part(geo, color, sx, sy, sz, x, y, z, parent, o) {
    const m = new T.Mesh(geo, L.mat(color, o));
    m.scale.set(sx, sy, sz); m.position.set(x, y, z);
    m.castShadow = !(o && o.noShadow);
    if (parent) parent.add(m);
    return m;
  }
  const grp = (parent, x, y, z) => { const g = new T.Group(); g.position.set(x || 0, y || 0, z || 0); if (parent) parent.add(g); return g; };
  function shade(hex, f) {
    const c = new T.Color(hex); c.multiplyScalar(f); c.r = Math.min(1, c.r); c.g = Math.min(1, c.g); c.b = Math.min(1, c.b);
    return '#' + c.getHexString();
  }

  // ---------- Aussehen ----------
  // Eine gemeinsame Farbpalette für alles Farbige (Haare, Augen, Kleidung, Hose, Schuhe, Kopfbedeckung, Brille)
  const PALETTE = ['#1a1a1a', '#f2f2f2', '#7a7a7a', '#4a2f1c', '#8a5a2b', '#d8b46a', '#a83a1c', '#c02a2a',
    '#e07020', '#e8c020', '#3a8a3a', '#2a6a6a', '#2a6ac0', '#1e2f5a', '#6a3a8a', '#d04a9a'];
  L.PALETTE = PALETTE;
  L.CHAR_OPTS = {
    skin: ['#f6dcc6', '#f1d2b6', '#e8c09c', '#e3b48f', '#d49e74', '#c98e65', '#b07a52', '#a46a45', '#7a4a2e', '#4e2f1e'],
    hair: ['kurz', 'fade', 'buzz', 'seitenscheitel', 'mittelscheitel', 'pony', 'tolle', 'zurueck', 'wuschel', 'stachel', 'undercut', 'irokese', 'kurzlocken', 'locken', 'wellig', 'lang', 'bob', 'wolfcut', 'mullet', 'emo', 'zopf', 'hoherzopf', 'flechtzopf', 'zoepfe', 'dutt', 'doppeldutt', 'manbun', 'cornrows', 'twists', 'dreads', 'glatze'],
    hairColor: PALETTE,
    eyes: PALETTE,
    brows: ['normal', 'duenn', 'dick', 'buschig', 'boese', 'hoch', 'traurig', 'gebogen'],
    mouth: ['normal', 'laecheln', 'grinsen', 'zaehne', 'ernst', 'schmollen', 'schief', 'offen', 'ueberrascht', 'traurig'],
    nose: ['klein', 'normal', 'gross', 'spitz', 'breit', 'stups', 'lang', 'knubbel'],
    beard: ['kein', 'stoppel', 'vollbart', 'langbart', 'schnurrbart', 'henkelbart', 'kinnbart', 'ziegenbart', 'koteletten', 'kinnstreifen'],
    glasses: ['keine', 'brille', 'rund', 'eckig', 'sonnenbrille', 'skibrille', 'monokel', 'augenklappe'],
    glassesColor: PALETTE,
    hat: ['keine', 'muetze', 'beanie', 'cap', 'cap_rueck', 'helm', 'stirnband', 'bandana', 'cowboy', 'zylinder', 'sonnenhut', 'krone'],
    hatColor: PALETTE,
    top: ['tshirt', 'oversize', 'tanktop', 'polo', 'hemd', 'flanell', 'pullover', 'hoodie', 'trainingsjacke', 'jacke', 'lederjacke', 'puffer', 'regenjacke', 'weste', 'mantel', 'anzug', 'trikot', 'kittel'],
    topColor: PALETTE,
    pants: ['jeans', 'baggy', 'baggycargo', 'skinny', 'kurz', 'cargoshorts', 'jogging', 'cargo', 'camo', 'karo', 'schlag', 'latzhose', 'zerrissen', 'anzughose', 'rock'],
    pantsColor: PALETTE,
    shoeType: ['sneaker', 'chunky', 'skate', 'hightop', 'stiefel', 'sandale', 'lackschuh', 'barfuss'],
    shoes: PALETTE,
    build: ['duenn', 'schmal', 'normal', 'kraeftig', 'muskuloes'],
    height: ['sehr_klein', 'klein', 'mittel', 'gross', 'sehr_gross'],
    scar: ['keine', 'wange', 'auge', 'stirn', 'kinn', 'kreuz']
  };
  L.DEFAULT_CHAR = {
    name: 'Überlebender', skin: '#e3b48f', hair: 'kurz', hairColor: '#4a2f1c', eyes: '#2a6ac0', brows: 'normal', mouth: 'normal', nose: 'normal',
    beard: 'kein', glasses: 'keine', glassesColor: '#1a1a1a', hat: 'keine', hatColor: '#c02a2a', top: 'jacke', topColor: '#1e2f5a',
    pants: 'jeans', pantsColor: '#1e2f5a', shoeType: 'sneaker', shoes: '#1a1a1a', build: 'normal', height: 'mittel', scar: 'keine'
  };
  L.randomAppearance = function () {
    const a = {}, O = L.CHAR_OPTS;
    for (const k in O) a[k] = L.pick(O[k]);
    if (Math.random() < 0.55) a.hat = 'keine';
    if (Math.random() < 0.6) a.glasses = 'keine';
    if (Math.random() < 0.5) a.beard = 'kein';
    if (Math.random() < 0.8) a.scar = 'keine';
    // natürliche Haar- und Augenfarben bei NPCs bevorzugen
    if (Math.random() < 0.75) a.hairColor = L.pick(['#1a1a1a', '#4a2f1c', '#8a5a2b', '#d8b46a', '#a83a1c', '#7a7a7a']);
    if (Math.random() < 0.8) a.eyes = L.pick(['#4a2f1c', '#2a6ac0', '#3a8a3a', '#7a7a7a', '#1a1a1a']);
    return a;
  };

  // Frisuren – mit Volumen, Strähnen und Farbschattierungen; „covered“ = Kopfbedeckung verdeckt den Oberkopf
  function buildHair(head, A, covered) {
    const box = G().box, sph = G().sph, cone = G().cone, cyl = G().cyl, hc = A.hairColor;
    const dk = shade(hc, 0.72), lt = '#' + new T.Color(hc).lerp(new T.Color('#ffffff'), 0.2).getHexString(), ns = { noShadow: true }, H0 = 0.295;
    const fadeC = '#' + new T.Color(hc).lerp(new T.Color(A.skin), 0.55).getHexString();
    let seed = 7; for (const ch of String(A.hair)) seed = (seed * 31 + ch.charCodeAt(0)) % 2147483647;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const col = () => { const r = rnd(); return r < 0.5 ? hc : r < 0.8 ? dk : lt; };
    const B = (c, sx, sy, sz, x, y, z, rx, ry, rz, o) => { const m = part(box, c, sx, sy, sz, x, y, z, head, o); if (rx || ry || rz) m.rotation.set(rx || 0, ry || 0, rz || 0); return m; };
    const S = (c, rx, ry, rz, x, y, z) => part(sph, c, rx, ry, rz, x, y, z, head);
    // Oberkopf: Grundmasse + viele kleine Strähnen-Büschel (gibt Struktur statt einer flachen Platte)
    const crown = (h, o = {}) => {
      if (covered) return;
      const w = o.w || 0.282, d = o.d || 0.292, zc = o.z || -0.004;
      B(hc, w, h, d, 0, H0 + h / 2 - 0.014, zc);
      B(hc, w - 0.05, 0.022, d - 0.05, 0, H0 + h - 0.006, zc);
      const n = o.n || 16;
      for (let i = 0; i < n; i++) {
        const x = (rnd() - 0.5) * (w - 0.07), z = zc + (rnd() - 0.5) * (d - 0.07);
        B(col(), 0.045 + rnd() * 0.04, 0.026 + rnd() * (o.messy || 0.012), 0.07 + rnd() * 0.06, x, H0 + h - 0.004 + rnd() * 0.01, z, (o.sweep || 0) + (rnd() - 0.5) * 0.35, (o.yaw || 0) + (rnd() - 0.5) * 0.6, (rnd() - 0.5) * 0.35, ns);
      }
    };
    // Seiten über den Ohren (+ Koteletten vor dem Ohr)
    const sides = (len, o = {}) => {
      for (const s of [-1, 1]) {
        B(o.c || hc, 0.03, len, o.d || 0.215, s * 0.138, H0 - len / 2 + 0.006, o.z !== undefined ? o.z : -0.03);
        if (!o.noBurn) B(o.c || hc, 0.022, 0.08, 0.03, s * 0.135, H0 - len - 0.03, 0.07, 0, 0, 0, ns);
        if (o.strands) for (let k = 0; k < 4; k++) B(col(), 0.032, 0.04 + rnd() * 0.05, 0.045, s * 0.139, H0 - len - 0.005, -0.1 + k * 0.05, 0, 0, s * 0.08, ns);
      }
    };
    // Hinterkopf mit ungleichmäßigen Spitzen
    const back = (len, o = {}) => {
      B(o.c || hc, o.w || 0.284, len, 0.04, 0, H0 - len / 2 + 0.008, -0.142);
      if (o.jag !== false) for (let k = 0; k < 6; k++) B(o.c ? o.c : col(), 0.05, 0.03 + rnd() * 0.05, 0.042, -0.115 + k * 0.046, H0 - len - 0.004, -0.142, 0, 0, (rnd() - 0.5) * 0.3, ns);
    };
    // Stirnfransen aus einzelnen schrägen Strähnen
    const fringe = (len, o = {}) => {
      const n = o.n || 6, w = o.w || 0.26;
      for (let k = 0; k < n; k++) {
        const x = -w / 2 + (k + 0.5) * w / n + (o.shift || 0);
        B(k % 2 ? hc : col(), w / n + 0.012, len * (0.75 + rnd() * 0.35), 0.035, x, H0 - len / 2 + 0.01, 0.13 + (o.out || 0), -0.08, 0, (o.tilt || 0) + (rnd() - 0.5) * 0.2, ns);
      }
    };
    // Zopf / Strähne aus sich verjüngenden Gliedern (dir: [dx,dy,dz] je Glied)
    const tail = (x, y, z, n, w, dir, braid) => {
      for (let k = 0; k < n; k++) {
        const ww = w * (1 - k * 0.07);
        const m = B(braid ? (k % 2 ? hc : dk) : col(), ww, 0.07, ww * 0.9, x + dir[0] * k, y + dir[1] * k, z + dir[2] * k, braid ? 0 : (rnd() - 0.5) * 0.2, braid ? (k % 2 ? 0.5 : -0.5) : 0, braid ? (k % 2 ? 0.25 : -0.25) : 0);
        if (braid) m.scale.set(ww * 1.15, 0.075, ww * 0.95);
      }
      B(hc, w * 0.4, 0.06, w * 0.4, x + dir[0] * n, y + dir[1] * n + 0.01, z + dir[2] * n, 0, 0, 0, ns);
    };
    const tie = (x, y, z, c) => part(cyl, c || '#c02a2a', 0.035, 0.025, 0.035, x, y, z, head, ns);
    const curl = (x, y, z, r) => { S(col(), r, r * 1.1, r, x, y, z); S(dk, r * 0.55, r * 0.6, r * 0.55, x + r * 0.5, y - r * 0.4, z + r * 0.3); };
    const partLine = (x, len) => { if (!covered) B(shade(A.skin, 0.9), 0.008, 0.004, len, x, H0 + 0.05, 0.03, 0, 0, 0, ns); };
    switch (A.hair) {
      case 'kurz':
        crown(0.045); sides(0.12); back(0.17); fringe(0.04, { n: 6 });
        break;
      case 'buzz':
        B(dk, 0.262, 0.016, 0.272, 0, H0, -0.002, 0, 0, 0, ns);
        for (const s of [-1, 1]) B(dk, 0.008, 0.1, 0.2, s * 0.128, 0.245, -0.03, 0, 0, 0, ns);
        B(dk, 0.258, 0.13, 0.008, 0, 0.235, -0.133, 0, 0, 0, ns);
        B(dk, 0.2, 0.016, 0.008, 0, 0.283, 0.131, 0, 0, 0, ns);
        break;
      case 'fade':
        crown(0.055, { w: 0.262, d: 0.28, n: 14 }); fringe(0.035, { n: 5, w: 0.22 });
        for (const s of [-1, 1]) { B(hc, 0.012, 0.04, 0.22, s * 0.13, 0.275, -0.03, 0, 0, 0, ns); B(dk, 0.01, 0.04, 0.22, s * 0.128, 0.235, -0.03, 0, 0, 0, ns); B(fadeC, 0.008, 0.04, 0.2, s * 0.127, 0.198, -0.04, 0, 0, 0, ns); }
        B(hc, 0.26, 0.04, 0.012, 0, 0.275, -0.134, 0, 0, 0, ns); B(dk, 0.258, 0.04, 0.01, 0, 0.235, -0.132, 0, 0, 0, ns); B(fadeC, 0.256, 0.05, 0.008, 0, 0.19, -0.131, 0, 0, 0, ns);
        break;
      case 'seitenscheitel':
        crown(0.05, { yaw: 0.6 }); sides(0.13); back(0.17); partLine(-0.06, 0.2);
        if (!covered) { B(hc, 0.2, 0.05, 0.27, 0.035, H0 + 0.055, 0.005, 0, 0, -0.18); B(lt, 0.1, 0.02, 0.24, 0.05, H0 + 0.08, 0.01, 0, 0, -0.2, ns); }
        for (let k = 0; k < 4; k++) B(k % 2 ? hc : dk, 0.07, 0.05, 0.035, 0.09 - k * 0.055, H0 - 0.03 + k * 0.006, 0.135, -0.1, 0, -0.45, ns);
        break;
      case 'mittelscheitel':
        crown(0.05); sides(0.16, { strands: true }); back(0.2); partLine(0, 0.22);
        for (const s of [-1, 1]) { B(hc, 0.11, 0.09, 0.036, s * 0.068, H0 - 0.035, 0.134, -0.08, 0, s * 0.28, ns); B(dk, 0.04, 0.1, 0.038, s * 0.1, H0 - 0.05, 0.136, -0.08, 0, s * 0.2, ns); }
        break;
      case 'pony':
        crown(0.05); sides(0.15, { strands: true }); back(0.2);
        B(hc, 0.27, 0.06, 0.04, 0, 0.265, 0.13);
        for (let k = 0; k < 9; k++) B(k % 2 ? hc : dk, 0.034, 0.05 + rnd() * 0.025, 0.04, -0.12 + k * 0.03, 0.225, 0.133, -0.05, 0, 0, ns);
        break;
      case 'tolle':
        sides(0.1, { c: dk, d: 0.2 }); back(0.15, { c: dk, jag: false });
        if (!covered) {
          for (let k = 0; k < 5; k++) { const h = 0.05 + k * 0.022; B(k % 2 ? hc : lt, 0.25 - k * 0.012, h, 0.07, 0, H0 + h / 2 - 0.01, -0.12 + k * 0.06, -0.25 - k * 0.06); }
          B(lt, 0.2, 0.05, 0.06, 0.01, H0 + 0.13, 0.13, -0.6, 0, 0.05);
        } else fringe(0.03, { n: 5 });
        break;
      case 'zurueck':
        if (!covered) { B(hc, 0.278, 0.045, 0.29, 0, H0 + 0.008, -0.006); for (let k = -3; k <= 3; k++) B(k % 2 ? lt : dk, 0.012, 0.006, 0.27, k * 0.035, H0 + 0.032, -0.01, 0, 0, 0, ns); }
        sides(0.12, { noBurn: false }); back(0.2, { jag: false });
        B(hc, 0.24, 0.03, 0.03, 0, H0 - 0.005, 0.128, -0.5);
        break;
      case 'wuschel':
        crown(0.06, { n: 26, messy: 0.05 }); sides(0.15, { strands: true }); back(0.19);
        for (let k = 0; k < 7; k++) B(col(), 0.045, 0.06 + rnd() * 0.05, 0.035, -0.12 + k * 0.04, H0 - 0.035, 0.135, -0.15, 0, (rnd() - 0.5) * 0.7, ns);
        break;
      case 'stachel':
        sides(0.08); back(0.12);
        if (!covered) {
          B(hc, 0.27, 0.035, 0.28, 0, H0 + 0.01, 0);
          for (let i = 0; i < 18; i++) {
            const a = i * 2.39, r = 0.025 + Math.sqrt(i / 18) * 0.105, x = Math.cos(a) * r, z = Math.sin(a) * r - 0.01;
            const c = part(cone, i % 3 ? hc : lt, 0.032, 0.09 + rnd() * 0.05, 0.032, x, H0 + 0.07, z, head); c.rotation.set(z * 3.2, 0, -x * 3.2);
          }
        } else fringe(0.035);
        break;
      case 'undercut':
        B(dk, 0.258, 0.11, 0.268, 0, 0.235, 0, 0, 0, 0, ns);
        if (!covered) {
          B(hc, 0.21, 0.07, 0.29, 0.015, H0 + 0.03, 0.005, 0, 0, -0.06);
          for (let k = 0; k < 6; k++) B(col(), 0.05, 0.03, 0.26, -0.07 + k * 0.03, H0 + 0.07, 0.01, 0, 0, -0.15, ns);
          B(hc, 0.06, 0.14, 0.2, 0.135, 0.25, 0.04, 0, 0, -0.35);
        }
        break;
      case 'irokese':
        B(dk, 0.26, 0.012, 0.27, 0, H0, 0, 0, 0, 0, ns); for (const s of [-1, 1]) B(dk, 0.006, 0.1, 0.2, s * 0.127, 0.245, -0.03, 0, 0, 0, ns);
        if (!covered) for (let i = 0; i < 8; i++) { const h = 0.16 - Math.abs(i - 3) * 0.018; B(i % 2 ? hc : lt, 0.045, h, 0.05, 0, H0 + h / 2, 0.12 - i * 0.036, -0.25 + i * 0.07); }
        else B(hc, 0.05, 0.14, 0.05, 0, 0.2, -0.145);
        break;
      case 'kurzlocken':
        for (const s of [-1, 1]) { B(dk, 0.01, 0.06, 0.21, s * 0.129, 0.26, -0.03, 0, 0, 0, ns); B(fadeC, 0.008, 0.05, 0.2, s * 0.127, 0.2, -0.04, 0, 0, 0, ns); }
        B(dk, 0.258, 0.08, 0.01, 0, 0.25, -0.132, 0, 0, 0, ns);
        if (!covered) { B(hc, 0.25, 0.04, 0.26, 0, H0 + 0.005, 0); for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) { if (i * i + j * j > 11) continue; curl(i * 0.036 + (rnd() - 0.5) * 0.01, H0 + 0.035 + rnd() * 0.012, j * 0.037, 0.026); } }
        for (let k = -2; k <= 2; k++) curl(k * 0.045, 0.285, 0.128, 0.022);
        break;
      case 'locken':
        crown(0.04, { n: 0 }); B(hc, 0.282, 0.2, 0.05, 0, 0.2, -0.13);
        if (!covered) for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) { if (i * i + j * j > 12) continue; curl(i * 0.04, H0 + 0.035 + (3 - Math.abs(i)) * 0.004, j * 0.042, 0.032); }
        for (let k = -3; k <= 3; k++) curl(k * 0.04, 0.275, 0.128, 0.026);
        for (let i = 0; i < 12; i++) {
          const a = Math.PI * 0.42 + i * (Math.PI * 1.16 / 11), x = Math.sin(a) * 0.145, z = Math.cos(a) * 0.145 - 0.015;
          for (let k = 0; k < 5; k++) curl(x + Math.cos(k * 2) * 0.008, 0.265 - k * 0.05, z + Math.sin(k * 2) * 0.008, 0.032 - k * 0.002);
        }
        break;
      case 'wellig':
        crown(0.05); fringe(0.035, { n: 5 });
        for (let k = 0; k < 7; k++) B(k % 2 ? hc : dk, 0.284, 0.065, 0.05, (k % 2 ? 1 : -1) * 0.012, 0.29 - k * 0.058, -0.14 - (k % 2) * 0.01);
        for (const s of [-1, 1]) for (let k = 0; k < 6; k++) B(k % 2 ? hc : dk, 0.04, 0.065, 0.2, s * (0.14 + (k % 2) * 0.012), 0.28 - k * 0.058, -0.03);
        break;
      case 'lang':
        crown(0.05, { sweep: 0 }); partLine(0, 0.22);
        back(0.48); sides(0.34, { noBurn: true, strands: true });
        for (const s of [-1, 1]) { B(hc, 0.06, 0.24, 0.05, s * 0.115, 0.0, 0.085, 0, 0, s * 0.05); B(dk, 0.03, 0.2, 0.045, s * 0.09, -0.02, 0.1, 0, 0, s * 0.08, ns); }
        for (const s of [-1, 1]) B(hc, 0.08, 0.1, 0.035, s * 0.08, 0.25, 0.135, -0.08, 0, s * 0.6, ns);
        break;
      case 'bob':
        crown(0.06); back(0.25, { jag: false }); sides(0.26, { d: 0.235, noBurn: true });
        for (const s of [-1, 1]) B(dk, 0.05, 0.035, 0.235, s * 0.13, 0.045, -0.02, 0, 0, s * -0.4, ns);
        fringe(0.065, { n: 8 });
        break;
      case 'wolfcut':
        crown(0.06, { n: 24, messy: 0.04 }); fringe(0.07, { n: 7 });
        for (let k = 0; k < 3; k++) back(0.14 + k * 0.08, { w: 0.284 - k * 0.03 });
        sides(0.18, { strands: true, noBurn: true });
        break;
      case 'mullet':
        crown(0.045); sides(0.1, { c: dk }); fringe(0.035);
        B(hc, 0.24, 0.32, 0.05, 0, 0.16, -0.14); for (let k = 0; k < 5; k++) B(col(), 0.05, 0.06, 0.05, -0.1 + k * 0.05, -0.01, -0.145, 0, 0, (rnd() - 0.5) * 0.4, ns);
        break;
      case 'emo':
        crown(0.05, { yaw: -0.5 }); back(0.22); sides(0.18, { strands: true });
        B(hc, 0.2, 0.17, 0.04, 0.03, 0.2, 0.137, -0.05, 0, -0.2); B(dk, 0.06, 0.15, 0.042, 0.09, 0.17, 0.14, -0.05, 0, -0.15, ns);
        break;
      case 'zopf':
        crown(0.04, { n: 8, sweep: 0 }); sides(0.13, { noBurn: true }); back(0.15, { jag: false }); fringe(0.03, { n: 5 });
        tie(0, 0.2, -0.165); tail(0, 0.15, -0.18, 6, 0.07, [0, -0.055, -0.006]);
        break;
      case 'hoherzopf':
        crown(0.04, { n: 8 }); sides(0.13, { noBurn: true }); back(0.15, { jag: false });
        if (!covered) { tie(0, H0 + 0.04, -0.12); tail(0, H0 + 0.02, -0.16, 7, 0.07, [0, -0.05, -0.012]); } else { tie(0, 0.2, -0.165); tail(0, 0.15, -0.18, 6, 0.07, [0, -0.055, -0.006]); }
        break;
      case 'flechtzopf':
        crown(0.04, { n: 8 }); sides(0.13, { noBurn: true }); back(0.16, { jag: false }); fringe(0.03, { n: 5 });
        tail(0, 0.16, -0.17, 10, 0.065, [0, -0.052, -0.004], true); tie(0, 0.16 - 0.052 * 10 + 0.04, -0.17 - 0.04);
        break;
      case 'zoepfe':
        crown(0.04, { n: 8 }); partLine(0, 0.22); back(0.13); fringe(0.035, { n: 6 });
        for (const s of [-1, 1]) { tail(s * 0.145, 0.19, 0.0, 7, 0.055, [s * 0.004, -0.048, 0], true); tie(s * 0.15, 0.19 - 7 * 0.048 + 0.04, 0, '#2a6ac0'); }
        break;
      case 'dutt':
        crown(0.04, { n: 8 }); sides(0.12, { noBurn: true }); back(0.15, { jag: false }); fringe(0.03, { n: 5 });
        S(hc, 0.085, 0.075, 0.085, 0, covered ? 0.2 : H0 + 0.07, covered ? -0.17 : -0.09);
        for (let k = 0; k < 6; k++) { const a = k * 1.05; B(dk, 0.03, 0.02, 0.07, Math.cos(a) * 0.05, (covered ? 0.2 : H0 + 0.07) + 0.03, (covered ? -0.17 : -0.09) + Math.sin(a) * 0.05, 0, a, 0.4, ns); }
        break;
      case 'doppeldutt':
        crown(0.04, { n: 8 }); partLine(0, 0.22); sides(0.12, { noBurn: true }); back(0.15); fringe(0.035, { n: 6 });
        for (const s of [-1, 1]) { S(hc, 0.065, 0.06, 0.065, s * 0.1, covered ? 0.24 : H0 + 0.05, -0.04); S(dk, 0.04, 0.035, 0.04, s * 0.1, (covered ? 0.24 : H0 + 0.05) + 0.04, -0.04); }
        break;
      case 'manbun':
        B(dk, 0.258, 0.1, 0.268, 0, 0.24, 0, 0, 0, 0, ns);
        if (!covered) { B(hc, 0.23, 0.045, 0.28, 0, H0 + 0.012, -0.004); for (let k = -2; k <= 2; k++) B(lt, 0.012, 0.006, 0.26, k * 0.04, H0 + 0.036, -0.01, 0, 0, 0, ns); }
        S(hc, 0.06, 0.055, 0.06, 0, covered ? 0.21 : H0 + 0.03, covered ? -0.16 : -0.13); tie(0, (covered ? 0.21 : H0 + 0.03) - 0.01, covered ? -0.13 : -0.1, dk);
        break;
      case 'cornrows':
        B(dk, 0.258, 0.012, 0.268, 0, H0, 0, 0, 0, 0, ns);
        for (let k = -3; k <= 3; k++) { const m = B(k % 2 ? hc : lt, 0.022, 0.02, 0.29, k * 0.036, H0 + 0.01, -0.005, 0, 0, 0); m.rotation.z = 0; for (let j = 0; j < 6; j++) B(dk, 0.024, 0.008, 0.006, k * 0.036, H0 + 0.02, -0.12 + j * 0.05, 0, 0, 0, ns); }
        for (let k = -3; k <= 3; k++) B(k % 2 ? hc : dk, 0.022, 0.16, 0.022, k * 0.036, 0.2, -0.142, 0.1);
        break;
      case 'twists':
        crown(0.035, { n: 0 }); sides(0.1, { noBurn: true }); back(0.13, { jag: false });
        if (!covered) for (let i = 0; i < 26; i++) { const a = i * 2.39, r = 0.02 + Math.sqrt(i / 26) * 0.11, x = Math.cos(a) * r, z = Math.sin(a) * r - 0.01; const c = part(cyl, i % 2 ? hc : dk, 0.02, 0.085, 0.02, x, H0 + 0.06, z, head); c.rotation.set(z * 2.5, 0, -x * 2.5); }
        for (let k = -3; k <= 3; k++) { const c = part(cyl, k % 2 ? hc : dk, 0.02, 0.07, 0.02, k * 0.036, 0.275, 0.13, head); c.rotation.x = 0.6; }
        break;
      case 'dreads':
        crown(0.045, { n: 0 });
        for (let i = 0; i < 16; i++) {
          const a = Math.PI * 0.38 + i * (Math.PI * 1.24 / 15), x = Math.sin(a) * 0.148, z = Math.cos(a) * 0.148 - 0.015, len = 0.26 + rnd() * 0.12;
          const d = part(cyl, i % 3 === 0 ? lt : i % 2 ? hc : dk, 0.024, len, 0.024, x * 1.04, 0.29 - len / 2, z * 1.04, head); d.rotation.set(-z * 0.5, 0, x * 0.5);
          part(sph, dk, 0.026, 0.03, 0.026, x * 1.04 + x * 0.5 * len / 2 * -0.0, 0.29 - len, z * 1.04, head, ns);
        }
        if (!covered) for (let i = 0; i < 9; i++) { const a = i * 0.7; B(i % 2 ? hc : dk, 0.03, 0.025, 0.13, Math.cos(a) * 0.06, H0 + 0.045, Math.sin(a) * 0.06, 0, a, 0); }
        break;
      default: // Glatze: nur ein kleiner Glanzpunkt
        part(box, shade(A.skin, 1.12), 0.06, 0.004, 0.06, -0.03, 0.296, 0.02, head, ns);
    }
  }

  // Exklusive Skins: Der Wächter, Viktor, Daniel, Richard
  L.GUARD_APP = { name: 'Der Wächter', skin: '#c98e65', hair: 'kurz', hairColor: '#1a1a1a', top: 'anzug', topColor: '#1a1a24', pants: 'anzughose', pantsColor: '#1a1a24', shoeType: 'stiefel', shoes: '#1a1a1a', build: 'muskuloes', height: 'gross', glasses: 'skibrille', glassesColor: '#2a2a3a', hat: 'keine', beard: 'kein', mouth: 'ernst', brows: 'boese' };
  L.SKINS = [['', '🙂 Eigener'], ['waechter', '🛡️ Der Wächter'], ['viktor', '🧟 Viktor'], ['daniel', '👮 Daniel'], ['richard', '💪 Richard']];
  // Der Wächter-Skin ist gesperrt: nur wer den geheimen Freischalt-Link geöffnet hat, darf ihn tragen (auch online geprüft)
  L.hash53 = function (str) { let h1 = 0xdeadbeef, h2 = 0x41c6ce57; for (let i = 0, ch; i < str.length; i++) { ch = str.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); } h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909); h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909); return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36); };
  const WK = 'ofaw0xb94x';
  L.waechterOk = (app) => !!(app && typeof app.wk === 'string' && L.hash53(app.wk) === WK);
  L.waechterToken = () => { const k = L.save && L.save.skinKey; return k && L.hash53(L.hash53(k)) === WK ? L.hash53(k) : null; };
  function buildSpecial(app, force) {
    const sp = app.special;
    if (sp === 'richard') { const r = L.buildHuman(Object.assign({}, L.RICHARD_APP || {}, { name: app.name })); r.app = Object.assign({}, r.app, { special: 'richard' }); return r; }
    if (sp === 'waechter' && !force && !L.waechterOk(app)) return L.buildHuman(Object.assign({}, app, { special: '' }));
    if (sp === 'waechter') {
      const r = L.buildHuman(Object.assign({}, L.GUARD_APP, { name: app.name }));
      // kompletter Umhang: hängt an den Schultern und reicht bis zu den Knöcheln
      const cape = grp(r.torso, 0, 0.6, -0.2), cc = '#5a0a14', ci = '#3a0610';
      part(G().box, cc, 0.6, 0.75, 0.03, 0, -0.375, 0, cape); part(G().box, ci, 0.58, 0.73, 0.01, 0, -0.375, 0.02, cape, { noShadow: true });
      part(G().box, cc, 0.72, 0.72, 0.03, 0, -1.1, -0.01, cape); part(G().box, ci, 0.7, 0.7, 0.01, 0, -1.1, 0.01, cape, { noShadow: true });
      for (let k = -2; k <= 2; k++) part(G().box, '#4a0812', 0.025, 1.4, 0.035, k * 0.13, -0.75, -0.012, cape, { noShadow: true });
      for (const s2 of [-1, 1]) { part(G().box, cc, 0.16, 0.06, 0.3, s2 * 0.25, 0.01, 0.12, cape); part(G().sph, '#ffd040', 0.04, 0.04, 0.02, s2 * 0.2, -0.02, 0.27, cape, { noShadow: true }); }
      r.torso.add(cape); r.cape = cape;
      const em = new T.Mesh(new T.CircleGeometry(0.1, 16), new T.MeshBasicMaterial({ color: 0xffd040 })); em.position.set(0, 0.45, 0.14); r.torso.add(em);
      r.app = Object.assign({}, r.app, { special: 'waechter' }); return r;
    }
    const r = sp === 'viktor' ? L.buildViktor('grey') : L.buildDaniel();
    r.hipY = r.hips.position.y;
    const hand = new T.Group(); hand.position.set(0, sp === 'viktor' ? -0.75 : -0.55, 0.05); r.arms[0].elbow.add(hand); r.hand = hand;
    r.held = null; r.heldType = null; r.app = Object.assign({}, L.DEFAULT_CHAR, app); r.monsterKind = r.kind; r.kind = 'human';
    r.root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    return r;
  }
  // Muster für Camo- und Karo-Hosen
  function patt(g, w, h, d, y, kind, s) {
    const c0 = L.mat; const pcs = [];
    if (kind === 'camo') for (let k = 0; k < 5; k++) { const yy = y + (k / 4 - 0.5) * h * 0.8, ww = w * (0.35 + ((k * 37 + (s > 0 ? 11 : 0)) % 5) * 0.08); pcs.push(part(G().box, k % 2 ? '#3a4a2a' : '#6a5a3a', ww, h * 0.14, d * 1.03, ((k * 13) % 3 - 1) * w * 0.2, yy, 0, g, { noShadow: true })); }
    else { for (let k = 0; k < 4; k++) part(G().box, '#1a1a1a', w * 1.03, 0.012, d * 1.03, 0, y + (k / 3 - 0.5) * h * 0.85, 0, g, { noShadow: true }); for (const xx of [-0.3, 0.3]) part(G().box, '#1a1a1a', 0.012, h, d * 1.03, xx * w, y, 0, g, { noShadow: true }); }
    return pcs;
  }
  L.buildHuman = function (app, force) {
    if (app && app.special && (app.special === 'viktor' || app.special === 'daniel' || app.special === 'richard' || app.special === 'waechter')) return buildSpecial(app, force);
    const A = Object.assign({}, L.DEFAULT_CHAR, app || {});
    const bw = { duenn: 0.75, schmal: 0.87, normal: 1, kraeftig: 1.2, muskuloes: 1.32, extrem: 1.8 }[A.build] || 1;
    const hs = { sehr_klein: 0.85, klein: 0.92, mittel: 1, gross: 1.08, sehr_gross: 1.15 }[A.height] || 1;
    const root = new T.Group(), body = grp(root), hips = grp(body, 0, 0.95, 0);
    const box = G().box, sph = G().sph, cyl = G().cyl, cone = G().cone;
    const skin = A.skin, hc = A.hairColor, tc = A.topColor, pc = A.pantsColor, sc = A.shoes, ns = { noShadow: true };
    const legs = [], arms = [];

    // ---- Beine, Hose, Schuhe ----
    for (const s of [-1, 1]) {
      const leg = grp(hips, s * 0.11 * bw, 0, 0);
      const PT = A.pants, baggy = PT === 'baggy' || PT === 'baggycargo', skinny = PT === 'skinny';
      const lw = baggy ? 1.5 : skinny ? 0.86 : 1;
      part(box, PT === 'rock' ? skin : pc, 0.16 * bw * lw, 0.46, 0.17 * bw * lw, 0, -0.23, 0, leg);
      if (PT === 'camo' || PT === 'karo') patt(leg, 0.16 * bw, 0.46, 0.17 * bw, -0.23, PT, s);
      if (PT === 'baggycargo') part(box, shade(pc, 0.72), 0.035, 0.14, 0.12, s * 0.108 * bw, -0.27, 0, leg);
      if (baggy) for (let k = 0; k < 3; k++) part(box, shade(pc, 0.82), 0.244 * bw, 0.012, 0.258 * bw, 0, -0.08 - k * 0.13, 0, leg, ns);
      if (A.pants === 'cargo') part(box, shade(pc, 0.72), 0.03, 0.12, 0.1, s * 0.085 * bw, -0.26, 0, leg);
      if (A.pants === 'jogging') part(box, '#f2f2f2', 0.012, 0.46, 0.02, s * 0.081 * bw, -0.23, 0, leg, ns);
      if (A.pants === 'anzughose') part(box, shade(pc, 0.7), 0.008, 0.46, 0.005, 0, -0.23, 0.086 * bw, leg, ns);
      const knee = grp(leg, 0, -0.46, 0);
      const shortP = A.pants === 'kurz' || A.pants === 'rock';
      part(box, shortP ? skin : pc, 0.14 * bw * lw, 0.44, 0.15 * bw * lw, 0, -0.22, 0, knee);
      if (A.pants === 'camo' || A.pants === 'karo') patt(knee, 0.14 * bw, 0.44, 0.15 * bw, -0.22, A.pants, s);
      if (A.pants === 'cargoshorts') { part(box, skin, 0.13 * bw, 0.3, 0.14 * bw, 0, -0.29, 0, knee); part(box, pc, 0.18 * bw, 0.16, 0.19 * bw, 0, -0.06, 0, knee); part(box, shade(pc, 0.72), 0.03, 0.08, 0.09, s * 0.095 * bw, -0.06, 0, knee); }
      if (baggy) { part(box, shade(pc, 0.85), 0.25 * bw, 0.08, 0.27 * bw, 0, -0.36, 0.01, knee); part(box, pc, 0.24 * bw, 0.06, 0.28 * bw, 0, -0.43, 0.025, knee); part(box, shade(pc, 0.8), 0.215 * bw, 0.012, 0.23 * bw, 0, -0.18, 0, knee, ns); part(box, shade(pc, 0.8), 0.215 * bw, 0.012, 0.23 * bw, 0, -0.28, 0, knee, ns); }
      if (A.pants === 'schlag') part(box, pc, 0.21 * bw, 0.14, 0.22 * bw, 0, -0.38, 0.01, knee);
      if (A.pants === 'kurz') part(box, pc, 0.15 * bw, 0.06, 0.16 * bw, 0, -0.01, 0, knee);
      if (A.pants === 'jogging') { part(box, shade(pc, 0.8), 0.15 * bw, 0.05, 0.16 * bw, 0, -0.41, 0, knee); part(box, '#f2f2f2', 0.012, 0.36, 0.02, s * 0.071 * bw, -0.2, 0, knee, ns); }
      if (A.pants === 'cargo') part(box, shade(pc, 0.72), 0.03, 0.1, 0.09, s * 0.075 * bw, -0.15, 0, knee);
      if (A.pants === 'zerrissen') { part(box, skin, 0.08, 0.05, 0.01, 0.01, -0.03, 0.077 * bw, knee, ns); part(box, skin, 0.05, 0.03, 0.01, -0.02, 0.18, 0.086 * bw, leg, ns); }
      const st = A.shoeType;
      if (st === 'barfuss') part(box, skin, 0.13 * bw, 0.07, 0.24, 0, -0.475, 0.05, knee);
      else if (st === 'sandale') { part(box, skin, 0.13 * bw, 0.06, 0.23, 0, -0.47, 0.05, knee); part(box, sc, 0.15 * bw, 0.025, 0.26, 0, -0.505, 0.05, knee); part(box, sc, 0.14 * bw, 0.02, 0.03, 0, -0.455, 0.09, knee, ns); }
      else if (st === 'stiefel') { part(box, sc, 0.155 * bw, 0.2, 0.17 * bw, 0, -0.39, 0, knee); part(box, sc, 0.15 * bw, 0.1, 0.28, 0, -0.47, 0.05, knee); part(box, shade(sc, 0.6), 0.16 * bw, 0.03, 0.29, 0, -0.51, 0.05, knee); }
      else if (st === 'hightop') { part(box, sc, 0.155 * bw, 0.16, 0.18 * bw, 0, -0.41, 0.01, knee); part(box, sc, 0.15 * bw, 0.1, 0.27, 0, -0.47, 0.05, knee); part(box, '#f2f2f2', 0.16 * bw, 0.03, 0.28, 0, -0.51, 0.05, knee); }
      else if (st === 'chunky') { part(box, sc, 0.16 * bw, 0.11, 0.29, 0, -0.46, 0.05, knee); part(box, '#f2f2f2', 0.175 * bw, 0.07, 0.31, 0, -0.52, 0.05, knee); part(box, shade(sc, 0.7), 0.165 * bw, 0.02, 0.1, 0, -0.42, 0.12, knee, ns); }
      else if (st === 'skate') { part(box, sc, 0.165 * bw, 0.09, 0.28, 0, -0.475, 0.05, knee); part(box, '#f2f2f2', 0.17 * bw, 0.035, 0.29, 0, -0.515, 0.05, knee); part(box, '#f2f2f2', 0.168 * bw, 0.02, 0.15, 0, -0.45, 0.0, knee, ns); }
      else if (st === 'lackschuh') { part(box, sc, 0.14 * bw, 0.08, 0.27, 0, -0.48, 0.05, knee); part(box, '#ffffff', 0.05, 0.01, 0.06, 0.02, -0.438, 0.12, knee, { basic: true, noShadow: true, opacity: 0.35 }); }
      else { part(box, sc, 0.15 * bw, 0.1, 0.27, 0, -0.47, 0.05, knee); part(box, '#f2f2f2', 0.16 * bw, 0.03, 0.28, 0, -0.51, 0.05, knee); }
      legs.push({ leg, knee });
    }

    if (A.pants === 'baggy' || A.pants === 'baggycargo') { part(box, pc, 0.48 * bw, 0.2, 0.26 * bw, 0, -0.06, 0, hips); part(box, '#f2f2f2', 0.43 * bw, 0.03, 0.24 * bw, 0, 0.035, 0, hips, ns); for (let k = -2; k <= 2; k++) part(box, '#2a6ac0', 0.02, 0.031, 0.245 * bw, k * 0.07 * bw, 0.035, 0, hips, ns); }
    if (A.pants === 'rock') { part(box, pc, 0.44 * bw, 0.32, 0.27 * bw, 0, -0.14, 0, hips); part(box, shade(pc, 0.8), 0.46 * bw, 0.04, 0.29 * bw, 0, -0.29, 0, hips); for (let k = -2; k <= 2; k++) part(box, shade(pc, 0.8), 0.01, 0.3, 0.275 * bw, k * 0.08 * bw, -0.14, 0, hips, ns); }
    // ---- Oberkörper ----
    const torso = grp(hips);
    const TP = A.top, fz = 0.126 * bw;
    const coat = TP === 'lederjacke' ? shade(tc, 0.85) : tc;
    const shirtUnder = '#e8e2d4';
    const big = TP === 'oversize' ? 1.12 : TP === 'puffer' ? 1.16 : 1;
    part(box, TP === 'weste' ? shirtUnder : coat, 0.44 * bw * big, TP === 'oversize' ? 0.68 : 0.6, 0.25 * bw * big, 0, TP === 'oversize' ? 0.27 : 0.31, 0, torso);
    part(box, '#1c1c1c', 0.45 * bw, 0.06, 0.26 * bw, 0, 0.03, 0, torso);
    if (A.build === 'muskuloes' && (TP === 'tanktop' || TP === 'tshirt' || TP === 'trikot')) for (const s of [-1, 1]) part(box, shade(coat, 0.85), 0.17 * bw, 0.1, 0.01, s * 0.1 * bw, 0.47, fz + 0.002, torso, ns);
    switch (TP) {
      case 'tshirt': part(box, shade(tc, 0.8), 0.14, 0.03, 0.01, 0, 0.59, fz + 0.002, torso, ns); break;
      case 'oversize':
        part(box, shade(tc, 0.8), 0.16, 0.03, 0.01, 0, 0.59, fz * 1.12 + 0.002, torso, ns);
        part(box, shade(tc, 1.2), 0.16, 0.14, 0.01, 0, 0.38, fz * 1.12 + 0.003, torso, ns);
        part(box, shade(tc, 0.7), 0.1, 0.06, 0.012, 0, 0.38, fz * 1.12 + 0.005, torso, ns);
        break;
      case 'polo':
        for (const s of [-1, 1]) { const c = part(box, shade(tc, 0.85), 0.09, 0.05, 0.02, s * 0.045, 0.59, fz + 0.005, torso, ns); c.rotation.z = s * 0.45; }
        for (let k = 0; k < 2; k++) part(box, '#f2f2f2', 0.014, 0.014, 0.01, 0, 0.53 - k * 0.06, fz + 0.004, torso, ns);
        part(box, '#f2f2f2', 0.04, 0.03, 0.006, 0.09 * bw, 0.47, fz + 0.003, torso, ns);
        break;
      case 'flanell':
        for (let k = 0; k < 5; k++) part(box, shade(tc, 0.6), 0.442 * bw, 0.025, 0.252 * bw, 0, 0.1 + k * 0.11, 0, torso, ns);
        for (let k = -2; k <= 2; k++) part(box, shade(tc, 0.6), 0.025, 0.6, 0.252 * bw, k * 0.085 * bw, 0.31, 0, torso, ns);
        for (const s of [-1, 1]) { const c = part(box, shade(tc, 1.15), 0.08, 0.05, 0.02, s * 0.04, 0.58, fz + 0.005, torso, ns); c.rotation.z = s * 0.5; }
        for (let k = 0; k < 4; k++) part(box, '#e8e2d4', 0.015, 0.015, 0.01, 0, 0.5 - k * 0.11, fz + 0.006, torso, ns);
        break;
      case 'trainingsjacke':
        part(box, '#c8c8c8', 0.012, 0.56, 0.01, 0, 0.32, fz + 0.002, torso, ns);
        part(box, shade(tc, 0.8), 0.2, 0.06, 0.27 * bw, 0, 0.6, 0, torso);
        for (const s of [-1, 1]) part(box, '#f2f2f2', 0.015, 0.6, 0.255 * bw, s * 0.205 * bw, 0.31, 0, torso, ns);
        break;
      case 'puffer':
        for (let k = 0; k < 5; k++) part(box, shade(tc, 0.78), 0.45 * bw * big, 0.015, 0.255 * bw * big, 0, 0.08 + k * 0.12, 0, torso, ns);
        part(box, shade(tc, 0.9), 0.3, 0.1, 0.3 * bw, 0, 0.62, 0, torso);
        part(box, '#c8c8c8', 0.012, 0.56, 0.01, 0, 0.32, fz * 1.16 + 0.003, torso, ns);
        break;
      case 'mantel':
        part(box, tc, 0.46 * bw, 0.42, 0.27 * bw, 0, -0.2, 0, hips);
        for (const s of [-1, 1]) { const l = part(box, shade(tc, 0.8), 0.07, 0.3, 0.012, s * 0.08, 0.45, fz + 0.005, torso, ns); l.rotation.z = s * 0.3; }
        for (let k = 0; k < 3; k++) for (const s of [-1, 1]) part(box, '#1a1a1a', 0.018, 0.018, 0.01, s * 0.06, 0.32 - k * 0.12, fz + 0.004, torso, ns);
        part(box, shade(tc, 0.7), 0.46 * bw, 0.04, 0.28 * bw, 0, 0.12, 0, torso);
        break;
      case 'tanktop':
        for (const s of [-1, 1]) part(box, skin, 0.1 * bw, 0.09, 0.26 * bw, s * 0.17 * bw, 0.565, 0, torso);
        part(box, skin, 0.12, 0.08, 0.01, 0, 0.56, fz + 0.002, torso, ns);
        break;
      case 'hemd':
        for (const s of [-1, 1]) { const c = part(box, shade(tc, 1.15), 0.08, 0.05, 0.02, s * 0.04, 0.58, fz + 0.005, torso, ns); c.rotation.z = s * 0.5; }
        for (let k = 0; k < 4; k++) part(box, '#f2f2f2', 0.015, 0.015, 0.01, 0, 0.5 - k * 0.11, fz + 0.004, torso, ns);
        part(box, shade(tc, 0.75), 0.008, 0.52, 0.006, 0, 0.32, fz + 0.002, torso, ns);
        break;
      case 'pullover':
        part(box, shade(tc, 0.75), 0.16, 0.035, 0.01, 0, 0.6, fz + 0.002, torso, ns);
        part(box, shade(tc, 0.75), 0.45 * bw, 0.06, 0.26 * bw, 0, 0.06, 0, torso);
        for (let k = -2; k <= 2; k++) part(box, shade(tc, 0.88), 0.012, 0.4, 0.004, k * 0.06 * bw, 0.33, fz + 0.002, torso, ns);
        break;
      case 'hoodie':
        part(box, shade(tc, 0.85), 0.3, 0.2, 0.12, 0, 0.62, -0.16 * bw, torso);
        part(box, shade(tc, 0.7), 0.24 * bw, 0.14, 0.02, 0, 0.18, fz + 0.002, torso);
        for (const s of [-1, 1]) part(box, '#f2f2f2', 0.008, 0.1, 0.008, s * 0.04, 0.52, fz + 0.006, torso, ns);
        break;
      case 'jacke':
        part(box, shade(tc, 0.6), 0.02, 0.56, 0.01, 0, 0.32, fz + 0.002, torso, ns);
        part(box, shade(tc, 0.8), 0.46 * bw, 0.07, 0.27 * bw, 0, 0.6, 0, torso);
        for (const s of [-1, 1]) part(box, shade(tc, 0.7), 0.08, 0.06, 0.01, s * 0.12 * bw, 0.2, fz + 0.003, torso, ns);
        break;
      case 'lederjacke':
        for (const s of [-1, 1]) { const l = part(box, shade(coat, 0.7), 0.1, 0.22, 0.015, s * 0.07, 0.5, fz + 0.004, torso, ns); l.rotation.z = s * 0.35; }
        { const z = part(box, '#c8c8c8', 0.01, 0.45, 0.008, 0.03, 0.3, fz + 0.006, torso, ns); z.rotation.z = 0.12; }
        break;
      case 'regenjacke':
        part(box, shade(tc, 0.85), 0.3, 0.1, 0.28 * bw, 0, 0.62, 0, torso);
        part(box, shade(tc, 0.6), 0.02, 0.5, 0.01, 0, 0.34, fz + 0.002, torso, ns);
        for (const s of [-1, 1]) { part(box, shade(tc, 0.75), 0.1, 0.08, 0.012, s * 0.12 * bw, 0.18, fz + 0.004, torso, ns); part(box, '#f2f2f2', 0.008, 0.1, 0.008, s * 0.04, 0.55, fz + 0.008, torso, ns); }
        break;
      case 'weste':
        for (const s of [-1, 1]) part(box, tc, 0.19 * bw, 0.55, 0.27 * bw, s * 0.125 * bw, 0.32, 0, torso);
        part(box, tc, 0.44 * bw, 0.55, 0.02, 0, 0.32, -0.125 * bw, torso);
        for (let k = 0; k < 3; k++) part(box, '#d8b46a', 0.015, 0.015, 0.01, 0.035, 0.42 - k * 0.1, fz + 0.012, torso, ns);
        break;
      case 'anzug':
        part(box, shirtUnder, 0.12, 0.3, 0.01, 0, 0.45, fz + 0.002, torso, ns);
        part(box, '#8a1a1a', 0.04, 0.28, 0.012, 0, 0.44, fz + 0.006, torso, ns);
        for (const s of [-1, 1]) { const l = part(box, shade(tc, 0.75), 0.06, 0.26, 0.012, s * 0.08, 0.46, fz + 0.005, torso, ns); l.rotation.z = s * 0.3; }
        for (let k = 0; k < 2; k++) part(box, '#1a1a1a', 0.015, 0.015, 0.01, 0.03, 0.22 - k * 0.08, fz + 0.004, torso, ns);
        break;
      case 'trikot':
        for (const s of [-1, 1]) part(box, '#f2f2f2', 0.035, 0.6, 0.256 * bw, s * 0.16 * bw, 0.31, 0, torso, ns);
        part(box, '#f2f2f2', 0.06, 0.12, 0.01, -0.035, 0.38, fz + 0.003, torso, ns);
        part(box, '#f2f2f2', 0.06, 0.12, 0.01, 0.045, 0.38, fz + 0.003, torso, ns);
        part(box, tc, 0.025, 0.08, 0.012, 0.045, 0.38, fz + 0.006, torso, ns);
        break;
      case 'kittel':
        part(box, tc, 0.46 * bw, 0.3, 0.27 * bw, 0, -0.13, 0, hips);
        part(box, shade(tc, 0.8), 0.015, 0.8, 0.006, 0, 0.17, fz + 0.004, torso, ns);
        for (let k = 0; k < 4; k++) part(box, shade(tc, 0.6), 0.016, 0.016, 0.01, 0.025, 0.5 - k * 0.14, fz + 0.006, torso, ns);
        for (const s of [-1, 1]) part(box, shade(tc, 0.85), 0.09, 0.07, 0.01, s * 0.12 * bw, 0.15, fz + 0.004, torso, ns);
        break;
    }

    if (A.pants === 'latzhose') {
      part(box, pc, 0.26 * bw, 0.3, 0.02, 0, 0.2, fz + 0.012, torso);
      part(box, shade(pc, 0.75), 0.1, 0.07, 0.01, 0, 0.24, fz + 0.024, torso, ns);
      for (const s of [-1, 1]) { part(box, pc, 0.045, 0.32, 0.02, s * 0.1 * bw, 0.46, fz + 0.012, torso); part(box, pc, 0.045, 0.62, 0.02, s * 0.1 * bw, 0.31, -0.126 * bw - 0.01, torso); part(box, '#d8b46a', 0.03, 0.03, 0.01, s * 0.1 * bw, 0.34, fz + 0.024, torso, ns); }
      part(box, pc, 0.45 * bw, 0.1, 0.26 * bw, 0, 0.06, 0, torso);
    }
    // ---- Arme mit passenden Ärmeln ----
    const sleeve = { tshirt: 'short', trikot: 'short', tanktop: 'none', weste: 'short', oversize: 'short', polo: 'short' }[TP] || 'long';
    const slc = TP === 'weste' ? shirtUnder : coat;
    let hand = null;
    for (const s of [-1, 1]) {
      const arm = grp(torso, s * (0.22 * bw + 0.06), 0.55, 0);
      if (sleeve === 'long') part(box, slc, 0.12 * bw, 0.32, 0.13 * bw, 0, -0.16, 0, arm);
      else if (sleeve === 'short') { part(box, slc, (TP === 'oversize' ? 0.16 : 0.125) * bw, TP === 'oversize' ? 0.27 : 0.15, (TP === 'oversize' ? 0.17 : 0.135) * bw, 0, TP === 'oversize' ? -0.12 : -0.075, 0, arm); part(box, skin, 0.105 * bw, 0.18, 0.115 * bw, 0, -0.23, 0, arm); }
      else part(box, skin, 0.105 * bw, 0.32, 0.115 * bw, 0, -0.16, 0, arm);
      const elbow = grp(arm, 0, -0.32, 0);
      part(box, sleeve === 'long' ? slc : skin, 0.11 * bw, 0.3, 0.12 * bw, 0, -0.15, 0, elbow);
      if (sleeve === 'long' && (TP === 'pullover' || TP === 'hoodie' || TP === 'regenjacke' || TP === 'trainingsjacke')) part(box, shade(slc, 0.75), 0.115 * bw, 0.04, 0.125 * bw, 0, -0.28, 0, elbow);
      if (TP === 'trainingsjacke') { part(box, '#f2f2f2', 0.016, 0.32, 0.13 * bw, s * 0.062 * bw, -0.16, 0, arm, ns); part(box, '#f2f2f2', 0.016, 0.26, 0.125 * bw, s * 0.057 * bw, -0.13, 0, elbow, ns); }
      if (TP === 'puffer') { part(box, slc, 0.15 * bw, 0.3, 0.16 * bw, 0, -0.16, 0, arm); for (let k = 0; k < 3; k++) part(box, shade(slc, 0.78), 0.155 * bw, 0.012, 0.165 * bw, 0, -0.05 - k * 0.1, 0, arm, ns); }
      if (TP === 'flanell') for (let k = 0; k < 3; k++) part(box, shade(slc, 0.6), 0.123 * bw, 0.02, 0.133 * bw, 0, -0.06 - k * 0.1, 0, arm, ns);
      part(box, skin, 0.09, 0.1, 0.1, 0, -0.34, 0, elbow);
      arms.push({ arm, elbow });
      if (s === -1) hand = grp(elbow, 0, -0.36, 0.03);
    }

    // extremer Muskel-Körperbau: Bizeps, Schultern, Brust, Nacken, Bauchmuskeln
    if (A.build === 'extrem') {
      for (const a of arms) {
        part(sph, sleeve === 'long' ? slc : skin, 0.11, 0.13, 0.12, 0, -0.14, 0.05, a.arm);
        part(sph, sleeve === 'long' ? slc : skin, 0.13, 0.12, 0.13, 0, -0.02, 0, a.arm);
        part(sph, skin, 0.09, 0.12, 0.09, 0, -0.08, 0.03, a.elbow);
      }
      const chest = TP === 'tanktop' ? coat : coat;
      for (const s2 of [-1, 1]) {
        part(sph, chest, 0.17 * bw * 0.6, 0.12, 0.08, s2 * 0.1 * bw, 0.45, fz + 0.02, torso);
        part(sph, skin, 0.09, 0.07, 0.12, s2 * 0.13 * bw, 0.62, -0.02, torso);
      }
      if (TP === 'tanktop') for (let k = 0; k < 3; k++) for (const s2 of [-1, 1]) part(box, shade(coat, 0.8), 0.07, 0.05, 0.02, s2 * 0.045, 0.28 - k * 0.08, fz + 0.012, torso, { noShadow: true });
    }
    // ---- Kopf und Gesicht ----
    const neck = grp(torso, 0, 0.62, 0);
    part(box, skin, 0.1, 0.08, 0.1, 0, 0.02, 0, neck);
    const head = grp(neck, 0, 0.04, 0);
    part(box, skin, 0.25, 0.29, 0.26, 0, 0.15, 0, head);
    for (const s of [-1, 1]) part(box, shade(skin, 0.9), 0.025, 0.06, 0.05, s * 0.135, 0.16, -0.01, head, ns);
    const fz2 = 0.131;
    for (const s of [-1, 1]) {
      part(box, '#f4f4f0', 0.06, 0.04, 0.01, s * 0.058, 0.18, fz2, head, ns);
      part(box, A.eyes, 0.03, 0.034, 0.012, s * 0.058, 0.18, fz2 + 0.004, head, ns);
      part(box, '#0a0a0a', 0.012, 0.016, 0.013, s * 0.058, 0.18, fz2 + 0.006, head, ns);
      const b = A.brows;
      const bh = { dick: 0.03, duenn: 0.008, buschig: 0.036 }[b] || 0.016, bwid = b === 'buschig' ? 0.082 : 0.07;
      const by = b === 'hoch' ? 0.237 : b === 'gebogen' ? 0.225 : 0.218;
      const br = part(box, b === 'buschig' ? shade(hc, 0.85) : hc, bwid, bh, 0.012, s * 0.058, by, fz2 + 0.004, head, ns);
      if (b === 'boese') br.rotation.z = s * 0.3;
      if (b === 'traurig') br.rotation.z = -s * 0.3;
      if (b === 'gebogen') { br.scale.x = 0.04; br.position.x = s * 0.048; const b2 = part(box, hc, 0.035, bh, 0.012, s * 0.08, by - 0.008, fz2 + 0.004, head, ns); b2.rotation.z = -s * 0.5; }
    }
    // Nase
    if (A.nose === 'knubbel') part(sph, shade(skin, 0.9), 0.034, 0.03, 0.032, 0, 0.13, fz2 + 0.02, head, ns);
    else {
      const n = { klein: [0.03, 0.04, 0.03, 0.135], normal: [0.04, 0.06, 0.04, 0.135], gross: [0.055, 0.08, 0.06, 0.13], spitz: [0.03, 0.07, 0.07, 0.135],
        breit: [0.07, 0.05, 0.04, 0.13], stups: [0.04, 0.035, 0.035, 0.13], lang: [0.035, 0.1, 0.05, 0.13] }[A.nose] || [0.04, 0.06, 0.04, 0.135];
      const np = part(box, shade(skin, 0.9), n[0], n[1], n[2], 0, n[3], fz2 + n[2] / 2 - 0.005, head, ns);
      if (A.nose === 'stups') np.rotation.x = -0.4;
    }
    // Mund
    const mc = '#6a2a2a', m = A.mouth;
    if (m === 'laecheln' || m === 'grinsen' || m === 'traurig') {
      part(box, mc, m === 'grinsen' ? 0.09 : 0.07, 0.016, 0.01, 0, 0.075, fz2, head, ns);
      for (const s of [-1, 1]) { const c = part(box, mc, 0.03, 0.014, 0.01, s * (m === 'grinsen' ? 0.055 : 0.045), m === 'traurig' ? 0.068 : 0.083, fz2, head, ns); c.rotation.z = (m === 'traurig' ? -1 : 1) * s * 0.5; }
      if (m === 'grinsen') part(box, '#f0f0f0', 0.075, 0.012, 0.012, 0, 0.08, fz2 + 0.002, head, ns);
    } else if (m === 'zaehne') { part(box, '#3a1010', 0.08, 0.035, 0.01, 0, 0.075, fz2, head, ns); part(box, '#f4f4f0', 0.07, 0.013, 0.012, 0, 0.085, fz2 + 0.002, head, ns); }
    else if (m === 'offen') part(box, '#3a1010', 0.06, 0.04, 0.01, 0, 0.075, fz2, head, ns);
    else if (m === 'ueberrascht') part(box, '#3a1010', 0.032, 0.045, 0.01, 0, 0.072, fz2, head, ns);
    else if (m === 'schmollen') part(box, shade('#b05050', 0.9), 0.05, 0.03, 0.02, 0, 0.075, fz2 + 0.004, head, ns);
    else if (m === 'schief') { const c = part(box, mc, 0.085, 0.016, 0.01, 0.01, 0.078, fz2, head, ns); c.rotation.z = 0.25; }
    else part(box, m === 'ernst' ? '#4a2020' : mc, 0.09, m === 'ernst' ? 0.011 : 0.016, 0.01, 0, 0.078, fz2, head, ns);
    // Bart
    const bd = A.beard;
    if (bd === 'stoppel') part(box, shade(skin, 0.72), 0.256, 0.1, 0.266, 0, 0.06, 0, head, ns);
    if (bd === 'vollbart' || bd === 'langbart') { part(box, hc, 0.27, 0.13, 0.28, 0, 0.055, 0.005, head); part(box, hc, 0.16, 0.08, 0.06, 0, 0.0, 0.12, head); }
    if (bd === 'langbart') part(box, shade(hc, 0.9), 0.13, 0.2, 0.06, 0, -0.12, 0.12, head);
    if (bd === 'schnurrbart' || bd === 'ziegenbart') part(box, hc, 0.11, 0.025, 0.02, 0, 0.1, fz2 + 0.006, head, ns);
    if (bd === 'henkelbart') { part(box, hc, 0.1, 0.022, 0.02, 0, 0.1, fz2 + 0.006, head, ns); for (const s of [-1, 1]) { const e = part(box, hc, 0.045, 0.018, 0.02, s * 0.065, 0.115, fz2 + 0.006, head, ns); e.rotation.z = s * 0.7; } }
    if (bd === 'kinnbart' || bd === 'ziegenbart') part(box, hc, 0.06, bd === 'ziegenbart' ? 0.1 : 0.07, 0.04, 0, bd === 'ziegenbart' ? 0.0 : 0.03, 0.12, head, ns);
    if (bd === 'kinnstreifen') part(box, hc, 0.018, 0.05, 0.015, 0, 0.04, fz2 + 0.004, head, ns);
    if (bd === 'koteletten') for (const s of [-1, 1]) part(box, hc, 0.03, 0.12, 0.05, s * 0.128, 0.16, 0.05, head, ns);
    // Narben
    const scarC = '#8a3a3a';
    if (A.scar === 'wange') part(box, scarC, 0.012, 0.07, 0.01, 0.08, 0.12, fz2 + 0.002, head, ns);
    if (A.scar === 'auge') part(box, scarC, 0.012, 0.1, 0.01, -0.058, 0.18, fz2 + 0.009, head, ns);
    if (A.scar === 'stirn') { const sc2 = part(box, scarC, 0.09, 0.012, 0.01, 0.02, 0.255, fz2 + 0.002, head, ns); sc2.rotation.z = 0.2; }
    if (A.scar === 'kinn') part(box, scarC, 0.04, 0.01, 0.01, 0.02, 0.03, fz2 + 0.002, head, ns);
    if (A.scar === 'kreuz') for (const r of [0.7, -0.7]) { const c = part(box, scarC, 0.012, 0.07, 0.01, -0.08, 0.12, fz2 + 0.003, head, ns); c.rotation.z = r; }
    // Brille
    const gc = A.glassesColor, gl = A.glasses;
    if (gl === 'brille' || gl === 'eckig' || gl === 'sonnenbrille') {
      const t = gl === 'eckig' ? 0.014 : 0.008;
      for (const s of [-1, 1]) {
        const x = s * 0.058, y = 0.18, z = fz2 + 0.014;
        part(box, gl === 'sonnenbrille' ? '#0a0a0a' : '#bfe3ff', 0.07, 0.048, 0.004, x, y, z, head, gl === 'sonnenbrille' ? ns : { noShadow: true, opacity: 0.35 });
        part(box, gc, 0.078, t, 0.008, x, y + 0.026, z, head, ns); part(box, gc, 0.078, t, 0.008, x, y - 0.026, z, head, ns);
        part(box, gc, t, 0.056, 0.008, x - 0.037, y, z, head, ns); part(box, gc, t, 0.056, 0.008, x + 0.037, y, z, head, ns);
        part(box, gc, 0.008, 0.008, 0.13, s * 0.128, y + 0.01, 0.07, head, ns);
      }
      part(box, gc, 0.04, 0.008, 0.008, 0, 0.19, fz2 + 0.014, head, ns);
    } else if (gl === 'rund' || gl === 'monokel') {
      const ring = L._ringGeo || (L._ringGeo = new T.TorusGeometry(0.032, 0.006, 6, 16));
      for (const s of (gl === 'monokel' ? [-1] : [-1, 1])) {
        const r = new T.Mesh(ring, L.mat(gc)); r.position.set(s * 0.058, 0.18, fz2 + 0.014); head.add(r);
        part(cyl, '#bfe3ff', 0.03, 0.003, 0.03, s * 0.058, 0.18, fz2 + 0.013, head, { noShadow: true, opacity: 0.35 }).rotation.x = Math.PI / 2;
        if (gl === 'rund') part(box, gc, 0.008, 0.008, 0.13, s * 0.128, 0.19, 0.07, head, ns);
      }
      if (gl === 'rund') part(box, gc, 0.05, 0.008, 0.008, 0, 0.19, fz2 + 0.014, head, ns);
      else part(box, gc, 0.006, 0.12, 0.006, -0.085, 0.11, fz2 + 0.01, head, ns);
    } else if (gl === 'skibrille') {
      part(box, '#f2a020', 0.2, 0.055, 0.01, 0, 0.185, fz2 + 0.014, head, { noShadow: true, opacity: 0.75 });
      part(box, gc, 0.21, 0.065, 0.012, 0, 0.185, fz2 + 0.008, head, ns);
      part(box, gc, 0.265, 0.03, 0.275, 0, 0.185, 0, head, ns);
    } else if (gl === 'augenklappe') {
      part(box, '#0a0a0a', 0.06, 0.05, 0.01, 0.058, 0.18, fz2 + 0.012, head, ns);
      const st = part(box, '#0a0a0a', 0.3, 0.01, 0.01, 0, 0.21, fz2 + 0.008, head, ns); st.rotation.z = -0.3;
      part(box, '#0a0a0a', 0.262, 0.01, 0.272, 0, 0.23, 0, head, ns);
    }
    // Kopfbedeckung und Frisur
    const hat = A.hat, hcol = A.hatColor;
    const covered = ['muetze', 'beanie', 'cap', 'cap_rueck', 'helm', 'bandana', 'cowboy', 'zylinder', 'sonnenhut'].includes(hat);
    buildHair(head, A, covered);
    if (hat === 'muetze' || hat === 'beanie') {
      part(box, hcol, 0.28, 0.13, 0.29, 0, 0.34, 0, head);
      part(box, shade(hcol, 0.75), 0.29, 0.045, 0.3, 0, 0.285, 0, head);
      if (hat === 'beanie') part(sph, '#f2f2f2', 0.05, 0.05, 0.05, 0, 0.43, 0, head);
    }
    if (hat === 'cap' || hat === 'cap_rueck') {
      part(box, hcol, 0.27, 0.07, 0.28, 0, 0.33, 0, head);
      part(box, hcol, 0.22, 0.02, 0.12, 0, 0.3, hat === 'cap' ? 0.18 : -0.18, head);
      part(box, shade(hcol, 0.7), 0.03, 0.015, 0.03, 0, 0.37, 0, head, ns);
    }
    if (hat === 'helm') { part(box, hcol, 0.31, 0.2, 0.32, 0, 0.3, 0, head); part(box, '#101820', 0.27, 0.09, 0.02, 0, 0.2, 0.155, head, { opacity: 0.75 }); }
    if (hat === 'stirnband') part(box, hcol, 0.265, 0.04, 0.275, 0, 0.27, 0, head);
    if (hat === 'bandana') {
      part(box, hcol, 0.27, 0.06, 0.28, 0, 0.32, 0, head); part(box, shade(hcol, 0.8), 0.272, 0.04, 0.282, 0, 0.28, 0, head);
      for (const s of [-1, 1]) { const t = part(box, hcol, 0.03, 0.09, 0.02, s * 0.02, 0.24, -0.15, head); t.rotation.z = s * 0.3; }
    }
    if (hat === 'cowboy') { part(cyl, hcol, 0.24, 0.015, 0.24, 0, 0.3, 0, head); part(box, hcol, 0.18, 0.12, 0.2, 0, 0.37, 0, head); part(box, shade(hcol, 0.5), 0.185, 0.025, 0.205, 0, 0.32, 0, head, ns); part(box, shade(hcol, 0.8), 0.02, 0.03, 0.2, 0, 0.43, 0, head, ns); }
    if (hat === 'zylinder') { part(cyl, hcol, 0.17, 0.012, 0.17, 0, 0.3, 0, head); part(cyl, hcol, 0.11, 0.22, 0.11, 0, 0.415, 0, head); part(cyl, shade(hcol, 0.5), 0.112, 0.03, 0.112, 0, 0.33, 0, head, ns); }
    if (hat === 'sonnenhut') { part(cyl, hcol, 0.27, 0.012, 0.27, 0, 0.3, 0, head); part(sph, hcol, 0.14, 0.08, 0.14, 0, 0.32, 0, head); part(cyl, shade(hcol, 0.6), 0.142, 0.025, 0.142, 0, 0.32, 0, head, ns); }
    if (hat === 'krone') {
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * Math.PI * 2;
        part(box, hcol, 0.06, 0.04, 0.012, Math.sin(a) * 0.12, 0.31, Math.cos(a) * 0.12, head).rotation.y = a;
        part(cone, hcol, 0.02, 0.05, 0.02, Math.sin(a) * 0.12, 0.355, Math.cos(a) * 0.12, head);
      }
      part(sph, '#c02a2a', 0.015, 0.015, 0.015, 0, 0.31, 0.125, head, ns);
    }
    root.scale.setScalar(hs);
    root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    return { root, body, hips, torso, neck, head, legs, arms, hand, held: null, heldType: null, app: A, kind: 'human' };
  };

  // was der Mensch in der Hand hält
  L.setHeld = function (rig, type) {
    if (rig.heldType === type) return;
    if (rig.held) { rig.hand.remove(rig.held); rig.held = null; }
    rig.heldType = type;
    if (!type || type === 'leer') return;
    const m = L.buildItem(type, true);
    if (!m) return;
    rig.hand.add(m); rig.held = m;
  };

  // Animation Mensch
  L.animHuman = function (r, s) {
    const legs = r.legs, arms = r.arms, ph = s.phase || 0, sp = s.speed || 0;
    r.body.rotation.set(0, 0, 0); r.body.position.set(0, 0, 0);
    const HY = (r.hipY || 0.95) - 0.95;
    if (r.cape) r.cape.rotation.x = 0.06 + (s.mode === 'run' ? 0.55 : s.mode === 'walk' ? 0.18 : 0.1) * Math.min(1, sp + 0.05) + Math.sin(ph * 2) * 0.04 * sp;
    r.hips.position.y = 0.95 + HY; r.torso.rotation.set(0, 0, 0); r.neck.rotation.set(0, 0, 0);
    for (const l of legs) { l.leg.rotation.set(0, 0, 0); l.knee.rotation.set(0, 0, 0); }
    for (const a of arms) { a.arm.rotation.set(0, 0, 0); a.elbow.rotation.set(0, 0, 0); }
    const m = s.mode;
    if (m === 'dead') {
      r.body.rotation.x = -Math.PI / 2; r.body.position.set(0, 0.14, -0.95);
      arms[0].arm.rotation.z = 1.2; arms[1].arm.rotation.z = -1.4; legs[0].leg.rotation.z = 0.25; legs[1].leg.rotation.z = -0.2;
      return;
    }
    if (m === 'tumble') {
      r.body.rotation.x = s.tumble || 0; r.body.position.y = 0.4;
      arms[0].arm.rotation.z = 2; arms[1].arm.rotation.z = -2; legs[0].leg.rotation.x = -0.6; legs[1].leg.rotation.x = 0.5;
      return;
    }
    if (m === 'scooter') {
      legs[0].leg.rotation.x = -0.18; legs[1].leg.rotation.x = 0.22;
      legs[0].knee.rotation.x = 0.25; legs[1].knee.rotation.x = 0.15;
      for (const a of arms) { a.arm.rotation.x = -0.95; a.elbow.rotation.x = -0.35; }
      r.torso.rotation.x = 0.12;
      return;
    }
    if (m === 'sit' || m === 'ride') {
      r.hips.position.y = (m === 'ride' ? 0.75 : 0.55) + HY;
      for (const l of legs) { l.leg.rotation.x = m === 'ride' ? -1.1 : -1.45; l.knee.rotation.x = m === 'ride' ? 1.3 : 1.45; }
      legs[0].leg.rotation.z = m === 'ride' ? 0.25 : 0; legs[1].leg.rotation.z = m === 'ride' ? -0.25 : 0;
      for (const a of arms) { a.arm.rotation.x = -1.05; a.elbow.rotation.x = -0.35; }
      r.torso.rotation.x = m === 'ride' ? 0.3 : 0;
      return;
    }
    if (m === 'crawl') {
      r.body.rotation.x = Math.PI / 2 * 0.94; r.body.position.set(0, 0.2, -0.9);
      r.neck.rotation.x = -1.15;
      for (let i = 0; i < 2; i++) {
        const w = Math.sin(ph + i * Math.PI) * sp;
        arms[i].arm.rotation.x = -2.6 + w * 0.55; arms[i].elbow.rotation.x = -0.6 - Math.max(0, w) * 0.5;
        legs[i].leg.rotation.x = -w * 0.35; legs[i].knee.rotation.x = 0.3 + Math.max(0, -w) * 0.8;
        legs[i].leg.rotation.z = (i ? -1 : 1) * 0.12;
      }
    } else if (m === 'crouch') {
      r.hips.position.y = 0.62 + HY; r.torso.rotation.x = 0.4; r.neck.rotation.x = -0.3;
      for (let i = 0; i < 2; i++) {
        const w = Math.sin(ph + i * Math.PI) * sp;
        legs[i].leg.rotation.x = -1.05 + w * 0.4; legs[i].knee.rotation.x = 1.55 - w * 0.25;
        arms[i].arm.rotation.x = -0.4 - w * 0.3; arms[i].elbow.rotation.x = -0.7;
      }
    } else if (m === 'jump') {
      for (const l of legs) { l.leg.rotation.x = -0.6; l.knee.rotation.x = 1.0; }
      arms[0].arm.rotation.z = 0.5; arms[1].arm.rotation.z = -0.5; arms[0].arm.rotation.x = arms[1].arm.rotation.x = -0.6;
    } else {
      const run = m === 'run', amp = (run ? 0.95 : 0.55) * sp;
      r.hips.position.y = 0.95 + HY + (run ? Math.abs(Math.sin(ph)) * 0.06 : Math.abs(Math.sin(ph)) * 0.025 * sp);
      r.torso.rotation.x = run ? 0.25 : 0.03;
      for (let i = 0; i < 2; i++) {
        const w = Math.sin(ph + i * Math.PI);
        legs[i].leg.rotation.x = w * amp;
        legs[i].knee.rotation.x = Math.max(0, Math.sin(ph + i * Math.PI - 1.4)) * (run ? 1.5 : 0.8) * sp;
        arms[i].arm.rotation.x = -w * amp * 0.85;
        arms[i].elbow.rotation.x = run ? -1.3 : -0.2 * sp;
      }
      if (sp < 0.05) { const b = Math.sin(ph * 0.3) * 0.02; r.torso.rotation.x = b; arms[0].arm.rotation.z = 0.06; arms[1].arm.rotation.z = -0.06; }
    }
    // Oberkörper-Aktionen (rechter Arm = arms[0] hat die Hand)
    const ra = arms[0], la = arms[1];
    if (s.aim) {
      ra.arm.rotation.set(-Math.PI / 2 - (s.pitch || 0), 0, 0); ra.elbow.rotation.x = 0;
      la.arm.rotation.set(-1.35 - (s.pitch || 0), 0, -0.55); la.elbow.rotation.x = -0.5;
    }
    if (s.swing !== undefined && s.swing >= 0) {
      const t = s.swing;
      ra.arm.rotation.x = t < 0.35 ? L.lerp(-0.3, -2.9, t / 0.35) : L.lerp(-2.9, -0.4, Math.min(1, (t - 0.35) / 0.2));
      ra.elbow.rotation.x = t < 0.35 ? -0.8 : -0.15;
    }
    if (s.eat) { ra.arm.rotation.x = -1.9 + Math.sin(ph * 4) * 0.08; ra.elbow.rotation.x = -1.9; ra.arm.rotation.z = 0.35; }
    if (s.throwT !== undefined && s.throwT >= 0) {
      const t = s.throwT;
      ra.arm.rotation.x = t < 0.4 ? L.lerp(0, -2.8, t / 0.4) : L.lerp(-2.8, -1.0, Math.min(1, (t - 0.4) / 0.2));
    }
    if (m === 'crawl' && (s.aim || s.swing >= 0)) { ra.arm.rotation.x -= 0.6; }
  };

  // ---------- Viktor (vier Varianten) ----------
  const VIK = {
    grey: { body: '#8a867d', dark: '#4b4842', face: '#d8d1c1', hat: true },
    red: { body: '#7b2a24', dark: '#40140f', face: '#cdbfae', scarf: true },
    blue: { body: '#3b4e68', dark: '#1c2738', face: '#c6cbd3', tilt: 0.35 },
    lange: { body: '#2c2925', dark: '#141210', face: '#ebe5d8' }
  };
  let badgeTex = null, danielTex = null;
  L.buildViktor = function (v) {
    const V = VIK[v] || VIK.grey, s = v === 'lange' ? 1.25 : 1;
    const box = G().box, sph = G().sph;
    const root = new T.Group(), body = grp(root), hips = grp(body, 0, 1.46 * s, 0);
    const legs = [], arms = [];
    for (const sd of [-1, 1]) {
      const leg = grp(hips, sd * 0.07 * s, 0, 0);
      part(box, V.body, 0.065 * s, 0.73 * s, 0.065 * s, 0, -0.365 * s, 0, leg);
      const knee = grp(leg, 0, -0.73 * s, 0);
      part(box, V.body, 0.055 * s, 0.73 * s, 0.055 * s, 0, -0.365 * s, 0, knee);
      part(box, V.dark, 0.07 * s, 0.04 * s, 0.22 * s, 0, -0.74 * s, 0.07 * s, knee);
      legs.push({ leg, knee });
    }
    const torso = grp(hips);
    part(box, V.body, 0.1 * s, 0.5 * s, 0.075 * s, 0, 0.25 * s, 0, torso);
    part(box, V.body, 0.19 * s, 0.42 * s, 0.085 * s, 0, 0.68 * s, 0, torso);
    for (let i = 0; i < 4; i++) part(box, V.dark, 0.12 * s, 0.014 * s, 0.087 * s, 0, (0.12 + i * 0.09) * s, 0, torso, { noShadow: true });
    if (!badgeTex) badgeTex = L.textTex('VIKTOR', 128, 40, '#d9d3c3', '#111', 'bold 26px monospace');
    const badge = new T.Mesh(new T.PlaneGeometry(0.17 * s, 0.055 * s), new T.MeshLambertMaterial({ map: badgeTex }));
    badge.position.set(0, 0.78 * s, 0.044 * s); torso.add(badge);
    const neck = grp(torso, 0, 0.9 * s, 0);
    part(box, V.face, 0.035 * s, 0.3 * s, 0.035 * s, 0, 0.15 * s, 0, neck);
    const head = grp(neck, 0, 0.29 * s, 0);
    part(sph, V.face, 0.075 * s, 0.19 * s, 0.08 * s, 0, 0.17 * s, 0, head);
    part(sph, shade(V.face, 0.75), 0.05 * s, 0.18 * s, 0.07 * s, 0.03 * s, 0.17 * s, -0.01 * s, head, { noShadow: true });
    for (const sd of [-1, 1]) {
      const sock = part(sph, '#050404', 0.022 * s, 0.052 * s, 0.014 * s, sd * 0.032 * s, 0.24 * s, 0.07 * s, head, { noShadow: true });
      sock.rotation.z = sd * 0.15;
      part(sph, '#fffae6', 0.008 * s, 0.008 * s, 0.006 * s, sd * 0.032 * s, 0.232 * s, 0.083 * s, head, { basic: true, noShadow: true });
    }
    const mouth = part(sph, '#050404', 0.02 * s, 0.02 * s, 0.012 * s, 0, 0.085 * s, 0.075 * s, head, { noShadow: true });
    const teeth = grp(head, 0, 0.085 * s, 0.085 * s);
    for (let k = -3; k <= 3; k++) part(box, '#e9e2cf', 0.006 * s, 0.014 * s, 0.004 * s, k * 0.009 * s, 0, 0, teeth, { noShadow: true });
    teeth.visible = false;
    if (V.hat) {
      part(G().cyl, '#121010', 0.11 * s, 0.012 * s, 0.11 * s, 0, 0.355 * s, 0, head);
      part(G().cyl, '#121010', 0.07 * s, 0.2 * s, 0.07 * s, 0, 0.46 * s, 0, head);
    }
    if (V.scarf) {
      part(box, '#4a120e', 0.1 * s, 0.07 * s, 0.1 * s, 0, 0.03 * s, 0, neck);
      part(box, '#4a120e', 0.04 * s, 0.32 * s, 0.02 * s, 0.035 * s, -0.12 * s, 0.05 * s, neck);
    }
    for (const sd of [-1, 1]) {
      const arm = grp(torso, sd * 0.11 * s, 0.88 * s, 0);
      part(box, V.body, 0.048 * s, 0.84 * s, 0.048 * s, 0, -0.42 * s, 0, arm);
      const elbow = grp(arm, 0, -0.84 * s, 0);
      part(box, V.body, 0.042 * s, 1.1 * s, 0.042 * s, 0, -0.55 * s, 0, elbow);
      const hand = grp(elbow, 0, -1.1 * s, 0);
      const fingers = [];
      for (let f = 0; f < 4; f++) {
        const fg = grp(hand, (f - 1.5) * 0.02 * s, 0, 0);
        part(box, V.body, 0.013 * s, 0.24 * s, 0.013 * s, 0, -0.12 * s, 0, fg);
        fg.rotation.z = (f - 1.5) * 0.1; fingers.push(fg);
      }
      arms.push({ arm, elbow, hand, fingers });
    }
    return { root, body, hips, torso, neck, head, legs, arms, mouth, teeth, s, tilt: V.tilt || 0, kind: 'viktor' };
  };
  L.animViktor = function (r, st) {
    const s = r.s, ph = st.phase || 0, m = st.mode;
    r.body.rotation.set(0, 0, 0); r.body.position.set(0, 0, 0);
    r.hips.position.y = 1.46 * s; r.torso.rotation.set(0, 0, 0); r.neck.rotation.set(0, 0, r.tilt);
    r.head.rotation.set(0, 0, 0);
    for (const l of r.legs) { l.leg.rotation.set(0, 0, 0); l.knee.rotation.set(0, 0, 0); }
    for (const a of r.arms) { a.arm.rotation.set(0, 0, 0); a.elbow.rotation.set(0, 0, 0); for (const f of a.fingers) f.rotation.x = 0; }
    r.mouth.scale.set(0.02 * s, 0.02 * s, 0.012 * s); r.teeth.visible = false;
    if (m === 'dead') {
      r.body.rotation.x = -Math.PI / 2; r.body.position.set(0, 0.08, -1.4 * s);
      r.arms[0].arm.rotation.z = 1.4; r.arms[1].arm.rotation.z = -1.2; r.neck.rotation.z = 0.8;
      return;
    }
    if (m === 'crawl') {
      // Jagd-Sprint: weit vorgebeugt, riesige Schritte, lange Arme schleudern hinterher, Kopf zuckt
      const b = Math.abs(Math.sin(ph));
      r.hips.position.y = 1.4 * s + b * 0.14 * s;
      r.torso.rotation.x = 0.5 + Math.sin(ph * 2) * 0.05;
      r.body.rotation.z = Math.sin(ph) * 0.06;
      for (let i = 0; i < 2; i++) {
        const w = Math.sin(ph + i * Math.PI);
        r.legs[i].leg.rotation.x = -w * 0.85 - 0.1;
        r.legs[i].knee.rotation.x = 0.2 + Math.max(0, Math.sin(ph + i * Math.PI + 1.4)) * 1.8;
        r.arms[i].arm.rotation.x = w * 0.7 - 0.25;
        r.arms[i].arm.rotation.z = (i ? -1 : 1) * 0.28;
        r.arms[i].elbow.rotation.x = -0.35 - Math.max(0, -w) * 0.6;
        for (const f of r.arms[i].fingers) f.rotation.x = -0.7;
      }
      r.neck.rotation.set(-0.55 + Math.sin(ph * 2) * 0.08, Math.sin(ph * 0.9) * 0.15, r.tilt + Math.sin(ph * 3.7) * 0.2);
      r.mouth.scale.set(0.035 * s, 0.05 * s, 0.012 * s); r.teeth.visible = true;
      return;
    }
    if (m === 'alert') {
      // Kopf ruckt zum Geräusch, Arme spreizen sich, Maul auf
      r.neck.rotation.set(-0.25, 0, r.tilt + 0.65);
      r.torso.rotation.x = -0.08;
      r.arms[0].arm.rotation.set(-0.3, 0, 0.45); r.arms[1].arm.rotation.set(-0.3, 0, -0.45);
      for (const a of r.arms) for (const f of a.fingers) f.rotation.x = -0.5;
      r.mouth.scale.set(0.035 * s, 0.05 * s, 0.012 * s); r.teeth.visible = true;
      return;
    }
    const run = m === 'run', walk = m === 'walk';
    if (run || walk) {
      const amp = run ? 0.75 : 0.42;
      r.torso.rotation.x = run ? 0.3 : 0.08;
      r.hips.position.y = 1.46 * s + Math.abs(Math.sin(ph)) * 0.05 * s;
      for (let i = 0; i < 2; i++) {
        const w = Math.sin(ph + i * Math.PI);
        r.legs[i].leg.rotation.x = w * amp;
        r.legs[i].knee.rotation.x = Math.max(0, Math.sin(ph + i * Math.PI - 1.3)) * (run ? 1.2 : 0.6);
        r.arms[i].arm.rotation.x = -w * amp * 0.6 + (run ? -0.3 : 0);
        r.arms[i].arm.rotation.z = (i ? -1 : 1) * 0.08;
        r.arms[i].elbow.rotation.x = -0.15;
      }
      r.neck.rotation.x = Math.sin(ph * 0.5) * 0.1;
    } else if (m === 'search' || m === 'idle') {
      r.neck.rotation.y = Math.sin(ph * 0.6) * 0.9;
      r.neck.rotation.z = r.tilt + Math.sin(ph * 0.37) * 0.35;
      r.arms[0].arm.rotation.z = 0.08 + Math.sin(ph * 0.5) * 0.04; r.arms[1].arm.rotation.z = -0.08;
    }
    if (m === 'attack') {
      const t = st.atk || 0;
      r.torso.rotation.x = 0.3 + t * 0.3;
      for (const a of r.arms) { a.arm.rotation.x = L.lerp(-0.5, -1.9, Math.min(1, t * 2)); a.elbow.rotation.x = -0.2; for (const f of a.fingers) f.rotation.x = -0.4; }
      r.arms[0].arm.rotation.z = 0.25; r.arms[1].arm.rotation.z = -0.25;
      r.mouth.scale.set(0.04 * s, 0.06 * s, 0.012 * s); r.teeth.visible = true;
    }
  };

  // ---------- Daniel ----------
  L.buildDaniel = function () {
    const box = G().box, sph = G().sph, sk = '#8f766a', sd = '#5c4840';
    const root = new T.Group(), body = grp(root), hips = grp(body, 0, 1.15, 0);
    const legs = [], arms = [];
    for (const s of [-1, 1]) {
      const leg = grp(hips, s * 0.23, 0, 0);
      part(box, sk, 0.34, 0.6, 0.38, 0, -0.3, 0, leg);
      part(box, '#24252a', 0.4, 0.38, 0.44, 0, -0.14, 0, leg);
      const knee = grp(leg, 0, -0.6, 0);
      part(box, sk, 0.28, 0.5, 0.3, 0, -0.25, 0, knee);
      part(box, '#161311', 0.3, 0.1, 0.44, 0, -0.52, 0.06, knee);
      legs.push({ leg, knee });
    }
    const torso = grp(hips);
    part(box, sk, 0.78, 0.42, 0.5, 0, 0.21, 0, torso);
    part(box, '#121214', 0.82, 0.13, 0.54, 0, 0.02, 0, torso);
    if (!danielTex) danielTex = L.textTex('DANIEL', 128, 32, '#121214', '#d2b46a', 'bold 24px monospace');
    const plate = new T.Mesh(new T.PlaneGeometry(0.4, 0.1), new T.MeshLambertMaterial({ map: danielTex }));
    plate.position.set(0, 0.02, 0.272); torso.add(plate);
    part(box, sk, 1.2, 0.62, 0.64, 0, 0.72, 0, torso);
    for (const s of [-1, 1]) part(box, sd, 0.5, 0.24, 0.1, s * 0.27, 0.8, 0.31, torso);
    for (let r = 0; r < 3; r++) for (const s of [-1, 1]) part(box, sd, 0.13, 0.09, 0.06, s * 0.08, 0.34 + r * 0.11, 0.25, torso, { noShadow: true });
    part(box, sk, 0.62, 0.22, 0.42, 0, 1.08, -0.03, torso);
    for (const s of [-1, 1]) part(sph, sk, 0.32, 0.3, 0.32, s * 0.64, 0.95, 0, torso);
    const neck = grp(torso, 0, 1.12, 0);
    const head = grp(neck, 0, 0, 0.04);
    part(box, sk, 0.3, 0.36, 0.32, 0, 0.2, 0, head);
    part(box, '#2e221e', 0.32, 0.07, 0.34, 0, 0.4, 0, head);
    part(box, '#2e221e', 0.3, 0.035, 0.03, 0, 0.27, 0.165, head, { noShadow: true });
    for (const s of [-1, 1]) part(sph, '#ff3a20', 0.025, 0.02, 0.01, s * 0.07, 0.24, 0.165, head, { basic: true, noShadow: true });
    const mouth = part(box, '#080505', 0.08, 0.02, 0.01, 0, 0.1, 0.165, head, { noShadow: true });
    for (const s of [-1, 1]) {
      const arm = grp(torso, s * 0.74, 0.9, 0);
      part(sph, sk, 0.22, 0.36, 0.22, 0, -0.3, 0, arm);
      part(box, 'rgb(110,50,55)', 0.02, 0.4, 0.02, s * 0.12, -0.3, 0.12, arm, { noShadow: true });
      const elbow = grp(arm, 0, -0.6, 0);
      part(sph, sk, 0.18, 0.32, 0.18, 0, -0.28, 0, elbow);
      part(box, sd, 0.26, 0.24, 0.26, 0, -0.62, 0, elbow);
      arms.push({ arm, elbow });
    }
    return { root, body, hips, torso, neck, head, legs, arms, mouth, kind: 'daniel' };
  };
  L.animDaniel = function (r, st) {
    const ph = st.phase || 0, m = st.mode;
    r.body.rotation.set(0, 0, 0); r.body.position.set(0, 0, 0);
    r.hips.position.y = 1.15; r.torso.rotation.set(0, 0, 0); r.neck.rotation.set(0, 0, 0);
    for (const l of r.legs) { l.leg.rotation.set(0, 0, 0); l.knee.rotation.set(0, 0, 0); }
    for (let i = 0; i < 2; i++) { r.arms[i].arm.rotation.set(0, 0, (i ? -1 : 1) * 0.35); r.arms[i].elbow.rotation.set(-0.3, 0, 0); }
    r.mouth.scale.y = 0.02;
    if (m === 'dead') { r.body.rotation.x = -Math.PI / 2; r.body.position.set(0, 0.3, -1.1); return; }
    if (m === 'alert') {
      // Daniel richtet sich auf, ballt die Fäuste und brüllt
      r.torso.rotation.x = -0.12; r.neck.rotation.set(-0.2, 0, 0);
      for (let i = 0; i < 2; i++) { r.arms[i].arm.rotation.set(-0.7, 0, (i ? -1 : 1) * 0.6); r.arms[i].elbow.rotation.x = -1.4; }
      r.mouth.scale.y = 0.06;
      return;
    }
    if (m === 'run') {
      // Sprint mit Brust raus, Knie bis zum Bauch, Arme pumpen wie verrückt, großes Federn
      const b = Math.abs(Math.sin(ph));
      r.hips.position.y = 1.15 + b * 0.16;
      r.torso.rotation.x = -0.06; r.body.rotation.z = Math.sin(ph) * 0.09;
      for (let i = 0; i < 2; i++) {
        const w = Math.sin(ph + i * Math.PI);
        r.legs[i].leg.rotation.x = w > 0 ? -w * 1.7 : -w * 0.45;
        r.legs[i].knee.rotation.x = w > 0 ? w * 1.9 : -w * 0.2;
        r.arms[i].arm.rotation.x = w > 0 ? w * 0.9 : w * 2.3;
        r.arms[i].arm.rotation.z = (i ? -1 : 1) * 0.22;
        r.arms[i].elbow.rotation.x = -1.7;
      }
      r.neck.rotation.set(Math.sin(ph * 2) * 0.18, 0, Math.sin(ph) * 0.1);
      r.mouth.scale.y = 0.055;
    } else if (m === 'walk') {
      const run = false, amp = 0.38;
      r.torso.rotation.x = run ? 0.32 : 0.05;
      r.body.rotation.z = Math.sin(ph) * (run ? 0.04 : 0.07);
      r.hips.position.y = 1.15 + Math.abs(Math.sin(ph)) * (run ? 0.08 : 0.03);
      for (let i = 0; i < 2; i++) {
        const w = Math.sin(ph + i * Math.PI);
        r.legs[i].leg.rotation.x = w * amp; r.legs[i].knee.rotation.x = Math.max(0, Math.sin(ph + i * Math.PI - 1.3)) * (run ? 1.2 : 0.6);
        r.arms[i].arm.rotation.x = -w * amp * 0.7; r.arms[i].elbow.rotation.x = run ? -1.2 : -0.4;
      }
      if (run) r.mouth.scale.y = 0.05;
    } else if (m === 'search' || m === 'idle') {
      r.neck.rotation.y = Math.sin(ph * 0.5) * 0.7;
      r.torso.scale.x = 1 + Math.sin(ph * 1.5) * 0.015;
    }
    if (m === 'attack') {
      const t = st.atk || 0, up = t < 0.5;
      for (const a of r.arms) { a.arm.rotation.x = up ? L.lerp(-0.3, -2.9, t * 2) : L.lerp(-2.9, -0.6, Math.min(1, (t - 0.5) * 4)); a.elbow.rotation.x = -0.3; }
      r.torso.rotation.x = up ? -0.15 : 0.4;
      r.mouth.scale.y = 0.06;
    }
  };

  // ---------- Stelzer (Alien-Läufer) und Koloss ----------
  const _d = new T.Vector3(), _b = new T.Vector3(), _o = new T.Vector3();
  L.ik = function (hip, foot, a, b, out, outward) {
    _d.subVectors(foot, hip);
    let len = _d.length();
    len = L.clamp(len, Math.abs(a - b) + 0.01, a + b - 0.01);
    _d.normalize();
    const along = (a * a - b * b + len * len) / (2 * len), h = Math.sqrt(Math.max(0, a * a - along * along));
    _b.copy(outward).multiplyScalar(0.35).add(UP).normalize();
    _b.addScaledVector(_d, -_b.dot(_d)).normalize();
    out.copy(hip).addScaledVector(_d, along).addScaledVector(_b, h);
  };
  L.seg = function (m, a, b) {
    _o.subVectors(b, a);
    const len = _o.length();
    m.position.copy(a).addScaledVector(_o, 0.5);
    m.quaternion.setFromUnitVectors(UP, _o.normalize());
    m.scale.y = len;
  };
  function alienLegs(root, n, r1, r2, mat) {
    const legs = [];
    for (let i = 0; i < n; i++) {
      const up = part(G().cyl, mat, r1, 1, r1, 0, 0, 0, root, { metal: 0.7, rough: 0.45 });
      const low = part(G().cyl, mat, r2, 1, r2, 0, 0, 0, root, { metal: 0.7, rough: 0.45 });
      const knee = part(G().sph, '#2a2018', r1 * 1.7, r1 * 1.7, r1 * 1.7, 0, 0, 0, root, { metal: 0.6, rough: 0.5 });
      const foot = part(G().cyl, '#2a2018', r1 * 2.4, r1 * 0.8, r1 * 2.4, 0, 0, 0, root, { metal: 0.6, rough: 0.5 });
      const glow = part(G().sph, '#ff6a20', r1 * 0.9, r1 * 0.9, r1 * 0.9, 0, 0, 0, root, { basic: true, noShadow: true });
      legs.push({ up, low, knee, foot, glow, angle: i / n * Math.PI * 2, footPos: new T.Vector3(), from: new T.Vector3(), to: new T.Vector3(), t: 1, hip: new T.Vector3(), kneePos: new T.Vector3() });
    }
    return legs;
  }
  L.buildWalker = function () {
    const root = new T.Group(), hull = grp(root);
    const metal = '#4a3b2c';
    part(G().sph, metal, 7, 1.9, 7, 0, 0, 0, hull, { metal: 0.75, rough: 0.4 });
    part(G().sph, '#5a4836', 4.2, 2.3, 4.2, 0, 1.1, -0.5, hull, { metal: 0.7, rough: 0.35 });
    part(G().cyl, '#ff5a1e', 7.06, 0.22, 7.06, 0, -0.1, 0, hull, { basic: true, noShadow: true });
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2;
      const fin = part(G().box, '#3a2c20', 0.3, 0.9, 2.4, Math.sin(a) * 5.6, 1.2, Math.cos(a) * 5.6, hull, { metal: 0.7, rough: 0.4 });
      fin.rotation.y = a;
    }
    const housing = part(G().cyl, '#2a2018', 1.5, 1.4, 1.5, 0, -0.3, 6.3, hull, { metal: 0.8, rough: 0.3 });
    housing.rotation.x = Math.PI / 2;
    const eye = part(G().sph, '#ff2a10', 1.05, 1.05, 0.55, 0, -0.3, 7.05, hull, { basic: true, noShadow: true });
    const cables = [];
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * Math.PI * 2, piv = grp(hull, Math.sin(a) * 2.5, -1.5, Math.cos(a) * 2.5);
      const len = 4 + Math.random() * 6;
      part(G().cyl, '#2a221a', 0.12, len, 0.12, 0, -len / 2, 0, piv, { noShadow: true });
      part(G().sph, '#ff6a20', 0.22, 0.22, 0.22, 0, -len, 0, piv, { basic: true, noShadow: true });
      cables.push(piv);
    }
    const legs = alienLegs(root, 3, 0.55, 0.4, '#3d3024');
    const cone = new T.Mesh(new T.ConeGeometry(1, 1, 24, 1, true).translate(0, -0.5, 0), new T.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.07, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }));
    root.add(cone);
    const spot = new T.Mesh(new T.CircleGeometry(1, 28), new T.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.3, blending: T.AdditiveBlending, depthWrite: false }));
    spot.rotation.x = -Math.PI / 2; root.add(spot);
    const beam = beamMesh(); root.add(beam.g);
    return { root, hull, eye, legs, cone, spot, beam, cables, legA: 14, legB: 15, hipR: 4.5, footR: 13 };
  };
  function beamMesh() {
    const g = new T.Group();
    const outer = new T.Mesh(G().cyl, new T.MeshBasicMaterial({ color: 0xff6a20, transparent: true, opacity: 0.55, blending: T.AdditiveBlending, depthWrite: false }));
    const core = new T.Mesh(G().cyl, new T.MeshBasicMaterial({ color: 0xfff0c0, transparent: true, opacity: 0.9, blending: T.AdditiveBlending, depthWrite: false }));
    g.add(outer); g.add(core); g.visible = false;
    return { g, outer, core };
  }
  L.setBeam = function (bm, a, b, width) {
    L.seg(bm.outer, a, b); L.seg(bm.core, a, b);
    bm.outer.scale.x = bm.outer.scale.z = width;
    bm.core.scale.x = bm.core.scale.z = width * 0.35;
  };
  // Der Koloss: Daniels Körper, Viktors Kopf und Spinnenarme, auf drei Alien-Beinen
  L.buildKoloss = function () {
    const root = new T.Group(), pelvis = grp(root);
    const sk = '#8f766a', sd = '#5c4840', box = G().box, sph = G().sph;
    part(sph, '#3d2f22', 6.5, 3.2, 6.5, 0, 0, 0, pelvis, { metal: 0.75, rough: 0.4 });
    part(G().cyl, '#ff3010', 6.6, 0.4, 6.6, 0, -0.4, 0, pelvis, { basic: true, noShadow: true });
    const torso = grp(pelvis, 0, 2.5, 0);
    part(box, sk, 6.5, 4.5, 4.6, 0, 2.2, 0, torso);
    part(box, '#121214', 7, 1.1, 5, 0, 0.6, 0, torso);
    if (!danielTex) danielTex = L.textTex('DANIEL', 128, 32, '#121214', '#d2b46a', 'bold 24px monospace');
    const plate = new T.Mesh(new T.PlaneGeometry(3.6, 0.9), new T.MeshLambertMaterial({ map: danielTex })); plate.position.set(0, 0.6, 2.52); torso.add(plate);
    part(box, sk, 11, 6, 6, 0, 7.4, 0, torso);
    for (const s of [-1, 1]) part(box, sd, 4.6, 2.2, 0.8, s * 2.5, 8.3, 3, torso);
    for (let r = 0; r < 3; r++) for (const s of [-1, 1]) part(box, sd, 1.2, 0.9, 0.6, s * 0.75, 3.4 + r * 1.05, 2.35, torso, { noShadow: true });
    const core = part(sph, '#ff2200', 1.5, 1.5, 0.8, 0, 6.3, 3.05, torso, { basic: true, noShadow: true });
    if (!badgeTex) badgeTex = L.textTex('VIKTOR', 128, 40, '#d9d3c3', '#111', 'bold 26px monospace');
    const badge = new T.Mesh(new T.PlaneGeometry(2.4, 0.75), new T.MeshLambertMaterial({ map: badgeTex })); badge.position.set(-3.2, 9.6, 3.02); torso.add(badge);
    part(box, sk, 6, 2.2, 4, 0, 10.9, -0.3, torso);
    for (const s of [-1, 1]) part(sph, sk, 3, 2.8, 3, s * 6, 9.4, 0, torso);
    const arms = [], thin = [];
    for (const s of [-1, 1]) {
      const arm = grp(torso, s * 6.8, 8.8, 0);
      part(sph, sk, 2.1, 3.4, 2.1, 0, -2.8, 0, arm);
      const elbow = grp(arm, 0, -5.6, 0);
      part(sph, sk, 1.7, 3, 1.7, 0, -2.6, 0, elbow);
      part(box, sd, 2.4, 2.2, 2.4, 0, -5.7, 0, elbow);
      arms.push({ arm, elbow });
      const ta = grp(torso, s * 3.6, 10.5, -2.3);
      part(box, '#2c2925', 0.45, 9, 0.45, 0, -4.5, 0, ta);
      const te = grp(ta, 0, -9, 0);
      part(box, '#2c2925', 0.38, 11, 0.38, 0, -5.5, 0, te);
      const th = grp(te, 0, -11, 0);
      for (let f = 0; f < 4; f++) { const fg = grp(th, (f - 1.5) * 0.25, 0, 0); part(box, '#2c2925', 0.13, 2.6, 0.13, 0, -1.3, 0, fg); fg.rotation.z = (f - 1.5) * 0.15; }
      thin.push({ arm: ta, elbow: te });
    }
    const neck = grp(torso, 0, 11.6, 0);
    part(box, '#ebe5d8', 0.45, 4, 0.45, 0, 2, 0, neck);
    const head = grp(neck, 0, 4, 0);
    part(sph, '#ebe5d8', 1.1, 2.7, 1.15, 0, 2.4, 0, head);
    for (const s of [-1, 1]) {
      part(sph, '#050404', 0.32, 0.72, 0.2, s * 0.45, 3.4, 1.0, head, { noShadow: true });
      part(sph, '#ff3a20', 0.13, 0.13, 0.08, s * 0.45, 3.3, 1.17, head, { basic: true, noShadow: true });
    }
    const mouth = part(sph, '#050404', 0.35, 0.3, 0.2, 0, 1.2, 1.0, head, { noShadow: true });
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * Math.PI * 2, sp = part(G().cone, '#4a3b2c', 0.25, 1.6, 0.25, Math.sin(a) * 0.9, 5.2, Math.cos(a) * 0.9, head, { metal: 0.7, rough: 0.4 });
      sp.rotation.set(Math.cos(a) * 0.35, 0, -Math.sin(a) * 0.35);
    }
    part(G().cyl, '#ff5a1e', 1.05, 0.15, 1.05, 0, 4.6, 0, head, { basic: true, noShadow: true });
    const legs = alienLegs(root, 3, 1.0, 0.75, '#3d3024');
    const beam = beamMesh(); root.add(beam.g);
    return { root, hull: pelvis, torso, arms, thin, neck, head, mouth, core, legs, beam, legA: 19, legB: 21, hipR: 5, footR: 17 };
  };

  // ---------- GIGA-CAPY: riesiges, aufrecht stehendes Capybara, das MAMA IVA in die Tiefe zieht ----------
  L.buildGigaCapy = function () {
    const root = new T.Group(), sph = G().sph, box = G().box, cone = G().cone;
    const FUR = '#7d5434', DARK = '#5a3a22', LIGHT = '#a07450', NOSE = '#3a2416', PLATE = '#3e2a1c';
    const body = grp(root);
    // Säulenbeine mit dicken Oberschenkeln und Krallenfüßen
    for (const s of [-1, 1]) {
      part(sph, DARK, 11, 15, 12, s * 10, 18, -2, body);
      part(sph, DARK, 7.5, 11, 8, s * 11, 7, 0, body);
      part(box, DARK, 9, 3.5, 14, s * 11, 1.6, 4, body);
      for (let k = -1; k <= 1; k++) part(cone, '#20140c', 1.3, 3, 1.3, s * 11 + k * 3, 1.5, 11.5, body, { noShadow: true }).rotation.x = Math.PI / 2;
    }
    // langer, schwerer Schwanz, der hinten über den Boden schleift
    const tail = grp(body, 0, 16, -10);
    let ty = 0, tz = 0;
    for (let i = 0; i < 8; i++) {
      const r = 9 - i * 0.95;
      part(sph, i % 2 ? FUR : DARK, r, r * 0.9, r * 1.4, 0, ty, tz, tail);
      part(cone, PLATE, r * 0.35, r * 0.9, r * 0.12, 0, ty + r * 0.95, tz, tail, { noShadow: true });
      tz -= r * 1.9; ty -= 1.7;
    }
    // aufrechter, massiger Oberkörper, leicht nach vorne gebeugt
    const torso = grp(body, 0, 0, 0);
    part(sph, FUR, 17, 25, 15, 0, 36, 0, torso);
    part(sph, LIGHT, 12, 20, 6, 0, 33, 10, torso, { noShadow: true });
    for (let k = 0; k < 6; k++) part(box, DARK, 13 - k * 0.6, 0.6, 1, 0, 22 + k * 4.2, 15.4 - Math.abs(k - 2.5) * 0.4, torso, { noShadow: true });
    // gezackte Rückenplatten in drei Reihen
    for (let i = 0; i < 9; i++) {
      const y = 18 + i * 4.6, h = 4 + Math.sin(i / 8 * Math.PI) * 5;
      for (const x of [-3.5, 0, 3.5]) {
        const p = part(cone, PLATE, 1.6, h * (x === 0 ? 1.25 : 0.85), 0.5, x, y, -13.5 - h * 0.25, torso, { noShadow: true });
        p.rotation.x = -0.9;
      }
    }
    // dicker Hals, Capybara-Kopf weit vorne
    part(sph, FUR, 11, 10, 11, 0, 56, 3, torso);
    const head = grp(torso, 0, 62, 9);
    part(sph, FUR, 12, 11, 13, 0, 0, 0, head);
    part(box, FUR, 15, 12, 12, 0, -2, 9, head);
    part(box, NOSE, 13, 6, 2, 0, -2, 15.2, head, { noShadow: true });
    for (const s of [-1, 1]) part(box, '#120a06', 2, 2.6, 1, s * 3.2, -1.5, 16.4, head, { noShadow: true });
    part(box, '#2a1a10', 6, 1.2, 1, 0, -6.5, 15.2, head, { noShadow: true });
    for (let k = -2; k <= 2; k++) part(box, '#f0e6d0', 1.6, 2.4, 0.8, k * 2.2, -6.2, 15.6, head, { noShadow: true });
    for (const s of [-1, 1]) {
      part(sph, '#120a06', 1.6, 1.8, 1.2, s * 7.2, 3.5, 6.5, head, { noShadow: true });
      part(sph, '#ffdd55', 0.55, 0.55, 0.3, s * 7.4, 4.0, 7.6, head, { basic: true, noShadow: true });
      part(sph, DARK, 2.8, 2.2, 1.6, s * 7.5, 9.5, -3, head);
    }
    part(sph, '#f2a81d', 3.6, 3.4, 3.6, 0, 12.5, 1, head);
    part(box, '#3d7a2a', 2.6, 0.5, 1.4, 1.2, 16, 1, head, { noShadow: true });
    // kräftige Arme mit Krallen
    const arms = [];
    for (const s of [-1, 1]) {
      const arm = grp(torso, s * 15.5, 49, 5);
      part(sph, FUR, 6, 12, 6, 0, -10, 0, arm);
      const elbow = grp(arm, 0, -20, 0);
      part(sph, FUR, 5, 10, 5, 0, -9, 0, elbow);
      part(box, DARK, 7, 5, 7.5, 0, -19.5, 1, elbow);
      for (let k = -1; k <= 1; k++) part(cone, '#1a0f08', 1, 3.6, 1, k * 2.3, -23, 3, elbow, { noShadow: true }).rotation.x = Math.PI;
      arms.push({ arm, elbow });
    }
    root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    return { root, body, torso, head, arms, tail };
  };

  // ---------- Fahrzeuge ----------
  L.VTYPES = {
    kleinwagen: { name: 'Kleinwagen', vmax: 140, acc: 6.5, hp: 100, kind: 'car', len: 3.8, wid: 1.7, off: 0.6, h: 1.45 },
    limousine: { name: 'Limousine', vmax: 185, acc: 7.5, hp: 120, kind: 'car', len: 4.8, wid: 1.85, off: 0.55, h: 1.45 },
    sportwagen: { name: 'Sportwagen', vmax: 260, acc: 12, hp: 90, kind: 'car', len: 4.4, wid: 1.9, off: 0.45, h: 1.2 },
    pickup: { name: 'Pickup', vmax: 165, acc: 6.8, hp: 160, kind: 'car', len: 5.2, wid: 2.0, off: 0.85, h: 1.8 },
    jeep: { name: 'Militär-Jeep', vmax: 135, acc: 7, hp: 230, kind: 'car', len: 4.3, wid: 2.0, off: 0.95, h: 1.7 },
    motorrad: { name: 'Motorrad', vmax: 220, acc: 12.5, hp: 60, kind: 'bike', len: 2.1, wid: 0.8, off: 0.6, wheelie: true },
    cross: { name: 'Crossmaschine', vmax: 150, acc: 10, hp: 60, kind: 'bike', len: 2.0, wid: 0.8, off: 0.95, wheelie: true },
    quad: { name: 'Straßen-Quad', vmax: 165, acc: 14, hp: 110, kind: 'bike', quad: true, wheelie: true, len: 2.4, wid: 1.25, off: 0.75 },
    atv: { name: 'Gelände-ATV', vmax: 125, acc: 12, hp: 140, kind: 'bike', quad: true, wheelie: true, len: 2.4, wid: 1.3, off: 1 },
    roller: { name: 'Roller', vmax: 75, acc: 5, hp: 40, kind: 'bike', len: 1.8, wid: 0.7, off: 0.5 },
    jetski: { name: 'Jetski', vmax: 110, acc: 13, hp: 60, kind: 'bike', boat: true, len: 3, wid: 1.2, off: 1 },
    motorboot: { name: 'Motorboot', vmax: 85, acc: 7, hp: 140, kind: 'car', boat: true, len: 7, wid: 2.6, off: 1, h: 2 },
    kutter: { name: 'Fischkutter', vmax: 50, acc: 3.5, hp: 300, kind: 'car', boat: true, len: 14, wid: 4.6, off: 1, h: 6 },
    heli: { name: 'Hubschrauber', vmax: 260, acc: 11, hp: 180, kind: 'car', fly: true, heli: true, len: 9, wid: 2.4, off: 1, h: 3 },
    uboot: { name: 'U-Boot', vmax: 110, acc: 7, hp: 240, kind: 'car', sub: true, len: 10, wid: 2.8, off: 1, h: 3 },
    flugzeug: { name: 'Flugzeug', vmax: 330, acc: 8, hp: 160, kind: 'car', plane: true, len: 9, wid: 2.2, off: 0.8, h: 2.2 },
    joyort10: { name: 'JOYOR T10', vmax: 500, acc: 34, hp: 45, kind: 'bike', scooter: true, electric: true, fly: true, len: 1.3, wid: 0.6, off: 0.55 },
    nachtfalke: { name: 'Nachtfalke', vmax: 1000, acc: 70, hp: 400, kind: 'car', len: 5.6, wid: 2.4, off: 0.8, h: 1.3, special: true },
    schattenrad: { name: 'Schattenrad', vmax: 700, acc: 52, hp: 160, kind: 'bike', len: 2.8, wid: 1.0, off: 0.75, special: true, wheelie: true },
    joyort6e: { name: 'JOYOR T6E Pro', vmax: 300, acc: 24, hp: 50, kind: 'bike', scooter: true, electric: true, teleport: true, len: 1.3, wid: 0.65, off: 0.65 }
  };
  const CAR_COLORS = ['#b02a2a', '#2a4a8a', '#e8e8e8', '#1a1a1a', '#7a7a7a', '#c0a020', '#2a6a3a', '#5a2a6a', '#d06a20'];
  L.buildVehicle = function (type, cust) {
    if (L.CUSTOM_TYPES && L.CUSTOM_TYPES[type] && L.buildCustomVehicle) return L.buildCustomVehicle(type, cust);
    const t = L.VTYPES[type], root = new T.Group(), box = G().box;
    const color = type === 'jeep' ? '#4a5a3a' : L.pick(CAR_COLORS);
    const wheels = [], steer = [];
    const wheelGeo = new T.CylinderGeometry(1, 1, 1, 14).rotateZ(Math.PI / 2);
    const mkWheel = (x, y, z, r, w, parent) => {
      const piv = grp(parent || root, x, y, z);
      const wm = new T.Mesh(wheelGeo, L.mat('#151515')); wm.scale.set(w, r, r); wm.castShadow = true; piv.add(wm);
      const rim = new T.Mesh(wheelGeo, L.mat('#9a9a9a')); rim.scale.set(w * 1.05, r * 0.5, r * 0.5); piv.add(rim);
      wheels.push(wm); return piv;
    };
    let seat, seats, glassZ = 0;
    if (t.boat) {
      // Boote: Rumpf, Aufbau, Sitze, Motor hinten
      const hc = type === 'jetski' ? L.pick(['#e03a2a', '#2a8ae0', '#e8c020']) : type === 'kutter' ? '#b03028' : '#f2f2f2', L2 = t.len, W = t.wid;
      part(box, hc, W, 0.8, L2 * 0.8, 0, 0.4, -L2 * 0.05, root);
      const bow = part(G().cone, hc, W * 0.5, L2 * 0.3, 0.8, 0, 0.45, L2 * 0.42, root); bow.rotation.x = Math.PI / 2; bow.scale.set(W * 0.5, L2 * 0.3, 0.8);
      part(box, '#1a2a3a', W * 1.02, 0.12, L2 * 0.8, 0, 0.05, -L2 * 0.05, root);
      if (type === 'jetski') { part(box, '#1a1a1a', 0.5, 0.25, 1.2, 0, 0.9, -0.3, root); part(box, '#333', 0.8, 0.06, 0.06, 0, 1.25, 0.5, root); part(box, '#333', 0.06, 0.45, 0.06, 0, 1.0, 0.45, root); }
      else if (type === 'motorboot') { part(box, '#1d2228', W * 0.8, 0.6, 0.1, 0, 1.1, L2 * 0.12, root, { opacity: 0.7 }); for (const z2 of [0, -L2 * 0.25]) part(box, '#d8d0c0', W * 0.8, 0.4, 0.9, 0, 0.95, z2, root); part(box, '#3a3a3a', 0.5, 0.7, 0.5, 0, 0.9, -L2 * 0.45, root); }
      else { part(box, '#f2f2f2', W * 0.7, 2.4, L2 * 0.28, 0, 1.6, -L2 * 0.12, root); part(box, '#1d2228', W * 0.72, 0.6, 0.1, 0, 2.3, L2 * 0.02 + 0.05, root); part(G().cyl, '#5a3a20', 0.12, 7, 0.12, 0, 0.8, L2 * 0.2, root); part(box, '#5a3a20', W * 0.9, 0.12, 0.12, 0, 5, L2 * 0.2, root); for (let k = 0; k < 4; k++) part(box, '#c8a040', 0.6, 0.4, 0.6, (k % 2 - 0.5) * 1.6, 1.0, -L2 * 0.38 + Math.floor(k / 2) * 0.8, root); }
      const pp = grp(root, 0, 0.2, -L2 * 0.47); pp.rotation.y = Math.PI / 2; const prop = grp(pp); part(box, '#222', 0.06, 0.6, 0.15, 0, 0, 0, prop); part(box, '#222', 0.06, 0.15, 0.6, 0, 0, 0, prop); wheels.push(prop);
      if (type === 'jetski') { seat = { x: 0, y: 0.75, z: -0.3 }; seats = [seat, { x: 0, y: 0.75, z: -0.9 }]; }
      else if (type === 'motorboot') { seat = { x: 0.5, y: 0.6, z: 0 }; seats = [seat, { x: -0.5, y: 0.6, z: 0 }, { x: 0.5, y: 0.6, z: -L2 * 0.25 }, { x: -0.5, y: 0.6, z: -L2 * 0.25 }]; }
      else { seat = { x: 0.6, y: 0.9, z: -L2 * 0.12 }; seats = [seat, { x: -0.6, y: 0.9, z: -L2 * 0.12 }, { x: 0.8, y: 0.9, z: -L2 * 0.35 }, { x: -0.8, y: 0.9, z: -L2 * 0.35 }]; }
    } else if (t.heli) {
      // Hubschrauber: Kanzel, Heckausleger, Kufen, Haupt- und Heckrotor
      const hc = L.pick(['#c02a2a', '#2a4a8a', '#3a4a30', '#e8e8e8']);
      part(G().sph, hc, 1.4, 1.3, 2.2, 0, 1.9, 0.6, root);
      part(G().sph, '#1d2228', 1.2, 1.0, 1.4, 0, 2.1, 1.6, root, { opacity: 0.8 });
      part(box, hc, 0.4, 0.4, 5, 0, 2.2, -3.4, root); part(box, hc, 0.15, 1.4, 1, 0, 2.8, -5.8, root);
      for (const s2 of [-1, 1]) { part(box, '#2a2a2a', 0.12, 0.12, 4, s2 * 1.1, 0.25, 0.4, root); part(box, '#2a2a2a', 0.1, 0.8, 0.1, s2 * 1.0, 0.65, 1.2, root); part(box, '#2a2a2a', 0.1, 0.8, 0.1, s2 * 1.0, 0.65, -0.6, root); }
      const rot = grp(root, 0, 3.3, 0.4); part(box, '#1a1a1a', 0.3, 0.3, 0.3, 0, 0, 0, rot); part(box, '#222', 11, 0.06, 0.4, 0, 0.15, 0, rot); part(box, '#222', 0.4, 0.06, 11, 0, 0.15, 0, rot);
      const tr = grp(root, 0.2, 2.8, -5.8); part(box, '#222', 0.05, 1.8, 0.2, 0, 0, 0, tr);
      root.userData.rotor = rot; root.userData.tail = tr;
      seat = { x: 0.4, y: 1.0, z: 1.0 };
      seats = [seat, { x: -0.4, y: 1.0, z: 1.0 }, { x: 0.4, y: 1.0, z: -0.1 }, { x: -0.4, y: 1.0, z: -0.1 }];
    } else if (t.sub) {
      // U-Boot: gelber Rumpf, Turm mit Periskop, Bullaugen, Scheinwerfer, Propeller hinten
      const yc = '#e8c020';
      part(G().cyl, yc, 1.4, 8, 1.4, 0, 1.4, 0, root).rotation.x = Math.PI / 2;
      part(G().sph, yc, 1.4, 1.4, 1.6, 0, 1.4, 4, root); part(G().sph, yc, 1.4, 1.4, 1.8, 0, 1.4, -4, root);
      part(box, yc, 1.2, 1.4, 2.6, 0, 3.0, 0.5, root); part(box, '#c8a010', 1.3, 0.2, 2.7, 0, 3.75, 0.5, root);
      part(G().cyl, '#555', 0.08, 1.6, 0.08, 0.3, 4.6, 1.2, root); part(box, '#555', 0.12, 0.12, 0.5, 0.3, 5.4, 1.4, root);
      for (const s2 of [-1, 1]) { for (let k = -1; k <= 1; k++) part(G().sph, '#8fd8ff', 0.28, 0.28, 0.12, s2 * 1.38, 1.6, k * 2, root, { basic: true, noShadow: true }); part(box, yc, 0.15, 0.6, 1.6, s2 * 1.6, 1.4, -3.5, root); }
      part(box, yc, 3.6, 0.15, 1.2, 0, 1.4, -4.6, root);
      for (const s2 of [-1, 1]) part(G().sph, '#fff8d0', 0.3, 0.3, 0.2, s2 * 0.6, 1.2, 5.4, root, { basic: true, noShadow: true });
      const pp = grp(root, 0, 1.4, -5.9); pp.rotation.y = Math.PI / 2;
      const prop = grp(pp); part(box, '#3a3a3a', 0.1, 1.6, 0.3, 0, 0, 0, prop); part(box, '#3a3a3a', 0.1, 0.3, 1.6, 0, 0, 0, prop);
      wheels.push(prop);
      seat = { x: 0.4, y: 0.9, z: 1.5 };
      seats = [seat, { x: -0.4, y: 0.9, z: 1.5 }, { x: 0.4, y: 0.9, z: -0.5 }, { x: -0.4, y: 0.9, z: -0.5 }];
      glassZ = 0;
    } else if (t.plane) {
      // kleines Propellerflugzeug: Rumpf, Flügel, Leitwerk, Propeller, drei Räder, vier Sitze
      const pc = L.pick(['#e8e8e8', '#c02a2a', '#2a6ac0', '#e8c020']);
      part(G().cyl, pc, 0.95, 8, 0.95, 0, 1.5, 0, root).rotation.x = Math.PI / 2;
      part(G().sph, pc, 0.95, 0.95, 1.3, 0, 1.5, 4, root);
      part(G().sph, pc, 0.6, 0.6, 1.6, 0, 1.6, -4.2, root);
      part(box, '#1d2228', 1.3, 0.6, 2.6, 0, 2.3, 1.2, root, { opacity: 0.8 });
      part(box, pc, 11, 0.16, 1.7, 0, 2.1, 0.8, root);
      for (const s of [-1, 1]) part(box, '#c01010', 0.4, 0.17, 1.7, s * 5.4, 2.1, 0.8, root, { basic: true, noShadow: true });
      part(box, pc, 3.6, 0.12, 1, 0, 1.8, -4.4, root);
      part(box, pc, 0.14, 1.6, 1.2, 0, 2.5, -4.4, root);
      part(box, '#c01010', 0.16, 0.5, 0.6, 0, 3.1, -4.6, root, { noShadow: true });
      // Propeller (dreht sich mit dem Tempo)
      const pp = grp(root, 0, 1.5, 5.25); pp.rotation.y = Math.PI / 2;
      const prop = grp(pp); part(box, '#222', 0.08, 2.6, 0.25, 0, 0, 0, prop); part(box, '#222', 0.08, 0.25, 2.6, 0, 0, 0, prop);
      wheels.push(prop);
      steer.push(mkWheel(0, 0.32, 3.2, 0.32, 0.18));
      for (const s of [-1, 1]) mkWheel(s * 1.4, 0.38, 0.2, 0.38, 0.22);
      seat = { x: 0.35, y: 1.05, z: 1.8 };
      seats = [seat, { x: -0.35, y: 1.05, z: 1.8 }, { x: 0.35, y: 1.05, z: 0.5 }, { x: -0.35, y: 1.05, z: 0.5 }];
      glassZ = 2.5;
    } else if (type === 'nachtfalke') {
      // Nachtfalke (eigener Entwurf): flacher, gepanzerter Schwarzwagen mit Flügel-Finnen und Düsentriebwerk
      const bk = '#141418', gd = '#ffc030', L2 = t.len, W = t.wid;
      part(box, bk, W, 0.5, L2, 0, 0.6, 0, root);
      part(box, bk, W * 0.8, 0.3, L2 * 0.35, 0, 0.5, L2 * 0.55, root).rotation.x = 0.18;
      part(box, '#0a0a0e', W * 0.62, 0.42, L2 * 0.3, 0, 1.05, -L2 * 0.02, root, { opacity: 0.85 });
      part(box, bk, W * 0.66, 0.08, L2 * 0.32, 0, 1.28, -L2 * 0.04, root);
      for (const s of [-1, 1]) {
        const fin = part(box, bk, 0.1, 1.1, 1.6, s * W * 0.42, 1.2, -L2 * 0.4, root); fin.rotation.x = -0.5; fin.rotation.z = s * 0.25;
        part(box, gd, 0.12, 0.08, 1.4, s * W * 0.42, 1.55, -L2 * 0.47, root, { basic: true, noShadow: true });
        part(box, bk, 0.5, 0.35, L2 * 0.9, s * W * 0.55, 0.45, 0, root);
        part(box, gd, 0.04, 0.05, L2 * 0.8, s * W * 0.81, 0.62, 0, root, { basic: true, noShadow: true });
        part(box, '#ffe9a0', 0.35, 0.08, 0.05, s * W * 0.3, 0.6, L2 / 2 + 0.25, root, { basic: true, noShadow: true });
      }
      part(G().cyl, '#2a2a30', 0.45, 0.6, 0.45, 0, 0.7, -L2 / 2 - 0.1, root).rotation.x = Math.PI / 2;
      const flame = part(G().cone, '#ff7a20', 0.35, 1.4, 0.35, 0, 0.7, -L2 / 2 - 0.9, root, { basic: true, noShadow: true }); flame.rotation.x = -Math.PI / 2; root.userData.flame = flame;
      const r = 0.5, wz = L2 * 0.33;
      for (const s of [-1, 1]) { steer.push(mkWheel(s * W * 0.5, r, wz, r, 0.4)); mkWheel(s * W * 0.5, r + 0.08, -wz, r + 0.08, 0.5); }
      seat = { x: 0.35, y: 0.3, z: -L2 * 0.03 };
      seats = [seat, { x: -0.35, y: 0.3, z: -L2 * 0.03 }];
      glassZ = L2 * 0.12;
    } else if (type === 'schattenrad') {
      // Schattenrad (eigener Entwurf): breites Panzer-Motorrad mit Riesenreifen und goldenen Streifen
      const bk = '#141418', gd = '#ffc030';
      part(box, bk, 0.55, 0.45, 1.8, 0, 0.75, 0, root);
      part(box, bk, 0.7, 0.3, 0.7, 0, 1.0, 0.55, root).rotation.x = -0.25;
      part(box, '#0a0a0e', 0.5, 0.25, 0.08, 0, 1.25, 0.85, root, { opacity: 0.8 });
      part(box, '#111', 0.42, 0.14, 0.8, 0, 1.0, -0.4, root);
      for (const s of [-1, 1]) part(box, gd, 0.03, 0.05, 1.7, s * 0.29, 0.8, 0, root, { basic: true, noShadow: true });
      part(box, '#888', 0.9, 0.05, 0.05, 0, 1.3, 0.75, root);
      part(box, '#ffe9a0', 0.3, 0.08, 0.06, 0, 0.95, 1.12, root, { basic: true, noShadow: true });
      part(box, '#ff3010', 0.3, 0.06, 0.05, 0, 0.95, -1.2, root, { basic: true, noShadow: true });
      steer.push(mkWheel(0, 0.48, 1.05, 0.48, 0.42));
      mkWheel(0, 0.5, -1.0, 0.5, 0.5);
      seat = { x: 0, y: 0.25, z: -0.35 };
      seats = [seat, { x: 0, y: 0.32, z: -0.85 }];
    } else if (t.kind === 'car') {
      const L2 = t.len, W = t.wid, low = type === 'sportwagen';
      part(box, color, W, low ? 0.55 : 0.7, L2, 0, low ? 0.55 : 0.7, 0, root);
      if (type === 'pickup') {
        part(box, '#1d2228', W * 0.92, 0.7, L2 * 0.38, 0, 1.4, L2 * 0.08, root);
        part(box, color, W * 0.94, 0.08, L2 * 0.36, 0, 1.78, L2 * 0.08, root);
        for (const s of [-1, 1]) part(box, color, 0.08, 0.5, L2 * 0.4, s * W * 0.46, 1.25, -L2 * 0.27, root);
        part(box, color, W, 0.5, 0.08, 0, 1.25, -L2 * 0.48, root);
        glassZ = L2 * 0.28;
      } else if (type === 'jeep') {
        part(box, '#2a2a2a', W * 0.9, 0.08, 0.06, 0, 1.75, L2 * 0.12, root);
        for (const s of [-1, 1]) { part(box, '#2a2a2a', 0.08, 0.75, 0.08, s * W * 0.44, 1.4, L2 * 0.12, root); part(box, '#2a2a2a', 0.08, 0.9, 0.08, s * W * 0.44, 1.45, -L2 * 0.3, root); }
        part(box, '#2a2a2a', W * 0.9, 0.08, L2 * 0.42, 0, 1.88, -L2 * 0.09, root);
        part(box, '#5a6a4a', 0.5, 0.5, 0.25, 0, 1.0, -L2 * 0.5, root);
        glassZ = L2 * 0.12;
      } else {
        const ch = low ? 0.45 : 0.6, cl = L2 * (low ? 0.42 : 0.5);
        part(box, '#1d2228', W * 0.9, ch, cl, 0, (low ? 0.8 : 1.05) + ch / 2, -L2 * 0.05, root, { opacity: 0.85 });
        part(box, color, W * 0.92, 0.07, cl * 0.92, 0, (low ? 0.8 : 1.05) + ch + 0.03, -L2 * 0.05, root);
        glassZ = cl / 2 - L2 * 0.05;
      }
      for (const s of [-1, 1]) {
        part(box, '#fff8d0', 0.3, 0.14, 0.05, s * W * 0.33, low ? 0.65 : 0.8, L2 / 2 + 0.01, root, { basic: true, noShadow: true });
        part(box, '#c01010', 0.3, 0.12, 0.05, s * W * 0.35, low ? 0.65 : 0.85, -L2 / 2 - 0.01, root, { basic: true, noShadow: true });
      }
      const r = 0.36, wz = L2 * 0.33;
      for (const s of [-1, 1]) {
        steer.push(mkWheel(s * W * 0.46, r, wz, r, 0.25));
        mkWheel(s * W * 0.46, r, -wz, r, 0.25);
      }
      seat = { x: W * 0.22, y: 0.25, z: -L2 * 0.03 };
      // Fahrer, Beifahrer, zwei Rücksitze (Sportwagen nur zwei Sitze; beim Pickup sitzt man hinten auf der Ladefläche)
      const back = type === 'pickup' ? { y: 0.6, z: -L2 * 0.32 } : { y: 0.25, z: -L2 * 0.27 };
      seats = [seat, { x: -W * 0.22, y: 0.25, z: -L2 * 0.03 }];
      if (type !== 'sportwagen') seats.push({ x: W * 0.22, y: back.y, z: back.z }, { x: -W * 0.22, y: back.y, z: back.z });
    } else if (t.scooter) {
      // E-Roller: Trittbrett, Lenkstange, kleine Räder, Schriftzug
      const t10 = type === 'joyort10';
      const col = t10 ? '#1a1a1a' : '#2a2c33', acc = t10 ? '#e03a2a' : '#2a8ae0';
      const dw = t10 ? 0.22 : 0.27, wr = t10 ? 0.14 : 0.17;
      part(box, col, dw, 0.08, 1.0, 0, 0.22, 0, root);
      part(box, '#0e0e0e', dw * 0.9, 0.012, 0.88, 0, 0.265, 0, root);
      part(box, acc, dw + 0.01, 0.02, 1.0, 0, 0.2, 0, root);
      const stem = part(box, col, 0.06, 1.05, 0.06, 0, 0.75, 0.5, root);
      stem.rotation.x = -0.12;
      if (!t10) { for (const s of [-1, 1]) part(box, '#888', 0.04, 0.3, 0.04, s * 0.07, 0.34, 0.47, root); }
      part(box, '#222', 0.6, 0.04, 0.04, 0, 1.25, 0.57, root);
      for (const s of [-1, 1]) part(box, acc, 0.12, 0.05, 0.05, s * 0.26, 1.25, 0.57, root);
      part(box, '#fff8d0', 0.09, 0.06, 0.04, 0, 1.05, 0.6, root, { basic: true, noShadow: true });
      part(box, '#c01010', 0.12, 0.04, 0.03, 0, 0.3, -0.52, root, { basic: true, noShadow: true });
      const label = new T.Mesh(new T.PlaneGeometry(0.85, 0.075), new T.MeshLambertMaterial({ map: L.textTex(t.name, 512, 46, col, '#ffffff', 'bold 34px Arial'), side: T.DoubleSide }));
      label.rotation.y = Math.PI / 2; label.position.set(dw / 2 + 0.006, 0.22, 0); root.add(label);
      steer.push(mkWheel(0, wr, 0.55, wr, t10 ? 0.07 : 0.09));
      mkWheel(0, wr, -0.5, wr, t10 ? 0.07 : 0.09);
      seat = { x: 0, y: 0.27, z: -0.05 };
      seats = [seat, { x: 0, y: 0.27, z: -0.42 }];
    } else {
      const cc = type === 'cross' ? '#e0a020' : type === 'roller' ? '#6ab0d0' : color;
      part(box, '#2a2a2a', 0.18, 0.25, t.len * 0.6, 0, 0.55, 0, root);
      part(box, cc, 0.36, 0.3, 0.6, 0, 0.85, 0.25, root);
      part(box, '#111', 0.3, 0.12, 0.6, 0, 0.92, -0.3, root);
      part(box, '#888', 0.7, 0.05, 0.05, 0, 1.15, 0.65, root);
      part(box, '#fff8d0', 0.15, 0.15, 0.06, 0, 0.95, 0.78, root, { basic: true, noShadow: true });
      const r = type === 'roller' ? 0.26 : 0.34;
      steer.push(mkWheel(0, r, t.len * 0.4, r, 0.14));
      mkWheel(0, r, -t.len * 0.38, r, 0.16);
      seat = { x: 0, y: 0.15, z: -0.25 };
      seats = [seat, { x: 0, y: 0.22, z: -0.72 }];
    }
    root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    return { root, wheels, steer, seat, seats, glassZ, color };
  };
  L.buildHeli = function (color) {
    const root = new T.Group(), box = G().box;
    part(G().sph, color, 1.8, 1.6, 3.2, 0, 2, 0, root);
    part(box, '#1d2228', 1.6, 1, 1.4, 0, 2.4, 1.9, root, { opacity: 0.85 });
    part(box, color, 0.5, 0.6, 6, 0, 2.4, -4.5, root);
    part(box, color, 0.15, 1.6, 1, 0, 3.2, -7.3, root);
    for (const s of [-1, 1]) part(box, '#222', 0.12, 0.12, 4.5, s * 1.3, 0.3, 0, root);
    const rotor = grp(root, 0, 3.8, 0);
    part(box, '#1a1a1a', 0.4, 0.06, 13, 0, 0, 0, rotor); part(box, '#1a1a1a', 13, 0.06, 0.4, 0, 0, 0, rotor);
    root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    return { root, rotor };
  };

  // ---------- Gegenstände ----------
  L.buildItem = function (type, inHand) {
    const g = new T.Group(), box = G().box, cyl = G().cyl, sph = G().sph;
    const d = L.ITEMS[type] || {};
    const gun = (len, h, col, mag) => {
      part(box, col, 0.06, 0.08, len, 0, 0, len / 2 - 0.05, g);
      part(box, col, 0.05, 0.13, 0.06, 0, -0.08, 0, g).rotation.x = -0.2;
      if (mag) part(box, '#1a1a1a', 0.04, 0.12, 0.05, 0, -0.08, len * 0.4, g);
      part(box, '#111', 0.03, 0.03, 0.12, 0, 0.02, len, g);
    };
    switch (type) {
      case 'hammer':
        part(box, '#8a5a2b', 0.035, 0.36, 0.035, 0, -0.12, 0, g);
        part(box, '#7a7a80', 0.06, 0.07, 0.17, 0, -0.32, 0.02, g);
        break;
      case 'minipistole': gun(0.16, 0.1, '#2a2a2a'); break;
      case 'pistole': gun(0.22, 0.12, '#1a1a1a'); break;
      case 'schrotflinte': gun(0.85, 0.1, '#5a3a1a'); part(box, '#3a2a1a', 0.06, 0.12, 0.25, 0, -0.03, -0.15, g); break;
      case 'gewehr': gun(0.75, 0.1, '#2f3a28', true); part(box, '#2f3a28', 0.06, 0.12, 0.22, 0, -0.02, -0.14, g); break;
      case 'granate': part(sph, '#3d4a2a', 0.06, 0.075, 0.06, 0, 0, 0, g); part(box, '#999', 0.02, 0.06, 0.02, 0.02, 0.07, 0, g); break;
      case 'konserve': part(cyl, '#b8b8b8', 0.05, 0.1, 0.05, 0, 0, 0, g); part(cyl, '#c03a2a', 0.052, 0.06, 0.052, 0, 0, 0, g); break;
      case 'brot': part(box, '#b07a3a', 0.12, 0.08, 0.22, 0, 0, 0, g); break;
      case 'apfel': part(sph, '#c02a1a', 0.05, 0.05, 0.05, 0, 0, 0, g); break;
      case 'riegel': part(box, '#4a2a1a', 0.04, 0.02, 0.12, 0, 0, 0, g); break;
      case 'wasser': part(cyl, '#7ab8e8', 0.035, 0.22, 0.035, 0, 0, 0, g, { opacity: 0.8 }); part(cyl, '#2a6ac0', 0.02, 0.03, 0.02, 0, 0.12, 0, g); break;
      case 'cola': part(cyl, '#c01010', 0.035, 0.12, 0.035, 0, 0, 0, g); break;
      case 'saft': part(box, '#e8a020', 0.06, 0.14, 0.04, 0, 0, 0, g); break;
      case 'verband': part(box, '#f0f0f0', 0.1, 0.06, 0.1, 0, 0, 0, g); break;
      case 'bandage': part(box, '#f4efe0', 0.08, 0.05, 0.08, 0, 0, 0, g); part(cyl, '#e8e0cc', 0.05, 0.06, 0.05, 0, 0.0, 0, g).rotation.z = Math.PI / 2; break;
      case 'tabletten': part(cyl, '#f2f2f2', 0.05, 0.1, 0.05, 0, 0, 0, g); part(cyl, '#2a8ae0', 0.052, 0.03, 0.052, 0, 0.06, 0, g); break;
      case 'spritze': { const s = part(cyl, '#bfe3ff', 0.025, 0.16, 0.025, 0, 0, 0, g, { opacity: 0.7 }); s.rotation.z = Math.PI / 2; part(box, '#d02a2a', 0.1, 0.03, 0.03, 0, 0, 0, g); const n = part(cyl, '#c8c8c8', 0.006, 0.06, 0.006, 0.11, 0, 0, g); n.rotation.z = Math.PI / 2; break; }
      case 'erstehilfe': part(box, '#2a8a3a', 0.26, 0.17, 0.12, 0, 0, 0, g); part(box, '#f2f2f2', 0.13, 0.035, 0.121, 0, 0, 0, g); part(box, '#f2f2f2', 0.035, 0.13, 0.121, 0, 0, 0, g); part(box, '#1a1a1a', 0.1, 0.02, 0.03, 0, 0.1, 0, g); break;
      case 'medkit': part(box, '#f0f0f0', 0.22, 0.14, 0.16, 0, 0, 0, g); part(box, '#c01010', 0.12, 0.03, 0.161, 0, 0, 0, g); part(box, '#c01010', 0.03, 0.12, 0.161, 0, 0, 0, g); break;
      case '9mm': part(box, '#c0a020', 0.12, 0.08, 0.08, 0, 0, 0, g); break;
      case 'schrot': part(box, '#c03020', 0.12, 0.08, 0.08, 0, 0, 0, g); break;
      case 'gewehrmuni': part(box, '#6a5030', 0.14, 0.09, 0.1, 0, 0, 0, g); break;
      case 'sicherung': part(box, '#e0c020', 0.08, 0.14, 0.05, 0, 0, 0, g); part(box, '#111', 0.081, 0.04, 0.051, 0, 0, 0, g); break;
      case 'gold': part(box, '#e8c040', 0.16, 0.06, 0.08, 0, 0, 0, g, { emissive: '#604010' }); break;
      case 'uhr': part(cyl, '#d8b040', 0.05, 0.015, 0.05, 0, 0, 0, g, { emissive: '#302008' }); break;
      case 'artefakt': part(new T.OctahedronGeometry(1), '#a040ff', 0.08, 0.12, 0.08, 0, 0, 0, g, { basic: true }); break;
      case 'note': part(box, '#f4f0e0', 0.2, 0.005, 0.27, 0, 0, 0, g, { emissive: '#606050' }); break;
      default: part(box, '#888', 0.1, 0.1, 0.1, 0, 0, 0, g);
    }
    if (inHand) {
      if (d.slot === 'waffe') g.rotation.x = Math.PI / 2;
      if (type === 'hammer') g.rotation.x = 0;
    }
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    return g;
  };
})();
