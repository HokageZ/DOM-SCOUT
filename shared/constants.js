/**
 * DOM-SCOUT - Shared constants
 * Message types, config defaults, and noise attribute lists.
 */

const DOMScoutGlobal = typeof globalThis !== 'undefined' ? globalThis : self;
// eslint-disable-next-line no-var
var DOMScout = DOMScoutGlobal.DOMScout || {};

DOMScout.MSG = {
  // Content → Background → SidePanel
  ELEMENT_SELECTED:      'ds:element-selected',
  ELEMENT_DESELECTED:    'ds:element-deselected',
  SELECTION_CLEARED:     'ds:selection-cleared',
  SELECTION_UPDATED:     'ds:selection-updated',
  PAGE_SNAPSHOT:         'ds:page-snapshot',

  // SidePanel → Background → Content
  TOGGLE_INSPECTOR:      'ds:toggle-inspector',
  CLEAR_SELECTION:       'ds:clear-selection',
  SET_DEPTH:             'ds:set-depth',
  SET_FORMAT:            'ds:set-format',
  SET_SETTINGS:          'ds:set-settings',
  HIGHLIGHT_ELEMENT:     'ds:highlight-element',
  REMOVE_ELEMENT:        'ds:remove-element',
  REQUEST_SNAPSHOT:      'ds:request-snapshot',
  REQUEST_RESERIALIZE:   'ds:request-reserialize',
  OPEN_PANEL:            'ds:open-panel',
  PING:                  'ds:ping',

  // Background → Content
  INSPECTOR_STATE:       'ds:inspector-state',

  // Responses
  PONG:                  'ds:pong',
};

DOMScout.FORMATS = {
  CLEAN_HTML:        'clean-html',
  STRUCTURE:         'structure',
  HTML_CSS:          'html-css',
  ACCESSIBILITY:     'accessibility',
  SELECTORS:         'selectors',
  PAGE_SNAPSHOT:     'page-snapshot',
};

DOMScout.DEPTH = {
  ELEMENT_ONLY: 0,
  ONE_LEVEL:    1,
  FULL_SUBTREE: Infinity,
};

DOMScout.STORAGE_KEYS = {
  SETTINGS: 'dom-scout:settings',
};

// Attributes to strip during cleaning
DOMScout.NOISE_ATTRS = [
  // Analytics / tracking
  /^data-analytics/,
  /^data-track/,
  /^data-gtm/,
  /^data-ga/,
  /^data-segment/,
  /^data-heap/,
  /^data-amplitude/,
  /^data-hotjar/,
  /^data-cb/,
  /^data-optimizely/,
  /^data-abtesting/,
  // React / framework internals
  /^data-reactid/,
  /^data-react-checksum/,
  /^data-v-/,           // Vue scoped CSS
  /^_ngcontent/,         // Angular
  /^_nghost/,
  /^ng-/,
  // Misc noise
  /^data-n-head/,
  /^data-hid/,
  /^data-server-rendered/,
  /^jsaction/,
  /^jscontroller/,
  /^jsmodel/,
  /^jsname/,
  /^jsshadow/,
  /^jsslot/,
  /^bis_skin_checked/,
  /^data-bi-/,
  /^data-ux-/,
  /^data-aut/,
  /^data-testid/,       // Keep? Useful for automation. We'll make this toggleable.
];

// Attributes to always keep
DOMScout.KEEP_ATTRS = [
  'id', 'class', 'href', 'src', 'alt', 'title', 'type', 'name',
  'value', 'placeholder', 'action', 'method', 'target', 'rel',
  'role', 'aria-label', 'aria-labelledby', 'aria-describedby',
  'aria-hidden', 'aria-expanded', 'aria-controls', 'aria-haspopup',
  'aria-selected', 'aria-checked', 'aria-disabled', 'aria-live',
  'aria-atomic', 'aria-busy', 'aria-current', 'aria-invalid',
  'aria-required', 'aria-sort', 'aria-valuenow', 'aria-valuemin',
  'aria-valuemax', 'aria-valuetext',
  'for', 'tabindex', 'disabled', 'readonly', 'required', 'checked',
  'selected', 'multiple', 'maxlength', 'minlength', 'pattern',
  'min', 'max', 'step', 'autocomplete', 'autofocus',
  'contenteditable', 'draggable', 'spellcheck',
  'width', 'height', 'loading', 'decoding', 'fetchpriority',
  'colspan', 'rowspan', 'scope', 'headers',
  'open', 'download', 'sandbox', 'srcdoc',
  'data-testid', 'data-cy', 'data-test', 'data-qa',
];

// Tags to skip entirely during serialization
DOMScout.SKIP_TAGS = new Set([
  'script', 'noscript', 'style', 'link', 'meta',
  'svg',  // We'll summarize SVGs instead of dumping markup
  'iframe',
  'br',   // We'll handle line breaks contextually
]);

