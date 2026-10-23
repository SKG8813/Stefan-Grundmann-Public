// Built-in exercise library and routines.
// equip drives progression: barbell/landmine/ezbar/trapbar/machine/cable add load,
// dumbbell steps through the owned dumbbell set, bodyweight progresses reps, band is tick-off.

export const MUSCLES = ['chest', 'back', 'shoulders', 'rear delts', 'traps', 'biceps', 'triceps', 'quads', 'hamstrings/glutes', 'calves', 'core'];

const ex = (id, name, equip, kind, primary, secondary, opts = {}) => ({
  id, name, equip, kind, primary, secondary,
  shoulder: !!opts.shoulder,
  repMin: opts.repMin ?? (kind === 'compound' ? 6 : kind === 'band' ? 15 : 10),
  repMax: opts.repMax ?? (kind === 'compound' ? 10 : kind === 'band' ? 20 : 15),
  rest: opts.rest ?? (kind === 'compound' ? 150 : kind === 'band' ? 30 : 75),
  builtin: true,
});

export const EXERCISES = [
  // Shoulder band work
  ex('band-external-rotation', 'Band External Rotation', 'band', 'band', ['rear delts'], []),
  ex('band-internal-rotation', 'Band Internal Rotation', 'band', 'band', ['shoulders'], []),
  ex('band-pull-apart', 'Band Pull-Apart', 'band', 'band', ['rear delts'], ['traps']),
  ex('band-face-pull', 'Band Face Pull', 'band', 'band', ['rear delts'], ['traps']),

  // Barbell
  ex('barbell-bench-press', 'Barbell Bench Press', 'barbell', 'compound', ['chest'], ['triceps', 'shoulders'], { shoulder: true }),
  ex('barbell-incline-bench-press', 'Barbell Incline Bench Press', 'barbell', 'compound', ['chest'], ['shoulders', 'triceps'], { shoulder: true, repMin: 8, repMax: 12 }),
  ex('barbell-close-grip-bench-press', 'Barbell Close Grip Bench Press', 'barbell', 'compound', ['triceps'], ['chest'], { shoulder: true, repMin: 8, repMax: 12 }),
  ex('barbell-close-grip-incline-bench-press', 'Barbell Close Grip Incline Bench Press', 'barbell', 'compound', ['triceps'], ['chest', 'shoulders'], { shoulder: true, repMin: 8, repMax: 12 }),
  ex('barbell-squat', 'Barbell Squat', 'barbell', 'compound', ['quads'], ['hamstrings/glutes', 'core']),
  ex('barbell-deadlift', 'Barbell Deadlift', 'barbell', 'compound', ['hamstrings/glutes'], ['back', 'traps'], { repMin: 5, repMax: 8, rest: 180 }),
  ex('barbell-romanian-deadlift', 'Barbell Romanian Deadlift', 'barbell', 'compound', ['hamstrings/glutes'], ['back'], { repMin: 8, repMax: 12 }),
  ex('barbell-bent-over-row', 'Barbell Bent-Over Row', 'barbell', 'compound', ['back'], ['biceps', 'rear delts'], { repMin: 8, repMax: 12, rest: 120 }),
  ex('barbell-shrug', 'Barbell Shrug', 'barbell', 'isolation', ['traps'], [], { repMin: 10, repMax: 15, rest: 90 }),
  ex('barbell-curl', 'Barbell Curl', 'barbell', 'isolation', ['biceps'], [], { repMin: 8, repMax: 12, rest: 90 }),
  ex('barbell-lying-tricep-extension', 'Barbell Lying Tricep Extension', 'barbell', 'isolation', ['triceps'], [], { repMin: 10, repMax: 15, rest: 90 }),
  ex('barbell-standing-calf-raise', 'Barbell Standing Calf Raise', 'barbell', 'isolation', ['calves'], [], { repMin: 10, repMax: 15, rest: 60 }),
  ex('barbell-overhead-press', 'Barbell Overhead Press', 'barbell', 'compound', ['shoulders'], ['triceps'], { shoulder: true }),
  ex('inverted-row', 'Inverted Row (Bar in Rack)', 'bodyweight', 'compound', ['back'], ['biceps', 'rear delts'], { repMin: 8, repMax: 15, rest: 90 }),

  // Landmine (uses the rack bar)
  ex('single-arm-landmine-press', 'Single Arm Landmine Press', 'landmine', 'compound', ['shoulders'], ['chest', 'triceps'], { shoulder: true, repMin: 8, repMax: 12, rest: 90 }),
  ex('landmine-row', 'Landmine Row', 'landmine', 'compound', ['back'], ['biceps', 'rear delts'], { repMin: 8, repMax: 12, rest: 120 }),
  ex('landmine-squat', 'Landmine Squat', 'landmine', 'compound', ['quads'], ['hamstrings/glutes'], { repMin: 10, repMax: 15, rest: 90 }),
  ex('landmine-twist', 'Landmine Twist', 'landmine', 'isolation', ['core'], [], { repMin: 10, repMax: 15, rest: 60 }),

  // Dumbbells (home set is 5/10/15 lb)
  ex('dumbbell-lateral-raise', 'Dumbbell Lateral Raise', 'dumbbell', 'isolation', ['shoulders'], [], { repMin: 12, repMax: 20, rest: 60 }),
  ex('dumbbell-rear-delt-fly', 'Dumbbell Rear Delt Fly', 'dumbbell', 'isolation', ['rear delts'], ['traps'], { repMin: 12, repMax: 20, rest: 60 }),
  ex('dumbbell-fly', 'Dumbbell Fly', 'dumbbell', 'isolation', ['chest'], [], { shoulder: true, repMin: 12, repMax: 20, rest: 75 }),
  ex('dumbbell-hammer-curl', 'Dumbbell Hammer Curl', 'dumbbell', 'isolation', ['biceps'], [], { repMin: 12, repMax: 20, rest: 60 }),
  ex('dumbbell-shoulder-press', 'Dumbbell Shoulder Press', 'dumbbell', 'compound', ['shoulders'], ['triceps'], { shoulder: true, repMin: 12, repMax: 20, rest: 90 }),
  ex('dumbbell-incline-bench-press', 'Dumbbell Incline Bench Press', 'dumbbell', 'compound', ['chest'], ['shoulders', 'triceps'], { shoulder: true, repMin: 8, repMax: 12, rest: 120 }),

  // Bodyweight / rack attachments
  ex('pull-up', 'Pull-Up', 'bodyweight', 'compound', ['back'], ['biceps'], { repMin: 6, repMax: 12 }),
  ex('chin-up', 'Chin-Up', 'bodyweight', 'compound', ['back'], ['biceps'], { repMin: 6, repMax: 12 }),
  ex('tricep-dip', 'Tricep Dip', 'bodyweight', 'compound', ['triceps'], ['chest', 'shoulders'], { shoulder: true, repMin: 6, repMax: 12, rest: 120 }),
  ex('hanging-straight-leg-hip-raise', 'Hanging Straight Leg-Hip Raise', 'bodyweight', 'isolation', ['core'], [], { repMin: 10, repMax: 15, rest: 60 }),

  // Commercial gym equipment
  ex('machine-seated-row', 'Machine Seated Row', 'machine', 'compound', ['back'], ['biceps', 'rear delts'], { repMin: 8, repMax: 12, rest: 120 }),
  ex('cable-standing-fly', 'Cable Standing Fly', 'cable', 'isolation', ['chest'], [], { shoulder: true, repMin: 10, repMax: 15 }),
  ex('cable-tricep-pushdown-rope', 'Cable Tricep Pushdown (With Rope Attachment)', 'cable', 'isolation', ['triceps'], []),
  ex('cable-bent-over-tricep-extension-rope', 'Cable Bent-Over Tricep Extension (With Rope)', 'cable', 'isolation', ['triceps'], []),
  ex('cable-bent-over-tricep-extension', 'Cable Bent-Over Tricep Extension', 'cable', 'isolation', ['triceps'], []),
  ex('ez-bar-lying-tricep-extension', 'EZ Bar Lying Tricep Extension', 'ezbar', 'isolation', ['triceps'], [], { repMin: 10, repMax: 15, rest: 90 }),
  ex('hex-bar-deadlift', 'Hex Bar (Trap Bar) Deadlift', 'trapbar', 'compound', ['quads'], ['hamstrings/glutes', 'back', 'traps'], { repMin: 5, repMax: 8, rest: 180 }),
];

