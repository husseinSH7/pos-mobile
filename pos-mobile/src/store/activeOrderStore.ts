import { create } from "zustand";

type ActiveTableOrder = {
  tableId: string | null;
  tableName: string | null;
  orderId: string | null;
  orderNumber: number | null;
};

type ActiveOrderStore = {
  activeTableOrder: ActiveTableOrder;
  setActiveTableOrder: (order: ActiveTableOrder) => void;
  clearActiveTableOrder: () => void;
};

const initialState: ActiveTableOrder = {
  tableId: null,
  tableName: null,
  orderId: null,
  orderNumber: null,
};

export const useActiveOrderStore = create<ActiveOrderStore>((set) => ({
  activeTableOrder: initialState,

  setActiveTableOrder: (order) =>
    set({
      activeTableOrder: order,
    }),

  clearActiveTableOrder: () =>
    set({
      activeTableOrder: initialState,
    }),
}));