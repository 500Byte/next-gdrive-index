import { beforeEach, describe, expect, it, vi } from "vitest";

import { EncryptionService } from "~/lib/utils.server";

// Set environment variable for tests
beforeEach(() => {
  process.env.ENCRYPTION_KEY = "test-encryption-key-32-chars-min!!";
});

afterEach(() => {
  delete process.env.ENCRYPTION_KEY;
});

describe("EncryptionService", () => {
  let service: EncryptionService;

  beforeEach(() => {
    service = new EncryptionService();
  });

  describe("encrypt", () => {
    it("should encrypt data and return delimited string", async () => {
      const result = await service.encrypt("test-data");

      expect(result).toBeDefined();
      expect(result).toContain(";"); // delimiter check
      const parts = result.split(";");
      expect(parts).toHaveLength(2); // cipherText + iv
    });

    it("should produce different ciphertext for same input (due to random IV)", async () => {
      const result1 = await service.encrypt("test-data");
      const result2 = await service.encrypt("test-data");

      expect(result1).not.toBe(result2);
    });
  });

  describe("decrypt", () => {
    it("should decrypt encrypted data back to original", async () => {
      const original = "test-data-12345";
      const encrypted = await service.encrypt(original);
      const decrypted = await service.decrypt(encrypted);

      expect(decrypted).toBe(original);
    });

    it("should throw error for invalid hash format", async () => {
      await expect(service.decrypt("invalid-hash")).rejects.toThrow("Invalid hash format");
    });

    it("should throw error for wrong key", async () => {
      const encrypted = await service.encrypt("secret-data");

      // Create service with different key
      const wrongKeyService = new EncryptionService();
      // Mock to return different key
      vi.spyOn(wrongKeyService, "getKey").mockReturnValue("wrong-key-32-chars-minimum!!");

      await expect(wrongKeyService.decrypt(encrypted)).rejects.toThrow();
    });
  });
});
