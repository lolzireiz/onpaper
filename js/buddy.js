'use strict';
/* Food buddies: five cute pets you feed by logging food. Shared face rig, pet-specific bodies, markings and snacks. */

const PETS = {
  raccoon: { label: 'Raccoon', def: 'Pebble', noise: '*happy raccoon noises*', paw: '#4a4a54' },
  cat: { label: 'Cat', def: 'Mochi', noise: 'Purrrrrr…', paw: '#fde9cf' },
  bunny: { label: 'Bunny', def: 'Clover', noise: '*happy little bunny hop*', paw: '#efe6da' },
  penguin: { label: 'Penguin', def: 'Waddles', noise: '*happy flipper flaps*', paw: '#2b3442' },
  axolotl: { label: 'Axolotl', def: 'Bubbles', noise: '*happy gill wiggles*', paw: '#ff9ab6' },
};
const petKind = () => PETS[S().pet] ? S().pet : 'raccoon';

/* --- shared face rig (eyes at 78/122,90; nose 100,104; mouth ~114) --- */
function petEyes(mood) {
  if (mood === 'happy' || mood === 'stuffed') return `<path d="M69 93 Q78 81 87 93" stroke="#141418" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M113 93 Q122 81 131 93" stroke="#141418" stroke-width="5" fill="none" stroke-linecap="round"/>`;
  if (mood === 'eating') return `<path d="M69 90 Q78 97 87 90" stroke="#141418" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M113 90 Q122 97 131 90" stroke="#141418" stroke-width="5" fill="none" stroke-linecap="round"/>`;
  return `<g class="rc-eyes"><circle cx="78" cy="90" r="10.5" fill="#141418"/><circle cx="122" cy="90" r="10.5" fill="#141418"/><circle cx="81.8" cy="85.6" r="3.8" fill="#fff"/><circle cx="125.8" cy="85.6" r="3.8" fill="#fff"/><circle cx="74.6" cy="94.4" r="1.7" fill="#fff"/><circle cx="118.6" cy="94.4" r="1.7" fill="#fff"/></g>`;
}
const petBrows = (mood, c = '#2b2b33') => mood === 'hungry' ? `<path d="M67 76 L86 70" stroke="${c}" stroke-width="4" stroke-linecap="round"/><path d="M133 76 L114 70" stroke="${c}" stroke-width="4" stroke-linecap="round"/>` : '';
const petBlush = (o = .55) => `<ellipse cx="61" cy="113" rx="9.5" ry="6" fill="#ff8fab" opacity="${o}"/><ellipse cx="139" cy="113" rx="9.5" ry="6" fill="#ff8fab" opacity="${o}"/>`;
function petMouth(mood, y = 114) {
  if (mood === 'eating') return `<ellipse cx="100" cy="${y + 4}" rx="7" ry="6" fill="#5a2230"/><ellipse cx="100" cy="${y + 7}" rx="4" ry="2.5" fill="#ff8fa3"/>`;
  if (mood === 'hungry') return `<path d="M93 ${y + 6} Q100 ${y + 1} 107 ${y + 6}" stroke="#222" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  return `<path d="M90 ${y} Q95 ${y + 7} 100 ${y + 1} Q105 ${y + 7} 110 ${y}" stroke="#222" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
}
const SNACKS = {
  cookie: `<ellipse cx="100" cy="140" rx="17" ry="12" fill="#f2b84b"/><path d="M86 136 Q100 128 114 136" stroke="#d48f22" stroke-width="3" fill="none"/><circle cx="94" cy="142" r="2.2" fill="#7a4a1c"/><circle cx="106" cy="141" r="2.2" fill="#7a4a1c"/><circle cx="100" cy="146" r="1.8" fill="#7a4a1c"/>`,
  fish: `<path d="M82 140 Q96 126 112 140 Q96 154 82 140Z" fill="#7cc4ff"/><path d="M111 140 L123 131 L121 140 L123 149Z" fill="#5aa8ee"/><circle cx="89" cy="138" r="2" fill="#123"/><path d="M98 133 Q101 140 98 147" stroke="#5aa8ee" stroke-width="2" fill="none"/>`,
  carrot: `<path d="M90 130 L112 136 Q108 146 92 150 Z" fill="#ff8c2b"/><path d="M95 136 l6 2 M93 142 l7 2" stroke="#e06a10" stroke-width="2" stroke-linecap="round"/><path d="M110 134 Q118 124 116 120 M111 135 Q122 130 124 126 M110 136 Q118 138 124 136" stroke="#3fb05a" stroke-width="3.5" fill="none" stroke-linecap="round"/>`,
  berry: `<path d="M86 134 Q100 128 114 134 Q114 152 100 156 Q86 152 86 134Z" fill="#ff4d6d"/><path d="M90 131 Q100 122 110 131 Q100 128 90 131Z" fill="#3fb05a"/><g fill="#ffe08a"><circle cx="94" cy="140" r="1.4"/><circle cx="104" cy="139" r="1.4"/><circle cx="99" cy="146" r="1.4"/><circle cx="108" cy="146" r="1.4"/><circle cx="92" cy="148" r="1.4"/></g>`,
};
const petSnack = (snack, paw) => `<g class="rc-snack">${SNACKS[snack]}</g><ellipse cx="81" cy="146" rx="9" ry="7" fill="${paw}" stroke="rgba(0,0,0,.18)" stroke-width="1.5"/><ellipse cx="119" cy="146" rx="9" ry="7" fill="${paw}" stroke="rgba(0,0,0,.18)" stroke-width="1.5"/>`;

