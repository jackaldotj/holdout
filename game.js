/* Holdout — playable slice: idle camp + one Autumn War-style battle. */
'use strict';

// ---------- Data ----------
const RES = [
  { id: 'water', name: 'Water', icon: '💧' },
  { id: 'food', name: 'Food', icon: '🥫' },
  { id: 'wood', name: 'Wood', icon: '🪵' },
  { id: 'scrap', name: 'Scrap', icon: '🔩' },
  { id: 'rifles', name: 'Rifles', icon: '🔫' },
  { id: 'ammo', name: 'Ammo', icon: '🎯' },
  { id: 'armor', name: 'Armor', icon: '🦺' },
];

// AdVenture-style "businesses". out = produced per staffed unit per cycle.
const BUILDINGS = [
  { id: 'water', name: 'Rain barrels', icon: '🛢️', res: 'water', out: 4, time: 3, cost: { wood: 4 }, growth: 1.08, unlock: 1 },
  { id: 'wood', name: 'Chopping block', icon: '🪓', res: 'wood', out: 3, time: 4, cost: { wood: 6 }, growth: 1.09, unlock: 1 },
  { id: 'food', name: 'Garden beds', icon: '🥕', res: 'food', out: 3, time: 6, cost: { wood: 10, water: 6 }, growth: 1.10, unlock: 2 },
  { id: 'scrap', name: 'Scrap picking', icon: '🚗', res: 'scrap', out: 2, time: 5, cost: { wood: 12 }, growth: 1.10, unlock: 3 },
  { id: 'rifles', name: 'Gun workbench', icon: '🛠️', res: 'rifles', out: 1, time: 20, input: { wood: 3, scrap: 4 }, cost: { wood: 40, scrap: 30 }, growth: 1.15, unlock: 5 },
  { id: 'ammo', name: 'Reloading bench', icon: '⚙️', res: 'ammo', out: 12, time: 10, input: { scrap: 2 }, cost: { scrap: 40 }, growth: 1.13, unlock: 5 },
  { id: 'armor', name: 'Armor rack', icon: '🧰', res: 'armor', out: 1, time: 25, input: { scrap: 5, wood: 1 }, cost: { scrap: 60, wood: 20 }, growth: 1.15, unlock: 8 },
];
const MILESTONES = [10, 25, 50, 100, 200, 400];
const TENT = { cost: { wood: 15 }, growth: 1.18, beds: 2 };

const FIRST = ['Ana', 'Ben', 'Cole', 'Dana', 'Eli', 'Faye', 'Gus', 'Hana', 'Ivan', 'Jade', 'Kai', 'Lena', 'Marco', 'Nia', 'Owen', 'Pia', 'Quinn', 'Rosa', 'Sam', 'Tess', 'Uri', 'Vera', 'Wes', 'Xena', 'Yuri', 'Zoe', 'Abe', 'Bea', 'Cruz', 'Dex', 'Ema', 'Finn', 'Gia', 'Hal', 'Ida', 'Jon', 'Kit', 'Lou', 'Mae', 'Ned'];
const LAST = ['Reyes', 'Novak', 'Hart', 'Okafor', 'Lind', 'Price', 'Moreau', 'Kowal', 'Byrne', 'Sato', 'Diaz', 'Grant', 'Holt', 'Ivers', 'Park', 'Quist', 'Ross', 'Shaw', 'Tran', 'Vance'];
const SKILLS = ['scavenger', 'builder', 'farmer', 'medic', 'mechanic', 'gunsmith', 'fighter'];

const SECTOR_TYPES = {
  suburbs: { name: 'Suburbs', color: '#6d6a52', loot: { food: 40, wood: 30, scrap: 15 } },
  farm: { name: 'Farmland', color: '#7d7a3a', loot: { food: 80, water: 30 } },
  forest: { name: 'Forest', color: '#2f4a2a', loot: { wood: 90 } },
  mall: { name: 'Strip mall', color: '#5b5560', loot: { scrap: 60, food: 25 } },
  garage: { name: 'Gas station', color: '#6a4f37', loot: { scrap: 50, ammo: 40 } },
  police: { name: 'Police station', color: '#38465e', loot: { rifles: 4, ammo: 120, armor: 3 } },
  hospital: { name: 'Hospital', color: '#7b8a8f', loot: { food: 30, armor: 1 } },
  downtown: { name: 'Downtown', color: '#3e3f44', loot: { scrap: 120, rifles: 2 } },
  base: { name: 'Military base', color: '#4a5a33', loot: { rifles: 20, ammo: 500, armor: 10 } },
};

// ---------- Helpers ----------
const $ = (s, el = document) => el.querySelector(s);
const fmt = n => {
  n = Math.floor(n);
  if (n < 1000) return String(n);
  const u = ['K', 'M', 'B', 'T'];
  let i = -1;
  while (n >= 1000 && i < u.length - 1) { n /= 1000; i++; }
  return n.toFixed(n < 10 ? 2 : n < 100 ? 1 : 0) + u[i];
};
const costStr = c => Object.entries(c).map(([k, v]) => `${fmt(v)} ${RES.find(r => r.id === k).name.toLowerCase()}`).join(', ');
const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
function seeded(i) { const x = Math.sin(i * 9301 + 49297) * 233280; return x - Math.floor(x); }

// ---------- State ----------
const SAVE_KEY = 'holdout-save-v1';
let S;
function newState() {
  const s = {
    v: 1, t: Date.now(),
    res: { water: 10, food: 20, wood: 6, scrap: 0, rifles: 0, ammo: 0, armor: 0 },
    b: {}, tents: 0, hired: 0, morale: 70, mult: 1,
    people: [{ id: 0, name: 'You', skill: 'leader', job: 'you' }],
    nextId: 1, sectors: {}, cleared: 0, upkeepAcc: 0,
  };
  BUILDINGS.forEach(b => s.b[b.id] = { owned: b.id === 'water' || b.id === 'wood' ? 1 : 0, prog: 0, running: false, you: false, mgr: false });
  s.sectors['0,0'] = 'camp';
  return s;
}
function load() {
  try { const raw = localStorage.getItem(SAVE_KEY); if (raw) return JSON.parse(raw); } catch (e) { }
  return null;
}
function save() {
  S.t = Date.now();
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { }
}

