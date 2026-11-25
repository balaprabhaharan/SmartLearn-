/* learn.js – Dashboard, Quizzes, Learning Map, Progress, Daily Challenge, Mistake Notebook (+flashcards), Recovery Loop */
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const ti = p => (LANG.get() === "ta" && p.ta) ? p.ta : p.title;

/* ===== QUIZZES ===== */
function startPreloaded(id) {
  const p = QUIZZES.find(x => x.id === id), qs = shuffle(p.qs);
  runQuiz({ title: p.title, topic: p.title, subject: p.subject, total: qs.length, source: i => qs[i], retry: () => startPreloaded(id) });
}
async function startAIQuiz({ topic, material, n = 5, adaptive = false }) {
  const go = async () => {
    $("#view").innerHTML = loadingCard(adaptive ? "Warming up your adaptive test…" : "Writing your quiz…");
    try {
      const title = topic || (material || "").slice(0, 40) + "…";
      if (adaptive) return runQuiz({ title: title + " (adaptive)", topic: topic || title, total: 8, diff: 2, retry: go,
        source: async (i, S) => (await AI.questions({ material, topic, n: 1, types: ["mcq"], diff: S.diff, lang: U.medium }))[0] });
      const qs = await AI.questions({ material, topic, n, lang: U.medium }), name = topic || qs[0].topic || "Custom quiz";
      runQuiz({ title: name, topic: name, total: qs.length, source: i => qs[i], retry: go });
    } catch (e) { A.retry = go; $("#view").innerHTML = errCard(e); }
  };
  return go();
}
async function readMaterial() {
  const f = $("#qf").files[0]; let text = $("#qm").value.trim();
  if (f) {
    const ext = f.name.split(".").pop().toLowerCase();
    if (!["txt", "pdf"].includes(ext)) throw new Error("Wrong file type. Upload a .txt or a text-based PDF.");
    if (f.size > 5 * 1048576) throw new Error("File is bigger than 5 MB.");
    if (ext === "txt") text = await f.text();
    else {
      if (!window.pdfjsLib) throw new Error("PDF reader didn't load. Check your internet connection.");
      pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      const pdf = await pdfjsLib.getDocument({ data: await f.arrayBuffer() }).promise; let s = "";
      for (let i = 1; i <= Math.min(pdf.numPages, 30); i++) s += (await (await pdf.getPage(i)).getTextContent()).items.map(x => x.str).join(" ") + "\n";
      if (s.trim().length < 30) throw new Error("This PDF looks scanned (no selectable text). Paste the text or use the Photo solver.");
      text = s;
    }
  }
  if (!text) throw new Error("Type a topic, paste some text or upload a file first.");
  if (text.length < 3) throw new Error("That's too short. Add a few more words.");
  if (text.length > 40000) throw new Error("That's too long. Keep it under about 40,000 characters.");
  return text;
}
PAGES.quizzes = async () => {
  const res = await DB.list("quizResults"), best = {}; res.forEach(r => best[r.topic] = Math.max(best[r.topic] || 0, r.pct));
  $("#view").innerHTML = `<h1 class="fadeup">Quizzes 🧠</h1><p class="mu">Pick a topic, take the quiz, see your score.</p>
  <div class="card soft"><h2>✨ Make a quiz on anything</h2><label for="qm">Type a topic or paste notes</label><textarea id="qm" placeholder='e.g. "Photosynthesis class 10" or paste your lesson'></textarea>
  <label for="qf">or upload a .txt / text PDF</label><input type="file" id="qf" accept=".txt,.pdf"><div class="row" style="margin-top:12px"><select id="qn" style="width:auto" aria-label="Number of questions"><option>5</option><option>8</option><option>10</option></select><span class="small">questions</span>
  <button class="btn" data-a="aiquiz">Generate quiz</button><button class="btn ghost" data-a="aiadapt">Adaptive test</button></div><div class="err" id="qe"></div></div>
  <h2>Ready-made quizzes (${QUIZZES.length} topics × 12 questions)</h2><div class="grid g3">${QUIZZES.map(p => `<button class="topic lift" data-a="pq" data-v="${p.id}"><span class="em">${p.emoji}</span><span>${esc(ti(p))}</span><span class="row"><span class="chip">${p.subject}</span><span class="small mu">${p.qs.length} questions</span></span>${best[p.title] != null ? `<span class="chip ok">Best ${best[p.title]}%</span>` : `<span class="chip">Not tried</span>`}</button>`).join("")}</div>
  <div class="card" style="margin-top:20px"><h2>Your scores</h2>${res.length ? `<table class="tbl"><tr><th>Quiz</th><th>Score</th><th>Date</th></tr>${res.slice(0, 15).map(r => `<tr><td>${esc(r.title)}</td><td><b>${r.score}/${r.total}</b> (${r.pct}%)</td><td>${fmtDate(r.ts)}</td></tr>`).join("")}</table>` : `<p class="mu">No scores yet. Take your first quiz above 👆</p>`}</div>`;
};
A.pq = startPreloaded;
const aiq = async adaptive => { try { const m = await readMaterial(), isTopic = m.length < 120 && !$("#qf").files[0]; startAIQuiz({ topic: isTopic ? m : "", material: isTopic ? "" : m, n: +$("#qn").value, adaptive }); } catch (e) { $("#qe").textContent = e.message; } };
A.aiquiz = () => aiq(false); A.aiadapt = () => aiq(true);

