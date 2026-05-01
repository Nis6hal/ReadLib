# 📚 ReadLib

A modern, local-first book & PDF management app. Organize your reading library, track progress, and read PDFs — all from your browser with zero cloud dependency.

> **Live Demo:** Deploy your own instance on Vercel, or run locally with `npm run dev`.

---

## ✨ Features

| Feature | Description |
|---|---|
| **Local Folder Scanning** | Point ReadLib at any local folder and it auto-discovers all PDF files using the [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API). |
| **PDF Reader** | Built-in PDF viewer powered by [PDF.js](https://mozilla.github.io/pdf.js/) with page navigation, zoom controls, and progress tracking. |
| **Auto Metadata Extraction** | Automatically extracts title, author, and page count from PDF metadata. |
| **Cover Thumbnails** | Generates cover images by rendering the first page of each PDF to a canvas. |
| **Reading Categories** | Organize books into **Planned**, **Reading**, and **Completed** categories. |
| **Search & Sort** | Filter by title/author and sort by title, date added, progress, or last read. |
| **Grid / List View** | Toggle between a visual card grid and a compact list layout. |
| **Inline Editing** | Edit book title, author, and category directly from the book card. |
| **Reading Progress** | Tracks your current page and saves progress per book automatically. |
| **Profile & Stats** | Dashboard with completion rate, category distribution charts, and reading rank. |
| **Dark / Light Theme** | Toggle between dark and light mode — preference is persisted. |
| **Toast Notifications** | Non-intrusive feedback for actions like rescanning, deleting, and editing. |
| **PWA Ready** | Includes a web manifest and service worker for installable app experience. |
| **100% Local** | All data lives in IndexedDB in your browser. Nothing is sent to a server. |

---

## 🛠 Tech Stack

- **React 19** — UI framework
- **Vite 8** — Build tool & dev server
- **React Router v7** — Client-side routing
- **PDF.js** — PDF rendering and metadata extraction
- **IndexedDB** (via [`idb`](https://github.com/nicedayfor/idb)) — Persistent local storage
- **Lucide React** — Icon library
- **Vanilla CSS** — Custom design system with glassmorphism, animations, and dark/light theming
- **Vercel** — Deployment target (optional)

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9
- A modern Chromium-based browser (Chrome, Edge, Brave) — required for the File System Access API

### Install & Run

```bash
# Clone the repo
git clone https://github.com/your-username/ReadLib.git
cd ReadLib

# Install dependencies
npm install

# Start the dev server
npm run dev
```

The app will be available at `http://localhost:5173`.

### Production Build

```bash
npm run build
npm run preview
```

The optimized output is written to the `dist/` directory.

---

## 📖 How It Works

### Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    Browser (Client)                  │
│                                                     │
│  ┌───────────┐   ┌──────────────┐   ┌────────────┐ │
│  │  React UI  │◄─►│ LibraryContext│◄─►│ IndexedDB  │ │
│  │  (Pages &  │   │  (State Mgr) │   │ (idb lib)  │ │
│  │Components) │   └──────┬───────┘   └────────────┘ │
│  └───────────┘          │                           │
│                   ┌─────┴──────┐                    │
│                   │  Services  │                    │
│                   │ ┌────────┐ │                    │
│                   │ │ db.js  │ │ ← CRUD operations  │
│                   │ ├────────┤ │                    │
│                   │ │metadata│ │ ← PDF.js metadata   │
│                   │ ├────────┤ │                    │
│                   │ │thumb-  │ │ ← Canvas rendering  │
│                   │ │nail.js │ │                    │
│                   │ └────────┘ │                    │
│                   └────────────┘                    │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │         File System Access API               │   │
│  │  (reads PDFs directly from local disk)       │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### Core Flow

#### 1. Selecting a Library Folder

When you click **"Select Folder"**, the app calls the browser's [`window.showDirectoryPicker()`](https://developer.mozilla.org/en-US/docs/Web/API/Window/showDirectoryPicker) API to get a `FileSystemDirectoryHandle`. This handle is persisted in IndexedDB so the app remembers your folder on reload (the browser will re-prompt for permission).

#### 2. Scanning for PDFs

The app iterates over the directory handle's entries (shallow scan) and identifies all `.pdf` files. For each new PDF:

1. A book record is created with a default title (derived from the filename), category set to `Planned`, and progress at `0%`.
2. The record is saved to IndexedDB.
3. A background enrichment pass runs to extract metadata and generate thumbnails.

```
Folder Selected
     │
     ▼
Iterate directory entries ──► Filter .pdf files
     │
     ▼
Create book record per PDF ──► Save to IndexedDB
     │
     ▼
Background enrichment:
  ├─ extractPdfMetadata() ──► title, author, pageCount
  └─ generateThumbnail()  ──► base64 JPEG cover image
     │
     ▼
Update IndexedDB + React state
```

#### 3. Metadata Extraction (`services/metadata.js`)

Uses PDF.js to load the document and read its embedded metadata dictionary:

- **Title** — cleaned and validated (skips UUIDs, file paths, and producer strings)
- **Author** — cleaned with the same heuristics
- **Page Count** — from `pdf.numPages`

The cleaning logic strips null bytes, control characters, and rejects strings that look like file paths or UUIDs.

#### 4. Thumbnail Generation (`services/thumbnail.js`)

Renders page 1 of each PDF onto an offscreen `<canvas>` element at a max width of 200px, then converts the result to a base64 JPEG data URL (70% quality). This image is stored directly in IndexedDB alongside the book metadata.

#### 5. Reading a PDF (`components/PdfViewer.jsx`)

When you open a book, the `PdfViewer` component:

1. Retrieves the `FileSystemFileHandle` from the book record.
2. Calls `fileHandle.getFile()` → `file.arrayBuffer()` to get the raw PDF data.
3. Loads it into PDF.js and renders pages to a canvas.
4. Tracks the current page and saves progress back to IndexedDB on navigation.

#### 6. Data Persistence (`services/db.js`)

All state is stored in an IndexedDB database called `ReadLibDB` with two object stores:

| Store | Key | Contents |
|---|---|---|
| `books` | `id` (filename) | Title, author, category, progress, cover (base64), fileHandle, timestamps |
| `settings` | string key | Theme preference, directory handle |

The `idb` library provides a Promise-based wrapper around the raw IndexedDB API.

#### 7. State Management (`context/LibraryContext.jsx`)

A single React Context (`LibraryContext`) holds the entire app state:

- **`books`** — array of all book records
- **`dirHandle`** — the selected directory handle
- **`theme`** — current theme (`dark` / `light`)
- **`stats`** — computed counts (total, planned, reading, completed)

All mutations (add, update, delete, scan) write to IndexedDB first, then update React state.

---

## 🗂 Project Structure

```
ReadLib/
├── public/
│   ├── favicon.svg          # App favicon
│   ├── icon-192.png         # PWA icon (192×192)
│   ├── icon-512.png         # PWA icon (512×512)
│   ├── manifest.json        # PWA web manifest
│   └── sw.js                # Service worker
├── src/
│   ├── components/
│   │   ├── BookCard.jsx     # Book card (grid & list modes, inline editing)
│   │   ├── PdfViewer.jsx    # Full PDF reader with navigation & zoom
│   │   ├── Sidebar.jsx      # Navigation sidebar
│   │   └── Toast.jsx        # Toast notification system
│   ├── context/
│   │   └── LibraryContext.jsx  # Global state provider
│   ├── pages/
│   │   ├── Home.jsx         # Dashboard with recent books & stats
│   │   ├── Library.jsx      # Full library view with search, sort, filter
│   │   ├── ContinueReading.jsx  # Books currently in progress
│   │   ├── Profile.jsx      # Reading stats & analytics
│   │   └── Settings.jsx     # Folder selection, theme, data management
│   ├── services/
│   │   ├── db.js            # IndexedDB CRUD operations
│   │   ├── metadata.js      # PDF metadata extraction
│   │   └── thumbnail.js     # PDF cover thumbnail generation
│   ├── App.jsx              # Root component with routing
│   ├── App.css              # App-level styles
│   ├── index.css            # Global design tokens & base styles
│   └── main.jsx             # React entry point
├── index.html               # HTML shell
├── vite.config.js           # Vite configuration
├── vercel.json              # Vercel SPA rewrite rules
└── package.json
```

---

## 🌐 Deployment

### Vercel (Recommended)

The project includes a `vercel.json` with SPA rewrites already configured.

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

Or connect your GitHub repo to [vercel.com](https://vercel.com) for automatic deployments on push.

### Other Platforms

Any static hosting platform works (Netlify, Cloudflare Pages, GitHub Pages). Just make sure to:

1. Run `npm run build` to generate the `dist/` folder.
2. Configure a catch-all rewrite rule to serve `index.html` for all routes (SPA routing).

---

## ⚠️ Browser Compatibility

ReadLib relies on the **File System Access API** for local folder scanning. This API is currently supported in:

- ✅ Chrome / Chromium 86+
- ✅ Edge 86+
- ✅ Opera 72+
- ❌ Firefox (not supported)
- ❌ Safari (not supported)

The PDF reader and all other features work across all modern browsers.

---

## 📄 License

MIT
