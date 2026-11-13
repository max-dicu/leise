'use strict';
// Werkstatt: sicherer Ort (außer bei großen Monstern), Münzen fürs Überleben, Custom-Teile für E-Roller und Quads
(function () {
  const L = window.L, T = THREE, P = L.player;
  const G = () => L.GEO;
  function part(geo, color, sx, sy, sz, x, y, z, parent, o) {
    const m = new T.Mesh(geo, L.mat(color, o)); m.scale.set(sx, sy, sz); m.position.set(x, y, z);
    m.castShadow = !(o && o.noShadow); if (parent) parent.add(m); return m;
  }
  const grp = (parent, x, y, z) => { const g = new T.Group(); g.position.set(x || 0, y || 0, z || 0); if (parent) parent.add(g); return g; };

  // =====================================================================
  // Münzen: 10 pro überlebter Minute. Nur wer entkommt, behält sie.
  // =====================================================================
  if (typeof L.save.coins !== 'number' || !isFinite(L.save.coins)) L.save.coins = 0;
  if (!Array.isArray(L.save.owned)) L.save.owned = [];
  if (!L.save.cust || typeof L.save.cust !== 'object') L.save.cust = {};
  const coinHud = document.createElement('div'); coinHud.id = 'coinHud'; coinHud.hidden = true; document.body.appendChild(coinHud);
  const st = document.createElement('style');
  st.textContent = '#coinHud{position:fixed;left:12px;top:124px;background:rgba(0,0,0,.55);color:#ffd84a;font-weight:800;padding:4px 10px;border-radius:8px;z-index:6;pointer-events:none;font-size:15px;text-shadow:0 0 3px #000}'
    + '#coinHud small{color:#fff;font-weight:600;opacity:.85}'
    + '#wsPanel{position:fixed;right:8px;top:8px;bottom:8px;width:min(470px,96vw);overflow:auto;background:rgba(14,16,22,.93);border:2px solid #39ff14;border-radius:12px;z-index:30;color:#fff;padding:10px 12px;font-family:inherit}'
    + '#wsPanel h2{margin:0 0 4px;font-size:20px}#wsPanel .coins{color:#ffd84a;font-weight:800}'
    + '#wsPanel .tabs{display:flex;flex-wrap:wrap;gap:4px;margin:8px 0}#wsPanel .tabs button{padding:5px 8px;border-radius:7px;border:1px solid #555;background:#23262e;color:#fff;cursor:pointer;font-size:13px}'
    + '#wsPanel .tabs button.on{background:#39ff14;color:#000;border-color:#39ff14}'
    + '#wsPanel .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(98px,1fr));gap:6px}'
    + '#wsPanel .opt{position:relative;padding:6px 4px 4px;border-radius:8px;border:2px solid #333;background:#1b1e25;color:#fff;cursor:pointer;font-size:12px;text-align:center;min-height:54px}'
    + '#wsPanel .opt.eq{border-color:#39ff14}#wsPanel .opt.no{opacity:.55}#wsPanel .opt .sw{display:block;width:30px;height:18px;margin:0 auto 3px;border-radius:4px;border:1px solid #fff5}'
    + '#wsPanel .opt .pr{display:block;color:#ffd84a;font-weight:700;margin-top:2px}#wsPanel .opt .pr.ok{color:#7dff7d}'
    + '#wsPanel .row{display:flex;gap:6px;align-items:center;margin-top:8px;flex-wrap:wrap}#wsPanel input{padding:5px;border-radius:6px;border:1px solid #555;background:#111;color:#fff;width:120px}'
    + '#wsPanel .close{position:sticky;bottom:0;width:100%;margin-top:10px}';
  document.head.appendChild(st);
  let coinMsgT = 0;
  function updateCoins(dt) {
    const R = L.round, on = L.state === 'game' && R && !R.over && P.alive && !P.gone;
    coinHud.hidden = L.state !== 'game';
    if (on && !L.cine) {
      R.coinT = (R.coinT || 0) + dt;
      if (R.coinT >= 60) { R.coinT -= 60; R.coins = (R.coins || 0) + 10; L.msg('🪙 +10 Münzen fürs Überleben! (nur wenn du entkommst)', 2500); if (L.snd.pickup) L.snd.pickup(); }
    }
    coinMsgT -= dt; if (coinMsgT > 0 && coinHud.dataset.v) return; coinMsgT = 0.5;
    const r = (R && R.coins) || 0, txt = '🪙 ' + L.save.coins + (r ? ' <small>+' + r + ' in dieser Runde</small>' : '');
    if (coinHud.dataset.v !== txt) { coinHud.dataset.v = txt; coinHud.innerHTML = txt; }
  }
  // am Rundenende: entkommen = Münzen gutschreiben, gestorben = weg
  L.roundCoins = function (result) {
    const R = L.round, n = (R && R.coins) || 0; if (!R) return;
    R.coinRes = result;
    if (result === 'escape' && n > 0) { L.save.coins += n; R.coinPaid = n; }
  };
  L.coinEndText = function () {
    const R = L.round; if (!R) return '';
    const n = R.coins || 0;
    if (R.coinRes === 'escape') return n ? `🪙 +${n} Münzen gespeichert (jetzt ${L.save.coins}).` : `🪙 Du hast ${L.save.coins} Münzen.`;
    return n ? `🪙 ${n} Münzen verloren – nur wer entkommt, behält sie.` : '';
  };
  // Münzen verschenken (Lobby / Werkstatt)
  L.giftCoins = function (pid, n) {
    n = Math.floor(+n);
    if (!(n > 0)) return false;
    if (n > L.save.coins) { L.msg('Du hast nur ' + L.save.coins + ' Münzen.'); return false; }
    if (!L.mp || !L.mp.sendTo) return false;
    L.save.coins -= n; L.persist();
    L.mp.sendTo(pid, { t: 'coins', n });
    L.msg('🪙 ' + n + ' Münzen verschenkt!', 3000);
    return true;
  };
  L.gotCoins = function (n, fromName) {
    n = Math.floor(+n); if (!(n > 0) || n > 1000000) return;
    L.save.coins += n; L.persist();
    L.msg('🎁 ' + fromName + ' hat dir 🪙 ' + n + ' Münzen geschenkt!', 6000);
  };

  // =====================================================================
  // Custom-Teile
  // =====================================================================
  L.CUSTOM_TYPES = { joyort10: 1, joyort6e: 1, quad: 1, atv: 1 };
  const DEF = {
    joyort10: { body: '#1a1a1a', accent: '#c02a2a', frame: '#1a1a1a', seat: '#1a1a1a', rims: '#7a7a7a', tires: 'std', rimStyle: 'std', led: 'none', ledFx: 'static', light: 'std', decal: 'none', bar: 'std', exhaust: 'std', extra: 'none', plate: '' },
    joyort6e: { body: '#2a2c33', accent: '#2a8ae0', frame: '#2a2c33', seat: '#1a1a1a', rims: '#7a7a7a', tires: 'std', rimStyle: 'std', led: 'none', ledFx: 'static', light: 'std', decal: 'none', bar: 'std', exhaust: 'std', extra: 'none', plate: '' },
    quad: { body: '#c02a2a', accent: '#1a1a1a', frame: '#1a1a1a', seat: '#1a1a1a', rims: '#7a7a7a', tires: 'slick', rimStyle: 'std', led: 'none', ledFx: 'static', light: 'std', decal: 'streifen', bar: 'std', exhaust: 'std', extra: 'none', plate: '' },
    atv: { body: '#4a5a3a', accent: '#1a1a1a', frame: '#2a2a2a', seat: '#1a1a1a', rims: '#1a1a1a', tires: 'offroad', rimStyle: 'std', led: 'none', ledFx: 'static', light: 'std', decal: 'none', bar: 'std', exhaust: 'std', extra: 'gepaeck', plate: '' }
  };
  L.CUSTOM_DEF = DEF;
  // Farben: jede Farbe einmal kaufen, dann für alle Teile nutzbar
  const COLORS = [['#1a1a1a', 'Schwarz', 25], ['#f2f2f2', 'Weiß', 25], ['#7a7a7a', 'Grau', 20], ['#4a2f1c', 'Braun', 30], ['#8a5a2b', 'Hellbraun', 30], ['#d8b46a', 'Sand', 55],
    ['#a83a1c', 'Rost', 40], ['#c02a2a', 'Rot', 45], ['#e07020', 'Orange', 45], ['#e8c020', 'Gelb', 55], ['#3a8a3a', 'Grün', 40], ['#4a5a3a', 'Oliv', 35], ['#2a6a6a', 'Petrol', 50],
    ['#2a6ac0', 'Blau', 45], ['#1e2f5a', 'Dunkelblau', 35], ['#6a3a8a', 'Lila', 65], ['#d04a9a', 'Pink', 80], ['#9ad0ff', 'Babyblau', 70], ['#7fe0c0', 'Mint', 70],
    ['#ffb7d5', 'Kirschblüte', 120], ['#ff4fd8', 'Neonpink', 150], ['#39ff14', 'Neongrün', 150], ['#00e5ff', 'Neoncyan', 150], ['#e8eef4', 'Chrom', 250], ['#d4af37', 'Gold', 300], ['#2a2c33', 'Anthrazit', 30], ['#2a8ae0', 'Himmelblau', 40]];
  const CNAME = {}; for (const c of COLORS) CNAME[c[0]] = c[1];
  const LEDS = [['none', 'Aus', 0], ['#00e5ff', 'Cyan', 160], ['#ff2a2a', 'Rot', 140], ['#39ff14', 'Grün', 140], ['#2a6aff', 'Blau', 150], ['#ff4fd8', 'Pink', 180], ['#b04aff', 'Lila', 180], ['#ffffff', 'Weiß', 120], ['#ffb000', 'Gold', 220]];
  // Kategorien: [key, Titel, Optionen [wert, name, preis], nur für]
  const CATS = [
    ['body', '🎨 Lack', 'color'], ['accent', '🎨 Akzente', 'color'], ['frame', '🎨 Rahmen', 'color'], ['seat', '🎨 Sitz/Griffe', 'color'], ['rims', '🎨 Felgenfarbe', 'color'],
    ['tires', '🛞 Reifen', [['std', 'Standard', 0], ['slick', 'Slicks', 160], ['offroad', 'Stollen', 120], ['weisswand', 'Weißwand', 140], ['monster', 'Monster', 450]]],
    ['rimStyle', '⚙️ Felgen', [['std', 'Standard', 0], ['speiche', 'Speichen', 100], ['tief', 'Tiefbett', 180], ['chrom', 'Chrom', 250], ['gold', 'Gold', 500]]],
    ['led', '💡 Unterboden-LED', LEDS],
    ['ledFx', '✨ LED-Effekt', [['static', 'Leuchten', 0], ['puls', 'Pulsieren', 150], ['blink', 'Blinken', 120], ['regenbogen', 'Regenbogen', 600], ['bluete', '🌸 Blossom', 900], ['schwarzweiss', '🖤🤍 Black & White', 700], ['galaxie', '🌌 Galaxie', 1000], ['feuer', '🔥 Feuerspur', 800], ['eis', '❄️ Eisspur', 750], ['disco', '🪩 Disco', 650]]],
    ['light', '🔦 Lichter', [['std', 'Standard', 0], ['doppel', 'Doppel', 120], ['bar', 'Lichtleiste', 180], ['neon', 'Neon-Rand', 260]]],
    ['decal', '🖌️ Muster', [['none', 'Keins', 0], ['streifen', 'Rennstreifen', 90], ['sterne', 'Sterne', 130], ['blitz', 'Blitze', 160], ['camo', 'Camo', 180], ['flammen', 'Flammen', 220], ['bluete', '🌸 Blüten', 350], ['zebra', '🦓 Black & White Zebra', 300], ['schach', '🏁 Schachbrett', 250], ['galaxie', '🌌 Galaxie', 450], ['pinkcamo', '💗 Pink-Camo', 280], ['herzen', '💕 Herzen', 220]]],
    ['bar', '🔧 Lenker', [['std', 'Standard', 0], ['tief', 'Tief', 90], ['hoch', 'Hoch (Ape)', 110], ['drag', 'Drag', 140]]],
    ['exhaust', '🔥 Auspuff', [['std', 'Standard', 0], ['sport', 'Sport', 200], ['doppel', 'Doppelrohr', 320], ['turbo', 'Turbo mit Flammen', 550]], 'quad'],
    ['extra', '🧩 Extras', [['none', 'Nichts', 0], ['korb', 'Korb', 60], ['flagge', 'Fahne', 70], ['gepaeck', 'Gepäckträger', 80], ['spoiler', 'Spoiler', 150], ['hupe', 'Fanfare', 110]]]
  ];
  L.CUSTOM_CATS = CATS;
  const isQuad = (type) => type === 'quad' || type === 'atv';
  function optsOf(cat) { return cat[2] === 'color' ? COLORS : cat[2]; }
  function priceOf(cat, val) { const o = optsOf(cat).find((q) => q[0] === val); return o ? o[2] : 0; }
  function ownKey(cat, val) { return cat[2] === 'color' ? 'farbe:' + val : cat[0] + ':' + val; }
  // alle anderen Landfahrzeuge (Autos, Motorräder, Nachtfalke …): Lack, LEDs, Muster, Kennzeichen
  const overlayOk = (t) => !!t && !t.police && !t.boat && !t.sub && !t.plane && !t.heli && (t.kind === 'car' || t.kind === 'bike');
  const OVER_DEF = { body: 'orig', accent: '#f2f2f2', frame: '#1a1a1a', seat: '#1a1a1a', rims: '#7a7a7a', tires: 'std', rimStyle: 'std', led: 'none', ledFx: 'static', light: 'std', decal: 'none', bar: 'std', exhaust: 'std', extra: 'none', plate: '' };
  const OVER_CATS = ['body', 'led', 'ledFx', 'decal'];
  const defFor = (type) => DEF[type] || OVER_DEF;
  const canCust = (v) => !!v && (!!L.CUSTOM_TYPES[v.type] || overlayOk(v.t));
  L.canCustom = canCust;
  function owned(cat, val, type) {
    if (val === 'orig') return true;
    if (defFor(type)[cat[0]] === val) return true;
    if (priceOf(cat, val) === 0) return true;
    return L.save.owned.includes(ownKey(cat, val));
  }
  // Sicher gegen kaputte Daten (z. B. aus dem Netz)
  function sanitize(type, c) {
    const d = defFor(type), out = Object.assign({}, d);
    if (!c || typeof c !== 'object') return out;
    for (const cat of CATS) { const v = c[cat[0]]; if (optsOf(cat).some((q) => q[0] === v)) out[cat[0]] = v; }
    out.plate = typeof c.plate === 'string' ? c.plate.replace(/[^A-Za-z0-9ÄÖÜäöü \-]/g, '').slice(0, 9).toUpperCase() : '';
    return out;
  }
  L.custFor = (type) => sanitize(type, L.save.cust[type]);

  // ---------- Muster als Bild ----------
  const decalCache = {};
  function decalTex(kind, accent) {
    const key = kind + accent; if (decalCache[key]) return decalCache[key];
    const c = document.createElement('canvas'); c.width = 256; c.height = 96; const g = c.getContext('2d');
    let sd = 7; const rnd = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
    if (kind === 'flammen') {
      for (let i = 0; i < 6; i++) { const x0 = i * 40; const gr = g.createLinearGradient(x0, 0, x0 + 90, 0); gr.addColorStop(0, '#ff2a00'); gr.addColorStop(0.5, '#ff9a00'); gr.addColorStop(1, '#ffe24a'); g.fillStyle = gr; g.beginPath(); g.moveTo(x0, 30); g.quadraticCurveTo(x0 + 50, 10 + i * 3, x0 + 95, 20 + (i % 2) * 20); g.quadraticCurveTo(x0 + 50, 50, x0 + 80, 70); g.quadraticCurveTo(x0 + 40, 70, x0, 66); g.closePath(); g.fill(); }
    } else if (kind === 'streifen') {
      g.fillStyle = '#ffffff'; g.fillRect(0, 30, 256, 12); g.fillRect(0, 54, 256, 12); g.fillStyle = accent; g.fillRect(0, 42, 256, 12);
    } else if (kind === 'bluete') {
      for (let i = 0; i < 9; i++) {
        const x = 18 + i * 28 + rnd() * 8, y = 20 + rnd() * 56, r = 9 + rnd() * 7;
        g.fillStyle = i % 2 ? '#ffb7d5' : '#ff8fc0';
        for (let k = 0; k < 5; k++) { const a = k / 5 * 6.283; g.beginPath(); g.ellipse(x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.7, r * 0.55, r * 0.38, a, 0, 6.283); g.fill(); }
        g.fillStyle = '#ffe24a'; g.beginPath(); g.arc(x, y, r * 0.25, 0, 6.283); g.fill();
      }
      g.strokeStyle = '#6a3a2a'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 80); for (let x = 0; x <= 256; x += 32) g.quadraticCurveTo(x + 16, 60, x + 32, 82); g.stroke();
    } else if (kind === 'camo') {
      const cols = ['#3a4a2a', '#6a5a3a', '#1f2a18', '#7a7a50'];
      for (let i = 0; i < 26; i++) { g.fillStyle = cols[i % 4]; g.beginPath(); g.ellipse(rnd() * 256, rnd() * 96, 12 + rnd() * 18, 7 + rnd() * 10, rnd() * 3, 0, 6.283); g.fill(); }
    } else if (kind === 'blitz') {
      g.fillStyle = '#ffe24a'; g.strokeStyle = '#000'; g.lineWidth = 3;
      for (let i = 0; i < 3; i++) { const x = 20 + i * 85; g.beginPath(); g.moveTo(x, 10); g.lineTo(x + 40, 10); g.lineTo(x + 25, 42); g.lineTo(x + 50, 42); g.lineTo(x + 5, 90); g.lineTo(x + 18, 52); g.lineTo(x - 5, 52); g.closePath(); g.fill(); g.stroke(); }
    } else if (kind === 'zebra') {
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, 256, 96); g.fillStyle = '#111111';
      for (let i = 0; i < 12; i++) { const x = i * 24 + rnd() * 8; g.beginPath(); g.moveTo(x, 0); g.quadraticCurveTo(x + 18 + rnd() * 10, 48, x + 4, 96); g.lineTo(x + 12, 96); g.quadraticCurveTo(x + 26, 48, x + 10, 0); g.closePath(); g.fill(); }
    } else if (kind === 'schach') {
      for (let i = 0; i < 16; i++) for (let j = 0; j < 6; j++) { g.fillStyle = (i + j) % 2 ? '#111111' : '#ffffff'; g.fillRect(i * 16, j * 16, 16, 16); }
    } else if (kind === 'galaxie') {
      const gr = g.createLinearGradient(0, 0, 256, 96); gr.addColorStop(0, '#1a0a3a'); gr.addColorStop(0.5, '#4a1a8a'); gr.addColorStop(1, '#0a2a5a'); g.fillStyle = gr; g.fillRect(0, 0, 256, 96);
      for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? 'rgba(255,80,200,0.35)' : 'rgba(80,200,255,0.35)'; g.beginPath(); g.ellipse(rnd() * 256, rnd() * 96, 30 + rnd() * 30, 12 + rnd() * 12, rnd() * 3, 0, 6.283); g.fill(); }
      g.fillStyle = '#ffffff'; for (let i = 0; i < 70; i++) { const r = rnd() * 1.8 + 0.4; g.beginPath(); g.arc(rnd() * 256, rnd() * 96, r, 0, 6.283); g.fill(); }
    } else if (kind === 'pinkcamo') {
      const cols = ['#ff8fc0', '#d04a9a', '#ffd0e8', '#a02a6a'];
      for (let i = 0; i < 26; i++) { g.fillStyle = cols[i % 4]; g.beginPath(); g.ellipse(rnd() * 256, rnd() * 96, 12 + rnd() * 18, 7 + rnd() * 10, rnd() * 3, 0, 6.283); g.fill(); }
    } else if (kind === 'herzen') {
      for (let i = 0; i < 9; i++) { const x = 16 + i * 28, y = 24 + (i % 3) * 24, r = 9; g.fillStyle = i % 2 ? '#ff2a6a' : '#ff8fc0'; g.beginPath(); g.moveTo(x, y + r); g.bezierCurveTo(x - r * 1.6, y - r * 0.2, x - r * 0.6, y - r * 1.4, x, y - r * 0.4); g.bezierCurveTo(x + r * 0.6, y - r * 1.4, x + r * 1.6, y - r * 0.2, x, y + r); g.fill(); }
    } else if (kind === 'sterne') {
      g.fillStyle = '#ffffff';
      for (let i = 0; i < 8; i++) { const x = 16 + i * 31, y = 20 + (i % 3) * 26, r = 10 - (i % 2) * 3; g.beginPath(); for (let k = 0; k < 10; k++) { const a = k / 10 * 6.283 - 1.57, rr = k % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.fill(); }
    }
    const t = new T.CanvasTexture(c); decalCache[key] = t; return t;
  }
  function decalPlane(parent, kind, accent, w, h, x, y, z, ry) {
    if (kind === 'none') return;
    const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshLambertMaterial({ map: decalTex(kind, accent), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    m.position.set(x, y, z); m.rotation.y = ry || 0; parent.add(m); return m;
  }

  // ---------- Räder ----------
  const wheelGeo = new T.CylinderGeometry(1, 1, 1, 16).rotateZ(Math.PI / 2);
  function tireSpec(c, base) {
    const k = c.tires;
    return { r: base * (k === 'monster' ? 1.55 : k === 'offroad' ? 1.08 : 1), w: k === 'monster' ? 1.6 : k === 'slick' ? 1.35 : 1 };
  }
  function makeWheel(parent, x, y, z, r, w, c, wheels) {
    const piv = grp(parent, x, y, z), spin = grp(piv);
    part(wheelGeo, '#151515', w, r, r, 0, 0, 0, spin);
    if (c.tires === 'offroad' || c.tires === 'monster') for (let k = 0; k < 12; k++) { const a = k / 12 * 6.283; const kn = part(G().box, '#202020', w * 1.02, r * 0.16, r * 0.22, 0, Math.cos(a) * r, Math.sin(a) * r, spin); kn.rotation.x = -a; }
    if (c.tires === 'weisswand') for (const s of [-1, 1]) part(wheelGeo, '#f2f2f2', 0.01, r * 0.82, r * 0.82, s * w * 0.51, 0, 0, spin, { noShadow: true });
    const rs = c.rimStyle, rc = rs === 'gold' ? '#d4af37' : rs === 'chrom' ? '#e8eef4' : c.rims;
    const rimR = rs === 'tief' ? r * 0.62 : r * 0.55;
    part(wheelGeo, rc, w * 1.06, rimR, rimR, 0, 0, 0, spin, rs === 'chrom' || rs === 'gold' ? { basic: false } : undefined);
    if (rs === 'tief') part(wheelGeo, shade(rc, 0.7), w * 1.08, rimR * 0.6, rimR * 0.6, 0, 0, 0, spin);
    if (rs === 'speiche') for (let k = 0; k < 6; k++) { const sp = part(G().box, shade(rc, 1.2), w * 1.1, rimR * 1.9, 0.02, 0, 0, 0, spin); sp.rotation.x = k / 6 * Math.PI; }
    else for (let k = 0; k < 5; k++) { const sp = part(G().box, shade(rc, 0.75), w * 1.1, rimR * 0.5, rimR * 0.18, 0, Math.cos(k * 1.257) * rimR * 0.55, Math.sin(k * 1.257) * rimR * 0.55, spin, { noShadow: true }); sp.rotation.x = -k * 1.257; }
    part(wheelGeo, '#333', w * 1.12, r * 0.14, r * 0.14, 0, 0, 0, spin, { noShadow: true });
    wheels.push(spin); return piv;
  }
  function shade(hex, f) { const c = new T.Color(hex); c.multiplyScalar(f); c.r = Math.min(1, c.r); c.g = Math.min(1, c.g); c.b = Math.min(1, c.b); return '#' + c.getHexString(); }
  // LED-Unterboden
  function underglow(root, c, w, l, y) {
    if (c.led === 'none') return;
    const mat = new T.MeshBasicMaterial({ color: c.led, transparent: true, opacity: 0.55, blending: T.AdditiveBlending, depthWrite: false, fog: false });
    const pl = new T.Mesh(new T.PlaneGeometry(w * 1.9, l * 1.4), mat); pl.rotation.x = -Math.PI / 2; pl.position.y = 0.04; root.add(pl);
    const smat = new T.MeshBasicMaterial({ color: c.led, fog: false });
    for (const s of [-1, 1]) { const b = new T.Mesh(G().box, smat); b.scale.set(0.03, 0.03, l * 0.8); b.position.set(s * w * 0.45, y, 0); root.add(b); }
    root.userData.led = { mat, smat, fx: c.ledFx, color: new T.Color(c.led) };
  }
  // Lenker in verschiedenen Formen
  function handlebar(g, c, width) {
    const fr = c.frame, gp = c.seat;
    if (c.bar === 'hoch') { for (const s of [-1, 1]) part(G().box, fr, 0.04, 0.36, 0.04, s * width * 0.38, 0.18, -0.02, g); part(G().box, fr, width * 0.8, 0.04, 0.04, 0, 0.36, -0.02, g); for (const s of [-1, 1]) part(G().box, gp, 0.12, 0.05, 0.05, s * width * 0.45, 0.36, -0.06, g); }
    else if (c.bar === 'drag') { part(G().box, fr, width * 1.15, 0.04, 0.04, 0, 0.0, 0, g); for (const s of [-1, 1]) part(G().box, gp, 0.12, 0.05, 0.05, s * width * 0.62, 0, 0, g); }
    else if (c.bar === 'tief') { for (const s of [-1, 1]) { const a = part(G().box, fr, width * 0.42, 0.04, 0.04, s * width * 0.25, -0.08, 0.02, g); a.rotation.z = s * 0.35; part(G().box, gp, 0.12, 0.05, 0.05, s * width * 0.5, -0.16, 0.02, g); } }
    else { part(G().box, fr, width, 0.04, 0.04, 0, 0, 0, g); for (const s of [-1, 1]) part(G().box, gp, 0.12, 0.05, 0.05, s * width * 0.45, 0, 0, g); }
  }
  function extras(root, c, opts) {
    const e = c.extra, fr = c.frame;
    if (e === 'korb') { const k = grp(root, 0, opts.korbY, opts.korbZ); part(G().box, '#8a6a3a', 0.34, 0.22, 0.26, 0, 0, 0, k); part(G().box, '#5a4020', 0.3, 0.02, 0.22, 0, 0.11, 0, k, { noShadow: true }); }
    else if (e === 'flagge') { part(G().cyl, '#ccc', 0.012, 1.5, 0.012, opts.flagX, opts.flagY + 0.75, opts.flagZ, root); const f = part(G().box, c.accent === '#1a1a1a' ? '#e07020' : c.accent, 0.01, 0.25, 0.38, opts.flagX, opts.flagY + 1.35, opts.flagZ - 0.19, root, { noShadow: true }); root.userData.flag = f; }
    else if (e === 'gepaeck') { for (const z of opts.rackZ) { part(G().box, fr, opts.rackW, 0.03, 0.4, 0, opts.rackY, z, root); for (let k = -2; k <= 2; k++) part(G().box, fr, 0.02, 0.03, 0.4, k * opts.rackW * 0.22, opts.rackY + 0.02, z, root, { noShadow: true }); } }
    else if (e === 'spoiler') { part(G().box, c.accent, opts.rackW * 0.95, 0.03, 0.18, 0, opts.spY, opts.spZ, root); for (const s of [-1, 1]) part(G().box, fr, 0.03, 0.18, 0.03, s * opts.rackW * 0.35, opts.spY - 0.09, opts.spZ, root); }
    else if (e === 'hupe') { for (const s of [-1, 1]) { const h = part(G().cone, '#d4af37', 0.05, 0.22, 0.05, s * 0.1, opts.korbY + 0.08, opts.korbZ, root); h.rotation.x = Math.PI / 2; } }
  }
  function plate(root, c, x, y, z, ry) {
    if (!c.plate) return;
    const m = new T.Mesh(new T.PlaneGeometry(0.34, 0.09), new T.MeshLambertMaterial({ map: L.textTex(c.plate, 256, 64, '#f2f2f2', '#111', 'bold 40px Arial'), side: T.DoubleSide }));
    m.position.set(x, y, z); m.rotation.y = ry; root.add(m);
  }
  function lights(root, c, front, back, w) {
    const ns = { basic: true, noShadow: true };
    if (c.light === 'doppel') for (const s of [-1, 1]) part(G().box, '#fff8d0', 0.08, 0.06, 0.04, s * w * 0.25, front.y, front.z, root, ns);
    else if (c.light === 'bar') { part(G().box, '#222', w * 0.8, 0.07, 0.06, 0, front.y + 0.12, front.z - 0.02, root); for (let k = -3; k <= 3; k++) part(G().box, '#fffbe8', w * 0.09, 0.05, 0.02, k * w * 0.105, front.y + 0.12, front.z + 0.02, root, ns); }
    else part(G().box, '#fff8d0', 0.1, 0.06, 0.04, 0, front.y, front.z, root, ns);
    if (c.light === 'neon') { const col = c.led !== 'none' ? c.led : c.accent; for (const s of [-1, 1]) part(G().box, col, 0.02, 0.02, Math.abs(front.z - back.z) * 0.9, s * w * 0.5, back.y, (front.z + back.z) / 2, root, ns); }
    part(G().box, '#c01010', 0.12, 0.05, 0.03, 0, back.y, back.z, root, ns);
  }

  // ---------- E-Roller ----------
  function buildScooter(type, c) {
    const root = new T.Group(), wheels = [], steer = [], t = L.VTYPES[type], t10 = type === 'joyort10';
    const dw = t10 ? 0.22 : 0.27, base = t10 ? 0.14 : 0.17, ts = tireSpec(c, base), wr = ts.r, lift = wr - base;
    const B = grp(root, 0, lift, 0);
    part(G().box, c.body, dw, 0.08, 1.0, 0, 0.22, 0, B);
    part(G().box, '#0e0e0e', dw * 0.9, 0.012, 0.88, 0, 0.265, 0, B);
    part(G().box, c.accent, dw + 0.01, 0.02, 1.0, 0, 0.2, 0, B);
    const stem = part(G().box, c.frame, 0.06, 1.05, 0.06, 0, 0.75, 0.5, B); stem.rotation.x = -0.12;
    part(G().box, c.body, 0.14, 0.5, 0.03, 0, 0.62, 0.53, B).rotation.x = -0.12; // Verkleidung am Lenkrohr (für Muster)
    if (!t10) for (const s of [-1, 1]) part(G().box, '#888', 0.04, 0.3, 0.04, s * 0.07, 0.34, 0.47, B);
    const hb = grp(B, 0, 1.25, 0.57); handlebar(hb, c, 0.6);
    lights(B, c, { y: 1.05, z: 0.6 }, { y: 0.3, z: -0.52 }, dw + 0.1);
    const label = new T.Mesh(new T.PlaneGeometry(0.85, 0.075), new T.MeshLambertMaterial({ map: L.textTex(t.name, 512, 46, c.body, '#ffffff', 'bold 34px Arial'), side: T.DoubleSide }));
    label.rotation.y = Math.PI / 2; label.position.set(dw / 2 + 0.006, 0.22, 0); B.add(label);
    for (const s of [-1, 1]) { const dp = decalPlane(B, c.decal, c.accent, 0.13, 0.48, 0, 0.62, 0.53 + s * 0.017, s > 0 ? 0 : Math.PI); if (dp) dp.rotation.x = -0.12 * s; }
    steer.push(makeWheel(root, 0, wr, 0.55, wr, (t10 ? 0.07 : 0.09) * ts.w, c, wheels));
    makeWheel(root, 0, wr, -0.5, wr, (t10 ? 0.07 : 0.09) * ts.w, c, wheels);
    underglow(root, c, dw * 1.6, 1.0, 0.17 + lift);
    extras(B, c, { korbY: 1.12, korbZ: 0.75, flagX: 0, flagY: 0.25, flagZ: -0.5, rackW: dw + 0.08, rackY: 0.4, rackZ: [-0.55], spY: 0.5, spZ: -0.55 });
    plate(B, c, 0, 0.36, -0.53, Math.PI);
    const seat = { x: 0, y: 0.27 + lift, z: -0.05 };
    root.traverse((o) => { if (o.isMesh && o.castShadow !== false) o.castShadow = true; });
    return { root, wheels, steer, seat, seats: [seat, { x: 0, y: 0.27 + lift, z: -0.42 }], glassZ: 0, color: c.body };
  }
  // ---------- Quad / ATV ----------
  function buildQuad(type, c) {
    const root = new T.Group(), wheels = [], steer = [], atv = type === 'atv';
    const base = 0.32, ts = tireSpec(c, base), r = ts.r, lift = r - base + (atv ? 0.06 : 0);
    const B = grp(root, 0, lift, 0);
    part(G().box, c.frame, 0.5, 0.12, 1.5, 0, 0.42, 0, B);
    for (const s of [-1, 1]) part(G().box, c.frame, 0.24, 0.04, 0.5, s * 0.42, 0.36, 0, B);
    // vorne
    part(G().box, c.body, 1.12, 0.16, 0.56, 0, 0.72, 0.66, B);
    for (const s of [-1, 1]) { const f = part(G().box, c.body, 0.3, 0.12, 0.56, s * 0.48, 0.66, 0.66, B); f.rotation.z = -s * 0.35; }
    const nose = part(G().box, c.body, 0.62, 0.2, 0.3, 0, 0.62, 1.0, B); nose.rotation.x = 0.35;
    part(G().box, c.accent, 0.64, 0.04, 0.32, 0, 0.73, 1.02, B).rotation.x = 0.35;
    // hinten
    part(G().box, c.body, 1.16, 0.16, 0.62, 0, 0.74, -0.64, B);
    for (const s of [-1, 1]) { const f = part(G().box, c.body, 0.3, 0.12, 0.62, s * 0.5, 0.68, -0.64, B); f.rotation.z = -s * 0.35; }
    part(G().box, c.accent, 0.5, 0.05, 0.62, 0, 0.83, -0.64, B);
    // Tank, Sitz, Motor
    part(G().box, c.body, 0.42, 0.22, 0.42, 0, 0.8, 0.22, B);
    part(G().box, c.seat, 0.36, 0.12, 0.72, 0, 0.88, -0.26, B);
    part(G().box, '#2a2a2a', 0.34, 0.3, 0.42, 0, 0.5, 0, B);
    for (const s of [-1, 1]) part(G().box, '#555', 0.06, 0.06, 0.4, s * 0.19, 0.5, 0.0, B);
    // Stoßfänger vorne
    part(G().box, c.frame, 0.7, 0.05, 0.05, 0, 0.5, 1.18, B); for (const s of [-1, 1]) part(G().box, c.frame, 0.05, 0.25, 0.05, s * 0.3, 0.55, 1.14, B);
    // Lenker
    part(G().cyl, c.frame, 0.035, 0.32, 0.035, 0, 0.98, 0.46, B);
    const hb = grp(B, 0, 1.12, 0.46); handlebar(hb, c, 0.82);
    lights(B, c, { y: 0.7, z: 1.15 }, { y: 0.76, z: -0.96 }, 0.62);
    // Muster an den Seiten
    for (const s of [-1, 1]) { decalPlane(B, c.decal, c.accent, 0.56, 0.2, s * 0.585, 0.72, -0.64, s * Math.PI / 2); decalPlane(B, c.decal, c.accent, 0.5, 0.18, s * 0.566, 0.72, 0.66, s * Math.PI / 2); }
    if (c.decal === 'streifen') part(G().box, '#f2f2f2', 0.1, 0.012, 0.56, 0, 0.805, 0.66, B, { noShadow: true });
    // Auspuff
    const ex = c.exhaust, chrome = '#d8dde2';
    const pipe = (x, big) => { const p = part(G().cyl, ex === 'std' ? '#555' : chrome, big ? 0.07 : 0.05, 0.45, big ? 0.07 : 0.05, x, 0.55, -0.95, B); p.rotation.x = Math.PI / 2 - 0.15; part(G().cyl, '#111', big ? 0.05 : 0.035, 0.02, big ? 0.05 : 0.035, x, 0.58, -1.18, B, { noShadow: true }).rotation.x = Math.PI / 2; };
    if (ex === 'doppel') { pipe(0.22, false); pipe(-0.22, false); } else pipe(0.28, ex === 'sport' || ex === 'turbo');
    if (ex === 'turbo') { const fl = part(G().cone, '#ff7a20', 0.08, 0.35, 0.08, 0.28, 0.6, -1.36, B, { basic: true, noShadow: true }); fl.rotation.x = -Math.PI / 2; fl.visible = false; root.userData.flame = fl; }
    // Räder
    const wx = 0.52 + (ts.w - 1) * 0.06;
    for (const s of [-1, 1]) { steer.push(makeWheel(root, s * wx, r, 0.68, r, 0.24 * ts.w, c, wheels)); makeWheel(root, s * wx, r, -0.68, r, 0.27 * ts.w, c, wheels); }
    underglow(root, c, 1.0, 1.8, 0.3 + lift);
    extras(B, c, { korbY: 0.85, korbZ: 0.85, flagX: -0.45, flagY: 0.7, flagZ: -0.95, rackW: 0.95, rackY: 0.88, rackZ: [0.68, -0.72], spY: 1.02, spZ: -0.85 });
    plate(B, c, 0, 0.58, -0.99, Math.PI);
    const seat = { x: 0, y: 0.09 + lift, z: -0.22 };
    root.traverse((o) => { if (o.isMesh && o.castShadow !== false) o.castShadow = true; });
    return { root, wheels, steer, seat, seats: [seat, { x: 0, y: 0.14 + lift, z: -0.62 }], glassZ: 0, color: c.body };
  }
  L.buildCustomVehicle = function (type, cust) {
    const c = sanitize(type, cust);
    return isQuad(type) ? buildQuad(type, c) : buildScooter(type, c);
  };
  // neues Aussehen auf ein Fahrzeug anwenden (send = an Mitspieler schicken)
  // Lack, LEDs, Muster und Kennzeichen auf ein normales Fahrzeugmodell legen
  function applyOverlay(v, c) {
    const rig = v.rig, root = rig.root, ud = root.userData, t = v.t;
    if (!ud.origMats) {
      ud.origMats = new Map(); const col = new T.Color(t.body || rig.color || '#ffffff').getHex();
      root.traverse((o) => { if (o.isMesh && o.material && o.material.color && !o.material.transparent && o.material.color.getHex() === col) ud.origMats.set(o, o.material); });
    }
    for (const [m, mat] of ud.origMats) m.material = c.body === 'orig' ? mat : L.mat(c.body);
    if (ud.ovl) root.remove(ud.ovl);
    const g = new T.Group(); root.add(g); ud.ovl = g;
    const len = t.len || 4, wid = t.wid || 1.8, y = t.kind === 'bike' ? 0.8 : Math.max(0.6, (t.h || 1.4) * 0.42 + (t.lift || 0));
    underglow(g, c, wid, len, 0.25); ud.led = g.userData.led || null;
    if (c.decal !== 'none') for (const sd of [-1, 1]) decalPlane(g, c.decal, '#ffffff', len * (t.kind === 'bike' ? 0.5 : 0.6), t.kind === 'bike' ? 0.3 : 0.42, sd * (wid / 2 + (t.kind === 'bike' ? -0.2 : 0.03)), y, 0, sd * Math.PI / 2);
    plate(g, c, 0, Math.max(0.5, y - 0.15), -len / 2 - 0.04, Math.PI);
  }
  L.applyCustom = function (v, cust, send) {
    if (!v || !canCust(v)) return;
    if (!L.CUSTOM_TYPES[v.type]) { const c2 = sanitize(v.type, cust); applyOverlay(v, c2); v.cust = c2; if (send && L.mp && L.mp.send) L.mp.send({ t: 'vcust', id: v.id, c: c2 }); return; }
    const c = sanitize(v.type, cust);
    const old = v.rig.root, rig = L.buildVehicle(v.type, c);
    rig.root.position.copy(old.position); rig.root.rotation.copy(old.rotation);
    L.scene.remove(old); L.scene.add(rig.root); v.rig = rig; v.cust = c;
    if (send && L.mp && L.mp.send) L.mp.send({ t: 'vcust', id: v.id, c });
  };
  // beim Einsteigen: dein eigener Style kommt mit
  // Customs gehören nur zu dem einen Fahrzeug, das man in der Werkstatt angepasst hat (kein automatisches Übertragen)
  L.onEnterVehicle = function () {};
  if (!Array.isArray(L.save.garage)) L.save.garage = [];
  const GARAGE_MAX = 8;

  // =====================================================================
  // Die Werkstatt (Gebäude)
  // =====================================================================
  const WW = 34, WD = 26;
  function findSpot() {
    for (let rad = 80; rad < 900; rad += 20) {
      for (let k = 0; k < 24; k++) {
        const a = k / 24 * 6.283 + rad * 0.01, cx = Math.round(Math.cos(a) * rad), cz = Math.round(Math.sin(a) * rad);
        if (Math.abs(cx) > 1300 || Math.abs(cz) > 1300 || L.inTower(cx, cz, 50)) continue;
        let ok = true;
        for (let x = cx - WW / 2 - 2; x <= cx + WW / 2 + 2 && ok; x += 3) for (let z = cz - WD / 2 - 2; z <= cz + WD / 2 + 10 && ok; z += 3) {
          if (L.queryBoxes(x, z, 1.6).length || L.mountainH(x, z) > 0.05 || L.waterDepth(x, z) > -0.2) ok = false;
          else if (z < cz + WD / 2 && L.onRoad(x, z)) ok = false;
        }
        if (!ok) continue;
        let road = false; for (let x = cx - 10; x <= cx + 10 && !road; x += 5) for (let z = cz + WD / 2; z < cz + WD / 2 + 40 && !road; z += 4) if (L.onRoad(x, z)) road = true;
        if (road) return { x: cx, z: cz };
      }
    }
    return { x: 260, z: -420 };
  }
  let WS = { x: 1e9, z: 1e9, x1: 1e9, x2: 1e9, z1: 1e9, z2: 1e9 };
  L.inWorkshop = (x, z) => x > WS.x1 + 0.3 && x < WS.x2 - 0.3 && z > WS.z1 + 0.3 && z < WS.z2 + 1.5;
  L.bigThreat = () => !!((L.boss && !L.boss.dead) || L.wboss || L.frenzy);
  L.wsSafe = (x, z) => L.inWorkshop(x, z) && !L.bigThreat();
  L.wsKeepOut = function (e) {
    if (!L.wsSafe(e.x, e.z)) return;
    const dl = e.x - WS.x1, dr = WS.x2 - e.x, db = e.z - WS.z1, df = WS.z2 + 1.5 - e.z, m = Math.min(dl, dr, db, df);
    if (m === dl) e.x = WS.x1 - 1; else if (m === dr) e.x = WS.x2 + 1; else if (m === db) e.z = WS.z1 - 1; else e.z = WS.z2 + 2.5;
  };
  // erst nach dem Bau der Welt aufstellen (main.js baut die Welt)
  const origBuild = L.buildWorld;
  L.buildWorld = function (scene) { origBuild(scene); setupWorkshop(); };
  function setupWorkshop() {
  const spot = findSpot();
  WS = L.WORKSHOP = { x: spot.x, z: spot.z, w: WW, d: WD, x1: spot.x - WW / 2, x2: spot.x + WW / 2, z1: spot.z - WD / 2, z2: spot.z + WD / 2 };
  // Parkplätze der Weltgenerierung im Gebäude entfernen, eigene Fahrzeuge reinstellen
  for (let i = L.vehSpots.length - 1; i >= 0; i--) { const s = L.vehSpots[i]; if (s.x > WS.x1 - 3 && s.x < WS.x2 + 3 && s.z > WS.z1 - 3 && s.z < WS.z2 + 6) L.vehSpots.splice(i, 1); }
  L.vehSpots.push({ x: WS.x - 10, z: WS.z - 6, yaw: Math.PI, type: 'quad' }, { x: WS.x - 5, z: WS.z - 6, yaw: Math.PI, type: 'atv' },
    { x: WS.x + 6, z: WS.z - 7, yaw: Math.PI, type: 'joyort10' }, { x: WS.x + 8, z: WS.z - 7, yaw: Math.PI, type: 'joyort6e' });
  L.POIS.push({ id: 'werkstatt', name: 'Werkstatt', x: WS.x, z: WS.z, r: 17, icon: '🔧', sub: true });
  (function build() {
    const g = new T.Group(); L.scene.add(g);
    const H = 7.5, th = 0.4, door = 12, wall = '#5a5f66', dark = '#2a2d33';
    const B = (c, sx, sy, sz, x, y, z, o) => part(G().box, c, sx, sy, sz, x, y, z, g, o);
    // Boden, Wände, Dach
    B('#4a4d52', WW, 0.1, WD + 3, WS.x, 0.05, WS.z + 1.5);
    for (let k = 0; k < 8; k++) B('#e8c020', 0.15, 0.02, 4.5, WS.x1 + 3 + k * 4, 0.11, WS.z + 2, { noShadow: true });
    B(wall, WW, H, th, WS.x, H / 2, WS.z1); L.addBox(WS.x1, WS.z1 - th / 2, WS.x2, WS.z1 + th / 2, H, 'building');
    for (const s of [-1, 1]) { B(wall, th, H, WD, s > 0 ? WS.x2 : WS.x1, H / 2, WS.z); L.addBox((s > 0 ? WS.x2 : WS.x1) - th / 2, WS.z1, (s > 0 ? WS.x2 : WS.x1) + th / 2, WS.z2, H, 'building'); }
    const side = (WW - door) / 2;
    for (const s of [-1, 1]) { const cx = s < 0 ? WS.x1 + side / 2 : WS.x2 - side / 2; B(wall, side, H, th, cx, H / 2, WS.z2); L.addBox(cx - side / 2, WS.z2 - th / 2, cx + side / 2, WS.z2 + th / 2, H, 'building'); }
    B(wall, door, 1.6, th, WS.x, H - 0.8, WS.z2);
    // hochgezogenes Rolltor
    B('#8a8f96', door - 0.2, 0.5, 0.15, WS.x, H - 0.35, WS.z2 - 0.3);
    B(dark, WW + 0.8, 0.3, WD + 0.8, WS.x, H + 0.15, WS.z);
    for (let k = 0; k < 5; k++) B('#3a3d44', 0.3, 0.4, WD, WS.x1 + 4 + k * 6.5, H - 0.2, WS.z, { noShadow: true });
    // Streifen an der Fassade
    B('#e8c020', WW + 0.1, 0.25, 0.05, WS.x, 2.2, WS.z2 + 0.23, { noShadow: true });
    // Leuchtschild
    const sign = new T.Mesh(new T.PlaneGeometry(10, 1.6), new T.MeshBasicMaterial({ map: L.textTex('🔧 WERKSTATT', 640, 102, '#0c0f0c', '#39ff14', 'bold 70px Arial'), fog: false }));
    sign.position.set(WS.x, H + 1.1, WS.z2 + 0.25); g.add(sign);
    B('#111', 10.3, 1.9, 0.2, WS.x, H + 1.1, WS.z2 + 0.12);
    // LED-Leisten an der Decke
    const ledCols = ['#39ff14', '#00e5ff', '#ff4fd8'];
    for (let k = 0; k < 3; k++) B(ledCols[k], WW - 4, 0.06, 0.12, WS.x, H - 0.5, WS.z1 + 5 + k * 7, { basic: true, noShadow: true });
    // Custom-Platz in der Mitte
    const pad = new T.Mesh(new T.RingGeometry(3.4, 3.8, 40), new T.MeshBasicMaterial({ color: 0x39ff14, transparent: true, opacity: 0.8, fog: false })); pad.rotation.x = -Math.PI / 2; pad.position.set(WS.x, 0.12, WS.z + 1); g.add(pad); WS.pad = pad;
    const txt = new T.Mesh(new T.PlaneGeometry(4, 0.7), new T.MeshBasicMaterial({ map: L.textTex('CUSTOM', 512, 90, '#000000', '#39ff14', 'bold 70px Arial'), transparent: true, opacity: 0.9, fog: false })); txt.rotation.x = -Math.PI / 2; txt.position.set(WS.x, 0.13, WS.z + 5.4); g.add(txt);
    // Hebebühnen
    for (const s of [-1, 1]) {
      const lx = WS.x + s * 11, lz = WS.z + 2;
      for (const t of [-1, 1]) { B('#c8a020', 0.35, 2.6, 0.35, lx + t * 1.6, 1.3, lz - 2.2); }
      B('#c8a020', 3.6, 0.15, 0.6, lx, 1.4, lz - 2.2); B('#888', 0.25, 0.08, 4, lx - 1.2, 0.15, lz); B('#888', 0.25, 0.08, 4, lx + 1.2, 0.15, lz);
    }
    // Werkzeugwand, Werkbank, Reifenstapel, Fässer, Regale
    B('#7a5a3a', 8, 2.4, 0.12, WS.x - 6, 2.2, WS.z1 + 0.3);
    for (let k = 0; k < 18; k++) { const tx = WS.x - 9.5 + (k % 9) * 0.9, ty = 1.5 + Math.floor(k / 9) * 0.9; B(['#c02a2a', '#2a6ac0', '#888', '#e8c020'][k % 4], 0.12, 0.5, 0.06, tx, ty, WS.z1 + 0.42); }
    B('#5a4030', 7, 0.12, 1.1, WS.x - 6, 1.0, WS.z1 + 0.9); for (const s of [-1, 1]) B('#3a3a3a', 0.12, 1, 1, WS.x - 6 + s * 3.3, 0.5, WS.z1 + 0.9);
    L.addBox(WS.x - 9.6, WS.z1 + 0.2, WS.x - 2.4, WS.z1 + 1.5, 1.1, 'prop');
    for (let k = 0; k < 4; k++) for (let j = 0; j < 3 + (k % 2); j++) { const tr = part(G().cyl, '#151515', 0.42, 0.28, 0.42, WS.x2 - 2 - k * 1.0, 0.15 + j * 0.29, WS.z1 + 1.6 + (k % 2) * 0.9, g); tr.castShadow = true; }
    L.addBox(WS.x2 - 6, WS.z1 + 1, WS.x2 - 1.5, WS.z1 + 2.6, 1.2, 'prop');
    for (let k = 0; k < 3; k++) { part(G().cyl, ['#2a6ac0', '#c02a2a', '#3a8a3a'][k], 0.35, 1.0, 0.35, WS.x1 + 1.2, 0.5, WS.z + 6 + k * 0.85, g); }
    L.addBox(WS.x1 + 0.6, WS.z + 5.4, WS.x1 + 1.8, WS.z + 8, 1.0, 'prop');
    for (let k = 0; k < 3; k++) { B('#6a6f76', 0.6, 0.05, 3.5, WS.x2 - 0.6, 0.6 + k * 0.8, WS.z + 6); for (let j = 0; j < 4; j++) B(['#e07020', '#e8e8e8', '#2a2a2a', '#39ff14'][(j + k) % 4], 0.4, 0.35, 0.5, WS.x2 - 0.6, 0.82 + k * 0.8, WS.z + 4.6 + j * 0.85); }
    L.addBox(WS.x2 - 1, WS.z + 4.2, WS.x2 - 0.2, WS.z + 7.8, 2.4, 'prop');
    // Lampe
    const lamp = new T.PointLight(0xfff4e0, 0.9, 30); lamp.position.set(WS.x, H - 1, WS.z); g.add(lamp);
  })();
  }

  // =====================================================================
  // Werkstatt-Menü
  // =====================================================================
  let panel = null, target = null, tab = 'body';
  function customTarget() {
    if (!L.inWorkshop(P.x, P.z)) return null;
    if (P.vehicle) return canCust(P.vehicle) && !(P.seat > 0) ? P.vehicle : null;
    let best = null, bd = 5.5;
    for (const v of L.ents.vehicles) { if (!canCust(v) || v.occupied) continue; const d = L.dist(v.x, v.z, P.x, P.z); if (d < bd) { bd = d; best = v; } }
    return best;
  }
  L.wsHint = function () { const v = customTarget(); return v ? 'K: 🔧 ' + v.t.name + ' anpassen' : (L.inWorkshop(P.x, P.z) && !P.vehicle ? 'K: 🅿️ Werkstatt & Garage' : null); };
  function buy(cat, val) {
    const v = target; if (!v) return;
    const type = v.type, c = sanitize(type, v.cust);
    if (!owned(cat, val, type)) {
      const pr = priceOf(cat, val);
      if (L.save.coins < pr) { flash('❌ Zu wenig Münzen – du brauchst ' + pr + ' 🪙 (du hast ' + L.save.coins + ')'); return; }
      L.save.coins -= pr; L.save.owned.push(ownKey(cat, val)); if (L.snd.codeOk) L.snd.codeOk();
      flash('✅ Gekauft für ' + pr + ' 🪙');
    }
    c[cat[0]] = val; L.persist();
    L.applyCustom(v, c, true); render();
  }
  let flashT = null;
  function flash(t) { const f = panel && panel.querySelector('#wsFlash'); if (f) { f.textContent = t; clearTimeout(flashT); flashT = setTimeout(() => { f.textContent = ''; }, 2600); } }
  let garageMode = false;
  function garageHtml(v) {
    let h = '<h3 style="margin:12px 0 4px">🅿️ Deine Garage <small>(' + L.save.garage.length + '/' + GARAGE_MAX + ')</small></h3>';
    if (v) h += '<button class="btn" id="wsSave" style="margin-bottom:6px">💾 Diesen ' + v.t.name + ' in der Garage speichern</button>';
    if (!L.save.garage.length) h += '<p class="small">Noch keine Fahrzeuge gespeichert. Pass ein Fahrzeug an und speichere es – dann kannst du es in jeder Runde hier ausparken.</p>';
    const outNow = (L.round && L.round.garageOut) || {};
    L.save.garage.forEach((g, i) => { const t = L.VTYPES[g.type]; if (!t) return; h += '<div class="row" style="justify-content:space-between;border-top:1px solid #333;padding-top:4px"><span>' + (t.kind === 'bike' ? '🏍️' : '🚗') + ' <b>' + t.name + '</b> <small>' + (g.cust && g.cust.body && g.cust.body !== 'orig' ? '🎨' : '') + (g.cust && g.cust.led && g.cust.led !== 'none' ? '💡' : '') + (g.cust && g.cust.decal && g.cust.decal !== 'none' ? '🖌️' : '') + (g.cust && g.cust.plate ? ' ' + g.cust.plate : '') + '</small></span><span>' + (outNow[i] ? '<small>schon ausgeparkt</small>' : '<button class="btn" data-out="' + i + '">Ausparken</button>') + ' <button class="btn" data-del="' + i + '">🗑️</button></span></div>'; });
    return h;
  }
  function bindGarage() {
    const sv = panel.querySelector('#wsSave');
    if (sv) sv.onclick = () => {
      const v = target; if (!v) return;
      if (L.save.garage.length >= GARAGE_MAX) { flash('❌ Garage voll (' + GARAGE_MAX + ') – lösche erst ein Fahrzeug.'); return; }
      L.save.garage.push({ type: v.type, cust: sanitize(v.type, v.cust) }); L.persist(); flash('💾 ' + v.t.name + ' gespeichert!'); render();
    };
    panel.querySelectorAll('[data-del]').forEach((b) => { b.onclick = () => { L.save.garage.splice(+b.dataset.del, 1); L.persist(); render(); }; });
    panel.querySelectorAll('[data-out]').forEach((b) => { b.onclick = () => takeOut(+b.dataset.out); });
  }
  // Fahrzeug aus der Garage holen: steht auf dem Custom-Platz
  function takeOut(i) {
    const g = L.save.garage[i]; if (!g || !L.VTYPES[g.type]) return;
    const R = L.round; R.garageOut = R.garageOut || {}; if (R.garageOut[i]) return;
    for (const o of L.ents.vehicles) if (!o.occupied && Math.hypot(o.x - WS.x, o.z - (WS.z + 1)) < 4) { o.x += 6; o.rig.root.position.x = o.x; }
    L._g.spawnVehicle({ type: g.type, x: WS.x, z: WS.z + 1, yaw: Math.PI, cust: g.cust });
    const v = L.ents.vehicles[L.ents.vehicles.length - 1];
    L.applyCustom(v, g.cust, true);
    R.garageOut[i] = true; flash('🚗 ' + v.t.name + ' steht auf dem Custom-Platz!'); render();
  }
  function render() {
    if (!panel) return;
    const v = target;
    if (!v) {
      panel.innerHTML = '<h2>🔧 Werkstatt – Garage</h2><div>Deine Münzen: <span class="coins">🪙 ' + L.save.coins + '</span></div><div id="wsFlash" style="color:#7dff7d;min-height:18px;margin-top:4px"></div>' + garageHtml(null) + '<p class="small">Tipp: Fahr mit einem Fahrzeug in die Werkstatt oder stell dich daneben, um es anzupassen.</p><button class="btn primary close" id="wsClose">Fertig</button>';
      panel.querySelector('#wsClose').onclick = closePanel; bindGarage(); return;
    }
    const type = v.type, c = sanitize(type, v.cust);
    const full = !!L.CUSTOM_TYPES[type];
    const cats = CATS.filter((k) => (full ? (!k[3] || (k[3] === 'quad' && isQuad(type))) : OVER_CATS.includes(k[0])));
    if (!cats.some((k) => k[0] === tab)) tab = 'body';
    const cat = cats.find((k) => k[0] === tab);
    let h = `<h2>🔧 Werkstatt – ${v.t.name}</h2><div>Deine Münzen: <span class="coins">🪙 ${L.save.coins}</span> <small>(10 pro überlebter Minute – nur wer entkommt, behält sie)</small></div><div id="wsFlash" style="color:#7dff7d;min-height:18px;margin-top:4px"></div>`;
    h += '<div class="tabs">' + cats.map((k) => `<button data-tab="${k[0]}" class="${k[0] === tab ? 'on' : ''}">${k[1]}</button>`).join('') + '</div><div class="grid">';
    const opts = !full && cat[0] === 'body' ? [['orig', '🚗 Original', 0]].concat(optsOf(cat)) : optsOf(cat);
    for (const o of opts) {
      const eq = c[cat[0]] === o[0], own = owned(cat, o[0], type), afford = own || L.save.coins >= o[2];
      const sw = cat[2] === 'color' || cat[0] === 'led' ? (o[0] === 'none' ? '<span class="sw" style="background:repeating-linear-gradient(45deg,#333 0 4px,#555 4px 8px)"></span>' : `<span class="sw" style="background:${o[0]}"></span>`) : '';
      h += `<button class="opt ${eq ? 'eq' : ''} ${afford ? '' : 'no'}" data-v="${o[0]}">${sw}${o[1]}<span class="pr ${own ? 'ok' : ''}">${eq ? '✔ drauf' : own ? 'gekauft' : o[2] + ' 🪙'}</span></button>`;
    }
    h += '</div>';
    h += `<div class="row">🪪 Kennzeichen: <input id="wsPlate" maxlength="9" value="${c.plate}"> <button class="btn" id="wsPlateB">Ändern (40 🪙)</button></div>`;
    const others = L.remotes ? [...L.remotes.values()] : [];
    if (others.length) h += '<div class="row">🎁 Münzen schenken: ' + others.map((r) => `<button class="btn" data-gift="${r.pid}">${String(r.name).replace(/[<>&"]/g, '')}</button>`).join('') + '</div>';
    h += garageHtml(v);
    h += '<button class="btn primary close" id="wsClose">Fertig</button>';
    panel.innerHTML = h; bindGarage();
    panel.querySelectorAll('[data-tab]').forEach((b) => { b.onclick = () => { tab = b.dataset.tab; render(); }; });
    panel.querySelectorAll('[data-v]').forEach((b) => { b.onclick = () => buy(cat, b.dataset.v); });
    panel.querySelector('#wsClose').onclick = closePanel;
    panel.querySelector('#wsPlateB').onclick = () => {
      const val = panel.querySelector('#wsPlate').value;
      if (L.save.coins < 40) { flash('❌ Zu wenig Münzen'); return; }
      const c2 = sanitize(type, target.cust); c2.plate = val; const s2 = sanitize(type, c2); if (s2.plate === c.plate) return;
      L.save.coins -= 40; L.persist(); L.applyCustom(target, s2, true); render(); flash('✅ Neues Kennzeichen: ' + (s2.plate || '(keins)'));
    };
    panel.querySelectorAll('[data-gift]').forEach((b) => { b.onclick = () => { const n = prompt('Wie viele Münzen schenken? (du hast ' + L.save.coins + ')', '50'); if (n !== null && L.giftCoins(+b.dataset.gift, n)) render(); }; });
  }
  function openPanel(v) {
    target = v; garageMode = !v;
    if (!panel) { panel = document.createElement('div'); panel.id = 'wsPanel'; document.body.appendChild(panel); }
    panel.hidden = false; L.uiBlock = true; if (L.unlock) L.unlock();
    render();
  }
  function closePanel() { if (panel) panel.hidden = true; target = null; garageMode = false; L.uiBlock = false; if (L.state === 'game' && L.lock) L.lock(); }
  L.wsOpen = () => !!(panel && !panel.hidden);
  // Knopf zum Antippen (Handy) bzw. Klicken
  const wsBtn = document.createElement('button'); wsBtn.id = 'wsBtn'; wsBtn.hidden = true; wsBtn.textContent = '🔧 Customizen (K)';
  wsBtn.style.cssText = 'position:fixed;left:50%;bottom:150px;transform:translateX(-50%);z-index:20;padding:10px 18px;font-size:17px;font-weight:800;border-radius:10px;border:2px solid #39ff14;background:rgba(0,0,0,.75);color:#39ff14;cursor:pointer';
  document.body.appendChild(wsBtn);
  wsBtn.onclick = () => { if (!L.inWorkshop(P.x, P.z)) return; openPanel(customTarget()); };

  // =====================================================================
  // jedes Bild
  // =====================================================================
  let wasIn = false, wasThreat = false;
  L.updateWorkshop = function (dt) {
    updateCoins(dt);
    if (L.state !== 'game') { if (L.wsOpen()) closePanel(); return; }
    const inside = L.inWorkshop(P.x, P.z), threat = L.bigThreat();
    if (inside && (!wasIn || threat !== wasThreat)) L.msg(threat ? '⚠️ Große Monster sind da – die Werkstatt schützt dich jetzt NICHT! Nur der Turm ist sicher.' : '🔧 Werkstatt – hier bist du sicher. K: Fahrzeug customizen', 4500);
    wasIn = inside; wasThreat = threat;
    if (WS.pad) WS.pad.material.color.setHex(threat ? 0xff3030 : 0x39ff14);
    const tgt = L.wsOpen() ? null : customTarget(), inWs = inside && !P.vehicle || !!tgt;
    wsBtn.hidden = L.wsOpen() || !inWs || L.uiBlock; wsBtn.textContent = tgt ? '🔧 ' + tgt.t.name + ' anpassen (K)' : '🅿️ Werkstatt & Garage (K)';
    if (!L.uiBlock && !L.chatOpen && L.hit('KeyK') && inWs) openPanel(tgt);
    if (L.wsOpen()) { if ((!target && !garageMode) || !L.inWorkshop(P.x, P.z) || !P.alive) closePanel(); else if (target) { P.camYaw += dt * 0.35; P.freeLookT = 1; } }
    // LEDs, Blüten, Turbo-Flammen, Fahnen
    const tt = performance.now() / 1000;
    for (const v of L.ents.vehicles) {
      const u = v.rig.root.userData; if (!u.led && !u.flame && !u.flag) continue;
      if (Math.abs(v.x - P.x) > 150 || Math.abs(v.z - P.z) > 150) continue;
      const led = u.led;
      if (led) {
        let op = 0.55, col = led.color;
        if (led.fx === 'puls') op = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(tt * 4));
        else if (led.fx === 'blink') op = Math.sin(tt * 9) > 0 ? 0.65 : 0.05;
        else if (led.fx === 'regenbogen') { col = new T.Color().setHSL((tt * 0.25 + v.id * 0.13) % 1, 1, 0.55); }
        else if (led.fx === 'bluete') { col = new T.Color().setHSL(0.92 + Math.sin(tt * 1.5) * 0.03, 1, 0.78); op = 0.45 + Math.sin(tt * 2) * 0.15; }
        else if (led.fx === 'schwarzweiss') { const w = Math.sin(tt * 6) > 0; col = new T.Color(w ? 0xffffff : 0x222222); op = w ? 0.7 : 0.35; }
        else if (led.fx === 'galaxie') { col = new T.Color().setHSL(0.7 + Math.sin(tt * 0.8) * 0.12, 1, 0.55); op = 0.55; }
        else if (led.fx === 'feuer') { col = new T.Color().setHSL(0.04 + Math.random() * 0.06, 1, 0.5); op = 0.45 + Math.random() * 0.3; }
        else if (led.fx === 'eis') { col = new T.Color().setHSL(0.55, 0.9, 0.75 + Math.sin(tt * 3) * 0.1); op = 0.5; }
        else if (led.fx === 'disco') { col = new T.Color().setHSL(Math.floor(tt * 4) % 6 / 6, 1, 0.55); op = 0.7; }
        const trail = { schwarzweiss: [Math.random() < 0.5 ? '#ffffff' : '#111111', 0.14], galaxie: [Math.random() < 0.7 ? '#ffffff' : '#c080ff', 0.1], feuer: [Math.random() < 0.5 ? '#ff6a10' : '#ffd040', 0.16], eis: ['#e8f8ff', 0.12], disco: ['#' + new T.Color().setHSL(Math.random(), 1, 0.6).getHexString(), 0.12] }[led.fx];
        if (trail && Math.abs(v.speed) > 1.5 && Math.random() < dt * 16) L.fx(trail[0], v.x - Math.sin(v.yaw) * 0.8, 0.5 + (v.alt || 0) + Math.random() * 0.4, v.z - Math.cos(v.yaw) * 0.8, 2, 1.2, { basic: true, size: trail[1], life: 1.2 });
        led.mat.color.copy(col); led.smat.color.copy(col); led.mat.opacity = op;
        if (led.fx === 'bluete' && Math.abs(v.speed) > 1.5 && Math.random() < dt * 14) L.fx(Math.random() < 0.6 ? '#ffb7d5' : '#ff8fc0', v.x - Math.sin(v.yaw) * 0.8, 0.6 + (v.alt || 0), v.z - Math.cos(v.yaw) * 0.8, 2, 1.2, { size: 0.12, life: 1.6 });
      }
      if (u.flame) u.flame.visible = v === P.vehicle && L.keys.KeyW && !L.uiBlock && Math.random() < 0.6;
      if (u.flag) u.flag.rotation.y = Math.sin(tt * 5 + v.id) * 0.25 - Math.min(0.6, Math.abs(v.speed) / 30);
    }
  };
  L.clearWorkshop = function () { if (L.wsOpen()) closePanel(); };
})();
