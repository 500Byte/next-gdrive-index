# AGENTS.md

## Project Overview

**next-gdrive-index** is a Next.js application that creates a file browser interface for Google Drive. It's designed to be deployed on Cloudflare Workers using the OpenNext adapter for edge-compatible serverless deployment.

### Key Technologies

- **Framework**: Next.js 15.1.11 with App Router
- **Deployment**: Cloudflare Workers via OpenNext
- **Authentication**: Google Drive API via Service Account (JWT)
- **Styling**: Tailwind CSS + shadcn/ui components
- **State**: React Server Components + Server Actions
- **Testing**: Vitest + Zod validation
- **Encryption**: Web Crypto API for data encryption
- **JWT Signing**: jose library for RSA signing

### Architecture

The application consists of:
- **Frontend**: Next.js pages with React Server Components
- **Server Actions**: Consolidated in `src/actions/drive.ts`
- **Google Drive Integration**: Direct REST API calls with JWT authentication via `GoogleDriveEdgeClient`
- **Storage**: Google Drive (via API) + optional R2 cache for OpenNext

## Setup Commands

### Initial Setup

```bash
# Install dependencies
npm install

# Copy environment template (create from scratch)
cp .env.example .env

# Generate required secrets
npm run setup  # Interactive wizard for service account and config
```

### Environment Variables

Create `.env` and `.dev.vars` with:

```bash
# Required - Base64 encoded Google Service Account JSON
GD_SERVICE_B64=<base64-encoded-service-account-json>

# Required - 32+ character encryption key
ENCRYPTION_KEY=<random-32-char-string>

# Optional - Site password for private mode
SITE_PASSWORD=<your-password>

# Required - Root folder ID (encrypted)
ROOT_FOLDER=<encrypted-folder-id>

# Optional - Shared drive ID (encrypted, for team drives)
SHARED_DRIVE=<encrypted-drive-id>

# Domain configuration
NEXT_PUBLIC_DOMAIN=your-domain.workers.dev
```

**IMPORTANT**: The `GD_SERVICE_B64` must be generated from the original service account JSON file without modifications. Any corruption of the base64 or JSON structure will cause authentication failures.

## Development Workflow

### Local Development

```bash
# Start Next.js dev server (Node.js mode)
npm run dev

# Test with Cloudflare Workers runtime (recommended)
npm run preview
# or manually:
npx opennextjs-cloudflare build
npx wrangler dev .open-next/worker.js --local --port 8787
```

### Building

```bash
# Standard Next.js build
npm run build

# Full Cloudflare Workers build
npm run build:cf
# or:
npx opennextjs-cloudflare build
```

Build output goes to `.open-next/` directory with:
- `worker.js` - Main worker bundle
- `assets/` - Static assets
- `server-functions/` - Server-side code

### Testing

```bash
# Run all tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- drive-client.test.ts
```

Test files are located in `tests/` directory:
- `drive-client.test.ts` - Tests for `GoogleDriveEdgeClient`
- `server-actions.test.ts` - Tests for server actions in `drive.ts`
- `encryption.test.ts` - Tests for `EncryptionService`

## Configuration

### site.config.json

Public configuration in `src/config/site.config.json`:

```json
{
  "version": "2.4.2",
  "cacheControl": "public, max-age=60, s-maxage=60, stale-while-revalidate",
  "apiConfig": {
    "isTeamDrive": false,
    "sharedDrive": "",
    "defaultQuery": ["trashed = false", "(not mimeType contains 'google-apps' or mimeType contains 'folder')"],
    "defaultField": "id, name, mimeType, thumbnailLink, fileExtension, modifiedTime, size...",
    "itemsPerPage": 50,
    "specialFile": {
      "password": ".password",
      "readme": ".readme.md",
      "banner": ".banner"
    }
  },
  "siteConfig": {
    "siteName": "next-gdrive-index",
    "siteDescription": "A simple file browser for Google Drive",
    "privateIndex": false,
    "footer": [...]
  }
}
```

### wrangler.jsonc

Cloudflare Workers configuration:

```jsonc
{
  "name": "next-gdrive-index",
  "main": ".open-next/worker.js",
  "compatibility_date": "2026-04-26",
  "compatibility_flags": ["nodejs_compat"],
  "vars": {
    // Environment variables injected at deploy time
    "NEXT_PUBLIC_DOMAIN": "...",
    "GD_SERVICE_B64": "...",
    "ENCRYPTION_KEY": "..."
  },
  "r2_buckets": [{
    "binding": "NEXT_INC_CACHE_R2_BUCKET",
    "bucket_name": "next-gdrive-index-opennext-cache"
  }]
}
```

