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
    .dom-scout-toolbar {
      position: fixed;
      display: flex;
      gap: 8px;
      padding: 8px;
      border-radius: 12px;
      background: rgba(13, 17, 25, 0.96);
      border: 1px solid rgba(42, 50, 70, 0.85);
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45);
      pointer-events: auto;
      z-index: 2147483648;
    }
    .dom-scout-toolbar-btn {
      appearance: none;
      border: none;
      border-radius: 8px;
      padding: 8px 14px;
      font: 13px/1 Inter, ui-sans-serif, system-ui, sans-serif;
      font-weight: 600;
      cursor: pointer;
      transition: transform 80ms ease, opacity 120ms ease;
      white-space: nowrap;
    }
    .dom-scout-toolbar-btn:hover {
      transform: translateY(-1px);
    }
    .dom-scout-toolbar-btn:active {
      transform: translateY(0);
    }
    .dom-scout-toolbar-capture {
      background: #2ecc71;
      color: #08110a;
    }
    .dom-scout-toolbar-clear {
      background: rgba(42, 50, 70, 0.6);
      color: #94a3b8;
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

    const toolbar = document.createElement('div');
    toolbar.className = 'dom-scout-toolbar';
    toolbar.style.display = 'none';

    const style = document.createElement('style');
    style.textContent = CSS;

    shadow.appendChild(style);
    layer.appendChild(hoverBox);
    layer.appendChild(label);
    layer.appendChild(selectedLayer);
    shadow.appendChild(layer);
    shadow.appendChild(toolbar);
    document.documentElement.appendChild(root);

    DOMScout.highlighter = {
      root,
      shadow,
      layer,
      hoverBox,
      label,
      selectedLayer,
      toolbar,
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
    const summary = `${DOMScout.serializer.getNodeSummary(element)} \u00b7 ${Math.round(rect.width)}\u00d7${Math.round(rect.height)}`;

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

  function renderToolbar(selections, onCapture, onClear) {
    ensureRoot();
    const toolbar = DOMScout.highlighter.toolbar;
    toolbar.replaceChildren();

    if (!selections.length) {
      toolbar.style.display = 'none';
      return;
    }

    const captureBtn = document.createElement('button');
    captureBtn.className = 'dom-scout-toolbar-btn dom-scout-toolbar-capture';
    captureBtn.textContent = 'Capture to Panel';
    captureBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      onCapture();
    });

    const clearBtn = document.createElement('button');
    clearBtn.className = 'dom-scout-toolbar-btn dom-scout-toolbar-clear';
    clearBtn.textContent = 'Clear';
    clearBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      onClear();
    });

    toolbar.appendChild(captureBtn);
    toolbar.appendChild(clearBtn);

    // Position toolbar below the last selected element
    const lastSelection = selections[selections.length - 1];
    if (lastSelection && lastSelection.element) {
      const rect = lastSelection.element.getBoundingClientRect();
      toolbar.style.left = `${rect.left}px`;
      toolbar.style.top = `${rect.bottom + 12}px`;
      toolbar.style.display = 'flex';
    }
  }

  function hideToolbar() {
    if (!DOMScout.highlighter) {
      return;
    }
    DOMScout.highlighter.toolbar.style.display = 'none';
  }

  DOMScout.highlighterApi = {
    ensureRoot,
    showHover,
    hideHover,
    renderSelections,
    renderToolbar,
    hideToolbar,
  };
})();
