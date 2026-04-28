import { renderHook, waitFor } from "@testing-library/react";
import { usePreviewBase } from "~/components/preview/usePreviewBase";

describe("usePreviewBase", () => {
  it("should handle loading state", async () => {
    const { result } = renderHook(() => usePreviewBase({
      file: { encryptedId: "test123" } as any,
      fetchPreview: async () => { /* mock */ },
    }));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  it("should handle error state", async () => {
    const { result } = renderHook(() => usePreviewBase({
      file: { encryptedId: "test123" } as any,
      fetchPreview: async () => { throw new Error("Failed"); },
    }));

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });
  });
});
