// Handle report downloads and ensure directory structure
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'downloadReport') {
      const { url, filename, timestamp } = message.payload;
      
      // Create downloads
      chrome.downloads.download({
        url: url,
        filename: filename,
        saveAs: false // Auto-save to specified directory
      }, (downloadId) => {
        if (chrome.runtime.lastError) {
          console.error('Download failed:', chrome.runtime.lastError);
          return;
        }
        
        // Revoke the blob URL after download starts
        URL.revokeObjectURL(url);
        
        // Store download information
        chrome.storage.local.get('downloads', (result) => {
          const downloads = result.downloads || [];
          downloads.push({
            id: downloadId,
            filename,
            timestamp,
            url: sender.tab.url
          });
          chrome.storage.local.set({ downloads });
        });
      });
    }
    return true;
  });
  
  // Ensure proper cleanup when download completes
  chrome.downloads.onChanged.addListener((delta) => {
    if (delta.state && delta.state.current === 'complete') {
      chrome.storage.local.get('downloads', (result) => {
        const downloads = result.downloads || [];
        const download = downloads.find(d => d.id === delta.id);
        if (download) {
          console.log(`Download completed: ${download.filename}`);
        }
      });
    }
  });
