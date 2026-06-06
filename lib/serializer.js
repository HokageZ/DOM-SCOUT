(function () {
  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');
  }

  function getNodeSummary(element) {
    const tag = element.tagName.toLowerCase();
    const id = element.id ? `#${element.id}` : '';
    const className = typeof element.className === 'string'
      ? element.className.trim().split(/\s+/).filter(Boolean).slice(0, 3).map((name) => `.${name}`).join('')
      : '';
    return `${tag}${id}${className}`;
  }

  function getSelector(element) {
    if (element.id) {
      return `#${CSS.escape(element.id)}`;
    }

    const parts = [];
    let current = element;

    while (current && current.nodeType === Node.ELEMENT_NODE && parts.length < 5) {
      let part = current.tagName.toLowerCase();
      if (current.classList.length) {
        part += '.' + Array.from(current.classList).slice(0, 2).map((name) => CSS.escape(name)).join('.');
      }
      parts.unshift(part);
      current = current.parentElement;
    }

    return parts.join(' > ');
  }

  function getTextPreview(element) {
    const text = DOMScout.cleaner.cleanText(element.textContent || '');
    return text.slice(0, 120);
  }

  function serializeElement(element, options, depth = 0) {
    if (!(element instanceof Element) || DOMScout.cleaner.isHidden(element)) {
      return '';
    }

    const tag = element.tagName.toLowerCase();
    if (DOMScout.SKIP_TAGS.has(tag)) {
      if (tag === 'svg') {
        return `<svg aria-label="vector graphic"></svg>`;
      }
      return '';
    }

    const attrs = DOMScout.cleaner.getAllowedAttributes(element, options)
      .map(([name, value]) => `${name}="${escapeHtml(value)}"`)
      .join(' ');

    const openTag = attrs ? `<${tag} ${attrs}>` : `<${tag}>`;

    if (DOMScout.VOID_TAGS.has(tag)) {
      return openTag;
    }

    if (options.depth !== Infinity && depth >= options.depth) {
      const text = getTextPreview(element);
      return `${openTag}${text ? escapeHtml(text) : ''}</${tag}>`;
    }

    const childParts = [];

    for (const child of element.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = DOMScout.cleaner.cleanText(child.textContent || '');
        if (text) {
          childParts.push(escapeHtml(text));
        }
        continue;
      }

      if (child.nodeType === Node.ELEMENT_NODE) {
        const serialized = serializeElement(child, options, depth + 1);
        if (serialized) {
          childParts.push(serialized);
        }
      }
    }

    return `${openTag}${childParts.join('')}</${tag}>`;
  }

  function buildStructure(element, options, depth = 0) {
    if (!(element instanceof Element) || DOMScout.cleaner.isHidden(element)) {
      return [];
    }

    const tag = element.tagName.toLowerCase();
    if (DOMScout.SKIP_TAGS.has(tag) && tag !== 'svg') {
      return [];
    }

    const indent = '  '.repeat(depth);
    const text = getTextPreview(element);
    const line = `${indent}${getNodeSummary(element)}${text ? ` "${text}"` : ''}`;
    const lines = [line];

    if (options.depth !== Infinity && depth >= options.depth) {
      return lines;
    }

    for (const child of element.children) {
      lines.push(...buildStructure(child, options, depth + 1));
    }

    return lines;
  }

  function buildAccessibilitySummary(element, options, depth = 0) {
    if (!(element instanceof Element) || DOMScout.cleaner.isHidden(element)) {
      return [];
    }

    const indent = '  '.repeat(depth);
    const role = element.getAttribute('role');
    const name = element.getAttribute('aria-label') || getTextPreview(element);
    const attrs = [];

    if (role) attrs.push(`role="${role}"`);
    if (element.hasAttribute('aria-label')) attrs.push(`aria-label="${element.getAttribute('aria-label')}"`);
    if (element.hasAttribute('aria-labelledby')) attrs.push(`aria-labelledby="${element.getAttribute('aria-labelledby')}"`);
    if (element.hasAttribute('alt')) attrs.push(`alt="${element.getAttribute('alt')}"`);

    const lines = [`${indent}[${element.tagName.toLowerCase()}${attrs.length ? ' ' + attrs.join(' ') : ''}]${name ? ` ${JSON.stringify(name)}` : ''}`];

    if (options.depth !== Infinity && depth >= options.depth) {
      return lines;
    }

    for (const child of element.children) {
      lines.push(...buildAccessibilitySummary(child, options, depth + 1));
    }

    return lines;
  }

  function buildSelectorPayload(element) {
    const selector = getSelector(element);
    return {
      description: getTextPreview(element) || getNodeSummary(element),
      text: getTextPreview(element),
      selectors: {
        best: element.getAttribute('data-testid') ? `[data-testid="${element.getAttribute('data-testid')}"]` : selector,
        css: selector,
      },
      tag: element.tagName.toLowerCase(),
      attributes: Object.fromEntries(DOMScout.cleaner.getAllowedAttributes(element, { ...DOMScout.DEFAULTS, keepTestIds: true, stripNoise: false })),
    };
  }

  DOMScout.serializer = {
    getNodeSummary,
    getSelector,
    getTextPreview,
    serializeElement,
    buildStructure,
    buildAccessibilitySummary,
    buildSelectorPayload,
  };
})();
