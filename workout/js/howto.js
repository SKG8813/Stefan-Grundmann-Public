// Short form cues per exercise. `shoulder` is an extra tip for shoulder rehab.
export const HOWTO = {
  'band-external-rotation': {
    steps: ['Anchor the band at elbow height; stand side-on with the band in the far hand.', 'Elbow bent 90°, tucked to your side (a rolled towel under the arm helps).', 'Rotate the forearm outward like a gate opening, keeping the elbow pinned.', 'Return slowly over 2–3 seconds.'],
    shoulder: 'Light band only. You should feel the back of the shoulder working, never a pinch.',
  },
  'band-internal-rotation': {
    steps: ['Anchor the band at elbow height; stand side-on with the band in the near hand.', 'Elbow bent 90° and tucked to your side.', 'Rotate the forearm in across your stomach, elbow stays put.', 'Return slowly.'],
    shoulder: 'Keep the range pain-free; small and controlled beats big.',
  },
  'band-pull-apart': {
    steps: ['Hold the band at shoulder height, arms straight, hands shoulder-width.', 'Pull the band apart until it touches your chest, squeezing shoulder blades together.', 'Keep ribs down; don\'t shrug.', 'Return slowly.'],
    shoulder: 'Use a wider grip or lighter band if the front of the shoulder complains.',
  },
  'band-face-pull': {
    steps: ['Anchor the band at face height. Grab it with palms facing down.', 'Pull toward your forehead, elbows high and wide.', 'Finish with hands beside your ears, rotating the fists back.', 'Pause, then return slowly.'],
    shoulder: 'Great rehab exercise for the back of the shoulder. Keep the movement smooth.',
  },
  'barbell-bench-press': {
    steps: ['Eyes under the bar, feet flat, shoulder blades pinched back and down.', 'Grip slightly wider than shoulders; unrack with straight arms.', 'Lower to the lower chest with elbows about 45–60° from your body.', 'Press up and slightly back toward your face.'],
    shoulder: 'Keep elbows tucked (not flared to 90°), and stop just short of the chest if the bottom hurts. Always use the rack safeties.',
  },
  'barbell-incline-bench-press': {
    steps: ['Bench at 30–45°. Shoulder blades back and down.', 'Unrack and hold the bar over your upper chest.', 'Lower to the upper chest, just below the collarbones.', 'Press straight up.'],
    shoulder: 'A lower incline (30°) is usually easier on the shoulder than 45°.',
  },
  'barbell-close-grip-bench-press': {
    steps: ['Grip about shoulder-width (not narrower: it hurts wrists).', 'Elbows stay close to your sides as you lower.', 'Touch the lower chest.', 'Press up by straightening the elbows hard. This targets the triceps.'],
    shoulder: 'Tucked elbows make this one of the more shoulder-friendly presses.',
  },
  'barbell-close-grip-incline-bench-press': {
    steps: ['Bench at 30°, shoulder-width grip.', 'Elbows tucked close as you lower to the upper chest.', 'Press up, focusing on the triceps.'],
    shoulder: 'Stop the descent where the shoulder still feels good.',
  },
  'barbell-squat': {
    steps: ['Bar on the upper back (not the neck); hands just outside shoulders.', 'Feet shoulder-width, toes slightly out. Brace your core like you\'re about to be punched.', 'Sit down and back, knees tracking over toes, to at least thighs parallel.', 'Drive up through the whole foot, chest up.'],
    shoulder: 'If holding the bar hurts the shoulder, widen your grip or use the landmine squat instead.',
  },
  'barbell-deadlift': {
    steps: ['Bar over mid-foot, feet hip-width. Grip just outside the legs.', 'Hips down, chest up, back flat. Pull the slack out of the bar.', 'Push the floor away; bar drags up your legs.', 'Stand tall, then lower the same path, hips back first.'],
    shoulder: 'Arms just hang like hooks. Keep shoulders packed down, not shrugged.',
  },
  'barbell-romanian-deadlift': {
    steps: ['Stand tall holding the bar, soft knees.', 'Push your hips back, bar sliding down the thighs, back flat.', 'Stop when you feel a strong hamstring stretch (usually just below the knees).', 'Squeeze glutes to stand up.'],
    shoulder: 'Keep the bar close and shoulders pulled back; no rounding forward.',
  },
  'barbell-bent-over-row': {
    steps: ['Hinge forward to about 45°, back flat, knees soft.', 'Grip just outside shoulder-width.', 'Pull the bar to your belly button, elbows back.', 'Squeeze shoulder blades, then lower under control.'],
    shoulder: 'Avoid jerking the weight; a slightly narrower, palms-up grip can feel better.',
  },
  'barbell-shrug': {
    steps: ['Hold the bar at arm\'s length, shoulder-width grip.', 'Lift your shoulders straight up toward your ears.', 'Pause 1 second at the top.', 'Lower slowly. No rolling.'],
    shoulder: 'Straight up and down only.',
  },
  'barbell-curl': {
    steps: ['Stand tall, shoulder-width underhand grip.', 'Elbows pinned to your sides.', 'Curl the bar up without swinging your body.', 'Lower slowly over 2–3 seconds.'],
    shoulder: 'Don\'t let elbows drift forward at the top.',
  },
  'barbell-lying-tricep-extension': {
    steps: ['Lie on the bench, bar held over your forehead with a narrow grip.', 'Keep upper arms still and angled slightly back.', 'Bend only at the elbows to lower the bar toward your forehead or just behind.', 'Straighten the arms to lift.'],
    shoulder: 'Go light and keep it smooth. If the shoulder complains, swap for dips or close-grip bench.',
  },
  'barbell-standing-calf-raise': {
    steps: ['Bar on your back as for squats; balls of feet on a plate for extra range.', 'Rise as high as possible onto your toes.', 'Pause at the top, then lower slowly into a full stretch.'],
    shoulder: '',
  },
  'barbell-overhead-press': {
    steps: ['Bar on the front of the shoulders, grip just outside shoulders.', 'Squeeze glutes, brace core.', 'Press straight up, moving your head back then through once the bar passes.', 'Lower to the shoulders.'],
    shoulder: 'Hardest press on a healing shoulder. The landmine press is the safer choice for now.',
  },
  'inverted-row': {
    steps: ['Set the bar in the rack at hip height. Lie under it and grab it.', 'Body straight from heels to head.', 'Pull your chest to the bar, squeezing shoulder blades.', 'Lower slowly. Bend your knees to make it easier.'],
    shoulder: 'Very shoulder-friendly rowing option.',
  },
  'single-arm-landmine-press': {
    steps: ['Bar end in the landmine; hold the other end at shoulder height in one hand.', 'Stagger your stance, brace core.', 'Press up and forward until the arm is straight.', 'Lower slowly back to the shoulder.'],
    shoulder: 'The angled path is one of the best overhead options while rehabbing.',
  },
  'landmine-row': {
    steps: ['Straddle the bar facing the landmine, hinge forward with a flat back.', 'Grab the bar under the plates (or with a V-handle).', 'Row it to your stomach, elbows back.', 'Lower under control.'],
    shoulder: '',
  },
  'landmine-squat': {
    steps: ['Hold the bar end at your chest with both hands.', 'Lean slightly into the bar, feet shoulder-width.', 'Squat down, chest up, knees over toes.', 'Drive back up.'],
    shoulder: 'No bar on your back, so it\'s easy on the shoulders.',
  },
  'landmine-twist': {
    steps: ['Hold the bar end at arm\'s length in front of your chest.', 'Rotate the bar down to one hip, pivoting your back foot.', 'Swing it back over the top to the other hip.', 'Arms stay fairly straight; the core does the work.'],
    shoulder: 'Keep it slow and light.',
  },
  'dumbbell-lateral-raise': {
    steps: ['Stand tall, dumbbells at your sides, slight bend in elbows.', 'Raise the arms out to the sides to shoulder height, leading with the elbows.', 'Thumbs level or slightly up.', 'Lower slowly over 2–3 seconds.'],
    shoulder: 'Raise slightly forward of straight sideways (the "scapular plane"); stop at shoulder height.',
  },
  'dumbbell-rear-delt-fly': {
    steps: ['Hinge forward until your chest is almost parallel to the floor.', 'Dumbbells hanging, slight bend in elbows.', 'Raise the arms out to the sides, squeezing the back of the shoulders.', 'Lower slowly.'],
    shoulder: 'Excellent for shoulder health. Light weight, strict form.',
  },
  'dumbbell-fly': {
    steps: ['Lie on the bench, dumbbells over your chest, palms facing.', 'Slight bend in the elbows, locked in place.', 'Open the arms wide until you feel a chest stretch.', 'Hug the weights back up.'],
    shoulder: 'Stop the stretch at chest level; don\'t let the arms drop below the bench.',
  },
  'dumbbell-hammer-curl': {
    steps: ['Stand tall, palms facing your thighs.', 'Elbows pinned to your sides.', 'Curl up keeping palms facing each other.', 'Lower slowly.'],
    shoulder: '',
  },
  'dumbbell-shoulder-press': {
    steps: ['Sit on the bench (upright or slight incline), dumbbells at shoulder height.', 'Palms facing forward or each other.', 'Press up until arms are straight.', 'Lower slowly to shoulder height.'],
    shoulder: 'Palms facing each other and elbows slightly forward is the gentlest version.',
  },
  'dumbbell-incline-bench-press': {
    steps: ['Bench at 30°, dumbbells at the sides of your upper chest.', 'Press up and slightly together.', 'Lower slowly until you feel a chest stretch.'],
    shoulder: 'Palms turned slightly in is easier on the shoulder.',
  },
  'pull-up': {
    steps: ['Hang with an overhand grip slightly wider than shoulders.', 'Pull your shoulder blades down first.', 'Pull until your chin is over the bar.', 'Lower all the way, under control.'],
    shoulder: 'Start from a controlled hang, not a jerk. A band under your knees helps if reps are low.',
  },
  'chin-up': {
    steps: ['Hang with an underhand grip, shoulder-width.', 'Pull your chest toward the bar, elbows down to your sides.', 'Chin over the bar.', 'Lower slowly.'],
    shoulder: 'Often easier on the shoulder than wide pull-ups.',
  },
  'tricep-dip': {
    steps: ['Support yourself on the dip bars, arms straight.', 'Lean slightly forward, elbows pointing back.', 'Lower until upper arms are about parallel to the floor.', 'Press back up.'],
    shoulder: 'Dips stress the front of the shoulder. Stop at parallel or higher, and skip them on days the shoulder is sore.',
  },
  'hanging-straight-leg-hip-raise': {
    steps: ['Hang from the pull-up bar or arms in the ab straps.', 'Keeping legs straight, raise them to hip height or higher.', 'Curl the pelvis up at the top.', 'Lower slowly with no swinging.'],
    shoulder: 'Ab straps take the strain off your grip and shoulder. Use bent knees to make it easier.',
  },
  'machine-seated-row': {
    steps: ['Chest against the pad, grip the handles.', 'Pull the handles to your stomach, elbows back.', 'Squeeze shoulder blades.', 'Return slowly with a full stretch.'],
    shoulder: '',
  },
  'cable-standing-fly': {
    steps: ['Cables at shoulder height, step forward into a split stance.', 'Slight bend in elbows.', 'Bring the hands together in front of your chest.', 'Return slowly to a chest stretch.'],
    shoulder: 'Don\'t let the hands drift behind your body at the stretch.',
  },
  'cable-tricep-pushdown-rope': {
    steps: ['Rope on a high cable. Elbows pinned to your sides.', 'Push down until arms are straight, spreading the rope at the bottom.', 'Return until forearms are just above parallel.'],
    shoulder: '',
  },
  'cable-bent-over-tricep-extension-rope': {
    steps: ['Face away from a high cable, rope held behind your head.', 'Lean forward slightly, elbows pointing forward.', 'Straighten the arms forward.', 'Return slowly.'],
    shoulder: 'Overhead triceps work can pinch a healing shoulder; go light.',
  },
  'cable-bent-over-tricep-extension': {
    steps: ['Face away from a high cable, handle held behind your head.', 'Elbows pointing forward.', 'Straighten the arms forward.', 'Return slowly.'],
    shoulder: 'Go light while rehabbing.',
  },
  'ez-bar-lying-tricep-extension': {
    steps: ['Lie on the bench, EZ bar over your forehead.', 'Upper arms still, slightly angled back.', 'Bend at the elbows to lower toward your forehead.', 'Straighten to lift.'],
    shoulder: 'Keep it smooth and light.',
  },
  'hex-bar-deadlift': {
    steps: ['Stand inside the trap bar, handles at your sides.', 'Hips down, chest up, back flat.', 'Push the floor away until standing tall.', 'Lower with control.'],
    shoulder: 'Neutral grip is easy on the shoulders.',
  },
};

export const videoURL = (name) => `https://www.youtube.com/results?search_query=${encodeURIComponent(`${name} proper form`)}`;
