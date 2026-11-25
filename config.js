/* ============================================================
   SmartLearn – CONFIG  (the ONLY file you must edit)
   1) Paste your Firebase web-app keys below.
   2) Add an AI endpoint (recommended) or a dev key.
   Leave "YOUR_API_KEY" as-is to run in DEMO MODE (browser storage).
   ============================================================ */
const SMARTLEARN_CONFIG = {
  firebase: {
    apiKey: "AIzaSyDgImSvMbtfQeFB6Tkyf0X02WI5a7g-jbE",
    authDomain: "smartnova-8f17b.firebaseapp.com",
    projectId: "smartnova-8f17b",
    storageBucket: "smartnova-8f17b.firebasestorage.app",
    messagingSenderId: "984612516017",
    appId: "1:984612516017:web:e35ed1ba20757ec8737290"
  },
  ai: {
    // EASIEST: paste your free Gemini key from aistudio.google.com/apikey
    geminiKey: "AQ.Ab8RN6IpinQkoa0M4oKpaIyMVb3A_cLBBklnQ3EZ2SZ55rCD2g",
    geminiModel: "gemini-3.6-flash",
    // RECOMMENDED for a public site: your own proxy URL that holds the secret key
    endpoint: "",
    // DEV ONLY
    directKey: "",
    model: "claude-sonnet-5-5"
  },
  // Accounts registered with these emails get the "teacher" role
  teacherEmails: ["teacher@smartlearn.app"],
  jitsiDomain: "meet.jit.si"
};