'use strict';
/* Version + what's new, iCloud/Files backups, watch reminder, muscle diagrams. */

const APP_VERSION = '7.7';
const CHANGELOG = [
  ['7.7', ['🔥 Day streak next to the logo: train or hit your protein goal to keep it lit. Tap it for your best streak and the last 5 weeks.', '👀 A small “Yesterday” line under the greeting: calories, protein, workout and last night’s sleep at a glance.', '🏆 Trophy wall (Progress → Lifts): every PR you’ve hit, newest first, with a shareable PR card.', '🔮 PR predictions: when you’ll hit the next round number on each lift at your current pace.', '📅 Monthly wrap: a story-style look back at your month you can share.', '🔊 Sounds for sets, PRs, finished workouts and quick adds. Quiet on silent, still plays in earbuds, never pauses your music. Turn them off in You → Appearance.', '✨ Smoother screens: tabs slide in the direction you tap, and numbers and rings glide to their new values.', '🏋️ Lateral Raise is now called Dumbbell Lateral Raise. Your past sets came with it.']],
  ['7.6', ['✨ New opening animation: the Liftprint mark draws itself in with a few twinkling stars, then flies into the logo. It only plays while the app is loading and never blocks a tap.', '🔥 New logo in the top left: the fingerprint-and-dumbbell mark from the app icon next to the wordmark. Tap it for a little surprise.']],
  ['7.5', ['The version number now sits quietly at the bottom of every screen.']],
  ['7.4', ['😴 Naps: log as many as you like from Today (under Readiness) or your check-in, or start a nap timer and tap “I’m up” when you wake.', '📈 Naps lift today’s readiness realistically. Short naps help the most per minute, a ~90-min full cycle helps most overall, a nap can make up at most ~60% of a short night, and the lift fades 6–10 hours later.', 'The nap screen shows your readiness before → after while you set it up.']],
  ['7.3', ['👈 Swipe left on a food to delete it, like any iPhone list. Swipe a little to show Delete, or all the way to delete straight away.', '🗑️ In Add food → Your foods, deleting removes it from your list and usuals. Your past logs stay, and it comes back if you ever log it again.', '🍽️ Swipe left on anything in the day\'s food to remove it, or hold a usual and pick Delete from your foods.']],
  ['7.2', ['🍽️ Food tab rebuilt and cleaned up.', '⭐ Your usuals: anything you eat on 2+ days shows up as a one-tap tile, same amount as last time. Hold a tile to change the amount, pin it or hide it.', '📌 Pin your daily staples (shakes, snacks) and add them all with one tap.', '➕ One Add food button: search everything you\'ve ever logged, or scan, enter, build a meal or copy yesterday. It stays open so you can add several things in a row.', '🕐 The day\'s food is grouped into morning, afternoon, evening and late night.', '🔥 Calories burned now sits inside the summary card.']],
  ['7.1', ['✅ Fixed: checkboxes now show a clear tick. Copy yesterday starts with everything ticked, so just untick what you didn\'t eat again. The button shows how many foods and calories you\'re adding.', '🍽️ Protein ideas moved below your food list and fold up until you need them.']],
  ['7.0', ['💪 New Forearms section: wrist curls (dumbbell, reverse and barbell), reverse curls, dead hangs and plate pinches, each with its own animation and guide.', '🔥 New ready-made day: Shoulders, Forearms & Core. Add it from Train → + Add a workout day.', '🏋️ More shoulder and core moves: Arnold press, front raise, upright row, crunches, lying leg raises, Russian twists and ab wheel rollouts.', '🔥 Calories burned: on the Food tab, enter any day\'s total from your watch and see it split into workouts, other movement (walking around) and resting, plus your surplus or deficit. Works for past days too.']],
  ['6.9', ['✨ Smart pick tags exercises that hit a sore muscle, trims their sets when it makes sense, and says why.', '🔋 Readiness no longer punishes you for being new: training load stays neutral until the app has about 2 weeks of your history.']],
  ['6.8', ['🔋 Readiness now weighs each sore muscle by its size and how sore it is. A bit of sore biceps nudges the score, very sore legs drop it a lot, and the tip tells you what to go easy on.', '📊 The check-in shows a live breakdown (sleep, soreness, energy, training load) that updates as you tap.']],
  ['6.7', ['🩹 Check-in now lets you mark exactly where you\'re sore (chest, triceps, quads, and so on) and how much, shown on the body diagram. Sore muscles count as less recovered, so Smart pick steers around them.', '😴 Enter any amount of sleep with the slider or +/− in 15-minute steps.']],
  ['6.6', ['🔗 Cable rows, Pallof presses and woodchops now show the handle you hold.']],
  ['6.5', ['📰 The update pop-up now shows just the latest few changes. Everything else is under You → What\'s new.']],
  ['6.4', ['🌙 Overnight polish: smoother dunk simulator, a cleaner animation for nearly every exercise (real machines, benches, racks, grips), a fully working light theme, ringed Food summary, live workout strip, lift trend lines, and lots of small fixes.', '🎬 Exercise info now opens with the animation first.', '🦵 Leg curl and extension machines have handles to hold.']],
  ['6.3', ['⏱️ Workouts show a live strip at the top: time, volume and sets done out of planned, with a progress bar.', '📏 Dunk simulator works in centimetres for metric users.']],
  ['6.2', ['☀️ Light theme fixed everywhere: pop-up sheets, selected chips, badges and hints are all readable now.', '📈 Each lift in Progress shows a mini trend line of your estimated 1RM.', '🦋 Pec deck animation now uses real swinging machine arms.']],
  ['6.1', ['🍽️ Food tab shows calories and protein as rings, with carbs and fat underneath.', '🧹 Long lists (weigh-ins, lift history, milestones) are trimmed with a “Show all”.', '⚡ Faster Today screen.', '🔔 Pop-up messages no longer cover the Finish button or wrap into tall boxes.', '📏 New users can enter their height during setup.']],
  ['6.0', ['🎬 Exercise animations polished: palms-up grip on curls, a real dip station and pull-up rig, leg press frame, solid plyo box, back-extension foot pads, low-to-high cable fly, single dumbbell for overhead extensions, ropes on rope exercises, decline sit-ups hooked in properly, and more.']],
  ['5.9', ['🏀 Dunk simulator rebuilt: a run-up, a two-foot takeoff from farther out, a real slam (ball through the net, rim flex), a court floor and a camera that follows the jump.']],
  ['5.8', ['🏀 Dunk simulator (Progress → Athlete): a figure your height jumps at a 10′ rim (or your goal rim). Slide your vertical to see where you touch, how far you are from a dunk, and how much vert you need. Your height and reach are saved.', '✨ Exercise animations load the detailed figure straight away (no more flash of the simple one).']],
  ['5.7', ['✅ Mark a day as trained without the details: pick the muscles (or split day) and it counts as a gym day, and recovery and Smart pick know those muscles are worked.']],
  ['5.6', ['🗓️ Log a workout for a past day: tap the day in Train → History, or use “Log a past workout” under “Pick a different workout”. Sets count on that date for your calendar, streaks and PRs.']],
  ['5.5', ['✊ Animated figures now close their hands around dumbbells, bars and handles.', '🏋️ Equipment shows up where it belongs: Smith machine, squat rack, bench uprights, incline bench for incline curls, preacher pad, chest-supported row bench, one-arm dumbbell row on a bench, T-bar, hack squat, leg extension/curl pads, seat pads, calf blocks, rope attachments, cable lateral raises and machine arms.']],
  ['5.4', ['🛠️ Dumbbells (and cable handles) in the exercise animations now turn with your hands, so hammer curls, presses, raises and rows hold them the right way.']],
  ['5.3', ['🛠️ Closing an exercise\'s info (ⓘ) now takes you back to where you were, like the day editor, instead of closing everything.']],
  ['5.2', ['🛠️ Fixed the dunk progress buttons running off the screen.']],
  ['5.1', ['➕ Add a workout day from the + at the top of Train: pick Chest & Triceps, Back & Biceps, Legs, Shoulders & Arms, Push, Pull, Upper, Lower, Full Body or a blank day.', '👆 Tap any day in your split to edit it.']],
  ['5.0', ['🧭 New layout: Today · Train · Food · Progress · You. Lifts, weight, photos, body and athlete stats now live together under Progress, and settings moved to You.', '🔍 Search everything from the magnifier at the top: exercises, foods, workouts and settings.', '🔋 Readiness score from a 10-second check-in (sleep, soreness, energy) plus your recent training load, with recovery per muscle.', '✨ Smart pick: Train suggests today\'s workout based on which muscles are recovered, and lightens it on low-readiness days.', '🧮 Plate & warm-up calculator for barbell and Smith lifts, with one-tap warm-up sets.', '🏁 New workout summary with volume vs last time, PRs, muscles worked and a shareable image.', '🏀 12-week dunk program: two jump sessions a week across Foundation, Power and Peak blocks, with vertical tests.', '🧘 Follow-along mobility routines with a timer and beeps.', '✅ Habits with streaks. Some check themselves off (sleep, protein, stretching).', '🍽️ Save meals and recipes (split into servings) and log them in one tap.', '📊 Macro trends: calories by protein, carbs and fat, plus where your calories come from.', '🎨 Themes: dark, true black or light, plus 6 accent colours (You → Appearance).']],
  ['4.2', ['💪 New exercises: Smith Bench Press, Rope Pushdown, Overhead Rope Extension and Low-to-High Cable Fly.', '📋 Ready-made Chest & Triceps day: Train → split → “Or add a ready-made day”.']],
  ['4.1', ['🕒 Progress photos now show the date and time they were taken, read straight from the photo. You can fix it in the photo viewer if it\'s off.']],
  ['4.0', ['🧮 Calorie coach: compares what you eat to what the scale does, estimates what you really burn, and suggests a new target in one tap.', '⚖️ True weight trend: a smoothed line that ignores water swings, plus weekly averages.', '📸 Photo compare now has a drag slider and a fade between two dates.', '🔥 Muscles this week: a heatmap of sets per muscle on the body diagram, flagging anything you skipped.', '⚠️ Pain flags: mark an exercise that hurts and get a warning plus a swap idea every time it comes up.', '🔋 Lighter-week nudge after many hard weeks in a row with stalled lifts.', '🗓️ Weekly recap with PRs, goal work, weight, protein and dunk progress. Share it as an image.', '🏅 Milestones: 24 badges with confetti when you unlock one.', '📄 Export your sets, weigh-ins, food and activities as CSV spreadsheets (Settings → Backup).']],
  ['3.9', ['🎥 Test your vertical from a video: mark takeoff and landing, and the app works out your jump height from your air time.', '📈 Dunk countdown: how many weeks until you dunk your goal at your current pace, plus your touch height from your standing reach.', '🏋️ Strength levels: see where your squat, bench, deadlift, press and row rank for your bodyweight.', '▥ Scan barcodes for instant nutrition facts, “Hit your protein” suggestions built from your foods, and Copy from yesterday.', '🎙️ “Hey Siri, log my weight”: set it up in Settings → Alerts.']],
  ['3.8.4', ['Figures refined: a more natural fit male build, a slimmer female with narrower shoulders and natural hips, and plain single-colour bodies with no painted clothing.']],
  ['3.8.3', ['Figures: shoulders brought back to realistic widths, and proper athletic wear (fitted shorts, and a sports bra with straps) in a softer tone instead of black bands.']],
  ['3.8.2', ['Figures reshaped again: the male has wider shoulders, a fuller chest, defined abs and a stronger V-taper; the female has a clear hourglass with a narrower waist.', 'Chests are now plain smooth surfaces.']],
  ['3.8.1', ['More athletic figures: the male has a bigger chest, shoulders, arms, lats and legs with a stronger V-taper; the female has stronger legs, glutes and shoulders with a toned core.']],
  ['3.8', ['All-new exercise figures: realistic, detailed 3D male and female athletes (over 26,000 polygons each) with real anatomy, hands, feet and faces, replacing the simple mannequin.', 'Working muscles light up precisely: quads vs hamstrings, chest vs back, calves, glutes, abs and lower back are all separate now.', 'Hands sit flat on the floor in push-ups and planks, and bars and dumbbells sit in the palm.']],
  ['3.7.2', ['Animated figures: one smooth, continuous body. The odd lumps, creases and patchy shading are gone.']],
  ['3.7.1', ['Animated figures reshaped to look like real athletic bodies: seamless limbs with natural muscle shape, rounded shoulders, a V-taper on the male and an hourglass on the female. No more jointed-doll look.', 'Chest exercises now light up the chest itself.']],
  ['3.7', ['Sports & cardio: log runs, basketball, football, pickleball, martial arts and 30+ other activities in the Train tab. Scan the summary from your watch or type it in.', 'Each activity saves time, distance and pace, calories, heart rate and effort.', 'Activity days count toward your weekly goal, streak and calendar, and sessions count toward the goals they train.']],
  ['3.6.1', ['Cleaner animated figures: a smooth, understated torso with no exaggerated muscle lines.']],
  ['3.6', ['The animated figure now has realistic adult proportions, with a male and a female build. Switch with the Male / Female buttons on the animation (it starts on your Settings choice).', 'Muscle highlights are more specific: chest, upper back, abs, glutes and shoulders light up separately.', 'Fixed feet pointing the wrong way when they are off the floor (Bulgarian Split Squat bench foot, kneeling crunch, Dead Bug).']],
  ['3.5', ['Exercise animations redrawn in true 3D: smooth shading, no hard outlines, and limbs now overlap correctly instead of popping in front of each other.', 'Fixed the Bulgarian Split Squat back leg, plus smaller joint glitches in push-ups, sit-ups, pulldowns and leg raises.']],
  ['3.4', ['Log food in cups, tablespoons, teaspoons, fl oz, oz or lb, with one-tap fractions (¼, ⅓, ½, ⅔, ¾, 1½).', 'Label in grams but you used a spoon? Add what the serving "also equals" (like 2 tbsp) and log in either. Scanning a label fills this in when the label shows both.', 'The app converts between cups, spoons, ml and fl oz, and between g, oz and lb.']],
  ['3.3', ['Animated 3D demos: tap the ⓘ on any exercise to watch a figure do the movement, with the working muscles lit up and three form tips. Drag to turn it around.', 'Starter programs: the app can now build a split from your goals, gym days and equipment. Find it in Train, or at the end of setup.', 'Skill trackers in Lifts: mile time, max pull-ups, vertical jump, plank hold and more, with personal bests.', 'Backups now include your progress photos, and you can back up in one tap right after a workout.', 'Reorder exercises mid-workout (⋯ menu), the Log button shows which set you\'re on, and Settings is grouped into sections.']],
  ['3.2', ['Finished exercises lock in your workout so you can\'t log into them by accident. Tap ✎ Edit to reopen one.', 'Fix past workouts: open any workout and tap a set to change it, or add a set you forgot.', 'Watch stats: time now has separate hours, minutes and seconds boxes, and works with any smartwatch or fitness app.', 'Reinstalling? Restore a backup right from the welcome screen.', 'Cleaner Home: your goals are now one compact tile (tap it for the full breakdown), no matter how many you pick.', 'Today shows your progress (1 of 3 done), which of your goals the next workout hits, and a protein bar.', 'Reminders (weigh-in, backup, setup) shrank to one line each. Insights show the top 3, with the rest a tap away, plus a nudge when a goal has no work yet this week.']],
  ['3.1', ['New setup survey: tell Liftprint about you, your sports and what you want to get better at. Skip it anytime, redo it from Settings.', 'Pick from 40+ sports and life goals (running, soccer, climbing, posture, a healthy back, aging well and more). Exercises that help YOUR goals get a badge in workouts, the exercise list and every guide.', 'Your goals card on Home: sets you did for each goal this week. Tap one to see every exercise that helps it.', '10 new exercises: Farmer Carry, Cable Woodchop, Pallof Press, Dead Bug, Jump Squat, Lateral Bounds, Lateral Lunge, Step-up, Single-Leg RDL and Tibialis Raise.', 'The food buddy is now optional and off for new people. Yours stays on.']],
  ['3.0.1', ['Fixed: Restore from a backup did nothing after picking the file. It now shows what is in the backup, restores it, and confirms.', 'Backups now also remember your rest-alert link, so alerts keep working after a restore.']],
  ['3.0', ['New name: On Paper is now Liftprint, with a new fingerprint-and-barbell icon. Your data stays exactly where it was.', 'Tap the ⓘ next to any exercise for a guide: what it is, what it builds, real-life examples, whether it helps your dunk, your best, and the muscles worked.', 'Rewarding animations: confetti on PRs and finished workouts, sparkles on every set, numbers counting up, smooth screen transitions.', 'Feeding your pet is now a little show: the snack flies in, they munch, cheer and fill up, with confetti when you hit a goal. Pets blink now too.']],
  ['2.5', ['Added Dumbbell Standing Calf Raise and Chin-ups.', 'Bodyweight exercises (calf raises, pull-ups, dips, push-ups, lunges and more) now estimate your total load: share of bodyweight + total dumbbell weight. PRs use that total, so getting heavier counts.', 'Turn bodyweight counting on for any exercise from its ⋯ menu during a workout.']],
  ['2.4', ['Update status: the app tells you the moment a new version is live, with a one-tap Update button (also in Settings).', 'Updates now load right away instead of up to 10 minutes later.']],
  ['2.3.1', ['Added Calf Extension to the exercise list.']],
  ['2.3', ['3 sets is now the default for every exercise. Tap an exercise\'s target during a workout to change it, and it\'s remembered everywhere.', 'Rest alerts now arrive even if you jump to another app right after logging a set.', 'If iPhone closes the app in the background, it reopens right back into your workout with the rest timer still counting.']],
  ['2.2', ['Rest alerts on your lock screen and watch, even with the app closed. Set it up once in Settings (uses the free ntfy app).', 'The alert tells you which exercise is next.']],
  ['2.1', ['Watch stats on workouts: after you finish, scan your watch or fitness app summary screenshot (or type it in) to save workout type, time, active and total calories, heart rate and effort.']],
  ['2.0.2', ['Smoother buddy feeding animation.', 'Cleaner scanning messages.']],
  ['2.0.1', ['Label scanning keeps trying automatically when it\'s slow, plus a one-tap "Try again".']],
  ['2.0', ['Realistic anatomy diagrams with real muscle shapes, shading and fibers. Tap Front/Back to zoom.', 'Four new buddies: a cat, bunny, penguin and axolotl. Tap "Change pet" on the Food tab.', 'Label scanning fixed: faster, with a "Test my key" button in Settings.', 'Enter food by grams: set the serving size (like 13 g), type what you ate (like 37 g), and the calories scale automatically.', 'My Foods: tick "Save to My Foods" and the product and its serving size are remembered.', 'Workouts: sets × reps targets, smart weight suggestions from last time, +/- buttons, warm-up sets (never counted as PRs), and rest times that fit the lift.', 'Home: a Today checklist and Insights (bulk pace, strength gains, stalls, protein streaks, goal weight).', 'Dunk progress tracker on the Lifts tab.', 'Undo after deleting things.']],
  ['1.2.2', ['Slimmer, better-proportioned arms on the female diagram.', 'Tap the pencil next to your food buddy\'s name to rename them.']],
  ['1.2.1', ['Fixed the arms on the female muscle diagram.']],
  ['1.2', ['Meet Pebble, your raccoon food buddy! Log food to feed them and they\'ll say something nice. Rename or turn them off in Settings.', 'Much better muscle diagrams for both the male and female figures.']],
  ['1.1', ['Muscle diagrams for every exercise: tap the body icon next to an exercise to see what it works (male or female figure).', 'Back up to iCloud Drive from Settings, with a reminder when it has been a week.', 'Apple Watch reminder when you start a workout.', 'Version number in Settings, and this note after each update.']],
  ['1.0', ['First standalone version.']],
];
function checkVersion() {
  let seen = null; try { seen = localStorage.getItem('onpaper.version'); localStorage.setItem('onpaper.version', APP_VERSION); } catch (e) {}
  if (seen && seen !== APP_VERSION) {
    const vn = v => { const [a, b] = String(v).split('.').map(Number); return (a || 0) * 1000 + (b || 0); }, all = CHANGELOG.filter(([v]) => vn(v) > vn(seen)), notes = all.slice(0, 4);
    setTimeout(() => openSheet(`Updated to v${APP_VERSION}`, `${notes.map(([v, items]) => `<div class="field"><span class="lbl">What's new in v${v}</span><ul class="muted" style="margin:0;padding-left:18px;display:flex;flex-direction:column;gap:6px">${items.map(i => `<li>${esc(i)}</li>`).join('')}</ul></div>`).join('')}${all.length > 4 ? `<p class="faint small">Plus ${all.length - 4} earlier update${all.length > 5 ? 's' : ''}. See them all under You → What's new.</p>` : ''}<p class="faint small">Your data is untouched. Updates only change the app, never what you've logged.</p><button class="btn block" data-act="closeSheet">Got it</button>`), 500);
  }
}

