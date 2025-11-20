// DOM elements
const pingIntervalInput = document.getElementById('pingInterval');
const saveIntervalBtn = document.getElementById('saveInterval');
const newUrlInput = document.getElementById('newUrl');
const newAliasInput = document.getElementById('newAlias');
const addUrlBtn = document.getElementById('addUrl');
const urlList = document.getElementById('urlList');
const emptyState = document.getElementById('emptyState');
const newGroupInput = document.getElementById('newGroup');
const hideLauncherToggle = document.getElementById('hideLauncherToggle');
const tabButtons = document.querySelectorAll('[data-tab-target]');
const tabPanels = document.querySelectorAll('.tab-panel');
let currentTab = '';

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  await loadUrls();
  setupEventListeners();
  initializeTooltips();
  initializeTabs();
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
  const result = await chrome.storage.sync.get(['pingInterval', 'hideLauncher']);
  if (result.pingInterval) {
    pingIntervalInput.value = result.pingInterval;
  }
  if (hideLauncherToggle) {
    hideLauncherToggle.checked = Boolean(result.hideLauncher);
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
  
  urls.sort( (a,b) => ( a.alias || a.url ) > ( b.alias || b.url ) ? 1 : -1 ).forEach((urlData, index) => {
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
  
  const hasAlias = Boolean(urlData.alias && urlData.alias.trim());
  const displayName = hasAlias ? urlData.alias.trim() : urlData.url;
  const primaryTooltip = hasAlias ? urlData.alias.trim() : urlData.url;
  const aliasLine = hasAlias
    ? `<div class="text-xs text-gray-500 break-all" data-tippy-content="${urlData.url}">${urlData.url}</div>`
    : '';
  const groupLabel = urlData.group?.trim();
  const groupLine = groupLabel
    ? `<div class="inline-flex items-center px-2 py-0.5 mt-1 text-[11px] font-medium rounded-full bg-indigo-100 text-indigo-700">
         ${groupLabel}
       </div>`
    : '';
  
  div.innerHTML = `
    <div class="flex items-center gap-3 flex-1">
      <div class="status-indicator w-3 h-3 rounded-full ${statusClass}" data-tippy-content="${statusText}"></div>
      <div class="flex-1">
        <div class="font-medium text-gray-800 url-text break-words" data-tippy-content="${primaryTooltip}">${displayName}</div>
        ${aliasLine}
        ${groupLine}
        <div class="text-xs text-gray-500 last-checked" data-tippy-content="${fullLastChecked}">Last checked: ${lastChecked}</div>
      </div>
    </div>
    <button 
      class="delete-url px-3 py-1 bg-slate-400 text-white rounded-md hover:bg-slate-600 transition-colors text-sm"
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
  newAliasInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      addUrl();
    }
  });
  if (newGroupInput) {
    newGroupInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        addUrl();
      }
    });
  }
  if (hideLauncherToggle) {
    hideLauncherToggle.addEventListener('change', handleHideLauncherToggle);
  }
}

function initializeTabs() {
  if (!tabButtons.length || !tabPanels.length) return;
  tabButtons.forEach((button) => {
    button.addEventListener('click', () => {
      setActiveTab(button.dataset.tabTarget);
    });
  });
  setActiveTab('monitored');
}

function setActiveTab(targetTab) {
  if (!targetTab) return;
  currentTab = targetTab;
  tabPanels.forEach((panel) => {
    const isActive = panel.dataset.tab === targetTab;
    panel.classList.toggle('hidden', !isActive);
  });
  tabButtons.forEach((button) => {
    const isActive = button.dataset.tabTarget === targetTab;
    button.classList.toggle('active', isActive);
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

async function handleHideLauncherToggle() {
  const hideLauncher = hideLauncherToggle.checked;
  await chrome.storage.sync.set({ hideLauncher });
}

// Add new URL
async function addUrl() {
  const url = newUrlInput.value.trim();
  const alias = newAliasInput.value.trim();
  const group = newGroupInput ? newGroupInput.value.trim() : '';
  
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
    alias: alias || null,
    group: group || null,
    status: 'checking',
    lastChecked: null
  });
  
  await chrome.storage.sync.set({ urls: urls });
  
  // Clear input
  newUrlInput.value = '';
  newAliasInput.value = '';
  if (newGroupInput) {
    newGroupInput.value = '';
  }
  
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
  const urls = (result.urls || [] ).sort( (a,b) => ( a.alias || a.url ) > ( b.alias || b.url ) ? 1 : -1 );
  
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

