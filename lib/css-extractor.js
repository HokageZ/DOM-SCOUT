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
    'box-shadow', 'opacity', 'overflow', 'text-align', 'object-fit'
  ];

  function extractRelevantStyles(element) {
    const computed = getComputedStyle(element);
    const styles = [];

    for (const property of PROPERTIES) {
      const value = computed.getPropertyValue(property);
      if (!value) {
        continue;
      }

      if (value === 'none' || value === 'normal' || value === 'rgba(0, 0, 0, 0)' || value === 'auto') {
        continue;
      }

      styles.push(`${property}: ${value};`);
    }

    return styles;
  }

  DOMScout.cssExtractor = {
    extractRelevantStyles,
  };
})();
