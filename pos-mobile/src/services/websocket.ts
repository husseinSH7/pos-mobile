import { io, Socket } from "socket.io-client";
import Constants from "expo-constants";

const WS_URL = Constants.expoConfig?.extra?.API_URL || "http://192.168.1.8:4000";

let socket: Socket | null = null;
let authToken: string | null = null;

export interface WebSocketEvents {
  orderCreated: (data: OrderCreatedEvent) => void;
  kitchenTicketCreated: (data: KitchenTicketEvent) => void;
  kitchenTicketUpdated: (data: KitchenTicketEvent) => void;
  tableStatusChanged: (data: TableStatusEvent) => void;
}

export interface OrderCreatedEvent {
  orderId: string;
  orderNumber: number;
  tableId?: string;
  status: string;
  totalAmount: number;
}

export interface KitchenTicketEvent {
  ticketId: string;
  orderId: string;
  orderNumber: number;
  tableId?: string;
  status: string;
}

export interface TableStatusEvent {
  tableId: string;
  status: string;
  orderId?: string;
  orderNumber?: number;
  guestCount?: number;
  serverId?: string;
}

export function initializeWebSocket(token: string): Socket {
  if (socket?.connected) {
    return socket;
  }

  authToken = token;

  socket = io(WS_URL, {
    auth: { token },
    transports: ["websocket"],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on("connect", () => {
    console.log("WebSocket connected");
  });

  socket.on("disconnect", () => {
    console.log("WebSocket disconnected");
  });

  socket.on("connect_error", (error) => {
    console.error("WebSocket connection error:", error);
  });

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectWebSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
    authToken = null;
  }
}

export function onOrderCreated(callback: (data: OrderCreatedEvent) => void): void {
  socket?.on("order:created", callback);
}

export function onKitchenTicketCreated(callback: (data: KitchenTicketEvent) => void): void {
  socket?.on("kitchen:ticket:created", callback);
}

export function onKitchenTicketUpdated(callback: (data: KitchenTicketEvent) => void): void {
  socket?.on("kitchen:ticket:updated", callback);
}

export function onTableStatusChanged(callback: (data: TableStatusEvent) => void): void {
  socket?.on("table:status:changed", callback);
}

export function offOrderCreated(callback: (data: OrderCreatedEvent) => void): void {
  socket?.off("order:created", callback);
}

export function offKitchenTicketCreated(callback: (data: KitchenTicketEvent) => void): void {
  socket?.off("kitchen:ticket:created", callback);
}

export function offKitchenTicketUpdated(callback: (data: KitchenTicketEvent) => void): void {
  socket?.off("kitchen:ticket:updated", callback);
}

export function offTableStatusChanged(callback: (data: TableStatusEvent) => void): void {
  socket?.off("table:status:changed", callback);
}