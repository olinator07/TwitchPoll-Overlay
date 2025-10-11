/* ========= Konfiguration ========= */
const FIREBASE_DB = "https://twitchpolloverlay-default-rtdb.europe-west1.firebasedatabase.app";

const els = {
  timer: document.getElementById("timer"),
  optionsWrap: document.getElementById("options"),
};

let poll = {
  labels: ["—","—","—"],
  counts: [0,0,0],
  endsAt: 0
};

function renderOptions(){
  els.optionsWrap.innerHTML = "";
  const max = Math.max(1, ...poll.counts);

  poll.labels.forEach((label, idx) => {
    const row = document.createElement("div");
    row.className = "option";

    const fill = document.createElement("div");
    fill.className = "fill";
    fill.style.width = Math.round((poll.counts[idx] / max) * 100) + "%";

    const text = document.createElement("div");
    text.className = "label";
    text.textContent = `${label} (${poll.counts[idx]})`;

    row.appendChild(fill);
    row.appendChild(text);
    els.optionsWrap.appendChild(row);
  });
}

function fmtSecondsLeft(ms){
  if (!ms || ms < 0) return "0s";
  const s = Math.max(0, Math.floor(ms/1000));
  return `${s}s`;
}

async function fetchJson(path){
  const res = await fetch(`${FIREBASE_DB}${path}.json`, { cache: "no-store" });
  if (!res.ok) throw new Error(res.status + " " + res.statusText);
  return await res.json();
}

async function updateOnce(){
  try{
    const state = await fetchJson("/state");
    if (state){
      const n = Number(state.endsAt);
      if (!Number.isNaN(n) && n > 0) poll.endsAt = n;
      else if (state.secondsLeft !== undefined){
        const s = Number(state.secondsLeft);
        if (!Number.isNaN(s)) poll.endsAt = Date.now() + s * 1000;
      }
    }

    const cur = await fetchJson("/currentPoll");
    if (cur){
      poll.labels = [cur.o1 ?? "Option 1", cur.o2 ?? "Option 2", cur.o3 ?? "Option 3"];
      poll.counts = [Number(cur.c1||0), Number(cur.c2||0), Number(cur.c3||0)];
      renderOptions();
    }
  }catch(e){
    console.warn("Overlay fetch error:", e.message);
  }
}

function tick(){
  const left = poll.endsAt ? (poll.endsAt - Date.now()) : 0;
  els.timer.textContent = fmtSecondsLeft(left);
}

setInterval(updateOnce, 1000);
setInterval(tick, 200);

updateOnce();
tick();
