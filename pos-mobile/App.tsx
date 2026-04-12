import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuthStore } from "./src/store/authStore";
import LoginScreen from "./src/screens/LoginScreen";
import MenuScreen from "./src/screens/MenuScreen";
import OrderScreen from "./src/screens/OrderScreen";
import CartScreen from "./src/screens/CartScreen";

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
            <Stack.Screen name="Menu" component={MenuScreen} />
            <Stack.Screen name="Order" component={OrderScreen} />
            <Stack.Screen name="Cart" component={CartScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}