// ---------- Camp economy ----------
const pop = () => S.people.length;
const beds = () => 2 + S.tents * TENT.beds;
const workers = id => S.people.filter(p => p.job === id).length;
const idle = () => S.people.filter(p => p.job === 'idle');
const bdef = id => BUILDINGS.find(b => b.id === id);
function unitCost(base, growth, owned, n) {
  const out = {};
  for (const [k, v] of Object.entries(base)) {
    // geometric series for buying n units
    out[k] = Math.ceil(v * Math.pow(growth, owned) * (Math.pow(growth, n) - 1) / (growth - 1));
  }
  return out;
}
const canAfford = c => Object.entries(c).every(([k, v]) => S.res[k] >= v);
const pay = c => Object.entries(c).forEach(([k, v]) => S.res[k] -= v);
function maxAffordable(base, growth, owned) {
  let n = 0;
  while (n < 1000 && canAfford(unitCost(base, growth, owned, n + 1))) n++;
  return n;
}
function buyCount(base, growth, owned) {
  if (S.mult === 'max') return Math.max(1, maxAffordable(base, growth, owned));
  return S.mult;
}
function cycleTime(def) {
  const st = S.b[def.id];
  let t = def.time;
  for (const m of MILESTONES) if (st.owned >= m) t /= 2;
  return t;
}
function nextMilestone(owned) { return MILESTONES.find(m => owned < m); }
function staffed(def) {
  const st = S.b[def.id];
  return Math.min(st.owned, workers(def.id) + (st.mgr ? 1 : 0) + (st.you ? 1 : 0));
}
function moraleMult() { return 0.8 + 0.4 * S.morale / 100; }
function sectorBonus() { return 1 + 0.05 * S.cleared; }

function produce(def, cycles) {
  const st = S.b[def.id];
  let units = staffed(def) * cycles;
  if (def.input) {
    for (const [k, v] of Object.entries(def.input)) units = Math.min(units, Math.floor(S.res[k] / v));
    for (const [k, v] of Object.entries(def.input)) S.res[k] -= v * units;
  }
  const amt = units * def.out * moraleMult() * sectorBonus() * (def.input ? 1 : shortageMult());
  S.res[def.res] += amt;
  return amt;
}
function shortageMult() { return (S.res.water <= 0 || S.res.food <= 0) ? 0.5 : 1; }

function startCycle(id) {
  const def = bdef(id), st = S.b[id];
  if (st.running || st.owned === 0) return;
  st.you = !st.mgr; // you lend a hand on manual runs
  if (staffed(def) === 0) { toast('Nobody to run it'); return; }
  st.running = true; st.prog = 0;
}

function tick(dt) {
  for (const def of BUILDINGS) {
    const st = S.b[def.id];
    if (st.mgr && !st.running && st.owned > 0) { st.running = true; st.prog = 0; }
    if (!st.running) continue;
    st.prog += dt;
    const ct = cycleTime(def);
    if (st.prog >= ct) {
      const cycles = Math.floor(st.prog / ct);
      produce(def, cycles);
      st.prog -= cycles * ct;
      if (!st.mgr) { st.running = false; st.prog = 0; st.you = false; }
    }
  }
  // Upkeep: 1 game day = 1 real hour; 3 L water + 1 ration per person per day.
  const day = dt / 3600;
  S.res.water = Math.max(0, S.res.water - pop() * 3 * day);
  S.res.food = Math.max(0, S.res.food - pop() * 1 * day);
  // Morale drifts toward a target.
  let target = 70;
  if (S.res.water <= 0) target -= 30;
  if (S.res.food <= 0) target -= 30;
  if (S.res.food > pop() * 3 && S.res.water > pop() * 9) target += 15;
  target += Math.min(15, S.cleared * 3);
  target = Math.max(0, Math.min(100, target));
  S.morale += Math.sign(target - S.morale) * Math.min(Math.abs(target - S.morale), dt * 0.2);
}

function offlineProgress(seconds) {
  seconds = Math.min(seconds, 8 * 3600);
  if (seconds < 30) return null;
  const before = { ...S.res };
  // Simulate in coarse steps so inputs are consumed in order.
  const steps = 200, dt = seconds / steps;
  for (const def of BUILDINGS) { const st = S.b[def.id]; if (!st.mgr) { st.running = false; st.prog = 0; st.you = false; } }
  for (let i = 0; i < steps; i++) tick(dt);
  const gained = {};
  for (const r of RES) gained[r.id] = S.res[r.id] - before[r.id];
  return { seconds, gained };
}

function hireCost() {
  const f = Math.pow(1.12, S.hired);
  return { food: Math.ceil(8 * f), water: Math.ceil(8 * f) };
}
function hire() {
  if (pop() >= beds()) { toast('Need a free bed. Build a tent.'); return; }
  const c = hireCost();
  if (!canAfford(c)) { toast('Not enough food and water'); return; }
  pay(c); S.hired++;
  const p = newPerson();
  S.people.push(p);
  toast(`${p.name} (${p.skill}) joined the camp`);
  checkUnlocks();
}
function newPerson() {
  return { id: S.nextId++, name: `${pick(FIRST)} ${pick(LAST)}`, skill: pick(SKILLS), job: 'idle' };
}
function mgrCost(def) { const i = BUILDINGS.indexOf(def); return { food: 25 * (i + 1), water: 25 * (i + 1) }; }
function hireManager(id) {
  const def = bdef(id), st = S.b[id];
  const free = idle();
  if (!free.length) { toast('Needs an idle survivor'); return; }
  const c = mgrCost(def);
  if (!canAfford(c)) { toast('Not enough food and water'); return; }
  pay(c);
  free[0].job = 'mgr:' + id;
  st.mgr = true;
  toast(`${free[0].name} now runs the ${def.name.toLowerCase()}`);
}
function assign(id, delta) {
  if (delta > 0) {
    const free = idle();
    if (!free.length) { toast('No idle survivors. Hire more.'); return; }
    free[0].job = id;
  } else {
    const w = S.people.find(p => p.job === id);
    if (w) w.job = 'idle';
  }
}
let lastUnlockPop = 0;
function checkUnlocks() {
  for (const def of BUILDINGS) if (pop() === def.unlock && def.unlock > 1 && lastUnlockPop < pop()) toast(`Unlocked: ${def.name}`);
  lastUnlockPop = pop();
}

// ---------- Rendering: top bar ----------
function renderTop() {
  const show = ['water', 'food', 'wood', 'scrap', 'rifles', 'ammo', 'armor'];
  $('#res').innerHTML = show.map(id => {
    const r = RES.find(x => x.id === id);
    return `<div class="r"><span>${r.icon} <small>${r.name}</small></span><b>${fmt(S.res[id])}</b></div>`;
  }).join('') + `<div class="r"><span>👥 <small>People</small></span><b>${pop()}/${beds()}</b></div>`;
  const m = Math.round(S.morale);
  $('#moraleFill').style.width = m + '%';
  $('#moraleFill').style.background = m >= 80 ? 'var(--good)' : m >= 50 ? '#b8b04a' : m >= 30 ? 'var(--accent)' : 'var(--bad)';
  $('#moraleVal').textContent = `${m} ${m >= 80 ? 'Hopeful' : m >= 50 ? 'Steady' : m >= 30 ? 'Uneasy' : 'Desperate'}`;
}

