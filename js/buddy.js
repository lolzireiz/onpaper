'use strict';
/* Food buddy: a little raccoon you feed by logging food. */

function raccoonSVG(mood = 'happy', size = 150) {
  // mood: happy | content | hungry | eating | stuffed
  const eyes = (mood === 'happy' || mood === 'stuffed')
    ? `<path d="M70 92 Q78 82 86 92" stroke="#111" stroke-width="4.5" fill="none" stroke-linecap="round"/><path d="M114 92 Q122 82 130 92" stroke="#111" stroke-width="4.5" fill="none" stroke-linecap="round"/>`
    : mood === 'eating'
    ? `<path d="M70 90 Q78 96 86 90" stroke="#111" stroke-width="4.5" fill="none" stroke-linecap="round"/><path d="M114 90 Q122 96 130 90" stroke="#111" stroke-width="4.5" fill="none" stroke-linecap="round"/>`
    : `<circle cx="78" cy="90" r="10" fill="#111"/><circle cx="122" cy="90" r="10" fill="#111"/><circle cx="81.5" cy="86" r="3.6" fill="#fff"/><circle cx="125.5" cy="86" r="3.6" fill="#fff"/><circle cx="75" cy="94" r="1.6" fill="#fff"/><circle cx="119" cy="94" r="1.6" fill="#fff"/>`;
  const brows = mood === 'hungry' ? `<path d="M66 76 L86 69" stroke="#2b2b33" stroke-width="4" stroke-linecap="round"/><path d="M134 76 L114 69" stroke="#2b2b33" stroke-width="4" stroke-linecap="round"/>` : '';
  const mouth = mood === 'eating'
    ? `<ellipse cx="100" cy="118" rx="7" ry="6" fill="#5a2230"/><ellipse cx="100" cy="121" rx="4" ry="2.5" fill="#ff8fa3"/>`
    : mood === 'hungry'
    ? `<path d="M93 120 Q100 115 107 120" stroke="#222" stroke-width="3" fill="none" stroke-linecap="round"/>`
    : `<path d="M90 114 Q95 121 100 115 Q105 121 110 114" stroke="#222" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  const snack = mood === 'eating' ? `<g class="rc-snack"><ellipse cx="100" cy="140" rx="17" ry="12" fill="#f2b84b"/><path d="M86 136 Q100 128 114 136" stroke="#d48f22" stroke-width="3" fill="none"/><circle cx="94" cy="142" r="2" fill="#d48f22"/><circle cx="106" cy="141" r="2" fill="#d48f22"/></g><ellipse cx="80" cy="146" rx="9" ry="7" fill="#4a4a54"/><ellipse cx="120" cy="146" rx="9" ry="7" fill="#4a4a54"/>` : '';
  const belly = mood === 'stuffed' ? 50 : 40;
  return `<svg class="raccoon rc-${mood}" viewBox="0 0 200 200" width="${size}" height="${size}" role="img" aria-label="Raccoon buddy looking ${mood}">
    <g class="rc-tail"><path d="M140 168 Q186 160 186 118 Q186 98 172 100 Q170 132 134 150 Z" fill="#8c8c99"/><path d="M178 104 Q182 112 180 120 L168 122 Q172 112 170 103 Z" fill="#2b2b33"/><path d="M180 132 Q176 142 168 146 L160 138 Q168 132 170 126 Z" fill="#2b2b33"/><path d="M164 152 Q156 158 148 160 L144 152 Q152 148 156 144 Z" fill="#2b2b33"/></g>
    <g class="rc-body">
      <ellipse cx="100" cy="158" rx="${belly + 6}" ry="34" fill="#8c8c99"/>
      <ellipse cx="100" cy="164" rx="${belly - 12}" ry="24" fill="#e9e6ee"/>
      <ellipse cx="78" cy="190" rx="13" ry="7" fill="#3a3a44"/><ellipse cx="122" cy="190" rx="13" ry="7" fill="#3a3a44"/>
    </g>
    <g class="rc-head">
      <circle cx="56" cy="52" r="20" fill="#3a3a44"/><circle cx="56" cy="52" r="15" fill="#9a9aa7"/><circle cx="57" cy="54" r="8" fill="#f6a9bb"/>
      <circle cx="144" cy="52" r="20" fill="#3a3a44"/><circle cx="144" cy="52" r="15" fill="#9a9aa7"/><circle cx="143" cy="54" r="8" fill="#f6a9bb"/>
      <ellipse cx="100" cy="94" rx="62" ry="52" fill="#9a9aa7"/>
      <ellipse cx="100" cy="112" rx="40" ry="30" fill="#f4f2f7"/>
      <ellipse cx="74" cy="70" rx="14" ry="8" fill="#f4f2f7"/><ellipse cx="126" cy="70" rx="14" ry="8" fill="#f4f2f7"/>
      <path d="M44 92 Q52 74 78 78 Q94 80 100 92 Q106 80 122 78 Q148 74 156 92 Q150 106 126 104 Q110 102 100 96 Q90 102 74 104 Q50 106 44 92 Z" fill="#2b2b33"/>
      <path d="M100 52 L94 80 L106 80 Z" fill="#7a7a86"/>
      ${eyes}${brows}
      <ellipse cx="62" cy="114" rx="9" ry="6" fill="#ff9fb4" opacity=".55"/><ellipse cx="138" cy="114" rx="9" ry="6" fill="#ff9fb4" opacity=".55"/>
      <ellipse cx="100" cy="104" rx="8" ry="6" fill="#1b1b20"/><ellipse cx="97.5" cy="102" rx="2.5" ry="1.6" fill="#fff" opacity=".8"/>
      ${mouth}
    </g>
    ${snack}
  </svg>`;
}
const BUDDY_MSGS = ['Yum! Thanks for feeding me!', "You're doing so good today!", 'Crunch crunch... you take such good care of me.', 'That hit the spot. You\'re the best!', 'Mmm! Fuel for those gains!', 'Fed and happy! Proud of you.', 'Nom nom nom! Keep it up!', "You're my favorite human!", 'Delicious! Now go crush your workout!', 'Thank you! This is the best day ever.'];
const BUDDY_PROTEIN = ['Protein goal hit! You\'re getting so strong!', 'That\'s your protein for the day. Gains secured!'];
const BUDDY_FULL = ["I'm stuffed! That's a perfect day of eating.", 'Calorie goal done! Best. Human. Ever.'];
const buddyOn = () => S().buddy !== false;
const buddyName = () => S().buddyName || 'Pebble';
function buddyState(date = todayStr()) {
  const t = foodTotals(date), pct = S().calTarget ? t.cal / S().calTarget : 0;
  if (!t.cal) return { mood: 'hungry', pct, text: `${buddyName()} is hungry! Log some food to feed them.` };
  if (pct < 0.4) return { mood: 'content', pct, text: `${buddyName()} had a snack but could eat more.` };
  if (pct < 1) return { mood: 'happy', pct, text: `${buddyName()} is happy and munching along with you.` };
  return { mood: 'stuffed', pct, text: `${buddyName()} is full and very happy. Great job today!` };
}
function buddyCardHTML() {
  if (!buddyOn()) return '';
  const b = buddyState(UI.foodDate || todayStr());
  return `<section class="card buddy" style="flex-direction:row;align-items:center;gap:12px;padding:10px 14px"><button data-act="petBuddy" aria-label="Pet ${esc(buddyName())}" style="flex:none">${raccoonSVG(b.mood, 96)}</button><div class="grow"><b>${esc(buddyName())}</b><p class="muted small">${esc(b.text)}</p><div class="bar" style="margin-top:8px" aria-label="${esc(buddyName())}'s fullness"><i style="width:${clamp(b.pct * 100, 4, 100)}%;background:var(--grad)"></i></div></div></section>`;
}
A.petBuddy = (d, el) => { const svg = el.querySelector('svg'); svg.classList.remove('rc-pet'); void svg.offsetWidth; svg.classList.add('rc-pet'); toast(['Hehe, that tickles!', `${buddyName()} loves you!`, '*happy raccoon noises*'][Math.floor(Math.random() * 3)]); };
function feedBuddy(before, after) {
  if (!buddyOn()) return;
  const t = after, s = S();
  let msg = BUDDY_MSGS[Math.floor(Math.random() * BUDDY_MSGS.length)];
  if (before.p < s.proteinTarget && t.p >= s.proteinTarget) msg = BUDDY_PROTEIN[Math.floor(Math.random() * BUDDY_PROTEIN.length)];
  else if (before.cal < s.calTarget && t.cal >= s.calTarget) msg = BUDDY_FULL[Math.floor(Math.random() * BUDDY_FULL.length)];
  const L = $('#buddy-pop');
  L.innerHTML = `<div class="bp-card" role="status"><div class="bp-rc">${raccoonSVG('eating', 170)}</div><div class="bp-msg"><b>${esc(buddyName())}</b><span>Nom nom nom…</span></div><div class="bp-hearts" aria-hidden="true"><i>♥</i><i>♥</i><i>♥</i></div></div>`;
  L.hidden = false; L.onclick = () => { L.hidden = true; };
  clearTimeout(feedBuddy.t1); clearTimeout(feedBuddy.t2);
  feedBuddy.t1 = setTimeout(() => { const rc = $('.bp-rc', L); if (rc) rc.innerHTML = raccoonSVG('happy', 170); const m = $('.bp-msg span', L); if (m) m.textContent = msg; L.classList.add('done'); }, 1500);
  feedBuddy.t2 = setTimeout(() => { L.hidden = true; L.classList.remove('done'); }, 5200);
}
