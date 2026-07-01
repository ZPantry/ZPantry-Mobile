import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { Animated, Image, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@/constants/colors";

const plateImage = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=900&q=90";

type Props = {
  onStart: () => void;
};

export default function OnboardingScreen({ onStart }: Props) {
  const intro = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const orbit = useRef(new Animated.Value(0)).current;
  const float = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(intro, {
      toValue: 1,
      duration: 650,
      useNativeDriver: true
    }).start();

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1300, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1300, useNativeDriver: true })
      ])
    );
    const orbitLoop = Animated.loop(Animated.timing(orbit, { toValue: 1, duration: 5200, useNativeDriver: true }));
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: 1, duration: 1600, useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: 1600, useNativeDriver: true })
      ])
    );

    pulseLoop.start();
    orbitLoop.start();
    floatLoop.start();

    return () => {
      pulseLoop.stop();
      orbitLoop.stop();
      floatLoop.stop();
    };
  }, [float, intro, orbit, pulse]);

  const plateScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.035] });
  const glowScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.08] });
  const glowOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.28, 0.55] });
  const rotate = orbit.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  const floatY = float.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });
  const introY = intro.interpolate({ inputRange: [0, 1], outputRange: [18, 0] });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Animated.View
        style={{
          flex: 1,
          alignItems: "center",
          paddingHorizontal: 34,
          paddingTop: 70,
          paddingBottom: 44,
          opacity: intro,
          transform: [{ translateY: introY }]
        }}
      >
        <Image source={require("../../assets/images/z-pantry-logo.png")} resizeMode="contain" style={{ width: 218, height: 126 }} />

        <View style={{ width: 256, height: 256, alignItems: "center", justifyContent: "center", marginTop: 4 }}>
          <Animated.View
            style={{
              position: "absolute",
              width: 232,
              height: 232,
              borderRadius: 116,
              backgroundColor: "rgba(244,162,28,0.18)",
              opacity: glowOpacity,
              transform: [{ scale: glowScale }]
            }}
          />
          <Animated.View
            style={{
              position: "absolute",
              width: 222,
              height: 222,
              borderRadius: 111,
              borderWidth: 2,
              borderColor: "rgba(244,162,28,0.75)",
              transform: [{ rotate }]
            }}
          >
            <View style={{ position: "absolute", top: 12, left: 104, width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary }} />
            <View style={{ position: "absolute", bottom: 24, right: 34, width: 7, height: 7, borderRadius: 4, backgroundColor: colors.secondary }} />
          </Animated.View>
          <Animated.View style={{ boxShadow: "0 18px 30px rgba(0,0,0,0.24)", borderRadius: 107, transform: [{ translateY: floatY }, { scale: plateScale }] }}>
            <Image
              source={{ uri: plateImage }}
              resizeMode="cover"
              style={{
                width: 214,
                height: 214,
                borderRadius: 107,
                borderWidth: 5,
                borderColor: colors.white
              }}
            />
          </Animated.View>
          <Animated.View style={{ position: "absolute", top: 34, right: 28, transform: [{ translateY: floatY }] }}>
            <Text style={{ fontSize: 24 }} selectable={false}>
              ✦
            </Text>
          </Animated.View>
          <Animated.View style={{ position: "absolute", bottom: 36, left: 30, transform: [{ translateY: floatY }] }}>
            <Text style={{ fontSize: 18, color: colors.primary }} selectable={false}>
              ●
            </Text>
          </Animated.View>
        </View>

        <View style={{ alignItems: "center", gap: 10, marginTop: 26 }}>
          <Text style={{ color: colors.text, fontSize: 22, lineHeight: 30, fontWeight: "900", textAlign: "center" }} selectable>
            GỢI Ý CÔNG THỨC NẤU ĂN TỪ NHỮNG NGUYÊN LIỆU CÓ SẴN
          </Text>
          <Text style={{ color: colors.text, opacity: 0.9, fontSize: 15, lineHeight: 21, fontWeight: "700", textAlign: "center" }} selectable>
            Không còn phải băn khoăn hôm nay ăn gì. Mỗi bữa ăn đều được cá nhân hóa theo nhu cầu của riêng bạn.
          </Text>
        </View>

        <View style={{ flex: 1 }} />

        <Pressable
          onPress={onStart}
          style={({ pressed }) => ({
            minWidth: 168,
            minHeight: 64,
            borderRadius: 9,
            backgroundColor: colors.primary,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: 10,
            paddingHorizontal: 22,
            boxShadow: "0 10px 18px rgba(0,0,0,0.26)",
            opacity: pressed ? 0.84 : 1,
            transform: [{ scale: pressed ? 0.98 : 1 }]
          })}
        >
          <Text style={{ color: colors.white, fontSize: 24, fontWeight: "900" }} selectable>
            BẮT ĐẦU
          </Text>
          <Ionicons name="arrow-forward" size={27} color={colors.white} />
        </Pressable>
      </Animated.View>
    </SafeAreaView>
  );
}