// ---------- Camp tab ----------
function renderCamp() {
  const el = $('#tab-camp');
  let h = `<div class="mult">${[1, 10, 'max'].map(m => `<button class="btn ${S.mult === m ? 'on' : ''}" data-mult="${m}">${m === 'max' ? 'Max' : '×' + m}</button>`).join('')}</div>`;
  h += `<h2>Resources & production</h2>`;
  for (const def of BUILDINGS) {
    const st = S.b[def.id];
    if (pop() < def.unlock) {
      h += `<div class="row locked"><div class="tapbtn">🔒</div><div class="top"><span class="name">${def.name}</span></div><div class="out">Unlocks at ${def.unlock} people</div></div>`;
      continue;
    }
    const n = buyCount(def.cost, def.growth, st.owned);
    const c = unitCost(def.cost, def.growth, st.owned, n);
    const ct = cycleTime(def);
    const pct = st.running ? Math.min(100, st.prog / ct * 100) : 0;
    const ns = nextMilestone(st.owned);
    const w = workers(def.id);
    const inp = def.input ? ` · uses ${costStr(def.input)}` : '';
    h += `<div class="row" data-b="${def.id}">
      <button class="tapbtn ${st.mgr ? 'auto' : ''}" data-tap="${def.id}">${def.icon}<span class="cnt">${st.owned}</span></button>
      <div>
        <div class="top"><span class="name">${def.name}</span><span class="out">+${fmt(def.out * Math.max(1, staffed(def)))} ${def.res} / ${ct < 1 ? ct.toFixed(2) : ct.toFixed(ct < 10 ? 1 : 0)}s</span></div>
        <div class="prog"><div style="width:${pct}%"></div><span>${st.mgr ? 'Auto' : st.running ? 'Working…' : 'Tap to work'}${inp}</span></div>
      </div>
      <div class="ctrl" style="grid-column: 1 / -1">
        <button class="btn buy" data-buy="${def.id}" ${canAfford(c) ? '' : 'disabled'}>Buy ×${n}<small>${costStr(c)}</small></button>
        <div class="staff">Staff <button class="btn" data-assign="${def.id}" data-d="-1">−</button><b>${Math.min(st.owned, w + (st.mgr ? 1 : 0))}/${st.owned}</b><button class="btn" data-assign="${def.id}" data-d="1">+</button></div>
      </div>
      <div class="ctrl" style="grid-column: 1 / -1; justify-content: space-between">
        ${st.mgr ? `<span class="mgr on">✔ Manager on duty</span>` : `<button class="btn mgr" data-mgr="${def.id}">Hire manager · ${costStr(mgrCost(def))}</button>`}
        <span class="mstone">${ns ? `Speed ×2 at ${ns}` : 'Max speed'}</span>
      </div>
    </div>`;
  }
  const tn = S.mult === 'max' ? Math.max(1, maxAffordable(TENT.cost, TENT.growth, S.tents)) : S.mult;
  const tc = unitCost(TENT.cost, TENT.growth, S.tents, tn);
  h += `<h2>Shelter</h2><div class="row"><div class="tapbtn">⛺<span class="cnt">${S.tents}</span></div>
    <div><div class="top"><span class="name">Tents</span><span class="out">${beds()} beds</span></div><div class="out">Each tent sleeps 2. Everyone needs a bed.</div></div>
    <div class="ctrl" style="grid-column:1/-1"><button class="btn buy" data-tent ${canAfford(tc) ? '' : 'disabled'}>Buy ×${tn}<small>${costStr(tc)}</small></button></div></div>`;
  el.innerHTML = h;
}

// Light per-frame update without rebuilding the DOM (keeps taps responsive).
function updateCampBars() {
  for (const def of BUILDINGS) {
    const row = document.querySelector(`.row[data-b="${def.id}"]`);
    if (!row) continue;
    const st = S.b[def.id];
    const pct = st.running ? Math.min(100, st.prog / cycleTime(def) * 100) : 0;
    row.querySelector('.prog > div').style.width = (cycleTime(def) < 0.3 && st.running ? 100 : pct) + '%';
  }
}

// ---------- People tab ----------
function renderPeople() {
  const c = hireCost();
  const counts = {};
  S.people.forEach(p => { const j = p.job.startsWith('mgr:') ? 'manager' : p.job; counts[j] = (counts[j] || 0) + 1; });
  let h = `<div class="card"><b>Survivors at the fence</b>
    <p>Hiring costs food and water, and every person needs a bed. Each hire costs more than the last.</p>
    <p>Daily upkeep (1 game day = 1 real hour): ${fmt(pop() * 3)} L water, ${fmt(pop())} food.</p>
    <button class="btn primary" data-hire style="width:100%;margin-top:6px" ${canAfford(c) && pop() < beds() ? '' : 'disabled'}>Hire survivor · ${costStr(c)}</button>
    ${pop() >= beds() ? '<p style="color:var(--bad)">No free beds. Build tents on the Camp tab.</p>' : ''}
  </div>`;
  h += `<div class="card"><b>Fighters</b><p>Idle survivors can join an assault. Riflemen and snipers each need a rifle and ammo from your stores. Anyone killed in battle is gone for good.</p>
    <p>Idle: <b>${idle().length}</b> · Rifles: <b>${fmt(S.res.rifles)}</b> · Ammo: <b>${fmt(S.res.ammo)}</b> · Armor: <b>${fmt(S.res.armor)}</b></p></div>`;
  h += `<h2>Everyone (${pop()})</h2><div class="plist">` + S.people.map(p => {
    const job = p.job === 'you' ? 'camp leader' : p.job === 'idle' ? 'idle' : p.job.startsWith('mgr:') ? 'manager · ' + bdef(p.job.slice(4)).name : bdef(p.job).name;
    return `<div class="person"><span>${p.name} <small style="color:var(--muted)">${p.skill}</small></span><span>${job}</span></div>`;
  }).join('') + `</div>`;
  h += `<h2>Save</h2><div class="card"><p>Safari can clear site data after 7 days without a visit. Add Holdout to your home screen (Share → Add to Home Screen) and keep a backup code.</p>
    <div class="ctrl"><button class="btn" data-export>Export save</button><button class="btn" data-import>Import save</button><button class="btn" data-reset>Restart</button></div></div>`;
  $('#tab-people').innerHTML = h;
}

