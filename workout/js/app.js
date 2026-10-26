import { MUSCLES, STATIONS } from './data.js';
import * as L from './logic.js';
import { load, save, exerciseMap, exportJSON, importJSON, uid, DEFAULT_SETTINGS } from './store.js';
import { lineChart } from './charts.js';
import { HOWTO, videoURL } from './howto.js';
import { ANIM, mountAnimation } from './anim.js';
import { ic } from './icons.js';
import { coachLine } from './coach.js';

let S = load();
let EX = exerciseMap(S);
const ui = { tab: 'workout', editRoutine: null, progEx: null, metric: 'e1rm', histLimit: 20, claudeLoading: false, claudeError: '', progTab: 'coach', moreRoutines: false, warmOpen: null, bigTimer: false };
const CHEST_TARGET = 18;

const HOME_SPLIT = ['home-push-a', 'home-pull-a', 'home-push-b', 'home-pull-b'];
const FALLBACK_MODELS = new Set(['claude-opus-5-5', 'claude-sonnet-5-5']);
const MODELS = [['claude-opus-5-5', 'Claude Opus 5.5 (best)'], ['claude-sonnet-5-5', 'Claude Sonnet 5.5 (cheaper)'], ['claude-haiku-5-5', 'Claude Haiku 5.5 (cheapest)']];

const $ = (sel) => document.querySelector(sel);
const h = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const today = () => L.todayISO();
const addDays = (iso, n) => L.todayISO(new Date(Date.parse(iso) + n * L.DAY + 12 * 3600000));
const fmtTime = (sec) => `${Math.floor(sec / 60)}:${String(Math.max(0, Math.round(sec % 60))).padStart(2, '0')}`;
const card = (html, cls = '') => `<div class="card ${cls}">${html}</div>`;
const groupBy = (arr, fn) => arr.reduce((m, x) => m.set(fn(x), [...(m.get(fn(x)) || []), x]), new Map());
const splitTitle = (name) => { const k = (name || '').indexOf(': '); return k > 0 ? [name.slice(0, k), name.slice(k + 2)] : [name || 'Workout', '']; };
const inlineIc = (name) => `<span style="display:inline-flex;vertical-align:-3px">${ic(name, 16)}</span>`;
function applyTheme() {
  const t = S.settings.theme;
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
  else delete document.documentElement.dataset.theme;
}
const deloadActive = () => !!S.settings.deloadUntil && today() <= S.settings.deloadUntil;

function persist() {
  if (!save(S)) toast('Could not save. Storage may be full or blocked (Private Browsing?). Export a backup in Settings.', 'warn');
}
let saveTimer;
const persistSoon = () => { clearTimeout(saveTimer); saveTimer = setTimeout(persist, 400); };

function toast(msg, cls = '') {
  const t = $('#toast');
  t.textContent = msg;
  t.className = `show ${cls}`;
  clearTimeout(t._t);
  t._t = setTimeout(() => { t.className = ''; }, 3500);
}

// ---------- render ----------

function render() {
  applyTheme();
  const views = { workout: viewWorkout, routines: viewRoutines, progress: viewProgress, body: viewBody, settings: viewSettings };
  $('#main').innerHTML = views[ui.tab]();
  document.querySelectorAll('#nav button').forEach((b) => { const on = b.dataset.tab === ui.tab; b.classList.toggle('on', on); b.setAttribute('aria-current', on ? 'page' : 'false'); });
  renderTimer();
  updateWakeLock();
}

function targetFor(exId) {
  for (const r of S.routines) {
    const it = r.items.find((i) => i.exId === exId);
    if (it) return it;
  }
  return {};
}

function exOptions(selected) {
  return Object.values(EX).sort((a, b) => a.name.localeCompare(b.name))
    .map((e) => `<option value="${h(e.id)}" ${e.id === selected ? 'selected' : ''}>${h(e.name)}</option>`).join('');
}

// ---------- workout tab ----------

function lastDone(routineId) {
  const s = S.sessions.filter((x) => x.routineId === routineId).sort((a, b) => b.date.localeCompare(a.date))[0];
  if (!s) return '';
  const d = L.daysBetween(s.date, today());
  return d === 0 ? 'today' : d === 1 ? 'yesterday' : d < 7 ? `${d} days ago` : d < 60 ? `${Math.round(d / 7)} wk ago` : 'a while ago';
}

const routineMin = (r) => L.routineMinutes(r.items.filter((it) => EX[it.exId]), EX);

function routineRow(r, right) {
  return `<button class="routine" data-act="start" data-id="${h(r.id)}"><span>${h(r.name.replace(': ', ' · '))}</span><small>${routineMin(r)} min${(right ?? lastDone(r.id)) ? ` · ${h(right ?? lastDone(r.id))}` : ''}${ic('chevron', 16)}</small></button>`;
}

function nextHomeDay() {
  const last = S.sessions.filter((s) => HOME_SPLIT.includes(s.routineId)).sort((a, b) => (a.date + (a.endedAt || 0)).localeCompare(b.date + (b.endedAt || 0))).pop();
  const id = last ? HOME_SPLIT[(HOME_SPLIT.indexOf(last.routineId) + 1) % 4] : HOME_SPLIT[0];
  return S.routines.find((r) => r.id === id);
}

function viewWorkout() {
  if (S.active) return viewActive();
  const t = today(), now = new Date();
  let html = `<header class="top"><span class="wordmark">REP</span><span class="muted small">${h(now.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }))}</span></header>`;
  const st = L.deloadStatus(S.sessions, S.settings, t);
  if (deloadActive()) {
    html += card(`<b>Deload week</b> until ${h(S.settings.deloadUntil)}. Suggestions use about 90% of your usual weight and one fewer set.<div class="row"><button class="btn small ghost" data-act="end-deload">End deload</button></div>`, 'info');
  } else if (st.due && !(S.settings.deloadSnooze && S.settings.deloadSnooze >= t)) {
    html += card(`<b>Time for a lighter week.</b> You've trained ${st.weeks} weeks straight. One deload week (lighter loads, fewer sets) lets joints and the shoulder catch up.<div class="row"><button class="btn small" data-act="start-deload">Start deload week</button><button class="btn small ghost" data-act="snooze-deload">Next week</button></div>`, 'warn');
  }
  if (S.upgradeNote) html += card(`${h(S.upgradeNote)}<div class="row"><button class="btn small ghost" data-act="dismiss-upgrade">Got it</button></div>`, 'info');
  const gain = L.gainCheck(S.bodyweight, t);
  if (gain && gain.status !== 'ok') html += card(gainMessage(gain), 'warn');
  if (!S.sessions.length) html += card('New here? Import your Caliber history in <a href="#" data-act="tab" data-tab="settings">Settings</a> so suggestions start from your real numbers.', 'info');

  const next = nextHomeDay();
  if (next) {
    const [a, b] = splitTitle(next.name);
    const n = next.items.filter((i) => EX[i.exId]?.equip !== 'band').length;
    html += `<section class="hero"><span class="label">Up next</span><span class="title">${h(a)}</span><span class="meta">${b ? `${h(b)} · ` : ''}${n} exercises · about ${routineMin(next)} min</span><button class="btn big" data-act="start" data-id="${h(next.id)}">Start workout</button></section>`;
  }

  const mon = addDays(t, -((now.getDay() + 6) % 7));
  const trained = new Set(S.sessions.map((x) => x.date));
  html += `<div class="week" aria-label="This week">${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((l, k) => { const d = addDays(mon, k); return `<div class="${trained.has(d) ? 'on' : ''} ${d === t ? 'today' : ''}">${l}<i></i></div>`; }).join('')}</div>`;

  const chest = Math.round(L.setsPerMuscle(S.sessions, EX, mon, t).chest || 0);
  const lastBw = [...S.bodyweight].sort((x, y) => x.date.localeCompare(y.date)).pop();
  const target = lastBw ? L.proteinTarget(lastBw.w, S.settings.proteinPerKg) : null;
  const hit = !!S.protein[t];
  html += `<div class="stats2">
    <button data-act="tab" data-tab="progress"><span class="label">Chest sets</span><b>${chest}<span> / ${CHEST_TARGET}</span></b><div class="meter"><div style="width:${Math.min(100, (chest / CHEST_TARGET) * 100)}%"></div></div></button>
    ${target
      ? `<button data-act="protein-toggle" aria-pressed="${hit}"><span class="label">Protein${hit ? ' · done' : ''}</span><b>${target}<span> g${hit ? ' ✓' : ''}</span></b><div class="meter"><div style="width:${hit ? 100 : 0}%"></div></div></button>`
      : '<button data-act="tab" data-tab="body"><span class="label">Protein</span><b><span>Log weight</span></b><div class="meter"><div style="width:0%"></div></div></button>'}
  </div>`;

  const split = HOME_SPLIT.map((id) => S.routines.find((r) => r.id === id)).filter(Boolean);
  if (split.length) html += `<h3>Your split</h3><div class="list">${split.map((r) => routineRow(r, r.id === next?.id ? 'next' : null)).join('')}</div>`;
  html += `<div class="row"><button class="btn small ghost" data-act="more-routines" aria-expanded="${ui.moreRoutines}">${ui.moreRoutines ? 'Hide other routines' : 'More routines'}</button></div>`;
  if (ui.moreRoutines) {
    for (const [g, rs] of groupBy(S.routines.filter((r) => !HOME_SPLIT.includes(r.id)), (r) => r.group || 'My routines')) {
      html += `<h3>${h(g)}</h3><div class="list">${rs.map((r) => routineRow(r)).join('')}</div>`;
    }
    html += '<button class="btn ghost wide" data-act="start-empty">Start an empty workout</button>';
  }
  return html;
}

// Build-up: the first 2 sessions of a routine since the program started use `ramp` sets.
function rampSets(it, routineId) {
  if (!S.settings.buildUp || !it.ramp || !routineId) return null;
  const since = S.settings.programStart || '';
  const done = S.sessions.filter((x) => x.routineId === routineId && x.date >= since).length;
  return done < 2 ? Math.min(it.ramp, it.sets ?? 3) : null;
}

