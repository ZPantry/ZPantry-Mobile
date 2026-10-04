import { GestureHandlerRootView } from "react-native-gesture-handler";
import { NavigationContainer } from "@react-navigation/native";
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
          <UnavailableFeatureProvider><NavigationContainer>
            <StatusBar style="dark" />
            <AppNavigator />
          </NavigationContainer></UnavailableFeatureProvider>
        </ToastProvider>
      </AuthProvider>
    </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
