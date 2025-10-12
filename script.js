// === EINSTELLUNG: Deine Firebase Realtime Database Basis-URL (OHNE .json am Ende) ===
const BASE = "https://twitchpolloverlay-default-rtdb.europe-west1.firebasedatabase.app";

// UI-Elemente holen
const elTitle      = document.getElementById("title");        // z.B. "COMMUNITY VOTE"
const elTimer      = document.getElementById("timer");        // Anzeige 1:23, 0:07, etc.
const elCard       = document.getElementById("card");         // die ganze Box
const rows         = [
  {
    bar:  document.querySelector('[data-row="1"] .bar'),
    fill: document.querySelector('[data-row="1"] .fill'),
    text: document.querySelector('[data-row="1"] .text'),
  },
  {
    bar:  document.querySelector('[data-row="2"] .bar'),
    fill: document.querySelector('[data-row="2"] .fill'),
    text: document.querySelector('[data-row="2"] .text'),
  },
  {
    bar:  document.querySelector('[data-row="3"] .bar'),
    fill: document.querySelector('[data-row="3"] .fill'),
    text: document.querySelector('[data-row="3"] .text'),
  },
];

// Laufender Zustand im Frontend
let lastEndsAt = 0;            // ms since epoch
let lastStatus = "waiting";    // waiting | running | ended | paused
let lastCounts = [0,0,0];
let lastOptions = ["Option A", "Option B", "Option C"];

// Helfer: Zeit formatieren (mm:ss)
function fmt(msLeft) {
  if (msLeft < 0) msLeft = 0;
  const totalSec = Math.floor(msLeft / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Helfer: UI aktualisieren
function render() {
  // Timer
  const now = Date.now();
  const msLeft = (lastStatus === "running") ? (lastEndsAt - now) : 0;
  elTimer.textContent = fmt(msLeft);

  // Balken
  const max = Math.max(1, ...lastCounts); // mind. 1, damit Width=0% nicht kollabiert
  for (let i = 0; i < 3; i++) {
    const percent = Math.round((lastCounts[i] / max) * 100);
    rows[i].fill.style.width = `${percent}%`;
    rows[i].text.textContent = `${lastOptions[i]} (${lastCounts[i]})`;
  }

  // optische Zustände (optional – kann an dein CSS angepasst werden)
  elCard.dataset.state = lastStatus; // z.B. .card[data-state="waiting"] im CSS möglich
}

// Daten vom Server holen und normalisieren
async function pull() {
  try {
    // Wir holen Wurzel / .json, damit beide Formen erkannt werden
    const res = await fetch(`${BASE}/.json`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    // Normalisieren:
    // Variante A: alles unter /state
    // {
    //   state: {
    //     status: "running",
    //     endsAt: 1739...,
    //     options: ["A","B","C"],
    //     counts: [0,0,0]
    //   }
    // }
    //
    // Variante B: getrennt /state und /currentPoll
    // {
    //   state: { status, endsAt },
    //   currentPoll: { c1, c2, c3, o1, o2, o3 }
    // }

    let status   = "waiting";
    let endsAt   = 0;
    let options  = ["Option A", "Option B", "Option C"];
    let counts   = [0,0,0];

    if (data && typeof data === "object") {
      // /state vorhanden?
      if (data.state && typeof data.state === "object") {
        if (typeof data.state.status === "string") status = data.state.status;
        if (typeof data.state.endsAt === "number") endsAt = data.state.endsAt;

        if (Array.isArray(data.state.options)) options = data.state.options;
        if (Array.isArray(data.state.counts))  counts  = data.state.counts;
      }

      // /currentPoll vorhanden? → überschreibt options/counts falls benötigt
      if (data.currentPoll && typeof data.currentPoll === "object") {
        const cp = data.currentPoll;
        // Counts als c1,c2,c3
        const cc = [cp.c1, cp.c2, cp.c3].map(v => Number.isFinite(v) ? v : 0);
        // Options als o1,o2,o3
        const oo = [cp.o1, cp.o2, cp.o3].map(v => (typeof v === "string" ? v : ""));
        if (oo.every(s => !!s)) options = oo;
        if (cc.some(n => Number.isFinite(n))) counts = cc;
      }

      // Falls an Wurzel OHNE /state gearbeitet wurde (direkt status/endsAt/options/counts auf Root)
      if (!data.state && !data.currentPoll) {
        if (typeof data.status === "string") status = data.status;
        if (typeof data.endsAt === "number") endsAt = data.endsAt;
        if (Array.isArray(data.options)) options = data.options;
        if (Array.isArray(data.counts))  counts  = data.counts;
      }
    }

    // Zustand übernehmen
    lastStatus  = status;
    lastEndsAt  = endsAt || 0;
    lastOptions = Array.isArray(options) ? options.slice(0,3).concat(["","",""]).slice(0,3) : lastOptions;
    lastCounts  = Array.isArray(counts)  ? counts.slice(0,3).concat([0,0,0]).slice(0,3)  : lastCounts;

    render();
  } catch (err) {
    console.error("[Overlay] fetch error:", err);
    // Timer weiter lokal runterzählen lassen, aber keine UI-Änderungen erzwingen
  }
}

// Lokaler Ticker (für flüssigen Countdown), Server-Pull alle 1s
setInterval(render, 300);   // flüssigeres Ticken
setInterval(pull, 1000);    // Serverdaten nachladen
pull();                      // sofort starten
render();
