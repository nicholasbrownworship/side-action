(function () {
  const $ = (s) => document.querySelector(s);
  const KEY = "sideAction.v1";
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  let state = {
    fmt: "stroke", holes: 18,
    players: ["Player 1", "Player 2", "Player 3"],
    pars: Array(18).fill(4),
    scores: {},          // "p-h" -> number
    clubs: ["Driver", "3 Wood", "5 Wood", "4 Hybrid", "5 Iron", "6 Iron", "7 Iron", "8 Iron", "9 Iron", "Pitching Wedge", "Gap Wedge", "Sand Wedge", "Lob Wedge"].map((c) => ({ name: c, carry: "", total: "" }))
  };
  try { const saved = JSON.parse(localStorage.getItem(KEY)); if (saved) state = Object.assign(state, saved); } catch (e) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} };

  // ---------- Tabs ----------
  function showTab(id) {
    document.querySelectorAll(".panel").forEach((p) => (p.hidden = p.id !== id));
    document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("is-on", t.dataset.tab === id));
    if (location.hash !== "#" + id) history.replaceState(null, "", "#" + id);
  }
  document.querySelectorAll(".tab").forEach((t) => t.addEventListener("click", () => showTab(t.dataset.tab)));
  const initial = location.hash.slice(1);
  if (["pick", "card", "yards"].includes(initial)) showTab(initial);

  // ---------- Picker ----------
  function renderGames() {
    const n = +$("#pCount").value, vibe = $("#pVibe").value;
    const list = window.GAMES.filter((g) => n >= g.min && n <= g.max && (vibe === "any" || g.vibe.includes(vibe)));
    $("#pickCount").textContent = list.length ? list.length + (list.length === 1 ? " game fits." : " games fit.") : "Nothing fits that combination. Try a different mood.";
    $("#games").innerHTML = list.map((g) => `
      <details class="game">
        <summary><span class="gname">${esc(g.name)}</span><span class="gpitch">${esc(g.pitch)}</span></summary>
        <ol>${g.steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>
        <p class="muted">${g.min === g.max ? g.min + " players" : g.min + "–" + g.max + " players"}. ${esc(g.time)}.</p>
      </details>`).join("");
  }
  $("#pCount").addEventListener("change", renderGames);
  $("#pVibe").addEventListener("change", renderGames);
  renderGames();

  // ---------- Scorecard ----------
  const sc = (p, h) => { const v = state.scores[p + "-" + h]; return typeof v === "number" ? v : null; };

  function buildGrid() {
    const H = state.holes;
    let html = "<thead><tr><th>Hole</th><th>Par</th>";
    state.players.forEach((n, p) => (html += `<th><input class="pname" data-p="${p}" value="${esc(n)}" aria-label="Player ${p + 1} name"></th>`));
    html += "</tr></thead><tbody>";
    for (let h = 0; h < H; h++) {
      html += `<tr><th scope="row">${h + 1}</th><td><input class="par" data-h="${h}" inputmode="numeric" value="${state.pars[h]}" aria-label="Par for hole ${h + 1}"></td>`;
      state.players.forEach((_, p) => {
        const v = sc(p, h);
        html += `<td><input class="sc" data-p="${p}" data-h="${h}" inputmode="numeric" value="${v === null ? "" : v}" aria-label="${esc(state.players[p])} hole ${h + 1}"></td>`;
      });
      html += "</tr>";
    }
    html += "</tbody>";
    $("#grid").innerHTML = html;
    $("#fmt").value = state.fmt;
    $("#holes").value = String(state.holes);
  }

  function summarize() {
    const H = state.holes, P = state.players.length;
    const parTotal = state.pars.slice(0, H).reduce((a, b) => a + b, 0);
    let out = "";
    if (state.fmt === "stroke") {
      out = state.players.map((n, p) => {
        let tot = 0, par = 0, played = 0;
        for (let h = 0; h < H; h++) { const v = sc(p, h); if (v !== null) { tot += v; par += state.pars[h]; played++; } }
        const diff = tot - par;
        return row(n, played ? tot : "–", played ? `${diff === 0 ? "E" : (diff > 0 ? "+" : "") + diff} thru ${played}` : "no scores yet");
      }).join("");
    } else if (state.fmt === "stable") {
      out = state.players.map((n, p) => {
        let pts = 0, played = 0;
        for (let h = 0; h < H; h++) { const v = sc(p, h); if (v !== null) { pts += Math.max(0, 2 - (v - state.pars[h])); played++; } }
        return row(n, played ? pts + " pts" : "–", played ? `thru ${played}` : "no scores yet");
      }).join("");
      out += `<p class="muted">Double bogey or worse 0, bogey 1, par 2, birdie 3, eagle 4.</p>`;
    } else {
      const won = Array(P).fill(0); let carry = 0;
      const log = [];
      for (let h = 0; h < H; h++) {
        const vals = state.players.map((_, p) => sc(p, h));
        if (vals.some((v) => v === null) || P < 2) break;
        const low = Math.min(...vals);
        const winners = vals.reduce((a, v, i) => (v === low ? a.concat(i) : a), []);
        if (winners.length === 1) { won[winners[0]] += 1 + carry; log.push(`Hole ${h + 1}: ${esc(state.players[winners[0]])} wins ${1 + carry}`); carry = 0; }
        else { carry++; log.push(`Hole ${h + 1}: tied, carry ${carry}`); }
      }
      out = state.players.map((n, p) => row(n, won[p] + (won[p] === 1 ? " skin" : " skins"), "")).join("");
      out += `<p class="muted">${carry ? "Carrying " + carry + (carry === 1 ? " skin" : " skins") + " into the next hole." : "No carryover."} Skins are counted through the last hole where every player has a score.</p>`;
      if (log.length) out += `<details class="log"><summary>Hole by hole</summary><ul>${log.map((l) => `<li>${l}</li>`).join("")}</ul></details>`;
    }
    $("#summary").innerHTML = `<div class="results">${out}</div><p class="muted">Course par: ${parTotal}.</p>`;
  }
  const row = (n, big, small) => `<div class="result"><span class="rn">${esc(n)}</span><span class="rbig">${big}</span><span class="rsmall">${small}</span></div>`;

  $("#grid").addEventListener("input", (e) => {
    const t = e.target;
    if (t.classList.contains("sc")) {
      const v = parseInt(t.value, 10);
      const k = t.dataset.p + "-" + t.dataset.h;
      if (Number.isFinite(v) && v > 0) state.scores[k] = clamp(v, 1, 20); else delete state.scores[k];
    } else if (t.classList.contains("par")) {
      const v = parseInt(t.value, 10);
      if (Number.isFinite(v)) state.pars[+t.dataset.h] = clamp(v, 3, 6);
    } else if (t.classList.contains("pname")) {
      state.players[+t.dataset.p] = t.value || "Player " + (+t.dataset.p + 1);
    }
    save(); summarize();
  });
  $("#fmt").addEventListener("change", (e) => { state.fmt = e.target.value; save(); summarize(); });
  $("#holes").addEventListener("change", (e) => { state.holes = +e.target.value; save(); buildGrid(); summarize(); });
  $("#addP").addEventListener("click", () => {
    if (state.players.length >= 8) return;
    state.players.push("Player " + (state.players.length + 1)); save(); buildGrid(); summarize();
  });
  $("#rmP").addEventListener("click", () => {
    if (state.players.length <= 1) return;
    const last = state.players.length - 1;
    state.players.pop();
    Object.keys(state.scores).forEach((k) => { if (k.startsWith(last + "-")) delete state.scores[k]; });
    save(); buildGrid(); summarize();
  });
  $("#resetRound").addEventListener("click", () => {
    if (!confirm("Clear all scores for this round? Player names and pars stay.")) return;
    state.scores = {}; save(); buildGrid(); summarize();
  });
  buildGrid(); summarize();

  // ---------- Yardages ----------
  function renderClubs() {
    let html = "<thead><tr><th>Club</th><th>Carry (yd)</th><th>Total (yd)</th><th>Gap</th><th></th></tr></thead><tbody>";
    state.clubs.forEach((c, i) => {
      const next = state.clubs[i + 1];
      const a = parseInt(c.carry, 10), b = next ? parseInt(next.carry, 10) : NaN;
      const gap = Number.isFinite(a) && Number.isFinite(b) ? a - b : "";
      html += `<tr><td><input class="cn" data-i="${i}" value="${esc(c.name)}" aria-label="Club name"></td>
        <td><input class="cc" data-i="${i}" inputmode="numeric" value="${esc(c.carry)}" aria-label="${esc(c.name)} carry"></td>
        <td><input class="ct" data-i="${i}" inputmode="numeric" value="${esc(c.total)}" aria-label="${esc(c.name)} total"></td>
        <td class="gap">${gap}</td>
        <td><button class="x" data-i="${i}" aria-label="Remove ${esc(c.name)}">Remove</button></td></tr>`;
    });
    $("#clubs").innerHTML = html + "</tbody>";
  }
  $("#clubs").addEventListener("input", (e) => {
    const t = e.target, i = +t.dataset.i;
    if (t.classList.contains("cn")) state.clubs[i].name = t.value;
    if (t.classList.contains("cc")) { state.clubs[i].carry = t.value.replace(/\D/g, ""); updateGaps(); }
    if (t.classList.contains("ct")) state.clubs[i].total = t.value.replace(/\D/g, "");
    save();
  });
  function updateGaps() {
    document.querySelectorAll("#clubs td.gap").forEach((td, i) => {
      const a = parseInt(state.clubs[i].carry, 10), n = state.clubs[i + 1], b = n ? parseInt(n.carry, 10) : NaN;
      td.textContent = Number.isFinite(a) && Number.isFinite(b) ? a - b : "";
    });
  }
  $("#clubs").addEventListener("click", (e) => {
    if (!e.target.classList.contains("x")) return;
    state.clubs.splice(+e.target.dataset.i, 1); save(); renderClubs();
  });
  $("#addClub").addEventListener("click", () => { state.clubs.push({ name: "New club", carry: "", total: "" }); save(); renderClubs(); });
  renderClubs();
})();
