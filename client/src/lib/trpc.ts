import { createTRPCReact } from "@trpc/react-query";

// Define the AppRouter type inline to avoid importing from server
// This matches the structure of our tRPC router
type AppRouter = any;

export const trpc = createTRPCReact<AppRouter>();
