import { create } from "zustand";

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  modifiers?: { id: string; name: string; price: number }[];
  note?: string;
}

interface CartState {
  items: CartItem[];
  tableNumber?: string;
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  setTableNumber: (table: string) => void;
  clearCart: () => void;
  subtotal: () => number;
  tax: () => number;
  total: () => number;
}

const TAX_RATE = 0.1; // 10% — adjust to your region

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  tableNumber: undefined,

  addItem: (item) => {
    const existing = get().items.find((i) => i.productId === item.productId);
    if (existing) {
      set({
        items: get().items.map((i) =>
          i.productId === item.productId
            ? { ...i, quantity: i.quantity + 1 }
            : i
        ),
      });
    } else {
      set({ items: [...get().items, { ...item, quantity: 1 }] });
    }
  },

  removeItem: (productId) =>
    set({ items: get().items.filter((i) => i.productId !== productId) }),

  updateQuantity: (productId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(productId);
      return;
    }
    set({
      items: get().items.map((i) =>
        i.productId === productId ? { ...i, quantity } : i
      ),
    });
  },

  setTableNumber: (table) => set({ tableNumber: table }),

  clearCart: () => set({ items: [], tableNumber: undefined }),

  subtotal: () =>
    get().items.reduce((sum, item) => {
      const modifierTotal =
        item.modifiers?.reduce((m, mod) => m + mod.price, 0) ?? 0;
      return sum + (item.price + modifierTotal) * item.quantity;
    }, 0),

  tax: () => get().subtotal() * TAX_RATE,

  total: () => get().subtotal() + get().tax(),
}));