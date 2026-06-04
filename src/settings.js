// src/settings.js — App configuration: onboarding, prices, AI provider, theme.
// No UI rendering. All localStorage access via storage.js.
// Call initSettings() once at app startup before any other module reads settings.

import { DEFAULT_PRICES } from "./data.js";
import {
  getSettings as _load,
  saveSettings as _save,
} from "./storage.js";

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

let _settings = null;

const DEFAULTS = {
  techName:           "",
  theme:              "dark",
  aiProvider:         "anthropic",
  aiApiKeys:          { anthropic: "", openai: "", google: "" },
  prices:             {},   // sparse overrides — merged onto DEFAULT_PRICES in getPrices()
  onboardingComplete: false,
};

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

export function initSettings() {
  const saved = _load();
  _settings = saved ? { ...DEFAULTS, ...saved } : { ...DEFAULTS };
  if (_settings.aiApiKey) {
    if (!_settings.aiApiKeys || typeof _settings.aiApiKeys !== "object")
      _settings.aiApiKeys = { anthropic: "", openai: "", google: "" };
    _settings.aiApiKeys[_settings.aiProvider || "anthropic"] = _settings.aiApiKey;
    delete _settings.aiApiKey;
    _save(_settings);
  }
  return _settings;
}

export function getSettings() {
  return _settings;
}

// ---------------------------------------------------------------------------
// Onboarding
// First launch is detected by onboardingComplete === false.
// completeOnboarding() is called after the user finishes the initial setup flow.
// ---------------------------------------------------------------------------

export function isFirstLaunch() {
  return !_settings.onboardingComplete;
}

export function completeOnboarding() {
  _settings.onboardingComplete = true;
  _save(_settings);
}

// ---------------------------------------------------------------------------
// Tech name
// ---------------------------------------------------------------------------

export function setTechName(name) {
  _settings.techName = name;
  _save(_settings);
}

// ---------------------------------------------------------------------------
// Theme — "dark" | "light"
// The caller (app.js) applies the value to the DOM (data-mode attribute).
// ---------------------------------------------------------------------------

export function setTheme(theme) {
  _settings.theme = theme;
  _save(_settings);
}

// ---------------------------------------------------------------------------
// AI provider config
// ---------------------------------------------------------------------------

export function setAiProvider(provider) {
  _settings.aiProvider = provider;
  _save(_settings);
}

export function getApiKey(provider) {
  return _settings.aiApiKeys[provider] || "";
}

export function setApiKey(provider, key) {
  _settings.aiApiKeys[provider] = key;
  _save(_settings);
}

// ---------------------------------------------------------------------------
// Prices
// setPrice(category, name, value) — override one entry.
//   category: "SERVICE" | "ACCESSORY" | "FIX"
//   name: the key within that category (e.g. "AC", "Float Switch")
//
// setPrice("WEIGHT_IN_FINISH_ADDON", null, 15) — override the scalar addon.
//
// getPrices() returns the full price table (DEFAULT_PRICES shape) with
// user overrides applied — this is the object passed to calculateTotals().
// ---------------------------------------------------------------------------

export function setPrice(category, name, value) {
  if (name === null) {
    _settings.prices[category] = value;
  } else {
    if (!_settings.prices[category]) _settings.prices[category] = {};
    _settings.prices[category][name] = value;
  }
  _save(_settings);
}

export function resetPrices() {
  _settings.prices = {};
  _save(_settings);
}

export function getPrices() {
  const o = _settings.prices || {};
  return {
    SERVICE:               { ...DEFAULT_PRICES.SERVICE,   ...(o.SERVICE   || {}) },
    ACCESSORY:             { ...DEFAULT_PRICES.ACCESSORY, ...(o.ACCESSORY || {}) },
    FIX:                   { ...DEFAULT_PRICES.FIX,       ...(o.FIX       || {}) },
    WEIGHT_IN_FINISH_ADDON: o.WEIGHT_IN_FINISH_ADDON ?? DEFAULT_PRICES.WEIGHT_IN_FINISH_ADDON,
  };
}
