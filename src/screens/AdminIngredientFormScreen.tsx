import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Ingredient, IngredientPayload } from "@/api/ingredients";
import { ingredientsApi } from "@/api/ingredients";
import type { UploadFile } from "@/api/recipes";
import { colors } from "@/constants/colors";
import { useToast } from "@/context/ToastContext";
import { FALLBACK_FOOD_IMAGE_URL, normalizeRemoteImageUrl } from "@/utils/image";
import { pickUploadImage } from "@/utils/pickUploadImage";

type IngredientFormState = {
  id: string;
  name: string;
  category: string;
  unit: string;
  caloriesPerUnit: string;
  proteinPerUnit: string;
  fatPerUnit: string;
  carbPerUnit: string;
  imageUrl: string;
  imageFile: UploadFile | null;
  localImageUri: string;
  gradientFrom: string;
  gradientTo: string;
};

const emptyIngredientForm: IngredientFormState = {
  id: "",
  name: "",
  category: "Vegetable",
  unit: "g",
  caloriesPerUnit: "0",
  proteinPerUnit: "0",
  fatPerUnit: "0",
  carbPerUnit: "0",
  imageUrl: "",
  imageFile: null,
  localImageUri: "",
  gradientFrom: "#F4A21C",
  gradientTo: "#39D98A"
};

function toNumber(value: string) {
  const number = Number(value.replace(",", "."));
  return Number.isFinite(number) ? number : 0;
}

function buildIngredientForm(ingredient?: Ingredient): IngredientFormState {
  if (!ingredient) return emptyIngredientForm;
  return {
    id: ingredient.id,
    name: ingredient.name,
    category: ingredient.category || "Other",
    unit: ingredient.unit || "g",
    caloriesPerUnit: String(ingredient.caloriesPerUnit ?? 0),
    proteinPerUnit: String(ingredient.proteinPerUnit ?? 0),
    fatPerUnit: String(ingredient.fatPerUnit ?? 0),
    carbPerUnit: String(ingredient.carbPerUnit ?? 0),
    imageUrl: ingredient.imageUrl || "",
    imageFile: null,
    localImageUri: "",
    gradientFrom: ingredient.gradientFrom || "#F4A21C",
    gradientTo: ingredient.gradientTo || "#39D98A"
  };
}

export default function AdminIngredientFormScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const toast = useToast();
  const ingredient = route.params?.ingredient as Ingredient | undefined;
  const [form, setForm] = useState<IngredientFormState>(() => buildIngredientForm(ingredient));
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const chooseImage = async () => {
    try {
      const picked = await pickUploadImage("ingredient");
      if (!picked) return;
      setForm((current) => ({ ...current, imageFile: picked.file, localImageUri: picked.uri }));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Chưa chọn được ảnh.");
    }
  };

  const saveIngredient = async () => {
    const cleanName = form.name.trim();
    const cleanUnit = form.unit.trim();
    if (!cleanName) {
      setErrorMessage("Vui lòng nhập tên nguyên liệu.");
      return;
    }
    if (!cleanUnit) {
      setErrorMessage("Vui lòng nhập đơn vị.");
      return;
    }

    const payload: IngredientPayload = {
      name: cleanName,
      category: form.category.trim() || "Other",
      unit: cleanUnit,
      caloriesPerUnit: toNumber(form.caloriesPerUnit),
      proteinPerUnit: toNumber(form.proteinPerUnit),
      fatPerUnit: toNumber(form.fatPerUnit),
      carbPerUnit: toNumber(form.carbPerUnit),
      imageUrl: form.imageUrl.trim(),
      gradientFrom: form.gradientFrom.trim(),
      gradientTo: form.gradientTo.trim(),
      imageFile: form.imageFile
    };

    setIsSaving(true);
    setErrorMessage("");
    try {
      if (form.id) {
        await ingredientsApi.update(form.id, payload);
        toast.show("Đã cập nhật nguyên liệu.");
      } else {
        await ingredientsApi.create(payload);
        toast.show("Đã tạo nguyên liệu mới.");
      }
      navigation.navigate("AdminManagement", { initialTab: "ingredients", showBackButton: false });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Chưa lưu được nguyên liệu.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 22, paddingBottom: 42, gap: 16 }}>
        <AdminFormHeader title={form.id ? "Sửa nguyên liệu" : "Tạo nguyên liệu"} subtitle="Quản lý nutrition, unit và ảnh hiển thị" onBack={() => navigation.goBack()} />

        {errorMessage ? <ErrorBanner message={errorMessage} /> : null}

        <RemoteImage uri={form.localImageUri || form.imageUrl} style={{ width: "100%", height: 180, borderRadius: 16, backgroundColor: colors.secondary }} />
        <Pressable onPress={chooseImage} style={({ pressed }) => ({ minHeight: 46, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, opacity: pressed ? 0.78 : 1 })}>
          <MaterialCommunityIcons name="image-plus" size={20} color={colors.primary} />
          <Text style={{ color: colors.text, fontSize: 14, fontWeight: "900" }} selectable>
            {form.localImageUri ? "Đổi ảnh upload" : "Chọn ảnh upload"}
          </Text>
        </Pressable>
        <FormInput label="Tên nguyên liệu" value={form.name} onChangeText={(name) => setForm((current) => ({ ...current, name }))} placeholder="Ví dụ: Cà rốt" />

        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <FormInput label="Nhóm" value={form.category} onChangeText={(category) => setForm((current) => ({ ...current, category }))} placeholder="Vegetable" />
          </View>
          <View style={{ flex: 1 }}>
            <FormInput label="Đơn vị" value={form.unit} onChangeText={(unit) => setForm((current) => ({ ...current, unit }))} placeholder="g" />
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <FormInput label="Calories" value={form.caloriesPerUnit} onChangeText={(caloriesPerUnit) => setForm((current) => ({ ...current, caloriesPerUnit }))} placeholder="0" keyboardType="decimal-pad" />
          </View>
          <View style={{ flex: 1 }}>
            <FormInput label="Protein" value={form.proteinPerUnit} onChangeText={(proteinPerUnit) => setForm((current) => ({ ...current, proteinPerUnit }))} placeholder="0" keyboardType="decimal-pad" />
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <FormInput label="Fat" value={form.fatPerUnit} onChangeText={(fatPerUnit) => setForm((current) => ({ ...current, fatPerUnit }))} placeholder="0" keyboardType="decimal-pad" />
          </View>
          <View style={{ flex: 1 }}>
            <FormInput label="Carb" value={form.carbPerUnit} onChangeText={(carbPerUnit) => setForm((current) => ({ ...current, carbPerUnit }))} placeholder="0" keyboardType="decimal-pad" />
          </View>
        </View>

        <FormInput label="Image URL" value={form.imageUrl} onChangeText={(imageUrl) => setForm((current) => ({ ...current, imageUrl }))} placeholder="https://..." />
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <FormInput label="Gradient From" value={form.gradientFrom} onChangeText={(gradientFrom) => setForm((current) => ({ ...current, gradientFrom }))} placeholder="#F4A21C" />
          </View>
          <View style={{ flex: 1 }}>
            <FormInput label="Gradient To" value={form.gradientTo} onChangeText={(gradientTo) => setForm((current) => ({ ...current, gradientTo }))} placeholder="#39D98A" />
          </View>
        </View>
        <FormActions isSaving={isSaving} saveLabel={form.id ? "Lưu nguyên liệu" : "Tạo nguyên liệu"} onSave={saveIngredient} onCancel={() => navigation.goBack()} />
      </ScrollView>
    </SafeAreaView>
  );
}