/* ===== LEARNING MAP ===== */
function mapStates(map, att, recs) {
  const sm = statMap(att), rm = {}; recs.forEach(r => { const k = r.topic.toLowerCase(); if (!rm[k] || r.ts > rm[k].ts) rm[k] = r; });
  return map.zones.map(z => ({ ...z, nodes: z.nodes.map(n => { const k = n.name.toLowerCase(), s = sm[k]; return { ...n, s, state: nodeState(s, rm[k]) }; }) }));
}
function nextBest(zs) {
  const all = zs.flatMap(z => z.nodes), by = Object.fromEntries(all.map(n => [n.name, n])), rank = { weak: 0, learn: 1, new: 2 };
  const ok = n => !(n.pre || []).length || n.pre.filter(p => by[p]?.s?.mastery >= 50).length / n.pre.length >= .5;
  const c = all.filter(n => rank[n.state] !== undefined);
  return c.filter(ok).sort((a, b) => rank[a.state] - rank[b.state] || (a.s?.mastery ?? 0) - (b.s?.mastery ?? 0))[0] || c[0];
}
const nodeBtn = (n, zi, ni) => `<button class="node n-${n.state}" data-a="node" data-v="${zi}:${ni}" aria-label="${esc(n.name)}, ${NODE[n.state][1]}, ${n.s ? n.s.mastery : 0} percent"><span class="ni">${NODE[n.state][0]}</span><span>${esc(n.name)}<small>${NODE[n.state][1]}${n.s ? " · " + n.s.mastery + "%" : ""}</small></span></button>`;
let MAPS = [], CUR = null, ZS = [];
PAGES.map = async p => {
  MAPS = await DB.list("maps"); const [att, recs] = await Promise.all([DB.list("attempts"), DB.list("recoveries")]);
  CUR = MAPS.find(m => m.id === p.get("id")) || MAPS[0];
  const form = `<div class="card soft"><h2>${CUR ? "Make another map" : "Pick a subject to start your map"}</h2><div class="grid g2"><div><label for="ms">Subject (type anything)</label><input id="ms" placeholder="e.g. Maths, Physics, Computer Science"></div>
   <div><label for="mc">Class</label><select id="mc">${[9, 10, 11, 12].map(c => `<option ${c == U.cls ? "selected" : ""}>${c}</option>`).join("")}</select></div></div>
   <label for="mi">Paste your textbook index (optional)</label><textarea id="mi" placeholder="Paste chapter names to match your book"></textarea><div class="err" id="me"></div><button class="btn" data-a="mkmap">Generate map</button></div>`;
  if (!CUR) { $("#view").innerHTML = `<h1>Learning Map 🗺️</h1><div class="card center">${mascot(90, "bob")}<p>Pick a subject to start your map</p></div>${form}`; return; }
  ZS = mapStates(CUR, att, recs);
  const key = "sl_nodes_" + CUR.id, old = JSON.parse(localStorage.getItem(key) || "{}"), now = {}, wins = [];
  ZS.forEach(z => z.nodes.forEach(n => { now[n.name] = n.state; if ((n.state === "mast" || n.state === "rec") && old[n.name] && old[n.name] !== n.state) wins.push(n); }));
  localStorage.setItem(key, JSON.stringify(now));
  $("#view").innerHTML = `<div class="row sp"><h1>Learning Map 🗺️</h1><select id="msel" style="width:auto" aria-label="Choose map">${MAPS.map(m => `<option value="${m.id}" ${m.id === CUR.id ? "selected" : ""}>${esc(m.subject)} · class ${m.cls}</option>`).join("")}</select></div>
   <p class="small mu">AI-generated outline, check it against your textbook. Tap a node to edit or practise.</p>
   <div class="row small">${Object.entries(NODE).map(([k, v]) => `<span class="chip">${v[0]} ${v[1]}</span>`).join("")}</div>
   ${ZS.map((z, zi) => { const d = z.nodes.filter(n => n.state === "mast" || n.state === "rec").length, pc = Math.round(d / (z.nodes.length || 1) * 100);
     return `<div class="zone"><div class="row sp"><h2>${esc(z.name)} ${pc === 100 ? "🏅" : ""}</h2><button class="chip" data-a="addnode" data-v="${zi}">+ topic</button></div><div class="bar"><i style="width:${pc}%"></i></div></div><div class="path">${z.nodes.map((n, ni) => nodeBtn(n, zi, ni)).join("")}</div>`; }).join("")}
   <div class="card" style="margin-top:20px"><h3>Rebuild from your textbook index</h3><textarea id="mi" placeholder="Paste index here"></textarea><button class="btn ghost" data-a="regen">Regenerate this map</button><div class="err" id="me"></div></div>${form}`;
  $("#msel").onchange = e => location.hash = "#/map?id=" + e.target.value;
  if (wins.length) { confetti(); wins.forEach(n => $$(".node").find(b => b.textContent.includes(n.name))?.classList.add("light")); await award("node", 15 * wins.length, "Map: " + wins[0].name); }
};
async function genMap(subject, cls, index) {
  const j = await AI.json(`You design a learning map for Tamil Nadu State Board students. Return {"subject":"","zones":[{"name":"chapter name","nodes":[{"name":"topic name","pre":["names of earlier topics needed first"]}]}]}. 4-8 zones, 2-5 nodes each, in teaching order. Use the language of the subject name.`,
    `Subject: ${subject}\nClass: ${cls}\n${index ? "Textbook index:\n" + index.slice(0, 6000) : ""}`);
  const zones = (j.zones || []).map((z, zi) => ({ name: String(z.name), nodes: (z.nodes || []).map((n, ni) => ({ id: `n${zi}_${ni}`, name: String(n.name), pre: (n.pre || []).map(String) })) })).filter(z => z.nodes.length);
  if (!zones.length) throw new Error("Couldn't build a map from that. Try a clearer subject name.");
  return zones;
}
A.mkmap = async (_, b) => { const s = $("#ms").value.trim(); if (s.length < 2) return $("#me").textContent = "Type a subject first."; b.disabled = true; b.textContent = "Building your map…";
  try { const zones = await genMap(s, $("#mc").value, $("#mi").value.trim()), m = await DB.add("maps", { subject: s, cls: +$("#mc").value, zones }); location.hash = "#/map?id=" + m.id; route(); } catch (e) { $("#me").textContent = e.message; b.disabled = false; b.textContent = "Generate map"; } };
