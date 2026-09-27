import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest({
  manifest_version: 3,
  name: "Try It On",
  short_name: "Try On",
  version: "0.1.0",
  description: "Try clothing on live while you shop with an AI-powered fitting room.",
  minimum_chrome_version: "120",
  permissions: ["storage", "windows"],
  host_permissions: [
    "https://*.uniqlo.com/*",
    "https://*.uniqlo.cn/*",
    "https://api.decart.ai/*",
    "http://127.0.0.1:8787/*",
    "http://localhost:8787/*",
  ],
  optional_host_permissions: ["https://*/*"],
  background: {
    service_worker: "src/background/index.ts",
    type: "module",
  },
  action: {
    default_title: "Try It On",
    default_popup: "tryon.html",
  },
  content_scripts: [
    {
      matches: ["https://*.uniqlo.com/*", "https://*.uniqlo.cn/*"],
      js: ["src/content/index.ts"],
      run_at: "document_idle",
    },
  ],
});
