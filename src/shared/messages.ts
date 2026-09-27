import type { ProductSelection } from "./product";

export const CURRENT_SELECTION_KEY = "fitcam.currentSelection";

export type ExtensionMessage =
  | {
      type: "OPEN_TRY_ON";
      selection: ProductSelection;
    }
  | {
      type: "GET_CURRENT_SELECTION";
    };

export type ExtensionResponse =
  | { ok: true; selection?: ProductSelection }
  | { ok: false; error: string };