A.regen = async (_, b) => { const i = $("#mi").value.trim(); if (i.length < 10) return $("#me").textContent = "Paste your textbook index first."; b.disabled = true; try { await DB.upd("maps", CUR.id, { zones: await genMap(CUR.subject, CUR.cls, i) }); route(); } catch (e) { $("#me").textContent = e.message; b.disabled = false; } };
const saveMap = async () => { await DB.upd("maps", CUR.id, { zones: CUR.zones }); route(); };
A.addnode = zi => { const n = prompt("New topic name?"); if (n && n.trim()) { CUR.zones[zi].nodes.push({ id: "n" + Date.now(), name: n.trim().slice(0, 80), pre: [] }); saveMap(); } };
A.node = v => {
  const [zi, ni] = v.split(":").map(Number), n = ZS[zi].nodes[ni], s = n.s, all = ZS.flatMap(z => z.nodes);
  const unmet = (n.pre || []).filter(p => !(all.find(x => x.name === p)?.s?.mastery >= 50));
  modal(`<h2>${NODE[n.state][0]} ${esc(n.name)}</h2><span class="chip">${NODE[n.state][1]}</span>
   <div class="grid g3" style="margin:14px 0"><div class="card center"><div class="big">${s ? s.mastery : 0}%</div>Mastery</div><div class="card center"><div class="big">${s ? confLabel(s.conf) : "—"}</div>Confidence</div><div class="card center"><div class="big" style="font-size:1.2rem">${s ? fmtDate(s.last) : "Never"}</div>Last practised</div></div>
   ${unmet.length ? `<p class="fb bad">Try ${esc(unmet[0])} first (you can still jump ahead).</p>` : ""}
   <div class="row"><button class="btn sm" data-a="nask" data-v="${esc(n.name)}">Ask tutor</button><a class="btn sm ghost" href="#/videos?ai=${encodeURIComponent(n.name)}" data-a="closeModal">Watch video</a><button class="btn sm ghost" data-a="nquiz" data-v="${esc(n.name)}">Take quiz</button>
   <a class="btn sm ghost" href="#/recover?topic=${encodeURIComponent(n.name)}" data-a="closeModal">Start Recovery Loop</a><a class="btn sm ghost" href="#/mistakes?topic=${encodeURIComponent(n.name)}" data-a="closeModal">View mistakes</a></div>
   <div class="row" style="margin-top:14px"><button class="chip" data-a="ren" data-v="${v}">Rename</button><button class="chip er" data-a="deln" data-v="${v}">Delete</button></div>`);
};
A.nask = t => { closeModal(); openPanel("tutor", `Explain ${t} simply with an example`); };
A.nquiz = t => { closeModal(); startTopicQuiz(t, 5); };
A.ren = v => { const [zi, ni] = v.split(":").map(Number), n = prompt("Rename topic", CUR.zones[zi].nodes[ni].name); if (n && n.trim()) { CUR.zones[zi].nodes[ni].name = n.trim(); closeModal(); saveMap(); } };
A.deln = v => { const [zi, ni] = v.split(":").map(Number); CUR.zones[zi].nodes.splice(ni, 1); CUR.zones = CUR.zones.filter(z => z.nodes.length); closeModal(); saveMap(); };

