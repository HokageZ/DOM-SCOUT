(function () {
  const CSS = `
    .dom-scout-layer {
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 2147483647;
    }
    .dom-scout-hover-box {
      position: fixed;
      border-radius: 6px;
      border: 2px solid rgba(91, 140, 255, 0.98);
      background: rgba(91, 140, 255, 0.14);
      box-shadow: 0 0 0 1px rgba(91, 140, 255, 0.35), 0 8px 32px rgba(91, 140, 255, 0.15);
      transition: opacity 100ms ease;
    }
    .dom-scout-selected-box {
      position: fixed;
      border-radius: 6px;
      border: 2px solid rgba(46, 204, 113, 0.98);
      background: rgba(46, 204, 113, 0.12);
      box-shadow: 0 0 0 1px rgba(46, 204, 113, 0.35), 0 8px 32px rgba(46, 204, 113, 0.12);
    }
    .dom-scout-label {
      position: fixed;
      max-width: min(420px, calc(100vw - 24px));
      padding: 6px 12px;
      border-radius: 8px;
      background: rgba(13, 17, 25, 0.96);
      color: #edf1f8;
      border: 1px solid rgba(91, 140, 255, 0.55);
      font: 12px/1.35 Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
      pointer-events: none;
    }
    .dom-scout-badge {
      position: fixed;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 24px;
      height: 24px;
      padding: 0 8px;
      border-radius: 999px;
      background: rgba(46, 204, 113, 0.98);
      color: #08110a;
      font: 12px/1 Inter, ui-sans-serif, system-ui, sans-serif;
      font-weight: 700;
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.22);
      pointer-events: none;
    }
  `;

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function ensureRoot() {
    if (DOMScout.highlighter && DOMScout.highlighter.root) {
      return DOMScout.highlighter.root;
    }

    const root = document.createElement('div');
    root.id = 'dom-scout-root';
    root.style.all = 'initial';

    const shadow = root.attachShadow({ mode: 'open' });
    const layer = document.createElement('div');
    layer.className = 'dom-scout-layer';

    const hoverBox = document.createElement('div');
    hoverBox.className = 'dom-scout-hover-box';
    hoverBox.style.display = 'none';

    const label = document.createElement('div');
    label.className = 'dom-scout-label';
    label.style.display = 'none';

    const selectedLayer = document.createElement('div');

    const style = document.createElement('style');
    style.textContent = CSS;

    shadow.appendChild(style);
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
    node.style.left = `${rect.left}px`;
    node.style.top = `${rect.top}px`;
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
    DOMScout.highlighter.hoverBox.style.display = 'block';
    DOMScout.highlighter.label.style.display = 'block';
    DOMScout.highlighter.label.textContent = summary;
    DOMScout.highlighter.label.style.left = `${clamp(rect.left, 8, window.innerWidth - 280)}px`;
    DOMScout.highlighter.label.style.top = `${Math.max(8, rect.top - 34)}px`;
  }

  function hideHover() {
    if (!DOMScout.highlighter) {
      return;
    }
    DOMScout.highlighter.hoverBox.style.display = 'none';
    DOMScout.highlighter.label.style.display = 'none';
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
      badge.style.left = `${rect.left}px`;
      badge.style.top = `${Math.max(8, rect.top - 12)}px`;

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
