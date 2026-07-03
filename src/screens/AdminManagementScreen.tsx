import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Animated, Image, Modal, Pressable, RefreshControl, ScrollView, Text, TextInput, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Ingredient } from "@/api/ingredients";
import { ingredientsApi } from "@/api/ingredients";
import type { Recipe } from "@/api/recipes";
import { recipesApi } from "@/api/recipes";
import type { AdminUser } from "@/api/users";
import { usersApi } from "@/api/users";
import { colors } from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { FALLBACK_FOOD_IMAGE_URL, normalizeRemoteImageUrl } from "@/utils/image";

type AdminTab = "users" | "recipes" | "ingredients";
type DeleteTarget = { type: AdminTab; id: string; name: string } | null;

const adminTabs: Array<{ key: AdminTab; label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }> = [
  { key: "users", label: "User", icon: "account-group-outline" },
  { key: "recipes", label: "Công thức", icon: "notebook-outline" },
  { key: "ingredients", label: "Nguyên liệu", icon: "food-apple-outline" }
];

function normalizeText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts.at(0)?.[0] || "U").toUpperCase() + (parts.at(-1)?.[0] || "").toUpperCase();
}

function formatDate(value?: string) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function AdminManagementScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { signOut } = useAuth();
  const toast = useToast();
  const initialTab: AdminTab = ["users", "recipes", "ingredients"].includes(route.params?.initialTab) ? route.params.initialTab : "users";
  const [activeTab, setActiveTab] = useState<AdminTab>(initialTab);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [recipeSearch, setRecipeSearch] = useState("");
  const [ingredientSearch, setIngredientSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);

  const displayedUsers = useMemo(() => {
    const keyword = normalizeText(userSearch);
    if (!keyword) return users;
    return users.filter((user) => [user.fullName, user.email, user.role].some((value) => normalizeText(value || "").includes(keyword)));
  }, [userSearch, users]);

  const displayedRecipes = useMemo(() => {
    const keyword = normalizeText(recipeSearch);
    if (!keyword) return recipes;
    return recipes.filter((recipe) => [recipe.name, recipe.description, recipe.difficulty, recipe.sourceType].some((value) => normalizeText(value || "").includes(keyword)));
  }, [recipeSearch, recipes]);

  const displayedIngredients = useMemo(() => {
    const keyword = normalizeText(ingredientSearch);
    if (!keyword) return ingredients;
    return ingredients.filter((ingredient) => [ingredient.name, ingredient.normalizedName, ingredient.category, ingredient.unit].some((value) => normalizeText(value || "").includes(keyword)));
  }, [ingredientSearch, ingredients]);

  const loadAdminData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const [userPage, recipePage, ingredientPage] = await Promise.all([usersApi.list(1, 100), recipesApi.list(1, 100), ingredientsApi.list(1, 100)]);
      setUsers(userPage.data);
      setRecipes(recipePage.data);
      setIngredients(ingredientPage.data);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Chưa tải được dữ liệu quản trị.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAdminData();
    }, [loadAdminData])
  );

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsSaving(true);
    setErrorMessage("");
    try {
      if (deleteTarget.type === "users") {
        await usersApi.remove(deleteTarget.id);
        toast.show("Đã xóa user.");
      } else if (deleteTarget.type === "recipes") {
        await recipesApi.remove(deleteTarget.id);
        toast.show("Đã xóa công thức.");
      } else {
        await ingredientsApi.remove(deleteTarget.id);
        toast.show("Đã xóa nguyên liệu.");
      }
      setDeleteTarget(null);
      await loadAdminData();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Chưa xóa được dữ liệu.");
    } finally {
      setIsSaving(false);
    }
  };

  const activeTitle = activeTab === "users" ? "Quản lý user" : activeTab === "recipes" ? "Quản lý công thức" : "Quản lý nguyên liệu";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <View style={{ flex: 1 }}>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadAdminData} tintColor={colors.primary} />}
          contentContainerStyle={{ padding: 18, paddingBottom: 132, gap: 16 }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: 25, fontWeight: "900" }} selectable>
                {activeTitle}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 13, fontWeight: "700", marginTop: 2 }} selectable>
                Dashboard dữ liệu cho admin Z-Pantry
              </Text>
            </View>
            <Pressable onPress={signOut} style={({ pressed }) => ({ width: 46, height: 46, borderRadius: 23, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.78 : 1 })}>
              <MaterialCommunityIcons name="logout" size={24} color={colors.primary} />
            </Pressable>
          </View>

          <MetricStrip users={users.length} recipes={recipes.length} ingredients={ingredients.length} />

          {errorMessage ? <ErrorBanner message={errorMessage} /> : null}

          {activeTab === "users" ? (
            <>
              <SectionTitle title="Danh sách user" />
              <SearchBox value={userSearch} onChangeText={setUserSearch} placeholder="Tìm theo tên, email, role..." />
              <View style={{ gap: 12 }}>
                {isLoading ? (
                  <LoadingCard />
                ) : displayedUsers.length === 0 ? (
                  <EmptyState message="Không tìm thấy user phù hợp." />
                ) : (
                  displayedUsers.map((user) => <UserAdminCard key={user.id} user={user} onEdit={() => navigation.navigate("AdminUserForm", { user })} onDelete={() => setDeleteTarget({ type: "users", id: user.id, name: user.fullName || user.email })} />)
                )}
              </View>
            </>
          ) : null}

          {activeTab === "recipes" ? (
            <>
              <SectionTitle title="Danh sách công thức" actionLabel="Tạo mới" onAction={() => navigation.navigate("AdminRecipeForm")} />
              <SearchBox value={recipeSearch} onChangeText={setRecipeSearch} placeholder="Tìm theo tên, mô tả, độ khó..." />
              <View style={{ gap: 12 }}>
                {isLoading ? (
                  <LoadingCard />
                ) : displayedRecipes.length === 0 ? (
                  <EmptyState message="Không tìm thấy công thức phù hợp." />
                ) : (
                  displayedRecipes.map((recipe) => <RecipeAdminCard key={recipe.id} recipe={recipe} onEdit={() => navigation.navigate("AdminRecipeForm", { recipe })} onDelete={() => setDeleteTarget({ type: "recipes", id: recipe.id, name: recipe.name })} />)
                )}
              </View>
            </>
          ) : null}

          {activeTab === "ingredients" ? (
            <>
              <SectionTitle title="Danh sách nguyên liệu" actionLabel="Tạo mới" onAction={() => navigation.navigate("AdminIngredientForm")} />
              <SearchBox value={ingredientSearch} onChangeText={setIngredientSearch} placeholder="Tìm theo tên, nhóm, đơn vị..." />
              <View style={{ gap: 12 }}>
                {isLoading ? (
                  <LoadingCard />
                ) : displayedIngredients.length === 0 ? (
                  <EmptyState message="Không tìm thấy nguyên liệu phù hợp." />
                ) : (
                  displayedIngredients.map((ingredient) => <IngredientAdminCard key={ingredient.id} ingredient={ingredient} onEdit={() => navigation.navigate("AdminIngredientForm", { ingredient })} onDelete={() => setDeleteTarget({ type: "ingredients", id: ingredient.id, name: ingredient.name })} />)
                )}
              </View>
            </>
          ) : null}
        </ScrollView>
        <AdminBottomBar activeTab={activeTab} onChange={setActiveTab} />
      </View>

      <ConfirmDeleteModal target={deleteTarget} isSaving={isSaving} onCancel={() => setDeleteTarget(null)} onConfirm={confirmDelete} />
    </SafeAreaView>
  );
}

