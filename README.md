![banner](/public/og.webp)

<p align='center'>
	<a href='https://github.com/mbaharip/next-gdrive-index/wiki' target='_blank'>Documentation</a>
</p>

<p align='center'>
	<img src='https://img.shields.io/github/package-json/v/mbaharip/next-gdrive-index?label=Production' alt='Production version' />
	<img src='https://img.shields.io/github/license/mbaharip/next-gdrive-index' alt='License' />
	<img src='https://img.shields.io/badge/Next.js-15-black' alt='Next.js 15' />
	<img src='https://img.shields.io/badge/Cloudflare-Workers-F38020' alt='Cloudflare Workers' />
</p>

## ⚠️ Work In Progress - Cloudflare Workers Migration

This project is currently being migrated from Vercel to **Cloudflare Workers**. The deployment process and some features may change. Please refer to `AGENTS.md` for detailed technical documentation.

> [!IMPORTANT]
> The Vercel deployment button has been removed. Use Cloudflare Workers deployment instead.

## What is this?

`next-gdrive-index` is a modern Google Drive directory index that transforms your Google Drive into a browsable, searchable file sharing platform. It provides a clean, customizable interface for previewing and sharing files without the clutter of Google Drive's native interface.

**Heavily inspired by** [onedrive-vercel-index](https://github.com/spencerwooo/onedrive-vercel-index) by [SpencerWooo](https://github.com/spencerwooo).

## Features

### Security & Access Control
- **Private Index** — Protect the entire site with a password
- **Path Protection** — Secure specific folders or files with individual passwords
- **Encrypted Configuration** — Sensitive data stays secure

### File Preview
- **Images** — Direct preview with zoom support
- **Video & Audio** — Stream media files with custom player
- **Documents** — Preview PDF, code, markdown, and text files
- **Manga/CBZ** — Dedicated manga reader with page navigation
- **Configurable Limits** — Set maximum file sizes for preview and download

### User Experience
- **File Search** — Quick search by file or folder name
- **Light/Dark Mode** — Theme toggle with system preference detection
- **Responsive Design** — Works on desktop, tablet, and mobile
- **Fast Navigation** — Breadcrumbs, sorting, and virtual scrolling for large directories

### Customization
- **Theme System** — Built on shadcn/ui, fully customizable with CSS variables
- **Site Configuration** — Edit `site.config.json` to customize:
  - Site name, description, and metadata
  - Navigation items and social links
  - File size limits and preview settings
  - Footer content with template variables
- **Embed Support** — Embed media directly into your site
- **README Rendering** — Add `.readme.md` files to folders for context

## Prerequisites

Before deploying, you'll need:

1. **Google Service Account**
   - Create a service account in [Google Cloud Console](https://console.cloud.google.com)
   - Download the JSON key file
   - Share your target Google Drive folder with the service account email

2. **Node.js 18+** (for local development)
   - Check version: `node --version`

3. **Cloudflare Account** (for deployment)
   - Sign up at [cloudflare.com](https://cloudflare.com)

## Deployment

### Cloudflare Workers Deployment

```bash
# Clone the repository
git clone https://github.com/mbaharip/next-gdrive-index.git
cd next-gdrive-index

# Install dependencies
npm install

# Set up environment variables
npm run setup

# Build for Cloudflare Workers
npm run build:cf

# Deploy
npm run deploy
```

### Environment Variables

Create `.env` and `.dev.vars`:

```bash
# Base64-encoded service account JSON
GD_SERVICE_B64=

# Secret key for encryption (32+ random characters)
ENCRYPTION_KEY=

# Site password (optional, for private mode)
SITE_PASSWORD=

# Root folder ID (encrypted)
ROOT_FOLDER=

# Shared drive ID (optional, encrypted)
SHARED_DRIVE=

# Domain configuration
NEXT_PUBLIC_DOMAIN=your-domain.workers.dev
```

See `AGENTS.md` for detailed configuration instructions.

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Or test with Cloudflare Workers runtime
npm run preview

# Visit http://localhost:3000 or http://localhost:8787
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Next.js development server |
| `npm run preview` | Start Cloudflare Workers dev server |
| `npm run build` | Build for production (Node.js) |
| `npm run build:cf` | Build for Cloudflare Workers |
| `npm run deploy` | Deploy to Cloudflare Workers |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |
| `npm run setup` | Run configuration CLI |

## Tech Stack

- **Framework:** [Next.js 15](https://nextjs.org/) (App Router)
- **Deployment:** [Cloudflare Workers](https://workers.cloudflare.com/) via [OpenNext](https://opennext.js.org/cloudflare)
- **UI Components:** [shadcn/ui](https://ui.shadcn.com/) + [Radix UI](https://www.radix-ui.com/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Media Playback:** [Vidstack](https://www.vidstack.io/)
- **Icons:** [Lucide React](https://lucide.dev/)
- **Theming:** [next-themes](https://github.com/pacocoursey/next-themes)
- **Form Handling:** [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/)
- **Virtualization:** [@tanstack/react-virtual](https://tanstack.com/virtual)
- **JWT Signing:** [jose](https://github.com/panva/jose)

## Known Issues

### File Size Limit & Direct Download

When `maxFileSize` is enabled, large file downloads redirect to Google Drive. You must set file sharing to `Anyone with the link can view` on the root folder.

> [!WARNING]
> This exposes the file ID in URLs. While users can view files directly on Google Drive, they cannot browse the folder structure.

### Limited Format Support

- **Google Docs/Sheets/Slides** — Not supported (use export or alternative methods)
- **Shortcuts** — Not currently supported
- **TS Video Files** — Incorrect MIME type detection prevents preview

## Roadmap

- [ ] **Internationalization (i18n)** — Multi-language support for UI and docs
- [ ] **Multiple Drives** — Support multiple Google accounts or root folders
- [ ] **Authentication System** — User-based access for subscribers/members
- [ ] **Google Workspace Shortcuts** — Support for Drive shortcuts

## Contributing

Contributions are welcome! Here's how to get started:

1. Check [open issues](https://github.com/mbaharip/next-gdrive-index/issues) for bugs or feature requests
2. Fork the repository and create a feature branch from the latest version branch (not `main`)
3. Implement your changes with clear, concise commits
4. Submit a Pull Request with a description of your changes

Please ensure your code passes linting (`npm run lint`) and formatting checks (`npm run format:check`).

## Support & Donations

If you find this project useful, consider supporting its development:

- [PayPal (USD)](https://paypal.me/mbaharip)
- [Ko-fi (USD)](https://ko-fi.com/mbaharip)
- [Saweria (IDR)](https://saweria.co/mbaharip)

## License

This project is licensed under the **AGPL-3.0 License** — see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/mbaharip">mbaharip</a>
  ·
  <a href="https://github.com/mbaharip/next-gdrive-index">View on GitHub</a>
</p>
