// Basic State Management
let isEnabled = false;

// Initialize
chrome.storage.sync.get(['enabled'], (result) => {
  isEnabled = result.enabled ?? false;
  console.log('PromptNexus: Initialized, Enabled =', isEnabled);
});

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync' && changes.enabled) {
    isEnabled = changes.enabled.newValue;
    console.log('PromptNexus: State changed to', isEnabled);
  }
});

// EVENT DELEGATION: Listen globally on the document
// 'true' for useCapture ensures we catch the event before page scripts might stop propagation
document.addEventListener('input', (e) => {
  if (!isEnabled) return;

  const target = e.target;

  // 1. Identify valid input mechanisms
  const isTextarea = target.tagName === 'TEXTAREA';
  const isContentEditable = target.isContentEditable || target.getAttribute('contenteditable') === 'true';

  if (!isTextarea && !isContentEditable) return;

  // 2. VISUAL DEBUGGING: Add a border to prove we found it
  // This will flash red when you type
  target.style.outline = "2px solid red";
  setTimeout(() => {
    target.style.outline = "";
  }, 200);

  // 3. Extract Text
  let text = '';
  if (isTextarea) {
    text = target.value;
  } else if (isContentEditable) {
    text = target.innerText || target.textContent;
  }

  // 4. Log using WARN to avoid "Info" filters being hidden
  console.warn('PromptNexus [Captured]:', text);

  // 5. Replacement Logic
  if (text.endsWith('hello')) {
    console.warn('PromptNexus: Keyword detected!');

    if (isTextarea) {
      const newValue = target.value.replace(/hello$/, 'hi');
      target.value = newValue;
    }
    else if (isContentEditable) {
      console.warn("PromptNexus: Matches 'hello' (ContentEditable)");
    }
  }

}, true);