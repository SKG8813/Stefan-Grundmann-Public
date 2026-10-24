# REP roadmap

Planned work, not built yet. Read this before changing REP.

## Public version: injury modes behind a setting

For the public version of REP, everything specific to the owner's shoulder injury must sit behind a setting that each user can turn on or off. Offer it for several common injuries, not just the shoulder.

- **Settings:** an "Injury / rehab" section where users switch modes on and off independently. Examples: shoulder, lower back, knee, elbow and wrist.
- **Default:** all modes off for new users. The owner's own phone keeps shoulder mode on.
- **Behaviour that each mode should switch on for the joints it covers:**
  - flag button on sets (today the shoulder flag)
  - next-session weight drop and progression pause after a flag
  - slower progression on lifts that load that joint (today: 3 clean sessions instead of 2)
  - lower restart percentage after a long break (today: 60% for shoulder lifts)
  - injury-specific tips on the How to screen
  - the injury-date marker and pre-injury-best comparison on progress charts, with a date per mode
  - the "check with your physio" escalation after repeated flags
  - coach lines that respect the flag
- **Code changes:**
  - Each exercise needs a list of the joints it loads, replacing the single `shoulder` flag in `js/data.js`.
  - The How to shoulder tips in `js/howto.js` become tips per joint.
- **Text:** no wording in the app should assume the user has an injury unless a mode is on.
- **Also for the public version:** a first-run setup covering goal, equipment and injuries. The Claude review prompt in `js/logic.js` must stop hard-coding the owner's home-gym equipment.