function makeEntry(it, deload, routineId) {
  const ex = EX[it.exId];
  const repMin = it.repMin ?? ex.repMin, repMax = it.repMax ?? ex.repMax;
  const hist = L.exerciseHistory(S.sessions, it.exId);
  const ramp = rampSets(it, routineId);
  const sug = L.suggest(ex, { sets: ramp ?? it.sets ?? 3, repMin, repMax }, hist, S.settings, { deload, today: today() });
  const last = hist[hist.length - 1];
  const lt = L.loadType(ex.equip);
  const sets = [];
  for (let k = 0; k < sug.sets; k++) {
    const ls = last?.sets[k] || last?.sets[last.sets.length - 1];
    const w = lt === 'band' ? 0 : sug.weight ?? (ls ? ls.w : null);
    const r = sug.kind === 'hold' && ls && ls.w === w ? Math.max(ls.r, repMin) : sug.reps;
    sets.push({ w, r, pw: w, pr: r, done: false });
  }
  return { exId: it.exId, station: it.station || '', itemNote: it.note || '', repMin, repMax, rest: it.rest ?? ex.rest,
    ss: it.ss || null, ramp, fullSets: it.sets, suggestion: { kind: sug.kind, message: sug.message, head: sugHead(sug, lt) }, sets };
}

// One-line headline for a suggestion; the full reason shows on tap.
function sugHead(s, lt) {
  const W = lt === 'bodyweight' ? (s.weight ? `+${s.weight} lb` : 'bodyweight') : `${s.weight} lb`;
  switch (s.kind) {
    case 'up': return lt === 'bodyweight' ? `Add ${s.weight} lb on your back` : `${W} today`;
    case 'tempo': return 'Add a set or slow the tempo';
    case 'hold': return 'Beat last time';
    case 'pain': return `${W} · shoulder flagged`;
    case 'pain2': return `${W} · check with physio`;
    case 'stall': return 'Stalled · try a lighter week';
    case 'deload': return `Deload · ${W}`;
    case 'return': return lt === 'bodyweight' || s.weight == null ? 'Ease back in' : `Restart at ${W}`;
    case 'new': return 'First time · find your weight';
    default: return '';
  }
}
// What the weight box means, per equipment type.
function weightLabel(ex) {
  if (ex.equip === 'dumbbell') return ['LB EACH', 'Weight of one dumbbell, not both.'];
  if (ex.equip === 'bodyweight') return ['+LB EXTRA', 'Your bodyweight counts automatically. Enter only added weight (plate or backpack); 0 = just you.'];
  if (ex.equip === 'landmine') return ['LB PLATES', 'Plates on the bar end only; the bar itself isn\'t counted.'];
  if (L.loadType(ex.equip) === 'load' && ['barbell', 'ezbar', 'trapbar'].includes(ex.equip)) return ['LB TOTAL', `Total weight including the bar (${S.settings.barWeight} lb).`];
  return ['LB', ''];
}

const SUG_IC = { up: 'up', tempo: 'up', pain: 'down', pain2: 'alert', stall: 'pause', deload: 'down', return: 'history', hold: 'progress', new: 'plus' };

function startWorkout(routineId) {
  if (S.active) { ui.tab = 'workout'; render(); return; }
  const r = S.routines.find((x) => x.id === routineId);
  const deload = deloadActive();
  S.active = { id: uid(), date: today(), routineId: r?.id || null, title: r?.name || 'Workout', startedAt: Date.now(), deload, note: '', planned: null,
    entries: (r?.items || []).filter((it) => EX[it.exId]).map((it) => makeEntry(it, deload, r.id)) };
  ui.warmOpen = null;
  S.active.planned = S.active.entries.filter((e) => EX[e.exId]?.equip !== 'band').reduce((x, e) => x + e.sets.filter((y) => !y.warmup).length, 0);
  persist();
  ui.tab = 'workout';
  render();
  window.scrollTo(0, 0);
}

// Minutes left from the remaining sets, rests and any running rest timer.
function minutesLeft() {
  const a = S.active;
  if (!a) return 0;
  const items = a.entries.filter((e) => EX[e.exId])
    .map((e) => ({ exId: e.exId, sets: e.sets.filter((x) => !x.done && !x.warmup).length, rest: e.rest, ss: e.ss }))
    .filter((it) => it.sets > 0);
  let sec = items.length ? L.routineMinutes(items, EX) * 60 : 0;
  if (S.timer && !S.timer.fired) sec += Math.max(0, (S.timer.end - Date.now()) / 1000);
  return { min: Math.round(sec / 60), done: !items.length };
}
const leftText = () => { const t = minutesLeft(); return t.done ? 'all sets done' : `~${t.min} min left`; };

const elapsed = () => (S.active ? fmtTime((Date.now() - S.active.startedAt) / 1000) : '');

function warmIsOpen(bands) {
  if (ui.warmOpen != null) return ui.warmOpen;
  return !bands.every((x) => x.e.sets.every((s) => s.done));
}

function viewActive() {
  const a = S.active;
  const [t1, t2] = splitTitle(a.title);
  let html = `<div class="wk-head"><div><div class="label">${h(t1)}${a.deload ? ' · deload' : ''} · <span id="elapsed">${elapsed()}</span> · <span id="left">${leftText()}</span></div><div class="title">${h(t2 || t1)}</div></div><button class="btn" data-act="finish">Finish</button></div>`;
  const bands = a.entries.map((e, i) => ({ e, i })).filter((x) => EX[x.e.exId]?.equip === 'band');
  if (bands.length) {
    const doneN = bands.filter((x) => x.e.sets.every((s) => s.done)).length;
    const open = warmIsOpen(bands);
    html += `<div class="warm"><button class="warm-head" data-act="warm-toggle" aria-expanded="${open}">Shoulder warm-up<span>${doneN}/${bands.length}${doneN === bands.length ? ic('check', 18) : ic(open ? 'chevronDown' : 'chevron', 18)}</span></button>`;
    if (open) {
      html += bands.map(({ e, i }) => {
        const ex = EX[e.exId], done = e.sets.every((s) => s.done);
        return `<div class="warm-item"><div class="grow">${h(ex.name)}<small>${e.sets.length} × ${e.repMin}–${e.repMax}</small></div>
          <button class="btn ghost small" data-act="howto" data-id="${h(ex.id)}">How to</button>
          <button class="tick ${done ? 'on' : ''}" data-act="band-done" data-i="${i}" aria-pressed="${done}" aria-label="${h(ex.name)} done">${ic('check')}</button></div>`;
      }).join('');
    }
    html += '</div>';
  }
  if (S.settings.rehabMode) html += `<p class="muted small">Tap ${inlineIc('alert')} on a set that bothered your shoulder.</p>`;
  let prev = null;
  a.entries.forEach((e, i) => {
    const ex = EX[e.exId];
    if (!ex || ex.equip === 'band') return;
    if (e.station && e.station !== prev) html += `<div class="station label">${prev ? 'Setup change' : 'Setup'} · ${h(e.station)}</div>`;
    prev = e.station || prev;
    const before = a.entries[i - 1];
    if (e.ss && before?.ss !== e.ss) {
      const names = a.entries.slice(i).filter((x, k, arr) => arr.slice(0, k + 1).every((y) => y.ss === e.ss)).map((x) => EX[x.exId]?.name);
      html += `<div class="ss-label"><span class="label">Superset</span><span>${h(names.join(' + '))}: alternate sets, rest after both</span></div>`;
    }
    html += entryCard(e, i, ex);
  });
  html += '<div class="row"><button class="btn ghost" data-act="add-ex">' + ic('plus', 18) + ' Add exercise</button></div>';
  html += `<label class="field">Workout note<textarea data-bind="active-note" rows="2" placeholder="How did it feel?">${h(a.note || '')}</textarea></label>`;
  html += '<div class="row"><button class="btn danger" data-act="discard">Discard workout</button></div>';
  return html;
}

function entryCard(e, i, ex) {
  const lt = L.loadType(ex.equip);
  const work = e.sets.filter((s) => !s.warmup);
  const complete = work.length && work.every((s) => s.done);
  const note = S.exNotes[e.exId];
  const sg = e.suggestion || {};
  const head = sg.head ?? (sg.message ? 'Tip' : '');
  const painCol = S.settings.rehabMode;
  const party = complete && e.justDone && Date.now() - e.justDone < 3000;
  let html = `<section class="ex ${complete ? 'complete' : ''} ${party ? 'celebrate' : ''}">${party ? `<div class="confetti" aria-hidden="true">${Array.from({ length: 14 }, (_, k) => `<i style="--a:${k * 26}deg;--d:${52 + (k % 4) * 14}px"></i>`).join('')}</div>` : ''}
    <div class="ex-head"><div class="grow"><h3>${h(ex.name)}${ex.shoulder && S.settings.rehabMode ? ' <span class="tag">shoulder</span>' : ''}${complete ? ` <span class="done-tag">${ic('check', 13)}Done</span>` : ''}</h3>
      <div class="sub">${work.length} × ${e.repMin}–${e.repMax} · rest ${fmtTime(e.rest)}</div></div>
      <div class="ex-tools"><button class="btn ghost small" data-act="howto" data-id="${h(ex.id)}">How to</button>
      <button class="icon-btn" data-act="ex-menu" data-i="${i}" aria-label="More options for ${h(ex.name)}">${ic('more')}</button></div></div>`;
  if (e.itemNote) html += `<div class="item-note">${h(e.itemNote)}</div>`;
  if (note) html += `<div class="exnote">${ic('note', 16)}<span>${h(note)}</span></div>`;
  if (head || e.ramp) {
    html += '<div class="chips">';
    if (head) html += `<button class="sug ${h(sg.kind)}" data-act="sug-toggle" data-i="${i}" aria-expanded="${!!e.showWhy}">${ic(SUG_IC[sg.kind] || 'progress', 14)}${h(head)}</button>`;
    if (e.ramp) html += `<button class="sug" data-act="sug-toggle" data-i="${i}" aria-expanded="${!!e.showWhy}">Build-up · ${e.ramp} of ${e.fullSets} sets</button>`;
    html += '</div>';
    if (e.showWhy && (sg.message || e.ramp)) html += `<p class="why">${h(sg.message || '')}${e.ramp ? ` Build-up: ${e.ramp} of ${e.fullSets} sets for your first 2 sessions of this day so the shoulder can adapt to the extra volume, then all ${e.fullSets}. Turn it off in Settings › Training.` : ''}</p>`;
  }
  const [wl, hint] = weightLabel(ex);
  html += `<div class="sets ${painCol ? '' : 'no-pain'}"><div class="srow hd"><span>SET</span><span>${lt === 'band' ? 'BAND' : wl}</span><span>REPS</span><span></span>${painCol ? '<span></span>' : ''}</div>`;
  if (hint && lt !== 'band') html += `<div class="whint">${h(hint)}</div>`;
  html += e.sets.map((s, j) => setRow(e, i, s, j, lt, painCol)).join('') + '</div></section>';
  return html;
}

