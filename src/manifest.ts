import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest({
  manifest_version: 3,
  name: "tags",
  short_name: "tags",
  version: "0.1.0",
  description:
    "every product photo online shows you someone else.\n\nwhat if it showed you?",
  minimum_chrome_version: "120",
  icons: {
    "16": "icons/icon-16.png",
    "32": "icons/icon-32.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png",
  },
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
    default_title: "tags",
    default_popup: "tryon.html",
    default_icon: {
      "16": "icons/icon-16.png",
      "32": "icons/icon-32.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png",
    },
  },
  content_scripts: [
    {
      matches: ["https://*.uniqlo.com/*", "https://*.uniqlo.cn/*"],
      js: ["src/content/index.ts"],
      run_at: "document_idle",
    },
  ],
});
