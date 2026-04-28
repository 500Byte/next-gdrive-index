import { type z } from "zod";
import { BASE_URL, IS_DEV } from "~/constant";

import { type Schema_Config } from "~/types/schema";

// Load site config from JSON file (public, non-sensitive config)
// In production/Cloudflare Workers, site.config.json is bundled via the build system
// In development, we use dynamic import
let siteConfig: Record<string, any> = {};

async function loadSiteConfig() {
  if (IS_DEV) {
    try {
      if (typeof window !== "undefined" && (window as any).__SITE_CONFIG__) {
        siteConfig = (window as any).__SITE_CONFIG__;
      } else {
        // Dynamic import for Node.js/development
        const { default: config } = await import("../../site.config.json");
        siteConfig = config;
      }
    } catch {
      siteConfig = {};
    }
  } else {
    // Production/Cloudflare Workers - site.config.json should be bundled
    try {
      const { default: config } = await import("../../site.config.json");
      siteConfig = config;
    } catch {
      siteConfig = {};
    }
  }
}

// Get environment variable helper for Cloudflare Workers
export function getEnvVar(name: string): string | undefined {
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

// Mutable config that gets populated after initConfig() completes
let config: z.input<typeof Schema_Config> = {
  version: "2.4.2",
  cacheControl: "public, max-age=60, s-maxage=60, stale-while-revalidate",
  basePath: "",
  apiConfig: {
    rootFolder: "",
    isTeamDrive: false,
    sharedDrive: "",
    defaultQuery: ["trashed = false"],
    defaultField: "id, name, mimeType",
    defaultOrder: "folder, name asc",
    itemsPerPage: 50,
    searchResult: 5,
    proxyThumbnail: true,
    streamMaxSize: 100 * 1024 * 1024,
    specialFile: { password: ".password", readme: ".readme.md", banner: ".banner" },
    hiddenFiles: [".password", ".readme.md", ".banner"],
    allowDownloadProtectedFile: false,
    temporaryTokenDuration: 1,
    maxFileSize: 4 * 1024 * 1024,
  },
  siteConfig: {
    siteName: "next-gdrive-index",
    siteNameTemplate: "%s - %t",
    siteDescription: "A simple file browser for Google Drive",
    siteIcon: "/logo.svg",
    siteAuthor: "mbaharip",
    favIcon: "/favicon.png",
    robots: "noindex, nofollow",
    twitterHandle: "@mbaharip_",
    showFileExtension: true,
    footer: [{ value: "{{ poweredBy }}" }],
    experimental_pageLoadTime: false,
    privateIndex: false,
    breadcrumbMax: 3,
    toaster: { position: "bottom-right", duration: 5000 },
    navbarItems: [],
    supports: [],
    previewSettings: { manga: { maxSize: 15 * 1024 * 1024, maxItem: 10 } },
  },
};

export async function initConfig() {
  await loadSiteConfig();

  // Build config from multiple sources
  config = {
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
      defaultQuery: siteConfig.apiConfig?.defaultQuery ?? [
        "trashed = false",
        "(not mimeType contains 'google-apps' or mimeType contains 'folder')",
      ],
      defaultField:
        siteConfig.apiConfig?.defaultField ??
        "id, name, mimeType, thumbnailLink, fileExtension, modifiedTime, size, imageMediaMetadata, videoMediaMetadata, webContentLink, trashed",
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
      hiddenFiles: siteConfig.apiConfig?.hiddenFiles ?? [
        ".password",
        ".readme.md",
        ".banner",
        ".banner.jpg",
        ".banner.png",
        ".banner.webp",
      ],
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
}

export default config;
