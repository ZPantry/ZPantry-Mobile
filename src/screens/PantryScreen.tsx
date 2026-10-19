import { userDisplayName } from '@/utils/userProfile';
import FigmaAsset from '@/components/FigmaAsset';
import { pantryAssets as assets } from '@/constants/figmaAssets';
import Text from "@/components/AppText";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Image as ExpoImage } from "expo-image";
import { ActivityIndicator, Modal, Pressable, RefreshControl, View } from "react-native";
import ScrollView from "@/components/ScreenScrollView";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import type { Ingredient } from "@/api/ingredients";
import { ingredientsApi } from "@/api/ingredients";
import type { PantryApiItem } from "@/api/pantry";
import { pantryApi } from "@/api/pantry";
import { ActionRow, SectionHeading } from "@/components/BrandPanel";
import SearchBar from "@/components/SearchBar";
import { normalizeRemoteImageUrl, FALLBACK_FOOD_IMAGE_URL } from "@/utils/image";
import CategoryChip from "@/components/CategoryChip";
import ExpiryAlertCard from "@/components/ExpiryAlertCard";
import PantryItemCard from "@/components/PantryItemCard";
import { colors } from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import type { PantryItem, PantryStatus } from "@/types";
import { getFriendlyErrorMessage } from "@/utils/localize";
import PrimaryButton from "@/components/PrimaryButton";
import { useSizeClass } from "@/hooks/useSizeClass";
import { layoutTokens } from "@/constants/responsive";
import AdaptiveGrid from "@/components/AdaptiveGrid";

const pantryCategories = ["Tất cả", "Ngăn mát", "Ngăn đông", "Kệ bếp"];

type PantryListItem = PantryItem & {
  apiItem: PantryApiItem;
  ingredient?: Ingredient;
};

function normalizeLocation(location: string): PantryItem["location"] {
  const lower = location.toLowerCase();
  if (lower.includes("đông") || lower.includes("dong") || lower.includes("freeze")) return "Ngan dong";
  if (lower === "pantry" || lower.includes("kệ") || lower.includes("bep") || lower.includes("shelf")) return "Ke bep";
  return "Ngan mat";
}

