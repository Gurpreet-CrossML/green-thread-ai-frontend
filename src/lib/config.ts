const DJANGO_BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:8000";
const LOCAL_BASE_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || "";

export type APITarget = "django" | "local";

/**
 * Build an API URL against the requested backend.
 *  - target "django": the Django backend.
 *  - target "local" (default): this Next.js app's own /api routes.
 */
export function createAPIUrl(path?: string, target: APITarget = "local") {
  const rawBase = target === "django" ? DJANGO_BASE_URL : LOCAL_BASE_URL;
  const baseUrl = rawBase.endsWith("/") ? rawBase.slice(0, -1) : rawBase;
  const formattedPath = path ? (path.startsWith("/") ? path : `/${path}`) : "";
  return `${baseUrl}/api${formattedPath}`;
}

export function createWebSocketUrl(path?: string) {
  const baseUrl = DJANGO_BASE_URL.replace(/\/$/, "");
  const wsBaseUrl = baseUrl.replace(/^http/, "ws");
  const formattedPath = path ? (path.startsWith("/") ? path : `/${path}`) : "";

  return `${wsBaseUrl}/ws${formattedPath}`;
}

export const ENDPOINTS = {
  login: () => createAPIUrl("/auth/login/", "django"),

  // Auth/session (Django) — token lifecycle + identity.
  refreshToken: () => createAPIUrl("/auth/token/refresh/", "django"),
  verifyToken: () => createAPIUrl("/auth/token/verify/", "django"),
  logout: () => createAPIUrl("/auth/logout/", "django"),
  profile: () => createAPIUrl("/auth/profile/", "django"),

  // Password reset (Django, public). Called without the session token: a
  // revoked token on a public endpoint would fail authentication.
  forgotPassword: () => createAPIUrl("/auth/password/forgot/", "django"),
  openResetLink: () => createAPIUrl("/auth/password/reset/validate/", "django"),
  resetPassword: () => createAPIUrl("/auth/password/reset/confirm/", "django"),

  // Chat Websocket (Django)
  chatSocket: (threadId: string, token: string) =>
    createWebSocketUrl(`/chat/${threadId}/?role=agent&token=${token}`),
  createInternalNote: () =>
    createAPIUrl("/chat/messages/internal-note/", "django"),

  // Dashboard Websocket (Django)
  dashboardSocket: (storeCode: string, token: string) =>
    createWebSocketUrl(`/support/dashboard/${storeCode}/?token=${token}`),

  // Image upload (Django) — POST multipart/form-data to this endpoint, then
  // use the returned URL in a message payload.
  uploadAttachments: () =>
    createAPIUrl("/support/attachments/upload/", "django"),

  // Company & staff management (Django /api/tenancy/). These are Django-owned;
  // GET calls must pass `useBackend: true` (writes auto-route to Django).
  fetchCompanyProfile: () => "/tenancy/company/",
  updateCompanyProfile: () => "/tenancy/company/",
  fetchStaff: () => "/tenancy/staff/",

  // Store Management
  fetchStoresList: () => "/store/list",
  // Same list straight from Django — the full store records, for the
  // Settings → Stores screen (GET needs useBackend). The local route above
  // is the ported read the store switcher uses.
  fetchStoresDirectory: () => "/store/list/",
  // The store's widget key, for showing its embed script.
  storeWidgetInit: () => "/store/widget-init/",
  // Per-store settings (Django) — currently the widget's allowed-IP list.
  // GET returns the settings, PATCH updates them.
  storeAllowedIPsSettings: () =>
    createAPIUrl("/store/settings/allowed-ips/", "django"),

  // Dashboard Analytics. Local GET routes (Next) — NO trailing slash, otherwise
  // Next.js issues a 308 redirect (an extra round-trip) before each call.
  fetchDashboard: () => "/analytics/dashboard",
  fetchConversationHistory: () => "/analytics/chat-history",

  // Geography (Django Cities Light). Countries is intentionally limited to
  // India by the backend; states and cities are dependent lists.
  fetchCountries: () => "/core/location/countries/",
  fetchStates: (countryId: number) =>
    `/core/location/countries/${countryId}/states/`,
  fetchCities: (stateId: number) => `/core/location/states/${stateId}/cities/`,

  // Thread-level Analytics (local GETs — no trailing slash).
  fetchThreads: () => "/analytics/threads",
  fetchThreadDetails: (threadId: string) => `/analytics/threads/${threadId}`,
  fetchUserMetadata: (threadId: string) =>
    `/analytics/threads/${threadId}/user-metadata`,
  fetchConversationSummary: (threadId: string) =>
    `/analytics/threads/${threadId}/summary`,
  fetchFeedbackSequence: (threadId: string) =>
    `/analytics/threads/${threadId}/feedback-sequence`,
  fetchTags: (threadId: string) => `/analytics/threads/${threadId}/tags`,
  fetchThreadTagOptions: () => "/analytics/threads/tags",
  fetchAIInsight: (threadId: string) =>
    `/analytics/threads/${threadId}/ai-insights`,
  fetchCartData: (threadId: string) =>
    `/analytics/threads/${threadId}/cart-data`,
};

// Default page size, mirroring DRF's PageNumberPagination.page_size.
// Chatbot widget embed. The script lives on a per-environment bucket; the
// API base is the Django backend the widget talks to (same one this app uses).
export const WIDGET_SCRIPT_SRC =
  process.env.NEXT_PUBLIC_WIDGET_SCRIPT_URL || "";
export const WIDGET_API_BASE = createAPIUrl(undefined, "django");

export const DEFAULT_API_PAGE_SIZE = 15;

// Chatbot feedback rating choices, mirroring the backend RATING_CHOICES.
export const FEEDBACK_RATINGS = [
  { value: "very_bad", label: "😞 Very Bad" },
  { value: "bad", label: "😕 Bad" },
  { value: "neutral", label: "😐 Neutral" },
  { value: "good", label: "😊 Good" },
  { value: "excellent", label: "😄 Excellent" },
] as const;

export type FeedbackRatingValue = (typeof FEEDBACK_RATINGS)[number]["value"];

export const FEEDBACK_RATING_VALUES: readonly FeedbackRatingValue[] =
  FEEDBACK_RATINGS.map((r) => r.value);

// Define a type for paginated API responses
export type PaginationResponse = {
  count: number;
  next?: string | null;
  previous?: string | null;
  results?: object[];
};

export type ErrorResponse = {
  error: string;
};

// Define a common type for API responses
export type APIResponse = {
  success: boolean;
  message?: string;
  data?: object | object[] | PaginationResponse | ErrorResponse | null;
};