/* --- pet bodies --- */
const PET_ART = {
  raccoon: { snack: 'cookie',
    tail: () => `<path d="M140 168 Q186 160 186 118 Q186 98 172 100 Q170 132 134 150 Z" fill="#8c8c99"/><path d="M178 104 Q182 112 180 120 L168 122 Q172 112 170 103 Z" fill="#2b2b33"/><path d="M180 132 Q176 142 168 146 L160 138 Q168 132 170 126 Z" fill="#2b2b33"/><path d="M164 152 Q156 158 148 160 L144 152 Q152 148 156 144 Z" fill="#2b2b33"/>`,
    body: b => `<ellipse cx="100" cy="158" rx="${b + 6}" ry="34" fill="#8c8c99"/><ellipse cx="100" cy="164" rx="${b - 12}" ry="24" fill="#e9e6ee"/><ellipse cx="78" cy="190" rx="13" ry="7" fill="#3a3a44"/><ellipse cx="122" cy="190" rx="13" ry="7" fill="#3a3a44"/>`,
    head: () => `<circle cx="56" cy="52" r="20" fill="#3a3a44"/><circle cx="56" cy="52" r="15" fill="#9a9aa7"/><circle cx="57" cy="54" r="8" fill="#f6a9bb"/><circle cx="144" cy="52" r="20" fill="#3a3a44"/><circle cx="144" cy="52" r="15" fill="#9a9aa7"/><circle cx="143" cy="54" r="8" fill="#f6a9bb"/>
      <ellipse cx="100" cy="94" rx="62" ry="52" fill="#9a9aa7"/><ellipse cx="100" cy="112" rx="40" ry="30" fill="#f4f2f7"/><ellipse cx="74" cy="70" rx="14" ry="8" fill="#f4f2f7"/><ellipse cx="126" cy="70" rx="14" ry="8" fill="#f4f2f7"/>
      <path d="M44 92 Q52 74 78 78 Q94 80 100 92 Q106 80 122 78 Q148 74 156 92 Q150 106 126 104 Q110 102 100 96 Q90 102 74 104 Q50 106 44 92 Z" fill="#2b2b33"/><path d="M100 52 L94 80 L106 80 Z" fill="#7a7a86"/>`,
    nose: () => `<ellipse cx="100" cy="104" rx="8" ry="6" fill="#1b1b20"/><ellipse cx="97.5" cy="102" rx="2.5" ry="1.6" fill="#fff" opacity=".8"/>` },
  cat: { snack: 'fish',
    tail: () => `<path d="M136 172 Q178 176 180 140 Q181 118 192 110" stroke="#f0a050" stroke-width="17" fill="none" stroke-linecap="round"/><path d="M174 160 l10 -4 M179 142 l11 0 M184 124 l10 3" stroke="#d27d33" stroke-width="5" stroke-linecap="round"/><circle cx="192" cy="110" r="8.5" fill="#fde9cf"/>`,
    body: b => `<ellipse cx="100" cy="158" rx="${b + 6}" ry="34" fill="#f0a050"/><ellipse cx="100" cy="165" rx="${b - 12}" ry="24" fill="#fde9cf"/><path d="M62 146 l10 2 M60 156 l10 1 M138 146 l-10 2 M140 156 l-10 1" stroke="#d27d33" stroke-width="4" stroke-linecap="round"/><ellipse cx="78" cy="190" rx="13" ry="7" fill="#fde9cf"/><ellipse cx="122" cy="190" rx="13" ry="7" fill="#fde9cf"/>`,
    head: () => `<path d="M48 74 L54 26 Q58 20 64 26 L90 54 Z" fill="#f0a050" stroke="#f0a050" stroke-width="8" stroke-linejoin="round"/><path d="M58 62 L60 36 L80 54 Z" fill="#ffb3c4"/><path d="M152 74 L146 26 Q142 20 136 26 L110 54 Z" fill="#f0a050" stroke="#f0a050" stroke-width="8" stroke-linejoin="round"/><path d="M142 62 L140 36 L120 54 Z" fill="#ffb3c4"/>
      <ellipse cx="100" cy="96" rx="62" ry="50" fill="#f0a050"/><path d="M100 48 l-5 16 h10z M86 50 l-3 13 h7z M114 50 l3 13 h-7z" fill="#d27d33"/><path d="M40 94 h14 M41 103 h12 M160 94 h-14 M159 103 h-12" stroke="#d27d33" stroke-width="4.5" stroke-linecap="round"/>
      <ellipse cx="100" cy="114" rx="27" ry="18" fill="#fff3e3"/>`,
    nose: () => `<path d="M93.5 102 Q100 98.5 106.5 102 Q102 109 100 109 Q98 109 93.5 102Z" fill="#ff8fa3"/><g stroke="#fff" stroke-opacity=".85" stroke-width="1.8" stroke-linecap="round"><path d="M76 110 L50 105 M76 116 L50 118 M124 110 L150 105 M124 116 L150 118"/></g>` },
  bunny: { snack: 'carrot',
    tail: () => `<circle cx="150" cy="172" r="15" fill="#fff"/><circle cx="144" cy="166" r="7" fill="#fff"/><circle cx="157" cy="166" r="7" fill="#fff"/>`,
    body: b => `<ellipse cx="100" cy="158" rx="${b + 6}" ry="34" fill="#f3ece2"/><ellipse cx="100" cy="165" rx="${b - 12}" ry="24" fill="#ffffff"/><ellipse cx="76" cy="190" rx="15" ry="8" fill="#f3ece2"/><ellipse cx="124" cy="190" rx="15" ry="8" fill="#f3ece2"/><ellipse cx="76" cy="191" rx="7" ry="3.5" fill="#ffc2cf"/><ellipse cx="124" cy="191" rx="7" ry="3.5" fill="#ffc2cf"/>`,
    head: () => `<g transform="rotate(-14 74 40)"><ellipse cx="74" cy="34" rx="15" ry="40" fill="#f3ece2"/><ellipse cx="74" cy="36" rx="7.5" ry="29" fill="#ffc2cf"/></g><g transform="rotate(32 132 52)"><path d="M118 62 Q112 26 128 8 Q146 -4 146 22 Q144 46 134 64 Z" fill="#f3ece2"/><path d="M124 56 Q120 30 131 16 Q140 10 139 26 Q137 44 131 58 Z" fill="#ffc2cf"/></g>
      <ellipse cx="100" cy="98" rx="58" ry="49" fill="#f3ece2"/><path d="M60 76 Q70 58 92 60 Q84 76 66 86 Z" fill="#e2cfb4" opacity=".9"/><ellipse cx="100" cy="114" rx="24" ry="16" fill="#ffffff"/>`,
    nose: () => `<path d="M95 102 Q100 99 105 102 Q101 107 100 107 Q99 107 95 102Z" fill="#ff8fa3"/><path d="M100 107 V112" stroke="#222" stroke-width="2.4" stroke-linecap="round"/>`,
    mouth: m => (m === 'eating' || m === 'hungry') ? petMouth(m, 113) : `${petMouth(m, 113)}<rect x="96" y="116" width="8" height="7" rx="2" fill="#fff" stroke="#ddd" stroke-width="1"/><line x1="100" y1="116" x2="100" y2="123" stroke="#ddd" stroke-width="1"/>` },
  penguin: { snack: 'fish',
    tail: () => '',
    body: b => `<ellipse cx="${100 - b - 2}" cy="152" rx="11" ry="28" fill="#2b3442" transform="rotate(18 ${100 - b - 2} 152)"/><ellipse cx="${100 + b + 2}" cy="152" rx="11" ry="28" fill="#2b3442" transform="rotate(-18 ${100 + b + 2} 152)"/><ellipse cx="100" cy="156" rx="${b + 8}" ry="38" fill="#2b3442"/><ellipse cx="100" cy="162" rx="${b - 6}" ry="30" fill="#f6f8fb"/><ellipse cx="80" cy="192" rx="14" ry="6.5" fill="#ffa53c"/><ellipse cx="120" cy="192" rx="14" ry="6.5" fill="#ffa53c"/>`,
    head: () => `<path d="M92 46 Q96 34 100 44 Q104 32 108 46" fill="#2b3442"/><ellipse cx="100" cy="94" rx="60" ry="52" fill="#2b3442"/><ellipse cx="80" cy="98" rx="25" ry="28" fill="#f6f8fb"/><ellipse cx="120" cy="98" rx="25" ry="28" fill="#f6f8fb"/><ellipse cx="100" cy="116" rx="34" ry="24" fill="#f6f8fb"/>`,
    nose: () => '',
    mouth: m => m === 'eating' ? `<path d="M89 104 Q100 98 111 104 Q104 108 100 108 Q96 108 89 104Z" fill="#ffa53c"/><path d="M92 110 Q100 122 108 110 Z" fill="#e8892a"/><ellipse cx="100" cy="112" rx="5" ry="3" fill="#5a2230"/>`
      : m === 'hungry' ? `<path d="M89 106 Q100 99 111 106 Q104 116 100 116 Q96 116 89 106Z" fill="#ffa53c"/><path d="M93 109 Q100 106 107 109" stroke="#e8892a" stroke-width="2" fill="none"/>`
      : `<path d="M89 104 Q100 97 111 104 Q104 114 100 114 Q96 114 89 104Z" fill="#ffa53c"/><path d="M93 107 Q100 111 107 107" stroke="#e8892a" stroke-width="2" fill="none" stroke-linecap="round"/>` },
  axolotl: { snack: 'berry',
    tail: () => `<path d="M134 166 Q178 172 192 140 Q170 150 150 146 Z" fill="#ff9ab6"/><path d="M140 160 Q176 162 188 144" stroke="#ffc6d6" stroke-width="3" fill="none" stroke-linecap="round"/>`,
    body: b => `<ellipse cx="100" cy="158" rx="${b + 6}" ry="33" fill="#ffb3c7"/><ellipse cx="100" cy="165" rx="${b - 12}" ry="22" fill="#ffd9e4"/><ellipse cx="74" cy="189" rx="11" ry="7" fill="#ff9ab6"/><ellipse cx="126" cy="189" rx="11" ry="7" fill="#ff9ab6"/><g fill="#ff9ab6"><circle cx="70" cy="193" r="3"/><circle cx="78" cy="194" r="3"/><circle cx="122" cy="194" r="3"/><circle cx="130" cy="193" r="3"/></g>`,
    head: () => { const fr = (x1, y1, x2, y2) => `<path d="M${x1} ${y1} Q${(x1 + x2) / 2} ${(y1 + y2) / 2 - 6} ${x2} ${y2}" stroke="#ff6f9a" stroke-width="9" fill="none" stroke-linecap="round"/><circle cx="${x2}" cy="${y2}" r="6.5" fill="#ff6f9a"/><circle cx="${(x1 * 2 + x2) / 3}" cy="${(y1 * 2 + y2) / 3 - 5}" r="4" fill="#ff86aa"/><circle cx="${(x1 + x2 * 2) / 3}" cy="${(y1 + y2 * 2) / 3 - 5}" r="4.5" fill="#ff86aa"/>`;
      return fr(48, 72, 18, 50) + fr(44, 90, 12, 86) + fr(48, 108, 18, 120) + fr(152, 72, 182, 50) + fr(156, 90, 188, 86) + fr(152, 108, 182, 120)
        + `<ellipse cx="100" cy="96" rx="64" ry="48" fill="#ffb3c7"/><ellipse cx="100" cy="114" rx="40" ry="22" fill="#ffc6d6"/><g fill="#ff8fb0" opacity=".7"><circle cx="86" cy="58" r="3"/><circle cx="112" cy="56" r="2.5"/><circle cx="100" cy="64" r="2"/><circle cx="124" cy="64" r="2"/></g>`; },
    nose: () => `<circle cx="95" cy="104" r="1.6" fill="#c2507a"/><circle cx="105" cy="104" r="1.6" fill="#c2507a"/>`,
    mouth: m => m === 'eating' ? petMouth(m, 113) : m === 'hungry' ? `<path d="M88 121 Q100 113 112 121" stroke="#7a2a48" stroke-width="3" fill="none" stroke-linecap="round"/>` : `<path d="M80 112 Q100 128 120 112" stroke="#7a2a48" stroke-width="3" fill="none" stroke-linecap="round"/>` },
};

