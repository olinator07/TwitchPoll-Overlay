// <<< HIER DEINE DB-BASIS-URL EINTRAGEN (ohne /state.json am Ende) >>>
const FIREBASE_URL = "https://twitchpolloverlay-default-rtdb.europe-west1.firebasedatabase.app";

// Hilfsfunktionen
const $ = sel => document.querySelector(sel);
const toArray = (maybeArray) => {
  if (Array.isArray(maybeArray)) return maybeArray;
  if (maybeArray && typeof maybeArray === 'object') {
    return Object.keys(maybeArray)
      .sort((a,b) => Number(a) - Number(b))
      .map(k => maybeArray[k]);
  }
  return [];
};
const secToMMSS = (s) => {
  s = Math.max(0, Math.floor(s||0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2,'0')}`;
};

// DOM
const barsEl = $('#bars');
const sublineEl = $('#subline');
const optEls = [$('#opt0'), $('#opt1'), $('#opt2')];
const fillEls = [$('#fill0'), $('#fill1'), $('#fill2')];

// State-Update
function render(state) {
  const running = Boolean(state?.running);
  const options = toArray(state?.options);
  const counts = toArray(state?.counts);
  const secondsLeft = Number(state?.secondsLeft) || 0;
  const cooldown = Number(state?.cooldown) || 0;

  if (running && options.length >= 3) {
    // Balken sichtbar
    barsEl.hidden = false;

    // Timertext: „Abstimmung läuft: mm:ss“
    sublineEl.textContent = `Abstimmung läuft: ${secToMMSS(secondsLeft)}`;

    const total = counts.reduce((a,b)=>a + (Number(b)||0), 0);

    for (let i=0;i<3;i++){
      const name = options[i] ?? `Option ${i+1}`;
      const cnt  = Number(counts[i] || 0);
      optEls[i].textContent = `${name} (${cnt})`;

      const pct = total > 0 ? Math.round((cnt / total) * 100) : 0;
      fillEls[i].style.width = `${pct}%`;
    }
  } else {
    // Keine Balken anzeigen – nur Countdown „Nächste Abstimmung in …“
    barsEl.hidden = true;
    const seconds = cooldown > 0 ? cooldown : secondsLeft; // falls du secondsLeft auch im Idle für den Pause-Timer nutzt
    sublineEl.textContent = `Nächste Abstimmung in ${secToMMSS(seconds)}`;
  }
}

// Polling
async function fetchState() {
  try {
    const res = await fetch(`${FIREBASE_URL}/state.json`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    // Erwartetes Format: state-Objekt direkt (weil wir /state.json lesen)
    render(data || {});
  } catch (err) {
    // beim Fehler einfach „Verbindung …“ zeigen, Balken aus
    barsEl.hidden = true;
    sublineEl.textContent = 'Verbindung …';
    // Optional: console.error(err);
  }
}

// Start: alle 1s pullen
fetchState();
setInterval(fetchState, 1000);
