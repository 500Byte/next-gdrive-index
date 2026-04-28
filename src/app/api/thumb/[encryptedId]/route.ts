import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { encryptionService } from "~/lib/utils.server";

import config from "config";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{
    encryptedId: string;
  }>;
};

export async function GET(request: NextRequest, { params }: Props) {
  const { encryptedId } = await params;

  try {
    const searchParams = new URL(request.nextUrl).searchParams;
    const size = searchParams.get("size") ?? "512";
    const thumbnailUrlParam = searchParams.get("url");

    const referer = request.headers.get("Referer") ?? "";
    const host = request.headers.get("Host") ?? new URL(request.url).host;

    // Permitir requests sin referer (browsers sin referer, o requests directas)
    // Validar que el referer sea del mismo dominio que el request actual
    if (referer && !referer.includes(host)) {
      throw new Error("Invalid request");
    }

    const validSize = z.coerce.number().safeParse(size);
    if (!validSize.success) {
      throw new Error("Invalid size");
    }

    // Obtener la URL del thumbnail
    let thumbnailUrl: string | null = null;

    if (thumbnailUrlParam) {
      // Si se pasó la URL como parámetro, usar esa
      thumbnailUrl = decodeURIComponent(thumbnailUrlParam);
    } else {
      // Intentar decryptar el encryptedId para obtener fileId
      const decryptedId = await encryptionService.decrypt(encryptedId);
      // Por compatibilidad, intentar usar Google thumbnail API (puede no funcionar)
      thumbnailUrl = `https://drive.google.com/thumbnail?id=${decryptedId}&sz=w${size}`;
    }

    if (!thumbnailUrl) {
      return new NextResponse("No thumbnail available", { status: 404 });
    }

    if (!config.apiConfig.proxyThumbnail) {
      return NextResponse.redirect(thumbnailUrl);
    }

    const downloadThumb = await fetch(thumbnailUrl, {
      cache: "force-cache",
    });

    if (!downloadThumb.ok) {
      return new NextResponse("Thumbnail not found", { status: 404 });
    }

    const buffer = await downloadThumb.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Type": downloadThumb.headers.get("Content-Type") ?? "image/jpeg",
        "Content-Length": buffer.byteLength.toString(),
      },
    });
  } catch (error) {
    const e = error as Error;
    console.error(e.message);
    return NextResponse.json(
      {
        error: e.message,
      },
      {
        status: 500,
      },
    );
  }
}
