# PromptNexus 🚀

PromptNexus is a powerful Chrome extension designed to enhance and optimize your AI prompts by providing context-aware refinements. It works seamlessly across various LLM platforms, scraping your conversation history to provide the backend with the necessary context to generate superior prompts.

![PromptNexus Overlay](https://img.shields.io/badge/UI-Dark%20Mode-black)
![Chrome Extension](https://img.shields.io/badge/Platform-Chrome%20Extension-blue)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-orange)

## ✨ Features

- **Universal Context Scraping**: Automatically identifies and extracts chat history from all major LLM platforms.
- **Context-Aware Optimization**: Sends your current prompt along with conversation history to a specialized backend for enhancement.
- **Premium Centered Overlay**: A sleek, dark-themed modal that appears exactly when you need it.
- **Smart Injection**: Replaces the native input field content with the optimized prompt, handling complex React/ContentEditable fields.
- **Platform Detection**: Intelligent detection of the specific AI tool being used (ChatGPT, Clause, Gemini, etc.) to tailor the extraction logic.

## 🌐 Supported Platforms

- ✅ **ChatGPT** (OpenAI)
- ✅ **Claude** (Anthropic)
- ✅ **Gemini** (Google)
- ✅ **Perplexity**
- ✅ **Copilot** (Microsoft)
- ✅ **Poe**
- ✅ **HuggingFace Chat**

## 🚀 Installation

1. Clone or download this repository.
2. Open Google Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** (toggle in the top right corner).
4. Click **Load unpacked** and select the `PromptNexus` folder.
5. Ensure the extension is enabled in the popup menu.

## 🛠️ Usage

1. Navigate to any supported LLM website (e.g., [chatgpt.com](https://chatgpt.com)).
2. **Double-click** inside the message input box.
3. The PromptNexus Overlay will appear.
4. Type your raw prompt in the overlay.
5. Click **✨ Enhance** or press **Enter**.
6. The extension will "Think...", send the data to the optimizer, and inject the new, optimized prompt directly into the AI's input field!

## ⚙️ Configuration

The extension communicates with a backend API to process prompts. By default, it uses:
`https://vibecode-ytth.onrender.com/optimize`

### API Payload Structure:
```json
{
  "original_prompt": "Your input text",
  "history": [
    { "role": "user", "content": "Hello" },
    { "role": "assistant", "content": "Hi there!" }
  ],
  "model": "chatgpt",
  "focus_area": "general"
}
```

## 🏗️ Technical Stack

- **Javascript (ES6+)**: Core logic and scraping strategies.
- **Manifest V3**: Latest Chrome extension architecture.
- **Chrome Storage API**: Persistent state management.
- **Inline CSS-in-JS**: High-performance, self-contained UI components.

---

*Built with ❤️ for better prompting.*