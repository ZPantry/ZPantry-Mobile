import Text from "@/components/AppText";
import { useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { TextInput, View } from "react-native";
import ScrollView from "@/components/ScreenScrollView";
import { SafeAreaView } from "react-native-safe-area-context";
import { usersApi } from "@/api/users";
import { useAuth } from "@/context/AuthContext";
import { authStorage } from "@/utils/authStorage";
import { getFriendlyErrorMessage } from "@/utils/localize";
import { colors } from "@/constants/colors";
import PrimaryButton from "@/components/PrimaryButton";

export default function AccountSettingsScreen() {
  const {user} = useAuth();
  const navigation = useNavigation<any>();
  const [name,setName]=useState(user?.fullName||"");
  const [password,setPassword]=useState("");
  const [confirm,setConfirm]=useState("");
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const [failed,setFailed]=useState(false);
  async function save() {
    if (!user || busy) return;
    setFailed(true);
    if (name.trim().length<2) return setMessage("Tên cần có ít nhất 2 ký tự.");
    if (password && (password.length<8 || password!==confirm)) return setMessage("Mật khẩu cần ít nhất 8 ký tự và xác nhận phải trùng khớp.");
    if (!password && confirm) return setMessage("Vui lòng nhập mật khẩu mới.");
    setBusy(true);setMessage("");
    try {
      const result = await usersApi.update(user.userId,{fullName:name.trim(),...(password?{password}:{})});
      await authStorage.updateUser({fullName:result.fullName||name.trim()});
      setPassword("");setConfirm("");setFailed(false);setMessage("Đã lưu thông tin tài khoản.");
    } catch(e) {setMessage(getFriendlyErrorMessage(e,"Chưa lưu được tài khoản."));}
    finally {setBusy(false);}
  }
  return <SafeAreaView edges={["left", "right", "bottom"]} style={{flex:1,backgroundColor:colors.background}}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{padding:22,gap:18}}>
    <Text style={{color:colors.text,fontSize:26,fontWeight:"700"}}>Thông tin tài khoản</Text>
    <Text style={{color:colors.muted}}>{user?.email}</Text>
    {[
      {label:"Tên hiển thị",value:name,onChange:setName,secure:false},
      {label:"Mật khẩu mới (để trống nếu không đổi)",value:password,onChange:setPassword,secure:true},
      {label:"Xác nhận mật khẩu mới",value:confirm,onChange:setConfirm,secure:true}
    ].map(field=><View key={field.label} style={{gap:8}}><Text style={{color:colors.text,fontWeight:"600"}}>{field.label}</Text><TextInput accessibilityLabel={field.label} placeholder={field.label} placeholderTextColor={colors.muted} value={field.value} onChangeText={field.onChange} secureTextEntry={field.secure} autoCapitalize={field.secure?"none":"words"} editable={!busy} style={{color:colors.text,backgroundColor:colors.card,padding:14,borderRadius:10}}/></View>)}
    {message ? <Text accessibilityRole="alert" style={{color:failed?colors.danger:colors.success}}>{message}</Text> : null}
    <PrimaryButton title={busy?"Đang lưu…":"Lưu tài khoản"} onPress={save} disabled={busy}/>
    <PrimaryButton title="Gói Z-Pantry & giới hạn" variant="outline" onPress={() => navigation.navigate("Subscription")}/>
  </ScrollView></SafeAreaView>;
}