/* ===== DASHBOARD ===== */
PAGES.home = async () => {
  const [att, mis, rec, logs, maps, plans, classes, daily, vids] = await Promise.all(["attempts", "mistakes", "recoveries", "xpLog", "maps", "plans"].map(c => DB.list(c)).concat([DB.list("classes", true), DB.list("daily"), DB.list("videos", true)]));
  const st = topicStats(att), weak = weakTopics(st), l = lvl(U.xp || 0), pc = Math.round(((U.xp || 0) - lvlStart(l)) / (lvlStart(l + 1) - lvlStart(l)) * 100);
  const done = daily.some(d => d.day === dayKey()), mastery = st.length ? Math.round(st.reduce((s, x) => s + x.mastery, 0) / st.length) : 0, unfixed = mis.filter(m => !m.fixed), D3 = 3 * 864e5;
  const rev = [...new Set([...weak.map(w => w.topic), ...unfixed.filter(m => Date.now() - m.ts < D3).map(m => m.topic), ...rec.filter(r => Date.now() - r.ts >= D3 && !att.some(a => a.topic === r.topic && a.ts > r.ts + D3)).map(r => r.topic)])].slice(0, 4);
  const zs = maps[0] ? mapStates(maps[0], att, rec) : [], nb = zs.length ? nextBest(zs) : null, prev = zs.flatMap(z => z.nodes).filter(n => n.state !== "mast").slice(0, 4);
  const plan = plans[0]?.days?.find(d => d.date === dayKey()), nextCls = classes.filter(c => new Date(c.when) > Date.now() - 36e5).sort((a, b) => a.when.localeCompare(b.when))[0];
  const days = [...Array(7)].map((_, i) => { const d = dayKey(new Date(Date.now() - (6 - i) * 864e5)); return [d.slice(8), logs.filter(x => dayKey(new Date(x.ts)) === d).reduce((s, x) => s + x.xp, 0)]; }), mx = Math.max(10, ...days.map(d => d[1]));
  const bd = BADGES.filter(b => U.badges?.[b.id]);
  $("#view").innerHTML = `<h1 class="fadeup">${t("hi")}, ${esc(U.name.split(" ")[0])} 👋</h1><p class="mu">${U.streak ? `${U.streak}-day streak, keep it going 🔥` : "Let's start a streak today 🔥"}</p>
  ${!att.length ? `<div class="card soft fadeup"><h2>Do this first 🚀</h2><p class="mu">Two quick ways to get going:</p><div class="row"><button class="btn" data-a="dock" data-v="tutor">Ask the tutor</button><a class="btn ghost" href="#/quizzes">2-minute starter quiz</a></div></div>` : ""}
  <div class="grid g2"><div class="card fadeup"><div class="row sp"><h3>Level ${l} · ${lvlName(l)}</h3><a href="#/rewards">Rewards</a></div><div class="bar" style="margin:10px 0"><i style="width:${pc}%"></i></div><p class="small mu">${U.xp || 0} XP · ${lvlStart(l + 1) - (U.xp || 0)} XP to Level ${l + 1}</p></div>
   <div class="card fadeup"><div class="row sp"><h3>⚡ Daily challenge</h3><span class="chip ${done ? "ok" : "wn"}">${done ? "Done" : "Not started"}</span></div><p class="small mu">5 questions · 5 minutes · keeps your streak alive</p><a class="btn sm" href="#/challenge">${done ? "See result" : "Start"}</a></div></div>
  <div class="grid g3"><div class="card center"><div class="big">${att.length}</div>Questions attempted</div><div class="card center"><div class="big">${mastery}%</div>Knowledge mastery</div><div class="card center"><div class="big">${bd.length}/${BADGES.length}</div>Badges</div></div>
  <div class="card"><div class="row sp"><h3>🗺️ Your path</h3><a href="#/map">Continue your path</a></div>${prev.length ? `<div class="path" style="flex-direction:row;flex-wrap:wrap">${prev.map(n => `<div class="node n-${n.state}" style="margin:0;cursor:default"><span class="ni">${NODE[n.state][0]}</span><span>${esc(n.name)}<small>${NODE[n.state][1]}</small></span></div>`).join("")}</div>${nb ? `<p class="small">Next best node: <b>${esc(nb.name)}</b> <button class="chip" data-a="nquiz" data-v="${esc(nb.name)}">Go</button></p>` : ""}` : `<p class="mu">Make a map for any subject.</p><a class="btn sm" href="#/map">Create map</a>`}</div>
  <div class="grid g2"><div class="card"><h3>⚠️ Weak topics</h3>${weak.length ? weak.slice(0, 3).map(w => `<div class="row sp" style="margin:8px 0"><span>${esc(w.topic)} <span class="chip er">${w.mastery}%</span></span><a class="btn sm" href="#/recover?topic=${encodeURIComponent(w.topic)}">Start recovery</a></div>`).join("") : `<p class="mu">No weak topics yet. Keep practising!</p>`}</div>
   <div class="card"><h3>🔄 Revise today</h3>${rev.length ? rev.map(r => `<div class="row sp" style="margin:8px 0"><span>${esc(r)}</span><button class="chip" data-a="nquiz" data-v="${esc(r)}">Revise</button></div>`).join("") : `<p class="mu">Nothing to revise 🎉</p>`}</div></div>
  <div class="grid g2"><div class="card"><h3>📒 Mistake Notebook</h3><p><b class="big">${unfixed.length}</b> to fix</p><a class="btn sm ghost" href="#/mistakes">Review mistakes</a></div>
   <div class="card"><h3>📅 Today's plan</h3>${plan ? plan.items.map(i => `<p class="small">• ${esc(i.topic)}: ${esc(i.task)} (${i.mins} min)</p>`).join("") : `<p class="mu small">No plan yet.</p><a class="btn sm ghost" href="#/planner">Make a plan</a>`}${U.exam ? `<p class="chip wn">${esc(U.examName || "Exam")}: ${fmtDate(U.exam)}</p>` : ""}</div></div>
  <div class="grid g2"><div class="card"><h3>👩‍🏫 Next live class</h3>${nextCls ? `<p><b>${esc(nextCls.title)}</b><br><span class="small mu">${esc(nextCls.subject)} · ${new Date(nextCls.when).toLocaleString()}</span></p><a class="btn sm" href="#/classes">Join</a>` : `<p class="mu small">No class scheduled.</p>`}</div>
   <div class="card"><h3>🎬 Recommended</h3>${weak[0] ? `<p class="small">A short lesson on <b>${esc(weak[0].topic)}</b></p><a class="btn sm" href="#/videos?ai=${encodeURIComponent(weak[0].topic)}">Watch AI lesson</a>` : vids[0] ? `<p class="small"><b>${esc(vids[0].title)}</b></p><a class="btn sm" href="#/videos">Watch</a>` : `<p class="mu small">Videos appear here.</p>`}</div></div>
  <div class="card"><h3>XP this week</h3><div class="bars">${days.map(d => `<div style="height:${Math.max(4, d[1] / mx * 100)}%" title="${d[1]} XP"></div>`).join("")}</div><div class="row sp small mu">${days.map(d => `<span>${d[0]}</span>`).join("")}</div></div>
  <div class="card"><h3>🏅 Recent achievements</h3>${logs.length || bd.length ? `<div class="row">${bd.slice(-4).map(b => `<span class="chip pk">${b.ic} ${b.name}</span>`).join("")}</div>${logs.slice(0, 3).map(x => `<p class="small">+${x.xp} XP · ${esc(x.label)} <span class="mu">${fmtDate(x.ts)}</span></p>`).join("")}` : `<p class="mu">Finish a quiz to earn your first XP.</p>`}</div>`;
};

