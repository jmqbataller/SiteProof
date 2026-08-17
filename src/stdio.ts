import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { createSiteProofMcp } from './mcp.js';
serveStdio(createSiteProofMcp);
