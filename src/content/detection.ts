import { createSelection, type ProductSelection } from "../shared/product";

const PRODUCT_LINK_PATTERN = /\/(?:products?|items?)\//i;
const MIN_IMAGE_EDGE = 180;

export interface DetectedProduct {
  image: HTMLImageElement;
  mount: HTMLElement;
  selection: ProductSelection;
}

export function detectProducts(root: ParentNode = document): DetectedProduct[] {
  const detected: DetectedProduct[] = [];
  const seenMounts = new Set<HTMLElement>();

  for (const image of root.querySelectorAll<HTMLImageElement>("img")) {
    const product = detectProductFromImage(image);
    if (!product || seenMounts.has(product.mount)) continue;
    seenMounts.add(product.mount);
    detected.push(product);
  }

  return detected;
}

export function detectProductFromImage(image: HTMLImageElement): DetectedProduct | null {
  if (!isEligibleImage(image)) return null;

  const link = image.closest<HTMLAnchorElement>("a[href]") ?? findProductLink(image);
  if (!link) return null;

  const productUrl = toAbsoluteHttpUrl(link.href);
  if (!productUrl || !looksLikeProductLink(link, productUrl)) return null;

  const imageUrl = toAbsoluteHttpUrl(
    image.currentSrc || image.src || image.dataset.src || image.getAttribute("data-original") || "",
  );
  if (!imageUrl) return null;

  const mount = chooseMount(image, link);
  const title = findProductTitle(image, link, mount);
  if (!title) return null;

  return {
    image,
    mount,
    selection: createSelection({
      title,
      imageUrl,
      productUrl,
      pageUrl: window.location.href,
    }),
  };
}

function isEligibleImage(image: HTMLImageElement): boolean {
  if (image.closest("header, nav, footer")) return false;

  const width = image.naturalWidth || image.width || image.getBoundingClientRect().width;
  const height = image.naturalHeight || image.height || image.getBoundingClientRect().height;
  const alt = image.alt.trim();

  if (width < MIN_IMAGE_EDGE || height < MIN_IMAGE_EDGE) return false;
  if (/\b(logo|icon|flag|payment|avatar)\b/i.test(alt)) return false;
  return true;
}

function findProductLink(image: HTMLImageElement): HTMLAnchorElement | null {
  const card = image.closest<HTMLElement>(
    '[data-testid*="product" i], [class*="product" i], article, li',
  );
  if (!card) return null;

  return (
    card.querySelector<HTMLAnchorElement>('a[href*="/products/"]') ??
    card.querySelector<HTMLAnchorElement>('a[href*="/product/"]') ??
    card.querySelector<HTMLAnchorElement>("a[href]")
  );
}

function looksLikeProductLink(link: HTMLAnchorElement, url: string): boolean {
  if (PRODUCT_LINK_PATTERN.test(new URL(url).pathname)) return true;
  return Boolean(
    link.closest('[data-testid*="product" i], [class*="product" i], article') &&
      /\b(shop|sku|style|item|product)\b/i.test(`${link.dataset.testid ?? ""} ${link.className}`),
  );
}

function chooseMount(image: HTMLImageElement, link: HTMLAnchorElement): HTMLElement {
  const picture = image.closest<HTMLElement>("picture");
  if (picture?.parentElement) return picture.parentElement;
  return image.parentElement ?? link;
}

function findProductTitle(
  image: HTMLImageElement,
  link: HTMLAnchorElement,
  mount: HTMLElement,
): string {
  const candidates = [
    image.alt,
    image.getAttribute("aria-label"),
    link.getAttribute("aria-label"),
    link.title,
    mount.closest<HTMLElement>('[data-testid*="product" i], [class*="product" i], article, li')
      ?.innerText,
    link.innerText,
  ];

  for (const candidate of candidates) {
    const value = candidate?.replace(/\s+/g, " ").trim();
    if (value && value.length >= 3 && value.length <= 220) return value;
  }

  return "";
}

function toAbsoluteHttpUrl(value: string): string | null {
  try {
    const url = new URL(value, window.location.href);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}