// ---------- Map tab ----------
let selSector = null;
function sectorType(r, c) {
  if (r === 9 && c === 9) return 'base';
  const x = seeded(r * 10 + c + 1);
  const d = r + c;
  if (d > 12 && x < 0.5) return 'downtown';
  if (x < 0.05) return 'hospital';
  if (x < 0.1) return 'police';
  if (x < 0.18) return 'garage';
  if (x < 0.33) return 'mall';
  if (x < 0.45) return 'forest';
  if (x < 0.6) return 'farm';
  return 'suburbs';
}
function sectorHorde(r, c) { return Math.round(14 + 9 * (r + c) + (sectorType(r, c) === 'downtown' ? 25 : 0) + (sectorType(r, c) === 'base' ? 120 : 0)); }
const sectorState = (r, c) => S.sectors[`${r},${c}`] || 'over';
function adjacentHeld(r, c) {
  return [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dr, dc]) => { const s = S.sectors[`${r + dr},${c + dc}`]; return s === 'camp' || s === 'clear'; });
}
const colName = c => 'ABCDEFGHIJ'[c];
let loadout = { brawler: 0, rifleman: 0, sniper: 0, medic: 0 };
function renderMap() {
  let h = `<div id="grid">`;
  for (let r = 0; r < 10; r++) for (let c = 0; c < 10; c++) {
    const st = sectorState(r, c), t = SECTOR_TYPES[sectorType(r, c)];
    let cls = st === 'camp' ? 'camp' : st === 'clear' ? 'clear' : adjacentHeld(r, c) ? 'avail' : 'over';
    if (selSector && selSector[0] === r && selSector[1] === c) cls += ' sel';
    h += `<button class="sec ${cls}" data-sec="${r},${c}" style="background:${t.color}">${st === 'camp' ? '⛺' : st === 'clear' ? '✓' : ''}</button>`;
  }
  h += `</div><div class="legend"><span><i style="background:var(--accent)"></i>Camp</span><span><i style="background:var(--good)"></i>Cleared</span><span><i style="background:var(--bad)"></i>Can attack</span><span>${S.cleared}/99 sectors cleared</span></div>`;
  if (selSector) {
    const [r, c] = selSector;
    const st = sectorState(r, c), type = sectorType(r, c), t = SECTOR_TYPES[type];
    h += `<div class="card"><b>${colName(c)}${r + 1} · ${t.name}</b>`;
    if (st === 'camp') h += `<p>Your camp.</p>`;
    else if (st === 'clear') h += `<p>Cleared and held. +5% to all camp production.</p>`;
    else if (!adjacentHeld(r, c)) h += `<p>Too far. Clear a neighbouring sector first.</p><p>Estimated horde: ~${sectorHorde(r, c)}</p>`;
    else {
      h += `<p>Estimated horde: <b>${sectorHorde(r, c)}</b> zombies. Loot: ${costStr(t.loot)}, maybe survivors.</p>`;
      h += renderLoadout();
    }
    h += `</div>`;
  } else h += `<div class="card"><p>Tap a sector next to your camp to plan an assault.</p></div>`;
  $('#tab-map').innerHTML = h;
}
const UNIT_INFO = {
  brawler: { name: 'Brawler', note: 'Melee, club or pipe. No gear needed.' },
  rifleman: { name: 'Rifleman', note: '1 rifle + ammo. Steady mid-range fire.' },
  sniper: { name: 'Sniper', note: '1 rifle + ammo. Long range, slow, big hits.' },
  medic: { name: 'Medic', note: 'Heals nearby soldiers. Doesn’t fight.' },
};
function loadoutTotal() { return Object.values(loadout).reduce((a, b) => a + b, 0); }
function renderLoadout() {
  let h = `<div style="margin-top:8px">`;
  for (const [k, u] of Object.entries(UNIT_INFO)) {
    h += `<div class="step"><div><b>${u.name}</b><small>${u.note}</small></div><div class="staff"><button class="btn" data-lo="${k}" data-d="-1">−</button><b>${loadout[k]}</b><button class="btn" data-lo="${k}" data-d="1">+</button></div></div>`;
  }
  const gunners = loadout.rifleman + loadout.sniper;
  h += `<p>Squad ${loadoutTotal()}/12 · idle survivors ${idle().length} · rifles ${gunners}/${fmt(S.res.rifles)} · ammo carried ${fmt(Math.min(S.res.ammo, gunners * 40))} · armor ${Math.min(S.res.armor, loadoutTotal())}</p>`;
  h += `<button class="btn primary" data-assault style="width:100%" ${loadoutTotal() ? '' : 'disabled'}>Launch assault</button></div>`;
  return h;
}
function changeLoadout(k, d) {
  if (d > 0) {
    if (loadoutTotal() >= 12) return toast('Squad is full (12)');
    if (loadoutTotal() >= idle().length) return toast('Not enough idle survivors. Free some from jobs.');
    if ((k === 'rifleman' || k === 'sniper') && loadout.rifleman + loadout.sniper >= S.res.rifles) return toast('Not enough rifles. Build a gun workbench.');
    loadout[k]++;
  } else if (loadout[k] > 0) loadout[k]--;
}

// ---------- Modal / toast ----------
let toastT;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2200); }
function modal(html) { $('#modalBox').innerHTML = html; $('#modal').hidden = false; }
function closeModal() { $('#modal').hidden = true; }

// ---------- Events ----------
let tab = 'camp';
function render() {
  renderTop();
  if (tab === 'camp') renderCamp();
  if (tab === 'people') renderPeople();
  if (tab === 'map') renderMap();
}
document.addEventListener('click', e => {
  const t = e.target.closest('button');
  if (!t) return;
  unlockAudio();
  const d = t.dataset;
  if (d.tab) {
    tab = d.tab;
    document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('active', b === t));
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === 'tab-' + tab));
    $('#screens').scrollTop = 0;
  } else if (d.mult) S.mult = d.mult === 'max' ? 'max' : +d.mult;
  else if (d.tap) { startCycle(d.tap); blip(); }
  else if (d.buy) {
    const def = bdef(d.buy), st = S.b[d.buy];
    const n = buyCount(def.cost, def.growth, st.owned), c = unitCost(def.cost, def.growth, st.owned, n);
    if (canAfford(c)) {
      const before = nextMilestone(st.owned);
      pay(c); st.owned += n;
      if (before && st.owned >= before) toast(`${def.name}: milestone ${before}! Twice as fast.`);
    }
  } else if (d.tent !== undefined) {
    const n = S.mult === 'max' ? Math.max(1, maxAffordable(TENT.cost, TENT.growth, S.tents)) : S.mult;
    const c = unitCost(TENT.cost, TENT.growth, S.tents, n);
    if (canAfford(c)) { pay(c); S.tents += n; }
  } else if (d.assign) assign(d.assign, +d.d);
  else if (d.mgr) hireManager(d.mgr);
  else if (d.hire !== undefined) hire();
  else if (d.sec) { selSector = d.sec.split(',').map(Number); loadout = { brawler: 0, rifleman: 0, sniper: 0, medic: 0 }; }
  else if (d.lo) changeLoadout(d.lo, +d.d);
  else if (d.assault !== undefined) startBattle();
  else if (d.export !== undefined) {
    save();
    modal(`<h3>Backup code</h3><p>Copy this somewhere safe.</p><textarea readonly>${btoa(unescape(encodeURIComponent(JSON.stringify(S))))}</textarea><div class="actions"><button class="btn" data-close>Close</button></div>`);
    return;
  } else if (d.import !== undefined) {
    modal(`<h3>Import save</h3><textarea id="impTxt" placeholder="Paste your backup code"></textarea><div class="actions"><button class="btn" data-close>Cancel</button><button class="btn primary" data-doimport>Import</button></div>`);
    return;
  } else if (d.doimport !== undefined) {
    try { S = JSON.parse(decodeURIComponent(escape(atob($('#impTxt').value.trim())))); save(); closeModal(); toast('Save loaded'); } catch (err) { toast('That code didn’t work'); }
  } else if (d.reset !== undefined) {
    modal(`<h3>Restart?</h3><p>This wipes your camp and starts over.</p><div class="actions"><button class="btn" data-close>Cancel</button><button class="btn primary" data-doreset>Restart</button></div>`);
    return;
  } else if (d.doreset !== undefined) { S = newState(); save(); closeModal(); }
  else if (d.close !== undefined) closeModal();
  else if (d.stance) setStance(d.stance);
  else if (d.endbattle !== undefined) { closeModal(); }
  render();
});

