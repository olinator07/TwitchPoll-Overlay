/**********************
 * EINSTELLUNG: URL
 **********************/
const FIREBASE_BASE =
  "https://twitchpolloverlay-default-rtdb.europe-west1.firebasedatabase.app"; // <- deine Basis-URL (ohne /state.json)

const PULL_MS = 2000;    // wie oft wir vom Server holen
const TICK_MS = 200;     // wie oft lokal der Timer aktualisiert wird

const titleEl  = document.getElementById("title");
const timerEl  = document.getElementById("timer");
const rowsWrap = document.getElementById("rows");

let cached = {
  status: "idle",
  options: [],
  counts: [],
  // Timing
  endsAtMs: 0,           // absolute Zeit (ms)
  secondsLeft: 0,        // alternativ: Restsekunden
  // lokale Ableitungen
  baseLeftMs: 0,         // bei letztem Pull verbleibende ms
  lastSync: 0            // Zeitpunkt des letzten Pulls
};

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const msToClock = (ms) => {
  if (!ms || ms <= 0) return "0:00";
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

function renderRows(options, counts) {
  rowsWrap.innerHTML = "";
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

function updateBars(counts) {
  const total = Math.max(1, counts.reduce((a, b) => a + Number(b || 0), 0));
  const fills = rowsWrap.querySelectorAll(".fill");
  counts.forEach((v, i) => {
    const pct = clamp((Number(v || 0) / total) * 100, 0, 100);
    if (fills[i]) fills[i].style.width = `${pct}%`;
  });
}

/** Pull von /state.json und Normalisieren */
async function pull() {
  try {
    const url = `${FIREBASE_BASE}/state.json?ts=${Date.now()}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();

    // /state kann entweder direkt das Objekt sein oder als {state:{...}} kommen
    const st = json?.state ?? json ?? {};

    const status  = st.status ?? "idle";
    const options = Array.isArray(st.options) ? st.options.slice(0, 3) : [];
    const counts  = Array.isArray(st.counts)  ? st.counts.slice(0, 3)  : [];

    // Timing herum: endsAt (ms) ODER secondsLeft (s)
    const now = Date.now();
    const endsAtMs = Number(st.endsAt ?? 0);
    const secondsLeft = Number(st.secondsLeft ?? 0);

    // baseLeftMs bei Pull neu setzen
    let baseLeftMs = 0;
    if (endsAtMs > now) {
      baseLeftMs = endsAtMs - now;
    } else if (secondsLeft > 0) {
      baseLeftMs = secondsLeft * 1000;
    }

    const wasStatus = cached.status;
    const optsChanged =
      options.length !== cached.options.length ||
      options.some((o, i) => o !== cached.options[i]);

    cached = {
      ...cached,
      status,
      options,
      counts,
      endsAtMs,
      secondsLeft,
      baseLeftMs,
      lastSync: Date.now()
    };

    // Wenn Status wechselt oder Optionen wechseln: Zeilen neu bauen
    if (status === "running") {
      if (wasStatus !== "running" || optsChanged) {
        renderRows(options, counts);
      }
      updateBars(counts);
    } else {
      // Idle/Cooldown: keine Balken zeigen
      if (rowsWrap.children.length) rowsWrap.innerHTML = "";
    }
  } catch (e) {
    console.warn("[Overlay] fetch/state error:", e);
  }
}

/** Lokales Timer-Ticken (zwischen Pulls) */
function tick() {
  const { baseLeftMs, lastSync, status, counts } = cached;
  let left = 0;
  if (baseLeftMs > 0 && lastSync > 0) {
    left = Math.max(0, baseLeftMs - (Date.now() - lastSync));
  }

  // Timer-Anzeige (immer)
  timerEl.textContent = msToClock(left);

  // Bei laufender Abstimmung Balken weich halten (Counts ändern sich nur beim Pull)
  if (status === "running" && counts.length) {
    updateBars(counts);
  }
}

pull();
setInterval(pull, PULL_MS);
setInterval(tick, TICK_MS);
