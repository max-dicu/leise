'use strict';
// Sprachchat für 2–4 Spieler: jeder hört jeden – egal, wo auf der Karte (keine Entfernung, gleich laut).
// Über PeerJS-Audioanrufe (jeder ruft jeden an). Ein- und Ausschalten: 🎤-Knopf oder Taste K.
(function () {
  const L = window.L, N = L.net;
  const V = { on: false, mute: false, stream: null, peers: new Map(), calls: new Map(), out: new Map() };
  L.voice = V;
  const myPid = () => N.pid || 0;
  const send = (m) => { if (L.mp && L.mp.send && N.connected) L.mp.send(m); };
  // ---------- Knopf und Anzeige ----------
  const btn = document.createElement('button'); btn.id = 'voiceBtn'; btn.hidden = true;
  btn.style.cssText = 'position:fixed;left:16px;bottom:140px;z-index:13;padding:6px 12px;border-radius:10px;border:2px solid #8aff9a;background:rgba(0,0,0,.6);color:#fff;font-weight:700;cursor:pointer';
  const who = document.createElement('div');
  who.style.cssText = 'position:fixed;left:16px;bottom:180px;z-index:13;font:bold 13px Arial,sans-serif;color:#fff;text-shadow:0 1px 3px #000;pointer-events:none';
  document.body.appendChild(btn); document.body.appendChild(who);
  const cs = document.createElement('style'); cs.textContent = 'body.touch #voiceBtn{bottom:auto!important;top:240px} body.cinema #voiceBtn{visibility:hidden}'; document.head.appendChild(cs);
  function label() { btn.textContent = !V.on ? '🎤 Sprachchat an' : V.mute ? '🔇 Stumm (antippen = reden)' : '🎙️ Du sprichst · aus = K'; btn.style.borderColor = V.on && !V.mute ? '#40ff60' : '#8a8a8a'; }
  btn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); if (!V.on) start(); else if (V.mute) setMute(false); else stop(); };
  addEventListener('keydown', (e) => {
    if (e.code !== 'KeyK' || L.chatOpen || L.uiBlock || !N.connected || L.state !== 'game') return;
    if (!V.on) start(); else stop();
  });
  setInterval(() => { const on = !!(N.connected && L.state === 'game'); if (btn.hidden === on) btn.hidden = !on; if (!on && V.on && !N.connected) stop(true); label(); }, 500);

  // ---------- Mikrofon ----------
  async function start() {
    if (V.on) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { L.msg('🎤 Dein Browser erlaubt hier kein Mikrofon.', 4000); return; }
    try { V.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }); }
    catch (e) { L.msg('🎤 Kein Mikrofon-Zugriff – bitte im Browser erlauben.', 5000); return; }
    V.on = true; V.mute = false; label();
    send({ t: 'von', id: N.peer && N.peer.id });
    for (const [pid, p] of V.peers) if (p.on) maybeCall(pid);
    L.msg('🎙️ Sprachchat an – alle Mitspieler hören dich überall auf der Karte. Aus: K oder Knopf.', 5000);
  }
  function stop(silent) {
    V.on = false;
    if (V.stream) for (const t of V.stream.getTracks()) t.stop();
    V.stream = null;
    for (const c of V.calls.values()) try { c.close(); } catch (e) { /* egal */ }
    V.calls.clear(); for (const pid of [...V.out.keys()]) dropOut(pid);
    send({ t: 'voff' }); label();
    if (!silent) L.msg('🔇 Sprachchat aus.', 2000);
  }
  function setMute(m) { V.mute = m; if (V.stream) for (const t of V.stream.getAudioTracks()) t.enabled = !m; label(); }

  // ---------- Verbindungen ----------
  function maybeCall(pid) {
    const p = V.peers.get(pid);
    if (!V.on || !p || !p.on || !p.id || V.calls.has(pid) || !N.peer) return;
    if (myPid() > pid) return; // nur der Spieler mit der kleineren Nummer ruft an (sonst doppelt)
    try { const c = N.peer.call(p.id, V.stream, { metadata: { pid: myPid() } }); if (c) bind(c, pid); } catch (e) { /* egal */ }
  }
  function bind(c, pid) {
    V.calls.set(pid, c);
    c.on('stream', (s) => playOut(pid, s));
    c.on('close', () => { if (V.calls.get(pid) === c) V.calls.delete(pid); dropOut(pid); });
    c.on('error', () => { if (V.calls.get(pid) === c) V.calls.delete(pid); dropOut(pid); });
  }
  function hookPeer() {
    if (!N.peer || N.peer._voiceHooked) return;
    N.peer._voiceHooked = true;
    N.peer.on('call', (c) => {
      const pid = c.metadata && typeof c.metadata.pid === 'number' ? c.metadata.pid : -1;
      if (!V.on || pid < 0) { try { c.close(); } catch (e) { /* egal */ } return; }
      const old = V.calls.get(pid); if (old && old !== c) try { old.close(); } catch (e) { /* egal */ }
      c.answer(V.stream); bind(c, pid);
    });
  }
  setInterval(hookPeer, 1000);
  // Wiedergabe: gleich laut für alle, egal wo
  function playOut(pid, s) {
    dropOut(pid);
    const a = new Audio(); a.autoplay = true; a.srcObject = s; a.volume = 1;
    a.play && a.play().catch(() => {});
    let an = null, buf = null;
    try { const A = L.audio && L.audio.ctx; if (A) { const src = A.createMediaStreamSource(s); an = A.createAnalyser(); an.fftSize = 256; src.connect(an); buf = new Uint8Array(an.frequencyBinCount); } } catch (e) { an = null; }
    V.out.set(pid, { a, an, buf, lvl: 0 });
  }
  function dropOut(pid) { const o = V.out.get(pid); if (!o) return; try { o.a.pause(); o.a.srcObject = null; } catch (e) { /* egal */ } V.out.delete(pid); }
  // Nachrichten
  L.voiceMsg = function (m, from) {
    if (m.t === 'von') {
      const known = V.peers.has(from) && V.peers.get(from).on;
      V.peers.set(from, { id: m.id, on: true });
      if (V.on && !known) send({ t: 'von', id: N.peer && N.peer.id }); // damit der andere mich auch kennt
      maybeCall(from);
    } else if (m.t === 'voff') {
      V.peers.set(from, { id: (V.peers.get(from) || {}).id, on: false });
      const c = V.calls.get(from); if (c) try { c.close(); } catch (e) { /* egal */ }
      V.calls.delete(from); dropOut(from);
    }
  };
  // Anzeige: wer gerade spricht
  setInterval(() => {
    if (!V.out.size) { who.textContent = ''; return; }
    const rows = [];
    for (const [pid, o] of V.out) {
      let lv = 0; if (o.an) { o.an.getByteTimeDomainData(o.buf); for (let i = 0; i < o.buf.length; i++) lv = Math.max(lv, Math.abs(o.buf[i] - 128)); }
      const r = L.remotes && L.remotes.get(pid), nm = r ? r.name : 'Spieler ' + (pid + 1);
      rows.push((lv > 8 ? '🔊 ' : '🔈 ') + nm);
    }
    who.textContent = rows.join('   ');
  }, 150);
  L.voiceLeft = (pid) => { V.peers.delete(pid); const c = V.calls.get(pid); if (c) try { c.close(); } catch (e) { /* egal */ } V.calls.delete(pid); dropOut(pid); };
})();
