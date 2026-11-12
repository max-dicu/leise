'use strict';
// Start: Renderer, Szene, Kamera und Hauptschleife
(function () {
  const L = window.L;
  if (typeof THREE === 'undefined' || !L.buildWorld) {
    const t = document.getElementById('loadText');
    if (t) t.textContent = 'Die 3D-Bibliothek konnte nicht geladen werden. Bitte Internetverbindung prüfen und neu laden.';
    return;
  }
  const T = THREE, P = L.player;
  const canvas = L.$('c');
  L.canvas = canvas;
  const renderer = new T.WebGLRenderer({ canvas, antialias: !L.isTouch, powerPreference: 'high-performance' });
  // am Handy mit geringerer Auflösung rendern, damit es flüssig läuft
  renderer.setPixelRatio(L.isTouch ? Math.min(window.devicePixelRatio || 1, 1) : Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  L.renderer = renderer;
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(70, 1, 0.1, 3200);
  L.camera = camera;
  function resize() {
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize); resize();
  L.state = 'loading';

  // Welt bauen, nachdem der Ladebildschirm angezeigt wurde
  setTimeout(() => {
    try {
      L.buildWorld(scene);
      L.initEnv(scene);
      L.initFx();
      L.ui.toMenu();
      L.$('loading').hidden = true;
    } catch (e) {
      console.error(e);
      L.$('loadText').textContent = 'Fehler beim Laden: ' + e.message;
    }
    requestAnimationFrame(frame);
  }, 60);

  // ---------- Zoom (Mausrad / I und O / Handy-Knopf): von Ego-Sicht bis weit weg ----------
  P.zoom = typeof L.save.zoom === 'number' ? L.save.zoom : 4;
  const ZOOM_STEPS = [4, 9, 15, 0, 2];
  function setZoom(z) {
    const nz = L.clamp(z, 0, 16);
    if ((nz < 0.5) !== (P.zoom < 0.5)) L.msg(nz < 0.5 ? '👁️ Ego-Sicht' : '🎥 Schulter-Kamera', 1200);
    P.zoom = nz; L.save.zoom = nz; L.persist();
  }
  L.cycleZoom = function () {
    let i = ZOOM_STEPS.findIndex((s) => Math.abs(s - P.zoom) < 0.3);
    setZoom(ZOOM_STEPS[(i + 1) % ZOOM_STEPS.length]);
  };

  // ---------- Kurzfilm (Zwischensequenz): Kamera fährt selbst, Spieler ist kurz pausiert ----------
  L.cine = null;
  const cineEl = document.createElement('div');
  cineEl.id = 'cine'; cineEl.hidden = true;
  cineEl.innerHTML = '<div class="bar top"></div><div class="bar bot"><span id="cineT"></span><small>Leertaste / Tippen = überspringen</small></div>';
  document.body.appendChild(cineEl);
  const cst = document.createElement('style');
  cst.textContent = `#cine{position:fixed;inset:0;z-index:40;pointer-events:auto}
#cine .bar{position:absolute;left:0;right:0;height:13vh;background:#000;transition:transform .6s ease}
#cine .top{top:0;transform:translateY(-100%)}#cine .bot{bottom:0;transform:translateY(100%);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;color:#eee;font-family:inherit}
#cine.on .top,#cine.on .bot{transform:none}
#cine #cineT{font-size:clamp(16px,3.2vw,30px);font-weight:800;letter-spacing:.12em;color:#ff5a3a;text-shadow:0 0 12px #000}
#cine small{opacity:.6;font-size:12px}
body.cinema #hud,body.cinema #touch,body.cinema #banner{visibility:hidden}`;
  document.head.appendChild(cst);
  cineEl.addEventListener('pointerdown', () => { if (L.cine && L.cine.t > 1) L.cine.t = L.cine.dur; });
  // shot(t) gibt die Kamera zurück: { x, y, z, lx, ly, lz } oder null (dann endet der Film)
  L.startCine = function (title, dur, shot) {
    if (L.state !== 'game' || !P.alive) return;
    L.cine = { t: 0, dur, shot };
    L.$('cineT').textContent = title;
    cineEl.hidden = false; requestAnimationFrame(() => cineEl.classList.add('on'));
    document.body.classList.add('cinema');
  };
  function endCine() {
    L.cine = null; cineEl.classList.remove('on'); document.body.classList.remove('cinema');
    setTimeout(() => { if (!L.cine) cineEl.hidden = true; }, 600);
  }
  L.endCine = endCine;
  const groundY = (x, z) => (L.mountainH ? L.mountainH(x, z) : 0);
  // MAMA IVA erscheint
  L.cineBossAppear = function (b) {
    const a0 = Math.atan2(P.x - b.x, P.z - b.z), berg = b.how === 'berg';
    const peak = groundY(b.x, b.z), FT = L.FUSION_T || 0;
    L.startCine('DIE MONSTER VERSCHMELZEN …', FT + 6.5, (t0) => {
      const B = L.boss; if (!B) return null;
      if (t0 < FT) {
        // Fusion von schräg unten
        const a = a0 + 0.3 + t0 * 0.08, d = 125 - t0 * 6, x = B.x + Math.sin(a) * d, z = B.z + Math.cos(a) * d;
        if (t0 > FT - 0.6) L.$('cineT').textContent = 'MAMA IVA';
        return { x, y: Math.max(groundY(x, z) + 30, peak + 45), z, lx: B.x, ly: peak + 30, lz: B.z };
      }
      const t = t0 - FT;
      const a = a0 + 0.45 - t * 0.06, d = (berg ? 105 : 95) - t * 4;
      const x = B.x + Math.sin(a) * d, z = B.z + Math.cos(a) * d;
      const y = Math.max(groundY(x, z) + 16, berg ? peak + 28 : 34 + t * 1.5);
      return { x, y, z, lx: B.x, ly: groundY(B.x, B.z) + (B.rootY || 0) + 40, lz: B.z };
    });
  };
  // GIGA-CAPY holt MAMA IVA
  L.cineCapy = function (b) {
    const c0 = b.capy; if (!c0) return;
    // von der Seite filmen, auf der Seite des Spielers
    let side = c0.yaw + Math.PI / 2;
    const px = Math.sin(side), pz = Math.cos(side);
    if ((P.x - c0.x) * px + (P.z - c0.z) * pz < 0) side += Math.PI;
    const R = c0.cam || [0.5, 0.5, 0.5, 0.5, 0.5], dir = R[0] < 0.5 ? -1 : 1;
    L.startCine('GIGA-CAPY GEGEN MAMA IVA', L.CAPY_TOTAL - 2, (t) => {
      const B = L.boss, c = B && B.capy; if (!c) return null;
      const mx = (c.x + B.x) / 2, mz = (c.z + B.z) / 2, gy = groundY(mx, mz);
      // jede Kampf-Aktion bekommt einen eigenen Kamerawinkel
      const seg = t < 7 ? 0 : Math.min(4, 1 + Math.floor((t - 7) / 2.6));
      const off = [0.25, -0.45, 0.55, -0.65, 0.35][seg] * (0.6 + R[seg] * 0.6) * dir;
      const a = side + off + dir * t * 0.03, d = [125, 95, 110, 85, 120][seg] - (t % 2.6) * 3;
      const x = mx + Math.sin(a) * d, z = mz + Math.cos(a) * d;
      const y = Math.max(groundY(x, z) + 14, gy + [34, 22, 40, 18, 30][seg] - Math.max(0, t - 17) * 2);
      const ly = gy + (t < 17 ? 32 : 32 - (t - 17) * 5);
      return { x, y, z, lx: mx, ly, lz: mz };
    });
  };
  function cineCamera(dt) {
    const C = L.cine;
    C.t += dt;
    if (C.t > 1 && (L.hit('Space') || L.hit('Escape') || L.mouse.click)) C.t = C.dur;
    const s = C.t < C.dur && P.alive && L.state === 'game' ? C.shot(C.t) : null;
    if (!s) { endCine(); return false; }
    camera.position.set(s.x, s.y, s.z);
    if (L.shake > 0) {
      const k = L.shake * 0.6;
      camera.position.x += (Math.random() - 0.5) * k; camera.position.y += (Math.random() - 0.5) * k; camera.position.z += (Math.random() - 0.5) * k;
      L.shake = Math.max(0, L.shake - dt * 1.8);
    }
    camera.lookAt(s.lx, s.ly, s.lz);
    camera.far = L.S().view + 1200;
    camera.updateProjectionMatrix();
    if (P.rig) P.rig.root.visible = true;
    return true;
  }

  // ---------- Kamera ----------
  const piv = new T.Vector3(), want = new T.Vector3(), look = new T.Vector3();
  function updateCamera(dt) {
    if (L.cine && cineCamera(dt)) return;
    if (!L.uiBlock) {
      if (L.mouse.wheel) setZoom(P.zoom + L.mouse.wheel * (P.zoom < 3 ? 0.7 : 1.3));
      if (L.hit('KeyI')) setZoom(P.zoom < 3 ? P.zoom - 1 : P.zoom - 2);
      if (L.hit('KeyO')) setZoom(P.zoom < 2 ? P.zoom + 1 : P.zoom + 2);
    }
    const v = P.vehicle;
    let fp = false;
    let dist, h, py = P.camPitch;
    if (v) {
      dist = (v.t.kind === 'car' ? 7.5 : 5) * L.clamp(P.zoom / 4, 0.45, 3);
      piv.set(v.x, 1.6 + (v.alt || 0), v.z);
    } else {
      const ph = !P.alive ? 0.4 : P.stance === 'crawl' ? 0.6 : P.stance === 'crouch' ? 1.1 : 1.6;
      piv.set(P.x, P.y + ph, P.z);
      fp = P.alive && P.zoom < 0.5;
      dist = fp ? 0 : P.aiming ? Math.min(2.1, P.zoom) : P.zoom;
      if (fp) piv.y += 0.12;
      if (!P.alive) { dist = 6 + Math.min(4, P.deathT * 2); py = 1.0; }
    }
    P.camDist = dist;
    const sy = Math.sin(P.camYaw), cy = Math.cos(P.camYaw), cp = Math.cos(py), sp = Math.sin(py);
    const side = v || fp ? 0 : (P.aiming ? 0.7 : 0.55) * Math.min(1, dist / 2);
    if (P.rig && L.state === 'game') P.rig.root.visible = !fp;
    const rx = -cy, rz = sy;
    piv.x += rx * side; piv.z += rz * side;
    want.set(piv.x - sy * cp * dist, piv.y + sp * dist, piv.z - cy * cp * dist);
    // nicht durch Wände schauen
    let ok = 1;
    for (let i = 1; i <= 12; i++) {
      const t = i / 12;
      if (L.blockedAt(L.lerp(piv.x, want.x, t), L.lerp(piv.y, want.y, t), L.lerp(piv.z, want.z, t))) { ok = (i - 1) / 12; break; }
    }
    camera.position.lerpVectors(piv, want, Math.max(0.12, ok));
    if (camera.position.y < 0.3) camera.position.y = 0.3;
    look.set(piv.x + sy * cp * 20, piv.y - sp * 20, piv.z + cy * cp * 20);
    if (L.shake > 0) {
      const s = L.shake * 0.25;
      camera.position.x += (Math.random() - 0.5) * s; camera.position.y += (Math.random() - 0.5) * s; camera.position.z += (Math.random() - 0.5) * s;
      L.shake = Math.max(0, L.shake - dt * 1.8);
    }
    camera.lookAt(look);
    camera.far = L.S().view + 1200;
    camera.updateProjectionMatrix();
  }
  L.updateCamera = updateCamera;
  const focus = { x: 0, z: 0 };
  function menuCamera(t, cx, cz) {
    const a = t * 0.04;
    camera.position.set(cx + Math.sin(a) * 260, 95, cz + Math.cos(a) * 260);
    camera.lookAt(cx, 20, cz);
    focus.x = cx; focus.z = cz;
  }

  // ---------- Hauptschleife ----------
  let last = performance.now(), t = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    try {
      const client = L.net && L.net.role === 'client';
      // Host: Welt läuft weiter, solange der Freund noch in der Runde ist
      const hostKeepsRunning = L.net && L.net.role === 'host' && L.mp.anyInRound() && L.round && L.state !== 'game';
      if (L.state === 'game' && !L.paused) {
        t += dt;
        L.updateGame(dt, t);
        updateCamera(dt);
        L.updateEnv(dt, camera, P, client);
        L.ui.hud(dt);
      } else if (L.state === 'game') {
        L.updateEnv(0, camera, P, true);
      } else if (L.state === 'end') {
        t += dt; menuCamera(t, P.x, P.z);
        if (hostKeepsRunning) L.updateGame(dt, t);
        L.updateEnv(dt, camera, focus, client);
        L.updateMenuFx(dt);
      } else {
        t += dt; menuCamera(t, 0, 0);
        if (hostKeepsRunning) L.updateGame(dt, t);
        L.updateEnv(dt * 6, camera, focus, false);
        L.updateMenuFx(dt);
      }
      for (const f of L.animated) f(t);
      L.music.update();
      L.setListener(camera);
      renderer.render(scene, camera);
    } catch (e) {
      console.error(e);
    }
    L.endInputFrame();
  }
})();
