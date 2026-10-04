import Text from "@/components/AppText";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useState } from "react";
import { ActivityIndicator, Image, Pressable, TextInput, View } from "react-native";
import ScrollView from "@/components/ScreenScrollView";
import { SafeAreaView } from "react-native-safe-area-context";
import type { AdminUser } from "@/api/users";
import { useAuth } from "@/context/AuthContext";
import { buildUserUpdate, canUpdateUser } from "@/utils/userProfile";
import { usersApi } from "@/api/users";
import { colors } from "@/constants/colors";
import { useToast } from "@/context/ToastContext";
import { normalizeRemoteImageUrl } from "@/utils/image";
import { getFriendlyErrorMessage } from "@/utils/localize";
import { assignableRoles } from "@/utils/roles";
import SelectField from "@/components/SelectField";
import PrimaryButton from "@/components/PrimaryButton";

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
  const { user: currentUser } = useAuth();
  const user = route.params?.user as AdminUser | undefined;
  const canEdit = canUpdateUser(currentUser?.userId, user?.id);
  const [form, setForm] = useState<UserFormState>({
    fullName: user?.fullName || "",
    avatarUrl: user?.avatarUrl || "",
    password: ""
  });
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [savedRole, setSavedRole] = useState(user?.role?.toUpperCase() || "USER");
  const [role, setRole] = useState(savedRole);
  const roleOptions = assignableRoles(currentUser?.role, savedRole);
  const saveRole = async () => {
    if (isSaving || !user?.id || !roleOptions.includes(role) || role === savedRole) return;
    setIsSaving(true); setErrorMessage("");
    try {
      await usersApi.changeRole(user.id, role); setSavedRole(role);
      toast.show("Đã cập nhật vai trò. Quyền mới áp dụng sau khi người dùng đăng nhập lại.");
    } catch (e) { setErrorMessage(getFriendlyErrorMessage(e, "Chưa cập nhật được vai trò.")); }
    finally { setIsSaving(false); }
  };

  const saveUser = async () => {
    if (isSaving) return;
    if (!user?.id) {
      setErrorMessage("Không tìm thấy user cần cập nhật.");
      return;
    }

    if (!canEdit) {
      setErrorMessage("Bạn chỉ được phép cập nhật thông tin của chính tài khoản mình.");
      return;
    }

    const payload = buildUserUpdate(user, form);

    setIsSaving(true);
    setErrorMessage("");
    try {
      await usersApi.update(user.id, payload);
      toast.show("Đã cập nhật user.");
      navigation.navigate("AdminManagement", { initialTab: "users", showBackButton: false });
    } catch (error) {
      setErrorMessage(getFriendlyErrorMessage(error, "Chưa cập nhật được user."));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 22, paddingBottom: 42, gap: 16, maxWidth: 720 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Pressable onPress={() => navigation.goBack()} style={({ pressed }) => ({ width: 46, height: 46, borderRadius: 23, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.78 : 1 })}>
            <Ionicons name="chevron-back" size={25} color={colors.primary} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontSize: 24, fontWeight: "700" }} selectable>
              Quản lý tài khoản
            </Text>
            <Text style={{ color: colors.muted, fontSize: 13, fontWeight: "700", marginTop: 2 }} selectable>
              Cập nhật hồ sơ và mật khẩu đăng nhập
            </Text>
          </View>
        </View>

        {!canEdit ? <Text style={{ color: colors.muted, lineHeight: 21 }}>Hồ sơ và mật khẩu chỉ có thể được chỉnh sửa bởi chủ tài khoản.</Text> : null}
        {errorMessage ? <ErrorBanner message={errorMessage} /> : null}

        <View style={{ borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 16, alignItems: "center", gap: 12 }}>
          {form.avatarUrl.trim() ? (
            <Image source={{ uri: normalizeRemoteImageUrl(form.avatarUrl) }} style={{ width: 116, height: 116, borderRadius: 58, backgroundColor: colors.secondary }} />
          ) : (
            <View style={{ width: 116, height: 116, borderRadius: 58, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: colors.textDark, fontSize: 34, fontWeight: "700" }} selectable>
                {initials(form.fullName || user?.email || "User")}
              </Text>
            </View>
          )}
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: "700", textAlign: "center" }} selectable>
            {user?.email}
          </Text>
          <View style={{ borderRadius: 999, backgroundColor: user?.role === "admin" ? colors.secondary : colors.surface2, paddingHorizontal: 12, paddingVertical: 6 }}>
            <Text style={{ color: user?.role === "admin" ? colors.primaryDark : colors.text, fontSize: 12, fontWeight: "700" }} selectable>
              {savedRole}
            </Text>
          </View>
        </View>

        {roleOptions.length && currentUser?.userId !== user?.id ? <View style={{ padding: 18, borderRadius: 18, backgroundColor: colors.surface, gap: 12 }}>
          <Text style={{ color: colors.dark, fontSize: 19, fontWeight: "700" }}>Vai trò và quyền truy cập</Text>
          <SelectField label="Vai trò" value={role} onValueChange={setRole} disabled={isSaving} options={roleOptions.map(value => ({ value, label: ({ USER: "Người dùng", MANAGER: "Quản lý danh mục", ADMIN: "Quản trị viên", SUPER_ADMIN: "Quản trị cấp cao" } as Record<string, string>)[value] }))} />
          <Text style={{ color: colors.muted, lineHeight: 21 }}>Thay đổi quyền truy cập của tài khoản này. Người dùng cần đăng nhập lại để nhận quyền mới.</Text>
          <PrimaryButton title="Lưu vai trò" loading={isSaving} disabled={role === savedRole} onPress={saveRole} />
        </View> : null}
        <View pointerEvents={canEdit && !isSaving ? "auto" : "none"} style={{ gap: 16, opacity: canEdit ? 1 : 0.5 }}>
        <FormInput disabled={!canEdit || isSaving} label="Tên hiển thị" value={form.fullName} onChangeText={(fullName) => setForm((current) => ({ ...current, fullName }))} placeholder="Tên của bạn" />
        <FormInput disabled={!canEdit || isSaving} label="Đường dẫn ảnh đại diện" value={form.avatarUrl} onChangeText={(avatarUrl) => setForm((current) => ({ ...current, avatarUrl }))} placeholder="https://..." />
        <FormInput disabled={!canEdit || isSaving} label="Mật khẩu mới" value={form.password} onChangeText={(password) => setForm((current) => ({ ...current, password }))} placeholder="Để trống nếu không đổi" secureTextEntry />
        </View>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pressable onPress={() => navigation.goBack()} disabled={isSaving} style={({ pressed }) => ({ flex: 1, minHeight: 52, borderRadius: 14, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center", opacity: pressed || isSaving ? 0.76 : 1 })}>
            <Text style={{ color: colors.text, fontWeight: "700" }} selectable>
              Hủy
            </Text>
          </Pressable>
          <Pressable onPress={saveUser} disabled={isSaving || !canEdit} style={({ pressed }) => ({ flex: 1.4, minHeight: 52, borderRadius: 14, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, opacity: pressed || isSaving || !canEdit ? 0.76 : 1 })}>
            {isSaving ? <ActivityIndicator color={colors.textDark} /> : <MaterialCommunityIcons name="content-save" size={20} color={colors.textDark} />}
            <Text style={{ color: colors.textDark, fontWeight: "700" }} selectable>
              {isSaving ? "Đang lưu..." : "Lưu user"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function FormInput({ label, value, onChangeText, placeholder, secureTextEntry = false, disabled = false }: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; secureTextEntry?: boolean; disabled?: boolean }) {
  return (
    <View style={{ gap: 7 }}>
      <Text style={{ color: colors.text, fontSize: 12, fontWeight: "700" }} selectable>
        {label}
      </Text>
      <TextInput accessibilityLabel={label} editable={!disabled} value={value} onChangeText={onChangeText} autoCapitalize={secureTextEntry ? "none" : "sentences"} placeholder={placeholder} placeholderTextColor={colors.muted} secureTextEntry={secureTextEntry} style={{ minHeight: 46, borderRadius: 12, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.line, color: colors.text, fontSize: 14, fontWeight: "700", paddingHorizontal: 12 }} />
    </View>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <View style={{ borderRadius: 14, backgroundColor: "rgba(255,77,79,0.18)", borderWidth: 1, borderColor: "rgba(255,77,79,0.45)", padding: 13 }}>
      <Text style={{ color: colors.danger, fontSize: 13, fontWeight: "600", lineHeight: 20 }} selectable>
        {message}
      </Text>
    </View>
  );
}
