
let isEnabled = false;
let currentOverlay = null;
let trackingFrame = null;

chrome.storage.sync.get(['enabled'], (result) => {
  isEnabled = result.enabled ?? false;
  console.log('PromptNexus: Initialized, Enabled =', isEnabled);
});

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync' && changes.enabled) {
    isEnabled = changes.enabled.newValue;
    if (!isEnabled) removeOverlay();
  }
});

const style = document.createElement('link');
style.rel = 'stylesheet';
style.href = chrome.runtime.getURL('overlay.css');
document.head.appendChild(style);

function detectPlatform() {
  const url = window.location.href.toLowerCase();
  const hostname = window.location.hostname.toLowerCase();

  if (hostname.includes('chat.openai.com') || hostname.includes('chatgpt.com')) {
    return 'chatgpt';
  } else if (hostname.includes('claude.ai')) {
    return 'claude';
  } else if (hostname.includes('gemini.google.com')) {
    return 'gemini';
  } else if (hostname.includes('perplexity.ai')) {
    return 'perplexity';
  } else if (hostname.includes('copilot.microsoft.com') || hostname.includes('bing.com/chat')) {
    return 'copilot';
  } else if (hostname.includes('poe.com')) {
    return 'poe';
  } else if (hostname.includes('huggingface.co/chat')) {
    return 'huggingface';
  }

  return 'unknown';
}

const PLATFORM_SELECTORS = {
  chatgpt: {
    name: 'ChatGPT',
    strategies: [
      {
        container: '[data-testid^="conversation-turn-"]',
        roleAttr: 'data-message-author-role',
        contentSelector: null,
      },
      {
        container: null,
        roleAttr: 'data-message-author-role',
        contentSelector: null,
      }
    ]
  },

  claude: {
    name: 'Claude',
    strategies: [
      {
        container: '[class*="font-"]',
        detectRole: true,
      },
      {
        userSelector: '[data-is-user-message="true"]',
        assistantSelector: '[data-is-assistant-message="true"]',
      },
      {
        container: 'div[class*="message"]',
        detectRole: true,
      }
    ]
  },

  gemini: {
    name: 'Gemini',
    strategies: [
      {
        container: 'message-content, [class*="message"], [class*="query"], [class*="response"], [class*="turn"], [class*="conversation"] > div',
        detectRole: true,
        useQueryItems: true,
      },
      {
        userSelector: '[data-test-id="user-message"]',
        assistantSelector: '[data-test-id="model-message"]',
      },
      {
        container: 'div',
        detectRole: true,
        minContentLength: 10,
      }
    ]
  },

  perplexity: {
    name: 'Perplexity',
    strategies: [
      {
        container: '[class*="thread"] [class*="message"]',
        detectRole: true,
      }
    ]
  },

  copilot: {
    name: 'Copilot',
    strategies: [
      {
        userSelector: '[class*="user-message"]',
        assistantSelector: '[class*="bot-message"]',
      }
    ]
  },

  poe: {
    name: 'Poe',
    strategies: [
      {
        container: '[class*="Message_"]',
        detectRole: true,
      }
    ]
  },

  huggingface: {
    name: 'HuggingFace Chat',
    strategies: [
      {
        userSelector: '[data-role="user"]',
        assistantSelector: '[data-role="assistant"]',
      }
    ]
  },

  unknown: {
    name: 'Unknown Platform',
    strategies: [
      {
        userSelector: '[role="user"], .user-message, .human-message',
        assistantSelector: '[role="assistant"], .assistant-message, .ai-message, .bot-message',
      }
    ]
  }
};

function scrapeChatContext() {
  const platform = detectPlatform();
  const config = PLATFORM_SELECTORS[platform];

  console.log(`PromptNexus: Scraping ${config.name}...`);

  const messages = scrapeMessages(platform, config);

  const result = {
    platform: config.name,
    platformId: platform,
    url: window.location.href,
    timestamp: new Date().toISOString(),
    messageCount: messages.length,
    messages: messages
  };

  console.log('PromptNexus: Scraped Context:', result);
  return result;
}

function scrapeMessages(platform, config) {
  const messages = [];

  for (const strategy of config.strategies) {
    const strategyMessages = executeStrategy(strategy);

    if (strategyMessages.length > 0) {
      messages.push(...strategyMessages);
      break;
    }
  }

  return deduplicateMessages(messages);
}

