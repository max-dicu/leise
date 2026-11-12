'use strict';
// Wegpunkt wie in GTA: auf der Karte markieren, eine lila Route führt dich hin (über Straßen, um Häuser herum)
(function () {
  const L = window.L, T = THREE, P = L.player;
  const CELL = 15, H = L.HALF, N = Math.ceil(H * 2 / CELL);
  let grid = null;
  L.waypoint = null; L.route = null;
  // Kosten je Zelle: Straße billig, Gelände teurer, Gebäude/Zaun/Wasser gesperrt
  function buildGrid() {
    grid = new Float32Array(N * N);
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      const x = -H + (i + 0.5) * CELL, z = -H + (j + 0.5) * CELL;
      let c = L.onRoad(x, z) ? 1 : 3.2;
      for (const b of L.queryBoxes(x, z, 4)) if (b.kind === 'building' || b.kind === 'fence' || b.kind === 'water') { c = 0; break; }
      grid[i * N + j] = c;
    }
  }
  const toCell = (x, z) => [L.clamp(Math.floor((x + H) / CELL), 0, N - 1), L.clamp(Math.floor((z + H) / CELL), 0, N - 1)];
  const inHome = (x, z) => Math.abs(x) < H - 10 && Math.abs(z) < H - 10;
  // A*-Suche mit kleinem Heap
  function astar(sx, sz, tx, tz) {
    if (!grid) buildGrid();
    const [si, sj] = toCell(sx, sz), [ti, tj] = toCell(tx, tz), S = si * N + sj, Tg = ti * N + tj;
    const g = new Float32Array(N * N).fill(1e9), from = new Int32Array(N * N).fill(-1), closed = new Uint8Array(N * N);
    const heap = [], push = (k, f) => { heap.push([f, k]); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = i * 2 + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
    const h = (k) => Math.hypot(Math.floor(k / N) - ti, k % N - tj);
    g[S] = 0; push(S, h(S));
    let steps = 0;
    while (heap.length && steps++ < 60000) {
      const [, k] = pop(); if (closed[k]) continue; closed[k] = 1;
      if (k === Tg) break;
      const i = Math.floor(k / N), j = k % N;
      for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
        if (!di && !dj) continue;
        const ni = i + di, nj = j + dj; if (ni < 0 || nj < 0 || ni >= N || nj >= N) continue;
        const nk = ni * N + nj, c = grid[nk]; if (!c && nk !== Tg) continue;
        const ng = g[k] + (c || 3) * (di && dj ? 1.414 : 1);
        if (ng < g[nk]) { g[nk] = ng; from[nk] = k; push(nk, ng + h(nk)); }
      }
    }
    if (from[Tg] < 0 && Tg !== S) return null;
    const pts = []; let k = Tg;
    while (k >= 0) { pts.push([-H + (Math.floor(k / N) + 0.5) * CELL, -H + (k % N + 0.5) * CELL]); if (k === S) break; k = from[k]; }
    pts.reverse();
    // Punkte ausdünnen
    const out = [[sx, sz]]; for (let n = 1; n < pts.length - 1; n += 2) out.push(pts[n]); out.push([tx, tz]);
    return out;
  }
  function computeRoute() {
    const w = L.waypoint; if (!w) { L.route = null; return; }
    if (inHome(P.x, P.z) && inHome(w.x, w.z)) L.route = astar(P.x, P.z, w.x, w.z) || [[P.x, P.z], [w.x, w.z]];
    else L.route = [[P.x, P.z], [w.x, w.z]]; // über das Meer / zu den Inseln: direkter Weg
  }
  // Wegpunkt setzen / entfernen
  let beam = null;
  L.setWaypoint = function (x, z) {
    if (L.waypoint && Math.hypot(x - L.waypoint.x, z - L.waypoint.z) < (inHome(x, z) ? 40 : 250)) { L.clearWaypoint(); L.msg('📍 Wegpunkt entfernt', 1500); return; }
    L.waypoint = { x, z }; L.routeT = 0; computeRoute();
    if (!beam) {
      beam = new T.Mesh(new T.CylinderGeometry(1.6, 2.4, 260, 12, 1, true), new T.MeshBasicMaterial({ color: 0xc040ff, transparent: true, opacity: 0.45, blending: T.AdditiveBlending, depthWrite: false, fog: false }));
      L.scene.add(beam);
    }
    beam.visible = true; beam.position.set(x, 130, z);
    L.snd.key(); L.msg('📍 Wegpunkt gesetzt – folge der lila Route', 2500);
  };
  L.clearWaypoint = function () { L.waypoint = null; L.route = null; if (beam) beam.visible = false; };
  L.updateWaypoint = function (dt) {
    const w = L.waypoint; if (!w) return;
    const d = Math.hypot(P.x - w.x, P.z - w.z);
    if (d < 14) { L.clearWaypoint(); L.msg('✅ Ziel erreicht', 2500); L.snd.codeOk(); return; }
    L.routeT = (L.routeT || 0) - dt;
    if (L.routeT <= 0) { L.routeT = 1.5; computeRoute(); }
    else if (L.route && L.route.length) L.route[0] = [P.x, P.z];
    if (beam) beam.material.opacity = 0.35 + Math.sin(performance.now() / 300) * 0.12;
  };
  L.updateNav = function (dt) { L.updateWaypoint(dt); L.updateCompass(dt); };
  // ---------- Kompass oben im Bild: Himmelsrichtungen, Inseln, Heimat, Turm, Portal, Wegpunkt ----------
  const comp = document.createElement('div'); comp.id = 'compass'; comp.hidden = true; document.body.appendChild(comp);
  const cst = document.createElement('style');
  cst.textContent = '#compass{position:fixed;top:4px;left:50%;transform:translateX(-50%);width:min(520px,70vw);height:40px;overflow:hidden;background:linear-gradient(90deg,transparent,rgba(0,0,0,.55) 15%,rgba(0,0,0,.55) 85%,transparent);z-index:5;pointer-events:none;font-family:inherit}'
    + '#compass span{position:absolute;top:2px;transform:translateX(-50%);color:#fff;font-size:15px;text-align:center;white-space:nowrap;line-height:1.05;text-shadow:0 0 3px #000}'
    + '#compass span small{display:block;font-size:10px;opacity:.85}#compass span.card{font-weight:800;color:#ffdd66;top:10px}#compass:after{content:"▼";position:absolute;left:50%;top:-3px;transform:translateX(-50%);color:#ffdd66;font-size:10px}'
    + 'body.touch #compass{top:2px;height:34px}';
  document.head.appendChild(cst);
  const CARD = [['N', 0, -1], ['NO', 0.707, -0.707], ['O', 1, 0], ['SO', 0.707, 0.707], ['S', 0, 1], ['SW', -0.707, 0.707], ['W', -1, 0], ['NW', -0.707, -0.707]];
  let compT = 0;
  L.updateCompass = function (dt) {
    comp.hidden = L.state !== 'game' || !P.alive;
    compT -= dt; if (comp.hidden || compT > 0) return; compT = 0.05;
    const cy = Math.cos(P.camYaw), sy = Math.sin(P.camYaw), half = 1.15;
    const rel = (dx, dz) => Math.atan2(dx * -cy + dz * sy, dx * sy + dz * cy);
    let html = '';
    const put = (dx, dz, label, cls) => { const r = rel(dx, dz); if (Math.abs(r) > half) return; html += '<span class="' + (cls || '') + '" style="left:' + (50 + r / half * 50).toFixed(1) + '%">' + label + '</span>'; };
    for (const c of CARD) put(c[1], c[2], c[0], 'card');
    const km = (x, z) => { const d = Math.hypot(x - P.x, z - P.z); return d > 1000 ? (d / 1000).toFixed(1) + ' km' : Math.round(d) + ' m'; };
    const tgt = (x, z, icon, name) => { if (Math.hypot(x - P.x, z - P.z) < 40) return; put(x - P.x, z - P.z, icon + '<small>' + name + ' ' + km(x, z) + '</small>'); };
    if (L.inDim(P.x)) { if (L.DIM_PORTAL) tgt(L.DIM_PORTAL.x, L.DIM_PORTAL.z, '🌀', 'Heimweg'); }
    else {
      for (const I of L.ISL || []) if (!I.dim && L.curIsland !== I) tgt(I.x, I.z, I.icon, I.name.replace('Götterinsel ', '').replace('insel', ''));
      if (Math.max(Math.abs(P.x), Math.abs(P.z)) > 1600) tgt(0, 0, '🏠', 'Heimat');
      else if (L.TOWER) tgt(L.TOWER.x, L.TOWER.z, '🗼', 'Turm');
      if (L.PORTAL) tgt(L.PORTAL.x, L.PORTAL.z, '🌀', 'Portal');
    }
    if (L.waypoint) tgt(L.waypoint.x, L.waypoint.z, '📍', 'Ziel');
    comp.innerHTML = html;
  };
  // Inseln am Rand der Minikarte
  L.drawRimIcons = function (g, S, view) {
    if (L.inDim(P.x)) return;
    g.save(); g.font = '13px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (const I of L.ISL || []) {
      if (I.dim) continue;
      const dx = I.x - P.x, dz = I.z - P.z, d = Math.hypot(dx, dz); if (d < view * 0.5 + I.r) continue;
      const x = S / 2 + dx / d * (S / 2 - 11), y = S / 2 + dz / d * (S / 2 - 11);
      g.fillStyle = 'rgba(0,0,0,0.55)'; g.beginPath(); g.arc(x, y, 9, 0, 6.28); g.fill(); g.fillText(I.icon, x, y + 1);
    }
    g.restore();
  };
  // Route auf eine Karte zeichnen (toM: Welt → Pixel)
  L.drawRoute = function (g, toM, width) {
    const w = L.waypoint; if (!w) return;
    const r = L.route;
    g.save();
    if (r && r.length > 1) {
      g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = (width || 4) + 3; g.lineJoin = 'round'; g.lineCap = 'round';
      g.beginPath(); r.forEach((p, i) => { const [x, y] = toM(p[0], p[1]); if (i) g.lineTo(x, y); else g.moveTo(x, y); }); g.stroke();
      g.strokeStyle = '#c040ff'; g.lineWidth = width || 4; g.stroke();
    }
    const [x, y] = toM(w.x, w.z);
    g.fillStyle = '#c040ff'; g.strokeStyle = '#fff'; g.lineWidth = 2;
    g.beginPath(); g.arc(x, y - 9, 7, Math.PI, 0); g.lineTo(x, y + 2); g.closePath(); g.fill(); g.stroke();
    g.restore();
  };
})();
