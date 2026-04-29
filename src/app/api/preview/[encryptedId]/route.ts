import { type NextRequest, NextResponse } from "next/server";

import { encryptionService, gdriveNoCache } from "~/lib/utils.server";

import { GetFile } from "~/actions/drive";

import config from "config";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      encryptedId: string;
    }>;
  },
) {
  const { encryptedId } = await params;

  try {
    const decryptedId = await encryptionService.decrypt(encryptedId);
    const file = await GetFile(encryptedId);
    if (!file.success) {
      throw new Error(`[404] ${file.message}`, {
        cause: file.error,
      });
    }
    if (!file.data?.encryptedWebContentLink) {
      throw new Error("[500] No download link found", {
        cause: "No download link found",
      });
    }

    // Redirect to Google Drive direct download URL
    // This allows native video streaming with proper range request support
    const decryptedContentUrl = await encryptionService.decrypt(file.data.encryptedWebContentLink);
    const contentUrl = new URL(decryptedContentUrl);
    contentUrl.searchParams.set("confirm", "1");
    
    return new NextResponse(null, {
      status: 302,
      headers: {
        Location: contentUrl.toString(),
      },
    });
  } catch (error) {
    const e = error as Error;
    const message = e.message.replace(/\[.*\]/, "").trim();
    const statusMatch = /\[(\d{3})\]/.exec(e.message);
    const status = statusMatch ? Number(statusMatch[1]) : 500;

    return NextResponse.json(
      {
        scope: "api/preview",
        message,
        cause: e.cause ?? "Unknown",
      },
      {
        status: status,
      },
    );
  }
}
