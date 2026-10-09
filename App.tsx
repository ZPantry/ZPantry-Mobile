import { GestureHandlerRootView } from "react-native-gesture-handler";
import { createNavigationContainerRef, getStateFromPath, NavigationContainer, type LinkingOptions } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "./src/context/AuthContext";
import { ToastProvider } from "./src/context/ToastContext";
import AppNavigator from "./src/navigation/AppNavigator";
import WebFormStyles from "./src/components/WebFormStyles";
import { UnavailableFeatureProvider } from "./src/context/UnavailableFeatureContext";
import { useFonts } from 'expo-font';
import { BeVietnamPro_400Regular, BeVietnamPro_500Medium, BeVietnamPro_600SemiBold } from '@expo-google-fonts/be-vietnam-pro';
import { PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans';
import { Inter_500Medium, Inter_700Bold } from '@expo-google-fonts/inter';
import type { RootStackParamList } from "./src/types";

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ["zpantry://"],
  config: {
    screens: {
      Subscription: "subscription"
    }
  },
  getStateFromPath(path, config) {
    const paymentResult = /^payment\/(success|cancel)$/.exec(path);
    if (paymentResult) {
      return { routes: [{ name: "Subscription", params: { paymentOutcome: paymentResult[1] as "success" | "cancel" } }] };
    }
    // Older web navigation could create /payment/undefined. Do not fabricate a payment result.
    if (path === "payment/undefined") return { routes: [{ name: "Subscription" }] };
    return getStateFromPath(path, config);
  }
};

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

if (typeof window !== "undefined") {
  (window as any).__navigate = (name: any, params: any) => {
    if (navigationRef.isReady()) {
      navigationRef.navigate(name, params);
      return true;
    }
    return false;
  };
  (window as any).__getCurrentRoute = () => {
    if (navigationRef.isReady()) {
      return navigationRef.getCurrentRoute()?.name;
    }
    return null;
  };
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({ BeVietnamPro_400Regular, BeVietnamPro_500Medium,
    BeVietnamPro_600SemiBold, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, Inter_500Medium, Inter_700Bold });
  if (!fontsLoaded && !fontError) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaProvider>
      <WebFormStyles />
      <AuthProvider>
        <ToastProvider>
          <UnavailableFeatureProvider><NavigationContainer ref={navigationRef} linking={linking}>
            <StatusBar style="dark" />
            <AppNavigator />
          </NavigationContainer></UnavailableFeatureProvider>
        </ToastProvider>
      </AuthProvider>
    </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
