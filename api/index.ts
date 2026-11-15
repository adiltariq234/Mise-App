// Vercel serverless entry point: serves the Mise Express app (API routes
// only; static files are served by Vercel from dist/). The app is built by
// createApp() in server.ts so local dev and Vercel share the same routes.
import { createApp } from '../server';

const app = await createApp();

export default app;
