(function () {
  function formatHtmlCss(element, options) {
    const html = DOMScout.serializer.serializeElement(element, options);
    if (!options.includeCSS) {
      return html;
    }

    const styles = DOMScout.cssExtractor.renderStyleBlocks(element, options);
    return `${html}\n\n<style>\n${styles}\n</style>`;
  }

  function formatPageSnapshot(element) {
    const buttons = document.querySelectorAll('button, [role="button"]').length;
    const links = document.querySelectorAll('a[href]').length;
    const forms = document.querySelectorAll('form').length;
    const inputs = document.querySelectorAll('input, textarea, select').length;
    const imagesMissingAlt = Array.from(document.querySelectorAll('img')).filter((img) => !img.getAttribute('alt')).length;
    const headings = Array.from(document.querySelectorAll('h1, h2, h3'))
      .slice(0, 20)
      .map((heading) => `${heading.tagName.toLowerCase()} "${DOMScout.cleaner.cleanText(heading.textContent || '')}"`);

    const landmarks = Array.from(document.querySelectorAll('header, nav, main, section, aside, footer'))
      .slice(0, 25)
      .map((node) => DOMScout.serializer.getNodeSummary(node));

    return [
      `PAGE: ${location.href}`,
      `TITLE: ${document.title}`,
      `INTERACTIVE: ${buttons} buttons, ${links} links, ${forms} forms, ${inputs} inputs`,
      `A11Y: ${imagesMissingAlt} images missing alt text`,
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

    const raw = {
      [DOMScout.FORMATS.CLEAN_HTML]: DOMScout.serializer.serializeElement(element, options),
      [DOMScout.FORMATS.STRUCTURE]: DOMScout.serializer.buildStructure(element, options).join('\n'),
      [DOMScout.FORMATS.HTML_CSS]: formatHtmlCss(element, options),
      [DOMScout.FORMATS.ACCESSIBILITY]: DOMScout.serializer.buildAccessibilitySummary(element, options).join('\n'),
      [DOMScout.FORMATS.SELECTORS]: JSON.stringify(buildSelectorsDocument(element), null, 2),
      [DOMScout.FORMATS.PAGE_SNAPSHOT]: formatPageSnapshot(element),
    };

    return Object.fromEntries(
      Object.entries(raw).map(([key, value]) => {
        const finalized = DOMScout.serializer.finalizeOutput(value, element, options);
        return [key, finalized.value];
      })
    );
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
