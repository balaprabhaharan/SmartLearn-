/* core.js – shell, router, analytics formulas (mastery, confidence, node states) and the quiz runner */
const A = { closeModal, go: v => location.hash = "#/" + v, retry: () => route() };
const PAGES = {}; let U;
document.addEventListener("click", e => { const el = e.target.closest("[data-a]"); if (el && A[el.dataset.a]) { if (el.tagName === "A") e.preventDefault(); A[el.dataset.a](el.dataset.v, el, e); } });
const NAV = [["home", "🏠", "nav_home"], ["quizzes", "🧠", "nav_quiz"], ["map", "🗺️", "nav_map"], ["videos", "🎬", "nav_video"], ["tutor", "💬", "nav_tutor"], ["challenge", "⚡", "nav_daily"],
  ["progress", "📊", "nav_prog"], ["mistakes", "📒", "nav_mist"], ["recover", "🔁", "nav_rec"], ["planner", "📅", "nav_plan"], ["classes", "👩‍🏫", "nav_class"], ["rewards", "🏆", "nav_rew"], ["profile", "🙂", "nav_prof"]];
const navList = () => U.role === "student" ? NAV : [...NAV.slice(0, 4), ["teacher", "🎓", "nav_teach"], ...NAV.slice(4)];

async function boot() {
  U = await DB.init();
  if (!U) return location.replace("index.html");
  if (DB.guest) $("#banner").innerHTML = `<div class="card soft row sp small"><span>👀 Guest mode: progress isn't saved.</span><a href="index.html#register" data-a="">Save my progress</a></div>`;
  $("#logo").innerHTML = mascot(34) + "SmartLearn";
  buildNav(); refreshChips();
  $("#dock").innerHTML = `<b>✨ AI</b>` + [["tutor", "💬 Ask Tutor"], ["hint", "💡 Hint mode"], ["photo", "📷 Photo solver"], ["explain", "🗣️ Explain it back"], ["quiz", "⚡ Quiz me"], ["video", "🎬 AI video"], ["map", "🗺️ Make map"], ["recover", "🔁 Fix weak topic"]]
    .map(([k, l]) => `<button data-a="dock" data-v="${k}">${l}</button>`).join("");
  addEventListener("hashchange", route); route();
}
function buildNav() {
  const cur = location.hash.split("?")[0].slice(2) || "home";
  $("#side").innerHTML = navList().map(([k, ic, l]) => `<a href="#/${k}" class="${cur == k ? "on" : ""}" data-k="${k}"><span>${ic}</span>${t(l)}</a>`).join("") +
    `<button class="chip" id="langBtn" style="margin-top:12px">தமிழ் / English</button><button class="chip" data-a="logout">Log out</button>`;
  const tabs = [["home", "🏠"], ["quizzes", "🧠"], ["videos", "🎬"], ["rewards", "🏆"]];
  $("#tabs").innerHTML = tabs.map(([k, ic]) => `<a href="#/${k}" class="${cur == k ? "on" : ""}"><span class="ic">${ic}</span>${t("nav_" + ({ home: "home", quizzes: "quiz", videos: "video", rewards: "rew" }[k]))}</a>`).join("") + `<button data-a="more"><span class="ic">☰</span>${t("more")}</button>`;
  $("#langBtn").onclick = () => { LANG.set(LANG.get() === "en" ? "ta" : "en"); buildNav(); route(); };
}
A.more = () => modal(`<h2>${t("more")}</h2><div class="grid g3">${navList().map(([k, ic, l]) => `<a class="card center lift" href="#/${k}" data-a="closeModal" style="margin:0;color:var(--tx)"><div style="font-size:1.8rem">${ic}</div>${t(l)}</a>`).join("")}</div><button class="btn ghost block" data-a="logout" style="margin-top:14px">Log out</button>`);
A.logout = () => DB.logout();
function refreshChips() {
  const l = lvl(U.xp || 0), a = lvlStart(l), b = lvlStart(l + 1);
  $("#chips").innerHTML = `<span class="chip wn" title="Streak">🔥 ${U.streak || 0}</span><a class="chip" href="#/rewards">⭐ ${U.xp || 0} XP</a><a class="chip pk" href="#/rewards">Lv ${l} ${lvlName(l)}</a>`;
}
async function route() {
  const [p, q] = (location.hash.slice(2) || "home").split("?"), page = PAGES[p] || PAGES.home;
  $("#view").innerHTML = loadingCard("Loading…"); buildNav(); scrollTo(0, 0);
  try { await page(new URLSearchParams(q || "")); } catch (e) { console.error(e); $("#view").innerHTML = errCard(e); }
}

