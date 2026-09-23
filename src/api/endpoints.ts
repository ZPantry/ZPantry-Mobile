// MIG-004/005 retain these routes. MIG-001–003 are examples, not contracts.
// MIG-006 routes below preserve the existing client pending ENDPOINT_COVERAGE.md.
const item = (base: string, id: string) => `${base}/${encodeURIComponent(id)}`;

export const endpoints = {
  auth: {
    register: "/api/Auth/register",
    verifyOtp: "/api/Auth/verify-otp",
    login: "/api/Auth/login",
    refreshToken: "/api/Auth/refresh-token",
    logout: "/api/Auth/logout"
  },
  users: { list: "/api/users", item: (id: string) => item("/api/users", id) },
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
