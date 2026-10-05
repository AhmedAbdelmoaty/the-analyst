import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => ({
  server: { host: "::", port: 8080 },
  plugins: [react(), mode === "development" && componentTagger(), VitePWA({
    strategies: 'generateSW', injectRegister: null, registerType: 'prompt',
    devOptions: { enabled: false },
    manifest: false,
    workbox: {
      swDest: 'sw.js', skipWaiting: false, clientsClaim: false,
      globPatterns: [],
      navigateFallback: null,
      runtimeCaching: [
        { urlPattern: ({request, url}) => request.mode === 'navigate' && url.origin === self.location.origin && url.pathname === '/', handler: 'NetworkFirst', options: { cacheName: 'analyst-navigation', networkTimeoutSeconds: 3, expiration: { maxEntries: 8, maxAgeSeconds: 86400 } } },
        { urlPattern: ({url}) => url.origin === self.location.origin && /^\/assets\/[^/]+\.[a-f0-9]{8,}\.(js|css|woff2|png|webp)$/.test(url.pathname), handler: 'CacheFirst', options: { cacheName: 'analyst-versioned-assets', expiration: { maxEntries: 80, maxAgeSeconds: 604800 } } },
      ],
    },
  })].filter(Boolean),
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
}));
