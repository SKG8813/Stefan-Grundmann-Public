// Pure training logic: no DOM, no storage. Unit-tested in tests/logic.test.mjs.

export const DAY = 86400000;
export const LEG_MUSCLES = ['quads', 'hamstrings/glutes', 'calves'];

export const slug = (s) => s.toLowerCase().trim().replace(/\(.*?\)/g, (m) => m.replace(/[()]/g, ''))
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const normName = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

export const todayISO = (d = new Date()) => {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
};
export const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / DAY);

export function loadType(equip) {
  if (equip === 'band') return 'band';
  if (equip === 'dumbbell') return 'dumbbell';
  if (equip === 'bodyweight') return 'bodyweight';
  return 'load';
}

// Epley estimate; only meaningful for loaded sets.
export const e1rm = (w, r) => (w > 0 && r > 0 ? w * (1 + Math.min(r, 15) / 30) : 0);

export const roundTo = (x, step) => Math.round(x / step) * step;

export const workingSets = (entry) => (entry?.sets || []).filter((s) => s.done && !s.warmup && s.r > 0);

// One row per session that trained the exercise, oldest first.
export function exerciseHistory(sessions, exId) {
  const out = [];
  for (const s of sessions) {
    for (const e of s.entries || []) {
      if (e.exId !== exId) continue;
      const sets = workingSets(e);
      if (!sets.length) continue;
      out.push({
        sessionId: s.id, date: s.date, sets, deload: !!s.deload,
        pain: sets.some((x) => x.pain),
        topW: Math.max(...sets.map((x) => x.w || 0)),
        totalReps: sets.reduce((a, x) => a + x.r, 0),
        volume: sets.reduce((a, x) => a + (x.w || 0) * x.r, 0),
        best1rm: Math.max(...sets.map((x) => e1rm(x.w || 0, x.r))),
        maxReps: Math.max(...sets.map((x) => x.r)),
        rir: avg(sets.filter((x) => x.rir != null).map((x) => x.rir)),
      });
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);

function isClean(h, repMax, targetSets) {
  if (h.pain) return false;
  const atTop = h.sets.filter((x) => (x.w || 0) >= h.topW);
  return atTop.length >= Math.min(targetSets, 2) && atTop.every((x) => x.r >= repMax);
}

function dropLoad(w, pct, step) {
  let d = roundTo(w * (1 - pct / 100), step);
  if (d >= w) d = w - step;
  return Math.max(d, 0);
}

// Progression nudge for one exercise in one routine slot.
// Returns { kind, weight, reps, sets, message, need, streak }.
export function suggest(ex, target, history, settings, { deload = false, today = null } = {}) {
  const repMin = target.repMin ?? ex.repMin;
  const repMax = target.repMax ?? ex.repMax;
  const sets = target.sets ?? 3;
  const lt = loadType(ex.equip);
  const inc = settings.increment || 5;
  const base = { weight: null, reps: repMin, sets, need: 0, streak: 0 };

  if (lt === 'band') return { ...base, kind: 'band', weight: 0, reps: repMax, message: '' };
  if (!history.length) {
    return { ...base, kind: 'new', weight: lt === 'bodyweight' ? 0 : null,
      message: `First time: pick a weight you could lift for ${repMax} reps with about 2 reps left in the tank.` };
  }

  const last = history[history.length - 1];
  const lastW = last.topW;
  const dbs = [...(settings.dumbbells || [])].sort((a, b) => a - b);

  // Long layoff (or the first session after the injury): restart well below the old numbers.
  const gap = today ? daysBetween(last.date, today) : 0;
  if (gap > 28) {
    const legs = ex.primary.some((m) => LEG_MUSCLES.includes(m));
    const pct = settings.rehabMode && ex.shoulder ? settings.restartPctShoulder ?? 60
      : legs ? settings.restartPctLegs ?? 85 : settings.restartPctOther ?? 75;
    const weeks = Math.round(gap / 7);
    if (lt === 'bodyweight') {
      const r = Math.max(3, Math.round(last.maxReps * 0.7));
      return { ...base, kind: 'return', weight: 0, reps: r,
        message: `${weeks} weeks since you last did this. Start with sets of about ${r} reps and build back up.` };
    }
    let w;
    if (lt === 'load') w = Math.max(roundTo(lastW * pct / 100, inc), ex.equip === 'barbell' ? settings.barWeight || 45 : 0);
    else w = dbs.filter((d) => d <= lastW * pct / 100).pop() ?? dbs[0] ?? lastW;
    return { ...base, kind: 'return', weight: w, reps: repMin,
      message: `${weeks} weeks since your last session (${fmtW(lastW, lt)}). Restart around ${fmtW(w, lt)} (~${pct}%) and add weight each session it feels easy.` };
  }

  if (deload) {
    const w = lt === 'load' ? dropLoad(lastW, 10, inc) : lt === 'dumbbell' ? (dbs.filter((d) => d < lastW).pop() ?? lastW) : lastW;
    return { ...base, kind: 'deload', weight: w, sets: Math.max(1, sets - 1),
      message: `Deload week: ${fmtW(w, lt)}, ${Math.max(1, sets - 1)} sets, stop 3+ reps short of failure.` };
  }

  // Shoulder flag on the last session: drop and pause progression.
  let painStreak = 0;
  for (let i = history.length - 1; i >= 0 && history[i].pain; i--) painStreak++;
  if (painStreak > 0) {
    const pct = settings.painDropPct ?? 10;
    let w = lastW;
    if (lt === 'load') w = dropLoad(lastW, pct, inc);
    else if (lt === 'dumbbell') w = dbs.filter((d) => d < lastW).pop() ?? lastW;
    const twice = painStreak >= 2;
    return { ...base, kind: twice ? 'pain2' : 'pain', weight: w, reps: repMin,
      message: twice
        ? `Shoulder flagged ${painStreak} sessions in a row. Use ${fmtW(w, lt)} for ${repMin} reps. If it keeps happening, check in with your physio before pushing this lift.`
        : `Shoulder flagged last time. Drop to ${fmtW(w, lt)}${lt === 'load' ? ` (−${pct}%)` : ''}; progression paused until a clean session.` };
  }

  const rehab = settings.rehabMode && ex.shoulder;
  let need = rehab ? 3 : 2;
  if (!rehab && last.rir != null && last.rir >= 3) need = 1;

  let streak = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    const h = history[i];
    if (h.topW !== lastW || !isClean(h, repMax, sets)) break;
    streak++;
  }

  if (streak >= need) {
    if (lt === 'load') {
      const w = lastW + inc;
      return { ...base, kind: 'up', weight: w, need, streak,
        message: `Ready to add weight: ${fmtW(w, lt)} (+${inc}). You hit ${repMax}+ on every set ${streak}× in a row. Aim for ${repMin}+ reps.` };
    }
    if (lt === 'dumbbell') {
      const next = dbs.find((d) => d > lastW);
      if (next) {
        return { ...base, kind: 'up', weight: next, need, streak,
          message: `Ready for the ${next} lb dumbbells. You hit ${repMax}+ on every set ${streak}× in a row.` };
      }
    }
    const moreSets = sets < 4;
    return { ...base, kind: 'tempo', weight: lastW, reps: repMax, sets: moreSets ? sets + 1 : sets, need, streak,
      message: lt === 'dumbbell'
        ? `Maxed out on your heaviest dumbbells. ${moreSets ? 'Add a set, or ' : ''}slow the lowering to 3 seconds and pause 1 second at the stretch.`
        : `Top of the range ${streak}× in a row. ${moreSets ? 'Add a set, or ' : ''}use a slow 3-second lowering, or add load if you have a belt or backpack.` };
  }

  // Stall: 3+ sessions at the same top weight without more total reps.
  const recent = history.slice(-3);
  if (recent.length === 3 && recent.every((h) => h.topW === lastW) && recent[2].totalReps <= recent[0].totalReps) {
    return { ...base, kind: 'stall', weight: lastW, need, streak,
      message: `Stalled for 3 sessions at ${fmtW(lastW, lt)}. Try one lighter week (−10%), sleep and food check, or swap to a similar exercise for a block.` };
  }

  const left = need - streak;
  return { ...base, kind: 'hold', weight: lastW, need, streak,
    message: `Beat last time (${last.sets.map((x) => x.r).join('/')} reps). ${left} more session${left === 1 ? '' : 's'} with ${repMax}+ on every set${rehab ? ' (shoulder lift: 3 needed)' : ''} to add weight.` };
}

export const fmtW = (w, lt) => (lt === 'bodyweight' ? (w ? `BW +${w} lb` : 'bodyweight') : w == null ? '—' : `${w} lb`);

// Rest guidance for hypertrophy, adjusted per set.
export function restSeconds(ex, item, set) {
  let t = item?.rest ?? ex.rest;
  const repMin = item?.repMin ?? ex.repMin;
  if (ex.equip === 'band') return t;
  if (set) {
    if (set.r > 0 && set.r < repMin) t += 30;
    else if (set.rir === 0) t += 30;
    if (set.pain) t += 30;
  }
  return t;
}

export function platesPerSide(target, bar, plates) {
  let rem = (target - bar) / 2;
  if (rem < 0) return { perSide: [], remainder: rem * 2, ok: false };
  const out = [];
  for (const p of [...plates].sort((a, b) => b - a)) {
    while (rem >= p - 1e-9) { out.push(p); rem -= p; }
  }
  rem = Math.round(rem * 100) / 100;
  return { perSide: out, remainder: rem * 2, ok: rem === 0 };
}

// Warm-up ramp for loaded compound lifts.
export function warmups(work, bar, step = 5) {
  if (!work || work <= bar + 10) return [];
  const plan = [[0, 10], [0.5, 8], [0.7, 5]];
  if (work >= 185) plan.push([0.85, 3]);
  const out = [];
  for (const [pct, r] of plan) {
    const w = pct === 0 ? bar : Math.max(bar, roundTo(work * pct, step));
    if (w >= work || out.some((x) => x.w === w)) continue;
    out.push({ w, r });
  }
  return out;
}

// Weekly working sets per muscle: primary counts 1, secondary 0.5.
export function setsPerMuscle(sessions, exMap, fromISO, toISO) {
  const tally = {};
  for (const s of sessions) {
    if (s.date < fromISO || s.date > toISO) continue;
    for (const e of s.entries || []) {
      const ex = exMap[e.exId];
      if (!ex || ex.equip === 'band') continue;
      const n = workingSets(e).length;
      for (const m of ex.primary) tally[m] = (tally[m] || 0) + n;
      for (const m of ex.secondary) tally[m] = (tally[m] || 0) + n * 0.5;
    }
  }
  return tally;
}

// Deload is due after N weeks of continuous training; a 10+ day gap counts as rest.
export function deloadStatus(sessions, settings, today) {
  const dates = [...new Set(sessions.filter((s) => !s.deload).map((s) => s.date))].sort();
  if (!dates.length) return { due: false, weeks: 0 };
  let start = dates[0];
  for (let i = 1; i < dates.length; i++) if (daysBetween(dates[i - 1], dates[i]) >= 10) start = dates[i];
  if (settings.lastDeload && settings.lastDeload > start) start = settings.lastDeload;
  if (daysBetween(dates[dates.length - 1], today) >= 10) return { due: false, weeks: 0 };
  const weeks = Math.floor(daysBetween(start, today) / 7);
  return { due: weeks >= (settings.deloadWeeks || 6), weeks };
}

export function sessionSummary(session, prior, exMap) {
  const entries = session.entries || [];
  let sets = 0, volume = 0;
  const prs = [], pains = [];
  for (const e of entries) {
    const ws = workingSets(e);
    sets += ws.length;
    volume += ws.reduce((a, x) => a + (x.w || 0) * x.r, 0);
    const ex = exMap[e.exId];
    if (!ex || !ws.length) continue;
    if (ws.some((x) => x.pain)) pains.push(ex.name);
    const hist = exerciseHistory(prior, e.exId);
    if (!hist.length) continue;
    const lt = loadType(ex.equip);
    if (lt === 'load' || lt === 'dumbbell') {
      const best = Math.max(...hist.map((h) => h.best1rm));
      const now = Math.max(...ws.map((x) => e1rm(x.w || 0, x.r)));
      if (now > best + 0.01) {
        const top = ws.reduce((a, x) => (e1rm(x.w, x.r) > e1rm(a.w, a.r) ? x : a));
        prs.push(`${ex.name}: ${top.w} × ${top.r} (est. 1RM ${Math.round(now)} lb)`);
      }
    } else if (lt === 'bodyweight') {
      const best = Math.max(...hist.map((h) => h.maxReps));
      const now = Math.max(...ws.map((x) => x.r));
      if (now > best) prs.push(`${ex.name}: ${now} reps`);
    }
  }
  const same = prior.filter((s) => s.routineId && s.routineId === session.routineId).sort((a, b) => a.date.localeCompare(b.date)).pop();
  let lastVolume = null;
  if (same) lastVolume = (same.entries || []).reduce((a, e) => a + workingSets(e).reduce((b, x) => b + (x.w || 0) * x.r, 0), 0);
  const minutes = session.startedAt && session.endedAt ? Math.round((session.endedAt - session.startedAt) / 60000) : null;
  return { sets, volume, prs, pains, minutes, lastVolume };
}

// Best estimated 1RM before and since an injury date.
export function injuryComparison(history, injuryISO) {
  if (!injuryISO) return null;
  const before = history.filter((h) => h.date < injuryISO);
  const after = history.filter((h) => h.date >= injuryISO);
  if (!before.length) return null;
  const pre = Math.max(...before.map((h) => h.best1rm));
  const now = after.length ? Math.max(...after.map((h) => h.best1rm)) : null;
  return { pre: Math.round(pre), now: now == null ? null : Math.round(now), pct: now == null || !pre ? null : Math.round((now / pre) * 100) };
}

export function movingAverage(entries, days = 7) {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  return sorted.map((e) => {
    const win = sorted.filter((x) => x.date <= e.date && daysBetween(x.date, e.date) < days);
    return { date: e.date, w: e.w, avg: Math.round((win.reduce((a, x) => a + x.w, 0) / win.length) * 10) / 10 };
  });
}

// ---------- CSV import ----------

export function parseCSV(text) {
  const rows = [];
  let row = [], field = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') q = false;
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  if (!rows.length) return [];
  const head = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => Object.fromEntries(head.map((h, i) => [h, (r[i] ?? '').trim()])));
}