/* ===== PROGRESS / KNOWLEDGE ANALYSIS ===== */
PAGES.progress = async () => {
  const att = await DB.list("attempts"), st = topicStats(att).sort((a, b) => a.mastery - b.mastery);
  if (!st.length) return $("#view").innerHTML = `<h1>Progress 📊</h1>` + empty("Nothing to analyse yet. Take a quiz first!", `<a class="btn" href="#/quizzes">Take a quiz</a>`);
  const rec = await DB.list("recoveries"), rm = Object.fromEntries(rec.map(r => [r.topic.toLowerCase(), r]));
  $("#view").innerHTML = `<h1>Progress 📊</h1><p class="mu">Mastery = how many you get right. Confidence = accuracy + consistency + speed.</p>
  <div class="card"><table class="tbl"><tr><th>Topic</th><th>Mastery</th><th>Confidence</th><th>Status</th><th></th></tr>${st.map(s => { const sx = nodeState(s, rm[s.topic.toLowerCase()]); return `<tr><td><b>${esc(s.topic)}</b><br><span class="small mu">${s.n} attempts</span></td><td style="min-width:110px">${s.mastery}%<div class="bar"><i style="width:${s.mastery}%"></i></div></td><td>${confLabel(s.conf)} (${s.conf})</td><td><span class="chip ${sx === "weak" ? "er" : sx === "mast" ? "ok" : sx === "rec" ? "ok" : "wn"}">${NODE[sx][0]} ${NODE[sx][1]}</span></td><td><a class="chip" href="#/recover?topic=${encodeURIComponent(s.topic)}">Fix</a></td></tr>`; }).join("")}</table></div>
  <div class="card"><h3>AI revision advice</h3><div id="adv"><button class="btn" data-a="advice">Get advice</button></div></div>`;
  A.advice = async () => { $("#adv").innerHTML = loadingCard("Reading your results…"); try { $("#adv").innerHTML = md(await AI.call(AI.TUTOR, [{ role: "user", content: "Give short, encouraging revision advice (max 6 lines) in " + (U.medium === "Tamil" ? "Tamil" : "English") + " for these topic results and suggest what to study first: " + JSON.stringify(st.map(s => ({ topic: s.topic, mastery: s.mastery, confidence: s.conf }))) }])); } catch (e) { $("#adv").innerHTML = errCard(e, "advice"); } };
};

