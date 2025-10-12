// ========= KONFIG =========
// <- HIER deine *genaue* Firebase-JSON-URL zur "state.json" eintragen!
const DB_URL = "https://twitchpolloverlay-default-rtdb.europe-west1.firebasedatabase.app";
// ==========================

const $subtitle = document.getElementById("subtitle");
const $bars = document.getElementById("bars");
const $opt0 = document.getElementById("opt0");
const $opt1 = document.getElementById("opt1");
const $opt2 = document.getElementById("opt2");

let lastState = null;
let tickTimer = null;

function fmt(msLeft){
  // Millisekunden -> m:ss (z.B. 2:05)
  const total = Math.max(0, Math.floor(msLeft/1000));
  const m = Math.floor(total/60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2,"0")}`;
}

function paintIdle(state){
  // Nächste Abstimmung in …
  $bars.style.display = "none";

  const endsAt = Number(state?.endsAt || 0);
  if (endsAt > 0){
    const left = endsAt - Date.now();
    $subtitle.textContent = `Nächste Abstimmung in ${fmt(left)}`;
  } else {
    $subtitle.textContent = "Nächste Abstimmung in —";
  }
}

function paintRunning(state){
  // Laufende Abstimmung: Balken ein/füllen
  $bars.style.display = "flex";

  const opts = state?.options || ["Option A","Option B","Option C"];
  const counts = state?.counts || [0,0,0];
  const endsAt = Number(state?.endsAt || 0);
  const left = Math.max(0, endsAt - Date.now());
  $subtitle.textContent = fmt(left);

  const max = Math.max(1, ...counts);
  [
    [$opt0, 0],
    [$opt1, 1],
    [$opt2, 2],
  ].forEach(([el, i]) => {
    const label = `${opts[i] ?? `Option ${i+1}`} (${counts[i] ?? 0})`;
    el.textContent = label;
    const fill = el.parentElement; // .bar-fill
    const percent = Math.round(((counts[i] ?? 0) / max) * 100);
    fill.style.width = `${percent}%`;
  });
}

async function pull(){
  try{
    const res = await fetch(DB_URL, { cache: "no-store" });
    const data = await res.json();

    // Wir erwarten ein Objekt { status, endsAt, options, counts }
    const state = data || {};
    const status = state.status || "idle";

    if (status === "running"){
      paintRunning(state);
    } else {
      paintIdle(state);
    }

    lastState = state;
  }catch(e){
    // Bei Fehler: Timer ausblenden, Hinweis anzeigen
    $subtitle.textContent = "Verbindung …";
    $bars.style.display = "none";
  }
}

function start(){
  if (tickTimer) clearInterval(tickTimer);
  // Ziehen und jede Sekunde aktualisieren
  pull();
  tickTimer = setInterval(() => {
    // Timer-Anzeige aktualisieren ohne neuen Fetch:
    if (lastState){
      if (lastState.status === "running") paintRunning(lastState);
      else paintIdle(lastState);
    }
    // Alle 2 Sek. vom Server nachladen, damit Counts/Wechsel ankommen
  }, 1000);

  // Leichter Poll, um neue Zähler/Status zu holen
  setInterval(pull, 2000);
}

start();

