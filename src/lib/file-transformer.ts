import { type z } from "zod";
import { encryptionService } from "./utils.server";
import { Schema_File } from "~/types/schema";

export async function transformDriveFile(file: any): Promise<z.infer<typeof Schema_File>> {
  const transformed = {
    encryptedId: await encryptionService.encrypt(file.id!),
    encryptedWebContentLink: file.webContentLink
      ? await encryptionService.encrypt(file.webContentLink)
      : undefined,
    name: file.name!,
    mimeType: file.mimeType!,
    trashed: file.trashed ?? false,
    modifiedTime: new Date(file.modifiedTime!).toLocaleDateString(),
    fileExtension: file.fileExtension ?? undefined,
    size: file.size ? Number(file.size) : undefined,
    thumbnailLink: file.thumbnailLink ?? undefined,
    imageMediaMetadata: file.imageMediaMetadata
      ? {
          width: Number(file.imageMediaMetadata.width),
          height: Number(file.imageMediaMetadata.height),
          rotation: Number(file.imageMediaMetadata.rotation ?? 0),
        }
      : undefined,
    videoMediaMetadata: file.videoMediaMetadata
      ? {
          durationMillis: Number(file.videoMediaMetadata.durationMillis),
          height: Number(file.videoMediaMetadata.height),
          width: Number(file.videoMediaMetadata.width),
        }
      : undefined,
  };

  return transformed;
}

export async function transformDriveFiles(files: any[]): Promise<z.infer<typeof Schema_File>[]> {
  const transformed = [];
  for (const file of files) {
    transformed.push(await transformDriveFile(file));
  }
  return transformed;
}
