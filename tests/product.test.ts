import { describe, expect, it } from "vitest";
import { buildTryOnPrompt, cleanProductTitle, inferGarmentCategory } from "../src/shared/product";

describe("product prompt generation", () => {
  it("classifies Uniqlo tops", () => {
    expect(inferGarmentCategory("AIRism Cotton Oversized T-Shirt")).toBe("top");
    expect(buildTryOnPrompt("AIRism Cotton Oversized T-Shirt")).toContain(
      "Substitute the current top",
    );
  });

  it("uses bottom-specific wording", () => {
    expect(inferGarmentCategory("Wide Straight Jeans")).toBe("bottom");
    expect(buildTryOnPrompt("Wide Straight Jeans")).toContain("current bottoms");
  });

  it("removes storefront metadata from titles", () => {
    expect(cleanProductTitle("MEN, XXS-3XL SUPIMA Cotton T-Shirt $24.90 UNISEX")).toBe(
      "SUPIMA Cotton T-Shirt",
    );
  });
});
