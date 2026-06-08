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

  // ---------------------------------------------------------------------------
  // Fingerprint: Full CSS path (root → element with nth-child disambiguation)
  // ---------------------------------------------------------------------------
  function generateCssPath(element) {
    const parts = [];
    let current = element;

    while (current && current.nodeType === Node.ELEMENT_NODE) {
      if (current === document.documentElement) {
        parts.unshift('html');
        break;
      }

      let part = current.tagName.toLowerCase();

      // Add nth-child for disambiguation among siblings
      const parent = current.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children);
        const sameTag = siblings.filter((s) => s.tagName === current.tagName);
        if (sameTag.length > 1) {
          const index = sameTag.indexOf(current) + 1;
          part += `:nth-of-type(${index})`;
        }
      }

      parts.unshift(part);
      current = current.parentElement;
    }

    return parts.join(' > ');
  }

  // ---------------------------------------------------------------------------
  // Fingerprint: Absolute XPath (/html/body/div[1]/main/section[2]/button)
  // ---------------------------------------------------------------------------
  function generateXPathAbsolute(element) {
    const parts = [];
    let current = element;

    while (current && current.nodeType === Node.ELEMENT_NODE) {
      if (current === document.documentElement) {
        parts.unshift('/html');
        break;
      }

      const tag = current.tagName.toLowerCase();
      const parent = current.parentElement;

      if (parent) {
        const siblings = Array.from(parent.children).filter((s) => s.tagName === current.tagName);
        if (siblings.length > 1) {
          const index = siblings.indexOf(current) + 1;
          parts.unshift(`${tag}[${index}]`);
        } else {
          parts.unshift(tag);
        }
      } else {
        parts.unshift(tag);
      }

      current = current.parentElement;
    }

    return parts.join('/');
  }

  // ---------------------------------------------------------------------------
  // Fingerprint: Relative XPath (attribute-based, short, resilient)
  // ---------------------------------------------------------------------------
  function generateXPathRelative(element) {
    const tag = element.tagName.toLowerCase();
    const candidates = [];

    // Best: data-testid
    const testid = element.getAttribute('data-testid');
    if (testid) {
      candidates.push(`//${tag}[@data-testid="${testid}"]`);
    }

    // aria-label
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) {
      candidates.push(`//${tag}[@aria-label="${ariaLabel}"]`);
    }

    // id
    if (element.id) {
      candidates.push(`//${tag}[@id="${element.id}"]`);
    }

    // name
    const name = element.getAttribute('name');
    if (name) {
      candidates.push(`//${tag}[@name="${name}"]`);
    }

    // role
    const role = element.getAttribute('role');
    if (role && ariaLabel) {
      candidates.push(`//${tag}[@role="${role}" and @aria-label="${ariaLabel}"]`);
    }

    // placeholder (inputs)
    const placeholder = element.getAttribute('placeholder');
    if (placeholder) {
      candidates.push(`//${tag}[@placeholder="${placeholder}"]`);
    }

    // Pick the first unique one, or the first candidate, or fall back to absolute
    for (const xpath of candidates) {
      const count = validateXPath(xpath);
      if (count === 1) return xpath;
    }

    return candidates[0] || null;
  }

  // ---------------------------------------------------------------------------
  // Fingerprint: Text-based XPath (//button[contains(text(),"Submit")])
  // ---------------------------------------------------------------------------
  function generateTextXPath(element) {
    const tag = element.tagName.toLowerCase();
    const text = (element.textContent || '').trim();

    // Only use direct text content (not deep descendants' text)
    const directText = Array.from(element.childNodes)
      .filter((n) => n.nodeType === Node.TEXT_NODE)
      .map((n) => n.textContent.trim())
      .filter(Boolean)
      .join(' ')
      .trim();

    const source = directText || text;
    if (!source || source.length > 80) return null;

    // Escape quotes for XPath
    const escaped = source.includes('"')
      ? `concat("${source.replace(/"/g, '",\'"\',"')}")`
      : `"${source}"`;

    // Use normalize-space + contains for resilience against whitespace changes
    if (source.length <= 40) {
      return `//${tag}[normalize-space(text())=${escaped}]`;
    }

    // For longer text, use contains with first 40 chars
    const snippet = source.slice(0, 40);
    const snippetEscaped = snippet.includes('"')
      ? `concat("${snippet.replace(/"/g, '",\'"\',"')}")`
      : `"${snippet}"`;

    return `//${tag}[contains(normalize-space(text()),${snippetEscaped})]`;
  }

  // ---------------------------------------------------------------------------
  // Fingerprint: Shortest unique CSS selector
  // ---------------------------------------------------------------------------
  function findShortestUniqueSelector(element) {
    const tag = element.tagName.toLowerCase();
    const candidates = [];

    // Try tag + id (already fast, but we want to find minimal)
    if (element.id) {
      candidates.push(`#${CSS.escape(element.id)}`);
    }

    // Try tag + single class
    for (const cls of element.classList) {
      candidates.push(`${tag}.${CSS.escape(cls)}`);
    }

    // Try tag + attribute selectors
    const attrKeys = ['data-testid', 'data-cy', 'data-test', 'data-qa', 'name', 'aria-label', 'placeholder', 'title'];
    for (const attr of attrKeys) {
      const val = element.getAttribute(attr);
      if (val) {
        candidates.push(`${tag}[${attr}="${CSS.escape(val)}"]`);
      }
    }

    // Try tag + two classes
    if (element.classList.length >= 2) {
      const classes = Array.from(element.classList).slice(0, 3);
      for (let i = 0; i < classes.length; i++) {
        for (let j = i + 1; j < classes.length; j++) {
          candidates.push(`${tag}.${CSS.escape(classes[i])}.${CSS.escape(classes[j])}`);
        }
      }
    }

    // Try with immediate parent qualifier
    const parent = element.parentElement;
    if (parent) {
      const parentTag = parent.tagName.toLowerCase();
      const parentQualifier = parent.id
        ? `#${CSS.escape(parent.id)}`
        : parent.classList.length
          ? `${parentTag}.${CSS.escape(parent.classList[0])}`
          : parentTag;

      candidates.push(`${parentQualifier} > ${tag}`);

      for (const cls of element.classList) {
        candidates.push(`${parentQualifier} > ${tag}.${CSS.escape(cls)}`);
      }
    }

    // Validate each: return the shortest one that matches exactly 1 element
    let best = null;

    for (const sel of candidates) {
      try {
        const matches = document.querySelectorAll(sel);
        if (matches.length === 1 && matches[0] === element) {
          if (!best || sel.length < best.length) {
            best = sel;
          }
        }
      } catch (_) {
        // Invalid selector, skip
      }
    }

    return best;
  }

  // ---------------------------------------------------------------------------
  // Uniqueness validation helpers
  // ---------------------------------------------------------------------------
  function validateCssSelector(selector) {
    try {
      return document.querySelectorAll(selector).length;
    } catch (_) {
      return -1; // Invalid selector
    }
  }

  function validateXPath(xpath) {
    try {
      const result = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
      return result.snapshotLength;
    } catch (_) {
      return -1; // Invalid XPath
    }
  }

  function validateUniqueness(candidates) {
    const verification = {};

    for (const candidate of candidates) {
      const val = candidate.value;
      const isXPath = val.startsWith('/') || val.startsWith('(');
      const count = isXPath ? validateXPath(val) : validateCssSelector(val);

      verification[val] = {
        unique: count === 1,
        matches: count,
      };
    }

    return verification;
  }

  // ---------------------------------------------------------------------------
  // Fingerprint: Main builder — combines all strategies with stability tiers
  // ---------------------------------------------------------------------------
  function buildElementFingerprint(element) {
    const cssPath = generateCssPath(element);
    const xpathAbsolute = generateXPathAbsolute(element);
    const xpathRelative = generateXPathRelative(element);
    const textXPath = generateTextXPath(element);
    const shortestUnique = findShortestUniqueSelector(element);

    // Collect all locators for verification
    const allLocators = [];

    if (shortestUnique) allLocators.push({ type: 'shortest-unique', value: shortestUnique, tier: 'stable' });
    if (xpathRelative) allLocators.push({ type: 'xpath-relative', value: xpathRelative, tier: 'stable' });
    if (textXPath) allLocators.push({ type: 'xpath-text', value: textXPath, tier: 'stable' });
    if (cssPath) allLocators.push({ type: 'css-path', value: cssPath, tier: 'positional' });
    if (xpathAbsolute) allLocators.push({ type: 'xpath-absolute', value: xpathAbsolute, tier: 'fragile' });

    // Run uniqueness verification on all locators
    const verification = validateUniqueness(allLocators);

    // Group by stability tier
    const stability = { stable: [], positional: [], fragile: [] };
    for (const loc of allLocators) {
      const v = verification[loc.value];
      if (v && v.unique) {
        stability[loc.tier].push(loc.value);
      }
    }

    return {
      cssPath,
      xpathAbsolute,
      xpathRelative: xpathRelative || null,
      shortestUnique: shortestUnique || null,
      textSelector: textXPath || null,
      stability,
      verification,
    };
  }

  // ---------------------------------------------------------------------------
  // Updated: buildSelectorPayload with fingerprint + missing strategies
  // ---------------------------------------------------------------------------
  function buildSelectorPayload(element) {
    const selector = getSelector(element);
    const attrs = Object.fromEntries(DOMScout.cleaner.getAllowedAttributes(element, { ...DOMScout.DEFAULTS, keepTestIds: true, stripNoise: false }));
    const text = getTextPreview(element);
    const ariaLabel = element.getAttribute('aria-label');
    const candidates = [];

    // Test IDs (highest stability)
    if (attrs['data-testid']) candidates.push({ type: 'testid', value: `[data-testid="${attrs['data-testid']}"]`, score: 100 });
    if (attrs['data-cy']) candidates.push({ type: 'data-cy', value: `[data-cy="${attrs['data-cy']}"]`, score: 98 });
    if (attrs['data-test']) candidates.push({ type: 'data-test', value: `[data-test="${attrs['data-test']}"]`, score: 97 });
    if (attrs['data-qa']) candidates.push({ type: 'data-qa', value: `[data-qa="${attrs['data-qa']}"]`, score: 96 });

    // Semantic identifiers
    if (attrs.id) candidates.push({ type: 'id', value: `#${CSS.escape(attrs.id)}`, score: 95 });
    if (attrs.name) candidates.push({ type: 'name', value: `${element.tagName.toLowerCase()}[name="${attrs.name}"]`, score: 88 });

    // Accessibility selectors
    if (ariaLabel) candidates.push({ type: 'aria-label', value: `${element.tagName.toLowerCase()}[aria-label="${ariaLabel}"]`, score: 80 });
    if (attrs.role && ariaLabel) {
      candidates.push({ type: 'role+aria-label', value: `${element.tagName.toLowerCase()}[role="${attrs.role}"][aria-label="${ariaLabel}"]`, score: 78 });
    } else if (attrs.role && text) {
      candidates.push({ type: 'role+text', value: `${element.tagName.toLowerCase()}[role="${attrs.role}"]`, score: 72 });
    }

    // Content / navigation
    if (attrs.href) candidates.push({ type: 'href', value: `${element.tagName.toLowerCase()}[href="${attrs.href}"]`, score: 70 });
    if (element.classList.length) candidates.push({ type: 'class-chain', value: selector, score: 60 });

    const ranked = candidates.sort((a, b) => b.score - a.score);

    // Build fingerprint
    const fingerprint = buildElementFingerprint(element);

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
      fingerprint,
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
    generateCssPath,
    generateXPathAbsolute,
    generateXPathRelative,
    generateTextXPath,
    findShortestUniqueSelector,
    buildElementFingerprint,
  };
})();
