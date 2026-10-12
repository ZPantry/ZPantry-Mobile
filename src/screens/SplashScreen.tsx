import { useEffect, useRef } from "react";
import { StatusBar } from "expo-status-bar";
import { Animated, Platform, View } from "react-native";
import FigmaAsset from "@/components/FigmaAsset";
import { overviewAssets } from "@/constants/figmaAssets";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@/constants/colors";

export default function SplashScreen() {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 520,
        useNativeDriver: Platform.OS !== "web"
      }),
      Animated.spring(scale, {
        toValue: 1,
        damping: 12,
        stiffness: 110,
        mass: 0.8,
        useNativeDriver: Platform.OS !== "web"
      })
    ]).start();
  }, [opacity, scale]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.dark }}>
      <StatusBar style="light" />
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Animated.View
          style={{
            opacity,
            transform: [{ scale }]
          }}
        ><FigmaAsset asset={overviewAssets.imgLogoZPantryVer51} style={{ width: 206, height: 165 }} label="Z Pantry" /></Animated.View>
      </View>
    </SafeAreaView>
  );
}
