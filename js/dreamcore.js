'use strict';
// Die Dimension im Dreamcore-Stil: Pastellhimmel mit Wolken und Regenbogen, karierte Böden, Türen und Treppen ins Nichts,
// kleine Pools, und riesige Augen am Himmel, die dich beobachten. Verträumt – aber ein bisschen unheimlich.
(function () {
  const L = window.L, T = THREE, P = L.player;
  let done = false, sky = null, eyes = [], clouds = null, props = null;
  const inDream = (x) => L.inDim(x) && !(L.inMoon && L.inMoon(x)) && !(L.inBack && L.inBack(x));
  function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new T.CanvasTexture(c); return t; }
  const checker = (a, b) => { const t = canvasTex(64, 64, (g) => { g.fillStyle = a; g.fillRect(0, 0, 64, 64); g.fillStyle = b; g.fillRect(0, 0, 32, 32); g.fillRect(32, 32, 32, 32); }); t.wrapS = t.wrapT = T.RepeatWrapping; t.magFilter = T.NearestFilter; return t; };
  const PASTEL = ['#ffb8d8', '#b8d8ff', '#d8b8ff', '#b8ffe0', '#fff0a8', '#ffd0b0'];
  function cloudTex() {
    return canvasTex(128, 128, (g) => {
      for (let k = 0; k < 7; k++) { const x = 30 + Math.random() * 68, y = 45 + Math.random() * 40, r = 22 + Math.random() * 22; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); }
    });
  }
  function build(I) {
    done = true;
    const g = I.group;
    // ---------- Himmel: Verlauf rosa → lila → hellblau ----------
    const st = canvasTex(4, 256, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#9ec8ff'); gr.addColorStop(0.45, '#e8c8ff'); gr.addColorStop(0.62, '#ffc8e4'); gr.addColorStop(1, '#fff0f6'); c.fillStyle = gr; c.fillRect(0, 0, w, h); });
    sky = new T.Mesh(new T.SphereGeometry(20000, 32, 16), new T.MeshBasicMaterial({ map: st, side: T.BackSide, fog: false, depthWrite: false }));
    sky.renderOrder = -10; sky.visible = false; L.scene.add(sky);
    // Regenbogen
    const rb = new T.Group(); const RB = ['#ff8aa8', '#ffc08a', '#fff08a', '#a8ff9a', '#8ad8ff', '#c0a0ff'];
    RB.forEach((c, k) => { const m = new T.Mesh(new T.TorusGeometry(1400 - k * 45, 22, 8, 80, Math.PI), new T.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.55, fog: false, depthWrite: false })); rb.add(m); });
    rb.position.set(I.x + 1800, -200, I.z - 1600); rb.rotation.y = 0.6; g.add(rb);
    // alte Weltraum-Kulisse weg (schwarze Löcher, Planeten)
    g.traverse((o) => { if (o.isMesh && o.material && o.material.color && !o.isInstancedMesh) { const hex = o.material.color.getHex(); if (hex === 0x000000 || (o.geometry.type === 'SphereGeometry' && o.scale.x > 200)) o.visible = false; } });
    for (const h of I.holes || []) h.visible = false;
    // ---------- Böden kariert, Unterseiten wie Wolken, Brücken pastell ----------
    g.traverse((o) => {
      if (!o.isMesh || o.isInstancedMesh) return;
      const gt = o.geometry.type;
      if (gt === 'CylinderGeometry' && o.geometry.parameters.height === 30) { const r = o.geometry.parameters.radiusTop; const tx = checker('#ffffff', r > 300 ? '#ffa8d0' : '#a8ccff'); tx.repeat.set(r / 9, r / 9); o.material = new T.MeshLambertMaterial({ map: tx }); }
      else if (gt === 'ConeGeometry' && o.rotation.x === Math.PI) o.material = new T.MeshLambertMaterial({ color: '#fff6fb' });
      else if (o.material.color && o.material.color.getHexString() === '2a1a3a') o.material = new T.MeshLambertMaterial({ color: '#d8b8ff' });
      else if (o.material.color && o.material.color.getHexString() === 'a080ff') o.material = new T.MeshLambertMaterial({ color: '#ffd8ee', emissive: new T.Color('#ff9ad0'), emissiveIntensity: 0.35 });
    });
    // Deko-Instanzen in Pastell
    g.traverse((o) => { if (o.isInstancedMesh && o.instanceColor) { const c = new T.Color(); for (let i = 0; i < o.count; i++) { o.getColorAt(i, c); const p = new T.Color(PASTEL[i % PASTEL.length]); c.lerp(p, 0.75); o.setColorAt(i, c); } o.instanceColor.needsUpdate = true; } });
    for (const q of I.jelly || []) q.j.traverse((o) => { if (o.material) { o.material = o.material.clone(); o.material.color.set(PASTEL[Math.floor(Math.random() * PASTEL.length)]); o.material.blending = T.NormalBlending; o.material.opacity = 0.6; } });
    // ---------- Wolken ----------
    const ct = cloudTex(); clouds = [];
    for (let k = 0; k < 70; k++) {
      const s = new T.Sprite(new T.SpriteMaterial({ map: ct, color: k % 5 === 0 ? 0xffe0f0 : 0xffffff, transparent: true, opacity: 0.85, depthWrite: false, fog: false }));
      const a = Math.random() * 6.28, d = 200 + Math.random() * 1400, sc = 90 + Math.random() * 240;
      s.position.set(I.x + Math.sin(a) * d, -140 + Math.random() * 320, I.z + Math.cos(a) * d); s.scale.set(sc * 1.6, sc, 1); g.add(s); clouds.push({ s, sp: 2 + Math.random() * 5 });
    }
    // ---------- Türen, Torbögen, Treppen ins Nichts, kleine Pools ----------
    props = new T.Group(); g.add(props);
    const plat = [[I.x, I.z, 520]]; for (let k = 0; k < 6; k++) { const a = k / 6 * 6.28 + 0.3; plat.push([I.x + Math.sin(a) * 760, I.z + Math.cos(a) * 760, 150]); }
    const rnd = (() => { let s = 77; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();
    const spot = (pr) => { for (let k = 0; k < 40; k++) { const [px, pz, r] = plat[Math.floor(rnd() * plat.length)], a = rnd() * 6.28, d = Math.sqrt(rnd()) * (r - 30), x = px + Math.sin(a) * d, z = pz + Math.cos(a) * d; if (Math.hypot(x - I.x, z - I.z) > 40 && !L.queryBoxes(x, z, pr).length) return [x, z]; } return null; };
    const box = (c, sx, sy, sz, x, y, z, par, o) => { const m = new T.Mesh(L.GEO.boxB, new T.MeshLambertMaterial(Object.assign({ color: c }, o || {}))); m.scale.set(sx, sy, sz); m.position.set(x, y, z); (par || props).add(m); return m; };
    // einsame Türen (offen, dahinter: nichts)
    for (let k = 0; k < 14; k++) {
      const s = spot(3); if (!s) continue; const d = new T.Group(); d.position.set(s[0], 0, s[1]); d.rotation.y = rnd() * 6.28; props.add(d);
      const col = PASTEL[k % PASTEL.length];
      box('#ffffff', 0.3, 4.4, 0.3, -1.2, 0, 0, d); box('#ffffff', 0.3, 4.4, 0.3, 1.2, 0, 0, d); box('#ffffff', 2.7, 0.3, 0.3, 0, 4.4, 0, d);
      const door = box(col, 2.1, 4.1, 0.12, 1.05, 0, 0, d); door.geometry = door.geometry.clone().translate(-0.5, 0, 0); door.rotation.y = -0.9; door.position.x = 1.05;
      box('#fff6a0', 0.1, 0.1, 0.1, 0.1, 2, 0.15, door, { emissive: new T.Color('#fff6a0') });
      const glow = new T.Mesh(new T.PlaneGeometry(2.1, 4.1), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, side: T.DoubleSide, depthWrite: false })); glow.position.set(0, 2.05, -0.02); d.add(glow);
      L.addBox(s[0] - 1.4, s[1] - 1.4, s[0] + 1.4, s[1] + 1.4, 4.6, 'prop');
    }
    // Torbögen
    for (let k = 0; k < 8; k++) { const s = spot(5); if (!s) continue; const a = new T.Mesh(new T.TorusGeometry(4, 0.6, 10, 24, Math.PI), new T.MeshLambertMaterial({ color: PASTEL[(k + 2) % PASTEL.length] })); a.position.set(s[0], 0, s[1]); a.rotation.y = rnd() * 6.28; props.add(a); }
    // Treppen ins Nichts
    for (let k = 0; k < 7; k++) { const s = spot(5); if (!s) continue; const st2 = new T.Group(); st2.position.set(s[0], 0, s[1]); st2.rotation.y = rnd() * 6.28; props.add(st2); for (let i = 0; i < 12; i++) box(i % 2 ? '#ffffff' : PASTEL[k % PASTEL.length], 3, 0.5, 1, 0, i * 0.5, i * 1, st2); }
    // kleine Pools (Fliesen + glattes hellblaues Wasser)
    for (let k = 0; k < 6; k++) { const s = spot(8); if (!s) continue; const tx = checker('#ffffff', '#d8eeff'); tx.repeat.set(4, 4); const rim = new T.Mesh(new T.BoxGeometry(14, 0.5, 9), new T.MeshLambertMaterial({ map: tx })); rim.position.set(s[0], 0.25, s[1]); props.add(rim); const w = new T.Mesh(new T.PlaneGeometry(12, 7), new T.MeshPhongMaterial({ color: 0x9ae0ff, shininess: 120, transparent: true, opacity: 0.85 })); w.rotation.x = -Math.PI / 2; w.position.set(s[0], 0.52, s[1]); props.add(w); }
    // ---------- riesige Augen am Himmel ----------
    for (let k = 0; k < 5; k++) {
      const e = new T.Group(), a = k / 5 * 6.28 + 0.4, d = 2200;
      e.position.set(I.x + Math.sin(a) * d, 350 + (k % 3) * 160, I.z + Math.cos(a) * d);
      const white = new T.Mesh(new T.SphereGeometry(140, 32, 20), new T.MeshBasicMaterial({ color: 0xffffff, fog: false })); white.scale.set(1.6, 1, 0.5); e.add(white);
      const iris = new T.Mesh(new T.CircleGeometry(70, 32), new T.MeshBasicMaterial({ color: new T.Color(['#7ab8ff', '#b07aff', '#ff8ac0', '#7affd0', '#ffd07a'][k]), fog: false })); iris.position.z = 72; e.add(iris);
      const pupil = new T.Mesh(new T.CircleGeometry(32, 24), new T.MeshBasicMaterial({ color: 0x111111, fog: false })); pupil.position.z = 73; e.add(pupil);
      const shine = new T.Mesh(new T.CircleGeometry(12, 12), new T.MeshBasicMaterial({ color: 0xffffff, fog: false })); shine.position.set(20, 22, 74); e.add(shine);
      const lid = new T.Mesh(new T.SphereGeometry(142, 32, 20, 0, Math.PI * 2, 0, Math.PI / 2), new T.MeshBasicMaterial({ color: 0xffc8e0, fog: false })); lid.scale.set(1.62, 1.02, 0.52); lid.rotation.x = -Math.PI / 2 + 0.2; e.add(lid);
      e.traverse((o) => { o.frustumCulled = false; }); g.add(e); eyes.push({ e, lid, blink: 2 + Math.random() * 6 });
    }
  }
  // Licht, Himmel und Bewegung jedes Bild
  const oue = L.updateEnv;
  L.updateEnv = function (dt, cam, focus, paused) {
    oue(dt, cam, focus, paused);
    const I = (L.ISL || []).find((q) => q.id === 'dim');
    if (I && I.built && !done) build(I);
    const on = !!(cam && inDream(cam.position.x));
    if (sky) sky.visible = on;
    if (!on || !done) return;
    const E = L.env;
    sky.position.copy(cam.position);
    L.scene.background.set('#f8d8ec'); L.scene.fog.color.set('#ffd8ec'); L.scene.fog.near = 120; L.scene.fog.far = 1600;
    if (E.stars) E.stars.material.opacity = 0;
    E.hemi.intensity = 0.85; E.hemi.color.set('#ffe8f8'); E.hemi.groundColor.set('#c8d8ff');
    E.sun.intensity = 0.7; E.sun.color.set('#fff0f6');
    const t = performance.now() / 1000;
    for (const c of clouds) { c.s.position.x += c.sp * dt; if (c.s.position.x > I.x + 1700) c.s.position.x = I.x - 1700; }
    for (const q of eyes) {
      q.e.lookAt(cam.position);
      q.blink -= dt; const b = q.blink < 0 ? Math.min(1, -q.blink * 6) : 0; q.lid.rotation.x = -Math.PI / 2 + 0.2 + b * 1.4;
      if (q.blink < -0.35) q.blink = 3 + Math.random() * 7;
    }
  };
})();
