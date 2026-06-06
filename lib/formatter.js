(function () {
  function formatHtmlCss(element, options) {
    const html = DOMScout.serializer.serializeElement(element, options);
    const styles = DOMScout.cssExtractor.extractRelevantStyles(element);
    return `${html}\n\n<style>\n${DOMScout.serializer.getSelector(element)} {\n  ${styles.join('\n  ')}\n}\n</style>`;
  }

  function formatPageSnapshot(element) {
    const headings = Array.from(document.querySelectorAll('h1, h2, h3'))
      .slice(0, 20)
      .map((heading) => `${heading.tagName.toLowerCase()} "${DOMScout.cleaner.cleanText(heading.textContent || '')}"`);

    const landmarks = Array.from(document.querySelectorAll('header, nav, main, section, aside, footer'))
      .slice(0, 25)
      .map((node) => DOMScout.serializer.getNodeSummary(node));

    return [
      `PAGE: ${location.href}`,
      `TITLE: ${document.title}`,
      '',
      'LANDMARKS:',
      ...landmarks.map((item) => `  ${item}`),
      '',
      'HEADINGS:',
      ...headings.map((item) => `  ${item}`),
      '',
      `CURRENT_SELECTION: ${DOMScout.serializer.getNodeSummary(element)}`,
    ].join('\n');
  }

  function formatAll(element, settings) {
    const options = {
      ...DOMScout.DEFAULTS,
      ...settings,
    };

    return {
      [DOMScout.FORMATS.CLEAN_HTML]: DOMScout.serializer.serializeElement(element, options),
      [DOMScout.FORMATS.STRUCTURE]: DOMScout.serializer.buildStructure(element, options).join('\n'),
      [DOMScout.FORMATS.HTML_CSS]: formatHtmlCss(element, options),
      [DOMScout.FORMATS.ACCESSIBILITY]: DOMScout.serializer.buildAccessibilitySummary(element, options).join('\n'),
      [DOMScout.FORMATS.SELECTORS]: JSON.stringify(buildSelectorsDocument(element), null, 2),
      [DOMScout.FORMATS.PAGE_SNAPSHOT]: formatPageSnapshot(element),
    };
  }

  function buildSelectorsDocument(element) {
    return {
      url: location.href,
      title: document.title,
      elements: [DOMScout.serializer.buildSelectorPayload(element)],
    };
  }

  DOMScout.formatter = {
    formatAll,
    formatPageSnapshot,
  };
})();
