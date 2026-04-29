import { type Metadata } from "next";
import { Outfit } from "next/font/google";
import { headers } from "next/headers";

import { DashboardLayout } from "~/components/layout";
import { Provider } from "~/components/layout";
import { Password } from "~/components/layout";

import { cn } from "~/lib/utils";
import { CheckIndexPassword } from "~/actions/password";
import { type ActionResponseSchema } from "~/types";

import "~/styles/globals.css";
import config from "config";

const outfit = Outfit({
  weight: ["300", "400", "600", "700"],
  subsets: ["latin", "latin-ext"],
  variable: "--font-outfit",
});

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: config.siteConfig.siteName,
    description: config.siteConfig.siteDescription,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const head = await headers();
  const pathname = head.get("X-Pathname") ?? "/";

  let unlocked: ActionResponseSchema = {
    success: true,
    message: "Index is public",
    data: undefined,
  };
  if (config.siteConfig.privateIndex) {
    unlocked = await CheckIndexPassword();
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn("font-sans", outfit.variable)}>
        <Provider>
          {config.siteConfig.privateIndex && !unlocked.success ? (
            <Password type="global" errorMessage={unlocked.error} />
          ) : (
            <DashboardLayout>{children}</DashboardLayout>
          )}
        </Provider>
      </body>
    </html>
  );
}
