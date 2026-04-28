"use server";

import { z } from "zod";
import { type ActionResponseSchema } from "~/types";

import { encryptionService, gdrive, gdriveNoCache } from "~/lib/utils.server";

import { Schema_File, Schema_File_Shortcut, Schema_FileToken } from "~/types/schema";

import config from "config";

// ============================================================================
// Zod Validation Schemas for Action Inputs
// ============================================================================

const ListFilesInputSchema = z.object({
  id: z.string().optional(),
  pageToken: z.string().optional(),
});

const GetFileInputSchema = z.string({ required_error: "File ID is required" });

const GetReadmeInputSchema = z.string().optional().nullable();

const GetBannerInputSchema = z.string().optional().nullable();

const GetContentInputSchema = z.string({ required_error: "File ID is required" });

const GetSiblingsMediaInputSchema = z.array(z.string()).min(1, "At least one path is required");

const SearchFilesInputSchema = z.object({
  query: z.string().min(1, "Search query is required"),
});

const GetSearchResultPathInputSchema = z.string({ required_error: "File ID is required" });

// ============================================================================
// Helper: Build common drive request options
// ============================================================================

async function getSharedDriveOptions() {
  const isSharedDrive = !!(config.apiConfig.isTeamDrive && config.apiConfig.sharedDrive);
  if (!isSharedDrive) return {};

  const decryptedSharedDrive = await encryptionService.decrypt(config.apiConfig.sharedDrive!);
  return {
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    driveId: decryptedSharedDrive,
    corpora: "drive",
  };
}

async function getDecryptedSharedDrive(): Promise<string | undefined> {
  const isSharedDrive = !!(config.apiConfig.isTeamDrive && config.apiConfig.sharedDrive);
  return isSharedDrive ? encryptionService.decrypt(config.apiConfig.sharedDrive!) : undefined;
}

// ============================================================================
// File Mapping Helper
// ============================================================================

