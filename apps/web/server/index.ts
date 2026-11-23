import { fileURLToPath } from 'node:url';
import { createProductionServer } from './app';

const rawPort = process.env.PORT;
const port = Number(rawPort);
if (!rawPort || !/^\d+$/.test(rawPort) || !Number.isInteger(port) || port < 1 || port > 65535) {
  throw Error('PORT must be an integer between 1 and 65535');
}

// Relative to the compiled server/dist/index.mjs, independent of process.cwd().
const server = createProductionServer(fileURLToPath(new URL('../../dist/', import.meta.url)));
server.listen(port, '0.0.0.0', () => {
  console.log(`VibeSkyline listening on 0.0.0.0:${port}; request logging disabled.`);
});

let stopping = false;
function shutdown() {
  if (stopping) return;
  stopping = true;
  // Let relay's 12-second deadline finish; bound stalled static clients too.
  const deadline = setTimeout(() => {
    server.closeAllConnections();
    process.exit(1);
  }, 15000);
  deadline.unref();
  // Keep the unreferenced deadline armed for lingering outbound handles (e.g. DNS).
  // It never delays a clean exit after the HTTP connections have drained.
  server.close();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
