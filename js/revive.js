'use strict';
// Mehrspieler: Wer stirbt, schaut den Freunden zu, bis alle tot sind – und kann von einem Freund wiederbelebt werden.
// Bandage/Verband/Heilspritze = nur ein Teil des Lebens, Medkit/Erste-Hilfe-Kasten = volles Leben.
(function () {
  const L = window.L, T = THREE, P = L.player;
  const REV = { medkit: 100, erstehilfe: 100, spritze: 60, verband: 50, bandage: 35 };
  const ORDER = ['bandage', 'verband', 'spritze', 'medkit', 'erstehilfe'];
  L.REVIVE_HP = REV;
  const online = () => L.remotes && L.remotes.size > 0 && L.mp && L.mp.send;
  const aliveFriends = () => [...L.remotes.values()].filter((r) => r.inRound && r.alive && !r.gone);
  const downFriends = () => [...L.remotes.values()].filter((r) => r.inRound && r.alive === false && !r.gone);

  // ---------- Anzeige, wenn man gefallen ist ----------
  const box = document.createElement('div'); box.id = 'downInfo'; box.hidden = true; document.body.appendChild(box);
  const st = document.createElement('style');
  st.textContent = '#downInfo{position:fixed;left:50%;bottom:120px;transform:translateX(-50%);background:rgba(20,0,0,.72);border:2px solid #c02a2a;color:#fff;padding:10px 16px;border-radius:12px;z-index:25;text-align:center;font-size:15px;max-width:92vw}'
    + '#downInfo b{color:#ff6a6a}#downInfo button{margin-top:6px;padding:6px 14px;border-radius:8px;border:1px solid #fff6;background:#333;color:#fff;font-weight:700;cursor:pointer}'
    + '#revBar{position:fixed;left:50%;bottom:170px;transform:translateX(-50%);width:260px;height:16px;background:#0008;border:2px solid #7dff7d;border-radius:8px;z-index:25;overflow:hidden}#revBar i{display:block;height:100%;background:#7dff7d}';
  document.head.appendChild(st);
  const bar = document.createElement('div'); bar.id = 'revBar'; bar.hidden = true; bar.innerHTML = '<i></i>'; document.body.appendChild(bar);
  let specIdx = 0, lastHtml = '';
  function nextSpec() { const f = aliveFriends(); if (!f.length) return; specIdx = (specIdx + 1) % f.length; L.spectate = f[specIdx]; }
  box.addEventListener('click', (e) => { if (e.target.tagName === 'BUTTON') nextSpec(); });

  // vom Tod-Zweig in updatePlayer aufgerufen: true = liegen bleiben und zuschauen, false = Runde für mich vorbei
  L.updateDown = function (dt) {
    if (!online()) { box.hidden = true; return false; }
    const f = aliveFriends();
    if (!f.length) { box.hidden = true; L.spectate = null; return false; }
    if (P.deathT < 2.5) return true; // erst kurz die eigene Leiche sehen
    if (!L.spectate || !f.includes(L.spectate)) { specIdx = Math.min(specIdx, f.length - 1); L.spectate = f[specIdx]; }
    if (!L.uiBlock && (L.hit('Space') || L.hit('ArrowRight') || L.hit('KeyE') || L.mouse.click)) nextSpec();
    // umschauen mit der Maus
    const sens = 0.0022 * L.S().sens;
    P.camYaw -= L.mouse.dx * sens; P.camPitch = L.clamp(P.camPitch + L.mouse.dy * sens, -0.2, 1.1);
    const html = `💀 <b>Du bist gefallen.</b> Ein Freund kann dich wiederbeleben:<br>🧻 Bandage / 🩹 Verband = halbes Leben · 🧰 Medkit = volles Leben<br>👀 Du schaust <b style="color:#7dff7d">${String(L.spectate.name).replace(/[<>&"]/g, '')}</b> zu (${f.length} lebt noch)<br><button>Nächster Freund (Leertaste)</button>`;
    if (html !== lastHtml) { box.innerHTML = html; lastHtml = html; }
    box.hidden = false;
    return true;
  };

  // ---------- Wiederbeleben ----------
  function healItems() {
    const out = {};
    for (const arr of [P.hot, P.bag]) for (const it of arr) if (it && REV[it.type]) out[it.type] = (out[it.type] || 0) + it.count;
    return out;
  }
  function pickItem() {
    const held = L.selType && L.selType();
    if (held && REV[held]) return held;
    const have = healItems();
    return ORDER.find((t) => have[t]) || null;
  }
  function takeOne(type) {
    for (const arr of [P.hot, P.bag]) for (let i = 0; i < arr.length; i++) { const it = arr[i]; if (it && it.type === type) { it.count--; if (it.count <= 0) arr[i] = null; return true; } }
    return false;
  }
  function nearDown() {
    if (!online() || !P.alive || P.vehicle) return null;
    let best = null, bd = 2.6;
    for (const r of downFriends()) { const d = Math.hypot(r.x - P.x, r.z - P.z); if (d < bd) { bd = d; best = r; } }
    return best;
  }
  let rev = null;
  L.reviveHint = function () {
    const r = nearDown(); if (!r || rev) return null;
    const it = pickItem(), nm = String(r.name).slice(0, 18);
    if (!it) return '💀 ' + nm + ' liegt hier – du brauchst eine Bandage, einen Verband oder ein Medkit zum Wiederbeleben';
    return 'E: ' + nm + ' wiederbeleben mit ' + L.ITEMS[it].icon + ' ' + L.ITEMS[it].name + ' (' + (REV[it] >= 100 ? 'volles Leben' : REV[it] + ' Leben') + ')' + (REV[it] < 100 && healItems().medkit ? ' – Medkit in die Hand = volles Leben' : '');
  };
  L.reviveInteract = function () {
    const r = nearDown(); if (!r) return false;
    const it = pickItem(); if (!it) { L.msg('Du brauchst eine Bandage, einen Verband oder ein Medkit.', 2500); return true; }
    rev = { r, it, t: 0 }; L.msg('🩹 Du verarztest ' + r.name + ' … bleib bei ihm!', 2500);
    return true;
  };
  const DUR = 2.5;
  L.updateRevive = function (dt) {
    // Marker über gefallenen Freunden
    markers(dt);
    if (!rev) { bar.hidden = true; return; }
    const r = rev.r;
    if (!P.alive || P.vehicle || !r.inRound || r.alive || r.gone || Math.hypot(r.x - P.x, r.z - P.z) > 3.2) { rev = null; bar.hidden = true; L.msg('❌ Wiederbeleben abgebrochen', 1500); return; }
    rev.t += dt; bar.hidden = false; bar.firstChild.style.width = Math.min(100, rev.t / DUR * 100) + '%';
    P.vx *= 0.5; P.vz *= 0.5;
    if (rev.t >= DUR) {
      if (takeOne(rev.it)) {
        const hp = REV[rev.it];
        L.mp.sendTo(r.pid, { t: 'revive', hp, it: rev.it });
        r.alive = true; // gleich als lebendig zählen, bis seine Daten kommen
        L.msg('💚 ' + r.name + ' ist wieder da! (' + L.ITEMS[rev.it].name + ': ' + hp + ' Leben)', 4000); if (L.snd.heal) L.snd.heal();
      }
      rev = null; bar.hidden = true;
    }
  };
  // Nachricht: ich wurde wiederbelebt
  L.gotRevive = function (hp, it, by) {
    if (P.alive || L.state !== 'game' || !L.round || L.round.over) return;
    hp = Math.max(10, Math.min(100, +hp || 35));
    P.alive = true; P.hp = hp; P.deathT = 0; P.spawnProt = Math.max(P.spawnProt || 0, 4); P.stance = 'crouch'; P.vx = P.vz = 0;
    L.spectate = null; box.hidden = true; lastHtml = '';
    if (L.music && L.music.set) L.music.set('calm');
    L.msg('💚 ' + by + ' hat dich wiederbelebt! ' + (L.ITEMS[it] ? L.ITEMS[it].icon + ' ' : '') + Math.round(hp) + ' Leben', 6000);
    if (L.snd.heal) L.snd.heal();
  };
  L.clearRevive = function () { rev = null; bar.hidden = true; box.hidden = true; L.spectate = null; lastHtml = ''; for (const m of mk.values()) L.scene.remove(m); mk.clear(); };

  // rotes Kreuz über gefallenen Freunden (auch von weitem sichtbar)
  const mk = new Map();
  let crossTex = null;
  function markers() {
    const down = online() && L.state === 'game' ? downFriends() : [];
    for (const [pid, m] of mk) if (!down.some((r) => r.pid === pid)) { L.scene.remove(m); mk.delete(pid); }
    for (const r of down) {
      let m = mk.get(r.pid);
      if (!m) {
        if (!crossTex) { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.beginPath(); g.arc(32, 32, 30, 0, 6.283); g.fill(); g.fillStyle = '#d02020'; g.fillRect(26, 10, 12, 44); g.fillRect(10, 26, 44, 12); crossTex = new T.CanvasTexture(c); }
        m = new T.Sprite(new T.SpriteMaterial({ map: crossTex, depthTest: false, transparent: true })); m.scale.set(0.9, 0.9, 1); m.renderOrder = 999; L.scene.add(m); mk.set(r.pid, m);
      }
      const d = Math.hypot(r.x - P.x, r.z - P.z), s = 0.7 + Math.min(4, d / 25);
      m.scale.set(s, s, 1); m.position.set(r.x, (r.y || 0) + 1.6 + Math.sin(performance.now() / 300) * 0.15, r.z);
    }
  }
})();
