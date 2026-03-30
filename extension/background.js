const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions';
const MODEL = 'mistral-large-latest';

// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'NEXUS_CALL_MISTRAL') {
    handleMistralCall(message).then(sendResponse).catch(err => {
      sendResponse({ error: err.message });
    });
    return true; // Keep channel open for async
  }

  if (message.type === 'NEXUS_EXECUTE_ON_PAGE') {
    // Forward action to the active tab's content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'NEXUS_DO_ACTION',
          action: message.action
        });
      }
    });
    return false;
  }
});

async function handleMistralCall(message) {
  const stored = await chrome.storage.local.get(['mistralApiKey']);
  const apiKey = message.apiKey || stored.mistralApiKey;

  if (!apiKey) {
    return { error: 'No API key configured' };
  }

  const res = await fetch(MISTRAL_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: MODEL,
      messages: message.messages,
      temperature: 0.1,
      max_tokens: 2048,
      response_format: { type: 'json_object' }
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    return { error: `Mistral API error (${res.status}): ${errText}` };
  }

  const data = await res.json();
  return { result: data.choices?.[0]?.message?.content || '' };
}
