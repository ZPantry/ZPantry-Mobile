import Text from "@/components/AppText";
import { useCallback, useRef, useState } from "react";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { FlatList, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { todayMenuApi, type CookingLog } from "@/api/todayMenu";
import PrimaryButton from "@/components/PrimaryButton";
import { colors } from "@/constants/colors";
import { getFriendlyErrorMessage } from "@/utils/localize";

export default function CookingHistoryScreen() {
  const navigation = useNavigation<any>();
  const [items, setItems] = useState<CookingLog[]>([]);
  const [page, setPage] = useState(0);
  const [more, setMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const busy = useRef(false);
  const load = useCallback(async (next: number) => {
    if (busy.current) return;
    busy.current = true; setLoading(true); setError("");
    try {
      const result = await todayMenuApi.cookingLogs(next, 20);
      setItems(old => next === 1 ? result.data : [...old, ...result.data.filter(row => !old.some(x => x.id === row.id))]);
      setPage(next); setMore(result.hasNextPage); setLoaded(true);
    } catch (e) { setError(getFriendlyErrorMessage(e, "Chưa tải được lịch sử nấu ăn.")); }
    finally { busy.current = false; setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { void load(1); }, [load]));
  return <SafeAreaView edges={["left", "right", "bottom"]} style={{flex:1,backgroundColor:colors.background}}>
    <FlatList data={items} keyExtractor={item=>item.id} refreshing={loading} onRefresh={()=>load(1)} contentContainerStyle={{padding:22,gap:16,paddingBottom:40}}
      ListHeaderComponent={<View style={{gap:16}}><Text style={{color:colors.text,fontSize:26,fontWeight:"700"}}>Lịch sử nấu ăn</Text>{error ? <><Text style={{color:colors.danger}}>{error}</Text><PrimaryButton title="Thử lại" onPress={()=>load(1)} disabled={loading}/></> : null}</View>}
      ListEmptyComponent={<Text style={{color:colors.muted}}>{loading ? "Đang tải lịch sử…" : loaded && !error ? "Chưa có món đã hoàn thành. Nhật ký sẽ xuất hiện sau khi bạn hoàn thành món trong thực đơn." : ""}</Text>}
      renderItem={({item})=><View style={{backgroundColor:colors.card,padding:16,borderRadius:14,gap:8}}>
        <Text style={{color:colors.text,fontSize:18,fontWeight:"600"}}>{item.mealName}</Text>
        <Text style={{color:colors.muted}}>{new Date(item.cookedAt).toLocaleString("vi-VN")}{item.rating ? ` · ${item.rating}/5 sao` : ""}</Text>
        {item.note ? <Text style={{color:colors.text}}>{item.note}</Text> : null}
        <PrimaryButton title="Xem món đã nấu" variant="outline" onPress={()=>navigation.navigate("TodayMenuItemDetail",{itemId:item.todayMenuItemId})}/>
      </View>}
      ListFooterComponent={more ? <PrimaryButton title={loading ? "Đang tải…" : "Tải thêm"} onPress={()=>load(page+1)} disabled={loading}/> : null}/>
  </SafeAreaView>;
}
