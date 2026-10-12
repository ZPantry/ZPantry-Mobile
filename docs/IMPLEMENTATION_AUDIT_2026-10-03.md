# Z Pantry — implementation audit, 03/10/2026

> Follow-up: Figma access was restored later on 03/10/2026 and the Google Web Client ID was supplied. The findings below preserve the initial audit; current UI changes, asset provenance, successful Android build and remaining device verification are recorded in [FIGMA_UI_SYNC_2026-10-03.md](./FIGMA_UI_SYNC_2026-10-03.md).

## Sources and scope

- Existing frontend: Expo `~56.0.22`, React Native `0.85.3`, React `19.2.3`, TypeScript. Entry: `App.tsx`; React Navigation native stack + bottom tabs in `src/navigation/AppNavigator.tsx` (no Expo Router).
- Live [Swagger](https://zpantry-java-backend.onrender.com/swagger-ui/index.html) and [OpenAPI](https://zpantry-java-backend.onrender.com/v3/api-docs), captured in `work/openapi-2026-10-03.json`.
- [Figma](https://www.figma.com/design/GnukHGzE3ozMiYBoFGYSwj/Z-Pantry?node-id=0-1): **blocked**. MCP returned no edit access; connected account `luanotse184297@fpt.edu.vn` has a View seat. No claims about screen fidelity or missing design frames can be made yet.
- Baseline: typecheck PASS; 36/36 API tests PASS. These are synthetic client tests, not production happy-path verification. Older local backend audit findings are not assumed to describe today's deployed server.
- Existing uncommitted UI changes are preserved. Backend is outside the change scope.

## Existing architecture

- Shared components: `PrimaryButton`, `SelectField` (`@expo/ui`), `AllergenChoices`, `ScreenScrollView`, cards, headers, confirmation modal and `BrandPanel`; colors/spacing/radii in `src/constants/colors.ts`.
- `src/api/client.ts`: fetch, configurable base URL, bearer auth, timeout/cancellation, envelope parsing, one shared refresh request and one retry after 401. No new HTTP client needed.
- `AuthContext`: hydration, sign-in/out, protected navigation and per-user onboarding. `authStorage`: SecureStore on native; local/session storage on web; remembered vs temporary sessions; revision guard prevents late refresh from restoring a signed-out session.
- Screen state uses React hooks and contexts; reads generally use focus effects, loading/error/empty states; mutations use disabled buttons and guards. API types live with the existing services.
- Configuration: `.env.example` lists API host, Android override and OAuth client IDs. Current environment lacks Google Web/iOS IDs. Google Web client ID is also required for native ID tokens; Android client ID alone is insufficient.

## Feature audit before implementation

All UI entries below describe source implementation only; Figma comparison remains unverified.

| Module | Existing screen(s) | API mapping | Finding / next action |
|---|---|---|---|
| Email auth | `LoginScreen` (login/register/OTP modes) | POST `/api/Auth/login`, `/register`, `/verify-otp` | Integrated with validation, pending/error/success and remembered session. Login incorrectly rejects passwords shorter than 8 before the server can validate existing credentials. |
| Session | `AuthContext`, `authStorage`, API client | POST `/api/Auth/refresh-token`, `/logout` | Automatic refresh/restoration/logout already implemented; preserve and regression-test. |
| Google auth | `LoginScreen` placeholder | POST `/api/Auth/google`, JSON `{idToken}`, response `AuthResponse` | Highest-priority available auth integration. Obtain a provider ID token, exchange it with Java, then reuse `signIn`; never store a Google token as a Z Pantry session. |
| Onboarding / nutrition profile | `ProfileSetupScreen`, `InteractiveGuideScreen` | Existing GET/PUT `/api/users/{userId}/profile`; current GET/PUT `/api/me/profile/v2` | Legacy form has age/single goal. V2 needs birth date, uppercase gender, heightCm/weightKg, activityLevel and multiple goals; returns server-calculated nutrition targets/warnings. Extend existing service/form. |
| Home | `HomeScreen` | GET `/api/recipes`, `/api/ingredients`, `/api/me/pantry` | Reads real data, search and expiry alerts. No invented calories; visually unverified. |
| Profile / account | `ProfileScreen`, `AccountSettingsScreen` | PUT `/api/users/{id}` | Name/password save and context sync exist. Avatar field exists in API but is not yet exposed by account UI. |
| Pantry | `PantryScreen`, `AddIngredientScreen`, `PantryItemDetailScreen`, `QuickAddScreen` | GET `/api/me/pantry`; POST `/api/me/pantry/items`; PUT/DELETE `/api/me/pantry/items/{itemId}` | Existing CRUD, pagination and validation. Preserve. |
| Import | `PantryImportScreen` | POST `/api/me/pantry/parse`, `/api/me/pantry-import/receipt/analyze`, `/food-image/analyze`, `/confirm` | Text/images/menu preview and explicit confirmation exist. Server availability/recognition quality requires real signed-in testing. |
| Recipes | `RecipeDetailScreen`, `CreateRecipeScreen`, admin forms | GET `/api/recipes/{id}`, POST/PUT `/api/v2/recipes[/{id}]`, media upload | Existing detail/create/edit and upload reuse the API client. Preserve. |
| Suggestions | `MealSuggestionScreen`, `ManualMealSuggestionScreen`, results | POST `/api/recommendations/v2/meals`, `/api/recommendations/meals` | Existing AI integration sends topK only for V2. UI blocks empty pantry although current V2 supports PROFILE_BASED. Extend current controls and request type after profile update. |
| Planner / cooking history | `PlanScreen`, `TodayMenuItemDetailScreen`, `CookingHistoryScreen` | GET `/api/me/today-menu`; POST `/items`; GET/DELETE `/items/{itemId}`; POST `/items/{itemId}/complete`; GET `/api/me/cooking-logs` | Existing date-based menu, completion upload and history. Detail composes recipe/pantry from documented endpoints. |
| Admin | management/user/recipe/ingredient forms | users/catalog CRUD; PATCH `/api/admin/users/{id}/role` | Existing role guards. Alias management/image analysis/feedback APIs have no clearly required UI; do not automatically create screens. |

OpenAPI declares global bearer security, including auth operations; operation declarations do not describe all error responses. Existing public login/register/OTP behavior is preserved; protected requests keep `auth: true`. Do not interpret undocumented status codes as a guarantee.

## MISSING BACKEND API

No documented endpoints for forgot/reset password, resending OTP, Facebook login, shopping lists, notification preferences/center, VIP membership, device connection or support submissions. Existing unavailable controls remain honest about availability. Implementing these requires backend contracts first; do not guess routes or emulate them through registration.

## Implementation order

1. Authentication: Google exchange + provider integration, preserve session architecture, correct login validation and pending controls.
2. Existing nutrition profile: V2 form/service + server targets, optional onboarding skip preserved.
3. Existing personalized suggestions: expose documented modes and filters, allow profile-only requests without pantry prerequisites.
4. Recheck UI against Figma once access is available; then patch only measured differences. Verify signed-in backend flows and native OAuth on configured builds.

## Implemented modules

### Authentication

- Connected `POST /api/Auth/google` using the existing API client and `LoginResponse`, then the existing `AuthContext.signIn(session, rememberMe)` and storage. Provider credentials never become Z Pantry bearer credentials.
- Web reuses installed Expo AuthSession; Android/iOS use `@react-native-google-signin/google-signin` (installed with `expo install`). Cancellation leaves the user signed out; missing configuration, provider failures, Java failures and submitting state are handled.
- Login now sends existing passwords to the server regardless of new-password length/prefix rules. Passwords are not trimmed. Registration keeps its existing new-password policy.
- Remember/terms controls and social buttons are locked while signing in. Existing refresh, logout, email registration and OTP architecture remains in place.
- Files: `src/api/auth.ts`, `src/api/endpoints.ts`, `src/screens/LoginScreen.tsx`, `src/hooks/useGoogleSignIn.ts`, `src/hooks/useGoogleSignIn.web.ts`, `package.json`, `package-lock.json`, `app.config.js`, `.env.example`, `tests/api-contract.test.cjs`.

### Existing nutrition profile

- Added GET/PUT `/api/me/profile/v2` to the existing profile service; retained legacy owner-route methods for compatibility.
- Updated the existing form for birth date (date-only string), uppercase gender, heightCm/weightKg, activityLevel, multiple goals and current diet enums. Native date selection uses the already installed `@expo/ui`; web accepts typed YYYY-MM-DD.
- Required V2 fields are validated before saving; date rollover/future dates are rejected, height is 50–300 cm and weight is 20–500 kg per Swagger. Onboarding can still be skipped without creating fabricated profile values.
- No selected allergies sends `NO_ALLERGIES`; real selections exclude that sentinel. Server nutrition targets/warnings are displayed without local estimates. A save returning a warning stays on the form with a Continue action so the result can be read before navigation.
- Failed saves keep the draft. Inputs, checkboxes and native/web pickers are disabled during submission. Selected multi-goal checkboxes expose their actual accessibility state.
- Files: `src/api/profile.ts`, `src/api/endpoints.ts`, `src/screens/ProfileSetupScreen.tsx`, `src/components/SelectField.tsx`, `src/utils/userProfile.ts`, `tests/api-contract.test.cjs`.

### Existing personalized suggestions

- Extended `POST /api/recommendations/v2/meals` with documented `mode`, `mealType`, `maxCookTimeMinutes`, `servings` and optional `includeIngredients` in the existing service; the screen exposes modes, meal/time/serving filters and existing topK selection.
- AUTO/PROFILE_BASED can request suggestions with an empty pantry; PANTRY_BASED retains the pantry prerequisite. Existing empty/error/result behavior is reused.
- Result navigation carries the selected mode. Descriptions reflect profile/pantry/manual requests; profile-only results do not claim to have used pantry ingredients or render an empty ingredient card.
- Files: `src/api/recommendations.ts`, `src/screens/MealSuggestionScreen.tsx`, `src/screens/MealRecommendationResultsScreen.tsx`, `src/types/index.ts`, `src/components/SelectField.tsx`, `tests/api-contract.test.cjs`.

### New contract details

| Endpoint | Request | Response used | Auth / errors |
|---|---|---|---|
| POST `/api/Auth/google` | JSON `{idToken: string}`; no Google access token/profile object | Envelope `data: AuthResponse` with accessToken, refreshToken, expiresAt, fullName, email, role | Public sign-in flow, following existing email auth convention. Handle provider cancellation separately; surface Java errors through existing parser. Swagger's global bearer declaration is ambiguous for sign-in routes. |
| GET `/api/me/profile/v2` | No userId/body | Envelope `data: Response`; nullable profile values plus calculated targets/warnings | Existing bearer mechanism; loading/error/retry. |
| PUT `/api/me/profile/v2` | birthDate, gender, heightCm, weightKg, activityLevel, dietPreference; goals/allergies arrays | Updated `Response` with server targets, weightLossAllowed, healthWarning | Existing bearer mechanism; keep draft on failure; one active save. |
| POST `/api/recommendations/v2/meals` | topK + optional mode (AUTO/PANTRY_BASED/PROFILE_BASED), mealType, maxCookTimeMinutes, servings, includeIngredients | Existing nested AI result normalization; do not fabricate persisted meal IDs | Existing bearer mechanism, 60s timeout and error/empty states. |

Swagger documents HTTP 200 responses for these routes; it does not enumerate their full failure status contract. Existing client handles HTTP errors and `success: false` envelopes.

## Verification and remaining work

- TypeScript PASS; 42/42 API regression tests PASS (36 baseline + 6 new cases).
- Expo web export PASS; Android Hermes bundle export PASS. The Android export is **not** a Gradle APK build or device OAuth test.
- Expo config resolves both without an iOS OAuth client and with a synthetic configured client; the plugin registers the reversed Google callback scheme while preserving app.json settings.
- Browser QA uses isolated synthetic responses only, outside production app source: short existing login password reaches sign-in, invalid birth date is blocked, a failed save preserves date/multiple goals, retry succeeds, server warnings remain visible after saving until Continue is selected, reloaded profile retains selections, profile-only filters work with an empty pantry, PANTRY_BASED is disabled when empty, and result copy/empty state matches the selected mode. Layout inspected at 440 × 900. This is not live backend parity or Figma fidelity verification.
- Two unauthenticated live smoke calls (invalid Google token and profile GET) timed out without an HTTP status. Actual production sign-in/profile/recommendation flows remain unverified.
- Google setup still requires a **Web** OAuth client ID matching the audience accepted by Java. For web, register the exact web redirect URI (use `EXPO_PUBLIC_AUTH_REDIRECT_URI` when needed). For Android, register `com.zpantry.app` and the signing certificate SHA-1 in Google Cloud; the Web ID requests the server ID token. Rebuild the development/native app after adding this native dependency; email login remains usable in older builds, but native Google login needs the new module. For iOS, provide its client ID and the project's actual bundle identifier before building. No client secret belongs in Expo public variables.
- Configuration references: [Expo SDK 56 AuthSession](https://docs.expo.dev/versions/v56.0.0/sdk/auth-session/), [Google Sign-In Expo setup](https://react-native-google-signin.github.io/docs/setting-up/expo), [Google Sign-In configuration](https://react-native-google-signin.github.io/docs/original).
- Next: restore Figma access, compare each current screen/frame and patch measured UI differences. Verify signed-in production flows and Google on configured devices. Avatar account UI and any further design-required functionality should be scoped from the accessible design; undocumented shopping/notification/VIP/Facebook/reset-password functionality remains blocked on backend contracts.