// Tags that are self-closing
DOMScout.VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

// Default settings
DOMScout.DEFAULTS = {
  format: DOMScout.FORMATS.CLEAN_HTML,
  depth: DOMScout.DEPTH.FULL_SUBTREE,
  includeContext: true,
  includeCSS: true,
  stripNoise: true,
  keepTestIds: true,
  truncationThreshold: 240,
  maxTokenWarning: 8000,
  includeHidden: false,
  selectorMode: 'balanced',
  promptWrapper: false,
};

// Format-aware AI prompt templates
// Each returns a function(meta) where meta = { url, title, elementCount, format, output }
DOMScout.PROMPT_TEMPLATES = {
  [DOMScout.FORMATS.CLEAN_HTML]: (meta) => [
    `Below is a cleaned DOM capture from the page "${meta.title}".`,
    `URL: ${meta.url}`,
    `Elements captured: ${meta.elementCount} | Format: Clean HTML`,
    '',
    'The HTML has been stripped of tracking attributes, framework internals, and inline scripts.',
    'Use this to understand the semantic structure, identify elements, or replicate the markup.',
    '',
    '```html',
    meta.output,
    '```',
  ].join('\n'),

  [DOMScout.FORMATS.STRUCTURE]: (meta) => [
    `Below is a structural tree outline of DOM elements from "${meta.title}".`,
    `URL: ${meta.url}`,
    `Elements captured: ${meta.elementCount} | Format: Structure`,
    '',
    'Each line shows: tag#id.classes "text preview". Indentation represents nesting depth.',
    'Use this to understand the component hierarchy and locate elements by their position in the tree.',
    '',
    '```',
    meta.output,
    '```',
  ].join('\n'),

  [DOMScout.FORMATS.HTML_CSS]: (meta) => [
    `Below is a DOM capture with extracted computed CSS from "${meta.title}".`,
    `URL: ${meta.url}`,
    `Elements captured: ${meta.elementCount} | Format: HTML + CSS`,
    '',
    'The output includes cleaned HTML followed by computed style rules for the selected subtree.',
    'Use this to replicate the visual appearance, debug layout issues, or extract design tokens.',
    '',
    meta.output,
  ].join('\n'),

  [DOMScout.FORMATS.ACCESSIBILITY]: (meta) => [
    `Below is an accessibility audit of DOM elements from "${meta.title}".`,
    `URL: ${meta.url}`,
    `Elements captured: ${meta.elementCount} | Format: Accessibility`,
    '',
    'Each line shows: [tag role aria-attrs] "accessible name" plus any warnings.',
    'Warnings include: missing-alt (images without alt text), unnamed-button (buttons without accessible names).',
    'Use this to evaluate WCAG compliance, fix a11y issues, or verify semantic roles.',
    '',
    '```',
    meta.output,
    '```',
  ].join('\n'),

  [DOMScout.FORMATS.SELECTORS]: (meta) => [
    `Below is a selector fingerprint map for DOM elements from "${meta.title}".`,
    `URL: ${meta.url}`,
    `Elements captured: ${meta.elementCount} | Format: Selectors`,
    '',
    'The JSON contains ranked CSS selectors, XPath expressions, and a fingerprint object.',
    'The fingerprint includes multiple locator strategies grouped by resilience:',
    '  - stable: attribute/content-based selectors that survive DOM restructures',
    '  - positional: CSS paths with nth-of-type that rely on sibling order',
    '  - fragile: absolute paths that break on any structural change',
    'Each selector has been verified for uniqueness against the live DOM.',
    'Use this to build resilient Playwright/Puppeteer/Selenium automation scripts.',
    '',
    '```json',
    meta.output,
    '```',
  ].join('\n'),

  [DOMScout.FORMATS.PAGE_SNAPSHOT]: (meta) => [
    `Below is a page-level snapshot of "${meta.title}".`,
    `URL: ${meta.url}`,
    `Format: Page Snapshot`,
    '',
    'This includes interactive element counts, landmark regions, heading hierarchy,',
    'and the currently selected element. Use this to understand the page structure',
    'at a glance before drilling into specific elements.',
    '',
    '```',
    meta.output,
    '```',
  ].join('\n'),
};

// Builds the prompt string for a given format and metadata
DOMScout.buildPrompt = function (meta) {
  const templateFn = DOMScout.PROMPT_TEMPLATES[meta.format];
  if (templateFn) {
    return templateFn(meta);
  }
  // Fallback for unknown formats
  return [
    `DOM capture from "${meta.title}"`,
    `URL: ${meta.url}`,
    `Elements: ${meta.elementCount} | Format: ${meta.format}`,
    '',
    meta.output,
  ].join('\n');
};

DOMScoutGlobal.DOMScout = DOMScout;
