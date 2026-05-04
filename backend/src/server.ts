import http from "http";
import { app } from "./app.js";
import { env } from "./config/env.js";
import { createSocketServer } from "./socket/socket.js";

const server = http.createServer(app);

createSocketServer(server);

server.listen(env.port, () => {
  console.log(`Server running on port ${env.port}`);
});
