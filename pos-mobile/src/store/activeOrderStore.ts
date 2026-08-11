import { create } from "zustand";

type ActiveTableOrder = {
  tableId: string | null;
  tableName: string | null;
  orderId: string | null;
  orderNumber: number | null;
  order?: any | null; // optional
};

type ActiveOrderStore = {
  activeTableOrder: ActiveTableOrder;
  setActiveTableOrder: (order: ActiveTableOrder) => void;
  clearActiveTableOrder: () => void;
  setOrder: (order: any) => void;
};

const initialState: ActiveTableOrder = {
  tableId: null,
  tableName: null,
  orderId: null,
  orderNumber: null,
  order: null,
};

export const useActiveOrderStore = create<ActiveOrderStore>((set) => ({
  activeTableOrder: initialState,
  setActiveTableOrder: (order) =>
    set({
      activeTableOrder: {
        ...initialState,
        ...order,
        order: order.order ?? null,
      },
    }),
  clearActiveTableOrder: () => set({ activeTableOrder: initialState }),
  setOrder: (order) =>
    set((state) => ({
      activeTableOrder: { ...state.activeTableOrder, order },
    })),
}));