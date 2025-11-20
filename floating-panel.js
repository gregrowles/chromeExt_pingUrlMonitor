(() => {
  // Avoid injecting multiple times or inside iframes
  if (window !== window.top) return;
  if (window.__urlPingFloatingPanelInjected) return;
  window.__urlPingFloatingPanelInjected = true;

  const PANEL_ID = 'url-ping-floating-panel';
  const LAUNCHER_ID = `${PANEL_ID}-launcher`;
  const STYLE_ID = `${PANEL_ID}-styles`;
  const PANEL_STATE_KEY = 'urlPingPanelState';
  const PANEL_VISIBILITY_KEY = 'urlPingPanelHidden';
  const LAUNCHER_POSITION_KEY = 'urlPingLauncherPosition';

  let panelElement;
  let listContainer;
  let summaryContainer;
  let summaryCountsElement;
  let summaryUpdatedElement;
  let launcherButton;
  let latestTotals = {
    online: 0,
    offline: 0
  };
  let hideLauncherPreference = false;

  function createStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${PANEL_ID} {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 260px;
        max-height: 60vh;
        background: #ffffff;
        color: #1f2937;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        border-radius: 12px;
        box-shadow: 0 10px 25px rgba(15, 23, 42, 0.15);
        border: 1px solid rgba(148, 163, 184, 0.4);
        display: flex;
        flex-direction: column;
        z-index: 2147483647;
        overflow: hidden;
      }
      #${PANEL_ID}.is-hidden {
        display: none;
      }
      #${PANEL_ID}.collapsed {
        width: 200px;
      }
      #${PANEL_ID} header {
        padding: 6px;
        background: linear-gradient(120deg, #1d4ed8, #0ea5e9);
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }
      #${PANEL_ID} header h3 {
        font-size: 14px;
        font-weight: 600;
        margin: 0;
        flex-wrap: wrap;
      }
      #${PANEL_ID} header .title {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      #${PANEL_ID} header .title span {
        font-size: 12px;
        opacity: 0.75;
      }
      #${PANEL_ID} header .controls {
        display: flex;
        gap: 4px;
      }
      #${PANEL_ID} header button {
        background: rgba(255,255,255,0.2);
        border: none;
        color: #fff;
        border-radius: 999px;
        width: 22px;
        height: 22px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: background 0.2s ease;
      }
      #${PANEL_ID} header button[data-action="collapse"] {
        font-size: 20px;
      }
      #${PANEL_ID} header button:hover {
        background: rgba(255,255,255,0.35);
      }
      #${PANEL_ID} .summary {
        display: none;
        padding: 6px;
        border-bottom: 1px solid rgba(148, 163, 184, 0.3);
        font-size: 12px;
        color: #475569;
        background: #f8fafc;
        justify-content: space-between;
        gap: 8px;
      }
      #${PANEL_ID} .summary-updated {
        color: #888;
        font-size: 10px;
        padding: 4px 6px;
        text-align: center;
      }
      #${PANEL_ID}.collapsed .summary {
        display: flex;
        line-height: 18px;
      }
      #${PANEL_ID}.collapsed .summary .summary-counts {
        display: flex;
        gap: 4px;
        line-height: 19px;
        align-items: center;
      }
      #${PANEL_ID}.collapsed .content {
        display: none;
      }
      #${PANEL_ID} .content {
        flex: 1;
        overflow-y: auto;
        padding: 10px 12px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      #${PANEL_ID} .alias-row {
        border: 1px solid rgba(148, 163, 184, 0.4);
        border-radius: 10px;
        padding: 5px 7px;
        background: #f8fafc;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      #${PANEL_ID} .alias-row .alias-name {
        font-size: 13px;
        font-weight: 500;
        padding-left: 2px;
        color: #0f172a;
        word-break: break-word;
      }
      #${PANEL_ID} .alias-row .url {
        font-size: 12px;
        word-break: break-all;
        white-space: nowrap;
      }
      #${PANEL_ID} .alias-row .url a {
        text-decoration:none;
        color: #475569;
      }
      #${PANEL_ID} .alias-row .meta {
        font-size: 10px;
        color: #94a3b8;
        display: flex;
        justify-content: flex-start;
        align-items: center;
        padding: 1px;
      }
      #${PANEL_ID} .status-pill {
        padding: 0 5px;
        border-radius: 999px;
        font-size: 9px;
        font-weight: 600;
        text-transform: capitalize;
        margin-right:4px;
      }
      #${PANEL_ID} .group-pill {
        display: inline-flex;
        align-items: center;
        padding: 1px 6px;
        border-radius: 999px;
        background: rgba(99, 102, 241, 0.15);
        color: #4338ca;
        font-size: 10px;
        font-weight: 600;
        white-space: nowrap;
        margin-top: 2px;
      }
      #${PANEL_ID} .status-online {
        background: rgb(34,197,95);
        color: #15803d;
      }
      #${PANEL_ID} .status-offline {
        background: rgb(239,68,69);
        color: #b91c1c;
      }
      #${PANEL_ID} .status-checking {
        background: rgba(59, 130, 246, 0.15);
        color: #1d4ed8;
      }
      #${PANEL_ID} .empty-state {
        text-align: center;
        font-size: 12px;
        color: #94a3b8;
        padding: 12px 0;
      }
      #${LAUNCHER_ID} {
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: linear-gradient(120deg, #1d4ed8, #0ea5e9);
        border: none;
        border-radius: 999px;
        padding: 6px 10px;
        box-shadow: 0 10px 25px rgba(15, 23, 42, 0.2);
        cursor: pointer;
        z-index: 2147483647;
        display: none;
        align-items: center;
        gap: 6px;
        color: #0f172a;
        background: rgba(255,255,255,0.95);
        border: 1px solid rgba(148,163,184,0.6);
      }
      #${LAUNCHER_ID}.visible {
        display: flex;
      }
      #${LAUNCHER_ID} .count-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 20px;
        height: 20px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 600;
        color: #fff;
        padding: 0 6px;
      }
      #${LAUNCHER_ID} .badge-online {
        background: #22c55e;
      }
      #${LAUNCHER_ID} .badge-offline {
        background: #FECACA;
      }
      #${LAUNCHER_ID} .badge-offline-hot {
        background: #ef4444;
      } 
      #${LAUNCHER_ID} .badge-label {
        font-size: 11px;
        font-weight: 500;
        margin-left: 4px;
        color: #475569;
      }
      #${LAUNCHER_ID} .launcher-section {
        display: flex;
        align-items: center;
        gap: 4px;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  function formatTime(timestamp) {
    if (!timestamp) return 'Never checked';
    try {
      const date = new Date(timestamp);
      return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
    } catch (error) {
      return 'Never checked';
    }
  }

  function getStoredPanelState() {
    try {
      return localStorage.getItem(PANEL_STATE_KEY) || 'expanded';
    } catch (error) {
      return 'expanded';
    }
  }

  function setStoredPanelState(state) {
    try {
      localStorage.setItem(PANEL_STATE_KEY, state);
    } catch (error) {
      // ignore
    }
  }

  function isPanelHiddenPreference() {
    try {
      return localStorage.getItem(PANEL_VISIBILITY_KEY) === 'true';
    } catch (error) {
      return false;
    }
  }

  async function loadPreferences() {
    try {
      const result = await chrome.storage.sync.get(['hideLauncher']);
      hideLauncherPreference = Boolean(result.hideLauncher);
    } catch (error) {
      hideLauncherPreference = false;
    }
  }

  function setPanelHiddenPreference(hidden) {
    try {
      localStorage.setItem(PANEL_VISIBILITY_KEY, hidden ? 'true' : 'false');
    } catch (error) {
      // ignore
    }
  }

  function toggleLauncher(shouldShow) {
    if (!launcherButton && shouldShow) {
      launcherButton = createLauncher();
    }
    if (launcherButton) {
      launcherButton.classList.toggle('visible', shouldShow);
      updateLauncherBadge();
    }
  }

  function refreshLauncherVisibility() {
    const shouldShow = Boolean(
      panelElement &&
        panelElement.classList.contains('is-hidden') &&
        !hideLauncherPreference
    );
    toggleLauncher(shouldShow);
  }

  function setHideLauncherPreference(value) {
    hideLauncherPreference = value;
    try {
      chrome.storage.sync.set({ hideLauncher: value });
    } catch (error) {
      // ignore
    }
  }

  function minimizeToLauncher() {
    if (hideLauncherPreference) {
      setHideLauncherPreference(false);
    }
    setHidden(true);
  }

  function disableFloatingButton() {
    if (!hideLauncherPreference) {
      setHideLauncherPreference(true);
    }
    setHidden(true);
  }

  function setHidden(hidden) {
    if (!panelElement) return;
    panelElement.classList.toggle('is-hidden', hidden);
    setPanelHiddenPreference(hidden);
    refreshLauncherVisibility();
  }

  function setCollapsed(collapsed) {
    if (!panelElement) return;
    panelElement.classList.toggle('collapsed', collapsed);
    setStoredPanelState(collapsed ? 'collapsed' : 'expanded');
    updateCollapseButton();
  }

  function updateCollapseButton() {
    if (!panelElement) return;
    const collapseBtn = panelElement.querySelector('button[data-action="collapse"]');
    if (!collapseBtn) return;
    collapseBtn.textContent = '-';
    const title = 'Show launcher button';
    collapseBtn.setAttribute('title', title);
    collapseBtn.setAttribute('aria-label', title);
  }

  function getStoredLauncherPosition() {
    try {
      const raw = localStorage.getItem(LAUNCHER_POSITION_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (typeof parsed !== 'object') return null;
      return parsed;
    } catch (error) {
      return null;
    }
  }

  function saveLauncherPosition(position) {
    try {
      localStorage.setItem(LAUNCHER_POSITION_KEY, JSON.stringify(position));
    } catch (error) {
      // ignore
    }
  }

  function applyLauncherPosition(launcher, position) {
    if (!launcher || !position) return;
    const hasLeft = typeof position.left === 'string';
    const hasTop = typeof position.top === 'string';
    const hasRight = typeof position.right === 'string';
    const hasBottom = typeof position.bottom === 'string';

    if (hasLeft) {
      launcher.style.left = position.left;
      launcher.style.right = 'auto';
    } else if (hasRight) {
      launcher.style.right = position.right;
      launcher.style.left = 'auto';
    } else {
      launcher.style.left = 'auto';
      launcher.style.right = '20px';
    }

    if (hasTop) {
      launcher.style.top = position.top;
      launcher.style.bottom = 'auto';
    } else if (hasBottom) {
      launcher.style.bottom = position.bottom;
      launcher.style.top = 'auto';
    } else {
      launcher.style.top = 'auto';
      launcher.style.bottom = '20px';
    }
  }

  function createLauncher() {
    let launcher = document.getElementById(LAUNCHER_ID);
    if (!launcher) {
      launcher = document.createElement('button');
      launcher.id = LAUNCHER_ID;
      launcher.type = 'button';
      launcher.setAttribute('aria-label', 'Show URL monitor panel');
      launcher.dataset.skipClick = 'false';
      launcher.addEventListener('click', (event) => {
        if (launcher.dataset.skipClick === 'true') {
          event.preventDefault();
          event.stopPropagation();
          launcher.dataset.skipClick = 'false';
          return;
        }
        setHidden(false);
        setCollapsed(false);
      });
      applyLauncherPosition(launcher, getStoredLauncherPosition());
      enableLauncherDragging(launcher);
      document.body.appendChild(launcher);
      launcherButton = launcher;
      updateLauncherBadge();
    }
    return launcher;
  }

  function enableLauncherDragging(launcher) {
    if (!launcher) return;
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let initialLeft = 0;
    let initialTop = 0;
    let hasMoved = false;

    launcher.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      isDragging = true;
      startX = event.clientX;
      startY = event.clientY;
      const rect = launcher.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;
      launcher.setPointerCapture(event.pointerId);
      launcher.classList.add('dragging');
      hasMoved = false;
      event.preventDefault();
    });

    const endDrag = () => {
      if (!isDragging) return;
      isDragging = false;
      launcher.classList.remove('dragging');
    };

    launcher.addEventListener('pointermove', (event) => {
      if (!isDragging) return;
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      if (!hasMoved && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
        hasMoved = true;
      }
      const left = initialLeft + dx;
      const top = initialTop + dy;
      launcher.style.left = `${left}px`;
      launcher.style.top = `${top}px`;
      launcher.style.right = 'auto';
      launcher.style.bottom = 'auto';
      saveLauncherPosition({
        left: launcher.style.left,
        top: launcher.style.top
      });
    });

    launcher.addEventListener('pointerup', (event) => {
      if (hasMoved) {
        launcher.dataset.skipClick = 'true';
        requestAnimationFrame(() => {
          launcher.dataset.skipClick = 'false';
        });
      }
      endDrag(event);
    });
    launcher.addEventListener('pointercancel', endDrag);
    launcher.addEventListener('pointerleave', endDrag);
  }

  function updateLauncherBadge() {
    if (!launcherButton) return;
    const online = latestTotals.online ?? 0;
    const offline = latestTotals.offline ?? 0;
    launcherButton.innerHTML = `
      <div class="launcher-section">
        <span class="count-badge badge-online" title="${online} online">${online}</span>
        <span class="badge-label">online</span>
      </div>
      <div class="launcher-section">
        <span class="count-badge badge-offline${offline>0?'-hot':''}" title="${offline} offline">${offline}</span>
        <span class="badge-label">offline</span>
      </div>
    `;
  }

  function createPanel() {
    if (panelElement) return panelElement;

    const panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.innerHTML = `
      <header>
        <div class="title">
          <small>URL Monitor</small>
          <span>Live status</span>
        </div>
        <div class="controls">
          <button type="button" data-action="collapse" title="Show launcher button" aria-label="Show launcher button">-</button>
          <button type="button" data-action="close" title="Disable floating button" aria-label="Disable floating button">✕</button>
        </div>
      </header>
      <div class="summary">
        <div class="summary-counts p-2">0 online · 0 offline · 0 checking</div>
      </div>
      <div class="summary-updated font-xs text-grey-600">Awaiting first check</div>
      <div class="content">
        <div class="empty-state">No URLs are being monitored yet.</div>
      </div>
    `;

    document.body.appendChild(panel);

    panelElement = panel;
    listContainer = panel.querySelector('.content');
    summaryContainer = panel.querySelector('.summary');
    summaryCountsElement = panel.querySelector('.summary-counts');
    summaryUpdatedElement = panel.querySelector('.summary-updated');

    const collapseBtn = panel.querySelector('button[data-action="collapse"]');
    const closeBtn = panel.querySelector('button[data-action="close"]');
    collapseBtn.addEventListener('click', () => {
      minimizeToLauncher();
    });
    closeBtn.addEventListener('click', () => {
      disableFloatingButton();
    });

    const previouslyCollapsed = getStoredPanelState() === 'collapsed';
    if (previouslyCollapsed) {
      setCollapsed(false);
      setStoredPanelState('expanded');
    } else {
      setCollapsed(false);
    }
    if (isPanelHiddenPreference()) {
      panel.classList.add('is-hidden');
    }
    refreshLauncherVisibility();

    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let initialLeft = 0;
    let initialTop = 0;

    panel.addEventListener('pointerdown', (event) => {
      if (event.target.tagName.toLowerCase() === 'button') return;
      isDragging = true;
      startX = event.clientX;
      startY = event.clientY;
      const rect = panel.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;
      panel.setPointerCapture(event.pointerId);
      event.preventDefault();
    });

    panel.addEventListener('pointermove', (event) => {
      if (!isDragging) return;
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      panel.style.left = `${initialLeft + dx}px`;
      panel.style.top = `${initialTop + dy}px`;
      panel.style.bottom = 'auto';
      panel.style.right = 'auto';
    });

    panel.addEventListener('pointerup', () => {
      isDragging = false;
    });

    panel.addEventListener('pointercancel', () => {
      isDragging = false;
    });

    return panel;
  }

  function updateSummary(urls = []) {
    if (!summaryCountsElement || !summaryUpdatedElement) return;
    const totals = {
      online: 0,
      offline: 0,
      checking: 0
    };
    let latestCheck = 0;

    urls.forEach((item) => {
      const status = (item.status || 'checking').toLowerCase();
      if (status === 'online' || status === 'offline' || status === 'checking') {
        totals[status] += 1;
      } else {
        totals.checking += 1;
      }
      if (item.lastChecked) {
        latestCheck = Math.max(latestCheck, item.lastChecked);
      }
    });

    const totalUrls = urls.length;
    latestTotals = {
      online: totals.online,
      offline: totals.offline
    };
    updateLauncherBadge();
    var countParts = [
      `<div style="line-height:14px;"><span style="font-size:13px; background: rgb(34,197,95);color:#fff;border-radius: 50%;padding: 1 4px;text-align:center;padding: 0 3px;">${totals.online}</span> online</div>`
    ];

    if ( totals.offline != 0 ) countParts.push( `<div class="whitespace-nowrap"><span style="font-size:13px; background:red;color:#fff; border-radius: 50%; width:14px;text-align:center;padding: 0 3px;">${totals.offline}</span> offline</div>` );
    if ( totals.checking != 0 ) countParts.push( `<div class="whitespace-nowrap">${totals.checking} checking</div>` );
    
    summaryCountsElement.innerHTML = countParts.join('');

    if (!totalUrls) {
      summaryUpdatedElement.textContent = 'Add a URL to begin monitoring';
    } else if (latestCheck) {
      summaryUpdatedElement.textContent = `updated: ${formatTime(latestCheck)}`;
    } else {
      summaryUpdatedElement.textContent = 'Awaiting first successful check';
    }
  }

  function renderUrls(urls = []) {
    updateSummary(urls);
    if (!listContainer) return;
    listContainer.innerHTML = '';

    if (!urls.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.textContent = 'No URLs are being monitored yet.';
      listContainer.appendChild(empty);
      return;
    }

    const sorted = [...urls].sort((a, b) => {
      const nameA = (a.alias || a.url || '').toLowerCase();
      const nameB = (b.alias || b.url || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });

    sorted.forEach((urlData) => {
      const row = document.createElement('div');
      row.className = 'alias-row';

      const status = (urlData.status || 'checking').toLowerCase();
      const alias = urlData.alias?.trim() || urlData.url || 'Unknown URL';
      const groupLabel = urlData.group?.trim();

      const statusClass = urlData.status === 'online' ? 'bg-green-500' : urlData.status === 'offline' ? 'bg-red-500' : 'bg-gray-400';
      const statusText = urlData.status === 'online' ? 'Online' : urlData.status === 'offline' ? 'Offline' : 'Checking...';

      row.innerHTML = `
        <div class="meta flex flex-col">
            <span class="status-pill status-${status} ${statusClass}">&nbsp;</span>
            <span class="alias-name">${alias}</span>
            ${groupLabel ? `<span class="group-pill">${groupLabel}</span>` : ''}
        </div>
        <div class="url"><a href="${urlData.url || ''}">${urlData.url || ''}</a></div>
        <div class="meta">
          <span>${formatTime(urlData.lastChecked)}</span>
        </div>
      `;

      listContainer.appendChild(row);
    });
  }

  async function loadData() {
    try {
      const result = await chrome.storage.sync.get(['urls']);
      renderUrls(result.urls || []);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('URL Ping Monitor: unable to load URLs', error);
    }
  }

  function registerListeners() {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'sync') return;
      if (changes.urls) {
        renderUrls(changes.urls.newValue || []);
      }
      if (Object.prototype.hasOwnProperty.call(changes, 'hideLauncher')) {
        hideLauncherPreference = Boolean(changes.hideLauncher.newValue);
        refreshLauncherVisibility();
      }
    });
  }

  async function init() {
    if (!document.body) {
      document.addEventListener('DOMContentLoaded', init, { once: true });
      return;
    }
    createStyles();
    await loadPreferences();
    createPanel();
    await loadData();
    registerListeners();
    refreshLauncherVisibility();
  }

  init();
})();


