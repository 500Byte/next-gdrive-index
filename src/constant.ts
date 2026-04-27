export const IS_DEV = process.env.NODE_ENV !== "production";

export const USE_CACHE = false;

export const BASE_URL = (() => {
  if (IS_DEV) return "http://localhost:3000";

  const deploymentEnvironment = [
    process.env.NEXT_PUBLIC_DOMAIN,
    process.env.NEXT_PUBLIC_VERCEL_URL,
    process.env.VERCEL_URL,
    process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.URL,
    process.env.DEPLOY_URL,
    process.env.CF_PAGES_URL,
    process.env.RAILWAY_PUBLIC_DOMAIN,
    process.env.RENDER_EXTERNAL_HOSTNAME,
  ].filter(Boolean);
  if (deploymentEnvironment.length > 0) return deploymentEnvironment[0]!;

  return "you-needs-to-set-the-domain.com";
})();

export const COOKIES_NAME = {
  indexPassword: "next-gdrive-index-password",
  folderPassword: "next-gdrive-index-folder-password",
  viewType: "next-gdrive-index-view-type",
} as const;
export const COOKIES_AGE = 60 * 60 * 24 * 365;
export const COOKIES_OPTIONS = {
  path: "/",
  secure: !IS_DEV,
  sameSite: "strict",
  httpOnly: true,
  maxAge: COOKIES_AGE * 1000,
} as const;

export const NO_LAYOUT_PATHS = [\/ngdi-internal\/embed\//g];
