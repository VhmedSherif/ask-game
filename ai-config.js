// ============================================================================
// Ask & Reveal — GitHub AI Configuration (Hidden from Website UI)
// Edit SYSTEM_PROMPT, VIBE_PROMPTS, or API settings right here on GitHub!
// ============================================================================
(function () {
  const H = ["https", "//"].join(":");

  window.ASK_GAME_AI_CONFIG = {
    SYSTEM_PROMPT:
      "You are an imaginative, warm, witty relationship card-game writer for two partners playing 'Ask & Reveal' together. " +
      "Invent ONE original, never-before-seen question (14 to 30 words) tailored to the requested theme. " +
      "When previous round answers are provided, subtly draw emotional or playful inspiration from their vibe without repeating their exact words. " +
      "Never use generic cliches like favorite color, movie, or superpower. " +
      "Output ONLY the single question ending with a question mark (?), with zero quotes, numbering, markdown, or intro.",

    VIBE_PROMPTS: {
      us_future: "Theme: Romance, building a cozy future together, spontaneous trips, shared rituals, or dream home moments.",
      playful: "Theme: Playful, mischievous, witty hypothetical adventure, funny scenarios, road trips, or lighthearted banter.",
      wyr: "Theme: Creative, romantic or funny 'Would you rather...' dilemma for a couple. MUST start strictly with 'Would you rather '.",
      culture: "Theme: Childhood memories, favorite homemade comfort food, family warmth, hometown streets, and blending two worlds.",
      deep: "Theme: Emotional safety, feeling truly understood without over-explaining, quiet appreciation, trust, and peace of heart."
    },

    CREATIVE_ANGLES: [
      "Frame it through a vivid specific micro-moment ('Imagine...', 'Suppose we...', 'Picture us...').",
      "Make it playfully unexpected—something they have genuinely never been asked before.",
      "Focus on sensory details (late-night talks, cozy weather, shared laughter, tea/coffee, or quiet glances).",
      "Ask in a way that invites storytelling or a warm reveal about how they see each other.",
      "Keep it effortless, deeply personal, and natural to answer from the heart."
    ],

    API: {
      CUSTOM_ENDPOINT: "",
      CUSTOM_MODEL: "",
      CUSTOM_API_KEY: "",
      KILO_BASE_URL: H + ["ai-gateway", "kilo", "ai"].join(".") + "/api/v1",
      KILO_MODELS: ["kilo-auto/free", "minimax/minimax-m2.1:free", "z-ai/glm-5:free"],
      LLM7_BASE_URL: H + ["api", "llm7", "io"].join(".") + "/v1",
      LLM7_MODELS: ["fast", "default"],
      MLVOCA_URL: H + ["mlvoca", "com"].join(".") + "/api/generate",
      MLVOCA_MODELS: ["deepseek-r1:1.5b", "tinyllama"],
      ENABLE_BROWSER_NEURAL_LLM: true,
      NEURAL_MODEL_ID: "HuggingFaceTB/SmolLM2-135M-Instruct",
      TEMPERATURE: 1.0,
      MAX_TOKENS: 280,
      TIMEOUT_MS: 9500
    }
  };

  function cleanAIOutput(raw) {
    if (!raw) return "";
    let o = String(raw).replace(/<think>[\s\S]*?<\/think>/gi, " ").replace(/<think>[\s\S]*$/gi, " ").replace(/```[\s\S]*?```/g, " ").replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\*([^*]+)\*/g, "$1");
    const ls = o.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    let c = ls.find(l => l.includes("?") && !/^(sure|here|certainly|of course|note|theme|output)/i.test(l)) || ls.find(l => l.includes("?")) || ls[0] || "";
    c = c.replace(/^(Question|Card|Prompt|Here(?:'s| is)[^:]*|Output)\s*\d*[:.-]\s*/i, "").replace(/^["'“”‘’*\-\d.)\s]+|["'“”‘’*\s]+$/g, "").trim();
    const q = c.indexOf("?");
    if (q !== -1 && q < c.length - 1) { const fq = c.slice(0, q + 1).trim(); if (!c.endsWith("?") || fq.split(/\s+/).length >= 10) c = fq; }
    return c.replace(/\s+/g, " ").trim();
  }

  function initPureAIState() {
    if (window._pureAIState) return window._pureAIState;
    const VAULT_KEY = "askreveal_ai_seen_vault_v6";
    const STOP = new Set(["what","when","where","which","would","could","should","have","from","with","that","this","your","ours","about","into","between","together","imagine","suppose","rather","there","their","make","most","more","some","very","just","only","first","right","like","think","feel","picture"]);
    let list = []; try { list = JSON.parse(localStorage.getItem(VAULT_KEY) || "[]"); if (!Array.isArray(list)) list = []; } catch (e) { list = []; }
    const norm = s => String(s || "").toLowerCase().replace(/[^a-z0-9\u0600-\u06FF\s]/g, " ").replace(/\s+/g, " ").trim();
    const seen = new Set(list.map(norm).filter(Boolean)), tokCache = new Map();
    const toks = s => { const k = norm(s); if (tokCache.has(k)) return tokCache.get(k); const t = new Set(k.split(" ").filter(w => w.length >= 4 && !STOP.has(w))); if (tokCache.size > 4000) tokCache.clear(); tokCache.set(k, t); return t; };
    return (window._pureAIState = { VAULT_KEY, list, seen, norm, toks, cooldowns: {}, preferredGw: null, kiloDiscovered: null, llm7Discovered: null, neuralWorker: null, neuralPending: new Map(), neuralReqSeq: 0 });
  }

  function isValidFreshAIQuestion(raw, th, S) {
    let f = cleanAIOutput(raw);
    if (!f || f.length < 18 || f.length > 280 || !f.endsWith("?")) return null;
    if (/14 to 30 words|never-before-seen|question mark|system prompt|as an ai|language model/i.test(f)) return null;
    if (th === "wyr" && !/^would you rather\b/i.test(f)) {
      if (/\bor\b/i.test(f) && /^(do you prefer|would you prefer)/i.test(f)) f = f.replace(/^(do you prefer|would you prefer)\s+/i, "Would you rather ");
      else return null;
    }
    const nk = S.norm(f); if (!nk || S.seen.has(nk)) return null;
    const ct = S.toks(f), rec = S.list.slice(-50);
    for (let i = 0; i < rec.length; i++) {
      const rt = S.toks(rec[i]); if (!ct.size || !rt.size) continue;
      let inter = 0; ct.forEach(w => { if (rt.has(w)) inter++; });
      if ((inter / (ct.size + rt.size - inter)) >= 0.58) return null;
    }
    return f;
  }

  const saveQ = (q, S) => { const nk = S.norm(q); if (nk) S.seen.add(nk); S.list.push(q); if (S.list.length > 3000) S.list = S.list.slice(-3000); try { localStorage.setItem(S.VAULT_KEY, JSON.stringify(S.list)); } catch (e) {} };
  const fT = async (u, o, ms) => { const c = new AbortController(), t = setTimeout(() => c.abort(), ms); try { const r = await fetch(u, Object.assign({}, o || {}, { signal: c.signal })); clearTimeout(t); return r; } catch (e) { clearTimeout(t); throw e; } };

  async function tryCustom(cfg, sys, usr, th, S) {
    const ep = (cfg.API.CUSTOM_ENDPOINT || "").trim(); if (!ep) return null;
    const hd = { "Content-Type": "application/json" }; if ((cfg.API.CUSTOM_API_KEY || "").trim()) hd["Authorization"] = "Bearer " + cfg.API.CUSTOM_API_KEY.trim();
    const r = await fT(ep, { method: "POST", headers: hd, body: JSON.stringify({ model: cfg.API.CUSTOM_MODEL || "auto", temperature: cfg.API.TEMPERATURE || 1, max_tokens: cfg.API.MAX_TOKENS || 260, messages: [{ role: "system", content: sys }, { role: "user", content: usr }] }) }, cfg.API.TIMEOUT_MS || 9500);
    if (!r.ok) throw new Error("c_" + r.status);
    const d = await r.json(), v = isValidFreshAIQuestion(d?.choices?.[0]?.message?.content || d?.response || d?.text || "", th, S);
    return v ? { text: v, isLive: true, engineLabel: "⚡ LIVE AI" } : null;
  }

  async function tryKilo(cfg, sys, usr, th, S) {
    const b = (cfg.API.KILO_BASE_URL || "").replace(/\/+$/, ""), ms = (cfg.API.KILO_MODELS || ["kilo-auto/free"]).slice();
    if (!S.kiloDiscovered) { try { const mr = await fT(b + "/models", { method: "GET" }, 4500); S.kiloDiscovered = mr.ok ? ((await mr.json())?.data || []).filter(m => m && typeof m.id === "string" && (m.id.endsWith(":free") || String(m.pricing?.prompt) === "0") && !/embed|vision|image|audio|whisper/i.test(m.id)).map(m => m.id).slice(0, 4) : []; } catch (e) { S.kiloDiscovered = []; } }
    S.kiloDiscovered.forEach(id => { if (!ms.includes(id)) ms.push(id); });
    let ok = false;
    for (let i = 0; i < Math.min(ms.length, 3); i++) {
      const r = await fT(b + "/chat/completions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: ms[i], temperature: cfg.API.TEMPERATURE || 1, max_tokens: cfg.API.MAX_TOKENS || 260, messages: [{ role: "system", content: sys }, { role: "user", content: usr }] }) }, cfg.API.TIMEOUT_MS || 9500);
      if (!r.ok) continue; ok = true;
      const v = isValidFreshAIQuestion((await r.json())?.choices?.[0]?.message?.content || "", th, S);
      if (v) return { text: v, isLive: true, engineLabel: "⚡ LIVE AI" };
    }
    if (ok) return null; throw new Error("kilo_down");
  }

  async function tryLLM7(cfg, sys, usr, th, S) {
    const b = (cfg.API.LLM7_BASE_URL || "").replace(/\/+$/, ""), ms = (cfg.API.LLM7_MODELS || ["fast", "default"]).slice();
    if (!S.llm7Discovered) { try { const mr = await fT(b + "/models", { method: "GET" }, 4500); S.llm7Discovered = mr.ok ? ((await mr.json())?.data || []).filter(m => m && typeof m.id === "string" && m.usage_based_only !== true && m.tier !== "pro" && (!m.model_type || m.model_type === "chat") && !/image|video|embed|tts|whisper/i.test(m.id)).map(m => m.id).slice(0, 4) : []; } catch (e) { S.llm7Discovered = []; } }
    S.llm7Discovered.forEach(id => { if (!ms.includes(id)) ms.push(id); });
    let ok = false;
    for (let i = 0; i < Math.min(ms.length, 3); i++) {
      const body = JSON.stringify({ model: ms[i], temperature: cfg.API.TEMPERATURE || 1, max_tokens: cfg.API.MAX_TOKENS || 260, messages: [{ role: "system", content: sys }, { role: "user", content: usr }] });
      let r = await fT(b + "/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer unused" }, body }, cfg.API.TIMEOUT_MS || 9500);
      if (r.status === 401) r = await fT(b + "/chat/completions", { method: "POST", headers: { "Content-Type": "application/json" }, body }, cfg.API.TIMEOUT_MS || 9500);
      if (!r.ok) continue; ok = true;
      const v = isValidFreshAIQuestion((await r.json())?.choices?.[0]?.message?.content || "", th, S);
      if (v) return { text: v, isLive: true, engineLabel: "⚡ LIVE AI" };
    }
    if (ok) return null; throw new Error("llm7_down");
  }

  async function tryMlvoca(cfg, sys, usr, th, S) {
    const u = (cfg.API.MLVOCA_URL || "").trim(), ms = cfg.API.MLVOCA_MODELS || ["deepseek-r1:1.5b", "tinyllama"];
    let ok = false;
    for (let i = 0; i < ms.length; i++) {
      const body = JSON.stringify({ model: ms[i], system: sys, prompt: usr, stream: false, options: { temperature: 0.95, num_predict: 240 } });
      let r = null; try { r = await fT(u, { method: "POST", body }, cfg.API.TIMEOUT_MS || 10500); } catch (e) { r = await fT(u, { method: "POST", headers: { "Content-Type": "application/json" }, body }, cfg.API.TIMEOUT_MS || 10500); }
      if (!r || !r.ok) continue; ok = true;
      const v = isValidFreshAIQuestion((await r.json())?.response || "", th, S);
      if (v) return { text: v, isLive: true, engineLabel: "⚡ LIVE AI" };
    }
    if (ok) return null; throw new Error("mlv_down");
  }

  async function tryBuiltIn(sys, usr, th, S) {
    const lm = window.LanguageModel || (window.ai && window.ai.languageModel);
    if (!lm || typeof lm.create !== "function") return null;
    const s = await lm.create({ systemPrompt: sys });
    try { const raw = await s.prompt(usr); if (s.destroy) s.destroy(); const v = isValidFreshAIQuestion(raw, th, S); return v ? { text: v, isLive: true, engineLabel: "⚡ LIVE AI" } : null; }
    catch (e) { try { if (s && s.destroy) s.destroy(); } catch (_) {} return null; }
  }

  function tryNeural(cfg, sys, usr, S, onP) {
    if (!cfg.API.ENABLE_BROWSER_NEURAL_LLM || typeof window.Worker === "undefined" || typeof window.Blob === "undefined") return Promise.resolve(null);
    return new Promise(res => {
      if (!S.neuralWorker) {
        const mid = cfg.API.NEURAL_MODEL_ID || "HuggingFaceTB/SmolLM2-135M-Instruct", cdn = H + ["cdn", "jsdelivr", "net"].join(".") + "/npm/@huggingface/transformers@3.4.1";
        const code = 'import { pipeline, env } from "' + cdn + '"; env.allowLocalModels = false; let g = null, ld = null; async function getG() { if (g) return g; if (!ld) ld = pipeline("text-generation", "' + mid + '", { dtype: "q4", progress_callback: p => { if (p && typeof p.progress === "number") self.postMessage({ type: "progress", pct: Math.round(p.progress) }); } }).then(x => (g = x)); return ld; } self.onmessage = async ev => { const { id, sys, usr } = ev.data || {}; try { const fn = await getG(); const o = await fn([{ role: "system", content: sys }, { role: "user", content: usr }], { max_new_tokens: 72, temperature: 0.92, top_p: 0.92, do_sample: true, repetition_penalty: 1.18 }); const gt = o?.[0]?.generated_text; self.postMessage({ type: "done", id, text: Array.isArray(gt) ? (gt[gt.length - 1]?.content || "") : String(gt || "") }); } catch (e) { self.postMessage({ type: "err", id }); } };';
        try {
          S.neuralWorker = new Worker(URL.createObjectURL(new Blob([code], { type: "application/javascript" })), { type: "module" });
          S.neuralWorker.onmessage = ev => { const d = ev.data || {}; if (d.type === "progress") { if (onP) onP(d.pct); return; } const cb = S.neuralPending.get(d.id); if (cb) { S.neuralPending.delete(d.id); cb(d.type === "done" ? d.text : null); } };
          S.neuralWorker.onerror = () => { S.neuralPending.forEach(cb => cb(null)); S.neuralPending.clear(); };
        } catch (e) { return res(null); }
      }
      const id = ++S.neuralReqSeq, tid = setTimeout(() => { if (S.neuralPending.has(id)) { S.neuralPending.delete(id); res(null); } }, 45000);
      S.neuralPending.set(id, t => { clearTimeout(tid); res(t); });
      S.neuralWorker.postMessage({ id, sys, usr });
    });
  }

  window.cleanAIOutput = cleanAIOutput;
  window.initPureAIState = initPureAIState;
  window.isValidFreshAIQuestion = isValidFreshAIQuestion;

  window.askGameGeneratePureAI = async function (vibe, ctx) {
    const cfg = window.ASK_GAME_AI_CONFIG, S = initPureAIState(), info = ctx || {};
    if (Array.isArray(info.usedQuestions)) info.usedQuestions.forEach(q => { const k = S.norm(q); if (k) S.seen.add(k); });
    const themes = ["us_future", "playful", "wyr", "culture", "deep"];
    const th = vibe === "surprise" ? themes[Math.floor(Math.random() * themes.length)] : (themes.includes(vibe) ? vibe : "playful");
    const mkP = att => [cfg.VIBE_PROMPTS[th] || cfg.VIBE_PROMPTS.playful, cfg.CREATIVE_ANGLES[Math.floor(Math.random() * cfg.CREATIVE_ANGLES.length)], "Players: " + (info.myName || "Player 1") + " & " + (info.partnerName || "Partner") + " (use we/us/you).", info.lastRoundSummary ? ("Subtle inspiration from their last round answers: " + info.lastRoundSummary + ".") : "", "Seed: " + Math.floor(Math.random() * 99999999) + "-" + att + ".", S.list.length ? ("Do NOT repeat or paraphrase: " + S.list.slice(-10).join(" | ")) : ""].filter(Boolean).join(" ");

    if ((cfg.API.CUSTOM_ENDPOINT || "").trim()) { for (let a = 0; a < 2; a++) { try { const r = await tryCustom(cfg, cfg.SYSTEM_PROMPT, mkP(a), th, S); if (r) { saveQ(r.text, S); return r; } } catch (e) { break; } } }
    const now = Date.now(), gws = [{ id: "kilo", fn: tryKilo }, { id: "llm7", fn: tryLLM7 }, { id: "mlvoca", fn: tryMlvoca }];
    if (S.preferredGw) gws.sort((a, b) => (a.id === S.preferredGw ? -1 : b.id === S.preferredGw ? 1 : 0));
    for (let pass = 0; pass < 2; pass++) {
      for (let g = 0; g < gws.length; g++) {
        const gw = gws[g]; if (pass === 0 && S.cooldowns[gw.id] && S.cooldowns[gw.id] > now) continue;
        try { const o = await gw.fn(cfg, cfg.SYSTEM_PROMPT, mkP(pass * 10 + g), th, S); if (o && o.text) { S.preferredGw = gw.id; delete S.cooldowns[gw.id]; saveQ(o.text, S); return o; } } catch (e) { S.cooldowns[gw.id] = Date.now() + 90000; }
      }
    }
    for (let b = 0; b < 2; b++) { const bi = await tryBuiltIn(cfg.SYSTEM_PROMPT, mkP(30 + b), th, S); if (bi && bi.text) { saveQ(bi.text, S); return bi; } }
    for (let n = 0; n < 3; n++) { const rn = await tryNeural(cfg, cfg.SYSTEM_PROMPT, mkP(50 + n), S, info.onProgress); if (!rn) break; const vn = isValidFreshAIQuestion(rn, th, S); if (vn) { saveQ(vn, S); return { text: vn, isLive: true, engineLabel: "🧠 NEURAL AI" }; } }
    return { text: "", isLive: false, isError: true, errorMsg: "⚠️ Live AI couldn't be reached right now — check connection and tap Switch Card 🔀 to retry!" };
  };
})();
