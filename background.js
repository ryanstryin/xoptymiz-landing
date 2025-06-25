// XoptYmiZ Chrome Extension - Background Service Worker

// Installation and update handlers
chrome.runtime.onInstalled.addListener(function(details) {
  if (details.reason === 'install') {
    // First time install
    console.log('XoptYmiZ extension installed!');
    
    // Set default settings
    chrome.storage.sync.set({
      analysisCount: 0,
      installDate: Date.now(),
      showIndicators: true,
      autoAnalyze: false
    });

    // Open welcome page
    chrome.tabs.create({
      url: 'https://xoptymiz.com/extension-welcome'
    });

  } else if (details.reason === 'update') {
    console.log('XoptYmiZ extension updated!');
  }
});

// Handle extension icon click
chrome.action.onClicked.addListener(function(tab) {
  // This is handled by the popup, but we can add fallback behavior here
  console.log('Extension clicked on tab:', tab.url);
});

// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  
  if (request.action === 'openPopup') {
    // Can't programmatically open popup, but we can show notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'XoptYmiZ',
      message: 'Click the XoptYmiZ extension icon to analyze this page!'
    });
    sendResponse({ success: true });
  }

  if (request.action === 'trackAnalysis') {
    // Track analysis usage
    chrome.storage.sync.get(['analysisCount'], function(result) {
      const newCount = (result.analysisCount || 0) + 1;
      chrome.storage.sync.set({ analysisCount: newCount });
      
      // Show upgrade prompt after 10 analyses
      if (newCount === 10) {
        chrome.tabs.create({
          url: 'https://xoptymiz.com/upgrade?source=extension&analyses=10'
        });
      }
    });
    sendResponse({ success: true });
  }

  if (request.action === 'getSettings') {
    chrome.storage.sync.get(['showIndicators', 'autoAnalyze'], function(result) {
      sendResponse(result);
    });
    return true; // Keep message channel open for async response
  }

  if (request.action === 'saveSettings') {
    chrome.storage.sync.set(request.settings, function() {
      sendResponse({ success: true });
    });
    return true;
  }
});

// Context menu setup
chrome.runtime.onInstalled.addListener(function() {
  chrome.contextMenus.create({
    id: 'analyzeWithXoptymiz',
    title: 'Analyze with XoptYmiZ',
    contexts: ['page', 'selection']
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(function(info, tab) {
  if (info.menuItemId === 'analyzeWithXoptymiz') {
    // Open popup or trigger analysis
    chrome.action.openPopup();
  }
});

// Badge text to show analysis count
chrome.storage.sync.get(['analysisCount'], function(result) {
  const count = result.analysisCount || 0;
  if (count > 0) {
    chrome.action.setBadgeText({ text: count.toString() });
    chrome.action.setBadgeBackgroundColor({ color: '#667eea' });
  }
});

// Update badge when analysis count changes
chrome.storage.onChanged.addListener(function(changes, namespace) {
  if (namespace === 'sync' && changes.analysisCount) {
    const count = changes.analysisCount.newValue || 0;
    chrome.action.setBadgeText({ text: count > 0 ? count.toString() : '' });
  }
});

// Periodic tasks (run every hour)
chrome.alarms.onAlarm.addListener(function(alarm) {
  if (alarm.name === 'hourlyCheck') {
    // Send usage data to analytics
    chrome.storage.sync.get(['analysisCount', 'installDate'], function(result) {
      const daysSinceInstall = Math.floor((Date.now() - result.installDate) / (1000 * 60 * 60 * 24));
      
      // Send analytics data
      // fetch('https://your-analytics-endpoint.com/usage', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     analysisCount: result.analysisCount,
      //     daysSinceInstall: daysSinceInstall,
      //     timestamp: Date.now()
      //   })
      // });
      
      console.log('Usage stats:', {
        analyses: result.analysisCount,
        days: daysSinceInstall
      });
    });
  }
});

// Set up periodic alarm
chrome.alarms.create('hourlyCheck', { delayInMinutes: 60, periodInMinutes: 60 });

// Handle extension uninstall (for feedback)
chrome.runtime.setUninstallURL('https://xoptymiz.com/extension-feedback');

// Keyboard shortcuts
chrome.commands.onCommand.addListener(function(command) {
  if (command === 'analyze-page') {
    // Get current tab and trigger analysis
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'quickAnalyze' });
      }
    });
  }
});

// Web request intercepting (for future API integration)
chrome.webRequest.onBeforeRequest.addListener(
  function(details) {
    // Intercept requests to add XoptYmiZ headers or modify
    // This can be used for direct API integration in the future
    return {};
  },
  { urls: ["https://xoptymiz.com/*"] },
  ["requestBody"]
);