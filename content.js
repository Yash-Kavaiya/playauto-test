// content.js

class ActivityTracker {
    constructor() {
      this.events = [];
      this.isRecording = false;
      this.observers = new Map();  // Store all observers
    }
  
    startRecording() {
      console.log('Recording started');
      this.isRecording = true;
      this.events = [];
      this.setupEventListeners();
      this.setupMutationObserver();
    }
  
    stopRecording() {
      console.log('Recording stopped');
      this.isRecording = false;
      this.removeEventListeners();
      this.disconnectObservers();
    }
  
    setupEventListeners() {
      // Using named functions for better cleanup
      this.clickHandler = this.handleClick.bind(this);
      this.inputHandler = this.handleInput.bind(this);
      this.navigationHandler = this.handleNavigation.bind(this);
  
      // Capture phase for better event handling
      document.addEventListener('click', this.clickHandler, true);
      document.addEventListener('input', this.inputHandler, true);
      window.addEventListener('popstate', this.navigationHandler);
      window.addEventListener('hashchange', this.navigationHandler);
    }
  
    removeEventListeners() {
      document.removeEventListener('click', this.clickHandler, true);
      document.removeEventListener('input', this.inputHandler, true);
      window.removeEventListener('popstate', this.navigationHandler);
      window.removeEventListener('hashchange', this.navigationHandler);
    }
  
    setupMutationObserver() {
      const observer = new MutationObserver((mutations) => {
        if (!this.isRecording) return;
        
        mutations.forEach(mutation => {
          if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            this.handleDynamicContent(mutation.addedNodes);
          }
        });
      });
  
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
  
