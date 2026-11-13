'use strict';
// Feuerwerk: nur über das Admin-Inventar zu bekommen (kein Loot). Der Admin kann es wegwerfen, dann können andere es aufheben.
// Sorten: Rakete, Goldregen, Herz, Ring, Batterie (12 Schuss) und Schrift-Rakete (eigener Text am Himmel).
// Im Mehrspieler sehen alle das Feuerwerk.
(function () {
  const L = window.L, T = THREE, P = L.player, I = L.ITEMS;
  const FW = {
    fw_rakete: { name: 'Feuerwerksrakete', icon: '🎆', fw: 'kugel' },
    fw_goldregen: { name: 'Goldregen', icon: '✨', fw: 'gold' },
    fw_herz: { name: 'Herz-Rakete', icon: '💖', fw: 'herz' },
    fw_ring: { name: 'Ring-Rakete', icon: '💫', fw: 'ring' },
    fw_batterie: { name: 'Feuerwerks-Batterie', icon: '🎇', fw: 'batterie' },
    fw_text: { name: 'Schrift-Rakete', icon: '🔤', fw: 'text' }
  };
  for (const [k, d] of Object.entries(FW)) I[k] = Object.assign({ slot: 'waffe', stack: 20, ammo: null, mag: 1, energy: true, rate: 0.8, noise: 60, range: 0, spread: 0, admin: true }, d);

  // ---------- Modelle ----------
  const obi = L.buildItem;
  L.buildItem = function (type, inHand) {
    const d = FW[type]; if (!d) return obi(type, inHand);
    const g = new T.Group(), col = { kugel: '#e03a5a', gold: '#d4af37', herz: '#ff5aa0', ring: '#5a8aff', batterie: '#c02a2a', text: '#8a3aff' }[d.fw];
    if (d.fw === 'batterie') {
      const b = new T.Mesh(L.GEO.box, L.mat(col)); b.scale.set(0.35, 0.25, 0.35); g.add(b);
      for (let i = 0; i < 9; i++) { const t = new T.Mesh(L.GEO.cyl, L.mat('#1a1a1a')); t.scale.set(0.035, 0.02, 0.035); t.position.set(((i % 3) - 1) * 0.1, 0.13, (Math.floor(i / 3) - 1) * 0.1); g.add(t); }
    } else {
      const b = new T.Mesh(L.GEO.cyl, L.mat(col)); b.scale.set(0.04, 0.3, 0.04); b.position.y = 0.05; g.add(b);
      const tip = new T.Mesh(L.GEO.cone, L.mat('#ffd040')); tip.scale.set(0.045, 0.09, 0.045); tip.position.y = 0.25; g.add(tip);
      const st = new T.Mesh(L.GEO.cyl, L.mat('#8a6a3a')); st.scale.set(0.008, 0.45, 0.008); st.position.set(0.05, -0.15, 0); g.add(st);
    }
    return g;
  };

  // ---------- Partikel-Explosionen ----------
  const bursts = [], rockets = [], texts = [];
  const PAL = [0xff3a5a, 0x3aff8a, 0x3aa0ff, 0xffd040, 0xff7a20, 0xc060ff, 0xffffff, 0x40e8ff];
  let spriteTex = null;
  function dotTex() {
    if (spriteTex) return spriteTex;
    const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d');
    const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,0.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 32, 32); spriteTex = new T.CanvasTexture(c); return spriteTex;
  }
  // dirs: Liste von Richtungen (Einheitsvektoren), cols: Farben je Punkt
  function burst(x, y, z, dirs, cols, o) {
    const n = dirs.length, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), c = new T.Color();
    for (let i = 0; i < n; i++) { pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z; c.setHex(cols[i % cols.length]); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('color', new T.BufferAttribute(col, 3));
    const mat = new T.PointsMaterial({ size: (o.size || 1.6) * 2.8, map: dotTex(), vertexColors: true, transparent: true, depthWrite: false, blending: T.AdditiveBlending, fog: false, sizeAttenuation: true });
    const pts = new T.Points(geo, mat); pts.frustumCulled = false; L.scene.add(pts);
    const vel = dirs.map((d) => d.clone().multiplyScalar(o.speed * (0.85 + Math.random() * 0.3)));
    bursts.push({ pts, geo, mat, vel, size0: mat.size, t: 0, life: o.life || 2.4, grav: o.grav === undefined ? 5 : o.grav, drag: o.drag || 1.6, twinkle: !!o.twinkle });
  }
  const rnd = (a, b) => a + Math.random() * (b - a);
  function sphereDirs(n) { const out = []; for (let i = 0; i < n; i++) { const u = rnd(-1, 1), a = rnd(0, 6.283), r = Math.sqrt(1 - u * u); out.push(new T.Vector3(r * Math.cos(a), u, r * Math.sin(a))); } return out; }
  // Form in einer senkrechten Ebene, die zum Betrachter zeigt
  function planeDirs(pts2d, cam) {
    const right = new T.Vector3(1, 0, 0).applyQuaternion(cam.quaternion), up = new T.Vector3(0, 1, 0);
    return pts2d.map(([a, b]) => right.clone().multiplyScalar(a).add(up.clone().multiplyScalar(b)));
  }
  function bang(x, y, z, big) {
    const d = Math.hypot(P.x - x, P.z - z), vol = Math.max(0.04, 0.35 - d / 900);
    setTimeout(() => { L.nz && L.nz({ dur: big ? 0.9 : 0.6, f: 180, type: 'lowpass', vol }); L.nz && L.nz({ dur: 1.2, f: 3000, type: 'highpass', vol: vol * 0.25 }); }, Math.min(1500, d * 2.9));
  }
  function explode(kind, x, y, z, seed, text) {
    const cam = L.camera, c1 = PAL[seed % PAL.length], c2 = PAL[(seed * 3 + 2) % PAL.length];
    if (kind === 'kugel') { burst(x, y, z, sphereDirs(220), [c1, c2, 0xffffff], { speed: 52, life: 2.6, twinkle: true }); }
    else if (kind === 'gold') { burst(x, y, z, sphereDirs(260), [0xffd040, 0xffb020, 0xfff0a0], { speed: 40, life: 4.4, grav: 9, drag: 1.2, size: 1.3, twinkle: true }); }
    else if (kind === 'herz') {
      const p = []; for (let i = 0; i < 160; i++) { const t = i / 160 * 6.283; p.push([16 * Math.pow(Math.sin(t), 3) / 17, (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 17]); }
      burst(x, y, z, planeDirs(p, cam), [0xff3a7a, 0xff8ab0], { speed: 46, life: 2.8, grav: 1.5, drag: 1.8 });
    } else if (kind === 'ring') {
      const p = []; for (let i = 0; i < 140; i++) { const a = i / 140 * 6.283; p.push([Math.cos(a), Math.sin(a)]); }
      burst(x, y, z, planeDirs(p, cam), [c1, 0xffffff], { speed: 48, life: 2.6, grav: 2 });
      burst(x, y, z, sphereDirs(60), [0xffffff], { speed: 16, life: 1.8, size: 1.0, twinkle: true });
    } else if (kind === 'text') skyText(x, y, z, text || '');
    if (L.env) { L.env.bolt = Math.max(L.env.bolt || 0, 0.25); }
    // heller Blitz in der Mitte (nicht bei der Schrift, sonst verdeckt er sie)
    if (kind !== 'text') { const fl = new T.Sprite(new T.SpriteMaterial({ map: dotTex(), color: c1, transparent: true, blending: T.AdditiveBlending, depthWrite: false, fog: false })); fl.position.set(x, y, z); fl.scale.setScalar(26); L.scene.add(fl); let k = 1; const iv = setInterval(() => { k -= 0.12; fl.material.opacity = Math.max(0, k); fl.scale.setScalar(26 + (1 - k) * 20); if (k <= 0) { clearInterval(iv); L.scene.remove(fl); fl.material.dispose(); } }, 40); }
    bang(x, y, z, kind === 'text');
  }
  // ---------- Text am Himmel: Punkte formen die Buchstaben ----------
  // o: { max, width (Meter), gentle (ohne Knall, langsam einblenden), gold, life } – mehrere Zeilen mit \n
  function skyText(x, y, z, text, o) {
    o = o || {};
    text = String(text).slice(0, o.max || 40); if (!text.trim()) text = '🎆';
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    const c = document.createElement('canvas'), g = c.getContext('2d'); const fs = 64, lh = Math.round(fs * 1.18);
    g.font = 'bold ' + fs + 'px Arial'; let mw = 0; for (const l of lines) mw = Math.max(mw, g.measureText(l).width);
    c.width = Math.min(2600, Math.ceil(mw) + 20); c.height = lines.length * lh + 24;
    g.font = 'bold ' + fs + 'px Arial'; g.fillStyle = '#fff'; g.textBaseline = 'middle'; g.textAlign = 'center';
    lines.forEach((l, i) => g.fillText(l, c.width / 2, 12 + lh * (i + 0.5)));
    const data = g.getImageData(0, 0, c.width, c.height).data, step = Math.max(3, Math.round(Math.sqrt(c.width * c.height / (o.gentle ? 4200 : 1800))));
    const pts = []; for (let yy = 0; yy < c.height; yy += step) for (let xx = 0; xx < c.width; xx += step) if (data[(yy * c.width + xx) * 4 + 3] > 128) pts.push([xx - c.width / 2, c.height / 2 - yy]);
    const scale = Math.min(0.35, (o.width || 70) / c.width);
    const n = pts.length, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), cc = new T.Color();
    for (let i = 0; i < n; i++) { if (o.gold) cc.setHex(i % 3 ? 0xffd870 : 0xffffff); else { cc.setHex(PAL[(i * 7) % PAL.length]); cc.lerp(new T.Color(1, 1, 1), 0.35); } col[i * 3] = cc.r; col[i * 3 + 1] = cc.g; col[i * 3 + 2] = cc.b; }
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('color', new T.BufferAttribute(col, 3));
    const mat = new T.PointsMaterial({ size: o.gentle ? 3.0 : 3.2, map: dotTex(), vertexColors: true, transparent: true, depthWrite: false, blending: T.AdditiveBlending, fog: false });
    const ptsM = new T.Points(geo, mat); ptsM.frustumCulled = false;
    const grp = new T.Group(); grp.position.set(x, y, z); grp.add(ptsM); L.scene.add(grp);
    const life = o.life || 7;
    texts.push({ grp, geo, mat, tgt: pts.map(([a, b]) => [a * scale, b * scale]), t: 0, life, fadeIn: o.gentle ? 2.2 : 0.6, gentle: !!o.gentle });
    if (!o.gentle) burst(x, y, z, sphereDirs(120), [0xffffff, 0xffd040], { speed: 30, life: 1.4, size: 1.2 });
  }
  L.fwSkyText = skyText;
  // ---------- Raketen-Aufstieg ----------
  // fliegt schräg nach vorne (fx/fz = Blickrichtung beim Abfeuern), damit man die Explosion vor sich sieht
  function launch(kind, x, z, y0, seed, text, net, fx, fz) {
    fx = +fx || 0; fz = +fz || 0;
    const h = 55 + (seed % 30), m = new T.Mesh(L.GEO.sph, new T.MeshBasicMaterial({ color: 0xffe0a0 })); m.scale.setScalar(0.25); m.position.set(x, y0 + 1, z); L.scene.add(m);
    rockets.push({ m, kind, x, z, x2: x + fx * h * 0.7, z2: z + fz * h * 0.7, y0: y0 + 1, top: y0 + h, t: 0, dur: 1.4 + (seed % 5) * 0.08, seed, text });
    const d = Math.hypot(P.x - x, P.z - z);
    if (d < 400 && L.tn) L.tn({ f: 700, fTo: 1900, dur: 1.3, type: 'sine', vol: Math.max(0.02, 0.09 - d / 5000) });
    if (!net && L.mp && L.mp.send && L.net && L.net.connected) L.mp.send({ t: 'fw', k: kind, x, z, y0, s: seed, txt: text || '', fx, fz });
  }
  L.fwRemote = function (m) {
    if (!m || L.state !== 'game') return;
    const kinds = ['kugel', 'gold', 'herz', 'ring', 'text', 'batterie'];
    if (!kinds.includes(m.k)) return;
    if (m.k === 'batterie') battery(+m.x, +m.z, +m.y0 || 0, +m.s || 1, true);
    else launch(m.k, +m.x, +m.z, +m.y0 || 0, (+m.s || 1) | 0, String(m.txt || '').slice(0, 40), true, L.clamp(+m.fx || 0, -1, 1), L.clamp(+m.fz || 0, -1, 1));
  };
  function battery(x, z, y0, seed, net) {
    const list = ['kugel', 'gold', 'ring', 'kugel', 'herz', 'kugel', 'gold', 'ring', 'kugel', 'gold', 'kugel', 'herz'];
    // kleine Kiste am Boden, die nacheinander 12 Schuss abfeuert
    const box = L.buildItem('fw_batterie'); box.scale.setScalar(3); box.position.set(x, y0, z); L.scene.add(box);
    list.forEach((k, i) => setTimeout(() => { if (L.state !== 'game') return; { const a = ((seed + i * 37) % 628) / 100; launch(k, x + rnd(-1, 1), z + rnd(-1, 1), y0, seed + i * 7, '', true, Math.sin(a) * 0.4, Math.cos(a) * 0.4); } L.fx('#ffd040', x, y0 + 0.8, z, 12, 4, { basic: true, size: 0.12, life: 0.5 }); }, 400 + i * 650));
    setTimeout(() => L.scene.remove(box), 400 + list.length * 650 + 3000);
    if (!net && L.mp && L.mp.send && L.net && L.net.connected) L.mp.send({ t: 'fw', k: 'batterie', x, z, y0, s: seed });
  }

  // ---------- Benutzen ----------
  function useOne(w) { w.count = (w.count || 1) - 1; if (w.count <= 0) { const i = P.hot.indexOf(w); if (i >= 0) P.hot[i] = null; } }
  let askEl = null;
  function askText(done) {
    if (!askEl) {
      askEl = document.createElement('div'); askEl.id = 'fwAsk';
      askEl.style.cssText = 'position:fixed;left:50%;top:40%;transform:translate(-50%,-50%);background:rgba(10,10,20,.92);border:2px solid #c060ff;border-radius:14px;padding:14px 16px;z-index:60;color:#fff;font-weight:700;text-align:center;width:min(420px,88vw)';
      askEl.innerHTML = '🔤 Was soll am Himmel stehen?<br><input maxlength="40" style="width:100%;box-sizing:border-box;margin:10px 0;padding:8px;font-size:17px;border-radius:8px;border:1px solid #c060ff;background:#111;color:#fff"><br><button class="btn primary" data-ok="1">🎆 Abfeuern</button> <button class="btn" data-no="1">Abbrechen</button>';
      document.body.appendChild(askEl);
    }
    const inp = askEl.querySelector('input'); inp.value = '';
    const close = (val) => { askEl.hidden = true; L.uiBlock = false; if (L.state === 'game' && L.lock) L.lock(); if (val !== null) done(val); };
    askEl.querySelector('[data-ok]').onclick = () => close(inp.value.trim());
    askEl.querySelector('[data-no]').onclick = () => close(null);
    inp.onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Enter') close(inp.value.trim()); else if (e.key === 'Escape') close(null); };
    askEl.hidden = false; L.uiBlock = true; if (L.unlock) L.unlock(); setTimeout(() => inp.focus(), 0);
  }
  function fwFire(w, d) {
    P.fireCd = d.rate;
    const fx = Math.sin(P.yaw), fz = Math.cos(P.yaw), x = P.x + fx * 1.5, z = P.z + fz * 1.5, y0 = P.y || 0, seed = (Math.random() * 1e6) | 0;
    if (d.fw === 'text') {
      askText((txt) => { if (!txt) { L.msg('Kein Text – nichts abgefeuert.', 1500); return; } if (!w.count || (P.hot.indexOf(w) < 0)) return; useOne(w); launch('text', x, z, y0, seed, txt, false, Math.sin(P.camYaw), Math.cos(P.camYaw)); L.msg('🎆 „' + txt + '“ fliegt in den Himmel!', 2500); });
      return true;
    }
    useOne(w);
    if (d.fw === 'batterie') { battery(x, z, y0, seed); L.msg('🎇 Batterie gezündet – Abstand halten!', 2500); }
    else launch(d.fw, x, z, y0, seed, '', false, Math.sin(P.camYaw), Math.cos(P.camYaw));
    L.fx('#ffd040', x, y0 + 0.5, z, 15, 3, { basic: true, size: 0.12, life: 0.5 });
    return true;
  }
  const owf = L.weaponFire;
  L.weaponFire = function (w, d) { if (d && d.fw) return fwFire(w, d); return owf ? owf(w, d) : false; };

  // ---------- jedes Bild ----------
  const tmp = new T.Vector3();
  L.updateFireworks = function (dt) {
    for (let i = rockets.length - 1; i >= 0; i--) {
      const r = rockets[i]; r.t += dt; const u = Math.min(1, r.t / r.dur), e = 1 - Math.pow(1 - u, 2);
      r.m.position.set(L.lerp(r.x, r.x2, e) + Math.sin(r.t * 9) * 0.3, L.lerp(r.y0, r.top, e), L.lerp(r.z, r.z2, e) + Math.cos(r.t * 7) * 0.3);
      if (Math.random() < dt * 60) L.fx('#ffc070', r.m.position.x, r.m.position.y - 0.3, r.m.position.z, 1, 0.3, { basic: true, size: 0.12, life: 0.6, g: -1 });
      if (u >= 1) { L.scene.remove(r.m); rockets.splice(i, 1); explode(r.kind, r.m.position.x, r.top, r.m.position.z, r.seed, r.text); }
    }
    for (let i = bursts.length - 1; i >= 0; i--) {
      const b = bursts[i]; b.t += dt; const p = b.geo.attributes.position.array, k = Math.exp(-b.drag * dt);
      for (let j = 0; j < b.vel.length; j++) { const v = b.vel[j]; v.multiplyScalar(k); v.y -= b.grav * dt; p[j * 3] += v.x * dt; p[j * 3 + 1] += v.y * dt; p[j * 3 + 2] += v.z * dt; }
      b.geo.attributes.position.needsUpdate = true;
      const f = b.t / b.life; b.mat.opacity = f < 0.7 ? 1 : Math.max(0, 1 - (f - 0.7) / 0.3);
      if (b.twinkle && f > 0.4) b.mat.size = b.size0 * (0.7 + Math.random() * 0.6);
      if (b.t >= b.life) { L.scene.remove(b.pts); b.geo.dispose(); b.mat.dispose(); bursts.splice(i, 1); }
    }
    for (let i = texts.length - 1; i >= 0; i--) {
      const s = texts[i]; s.t += dt; s.grp.quaternion.copy(L.camera.quaternion);
      const p = s.geo.attributes.position.array, u = Math.min(1, s.t / s.fadeIn), e = 1 - Math.pow(1 - u, 3), fall = Math.max(0, s.t - (s.life - 2)) * 1.5;
      for (let j = 0; j < s.tgt.length; j++) { p[j * 3] = s.tgt[j][0] * e; p[j * 3 + 1] = s.tgt[j][1] * e - fall * (0.5 + (j % 5) * 0.2); p[j * 3 + 2] = 0; }
      s.geo.attributes.position.needsUpdate = true;
      s.mat.opacity = s.t < s.life - 2 ? (s.gentle ? Math.min(1, s.t / s.fadeIn) * (0.9 + Math.random() * 0.1) : 0.85 + Math.random() * 0.15) : Math.max(0, 1 - (s.t - (s.life - 2)) / 2);
      if (s.t >= s.life) { L.scene.remove(s.grp); s.geo.dispose(); s.mat.dispose(); texts.splice(i, 1); }
    }
  };
  L._fw = { bursts, texts, rockets };
  L.fwLaunch = (kind, x, z, y0, seed, text, fx, fz) => launch(kind, x, z, y0, seed, text, true, fx, fz);
  L.fwBattery = (x, z, y0, seed) => battery(x, z, y0, seed, true);
  L.clearFireworks = function () {
    for (const r of rockets) L.scene.remove(r.m); rockets.length = 0;
    for (const b of bursts) { L.scene.remove(b.pts); b.geo.dispose(); } bursts.length = 0;
    for (const s of texts) { L.scene.remove(s.grp); s.geo.dispose(); } texts.length = 0;
  };
})();