function AdminFormHeader({ title, subtitle, onBack }: { title: string; subtitle: string; onBack: () => void }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <Pressable onPress={onBack} style={({ pressed }) => ({ width: 46, height: 46, borderRadius: 23, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.78 : 1 })}>
        <Ionicons name="chevron-back" size={25} color={colors.primary} />
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontSize: 24, fontWeight: "900" }} selectable>
          {title}
        </Text>
        <Text style={{ color: colors.muted, fontSize: 13, fontWeight: "700", marginTop: 2 }} selectable>
          {subtitle}
        </Text>
      </View>
    </View>
  );
}

function RemoteImage({ uri, style }: { uri?: string | null; style: object }) {
  const [failed, setFailed] = useState(false);
  return <Image source={{ uri: failed ? FALLBACK_FOOD_IMAGE_URL : normalizeRemoteImageUrl(uri) }} onError={() => setFailed(true)} style={style} />;
}

function FormInput({ label, value, onChangeText, placeholder, keyboardType }: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; keyboardType?: "default" | "decimal-pad" }) {
  return (
    <View style={{ gap: 7 }}>
      <Text style={{ color: colors.text, fontSize: 12, fontWeight: "900" }} selectable>
        {label}
      </Text>
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.muted} keyboardType={keyboardType} style={{ minHeight: 46, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.14)", borderWidth: 1, borderColor: colors.line, color: colors.text, fontSize: 14, fontWeight: "700", paddingHorizontal: 12 }} />
    </View>
  );
}

function FormActions({ isSaving, saveLabel, onSave, onCancel }: { isSaving: boolean; saveLabel: string; onSave: () => void; onCancel: () => void }) {
  return (
    <View style={{ flexDirection: "row", gap: 10 }}>
      <Pressable onPress={onCancel} disabled={isSaving} style={({ pressed }) => ({ flex: 1, minHeight: 52, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.14)", borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center", opacity: pressed || isSaving ? 0.76 : 1 })}>
        <Text style={{ color: colors.text, fontWeight: "900" }} selectable>
          Hủy
        </Text>
      </Pressable>
      <Pressable onPress={onSave} disabled={isSaving} style={({ pressed }) => ({ flex: 1.4, minHeight: 52, borderRadius: 14, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, opacity: pressed || isSaving ? 0.76 : 1 })}>
        {isSaving ? <ActivityIndicator color={colors.textDark} /> : <MaterialCommunityIcons name="content-save" size={20} color={colors.textDark} />}
        <Text style={{ color: colors.textDark, fontWeight: "900" }} selectable>
          {isSaving ? "Đang lưu..." : saveLabel}
        </Text>
      </Pressable>
    </View>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <View style={{ borderRadius: 14, backgroundColor: "rgba(255,77,79,0.18)", borderWidth: 1, borderColor: "rgba(255,77,79,0.45)", padding: 13 }}>
      <Text style={{ color: "#FFE6E6", fontSize: 13, fontWeight: "800", lineHeight: 20 }} selectable>
        {message}
      </Text>
    </View>
  );
}
