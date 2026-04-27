import { icons } from "lucide-react";
import { z } from "zod";

export const Schema_Breadcrumb = z.object({
  label: z.string(),
  href: z.string().optional(),
});

export const Schema_File_Shortcut = z.object({
  shortcutDetails: z.object({
    targetId: z.string(),
    targetMimeType: z.string(),
  }),
});
export const Schema_File = z.object({
  mimeType: z.string(),
  encryptedId: z.string(),
  name: z.string(),
  trashed: z.boolean(),
  modifiedTime: z.string(),
  fileExtension: z.string().optional(),
  encryptedWebContentLink: z.string().optional().nullable(),
  size: z.coerce.number().optional(),
  thumbnailLink: z.string().url().optional().nullable(),
  imageMediaMetadata: z
    .object({
      width: z.coerce.number(),
      height: z.coerce.number(),
      rotation: z.coerce.number().optional(),
    })
    .optional()
    .nullable(),
  videoMediaMetadata: z
    .object({
      width: z.coerce.number(),
      height: z.coerce.number(),
      durationMillis: z.coerce.number(),
    })
    .optional()
    .nullable(),
});

const Schema_Config_API = z
  .object({
    rootFolder: z.string(),
    isTeamDrive: z.coerce.boolean(),
    sharedDrive: z.string().optional(),
    defaultQuery: z.array(z.string()),
    defaultField: z.string(),
    defaultOrder: z.string(),
    itemsPerPage: z.coerce.number().positive(),
    searchResult: z.coerce.number().positive(),
    proxyThumbnail: z.coerce.boolean(),
    streamMaxSize: z.coerce.number(),

    specialFile: z.object({
      password: z.string(),
      readme: z.string(),
      banner: z.string(),
    }),
    hiddenFiles: z.array(z.string()),

    allowDownloadProtectedFile: z.coerce.boolean(),
    temporaryTokenDuration: z.coerce.number().positive(),
    maxFileSize: z.coerce.number(),
  })
  .refine(
    (data) => {
      if (data.isTeamDrive === true && !data.sharedDrive) return false;
      return true;
    },
    { message: "sharedDrive is required when isTeamDrive is true" },
  );

export const Schema_Config_Site = z.object({
  siteName: z.string(),
  siteNameTemplate: z.string().optional().default("%s"),
  siteDescription: z.string(),
  siteIcon: z.string(),
  siteAuthor: z.string().optional().default("mbaharip"),
  favIcon: z.string(),
  robots: z.string().optional().default("noindex, nofollow"),
  twitterHandle: z.string().optional().default("@__mbaharip__"),

  showFileExtension: z.coerce.boolean().optional().default(false),

  footer: z
    .array(
      z.object({
        value: z.string(),
      }),
    )
    .default([]),
  experimental_pageLoadTime: z
    .literal(false)
    .or(z.enum(["s", "ms"]))
    .default("ms"),

  privateIndex: z.coerce.boolean().optional().default(false),
  breadcrumbMax: z.coerce.number(),

  toaster: z
    .object({
      position: z.enum(["top-left", "top-right", "bottom-left", "bottom-right"]),
      duration: z.coerce.number().positive(),
    })
    .optional()
    .default({
      position: "top-right",
      duration: 5000,
    }),

  navbarItems: z.array(
    z.object({
      icon: z.enum(Object.keys(icons) as [keyof typeof icons]),
      name: z.string(),
      href: z.string(),
      external: z.coerce.boolean().optional().default(false),
    }),
  ),
  supports: z.array(
    z.object({
      name: z.string(),
      currency: z.string(),
      href: z.string(),
    }),
  ),

  previewSettings: z.object({
    manga: z.object({
      maxSize: z.coerce.number().positive(),
      maxItem: z.coerce.number().positive(),
    }),
  }),
});

export const Schema_Config = z.object({
  version: z.string(),
  basePath: z.string(),
  cacheControl: z.string(),

  apiConfig: Schema_Config_API,

  siteConfig: Schema_Config_Site,
});

export const Schema_ServiceAccount = z.object({
  type: z.literal("service_account"),
  project_id: z.string(),
  private_key_id: z.string(),
  private_key: z.string(),
  client_email: z.string().email("Invalid client_email field"),
  client_id: z.string(),
  auth_uri: z.string().url(),
  token_uri: z.string().url(),
  auth_provider_x509_cert_url: z.string().url(),
  client_x509_cert_url: z.string().url(),
  universe_domain: z.string().optional(),
});

export const Schema_FileToken = z.object({
  id: z.string(),
  exp: z.number(),
  iat: z.number(),
});
