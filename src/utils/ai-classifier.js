import { api } from './browser-api.js';
import { CONFIG } from '../config.js';

// The system instruction for all models
const SYSTEM_PROMPT = CONFIG.SYSTEM_PROMPT;

/**
 * Main Entry Point
 */
export async function getCategoryFromAI(title, url) {
  // Load settings
  const data = await api.storage.sync.get('settings');
  const settings = data.settings || {};
  
  const provider = settings.provider || 'openai';
  const apiKey = settings.keys?.[provider];
  const model = settings.modelNames?.[provider];

  // Allow Ollama to run without a key, but require one for others
  if (!apiKey && provider !== 'ollama') {
    console.warn(`Smart Bookmarks: Missing API Key for ${provider}`);
    return null;
  }

  const userContent = `Title: ${title}\nURL: ${url}`;

  try {
    switch (provider) {
      case 'gemini':
        return await callGemini(apiKey, model || CONFIG.PROVIDERS.GEMINI.DEFAULT_MODEL, userContent);
      case 'deepseek':
        return await callOpenAICompatible(apiKey, model || CONFIG.PROVIDERS.DEEPSEEK.DEFAULT_MODEL, CONFIG.PROVIDERS.DEEPSEEK.API_URL, userContent);
      case 'ollama':
        return await callOllama(apiKey || CONFIG.PROVIDERS.OLLAMA.DEFAULT_BASE_URL, model || CONFIG.PROVIDERS.OLLAMA.DEFAULT_MODEL, userContent);
      case 'openai':
        return await callOpenAICompatible(apiKey, model || CONFIG.PROVIDERS.OPENAI.DEFAULT_MODEL, CONFIG.PROVIDERS.OPENAI.API_URL, userContent);
      default:
        return await callOpenAICompatible(apiKey, model || CONFIG.PROVIDERS.OPENAI.DEFAULT_MODEL, CONFIG.PROVIDERS.OPENAI.API_URL, userContent);
    }
  } catch (error) {
    console.error(`AI Error (${provider}):`, error);
    return null;
  }
}

// --- Strategies ---

/**
 * Strategy 1: OpenAI Compatible (Works for OpenAI, DeepSeek, Groq, etc.)
 */
async function callOpenAICompatible(key, model, endpoint, content) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${key}`
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: content }
      ],
      temperature: 0.3
    })
  });

  if (!response.ok) throw new Error(await response.text());
  const data = await response.json();
  return data.choices[0].message.content.trim();
}

/**
 * Strategy 2: Google Gemini (Specific JSON structure)
 */
async function callGemini(key, model, content) {
  const url = `${CONFIG.PROVIDERS.GEMINI.API_BASE_URL}${model}:generateContent?key=${key}`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: SYSTEM_PROMPT + "\n\nInput:\n" + content }]
      }]
    })
  });

  if (!response.ok) throw new Error(await response.text());
  const data = await response.json();
  // Gemini path: candidates[0].content.parts[0].text
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
}

/**
 * Strategy 3: Ollama (Localhost)
 */
async function callOllama(baseUrl, model, content) {
  const url = `${baseUrl.replace(/\/$/, '')}${CONFIG.PROVIDERS.OLLAMA.API_PATH}`; // Normalize URL

  const response = await fetch(url, {
    method: "POST",
    body: JSON.stringify({
      model: model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: content }
      ],
      stream: false
    })
  });

  if (!response.ok) throw new Error(await response.text());
  const data = await response.json();
  return data.message.content.trim();
}