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
