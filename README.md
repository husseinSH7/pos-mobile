# Restaurant POS — Mobile App

Cross-platform mobile point-of-sale client for restaurant staff — order taking, table management, kitchen tickets, payments, shifts, inventory, and reservations, built with Expo/React Native and connected to a multi-tenant backend in real time.

> Public snapshot of the production mobile app, shared for portfolio review. Backend: [resturant-pos-backend](https://github.com/husseinSH7/resturant-pos-backend).

## Features

- **Full POS workflow** — home, order taking, cart, split billing, payment, receipts, tables, kitchen display, shifts, customers, inventory, reservations, payment history, settings
- **Role-based screens** — staff roles (Owner, Manager, Cashier, Kitchen) map to what's accessible on the device
- **Real-time updates** — Socket.io client keeps order/kitchen/table status in sync live with the backend and other connected devices
- **Barcode scanning & receipt printing** — integrates device camera for barcode scanning and Bluetooth thermal printer support for physical receipts
- **Secure session handling** — tokens stored via Expo SecureStore, with an Axios interceptor auto-attaching the JWT to every request
- **State management** — Zustand stores per domain (auth, cart, active order, payment, shifts, realtime, sync)

## Tech Stack

- **Framework**: Expo (React Native 0.81, React 19), TypeScript
- **Navigation**: React Navigation (native stack)
- **State**: Zustand
- **Data fetching**: TanStack Query + Axios
- **Real-time**: socket.io-client
- **Hardware integration**: expo-camera (barcode scanning), react-native-bluetooth-classic + react-native-thermal-printer (receipt printing)
- **Secure storage**: expo-secure-store

## Architecture

```
┌───────────────────────────────────────────────┐
│                  Mobile App (Expo)              │
│                                                 │
│  Screens (Home, Order, Cart, Tables, Kitchen,   │
│  Payment, Shifts, Inventory, Reservations...)   │
│                     │                           │
│        ┌────────────┼────────────┐              │
│        ▼            ▼            ▼              │
│  Zustand stores   TanStack Query   Socket.io      │
│  (auth, cart,     (server state)   client         │
│   shift, etc.)                                   │
│        │            │              │              │
│        └────────────┴──────────────┘              │
│                     ▼                             │
│         Axios client (JWT auto-attached)          │
└─────────────────────┬───────────────────────────┘
                       │ REST + WebSocket
                       ▼
           Backend API (Express + Socket.io)
```

Auth tokens are stored securely on-device and injected into every API call via an Axios interceptor; the Socket.io client authenticates the same JWT on connect and joins a `restaurant-{id}` room scoped to the logged-in staff member's restaurant.

## Getting Started

```bash
npm install
cp .env.example .env      # set EXPO_PUBLIC_API_BASE_URL to your backend
npx expo start
```

Run on a simulator/device via the Expo CLI, or build with EAS (see `PHASE_8_BUILD_GUIDE.md`).

## Notes

- The codebase includes a local SQLite-backed offline queue (`services/database.ts`, `syncQueue.ts`) for future offline-order support, but this path isn't currently active in the production flow — the app operates online-first today.
