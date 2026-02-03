#!/usr/bin/env node

import { WebPixelsServer } from './server.js';

async function main() {
  const server = new WebPixelsServer();
  await server.start();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