// ---------- Audio (unlocked on first tap, iOS requirement) ----------
let AC = null;
function unlockAudio() {
  if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
  try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { }
}
function tone(freq, dur, type = 'square', vol = 0.04) {
  if (!AC) return;
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(vol, AC.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, AC.currentTime + dur);
  o.connect(g).connect(AC.destination); o.start(); o.stop(AC.currentTime + dur);
}
function blip() { tone(520, 0.06, 'triangle', 0.05); }
function shot(big) {
  if (!AC) return;
  const len = 0.12, buf = AC.createBuffer(1, AC.sampleRate * len, AC.sampleRate), ch = buf.getChannelData(0);
  for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / ch.length, 3);
  const s = AC.createBufferSource(), g = AC.createGain();
  s.buffer = buf; g.gain.value = big ? 0.12 : 0.06; s.connect(g).connect(AC.destination); s.start();
}

// ---------- Battle ----------
const W_END = 2600, GROUND = 0.86;
let B = null; // battle state
const SPEED = { retreat: -95, back: -32, hold: 0, advance: 34, charge: 95 };
const STANCE_TEXT = { retreat: 'RETREATING', back: 'FALLING BACK', hold: 'HOLDING GROUND', advance: 'ADVANCING', charge: 'CHARGING' };

function startBattle() {
  const [r, c] = selSector;
  const free = idle();
  const squad = [];
  const order = ['brawler', 'rifleman', 'medic', 'sniper'];
  let armorLeft = S.res.armor;
  let fi = 0;
  for (const type of order) for (let i = 0; i < loadout[type]; i++) {
    const p = free[fi++];
    const armored = armorLeft > 0; if (armored) armorLeft--;
    squad.push({ p, type, x: 0, hp: 100, armor: armored, cd: rand(0, 1), flash: 0, dead: false, bob: rand(0, 6), lane: rand(-1, 1), scale: rand(0.92, 1.05) });
  }
  const gunners = loadout.rifleman + loadout.sniper;
  const ammo = Math.min(S.res.ammo, gunners * 40);
  S.res.ammo -= ammo;
  const usedArmor = S.res.armor - armorLeft;
  S.res.armor = armorLeft;
  // Formation offsets: brawlers in front, medics and snipers behind.
  const off = { brawler: 30, rifleman: 0, medic: -40, sniper: -70 };
  const counts = {};
  squad.forEach(s => { counts[s.type] = (counts[s.type] || 0); s.off = off[s.type] - counts[s.type] * 16; counts[s.type]++; s.x = 120 + s.off; });
  const total = sectorHorde(r, c);
  B = {
    r, c, squad, total, killed: 0, zeds: [], pool: total, ammo, ammoStart: ammo, usedArmor,
    stance: 'hold', squadX: 120, surge: 22, noise: 0, time: 0, over: false, fx: [], tracers: [],
    type: sectorType(r, c), seed: Math.random() * 1000,
  };
  // Initial zombies scattered ahead.
  const initial = Math.round(total * 0.35);
  for (let i = 0; i < initial; i++) spawnZed(rand(500, W_END - 100));
  B.pool -= initial;
  $('#battle').hidden = false; $('#battle').classList.add('active');
  setStance('hold');
  resizeCanvas();
  lastBT = performance.now();
  requestAnimationFrame(battleLoop);
}
function spawnZed(x) {
  const fresh = Math.random() < 0.25 + Math.min(0.3, (B.r + B.c) * 0.02);
  B.zeds.push({ x, hp: fresh ? 45 : 70, max: fresh ? 45 : 70, speed: fresh ? rand(40, 55) : rand(14, 22), dmg: fresh ? 13 : 9, fresh, dead: false, bob: rand(0, 6), lane: rand(-1, 1), scale: rand(0.9, 1.1), hit: 0, crawl: !fresh && Math.random() < 0.12 });
}
function setStance(s) {
  if (!B) return;
  B.stance = s;
  $('#stanceText').textContent = STANCE_TEXT[s];
  document.querySelectorAll('#orders button').forEach(b => b.classList.toggle('on', b.dataset.stance === s));
  blip();
}
const alive = () => B.squad.filter(s => !s.dead);
function front() { const a = alive(); return a.length ? Math.max(...a.map(s => s.x)) : B.squadX; }

