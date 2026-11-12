'use strict';
// Handy-Steuerung: Joystick links, Umsehen durch Wischen rechts, Knöpfe für alle Aktionen
(function () {
  const L = window.L, $ = L.$;
  const isTouch = /[?&]touch/.test(location.search) || matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
  L.isTouch = isTouch;
  if (!isTouch) return;
  document.body.classList.add('touch');
  // beim ersten Start am Handy: schnellere Grafik
  if (!L.save.mobileTuned) { const S = L.S(); S.shadows = false; S.view = 400; L.save.mobileTuned = true; L.persist(); }
  const P = L.player;

  const root = document.createElement('div');
  root.id = 'touch'; root.hidden = true;
  root.innerHTML = `
    <div id="tLook"></div>
    <div id="tJoy"><div id="tKnob"></div></div>
    <div class="tgrp" id="tTop">
      <button data-k="Tab" title="Inventar">🎒</button><button data-k="KeyM" title="Karte">🗺️</button><button data-act="chat" id="tChat" title="Chat">💬</button><button data-act="pause" title="Pause">☰</button>
    </div>
    <div class="tgrp" id="tFoot">
      <button data-k="ShiftLeft" data-toggle="1" id="tRun" title="Rennen">🏃</button><button data-k="KeyC" title="Schleichen">🧎</button>
      <button data-k="KeyX" title="Kriechen">🐛</button><button data-k="KeyR" title="Nachladen">🔄</button>
      <button data-k="KeyG" title="Granate werfen">💣</button><button data-k="KeyQ" title="Verband">🩹</button>
      <button data-k="KeyL" title="Taschenlampe">🔦</button><button data-wheel="1" title="Nächster Platz (nach dem 5. = Hand leer)">⏭️</button><button data-act="zoom" title="Kamera: Ego-Sicht / nah / weit">🎥</button>
    </div>
    <div id="tAct">
      <button id="tFire" class="big" data-mouse="left" title="Benutzen / Angreifen">🔨</button>
      <button id="tJump" data-k="Space" title="Springen">⤴️</button>
      <button id="tAim" data-mouse="right" data-toggle="1" title="Zielen">🎯</button>
      <button id="tUse" data-k="KeyE" title="Aufheben / Benutzen">E</button>
      <button id="tVeh" data-k="KeyF" title="Einsteigen">🚗</button>
    </div>
    <div id="tCar" hidden>
      <button id="tZoomC" data-act="zoom" title="Kamera">🎥</button>
      <button id="tTele" data-k="KeyT" title="Teleport">🌀</button><button id="tWheel" data-k="ShiftLeft" title="Wheelie">🤸</button><button id="tCust" data-k="KeyK" title="Customizen">🔧</button><button id="tUp" data-k="KeyE" title="Steigen">⬆️</button><button id="tDown" data-k="KeyC" title="Sinken">⬇️</button>
      <button id="tBrake" class="big" data-k="Space" title="Handbremse / Driften">🛑</button>
      <button id="tBelt" data-k="KeyB" title="Anschnallen">🔒</button>
      <button id="tHorn" data-k="KeyH" title="Hupe">📯</button>
      <button id="tExit" data-k="KeyF" title="Aussteigen">🚪</button>
    </div>
    <div id="rotateHint">📱 ↻<br>Bitte das Handy quer halten</div>`;
  document.body.appendChild(root);

  // ---------- Knöpfe ----------
  const fireKey = (code, key) => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code, key: key || code, bubbles: true }));
    window.dispatchEvent(new KeyboardEvent('keyup', { code, key: key || code, bubbles: true }));
  };
  function press(b) {
    L.initAudio();
    const k = b.dataset.k, mb = b.dataset.mouse, act = b.dataset.act;
    if (act === 'chat') { fireKey('Enter', 'Enter'); return null; }
    if (act === 'pause') { if (L.ui.pause) L.ui.pause(); return null; }
    if (act === 'zoom') { L.cycleZoom(); return null; }
    if (b.dataset.wheel) { P.sel = P.sel >= 4 ? -1 : P.sel + 1; return null; }
    if (k === 'Tab' || k === 'KeyM') { fireKey(k); return null; }
    if (b.dataset.toggle) {
      if (k) { L.keys[k] = !L.keys[k]; b.classList.toggle('on', !!L.keys[k]); }
      if (mb) { L.mouse[mb] = !L.mouse[mb]; b.classList.toggle('on', !!L.mouse[mb]); }
      return null;
    }
    b.classList.add('on');
    if (k) { L.keys[k] = true; L.pressed.add(k); return () => { L.keys[k] = false; b.classList.remove('on'); }; }
    if (mb === 'left') { L.mouse.left = true; L.mouse.click = true; return () => { L.mouse.left = false; b.classList.remove('on'); }; }
    return () => b.classList.remove('on');
  }
  const held = new Map();
  root.querySelectorAll('button').forEach((b) => {
    b.addEventListener('touchstart', (e) => {
      e.preventDefault(); e.stopPropagation();
      for (const t of e.changedTouches) { const rel = press(b); if (rel) held.set(t.identifier, rel); }
    }, { passive: false });
    const end = (e) => {
      e.preventDefault(); e.stopPropagation();
      for (const t of e.changedTouches) { const rel = held.get(t.identifier); if (rel) { rel(); held.delete(t.identifier); } }
    };
    b.addEventListener('touchend', end, { passive: false });
    b.addEventListener('touchcancel', end, { passive: false });
  });

  // ---------- Joystick (links) und Umsehen (rechts) ----------
  const joy = $('tJoy'), knob = $('tKnob'), layer = $('tLook'), runBtn = $('tRun');
  let joyId = null, jx0 = 0, jy0 = 0, lookId = null, lx = 0, ly = 0;
  const R = 55;
  function setJoy(x, y) {
    knob.style.transform = `translate(${x * R}px, ${y * R}px)`;
    const th = 0.3;
    L.keys.KeyW = y < -th; L.keys.KeyS = y > th; L.keys.KeyA = x < -th; L.keys.KeyD = x > th;
    if (Math.hypot(x, y) < 0.15 && L.keys.ShiftLeft) { L.keys.ShiftLeft = false; runBtn.classList.remove('on'); }
  }
  function hotbarTap(x, y) {
    const hb = $('hotbar'); if (!hb) return false;
    const kids = hb.children;
    for (let i = 0; i < kids.length; i++) {
      const r = kids[i].getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) { L.selectSlot(i); return true; }
    }
    return false;
  }
  layer.addEventListener('touchstart', (e) => {
    e.preventDefault(); L.initAudio();
    for (const t of e.changedTouches) {
      if (hotbarTap(t.clientX, t.clientY)) continue;
      if (t.clientX < innerWidth * 0.42 && joyId === null) {
        joyId = t.identifier; jx0 = t.clientX; jy0 = t.clientY;
        joy.classList.add('act'); joy.style.left = (jx0 - 60) + 'px'; joy.style.top = (jy0 - 60) + 'px';
        setJoy(0, 0);
      } else if (lookId === null) { lookId = t.identifier; lx = t.clientX; ly = t.clientY; }
    }
  }, { passive: false });
  layer.addEventListener('touchmove', (e) => {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (t.identifier === joyId) {
        let dx = t.clientX - jx0, dy = t.clientY - jy0;
        const d = Math.hypot(dx, dy);
        if (d > R) { dx = dx / d * R; dy = dy / d * R; }
        setJoy(dx / R, dy / R);
      } else if (t.identifier === lookId) {
        L.mouse.dx += (t.clientX - lx) * 2.2; L.mouse.dy += (t.clientY - ly) * 2.2;
        lx = t.clientX; ly = t.clientY;
      }
    }
  }, { passive: false });
  const tend = (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier === joyId) { joyId = null; setJoy(0, 0); joy.classList.remove('act'); joy.style.left = ''; joy.style.top = ''; }
      if (t.identifier === lookId) lookId = null;
    }
  };
  layer.addEventListener('touchend', tend);
  layer.addEventListener('touchcancel', tend);

  // Fenster (Inventar, Karte, Tastenfeld) durch Tippen daneben schließen
  ['inv', 'mapPanel', 'keypad'].forEach((id) => $(id).addEventListener('click', (e) => { if (e.target === $(id)) L.ui.closeOverlays(); }));

  // Vollbild und Querformat beim Starten
  function fullscreen() {
    const d = document.documentElement;
    try { if (!document.fullscreenElement && d.requestFullscreen) d.requestFullscreen().catch(() => {}); } catch (e) { /* nicht unterstützt */ }
    try { if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {}); } catch (e) { /* nicht unterstützt */ }
  }
  ['btnPlay', 'btnMp', 'mpStart', 'stashGo'].forEach((id) => { const b = $(id); if (b) b.addEventListener('click', fullscreen); });

  // ---------- Anzeige je nach Lage ----------
  setInterval(() => {
    const ing = L.state === 'game' && !L.paused && !L.mpPause;
    root.hidden = !ing;
    document.body.classList.toggle('ingame', L.state === 'game');
    if (!ing) { if (joyId !== null) { joyId = null; setJoy(0, 0); } return; }
    const inV = !!P.vehicle;
    $('tCar').hidden = !inV; $('tAct').hidden = inV; $('tFoot').hidden = inV;
    $('tBelt').hidden = !inV || P.vehicle.t.kind !== 'car';
    $('tTele').hidden = !inV || !P.vehicle.t.teleport || P.seat > 0;
    $('tWheel').hidden = !inV || !P.vehicle.t.wheelie || P.seat > 0;
    $('tCust').hidden = !(L.wsHint && L.wsHint());
    $('tDown').hidden = !inV || !(P.vehicle.t.fly || P.vehicle.t.plane || P.vehicle.t.sub) || P.seat > 0;
    $('tUp').hidden = !inV || !(P.vehicle.t.fly || P.vehicle.t.plane || P.vehicle.t.sub) || P.seat > 0;
    $('tBrake').textContent = inV && P.vehicle.t.sub ? '🚀' : '🛑';
    $('tChat').hidden = !(L.net && L.net.connected);
    const it = L.selType ? L.selType() : null;
    $('tFire').textContent = it ? L.ITEMS[it].icon : '✋';
    $('tAim').hidden = !(it && L.ITEMS[it].slot === 'waffe');
    if ($('tAim').hidden && L.mouse.right) { L.mouse.right = false; $('tAim').classList.remove('on'); }
  }, 150);
})();