function AdminBottomBar({ activeTab, onChange }: { activeTab: AdminTab; onChange: (tab: AdminTab) => void }) {
  const { width } = useWindowDimensions();
  const progress = useRef(new Animated.Value(adminTabs.findIndex((item) => item.key === activeTab))).current;
  const barHorizontalPadding = 8;
  const tabWidth = useMemo(() => (width - 36 - barHorizontalPadding * 2) / adminTabs.length, [width]);

  useEffect(() => {
    Animated.spring(progress, {
      toValue: adminTabs.findIndex((item) => item.key === activeTab),
      useNativeDriver: true,
      damping: 16,
      stiffness: 170,
      mass: 0.8
    }).start();
  }, [activeTab, progress]);

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: 18,
        right: 18,
        bottom: 34,
        height: 66,
        borderRadius: 28,
        borderCurve: "continuous",
        backgroundColor: "rgba(255,255,255,0.30)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.45)",
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: barHorizontalPadding,
        boxShadow: "0 -8px 28px rgba(0,0,0,0.28)",
        overflow: "visible"
      }}
    >
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: barHorizontalPadding,
          top: 4,
          width: tabWidth,
          alignItems: "center",
          transform: [{ translateX: Animated.multiply(progress, tabWidth) }]
        }}
      >
        <View
          style={{
            width: 54,
            height: 54,
            borderRadius: 27,
            backgroundColor: "rgba(244,162,28,0.22)",
            borderWidth: 1,
            borderColor: "rgba(244,162,28,0.86)",
            boxShadow: "0 8px 22px rgba(244,162,28,0.34)"
          }}
        />
      </Animated.View>
      {adminTabs.map((item) => (
        <AdminBottomTabButton key={item.key} item={item} active={activeTab === item.key} onPress={() => onChange(item.key)} />
      ))}
    </View>
  );
}

