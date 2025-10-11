// ==== CONFIG ====
const FIREBASE_URL = new URLSearchParams(location.search).get('fb')
  || 'https://twitchpolloverlay-default-rtdb.europe-west1.firebasedatabase.app/state.json'; // <-- passe an
const POLL_INTERVAL_MS = 1000;

// UI refs
const titleEl = document.getElementById('title');
const timerEl = document.getElementById('timer');
const pollEl  = document.getElementById('poll');

// Local state for smooth timer
let lastSnapshot = null;
let localDeadline = null; // epoch ms when poll ends (if known)

// Small helper
function clamp(n, min, max){ return Math.max(min, Math.min(max, n)); }
function fmtTime(sec){
  sec = Math.max(0, Math.floor(sec));
  const m = Math.floor(sec/60);
  const s = sec % 60;
  return m > 0 ? `${m}:${String(s).padStart(2,'0')}` : `${s}s`;
}

// Render function – accepts unified shape
function render(snapshot){
  const title = snapshot.title || 'COMMUNITY VOTE';
  const options = snapshot.options || ['Option A','Option B','Option C'];
  const counts  = snapshot.counts || [0,0,0];
  const secsLeft = clamp(snapshot.secondsLeft ?? 0, 0, 24*3600);

  titleEl.textContent = title;

  // Bars
  const total = Math.max(1, counts.reduce((a,b)=>a+b,0));
  pollEl.innerHTML = options.map((opt, i) => {
    const c = counts[i] || 0;
    const pct = Math.round(c/total*100);
    return `
      <div class="row">
        <div class="label"><span class="name">${i+1}. ${opt}</span><span class="count">${c}</span></div>
        <div class="bar"><div class="fill" style="width:${pct}%"></div><div class="pct">${pct}%</div></div>
      </div>
    `;
  }).join('');

  // Timer
  if (localDeadline) {
    const remain = Math.max(0, Math.ceil((localDeadline - Date.now())/1000));
    timerEl.textContent = `Zeit: ${fmtTime(remain)}`;
  } else {
    timerEl.textContent = secsLeft ? `Zeit: ${fmtTime(secsLeft)}` : '';
  }
}

// Normalize incoming JSON into {title, options[], counts[], secondsLeft}
function normalize(data){
  if (!data || typeof data !== 'object') return { options:['A','B','C'], counts:[0,0,0], secondsLeft:0 };

  // Detect lightweight schema (c1/c2/c3 + ms)
  const hasLight = ('c1' in data) || ('c2' in data) || ('c3' in data) || ('ms' in data);
  if (hasLight) {
    const options = data.options && Array.isArray(data.options) ? data.options : ['Option A','Option B','Option C'];
    const counts  = [
      Number.isFinite(data.c1) ? data.c1 : 0,
      Number.isFinite(data.c2) ? data.c2 : 0,
      Number.isFinite(data.c3) ? data.c3 : 0,
    ];
    const secondsLeft = Number.isFinite(data.ms) ? Math.max(0, Math.floor(data.ms/1000)) : (data.secondsLeft|0) || 0;
    const title = data.title || 'COMMUNITY VOTE';
    return { title, options, counts, secondsLeft };
  }

  // Plugin schema (options/counts/secondsLeft/status...)
  const options = Array.isArray(data.options) ? data.options : ['Option A','Option B','Option C'];
  const counts  = Array.isArray(data.counts) ? data.counts.map(n => (Number.isFinite(n)?n:0)) : [0,0,0];
  const secondsLeft = (data.secondsLeft|0) || 0;
  const title = data.title || 'COMMUNITY VOTE';
  return { title, options, counts, secondsLeft };
}

// Polling fetch (works well on GitHub Pages without SDK)
async function fetchSnapshot(){
  const url = FIREBASE_URL.includes('.json') ? FIREBASE_URL : (FIREBASE_URL.replace(/\/+$/,'') + '/state.json');
  // cache-buster
  const res = await fetch(url + `?t=${Date.now()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

async function tick(){
  try {
    const raw = await fetchSnapshot();
    const snap = normalize(raw);

    // If changed significantly (or first load), reset local deadline
    const first = !lastSnapshot;
    const changedSecs = first || (snap.secondsLeft !== lastSnapshot.secondsLeft);
    const changedCounts = first || JSON.stringify(snap.counts) !== JSON.stringify(lastSnapshot.counts);

    if (changedSecs) {
      localDeadline = snap.secondsLeft > 0 ? Date.now() + snap.secondsLeft*1000 : null;
    }

    lastSnapshot = snap;
    render(snap);

    // If we have a deadline, run a lightweight local countdown between polls
    if (localDeadline) {
      // update the timer smoothly each 200ms without refetch
      scheduleSmoothTimer();
    }
  } catch(e){
    // show minimal error state but don’t spam
    timerEl.textContent = 'Lade…';
  } finally {
    setTimeout(tick, POLL_INTERVAL_MS);
  }
}

let smoothTimerId = null;
function scheduleSmoothTimer(){
  if (smoothTimerId) return;
  smoothTimerId = setInterval(() => {
    if (!localDeadline || !lastSnapshot) { clearInterval(smoothTimerId); smoothTimerId=null; return; }
    const remain = Math.max(0, Math.ceil((localDeadline - Date.now())/1000));
    timerEl.textContent = `Zeit: ${fmtTime(remain)}`;
    if (remain <= 0) { clearInterval(smoothTimerId); smoothTimerId=null; }
  }, 200);
}

// Kickoff
tick();
