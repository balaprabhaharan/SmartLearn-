/* ============================================================
   db.js – ONE data layer, two back-ends:
   • Firebase (Auth + Firestore + Storage) when config.js has real keys
   • Browser storage (demo mode) otherwise, and always for "guest" sessions
   Every page talks only to DB.*, so nothing else changes when you add Firebase.
   ============================================================ */
const CFG = SMARTLEARN_CONFIG;
const FB_READY = typeof firebase !== "undefined" && CFG.firebase.apiKey && !CFG.firebase.apiKey.startsWith("YOUR_");
const GUEST = !!sessionStorage.getItem("sl_guest");
const USE_FB = FB_READY && !GUEST;
const LS = (k, d) => { try { return JSON.parse(localStorage.getItem("sl_" + k)) ?? d; } catch { return d; } };
const LSset = (k, v) => localStorage.setItem("sl_" + k, JSON.stringify(v));
const rid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const dayKey = (d = new Date()) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");

/* tiny IndexedDB helper: stores uploaded videos in demo mode */
const idb = () => new Promise((ok, no) => { const r = indexedDB.open("smartlearn", 1); r.onupgradeneeded = () => r.result.createObjectStore("v"); r.onsuccess = () => ok(r.result); r.onerror = no; });
const idbPut = async (k, b) => { const d = await idb(); return new Promise(ok => { const t = d.transaction("v", "readwrite"); t.objectStore("v").put(b, k); t.oncomplete = ok; }); };
const idbGet = async k => { const d = await idb(); return new Promise(ok => { const q = d.transaction("v").objectStore("v").get(k); q.onsuccess = () => ok(q.result); }); };

const FRIENDLY = {
  "auth/email-already-in-use": "That email is already registered. Try logging in 🙂",
  "auth/invalid-credential": "Email or password doesn't match. Check and try again.",
  "auth/wrong-password": "Email or password doesn't match. Check and try again.",
  "auth/user-not-found": "No account with this email yet. Want to sign up?",
  "auth/weak-password": "Pick a password with at least 6 characters.",
  "auth/too-many-requests": "Too many tries. Wait a minute and try again.",
  "auth/popup-closed-by-user": "Google sign-in was closed. Try again?"
};

