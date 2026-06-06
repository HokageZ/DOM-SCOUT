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
      font-family: Inter, ui-sans-serif, system-ui, sans-serif;
    }
    .dom-scout-dock-info {
      font-size: 13px;
      color: #94a3b8;
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
  `;

  let activeSelections = [];
  let currentHoveredElement = null;
  let activeCallbackCapture = null;
  let activeCallbackClear = null;
  let activeCallbackToggleInspector = null;
  let activeCallbackTraverse = null;
  let isPickingMode = true;

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

    const style = document.createElement('style');
    style.textContent = CSS;

    shadow.appendChild(style);
    layer.appendChild(hoverBox);
    layer.appendChild(label);
    layer.appendChild(selectedLayer);
    shadow.appendChild(layer);
    shadow.appendChild(dock);
    document.documentElement.appendChild(root);

    DOMScout.highlighter = {
      root,
      shadow,
      layer,
      hoverBox,
      label,
      selectedLayer,
      dock,
    };

    // Start tracking layout shifts and scroll/resize positions smoothly via requestAnimationFrame
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
      // Update Hover Box position if active
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

      // Update Selected Boxes
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
          // Element removed from DOM
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
  }

  function renderDockUI() {
    ensureRoot();
    const dock = DOMScout.highlighter.dock;
    dock.replaceChildren();

    if (!isPickingMode && !activeSelections.length) {
      dock.style.display = 'none';
      return;
    }

    // 1. Info / Count
    const info = document.createElement('div');
    info.className = 'dom-scout-dock-info';
    info.textContent = `${activeSelections.length} Selected`;
    dock.appendChild(info);

    // 2. Divider
    const divider1 = document.createElement('div');
    divider1.className = 'dom-scout-dock-divider';
    dock.appendChild(divider1);

    // 3. Toggle Picker button (Active indicator)
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

    // 4. Hierarchy Traverse Up (Parent)
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

    // 5. Hierarchy Traverse Down (Child)
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

    // 6. Divider
    const divider2 = document.createElement('div');
    divider2.className = 'dom-scout-dock-divider';
    dock.appendChild(divider2);

    // 7. Clear all selections button
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

    // 8. Capture & Open Side Panel button
    const captureBtn = document.createElement('button');
    captureBtn.className = 'dom-scout-toolbar-btn dom-scout-dock-capture';
    captureBtn.textContent = 'Capture & Open Panel';
    captureBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (activeCallbackCapture) {
        activeCallbackCapture();
      }
    });
    dock.appendChild(captureBtn);

    dock.style.display = 'flex';
  }

  function setupDockCallbacks(callbacks) {
    activeCallbackCapture = callbacks.onCapture;
    activeCallbackClear = callbacks.onClear;
    activeCallbackToggleInspector = callbacks.onToggleInspector;
    activeCallbackTraverse = callbacks.onTraverse;
  }

  function hideToolbar() {
    if (!DOMScout.highlighter) {
      return;
    }
    DOMScout.highlighter.dock.style.display = 'none';
  }

  function setPickingState(picking) {
    isPickingMode = picking;
    renderDockUI();
  }

  DOMScout.highlighterApi = {
    ensureRoot,
    showHover,
    hideHover,
    renderSelections,
    renderToolbar: renderSelections, // backward compatibility
    hideToolbar,
    setupDockCallbacks,
    setPickingState,
  };
})();