// Station labels: consecutive items with the same station need no rack change.
const S = {
  bands: 'Bands',
  squat: 'Rack: squat height (dip bars off)',
  bench: 'Rack: bench height',
  incline: 'Rack: bench height, bench on incline',
  floor: 'Bar on the floor',
  pullup: 'Bar out of rack: pull-up bar & ab straps',
  landmine: 'Bar into landmine',
  dips: 'Dip bars on',
  db: 'Dumbbells & bench',
  invrow: 'Rack: hip height (inverted row)',
  gym: 'Gym',
};

const item = (exId, sets, station, opts = {}) => ({ exId, sets, station, ...opts });

const BANDS = [
  item('band-external-rotation', 2, S.bands),
  item('band-internal-rotation', 2, S.bands),
  item('band-pull-apart', 2, S.bands),
];

export const ROUTINES = [
  // New 4-day home Push/Pull split, hypertrophy focus, light legs
  { id: 'home-push-a', group: 'Home split', name: 'Push A: Chest', items: [
    ...BANDS,
    item('barbell-squat', 3, S.squat, { note: 'Only leg move today. Do it first, then lower the hooks once.' }),
    item('barbell-bench-press', 3, S.bench),
    item('barbell-shrug', 3, S.bench, { note: 'Same hook height as bench.' }),
    item('barbell-lying-tricep-extension', 3, S.bench),
    item('dumbbell-fly', 3, S.db),
    item('dumbbell-lateral-raise', 3, S.db),
  ] },
  { id: 'home-pull-a', group: 'Home split', name: 'Pull A: Lats', items: [
    ...BANDS,
    item('pull-up', 3, S.pullup),
    item('chin-up', 2, S.pullup),
    item('hanging-straight-leg-hip-raise', 3, S.pullup),
    item('barbell-curl', 3, S.pullup, { note: 'Bar is already out of the rack.' }),
    item('barbell-bent-over-row', 3, S.floor),
    item('barbell-romanian-deadlift', 3, S.floor, { note: 'Only leg move today.' }),
    item('dumbbell-rear-delt-fly', 3, S.db),
    item('dumbbell-hammer-curl', 2, S.db),
  ] },
  { id: 'home-push-b', group: 'Home split', name: 'Push B: Shoulders & Triceps', items: [
    ...BANDS,
    item('barbell-incline-bench-press', 3, S.incline),
    item('barbell-close-grip-bench-press', 3, S.incline, { note: 'Flatten the bench; same hooks.' }),
    item('single-arm-landmine-press', 3, S.landmine),
    item('landmine-squat', 3, S.landmine, { note: 'Only leg move today.' }),
    item('landmine-twist', 3, S.landmine),
    item('tricep-dip', 3, S.dips, { note: 'Stop at upper arm parallel. Skip if the shoulder complains.' }),
    item('dumbbell-lateral-raise', 3, S.db),
    item('dumbbell-shoulder-press', 2, S.db),
  ] },
  { id: 'home-pull-b', group: 'Home split', name: 'Pull B: Back Thickness', items: [
    ...BANDS,
    item('barbell-deadlift', 3, S.floor, { note: 'Only leg move today.' }),
    item('barbell-curl', 3, S.floor),
    item('chin-up', 3, S.pullup),
    item('pull-up', 2, S.pullup),
    item('hanging-straight-leg-hip-raise', 3, S.pullup),
    item('landmine-row', 3, S.landmine),
    item('dumbbell-rear-delt-fly', 3, S.db),
    item('dumbbell-hammer-curl', 3, S.db),
  ] },

  // Historical routines, home versions (swapped to owned equipment, ordered by station)
  { id: 'hist-lcs-home', group: 'From your history: home', name: 'Legs & Chest & Shoulders (Home)', items: [
    ...BANDS,
    item('barbell-squat', 3, S.squat),
    item('barbell-standing-calf-raise', 3, S.squat),
    item('barbell-bench-press', 3, S.bench),
    item('barbell-bent-over-row', 3, S.floor, { note: 'Replaces Machine Seated Row.' }),
    item('single-arm-landmine-press', 3, S.landmine),
    item('landmine-twist', 3, S.landmine),
  ] },
  { id: 'hist-bs-home', group: 'From your history: home', name: 'Back & Shoulders (Home)', items: [
    ...BANDS,
    item('barbell-deadlift', 3, S.floor),
    item('barbell-bent-over-row', 3, S.floor, { note: 'Replaces Machine Seated Row.' }),
    item('barbell-curl', 3, S.floor),
    item('pull-up', 3, S.pullup),
    item('single-arm-landmine-press', 3, S.landmine),
    item('dumbbell-lateral-raise', 3, S.db),
  ] },
  { id: 'hist-ct-home', group: 'From your history: home', name: 'Chest & Triceps (Home)', items: [
    ...BANDS,
    item('barbell-bench-press', 3, S.bench),
    item('barbell-incline-bench-press', 3, S.incline, { note: 'Replaces DB incline (dumbbells too light).' }),
    item('barbell-lying-tricep-extension', 3, S.incline, { note: 'Replaces EZ bar extension.' }),
    item('tricep-dip', 3, S.dips, { note: 'Replaces rope pushdown.' }),
    item('hanging-straight-leg-hip-raise', 3, S.pullup),
    item('dumbbell-fly', 3, S.db),
    item('dumbbell-shoulder-press', 3, S.db),
  ] },
  { id: 'hist-ppl-home', group: 'From your history: home', name: 'PPL Push (Home)', items: [
    ...BANDS,
    item('barbell-bench-press', 3, S.bench),
    item('barbell-close-grip-incline-bench-press', 3, S.incline),
    item('barbell-incline-bench-press', 3, S.incline, { note: 'Replaces DB incline.' }),
    item('barbell-lying-tricep-extension', 3, S.incline),
    item('tricep-dip', 3, S.dips),
    item('dumbbell-fly', 3, S.db, { note: 'Replaces Cable Standing Fly.' }),
  ] },

  // Historical routines, gym versions (as logged)
  { id: 'hist-lcs-gym', group: 'From your history: gym', name: 'Legs & Chest & Shoulders (Gym)', items: [
    item('barbell-squat', 3, S.gym), item('barbell-standing-calf-raise', 3, S.gym), item('barbell-bench-press', 3, S.gym),
    item('single-arm-landmine-press', 3, S.gym), item('machine-seated-row', 3, S.gym), item('landmine-twist', 3, S.gym),
  ] },
  { id: 'hist-bs-gym', group: 'From your history: gym', name: 'Back & Shoulders (Gym)', items: [
    item('barbell-deadlift', 3, S.gym), item('pull-up', 3, S.gym), item('dumbbell-lateral-raise', 3, S.gym),
    item('machine-seated-row', 3, S.gym), item('barbell-curl', 3, S.gym), item('single-arm-landmine-press', 3, S.gym),
  ] },
  { id: 'hist-ct-gym', group: 'From your history: gym', name: 'Chest & Triceps (Gym)', items: [
    item('barbell-bench-press', 3, S.gym), item('dumbbell-incline-bench-press', 3, S.gym), item('dumbbell-shoulder-press', 3, S.gym),
    item('dumbbell-fly', 3, S.gym), item('ez-bar-lying-tricep-extension', 3, S.gym), item('cable-tricep-pushdown-rope', 3, S.gym),
    item('hanging-straight-leg-hip-raise', 3, S.gym),
  ] },
  { id: 'hist-ppl-gym', group: 'From your history: gym', name: 'PPL Push (Gym)', items: [
    item('barbell-bench-press', 3, S.gym), item('barbell-close-grip-incline-bench-press', 3, S.gym), item('barbell-lying-tricep-extension', 3, S.gym),
    item('tricep-dip', 3, S.gym), item('cable-standing-fly', 3, S.gym), item('dumbbell-incline-bench-press', 3, S.gym),
  ] },
];

export const STATIONS = Object.values(S);
