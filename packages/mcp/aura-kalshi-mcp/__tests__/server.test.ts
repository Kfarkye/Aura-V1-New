import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { secureKalshiFetch } from "../src/server.js";



describe("Aura Kalshi MCP Server - Governance & Security", () => {
  const MOCK_API_KEY = "SUPER_SECRET_KALSHI_KEY_123!@#";

  beforeEach(() => {
    process.env.KALSHI_API_KEY = MOCK_API_KEY;
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.KALSHI_API_KEY;
  });

  it("formats API response correctly without hitting the live network (Armor Telemetry)", async () => {
    const mockResponse = {
      markets: [
        { id: "MARKET_1", title: "Test Market", price: 50 },
      ]
    };
    
    vi.mocked(fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    const data = await secureKalshiFetch("/markets?limit=1");
    
    expect(vi.mocked(fetch as any)).toHaveBeenCalledWith(
      "https://api.elections.kalshi.com/trade-api/v2/markets?limit=1",
      expect.objectContaining({
        headers: {
          "Authorization": `Bearer ${MOCK_API_KEY}`,
          "Content-Type": "application/json"
        }
      })
    );
    expect(data).toEqual(mockResponse);
  });

  it("explicitly strips KALSHI_API_KEY from network error strings (Anti-Leakage Assertion)", async () => {
    // Simulate a fetch error whose message accidentally embeds the API key
    // For example, if a node runtime or network library prints the requested headers in a crash
    const leakyErrorMessage = `Fetch failed: Network Error while transmitting Authorization: Bearer ${MOCK_API_KEY}`;
    
    vi.mocked(fetch as any).mockRejectedValueOnce(new Error(leakyErrorMessage));

    try {
      await secureKalshiFetch("/markets?limit=1");
      expect.fail("Expected secureKalshiFetch to throw");
    } catch (error: any) {
      const errorMessage = error.message;
      const stack = error.stack || "";
      
      // Assertion 1: Should NOT contain the secret string
      expect(errorMessage).not.toContain(MOCK_API_KEY);
      expect(stack).not.toContain(MOCK_API_KEY);
      
      // Assertion 2: Verify the sanitization string is present instead
      expect(errorMessage).toContain("***[REDACTED]***");
    }
  });
});
