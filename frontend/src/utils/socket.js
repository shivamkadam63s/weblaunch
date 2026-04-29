import { io } from "socket.io-client";

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io("/", { transports: ["websocket", "polling"], reconnectionDelay: 1000, reconnectionAttempts: 5 });
    socket.on("connect", () => console.log("Socket connected:", socket.id));
    socket.on("disconnect", () => console.log("Socket disconnected"));
  }
  return socket;
}

export function subscribeToDeployment(deploymentId) {
  const s = getSocket();
  s.emit("subscribe:deployment", deploymentId);
  return () => s.emit("unsubscribe:deployment", deploymentId);
}
