// =============================
// TRAGE HIER DEINE FIREBASE-URL EIN
// (die Basis-URL aus der config.yml, OHNE .json am Ende)
// Beispiel: "https://twitchpolloverlay-default-rtdb.europe-west1.firebasedatabase.app/"
const FIREBASE_BASE = "https://twitchpolloverlay-default-rtdb.europe-west1.firebasedatabase.app";
// =============================

const POLL_URL = FIREBASE_BASE + "state.json";

const elTimer = document.getElementById("timer");
const elPauseBox = document.getElementById("pauseBox");
const elCooldownText = document.getElementById("cooldownText");
const elPollBox = document.getElementById("pollBox");

const elOpt = [ null,
  document.getElementById("opt1"),
  document.getElementById("opt2"),
  document.getElementById("opt3")
];
const elCnt = [ null,
  document.getElementById("cnt1"),
  document.getElementById("cnt2"),
  document.getElementById("cnt3")
];
const elBar = [ null,
  document.getElementById("bar1"),
  document.getElementById("bar2"),
  document.getElementById("bar3")
];

function mmss(n){
  n = Math.max(0, n|0);
  const m = Math.floor(n/60);
  const s = n%60;
  return `${m}:${s.toString().padStart(2,'0')}`;
}

function render(state){
  // Erwartete Struktur (vom Plugin geschrieben):
  // {
  //   running: true|false,
  //   secondsLeft: number,
  //   cooldown: number,
  //   options: ["Text1","Text2","Text3"],
  //   counts: [c1,c2,c3],
  //   status: "läuft" | "Pause" | "bereit" | "gestoppt" | ...
  // }

  const running = !!state?.running;
  const secondsLeft = state?.secondsLeft ?? 0;
  const cooldown = state?.cooldown ?? 0;

  // Kopf-Timer: während running -> secondsLeft, sonst cooldown
  elTimer.textContent = running ? mmss(secondsLeft) : (cooldown > 0 ? mmss(cooldown) : "—:—");

  if (running){
    // Poll sichtbar, Pause-Text aus
    elPollBox.classList.remove("hidden");
    elPauseBox.classList.add("hidden");

    const opts = Array.isArray(state.options) ? state.options : [];
    const cnts = Array.isArray(state.counts) ? state.counts : [];
    const total = Math.max(1, cnts.reduce((a,b)=>a+(b|0),0));

    for (let i=1;i<=3;i++){
      const name = opts[i-1] ?? `Option ${String.fromCharCode(64+i)}`;
      const n = cnts[i-1] ?? 0;
      const pct = Math.round((n/total)*100);

      elOpt[i].textContent = name;
      elCnt[i].textContent = n.toString();
      elBar[i].style.width = pct + "%";
    }
  } else {
    // Pause (cooldown>0) anzeigen, Balken aus
    elPollBox.classList.add("hidden");
    if (cooldown > 0){
      elPauseBox.classList.remove("hidden");
      elCooldownText.textContent = mmss(cooldown);
    } else {
      // Weder running noch cooldown -> idle
      elPauseBox.classList.remove("hidden");
      elCooldownText.textContent = "—:—";
    }
  }
}

async function tick(){
  try{
    const r = await fetch(POLL_URL, { cache: "no-store" });
    if (!r.ok) throw new Error(r.status + " " + r.statusText);
    const json = await r.json();
    render(json || {});
  }catch(e){
    // Bei Fehler: nichts crashen, nur Timer als —
    // console.log("fetch failed", e);
  }finally{
    setTimeout(tick, 1000);
  }
}

// Start
tick();