function setRow(e, i, s, j, lt, painCol) {
  const n = s.warmup ? 'W' : e.sets.slice(0, j + 1).filter((x) => !x.warmup).length;
  const cls = `num ${s.done ? 'done' : ''} ${s.warmup ? 'warm-set' : ''}`;
  const w = lt === 'band'
    ? '<span class="num band">band</span>'
    : `<input class="${cls}" type="number" inputmode="decimal" step="any" data-set="${i}.${j}.w" value="${s.w ?? ''}" placeholder="${lt === 'bodyweight' ? '0' : 'lb'}" aria-label="Set ${n} weight">`;
  const r = `<input class="${cls}" type="number" inputmode="numeric" data-set="${i}.${j}.r" value="${s.r ?? ''}" placeholder="reps" aria-label="Set ${n} reps">`;
  const done = `<button class="done-btn ${s.done ? 'on' : ''}" data-act="done" data-i="${i}" data-j="${j}" aria-pressed="${!!s.done}" aria-label="Set ${n} done">${ic('check')}</button>`;
  const pain = !painCol ? '' : s.warmup
    ? '<span></span>'
    : `<button class="pain-btn ${s.pain ? 'on' : ''}" data-act="pain" data-i="${i}" data-j="${j}" aria-pressed="${!!s.pain}" aria-label="Shoulder hurt on set ${n}">${ic('alert')}</button>`;
  let html = `<div class="srow ${s.done ? 'done' : ''} ${s.warmup ? 'warm' : ''}"><span class="sn">${s.done ? ic('check', 14) : n}</span>${w}${r}${done}${pain}</div>`;
  if (s.done && !s.warmup && lt !== 'band' && S.settings.askRir) {
    html += s.rir == null
      ? `<div class="rir"><span class="small">Reps left?</span>${[0, 1, 2, 3, 4].map((v) => `<button class="chip" data-act="rir" data-i="${i}" data-j="${j}" data-v="${v}">${v === 4 ? '4+' : v}</button>`).join('')}</div>`
      : `<button class="rir-tag" data-act="rir-clear" data-i="${i}" data-j="${j}">${s.rir === 4 ? '4+' : s.rir} left in tank${s.autoRir ? ' (missed your target, so 0)' : ''} · change</button>`;
  }
  return html;
}

function finishWorkout() {
  const a = S.active;
  const undone = a.entries.some((e) => e.sets.some((s) => !s.done && !s.warmup));
  if (undone && !confirm('Some sets are not ticked. Finish anyway? Unticked sets are not saved.')) return;
  // Length = first to last ticked set, so forgetting to hit Finish doesn't inflate it.
  let startedAt = a.startedAt, endedAt = Date.now();
  const stamps = a.entries.flatMap((e) => e.sets.filter((x) => x.done && x.doneAt).map((x) => x.doneAt));
  if (stamps.length) {
    const first = Math.min(...stamps), last = Math.max(...stamps);
    if (first - startedAt > 10 * 60000) startedAt = first - 60000;
    endedAt = Math.min(endedAt, last + 60000);
  }
  const session = {
    id: a.id, date: a.date, title: a.title, routineId: a.routineId, startedAt, endedAt, planned: a.planned ?? null,
    deload: a.deload, note: a.note || '',
    entries: a.entries.map((e) => ({ exId: e.exId, sets: e.sets.filter((s) => s.done).map((s) => ({
      w: +s.w || 0, r: +s.r || 0, rir: s.rir ?? null, pain: !!s.pain, warmup: !!s.warmup, done: true })) })).filter((e) => e.sets.length),
  };
  S.sessions.push(session);
  S.active = null;
  S.timer = null;
  persist();
  render();
  showSummary(session.id);
}

// ---------- rest timer ----------

let actx;
function unlockAudio() {
  try {
    if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
  } catch { /* audio unavailable */ }
}
function beep() {
  if (!actx || !S.settings.sound) return;
  [0, 0.3, 0.6].forEach((d) => {
    const o = actx.createOscillator(), g = actx.createGain();
    o.frequency.value = 880;
    o.connect(g); g.connect(actx.destination);
    const t = actx.currentTime + d;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    o.start(t); o.stop(t + 0.22);
  });
}

function startTimer(sec, label, ref) {
  S.timer = { start: Date.now(), end: Date.now() + sec * 1000, total: sec, label, ref, fired: false };
  persist();
  renderTimer();
}

function retime(i, j) {
  const t = S.timer, e = S.active?.entries[i], s = e?.sets[j];
  if (!t || !s || t.ref !== `${i}.${j}` || t.fired) return;
  const sec = L.restSeconds(EX[e.exId], e, s);
  t.end = t.start + sec * 1000;
  t.total = sec;
}

function renderTimer() {
  const el = $('#timer');
  const t = S.timer;
  document.body.classList.toggle('has-timer', !!t);
  if (!t) { el.hidden = true; el.className = ''; el.innerHTML = ''; ui.bigTimer = false; return; }
  el.hidden = false;
  el.className = `${ui.bigTimer ? 'big' : ''} ${t.fired ? 'fired' : ''}`;
  el.innerHTML = `<button class="tl" data-act="timer-big" aria-label="${ui.bigTimer ? 'Shrink' : 'Enlarge'} rest timer"><small>${t.fired ? 'Rest done · go' : `Rest · ${h(t.label)}`}</small><b id="tleft"></b></button>
    <div class="tbtns"><button class="tbtn" data-act="t-minus">−15</button><button class="tbtn" data-act="t-plus">+15</button><button class="tbtn solid" data-act="t-skip">${t.fired ? 'OK' : 'Skip'}</button></div><div class="tbar" id="tbar"></div>`;
  tick();
}

function tick() {
  const el = $('#elapsed');
  if (el) el.textContent = elapsed();
  const lf = $('#left');
  if (lf) lf.textContent = leftText();
  const t = S.timer;
  if (!t) return;
  const left = Math.max(0, (t.end - Date.now()) / 1000);
  const tl = $('#tleft'), tb = $('#tbar');
  if (tl) tl.textContent = fmtTime(Math.ceil(left));
  if (tb) tb.style.width = `${Math.min(100, (left / t.total) * 100)}%`;
  if (left <= 0 && !t.fired) {
    t.fired = true;
    persist();
    beep();
    navigator.vibrate?.([250, 120, 250]);
    document.body.classList.add('flash');
    setTimeout(() => document.body.classList.remove('flash'), 1600);
    renderTimer();
    setTimeout(() => { if (S.timer === t) { S.timer = null; persist(); renderTimer(); } }, 8000);
  }
}
setInterval(tick, 250);

// ---------- wake lock ----------

let wakeLock = null, wakePending = false;
async function updateWakeLock() {
  const want = !!S.active && document.visibilityState === 'visible';
  if (want && !wakeLock && !wakePending && 'wakeLock' in navigator) {
    wakePending = true;
    try {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    } catch { /* not allowed right now */ }
    wakePending = false;
  } else if (!want && wakeLock) {
    wakeLock.release();
    wakeLock = null;
  }
}
document.addEventListener('visibilitychange', () => { updateWakeLock(); tick(); });

// ---------- modals ----------

function openModal(html) {
  stopAnim();
  const m = $('#modal');
  m.innerHTML = `<div class="sheet" role="dialog" aria-modal="true"><div class="sheet-top"><span class="grab" aria-hidden="true"></span><button class="sheet-x" data-act="close-modal" aria-label="Close">${ic('x', 22)}</button></div>${html}<button class="btn ghost wide" data-act="close-modal">Close</button></div>`;
  m.hidden = false;
}
let stopAnim = () => {};
function closeModal() { stopAnim(); stopAnim = () => {}; const m = $('#modal'); m.hidden = true; m.innerHTML = ''; }

