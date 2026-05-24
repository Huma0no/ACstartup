// src/ai.js — AI chat with the active provider from settings.js.
// No UI rendering. No direct localStorage access.

import { getSettings } from "./settings.js";

// ---------------------------------------------------------------------------
// Module state — in memory only, never persisted
// ---------------------------------------------------------------------------

let _history = [];      // [{role: "user"|"assistant", content: string}]
let _systemPrompt = "";

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

const HVAC_BASE_PROMPT =
  "You are an HVAC field assistant for a new construction technician. " +
  "Answer only questions about HVAC systems, equipment, installation, troubleshooting, " +
  "wiring, refrigerants, and related trade topics. " +
  "If asked about anything unrelated to HVAC, briefly note that this assistant is focused on HVAC trade work, " +
  "then do your best to help.";

function buildSystemPrompt(job) {
  if (!job) return HVAC_BASE_PROMPT;

  const lines = ["Active job context:"];

  if (job.address) lines.push(`Address: ${job.address}`);

  function appendSystem(label, sys) {
    if (!sys) return;
    if (sys.indoor) lines.push(`${label} furnace/air handler: ${sys.indoor}`);
    if (sys.outdoor) lines.push(`${label} outdoor unit: ${sys.outdoor}`);
    if (sys.links) {
      if (sys.links.serviceManual)   lines.push(`${label} service manual: ${sys.links.serviceManual}`);
      if (sys.links.documentLibrary) lines.push(`${label} document library: ${sys.links.documentLibrary}`);
      if (sys.links.blower)          lines.push(`${label} blower table: ${sys.links.blower}`);
    }
  }

  appendSystem("System 1", job.system1);
  appendSystem("System 2", job.system2);

  return HVAC_BASE_PROMPT + "\n\n" + lines.join("\n");
}

// ---------------------------------------------------------------------------
// Provider adapters
// Each receives (systemPrompt, history, apiKey) and returns the reply string.
// History is [{role: "user"|"assistant", content: string}] — universal format.
// ---------------------------------------------------------------------------

async function callAnthropic(systemPrompt, history, apiKey) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key":         apiKey,
      "anthropic-version": "2023-06-01",
      "content-type":      "application/json",
    },
    body: JSON.stringify({
      model:      "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system:     systemPrompt,
      messages:   history,
    }),
  });
  if (!res.ok) throw new Error(`Anthropic API error ${res.status}`);
  const data = await res.json();
  return data.content[0].text;
}

async function callOpenAI(systemPrompt, history, apiKey) {
  const messages = [{ role: "system", content: systemPrompt }, ...history];
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "content-type":  "application/json",
    },
    body: JSON.stringify({ model: "gpt-4o", messages }),
  });
  if (!res.ok) throw new Error(`OpenAI API error ${res.status}`);
  const data = await res.json();
  return data.choices[0].message.content;
}

async function callGoogle(systemPrompt, history, apiKey) {
  const contents = history.map((m) => ({
    role:  m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method:  "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents,
      }),
    }
  );
  if (!res.ok) throw new Error(`Google API error ${res.status}`);
  const data = await res.json();
  return data.candidates[0].content.parts[0].text;
}

const PROVIDERS = {
  anthropic: callAnthropic,
  openai:    callOpenAI,
  google:    callGoogle,
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

// Initialize or re-initialize with the active job.
// Pass null when no job is active — HVAC scope is still enforced.
export function initChat(job) {
  _history = [];
  _systemPrompt = buildSystemPrompt(job);
}

// Send a user message and return the assistant reply.
// Maintains history in memory for multi-turn context.
// Throws on missing API key, unknown provider, or network/API error.
export async function sendMessage(text) {
  const settings = getSettings();
  const provider = settings?.aiProvider || "anthropic";
  const apiKey   = settings?.aiApiKey  || "";

  if (!apiKey) {
    throw new Error("No API key configured. Add your key in Settings.");
  }

  const callProvider = PROVIDERS[provider];
  if (!callProvider) {
    throw new Error(`Unknown AI provider: "${provider}". Supported: anthropic, openai, google.`);
  }

  _history.push({ role: "user", content: text });

  let reply;
  try {
    reply = await callProvider(_systemPrompt, _history, apiKey);
  } catch (err) {
    _history.pop(); // keep history consistent on failure
    throw err;
  }

  _history.push({ role: "assistant", content: reply });
  return reply;
}

// Reset conversation history without changing the current system prompt.
export function clearHistory() {
  _history = [];
}

// Returns a snapshot of the current conversation history.
export function getHistory() {
  return [..._history];
}
