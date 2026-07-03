import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { AdminUser, UpdateUserPayload } from "@/api/users";
import { usersApi } from "@/api/users";
import { colors } from "@/constants/colors";
import { useToast } from "@/context/ToastContext";
import { normalizeRemoteImageUrl } from "@/utils/image";

type UserFormState = {
  fullName: string;
  avatarUrl: string;
  password: string;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts.at(0)?.[0] || "U").toUpperCase() + (parts.at(-1)?.[0] || "").toUpperCase();
}

export default function AdminUserFormScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const toast = useToast();
  const user = route.params?.user as AdminUser | undefined;
  const [form, setForm] = useState<UserFormState>({
    fullName: user?.fullName || "",
    avatarUrl: user?.avatarUrl || "",
    password: ""
  });
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const saveUser = async () => {
    if (!user?.id) {
      setErrorMessage("Không tìm thấy user cần cập nhật.");
      return;
    }

    const cleanName = form.fullName.trim();
    if (!cleanName) {
      setErrorMessage("Vui lòng nhập tên người dùng.");
      return;
    }

    const payload: UpdateUserPayload = {
      fullName: cleanName,
      avatarUrl: form.avatarUrl.trim(),
      ...(form.password.trim() ? { password: form.password.trim() } : {})
    };

    setIsSaving(true);
    setErrorMessage("");
    try {
      await usersApi.update(user.id, payload);
      toast.show("Đã cập nhật user.");
      navigation.navigate("AdminManagement", { initialTab: "users", showBackButton: false });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Chưa cập nhật được user.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 22, paddingBottom: 42, gap: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Pressable onPress={() => navigation.goBack()} style={({ pressed }) => ({ width: 46, height: 46, borderRadius: 23, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.78 : 1 })}>
            <Ionicons name="chevron-back" size={25} color={colors.primary} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontSize: 24, fontWeight: "900" }} selectable>
              Sửa user
            </Text>
            <Text style={{ color: colors.muted, fontSize: 13, fontWeight: "700", marginTop: 2 }} selectable>
              Cập nhật hồ sơ và mật khẩu đăng nhập
            </Text>
          </View>
        </View>

        {errorMessage ? <ErrorBanner message={errorMessage} /> : null}

        <View style={{ borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 16, alignItems: "center", gap: 12 }}>
          {form.avatarUrl.trim() ? (
            <Image source={{ uri: normalizeRemoteImageUrl(form.avatarUrl) }} style={{ width: 116, height: 116, borderRadius: 58, backgroundColor: colors.secondary }} />
          ) : (
            <View style={{ width: 116, height: 116, borderRadius: 58, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: colors.textDark, fontSize: 34, fontWeight: "900" }} selectable>
                {initials(form.fullName || user?.email || "User")}
              </Text>
            </View>
          )}
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: "900", textAlign: "center" }} selectable>
            {user?.email}
          </Text>
          <View style={{ borderRadius: 999, backgroundColor: user?.role === "admin" ? colors.secondary : "rgba(255,255,255,0.16)", paddingHorizontal: 12, paddingVertical: 6 }}>
            <Text style={{ color: user?.role === "admin" ? colors.primaryDark : colors.text, fontSize: 12, fontWeight: "900" }} selectable>
              {user?.role || "user"}
            </Text>
          </View>
        </View>

        <FormInput label="Tên hiển thị" value={form.fullName} onChangeText={(fullName) => setForm((current) => ({ ...current, fullName }))} placeholder="Demo User" />
        <FormInput label="Avatar URL" value={form.avatarUrl} onChangeText={(avatarUrl) => setForm((current) => ({ ...current, avatarUrl }))} placeholder="https://..." />
        <FormInput label="Mật khẩu mới" value={form.password} onChangeText={(password) => setForm((current) => ({ ...current, password }))} placeholder="Để trống nếu không đổi" secureTextEntry />

        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pressable onPress={() => navigation.goBack()} disabled={isSaving} style={({ pressed }) => ({ flex: 1, minHeight: 52, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.14)", borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center", opacity: pressed || isSaving ? 0.76 : 1 })}>
            <Text style={{ color: colors.text, fontWeight: "900" }} selectable>
              Hủy
            </Text>
          </Pressable>
          <Pressable onPress={saveUser} disabled={isSaving} style={({ pressed }) => ({ flex: 1.4, minHeight: 52, borderRadius: 14, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, opacity: pressed || isSaving ? 0.76 : 1 })}>
            {isSaving ? <ActivityIndicator color={colors.textDark} /> : <MaterialCommunityIcons name="content-save" size={20} color={colors.textDark} />}
            <Text style={{ color: colors.textDark, fontWeight: "900" }} selectable>
              {isSaving ? "Đang lưu..." : "Lưu user"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function FormInput({ label, value, onChangeText, placeholder, secureTextEntry = false }: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; secureTextEntry?: boolean }) {
  return (
    <View style={{ gap: 7 }}>
      <Text style={{ color: colors.text, fontSize: 12, fontWeight: "900" }} selectable>
        {label}
      </Text>
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.muted} secureTextEntry={secureTextEntry} style={{ minHeight: 46, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.14)", borderWidth: 1, borderColor: colors.line, color: colors.text, fontSize: 14, fontWeight: "700", paddingHorizontal: 12 }} />
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
