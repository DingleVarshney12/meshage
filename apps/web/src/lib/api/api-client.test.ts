import { ApiError, apiRequest } from "./api-client";

describe("apiRequest", () => {
  const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:4000/api";
  });

  afterEach(() => {
    jest.restoreAllMocks();

    if (originalApiUrl === undefined) {
      delete process.env.NEXT_PUBLIC_API_URL;
    } else {
      process.env.NEXT_PUBLIC_API_URL = originalApiUrl;
    }
  });

  it("includes cookies and parses a successful JSON response", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ id: "user-1" }),
    });
    jest.spyOn(global, "fetch").mockImplementation(fetchMock);

    await expect(apiRequest<{ id: string }>("/profile/me")).resolves.toEqual({
      id: "user-1",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:4000/api/profile/me",
      expect.objectContaining({
        credentials: "include",
        headers: expect.any(Headers),
      }),
    );
  });

  it("converts API error messages into ApiError", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue({
      ok: false,
      status: 401,
      json: jest.fn().mockResolvedValue({ message: "Unauthorized" }),
    } as unknown as Response);

    await expect(apiRequest("/profile/me")).rejects.toEqual(
      expect.objectContaining<ApiError>({
        name: "ApiError",
        message: "Unauthorized",
        status: 401,
      }),
    );
  });

  it("returns null for no-content responses", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      status: 204,
    } as Response);

    await expect(apiRequest<null>("/logout", { method: "POST" })).resolves.toBe(
      null,
    );
  });
});
