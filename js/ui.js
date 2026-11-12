'use strict';
// Bedienoberfläche: HUD, Minimap, Karte, Inventar, Menüs, Charakter-Editor, Versteck, Einstellungen
(function () {
  const L = window.L, $ = L.$, T = THREE;
  const ui = L.ui = {};
  const P = L.player;
  const MAX_STASH = 40;

  // ---------- Meldungen ----------
  L.msg = function (text, ms) {
    const box = $('msgs'), d = document.createElement('div');
    d.textContent = text; box.appendChild(d);
    while (box.children.length > 5) box.firstChild.remove();
    setTimeout(() => d.remove(), ms || 3800);
  };
  let bannerTimer = 0;
  L.banner = function (t, s) {
    $('bannerT').textContent = t; $('bannerS').textContent = s || '';
    $('banner').classList.add('show');
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => $('banner').classList.remove('show'), 4800);
  };

  // ---------- Bildschirme ----------
  const SCREENS = ['menu', 'charScreen', 'stashScreen', 'settingsScreen', 'mpScreen', 'helpScreen', 'pauseScreen', 'endScreen', 'loading'];
  let backTo = 'menu';
  function show(id) { for (const s of SCREENS) $(s).hidden = s !== id; }
  ui.show = show;
  const OVERLAYS = ['inv', 'mapPanel', 'keypad', 'noteView'];
  const anyOverlay = () => OVERLAYS.some((o) => !$(o).hidden);
  function openOverlay(id) { for (const o of OVERLAYS) $(o).hidden = o !== id; L.uiBlock = true; L.unlock(); }
  function closeOverlays() { for (const o of OVERLAYS) $(o).hidden = true; L.uiBlock = false; if (L.state === 'game' && !L.paused) L.lock(); }
  ui.closeOverlays = closeOverlays;

  L.onUnlock = function () {
    if (L.state === 'game' && !L.paused && !L.mpPause && !L.chatOpen && !anyOverlay() && L.round && !L.round.over) pause();
  };
  const online = () => L.net && L.net.role !== 'solo' && L.net.connected;
  // Zu zweit läuft die Welt in der Pause weiter (der Freund spielt ja weiter)
  function pause() {
    if (online()) { L.mpPause = true; L.uiBlock = true; show('pauseScreen'); return; }
    L.paused = true; L.engine.set(false, 0); show('pauseScreen');
  }
  ui.pause = function () { if (L.state === 'game' && !L.paused && !L.mpPause) { ui.closeOverlays(); L.unlock(); pause(); } };
  function resume() {
    show(null);
    if (L.mpPause) { L.mpPause = false; L.uiBlock = false; L.lock(); return; }
    L.paused = false; L.lock();
  }

  // Tasten für Fenster direkt im Ereignis (nötig für Mauszeiger-Sperre)
  addEventListener('keydown', (e) => {
    if (L.state !== 'game' || L.paused) return;
    if (e.target && e.target.tagName === 'INPUT') return;
    if (!$('keypad').hidden) {
      if (/^Digit\d$/.test(e.code)) kpPress(e.code.slice(5));
      else if (e.code === 'Backspace') kpPress('⌫');
      else if (e.code === 'Enter') kpPress('OK');
      else if (e.code === 'Escape' || e.code === 'KeyE') closeOverlays();
      e.preventDefault();
      return;
    }
    if (!$('noteView').hidden && (e.code === 'KeyE' || e.code === 'Escape' || e.code === 'Space')) { closeOverlays(); L.pressed.delete('KeyE'); e.preventDefault(); return; }
    if (e.code === 'Tab') { e.preventDefault(); if (!$('inv').hidden) closeOverlays(); else if (P.alive) { openOverlay('inv'); invSel = null; renderInv(); } }
    if (e.code === 'KeyM') { if (!$('mapPanel').hidden) closeOverlays(); else { openOverlay('mapPanel'); drawBigMap(); } }
    if (e.code === 'Escape' && anyOverlay()) closeOverlays();
  });
  L.$('c').addEventListener('click', () => { if (L.state === 'game' && !L.paused && !anyOverlay()) { L.initAudio(); L.lock(); } });

  // ---------- Zettel und Tastenfeld ----------
  ui.showNote = function (text) { $('noteText').textContent = text; openOverlay('noteView'); };
  $('noteClose').onclick = closeOverlays;
  let kp = '';
  ui.openKeypad = function () { kp = ''; kpRender(); $('kpInfo').textContent = 'Bekannt: ' + L.round.code.map((c, i) => (L.round.found[i] ? c : '_')).join(' '); openOverlay('keypad'); };
  function kpRender() { $('kpDisplay').textContent = (kp + '____').slice(0, 4); }
  function kpPress(k) {
    L.snd.key();
    if (k === '⌫') kp = kp.slice(0, -1);
    else if (k === 'OK') {
      if (kp.length < 4) return;
      if (L.tryCode(kp)) { closeOverlays(); return; }
      $('kpInfo').textContent = '❌ Falscher Code – das war laut!'; kp = '';
    } else if (kp.length < 4) kp += k;
    kpRender();
  }
  for (const k of ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', 'OK']) {
    const b = document.createElement('button'); b.textContent = k; b.onclick = () => kpPress(k); $('kpKeys').appendChild(b);
  }

  // ---------- Inventar ----------
  let invSel = null;
  function slotEl(it, opts) {
    const d = document.createElement('div');
    d.className = 'slot' + (it ? '' : ' empty') + (opts && opts.sel ? ' sel' : '') + (opts && opts.on ? ' on' : '');
    if (it) {
      const def = L.ITEMS[it.type];
      d.innerHTML = `${def.icon}${it.count > 1 ? `<span class="n">×${it.count}</span>` : ''}${opts && opts.name !== false ? `<span class="nm">${def.name}</span>` : ''}`;
      d.title = def.name + (it.mag !== undefined && def.slot === 'waffe' ? ` (${it.mag}/${def.mag} im Magazin)` : '');
    } else d.textContent = opts && opts.label ? opts.label : 'leer';
    if (opts && opts.key) { const k = document.createElement('span'); k.className = 'k'; k.textContent = opts.key; d.appendChild(k); }
    if (opts && opts.onclick) d.onclick = opts.onclick;
    return d;
  }
  function renderInv() {
    const hot = $('invHot'), bag = $('invBag'), safe = $('invSafe');
    hot.innerHTML = ''; bag.innerHTML = ''; safe.innerHTML = '';
    // Klick auf Gegenstand = auswählen, danach Klick auf einen anderen Platz = dorthin legen (tauschen / stapeln)
    const clickSlot = (where, i) => {
      const arr = where === 'hot' ? P.hot : P.bag, it = arr[i];
      if (invSel && invSel.where !== 'safe' && !(invSel.where === where && invSel.key === i)) {
        const from = invSel.where === 'hot' ? P.hot : P.bag, a = from[invSel.key], d = L.ITEMS[a.type];
        if (it && it.type === a.type && d.stack && it.count < d.stack) { const k = Math.min(d.stack - it.count, a.count); it.count += k; a.count -= k; if (a.count <= 0) from[invSel.key] = null; }
        else { from[invSel.key] = it || null; arr[i] = a; }
        invSel = null; L.snd.key(); renderInv(); return;
      }
      invSel = it && !(invSel && invSel.where === where && invSel.key === i) ? { where, key: i } : null; renderInv();
    };
    P.hot.forEach((it, i) => hot.appendChild(slotEl(it, { key: i + 1, label: ' ', sel: invSel && invSel.where === 'hot' && invSel.key === i, onclick: () => clickSlot('hot', i) })));
    P.bag.forEach((it, i) => bag.appendChild(slotEl(it, { label: ' ', sel: invSel && invSel.where === 'bag' && invSel.key === i, onclick: () => clickSlot('bag', i) })));
    safe.appendChild(slotEl(P.safe, { label: 'Tresor', sel: invSel && invSel.where === 'safe', onclick: () => { if (P.safe) { invSel = { where: 'safe' }; renderInv(); } } }));
    renderInvActions();
  }
  function getSel() {
    if (!invSel) return null;
    if (invSel.where === 'hot') return P.hot[invSel.key];
    if (invSel.where === 'bag') return P.bag[invSel.key];
    return P.safe;
  }
  function setSel(v) {
    if (invSel.where === 'hot') P.hot[invSel.key] = v;
    else if (invSel.where === 'bag') P.bag[invSel.key] = v;
    else P.safe = v;
  }
  function renderInvActions() {
    const box = $('invActions'); box.innerHTML = '';
    const it = getSel();
    if (!it) { box.innerHTML = '<span class="small">Klick auf einen Gegenstand und dann auf einen anderen Platz, um ihn dorthin zu legen. In die Schnellleiste (1–5) passt alles. Neue Sachen landen im Rucksack.</span>'; return; }
    const d = L.ITEMS[it.type];
    const btn = (label, fn) => { const b = document.createElement('button'); b.className = 'btn'; b.textContent = label; b.onclick = () => { fn(); renderInv(); }; box.appendChild(b); };
    const info = document.createElement('span'); info.className = 'small';
    info.textContent = d.icon + ' ' + d.name + (d.slot === 'waffe' ? ` · Magazin ${it.mag}/${d.mag} · ${L.countBag(d.ammo)} Schuss im Rucksack` : '') + (d.food ? ` · +${d.food} Hunger` : '') + (d.water ? ` · +${d.water} Durst` : '') + (d.heal ? ` · +${d.heal} Leben` : '');
    box.appendChild(info);
    if (invSel.where === 'safe' || invSel.where === 'bag') btn('In die Schnellleiste', () => { const i = P.hot.findIndex((x) => !x); if (i < 0) { L.msg('Schnellleiste voll – klick auf einen Platz dort, um zu tauschen.'); return; } P.hot[i] = it; setSel(null); if (invSel.where === 'safe') { L.save.safe = null; L.persist(); } invSel = null; });
    if (d.food || d.water || d.heal) btn('Benutzen', () => { L.useConsumable(it); if (it.count <= 0) { setSel(null); invSel = null; } });
    if (invSel.where === 'hot') btn('In den Rucksack', () => { const i = P.bag.findIndex((x) => !x); if (i < 0) { L.msg('🎒 Rucksack voll!'); return; } P.bag[i] = it; setSel(null); invSel = null; });
    if (invSel.where !== 'safe') btn('🔒 In den Tresor', () => { const old = P.safe; P.safe = it; setSel(old || null); invSel = null; L.save.safe = Object.assign({}, P.safe); L.persist(); L.msg('🔒 ' + d.name + ' ist jetzt sicher – auch wenn du stirbst.'); });
    else btn('In den Rucksack', () => { const i = P.bag.findIndex((x) => !x); if (i < 0) { L.msg('🎒 Rucksack voll!'); return; } P.bag[i] = it; P.safe = null; invSel = null; L.save.safe = null; L.persist(); });
    const nf = L.mp.nearestFriend(6);
    if (nf) btn('🎁 ' + nf.name + ' geben', () => { L.mp.gift(it, nf.pid); setSel(null); if (invSel.where === 'safe') { L.save.safe = null; L.persist(); } invSel = null; });
    btn('Wegwerfen', () => { L.dropItem(it); setSel(null); if (invSel.where === 'safe') { L.save.safe = null; L.persist(); } invSel = null; });
  }

  // ---------- Minimap und Karte ----------
  const mm = $('minimap').getContext('2d');
  function arrow(g, x, y, yaw, size, color) {
    const a = Math.atan2(Math.cos(yaw), Math.sin(yaw));
    g.save(); g.translate(x, y); g.rotate(a);
    g.fillStyle = color; g.strokeStyle = '#000'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(size, 0); g.lineTo(-size * 0.7, size * 0.6); g.lineTo(-size * 0.4, 0); g.lineTo(-size * 0.7, -size * 0.6); g.closePath();
    g.fill(); g.stroke(); g.restore();
  }
  function drawMinimap() {
    const S = 200, view = 420, k = L.mapScale, src = view * k, g = mm;
    g.save(); g.clearRect(0, 0, S, S);
    g.beginPath(); g.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2); g.clip();
    g.fillStyle = '#111'; g.fillRect(0, 0, S, S);
    g.drawImage(L.mapCanvas, (P.x + L.HALF) * k - src / 2, (P.z + L.HALF) * k - src / 2, src, src, 0, 0, S, S);
    const toM = (x, z) => [S / 2 + (x - P.x) / view * S, S / 2 + (z - P.z) / view * S];
    g.font = '14px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (const p of L.POIS) { const [x, y] = toM(p.x, p.z); if (x > -10 && x < S + 10 && y > -10 && y < S + 10) g.fillText(p.icon, x, y); }
    g.fillStyle = '#ddd';
    for (const v of L.ents.vehicles) { const [x, y] = toM(v.x, v.z); if (x > 0 && x < S && y > 0 && y < S) g.fillRect(x - 2, y - 2, 4, 4); }
    for (const w of L.ents.walkers) { if (w.dead || L.dist(w.x, w.z, P.x, P.z) > 220) continue; const [x, y] = toM(w.x, w.z); g.fillStyle = '#ff5a2a'; g.beginPath(); g.arc(x, y, 5, 0, 6.28); g.fill(); }
    if (L.boss && !L.boss.dead) { const [x, y] = toM(L.clamp(L.boss.x, P.x - 200, P.x + 200), L.clamp(L.boss.z, P.z - 200, P.z + 200)); g.font = '20px sans-serif'; g.fillText('👹', x, y); }
    if (L.TOWER) { const big = L.boss && !L.boss.dead, [x, y] = toM(L.clamp(L.TOWER.x, P.x - 200, P.x + 200), L.clamp(L.TOWER.z, P.z - 200, P.z + 200)); g.font = (big ? 22 + Math.sin(performance.now() / 200) * 4 : 14) + 'px sans-serif'; g.fillText(L.towerSafe() ? '🗼' : '💥', x, y); }
    if (L.heli) { const [x, y] = toM(L.heli.x, L.heli.z); g.font = '16px sans-serif'; g.fillText('🚁', x, y); }
    for (const fr of L.remotes.values()) {
      if (!fr.inRound || fr.gone) continue;
      const [fx, fy] = toM(L.clamp(fr.x, P.x - 200, P.x + 200), L.clamp(fr.z, P.z - 200, P.z + 200));
      arrow(g, fx, fy, fr.yaw, 8, fr.alive ? L.mp.color(fr.pid) : '#777');
    }
    arrow(g, S / 2, S / 2, P.vehicle ? P.vehicle.yaw : P.camYaw, 9, '#ffe080');
    g.restore();
    g.fillStyle = '#fff'; g.font = 'bold 12px sans-serif'; g.fillText('N', S / 2, 9);
  }
  function drawBigMap() {
    const c = $('bigmap'), g = c.getContext('2d'), S = c.width, k = S / (L.HALF * 2);
    g.drawImage(L.mapCanvas, 0, 0, S, S);
    const toM = (x, z) => [(x + L.HALF) * k, (z + L.HALF) * k];
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (const p of L.POIS) {
      const [x, y] = toM(p.x, p.z);
      g.font = (p.sub ? 16 : 22) + 'px sans-serif'; g.fillText(p.icon, x, y);
      g.font = '12px Oswald, sans-serif'; g.fillStyle = '#000'; g.fillText(p.name, x + 1, y + 17); g.fillStyle = '#fff'; g.fillText(p.name, x, y + 16);
    }
    g.fillStyle = '#ccc';
    for (const v of L.ents.vehicles) { const [x, y] = toM(v.x, v.z); g.fillRect(x - 1.5, y - 1.5, 3, 3); }
    if (L.boss && !L.boss.dead) { const [x, y] = toM(L.boss.x, L.boss.z); g.font = '26px sans-serif'; g.fillText('👹', x, y); }
    if (L.TOWER) { const [x, y] = toM(L.TOWER.x, L.TOWER.z); g.font = '28px sans-serif'; g.fillText(L.towerSafe() ? '🗼' : '💥', x, y); g.font = 'bold 13px sans-serif'; g.fillStyle = L.towerSafe() ? '#7cf' : '#f66'; g.fillText(L.towerSafe() ? 'SICHERER TURM' : 'TURM ZERSTÖRT', x, y + 22); }
    if (L.heli) { const [x, y] = toM(L.heli.x, L.heli.z); g.font = '20px sans-serif'; g.fillText('🚁', x, y); }
    for (const fr of L.remotes.values()) {
      if (!fr.inRound || fr.gone) continue;
      const [fx, fy] = toM(fr.x, fr.z), col = L.mp.color(fr.pid);
      arrow(g, fx, fy, fr.yaw, 10, fr.alive ? col : '#777');
      g.font = 'bold 13px Oswald, sans-serif'; g.textAlign = 'center'; g.fillStyle = '#000'; g.fillText(fr.name, fx + 1, fy - 13); g.fillStyle = col; g.fillText(fr.name, fx, fy - 14);
    }
    const [px, py] = toM(P.x, P.z);
    arrow(g, px, py, P.vehicle ? P.vehicle.yaw : P.camYaw, 11, '#ffe080');
    g.font = '13px Oswald, sans-serif'; g.fillStyle = '#fff'; g.textAlign = 'left';
    g.fillText('Grau: Fahrzeuge · Norden ist oben · Die Karte ist 3 × 3 km groß', 10, S - 12);
  }

  // ---------- HUD ----------
  let hudT = 0;
  const MODE_TXT = { idle: '🧍 Stehen', walk: '🚶 Gehen', run: '🏃 Rennen', crouch: '🧎 Schleichen', crawl: '🐛 Kriechen' };
  ui.hud = function (dt) {
    hudT -= dt;
    const vig = $('dmgVig');
    vig.style.opacity = Math.min(0.95, P.hurtFlash * 0.8 + (P.hp < 30 && P.alive ? 0.25 + Math.sin(performance.now() / 300) * 0.12 : 0));
    $('bloodScreen').classList.toggle('show', !P.alive);
    if (hudT > 0) return;
    hudT = 0.08;
    const E = L.env, R = L.round;
    const h = Math.floor(E.time), m = Math.floor((E.time - h) * 60);
    $('clock').textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    $('weather').textContent = (E.day < 0.3 ? '🌙 Nacht · ' : '') + (E.label || '');
    $('bossTimer').textContent = L.boss ? (L.boss.dead ? '' : (L.boss.rootY || 0) < -0.5 ? '👹 MAMA IVA erscheint …' : L.boss.life > 0 ? `👹 MAMA IVA (Stufe ${(L.boss.lvl || 0) + 1}) ist da – noch ${L.fmt(L.boss.life)}` : (L.boss.capy ? '🦫 GIGA-CAPY zieht MAMA IVA in die Tiefe!' : '👹 MAMA IVA versinkt …')) : `👹 MAMA IVA in ${L.fmt(R.bossT)}`;
    const nf = R.found.filter(Boolean).length;
    $('codes').textContent = nf ? '🔒 Bunker-Code: ' + R.code.map((c, i) => (R.found[i] ? c : '_')).join(' ') : '';
    let obj = '';
    if (R.radio === 'calling') obj = `📡 Hubschrauber in ${L.fmt(R.radioT)} – überleb!`;
    else if (L.heli && L.heli.state === 'arriving') obj = '🚁 Hubschrauber landet an der Funkstation!';
    else if (L.heli && L.heli.state === 'landed') obj = `🚁 Steig ein! Noch ${L.fmt(40 - L.heli.t)}`;
    if (R.gate === 'opening') obj = `🚧 Schranke offen in ${L.fmt(R.gateT)}`;
    if (R.gate === 'open') obj = '🚧 Schranke offen – nach Norden raus!';
    $('objective').textContent = obj;
    const fi = $('friendInfo'); fi.innerHTML = '';
    for (const fr of [...L.remotes.values()].sort((a, b) => a.pid - b.pid)) {
      const line = document.createElement('div'); line.style.color = L.mp.color(fr.pid);
      line.textContent = fr.inRound && !fr.gone
        ? `● ${fr.name}: ${Math.round(L.dist(P.x, P.z, fr.x, fr.z))} m · ${fr.alive ? '❤️ ' + fr.hp : '💀 tot'}${fr.inVeh ? (fr.seat > 0 ? ' · fährt mit' : ' · fährt') : ''}`
        : `● ${fr.name}: nicht in der Runde`;
      fi.appendChild(line);
    }
    $('bHp').style.width = P.hp + '%'; $('bFood').style.width = P.food + '%'; $('bWater').style.width = P.water + '%'; $('bStam').style.width = P.stam + '%';
    $('moveMode').textContent = P.vehicle ? (P.vehicle.t.kind === 'car' ? '🚗 Fahren' : '🏍️ Fahren') : (MODE_TXT[P.mode] || '🧍 Stehen');
    const nz = P.noiseShow;
    $('noiseFill').style.width = Math.min(100, nz / 60 * 100) + '%';
    $('noiseTxt').textContent = nz < 1 ? 'lautlos – niemand hört dich' : nz < 10 ? 'leise – nur ganz nah hörbar' : nz < 30 ? 'hörbar' : nz < 80 ? 'LAUT!' : 'SEHR LAUT!!';
    // Ausrüstungsleiste
    const hb = $('hotbar'); hb.innerHTML = '';
    P.hot.forEach((it, i) => hb.appendChild(slotEl(it, { key: i + 1, sel: P.sel === i, label: ' ', name: false })));
    const w = P.sel >= 0 ? P.hot[P.sel] : null, wd = w && L.ITEMS[w.type];
    if (wd && wd.slot === 'waffe') $('ammo').innerHTML = `${P.reloadT >= 0 ? 'lädt …' : w.mag + ' / ' + L.countBag(wd.ammo)}<small>${wd.name}</small>`;
    else if (wd && w.count > 1) $('ammo').innerHTML = `${wd.icon} ${w.count}<small>${wd.name}</small>`;
    else if (wd) $('ammo').innerHTML = `<small>${wd.name}</small>`;
    else $('ammo').innerHTML = '<small>✋ Hand leer</small>';
    // Fahrzeug
    const v = P.vehicle;
    $('vehHud').hidden = !v;
    if (v) {
      $('kmh').textContent = Math.round(Math.abs(v.speed) * 3.6);
      const belt = $('belt');
      if (v.t.kind === 'car') { belt.textContent = P.belted ? '✅ Angeschnallt' : '⚠️ NICHT angeschnallt (B)'; belt.className = P.belted ? '' : 'off'; }
      else { belt.textContent = (L.save.char || {}).hat === 'helm' ? '🪖 Helm auf' : '⚠️ Ohne Helm'; belt.className = ''; }
      $('vehHp').textContent = `${v.t.name} · Zustand ${Math.max(0, Math.round(v.hp / v.t.hp * 100))}%`;
    }
    $('hint').textContent = L.uiBlock ? '' : L.interactHint();
    $('cross').className = P.aiming ? 'aim' : '';
    $('cross').hidden = !!v;
    $('extract').textContent = P.danger >= 3 ? '❗ Du wirst gejagt!' : P.danger === 2 ? '… etwas ist ganz nah' : '';
    drawMinimap();
    if (!$('mapPanel').hidden) drawBigMap();
  };

  // ---------- Rundenende ----------
  let endItems = [], endResult = '';
  ui.showEnd = function (result, why, items) {
    L.state = 'end'; L.unlock(); closeOverlays();
    $('hud').hidden = true; L.uiBlock = false;
    endResult = result; endItems = items.map((it) => ({ it, on: true, friend: null }));
    const friends = [...L.remotes.values()].sort((a, b) => a.pid - b.pid);
    const canGift = result === 'escape' && online() && friends.length > 0;
    const list = $('endList'); list.innerHTML = '';
    if (result === 'escape') {
      $('endTitle').textContent = '✅ ENTKOMMEN';
      $('endText').textContent = `Du bist über ${why} entkommen. Zeit: ${L.fmt(L.round.time)} · Erledigte Gegner: ${P.kills}. ` +
        (canGift ? `Klick die Sachen an, um sie zu verteilen: grün = dein Versteck, farbig = Versteck von ${friends.map((f) => f.name).join(' / ')}, grau = wegwerfen.` : 'Wähl aus, was du in dein Versteck legst (grün = mitnehmen).');
      L.music.set('menu');
    } else {
      $('endTitle').textContent = '💀 GESTORBEN';
      $('endText').textContent = (why || 'Du bist gestorben') + '. Alle Gegenstände sind verloren.';
      L.music.set('night');
    }
    const render = () => {
      list.innerHTML = '';
      endItems.forEach((e) => {
        const el = slotEl(e.it, {
          on: result === 'escape' && e.on && e.friend === null, onclick: result === 'escape' ? () => {
            if (canGift) {
              // Reihenfolge: eigenes Versteck → Mitspieler 1, 2, 3 → wegwerfen → eigenes Versteck
              if (e.on && e.friend === null) e.friend = friends[0].pid;
              else if (e.friend !== null) {
                const i = friends.findIndex((f) => f.pid === e.friend);
                if (i >= 0 && i < friends.length - 1) e.friend = friends[i + 1].pid; else { e.friend = null; e.on = false; }
              } else e.on = true;
            } else e.on = !e.on;
            render();
          } : null
        });
        if (e.friend !== null) {
          const f = L.remotes.get(e.friend), col = L.mp.color(e.friend);
          el.classList.add('friend'); el.style.borderColor = col; el.style.boxShadow = `0 0 0 2px ${col} inset`;
          if (f) { const tag = document.createElement('span'); tag.className = 'k'; tag.style.color = col; tag.textContent = f.name.slice(0, 8); el.appendChild(tag); }
        }
        list.appendChild(el);
      });
      if (!endItems.length) list.innerHTML = '<p class="small">Du hattest nichts dabei.</p>';
    };
    render();
    $('endInfo').textContent = (P.safe ? `🔒 Im Tresor sicher: ${L.ITEMS[P.safe.type].name}. ` : '') + (result === 'escape' ? `Versteck: ${L.save.stash.length}/${MAX_STASH} belegt.` : '');
    show('endScreen');
  };
  $('endOk').onclick = () => {
    if (endResult === 'escape') {
      let lost = 0;
      const gifts = new Map();
      for (const e of endItems) {
        if (e.friend !== null) { if (!gifts.has(e.friend)) gifts.set(e.friend, []); gifts.get(e.friend).push(e.it); continue; }
        if (!e.on) continue;
        if (L.save.stash.length < MAX_STASH) L.save.stash.push(e.it); else lost++;
      }
      if (online()) for (const [pid, items] of gifts) {
        L.mp.stashGift(pid, items);
        const f = L.remotes.get(pid);
        L.msg(`🎁 ${items.length} Sachen an ${f ? f.name : 'Mitspieler'} geschickt`);
      }
      if (lost) alert(lost + ' Gegenstände passten nicht mehr ins Versteck.');
      L.persist();
    }
    toMenu();
  };

  // ---------- Hauptmenü ----------
  function toMenu() {
    L.state = 'menu'; L.paused = false; L.uiBlock = false;
    $('hud').hidden = true; $('bloodScreen').classList.remove('show');
    show('menu'); L.music.set('menu'); L.engine.set(false, 0);
    const s = L.save.stats;
    $('menuStats').textContent = `Entkommen: ${s.escapes} · Gestorben: ${s.deaths} · Im Versteck: ${L.save.stash.length} Sachen`;
  }
  ui.toMenu = toMenu;
  const firstSound = () => { L.initAudio(); L.music.set('menu'); };
  $('btnPlay').onclick = () => {
    firstSound();
    if (online() && L.net.role === 'client') { show('mpScreen'); L.mp.renderLobby(); return; }
    if (online() && L.mp.anyInRound()) { show('mpScreen'); L.mp.renderLobby(); return; }
    ui.play();
  };
  $('btnChar').onclick = () => { firstSound(); openChar(); };
  $('btnStash').onclick = () => { firstSound(); openStash('view'); };
  $('btnSettings').onclick = () => { firstSound(); backTo = 'menu'; openSettings(); };
  $('btnMp').onclick = () => { firstSound(); show('mpScreen'); L.mp.renderLobby(); };
  $('btnHelp').onclick = () => { firstSound(); backTo = 'menu'; show('helpScreen'); };
  $('mpBack').onclick = toMenu;
  $('helpBack').onclick = () => show(backTo === 'pause' ? 'pauseScreen' : 'menu');
  $('pResume').onclick = resume;
  $('pSettings').onclick = () => { backTo = 'pause'; openSettings(); };
  $('pHelp').onclick = () => { backTo = 'pause'; show('helpScreen'); };
  $('pQuit').onclick = () => { L.paused = false; L.mpPause = false; show(null); L.endRound('death', 'Du hast aufgegeben'); };
  function startGame(loadout) {
    show(null); $('hud').hidden = false;
    L.initAudio();
    if (L.net.role === 'client') { if (!L.mp.startClient(loadout)) { toMenu(); return; } }
    else L.startRound(loadout);
    L.lock();
  }
  // Spielen (allein oder als Host)
  ui.play = function () { firstSound(); if (L.save.stash.length) openStash('loadout'); else startGame([]); };
  // Freund-Gerät: der Host hat die Runde gestartet
  ui.clientStartRequest = function () {
    closeOverlays(); $('hud').hidden = true; L.state = 'menu';
    L.msg('▶️ Die Runde startet!');
    if (L.save.stash.length) openStash('loadout'); else startGame([]);
  };

  // ---------- Versteck ----------
  let stashMode = 'view', chosen = new Set();
  function openStash(mode) {
    stashMode = mode; chosen = new Set();
    $('stashTitle').textContent = mode === 'loadout' ? 'Was nimmst du mit?' : 'Dein Versteck';
    $('stashInfo').textContent = mode === 'loadout'
      ? 'Klick die Sachen an, die du in die Runde mitnimmst (höchstens 15). Den Rest lässt du sicher im Versteck. Stirbst du, ist alles Mitgenommene weg.'
      : 'Hier liegt alles, was du bei einer Flucht gerettet hast. Klick einen Gegenstand an, um ihn in den Tresor-Platz zu legen: Der bleibt dir sogar, wenn du stirbst.';
    $('stashGo').hidden = mode !== 'loadout';
    renderStash(); show('stashScreen');
  }
  function renderStash() {
    const list = $('stashList'); list.innerHTML = '';
    L.save.stash.forEach((it, i) => list.appendChild(slotEl(it, {
      on: chosen.has(i), onclick: () => {
        if (stashMode === 'loadout') { if (chosen.has(i)) chosen.delete(i); else if (chosen.size < 15) chosen.add(i); }
        else { const old = L.save.safe; L.save.safe = it; L.save.stash.splice(i, 1); if (old) L.save.stash.push(old); L.persist(); }
        renderStash();
      }
    })));
    if (!L.save.stash.length) list.innerHTML = '<p class="small">Noch leer. Entkomme mit Beute, um es zu füllen.</p>';
    const safe = $('stashSafe'); safe.innerHTML = '';
    safe.appendChild(slotEl(L.save.safe, { label: 'Tresor', onclick: () => { if (L.save.safe && stashMode === 'view' && L.save.stash.length < MAX_STASH) { L.save.stash.push(L.save.safe); L.save.safe = null; L.persist(); renderStash(); } } }));
  }
  $('stashGo').onclick = () => {
    const take = [...chosen].sort((a, b) => b - a).map((i) => L.save.stash.splice(i, 1)[0]);
    L.persist();
    startGame(take);
  };
  $('stashBack').onclick = toMenu;

  // ---------- Einstellungen ----------
  const SET = [
    ['monsterDiff', 'Monster-Schwierigkeit', [['leicht', 'Leicht'], ['normal', 'Normal'], ['schwer', 'Schwer'], ['albtraum', 'Albtraum']]],
    ['npcDiff', 'NPC-Schwierigkeit (Treffsicherheit)', [['leicht', 'Leicht'], ['normal', 'Normal'], ['schwer', 'Schwer'], ['albtraum', 'Albtraum']]],
    ['npcMode', 'Andere Überlebende sind …', [['friedlich', 'friedlich'], ['gemischt', 'gemischt'], ['feindlich', 'feindlich']]],
    ['npcCount', 'Anzahl Überlebende (NPCs)', [[0, 'keine'], [8, '8'], [16, '16'], [24, '24'], [32, '32']]],
    ['bossMin', 'MAMA IVA: Pause und Aufenthalt je …', [[5, '5 Minuten'], [10, '10 Minuten'], [15, '15 Minuten'], [20, '20 Minuten']]],
    ['shadows', 'Schatten', [[true, 'An'], [false, 'Aus (schneller)']]],
    ['view', 'Sichtweite', [[400, 'Kurz (schneller)'], [700, 'Mittel'], [1000, 'Weit']]]
  ];
  const SLIDERS = [['sens', 'Mausempfindlichkeit', 0.3, 2.5, 0.1], ['music', 'Musik', 0, 1, 0.05], ['sfx', 'Geräusche', 0, 1, 0.05]];
  function openSettings() {
    const f = $('setForm'); f.innerHTML = '';
    const S = L.S();
    for (const [key, label, opts] of SET) {
      const d = document.createElement('div'); d.className = 'f';
      d.innerHTML = `<label>${label}</label>`;
      const sel = document.createElement('select');
      opts.forEach(([v, t], i) => { const o = document.createElement('option'); o.value = i; o.textContent = t; if (String(S[key]) === String(v)) o.selected = true; sel.appendChild(o); });
      sel.onchange = () => {
        S[key] = opts[+sel.value][0];
        L.persist(); L.applyShadowSetting();
        if (key !== 'shadows' && key !== 'view' && L.state === 'game') L.msg('Gilt ab der nächsten Runde.');
      };
      d.appendChild(sel); f.appendChild(d);
    }
    for (const [key, label, min, max, step] of SLIDERS) {
      const d = document.createElement('div'); d.className = 'f';
      d.innerHTML = `<label>${label}</label>`;
      const r = document.createElement('input'); r.type = 'range'; r.min = min; r.max = max; r.step = step; r.value = S[key];
      r.oninput = () => { S[key] = +r.value; L.applyVolumes(); L.persist(); };
      d.appendChild(r); f.appendChild(d);
    }
    show('settingsScreen');
  }
  $('setBack').onclick = () => show(backTo === 'pause' ? 'pauseScreen' : 'menu');

  // ---------- Charakter-Editor ----------
  const CHAR_LABELS = {
    name: 'Name', skin: 'Hautfarbe', hair: 'Frisur', hairColor: 'Haarfarbe', eyes: 'Augenfarbe', brows: 'Augenbrauen', mouth: 'Mund', nose: 'Nase',
    beard: 'Bart', glasses: 'Brille', glassesColor: 'Farbe Brille', hat: 'Kopfbedeckung (Helm schützt auf dem Motorrad)', hatColor: 'Farbe Kopfbedeckung',
    top: 'Oberteil', topColor: 'Farbe Oberteil', pants: 'Hose', pantsColor: 'Farbe Hose', shoeType: 'Schuhe', shoes: 'Farbe Schuhe', build: 'Statur', height: 'Größe', scar: 'Narbe'
  };
  const WORDS = { kurz: 'kurz', seitenscheitel: 'Scheitel', pony: 'Pony', buzz: 'Buzzcut', stachel: 'Stacheln', undercut: 'Undercut', irokese: 'Irokese', locken: 'Locken', wellig: 'wellig', lang: 'lang', bob: 'Bob', zopf: 'Pferdeschwanz', zoepfe: 'Zöpfe', dutt: 'Dutt', dreads: 'Dreads', glatze: 'Glatze',
    normal: 'normal', duenn: 'dünn', dick: 'dick', buschig: 'buschig', boese: 'böse', hoch: 'hoch', traurig: 'traurig', gebogen: 'gebogen',
    laecheln: 'Lächeln', grinsen: 'Grinsen', zaehne: 'Zähne', ernst: 'ernst', schmollen: 'Schmollmund', schief: 'schief', offen: 'offen', ueberrascht: 'überrascht',
    klein: 'klein', gross: 'groß', spitz: 'spitz', breit: 'breit', stups: 'Stupsnase', knubbel: 'Knubbel',
    kein: 'kein', stoppel: 'Stoppeln', vollbart: 'Vollbart', langbart: 'langer Bart', schnurrbart: 'Schnurrbart', henkelbart: 'Henkelbart', kinnbart: 'Kinnbart', ziegenbart: 'Ziegenbart', koteletten: 'Koteletten', kinnstreifen: 'Kinnstreifen',
    keine: 'keine', brille: 'Brille', rund: 'rund', eckig: 'eckig', sonnenbrille: 'Sonnenbrille', skibrille: 'Skibrille', monokel: 'Monokel', augenklappe: 'Augenklappe',
    muetze: 'Mütze', beanie: 'Bommelmütze', cap: 'Cap', cap_rueck: 'Cap rückwärts', helm: 'Helm', stirnband: 'Stirnband', bandana: 'Bandana', cowboy: 'Cowboyhut', zylinder: 'Zylinder', sonnenhut: 'Sonnenhut', krone: 'Krone',
    tshirt: 'T-Shirt', tanktop: 'Tanktop', hemd: 'Hemd', pullover: 'Pullover', hoodie: 'Hoodie', jacke: 'Jacke', lederjacke: 'Lederjacke', regenjacke: 'Regenjacke', weste: 'Weste', anzug: 'Anzug', trikot: 'Trikot', kittel: 'Kittel',
    jeans: 'Jeans', jogging: 'Jogginghose', cargo: 'Cargohose', zerrissen: 'zerrissen', anzughose: 'Anzughose',
    sneaker: 'Sneaker', hightop: 'High-Tops', stiefel: 'Stiefel', sandale: 'Sandalen', lackschuh: 'Lackschuhe', barfuss: 'barfuß',
    schmal: 'schmal', kraeftig: 'kräftig', muskuloes: 'muskulös', sehr_klein: 'sehr klein', mittel: 'mittel', sehr_gross: 'sehr groß',
    wange: 'Wange', auge: 'Auge', stirn: 'Stirn', kinn: 'Kinn', kreuz: 'Kreuz' };
  let charApp = null, prev = null;
  function openChar() {
    charApp = Object.assign({}, L.DEFAULT_CHAR, L.save.char || {});
    renderCharOpts(); show('charScreen');
    if (!prev) {
      const r = new T.WebGLRenderer({ canvas: $('charPreview'), antialias: true });
      r.setPixelRatio(Math.min(devicePixelRatio, 2));
      const s = new T.Scene(); s.background = new T.Color('#0e0f12');
      const cam = new T.PerspectiveCamera(32, 360 / 460, 0.1, 50); cam.position.set(0, 1.15, 4.2); cam.lookAt(0, 1.0, 0);
      s.add(new T.HemisphereLight(0xffffff, 0x404040, 0.9));
      const dl = new T.DirectionalLight(0xffffff, 0.8); dl.position.set(2, 4, 3); s.add(dl);
      const floor = new T.Mesh(new T.CircleGeometry(1, 32), new T.MeshLambertMaterial({ color: '#2a2b30' })); floor.rotation.x = -Math.PI / 2; s.add(floor);
      prev = { r, s, cam, rig: null };
      const loop = () => {
        if (!$('charScreen').hidden && prev.rig) {
          const t = performance.now() / 1000;
          prev.rig.root.rotation.y = Math.sin(t * 0.6) * 0.8;
          L.animHuman(prev.rig, { mode: 'walk', phase: t * 1.5, speed: 0.02 });
          prev.r.render(prev.s, prev.cam);
        }
        requestAnimationFrame(loop);
      };
      loop();
    }
    rebuildPreview();
  }
  function rebuildPreview() {
    if (!prev) return;
    if (prev.rig) prev.s.remove(prev.rig.root);
    prev.rig = L.buildHuman(charApp); prev.s.add(prev.rig.root);
  }
  function renderCharOpts() {
    const box = $('charOpts'); box.innerHTML = '';
    const nameD = document.createElement('div'); nameD.className = 'opt';
    nameD.innerHTML = '<label>Name</label>';
    const inp = document.createElement('input'); inp.type = 'text'; inp.maxLength = 18; inp.value = charApp.name || '';
    inp.oninput = () => { charApp.name = inp.value; };
    nameD.appendChild(inp); box.appendChild(nameD);
    for (const key in L.CHAR_OPTS) {
      const d = document.createElement('div'); d.className = 'opt';
      d.innerHTML = `<label>${CHAR_LABELS[key] || key}</label>`;
      const ch = document.createElement('div'); ch.className = 'choices';
      for (const v of L.CHAR_OPTS[key]) {
        const b = document.createElement('button');
        const isColor = v[0] === '#';
        if (isColor) { b.className = 'sw'; b.style.background = v; b.title = v; } else b.textContent = WORDS[v] || v;
        if (charApp[key] === v) b.classList.add('sel');
        b.onclick = () => { charApp[key] = v; renderCharOpts(); rebuildPreview(); };
        ch.appendChild(b);
      }
      d.appendChild(ch); box.appendChild(d);
    }
  }
  $('charRandom').onclick = () => { const n = charApp.name; charApp = Object.assign(L.randomAppearance(), { name: n }); renderCharOpts(); rebuildPreview(); };
  $('charSave').onclick = () => { L.save.char = Object.assign({}, charApp); L.persist(); toMenu(); L.msg && 0; };
  $('charBack').onclick = toMenu;
})();
