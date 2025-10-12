/* ========= EINSTELLUNG =========
   Entweder ROOT mit "state"-Objekt ODER direkt /state.json.
   Beispiel 1 (Root enthält state):
   const FIREBASE_URL = "https://twitchpolloverlay-default-rtdb.europe-west1.firebasedatabase.app/.json";

   Beispiel 2 (direkt state-Node):
   const FIREBASE_URL = "https://twitchpolloverlay-default-rtdb.europe-west1.firebasedatabase.app/state.json";
*/
const FIREBASE_URL = "https://twitchpolloverlay-default-rtdb.europe-west1.firebasedatabase.app/.json";

// Poll-Intervall (ms)
const POLL_MS = 1000;

// DOM-Refs
const timerEl = document.getElementById("timer");
const emptyEl = document.getElementById("empty");
const optionsWrap = document.getElementById("options");

const oEls = [
  document.getElementById("o1"),
  document.getElementById("o2"),
  document.getElementById("o3"),
];
const bEls = [
  document.getElementById("b1"),
  document.getElementById("b2"),
  document.getElementById("b3"),
];
const cEls = [
  document.getElementById("c1"),
  document.getElementById("c2"),
  document.getElementById("c3"),
];

function fmtTime(sec){
  if (sec < 0 || !Number.isFinite(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2,"0")}`;
}

function applyState(state){
  // State kann null sein -> warten
  if (!state || !Array.isArray(state.options) || state.options.length === 0){
    optionsWrap.classList.add("hide");
    emptyEl.classList.remove("hide");
    timerEl.textContent = "0:00";
    return;
  }

  emptyEl.classList.add("hide");
  optionsWrap.classList.remove("hide");

  // Optionen & Counts
  const opts = state.options.slice(0,3);
  const counts = Array.isArray(state.counts) ? state.counts.slice(0,3) : [0,0,0];

  const sum = counts.reduce((a,b)=>a+b,0);
  for (let i=0;i<3;i++){
    const name = opts[i] ?? "—";
    const val  = counts[i] ?? 0;
    const pct  = sum > 0 ? (val / sum) * 100 : 0;

    oEls[i].textContent = name;
    cEls[i].textContent = `(${val})`;
    bEls[i].style.width = `${pct}%`;
  }

  // Timer (nur wenn endsAt vorhanden)
  let left = 0;
  if (typeof state.endsAt === "number"){
    left = Math.max(0, Math.floor((state.endsAt - Date.now())/1000));
  }
  timerEl.textContent = fmtTime(left);
}

async function fetchState(){
  try{
    const res = await fetch(`${FIREBASE_URL}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    // data kann {state:{...}} sein ODER direkt {...}
    const state = data && data.state ? data.state : data;
    applyState(state);
  }catch(err){
    // Im Fehlerfall lieber nichts crashen lassen
    console.warn("[Overlay] fetchState error:", err);
  }
}

fetchState();
setInterval(fetchState, POLL_MS);
