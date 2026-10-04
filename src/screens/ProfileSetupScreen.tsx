import FigmaAsset, { type DesignAsset } from '@/components/FigmaAsset';
import { surveyAssets as assets } from '@/constants/figmaAssets';
import Text from "@/components/AppText";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import DateField from "@/components/DateField";
import MeasurementSlider from "@/components/MeasurementSlider";
import ScrollView from "@/components/ScreenScrollView";
import { SafeAreaView } from "react-native-safe-area-context";
import { profileApi, goals, diets, activityLevels, type ProfilePayload, type HealthProfile, type FoodAllergen } from "@/api/profile";
import AllergenChoices from "@/components/AllergenChoices";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import SelectField from "@/components/SelectField";
import PrimaryButton from "@/components/PrimaryButton";
import { colors } from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { getFriendlyErrorMessage } from "@/utils/localize";
import { parseBirthDate } from "@/utils/userProfile";

export default function ProfileSetupScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const editing = route.params?.editing === true;
  const { user, completeOnboardingStep } = useAuth();
  const [birthDate, setBirthDate] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [gender, setGender] = useState("");
  const [selectedGoals, setSelectedGoals] = useState<ProfilePayload["goals"]>([]);
  const [diet, setDiet] = useState<ProfilePayload["dietPreference"]>("NONE");
  const [activity, setActivity] = useState<ProfilePayload["activityLevel"] | "">("");
  const [allergies, setAllergies] = useState<FoodAllergen[]>([]);
  const [savedProfile, setSavedProfile] = useState<HealthProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  const [error, setError] = useState("");
  const [savedWithWarning, setSavedWithWarning] = useState(false);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      if (!user?.userId) throw new Error("Không xác định được tài khoản.");
      const p = await profileApi.getCurrent();
      setBirthDate(p.birthDate ?? ""); setHeight(p.heightCm == null ? "" : String(p.heightCm));
      setWeight(p.weightKg == null ? "" : String(p.weightKg)); setGender(p.gender ?? "");
      setSelectedGoals(p.goals ?? []); setDiet(p.dietPreference ?? "NONE"); setActivity(p.activityLevel ?? "");
      setAllergies((p.allergies ?? []).filter((value): value is FoodAllergen => value !== "NO_ALLERGIES"));
      setSavedProfile(p); setLoaded(true);
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
    const h = numeric(height), w = numeric(weight);
    if (!parseBirthDate(birthDate)) {
      setError("Vui lòng chọn ngày sinh hợp lệ, không nằm trong tương lai."); return;
    }
    if (h === null || !Number.isFinite(h) || h < 50 || h > 300 ||
      w === null || !Number.isFinite(w) || w < 20 || w > 500) {
      setError("Chiều cao cần trong khoảng 50–300 cm, cân nặng trong khoảng 20–500 kg."); return;
    }
    if (!gender || !activity) {
      setError("Vui lòng chọn giới tính và mức vận động để lưu hồ sơ."); return;
    }
    busy.current = true; setSaving(true); setError(""); setSavedWithWarning(false);
    try {
      const result = await profileApi.saveCurrent({ birthDate, heightCm: h, weightKg: w,
        gender: gender as ProfilePayload["gender"], activityLevel: activity, goals: selectedGoals, dietPreference: diet,
        allergies: allergies.length ? allergies : ["NO_ALLERGIES"] });
      setSavedProfile(result);
      if (result.healthWarning || result.weightLossAllowed === false) {
        setSavedWithWarning(true);
        return;
      }
      if (editing) navigation.goBack();
      else { await completeOnboardingStep("interactive_guide"); navigation.reset({ index: 0, routes: [{ name: "Tabs" }] }); }
    } catch (e) { setError(getFriendlyErrorMessage(e, "Chưa lưu được hồ sơ. Các thông tin bạn nhập vẫn được giữ lại.")); }
    finally { busy.current = false; setSaving(false); }
  };
  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
    <ScrollView keyboardShouldPersistTaps="handled" contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: 16, paddingTop: 52, paddingBottom: 40, gap: 22, width: "100%", maxWidth: 680, alignSelf: "center" }}>
      <Pressable disabled={saving} onPress={leave} accessibilityRole="button" style={{ minHeight: 44, justifyContent: "center" }}>
        <Text style={{ color: colors.primary, fontWeight: "600" }}>{editing ? "‹ Quay lại" : "Để sau"}</Text>
      </Pressable>
      <View style={{ gap: 8 }}><Text style={{ color: colors.text, fontSize: 24, fontWeight: "700" }}>Khẩu vị & Thể trạng của bạn</Text>
        <Text style={{ color: colors.muted, lineHeight: 22 }}>Lưu thể trạng, sở thích và dị ứng để cá nhân hóa bữa ăn. Bạn có thể cập nhật sau hoặc chọn để sau.</Text></View>
      {loading ? <ActivityIndicator size="large" color={colors.primary} /> : null}
      {error && !loaded ? <View accessibilityRole="alert" style={{ gap: 8 }}><Text selectable style={{ color: colors.danger, lineHeight: 22 }}>{error}</Text>
        {!loaded && !loading ? <Pressable onPress={load} style={{ padding: 12 }}><Text style={{ color: colors.primary }}>Thử tải lại hồ sơ</Text></Pressable> : null}</View> : null}
      {loaded ? <View pointerEvents={saving ? "none" : "auto"} style={{ gap: 22, opacity: saving ? 0.65 : 1 }}>
        <View style={{ gap: 22 }}>
          <SurveyLabel title="1. Giới tính của bạn" asset={assets.imgContainer12} />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {[{ value: 'MALE', label: 'Nam', image: assets.imgAb6AXuBQn90ZBiOWubXUyM9TUQaqOsYd9FvjcWkU5TnTg7YiAyoIiBp92FZwxSnSFf7BTopiqMnKyi9WmS2Q29IZcItaXkqJvpsthoIm55G3SNn0Dik3DSw4OiHrPmMeGmcflqzWobIezCe8XRo2Zwn8LpZisDy0IYsDnpKDm6LpmTuiF6LMv3Nf24KwUThazRoSix5Y1WlYnQnbFVb1IA6SgQt813Nc09T5Izj1XeJjFSiOg3UrbU1TiZ },
              { value: 'FEMALE', label: 'Nữ', image: assets.imgAb6AXuD986CIfnCoJvsK9SwdQi1NgYa9L75BkN1SaenDVgPr4VuqlVfglSlJ3Qd3SzVapqz9Qoi8EqsZWqWmcQJpqN55NHowIulI8RmpOfutNqCPbR3OKznQcTs1Ot7ZGuuBc9NaKreE6Cezk31BGho1NtIrJAlQzsEifsN9KByuRbHac89Z2XxuK38GuoDe47YUdkwHcnuLu0RYqDoUImjVWGpe8MGj7WeGsDxPzMv2Ji5ZujfWhKg },
              { value: 'OTHER', label: 'Khác', image: assets.imgAb6AXuAhmSLtdNwvujcEe8Brgup21Eilw9P8CLr5Ux71Nm2JxzDe08TYelpLcbe7UKkcvaIXv92DBiNzV8MGViYk6Dughw0L3X2KTDkoq3EvnbrZZtF6TNq5RtJxJXtXjHjhP11J1NfvC8DqV8Kqun1Mb9OQ1Ye3W86FcOdRk9RH3IHpXejs7KwFkoKijbmtKnexbFHq4M2P36CJa0CMcfzR9JuMyA6TrKnTy4VXbrVlKfxvxRne1 }].map(item => <Pressable key={item.value} accessibilityRole="radio" accessibilityLabel={item.label} aria-checked={gender === item.value} accessibilityState={{ checked: gender === item.value, disabled: saving }} disabled={saving} onPress={() => setGender(item.value)} style={{ flex: 1, minHeight: 96, gap: 8, padding: 12, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: gender === item.value ? colors.secondary : colors.surface, borderWidth: 1, borderColor: gender === item.value ? colors.primary : colors.line }}>
                <FigmaAsset asset={item.image} fit="cover" style={{ width: 56, height: 56, borderRadius: 28 }} /><Text style={{ color: colors.text, fontSize: 12 }}>{item.label}</Text>
              </Pressable>)}
          </View>
          <View style={{ gap: 8 }}>
            <SurveyLabel title="2. Sinh nhật của bạn" asset={assets.imgContainer13} />
            <DateField label="Ngày sinh" value={birthDate} onChange={setBirthDate} birthday disabled={saving} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ flex: 1 }}><SurveyLabel title="3. Chiều cao & Cân nặng" asset={assets.imgContainer14} /></View>
            {Number(height) > 0 && Number(weight) > 0 ? <Text style={{ backgroundColor: colors.successSoft, padding: 6, borderRadius: 10, color: colors.dark, fontSize: 11 }}>BMI: {(Number(weight) / (Number(height) / 100) ** 2).toFixed(1)}</Text> : null}
          </View>
          <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 18, gap: 20, boxShadow: '0 2px 6px rgba(0,48,20,0.06)' }}>
            <MeasurementSlider label="Chiều cao" value={height} onChange={setHeight} unit="cm" min={140} max={200} fallback={168} icon="ruler" disabled={saving} />
            <View style={{ height: 1, backgroundColor: colors.line }} />
            <MeasurementSlider label="Cân nặng" value={weight} onChange={setWeight} unit="kg" min={40} max={120} fallback={58} icon="weight-kilogram" disabled={saving} />
          </View>
          <SelectField label="Mức vận động" value={activity} disabled={saving} onValueChange={v => setActivity(v as ProfilePayload["activityLevel"])}
            options={[{ value: "", label: "Chọn mức vận động" }, ...activityLevels]} />
        </View>
        <ChoiceCards title="4. Mục tiêu ẩm thực của bạn · chọn nhiều" value={selectedGoals} options={[...goals].sort((a,b) => {
          const order: readonly string[] = ['WEIGHT_LOSS','MUSCLE_GAIN','VITAMIN_BALANCE','QUICK_COOKING','WASTE_REDUCTION'];
          return (order.includes(a.value) ? order.indexOf(a.value) : 99) - (order.includes(b.value) ? order.indexOf(b.value) : 99);
        })}
          onChange={v => setSelectedGoals(values => values.includes(v as ProfilePayload["goals"][number]) ? values.filter(value => value !== v) : [...values, v as ProfilePayload["goals"][number]])} />
        <ChoiceCards title="5. Chế độ ăn đặc thù" value={diet} options={diets} disabled={saving} onChange={v => setDiet(v as ProfilePayload["dietPreference"])} />
        <View style={{ gap: 12 }}><SurveyLabel title="6. Thực phẩm dễ gây dị ứng" asset={assets.imgContainer24} />
          <Text style={{ color: colors.muted, lineHeight: 21 }}>Chọn tất cả mục phù hợp. Không chọn mục nào nếu bạn không khai báo dị ứng.</Text>
          <AllergenChoices value={allergies} onChange={setAllergies} disabled={saving} />
          <Text style={{ color: colors.muted, lineHeight: 21 }}>Kiểm tra thành phần thực tế trước khi nấu; dữ liệu món có thể chưa đầy đủ.</Text>
        </View>
        {savedProfile ? <View style={{ backgroundColor: colors.card, padding: 18, borderRadius: 18, gap: 12 }}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: "600" }}>Theo hồ sơ đã lưu</Text>
          {[
            ["BMI", savedProfile.bmi, ""], ["Năng lượng mỗi ngày", savedProfile.dailyCalorieTarget, "kcal"],
            ["Protein mỗi ngày", savedProfile.dailyProteinTarget, "g"], ["Năng lượng mỗi bữa", savedProfile.perMealCalorieTarget, "kcal"],
            ["Protein mỗi bữa", savedProfile.perMealProteinTarget, "g"]
          ].map(([label, value, unit]) => typeof value === "number" && Number.isFinite(value) ?
            <Text key={String(label)} style={{ color: colors.text }}>{label}: {value.toLocaleString("vi-VN", { maximumFractionDigits: 1 })} {unit}</Text> : null)}
          {savedProfile.healthWarning ? <Text accessibilityRole="alert" style={{ color: colors.warning, lineHeight: 21 }}>{savedProfile.healthWarning}</Text> : null}
          {savedProfile.weightLossAllowed === false ? <Text style={{ color: colors.warning }}>Hồ sơ hiện tại chưa được phép chọn mục tiêu giảm cân.</Text> : null}
        </View> : null}
      </View> : null}
      {error && loaded ? <Text accessibilityRole="alert" selectable style={{ color: colors.danger, lineHeight: 22 }}>{error}</Text> : null}
      {savedWithWarning ? <View style={{ gap: 12 }}>
        <Text accessibilityRole="alert" style={{ color: colors.success, lineHeight: 21 }}>Đã lưu hồ sơ. Xem thông tin từ máy chủ phía trên trước khi tiếp tục.</Text>
        <PrimaryButton title={editing ? "Quay lại hồ sơ" : "Tiếp tục"} onPress={leave} disabled={saving} />
      </View> : null}
      <Pressable accessibilityRole="button" disabled={!loaded || saving || loading} onPress={save}
        style={{ minHeight: 56, padding: 15, borderRadius: 12, backgroundColor: colors.primary, alignItems: "center", opacity: !loaded || saving ? 0.5 : 1 }}>
        <Text style={{ color: colors.white, fontWeight: "700", fontSize: 16 }}>{saving ? "Đang lưu hồ sơ…" : editing ? "Lưu hồ sơ" : "Hoàn tất & Khám phá Pantry"}</Text>
      </Pressable>
    </ScrollView>
  </SafeAreaView>;
}
function SurveyLabel({ title, asset }: { title: string; asset: DesignAsset }) {
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><FigmaAsset asset={asset} /><Text style={{ color: colors.text, fontSize: 14, fontWeight: '600', flex: 1 }}>{title}</Text></View>;
}
function ChoiceCards({ title, value, options, onChange, disabled = false }: { title: string; value: string | string[]; options: readonly { value: string; label: string }[]; onChange: (v: string) => void; disabled?: boolean }) {
  const multiple = Array.isArray(value);
  const iconMap: Record<string, DesignAsset> = multiple ? {
    WEIGHT_LOSS: assets.imgContainer11, MUSCLE_GAIN: assets.imgContainer10, HIGH_PROTEIN: assets.imgContainer10, WEIGHT_GAIN: assets.imgContainer10, MAINTAIN_WEIGHT: assets.imgContainer9,
    HEALTHY_EATING: assets.imgContainer9, VITAMIN_BALANCE: assets.imgContainer9, QUICK_COOKING: assets.imgContainer8, WASTE_REDUCTION: assets.imgContainer
  } : { HIGH_PROTEIN: assets.imgContainer21, NONE: assets.imgContainer23, EAT_CLEAN: assets.imgContainer20, KETO: assets.imgContainer21, LOW_CARB: assets.imgContainer21, VEGAN: assets.imgContainer22, VEGETARIAN: assets.imgContainer22, DIVERSE: assets.imgContainer23 };
  return <View style={{ gap: 12 }}><SurveyLabel title={title} asset={multiple ? assets.imgContainer18 : assets.imgContainer19} />
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      {options.map(option => {
        const selected = Array.isArray(value) ? value.includes(option.value) : value === option.value;
        const asset = iconMap[option.value];
        return <Pressable key={option.value} accessibilityRole={multiple ? 'checkbox' : 'radio'} accessibilityLabel={option.label} aria-checked={selected} disabled={disabled} accessibilityState={{ checked: selected, disabled }} onPress={() => onChange(option.value)}
          style={({ pressed }) => ({ width: multiple && option.value !== 'WASTE_REDUCTION' ? '47%' : '100%', flexGrow: 1, minHeight: multiple ? 94 : 64, padding: 12, gap: 8, borderRadius: 12, flexDirection: multiple ? 'column' : 'row', alignItems: multiple ? 'flex-start' : 'center', backgroundColor: selected ? colors.secondary : colors.surface, borderWidth: 1, borderColor: selected ? colors.primary : colors.line, opacity: pressed ? 0.7 : 1 })}>
          {asset ? <View style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: option.value === 'WEIGHT_LOSS' ? '#FFDBD9' : option.value === 'MUSCLE_GAIN' ? '#FFDABD' : colors.successSoft, alignItems: 'center', justifyContent: 'center' }}><FigmaAsset asset={asset} /></View> : <MaterialCommunityIcons name="target" size={24} color={colors.primaryDark} />}
          <Text style={{ flex: multiple ? undefined : 1, color: colors.text, fontSize: 13, fontWeight: '600' }}>{option.label}</Text>
          {!multiple ? <View style={{ width: 16, height: 16, borderRadius: 8, borderWidth: selected ? 5 : 1, borderColor: selected ? colors.primary : colors.line }} /> : null}
        </Pressable>;
      })}
    </View>
  </View>;
}
