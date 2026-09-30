import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useRoute } from "@react-navigation/native";
import { useEffect, useRef, useState } from "react";
import { Animated, Image, Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";

// Step 0: Welcome
// Step 1: Nhập món
// Step 2: AI Analyzing
// Step 3: Show Ingredients
// Step 4: Guide to Add
// Step 5: Done

export default function InteractiveGuideScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const isReplay = route.params?.isReplay ?? false;
  const { completeOnboardingStep } = useAuth();
  const [step, setStep] = useState(0);
  const [searchText, setSearchText] = useState("");
  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideUpAnim = useRef(new Animated.Value(50)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (step === 2) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.1, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true })
        ])
      ).start();

      const timer = setTimeout(() => {
        setStep(3);
      }, 2500);
      return () => clearTimeout(timer);
    }

    if (step === 3 || step === 4 || step === 5 || step === 6 || step === 0 || step === 1) {
      Animated.parallel([
        Animated.timing(slideUpAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 400, useNativeDriver: true })
      ]).start();
    }
  }, [step]);

  const handleNext = async () => {
    if (step === 6) {
      if (!isReplay) {
        await completeOnboardingStep("done");
        navigation.reset({ index: 0, routes: [{ name: "Tabs" }] });
      } else {
        navigation.goBack();
      }
    } else {
      setStep(step + 1);
      slideUpAnim.setValue(50);
      opacityAnim.setValue(0);
    }
  };

  const handleSubmitSearch = () => {
    if (searchText.trim().length > 0) {
      setStep(2);
    }
  };

  const renderTooltip = (title: string, desc: string, showNext = true, customAction?: () => void) => (
    <Animated.View style={{
      position: "absolute", bottom: 40, left: 20, right: 20,
      backgroundColor: colors.card, borderRadius: 16, padding: 20,
      boxShadow: "0 10px 30px rgba(0,0,0,0.3)", zIndex: 100,
      borderWidth: 1, borderColor: colors.line,
      transform: [{ translateY: slideUpAnim }], opacity: opacityAnim
    }}>
      <Text style={{ color: colors.primary, fontSize: 18, fontWeight: "900", marginBottom: 8 }}>{title}</Text>
      <Text style={{ color: colors.text, fontSize: 14, fontWeight: "700", lineHeight: 20, marginBottom: showNext ? 20 : 0 }}>{desc}</Text>
      {showNext && (
        <Pressable 
          onPress={customAction || handleNext}
          style={({ pressed }) => ({
            backgroundColor: colors.primary, paddingVertical: 12, borderRadius: 10,
            alignItems: "center", opacity: pressed ? 0.8 : 1
          })}
        >
          <Text style={{ color: colors.white, fontSize: 15, fontWeight: "900" }}>{step === 6 ? "Bắt đầu sử dụng" : "Tiếp tục"}</Text>
        </Pressable>
      )}
    </Animated.View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top", "bottom"]}>
      {/* Fake Header */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20, zIndex: 100 }}>
        <View>
          <Text style={{ color: colors.text, fontSize: 24, fontWeight: "900" }}>Chào bạn mới!</Text>
          <Text style={{ color: colors.muted, fontSize: 14, fontWeight: "700", marginTop: 2 }}>Cùng khám phá Z-Pantry nhé.</Text>
        </View>
        {isReplay ? (
          <Pressable onPress={() => navigation.goBack()} style={{ padding: 8, backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 20 }}>
            <Ionicons name="close" size={20} color={colors.white} />
          </Pressable>
        ) : (
          <Pressable 
            onPress={async () => {
              await completeOnboardingStep("done");
              navigation.reset({ index: 0, routes: [{ name: "Tabs" }] });
            }}
            hitSlop={10}
          >
            <Text style={{ color: colors.muted, fontSize: 15, fontWeight: "700" }}>Bỏ qua</Text>
          </Pressable>
        )}
      </View>

      {/* Fake Search Bar area */}
      <View style={{ paddingHorizontal: 20, zIndex: step === 1 ? 50 : 1 }}>
        <View style={{
          flexDirection: "row", alignItems: "center", backgroundColor: step === 1 ? colors.white : colors.card,
          borderRadius: 14, borderWidth: 2, borderColor: step === 1 ? colors.primary : colors.line, paddingHorizontal: 16, height: 54,
          boxShadow: step === 1 ? "0 0 15px rgba(244,162,28,0.4)" : "none"
        }}>
          <Ionicons name="search" size={20} color={step === 1 ? colors.primary : colors.muted} />
          <TextInput 
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Nhập tên món ăn bạn thích (VD: Bún bò)..."
            placeholderTextColor={colors.muted}
            onSubmitEditing={handleSubmitSearch}
            editable={step === 1}
            style={{ flex: 1, marginLeft: 10, color: colors.text, fontSize: 15, fontWeight: "700" }}
          />
          {step === 1 && searchText.length > 0 && (
            <Pressable onPress={handleSubmitSearch} style={{ backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
              <Text style={{ color: colors.white, fontSize: 12, fontWeight: "900" }}>Phân tích</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Fake Results Area */}
      <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 30, zIndex: (step === 3 || step === 4) ? 50 : 1 }}>
        {step === 2 && (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", marginTop: -100 }}>
            <Animated.View style={{ transform: [{ scale: pulseAnim }], alignItems: "center" }}>
              <Ionicons name="sparkles" size={60} color={colors.primary} />
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: "900", marginTop: 20 }}>AI đang phân tích món "{searchText}"...</Text>
              <Text style={{ color: colors.muted, fontSize: 14, fontWeight: "700", marginTop: 8 }}>Đang bóc tách nguyên liệu</Text>
            </Animated.View>
          </View>
        )}

        {(step === 3 || step === 4 || step === 5) && (
          <View>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: "900", marginBottom: 15 }}>Nguyên liệu cho "{searchText}"</Text>
            
            {["Thịt bò", "Hành tây", "Tiêu đen"].map((item, idx) => (
              <View key={item} style={{ flexDirection: "row", alignItems: "center", backgroundColor: colors.card, padding: 15, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: colors.line }}>
                <MaterialCommunityIcons name="food-apple" size={24} color={colors.primary} />
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: "800", marginLeft: 12, flex: 1 }}>{item}</Text>
                <Text style={{ color: colors.muted, fontSize: 14, fontWeight: "700" }}>500g</Text>
              </View>
            ))}

            <View style={{ marginTop: 20, zIndex: step === 4 ? 60 : 1 }}>
              <Pressable style={{
                backgroundColor: step === 4 ? colors.primary : colors.card,
                borderWidth: step === 4 ? 0 : 1, borderColor: colors.line,
                borderRadius: 14, paddingVertical: 16, alignItems: "center",
                boxShadow: step === 4 ? "0 0 20px rgba(244,162,28,0.5)" : "none"
              }}>
                <Text style={{ color: step === 4 ? colors.white : colors.text, fontSize: 16, fontWeight: "900" }}>Lưu vào Tủ (Pantry)</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>

      {/* Fake AddIngredientScreen */}
      {step === 5 && (
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.background, zIndex: 90, padding: 22, paddingTop: 60 }}>
          <Text style={{ color: colors.text, fontSize: 28, fontWeight: "900" }}>Thêm vào tủ</Text>
          <View style={{ backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.line, padding: 16, marginTop: 18 }}>
            <Text style={{ color: colors.text, fontSize: 20, fontWeight: "900", marginBottom: 14 }}>Chọn nguyên liệu</Text>
            <View style={{ height: 46, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.16)", borderWidth: 1, borderColor: colors.line, justifyContent: "center", paddingHorizontal: 12 }}>
              <Text style={{ color: colors.muted, fontSize: 14, fontWeight: "700" }}>Tìm nguyên liệu chưa có trong tủ</Text>
            </View>
            <View style={{ marginTop: 14, flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.white, padding: 10, borderRadius: 14, borderWidth: 2, borderColor: colors.primary }}>
              <View style={{ width: 58, height: 58, borderRadius: 12, backgroundColor: colors.secondary, alignItems: "center", justifyContent: "center" }}>
                <MaterialCommunityIcons name="food-apple" size={32} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                 <Text style={{ color: colors.textDark, fontSize: 16, fontWeight: "900" }}>Thịt bò</Text>
                 <Text style={{ color: colors.mutedDark, fontSize: 12, fontWeight: "800" }}>Thịt · kg</Text>
              </View>
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}>
                 <MaterialCommunityIcons name="check" size={19} color={colors.white} />
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Overlay Background */}
      {(step === 0 || step === 1 || step === 4 || step === 5 || step === 6) && (
        <View style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0, backgroundColor: "rgba(0,0,0,0.6)", zIndex: step === 5 ? 95 : 10 }} pointerEvents="none" />
      )}

      {/* Tooltips */}
      {step === 0 && renderTooltip("Chào mừng đến Z-Pantry! \uD83C\uDF89", "Mình sẽ hướng dẫn bạn cách sử dụng các tính năng tuyệt vời của app nhé. Sẽ rất nhanh thôi!")}
      {step === 1 && renderTooltip("Nhập món ăn đầu tiên", "Hãy thử nhập một món ăn bất kỳ mà bạn muốn nấu hôm nay vào ô tìm kiếm phía trên.", false)}
      {step === 3 && renderTooltip("Tuyệt vời! \uD83E\uDD16", "Z-Pantry AI đã tự động phân tích món ăn của bạn thành các nguyên liệu cần thiết.")}
      {step === 4 && renderTooltip("Thêm vào Tủ lạnh", "Bạn có thể lưu ngay các nguyên liệu này vào tủ lạnh ảo của mình chỉ với một nút bấm ở trên.")}
      {step === 5 && renderTooltip("Chi tiết nguyên liệu", "Tại đây bạn có thể tìm kiếm nguyên liệu và chọn nó để thêm vào tủ của bạn. Hãy điền số lượng và hạn sử dụng tương ứng nhé!")}
      {step === 6 && renderTooltip("Hoàn thành! \uD83C\uDF1F", "Bạn đã nắm được cách Z-Pantry hoạt động. Khám phá tủ lạnh và các công thức ngon ngay bây giờ nhé!")}
      
    </SafeAreaView>
  );
}
