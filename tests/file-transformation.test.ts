import { transformDriveFile } from "~/lib/file-transformer";
import { encryptionService } from "~/lib/utils.server";
import { Schema_File } from "~/types/schema";

vi.mock("~/lib/utils.server", () => ({
  encryptionService: {
    encrypt: vi.fn().mockImplementation((data) => Promise.resolve(`encrypted-${data}`)),
  },
}));

describe("transformDriveFile", () => {
  it("should transform Drive API file to Schema_File", async () => {
    const driveFile = {
      id: "file123",
      name: "test.pdf",
      mimeType: "application/pdf",
      trashed: false,
      modifiedTime: "2024-01-01T00:00:00.000Z",
      fileExtension: "pdf",
      size: "1024",
      thumbnailLink: "https://example.com/thumb.jpg",
      webContentLink: "https://drive.google.com/download?id=file123",
      imageMediaMetadata: { width: 100, height: 200, rotation: 0 },
      videoMediaMetadata: { durationMillis: "5000", width: 1920, height: 1080 },
    };

    const result = await transformDriveFile(driveFile);

    expect(result).toMatchObject({
      encryptedId: "encrypted-file123",
      name: "test.pdf",
      mimeType: "application/pdf",
      trashed: false,
      fileExtension: "pdf",
      size: 1024,
    });
    expect(encryptionService.encrypt).toHaveBeenCalledWith("file123");
  });

  it("should handle missing optional fields", async () => {
    const driveFile = {
      id: "file456",
      name: "simple.txt",
      mimeType: "text/plain",
      trashed: false,
      modifiedTime: "2024-01-01T00:00:00.000Z",
    };

    const result = await transformDriveFile(driveFile);

    expect(result.thumbnailLink).toBeUndefined();
    expect(result.imageMediaMetadata).toBeUndefined();
    expect(result.videoMediaMetadata).toBeUndefined();
  });
});
