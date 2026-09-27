import { createDecartClient, models } from "@decartai/sdk";
import { fetchAndNormalizeGarment } from "./image";
import {
  CURRENT_SELECTION_KEY,
  type ExtensionMessage,
  type ExtensionResponse,
} from "../shared/messages";
import type { ProductSelection } from "../shared/product";

type RealtimeClient = Awaited<
  ReturnType<ReturnType<typeof createDecartClient>["realtime"]["connect"]>
>;

const tokenEndpoint = import.meta.env.VITE_TOKEN_ENDPOINT || "http://localhost:8787/api/decart/token";
const output = requiredElement<HTMLVideoElement>("camera-output");
const placeholder = requiredElement<HTMLElement>("stage-placeholder");
const statusLabel = requiredElement<HTMLElement>("status-label");
const productImage = requiredElement<HTMLImageElement>("product-image");
const productTitle = requiredElement<HTMLElement>("product-title");
const productLink = requiredElement<HTMLAnchorElement>("product-link");
const retryButton = requiredElement<HTMLButtonElement>("retry-button");
const addToCartButton = requiredElement<HTMLButtonElement>("add-to-cart-button");
const stopButton = requiredElement<HTMLButtonElement>("stop-button");
const errorPanel = requiredElement<HTMLElement>("error-panel");
const errorTitle = requiredElement<HTMLElement>("error-title");
const errorMessage = requiredElement<HTMLElement>("error-message");

let cameraStream: MediaStream | null = null;
let realtimeClient: RealtimeClient | null = null;
let activeSelection: ProductSelection | null = null;
let initializationId = 0;

retryButton.addEventListener("click", () => void initialize());
addToCartButton.addEventListener("click", () => {
  addToCartButton.textContent = "Added to cart";
  addToCartButton.disabled = true;
});
stopButton.addEventListener("click", () => {
  cleanup();
  window.close();
});
window.addEventListener("beforeunload", cleanup);
if (typeof chrome !== "undefined" && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((message: { type?: string; selection?: ProductSelection }) => {
    if (message.type === "SELECTION_UPDATED" && message.selection) {
      activeSelection = message.selection;
      renderProduct(message.selection);
      void applySelection(message.selection);
    }
  });
}

void initialize();

async function initialize(): Promise<void> {
  cleanup();
  const runId = ++initializationId;
  hideError();
  retryButton.hidden = true;
  placeholder.hidden = false;
  setStatus("Preparing camera", "working");

  try {
    activeSelection = await getSelection();
    if (!activeSelection) throw new Error("No garment was selected. Return to the store and click a camera button.");
    renderProduct(activeSelection);

    const model = models.realtime("lucy-vton-latest");
    cameraStream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: "user",
        frameRate: model.fps,
        width: model.width,
        height: model.height,
      },
    });
    if (runId !== initializationId) return;

    output.srcObject = cameraStream;
    await output.play();
    placeholder.hidden = true;
    setStatus("Connecting", "working");

    const token = await fetchClientToken();
    if (runId !== initializationId) return;

    const client = createDecartClient({ apiKey: token });
    realtimeClient = await client.realtime.connect(cameraStream, {
      model,
      mirror: "auto",
      onRemoteStream: (remoteStream) => {
        output.srcObject = remoteStream;
        void output.play();
        placeholder.hidden = true;
        setStatus("Ready", "live");
      },
    });

    realtimeClient.on("connectionChange", (state) => {
      if (state === "connecting") setStatus("Connecting", "working");
      if (state === "connected") setStatus("Applying garment", "working");
      if (state === "disconnected") setStatus("Disconnected", "neutral");
    });
    realtimeClient.on("error", (error) => showError("Connection error", error.message));

    await applySelection(activeSelection);
  } catch (error) {
    showError("Could not start try-on", friendlyError(error));
    retryButton.hidden = false;
  }
}

async function applySelection(selection: ProductSelection): Promise<void> {
  if (!realtimeClient) return;
  setStatus("Applying garment", "working");
  const garment = await fetchAndNormalizeGarment(selection.imageUrl);
  await realtimeClient.set({
    prompt: selection.prompt,
    image: garment,
    enhance: false,
  });
}

async function fetchClientToken(): Promise<string> {
  let response: Response;
  try {
    response = await fetch(tokenEndpoint, { method: "POST" });
  } catch {
    throw new Error(
      `The local try-on service is not reachable at ${tokenEndpoint}. Start it with npm run server after configuring its service credential.`,
    );
  }

  const body = (await response.json().catch(() => ({}))) as { apiKey?: string; error?: string };
  if (!response.ok || !body.apiKey) throw new Error(body.error || "The token service did not return a client token.");
  return body.apiKey;
}

async function getSelection(): Promise<ProductSelection | null> {
  if (typeof chrome === "undefined" || !chrome.runtime?.id) return null;
  const message: ExtensionMessage = { type: "GET_CURRENT_SELECTION" };
  try {
    const response = (await chrome.runtime.sendMessage(message)) as ExtensionResponse;
    return response.ok ? response.selection ?? null : null;
  } catch {
    const stored = await chrome.storage.session.get(CURRENT_SELECTION_KEY);
    return (stored[CURRENT_SELECTION_KEY] as ProductSelection | undefined) ?? null;
  }
}

function renderProduct(selection: ProductSelection): void {
  productTitle.textContent = selection.title;
  productImage.src = selection.imageUrl;
  productImage.alt = selection.title;
  productLink.href = selection.productUrl;
}

function cleanup(): void {
  initializationId += 1;
  realtimeClient?.disconnect();
  realtimeClient = null;
  cameraStream?.getTracks().forEach((track) => track.stop());
  cameraStream = null;
  output.srcObject = null;
}

function setStatus(label: string, _tone: "neutral" | "working" | "live" | "error"): void {
  statusLabel.textContent = label;
}

function showError(title: string, message: string): void {
  errorTitle.textContent = title;
  errorMessage.textContent = message;
  errorPanel.hidden = false;
  placeholder.hidden = true;
  setStatus("Needs attention", "error");
}

function hideError(): void {
  errorPanel.hidden = true;
  errorMessage.textContent = "";
}

function friendlyError(error: unknown): string {
  if (error instanceof DOMException && error.name === "NotAllowedError") {
    return "Camera permission was denied. Allow camera access for the extension, then retry.";
  }
  return error instanceof Error ? error.message : "An unexpected error occurred.";
}

function requiredElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing required element: ${id}`);
  return element as T;
}
