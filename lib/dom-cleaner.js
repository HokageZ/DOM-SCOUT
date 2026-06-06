(function () {
  function shouldKeepAttribute(name, options) {
    if (DOMScout.KEEP_ATTRS.includes(name)) {
      return true;
    }

    if (!options.stripNoise) {
      return true;
    }

    if (name === 'data-testid' && options.keepTestIds) {
      return true;
    }

    return !DOMScout.NOISE_ATTRS.some((pattern) => pattern.test(name));
  }

  function isHidden(element) {
    if (!(element instanceof Element)) {
      return false;
    }

    const style = getComputedStyle(element);
    return style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0' || element.hidden || element.getAttribute('aria-hidden') === 'true';
  }

  function getAllowedAttributes(element, options) {
    return Array.from(element.attributes)
      .filter((attribute) => shouldKeepAttribute(attribute.name, options))
      .map((attribute) => [attribute.name, attribute.value]);
  }

  function cleanText(value) {
    return value.replace(/\s+/g, ' ').trim();
  }

  DOMScout.cleaner = {
    shouldKeepAttribute,
    isHidden,
    getAllowedAttributes,
    cleanText,
  };
})();
