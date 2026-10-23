// Local persistence. Everything lives in this browser's localStorage only.
import { EXERCISES, ROUTINES } from './data.js';

const KEY = 'liftlog.v1';
const SEED_VERSION = 1;

export const DEFAULT_SETTINGS = {
  barWeight: 45,
  plates: [45, 25, 10, 5, 2.5],
  dumbbells: [5, 10, 15],
  increment: 5,
  rehabMode: true,
  injuryDate: '',
  rehabNote: '',
  painDropPct: 10,
  deloadWeeks: 6,
  lastDeload: '',
  deloadUntil: '',
  sound: true,
  askRir: true,
  apiKey: '',
  model: 'claude-opus-5-5',
};

function fresh() {
  return {
    schema: 1, seedVersion: 0, settings: { ...DEFAULT_SETTINGS }, customExercises: {},
    routines: [], sessions: [], bodyweight: [], cardio: [], exNotes: {}, active: null, timer: null,
  };
}

export function load() {
  let s;
  try { s = JSON.parse(localStorage.getItem(KEY)) || fresh(); } catch { s = fresh(); }
  s = { ...fresh(), ...s, settings: { ...DEFAULT_SETTINGS, ...(s.settings || {}) } };
  if ((s.seedVersion || 0) < SEED_VERSION) {
    // Add built-in routines that aren't present yet; never overwrite edits.
    const have = new Set(s.routines.map((r) => r.id));
    for (const r of ROUTINES) if (!have.has(r.id)) s.routines.push(structuredClone(r));
    s.seedVersion = SEED_VERSION;
  }
  return s;
}

let saveFailed = false;
export function save(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    saveFailed = false;
    return true;
  } catch {
    saveFailed = true;
    return false;
  }
}
export const lastSaveFailed = () => saveFailed;

export function exerciseMap(state) {
  const m = {};
  for (const e of EXERCISES) m[e.id] = e;
  for (const e of Object.values(state.customExercises)) m[e.id] = e;
  return m;
}

export function exportJSON(state) {
  const { apiKey, ...settings } = state.settings;
  return JSON.stringify({ ...state, settings, exportedAt: new Date().toISOString() }, null, 1);
}

export function importJSON(state, text) {
  const data = JSON.parse(text);
  if (!data || !Array.isArray(data.sessions) || !Array.isArray(data.routines)) throw new Error('Not a Lift Log backup file');
  return { ...fresh(), ...data, settings: { ...DEFAULT_SETTINGS, ...data.settings, apiKey: state.settings.apiKey } };
}

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
