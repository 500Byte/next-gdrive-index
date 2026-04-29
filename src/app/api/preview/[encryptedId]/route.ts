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

    // Opción 3B: Streaming proxy con CORS
    // Hacer fetch a Google Drive pasando el Range header
    const decryptedContentUrl = await encryptionService.decrypt(file.data.encryptedWebContentLink);
    const contentUrl = new URL(decryptedContentUrl);
    contentUrl.searchParams.set("confirm", "1");
    
    // Pasar el Range header del request original (para seek/scrubbing)
    const rangeHeader = request.headers.get("Range");
    const fetchHeaders: HeadersInit = {};
    if (rangeHeader) {
      fetchHeaders["Range"] = rangeHeader;
    }
    
    // Fetch desde el servidor
    const driveResponse = await fetch(contentUrl.toString(), {
      headers: fetchHeaders,
    });

    // Preparar headers con CORS
    const responseHeaders = new Headers();
    
    // Copiar headers relevantes de Drive
    const contentType = driveResponse.headers.get("Content-Type");
    const contentRange = driveResponse.headers.get("Content-Range");
    const acceptRanges = driveResponse.headers.get("Accept-Ranges");
    const contentLength = driveResponse.headers.get("Content-Length");
    
    if (contentType) responseHeaders.set("Content-Type", contentType);
    if (contentRange) responseHeaders.set("Content-Range", contentRange);
    if (acceptRanges) responseHeaders.set("Accept-Ranges", acceptRanges);
    if (contentLength) responseHeaders.set("Content-Length", contentLength);
    
    // Añadir CORS headers
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    responseHeaders.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    responseHeaders.set("Access-Control-Allow-Headers", "Range");
    
    // Response nativo (no NextResponse) para evitar interferencia de OpenNext
    return new Response(driveResponse.body, {
      status: driveResponse.status,
      headers: responseHeaders,
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