/* ---------- analytics: all rule-based formulas, no ML ---------- */
const confLabel = c => c >= 75 ? "High" : c >= 50 ? "Medium" : "Low";
function topicStats(att) {
  const m = {}; att.forEach(a => (m[a.topic] ??= []).push(a));
  return Object.entries(m).map(([topic, arr]) => {
    arr.sort((x, y) => x.ts - y.ts);
    const n = arr.length, acc = arr.filter(a => a.ok).length / n, l5 = arr.slice(-5), cons = l5.filter(a => a.ok).length / l5.length;
    const avg = arr.reduce((s, a) => s + (a.ms || 15000), 0) / n, speed = Math.max(0, 1 - Math.min(avg, 30000) / 30000), full = arr.filter(a => a.full).length;
    const conf = Math.max(0, Math.round(100 * (.5 * acc + .3 * cons + .2 * speed) - Math.min(15, 5 * full)));   // Confidence = .5 acc + .3 consistency + .2 speed - penalty
    return { topic, subject: arr[n - 1].subject || "", n, mastery: Math.round(acc * 100), conf, last: arr[n - 1].ts };
  });
}
const statMap = att => Object.fromEntries(topicStats(att).map(s => [s.topic.toLowerCase(), s]));
const NODE = { new: ["○", "Not started"], learn: ["✏️", "Learning"], weak: ["⚠️", "Needs help"], rec: ["✨", "Recovered"], mast: ["★", "Mastered"] };
function nodeState(s, rec) {
  if (!s || !s.n) return "new";
  if (s.mastery >= 80 && s.conf >= 50) return "mast";
  if (rec && rec.after > 50) return "rec";
  if (s.n >= 3 && s.mastery < 50) return "weak";
  return "learn";
}
const weakTopics = st => st.filter(s => s.n >= 3 && s.mastery < 50).sort((a, b) => a.mastery - b.mastery);
const preloaded = name => QUIZZES.find(q => q.title.toLowerCase() === String(name).toLowerCase());
const subjOf = name => preloaded(name)?.subject || "";
async function logAttempt(topic, subject, ok, ms, extra = {}) { return DB.add("attempts", { topic, subject, ok, ms, ...extra }); }
async function saveMistake(topic, subject, q, my) {
  return DB.add("mistakes", { topic, subject, q: q.q, o: q.o || null, a: q.a, type: q.type || "mcq", my: my ?? "", exp: q.exp || "", fixedCount: 0, fixed: false });
}
const correctText = q => q.o ? q.o[q.a] : q.a;

/* ---------- generic quiz runner (preloaded, AI, adaptive, daily, recovery all use it) ----------
   o = {title, topic, subject, total, source(i,S)->question, xp:true, retry, onFinish(res)} */
