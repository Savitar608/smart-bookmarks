import { api } from '../utils/browser-api.js';
import { getCategoryFromAI } from '../utils/ai-classifier.js';

const defaultSettings = {
  provider: 'openai',
  keys: { openai: '', gemini: '', deepseek: '', ollama: 'http://localhost:11434' },
  modelNames: { openai: 'gpt-4o-mini', gemini: 'gemini-2.5-flash-lite', deepseek: 'deepseek-chat', ollama: 'llama3' }
};

let currentSettings = { ...defaultSettings };

const providerSelect = document.getElementById('provider');
const apiKeyInput = document.getElementById('apiKey');
const modelInput = document.getElementById('customModel');

// Update UI when dropdown changes
providerSelect.addEventListener('change', () => {
  const provider = providerSelect.value;
  apiKeyInput.value = currentSettings.keys[provider] || '';
  modelInput.value = currentSettings.modelNames[provider] || '';
  modelInput.placeholder = defaultSettings.modelNames[provider];
  
  if (provider === 'ollama') {
    apiKeyInput.type = 'text';
    document.getElementById('hintText').textContent = 'Server URL (default: http://localhost:11434)';
  } else {
    apiKeyInput.type = 'password';
    document.getElementById('hintText').textContent = 'API Key stored locally.';
  }
});

// Save Settings
document.getElementById('save').addEventListener('click', async () => {
  const provider = providerSelect.value;
  currentSettings.provider = provider;
  currentSettings.keys[provider] = apiKeyInput.value.trim();
  currentSettings.modelNames[provider] = modelInput.value.trim();

  await api.storage.sync.set({ settings: currentSettings });
  
  const status = document.getElementById('status');
  status.textContent = 'Saved!';
  setTimeout(() => status.textContent = '', 1500);
});

// Restore Settings on Load
document.addEventListener('DOMContentLoaded', async () => {
  const data = await api.storage.sync.get('settings');
  if (data.settings) {
    // Merge saved data with defaults (handles new fields in future updates)
    currentSettings = { 
        ...defaultSettings, 
        ...data.settings, 
        keys: { ...defaultSettings.keys, ...data.settings.keys },
        modelNames: { ...defaultSettings.modelNames, ...data.settings.modelNames }
    };
  }
  providerSelect.value = currentSettings.provider;
  providerSelect.dispatchEvent(new Event('change'));
});

// Debug Logic
document.getElementById('testBtn').addEventListener('click', async () => {
  const resultBox = document.getElementById('testResult');
  resultBox.textContent = "Thinking...";
  resultBox.className = "result-box visible";
  
  const title = document.getElementById('testTitle').value;
  const url = document.getElementById('testUrl').value;

  if(!title || !url) {
      resultBox.textContent = "Please enter Title and URL.";
      return;
  }

  const res = await getCategoryFromAI(title, url);
  
  if (res) {
    resultBox.textContent = ''; // Clear previous text safely

    const label = document.createElement('strong');
    label.textContent = 'AI Suggestion:';

    const text = document.createTextNode(`\n📂 ${res}`);

    resultBox.appendChild(label);
    resultBox.appendChild(text);

    resultBox.style.borderLeft = "4px solid green";
  } else {
    // resultBox.textContent = "Failed. Check Console/API Key.";
    // resultBox.style.borderLeft = "4px solid red";
    resultBox.textContent = "Error: " + err.message;
    resultBox.style.borderLeft = "4px solid red";
  }
});