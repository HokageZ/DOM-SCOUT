# DOM-SCOUT

DOM-SCOUT is a lightweight, high-performance browser extension designed to help developers and AI engineers capture clean, structured, and token-optimized DOM representations of webpage elements. It is built as a complete, high-fidelity alternative to taking webpage screenshots when working with LLMs or building browser automation scripts.

Rather than feeding heavy, context-blind visual images to AI models, DOM-SCOUT allows you to select exactly the element structures you need, customize the capture properties, and copy structured formats directly to your clipboard.

## Features

- **Interactive In-Page Selection**: An overlay outlines elements on hover and highlights them in green when selected.
- **Dynamic Selection Sticking**: The selection overlays dynamically track elements' bounding boxes on scroll and window resize.
- **Utility Dock**: Toggle picker mode, traverse element hierarchies (select parent container or first child node), and clear selections directly from the page.
- **Richer Custom Formats**:
  - **Clean HTML**: Strips tracking IDs, inline scripts, stylesheets, and frameworks' internal noise.
  - **Structure**: Generates a clean, tree-like text outline.
  - **HTML + CSS**: Serializes HTML along with full computed rules extracted from selected subtrees.
  - **Accessibility**: Audits semantic roles and ARIA states with warnings for missing alt text or unnamed buttons.
  - **Selectors**: Generates a ranked JSON selector map optimized for Playwright/Puppeteer automation.
  - **Page Snapshot**: Captures a page-wide interactive count and landmark tree map.
- **Prompt Wrapper**: Wrap serialized DOM instantly inside formatted templates for direct copy-paste into AI prompts.
- **Token Estimation & Warnings**: Real-time token character estimates to prevent exceeding AI agents' context windows.
- **Storage Persistence**: Settings (format, depth, token warning thresholds) are automatically saved to browser storage.

## Installation

1. Clone or download this repository.
2. Open Google Chrome (or any Chromium-based browser) and navigate to `chrome://extensions`.
3. Enable **Developer mode** in the top right corner.
4. Click **Load unpacked** in the top left corner.
5. Select the root folder of this project (`DOM-SCOUT`).

## Usage

1. Click the DOM-SCOUT icon in the browser toolbar or press `Ctrl + Shift + S` (`Cmd + Shift + S` on macOS).
2. The page dims into selection mode and the bottom utility dock slides up.
3. Hover over page elements to see their tags and dimensions, then click to add them to your selection stack.
4. Use the dock controls to traverse tags (`↑` or `↓`) or click the `+` icon to toggle picking mode.
5. In the right-hand panel, view the live output formatting, toggle options, and click **Copy to Clipboard** or **Copy AI Prompt** to extract the data.
6. Click `✕` in the top right corner of the panel or press `Escape` to close the overlay.