const DB = {
  uid: null, user: null, fb: USE_FB, guest: GUEST,
  init() {
    if (USE_FB) {
      if (!firebase.apps.length) firebase.initializeApp(CFG.firebase);
      DB.auth = firebase.auth(); DB.fs = firebase.firestore(); DB.st = firebase.storage();
    } else DB.seed();
    return new Promise(res => {
      if (USE_FB) DB.auth.onAuthStateChanged(async u => { if (u) { DB.uid = u.uid; DB.user = await DB.loadUser(u); } res(DB.user); });
      else {
        DB.uid = GUEST ? "demo" : LS("session", null);
        DB.user = DB.uid ? LS("users", {})[DB.uid] || null : null;
        res(DB.user);
      }
    });
  },
  async loadUser(u, name) {
    const ref = DB.fs.collection("users").doc(u.uid), snap = await ref.get();
    if (snap.exists) return { uid: u.uid, ...snap.data() };
    const doc = { name: name || u.displayName || "Learner", email: u.email || "", role: CFG.teacherEmails.includes(u.email) ? "teacher" : "student",
      cls: 10, medium: "Tamil", xp: 0, streak: 0, badges: {}, created: Date.now() };
    await ref.set(doc); return { uid: u.uid, ...doc };
  },
  err(e) { return FRIENDLY[e.code] || e.message || "Something went wrong. Try again."; },
  async register(name, email, pw) {
    if (USE_FB) {
      const c = await DB.auth.createUserWithEmailAndPassword(email, pw);
      await c.user.updateProfile({ displayName: name });
      DB.uid = c.user.uid; DB.user = await DB.loadUser(c.user, name); return DB.user;
    }
    const us = LS("users", {});
    if (Object.values(us).some(u => u.email === email)) throw { code: "auth/email-already-in-use" };
    const uid = rid();
    us[uid] = { uid, name, email, pw: btoa(pw), role: CFG.teacherEmails.includes(email) ? "teacher" : "student", cls: 10, medium: "Tamil", xp: 0, streak: 0, badges: {}, created: Date.now() };
    LSset("users", us); LSset("session", uid); DB.uid = uid; DB.user = us[uid]; return DB.user;
  },
  async login(email, pw, remember = true) {
    if (USE_FB) {
      await DB.auth.setPersistence(remember ? firebase.auth.Auth.Persistence.LOCAL : firebase.auth.Auth.Persistence.SESSION);
      const c = await DB.auth.signInWithEmailAndPassword(email, pw);
      DB.uid = c.user.uid; DB.user = await DB.loadUser(c.user); return DB.user;
    }
    const u = Object.values(LS("users", {})).find(u => u.email === email && u.pw === btoa(pw));
    if (!u) throw { code: "auth/invalid-credential" };
    LSset("session", u.uid); DB.uid = u.uid; DB.user = u; return u;
  },
  async google() {
    if (!USE_FB) throw { message: "Google sign-in needs Firebase keys in js/config.js. For now, use email or try as guest." };
    const c = await DB.auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
    DB.uid = c.user.uid; DB.user = await DB.loadUser(c.user); return DB.user;
  },
  async reset(email) {
    if (!USE_FB) throw { message: "Password reset email works once Firebase is connected." };
    await DB.auth.sendPasswordResetEmail(email);
  },
  startGuest() { sessionStorage.setItem("sl_guest", "1"); },
  async logout() {
    sessionStorage.removeItem("sl_guest");
    if (USE_FB) await DB.auth.signOut(); else LSset("session", null);
    location.href = "index.html";
  },
  async setUser(p) {
    Object.assign(DB.user, p);
    if (USE_FB) await DB.fs.collection("users").doc(DB.uid).set(p, { merge: true });
    else { const us = LS("users", {}); us[DB.uid] = DB.user; LSset("users", us); }
  },
  async listUsers() {
    if (USE_FB) return (await DB.fs.collection("users").get()).docs.map(d => ({ uid: d.id, ...d.data() }));
    return Object.values(LS("users", {}));
  },
  /* generic collection helpers: add / list / upd / del */
  async add(col, o) {
    o = { uid: DB.uid, ts: Date.now(), ...o };
    if (USE_FB) { const r = await DB.fs.collection(col).add(o); return { ...o, id: r.id }; }
    o.id = rid(); const a = LS(col, []); a.push(o); LSset(col, a); return o;
  },
  async list(col, all = false) {
    let a;
    if (USE_FB) {
      let q = DB.fs.collection(col); if (!all) q = q.where("uid", "==", DB.uid);
      a = (await q.get()).docs.map(d => ({ id: d.id, ...d.data() }));
    } else { a = LS(col, []); if (!all) a = a.filter(x => x.uid === DB.uid); }
    return a.sort((x, y) => (y.ts || 0) - (x.ts || 0));
  },
  async upd(col, id, p) {
    if (USE_FB) return DB.fs.collection(col).doc(id).set(p, { merge: true });
    LSset(col, LS(col, []).map(x => x.id === id ? { ...x, ...p } : x));
  },
  async del(col, id) {
    if (USE_FB) return DB.fs.collection(col).doc(id).delete();
    LSset(col, LS(col, []).filter(x => x.id !== id));
  },
  /* videos: Firebase Storage (real) or IndexedDB (demo) */
  async uploadVideo(file, onProgress) {
    if (USE_FB) {
      const path = "videos/" + DB.uid + "/" + Date.now() + "_" + file.name.replace(/[^\w.\-]/g, "_");
      const task = DB.st.ref(path).put(file);
      return new Promise((ok, no) => task.on("state_changed", s => onProgress(s.bytesTransferred / s.totalBytes), no,
        async () => ok({ url: await task.snapshot.ref.getDownloadURL(), path })));
    }
    const key = rid(); await idbPut(key, file); onProgress(1); return { blobKey: key };
  },
  async videoUrl(v) { if (v.url) return v.url; const b = await idbGet(v.blobKey); return b ? URL.createObjectURL(b) : ""; },
  async delVideo(v) {
    if (USE_FB && v.path) { try { await DB.st.ref(v.path).delete(); } catch (e) {} }
    await DB.del("videos", v.id);
  },
  /* Demo data: demo student, demo teacher, sample attempts, mistakes and a sample Learning Map */
  seed() {
    if (LS("seeded", 0) === 2) return;
    const D = 864e5, now = Date.now(), att = [], mis = [], log = [];
    const mk = (topic, subject, res) => res.forEach((ok, i) => att.push({ id: rid(), uid: "demo", topic, subject, ok, ms: ok ? 9000 : 22000, ts: now - (res.length - i) * D / 2 }));
    mk("Algebra Basics", "Maths", [1, 1, 0, 1, 1, 1, 1, 1]); mk("Trigonometry", "Maths", [0, 1, 0, 0, 0, 1]);
    mk("Photosynthesis & Plants", "Biology", [1, 1, 1, 1, 1]); mk("Motion & Force", "Physics", [1, 0, 1, 0]);
    const t = QUIZZES.find(q => q.id === "trig").qs;
    [0, 4, 9].forEach((i, k) => mis.push({ id: rid(), uid: "demo", topic: "Trigonometry", subject: "Maths", q: t[i].q, o: t[i].o, a: t[i].a, type: "mcq", my: (t[i].a + 1) % 4, exp: "", fixedCount: 0, fixed: false, ts: now - k * D }));
    [["quiz", 85, "Algebra Basics"], ["daily", 30, "Daily challenge"], ["quiz", 60, "Trigonometry"], ["lesson", 40, "Lesson: Photosynthesis"], ["quiz", 125, "Photosynthesis & Plants"]]
      .forEach(([type, xp, label], i) => log.push({ id: rid(), uid: "demo", type, xp, label, ts: now - (5 - i) * D / 2 }));
    const map = { id: "map1", uid: "demo", ts: now, subject: "Maths", cls: 10, zones: [
      { name: "Algebra", nodes: [{ id: "a1", name: "Algebra Basics", pre: [] }, { id: "a2", name: "Quadratic Equations", pre: ["Algebra Basics"] }] },
      { name: "Geometry", nodes: [{ id: "g1", name: "Geometry & Triangles", pre: [] }, { id: "g2", name: "Circles", pre: ["Geometry & Triangles"] }] },
      { name: "Trigonometry", nodes: [{ id: "t1", name: "Trigonometry", pre: ["Geometry & Triangles"] }, { id: "t2", name: "Heights and Distances", pre: ["Trigonometry"] }] }] };
    const yest = dayKey(new Date(now - D));
    LSset("users", { demo: { uid: "demo", name: "Demo Student", email: "demo@smartlearn.app", pw: btoa("demo1234"), role: "student", cls: 10, medium: "Tamil", xp: 340, streak: 3, last: yest, badges: { first: now }, topic: "Trigonometry", created: now },
      teacher: { uid: "teacher", name: "Demo Teacher", email: "teacher@smartlearn.app", pw: btoa("teach1234"), role: "teacher", xp: 0, streak: 0, badges: {} } });
    LSset("attempts", att); LSset("mistakes", mis); LSset("xpLog", log); LSset("maps", [map]);
    LSset("classes", [{ id: rid(), uid: "teacher", ts: now, title: "Trigonometry doubt clearing", subject: "Maths", cls: 10, when: new Date(now + D).toISOString().slice(0, 16), room: "SmartLearn-" + rid(), host: "Demo Teacher" }]);
    LSset("seeded", 2);
  }
};
