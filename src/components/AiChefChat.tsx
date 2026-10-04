import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, TextInput, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Text from './AppText';
import FigmaAsset from './FigmaAsset';
import { homeAssets } from '@/constants/figmaAssets';
import { colors } from '@/constants/colors';
import { recommendationsApi, type MealRecommendation } from '@/api/recommendations';
import { recipesApi } from '@/api/recipes';
import { pantryApi } from '@/api/pantry';
import { ingredientsApi } from '@/api/ingredients';
import { getFriendlyErrorMessage } from '@/utils/localize';

type Message = { id: number; role: 'user' | 'assistant'; text: string; recipes?: MealRecommendation[]; failedPrompt?: string };
export default function AiChefChat() {
  const navigation = useNavigation<any>();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const minY = insets.top + 68, maxY = Math.max(minY, height - insets.bottom - 120), maxX = Math.max(8, width - 64);
  const x = useSharedValue(Math.max(8, width - 68)), y = useSharedValue(maxY);
  const startX = useSharedValue(0), startY = useSharedValue(0), dragged = useSharedValue(false);
  useEffect(() => { x.set(Math.max(8, Math.min(maxX, x.get()))); y.set(Math.max(minY, Math.min(maxY, y.get()))); }, [maxX, maxY, minY, x, y]);
  const drag = Gesture.Pan().minDistance(6)
    .onBegin(() => { dragged.set(false); })
    .onStart(() => { startX.set(x.get()); startY.set(y.get()); dragged.set(true); })
    .onUpdate(e => { x.set(Math.max(8, Math.min(maxX, startX.get() + e.translationX))); y.set(Math.max(minY, Math.min(maxY, startY.get() + e.translationY))); });
  const position = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }, { translateY: y.get() }] }));
  const [open, setOpen] = useState(false), [input, setInput] = useState(''), [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Message[]>([{ id: 0, role: 'assistant', text: 'Hôm nay bạn muốn ăn gì? Cho mình biết món muốn nấu hoặc nguyên liệu bạn đang có nhé.' }]);
  const lock = useRef(false), sequence = useRef(1), scroll = useRef<ScrollView>(null);
  const send = async (retry?: string) => {
    const prompt = (retry ?? input).trim();
    if (!prompt || lock.current) return;
    lock.current = true; setBusy(true);
    if (!retry) { setInput(''); setMessages(v => [...v, { id: sequence.current++, role: 'user', text: prompt }]); }
    try {
      const [recipes, pantry, ingredients] = await Promise.all([recipesApi.all(), pantryApi.all(), ingredientsApi.all()]);
      const names = new Map(ingredients.map(i => [i.id, i.name]));
      const today = Date.now();
      const available = pantry.filter(i => i.quantity > 0 && (!i.expiredAt || new Date(i.expiredAt).getTime() >= today));
      const result = await recommendationsApi.suggestMeals({ inputIngredientText: prompt, topK: 3,
        selectedIngredients: available.map(i => ({ ingredientId: i.ingredientId, name: i.ingredientName || names.get(i.ingredientId) || '', quantity: i.quantity, unit: i.unit })).filter(i => i.name),
        candidateRecipes: recipes.map(r => ({ recipeId: r.id, recipeName: r.name, ingredientNames: (r.ingredients || []).map(i => i.ingredientName).filter(Boolean), instructionText: r.instructionText })) });
      const resolved = result.recommendations.map(r => ({ ...r, name: recipes.find(recipe => recipe.id === r.recipeId)?.name || r.name }));
      setMessages(v => [...v, { id: sequence.current++, role: 'assistant', text: resolved.length ? 'Mình tìm được các công thức này. Chạm vào món để xem nguyên liệu và cách nấu.' : 'Chưa tìm được món phù hợp. Thử mô tả nguyên liệu hoặc món ăn khác nhé.', recipes: resolved }]);
    } catch (e) {
      setMessages(v => [...v, { id: sequence.current++, role: 'assistant', text: getFriendlyErrorMessage(e, 'Chưa nhận được gợi ý. Bạn có thể thử gửi lại.'), failedPrompt: prompt }]);
    } finally { lock.current = false; setBusy(false); }
  };
  return <>
    <GestureDetector gesture={drag}>
      <Animated.View collapsable={false} testID="draggable-ai" style={[{ position: 'absolute', top: 0, left: 0, width: 56, height: 54, zIndex: 20 }, position]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Mở chat đầu bếp AI" accessibilityHint="Kéo để di chuyển; chạm để mở chat" accessibilityState={{ expanded: open }}
          onPress={() => { if (!dragged.get()) setOpen(true); }}
          style={{ width: 56, height: 54, alignItems: 'center', justifyContent: 'center', borderRadius: 28, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.secondary, boxShadow: '0 3px 12px rgba(0,48,20,0.18)' }}>
          <View pointerEvents="none"><FigmaAsset asset={homeAssets.imgProperty1Default} label="Đầu bếp AI" style={{ width: 50, height: 46 }} /></View>
        </Pressable>
      </Animated.View>
    </GestureDetector>
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <SafeAreaView style={{ flex: 1, backgroundColor: 'rgba(0,20,10,0.35)' }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'center', padding: 16 }}>
          <View accessibilityViewIsModal style={{ width: '100%', maxWidth: 440, alignSelf: 'center', height: Math.min(620, height - 80), maxHeight: '100%', backgroundColor: colors.surface, borderColor: '#EF9D1F', borderWidth: 5, borderRadius: 18, boxShadow: '0 16px 50px rgba(0,30,15,0.2)' }}>
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', padding: 14, borderBottomWidth: 1, borderColor: colors.line }}>
              <FigmaAsset asset={homeAssets.imgProperty1Default} style={{ width: 44, height: 40 }} /><View style={{ flex: 1, gap: 3 }}><Text style={{ color: colors.dark, fontWeight: '700', fontSize: 16 }}>Đầu bếp Z-Pantry</Text><Text style={{ color: colors.muted, fontSize: 11 }}>Gợi ý món & công thức từ nguyên liệu</Text></View>
              <Pressable accessibilityRole="button" accessibilityLabel="Đóng chat AI" onPress={() => setOpen(false)} style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="close" color={colors.primaryDark} size={24} /></Pressable>
            </View>
            <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" style={{ flex: 1 }} contentContainerStyle={{ padding: 14, gap: 18 }} onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}>
              {messages.map(m => <View key={m.id} style={{ flexDirection: m.role === 'user' ? 'row-reverse' : 'row', gap: 8, alignItems: 'flex-start' }}>
                {m.role === 'assistant' ? <View style={{ backgroundColor: '#00ABC1', borderRadius: 20, padding: 3 }}><FigmaAsset asset={homeAssets.imgProperty1Default} style={{ width: 26, height: 24 }} /></View> : <View style={{ backgroundColor: colors.secondary, borderRadius: 20, padding: 6 }}><Ionicons name="person" size={18} color={colors.primaryDark} /></View>}
                <View style={{ maxWidth: '82%', flexShrink: 1, gap: 8 }}>
                  <Text selectable style={{ backgroundColor: m.role === 'user' ? '#EF9D1F' : '#EFEFEC', color: m.role === 'user' ? colors.white : colors.text, borderRadius: 14, padding: 12, fontSize: 13, lineHeight: 21 }}>{m.text}</Text>
                  {m.recipes?.map(r => <Pressable key={r.mealId} accessibilityRole="button" accessibilityLabel={`Xem công thức ${r.name}`} disabled={!r.recipeId} onPress={() => { setOpen(false); navigation.navigate('RecipeDetail', { recipeId: r.recipeId }); }} style={{ borderRadius: 12, backgroundColor: colors.secondary, borderWidth: 1, borderColor: colors.primary, padding: 12, gap: 6 }}><Text style={{ color: colors.primaryDark, fontWeight: '700' }}>{r.name}</Text><Text style={{ fontSize: 12, color: colors.text, lineHeight: 19 }}>{r.reason || r.description}</Text>{r.missingIngredients.length ? <Text style={{ color: colors.muted, fontSize: 11 }}>Cần thêm: {r.missingIngredients.join(', ')}</Text> : null}<Text style={{ color: colors.primaryDark, fontSize: 12 }}>Xem cách nấu →</Text></Pressable>)}
                  {m.failedPrompt ? <Pressable accessibilityRole="button" disabled={busy} onPress={() => void send(m.failedPrompt)} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ color: colors.primaryDark }}>Thử gửi lại</Text></Pressable> : null}
                </View>
              </View>)}
              {busy ? <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', gap: 8, alignItems: 'center', padding: 12 }}><ActivityIndicator color={colors.primary} /><Text style={{ color: colors.muted, fontSize: 12 }}>Đầu bếp đang tìm món cho bạn…</Text></View> : null}
            </ScrollView>
            <View style={{ padding: 12, flexDirection: 'row', gap: 8, alignItems: 'flex-end', borderTopWidth: 1, borderColor: colors.line }}>
              <View style={{ flex: 1, borderRadius: 14, backgroundColor: colors.input }}><TextInput accessibilityLabel="Tin nhắn cho đầu bếp AI" placeholder="Bạn muốn nấu món gì…" placeholderTextColor={colors.muted} value={input} onChangeText={setInput} maxLength={2000} multiline editable={!busy} style={{ minHeight: 48, maxHeight: 100, padding: 12, fontSize: 13, color: colors.text }} /></View>
              <Pressable accessibilityRole="button" accessibilityLabel="Gửi tin nhắn AI" disabled={busy || !input.trim()} onPress={() => void send()} style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center', opacity: busy || !input.trim() ? 0.45 : 1 }}><Ionicons name="send" color={colors.primary} size={23} /></Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  </>;
}
