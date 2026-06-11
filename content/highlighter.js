(function () {
  const CSS = `
    :host {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    .dom-scout-layer {
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 2147483647;
      font-family: inherit;
    }
    .dom-scout-hover-box {
      position: fixed;
      border-radius: 6px;
      border: 2px dashed rgba(91, 140, 255, 0.98);
      background: rgba(91, 140, 255, 0.08);
      box-shadow: 0 0 0 1px rgba(91, 140, 255, 0.25);
      pointer-events: none;
      will-change: left, top, width, height;
    }
    .dom-scout-selected-box {
      position: fixed;
      border-radius: 6px;
      border: 2px solid rgba(46, 204, 113, 0.98);
      background: rgba(46, 204, 113, 0.08);
      box-shadow: 0 0 0 1px rgba(46, 204, 113, 0.25);
      pointer-events: none;
      will-change: left, top, width, height;
    }
    .dom-scout-label {
      position: fixed;
      max-width: min(420px, calc(100vw - 24px));
      padding: 6px 12px;
      border-radius: 8px;
      background: rgba(15, 20, 30, 0.96);
      color: #edf1f8;
      border: 1px solid rgba(91, 140, 255, 0.45);
      font: 11px/1.35 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
      pointer-events: none;
      z-index: 2147483648;
      will-change: left, top;
    }
    .dom-scout-badge {
      position: fixed;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 20px;
      height: 20px;
      padding: 0 6px;
      border-radius: 999px;
      background: rgba(46, 204, 113, 0.98);
      color: #08110a;
      font: 10px/1 Inter, ui-sans-serif, system-ui, sans-serif;
      font-weight: 700;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      pointer-events: none;
      z-index: 2147483648;
      will-change: left, top;
    }
    .dom-scout-dock {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 16px;
      border-radius: 999px;
      background: rgba(15, 20, 30, 0.85);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1);
      pointer-events: auto;
      z-index: 2147483648;
      font-family: inherit;
    }
    .dom-scout-dock-info {
      font-size: 13px;
      color: #cbd5e1;
      font-weight: 500;
      margin-right: 4px;
      white-space: nowrap;
    }
    .dom-scout-dock-divider {
      width: 1px;
      height: 18px;
      background: rgba(255, 255, 255, 0.12);
    }
    .dom-scout-dock-btn {
      appearance: none;
      background: transparent;
      border: none;
      color: #edf1f8;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 999px;
      transition: background 120ms ease, transform 80ms ease, color 120ms ease;
    }
    .dom-scout-dock-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
    }
    .dom-scout-dock-btn:active {
      transform: scale(0.92);
    }
    .dom-scout-dock-btn-active {
      background: rgba(91, 140, 255, 0.2);
      color: #5b8cff;
    }
    .dom-scout-dock-btn-active:hover {
      background: rgba(91, 140, 255, 0.3);
      color: #5b8cff;
    }
    .dom-scout-dock-capture {
      background: #5b8cff;
      color: #fff;
      padding: 0 16px;
      width: auto;
      height: 32px;
      border-radius: 999px;
      font-size: 13px;
      font-weight: 600;
      transition: background 120ms ease, transform 80ms ease;
    }
    .dom-scout-dock-capture:hover {
      background: #3d72f6;
      color: #fff;
    }
    .dom-scout-dock-capture:active {
      transform: scale(0.95);
    }

    /* Floating Control Panel CSS */
    .dom-scout-panel {
      position: fixed;
      right: 24px;
      top: 24px;
      height: calc(100vh - 48px);
      max-height: calc(100vh - 48px);
      width: 360px;
      background: rgba(15, 20, 30, 0.85);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      box-shadow: 0 30px 60px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1);
      display: flex;
      flex-direction: column;
      color: #edf1f8;
      z-index: 2147483648;
      pointer-events: auto;
      overflow: hidden;
      animation: domScoutSlideIn 200ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
      font-family: inherit;
    }
    @keyframes domScoutSlideIn {
      from { transform: translateX(380px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    .dom-scout-panel-header {
      padding: 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      cursor: grab;
      user-select: none;
    }
    .dom-scout-panel-title {
      margin: 0;
      font-size: 16px;
      font-weight: 700;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .dom-scout-panel-title span {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #cbd5e1;
      background: rgba(255, 255, 255, 0.06);
      padding: 2px 6px;
      border-radius: 4px;
    }
    .dom-scout-panel-close {
      appearance: none;
      background: transparent;
      border: none;
      color: #cbd5e1;
      font-size: 18px;
      cursor: pointer;
      padding: 4px;
      line-height: 1;
      border-radius: 4px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      transition: background 120ms ease, color 120ms ease;
    }
    .dom-scout-panel-close:hover {
      background: rgba(255, 255, 255, 0.06);
      color: #fff;
    }
    .dom-scout-panel-content {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .dom-scout-panel-section {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .dom-scout-panel-section-title {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #cbd5e1;
      margin: 0;
      font-weight: 700;
    }
    .dom-scout-panel-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }
    .dom-scout-panel-label {
      display: flex;
      flex-direction: column;
      gap: 6px;
      font-size: 12px;
      color: #cbd5e1;
    }
    .dom-scout-panel-select,
    .dom-scout-panel-input {
      background: #0d1117;
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 8px;
      color: #f8fafc;
      padding: 8px 10px;
      font-size: 13px;
      outline: none;
      transition: border-color 120ms ease;
    }
    .dom-scout-panel-select option {
      background: #0f141e;
      color: #f8fafc;
    }
    .dom-scout-panel-select:focus,
    .dom-scout-panel-input:focus {
      border-color: rgba(91, 140, 255, 0.5);
    }
    .dom-scout-panel-options {
      display: grid;
      gap: 8px;
    }
    .dom-scout-panel-checkbox-row {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 13px;
      color: #edf1f8;
      cursor: pointer;
    }
    .dom-scout-panel-checkbox-row input {
      margin: 0;
      width: 15px;
      height: 15px;
      border-radius: 4px;
      border: 1px solid rgba(255, 255, 255, 0.15);
      background: transparent;
      cursor: pointer;
    }
    .dom-scout-panel-selections {
      display: grid;
      gap: 8px;
      max-height: 120px;
      overflow-y: auto;
    }
    .dom-scout-panel-selection-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 10px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 8px;
      font-size: 12px;
      min-width: 0;
    }
    .dom-scout-panel-selection-chip {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      color: #5b8cff;
      background: rgba(91, 140, 255, 0.1);
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 600;
      flex-shrink: 0;
    }
    .dom-scout-panel-selection-name {
      flex: 1;
      margin: 0 10px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: #edf1f8;
      min-width: 0;
    }
    .dom-scout-panel-selection-remove {
      appearance: none;
      background: transparent;
      border: none;
      color: #ff6b6b;
      cursor: pointer;
      font-size: 11px;
      font-weight: 600;
      padding: 4px 8px;
      border-radius: 4px;
      flex-shrink: 0;
    }
    .dom-scout-panel-selection-remove:hover {
      background: rgba(255, 107, 107, 0.1);
    }
    .dom-scout-panel-empty {
      font-size: 12px;
      color: #94a3b8;
      text-align: center;
      padding: 12px;
      border: 1px dashed rgba(255, 255, 255, 0.08);
      border-radius: 8px;
    }
    .dom-scout-panel-preview-container {
      display: flex;
      flex-direction: column;
      gap: 6px;
      flex: 1;
    }
    .dom-scout-panel-meta {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: #cbd5e1;
    }
    .dom-scout-panel-meta-warning {
      color: #ffbf69;
      font-weight: 600;
    }
    .dom-scout-panel-preview {
      flex: 1;
      min-height: 150px;
      background: #0d1117;
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 8px;
      color: #f8fafc;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 12px;
      line-height: 1.5;
      padding: 10px;
      resize: none;
      outline: none;
    }
    .dom-scout-panel-preview:focus {
      border-color: rgba(91, 140, 255, 0.35);
    }
    .dom-scout-panel-actions {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
      padding-top: 8px;
    }
    .dom-scout-panel-btn {
      appearance: none;
      border: none;
      border-radius: 8px;
      padding: 10px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      text-align: center;
      transition: background 120ms ease, transform 80ms ease, color 120ms ease;
    }
    .dom-scout-panel-btn-primary {
      background: #5b8cff;
      color: #fff;
    }
    .dom-scout-panel-btn-primary:hover {
      background: #3d72f6;
    }
    .dom-scout-panel-btn-secondary {
      background: rgba(255, 255, 255, 0.06);
      color: #edf1f8;
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
    .dom-scout-panel-btn-secondary:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
    }
    .dom-scout-panel-btn:active {
      transform: scale(0.97);
    }
  `;

  let activeSelections = [];
  let currentHoveredElement = null;
  let activeCallbackCapture = null;
  let activeCallbackClear = null;
  let activeCallbackToggleInspector = null;
  let activeCallbackTraverse = null;
  let activeCallbackRemoveSelection = null;
  let activeCallbackChangeSettings = null;
  let isPickingMode = true;
  let currentSettings = { ...DOMScout.DEFAULTS };
  let currentOutput = '';

  let panelX = null;
  let panelY = null;
  let isDraggingPanel = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let initialPanelX = 0;
  let initialPanelY = 0;

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

    const dock = document.createElement('div');
    dock.className = 'dom-scout-dock';
    dock.style.display = 'none';

    const panel = document.createElement('div');
    panel.className = 'dom-scout-panel';
    panel.style.display = 'none';

    const style = document.createElement('style');
    style.textContent = CSS;

    // Dragging logic for panel
    panel.addEventListener('mousedown', (e) => {
      const header = panel.querySelector('.dom-scout-panel-header');
      if (!header) return;

      // Ignore if clicking inputs, select, textarea, or buttons
      if (e.target.closest('button, input, select, textarea, .dom-scout-panel-close')) {
        return;
      }

      // Only drag if click was inside header
      if (!header.contains(e.target)) {
        return;
      }

      isDraggingPanel = true;
      header.style.cursor = 'grabbing';

      const rect = panel.getBoundingClientRect();
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      initialPanelX = rect.left;
      initialPanelY = rect.top;

      panel.style.right = 'auto';
      panel.style.bottom = 'auto';
      panel.style.left = `${initialPanelX}px`;
      panel.style.top = `${initialPanelY}px`;
      panel.style.height = `${rect.height}px`;

      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDraggingPanel) return;

      const dx = e.clientX - dragStartX;
      const dy = e.clientY - dragStartY;

      let newX = initialPanelX + dx;
      let newY = initialPanelY + dy;

      // Keep panel partially inside viewport
      const rect = panel.getBoundingClientRect();
      newX = Math.max(-rect.width + 50, Math.min(newX, window.innerWidth - 50));
      newY = Math.max(0, Math.min(newY, window.innerHeight - 50));

      panelX = newX;
      panelY = newY;

      panel.style.left = `${newX}px`;
      panel.style.top = `${newY}px`;
    });

    document.addEventListener('mouseup', () => {
      if (isDraggingPanel) {
        isDraggingPanel = false;
        const header = panel.querySelector('.dom-scout-panel-header');
        if (header) {
          header.style.cursor = 'grab';
        }
      }
    });

    shadow.appendChild(style);
    layer.appendChild(hoverBox);
    layer.appendChild(label);
    layer.appendChild(selectedLayer);
    shadow.appendChild(layer);
    shadow.appendChild(dock);
    shadow.appendChild(panel);
    document.documentElement.appendChild(root);

    DOMScout.highlighter = {
      root,
      shadow,
      layer,
      hoverBox,
      label,
      selectedLayer,
      dock,
      panel,
    };

    requestAnimationFrame(updatePositionsLoop);

    return root;
  }

  function setBoxRect(node, rect) {
    node.style.left = `${rect.left}px`;
    node.style.top = `${rect.top}px`;
    node.style.width = `${Math.max(rect.width, 0)}px`;
    node.style.height = `${Math.max(rect.height, 0)}px`;
  }

  function updatePositionsLoop() {
    if (DOMScout.highlighter) {
      if (currentHoveredElement && document.contains(currentHoveredElement)) {
        const rect = currentHoveredElement.getBoundingClientRect();
        setBoxRect(DOMScout.highlighter.hoverBox, rect);
        DOMScout.highlighter.hoverBox.style.display = 'block';

        const summary = `${DOMScout.serializer.getNodeSummary(currentHoveredElement)} \u00b7 ${Math.round(rect.width)}\u00d7${Math.round(rect.height)}`;
        DOMScout.highlighter.label.textContent = summary;
        DOMScout.highlighter.label.style.left = `${clamp(rect.left, 8, window.innerWidth - 280)}px`;
        DOMScout.highlighter.label.style.top = `${Math.max(8, rect.top - 34)}px`;
        DOMScout.highlighter.label.style.display = 'block';
      } else {
        DOMScout.highlighter.hoverBox.style.display = 'none';
        DOMScout.highlighter.label.style.display = 'none';
      }

      const selectedLayer = DOMScout.highlighter.selectedLayer;
      const boxes = selectedLayer.querySelectorAll('.dom-scout-selected-box');
      const badges = selectedLayer.querySelectorAll('.dom-scout-badge');

      activeSelections.forEach((selection, index) => {
        const el = selection.element;
        if (el && document.contains(el)) {
          const rect = el.getBoundingClientRect();
          const box = boxes[index];
          const badge = badges[index];

          if (box) {
            setBoxRect(box, rect);
            box.style.display = 'block';
          }
          if (badge) {
            badge.style.left = `${rect.left}px`;
            badge.style.top = `${Math.max(8, rect.top - 12)}px`;
            badge.style.display = 'inline-flex';
          }
        } else {
          const box = boxes[index];
          const badge = badges[index];
          if (box) box.style.display = 'none';
          if (badge) badge.style.display = 'none';
        }
      });
    }

    requestAnimationFrame(updatePositionsLoop);
  }

  function showHover(element) {
    ensureRoot();
    currentHoveredElement = element;
  }

  function hideHover() {
    currentHoveredElement = null;
  }

  function renderSelections(selections) {
    ensureRoot();
    activeSelections = selections;
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

    renderDockUI();
    renderPanelUI();
  }

  function renderDockUI() {
    ensureRoot();
    const dock = DOMScout.highlighter.dock;
    dock.replaceChildren();

    if (!isPickingMode && !activeSelections.length) {
      dock.style.display = 'none';
      return;
    }

    const info = document.createElement('div');
    info.className = 'dom-scout-dock-info';
    info.textContent = `${activeSelections.length} Selected`;
    dock.appendChild(info);

    const divider1 = document.createElement('div');
    divider1.className = 'dom-scout-dock-divider';
    dock.appendChild(divider1);

    const pickerBtn = document.createElement('button');
    pickerBtn.className = `dom-scout-dock-btn ${isPickingMode ? 'dom-scout-dock-btn-active' : ''}`;
    pickerBtn.title = isPickingMode ? 'Picker Active' : 'Enable Picker';
    pickerBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="16"></line>
        <line x1="8" y1="12" x2="16" y2="12"></line>
      </svg>
    `;
    pickerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      isPickingMode = !isPickingMode;
      if (activeCallbackToggleInspector) {
        activeCallbackToggleInspector(isPickingMode);
      }
      renderDockUI();
    });
    dock.appendChild(pickerBtn);

    const parentBtn = document.createElement('button');
    parentBtn.className = 'dom-scout-dock-btn';
    parentBtn.title = 'Select Parent';
    parentBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="18 15 12 9 6 15"></polyline>
      </svg>
    `;
    parentBtn.disabled = !activeSelections.length;
    parentBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (activeCallbackTraverse) {
        activeCallbackTraverse('parent');
      }
    });
    dock.appendChild(parentBtn);

    const childBtn = document.createElement('button');
    childBtn.className = 'dom-scout-dock-btn';
    childBtn.title = 'Select Child';
    childBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    `;
    childBtn.disabled = !activeSelections.length;
    childBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (activeCallbackTraverse) {
        activeCallbackTraverse('child');
      }
    });
    dock.appendChild(childBtn);

    const divider2 = document.createElement('div');
    divider2.className = 'dom-scout-dock-divider';
    dock.appendChild(divider2);

    const clearBtn = document.createElement('button');
    clearBtn.className = 'dom-scout-dock-btn';
    clearBtn.title = 'Clear All';
    clearBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
      </svg>
    `;
    clearBtn.disabled = !activeSelections.length;
    clearBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (activeCallbackClear) {
        activeCallbackClear();
      }
    });
    dock.appendChild(clearBtn);

    const resetPositionBtn = document.createElement('button');
    resetPositionBtn.className = 'dom-scout-dock-btn';
    resetPositionBtn.title = 'Reset Panel Position';
    resetPositionBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M23 4v6h-6"></path>
        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
      </svg>
    `;
    resetPositionBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      panelX = null;
      panelY = null;
      const p = DOMScout.highlighter.panel;
      p.style.left = '';
      p.style.top = '';
      p.style.right = '';
      p.style.bottom = '';
      p.style.height = '';
    });
    dock.appendChild(resetPositionBtn);

    dock.style.display = 'flex';
  }

  function renderPanelUI() {
    ensureRoot();
    const panel = DOMScout.highlighter.panel;
    panel.replaceChildren();

    // 1. Header
    const header = document.createElement('div');
    header.className = 'dom-scout-panel-header';
    
    const title = document.createElement('h3');
    title.className = 'dom-scout-panel-title';
    title.innerHTML = 'DOM-SCOUT <span>Panel</span>';
    header.appendChild(title);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'dom-scout-panel-close';
    closeBtn.title = 'Close Panel';
    closeBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    `;
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (activeCallbackCapture) {
        activeCallbackCapture(); // Close/disable inspector
      }
    });
    header.appendChild(closeBtn);
    panel.appendChild(header);

    // 2. Content Container
    const content = document.createElement('div');
    content.className = 'dom-scout-panel-content';

    // Format & Depth Section
    const configSection = document.createElement('div');
    configSection.className = 'dom-scout-panel-section';
    
    const configTitle = document.createElement('h4');
    configTitle.className = 'dom-scout-panel-section-title';
    configTitle.textContent = 'Configuration';
    configSection.appendChild(configTitle);

    const grid = document.createElement('div');
    grid.className = 'dom-scout-panel-grid';

    // Format select
    const formatLabel = document.createElement('label');
    formatLabel.className = 'dom-scout-panel-label';
    formatLabel.textContent = 'Format';
    const formatSelect = document.createElement('select');
    formatSelect.className = 'dom-scout-panel-select';
    formatSelect.innerHTML = `
      <option value="clean-html" ${currentSettings.format === 'clean-html' ? 'selected' : ''}>Clean HTML</option>
      <option value="structure" ${currentSettings.format === 'structure' ? 'selected' : ''}>Structure</option>
      <option value="html-css" ${currentSettings.format === 'html-css' ? 'selected' : ''}>HTML + CSS</option>
      <option value="accessibility" ${currentSettings.format === 'accessibility' ? 'selected' : ''}>Accessibility</option>
      <option value="selectors" ${currentSettings.format === 'selectors' ? 'selected' : ''}>Selectors</option>
      <option value="page-snapshot" ${currentSettings.format === 'page-snapshot' ? 'selected' : ''}>Page Snapshot</option>
    `;
    formatSelect.addEventListener('change', (e) => {
      if (activeCallbackChangeSettings) {
        activeCallbackChangeSettings({ format: e.target.value });
      }
    });
    formatLabel.appendChild(formatSelect);
    grid.appendChild(formatLabel);

    // Depth select
    const depthLabel = document.createElement('label');
    depthLabel.className = 'dom-scout-panel-label';
    depthLabel.textContent = 'Depth';
    const depthSelect = document.createElement('select');
    depthSelect.className = 'dom-scout-panel-select';
    depthSelect.innerHTML = `
      <option value="0" ${String(currentSettings.depth) === '0' ? 'selected' : ''}>Element only</option>
      <option value="1" ${String(currentSettings.depth) === '1' ? 'selected' : ''}>+ 1 level</option>
      <option value="Infinity" ${String(currentSettings.depth) === 'Infinity' ? 'selected' : ''}>Full subtree</option>
    `;
    depthSelect.addEventListener('change', (e) => {
      const val = e.target.value === 'Infinity' ? Infinity : Number(e.target.value);
      if (activeCallbackChangeSettings) {
        activeCallbackChangeSettings({ depth: val });
      }
    });
    depthLabel.appendChild(depthSelect);
    grid.appendChild(depthLabel);
    configSection.appendChild(grid);
    content.appendChild(configSection);

    // Options Checkboxes
    const optionsSection = document.createElement('div');
    optionsSection.className = 'dom-scout-panel-section';
    const optionsTitle = document.createElement('h4');
    optionsTitle.className = 'dom-scout-panel-section-title';
    optionsTitle.textContent = 'Options';
    optionsSection.appendChild(optionsTitle);

    const optionsGrid = document.createElement('div');
    optionsGrid.className = 'dom-scout-panel-options';

    const optionsArr = [
      { key: 'includeContext', label: 'Include parent context' },
      { key: 'includeCSS', label: 'Include CSS in rich formats' },
      { key: 'stripNoise', label: 'Strip framework/tracking noise' },
      { key: 'keepTestIds', label: 'Keep test IDs' },
      { key: 'promptWrapper', label: 'Wrap output in AI prompt' },
    ];

    optionsArr.forEach((opt) => {
      const row = document.createElement('label');
      row.className = 'dom-scout-panel-checkbox-row';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = Boolean(currentSettings[opt.key]);
      checkbox.addEventListener('change', (e) => {
        if (activeCallbackChangeSettings) {
          activeCallbackChangeSettings({ [opt.key]: e.target.checked });
        }
      });
      row.appendChild(checkbox);
      row.appendChild(document.createTextNode(opt.label));
      optionsGrid.appendChild(row);
    });
    optionsSection.appendChild(optionsGrid);
    content.appendChild(optionsSection);

    // Selections List Section
    const selectionsSection = document.createElement('div');
    selectionsSection.className = 'dom-scout-panel-section';
    const selectionsTitle = document.createElement('h4');
    selectionsTitle.className = 'dom-scout-panel-section-title';
    selectionsTitle.textContent = 'Current Selection';
    selectionsSection.appendChild(selectionsTitle);

    const selectionsList = document.createElement('div');
    selectionsList.className = 'dom-scout-panel-selections';

    if (!activeSelections.length) {
      const empty = document.createElement('div');
      empty.className = 'dom-scout-panel-empty';
      empty.textContent = 'No elements selected yet.';
      selectionsList.appendChild(empty);
    } else {
      activeSelections.forEach((sel, index) => {
        const item = document.createElement('div');
        item.className = 'dom-scout-panel-selection-item';
        
        const chip = document.createElement('span');
        chip.className = 'dom-scout-panel-selection-chip';
        chip.textContent = `#${index + 1}`;
        item.appendChild(chip);

        const name = document.createElement('span');
        name.className = 'dom-scout-panel-selection-name';
        name.textContent = sel.summary || sel.tagName || 'element';
        item.appendChild(name);

        const removeBtn = document.createElement('button');
        removeBtn.className = 'dom-scout-panel-selection-remove';
        removeBtn.textContent = 'Remove';
        removeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (activeCallbackRemoveSelection) {
            activeCallbackRemoveSelection(sel.selectionId);
          }
        });
        item.appendChild(removeBtn);
        selectionsList.appendChild(item);
      });
    }
    selectionsSection.appendChild(selectionsList);
    content.appendChild(selectionsSection);

    // Preview Section
    const previewContainer = document.createElement('div');
    previewContainer.className = 'dom-scout-panel-preview-container';

    const meta = document.createElement('div');
    meta.className = 'dom-scout-panel-meta';
    
    const tokenEstimate = Math.ceil(currentOutput.length / 4);
    const isWarning = tokenEstimate > currentSettings.maxTokenWarning;

    const countSpan = document.createElement('span');
    countSpan.textContent = `${activeSelections.length} items`;
    meta.appendChild(countSpan);

    const tokenSpan = document.createElement('span');
    tokenSpan.className = isWarning ? 'dom-scout-panel-meta-warning' : '';
    tokenSpan.textContent = `~${tokenEstimate} tokens${isWarning ? ' (warning)' : ''}`;
    meta.appendChild(tokenSpan);
    previewContainer.appendChild(meta);

    const preview = document.createElement('textarea');
    preview.className = 'dom-scout-panel-preview';
    preview.readOnly = true;
    preview.value = currentOutput || 'Selected structure will appear here...';
    previewContainer.appendChild(preview);

    // Copy actions
    const actions = document.createElement('div');
    actions.className = 'dom-scout-panel-actions';

    const copyBtn = document.createElement('button');
    copyBtn.className = 'dom-scout-panel-btn dom-scout-panel-btn-primary';
    copyBtn.textContent = 'Copy to Clipboard';
    copyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      let text = currentOutput;
      if (currentSettings.promptWrapper && text.trim()) {
        text = DOMScout.buildPrompt({
          url: location.href,
          title: document.title,
          elementCount: activeSelections.length,
          format: currentSettings.format,
          output: currentOutput,
        });
      }
      copyToClipboard(text, copyBtn, 'Copy to Clipboard');
    });
    actions.appendChild(copyBtn);

    const copyPromptBtn = document.createElement('button');
    copyPromptBtn.className = 'dom-scout-panel-btn dom-scout-panel-btn-secondary';
    copyPromptBtn.textContent = 'Copy AI Prompt';
    copyPromptBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const promptWrapped = DOMScout.buildPrompt({
        url: location.href,
        title: document.title,
        elementCount: activeSelections.length,
        format: currentSettings.format,
        output: currentOutput,
      });
      copyToClipboard(promptWrapped, copyPromptBtn, 'Copy AI Prompt');
    });
    actions.appendChild(copyPromptBtn);
    previewContainer.appendChild(actions);

    content.appendChild(previewContainer);
    panel.appendChild(content);

    // Render it visible if panel display is open
    panel.style.display = isPickingMode || activeSelections.length ? 'flex' : 'none';
  }

  function copyToClipboard(text, btn, originalText) {
    if (!text.trim()) return;
    navigator.clipboard.writeText(text).then(() => {
      btn.textContent = 'Copied!';
      btn.style.background = '#2ecc71';
      setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = '';
      }, 1500);
    });
  }

  function setupDockCallbacks(callbacks) {
    activeCallbackCapture = callbacks.onCapture;
    activeCallbackClear = callbacks.onClear;
    activeCallbackToggleInspector = callbacks.onToggleInspector;
    activeCallbackTraverse = callbacks.onTraverse;
    activeCallbackRemoveSelection = callbacks.onRemoveSelection;
    activeCallbackChangeSettings = callbacks.onChangeSettings;
  }

  function hideToolbar() {
    if (!DOMScout.highlighter) {
      return;
    }
    DOMScout.highlighter.dock.style.display = 'none';
    DOMScout.highlighter.panel.style.display = 'none';
  }

  function setPickingState(picking) {
    isPickingMode = picking;
    renderDockUI();
    renderPanelUI();
  }

  function updateSettings(settings, output) {
    currentSettings = { ...currentSettings, ...settings };
    currentOutput = output;
    renderPanelUI();
  }

  DOMScout.highlighterApi = {
    ensureRoot,
    showHover,
    hideHover,
    renderSelections,
    renderToolbar: renderSelections,
    hideToolbar,
    setupDockCallbacks,
    setPickingState,
    updateSettings,
  };
})();