/* ===== DAILY CHALLENGE ===== */
PAGES.challenge = async () => {
  const d = await DB.list("daily"), td = d.find(x => x.day === dayKey());
  $("#view").innerHTML = `<h1>⚡ Daily 5-minute challenge</h1><div class="card center fadeup">${mascot(90, "bob")}${td ? `<h2>Done for today! 🎉</h2><p>You scored <b>${td.score}/${td.total}</b>. Come back tomorrow.</p><a class="btn" href="#/mistakes">Fix mistakes</a>` : `<h2>5 questions from your weak topics</h2><p class="mu">One fresh topic is mixed in. Missing a day is okay, you get one streak freeze a week ❄️</p><button class="btn" data-a="startDaily">Start challenge</button>`}</div>`;
};
A.startDaily = async () => {
  const att = await DB.list("attempts"), st = topicStats(att); let topics = weakTopics(st).slice(0, 4).map(s => s.topic);
  if (!topics.length) topics = st.sort((a, b) => a.mastery - b.mastery).slice(0, 3).map(s => s.topic);
  if (!topics.length && U.topic) topics = [U.topic];
  if (!topics.length) { const t0 = prompt("Type any topic or subject for your first challenge"); if (!t0) return; topics = [t0.trim()]; }
  const go = async () => {
    $("#view").innerHTML = loadingCard("Building today's challenge…");
    try {
      const qs = await AI.questions({ topic: `Make a mixed set from these topics: ${topics.join("; ")}. Make 4 questions from them and the last 1 on a fresh related topic the student hasn't practised. Each question's "topic" field must be its own topic name.`, n: 5, types: ["mcq"], lang: U.medium });
      runQuiz({ title: "Daily challenge", total: qs.length, source: i => qs[i], save: false, xpType: "daily", retry: go, onFinish: async r => { await DB.add("daily", { day: dayKey(), score: r.score, total: r.n }); $("#after").innerHTML = `<div class="card center"><h3>Challenge complete! 🔥</h3><a class="btn" href="#/mistakes">Fix mistakes</a></div>`; confetti(); } });
    } catch (e) { A.retry = go; $("#view").innerHTML = errCard(e); }
  }; go();
};

