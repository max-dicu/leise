'use strict';
// Feiertage nach deutscher Uhrzeit (Europe/Berlin) – jedes Jahr automatisch, nur auf der Hauptkarte:
//  • Silvester (31.12.): ab und zu Feuerwerk · 1.1. 0–1 Uhr: großes Feuerwerk, es bleibt Nacht, „Frohes neues Jahr“
//  • Ostern (Karfreitag bis Ostermontag): 15 große versteckte Ostereier, jedes einmal pro Jahr +1000 Münzen
//  • Weihnachten (24.–26.12.): Bibelverse (Luther 1912) erscheinen ruhig am Himmel
//  • 21. April: Geburtstag – Luftballons, Torte, Konfetti, Glückwünsche am Himmel
(function () {
  const L = window.L, T = THREE, P = L.player;
  // ---------- deutsche Zeit ----------
  let fmt = null; try { fmt = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', hour12: false }); } catch (e) { fmt = null; }
  function now() {
    if (L._festNow) return L._festNow;
    const d = new Date();
    if (fmt) { const o = {}; for (const p of fmt.formatToParts(d)) o[p.type] = +p.value; return { y: o.year, m: o.month, d: o.day, h: o.hour % 24 }; }
    return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate(), h: d.getHours() };
  }
  function easter(y) {
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    return { m: Math.floor((h + l - 7 * m + 114) / 31), d: ((h + l - 7 * m + 114) % 31) + 1 };
  }
  function fest(t) {
    const out = {};
    if (t.m === 12 && t.d === 31) out.silvester = true;
    if (t.m === 1 && t.d === 1 && t.h === 0) out.neujahr = true;
    if (t.m === 12 && t.d >= 24 && t.d <= 26) out.weihnachten = true;
    if (t.m === 4 && t.d === 21) out.geburtstag = true;
    const E = easter(t.y), day = Date.UTC(t.y, t.m - 1, t.d), es = Date.UTC(t.y, E.m - 1, E.d), diff = Math.round((day - es) / 864e5);
    if (diff >= -2 && diff <= 1) out.ostern = true;
    return out;
  }
  L.festToday = () => fest(now());
  const onHome = () => !L.curIsland && !L.inDim(P.x) && !(L.inMoon && L.inMoon(P.x));
  const R = L.rand;
  // vor dir am Himmel (für jeden Spieler selbst)
  function skySpot(dist, h) { const a = P.camYaw + R(-0.5, 0.5); return { x: P.x + Math.sin(a) * dist, z: P.z + Math.cos(a) * dist, y: (P.y || 0) + h }; }
  function fwNear(kinds, spread) {
    const a = P.camYaw + R(-0.9, 0.9), d = R(30, spread || 90), x = P.x + Math.sin(a) * d, z = P.z + Math.cos(a) * d;
    L.fwLaunch && L.fwLaunch(kinds[Math.floor(Math.random() * kinds.length)], x, z, 0, (Math.random() * 1e6) | 0, '', R(-0.2, 0.2), R(-0.2, 0.2));
  }

  // ---------- Weihnachten: Bibelverse (Lutherbibel 1912, gemeinfrei) ----------
  const VERSE = [
    ['Fürchtet euch nicht! Siehe, ich verkündige euch\ngroße Freude, die allem Volk widerfahren wird;', 'Lukas 2,10'],
    ['denn euch ist heute der Heiland geboren,\nwelcher ist Christus, der Herr,\nin der Stadt Davids.', 'Lukas 2,11'],
    ['Ehre sei Gott in der Höhe und Friede auf Erden\nund den Menschen ein Wohlgefallen.', 'Lukas 2,14'],
    ['Und ihr habt zum Zeichen: ihr werdet finden das Kind\nin Windeln gewickelt und in einer Krippe liegen.', 'Lukas 2,12'],
    ['Denn uns ist ein Kind geboren,\nein Sohn ist uns gegeben.', 'Jesaja 9,5'],
    ['Das Volk, das im Finstern wandelt,\nsieht ein großes Licht.', 'Jesaja 9,1'],
    ['Also hat Gott die Welt geliebt,\ndass er seinen eingeborenen Sohn gab.', 'Johannes 3,16'],
    ['Und das Wort ward Fleisch\nund wohnte unter uns.', 'Johannes 1,14'],
    ['Ich bin das Licht der Welt.', 'Johannes 8,12'],
    ['Da sie den Stern sahen,\nwurden sie hoch erfreut.', 'Matthäus 2,10'],
    ['Maria aber behielt alle diese Worte\nund bewegte sie in ihrem Herzen.', 'Lukas 2,19']
  ];
  let verseT = 6, verseIdx = Math.floor(Math.random() * VERSE.length);
  function showVerse() {
    const [txt, ref] = VERSE[verseIdx % VERSE.length]; verseIdx++;
    const s = skySpot(125, 62);
    L.fwSkyText && L.fwSkyText(s.x, s.y, s.z, txt + '\n– ' + ref + ' –', { max: 220, width: 150, gentle: true, gold: true, life: 18 });
  }

  // ---------- Ostern: 15 große versteckte Eier ----------
  const EGG_N = 15;
  let eggs = null, eggYear = 0;
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const freeAt = (x, z) => !L.queryBoxes(x, z, 0.9).length && L.waterDepth(x, z) < -0.2 && Math.abs(x) < 1440 && Math.abs(z) < 1440 && !L.inTower(x, z, 2);
  function eggSpots(y) {
    const r = rng(y * 7919 + 11), out = [];
    const B = (L.buildings || []).filter((b) => !b.ship && b.w < 60);
    // hinter Häusern (an einer Ecke)
    for (let k = 0; k < 400 && out.length < 7; k++) {
      const b = B[Math.floor(r() * B.length)]; if (!b) break;
      const sx = r() < 0.5 ? -1 : 1, sz = r() < 0.5 ? -1 : 1, x = b.x + sx * (b.w / 2 + 0.9), z = b.z + sz * (b.d / 2 + 0.9);
      if (freeAt(x, z)) out.push({ x, z, y: 0 });
    }
    // unter Laubbäumen
    const lm = L.instLeafy, mt = new T.Matrix4(), p = new T.Vector3();
    for (let k = 0; k < 400 && out.length < 11 && lm; k++) {
      lm.getMatrixAt(Math.floor(r() * lm.count), mt); p.setFromMatrixPosition(mt);
      const x = p.x + 0.9, z = p.z + 0.4; if (freeAt(x, z)) out.push({ x, z, y: 0 });
    }
    // an Berghängen
    for (let k = 0; k < 60 && out.length < 13 && L.mountains && L.mountains.length; k++) {
      const m = L.mountains[Math.floor(r() * L.mountains.length)], a = r() * 6.283, d = m.r * (0.45 + r() * 0.3), x = m.x + Math.sin(a) * d, z = m.z + Math.cos(a) * d;
      if (Math.abs(x) < 1440 && Math.abs(z) < 1440) out.push({ x, z, y: L.mountainH(x, z) });
    }
    // irgendwo im Gelände
    for (let k = 0; k < 2000 && out.length < EGG_N; k++) { const x = (r() * 2 - 1) * 1400, z = (r() * 2 - 1) * 1400; if (freeAt(x, z) && L.mountainH(x, z) === 0) out.push({ x, z, y: 0 }); }
    return out.slice(0, EGG_N);
  }
  const PASTEL = ['#ff9ac0', '#9ad8ff', '#b8f09a', '#ffe08a', '#d0a8ff', '#ffb88a'];
  function eggMesh(i) {
    const g = new T.Group(), c1 = PASTEL[i % PASTEL.length], c2 = PASTEL[(i + 3) % PASTEL.length];
    const e = new T.Mesh(L.GEO.sph, L.mat(c1)); e.scale.set(0.55, 0.75, 0.55); e.position.y = 0.6; e.castShadow = true; g.add(e);
    for (const yy of [0.45, 0.75]) { const band = new T.Mesh(new T.TorusGeometry(0.52 - Math.abs(yy - 0.6) * 0.5, 0.05, 6, 20), L.mat(c2)); band.rotation.x = Math.PI / 2; band.position.y = yy; g.add(band); }
    for (let k = 0; k < 6; k++) { const a = k / 6 * 6.283, d = new T.Mesh(L.GEO.sph, L.mat('#ffffff')); d.scale.setScalar(0.06); d.position.set(Math.sin(a) * 0.54, 0.6, Math.cos(a) * 0.54); g.add(d); }
    // Lichtsäule nur für den Admin
    const beam = new T.Mesh(new T.CylinderGeometry(0.25, 0.25, 80, 8, 1, true), new T.MeshBasicMaterial({ color: new T.Color(c1), transparent: true, opacity: 0.45, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, fog: false }));
    beam.position.y = 40; beam.visible = false; g.add(beam); g.userData.beam = beam;
    return g;
  }
  const found = () => { L.save.eggs = L.save.eggs || {}; return (L.save.eggs[eggYear] = L.save.eggs[eggYear] || []); };
  function buildEggs(y) {
    clearEggs(); eggYear = y;
    eggs = eggSpots(y).map((s, i) => { const m = eggMesh(i); m.position.set(s.x, s.y - 0.12, s.z); m.rotation.set(R(-0.3, 0.3), R(0, 6.28), R(-0.3, 0.3)); L.scene.add(m); return Object.assign({ id: i, m }, s); });
    const f = found(); for (const e of eggs) if (f.includes(e.id)) e.m.visible = false;
  }
  function clearEggs() { if (eggs) for (const e of eggs) L.scene.remove(e.m); eggs = null; }
  function nearEgg() { if (!eggs || P.vehicle) return null; const f = found(); for (const e of eggs) if (!f.includes(e.id) && Math.hypot(P.x - e.x, P.z - e.z) < 2.3 && Math.abs((P.y || 0) - e.y) < 2.5) return e; return null; }
  const och = L.crateHint, oci = L.crateInteract;
  L.crateHint = () => { const e = nearEgg(); if (e) return 'E: 🥚 Osterei aufheben (+1000 🪙)'; return och ? och() : null; };
  L.crateInteract = function () {
    const e = nearEgg(); if (!e) return oci ? oci() : false;
    const f = found(); f.push(e.id); e.m.visible = false;
    if (!L._festNow) { L.save.coins = (L.save.coins || 0) + 1000; }
    L.persist();
    L.banner('🥚 OSTEREI GEFUNDEN!', '+1000 Münzen · ' + f.length + ' von ' + EGG_N + ' Eiern in diesem Jahr');
    L.snd.codeOk ? L.snd.codeOk() : (L.snd.pickup && L.snd.pickup());
    for (const c of PASTEL) L.fx(c, e.x, e.y + 1, e.z, 10, 5, { basic: true, size: 0.15, life: 1 });
    return true;
  };
  // Karte: Eier nur für den Admin
  L.mapExtra = function (g, toM, big) {
    if (!eggs || !(L.suitOn && L.suitOn())) return;
    const f = found(); g.font = (big ? 18 : 14) + 'px sans-serif';
    for (const e of eggs) { if (f.includes(e.id)) continue; if (!big && (Math.abs(e.x - P.x) > 200 || Math.abs(e.z - P.z) > 200)) continue; const [x, y] = toM(e.x, e.z); g.fillText('🥚', x - 7, y + 6); }
  };

  // ---------- Geburtstag (21.4.) ----------
  let party = null;
  function buildParty() {
    const g = new T.Group(); L.scene.add(g);
    const N = 260, balls = new T.InstancedMesh(new T.SphereGeometry(1, 10, 8), new T.MeshLambertMaterial(), N), strs = new T.InstancedMesh(new T.BoxGeometry(1, 1, 1), new T.MeshLambertMaterial({ color: 0xeeeeee }), N);
    const o = new T.Object3D(), c = new T.Color(), COLS = ['#ff3a5a', '#3aa0ff', '#ffd040', '#3aff8a', '#c060ff', '#ff8a20', '#ff6ad0'];
    for (let i = 0, n = 0; i < 3000 && n < N; i++) {
      const x = R(-1350, 1350), z = R(-1350, 1350); if (L.queryBoxes(x, z, 1.5).length || L.mountainH(x, z) > 0 || L.waterDepth(x, z) > -0.2) continue;
      const h = R(3, 9);
      o.position.set(x, h, z); o.rotation.set(0, 0, 0); o.scale.set(0.55, 0.7, 0.55); o.updateMatrix(); balls.setMatrixAt(n, o.matrix); balls.setColorAt(n, c.set(COLS[n % COLS.length]));
      o.position.set(x, h / 2 - 0.3, z); o.scale.set(0.02, h - 0.6, 0.02); o.updateMatrix(); strs.setMatrixAt(n, o.matrix); n++;
      balls.count = strs.count = n;
    }
    balls.instanceMatrix.needsUpdate = true; if (balls.instanceColor) balls.instanceColor.needsUpdate = true; strs.instanceMatrix.needsUpdate = true;
    balls.frustumCulled = strs.frustumCulled = false; g.add(balls); g.add(strs);
    // Riesentorte neben dem Turm
    const T0 = L.TOWER; let cx = T0.x, cz = T0.z + 34; for (let k = 0; k < 30 && L.queryBoxes(cx, cz, 8).length; k++) { cx += 6; }
    const cake = new T.Group(); cake.position.set(cx, 0, cz); g.add(cake);
    const tiers = [[7, 3, '#f8e0c8'], [5.2, 2.6, '#ffb8d0'], [3.4, 2.2, '#fff4e8']]; let yy = 0;
    for (const [r, h, col] of tiers) { const m = new T.Mesh(new T.CylinderGeometry(r, r, h, 28), L.mat(col)); m.position.y = yy + h / 2; m.castShadow = true; cake.add(m); const icing = new T.Mesh(new T.TorusGeometry(r, 0.25, 6, 28), L.mat('#ff5a8a')); icing.rotation.x = Math.PI / 2; icing.position.y = yy + h; cake.add(icing); yy += h; }
    const flames = [];
    for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283, cnd = new T.Mesh(L.GEO.cyl, L.mat(COLS[k % COLS.length])); cnd.scale.set(0.15, 1.2, 0.15); cnd.position.set(Math.sin(a) * 2.2, yy + 0.6, Math.cos(a) * 2.2); cake.add(cnd); const fl = new T.Mesh(L.GEO.sph, new T.MeshBasicMaterial({ color: 0xffb020 })); fl.scale.set(0.16, 0.3, 0.16); fl.position.set(cnd.position.x, yy + 1.45, cnd.position.z); cake.add(fl); flames.push(fl); }
    const sign = new T.Sprite(new T.SpriteMaterial({ map: L.textTex('🎂 ALLES GUTE ZUM GEBURTSTAG! 🎉', 1024, 120, '#c02a6a', '#ffffff', 'bold 58px Arial'), depthTest: true }));
    sign.scale.set(18, 2.1, 1); sign.position.y = yy + 5; cake.add(sign);
    return { g, balls, strs, flames, t: 0 };
  }

  // ---------- Ablauf ----------
  let state = {}, checkT = 0, fwT = 3, birthT = 4, told = {}, lastRound = null;
  L.updateEvents = function (dt) {
    if (L.state !== 'game') return;
    checkT -= dt;
    if (checkT <= 0) {
      checkT = 5; const t = now(); state = fest(t);
      // Ostereier: jedes Jahr neue Verstecke
      if (state.ostern && (!eggs || eggYear !== t.y) && L.buildings && L.instLeafy) buildEggs(t.y);
      if (!state.ostern && eggs) clearEggs();
      if (state.geburtstag && !party && L.TOWER) party = buildParty();
      if (!state.geburtstag && party) { L.scene.remove(party.g); party = null; }
      state.year = t.y;
    }
    if (L.round !== lastRound) { lastRound = L.round; told = {}; }
    const home = onHome();
    // Ansagen (einmal pro Runde)
    const say = (k, a, b) => { if (!told[k]) { told[k] = true; L.banner(a, b); } };
    if (state.neujahr && home) say('nj', '🎆 FROHES NEUES JAHR ' + state.year + '!', 'Großes Feuerwerk bis 1 Uhr – schau in den Himmel!');
    else if (state.silvester && home) say('sv', '🎇 SILVESTER!', 'Heute gibt es Feuerwerk – um Mitternacht das große Feuerwerk!');
    if (state.weihnachten && home) say('wn', '🎄 FROHE WEIHNACHTEN!', 'Schau in den Himmel – dort stehen Verse aus der Weihnachtsgeschichte.');
    if (state.ostern && home) say('os', '🐣 FROHE OSTERN!', EGG_N + ' große Ostereier sind versteckt – jedes bringt 1000 Münzen! (' + found().length + ' gefunden)');
    if (state.geburtstag && home) say('gb', '🎂 ALLES GUTE ZUM GEBURTSTAG!', 'Heute ist der 21. April – die ganze Stadt feiert!');
    if (!home) return;
    // Neujahr 0–1 Uhr: Nacht + großes Feuerwerk
    if (state.neujahr) {
      L.env.time = 0.5;
      fwT -= dt;
      if (fwT <= 0) {
        fwT = R(0.35, 0.9); fwNear(['kugel', 'gold', 'herz', 'ring', 'kugel', 'gold'], 140);
        if (Math.random() < 0.06 && L.fwBattery) { const a = P.camYaw + R(-0.6, 0.6); L.fwBattery(P.x + Math.sin(a) * 60, P.z + Math.cos(a) * 60, 0, (Math.random() * 1e6) | 0); }
        if (Math.random() < 0.035 && L.fwSkyText) { const s = skySpot(120, 75); L.fwSkyText(s.x, s.y, s.z, 'Frohes neues Jahr ' + state.year + '!', { max: 60, width: 80, life: 9 }); }
      }
    } else if (state.silvester) {
      fwT -= dt;
      if (fwT <= 0) { fwT = L.env.day < 0.4 ? R(4, 9) : R(12, 25); fwNear(['kugel', 'gold', 'ring'], 160); }
    }
    // Weihnachten: Bibelverse
    if (state.weihnachten) { verseT -= dt; if (verseT <= 0) { verseT = 24; showVerse(); } }
    // Ostern: Lichtsäulen nur für den Admin
    if (eggs) { const adm = !!(L.suitOn && L.suitOn()); for (const e of eggs) e.m.userData.beam.visible = adm && e.m.visible; }
    // Geburtstag: Konfetti, Kerzen, Glückwünsche
    if (party) {
      party.t += dt; party.balls.position.y = party.strs.position.y = Math.sin(party.t * 1.2) * 0.4;
      for (const f of party.flames) f.scale.y = 0.3 * (0.8 + Math.random() * 0.4);
      if (Math.random() < dt * 14) L.fx(['#ff3a5a', '#3aa0ff', '#ffd040', '#3aff8a', '#c060ff'][Math.floor(Math.random() * 5)], P.x + R(-15, 15), (P.y || 0) + R(6, 12), P.z + R(-15, 15), 1, 1, { basic: true, size: 0.14, life: 4, g: 0.5 });
      birthT -= dt;
      if (birthT <= 0) { birthT = 45; const s = skySpot(130, 70); L.fwSkyText && L.fwSkyText(s.x, s.y, s.z, '🎂 Alles Gute zum Geburtstag! 🎉', { max: 60, width: 90, gentle: true, life: 14 }); for (let k = 0; k < 4; k++) setTimeout(() => fwNear(['kugel', 'herz', 'ring'], 120), k * 700); }
    }
  };
  L.clearEvents = function () { told = {}; fwT = 3; verseT = 6; birthT = 4; };
})();
