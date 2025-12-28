// Vercel serverless function handler
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import express from 'express';
import cors from 'cors';
import { appRouter } from '../server/routers';
import { createContext } from '../server/trpc';

const app = express();

app.use(cors());
app.use(express.json());

app.use(
    '/api/trpc',
    createExpressMiddleware({
        router: appRouter,
        createContext,
    })
);

export default app;
