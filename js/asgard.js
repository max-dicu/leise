'use strict';
// Asgard: Die Regenbogenbrücke (Bifröst) führt von der Götterinsel über das Meer hinauf zur goldenen, schwebenden Stadt.
// Am Ende der Brücke steht Heimdalls Observatorium. Heimdall beamt dich mitten durchs Universum in die Backrooms (backrooms.js)
// und über das Pause-Menü wieder zurück. Eigene Entwürfe nach der nordischen Sage (Bifröst, Heimdall, Asgard).
(function () {
  const L = window.L, T = THREE, P = L.player;
  const I0 = { x: 4800, z: -4800, r: 700 };
  const A = 2.4, UX = Math.sin(A), UZ = Math.cos(A), VX = Math.cos(A), VZ = -Math.sin(A);
  const D0 = 682, D1 = 1600, TOP = 46, BW = 11, CD = 1835, CR = 220, OD = 1614, OR = 16;
  const at = (d, s) => ({ x: I0.x + UX * d + VX * (s || 0), z: I0.z + UZ * d + VZ * (s || 0) });
  const loc = (x, z) => { const dx = x - I0.x, dz = z - I0.z; return { d: dx * UX + dz * UZ, s: dx * VX + dz * VZ }; };
  const C = at(CD), O = at(OD);
  const YAW = Math.atan2(UX, UZ); // Blickrichtung „von der Insel zur Stadt“
  L.ASGARD = { x: C.x, z: C.z, y: TOP, obs: O };
  const deckY = (d) => { const t = L.clamp((d - D0) / 380, 0, 1); return 0.3 + (TOP - 0.3) * t * t * (3 - 2 * t); };

  // ---------- Boden: Brücke, Observatorium und Stadt tragen ----------
  function asgFloor(x, z, y) {
    if (Math.abs(x - C.x) > 2000 || Math.abs(z - C.z) > 2000) return null;
    const q = loc(x, z); let h = null;
    if (q.d > D0 - 3 && q.d < D1 + 6 && Math.abs(q.s) < BW / 2) h = deckY(q.d);
    if (Math.hypot(x - C.x, z - C.z) < CR || Math.hypot(x - O.x, z - O.z) < OR + 1.5) h = TOP;
    if (h === null || h > y + 1.3) return null;
    return h;
  }
  const ofa = L.floorAt;
  L.floorAt = function (x, z, y) { const f = asgFloor(x, z, y); if (f !== null) return f; return ofa ? ofa(x, z, y) : null; };

  // ---------- Bauen ----------
  let built = null;
  function cv(w, h, fn) { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; return t; }
  const RAIN = ['#ff3030', '#ff9020', '#ffe020', '#30d050', '#3090ff', '#4040d0', '#a040e0'];
  function rainbowTex(vertical) {
    return cv(256, 256, (g, w, h) => {
      const gr = vertical ? g.createLinearGradient(0, 0, 0, h) : g.createLinearGradient(0, 0, w, 0);
      RAIN.forEach((c, i) => gr.addColorStop(i / (RAIN.length - 1), c)); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 140; k++) { g.fillStyle = `rgba(255,255,255,${(Math.random() * 0.35).toFixed(2)})`; const x = Math.random() * w, y = Math.random() * h; vertical ? g.fillRect(x, y, 2 + Math.random() * 40, 2) : g.fillRect(x, y, 2, 2 + Math.random() * 40); }
    });
  }
  L.rainbowTex = rainbowTex;
  function goldTex() {
    return cv(256, 256, (g, w, h) => {
      g.fillStyle = '#d8a838'; g.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 32) for (let x = 0; x < w; x += 32) { g.fillStyle = `hsl(${40 + Math.random() * 8},${60 + Math.random() * 20}%,${48 + Math.random() * 14}%)`; g.fillRect(x + 1, y + 1, 30, 30); }
      g.strokeStyle = 'rgba(255,240,180,0.5)'; g.lineWidth = 2; for (let k = 0; k < 10; k++) { g.beginPath(); g.arc(w / 2, h / 2, 10 + k * 14, 0, 6.3); g.stroke(); }
    });
  }
  function build() {
    const g = new T.Group(); L.scene.add(g);
    const gold = new T.MeshStandardMaterial({ color: 0xe0b040, metalness: 0.75, roughness: 0.3, emissive: 0x3a2400 });
    const goldD = new T.MeshStandardMaterial({ color: 0xb08020, metalness: 0.8, roughness: 0.35, emissive: 0x201400 });
    const white = new T.MeshStandardMaterial({ color: 0xf4ead0, metalness: 0.2, roughness: 0.5 });
    const glowM = (c, o) => new T.MeshBasicMaterial({ color: c, transparent: true, opacity: o, blending: T.AdditiveBlending, depthWrite: false, fog: false, side: T.DoubleSide });
    const R = (() => { let s = 4242; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
    const boxes = [];
    const solid = (x, z, half, h) => boxes.push(L.addBoxY(x - half, z - half, x + half, z + half, TOP - 1, TOP + h, 'building'));

    // --- Bifröst: leuchtende Regenbogen-Fahrbahn ---
    const N = 120, len = D1 - D0, geo = new T.PlaneGeometry(BW, len, 1, N);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) { const v = pos.getY(i), d = D0 + (v + len / 2); pos.setXYZ(i, pos.getX(i), deckY(d), 0); pos.setZ(i, v + len / 2); }
    geo.computeVertexNormals();
    const bt = rainbowTex(false); bt.repeat.set(1, 30);
    const deck = new T.Mesh(geo, new T.MeshBasicMaterial({ map: bt, side: T.DoubleSide, transparent: true, opacity: 0.92 }));
    deck.position.set(I0.x + UX * D0, 0, I0.z + UZ * D0); deck.rotation.y = YAW; g.add(deck);
    const shim = new T.Mesh(geo, glowM(0xffffff, 0.22)); shim.material.map = rainbowTex(false); shim.material.map.repeat.set(2, 60); shim.position.copy(deck.position); shim.position.y = 0.05; shim.rotation.y = YAW; g.add(shim);
    const under = new T.Mesh(geo, glowM(0x80c0ff, 0.25)); under.position.copy(deck.position); under.position.y = -0.4; under.rotation.y = YAW; under.scale.x = 1.4; g.add(under);
    // leuchtende Kanten
    for (const s of [-1, 1]) {
      const pts = []; for (let k = 0; k <= 60; k++) { const d = D0 + len * k / 60, p = at(d, s * BW / 2); pts.push(new T.Vector3(p.x, deckY(d) + 0.35, p.z)); }
      const tube = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 120, 0.18, 6), new T.MeshBasicMaterial({ color: 0xfff0c0 })); g.add(tube);
    }
    // Funken über der Brücke
    const sparkN = 400, sg = new T.BufferGeometry(), sp = new Float32Array(sparkN * 3);
    for (let i = 0; i < sparkN; i++) { const d = D0 + Math.random() * len, p = at(d, (Math.random() - 0.5) * BW); sp[i * 3] = p.x; sp[i * 3 + 1] = deckY(d) + Math.random() * 6; sp[i * 3 + 2] = p.z; }
    sg.setAttribute('position', new T.BufferAttribute(sp, 3));
    const sparks = new T.Points(sg, new T.PointsMaterial({ color: 0xffffff, size: 0.5, transparent: true, opacity: 0.8, blending: T.AdditiveBlending, depthWrite: false }));
    g.add(sparks);

    // --- schwebende goldene Stadt ---
    const ft = goldTex(); ft.repeat.set(30, 30);
    const plat = new T.Mesh(new T.CylinderGeometry(CR, CR * 0.97, 8, 72), [gold, new T.MeshStandardMaterial({ map: ft, metalness: 0.5, roughness: 0.45 }), goldD]);
    plat.position.set(C.x, TOP - 4, C.z); g.add(plat);
    const rock = new T.Mesh(new T.ConeGeometry(CR * 0.97, 170, 40, 4), new T.MeshLambertMaterial({ color: 0x5a5048 })); rock.rotation.x = Math.PI; rock.position.set(C.x, TOP - 8 - 85, C.z); g.add(rock);
    for (let k = 0; k < 40; k++) { const a = R() * 6.28, r = R() * CR * 0.8, y = TOP - 12 - R() * 90 * (1 - r / CR); const cr = new T.Mesh(L.GEO.cone, glowM(k % 2 ? 0xffd060 : 0x80e0ff, 0.8)); cr.scale.set(1.5, 6, 1.5); cr.rotation.x = Math.PI; cr.position.set(C.x + Math.sin(a) * r, y, C.z + Math.cos(a) * r); g.add(cr); }
    // goldene Brüstung (mit Lücke am Observatorium)
    const ballN = 150;
    const ball = new T.InstancedMesh(L.GEO.cylB, gold, ballN), o3 = new T.Object3D();
    let bi = 0;
    for (let k = 0; k < ballN; k++) {
      const a = k / ballN * 6.283, x = C.x + Math.sin(a) * (CR - 1), z = C.z + Math.cos(a) * (CR - 1);
      if (Math.hypot(x - O.x, z - O.z) < OR + 6) continue;
      o3.position.set(x, TOP, z); o3.scale.set(0.35, 1.3, 0.35); o3.updateMatrix(); ball.setMatrixAt(bi++, o3.matrix);
      boxes.push(L.addBoxY(x - 4.7, z - 4.7, x + 4.7, z + 4.7, TOP - 1, TOP + 1.3, 'prop'));
    }
    ball.count = bi; g.add(ball);
    const rail = new T.Mesh(new T.TorusGeometry(CR - 1, 0.25, 6, 120), gold); rail.rotation.x = Math.PI / 2; rail.position.set(C.x, TOP + 1.3, C.z); g.add(rail);
    // Wasserfälle über den Rand
    const wt = cv(64, 256, (gg, w, h) => { gg.fillStyle = '#9ad8ff'; gg.fillRect(0, 0, w, h); for (let k = 0; k < 90; k++) { gg.fillStyle = `rgba(255,255,255,${(0.2 + Math.random() * 0.6).toFixed(2)})`; gg.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 3, 10 + Math.random() * 60); } });
    wt.repeat.set(2, 3);
    const falls = [];
    for (let k = 0; k < 16; k++) {
      const a = k / 16 * 6.283 + 0.2, x = C.x + Math.sin(a) * (CR + 0.6), z = C.z + Math.cos(a) * (CR + 0.6);
      if (Math.hypot(x - O.x, z - O.z) < 60) continue;
      const f = new T.Mesh(new T.PlaneGeometry(16, TOP + 1), new T.MeshBasicMaterial({ map: wt, transparent: true, opacity: 0.8, depthWrite: false, side: T.DoubleSide }));
      f.position.set(x, (TOP + 1) / 2 - 1, z); f.rotation.y = a; g.add(f); falls.push({ x, z });
    }
    // Paläste und Türme
    const avenue = (x, z) => { const q = loc(x, z); return Math.abs(q.s) < 18 && q.d < CD + 10; };
    // Hauptpalast: übereinander gestapelte Rundhallen mit Turmspitzen
    const pal = new T.Group(); pal.position.set(C.x, TOP, C.z); g.add(pal);
    [[30, 14], [21, 14], [13, 16], [7, 14]].reduce((y, [r, h]) => { const m = new T.Mesh(new T.CylinderGeometry(r * 0.92, r, h, 32), y === 0 ? white : gold); m.position.y = y + h / 2; pal.add(m); const band = new T.Mesh(new T.TorusGeometry(r * 0.96, 0.5, 6, 48), goldD); band.rotation.x = Math.PI / 2; band.position.y = y + h; pal.add(band); return y + h; }, 0);
    const spire = new T.Mesh(L.GEO.cone, gold); spire.scale.set(5, 60, 5); spire.position.y = 58 + 30; pal.add(spire);
    for (let k = 0; k < 10; k++) { const a = k / 10 * 6.283, r = 26, h = 26 + (k % 3) * 9; const tw = new T.Mesh(L.GEO.cylB, gold); tw.scale.set(2.2, h, 2.2); tw.position.set(Math.sin(a) * r, 0, Math.cos(a) * r); pal.add(tw); const tp = new T.Mesh(L.GEO.cone, goldD); tp.scale.set(2.8, 12, 2.8); tp.position.set(Math.sin(a) * r, h + 6, Math.cos(a) * r); pal.add(tp); }
    const doorP = new T.Mesh(L.GEO.boxB, glowM(0xffe8a0, 0.9)); const pd = at(CD - 30); doorP.scale.set(8, 11, 0.4); doorP.position.set(pd.x, TOP, pd.z); doorP.rotation.y = YAW; g.add(doorP);
    solid(C.x, C.z, 22, 60);
    const towers = [];
    for (let k = 0, tries = 0; k < 34 && tries < 600; tries++) {
      const a = R() * 6.283, r = 60 + R() * (CR - 85), x = C.x + Math.sin(a) * r, z = C.z + Math.cos(a) * r;
      if (avenue(x, z) || towers.some((q) => Math.hypot(q.x - x, q.z - z) < q.r + 14)) continue;
      const rr = 3 + R() * 6, h = 14 + R() * 58, tw = new T.Group(); tw.position.set(x, TOP, z); g.add(tw);
      const body = new T.Mesh(L.GEO.cylB, R() < 0.6 ? gold : white); body.scale.set(rr, h, rr); tw.add(body);
      for (let b = 1; b < 4; b++) { const band = new T.Mesh(new T.TorusGeometry(rr * 1.02, 0.25, 6, 24), goldD); band.rotation.x = Math.PI / 2; band.position.y = h * b / 4; tw.add(band); }
      if (R() < 0.6) { const c = new T.Mesh(L.GEO.cone, goldD); c.scale.set(rr * 1.15, rr * 3.5, rr * 1.15); c.position.y = h + rr * 1.75; tw.add(c); }
      else { const d = new T.Mesh(new T.SphereGeometry(rr * 1.05, 16, 8, 0, 6.283, 0, Math.PI / 2), gold); d.position.y = h; tw.add(d); const n = new T.Mesh(L.GEO.cone, gold); n.scale.set(0.4, rr * 2, 0.4); n.position.y = h + rr + rr; tw.add(n); }
      for (let w = 0; w < 6; w++) { const wa = w / 6 * 6.283, win = new T.Mesh(L.GEO.box, glowM(0xffe8a0, 0.85)); win.scale.set(rr * 0.35, rr * 0.7, 0.1); win.position.set(Math.sin(wa) * rr * 1.01, h * 0.7, Math.cos(wa) * rr * 1.01); win.rotation.y = wa; tw.add(win); }
      solid(x, z, rr * 0.75, h); towers.push({ x, z, r: rr }); k++;
    }
    // Feuerschalen entlang der Allee
    const braz = [];
    for (let k = 0; k < 8; k++) for (const s of [-1, 1]) { const p = at(OD + 30 + k * 22, s * 14), b = new T.Group(); b.position.set(p.x, TOP, p.z); g.add(b); const st = new T.Mesh(L.GEO.cylB, goldD); st.scale.set(0.35, 2.2, 0.35); b.add(st); const bowl = new T.Mesh(new T.SphereGeometry(0.9, 12, 6, 0, 6.283, Math.PI / 2, Math.PI / 2), gold); bowl.position.y = 2.6; b.add(bowl); const fl = new T.Mesh(L.GEO.cone, glowM(0xff9a30, 0.9)); fl.scale.set(0.6, 1.4, 0.6); fl.position.y = 3.3; b.add(fl); braz.push(fl); solid(p.x, p.z, 0.4, 3); }
    // zwei riesige Wächter-Statuen an der Allee
    for (const s of [-1, 1]) {
      const p = at(OD + 60, s * 30), rig = L.buildHuman(Object.assign({}, L.DEFAULT_CHAR, { hat: 'helm', top: 'mantel', build: 'muskuloes', height: 'sehr_gross', beard: 'vollbart' }), true);
      rig.root.traverse((o) => { if (o.isMesh) o.material = goldD; }); L.animHuman(rig, { mode: 'idle' });
      rig.arms.forEach((a) => { a.arm.rotation.x = -0.4; }); rig.root.scale.setScalar(9); rig.root.position.set(p.x, TOP, p.z); rig.root.rotation.y = YAW + Math.PI + s * 0.25; g.add(rig.root);
      const sw = new T.Mesh(L.GEO.box, gold); sw.scale.set(0.12, 2.2, 0.03); sw.position.set(0, 1.1, 0.55); rig.root.add(sw);
      const base = new T.Mesh(L.GEO.cylB, white); base.scale.set(7, 1.5, 7); base.position.set(p.x, TOP - 0.5, p.z); g.add(base);
      solid(p.x, p.z, 5, 30);
    }
    // goldene Bäume
    for (let k = 0; k < 24; k++) { const a = R() * 6.283, r = 40 + R() * (CR - 60), x = C.x + Math.sin(a) * r, z = C.z + Math.cos(a) * r; if (avenue(x, z) || towers.some((q) => Math.hypot(q.x - x, q.z - z) < q.r + 4)) continue; const tr = new T.Mesh(L.GEO.cylB, L.mat('#6a4a20')); tr.scale.set(0.4, 4, 0.4); tr.position.set(x, TOP, z); g.add(tr); const cr = new T.Mesh(L.GEO.sph, new T.MeshStandardMaterial({ color: 0xf0c040, metalness: 0.5, roughness: 0.4, emissive: 0x3a2a00 })); cr.scale.set(2.6, 2.2, 2.6); cr.position.set(x, TOP + 5.2, z); g.add(cr); solid(x, z, 0.4, 5); }

    // --- Heimdalls Observatorium ---
    const ob = new T.Group(); ob.position.set(O.x, TOP, O.z); ob.rotation.y = YAW; g.add(ob);
    const ofl = new T.Mesh(new T.CylinderGeometry(OR + 1.5, OR + 1.5, 1, 48), new T.MeshStandardMaterial({ map: goldTex(), metalness: 0.25, roughness: 0.7 })); ofl.position.y = -0.48; ob.add(ofl);
    for (let k = 0; k < 16; k++) {
      const a = k / 16 * 6.283; if (Math.abs(Math.sin(a)) < 0.3) continue; // Durchgang vorne (Brücke) und hinten (Stadt)
      const px = Math.sin(a) * (OR - 0.5), pz = Math.cos(a) * (OR - 0.5), pil = new T.Mesh(L.GEO.cylB, gold); pil.scale.set(0.8, 11, 0.8); pil.position.set(px, 0, pz); ob.add(pil);
      const w = new T.Vector3(px, 0, pz).applyAxisAngle(new T.Vector3(0, 1, 0), YAW); solid(O.x + w.x, O.z + w.z, 0.6, 11);
    }
    const dome = new T.Mesh(new T.SphereGeometry(OR, 40, 14, 0, 6.283, 0, Math.PI / 2), new T.MeshStandardMaterial({ color: 0xe0b040, metalness: 0.8, roughness: 0.3, side: T.DoubleSide, emissive: 0x2a1800 }));
    dome.scale.y = 0.62; dome.position.y = 11; ob.add(dome);
    const ringA = new T.Group(); ringA.position.y = 7.5; ob.add(ringA);
    for (let k = 0; k < 3; k++) { const rg = new T.Mesh(new T.TorusGeometry(OR - 3 - k * 2.2, 0.22, 6, 64), k === 1 ? glowM(0x80e0ff, 0.9) : gold); rg.rotation.x = Math.PI / 2 + k * 0.25; ringA.add(rg); }
    const runeT = cv(512, 64, (gg, w, h) => { gg.fillStyle = 'rgba(0,0,0,0)'; gg.fillRect(0, 0, w, h); gg.fillStyle = '#80e0ff'; gg.font = 'bold 40px serif'; let s = ''; const R0 = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ'; for (let i = 0; i < 26; i++) s += R0[i % R0.length]; gg.fillText(s, 4, 46); });
    const runes = new T.Mesh(new T.CylinderGeometry(OR - 1.2, OR - 1.2, 1.4, 48, 1, true), new T.MeshBasicMaterial({ map: runeT, transparent: true, side: T.DoubleSide, blending: T.AdditiveBlending, depthWrite: false })); runes.position.y = 4; runeT.repeat.set(3, 1); ob.add(runes);
    const ped = new T.Mesh(L.GEO.cylB, goldD); ped.scale.set(1.3, 1.2, 1.3); ob.add(ped);
    const slot = new T.Mesh(L.GEO.box, glowM(0x80e0ff, 0.9)); slot.scale.set(0.5, 0.1, 0.15); slot.position.y = 1.22; ob.add(slot);
    solid(O.x, O.z, 0.9, 1.2);
    const obLight = new T.PointLight(0xffd890, 0.7, 45, 1.5); obLight.position.set(0, 8, 0); ob.add(obLight);
    // Heimdall
    const H = L.buildHuman(Object.assign({}, L.DEFAULT_CHAR, { name: 'Heimdall', skin: '#7a5238', hair: 'kurz', hairColor: '#141414', eyes: '#ffb020', brows: 'dick', mouth: 'ernst', beard: 'kein', hat: 'helm', hatColor: '#d8a830', top: 'mantel', topColor: '#b8862a', pants: 'anzughose', pantsColor: '#3a2a18', shoeType: 'stiefel', shoes: '#8a6a20', build: 'muskuloes', height: 'sehr_gross' }), true);
    for (const s of [-1, 1]) { const h = new T.Mesh(L.GEO.cone, gold); h.scale.set(0.06, 0.32, 0.06); h.position.set(s * 0.17, 0.42, -0.02); h.rotation.z = -s * 0.5; H.head.add(h); const e = new T.Mesh(L.GEO.sph, new T.MeshBasicMaterial({ color: 0xffb020 })); e.scale.set(0.028, 0.02, 0.01); e.position.set(s * 0.06, 0.14, 0.16); H.head.add(e); }
    const cape = new T.Mesh(L.GEO.box, L.mat('#5a1010')); cape.scale.set(0.52, 1.25, 0.03); cape.position.set(0, -0.4, -0.2); H.torso.add(cape);
    for (const s of [-1, 1]) { const sh = new T.Mesh(L.GEO.sph, gold); sh.scale.set(0.16, 0.1, 0.16); sh.position.set(s * 0.26, 0.2, 0); H.torso.add(sh); }
    const sword = new T.Group(); H.root.add(sword);
    const blade = new T.Mesh(L.GEO.box, new T.MeshStandardMaterial({ color: 0xd8d8e0, metalness: 0.9, roughness: 0.2, emissive: 0x202838 })); blade.scale.set(0.1, 1.35, 0.025); blade.position.y = -0.55; sword.add(blade);
    const guard = new T.Mesh(L.GEO.box, gold); guard.scale.set(0.42, 0.06, 0.07); guard.position.y = 0.14; sword.add(guard);
    const grip = new T.Mesh(L.GEO.cyl, L.mat('#3a2410')); grip.scale.set(0.035, 0.26, 0.035); grip.position.y = 0.3; sword.add(grip);
    const pomm = new T.Mesh(L.GEO.sph, gold); pomm.scale.setScalar(0.06); pomm.position.y = 0.46; sword.add(pomm);
    const swGlow = new T.Mesh(L.GEO.box, glowM(0x80e0ff, 0)); swGlow.scale.set(0.2, 1.4, 0.08); swGlow.position.y = -0.55; sword.add(swGlow);
    H.root.scale.setScalar(1.9);
    const hp = new T.Vector3(0, 0, 1.6).applyAxisAngle(new T.Vector3(0, 1, 0), YAW);
    H.root.position.set(O.x + hp.x, TOP, O.z + hp.z); H.root.rotation.y = YAW + Math.PI; g.add(H.root);
    solid(O.x + hp.x, O.z + hp.z, 0.5, 3);
    // Wachen
    const guards = [];
    for (let k = 0; k < 8; k++) {
      const rig = L.buildHuman(Object.assign({}, L.DEFAULT_CHAR, { skin: L.pick(['#e3b48f', '#c98e65', '#8a5a3a', '#f0d0b0']), hat: 'helm', hatColor: '#d8a830', top: 'weste', topColor: '#c8962a', pants: 'anzughose', pantsColor: '#5a1a1a', shoeType: 'stiefel', shoes: '#6a4a18', build: 'kraeftig', beard: L.pick(['kein', 'vollbart', 'stoppel']) }), true);
      const sp2 = new T.Group(); const sh = new T.Mesh(L.GEO.cyl, L.mat('#6a4a20')); sh.scale.set(0.03, 2.4, 0.03); sp2.add(sh); const tip = new T.Mesh(L.GEO.cone, gold); tip.scale.set(0.07, 0.3, 0.07); tip.position.y = 1.3; sp2.add(tip); sp2.position.set(0.38, 1.0, 0.1); rig.root.add(sp2);
      const patrol = k >= 4, d0 = patrol ? CD - 120 + k * 15 : OD + 24 + (k % 2) * 10, s0 = patrol ? 0 : (k < 2 ? -9 : 9);
      const p = at(d0, s0); rig.root.position.set(p.x, TOP, p.z); g.add(rig.root);
      guards.push({ rig, patrol, a: k * 0.23, r: k, ph: k, yaw: YAW + (k < 2 ? Math.PI / 2 : -Math.PI / 2) });
    }
    return { g, deck, bt, shim, sparks, falls, wt, ringA, runes, H, sword, swGlow, braz, guards, boxes, obLight, ringSpd: 0.15 };
  }
  // Durchgang auf der Götterinsel freiräumen (Bäume/Häuser direkt am Brückenanfang)
  let cleared = false;
  function clearIslandPath() {
    const I = (L.ISL || []).find((q) => q.id === 'asgard'); if (!I || !I.built) return;
    cleared = true;
    for (let d = D0 - 50; d < D0 + 30; d += 4) { const p = at(d); for (const b of L.queryBoxes(p.x, p.z, BW * 0.7)) if (b.kind !== 'mtn') b.on = false; }
  }

  // ---------- der Beam ----------
  const beamMat = () => new T.MeshBasicMaterial({ map: (() => { const t = rainbowTex(true); t.repeat.set(3, 1); return t; })(), transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, fog: false });
  function makeColumn() {
    const g = new T.Group(); g.frustumCulled = false;
    const outer = new T.Mesh(new T.CylinderGeometry(2.6, 2.6, 600, 32, 1, true).translate(0, 300, 0), beamMat()); g.add(outer);
    const core = new T.Mesh(new T.CylinderGeometry(0.9, 0.9, 600, 16, 1, true).translate(0, 300, 0), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, fog: false })); g.add(core);
    const ring = new T.Mesh(new T.RingGeometry(1, 4.5, 48).rotateX(-Math.PI / 2), beamMat()); ring.position.y = 0.06; g.add(ring);
    g.traverse((o) => { o.frustumCulled = false; });
    L.scene.add(g);
    return { g, outer, core, ring, set(op) { outer.material.opacity = op * 0.5; core.material.opacity = op * 0.55; ring.material.opacity = op * 0.8; g.visible = op > 0.01; } };
  }
  function dropColumn(c) { if (!c) return; L.scene.remove(c.g); c.g.traverse((o) => { if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); } if (o.geometry) o.geometry.dispose(); }); }
  // Tunnel durchs Universum (weit weg, über den Backrooms)
  const TUN = { x: 81000, y: 5000, z: 140000 };
  let tunnel = null;
  function makeTunnel() {
    const g = new T.Group(); g.position.set(TUN.x, TUN.y, TUN.z); L.scene.add(g);
    const rings = [];
    for (let k = 0; k < 70; k++) { const m = new T.Mesh(new T.TorusGeometry(7, 0.35, 6, 40), new T.MeshBasicMaterial({ color: RAIN[k % RAIN.length], transparent: true, opacity: 0.85, blending: T.AdditiveBlending, depthWrite: false, fog: false })); m.position.z = k * 9; g.add(m); rings.push(m); }
    const sN = 1500, sg = new T.BufferGeometry(), sp = new Float32Array(sN * 3);
    for (let i = 0; i < sN; i++) { const a = Math.random() * 6.28, r = 12 + Math.random() * 300; sp[i * 3] = Math.sin(a) * r; sp[i * 3 + 1] = Math.cos(a) * r; sp[i * 3 + 2] = Math.random() * 700 - 50; }
    sg.setAttribute('position', new T.BufferAttribute(sp, 3));
    g.add(new T.Points(sg, new T.PointsMaterial({ color: 0xffffff, size: 1.6, fog: false })));
    for (let k = 0; k < 7; k++) { const pl = new T.Mesh(new T.SphereGeometry(8 + k * 4, 24, 16), new T.MeshBasicMaterial({ color: ['#d08a50', '#6a8ad0', '#c0c0b0', '#a050c0', '#50c0a0', '#e0d070', '#d05050'][k], fog: false })); const a = k * 0.9; pl.position.set(Math.sin(a) * (90 + k * 25), Math.cos(a) * (70 + k * 15), 100 + k * 80); g.add(pl); }
    const neb = new T.Mesh(new T.SphereGeometry(900, 24, 16), new T.MeshBasicMaterial({ color: 0x140828, side: T.BackSide, fog: false })); neb.position.z = 300; g.add(neb);
    g.traverse((o) => { o.frustumCulled = false; });
    return { g, rings };
  }
  let beam = null, beamCol = null;
  L.beamBusy = () => !!beam;
  const flash = () => L.backFade;
  function sfxBeam() { for (let k = 0; k < 8; k++) L.tn && L.tn({ f: 220 + k * 140, fTo: 2600, dur: 1.2, type: 'sine', vol: 0.09, delay: k * 0.18 }); L.nz && L.nz({ dur: 2.5, f: 3000, fTo: 600, type: 'bandpass', vol: 0.25 }); }
  function startBeam(dir) {
    if (beam || !P.alive || L.cine) return false;
    if (P.vehicle && L._leaveVehicle) L._leaveVehicle(true);
    beam = { dir, t: 0, from: { x: P.x, y: P.y || 0, z: P.z }, cam: { x: 0, y: 0, z: 0, lx: 0, ly: 0, lz: 0 }, phase: 0 };
    if (!tunnel) tunnel = makeTunnel();
    beamCol = makeColumn(); beamCol.g.position.set(P.x, P.y || 0, P.z);
    const dur = dir === 'out' ? 8.2 : 6.2;
    L.startCine(dir === 'out' ? '🌈 HEIMDALL ÖFFNET DEN BIFRÖST' : '🌈 HEIMDALL HOLT DICH ZURÜCK', dur, () => beam && beam.cam);
    if (!L.cine) { beam = null; dropColumn(beamCol); beamCol = null; return false; }
    if (dir === 'out') L.banner('🌈 HEIMDALL', '„Ich sehe alle neun Welten … und einen Ort dazwischen, an dem niemand sein sollte. Halte dich fest.“');
    return true;
  }
  L.beamHome = function () {
    if (!(L.inBack && L.inBack(P.x))) { L.msg('🌈 Zurück beamen geht nur aus den Backrooms.', 2500); return; }
    startBeam('in');
  };
  const ease = (u) => { u = L.clamp(u, 0, 1); return u * u * (3 - 2 * u); };
  function setP(x, y, z) { P.x = x; P.y = y; P.z = z; P.vx = P.vz = P.vy = 0; P.air = true; if (P.rig) P.rig.root.position.set(x, y, z); }
  function updateBeam(dt) {
    const B = beam; B.t += dt; const t = B.t, out = B.dir === 'out', W = built;
    // Abkürzung: Film übersprungen → direkt ans Ziel
    if (!L.cine && !B.done) { finishBeam(); return; }
    if (out) {
      const H = W.H, f = B.from;
      // 0–1,4 s: Heimdall hebt das Schwert, 1,4 s: stößt es in den Sockel
      const lift = ease(t / 1.2) * (1 - ease((t - 1.25) / 0.2));
      W.sword.position.set(0, 0.95 + lift * 0.7, 0.42); W.swGlow.material.opacity = t > 1.4 ? 0.6 + Math.sin(t * 20) * 0.3 : lift * 0.4;
      H.arms.forEach((a) => { a.arm.rotation.x = -0.9 - lift * 1.6; a.arm.rotation.z = 0; a.elbow.rotation.x = -0.3; });
      if (t > 1.4 && !B.plunge) { B.plunge = true; L.shake = 0.9; L.snd.stomp && L.snd.stomp({ x: O.x, y: TOP, z: O.z }); sfxBeam(); W.ringSpd = 6; }
      if (t > 1.4) W.ringSpd = Math.min(9, W.ringSpd + dt * 4);
      const col = ease((t - 1.6) / 1.6); beamCol.set(col); beamCol.outer.material.map.offset.x += dt * 2; beamCol.g.position.set(f.x, f.y, f.z);
      if (t < 4.6) {
        const up = t > 3.2 ? ease((t - 3.2) / 1.4) * 70 : t > 1.8 ? (t - 1.8) * 0.6 : 0; setP(f.x, f.y + up, f.z);
        if (Math.random() < dt * 30 && t > 1.6) L.fx(L.pick(RAIN), f.x + L.rand(-2, 2), f.y + L.rand(0, 4), f.z + L.rand(-2, 2), 2, 4, { basic: true, size: 0.15, life: 1 });
        const a = YAW + 2.2 + t * 0.25, d = t < 3.2 ? 13 - t * 0.6 : 10;
        Object.assign(B.cam, { x: f.x + Math.sin(a) * d, y: TOP + (t < 3.2 ? 3.5 : 1.2), z: f.z + Math.cos(a) * d, lx: f.x, ly: P.y + (t < 3.2 ? 1.6 : 4), lz: f.z });
        flash().style.background = '#fff'; flash().style.opacity = String(t > 4.2 ? (t - 4.2) / 0.4 : 0);
        return;
      }
      // 4,6–7,4 s: durch den Regenbogen-Tunnel quer durchs Universum
      if (!B.inTun) { B.inTun = true; beamCol.set(0); tunnel.g.visible = true; L.banner('✨ MITTEN DURCHS UNIVERSUM', '…'); }
      const u = (t - 4.6) / 2.8, z = TUN.z + u * 560;
      setP(TUN.x, TUN.y, z); if (P.rig) P.rig.root.rotation.set(-1.2, 0, 0);
      tunnel.rings.forEach((r, k) => { r.rotation.z += dt * (k % 2 ? 1 : -1); });
      Object.assign(B.cam, { x: TUN.x + Math.sin(t * 2) * 1.5, y: TUN.y + 2.5, z: z - 9, lx: TUN.x, ly: TUN.y, lz: z + 10 });
      flash().style.opacity = String(t < 5.0 ? 1 - (t - 4.6) / 0.4 : t > 7.0 ? (t - 7.0) / 0.4 : 0);
      if (t > 7.4) finishBeam();
      return;
    }
    // zurück: Beam fällt in die Backrooms, Spieler wird hochgezogen, Tunnel rückwärts, Ankunft im Observatorium
    const f = B.from;
    if (t < 2.6) {
      const col = ease(t / 1.2); beamCol.set(col); beamCol.outer.material.map.offset.x += dt * 2;
      if (t > 0.3 && !B.snd) { B.snd = true; sfxBeam(); L.shake = 0.5; }
      const up = t > 1.5 ? ease((t - 1.5) / 1.1) * 8 : 0; setP(f.x, f.y + up, f.z);
      if (Math.random() < dt * 30) L.fx(L.pick(RAIN), f.x + L.rand(-2, 2), f.y + L.rand(0, 3), f.z + L.rand(-2, 2), 2, 4, { basic: true, size: 0.15, life: 1 });
      const a = 0.6 + t * 0.4; Object.assign(B.cam, { x: f.x + Math.sin(a) * 1.7, y: f.y + 1.6, z: f.z + Math.cos(a) * 3.2, lx: f.x, ly: P.y + 1.2, lz: f.z });
      flash().style.background = '#fff'; flash().style.opacity = String(t > 2.2 ? (t - 2.2) / 0.4 : 0);
      return;
    }
    if (t < 4.6) {
      if (!B.inTun) { B.inTun = true; beamCol.set(0); tunnel.g.visible = true; if (L.backLeft) L.backLeft(); }
      const u = (t - 2.6) / 2, z = TUN.z + 560 - u * 560;
      setP(TUN.x, TUN.y, z); if (P.rig) P.rig.root.rotation.set(1.2, 0, 0);
      tunnel.rings.forEach((r, k) => { r.rotation.z += dt * (k % 2 ? 1 : -1); });
      Object.assign(B.cam, { x: TUN.x, y: TUN.y + 2.5, z: z + 9, lx: TUN.x, ly: TUN.y, lz: z - 10 });
      flash().style.opacity = String(t < 3.0 ? 1 - (t - 2.6) / 0.4 : t > 4.2 ? (t - 4.2) / 0.4 : 0);
      return;
    }
    if (!B.arrived) arriveAsgard();
    const u = t - 4.6; flash().style.opacity = String(Math.max(0, 1 - u / 0.5));
    beamCol.set(Math.max(0, 1 - u / 1.4)); beamCol.outer.material.map.offset.x += dt * 2;
    const a = YAW + 2.4 + u * 0.3; Object.assign(B.cam, { x: O.x + Math.sin(a) * 9, y: TOP + 3, z: O.z + Math.cos(a) * 9, lx: P.x, ly: TOP + 1.4, lz: P.z });
    if (t > 6.1) finishBeam();
  }
  function arriveSpot() { const p = at(OD - 6); return { x: p.x, y: TOP, z: p.z }; }
  function arriveAsgard() {
    const B = beam; B.arrived = true;
    if (!built) built = build();
    const s = arriveSpot(); setP(s.x, s.y + 0.5, s.z); P.yaw = YAW; if (P.rig) P.rig.root.rotation.set(0, YAW, 0);
    beamCol.g.position.set(s.x, s.y, s.z); tunnel.g.visible = false;
    L.snd.land && L.snd.land({ x: s.x, y: s.y, z: s.z });
  }
  function finishBeam() {
    const B = beam; if (!B || B.done) return; B.done = true;
    const out = B.dir === 'out';
    if (out) {
      tunnel.g.visible = false;
      if (P.rig) P.rig.root.rotation.set(0, 0, 0);
      L.backEnter(0, 2.2);
      if (built) { built.sword.position.set(0, 0.95, 0.42); built.ringSpd = 0.15; }
      // kurzer Lichtschein bei der Ankunft
      beamCol.g.position.set(P.x, 0, P.z); beamCol.set(1); B.arriveFade = 1.6;
    } else {
      if (!B.arrived) arriveAsgard();
      if (P.rig) P.rig.root.rotation.set(0, YAW, 0);
      L.banner('🌈 ASGARD', 'Heimdall hat dich zurückgeholt. „Willkommen daheim, Reisender.“');
      B.arriveFade = 1.0;
    }
    P.spawnProt = Math.max(P.spawnProt || 0, 6);
    flash().style.opacity = '0';
    if (L.cine && L.endCine) L.endCine();
  }

  // ---------- jedes Bild ----------
  function nearHeimdall() {
    if (!built || P.vehicle || beam) return false;
    const h = built.H.root.position; return Math.hypot(P.x - h.x, P.z - h.z) < 6 && Math.abs((P.y || 0) - TOP) < 3;
  }
  const och = L.crateHint, oci = L.crateInteract;
  L.crateHint = () => (nearHeimdall() ? 'E: 🌈 Heimdall: „Soll ich dich in die Backrooms beamen?“' : och ? och() : null);
  L.crateInteract = function () { if (!nearHeimdall()) return oci ? oci() : false; startBeam('out'); return true; };
  let talkT = 0;
  L.updateAsgard = function (dt) {
    if (!cleared) clearIslandPath();
    const nearC = Math.abs(P.x - C.x) < 3500 && Math.abs(P.z - C.z) < 3500;
    if (!built && nearC) built = build();
    if (beam) {
      if (beam.done) {
        beam.arriveFade -= dt; if (beamCol) { beamCol.set(Math.max(0, beam.arriveFade)); beamCol.outer.material.map.offset.x += dt * 2; }
        if (beam.arriveFade <= 0) { dropColumn(beamCol); beamCol = null; beam = null; }
      } else updateBeam(dt);
    }
    if (!built) return;
    const W = built, t = performance.now() / 1000, vis = nearC || !!beam;
    W.g.visible = vis; if (!vis) return;
    W.bt.offset.y -= dt * 0.25; W.shim.material.map.offset.y -= dt * 0.6; W.shim.material.map.offset.x = Math.sin(t * 0.7) * 0.2;
    W.sparks.material.opacity = 0.5 + Math.sin(t * 3) * 0.3;
    W.wt.offset.y += dt * 1.6;
    W.ringA.rotation.y += dt * W.ringSpd; W.ringA.children.forEach((r, k) => { r.rotation.z += dt * (k + 1) * 0.2 * (W.ringSpd > 1 ? 4 : 1); });
    W.runes.rotation.y -= dt * W.ringSpd * 0.4; W.runes.material.opacity = W.ringSpd > 1 ? 1 : 0.55 + Math.sin(t * 2) * 0.2;
    W.obLight.intensity = 0.7 + (W.ringSpd > 1 ? 1.2 : 0) + Math.sin(t * 3) * 0.12;
    W.braz.forEach((f, k) => { f.scale.set(0.6 + Math.sin(t * 9 + k) * 0.1, 1.4 + Math.sin(t * 13 + k * 2) * 0.35, 0.6); });
    if (Math.random() < dt * 4) { const fl = L.pick(W.falls); if (Math.hypot(P.x - fl.x, P.z - fl.z) < 500) L.fx('#ffffff', fl.x + L.rand(-6, 6), 0.5, fl.z + L.rand(-6, 6), 3, 4, { size: 0.6, life: 1.4 }); }
    // Heimdall: ruhig atmen, das Schwert im Sockel; dreht den Kopf zum Spieler
    if (!beam || beam.dir !== 'out' || beam.done) {
      L.animHuman(W.H, { mode: 'idle', phase: t });
      W.H.arms.forEach((a) => { a.arm.rotation.x = -0.9; a.elbow.rotation.x = -0.3; });
      W.sword.position.set(0, 0.95, 0.42); W.swGlow.material.opacity = 0.15 + Math.sin(t * 2) * 0.1;
      const hp = W.H.root.position, dP = Math.hypot(P.x - hp.x, P.z - hp.z);
      if (dP < 25) { const want = Math.atan2(P.x - hp.x, P.z - hp.z) - W.H.root.rotation.y; W.H.head.rotation.y = L.clamp(Math.atan2(Math.sin(want), Math.cos(want)), -0.9, 0.9); }
      talkT -= dt;
      if (dP < 9 && talkT <= 0 && Math.abs((P.y || 0) - TOP) < 3 && !beam) { talkT = 40; L.msg('🌈 Heimdall: „Ich bin Heimdall, Wächter der Brücke. Drück E, und ich schicke dich an einen Ort zwischen den Welten.“', 6000); }
    }
    // Wachen
    for (const q of W.guards) {
      if (q.patrol) { q.a += dt * 0.012; const u = Math.sin(q.a * 6.283) * 0.5 + 0.5, du = Math.cos(q.a * 6.283), p = at(OD + 30 + u * (CD - 75 - OD), (q.r % 2 ? 1 : -1) * 6); q.rig.root.position.set(p.x, TOP, p.z); q.rig.root.rotation.y = du > 0 ? YAW : YAW + Math.PI; q.ph += dt * 6; L.animHuman(q.rig, { mode: 'walk', phase: q.ph, speed: 1 }); }
      else { q.rig.root.rotation.y = q.yaw; L.animHuman(q.rig, { mode: 'idle', phase: t + q.ph }); }
    }
  };
  // Hintergrund im Tunnel: tiefes Weltall
  const oue = L.updateEnv;
  L.updateEnv = function (dt, cam, focus, paused) {
    oue(dt, cam, focus, paused);
    if (beam && beam.inTun && !beam.done && cam && cam.position.y > 1000) { L.scene.background.setRGB(0.02, 0.0, 0.06); L.scene.fog.far = 100000; cam.far = 3000; cam.updateProjectionMatrix(); }
  };
  // Karte: Brücke und Stadt einzeichnen
  const ome = L.mapExtra;
  L.mapExtra = function (g, toM, big) {
    if (ome) ome(g, toM, big);
    const a = toM(at(D0).x, at(D0).z), b = toM(at(D1).x, at(D1).z), c = toM(C.x, C.z), e = toM(C.x + CR, C.z), r = Math.abs(e[0] - c[0]);
    g.save(); g.lineWidth = Math.max(2, r * 0.08); const gr = g.createLinearGradient(a[0], a[1], b[0], b[1]); RAIN.forEach((col, i) => gr.addColorStop(i / (RAIN.length - 1), col)); g.strokeStyle = gr;
    g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
    g.fillStyle = '#e8c040'; g.beginPath(); g.arc(c[0], c[1], Math.max(3, r), 0, 6.3); g.fill();
    if (big) { g.fillStyle = '#fff'; g.font = 'bold 14px sans-serif'; g.textAlign = 'center'; g.fillText('🌈 Asgard', c[0], c[1] - Math.max(6, r) - 4); }
    g.restore();
  };
  L.clearAsgard = function () {
    if (beam) { dropColumn(beamCol); beamCol = null; beam = null; }
    if (tunnel) tunnel.g.visible = false;
    if (L.backFade) L.backFade.style.opacity = '0';
    if (built) { built.ringSpd = 0.15; }
  };
})();