function statusFromDate(expiredAt: string): PantryStatus {
  if (!expiredAt) return "safe";
  const daysLeft = Math.ceil((new Date(expiredAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (daysLeft <= 1) return "danger";
  if (daysLeft <= 5) return "warning";
  return "safe";
}

function expiryLabel(expiredAt: string) {
  if (!expiredAt) return "Chưa có hạn sử dụng";
  const daysLeft = Math.ceil((new Date(expiredAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return `Đã hết hạn ${Math.abs(daysLeft)} ngày`;
  if (daysLeft === 0) return "Hết hạn hôm nay";
  if (daysLeft === 1) return "Hết hạn ngày mai";
  return `Hết hạn sau ${daysLeft} ngày`;
}

function progressFromDate(expiredAt: string) {
  if (!expiredAt) return 0;
  const daysLeft = Math.ceil((new Date(expiredAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return Math.max(8, Math.min(100, daysLeft * 12));
}

function iconForCategory(category?: string) {
  const value = (category || "").toLowerCase();
  if (value.includes("fish") || value.includes("cá")) return "fish";
  if (value.includes("meat") || value.includes("thịt")) return "food-steak";
  if (value.includes("fruit") || value.includes("trái")) return "fruit-cherries";
  if (value.includes("grain") || value.includes("gạo")) return "rice";
  if (value.includes("protein") || value.includes("trứng")) return "egg";
  return "leaf";
}

function mapPantryItem(item: PantryApiItem, ingredient?: Ingredient): PantryListItem {
  return {
    id: item.id,
    name: ingredient?.name || item.ingredientName || item.note || "Thực phẩm",
    quantity: `${item.quantity} ${item.unit}`,
    location: normalizeLocation(item.storageLocation),
    expiryLabel: expiryLabel(item.expiredAt),
    status: statusFromDate(item.expiredAt),
    icon: iconForCategory(ingredient?.category),
    imageUrl: ingredient?.imageUrl,
    progress: progressFromDate(item.expiredAt),
    apiItem: item,
    ingredient
  };
}

export default function PantryScreen() {
  const { isCompact, isLandscape } = useSizeClass();
  const toast = useToast();
  const [active, setActive] = useState("Tất cả");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<PantryListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [quantityBusy, setQuantityBusy] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [isDeletingItems, setIsDeletingItems] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const quantityLock = useRef(false);
  const navigation = useNavigation<any>();
  const { user, onboardingStep } = useAuth();
  const displayName = userDisplayName(user);
  const [showExpiry, setShowExpiry] = useState(false);
  const notified = useRef("");

  const loadPantry = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const [ingredientPage, pantryItems] = await Promise.all([ingredientsApi.all().then(data => ({ data })), pantryApi.all()]);
      const ingredientById = new Map(ingredientPage.data.map((ingredient) => [ingredient.id, ingredient]));
      setItems(pantryItems.map((item) => mapPantryItem(item, ingredientById.get(item.ingredientId))));
    } catch (error) {
      setErrorMessage(getFriendlyErrorMessage(error, "Chưa tải được tủ lạnh."));

    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPantry();
    }, [loadPantry])
  );

  const changeQuantity = async (item: PantryListItem, quantity: number) => {
    if (quantityLock.current || !Number.isFinite(quantity) || quantity <= 0) return;
    quantityLock.current = true;
    setQuantityBusy(true);
    setErrorMessage("");
    try {
      const current = item.apiItem;
      await pantryApi.updateItem(current.id, { ingredientId: current.ingredientId, quantity,
        unit: current.unit, expiredAt: current.expiredAt || null, storageLocation: current.storageLocation, note: current.note });
      await loadPantry();
    } catch (error) {
      setErrorMessage(getFriendlyErrorMessage(error, "Chưa lưu được số lượng. Vui lòng thử lại."));
    } finally {
      quantityLock.current = false;
      setQuantityBusy(false);
    }
  };

  const toggleSelectionMode = () => {
    setSelectionMode(current => !current);
    setSelectedItemIds(new Set());
  };

  const toggleItemSelection = (itemId: string) => {
    setSelectedItemIds(current => {
      const next = new Set(current);
      if (next.has(itemId)) next.delete(itemId); else next.add(itemId);
      return next;
    });
  };

  const requestDelete = (itemIds: string[]) => {
    if (!itemIds.length || isDeletingItems) return;
    setSelectedItemIds(new Set(itemIds));
    setShowDeleteConfirm(true);
  };

  const deleteSelectedItems = async () => {
    const itemIds = [...selectedItemIds];
    if (!itemIds.length || isDeletingItems) return;
    setIsDeletingItems(true);
    setErrorMessage("");
    try {
      const outcomes = await Promise.allSettled(itemIds.map(itemId => pantryApi.removeItem(itemId)));
      const deletedIds = new Set(itemIds.filter((_, index) => outcomes[index].status === "fulfilled"));
      const failedCount = itemIds.length - deletedIds.size;
      if (deletedIds.size) setItems(current => current.filter(item => !deletedIds.has(item.id)));
      if (failedCount) {
        setSelectedItemIds(new Set(itemIds.filter(itemId => !deletedIds.has(itemId))));
        setErrorMessage(`Chưa xóa được ${failedCount} thực phẩm. Vui lòng thử lại.`);
      } else {
        setSelectedItemIds(new Set());
        setSelectionMode(false);
        toast.show(`Đã xóa ${deletedIds.size} thực phẩm khỏi tủ lạnh.`);
      }
      setShowDeleteConfirm(false);
    } finally {
      setIsDeletingItems(false);
    }
  };

  const filtered = useMemo(() => {
    const normalize = (value: string) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");
    return items.filter(item => (active === "Tất cả" || item.location === (active === "Ngăn đông" ? "Ngan dong" : active === "Kệ bếp" ? "Ke bep" : "Ngan mat")) && normalize(item.name).includes(normalize(search)));
  }, [active, items, search]);

  const expiringItems = items.filter((item) => item.status === "danger" || item.status === "warning");
  const expiryKey = expiringItems.map(item => item.id + item.apiItem.expiredAt).sort().join("|");
  useEffect(() => {
    if (expiryKey && notified.current !== expiryKey && onboardingStep === "done") {
      notified.current = expiryKey;
      setShowExpiry(true);
    }
  }, [expiryKey, onboardingStep]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top", "left", "right"]}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadPantry} tintColor={colors.primary} />}
        contentContainerStyle={{
          paddingHorizontal: isCompact ? 16 : 24,
          paddingTop: isCompact ? 20 : 24,
          paddingBottom: selectionMode && selectedItemIds.size ? 112 : 32,
          gap: 14,
          maxWidth: layoutTokens.contentMaxWidth,
          width: "100%",
          alignSelf: "center"
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ flex: 1, gap: 5 }}><Text style={{ color: colors.text, fontSize: 25, fontWeight: "700" }}>Kho thực phẩm</Text>
            <Text style={{ color: colors.muted, fontSize: 13 }}>Quản lý nguyên liệu của {displayName}</Text></View>
          <Pressable accessibilityRole="button" accessibilityLabel="Thông báo hạn dùng" onPress={() => setShowExpiry(true)} style={{ minWidth: 48, minHeight: 48, justifyContent: "center", alignItems: "center", padding: 12 }}><FigmaAsset asset={assets.imgContainer13} /></Pressable>
        </View>
        {errorMessage ? <><ExpiryAlertCard title={errorMessage} tone="danger" /><PrimaryButton title="Thử tải lại" onPress={loadPantry} variant="outline" /></> : null}
        {expiringItems.length ? <Pressable onPress={() => setShowExpiry(true)} accessibilityRole="button"><ExpiryAlertCard title={expiringItems.length + " thực phẩm cần chú ý hạn dùng"} /></Pressable> : null}
        {items.length ? <View style={{ gap: 12 }}><SectionHeading title="Thực phẩm thường dùng" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {items.slice(0, 8).map(item => <Pressable key={item.id} accessibilityRole="button" onPress={() => navigation.navigate("PantryItemDetail", { pantryItem: item.apiItem, ingredient: item.ingredient })}
              style={{ width: 104, padding: 10, gap: 5, borderRadius: 10, backgroundColor: colors.surface, alignItems: "center" }}>
              <ExpoImage source={{ uri: normalizeRemoteImageUrl(item.imageUrl || FALLBACK_FOOD_IMAGE_URL) }} style={{ width: 56, height: 56, borderRadius: 28 }} contentFit="cover" cachePolicy="memory-disk" />
              <Text numberOfLines={1} style={{ color: colors.text, fontSize: 12, fontWeight: "600" }}>{item.name}</Text>
              <Text style={{ color: colors.muted, fontSize: 10 }}>{item.quantity}</Text>
              <View style={{ backgroundColor: colors.successSoft, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5 }}><Text style={{ color: colors.success, fontSize: 10 }}>{item.location === "Ngan dong" ? "Ngăn đông" : item.location === "Ke bep" ? "Kệ bếp" : "Tủ lạnh"}</Text></View>
            </Pressable>)}
          </ScrollView>
        </View> : null}
        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
            <View style={{ flexBasis: "100%" }}><SectionHeading title="Sản phẩm trong kho" /></View>
            <Pressable accessibilityRole="button" accessibilityLabel={selectionMode ? "Hủy chọn xóa" : "Chọn nhiều thực phẩm để xóa"} onPress={toggleSelectionMode}
              style={({ pressed }) => ({ minHeight: 48, paddingHorizontal: 12, borderRadius: 9, backgroundColor: selectionMode ? "#FFF0F0" : colors.surface, borderWidth: 1, borderColor: selectionMode ? colors.danger : colors.line, justifyContent: "center", opacity: pressed ? 0.76 : 1 })}>
              <Text style={{ color: selectionMode ? colors.danger : colors.primaryDark, fontSize: 12, fontWeight: "700" }}>{selectionMode ? "Hủy" : "Chọn xóa"}</Text>
            </Pressable>
            {!selectionMode ? <Pressable accessibilityRole="button" accessibilityLabel="Thêm thực phẩm" onPress={() => navigation.navigate("AddIngredient")}
              style={({ pressed }) => ({ minHeight: 48, paddingHorizontal: 12, borderRadius: 9, backgroundColor: colors.primary, justifyContent: "center", opacity: pressed ? 0.76 : 1 })}>
              <Text style={{ color: colors.white, fontSize: 12, fontWeight: "700" }}>Thêm mới</Text>
            </Pressable> : null}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {pantryCategories.map(category => <CategoryChip key={category} label={category} active={active === category} onPress={() => setActive(category)} />)}
          </ScrollView>
          <SearchBar placeholder="Tìm thực phẩm trong kho" value={search} onChangeText={setSearch} onSubmit={() => setSearch(search.trim())} actionLabel="Tìm" />
          {isLoading && !items.length ? <ActivityIndicator color={colors.primary} style={{ padding: 24 }} /> : filtered.length ? (
            <AdaptiveGrid
              data={filtered}
              keyExtractor={item => item.id}
              columns={isCompact ? 1 : 2}
              gap={12}
              renderItem={item => (
                <PantryItemCard
                  key={item.id}
                  item={item}
                  quantityControl={{
                    value: item.apiItem.quantity,
                    unit: item.apiItem.unit,
                    busy: quantityBusy || isLoading,
                    onChange: quantity => changeQuantity(item, quantity)
                  }}
                  selection={selectionMode ? { selected: selectedItemIds.has(item.id), onToggle: () => toggleItemSelection(item.id) } : undefined}
                  onQuickDelete={!selectionMode ? () => requestDelete([item.id]) : undefined}
                  onPress={() => navigation.navigate("PantryItemDetail", { pantryItem: item.apiItem, ingredient: item.ingredient })}
                />
              )}
            />
          ) : !errorMessage ? <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 24, gap: 12, alignItems: "center" }}>
              <MaterialCommunityIcons name="fridge-outline" size={36} color={colors.muted} />
              <Text style={{ color: colors.text, fontWeight: "600" }}>{search ? "Không tìm thấy thực phẩm" : "Chưa có thực phẩm ở mục này"}</Text>
              <PrimaryButton title="Thêm thực phẩm" onPress={() => navigation.navigate("AddIngredient")} />
            </View> : null}
        </View>
        <View style={{ gap: 10, backgroundColor: "#F4F4F2", padding: 16, borderRadius: 20, borderWidth: 1, borderColor: colors.line }}>
          <SectionHeading title="Bộ công cụ thêm món" />
          <ActionRow icon="playlist-edit" asset={assets.imgContainer6} title="Thêm nhanh" subtitle="Tìm và chọn nhiều nguyên liệu cùng lúc" onPress={() => navigation.navigate("QuickAdd")} />
          <ActionRow icon="camera-outline" asset={assets.imgContainer10} title="Thêm từ ảnh / hóa đơn" onPress={() => navigation.navigate("PantryImport")} />
          <ActionRow icon="silverware-fork-knife" title="Thêm bằng thực đơn" onPress={() => navigation.navigate("PantryImport", { method: "MENU" })} />
        </View>
      </ScrollView>
      {selectionMode && selectedItemIds.size ? <View style={{ position: "absolute", left: isCompact ? 16 : 24, right: isCompact ? 16 : 24, bottom: 18 }}>
        <PrimaryButton title={`Xóa ${selectedItemIds.size} thực phẩm`} icon="trash-can-outline" loading={isDeletingItems} onPress={() => requestDelete([...selectedItemIds])} style={{ backgroundColor: colors.danger }} />
      </View> : null}
      <Modal transparent visible={showExpiry} animationType="fade" onRequestClose={() => setShowExpiry(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "center", padding: 24 }}>
          <View accessibilityViewIsModal style={{ backgroundColor: colors.background, borderRadius: 18, padding: 20, gap: 16, maxHeight: "75%", maxWidth: 520, width: "100%", alignSelf: "center" }}>
            <Text style={{ color: colors.primary, fontSize: 22, fontWeight: "700" }}>Hạn dùng cần chú ý</Text>
            <ScrollView contentContainerStyle={{ gap: 12 }}>
              {expiringItems.length ? expiringItems.map(item => <View key={item.id} style={{ gap: 4 }}>
                <Text style={{ color: colors.text, fontWeight: "600" }}>{item.name}</Text>
                <Text style={{ color: item.status === "danger" ? colors.danger : colors.muted }}>{item.expiryLabel}</Text>
              </View>) : <Text style={{ color: colors.text }}>Chưa có thực phẩm sắp hết hạn.</Text>}
            </ScrollView>
            <PrimaryButton title="Đóng thông báo" onPress={() => setShowExpiry(false)} />
          </View>
        </View>
      </Modal>
      <Modal transparent visible={showDeleteConfirm} animationType="fade" onRequestClose={() => !isDeletingItems && setShowDeleteConfirm(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "center", padding: 24 }}>
          <View accessibilityViewIsModal style={{ backgroundColor: colors.background, borderRadius: 18, padding: 20, gap: 16, maxWidth: 420, width: "100%", alignSelf: "center" }}>
            <MaterialCommunityIcons name="trash-can-outline" size={30} color={colors.danger} />
            <View style={{ gap: 6 }}><Text style={{ color: colors.text, fontSize: 20, fontWeight: "700" }}>Xóa thực phẩm?</Text><Text style={{ color: colors.muted, fontSize: 14, lineHeight: 20 }}>{selectedItemIds.size === 1 ? "Thực phẩm này" : `${selectedItemIds.size} thực phẩm`} sẽ bị xóa khỏi tủ lạnh của bạn.</Text></View>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}><PrimaryButton title="Hủy" variant="outline" disabled={isDeletingItems} onPress={() => setShowDeleteConfirm(false)} /></View>
              <View style={{ flex: 1 }}><PrimaryButton title="Xóa" icon="trash-can-outline" loading={isDeletingItems} onPress={() => void deleteSelectedItems()} style={{ backgroundColor: colors.danger }} /></View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
