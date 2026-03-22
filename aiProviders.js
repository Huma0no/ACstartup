// ============================================================
// aiProviders.js — Universal AI provider config + askAI()
// Supports Anthropic, OpenAI-compatible, and Gemini formats
// ============================================================

// ─────────────────────────────────────────────
// PROVIDER REGISTRY
// ─────────────────────────────────────────────

export const PROVIDERS = {
  // ── Main 4 ──────────────────────────────────
  claude: {
    id: "claude",
    label: "Claude",
    icon: "◆",
    color: "#d4a853",
    format: "anthropic",
    endpoint: "https://api.anthropic.com/v1/messages",
    model: "claude-haiku-4-5-20251001",
    keyPlaceholder: "sk-ant-api03-...",
    keyHint: "anthropic.com/settings/keys",
    keyHintUrl: "https://console.anthropic.com/settings/keys",
    main: true,
  },
  chatgpt: {
    id: "chatgpt",
    label: "ChatGPT",
    icon: "⬡",
    color: "#10a37f",
    format: "openai",
    endpoint: "https://api.openai.com/v1/chat/completions",
    model: "gpt-4o-mini",
    keyPlaceholder: "sk-...",
    keyHint: "platform.openai.com/api-keys",
    keyHintUrl: "https://platform.openai.com/api-keys",
    main: true,
  },
  gemini: {
    id: "gemini",
    label: "Gemini",
    icon: "✦",
    color: "#4285f4",
    format: "gemini",
    endpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
    model: "gemini-1.5-flash",
    keyPlaceholder: "AIza...",
    keyHint: "aistudio.google.com/app/apikey",
    keyHintUrl: "https://aistudio.google.com/app/apikey",
    main: true,
  },
  grok: {
    id: "grok",
    label: "Grok",
    icon: "✕",
    color: "#ffffff",
    format: "openai",
    endpoint: "https://api.x.ai/v1/chat/completions",
    model: "grok-beta",
    keyPlaceholder: "xai-...",
    keyHint: "console.x.ai",
    keyHintUrl: "https://console.x.ai",
    main: true,
  },

  // ── Extended 10 ─────────────────────────────
  groq: {
    id: "groq",
    label: "Groq (Llama)",
    icon: "▲",
    color: "#f55036",
    format: "openai",
    endpoint: "https://api.groq.com/openai/v1/chat/completions",
    model: "llama3-8b-8192",
    keyPlaceholder: "gsk_...",
    keyHint: "console.groq.com/keys",
    keyHintUrl: "https://console.groq.com/keys",
    main: false,
  },
  mistral: {
    id: "mistral",
    label: "Mistral",
    icon: "〰",
    color: "#ff7000",
    format: "openai",
    endpoint: "https://api.mistral.ai/v1/chat/completions",
    model: "mistral-small-latest",
    keyPlaceholder: "...",
    keyHint: "console.mistral.ai/api-keys",
    keyHintUrl: "https://console.mistral.ai/api-keys",
    main: false,
  },
  cohere: {
    id: "cohere",
    label: "Cohere",
    icon: "◎",
    color: "#39594d",
    format: "openai",
    endpoint: "https://api.cohere.ai/compatibility/v1/chat/completions",
    model: "command-r",
    keyPlaceholder: "...",
    keyHint: "dashboard.cohere.com/api-keys",
    keyHintUrl: "https://dashboard.cohere.com/api-keys",
    main: false,
  },
  perplexity: {
    id: "perplexity",
    label: "Perplexity",
    icon: "⊕",
    color: "#20b2aa",
    format: "openai",
    endpoint: "https://api.perplexity.ai/chat/completions",
    model: "llama-3.1-sonar-small-128k-online",
    keyPlaceholder: "pplx-...",
    keyHint: "perplexity.ai/settings/api",
    keyHintUrl: "https://www.perplexity.ai/settings/api",
    main: false,
  },
  deepseek: {
    id: "deepseek",
    label: "DeepSeek",
    icon: "◈",
    color: "#4d6bfe",
    format: "openai",
    endpoint: "https://api.deepseek.com/v1/chat/completions",
    model: "deepseek-chat",
    keyPlaceholder: "sk-...",
    keyHint: "platform.deepseek.com/api_keys",
    keyHintUrl: "https://platform.deepseek.com/api_keys",
    main: false,
  },
  together: {
    id: "together",
    label: "Together AI",
    icon: "⊞",
    color: "#7c4dff",
    format: "openai",
    endpoint: "https://api.together.xyz/v1/chat/completions",
    model: "meta-llama/Llama-3-8b-chat-hf",
    keyPlaceholder: "...",
    keyHint: "api.together.ai/settings/api-keys",
    keyHintUrl: "https://api.together.ai/settings/api-keys",
    main: false,
  },
  fireworks: {
    id: "fireworks",
    label: "Fireworks",
    icon: "✦",
    color: "#ff6d00",
    format: "openai",
    endpoint: "https://api.fireworks.ai/inference/v1/chat/completions",
    model: "accounts/fireworks/models/llama-v3-8b-instruct",
    keyPlaceholder: "fw_...",
    keyHint: "fireworks.ai/account/api-keys",
    keyHintUrl: "https://fireworks.ai/account/api-keys",
    main: false,
  },
  openrouter: {
    id: "openrouter",
    label: "OpenRouter",
    icon: "⇄",
    color: "#6366f1",
    format: "openai",
    endpoint: "https://openrouter.ai/api/v1/chat/completions",
    model: "meta-llama/llama-3-8b-instruct:free",
    keyPlaceholder: "sk-or-...",
    keyHint: "openrouter.ai/keys",
    keyHintUrl: "https://openrouter.ai/keys",
    main: false,
  },
  huggingface: {
    id: "huggingface",
    label: "HuggingFace",
    icon: "🤗",
    color: "#ff9d00",
    format: "openai",
    endpoint: "https://api-inference.huggingface.co/models/meta-llama/Meta-Llama-3-8B-Instruct/v1/chat/completions",
    model: "meta-llama/Meta-Llama-3-8B-Instruct",
    keyPlaceholder: "hf_...",
    keyHint: "huggingface.co/settings/tokens",
    keyHintUrl: "https://huggingface.co/settings/tokens",
    main: false,
  },
  ollama: {
    id: "ollama",
    label: "Ollama (local)",
    icon: "🦙",
    color: "#888",
    format: "openai",
    endpoint: "http://localhost:11434/v1/chat/completions",
    model: "llama3",
    keyPlaceholder: "No key needed",
    keyHint: "Local — no API key required",
    keyHintUrl: "https://ollama.com",
    main: false,
  },
};

