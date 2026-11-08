import { io } from "socket.io-client";
import { API_URL } from "../config";
import { getToken } from "./api";

let socket = null;
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

function removeHandler(key, fn) {
  const arr = handlerRegistry[key];
  const idx = arr.indexOf(fn);
  if (idx !== -1) arr.splice(idx, 1);
}

function notify(key, payload) {
  handlerRegistry[key].forEach((fn) => {
    try { fn(payload); } catch {}
  });
}

function setupSocket() {
  socket.on("connect", () => notify("onConnect"));
  socket.on("disconnect", () => notify("onDisconnect"));
  socket.on("connect_error", () => notify("onDisconnect"));
  Object.entries(EVENT_MAP).forEach(([key, event]) => {
    socket.on(event, (payload) => notify(key, payload));
  });
}

export function attachSocket(handlers = {}) {
  Object.keys(handlerRegistry).forEach((key) => registerHandler(key, handlers[key]));
  if (socket && socket.connected) return { socket, detach: () => detachHandlers(handlers) };
  const token = getToken();
  if (!token) return { socket: null, detach: () => {} };
  socket = io(API_URL, {
    transports: ["websocket", "polling"],
    auth: { token },
    reconnection: true,
  });
  setupSocket();
  return { socket, detach: () => detachHandlers(handlers) };
}

export function detachHandlers(handlers = {}) {
  Object.keys(handlerRegistry).forEach((key) => {
    if (handlers[key]) removeHandler(key, handlers[key]);
  });
}

export function emitSocket(event, data) {
  if (socket && socket.connected) socket.emit(event, data);
}

export function detachSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  Object.values(handlerRegistry).forEach((arr) => { arr.length = 0; });
}