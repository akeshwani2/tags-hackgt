// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { detectProducts } from "../src/content/detection";

describe("Uniqlo-style product detection", () => {
  it("finds product images and ignores logos", () => {
    document.body.innerHTML = `
      <header><img src="/logo.png" alt="Uniqlo logo" width="220" height="220"></header>
      <article class="product-card">
        <a href="https://www.uniqlo.com/us/en/products/E465185-000/00">
          <img src="https://image.uniqlo.com/product.jpg" alt="SUPIMA Cotton T-Shirt" width="480" height="620">
        </a>
      </article>
    `;

    const results = detectProducts();
    expect(results).toHaveLength(1);
    expect(results[0]?.selection.title).toBe("SUPIMA Cotton T-Shirt");
    expect(results[0]?.selection.category).toBe("top");
  });
});
