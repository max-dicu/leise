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

  // ---------- Kamera ----------
  const piv = new T.Vector3(), want = new T.Vector3(), look = new T.Vector3();
  function updateCamera(dt) {
    const v = P.vehicle;
    let dist, h, py = P.camPitch;
    if (v) {
      dist = v.t.kind === 'car' ? 7.5 : 5;
      piv.set(v.x, 1.6, v.z);
    } else {
      const ph = !P.alive ? 0.4 : P.stance === 'crawl' ? 0.6 : P.stance === 'crouch' ? 1.1 : 1.6;
      piv.set(P.x, P.y + ph, P.z);
      dist = P.aiming ? 2.1 : 4;
      if (!P.alive) { dist = 6 + Math.min(4, P.deathT * 2); py = 1.0; }
    }
    P.camDist = dist;
    const sy = Math.sin(P.camYaw), cy = Math.cos(P.camYaw), cp = Math.cos(py), sp = Math.sin(py);
    const side = v ? 0 : P.aiming ? 0.7 : 0.55;
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
      const hostKeepsRunning = L.net && L.net.role === 'host' && L.remote && L.remote.inRound && L.round && L.state !== 'game';
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
