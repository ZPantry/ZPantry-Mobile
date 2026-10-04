// Routes checked against the deployed OpenAPI contract on 2026-10-04.
// ingredients.item supports PUT/DELETE; Java has no GET ingredient detail route.
const item = (base: string, id: string) => `${base}/${encodeURIComponent(id)}`;

export const endpoints = {
  auth: {
    register: "/api/Auth/register",
    verifyOtp: "/api/Auth/verify-otp",
    login: "/api/Auth/login",
    google: "/api/Auth/google",
    refreshToken: "/api/Auth/refresh-token",
    logout: "/api/Auth/logout",
    forgotPassword: "/api/Auth/forgot-password",
    resetPassword: "/api/Auth/reset-password"
  },
  users: { list: "/api/users", item: (id: string) => item("/api/users", id), role: (id: string) => `${item("/api/admin/users", id)}/role` },
  media: { upload: "/api/media/upload", remove: "/api/media" },
  profile: (id: string) => `${item("/api/users", id)}/profile`,
  profileV2: "/api/me/profile/v2",
  pantryImport: {
    text: "/api/me/pantry/parse",
    receipt: "/api/me/pantry-import/receipt/analyze",
    food: "/api/me/pantry-import/food-image/analyze",
    confirm: "/api/me/pantry-import/confirm",
    autoImage: "/api/v2/ingredients/analyze-image"
  },
  ingredients: {
    list: "/api/ingredients",
    item: (id: string) => item("/api/ingredients", id),
    create: "/api/v2/ingredients",
    update: (id: string) => item("/api/v2/ingredients", id),
    aliases: (id: string) => `${item("/api/ingredients", id)}/aliases`,
    alias: (id: string, aliasId: string) => `${item("/api/ingredients", id)}/aliases/${encodeURIComponent(aliasId)}`
  },
  recipes: {
    list: "/api/recipes",
    item: (id: string) => item("/api/recipes", id),
    create: "/api/v2/recipes",
    update: (id: string) => item("/api/v2/recipes", id)
  },
  pantry: {
    list: "/api/me/pantry",
    create: "/api/me/pantry/items",
    batch: "/api/me/pantry/items/batch",
    item: (id: string) => item("/api/me/pantry/items", id)
  },
  recommendations: {
    personalized: "/api/recommendations/v2/meals",
    meals: "/api/recommendations/meals",
    item: (id: string) => item("/api/recommendations", id),
    feedback: (id: string) => `${item("/api/recommendations", id)}/feedback`,
    suggestMissing: "/api/recommendations/missing-ingredients",
    missingIngredients: (id: string) => `${item("/api/recommendations/meals", id)}/missing-ingredients`
  },
  todayMenu: {
    list: "/api/me/today-menu",
    create: "/api/me/today-menu/items",
    item: (id: string) => item("/api/me/today-menu/items", id),
    complete: (id: string) => `${item("/api/me/today-menu/items", id)}/complete`,
    cookingLogs: "/api/me/cooking-logs"
  }
} as const;
