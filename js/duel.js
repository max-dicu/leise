'use strict';
// Boss-Ende für Riesen-Viktor bzw. Riesen-Daniel: der andere kommt und besiegt ihn (etwa 35 Sekunden, jedes Mal anders)
(function () {
  const L = window.L, T = THREE, P = L.player;
  function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const ease = (k) => 1 - Math.pow(1 - L.clamp(k, 0, 1), 3);
  const bump = (u, a, b) => (u < a || u > b ? 0 : Math.sin((u - a) / (b - a) * Math.PI));
  const MOVES = ['schlag', 'tritt', 'ringen', 'sprung', 'stoss', 'kopfnuss', 'wirbel'], ENDS = ['wuergen', 'suplex', 'wurf'];
  const T_IN = 4, T_MOVE = 2.6, N_MOVE = 6, T_FIN = T_IN + T_MOVE * N_MOVE, T_FINLEN = 5, T_OUT = T_FIN + T_FINLEN, T_TOTAL = T_OUT + 6;
  const anim = (type, rig, st) => (type === 'viktor' ? L.animViktor(rig, st) : L.animDaniel(rig, st));
  const voice = (type, p) => (type === 'viktor' ? L.snd.viktor(p) : L.snd.daniel(p));
  let D = null;
  L.duelInfo = () => D;
  L.endDuel = function () { if (D) { L.scene.remove(D.r.loser.root); L.scene.remove(D.r.winner.root); D = null; } };
  // loser = der Boss (schon da), winner = der Herausforderer, der kommt
  L.startDuel = function (x, z, seed, loser, size) {
    L.endDuel();
    const R = rng(seed), winner = loser === 'viktor' ? 'daniel' : 'viktor';
    const build = (k, s) => { const r = k === 'viktor' ? L.buildViktor(['grey', 'red', 'blue', 'lange'][Math.floor(R() * 4)]) : L.buildDaniel(); r.root.scale.setScalar(s); L.scene.add(r.root); return r; };
    const sL = size, sW = size * (0.85 + R() * 0.3);
    const rl = build(loser, sL), rw = build(winner, sW);
    const moves = [];
    for (let i = 0; i < N_MOVE; i++) moves.push({ k: MOVES[Math.floor(R() * MOVES.length)], by: R() < 0.62 ? 'w' : 'l', hit: false });
    const end = ENDS[Math.floor(R() * ENDS.length)];
    const axis = R() * Math.PI * 2, gap = (sL + sW) * 0.5;
    D = { t: 0, x, z, loser, winner, sL, sW, r: { loser: rl, winner: rw }, moves, end, axis, gap, ph: 0, cam: [R(), R(), R()], landed: false, endHit: false, won: false };
    const nameW = winner === 'viktor' ? 'RIESEN-VIKTOR' : 'RIESEN-DANIEL', nameL = loser === 'viktor' ? 'RIESEN-VIKTOR' : 'RIESEN-DANIEL';
    L.banner(nameW + ' GEGEN ' + nameL, nameW.replace('RIESEN-', '') + ' kommt, um ' + nameL.replace('RIESEN-', '') + ' zu stoppen!');
    const side = axis + Math.PI / 2 * (D.cam[0] < 0.5 ? 1 : -1), sz = Math.max(sL, sW);
    L.startCine(nameW + ' GEGEN ' + nameL, T_TOTAL - 0.5, (t) => {
      if (!D) return null;
      const seg = t < T_IN ? 0 : t < T_FIN ? 1 + Math.floor((t - T_IN) / (T_MOVE * 2)) % 3 : 4;
      const a = side + [0.25, -0.4, 0.5, -0.2, 0.15][seg] * (0.6 + D.cam[1] * 0.8) + t * 0.015 * (D.cam[2] < 0.5 ? 1 : -1);
      const d = sz * [8, 6, 6.8, 5.6, 6.5][seg], gy = L.mountainH(D.x, D.z);
      return { x: D.x + Math.sin(a) * d, y: gy + sz * [3, 2.2, 3.4, 1.6, 2.6][seg], z: D.z + Math.cos(a) * d, lx: D.x, ly: gy + sz * 1.6, lz: D.z };
    });
  };
  function epicHit(p, big) {
    L.snd.heavy(p, 1); L.snd.crash(big ? 1 : 0.6, p);
    L.shake = Math.max(L.shake, big ? 1.4 : 0.8);
    if (big) { L.env.bolt = 1; L.snd.thunder(0.05); }
    L.fx('#ffd080', p.x, p.y, p.z, big ? 40 : 18, 12, { basic: true, size: 0.9, life: 0.8 });
  }
  L.updateDuel = function (dt) {
    if (!D) return;
    D.t += dt; D.ph += dt * 6;
    const t = D.t, ax = Math.sin(D.axis), az = Math.cos(D.axis), gy = L.mountainH(D.x, D.z), rl = D.r.loser, rw = D.r.winner;
    const pos = { x: D.x, y: gy + D.sL * 1.5, z: D.z };
    let lOff = -D.gap / 2, wOff = D.gap / 2, lY = 0, wY = 0, lRx = 0, lRz = 0, wRx = 0, lYaw = D.axis, wYaw = D.axis + Math.PI;
    let lMode = 'alert', wMode = 'alert', lAtk = 0, wAtk = 0, wRise = 0;
    const pose = [];
    if (t < T_IN) {
      // der Herausforderer bricht aus dem Boden
      wRise = -(1 - ease(t / 3)) * D.sW * 3.4;
      if (Math.random() < dt * 20) L.fx('#5a4630', D.x + ax * D.gap / 2 + L.rand(-12, 12), gy + 1, D.z + az * D.gap / 2 + L.rand(-12, 12), 3, 12, { size: 1.3, life: 2 });
      L.shake = Math.max(L.shake, 0.5);
      if (t > 3 && !D.landed) { D.landed = true; voice(D.winner, pos); epicHit({ x: D.x + ax * D.gap / 2, y: gy + 5, z: D.z + az * D.gap / 2 }, true); }
      lMode = 'alert';
    } else if (t < T_FIN) {
      const i = Math.floor((t - T_IN) / T_MOVE), u = (t - T_IN - i * T_MOVE) / T_MOVE, mv = D.moves[i];
      // A greift an, B wird getroffen
      const aW = mv.by === 'w', s = aW ? 1 : -1;
      const hit = (at, big) => { if (u > at && !mv.hit) { mv.hit = true; epicHit(pos, big); voice(aW ? D.loser : D.winner, pos); } };
      if (mv.k === 'schlag') {
        if (aW) { wMode = 'attack'; wAtk = u; lOff -= bump(u, 0.45, 1) * D.sL * 0.6; lRx = -bump(u, 0.45, 1) * 0.4; } else { lMode = 'attack'; lAtk = u; wOff += bump(u, 0.45, 1) * D.sW * 0.6; wRx = -bump(u, 0.45, 1) * 0.4; }
        hit(0.45, false);
      } else if (mv.k === 'tritt') {
        const k = bump(u, 0.3, 0.7);
        pose.push(() => { const r = aW ? rw : rl, o = aW ? rl : rw; r.legs[0].leg.rotation.x = -1.6 * k; o.torso.rotation.x = 0.7 * bump(u, 0.45, 1); });
        if (aW) lOff -= bump(u, 0.45, 1) * D.sL * 0.5; else wOff += bump(u, 0.45, 1) * D.sW * 0.5;
        hit(0.45, false);
      } else if (mv.k === 'ringen') {
        lMode = wMode = 'walk'; const k = bump(u, 0, 1); lOff += k * D.gap * 0.3; wOff -= k * D.gap * 0.3; lRx = wRx = 0.3 * k;
        D.axis += dt * 0.6;
        pose.push(() => { for (const a of rl.arms) a.arm.rotation.x = -1.5 * k; for (const a of rw.arms) a.arm.rotation.x = -1.5 * k; });
        hit(0.55, false);
      } else if (mv.k === 'sprung') {
        const k = bump(u, 0.1, 0.8);
        if (aW) { wY = k * D.sW * 1.4; wOff -= k * D.gap * 0.5; lRx = -bump(u, 0.5, 1) * 0.5; } else { lY = k * D.sL * 1.4; lOff += k * D.gap * 0.5; wRx = -bump(u, 0.5, 1) * 0.5; }
        hit(0.5, true);
      } else if (mv.k === 'stoss') {
        const k = bump(u, 0.15, 0.5);
        if (aW) { wOff -= k * D.gap * 0.25; lOff -= bump(u, 0.4, 1) * D.gap * 0.6; lRx = -bump(u, 0.4, 1) * 0.6; } else { lOff += k * D.gap * 0.25; wOff += bump(u, 0.4, 1) * D.gap * 0.6; wRx = -bump(u, 0.4, 1) * 0.6; }
        pose.push(() => { for (const a of (aW ? rw : rl).arms) a.arm.rotation.x = -1.5 * k; });
        hit(0.4, false);
      } else if (mv.k === 'kopfnuss') {
        const k = bump(u, 0.2, 0.6);
        pose.push(() => { (aW ? rw : rl).torso.rotation.x = 0.6 * k; (aW ? rw : rl).neck.rotation.x = 0.4 * k; (aW ? rl : rw).neck.rotation.x = -0.6 * bump(u, 0.45, 1); });
        if (aW) wOff -= k * D.gap * 0.2; else lOff += k * D.gap * 0.2;
        hit(0.42, true);
      } else {
        // wirbeln: der Angreifer packt und schleudert den anderen einmal herum
        const k = ease(u), spin = k * Math.PI * 1.4 * s;
        D.axis += dt * 1.2 * s;
        if (aW) { lY = bump(u, 0.1, 0.9) * D.sL * 0.8; lRz = bump(u, 0.1, 0.9) * 0.8; } else { wY = bump(u, 0.1, 0.9) * D.sW * 0.8; }
        pose.push(() => { for (const a of (aW ? rw : rl).arms) a.arm.rotation.x = -1.8; });
        hit(0.85, true);
      }
    } else if (t < T_OUT) {
      // Finale: der Sieger beendet den Kampf
      const u = (t - T_FIN) / T_FINLEN;
      if (D.end === 'wuergen') {
        const lift = ease(u / 0.35); lOff = D.gap / 2 - D.gap * 0.28; lY = lift * D.sW * 1.1;
        const kick = Math.max(0, 1 - u * 1.3);
        pose.push(() => {
          for (const a of rw.arms) { a.arm.rotation.x = -1.9; a.elbow.rotation.x = -0.3; }
          rl.arms.forEach((a, i) => { a.arm.rotation.set(-2.4 * kick, 0, (i ? -1 : 1) * (0.2 + (1 - kick) * 0.3)); });
          rl.legs.forEach((l, i) => { l.leg.rotation.x = Math.sin(D.ph * 2 + i * 2) * 0.6 * kick; });
        });
        if (u > 0.85) lMode = 'dead';
      } else if (D.end === 'suplex') {
        const k = ease(L.clamp((u - 0.15) / 0.45, 0, 1)), arc = k * Math.PI, r = D.sW * 1.3;
        lOff = D.gap / 2 - Math.cos(arc) * r - r * 0.2 - D.gap * 0.5 + D.gap * 0.5; lY = Math.sin(arc) * D.sW * 1.6; lRx = arc * 1.05;
        const arch = bump(u, 0.15, 0.95);
        pose.push(() => { for (const a of rw.arms) a.arm.rotation.x = -2.2 * bump(u, 0.05, 0.9); rw.torso.rotation.x = -1.0 * arch; });
        if (u > 0.6) lMode = 'dead';
      } else {
        const up = ease(L.clamp(u / 0.4, 0, 1)), down = ease(L.clamp((u - 0.55) / 0.12, 0, 1));
        lOff = D.gap * 0.15 - down * D.gap * 0.5; lY = up * D.sW * 2.4 * (1 - down); lRz = up * Math.PI / 2;
        pose.push(() => { for (const a of rw.arms) a.arm.rotation.x = -2.9 * up * (1 - down * 0.6); });
        if (u > 0.67) lMode = 'dead';
      }
      const impact = D.end === 'wuergen' ? 0.85 : D.end === 'suplex' ? 0.6 : 0.67;
      if (u > impact && !D.endHit) { D.endHit = true; epicHit({ x: D.x, y: gy + 2, z: D.z }, true); L.snd.stomp({ x: D.x, y: 0, z: D.z }); L.fx('#6a5a40', D.x, gy + 1, D.z, 50, 18, { size: 1.6, life: 2 }); }
      if (u > 0.9 && !D.won) { D.won = true; voice(D.winner, pos); L.banner((D.winner === 'viktor' ? 'VIKTOR' : 'DANIEL') + ' GEWINNT!', { wuergen: 'Erwürgt und fallen gelassen.', suplex: 'Ein gigantischer Suplex!', wurf: 'Hochgestemmt und auf den Boden geschmettert!' }[D.end]); }
      D.lEnd = lOff; D.lEndY = lY; D.lRz = lRz; D.lRx = lRx;
    } else {
      // der Verlierer versinkt im Boden, der Sieger brüllt und geht weg
      const k = (t - T_OUT) / 6;
      lOff = D.lEnd; lMode = 'dead'; lY = (D.lEndY || 0) * Math.max(0, 1 - k * 4) - ease(k) * D.sL * 3.5;
      wMode = k > 0.3 ? 'walk' : 'alert';
      if (k > 0.3) { const w = (k - 0.3) * 6 * D.sW * 1.2; wOff += w; }
      if (Math.random() < dt * 10) L.fx('#5a4630', D.x + ax * lOff + L.rand(-10, 10), gy + 1, D.z + az * lOff + L.rand(-10, 10), 3, 10, { size: 1.2, life: 2 });
      if (k > 0.3) wYaw = D.axis;
    }
    anim(D.loser, rl, { mode: lMode, phase: D.ph, atk: lAtk });
    anim(D.winner, rw, { mode: wMode, phase: D.ph, atk: wAtk });
    for (const f of pose) f();
    rl.root.position.set(D.x + ax * lOff, gy + lY, D.z + az * lOff);
    rw.root.position.set(D.x + ax * wOff, gy + wY + wRise, D.z + az * wOff);
    rl.root.rotation.set(0, lYaw, 0); rl.root.rotateX(lRx); rl.root.rotateZ(lRz);
    rw.root.rotation.set(0, wYaw, 0); rw.root.rotateX(wRx);
    if (t > T_TOTAL) L.endDuel();
  };
})();