function AdminBottomTabButton({ item, active, onPress }: { item: (typeof adminTabs)[number]; active: boolean; onPress: () => void }) {
  const scale = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: active ? 1 : 0,
      useNativeDriver: true,
      damping: 13,
      stiffness: 180,
      mass: 0.65
    }).start();
  }, [active, scale]);

  const iconScale = scale.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] });
  const labelOpacity = scale.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1] });

  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ flex: 1, height: 62, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.82 : 1 })}>
      <Animated.View style={{ width: 52, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", transform: [{ scale: iconScale }] }}>
        <MaterialCommunityIcons name={item.icon} size={24} color={active ? colors.primary : colors.text} />
      </Animated.View>
      <Animated.Text numberOfLines={1} style={{ marginTop: -3, color: active ? colors.primary : colors.text, fontSize: 10, fontWeight: "900", textAlign: "center", opacity: labelOpacity }}>
        {item.label}
      </Animated.Text>
    </Pressable>
  );
}

function MetricStrip({ users, recipes, ingredients }: { users: number; recipes: number; ingredients: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 10 }}>
      <MetricCard label="User" value={users} icon="account-group-outline" />
      <MetricCard label="Recipe" value={recipes} icon="notebook-outline" />
      <MetricCard label="Ingredient" value={ingredients} icon="food-apple-outline" />
    </View>
  );
}

function MetricCard({ label, value, icon }: { label: string; value: number; icon: keyof typeof MaterialCommunityIcons.glyphMap }) {
  return (
    <View style={{ flex: 1, minWidth: 82, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 12, gap: 6 }}>
      <MaterialCommunityIcons name={icon} size={21} color={colors.primary} />
      <Text style={{ color: colors.text, fontSize: 23, fontWeight: "900", fontVariant: ["tabular-nums"] }} selectable>
        {value}
      </Text>
      <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 10, fontWeight: "800" }}>
        {label}
      </Text>
    </View>
  );
}

