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
const notificationsToggle = document.getElementById('notificationsToggle');
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
      theme: 'light-border bg-white p-1 drop-shadow',
      placement: 'top',
      arrow: true,
      removeOnDestroy: true
    });
  }
}
function paddCols(splArr) {
  var ret = [];

  for (var i = 0; i < splArr.length; i++) {
    var col = splArr[i];

    for (var r = 0; r < (6 - (splArr[i]).toString().length); r++) {
      col += '0';
    }

    ret.push(col);
  }

  return ret;
}

function colorHexToRgbA(hex)
{
    var c;
    if ( /^#([A-Fa-f0-9]{3}){1,2}$/.test( hex ) )
    {
        c= hex.substring(1).split('');
        if(c.length== 3){
            c= [c[0], c[0], c[1], c[1], c[2], c[2]];
        }
        c= '0x'+c.join('');
        return (''+[(c>>16)&255, (c>>8)&255, c&255].join(',')+'');
    }
    throw new Error('Bad Hex: ' + hex);
}

function hexColorFromHash( strHash )
{
    var useHash = strHash || '0xD503d8369ed6CA01321456b070CAbd34449642b8';
    var cols = paddCols( useHash.substring(2).match(/.{1,6}/g) );
    var final = [];

    for (var i = 0; i < cols.length; i++)
    {
        final.push ('#' + cols[ i ] );
    }

    return final;
}


// Load settings from storage
async function loadSettings() {
  const result = await chrome.storage.sync.get(['pingInterval', 'hideLauncher', 'notificationsEnabled']);
  if (result.pingInterval) {
    pingIntervalInput.value = result.pingInterval;
  }
  if (hideLauncherToggle) {
    hideLauncherToggle.checked = Boolean(result.hideLauncher);
  }
  if (notificationsToggle) {
    const enabled = result.notificationsEnabled;
    notificationsToggle.checked = enabled !== false;
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
  div.className = 'url-item';
  
  const statusClass = urlData.status === 'online' 
    ? 'status-online' 
    : urlData.status === 'offline' 
    ? 'status-offline' 
    : 'status-checking';
  
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
    ? `<div class="url-subtext" data-tippy-content="${urlData.url}">${urlData.url}</div>`
    : '';
  const groupLabel = urlData.group?.trim();
  const groupLabelHash = groupLabel ? sha256( groupLabel ).substring(0,12) : '';
  const labelBG = groupLabel ? 'rgba(' + colorHexToRgbA( hexColorFromHash( groupLabelHash )[ 0 ] ) + ',0.25)' : '';
  const groupLine = groupLabel
    ? `<div class="group-badge" style="background-color: ${labelBG}">
         ${groupLabel}
       </div>`
    : '';
  
  div.innerHTML = `
    <div class="url-item-left">
      <div class="status-indicator ${statusClass}" data-tippy-content="${statusText}"></div>
      <div class="url-item-details">
        <div class="url-display-name" data-tippy-content="${primaryTooltip}">${displayName}</div>
        ${aliasLine}
        ${groupLine}
        <div class="last-checked" data-tippy-content="${fullLastChecked}">Last checked: ${lastChecked}</div>
      </div>
    </div>
    <button 
      class="btn btn-danger delete-url"
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
  if (notificationsToggle) {
    notificationsToggle.addEventListener('change', handleNotificationsToggle);
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
  saveIntervalBtn.classList.add('btn-success');
  saveIntervalBtn.classList.remove('btn-primary');
  
  setTimeout(() => {
    saveIntervalBtn.textContent = originalText;
    saveIntervalBtn.classList.remove('btn-success');
    saveIntervalBtn.classList.add('btn-primary');
  }, 2000);
}

async function handleHideLauncherToggle() {
  const hideLauncher = hideLauncherToggle.checked;
  await chrome.storage.sync.set({ hideLauncher });
}

async function handleNotificationsToggle() {
  const enabled = notificationsToggle.checked;
  await chrome.storage.sync.set({ notificationsEnabled: enabled });
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