export const MAIN_PROVIDERS    = Object.values(PROVIDERS).filter(p => p.main);
export const EXTENDED_PROVIDERS = Object.values(PROVIDERS).filter(p => !p.main);

// ─────────────────────────────────────────────
// KEY STORAGE (per-provider)
// ─────────────────────────────────────────────

const KEY_PREFIX = "ts_ai_key_";
const ACTIVE_KEY  = "ts_ai_active_provider";

export function saveProviderKey(providerId, key) {
  localStorage.setItem(KEY_PREFIX + providerId, key.trim());
}

export function getProviderKey(providerId) {
  return localStorage.getItem(KEY_PREFIX + providerId) || "";
}

export function clearProviderKey(providerId) {
  localStorage.removeItem(KEY_PREFIX + providerId);
}

export function hasProviderKey(providerId) {
  const p = PROVIDERS[providerId];
  if (p?.id === "ollama") return true; // no key needed
  return !!getProviderKey(providerId);
}

export function getActiveProvider() {
  const saved = localStorage.getItem(ACTIVE_KEY);
  return PROVIDERS[saved] || PROVIDERS.claude;
}

export function setActiveProvider(providerId) {
  localStorage.setItem(ACTIVE_KEY, providerId);
}

// ─────────────────────────────────────────────
// SYSTEM PROMPT (shared across providers)
// ─────────────────────────────────────────────

