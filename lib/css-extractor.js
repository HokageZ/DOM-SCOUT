(function () {
  const PROPERTIES = [
    'display', 'position', 'top', 'right', 'bottom', 'left',
    'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height',
    'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
    'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
    'gap', 'flex', 'flex-direction', 'justify-content', 'align-items',
    'grid-template-columns', 'grid-template-rows',
    'font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing',
    'color', 'background', 'background-color', 'border', 'border-radius',
    'box-shadow', 'opacity', 'overflow', 'text-align', 'object-fit',
    'z-index', 'transform', 'white-space', 'text-transform', 'text-decoration'
  ];

  function isMeaningfulValue(value) {
    return value && !['none', 'normal', 'rgba(0, 0, 0, 0)', 'auto', '0px', '0s'].includes(value.trim());
  }

  function getRuleForElement(element) {
    const summary = DOMScout.serializer.getNodeSummary(element).replace(/\s+/g, '');
    return summary.includes('#') ? summary : DOMScout.serializer.getSelector(element);
  }

  function extractRelevantStyles(element) {
    const computed = getComputedStyle(element);
    const styles = [];

    for (const property of PROPERTIES) {
      const value = computed.getPropertyValue(property);
      if (!isMeaningfulValue(value)) {
        continue;
      }

      styles.push(`${property}: ${value};`);
    }

    return styles;
  }

  function extractStylesForTree(root, options, depth = 0, acc = []) {
    if (!(root instanceof Element) || DOMScout.cleaner.shouldSkipElement(root, options)) {
      return acc;
    }

    const styles = extractRelevantStyles(root);
    if (styles.length) {
      acc.push({
        selector: getRuleForElement(root),
        styles,
      });
    }

    if (options.depth !== 'Infinity' && options.depth !== Infinity && depth >= Number(options.depth)) {
      return acc;
    }

    if (root.shadowRoot) {
      for (const child of root.shadowRoot.children) {
        extractStylesForTree(child, options, depth + 1, acc);
      }
    }

    for (const child of root.children) {
      extractStylesForTree(child, options, depth + 1, acc);
    }

    return acc;
  }

  function renderStyleBlocks(root, options) {
    return extractStylesForTree(root, options)
      .map((entry) => `${entry.selector} {\n  ${entry.styles.join('\n  ')}\n}`)
      .join('\n\n');
  }

  DOMScout.cssExtractor = {
    extractRelevantStyles,
    renderStyleBlocks,
  };
})();