export function guessExercise(name) {
  const n = name.toLowerCase();
  const equip = n.includes('band') ? 'band' : n.includes('dumbbell') ? 'dumbbell' : n.includes('cable') ? 'cable'
    : n.includes('machine') ? 'machine' : n.includes('landmine') ? 'landmine' : n.includes('barbell') ? 'barbell'
    : /pull-up|chin-up|dip|push-up|raise|plank/.test(n) ? 'bodyweight' : 'barbell';
  const iso = /curl|raise|fly|extension|pushdown|shrug|twist|calf/.test(n);
  const muscle = /bench|fly|chest|push-up/.test(n) ? 'chest' : /row|pull|chin|lat/.test(n) ? 'back'
    : /curl/.test(n) ? 'biceps' : /tricep|dip/.test(n) ? 'triceps' : /squat|leg press|lunge/.test(n) ? 'quads'
    : /deadlift|hip|glute|hamstring/.test(n) ? 'hamstrings/glutes' : /calf/.test(n) ? 'calves'
    : /press|lateral|shoulder/.test(n) ? 'shoulders' : /shrug/.test(n) ? 'traps' : 'core';
  return {
    id: slug(name), name: name.trim(), equip, kind: iso ? 'isolation' : 'compound',
    primary: [muscle], secondary: [], shoulder: /press|fly|dip|raise/.test(n) && muscle !== 'core',
    repMin: iso ? 10 : 6, repMax: iso ? 15 : 10, rest: iso ? 75 : 150, builtin: false,
  };
}

