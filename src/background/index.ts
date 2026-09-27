import {
  CURRENT_SELECTION_KEY,
  type ExtensionMessage,
  type ExtensionResponse,
} from "../shared/messages";
import type { ProductSelection } from "../shared/product";

let tryOnWindowId: number | undefined;

chrome.runtime.onMessage.addListener(
  (
    message: ExtensionMessage,
    _sender,
    sendResponse: (response: ExtensionResponse) => void,
  ) => {
    if (message.type === "OPEN_TRY_ON") {
      void openTryOn(message.selection)
        .then(() => sendResponse({ ok: true }))
        .catch((error: unknown) =>
          sendResponse({
            ok: false,
            error: error instanceof Error ? error.message : "Unable to open try-on",
          }),
        );
      return true;
    }

    if (message.type === "GET_CURRENT_SELECTION") {
      void chrome.storage.session
        .get(CURRENT_SELECTION_KEY)
        .then((result) =>
          sendResponse({
            ok: true,
            selection: result[CURRENT_SELECTION_KEY] as ProductSelection | undefined,
          }),
        );
      return true;
    }

    return false;
  },
);

chrome.windows.onRemoved.addListener((windowId) => {
  if (windowId === tryOnWindowId) tryOnWindowId = undefined;
});

async function openTryOn(selection: ProductSelection): Promise<void> {
  await chrome.storage.session.set({ [CURRENT_SELECTION_KEY]: selection });

  if (tryOnWindowId !== undefined) {
    try {
      await chrome.windows.update(tryOnWindowId, { focused: true });
      await chrome.runtime
        .sendMessage({ type: "SELECTION_UPDATED", selection })
        .catch(() => undefined);
      return;
    } catch {
      tryOnWindowId = undefined;
    }
  }

  const created = await chrome.windows.create({
    url: chrome.runtime.getURL("tryon.html"),
    type: "popup",
    width: 980,
    height: 780,
    focused: true,
  });
  if (!created?.id) throw new Error("Chrome did not create the try-on window.");
  tryOnWindowId = created.id;
}