function showSummary(id) {
  const s = S.sessions.find((x) => x.id === id);
  if (!s) return;
  const prior = S.sessions.filter((x) => x.id !== id && x.date <= s.date);
  const sum = L.sessionSummary(s, prior, EX);
  const delta = sum.lastVolume ? Math.round(((sum.volume - sum.lastVolume) / sum.lastVolume) * 100) : null;
  let html = `<h2>${h(s.title || 'Workout')}</h2><p class="muted">${h(s.date)}${s.deload ? ' · deload' : ''}</p>
    <div class="stats">
      <button class="stat-edit" data-act="edit-minutes" data-id="${h(s.id)}" aria-label="Edit workout length"><b>${sum.minutes ?? '–'}</b><small>minutes · edit</small></button>
      <div><b>${sum.sets}</b><small>working sets</small></div>
      <div><b>${Math.round(sum.volume).toLocaleString()}</b><small>lb volume${delta != null ? ` (${delta >= 0 ? '+' : ''}${delta}% vs last)` : ''}</small></div>
    </div>`;
  const lifts = s.entries.filter((e) => EX[e.exId]?.equip !== 'band').flatMap((e) => e.sets.filter((x) => !x.warmup));
  const rirs = lifts.map((x) => x.rir).filter((x) => x != null);
  const coach = coachLine({
    sets: lifts.length, planned: s.planned, minutes: sum.minutes, prs: sum.prs.length, pains: sum.pains.length,
    rirAvg: rirs.length >= 3 ? rirs.reduce((x, y) => x + y, 0) / rirs.length : null, rirZeros: rirs.filter((x) => x === 0).length,
    volumeDelta: delta, seed: s.id,
  });
  html = html.replace('</p>', `</p><blockquote class="coach coach-${coach.kind}"><span class="label">Coach</span>${h(coach.text)}</blockquote>`);
  if (sum.prs.length) html += card(`<h4>${ic('trophy', 18)} New personal records</h4><ul>${sum.prs.map((p) => `<li>${h(p)}</li>`).join('')}</ul>`, 'good');
  if (sum.pains.length) html += card(`<h4>${ic('alert', 18)} Shoulder flagged</h4> ${h(sum.pains.join(', '))}. Next time these drop ~${S.settings.painDropPct}% and progression pauses.`, 'warn');
  if (s.note) html += `<p><i>${h(s.note)}</i></p>`;
  html += s.entries.map((e) => {
    const ex = EX[e.exId];
    const sets = e.sets.filter((x) => !x.warmup).map((x) => `${ex && L.loadType(ex.equip) === 'band' ? '' : `${x.w}×`}${x.r}${x.rir != null ? ` @${x.rir}` : ''}${x.pain ? ' (shoulder)' : ''}`).join(', ');
    return `<div class="hist-row"><b>${h(ex?.name || e.exId)}</b><span>${h(sets)}</span></div>`;
  }).join('');
  html += `<div class="row"><button class="btn danger ghost small" data-act="delete-session" data-id="${h(s.id)}">Delete this workout</button></div>`;
  openModal(html);
}

function platesHTML(target, landmine = false) {
  if (!target) return '';
  if (landmine) {
    // One loaded sleeve, and the weight counts plates only.
    const p = L.platesPerSide(target * 2, 0, S.settings.plates);
    return `<p class="plates-out"><b>On the bar end:</b> ${p.perSide.join(' + ') || 'no plates'}</p>${p.ok ? '' : `<p class="warn-t">Can't load exactly. ${p.remainder / 2} lb short with your plates.</p>`}`;
  }
  const bar = S.settings.barWeight;
  const p = L.platesPerSide(target, bar, S.settings.plates);
  if (target < bar) return `<p>Less than the ${bar} lb bar.</p>`;
  return `<p class="plates-out"><b>Each side:</b> ${p.perSide.length ? p.perSide.join(' + ') : 'empty bar'}</p>${p.ok ? '' : `<p class="warn-t">Can't load exactly. ${p.remainder} lb short with your plates.</p>`}`;
}

// ---------- routines tab ----------

function viewRoutines() {
  if (ui.editRoutine) return viewRoutineEditor();
  let html = `<div class="row"><h2 class="grow">Plans</h2><button class="btn small" data-act="new-routine">${ic('plus', 16)} New</button></div>`;
  for (const [g, rs] of groupBy(S.routines, (r) => r.group || 'My routines')) {
    html += `<h3>${h(g)}</h3>` + rs.map((r) => `<div class="card r-card"><div class="grow"><b>${h(r.name)}</b><small class="muted">${h(r.items.filter((i) => EX[i.exId]?.equip !== 'band').map((i) => EX[i.exId]?.name || i.exId).join(' · '))}</small><small class="r-meta">${routineMin(r)} min · ${r.items.reduce((a, it) => a + (it.sets ?? 3), 0)} sets</small></div>
      <div class="col"><button class="btn small primary" data-act="start" data-id="${h(r.id)}">Start</button><button class="btn small ghost" data-act="edit-routine" data-id="${h(r.id)}">Edit</button><button class="btn small ghost" data-act="dup-routine" data-id="${h(r.id)}">Copy</button></div></div>`).join('');
  }
  html += '<h2>Custom exercises</h2>';
  const custom = Object.values(S.customExercises);
  html += custom.length ? `<ul class="plain">${custom.map((e) => `<li>${h(e.name)} <small class="muted">${h(e.equip)} · ${h(e.primary.join(', '))}${e.shoulder ? ' · shoulder' : ''}</small></li>`).join('')}</ul>` : '<p class="muted">None yet.</p>';
  html += card(`<b>Add an exercise</b>
    <label class="field">Name<input id="cx-name" placeholder="e.g. Band-Assisted Pull-Up"></label>
    <div class="grid2">
      <label class="field">Equipment<select id="cx-equip">${['barbell', 'dumbbell', 'bodyweight', 'band', 'landmine', 'cable', 'machine'].map((e) => `<option>${e}</option>`).join('')}</select></label>
      <label class="field">Type<select id="cx-kind"><option value="compound">compound</option><option value="isolation">isolation</option></select></label>
      <label class="field">Main muscle<select id="cx-muscle">${MUSCLES.map((m) => `<option>${m}</option>`).join('')}</select></label>
      <label class="field check"><input type="checkbox" id="cx-shoulder"> Loads the shoulder</label>
    </div><button class="btn" data-act="add-custom">Add exercise</button>`);
  return html;
}

function viewRoutineEditor() {
  const r = S.routines.find((x) => x.id === ui.editRoutine);
  if (!r) { ui.editRoutine = null; return viewRoutines(); }
  let html = `<div class="row"><h2 class="grow">Edit routine</h2><button class="btn primary" data-act="done-routine">Done</button></div>
    <p class="r-est"><b>About ${routineMin(r)} min</b> <span class="muted small">· ${r.items.reduce((x, it) => x + (it.sets ?? 3), 0)} sets</span></p>
    <label class="field">Name<input data-r="name" value="${h(r.name)}"></label>
    <label class="field">Group<input data-r="group" value="${h(r.group || '')}" placeholder="My routines"></label>
    <datalist id="stations">${STATIONS.map((s) => `<option value="${h(s)}">`).join('')}</datalist>
    <p class="muted small">Exercises in a row with the same setup need no rack change. Give neighbouring exercises the same superset letter to alternate them. Leave reps or rest blank to use each exercise's default.</p>`;
  html += r.items.map((it, k) => {
    const ex = EX[it.exId] || {};
    return `<div class="card ri">
      <select data-ri="${k}.exId">${exOptions(it.exId)}</select>
      <div class="grid4">
        <label>Sets<input type="number" inputmode="numeric" data-ri="${k}.sets" value="${it.sets ?? 3}"></label>
        <label>Min reps<input type="number" inputmode="numeric" data-ri="${k}.repMin" value="${it.repMin ?? ''}" placeholder="${ex.repMin ?? ''}"></label>
        <label>Max reps<input type="number" inputmode="numeric" data-ri="${k}.repMax" value="${it.repMax ?? ''}" placeholder="${ex.repMax ?? ''}"></label>
        <label>Rest (s)<input type="number" inputmode="numeric" data-ri="${k}.rest" value="${it.rest ?? ''}" placeholder="${ex.rest ?? ''}"></label>
      </div>
      <div class="grid2"><label class="field">Setup<input list="stations" data-ri="${k}.station" value="${h(it.station || '')}"></label>
      <label class="field">Superset group<input data-ri="${k}.ss" value="${h(it.ss || '')}" placeholder="e.g. A" maxlength="2"></label></div>
      <label class="field">Note<input data-ri="${k}.note" value="${h(it.note || '')}"></label>
      <div class="row"><button class="btn small ghost" data-act="howto" data-id="${h(it.exId)}">How to</button><button class="btn small ghost" data-act="ri-up" data-k="${k}">↑</button><button class="btn small ghost" data-act="ri-down" data-k="${k}">↓</button><button class="btn small ghost danger" data-act="ri-del" data-k="${k}">Remove</button></div>
    </div>`;
  }).join('');
  html += `<div class="row"><select id="ri-new">${exOptions()}</select><button class="btn" data-act="ri-add">+ Add</button></div>
    <div class="row"><button class="btn danger ghost" data-act="delete-routine">Delete routine</button></div>`;
  return html;
}

// ---------- progress tab ----------

function recentExerciseIds(days) {
  const since = addDays(today(), -days);
  const ids = new Set();
  for (const s of S.sessions) if (s.date >= since) for (const e of s.entries) ids.add(e.exId);
  return [...ids].filter((id) => EX[id] && EX[id].equip !== 'band');
}

function coachCard() {
  const ids = recentExerciseIds(42);
  if (!ids.length) {
    return card(S.sessions.length
      ? `No training logged in the last 6 weeks. When you restart, each lift suggests a lighter restart weight (legs ${S.settings.restartPctLegs}%, shoulder lifts ${S.settings.restartPctShoulder}%, others ${S.settings.restartPctOther}% of your last weight) and builds back from there.`
      : 'Log a few workouts (or import your history) and suggestions will show up here.');
  }
  const groups = { up: [], pain: [], stall: [] };
  for (const id of ids) {
    const ex = EX[id], it = targetFor(id);
    const sug = L.suggest(ex, { sets: it.sets ?? 3, repMin: it.repMin ?? ex.repMin, repMax: it.repMax ?? ex.repMax }, L.exerciseHistory(S.sessions, id), S.settings, { today: today() });
    const k = sug.kind === 'up' || sug.kind === 'tempo' ? 'up' : sug.kind.startsWith('pain') ? 'pain' : sug.kind === 'stall' ? 'stall' : null;
    if (k) groups[k].push(`<li><b>${h(ex.name)}</b>: ${h(sug.message)}</li>`);
  }
  let html = '';
  if (groups.up.length) html += `<h4>${ic('up', 16)} Ready to progress</h4><ul>${groups.up.join('')}</ul>`;
  if (groups.pain.length) html += `<h4>${ic('alert', 16)} Shoulder watch</h4><ul>${groups.pain.join('')}</ul>`;
  if (groups.stall.length) html += `<h4>${ic('pause', 16)} Stalled</h4><ul>${groups.stall.join('')}</ul>`;
  if (groups.stall.length >= 3) html += '<p><b>Several lifts have stalled.</b> That usually means you need a deload week more than more effort.</p>';
  return card(html || 'Nothing to change. Keep beating last time\'s reps.');
}