### src/config/index.ts

Configuration loader that merges:
1. `site.config.json` (public, versioned)
2. Environment variables (sensitive, via `getEnvVar()`)
3. Default values

**Important**: Environment variables are NOT mapped to different names. Use the exact variable names in `vars` and `getEnvVar()` will find them in `process.env` or `globalThis.env`.

## Google Drive Authentication

### Service Account Setup

1. Create service account in Google Cloud Console
2. Download JSON key file
3. Share Google Drive folder with service account email
4. Encode to base64:

```bash
# IMPORTANT: Preserve exact JSON structure including newlines
base64 -w 0 service-account.json
```

### Private Key Handling

The service account private key is in PKCS#8 format. When stored in environment variables:

- **Newlines**: JSON contains actual `\n` characters (not escaped `\\n`)
- **Format**: Must remain as `-----BEGIN PRIVATE KEY-----` (not RSA PRIVATE KEY)
- **Encoding**: Base64 must decode to valid JSON with exact key content

**Verification**:
```bash
# Check if base64 decodes correctly
echo "$GD_SERVICE_B64" | base64 -d | jq '.private_key' | head -c 100

# Should show: "-----BEGIN PRIVATE KEY-----\nMIIE..."
# NOT: "-----BEGIN PRIVATE KEY-----\\nMIIE..."
```

### JWT Signing

The application uses `jose` library for JWT signing:

```typescript
import { SignJWT, importPKCS8 } from "jose";

// Private key is imported directly from PEM
const privateKey = await importPKCS8(normalizedPrivateKey, "RS256");

const jwt = await new SignJWT({
  iss: client_email,
  scope: "https://www.googleapis.com/auth/drive",
  aud: "https://oauth2.googleapis.com/token",
  iat: now,
  exp: now + 3600,
})
  .setProtectedHeader({ alg: "RS256", typ: "JWT" })
  .sign(privateKey);
```

## Common Issues and Solutions

### 1. GD_SERVICE_B64 Corruption

**Symptom**: `importPKCS8` fails with "Invalid PKCS8 input" or "DataError"

**Diagnosis**:
```bash
node scripts/diagnose-auth.mjs
```

**Solution**: Regenerate from original JSON:
```bash
# Use exact original service account JSON
node -e "
const fs = require('fs');
const json = fs.readFileSync('service-account.json', 'utf8');
const obj = JSON.parse(json);
const normalized = JSON.stringify(obj, null, 2);
const b64 = Buffer.from(normalized).toString('base64');
console.log(b64);
" > new_b64.txt

# Update all locations
sed -i "s|^GD_SERVICE_B64=.*|GD_SERVICE_B64=$(cat new_b64.txt)|" .env
sed -i "s|^GD_SERVICE_B64=.*|GD_SERVICE_B64=$(cat new_b64.txt)|" .dev.vars
# Update wrangler.jsonc vars section
```

### 2. Private Key Format Issues

**Symptom**: Authentication succeeds but Drive API returns 401

**Cause**: Private key has literal `\n` instead of actual newlines, or key format is wrong

**Solution**: Ensure JSON parsing preserves newlines:
```typescript
// In src/lib/utils.server.ts
const normalizedPk = privateKey.replace(/\\n/g, "\n");
```

### 3. Environment Variables Not Loading

**Symptom**: `getEnvVar()` returns undefined in production

**Causes**:
- Variable names don't match between wrangler.jsonc and code
- Using wrong secret name mapping (old code used SITE_PWD instead of SITE_PASSWORD)
- Not deployed with latest vars

**Solution**: Check `src/config/index.ts` - it uses exact names from `vars`:
```typescript
function getEnvVar(name: string): string | undefined {
  // No mapping - use exact name
  if (typeof process !== "undefined" && process.env && process.env[name]) {
    return process.env[name];
  }
  const env = (globalThis as any).env;
  if (env && env[name]) {
    return env[name];
  }
  return undefined;
}
```

### 4. ROOT_FOLDER Decryption Failure

**Symptom**: "Invalid hash format" error

**Cause**: ROOT_FOLDER was encrypted with a different ENCRYPTION_KEY

**Solution**: Re-encrypt folder ID with current key:
```bash
node scripts/decrypt-root.mjs  # Get original folder ID
# Then re-encrypt and update all locations
```

### 5. Build Failures

**Symptom**: Type errors or missing dependencies during build

**Solutions**:
```bash
# Clear build cache
rm -rf .next .open-next node_modules/.cache

# Rebuild from scratch
npm ci
npm run build:cf
```

