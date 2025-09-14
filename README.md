# AI Photo Album Creator

Generate clean, print-ready photo album pages automatically. Upload images, let the AI analyze and classify the best layout per image, preview square pages, and export the final album as a PDF where only the designed pages are printed.

## Features

- Upload photos via drag & drop or file picker
- EXIF/metadata extraction (camera, lens, time, GPS) via `exifr`
- AI analysis using Google Generative AI (Gemini via `ai` SDK) to produce:
  - Short content summary, tags, objects
  - Layout recommendation: `single`, `twoColumns`, `twoRows`, or `grid2x2`
- Layout Preview view that renders square pages (30cm x 30cm equivalent)
  - Images are contained within the page and won’t overflow in print
  - Pairs/combines images for two-columns or two-rows layouts
- One-click “Export PDF” using the browser print dialog
  - Only the album pages print (headers/sidebars are hidden via print CSS)

## Stack

- Next.js 15 + React 19
- Tailwind CSS 4 (globals + utility classes)
- `ai` + `@ai-sdk/google` for model calls
- `exifr` for metadata
- Bun for package management and scripts

## Quick Start (Bun)

1. Install dependencies

```bash
bun install
```

2. Configure environment

Create `.env.local` in the project root:

```
GOOGLE_GENERATIVE_AI_API_KEY=YOUR_API_KEY
```

3. Run the dev server

```bash
bun dev
```

Open http://localhost:3000

## Usage

1. Upload your photos in the Gallery view (left sidebar > drag & drop or click select).
2. Click “Analyze” to run AI analysis for pending photos.
3. Switch to “Layout preview” to see automatically assembled square pages.
   - `single`: one image fills the page (no borders where possible)
   - `twoColumns`: two portrait-ish images side-by-side
   - `twoRows`: two landscape-ish images stacked vertically
   - `grid2x2`: four images in a 2x2 grid
4. Click “Export PDF” and in the browser print dialog choose “Save as PDF”.

Tips for best results in the print dialog:

- Enable “Background graphics” if available
- Disable headers/footers
- Ensure the preview shows only the album pages (header/sidebar should be hidden)

## Printing & Page Size

The app targets square pages sized to 30cm x 30cm using CSS `@page size: 300mm 300mm` in `src/app/globals.css`. Each page (`.page`) becomes a physical print page and is isolated for printing using `.print-root` visibility rules. Images are contained (`object-fit: contain`) to avoid overflow.

To adjust to a different album size, tweak:

- `@page { size: <W>mm <H>mm }` in `globals.css`
- `.page-inner { padding: <margin>mm }` for safe margins

## Project Structure

```
src/
  app/
    page.tsx            # Shell page with header (hidden on print)
    globals.css         # Tailwind + print rules (square pages)
  components/
    AlbumBuilder.tsx    # Upload + analyze + Gallery/Layout toggle
    AlbumLayoutPreview.tsx
                        # Renders square pages and handles Export (window.print)
  hooks/
    ai.ts               # Server action: EXIF + AI analysis (Gemini), layout field
    utils.ts            # getImageDimensions, bytesToReadable
```

## Configuration

- Env var: `GOOGLE_GENERATIVE_AI_API_KEY` (Gemini)
- Dependencies: `ai`, `@ai-sdk/google`, `zod`, `exifr`

Install (if missing):

```bash
bun add ai @ai-sdk/google zod exifr
```

## Roadmap

- Optional zoom suggestions from analysis (e.g., 1.5x, 2x)
- Optional crop suggestions per layout classification
- Interactive edits in the layout preview (edge drag sliders)
- Title pages and text-only pages generated from analysis
- Place names from GPS metadata

See `todo.md` for more ideas and notes.

## Troubleshooting

- I still see the app header in the PDF preview

  - Ensure you click “Export PDF” from the Layout preview view. The print CSS isolates `.print-root` so only pages render. If issues persist, try Chrome.

- Images overflow the printed page

  - The app enforces containment in print (`object-fit: contain`). Verify that the print dialog scaling is set to 100%.

- No layouts appear
  - Run “Analyze” first; the layout preview only considers analyzed items.

## License

This repository is provided as-is for personal projects and demonstrations.
