const DB_URL = "https://twitchpolloverlay-default-rtdb.europe-west1.firebasedatabase.app/state.json";

const titleEl = document.getElementById("title");
const timeEl  = document.getElementById("time");
const rows    = [...document.querySelectorAll(".row")];

function formatRemaining(ms) {
  if (ms < 0) ms = 0;
  const s = Math.ceil(ms / 1000);
  if (s >= 60) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}m ${sec}s`;
  }
  return `${s}s`;
}

async function tick() {
  try {
    const res = await fetch(DB_URL, { cache: "no-store" });
    const state = await res.json();
    if (!state) return;

    // Timer
    const msLeft = (state.endsAt ?? 0) - Date.now();
    timeEl.textContent = formatRemaining(msLeft);

    // Titel (ohne "running" anzeigen)
    titleEl.textContent = "COMMUNITY VOTE";

    // Optionen & Balken
    const opts = state.options || [];
    const cnts = state.counts  || [];
    rows.forEach((row, i) => {
      const nameEl = row.querySelector(".name");
      const barEl  = row.querySelector(".bar");
      const n = cnts[i] || 0;
      const label = (opts[i] ?? `Option ${i+1}`) + ` (${n})`;
      nameEl.textContent = label;

      const total = Math.max(1, cnts.reduce((a,b)=>a+b,0));
      const pct = Math.round((n / total) * 100);
      barEl.style.width = `${pct}%`;
    });
  } catch (e) {
    // optional: console.log(e);
  }
}

setInterval(tick, 250);
tick();
