import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuthStore } from "./src/store/authStore";

import LoginScreen from "./src/screens/LoginScreen";
import HomeScreen from "./src/screens/HomeScreen";
import TablesScreen from "./src/screens/TablesScreen";
import OrderScreen from "./src/screens/OrderScreen";
import CartScreen from "./src/screens/CartScreen";
import KitchenScreen from "./src/screens/kitchenScreen";
import CustomersScreen from "./src/screens/CustomersScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import OrdersScreen from "./src/screens/OrdersScreen";
import ShiftScreen from "./src/screens/ShiftScreen";

const Stack = createNativeStackNavigator();

export default function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Tables" component={TablesScreen} />
            <Stack.Screen name="Order" component={OrderScreen} />
            <Stack.Screen name="Orders" component={OrdersScreen} />
            <Stack.Screen name="Cart" component={CartScreen} />
            <Stack.Screen name="Kitchen" component={KitchenScreen} />
            <Stack.Screen name="Customers" component={CustomersScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="Shift" component={ShiftScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
