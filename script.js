/***********************
 * TwitchPoll Overlay  *
 * Timer + Balken Fix  *
 ***********************/

const DB_URL = "https://twitchpolloverlay-default-rtdb.europe-west1.firebasedatabase.app/";

// DOM-Elemente
const elTimer  = document.getElementById("timer");
const elBars   = [
  { fill: document.getElementById("fill1"), label: document.getElementById("label1") },
  { fill: document.getElementById("fill2"), label: document.getElementById("label2") },
  { fill: document.getElementById("fill3"), label: document.getElementById("label3") },
];

// Firebase (compat)
firebase.initializeApp({ databaseURL: DB_URL });
const db = firebase.database();

// Exakte Serverzeit
let serverOffsetMs = 0;
db.ref(".info/serverTimeOffset").on("value", snap => {
  serverOffsetMs = +snap.val() || 0;
});

// Overlay-State
let state = { status: "waiting", endsAt: 0 };
let poll  = { o1: "Option 1", o2: "Option 2", o3: "Option 3", c1: 0, c2: 0, c3: 0 };

// Status aus DB holen (robust gegen Tippfehler)
db.ref("state").on("value", snap => {
  const v = snap.val() || {};
  const rawStatus = (v.status || "").toString().toLowerCase().replace(/\s+/g, "");
  // normalize: alles was mit "run" beginnt zählt als running
  if (rawStatus.startsWith("run")) state.status = "running";
  else if (rawStatus.includes("cool")) state.status = "cooldown";
  else state.status = rawStatus || "waiting";

  state.endsAt = Number(v.endsAt || 0);
  tick(); // sofort neu zeichnen
});

// Poll-Daten
db.ref("currentPoll").on("value", snap => {
  const v = snap.val() || {};
  poll.o1 = v.o1 ?? "Option 1";
  poll.o2 = v.o2 ?? "Option 2";
  poll.o3 = v.o3 ?? "Option 3";
  poll.c1 = Number(v.c1 || 0);
  poll.c2 = Number(v.c2 || 0);
  poll.c3 = Number(v.c3 || 0);
  renderBars();
});

// Balken rendern
function renderBars() {
  const counts = [poll.c1, poll.c2, poll.c3];
  const max = Math.max(1, ...counts);
  const labels = [
    `${poll.o1} (${poll.c1})`,
    `${poll.o2} (${poll.c2})`,
    `${poll.o3} (${poll.c3})`,
  ];
  for (let i = 0; i < 3; i++) {
    const pct = Math.round((counts[i] / max) * 100);
    elBars[i].fill.style.width = `${pct}%`;
    elBars[i].label.textContent = labels[i];
  }
}

// mm:ss
function toMMSS(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}m ${r}s` : `${r}s`;
}

// Timer-Update: zählt, sobald endsAt in der Zukunft liegt
function tick() {
  const nowMs = Date.now() + serverOffsetMs;
  const remainingSec = (Number(state.endsAt) - nowMs) / 1000;

  if (remainingSec > 0) {
    elTimer.textContent = toMMSS(remainingSec);
  } else {
    elTimer.textContent = "0s";
  }
}

// weiches Intervall
setInterval(tick, 250);
renderBars();
tick();
