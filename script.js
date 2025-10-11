// === Firebase Realtime Database URL ===
const DB_URL =
  "https://twitchpolloverlay-default-rtdb.europe-west1.firebasedatabase.app/";

// Hilfsformat: Sekunden zu "mm:ss" (unter 60s => "Xs")
function formatTime(totalSeconds) {
  const s = Math.max(0, Number(totalSeconds || 0));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rest = s % 60;
  return `${m}:${String(rest).padStart(2, "0")}`;
}

const optionsEl = document.getElementById("options");
const timerEl   = document.getElementById("timer");

// Rendert die Balken
function renderOptions(names = [], counts = []) {
  const total = counts.reduce((a, b) => a + b, 0) || 1;

  optionsEl.innerHTML = names.map((name, i) => {
    const c = counts[i] || 0;
    const pct = Math.round((c / total) * 100);
    return `
      <div class="option">
        <div class="fill" style="width:${pct}%"></div>
        <div class="label">${escapeHtml(name)} (${c})</div>
      </div>`;
  }).join("");
}

// Sanitizer
function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

// Lädt Daten aus der DB und aktualisiert UI
async function updateOverlay() {
  try {
    // state
    const stateRes = await fetch(`${DB_URL}/state.json`);
    const state = await stateRes.json();

    // currentPoll
    const pollRes = await fetch(`${DB_URL}/currentPoll.json`);
    const poll = await pollRes.json();

    // Timer: wenn endsAt vorhanden, restliche Zeit berechnen
    let secondsLeft = 0;
    if (state && typeof state.endsAt === "number") {
      const nowMs = Date.now();
      secondsLeft = Math.max(0, Math.round((state.endsAt - nowMs) / 1000));
    }
    timerEl.textContent = formatTime(secondsLeft);

    const names  = poll ? [poll.o1, poll.o2, poll.o3].filter(Boolean) : [];
    const counts = poll ? [poll.c1 || 0, poll.c2 || 0, poll.c3 || 0] : [];

    if (names.length) {
      renderOptions(names, counts);
    }
  } catch (e) {
    // falls offline oder noch leer
  }
}

// alle 500ms aktualisieren (fein, aber leicht)
setInterval(updateOverlay, 500);
updateOverlay();
