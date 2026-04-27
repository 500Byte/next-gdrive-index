import { type z } from "zod";
import { BASE_URL, IS_DEV } from "~/constant";

import { type Schema_Config } from "~/types/schema";

// Load site config from JSON file (public, non-sensitive config)
// In development, read from filesystem. In production, import bundled file.
let siteConfig: Record<string, any> = {};

// Helper to safely use require
const safeRequire = (id: string): any => {
  if (typeof require !== "undefined") {
    try {
      return require(id);
    } catch {
      return undefined;
    }
  }
  return undefined;
};

if (IS_DEV) {
  try {
    const fs = safeRequire("fs") as { readFileSync: (path: string, encoding: string) => string };
    const path = safeRequire("path") as { join: (...args: string[]) => string };
    if (fs && path) {
      const configPath = path.join(process.cwd(), "site.config.json");
      const raw = fs.readFileSync(configPath, "utf-8");
      siteConfig = JSON.parse(raw) as Record<string, any>;
    }
  } catch {
    siteConfig = {};
  }
} else {
  // Production/Cloudflare Workers - site.config.json is bundled
  const imported = safeRequire("../../site.config.json") as Record<string, any>;
  if (imported) {
    siteConfig = imported;
  }
}

// Get environment variable helper for Cloudflare Workers
function getEnvVar(name: string): string | undefined {
  if (typeof process !== "undefined" && process.env && process.env[name]) {
    return process.env[name];
  }
  const env = (globalThis as any).env;
  if (env && env[name]) {
    return env[name];
  }
  if ((globalThis as any)[name]) {
    return (globalThis as any)[name];
  }
  return undefined;
}

// Build config from multiple sources
const config: z.input<typeof Schema_Config> = {
  // From site.config.json (public config)
  version: siteConfig.version || "2.4.2",
  cacheControl: siteConfig.cacheControl || "public, max-age=60, s-maxage=60, stale-while-revalidate",

  // basePath: from env or default
  basePath: IS_DEV ? "http://localhost:3000" : `https://${BASE_URL}`,

  apiConfig: {
    // From environment secrets (sensitive)
    rootFolder: getEnvVar("ROOT_FOLDER") ?? siteConfig.apiConfig?.rootFolder ?? "",
    isTeamDrive: siteConfig.apiConfig?.isTeamDrive ?? false,
    sharedDrive: getEnvVar("SHARED_DRIVE") ?? siteConfig.apiConfig?.sharedDrive ?? "",

    // From site.config.json (non-sensitive)
    defaultQuery: siteConfig.apiConfig?.defaultQuery ?? ["trashed = false", "(not mimeType contains 'google-apps' or mimeType contains 'folder')"],
    defaultField: siteConfig.apiConfig?.defaultField ?? "id, name, mimeType, thumbnailLink, fileExtension, modifiedTime, size, imageMediaMetadata, videoMediaMetadata, webContentLink, trashed",
    defaultOrder: siteConfig.apiConfig?.defaultOrder ?? "folder, name asc, modifiedTime desc",
    itemsPerPage: siteConfig.apiConfig?.itemsPerPage ?? 50,
    searchResult: siteConfig.apiConfig?.searchResult ?? 5,
    proxyThumbnail: siteConfig.apiConfig?.proxyThumbnail ?? true,
    streamMaxSize: siteConfig.apiConfig?.streamMaxSize ?? 100 * 1024 * 1024,
    specialFile: siteConfig.apiConfig?.specialFile ?? {
      password: ".password",
      readme: ".readme.md",
      banner: ".banner",
    },
    hiddenFiles: siteConfig.apiConfig?.hiddenFiles ?? [".password", ".readme.md", ".banner", ".banner.jpg", ".banner.png", ".banner.webp"],
    allowDownloadProtectedFile: siteConfig.apiConfig?.allowDownloadProtectedFile ?? false,
    temporaryTokenDuration: siteConfig.apiConfig?.temporaryTokenDuration ?? 1,
    maxFileSize: siteConfig.apiConfig?.maxFileSize ?? 4 * 1024 * 1024,
  },

  siteConfig: {
    // From site.config.json
    siteName: siteConfig.siteConfig?.siteName ?? "next-gdrive-index",
    siteNameTemplate: siteConfig.siteConfig?.siteNameTemplate ?? "%s - %t",
    siteDescription: siteConfig.siteConfig?.siteDescription ?? "A simple file browser for Google Drive",
    siteIcon: siteConfig.siteConfig?.siteIcon ?? "/logo.svg",
    siteAuthor: siteConfig.siteConfig?.siteAuthor ?? "mbaharip",
    favIcon: siteConfig.siteConfig?.favIcon ?? "/favicon.png",
    robots: siteConfig.siteConfig?.robots ?? "noindex, nofollow",
    twitterHandle: siteConfig.siteConfig?.twitterHandle ?? "@mbaharip_",
    showFileExtension: siteConfig.siteConfig?.showFileExtension ?? true,
    footer: siteConfig.siteConfig?.footer ?? [
      { value: "{{ poweredBy }}" },
      { value: "Made with ❤️ by [**{{ author }}**](https://github.com/mbaharip)" },
    ],
    experimental_pageLoadTime: siteConfig.siteConfig?.experimental_pageLoadTime ?? false,
    privateIndex: siteConfig.siteConfig?.privateIndex ?? false,
    breadcrumbMax: siteConfig.siteConfig?.breadcrumbMax ?? 3,
    toaster: siteConfig.siteConfig?.toaster ?? {
      position: "bottom-right",
      duration: 5000,
    },
    navbarItems: siteConfig.siteConfig?.navbarItems ?? [],
    supports: siteConfig.siteConfig?.supports ?? [],
    previewSettings: siteConfig.siteConfig?.previewSettings ?? {
      manga: {
        maxSize: 15 * 1024 * 1024,
        maxItem: 10,
      },
    },
  },
};

export default config;
