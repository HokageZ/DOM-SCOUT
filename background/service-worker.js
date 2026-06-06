importScripts('../shared/constants.js');

const stateByTabId = new Map();
let persistedSettings = { ...DOMScout.DEFAULTS };

async function loadPersistedSettings() {
  const stored = await chrome.storage.local.get(DOMScout.STORAGE_KEYS.SETTINGS).catch(() => ({}));
  persistedSettings = {
    ...DOMScout.DEFAULTS,
    ...(stored[DOMScout.STORAGE_KEYS.SETTINGS] || {}),
  };
}

async function savePersistedSettings(settings) {
  persistedSettings = {
    ...persistedSettings,
    ...settings,
  };
  await chrome.storage.local.set({
    [DOMScout.STORAGE_KEYS.SETTINGS]: persistedSettings,
  }).catch(() => undefined);
}

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0] || null;
}

function getTabState(tabId) {
  const existing = stateByTabId.get(tabId);
  if (existing) {
    return existing;
  }
  const initial = {
    inspectorEnabled: false,
    selections: [],
    settings: { ...persistedSettings },
  };
  stateByTabId.set(tabId, initial);
  return initial;
}

function isRestrictedUrl(url) {
  if (!url) return true;
  return url.startsWith('chrome://') || 
         url.startsWith('chrome-extension://') || 
         url.startsWith('devtools://') ||
         url.startsWith('edge://') ||
         url.startsWith('about:') ||
         url.startsWith('file://');
}

async function pingTab(tabId) {
  try {
    const response = await chrome.tabs.sendMessage(tabId, { type: DOMScout.MSG.PING });
    return response && response.type === DOMScout.MSG.PONG;
  } catch {
    return false;
  }
}

async function injectContentScript(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: [
        'shared/constants.js',
        'lib/dom-cleaner.js',
        'lib/css-extractor.js',
        'lib/token-counter.js',
        'lib/serializer.js',
        'lib/formatter.js',
        'content/highlighter.js',
        'content/inspector.js',
      ],
    });
    await chrome.scripting.insertCSS({
      target: { tabId },
      files: ['content/content.css'],
    });
    console.log('[DOM-SCOUT BG] Injected content scripts to tab', tabId);
  } catch (error) {
    console.error('[DOM-SCOUT BG] Script injection failed:', error);
  }
}

async function ensureContentScript(tabId) {
  const alive = await pingTab(tabId);
  if (!alive) {
    await injectContentScript(tabId);
    await new Promise((r) => setTimeout(r, 100));
  }
}

async function sendToTab(tabId, message) {
  try {
    await chrome.tabs.sendMessage(tabId, message);
  } catch (error) {
    console.error('[DOM-SCOUT BG] Send message failed:', error);
  }
}

async function syncState(tabId) {
  const tabState = getTabState(tabId);
  await sendToTab(tabId, {
    type: DOMScout.MSG.INSPECTOR_STATE,
    inspectorEnabled: tabState.inspectorEnabled,
    settings: tabState.settings,
    selections: tabState.selections,
  });
}

async function toggleInspector(tabId, forceEnabled) {
  const tabState = getTabState(tabId);
  tabState.inspectorEnabled = typeof forceEnabled === 'boolean' ? forceEnabled : !tabState.inspectorEnabled;
  await syncState(tabId);
}

chrome.runtime.onInstalled.addListener(async () => {
  await loadPersistedSettings();
});

void loadPersistedSettings();

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab || typeof tab.id !== 'number') return;
  if (isRestrictedUrl(tab.url)) return;

  await ensureContentScript(tab.id);
  await toggleInspector(tab.id);
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'toggle-inspector') return;
  const tab = await getActiveTab();
  if (!tab || typeof tab.id !== 'number') return;
  if (isRestrictedUrl(tab.url)) return;

  await ensureContentScript(tab.id);
  await toggleInspector(tab.id);
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  const tab = await chrome.tabs.get(tabId).catch(() => null);
  if (tab && !isRestrictedUrl(tab.url)) {
    await syncState(tabId);
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  stateByTabId.delete(tabId);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  void (async () => {
    const tabId = sender.tab && typeof sender.tab.id === 'number' ? sender.tab.id : null;
    if (!tabId) {
      sendResponse({ ok: false });
      return;
    }

    const tabState = getTabState(tabId);

    switch (message.type) {
      case DOMScout.MSG.PING:
        sendResponse({ type: DOMScout.MSG.PONG });
        return;

      case DOMScout.MSG.TOGGLE_INSPECTOR:
        tabState.inspectorEnabled = Boolean(message.enabled);
        await syncState(tabId);
        sendResponse({ ok: true });
        return;

      case DOMScout.MSG.SET_SETTINGS:
        tabState.settings = { ...tabState.settings, ...(message.settings || {}) };
        await savePersistedSettings(tabState.settings);
        await syncState(tabId);
        sendResponse({ ok: true });
        return;

      case DOMScout.MSG.SELECTION_UPDATED:
        if (Array.isArray(message.selections)) {
          tabState.selections = message.selections;
        }
        sendResponse({ ok: true });
        return;

      default:
        if (message.requestState) {
          sendResponse({
            ok: true,
            tabId,
            inspectorEnabled: tabState.inspectorEnabled,
            settings: tabState.settings,
            selections: tabState.selections,
          });
          return;
        }
        sendResponse({ ok: false });
    }
  })();
  return true;
});
