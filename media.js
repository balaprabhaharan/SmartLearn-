/* media.js – Video library (teacher uploads), AI Video Lessons (narrated scene player) and the Teacher Studio */
let VIDS = [], TAB = "lib";
PAGES.videos = async p => {
  VIDS = await DB.list("videos", true); const ai = p.get("ai"); TAB = p.get("tab") || (ai ? "ai" : "lib"); const saved = await DB.list("lessons");
  $("#view").innerHTML = `<h1>Videos 🎬</h1><div class="row"><button class="chip ${TAB === "lib" ? "sel" : ""}" data-a="vtab" data-v="lib">Class videos</button><button class="chip ${TAB === "ai" ? "sel" : ""}" data-a="vtab" data-v="ai">AI video lessons</button></div><div id="vb" style="margin-top:14px"></div>`;
  A.vtab = v => { location.hash = "#/videos?tab=" + v; };
  if (TAB === "lib") {
    const subs = [...new Set(VIDS.map(v => v.subject).filter(Boolean))];
    $("#vb").innerHTML = VIDS.length ? `<div class="row"><select id="vf" style="width:auto"><option value="">All subjects</option>${subs.map(s => `<option>${esc(s)}</option>`).join("")}</select><input id="vs" placeholder="Search videos" style="max-width:260px"></div><div class="grid g3" id="vg" style="margin-top:12px"></div>` :
      empty("No videos yet. Teachers can upload lessons from Teacher Studio.", U.role !== "student" ? `<a class="btn" href="#/teacher">Upload a video</a>` : "");
    const draw = () => { const s = ($("#vs")?.value || "").toLowerCase(), f = $("#vf")?.value || ""; $("#vg").innerHTML = VIDS.filter(v => (!f || v.subject === f) && (v.title + v.desc).toLowerCase().includes(s)).map(v => `<button class="topic lift" data-a="vplay" data-v="${v.id}"><div class="vthumb">▶️</div><b>${esc(v.title)}</b><span class="row"><span class="chip">${esc(v.subject || "General")}</span><span class="small mu">Class ${esc(v.cls || "")} · ${esc(v.host || "")}</span></span></button>`).join("") || `<p class="mu">No match.</p>`; };
    if (VIDS.length) { draw(); $("#vf").onchange = draw; $("#vs").oninput = draw; }
  } else {
    $("#vb").innerHTML = `<div class="card soft"><h2>Any topic → narrated lesson</h2><label for="lt">Topic or notes</label><textarea id="lt" placeholder="e.g. Ohm's law, ஒளிச்சேர்க்கை, or paste notes">${esc(ai || "")}</textarea>
    <div class="grid g2"><div><label for="ll">Language</label><select id="ll"><option ${U.medium === "Tamil" ? "selected" : ""}>Tamil</option><option ${U.medium !== "Tamil" ? "selected" : ""}>English</option></select></div><div><label for="ln">Length</label><select id="ln"><option value="1">1 minute</option><option value="3" selected>3 minutes</option><option value="5">5 minutes</option></select></div></div>
    <div class="err" id="le"></div><button class="btn" data-a="mklesson">Make my lesson</button></div><div id="lp"></div>
    ${saved.length ? `<h3>Saved lessons</h3><div class="row">${saved.map(s => `<button class="chip" data-a="openSaved" data-v="${s.id}">${esc(s.lesson.title)}</button>`).join("")}</div>` : ""}`;
    A.openSaved = id => lessonPlayer(saved.find(s => s.id === id).lesson, saved.find(s => s.id === id).topic);
    if (ai) A.mklesson();
  }
};
A.vplay = async id => {
  const v = VIDS.find(x => x.id === id); modal(`<h2>${esc(v.title)}</h2><div id="vv">${loadingCard("Loading video…")}</div>`, "wide");
  try { const u = await DB.videoUrl(v); if (!u) throw new Error("Video file not found on this device."); $("#vv").innerHTML = `<video controls playsinline src="${u}" id="vp"></video>
    <div class="row sp" style="margin:10px 0"><span class="chip">${esc(v.subject || "")} · Class ${esc(v.cls || "")}</span><label class="row small" style="margin:0">Speed <select id="vsp" style="width:auto;min-height:36px">${[.75, 1, 1.25, 1.5, 2].map(s => `<option ${s == 1 ? "selected" : ""}>${s}</option>`).join("")}</select></label></div>
    <p class="mu">${esc(v.desc || "")}</p><div class="card soft"><h3>🤔 Ask AI about this video</h3><div class="row"><input id="vq" style="flex:1" placeholder="Any doubt?"><button class="btn sm" data-a="vask" data-v="${id}">Ask</button></div><div id="va"></div></div>`;
    $("#vsp").onchange = e => $("#vp").playbackRate = +e.target.value;
    $("#vp").onended = async () => { const logs = await DB.list("xpLog"); if (!logs.some(l => l.type === "video" && l.vid === id)) award("video", 10, "Watched: " + v.title, { vid: id }); };
  } catch (e) { $("#vv").innerHTML = errCard(e, "closeModal"); }
};
A.vask = async (id, b) => { const v = VIDS.find(x => x.id === id), q = $("#vq").value.trim(); if (q.length < 3) return; b.disabled = true; $("#va").innerHTML = `<div class="dots"><i></i><i></i><i></i></div>`;
  try { $("#va").innerHTML = `<div class="msg a" style="max-width:100%">${md(await AI.call(AI.TUTOR, [{ role: "user", content: `I'm watching a class video titled "${v.title}" (${v.subject}). Description: ${v.desc}. My doubt: ${q}` }]))}</div>`; award("tutor", 3, "Video doubt"); } catch (e) { $("#va").innerHTML = `<p class="fb bad">${esc(e.message)}</p>`; } b.disabled = false; };

/* ----- AI video lessons ----- */
A.mklesson = async (_, b) => {
  const topic = $("#lt").value.trim(), lang = $("#ll").value, len = $("#ln").value; if (topic.length < 3) return $("#le").textContent = "Type a topic or paste some notes first.";
  if (topic.length > 8000) return $("#le").textContent = "That's too long for one lesson. Trim it a bit.";
  const key = `sl_lesson_${lang}_${len}_${topic.toLowerCase().slice(0, 80)}`, cached = localStorage.getItem(key);   // cached per topic+language+length
  if (cached) return lessonPlayer(JSON.parse(cached), topic);
  if (b) b.disabled = true; $("#lp").innerHTML = loadingCard("Writing your lesson script…");
  try {
    const n = { 1: 3, 3: 5, 5: 7 }[len];
    const j = await AI.json(`You write short narrated explainer lessons for Tamil Nadu State Board students (class ${U.cls}). Language: ${lang}. Return {"title":"","scenes":[{"title":"","narration":"1-3 spoken sentences","points":["short on-screen key point"],"diagram":"describe one simple diagram or animation","emoji":"one emoji"}],"recap":"one final recap question","check":[{"q":"","o":["","","",""],"a":0,"exp":""}]}. Exactly ${n} scenes and 3 check MCQs.`, "Topic or notes: " + topic);
    if (!j.scenes?.length) throw new Error("The lesson came out empty. Try again.");
    localStorage.setItem(key, JSON.stringify(j)); lessonPlayer(j, topic);
  } catch (e) { $("#lp").innerHTML = errCard(e, "mklesson"); } if (b) b.disabled = false;
};
function lessonPlayer(L, topic) {
  let i = 0, rate = 1, play = false, cap = true; const lang = $("#ll")?.value || U.medium, S = L.scenes;
  const draw = () => { const s = S[i];
    $("#lp").innerHTML = `<div class="card"><div class="row sp"><h3>${esc(L.title)}</h3><span class="chip wn">AI-generated, may contain mistakes</span></div><div class="bar" style="margin:10px 0"><i style="width:${(i + 1) / S.length * 100}%"></i></div>
     <div class="scene" id="sc" tabindex="0"><div style="font-size:3rem">${esc(s.emoji || "📘")}</div><h2>${esc(s.title)}</h2><div>${(s.points || []).map(p => `<span class="pt">${esc(p)}</span>`).join("")}</div><div class="diag">🖼️ ${esc(s.diagram || "")}</div>${cap ? `<p class="mu" aria-live="polite">${esc(s.narration)}</p>` : ""}</div>
     <div class="row" style="justify-content:center;margin-top:12px"><button class="round" data-a="lprev" aria-label="Previous">◀</button><button class="round go" data-a="lplay" aria-label="Play or pause">${play ? "⏸" : "▶"}</button><button class="round" data-a="lnext" aria-label="Next">▶|</button><button class="chip" data-a="lrep">↺ Replay</button>
     <select id="lsp" aria-label="Speed" style="width:auto;min-height:40px">${[.75, 1, 1.25, 1.5].map(r => `<option ${r == rate ? "selected" : ""}>${r}</option>`).join("")}</select><button class="chip ${cap ? "sel" : ""}" data-a="lcap">CC</button></div>
     <div class="row" style="margin-top:12px"><button class="chip" data-a="lsave">💾 Save</button><button class="chip" data-a="lreport">🚩 Report an error</button></div></div>`;
    $("#lsp").onchange = e => { rate = +e.target.value; if (play) say(); }; let x0 = 0; $("#sc").ontouchstart = e => x0 = e.touches[0].clientX; $("#sc").ontouchend = e => { const d = e.changedTouches[0].clientX - x0; if (Math.abs(d) > 60) go(i + (d < 0 ? 1 : -1)); }; };
  const say = () => speak(S[i].narration, lang, rate, () => { if (play) { if (i < S.length - 1) { i++; draw(); say(); } else { play = false; speechSynthesis.cancel(); finish(); } } });
  const go = n => { if (n >= S.length) { speechSynthesis.cancel(); play = false; return finish(); } i = Math.max(0, n); draw(); if (play) say(); };
  const finish = () => { $("#lp").innerHTML = `<div class="card center fadeup">${mascot(80, "bob")}<h2>Lesson done! 🎉</h2><p class="mu">${esc(L.recap || "")}</p><p><b>Now explain it in your own words.</b></p><button class="btn" data-a="lexp">Explain it back</button> <button class="btn ghost" data-a="lchk">3 check questions</button></div>`; };
  A.lprev = () => go(i - 1); A.lnext = () => go(i + 1); A.lrep = () => { i = 0; play = true; draw(); say(); }; A.lcap = () => { cap = !cap; draw(); };
  A.lplay = () => { play = !play; if (play) say(); else speechSynthesis.cancel(); draw(); };
  A.lsave = async () => { await DB.add("lessons", { topic, lesson: L }); toast("Lesson saved 💾"); };
  A.lreport = async () => { const r = prompt("What's wrong in this lesson?"); if (r) { await DB.add("reports", { kind: "lesson", topic, note: r.slice(0, 500) }); toast("Thanks, we'll review it."); } };
  A.lexp = () => openPanel("explain", topic);
  A.lchk = () => { const qs = (L.check || []).map(AI.fixQ).filter(Boolean); if (!qs.length) return toast("No check questions in this lesson", "bad"); runQuiz({ title: "Check: " + L.title, topic, total: qs.length, source: k => qs[k], xpType: "lesson", save: false }); };
  draw();
}

/* ===== TEACHER STUDIO: video upload, classes, doubts, class analytics ===== */
PAGES.teacher = async () => {
  if (U.role === "student") return $("#view").innerHTML = `<h1>Teacher Studio 🎓</h1>` + empty("Only verified teachers and admins can open this page.", `<p class="small mu">Demo mode: log in as teacher@smartlearn.app / teach1234. With Firebase, set <code>role</code> to "teacher" in the user's Firestore document.</p>`);
  const [vids, classes, doubts, users, att] = await Promise.all([DB.list("videos"), DB.list("classes"), DB.list("doubts", true), DB.listUsers(), DB.list("attempts", true)]);
  const stu = users.filter(u => u.role === "student").map(u => { const a = att.filter(x => x.uid === u.uid); return { ...u, m: a.length ? Math.round(a.filter(x => x.ok).length / a.length * 100) : null, n: a.length }; });
  const st = topicStats(att).sort((a, b) => a.mastery - b.mastery), avg = stu.filter(s => s.m != null).length ? Math.round(stu.filter(s => s.m != null).reduce((s, x) => s + x.m, 0) / stu.filter(s => s.m != null).length) : 0;
  $("#view").innerHTML = `<h1>Teacher Studio 🎓</h1>
  <div class="card soft"><h2>⬆️ Upload a video lesson</h2><div class="grid g2"><div><label for="vt">Title</label><input id="vt" maxlength="90"></div><div><label for="vsu">Subject</label><input id="vsu" placeholder="Maths, Physics…"></div><div><label for="vc">Class</label><select id="vc"><option>9</option><option selected>10</option><option>11</option><option>12</option></select></div></div>
   <label for="vd">Description</label><textarea id="vd"></textarea><div class="upl" style="margin-top:12px"><input type="file" id="vf2" accept="video/mp4,video/webm,video/quicktime"><p class="small mu">MP4, WebM or MOV · up to 500 MB</p></div><div class="bar" style="margin-top:10px;display:none" id="vpb"><i style="width:0"></i></div><div class="err" id="ve"></div><button class="btn" data-a="upload">Upload video</button></div>
  <div class="card"><h3>My uploads</h3>${vids.length ? vids.map(v => `<div class="row sp rev"><span><b>${esc(v.title)}</b> <span class="chip">${esc(v.subject || "")}</span></span><span><button class="chip" data-a="vplay" data-v="${v.id}">Play</button> <button class="chip er" data-a="vdel" data-v="${v.id}">Delete</button></span></div>`).join("") : `<p class="mu">No videos yet.</p>`}</div>
  <div class="card"><h3>📅 Create live class</h3><div class="grid g2"><div><label for="ct">Title</label><input id="ct"></div><div><label for="cs">Subject</label><input id="cs"></div><div><label for="cc">Class</label><select id="cc"><option>9</option><option selected>10</option><option>11</option><option>12</option></select></div><div><label for="cw">Date & time</label><input type="datetime-local" id="cw"></div></div><div class="err" id="ce"></div><button class="btn" data-a="mkclass">Schedule class</button>
   ${classes.map(c => `<div class="row sp rev"><span>${esc(c.title)} · ${new Date(c.when).toLocaleString()}</span><button class="chip er" data-a="cdel" data-v="${c.id}">Cancel</button></div>`).join("")}</div>
  <div class="card"><h3>🙋 Doubt-session requests</h3>${doubts.filter(d => d.status === "pending").map(d => `<div class="rev"><b>${esc(d.name)}</b> needs help with <b>${esc(d.topic)}</b><br><span class="small mu">${esc(d.msg || "")}</span><div class="row"><button class="btn sm" data-a="dacc" data-v="${d.id}">Accept</button><button class="btn sm ghost" data-a="ddec" data-v="${d.id}">Decline</button></div></div>`).join("") || `<p class="mu">No pending requests.</p>`}</div>
  <div class="card"><h3>📊 Class analytics</h3><div class="grid g3"><div class="card center"><div class="big">${avg}%</div>Average mastery</div><div class="card center"><div class="big">${stu.length}</div>Students</div><div class="card center"><div class="big">${stu.filter(s => s.m != null && s.m < 50).length}</div>Below 50%</div></div>
   <h3>Weakest topics</h3>${st.length ? `<div class="heat">${st.slice(0, 12).map(s => `<div style="background:${s.mastery < 50 ? "#FCE7F3" : s.mastery < 80 ? "#FEF3C7" : "#D1FAE5"}">${s.mastery < 50 ? "⚠️" : s.mastery < 80 ? "✏️" : "★"} ${esc(s.topic)}<br>${s.mastery}%</div>`).join("")}</div>` : `<p class="mu">Heat map appears when students attempt quizzes.</p>`}
   <h3 style="margin-top:14px">Students below 50%</h3>${stu.filter(s => s.m != null && s.m < 50).map(s => `<p>${esc(s.name)} · <b>${s.m}%</b></p>`).join("") || `<p class="mu">No one is below 50% 🎉</p>`}</div>`;
};
A.upload = async (_, b) => {
  const f = $("#vf2").files[0], t0 = $("#vt").value.trim(), e = $("#ve"); e.textContent = "";
  if (t0.length < 3) return e.textContent = "Add a title (at least 3 letters)."; if (!f) return e.textContent = "Choose a video file."; if (!f.type.startsWith("video/")) return e.textContent = "That isn't a video file.";
  if (f.size > 500 * 1048576) return e.textContent = "Video is over 500 MB. Compress it first.";
  b.disabled = true; b.textContent = "Uploading…"; $("#vpb").style.display = "block";
  try { const up = await DB.uploadVideo(f, p => $("#vpb i").style.width = Math.round(p * 100) + "%");
    await DB.add("videos", { title: t0, subject: $("#vsu").value.trim(), cls: $("#vc").value, desc: $("#vd").value.trim(), host: U.name, size: f.size, ...up }); toast("Video uploaded 🎉"); confetti(80); route(); }
  catch (x) { e.textContent = x.message || "Upload failed. Check your connection and Storage rules."; b.disabled = false; b.textContent = "Upload video"; }
};
A.vdel = async id => { if (confirm("Delete this video?")) { await DB.delVideo((await DB.list("videos")).find(v => v.id === id)); route(); } };
A.mkclass = async () => { const t0 = $("#ct").value.trim(), w = $("#cw").value; if (t0.length < 3 || !w) return $("#ce").textContent = "Add a title and a date & time."; if (new Date(w) < new Date()) return $("#ce").textContent = "Pick a time in the future.";
  await DB.add("classes", { title: t0, subject: $("#cs").value.trim(), cls: $("#cc").value, when: w, room: "SmartLearn-" + rid() + rid(), host: U.name }); toast("Class scheduled 📅"); route(); };
A.cdel = async id => { await DB.del("classes", id); route(); };
A.dacc = async id => { await DB.upd("doubts", id, { status: "accepted", room: "SmartLearn-" + rid() + rid(), by: U.name }); route(); };
A.ddec = async id => { await DB.upd("doubts", id, { status: "declined" }); route(); };
