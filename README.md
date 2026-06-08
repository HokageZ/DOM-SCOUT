# DOM-SCOUT

DOM-SCOUT is a lightweight, zero-dependency browser extension that captures clean, structured, token-optimized DOM representations of webpage elements. Built for developers and AI engineers as a high-fidelity alternative to screenshots when working with LLMs or building browser automation scripts.

Select exactly the elements you need, get multiple resilient selectors and full element fingerprints, and copy structured output directly to your clipboard.

## Why Not Screenshots?

Screenshots are heavy, context-blind blobs. An AI model receiving a screenshot of a login form has no idea what the field names are, what selectors to use, or how the DOM is structured. DOM-SCOUT gives you the raw structure, clean HTML, accessibility info, and automation-ready selectors -- all in a fraction of the tokens a vision model would burn on the same image.

## Features

- **Interactive In-Page Selection** -- Hover to outline elements (blue dashed border), click to select (green solid border). Multi-select by default, click again to deselect.
- **Dynamic Position Tracking** -- Selection overlays stick to elements during scroll and window resize via `requestAnimationFrame`.
- **Utility Dock** -- Bottom toolbar with picker toggle, parent/child traversal, clear, and capture controls.
- **Floating Control Panel** -- Right-side glassmorphic panel with format picker, depth selector, option toggles, selection list, output preview, and copy buttons. Lives inside Shadow DOM so it never conflicts with host page styles.
- **Element Fingerprinting** -- Every selected element gets a full identity card with multiple redundant locator strategies, uniqueness verification against the live DOM, and stability tier classification. When one selector breaks after a site redesign, the others still work. See [Element Fingerprinting](#element-fingerprinting) below.

### Output Formats

| Format | What It Does |
|---|---|
| **Clean HTML** | Strips tracking attrs, inline scripts, framework noise. Keeps semantic structure. |
| **Structure** | Indented tree-view text outline (`tag#id.class "text preview"`). |
| **HTML + CSS** | Clean HTML plus full computed CSS rules extracted from the subtree. |
| **Accessibility** | Semantic roles, ARIA states, and warnings (missing alt, unnamed buttons). |
| **Selectors** | Ranked JSON selector map with fingerprint data -- optimized for Playwright, Puppeteer, and Selenium. |
| **Page Snapshot** | Page-wide summary: URL, title, landmarks, headings, interactive element counts. |

### Additional Capabilities

- **Prompt Wrapper** -- Wrap output in formatted templates for direct paste into AI prompts.
- **Token Estimation** -- Real-time approximate token count with configurable warning threshold.
- **Persistent Settings** -- Format, depth, and all options saved to `chrome.storage.local` automatically.

---

## Element Fingerprinting

The core idea: a site's layout changes, a class gets renamed, a wrapper div gets added -- your automation script breaks. DOM-SCOUT solves this by generating a **full identity card** for every selected element with multiple independent locator strategies ranked by resilience.

When you select an element and choose the **Selectors** format, the output includes a `fingerprint` object:

```json
{
  "fingerprint": {
    "cssPath": "html > body > div:nth-of-type(1) > main > form > button:nth-of-type(2)",
    "xpathAbsolute": "/html/body/div[1]/main/form/button[2]",
    "xpathRelative": "//button[@aria-label=\"Submit\"]",
    "shortestUnique": "button.submit-btn",
    "textSelector": "//button[normalize-space(text())=\"Submit\"]",
    "stability": {
      "stable": ["button.submit-btn", "//button[@aria-label=\"Submit\"]"],
      "positional": ["html > body > div:nth-of-type(1) > main > form > button:nth-of-type(2)"],
      "fragile": ["/html/body/div[1]/main/form/button[2]"]
    },
    "verification": {
      "button.submit-btn": { "unique": true, "matches": 1 },
      "//button[@aria-label=\"Submit\"]": { "unique": true, "matches": 1 },
      "//button[normalize-space(text())=\"Submit\"]": { "unique": false, "matches": 3 }
    }
  }
}
```

### Locator Strategies

| Strategy | Example | Resilience |
|---|---|---|
| **Shortest Unique CSS** | `button.submit-btn` | High -- validated unique against live DOM, minimal specificity |
| **XPath Relative** | `//button[@aria-label="Submit"]` | High -- attribute-based, survives structural changes |
| **XPath Text** | `//button[normalize-space(text())="Submit"]` | High -- content-based, survives class/attr renames |
| **Full CSS Path** | `html > body > div > main > button:nth-of-type(2)` | Medium -- positional, breaks on structural changes |
| **XPath Absolute** | `/html/body/div[1]/main/button[2]` | Low -- fragile, breaks on any DOM restructure |

### Stability Tiers

- **stable** -- Attribute or content-based selectors that survive structural DOM changes.
- **positional** -- CSS paths with `nth-of-type` that work as long as sibling order is preserved.
- **fragile** -- Absolute paths that break if any ancestor is added, removed, or reordered.

### Ranked Selectors (Priority Order)

The `rankedSelectors` array scores each candidate from highest to lowest priority:

| Score | Type | Condition |
|---|---|---|
| 100 | `data-testid` | Element has `data-testid` attribute |
| 98 | `data-cy` | Element has `data-cy` attribute |
| 97 | `data-test` | Element has `data-test` attribute |
| 96 | `data-qa` | Element has `data-qa` attribute |
| 95 | `id` | Element has `id` attribute |
| 88 | `name` | Element has `name` attribute |
| 80 | `aria-label` | Element has `aria-label` attribute |
| 78 | `role+aria-label` | Element has both `role` and `aria-label` |
| 72 | `role+text` | Element has `role` and visible text content |
| 70 | `href` | Element has `href` attribute |
| 60 | `class-chain` | Ancestor class chain (up to 5 levels) |

### Uniqueness Verification

Every fingerprint locator is validated against the live DOM at capture time:
- CSS selectors are checked via `document.querySelectorAll()`
- XPath expressions are checked via `document.evaluate()`
- Each gets a `unique: true/false` flag and a `matches` count

Non-unique selectors still appear in the output (they may become unique after a DOM change), but only verified-unique selectors are promoted into the stability tiers.

---

## Installation

### Prerequisites

- Google Chrome 116+, Microsoft Edge 116+, or any Chromium-based browser
- Developer mode enabled in the browser's extension settings

### Chrome

1. Clone or download this repository:
   ```
   git clone https://github.com/HokageZ/DOM-SCOUT.git
   ```
2. Open Chrome and navigate to `chrome://extensions`.
3. Enable **Developer mode** using the toggle in the top-right corner.
4. Click **Load unpacked** in the top-left corner.
5. Select the `DOM-SCOUT` folder (the one containing `manifest.json`).
6. The DOM-SCOUT icon appears in your toolbar. Pin it for quick access.

### Microsoft Edge

1. Clone or download this repository.
2. Navigate to `edge://extensions`.
3. Enable **Developer mode** using the toggle in the bottom-left sidebar.
4. Click **Load unpacked** in the top toolbar.
5. Select the `DOM-SCOUT` folder.

### After Installation

- If you had any tabs open before installing, **refresh those tabs** -- content scripts only auto-inject on new page loads.
- The extension cannot run on browser-internal pages (`chrome://`, `edge://`, `about:`, `chrome-extension://`).

---

## Usage

### Activating the Inspector

- **Click** the DOM-SCOUT icon in the browser toolbar, or
- **Press** `Ctrl + Shift + S` (Windows/Linux) / `Cmd + Shift + S` (macOS)

The page dims, the bottom utility dock slides up, and the right-side control panel appears.

### Selecting Elements

- **Hover** over any element to see its tag and dimensions outlined in blue.
- **Click** to add it to your selection stack (green highlight).
- **Click again** on a selected element to deselect it.
- Multiple elements can be selected at once -- no modifier key needed.

### Navigating the DOM

Use the dock buttons at the bottom of the page:

| Button | Action |
|---|---|
| **+** | Toggle picker mode on/off |
| **Parent** | Move selection to the parent container |
| **Child** | Move selection to the first child element |
| **Clear** | Remove all selections |
| **Capture** | Generate output for current selection |

### Choosing Output Format

In the right-side panel:

1. Select a format from the dropdown (Clean HTML, Structure, HTML+CSS, Accessibility, Selectors, Page Snapshot).
2. Set the depth: Element Only, One Level, or Full Subtree.
3. Toggle options: Include CSS, Strip Noise, Keep Test IDs, Include Hidden Elements, Prompt Wrapper.
4. The output preview updates in real time.

### Copying Output

- **Copy to Clipboard** -- Copies the raw formatted output.
- **Copy AI Prompt** -- Wraps the output in a prompt template, then copies.

### Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl + Shift + S` / `Cmd + Shift + S` | Toggle inspector on/off |
| `Escape` | Close the inspector overlay |

---

## Project Structure

```
DOM-SCOUT/
  manifest.json          # Manifest V3 configuration
  background/
    service-worker.js    # Extension lifecycle, injection, messaging
  content/
    highlighter.js       # Shadow DOM overlay, dock, panel UI
    inspector.js         # Click/hover handlers, selection state
    content.css          # Minimal reset styles
  lib/
    serializer.js        # DOM serialization, fingerprinting, selectors
    formatter.js         # Output format generators
    css-extractor.js     # Computed style extraction
    dom-cleaner.js       # Noise stripping, attribute filtering
    token-counter.js     # Token estimation
  shared/
    constants.js         # Message types, format enums, defaults
  icons/                 # Extension icons (16, 48, 128px)
```

## Contributing

1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/your-feature`).
3. Make small, focused commits.
4. Push and open a Pull Request.

No build system is required. The extension runs as plain JavaScript with no bundler or transpiler.

## License

MIT
