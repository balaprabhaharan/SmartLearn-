/* tools.js – the AI dock: Tutor chat, Hint ladder, Photo solver, Explain It Back (also used on the full "AI Tutor" page) */
let CHAT = [], HINT = null, PANEL = false;
const dockMap = { tutor: "tutor", hint: "hint", photo: "photo", explain: "explain" };
A.dock = (k, el) => {
  if (dockMap[k]) return openPanel(k);
  if (k === "quiz") return location.hash = "#/quizzes"; if (k === "video") return location.hash = "#/videos?tab=ai"; if (k === "map") return location.hash = "#/map"; if (k === "recover") return location.hash = "#/recover";
};
A.closePanel = () => { $("#panel").innerHTML = ""; PANEL = false; };
function openPanel(tab, prefill) { $("#panel").innerHTML = `<div class="panel" role="dialog" aria-label="AI tools"><div class="row sp"><h3>✨ AI help</h3><button class="x" style="position:static" data-a="closePanel" aria-label="Close">✕</button></div><div id="pbody" style="display:flex;flex-direction:column;flex:1;min-height:0"></div></div>`; PANEL = true; aiTools($("#pbody"), tab, prefill); }
PAGES.tutor = async p => { $("#view").innerHTML = `<h1>AI Tutor 💬</h1><p class="mu">Ask anything in Tamil, English or Tanglish.</p><div class="card" style="height:70vh;display:flex;flex-direction:column" id="tbody"></div>`; aiTools($("#tbody"), p.get("tab") || "tutor"); };