export function buildSystemPrompt() {
  return `You are an expert HVAC field technician assistant for a residential new-construction HVAC company. You specialize in Lennox, Goodman, Trane, and Daikin systems. Your job is to help field technicians diagnose and solve HVAC problems quickly.

Key knowledge areas:
- A2L refrigerants (R-454B, R-32) and their safety requirements
- Lennox, Trane, Goodman/Daikin furnace boards and fault codes
- Honeywell zone boards (HZ322, UT3000)
- Ecobee SmartThermostat — app overrides, PEK wiring, zoning
- New construction startup issues — float switches, commissioning
- Refrigerant charge verification — subcooling method

Response format:
- Be CONCISE and ACTIONABLE — field techs need quick, practical steps
- Use numbered steps for procedures
- Include specific measurements when relevant
- Flag safety concerns clearly
- Answer in the same language the tech uses (Spanish or English)`;
}

// ─────────────────────────────────────────────
// UNIVERSAL askAI()
// ─────────────────────────────────────────────

/**
 * @param {object} opts
 * @param {string} opts.providerId
 * @param {string} opts.userMessage
 * @param {function} opts.onChunk   - called with each text chunk (streaming)
 * @param {function} opts.onDone    - called when complete
 * @param {function} opts.onError   - called with Error
 */
export async function askAI({ providerId, userMessage, onChunk, onDone, onError }) {
  const provider = PROVIDERS[providerId];
  if (!provider) { onError(new Error("Unknown provider: " + providerId)); return; }

  const key = getProviderKey(providerId);
  if (!key && provider.id !== "ollama") {
    onError(new Error("No API key configured for " + provider.label));
    return;
  }

  try {
    if (provider.format === "anthropic") {
      await callAnthropic(provider, key, userMessage, onChunk, onDone, onError);
    } else if (provider.format === "gemini") {
      await callGemini(provider, key, userMessage, onChunk, onDone, onError);
    } else {
      await callOpenAICompat(provider, key, userMessage, onChunk, onDone, onError);
    }
  } catch (err) {
    onError(err);
  }
}

// ── Anthropic ───────────────────────────────

async function callAnthropic(provider, key, userMessage, onChunk, onDone, onError) {
  const res = await fetch(provider.endpoint, {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: provider.model,
      max_tokens: 1024,
      system: buildSystemPrompt(),
      messages: [{ role: "user", content: userMessage }],
      stream: true,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `HTTP ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop();
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") continue;
      try {
        const json = JSON.parse(data);
        if (json.type === "content_block_delta") {
          onChunk(json.delta?.text || "");
        }
      } catch {}
    }
  }
  onDone();
}

// ── OpenAI-compatible ───────────────────────

async function callOpenAICompat(provider, key, userMessage, onChunk, onDone, onError) {
  const headers = {
    "Authorization": `Bearer ${key}`,
    "content-type": "application/json",
  };
  if (provider.id === "openrouter") {
    headers["HTTP-Referer"] = window.location.href;
    headers["X-Title"] = "HVAC Field Assistant";
  }

  const res = await fetch(provider.endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: provider.model,
      stream: true,
      messages: [
        { role: "system", content: buildSystemPrompt() },
        { role: "user",   content: userMessage },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `HTTP ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop();
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") continue;
      try {
        const json = JSON.parse(data);
        const chunk = json.choices?.[0]?.delta?.content;
        if (chunk) onChunk(chunk);
      } catch {}
    }
  }
  onDone();
}

// ── Gemini (no streaming — simulated) ──────

async function callGemini(provider, key, userMessage, onChunk, onDone, onError) {
  const url = `${provider.endpoint}?key=${key}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: buildSystemPrompt() }] },
      contents: [{ parts: [{ text: userMessage }] }],
      generationConfig: { maxOutputTokens: 1024 },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `HTTP ${res.status}`);
  }

  const json = await res.json();
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text || "";

  // Simulate streaming word by word for consistent UX
  const words = text.split(" ");
  for (let i = 0; i < words.length; i++) {
    onChunk((i === 0 ? "" : " ") + words[i]);
    if (i % 8 === 0) await new Promise(r => setTimeout(r, 16));
  }
  onDone();
}