// Caliber strength export -> sessions. exMap is keyed by id.
export function importCaliberStrength(text, exMap) {
  const rows = parseCSV(text);
  const byName = Object.fromEntries(Object.values(exMap).map((e) => [normName(e.name), e]));
  const newEx = {};
  const groups = new Map();
  for (const r of rows) {
    if (!r.Date || !r.Exercise) continue;
    const name = r.Exercise.trim();
    let ex = byName[normName(name)];
    if (!ex) { ex = guessExercise(name); byName[normName(name)] = ex; newEx[ex.id] = ex; }
    const key = `${r.Date}|${r.Title}`;
    if (!groups.has(key)) groups.set(key, { date: r.Date, title: r.Title || 'Workout', entries: new Map() });
    const g = groups.get(key);
    if (!g.entries.has(ex.id)) g.entries.set(ex.id, []);
    g.entries.get(ex.id).push({ n: +r['Set #'] || 0, w: parseFloat(r.Weight) || 0, r: parseInt(r.Reps, 10) || 0 });
  }
  const sessions = [...groups.values()].map((g) => ({
    id: `cal-${g.date}-${slug(g.title)}`, date: g.date, title: g.title, routineId: null, source: 'caliber',
    entries: [...g.entries.entries()].map(([exId, sets]) => ({
      exId, sets: sets.sort((a, b) => a.n - b.n).map(({ w, r }) => ({ w, r, done: true })),
    })),
  }));
  return { sessions, newExercises: newEx };
}

