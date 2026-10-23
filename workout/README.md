# Lift Log

An offline iPhone web app for tracking lifts, with progression nudges, a shoulder-rehab mode and a research-based rest timer. It has no server and no account. Your data stays in the browser on your phone.

## Features

- **Routines.** A 4-day home Push/Pull split built for muscle growth, plus home and gym versions of the routines from your Caliber history. Each day is ordered so the rack only changes when it has to, and the app shows a "Setup change" banner at each change. You can create, copy, edit and reorder routines.
- **Logging.** Each set is pre-filled with the suggested weight and reps, so one tap on ✓ logs it. Each set also has an optional "reps left in tank" (RIR) rating. Extras: warm-up set generator, plate calculator, exercise swap, and notes per exercise and per workout. The screen stays awake during a workout, and an unfinished workout resumes after the app is closed.
- **Progression nudge.**
  - Barbell lifts suggest +5 lb after 2 sessions in a row where every set hits the top of the rep range. Shoulder-loading lifts need 3 in rehab mode.
  - Dumbbell lifts move up to the next dumbbell you own. At your heaviest dumbbell, they progress by an extra set or a slower tempo.
  - The app also flags stalled lifts, suggests a lighter restart weight after a long break, and gives deload reminders.
- **🤕 Shoulder button.** It flags the set and lowers the next session's weight by about 10%. Progression pauses until you have a pain-free session. If a lift is flagged twice in a row, the app suggests checking with your physio.
- **Rest timer.** It starts when you tick a set. Defaults: 2–3 minutes for compound lifts, 60–90 seconds for isolation lifts and 30 seconds for band work. It adds 30 seconds after missed reps, a set with 0 reps left in the tank, or a shoulder flag. It beeps, vibrates where the device supports it, and flashes when rest is over.
- **Progress.** A coach summary, weekly sets per muscle against the 10–20 set range, a chart per exercise showing your injury date and pre-injury best, personal records and workout history.
- **Body.** A bodyweight log with a 7-day average, and a simple cardio log.
- **Optional Claude review.** This sends your last 8 weeks of training to Anthropic using an API key you enter in Settings. The key is stored only on your device.
- **Import.** You can import Caliber strength and cardio CSV exports. The import fixes cardio durations that were exported 60 times too large.

## Use it on iPhone

1. Publish it with GitHub Pages: repo **Settings → Pages → Deploy from a branch → `main` / `(root)`**. The app will be at `https://<user>.github.io/<repo>/workout/`.
2. Open that URL in Safari, tap **Share → Add to Home Screen**, then open the app from the home-screen icon.
3. In **Settings**, import your Caliber CSVs and set your injury date. Then tap **Export backup** now and then, because clearing Safari's website data deletes everything.

## Privacy

- The repo contains only app code. No workout history or health details are committed.
- Data lives in `localStorage` on your device. Backups exclude the API key.
- The Claude review is off unless you add an API key. When you use it, your training data is sent to Anthropic. Use a dedicated key with a low spending limit.

## Development

No build step. Serve the folder (e.g. `npx http-server workout`) and open it in a browser. Run the logic tests with:

```
cd workout && npm test
```

When you change any app file, bump `VERSION` in `sw.js` so phones pick up the new version.

Rest and progression defaults are general, research-based guidance (Schoenfeld et al. 2016; Grgic et al. 2017; ACSM 2009), not medical advice.
