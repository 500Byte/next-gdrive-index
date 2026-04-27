![banner](/public/og.webp)

<p align='center'>
	<a href='https://drive-demo.mbaharip.com' target='_blank'>Demo Site</a>
		·
	<a href='https://drive-demo.mbaharip.com/ngdi-internal/deploy' target='_blank'>Deploy Guide</a>
		·
	<a href='https://github.com/mbahArip/next-gdrive-index/wiki' target='_blank'>Documentation</a>
</p>

<p align='center'>
	<img src='https://img.shields.io/github/package-json/v/mbaharip/next-gdrive-index?label=Production' alt='Production version' />
	<img src='https://img.shields.io/github/package-json/v/mbaharip/next-gdrive-index/v2?label=Preview' alt='Dev version' />
	<img src='https://img.shields.io/github/license/mbaharip/next-gdrive-index' alt='License' />
	<img src='https://img.shields.io/badge/Next.js-15-black' alt='Next.js 15' />
</p>

## Quick Start

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/mbaharip/next-gdrive-index)

> [!IMPORTANT]
> Generate your configuration from your own deployment, not the demo site.
> If you experience `Failed to decrypt data` errors, regenerate your configuration.

## What is this?

`next-gdrive-index` is a modern Google Drive directory index that transforms your Google Drive into a browsable, searchable file sharing platform. It provides a clean, customizable interface for previewing and sharing files—images, videos, audio, documents, and even manga—without the clutter of Google Drive's native interface.

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
- **Site Configuration** — Edit `gIndex.config.ts` to customize:
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

3. **Vercel Account** (recommended for deployment)
   - Or any Node.js hosting platform

## Deployment

### One-Click Deploy

Click the Deploy button above, then:

1. **Configure Environment Variables** in Vercel:
   - `GD_SERVICE_B64` — Base64-encoded service account JSON
   - `ENCRYPTION_KEY` — Secret key for encryption (generate a secure random string)
   - `SITE_PASSWORD` — (Optional) Password for private mode

2. **Generate Configuration**:
   - Visit `/ngdi-internal/deploy` on your deployed site
   - Use the configurator to generate your `gIndex.config.ts`
   - Download and place in `src/config/`

### Manual Deployment

```bash
# Clone the repository
git clone https://github.com/mbaharip/next-gdrive-index.git
cd next-gdrive-index

# Install dependencies
npm install

# Add environment variables
cp .env.example .env
# Edit .env with your credentials

# Configure the application
# Edit src/config/gIndex.config.ts

# Build and start
npm run build
npm run start
```

## Configuration

### Environment Variables (`.env`)

```bash
# Base64-encoded service account JSON
GD_SERVICE_B64=

# Secret key for encryption (32+ random characters)
ENCRYPTION_KEY=

# Site password (optional, for private mode)
SITE_PASSWORD=

# Domain (optional, without protocol)
# NEXT_PUBLIC_DOMAIN=yourdomain.com
```

### Application Config (`gIndex.config.ts`)

Key configuration options:

| Option | Description | Default |
|--------|-------------|---------|
| `siteConfig.siteName` | Site display name | `next-gdrive-index` |
| `apiConfig.rootFolder` | Encrypted root folder ID | - |
| `apiConfig.isTeamDrive` | Enable for Shared Drives | `false` |
| `apiConfig.streamMaxSize` | Max preview file size (bytes) | `100MB` |
| `apiConfig.maxFileSize` | Max download via API (bytes) | `4MB` |
| `siteConfig.privateIndex` | Enable site-wide password | `false` |
| `siteConfig.showFileExtension` | Show file extensions | `true` |

See the [full configuration guide](https://drive-demo.mbaharip.com/ngdi-internal/deploy) for all options.

## Development

```bash
# Install dependencies
npm install

# Start development server (with Turbopack)
npm run dev:turbo

# Or standard development server
npm run dev

# Visit http://localhost:3000
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run dev:turbo` | Start with Turbopack (faster) |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |
| `npm run cli` | Run configuration CLI |

## Tech Stack

- **Framework:** [Next.js 15](https://nextjs.org/) (App Router)
- **UI Components:** [shadcn/ui](https://ui.shadcn.com/) + [Radix UI](https://www.radix-ui.com/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Media Playback:** [Vidstack](https://www.vidstack.io/)
- **Icons:** [Lucide React](https://lucide.dev/)
- **Theming:** [next-themes](https://github.com/pacocoursey/next-themes)
- **Form Handling:** [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/)
- **Virtualization:** [@tanstack/react-virtual](https://tanstack.com/virtual)

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
