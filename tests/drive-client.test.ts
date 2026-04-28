import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GoogleDriveEdgeClient } from "~/lib/utils.server";

const TEST_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7VJTUt9Us
8cKjMzEfYyjiWA4R4/M2bS1GBMZL9Jh8k8LwzB1e8qJZ+7XxO9N0mK7hHJ
2BgyYVfLdldpUcFAsDd2D1T1Xt3y1QqW5pGCA7Z5P8vQrKzLZq8h8rV2pR
-----END PRIVATE KEY-----`;

const TEST_SERVICE_ACCOUNT_JSON = {
  type: "service_account",
  project_id: "test-project",
  private_key_id: "test-key-id",
  private_key: TEST_PRIVATE_KEY,
  client_email: "test@test-project.iam.gserviceaccount.com",
  client_id: "123456789",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/test",
};

const TEST_SERVICE_ACCOUNT_B64 = Buffer.from(JSON.stringify(TEST_SERVICE_ACCOUNT_JSON)).toString("base64");

// Mock jose module - use a constructor function, not arrow function
vi.mock("jose", () => {
  // Create mock instance methods
  const mockSetProtectedHeader = vi.fn().mockReturnThis();
  const mockSetIssuedAt = vi.fn().mockReturnThis();
  const mockSetExpirationTime = vi.fn().mockReturnThis();
  const mockSign = vi.fn().mockResolvedValue("mock-jwt-token");

  // Constructor function that returns the mock instance
  function MockSignJWT(this: any) {
    this.setProtectedHeader = mockSetProtectedHeader;
    this.setIssuedAt = mockSetIssuedAt;
    this.setExpirationTime = mockSetExpirationTime;
    this.sign = mockSign;
    return this;
  }

  return {
    SignJWT: MockSignJWT,
    importPKCS8: vi.fn().mockResolvedValue("mock-private-key"),
  };
});

describe("GoogleDriveEdgeClient", () => {
  let client: GoogleDriveEdgeClient;

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.GD_SERVICE_B64 = TEST_SERVICE_ACCOUNT_B64;
    global.fetch = vi.fn();
    client = new GoogleDriveEdgeClient();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.GD_SERVICE_B64;
  });

  describe("getAccessToken", () => {
    it("should fetch and cache access token", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: "test-token-123",
            expires_in: 3600,
          }),
      });

      const token = await client.getAccessToken();

      expect(token).toBe("test-token-123");
      expect(global.fetch).toHaveBeenCalledWith(
        "https://oauth2.googleapis.com/token",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        }),
      );
    });

    it("should return cached token if not expired", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: "cached-token",
            expires_in: 3600,
          }),
      });

      const token1 = await client.getAccessToken();
      const token2 = await client.getAccessToken();

      expect(token1).toBe("cached-token");
      expect(token2).toBe("cached-token");
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it("should throw error on failed token fetch", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        text: () => Promise.resolve("Invalid credentials"),
      });

      await expect(client.getAccessToken()).rejects.toThrow("Failed to get access token");
    });
  });
});
