/* ui.js – small helpers: DOM, i18n, toast, modal, confetti, mascot, voice */
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const md = s => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\n/g, "<br>");
const LANG = { get: () => localStorage.getItem("sl_lang") || "en", set: l => localStorage.setItem("sl_lang", l) };
const I18N = {
  en: { nav_home: "Home", nav_quiz: "Quizzes", nav_map: "Learning Map", nav_video: "Videos", nav_tutor: "AI Tutor", nav_daily: "Daily Challenge", nav_prog: "Progress", nav_mist: "Mistakes", nav_rec: "Recovery Loop", nav_plan: "Planner", nav_class: "Live Classes", nav_rew: "Rewards", nav_prof: "Profile", nav_teach: "Teacher Studio", more: "More", hi: "Hi" },
  ta: { nav_home: "முகப்பு", nav_quiz: "வினாடி வினா", nav_map: "கற்றல் வரைபடம்", nav_video: "காணொளிகள்", nav_tutor: "AI ஆசிரியர்", nav_daily: "தினசரி சவால்", nav_prog: "முன்னேற்றம்", nav_mist: "தவறுகள்", nav_rec: "மீட்பு சுழற்சி", nav_plan: "திட்டம்", nav_class: "நேரடி வகுப்புகள்", nav_rew: "பரிசுகள்", nav_prof: "சுயவிவரம்", nav_teach: "ஆசிரியர் மையம்", more: "மேலும்", hi: "வணக்கம்" }
};
const t = k => (I18N[LANG.get()] || I18N.en)[k] || I18N.en[k] || k;
const reduceMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

function toast(msg, kind = "") {
  let box = $("#toasts"); if (!box) return;
  const d = document.createElement("div"); d.className = "toast " + kind; d.textContent = msg; box.appendChild(d);
  setTimeout(() => d.classList.add("out"), 3200); setTimeout(() => d.remove(), 3700);
}
function modal(html, cls = "") {
  $("#modal").innerHTML = `<div class="ov"><div class="sheet ${cls}" role="dialog" aria-modal="true"><button class="x" data-a="closeModal" aria-label="Close">✕</button>${html}</div></div>`;
}
const closeModal = () => { $("#modal").innerHTML = ""; };
/* click on the dark backdrop or press Esc closes the popup (buttons inside keep working) */
document.addEventListener("click", e => { if (e.target.classList && e.target.classList.contains("ov")) closeModal(); });
document.addEventListener("keydown", e => { if (e.key === "Escape") { closeModal(); const p = document.getElementById("panel"); if (p) p.innerHTML = ""; } });

function confetti(n = 150) {
  if (reduceMotion()) return;
  const c = $("#confetti"); if (!c) return; const x = c.getContext("2d");
  c.width = innerWidth; c.height = innerHeight;
  const cols = ["#7C3AED", "#A78BFA", "#F472B6", "#34D399", "#FBBF24"];
  const ps = Array.from({ length: n }, () => ({ x: innerWidth / 2, y: innerHeight / 3, vx: (Math.random() - .5) * 16, vy: Math.random() * -14 - 3, s: 5 + Math.random() * 6, c: cols[Math.random() * 5 | 0], r: Math.random() * 6 }));
  let f = 0;
  (function tick() {
    x.clearRect(0, 0, c.width, c.height);
    ps.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += .35; p.r += .2; x.fillStyle = p.c; x.save(); x.translate(p.x, p.y); x.rotate(p.r); x.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * .6); x.restore(); });
    if (++f < 110) requestAnimationFrame(tick); else x.clearRect(0, 0, c.width, c.height);
  })();
}
const mascot = (size = 90, cls = "") => `<svg class="mascot ${cls}" width="${size}" height="${size}" viewBox="0 0 100 100" role="img" aria-label="SmartLearn mascot Sparky">
<ellipse cx="50" cy="90" rx="26" ry="5" fill="#EDE9FE"/><path d="M22 40 L16 14 L38 28Z M78 40 L84 14 L62 28Z" fill="#A78BFA"/>
<rect x="14" y="26" width="72" height="62" rx="32" fill="#EDE9FE" stroke="#7C3AED" stroke-width="3"/>
<g class="eyes"><circle cx="37" cy="54" r="7" fill="#2B2350"/><circle cx="63" cy="54" r="7" fill="#2B2350"/><circle cx="39" cy="52" r="2.2" fill="#fff"/><circle cx="65" cy="52" r="2.2" fill="#fff"/></g>
<path d="M42 68 Q50 77 58 68" stroke="#2B2350" stroke-width="3.5" fill="none" stroke-linecap="round"/><circle cx="27" cy="66" r="5" fill="#F472B6" opacity=".5"/><circle cx="73" cy="66" r="5" fill="#F472B6" opacity=".5"/>
<path d="M50 24 L53 12 L58 18" stroke="#FBBF24" stroke-width="3.5" fill="none" stroke-linecap="round"/></svg>`;
const loadingCard = (m = "Thinking…") => `<div class="card center fadeup">${mascot(80, "bob")}<p class="mu">${esc(m)}</p><div class="dots"><i></i><i></i><i></i></div></div>`;
const errCard = (e, act = "retry") => `<div class="card center fadeup">${mascot(80)}<h3>Oops, that didn't work</h3><p class="mu">${esc(e.message || e)}</p><button class="btn" data-a="${act}">Retry</button></div>`;
const empty = (msg, btn = "") => `<div class="card center fadeup">${mascot(90, "bob")}<p>${msg}</p>${btn}</div>`;

/* voice: speech in/out via browser Web Speech API */
function speak(text, lang, rate = 1, onend) {
  if (!window.speechSynthesis) return toast("Your browser can't read aloud");
  speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = lang === "Tamil" ? "ta-IN" : "en-IN"; u.rate = rate; u.onend = onend; speechSynthesis.speak(u);
}
function listen(input, lang) {
  const R = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!R) return toast("Voice input isn't supported in this browser. Try Chrome.");
  const r = new R(); r.lang = lang === "English" ? "en-IN" : "ta-IN"; r.interimResults = false;
  r.onresult = e => { input.value += (input.value ? " " : "") + e.results[0][0].transcript; input.dispatchEvent(new Event("input")); };
  r.onerror = () => toast("Couldn't hear you. Try again 🎤"); r.start(); toast("Listening… speak now 🎤");
}
const fmtDate = ts => new Date(ts).toLocaleDateString(undefined, { day: "numeric", month: "short" });
