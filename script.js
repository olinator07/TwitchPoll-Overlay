/* ========= EINSTELLUNG =========
   Entweder Root mit "state" ODER direkt /state.json.
*/
const FIREBASE_URL = "https://twitchpolloverlay-default-rtdb.europe-west1.firebasedatabase.app/.json";

// Umschalten: während Pause vollständig verstecken?
const HIDE_IN_COOLDOWN = false;

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

function showWaiting(){
  optionsWrap.classList.add("hide");
  emptyEl.classList.remove("hide");
  timerEl.textContent = "0:00";
}

function showCooldown(nextAt){
  if (HIDE_IN_COOLDOWN) {
    optionsWrap.classList.add("hide");
    emptyEl.classList.add("hide");
    timerEl.textContent = "";
    return;
  }
  emptyEl.classList.add("hide");
  optionsWrap.classList.remove("hide");

  // Balken grau/leer
  for (let i=0;i<3;i++){
    bEls[i].style.width = "0%";
    cEls[i].textContent = "(0)";
    if (!oEls[i].textContent || oEls[i].textContent === "—") {
      oEls[i].textContent = "";
    }
  }

  let left = 0;
  if (typeof nextAt === "number") {
    left = Math.max(0, Math.floor((nextAt - Date.now())/1000));
  }
  timerEl.textContent = `Nächste Abstimmung in ${fmtTime(left)}`;
}

function showRunning(state){
  emptyEl.classList.add("hide");
  optionsWrap.classList.remove("hide");

  const opts = Array.isArray(state.options) ? state.options.slice(0,3) : ["", "", ""];
  const counts = Array.isArray(state.counts) ? state.counts.slice(0,3) : [0,0,0];
  const sum = counts.reduce((a,b)=>a+b,0);

  for (let i=0;i<3;i++){
    oEls[i].textContent = opts[i] ?? "";
    cEls[i].textContent = `(${counts[i] ?? 0})`;
    bEls[i].style.width = sum > 0 ? `${(counts[i]/sum)*100}%` : "0%";
  }

  let left = 0;
  if (typeof state.endsAt === "number"){
    left = Math.max(0, Math.floor((state.endsAt - Date.now())/1000));
  }
  timerEl.textContent = fmtTime(left);
}

function applyState(raw){
  const state = raw && raw.state ? raw.state : raw;
  if (!state) { showWaiting(); return; }

  const status = (state.status || "").toLowerCase();

  if (status === "running") {
    showRunning(state);
  } else if (status === "cooldown") {
    showCooldown(state.nextAt);
  } else {
    showWaiting();
  }
}

async function fetchState(){
  try{
    const res = await fetch(`${FIREBASE_URL}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    applyState(data);
  }catch(err){
    console.warn("[Overlay] fetchState error:", err);
  }
}

fetchState();
setInterval(fetchState, POLL_MS);