## Testing

### Test Structure

Tests use **Vitest** (not Jest). Test files are in `tests/` directory:

- `drive-client.test.ts` - Unit tests for `GoogleDriveEdgeClient`
- `server-actions.test.ts` - Unit tests for server actions with Zod validation
- `encryption.test.ts` - Tests for encryption/decryption

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test
npm test -- drive-client.test.ts

# Watch mode (development)
npm run test:watch
```

### Writing Tests

Tests use Vitest with Zod mocks for validation:

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock modules
vi.mock("~/lib/utils.server", async () => {
  const actual = await vi.importActual("~/lib/utils.server");
  return {
    ...actual,
    encryptionService: {
      encrypt: vi.fn().mockImplementation((val) => `enc_${val}`),
      decrypt: vi.fn().mockImplementation((val) => val.replace("enc_", "")),
    },
  };
});
```

## Code Style

### File Organization

```
src/
├── actions/        # Server Actions (consolidated)
│   └── drive.ts     # All Drive-related server actions
├── app/           # Next.js App Router pages
├── components/    # React components
│   ├── explorer/  # File browser components
│   ├── layout/    # Layout components
│   ├── preview/   # File preview components
│   └── ui/        # shadcn/ui components
├── config/        # Configuration
├── lib/           # Utilities
│   └── utils.server.ts  # Server-only utilities (Drive, Encryption)
├── types/         # TypeScript types
└── styles/        # Global styles
```

### Naming Conventions

- **Files**: kebab-case.ts (except Next.js special files)
- **Components**: PascalCase.tsx
- **Functions**: camelCase
- **Constants**: UPPER_CASE for true constants
- **Environment variables**: UPPER_CASE with underscores

### Server Actions

All server actions are consolidated in `src/actions/drive.ts` with Zod validation:

```typescript
"use server";

import { z } from "zod";

const ListFilesInputSchema = z.object({
  id: z.string().optional(),
  pageToken: z.string().optional(),
});

export async function ListFiles(input: z.infer<typeof ListFilesInputSchema>) {
  const validationResult = ListFilesInputSchema.safeParse(input);
  if (!validationResult.success) {
    return {
      success: false,
      message: "Invalid input",
      error: validationResult.error.message,
    };
  }
  // Implementation...
}
```

### Import Patterns

```typescript
// Aliases configured in tsconfig.json
import { cn } from "~/lib/utils";
import config from "config";  // → src/config/index.ts
import { FileItem } from "~/components/explorer";
import { ListFiles, GetFile } from "~/actions/drive";
```

## Performance

### Caching Strategy

- **Static assets**: Cloudflare CDN cache
- **API responses**: `revalidate = 60` in page components
- **Drive API**: Token cached for 55 minutes (3600s - 300s buffer)
- **Images**: Thumbnails proxied through Cloudflare Images

### Bundle Size

Monitor bundle size with:
```bash
npm run build
# Check terminal output for First Load JS
```

## Linting & Formatting

### Available Scripts

```bash
# Run ESLint
npm run lint

# Fix ESLint errors
npm run lint:fix

# Check Prettier formatting
npm run format:check

# Format code with Prettier
npm run format
```

### Configuration

- **ESLint**: `.eslintrc.cjs` with Next.js and TypeScript rules
- **Prettier**: `.prettierrc.cjs` with import sorting and Tailwind CSS plugin

## Troubleshooting Guide

### Check Logs

```bash
# Local development
npx wrangler dev --local

# Production tail
npx wrangler tail --format pretty
```

### Debug Mode

Add to `src/lib/utils.server.ts`:
```typescript
console.log("[Debug] Value:", value);
```

### Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "Failed to parse service account" | GD_SERVICE_B64 corrupt | Regenerate from original JSON |
| "Invalid PKCS8 input" | Private key format wrong | Check newlines in private_key |
| "Invalid hash format" | ROOT_FOLDER encrypted with wrong key | Re-encrypt with current ENCRYPTION_KEY |
| "Cannot read properties of undefined" | env var missing | Check wrangler.jsonc vars |
| "Authentication error" | R2 bucket permissions | Check Cloudflare account/token |

## Additional Resources

- [OpenNext Cloudflare Documentation](https://opennext.js.org/cloudflare)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Google Drive API Documentation](https://developers.google.com/drive/api/guides/about-sdk)
- [jose Library Documentation](https://github.com/panva/jose)
- [Vitest Documentation](https://vitest.dev/)
- [Zod Documentation](https://zod.dev/)

---

**Last Updated**: 2026-04-27  
**Project Version**: 2.4.2
