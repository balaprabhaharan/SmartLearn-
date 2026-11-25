/* ============================================================
   ai.js – every AI feature goes through AI.call().
   Works with your proxy endpoint (recommended) or a dev key.
   No fake answers: if the AI call fails, the UI shows an error + Retry.
   ============================================================ */
const AI = {
  async call(system, messages, image) {
    const c = SMARTLEARN_CONFIG.ai;
    const msgs = messages.map(m => ({ role: m.role, content: m.content }));
    if (image) { const l = msgs[msgs.length - 1]; l.content = [{ type: "image", source: { type: "base64", media_type: image.type, data: image.data } }, { type: "text", text: l.content }]; }
    if (c.geminiKey) {   // Google Gemini. Retries when busy (503/429) and falls back to another model
      const contents = msgs.map((m, i) => {
        const parts = [{ text: Array.isArray(m.content) ? m.content.find(x => x.type === "text").text : m.content }];
        if (image && i === msgs.length - 1) parts.unshift({ inlineData: { mimeType: image.type, data: image.data } });
        return { role: m.role === "assistant" ? "model" : "user", parts };
      });
      const models = [c.geminiModel || "gemini-3.8-flash", ...(c.geminiFallbacks || ["gemini-3.7-flash", "gemini-3.6-flash", "gemini-3.5-flash"])];
      let lastErr = "";
      for (const model of models) {
        for (let tryNo = 0; tryNo < 3; tryNo++) {
          const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 30000);   // never spin forever
          let r;
          try { r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${c.geminiKey}`, { method: "POST", headers: { "Content-Type": "application/json" }, signal: ctl.signal,
            body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents }) }); }
          catch (e) { clearTimeout(timer); lastErr = e.name === "AbortError" ? "Gemini took too long to answer." : "Can't reach Gemini. Check your internet or key."; break; }
          clearTimeout(timer);
          const j = await r.json().catch(() => ({}));
          if (r.ok) { const t = j.candidates?.[0]?.content?.parts?.map(x => x.text || "").join(""); if (t) return t; lastErr = "Gemini sent an empty reply."; break; }
          lastErr = j.error?.message || "Gemini said " + r.status;
          if (![429, 500, 503].includes(r.status)) break;            // real error: try next model
          await new Promise(ok => setTimeout(ok, 1500 * (tryNo + 1)));   // busy: wait and retry
        }
      }
      throw new Error(lastErr || "Gemini is busy. Try again in a minute.");
    }
    if (c.endpoint) {
      const r = await fetch(c.endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ system, messages: msgs, model: c.model }) });
      if (!r.ok) throw new Error("AI server said " + r.status);
      return (await r.json()).text;
    }
    if (c.directKey) {
      const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": c.directKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
        body: JSON.stringify({ model: c.model, max_tokens: 2500, system, messages: msgs }) });
      if (!r.ok) throw new Error("AI service said " + r.status);
      return (await r.json()).content.map(b => b.text || "").join("");
    }
    throw new Error("AI isn't connected yet. Paste your Gemini key in js/config.js (geminiKey).");
  },
  async json(system, prompt, image) {
    const t = await AI.call(system + "\nReply with valid JSON only. No markdown fences, no extra words.", [{ role: "user", content: prompt }], image);
    const m = t.replace(/```json|```/g, "").match(/[\[{][\s\S]*[\]}]/);
    if (!m) throw new Error("The AI reply wasn't in the right format. Try again.");
    return JSON.parse(m[0]);
  },
  TUTOR: `You are SmartLearn Tutor for Tamil Nadu State Board students of classes 9-12 (ages 14-18). Answer ANY study question in any subject.
Understand Tamil script, English and Tanglish and reply in the SAME language style the student used. Be friendly, short and casual, never preachy.
Format: 1) simple explanation, 2) a worked example (step-by-step for maths/science), 3) ONE follow-up question to check understanding.
If the message is not about studies, politely steer back to learning. Never say you don't know the topic; give your best honest explanation and say if unsure.`,
  tutor(history) { return AI.call(AI.TUTOR, history.slice(-10)); },
  /* generate questions from topic text/material. types: array of "mcq","tf","short" */
  async questions({ material, topic, n = 5, types = ["mcq", "tf", "short"], diff = 0, lang = "" }) {
    const arr = await AI.json(`You write study questions for Tamil Nadu State Board classes 9-12. Write in the language of the material${lang ? " (prefer " + lang + ")" : ""}.
Return an array of ${n} objects: {"q":"","type":"mcq|tf|short","o":["",...],"a":<number: index of correct option for mcq/tf>,"exp":"short explanation","topic":"short topic name","diff":1-5}.
For tf use o:["True","False"]. For short, omit "o" and make "a" a short model answer string. Use only these types: ${types.join(", ")}. mcq has exactly 4 options.${diff ? " Target difficulty " + diff + " of 5." : ""}`,
      (topic ? "Topic: " + topic + "\n" : "") + (material ? "Material:\n" + material.slice(0, 9000) : ""));
    const out = (Array.isArray(arr) ? arr : arr.questions || []).map(AI.fixQ).filter(Boolean);
    if (!out.length) throw new Error("Couldn't make questions from that. Try different text.");
    return out;
  },
  fixQ(x) {
    if (!x || !x.q) return null;
    if (x.type === "short" || !x.o) return { q: x.q, type: "short", a: String(x.a ?? ""), exp: x.exp || "", topic: x.topic, diff: x.diff };
    if (typeof x.a !== "number" || x.a < 0 || x.a >= x.o.length) return null;
    return { q: x.q, type: x.o.length === 2 ? "tf" : "mcq", o: x.o, a: x.a, exp: x.exp || "", topic: x.topic, diff: x.diff };
  },
  judge(q, ans) { return AI.json(`Judge a student's short answer for MEANING, not exact words. Return {"correct":true|false,"feedback":"one kind, specific sentence"}.`, `Question: ${q.q}\nModel answer: ${q.a}\nStudent answer: ${ans}`); },
  explain(q, mine) { return AI.call(AI.TUTOR, [{ role: "user", content: `Explain briefly (max 4 sentences) why the correct answer is right for: "${q.q}". Correct answer: ${q.o ? q.o[q.a] : q.a}. ${mine ? "Student answered: " + mine + "." : ""}` }]); }
};
