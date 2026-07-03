import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { Animated, Image, Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@/constants/colors";

const plateImage = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=900&q=90";

type Props = {
  onStart: () => void;
};

export default function OnboardingScreen({ onStart }: Props) {
  const { height, width } = useWindowDimensions();
  const intro = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const orbit = useRef(new Animated.Value(0)).current;
  const float = useRef(new Animated.Value(0)).current;

  const compact = height < 720;
  const veryCompact = height < 640;
  const contentWidth = Math.min(width - 48, 380);
  const logoWidth = compact ? 184 : 218;
  const logoHeight = compact ? 94 : 126;
  const plateFrameSize = veryCompact ? 194 : compact ? 220 : 256;
  const plateSize = veryCompact ? 158 : compact ? 184 : 214;
  const orbitSize = plateSize + 8;
  const glowSize = plateSize + 18;

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
  const glowOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.22, 0.48] });
  const rotate = orbit.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  const floatY = float.interpolate({ inputRange: [0, 1], outputRange: [0, compact ? -6 : -10] });
  const introY = intro.interpolate({ inputRange: [0, 1], outputRange: [18, 0] });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top", "bottom"]}>
      <ScrollView
        bounces={false}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          flexGrow: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 24,
          paddingTop: compact ? 18 : 34,
          paddingBottom: compact ? 22 : 34
        }}
      >
        <Animated.View
          style={{
            width: contentWidth,
            minHeight: Math.max(height - (compact ? 56 : 86), 0),
            alignItems: "center",
            justifyContent: "center",
            opacity: intro,
            transform: [{ translateY: introY }]
          }}
        >
          <Image source={require("../../assets/images/z-pantry-logo.png")} resizeMode="contain" style={{ width: logoWidth, height: logoHeight }} />

          <View style={{ width: plateFrameSize, height: plateFrameSize, alignItems: "center", justifyContent: "center", marginTop: compact ? -6 : 8 }}>
            <Animated.View
              style={{
                position: "absolute",
                width: glowSize,
                height: glowSize,
                borderRadius: glowSize / 2,
                backgroundColor: "rgba(244,162,28,0.16)",
                opacity: glowOpacity,
                transform: [{ scale: glowScale }]
              }}
            />
            <Animated.View
              style={{
                position: "absolute",
                width: orbitSize,
                height: orbitSize,
                borderRadius: orbitSize / 2,
                borderWidth: 2,
                borderColor: "rgba(244,162,28,0.72)",
                transform: [{ rotate }]
              }}
            >
              <View style={{ position: "absolute", top: 10, left: orbitSize / 2 - 5, width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary }} />
              <View style={{ position: "absolute", bottom: 22, right: 28, width: 7, height: 7, borderRadius: 4, backgroundColor: colors.secondary }} />
            </Animated.View>
            <Animated.View style={{ boxShadow: "0 18px 30px rgba(0,0,0,0.24)", borderRadius: plateSize / 2, transform: [{ translateY: floatY }, { scale: plateScale }] }}>
              <Image
                source={{ uri: plateImage }}
                resizeMode="cover"
                style={{
                  width: plateSize,
                  height: plateSize,
                  borderRadius: plateSize / 2,
                  borderWidth: 5,
                  borderColor: colors.white
                }}
              />
            </Animated.View>
            <Animated.View style={{ position: "absolute", top: compact ? 26 : 34, right: compact ? 20 : 28, transform: [{ translateY: floatY }] }}>
              <Text style={{ color: colors.text, fontSize: compact ? 18 : 24, fontWeight: "900" }} selectable={false}>
                +
              </Text>
            </Animated.View>
            <Animated.View style={{ position: "absolute", bottom: compact ? 30 : 36, left: compact ? 24 : 30, transform: [{ translateY: floatY }] }}>
              <Text style={{ fontSize: compact ? 15 : 18, color: colors.primary }} selectable={false}>
                ●
              </Text>
            </Animated.View>
          </View>

          <View style={{ alignItems: "center", gap: compact ? 8 : 10, marginTop: compact ? 12 : 20 }}>
            <Text style={{ color: colors.text, fontSize: compact ? 20 : 24, lineHeight: compact ? 26 : 31, fontWeight: "900", textAlign: "center" }} selectable>
              GỢI Ý CÔNG THỨC NẤU ĂN TỪ NGUYÊN LIỆU CÓ SẴN
            </Text>
            <Text style={{ color: colors.text, opacity: 0.9, fontSize: compact ? 14 : 15, lineHeight: compact ? 20 : 22, fontWeight: "700", textAlign: "center" }} selectable>
              Không còn phải băn khoăn hôm nay ăn gì. Mỗi bữa ăn đều được cá nhân hóa theo nhu cầu của riêng bạn.
            </Text>
          </View>

          <Pressable
            onPress={onStart}
            style={({ pressed }) => ({
              width: "100%",
              maxWidth: 240,
              minHeight: compact ? 54 : 60,
              marginTop: compact ? 20 : 28,
              borderRadius: 10,
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
            <Text style={{ color: colors.white, fontSize: compact ? 19 : 22, fontWeight: "900" }} selectable>
              BẮT ĐẦU
            </Text>
            <Ionicons name="arrow-forward" size={compact ? 24 : 27} color={colors.white} />
          </Pressable>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