const mdLite = (t) => h(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/^#+\s*(.+)$/gm, '<b>$1</b>').replace(/\n/g, '<br>');

function claudeCard() {
  const r = S.lastReview;
  let html = `<b>Ask Claude for a review</b><p class="muted small">Sends your last 8 weeks of sets, bodyweight and rehab note to Anthropic using your own API key. Optional.</p>`;
  html += S.settings.apiKey
    ? `<button class="btn" data-act="ask-claude" ${ui.claudeLoading ? 'disabled' : ''}>${ui.claudeLoading ? 'Thinking…' : 'Review my training'}</button>`
    : '<p>Add an API key in <a href="#" data-act="tab" data-tab="settings">Settings</a> to turn this on.</p>';
  if (ui.claudeError) html += `<p class="warn-t">${h(ui.claudeError)}</p>`;
  if (r) html += `<div class="review"><small class="muted">${h(r.at)}</small><div>${mdLite(r.text)}</div><p class="muted small">AI-generated. Your physio's advice comes first.</p></div>`;
  return card(html);
}

function volumeCard() {
  const tally = L.setsPerMuscle(S.sessions, EX, addDays(today(), -6), today());
  const rows = MUSCLES.map((m) => {
    const n = Math.round((tally[m] || 0) * 10) / 10;
    const cls = n < 10 ? 'low' : n > 20 ? 'high' : 'ok';
    return `<div class="vrow"><span>${h(m)}</span><div class="vbar"><div class="vzone"></div><div class="vfill ${cls}" style="width:${Math.min(100, (n / 25) * 100)}%"></div></div><b>${n}</b></div>`;
  }).join('');
  return card(`${rows}<p class="muted small">Last 7 days. The shaded band is about 10–20 hard sets per muscle per week, the range research links to good muscle growth. Secondary muscles count as half a set.</p>`);
}

function exerciseProgress() {
  const counts = {};
  for (const s of S.sessions) for (const e of s.entries) if (EX[e.exId] && EX[e.exId].equip !== 'band') counts[e.exId] = (counts[e.exId] || 0) + 1;
  const ids = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
  if (!ids.length) return card('No history yet.');
  if (!ui.progEx || !counts[ui.progEx]) ui.progEx = ids[0];
  const ex = EX[ui.progEx];
  const lt = L.loadType(ex.equip);
  const hist = L.exerciseHistory(S.sessions, ui.progEx);
  const metrics = lt === 'bodyweight' ? [['reps', 'Best set reps'], ['total', 'Total reps']] : [['e1rm', 'Est. 1RM'], ['top', 'Top weight'], ['volume', 'Volume']];
  if (!metrics.some(([k]) => k === ui.metric)) ui.metric = metrics[0][0];
  const val = { e1rm: (x) => x.best1rm, top: (x) => x.topW, volume: (x) => x.volume, reps: (x) => x.maxReps, total: (x) => x.totalReps }[ui.metric];
  const inj = S.settings.injuryDate;
  const cmp = lt !== 'bodyweight' ? L.injuryComparison(hist, inj) : null;
  const series = [
    { label: metrics.find(([k]) => k === ui.metric)[1], points: hist.map((x) => ({ x: x.date, y: val(x) })).filter((p) => p.y > 0) },
    { label: 'Shoulder flagged', cls: 'pain', noLine: true, points: hist.filter((x) => x.pain).map((x) => ({ x: x.date, y: val(x) })).filter((p) => p.y > 0) },
  ];
  if (!series[1].points.length) series.pop();
  let html = `<select data-act-change="prog-ex">${ids.map((id) => `<option value="${h(id)}" ${id === ui.progEx ? 'selected' : ''}>${h(EX[id].name)} (${counts[id]})</option>`).join('')}</select>
    <div class="seg">${metrics.map(([k, l]) => `<button class="${k === ui.metric ? 'on' : ''}" data-act="metric" data-v="${k}">${l}</button>`).join('')}</div>`;
  html += lineChart(series, {
    marks: inj ? [{ x: inj, label: 'injury' }] : [],
    refs: cmp && ui.metric === 'e1rm' ? [{ y: cmp.pre, label: 'pre-injury best' }] : [],
  });
  if (cmp) html += `<p>Pre-injury best est. 1RM <b>${cmp.pre} lb</b>${cmp.now != null ? ` · since injury <b>${cmp.now} lb</b> (${cmp.pct}%)` : ' · not trained since the injury yet'}</p>`;
  html += hist.slice(-5).reverse().map((x) => `<div class="hist-row"><span>${h(x.date)}</span><span>${h(x.sets.map((s) => `${lt === 'bodyweight' ? (s.w ? `+${s.w}×` : '') : `${s.w}×`}${s.r}${s.pain ? ' (shoulder)' : ''}`).join(', '))}</span></div>`).join('');
  return card(html);
}

function historyList() {
  const all = [...S.sessions].sort((a, b) => b.date.localeCompare(a.date) || (b.endedAt || 0) - (a.endedAt || 0));
  if (!all.length) return '<p class="muted">No workouts yet.</p>';
  let html = '<div class="list">' + all.slice(0, ui.histLimit).map((s) => `<button class="routine" data-act="session" data-id="${h(s.id)}"><span>${h(s.title || 'Workout')}</span><small>${h(s.date)} · ${s.entries.reduce((a, e) => a + L.workingSets(e).length, 0)} sets${s.entries.some((e) => e.sets.some((x) => x.pain)) ? ' · shoulder' : ''}</small></button>`).join('') + '</div>';
  if (all.length > ui.histLimit) html += '<button class="btn ghost wide" data-act="more-hist">Show more</button>';
  return html;
}

function viewProgress() {
  const tabs = [['coach', 'Coach'], ['lifts', 'Lifts'], ['volume', 'Volume'], ['history', 'History']];
  const t = ui.progTab || 'coach';
  const body = t === 'coach' ? coachCard() + claudeCard() : t === 'lifts' ? exerciseProgress() : t === 'volume' ? volumeCard() : historyList();
  return `<h2>Progress</h2><div class="seg" role="tablist">${tabs.map(([k, l]) => `<button role="tab" aria-selected="${k === t}" class="${k === t ? 'on' : ''}" data-act="prog-tab" data-v="${k}">${l}</button>`).join('')}</div>${body}`;
}

// ---------- body tab ----------

function gainMessage(g) {
  if (g.status === 'low') return `<b>Weight isn't going up</b> (${g.lbPerWeek >= 0 ? '+' : ''}${g.lbPerWeek} lb/week over ${g.weeks} weeks). Muscle growth needs a small surplus: add about 200–300 calories a day (e.g. a shake or an extra snack) and recheck in 2 weeks.`;
  if (g.status === 'high') return `<b>Gaining fast</b> (+${g.lbPerWeek} lb/week). Above about 0.5% of bodyweight a week, more of the gain tends to be fat. Trim about 200 calories a day.`;
  return `<b>On track:</b> +${g.lbPerWeek} lb/week, inside the lean-gain range.`;
}

function proteinCard(lastW) {
  if (!lastW) return card('<b>Daily protein</b><p class="muted small">Log your weight above to get a protein target.</p>');
  const target = L.proteinTarget(lastW, S.settings.proteinPerKg);
  const t = today();
  const hit = !!S.protein[t];
  let streak = 0;
  for (let k = 0; k < 7; k++) if (S.protein[addDays(t, -k)]) streak++;
  return card(`<b>Daily protein: ${target} g</b>
    <p class="muted small">${S.settings.proteinPerKg} g per kg of bodyweight a day, where extra protein stopped adding muscle in the largest review (Morton et al. 2018). Spread over 3–5 meals, e.g. ${Math.round(target / 4)} g × 4.</p>
    <button class="btn wide ${hit ? 'primary' : 'ghost'}" data-act="protein-toggle">${hit ? '✓ Hit my protein today' : 'Tap when you hit your protein today'}</button>
    <p class="small">Last 7 days: <b>${streak}/7</b> days</p>`);
}

function viewBody() {
  const bw = L.movingAverage(S.bodyweight);
  const last = bw[bw.length - 1];
  const gain = L.gainCheck(S.bodyweight, today());
  let html = `<h2>Nutrition</h2>${proteinCard(last?.avg)}${card(gain ? gainMessage(gain) + '<p class="muted small">Target for lean gain: about +0.25–0.5% of bodyweight per week (roughly +0.5–1 lb/week for you).</p>' : '<b>Weight trend</b><p class="muted small">Weigh in a few times a week (same time, after the bathroom). After about 2 weeks you\'ll see whether you\'re gaining at the lean-gain rate.</p>', gain && gain.status !== 'ok' ? 'warn' : '')}
  <h2>Bodyweight</h2>${card(`<div class="grid2">
      <label class="field">Date<input type="date" id="bw-date" value="${today()}"></label>
      <label class="field">Weight (lb)<input type="number" inputmode="decimal" step="0.1" id="bw-w" placeholder="${last ? last.w : ''}"></label>
    </div><button class="btn" data-act="bw-add">Save weight</button>
    ${last ? `<p>7-day average: <b>${last.avg} lb</b></p>` : ''}
    ${bw.length ? lineChart([{ label: 'Weigh-ins', cls: 'faint', noLine: true, points: bw.map((x) => ({ x: x.date, y: x.w })) }, { label: '7-day average', points: bw.map((x) => ({ x: x.date, y: x.avg })), noDots: true }], { unit: ' lb' }) : ''}
    ${[...bw].reverse().slice(0, 8).map((x) => `<div class="hist-row"><span>${h(x.date)}</span><span>${x.w} lb <button class="link danger" data-act="bw-del" data-d="${h(x.date)}">delete</button></span></div>`).join('')}`)}`;
  const acts = ['Swimming', 'Running', 'Cycling', 'Walking', 'Rowing', 'Other'];
  const weekMin = S.cardio.filter((c) => c.date >= addDays(today(), -6)).reduce((a, c) => a + (c.minutes || 0), 0);
  html += `<h2>Cardio</h2>${card(`<div class="grid2">
      <label class="field">Activity<select id="c-act">${acts.map((a) => `<option>${a}</option>`).join('')}</select></label>
      <label class="field">Date<input type="date" id="c-date" value="${today()}"></label>
      <label class="field">Minutes<input type="number" inputmode="numeric" id="c-min"></label>
      <label class="field">Distance<div class="row tight"><input type="number" inputmode="decimal" step="0.01" id="c-dist"><select id="c-unit"><option>mi</option><option>km</option><option>yd</option><option>m</option></select></div></label>
    </div><label class="field">Note<input id="c-note"></label><button class="btn" data-act="cardio-add">Save cardio</button>
    <p>Last 7 days: <b>${weekMin} min</b> <small class="muted">(general guideline: 150+ min of moderate cardio per week)</small></p>
    ${[...S.cardio].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 12).map((c) => `<div class="hist-row"><span>${h(c.date)} · ${h(c.activity)}</span><span>${c.distance != null ? `${c.distance} ${h(c.distUnit || 'mi')} · ` : ''}${c.minutes != null ? `${c.minutes} min` : ''}${c.note ? ` <small class="muted">${h(c.note)}</small>` : ''} <button class="link danger" data-act="cardio-del" data-id="${h(c.id)}">delete</button></span></div>`).join('')}`)}`;
  return html;
}