function battleStep(dt) {
  B.time += dt;
  const a = alive();
  if (!a.length) return endBattle('lost');
  // Squad anchor movement, blocked by zombies in contact at the front.
  const fx = front();
  const blocked = B.zeds.some(z => !z.dead && z.x - fx < 22 && z.x - fx > -10);
  let v = SPEED[B.stance];
  if (v > 0 && blocked) v = 0;
  B.squadX = Math.min(W_END, B.squadX + v * dt);
  if (B.squadX < -60) return endBattle('retreat');
  // Soldiers move toward their slot.
  for (const s of a) {
    const target = B.squadX + s.off;
    const contact = B.zeds.some(z => !z.dead && z.x - s.x < 16 && z.x - s.x > -6);
    let dx = target - s.x;
    if (dx > 0 && contact) dx = 0;
    const max = Math.abs(SPEED[B.stance] || 40) * 1.3 + 20;
    s.x += Math.sign(dx) * Math.min(Math.abs(dx), max * dt);
    s.moving = Math.abs(dx) > 1;
    s.cd -= dt; s.flash -= dt;
    // Combat
    if (s.type === 'medic') {
      const hurt = a.filter(o => o !== s && o.hp < 100 && Math.abs(o.x - s.x) < 90).sort((p, q) => p.hp - q.hp)[0];
      if (hurt) hurt.hp = Math.min(100, hurt.hp + 9 * dt);
      continue;
    }
    const gun = (s.type === 'rifleman' || s.type === 'sniper') && B.ammo > 0;
    const range = gun ? (s.type === 'sniper' ? 520 : 280) : 22;
    const tgt = nearestZed(s.x, range);
    if (tgt && s.cd <= 0) {
      if (gun) {
        B.ammo--;
        const sniper = s.type === 'sniper';
        const acc = (sniper ? 0.9 : 0.72) * (B.stance === 'charge' ? 0.6 : B.stance === 'hold' ? 1.1 : 1);
        s.cd = sniper ? 2.4 : (B.stance === 'charge' ? 1.6 : 0.85) * rand(0.85, 1.15);
        s.flash = 0.07;
        B.tracers.push({ x1: s.x + 22, y1: s.lane, x2: tgt.x, life: 0.06 });
        B.noise += sniper ? 1.2 : 1;
        B.surge -= sniper ? 0.18 : 0.12;
        shot(sniper);
        if (Math.random() < acc) hurtZed(tgt, sniper ? 110 : rand(28, 40));
      } else {
        s.cd = 0.8;
        hurtZed(tgt, (s.type === 'brawler' ? 24 : 12) * (B.stance === 'charge' ? 1.5 : 1));
        tone(140, 0.05, 'sawtooth', 0.03);
      }
    }
  }
  // Zombies
  for (const z of B.zeds) {
    if (z.dead) { z.fade = (z.fade || 0) + dt; continue; }
    z.hit -= dt;
    const tgt = a.reduce((best, s) => (s.x <= z.x + 10 && (!best || s.x > best.x)) ? s : best, null) || a[0];
    if (z.x - tgt.x > 14) z.x -= z.speed * (z.crawl ? 0.6 : 1) * dt;
    else {
      const dmg = z.dmg * dt * (tgt.armor ? 0.55 : 1);
      tgt.hp -= dmg;
      if (tgt.hp <= 0 && !tgt.dead) { tgt.dead = true; tone(90, 0.3, 'sine', 0.08); }
    }
  }
  B.zeds = B.zeds.filter(z => !z.dead || z.fade < 3);
  // Surges: noise brings waves sooner.
  B.surge -= dt;
  if (B.surge <= 0 && B.pool > 0) {
    const n = Math.min(B.pool, Math.round(6 + B.total * 0.08 + B.noise * 0.05));
    const camR = camX + viewW;
    for (let i = 0; i < n; i++) spawnZed(Math.min(W_END + 40, camR + 30 + i * rand(12, 30)));
    B.pool -= n; B.noise *= 0.5;
    B.surge = 24;
    toast('Surge incoming!');
  }
  for (const t of B.tracers) t.life -= dt;
  B.tracers = B.tracers.filter(t => t.life > 0);
  const left = B.total - B.killed;
  if (left <= 0 && front() >= W_END - 160) return endBattle('won');
}
function nearestZed(x, range) {
  let best = null, bd = 1e9;
  for (const z of B.zeds) {
    if (z.dead) continue;
    const d = z.x - x;
    if (d > -8 && d < range && d < bd) { bd = d; best = z; }
  }
  return best;
}
function hurtZed(z, dmg) {
  z.hp -= dmg; z.hit = 0.1;
  if (z.hp <= 0 && !z.dead) { z.dead = true; B.killed++; }
}

function endBattle(result) {
  if (B.over) return;
  B.over = true;
  const dead = B.squad.filter(s => s.dead);
  const survivors = B.squad.filter(s => !s.dead);
  // Permanent deaths: remove from the camp.
  const deadIds = new Set(dead.map(s => s.p.id));
  S.people = S.people.filter(p => !deadIds.has(p.id));
  // Gear: dead gunners lose their rifles; armor returns with the living.
  const lostRifles = dead.filter(s => s.type === 'rifleman' || s.type === 'sniper').length;
  S.res.rifles = Math.max(0, S.res.rifles - lostRifles);
  S.res.armor += survivors.filter(s => s.armor).length;
  S.res.ammo += B.ammo;
  const usedAmmo = B.ammoStart - B.ammo;
  let lootHtml = '', rescued = [];
  if (result === 'won') {
    S.sectors[`${B.r},${B.c}`] = 'clear'; S.cleared++;
    const loot = SECTOR_TYPES[B.type].loot;
    const f = 1 + (B.r + B.c) * 0.25;
    const got = {};
    for (const [k, v] of Object.entries(loot)) { got[k] = Math.round(v * f); S.res[k] += got[k]; }
    lootHtml = `<li>Loot: ${costStr(got)}</li>`;
    const n = Math.random() < 0.7 ? Math.ceil(rand(0, 2)) : 0;
    for (let i = 0; i < n; i++) { const p = newPerson(); S.people.push(p); rescued.push(p.name); }
    S.morale = Math.min(100, S.morale + 8);
  } else {
    // Damage done stays done: a smaller horde next time is modelled by more cleared progress later.
    S.morale = Math.max(0, S.morale - 5);
  }
  S.morale = Math.max(0, S.morale - dead.length * 3);
  save();
  const title = result === 'won' ? 'Sector cleared' : result === 'retreat' ? 'Squad retreated' : 'Squad lost';
  const sec = `${colName(B.c)}${B.r + 1} · ${SECTOR_TYPES[B.type].name}`;
  stopBattleView();
  modal(`<h3>${title}</h3><p style="color:var(--muted)">${sec}</p><ul>
    <li>Zombies killed: ${B.killed} of ${B.total}</li>
    <li>Killed in action: ${dead.length ? dead.map(s => s.p.name).join(', ') : 'nobody'}</li>
    <li>Ammo used: ${usedAmmo}${lostRifles ? `, rifles lost: ${lostRifles}` : ''}</li>
    ${lootHtml}
    ${rescued.length ? `<li>Survivors rescued: ${rescued.join(', ')}${pop() > beds() ? ' (they need beds!)' : ''}</li>` : ''}
    </ul><div class="actions"><button class="btn primary" data-endbattle>Back to camp</button></div>`);
  selSector = null;
  B = null;
  render();
}
function stopBattleView() { $('#battle').hidden = true; $('#battle').classList.remove('active'); }