      this.observers.set('mutation', observer);
    }
  
    disconnectObservers() {
      for (const observer of this.observers.values()) {
        observer.disconnect();
      }
      this.observers.clear();
    }
  
    handleClick(event) {
      if (!this.isRecording) return;
  
      try {
        const element = event.target;
        const selector = this.generateSelector(element);
        
        // Don't record clicks on non-interactive elements
        if (!this.isInteractiveElement(element)) return;
  
        this.events.push({
          type: 'click',
          selector,
          timestamp: Date.now(),
          url: window.location.href,
          elementType: element.tagName.toLowerCase(),
          text: element.textContent?.trim() || ''
        });
  
        console.log('Click recorded:', selector);
      } catch (error) {
        console.error('Error recording click:', error);
      }
    }
  
    handleInput(event) {
      if (!this.isRecording) return;
      
      try {
        const element = event.target;
        // Skip password fields for security
        if (element.type === 'password') return;
  
        const selector = this.generateSelector(element);
        
        this.events.push({
          type: 'input',
          selector,
          value: element.type === 'checkbox' ? element.checked : element.value,
          timestamp: Date.now(),
          url: window.location.href,
          elementType: element.tagName.toLowerCase()
        });
  
        console.log('Input recorded:', selector);
      } catch (error) {
        console.error('Error recording input:', error);
      }
    }
  
    handleNavigation() {
      if (!this.isRecording) return;
  
      this.events.push({
        type: 'navigation',
        url: window.location.href,
        timestamp: Date.now()
      });
  
      console.log('Navigation recorded:', window.location.href);
    }
  
    isInteractiveElement(element) {
      const interactiveTags = ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'];
      const interactiveRoles = ['button', 'link', 'menuitem', 'tab', 'checkbox', 'radio'];
      
      return (
        interactiveTags.includes(element.tagName) ||
        element.onclick ||
        element.getAttribute('role') && interactiveRoles.includes(element.getAttribute('role')) ||
        element.classList.contains('clickable') ||
        window.getComputedStyle(element).cursor === 'pointer'
      );
    }
  
    generateSelector(element) {
      try {
        // Priority order for selector generation
        const selectors = [];
  
        // 1. Try data-testid
        if (element.dataset.testid) {
          selectors.push(`[data-testid="${element.dataset.testid}"]`);
        }
  
        // 2. Try ID
        if (element.id) {
          selectors.push(`#${CSS.escape(element.id)}`);
        }
  
        // 3. Try aria-label
        const ariaLabel = element.getAttribute('aria-label');
        if (ariaLabel) {
          selectors.push(`[aria-label="${CSS.escape(ariaLabel)}"]`);
        }
  
        // 4. Try role with text
        const role = element.getAttribute('role');
        if (role) {
          const text = element.textContent?.trim();
          if (text) {
            selectors.push(`[role="${role}"]`);
          }
        }
  
        // 5. Try button/link text
        if (element.tagName === 'BUTTON' || element.tagName === 'A') {
          const text = element.textContent?.trim();
          if (text) {
            selectors.push(`${element.tagName.toLowerCase()}:has-text("${CSS.escape(text)}")`);
          }
        }
  
        // 6. Fallback to unique CSS selector
        const fallbackSelector = this.generateUniqueCssSelector(element);
        if (fallbackSelector) {
          selectors.push(fallbackSelector);
        }
  
        // Return the first valid selector that uniquely identifies the element
        for (const selector of selectors) {
          try {
            if (document.querySelectorAll(selector).length === 1) {
              return selector;
            }
          } catch (e) {
            continue;
          }
        }
  
        // If no unique selector found, return a combination
        return selectors[0] || '*';
  
      } catch (error) {
        console.error('Error generating selector:', error);
        return 'body'; // Fallback
      }
    }
  
    generateUniqueCssSelector(element) {
      const path = [];
      while (element && element.nodeType === Node.ELEMENT_NODE) {
        let selector = element.tagName.toLowerCase();
        
        if (element.id) {
          selector += `#${CSS.escape(element.id)}`;
          path.unshift(selector);
          break;
        }
        
        let nth = 1;
        let sibling = element;
        
        while (sibling.previousElementSibling) {
          sibling = sibling.previousElementSibling;
          if (sibling.tagName === element.tagName) nth++;
        }
        
        if (nth > 1) selector += `:nth-of-type(${nth})`;
        
        path.unshift(selector);
        element = element.parentNode;
      }
      
      return path.join(' > ');
    }
  
    handleDynamicContent(nodes) {
      nodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // Add event listeners to new interactive elements
          if (this.isInteractiveElement(node)) {
            this.setupElementListeners(node);
          }
          // Check children
          node.querySelectorAll('*').forEach(child => {
            if (this.isInteractiveElement(child)) {
              this.setupElementListeners(child);
            }
          });
        }
      });
    }
  
    setupElementListeners(element) {
      element.addEventListener('click', this.clickHandler, true);
      if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
        element.addEventListener('input', this.inputHandler, true);
      }
    }
  
    generatePlaywrightTest() {
      let test = `
  import { test, expect } from '@playwright/test';
  
  test('Recorded user journey', async ({ page }) => {
    // Set longer timeout for stability
    page.setDefaultTimeout(10000);
    
    // Initial navigation
    await page.goto('${this.events[0]?.url || window.location.href}', {
      waitUntil: 'networkidle'
    });
  `;
  
      let lastUrl = this.events[0]?.url || window.location.href;
      
      for (const event of this.events) {
        // Add URL check if URL changed
        if (event.url && event.url !== lastUrl) {
          test += `
    // Wait for URL change
    await page.waitForURL('${event.url}');`;
          lastUrl = event.url;
        }
  
        switch (event.type) {
          case 'click':
            test += `
    // Click interaction
    await Promise.all([
      page.waitForLoadState('networkidle'),
      page.click('${event.selector}', { timeout: 10000 })
    ]);`;
            break;
            
          case 'input':
            if (typeof event.value === 'boolean') {
              test += `
    // Checkbox interaction
    await page.setChecked('${event.selector}', ${event.value});`;
            } else {
              test += `
    // Input interaction
    await page.fill('${event.selector}', '${event.value}');`;
            }
            break;
            
          case 'navigation':
            test += `
    // Navigation
    await page.waitForLoadState('networkidle');`;
            break;
        }
      }
  
      test += `
  });`;
  
      return test;
    }
  
    generateReport() {
      if (this.events.length === 0) {
        console.warn('No events recorded');
        return;
      }
  
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const websiteName = window.location.hostname;
      const filename = `${timestamp}_${websiteName}_report.html`;
  
      const html = `<!DOCTYPE html>
  <html>
  <head>
    <title>Test Case Report</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 20px; }
      pre { background: #f5f5f5; padding: 15px; border-radius: 5px; }
      .event { margin: 10px 0; padding: 10px; border: 1px solid #ddd; }
    </style>
  </head>
  <body>
    <h1>Test Case Report</h1>
    <h2>Website: ${websiteName}</h2>
    <h2>Timestamp: ${new Date().toLocaleString()}</h2>
    
    <h3>Recorded Events:</h3>
    ${this.events.map(event => `
      <div class="event">
        <strong>Type:</strong> ${event.type}<br>
        ${event.selector ? `<strong>Selector:</strong> ${event.selector}<br>` : ''}
        ${event.value !== undefined ? `<strong>Value:</strong> ${event.value}<br>` : ''}
        <strong>Timestamp:</strong> ${new Date(event.timestamp).toLocaleString()}
      </div>
    `).join('')}
    
    <h3>Generated Playwright Test:</h3>
    <pre><code>${this.generatePlaywrightTest()}</code></pre>
  </body>
  </html>`;
  
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      
      chrome.runtime.sendMessage({
        action: 'downloadReport',
        payload: { 
          url,
          filename: `playwright_tests/${filename}`
        }
      });
    }
  }
  
  // Initialize tracker
  const tracker = new ActivityTracker();
  
  // Handle messages from popup
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Ping check for initialization
    if (message.action === 'ping') {
      sendResponse('pong');
      return true;
    }
  
    try {
      switch (message.action) {
        case 'startRecording':
          tracker.startRecording();
          break;
        case 'stopRecording':
          tracker.stopRecording();
          break;
        case 'generateReport':
          tracker.generateReport();
          break;
      }
      sendResponse({ success: true });
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ success: false, error: error.message });
    }
    return true;
  });