function executeStrategy(strategy) {
  const messages = [];

  if (strategy.container && strategy.roleAttr) {
    const containers = document.querySelectorAll(strategy.container);

    containers.forEach(container => {
      const roleElements = container.querySelectorAll(`[${strategy.roleAttr}]`);

      roleElements.forEach(el => {
        const role = el.getAttribute(strategy.roleAttr);
        const content = cleanText(el.innerText);

        if (content) {
          messages.push({ role, content });
        }
      });
    });
  }
  else if (!strategy.container && strategy.roleAttr) {
    const roleElements = document.querySelectorAll(`[${strategy.roleAttr}]`);

    roleElements.forEach(el => {
      const role = el.getAttribute(strategy.roleAttr);
      const content = cleanText(el.innerText);

      if (content) {
        messages.push({ role, content });
      }
    });
  }
  else if (strategy.userSelector && strategy.assistantSelector) {
    const userElements = document.querySelectorAll(strategy.userSelector);
    userElements.forEach(el => {
      const content = cleanText(el.innerText);
      if (content) {
        messages.push({ role: 'user', content, element: el });
      }
    });

    const assistantElements = document.querySelectorAll(strategy.assistantSelector);
    assistantElements.forEach(el => {
      const content = cleanText(el.innerText);
      if (content) {
        messages.push({ role: 'assistant', content, element: el });
      }
    });

    messages.sort((a, b) => {
      if (!a.element || !b.element) return 0;
      return a.element.compareDocumentPosition(b.element) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
    });

    messages.forEach(msg => delete msg.element);
  }
  else if (strategy.container && strategy.detectRole) {
    const containers = document.querySelectorAll(strategy.container);

    containers.forEach(container => {
      const className = container.className.toLowerCase();
      let role = 'unknown';

      if (className.includes('user') || className.includes('human') || className.includes('query')) {
        role = 'user';
      } else if (className.includes('assistant') || className.includes('bot') || className.includes('ai') || className.includes('model') || className.includes('claude') || className.includes('response')) {
        role = 'assistant';
      }

      if (strategy.useQueryItems && container.tagName.toLowerCase() === 'message-content') {
        const parent = container.closest('[class*="query"], [class*="response"]');
        if (parent) {
          const parentClass = parent.className.toLowerCase();
          if (parentClass.includes('query')) role = 'user';
          if (parentClass.includes('response')) role = 'assistant';
        }
      }

      const content = cleanText(container.innerText);
      const minLength = strategy.minContentLength || 0;

      if (content && content.length >= minLength && role !== 'unknown') {
        messages.push({ role, content });
      }
    });
  }

  return messages;
}

function cleanText(text) {
  if (!text) return '';

  return text
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\n{3,}/g, '\n\n');
}

function deduplicateMessages(messages) {
  const seen = new Set();
  const unique = [];

  for (const msg of messages) {
    const key = `${msg.role}:${msg.content}`;

    if (!seen.has(key)) {
      seen.add(key);
      unique.push(msg);
    }
  }

  return unique;
}

const DEFAULT_API_URL = 'https://vibecode-ytth.onrender.com/optimize';

async function getApiUrl() {
  return new Promise((resolve) => {
    // chrome.storage.sync.get(['apiUrl'], (result) => {
    //   resolve(result.apiUrl || DEFAULT_API_URL);
    // });
    resolve(DEFAULT_API_URL)
  });
}

async function enhancePrompt(userPrompt, conversationHistory, model) {
  const apiUrl = await getApiUrl();

  const payload = {
    original_prompt: userPrompt,
    history: conversationHistory,
    model: model,
    focus_area: "general"
  };

  console.log('PromptNexus: API Request:', payload);

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('PromptNexus: API Response:', data);

    return data.optimized_prompt || userPrompt;
  } catch (error) {
    console.error('PromptNexus: API Error:', error);
    return userPrompt;
  }
}