// ---------- Battle drawing (original placeholder art: dark side-on silhouettes) ----------
const cv = $('#bcanvas'), cx = cv.getContext('2d');
let viewW = 800, viewH = 300, camX = 0, dpr = 1;
function resizeCanvas() {
  const r = cv.getBoundingClientRect();
  dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
  // Logical height fixed at 230 so gameplay looks the same on every phone.
  viewH = 230; viewW = r.width / r.height * viewH;
}
window.addEventListener('resize', () => { if (B) resizeCanvas(); });

function drawBattle() {
  const k = cv.height / viewH;
  cx.setTransform(k, 0, 0, k, 0, 0);
  camX = Math.max(0, Math.min(W_END + 200 - viewW, front() - viewW * 0.38));
  const g = viewH * GROUND;
  // Sky: dusk
  const sky = cx.createLinearGradient(0, 0, 0, g);
  sky.addColorStop(0, '#3c4250'); sky.addColorStop(0.6, '#8b7f72'); sky.addColorStop(1, '#c79a6a');
  cx.fillStyle = sky; cx.fillRect(0, 0, viewW, viewH);
  // Parallax tree lines
  treeLine(0.15, g - 40, 70, '#5e5e5e', 11);
  treeLine(0.35, g - 18, 90, '#3c4038', 23);
  // Fog band
  const fog = cx.createLinearGradient(0, g - 70, 0, g);
  fog.addColorStop(0, 'rgba(200,190,175,0)'); fog.addColorStop(1, 'rgba(200,190,175,.35)');
  cx.fillStyle = fog; cx.fillRect(0, g - 70, viewW, 70);
  // Ground
  cx.fillStyle = '#2a3020'; cx.fillRect(0, g, viewW, viewH - g);
  // Back grass
  grass(0.8, g + 2, '#34402a', 7);
  // Finish line
  const fxp = W_END - camX;
  if (fxp < viewW + 20) { cx.fillStyle = 'rgba(255,255,255,.5)'; cx.fillRect(fxp, g - 140, 2, 160); }
  // Entities sorted by lane (depth)
  const ents = [];
  for (const z of B.zeds) ents.push({ e: z, z: true });
  for (const s of B.squad) if (!s.dead) ents.push({ e: s, z: false });
  ents.sort((p, q) => p.e.lane - q.e.lane);
  for (const it of ents) it.z ? drawZed(it.e, g) : drawSoldier(it.e, g);
  // Tracers
  cx.strokeStyle = 'rgba(255,230,140,.85)'; cx.lineWidth = 1;
  for (const t of B.tracers) { const y = g + t.y1 * 6 - 46; cx.beginPath(); cx.moveTo(t.x1 - camX, y); cx.lineTo(t.x2 - camX, y + 4); cx.stroke(); }
  // Front grass over feet
  grass(1, g + 14, '#1d2416', 5);
}
function treeLine(par, base, h, col, seed) {
  cx.fillStyle = col;
  const off = camX * par;
  const step = 34;
  const start = Math.floor(off / step) - 1;
  cx.beginPath();
  cx.moveTo(0, base + 10);
  for (let i = start; i < start + viewW / step + 3; i++) {
    const x = i * step - off;
    const th = h * (0.55 + 0.45 * seeded(i * seed));
    cx.lineTo(x, base); cx.lineTo(x + step / 2, base - th); cx.lineTo(x + step, base);
  }
  cx.lineTo(viewW, base + 10); cx.closePath(); cx.fill();
  cx.fillRect(0, base, viewW, 12);
}
function grass(par, base, col, step) {
  cx.fillStyle = col;
  const off = camX * par;
  const start = Math.floor(off / step) - 1;
  cx.beginPath(); cx.moveTo(0, viewH);
  for (let i = start; i < start + viewW / step + 3; i++) {
    const x = i * step - off;
    cx.lineTo(x, base); cx.lineTo(x + step / 2, base - 8 - 10 * seeded(i * 7 + par * 100)); cx.lineTo(x + step, base);
  }
  cx.lineTo(viewW, viewH); cx.closePath(); cx.fill();
}
function drawSoldier(s, g) {
  const x = s.x - camX; if (x < -40 || x > viewW + 40) return;
  const sc = s.scale * 0.95, y = g + s.lane * 6;
  const walk = s.moving ? Math.sin(B.time * 9 + s.bob) * 4 : 0;
  cx.save(); cx.translate(x, y); cx.scale(sc, sc);
  const body = s.hp < 35 ? '#3a2a24' : '#262a20';
  cx.fillStyle = body; cx.strokeStyle = body; cx.lineCap = 'round';
  // legs
  cx.lineWidth = 6; cx.beginPath(); cx.moveTo(0, -30); cx.lineTo(-4 + walk, 0); cx.moveTo(2, -30); cx.lineTo(6 - walk, 0); cx.stroke();
  // torso (vest if armored)
  cx.fillStyle = s.armor ? '#353d2a' : body;
  cx.fillRect(-7, -58, 15, 30);
  // head + helmet
  cx.fillStyle = '#262a20'; cx.beginPath(); cx.arc(1, -64, 6, 0, Math.PI * 2); cx.fill();
  cx.fillStyle = '#323827'; cx.beginPath(); cx.arc(1, -66, 8, Math.PI, 0); cx.fill();
  cx.strokeStyle = '#1a1c16'; cx.lineWidth = 3;
  if (s.type === 'rifleman' || s.type === 'sniper') {
    const len = s.type === 'sniper' ? 32 : 26;
    cx.beginPath(); cx.moveTo(-2, -50); cx.lineTo(len, -52); cx.stroke();
    cx.lineWidth = 4; cx.beginPath(); cx.moveTo(4, -54); cx.lineTo(14, -51); cx.stroke();
    if (s.flash > 0) { cx.fillStyle = '#ffd56a'; cx.beginPath(); cx.arc(len + 3, -52, 5, 0, Math.PI * 2); cx.fill(); }
  } else if (s.type === 'brawler') {
    const sw = s.cd > 0.6 ? -1.2 : 0.4;
    cx.save(); cx.translate(4, -52); cx.rotate(sw); cx.lineWidth = 3; cx.beginPath(); cx.moveTo(0, 0); cx.lineTo(18, 0); cx.stroke(); cx.restore();
  } else if (s.type === 'medic') {
    cx.fillStyle = '#d9d2c0'; cx.fillRect(-6, -52, 8, 8); cx.fillStyle = '#b33'; cx.fillRect(-3.5, -51, 3, 6); cx.fillRect(-5, -49.5, 6, 3);
  }
  cx.restore();
  // health tick
  if (s.hp < 100) { cx.fillStyle = '#000a'; cx.fillRect(x - 10, y - 82, 20, 3); cx.fillStyle = s.hp > 50 ? '#7fc95a' : '#e0312b'; cx.fillRect(x - 10, y - 82, 20 * s.hp / 100, 3); }
}
function drawZed(z, g) {
  const x = z.x - camX; if (x < -40 || x > viewW + 40) return;
  const y = g + z.lane * 6;
  cx.save(); cx.translate(x, y); cx.scale(z.scale, z.scale);
  if (z.dead) { cx.globalAlpha = Math.max(0, 1 - (z.fade || 0) / 3); cx.fillStyle = '#2d2f26'; cx.fillRect(-14, -5, 30, 6); cx.restore(); return; }
  const col = z.hit > 0 ? '#7a3a2a' : z.fresh ? '#4a4d3c' : '#3e4236';
  cx.fillStyle = col; cx.strokeStyle = col; cx.lineCap = 'round';
  const sway = Math.sin(B.time * (z.fresh ? 8 : 3) + z.bob);
  if (z.crawl) {
    cx.fillRect(-4, -10, 26, 9); cx.beginPath(); cx.arc(-6, -8, 6, 0, Math.PI * 2); cx.fill();
    cx.lineWidth = 3; cx.beginPath(); cx.moveTo(-6, -4); cx.lineTo(-18, 0 + sway * 2); cx.stroke();
  } else {
    cx.lineWidth = 6; cx.beginPath(); cx.moveTo(0, -28); cx.lineTo(-3 + sway * 3, 0); cx.moveTo(2, -28); cx.lineTo(5 - sway * 3, 0); cx.stroke();
    cx.save(); cx.translate(0, -28); cx.rotate(-0.25); cx.fillRect(-7, -28, 14, 28); cx.restore();
    cx.beginPath(); cx.arc(-9, -58, 6, 0, Math.PI * 2); cx.fill();
    cx.lineWidth = 3.5; cx.beginPath(); cx.moveTo(-8, -48); cx.lineTo(-26, -46 + sway * 2); cx.moveTo(-6, -44); cx.lineTo(-24, -40 - sway * 2); cx.stroke();
  }
  cx.restore();
}

