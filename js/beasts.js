'use strict';
// Neue Monster (eigene Entwürfe): Der Gesichtslose, Der Rufer, Blockling, Schwellengänger,
// Greifer und Flugmaschine (beide nach H. G. Wells' „Krieg der Welten“) – plus die Fusion zu MAMA IVA
(function () {
  const L = window.L, T = THREE;
  const G = () => L.GEO;
  function part(geo, color, sx, sy, sz, x, y, z, parent, o) {
    const m = new T.Mesh(geo, L.mat(color, o));
    m.scale.set(sx, sy, sz); m.position.set(x, y, z);
    m.castShadow = !(o && o.noShadow);
    if (parent) parent.add(m);
    return m;
  }
  const grp = (parent, x, y, z) => { const g = new T.Group(); g.position.set(x || 0, y || 0, z || 0); if (parent) parent.add(g); return g; };
  const glow = { basic: true, noShadow: true };

  // Gliedmaßen: Ober- und Unterteil als Kästen, Gelenke als Gruppen
  function limb(parent, x, y, z, w, l1, l2, color, color2, foot) {
    const a = grp(parent, x, y, z);
    part(G().box, color, w, l1, w, 0, -l1 / 2, 0, a);
    const b = grp(a, 0, -l1, 0);
    part(G().box, color2 || color, w * 0.85, l2, w * 0.85, 0, -l2 / 2, 0, b);
    if (foot) part(G().box, foot, w * 1.1, w * 0.5, w * 2, 0, -l2, w * 0.5, b);
    return { a, b };
  }
  function rigOut(root, body, hips, torso, head, legs, arms, hipY, extra) {
    root.traverse((o) => { if (o.isMesh && o.castShadow !== false) o.castShadow = true; });
    return Object.assign({ root, body, hips, torso, head, legs: legs.map((l) => ({ leg: l.a, knee: l.b })), arms: arms.map((l) => ({ arm: l.a, elbow: l.b })), hipY }, extra || {});
  }

  // ---------- Der Gesichtslose: sehr groß, dünn, grauer Mantel, kein Gesicht ----------
  L.buildLanger = function () {
    const root = new T.Group(), body = grp(root), hipY = 1.8, hips = grp(body, 0, hipY, 0), box = G().box, sph = G().sph;
    const coat = '#3a3c40', dark = '#1c1d20', skin = '#e9e6e0';
    const legs = [-1, 1].map((s) => limb(hips, s * 0.1, 0, 0, 0.09, 0.92, 0.88, dark, dark, '#101010'));
    const torso = grp(hips);
    part(box, coat, 0.36, 1.05, 0.2, 0, 0.52, 0, torso);
    part(box, coat, 0.42, 0.9, 0.22, 0, -0.2, 0, torso); // Mantelschoß
    part(box, '#2a2b2e', 0.04, 1.3, 0.21, 0, 0.3, 0.01, torso, { noShadow: true });
    for (let i = 0; i < 3; i++) part(box, '#1a1a1a', 0.42, 0.05, 0.23, 0, -0.55 + i * 0.12, 0, torso, { noShadow: true });
    const arms = [-1, 1].map((s) => limb(torso, s * 0.23, 1.0, 0, 0.07, 1.1, 1.05, coat, skin));
    for (const a of arms) for (let f = 0; f < 4; f++) { const fg = part(box, skin, 0.018, 0.32, 0.018, (f - 1.5) * 0.025, -1.2, 0, a.b); fg.rotation.z = (f - 1.5) * 0.12; }
    const neck = grp(torso, 0, 1.05, 0);
    part(box, skin, 0.07, 0.22, 0.07, 0, 0.1, 0, neck);
    const head = grp(neck, 0, 0.22, 0);
    part(sph, skin, 0.16, 0.26, 0.17, 0, 0.22, 0, head);
    part(box, '#d2cec6', 0.005, 0.18, 0.01, 0, 0.2, 0.165, head, { noShadow: true }); // feiner Riss statt Gesicht
    return rigOut(root, body, hips, torso, head, legs, arms, hipY, { kind: 'langer' });
  };

  // ---------- Der Rufer: 9 m hoch, ausgemergelt, statt Kopf ein großes Horn ----------
  L.buildRufer = function () {
    const root = new T.Group(), body = grp(root), hipY = 4.6, hips = grp(body, 0, hipY, 0), box = G().box, sph = G().sph, cone = G().cone;
    const sk = '#6f6252', dk = '#4a3f33';
    const legs = [-1, 1].map((s) => limb(hips, s * 0.35, 0, 0, 0.32, 2.35, 2.3, sk, dk, dk));
    const torso = grp(hips);
    part(box, sk, 0.9, 1.2, 0.5, 0, 0.6, 0, torso);
    part(box, sk, 1.3, 1.6, 0.65, 0, 1.9, 0, torso);
    for (let i = 0; i < 5; i++) part(box, dk, 1.32, 0.08, 0.67, 0, 1.4 + i * 0.25, 0, torso, { noShadow: true }); // Rippen
    const arms = [-1, 1].map((s) => limb(torso, s * 0.8, 2.6, 0, 0.24, 2.6, 2.6, sk, dk));
    for (const a of arms) for (let f = 0; f < 3; f++) { const fg = part(box, dk, 0.08, 0.9, 0.08, (f - 1) * 0.1, -2.95, 0, a.b); fg.rotation.z = (f - 1) * 0.2; }
    const neck = grp(torso, 0, 2.7, 0);
    part(G().cyl, dk, 0.18, 2.2, 0.18, 0, 1.1, 0, neck);
    const head = grp(neck, 0, 2.2, 0);
    // Horn: Trichter nach vorne, innen glühend
    const horn = part(cone, '#8a6a3a', 0.9, 1.8, 0.9, 0, 0.3, 0.6, head, { metal: 0.6, rough: 0.45 }); horn.rotation.x = -Math.PI / 2;
    part(G().cyl, '#ffcc66', 0.8, 0.05, 0.8, 0, 0.3, 1.48, head, glow).rotation.x = Math.PI / 2;
    part(sph, dk, 0.4, 0.4, 0.4, 0, 0.3, -0.4, head);
    return rigOut(root, body, hips, torso, head, legs, arms, hipY, { kind: 'rufer' });
  };

  // ---------- Blockling: klassischer kantiger grüner Alien ----------
  L.buildBlockling = function () {
    const root = new T.Group(), body = grp(root), hipY = 0.75, hips = grp(body, 0, hipY, 0), box = G().box, sph = G().sph;
    const gr = '#5fbf3a', dg = '#3f8a26';
    const legs = [-1, 1].map((s) => limb(hips, s * 0.13, 0, 0, 0.2, 0.38, 0.36, gr, dg, '#2a2a2a'));
    const torso = grp(hips);
    part(box, '#b8bec8', 0.48, 0.1, 0.27, 0, 0.05, 0, torso, { metal: 0.6, rough: 0.4 });
    part(box, gr, 0.46, 0.6, 0.25, 0, 0.4, 0, torso);
    part(box, '#7fe05a', 0.15, 0.15, 0.02, 0, 0.45, 0.13, torso, glow);
    const arms = [-1, 1].map((s) => limb(torso, s * 0.33, 0.66, 0, 0.18, 0.32, 0.32, gr, dg));
    const neck = grp(torso, 0, 0.72, 0);
    const head = grp(neck, 0, 0, 0);
    part(box, gr, 0.5, 0.46, 0.46, 0, 0.25, 0, head);
    for (const s of [-1, 1]) {
      part(box, '#050505', 0.15, 0.2, 0.02, s * 0.12, 0.28, 0.235, head, { noShadow: true });
      part(box, '#ffffff', 0.04, 0.05, 0.01, s * 0.1, 0.33, 0.246, head, glow);
      const an = part(box, dg, 0.03, 0.3, 0.03, s * 0.15, 0.6, 0, head); an.rotation.z = -s * 0.3;
      part(sph, '#ffe040', 0.06, 0.06, 0.06, s * 0.2, 0.75, 0, head, glow);
    }
    part(box, '#050505', 0.14, 0.02, 0.02, 0, 0.12, 0.235, head, { noShadow: true });
    return rigOut(root, body, hips, torso, head, legs, arms, hipY, { kind: 'blockling' });
  };

  // ---------- Schwellengänger: bleich, lang, läuft auf allen vieren ----------
  L.buildSchwelle = function () {
    const root = new T.Group(), body = grp(root), hipY = 1.05, hips = grp(body, 0, hipY, -0.6), box = G().box, sph = G().sph;
    const sk = '#d8d2c6', dk = '#a49c8e';
    const torso = grp(hips);
    part(box, sk, 0.42, 0.3, 1.5, 0, 0.05, 0.7, torso);
    for (let i = 0; i < 6; i++) part(box, dk, 0.08, 0.06, 0.08, 0, 0.22, 0.1 + i * 0.24, torso, { noShadow: true }); // Wirbelsäule
    const legs = [-1, 1].map((s) => limb(hips, s * 0.2, 0, 0, 0.12, 0.6, 0.55, sk, dk, dk));
    const arms = [-1, 1].map((s) => limb(torso, s * 0.24, 0, 1.4, 0.1, 0.62, 0.6, sk, dk));
    for (const a of arms) for (let f = 0; f < 4; f++) { const fg = part(box, dk, 0.025, 0.04, 0.3, (f - 1.5) * 0.04, -0.6, 0.15, a.b); fg.rotation.y = (f - 1.5) * 0.15; }
    const neck = grp(torso, 0, 0.1, 1.45);
    part(box, sk, 0.12, 0.12, 0.45, 0, 0.05, 0.2, neck);
    const head = grp(neck, 0, 0.05, 0.45);
    part(sph, sk, 0.17, 0.2, 0.24, 0, 0, 0.1, head);
    for (const s of [-1, 1]) part(sph, '#f6ffe0', 0.04, 0.05, 0.03, s * 0.08, 0.05, 0.31, head, glow);
    part(box, '#200808', 0.14, 0.05, 0.02, 0, -0.08, 0.32, head, { noShadow: true });
    return rigOut(root, body, hips, torso, head, legs, arms, hipY, { kind: 'schwelle', quad: true });
  };

  // ---------- Greifer: Metallkörper auf fünf Beinen mit Greifarmen (Krieg der Welten) ----------
  L.buildGreifer = function () {
    const root = new T.Group(), body = grp(root), hipY = 2.6, hips = grp(body, 0, hipY, 0), box = G().box, sph = G().sph, cyl = G().cyl;
    const met = { metal: 0.75, rough: 0.35 }, mc = '#6e7076', dk = '#3a3c40';
    const torso = grp(hips);
    part(sph, mc, 1.5, 0.9, 1.7, 0, 0.5, 0, torso, met);
    part(cyl, dk, 1.55, 0.3, 1.55, 0, 0.2, 0, torso, met);
    part(sph, '#7cff6a', 0.35, 0.25, 0.2, 0, 0.7, 1.55, torso, glow);
    const legs = [];
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.3, g = grp(hips, Math.sin(a) * 1.2, 0.1, Math.cos(a) * 1.2);
      g.rotation.y = a;
      const l = limb(g, 0, 0, 0, 0.16, 1.7, 1.6, mc, dk);
      l.a.rotation.x = 0.55; l.b.rotation.x = -0.75;
      legs.push(l);
    }
    const arms = [];
    for (const s of [-1, 0, 1]) {
      const l = limb(torso, s * 0.7, 0.4, 1.2, 0.1, 1.4, 1.4, '#55575c', '#55575c');
      for (let f = 0; f < 3; f++) { const c = part(box, '#2a2c30', 0.05, 0.4, 0.05, 0, -1.55, 0, l.b); c.rotation.z = (f - 1) * 0.5; }
      arms.push(l);
    }
    const head = grp(torso, 0, 1.2, 0);
    part(cyl, dk, 0.4, 0.4, 0.4, 0, 0, 0, head, met);
    return rigOut(root, body, hips, torso, head, legs, arms, hipY, { kind: 'greifer', multi: true });
  };

  // ---------- Flugmaschine: schwebende Scheibe mit Suchlicht (Krieg der Welten) ----------
  L.buildFlieger = function () {
    const root = new T.Group(), body = grp(root), hipY = 16, hips = grp(body, 0, hipY, 0), sph = G().sph, cyl = G().cyl, cone = G().cone, box = G().box;
    const met = { metal: 0.8, rough: 0.3 };
    const torso = grp(hips);
    part(cyl, '#5c5f66', 3.6, 0.5, 3.6, 0, 0, 0, torso, met);
    part(sph, '#7a7d84', 2.0, 1.0, 2.0, 0, 0.3, 0, torso, met);
    part(sph, '#2a3a2a', 1.1, 0.6, 1.1, 0, -0.35, 0, torso, met);
    const ring = grp(torso);
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; part(box, '#7cff6a', 0.35, 0.15, 0.6, Math.sin(a) * 3.55, 0, Math.cos(a) * 3.55, ring, glow).rotation.y = a; }
    for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; const f = part(box, '#44464c', 0.2, 1.2, 1.6, Math.sin(a) * 2.6, -0.6, Math.cos(a) * 2.6, torso, met); f.rotation.y = a; }
    const head = grp(torso, 0, -0.6, 0);
    part(sph, '#e8ffd0', 0.45, 0.45, 0.45, 0, 0, 0, head, glow);
    // Lichtkegel nach unten
    const beam = part(cone, '#d8ffb0', 6, 16, 6, 0, -8, 0, torso, { basic: true, noShadow: true, opacity: 0.12 });
    beam.material.depthWrite = false;
    return rigOut(root, body, hips, torso, head, [], [], hipY, { kind: 'flieger', ring, beamCone: beam, fly: true });
  };

  // ---------- Bewegung für alle neuen Monster ----------
  L.animBeast = function (r, st) {
    const m = st.mode, ph = st.phase || 0, sc = r.root.scale.x;
    r.body.rotation.set(0, 0, 0); r.body.position.set(0, 0, 0);
    r.hips.position.y = r.hipY; r.torso.rotation.set(0, 0, 0); r.head.rotation.set(0, 0, 0);
    if (r.fly) {
      r.body.position.y = Math.sin(ph * 0.6) * 0.6;
      r.ring.rotation.y = ph * 0.8;
      r.torso.rotation.z = Math.sin(ph * 0.4) * 0.05;
      r.beamCone.visible = m !== 'dead';
      if (m === 'dead') { r.body.position.y = -r.hipY + 0.5; r.torso.rotation.z = 0.4; }
      return;
    }
    const legs = r.legs, arms = r.arms, n = legs.length;
    for (const l of legs) { if (!r.multi) l.leg.rotation.set(0, 0, 0); l.knee.rotation.set(r.multi ? -0.75 : 0, 0, 0); }
    if (r.multi) for (const l of legs) l.leg.rotation.set(0.55, 0, 0);
    for (const a of arms) { a.arm.rotation.set(0, 0, 0); a.elbow.rotation.set(0, 0, 0); }
    if (m === 'dead') {
      r.body.rotation.x = r.quad || r.multi ? 0 : -Math.PI / 2; r.body.position.y = r.quad || r.multi ? -r.hipY * 0.6 : 0.15;
      if (!r.quad && !r.multi) r.body.position.z = -r.hipY * 0.8;
      for (const a of arms) a.arm.rotation.z = 0.9;
      return;
    }
    const run = m === 'run' || m === 'crawl', moving = m === 'walk' || run;
    const amp = run ? 0.75 : 0.4, sp = run ? 1 : 0.7;
    if (moving) {
      for (let i = 0; i < n; i++) {
        const off = r.multi ? i * Math.PI * 2 / n : i * Math.PI, w = Math.sin(ph * sp + off);
        if (r.multi) { legs[i].leg.rotation.x = 0.55 + w * 0.35; legs[i].knee.rotation.x = -0.75 + Math.max(0, -w) * 0.5; }
        else { legs[i].leg.rotation.x = w * amp; legs[i].knee.rotation.x = Math.max(0, -w) * amp * 1.3; }
      }
      r.body.position.y = Math.abs(Math.sin(ph * sp)) * 0.06 * r.hipY;
      if (r.quad) arms.forEach((a, i) => { const w = Math.sin(ph * sp + i * Math.PI + 1.5); a.arm.rotation.x = w * amp; a.elbow.rotation.x = -Math.max(0, w) * amp; });
      else if (r.multi) arms.forEach((a, i) => { a.arm.rotation.x = -0.6 + Math.sin(ph * 0.8 + i) * 0.3; a.elbow.rotation.x = -0.4 + Math.sin(ph + i) * 0.3; });
      else arms.forEach((a, i) => { a.arm.rotation.x = -Math.sin(ph * sp + i * Math.PI) * amp * 0.8; a.elbow.rotation.x = -0.3; });
      if (run && !r.quad && !r.multi) r.torso.rotation.x = 0.25;
    }
    if (m === 'search' || m === 'listen') { r.head.rotation.y = Math.sin(ph * 0.7) * 0.7; r.head.rotation.x = 0.15; }
    if (m === 'alert') { r.head.rotation.z = Math.sin(ph * 9) * 0.15; for (const a of arms) a.arm.rotation.x = -0.9; r.torso.rotation.x = -0.1; }
    if (m === 'attack') {
      const k = st.atk || 0, up = k < 0.45 ? k / 0.45 : 1 - (k - 0.45) / 0.55 * 1.4;
      if (r.quad) { r.torso.rotation.x = -0.35 * up; for (const a of arms) a.arm.rotation.x = -1.4 * up; }
      else for (const a of arms) { a.arm.rotation.x = -2.6 * up; a.elbow.rotation.x = -0.4; }
      r.torso.rotation.x += r.quad ? 0 : 0.3 * Math.max(0, -up + 0.4);
    }
    // Der Gesichtslose kippt den Kopf beim Jagen
    if (r.kind === 'langer' && (m === 'run' || m === 'alert')) r.head.rotation.z = 0.35;
  };

  // ---------- Fusion: alle Monster fliegen zusammen und verschmelzen zu MAMA IVA ----------
  // läuft 5 Sekunden, danach steigt MAMA IVA auf
  L.FUSION_T = 5;
  let fusion = null;
  L.fusionStart = function (x, z) {
    L.fusionEnd();
    const gy = L.mountainH ? L.mountainH(x, z) : 0, g = new T.Group(); L.scene.add(g);
    const list = [
      [L.buildViktor('grey'), 3.2], [L.buildViktor('red'), 3.2], [L.buildDaniel(), 3], [L.buildLanger(), 2.6], [L.buildRufer(), 1.1],
      [L.buildBlockling(), 4.5], [L.buildSchwelle(), 3.5], [L.buildGreifer(), 1.8], [L.buildFlieger(), 0.9], [L.buildWalker(), 0.32]
    ];
    // vom Stelzer nur der Rumpf (die Beine werden sonst erst beim Laufen ausgerichtet)
    const wk = list[list.length - 1][0];
    for (const l of wk.legs) for (const k of ['up', 'low', 'knee', 'foot', 'glow']) l[k].visible = false;
    wk.cone.visible = wk.spot.visible = wk.beam.g.visible = false;
    const parts = list.map(([rig, s], i) => {
      rig.root.scale.setScalar(s); g.add(rig.root);
      const a = i / list.length * Math.PI * 2;
      return { rig, s, a, r0: 75 + (i % 3) * 12 };
    });
    const orb = new T.Mesh(new T.SphereGeometry(1, 20, 14), new T.MeshBasicMaterial({ color: 0xff5020, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false }));
    g.add(orb);
    fusion = { t: 0, x, z, gy, g, parts, orb, boomed: false };
    L.snd.horn({ x, y: gy + 30, z });
  };
  L.fusionEnd = function () { if (fusion) { L.scene.remove(fusion.g); fusion = null; } };
  L.fusionInfo = () => fusion;
  L.updateFusion = function (dt) {
    const F = fusion; if (!F) return;
    F.t += dt;
    const t = F.t, cy = F.gy + 32;
    const pull = Math.min(1, t / 3.6), e = pull * pull * (3 - 2 * pull);
    for (const p of F.parts) {
      const a = p.a + t * (0.6 + e * 3.5), r = p.r0 * (1 - e);
      p.rig.root.position.set(F.x + Math.sin(a) * r, F.gy + 2 + (cy - F.gy - 2) * e, F.z + Math.cos(a) * r);
      p.rig.root.rotation.set(e * 1.2, a + Math.PI, e * 0.8);
      p.rig.root.scale.setScalar(p.s * Math.max(0.02, 1 - Math.max(0, (t - 2.6) / 1.1)));
      p.rig.root.visible = t < 3.75;
    }
    const o = F.orb;
    o.position.set(F.x, cy - Math.max(0, t - 4.2) * 45, F.z);
    const grow = t < 2.4 ? 0 : t < 4.2 ? (t - 2.4) / 1.8 : 1;
    o.scale.setScalar(2 + grow * 13 + Math.sin(t * 20) * grow);
    o.material.opacity = t < 4.2 ? grow * 0.85 : Math.max(0, 0.85 - (t - 4.2) * 1.2);
    if (Math.random() < dt * 25 && t < 4.2) L.fx(Math.random() < 0.5 ? '#ff6a2a' : '#7cff6a', F.x + L.rand(-20, 20), cy + L.rand(-10, 10), F.z + L.rand(-20, 20), 2, 6, { basic: true, size: 0.6, life: 1 });
    if (t > 4.2 && !F.boomed) {
      F.boomed = true;
      L.snd.bossRoar({ x: F.x, y: cy, z: F.z }); L.snd.explosion({ x: F.x, y: cy, z: F.z });
      L.env.boom.position.set(F.x, cy, F.z); L.env.boom.intensity = 9;
      L.shake = Math.max(L.shake, 0.7);
      L.fx('#ff8040', F.x, cy, F.z, 60, 30, { basic: true, size: 1.2, life: 1.4 });
    }
    if (t > L.FUSION_T + 0.5) L.fusionEnd();
  };
})();
