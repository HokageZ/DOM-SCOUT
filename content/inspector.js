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
    
    // Format selections output
    const output = state.selections.map((item) => item.formats?.[state.settings.format] || '').filter(Boolean).join('\n\n');

    DOMScout.highlighterApi.renderSelections(state.selections);
    DOMScout.highlighterApi.updateSettings(state.settings, output);

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

    DOMScout.highlighterApi.updateSettings(state.settings, output);

    void chrome.runtime.sendMessage({
      type: DOMScout.MSG.PAGE_SNAPSHOT,
      output,
      selections: state.selections.map(toSerializableSelection),
    });
  }

  function toggleSelection(element) {
    if (!(element instanceof Element)) {
      return;
    }

    const existingIndex = state.selections.findIndex((selection) => selection.element === element);
    if (existingIndex > -1) {
      state.selections.splice(existingIndex, 1);
    } else {
      const selection = {
        selectionId: buildSelectionId(element),
        element: element,
        summary: '',
        selector: '',
        tagName: '',
        formats: {},
      };
      reserializeSelection(selection);
      state.selections.push(selection);
    }
    syncSelections();
  }

  function removeSelection(selectionId) {
    state.selections = state.selections.filter((selection) => selection.selectionId !== selectionId);
    syncSelections();
  }

  function handleCapture() {
    // Stop picking mode but keep selections and panel visible
    setInspectorEnabled(false);
    void chrome.runtime.sendMessage({ type: DOMScout.MSG.TOGGLE_INSPECTOR, enabled: false });
  }

  function handleClear() {
    clearSelections();
  }

  function handleToggleInspector(active) {
    state.inspectorEnabled = active;
    void chrome.runtime.sendMessage({ type: DOMScout.MSG.TOGGLE_INSPECTOR, enabled: active });
  }

  function handleChangeSettings(settings) {
    state.settings = { ...state.settings, ...settings };
    syncSelections();
    // Notify background worker to persist settings
    void chrome.runtime.sendMessage({
      type: DOMScout.MSG.SET_SETTINGS,
      settings: state.settings,
    });
  }

  function handleTraverse(direction) {
    if (!state.selections.length) {
      return;
    }

    const lastIdx = state.selections.length - 1;
    const lastSelection = state.selections[lastIdx];
    const currentElement = lastSelection.element;

    if (direction === 'parent') {
      const parent = currentElement.parentElement;
      if (parent && parent !== document.documentElement) {
        state.selections[lastIdx] = {
          selectionId: buildSelectionId(parent),
          element: parent,
          summary: '',
          selector: '',
          tagName: '',
          formats: {},
        };
        syncSelections();
      }
    } else if (direction === 'child') {
      const child = currentElement.firstElementChild;
      if (child) {
        state.selections[lastIdx] = {
          selectionId: buildSelectionId(child),
          element: child,
          summary: '',
          selector: '',
          tagName: '',
          formats: {},
        };
        syncSelections();
      }
    }
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
    DOMScout.highlighterApi.setPickingState(enabled);

    if (!enabled) {
      updateHover(null);
      // Keep panel visible if selections exist
      if (!state.selections.length) {
        DOMScout.highlighterApi.hideToolbar();
      }
      return;
    }

    DOMScout.highlighterApi.ensureRoot();
    if (state.hoveredElement) {
      DOMScout.highlighterApi.showHover(state.hoveredElement);
    }
    DOMScout.highlighterApi.renderSelections(state.selections);
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

    const root = DOMScout.highlighter?.root;
    if (root && (root === event.target || root.contains(event.target))) {
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
    toggleSelection(resolvedTarget);
  }, true);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && state.inspectorEnabled) {
      setInspectorEnabled(false);
      void chrome.runtime.sendMessage({ type: DOMScout.MSG.TOGGLE_INSPECTOR, enabled: false });
    }
  }, true);

  window.addEventListener('scroll', () => {
    if (!state.inspectorEnabled && !state.selections.length) {
      return;
    }
    if (state.hoveredElement) {
      DOMScout.highlighterApi.showHover(state.hoveredElement);
    }
    DOMScout.highlighterApi.renderSelections(state.selections);
  }, true);

  window.addEventListener('resize', () => {
    if (!state.inspectorEnabled && !state.selections.length) {
      return;
    }
    if (state.hoveredElement) {
      DOMScout.highlighterApi.showHover(state.hoveredElement);
    }
    DOMScout.highlighterApi.renderSelections(state.selections);
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
        syncSelections();
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
    DOMScout.highlighterApi.setupDockCallbacks({
      onCapture: handleCapture,
      onClear: handleClear,
      onToggleInspector: handleToggleInspector,
      onTraverse: handleTraverse,
      onRemoveSelection: removeSelection,
      onChangeSettings: handleChangeSettings,
    });
    console.log('[DOM-SCOUT] Content script loaded successfully');
  } catch (error) {
    console.error('[DOM-SCOUT] Failed to initialize:', error);
  }
})();
