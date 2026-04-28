import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Simple mock that just adds/removes prefix
vi.mock("~/lib/utils.server", async () => {
  const actual = await vi.importActual<typeof import("~/lib/utils.server")>("~/lib/utils.server");
  return {
    ...actual,
    encryptionService: {
      encrypt: vi.fn().mockImplementation((val: string) => `enc_${val}`),
      decrypt: vi.fn().mockImplementation((val: string) => {
        if (val.startsWith("enc_")) return val.replace("enc_", "");
        throw new Error("Decryption failed");
      }),
    },
    gdrive: {
      files: {
        list: vi.fn(),
        get: vi.fn(),
        getContent: vi.fn(),
        getStream: vi.fn(),
        getShortcutDetails: vi.fn(),
      },
    },
    gdriveNoCache: {
      files: {
        list: vi.fn(),
        getContent: vi.fn(),
      },
    },
    GoogleDriveEdgeClient: actual.GoogleDriveEdgeClient,
  };
});

// Mock config
vi.mock("config", () => ({
  default: {
    apiConfig: {
      isTeamDrive: false,
      sharedDrive: undefined,
      defaultQuery: ["trashed = false"],
      defaultField: "id,name,mimeType",
      defaultOrder: "name",
      itemsPerPage: 50,
      searchResult: 20,
      proxyThumbnail: false,
      streamMaxSize: 1048576,
      specialFile: {
        password: ".password",
        readme: ".read.me.md",
        banner: ".banner",
      },
      hiddenFiles: [],
      allowDownloadProtectedFile: false,
      temporaryTokenDuration: 1,
      maxFileSize: 1048576,
      rootFolder: "enc_root123",
    },
    siteConfig: {
      privateIndex: false,
      breadcrumbMax: 3,
    },
  },
}));

// Import after mocks
const { gdrive, gdriveNoCache } = await import("~/lib/utils.server");
const {
  ListFiles,
  GetFile,
  GetReadme,
  GetBanner,
  GetContent,
  GetSiblingsMedia,
  SearchFiles,
  GetSearchResultPath,
  ValidatePaths,
  CreateFileToken,
  ValidateFileToken,
} = await import("~/actions/drive");

describe("Server Actions (drive.ts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================================================
  // ListFiles
  // ============================================================================
  describe("ListFiles", () => {
    it("should return files when successful", async () => {
      const mockFiles = [
        { id: "file1", name: "test.txt", mimeType: "text/plain" },
      ];
      (gdrive.files.list as any).mockResolvedValueOnce({
        files: mockFiles,
        nextPageToken: undefined,
      });

      const result = await ListFiles({});

      expect(result.success).toBe(true);
      expect(result.data?.files).toHaveLength(1);
      expect(result.data?.files[0].name).toBe("test.txt");
    });

    it("should return empty array when no files found", async () => {
      (gdrive.files.list as any).mockResolvedValueOnce({
        files: [],
      });

      const result = await ListFiles({});

      expect(result.success).toBe(true);
      expect(result.data?.files).toHaveLength(0);
    });

    it("should handle invalid input gracefully", async () => {
      // @ts-expect-error - Testing invalid input
      const result = await ListFiles(null as any);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Expected object");
    });
  });

  // ============================================================================
  // GetFile
  // ============================================================================
  describe("GetFile", () => {
    it("should return file data when found", async () => {
      const mockFile = {
        id: "file1",
        name: "test.txt",
        mimeType: "text/plain",
      };
      (gdrive.files.get as any).mockResolvedValueOnce(mockFile);

      const result = await GetFile("enc_file1");

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe("test.txt");
    });

    it("should return error when file not found", async () => {
      (gdrive.files.get as any).mockResolvedValueOnce({});

      const result = await GetFile("enc_invalid");

      expect(result.success).toBe(false);
      expect(result.error).toBe("NotFound");
    });

    it("should handle invalid input", async () => {
      // @ts-expect-error - Testing invalid input
      const result = await GetFile(123 as any);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Expected string");
    });
  });

  // ============================================================================
  // GetReadme
  // ============================================================================
  describe("GetReadme", () => {
    it("should return null when no readme found", async () => {
      (gdrive.files.list as any).mockResolvedValueOnce({
        files: [],
      });

      const result = await GetReadme();

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it("should return readme content when found", async () => {
      const mockReadme = {
        id: "readme1",
        name: ".readme.md",
        mimeType: "text/markdown",
      };
      (gdrive.files.list as any).mockResolvedValueOnce({
        files: [mockReadme],
      });
      (gdrive.files.getContent as any).mockResolvedValueOnce("# Hello World");

      const result = await GetReadme();

      expect(result.success).toBe(true);
      expect(result.data?.type).toBe("markdown");
      expect(result.data?.content).toBe("# Hello World");
    });
  });

  // ============================================================================
  // SearchFiles
  // ============================================================================
  describe("SearchFiles", () => {
    it("should return search results", async () => {
      const mockFiles = [
        { id: "file1", name: "search-result.txt", mimeType: "text/plain" },
      ];
      (gdrive.files.list as any).mockResolvedValueOnce({
        files: mockFiles,
      });

      const result = await SearchFiles({ query: "search" });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });

    it("should handle empty query", async () => {
      const result = await SearchFiles({ query: "" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("required");
    });
  });

  // ============================================================================
  // CreateFileToken & ValidateFileToken
  // ============================================================================
  describe("File Token Actions", () => {
    it("should create a file token", async () => {
      const result = await CreateFileToken({ encryptedId: "enc_file123" });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it("should validate a valid token", async () => {
      const createResult = await CreateFileToken({ encryptedId: "enc_file123" });
      expect(createResult.success).toBe(true);

      const validateResult = await ValidateFileToken(createResult.data!);

      expect(validateResult.success).toBe(true);
      expect(validateResult.data?.id).toBe("enc_file123");
    });

    it("should reject invalid token", async () => {
      const validateResult = await ValidateFileToken("enc_invalid");

      expect(validateResult.success).toBe(false);
    });
  });

  // ============================================================================
  // ValidatePaths - Basic test
  // ============================================================================
  describe("ValidatePaths", () => {
    it("should handle no paths found", async () => {
      (gdrive.files.list as any).mockResolvedValueOnce({
        files: [],
      });

      const result = await ValidatePaths(["invalid-folder"]);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to find path");
    });
  });
});
