export type GarmentCategory =
  | "top"
  | "bottom"
  | "dress"
  | "outerwear"
  | "headwear"
  | "accessory";

export interface ProductSelection {
  id: string;
  title: string;
  imageUrl: string;
  productUrl: string;
  pageUrl: string;
  category: GarmentCategory;
  prompt: string;
}

const CATEGORY_RULES: Array<[GarmentCategory, RegExp]> = [
  ["dress", /\b(dress|jumpsuit|romper|overall|outfit|set)\b/i],
  ["outerwear", /\b(jacket|coat|blazer|parka|vest|cardigan|overcoat|windbreaker)\b/i],
  ["bottom", /\b(pant|pants|jean|jeans|trouser|trousers|short|shorts|skirt|legging|leggings)\b/i],
  ["headwear", /\b(hat|cap|beanie|headband)\b/i],
  ["accessory", /\b(scarf|bag|belt|glove|gloves|tie|necklace|sunglasses)\b/i],
];

export function inferGarmentCategory(text: string): GarmentCategory {
  for (const [category, pattern] of CATEGORY_RULES) {
    if (pattern.test(text)) return category;
  }
  return "top";
}

export function buildTryOnPrompt(
  title: string,
  category: GarmentCategory = inferGarmentCategory(title),
): string {
  const description = cleanProductTitle(title);

  switch (category) {
    case "bottom":
      return `Substitute the current bottoms with the ${description}, preserving its color, material, pattern, details, and intended fit.`;
    case "dress":
      return `Substitute the current outfit with the ${description}, preserving its color, material, pattern, details, and intended fit.`;
    case "headwear":
      return `Add the ${description} to the person's head, preserving its color, material, pattern, shape, and details.`;
    case "accessory":
      return `Add the ${description} to the person in its natural position, preserving its color, material, shape, and details.`;
    case "outerwear":
    case "top":
    default:
      return `Substitute the current top with the ${description}, preserving its color, material, pattern, details, and intended fit.`;
  }
}

export function cleanProductTitle(value: string): string {
  const cleaned = value
    .replace(/\$\s?\d+(?:\.\d{2})?/g, " ")
    .replace(/\b(?:men|women|unisex|kids|baby)\b/gi, " ")
    .replace(/\b(?:xxs|xs|s|m|l|xl|xxl|3xl|4xl)(?:\s*[-–]\s*\w+)?\b/gi, " ")
    .replace(/\s+/g, " ")
    .replace(/^[\s,|:-]+|[\s,|:-]+$/g, "")
    .trim();

  return cleaned || "selected garment";
}

export function createSelection(input: {
  title: string;
  imageUrl: string;
  productUrl: string;
  pageUrl: string;
}): ProductSelection {
  const category = inferGarmentCategory(`${input.title} ${input.productUrl}`);
  return {
    id: stableProductId(input.productUrl, input.imageUrl),
    title: cleanProductTitle(input.title),
    imageUrl: input.imageUrl,
    productUrl: input.productUrl,
    pageUrl: input.pageUrl,
    category,
    prompt: buildTryOnPrompt(input.title, category),
  };
}

function stableProductId(productUrl: string, imageUrl: string): string {
  const source = `${productUrl}|${imageUrl}`;
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `product-${(hash >>> 0).toString(36)}`;
}
