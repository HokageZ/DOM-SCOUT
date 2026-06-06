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

  function getContextChain(element) {
    const chain = [];
    let current = element.parentElement;

    while (current && current !== document.documentElement && chain.length < 6) {
      chain.unshift(getNodeSummary(current));
      current = current.parentElement;
    }

    return chain;
  }

  function countLines(value) {
    if (!value) {
      return 0;
    }

    return String(value).split('\n').length;
  }

  function truncateLines(value, maxLines) {
    const lines = String(value).split('\n');
    if (lines.length <= maxLines) {
      return { value: String(value), truncated: false, omittedLines: 0 };
    }

    const kept = lines.slice(0, maxLines);
    const omittedLines = lines.length - maxLines;
    kept.push(`... [truncated ${omittedLines} more lines]`);
    return {
      value: kept.join('\n'),
      truncated: true,
      omittedLines,
    };
  }

  function withContextHeader(value, element, options) {
    if (!options.includeContext) {
      return value;
    }

    const chain = getContextChain(element);
    if (!chain.length) {
      return value;
    }

    return [`CONTEXT: ${chain.join(' > ')}`, '', value].join('\n');
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
    if (!(element instanceof Element) || DOMScout.cleaner.shouldSkipElement(element, options)) {
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
    if (!(element instanceof Element) || DOMScout.cleaner.shouldSkipElement(element, options)) {
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
    if (!(element instanceof Element) || DOMScout.cleaner.shouldSkipElement(element, options)) {
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

    const warnings = [];
    if (element.tagName.toLowerCase() === 'img' && !element.getAttribute('alt')) {
      warnings.push('missing-alt');
    }
    if ((element.tagName.toLowerCase() === 'button' || element.getAttribute('role') === 'button') && !name) {
      warnings.push('unnamed-button');
    }
    const warningSuffix = warnings.length ? ` WARNING(${warnings.join(', ')})` : '';
    const lines = [`${indent}[${element.tagName.toLowerCase()}${attrs.length ? ' ' + attrs.join(' ') : ''}]${name ? ` ${JSON.stringify(name)}` : ''}${warningSuffix}`];

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
    const attrs = Object.fromEntries(DOMScout.cleaner.getAllowedAttributes(element, { ...DOMScout.DEFAULTS, keepTestIds: true, stripNoise: false }));
    const text = getTextPreview(element);
    const candidates = [];

    if (attrs['data-testid']) candidates.push({ type: 'testid', value: `[data-testid="${attrs['data-testid']}"]`, score: 100 });
    if (attrs['data-cy']) candidates.push({ type: 'data-cy', value: `[data-cy="${attrs['data-cy']}"]`, score: 98 });
    if (attrs.id) candidates.push({ type: 'id', value: `#${CSS.escape(attrs.id)}`, score: 95 });
    if (attrs.name) candidates.push({ type: 'name', value: `${element.tagName.toLowerCase()}[name="${attrs.name}"]`, score: 88 });
    if (attrs.role && text) candidates.push({ type: 'role+text', value: `${element.tagName.toLowerCase()}[role="${attrs.role}"]`, score: 72 });
    if (attrs.href) candidates.push({ type: 'href', value: `${element.tagName.toLowerCase()}[href="${attrs.href}"]`, score: 70 });
    if (element.classList.length) candidates.push({ type: 'class-chain', value: selector, score: 60 });

    const ranked = candidates.sort((a, b) => b.score - a.score);
    return {
      description: text || getNodeSummary(element),
      text,
      selectors: {
        best: ranked[0] ? ranked[0].value : selector,
        css: selector,
        fallback: ranked.slice(1).map((item) => item.value),
      },
      rankedSelectors: ranked,
      tag: element.tagName.toLowerCase(),
      attributes: attrs,
    };
  }

  function finalizeOutput(value, element, options) {
    const contextual = withContextHeader(String(value || ''), element, options);
    return truncateLines(contextual, options.truncationThreshold);
  }

  DOMScout.serializer = {
    getNodeSummary,
    getContextChain,
    getSelector,
    getTextPreview,
    countLines,
    truncateLines,
    finalizeOutput,
    serializeElement,
    buildStructure,
    buildAccessibilitySummary,
    buildSelectorPayload,
  };
})();
