'use strict';
// Nach dem GIGA-CAPY-Kampf: Bosskampf-Kurzfilm „RICHARD gegen DAS RIESEN-WALROSS“ – jedes Mal anders
(function () {
  const L = window.L, T = THREE, P = L.player;
  const G = () => L.GEO;
  function part(geo, color, sx, sy, sz, x, y, z, parent, o) {
    const m = new T.Mesh(geo, L.mat(color, o)); m.scale.set(sx, sy, sz); m.position.set(x, y, z);
    m.castShadow = !(o && o.noShadow); if (parent) parent.add(m); return m;
  }
  const grp = (parent, x, y, z) => { const g = new T.Group(); g.position.set(x || 0, y || 0, z || 0); if (parent) parent.add(g); return g; };
  function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const ease = (k) => 1 - Math.pow(1 - L.clamp(k, 0, 1), 3);
  const bump = (u, a, b) => (u < a || u > b ? 0 : Math.sin((u - a) / (b - a) * Math.PI));

  // ---------- Riesen-Walross (eigener Entwurf): massiger Körper, lange Stoßzähne, Flossen, Schnurrhaare ----------
  L.buildWalross = function () {
    const root = new T.Group(), body = grp(root, 0, 1.1, 0), sph = G().sph, box = G().box, cone = G().cone;
    const sk = '#7a5a4c', lt = '#b08a78', dk = '#4e362c', pale = '#c8a89a';
    part(sph, sk, 1.5, 1.15, 2.3, 0, 0, 0, body);
    part(sph, lt, 1.25, 0.8, 1.9, 0, -0.35, 0.1, body);
    for (let i = 0; i < 6; i++) part(box, dk, 2.6, 0.05, 0.08, 0, 0.2 + (i % 3) * 0.3, -1 + i * 0.35, body, { noShadow: true }).rotation.z = (i % 2 ? 0.2 : -0.2);
    // fleckige, blasse, kranke Haut
    for (let i = 0; i < 16; i++) { const a = i * 2.39, y = Math.sin(i * 1.7) * 0.7; part(sph, i % 3 ? pale : '#8a5a50', 0.35 + (i % 4) * 0.1, 0.25, 0.35, Math.cos(a) * 1.35, y, Math.sin(a) * 1.9, body, { noShadow: true }); }
    const head = grp(body, 0, 0.55, 2.0);
    part(sph, sk, 0.95, 0.85, 0.95, 0, 0.1, 0, head);
    const snout = part(sph, lt, 0.75, 0.5, 0.55, 0, -0.2, 0.7, head);
    // zu breites Maul mit stumpfen, fast menschlichen Zähnen
    part(box, '#1a0606', 1.1, 0.22, 0.2, 0, -0.62, 1.05, head, { noShadow: true });
    for (let k = -4; k <= 4; k++) part(box, '#e8dcc0', 0.1, 0.13, 0.06, k * 0.115, -0.55, 1.15, head, { noShadow: true });
    for (let k = -3; k <= 3; k++) part(box, '#d8c8a8', 0.1, 0.1, 0.06, k * 0.12, -0.7, 1.13, head, { noShadow: true });
    for (const s of [-1, 1]) {
      // blutunterlaufene, fast menschliche Augen mit hängenden Lidern
      part(sph, '#f2ece0', 0.2, 0.17, 0.1, s * 0.42, 0.42, 0.78, head, { noShadow: true });
      part(sph, '#4a3020', 0.08, 0.08, 0.05, s * 0.42, 0.4, 0.86, head, { noShadow: true });
      part(sph, '#050505', 0.04, 0.04, 0.03, s * 0.42, 0.4, 0.9, head, { basic: true, noShadow: true });
      for (let v = 0; v < 3; v++) part(box, '#b01818', 0.12, 0.012, 0.01, s * (0.34 + v * 0.06), 0.36 + v * 0.05, 0.86, head, { basic: true, noShadow: true }).rotation.z = s * (0.4 - v * 0.3);
      part(sph, sk, 0.23, 0.1, 0.12, s * 0.42, 0.52, 0.8, head, { noShadow: true });
      part(sph, '#2a1010', 0.12, 0.06, 0.06, s * 0.42, 0.25, 0.82, head, { noShadow: true });
      const tusk = part(cone, '#f2ead8', 0.12, 1.9, 0.12, s * 0.22, -1.2, 0.95, head); tusk.rotation.x = Math.PI + 0.12;
      for (let k = 0; k < 4; k++) { const w = part(box, '#e8e0d0', 0.6, 0.015, 0.015, s * 0.5, -0.15 - k * 0.07, 1.05, head, { noShadow: true }); w.rotation.y = s * (0.2 + k * 0.05); }
    }
    const flips = [-1, 1].map((s) => { const f = grp(body, s * 1.3, -0.55, 1.1); part(box, dk, 0.2, 0.8, 0.8, s * 0.1, -0.4, 0, f); f.rotation.z = s * 1.0; return f; });
    const tail = grp(body, 0, -0.5, -2.2);
    for (const s of [-1, 1]) part(box, dk, 0.8, 0.15, 0.9, s * 0.45, 0, -0.4, tail).rotation.y = s * 0.4;
    root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    return { root, body, head, flips, tail };
  };
  L.animWalross = animWalross;
  // normales Walross als Monster: hüpft, bäumt sich auf und klatscht zu
  L.animWalrossMon = function (r, st) {
    const m = st.mode, ph = st.phase || 0, ws = { rear: 0, hop: 0, headX: 0, headY: 0, flip: 0, roll: 0 };
    if (m === 'dead') { ws.roll = 1.4; animWalross(r, 0, ws); r.body.position.y = 0.9; return; }
    if (m === 'walk' || m === 'run' || m === 'crawl') { const k = m === 'walk' ? 0.12 : 0.3; ws.hop = Math.abs(Math.sin(ph)) * k; ws.rear = -Math.sin(ph) * k * 0.5; ws.flip = Math.sin(ph) * 0.4; }
    if (m === 'alert') ws.headX = -0.6;
    if (m === 'search') ws.headY = Math.sin(ph * 0.5) * 0.5;
    if (m === 'attack') { const a = st.atk || 0; ws.rear = a < 0.45 ? -0.7 * (a / 0.45) : -0.7 + (a - 0.45) / 0.55 * 0.95; ws.headX = 0.3; }
    animWalross(r, ph, ws);
  };
  function animWalross(r, ph, st) {
    r.body.rotation.set(st.rear || 0, 0, Math.sin(ph * 0.7) * 0.03 + (st.roll || 0));
    r.body.position.y = 1.1 + (st.hop || 0) + Math.abs(Math.sin(ph)) * 0.05;
    r.body.scale.set(1, 1 - Math.sin(ph * 1.3) * 0.02, 1);
    r.head.rotation.set((st.headX || 0) + Math.sin(ph * 0.9) * 0.05, st.headY || 0, 0);
    r.flips.forEach((f, i) => { f.rotation.x = Math.sin(ph * 2 + i) * 0.25 + (st.flip || 0); });
    r.tail.rotation.x = Math.sin(ph * 1.5) * 0.2;
  }

  // ---------- Richard (eigener Charakter): riesiger, bärtiger Kämpfer mit Lederjacke und Stiefeln ----------
  const RICHARD = { name: 'Richard', skin: '#d49e74', hair: 'undercut', hairColor: '#4a2f1c', eyes: '#2a6ac0', brows: 'dick', mouth: 'grinsen', nose: 'gross', beard: 'vollbart',
    glasses: 'keine', hat: 'stirnband', hatColor: '#c02a2a', top: 'tanktop', topColor: '#1a1a1a', pants: 'cargo', pantsColor: '#3a3a2a', shoeType: 'stiefel', shoes: '#4a2f1c', build: 'extrem', height: 'sehr_gross', scar: 'auge' };
  L.RICHARD_APP = RICHARD;

  // ---------- Sounds ----------
  const sndWalross = (p) => { for (let k = 0; k < 3; k++) { L.tn({ f: 95, fTo: 70, dur: 0.35, type: 'sawtooth', vol: 0.3, pos: p, delay: k * 0.42, rev: true, ref: 40 }); L.nz({ dur: 0.3, f: 300, type: 'bandpass', q: 2, vol: 0.25, pos: p, delay: k * 0.42, ref: 40 }); } };
  const sndRichard = (p) => { L.tn({ f: 160, fTo: 230, dur: 0.25, type: 'sawtooth', vol: 0.2, pos: p, ref: 40 }); L.tn({ f: 230, fTo: 140, dur: 0.5, type: 'sawtooth', vol: 0.22, pos: p, delay: 0.25, ref: 40 }); L.nz({ dur: 0.7, f: 900, type: 'bandpass', vol: 0.12, pos: p, ref: 40 }); };
  const sndHit = (p, v) => { L.snd.heavy(p, v || 1); L.nz({ dur: 0.25, f: 1800, fTo: 300, vol: 0.4, pos: p, ref: 40 }); if ((v || 1) >= 1.2) { L.env.bolt = 1; L.snd.thunder(0.05); } L.fx('#ffd080', p.x, p.y, p.z, 20, 12, { basic: true, size: 0.8, life: 0.7 }); };

  // ---------- Ablauf ----------
  const MOVES = ['faust', 'aufwaerts', 'stoss', 'klatscher', 'tritt', 'bruellen'], ENDS = ['schleudern', 'ko', 'platt'];
  const T_IN = 3.5, T_MOVE = 2.8, N_MOVE = 7, T_FIN = T_IN + T_MOVE * N_MOVE, T_FINLEN = 4.5, T_SINK = T_FIN + T_FINLEN + 2, T_TOTAL = T_SINK + 3;
  let F = null;
  L.richardFight = () => F;
  // opts.win: Richard gewinnt sicher (wenn er das Boss-Walross besiegt) · opts.ws: Größe des Walrosses
  L.startRichard = function (x, z, seed, opts) {
    opts = opts || {};
    L.endRichard();
    const R = rng(seed), sr = 13 + R() * 7, sw0 = 6 + R() * 4, sw = opts.ws || sw0;
    const rich = L.buildHuman(RICHARD); rich.root.scale.multiplyScalar(sr); L.scene.add(rich.root);
    const wal = L.buildWalross(); wal.root.scale.setScalar(sw); L.scene.add(wal.root);
    const pool = MOVES.slice(), moves = [];
    for (let i = 0; i < N_MOVE; i++) { if (!pool.length) pool.push(...MOVES); moves.push({ k: pool.splice(Math.floor(R() * pool.length), 1)[0], hit: false }); }
    const r1 = R(), r2 = R(), end = opts.win || r1 < 0.72 ? (r2 < 0.5 ? 'schleudern' : 'ko') : 'platt';
    const axis = R() * Math.PI * 2, gap = sw * 3.6 + sr * 0.9;
    F = { t: 0, x, z, seed, R, rich, wal, sr, sw, moves, end, axis, gap, ph: 0, landed: false, endHit: false, cam: [R(), R(), R()], said: false, noRise: !!opts.win };
    L.banner('RICHARD GEGEN DAS RIESEN-WALROSS', opts.win ? 'Richard kommt, um das Walross zu besiegen!' : 'Ein neuer Kampf beginnt!');
    // Kurzfilm
    const side = axis + Math.PI / 2 * (F.cam[0] < 0.5 ? 1 : -1), size = Math.max(sr * 2.2, sw * 3);
    L.startCine('RICHARD GEGEN DAS WALROSS', T_TOTAL - 0.5, (t) => {
      if (!F) return null;
      const seg = t < T_IN ? 0 : t < T_FIN ? 1 + Math.floor((t - T_IN) / T_MOVE) % 2 : 3;
      const a = side + [0.2, -0.35, 0.45, 0.1][seg] * (0.6 + F.cam[1] * 0.8) + t * 0.02 * (F.cam[2] < 0.5 ? 1 : -1);
      const d = size * [3.2, 2.4, 2.7, 2.9][seg], gy = L.mountainH(F.x, F.z);
      return { x: F.x + Math.sin(a) * d, y: gy + size * 0.9, z: F.z + Math.cos(a) * d, lx: F.x, ly: gy + size * 0.55, lz: F.z };
    });
  };
  L.endRichard = function () { if (F) { L.scene.remove(F.rich.root); L.scene.remove(F.wal.root); F = null; } };
  L.updateRichard = function (dt) {
    if (!F) return;
    F.t += dt; F.ph += dt * 5;
    const t = F.t, { rich, wal, sr, sw } = F, ax = Math.sin(F.axis), az = Math.cos(F.axis), gy = L.mountainH(F.x, F.z);
    const pos = { x: F.x, y: gy + 10, z: F.z };
    let rOff = -F.gap / 2, wOff = F.gap / 2, rY = 0, wY = 0, rRx = 0, rRz = 0, wYaw = F.axis + Math.PI, rYaw = F.axis, rSquash = 1, wRise = 0;
    const ws = { rear: 0, hop: 0, headX: 0, headY: 0, flip: 0, roll: 0 };
    let rMode = 'walk', rPh = F.ph * 0.4;
    const armPose = [];
    // Auftritt: Walross bricht aus dem Boden, Richard landet aus dem Himmel
    if (t < T_IN) {
      wRise = F.noRise ? 0 : -(1 - ease(t / 2.2)) * sw * 3;
      rY = Math.max(0, (1 - t / 1.8)) * 260;
      if (t > 1.8 && !F.landed) { F.landed = true; L.snd.stomp(pos); L.shake = Math.max(L.shake, 1); L.fx('#6a5a40', F.x - ax * F.gap / 2, gy + 1, F.z - az * F.gap / 2, 40, 16, { size: 1.4, life: 2 }); sndRichard(pos); }
      if (t > 2.2 && !F.said) { F.said = true; sndWalross(pos); }
      if (t < 2.2 && Math.random() < dt * 20) L.fx('#5a4630', F.x + ax * F.gap / 2 + L.rand(-10, 10), gy + 1, F.z + az * F.gap / 2 + L.rand(-10, 10), 3, 10, { size: 1.2, life: 2 });
      rMode = t > 1.8 ? 'crouch' : 'jump';
    } else if (t < T_FIN) {
      const i = Math.floor((t - T_IN) / T_MOVE), u = (t - T_IN - i * T_MOVE) / T_MOVE, mv = F.moves[i];
      const hit = (at, fn) => { if (u > at && !mv.hit) { mv.hit = true; fn(); } };
      if (mv.k === 'faust') {
        rOff += bump(u, 0.2, 0.7) * sr * 0.8; armPose.push([0, -1.6 * bump(u, 0.3, 0.7), 0]);
        ws.headX = -0.4 * bump(u, 0.45, 1); wOff += bump(u, 0.45, 1) * sw * 0.6;
        hit(0.45, () => { sndHit(pos); sndWalross(pos); L.shake = Math.max(L.shake, 0.6); });
      } else if (mv.k === 'aufwaerts') {
        rOff += bump(u, 0.1, 0.7) * sr * 0.7; rMode = u < 0.4 ? 'crouch' : 'walk'; armPose.push([0, u < 0.4 ? 0.5 : -3 * bump(u, 0.4, 0.8), 0]);
        ws.headX = -0.8 * bump(u, 0.45, 1); ws.rear = -0.25 * bump(u, 0.45, 1);
        hit(0.45, () => { sndHit(pos, 1.2); L.shake = Math.max(L.shake, 0.8); });
      } else if (mv.k === 'stoss') {
        wOff -= bump(u, 0.15, 0.6) * sw * 1.2; ws.headX = 0.5 * bump(u, 0.15, 0.6);
        rOff -= bump(u, 0.4, 1) * sr * 1; rRx = -0.35 * bump(u, 0.4, 1); armPose.push([0, -1.4, 0], [1, -1.4, 0]);
        hit(0.4, () => { sndHit(pos); sndRichard(pos); });
      } else if (mv.k === 'klatscher') {
        ws.rear = -0.7 * bump(u, 0.05, 0.55) + 0.25 * bump(u, 0.55, 0.8); wOff -= bump(u, 0.4, 0.8) * sw * 0.8; ws.hop = sw * 0.06 * bump(u, 0.05, 0.55);
        const dodge = bump(u, 0.35, 1) * sr * 2.2 * (F.cam[1] < 0.5 ? 1 : -1); rOff -= bump(u, 0.35, 1) * sr * 0.3;
        F.dodge = dodge; rMode = 'run';
        hit(0.6, () => { L.snd.stomp(pos); L.shake = Math.max(L.shake, 1.1); L.fx('#6a5a40', F.x, gy + 1, F.z, 30, 14, { size: 1.3, life: 1.6 }); });
      } else if (mv.k === 'tritt') {
        rY = bump(u, 0.15, 0.75) * sr * 1.6; rOff += bump(u, 0.15, 0.75) * sr * 1.2; rRx = -1.1 * bump(u, 0.2, 0.75); rMode = 'jump';
        ws.headX = -0.4 * bump(u, 0.5, 1); wOff += bump(u, 0.5, 1) * sw * 0.8; ws.roll = 0.2 * bump(u, 0.5, 1);
        hit(0.5, () => { sndHit(pos, 1.2); sndWalross(pos); L.shake = Math.max(L.shake, 0.9); });
      } else {
        ws.headX = -0.7 * bump(u, 0.05, 0.9); ws.flip = -0.6 * bump(u, 0.1, 0.9);
        armPose.push([0, -2.6 * bump(u, 0.2, 0.9), 0.4], [1, -2.6 * bump(u, 0.2, 0.9), -0.4]); rOff -= bump(u, 0.2, 0.9) * sr * 0.4;
        hit(0.1, () => { sndWalross(pos); setTimeout(() => sndWalross(pos), 900); });
      }
      if (mv.k !== 'klatscher') F.dodge = (F.dodge || 0) * 0.9;
    } else if (t < T_FIN + T_FINLEN) {
      const u = (t - T_FIN) / T_FINLEN;
      if (F.end === 'schleudern') {
        // Richard packt die Stoßzähne und schleudert das Walross im Kreis – dann lässt er los
        const spin = ease(L.clamp((u - 0.1) / 0.55, 0, 1)) * Math.PI * 3, rel = L.clamp((u - 0.65) / 0.25, 0, 1);
        const rad = F.gap * 0.55 + rel * F.gap * 2.5;
        rOff = 0; armPose.push([0, -1.6, 0], [1, -1.6, 0]); rYaw = F.axis + spin;
        const wa = F.axis + spin; F.wPos = [F.x + Math.sin(wa) * rad, F.z + Math.cos(wa) * rad]; wY = Math.sin(L.clamp((u - 0.1) / 0.55, 0, 1) * Math.PI) * sw * 1.5 + bump(rel, 0, 1) * sw * 3;
        wYaw = wa + Math.PI / 2; ws.roll = rel * 1.2;
        if (u > 0.9 && !F.endHit) { F.endHit = true; L.snd.stomp(pos); L.snd.crash(1, pos); L.shake = Math.max(L.shake, 1.3); sndRichard(pos); }
      } else if (F.end === 'ko') {
        // gewaltiger Aufwärtshaken – das Walross fliegt hoch und kracht zu Boden
        rOff += bump(u, 0, 0.3) * sr * 0.8; armPose.push([0, u < 0.15 ? 0.6 : -3.1 * bump(u, 0.15, 0.6), 0]); rMode = u < 0.15 ? 'crouch' : 'walk';
        const fly = L.clamp((u - 0.2) / 0.6, 0, 1); wY = Math.sin(fly * Math.PI) * sw * 4; wOff += fly * F.gap; ws.rear = -fly * 2.4; ws.roll = fly * 0.6;
        if (u > 0.2 && !F.endHit) { F.endHit = true; sndHit(pos, 1.4); sndWalross(pos); L.shake = Math.max(L.shake, 1); }
        if (u > 0.8 && !F.endHit2) { F.endHit2 = true; L.snd.stomp(pos); L.shake = Math.max(L.shake, 1.3); }
      } else {
        // Bauchklatscher: das Walross springt und begräbt Richard unter sich
        const jump = L.clamp((u - 0.1) / 0.5, 0, 1); wOff = L.lerp(F.gap / 2, -F.gap / 2 + sw * 0.4, ease(jump)); wY = Math.sin(jump * Math.PI) * sw * 2.5; ws.rear = -0.3 * Math.sin(jump * Math.PI);
        armPose.push([0, -2.8, 0.3], [1, -2.8, -0.3]);
        if (u > 0.6) { rSquash = 0.25; rMode = 'dead'; }
        if (u > 0.6 && !F.endHit) { F.endHit = true; L.snd.stomp(pos); L.snd.crash(1, pos); L.shake = Math.max(L.shake, 1.4); sndWalross(pos); }
      }
      if (u > 0.92 && !F.won) { F.won = true; L.banner(F.end === 'platt' ? 'DAS WALROSS GEWINNT!' : 'RICHARD GEWINNT!', F.end === 'platt' ? 'Bauchklatscher – Richard ist platt.' : F.end === 'ko' ? 'K.o. mit einem riesigen Aufwärtshaken!' : 'Am Stoßzahn gepackt und weggeschleudert!'); }
    } else {
      // Sieger-Pose
      if (F.end === 'platt') { rSquash = 0.25; rMode = 'dead'; ws.headX = -0.6; ws.flip = -0.5; wOff = -F.gap / 2 + sw * 0.4; }
      else { armPose.push([0, -2.9, 0.3], [1, -2.9, -0.3]); if (F.end === 'schleudern') { rOff = 0; } else wOff += F.gap; }
    }
    // am Ende versinken beide
    const sink = t > T_SINK ? ease((t - T_SINK) / 2.5) : 0;
    // Richard
    L.animHuman(rich, { mode: rMode, phase: rPh, speed: rMode === 'run' ? 1 : 0.3 });
    for (const [i, x, z] of armPose) { rich.arms[i].arm.rotation.x = x; rich.arms[i].arm.rotation.z = z; }
    const dz = F.dodge || 0, px = -az, pz = ax;
    rich.root.position.set(F.x + ax * rOff + px * dz, gy + rY - sink * sr * 3, F.z + az * rOff + pz * dz);
    rich.root.rotation.set(0, rYaw, 0); rich.root.rotateX(rRx); rich.root.rotateZ(rRz);
    rich.root.scale.set(rich.root.scale.x, rich.root.scale.x * rSquash, rich.root.scale.x);
    // Walross
    animWalross(wal, F.ph, ws);
    const wx = F.wPos && F.end === 'schleudern' && t >= T_FIN + 0.45 ? F.wPos[0] : F.x + ax * wOff, wz = F.wPos && F.end === 'schleudern' && t >= T_FIN + 0.45 ? F.wPos[1] : F.z + az * wOff;
    wal.root.position.set(wx, gy + wY + wRise - sink * sw * 3, wz);
    wal.root.rotation.set(0, wYaw, 0);
    rich.root.visible = wal.root.visible = sink < 0.98;
    if (t > T_TOTAL) L.endRichard();
  };
})();
