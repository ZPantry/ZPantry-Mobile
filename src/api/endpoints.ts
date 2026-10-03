// Routes checked against the local Java controllers on 2026-09-28.
// ingredients.item supports PUT/DELETE; Java has no GET ingredient detail route.
const item = (base: string, id: string) => `${base}/${encodeURIComponent(id)}`;

export const endpoints = {
  auth: {
    register: "/api/Auth/register",
    verifyOtp: "/api/Auth/verify-otp",
    login: "/api/Auth/login",
    google: "/api/Auth/google",
    refreshToken: "/api/Auth/refresh-token",
    logout: "/api/Auth/logout"
  },
  users: { list: "/api/users", item: (id: string) => item("/api/users", id) },
  profile: (id: string) => `${item("/api/users", id)}/profile`,
  profileV2: "/api/me/profile/v2",
  pantryImport: {
    text: "/api/me/pantry/parse",
    receipt: "/api/me/pantry-import/receipt/analyze",
    food: "/api/me/pantry-import/food-image/analyze",
    confirm: "/api/me/pantry-import/confirm"
  },
  ingredients: {
    list: "/api/ingredients",
    item: (id: string) => item("/api/ingredients", id),
    create: "/api/v2/ingredients",
    update: (id: string) => item("/api/v2/ingredients", id)
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
    item: (id: string) => item("/api/me/pantry/items", id)
  },
  recommendations: {
    personalized: "/api/recommendations/v2/meals",
    meals: "/api/recommendations/meals",
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
