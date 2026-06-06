(function () {
  const state = {
    activeTabId: null,
    inspectorEnabled: false,
    settings: { ...DOMScout.DEFAULTS },
    selections: [],
    output: '',
  };

  const elements = {
    toggleInspectorButton: document.getElementById('toggleInspectorButton'),
    formatSelect: document.getElementById('formatSelect'),
    depthSelect: document.getElementById('depthSelect'),
    clearSelectionButton: document.getElementById('clearSelectionButton'),
    selectionList: document.getElementById('selectionList'),
    outputPreview: document.getElementById('outputPreview'),
    copyButton: document.getElementById('copyButton'),
    snapshotButton: document.getElementById('snapshotButton'),
    metaSummary: document.getElementById('metaSummary'),
  };

  function getDepthValue(value) {
    return value === 'Infinity' ? Infinity : Number(value);
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');
  }

  function updateButtons() {
    elements.toggleInspectorButton.textContent = state.inspectorEnabled ? 'Disable Inspector' : 'Enable Inspector';
    elements.formatSelect.value = state.settings.format;
    elements.depthSelect.value = String(state.settings.depth);
  }

  function renderSelections() {
    if (!state.selections.length) {
      elements.selectionList.className = 'selection-list empty-state';
      elements.selectionList.textContent = 'No elements selected yet.';
      return;
    }

    elements.selectionList.className = 'selection-list';
    elements.selectionList.innerHTML = state.selections.map((item, index) => {
      const summary = item.summary || item.selector || item.tagName || 'element';
      return `
        <article class="selection-item" data-selection-id="${escapeHtml(item.selectionId)}">
          <span class="selection-chip">#${index + 1} ${escapeHtml(item.tagName || 'node')}</span>
          <div class="selection-item-title">${escapeHtml(summary)}</div>
          <div class="selection-item-actions">
            <button class="button button-ghost" type="button" data-remove-selection="${escapeHtml(item.selectionId)}">Remove</button>
          </div>
        </article>
      `;
    }).join('');
  }

  function renderOutput() {
    const tokenEstimate = Math.ceil((state.output || '').length / 4);
    elements.outputPreview.value = state.output || '';
    elements.metaSummary.textContent = `${state.selections.length} items · ~${tokenEstimate} tokens`;
  }

  function rerender() {
    updateButtons();
    renderSelections();
    renderOutput();
  }

  async function sendMessage(message) {
    return chrome.runtime.sendMessage(message);
  }

  async function refreshState() {
    await sendMessage({ requestState: true });
  }

  async function copyOutput() {
    if (!elements.outputPreview.value.trim()) {
      return;
    }

    await navigator.clipboard.writeText(elements.outputPreview.value);
    elements.copyButton.textContent = 'Copied';
    setTimeout(() => {
      elements.copyButton.textContent = 'Copy';
    }, 1200);
  }

  elements.toggleInspectorButton.addEventListener('click', async () => {
    if (state.activeTabId == null) {
      await refreshState();
      return;
    }

    await sendMessage({
      type: DOMScout.MSG.TOGGLE_INSPECTOR,
      tabId: state.activeTabId,
      enabled: !state.inspectorEnabled,
    });
  });

  elements.formatSelect.addEventListener('change', async (event) => {
    state.settings.format = event.target.value;
    if (state.activeTabId != null) {
      await sendMessage({ type: DOMScout.MSG.SET_FORMAT, tabId: state.activeTabId, format: state.settings.format });
    }
  });

  elements.depthSelect.addEventListener('change', async (event) => {
    state.settings.depth = getDepthValue(event.target.value);
    if (state.activeTabId != null) {
      await sendMessage({ type: DOMScout.MSG.SET_DEPTH, tabId: state.activeTabId, depth: state.settings.depth });
    }
  });

  elements.clearSelectionButton.addEventListener('click', async () => {
    if (state.activeTabId == null) {
      return;
    }
    await sendMessage({ type: DOMScout.MSG.CLEAR_SELECTION, tabId: state.activeTabId });
  });

  elements.copyButton.addEventListener('click', () => {
    void copyOutput();
  });

  elements.snapshotButton.addEventListener('click', async () => {
    if (state.activeTabId == null) {
      return;
    }

    await sendMessage({
      type: DOMScout.MSG.SET_FORMAT,
      tabId: state.activeTabId,
      format: DOMScout.FORMATS.PAGE_SNAPSHOT,
    });
  });

  elements.selectionList.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-remove-selection]');
    if (!button || state.activeTabId == null) {
      return;
    }

    await sendMessage({
      type: DOMScout.MSG.REMOVE_ELEMENT,
      tabId: state.activeTabId,
      selectionId: button.getAttribute('data-remove-selection'),
    });
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === DOMScout.MSG.SELECTION_UPDATED || message.type === DOMScout.MSG.ELEMENT_SELECTED) {
      state.activeTabId = message.tabId ?? state.activeTabId;
      state.inspectorEnabled = Boolean(message.inspectorEnabled);
      state.settings = { ...state.settings, ...(message.settings || {}) };
      state.selections = Array.isArray(message.selections) ? message.selections : state.selections;
      state.output = state.selections.map((item) => item.formats?.[state.settings.format] || '').filter(Boolean).join('\n\n');
      rerender();
    }
  });

  void refreshState();
  rerender();
})();
