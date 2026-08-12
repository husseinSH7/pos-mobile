import { create } from "zustand";
import {
  onOrderCreated,
  onKitchenTicketCreated,
  onKitchenTicketUpdated,
  onTableStatusChanged,
  offOrderCreated,
  offKitchenTicketCreated,
  offKitchenTicketUpdated,
  offTableStatusChanged,
  type OrderCreatedEvent,
  type KitchenTicketEvent,
  type TableStatusEvent,
} from "../services/websocket";
import { useAuthStore } from "./authStore";

interface RealtimeState {
  connected: boolean;
  recentOrders: OrderCreatedEvent[];
  kitchenTickets: KitchenTicketEvent[];
  tableUpdates: TableStatusEvent[];
  
  connect: () => void;
  disconnect: () => void;
  addOrder: (order: OrderCreatedEvent) => void;
  addKitchenTicket: (ticket: KitchenTicketEvent) => void;
  updateKitchenTicket: (ticket: KitchenTicketEvent) => void;
  updateTableStatus: (update: TableStatusEvent) => void;
  clearOrders: () => void;
  clearKitchenTickets: () => void;
  clearTableUpdates: () => void;
}

export const useRealtimeStore = create<RealtimeState>((set) => ({
  connected: false,
  recentOrders: [],
  kitchenTickets: [],
  tableUpdates: [],

  connect: () => {
    set({ connected: true });
    const user = useAuthStore.getState().user;

    // Subscribe to order creation events
    onOrderCreated((data) => {
      set((state) => ({
        recentOrders: [data, ...state.recentOrders].slice(0, 50), // Keep last 50
      }));
    });

    // Subscribe to kitchen ticket events
    onKitchenTicketCreated((data) => {
      set((state) => ({
        kitchenTickets: [...state.kitchenTickets, data],
      }));
    });

    onKitchenTicketUpdated((data) => {
      set((state) => ({
        kitchenTickets: state.kitchenTickets.map((ticket) =>
          ticket.ticketId === data.ticketId ? data : ticket
        ),
      }));
    });

    // Subscribe to table status changes
    onTableStatusChanged((data) => {
      set((state) => ({
        tableUpdates: [data, ...state.tableUpdates].slice(0, 20), // Keep last 20
      }));
    });
  },

  disconnect: () => {
    set({ connected: false });
    offOrderCreated(() => {});
    offKitchenTicketCreated(() => {});
    offKitchenTicketUpdated(() => {});
    offTableStatusChanged(() => {});
  },

  addOrder: (order) => {
    set((state) => ({
      recentOrders: [order, ...state.recentOrders].slice(0, 50),
    }));
  },

  addKitchenTicket: (ticket) => {
    set((state) => ({
      kitchenTickets: [...state.kitchenTickets, ticket],
    }));
  },

  updateKitchenTicket: (ticket) => {
    set((state) => ({
      kitchenTickets: state.kitchenTickets.map((t) =>
        t.ticketId === ticket.ticketId ? ticket : t
      ),
    }));
  },

  updateTableStatus: (update) => {
    set((state) => ({
      tableUpdates: [update, ...state.tableUpdates].slice(0, 20),
    }));
  },

  clearOrders: () => set({ recentOrders: [] }),
  clearKitchenTickets: () => set({ kitchenTickets: [] }),
  clearTableUpdates: () => set({ tableUpdates: [] }),
}));