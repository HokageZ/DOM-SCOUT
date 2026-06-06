(function () {
  console.log('[DOM-SCOUT] Content script starting...');

  const state = {
    inspectorEnabled: false,
    settings: { ...DOMScout.DEFAULTS },
    hoveredElement: null,
    selections: [],
  };

  function buildSelectionId(element) {
    const path = DOMScout.serializer.getSelector(element);
    return `${Date.now()}-${Math.random().toString(16).slice(2)}-${path}`;
  }

  function findSelectableTarget(target) {
    if (!(target instanceof Element)) {
      return null;
    }

    const root = DOMScout.highlighter && DOMScout.highlighter.root;
    if (root && root.contains(target)) {
      return null;
    }

    return target.closest('body *');
  }

  function reserializeSelection(selection) {
    selection.summary = DOMScout.serializer.getNodeSummary(selection.element);
    selection.selector = DOMScout.serializer.getSelector(selection.element);
    selection.tagName = selection.element.tagName.toLowerCase();
    selection.formats = DOMScout.formatter.formatAll(selection.element, state.settings);
  }

  function syncSelections() {
    state.selections = state.selections.filter((selection) => selection.element && document.contains(selection.element));
    state.selections.forEach(reserializeSelection);
    DOMScout.highlighterApi.renderSelections(state.selections);
    DOMScout.highlighterApi.renderToolbar(
      state.selections,
      handleCapture,
      handleClear
    );

    void chrome.runtime.sendMessage({
      type: DOMScout.MSG.SELECTION_UPDATED,
      selections: state.selections.map(toSerializableSelection),
    });
  }

  function toSerializableSelection(selection) {
    return {
      selectionId: selection.selectionId,
      summary: selection.summary,
      selector: selection.selector,
      tagName: selection.tagName,
      formats: selection.formats,
    };
  }

  function clearSelections() {
    state.selections = [];
    syncSelections();
  }

  function sendPageSnapshot() {
    const target = state.hoveredElement || document.body || document.documentElement;
    const output = DOMScout.serializer.finalizeOutput(
      DOMScout.formatter.formatPageSnapshot(target),
      target,
      state.settings
    ).value;

    void chrome.runtime.sendMessage({
      type: DOMScout.MSG.PAGE_SNAPSHOT,
      output,
      selections: state.selections.map(toSerializableSelection),
    });
  }

  function addSelection(element, additive) {
    const target = element;
    if (!(target instanceof Element)) {
      return;
    }

    if (!additive) {
      state.selections = [];
    }

    const existing = state.selections.find((selection) => selection.element === target);
    if (existing) {
      syncSelections();
      return;
    }

    const selection = {
      selectionId: buildSelectionId(target),
      element: target,
      summary: '',
      selector: '',
      tagName: '',
      formats: {},
    };

    reserializeSelection(selection);
    state.selections.push(selection);
    syncSelections();
  }

  function removeSelection(selectionId) {
    state.selections = state.selections.filter((selection) => selection.selectionId !== selectionId);
    syncSelections();
  }

  function handleCapture() {
    // Send to panel and disable inspector
    setInspectorEnabled(false);
    void chrome.runtime.sendMessage({ type: DOMScout.MSG.TOGGLE_INSPECTOR, enabled: false });
  }

  function handleClear() {
    clearSelections();
  }

  function updateHover(target) {
    state.hoveredElement = target;

    if (!state.inspectorEnabled || !target) {
      DOMScout.highlighterApi.hideHover();
      return;
    }

    DOMScout.highlighterApi.showHover(target);
  }

  function setInspectorEnabled(enabled) {
    state.inspectorEnabled = enabled;
    if (!enabled) {
      updateHover(null);
      DOMScout.highlighterApi.hideToolbar();
      return;
    }

    DOMScout.highlighterApi.ensureRoot();
    if (state.hoveredElement) {
      DOMScout.highlighterApi.showHover(state.hoveredElement);
    }
    DOMScout.highlighterApi.renderSelections(state.selections);
    DOMScout.highlighterApi.renderToolbar(
      state.selections,
      handleCapture,
      handleClear
    );
  }

  document.addEventListener('mousemove', (event) => {
    if (!state.inspectorEnabled) {
      return;
    }

    const target = findSelectableTarget(event.target);
    if (target !== state.hoveredElement) {
      updateHover(target);
    }
  }, true);

  document.addEventListener('click', (event) => {
    if (!state.inspectorEnabled) {
      return;
    }

    // Don't intercept clicks on our own toolbar
    const toolbar = DOMScout.highlighter?.toolbar;
    if (toolbar && toolbar.contains(event.target)) {
      return;
    }

    const target = findSelectableTarget(event.target);
    if (!target) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const resolvedTarget = event.altKey && target.parentElement ? target.parentElement : target;
    addSelection(resolvedTarget, event.shiftKey);
  }, true);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && state.inspectorEnabled) {
      setInspectorEnabled(false);
      void chrome.runtime.sendMessage({ type: DOMScout.MSG.TOGGLE_INSPECTOR, enabled: false });
    }
  }, true);

  window.addEventListener('scroll', () => {
    if (!state.inspectorEnabled) {
      return;
    }
    if (state.hoveredElement) {
      DOMScout.highlighterApi.showHover(state.hoveredElement);
    }
    DOMScout.highlighterApi.renderSelections(state.selections);
    DOMScout.highlighterApi.renderToolbar(
      state.selections,
      handleCapture,
      handleClear
    );
  }, true);

  window.addEventListener('resize', () => {
    if (!state.inspectorEnabled) {
      return;
    }
    if (state.hoveredElement) {
      DOMScout.highlighterApi.showHover(state.hoveredElement);
    }
    DOMScout.highlighterApi.renderSelections(state.selections);
    DOMScout.highlighterApi.renderToolbar(
      state.selections,
      handleCapture,
      handleClear
    );
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    console.log('[DOM-SCOUT] Received message:', message.type);
    switch (message.type) {
      case DOMScout.MSG.PING:
        sendResponse({ type: DOMScout.MSG.PONG, ok: true });
        return true;
      case DOMScout.MSG.INSPECTOR_STATE:
        state.settings = { ...state.settings, ...(message.settings || {}) };
        setInspectorEnabled(Boolean(message.inspectorEnabled));
        sendResponse({ ok: true });
        return true;
      case DOMScout.MSG.CLEAR_SELECTION:
        clearSelections();
        sendResponse({ ok: true });
        return true;
      case DOMScout.MSG.SET_DEPTH:
        state.settings.depth = message.depth;
        syncSelections();
        sendResponse({ ok: true });
        return true;
      case DOMScout.MSG.SET_FORMAT:
        state.settings.format = message.format;
        syncSelections();
        sendResponse({ ok: true });
        return true;
      case DOMScout.MSG.SET_SETTINGS:
        state.settings = { ...state.settings, ...(message.settings || {}) };
        syncSelections();
        sendResponse({ ok: true });
        return true;
      case DOMScout.MSG.REMOVE_ELEMENT:
        removeSelection(message.selectionId);
        sendResponse({ ok: true });
        return true;
      case DOMScout.MSG.REQUEST_SNAPSHOT:
        sendPageSnapshot();
        sendResponse({ ok: true });
        return true;
      default:
        sendResponse({ ok: false });
        return true;
    }
  });

  try {
    DOMScout.highlighterApi.ensureRoot();
    console.log('[DOM-SCOUT] Content script loaded successfully');
  } catch (error) {
    console.error('[DOM-SCOUT] Failed to initialize:', error);
  }
})();
