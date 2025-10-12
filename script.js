// ---- KONFIG ----
const FIREBASE_BASE = "https://twitchpolloverlay-default-rtdb.europe-west1.firebasedatabase.app"; // <- DEINE Basis-URL (ohne /state.json)
const PULL_MS = 1000;

// UI-Referenzen – erwartet 3 Reihen mit .row, darin .label und .fill
const titleEl = document.getElementById("title");      // "COMMUNITY VOTE"
const timerEl = document.getElementById("timer");      // 00:00 / 1:23 etc.
const rows = Array.from(document.querySelectorAll(".row")); // 3 Zeilen

// Hilfsfunktionen
const clamp = (v,min,max) => Math.max(min, Math.min(max, v));

function msToClock(ms) {
  if (!ms || ms <= 0) return "0:00";
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2,"0")}`;
}

/**
 * Nimmt die Firebase-Antwort und normalisiert sie auf:
 * {
 *   status: "running"|"idle"|...,
 *   endsAt:  <ms since epoch>,
 *   options: ["A","B","C"],
 *   counts:  [0,0,0]
 * }
 */
function normalizeState(data) {
  if (!data) return null;

  // Variante 1: Root hat bereits "state"
  let st = data.state ?? data;

  // Wenn counts/options direkt vorhanden -> gut
  let options = Array.isArray(st.options) ? st.options.slice(0,3) : null;
  let counts  = Array.isArray(st.counts)  ? st.counts.slice(0,3)  : null;

  // Variante 2: Legacy currentPoll (o1/o2/o3 und c1/c2/c3)
  if (!options || !counts) {
    const cp = data.currentPoll ?? st.currentPoll;
    if (cp) {
      options = [
        cp.o1 ?? "Option A",
        cp.o2 ?? "Option B",
        cp.o3 ?? "Option C"
      ];
      counts = [
        Number(cp.c1 ?? 0),
        Number(cp.c2 ?? 0),
        Number(cp.c3 ?? 0)
      ];
      // EndsAt evtl. aus state holen, falls vorhanden
      st = {
        status: (st.status ?? "running"),
        endsAt: Number(st.endsAt ?? 0),
        options, counts
      };
    }
  }

  // Fallbacks, falls immer noch nichts da
  if (!options) options = ["Option A", "Option B", "Option C"];
  if (!counts)  counts  = [0,0,0];

  return {
    status: st.status ?? "idle",
    endsAt: Number(st.endsAt ?? 0),
    options,
    counts
  };
}

function render(state) {
  if (!state) return;

  const now = Date.now();
  const remainingMs = state.endsAt > now ? (state.endsAt - now) : 0;

  // Timer: bei "running" die Restzeit, sonst "Nächste Abstimmung in …"
  timerEl.textContent = msToClock(remainingMs);

  // Balken & Labels
  const total = Math.max(1, state.counts.reduce((a,b)=>a+b, 0));
  rows.forEach((row, i) => {
    const label = row.querySelector(".label");
    const fill  = row.querySelector(".fill");

    const name  = state.options[i] ?? `Option ${i+1}`;
    const votes = Number(state.counts[i] ?? 0);

    if (label) label.textContent = `${name} (${votes})`;

    const pct = clamp((votes / total) * 100, 0, 100);
    if (fill) fill.style.width = `${pct}%`;
  });
}

async function pullOnce() {
  try {
    // Direkt /state.json lesen – Cache vermeiden
    const url = `${FIREBASE_BASE}/state.json?ts=${Date.now()}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = await res.json();
    const state = normalizeState(raw);
    render(state);
  } catch (e) {
    console.warn("[Overlay] fetch/state error:", e);
  }
}

// Start
pullOnce();
setInterval(pullOnce, PULL_MS);