// ---------- settings tab ----------

function viewSettings() {
  const st = S.settings;
  const num = (k, label, extra = '') => `<label class="field">${label}<input type="number" inputmode="decimal" step="any" data-setting="${k}" value="${h(st[k])}" ${extra}></label>`;
  const chk = (k, label) => `<label class="field check"><input type="checkbox" data-setting="${k}" ${st[k] ? 'checked' : ''}> ${label}</label>`;
  const grp = (title, inner, open = false) => `<details class="group" ${open ? 'open' : ''}><summary>${title}${ic('chevronDown', 18)}</summary><div>${inner}</div></details>`;
  return `<h2>Settings</h2>
  ${grp('Appearance', `<label class="field">Theme<select data-setting="theme">${[['auto', 'Match my phone'], ['light', 'Light'], ['dark', 'Dark']].map(([v, l]) => `<option value="${v}" ${st.theme === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>`, true)}
  ${grp('Equipment', `<div class="grid2">${num('barWeight', 'Bar weight (lb)')}${num('increment', 'Barbell jump (lb)')}</div>
    <label class="field">Plates you own (lb, comma separated)<input data-setting="plates" data-list value="${h(st.plates.join(', '))}"></label>
    <label class="field">Dumbbells you own (lb)<input data-setting="dumbbells" data-list value="${h(st.dumbbells.join(', '))}"></label>`)}
  ${grp('Shoulder rehab', `
    ${chk('rehabMode', 'Rehab mode: shoulder flag on each set, slower progression on shoulder-loading lifts (3 clean sessions before adding weight)')}
    <div class="grid2"><label class="field">Injury date<input type="date" data-setting="injuryDate" value="${h(st.injuryDate)}"></label>${num('painDropPct', 'Drop after a flag (%)')}</div>
    <p class="small">After a break of 4+ weeks, restart at this % of your last weight:</p>
    <div class="grid2">${num('restartPctShoulder', 'Shoulder lifts (%)')}${num('restartPctLegs', 'Leg lifts (%)')}${num('restartPctOther', 'Other lifts (%)')}</div>
    <label class="field">Rehab note (stays on this phone; included in Claude reviews)<textarea data-setting="rehabNote" rows="2" placeholder="e.g. physio guidance, movements to avoid">${h(st.rehabNote)}</textarea></label>
    <p class="muted small">General guidance, not medical advice. If pain is sharp, lingers, or keeps coming back, stop that lift and check with your physio.</p>`)}
  ${grp('Training', `<div class="grid2">${num('deloadWeeks', 'Deload every (weeks)')}</div>
    ${chk('buildUp', 'Build-up: fewer sets on the main chest lifts for the first 2 sessions of each push day after a program change')}
    ${chk('askRir', 'Ask "reps left in tank" after each set')}${chk('sound', 'Beep when rest is over')}
    <button class="btn small ghost" data-act="test-sound">Test beep</button>`)}
  ${grp('How rest times are chosen', `
    <p class="small">Defaults are for muscle growth in a trained 38-year-old. Research shows no reason to change rest for age alone in a healthy adult:</p>
    <ul class="small"><li>Big compound lifts (squat, bench, rows, pull-ups): <b>2–3 min</b>, deadlifts 3 min. Longer rests let you keep more reps across sets, which drives growth (Schoenfeld et al. 2016; Grgic et al. 2017; ACSM 2009).</li>
    <li>Isolation lifts: <b>60–90 s</b>.</li><li>Band shoulder work: <b>30 s</b>.</li>
    <li>+30 s if you missed your reps, hit 0 reps in the tank, or flagged the shoulder.</li></ul>
    <p class="muted small">Change any rest time per exercise in the routine editor.</p>`)}
  ${grp('Claude review (optional)', `
    <label class="field">Anthropic API key<input type="password" autocomplete="off" data-setting="apiKey" value="${h(st.apiKey)}" placeholder="sk-ant-…"></label>
    <label class="field">Model<select data-setting="model">${MODELS.map(([v, l]) => `<option value="${v}" ${st.model === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    <p class="muted small">The key is stored only in this browser and is never in backups or the code. Use a dedicated key with a low monthly spend limit, and revoke it if this phone is lost.</p>`)}
  ${grp('Your data', `<p class="small">Everything stays on this phone. Back up regularly: clearing Safari data deletes it.</p>
    <label class="field">Import Caliber strength CSV<input type="file" accept=".csv,text/csv" data-import="caliber-strength"></label>
    <label class="field">Import Caliber cardio CSV<input type="file" accept=".csv,text/csv" data-import="caliber-cardio"></label>
    <div class="row"><button class="btn" data-act="export">Export backup</button><label class="btn ghost file-btn">Restore backup<input type="file" accept=".json,application/json" data-import="backup" hidden></label></div>
    <p class="muted small">${S.sessions.length} workouts · ${S.bodyweight.length} weigh-ins · ${S.cardio.length} cardio entries</p>
    <button class="btn danger small" data-act="reset">Erase all data</button>`)}
  ${grp('Install on iPhone', `<ol class="small"><li>Open this page in Safari.</li><li>Tap Share → <b>Add to Home Screen</b>.</li><li>Open it from the home-screen icon. It works offline.</li></ol>`)}`;
}

// ---------- actions ----------

const actions = {
  tab: (d) => { ui.tab = d.tab; ui.editRoutine = null; render(); window.scrollTo(0, 0); },
  start: (d) => startWorkout(d.id),
  'start-empty': () => startWorkout(null),
  finish: finishWorkout,
  discard: () => {
    if (!confirm('Discard this workout? Nothing from it will be saved.')) return;
    S.active = null; S.timer = null; persist(); render();
  },
  done: (d) => {
    const e = S.active.entries[d.i], s = e.sets[d.j], ex = EX[e.exId];
    if (s.done) { s.done = false; persist(); render(); return; }
    const lt = L.loadType(ex.equip);
    if (lt === 'load' && (s.w == null || s.w === '')) { toast('Enter the weight first'); return; }
    if (s.r == null || s.r === '') s.r = e.repMin;
    if (s.w == null || s.w === '') s.w = 0;
    s.done = true;
    s.doneAt = Date.now();
    if (!s.warmup && e.sets.filter((x) => !x.warmup).every((x) => x.done)) { e.justDone = Date.now(); navigator.vibrate?.([30, 40, 60]); }
    // Fewer reps than the target shown means the set went to failure.
    const target = s.pr ?? e.repMin;
    if (!s.warmup && lt !== 'band' && +s.r < target && s.rir == null) { s.rir = 0; s.autoRir = true; }
    // Carry a changed weight forward to the sets still showing the old pre-fill.
    if (!s.warmup && s.w !== s.pw) for (const n of e.sets.slice(d.j + 1)) if (!n.done && !n.warmup && n.w === s.pw) { n.w = s.w; n.pw = s.w; }
    const later = e.sets.slice(d.j + 1).some((x) => !x.done);
    const nextEx = S.active.entries.slice(+d.i + 1).find((x) => x.sets.some((y) => !y.done));
    // Superset: hop straight to the partner (15 s), full rest only after the round.
    const grp = e.ss && !s.warmup ? S.active.entries.filter((x) => x.ss === e.ss) : [];
    const partner = grp.slice(grp.indexOf(e) + 1).find((x) => x.sets.some((y) => !y.done && !y.warmup));
    const firstOpen = grp.find((x) => x.sets.some((y) => !y.done && !y.warmup));
    if (partner) startTimer(15, `go: ${EX[partner.exId]?.name}`, `${d.i}.${d.j}`);
    else if (grp.length && firstOpen) startTimer(Math.max(L.restSeconds(ex, e, s), ...grp.map((x) => x.rest)), `next round: ${EX[firstOpen.exId]?.name}`, `${d.i}.${d.j}`);
    else if (later || nextEx) startTimer(s.warmup ? 60 : L.restSeconds(ex, e, s), later ? ex.name : nextEx ? `next: ${EX[nextEx.exId]?.name}` : '', `${d.i}.${d.j}`);
    persist(); render();
  },
  rir: (d) => {
    const s = S.active.entries[d.i].sets[d.j];
    s.rir = s.rir === +d.v ? null : +d.v;
    s.autoRir = false;
    retime(d.i, d.j); persist(); render();
  },
  pain: (d) => {
    const e = S.active.entries[d.i], s = e.sets[d.j];
    s.pain = !s.pain;
    if (s.pain) toast(`Noted. Next ${EX[e.exId].name} session drops ~${S.settings.painDropPct}% and progression pauses.`, 'warn');
    retime(d.i, d.j); persist(); render();
  },
  'add-set': (d) => {
    const e = S.active.entries[d.i];
    const last = [...e.sets].reverse().find((x) => !x.warmup);
    e.sets.push({ w: last?.w ?? null, r: last?.r ?? e.repMin, pw: last?.w ?? null, pr: last?.pr ?? last?.r ?? e.repMin, done: false });
    persist(); render();
  },
  warmup: (d) => {
    const e = S.active.entries[d.i];
    const work = e.sets.find((x) => !x.warmup && x.w);
    if (!work) { toast('Enter a working weight first'); return; }
    const ws = L.warmups(+work.w, S.settings.barWeight, S.settings.increment);
    if (!ws.length) { toast('Light enough that no warm-up sets are needed'); return; }
    e.sets = [...ws.map((x) => ({ ...x, warmup: true, done: false })), ...e.sets.filter((x) => !x.warmup)];
    persist(); render();
  },
  plates: (d) => {
    const e = S.active.entries[d.i];
    const w = (e.sets.find((x) => !x.done && !x.warmup) || e.sets[0])?.w || '';
    const lm = EX[e.exId].equip === 'landmine';
    openModal(`<h2>Plate calculator</h2><p class="muted">${lm ? 'Landmine: plates on the bar end only' : `${S.settings.barWeight} lb bar, total weight`} · plates ${S.settings.plates.join(', ')}</p>
      <label class="field">${lm ? 'Plates on the bar end (lb)' : 'Total weight (lb)'}<input type="number" inputmode="decimal" data-plates ${lm ? 'data-lm' : ''} value="${h(w)}"></label><div id="plates-out">${platesHTML(+w, lm)}</div>`);
  },
  swap: (d) => {
    const e = S.active.entries[d.i], ex = EX[e.exId];
    const similar = Object.values(EX).filter((x) => x.id !== ex.id && x.primary[0] === ex.primary[0]);
    openModal(`<h2>Swap ${h(ex.name)}</h2><p class="muted">Same main muscle (${h(ex.primary[0])}):</p>
      <div class="list">${similar.map((x) => `<button class="routine" data-act="swap-to" data-i="${d.i}" data-id="${h(x.id)}"><span>${h(x.name)}</span><small>${h(x.equip)}</small></button>`).join('') || '<p>None.</p>'}</div>
      <label class="field">Or any exercise<select id="swap-any">${exOptions()}</select></label><button class="btn" data-act="swap-to" data-i="${d.i}">Swap</button>`);
  },
  'swap-to': (d) => {
    const id = d.id || $('#swap-any').value;
    const e = S.active.entries[d.i];
    const fresh = makeEntry({ exId: id, sets: e.sets.filter((x) => !x.warmup).length, station: e.station, note: `Swapped from ${EX[e.exId].name}` }, S.active.deload);
    const done = e.sets.filter((x) => x.done && !x.warmup);
    if (done.length) {
      // Keep finished sets under the original exercise; continue with the new one.
      fresh.sets = fresh.sets.slice(done.length);
      e.sets = done;
      S.active.entries.splice(+d.i + 1, 0, fresh);
    } else S.active.entries[d.i] = fresh;
    closeModal(); persist(); render();
  },
  note: (d) => {
    const id = S.active.entries[d.i].exId;
    openModal(`<h2>Note: ${h(EX[id].name)}</h2><p class="muted small">Shown every time you do this exercise (e.g. "seat on 3rd pin").</p>
      <textarea id="exnote" rows="3">${h(S.exNotes[id] || '')}</textarea><button class="btn" data-act="save-note" data-id="${h(id)}">Save note</button>`);
  },
  'save-note': (d) => {
    const v = $('#exnote').value.trim();
    if (v) S.exNotes[d.id] = v; else delete S.exNotes[d.id];
    closeModal(); persist(); render();
  },
  'ex-hist': (d) => {
    const id = S.active.entries[d.i].exId, ex = EX[id];
    const hist = L.exerciseHistory(S.sessions, id).slice(-6).reverse();
    openModal(`<h2>${h(ex.name)}</h2>${hist.map((x) => `<div class="hist-row"><span>${h(x.date)}</span><span>${h(x.sets.map((s) => `${s.w}×${s.r}${s.pain ? ' (shoulder)' : ''}`).join(', '))}</span></div>`).join('') || '<p class="muted">No history yet.</p>'}`);
  },
  'remove-ex': (d) => {
    if (!confirm('Remove this exercise from today\'s workout?')) return;
    S.active.entries.splice(d.i, 1); persist(); render();
  },
  'add-ex': () => openModal(`<h2>Add exercise</h2><select id="add-ex-id">${exOptions()}</select><button class="btn" data-act="add-ex-ok">Add</button>`),
  'add-ex-ok': () => {
    S.active.entries.push(makeEntry({ exId: $('#add-ex-id').value, sets: 3 }, S.active.deload, null));
    closeModal(); persist(); render();
  },
  howto: (d) => {
    const ex = EX[d.id], tip = HOWTO[d.id];
    openModal(`<h2>${h(ex.name)}</h2>
      ${ANIM[d.id] ? '<div class="anim-box" id="anim"></div>' : ''}
      ${tip ? `<ol class="howto">${tip.steps.map((x) => `<li>${h(x)}</li>`).join('')}</ol>` : '<p class="muted">No written cues for this exercise yet. The video search below will show you how.</p>'}
      ${tip?.shoulder && S.settings.rehabMode ? card(`<h4>${ic('alert', 16)} Shoulder tip</h4>${h(tip.shoulder)}`, 'warn') : ''}
      <a class="btn wide video" href="${h(videoURL(ex.name))}" target="_blank" rel="noopener">${ic('play', 16)} Watch videos on YouTube</a>
      <p class="muted small">Videos open YouTube and need internet. Start light while you learn a new movement.</p>`);
    if (ANIM[d.id]) stopAnim = mountAnimation($('#anim'), d.id);
  },
  'dismiss-upgrade': () => { delete S.upgradeNote; persist(); render(); },
  'protein-toggle': () => { const t = today(); if (S.protein[t]) delete S.protein[t]; else S.protein[t] = true; persist(); render(); },
  'close-modal': closeModal,
  'more-routines': () => { ui.moreRoutines = !ui.moreRoutines; render(); },
  'prog-tab': (d) => { ui.progTab = d.v; render(); },
  'warm-toggle': () => {
    const bands = S.active.entries.map((e, i) => ({ e, i })).filter((x) => EX[x.e.exId]?.equip === 'band');
    ui.warmOpen = !warmIsOpen(bands); render();
  },
  'band-done': (d) => {
    const e = S.active.entries[d.i];
    const all = e.sets.every((s) => s.done);
    for (const s of e.sets) { s.done = !all; if (!all) { s.r = s.r ?? e.repMax; s.w = 0; s.doneAt = Date.now(); } }
    persist(); render();
  },
  'sug-toggle': (d) => { const e = S.active.entries[d.i]; e.showWhy = !e.showWhy; persist(); render(); },
  'rir-clear': (d) => { const s = S.active.entries[d.i].sets[d.j]; s.rir = null; s.autoRir = false; persist(); render(); },
  'timer-big': () => { ui.bigTimer = !ui.bigTimer; renderTimer(); },
  'ex-menu': (d) => {
    const e = S.active.entries[d.i], ex = EX[e.exId], lt = L.loadType(ex.equip);
    const item = (act, icon, label, cls = '') => `<button class="${cls}" data-act="${act}" data-i="${d.i}">${ic(icon)}${label}</button>`;
    openModal(`<h2>${h(ex.name)}</h2><div class="menu">
      ${item('add-set', 'plus', 'Add a set')}
      ${lt === 'load' && ex.kind === 'compound' ? item('warmup', 'flame', 'Add warm-up sets') : ''}
      ${lt === 'load' && ['barbell', 'landmine'].includes(ex.equip) ? item('plates', 'plates', 'Plate calculator') : ''}
      ${item('swap', 'swap', 'Swap exercise')}
      ${item('note', 'note', S.exNotes[e.exId] ? 'Edit note' : 'Add a note')}
      ${item('ex-hist', 'history', 'History')}
      ${item('remove-ex', 'x', 'Remove from today', 'danger')}
    </div>`);
  },
  't-minus': () => { if (S.timer) { S.timer.end -= 15000; persist(); tick(); } },
  't-plus': () => { if (S.timer) { S.timer.end += 15000; S.timer.total += 15; S.timer.fired = false; persist(); renderTimer(); } },
  't-skip': () => { S.timer = null; ui.bigTimer = false; persist(); renderTimer(); },
  'start-deload': () => { S.settings.deloadUntil = addDays(today(), 6); S.settings.lastDeload = today(); persist(); render(); },
  'end-deload': () => { S.settings.deloadUntil = ''; persist(); render(); },
  'snooze-deload': () => { S.settings.deloadSnooze = addDays(today(), 7); persist(); render(); },
  session: (d) => showSummary(d.id),
  'edit-minutes': (d) => {
    const s = S.sessions.find((x) => x.id === d.id);
    if (!s) return;
    const cur = s.startedAt && s.endedAt ? Math.round((s.endedAt - s.startedAt) / 60000) : '';
    const v = parseInt(prompt('How long was this workout, in minutes?', cur), 10);
    if (!(v > 0 && v < 300)) return;
    s.startedAt = s.startedAt || Date.parse(`${s.date}T12:00:00`);
    s.endedAt = s.startedAt + v * 60000;
    persist(); showSummary(s.id);
  },
  'delete-session': (d) => {
    if (!confirm('Delete this workout permanently?')) return;
    S.sessions = S.sessions.filter((s) => s.id !== d.id);
    closeModal(); persist(); render();
  },
  'more-hist': () => { ui.histLimit += 30; render(); },
  metric: (d) => { ui.metric = d.v; render(); },
  'ask-claude': askClaude,
  'new-routine': () => {
    const r = { id: uid(), group: 'My routines', name: 'New routine', items: [] };
    S.routines.push(r); ui.editRoutine = r.id; persist(); render();
  },
  'edit-routine': (d) => { ui.editRoutine = d.id; render(); window.scrollTo(0, 0); },
  'dup-routine': (d) => {
    const src = S.routines.find((r) => r.id === d.id);
    const r = { ...structuredClone(src), id: uid(), name: `${src.name} (copy)`, group: 'My routines' };
    S.routines.push(r); ui.editRoutine = r.id; persist(); render(); window.scrollTo(0, 0);
  },
  'done-routine': () => { ui.editRoutine = null; render(); },
  'delete-routine': () => {
    if (!confirm('Delete this routine? Past workouts are kept.')) return;
    S.routines = S.routines.filter((r) => r.id !== ui.editRoutine); ui.editRoutine = null; persist(); render();
  },
  'ri-add': () => {
    const r = S.routines.find((x) => x.id === ui.editRoutine);
    const prev = r.items[r.items.length - 1];
    r.items.push({ exId: $('#ri-new').value, sets: 3, station: prev?.station || '' });
    persist(); render();
  },
  'ri-del': (d) => { S.routines.find((x) => x.id === ui.editRoutine).items.splice(d.k, 1); persist(); render(); },
  'ri-up': (d) => moveItem(+d.k, -1),
  'ri-down': (d) => moveItem(+d.k, 1),
  'add-custom': () => {
    const name = $('#cx-name').value.trim();
    if (!name) { toast('Enter a name'); return; }
    const ex = L.guessExercise(name);
    if (EX[ex.id]) { toast('That exercise already exists'); return; }
    Object.assign(ex, { equip: $('#cx-equip').value, kind: $('#cx-kind').value, primary: [$('#cx-muscle').value], shoulder: $('#cx-shoulder').checked });
    if (ex.equip === 'band') Object.assign(ex, { kind: 'band', repMin: 15, repMax: 20, rest: 30 });
    else if (ex.kind === 'isolation') Object.assign(ex, { repMin: 10, repMax: 15, rest: 75 });
    else Object.assign(ex, { repMin: 6, repMax: 10, rest: 150 });
    S.customExercises[ex.id] = ex; refreshEx(); persist(); render(); toast(`Added ${name}`);
  },
  'bw-add': () => {
    const w = parseFloat($('#bw-w').value), date = $('#bw-date').value || today();
    if (!(w > 0)) { toast('Enter your weight'); return; }
    S.bodyweight = S.bodyweight.filter((x) => x.date !== date).concat({ date, w });
    persist(); render();
  },
  'bw-del': (d) => { S.bodyweight = S.bodyweight.filter((x) => x.date !== d.d); persist(); render(); },
  'cardio-add': () => {
    const minutes = parseFloat($('#c-min').value) || null, distance = parseFloat($('#c-dist').value) || null;
    if (!minutes && !distance) { toast('Enter minutes or distance'); return; }
    S.cardio.push({ id: uid(), date: $('#c-date').value || today(), activity: $('#c-act').value, minutes, distance, distUnit: $('#c-unit').value, note: $('#c-note').value.trim() });
    persist(); render();
  },
  'cardio-del': (d) => { S.cardio = S.cardio.filter((c) => c.id !== d.id); persist(); render(); },
  'test-sound': () => { unlockAudio(); const s = S.settings.sound; S.settings.sound = true; beep(); S.settings.sound = s; navigator.vibrate?.(200); },
  export: () => {
    const blob = new Blob([exportJSON(S)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `rep-backup-${today()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  },
  reset: () => {
    if (!confirm('Erase ALL workouts, routines and settings on this phone? Export a backup first.')) return;
    if (!confirm('Really erase everything? This cannot be undone.')) return;
    localStorage.removeItem('liftlog.v1'); S = load(); refreshEx(); render();
  },
};

function moveItem(k, dir) {
  const items = S.routines.find((x) => x.id === ui.editRoutine).items;
  const j = k + dir;
  if (j < 0 || j >= items.length) return;
  [items[k], items[j]] = [items[j], items[k]];
  persist(); render();
}

function refreshEx() { EX = exerciseMap(S); }

async function askClaude() {
  ui.claudeLoading = true; ui.claudeError = ''; render();
  try {
    const model = S.settings.model || DEFAULT_SETTINGS.model;
    const body = {
      model, max_tokens: 16000, output_config: { effort: 'medium' },
      system: 'You are an evidence-based strength coach reviewing a lifter\'s training log. You are not a medical provider: for pain or injury questions, defer to their physio.',
      messages: [{ role: 'user', content: L.buildReviewPrompt({ sessions: S.sessions, exMap: EX, bodyweight: S.bodyweight, settings: S.settings, today: today() }) }],
    };
    const headers = {
      'content-type': 'application/json', 'x-api-key': S.settings.apiKey, 'anthropic-version': '2026-10-21',
      'anthropic-dangerous-direct-browser-access': 'true',
    };
    if (FALLBACK_MODELS.has(model)) { body.fallbacks = 'default'; headers['anthropic-beta'] = 'server-side-fallback-2026-07-01'; }
    const res = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error?.message || `Request failed (HTTP ${res.status})`);
    if (data.stop_reason === 'refusal') throw new Error('Claude declined this request. Try again or edit your rehab note.');
    const text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
    S.lastReview = { text: text || '(empty response)', at: new Date().toLocaleString() };
    persist();
  } catch (err) {
    ui.claudeError = /fetch|network/i.test(err.message) ? 'Could not reach Claude. Are you offline?' : err.message;
  }
  ui.claudeLoading = false;
  render();
}

async function handleImport(kind, file) {
  const text = await file.text();
  try {
    if (kind === 'caliber-strength') {
      const { sessions, newExercises } = L.importCaliberStrength(text, EX);
      Object.assign(S.customExercises, newExercises);
      const have = new Set(S.sessions.map((s) => s.id));
      const add = sessions.filter((s) => !have.has(s.id));
      S.sessions.push(...add);
      refreshEx();
      toast(`Imported ${add.length} workouts${sessions.length - add.length ? ` (${sessions.length - add.length} already here)` : ''}`);
    } else if (kind === 'caliber-cardio') {
      const rows = L.importCaliberCardio(text);
      const have = new Set(S.cardio.map((c) => c.id));
      const add = rows.filter((c) => !have.has(c.id));
      S.cardio.push(...add);
      const fixed = add.filter((c) => c.note).length;
      toast(`Imported ${add.length} cardio entries${fixed ? `, corrected ${fixed} bad durations` : ''}`);
    } else if (kind === 'backup') {
      if (!confirm('Replace everything on this phone with this backup?')) return;
      S = importJSON(S, text);
      refreshEx();
      toast('Backup restored');
    }
    persist(); render();
  } catch (err) {
    toast(`Import failed: ${err.message}`, 'warn');
  }
}

// ---------- events ----------

document.addEventListener('click', (ev) => {
  unlockAudio();
  if (ev.target.id === 'modal') { closeModal(); return; }
  const b = ev.target.closest('[data-act]');
  if (!b || !actions[b.dataset.act] || b.tagName === 'SELECT') return;
  ev.preventDefault();
  if (b.closest('.menu')) closeModal();
  const d = { ...b.dataset };
  if (d.i != null) d.i = +d.i;
  if (d.j != null) d.j = +d.j;
  actions[b.dataset.act](d);
});

document.addEventListener('input', (ev) => {
  const t = ev.target;
  if (t.dataset.set && S.active) {
    const [i, j, f] = t.dataset.set.split('.');
    const e = S.active.entries[+i], s = e.sets[+j];
    const prev = s[f], val = t.value === '' ? null : parseFloat(t.value);
    s[f] = val;
    if (f === 'w' && !s.warmup) {
      e.sets.forEach((n, k) => {
        if (k <= +j || n.done || n.warmup || n.w !== prev) return;
        n.w = val; n.pw = val;
        const box = document.querySelector(`input[data-set="${i}.${k}.w"]`);
        if (box) box.value = val ?? '';
      });
      s.pw = val;
    }
    persistSoon();
  } else if (t.dataset.bind === 'active-note' && S.active) {
    S.active.note = t.value; persistSoon();
  } else if (t.dataset.plates != null) {
    $('#plates-out').innerHTML = platesHTML(parseFloat(t.value) || 0, t.dataset.lm != null);
  }
});

document.addEventListener('change', (ev) => {
  const t = ev.target;
  if (t.dataset.setting) {
    const k = t.dataset.setting;
    let v = t.type === 'checkbox' ? t.checked : t.value;
    if (t.dataset.list != null) v = t.value.split(/[,\s]+/).map(Number).filter((n) => n > 0);
    else if (t.type === 'number') v = parseFloat(t.value) || DEFAULT_SETTINGS[k];
    S.settings[k] = typeof v === 'string' ? v.trim() : v;
    persist();
    if (t.type === 'checkbox' || t.dataset.list != null || k === 'theme') render();
  } else if (t.dataset.r) {
    S.routines.find((x) => x.id === ui.editRoutine)[t.dataset.r] = t.value.trim();
    persist();
  } else if (t.dataset.ri) {
    const [k, f] = t.dataset.ri.split('.');
    const it = S.routines.find((x) => x.id === ui.editRoutine).items[+k];
    if (['sets', 'repMin', 'repMax', 'rest'].includes(f)) {
      const n = parseInt(t.value, 10);
      if (n > 0) it[f] = n; else delete it[f];
    } else if (t.value.trim()) it[f] = t.value.trim();
    else delete it[f];
    persist();
    if (['exId', 'sets', 'rest', 'ss'].includes(f)) render();
  } else if (t.dataset.actChange === 'prog-ex') {
    ui.progEx = t.value; render();
  } else if (t.dataset.import && t.files?.[0]) {
    handleImport(t.dataset.import, t.files[0]);
    t.value = '';
  }
});

document.querySelectorAll('#nav .nav-ic').forEach((el) => { el.innerHTML = ic(el.dataset.ic, 24); });
document.querySelectorAll('#nav button').forEach((b) => b.addEventListener('click', () => actions.tab({ tab: b.dataset.tab })));

if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});

render();
