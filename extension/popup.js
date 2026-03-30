const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions';
const MODEL = 'mistral-large-latest';

document.addEventListener('DOMContentLoaded', async () => {
  const apiKeyInput = document.getElementById('apiKey');
  const validateBtn = document.getElementById('validateBtn');
  const keyStatus = document.getElementById('keyStatus');
  const nexusDot = document.getElementById('nexusDot');
  const nexusStatus = document.getElementById('nexusStatus');
  const apiDot = document.getElementById('apiDot');
  const apiStatus = document.getElementById('apiStatus');
  const scanBtn = document.getElementById('scanBtn');
  const connectBtn = document.getElementById('connectBtn');

  // Load saved key
  const stored = await chrome.storage.local.get(['mistralApiKey', 'apiKeyValid']);
  if (stored.mistralApiKey) {
    apiKeyInput.value = stored.mistralApiKey;
    if (stored.apiKeyValid) {
      apiDot.className = 'dot green';
      apiStatus.textContent = 'Connected';
      keyStatus.textContent = '✓ Key validated';
      keyStatus.className = 'valid';
      keyStatus.style.display = 'block';
    }
  }

  // Check if Nexus app tab exists
  try {
    const tabs = await chrome.tabs.query({});
    const nexusTab = tabs.find(t => t.url && (t.url.includes('localhost:8080') || t.url.includes('lovable.app') || t.url.includes('nexus')));
    if (nexusTab) {
      nexusDot.className = 'dot green';
      nexusStatus.textContent = 'Connected';
    } else {
      nexusDot.className = 'dot yellow';
      nexusStatus.textContent = 'Nexus app not detected';
    }
  } catch {
    nexusDot.className = 'dot red';
    nexusStatus.textContent = 'Cannot check tabs';
  }

  // Validate key
  validateBtn.addEventListener('click', async () => {
    const key = apiKeyInput.value.trim();
    if (!key) return;

    keyStatus.textContent = 'Validating...';
    keyStatus.className = 'checking';
    keyStatus.style.display = 'block';
    validateBtn.disabled = true;

    try {
      const res = await fetch(MISTRAL_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 5
        })
      });

      if (res.ok) {
        await chrome.storage.local.set({ mistralApiKey: key, apiKeyValid: true });
        keyStatus.textContent = '✓ Key validated and saved securely';
        keyStatus.className = 'valid';
        apiDot.className = 'dot green';
        apiStatus.textContent = 'Connected';
      } else {
        await chrome.storage.local.set({ apiKeyValid: false });
        keyStatus.textContent = '✗ Invalid key — check and try again';
        keyStatus.className = 'invalid';
        apiDot.className = 'dot red';
        apiStatus.textContent = 'Invalid key';
      }
    } catch (err) {
      keyStatus.textContent = '✗ Network error: ' + err.message;
      keyStatus.className = 'invalid';
    }

    validateBtn.disabled = false;
  });

  // Scan page
  scanBtn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, { type: 'NEXUS_SCAN_PAGE' });
      scanBtn.textContent = 'Scanning...';
      setTimeout(() => { scanBtn.textContent = 'Scan Current Page'; }, 2000);
    }
  });

  // Connect to Nexus
  connectBtn.addEventListener('click', async () => {
    const tabs = await chrome.tabs.query({});
    const nexusTab = tabs.find(t => t.url && (t.url.includes('localhost:8080') || t.url.includes('lovable.app')));
    if (nexusTab?.id) {
      chrome.tabs.sendMessage(nexusTab.id, { type: 'NEXUS_EXTENSION_CONNECTED' });
      nexusDot.className = 'dot green';
      nexusStatus.textContent = 'Connected';
      connectBtn.textContent = 'Connected!';
    } else {
      connectBtn.textContent = 'Nexus app not found';
      setTimeout(() => { connectBtn.textContent = 'Connect to Nexus App'; }, 2000);
    }
  });
});
