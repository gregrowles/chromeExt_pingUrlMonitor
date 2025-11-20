// DOM elements
const pingIntervalInput = document.getElementById('pingInterval');
const saveIntervalBtn = document.getElementById('saveInterval');
const newUrlInput = document.getElementById('newUrl');
const addUrlBtn = document.getElementById('addUrl');
const urlList = document.getElementById('urlList');
const emptyState = document.getElementById('emptyState');

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  await loadUrls();
  setupEventListeners();
  initializeTooltips();
});

// Initialize tooltips with Popper.js (via Tippy.js)
function initializeTooltips() {
  if (typeof tippy !== 'undefined') {
    tippy('[data-tippy-content]', {
      theme: 'light-border',
      placement: 'top',
      arrow: true
    });
  }
}

// Load settings from storage
async function loadSettings() {
  const result = await chrome.storage.sync.get(['pingInterval']);
  if (result.pingInterval) {
    pingIntervalInput.value = result.pingInterval;
  }
}

// Load URLs from storage
async function loadUrls() {
  const result = await chrome.storage.sync.get(['urls']);
  const urls = result.urls || [];
  
  if (urls.length === 0) {
    emptyState.style.display = 'block';
    urlList.style.display = 'none';
  } else {
    emptyState.style.display = 'none';
    urlList.style.display = 'block';
    renderUrls(urls);
  }
}

// Render URLs list
function renderUrls(urls) {
  urlList.innerHTML = '';
  
  urls.forEach((urlData, index) => {
    const urlItem = createUrlItem(urlData, index);
    urlList.appendChild(urlItem);
  });
}

// Create URL item element
function createUrlItem(urlData, index) {
  const div = document.createElement('div');
  div.className = 'flex items-center justify-between p-3 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors';
  
  const statusClass = urlData.status === 'online' 
    ? 'bg-green-500' 
    : urlData.status === 'offline' 
    ? 'bg-red-500' 
    : 'bg-gray-400';
  
  const statusText = urlData.status === 'online' 
    ? 'Online' 
    : urlData.status === 'offline' 
    ? 'Offline' 
    : 'Checking...';
  
  const lastChecked = urlData.lastChecked 
    ? new Date(urlData.lastChecked).toLocaleTimeString()
    : 'Never';
  
  const fullLastChecked = urlData.lastChecked 
    ? new Date(urlData.lastChecked).toLocaleString()
    : 'Never checked';
  
  div.innerHTML = `
    <div class="flex items-center gap-3 flex-1">
      <div class="status-indicator w-3 h-3 rounded-full ${statusClass}" data-tippy-content="${statusText}"></div>
      <div class="flex-1">
        <div class="font-medium text-gray-800 url-text" data-tippy-content="${urlData.url}">${urlData.url}</div>
        <div class="text-xs text-gray-500 last-checked" data-tippy-content="${fullLastChecked}">Last checked: ${lastChecked}</div>
      </div>
    </div>
    <button 
      class="delete-url px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors text-sm"
      data-index="${index}"
      data-tippy-content="Remove this URL from monitoring"
    >
      Delete
    </button>
  `;
  
  // Add delete event listener
  const deleteBtn = div.querySelector('.delete-url');
  deleteBtn.addEventListener('click', () => deleteUrl(index));
  
  // Initialize tooltips with Popper.js (via Tippy.js)
  if (typeof tippy !== 'undefined') {
    tippy(div.querySelectorAll('[data-tippy-content]'), {
      theme: 'light-border',
      placement: 'top',
      arrow: true
    });
  }
  
  return div;
}

// Setup event listeners
function setupEventListeners() {
  saveIntervalBtn.addEventListener('click', saveInterval);
  addUrlBtn.addEventListener('click', addUrl);
  newUrlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      addUrl();
    }
  });
}

// Save ping interval
async function saveInterval() {
  const interval = parseInt(pingIntervalInput.value);
  
  if (isNaN(interval) || interval < 5) {
    alert('Please enter a valid interval (minimum 5 seconds)');
    return;
  }
  
  await chrome.storage.sync.set({ pingInterval: interval });
  
  // Notify background script to update interval
  chrome.runtime.sendMessage({ 
    action: 'updateInterval', 
    interval: interval 
  });
  
  // Show success feedback
  const originalText = saveIntervalBtn.textContent;
  saveIntervalBtn.textContent = 'Saved!';
  saveIntervalBtn.classList.add('bg-green-500', 'hover:bg-green-600');
  saveIntervalBtn.classList.remove('bg-blue-500', 'hover:bg-blue-600');
  
  setTimeout(() => {
    saveIntervalBtn.textContent = originalText;
    saveIntervalBtn.classList.remove('bg-green-500', 'hover:bg-green-600');
    saveIntervalBtn.classList.add('bg-blue-500', 'hover:bg-blue-600');
  }, 2000);
}

// Add new URL
async function addUrl() {
  const url = newUrlInput.value.trim();
  
  if (!url) {
    alert('Please enter a valid URL');
    return;
  }
  
  // Validate URL format
  try {
    new URL(url);
  } catch (e) {
    alert('Please enter a valid URL (must include http:// or https://)');
    return;
  }
  
  const result = await chrome.storage.sync.get(['urls']);
  const urls = result.urls || [];
  
  // Check if URL already exists
  if (urls.some(u => u.url === url)) {
    alert('This URL is already being monitored');
    return;
  }
  
  // Add new URL
  urls.push({
    url: url,
    status: 'checking',
    lastChecked: null
  });
  
  await chrome.storage.sync.set({ urls: urls });
  
  // Clear input
  newUrlInput.value = '';
  
  // Reload display
  await loadUrls();
  
  // Reinitialize tooltips after adding new URL
  initializeTooltips();
  
  // Notify background script to start monitoring
  chrome.runtime.sendMessage({ 
    action: 'startMonitoring', 
    url: url 
  });
}

// Delete URL
async function deleteUrl(index) {
  const result = await chrome.storage.sync.get(['urls']);
  const urls = result.urls || [];
  
  if (index >= 0 && index < urls.length) {
    const deletedUrl = urls[index].url;
    urls.splice(index, 1);
    
    await chrome.storage.sync.set({ urls: urls });
    await loadUrls();
    
    // Notify background script
    chrome.runtime.sendMessage({ 
      action: 'stopMonitoring', 
      url: deletedUrl 
    });
  }
}

// Listen for status updates from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'statusUpdate') {
    loadUrls().then(() => {
      initializeTooltips();
    });
  }
});

