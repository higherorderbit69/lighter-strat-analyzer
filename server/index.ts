/**
 * Express Server with tRPC integration
 * Serves the API at /api/trpc and static files
 */

import express from "express";
import cors from "cors";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "./routers";
import path from "path";

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// tRPC API
app.use(
    "/api/trpc",
    createExpressMiddleware({
        router: appRouter,
        createContext: () => ({}),
    })
);

// In production, serve static files from client build
if (process.env.NODE_ENV === "production") {
    const clientPath = path.join(__dirname, "../client/dist");
    app.use(express.static(clientPath));

    app.get("*", (req, res) => {
        res.sendFile(path.join(clientPath, "index.html"));
    });
}

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 tRPC API available at http://localhost:${PORT}/api/trpc`);
});

export type { AppRouter } from "./routers";
