import { io } from "socket.io-client";
import { getToken } from "./api";

let socket = null;
// Har bir hodisa uchun ro'yxatdan o'tgan barcha handler'lar
const handlerRegistry = {
  onConnect: [],
  onDisconnect: [],
  onOrderNew: [],
  onOrderUpdate: [],
  onChatNew: [],
  onLiveLocation: [],
  onMasterRated: [],
};

const EVENT_MAP = {
  onOrderNew: "order:new",
  onOrderUpdate: "order:update",
  onChatNew: "chat:new",
  onLiveLocation: "live:location",
  onMasterRated: "master:rated",
};

function registerHandler(key, fn) {
  if (typeof fn !== "function") return;
  if (!handlerRegistry[key].includes(fn)) handlerRegistry[key].push(fn);
}

function notify(key, payload) {
  handlerRegistry[key].forEach((fn) => {
    try { fn(payload); } catch {}
  });
}

function setupSocket() {
  socket.on("connect", () => notify("onConnect"));
  socket.on("disconnect", () => notify("onDisconnect"));

  Object.entries(EVENT_MAP).forEach(([key, event]) => {
    socket.on(event, (payload) => notify(key, payload));
  });
}

export function attachSocket(handlers = {}) {
  // Handler'larni har chaqiruvda ro'yxatdan o'tkazamiz (idempotent)
  Object.keys(handlerRegistry).forEach((key) => registerHandler(key, handlers[key]));

  if (socket && socket.connected) return socket;
  const token = getToken();
  if (!token) return null;

  socket = io(process.env.REACT_APP_API_URL || "http://localhost:5000", {
    transports: ["websocket", "polling"],
    auth: { token },
  });

  setupSocket();
  return socket;
}

export function emitSocket(event, data) {
  if (socket && socket.connected) socket.emit(event, data);
}

export function detachSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