/* ===== MISTAKE NOTEBOOK + FLASHCARDS ===== */
let MIS = [], MF = {};
PAGES.mistakes = async p => { MIS = await DB.list("mistakes"); MF = { topic: p.get("topic") || "", subject: "", status: "" }; renderMis(); };
function renderMis() {
  const tops = [...new Set(MIS.map(m => m.topic))], subs = [...new Set(MIS.map(m => m.subject).filter(Boolean))];
  const list = MIS.filter(m => (!MF.topic || m.topic === MF.topic) && (!MF.subject || m.subject === MF.subject) && (!MF.status || (MF.status === "fixed") === !!m.fixed));
  const sel = (id, arr, cur, all) => `<select id="${id}" style="width:auto" aria-label="${all}"><option value="">${all}</option>${arr.map(x => `<option ${x === cur ? "selected" : ""}>${esc(x)}</option>`).join("")}</select>`;
  $("#view").innerHTML = `<h1>Mistake Notebook 📒</h1>` + (!MIS.length ? empty("No mistakes yet. Wrong answers land here automatically.", `<a class="btn" href="#/quizzes">Take a quiz</a>`) :
   `<div class="row">${sel("ft", tops, MF.topic, "All topics")}${sel("fs", subs, MF.subject, "All subjects")}<select id="fst" style="width:auto"><option value="">All</option><option value="open" ${MF.status === "open" ? "selected" : ""}>To fix</option><option value="fixed" ${MF.status === "fixed" ? "selected" : ""}>Fixed</option></select><button class="btn sm" data-a="mcards">Make flashcards</button></div>
   ${list.map(m => `<div class="card fadeup"><div class="row sp"><label class="row" style="margin:0"><input type="checkbox" class="mk" value="${m.id}" style="width:22px;min-height:22px">${esc(m.topic)}</label><span class="chip ${m.fixed ? "ok" : "er"}">${m.fixed ? "Fixed ✓" : `Fix ${m.fixedCount || 0}/2`}</span></div><h3 style="margin:8px 0">${esc(m.q)}</h3><p class="small">Your answer: <b>${esc(m.my || "—")}</b><br>Correct: <b>${esc(correctText(m))}</b></p>
   ${m.exp ? `<p class="fb good small">${esc(m.exp)}</p>` : `<button class="chip" data-a="mexp" data-v="${m.id}">Explain with AI</button>`}<div class="row sp"><span class="small mu">${fmtDate(m.ts)}</span><button class="btn sm ghost" data-a="mretry" data-v="${m.id}">Try again</button></div></div>`).join("") || `<p class="mu">Nothing matches these filters.</p>`}`);
  ["ft", "fs", "fst"].forEach(id => { const e = $("#" + id); if (e) e.onchange = () => { MF = { topic: $("#ft").value, subject: $("#fs").value, status: $("#fst").value }; renderMis(); }; });
}
A.mexp = async (id, b) => { const m = MIS.find(x => x.id === id); b.disabled = true; b.textContent = "Thinking…"; try { m.exp = await AI.explain(m, m.my); await DB.upd("mistakes", id, { exp: m.exp }); renderMis(); } catch (e) { b.disabled = false; b.textContent = "Retry"; toast(e.message, "bad"); } };
A.mretry = id => {
  const m = MIS.find(x => x.id === id);
  modal(`<h2>${esc(m.q)}</h2>${m.o ? m.o.map((x, i) => `<button class="opt" data-a="mans" data-v="${id}:${i}"><b>${"ABCD"[i]}</b>${esc(x)}</button>`).join("") : `<textarea id="ma"></textarea><button class="btn" data-a="mshort" data-v="${id}">Check</button>`}<div id="mr"></div>`);
};
async function mFix(m, ok) {
  $("#mr").innerHTML = `<div class="fb ${ok ? "good" : "bad"}">${ok ? "Correct! 🎉" : "Not yet. Correct: " + esc(correctText(m))}</div><button class="btn block" data-a="closeModal">Close</button>`;
  if (ok) { m.fixedCount = (m.fixedCount || 0) + 1; m.fixed = m.fixedCount >= 2; await DB.upd("mistakes", m.id, { fixedCount: m.fixedCount, fixed: m.fixed }); await logAttempt(m.topic, m.subject, true, 10000, { type: "retry" }); if (m.fixed) { confetti(80); await award("fixed", 5, "Mistake fixed"); } renderMisSoft(); }
}
const renderMisSoft = () => setTimeout(() => { if (location.hash.startsWith("#/mistakes")) { renderMis(); } }, 50);
A.mans = v => { const [id, i] = v.split(":"), m = MIS.find(x => x.id === id); $$(".opt").forEach(b => b.disabled = true); mFix(m, +i === m.a); };
A.mshort = async (id, b) => { const m = MIS.find(x => x.id === id), a = $("#ma").value.trim(); if (!a) return; b.disabled = true; try { mFix(m, !!(await AI.judge(m, a)).correct); } catch (e) { b.disabled = false; toast(e.message, "bad"); } };
A.mcards = () => {
  let ids = $$(".mk:checked").map(c => c.value), cards = MIS.filter(m => ids.length ? ids.includes(m.id) : !m.fixed); if (!cards.length) return toast("Pick some mistakes first", "bad");
  let i = 0, x0 = 0;
  const draw = () => { if (i >= cards.length) return modal(`<div class="center">${mascot(90, "bob")}<h2>Deck finished! 🎉</h2><button class="btn" data-a="closeModal">Done</button></div>`);
    const c = cards[i]; modal(`<p class="small mu">Card ${i + 1} of ${cards.length} · tap to flip, swipe or press a button</p><div class="flash" id="fc"><div><div class="f">${esc(c.q)}</div><div class="f b"><span><b>${esc(correctText(c))}</b><br><small>${esc(c.exp || "")}</small></span></div></div></div>
     <div class="row" style="justify-content:center;margin-top:16px"><button class="btn ghost" data-a="fcard" data-v="0">Again</button><button class="btn" data-a="fcard" data-v="1">Got it</button></div>`);
    const f = $("#fc"); f.onclick = () => f.classList.toggle("flip"); f.ontouchstart = e => x0 = e.touches[0].clientX; f.ontouchend = e => { const d = e.changedTouches[0].clientX - x0; if (Math.abs(d) > 60) A.fcard(d > 0 ? "1" : "0"); }; };
  A.fcard = async v => { const c = cards[i]; await DB.upd("mistakes", c.id, { box: v === "1" ? (c.box || 0) + 1 : 0, due: Date.now() + (v === "1" ? 3 : 0.3) * 864e5 }); i++; draw(); };
  draw();
};

