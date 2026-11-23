import { createServer } from "vite";
import { fileURLToPath } from "node:url";
export async function startLiveServer() {
  const server = await createServer({
    root: fileURLToPath(new URL(".", import.meta.url)),
    configFile: fileURLToPath(new URL("./vite.config.ts", import.meta.url)),
    logLevel: "silent",
    server: { host: "127.0.0.1", port: 0, strictPort: true },
  });
  try {
    await server.listen();
    const address = server.httpServer?.address();
    if (!address || typeof address === "string")
      throw Error("No dev server listener");
    return { server, origin: `http://127.0.0.1:${address.port}` };
  } catch (e) {
    await server.close();
    throw e;
  }
}
