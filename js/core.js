'use strict';
// Grundlagen: Hilfsfunktionen, Speicherstand, Eingabe, Sound und Musik
(function () {
  const L = window.L = {};

  // ---------- Hilfsfunktionen ----------
  L.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  L.lerp = (a, b, t) => a + (b - a) * t;
  L.rand = (a, b) => a + Math.random() * (b - a);
  L.randi = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
  L.pick = (a) => a[Math.floor(Math.random() * a.length)];
  L.dist = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
  L.angDiff = (a, b) => {
    let d = (b - a) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    return d;
  };
  L.$ = (id) => document.getElementById(id);
  L.mulberry = function (seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  function hash(x, z) {
    let h = (Math.imul(x | 0, 374761393) + Math.imul(z | 0, 668265263)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  L.noise2 = function (x, z) {
    const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
    const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
    const a = hash(xi, zi), b = hash(xi + 1, zi), c = hash(xi, zi + 1), d = hash(xi + 1, zi + 1);
    return L.lerp(L.lerp(a, b, u), L.lerp(c, d, u), v);
  };
  L.fbm = (x, z) => L.noise2(x, z) * 0.5 + L.noise2(x * 2.1, z * 2.1) * 0.3 + L.noise2(x * 4.3, z * 4.3) * 0.2;
  L.fmt = (s) => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

  // ---------- Speicherstand ----------
  const DEF = {
    monsterDiff: 'normal', npcDiff: 'normal', npcMode: 'gemischt', npcCount: 16,
    bossMin: 10, shadows: true, view: 700, sens: 1, music: 0.6, sfx: 0.9, players: 'solo'
  };
  let raw = null;
  try { raw = JSON.parse(localStorage.getItem('leise.save1') || 'null'); } catch (e) { raw = null; }
  L.save = { stash: [], safe: null, char: null, settings: {}, stats: { escapes: 0, deaths: 0 } };
  if (raw && typeof raw === 'object') Object.assign(L.save, raw);
  L.save.settings = Object.assign({}, DEF, L.save.settings || {});
  if (!Array.isArray(L.save.stash)) L.save.stash = [];
  L.persist = () => { try { localStorage.setItem('leise.save1', JSON.stringify(L.save)); } catch (e) { /* privater Modus */ } };
  L.S = () => L.save.settings;

  // ---------- Eingabe ----------
  L.keys = {};
  L.pressed = new Set();
  L.mouse = { dx: 0, dy: 0, left: false, right: false, click: false, wheel: 0 };
  L.locked = false;
  const typing = (e) => e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA');
  addEventListener('keydown', (e) => {
    if (typing(e)) return;
    if (!L.keys[e.code]) L.pressed.add(e.code);
    L.keys[e.code] = true;
    if (L.state === 'game' && ['Space', 'Tab', 'KeyF', 'ArrowUp', 'ArrowDown', 'KeyQ'].includes(e.code)) e.preventDefault();
  });
  addEventListener('keyup', (e) => { L.keys[e.code] = false; });
  addEventListener('blur', () => { L.keys = {}; L.mouse.left = L.mouse.right = false; });
  addEventListener('mousemove', (e) => { if (L.locked) { L.mouse.dx += e.movementX || 0; L.mouse.dy += e.movementY || 0; } });
  addEventListener('mousedown', (e) => {
    if (!L.locked) return;
    if (e.button === 0) { L.mouse.left = true; L.mouse.click = true; }
    if (e.button === 2) L.mouse.right = true;
  });
  addEventListener('mouseup', (e) => { if (e.button === 0) L.mouse.left = false; if (e.button === 2) L.mouse.right = false; });
  addEventListener('wheel', (e) => { if (L.locked) L.mouse.wheel += Math.sign(e.deltaY); }, { passive: true });
  addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('pointerlockchange', () => {
    L.locked = document.pointerLockElement === L.canvas;
    if (!L.locked) { L.mouse.left = L.mouse.right = false; if (L.onUnlock) L.onUnlock(); }
  });
  L.hit = (code) => { if (L.pressed.has(code)) { L.pressed.delete(code); return true; } return false; };
  L.endInputFrame = () => { L.pressed.clear(); L.mouse.dx = L.mouse.dy = 0; L.mouse.click = false; L.mouse.wheel = 0; };
  L.lock = () => { if (L.canvas && !L.locked) { try { const p = L.canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* ignorieren */ } } };
  L.unlock = () => { if (document.pointerLockElement) document.exitPointerLock(); };

  // ---------- Sound ----------
  const A = L.audio = { ctx: null };
  L.initAudio = function () {
    if (A.ctx) { if (A.ctx.state === 'suspended') A.ctx.resume(); return; }
    try { A.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { A.ctx = null; return; }
    const c = A.ctx;
    const comp = c.createDynamicsCompressor();
    comp.connect(c.destination);
    A.master = c.createGain(); A.master.connect(comp);
    A.sfx = c.createGain(); A.sfx.connect(A.master);
    A.mus = c.createGain(); A.mus.connect(A.master);
    A.musBus = c.createGain(); A.musBus.connect(A.mus);
    // Hall
    const len = c.sampleRate * 2.6, ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.8);
    }
    A.rev = c.createConvolver(); A.rev.buffer = ir;
    const rg = c.createGain(); rg.gain.value = 0.32; A.rev.connect(rg); rg.connect(A.master);
    A.noise = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const nd = A.noise.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    L.applyVolumes();
    L.engine.init();
    L.ambient.init();
  };
  L.applyVolumes = () => {
    if (!A.ctx) return;
    A.sfx.gain.value = L.S().sfx;
    A.mus.gain.value = L.S().music * 0.75;
  };
  function dest(pos) {
    if (!pos) return A.sfx;
    const p = A.ctx.createPanner();
    p.panningModel = 'equalpower'; p.distanceModel = 'inverse';
    p.refDistance = 5; p.rolloffFactor = 1.1; p.maxDistance = 3000;
    if (p.positionX) { p.positionX.value = pos.x; p.positionY.value = pos.y || 1; p.positionZ.value = pos.z; }
    else p.setPosition(pos.x, pos.y || 1, pos.z);
    p.connect(A.sfx);
    return p;
  }
  L.setListener = function (cam) {
    if (!A.ctx) return;
    const l = A.ctx.listener, p = cam.position, f = L._lf || (L._lf = new THREE.Vector3());
    cam.getWorldDirection(f);
    if (l.positionX) {
      l.positionX.value = p.x; l.positionY.value = p.y; l.positionZ.value = p.z;
      l.forwardX.value = f.x; l.forwardY.value = f.y; l.forwardZ.value = f.z;
      l.upX.value = 0; l.upY.value = 1; l.upZ.value = 0;
    } else { l.setPosition(p.x, p.y, p.z); l.setOrientation(f.x, f.y, f.z, 0, 1, 0); }
  };
  // gefiltertes Rauschen (Schritte, Schüsse, Explosionen ...)
  L.nz = function (o) {
    if (!A.ctx) return;
    const c = A.ctx, t = c.currentTime + (o.delay || 0), dur = o.dur || 0.1;
    const s = c.createBufferSource(); s.buffer = A.noise; s.playbackRate.value = o.rate || 1;
    const f = c.createBiquadFilter(); f.type = o.type || 'lowpass';
    f.frequency.setValueAtTime(o.f || 1000, t);
    if (o.fTo) f.frequency.exponentialRampToValueAtTime(o.fTo, t + dur);
    f.Q.value = o.q || 0.8;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, o.vol || 0.3), t + (o.at || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest(o.pos));
    if (o.rev) g.connect(A.rev);
    s.start(t, Math.random() * 1.2, dur + 0.1);
  };
  // Ton (Oszillator)
  L.tn = function (o) {
    if (!A.ctx) return;
    const c = A.ctx, t = c.currentTime + (o.delay || 0), dur = o.dur || 0.2;
    const os = c.createOscillator(); os.type = o.type || 'sine';
    os.frequency.setValueAtTime(o.f, t);
    if (o.fTo) os.frequency.exponentialRampToValueAtTime(o.fTo, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, o.vol || 0.2), t + (o.at || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    os.connect(g); g.connect(dest(o.pos));
    if (o.rev) g.connect(A.rev);
    os.start(t); os.stop(t + dur + 0.05);
  };

  L.snd = {
    step(pos, vol, road) { L.nz({ dur: 0.08, f: road ? 1500 : 650, type: 'bandpass', q: 1, vol, pos }); },
    land(pos) { L.nz({ dur: 0.16, f: 380, vol: 0.4, pos }); },
    swing() { L.nz({ dur: 0.2, f: 1200, fTo: 300, type: 'bandpass', vol: 0.12 }); },
    hammerHit(pos) { L.nz({ dur: 0.12, f: 320, vol: 0.6, pos }); L.tn({ f: 170, fTo: 60, dur: 0.15, type: 'square', vol: 0.12, pos }); },
    gun(kind, pos) {
      const big = kind === 'gewehr' || kind === 'schrotflinte';
      L.nz({ dur: big ? 0.55 : 0.32, f: big ? 1800 : 2600, fTo: 180, vol: kind === 'minipistole' ? 0.4 : 0.85, pos, rev: true, at: 0.002 });
      L.tn({ f: big ? 85 : 140, fTo: 40, dur: 0.22, vol: 0.5, pos });
    },
    empty() { L.tn({ f: 1900, dur: 0.04, type: 'square', vol: 0.06 }); },
    reload() { L.nz({ dur: 0.06, f: 3000, type: 'highpass', vol: 0.2 }); L.nz({ dur: 0.07, f: 2400, type: 'highpass', vol: 0.22, delay: 0.9 }); },
    explosion(pos) { L.nz({ dur: 2.2, f: 1000, fTo: 70, vol: 1, pos, at: 0.01, rev: true }); L.tn({ f: 70, fTo: 22, dur: 1.4, vol: 0.9, pos }); },
    pickup() { L.tn({ f: 660, dur: 0.08, type: 'triangle', vol: 0.12 }); L.tn({ f: 990, dur: 0.12, type: 'triangle', vol: 0.1, delay: 0.06 }); },
    eat() { for (let i = 0; i < 4; i++) L.nz({ dur: 0.07, f: 1300, type: 'bandpass', vol: 0.14, delay: i * 0.2 }); },
    drink() { for (let i = 0; i < 4; i++) L.tn({ f: 320 + i * 40, fTo: 200, dur: 0.12, vol: 0.09, delay: i * 0.22 }); },
    heal() { L.nz({ dur: 0.5, f: 4000, type: 'highpass', vol: 0.1 }); },
    hurt() { L.nz({ dur: 0.25, f: 600, vol: 0.4 }); L.tn({ f: 230, fTo: 120, dur: 0.3, type: 'sawtooth', vol: 0.1 }); },
    splat(pos) { L.nz({ dur: 0.35, f: 500, fTo: 140, vol: 0.5, pos }); },
    viktor(pos) {
      L.tn({ f: 185, fTo: 85, dur: 1.2, type: 'sawtooth', vol: 0.22, pos, at: 0.15 });
      L.tn({ f: 191, fTo: 90, dur: 1.2, type: 'sawtooth', vol: 0.18, pos, at: 0.15 });
      L.nz({ dur: 1.1, f: 900, type: 'bandpass', q: 3, vol: 0.22, pos, at: 0.2 });
    },
    click(pos) { for (let i = 0; i < 3; i++) L.nz({ dur: 0.03, f: 3600, type: 'bandpass', q: 4, vol: 0.2, pos, delay: i * 0.09 }); },
    daniel(pos) {
      L.tn({ f: 82, fTo: 48, dur: 1.5, type: 'sawtooth', vol: 0.42, pos, at: 0.05 });
      L.tn({ f: 123, fTo: 70, dur: 1.5, type: 'sawtooth', vol: 0.28, pos });
      L.nz({ dur: 1.4, f: 420, vol: 0.3, pos });
    },
    heavy(pos, vol) { L.tn({ f: 55, fTo: 28, dur: 0.32, vol: vol || 0.5, pos }); L.nz({ dur: 0.26, f: 150, vol: (vol || 0.5) * 0.8, pos }); },
    horn(pos) { // eigener Stelzer-Ruf: langes, fallendes Metall-Heulen
      [104, 105.7, 156].forEach((f) => L.tn({ f, fTo: f * 0.78, dur: 3.4, type: 'sawtooth', vol: 0.2, pos, at: 0.7, rev: true }));
      L.nz({ dur: 3, f: 300, type: 'bandpass', q: 6, vol: 0.12, pos, at: 0.8 });
    },
    charge(pos) { L.tn({ f: 200, fTo: 1600, dur: 1.2, type: 'sawtooth', vol: 0.14, pos, at: 0.3 }); },
    ray(pos) { L.tn({ f: 900, fTo: 1300, dur: 0.35, type: 'sawtooth', vol: 0.14, pos }); L.nz({ dur: 0.35, f: 3200, type: 'highpass', vol: 0.18, pos }); },
    stomp(pos) { L.tn({ f: 42, fTo: 18, dur: 1.3, vol: 1, pos }); L.nz({ dur: 1.1, f: 220, fTo: 60, vol: 0.9, pos, rev: true }); },
    bossRoar(pos) {
      [62, 93, 124].forEach((f) => L.tn({ f, fTo: f * 0.6, dur: 3, type: 'sawtooth', vol: 0.35, pos, at: 0.2, rev: true }));
      L.nz({ dur: 2.8, f: 600, type: 'bandpass', q: 1.5, vol: 0.5, pos, at: 0.3 });
    },
    crash(i, pos) {
      L.nz({ dur: 0.6 + i * 0.7, f: 1600, fTo: 180, vol: 0.4 + i * 0.6, pos, at: 0.002 });
      L.tn({ f: 90, fTo: 38, dur: 0.45, vol: 0.25 + i * 0.5, pos });
      L.snd.glass(pos, i);
    },
    glass(pos, i) { for (let k = 0; k < 6; k++) L.tn({ f: 2000 + Math.random() * 3500, dur: 0.15 + Math.random() * 0.25, type: 'triangle', vol: 0.03 + 0.05 * i, pos, delay: Math.random() * 0.18 }); },
    belt(on) { L.nz({ dur: 0.05, f: 2600, type: 'highpass', vol: 0.25 }); L.tn({ f: on ? 1250 : 850, dur: 0.05, type: 'square', vol: 0.05, delay: 0.07 }); },
    beltWarn() { L.tn({ f: 1450, dur: 0.12, vol: 0.1 }); L.tn({ f: 1450, dur: 0.12, vol: 0.1, delay: 0.25 }); },
    hupe(pos) { L.tn({ f: 405, dur: 0.6, type: 'square', vol: 0.12, pos }); L.tn({ f: 508, dur: 0.6, type: 'square', vol: 0.1, pos }); },
    key() { L.tn({ f: 1200, dur: 0.06, type: 'square', vol: 0.07 }); },
    codeOk() { [800, 1000, 1300].forEach((f, i) => L.tn({ f, dur: 0.15, type: 'square', vol: 0.07, delay: i * 0.12 })); },
    codeBad() { L.tn({ f: 190, dur: 0.45, type: 'square', vol: 0.1 }); },
    alarm(pos) { L.tn({ f: 780, fTo: 1250, dur: 0.6, type: 'square', vol: 0.18, pos }); L.tn({ f: 1250, fTo: 780, dur: 0.6, type: 'square', vol: 0.18, pos, delay: 0.6 }); },
    radio(pos) { L.nz({ dur: 1.3, f: 2100, type: 'bandpass', q: 0.6, vol: 0.28, pos }); L.tn({ f: 1000, dur: 0.12, vol: 0.08, delay: 1.3, pos }); },
    rotor(pos) { L.nz({ dur: 0.07, f: 160, vol: 0.55, pos }); },
    thunder(delay) { L.nz({ dur: 3.4, f: 320, fTo: 55, vol: 0.75, delay, at: 0.06, rev: true }); },
    heart(vol) { L.tn({ f: 62, fTo: 40, dur: 0.15, vol }); L.tn({ f: 56, fTo: 38, dur: 0.15, vol: vol * 0.7, delay: 0.22 }); },
    scream(pos) { [410, 530, 620].forEach((f) => L.tn({ f, fTo: f * 0.55, dur: 0.9, type: 'sawtooth', vol: 0.1, pos })); },
    door() { L.nz({ dur: 1.6, f: 300, type: 'bandpass', q: 2, vol: 0.35 }); L.tn({ f: 60, dur: 1.6, type: 'sawtooth', vol: 0.06 }); },
    bird() { const f = 2400 + Math.random() * 1600; for (let i = 0; i < 3; i++) L.tn({ f, fTo: f * 1.3, dur: 0.07, vol: 0.025, delay: i * 0.11 }); },
    cricket() { for (let i = 0; i < 4; i++) L.tn({ f: 4300, dur: 0.03, type: 'square', vol: 0.008, delay: i * 0.05 }); }
  };

  // Motor (läuft dauerhaft, Lautstärke 0 wenn man nicht fährt)
  L.engine = {
    init() {
      const c = A.ctx;
      this.o1 = c.createOscillator(); this.o1.type = 'sawtooth';
      this.o2 = c.createOscillator(); this.o2.type = 'square';
      this.f = c.createBiquadFilter(); this.f.type = 'lowpass'; this.f.frequency.value = 600;
      this.g = c.createGain(); this.g.gain.value = 0;
      this.o1.connect(this.f); this.o2.connect(this.f); this.f.connect(this.g); this.g.connect(A.sfx);
      this.o1.start(); this.o2.start();
    },
    set(on, rpm, bike, electric) {
      if (!A.ctx || !this.g) return;
      const t = A.ctx.currentTime, base = electric ? 180 : bike ? 55 : 34, fq = base + rpm * (electric ? 700 : bike ? 150 : 95);
      this.g.gain.setTargetAtTime(on ? (electric ? 0.012 : 0.045) : 0, t, 0.1);
      this.o1.frequency.setTargetAtTime(fq, t, 0.05);
      this.o2.frequency.setTargetAtTime(fq * 0.5, t, 0.05);
      this.f.frequency.setTargetAtTime(350 + rpm * 1500, t, 0.05);
    }
  };
  // Wind und Regen als Dauerschleifen
  L.ambient = {
    init() {
      const c = A.ctx;
      const mk = (type, f, q) => {
        const s = c.createBufferSource(); s.buffer = A.noise; s.loop = true;
        const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
        const g = c.createGain(); g.gain.value = 0;
        s.connect(fl); fl.connect(g); g.connect(A.sfx); s.start();
        return g;
      };
      this.wind = mk('lowpass', 380, 0.7);
      this.rain = mk('bandpass', 2600, 0.4);
    },
    set(wind, rain) {
      if (!A.ctx || !this.wind) return;
      const t = A.ctx.currentTime;
      this.wind.gain.setTargetAtTime(wind, t, 0.5);
      this.rain.gain.setTargetAtTime(rain, t, 0.5);
    }
  };

  // ---------- Musik (wird live erzeugt und passt sich der Lage an) ----------
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  function mn(o) {
    const c = A.ctx, t = o.t, os = c.createOscillator();
    os.type = o.type || 'triangle';
    os.frequency.setValueAtTime(mtof(o.m), t);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.vol || 0.08, t + (o.at || 0.01));
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    let node = os;
    if (o.lp) {
      const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(o.lp, t);
      if (o.lpTo) f.frequency.exponentialRampToValueAtTime(o.lpTo, t + o.dur);
      os.connect(f); node = f;
    }
    node.connect(g); g.connect(A.musBus);
    if (o.rev) g.connect(A.rev);
    os.start(t); os.stop(t + o.dur + 0.05);
  }
  function drum(t, f0, f1, dur, vol, nf) {
    const c = A.ctx, os = c.createOscillator(), g = c.createGain();
    os.frequency.setValueAtTime(f0, t); os.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    os.connect(g); g.connect(A.musBus); os.start(t); os.stop(t + dur + 0.05);
    if (nf) {
      const s = c.createBufferSource(); s.buffer = A.noise;
      const fl = c.createBiquadFilter(); fl.type = nf > 3000 ? 'highpass' : 'bandpass'; fl.frequency.value = nf;
      const g2 = c.createGain(); g2.gain.setValueAtTime(vol * 0.6, t); g2.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.8);
      s.connect(fl); fl.connect(g2); g2.connect(A.musBus); s.start(t, Math.random(), dur);
    }
  }
  const CH = { Am: [57, 60, 64], F: [53, 57, 60], C: [48, 52, 55], G: [55, 59, 62], Dm: [50, 53, 57], E: [52, 56, 59], Em: [52, 55, 59] };
  const STY = {
    menu: { bpm: 64, play(t, s) {
      const ch = CH[['Am', 'F', 'C', 'G'][Math.floor(s / 8) % 4]];
      const pat = [0, 1, 2, 1, 0, 2, 1, 2];
      const n = ch[pat[s % 8]] + 12 + (s % 8 === 4 ? 12 : 0);
      mn({ t, m: n, dur: 1.8, vol: 0.06, type: 'triangle', rev: true });
      mn({ t, m: n + 12, dur: 0.7, vol: 0.012, type: 'sine' });
      if (s % 8 === 0) {
        ch.forEach((m) => mn({ t, m, dur: 4.4, vol: 0.02, type: 'sine', at: 0.9, rev: true }));
        mn({ t, m: ch[0] - 12, dur: 4, vol: 0.05, type: 'sine', at: 0.1 });
      }
    } },
    calm: { bpm: 52, play(t, s) {
      const sc = [57, 60, 62, 64, 67, 69, 72];
      if (s % 2 === 0 && Math.random() < 0.42) mn({ t, m: L.pick(sc) + 12, dur: 2.6, vol: 0.045, type: 'triangle', rev: true });
      if (s % 16 === 0) CH[['Am', 'F', 'C', 'Dm'][Math.floor(s / 16) % 4]].forEach((m) => mn({ t, m: m - 12, dur: 8.5, vol: 0.02, type: 'sine', at: 2, rev: true }));
    } },
    night: { bpm: 44, play(t, s) {
      if (s % 16 === 0) [45, 52].forEach((m) => mn({ t, m, dur: 9, vol: 0.035, type: 'sine', at: 3 }));
      if (Math.random() < 0.1) mn({ t, m: L.pick([76, 81, 84, 88]), dur: 3, vol: 0.022, type: 'sine', rev: true });
    } },
    tension: { bpm: 76, play(t, s) {
      if (s % 2 === 0) mn({ t, m: 33, dur: 0.5, vol: 0.11, type: 'sawtooth', lp: 280 });
      if (s % 8 === 0) mn({ t, m: L.pick([70, 71, 75]), dur: 2, vol: 0.025, type: 'sawtooth', lp: 1500, rev: true });
      if (s % 16 === 0) [45, 46].forEach((m) => mn({ t, m, dur: 5, vol: 0.025, type: 'sawtooth', lp: 500, at: 1 }));
    } },
    chase: { bpm: 152, play(t, s) {
      const b = [33, 33, 36, 33, 34, 33, 40, 33];
      mn({ t, m: b[s % 8], dur: 0.18, vol: 0.13, type: 'sawtooth', lp: 900, lpTo: 200 });
      if (s % 2 === 0) drum(t, 120, 40, 0.25, 0.45);
      if (s % 4 === 2) drum(t, 200, 150, 0.15, 0.18, 1800);
      drum(t, 8000, 7000, 0.04, 0.03, 7000);
      if (s % 16 === 0) mn({ t, m: L.pick([69, 70, 72]), dur: 1.2, vol: 0.035, type: 'square', lp: 2000 });
    } },
    boss: { bpm: 96, play(t, s) {
      if (s % 4 === 0) drum(t, 72, 32, 0.7, 0.8, 300);
      if (s % 8 === 6 || s % 8 === 7) drum(t, 110, 60, 0.3, 0.35, 500);
      if (s % 16 === 0) {
        CH.Dm.forEach((m) => mn({ t, m: m - 12, dur: 1.9, vol: 0.06, type: 'sawtooth', lp: 2600, lpTo: 380 }));
        mn({ t, m: 26, dur: 3.2, vol: 0.14, type: 'sawtooth', lp: 300 });
      }
      if (s % 16 === 8) CH.E.forEach((m) => mn({ t, m: m - 12, dur: 1.6, vol: 0.05, type: 'sawtooth', lp: 2200, lpTo: 400 }));
    } }
  };
  L.music = {
    state: null, next: 0, step: 0,
    set(st) {
      if (st === this.state) return;
      this.state = st; this.step = 0;
      if (!A.ctx) return;
      const t = A.ctx.currentTime, g = A.musBus.gain;
      g.cancelScheduledValues(t); g.setValueAtTime(g.value, t);
      g.linearRampToValueAtTime(0.0001, t + 0.6); g.linearRampToValueAtTime(1, t + 2);
      this.next = t + 0.7;
    },
    update() {
      if (!A.ctx || !this.state || !STY[this.state]) return;
      const c = A.ctx, sty = STY[this.state];
      if (this.next < c.currentTime) this.next = c.currentTime + 0.05;
      while (this.next < c.currentTime + 0.3) {
        sty.play(this.next, this.step);
        this.next += 60 / sty.bpm / 2;
        this.step++;
      }
    }
  };
})();
