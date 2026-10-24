// Post-workout coach: a cheeky one-liner picked from what actually happened.
// Ribbing is about effort and choices, never about the body or the injury.

const LINES = {
  pr: [
    'New personal record. Somewhere a plate just filed a complaint.',
    'PR! Screenshot this before you get humble about it.',
    'That\'s a record. The barbell would like a word with its lawyer.',
    'New best. Go flex in a reflective surface, you\'ve earned it.',
  ],
  pain: [
    'Shoulder spoke, you listened. Annoyingly mature. Lighter next time, then we go again.',
    'You flagged the shoulder instead of being a hero. Smart. Boring, but smart.',
    'Shoulder grumbled, so we back off a bit next time. The ego can sulk; the joint gets a vote.',
  ],
  skipped: [
    'Half a workout is still a workout. Barely. The other half says hi.',
    'Bold of you to call this finished. The unticked sets are writing a strongly worded letter.',
    'You left sets on the table. They\'re still there. Waiting. Judging.',
  ],
  long: [
    'That took longer than a Marvel movie. Less phone between sets, more lifting.',
    'Over time again. Were the rest periods or the group chat doing the heavy lifting?',
    'Solid work, slow clock. Trim the scrolling and you\'re out in 45.',
  ],
  sandbag: [
    'Lots of reps left in the tank. The tank called: it wants to be emptied.',
    'That looked comfortable. Comfort doesn\'t build chests. Add weight or reps next time.',
    'You were saving energy for what, exactly? Next session, take a couple of sets closer to the edge.',
  ],
  war: [
    'Several sets to absolute zero. Respect. Now eat something and go lie down.',
    'You went to war with those sets. Protein and sleep are the peace treaty.',
  ],
  quick: [
    'In and out under 35 minutes. Efficient. Suspiciously efficient.',
    'Speedrun complete. Make sure the rests were rests and not skipped.',
  ],
  up: [
    'More total work than last time. The trend line is getting cocky, and so should you.',
    'Volume up on last time. That\'s how chests get built: boringly, steadily, relentlessly.',
  ],
  solid: [
    'Workout done. Not legendary, not tragic. Exactly how progress actually looks.',
    'Logged and finished. Future you is slightly bigger and mildly grateful.',
    'Done. Go hit your protein before you start telling people about it.',
    'Another one in the bank. Consistency is the cheat code nobody wants to hear about.',
  ],
};

const pick = (arr, seed) => {
  let x = 0;
  for (const c of String(seed)) x = (x * 31 + c.charCodeAt(0)) >>> 0;
  return arr[x % arr.length];
};

// ctx: { sets, planned, minutes, prs, pains, rirAvg, rirZeros, volumeDelta, seed }
export function coachLine(ctx) {
  const { sets = 0, planned = 0, minutes = null, prs = 0, pains = 0, rirAvg = null, rirZeros = 0, volumeDelta = null, seed = '' } = ctx;
  let kind = 'solid';
  if (pains) kind = 'pain';
  else if (planned && sets < planned * 0.7) kind = 'skipped';
  else if (prs) kind = 'pr';
  else if (minutes != null && minutes > 50) kind = 'long';
  else if (rirZeros >= 3) kind = 'war';
  else if (rirAvg != null && rirAvg >= 3) kind = 'sandbag';
  else if (minutes != null && minutes < 35 && sets >= 10) kind = 'quick';
  else if (volumeDelta != null && volumeDelta >= 5) kind = 'up';
  return { kind, text: pick(LINES[kind], seed) };
}
