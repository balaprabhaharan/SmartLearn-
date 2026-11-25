/* auth.js – landing page + 3-step onboarding (only step 1 is required) */
const FEATS = [["💬", "AI Tutor 24/7", "Ask in Tamil, English or Tanglish. Hint mode helps you think, not copy."], ["📷", "Photo solver", "Snap a textbook question and get it solved step by step."],
 ["🧠", "12 ready quizzes + any topic", "Pick a quiz or let AI make one from your notes."], ["🗺️", "Learning Map", "See mastered, weak and recovered topics at a glance."],
 ["🎬", "Video lessons", "Teacher videos plus AI explainers in your language."], ["👩‍🏫", "Live classes", "Join safe classes and doubt sessions with verified teachers."],
 ["🏆", "XP, badges & streaks", "Level up while you learn."], ["🔁", "Recovery Loop", "Find a weak topic, fix it, and watch the score jump."]];
$("#logo").innerHTML = mascot(34) + "SmartLearn"; $("#heroMascot").innerHTML = mascot(110, "bob");
$("#feat").innerHTML = FEATS.map(f => `<div class="card lift reveal"><div style="font-size:2rem">${f[0]}</div><h3>${f[1]}</h3><p class="mu small">${f[2]}</p></div>`).join("");
const io = new IntersectionObserver(es => es.forEach(e => e.isIntersecting && e.target.classList.add("in")), { threshold: .15 }); $$(".reveal").forEach(e => io.observe(e));
$("#langBtn").onclick = () => { LANG.set(LANG.get() === "en" ? "ta" : "en"); applyLang(); };
function applyLang() { $("#heroSub").textContent = LANG.get() === "ta" ? "உங்களோடு சிந்திக்கும் AI ஆசிரியர், தமிழ் & ஆங்கிலத்தில் காணொளிப் பாடங்கள், நேரடி வகுப்புகள்." : "An AI tutor that thinks with you, quizzes that adapt, video lessons in Tamil or English, and live classes with real teachers."; }
applyLang();

const prof = { cls: 10, medium: "Tamil", topic: "" };
const dots = n => `<div class="stepdots">${[1, 2, 3].map(i => `<i class="${i <= n ? "on" : ""}"></i>`).join("")}</div>`;
const pwField = id => `<div class="pw"><input id="${id}" type="password" autocomplete="current-password" minlength="6"><button type="button" data-a="showpw" data-v="${id}">Show</button></div>`;
const goApp = () => { location.href = "app.html"; };
if (!sessionStorage.getItem("sl_guest")) DB.init().then(u => { if (u && !location.hash.includes("stay")) $("[data-a=register]").textContent = "Continue learning →"; $("[data-a=register]").dataset.u = u ? 1 : ""; });

