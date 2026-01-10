import type { API } from "../electron/api-types";

declare global {
  interface Window {
    api: API
  }
}

export { };
