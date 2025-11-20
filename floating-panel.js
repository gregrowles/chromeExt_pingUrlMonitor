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

  let panelElement;
  let listContainer;
  let summaryContainer;
  let summaryCountsElement;
  let summaryUpdatedElement;
  let launcherButton;

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
        color: #475569;
        word-break: break-all;
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
        padding: 1px 5px;
        border-radius: 999px;
        font-size: 9px;
        font-weight: 600;
        text-transform: capitalize;
        margin-right:4px;
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
        color: #fff;
        border: none;
        border-radius: 999px;
        padding: 10px 16px;
        font-size: 13px;
        font-weight: 600;
        box-shadow: 0 10px 25px rgba(15, 23, 42, 0.2);
        cursor: pointer;
        z-index: 2147483647;
        display: none;
      }
      #${LAUNCHER_ID}.visible {
        display: flex;
        align-items: center;
        gap: 6px;
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
    }
  }

  function setHidden(hidden) {
    if (!panelElement) return;
    panelElement.classList.toggle('is-hidden', hidden);
    setPanelHiddenPreference(hidden);
    toggleLauncher(hidden);
  }

  function setCollapsed(collapsed) {
    if (!panelElement) return;
    panelElement.classList.toggle('collapsed', collapsed);
    setStoredPanelState(collapsed ? 'collapsed' : 'expanded');
    updateCollapseButton(collapsed);
  }

  function updateCollapseButton(collapsed) {
    if (!panelElement) return;
    const collapseBtn = panelElement.querySelector('button[data-action="collapse"]');
    if (!collapseBtn) return;
    collapseBtn.textContent = collapsed ? '+' : '–';
    const title = collapsed ? 'Expand panel' : 'Collapse panel';
    collapseBtn.setAttribute('title', title);
    collapseBtn.setAttribute('aria-label', title);
  }

  function createLauncher() {
    let launcher = document.getElementById(LAUNCHER_ID);
    if (!launcher) {
      launcher = document.createElement('button');
      launcher.id = LAUNCHER_ID;
      launcher.type = 'button';
      launcher.innerHTML = 'URL Monitor';
      launcher.addEventListener('click', () => {
        setHidden(false);
        setCollapsed(getStoredPanelState() === 'collapsed');
      });
      document.body.appendChild(launcher);
    }
    return launcher;
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
          <button type="button" data-action="collapse" title="Collapse panel" aria-label="Collapse panel">–</button>
          <button type="button" data-action="close" title="Hide panel" aria-label="Hide panel">×</button>
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
      const shouldCollapse = !panel.classList.contains('collapsed');
      setCollapsed(shouldCollapse);
    });
    closeBtn.addEventListener('click', () => {
      setHidden(true);
    });

    setCollapsed(getStoredPanelState() === 'collapsed');
    if (isPanelHiddenPreference()) {
      panel.classList.add('is-hidden');
      toggleLauncher(true);
    } else {
      toggleLauncher(false);
    }

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
    var countParts = [
      `<div style="line-height:14px;"><span style="font-size:13px; background: #DCFCE7;border-radius: 50%;padding: 0 3px;text-align:center;padding: 0 3px;">${totals.online}</span> online</div>`
    ];

    if ( totals.offline != 0 ) countParts.push( `<div class="whitespace-nowrap"><span style="font-size:13px; background: #FECACA; border-radius: 50%; width:14px;text-align:center;padding: 0 3px;">${totals.offline}</span> offline</div>` );
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

      const statusClass = urlData.status === 'online' ? 'bg-green-500' : urlData.status === 'offline' ? 'bg-red-500' : 'bg-gray-400';
      const statusText = urlData.status === 'online' ? 'Online' : urlData.status === 'offline' ? 'Offline' : 'Checking...';

      row.innerHTML = `
        <div class="meta flex flex-col">
            <span class="status-pill status-${status} ${statusClass}">&nbsp;</span>
            <span class="alias-name">${alias}</span>
        </div>
        <div class="url">${urlData.url || ''}</div>
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
      if (areaName === 'sync' && changes.urls) {
        renderUrls(changes.urls.newValue || []);
      }
    });
  }

  function init() {
    if (!document.body) {
      document.addEventListener('DOMContentLoaded', init, { once: true });
      return;
    }
    createStyles();
    createPanel();
    loadData();
    registerListeners();
  }

  init();
})();


