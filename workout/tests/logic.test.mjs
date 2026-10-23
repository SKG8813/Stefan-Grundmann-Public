// Run with: node --test workout/tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as L from '../js/logic.js';
import { EXERCISES, ROUTINES } from '../js/data.js';

const EX = Object.fromEntries(EXERCISES.map((e) => [e.id, e]));
const settings = { increment: 5, dumbbells: [5, 10, 15], rehabMode: true, painDropPct: 10, barWeight: 45, deloadWeeks: 6 };

const session = (date, exId, sets, extra = {}) => ({
  id: `${date}-${exId}`, date, entries: [{ exId, sets: sets.map(([w, r, more]) => ({ w, r, done: true, ...more })) }], ...extra,
});

test('every routine item references a known exercise', () => {
  for (const r of ROUTINES) for (const it of r.items) assert.ok(EX[it.exId], `${r.id}: ${it.exId}`);
});

test('non-shoulder lift progresses after 2 clean sessions at the top of the range', () => {
  const ex = EX['barbell-squat'];
  const hist = L.exerciseHistory([
    session('2026-10-01', ex.id, [[185, 10], [185, 10], [185, 10]]),
    session('2026-10-08', ex.id, [[185, 10], [185, 10], [185, 10]]),
  ], ex.id);
  const s = L.suggest(ex, { sets: 3 }, hist, settings, { today: '2026-10-10' });
  assert.equal(s.kind, 'up');
  assert.equal(s.weight, 190);
});

test('shoulder lift in rehab mode needs 3 clean sessions', () => {
  const ex = EX['barbell-bench-press'];
  const two = [session('2026-10-01', ex.id, [[135, 10], [135, 10], [135, 10]]), session('2026-10-05', ex.id, [[135, 10], [135, 10], [135, 10]])];
  assert.equal(L.suggest(ex, { sets: 3 }, L.exerciseHistory(two, ex.id), settings, { today: '2026-10-06' }).kind, 'hold');
  const three = [...two, session('2026-10-08', ex.id, [[135, 10], [135, 10], [135, 10]])];
  const s = L.suggest(ex, { sets: 3 }, L.exerciseHistory(three, ex.id), settings, { today: '2026-10-09' });
  assert.equal(s.kind, 'up');
  assert.equal(s.weight, 140);
  assert.equal(L.suggest(ex, { sets: 3 }, L.exerciseHistory(two, ex.id), { ...settings, rehabMode: false }, { today: '2026-10-06' }).kind, 'up');
});

test('shoulder flag drops 10% next time, and twice in a row escalates', () => {
  const ex = EX['barbell-bench-press'];
  const one = [session('2026-10-01', ex.id, [[150, 8], [150, 8, { pain: true }]])];
  const s1 = L.suggest(ex, { sets: 3 }, L.exerciseHistory(one, ex.id), settings, { today: '2026-10-03' });
  assert.equal(s1.kind, 'pain');
  assert.equal(s1.weight, 135);
  const two = [...one, session('2026-10-04', ex.id, [[135, 8, { pain: true }]])];
  const s2 = L.suggest(ex, { sets: 3 }, L.exerciseHistory(two, ex.id), settings, { today: '2026-10-06' });
  assert.equal(s2.kind, 'pain2');
  assert.match(s2.message, /physio/);
});

test('dumbbells step to the next owned weight, then switch to reps/tempo', () => {
  const ex = EX['dumbbell-lateral-raise'];
  const at10 = [session('2026-10-01', ex.id, [[10, 20], [10, 20], [10, 20]]), session('2026-10-04', ex.id, [[10, 20], [10, 20], [10, 20]])];
  assert.equal(L.suggest(ex, { sets: 3 }, L.exerciseHistory(at10, ex.id), settings, { today: '2026-10-05' }).weight, 15);
  const at15 = at10.map((s) => ({ ...s, entries: [{ ...s.entries[0], sets: s.entries[0].sets.map((x) => ({ ...x, w: 15 })) }] }));
  const s = L.suggest(ex, { sets: 3 }, L.exerciseHistory(at15, ex.id), settings, { today: '2026-10-05' });
  assert.equal(s.kind, 'tempo');
  assert.equal(s.weight, 15);
  assert.equal(s.sets, 4);
});

test('long break restarts lighter; shoulder lifts lighter still', () => {
  const bench = EX['barbell-bench-press'], squat = EX['barbell-squat'];
  const old = [session('2024-11-19', bench.id, [[170, 8], [170, 8], [170, 8]]), session('2024-11-19', squat.id, [[205, 8]])];
  const b = L.suggest(bench, { sets: 3 }, L.exerciseHistory(old, bench.id), settings, { today: '2026-10-23' });
  assert.equal(b.kind, 'return');
  assert.equal(b.weight, 100);
  const s = L.suggest(squat, { sets: 3 }, L.exerciseHistory(old, squat.id), settings, { today: '2026-10-23' });
  assert.equal(s.weight, 175);
  const curl = EX['barbell-curl'];
  const c = L.suggest(curl, { sets: 3 }, L.exerciseHistory([session('2024-11-19', curl.id, [[80, 10]])], curl.id), settings, { today: '2026-10-23' });
  assert.equal(c.weight, 60);
  const custom = L.suggest(squat, { sets: 3 }, L.exerciseHistory(old, squat.id), { ...settings, restartPctLegs: 90 }, { today: '2026-10-23' });
  assert.equal(custom.weight, 185);
});

