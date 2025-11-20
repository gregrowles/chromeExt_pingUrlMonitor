// Background service worker for URL monitoring

let pingInterval = 30; // Default interval in seconds
let monitoringUrls = new Set();
let alarmName = 'urlPingCheck';

// Initialize on extension install/startup
chrome.runtime.onInstalled.addListener(async () => {
  await loadSettings();
  await loadUrls();
  setupAlarm();
});

chrome.runtime.onStartup.addListener(async () => {
  await loadSettings();
  await loadUrls();
  setupAlarm();
});

// Load settings
async function loadSettings() {
  const result = await chrome.storage.sync.get(['pingInterval']);
  if (result.pingInterval) {
    pingInterval = result.pingInterval;
  }
}

// Load URLs and start monitoring
async function loadUrls() {
  const result = await chrome.storage.sync.get(['urls']);
  const urls = result.urls || [];
  monitoringUrls = new Set(urls.map(u => u.url));
}

// Setup alarm for periodic checking
function setupAlarm() {
  // Clear existing alarm
  chrome.alarms.clear(alarmName);
  
  // Create new alarm
  chrome.alarms.create(alarmName, {
    periodInMinutes: pingInterval / 60
  });
}

// Handle alarm trigger
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === alarmName) {
    await checkAllUrls();
  }
});

// Check all URLs
async function checkAllUrls() {
  const result = await chrome.storage.sync.get(['urls']);
  const urls = result.urls || [];
  
  if (urls.length === 0) return;
  
  const checkPromises = urls.map(urlData => checkUrl(urlData.url));
  await Promise.all(checkPromises);
}

// Check a single URL
async function checkUrl(url) {
  try {
    // Use fetch with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(url, {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-cache',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    // For no-cors mode, if fetch doesn't throw, the request was sent
    // We can't read the response, but the fact it didn't error means connection was made
    await updateUrlStatus(url, 'online');
  } catch (error) {
    // If HEAD fails, try GET
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(url, {
        method: 'GET',
        mode: 'no-cors',
        cache: 'no-cache',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      await updateUrlStatus(url, 'online');
    } catch (error2) {
      // Both methods failed, URL is likely offline
      await updateUrlStatus(url, 'offline');
    }
  }
}

// Update URL status in storage
async function updateUrlStatus(url, status) {
  const result = await chrome.storage.sync.get(['urls']);
  const urls = result.urls || [];
  
  const urlIndex = urls.findIndex(u => u.url === url);
  if (urlIndex !== -1) {
    const previousStatus = urls[urlIndex].status;
    urls[urlIndex].status = status;
    urls[urlIndex].lastChecked = Date.now();
    
    await chrome.storage.sync.set({ urls: urls });
    
    // Notify popup if open
    chrome.runtime.sendMessage({
      action: 'statusUpdate',
      url: url,
      status: status
    }).catch(() => {
      // Ignore errors if popup is not open
    });
    
    // If status changed from online to offline, notify
    if (previousStatus === 'online' && status === 'offline') {
      await notifyOffline(url);
    }
  }
}

// Notify user when URL goes offline
async function notifyOffline(url) {
  // Request notification permission
  const permission = await chrome.notifications.getPermissionLevel();
  
  if (permission === 'granted') {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'URL Offline Alert',
      message: `${url} is currently offline`
    });
  } else {
    // Request permission
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'URL Offline Alert',
      message: `${url} is currently offline`
    }, () => {
      // Notification created or permission requested
    });
  }
}

// Handle messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'updateInterval') {
    pingInterval = message.interval;
    setupAlarm();
    sendResponse({ success: true });
  } else if (message.action === 'startMonitoring') {
    monitoringUrls.add(message.url);
    // Immediately check the new URL
    checkUrl(message.url);
    sendResponse({ success: true });
  } else if (message.action === 'stopMonitoring') {
    monitoringUrls.delete(message.url);
    sendResponse({ success: true });
  }
  
  return true; // Keep message channel open for async response
});

// Check URLs immediately when extension starts
chrome.runtime.onInstalled.addListener(() => {
  setTimeout(() => {
    checkAllUrls();
  }, 2000); // Wait 2 seconds after install
});

