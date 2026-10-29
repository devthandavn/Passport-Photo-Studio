# Passport Photo Studio — Photo Editor & Print Sheet Maker

A browser-only photo editing and print layout web app. No backend or database is required.

## Features
- Upload an image from phone camera/gallery or computer; drag-and-drop on desktop.
- Rotate, flip, brightness, contrast, saturation, conservative sharpness, quick filters.
- Passport photo presets: 35×45 mm, 35×35 mm, 25×35 mm, 40×50 mm, plus custom dimensions.
- Sheet presets: A4, 4R, 5×7 inch, US Letter, or custom dimensions; portrait/landscape.
- Copies, margins, gaps, border width/colour, sheet background, fit/crop option and export DPI controls.
- Live sheet preview, PNG download, PDF download (jsPDF CDN), and print dialog.
- Photo processing stays in the browser; the PDF library is loaded from a CDN and therefore needs internet access.

## Run locally
Open `index.html` in a modern browser. For best results, serve the folder using a local static server, or deploy it to GitHub Pages.

## GitHub Pages
Upload `index.html`, `style.css`, `app.js`, and `README.md` to the repository root. Then:
Settings → Pages → Deploy from a branch → `main` → `/(root)` → Save.

## Print note
In the print dialog, select the intended paper size and **Actual size / 100%**. Disable “Fit to page” if it changes dimensions. Printer non-printable margins and driver scaling can affect the final output. Always test one sheet and measure before printing a batch.

## Privacy and limitations
Images are processed locally in the browser and are not uploaded to a server by this app. Avoid using it on untrusted/shared devices for sensitive photos. Enhancement tools are simple image adjustments, not AI restoration; perspective/edge correction is not included in this version.
