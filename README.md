# URL Ping Monitor Chrome Extension

A Chrome extension that allows you to monitor multiple URLs and get notified when they go offline.

## Features

- ✅ Add and manage multiple URLs to monitor
- ✅ Configurable ping interval (minimum 5 seconds)
- ✅ Real-time status updates (Online/Offline)
- ✅ Desktop notifications when URLs go offline
- ✅ Beautiful UI built with Tailwind CSS
- ✅ Last checked timestamp for each URL

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in the top right)
3. Click "Load unpacked"
4. Select the `pingExt` folder
5. The extension icon should appear in your Chrome toolbar

## Usage

1. Click the extension icon in your Chrome toolbar
2. Set your desired ping interval (in seconds)
3. Add URLs to monitor (must include http:// or https://)
4. The extension will automatically check URLs at the specified interval
5. You'll receive desktop notifications when a URL goes offline

## Icons Setup (Required)

**IMPORTANT:** You must generate icon files before loading the extension. Choose one method:

1. **Using the HTML generator (Recommended - No installation needed):**
   - Open `generate-icons.html` in your browser
   - Click the download buttons for each icon size
   - Save the files to the `icons/` folder as `icon16.png`, `icon48.png`, and `icon128.png`

2. **Using Python script:**
   - Install Pillow: `pip install Pillow`
   - Run: `python3 generate-icons.py`

3. **Using Node.js script:**
   - Install canvas: `npm install canvas`
   - Run: `node generate-icons.js`

4. **Manual creation:**
   - Create your own icons (16x16, 48x48, 128x128 pixels)
   - Save them as `icon16.png`, `icon48.png`, and `icon128.png` in the `icons/` folder

## Permissions

The extension requires the following permissions:
- **storage**: To save your URLs and settings
- **alarms**: To schedule periodic URL checks
- **notifications**: To alert you when URLs go offline

## Files

- `manifest.json` - Extension configuration
- `popup.html` - Main UI
- `popup.js` - UI logic and URL management
- `background.js` - Background service worker for URL monitoring
- `popup.css` - Additional styles

## Technologies

- Tailwind CSS (via CDN) - Styling
- Popper.js (via CDN) - Tooltip/popper functionality
- Chrome Extensions API - Extension functionality

