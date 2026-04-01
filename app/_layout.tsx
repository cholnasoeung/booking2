import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { AuthProvider, useAuth } from "@/providers/auth-provider";

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}

function RootNavigator() {
  const colorScheme = useColorScheme();
  const { isReady } = useAuth();

  if (!isReady) {
    return (
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <View style={styles.loadingScreen}>
          <ActivityIndicator size="large" color="#5b4df7" />
          <Text style={styles.loadingTitle}>Getting your trips ready</Text>
          <Text style={styles.loadingText}>Loading mobile booking session...</Text>
        </View>
        <StatusBar style="auto" />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: "#f8f7ff",
          },
          headerShadowVisible: false,
          headerTintColor: "#1f2937",
          contentStyle: {
            backgroundColor: "#f8f7ff",
          },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ title: "Login", presentation: "modal" }} />
        <Stack.Screen
          name="register"
          options={{ title: "Create account", presentation: "modal" }}
        />
        <Stack.Screen name="booking/[busId]" options={{ title: "Passenger booking" }} />
        <Stack.Screen name="modal" options={{ presentation: "modal", title: "Modal" }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8f7ff",
    paddingHorizontal: 24,
    gap: 10,
  },
  loadingTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1f2937",
  },
  loadingText: {
    fontSize: 14,
    color: "#6b7280",
  },
});