// Caliber cardio export. Times are seconds, but some rows are 60x too large
// (e.g. 108000 for a 30-minute swim); anything over 6 hours is divided by 60.
export function importCaliberCardio(text) {
  return parseCSV(text).filter((r) => r.Date).map((r) => {
    let sec = parseFloat(r.Time) || 0;
    let fixed = false;
    if (sec > 6 * 3600) { sec /= 60; fixed = true; }
    return {
      id: `cal-${r.Date}-${slug(r.Title || 'cardio')}-${r.Distance}`,
      date: r.Date, activity: r.Title || 'Cardio', distance: parseFloat(r.Distance) || null, distUnit: 'mi',
      minutes: sec ? Math.round(sec / 60) : null, calories: parseFloat(r.Calories) || null,
      note: fixed ? 'Duration corrected on import' : '', source: 'caliber',
    };
  });
}

// ---------- Claude review prompt ----------

export function buildReviewPrompt({ sessions, exMap, bodyweight, settings, today }) {
  const from = new Date(Date.parse(today) - 56 * DAY).toISOString().slice(0, 10);
  const recent = sessions.filter((s) => s.date >= from).sort((a, b) => a.date.localeCompare(b.date));
  const lines = [];
  for (const s of recent) {
    lines.push(`${s.date} ${s.title || ''}${s.deload ? ' [deload]' : ''}`);
    for (const e of s.entries || []) {
      const ex = exMap[e.exId];
      const ws = workingSets(e);
      if (!ex || !ws.length || ex.equip === 'band') continue;
      const sets = ws.map((x) => `${x.w || 0}x${x.r}${x.rir != null ? `@RIR${x.rir}` : ''}${x.pain ? ' [shoulder pain]' : ''}`).join(', ');
      lines.push(`  ${ex.name}: ${sets}${e.note ? ` (note: ${e.note})` : ''}`);
    }
    if (s.note) lines.push(`  Session note: ${s.note}`);
  }
  const bw = bodyweight.filter((b) => b.date >= from).map((b) => `${b.date}: ${b.w}`).join('; ');
  const context = [
    'Goal: muscle growth (hypertrophy). Units: lb. Home gym: one rack, bench, pull-up bar, barbell with 45/25/10/5/2.5 plates, landmine, dip bars, ab straps, bands, dumbbells only 5/10/15 lb.',
    settings.rehabMode ? 'Returning from a shoulder injury, cleared to train. Sets tagged [shoulder pain] mean discomfort was felt.' : '',
    settings.rehabNote ? `Athlete note: ${settings.rehabNote}` : '',
  ].filter(Boolean).join('\n');
  return `${context}\n\nLast 8 weeks of training (weight x reps):\n${lines.join('\n') || '(no sessions)'}\n\nBodyweight: ${bw || 'not logged'}\n\n` +
    'Review this training. In under 250 words, give: 1) which lifts are ready to progress and by how much, 2) lifts that look stalled or that the shoulder is reacting to, with a concrete change, 3) whether weekly volume per muscle looks right for hypertrophy, 4) one priority for next week. Be conservative with shoulder-loading lifts. Use plain language and short bullets.';
}