test('stall is detected after 3 sessions without more reps', () => {
  const ex = EX['barbell-squat'];
  const hist = L.exerciseHistory(['2026-10-01', '2026-10-04', '2026-10-08'].map((d) => session(d, ex.id, [[205, 8], [205, 7], [205, 6]])), ex.id);
  assert.equal(L.suggest(ex, { sets: 3 }, hist, settings, { today: '2026-10-09' }).kind, 'stall');
});

test('deload suggestion uses ~90% and one fewer set', () => {
  const ex = EX['barbell-squat'];
  const hist = L.exerciseHistory([session('2026-10-01', ex.id, [[200, 8]])], ex.id);
  const s = L.suggest(ex, { sets: 3 }, hist, settings, { deload: true, today: '2026-10-02' });
  assert.equal(s.weight, 180);
  assert.equal(s.sets, 2);
});

test('rest adds 30s after missed reps or a shoulder flag', () => {
  const ex = EX['barbell-bench-press'];
  assert.equal(L.restSeconds(ex, { rest: 150, repMin: 6 }, { r: 8 }), 150);
  assert.equal(L.restSeconds(ex, { rest: 150, repMin: 6 }, { r: 4 }), 180);
  assert.equal(L.restSeconds(ex, { rest: 150, repMin: 6 }, { r: 8, pain: true }), 180);
  assert.equal(L.restSeconds(EX['band-pull-apart'], null, { r: 1 }), 30);
});

test('plate calculator and warm-ups', () => {
  assert.deepEqual(L.platesPerSide(185, 45, [45, 25, 10, 5, 2.5]).perSide, [45, 25]);
  assert.deepEqual(L.platesPerSide(140, 45, [45, 25, 10, 5, 2.5]).perSide, [45, 2.5]);
  assert.equal(L.platesPerSide(141, 45, [45, 25, 10, 5, 2.5]).ok, false);
  assert.deepEqual(L.warmups(185, 45).map((x) => x.w), [45, 95, 130, 155]);
  assert.deepEqual(L.warmups(50, 45), []);
});

test('Caliber import groups sets into sessions and fixes bad cardio durations', () => {
  const csv = '"Date","Title","Exercise","Set #","Reps","Weight","Time"\n'
    + '"2024-01-02","Day A","Barbell Bench Press","2","8","155.0",""\n'
    + '"2024-01-02","Day A","Barbell Bench Press","1","10","135.0",""\n'
    + '"2024-01-02","Day A","Hex Bar (Trap Bar) Deadlift ","1","5","225.0",""\n'
    + '"2024-01-02","Day A","Zercher Carry","1","1","95.0",""\n';
  const { sessions, newExercises } = L.importCaliberStrength(csv, EX);
  assert.equal(sessions.length, 1);
  assert.deepEqual(sessions[0].entries[0].sets.map((s) => s.w), [135, 155]);
  assert.equal(sessions[0].entries[1].exId, 'hex-bar-deadlift');
  assert.ok(newExercises['zercher-carry']);
  const cardio = L.importCaliberCardio('"Date","Title","Distance","Time","Calories","Level","Speed"\n"2024-11-22","Swimming","0.5","108000","","",""\n"2024-11-18","Swimming","0.5","1800","","",""\n');
  assert.deepEqual(cardio.map((c) => c.minutes), [30, 30]);
});

test('weekly sets per muscle count secondaries as half', () => {
  const t = L.setsPerMuscle([session('2026-10-20', 'barbell-bench-press', [[135, 8], [135, 8]])], EX, '2026-10-17', '2026-10-23');
  assert.equal(t.chest, 2);
  assert.equal(t.triceps, 1);
});

test('deload becomes due after 6 straight weeks', () => {
  const sessions = [];
  for (let d = 0; d <= 42; d += 3) sessions.push({ date: L.todayISO(new Date(Date.parse('2026-09-10') + d * L.DAY + 43200000)), entries: [] });
  assert.equal(L.deloadStatus(sessions, settings, '2026-10-22').due, true);
  assert.equal(L.deloadStatus(sessions, { ...settings, lastDeload: '2026-10-15' }, '2026-10-22').due, false);
});

test('every built-in exercise has how-to cues', async () => {
  const { HOWTO } = await import('../js/howto.js');
  for (const e of EXERCISES) assert.ok(HOWTO[e.id]?.steps?.length >= 3, e.id);
});

test('every built-in exercise has an animation that renders', async () => {
  const { ANIM, frameSVG } = await import('../js/anim.js');
  for (const e of EXERCISES) {
    assert.ok(ANIM[e.id], e.id);
    for (const x of [0, 0.5, 1]) assert.doesNotMatch(frameSVG(ANIM[e.id], x), /NaN|undefined/, e.id);
  }
});

test('animations move every changing value smoothly (no jumps)', async () => {
  const { ANIM, frameSVG } = await import('../js/anim.js');
  const defaults = ['sy', 'foot', 'headDrop'];
  for (const [id, d] of Object.entries(ANIM)) {
    for (const k of Object.keys(d.b)) {
      if (typeof d.b[k] === 'number') assert.ok(k in d.a || defaults.includes(k), `${id}: "${k}" missing from start pose`);
    }
    assert.notEqual(frameSVG(d, 0), frameSVG(d, 1), `${id}: start and end look identical`);
    assert.notEqual(frameSVG(d, 0.5), frameSVG(d, 1), `${id}: jumps straight to the end pose`);
  }
});