async function runQuiz(o) {
  const S = { i: 0, score: 0, diff: o.diff || 2, res: [], t0: 0, start: Date.now() }, box = $("#view"); let q, locked;
  const tick = setInterval(() => { const e = $("#tm"); if (e) { const s = Math.floor((Date.now() - S.start) / 1000); e.textContent = "⏱ " + Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); } }, 1000);
  addEventListener("hashchange", () => clearInterval(tick), { once: true });
  const topicOf = q => o.topic || q.topic || o.title;
  async function next() {
    if (S.i >= o.total) return done();
    box.innerHTML = loadingCard(`Getting question ${S.i + 1}…`);
    try { q = await o.source(S.i, S); } catch (e) { box.innerHTML = errCard(e, "qretry"); return; }
    if (!q) return done(); show();
  }
  function show() {
    locked = false;
    const body = q.type === "short" ? `<textarea id="sa" placeholder="Type your answer in your own words"></textarea><div class="row" style="margin-top:10px"><button class="round" id="micq">🎤</button><button class="btn" data-a="qshort">Check answer</button></div>`
      : q.o.map((x, i) => `<button class="opt" data-a="qa" data-v="${i}"><b>${"ABCD"[i]}</b>${esc(x)}</button>`).join("");
    box.innerHTML = `<div class="card fadeup"><div class="qtop"><span>${esc(o.title)}</span><span id="tm">⏱ 0:00</span><span>${S.i + 1}/${o.total}</span></div><div class="bar"><i style="width:${S.i / o.total * 100}%"></i></div>
      ${q.diff ? `<span class="chip" style="margin-top:12px">Level ${S.diff}</span>` : ""}<h2 class="q">${esc(q.q)}</h2>${body}<div id="fb"></div></div>`;
    if ($("#micq")) $("#micq").onclick = () => listen($("#sa"), U.medium); S.t0 = Date.now();
  }
  async function result(ok, my, msg) {
    locked = true; const ms = Date.now() - S.t0, tp = topicOf(q), sj = o.subject || q.subject || subjOf(tp);
    if (ok) S.score++; S.res.push({ q, ok, my, ms });
    S.diff = ok && ms < 15000 ? Math.min(5, S.diff + 1) : ok ? S.diff : Math.max(1, S.diff - 1);   // adaptive rule
    $("#fb").innerHTML = `<div class="fb ${ok ? "good" : "bad"}">${ok ? "Nice one! 🎉" : "Not quite. Answer: " + esc(correctText(q))} ${msg ? "<br><small>" + esc(msg) + "</small>" : ""}${q.exp ? "<br><small>" + esc(q.exp) + "</small>" : ""}</div><button class="btn block" data-a="qnext">${S.i + 1 >= o.total ? "See results" : "Next"}</button>`;
    logAttempt(tp, sj, ok, ms, { diff: S.diff }); if (!ok) saveMistake(tp, sj, q, my);
  }
  A.qretry = next; A.qnext = () => { S.i++; next(); };
  A.qa = v => { if (locked) return; const i = +v, ok = i === q.a; $$(".opt").forEach((b, k) => { b.disabled = true; if (k === q.a) b.classList.add("good"); else if (k === i) b.classList.add("bad"); }); result(ok, q.o[i]); };
  A.qshort = async (_, b) => { const a = $("#sa").value.trim(); if (a.length < 2) return toast("Write an answer first", "bad"); b.disabled = true; b.textContent = "Checking…";
    try { const j = await AI.judge(q, a); result(!!j.correct, a, j.feedback); } catch (e) { b.disabled = false; b.textContent = "Check answer"; toast(e.message, "bad"); } };
  A.qexp = async (i, b) => { b.disabled = true; b.textContent = "Thinking…"; try { const r = S.res[i]; b.outerHTML = `<div class="fb bad">${md(await AI.explain(r.q, r.my))}</div>`; } catch (e) { b.textContent = "Retry"; b.disabled = false; toast(e.message, "bad"); } };
  async function done() {
    clearInterval(tick); const n = S.res.length, pct = n ? Math.round(S.score / n * 100) : 0;
    box.innerHTML = `<div class="card center fadeup"><h2>${pct >= 80 ? "Brilliant! 🎉" : pct >= 50 ? "Good going 💪" : "Let's fix this 💪"}</h2><div class="ring" style="--p:${pct}"><span>${pct}%</span></div>
      <p><b>${S.score}</b> of ${n} correct · ${Math.round(S.res.reduce((s, r) => s + r.ms, 0) / 1000)}s</p><div id="xpnote" class="chip ok">Saving…</div>
      <div class="row" style="justify-content:center;margin-top:14px">${o.retry ? `<button class="btn" data-a="qagain">Try again</button>` : ""}<a class="btn ghost" href="#/quizzes">All quizzes</a>${pct < 50 ? `<a class="btn ghost" href="#/recover?topic=${encodeURIComponent(o.topic || o.title)}">Recovery loop</a>` : ""}<a class="btn ghost" href="#/mistakes">Mistakes</a></div></div>
      <div class="card"><h3>Your answers</h3>${S.res.map((r, i) => `<div class="rev"><b>${r.ok ? "✅" : "❌"} ${i + 1}. ${esc(r.q.q)}</b><div class="small mu">You: ${esc(r.my ?? "—")} · Correct: ${esc(correctText(r.q))}</div>${r.ok ? "" : `<button class="chip" data-a="qexp" data-v="${i}">Explain with AI</button>`}</div>`).join("")}</div><div id="after"></div>`;
    A.qagain = o.retry; if (pct >= 80) confetti();
    if (o.xp !== false && n) { const xp = S.score * 5 + 20 + (pct === 100 ? 30 : 0); if (o.save !== false) await DB.add("quizResults", { topic: o.topic || o.title, title: o.title, score: S.score, total: n, pct }); await award(o.xpType || "quiz", xp, o.title, { perfect: pct === 100 && n >= 5 }); $("#xpnote").textContent = `+${xp} XP earned`; }
    if (o.onFinish) await o.onFinish({ pct, score: S.score, n });
  }
  next();
}
/* start a quiz for any topic name: preloaded if it matches, otherwise AI-generated */
function startTopicQuiz(topic, n = 5, material = "", subject = "") {
  const p = preloaded(topic);
  if (p) return startPreloaded(p.id);
  return startAIQuiz({ topic, material, n });
}