function SectionTitle({ title, actionLabel, onAction }: { title: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <Text style={{ color: colors.text, fontSize: 20, fontWeight: "900" }} selectable>
        {title}
      </Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} style={({ pressed }) => ({ minHeight: 36, borderRadius: 18, backgroundColor: colors.primary, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 6, opacity: pressed ? 0.82 : 1 })}>
          <MaterialCommunityIcons name="plus" size={18} color={colors.textDark} />
          <Text style={{ color: colors.textDark, fontSize: 12, fontWeight: "900" }} selectable>
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function SearchBox({ value, onChangeText, placeholder }: { value: string; onChangeText: (value: string) => void; placeholder: string }) {
  return (
    <View style={{ minHeight: 50, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 13 }}>
      <Ionicons name="search" size={20} color={colors.primary} />
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.muted} style={{ flex: 1, color: colors.text, fontSize: 14, fontWeight: "800", minHeight: 48 }} />
      {value ? (
        <Pressable onPress={() => onChangeText("")} style={{ width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.14)" }}>
          <Ionicons name="close" size={17} color={colors.text} />
        </Pressable>
      ) : null}
    </View>
  );
}

function UserAdminCard({ user, onEdit, onDelete }: { user: AdminUser; onEdit: () => void; onDelete: () => void }) {
  return (
    <View style={{ minHeight: 112, borderRadius: 14, backgroundColor: colors.white, padding: 12, flexDirection: "row", gap: 12, alignItems: "center" }}>
      {user.avatarUrl ? (
        <Image source={{ uri: normalizeRemoteImageUrl(user.avatarUrl) }} style={{ width: 74, height: 74, borderRadius: 22, backgroundColor: colors.secondary }} />
      ) : (
        <View style={{ width: 74, height: 74, borderRadius: 22, backgroundColor: colors.secondary, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: colors.primaryDark, fontSize: 22, fontWeight: "900" }} selectable>
            {initials(user.fullName || user.email)}
          </Text>
        </View>
      )}
      <View style={{ flex: 1, gap: 5 }}>
        <Text style={{ color: colors.textDark, fontSize: 16, fontWeight: "900" }} selectable>
          {user.fullName || "Chưa có tên"}
        </Text>
        <Text numberOfLines={1} style={{ color: colors.mutedDark, fontSize: 12, fontWeight: "800" }}>
          {user.email}
        </Text>
        <View style={{ flexDirection: "row", gap: 7, flexWrap: "wrap" }}>
          <StatusPill text={user.role} tone={user.role === "admin" ? "admin" : "user"} />
          <StatusPill text={user.isActive ? "Active" : "Inactive"} tone={user.isActive ? "active" : "inactive"} />
          <StatusPill text={user.isEmailConfirmed ? "Verified" : "Unverified"} tone={user.isEmailConfirmed ? "active" : "inactive"} />
        </View>
        <Text style={{ color: colors.primaryDark, fontSize: 11, fontWeight: "900" }} selectable>
          Tạo: {formatDate(user.createdAt)}
        </Text>
      </View>
      <View style={{ gap: 8 }}>
        <IconButton icon="pencil-outline" tone="edit" onPress={onEdit} />
        <IconButton icon="trash-can-outline" tone="delete" onPress={onDelete} />
      </View>
    </View>
  );
}

function RecipeAdminCard({ recipe, onEdit, onDelete }: { recipe: Recipe; onEdit: () => void; onDelete: () => void }) {
  return (
    <View style={{ borderRadius: 14, backgroundColor: colors.white, overflow: "hidden", boxShadow: "0 12px 24px rgba(0,0,0,0.20)" }}>
      <RemoteImage uri={recipe.imageUrl} style={{ width: "100%", height: 132, backgroundColor: colors.secondary }} />
      <View style={{ padding: 14, gap: 10 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.textDark, fontSize: 18, fontWeight: "900" }} selectable>
              {recipe.name}
            </Text>
            <Text numberOfLines={2} style={{ color: colors.mutedDark, fontSize: 12, fontWeight: "700", lineHeight: 18, marginTop: 3 }}>
              {recipe.description || "Chưa có mô tả"}
            </Text>
          </View>
          <StatusPill text={recipe.difficulty || "Manual"} tone="user" />
        </View>
        <View style={{ flexDirection: "row", gap: 12, flexWrap: "wrap" }}>
          <MiniInfo icon="timer-outline" text={`${recipe.cookingTimeMinutes || 0} phút`} />
          <MiniInfo icon="account-group-outline" text={`${recipe.servingSize || 0} phần`} />
          <MiniInfo icon="source-branch" text={recipe.sourceType || "Manual"} />
        </View>
        <ActionRow onEdit={onEdit} onDelete={onDelete} />
      </View>
    </View>
  );
}

function IngredientAdminCard({ ingredient, onEdit, onDelete }: { ingredient: Ingredient; onEdit: () => void; onDelete: () => void }) {
  return (
    <View style={{ minHeight: 96, borderRadius: 14, backgroundColor: colors.white, padding: 12, flexDirection: "row", gap: 12, alignItems: "center" }}>
      <RemoteImage uri={ingredient.imageUrl} style={{ width: 74, height: 74, borderRadius: 14, backgroundColor: colors.secondary }} />
      <View style={{ flex: 1, gap: 5 }}>
        <Text style={{ color: colors.textDark, fontSize: 16, fontWeight: "900" }} selectable>
          {ingredient.name}
        </Text>
        <Text style={{ color: colors.mutedDark, fontSize: 12, fontWeight: "800" }} selectable>
          {ingredient.category || "Other"} · {ingredient.unit}
        </Text>
        <Text style={{ color: colors.primaryDark, fontSize: 11, fontWeight: "900" }} selectable>
          {ingredient.caloriesPerUnit} kcal · Đạm {ingredient.proteinPerUnit}g
        </Text>
      </View>
      <View style={{ gap: 8 }}>
        <IconButton icon="pencil-outline" tone="edit" onPress={onEdit} />
        <IconButton icon="trash-can-outline" tone="delete" onPress={onDelete} />
      </View>
    </View>
  );
}

function StatusPill({ text, tone }: { text: string; tone: "admin" | "user" | "active" | "inactive" }) {
  const backgroundColor = tone === "inactive" ? "rgba(255,77,79,0.14)" : tone === "admin" ? colors.secondary : "#EEF3EF";
  const color = tone === "inactive" ? colors.danger : tone === "admin" ? colors.primaryDark : colors.mutedDark;
  return (
    <View style={{ alignSelf: "flex-start", borderRadius: 999, backgroundColor, paddingHorizontal: 9, paddingVertical: 5 }}>
      <Text style={{ color, fontSize: 10, fontWeight: "900" }} selectable>
        {text}
      </Text>
    </View>
  );
}

function MiniInfo({ icon, text }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; text: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
      <MaterialCommunityIcons name={icon} size={15} color={colors.primary} />
      <Text style={{ color: colors.primaryDark, fontSize: 12, fontWeight: "800" }} selectable>
        {text}
      </Text>
    </View>
  );
}