async function mapDriveFileToFileSchema(file: any) {
  return {
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
}

// ============================================================================
// Actions
// ============================================================================

export async function ListFiles(
  input: z.infer<typeof ListFilesInputSchema>,
): Promise<
  ActionResponseSchema<{
    files: z.infer<typeof Schema_File>[];
    nextPageToken?: string | null;
  }>
> {
  const validationResult = ListFilesInputSchema.safeParse(input);
  if (!validationResult.success) {
    return {
      success: false,
      message: "Invalid input for ListFiles",
      error: validationResult.error.message,
    };
  }

  const { id, pageToken } = validationResult.data;
  const decryptedId = await encryptionService.decrypt(id ?? config.apiConfig.rootFolder);
  const sharedDriveOpts = await getSharedDriveOptions();

  const filterName = config.apiConfig.hiddenFiles
    .map((item) => `not name = '${item}'`)
    .join(" and ");
  const filterQuery: string = [
    ...config.apiConfig.defaultQuery,
    `'${decryptedId}' in parents`,
    filterName,
  ].join(" and ");

  const data = await gdrive.files.list({
    q: filterQuery,
    fields: `files(${config.apiConfig.defaultField}), nextPageToken`,
    orderBy: config.apiConfig.defaultOrder,
    pageSize: config.apiConfig.itemsPerPage,
    pageToken: pageToken,
    ...sharedDriveOpts,
  });

  if (!data.files?.length)
    return {
      success: true,
      message: "No files found",
      data: {
        files: [],
        nextPageToken: data.nextPageToken,
      },
    };

  const files: z.infer<typeof Schema_File>[] = [];
  for (const file of data.files) {
    files.push(await mapDriveFileToFileSchema(file));
  }

  const parsed = Schema_File.array().safeParse(files);
  if (!parsed.success)
    return {
      success: false,
      message: "Failed to parse files",
      error: parsed.error.message,
    };

  return {
    success: true,
    message: "Files found",
    data: {
      files: parsed.data,
      nextPageToken: data.nextPageToken,
    },
  };
}

export async function GetFile(
  input: z.infer<typeof GetFileInputSchema>,
): Promise<ActionResponseSchema<z.infer<typeof Schema_File> | null>> {
  const validationResult = GetFileInputSchema.safeParse(input);
  if (!validationResult.success) {
    return {
      success: false,
      message: "Invalid input for GetFile",
      error: validationResult.error.message,
    };
  }

  const decryptedId = await encryptionService.decrypt(validationResult.data ?? config.apiConfig.rootFolder);

  const data = await gdrive.files.get(decryptedId, {
    fields: config.apiConfig.defaultField,
    supportsAllDrives: config.apiConfig.isTeamDrive,
  });

  if (!data.id)
    return {
      success: false,
      message: "File not found",
      error: "NotFound",
    };

  const file: z.infer<typeof Schema_File> = await mapDriveFileToFileSchema(data);

  const parsed = Schema_File.safeParse(file);
  if (!parsed.success)
    return {
      success: false,
      message: "Failed to parse file",
      error: parsed.error.message,
    };

  return {
    success: true,
    message: "File found",
    data: parsed.data,
  };
}

export async function GetReadme(
  input: z.infer<typeof GetReadmeInputSchema> = null,
): Promise<
  ActionResponseSchema<{
    type: "markdown" | "txt";
    content: string;
  } | null>
> {
  const validationResult = GetReadmeInputSchema.safeParse(input);
  if (!validationResult.success) {
    return {
      success: false,
      message: "Invalid input for GetReadme",
      error: validationResult.error.message,
    };
  }

  const decryptedId = await encryptionService.decrypt(
    validationResult.data ?? config.apiConfig.rootFolder,
  );
  const sharedDriveOpts = await getSharedDriveOptions();

  const filterQuery: string = [
    "trashed = false",
    "(not mimeType contains 'folder')",
    `name = '${config.apiConfig.specialFile.readme}'`,
    `'${decryptedId}' in parents`,
  ].join(" and ");

  const data = await gdrive.files.list({
    q: filterQuery,
    fields: `files(${config.apiConfig.defaultField}, parents), nextPageToken`,
    orderBy: config.apiConfig.defaultOrder,
    pageSize: config.apiConfig.itemsPerPage,
    pageToken: undefined,
    ...sharedDriveOpts,
  });

  if (!data.files?.length)
    return {
      success: true,
      message: "No README found",
      data: null,
    };

  let file;
  if (data.files.length === 1) {
    file = data.files[0];
  } else {
    file = data.files.find((file: any) => file.mimeType === "text/markdown");
    file ??= data.files.find(
      (file: any) => file.mimeType === "application/vnd.google-apps.shortcut",
    );
  }

  if (!file)
    return {
      success: true,
      message: "No README found",
      data: null,
    };

  switch (file.mimeType) {
    case "application/vnd.google-apps.shortcut": {
      const shortcutData = await gdrive.files.getShortcutDetails(file.id!);
      const parsedData = Schema_File_Shortcut.safeParse(shortcutData);
      if (!parsedData.success)
        return {
          success: false,
          message: "Failed to parse shortcut data",
          error: parsedData.error.message,
        };

      if (
        !parsedData.data.shortcutDetails.targetId ||
        (parsedData.data.shortcutDetails.targetMimeType !== "text/markdown" &&
          parsedData.data.shortcutDetails.targetMimeType !== "text/plain")
      )
        return {
          success: true,
          message: "Shortcut target is not a markdown file or plain text",
          data: null,
        };

      const shortcutContent = await gdrive.files.getContent(
        parsedData.data.shortcutDetails.targetId,
        {
          supportsAllDrives: config.apiConfig.isTeamDrive,
        },
      );

      return {
        success: true,
        message: "README found",
        data: {
          type:
            parsedData.data.shortcutDetails.targetMimeType === "text/markdown"
              ? "markdown"
              : "txt",
          content: shortcutContent,
        },
      };
    }
    case "text/markdown":
    case "text/plain": {
      const content = await gdrive.files.getContent(file.id!, {
        supportsAllDrives: config.apiConfig.isTeamDrive,
      });
      return {
        success: true,
        message: "README found",
        data: {
          type: file.mimeType === "text/markdown" ? "markdown" : "txt",
          content: content,
        },
      };
    }
    default:
      return {
        success: true,
        message: "No README found",
        data: null,
      };
  }
}

export async function GetBanner(
  input: z.infer<typeof GetBannerInputSchema> = null,
): Promise<ActionResponseSchema<string | null>> {
  const validationResult = GetBannerInputSchema.safeParse(input);
  if (!validationResult.success) {
    return {
      success: false,
      message: "Invalid input for GetBanner",
      error: validationResult.error.message,
    };
  }

  const decryptedId = await encryptionService.decrypt(
    validationResult.data ?? config.apiConfig.rootFolder,
  );
  const sharedDriveOpts = await getSharedDriveOptions();

  const filterQuery: string = [
    ...config.apiConfig.defaultQuery,
    `name contains '${config.apiConfig.specialFile.banner}'`,
    `'${decryptedId}' in parents`,
  ].join(" and ");

  const data = await gdrive.files.list({
    q: filterQuery,
    fields: `files(${config.apiConfig.defaultField},parents)`,
    orderBy: config.apiConfig.defaultOrder,
    pageSize: config.apiConfig.itemsPerPage,
    pageToken: undefined,
    ...sharedDriveOpts,
  });

  if (!data.files?.length)
    return {
      success: true,
      message: "No banner found",
      data: null,
    };

  const encryptedId = await encryptionService.encrypt(data.files[0]?.id ?? "");
  return {
    success: true,
    message: "Banner found",
    data: encryptedId,
  };
}

export async function GetContent(
  input: z.infer<typeof GetContentInputSchema>,
): Promise<ActionResponseSchema<string>> {
  const validationResult = GetContentInputSchema.safeParse(input);
  if (!validationResult.success) {
    return {
      success: false,
      message: "Invalid input for GetContent",
      error: validationResult.error.message,
    };
  }

  const decryptedId = await encryptionService.decrypt(validationResult.data);

  const content = await gdrive.files.getContent(decryptedId, {
    supportsAllDrives: config.apiConfig.isTeamDrive,
  });

  return {
    success: true,
    message: "Content found",
    data: content,
  };
}

export async function GetSiblingsMedia(
  input: z.infer<typeof GetSiblingsMediaInputSchema>,
): Promise<ActionResponseSchema<z.infer<typeof Schema_File>[]>> {
  const validationResult = GetSiblingsMediaInputSchema.safeParse(input);
  if (!validationResult.success) {
    return {
      success: false,
      message: "Invalid input for GetSiblingsMedia",
      error: validationResult.error.message,
    };
  }

  const pathIds = await ValidatePaths(validationResult.data);
  if (!pathIds.success)
    return {
      success: false,
      message: "Failed to validate paths",
      error: pathIds.error,
    };

  const folderPaths = pathIds.data.filter(
    (item) => item.mimeType === "application/vnd.google-apps.folder",
  );

  const parentId = folderPaths[folderPaths.length - 1]?.id ?? config.apiConfig.rootFolder;
  const decryptedParentId = await encryptionService.decrypt(parentId);
  const sharedDriveOpts = await getSharedDriveOptions();

  const filterName = config.apiConfig.hiddenFiles
    .map((item) => `not name = '${item}'`)
    .join(" and ");
  const filterQuery: string = [
    ...config.apiConfig.defaultQuery,
    `'${decryptedParentId}' in parents`,
    filterName,
    "(mimeType contains 'video' or mimeType contains 'audio')",
  ].join(" and ");

  const data = await gdrive.files.list({
    q: filterQuery,
    fields: `files(${config.apiConfig.defaultField})`,
    orderBy: config.apiConfig.defaultOrder,
    pageSize: 100,
    ...sharedDriveOpts,
  });

  if (!data.files?.length)
    return { success: true, message: "No siblings media found", data: [] };

  const files: z.infer<typeof Schema_File>[] = [];
  for (const file of data.files) {
    files.push(await mapDriveFileToFileSchema(file));
  }

  const parsed = Schema_File.array().safeParse(files);
  if (!parsed.success)
    return {
      success: false,
      message: "Failed to parse siblings media",
      error: parsed.error.message,
    };

  return {
    success: true,
    message: "Siblings media fetched",
    data: parsed.data,
  };
}

export async function SearchFiles(
  input: z.infer<typeof SearchFilesInputSchema>,
): Promise<ActionResponseSchema<z.infer<typeof Schema_File>[]>> {
  const validationResult = SearchFilesInputSchema.safeParse(input);
  if (!validationResult.success) {
    return {
      success: false,
      message: "Invalid input for SearchFiles",
      error: validationResult.error.message,
    };
  }

  const { query } = validationResult.data;
  const sharedDriveOpts = await getSharedDriveOptions();

  const filterName = config.apiConfig.hiddenFiles
    .map((item) => `not name = '${item}'`)
    .join(" and ");
  const filterQuery: string = [
    ...config.apiConfig.defaultQuery,
    `name contains '${query}'`,
    filterName,
  ].join(" and ");

  const data = await gdrive.files.list({
    q: filterQuery,
    fields: `files(${config.apiConfig.defaultField})`,
    orderBy: "name_natural desc",
    pageSize: config.apiConfig.searchResult,
    ...sharedDriveOpts,
  });

  if (!data.files?.length)
    return {
      success: true,
      message: "No files found",
      data: [],
    };

  const files: z.infer<typeof Schema_File>[] = [];
  for (const file of data.files) {
    files.push(await mapDriveFileToFileSchema(file));
  }

  const parsed = Schema_File.array().safeParse(files);
  if (!parsed.success)
    return {
      success: false,
      message: "Failed to parse search results",
      error: parsed.error.message,
    };

  return {
    success: true,
    message: "Search completed",
    data: parsed.data,
  };
}

export async function GetSearchResultPath(
  input: z.infer<typeof GetSearchResultPathInputSchema>,
): Promise<ActionResponseSchema<string>> {
  const validationResult = GetSearchResultPathInputSchema.safeParse(input);
  if (!validationResult.success) {
    return {
      success: false,
      message: "Invalid input for GetSearchResultPath",
      error: validationResult.error.message,
    };
  }

  const decryptedId = await encryptionService.decrypt(
    validationResult.data ?? config.apiConfig.rootFolder,
  );

  const data = await gdrive.files.get(decryptedId, {
    fields: "id,name,parents",
    supportsAllDrives: config.apiConfig.isTeamDrive,
  });

  if (!data) {
    return {
      success: false,
      message: "Failed to get file information",
      error: "Failed to get file information, might be due to invalid file ID!",
    };
  }

  const filePath = await GetFilePaths(data.name!, data.parents?.[0]);
  if (!filePath.success)
    return {
      success: false,
      message: "Failed to get file path",
      error: filePath.error,
    };

  return {
    success: true,
    message: "File path found",
    data: filePath.data,
  };
}

// Re-export path validation helper (originally from paths.ts)
export async function ValidatePaths(
  paths: string[],
): Promise<ActionResponseSchema<{ id: string; path: string; mimeType: string }[]>> {
  const isSharedDrive = !!(config.apiConfig.isTeamDrive && config.apiConfig.sharedDrive);
  const decryptedRootId = await encryptionService.decrypt(config.apiConfig.rootFolder);
  const decryptedSharedDrive = isSharedDrive
    ? await encryptionService.decrypt(config.apiConfig.sharedDrive!)
    : undefined;

  const promises: Promise<PathFetch | null>[] = [];
  for (const [index, path] of paths.entries()) {
    const list = gdrive.files
      .list({
        q: `name = '${decodeURIComponent(path)}' and trashed = false`,
        fields: "files(id, name, mimeType, parents)",
        ...(decryptedSharedDrive && {
          supportsAllDrives: true,
          includeItemsFromAllDrives: true,
          driveId: decryptedSharedDrive,
          corpora: "drive",
        }),
      })
      .then((data) => {
        if (!data.files?.length) return null;

        const object: PathFetch = {
          index,
          path,
          data: data.files.map((file: any) => ({
            id: file.id!,
            parents: file.parents?.[0],
            mimeType: file.mimeType!,
          })),
        };
        return object;
      });
    promises.push(list);
  }

  const pathData = await Promise.all(promises);

  const invalidPathIndex = pathData.findIndex((path) => !path);
  if (invalidPathIndex !== -1)
    return {
      success: false,
      message: "Invalid path",
      error: `Failed to find path: ${paths[invalidPathIndex]}`,
    };

  const filteredPathData = pathData.filter((path) => path) as PathFetch[];

  let isValid = true;
  let invalidPath: string | undefined;
  const validatedPaths: PathFetch[] = [];

  for (const path of filteredPathData) {
    if (!isValid) break;
    if (!path.data.length) {
      isValid = false;
      invalidPath = path.path;
      break;
    }

    for (const item of path.data) {
      if (path.index === 0) {
        if (item.parents !== decryptedRootId && item.parents !== decryptedSharedDrive) break;
        validatedPaths.push(path);
      } else {
        const previousPath = validatedPaths[path.index - 1];
        if (!previousPath) break;
        if (item.parents !== previousPath.data?.[0]?.id) break;
        validatedPaths.push(path);
      }
    }
  }

  if (validatedPaths.length !== filteredPathData.length) {
    isValid = false;
    invalidPath = filteredPathData[validatedPaths.length]?.path;
  }

  if (!isValid)
    return {
      success: false,
      message: "Invalid path",
      error: invalidPath ? `Failed to validate path: ${invalidPath}` : "Failed when validating paths",
    };

  const response: { path: string; id: string; mimeType: string }[] = [];
  for (const item of validatedPaths) {
    response.push({
      id: await encryptionService.encrypt(item.data[0]?.id ?? ""),
      path: decodeURIComponent(item.path),
      mimeType: item.data[0]?.mimeType ?? "",
    });
  }

  return {
    success: true,
    message: "Paths validated",
    data: response,
  };
}

// Re-export path fetching helper (originally from paths.ts)
export async function GetFilePaths(
  fileName: string,
  parentId?: string,
): Promise<ActionResponseSchema<string>> {
  const decryptedRootId = await encryptionService.decrypt(config.apiConfig.rootFolder);
  if (!decryptedRootId)
    return {
      success: false,
      message: "Failed to decrypt root folder ID",
      error: "Failed to decrypt root folder ID",
    };

  const paths: string[] = [fileName];
  let parentIdTemp = parentId;
  while (parentIdTemp) {
    if (parentIdTemp === decryptedRootId) break;

    const data = await gdrive.files.get(parentIdTemp, {
      fields: "id,name,parents",
      supportsAllDrives: config.apiConfig.isTeamDrive,
    });
    if (!data.name) break;

    paths.unshift(data.name);
    parentIdTemp = data.parents?.[0];
  }

  return { success: true, message: "File paths retrieved", data: paths.join("/") };
}

// Type for internal use
type PathFetch = {
  index: number;
  path: string;
  data: {
    id: string;
    parents?: string;
    mimeType: string;
  }[];
};

// ============================================================================
// Token Actions (originally from token.ts)
// ============================================================================

const CreateFileTokenInputSchema = z.object({
  encryptedId: z.string(),
  expiredIn: z.number().positive().optional(),
});

const ValidateFileTokenInputSchema = z.string({ required_error: "Token is required" });

export async function CreateFileToken(
  input: z.infer<typeof CreateFileTokenInputSchema>,
): Promise<ActionResponseSchema<string>> {
  const validationResult = CreateFileTokenInputSchema.safeParse(input);
  if (!validationResult.success) {
    return {
      success: false,
      message: "Invalid input for CreateFileToken",
      error: validationResult.error.message,
    };
  }

  const { encryptedId, expiredIn } = validationResult.data;

  const tokenObject = {
    id: encryptedId,
    exp: Date.now() + (expiredIn ?? 3600 * 1000 * 30), // Default 30 hours
    iat: Date.now(),
  };

  const parsedTokenObject = Schema_FileToken.safeParse(tokenObject);
  if (!parsedTokenObject.success)
    return {
      success: false,
      message: "Failed to create token",
      error: parsedTokenObject.error.message,
    };

  const token = await encryptionService.encrypt(JSON.stringify(parsedTokenObject.data));

  return {
    success: true,
    message: "Token created",
    data: token,
  };
}

export async function ValidateFileToken(
  input: z.infer<typeof ValidateFileTokenInputSchema>,
): Promise<ActionResponseSchema<z.infer<typeof Schema_FileToken>>> {
  const validationResult = ValidateFileTokenInputSchema.safeParse(input);
  if (!validationResult.success) {
    return {
      success: false,
      message: "Invalid input for ValidateFileToken",
      error: validationResult.error.message,
    };
  }

  const decryptedToken = await encryptionService.decrypt(validationResult.data);

  let parsedToken;
  try {
    parsedToken = Schema_FileToken.safeParse(JSON.parse(decryptedToken));
  } catch (e) {
    return {
      success: false,
      message: "Failed to validate token",
      error: "Invalid token format",
    };
  }

  if (!parsedToken.success)
    return {
      success: false,
      message: "Failed to validate token",
      error: parsedToken.error.message,
    };

  const currentTime = Date.now();
  if (parsedToken.data.exp < currentTime)
    return {
      success: false,
      message: "Token expired",
      error: "Download URL expired",
    };

  return {
    success: true,
    message: "Token validated",
    data: parsedToken.data,
  };
}