/* ---------- backups ---------- */
const lastBackup = () => { try { return localStorage.getItem('onpaper.lastBackup'); } catch (e) { return null; } };
const hasData = () => COLLS.some(c => Store.list(c).length);
function backupDue() { const lb = lastBackup(); return hasData() && (!lb || daysBetween(lb, todayStr()) >= 7); }
const blobToDataURL = b => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsDataURL(b); });
const dataURLToBlob = u => { const [h, b] = String(u).split(','), bin = atob(b || ''), a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return new Blob([a], { type: (h.match(/:(.*?);/) || [])[1] || 'image/jpeg' }); };
/* Full backup, progress photos included. Built ahead of time (prepBackup) so the share sheet can open straight from the tap. */
const Backup = { json: null, rev: -1, busy: null };
async function backupJSON() {
  const data = { app: 'liftprint', version: APP_VERSION, exported: new Date().toISOString(), settings: S(), push: { topic: lsGet(PUSH_TOPIC) || '', on: pushOn() }, ...Object.fromEntries(COLLS.map(c => [c, Store.list(c)])) };
  const files = {};
  for (const p of Store.list('photos')) { const k = p.assetId || p.local; if (!k || files[k]) continue; try { const bl = await IDB.get('photos', k); if (bl) files[k] = await blobToDataURL(bl); } catch (e) {} }
  if (Object.keys(files).length) data.photoFiles = files;
  return JSON.stringify(data);
}
function prepBackup() { const rev = Store.rev; if (Backup.rev === rev && Backup.json) return Promise.resolve(Backup.json); if (Backup.busy && Backup.busyRev === rev) return Backup.busy; Backup.busyRev = rev; return Backup.busy = backupJSON().then(j => { Backup.json = j; Backup.rev = rev; return j; }).catch(() => null); }
A.backupNow = async () => {
  const name = `liftprint-backup-${todayStr()}.json`, json = Backup.rev === Store.rev && Backup.json ? Backup.json : await prepBackup();
  const mark = () => { try { localStorage.setItem('onpaper.lastBackup', todayStr()); } catch (e) {} changed(); };
  try {
    const file = new File([json], name, { type: 'application/json' });
    if (json && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Liftprint backup' });
      mark(); if ($('#sheet [data-act=saveSettings]')) closeSheet(); else { const b = $('#sheet .bk-row'); if (b) b.remove(); } toast('Backup saved. Nice.'); return;
    }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  A.exportData(json); mark(); const b = $('#sheet .bk-row'); if (b) b.remove();
};

/* ---------- muscle diagrams ---------- */
const MUSCLE_NAMES = { chest: 'Chest', delts: 'Front delts', side_delts: 'Side delts', rear_delts: 'Rear delts', biceps: 'Biceps', triceps: 'Triceps', forearms: 'Forearms', abs: 'Abs', obliques: 'Obliques', traps: 'Traps', lats: 'Lats', upper_back: 'Upper back', lower_back: 'Lower back', glutes: 'Glutes', abductors: 'Outer hips', quads: 'Quads', hamstrings: 'Hamstrings', adductors: 'Inner thighs', calves: 'Calves' };
const EX_MUSCLES = {
  'bench press': ['chest delts triceps'], 'incline bench press': ['chest delts', 'triceps'], 'dumbbell bench press': ['chest', 'delts triceps'], 'incline dumbbell press': ['chest delts', 'triceps'],
  'machine chest press': ['chest', 'delts triceps'], 'smith incline press': ['chest delts', 'triceps'], 'smith bench press': ['chest', 'delts triceps'], 'low-to-high cable fly': ['chest delts', ''], 'pec deck fly': ['chest', 'delts'], 'cable fly': ['chest', 'delts'], 'dips': ['chest triceps', 'delts'], 'push-ups': ['chest triceps', 'delts abs'],
  'deadlift': ['glutes hamstrings lower_back', 'quads traps lats forearms upper_back'], 'pull-ups': ['lats biceps', 'upper_back rear_delts forearms'], 'barbell row': ['lats upper_back', 'rear_delts biceps lower_back'], 'lat pulldown': ['lats', 'biceps upper_back'],
  'seated cable row': ['upper_back lats', 'rear_delts biceps'], 'dumbbell row': ['lats upper_back', 'biceps rear_delts'], 't-bar row': ['upper_back lats', 'rear_delts biceps lower_back'], 'chest-supported row': ['upper_back lats', 'rear_delts biceps'],
  'straight-arm pulldown': ['lats', 'triceps'], 'back extension': ['lower_back glutes', 'hamstrings'],
  'overhead press': ['delts side_delts triceps', 'traps abs'], 'dumbbell shoulder press': ['delts side_delts', 'triceps traps'], 'machine shoulder press': ['delts side_delts', 'triceps'], 'dumbbell lateral raise': ['side_delts', 'traps'],
  'cable lateral raise': ['side_delts', 'traps'], 'rear delt fly': ['rear_delts', 'upper_back'], 'face pull': ['rear_delts upper_back', 'traps'], 'dumbbell shrug': ['traps', 'forearms'],
  'barbell curl': ['biceps', 'forearms'], 'ez-bar curl': ['biceps', 'forearms'], 'dumbbell curl': ['biceps', 'forearms'], 'hammer curl': ['biceps forearms'], 'preacher curl': ['biceps', 'forearms'], 'cable curl': ['biceps', 'forearms'], 'incline dumbbell curl': ['biceps', 'forearms'],
  'triceps pushdown': ['triceps'], 'overhead cable extension': ['triceps'], 'rope pushdown': ['triceps'], 'overhead rope extension': ['triceps'], 'skull crushers': ['triceps'], 'close-grip bench press': ['triceps chest', 'delts'], 'dumbbell overhead extension': ['triceps'],
  'squat': ['quads glutes', 'adductors hamstrings lower_back abs'], 'front squat': ['quads', 'glutes abs upper_back'], 'leg press': ['quads glutes', 'adductors hamstrings'], 'hack squat': ['quads', 'glutes adductors'],
  'leg extension': ['quads'], 'smith squat': ['quads glutes', 'adductors hamstrings'], 'bulgarian split squat': ['quads glutes', 'adductors hamstrings abductors'], 'goblet squat': ['quads glutes', 'adductors abs'], 'walking lunge': ['quads glutes', 'hamstrings adductors calves'],
  'romanian deadlift': ['hamstrings glutes', 'lower_back forearms'], 'dumbbell rdl': ['hamstrings glutes', 'lower_back forearms'], 'lying leg curl': ['hamstrings', 'calves'], 'seated leg curl': ['hamstrings', 'calves'], 'kettlebell swing': ['glutes hamstrings', 'lower_back delts abs'],
  'hip thrust': ['glutes', 'hamstrings'], 'machine hip thrust': ['glutes', 'hamstrings'], 'cable kickback': ['glutes', 'hamstrings'], 'hip abduction': ['abductors glutes'],
  'standing calf raise': ['calves'], 'dumbbell standing calf raise': ['calves'], 'chin-ups': ['lats biceps', 'upper_back forearms'], 'calf extension': ['calves'], 'seated calf raise': ['calves'], 'leg press calf raise': ['calves'], 'smith calf raise': ['calves'],
  'hanging leg raise': ['abs', 'obliques forearms'], 'cable crunch': ['abs', 'obliques'], 'plank': ['abs', 'obliques delts'], 'decline sit-up': ['abs', 'obliques'],
  'farmer carry': ['forearms traps', 'abs obliques upper_back'], 'crunch': ['abs', 'obliques'], 'lying leg raise': ['abs', 'obliques'], 'russian twist': ['obliques abs', 'delts'], 'ab wheel rollout': ['abs', 'obliques lats lower_back'],
  'wrist curl': ['forearms'], 'reverse wrist curl': ['forearms'], 'barbell wrist curl': ['forearms'], 'reverse curl': ['forearms biceps'], 'dead hang': ['forearms', 'lats upper_back'], 'plate pinch': ['forearms', 'traps'],
  'arnold press': ['delts side_delts', 'triceps traps'], 'front raise': ['delts', 'side_delts traps'], 'upright row': ['side_delts traps', 'delts biceps forearms'], 'cable woodchop': ['obliques abs', 'delts glutes'], 'pallof press': ['obliques abs', 'delts'], 'dead bug': ['abs', 'obliques'],
  'jump squat': ['quads glutes', 'calves hamstrings'], 'lateral bounds': ['glutes abductors quads', 'calves adductors'], 'lateral lunge': ['quads adductors glutes', 'hamstrings abductors'], 'step-up': ['quads glutes', 'hamstrings calves'],
  'single-leg rdl': ['hamstrings glutes', 'lower_back abductors forearms'], 'tibialis raise': ['calves', ''],
};
const GROUP_MUSCLES = { Chest: ['chest', 'delts triceps'], Back: ['lats upper_back', 'biceps rear_delts'], Shoulders: ['delts side_delts', 'triceps'], Biceps: ['biceps', 'forearms'], Triceps: ['triceps'], Quads: ['quads', 'glutes'], Hamstrings: ['hamstrings', 'glutes'], Glutes: ['glutes', 'hamstrings'], Calves: ['calves'], Core: ['abs', 'obliques'] };
function musclesFor(name) {
  const m = EX_MUSCLES[keyOf(name)] || GROUP_MUSCLES[library().get(keyOf(name))?.group] || null;
  if (!m) return null;
  return { p: new Set((m[0] || '').split(' ').filter(Boolean)), s: new Set((m[1] || '').split(' ').filter(Boolean)) };
}
const PRIMARY_RED = '#ff3b3b';
/* Realistic body figures: anatomical muscle paths (see js/anatomy-data.js) with volume shading, fiber texture and glow. */
const SLUG_MUSCLES = { chest: ['chest'], biceps: ['biceps'], triceps: ['triceps'], forearm: ['forearms'], abs: ['abs'], obliques: ['obliques'], trapezius: ['traps'], lats: ['lats'], 'upper-back': ['upper_back'], 'lower-back': ['lower_back'], gluteal: ['glutes', 'abductors'], adductors: ['adductors'], quadriceps: ['quads'], hamstring: ['hamstrings'], calves: ['calves'], tibialis: [] };
const NON_MUSCLE = new Set(['head', 'hair', 'neck', 'hands', 'feet', 'ankles', 'knees']);
const FIBER = { chest: 18, deltoids: 80, biceps: 86, triceps: 86, forearm: 84, abs: 90, obliques: 52, trapezius: 32, lats: 58, 'upper-back': 24, 'lower-back': 90, gluteal: 34, adductors: 80, quadriceps: 84, hamstring: 86, calves: 86, tibialis: 86 };
let bodyUid = 0;
function bodySVG(view, sex, mus) {
  const fig = ANATOMY[sex === 'female' ? 'female' : 'male'][view], u = 'b' + (++bodyUid);
  const [vx, , vw] = fig.vb.split(' ').map(Number), mid = vx + vw / 2;
  const level = (slug) => {
    const ids = slug === 'deltoids' ? (view === 'front' ? ['delts', 'side_delts'] : ['rear_delts', 'side_delts']) : (SLUG_MUSCLES[slug] || []);
    if (mus.heat) { const v = Math.max(0, ...ids.map(i => mus.heat[i] || 0)); return v >= 10 ? 'p' : v >= 4 ? 's' : v > 0 ? 'l' : 'm'; }
    if (ids.some(i => mus.p.has(i))) return 'p'; if (ids.some(i => mus.s.has(i))) return 's'; return 'm';
  };
  const angles = new Set(); let paths = '', glow = '';
  for (const [slug, side, d, box] of fig.parts) {
    if (slug === 'hair') { paths += `<path d="${d}" fill="#1c1c20" stroke="#0b0b0d" stroke-width="2"/>`; continue; }
    if (NON_MUSCLE.has(slug)) { paths += `<path d="${d}" fill="url(#${u}k)" stroke="#0b0b0d" stroke-width="2.5"/>`; continue; }
    const lv = level(slug), cx = box[0] + box[2] / 2, ang = Math.round((FIBER[slug] ?? 80) * (cx < mid ? 1 : -1));
    angles.add(ang);
    const el = `<path d="${d}" fill="url(#${u}${lv})" stroke="#0b0b0d" stroke-width="2.5"/><path d="${d}" fill="url(#${u}f${ang})" pointer-events="none"/>`;
    if (lv === 'p') glow += `<path d="${d}" fill="#ff2a2a"/>`;
    paths += el;
  }
  const rg = (id, stops) => `<radialGradient id="${u}${id}" cx=".38" cy=".3" r=".85">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</radialGradient>`;
  const defs = `<defs>
    ${rg('m', [[0, '#71717c'], [.55, '#45454e'], [1, '#2a2a30']])}
    ${rg('p', [[0, '#ff8a78'], [.5, '#f0302e'], [1, '#9e1018']])}
    ${rg('s', [[0, '#c0585a'], [.55, '#8c2d33'], [1, '#561a1f']])}
    ${rg('k', [[0, '#55555e'], [1, '#2c2c32']])}
    ${rg('l', [[0, '#8a4a4e'], [.55, '#5a2a2e'], [1, '#3a1c1f']])}
    ${[...angles].map(a => `<pattern id="${u}f${a}" patternUnits="userSpaceOnUse" width="7" height="7" patternTransform="rotate(${a})"><line x1="1" y1="0" x2="1" y2="7" stroke="#000" stroke-opacity=".2" stroke-width="1.3"/><line x1="4.5" y1="0" x2="4.5" y2="7" stroke="#fff" stroke-opacity=".05" stroke-width="1"/></pattern>`).join('')}
    <filter id="${u}g" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="14"/></filter>
    <radialGradient id="${u}bg" cx=".5" cy=".42" r=".55"><stop offset="0" stop-color="#2a2a31" stop-opacity=".9"/><stop offset="1" stop-color="#17171a" stop-opacity="0"/></radialGradient>
  </defs>`;
  const [bx, by, bw, bh] = fig.vb.split(' ').map(Number);
  return `<svg viewBox="${fig.vb}" width="100%" style="max-height:var(--fig-h,340px);display:block;margin:0 auto" role="img" aria-label="${view} view, worked muscles highlighted">${defs}
    <ellipse cx="${bx + bw / 2}" cy="${by + bh * .45}" rx="${bw * .48}" ry="${bh * .5}" fill="url(#${u}bg)"/>
    <ellipse cx="${bx + bw / 2}" cy="${fig.parts.reduce((m, q) => Math.max(m, q[3][1] + q[3][3]), 0) + 6}" rx="${bw * .26}" ry="14" fill="#000" opacity=".5"/>
    <g filter="url(#${u}g)" opacity=".55">${glow}</g>${paths}</svg>`;
}
function guideGoalsHTML(name) {
  const mine = exHelps(name), all = exGoalIds(name), sp = exSports(name), other = all.filter(x => !mine.includes(x));
  if (!all.length) return '';
  return `${mine.length ? `<div class="ghelp"><b>🎯 Helps your goals</b><span class="gbadges">${mine.map(x => `<span class="gbadge"><i aria-hidden="true">${GOALS[x][0]}</i>${esc(GOALS[x][1])}</span>`).join('')}</span>${sp.length ? `<span class="small" style="color:var(--tx2)">Good for your ${sp.map(x => `${SPORT[x].e} ${esc(SPORT[x].l)}`).join(', ')}</span>` : ''}</div>` : ''}
    ${other.length ? `<div class="field"><span class="lbl">${mine.length ? 'Also helps with' : 'Helps with'}</span><div class="guide-hero" style="margin:0">${other.map(x => `<span class="gchip">${GOALS[x][0]} ${esc(GOALS[x][1])}</span>`).join('')}</div>${!myGoals().length ? '<button class="linkbtn small" style="padding:4px 0 0;font-size:13px" data-act="editGoals">Pick your goals to see what matters for you →</button>' : ''}</div>` : ''}`;
}
const IRL_ICONS = [[/dunk|jump|rebound|hoop|basketball|leap/i, '🏀'], [/sprint|run|chase|bus|race|faster/i, '🏃'], [/climb|ledge|rope|tree|wall|hang|fence|loft/i, '🧗'], [/box|groceries|carry|bag|suitcase|luggage|furniture|couch|move/i, '📦'], [/boulder|rock|tire|car|trapped|stuck|heavy/i, '🪨'], [/stair|hike|hill|uphill|step/i, '🥾'], [/kid|child|baby|toddler|shoulder|dog|hug/i, '🧒'], [/door|push|shove|open/i, '🚪'], [/throw|punch|swing|ball/i, '🥊'], [/shelf|overhead|cabinet|reach|high/i, '📚'], [/posture|slouch|back pain|desk|sit/i, '🪑'], [/balance|ankle|knee|injur|fall|trip/i, '🛡️'], [/water|jug|bucket/i, '🪣']];
const irlIcon = x => (IRL_ICONS.find(([re]) => re.test(x)) || [0, '💪'])[1];
A.muscles = d => peekSheet(() => { Sheet.musEx = d.ex; Sheet.musView = 'both'; Sheet.musSex = S().bodyModel || 'male'; openSheet(d.ex, '', {}); drawMuscles(); });
A.musSex = d => { Sheet.musSex = d.s; drawMuscles(); };
A.musView = d => { Sheet.musView = d.v; drawMuscles(); };
function drawMuscles() {
  const name = Sheet.musEx, mus = musclesFor(name), sex = Sheet.musSex, v = Sheet.musView || 'both', g = exGuide(name), lib = library().get(keyOf(name));
  const names = set => [...set].map(m => MUSCLE_NAMES[m]).join(', ');
  const fig = (view, label) => `<div><div style="--fig-h:${v === 'both' ? '330px' : '520px'}">${bodySVG(view, sex, mus)}</div><div class="faint tiny" style="text-align:center">${label}</div></div>`;
  const L = liftByKey(keyOf(name));
  sheetBody(`<div class="guide-hero">${lib ? `<span class="gchip">${esc(lib.group)}</span>` : ''}${lib && lib.equip.length ? `<span class="gchip">${esc(lib.equip.map(q => EQ_LABEL[q]).join(' + '))}</span>` : ''}${bwFactor(name) ? `<span class="gchip">Counts ${Math.round(bwFactor(name) * 100)}% bodyweight</span>` : ''}</div>
    ${g ? `${animHTML(name, sex)}<p style="font-size:16px;line-height:1.45;margin:0">${esc(g.a)}</p>${guideGoalsHTML(name)}
    <div class="field"><span class="lbl">Builds</span><div class="chips">${g.i.map(x => `<span class="chip" style="pointer-events:none">${esc(x)}</span>`).join('')}</div></div>
    <div class="field"><span class="lbl">In real life, it helps you…</span><ul class="irl">${g.e.map((x, i) => `<li><i aria-hidden="true">${irlIcon(x)}</i><span>${esc(x)}</span></li>`).join('')}</ul></div>` : `${guideGoalsHTML(name)}<p class="muted">A custom exercise you added.</p>`}
    ${L && L.e1 ? `<button class="row" data-act="openLift" data-key="${esc(L.key)}" style="background:var(--s2);border-radius:12px;padding:10px 12px;border:0"><div class="grow"><b>Your best</b><div class="faint small">${L.bwf ? loadTxt(L.heavy) : fw(L.heavy.w)} × ${L.heavy.r} · est. 1RM ${fw(L.e1, 0)} ${U.wu} · ${L.prs} PRs</div></div>${ICON.chevR.replace('<svg', '<svg width="18" height="18"')}</button>` : ''}
    ${mus ? `<div class="field" style="margin-top:4px"><span class="lbl">Muscles worked</span></div>
    ${g ? '' : `<div class="seg">${[['male', 'Male'], ['female', 'Female']].map(([k, l]) => `<button data-act="musSex" data-s="${k}" aria-pressed="${sex === k}">${l}</button>`).join('')}</div>`}
    <div style="display:grid;grid-template-columns:${v === 'both' ? '1fr 1fr' : '1fr'};gap:6px">${v !== 'back' ? fig('front', 'Front') : ''}${v !== 'front' ? fig('back', 'Back') : ''}</div>
    <div class="chips" style="justify-content:center">${[['both', 'Both'], ['front', 'Front'], ['back', 'Back']].map(([k, l]) => `<button class="chip" data-act="musView" data-v="${k}" aria-pressed="${v === k}">${l}</button>`).join('')}</div>
    <div class="legend" style="justify-content:center"><span><i style="background:#f0302e;box-shadow:0 0 8px #ff2a2a"></i>Main muscles</span><span><i style="background:#8c2d33"></i>Helping muscles</span></div>
    <p><b>Works:</b> <span class="muted">${esc(names(mus.p))}</span>${mus.s.size ? `<br><b>Helps:</b> <span class="muted">${esc(names(mus.s))}</span>` : ''}</p>` : ''}`);
  mountAnim($('#sheet'));
}
const BODY_ICON = `<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9.2"/><path d="M12 11v6"/><circle cx="12" cy="7.6" r=".9" fill="currentColor" stroke="none"/></svg>`;
const musBtn = name => `<button class="iconbtn sm" data-act="muscles" data-ex="${esc(name)}" aria-label="About ${esc(name)} and muscles worked" style="color:var(--tx2)">${BODY_ICON}</button>`;
