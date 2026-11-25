/* rewards.js – XP, levels, badges, streaks. Everything is stored via DB (Firestore or demo storage). */
const LEVELS = ["Seedling", "Explorer", "Thinker", "Solver", "Brainiac", "Ace", "Scholar", "Master", "Legend", "Genius"];
const lvl = xp => Math.floor(Math.sqrt(xp / 40)) + 1;
const lvlName = l => LEVELS[Math.min(l - 1, LEVELS.length - 1)];
const lvlStart = l => 40 * (l - 1) ** 2;
const BADGES = [
  { id: "first", ic: "🌱", name: "First Step", desc: "Earn your first XP", test: s => s.logs >= 1 },
  { id: "quiz1", ic: "🧠", name: "Quiz Starter", desc: "Finish 1 quiz", test: s => s.quiz >= 1 },
  { id: "quiz5", ic: "🎯", name: "Quiz Machine", desc: "Finish 5 quizzes", test: s => s.quiz >= 5 },
  { id: "perfect", ic: "💯", name: "Perfect Score", desc: "Score 100% in a quiz", test: s => s.perfect >= 1 },
  { id: "daily1", ic: "⚡", name: "Daily Dynamo", desc: "Finish a daily challenge", test: s => s.daily >= 1 },
  { id: "streak3", ic: "🔥", name: "3-Day Streak", desc: "Learn 3 days in a row", test: s => s.streak >= 3 },
  { id: "streak7", ic: "🌋", name: "Week Warrior", desc: "7-day streak", test: s => s.streak >= 7 },
  { id: "lesson1", ic: "🎬", name: "Lesson Learner", desc: "Complete a video lesson", test: s => s.lesson + s.video >= 1 },
  { id: "recover1", ic: "🛟", name: "Comeback Kid", desc: "Recover a weak topic", test: s => s.recover >= 1 },
  { id: "explain1", ic: "🗣️", name: "Explainer", desc: "Use Explain It Back", test: s => s.explain >= 1 },
  { id: "tutor10", ic: "💬", name: "Curious Mind", desc: "Ask the AI tutor 10 times", test: s => s.tutor >= 10 },
  { id: "fixed5", ic: "📒", name: "Mistake Fixer", desc: "Fix 5 mistakes", test: s => s.fixed >= 5 },
  { id: "xp500", ic: "💎", name: "500 Club", desc: "Reach 500 XP", test: s => s.xp >= 500 },
  { id: "lvl5", ic: "👑", name: "Level 5", desc: "Reach level 5", test: s => lvl(s.xp) >= 5 }
];
function rewardStats(logs, u) {
  const c = ty => logs.filter(l => l.type === ty).length;
  return { logs: logs.length, quiz: c("quiz"), daily: c("daily"), lesson: c("lesson"), video: c("video"), recover: c("recover"), explain: c("explain"), tutor: c("tutor"), fixed: c("fixed"),
    perfect: logs.filter(l => l.perfect).length, streak: u.streak || 0, xp: u.xp || 0 };
}
/* streak: +1 per active day; one free "streak freeze" per week if a single day was missed */
async function touchStreak() {
  const u = DB.user, today = dayKey(); if (u.last === today) return;
  const gap = u.last ? Math.round((new Date(today) - new Date(u.last)) / 864e5) : 0, wk = dayKey(new Date(Date.now() - new Date().getDay() * 864e5));
  let s = u.streak || 0, fz = u.freezeWeek;
  if (gap === 1 || !u.last) s++;
  else if (gap === 2 && fz !== wk) { s++; fz = wk; toast("Streak freeze used ❄️ your streak is safe"); }
  else s = 1;
  await DB.setUser({ streak: s, last: today, freezeWeek: fz || null });
  if (s > 1 && [3, 7, 14, 30].includes(s)) { confetti(); toast(`${s}-day streak, keep it going 🔥`); }
}
/* award XP for a real activity, then check for level-ups and new badges */
async function award(type, xp, label, extra = {}) {
  const u = DB.user, before = lvl(u.xp || 0);
  await touchStreak();
  await DB.add("xpLog", { type, xp, label, ...extra });
  const xpNow = (u.xp || 0) + xp, logs = await DB.list("xpLog"), badges = { ...(u.badges || {}) };
  await DB.setUser({ xp: xpNow });
  const s = rewardStats(logs, DB.user), fresh = BADGES.filter(b => !badges[b.id] && b.test(s));
  fresh.forEach(b => badges[b.id] = Date.now());
  if (fresh.length) await DB.setUser({ badges });
  toast(`+${xp} XP · ${label}`, "xp");
  const after = lvl(xpNow);
  setTimeout(() => { if (after > before) levelUp(after); else if (fresh.length) badgePop(fresh[0]); }, 700);
  if (typeof refreshChips === "function") refreshChips();
}
function badgePop(b) {
  confetti(100);
  modal(`<div class="center unlock"><div class="badge-big pop">${b.ic}</div><h2>Badge unlocked!</h2><h3>${b.name}</h3><p class="mu">${b.desc}</p><button class="btn" data-a="closeModal">Nice one!</button></div>`);
}
function levelUp(l) {
  confetti(220);
  modal(`<div class="center unlock">${mascot(90, "bob")}<div class="lvl-burst">LEVEL ${l}</div><h2>${lvlName(l)}</h2><p class="mu">You levelled up. Keep going 🚀</p><button class="btn" data-a="closeModal">Let's go</button></div>`);
}