function createOverlay(targetElement) {
  if (currentOverlay) return;

  const overlay = document.createElement('div');
  overlay.className = 'prompt-nexus-overlay';

  overlay.style.zIndex = '2147483647';
  overlay.style.position = 'fixed';
  overlay.style.top = '80%';
  overlay.style.left = '50%';
  overlay.style.transform = 'translate(-30%, -50%)';
  overlay.style.width = '600px';
  overlay.style.maxWidth = '90vw';
  overlay.style.height = 'auto'; // Let content define height

  overlay.innerHTML = `
  <div class="prompt-nexus-footer" style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #1a1a1a; border-radius: 12px 12px 0 0; border-bottom: 1px solid #333;">
    <button class="prompt-nexus-close" style="background: none; border: none; color: #888; cursor: pointer; font-size: 13px; font-weight: 500; padding: 4px 8px; transition: color 0.2s;">Exit</button>
    <button class="prompt-nexus-btn" style="background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%); color: white; border: none; padding: 8px 20px; border-radius: 20px; font-size: 14px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px; box-shadow: 0 2px 10px rgba(99, 102, 241, 0.3);">
      <span>✨ Enhance</span>
    </button>
  </div>
  <textarea
    class="prompt-nexus-input"
    placeholder="Type here to enhance..."
    name="prompt-nexus-input"
    style="width:100%; min-height:150px; padding:15px; font-size:16px; line-height:1.6; border-radius:12px; border:none; background-color:#0f0f0f; color:#ffffff; outline:none; resize:vertical; display: block;"
  ></textarea>
  `;

  document.body.appendChild(overlay);
  currentOverlay = overlay;

  const customInput = overlay.querySelector('.prompt-nexus-input');
  const enhanceBtn = overlay.querySelector('.prompt-nexus-btn');
  const closeBtn = overlay.querySelector('.prompt-nexus-close');

  customInput.value = targetElement.value || targetElement.innerText || "";
  customInput.focus();

  // Removed startTracking(overlay, targetElement); since we want it centered

  const triggerEnhance = async () => {
    const originalText = customInput.value;
    if (!originalText.trim()) return;

    enhanceBtn.textContent = 'Thinking...';
    overlay.classList.add('prompt-nexus-loading');

    const chatContext = scrapeChatContext();
    const enhancedText = await enhancePrompt(originalText, chatContext.messages, chatContext.platformId);

    injectToNative(targetElement, enhancedText);
    removeOverlay();
  };

  customInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      triggerEnhance();
    }
  });

  enhanceBtn.addEventListener('click', triggerEnhance);
  closeBtn.addEventListener('click', () => removeOverlay());
  document.addEventListener('mousedown', handleClickOutside);
}

function startTracking(overlay, target) {
  function update() {
    if (!overlay || !document.body.contains(overlay)) return;

    if (!target.isConnected || target.offsetParent === null) {
      removeOverlay();
      return;
    }

    const rect = target.getBoundingClientRect();
    overlay.style.top = rect.top + 'px';
    overlay.style.left = rect.left + 'px';
    overlay.style.width = rect.width + 'px';
    overlay.style.height = Math.max(rect.height, 120) + 'px';

    trackingFrame = requestAnimationFrame(update);
  }

  trackingFrame = requestAnimationFrame(update);
}

function removeOverlay() {
  if (trackingFrame) {
    cancelAnimationFrame(trackingFrame);
    trackingFrame = null;
  }

  if (currentOverlay) {
    currentOverlay.remove();
    currentOverlay = null;
    document.removeEventListener('mousedown', handleClickOutside);
  }
}


function handleClickOutside(e) {
  if (currentOverlay && !currentOverlay.contains(e.target)) {
  }
}


function injectToNative(target, text) {
  target.focus();

  if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT') {
    // React-compatible value setting
    const nativeInputValueSetter = (Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      "value"
    ) || Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value"
    )).set;

    if (nativeInputValueSetter) {
      nativeInputValueSetter.call(target, text);
    } else {
      target.value = text;
    }

    target.dispatchEvent(new Event('input', { bubbles: true }));
    target.dispatchEvent(new Event('change', { bubbles: true }));
  } else if (target.isContentEditable) {
    // Clear existing content and use execCommand for better undo/state support
    window.getSelection().selectAllChildren(target);
    document.execCommand('delete');
    document.execCommand('insertText', false, text);

    target.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

document.addEventListener('dblclick', (e) => {
  if (!isEnabled) return;

  const target = e.target;
  const isInput = target.tagName === 'TEXTAREA' ||
    target.isContentEditable ||
    (target.tagName === 'INPUT' && target.type === 'text');

  if (isInput) {
    console.log('PromptNexus: Opening Overlay');
    createOverlay(target);
    e.preventDefault();
  }
});