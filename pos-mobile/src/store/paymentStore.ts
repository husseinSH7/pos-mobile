import { create } from "zustand";

export interface PaymentItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  modifiers?: string;
}

export interface PaymentRecord {
  id: string;
  orderId: string | null;
  orderNumber: number | null;
  tableName: string | null;
  splitName?: string | null;
  items: PaymentItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: "CASH" | "CARD" | "GIFT_CARD" | "MIXED";
  amountTendered?: number | null;
  change?: number | null;
  receiptNumber: string;
  createdAt: string;
  tipAmount?: number | null;
  giftCardNumber?: string | null;
  giftCardAmount?: number | null;
}

interface PaymentState {
  payments: PaymentRecord[];
  addPayment: (payment: Omit<PaymentRecord, "id" | "createdAt">) => void;
  clearPayments: () => void;
}

export const usePaymentStore = create<PaymentState>((set) => ({
  payments: [],

  addPayment: (payment) =>
    set((state) => ({
      payments: [
        {
          ...payment,
          id: `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          createdAt: new Date().toISOString(),
        },
        ...state.payments,
      ],
    })),

  clearPayments: () => set({ payments: [] }),
}));
