import { useNavigation, useRoute } from "@react-navigation/native";
import { useRef, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import PrimaryButton from "@/components/PrimaryButton";
import { colors } from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";

const steps = [
  { title: "Chào mừng đến Z-Pantry", description: "Bạn có thể xem từng bước, chọn một bước bất kỳ hoặc kết thúc hướng dẫn bất cứ lúc nào." },
  { title: "Thêm nguyên liệu", description: "Mở Thêm nhanh để chọn nhập thủ công, bằng văn bản, bằng thực đơn hoặc từ ảnh. Bạn không cần nhập thử để xem bước kế tiếp." },
  { title: "Kiểm tra trước khi lưu", description: "Với văn bản và ảnh, hãy kiểm tra nguyên liệu nhận diện được. Bạn có thể sửa số lượng, đơn vị, chọn lại nguyên liệu hoặc bỏ dòng chưa phù hợp." },
  { title: "Thêm bằng thực đơn", description: "Chọn ngày và các món trong thực đơn. Ứng dụng tổng hợp nguyên liệu theo khẩu phần để bạn kiểm tra trước khi lưu vào tủ." },
  { title: "Lưu vào tủ", description: "Chọn nguyên liệu, nhập số lượng và nơi cất. Hạn dùng có thể để trống. Chỉ khi bấm xác nhận thì dữ liệu mới được lưu." },
  { title: "Theo dõi hạn dùng", description: "Biểu tượng chuông trong Kho thực phẩm mở danh sách nguyên liệu cần chú ý. Bạn có thể đóng thông báo để tiếp tục sử dụng." },
  { title: "Sẵn sàng sử dụng", description: "Từ tủ nguyên liệu, bạn có thể tìm món, lên thực đơn và xem lịch sử nấu. Hướng dẫn luôn có trong trang Cá nhân để xem lại." }
];

export default function InteractiveGuideScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { completeOnboardingStep } = useAuth();
  const [step, setStep] = useState(0);
  const [sample, setSample] = useState("");
  const [error, setError] = useState("");
  const [leaving, setLeaving] = useState(false);
  const lock = useRef(false);
  const finish = async () => {
    if (lock.current) return;
    lock.current = true; setLeaving(true); setError("");
    try {
      if (route.params?.isReplay && navigation.canGoBack()) navigation.goBack();
      else {
        await completeOnboardingStep("done");
        navigation.reset({ index: 0, routes: [{ name: "Tabs" }] });
      }
    } catch { setError("Chưa lưu được trạng thái hướng dẫn. Vui lòng thử lại."); }
    finally { lock.current = false; setLeaving(false); }
  };
  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
    <View style={{ paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <Text style={{ color: colors.text, fontSize: 20, fontWeight: "900", flex: 1 }}>Hướng dẫn sử dụng</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Bỏ qua hướng dẫn" disabled={leaving} onPress={finish} style={{ minHeight: 44, justifyContent: "center" }}>
        <Text style={{ color: colors.primary, fontWeight: "800" }}>Bỏ qua</Text>
      </Pressable>
    </View>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, gap: 22, maxWidth: 720, width: "100%", alignSelf: "center" }}>
      <Text style={{ color: colors.muted }}>Bước {step + 1}/{steps.length} · Có thể xem theo thứ tự bất kỳ</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {steps.map((item, index) => <Pressable key={item.title} accessibilityRole="button" accessibilityLabel={"Bước " + (index + 1) + ": " + item.title} accessibilityState={{ selected: index === step }} onPress={() => setStep(index)} style={{ minWidth: 44, minHeight: 44, borderRadius: 22, backgroundColor: index === step ? colors.primary : colors.surface, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: index === step ? colors.textDark : colors.text, fontWeight: "800" }}>{index + 1}</Text>
        </Pressable>)}
      </View>
      <View style={{ gap: 16, padding: 20, borderRadius: 16, backgroundColor: colors.surface }}>
        <Text style={{ color: colors.primary, fontSize: 24, fontWeight: "900" }}>{steps[step].title}</Text>
        <Text style={{ color: colors.text, fontSize: 16, lineHeight: 25 }}>{steps[step].description}</Text>
        {step === 1 ? <><TextInput accessibilityLabel="Nhập thử nguyên liệu (không bắt buộc)" value={sample} onChangeText={setSample} placeholder="Ví dụ: 2 củ cà rốt, 200 g thịt bò" placeholderTextColor={colors.muted} style={{ minHeight: 48, color: colors.text, padding: 12, borderBottomWidth: 1, borderColor: colors.line }} /><Text style={{ color: colors.muted }}>Ví dụ minh họa, không ghi dữ liệu vào tủ.</Text></> : null}
      </View>
      {error ? <Text accessibilityRole="alert" style={{ color: colors.danger }}>{error}</Text> : null}
    </ScrollView>
    <View style={{ padding: 20, gap: 12, flexDirection: "row" }}>
      <PrimaryButton title="Bước trước" variant="soft" disabled={step === 0 || leaving} onPress={() => setStep(value => value - 1)} style={{ flex: 1 }} />
      <PrimaryButton title={step === steps.length - 1 ? "Hoàn tất" : "Bước tiếp"} disabled={leaving} onPress={step === steps.length - 1 ? finish : () => setStep(value => value + 1)} style={{ flex: 1 }} />
    </View>
  </SafeAreaView>;
}
