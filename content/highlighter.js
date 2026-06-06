(function () {
  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function ensureRoot() {
    if (DOMScout.highlighter && DOMScout.highlighter.root) {
      return DOMScout.highlighter.root;
    }

    const root = document.createElement('div');
    root.id = 'dom-scout-root';

    const shadow = root.attachShadow({ mode: 'open' });
    const layer = document.createElement('div');
    layer.className = 'dom-scout-layer';

    const hoverBox = document.createElement('div');
    hoverBox.className = 'dom-scout-hover-box';
    hoverBox.hidden = true;

    const label = document.createElement('div');
    label.className = 'dom-scout-label';
    label.hidden = true;

    const selectedLayer = document.createElement('div');

    const styleLink = document.createElement('link');
    styleLink.rel = 'stylesheet';
    styleLink.href = chrome.runtime.getURL('content/content.css');

    shadow.appendChild(styleLink);
    layer.appendChild(hoverBox);
    layer.appendChild(label);
    layer.appendChild(selectedLayer);
    shadow.appendChild(layer);
    document.documentElement.appendChild(root);

    DOMScout.highlighter = {
      root,
      shadow,
      layer,
      hoverBox,
      label,
      selectedLayer,
    };

    return root;
  }

  function setBoxRect(node, rect) {
    node.style.left = `${rect.left + window.scrollX}px`;
    node.style.top = `${rect.top + window.scrollY}px`;
    node.style.width = `${Math.max(rect.width, 0)}px`;
    node.style.height = `${Math.max(rect.height, 0)}px`;
  }

  function showHover(element) {
    ensureRoot();
    if (!(element instanceof Element)) {
      hideHover();
      return;
    }

    const rect = element.getBoundingClientRect();
    const summary = `${DOMScout.serializer.getNodeSummary(element)} · ${Math.round(rect.width)}×${Math.round(rect.height)}`;

    setBoxRect(DOMScout.highlighter.hoverBox, rect);
    DOMScout.highlighter.hoverBox.hidden = false;
    DOMScout.highlighter.label.hidden = false;
    DOMScout.highlighter.label.textContent = summary;
    DOMScout.highlighter.label.style.left = `${clamp(rect.left + window.scrollX, 8, window.scrollX + window.innerWidth - 280)}px`;
    DOMScout.highlighter.label.style.top = `${Math.max(8, rect.top + window.scrollY - 34)}px`;
  }

  function hideHover() {
    if (!DOMScout.highlighter) {
      return;
    }
    DOMScout.highlighter.hoverBox.hidden = true;
    DOMScout.highlighter.label.hidden = true;
  }

  function renderSelections(selections) {
    ensureRoot();
    DOMScout.highlighter.selectedLayer.replaceChildren();

    selections.forEach((selection, index) => {
      if (!(selection.element instanceof Element)) {
        return;
      }

      const rect = selection.element.getBoundingClientRect();
      const box = document.createElement('div');
      box.className = 'dom-scout-selected-box';
      setBoxRect(box, rect);

      const badge = document.createElement('div');
      badge.className = 'dom-scout-badge';
      badge.textContent = String(index + 1);
      badge.style.left = `${rect.left + window.scrollX}px`;
      badge.style.top = `${Math.max(8, rect.top + window.scrollY - 12)}px`;

      DOMScout.highlighter.selectedLayer.appendChild(box);
      DOMScout.highlighter.selectedLayer.appendChild(badge);
    });
  }

  DOMScout.highlighterApi = {
    ensureRoot,
    showHover,
    hideHover,
    renderSelections,
  };
})();
