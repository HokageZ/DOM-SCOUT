importScripts('../shared/constants.js');

const stateByTabId = new Map();
let currentWindowId = null;
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

async function broadcastToPanel(message) {
  await chrome.runtime.sendMessage(message).catch(() => undefined);
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
  } catch {
    // Already injected or unsupported page
  }
}

async function sendToTab(tabId, message) {
  await chrome.tabs.sendMessage(tabId, message).catch(() => undefined);
}

async function syncInspectorState(tabId) {
  const tabState = getTabState(tabId);

  await sendToTab(tabId, {
    type: DOMScout.MSG.INSPECTOR_STATE,
    inspectorEnabled: tabState.inspectorEnabled,
    settings: tabState.settings,
    selections: tabState.selections,
  });

  await broadcastToPanel({
    type: DOMScout.MSG.SELECTION_UPDATED,
    tabId,
    inspectorEnabled: tabState.inspectorEnabled,
    settings: tabState.settings,
    selections: tabState.selections,
  });
}

async function toggleInspector(tabId, enabled) {
  const tabState = getTabState(tabId);
  tabState.inspectorEnabled = typeof enabled === 'boolean' ? enabled : !tabState.inspectorEnabled;
  await syncInspectorState(tabId);
}

chrome.runtime.onInstalled.addListener(async () => {
  await loadPersistedSettings();
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
});

void loadPersistedSettings();

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab || typeof tab.id !== 'number') {
    return;
  }

  currentWindowId = tab.windowId;
  await chrome.sidePanel.open({ windowId: tab.windowId }).catch(() => undefined);
  await injectContentScript(tab.id);
  await toggleInspector(tab.id, true);
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'toggle-inspector') {
    return;
  }

  const tab = await getActiveTab();
  if (!tab || typeof tab.id !== 'number') {
    return;
  }

  currentWindowId = tab.windowId;
  await chrome.sidePanel.open({ windowId: tab.windowId }).catch(() => undefined);
  await injectContentScript(tab.id);
  await toggleInspector(tab.id);
});

chrome.tabs.onActivated.addListener(async ({ tabId, windowId }) => {
  currentWindowId = windowId;
  await syncInspectorState(tabId);
});

chrome.tabs.onRemoved.addListener((tabId) => {
  stateByTabId.delete(tabId);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  void (async () => {
    const senderTabId = sender.tab && typeof sender.tab.id === 'number' ? sender.tab.id : null;

    switch (message.type) {
      case DOMScout.MSG.PING: {
        sendResponse({ type: DOMScout.MSG.PONG });
        return;
      }

      case DOMScout.MSG.TOGGLE_INSPECTOR: {
        const tabId = message.tabId ?? senderTabId;
        if (typeof tabId === 'number') {
          await toggleInspector(tabId, message.enabled);
        }
        sendResponse({ ok: true });
        return;
      }

      case DOMScout.MSG.CLEAR_SELECTION: {
        const tabId = message.tabId ?? senderTabId;
        if (typeof tabId === 'number') {
          const tabState = getTabState(tabId);
          tabState.selections = [];
          await sendToTab(tabId, { type: DOMScout.MSG.CLEAR_SELECTION });
          await syncInspectorState(tabId);
        }
        sendResponse({ ok: true });
        return;
      }

      case DOMScout.MSG.SET_DEPTH:
      case DOMScout.MSG.SET_FORMAT: {
        const tabId = message.tabId ?? senderTabId;
        if (typeof tabId === 'number') {
          const tabState = getTabState(tabId);
          if (message.type === DOMScout.MSG.SET_DEPTH) {
            tabState.settings.depth = message.depth;
          } else {
            tabState.settings.format = message.format;
          }
          await savePersistedSettings(tabState.settings);
          await sendToTab(tabId, { ...message, settings: tabState.settings });
          await syncInspectorState(tabId);
        }
        sendResponse({ ok: true });
        return;
      }

      case DOMScout.MSG.SET_SETTINGS: {
        const tabId = message.tabId ?? senderTabId;
        if (typeof tabId === 'number') {
          const tabState = getTabState(tabId);
          tabState.settings = {
            ...tabState.settings,
            ...(message.settings || {}),
          };
          await savePersistedSettings(tabState.settings);
          await sendToTab(tabId, {
            type: DOMScout.MSG.SET_SETTINGS,
            settings: tabState.settings,
          });
          await syncInspectorState(tabId);
        }
        sendResponse({ ok: true });
        return;
      }

      case DOMScout.MSG.REMOVE_ELEMENT: {
        const tabId = message.tabId ?? senderTabId;
        if (typeof tabId === 'number') {
          const tabState = getTabState(tabId);
          tabState.selections = tabState.selections.filter((item) => item.selectionId !== message.selectionId);
          await sendToTab(tabId, message);
          await syncInspectorState(tabId);
        }
        sendResponse({ ok: true });
        return;
      }

      case DOMScout.MSG.REQUEST_SNAPSHOT: {
        const tabId = message.tabId ?? senderTabId;
        if (typeof tabId === 'number') {
          await sendToTab(tabId, { type: DOMScout.MSG.REQUEST_SNAPSHOT });
        }
        sendResponse({ ok: true });
        return;
      }

      case DOMScout.MSG.ELEMENT_SELECTED:
      case DOMScout.MSG.SELECTION_UPDATED:
      case DOMScout.MSG.PAGE_SNAPSHOT: {
        if (typeof senderTabId === 'number') {
          const tabState = getTabState(senderTabId);
          if (Array.isArray(message.selections)) {
            tabState.selections = message.selections;
          }

          await broadcastToPanel({
            ...message,
            tabId: senderTabId,
            inspectorEnabled: tabState.inspectorEnabled,
            settings: tabState.settings,
          });
        }
        sendResponse({ ok: true });
        return;
      }

      default: {
        if (message && message.requestState) {
          const tab = await getActiveTab();
          if (tab && typeof tab.id === 'number') {
            await syncInspectorState(tab.id);
            sendResponse({ ok: true, tabId: tab.id, windowId: tab.windowId ?? currentWindowId });
            return;
          }
        }

        sendResponse({ ok: false });
      }
    }
  })();

  return true;
});
