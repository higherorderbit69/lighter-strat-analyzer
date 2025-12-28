import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            "@": resolve(__dirname, "./src"),
            "@shared": resolve(__dirname, "../shared"),
        },
    },
    server: {
        host: '0.0.0.0',
        port: 5173,
        hmr: {
            overlay: false,
        },
        fs: {
            strict: false,
            allow: ['..'],
        },
        proxy: {
            "/api": {
                target: "http://localhost:3001",
                changeOrigin: true,
            },
        },
    },
    build: {
        outDir: "dist",
    },
});
