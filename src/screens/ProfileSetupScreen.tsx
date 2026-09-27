import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { usersApi } from "@/api/users";
import { colors } from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";

const GOALS = ["Giảm cân", "Tăng cơ", "Giữ dáng", "Ăn uống lành mạnh", "Khác"];
const DIETS = ["Ăn chay", "Eat Clean", "Keto", "Low-carb", "Không kiêng", "Khác"];
const ALLERGIES = ["Hải sản", "Đậu phộng", "Sữa", "Trứng", "Gluten", "Khác"];

export default function ProfileSetupScreen() {
  const navigation = useNavigation<any>();
  const { user, completeOnboardingStep, signOut } = useAuth();
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<"Nam" | "Nữ" | "Khác" | "">("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [selectedDiets, setSelectedDiets] = useState<string[]>([]);
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);

  const [customGoal, setCustomGoal] = useState("");
  const [customDiet, setCustomDiet] = useState("");
  const [customAllergy, setCustomAllergy] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleSelection = (item: string, list: string[], setList: (v: string[]) => void) => {
    if (list.includes(item)) {
      setList(list.filter((i) => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  const handleComplete = async () => {
    if (!age || !gender || !height || !weight) return;

    setIsSubmitting(true);
    try {
      const getFinalString = (selected: string[], custom: string) => {
        const filtered = selected.filter((i) => i !== "Khác");
        if (selected.includes("Khác") && custom.trim()) {
          filtered.push(custom.trim());
        }
        return filtered.join(", ");
      };

      await usersApi.updateProfile(user?.userId || "", {
        age: parseInt(age, 10),
        gender,
        height: parseFloat(height),
        weight: parseFloat(weight),
        goal: getFinalString(selectedGoals, customGoal),
        dietPreference: getFinalString(selectedDiets, customDiet),
        allergies: getFinalString(selectedAllergies, customAllergy)
      });
      await completeOnboardingStep("interactive_guide");
      navigation.reset({ index: 0, routes: [{ name: "Tabs" }] });
    } catch (error: any) {
      console.error("Profile Setup Error:", error);
      Alert.alert("Lỗi", error?.message || "Không thể lưu thông tin. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    await completeOnboardingStep("interactive_guide");
    navigation.reset({ index: 0, routes: [{ name: "Tabs" }] });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top", "bottom"]}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 10, paddingBottom: 15 }}>
        <Text style={{ color: colors.text, fontSize: 22, fontWeight: "900" }}>Thông tin cá nhân</Text>
        <View style={{ flexDirection: "row", gap: 15, alignItems: "center" }}>
          <Pressable onPress={signOut} hitSlop={10}>
            <Text style={{ color: colors.danger, fontSize: 15, fontWeight: "700" }}>Đăng xuất</Text>
          </Pressable>
          <Pressable onPress={handleSkip} hitSlop={10}>
            <Text style={{ color: colors.muted, fontSize: 15, fontWeight: "700" }}>Bỏ qua</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
      >
        <Text style={{ color: colors.muted, fontSize: 14, fontWeight: "700", marginBottom: 25 }}>
          Thiết lập thông tin để Z-Pantry có thể gợi ý các công thức và thực đơn phù hợp nhất với bạn.
        </Text>

        {/* Bắt buộc */}
        <View style={{ gap: 20, marginBottom: 30 }}>
          <View style={{ flexDirection: "row", gap: 15 }}>
            <View style={{ flex: 1, gap: 8 }}>
              <Text style={{ color: colors.text, fontSize: 14, fontWeight: "800" }}>Tuổi <Text style={{ color: colors.danger }}>*</Text></Text>
              <TextInput 
                value={age} 
                onChangeText={setAge} 
                keyboardType="numeric" 
                placeholder="Ví dụ: 25" 
                placeholderTextColor={colors.muted}
                style={{ height: 48, backgroundColor: colors.card, borderRadius: 10, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 15, color: colors.text, fontSize: 15, fontWeight: "700" }} 
              />
            </View>
            <View style={{ flex: 1, gap: 8 }}>
              <Text style={{ color: colors.text, fontSize: 14, fontWeight: "800" }}>Giới tính <Text style={{ color: colors.danger }}>*</Text></Text>
              <View style={{ flexDirection: "row", backgroundColor: colors.card, borderRadius: 10, borderWidth: 1, borderColor: colors.line, overflow: "hidden" }}>
                {(["Nam", "Nữ"] as const).map((g) => {
                  const isSelected = gender === g;
                  return (
                    <Pressable 
                      key={g} 
                      onPress={() => setGender(g)}
                      style={{ flex: 1, height: 46, alignItems: "center", justifyContent: "center", backgroundColor: isSelected ? colors.primary : "transparent" }}
                    >
                      <Text style={{ color: isSelected ? colors.white : colors.muted, fontSize: 14, fontWeight: "800" }}>{g}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 15 }}>
            <View style={{ flex: 1, gap: 8 }}>
              <Text style={{ color: colors.text, fontSize: 14, fontWeight: "800" }}>Chiều cao (cm) <Text style={{ color: colors.danger }}>*</Text></Text>
              <TextInput 
                value={height} 
                onChangeText={setHeight} 
                keyboardType="numeric" 
                placeholder="Ví dụ: 170" 
                placeholderTextColor={colors.muted}
                style={{ height: 48, backgroundColor: colors.card, borderRadius: 10, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 15, color: colors.text, fontSize: 15, fontWeight: "700" }} 
              />
            </View>
            <View style={{ flex: 1, gap: 8 }}>
              <Text style={{ color: colors.text, fontSize: 14, fontWeight: "800" }}>Cân nặng (kg) <Text style={{ color: colors.danger }}>*</Text></Text>
              <TextInput 
                value={weight} 
                onChangeText={setWeight} 
                keyboardType="numeric" 
                placeholder="Ví dụ: 65" 
                placeholderTextColor={colors.muted}
                style={{ height: 48, backgroundColor: colors.card, borderRadius: 10, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 15, color: colors.text, fontSize: 15, fontWeight: "700" }} 
              />
            </View>
          </View>
        </View>

        <View style={{ height: 1, backgroundColor: colors.line, marginBottom: 25 }} />

        {/* Không bắt buộc */}
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: "900", marginBottom: 5 }}>Tuỳ chọn bổ sung</Text>
        <Text style={{ color: colors.muted, fontSize: 13, fontWeight: "700", marginBottom: 20 }}>Bạn có thể thiết lập các thông tin này sau.</Text>

        <View style={{ gap: 25 }}>
          <View style={{ gap: 12 }}>
            <Text style={{ color: colors.text, fontSize: 15, fontWeight: "800" }}>Mục tiêu của bạn</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {GOALS.map((g) => (
                <Chip key={g} label={g} selected={selectedGoals.includes(g)} onPress={() => toggleSelection(g, selectedGoals, setSelectedGoals)} />
              ))}
            </View>
            {selectedGoals.includes("Khác") && (
              <TextInput
                value={customGoal}
                onChangeText={setCustomGoal}
                placeholder="Nhập mục tiêu khác..."
                placeholderTextColor={colors.muted}
                style={{ height: 44, backgroundColor: colors.card, borderRadius: 10, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 15, color: colors.text, fontSize: 14, fontWeight: "700", marginTop: 4 }}
              />
            )}
          </View>

          <View style={{ gap: 12 }}>
            <Text style={{ color: colors.text, fontSize: 15, fontWeight: "800" }}>Chế độ ăn, khẩu vị</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {DIETS.map((d) => (
                <Chip key={d} label={d} selected={selectedDiets.includes(d)} onPress={() => toggleSelection(d, selectedDiets, setSelectedDiets)} />
              ))}
            </View>
            {selectedDiets.includes("Khác") && (
              <TextInput
                value={customDiet}
                onChangeText={setCustomDiet}
                placeholder="Nhập chế độ ăn khác..."
                placeholderTextColor={colors.muted}
                style={{ height: 44, backgroundColor: colors.card, borderRadius: 10, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 15, color: colors.text, fontSize: 14, fontWeight: "700", marginTop: 4 }}
              />
            )}
          </View>

          <View style={{ gap: 12 }}>
            <Text style={{ color: colors.text, fontSize: 15, fontWeight: "800" }}>Dị ứng thực phẩm</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {ALLERGIES.map((a) => (
                <Chip key={a} label={a} selected={selectedAllergies.includes(a)} onPress={() => toggleSelection(a, selectedAllergies, setSelectedAllergies)} />
              ))}
            </View>
            {selectedAllergies.includes("Khác") && (
              <TextInput
                value={customAllergy}
                onChangeText={setCustomAllergy}
                placeholder="Nhập dị ứng khác..."
                placeholderTextColor={colors.muted}
                style={{ height: 44, backgroundColor: colors.card, borderRadius: 10, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 15, color: colors.text, fontSize: 14, fontWeight: "700", marginTop: 4 }}
              />
            )}
          </View>
        </View>
      </ScrollView>

      <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingVertical: 20, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.line }}>
        <Pressable 
          disabled={isSubmitting || !(age && gender && height && weight)}
          onPress={handleComplete}
          style={({ pressed }) => ({
            height: 56,
            backgroundColor: (age && gender && height && weight) ? colors.primary : colors.muted,
            borderRadius: 14,
            alignItems: "center",
            justifyContent: "center",
            opacity: isSubmitting ? 0.6 : (pressed ? 0.85 : 1)
          })}
        >
          <Text style={{ color: colors.white, fontSize: 16, fontWeight: "900" }}>{isSubmitting ? "Đang lưu..." : "Hoàn thành"}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: selected ? colors.primary : colors.card,
        borderWidth: 1,
        borderColor: selected ? colors.primary : colors.line,
      }}
    >
      <Text style={{ color: selected ? colors.white : colors.text, fontSize: 13, fontWeight: "700" }}>
        {label}
      </Text>
    </Pressable>
  );
}
