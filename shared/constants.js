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

DOMScoutGlobal.DOMScout = DOMScout;
