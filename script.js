// >>> HIER DEINE FIREBASE-URL OHNE /state.json ANPASSEN <<<
const FIREBASE_URL = 'https://twitchpolloverlay-default-rtdb.europe-west1.firebasedatabase.app';

const elTimer = document.getElementById('timer');
const elSubtitle = document.getElementById('subtitle');
const elBars = document.getElementById('bars');

const elOpt = [
  document.getElementById('opt1'),
  document.getElementById('opt2'),
  document.getElementById('opt3'),
];
const elBar = [
  document.getElementById('bar1'),
  document.getElementById('bar2'),
  document.getElementById('bar3'),
];

let last = null;

function fmt(ms){
  if(ms < 0) ms = 0;
  const s = Math.floor(ms/1000);
  const m = Math.floor(s/60);
  const sec = s%60;
  return `${m}:${sec.toString().padStart(2,'0')}`;
}

function draw(state){
  const now = Date.now();
  const left = (state.endsAt ?? 0) - now;
  elTimer.textContent = fmt(left);

  if(state.status === 'running'){
    elSubtitle.textContent = 'Abstimmung läuft…';
    elBars.classList.remove('hidden');

    const options = state.options ?? ['Option A','Option B','Option C'];
    const counts  = state.counts  ?? [0,0,0];
    const total = Math.max(1, counts[0]+counts[1]+counts[2]);

    for(let i=0;i<3;i++){
      elOpt[i].textContent = `${options[i] ?? `Option ${i+1}`} (${counts[i] ?? 0})`;
      elBar[i].style.width = `${Math.round((counts[i] ?? 0)*100/total)}%`;
    }
  } else {
    // waiting (Cooldown) – Balken ausblenden, Timer zeigt Rest bis Start
    elSubtitle.textContent = 'Nächste Abstimmung in';
    elBars.classList.add('hidden');
  }
}

async function tick(){
  try{
    const res = await fetch(`${FIREBASE_URL}/state.json?cachebust=${Date.now()}`, {cache:'no-store'});
    if(!res.ok) throw new Error(res.status);
    const state = await res.json();
    if(!state || typeof state !== 'object'){ return; }
    last = state;
    draw(state);
  }catch(e){
    // Beim Ausfall einfach den letzten Zustand weiterzählen lassen
    if(last){
      last.endsAt -= 1000;
      draw(last);
    }
  }
}

setInterval(tick, 1000);
tick();
