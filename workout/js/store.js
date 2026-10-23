// Local persistence. Everything lives in this browser's localStorage only.
import { EXERCISES, ROUTINES } from './data.js';

const KEY = 'liftlog.v1';
const SEED_VERSION = 3;
// Fingerprints of earlier built-in home-split routines, so unedited copies are replaced quietly.
const KNOWN_BUILTIN = new Set(['21c37897', '61de1b0a', 'aa5642e2', 'a4f4c0c8']);
const fingerprint = (r) => { let x = 5381; for (const c of r.name + JSON.stringify(r.items)) x = ((x * 33) ^ c.charCodeAt(0)) >>> 0; return x.toString(16); };
const HOME_SPLIT = ['home-push-a', 'home-pull-a', 'home-push-b', 'home-pull-b'];

export const DEFAULT_SETTINGS = {
  barWeight: 45,
  plates: [45, 25, 10, 5, 2.5],
  dumbbells: [5, 10, 15],
  increment: 5,
  rehabMode: true,
  injuryDate: '',
  rehabNote: '',
  painDropPct: 10,
  restartPctShoulder: 60,
  restartPctLegs: 85,
  restartPctOther: 75,
  deloadWeeks: 6,
  lastDeload: '',
  deloadUntil: '',
  sound: true,
  askRir: true,
  apiKey: '',
  model: 'claude-opus-5-5',
  theme: 'auto',
  proteinPerKg: 1.6,
  programStart: '',
};

function fresh() {
  return {
    schema: 1, seedVersion: 0, settings: { ...DEFAULT_SETTINGS }, customExercises: {},
    routines: [], sessions: [], bodyweight: [], cardio: [], exNotes: {}, protein: {}, active: null, timer: null,
  };
}

export function load() {
  let s;
  try { s = JSON.parse(localStorage.getItem(KEY)) || fresh(); } catch { s = fresh(); }
  s = { ...fresh(), ...s, settings: { ...DEFAULT_SETTINGS, ...(s.settings || {}) } };
  if ((s.seedVersion || 0) < SEED_VERSION) {
    if ((s.seedVersion || 0) >= 1) {
      // Newer built-in home split replaces the old one. A copy is kept only if you had edited it.
      let kept = 0;
      for (const id of HOME_SPLIT) {
        const old = s.routines.find((r) => r.id === id);
        const next = ROUTINES.find((r) => r.id === id);
        if (!old || fingerprint(old) === fingerprint(next)) continue;
        if (!KNOWN_BUILTIN.has(fingerprint(old))) {
          s.routines.push({ ...structuredClone(old), id: `${id}-old-${Date.now().toString(36)}`, group: 'Old versions (safe to delete)', name: `${old.name} (old)` });
          kept++;
        }
        s.routines = s.routines.filter((r) => r !== old);
      }
      if (!s.settings.programStart) s.settings.programStart = new Date().toISOString().slice(0, 10);
      s.upgradeNote = `Your home split now fits in 45 minutes, using supersets that need no rack changes.${kept ? ' Your edited versions are under "Old versions" in Plans.' : ''}`;
    }
    // Add built-in routines that aren't present yet; never overwrite edits.
    const have = new Set(s.routines.map((r) => r.id));
    const homeAt = s.routines.findIndex((r) => r.group === 'Home split' || r.group?.startsWith('From your history'));
    const add = ROUTINES.filter((r) => !have.has(r.id)).map((r) => structuredClone(r));
    const home = add.filter((r) => HOME_SPLIT.includes(r.id));
    const rest = add.filter((r) => !HOME_SPLIT.includes(r.id));
    s.routines = [...home, ...s.routines, ...rest];
    if (homeAt < 0 && !s.settings.programStart) s.settings.programStart = new Date().toISOString().slice(0, 10);
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
  if (!data || !Array.isArray(data.sessions) || !Array.isArray(data.routines)) throw new Error('Not a REP backup file');
  return { ...fresh(), ...data, settings: { ...DEFAULT_SETTINGS, ...data.settings, apiKey: state.settings.apiKey } };
}

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