const A = {
  closeModal, showpw: (id, b) => { const i = $("#" + id); i.type = i.type === "password" ? "text" : "password"; b.textContent = i.type === "password" ? "Show" : "Hide"; },
  guest() { DB.startGuest(); goApp(); },
  privacy() { modal(`<h2>Privacy, short version</h2><p class="mu">We keep only what's needed to teach you: name, email, class and your learning activity. Photos you upload are used to answer and not stored unless you save them. We never collect mood or mental-health data. Parent/guardian consent is asked before your first live class.</p>`); },
  register(_, el) { if (el && el.dataset.u) return goApp(); step1(); },
  login() {
    modal(`<div class="auth"><h2>Welcome back 👋</h2><button class="btn ghost block" data-a="google">Continue with Google</button>
    <label for="le">Email</label><input id="le" type="email" autocomplete="email"><label for="lp">Password</label>${pwField("lp")}
    <div class="row sp" style="margin-top:10px"><label class="row small" style="margin:0"><input type="checkbox" id="rem" checked style="width:20px;min-height:20px"> Remember me</label><a href="#" data-a="forgot">Forgot password?</a></div>
    <div class="err" id="e"></div><button class="btn block" data-a="doLogin">Log in</button>
    <p class="small mu center" style="margin-top:12px">Demo: demo@smartlearn.app / demo1234 · Teacher: teacher@smartlearn.app / teach1234 (demo mode)</p></div>`);
  },
  async doLogin(_, b) {
    const e = $("#le").value.trim(), p = $("#lp").value; if (!/^\S+@\S+\.\S+$/.test(e) || !p) return $("#e").textContent = "Enter your email and password.";
    b.disabled = true; try { await DB.login(e, p, $("#rem").checked); goApp(); } catch (x) { $("#e").textContent = DB.err(x); b.disabled = false; }
  },
  async forgot() { const e = $("#le").value.trim(); if (!e) return $("#e").textContent = "Type your email first."; try { await DB.reset(e); $("#e").textContent = "Reset link sent. Check your inbox ✉️"; } catch (x) { $("#e").textContent = DB.err(x); } },
  async google() { try { const u = await DB.google(); if (!u.onboarded) { await DB.setUser({ onboarded: 1 }); step2(); } else goApp(); } catch (x) { toast(DB.err(x), "bad"); } },
  async doReg(_, b) {
    const n = $("#rn").value.trim(), e = $("#re").value.trim(), p = $("#rp").value; $("#e").textContent = "";
    if (n.length < 2) return $("#e").textContent = "What should we call you? (at least 2 letters)";
    if (!/^\S+@\S+\.\S+$/.test(e)) return $("#e").textContent = "That email doesn't look right.";
    if (p.length < 6) return $("#e").textContent = "Password needs at least 6 characters.";
    b.disabled = true; try { await DB.register(n, e, p); step2(); } catch (x) { $("#e").textContent = DB.err(x); b.disabled = false; }
  },
  pick(v, el) { const [k, val] = v.split(":"); prof[k] = k === "cls" ? +val : val; $$(`[data-v^="${k}:"]`).forEach(c => c.classList.toggle("sel", c === el)); },
  skip2() { step3(); },
  async finish() { prof.topic = ($("#tp")?.value || "").trim().slice(0, 120); await DB.setUser({ ...prof, onboarded: 1 }); welcome(); }
};
document.addEventListener("click", e => { const el = e.target.closest("[data-a]"); if (el && A[el.dataset.a]) { e.preventDefault(); A[el.dataset.a](el.dataset.v, el); } });
function step1() {
  modal(`<div class="auth">${dots(1)}<h2>Let's get you started ✨</h2><button class="btn ghost block" data-a="google">Continue with Google</button>
  <label for="rn">Your name</label><input id="rn" autocomplete="name"><label for="re">Email</label><input id="re" type="email" autocomplete="email">
  <label for="rp">Password</label>${pwField("rp")}<div class="err" id="e"></div><button class="btn block" data-a="doReg">Continue</button>
  <p class="small mu center" style="margin-top:10px">By continuing you accept our <a href="#" data-a="privacy">privacy note</a>.</p></div>`);
}
function step2() {
  modal(`<div class="auth center">${dots(2)}<h2>Which class?</h2><div class="big-chips">${[9, 10, 11, 12].map(c => `<button class="chip ${c == 10 ? "sel" : ""}" data-a="pick" data-v="cls:${c}">${c}</button>`).join("")}</div>
  <h2 style="margin-top:20px">Medium</h2><div class="row" style="justify-content:center">${["Tamil", "English"].map(m => `<button class="chip ${m == "Tamil" ? "sel" : ""}" data-a="pick" data-v="medium:${m}">${m == "Tamil" ? "தமிழ் Tamil" : "English"}</button>`).join("")}</div>
  <div class="row" style="justify-content:center;margin-top:22px"><button class="btn ghost" data-a="skip2">Skip</button><button class="btn" data-a="skip2">Next</button></div></div>`);
}
function step3() {
  modal(`<div class="auth center">${dots(3)}${mascot(80, "bob")}<h2>What do you want help with?</h2><p class="mu small">Type any subject or topic. It becomes your first quiz and map. (optional)</p>
  <input id="tp" placeholder="e.g. Trigonometry, ஒளிச்சேர்க்கை, Loops in C"><div class="row" style="justify-content:center;margin-top:18px"><button class="btn ghost" data-a="finish" onclick="$('#tp').value=''">Skip</button><button class="btn" data-a="finish">Let's go 🚀</button></div></div>`);
}
function welcome() { confetti(); modal(`<div class="center">${mascot(110, "bob")}<h2>Welcome to SmartLearn!</h2><p class="mu">Setting up your dashboard…</p></div>`); setTimeout(goApp, 1500); }
if (location.hash === "#register") step1();
