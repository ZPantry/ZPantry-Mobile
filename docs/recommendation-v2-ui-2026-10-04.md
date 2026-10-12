# Recommendation V2 UI handoff

The mobile app now consumes the deterministic `POST /api/recommendations/v2/meals` response.

- The existing meal-suggestion form can request 5 or 10 meals.
- Result cards show server-derived match/missing ingredients, ingredients expiring soon, cooking time,
  and ranking reasons.
- The `Phân tích danh sách món` action opens a clearly labelled sample analysis screen. It only uses
  the already returned ranked recipes and is not an AI call.

The future AI analysis/chat endpoint must accept a fixed recipe-ID list from this response and must
not return new recipe selections. Once that backend contract exists, replace the sample answer in
`RecommendationAnalysisSampleScreen` with that call while retaining this bounded context.
