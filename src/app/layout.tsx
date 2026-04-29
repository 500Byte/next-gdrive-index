import { type Metadata } from "next";
import { headers } from "next/headers";

import { DashboardLayout } from "~/components/layout";
import { Provider } from "~/components/layout";
import { Password } from "~/components/layout";

import { CheckIndexPassword } from "~/actions/password";
import { type ActionResponseSchema } from "~/types";

import "~/styles/globals.css";
import config from "config";

import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";

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
      <body className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased`}>
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
