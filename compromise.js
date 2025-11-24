// content.js - Load compromise.js globally
class ContentScript {
  constructor() {
    this.init();
  }

  async init() {
    try {
      // Load compromise.js if not already loaded
      await this.loadCompromise();
      this.setupMessageListener();
    } catch (error) {
      console.error('Content script initialization failed:', error);
    }
  }

  async loadCompromise() {
    return new Promise((resolve, reject) => {
      if (window.nlp) {
        resolve();
        return;
      }

      // Load compromise.js from extension resources
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL('compromise.js');
      script.onload = () => {
        console.log('Compromise.js loaded globally');
        resolve();
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      try {
        if (request.action === "find_link") {
          const link = this.findPolicyLink();
          sendResponse({ url: link });
        } else {
          sendResponse({ error: "Unknown action" });
        }
      } catch (error) {
        console.error('Error handling message in content script:', error);
        sendResponse({ error: error.message });
      }
      return true;
    });
  }

  findPolicyLink() {
    try {
      const links = Array.from(document.getElementsByTagName('a'));
      const textRegex = /privacy\s*policy|privacy\s*notice|privacy/i;
      const urlRegex = /privacy/i;

      // Pass 1: High Accuracy - Check Visible Text
      for (let link of links) {
        try {
          const text = link.innerText?.trim() || '';
          if (text.length > 2 && textRegex.test(text) && link.href) {
            return link.href;
          }
        } catch (error) {
          continue;
        }
      }

      // Pass 2: Fallback - Check URL structure
      for (let link of links) {
        try {
          if (link.href && urlRegex.test(link.href)) {
            return link.href;
          }
        } catch (error) {
          continue;
        }
      }

      return null;
    } catch (error) {
      console.error('Error finding policy link:', error);
      return null;
    }
  }
}

// Initialize content script
new ContentScript();