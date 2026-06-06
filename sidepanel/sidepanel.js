(function () {
  const state = {
    activeTabId: null,
    inspectorEnabled: false,
    settings: { ...DOMScout.DEFAULTS },
    selections: [],
    output: '',
  };

  const elements = {
    body: document.body,
    errorBanner: document.getElementById('errorBanner'),
    errorTitle: document.getElementById('errorTitle'),
    errorText: document.getElementById('errorText'),
    selectionModeBanner: document.getElementById('selectionModeBanner'),
    toggleInspectorButton: document.getElementById('toggleInspectorButton'),
    formatSelect: document.getElementById('formatSelect'),
    depthSelect: document.getElementById('depthSelect'),
    includeContextCheckbox: document.getElementById('includeContextCheckbox'),
    includeCSSCheckbox: document.getElementById('includeCSSCheckbox'),
    stripNoiseCheckbox: document.getElementById('stripNoiseCheckbox'),
    keepTestIdsCheckbox: document.getElementById('keepTestIdsCheckbox'),
    promptWrapperCheckbox: document.getElementById('promptWrapperCheckbox'),
    truncationInput: document.getElementById('truncationInput'),
    tokenWarningInput: document.getElementById('tokenWarningInput'),
    clearSelectionButton: document.getElementById('clearSelectionButton'),
    selectionList: document.getElementById('selectionList'),
    outputPreview: document.getElementById('outputPreview'),
    copyButton: document.getElementById('copyButton'),
    copyPromptButton: document.getElementById('copyPromptButton'),
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
    elements.toggleInspectorButton.disabled = Boolean(state.error);
    elements.formatSelect.value = state.settings.format;
    elements.depthSelect.value = String(state.settings.depth);
    elements.includeContextCheckbox.checked = Boolean(state.settings.includeContext);
    elements.includeCSSCheckbox.checked = Boolean(state.settings.includeCSS);
    elements.stripNoiseCheckbox.checked = Boolean(state.settings.stripNoise);
    elements.keepTestIdsCheckbox.checked = Boolean(state.settings.keepTestIds);
    elements.promptWrapperCheckbox.checked = Boolean(state.settings.promptWrapper);
    elements.truncationInput.value = String(state.settings.truncationThreshold);
    elements.tokenWarningInput.value = String(state.settings.maxTokenWarning);
    elements.body.classList.toggle('selection-mode', state.inspectorEnabled && !state.error);
    elements.body.classList.toggle('has-error', Boolean(state.error));
    elements.selectionModeBanner.hidden = !state.inspectorEnabled || Boolean(state.error);
    elements.errorBanner.hidden = !state.error;
  }

  function getEffectiveOutput() {
    return elements.outputPreview.value || state.output || '';
  }

  function buildPromptWrappedOutput(baseOutput) {
    const output = baseOutput ?? getEffectiveOutput();
    const format = state.settings.format;
    return [
      'Use the following browser DOM capture to help with implementation or analysis.',
      `Format: ${format}`,
      'Focus on semantic structure, selectors, and relevant styling only.',
      '',
      output,
    ].join('\n');
  }

  async function pushSettings(partial) {
    state.settings = {
      ...state.settings,
      ...partial,
    };

    rerender();

    if (state.activeTabId == null) {
      return;
    }

    await sendMessage({
      type: DOMScout.MSG.SET_SETTINGS,
      tabId: state.activeTabId,
      settings: state.settings,
    });
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
    elements.metaSummary.textContent = `${state.selections.length} items · ~${tokenEstimate} tokens${tokenEstimate > state.settings.maxTokenWarning ? ' · warning' : ''}`;
    elements.metaSummary.className = tokenEstimate > state.settings.maxTokenWarning ? 'meta warning-text' : 'meta';
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
    if (!getEffectiveOutput().trim()) {
      return;
    }

    await navigator.clipboard.writeText(getEffectiveOutput());
    elements.copyButton.textContent = 'Copied';
    setTimeout(() => {
      elements.copyButton.textContent = 'Copy';
    }, 1200);
  }

  async function copyPromptOutput() {
    const value = buildPromptWrappedOutput(getEffectiveOutput());
    if (!value.trim()) {
      return;
    }

    await navigator.clipboard.writeText(value);
    elements.copyPromptButton.textContent = 'Copied';
    setTimeout(() => {
      elements.copyPromptButton.textContent = 'Copy Prompt';
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
    if (state.settings.format === DOMScout.FORMATS.PAGE_SNAPSHOT && state.activeTabId != null) {
      rerender();
      await sendMessage({ type: DOMScout.MSG.REQUEST_SNAPSHOT, tabId: state.activeTabId });
      return;
    }

    await pushSettings({ format: state.settings.format });
  });

  elements.depthSelect.addEventListener('change', async (event) => {
    await pushSettings({ depth: getDepthValue(event.target.value) });
  });

  elements.includeContextCheckbox.addEventListener('change', async (event) => {
    await pushSettings({ includeContext: event.target.checked });
  });

  elements.includeCSSCheckbox.addEventListener('change', async (event) => {
    await pushSettings({ includeCSS: event.target.checked });
  });

  elements.stripNoiseCheckbox.addEventListener('change', async (event) => {
    await pushSettings({ stripNoise: event.target.checked });
  });

  elements.keepTestIdsCheckbox.addEventListener('change', async (event) => {
    await pushSettings({ keepTestIds: event.target.checked });
  });

  elements.promptWrapperCheckbox.addEventListener('change', async (event) => {
    await pushSettings({ promptWrapper: event.target.checked });
  });

  elements.truncationInput.addEventListener('change', async (event) => {
    await pushSettings({ truncationThreshold: Math.max(40, Number(event.target.value) || DOMScout.DEFAULTS.truncationThreshold) });
  });

  elements.tokenWarningInput.addEventListener('change', async (event) => {
    await pushSettings({ maxTokenWarning: Math.max(500, Number(event.target.value) || DOMScout.DEFAULTS.maxTokenWarning) });
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

  elements.copyPromptButton.addEventListener('click', () => {
    void copyPromptOutput();
  });

  elements.snapshotButton.addEventListener('click', async () => {
    if (state.activeTabId == null) {
      return;
    }

    state.settings.format = DOMScout.FORMATS.PAGE_SNAPSHOT;
    rerender();
    await sendMessage({ type: DOMScout.MSG.REQUEST_SNAPSHOT, tabId: state.activeTabId });
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
      state.error = message.error || null;
      
      if (state.error) {
        elements.errorTitle.textContent = 'Cannot access this page';
        elements.errorText.textContent = state.error;
        state.output = '';
        rerender();
        return;
      }
      
      const rawOutput = state.selections.map((item) => item.formats?.[state.settings.format] || '').filter(Boolean).join('\n\n');
      state.output = rawOutput;
      if (state.settings.promptWrapper) {
        state.output = buildPromptWrappedOutput(rawOutput);
      }
      rerender();
      return;
    }

    if (message.type === DOMScout.MSG.PAGE_SNAPSHOT) {
      state.activeTabId = message.tabId ?? state.activeTabId;
      state.inspectorEnabled = Boolean(message.inspectorEnabled);
      state.settings = { ...state.settings, ...(message.settings || {}) };
      state.error = message.error || null;
      
      if (state.error) {
        elements.errorTitle.textContent = 'Cannot access this page';
        elements.errorText.textContent = state.error;
        state.output = '';
        rerender();
        return;
      }
      
      const rawOutput = message.output || '';
      state.output = rawOutput;
      if (state.settings.promptWrapper) {
        state.output = buildPromptWrappedOutput(rawOutput);
      }
      rerender();
    }
  });

  void refreshState();
  rerender();
})();