function petSVG(kind = petKind(), mood = 'happy', size = 150) {
  const P = PET_ART[kind] || PET_ART.raccoon, belly = mood === 'stuffed' ? 50 : 40;
  const brows = kind === 'raccoon' ? petBrows(mood, '#d8d8e0') : petBrows(mood);
  return `<svg class="raccoon rc-${mood}" viewBox="0 0 200 200" width="${size}" height="${size}" role="img" aria-label="${esc(PETS[kind].label)} buddy looking ${mood}">
    <g class="rc-tail">${P.tail()}</g><g class="rc-body">${P.body(belly)}</g>
    <g class="rc-head">${P.head()}${petEyes(mood)}${brows}${petBlush(kind === 'axolotl' ? .7 : .55)}${P.nose()}${P.mouth ? P.mouth(mood) : petMouth(mood)}</g>
    ${mood === 'eating' ? petSnack(P.snack, PETS[kind].paw) : ''}</svg>`;
}

/* --- buddy state, card, feeding --- */
const BUDDY_MSGS = ['Yum! Thanks for feeding me!', "You're doing so good today!", "That hit the spot. You're the best!", 'Mmm! Fuel for those gains!', 'Fed and happy! Proud of you.', 'Nom nom nom! Keep it up!', "You're my favorite human!", 'Delicious! Now go crush your workout!', 'Thank you! Best day ever.', 'Every meal gets you closer to that dunk!'];
const BUDDY_PROTEIN = ["Protein goal hit! You're getting so strong!", "That's your protein for the day. Gains secured!"];
const BUDDY_FULL = ["I'm stuffed! That's a perfect day of eating.", 'Calorie goal done! Best. Human. Ever.'];
const buddyOn = () => S().buddy === true;
const buddyName = () => S().buddyName || PETS[petKind()].def;
function feedStreak() {
  const has = d => (foodDay(d).items || []).length > 0;
  let d = has(todayStr()) ? todayStr() : addDays(todayStr(), -1), n = 0;
  while (has(d) && n < 999) { n++; d = addDays(d, -1); }
  return n;
}
function buddyState(date = todayStr()) {
  const t = foodTotals(date), pct = S().calTarget ? t.cal / S().calTarget : 0, n = buddyName();
  if (!t.cal) return { mood: 'hungry', pct, text: `${n} is hungry! Log some food to feed them.` };
  if (pct < 0.4) return { mood: 'content', pct, text: `${n} had a snack but could eat more.` };
  if (pct < 1) return { mood: 'happy', pct, text: `${n} is happy and munching along with you.` };
  return { mood: 'stuffed', pct, text: `${n} is full and very happy. Great job today!` };
}
const PENCIL = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="var(--tx3)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/></svg>`;
function buddyCardHTML() {
  if (!buddyOn()) return '';
  const b = buddyState(UI.foodDate || todayStr()), st = feedStreak();
  return `<section class="card buddy" style="flex-direction:row;align-items:center;gap:12px;padding:10px 14px"><button data-act="petBuddy" aria-label="Pet ${esc(buddyName())}" style="flex:none">${petSVG(petKind(), b.mood, 96)}</button><div class="grow"><div style="display:flex;align-items:center;justify-content:space-between;gap:8px"><button data-act="renameBuddy" style="display:inline-flex;align-items:center;gap:6px" aria-label="Rename ${esc(buddyName())}"><b>${esc(buddyName())}</b>${PENCIL}</button><button class="linkbtn" style="font-size:13px;padding:0" data-act="pickPet">Change pet</button></div><p class="muted small">${esc(b.text)}</p><div class="bar" style="margin-top:8px" aria-label="${esc(buddyName())}'s fullness"><i style="width:${clamp(b.pct * 100, 4, 100)}%;background:var(--grad)"></i></div>${st > 1 ? `<p class="faint tiny" style="margin-top:6px">🔥 Fed ${st} days in a row</p>` : ''}</div></section>`;
}
A.petBuddy = (d, el) => { const svg = el.querySelector('svg'); svg.classList.remove('rc-pet'); void svg.offsetWidth; svg.classList.add('rc-pet'); toast(['Hehe, that tickles!', `${buddyName()} loves you!`, PETS[petKind()].noise][Math.floor(Math.random() * 3)]); };
A.pickPet = () => {
  const cur = petKind();
  openSheet('Choose your buddy', `<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px">${Object.entries(PETS).map(([k, p]) => `<button data-act="setPet" data-k="${k}" style="background:var(--s2);border-radius:18px;padding:10px 6px 12px;display:flex;flex-direction:column;align-items:center;gap:4px;border:2px solid ${k === cur ? 'var(--accent)' : 'transparent'}" aria-pressed="${k === cur}">${petSVG(k, 'happy', 112)}<b>${p.label}</b><span class="faint tiny">${k === cur ? esc(buddyName()) : p.def}</span></button>`).join('')}</div><p class="faint small">Switching keeps your feeding streak. A custom name stays; default names change to the new pet's.</p>`);
};
A.setPet = d => {
  const prevDef = PETS[petKind()].def, custom = S().buddyName && S().buddyName !== prevDef;
  saveSettings({ pet: d.k, buddyName: custom ? S().buddyName : '' });
  closeSheet(); toast(`Say hi to ${custom ? S().buddyName : PETS[d.k].def}!`);
};
const SNACK_COL = { cookie: '#f2b84b', fish: '#7cc4ff', carrot: '#ff8c2b', berry: '#ff4d6d' };
function feedBuddy(before, after) {
  if (!buddyOn()) return;
  const s = S(), kind = petKind(), snack = (PET_ART[kind] || PET_ART.raccoon).snack, name = buddyName();
  let msg = Math.random() < 0.18 ? PETS[kind].noise : BUDDY_MSGS[Math.floor(Math.random() * BUDDY_MSGS.length)], goal = false;
  if (before.p < s.proteinTarget && after.p >= s.proteinTarget) { msg = BUDDY_PROTEIN[Math.floor(Math.random() * BUDDY_PROTEIN.length)]; goal = true; }
  else if (before.cal < s.calTarget && after.cal >= s.calTarget) { msg = BUDDY_FULL[Math.floor(Math.random() * BUDDY_FULL.length)]; goal = true; }
  const p0 = Math.round(clamp(before.cal / (s.calTarget || 1) * 100, 0, 100)), p1 = Math.round(clamp(after.cal / (s.calTarget || 1) * 100, 0, 100)), st = feedStreak();
  const L = $('#buddy-pop'); feedBuddy.timers = (feedBuddy.timers || []); feedBuddy.timers.forEach(clearTimeout); feedBuddy.timers = [];
  const T = (fn, ms) => feedBuddy.timers.push(setTimeout(fn, ms));
  L.classList.remove('show', 'closing');
  L.innerHTML = `<div class="bp-card" role="status" aria-label="${esc(name)} ate">
    <div class="bp-stage"><div class="bp-glow"></div>
      <div class="bp-pet"><div class="bp-a on">${petSVG(kind, 'content', 170)}</div><div class="bp-b">${petSVG(kind, 'eating', 170)}</div><div class="bp-c">${petSVG(kind, 'happy', 170)}</div></div>
      <div class="bp-snack"><svg viewBox="78 118 46 40" width="58" height="50" aria-hidden="true">${SNACKS[snack]}</svg></div>
      <div class="bp-bubble" id="bp-bub"><span id="bp-say">Ooh, food!</span></div>
    </div>
    <b class="bp-name">${esc(name)}</b>
    <div class="bp-full"><div class="bar" style="height:10px"><i id="bp-bar" style="width:${p0}%;background:var(--grad)"></i></div><span class="faint tiny" id="bp-pct">Fullness ${p0}%</span></div>
    ${st > 1 ? `<span class="bp-streak">🔥 ${st}-day feeding streak</span>` : ''}</div>`;
  L.hidden = false; void L.offsetWidth; requestAnimationFrame(() => L.classList.add('show'));
  const reduced = REDUCED(), stage = $('.bp-stage', L), pet = $('.bp-pet', L), snackEl = $('.bp-snack', L), bub = $('#bp-bub', L);
  const face = k => $$('.bp-pet > div', L).forEach(d => d.classList.toggle('on', d.classList.contains(k)));
  const say = (t, type) => { const el = $('#bp-say', L); if (!el) return; bub.classList.remove('pop'); void bub.offsetWidth; bub.classList.add('pop'); if (!type || reduced) { el.textContent = t; return; } el.textContent = ''; let i = 0; const iv = setInterval(() => { el.textContent = t.slice(0, ++i); if (i >= t.length) clearInterval(iv); }, 22); feedBuddy.timers.push(iv); };
  const burst = (chars, n, opts) => { for (let i = 0; i < n; i++) { const d = document.createElement('i'); d.className = 'bp-part'; d.textContent = chars[i % chars.length]; d.style.color = opts.color || '#ff6b8a'; d.style.left = opts.x + 'px'; d.style.top = opts.y + 'px'; d.style.fontSize = (opts.size || 18) + Math.random() * 8 + 'px'; stage.appendChild(d);
      const a = opts.angle + (Math.random() - .5) * opts.spread, v = opts.dist * (.6 + Math.random() * .6);
      d.animate([{ transform: 'translate(-50%,-50%) scale(.3)', opacity: 0 }, { transform: `translate(calc(-50% + ${Math.cos(a) * v * .5}px), calc(-50% + ${Math.sin(a) * v * .5}px)) scale(1)`, opacity: 1, offset: .3 }, { transform: `translate(calc(-50% + ${Math.cos(a) * v}px), calc(-50% + ${Math.sin(a) * v + (opts.fall || 0)}px)) scale(.8) rotate(${(Math.random() - .5) * 60}deg)`, opacity: 0 }], { duration: opts.dur || 900, easing: 'cubic-bezier(.2,.8,.3,1)', delay: i * (opts.stagger || 30), fill: 'both' }).onfinish = () => d.remove(); } };
  if (reduced) { snackEl.remove(); face('bp-c'); say(msg); $('#bp-bar', L).style.width = p1 + '%'; $('#bp-pct', L).textContent = `Fullness ${p1}%`; }
  else {
    T(() => { say('Ooh, food!'); snackEl.style.opacity = 1; snackEl.animate([{ transform: 'translate(118px,118px) rotate(50deg) scale(1.25)' }, { transform: 'translate(70px,-30px) rotate(-20deg) scale(1.1)', offset: .55 }, { transform: 'translate(0,0) rotate(-6deg) scale(.55)' }], { duration: 650, easing: 'cubic-bezier(.3,.1,.3,1)', fill: 'forwards' }).onfinish = () => { snackEl.style.opacity = 0; }; }, 380);
    T(() => { face('bp-b'); pet.classList.add('munch'); say('Nom nom nom…'); burst(['●'], 9, { x: 100, y: 112, color: SNACK_COL[snack], size: 6, angle: Math.PI / 2, spread: 2.6, dist: 46, fall: 30, dur: 700, stagger: 18 }); }, 1040);
    T(() => burst(['●'], 6, { x: 100, y: 112, color: SNACK_COL[snack], size: 5, angle: Math.PI / 2, spread: 2.4, dist: 40, fall: 26, dur: 650, stagger: 20 }), 1500);
    T(() => { pet.classList.remove('munch'); face('bp-c'); pet.classList.add('joy'); say(msg, true); burst(['♥', '♥', '✦'], 8, { x: 100, y: 70, color: '#ff6b8a', size: 16, angle: -Math.PI / 2, spread: 2.2, dist: 80, dur: 1300, stagger: 45 });
      const bar = $('#bp-bar', L), pct = $('#bp-pct', L); if (bar) bar.style.width = p1 + '%'; const t0 = performance.now(); const tick = t => { const k = Math.min(1, (t - t0) / 900); if (pct) pct.textContent = `Fullness ${Math.round(p0 + (p1 - p0) * (1 - Math.pow(1 - k, 3)))}%`; if (k < 1) requestAnimationFrame(tick); }; requestAnimationFrame(tick);
      if (goal) T(() => confetti({ y: innerHeight * .3, n: 110 }), 250); }, 2250);
  }
  const close = () => { feedBuddy.timers.forEach(clearTimeout); if (!L.classList.contains('show')) return; L.classList.add('closing'); L.classList.remove('show'); feedBuddy.timers.push(setTimeout(() => { L.hidden = true; L.classList.remove('closing'); L.innerHTML = ''; }, 360)); };
  L.onclick = close; T(close, 6400);
}
A.renameBuddy = () => {
  openSheet('Rename your buddy', `<div style="display:grid;place-items:center">${petSVG(petKind(), 'happy', 120)}</div><div class="field"><label class="lbl" for="bd-n">Name</label><input id="bd-n" name="bname" maxlength="24" value="${esc(buddyName())}" autocapitalize="words" autocomplete="off"></div><button class="btn block" data-act="saveBuddyName">Save name</button>`, { onMount(L) { setTimeout(() => { const i = $('#bd-n', L); if (i) { i.focus(); i.select(); } }, 280); } });
};
A.saveBuddyName = () => { const n = fval('bname').replace(/\s+/g, ' ').trim(); if (!n) return toast('Give your buddy a name.', { bad: true }); saveSettings({ buddyName: n }); closeSheet(); toast(`${n} loves their new name!`); };
