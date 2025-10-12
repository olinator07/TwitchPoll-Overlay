/**********************
 * EINSTELLUNG: URL
 **********************/
const FIREBASE_BASE =
  "https://twitchpolloverlay-default-rtdb.europe-west1.firebasedatabase.app"; // <- deine Basis-URL (ohne /state.json)

const POLL_INTERVAL_MS = 1000;

const titleEl   = document.getElementById("title");
const timerEl   = document.getElementById("timer");
const rowsWrap  = document.getElementById("rows");

/* Hilfen */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const msToClock = (ms) => {
  if (!ms || ms <= 0) return "0:00";
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

/* Zeilen neu bauen */
function renderRows(options, counts) {
  rowsWrap.innerHTML = ""; // neu aufbauen
  options.forEach((opt, i) => {
    const row = document.createElement("div");
    row.className = "row";

    const label = document.createElement("div");
    label.className = "label";
    label.textContent = `${opt} (${Number(counts[i] || 0)})`;

    const bar = document.createElement("div");
    bar.className = "bar";

    const fill = document.createElement("div");
    fill.className = "fill";

    bar.appendChild(fill);
    row.appendChild(label);
    row.appendChild(bar);
    rowsWrap.appendChild(row);
  });
}

/* Füllbreiten aktualisieren (nachdem die Zeilen existieren) */
function updateBars(counts) {
  const total = Math.max(1, counts.reduce((a, b) => a + Number(b || 0), 0));
  const fills = rowsWrap.querySelectorAll(".fill");
  counts.forEach((v, i) => {
    const pct = clamp((Number(v || 0) / total) * 100, 0, 100);
    if (fills[i]) fills[i].style.width = `${pct}%`;
  });
}

/* Daten normalisieren – erwartet /state.json */
function normalize(resJson) {
  if (!resJson) return null;

  // Falls Root:{state:{...}}
  const st = resJson.state ?? resJson;

  // Fallbacks
  const options = Array.isArray(st.options) ? st.options.slice(0, 3) : ["Option A","Option B","Option C"];
  const counts  = Array.isArray(st.counts)  ? st.counts.slice(0, 3)  : [0,0,0];

  return {
    status:  st.status ?? "idle",
    endsAt:  Number(st.endsAt ?? 0),
    options, counts
  };
}

/* Render-Logik */
function render(state) {
  if (!state) return;

  const now = Date.now();
  const left = state.endsAt > now ? (state.endsAt - now) : 0;

  if (state.status === "running") {
    // Laufende Abstimmung
    timerEl.textContent = msToClock(left);
    renderRows(state.options, state.counts);  // neu bauen + labels mit counts
    updateBars(state.counts);                 // füllbreiten
  } else {
    // Idle/Cooldown – nur Timer-Text zentriert
    timerEl.textContent = msToClock(left);
    renderRows([], []); // keine Balken
  }
}

/* Pull-Loop */
async function pull() {
  try {
    const url = `${FIREBASE_BASE}/state.json?ts=${Date.now()}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const state = normalize(json);
    render(state);
  } catch (err) {
    console.warn("[Overlay] fetch/state error:", err);
  }
}

pull();
setInterval(pull, POLL_INTERVAL_MS);
