import { useNavigation, useRoute } from "@react-navigation/native";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { profileApi, goals, diets, type ProfilePayload } from "@/api/profile";
import AllergenChoices from "@/components/AllergenChoices";
import SelectField from "@/components/SelectField";
import { colors } from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { getFriendlyErrorMessage } from "@/utils/localize";

export default function ProfileSetupScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const editing = route.params?.editing === true;
  const { user, completeOnboardingStep } = useAuth();
  const [age, setAge] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [gender, setGender] = useState("");
  const [goal, setGoal] = useState<ProfilePayload["goal"]>(null);
  const [diet, setDiet] = useState<ProfilePayload["dietPreference"]>(null);
  const [allergies, setAllergies] = useState<ProfilePayload["allergies"]>([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      if (!user?.userId) throw new Error("Không xác định được tài khoản.");
      const p = await profileApi.get(user.userId);
      setAge(p.age == null ? "" : String(p.age)); setHeight(p.height == null ? "" : String(p.height));
      setWeight(p.weight == null ? "" : String(p.weight)); setGender(p.gender ?? "");
      setGoal(p.goal); setDiet(p.dietPreference); setAllergies(p.allergies ?? []); setLoaded(true);
    } catch (e) { setError(getFriendlyErrorMessage(e, "Chưa tải được hồ sơ.")); }
    finally { setLoading(false); }
  }, [user?.userId]);
  useEffect(() => { void load(); }, [load]);
  const leave = async () => {
    if (busy.current) return;
    if (editing) { navigation.goBack(); return; }
    try {
      await completeOnboardingStep("interactive_guide");
      navigation.reset({ index: 0, routes: [{ name: "Tabs" }] });
    } catch { setError("Chưa thể tiếp tục. Vui lòng thử lại."); }
  };
  const save = async () => {
    if (busy.current || !loaded || !user?.userId) return;
    const numeric = (s: string) => s.trim() ? Number(s.replace(",", ".")) : null;
    const a = numeric(age), h = numeric(height), w = numeric(weight);
    if ((a !== null && (!Number.isInteger(a) || a < 1 || a > 120)) ||
      (h !== null && (!Number.isFinite(h) || h <= 0 || h > 300)) ||
      (w !== null && (!Number.isFinite(w) || w <= 0 || w > 700))) {
      setError("Kiểm tra lại tuổi (1–120), chiều cao và cân nặng. Bạn có thể để trống nếu chưa muốn cung cấp."); return;
    }
    busy.current = true; setSaving(true); setError("");
    try {
      await profileApi.save(user.userId, { age: a, height: h, weight: w, gender: gender || null, goal, dietPreference: diet, allergies });
      if (editing) navigation.goBack();
      else { await completeOnboardingStep("interactive_guide"); navigation.reset({ index: 0, routes: [{ name: "Tabs" }] }); }
    } catch (e) { setError(getFriendlyErrorMessage(e, "Chưa lưu được hồ sơ. Các thông tin bạn nhập vẫn được giữ lại.")); }
    finally { busy.current = false; setSaving(false); }
  };
  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
    <ScrollView keyboardShouldPersistTaps="handled" contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: 22, paddingBottom: 40, gap: 22, width: "100%", maxWidth: 680, alignSelf: "center" }}>
      <Pressable disabled={saving} onPress={leave} accessibilityRole="button" style={{ minHeight: 44, justifyContent: "center" }}>
        <Text style={{ color: colors.primary, fontWeight: "800" }}>{editing ? "‹ Quay lại" : "Để sau"}</Text>
      </Pressable>
      <View style={{ gap: 8 }}><Text style={{ color: colors.text, fontSize: 28, fontWeight: "900" }}>Hồ sơ ăn uống</Text>
        <Text style={{ color: colors.muted, lineHeight: 22 }}>Lưu sở thích và dị ứng cho những lần tìm món tiếp theo. Bạn có thể thay đổi bất cứ lúc nào.</Text></View>
      {loading ? <ActivityIndicator size="large" color={colors.primary} /> : null}
      {error && !loaded ? <View accessibilityRole="alert" style={{ gap: 8 }}><Text selectable style={{ color: "#FFE6E6", lineHeight: 22 }}>{error}</Text>
        {!loaded && !loading ? <Pressable onPress={load} style={{ padding: 12 }}><Text style={{ color: colors.primary }}>Thử tải lại hồ sơ</Text></Pressable> : null}</View> : null}
      {loaded ? <View pointerEvents={saving ? "none" : "auto"} style={{ gap: 22, opacity: saving ? 0.65 : 1 }}>
        <View style={{ backgroundColor: colors.card, padding: 18, borderRadius: 18, gap: 16 }}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: "800" }}>Thông tin cơ bản · tùy chọn</Text>
          <NumberField label="Tuổi" value={age} onChange={setAge} />
          <View style={{ flexDirection: "row", gap: 12 }}>
            <NumberField label="Chiều cao (cm)" value={height} onChange={setHeight} />
            <NumberField label="Cân nặng (kg)" value={weight} onChange={setWeight} />
          </View>
          <SelectField label="Giới tính" value={gender} onValueChange={setGender} options={[
            { value: "", label: "Chưa cung cấp" }, { value: "Male", label: "Nam" }, { value: "Female", label: "Nữ" }, { value: "Other", label: "Khác" }
          ]} />
        </View>
        <SelectField label="Mục tiêu · chọn một" value={goal ?? ""} onValueChange={(v) => setGoal((v || null) as ProfilePayload["goal"])} options={[{ value: "", label: "Chưa chọn" }, ...goals]} />
        <SelectField label="Chế độ ăn · chọn một" value={diet ?? ""} onValueChange={(v) => setDiet((v || null) as ProfilePayload["dietPreference"])} options={[{ value: "", label: "Chưa chọn" }, ...diets]} />
        <View style={{ gap: 12 }}><Text style={{ color: colors.text, fontSize: 18, fontWeight: "800" }}>Dị ứng thực phẩm</Text>
          <Text style={{ color: colors.muted, lineHeight: 21 }}>Chọn tất cả mục phù hợp. Không chọn mục nào nếu bạn không khai báo dị ứng.</Text>
          <AllergenChoices value={allergies} onChange={setAllergies} />
          <Text style={{ color: colors.muted, lineHeight: 21 }}>Gợi ý loại các món có chất gây dị ứng đã khai báo. Hãy kiểm tra thành phần thực tế; dữ liệu món có thể chưa đầy đủ. Mục tiêu và chế độ ăn hiện chưa được lọc tự động.</Text>
        </View>
      </View> : null}
      {error && loaded ? <Text accessibilityRole="alert" selectable style={{ color: "#FFE6E6", lineHeight: 22 }}>{error}</Text> : null}
      <Pressable accessibilityRole="button" disabled={!loaded || saving || loading} onPress={save}
        style={{ minHeight: 54, padding: 15, borderRadius: 16, backgroundColor: colors.primary, alignItems: "center", opacity: !loaded || saving ? 0.5 : 1 }}>
        <Text style={{ color: colors.textDark, fontWeight: "900", fontSize: 16 }}>{saving ? "Đang lưu hồ sơ…" : "Lưu hồ sơ"}</Text>
      </Pressable>
    </ScrollView>
  </SafeAreaView>;
}
function NumberField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return <View style={{ flex: 1, gap: 8 }}><Text style={{ color: colors.text, fontWeight: "700" }}>{label}</Text>
    <TextInput accessibilityLabel={label} value={value} onChangeText={onChange} keyboardType="decimal-pad" placeholder="Chưa cung cấp" placeholderTextColor={colors.muted}
      style={{ minHeight: 48, padding: 12, color: colors.text, borderWidth: 1, borderColor: colors.line, borderRadius: 12 }} /></View>;
}
