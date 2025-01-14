let isRecording = false;
let isInitialized = false;

// Function to check if content script is ready
async function checkContentScript(tabId) {
  try {
    const response = await chrome.tabs.sendMessage(tabId, { action: 'ping' });
    return response === 'pong';
  } catch (error) {
    return false;
  }
}

// Function to initialize content script if not ready
async function ensureContentScript(tabId) {
  const isReady = await checkContentScript(tabId);
  if (!isReady) {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content.js']
    });
    // Wait for content script to initialize
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

// Initialize recording status
async function initializePopup() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  await ensureContentScript(tab.id);
  
  // Get recording status from storage
  const result = await chrome.storage.local.get(['isRecording']);
  isRecording = result.isRecording || false;
  isInitialized = true;
  
  updateUI();
}

// Update UI elements
function updateUI() {
  const toggleButton = document.getElementById('toggleRecording');
  const statusDiv = document.getElementById('recordingStatus');
  
  toggleButton.textContent = isRecording ? 'Stop Recording' : 'Start Recording';
  toggleButton.classList.toggle('recording', isRecording);
  toggleButton.disabled = !isInitialized;
  
  statusDiv.textContent = `Status: ${isRecording ? 'Recording' : 'Not Recording'}`;
  statusDiv.className = `status ${isRecording ? 'active' : 'inactive'}`;
}

// Show disclaimer before starting recording
async function showDisclaimer() {
  return confirm(
    'This extension will record your interactions and generate Playwright test cases.\n' +
    'No sensitive data will be captured.\n\n' +
    'Do you want to continue?'
  );
}

// Handle recording toggle
document.getElementById('toggleRecording').addEventListener('click', async () => {
  if (!isInitialized) return;
  
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  if (!isRecording && !await showDisclaimer()) {
    return;
  }

  isRecording = !isRecording;
  
  // Store recording status
  await chrome.storage.local.set({ isRecording });
  
  if (isRecording) {
    await chrome.tabs.sendMessage(tab.id, { action: 'startRecording' });
  } else {
    await chrome.tabs.sendMessage(tab.id, { action: 'stopRecording' });
    // Wait a bit before generating report
    setTimeout(async () => {
      await chrome.tabs.sendMessage(tab.id, { action: 'generateReport' });
    }, 500);
  }
  
  updateUI();
});

// Initialize popup when opened
document.addEventListener('DOMContentLoaded', initializePopup);
