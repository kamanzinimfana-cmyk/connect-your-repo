// Sphaz Nexus Content Script — runs on all pages
// Handles DOM reading and action execution

(function() {
  'use strict';

  // Notify the Nexus web app that extension is present
  if (window.location.href.includes('localhost:8080') || window.location.href.includes('lovable.app')) {
    window.postMessage({ type: 'NEXUS_EXTENSION_CONNECTED' }, '*');
  }

  // Listen for messages from the web app (via postMessage)
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;

    if (event.data?.type === 'NEXUS_PING') {
      window.postMessage({ type: 'NEXUS_EXTENSION_CONNECTED' }, '*');
    }

    if (event.data?.type === 'NEXUS_GET_PAGE') {
      const content = extractPageContent();
      window.postMessage({ type: 'NEXUS_PAGE_CONTENT', content }, '*');
    }

    if (event.data?.type === 'NEXUS_EXECUTE_ACTION') {
      executeAction(event.data.action);
    }
  });

  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'NEXUS_SCAN_PAGE') {
      const content = extractPageContent();
      chrome.runtime.sendMessage({
        type: 'NEXUS_PAGE_SCANNED',
        content: content
      });
      sendResponse({ success: true });
    }

    if (message.type === 'NEXUS_DO_ACTION') {
      executeAction(message.action);
      sendResponse({ success: true });
    }

    return false;
  });

  function extractPageContent() {
    // Get all visible text and form elements
    const body = document.body;
    if (!body) return '';

    // Extract structured page info
    const pageData = {
      title: document.title,
      url: window.location.href,
      text: body.innerText?.substring(0, 5000) || '',
      forms: [],
      buttons: [],
      inputs: [],
      links: []
    };

    // Extract form elements
    document.querySelectorAll('input, select, textarea').forEach(el => {
      pageData.inputs.push({
        tag: el.tagName.toLowerCase(),
        type: el.getAttribute('type') || '',
        name: el.getAttribute('name') || '',
        id: el.id || '',
        placeholder: el.getAttribute('placeholder') || '',
        value: el.value || '',
        visible: el.offsetParent !== null
      });
    });

    // Extract buttons
    document.querySelectorAll('button, [role="button"], input[type="submit"]').forEach(el => {
      pageData.buttons.push({
        text: el.textContent?.trim().substring(0, 100) || '',
        id: el.id || '',
        className: el.className?.substring?.(0, 100) || '',
        visible: el.offsetParent !== null
      });
    });

    // Extract radio/checkbox options
    document.querySelectorAll('input[type="radio"], input[type="checkbox"]').forEach(el => {
      const label = el.closest('label')?.textContent?.trim() ||
        document.querySelector(`label[for="${el.id}"]`)?.textContent?.trim() || '';
      pageData.forms.push({
        type: el.getAttribute('type'),
        name: el.getAttribute('name') || '',
        value: el.value || '',
        label: label,
        checked: el.checked
      });
    });

    return JSON.stringify(pageData, null, 2);
  }

  function executeAction(action) {
    if (!action) return;

    try {
      switch (action.type) {
        case 'click': {
          const el = findElement(action.target);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => {
              el.click();
              highlightElement(el, 'click');
            }, 300);
          }
          break;
        }

        case 'type': {
          const el = findElement(action.target);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.focus();
            el.value = action.value || '';
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            highlightElement(el, 'type');
          }
          break;
        }

        case 'select': {
          const el = findElement(action.target);
          if (el && el.tagName === 'SELECT') {
            el.value = action.value || '';
            el.dispatchEvent(new Event('change', { bubbles: true }));
            highlightElement(el, 'select');
          }
          break;
        }

        case 'scroll': {
          window.scrollBy({ top: 300, behavior: 'smooth' });
          break;
        }

        case 'navigate': {
          if (action.value) {
            window.location.href = action.value;
          }
          break;
        }

        case 'wait': {
          // No-op, handled by caller
          break;
        }
      }
    } catch (err) {
      console.error('[Nexus] Action error:', err);
    }
  }

  function findElement(target) {
    if (!target) return null;

    // Try CSS selector first
    try {
      const el = document.querySelector(target);
      if (el) return el;
    } catch {}

    // Try finding by text content
    const allElements = document.querySelectorAll('button, a, input, select, label, [role="button"], [role="option"]');
    for (const el of allElements) {
      const text = el.textContent?.trim().toLowerCase() || '';
      if (text.includes(target.toLowerCase()) || target.toLowerCase().includes(text)) {
        if (el.offsetParent !== null) return el;
      }
    }

    // Try by id
    const byId = document.getElementById(target);
    if (byId) return byId;

    // Try by name
    const byName = document.querySelector(`[name="${target}"]`);
    if (byName) return byName;

    return null;
  }

  function highlightElement(el, actionType) {
    const colors = { click: '#3b82f6', type: '#22c55e', select: '#eab308' };
    const color = colors[actionType] || '#3b82f6';

    el.style.outline = `3px solid ${color}`;
    el.style.outlineOffset = '2px';
    el.style.transition = 'outline 0.3s ease';

    setTimeout(() => {
      el.style.outline = '';
      el.style.outlineOffset = '';
    }, 1500);
  }
})();
