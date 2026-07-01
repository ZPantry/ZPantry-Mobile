import { useEffect, useRef } from "react";
import { Animated, Image, View } from "react-native";
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
        useNativeDriver: true
      }),
      Animated.spring(scale, {
        toValue: 1,
        damping: 12,
        stiffness: 110,
        mass: 0.8,
        useNativeDriver: true
      })
    ]).start();
  }, [opacity, scale]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Animated.Image
          source={require("../../assets/images/z-pantry-logo.png")}
          resizeMode="contain"
          style={{
            width: 210,
            height: 80,
            opacity,
            transform: [{ scale }]
          }}
        />
      </View>
    </SafeAreaView>
  );
}