/* ===== RECOVERY LOOP (main USP) ===== */
PAGES.recover = async p => {
  const att = await DB.list("attempts"), st = topicStats(att), weak = weakTopics(st), topic = p.get("topic");
  if (topic) return recStart(topic);
  $("#view").innerHTML = `<h1>Recovery Loop 🔁</h1><p class="mu">Pick a weak topic. AI explains it, you explain it back, then a quick check.</p><div class="card">${weak.length ? `<h3>Your weak topics</h3><div class="row">${weak.map(w => `<button class="chip er" data-a="recGo" data-v="${esc(w.topic)}">${esc(w.topic)} · ${w.mastery}%</button>`).join("")}</div>` : `<p class="mu">No weak topics yet. You can still recover any topic:</p>`}
  <label for="rt">Or type any topic</label><div class="row"><input id="rt" style="flex:1" placeholder="e.g. Loops, மின்னோட்டம்"><button class="btn" data-a="recGo">Start</button></div></div>`;
};
A.recGo = v => { const t0 = v || $("#rt").value.trim(); if (t0.length < 2) return toast("Type a topic first", "bad"); location.hash = "#/recover?topic=" + encodeURIComponent(t0); };
async function recStart(topic) {
  const st = topicStats(await DB.list("attempts")).find(s => s.topic.toLowerCase() === topic.toLowerCase()), before = st ? st.mastery : 0, lang = U.medium === "Tamil" ? "Tamil" : "English";
  const go = async () => {
    $("#view").innerHTML = loadingCard(`Let's fix ${topic} 💪`);
    try {
      const ex = await AI.call(AI.TUTOR, [{ role: "user", content: `Explain "${topic}" very simply in ${lang} for a class ${U.cls} student. Use a short real-life example. Keep it under 150 words.` }]);
      $("#view").innerHTML = `<h1>Let's fix ${esc(topic)} 💪</h1><div class="card"><span class="chip">Step 1 · Learn</span><p>${md(ex)}</p><div class="row"><button class="chip" data-a="rspeak">🔊 Read aloud</button><a class="chip" href="#/videos?ai=${encodeURIComponent(topic)}">🎬 Watch video</a></div></div>
      <div class="card"><span class="chip">Step 2 · Explain it back</span><h3 style="margin:10px 0">Now explain it in your own words</h3><textarea id="eb"></textarea><div class="row" style="margin-top:8px"><button class="round" id="mic">🎤</button><button class="btn" data-a="recCheck">Check my explanation</button></div><div id="ebr"></div></div><div id="step3"></div>`;
      A.rspeak = () => speak(ex, lang); $("#mic").onclick = () => listen($("#eb"), U.medium);
      A.recCheck = async (_, b) => { const a = $("#eb").value.trim(); if (a.length < 10) return toast("Write a bit more (a sentence or two)", "bad"); b.disabled = true; b.textContent = "Reading…";
        try { const j = await evalExplain(topic, a); $("#ebr").innerHTML = explainHTML(j); b.textContent = "Check again"; b.disabled = false;
          $("#step3").innerHTML = `<div class="card center"><span class="chip">Step 3 · Check questions</span><p>${j.score === "Not yet" ? "No stress. Read the explanation once more, then try 3 questions." : "Ready for 3 quick questions?"}</p><button class="btn" data-a="recQ">Start check questions</button></div>`; } catch (e) { b.disabled = false; b.textContent = "Retry"; toast(e.message, "bad"); } };
      A.recQ = async () => { $("#view").innerHTML = loadingCard("New questions coming…");
        try { const qs = await AI.questions({ topic, n: 3, types: ["mcq"], lang }); runQuiz({ title: "Check: " + topic, topic, total: qs.length, source: i => qs[i], xp: false, save: false, onFinish: async r => {
          const after = r.pct, better = after > before; await DB.add("recoveries", { topic, before, after, revise: Date.now() + 3 * 864e5 });
          if (after > 50 && better) { await award("recover", 50, "Recovered: " + topic); confetti(220); }
          $("#after").innerHTML = `<div class="card center"><h2>Before vs After</h2><div class="grid g2"><div class="card soft"><div class="big">${before}%</div>Before</div><div class="card soft"><div class="big">${after}%</div>After</div></div><p>${better ? "You improved! 🎉 We'll bring this back in 3 days to lock it in." : "Not there yet. Try again after reading the explanation 💪"}</p><button class="btn" data-a="retry">Try again</button></div>`; } }); } catch (e) { A.retry = go; $("#view").innerHTML = errCard(e); } };
    } catch (e) { A.retry = go; $("#view").innerHTML = errCard(e); }
  }; go();
}