// ---------- Battle HUD ----------
function setLcd(el, val, cls) { const t = String(Math.max(0, Math.floor(val))).padStart(2, '0'); if (el.textContent !== t) el.textContent = t; el.className = 'lcd ' + cls; }
function updateHud() {
  const a = alive(), n = B.squad.length;
  setLcd($('#hAlive'), a.length, a.length > n / 2 ? '' : a.length > n / 4 ? 'amber' : 'red');
  setLcd($('#hAmmo'), B.ammo, B.ammo < 20 && B.ammoStart > 0 ? 'cyan amber' : 'cyan');
  const left = B.total - B.killed;
  setLcd($('#hZeds'), left, '');
  setLcd($('#hSurge'), B.pool > 0 ? B.surge : 0, 'orange');
  $('#hYouHp').style.width = Math.max(0, a.reduce((t, s) => t + s.hp, 0) / (n * 100) * 100) + '%';
  $('#hZedHp').style.width = (left / B.total * 100) + '%';
  $('#hObjFill').style.width = (B.killed / B.total * 100) + '%';
  $('#hObjText').textContent = left > 0 ? 'clear the sector' : 'push through →';
}

let lastBT = 0;
function battleLoop(now) {
  if (!B) return;
  let dt = Math.min(0.05, (now - lastBT) / 1000); lastBT = now;
  const portrait = window.innerHeight > window.innerWidth;
  if (!portrait) {
    // fixed-ish step for stable simulation
    while (dt > 0) { const st = Math.min(dt, 1 / 30); battleStep(st); dt -= st; if (!B) return; }
  }
  if (!B) return;
  drawBattle(); updateHud();
  requestAnimationFrame(battleLoop);
}

// ---------- Main loop ----------
let lastT = performance.now(), renderAcc = 0;
function loop(now) {
  const dt = Math.min(1, (now - lastT) / 1000); lastT = now;
  tick(dt);
  renderAcc += dt;
  if (!B) {
    if (renderAcc > 0.5) { renderAcc = 0; renderTop(); if (tab === 'camp') { /* refresh buttons/affordability */ refreshCampSoft(); } }
    if (tab === 'camp') updateCampBars();
  }
  requestAnimationFrame(loop);
}
// Re-render camp only if something visible changed, so taps aren't swallowed mid-rebuild.
let campSig = '';
function refreshCampSoft() {
  const sig = BUILDINGS.map(d => { const st = S.b[d.id]; const n = buyCount(d.cost, d.growth, st.owned); return [st.owned, st.mgr, workers(d.id), st.running, canAfford(unitCost(d.cost, d.growth, st.owned, n)), n, pop() >= d.unlock].join(); }).join('|') + S.tents + S.mult + canAfford(unitCost(TENT.cost, TENT.growth, S.tents, 1)) + pop();
  if (sig !== campSig) { campSig = sig; renderCamp(); }
}

// ---------- Lifecycle ----------
document.addEventListener('visibilitychange', () => {
  if (document.hidden) save();
  else {
    const res = offlineProgress((Date.now() - S.t) / 1000);
    lastT = performance.now();
    if (res) showAway(res);
    if (AC && AC.state === 'suspended') AC.resume();
  }
});
window.addEventListener('pagehide', save);
setInterval(save, 10000);

function showAway(res) {
  const h = Math.floor(res.seconds / 3600), m = Math.floor(res.seconds % 3600 / 60);
  const lines = Object.entries(res.gained).filter(([, v]) => Math.abs(v) >= 1).map(([k, v]) => `<li>${v > 0 ? '+' : ''}${fmt(v)} ${RES.find(r => r.id === k).name.toLowerCase()}</li>`).join('');
  modal(`<h3>While you were away</h3><p style="color:var(--muted)">${h ? h + 'h ' : ''}${m}m · managers kept working</p><ul>${lines || '<li>Nothing was produced. Hire managers to keep buildings running.</li>'}</ul><div class="actions"><button class="btn primary" data-close>Collect</button></div>`);
}

// ---------- Boot ----------
S = load() || newState();
lastUnlockPop = pop();
const away = offlineProgress((Date.now() - S.t) / 1000);
render();
if (away) showAway(away);
else if (S.hired === 0 && S.b.water.owned === 1 && S.res.wood <= 6) {
  modal(`<h3>Holdout</h3><p>You're alone in a fenced backyard. Tap the rain barrel and chopping block to gather, buy more, and hire survivors at the fence (People tab) to work them.</p><p>Hire a manager and a building runs itself, even while you're away. When you have rifles and ammo, head to the Map and clear the sectors around you.</p><div class="actions"><button class="btn primary" data-close>Start</button></div>`);
}
requestAnimationFrame(loop);
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => { });
}
