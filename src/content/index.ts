import { detectProducts, type DetectedProduct } from "./detection";
import type { ExtensionMessage, ExtensionResponse } from "../shared/messages";

const MARKER = "data-fitcam-mounted";
const RESCAN_DELAY_MS = 180;
let rescanTimer: number | undefined;

function createCameraIcon(): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("fill", "none");

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute(
    "d",
    "M8.4 6.3 9.55 4.5h4.9l1.15 1.8H19a2 2 0 0 1 2 2v8.2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8.3a2 2 0 0 1 2-2h3.4Z",
  );
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-width", "1.7");
  path.setAttribute("stroke-linejoin", "round");

  const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  circle.setAttribute("cx", "12");
  circle.setAttribute("cy", "12.25");
  circle.setAttribute("r", "3.35");
  circle.setAttribute("stroke", "currentColor");
  circle.setAttribute("stroke-width", "1.7");

  svg.append(path, circle);
  return svg;
}

function mountOverlay(product: DetectedProduct): void {
  if (product.mount.hasAttribute(MARKER)) return;
  product.mount.setAttribute(MARKER, "true");

  const computedPosition = window.getComputedStyle(product.mount).position;
  if (computedPosition === "static") {
    product.mount.dataset.fitcamOriginalPosition = product.mount.style.position;
    product.mount.style.position = "relative";
  }

  const host = document.createElement("span");
  host.className = "fitcam-overlay-host";
  host.style.cssText = [
    "position:absolute",
    "top:12px",
    "right:12px",
    "z-index:2147483646",
    "width:42px",
    "height:42px",
    "pointer-events:auto",
  ].join(";");

  const shadow = host.attachShadow({ mode: "closed" });
  const button = document.createElement("button");
  button.type = "button";
  button.setAttribute("aria-label", `Try on ${product.selection.title}`);
  button.title = `Try on ${product.selection.title}`;
  button.append(createCameraIcon());

  const style = document.createElement("style");
  style.textContent = `
      :host { all: initial; }
      button {
        all: unset;
        box-sizing: border-box;
        width: 42px;
        height: 42px;
        display: grid;
        place-items: center;
        border-radius: 999px;
        color: #111;
        background: rgba(255, 255, 255, 0.94);
        border: 1px solid rgba(17, 17, 17, 0.10);
        box-shadow: 0 5px 18px rgba(0, 0, 0, 0.18);
        cursor: pointer;
        opacity: 0.96;
        transform: translateY(0);
        transition: transform 140ms ease, box-shadow 140ms ease, background 140ms ease;
      }
      button:hover {
        transform: translateY(-1px) scale(1.04);
        background: #fff;
        box-shadow: 0 7px 22px rgba(0, 0, 0, 0.24);
      }
      button:focus-visible {
        outline: 3px solid #1473e6;
        outline-offset: 2px;
      }
      button:disabled { cursor: wait; opacity: 0.65; }
      svg { width: 21px; height: 21px; display: block; }
    `;

  button.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    button.disabled = true;

    const message: ExtensionMessage = {
      type: "OPEN_TRY_ON",
      selection: product.selection,
    };

    try {
      const response = (await chrome.runtime.sendMessage(message)) as
        | ExtensionResponse
        | undefined;
      if (!response?.ok) {
        throw new Error(response?.error || "No response from extension background");
      }
    } catch (error) {
      console.error("tags could not open try-on", error);
    } finally {
      button.disabled = false;
    }
  });

  shadow.append(style, button);
  product.mount.append(host);
}

function mountOverlays(): void {
  for (const product of detectProducts()) {
    try {
      mountOverlay(product);
    } catch (error) {
      console.error("tags overlay mount failed", error);
    }
  }
}

function scheduleRescan(): void {
  window.clearTimeout(rescanTimer);
  rescanTimer = window.setTimeout(mountOverlays, RESCAN_DELAY_MS);
}

const observer = new MutationObserver(scheduleRescan);
observer.observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener("pageshow", scheduleRescan);
try {
  mountOverlays();
} catch (error) {
  console.error("tags initial mount failed", error);
}
