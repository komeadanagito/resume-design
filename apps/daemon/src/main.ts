#!/usr/bin/env node
import { createServer } from "./server.js";
import { resolveEnv } from "./env.js";

const env = resolveEnv();
const server = await createServer(env);

await server.listen({ host: "127.0.0.1", port: env.port });
console.log(`Resume Studio daemon listening on http://127.0.0.1:${env.port}`);
