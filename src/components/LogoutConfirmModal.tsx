import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ActivityIndicator, Modal, Pressable, Text, View } from "react-native";
import { colors } from "@/constants/colors";

type LogoutConfirmModalProps = {
  visible: boolean;
  isSigningOut?: boolean;
  onStay: () => void;
  onConfirm: () => void;
};

export default function LogoutConfirmModal({ visible, isSigningOut = false, onStay, onConfirm }: LogoutConfirmModalProps) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onStay}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.62)", padding: 22, justifyContent: "center" }}>
        <View style={{ borderRadius: 22, backgroundColor: colors.white, padding: 20, gap: 16, boxShadow: "0 18px 42px rgba(0,0,0,0.28)" }}>
          <View style={{ width: 58, height: 58, borderRadius: 19, backgroundColor: "rgba(244,162,28,0.18)", alignItems: "center", justifyContent: "center" }}>
            <MaterialCommunityIcons name="pot-steam-outline" size={32} color={colors.primaryDark} />
          </View>
          <View style={{ gap: 8 }}>
            <Text style={{ color: colors.textDark, fontSize: 22, lineHeight: 28, fontWeight: "900" }} selectable>
              Xác nhận đăng xuất
            </Text>
            <Text style={{ color: colors.mutedDark, fontSize: 14, lineHeight: 22, fontWeight: "700" }} selectable>
              Bạn chắc chắn muốn đăng xuất khỏi ZPantry chứ? Tụi mình sẽ giữ bếp gọn gàng chờ bạn quay lại nha.
            </Text>
          </View>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable disabled={isSigningOut} onPress={onStay} style={({ pressed }) => ({ flex: 1, minHeight: 50, borderRadius: 15, backgroundColor: "#EEF3EF", alignItems: "center", justifyContent: "center", opacity: pressed || isSigningOut ? 0.76 : 1 })}>
              <Text style={{ color: colors.textDark, fontSize: 15, fontWeight: "900" }} selectable>
                Ở lại
              </Text>
            </Pressable>
            <Pressable disabled={isSigningOut} onPress={onConfirm} style={({ pressed }) => ({ flex: 1, minHeight: 50, borderRadius: 15, backgroundColor: colors.danger, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, opacity: pressed || isSigningOut ? 0.76 : 1 })}>
              {isSigningOut ? <ActivityIndicator color={colors.white} /> : <MaterialCommunityIcons name="logout" size={19} color={colors.white} />}
              <Text style={{ color: colors.white, fontSize: 15, fontWeight: "900" }} selectable>
                {isSigningOut ? "Đang thoát..." : "Đăng xuất"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