function aiTools(el, tab, prefill) {
  const tabs = [["tutor", "💬 Tutor"], ["hint", "💡 Hint mode"], ["photo", "📷 Photo"], ["explain", "🗣️ Explain it back"]];
  el.innerHTML = `<div class="tabrow">${tabs.map(([k, l]) => `<button class="chip ${k === tab ? "sel" : ""}" data-a="ttab" data-v="${k}">${l}</button>`).join("")}</div><div id="tt" style="display:flex;flex-direction:column;flex:1;min-height:0;overflow:auto"></div>`;
  A.ttab = (k, b) => aiTools(el, k);
  const body = $("#tt", el);
  if (tab === "tutor") tutorTab(body, prefill); if (tab === "hint") hintTab(body, prefill); if (tab === "photo") photoTab(body); if (tab === "explain") explainTab(body, prefill);
}
const bubble = (r, t) => `<div class="msg ${r}">${md(t)}</div>`;
function tutorTab(b, prefill) {
  b.innerHTML = `<div class="chat" id="chat">${CHAT.length ? CHAT.map(m => bubble(m.role === "user" ? "u" : "a", m.content)).join("") : `<div class="center">${mascot(70, "bob")}<p class="mu">Ask me anything: "ஒளிச்சேர்க்கை என்றால் என்ன?", "explain Ohm's law", "loops puriyala"</p></div>`}</div>
  <div class="composer"><button class="round" id="tm" aria-label="Speak">🎤</button><textarea id="ti" placeholder="Type your doubt…" rows="1"></textarea><button class="round go" data-a="tsend" aria-label="Send">➤</button></div>`;
  const ch = $("#chat", b); ch.scrollTop = 1e6; $("#tm", b).onclick = () => listen($("#ti", b), U.medium); $("#ti", b).onkeydown = e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); A.tsend(); } };
  if (prefill) { $("#ti", b).value = prefill; }
  A.tsend = async () => {
    const i = $("#ti", b), text = i.value.trim(); if (!text) return; if (text.length > 2000) return toast("Keep it under 2000 characters", "bad");
    if (!CHAT.length) ch.innerHTML = ""; CHAT.push({ role: "user", content: text }); ch.insertAdjacentHTML("beforeend", bubble("u", text)); i.value = ""; ch.insertAdjacentHTML("beforeend", `<div class="msg a" id="wait"><div class="dots"><i></i><i></i><i></i></div></div>`); ch.scrollTop = 1e6;
    try { const r = await AI.tutor(CHAT); CHAT.push({ role: "assistant", content: r }); $("#wait", b).outerHTML = bubble("a", r) + `<div class="row"><button class="chip" data-a="tback">🗣️ Explain it back</button><button class="chip" data-a="tspeak">🔊 Listen</button></div>`; award("tutor", 3, "Asked the tutor"); }
    catch (e) { CHAT.pop(); $("#wait", b).outerHTML = `<div class="msg a">${esc(e.message)}<br><button class="chip" data-a="tretry" data-v="${esc(text)}">Retry</button></div>`; } ch.scrollTop = 1e6;
  };
  A.tretry = v => { $("#ti", b).value = v; A.tsend(); }; A.tspeak = () => speak(CHAT[CHAT.length - 1].content.replace(/[*#]/g, ""), U.medium);
  A.tback = () => aiTools(b.closest("#pbody") || b.closest("#tbody"), "explain", CHAT.filter(m => m.role === "user").pop()?.content.slice(0, 80));
}
/* Hint ladder: Hint 1 nudge → Hint 2 clue → Hint 3 first step → Full solution */
function hintTab(b, prefill) {
  if (!HINT) { b.innerHTML = `<p class="mu small">Type your homework problem. I'll give hints, not the answer. Tap "Next hint" only when stuck.</p><textarea id="hp" placeholder="Paste or type the problem">${esc(prefill || "")}</textarea><button class="btn" data-a="hstart" style="margin-top:10px">Start with a hint</button>`; A.hstart = () => { const p = $("#hp", b).value.trim(); if (p.length < 5) return toast("Add the problem first", "bad"); HINT = { p, level: 0, hints: [] }; nextHint(b); }; return; }
  showHint(b);
}
const HLV = ["Hint 1 (nudge)", "Hint 2 (stronger clue)", "Hint 3 (first step)", "Full solution"];
async function nextHint(b, full) {
  HINT.level = full ? 4 : HINT.level + 1; const lv = Math.min(HINT.level, 4);
  b.innerHTML = loadingCard("Thinking of a hint…");
  const ins = ["Give only a gentle nudge about which concept applies. Do NOT reveal steps or the answer.", "Give a stronger clue (formula or idea to use). Do NOT give the final answer.", "Show only the first step of the solution. Do NOT finish it.", "Give the complete step-by-step solution and final answer."][lv - 1];
  try { const j = await AI.json(AI.TUTOR + "\nYou are in HINT MODE. " + ins + ' Return {"topic":"short topic name","text":"the hint"} in the student\'s language style.', "Problem: " + HINT.p + "\nHints given so far: " + HINT.hints.join(" | "));
    HINT.topic = j.topic || HINT.topic || "Practice"; HINT.hints.push(j.text);
    if (lv === 4) { logAttempt(HINT.topic, subjOf(HINT.topic), false, 30000, { full: true, hints: 4 }); }
    showHint(b); } catch (e) { HINT.level = Math.max(0, HINT.level - 1); b.innerHTML = errCard(e, "hretry"); A.hretry = () => nextHint(b, full); }
}
function showHint(b) {
  const lv = HINT.level;
  b.innerHTML = `<div class="card soft small"><b>Problem:</b> ${esc(HINT.p)}</div>${HINT.hints.map((h, i) => `<div class="msg a" style="max-width:100%"><span class="chip">${HLV[i]}</span><br>${md(h)}</div>`).join("")}
  <div class="row" style="margin-top:10px">${lv < 4 ? `<button class="btn sm" data-a="hnext">Next hint</button><button class="btn sm ghost" data-a="hfull">Just show the answer (no XP)</button>` : ""}<button class="btn sm ghost" data-a="hsolved">${lv < 4 ? "I solved it! ✅" : "Done"}</button></div>`;
  A.hnext = () => nextHint(b); A.hfull = () => nextHint(b, true);
  A.hsolved = async () => { if (lv < 4) { const xp = Math.max(5, 25 - 7 * lv); await logAttempt(HINT.topic, subjOf(HINT.topic), true, 20000, { hints: lv }); confetti(80); await award("hint", xp, lv === 0 ? "Solved with no hints" : `Solved with ${lv} hint${lv > 1 ? "s" : ""}`); } HINT = null; hintTab(b); };
}
/* Photo solver (vision LLM): read → confirm/edit text → solve in Hint mode or full steps */
function photoTab(b) {
  b.innerHTML = `<p class="mu small">Snap or upload a textbook question (JPG/PNG, max 5 MB). Tamil text works too. Don't upload faces or personal photos.</p>
  <input type="file" id="pf" accept="image/jpeg,image/png" capture="environment"><div id="pr"></div>`;
  $("#pf", b).onchange = async e => {
    const f = e.target.files[0], pr = $("#pr", b); if (!f) return;
    if (!["image/jpeg", "image/png"].includes(f.type)) return pr.innerHTML = `<p class="fb bad">Wrong file type. Use a JPG or PNG photo.</p>`;
    if (f.size > 5 * 1048576) return pr.innerHTML = `<p class="fb bad">That photo is over 5 MB. Retake it a bit smaller.</p>`;
    pr.innerHTML = loadingCard("Reading your question…");
    try {
      const data = await new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result.split(",")[1]); r.onerror = no; r.readAsDataURL(f); });
      const j = await AI.json('Read the study question in this image (Tamil or English). Return {"readable":true|false,"found":true|false,"text":"the question exactly as written"}. If blurry set readable false; if no question, found false.', "Extract the question.", { type: f.type, data });
      if (!j.readable || !j.found || !j.text) return pr.innerHTML = `<p class="fb bad">${!j.readable ? "The photo is too blurry to read." : "I couldn't find a question in this photo."}</p><button class="btn" data-a="retake">Retake photo</button>`;
      pr.innerHTML = `<p class="chip wn">AI-read from your photo, check the question text</p><textarea id="pt">${esc(j.text)}</textarea><div class="row"><button class="btn" data-a="psolve" data-v="hint">Guide me with hints</button><button class="btn ghost" data-a="psolve" data-v="full">Full explanation</button></div>`;
    } catch (x) { pr.innerHTML = errCard(x, "retake"); }
  };
  A.retake = () => photoTab(b);
  A.psolve = async (m, btn) => { const t = $("#pt", b).value.trim(); if (t.length < 5) return toast("Question text is too short", "bad"); if (m === "hint") { HINT = null; return aiTools(b.closest("#pbody") || b.closest("#tbody"), "hint", t); }
    $("#pr", b).innerHTML = loadingCard("Solving step by step…"); try { const r = await AI.call(AI.TUTOR, [{ role: "user", content: "Solve step by step and explain: " + t }]); $("#pr", b).innerHTML = `<div class="msg a" style="max-width:100%">${md(r)}</div>`; award("tutor", 3, "Photo question"); } catch (e) { $("#pr", b).innerHTML = errCard(e, "retake"); } };
}
/* Explain It Back */
async function evalExplain(topic, text) {
  const j = await AI.json(`You check a class 9-12 student's own-words explanation. Be encouraging and specific, never shame. Return {"score":"Understood|Partly|Not yet","right":"what they got right","missing":"what is missing or wrong (kindly)","followup":"one simple follow-up question"}. Reply in the student's language style.`, `Topic: ${topic}\nStudent explanation: ${text}`);
  if (!["Understood", "Partly", "Not yet"].includes(j.score)) j.score = "Partly";
  await DB.add("explains", { topic, score: j.score }); await logAttempt(topic, subjOf(topic), j.score === "Understood", 10000, { type: "explain" });
  await award("explain", j.score === "Understood" ? 15 : j.score === "Partly" ? 8 : 3, "Explain it back"); return j;
}
const explainHTML = j => `<div class="card soft fadeup" style="margin-top:12px"><span class="chip ${j.score === "Understood" ? "ok" : j.score === "Partly" ? "wn" : "pk"}">Concept: ${j.score}</span><p>✅ ${esc(j.right)}</p><p>💡 ${esc(j.missing)}</p><p><b>Try this:</b> ${esc(j.followup)}</p></div>`;
function explainTab(b, prefill) {
  b.innerHTML = `<p class="mu small">Teach it back in your own words. Type or speak in Tamil or English.</p><label for="et">Topic</label><input id="et" value="${esc(prefill || "")}" placeholder="What did you learn?"><label for="ex">Your explanation</label><textarea id="ex"></textarea>
  <div class="row" style="margin-top:8px"><button class="round" id="em">🎤</button><button class="btn" data-a="echeck">Check it</button></div><div id="er"></div>`;
  $("#em", b).onclick = () => listen($("#ex", b), U.medium);
  A.echeck = async (_, btn) => { const t0 = $("#et", b).value.trim(), x = $("#ex", b).value.trim(); if (t0.length < 2 || x.length < 10) return toast("Add a topic and a sentence or two", "bad"); btn.disabled = true; btn.textContent = "Reading…";
    try { const j = await evalExplain(t0, x); $("#er", b).innerHTML = explainHTML(j) + (j.score === "Not yet" ? `<button class="btn ghost" data-a="esimple" data-v="${esc(t0)}">Show a simpler explanation</button>` : ""); } catch (e) { toast(e.message, "bad"); } btn.disabled = false; btn.textContent = "Check again"; };
  A.esimple = async (t0, btn) => { btn.textContent = "Thinking…"; try { btn.outerHTML = `<div class="msg a" style="max-width:100%">${md(await AI.call(AI.TUTOR, [{ role: "user", content: `Explain "${t0}" in the simplest way possible, like for a younger kid, with one tiny example.` }]))}</div>`; } catch (e) { toast(e.message, "bad"); } };
}