function ActionRow({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <View style={{ flexDirection: "row", gap: 10 }}>
      <Pressable onPress={onEdit} style={({ pressed }) => ({ flex: 1, minHeight: 44, borderRadius: 12, backgroundColor: "#EEF3EF", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 7, opacity: pressed ? 0.82 : 1 })}>
        <MaterialCommunityIcons name="pencil-outline" size={18} color={colors.textDark} />
        <Text style={{ color: colors.textDark, fontWeight: "900" }} selectable>
          Sửa
        </Text>
      </Pressable>
      <Pressable onPress={onDelete} style={({ pressed }) => ({ flex: 1, minHeight: 44, borderRadius: 12, backgroundColor: "rgba(255,77,79,0.14)", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 7, opacity: pressed ? 0.82 : 1 })}>
        <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.danger} />
        <Text style={{ color: colors.danger, fontWeight: "900" }} selectable>
          Xóa
        </Text>
      </Pressable>
    </View>
  );
}

function IconButton({ icon, tone, onPress }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; tone: "edit" | "delete"; onPress: () => void }) {
  const color = tone === "delete" ? colors.danger : colors.primaryDark;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ width: 38, height: 38, borderRadius: 12, backgroundColor: tone === "delete" ? "rgba(255,77,79,0.12)" : colors.secondary, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.76 : 1 })}>
      <MaterialCommunityIcons name={icon} size={20} color={color} />
    </Pressable>
  );
}

function RemoteImage({ uri, style }: { uri?: string | null; style: object }) {
  const [failed, setFailed] = useState(false);
  return <Image source={{ uri: failed ? FALLBACK_FOOD_IMAGE_URL : normalizeRemoteImageUrl(uri) }} onError={() => setFailed(true)} style={style} />;
}

function LoadingCard() {
  return (
    <View style={{ minHeight: 92, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center", gap: 10 }}>
      <ActivityIndicator color={colors.primary} />
      <Text style={{ color: colors.text, fontWeight: "800" }} selectable>
        Đang tải dữ liệu...
      </Text>
    </View>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <View style={{ minHeight: 92, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center", gap: 8, padding: 16 }}>
      <MaterialCommunityIcons name="database-search-outline" size={28} color={colors.primary} />
      <Text style={{ color: colors.text, fontSize: 13, fontWeight: "900", textAlign: "center" }} selectable>
        {message}
      </Text>
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

function ConfirmDeleteModal({ target, isSaving, onCancel, onConfirm }: { target: DeleteTarget; isSaving: boolean; onCancel: () => void; onConfirm: () => void }) {
  const label = target?.type === "users" ? "user" : target?.type === "recipes" ? "công thức" : "nguyên liệu";
  return (
    <Modal transparent visible={Boolean(target)} animationType="fade" onRequestClose={onCancel}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.58)", padding: 22, justifyContent: "center" }}>
        <View style={{ borderRadius: 18, backgroundColor: colors.white, padding: 18, gap: 14 }}>
          <View style={{ width: 54, height: 54, borderRadius: 18, backgroundColor: "rgba(255,77,79,0.14)", alignItems: "center", justifyContent: "center" }}>
            <MaterialCommunityIcons name="trash-can-outline" size={30} color={colors.danger} />
          </View>
          <Text style={{ color: colors.textDark, fontSize: 22, fontWeight: "900" }} selectable>
            Xóa {label}?
          </Text>
          <Text style={{ color: colors.mutedDark, fontSize: 14, fontWeight: "700", lineHeight: 21 }} selectable>
            {target?.name} sẽ bị xóa khỏi hệ thống quản trị.
          </Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable onPress={onCancel} disabled={isSaving} style={({ pressed }) => ({ flex: 1, minHeight: 50, borderRadius: 25, backgroundColor: "#EEF3EF", alignItems: "center", justifyContent: "center", opacity: pressed || isSaving ? 0.76 : 1 })}>
              <Text style={{ color: colors.textDark, fontSize: 15, fontWeight: "900" }} selectable>
                Hủy
              </Text>
            </Pressable>
            <Pressable onPress={onConfirm} disabled={isSaving} style={({ pressed }) => ({ flex: 1, minHeight: 50, borderRadius: 25, backgroundColor: colors.danger, alignItems: "center", justifyContent: "center", opacity: pressed || isSaving ? 0.76 : 1 })}>
              <Text style={{ color: colors.white, fontSize: 15, fontWeight: "900" }} selectable>
                {isSaving ? "Đang xóa..." : "Xóa"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
