'use strict';
// Mehrspieler für bis zu 4 Spieler (PeerJS). Der Host berechnet die Welt und ist mit allen verbunden;
// er leitet Positionen, Chat, Fahrzeuge und Treffer zwischen den Mitspielern weiter.
(function () {
  const L = window.L, T = THREE, $ = L.$;
  const P = L.player, E = L.ents;
  const MAXP = 4;
  const N = L.net = { role: 'solo', peer: null, conn: null, conns: new Map(), code: '', connected: false, pid: 0 };
  const mp = L.mp = {};
  const RM = L.remotes;
  const G = () => L._g;
  const STATES = ['wander', 'investigate', 'chase', 'search', 'listen', 'attack'];
  const ANIMS = ['walk', 'run', 'crawl', 'search', 'attack', 'alert', 'idle'];
  const WSTATES = ['patrol', 'hunt', 'fire'];
  const COLORS = ['#ffb050', '#5ab0ff', '#7cff8a', '#ff7ce0'];
  mp.color = (pid) => COLORS[pid % COLORS.length];
  const r1 = (v) => Math.round(v * 10) / 10, r2 = (v) => Math.round(v * 100) / 100;
  const myName = () => String((L.save.char || {}).name || 'Spieler').slice(0, 18);
  const nameOf = (pid) => (RM.get(pid) ? RM.get(pid).name : 'Mitspieler');
  const V1 = new T.Vector3(), V2 = new T.Vector3(), V3 = new T.Vector3(), DOWN = new T.Vector3(0, -1, 0);
  // Nachrichten, die der Host von einem Mitspieler an alle anderen weiterreicht
  const FWD = new Set(['ps', 'chat', 'venter', 'vleave', 'done', 'ready', 'shot', 'boom']);

  // ---------- Senden ----------
  function rawSend(c, o) { if (c && c.open) { try { c.send(o); } catch (e) { /* Verbindung weg */ } } }
  // an alle (Host) bzw. an den Host (Mitspieler)
  mp.send = function (o) {
    if (!N.connected) return;
    if (N.role === 'host') for (const c of N.conns.values()) rawSend(c, o);
    else rawSend(N.conn, o);
  };
  // an einen bestimmten Spieler
  mp.sendTo = function (pid, o) {
    if (!N.connected || pid === N.pid) return;
    if (N.role === 'host') rawSend(N.conns.get(pid), o);
    else if (pid === 0) rawSend(N.conn, o);
    else rawSend(N.conn, { t: 'relay', to: pid, m: o });
  };
  function forward(fromPid, o) { const m = Object.assign({}, o, { from: fromPid }); for (const [pid, c] of N.conns) if (pid !== fromPid) rawSend(c, m); }

  // ---------- Verbindung und Lobby ----------
  function status(t) { const s = $('mpStatus'); if (s) s.innerHTML = t; }
  function codeGen() { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; let s = ''; for (let i = 0; i < 4; i++) s += A[Math.floor(Math.random() * A.length)]; return s + '-' + L.randi(10, 99); }
  const peerId = (code) => 'leise-spiel-' + String(code).toUpperCase().replace(/[^A-Z0-9]/g, '');
  function cleanup() {
    try { if (N.conn) N.conn.close(); } catch (e) { /* egal */ }
    for (const c of N.conns.values()) { try { c.close(); } catch (e) { /* egal */ } }
    try { if (N.peer) N.peer.destroy(); } catch (e) { /* egal */ }
    N.peer = null; N.conn = null; N.conns.clear(); N.connected = false; N.role = 'solo'; N.pid = 0;
    for (const pid of [...RM.keys()]) removeRemote(pid);
  }
  function noLib() { status('❌ Der Mehrspieler-Teil konnte nicht geladen werden. Bist du mit dem Internet verbunden?'); }
  mp.host = function () {
    if (typeof Peer === 'undefined') { noLib(); return; }
    cleanup(); L.initAudio();
    N.code = codeGen(); N.role = 'host'; N.pid = 0;
    status('⏳ Raum wird erstellt …');
    N.peer = new Peer(peerId(N.code));
    N.peer.on('open', () => renderLobby());
    N.peer.on('connection', (c) => setupHostConn(c));
    N.peer.on('error', (e) => { status(e.type === 'unavailable-id' ? 'Der Code ist gerade belegt. Bitte nochmal „Raum erstellen“.' : '❌ Fehler: ' + e.type); });
    N.peer.on('disconnected', () => { try { if (N.peer && !N.peer.destroyed) N.peer.reconnect(); } catch (e) { /* egal */ } });
    renderLobby();
  };
  function setupHostConn(c) {
    c.on('open', () => {
      // freie Spielernummer suchen (1..3)
      let pid = 0;
      for (let i = 1; i < MAXP; i++) if (!N.conns.has(i)) { pid = i; break; }
      if (!pid) { rawSend(c, { t: 'full' }); setTimeout(() => c.close(), 500); return; }
      c.pid = pid; N.conns.set(pid, c); N.connected = true;
      c.on('data', (m) => { try { hostReceive(m, pid); } catch (e) { console.error(e); } });
      c.on('close', () => hostLost(pid));
      c.on('error', () => hostLost(pid));
    });
  }
  function hostLost(pid) {
    if (!N.conns.has(pid)) return;
    N.conns.delete(pid);
    const r = RM.get(pid);
    if (r) { freeRemoteVehicle(r); L.msg('⚠️ ' + r.name + ' hat das Spiel verlassen'); addChat('System', r.name + ' hat das Spiel verlassen', true); }
    removeRemote(pid);
    mp.send({ t: 'leave', pid });
    N.connected = N.conns.size > 0 || N.role === 'host';
    renderLobby();
  }
  mp.join = function (code) {
    if (typeof Peer === 'undefined') { noLib(); return; }
    code = String(code || '').trim().toUpperCase();
    if (code.replace(/[^A-Z0-9]/g, '').length < 5) { status('Bitte den ganzen Code eingeben, z. B. WOLF-42.'); return; }
    cleanup(); L.initAudio();
    N.role = 'client'; N.code = code;
    status('⏳ Verbinde mit Raum ' + code + ' …');
    N.peer = new Peer();
    N.peer.on('open', () => {
      const c = N.peer.connect(peerId(code), { reliable: true });
      N.conn = c;
      c.on('open', () => { N.connected = true; rawSend(c, { t: 'hello', app: L.save.char || L.DEFAULT_CHAR, name: myName() }); renderLobby(); });
      c.on('data', (m) => { try { handle(m, m.from === undefined ? 0 : m.from); } catch (e) { console.error(e); } });
      c.on('close', clientLost); c.on('error', clientLost);
    });
    N.peer.on('error', (e) => {
      status(e.type === 'peer-unavailable' ? '❌ Raum nicht gefunden. Ist der Code richtig und wartet der Raum noch?' : '❌ Fehler: ' + e.type);
      if (!N.connected) { try { N.peer.destroy(); } catch (x) { /* egal */ } N.peer = null; N.role = 'solo'; renderLobby(); }
    });
    renderLobby();
  };
  function clientLost() {
    if (!N.connected) return;
    N.connected = false;
    L.msg('⚠️ Verbindung zum Host verloren');
    for (const pid of [...RM.keys()]) removeRemote(pid);
    try { if (N.peer) N.peer.destroy(); } catch (e) { /* egal */ }
    N.peer = null; N.conn = null; N.role = 'solo'; N.pid = 0;
    if (L.state === 'game' && L.round && !L.round.over) L.endRound('escape', 'die Trennung vom Host (du behältst deine Sachen)');
    status('Verbindung getrennt.');
    renderLobby();
  }
  mp.anyInRound = () => [...RM.values()].some((r) => r.inRound);
  function renderLobby() {
    const idle = !N.peer;
    $('mpIdle').hidden = !idle;
    $('mpLeave').hidden = idle;
    const others = [...RM.values()];
    $('mpStart').hidden = !(N.role === 'host' && others.length > 0 && !mp.anyInRound());
    if (idle) return;
    const list = [`<span style="color:${mp.color(N.pid)}">● ${esc(myName())} (du${N.role === 'host' ? ', Host' : ''})</span>`]
      .concat(others.sort((a, b) => a.pid - b.pid).map((r) => `<span style="color:${mp.color(r.pid)}">● ${esc(r.name)}${r.pid === 0 ? ' (Host)' : ''}${r.inRound ? ' – spielt gerade' : ''}</span>`));
    let head = '';
    if (N.role === 'host') head = N.peer && N.peer.open ? `Raum-Code:<div class="bigcode">${N.code}</div>Bis zu ${MAXP} Spieler. Gib den Code deinen Freunden.` : '⏳ Raum wird erstellt …';
    else head = N.connected ? '✅ Verbunden. Warte, bis der Host die Runde startet …' : '⏳ Verbinde …';
    status(`${head}<div class="plist">Spieler (${others.length + 1}/${MAXP}):<br>${list.join('<br>')}</div>` + (N.role === 'host' && mp.anyInRound() ? '<br>⏳ Es läuft noch eine Runde. Warte, bis alle fertig sind.' : ''));
  }
  mp.renderLobby = renderLobby;
  function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]); }
  $('mpHost').onclick = () => mp.host();
  $('mpJoin').onclick = () => mp.join($('mpCode').value);
  $('mpCode').addEventListener('keydown', (e) => { if (e.code === 'Enter' || e.key === 'Enter') mp.join($('mpCode').value); });
  $('mpLeave').onclick = () => { cleanup(); status('Verbindung getrennt.'); renderLobby(); };
  $('mpStart').onclick = () => { if (mp.anyInRound()) { L.msg('Warte, bis alle die laufende Runde beendet haben.'); return; } L.ui.play(); };

  // ---------- Mitspieler-Figuren ----------
  function nameTag(name, color) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 48;
    const g = c.getContext('2d');
    g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(0, 0, 256, 48);
    g.fillStyle = color; g.font = 'bold 30px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(name, 128, 26);
    const s = new T.Sprite(new T.SpriteMaterial({ map: new T.CanvasTexture(c), depthTest: false, transparent: true }));
    s.scale.set(1.4, 0.26, 1);
    return s;
  }
  function makeRemote(pid, app, name) {
    removeRemote(pid);
    const rig = L.buildHuman(app || L.DEFAULT_CHAR); rig.root.visible = false;
    if (L.scene) L.scene.add(rig.root);
    const tag = nameTag(name, mp.color(pid)); tag.position.y = 2.2; rig.root.add(tag);
    const r = { kind: 'remote', key: 'remote' + pid, pid, rig, name, app, x: 0, y: 0, z: 0, yaw: 0, nx: 0, ny: 0, nz: 0, nyaw: 0, alive: true, inRound: false, gone: false, stance: 'stand', moving: false, inVeh: false, vehId: 0, seat: 0, flash: false, hp: 100, st: { mode: 'walk' }, held: null, got: false, dead: false, acc: 0 };
    RM.set(pid, r);
    return r;
  }
  function removeRemote(pid) { const r = RM.get(pid); if (r && r.rig && L.scene) L.scene.remove(r.rig.root); RM.delete(pid); }
  function freeRemoteVehicle(r) {
    if (!r || !r.inVeh) return;
    const v = L.byId.get('v' + r.vehId);
    if (v && !(r.seat > 0)) { v.occupied = false; v.netPose = null; v.speed = 0; }
    r.inVeh = false; r.vehId = 0; r.seat = 0;
  }
  function applyPs(R, m) {
    R.nx = m.x; R.ny = m.y; R.nz = m.z; R.nyaw = m.yaw;
    if (!R.got) { R.x = m.x; R.y = m.y; R.z = m.z; R.yaw = m.yaw; R.got = true; }
    R.st = m.st || R.st; R.stance = m.stance; R.moving = m.moving; R.alive = m.alive; R.gone = m.gone;
    R.held = m.held; R.flash = m.flash; R.hp = m.hp;
    if (m.veh && m.veh.length === 2) { R.inVeh = true; R.vehId = m.veh[0]; R.seat = m.veh[1]; }
    else if (m.veh) {
      const v = L.byId.get('v' + m.veh[0]);
      if (v) { v.occupied = true; if (v !== P.vehicle || P.seat > 0) v.netPose = { x: m.veh[1], z: m.veh[2], yaw: m.veh[3], speed: m.veh[4], steer: m.veh[5], hp: m.veh[6] }; }
      R.inVeh = true; R.vehId = m.veh[0]; R.seat = 0;
    } else if (R.inVeh) { R.inVeh = false; R.seat = 0; }
  }
  function updateRemote(R, dt) {
    const vis = R.inRound && !R.gone;
    R.rig.root.visible = vis;
    if (!vis) return;
    const k = Math.min(1, dt * 12);
    R.x += (R.nx - R.x) * k; R.y += (R.ny - R.y) * k; R.z += (R.nz - R.z) * k; R.yaw += L.angDiff(R.yaw, R.nyaw) * k;
    const rig = R.rig;
    const v = R.inVeh ? L.byId.get('v' + R.vehId) : null;
    if (v) {
      const s = (v.rig.seats || [v.rig.seat])[R.seat || 0] || v.rig.seat, cy = Math.cos(v.yaw), sy = Math.sin(v.yaw);
      R.x = R.nx = v.x; R.z = R.nz = v.z;
      rig.root.position.set(v.x + s.x * cy + s.z * sy, s.y, v.z - s.x * sy + s.z * cy);
      rig.root.rotation.set(0, v.yaw, 0); rig.root.rotateZ(-v.lean);
    } else { rig.root.position.set(R.x, R.y, R.z); rig.root.rotation.set(0, R.yaw, 0); }
    L.setHeld(rig, v ? null : R.held);
    L.animHuman(rig, R.st || { mode: 'walk' });
  }

  // ---------- Empfangen ----------
  // Host: Nachricht von Mitspieler pid
  function hostReceive(m, pid) {
    if (m.t === 'relay') {
      if (m.to === 0) handle(m.m, pid);
      else rawSend(N.conns.get(m.to), Object.assign({}, m.m, { from: pid }));
      return;
    }
    if (m.t === 'hello') {
      const r = makeRemote(pid, m.app, String(m.name || 'Spieler').slice(0, 18));
      const players = [{ pid: 0, name: myName(), app: L.save.char || L.DEFAULT_CHAR, inRound: L.state === 'game' && !P.gone }]
        .concat([...RM.values()].filter((o) => o.pid !== pid).map((o) => ({ pid: o.pid, name: o.name, app: o.app, inRound: o.inRound })));
      rawSend(N.conns.get(pid), { t: 'welcome', pid, players });
      forward(pid, { t: 'join', pid, name: r.name, app: r.app });
      L.msg('👋 ' + r.name + ' ist beigetreten'); addChat('System', r.name + ' ist beigetreten', true);
      renderLobby();
      return;
    }
    handle(m, pid);
    if (FWD.has(m.t)) forward(pid, m);
  }
  // Nachricht verarbeiten (from = Spielernummer des Absenders)
  function handle(m, from) {
    const R = RM.get(from), Rd = L.round, host = N.role === 'host';
    switch (m.t) {
      case 'welcome':
        N.pid = m.pid;
        for (const p of m.players) { const r = makeRemote(p.pid, p.app, p.name); r.inRound = false; }
        L.msg('✅ Verbunden – du bist Spieler ' + (m.pid + 1)); renderLobby(); break;
      case 'join':
        makeRemote(m.pid, m.app, m.name);
        L.msg('👋 ' + m.name + ' ist beigetreten'); addChat('System', m.name + ' ist beigetreten', true); renderLobby(); break;
      case 'leave': {
        const r = RM.get(m.pid);
        if (r) { freeRemoteVehicle(r); L.msg('⚠️ ' + r.name + ' hat das Spiel verlassen'); addChat('System', r.name + ' hat das Spiel verlassen', true); }
        removeRemote(m.pid); renderLobby(); break;
      }
      case 'full': status('❌ Der Raum ist voll (höchstens ' + MAXP + ' Spieler).'); break;
      case 'chat': addChat(nameOf(from), String(m.text || '').slice(0, 160), false, from); break;
      case 'start': if (!host) { mp.pending = m; L.ui.clientStartRequest(); } break;
      case 'ready':
        if (R) { R.inRound = true; R.alive = true; R.gone = false; R.got = false; R.nx = m.x; R.nz = m.z; }
        L.msg('👥 ' + nameOf(from) + ' ist jetzt in der Runde'); renderLobby(); break;
      case 'ps': if (R) applyPs(R, m); break;
      case 'snap': applySnap(m); break;
      case 'rs': applyRound(m); break;
      case 'nz': if (host && R && R.inRound) L.makeNoise(m.x, m.z, m.r, R); break;
      case 'hurt':
        if (P.alive && !P.gone && L.state === 'game') {
          L.hurtPlayer(m.dmg, m.cause);
          if (P.alive && m.kx !== undefined && m.kx !== null && !P.vehicle) {
            P.vx = m.kx; P.vz = m.kz; P.vy = m.ky || 4; P.air = true; P.tumble = 0.01; P.knockT = 1.2;
            if (m.sneak) L.msg('😱 Getroffen und weggeschleudert! Bleib leise ...');
          }
        }
        break;
      case 'pvp': if (P.alive && !P.gone && L.state === 'game') L.hurtPlayer(m.dmg, 'Von ' + String(m.by).slice(0, 18) + ' getroffen'); break;
      case 'dmg':
        if (host && R) { const e = m.id === 'boss' ? L.boss : L.byId.get(m.id); if (e && !e.dead) L.damageEnt(e, m.dmg, R.x, R.z, R); }
        break;
      case 'boom': if (L.state === 'game' || host) L.explode(m.x, m.y, m.z, m.rad, m.dmg, host ? R : null, m.big, true); break;
      case 'shot': {
        const a = V1.set(m.a[0], m.a[1], m.a[2]), b = V2.set(m.b[0], m.b[1], m.b[2]);
        L.tracer(a, b); L.snd.gun(m.w, { x: a.x, y: a.y, z: a.z });
        L.env.muzzle.position.copy(a); L.env.muzzle.intensity = 3;
        break;
      }
      case 'pick':
        if (host) {
          const it = L.byId.get('i' + m.id); if (!it) break;
          if (it.note !== undefined && Rd) Rd.found[it.note] = true;
          G().removeItem(it);
          mp.sendTo(from, { t: 'got', type: it.type, count: it.count, mag: it.mag === undefined ? null : it.mag, note: it.note === undefined ? null : it.note });
        }
        break;
      case 'got': gotItem(m); break;
      case 'drop': if (host) L.spawnItem(m.type, m.x, m.z, m.count, m.mag === null ? undefined : m.mag); break;
      case 'iadd': if (!host && L.state === 'game') { const a = m.it; L.spawnItem(a[1], a[2], a[3], a[4], a[5] === null ? undefined : a[5], a[6] === null ? undefined : a[6], a[0]); } break;
      case 'irem': if (!host) { const it = L.byId.get('i' + m.id); if (it) G().removeItem(it); } break;
      case 'venter': {
        const v = L.byId.get('v' + m.id), seat = m.seat || 0;
        if (seat > 0) {
          if (R) { R.inVeh = true; R.vehId = m.id; R.seat = seat; }
          if (v && v === P.vehicle) L.msg('👥 ' + nameOf(from) + ' fährt mit!');
          break;
        }
        if (v) {
          v.occupied = true;
          if (v === P.vehicle && !(P.seat > 0)) L.msg(nameOf(from) + ' wollte auch fahren – du sitzt schon am Steuer.');
          else v.netPose = { x: v.x, z: v.z, yaw: v.yaw, speed: 0 };
          if (v === P.vehicle && P.seat > 0) L.msg('🚗 ' + nameOf(from) + ' fährt jetzt');
        }
        if (R) { R.inVeh = true; R.vehId = m.id; R.seat = 0; }
        break;
      }
      case 'vleave': {
        const v = L.byId.get('v' + m.id);
        if (m.seat > 0) {
          if (R) { R.inVeh = false; R.vehId = 0; R.seat = 0; }
          if (v && v === P.vehicle) L.msg('👥 ' + nameOf(from) + ' ist ausgestiegen');
          break;
        }
        if (v) {
          v.occupied = false; v.netPose = null; v.x = m.x; v.z = m.z; v.yaw = m.yaw; v.hp = m.hp; v.speed = 0; v.lat = 0;
          v.rig.root.position.set(v.x, 0, v.z); v.rig.root.rotation.set(0, v.yaw, 0);
        }
        if (R) { R.inVeh = false; R.vehId = 0; R.seat = 0; }
        break;
      }
      case 'vcrash': { const v = P.vehicle; if (v && v.id === m.id && P.seat > 0) L.crashHurt(v, m.impact); break; }
      case 'radio':
        if (host && Rd && Rd.radio === 'idle') { Rd.radio = 'calling'; Rd.radioT = 90; Rd.radioPing = 0; L.banner('HUBSCHRAUBER GERUFEN', nameOf(from) + ' hat Hilfe gerufen. Überlebt 90 Sekunden!'); }
        break;
      case 'gate':
        if (host && Rd && Rd.gate === 'closed') { Rd.gate = 'opening'; Rd.gateT = 30; Rd.alarmT = 0; L.banner('SCHRANKE ÖFFNET SICH', nameOf(from) + ' hat den Alarm ausgelöst!'); }
        break;
      case 'bunker':
        if (host && Rd && !Rd.bunkerOpen) { Rd.bunkerOpen = true; Rd.doorT = 0; L.interact.bunker.led.material = L.mat('#20ff40', { basic: true }); L.snd.door(); L.msg('🔓 ' + nameOf(from) + ' hat den Bunker geöffnet!'); }
        break;
      case 'boss': if (!host && L.state === 'game') bossPuppet(m); break;
      case 'bossGone': if (!host && L.boss) { L.scene.remove(L.boss.rig.root); L.boss = null; } break;
      case 'stomp':
        L.snd.stomp({ x: m.x, y: 0, z: m.z });
        L.shake = Math.max(L.shake, L.clamp(1.6 - L.dist(P.x, P.z, m.x, m.z) / 120, 0, 1.6));
        L.fx('#6a5a40', m.x, 0.5, m.z, 20, 12, { size: 0.4, life: 1.5 });
        break;
      case 'msg': L.msg(String(m.text)); break;
      case 'done':
        if (R) { freeRemoteVehicle(R); R.inRound = false; R.rig.root.visible = false; }
        L.msg(m.result === 'escape' ? `🏁 ${nameOf(from)} ist entkommen (über ${m.why})!` : `💀 ${nameOf(from)} ist gestorben: ${m.why}`, 6000);
        addChat('System', m.result === 'escape' ? nameOf(from) + ' ist entkommen' : nameOf(from) + ' ist gestorben', true);
        renderLobby(); break;
      case 'gift': {
        const it = m.it || {}, d = L.ITEMS[it.type]; if (!d) break;
        const left = L.giveItem(it.type, it.count, it.mag === null ? undefined : it.mag);
        L.msg(`🎁 ${nameOf(from)} hat dir ${d.icon} ${d.name} gegeben`); L.snd.pickup();
        if (left > 0) L.dropItem({ type: it.type, count: left, mag: it.mag });
        break;
      }
      case 'stashGift': {
        let n = 0;
        for (const it of m.items || []) if (L.ITEMS[it.type] && L.save.stash.length < 40) { L.save.stash.push(it); n++; }
        L.persist();
        L.msg(`🎁 ${nameOf(from)} hat dir ${n} Sachen in dein Versteck gelegt!`, 6000);
        addChat('System', nameOf(from) + ' hat dir ' + n + ' Sachen ins Versteck gelegt', true);
        break;
      }
    }
  }
  function gotItem(m) {
    if (m.note !== null && m.note !== undefined) {
      L.round.found[m.note] = true; L.snd.pickup();
      L.ui.showNote(`„Wer das liest: Die ${m.note + 1}. Ziffer für Bunker 7 ist ${L.round.code[m.note]}. Der Bunker liegt im Dunkelforst. Viel Glück.“`);
      return;
    }
    const d = L.ITEMS[m.type]; if (!d) return;
    const left = L.giveItem(m.type, m.count, m.mag === null ? undefined : m.mag);
    if (left === m.count) { L.msg('🎒 Rucksack voll!'); L.dropItem({ type: m.type, count: left, mag: m.mag }); return; }
    L.snd.pickup(); L.msg(`+ ${d.icon} ${d.name}${m.count - left > 1 ? ' ×' + (m.count - left) : ''}`);
    if (left > 0) L.dropItem({ type: m.type, count: left, mag: m.mag });
  }
  mp.gift = function (it, pid) { mp.sendTo(pid, { t: 'gift', it: { type: it.type, count: it.count, mag: it.mag === undefined ? null : it.mag } }); L.msg('🎁 An ' + nameOf(pid) + ' gegeben'); };
  mp.stashGift = function (pid, items) { if (items.length) mp.sendTo(pid, { t: 'stashGift', items }); };
  // nächster Mitspieler in der Nähe (für „geben“)
  mp.nearestFriend = function (rad) {
    let best = null, bd = rad;
    for (const r of RM.values()) { if (!r.inRound || r.gone || !r.alive) continue; const d = L.dist(r.x, r.z, P.x, P.z); if (d < bd) { bd = d; best = r; } }
    return best;
  };

  // ---------- Regelmäßig senden ----------
  let psT = 0, snapT = 0, rsT = 0;
  mp.update = function (dt) {
    if (!N.connected) return;
    psT -= dt; snapT -= dt; rsT -= dt;
    if (psT <= 0) { psT = 1 / 15; sendPs(); }
    if (N.role === 'host') {
      if (snapT <= 0) { snapT = 0.1; for (const r of RM.values()) if (r.inRound) sendSnap(r); }
      if (rsT <= 0) { rsT = 0.5; sendRound(); }
    }
    for (const r of RM.values()) updateRemote(r, dt);
  };
  function sendPs() {
    const v = P.vehicle;
    mp.send({
      t: 'ps', x: r2(P.x), y: r2(P.y), z: r2(P.z), yaw: r2(P.yaw), st: P.animSt, stance: P.stance,
      moving: Math.hypot(P.vx || 0, P.vz || 0) > 0.4 || !!(v && Math.abs(v.speed) > 0.5),
      alive: !!P.alive, gone: !!P.gone, held: P.rig ? P.rig.heldType : null, flash: !!P.flash, hp: Math.round(P.hp || 0),
      veh: v ? (P.seat > 0 ? [v.id, P.seat] : [v.id, r2(v.x), r2(v.z), r2(v.yaw), r2(v.speed), r2(v.steer), Math.round(v.hp)]) : 0
    });
  }
  // Host: Schnappschuss für einen Mitspieler (nur was in seiner Nähe ist)
  function sendSnap(R) {
    const M = [], W = [], NN = [], V = [];
    for (const m of E.monsters) {
      if (L.dist(m.x, m.z, R.x, R.z) > 330) continue;
      M.push([m.id, r1(m.x), r1(m.z), r2(m.yaw), STATES.indexOf(m.state), ANIMS.indexOf(m.anim), m.dead ? 1 : 0, m.prey === R ? 1 : 0, r2(m.atk || 0)]);
    }
    for (const w of E.walkers) W.push([w.id, r1(w.x), r1(w.z), r2(w.yaw), r1(w.hy), WSTATES.indexOf(w.state), w.rig.beam.g.visible ? 1 : 0, r1(w.aimX), r1(w.aimZ), w.dead ? 1 : 0, w.chargeT > 0 ? 1 : 0, r2(w.sweep || 0)]);
    for (const n of E.npcs) {
      if (L.dist(n.x, n.z, R.x, R.z) > 330) continue;
      NN.push([n.id, r1(n.x), r1(n.z), r2(n.yaw), n.mode === 'run' ? 1 : 0, n.moving ? 1 : 0, n.state === 'fight' && n.weapon !== 'hammer' ? 1 : 0, n.dead ? 1 : 0]);
    }
    for (const v of E.vehicles) {
      if (v.netPose) continue;
      const hostDrives = v === P.vehicle && !(P.seat > 0);
      if (hostDrives || (Math.abs(v.speed) > 0.05 && v !== P.vehicle)) V.push([v.id, r2(v.x), r2(v.z), r2(v.yaw), r2(v.speed), r2(v.steer), Math.round(v.hp), hostDrives ? 1 : 0]);
    }
    const b = L.boss;
    const B = b ? [r1(b.x), r1(b.z), r2(b.yaw), r1(b.hy), b.rig.beam.g.visible ? 1 : 0, r1(b.aimX || 0), r1(b.aimZ || 0), r2(b.stompT || 0), b.dead ? 1 : 0, r1(b.rootY || 0), Math.round(b.life || 0)] : null;
    mp.sendTo(R.pid, { t: 'snap', M, W, N: NN, V, B });
  }
  function sendRound() {
    const R = L.round; if (!R || !mp.anyInRound()) return;
    const H = L.heli;
    mp.send({ t: 'rs', bossT: Math.round(R.bossT), radio: R.radio, radioT: r1(R.radioT || 0), gate: R.gate, gateT: r1(R.gateT || 0), bunker: !!R.bunkerOpen, found: R.found, heli: H ? [r1(H.x), r1(H.y), r1(H.z), H.state, r1(H.t)] : null, time: r2(L.env.time), weather: L.env.weather });
  }

  // ---------- Runde starten (Host schickt allen die ganze Welt) ----------
  mp.sendStart = function () {
    if (!N.connected || !N.conns.size) return;
    for (const r of RM.values()) { r.inRound = false; r.got = false; }
    const Rd = L.round;
    const base = {
      t: 'start', md: L.S().monsterDiff,
      round: { code: Rd.code, found: Rd.found, bossT: Rd.bossT, gate: Rd.gate, radio: Rd.radio, bunkerOpen: Rd.bunkerOpen },
      env: { time: L.env.time, weather: L.env.weather },
      items: E.items.map((it) => [it.id, it.type, r2(it.x), r2(it.z), it.count, it.mag === undefined ? null : it.mag, it.note === undefined ? null : it.note]),
      veh: E.vehicles.map((v) => [v.id, v.type, r2(v.x), r2(v.z), r2(v.yaw), Math.round(v.hp)]),
      mon: E.monsters.map((m) => [m.id, m.kind, m.variant || null, r1(m.x), r1(m.z), r2(m.yaw)]),
      walk: E.walkers.map((w) => [w.id, r1(w.x), r1(w.z), r2(w.yaw)]),
      npc: E.npcs.map((n) => [n.id, r1(n.x), r1(n.z), n.app, n.weapon])
    };
    // jeder bekommt einen eigenen Startpunkt 25–60 m vom Host entfernt
    const used = [[P.x, P.z]];
    for (const pid of N.conns.keys()) {
      let sx = P.x + 30 + pid * 8, sz = P.z;
      for (let k = 0; k < 60; k++) {
        const a = Math.random() * 6.28, d = L.rand(25, 60), x = P.x + Math.sin(a) * d, z = P.z + Math.cos(a) * d;
        if (Math.abs(x) > 1470 || Math.abs(z) > 1470 || L.queryBoxes(x, z, 1.5).length) continue;
        if (used.some((u) => L.dist(u[0], u[1], x, z) < 10)) continue;
        sx = x; sz = z; break;
      }
      used.push([sx, sz]);
      mp.sendTo(pid, Object.assign({}, base, { spawn: [r1(sx), r1(sz)] }));
    }
    L.msg('⏳ Deine Mitspieler wählen noch ihre Ausrüstung …', 5000);
  };
  mp.startClient = function (loadout) {
    const d = mp.pending; if (!d) return false;
    mp.pending = null;
    const g = G();
    L.md = g.MDIFF[d.md] || g.MDIFF.normal;
    g.clearAll(); g.resetPlayer();
    for (const it of loadout || []) { const left = L.giveItem(it.type, it.count, it.mag); if (left > 0) L.save.stash.push(Object.assign({}, it, { count: left })); }
    P.x = d.spawn[0]; P.z = d.spawn[1]; P.yaw = P.camYaw = Math.random() * 6.28;
    L.round = { over: false, time: 0, code: d.round.code, found: d.round.found.slice(), bunkerOpen: d.round.bunkerOpen, doorT: 0, radio: d.round.radio, radioT: 0, gate: d.round.gate, gateT: 0, alarmT: 0, bossT: d.round.bossT, warned: false };
    const I = L.interact;
    I.bunker.door.position.y = 0; I.bunker.led.material = L.mat('#ff2020', { basic: true });
    I.gate.gate.position.x = 0; I.gate.gbox.on = true; L.gateOpen = false;
    L._bulk = true;
    for (const a of d.items) L.spawnItem(a[1], a[2], a[3], a[4], a[5] === null ? undefined : a[5], a[6] === null ? undefined : a[6], a[0]);
    L._bulk = false;
    for (const a of d.veh) g.spawnVehicle({ id: a[0], type: a[1], x: a[2], z: a[3], yaw: a[4], hp: a[5] });
    for (const a of d.mon) { const m = g.spawnMonster(a[1], a[3], a[4], a[2] || undefined, a[0]); m.yaw = a[5]; m.rig.root.visible = false; }
    for (const a of d.walk) { const w = g.spawnWalker(a[1], a[2], a[0]); w.yaw = a[3]; g.initGait(w, w.rig); }
    for (const a of d.npc) { const n = g.spawnNpc(a[1], a[2], false, a[0], a[3], a[4]); n.rig.root.visible = false; }
    L.env.time = d.env.time; L.setWeather(d.env.weather);
    // der Host spielt mit; andere Mitspieler melden sich mit „ready“
    for (const r of RM.values()) { r.inRound = r.pid === 0; r.gone = false; r.alive = true; r.got = false; }
    L.state = 'game'; L.paused = false;
    L.music.set('calm');
    mp.send({ t: 'ready', x: P.x, z: P.z });
    L.msg('Ihr spielt zusammen! Mitspieler siehst du als farbige Pfeile auf der Karte. Enter = Chat.', 7000);
    return true;
  };

  // ---------- Mitspieler-Gerät: Schnappschüsse anwenden ----------
  const occ = new Set();
  function applySnap(s) {
    if (N.role !== 'client' || !L.round || L.state !== 'game') return;
    const now = performance.now();
    for (const a of s.M) {
      const m = L.byId.get('m' + a[0]); if (!m) continue;
      if (m.nx === undefined) { m.x = a[1]; m.z = a[2]; m.yaw = a[3]; }
      m.nx = a[1]; m.nz = a[2]; m.nyaw = a[3];
      m.state = STATES[a[4]] || 'wander'; m.anim = ANIMS[a[5]] || 'walk';
      if (a[6] && !m.dead) { m.dead = true; m.deadT = 0; L.blood(m.x, 1.2, m.z, 25, true); L.decal(m.x, m.z, 2); L.snd.splat({ x: m.x, y: 1, z: m.z }); }
      m.prey = a[7] ? P : null; m.atk = a[8]; m.seen = now;
    }
    for (const a of s.W) {
      const w = L.byId.get('w' + a[0]); if (!w) continue;
      if (w.nx === undefined) { w.x = a[1]; w.z = a[2]; w.yaw = a[3]; G().initGait(w, w.rig); }
      w.nx = a[1]; w.nz = a[2]; w.nyaw = a[3]; w.hy = a[4]; w.state = WSTATES[a[5]] || 'patrol';
      w.beamOn = !!a[6]; w.aimX = a[7]; w.aimZ = a[8]; w.charging = !!a[10]; w.sweep = a[11];
      if (a[9] && !w.dead) { w.dead = true; w.deadT = 0; }
    }
    for (const a of s.N) {
      const n = L.byId.get('n' + a[0]); if (!n) continue;
      if (n.nx === undefined) { n.x = a[1]; n.z = a[2]; n.yaw = a[3]; }
      n.nx = a[1]; n.nz = a[2]; n.nyaw = a[3]; n.mode = a[4] ? 'run' : 'walk'; n.moving = !!a[5]; n.fight = !!a[6]; n.seen = now;
      if (a[7] && !n.dead) { n.dead = true; n.deadT = 0; L.blood(n.x, 1, n.z, 20, true); L.decal(n.x, n.z, 1.8); }
    }
    const seen = new Set();
    for (const a of s.V) {
      const v = L.byId.get('v' + a[0]); if (!v || (v === P.vehicle && !(P.seat > 0))) continue;
      v.netPose = { x: a[1], z: a[2], yaw: a[3], speed: a[4], steer: a[5], hp: a[6], until: now + 700 };
      if (a[7]) { v.occupied = true; seen.add(v); occ.add(v); }
    }
    for (const v of [...occ]) if (!seen.has(v)) { if (![...RM.values()].some((r) => r.inVeh && r.vehId === v.id && !(r.seat > 0))) v.occupied = false; occ.delete(v); }
    if (s.B && L.boss) {
      const b = L.boss, B = s.B;
      b.nx = B[0]; b.nz = B[1]; b.nyaw = B[2]; b.hy = B[3]; b.beamOn = !!B[4]; b.aimX = B[5]; b.aimZ = B[6]; b.stompT = B[7]; b.rootY = B[9] || 0; b.life = B[10] || 0;
      if (B[8] && !b.dead) { b.dead = true; b.deadT = 0; }
    }
  }
  let alarmFlip = false;
  function applyRound(m) {
    if (N.role !== 'client' || !L.round || L.round.over || L.state !== 'game') return;
    const R = L.round, I = L.interact;
    if (R.bossT > 30 && m.bossT <= 30 && !L.boss) L.banner('DER BODEN BEBT ...', 'In 30 Sekunden kommt MAMA IVA.');
    R.bossT = m.bossT;
    if (m.radio === 'calling' && R.radio === 'idle') L.banner('HUBSCHRAUBER GERUFEN', 'Überlebt 90 Sekunden!');
    R.radio = m.radio; R.radioT = m.radioT;
    if (m.gate === 'opening' && R.gate === 'closed') L.banner('SCHRANKE ÖFFNET SICH', '30 Sekunden Alarm!');
    if (m.gate === 'open' && R.gate !== 'open') L.banner('SCHRANKE OFFEN', 'Raus aus der Sperrzone – nach Norden!');
    R.gate = m.gate; R.gateT = m.gateT;
    I.gate.gate.position.x = m.gate === 'open' ? 15 : m.gate === 'opening' ? (1 - m.gateT / 30) * 15 : 0;
    I.gate.gbox.on = m.gate !== 'open'; L.gateOpen = m.gate === 'open';
    if (m.gate === 'opening') { alarmFlip = !alarmFlip; if (alarmFlip) L.snd.alarm({ x: 0, y: 3, z: -1490 }); }
    if (m.bunker && !R.bunkerOpen) { R.bunkerOpen = true; R.doorT = 0; I.bunker.led.material = L.mat('#20ff40', { basic: true }); L.snd.door(); L.msg('🔓 Der Bunker ist offen!'); }
    for (let i = 0; i < 4; i++) if (m.found[i]) R.found[i] = true;
    if (m.heli) {
      if (!L.heli) {
        const rig = L.buildHeli('#2a3a4a'); L.scene.add(rig.root);
        L.heli = { rig, x: m.heli[0], y: m.heli[1], z: m.heli[2], state: m.heli[3], t: m.heli[4] };
        L.banner('HUBSCHRAUBER IM ANFLUG', 'Lauf zum Landeplatz an der Funkstation!');
      }
      const H = L.heli;
      if (H.state !== 'landed' && m.heli[3] === 'landed') L.banner('HUBSCHRAUBER GELANDET', 'Steig ein (E) – er wartet nur 40 Sekunden!');
      H.nx = m.heli[0]; H.ny = m.heli[1]; H.nz = m.heli[2]; H.state = m.heli[3]; H.t = m.heli[4];
    } else if (L.heli) { L.scene.remove(L.heli.rig.root); L.heli = null; }
    L.env.time = m.time;
    if (L.env.weather !== m.weather) L.setWeather(m.weather);
  }
  function bossPuppet(m) {
    if (L.boss) L.scene.remove(L.boss.rig.root);
    const rig = L.buildKoloss(); L.scene.add(rig.root);
    const how = m.how || 'boden', start = how === 'berg' ? -50 : -62;
    const b = { kind: 'boss', key: 'boss', rig, x: m.x, z: m.z, nx: m.x, nz: m.z, yaw: m.yaw, nyaw: m.yaw, hy: 30, hp: 8000, t: 0, dead: false, deadT: 0, roarT: 3, beamOn: false, aimX: 0, aimZ: 0, stompT: 0, how, rootY: start, life: 0 };
    G().initGait(b, rig);
    rig.root.position.y = start;
    L.boss = b;
    L.bossAppear(b);
  }

  // ---------- Mitspieler-Gerät: Figuren bewegen und animieren ----------
  mp.puppets = function (dt) {
    const now = performance.now();
    for (const m of E.monsters) {
      const rig = m.rig;
      if (m.nx === undefined) { rig.root.visible = false; continue; }
      const dP = L.dist(P.x, P.z, m.x, m.z);
      rig.root.visible = dP < (m.variant === 'lange' ? 300 : 260) && now - (m.seen || 0) < 2000;
      if (m.dead) {
        if (m.kind === 'viktor') L.animViktor(rig, { mode: 'dead' }); else L.animDaniel(rig, { mode: 'dead' });
        rig.root.position.set(m.x, 0, m.z); rig.root.rotation.y = m.yaw;
        continue;
      }
      const k = Math.min(1, dt * 8);
      m.x += (m.nx - m.x) * k; m.z += (m.nz - m.z) * k; m.yaw += L.angDiff(m.yaw, m.nyaw) * k;
      m.phase += dt * (m.anim === 'crawl' ? 9 : m.anim === 'run' ? 6 : m.anim === 'walk' ? 3.2 : 2);
      if (m.anim === 'alert' && m.lastAnim !== 'alert' && dP < 120) { if (m.kind === 'viktor') L.snd.viktor({ x: m.x, y: 2.5, z: m.z }); else L.snd.daniel({ x: m.x, y: 2, z: m.z }); }
      m.lastAnim = m.anim;
      if (dP < 45 && Math.random() < dt * 0.35) { if (m.kind === 'viktor') L.snd.click({ x: m.x, y: 2.6, z: m.z }); else L.snd.heavy({ x: m.x, y: 0, z: m.z }, 0.2); }
      if (!rig.root.visible) continue;
      if (m.kind === 'viktor') L.animViktor(rig, { mode: m.anim, phase: m.phase, atk: m.atk }); else L.animDaniel(rig, { mode: m.anim, phase: m.phase, atk: m.atk });
      rig.root.position.set(m.x, 0, m.z); rig.root.rotation.y = m.yaw;
    }
    for (const n of E.npcs) {
      const rig = n.rig;
      if (n.nx === undefined) { rig.root.visible = false; continue; }
      const dP = L.dist(P.x, P.z, n.x, n.z);
      rig.root.visible = dP < 220 && now - (n.seen || 0) < 2000;
      if (n.dead) { L.animHuman(rig, { mode: 'dead' }); rig.root.position.set(n.x, 0, n.z); rig.root.rotation.y = n.yaw; continue; }
      const k = Math.min(1, dt * 8);
      n.x += (n.nx - n.x) * k; n.z += (n.nz - n.z) * k; n.yaw += L.angDiff(n.yaw, n.nyaw) * k;
      n.phase += dt * (n.moving ? (n.mode === 'run' ? 11 : 7.5) : 0.75);
      if (!rig.root.visible) continue;
      L.animHuman(rig, { mode: n.mode === 'run' && n.moving ? 'run' : 'walk', phase: n.phase, speed: n.moving ? 1 : 0, aim: n.fight });
      rig.root.position.set(n.x, 0, n.z); rig.root.rotation.y = n.yaw;
    }
    for (const w of E.walkers) puppetWalker(w, dt);
    if (L.boss) puppetBoss(L.boss, dt);
    const H = L.heli;
    if (H) {
      if (H.nx !== undefined) { const k = Math.min(1, dt * 3); H.x += (H.nx - H.x) * k; H.y += (H.ny - H.y) * k; H.z += (H.nz - H.z) * k; }
      H.rig.root.position.set(H.x, H.y, H.z); H.rig.root.rotation.y = -Math.PI / 2; H.rig.rotor.rotation.y += dt * 30;
      H.chop = (H.chop || 0) - dt; if (H.chop <= 0) { H.chop = 0.09; L.snd.rotor({ x: H.x, y: H.y + 3, z: H.z }); }
    }
  };
  function puppetWalker(w, dt) {
    const rig = w.rig;
    if (w.nx === undefined) { rig.root.visible = false; return; }
    const k = Math.min(1, dt * 6), ox = w.x, oz = w.z;
    w.x += (w.nx - w.x) * k; w.z += (w.nz - w.z) * k; w.yaw += L.angDiff(w.yaw, w.nyaw) * k;
    const speed = L.dist(ox, oz, w.x, w.z) / Math.max(dt, 0.001);
    w.t += dt;
    if (w.dead) {
      w.deadT += dt; w.dhy = Math.max(3, (w.dhy || w.hy) - dt * 12);
      rig.hull.position.set(w.x, w.dhy, w.z); rig.hull.rotation.set(Math.min(0.5, w.deadT * 0.4), w.yaw, 0.3);
      rig.cone.visible = rig.spot.visible = rig.beam.g.visible = false;
      return;
    }
    w.hornT = (w.hornT === undefined ? L.rand(20, 60) : w.hornT) - dt;
    if (w.hornT <= 0) { w.hornT = L.rand(35, 80); L.snd.horn({ x: w.x, y: 22, z: w.z }); }
    const dP = L.dist(P.x, P.z, w.x, w.z);
    rig.root.visible = dP < L.S().view + 200;
    if (!rig.root.visible) return;
    rig.hull.position.set(w.x, w.hy, w.z); rig.hull.rotation.set(Math.sin(w.t) * 0.03, w.yaw, Math.sin(w.t * 0.8) * 0.03);
    for (let i = 0; i < rig.cables.length; i++) rig.cables[i].rotation.set(Math.sin(w.t * 1.3 + i) * 0.25, 0, Math.cos(w.t + i * 2) * 0.25);
    const la = w.yaw + (w.sweep || 0), gx = w.x + Math.sin(la) * 38, gz = w.z + Math.cos(la) * 38, night = 1 - L.env.day;
    const top = V1.set(w.x + Math.sin(w.yaw) * 6.8, w.hy - 0.3, w.z + Math.cos(w.yaw) * 6.8);
    rig.cone.position.copy(top); rig.cone.scale.set(9, Math.hypot(gx - top.x, top.y, gz - top.z), 9);
    rig.cone.quaternion.setFromUnitVectors(DOWN, V3.set(gx - top.x, -top.y, gz - top.z).normalize());
    rig.cone.material.opacity = 0.03 + night * 0.08;
    rig.spot.position.set(gx, 0.12, gz); rig.spot.scale.setScalar(9); rig.spot.material.opacity = 0.12 + night * 0.35;
    rig.cone.visible = rig.spot.visible = dP < 700;
    if (w.charging) rig.eye.scale.setScalar(1.6); else rig.eye.scale.set(1.05, 1.05, 0.55);
    if (w.beamOn && w.state === 'fire') {
      const a = V1.set(w.x + Math.sin(w.yaw) * 7, w.hy - 0.3, w.z + Math.cos(w.yaw) * 7), b = V2.set(w.aimX, 0.5, w.aimZ);
      rig.beam.g.visible = true; L.setBeam(rig.beam, a, b, 0.7 + Math.random() * 0.25);
      if (Math.random() < dt * 8) { L.fx('#ff8030', w.aimX, 0.3, w.aimZ, 3, 3, { basic: true, size: 0.15, life: 0.5 }); L.decal(w.aimX, w.aimZ, 1.2, '#1a1008'); }
      if (Math.random() < dt * 3) L.snd.ray({ x: w.aimX, y: 1, z: w.aimZ });
    } else rig.beam.g.visible = false;
    G().gait(w, rig, dt, speed, 7, speed > 4 ? 0.55 : 0.75, 3.5, (fp) => {
      const d = L.dist(P.x, P.z, fp.x, fp.z);
      if (d < 200) L.snd.heavy({ x: fp.x, y: 0, z: fp.z }, 0.6);
      if (d < 60) L.shake = Math.max(L.shake, (60 - d) / 150);
    });
  }
  function puppetBoss(b, dt) {
    const rig = b.rig, k = Math.min(1, dt * 5), ox = b.x, oz = b.z;
    b.x += (b.nx - b.x) * k; b.z += (b.nz - b.z) * k; b.yaw += L.angDiff(b.yaw, b.nyaw) * k;
    const speed = L.dist(ox, oz, b.x, b.z) / Math.max(dt, 0.001);
    b.t += dt;
    if (b.dead) {
      b.deadT += dt; b.dhy = Math.max(6, (b.dhy || b.hy) - dt * 10);
      rig.hull.position.set(b.x, b.dhy, b.z); rig.hull.rotation.set(Math.min(1.2, b.deadT * 0.5), b.yaw, 0);
      rig.beam.g.visible = false;
      return;
    }
    b.roarT -= dt;
    if (b.roarT <= 0) { b.roarT = L.rand(15, 30); L.snd.bossRoar({ x: b.x, y: 40, z: b.z }); }
    rig.hull.position.set(b.x, b.hy, b.z); rig.hull.rotation.set(0, b.yaw, Math.sin(b.t * 0.9) * 0.04);
    rig.root.position.y = (b.rootY || 0) + L.mountainH(b.x, b.z);
    if ((b.rootY || 0) < -0.5) { b.sinking = b.life <= 0 ? 1 : 0; L.bossRise(b, dt); }
    const sw = Math.sin(b.t * 1.4), st = b.stompT > 0 ? 1.5 : 0;
    rig.arms[0].arm.rotation.set(-sw * 0.3 - st, 0, 0.3); rig.arms[1].arm.rotation.set(sw * 0.3 - st, 0, -0.3);
    rig.thin[0].arm.rotation.set(-1.2 + Math.sin(b.t * 2.1) * 0.4, 0, 0.6); rig.thin[1].arm.rotation.set(-1.2 + Math.cos(b.t * 1.9) * 0.4, 0, -0.6);
    rig.thin[0].elbow.rotation.x = -0.8 + Math.sin(b.t * 2.6) * 0.3; rig.thin[1].elbow.rotation.x = -0.8 + Math.cos(b.t * 2.3) * 0.3;
    rig.neck.rotation.set(0.15, Math.sin(b.t * 0.5) * 0.5, Math.sin(b.t * 0.7) * 0.25);
    rig.core.scale.setScalar(1.5 + Math.sin(b.t * 6) * 0.2);
    if (b.beamOn) {
      const chest = V1.set(b.x + Math.sin(b.yaw) * 3, b.hy + 9, b.z + Math.cos(b.yaw) * 3);
      rig.beam.g.visible = true; L.setBeam(rig.beam, chest, V2.set(b.aimX, 0.5, b.aimZ), 1.3);
      if (Math.random() < dt * 8) L.decal(b.aimX, b.aimZ, 1.6, '#1a1008');
      if (Math.random() < dt * 3) L.snd.ray({ x: b.aimX, y: 1, z: b.aimZ });
    } else rig.beam.g.visible = false;
    G().gait(b, rig, dt, speed, 10, 0.85, 5, (fp) => {
      const d = L.dist(P.x, P.z, fp.x, fp.z);
      L.snd.stomp({ x: fp.x, y: 0, z: fp.z });
      L.shake = Math.max(L.shake, L.clamp((200 - d) / 200, 0, 0.9));
    });
  }

  // ---------- Chat ----------
  function addChat(name, text, system, pid) {
    const log = $('chatLog'); if (!log) return;
    const d = document.createElement('div');
    if (system) d.className = 'sys';
    const b = document.createElement('b'); b.textContent = name + ': ';
    if (!system && pid !== undefined) b.style.color = mp.color(pid);
    d.appendChild(b); d.appendChild(document.createTextNode(text));
    log.appendChild(d);
    while (log.children.length > 8) log.firstChild.remove();
    setTimeout(() => d.classList.add('old'), 15000);
    $('chat').hidden = false;
    if (!system && name !== 'Du') L.snd.key();
  }
  function openChat() { L.chatOpen = true; L.uiBlock = true; $('chat').hidden = false; $('chatIn').hidden = false; L.unlock(); setTimeout(() => $('chatIn').focus(), 0); }
  function closeChat() {
    L.chatOpen = false; L.uiBlock = false;
    const i = $('chatIn'); i.value = ''; i.hidden = true; i.blur();
    if (L.state === 'game' && !L.paused) L.lock();
  }
  addEventListener('keydown', (e) => {
    const inp = $('chatIn');
    if (e.target === inp) {
      if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.key === 'Enter') {
        const t = inp.value.trim();
        if (t) { mp.send({ t: 'chat', text: t.slice(0, 160) }); addChat('Du', t, false, N.pid); }
        closeChat(); e.preventDefault();
      } else if (e.code === 'Escape') { closeChat(); e.preventDefault(); }
      e.stopPropagation();
      return;
    }
    if ((e.code === 'Enter' || e.code === 'NumpadEnter') && N.connected && L.state === 'game' && !L.uiBlock) { openChat(); e.preventDefault(); }
  }, true);
})();
