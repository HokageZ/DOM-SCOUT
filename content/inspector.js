(function () {
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
  }, true);

  window.addEventListener('resize', () => {
    if (!state.inspectorEnabled) {
      return;
    }
    if (state.hoveredElement) {
      DOMScout.highlighterApi.showHover(state.hoveredElement);
    }
    DOMScout.highlighterApi.renderSelections(state.selections);
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    switch (message.type) {
      case DOMScout.MSG.INSPECTOR_STATE:
        state.settings = { ...state.settings, ...(message.settings || {}) };
        setInspectorEnabled(Boolean(message.inspectorEnabled));
        sendResponse({ ok: true });
        return;
      case DOMScout.MSG.CLEAR_SELECTION:
        clearSelections();
        sendResponse({ ok: true });
        return;
      case DOMScout.MSG.SET_DEPTH:
        state.settings.depth = message.depth;
        syncSelections();
        sendResponse({ ok: true });
        return;
      case DOMScout.MSG.SET_FORMAT:
        state.settings.format = message.format;
        syncSelections();
        sendResponse({ ok: true });
        return;
      case DOMScout.MSG.REMOVE_ELEMENT:
        removeSelection(message.selectionId);
        sendResponse({ ok: true });
        return;
      default:
        sendResponse({ ok: false });
    }
  });

  DOMScout.highlighterApi.ensureRoot();
})();
