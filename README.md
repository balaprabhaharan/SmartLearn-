# SmartLearn – AI-Powered Adaptive Learning Website
Pure HTML + CSS + JavaScript website (no build step). Light white & violet theme, mobile-first, Firebase-ready.

## Run it (demo mode, no setup)
Double-click `index.html`, or serve the folder: `python -m http.server 8000` then open http://localhost:8000
- "Try without signing up" opens a guest session with sample data and a sample Learning Map.
- Demo logins (demo mode only): student `demo@smartlearn.app` / `demo1234`, teacher `teacher@smartlearn.app` / `teach1234`.
- The 12 preloaded quizzes (12 questions each), scores, rewards, videos upload/playback all work offline in demo mode (data is kept in your browser).

## Connect Firebase (replace the API key)
1. console.firebase.google.com → Add project → add a **Web app** → copy the config object.
2. Open `js/config.js` and paste the values into `firebase:{...}` (replace every `YOUR_...`).
3. Build → **Authentication** → enable *Email/Password* and *Google*.
4. Build → **Firestore Database** → create (production mode) → Rules tab → paste `firestore.rules` → Publish.
5. Build → **Storage** → get started → Rules tab → paste `storage.rules` → Publish. (Uploaded teacher videos go here.)
6. Make a teacher: register the account, then in Firestore → `users/<uid>` set `role` = `teacher`.
That's it. `js/db.js` switches from demo storage to Firebase automatically when real keys are present. Guest sessions always stay local.
Collections used: users, attempts, mistakes, quizResults, xpLog, recoveries, explains, daily, maps, plans, lessons, videos, classes, doubts, reports.

## Turn on the AI (easiest: free Gemini key)
Get a key at aistudio.google.com/apikey and paste it in `js/config.js` as `geminiKey`. (Keys in a public site are visible to visitors, so use a proxy `endpoint` when you deploy.)
Never put a secret key in a public website. Two options in `js/config.js`:
- **Recommended:** deploy a tiny Firebase Cloud Function (or any server) that holds your key, accepts `POST {system, messages, model}` and returns `{text}`. Put its URL in `ai.endpoint`.
- **Local testing only:** paste a key in `ai.directKey`. It is exposed to anyone who opens the site.
Without either, AI screens show a friendly "AI isn't connected" error with Retry. Nothing is faked.

## Video calls
Live classes embed Jitsi Meet (`meet.jit.si`) with hard-to-guess room names. Change `jitsiDomain` to use your own Jitsi server.

## Deploy
`firebase init hosting` (public folder = this folder) → `firebase deploy`. Or use Netlify / GitHub Pages.

## Files
index.html (landing + sign-up) · app.html (the website) · css/style.css · js/config.js (edit me) · db.js (Firebase/demo data layer) · ai.js · core.js (router, mastery/confidence formulas, quiz runner) · learn.js (dashboard, quizzes, map, progress, daily, mistakes, recovery) · tools.js (AI dock) · media.js (videos, AI lessons, teacher studio) · extra.js (classes, planner, rewards, profile) · quizdata.js (12 preloaded quizzes) · rewards.js (XP, levels, badges, streaks)
