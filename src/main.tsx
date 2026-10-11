import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
} from "react";

import { appStorage } from "./storage";
import { createManualSpeech } from "./manualSpeech";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./styles.css";

const API = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

function resolveBackendAssetUrl(value: string) {
  const url = String(value || "").trim();
  if (!url) return "";
  if (/^https?:\/\//i.test(url) || url.startsWith("data:")) return url;
  const normalized = url.startsWith("/") ? url : `/${url}`;
  return `${API}${normalized}`;
}

const FALLBACK_DEMO_CENTER: [number, number] = [22.9734, 78.6569];

const DEMO_MODE = true;
const SCENARIO_SESSION_KEY = "raksha_demo_scenario_v1";

const OSM_RESOURCE_CACHE_MS =
  120000;

const REPORT_LANGUAGES = [
  { label: "Auto detect", code: "auto" },
  { label: "English", code: "en-IN" },
  { label: "हिन्दी", code: "hi-IN" },
  { label: "বাংলা", code: "bn-IN" },
  { label: "ગુજરાતી", code: "gu-IN" },
  { label: "ಕನ್ನಡ", code: "kn-IN" },
  { label: "മലയാളം", code: "ml-IN" },
  { label: "मराठी", code: "mr-IN" },
  { label: "ଓଡ଼ିଆ", code: "or-IN" },
  { label: "ਪੰਜਾਬੀ", code: "pa-IN" },
  { label: "தமிழ்", code: "ta-IN" },
  { label: "తెలుగు", code: "te-IN" },
  { label: "اردو", code: "ur-IN" },
  { label: "Español", code: "es-ES" },
  { label: "Français", code: "fr-FR" },
  { label: "العربية", code: "ar-SA" },
];

function defaultSpeechLanguage() {
  const value = String(
    navigator.language || "en-IN"
  ).toLowerCase();

  if (value.startsWith("hi")) return "hi-IN";
  if (value.startsWith("bn")) return "bn-IN";
  if (value.startsWith("gu")) return "gu-IN";
  if (value.startsWith("kn")) return "kn-IN";
  if (value.startsWith("ml")) return "ml-IN";
  if (value.startsWith("mr")) return "mr-IN";
  if (value.startsWith("or")) return "or-IN";
  if (value.startsWith("pa")) return "pa-IN";
  if (value.startsWith("ta")) return "ta-IN";
  if (value.startsWith("te")) return "te-IN";
  if (value.startsWith("ur")) return "ur-IN";
  if (value.startsWith("es")) return "es-ES";
  if (value.startsWith("fr")) return "fr-FR";
  if (value.startsWith("ar")) return "ar-SA";
  return "en-IN";
}


type ThemeMode = "light" | "dark";

type AppIconName =
  | "sun" | "moon" | "settings" | "volume" | "logout" | "shield"
  | "alert" | "report" | "phone" | "user" | "check" | "refresh"
  | "pin" | "map" | "message" | "mic" | "send" | "close" | "hospital"
  | "fire" | "shelter" | "home" | "help" | "wifi" | "stop" | "mail"
  | "lock" | "users" | "activity" | "chevron" | "image" | "video"
  | "calendar" | "download" | "filter" | "sort" | "search";

const APP_ICON_PATHS: Record<AppIconName, string[]> = {
  sun: ["M12 3v2", "M12 19v2", "M3 12h2", "M19 12h2", "M5.64 5.64l1.42 1.42", "M16.94 16.94l1.42 1.42", "M18.36 5.64l-1.42 1.42", "M7.06 16.94l-1.42 1.42", "M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"],
  moon: ["M20.2 15.2A8.5 8.5 0 0 1 8.8 3.8 8.5 8.5 0 1 0 20.2 15.2Z"],
  settings: ["M4 6h10", "M18 6h2", "M10 6a2 2 0 1 0-4 0 2 2 0 0 0 4 0Z", "M4 12h2", "M10 12h10", "M18 12a2 2 0 1 0-4 0 2 2 0 0 0 4 0Z", "M4 18h8", "M16 18h4", "M16 18a2 2 0 1 0-4 0 2 2 0 0 0 4 0Z"],
  volume: ["M5 9v6h4l5 4V5L9 9H5Z", "M17 9a4 4 0 0 1 0 6", "M19.5 6.5a8 8 0 0 1 0 11"],
  logout: ["M10 5H5v14h5", "M14 8l4 4-4 4", "M18 12H9"],
  shield: ["M12 3l7 3v5c0 4.7-2.8 8-7 10-4.2-2-7-5.3-7-10V6l7-3Z", "M9 12l2 2 4-4"],
  alert: ["M12 3 2.8 19h18.4L12 3Z", "M12 9v4", "M12 16h.01"],
  report: ["M6 3h9l3 3v15H6V3Z", "M15 3v4h4", "M9 11h6", "M9 15h6"],
  phone: ["M7.2 3.5 10 7 8.3 9.2c1.3 2.7 3.8 5.2 6.5 6.5L17 14l3.5 2.8-1.8 3c-.5.8-1.5 1.2-2.4.9C9.6 18.8 5.2 14.4 3.3 7.7c-.3-.9.1-1.9.9-2.4l3-1.8Z"],
  user: ["M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2", "M9.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z", "M17 11l2 2 3-4"],
  check: ["M5 12l4 4L19 6"],
  refresh: ["M20 7v5h-5", "M4 17v-5h5", "M6.1 9A7 7 0 0 1 18.6 7L20 12", "M17.9 15A7 7 0 0 1 5.4 17L4 12"],
  pin: ["M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z", "M12 10a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"],
  map: ["M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z", "M9 3v15", "M15 6v15"],
  message: ["M4 5h16v12H8l-4 4V5Z", "M8 9h8", "M8 13h5"],
  mic: ["M9 5a3 3 0 0 1 6 0v6a3 3 0 0 1-6 0V5Z", "M5 10v1a7 7 0 0 0 14 0v-1", "M12 18v3", "M9 21h6"],
  send: ["M3 11.5 21 3l-7.5 18-2.5-7-8-2.5Z", "M11 14 21 3"],
  close: ["M6 6l12 12", "M18 6 6 18"],
  hospital: ["M5 4h14v16H5V4Z", "M9 8h6", "M12 5v6", "M8 16h8", "M10 20v-4", "M14 20v-4"],
  fire: ["M13 3s1 4-2 6c-2-3-5-1-5 3a6 6 0 0 0 12 0c0-4-2-6-5-9Z", "M12 13c2 2 2 5 0 7-3-1-4-5 0-7Z"],
  shelter: ["M3 11l9-7 9 7", "M5 10v10h14V10", "M9 20v-6h6v6"],
  home: ["M3 11l9-8 9 8", "M5 10v10h14V10", "M9 20v-6h6v6"],
  help: ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z", "M9.7 9a2.5 2.5 0 1 1 4.7 1.2c-.8 1.2-2.4 1.5-2.4 3", "M12 17h.01"],
  wifi: ["M5 12.5a10 10 0 0 1 14 0", "M8 15.5a6 6 0 0 1 8 0", "M11 18.5a2 2 0 0 1 2 0", "M12 21h.01"],
  stop: ["M7 7h10v10H7V7Z"],
  mail: ["M3 5h18v14H3V5Z", "M3 7l9 7 9-7"],
  lock: ["M6 10h12v11H6V10Z", "M8 10V7a4 4 0 0 1 8 0v3"],
  users: ["M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z", "M17 11a3 3 0 1 0 0-6", "M22 21v-2a4 4 0 0 0-3-3.9"],
  activity: ["M3 12h4l2-6 4 12 2-6h6"],
  chevron: ["M9 6l6 6-6 6"],
  image: ["M4 5h16v14H4V5Z", "M8 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z", "M5 17l4-4 3 3 3-4 4 5"],
  video: ["M4 6h11v12H4V6Z", "M15 10l5-3v10l-5-3"],
  calendar: ["M6 3v3", "M18 3v3", "M4 8h16", "M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z", "M8 12h3", "M13 12h3", "M8 16h3"],
  download: ["M12 3v12", "M7 10l5 5 5-5", "M5 20h14"],
  filter: ["M4 5h16", "M7 10h10", "M10 15h4", "M12 15v5"],
  sort: ["M8 6h12", "M8 12h8", "M8 18h4", "M4 5v14", "M2 17l2 2 2-2"],
  search: ["M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z", "M17 17l4 4"],
};

function AppIcon({
  name,
  size = 18,
  className = "",
}: {
  name: AppIconName;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      className={`app-icon ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {APP_ICON_PATHS[name].map((d, index) => (
        <path key={`${name}-${index}`} d={d} />
      ))}
    </svg>
  );
}

function RakshaMark({ small = false }: { small?: boolean }) {
  return (
    <div className={`brand-mark${small ? " small" : ""}`} aria-hidden="true">
      <img src="/raksha-mark.svg" alt="" width={small ? 27 : 31} height={small ? 27 : 31} />
    </div>
  );
}

const HINDI_HAZARDS: Record<string, string> = {
  FLOOD: "बाढ़", CYCLONE: "चक्रवात", EARTHQUAKE: "भूकंप",
  LANDSLIDE: "भूस्खलन", FIRE: "आग", INFRASTRUCTURE: "बुनियादी ढाँचे की समस्या",
  MEDICAL: "चिकित्सा आपात स्थिति", STORM: "तूफ़ान", OTHER: "आपदा",
};

const HINDI_SEVERITY: Record<string, string> = {
  LOW: "कम जोखिम", MODERATE: "मध्यम जोखिम", MEDIUM: "मध्यम जोखिम",
  HIGH: "उच्च जोखिम", CRITICAL: "गंभीर जोखिम", SEVERE: "गंभीर जोखिम",
};

function hindiWarningSummary(warning: ActiveWarning | null): string {
  if (!warning) return "आपके क्षेत्र में अभी कोई सक्रिय आपदा चेतावनी नहीं है।";
  const hazard = HINDI_HAZARDS[String(warning.hazardType).toUpperCase()] || "आपदा";
  const severity = HINDI_SEVERITY[String(warning.severity).toUpperCase()] || "सावधानी आवश्यक";
  return `${hazard} की चेतावनी · ${severity}। आधिकारिक निर्देशों का पालन करें।`;
}

function getPreferredTheme(): ThemeMode {
  const saved = appStorage.getItem("raksha_theme");
  if (saved === "light" || saved === "dark") return saved;

  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<ThemeMode>(() => getPreferredTheme());

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    appStorage.setItem("raksha_theme", theme);
  }, [theme]);

  const nextTheme: ThemeMode = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      className={`theme-toggle${compact ? " compact" : ""}`}
      onClick={() => setTheme(nextTheme)}
      aria-label={`Switch to ${nextTheme} theme`}
      title={`Switch to ${nextTheme} theme`}
    >
      <span className="theme-toggle-icon" aria-hidden="true">
        <AppIcon name={theme === "dark" ? "sun" : "moon"} size={16} />
      </span>
      <span className="theme-toggle-text">
        {theme === "dark" ? "Light" : "Dark"}
      </span>
    </button>
  );
}

const OSM_MIN_REQUEST_GAP_MS =
  30000;

const SAFETY_RESPONSE_WINDOW_MS =
  10 * 60 * 1000;

/* =====================================================
   TYPES
===================================================== */

type User = {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  accountType?: string;
  jurisdiction?: string;
};

type Coordinates = {
  lat: number;
  lon: number;
  accuracy?: number | null;
  timestamp?: string;
};

type Connection =
  | "ONLINE"
  | "DEGRADED"
  | "OFFLINE";

type WelfareStatus =
  | "NORMAL"
  | "MONITORING"
  | "WELFARE CONCERN";

type ResourceType =
  | "hospital"
  | "fire"
  | "shelter";

type ShelterStatus =
  | "AVAILABLE"
  | "LIMITED"
  | "FULL";

type Resource = {
  id: string;
  name: string;
  type: ResourceType;
  lat: number;
  lon: number;
  distance: number;
  source: "OSM" | "DEMO";
  capacity?: number;
  occupied?: number;
  accessibility?: boolean;
  status?: ShelterStatus;
};

type Shelter = Resource & {
  type: "shelter";
  source: "DEMO";
  capacity: number;
  occupied: number;
  accessibility: boolean;
  status: ShelterStatus;
};

type Household = {
  adults: number;
  children: number;
  elderly: number;
  mobilityNeeds: number;
  emergencyContact?: string;
};

type AIResult = {
  score: number;
  level:
    | "LOW"
    | "MODERATE"
    | "HIGH"
    | "CRITICAL";
  action: string;
  shelterName: string;
  shelterDistance: number;
  availableSpaces: number;
  confidence: number;
  reasons: string[];
  routeAdvice: string;
};

type ActiveWarning = {
  id: string;
  hazardType: string;
  severity: string;
  status: string;
  source?: string;
  sourceStatus?: "OFFICIAL" | "DEMO" | "UNVERIFIED" | string;
  issuedAt?: string;
  expiresAt?: string | null;
  updatedAt?: string;
  instructions?: string[];
  affectedArea?: any;
};

type TimelineItem = {
  id: string;
  time: string;
  title: string;
  detail: string;
  kind: "INFO" | "WARNING" | "ACTION" | "SUCCESS";
};

type TalkTurn = {
  id: string;
  role: "user" | "raksha";
  text: string;
  createdAt: string;
};

type AgentAdvice = {
  advice: string;
  generatedAt: string;
  advisoryOnly: true;
};


type BackendEvent = {
  id: string;
  type: string;
  citizenId?: string | null;
  priority?: string;
  status?: string;
  createdAt: string;
  updatedAt?: string;
  assignedTo?: string | null;
  notes?: AuthorityNote[];
  payload?: any;
};

type AuthorityNote = {
  text: string;
  by?: string;
  byName?: string;
  createdAt: string;
};

type ReportMedia = {
  name: string;
  type: string;
  size: number;
  url: string;
};

type HazardReport = {
  id: string;
  type: string;
  location: Coordinates | null;
  severity?: string;
  createdAt: string;
  media?: ReportMedia[];
  scenarioId?: string;
};

type DemoScenario = {
  id: string;
  areaLabel: string;
  center: Coordinates;
  hazardType: string;
  warning: ActiveWarning;
  resources: Resource[];
  shelters: Shelter[];
  demoHazards: HazardReport[];
  evacuationRoute: Coordinates[];
  generatedAt?: string;
  updatedAt?: string;
};

type ScenarioContext = {
  scenario: DemoScenario;
  viewerLocation: Coordinates;
  locationMode: "LIVE_BROWSER_LOCATION" | "DEMO_FALLBACK" | string;
};

type HumanConcentration = {
  id: string;
  center: {
    lat: number;
    lon: number;
  };
  citizenCount: number;
  severity: "LOW" | "WATCH" | "HIGH" | "CRITICAL";
  latestAt?: string;
};

type ResponsePriorityItem = {
  id: string;
  type: string;
  citizenId?: string | null;
  status: string;
  priority: string;
  responseScore: number;
  responseLevel: "NORMAL" | "WATCH" | "HIGH" | "CRITICAL";
  reasons: string[];
  createdAt: string;
  updatedAt?: string;
  location?: Coordinates | null;
  household?: Household | null;
  incidentId?: string | null;
  reportCount?: number;
  uniqueCitizenCount?: number;
};

type RescueCase = {
  id: string;

  citizen: {
    id: string;
    name: string;
    phone: string;
    email: string;
  };

  eventType: string;
  priority: string;
  status: string;
  createdAt: string;
  sosTime: string;

  sosLocation: {
    latitude: number;
    longitude: number;
    accuracy?: number | null;
    capturedAt?: string;
  } | null;

  household:
    | Household
    | null;

  risk: number | null;
  connectivity: string;
  emergencyState: string;

  nearestHelp: Resource[];

  notes: AuthorityNote[];

  assignedTo:
    | string
    | null;

  resilience?: {
    score: number;
    level: string;
  };
  updatedAt?: string;
};

/* =====================================================
   DEFAULT DATA
===================================================== */

const DEFAULT_HOUSEHOLD: Household = {
  adults: 2,
  children: 1,
  elderly: 1,
  mobilityNeeds: 0,
  emergencyContact: "",
};

const INITIAL_SHELTERS: Shelter[] = [
  {
    id: "fallback-shelter-a",
    name: "Fallback Welfare Centre A",
    type: "shelter",
    lat: 22.9828,
    lon: 78.6642,
    distance: 0,
    source: "DEMO",
    capacity: 500,
    occupied: 170,
    accessibility: true,
    status: "AVAILABLE",
  },
  {
    id: "fallback-shelter-b",
    name: "Fallback Relief Shelter B",
    type: "shelter",
    lat: 22.9659,
    lon: 78.6703,
    distance: 0,
    source: "DEMO",
    capacity: 850,
    occupied: 410,
    accessibility: true,
    status: "AVAILABLE",
  },
  {
    id: "fallback-shelter-c",
    name: "Fallback Emergency Shelter C",
    type: "shelter",
    lat: 22.9775,
    lon: 78.6428,
    distance: 0,
    source: "DEMO",
    capacity: 650,
    occupied: 290,
    accessibility: false,
    status: "AVAILABLE",
  },
];

/* =====================================================
   HELPERS
===================================================== */

function isAuthority(
  user: User
) {
  const account =
    (
      user.accountType ||
      ""
    ).toUpperCase();

  const role =
    (
      user.role ||
      ""
    ).toUpperCase();

  return (
    account === "AUTHORITY" ||
    role.includes("OFFICER") ||
    role.includes("AUTHORITY") ||
    role.includes("ADMIN")
  );
}

function escapeHtml(
  value: string
) {
  return value
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );
}

function formatFreshness(timestamp?: string | null): string {
  if (!timestamp) return "TIME UNKNOWN";
  const time = new Date(timestamp).getTime();
  if (!Number.isFinite(time)) return "TIME UNKNOWN";
  const seconds = Math.max(0, Math.floor((Date.now() - time) / 1000));
  if (seconds < 10) return "LIVE · just now";
  if (seconds < 60) return `UPDATED ${seconds}s AGO`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `UPDATED ${minutes}m AGO`;
  const hours = Math.floor(minutes / 60);
  return `UPDATED ${hours}h AGO`;
}

function freshnessColor(timestamp?: string | null): string {
  if (!timestamp) return "var(--muted)";
  const time = new Date(timestamp).getTime();
  if (!Number.isFinite(time)) return "var(--muted)";
  return (Math.max(0, Date.now() - time) / 60000) <= 5
    ? "var(--success)"
    : "var(--warning)";
}

function normalizeCoordinates(
  value: any
): Coordinates | null {
  if (!value) {
    return null;
  }

  const lat = Number(
    value.lat ??
      value.latitude
  );

  const lon = Number(
    value.lon ??
      value.longitude
  );

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lon)
  ) {
    return null;
  }

  return {
    lat,
    lon,
    accuracy:
      Number.isFinite(
        Number(
          value.accuracy
        )
      )
        ? Number(
            value.accuracy
          )
        : null,
    timestamp:
      value.timestamp ||
      value.capturedAt ||
      undefined,
  };
}

function distanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const earth = 6371;

  const dLat =
    ((lat2 - lat1) *
      Math.PI) /
    180;

  const dLon =
    ((lon2 - lon1) *
      Math.PI) /
    180;

  const a =
    Math.sin(
      dLat / 2
    ) ** 2 +
    Math.cos(
      (lat1 * Math.PI) /
        180
    ) *
      Math.cos(
        (lat2 * Math.PI) /
          180
      ) *
      Math.sin(
        dLon / 2
      ) ** 2;

  return (
    earth *
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(
        1 - a
      )
    )
  );
}

function getShelterStatus(
  capacity: number,
  occupied: number
): ShelterStatus {
  if (
    occupied >=
    capacity
  ) {
    return "FULL";
  }

  const remaining =
    capacity - occupied;

  if (
    remaining <=
    Math.max(
      10,
      Math.round(
        capacity * 0.15
      )
    )
  ) {
    return "LIMITED";
  }

  return "AVAILABLE";
}

function normalizeShelter(
  shelter: Shelter
): Shelter {
  const occupied =
    Math.max(
      0,
      Math.min(
        shelter.capacity,
        shelter.occupied
      )
    );

  return {
    ...shelter,
    occupied,
    status:
      getShelterStatus(
        shelter.capacity,
        occupied
      ),
  };
}

/* =====================================================
   ROUTING
===================================================== */

async function requestRoute(
  start: Coordinates,
  end: Coordinates
): Promise<{
  route: Coordinates[];
  distanceKm: number;
  durationMinutes: number;
}> {
  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${start.lon},${start.lat};${end.lon},${end.lat}` +
    `?overview=full&geometries=geojson`;

  const response =
    await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Routing failed (${response.status})`
    );
  }

  const data: any =
    await response.json();

  const route =
    data?.routes?.[0];

  if (
    !route?.geometry?.coordinates
  ) {
    throw new Error(
      "No route returned."
    );
  }

  return {
    route:
      route.geometry.coordinates.map(
        (pair: number[]) => ({
          lat: pair[1],
          lon: pair[0],
        })
      ),

    distanceKm:
      Number(
        (
          route.distance / 1000
        ).toFixed(1)
      ),

    durationMinutes:
      Math.round(
        route.duration / 60
      ),
  };
}

/* =====================================================
   API
===================================================== */

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  const headers =
    new Headers(
      options.headers
    );

  if (
    !headers.has(
      "Content-Type"
    )
  ) {
    headers.set(
      "Content-Type",
      "application/json"
    );
  }

  if (token) {
    headers.set(
      "Authorization",
      `Bearer ${token}`
    );
  }

  let response: Response;

  try {
    response =
      await fetch(
        `${API}${endpoint}`,
        {
          ...options,
          headers,
        }
      );
  } catch {
    throw new Error(
      "RAKSHA backend is unavailable. Start the server on port 4000."
    );
  }

  let data: any =
    null;

  try {
    data =
      await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(
      data?.message ||
        `Request failed (${response.status})`
    );
  }

  return data as T;
}

const OFFLINE_QUEUE_KEY =
  "raksha_offline_queue_v2";

type OfflineQueuedEvent = {
  id: string;
  endpoint: string;
  payload: unknown;
  queuedAt: string;
};

function readOfflineQueue(): OfflineQueuedEvent[] {
  try {
    const value =
      appStorage.getItem(
        OFFLINE_QUEUE_KEY
      );

    if (!value) {
      return [];
    }

    const parsed =
      JSON.parse(value);

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch {
    return [];
  }
}

function writeOfflineQueue(
  queue: OfflineQueuedEvent[]
) {
  try {
    appStorage.setItem(
      OFFLINE_QUEUE_KEY,
      JSON.stringify(queue)
    );
  } catch {
    // Local queue is best-effort.
  }
}

function enqueueOfflineEvent(
  endpoint: string,
  payload: unknown
) {
  const queue =
    readOfflineQueue();

  queue.push({
    id:
      `${Date.now()}-${Math.random()
        .toString(16)
        .slice(2)}`,
    endpoint,
    payload,
    queuedAt:
      new Date().toISOString(),
  });

  writeOfflineQueue(queue);
}

async function postEvent(
  endpoint: string,
  payload: unknown,
  token: string
) {
  try {
    return await apiRequest(
      endpoint,
      {
        method:
          "POST",
        body:
          JSON.stringify(
            payload
          ),
      },
      token
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "";

    if (
      message.includes(
        "backend is unavailable"
      )
    ) {
      enqueueOfflineEvent(
        endpoint,
        payload
      );

      throw new Error(
        "Saved locally. RAKSHA will automatically sync this when connectivity returns."
      );
    }

    throw error;
  }
}

/* =====================================================
   LOCAL AI
===================================================== */

function calculateRAKSHAAI({
  household,
  location,
  shelters,
  connection,
  dangerZoneActive,
}: {
  household: Household;
  location: Coordinates;
  shelters: Shelter[];
  connection: Connection;
  dangerZoneActive: boolean;
}): AIResult {
  let score = dangerZoneActive ? 60 : 15;

  const reasons: string[] =
    [];

  if (
    dangerZoneActive &&
    household.children >
    0
  ) {
    score += 4;

    reasons.push(
      `${household.children} child${
        household.children >
        1
          ? "ren"
          : ""
      } in household`
    );
  }

  if (
    dangerZoneActive &&
    household.elderly >
    0
  ) {
    score += 5;

    reasons.push(
      `${household.elderly} elderly household member${
        household.elderly >
        1
          ? "s"
          : ""
      }`
    );
  }

  if (
    dangerZoneActive &&
    household.mobilityNeeds >
    0
  ) {
    score += 8;

    reasons.push(
      "Mobility support required"
    );
  }

  if (
    connection ===
    "DEGRADED"
  ) {
    score += 4;

    reasons.push(
      "Connectivity degraded"
    );
  }

  if (
    connection ===
    "OFFLINE"
  ) {
    if (dangerZoneActive) {
      score += 9;
      reasons.push(
        "Connectivity lost inside an active danger zone"
      );
    } else {
      reasons.push(
        "Connectivity lost outside an active danger zone"
      );
    }
  }

  reasons.push(
    dangerZoneActive
      ? "Active disaster warning covers the citizen location"
      : "No active disaster warning covers the citizen location"
  );

  const candidates =
    shelters
      .map(
        (shelter) => ({
          ...shelter,
          distance:
            distanceKm(
              location.lat,
              location.lon,
              shelter.lat,
              shelter.lon
            ),
        })
      )
      .filter(
        (shelter) =>
          shelter.capacity >
          shelter.occupied
      );

  const suitable =
    candidates
      .filter(
        (shelter) =>
          household.mobilityNeeds ===
            0 ||
          shelter.accessibility
      )
      .sort(
        (a, b) =>
          a.distance -
          b.distance
      );

  const selected =
    suitable[0];

  if (!selected) {
    return {
      score: 98,
      level:
        "CRITICAL",
      action:
        "Contact the authority centre before evacuation.",
      shelterName:
        "No suitable shelter",
      shelterDistance:
        0,
      availableSpaces:
        0,
      confidence:
        88,
      reasons,
      routeAdvice:
        "Do not rely on an unavailable shelter. Await authority guidance.",
    };
  }

  const available =
    selected.capacity -
    selected.occupied;

  const people =
    household.adults +
    household.children +
    household.elderly;

  if (
    available <
    people
  ) {
    score += 7;

    reasons.push(
      "Preferred shelter may not have enough space for the complete household"
    );
  } else {
    reasons.push(
      `${available} spaces shown available at preferred shelter`
    );
  }

  if (
    selected.accessibility &&
    household.mobilityNeeds >
      0
  ) {
    reasons.push(
      "Preferred shelter supports accessibility"
    );
  }

  const finalScore =
    Math.min(
      score,
      99
    );

  const level =
    finalScore >= 90
      ? "CRITICAL"
      : finalScore >= 80
      ? "HIGH"
      : finalScore >= 65
      ? "MODERATE"
      : "LOW";

  let action =
    dangerZoneActive
      ? "Monitor the warning and stay prepared to act."
      : "No active disaster warning covers your location. Stay prepared and continue monitoring.";

  if (dangerZoneActive && level === "HIGH") {
    action = "Prepare to evacuate if instructed by the official warning or authority.";
  }

  if (dangerZoneActive && level === "CRITICAL") {
    action = "Seek authority-assisted evacuation and follow official emergency instructions.";
  }

  return {
    score:
      finalScore,
    level,
    action,
    shelterName:
      selected.name,
    shelterDistance:
      selected.distance,
    availableSpaces:
      available,
    confidence:
      Math.min(
        97,
        78 +
          reasons.length *
            2
      ),
    reasons,
    routeAdvice:
      dangerZoneActive
        ? "Follow the marked safer route and avoid reported blocked roads."
        : "No evacuation route is being activated because you are outside an active danger zone.",
  };
}

/* =====================================================
   MAP ICONS
===================================================== */

function createUserIcon() {
  return L.divIcon({
    className:
      "raksha-user-icon",
    html:
      '<div class="map-user-marker"></div>',
    iconSize: [
      30,
      30,
    ],
    iconAnchor: [
      15,
      15,
    ],
  });
}

function createResourceIcon(
  type: ResourceType
) {
  const background =
    type === "hospital"
      ? "#dc2626"
      : type ===
        "fire"
      ? "#ea580c"
      : "#15803d";

  const symbol =
    type === "hospital"
      ? "+"
      : type ===
        "fire"
      ? "F"
      : "⌂";

  return L.divIcon({
    className:
      "raksha-resource-icon",

    html: `
      <div
        class="map-resource-marker"
        style="background:${background}"
      >
        ${symbol}
      </div>
    `,

    iconSize: [
      30,
      30,
    ],

    iconAnchor: [
      15,
      15,
    ],
  });
}

function createHazardIcon() {
  return L.divIcon({
    className:
      "raksha-report-icon",

    html:
      '<div class="map-report-marker">!</div>',

    iconSize: [
      28,
      28,
    ],

    iconAnchor: [
      14,
      14,
    ],
  });
}


function createRescueIcon() {
  return L.divIcon({
    className:
      "raksha-rescue-icon",
    html:
      '<div class="map-rescue-marker">!</div>',
    iconSize: [
      30,
      30,
    ],
    iconAnchor: [
      15,
      15,
    ],
  });
}

/* =====================================================
   SITUATION MAP
===================================================== */

function SituationMap({
  shelters,
  hazards = [],
  evacuationRoute = [],
  dangerGeometry,
  rescueCases = [],
  initialLocation,
  scenarioCenter,
  seedResources = [],
  onRescueClick,
  onLocation,
  onResources,
}: {
  shelters: Shelter[];
  hazards?: HazardReport[];
  evacuationRoute?: Coordinates[];
  dangerGeometry?: any;
  rescueCases?: RescueCase[];
  initialLocation: Coordinates;
  scenarioCenter: Coordinates;
  seedResources?: Resource[];
  onRescueClick?: (
    rescue: RescueCase
  ) => void;
  onLocation: (
    coordinates: Coordinates
  ) => void;
  onResources: (
    resources: Resource[]
  ) => void;
}) {
  const elementRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const mapRef =
    useRef<L.Map | null>(
      null
    );

  const userMarkerRef =
    useRef<L.Marker | null>(
      null
    );

  const shelterLayerRef =
    useRef<L.LayerGroup | null>(
      null
    );

  const resourceLayerRef =
    useRef<L.LayerGroup | null>(
      null
    );

  const hazardLayerRef =
    useRef<L.LayerGroup | null>(
      null
    );

  const rescueLayerRef =
    useRef<L.LayerGroup | null>(
      null
    );

  const dangerLayerRef =
    useRef<L.LayerGroup | null>(
      null
    );

  const routeLayerRef =
    useRef<L.Polyline | null>(
      null
    );

  const initializedRef =
    useRef(false);

  const watchIdRef =
    useRef<number | null>(
      null
    );

  const lastOsmRequestRef =
    useRef(0);

  const osmCacheRef =
    useRef<{
      center: Coordinates | null;
      resources: Resource[];
      updatedAt: number;
    }>({
      center: null,
      resources: [],
      updatedAt: 0,
    });

  const locationRef =
    useRef(onLocation);

  const resourcesRef =
    useRef(onResources);

  const sheltersRef =
    useRef(shelters);

  const seedResourcesRef =
    useRef(seedResources);

  const [status, setStatus] =
    useState(
      "Preparing OpenStreetMap..."
    );

  const [mapReady, setMapReady] = useState(false);
  const [basemapStatus, setBasemapStatus] = useState("Loading street map…");
  const [basemapFailed, setBasemapFailed] = useState(false);
  const retryTilesRef = useRef<() => void>(() => {});
  const locationRequestRef = useRef(0);

  useEffect(() => {
    locationRef.current =
      onLocation;
  }, [onLocation]);

  useEffect(() => {
    resourcesRef.current =
      onResources;
  }, [onResources]);

  useEffect(() => {
    sheltersRef.current =
      shelters;
  }, [shelters]);

  useEffect(() => {
    seedResourcesRef.current = seedResources;
  }, [seedResources]);

  /* ===================================================
     SHELTER MARKERS
  =================================================== */

  useEffect(() => {
    const layer =
      shelterLayerRef.current;

    if (!layer) {
      return;
    }

    layer.clearLayers();

    shelters.forEach(
      (shelter) => {
        const remaining =
          Math.max(
            0,
            shelter.capacity -
              shelter.occupied
          );

        L.marker(
          [
            shelter.lat,
            shelter.lon,
          ],
          {
            icon:
              createResourceIcon(
                "shelter"
              ),
          }
        )
          .bindPopup(
            `
            <strong>${escapeHtml(
              shelter.name
            )}</strong><br/>
            Capacity: ${shelter.capacity}<br/>
            Occupied: ${shelter.occupied}<br/>
            Available: ${remaining}<br/>
            Accessibility: ${
              shelter.accessibility
                ? "SUPPORTED"
                : "STANDARD"
            }<br/>
            Status: ${shelter.status}<br/>
            <small>Operational value · DEMO initial dataset</small>
            `
          )
          .addTo(layer);
      }
    );
  }, [shelters, mapReady]);

  /* ===================================================
     REAL HAZARD MARKERS
  =================================================== */

  useEffect(() => {
    const layer =
      hazardLayerRef.current;

    if (!layer) {
      return;
    }

    layer.clearLayers();

    hazards.forEach(
      (hazard) => {
        const point =
          normalizeCoordinates(
            hazard.location
          );

        if (!point) {
          return;
        }

        L.marker(
          [
            point.lat,
            point.lon,
          ],
          {
            icon:
              createHazardIcon(),
          }
        )
          .bindPopup(
            `
            <strong>REPORT FROM A CITIZEN</strong><br/>
            ${escapeHtml(
              hazard.type
            )}<br/>
            Severity: ${escapeHtml(
              hazard.severity ||
                "NORMAL"
            )}<br/>
            Reported: ${new Date(
              hazard.createdAt
            ).toLocaleString()}
            `
          )
          .addTo(layer);
      }
    );
  }, [hazards, mapReady]);

  /* ===================================================
     RESCUE MARKERS
  =================================================== */

  useEffect(() => {
    const layer =
      rescueLayerRef.current;

    if (!layer) {
      return;
    }

    layer.clearLayers();

    rescueCases
      .filter(
        rescue =>
          rescue.status !==
            "RESOLVED" &&
          rescue.status !==
            "REJECTED"
      )
      .forEach(
        rescue => {
          const point =
            rescue.sosLocation
              ? {
                  lat:
                    rescue.sosLocation
                      .latitude,
                  lon:
                    rescue.sosLocation
                      .longitude,
                }
              : null;

          if (!point) {
            return;
          }

          const marker =
            L.marker(
              [
                point.lat,
                point.lon,
              ],
              {
                icon:
                  createRescueIcon(),
              }
            )
              .bindPopup(
                `<strong>ACTIVE SOS</strong><br/>${escapeHtml(
                  rescue.citizen?.name ||
                    "Citizen"
                )}<br/>Priority: ${escapeHtml(
                  rescue.priority ||
                    "CRITICAL"
                )}<br/>Status: ${escapeHtml(
                  rescue.status ||
                    "NEW"
                )}`
              )
              .addTo(layer);

          if (onRescueClick) {
            marker.on(
              "click",
              () =>
                onRescueClick(
                  rescue
                )
            );
          }
        }
      );
  }, [
    rescueCases,
    onRescueClick,
    mapReady,
  ]);

  /* ===================================================
     ACTIVE DANGER GEOMETRY
  =================================================== */

  useEffect(() => {
    const map =
      mapRef.current;

    const layer =
      dangerLayerRef.current;

    if (!map || !layer) {
      return;
    }

    layer.clearLayers();

    if (dangerGeometry) {
      L.geoJSON(
        dangerGeometry,
        {
          style: {
            color: "#dc2626",
            weight: 2,
            fillColor: "#ef4444",
            fillOpacity: 0.13,
          },
        }
      )
        .bindPopup(
          "<strong>ACTIVE DISASTER WARNING AREA</strong><br/>RAKSHA warning geometry"
        )
        .addTo(layer);
      return;
    }


  }, [
    dangerGeometry,
    mapReady,
  ]);

  /* ===================================================
     ROUTE
  =================================================== */

  useEffect(() => {
    if (
      !mapRef.current
    ) {
      return;
    }

    routeLayerRef.current?.remove();
    routeLayerRef.current =
      null;

    if (
      evacuationRoute.length <
      2
    ) {
      return;
    }

    routeLayerRef.current =
      L.polyline(
        evacuationRoute.map(
          (point) => [
            point.lat,
            point.lon,
          ]
        ),
        {
          color:
            "#16a34a",
          weight:
            7,
        }
      )
        .bindPopup(
          "<strong>CALCULATED SAFER ROUTE</strong><br/>Routing service result"
        )
        .addTo(
          mapRef.current
        );
  }, [
    evacuationRoute,
    mapReady,
  ]);

  /* ===================================================
     OSM RESOURCE LOADER
  =================================================== */

  const loadOSMResources =
    useCallback(
      async (
        lat: number,
        lon: number,
        force = false
      ) => {
        const now =
          Date.now();

        const cacheAge =
          now -
          osmCacheRef.current
            .updatedAt;

        const cacheIsFresh =
          !force &&
          cacheAge <
            OSM_RESOURCE_CACHE_MS &&
          osmCacheRef.current
            .resources
            .length >
            0;

        if (cacheIsFresh) {
          return osmCacheRef.current
            .resources;
        }

        if (
          now -
            lastOsmRequestRef.current <
          OSM_MIN_REQUEST_GAP_MS
        ) {
          return osmCacheRef.current
            .resources;
        }

        lastOsmRequestRef.current =
          now;

        const endpoints = [
          "https://overpass-api.de/api/interpreter",
          "https://overpass.kumi.systems/api/interpreter",
          "https://overpass.private.coffee/api/interpreter",
        ];

        const query = `
          [out:json][timeout:8];
          (
            nwr["amenity"="hospital"](around:5000,${lat},${lon});
            nwr["amenity"="fire_station"](around:5000,${lat},${lon});
          );
          out center tags;
        `;

        for (
          const endpoint of
            endpoints
        ) {
          try {
            const response =
              await fetch(
                `${endpoint}?data=${encodeURIComponent(
                  query
                )}`
              );

            if (
              response.status ===
                429 ||
              response.status ===
                504
            ) {
              continue;
            }

            if (
              !response.ok
            ) {
              continue;
            }

            const data: any =
              await response.json();

            const resources: Resource[] =
              [];

            for (
              const item of
                data.elements ||
                []
            ) {
              if (
                resources.length >=
                20
              ) {
                break;
              }

              const itemLat =
                item.lat ??
                item.center
                  ?.lat;

              const itemLon =
                item.lon ??
                item.center
                  ?.lon;

              const amenity =
                item.tags
                  ?.amenity;

              if (
                !Number.isFinite(
                  Number(
                    itemLat
                  )
                ) ||
                !Number.isFinite(
                  Number(
                    itemLon
                  )
                )
              ) {
                continue;
              }

              if (
                amenity !==
                  "hospital" &&
                amenity !==
                  "fire_station"
              ) {
                continue;
              }

              const type: ResourceType =
                amenity ===
                "hospital"
                  ? "hospital"
                  : "fire";

              resources.push({
                id:
                  `osm-${item.type}-${item.id}`,
                name:
                  item.tags?.name ||
                  (
                    type ===
                    "hospital"
                      ? "Hospital"
                      : "Fire Station"
                  ),
                type,
                lat:
                  Number(
                    itemLat
                  ),
                lon:
                  Number(
                    itemLon
                  ),
                distance:
                  distanceKm(
                    lat,
                    lon,
                    Number(
                      itemLat
                    ),
                    Number(
                      itemLon
                    )
                  ),
                source:
                  "OSM",
              });
            }

            osmCacheRef.current =
              {
                center: {
                  lat,
                  lon,
                },
                resources,
                updatedAt:
                  Date.now(),
              };

            return resources;
          } catch {
            continue;
          }
        }

        return osmCacheRef.current
          .resources;
      },
      []
    );

  /* ===================================================
     HANDLE LOCATION
  =================================================== */

  const handleLocation =
    useCallback(
      async (
        coordinates: Coordinates,
        map: L.Map
      ) => {
        if (mapRef.current !== map) return;
        const request = ++locationRequestRef.current;
        locationRef.current(
          coordinates
        );

        const lat =
          coordinates.lat;

        const lon =
          coordinates.lon;

        const accuracy =
          coordinates.accuracy;

        setStatus(
          accuracy
            ? `CURRENT LOCATION · accuracy ±${Math.round(
                accuracy
              )} m`
            : "CURRENT LOCATION"
        );

        userMarkerRef.current?.remove();

        userMarkerRef.current =
          L.marker(
            [
              lat,
              lon,
            ],
            {
              icon:
                createUserIcon(),
            }
          )
            .bindPopup(
              `
              <strong>YOUR CURRENT LOCATION</strong><br/>
              Latitude: ${lat.toFixed(
                6
              )}<br/>
              Longitude: ${lon.toFixed(
                6
              )}<br/>
              ${
                accuracy
                  ? `Accuracy: ±${Math.round(
                      accuracy
                    )} m`
                  : ""
              }
              `
            )
            .addTo(
              map
            );

        const cachedResources =
          await loadOSMResources(
            lat,
            lon
          );

        if (mapRef.current !== map || request !== locationRequestRef.current) return;

        const localSeedResources = seedResourcesRef.current
          .filter((resource) => resource.type !== "shelter")
          .map((resource) => ({
            ...resource,
            distance: distanceKm(lat, lon, resource.lat, resource.lon),
          }));

        const nearbyShelters =
          sheltersRef.current
            .map(
              (shelter) => ({
                ...shelter,
                distance:
                  distanceKm(
                    lat,
                    lon,
                    shelter.lat,
                    shelter.lon
                  ),
              })
            );

        const resourceMap = new Map<string, Resource>();
        [...localSeedResources, ...cachedResources].forEach((resource) => {
          resourceMap.set(resource.id, resource);
        });
        const nearbyResources = Array.from(resourceMap.values());

        const layer = resourceLayerRef.current;
        if (layer) {
          layer.clearLayers();
          nearbyResources.forEach(resource => {
            L.marker([resource.lat, resource.lon], { icon: createResourceIcon(resource.type) })
              .bindPopup(`<strong>${escapeHtml(resource.name)}</strong><br/>${escapeHtml(resource.source === "DEMO" ? "Demo operating-area resource" : "Live map resource")} · ${resource.distance.toFixed(1)} km away`)
              .addTo(layer);
          });
        }

        resourcesRef.current(
          [
            ...nearbyResources,
            ...nearbyShelters,
          ].sort(
            (a, b) =>
              a.distance -
              b.distance
          )
        );
      },
      [
        loadOSMResources,
      ]
    );

  /* ===================================================
     INITIALIZE MAP
  =================================================== */

  useEffect(() => {
    if (
      !elementRef.current ||
      initializedRef.current
    ) {
      return;
    }

    initializedRef.current =
      true;

    const map =
      L.map(
        elementRef.current,
        {
          zoomControl:
            true,
          preferCanvas:
            true,
        }
      ).setView(
        [scenarioCenter.lat, scenarioCenter.lon],
        13
      );

    mapRef.current =
      map;

    /* =================================================
       BASEMAP
       Stable street basemap for citizen and authority views.
       Direct providers are used without Leaflet subdomain
       interpolation, which avoids the previous .length crash.
    ================================================= */

    const tileSources = [
      { url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png", name: "OpenStreetMap", attribution: "© OpenStreetMap contributors", maxNativeZoom: 19 },
      { url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}", name: "Esri Street Map", attribution: "Tiles © Esri", maxNativeZoom: 19 },
    ];
    let disposed = false;
    let currentTiles: L.TileLayer | null = null;
    let tileTimer: number | undefined;
    let repaintFrame = 0;
    const repaint = () => {
      window.cancelAnimationFrame(repaintFrame);
      repaintFrame = window.requestAnimationFrame(() => {
        if (!disposed) map.invalidateSize({ pan: false });
      });
    };
    const activateTiles = (index: number) => {
      if (disposed) return;
      window.clearTimeout(tileTimer);
      currentTiles?.off();
      currentTiles?.remove();
      const source = tileSources[index];
      setBasemapFailed(false);
      setBasemapStatus(`Loading ${source.name}…`);
      let loaded = false;
      let errors = 0;
      let advanced = false;
      const layer = L.tileLayer(source.url, {
        minZoom: 2, maxZoom: 20, maxNativeZoom: source.maxNativeZoom,
        attribution: source.attribution, updateWhenIdle: true,
        updateWhenZooming: false, keepBuffer: 2,
      });
      currentTiles = layer;
      const fail = () => {
        if (disposed || advanced || currentTiles !== layer) return;
        advanced = true;
        if (index + 1 < tileSources.length) activateTiles(index + 1);
        else {
          setBasemapFailed(true);
          setBasemapStatus("Street map unavailable. Check your connection and retry.");
        }
      };
      layer.on("tileload", () => {
        if (disposed || currentTiles !== layer) return;
        loaded = true;
        errors = 0;
        window.clearTimeout(tileTimer);
        setBasemapFailed(false);
        setBasemapStatus(source.name);
      });
      layer.on("tileerror", () => { if (++errors >= 3) fail(); });
      layer.addTo(map);
      tileTimer = window.setTimeout(() => { if (!loaded) fail(); }, 10000);
      repaint();
    };
    retryTilesRef.current = () => activateTiles(0);
    activateTiles(0);

    shelterLayerRef.current =
      L.layerGroup().addTo(
        map
      );

    resourceLayerRef.current =
      L.layerGroup().addTo(
        map
      );

    hazardLayerRef.current =
      L.layerGroup().addTo(
        map
      );

    rescueLayerRef.current =
      L.layerGroup().addTo(
        map
      );

    dangerLayerRef.current =
      L.layerGroup().addTo(
        map
      );

    // Signal child marker effects only after all Leaflet layers exist.
    setMapReady(true);

    setStatus(
      "Loading your map and checking your location..."
    );

    /* =================================================
       INITIAL VIEWER LOCATION
       Scenario selection happens once at the app/session level.
       The map consumes that stable shared context instead of
       independently generating or watching another demo area.
    ================================================= */

    void handleLocation(initialLocation, map);

    const resizeHandler = repaint;
    window.addEventListener("resize", resizeHandler);
    const onVisible = () => { if (!document.hidden) repaint(); };
    document.addEventListener("visibilitychange", onVisible);
    const resizeObserver = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(repaint) : null;
    if (elementRef.current) resizeObserver?.observe(elementRef.current);
    repaint();

    return () => {
      disposed = true;
      locationRequestRef.current += 1;
      window.clearTimeout(tileTimer);
      window.cancelAnimationFrame(repaintFrame);
      document.removeEventListener("visibilitychange", onVisible);
      retryTilesRef.current = () => {};
      window.removeEventListener(
        "resize",
        resizeHandler
      );

      currentTiles?.off();
      if (
        watchIdRef.current !==
        null
      ) {
        navigator.geolocation?.clearWatch(
          watchIdRef.current
        );

        watchIdRef.current =
          null;
      }

      resizeObserver?.disconnect();

      map.remove();

      mapRef.current =
        null;

      userMarkerRef.current =
        null;

      shelterLayerRef.current =
        null;

      resourceLayerRef.current =
        null;

      hazardLayerRef.current = null;
      rescueLayerRef.current = null;
      dangerLayerRef.current = null;

      routeLayerRef.current =
        null;

      initializedRef.current =
        false;

      setMapReady(false);
    };
  }, [
    handleLocation,
    initialLocation.lat,
    initialLocation.lon,
    scenarioCenter.lat,
    scenarioCenter.lon,
  ]);

  /* ===================================================
     MANUAL LOCATION
  =================================================== */

  function useMyLocation() {
    if (
      !navigator.geolocation
    ) {
      setStatus(
        "Your device location is not available right now."
      );

      return;
    }

    setStatus(
      "Checking your current location..."
    );

    navigator.geolocation.getCurrentPosition(
      async (
        position
      ) => {
        const coordinates: Coordinates =
          {
            lat:
              position
                .coords
                .latitude,

            lon:
              position
                .coords
                .longitude,

            accuracy:
              position
                .coords
                .accuracy,

            timestamp:
              new Date().toISOString(),
          };

        if (
          mapRef.current
        ) {
          mapRef.current.setView(
            [
              coordinates.lat,
              coordinates.lon,
            ],
            16,
            {
              animate:
                true,
            }
          );

          await handleLocation(
            coordinates,
            mapRef.current
          );
        }
      },
      (error) => {
        if (
          error.code ===
          error.PERMISSION_DENIED
        ) {
          setStatus(
            "Location access is turned off. Please allow location access and try again."
          );
        } else if (
          error.code ===
          error.POSITION_UNAVAILABLE
        ) {
          setStatus(
            "We could not find your location. Please try again."
          );
        } else if (
          error.code ===
          error.TIMEOUT
        ) {
          setStatus(
            "Finding your location took too long. Please try again."
          );
        } else {
          setStatus(
            `Location error: ${error.message}`
          );
        }
      },
      {
        enableHighAccuracy:
          true,
        maximumAge:
          0,
        timeout:
          20000,
      }
    );
  }

  return (
    <div className="map-shell">
      <div className="map-topline">
        <div>
          <strong>
            LIVE SITUATION MAP
          </strong>

          <span>
            {status}
          </span>
        </div>

        <div className="map-source">
          <b>
            {basemapStatus}
          </b>

          <span>
            REAL MAP
          </span>
        </div>
      </div>

      {basemapFailed && (
        <div className="map-error" role="status">
          <span>Street tiles could not load. Your resource markers remain available.</span>
          <button type="button" onClick={() => retryTilesRef.current()}>Retry map</button>
        </div>
      )}
      <button
        className="locate-me-button"
        type="button"
        onClick={
          useMyLocation
        }
      >
        ◎ SHOW MY LOCATION
      </button>

      <div
        ref={elementRef}
        className="leaflet-map"
        aria-label="Situation map with shelters, hazards and routes"
      />

      <div className="map-legend">
        <span>
          <i className="l-blue" />
          You
        </span>

        <span>
          <i className="l-green" />
          Shelter
        </span>

        <span>
          <i className="l-red" />
          Disaster zone
        </span>

        <span>
          <i className="l-orange" />
          Hazard
        </span>

        <span>
          <i className="l-route" />
          Safer route
        </span>
      </div>
    </div>
  );
}

/* =====================================================
   LOGIN
===================================================== */

function Login({
  onLogin,
}: {
  onLogin: (
    user: User,
    token: string
  ) => void;
}) {
  const [
    mode,
    setMode,
  ] =
    useState<
      "citizen" | "authority"
    >("citizen");

  const [
    register,
    setRegister,
  ] = useState(false);

  const [
    name,
    setName,
  ] = useState("");

  const [
    phone,
    setPhone,
  ] = useState("");

  const [
    email,
    setEmail,
  ] = useState("");

  const [
    password,
    setPassword,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(false);

  async function submit(
    event: FormEvent
  ) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      if (
        register
      ) {
        await apiRequest(
          "/api/auth/register",
          {
            method:
              "POST",
            body:
              JSON.stringify({
                name,
                phone,
                email,
                password,
              }),
          }
        );

        setRegister(
          false
        );

        setPassword(
          ""
        );

        setError(
          "Account created. Please sign in."
        );

        return;
      }

      const data =
        await apiRequest<{
          success: boolean;
          token: string;
          user: User;
        }>(
          "/api/auth/login",
          {
            method:
              "POST",
            body:
              JSON.stringify({
                email,
                password,
              }),
          }
        );

      onLogin(
        data.user,
        data.token
      );
    } catch (
      errorObject
    ) {
      setError(
        errorObject instanceof
          Error
          ? errorObject.message
          : "Unable to connect to backend."
      );
    } finally {
      setLoading(
        false
      );
    }
  }

  return (
    <div className="login-page">
      <div className="login-shell">
        <aside className="login-visual">
          <div className="login-visual-brand">
            <img className="raksha-full-logo" src="/raksha-logo.svg" alt="RAKSHA — R: Risk, A: Awareness, K: Knowledge, S: Safety, H: Humanitarian, A: Action" />
          </div>

          <div className="login-visual-copy">
            <span className="login-eyebrow">DISASTER RESILIENCE PLATFORM</span>
            <h1>Safer communities.<br /><em>Stronger together.</em></h1>
            <p>
              Real-time coordination, nearby help, citizen ground truth and response operations in one resilient platform.
            </p>

            <div className="login-capability-grid">
              <div>
                <span className="capability-icon"><AppIcon name="pin" /></span>
                <strong>Prepare</strong>
                <small>Local hazards, shelters and location-aware context.</small>
              </div>
              <div>
                <span className="capability-icon"><AppIcon name="shield" /></span>
                <strong>Respond</strong>
                <small>Human-controlled guidance, SOS and coordinated operations.</small>
              </div>
              <div>
                <span className="capability-icon"><AppIcon name="message" /></span>
                <strong>Recover</strong>
                <small>Community updates and response status stay connected.</small>
              </div>
            </div>
          </div>

          <div className="login-visual-status">
            <span className="live-dot" />
            Prepared today · resilient tomorrow
          </div>
        </aside>

        <section className="login-card">
          <div className="login-topbar">
            <div className="login-form-brand">
              <RakshaMark />
              <div>
                <strong>RAKSHA</strong>
                <span className="brand-expansion">R — Risk · A — Awareness · K — Knowledge · S — Safety · H — Humanitarian · A — Action</span>
              </div>
            </div>
            <ThemeToggle compact />
          </div>

          <div className="login-form-copy">
            <span className="login-label">SECURE ACCESS</span>
            <h2>{register ? "Create your citizen account" : "Welcome back"}</h2>
            <p>
              {register
                ? "Create a profile for safety updates, reporting and emergency support."
                : "Sign in to your citizen safety portal or authority response workspace."}
            </p>
          </div>

          <div className="login-switch" role="tablist" aria-label="Choose portal">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "citizen"}
              className={mode === "citizen" ? "active" : ""}
              onClick={() => {
                setMode("citizen");
                setRegister(false);
                setError("");
              }}
            >
              <AppIcon name="user" size={17} />
              Citizen
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "authority"}
              className={mode === "authority" ? "active" : ""}
              onClick={() => {
                setMode("authority");
                setRegister(false);
                setError("");
              }}
            >
              <AppIcon name="shield" size={17} />
              Authority / Response Team
            </button>
          </div>

          <form onSubmit={submit}>
            {register && (
              <label>
                FULL NAME
                <span className="field-shell">
                  <AppIcon name="user" size={18} />
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                    autoComplete="name"
                    placeholder="Your name"
                  />
                </span>
              </label>
            )}

            {register && (
              <label>
                MOBILE NUMBER
                <span className="field-shell">
                  <AppIcon name="phone" size={18} />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="10-digit mobile number"
                    autoComplete="tel"
                  />
                </span>
              </label>
            )}

            <label>
              EMAIL
              <span className="field-shell">
                <AppIcon name="mail" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  autoComplete="email"
                  placeholder="name@example.com"
                />
              </span>
            </label>

            <label>
              PASSWORD
              <span className="field-shell">
                <AppIcon name="lock" size={18} />
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  autoComplete={register ? "new-password" : "current-password"}
                  placeholder="Enter your password"
                />
              </span>
            </label>

            {error && <div className="login-error">{error}</div>}

            <button className="login-submit" type="submit" disabled={loading}>
              <span>{loading ? "CONNECTING..." : register ? "CREATE ACCOUNT" : "SIGN IN"}</span>
              {!loading && <AppIcon name="chevron" size={18} />}
            </button>
          </form>

          {mode === "citizen" && (
            <button
              type="button"
              className="register-link"
              onClick={() => setRegister((current) => !current)}
            >
              {register ? "Already registered? Sign in" : "Create citizen account"}
            </button>
          )}

          {mode === "authority" && (
            <div className="demo-login">
              <span className="demo-login-icon"><AppIcon name="shield" /></span>
              <div>
                <strong>DEMO RESPONSE TEAM</strong>
                <span>authority@raksha.demo</span>
                <span>Raksha@123</span>
              </div>
            </div>
          )}

          <div className="login-security-note">
            <AppIcon name="shield" size={15} />
            Human-controlled prototype · Advisory AI only
          </div>
        </section>
      </div>
    </div>
  );
}

/* =====================================================
   HOUSEHOLD PROFILE
===================================================== */

function HouseholdProfile({
  household,
  setHousehold,
}: {
  household: Household;
  setHousehold: Dispatch<
    SetStateAction<Household>
  >;
}) {
  const total =
    household.adults +
    household.children +
    household.elderly;

  function change(
    field: keyof Household,
    delta: number
  ) {
    if (
      field ===
      "emergencyContact"
    ) {
      return;
    }

    setHousehold(
      (current) => ({
        ...current,
        [field]: Math.max(
          0,
          Number(
            current[field] || 0
          ) + delta
        ),
      })
    );
  }

  return (
    <section className="card household-card">
      <div className="card-label">
        CITIZEN PROFILE
      </div>

      <div className="card-title-row">
        <div>
          <h2>
            Household
          </h2>

          <p>
            Stored and used for evacuation decision support.
          </p>
        </div>

        <div className="people-total">
          <strong>
            {total}
          </strong>

          <span>
            PEOPLE
          </span>
        </div>
      </div>

      <div className="people-grid">
        {(
          [
            [
              "Adults",
              "adults",
            ],
            [
              "Children",
              "children",
            ],
            [
              "Elderly",
              "elderly",
            ],
            [
              "Mobility needs",
              "mobilityNeeds",
            ],
          ] as [
            string,
            keyof Household
          ][]
        ).map(
          ([
            label,
            field,
          ]) => (
            <div
              className="counter"
              key={
                field
              }
            >
              <span>
                {
                  label
                }
              </span>

              <strong>
                {
                  household[
                    field
                  ] as number
                }
              </strong>

              <div>
                <button
                  type="button"
                  onClick={() =>
                    change(
                      field,
                      -1
                    )
                  }
                >
                  −
                </button>

                <button
                  type="button"
                  onClick={() =>
                    change(
                      field,
                      1
                    )
                  }
                >
                  +
                </button>
              </div>
            </div>
          )
        )}
      </div>

      <div className="emergency-contact-box">
        <div className="emergency-contact-head">
          <div>
            <strong>Emergency contact</strong>
            <p>Who should RAKSHA notify if you send an SOS?</p>
          </div>
          <span className={household.emergencyContact?.trim() ? "contact-status ready" : "contact-status"}>
            {household.emergencyContact?.trim() ? "Ready ✓" : "Not set"}
          </span>
        </div>
        <label className="emergency-contact-label" htmlFor="raksha-emergency-contact">
          Family / emergency phone number
        </label>
        <input
          id="raksha-emergency-contact"
          className="emergency-contact-input"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="e.g. +91 98765 43210"
          value={household.emergencyContact || ""}
          onChange={(event) =>
            setHousehold((current) => ({
              ...current,
              emergencyContact: event.target.value,
            }))
          }
        />
        <small className="emergency-contact-help">
          Saved automatically. This number is used for the family emergency message after SOS.
        </small>
      </div>

      <div className="profile-summary">
        {household.children >
          0 && (
          <span>
            👶{" "}
            {
              household.children
            }{" "}
            children
          </span>
        )}

        {household.elderly >
          0 && (
          <span>
            👴{" "}
            {
              household.elderly
            }{" "}
            elderly
          </span>
        )}

        {household.mobilityNeeds >
          0 && (
          <span>
            ♿{" "}
            {
              household.mobilityNeeds
            }{" "}
            mobility needs
          </span>
        )}
      </div>
    </section>
  );
}

/* =====================================================
   AI ENGINE
===================================================== */

function AIEnginePanel({
  result,
  token,
  household,
  location,
  connection,
  scenarioId,
}: {
  result: AIResult;
  token: string;
  household: Household;
  location: Coordinates;
  connection: Connection;
  scenarioId: string;
}) {
  const [
    saved,
    setSaved,
  ] = useState(false);

  async function saveAssessment() {
    try {
      await postEvent(
        "/api/events/ai-assessment",
        {
          score:
            result.score,
          level:
            result.level,
          action:
            result.action,
          shelter: {
            name:
              result.shelterName,
            distance:
              result.shelterDistance,
            available:
              result.availableSpaces,
          },
          confidence:
            result.confidence,
          reasons:
            result.reasons,
          routeAdvice:
            result.routeAdvice,
          household,
          location,
          connectivity:
            connection,
          scenarioId,
        },
        token
      );

      setSaved(
        true
      );

      window.setTimeout(
        () =>
          setSaved(
            false
          ),
        2000
      );
    } catch (
      error
    ) {
      console.error(
        "AI assessment save failed:",
        error
      );
    }
  }

  return (
    <section
      className={`ai-card ai-${result.level.toLowerCase()}`}
    >
      <div className="ai-header">
        <div className="ai-brand">
          <div className="ai-orb">
            AI
          </div>

          <div>
            <span>
              SAFETY GUIDANCE FROM RAKSHA
            </span>

            <h2>
              Simple guidance based on your situation
            </h2>
          </div>
        </div>

        <div className="ai-live">
          AVAILABLE WITHOUT AI
        </div>
      </div>

      <div className="ai-score-row">
        <div>
          <span>
            YOUR SAFETY LEVEL
          </span>

          <strong>
            {
              result.score
            }
            <small>
              /100
            </small>
          </strong>
        </div>

        <div className="ai-level">
          <span>
            STATUS
          </span>

          <b>
            {
              result.level
            }
          </b>
        </div>
      </div>

      <div className="ai-meter">
        <i
          style={{
            width: `${result.score}%`,
          }}
        />
      </div>

      <div className="ai-action">
        <span>
          WHAT TO DO NEXT
        </span>

        <strong>
          {
            result.action
          }
        </strong>
      </div>

      <div className="ai-destination">
        <div className="ai-destination-icon">
          <AppIcon name="shelter" size={18} />
        </div>

        <div>
          <span>
            NEAREST SUITABLE HELP
          </span>

          <strong>
            {
              result.shelterName
            }
          </strong>

          <small>
            {result.shelterDistance.toFixed(
              1
            )}{" "}
            km ·{" "}
            {
              result.availableSpaces
            }{" "}
            places available
          </small>
        </div>
      </div>

      <div className="ai-grid">
        <div>
          <span>
            MATCH CONFIDENCE
          </span>

          <strong>
            {
              result.confidence
            }
            %
          </strong>
        </div>

        <div>
          <span>
            ROUTE
          </span>

          <strong>
            SAFER ROUTE
          </strong>
        </div>
      </div>

      <details className="ai-explanation">
        <summary>Why is this recommended?</summary>
      <div className="ai-reasons">
        <span>
          WHY THIS IS RECOMMENDED
        </span>

        {result.reasons.map(
          (
            reason,
            index
          ) => (
            <div
              key={`${reason}-${index}`}
            >
              <i>
                ✓
              </i>

              <span>
                {
                  reason
                }
              </span>
            </div>
          )
        )}
      </div>

      <div className="ai-route-advice">
        <strong>
          HOW TO GET TO SAFETY
        </strong>

        <span>
          {
            result.routeAdvice
          }
        </span>
      </div>

      </details>

      <button
        type="button"
        className="ai-save-button"
        onClick={
          saveAssessment
        }
      >
        {saved
          ? "✓ SAVED TO BACKEND"
          : "SAVE AI STATUS"}
      </button>

      <div className="ai-disclaimer">
        Simple guidance based on your situation only. Follow official emergency
        instructions and authority guidance.
      </div>
    </section>
  );
}

/* =====================================================
   RESOURCE PANEL
===================================================== */

function ResourcePanel({
  resources,
}: {
  resources: Resource[];
}) {
  const groups = [
    {
      type:
        "hospital" as const,
      title:
        "HOSPITALS",
      icon:
        <AppIcon name="hospital" size={15} />,
      tone:
        "red",
    },
    {
      type:
        "fire" as const,
      title:
        "FIRE STATIONS",
      icon:
        <AppIcon name="fire" size={15} />,
      tone:
        "orange",
    },
    {
      type:
        "shelter" as const,
      title:
        "SHELTERS",
      icon:
        <AppIcon name="shelter" size={15} />,
      tone:
        "green",
    },
  ];

  return (
    <section className="card resources">
      <div className="section-head">
        <div>
          <span>
            HELP NEAR YOU
          </span>

          <h2>
            Help near you
          </h2>
        </div>

        <small>
          OSM locations + shelter operations
        </small>
      </div>

      <div className="resource-columns">
        {groups.map(
          (group) => {
            const items =
              resources
                .filter(
                  (item) =>
                    item.type ===
                    group.type
                )
                .slice(
                  0,
                  3
                );

            return (
              <div
                className="resource-column"
                key={
                  group.type
                }
              >
                <div className="resource-title">
                  <span>
                    <i
                      className={`resource-small ${group.tone}`}
                    >
                      {
                        group.icon
                      }
                    </i>

                    {
                      group.title
                    }
                  </span>

                  <small>
                    {
                      items.length
                    }
                  </small>
                </div>

                {items.length ===
                0 ? (
                  <div className="resource-none">
                    No nearby help is available on the map right now.
                  </div>
                ) : (
                  items.map(
                    (
                      item
                    ) => {
                      const available =
                        item.capacity !==
                          undefined &&
                        item.occupied !==
                          undefined
                          ? item.capacity -
                            item.occupied
                          : null;

                      return (
                        <div
                          className="resource-row"
                          key={
                            item.id
                          }
                        >
                          <div
                            className={`resource-box ${group.tone}`}
                          >
                            {
                              group.icon
                            }
                          </div>

                          <div>
                            <strong>
                              {
                                item.name
                              }
                            </strong>

                            <span>
                              {item.distance.toFixed(
                                1
                              )}{" "}
                              km
                            </span>

                            {available !==
                              null && (
                              <small
                                className={
                                  available <=
                                  0
                                    ? "danger"
                                    : available <
                                      (item.capacity ||
                                        1) *
                                        0.15
                                    ? "warning"
                                    : "success"
                                }
                              >
                                {
                                  available
                                }{" "}
                                available
                              </small>
                            )}
                          </div>

                          <em>
                            {
                              item.source
                            }
                          </em>
                        </div>
                      );
                    }
                  )
                )}
              </div>
            );
          }
        )}
      </div>
    </section>
  );
}

/* =====================================================
   CITIZEN DASHBOARD
===================================================== */

function CitizenDashboard({
  user,
  token,
  logout,
  shelters,
  scenarioContext,
  onRefreshScenario,
}: {
  user: User;
  token: string;
  logout: () => void;
  shelters: Shelter[];
  scenarioContext: ScenarioContext;
  onRefreshScenario: () => Promise<void>;
}) {
  const [
    household,
    setHousehold,
  ] =
    useState<Household>(
      DEFAULT_HOUSEHOLD
    );

  const [
    location,
    setLocation,
  ] =
    useState<Coordinates>(
      scenarioContext.viewerLocation
    );

  const [
    resources,
    setResources,
  ] =
    useState<Resource[]>(
      scenarioContext.scenario.resources
    );

  const [
    connection,
    setConnection,
  ] =
    useState<Connection>(
      "ONLINE"
    );

  const [
    welfare,
    setWelfare,
  ] =
    useState<WelfareStatus>(
      "NORMAL"
    );

  const [
    modal,
    setModal,
  ] =
    useState<
      "none" |
      "sos" |
      "report"
    >("none");

  const [
    reportType,
    setReportType,
  ] =
    useState(
      "Blocked road / bridge"
    );

  const [
    reportLanguage,
    setReportLanguage,
  ] = useState<string>(
    defaultSpeechLanguage()
  );

  const [
    voiceReportText,
    setVoiceReportText,
  ] = useState("");

  const [
    listeningForReport,
    setListeningForReport,
  ] = useState(false);

  const [
    voiceReportError,
    setVoiceReportError,
  ] = useState("");

  const reportRecognitionRef =
    useRef<any>(null);

  const [reportMedia, setReportMedia] = useState<File[]>([]);
  const reportPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const reportVideoInputRef = useRef<HTMLInputElement | null>(null);

  const [
    sending,
    setSending,
  ] =
    useState(false);

  const [
    message,
    setMessage,
  ] =
    useState("");

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => {
      setMessage("");
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [message]);

  const [
    familyEmergencyMessage,
    setFamilyEmergencyMessage,
  ] = useState("");

  const [
    safeMessage,
    setSafeMessage,
  ] =
    useState("");

  const [
    safeSending,
    setSafeSending,
  ] =
    useState(false);

  const [
    communityIncidents,
    setCommunityIncidents,
  ] =
    useState<any[]>(
      []
    );

  const [
    latestResponseEvent,
    setLatestResponseEvent,
  ] =
    useState<BackendEvent | null>(
      null
    );

  const [
    pendingSyncCount,
    setPendingSyncCount,
  ] =
    useState(() => {
      try {
        const stored =
          appStorage.getItem(
            "raksha_offline_queue_v2"
          );
        return stored
          ? JSON.parse(stored).length
          : 0;
      } catch {
        return 0;
      }
    });


  const [
    activeWarning,
    setActiveWarning,
  ] = useState<ActiveWarning | null>(null);

  const [
    dangerZoneActive,
    setDangerZoneActive,
  ] = useState(false);

  const [
    safetyResponseStartedAt,
    setSafetyResponseStartedAt,
  ] = useState<number | null>(null);

  const [
    safetyCheckInAt,
    setSafetyCheckInAt,
  ] = useState<number | null>(null);

  const [
    noResponseAlerted,
    setNoResponseAlerted,
  ] = useState(false);

  const [
    safetyResponseNow,
    setSafetyResponseNow,
  ] = useState(Date.now());

  const [
    highContrast,
    setHighContrast,
  ] = useState(() =>
    appStorage.getItem(
      "raksha_high_contrast"
    ) === "true"
  );

  const [
    language,
    setLanguage,
  ] = useState<"EN" | "HI">(() =>
    appStorage.getItem(
      "raksha_language"
    ) === "HI"
      ? "HI"
      : "EN"
  );

  const [
    agentAdvice,
    setAgentAdvice,
  ] = useState<AgentAdvice | null>(null);

  const [
    agentLoading,
    setAgentLoading,
  ] = useState(false);

  const [
    lowBandwidthMode,
    setLowBandwidthMode,
  ] = useState(() =>
    appStorage.getItem(
      "raksha_low_bandwidth"
    ) === "true"
  );

  const [
    talkOpen,
    setTalkOpen,
  ] = useState(false);

  const [
    talkMessage,
    setTalkMessage,
  ] = useState("");

  const [
    talkReply,
    setTalkReply,
  ] = useState("");

  const [
    listeningForTalk,
    setListeningForTalk,
  ] = useState(false);

  const talkRecognitionRef =
    useRef<any>(null);

  const [
    talkHistory,
    setTalkHistory,
  ] = useState<TalkTurn[]>(() => {
    try {
      const saved = appStorage.getItem("raksha_talk_history_v2");
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed.slice(-20) : [];
    } catch {
      return [];
    }
  });

  const [
    talkLoading,
    setTalkLoading,
  ] = useState(false);

  const talkScrollRef =
    useRef<HTMLDivElement | null>(null);

  const [
    timeline,
    setTimeline,
  ] = useState<TimelineItem[]>([]);

  const lastLocationSentRef =
    useRef(0);

  useEffect(() => {
    try {
      appStorage.setItem(
        "raksha_talk_history_v2",
        JSON.stringify(talkHistory.slice(-20))
      );
    } catch {
      // Conversation history is best-effort.
    }
  }, [talkHistory]);

  useEffect(() => {
    const element = talkScrollRef.current;
    if (!element) return;
    const frame = window.requestAnimationFrame(() => {
      element.scrollTop = element.scrollHeight;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [talkHistory, talkLoading, talkReply, talkOpen]);

  /* ===================================================
     ACCESSIBILITY
  =================================================== */

  useEffect(() => {
    appStorage.setItem(
      "raksha_high_contrast",
      String(highContrast)
    );
  }, [highContrast]);

  useEffect(() => {
    appStorage.setItem(
      "raksha_language",
      language
    );
  }, [language]);

  useEffect(() => {
    appStorage.setItem(
      "raksha_low_bandwidth",
      String(lowBandwidthMode)
    );
  }, [lowBandwidthMode]);

  useEffect(() => {
    const syncNetwork = () => {
      if (!navigator.onLine) {
        setLowBandwidthMode(true);
      }
    };

    syncNetwork();
    window.addEventListener(
      "offline",
      syncNetwork
    );

    return () =>
      window.removeEventListener(
        "offline",
        syncNetwork
      );
  }, []);

  const addTimeline = useCallback(
    (
      title: string,
      detail: string,
      kind: TimelineItem["kind"] = "INFO"
    ) => {
      setTimeline((current) => [
        {
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          time: new Date().toISOString(),
          title,
          detail,
          kind,
        },
        ...current,
      ].slice(0, 10));
    },
    []
  );

  const [speaking, setSpeaking] = useState(false);
  const speechRef = useRef<ReturnType<typeof createManualSpeech> | null>(null);

  function stopAudio() { speechRef.current?.stop(); }

  function readAloud(text: string) {
    stopTalkVoice();
    stopVoiceReport();
    speechRef.current ??= createManualSpeech(setSpeaking);
    speechRef.current.play(text, language);
  }

  useEffect(() => () => {
    speechRef.current?.dispose();
    talkRecognitionRef.current?.abort?.();
    reportRecognitionRef.current?.abort?.();
  }, []);

  useEffect(() => {
    if (!talkOpen) { stopTalkVoice(); stopAudio(); }
  }, [talkOpen]);

  useEffect(() => {
    if (modal !== "report") stopVoiceReport();
  }, [modal]);

  function speakCurrentQuestion() {
    const text = talkMessage.trim();
    if (text) readAloud(text);
  }

  function startTalkVoice() {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setTalkReply(
        "Voice input is not supported by this browser. You can type your question instead."
      );
      return;
    }

    stopAudio();
    stopTalkVoice();
    stopVoiceReport();

    const recognition = new SpeechRecognition();
    recognition.lang =
      language === "HI"
        ? "hi-IN"
        : defaultSpeechLanguage();
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () =>
      setListeningForTalk(true);

    recognition.onresult = (event: any) => {
      if (talkRecognitionRef.current !== recognition) return;
      let text = "";
      for (
        let index = event.resultIndex;
        index < event.results.length;
        index += 1
      ) {
        text +=
          event.results[index][0]?.transcript ||
          "";
      }
      setTalkMessage(text.trim());
    };

    recognition.onerror = (event: any) => {
      if (event?.error !== "aborted") {
        setTalkReply(
          "Voice input could not be captured. Please try again or type your question."
        );
      }
      setListeningForTalk(false);
    };

    recognition.onend = () =>
      setListeningForTalk(false);

    talkRecognitionRef.current = recognition;
    try { recognition.start(); }
    catch { stopTalkVoice(); setTalkReply("Microphone could not start. Please try again or type your question."); }
  }

  function stopTalkVoice() {
    talkRecognitionRef.current?.stop?.();
    talkRecognitionRef.current = null;
    setListeningForTalk(false);
  }

  function accessibilityText() {
    const warningText = activeWarning
      ? `${activeWarning.hazardType} warning. Severity ${activeWarning.severity}. ${activeWarning.instructions?.join(" ") || "Follow official safety instructions."}`
      : "There is currently no active disaster warning covering your location.";

    return `${warningText} Current RAKSHA risk is ${aiResult.level}. ${aiResult.action}. Recommended shelter: ${aiResult.shelterName}.`;
  }

  /* ===================================================
     LOAD HOUSEHOLD
  =================================================== */

  const scenario = scenarioContext.scenario;
  const scenarioId = scenario.id;
  const locationIsFallback = scenarioContext.locationMode !== "LIVE_BROWSER_LOCATION";

  useEffect(() => {
    setLocation(scenarioContext.viewerLocation);
    setResources(scenario.resources);
  }, [scenario.id, scenarioContext.viewerLocation.lat, scenarioContext.viewerLocation.lon]);

  useEffect(() => {
    async function loadHousehold() {
      try {
        const data =
          await apiRequest<{
            success: boolean;
            household:
              | Household
              | null;
          }>(
            "/api/household",
            {},
            token
          );

        if (
          data.household
        ) {
          setHousehold({
            adults:
              Number(
                data.household
                  .adults
              ) || 0,
            children:
              Number(
                data.household
                  .children
              ) || 0,
            elderly:
              Number(
                data.household
                  .elderly
              ) || 0,
            mobilityNeeds:
              Number(
                data.household
                  .mobilityNeeds
              ) || 0,
            emergencyContact:
              data.household
                .emergencyContact ||
              "",
          });
        }
      } catch (
        error
      ) {
        console.error(
          "Household load failed:",
          error
        );
      }
    }

    void loadHousehold();
  }, [token]);

  /* ===================================================
     SAVE HOUSEHOLD
  =================================================== */

  useEffect(() => {
    const timer =
      window.setTimeout(
        () => {
          void postEvent(
            "/api/household",
            household,
            token
          ).catch(
            (error) =>
              console.error(
                "Household save failed:",
                error
              )
          );
        },
        600
      );

    return () =>
      window.clearTimeout(
        timer
      );
  }, [
    household,
    token,
  ]);

  /* ===================================================
     LOAD COMMUNITY INCIDENTS
  =================================================== */

  const loadCommunityIncidents =
    useCallback(
      async () => {
        try {
          const data =
            await apiRequest<{
              success: boolean;
              incidents: any[];
            }>(
              `/api/citizen/community-incidents?scenarioId=${encodeURIComponent(scenarioId)}`,
              {},
              token
            );

          setCommunityIncidents(
            data.incidents
          );
        } catch {
          /*
           * Community incidents are supplementary.
           * Do not break the citizen dashboard.
           */
        }
      },
      [token, scenarioId]
    );

  useEffect(() => {
    const loadLatestResponse =
      async () => {
        try {
          const data =
            await apiRequest<{
              success: boolean;
              events: BackendEvent[];
            }>(
              `/api/citizen/events?scenarioId=${encodeURIComponent(scenarioId)}`,
              {},
              token
            );

          const responseEvents =
            data.events
              .filter(
                event =>
                  event.type === "SOS" ||
                  event.type === "WELFARE" ||
                  event.type === "HAZARD_REPORT"
              )
              .sort(
                (a, b) =>
                  new Date(
                    b.updatedAt ||
                      b.createdAt
                  ).getTime() -
                  new Date(
                    a.updatedAt ||
                      a.createdAt
                  ).getTime()
              );

          setLatestResponseEvent(
            responseEvents[0] ||
              null
          );
        } catch {
          // Citizen response status is supplementary.
        }
      };

    void loadLatestResponse();

    const timer =
      window.setInterval(
        () => {
          void loadLatestResponse();
        },
        5000
      );

    return () =>
      window.clearInterval(
        timer
      );
  }, [token, scenarioId]);

  const flushOfflineQueue =
    useCallback(
      async () => {
        if (!token) {
          return;
        }

        const queue =
          readOfflineQueue();

        if (!queue.length) {
          setPendingSyncCount(0);
          return;
        }

        const remaining: OfflineQueuedEvent[] =
          [];

        for (
          const item of queue
        ) {
          try {
            await apiRequest(
              item.endpoint,
              {
                method:
                  "POST",
                body:
                  JSON.stringify(
                    item.payload
                  ),
              },
              token
            );
          } catch {
            remaining.push(
              item
            );
          }
        }

        writeOfflineQueue(
          remaining
        );
        setPendingSyncCount(
          remaining.length
        );
      },
      [token]
    );

  useEffect(() => {
    void flushOfflineQueue();

    const timer =
      window.setInterval(
        () => {
          void flushOfflineQueue();
        },
        5000
      );

    const onOnline = () => {
      void flushOfflineQueue();
      void loadCommunityIncidents();
    };

    window.addEventListener(
      "online",
      onOnline
    );

    return () => {
      window.clearInterval(
        timer
      );
      window.removeEventListener(
        "online",
        onOnline
      );
    };
  }, [
    flushOfflineQueue,
    loadCommunityIncidents,
  ]);

  useEffect(() => {
    setPendingSyncCount(
      readOfflineQueue().length
    );
  }, [message]);

  /* ===================================================
     DYNAMIC WARNING / DANGER AREA STATUS SYNC
  =================================================== */

  const syncActiveWarning =
    useCallback(
      async (coordinates: Coordinates) => {
        try {
          const warning = scenario.warning || null;
          setActiveWarning(warning);

          const check = await apiRequest<{
            success: boolean;
            insideDangerZone: boolean;
            warning?: ActiveWarning;
          }>(
            `/api/demo/scenario/${encodeURIComponent(scenarioId)}/check?lat=${encodeURIComponent(
              coordinates.lat
            )}&lon=${encodeURIComponent(coordinates.lon)}`,
            {},
            token
          );

          const insideDangerZone = Boolean(check.insideDangerZone);
          setDangerZoneActive(insideDangerZone);

          if (insideDangerZone) {
            setSafetyResponseStartedAt((previous) => previous || Date.now());
          } else {
            setSafetyResponseStartedAt(null);
            setSafetyCheckInAt(null);
            setNoResponseAlerted(false);
          }
        } catch (error) {
          console.error("Warning sync failed:", error);
          setActiveWarning(scenario.warning || null);
          setDangerZoneActive(false);
        }
      },
      [scenario.warning, scenarioId, token]
    );

  useEffect(() => {
    void syncActiveWarning(location);

    const timer = window.setInterval(() => {
      void syncActiveWarning(location);
    }, 15000);

    return () =>
      window.clearInterval(timer);
  }, [
    location,
    syncActiveWarning,
  ]);

  useEffect(() => {
    if (!activeWarning) return;

    addTimeline(
      "Warning monitored",
      `${activeWarning.hazardType} · ${activeWarning.severity} · ${dangerZoneActive ? "You are inside the affected area." : "You are outside the affected area."}`,
      dangerZoneActive ? "WARNING" : "INFO"
    );
  }, [
    activeWarning?.id,
    activeWarning?.severity,
    activeWarning?.hazardType,
    dangerZoneActive,
    addTimeline,
  ]);

  /* ===================================================
     NO-RESPONSE SAFETY MONITOR
  =================================================== */

  useEffect(() => {
    if (!dangerZoneActive || !activeWarning) {
      return;
    }

    const timer =
      window.setInterval(() => {
        setSafetyResponseNow(Date.now());
      }, 1000);

    return () =>
      window.clearInterval(timer);
  }, [
    activeWarning,
    dangerZoneActive,
  ]);

  useEffect(() => {
    if (
      !dangerZoneActive ||
      !activeWarning ||
      !safetyResponseStartedAt ||
      safetyCheckInAt ||
      noResponseAlerted ||
      connection === "OFFLINE"
    ) {
      return;
    }

    const elapsed =
      safetyResponseNow -
      safetyResponseStartedAt;

    if (elapsed < SAFETY_RESPONSE_WINDOW_MS) {
      return;
    }

    setNoResponseAlerted(true);
    addTimeline(
      "Safety check-in not received",
      "RAKSHA created a welfare review because you remained inside an active danger zone after the response window.",
      "WARNING"
    );

    void postEvent(
      "/api/events/welfare",
      {
        connection,
        location,
        household,
        lastActiveAt: new Date().toISOString(),
        scenarioId,
        noResponseReview: true,
        reason:
          "No safety check-in received during the active danger-zone response window.",
      },
      token
    ).catch((error) => {
      console.error(
        "No-response welfare review failed:",
        error
      );
      setNoResponseAlerted(false);
    });
  }, [
    activeWarning,
    connection,
    dangerZoneActive,
    household,
    location,
    noResponseAlerted,
    safetyCheckInAt,
    safetyResponseNow,
    safetyResponseStartedAt,
    token,
  ]);

  /* ===================================================
     REAL LOCATION PERSISTENCE
  =================================================== */

  const persistLocation =
    useCallback(
      async (
        coordinates: Coordinates
      ) => {
        const now =
          Date.now();

        if (
          now -
            lastLocationSentRef.current <
          15000
        ) {
          return;
        }

        lastLocationSentRef.current =
          now;

        try {
          await apiRequest(
            "/api/citizen/location",
            {
              method:
                "POST",
              body:
                JSON.stringify({
                  location:
                    coordinates,
                  connectivity:
                    connection,
                  scenarioId,
                }),
            },
            token
          );
        } catch {
          /*
           * Backend failure must not stop
           * browser GPS.
           */
        }
      },
      [
        token,
        connection,
        scenarioId,
      ]
    );

  const updateLocation =
    useCallback(
      (
        coordinates: Coordinates
      ) => {
        setLocation(
          coordinates
        );

        void persistLocation(
          coordinates
        );

        void syncActiveWarning(
          coordinates
        );
      },
      [
        persistLocation,
        syncActiveWarning,
      ]
    );

  const updateResources =
    useCallback(
      (
        items: Resource[]
      ) => {
        setResources(
          items
        );
      },
      []
    );

  /* ===================================================
     AI
  =================================================== */

  const aiResult =
    useMemo(
      () =>
        calculateRAKSHAAI({
          household,
          location,
          shelters,
          connection,
          dangerZoneActive,
        }),
      [
        household,
        location,
        shelters,
        connection,
        dangerZoneActive,
      ]
    );

  /* ===================================================
     CONNECTION
  =================================================== */

  async function updateConnectivity(
    next: Connection
  ) {
    setConnection(
      next
    );

    const nextWelfare =
      next ===
      "ONLINE"
        ? "NORMAL"
        : next ===
          "DEGRADED"
        ? "MONITORING"
        : dangerZoneActive
        ? "WELFARE CONCERN"
        : "NORMAL";

    setWelfare(
      nextWelfare
    );
    addTimeline(
      "Connectivity changed",
      `${next} · ${dangerZoneActive ? "active danger-zone context" : "outside active danger zone"}`,
      next === "OFFLINE" && dangerZoneActive
        ? "WARNING"
        : "INFO"
    );

    try {
      await postEvent(
        "/api/events/connectivity",
        {
          state:
            next,
          location,
          scenarioId,
        },
        token
      );

      if (
        next === "OFFLINE" &&
        dangerZoneActive
      ) {
        await postEvent(
          "/api/events/welfare",
          {
            connection: next,
            location,
            household,
            scenarioId,
            reason:
              "Citizen became offline while inside an active danger zone.",
          },
          token
        );
      }
    } catch (
      error
    ) {
      console.error(
        "Connectivity event failed:",
        error
      );
    }
  }

  /* ===================================================
     SOS
  =================================================== */

  async function sendSOS() {
    setSending(
      true
    );

    setMessage("");

    try {
      /*
       * Send the latest known location at the moment
       * SOS is submitted.
       */
      const result = await postEvent(
        "/api/events/sos",
        {
          location,
          household,
          risk:
            aiResult.score,
          connectivity:
            connection,
          evacuationPlan: {
            shelterName:
              aiResult.shelterName,
            shelterDistance:
              aiResult.shelterDistance,
            availableSpaces:
              aiResult.availableSpaces,
            routeAdvice:
              aiResult.routeAdvice,
          },
          description:
            "Citizen activated emergency SOS.",
          scenarioId,
        },
        token
      ) as any;

      const notificationAccepted = Boolean(result?.familyNotification?.accepted);
      const hasEmergencyContact = Boolean(household.emergencyContact?.trim());
      const familyMessage = String(result?.familyNotification?.familyMessage || "").trim();
      setFamilyEmergencyMessage(familyMessage);
      setMessage(
        notificationAccepted
          ? "✓ SOS sent. Your emergency contact was notified."
          : hasEmergencyContact
            ? "✓ SOS sent. The family emergency message is ready, but could not be delivered automatically."
            : "✓ SOS sent. Add a family emergency contact to enable automatic family notification."
      );
      addTimeline(
        "SOS sent",
        notificationAccepted
          ? "Emergency request sent to the authority centre and family notification was accepted by the configured SMS gateway."
          : "Emergency request sent to the authority centre. Family notification is separate and does not block SOS delivery.",
        "ACTION"
      );

      setModal(
        "none"
      );
    } catch (
      error
    ) {
      setMessage(
        error instanceof
          Error
          ? error.message
          : "SOS failed."
      );
    } finally {
      setSending(
        false
      );
    }
  }

  /* ===================================================
     SAFE CHECK-IN
  =================================================== */

  async function sendSafeCheckIn() {
    setSafeSending(
      true
    );

    setSafeMessage("");

    try {
      await postEvent(
        "/api/events/safe-checkin",
        {
          location,
          message:
            safeMessage ||
            "Citizen confirmed they are safe.",
          scenarioId,
        },
        token
      );

      setMessage(
        "✓ Safety check-in received by RAKSHA."
      );

      setSafetyCheckInAt(Date.now());
      setSafetyResponseStartedAt(Date.now());
      setNoResponseAlerted(false);
      addTimeline(
        "I'M SAFE confirmed",
        "RAKSHA recorded your safety check-in.",
        "SUCCESS"
      );

      setSafeMessage("");
    } catch (
      error
    ) {
      setMessage(
        error instanceof
          Error
          ? error.message
          : "Safety check-in failed."
      );
    } finally {
      setSafeSending(
        false
      );
    }
  }

  /* ===================================================
     HAZARD REPORT
  =================================================== */

  /* ===================================================
     VOICE HAZARD REPORT
  =================================================== */

  function startVoiceReport() {
    setVoiceReportError("");

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceReportError(
        "Voice input is not supported by this browser. You can still type the report."
      );
      return;
    }

    stopAudio();
    stopTalkVoice();
    stopVoiceReport();

    const recognition =
      new SpeechRecognition();

    recognition.lang =
      reportLanguage === "auto"
        ? defaultSpeechLanguage()
        : reportLanguage;
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setListeningForReport(true);
    };

    recognition.onresult = (event: any) => {
      if (reportRecognitionRef.current !== recognition) return;
      let text = "";

      for (
        let index = event.resultIndex;
        index < event.results.length;
        index += 1
      ) {
        text +=
          event.results[index][0]?.transcript ||
          "";
      }

      setVoiceReportText(
        text.trim()
      );
    };

    recognition.onerror = (event: any) => {
      setListeningForReport(false);

      const errorCode =
        String(event?.error || "");

      if (errorCode === "not-allowed") {
        setVoiceReportError(
          "Microphone permission was denied. Allow microphone access and try again."
        );
      } else {
        setVoiceReportError(
          "Voice input could not be captured. Please try again or type the report."
        );
      }
    };

    recognition.onend = () => {
      setListeningForReport(false);
    };

    reportRecognitionRef.current =
      recognition;

    try { recognition.start(); }
    catch { stopVoiceReport(); setVoiceReportError("Microphone could not start. Please try again or type your report."); }
  }

  function stopVoiceReport() {
    reportRecognitionRef.current?.stop?.();
    reportRecognitionRef.current = null;
    setListeningForReport(false);
  }

  const allowedReportMediaTypes = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "video/mp4",
    "video/webm",
    "video/quicktime",
  ]);

  function addReportFiles(files: FileList | null, kind: "image" | "video") {
    if (!files) return;
    const accepted: File[] = [];
    let totalBytes = reportMedia.reduce((sum, file) => sum + file.size, 0);

    for (const file of Array.from(files)) {
      if (reportMedia.length + accepted.length >= 3) {
        setMessage("You can attach up to 3 photos/videos per report.");
        break;
      }
      const validKind = kind === "image" ? file.type.startsWith("image/") : file.type.startsWith("video/");
      if (!validKind || !allowedReportMediaTypes.has(file.type)) {
        setMessage("Unsupported media type. Use JPEG, PNG, WebP, MP4, WebM or QuickTime.");
        continue;
      }
      if (file.size > 4 * 1024 * 1024) {
        setMessage("Each media file must be 4 MB or smaller.");
        continue;
      }
      if (totalBytes + file.size > 8 * 1024 * 1024) {
        setMessage("Total visual evidence must stay under 8 MB.");
        continue;
      }
      accepted.push(file);
      totalBytes += file.size;
    }

    if (accepted.length) {
      setReportMedia((current) => [...current, ...accepted].slice(0, 3));
    }
  }

  function removeReportFile(index: number) {
    setReportMedia((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  function fileToDataUrl(file: File) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error || new Error("Could not read attachment."));
      reader.readAsDataURL(file);
    });
  }

  async function sendReport() {
    setSending(
      true
    );

    setMessage("");

    try {
      const rawDescription =
        voiceReportText.trim() ||
        `Citizen reported: ${reportType}`;

      let inferredType = reportType;
      const normalizedText =
        rawDescription.toLowerCase();

      if (
        /road|roadway|rasta|सड़क|सड़क|রাস্তা|ರಸ್ತೆ|रस्ता/.test(
          normalizedText
        ) &&
        /broken| टूट|टूट|blocked|बंद|बाधित|blocked traffic|यातायात|traffic|রাস্তায়|ರಸ್ತೆ|रस्ता/.test(
          normalizedText
        )
      ) {
        inferredType = "Blocked road";
      } else if (
        /water|पानी|जल|बाढ़|बाढ़|flood|flooded|fire|आग|धुआं|smoke|landslide|भूस्खलन|earthquake|भूकंप|cyclone|storm|तूफान|road|सड़क|सड़क|bridge|पुल|blocked|medical|एम्बुलेंस|injury|घायल|power|बिजली|debris|मलबा/.test(
          normalizedText
        )
      ) {
        inferredType = normalizedText.includes(
          "rising"
        ) || normalizedText.includes(
          "बढ़"
        )
          ? "Rising water"
          : "Flooded road";
      } else if (
        /damage|damaged|टूटा|क्षति|collapsed|गिरा|damage|ಕ್ಷತಿ|ধসে/.test(
          normalizedText
        )
      ) {
        inferredType = "Infrastructure damage";
      }

      let aiSummary = "";

      try {
        const interpreted =
          await apiRequest<{
            success: boolean;
            reportType?: string;
            severity?: string;
            summary?: string;
          }>(
            "/api/ai/interpret-report",
            {
              method: "POST",
              body: JSON.stringify({
                text: rawDescription,
                language: reportLanguage === "auto"
                  ? defaultSpeechLanguage()
                  : reportLanguage,
                location,
                scenarioId,
                operatingArea: scenario.areaLabel,
                hazardType: scenario.hazardType,
              }),
            },
            token
          );

        if (interpreted.reportType) {
          inferredType = interpreted.reportType;
        }
        if (interpreted.summary) {
          aiSummary = interpreted.summary;
        }
      } catch {
        // Raw report remains sendable even if AI interpretation is unavailable.
      }

      const media = await Promise.all(
        reportMedia.map(async (file) => ({
          name: file.name,
          type: file.type,
          size: file.size,
          data: await fileToDataUrl(file),
        }))
      );

      await postEvent(
        "/api/events/report",
        {
          reportType: inferredType,
          description: rawDescription,
          aiSummary,
          sourceLanguage:
            reportLanguage === "auto"
              ? defaultSpeechLanguage()
              : reportLanguage,
          severity: "HIGH",
          location,
          scenarioId,
          media,
        },
        token
      );

      setMessage(
        reportMedia.length
          ? "✓ Hazard report received with visual evidence."
          : "✓ Hazard report received and added to community intelligence."
      );
      addTimeline(
        "Ground report submitted",
        `${inferredType}${aiSummary ? " · RAKSHA generated a structured summary." : " · Original statement preserved for authority review."}${reportMedia.length ? ` · ${reportMedia.length} visual attachment${reportMedia.length === 1 ? "" : "s"}.` : ""}`,
        "ACTION"
      );

      setReportMedia([]);
      setVoiceReportText("");
      setModal(
        "none"
      );

      void loadCommunityIncidents();
    } catch (
      error
    ) {
      setMessage(
        error instanceof
          Error
          ? error.message
          : "Report failed."
      );
    } finally {
      setSending(
        false
      );
    }
  }

  async function talkToRaksha() {
    const message = talkMessage.trim();

    if (!message || talkLoading) {
      return;
    }

    const userTurn: TalkTurn = {
      id: `${Date.now()}-user`,
      role: "user",
      text: message,
      createdAt: new Date().toISOString(),
    };

    stopTalkVoice();
    stopAudio();
    // Clear the composer immediately so the citizen can start a new question.
    setTalkMessage("");
    setTalkLoading(true);
    setTalkReply("");
    setTalkHistory((current) => [...current, userTurn].slice(-20));

    try {
      const data = await apiRequest<{
        success: boolean;
        answer: string;
        aiUsed?: boolean;
      }>(
        "/api/ai/chat",
        {
          method: "POST",
          body: JSON.stringify({
            message,
            history: talkHistory.slice(-8),
            context: {
              scenarioId,
              operatingArea: scenario.areaLabel,
              scenarioHazard: scenario.hazardType,
              warning: activeWarning
                ? {
                    hazardType: activeWarning.hazardType,
                    severity: activeWarning.severity,
                    status: activeWarning.status,
                    sourceStatus: activeWarning.sourceStatus,
                    instructions: activeWarning.instructions?.slice(0, 5),
                  }
                : null,
              dangerZoneActive,
              location,
              household,
              connectivity: connection,
              welfare,
              risk: {
                score: aiResult.score,
                level: aiResult.level,
                action: aiResult.action,
                shelterName: aiResult.shelterName,
                availableSpaces: aiResult.availableSpaces,
              },
              nearbyCommunityIncidents: communityIncidents
                .slice(0, 5)
                .map((item) => ({
                  type: item.type,
                  priority: item.priority,
                  confidence: item.confidence,
                  reportCount: item.reportCount,
                  uniqueCitizenCount: item.uniqueCitizenCount,
                })),
            },
          }),
        },
        token
      );

      const answer = data.answer?.trim() ||
        "RAKSHA could not produce an answer right now. Please use the safety guidance shown above.";

      setTalkReply(answer);
      const rakshaTurn: TalkTurn = {
        id: `${Date.now()}-raksha`,
        role: "raksha",
        text: answer,
        createdAt: new Date().toISOString(),
      };
      setTalkHistory((current) =>
        [...current, rakshaTurn].slice(-20)
      );
      // Audio stays silent until the citizen selects Listen on a message.

      addTimeline(
        "Talk to RAKSHA used",
        data.aiUsed === false
          ? "RAKSHA returned its local safety fallback."
          : "RAKSHA AI explained the current situation using the available RAKSHA context.",
        "INFO"
      );
    } catch (error) {
      const fallback =
        "RAKSHA could not reach the conversational AI right now. Please use the current safety guidance, SOS, or official instructions shown on this screen.";
      setTalkReply(
        error instanceof Error
          ? `${fallback} ${error.message}`
          : fallback
      );
    } finally {
      setTalkLoading(false);
    }
  }

  function clearTalkHistory() {
    stopAudio();
    stopTalkVoice();
    setTalkHistory([]);
    setTalkReply("");
    setTalkMessage("");
  }

  async function generateCitizenAgentAdvice() {
    if (!token || agentLoading) return;

    setAgentLoading(true);
    try {
      const data = await apiRequest<{
        success: boolean;
        advisoryOnly: true;
        advice: string;
        generatedAt: string;
      }>(
        "/api/ai/agent/advice",
        {
          method: "POST",
          body: JSON.stringify({
            role: "CITIZEN",
            context: {
              scenarioId,
              operatingArea: scenario.areaLabel,
              scenarioHazard: scenario.hazardType,
              warning: activeWarning,
              dangerZoneActive,
              location,
              household,
              connectivity: connection,
              welfare,
              risk: aiResult,
              safetyResponse: {
                startedAt: safetyResponseStartedAt,
                checkInAt: safetyCheckInAt,
                noResponseAlerted,
              },
              nearbyCommunityIncidents: communityIncidents.slice(0, 5),
            },
          }),
        },
        token
      );

      setAgentAdvice({
        advice: data.advice,
        generatedAt: data.generatedAt,
        advisoryOnly: true,
      });
    } catch (error) {
      setAgentAdvice({
        advice: "RAKSHA guidance is temporarily unavailable. Please follow the safety information already shown on this screen and use SOS or official emergency help if needed.",
        generatedAt: new Date().toISOString(),
        advisoryOnly: true,
      });
    } finally {
      setAgentLoading(false);
    }
  }

  const totalPeople =
    household.adults +
    household.children +
    household.elderly;

  const nearbyCommunity =
    communityIncidents.filter(
      (incident) => {
        const point =
          normalizeCoordinates(
            incident.center
          );

        if (!point) {
          return false;
        }

        return (
          distanceKm(
            location.lat,
            location.lon,
            point.lat,
            point.lon
          ) <=
          5
        );
      }
    );

  const alternativeShelters = shelters
    .filter(
      (shelter) =>
        shelter.capacity > shelter.occupied &&
        shelter.name !== aiResult.shelterName &&
        (
          household.mobilityNeeds === 0 ||
          shelter.accessibility
        )
    )
    .map((shelter) => ({
      ...shelter,
      distance: distanceKm(
        location.lat,
        location.lon,
        shelter.lat,
        shelter.lon
      ),
    }))
    .sort(
      (a, b) =>
        a.distance - b.distance
    );

  const backupShelter =
    alternativeShelters[0] || null;

  const locationFreshness =
    location.timestamp
      ? formatFreshness(location.timestamp)
      : connection === "OFFLINE"
      ? "LAST KNOWN"
      : "CURRENT SESSION";

  const currentAction =
    dangerZoneActive &&
    aiResult.level !== "LOW"
      ? aiResult.action
      : "Monitor conditions and stay prepared.";

  return (
    <div
      className={`app${
        highContrast
          ? " raksha-high-contrast"
          : ""
      }${
        lowBandwidthMode
          ? " raksha-low-bandwidth"
          : ""
      }`}
    >
      <header className="main-header">
        <div className="brand">
          <RakshaMark small />

          <div>
            <strong>
              RAKSHA
            </strong>

            <span>
              Safer Communities · Citizen Portal
            </span>
          </div>
        </div>

        <div className="header-right">
          <details className="interface-options">
            <summary><AppIcon name="settings" size={16} /> Display & audio</summary>
            <div className="interface-options-panel">
          <button
            type="button"
            onClick={() =>
              setHighContrast(
                (value) => !value
              )
            }
            style={{
              border: "1px solid #c9d6df",
              background: highContrast
                ? "#111827"
                : "#fff",
              color: highContrast
                ? "#fff"
                : "#35566a",
              borderRadius: "4px",
              padding: "5px 7px",
              fontSize: "14px",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            {highContrast
              ? "NORMAL CONTRAST"
              : "HIGH CONTRAST"}
          </button>

          <button
            type="button"
            onClick={() =>
              setLanguage(
                (value) =>
                  value === "EN" ? "HI" : "EN"
              )
            }
            style={{
              border: "1px solid #c9d6df",
              background: "#fff",
              color: "#35566a",
              borderRadius: "4px",
              padding: "5px 7px",
              fontSize: "14px",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            {language === "EN" ? "हिन्दी" : "ENGLISH"}
          </button>

          <button
            type="button"
            onClick={() =>
              readAloud(
                accessibilityText()
              )
            }
            style={{
              border: "1px solid #c9d6df",
              background: "#fff",
              color: "#35566a",
              borderRadius: "4px",
              padding: "5px 7px",
              fontSize: "14px",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            <AppIcon name="volume" size={16} /> {language === "EN" ? "READ ALOUD" : "सुनें"}
          </button>

          <button
            type="button"
            onClick={() =>
              setLowBandwidthMode(
                (value) => !value
              )
            }
            style={{
              border: "1px solid #c9d6df",
              background: lowBandwidthMode
                ? "#eef7fb"
                : "#fff",
              color: lowBandwidthMode
                ? "#1769aa"
                : "#35566a",
              borderRadius: "4px",
              padding: "5px 7px",
              fontSize: "14px",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            {lowBandwidthMode
              ? "LOW DATA ON"
              : "LOW DATA"}
          </button>


            </div>
          </details>
          <ThemeToggle compact />
          {speaking && <button type="button" className="stop-audio" onClick={stopAudio}><AppIcon name="stop" size={14} /> Stop audio</button>}
          <span className="system-online">
            <span className="live-dot" aria-hidden="true" /> SYSTEM ONLINE
          </span>

          <span>
            {
              user.name ||
              "Citizen"
            }
          </span>

          <button type="button" className="header-logout" onClick={logout}>
            <AppIcon name="logout" size={15} /> Logout
          </button>
        </div>
      </header>

      <div className="status-strip">
        <div>
          <strong>DISASTER RESPONSE</strong>

          <span>
            {activeWarning
              ? `${activeWarning.hazardType} · ${activeWarning.severity} · warning → context → action → response`
              : "All-hazard monitoring · warning → context → action → response"}
          </span>

          <small
            style={{
              display: "block",
              marginTop: "3px",
              color: "var(--text-soft)",
              fontSize: "14px",
            }}
          >
            Supports flood, cyclone, earthquake, landslide, fire,
            infrastructure, medical and other hazards.
          </small>
        </div>

        <div className="connection-switch">
          {(
            [
              "ONLINE",
              "DEGRADED",
              "OFFLINE",
            ] as Connection[]
          ).map(
            (state) => (
              <button
                type="button"
                key={
                  state
                }
                className={
                  connection ===
                  state
                    ? `active ${state.toLowerCase()}`
                    : ""
                }
                onClick={() =>
                  void updateConnectivity(
                    state
                  )
                }
              >
                {
                  state
                }
              </button>
            )
          )}
        </div>
      </div>

      <nav className="section-nav citizen-catalogue" aria-label="Citizen sections">
        <a href="#safety"><AppIcon name="shield" size={15} /> My safety</a>
        <a href="#situation"><AppIcon name="map" size={15} /> Situation around me</a>
        <a href="#resources"><AppIcon name="help" size={15} /> Nearby help</a>
        <button type="button" onClick={() => setModal("report")}><AppIcon name="report" size={15} /> Report a problem</button>
        <a href="#assistant"><AppIcon name="message" size={15} /> Ask RAKSHA</a>
        <span>Citizen safety portal</span>
      </nav>
      <main className="page">
        <div className="page-heading raksha-dashboard-hero">
          <div>
            <span>
              YOUR SAFETY SPACE
            </span>

            <h1>
              {user.name
                ? `${user.name}'s safety overview`
                : "Your safety overview"}
            </h1>

            <p>
              See what is happening around you, what help is nearby, and what you can do next.
            </p>
          </div>

          <div className="location-chip scenario-location-chip">
            <div className="scenario-location-top">
              <span>YOUR LOCATION</span>
              <b className={`scenario-mode ${locationIsFallback ? "fallback" : "live"}`}>
                {locationIsFallback ? "SAMPLE LOCATION" : "CURRENT LOCATION"}
              </b>
            </div>
            <strong>{scenario.areaLabel}</strong>
            <small>
              {location.lat.toFixed(5)}, {location.lon.toFixed(5)} · {connection === "OFFLINE" ? "last known location" : "current location"}
            </small>
            <button type="button" className="scenario-refresh" onClick={() => void onRefreshScenario()}>
              <AppIcon name="refresh" size={14} /> Refresh location
            </button>
          </div>
        </div>

        <section
          id="safety"
          className={`raksha-action-hero ${
            dangerZoneActive
              ? "danger"
              : "safe"
          }`}
        >
          <div>
            <span className="card-label">
              YOUR SAFETY UPDATE
            </span>
            <h2>
              {dangerZoneActive
                ? "You may be affected. Here’s what you can do now."
                : "You’re not currently in an active danger area."}
            </h2>
            <p>
              {dangerZoneActive
                ? currentAction
                : "Keep your location and emergency information up to date. RAKSHA will continue checking for active warnings."}
            </p>
            {dangerZoneActive && (
              <p className="safety-update-hindi" lang="hi">
                आप प्रभावित हो सकते हैं। चेतावनी देखें और सहायता की ज़रूरत हो तो एसओएस भेजें।
              </p>
            )}
          </div>

          <div className="raksha-quick-actions">
            <button
              type="button"
              className="quick-action primary"
              onClick={() => setModal("sos")}
            >
              <AppIcon name="alert" size={17} /> SOS <span className="quick-action-hindi" lang="hi">आपात सहायता</span>
            </button>

            <button
              type="button"
              className="quick-action"
              onClick={() => setModal("report")}
            >
              <AppIcon name="report" size={17} /> REPORT A PROBLEM
            </button>

            <button
              type="button"
              className="quick-action"
              onClick={() => void sendSafeCheckIn()}
              disabled={safeSending}
            >
              <AppIcon name="check" size={17} /> I'M SAFE
            </button>

            <a
              className="quick-action"
              href="tel:112"
            >
              <AppIcon name="phone" size={17} /> CALL 112
            </a>

            {household.emergencyContact && (
              <a
                className="quick-action"
                href={`tel:${household.emergencyContact}`}
              >
                <AppIcon name="user" size={17} /> CALL MY EMERGENCY CONTACT
              </a>
            )}
          </div>
        </section>

        <section className="situation-workspace" id="situation" aria-label="Situation and recommended action">
            <section className="map-card">
              <div className="section-head">
                <div>
                  <span>
                    YOUR MAP
                  </span>

                  <h2>
                    Situation around you
                  </h2>
                </div>

                <b>
                  UPDATED
                </b>
              </div>

              <SituationMap
                shelters={shelters}
                hazards={scenario.demoHazards}
                evacuationRoute={scenario.evacuationRoute}
                dangerGeometry={activeWarning?.affectedArea}
                initialLocation={scenarioContext.viewerLocation}
                scenarioCenter={scenario.center}
                seedResources={scenario.resources}
                onLocation={updateLocation}
                onResources={updateResources}
              />
            </section>
        <section className="ai-section" id="decision-support">
          <AIEnginePanel
            result={
              aiResult
            }
            token={
              token
            }
            household={
              household
            }
            location={
              location
            }
            connection={
              connection
            }
            scenarioId={scenarioId}
          />
        </section>
        </section>

        <section className="raksha-monitor-card">
          <div className="raksha-monitor-main">
            <span className="card-label">
              YOUR SAFETY CHECK
            </span>
            <h3>
              {activeWarning
                ? `${activeWarning.hazardType} · ${activeWarning.severity} · ${
                    dangerZoneActive
                      ? "AFFECTED"
                      : "NOT CURRENTLY AFFECTED"
                  }`
                : "No active warning for your area"}
            </h3>
            <p>
              {connection === "OFFLINE"
                ? "You’re offline. RAKSHA is using your last known location and saved information."
                : lowBandwidthMode
                ? "Low-data mode is on, so only essential information is loaded."
                : "RAKSHA is checking warnings, your location and nearby help."}
            </p>
          </div>

          <div className="raksha-monitor-stats">
            <div>
              <span>LOCATION</span>
              <strong>{locationFreshness}</strong>
            </div>
            <div>
              <span>AREA STATUS</span>
              <strong>
                {dangerZoneActive ? "ACTIVE" : "CLEAR"}
              </strong>
            </div>
            <div>
              <span>SAFETY LEVEL</span>
              <strong>{aiResult.level}</strong>
            </div>
          </div>
        </section>

        <section className={`warning-card${activeWarning ? " is-active" : ""}`}>
          <div className="warning-icon">
            <AppIcon name="alert" size={21} />
          </div>

          <div>
            <span>
              {activeWarning
                ? `${String(activeWarning.sourceStatus || "").toUpperCase() === "OFFICIAL"
                    ? "VERIFIED OFFICIAL WARNING"
                    : String(activeWarning.sourceStatus || "").toUpperCase() === "DEMO"
                    ? "DEMONSTRATION WARNING"
                    : "WARNING INPUT"} · ${activeWarning.source || "UNKNOWN SOURCE"}`
                : "WARNING INPUT · NO ACTIVE WARNING"}
            </span>

            <h2>
              {activeWarning
                ? `${activeWarning.hazardType} warning · ${activeWarning.severity}`
                : "No active disaster warning"}
            </h2>

            <p className="warning-hindi" lang="hi" aria-live="polite">
              {hindiWarningSummary(activeWarning)}
            </p>

            <p>
              The active warning is combined with your location, household and resource context.
            </p>

            <small
              style={{
                display: "block",
                marginTop: "5px",
                color: "var(--text-soft)",
                fontSize: "14px",
              }}
            >
              SUPPORTED HAZARDS: FLOOD · CYCLONE · EARTHQUAKE · LANDSLIDE · FIRE · INFRASTRUCTURE · MEDICAL · OTHER
            </small>

            {activeWarning && (
              <div className="warning-meta">
                <span>
                  STATUS: {activeWarning.status || "ACTIVE"}
                </span>

                <span
                  style={{
                    color: freshnessColor(
                      activeWarning.updatedAt ||
                        activeWarning.issuedAt
                    ),
                    fontWeight: 900,
                  }}
                >
                  {formatFreshness(
                    activeWarning.updatedAt ||
                      activeWarning.issuedAt
                  )}
                </span>

                {activeWarning.issuedAt && (
                  <span>
                    ISSUED: {new Date(
                      activeWarning.issuedAt
                    ).toLocaleString()}
                  </span>
                )}

                {activeWarning.expiresAt && (
                  <span>
                    VALID UNTIL: {new Date(
                      activeWarning.expiresAt
                    ).toLocaleString()}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="warning-source">
            <div
              className={`warning-verification ${
                activeWarning?.sourceStatus === "OFFICIAL"
                  ? "verified"
                  : activeWarning?.sourceStatus === "UNVERIFIED"
                    ? "unverified"
                    : "demo"
              }`}
              style={{
                fontSize: "14px",
                fontWeight: 900,
                letterSpacing: "0.4px",
                marginBottom: "5px",
              }}
            >
              <span
                className="warning-verification-dot"
                style={{
                  marginRight: "4px",
                }}
              >
                ●
              </span>
              {activeWarning?.sourceStatus === "OFFICIAL"
                ? "VERIFIED GOVERNMENT SOURCE"
                : activeWarning?.sourceStatus === "UNVERIFIED"
                  ? "UNVERIFIED SOURCE"
                  : "DEMONSTRATION SOURCE"}
            </div>

            <strong
              style={{
                fontSize: "14px",
                display: "block",
              }}
            >
              {activeWarning?.source || "RAKSHA WARNING ENGINE"}
            </strong>
          </div>
        </section>

        {activeWarning && (
          <section className="card warning-context-card">
            <div
              className="card-label"
              style={{
                marginBottom: "6px",
              }}
            >
              WHY RAKSHA IS ALERTING YOU
            </div>

            <div
              style={{
                fontSize: "14px",
                lineHeight: 1.6,
                color: "var(--text-soft)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: "7px",
                  marginBottom: "5px",
                }}
              >
                <strong>✓</strong>
                <span>
                  {dangerZoneActive
                    ? "Your current or last-known location is inside the active warning area."
                    : "An active warning exists, but your current or last-known location is outside the affected area."}
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "7px",
                  marginBottom: "5px",
                }}
              >
                <strong>✓</strong>
                <span>
                  Hazard: {activeWarning.hazardType} · Severity: {activeWarning.severity}
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "7px",
                  marginBottom: "5px",
                }}
              >
                <strong>✓</strong>
                <span>
                  Household: {Number(household.adults ?? 0) + Number(household.children ?? 0) + Number(household.elderly ?? 0)} people
                  {Number(household.children ?? 0) > 0
                    ? ` · ${household.children} child${Number(household.children) === 1 ? "" : "ren"}`
                    : ""}
                  {Number(household.elderly ?? 0) > 0
                    ? ` · ${household.elderly} elderly`
                    : ""}
                  {Number(household.mobilityNeeds ?? 0) > 0
                    ? ` · ${household.mobilityNeeds} mobility support`
                    : ""}
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "7px",
                }}
              >
                <strong>✓</strong>
                <span>
                  Location context: {connection === "OFFLINE" ? "last-known location" : "live location"} at {location.lat.toFixed(4)}, {location.lon.toFixed(4)}
                </span>
              </div>
            </div>

            {activeWarning.instructions &&
              activeWarning.instructions.length > 0 && (
                <div
                  style={{
                    marginTop: "9px",
                    paddingTop: "8px",
                    borderTop: "1px solid #dfe8ed",
                  }}
                >
                  <strong
                    style={{
                      display: "block",
                      fontSize: "14px",
                      color: "var(--text-strong)",
                      letterSpacing: "0.4px",
                      marginBottom: "4px",
                    }}
                  >
                    OFFICIAL INSTRUCTIONS
                  </strong>

                  {activeWarning.instructions.slice(0, 3).map(
                    (instruction, index) => (
                      <div
                        key={`${activeWarning.id}-instruction-${index}`}
                        style={{
                          fontSize: "14px",
                          lineHeight: 1.5,
                          color: "var(--text-soft)",
                          marginBottom: "2px",
                        }}
                      >
                        • {instruction}
                      </div>
                    )
                  )}
                </div>
              )}
          </section>
        )}

        <section className="card citizen-agent-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
            <div>
              <div className="card-label">RAKSHA SAFETY ASSISTANT</div>
              <strong style={{ display: "block", marginTop: "3px", color: "#294b60", fontSize: "12px" }}>
                Helpful guidance based on your current situation
              </strong>
            </div>
            <button type="button" onClick={() => void generateCitizenAgentAdvice()} disabled={agentLoading} style={{ border: "1px solid #a9c5d3", borderRadius: "5px", background: "#fff", color: "#1769aa", padding: "7px 9px", fontSize: "14px", fontWeight: 900 }}>
              <AppIcon name="shield" size={15} /> {agentLoading ? "CHECKING..." : "GET HELP & GUIDANCE"}
            </button>
          </div>
          <div className="agent-disclaimer" style={{ marginTop: "8px", padding: "7px", borderRadius: "5px", background: "#eef7fb", color: "#587181", fontSize: "14px", lineHeight: 1.5 }}>
            Guidance only. In an emergency, use SOS or contact emergency services.
          </div>
          {agentAdvice && (
            <div className="agent-response" style={{ marginTop: "9px", padding: "10px", borderRadius: "6px", background: "#fff", border: "1px solid #dbe6eb", color: "#405d6d", fontSize: "14px", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
              {agentAdvice.advice}
              <small style={{ display: "block", marginTop: "7px", color: "#82929d", fontSize: "14px" }}>
                Generated {new Date(agentAdvice.generatedAt).toLocaleString()} · Your control is retained
              </small>
            </div>
          )}
        </section>

        <section className="card raksha-talk-card" id="assistant">
          <div className="section-head">
            <div>
              <span>
                ASK RAKSHA
              </span>
              <h2>
                Talk to RAKSHA
              </h2>
            </div>
            <button
              type="button"
              onClick={() =>
                setTalkOpen(
                  (value) => !value
                )
              }
              style={{
                border: "1px solid #a9c5d3",
                borderRadius: "5px",
                background: "#fff",
                color: "#1769aa",
                padding: "7px 9px",
                fontSize: "14px",
                fontWeight: 900,
              }}
            className="talk-open-toggle"
            >
              <AppIcon name={talkOpen ? "close" : "message"} size={15} />
              {talkOpen ? "CLOSE" : "OPEN"}
            </button>
          </div>

          <p
            style={{
              margin: "7px 0 0",
              color: "#667d8a",
              fontSize: "14px",
              lineHeight: 1.5,
            }}
          >
            Ask in your own words. RAKSHA can explain what is happening, show nearby help, and suggest what you can do next.
          </p>

          {talkOpen && (
            <div className="raksha-talk-panel">
              <div
                ref={talkScrollRef}
                className="raksha-talk-history"
                aria-live="polite"
                role="log"
                style={{
                  maxHeight: "240px",
                  overflowY: "auto",
                  scrollBehavior: "smooth",
                }}
              >
                {talkHistory.length === 0 ? (
                  <div className="raksha-talk-empty">
                    Ask RAKSHA about your situation, nearby help, or what to do next.
                  </div>
                ) : (
                  talkHistory.map((turn) => (
                    <div
                      key={turn.id}
                      className={
                        turn.role === "user"
                          ? "raksha-talk-bubble raksha-talk-user"
                          : "raksha-talk-bubble raksha-talk-assistant"
                      }
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "center" }}>
                        <strong>{turn.role === "user" ? "YOU" : "RAKSHA"}</strong>
                        <button
                          type="button"
                          onClick={() => readAloud(turn.text)}
                          aria-label={`Speak ${turn.role === "user" ? "your question" : "RAKSHA answer"}`}
                          style={{
                            border: "1px solid #b7cbd6",
                            background: "#fff",
                            borderRadius: "999px",
                            padding: "4px 7px",
                            fontSize: "14px",
                            cursor: "pointer",
                          }}
                        >
                          <AppIcon name="volume" size={14} /> LISTEN
                        </button>
                      </div>
                      <p>{turn.text}</p>
                    </div>
                  ))
                )}
                {talkLoading && (
                  <div className="raksha-talk-bubble raksha-talk-assistant">
                    <strong>RAKSHA</strong>
                    <p>Checking your current situation…</p>
                  </div>
                )}
              </div>

              {talkReply && !talkLoading && talkHistory[talkHistory.length - 1]?.text !== talkReply && (
                <p role="status" className="talk-error">{talkReply}</p>
              )}
              <div className="raksha-talk-input">
                <input
                  aria-label="Your question for RAKSHA"
                  value={talkMessage}
                  onChange={(event) =>
                    setTalkMessage(event.target.value)
                  }
                  placeholder={
                    language === "HI"
                      ? "RAKSHA से पूछिए…"
                      : "Ask RAKSHA what you should do next…"
                  }
                  disabled={talkLoading}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void talkToRaksha();
                    }
                  }}
                />

                <button
                  type="button"
                  onClick={
                    listeningForTalk
                      ? stopTalkVoice
                      : startTalkVoice
                  }
                  disabled={talkLoading}
                  className={`talk-tool-button ${listeningForTalk ? "active" : ""}`}
                  aria-label={listeningForTalk ? "Stop speaking" : "Speak question"}
                  title={listeningForTalk ? "Stop listening" : "Speak your question"}
                  style={{
                    border: "1px solid #caa63a",
                    background: listeningForTalk ? "#fff4cf" : "#fff",
                    color: "#7a5a00",
                    borderRadius: "6px",
                    padding: "7px 8px",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  <AppIcon name={listeningForTalk ? "stop" : "mic"} size={15} />
                  {listeningForTalk ? "STOP" : "SPEAK"}
                </button>

                <button
                  type="button"
                  onClick={speakCurrentQuestion}
                  disabled={talkLoading || !talkMessage.trim()}
                  className="talk-tool-button"
                  aria-label="Hear your question"
                  title="Hear your question"
                  style={{
                    border: "1px solid #b7cbd6",
                    background: "#fff",
                    color: "#1769aa",
                    borderRadius: "6px",
                    padding: "7px 8px",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  <AppIcon name="volume" size={15} /> HEAR
                </button>

                <button
                  type="button"
                  className="talk-send-button"
                  disabled={talkLoading || !talkMessage.trim()}
                  onClick={() => void talkToRaksha()}
                >
                  {talkLoading ? "..." : <><AppIcon name="send" size={15} /> SEND</>}
                </button>
              </div>

              <div className="raksha-talk-actions">
                <span className="manual-voice-note">Microphone and playback start only when you choose.</span>
                {speaking && <button type="button" onClick={stopAudio}><AppIcon name="stop" size={14} /> Stop audio</button>}
                <button
                  type="button"
                  onClick={clearTalkHistory}
                  disabled={!talkHistory.length && !talkMessage && !talkReply}
                >
                  Clear chat
                </button>
              </div>

              <div className="raksha-talk-suggestions">
                {[
                  "What should I do now?",
                  "Why am I affected?",
                  "Which nearby shelter should I use?",
                ].map((question) => (
                  <button
                    type="button"
                    key={question}
                    onClick={() => {
                      setTalkMessage(question);
                      setTalkOpen(true);
                    }}
                    disabled={talkLoading}
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>



        <section className="main-layout" id="resources">
          <div className="left-column">
            <HouseholdProfile
              household={
                household
              }
              setHousehold={
                setHousehold
              }
            />

            <ResourcePanel
              resources={
                resources
              }
            />

            <section className="card"
              style={{
                marginTop:
                  "12px",
                padding:
                  "15px",
              }}
            >
              <div className="card-label">
                FAMILY RESILIENCE
              </div>

              <h2
                style={{
                  margin:
                    "5px 0",
                }}
              >
                Emergency readiness
              </h2>

              <p
                style={{
                  color:
                    "#71828f",
                  fontSize: "14px",
                  lineHeight:
                    1.5,
                }}
              >
                Keep a reachable contact and household
                information ready before evacuation.
              </p>

              <label
                style={{
                  display:
                    "grid",
                  gap:
                    "5px",
                  marginTop:
                    "10px",
                  color:
                    "#65798a",
                  fontSize: "14px",
                  fontWeight:
                    900,
                }}
              >
                EMERGENCY CONTACT

                <input
                  type="tel"
                  value={
                    household.emergencyContact ||
                    ""
                  }
                  onChange={(
                    event
                  ) =>
                    setHousehold(
                      (current) => ({
                        ...current,
                        emergencyContact:
                          event
                            .target
                            .value,
                      })
                    )
                  }
                  placeholder="Family number, e.g. +91XXXXXXXXXX"
                  style={{
                    padding:
                      "9px",
                    border:
                      "1px solid #d5e0e8",
                    borderRadius:
                      "6px",
                  }}
                />
              </label>
            </section>
          </div>

          <div className="right-column">


            {nearbyCommunity.length >
              0 && (
              <section
                className="welfare-card monitoring"
              >
                <div className="welfare-head">
                  <div>
                    <span>
                      REPORTS FROM PEOPLE NEARBY
                    </span>

                    <h2>
                      Hazards reported near you
                    </h2>
                  </div>

                  <i />
                </div>

                <p>
                  Citizen reports are being used as local
                  ground-truth signals. Follow official
                  instructions before changing your route.
                </p>

                {nearbyCommunity
                  .slice(
                    0,
                    3
                  )
                  .map(
                    (
                      incident
                    ) => (
                      <div
                        className="community-hazard-item"
                        key={
                          incident.id
                        }
                        style={{
                          padding:
                            "8px",
                          marginTop:
                            "6px",
                          border:
                            "1px solid #ead9a8",
                          borderRadius:
                            "5px",
                          background:
                            "#fff",
                        }}
                      >
                        <strong>
                          {
                            incident.type
                          }
                        </strong>

                        <span
                          style={{
                            display:
                              "block",
                            marginTop:
                              "3px",
                            color:
                              "#7d6e49",
                            fontSize: "14px",
                          }}
                        >
                          {
                            incident.reportCount
                          }{" "}
                          reports · confidence{" "}
                          {
                            incident.confidence
                          }
                          %
                        </span>
                      </div>
                    )
                  )}
              </section>
            )}

            <section
              className={`welfare-card ${
                welfare ===
                "WELFARE CONCERN"
                  ? "concern"
                  : welfare ===
                    "MONITORING"
                  ? "monitoring"
                  : ""
              }`}
            >
              <div className="welfare-head">
                <div>
                  <span>
                    WELFARE MONITOR
                  </span>

                  <h2>
                    {
                      welfare
                    }
                  </h2>
                </div>

                <i />
              </div>

              <p>
                Connectivity is monitored with danger-zone and household context. A welfare review is raised only when an active danger context and the response rules justify it.
              </p>

              <div className={`profile-summary${dangerZoneActive ? " is-danger" : ""}`} style={{ marginBottom: "7px" }}>
                <span>
                  {dangerZoneActive
                    ? "⚠ INSIDE ACTIVE DANGER AREA STATUS"
                    : "✓ OUTSIDE ACTIVE DANGER AREA STATUS"}
                </span>

                {activeWarning && (
                  <span>
                    {activeWarning.hazardType}
                  </span>
                )}
              </div>

              {dangerZoneActive && activeWarning && (
                <div
                  className={`safety-checkin-callout${safetyCheckInAt ? " is-complete" : ""}`}
                  style={{
                    marginBottom: "7px",
                    padding: "8px",
                    borderRadius: "5px",
                    background: safetyCheckInAt
                      ? "#edf9f2"
                      : "#fff6e8",
                    border: safetyCheckInAt
                      ? "1px solid #b9ddca"
                      : "1px solid #efd49a",
                  }}
                >
                  <span
                    style={{
                      display: "block",
                      fontSize: "14px",
                      fontWeight: 900,
                      color: safetyCheckInAt
                        ? "#14764d"
                        : "#9b6417",
                    }}
                  >
                    {safetyCheckInAt
                      ? "✓ WE KNOW YOU'RE SAFE"
                      : "SAFETY CHECK-IN"}
                  </span>

                  <strong
                    style={{
                      display: "block",
                      marginTop: "3px",
                      fontSize: "14px",
                      color: "#3e5666",
                    }}
                  >
                    {safetyCheckInAt
                      ? "Thank you. RAKSHA has recorded that you are safe."
                      : `${Math.max(0, Math.ceil((SAFETY_RESPONSE_WINDOW_MS - (safetyResponseNow - (safetyResponseStartedAt || safetyResponseNow))) / 1000))}s remaining for check-in`}
                  </strong>

                  <small
                    style={{
                      display: "block",
                      marginTop: "3px",
                      fontSize: "14px",
                      color: "#718391",
                    }}
                  >
                    If you do not check in, that does not automatically mean you are in danger. RAKSHA may follow up only when an active danger warning applies to your location.
                  </small>
                </div>
              )}

              <div className="welfare-details">
                <div>
                  <span>
                    HOUSEHOLD
                  </span>

                  <strong>
                    {
                      totalPeople
                    }{" "}
                    people
                  </strong>
                </div>

                <div>
                  <span>
                    LAST KNOWN LOCATION
                  </span>

                  <strong>
                    {location.lat.toFixed(
                      4
                    )}
                    ,{" "}
                    {location.lon.toFixed(
                      4
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    CONNECTION
                  </span>

                  <strong>
                    {
                      connection
                    }
                  </strong>
                </div>
              </div>
            </section>

            <div className="emergency-grid">
              <button
                className="sos-button"
                type="button"
                onClick={() =>
                  setModal(
                    "sos"
                  )
                }
              >
                <span className="action-icon danger"><AppIcon name="alert" size={22} /></span>

                <strong>
                  EMERGENCY SOS
                </strong>

                <span className="action-hindi" lang="hi">आपात सहायता भेजें</span>

                <small>
                  Send your current location and important safety details
                </small>
              </button>

              <button
                className="report-button"
                type="button"
                onClick={() =>
                  setModal(
                    "report"
                  )
                }
              >
                <span className="action-icon warning"><AppIcon name="report" size={22} /></span>

                <strong>
                  REPORT A PROBLEM
                </strong>

                <small>
                  Tell us what is happening around you
                </small>
              </button>
            </div>

        {familyEmergencyMessage && (
          <section
            className="card family-emergency-message"
            style={{
              marginTop: "11px",
              padding: "14px",
              border: "1px solid #e3c9a8",
              background: "#fffaf3",
            }}
          >
            <div className="card-label">FAMILY EMERGENCY MESSAGE</div>
            <h2 style={{ margin: "3px 0 0" }}>Ready to send to your family</h2>
            <p style={{ marginTop: "6px", color: "#596873", fontSize: "14px", lineHeight: 1.55 }}>
              This is the message RAKSHA prepares after your SOS. It is shown here even when an SMS gateway is not configured.
            </p>
            <div style={{ marginTop: "9px", padding: "11px", borderRadius: "8px", background: "#ffffff", border: "1px solid #eadfd0", whiteSpace: "pre-wrap", lineHeight: 1.55, fontSize: "14px" }}>
              {familyEmergencyMessage}
            </div>
          </section>
        )}

        {latestResponseEvent && (
          <section
            className="card request-status-card"
            style={{
              marginTop: "11px",
              padding: "14px",
              border: "1px solid #d6e4ea",
              background: "#fbfdfe",
            }}
          >
            <div className="card-label">
              WHAT'S HAPPENING WITH YOUR REQUEST
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "center" }}>
              <div>
                <h2 style={{ margin: "3px 0 0" }}>
                  {latestResponseEvent.type === "SOS"
                    ? "Emergency help request"
                    : "Report status"}
                </h2>
                <p style={{ marginTop: "4px", color: "#71828f", fontSize: "14px", lineHeight: 1.5 }}>
                  {latestResponseEvent.type === "SOS"
                    ? "Your emergency request has been sent and is being followed by the response team."
                    : "Your report has been received and is available to the response team."}
                </p>
              </div>
              <strong
                className={`request-state${latestResponseEvent.priority === "CRITICAL" ? " is-critical" : ""}`}
                style={{
                  color:
                    latestResponseEvent.priority === "CRITICAL"
                      ? "#b32632"
                      : "#1769aa",
                  fontSize: "14px",
                }}
              >
                {latestResponseEvent.status || "NEW"}
              </strong>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "6px", marginTop: "9px" }}>
              {["NEW", "ACKNOWLEDGED", "ASSIGNED", "RESPONDING", "RESOLVED"].map(status => {
                const order = [
                  "NEW",
                  "ACKNOWLEDGED",
                  "CONTACTING",
                  "ASSIGNED",
                  "RESPONDING",
                  "RESOLVED",
                  "REJECTED",
                ];
                const currentIndex = order.indexOf(latestResponseEvent.status || "NEW");
                const statusIndex = order.indexOf(status);
                const reached = currentIndex >= statusIndex && currentIndex >= 0;

                return (
                  <div
                    key={status}
                    className={`request-progress-step${reached ? " is-reached" : ""}`}
                    style={{
                      padding: "7px 4px",
                      textAlign: "center",
                      borderRadius: "5px",
                      background: reached ? "#eaf6ef" : "#f2f5f7",
                      color: reached ? "#14764d" : "#87939b",
                      fontSize: "14px",
                      fontWeight: 900,
                    }}
                  >
                    {status}
                  </div>
                );
              })}
            </div>

            {pendingSyncCount > 0 && (
              <div
                style={{
                  marginTop: "8px",
                  padding: "7px",
                  borderRadius: "5px",
                  background: "#fff7e8",
                  color: "#956000",
                  fontSize: "14px",
                  fontWeight: 800,
                }}
              >
                {pendingSyncCount} event{pendingSyncCount === 1 ? "" : "s"} saved and waiting to sync.
              </div>
            )}

            <small
              style={{
                display: "block",
                marginTop: "7px",
                color: freshnessColor(
                  latestResponseEvent.updatedAt ||
                    latestResponseEvent.createdAt
                ),
                fontSize: "14px",
                fontWeight: 800,
              }}
            >
              {formatFreshness(
                latestResponseEvent.updatedAt ||
                  latestResponseEvent.createdAt
              )}
            </small>
          </section>
        )}

            <section
              className="card"
              style={{
                marginTop:
                  "11px",
                padding:
                  "14px",
              }}
            >
              <div className="card-label">
                SAFETY CHECK-IN
              </div>

              <h2>
                Let RAKSHA know you are safe
              </h2>

              <p
                style={{
                  color:
                    "#71828f",
                  fontSize: "14px",
                  lineHeight:
                    1.5,
                }}
              >
                Use this after you reach a safe place, shelter, or someone you trust.
              </p>

              <textarea
                value={
                  safeMessage
                }
                onChange={(
                  event
                ) =>
                  setSafeMessage(
                    event
                      .target
                      .value
                  )
                }
                placeholder="Optional message"
                rows={2}
                style={{
                  width:
                    "100%",
                  marginTop:
                    "8px",
                  padding:
                    "8px",
                  resize:
                    "vertical",
                  border:
                    "1px solid #d5e0e8",
                  borderRadius:
                    "6px",
                }}
              />

              <button
                type="button"
                disabled={
                  safeSending
                }
                onClick={() =>
                  void sendSafeCheckIn()
                }
                style={{
                  width:
                    "100%",
                  marginTop:
                    "7px",
                  padding:
                    "9px",
                  border:
                    "1px solid #b9ddca",
                  borderRadius:
                    "5px",
                  background:
                    "#edf9f2",
                  color:
                    "#14764d",
                  fontWeight:
                    900,
                  fontSize: "14px",
                }}
              >
                {safeSending
                  ? "SENDING..."
                  : <><AppIcon name="check" size={16} /> I AM SAFE</>}
              </button>
            </section>
          </div>
        </section>

        {message && (
          <div className="toast">
            {
              message
            }
          </div>
        )}

        <div className="raksha-bottom-grid">
          <section className="card">
            <div className="card-label">
              SHELTER BACKUP
            </div>
            <h2>
              {backupShelter
                ? backupShelter.name
                : "No backup shelter currently available"}
            </h2>
            <p>
              {backupShelter
                ? `${backupShelter.distance.toFixed(1)} km · ${Math.max(
                    0,
                    backupShelter.capacity -
                      backupShelter.occupied
                  )} spaces · ${
                    backupShelter.accessibility
                      ? "accessible"
                      : "standard"
                  }`
                : "Use the authority centre or emergency services if your preferred shelter becomes unavailable."}
            </p>
            {backupShelter && (
              <button
                type="button"
                className="quick-action"
                onClick={() =>
                  readAloud(
                    `Backup shelter ${backupShelter.name}, ${backupShelter.distance.toFixed(1)} kilometers away, with ${Math.max(
                      0,
                      backupShelter.capacity -
                        backupShelter.occupied
                    )} spaces shown available.`
                  )
                }
              >
                <AppIcon name="volume" size={14} /> READ BACKUP
              </button>
            )}
          </section>

          <section className="card">
            <div className="card-label">
              YOUR ACTIVITY
            </div>
            {timeline.length === 0 ? (
              <p>
                Your RAKSHA activity will appear here as your
                situation changes.
              </p>
            ) : (
              <div className="raksha-timeline">
                {timeline.slice(0, 6).map((item) => (
                  <div
                    key={item.id}
                    className={`timeline-item ${item.kind.toLowerCase()}`}
                  >
                    <div className="timeline-dot" />
                    <div>
                      <strong>{item.title}</strong>
                      <span>
                        {new Date(
                          item.time
                        ).toLocaleTimeString()}
                      </span>
                      <p>{item.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <section className="flow-card">
          <div>
            <span>
              01
            </span>

            <strong>
              WARNING
            </strong>

            <small>
              Official warning context
            </small>
          </div>

          <div>
            <span>
              02
            </span>

            <strong>
              CITIZEN DATA
            </strong>

            <small>
              Household + live location
            </small>
          </div>

          <div>
            <span>
              03
            </span>

            <strong>
              RAKSHA AI
            </strong>

            <small>
              Risk + action + destination
            </small>
          </div>

          <div>
            <span>
              04
            </span>

            <strong>
              COMMUNITY
            </strong>

            <small>
              Citizen ground truth
            </small>
          </div>
        </section>
      </main>

      <nav className="mobile-emergency-dock" aria-label="Primary emergency actions">
        <button type="button" className="dock-sos" onClick={() => setModal("sos")}><AppIcon name="alert" size={18} /><span>SOS</span></button>
        <button type="button" className="dock-report" onClick={() => setModal("report")}><AppIcon name="report" size={18} /><span>Report</span></button>
        <a href="#situation"><AppIcon name="map" size={18} /><span>Map</span></a>
        <a href="#assistant"><AppIcon name="message" size={18} /><span>Ask</span></a>
      </nav>

      {/* =================================================
          SOS MODAL
      ================================================= */}

      {modal ===
        "sos" && (
        <div
          className="modal-backdrop"
          onClick={() =>
            !sending &&
            setModal(
              "none"
            )
          }
        >
          <div
            className="modal-card"
            onClick={(
              event
            ) =>
              event.stopPropagation()
            }
          >
            <button
              className="modal-close"
              type="button"
              onClick={() =>
                !sending &&
                setModal(
                  "none"
                )
              }
            aria-label="Close dialog"
            >
              <AppIcon name="close" size={18} />
            </button>

            <div className="modal-symbol red">
              SOS
            </div>

            <span className="modal-kicker">
              EMERGENCY REQUEST
            </span>

            <h2>
              Send SOS?
            </h2>

            <p className="sos-hindi" lang="hi">क्या आप अपनी आपात स्थिति और स्थान सहायता केंद्र को भेजना चाहते हैं?</p>

            <p>
              RAKSHA will send your latest available location, household context, risk and connectivity information to the authority centre. If a family emergency contact is saved, the backend will also attempt a separate SMS notification.
            </p>

            <div className="modal-route family-notification-preview">
              FAMILY CONTACT: {household.emergencyContact?.trim() || "Not configured"}
            </div>

            <div className="modal-data">
              <div>
                <span>
                  PEOPLE
                </span>

                <strong>
                  {
                    totalPeople
                  }
                </strong>
              </div>

              <div>
                <span>
                  AI SAFETY LEVEL
                </span>

                <strong>
                  {
                    aiResult.score
                  }
                  /100
                </strong>
              </div>

              <div>
                <span>
                  LOCATION
                </span>

                <strong>
                  {location.lat.toFixed(
                    4
                  )}
                  ,{" "}
                  {location.lon.toFixed(
                    4
                  )}
                </strong>
              </div>

              <div>
                <span>
                  CONNECTION
                </span>

                <strong>
                  {
                    connection
                  }
                </strong>
              </div>
            </div>

            <div className="modal-route">
              DESTINATION:{" "}
              {
                aiResult.shelterName
              }{" "}
              ·{" "}
              {
                aiResult.shelterDistance.toFixed(
                  1
                )
              }{" "}
              km
            </div>

            <button
              className="modal-primary sos-submit"
              type="button"
              disabled={
                sending
              }
              onClick={() =>
                void sendSOS()
              }
            >
              {sending ? "SENDING..." : <><AppIcon name="alert" size={17} /> SEND SOS</>}
            </button>
          </div>
        </div>
      )}

      {/* =================================================
          REPORT MODAL
      ================================================= */}

      {modal === "report" && (
        <div
          className="modal-backdrop"
          onClick={() => !sending && setModal("none")}
        >
          <div
            className="modal-card report-modal-card"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-dialog-title"
          >
            <div className="report-modal-head">
              <div>
                <span className="modal-kicker">GROUND TRUTH</span>
                <h2 id="report-dialog-title">Report an incident</h2>
                <p>Your current/last-known location is attached automatically.</p>
              </div>
              <button
                className="modal-close"
                type="button"
                aria-label="Close report"
                onClick={() => !sending && setModal("none")}
              >
                <AppIcon name="close" size={18} />
              </button>
            </div>

            <div className="report-modal-body">
              <div className="report-input-row">
                <label className="report-field">
                  <span>Language</span>
                  <select
                    value={reportLanguage}
                    onChange={(event) => setReportLanguage(event.target.value)}
                    aria-label="Report language"
                  >
                    {REPORT_LANGUAGES.map((item) => (
                      <option key={item.code} value={item.code}>{item.label}</option>
                    ))}
                  </select>
                </label>

                <button
                  type="button"
                  className={`report-voice-button ${listeningForReport ? "listening" : ""}`}
                  onClick={() => listeningForReport ? stopVoiceReport() : startVoiceReport()}
                  disabled={sending}
                >
                  <AppIcon name={listeningForReport ? "stop" : "mic"} size={15} />
                  {listeningForReport ? "STOP LISTENING" : "SPEAK REPORT"}
                </button>
              </div>

              <label className="report-field report-description-field">
                <span>What is happening?</span>
                <textarea
                  value={voiceReportText}
                  onChange={(event) => setVoiceReportText(event.target.value)}
                  placeholder="Describe what you can see, e.g. water rising near the road..."
                  rows={2}
                />
              </label>

              {voiceReportError && (
                <div className="report-inline-error" role="status">{voiceReportError}</div>
              )}

              <div className="report-evidence-card">
                <div>
                  <strong>Visual evidence <small>OPTIONAL</small></strong>
                  <span>Photo/video helps the authority understand the situation faster.</span>
                </div>
                <div className="report-media-tools">
                  <button
                    type="button"
                    onClick={() => reportPhotoInputRef.current?.click()}
                    disabled={sending || reportMedia.length >= 3}
                  >
                    <AppIcon name="image" size={16} /> Photo
                  </button>
                  <button
                    type="button"
                    onClick={() => reportVideoInputRef.current?.click()}
                    disabled={sending || reportMedia.length >= 3}
                  >
                    <AppIcon name="video" size={16} /> Video
                  </button>
                </div>
                <input
                  ref={reportPhotoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  capture="environment"
                  multiple
                  hidden
                  onChange={(event) => {
                    addReportFiles(event.target.files, "image");
                    event.currentTarget.value = "";
                  }}
                />
                <input
                  ref={reportVideoInputRef}
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  capture="environment"
                  multiple
                  hidden
                  onChange={(event) => {
                    addReportFiles(event.target.files, "video");
                    event.currentTarget.value = "";
                  }}
                />
                {reportMedia.length > 0 && (
                  <div className="report-media-list">
                    {reportMedia.map((file, index) => (
                      <div className="report-media-chip" key={`${file.name}-${index}`}>
                        <span><AppIcon name={file.type.startsWith("video/") ? "video" : "image"} size={14} /> {file.name}</span>
                        <small>{Math.max(1, Math.round(file.size / 1024))} KB</small>
                        <button type="button" onClick={() => removeReportFile(index)} aria-label={`Remove ${file.name}`}><AppIcon name="close" size={14} /></button>
                      </div>
                    ))}
                  </div>
                )}
                <small className="report-limit">Up to 3 files · 4 MB each · 8 MB total</small>
              </div>

              <details className="report-category-details">
                <summary>
                  <span>Incident category</span>
                  <strong>{reportType}</strong>
                  <b>Change</b>
                </summary>
                <div className="report-choice-grid">
                  {[
                    "Flooding / rising water",
                    "Blocked road / bridge",
                    "Infrastructure damage",
                    "Fire / smoke",
                    "Landslide / debris",
                    "Earthquake damage",
                    "Cyclone / severe wind",
                    "Medical emergency",
                    "Power / utility outage",
                    "Other hazard",
                  ].map((type) => (
                    <button
                      type="button"
                      key={type}
                      className={reportType === type ? "selected" : ""}
                      onClick={() => setReportType(type)}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </details>
            </div>

            <div className="report-submit-bar">
              <span><AppIcon name="pin" size={14} /> {scenario.areaLabel}</span>
              <button
                className="modal-primary report-submit"
                type="button"
                disabled={sending}
                onClick={() => void sendReport()}
              >
                {sending ? "SENDING..." : "SUBMIT REPORT"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =====================================================
   AUTHORITY DASHBOARD
===================================================== */

function AuthorityDashboard({
  user,
  token,
  logout,
  shelters,
  setShelters,
  scenarioContext,
  onRefreshScenario,
}: {
  user: User;
  token: string;
  logout: () => void;
  shelters: Shelter[];
  setShelters: Dispatch<SetStateAction<Shelter[]>>;
  scenarioContext: ScenarioContext;
  onRefreshScenario: () => Promise<void>;
}) {
  const [
    events,
    setEvents,
  ] =
    useState<
      BackendEvent[]
    >([]);

  const [
    rescueCases,
    setRescueCases,
  ] =
    useState<
      RescueCase[]
    >([]);

  const [
    hazardReports,
    setHazardReports,
  ] =
    useState<any[]>(
      []
    );

  const [
    communityIncidents,
    setCommunityIncidents,
  ] =
    useState<any[]>(
      []
    );

  const [
    agentAdvice,
    setAgentAdvice,
  ] = useState<AgentAdvice | null>(null);

  const [
    agentLoading,
    setAgentLoading,
  ] = useState(false);

  const [
    responsePriorities,
    setResponsePriorities,
  ] =
    useState<ResponsePriorityItem[]>(
      []
    );

  const [
    humanConcentrations,
    setHumanConcentrations,
  ] =
    useState<HumanConcentration[]>(
      []
    );

  const [
    selectedRescue,
    setSelectedRescue,
  ] =
    useState<RescueCase | null>(
      null
    );

  const [
    selectedReport,
    setSelectedReport,
  ] =
    useState<any | null>(
      null
    );

  const [
    selectedIncident,
    setSelectedIncident,
  ] =
    useState<any | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    noteText,
    setNoteText,
  ] =
    useState("");

  const [
    location,
    setLocation,
  ] =
    useState<Coordinates>(
      scenarioContext.viewerLocation
    );

  const [
    authorityRoute,
    setAuthorityRoute,
  ] =
    useState<
      Coordinates[]
    >([]);

  const [authoritySort, setAuthoritySort] = useState<"NEWEST" | "OLDEST" | "NEAREST" | "PRIORITY">("NEWEST");
  const [authorityTypeFilter, setAuthorityTypeFilter] = useState("ALL");
  const [authorityDateFilter, setAuthorityDateFilter] = useState("");
  const [authoritySearch, setAuthoritySearch] = useState("");

  const scenario = scenarioContext.scenario;
  const scenarioId = scenario.id;
  const locationIsFallback = scenarioContext.locationMode !== "LIVE_BROWSER_LOCATION";

  useEffect(() => {
    setLocation(scenarioContext.viewerLocation);
    setAuthorityRoute([]);
  }, [scenario.id, scenarioContext.viewerLocation.lat, scenarioContext.viewerLocation.lon]);

  /* ===================================================
     EVENTS
  =================================================== */

  async function loadEvents() {
    try {
      const data =
        await apiRequest<{
          success: boolean;
          events: BackendEvent[];
        }>(
          `/api/authority/events?limit=200&scenarioId=${encodeURIComponent(scenarioId)}`,
          {},
          token
        );

      setEvents(
        data.events
      );
    } catch (
      error
    ) {
      console.error(
        "Response Team events failed:",
        error
      );
    }
  }

  /* ===================================================
     RESCUE CASES
  =================================================== */

  async function loadRescueCases() {
    try {
      const data =
        await apiRequest<{
          success: boolean;
          cases: RescueCase[];
        }>(
          `/api/authority/rescue-cases?scenarioId=${encodeURIComponent(scenarioId)}`,
          {},
          token
        );

      setRescueCases(
        data.cases
      );

      if (
        selectedRescue
      ) {
        const fresh =
          data.cases.find(
            (item) =>
              item.id ===
              selectedRescue.id
          );

        if (fresh) {
          setSelectedRescue(
            fresh
          );
        }
      }
    } catch (
      error
    ) {
      console.error(
        "Rescue cases failed:",
        error
      );
    }
  }

  /* ===================================================
     HAZARD REPORTS
  =================================================== */

  async function loadHazardReports() {
    try {
      const data =
        await apiRequest<{
          success: boolean;
          reports: any[];
        }>(
          `/api/authority/hazard-reports?scenarioId=${encodeURIComponent(scenarioId)}`,
          {},
          token
        );

      setHazardReports(
        data.reports
      );

      if (
        selectedReport
      ) {
        const fresh =
          data.reports.find(
            (report) =>
              report.id ===
              selectedReport.id
          );

        if (fresh) {
          setSelectedReport(
            fresh
          );
        }
      }
    } catch (
      error
    ) {
      console.error(
        "Hazard reports failed:",
        error
      );
    }
  }

  /* ===================================================
     RESPONSE PRIORITY
  =================================================== */

  async function loadResponsePriorities() {
    try {
      const data =
        await apiRequest<{
          success: boolean;
          items: ResponsePriorityItem[];
        }>(
          `/api/authority/response-priority?scenarioId=${encodeURIComponent(scenarioId)}`,
          {},
          token
        );

      setResponsePriorities(
        data.items
      );
    } catch (error) {
      console.error(
        "Response priority failed:",
        error
      );
    }
  }

  async function loadHumanConcentrations() {
    try {
      const data =
        await apiRequest<{
          success: boolean;
          clusters: HumanConcentration[];
        }>(
          `/api/authority/human-concentration?radiusKm=0.5&windowMinutes=15&scenarioId=${encodeURIComponent(scenarioId)}`,
          {},
          token
        );

      setHumanConcentrations(
        data.clusters || []
      );
    } catch (error) {
      console.error(
        "Human concentration failed:",
        error
      );
    }
  }

  /* ===================================================
     COMMUNITY INCIDENTS
  =================================================== */

  async function loadCommunityIncidents() {
    try {
      const data =
        await apiRequest<{
          success: boolean;
          incidents: any[];
        }>(
          `/api/authority/community-incidents?scenarioId=${encodeURIComponent(scenarioId)}`,
          {},
          token
        );

      setCommunityIncidents(
        data.incidents
      );

      if (
        selectedIncident
      ) {
        const fresh =
          data.incidents.find(
            incident =>
              incident.id ===
              selectedIncident.id
          );

        if (fresh) {
          setSelectedIncident(
            fresh
          );
        }
      }
    } catch (
      error
    ) {
      console.error(
        "Community incidents failed:",
        error
      );
    }
  }

  /* ===================================================
     AUTO SYNC
  =================================================== */

  useEffect(() => {
    setLoading(
      true
    );

    void Promise.all([
      loadEvents(),
      loadRescueCases(),
      loadHazardReports(),
      loadCommunityIncidents(),
      loadResponsePriorities(),
      loadHumanConcentrations(),
    ]).finally(
      () =>
        setLoading(
          false
        )
    );

    const timer =
      window.setInterval(
        () => {
          void loadEvents();
          void loadRescueCases();
          void loadHazardReports();
          void loadCommunityIncidents();
          void loadResponsePriorities();
          void loadHumanConcentrations();
        },
        5000
      );

    return () =>
      window.clearInterval(
        timer
      );
  }, [token, scenarioId]);

  /* ===================================================
     EVENT STATUS
  =================================================== */

  async function updateEventStatus(
    eventId: string,
    status:
      | "ACKNOWLEDGED"
      | "CONTACTING"
      | "ASSIGNED"
      | "RESPONDING"
      | "RESOLVED"
  ) {
    try {
      await apiRequest(
        `/api/authority/events/${eventId}/status`,
        {
          method:
            "PUT",
          body:
            JSON.stringify({
              status,
            }),
        },
        token
      );

      await Promise.all([
        loadEvents(),
        loadRescueCases(),
        loadCommunityIncidents(),
      ]);

      if (
        status ===
        "RESOLVED"
      ) {
        setSelectedRescue(
          null
        );
      }
    } catch (
      error
    ) {
      console.error(
        "Event status failed:",
        error
      );
    }
  }

  /* ===================================================
     REPORT STATUS
  =================================================== */

  async function updateReportStatus(
    reportId: string,
    status:
      | "ACKNOWLEDGED"
      | "CONTACTING"
      | "ASSIGNED"
      | "RESPONDING"
      | "RESOLVED"
      | "REJECTED"
  ) {
    try {
      await apiRequest(
        `/api/authority/hazard-reports/${reportId}/status`,
        {
          method:
            "PUT",
          body:
            JSON.stringify({
              status,
            }),
        },
        token
      );

      await Promise.all([
        loadHazardReports(),
        loadCommunityIncidents(),
        loadEvents(),
      ]);

      if (
        status ===
        "RESOLVED"
      ) {
        setSelectedReport(
          null
        );
      }
    } catch (
      error
    ) {
      console.error(
        "Hazard report status failed:",
        error
      );
    }
  }

  async function updateReportVerification(
    reportId: string,
    verificationStatus:
      | "PENDING"
      | "VERIFIED"
      | "UNVERIFIED"
  ) {
    try {
      const data =
        await apiRequest<{
          success: boolean;
          verificationStatus: string;
          event: any;
        }>(
          `/api/authority/hazard-reports/${reportId}/verification`,
          {
            method: "PUT",
            body: JSON.stringify({
              verificationStatus,
            }),
          },
          token
        );

      await loadHazardReports();

      if (
        selectedReport?.id ===
        reportId
      ) {
        const fresh =
          hazardReports.find(
            report => report.id === reportId
          );

        if (fresh) {
          setSelectedReport({
            ...fresh,
            verificationStatus:
              data.verificationStatus,
          });
        }
      }
    } catch (error) {
      console.error(
        "Report verification failed:",
        error
      );
    }
  }

  /* ===================================================
     REPORT NOTE
  =================================================== */

  async function addReportNote() {
    if (
      !selectedReport ||
      !noteText.trim()
    ) {
      return;
    }

    try {
      await apiRequest(
        `/api/authority/hazard-reports/${selectedReport.id}/note`,
        {
          method:
            "POST",
          body:
            JSON.stringify({
              note:
                noteText.trim(),
            }),
        },
        token
      );

      setNoteText("");

      await loadHazardReports();
    } catch (
      error
    ) {
      console.error(
        "Report note failed:",
        error
      );
    }
  }

  /* ===================================================
     INCIDENT STATUS
  =================================================== */

  async function updateIncidentStatus(
    incidentId: string,
    status:
      | "ACKNOWLEDGED"
      | "ASSIGNED"
      | "RESPONDING"
      | "RESOLVED"
      | "REJECTED"
  ) {
    try {
      await apiRequest(
        `/api/authority/community-incidents/${incidentId}/status`,
        {
          method:
            "PUT",
          body:
            JSON.stringify({
              status,
            }),
        },
        token
      );

      await Promise.all([
        loadCommunityIncidents(),
        loadEvents(),
        loadHazardReports(),
      ]);
    } catch (
      error
    ) {
      console.error(
        "Incident status failed:",
        error
      );
    }
  }

  /* ===================================================
     INCIDENT NOTE
  =================================================== */

  async function addIncidentNote() {
    if (
      !selectedIncident ||
      !noteText.trim()
    ) {
      return;
    }

    try {
      await apiRequest(
        `/api/authority/community-incidents/${selectedIncident.id}/note`,
        {
          method:
            "POST",
          body:
            JSON.stringify({
              note:
                noteText.trim(),
            }),
        },
        token
      );

      setNoteText("");

      await loadCommunityIncidents();
    } catch (
      error
    ) {
      console.error(
        "Incident note failed:",
        error
      );
    }
  }

  /* ===================================================
     SHELTER CAPACITY
  =================================================== */

  async function changeOccupied(
    shelter: Shelter,
    delta: number
  ) {
    const next =
      Math.max(
        0,
        Math.min(
          shelter.capacity,
          shelter.occupied +
            delta
        )
      );

    try {
      const data =
        await apiRequest<{
          success: boolean;
          resource: Shelter;
        }>(
          `/api/demo/scenario/${encodeURIComponent(scenarioId)}/shelter/${encodeURIComponent(shelter.id)}`,
          {
            method:
              "PUT",
            body:
              JSON.stringify({
                occupied:
                  next,
              }),
          },
          token
        );

      setShelters(
        (current) =>
          current.map(
            (
              item
            ) =>
              item.id ===
              shelter.id
                ? normalizeShelter({
                    ...item,
                    ...data.resource,
                  })
                : item
          )
      );
    } catch (
      error
    ) {
      console.error(
        "Shelter update failed:",
        error
      );
    }
  }

  /* ===================================================
     MAP LOCATION HELPERS
  =================================================== */

  function reportLocation(
    report: any
  ): Coordinates | null {
    return normalizeCoordinates(
      report?.location
    );
  }

  function incidentLocation(
    incident: any
  ): Coordinates | null {
    return normalizeCoordinates(
      incident?.center
    );
  }

  function rescueLocation(
    rescue: RescueCase
  ): Coordinates | null {
    if (
      !rescue.sosLocation
    ) {
      return null;
    }

    return {
      lat:
        rescue.sosLocation
          .latitude,
      lon:
        rescue.sosLocation
          .longitude,
      accuracy:
        rescue.sosLocation
          .accuracy,
      timestamp:
        rescue.sosLocation
          .capturedAt,
    };
  }

  async function routeFromPoint(
    start: Coordinates
  ) {
    const available =
      shelters
        .filter(
          (shelter) =>
            shelter.capacity >
            shelter.occupied
        )
        .map(
          (shelter) => ({
            shelter,
            distance:
              distanceKm(
                start.lat,
                start.lon,
                shelter.lat,
                shelter.lon
              ),
          })
        )
        .sort(
          (a, b) =>
            a.distance -
            b.distance
        );

    const destination =
      available[0]
        ?.shelter;

    if (
      !destination
    ) {
      setAuthorityRoute(
        []
      );
      return;
    }

    try {
      const route =
        await requestRoute(
          start,
          {
            lat:
              destination.lat,
            lon:
              destination.lon,
          }
        );

      setAuthorityRoute(
        route.route
      );
    } catch {
      setAuthorityRoute([
        start,
        {
          lat:
            destination.lat,
          lon:
            destination.lon,
        },
      ]);
    }
  }

  /* ===================================================
     OPEN / CENTER
  =================================================== */

  function centerReport(
    report: any
  ) {
    const point =
      reportLocation(
        report
      );

    if (!point) {
      return;
    }

    setLocation(
      point
    );

    void routeFromPoint(
      point
    );
  }

  function centerIncident(
    incident: any
  ) {
    const point =
      incidentLocation(
        incident
      );

    if (!point) {
      return;
    }

    setLocation(
      point
    );

    void routeFromPoint(
      point
    );
  }

  function centerRescue(
    rescue: RescueCase
  ) {
    const point =
      rescueLocation(
        rescue
      );

    if (!point) {
      return;
    }

    setLocation(
      point
    );

    void routeFromPoint(
      point
    );
  }


  async function generateAuthorityAgentAdvice() {
    if (!token || agentLoading) return;

    setAgentLoading(true);
    try {
      const data = await apiRequest<{
        success: boolean;
        advisoryOnly: true;
        advice: string;
        generatedAt: string;
      }>(
        "/api/ai/agent/advice",
        {
          method: "POST",
          body: JSON.stringify({
            role: "AUTHORITY",
            context: {
              jurisdiction: scenario.areaLabel,
              scenarioId,
              scenarioHazard: scenario.hazardType,
              openSOS: activeSOS.map((event) => ({ id: event.id, priority: event.priority, status: event.status, createdAt: event.createdAt, payload: event.payload })),
              welfareEvents: welfare.map((event) => ({ id: event.id, priority: event.priority, status: event.status, createdAt: event.createdAt, payload: event.payload })),
              hazardReports: activeReports.slice(0, 25).map((report) => ({ id: report.id, reportType: report.reportType, severity: report.severity, priority: report.priority, status: report.status, createdAt: report.createdAt, location: report.location, incident: report.incident })),
              communityIncidents: activeIncidents.slice(0, 15),
              shelters: shelters.map((shelter) => ({ name: shelter.name, capacity: shelter.capacity, occupied: shelter.occupied, available: Math.max(0, shelter.capacity - shelter.occupied), accessibility: shelter.accessibility, status: shelter.status })),
            },
          }),
        },
        token
      );

      setAgentAdvice({ advice: data.advice, generatedAt: data.generatedAt, advisoryOnly: true });
    } catch (error) {
      setAgentAdvice({
        advice: error instanceof Error ? error.message : "RAKSHA AI Agent is temporarily unavailable.",
        generatedAt: new Date().toISOString(),
        advisoryOnly: true,
      });
    } finally {
      setAgentLoading(false);
    }
  }

  /* ===================================================
     KPIs
  =================================================== */

  const activeSOS =
    events.filter(
      (event) =>
        event.type ===
          "SOS" &&
        event.status !==
          "RESOLVED" &&
        event.status !==
          "REJECTED"
    );

  const welfare =
    events.filter(
      (event) =>
        (
          event.type ===
            "WELFARE" ||
          event.type ===
            "CONNECTION_CHANGE"
        ) &&
        event.status !==
          "RESOLVED"
    );

  const activeReports =
    hazardReports.filter(
      (report) =>
        report.status !==
          "RESOLVED" &&
        report.status !==
          "REJECTED"
    );

  const activeIncidents =
    communityIncidents.filter(
      (incident) =>
        incident.status !==
        "RESOLVED"
    );

  const available =
    shelters.reduce(
      (
        total,
        shelter
      ) =>
        total +
        Math.max(
          0,
          shelter.capacity -
            shelter.occupied
        ),
      0
    );

  const reportHazards:
    HazardReport[] =
    activeReports
      .map(
        (report) => ({
          id:
            report.id,
          type:
            report.reportType ||
            "Hazard",
          location:
            report.location,
          severity:
            report.severity ||
            report.priority ||
            "NORMAL",
          createdAt:
            report.createdAt,
        })
      )
      .filter(
        (item) =>
          Boolean(
            item.location
          )
      );

  const ignoreResources =
    useCallback(
      (
        _items: Resource[]
      ) => {},
      []
    );

  function coordinatesFromRecord(record: any): Coordinates | null {
    const candidates = [
      record?.location,
      record?.payload?.location,
      record?.payload?.sosLocation,
      record?.payload?.coordinates,
      record?.incident?.location,
    ];

    for (const item of candidates) {
      const lat = Number(item?.lat ?? item?.latitude);
      const lon = Number(item?.lon ?? item?.lng ?? item?.longitude);
      if (Number.isFinite(lat) && Number.isFinite(lon)) return { lat, lon };
    }
    return null;
  }

  function authorityPriorityRank(value: unknown) {
    const normalized = String(value || "NORMAL").toUpperCase();
    if (normalized === "CRITICAL") return 4;
    if (normalized === "HIGH") return 3;
    if (normalized === "WATCH") return 2;
    return 1;
  }

  const visibleAuthorityEvents = useMemo(() => {
    const search = authoritySearch.trim().toLowerCase();
    const items = events.filter((event) => {
      const type = String(event.type || "").toUpperCase();
      const matchesType =
        authorityTypeFilter === "ALL" ||
        (authorityTypeFilter === "WELFARE" && (type === "WELFARE" || type === "CONNECTION_CHANGE")) ||
        (authorityTypeFilter === "REPORT" && type === "HAZARD_REPORT") ||
        (authorityTypeFilter === "COMMUNITY" && type === "COMMUNITY_INCIDENT") ||
        type === authorityTypeFilter;

      if (!matchesType) return false;

      if (authorityDateFilter) {
        const stamp = new Date(event.createdAt);
        if (!Number.isFinite(stamp.getTime())) return false;
        const localDate = `${stamp.getFullYear()}-${String(stamp.getMonth() + 1).padStart(2, "0")}-${String(stamp.getDate()).padStart(2, "0")}`;
        if (localDate !== authorityDateFilter) return false;
      }

      if (search) {
        const point = coordinatesFromRecord(event);
        const haystack = [
          event.id,
          event.type,
          event.citizenId,
          event.status,
          event.priority,
          event.payload?.description,
          event.payload?.reportType,
          event.payload?.incidentId,
          point ? `${point.lat.toFixed(5)}, ${point.lon.toFixed(5)}` : "",
        ].filter(Boolean).join(" ").toLowerCase();
        if (!haystack.includes(search)) return false;
      }

      return true;
    });

    return [...items].sort((a, b) => {
      if (authoritySort === "OLDEST") {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (authoritySort === "PRIORITY") {
        const diff = authorityPriorityRank(b.priority) - authorityPriorityRank(a.priority);
        if (diff) return diff;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (authoritySort === "NEAREST") {
        const pa = coordinatesFromRecord(a);
        const pb = coordinatesFromRecord(b);
        const da = pa ? distanceKm(location.lat, location.lon, pa.lat, pa.lon) : Number.POSITIVE_INFINITY;
        const db = pb ? distanceKm(location.lat, location.lon, pb.lat, pb.lon) : Number.POSITIVE_INFINITY;
        if (da !== db) return da - db;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [events, authoritySort, authorityTypeFilter, authorityDateFilter, authoritySearch, location.lat, location.lon]);

  function csvCell(value: unknown) {
    const text = String(value ?? "").replace(/\r?\n/g, " ");
    return `"${text.replace(/"/g, '""')}"`;
  }

  function downloadAuthorityActionReport() {
    const rows: Array<Record<string, unknown>> = [];

    for (const event of events) {
      const point = coordinatesFromRecord(event);
      rows.push({
        source: "EVENT",
        id: event.id,
        type: event.type,
        citizen: event.citizenId || "",
        status: event.status || "",
        priority: event.priority || "",
        createdAt: event.createdAt,
        updatedAt: event.updatedAt || "",
        latitude: point?.lat ?? "",
        longitude: point?.lon ?? "",
        details: event.payload?.description || event.payload?.reportType || event.payload?.incidentId || "",
        actionNotes: (event.notes || []).map((note) => `${note.createdAt}: ${note.text}`).join(" | "),
      });
    }

    for (const report of hazardReports) {
      const point = coordinatesFromRecord(report);
      rows.push({
        source: "HAZARD_REPORT",
        id: report.id,
        type: report.reportType || "Hazard report",
        citizen: report.citizen?.name || report.citizenId || "",
        status: report.status || "",
        priority: report.priority || report.severity || "",
        createdAt: report.createdAt || "",
        updatedAt: report.updatedAt || "",
        latitude: point?.lat ?? "",
        longitude: point?.lon ?? "",
        details: report.description || report.aiSummary || "",
        actionNotes: (report.notes || []).map((note: AuthorityNote) => `${note.createdAt}: ${note.text}`).join(" | "),
      });
    }

    for (const rescue of rescueCases) {
      const point = rescueLocation(rescue);
      rows.push({
        source: "RESCUE_CASE",
        id: rescue.id,
        type: rescue.eventType,
        citizen: rescue.citizen?.name || rescue.citizen?.id || "",
        status: rescue.status,
        priority: rescue.priority,
        createdAt: rescue.createdAt,
        updatedAt: rescue.updatedAt || "",
        latitude: point?.lat ?? "",
        longitude: point?.lon ?? "",
        details: rescue.emergencyState || "",
        actionNotes: (rescue.notes || []).map((note) => `${note.createdAt}: ${note.text}`).join(" | "),
      });
    }

    const columns = ["source", "id", "type", "citizen", "status", "priority", "createdAt", "updatedAt", "latitude", "longitude", "details", "actionNotes"];
    const csv = "\ufeff" + [
      columns.map(csvCell).join(","),
      ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(",")),
    ].join("\r\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `RAKSHA-action-report-${scenarioId}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="authority-app">
      <header className="main-header">
        <div className="brand">
          <RakshaMark small />

          <div>
            <strong>
              RAKSHA
            </strong>

            <span>
              Emergency Operations · Authority
            </span>
          </div>
        </div>

        <div className="header-right">
          <ThemeToggle compact />
          <span className="system-online">
            <span className="live-dot" aria-hidden="true" /> SYSTEM ONLINE
          </span>

          <span>
            {
              user.name
            }
          </span>

          <button type="button" className="header-logout" onClick={logout}>
            <AppIcon name="logout" size={15} /> Logout
          </button>
        </div>
      </header>

      <main className="authority-page">
        <div className="authority-title raksha-dashboard-hero" id="authority-overview">
          <div>
            <span>
              DISTRICT EMERGENCY OPERATIONS
            </span>

            <h1>
              Emergency operations
            </h1>

            <p>
              Real citizen events, ground reports,
              community intelligence and resources.
            </p>
          </div>

          <div className="jurisdiction scenario-jurisdiction">
            <span>YOUR LOCATION</span>
            <strong>{scenario.areaLabel}</strong>
            <small>{locationIsFallback ? "DEMO FALLBACK LOCATION" : "LIVE BROWSER LOCATION"}</small>
            <button type="button" className="scenario-refresh" onClick={() => void onRefreshScenario()}>
              <AppIcon name="refresh" size={14} /> Refresh area
            </button>
          </div>
        </div>

        <nav className="authority-catalogue" aria-label="Response Team workspace sections">
          <div className="authority-nav-heading">
            <span>OPERATIONS</span>
            <strong>Response workspace</strong>
          </div>
          <a href="#authority-overview"><AppIcon name="home" size={16} /> Overview</a>
          <a href="#authority-map"><AppIcon name="map" size={16} /> Situation map</a>
          <a href="#authority-sos"><AppIcon name="alert" size={16} /> SOS & welfare</a>
          <a href="#authority-reports"><AppIcon name="report" size={16} /> Citizen reports</a>
          <a href="#authority-shelters"><AppIcon name="shelter" size={16} /> Shelters</a>
          <a href="#authority-actions"><AppIcon name="activity" size={16} /> Response actions</a>
          <button type="button" className="authority-nav-download" onClick={downloadAuthorityActionReport}>
            <AppIcon name="download" size={16} /> Export action report
          </button>
          <div className="authority-nav-foot">
            <span className="live-dot" aria-hidden="true" /> Live operational workspace
          </div>
        </nav>

        <section className="authority-tools" aria-label="Authority activity filters">
          <div className="authority-tools-copy">
            <span>ACTIVITY EXPLORER</span>
            <strong>Find, sort and export operational activity</strong>
          </div>
          <label className="authority-tool-search">
            <AppIcon name="search" size={16} />
            <input
              value={authoritySearch}
              onChange={(event) => setAuthoritySearch(event.target.value)}
              placeholder="Search ID, citizen, location…"
              aria-label="Search operational activity"
            />
          </label>
          <label className="authority-tool-field">
            <AppIcon name="filter" size={15} />
            <select value={authorityTypeFilter} onChange={(event) => setAuthorityTypeFilter(event.target.value)} aria-label="Filter activity type">
              <option value="ALL">All activity</option>
              <option value="SOS">SOS</option>
              <option value="WELFARE">Welfare</option>
              <option value="HAZARD_REPORT">Hazard reports</option>
              <option value="COMMUNITY_INCIDENT">Community</option>
              <option value="SAFE_CHECKIN">Safe check-ins</option>
            </select>
          </label>
          <label className="authority-tool-field">
            <AppIcon name="calendar" size={15} />
            <input type="date" value={authorityDateFilter} onChange={(event) => setAuthorityDateFilter(event.target.value)} aria-label="Filter by activity date" />
          </label>
          <label className="authority-tool-field">
            <AppIcon name="sort" size={15} />
            <select value={authoritySort} onChange={(event) => setAuthoritySort(event.target.value as typeof authoritySort)} aria-label="Sort operational activity">
              <option value="NEWEST">Newest first</option>
              <option value="OLDEST">Oldest first</option>
              <option value="NEAREST">Nearest location</option>
              <option value="PRIORITY">Highest priority</option>
            </select>
          </label>
          <button type="button" className="authority-export" onClick={downloadAuthorityActionReport}>
            <AppIcon name="download" size={16} /> Download action report
          </button>
        </section>

        <section className="management authority-agent-card" style={{ marginBottom: "12px", border: "1px solid #c9dde7", background: "#f7fbfd" }}>
          <div className="section-head" style={{ padding: "12px" }}>
            <div>
              <span>ADVISORY INTELLIGENCE</span>
              <h2>RAKSHA AI Response Agent</h2>
              <small>Evidence-based recommendations for officer review.</small>
            </div>
            <button type="button" onClick={() => void generateAuthorityAgentAdvice()} disabled={agentLoading} className="rescue-action">
              {agentLoading ? "CHECKING..." : "GET HELP & GUIDANCE"}
            </button>
          </div>
          <div className="agent-disclaimer" style={{ margin: "0 12px 12px", padding: "8px", borderRadius: "5px", background: "#eef7fb", color: "#587181", fontSize: "14px", lineHeight: 1.5 }}>
            HUMAN-IN-CONTROL · AI cannot dispatch, assign, resolve, modify resources, or override official decisions.
          </div>
          {agentAdvice && (
            <div className="agent-response" style={{ margin: "0 12px 12px", padding: "11px", borderRadius: "6px", background: "#fff", border: "1px solid #dbe6eb", color: "#405d6d", fontSize: "14px", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
              {agentAdvice.advice}
              <small style={{ display: "block", marginTop: "7px", color: "#82929d", fontSize: "14px" }}>
                Generated {new Date(agentAdvice.generatedAt).toLocaleString()} · Human officer retains control
              </small>
            </div>
          )}
        </section>

        {/* =================================================
            KPI
        ================================================= */}

        <div className="authority-kpis">
          <div className="critical">
            <span>
              OPEN SOS
            </span>

            <strong>
              {
                activeSOS.length
              }
            </strong>

            <small>
              Real citizen requests
            </small>
          </div>

          <div>
            <span>
              WELFARE EVENTS
            </span>

            <strong>
              {
                welfare.length
              }
            </strong>

            <small>
              Connectivity + danger-zone signals
            </small>
          </div>

          <div>
            <span>
              HAZARD REPORTS
            </span>

            <strong>
              {
                activeReports.length
              }
            </strong>

            <small>
              Real citizen reports
            </small>
          </div>

          <div>
            <span>
              COMMUNITY INCIDENTS
            </span>

            <strong>
              {
                activeIncidents.length
              }
            </strong>

            <small>
              Corroborated ground truth
            </small>
          </div>
        </div>

        <section className="authority-layout" id="authority-map">
          <div className="authority-map">
            <div className="section-head">
              <div>
                <span>
                  OPERATIONAL MAP
                </span>

                <h2>
                  District situation
                </h2>
              </div>

              <b>
                LIVE
              </b>
            </div>

            <SituationMap
              shelters={shelters}
              hazards={[...scenario.demoHazards, ...reportHazards]}
              rescueCases={rescueCases}
              onRescueClick={(rescue) => {
                setSelectedRescue(rescue);
                centerRescue(rescue);
              }}
              evacuationRoute={authorityRoute.length > 1 ? authorityRoute : scenario.evacuationRoute}
              dangerGeometry={scenario.warning?.affectedArea}
              initialLocation={scenarioContext.viewerLocation}
              scenarioCenter={scenario.center}
              seedResources={scenario.resources}
              onLocation={setLocation}
              onResources={ignoreResources}
            />
          </div>

          <aside className="authority-side">
            <section className="case-card">
              <div className="section-head">
                <div>
                  <span>
                    LIVE EVENT QUEUE
                  </span>

                  <h2>
                    Response activity
                  </h2>
                </div>

                <small>
                  {loading
                    ? "SYNCING"
                    : "SYNCED"}
                </small>
              </div>

              <div className="event-list">
                {visibleAuthorityEvents.length === 0 && (
                  <div className="resource-none">
                    No activity matches the current filters.
                  </div>
                )}

                {visibleAuthorityEvents
                  .slice(0, 40)
                  .map(
                    (
                      event
                    ) => (
                      <div
                        className={`queue-case${event.type === "SOS" ? " queue-sos" : event.type === "HAZARD_REPORT" ? " queue-report" : ""}${event.priority === "CRITICAL" ? " priority-critical" : ""}`}
                        key={
                          event.id
                        }
                      >
                        <div className="queue-icon">
                          <AppIcon
                            name={event.type === "SOS" ? "alert" : event.type === "HAZARD_REPORT" ? "report" : event.type === "COMMUNITY_INCIDENT" ? "activity" : "shield"}
                            size={15}
                          />
                        </div>

                        <div>
                          <strong>
                            {
                              event.type
                            }
                          </strong>

                          <span>
                            {
                              event.citizenId ||
                              event.payload
                                ?.incidentId ||
                              "SYSTEM"
                            }
                          </span>

                          <small>
                            {new Date(event.createdAt).toLocaleString()}
                            {(() => {
                              const point = coordinatesFromRecord(event);
                              if (!point) return null;
                              const km = distanceKm(location.lat, location.lon, point.lat, point.lon);
                              return ` · ${km.toFixed(1)} km · ${point.lat.toFixed(3)}, ${point.lon.toFixed(3)}`;
                            })()}
                          </small>
                        </div>

                        <b>
                          {
                            event.priority ||
                            "NORMAL"
                          }
                        </b>
                      </div>
                    )
                  )}
              </div>

              <div className="case-location">
                <span>
                  CURRENT AUTHORITY MAP POSITION
                </span>

                <strong>
                  {location.lat.toFixed(
                    6
                  )}
                  ,{" "}
                  {location.lon.toFixed(
                    6
                  )}
                </strong>
              </div>
            </section>
          </aside>
        </section>

        {/* =================================================
            SHELTERS
        ================================================= */}

        <section className="management" id="authority-shelters">
          <div className="section-head">
            <div>
              <span>
                RESOURCE OPERATIONS
              </span>

              <h2>
                Shelter capacity
              </h2>
            </div>

            <small>
              Real backend operational values
            </small>
          </div>

          <div className="management-grid">
            {shelters.map(
              (
                shelter
              ) => {
                const remaining =
                  shelter.capacity -
                  shelter.occupied;

                const status =
                  shelter.status ||
                  "AVAILABLE";

                return (
                  <div
                    className="management-card"
                    key={
                      shelter.id
                    }
                  >
                    <div className="management-card-top">
                      <div>
                        <strong>
                          {
                            shelter.name
                          }
                        </strong>

                        <span>
                          {shelter.accessibility
                            ? "Accessible"
                            : "Standard"}
                        </span>
                      </div>

                      <b
                        className={`status ${status.toLowerCase()}`}
                      >
                        {
                          status
                        }
                      </b>
                    </div>

                    <div className="numbers">
                      <div>
                        <span>
                          CAPACITY
                        </span>

                        <strong>
                          {
                            shelter.capacity
                          }
                        </strong>
                      </div>

                      <div>
                        <span>
                          OCCUPIED
                        </span>

                        <strong>
                          {
                            shelter.occupied
                          }
                        </strong>
                      </div>

                      <div className="remaining">
                        <span>
                          REMAINING
                        </span>

                        <strong>
                          {
                            remaining
                          }
                        </strong>
                      </div>
                    </div>

                    <div className="management-actions">
                      <button
                        type="button"
                        onClick={() =>
                          void changeOccupied(
                            shelter,
                            -10
                          )
                        }
                      >
                        −10
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          void changeOccupied(
                            shelter,
                            10
                          )
                        }
                      >
                        +10 occupied
                      </button>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </section>


        {/* =================================================
            HAZARD REPORTS
        ================================================= */}

        <section className="management" id="authority-reports">
          <div className="section-head">
            <div>
              <span>
                CITIZEN GROUND TRUTH
              </span>

              <h2>
                Hazard reports
              </h2>
            </div>

            <small>
              {
                loading
                  ? "SYNCING"
                  : `${activeReports.length} ACTIVE`
              }
            </small>
          </div>

          <div
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "minmax(0, 1fr) minmax(320px, 1fr)",
              gap:
                "12px",
              padding:
                "12px",
            }}
          >
            <div
              style={{
                display:
                  "grid",
                gap:
                  "8px",
                maxHeight:
                  "500px",
                overflowY:
                  "auto",
              }}
            >
              {activeReports.length ===
                0 && (
                <div className="resource-none">
                  No active citizen hazard reports.
                </div>
              )}

              {activeReports.map(
                (
                  report
                ) => (
                  <button
                    type="button"
                    key={
                      report.id
                    }
                    className={`authority-report-row${selectedReport?.id === report.id ? " selected" : ""}`}
                    onClick={() => {
                      setSelectedReport(
                        report
                      );

                      setSelectedIncident(
                        null
                      );

                      centerReport(
                        report
                      );
                    }}
                    style={{
                      width:
                        "100%",
                      textAlign:
                        "left",
                      border:
                        "1px solid #d9e2e8",
                      borderRadius:
                        "8px",
                      padding:
                        "11px",
                      background:
                        selectedReport?.id ===
                        report.id
                          ? "#edf6fb"
                          : "#fff",
                    }}
                  >
                    <div
                      style={{
                        display:
                          "flex",
                        justifyContent:
                          "space-between",
                        gap:
                          "8px",
                      }}
                    >
                      <strong>
                        {
                          report.reportType
                        }
                      </strong>

                      <b>
                        {
                          report.priority ||
                          "NORMAL"
                        }
                      </b>
                    </div>

                    <span
                      style={{
                        display:
                          "block",
                        marginTop:
                          "4px",
                        color:
                          "#687b89",
                        fontSize:
                          "12px",
                      }}
                    >
                      {
                        report
                          .citizen
                          ?.name ||
                        "Citizen"
                      }{" "}
                      ·{" "}
                      {new Date(
                        report.createdAt
                      ).toLocaleTimeString()}
                      {" "}·{" "}
                      {formatFreshness(
                        report.updatedAt ||
                          report.createdAt
                      )}
                    </span>

                    <span
                      style={{
                        display:
                          "block",
                        marginTop:
                          "5px",
                        color:
                          "#425a6c",
                        fontSize: "14px",
                      }}
                    >
                      {
                        report.description ||
                        "No description provided."
                      }
                    </span>

                    {report.incident && (
                      <small
                        style={{
                          display:
                            "block",
                          marginTop:
                            "6px",
                          color:
                            "#14764d",
                          fontWeight:
                            800,
                        }}
                      >
                        COMMUNITY SIGNAL ·{" "}
                        {
                          report
                            .incident
                            .reportCount
                        }{" "}
                        reports · confidence{" "}
                        {
                          report
                            .incident
                            .confidence
                        }
                        %
                      </small>
                    )}
                  </button>
                )
              )}
            </div>

            <div
              className="authority-report-detail"
              style={{
                border:
                  "1px solid #d9e2e8",
                borderRadius:
                  "8px",
                background:
                  "#fbfcfd",
                padding:
                  "14px",
                minHeight:
                  "280px",
              }}
            >
              {!selectedReport ? (
                <div
                  className="authority-report-empty"
                  style={{
                    color:
                      "#718392",
                    fontSize:
                      "12px",
                    lineHeight:
                      1.6,
                  }}
                >
                  <strong
                    style={{
                      display:
                        "block",
                      color:
                        "#29445b",
                      fontSize:
                        "14px",
                      marginBottom:
                        "5px",
                    }}
                  >
                    Select a report
                  </strong>

                  Open a report to see the real citizen,
                  location, severity, community evidence and
                  response controls.
                </div>
              ) : (
                <>
                  <div className="management-card-top">
                    <div>
                      <strong>
                        {
                          selectedReport
                            .reportType
                        }
                      </strong>

                      <span>
                        Report ID:{" "}
                        {
                          selectedReport.id
                        }
                      </span>
                    </div>

                    <b
                      className={`status ${String(
                        selectedReport.status ||
                          "NEW"
                      ).toLowerCase()}`}
                    >
                      {
                        selectedReport.status
                      }
                    </b>
                  </div>

                  <div
                    className="case-grid"
                    style={{
                      marginTop:
                        "10px",
                    }}
                  >
                    <div>
                      <span>
                        CITIZEN
                      </span>

                      <strong>
                        {
                          selectedReport
                            .citizen
                            ?.name ||
                          "Not available"
                        }
                      </strong>
                    </div>

                    <div>
                      <span>
                        PHONE
                      </span>

                      <strong>
                        {
                          selectedReport
                            .citizen
                            ?.phone ||
                          "Not provided"
                        }
                      </strong>
                    </div>

                    <div>
                      <span>
                        TIME
                      </span>

                      <strong>
                        {new Date(
                          selectedReport.createdAt
                        ).toLocaleString()}
                      </strong>
                    </div>

                    <div>
                      <span>
                        SEVERITY
                      </span>

                      <strong>
                        {
                          selectedReport
                            .severity ||
                          selectedReport.priority ||
                          "NORMAL"
                        }
                      </strong>
                    </div>
                  </div>

                  <div className="case-location">
                    <span>
                      REAL REPORT LOCATION
                    </span>

                    <strong>
                      {(() => {
                        const point =
                          reportLocation(
                            selectedReport
                          );

                        return point
                          ? `${point.lat.toFixed(
                              6
                            )}, ${point.lon.toFixed(
                              6
                            )}`
                          : "Location unavailable";
                      })()}
                    </strong>

                    <small>
                      {selectedReport
                        .location
                        ?.accuracy
                        ? `GPS accuracy ±${Math.round(
                            Number(
                              selectedReport
                                .location
                                .accuracy
                            )
                          )} m`
                        : "GPS accuracy unavailable"}
                    </small>
                  </div>

                  <div
                    className="authority-report-description"
                    style={{
                      marginTop:
                        "10px",
                      padding:
                        "10px",
                      borderRadius:
                        "6px",
                      background:
                        "#fff",
                      border:
                        "1px solid #e3e9ed",
                    }}
                  >
                    <span
                      style={{
                        display:
                          "block",
                        color:
                          "#7c8d99",
                        fontSize: "14px",
                        fontWeight:
                          900,
                      }}
                    >
                      DESCRIPTION
                    </span>

                    <p
                      style={{
                        margin:
                          "6px 0 0",
                        color:
                          "#405668",
                        fontSize:
                          "12px",
                        lineHeight:
                          1.5,
                      }}
                    >
                      {
                        selectedReport.description ||
                        "No description provided."
                      }
                    </p>
                  </div>

                  {Array.isArray(selectedReport.media) && selectedReport.media.length > 0 && (
                    <div className="authority-evidence-card">
                      <div className="authority-evidence-head">
                        <span>VISUAL EVIDENCE</span>
                        <strong>{selectedReport.media.length} attachment{selectedReport.media.length === 1 ? "" : "s"}</strong>
                      </div>
                      <div className="authority-evidence-grid">
                        {selectedReport.media.map((media: ReportMedia, index: number) => {
                          const url = resolveBackendAssetUrl(media.url);
                          return media.type.startsWith("video/") ? (
                            <div className="evidence-item" key={`${media.url}-${index}`}>
                              <video src={url} controls preload="metadata" aria-label={media.name} />
                              <small><AppIcon name="video" size={13} /> {media.name}</small>
                            </div>
                          ) : (
                            <a className="evidence-item" href={url} target="_blank" rel="noreferrer" key={`${media.url}-${index}`}>
                              <img src={url} alt={`Citizen evidence: ${media.name}`} loading="lazy" />
                              <small><AppIcon name="image" size={13} /> {media.name}</small>
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {selectedReport.incident && (
                    <div
                      className="authority-report-corroboration"
                      style={{
                        marginTop:
                          "9px",
                        padding:
                          "10px",
                        borderRadius:
                          "6px",
                        border:
                          "1px solid #cce8d8",
                        background:
                          "#f4fbf7",
                      }}
                    >
                      <span
                        style={{
                          display:
                            "block",
                          color:
                            "#277050",
                          fontSize: "14px",
                          fontWeight:
                            900,
                        }}
                      >
                        COMMUNITY CORROBORATION
                      </span>

                      <strong
                        style={{
                          display:
                            "block",
                          marginTop:
                            "4px",
                          color:
                            "#25563f",
                          fontSize:
                            "13px",
                        }}
                      >
                        {
                          selectedReport
                            .incident
                            .reportCount
                        }{" "}
                        citizen reports
                      </strong>

                      <small>
                        {
                          selectedReport
                            .incident
                            .uniqueCitizenCount
                        }{" "}
                        independent citizens · confidence{" "}
                        {
                          selectedReport
                            .incident
                            .confidence
                        }
                        %
                      </small>
                    </div>
                  )}

                  <div
                    className="authority-verification-card"
                    style={{
                      marginTop: "10px",
                      padding: "10px",
                      borderRadius: "6px",
                      border: "1px solid #d8e2e8",
                      background: "#f9fbfc",
                    }}
                  >
                    <span
                      style={{
                        display: "block",
                        color: "#7c8d99",
                        fontSize: "14px",
                        fontWeight: 900,
                      }}
                    >
                      REPORT VERIFICATION
                    </span>

                    <strong
                      className={`verification-value ${String(selectedReport.verificationStatus || "PENDING").toLowerCase()}`}
                      style={{
                        display: "block",
                        marginTop: "4px",
                        color:
                          selectedReport.verificationStatus ===
                          "VERIFIED"
                            ? "#14764d"
                            : selectedReport.verificationStatus ===
                              "UNVERIFIED"
                            ? "#a33a3a"
                            : "#9a6a00",
                        fontSize: "14px",
                      }}
                    >
                      {selectedReport.verificationStatus ||
                        "PENDING"}
                    </strong>

                    <small
                      style={{
                        display: "block",
                        marginTop: "3px",
                        color: "#667985",
                        fontSize: "14px",
                      }}
                    >
                      Operational response status is separate.
                    </small>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(3, 1fr)",
                        gap: "6px",
                        marginTop: "8px",
                      }}
                    >
                      {(
                        [
                          "PENDING",
                          "VERIFIED",
                          "UNVERIFIED",
                        ] as const
                      ).map(status => (
                        <button
                          key={status}
                          type="button"
                          className="rescue-action"
                          disabled={
                            selectedReport.verificationStatus ===
                            status
                          }
                          onClick={() =>
                            void updateReportVerification(
                              selectedReport.id,
                              status
                            )
                          }
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div
                    className="authority-verification-card"
                    style={{
                      marginTop: "10px",
                      padding: "10px",
                      borderRadius: "6px",
                      border: "1px solid #d8e2e8",
                      background: "#f9fbfc",
                    }}
                  >
                    <span style={{ display: "block", color: "#7c8d99", fontSize: "14px", fontWeight: 900 }}>
                      REPORT VERIFICATION
                    </span>
                    <strong
                      className={`verification-value ${String(selectedReport.verificationStatus || "PENDING").toLowerCase()}`}
                      style={{
                        display: "block",
                        marginTop: "4px",
                        color:
                          selectedReport.verificationStatus === "VERIFIED"
                            ? "#14764d"
                            : selectedReport.verificationStatus === "UNVERIFIED"
                            ? "#a33a3a"
                            : "#9a6a00",
                        fontSize: "14px",
                      }}
                    >
                      {selectedReport.verificationStatus || "PENDING"}
                    </strong>
                    <small style={{ display: "block", marginTop: "3px", color: "#667985", fontSize: "14px" }}>
                      Verification is separate from operational response status.
                    </small>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "6px", marginTop: "8px" }}>
                      {(["PENDING", "VERIFIED", "UNVERIFIED"] as const).map(status => (
                        <button
                          key={status}
                          type="button"
                          className="rescue-action"
                          disabled={selectedReport.verificationStatus === status}
                          onClick={() =>
                            void updateReportVerification(
                              selectedReport.id,
                              status
                            )
                          }
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div
                    className="rescue-actions"
                    style={{
                      marginTop:
                        "10px",
                    }}
                  >
                    {selectedReport
                      .citizen
                      ?.phone && (
                      <a
                        href={`tel:${selectedReport.citizen.phone}`}
                        className="rescue-action call"
                      >
                        <AppIcon name="phone" size={15} /> CALL CITIZEN
                      </a>
                    )}

                    <button
                      type="button"
                      className="rescue-action"
                      onClick={() =>
                        centerReport(
                          selectedReport
                        )
                      }
                    >
                      CENTER MAP
                    </button>

                    {(() => {
                      const point =
                        reportLocation(
                          selectedReport
                        );

                      if (
                        !point
                      ) {
                        return null;
                      }

                      return (
                        <a
                          className="rescue-action"
                          href={`https://www.google.com/maps/search/?api=1&query=${point.lat},${point.lon}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          OPEN LOCATION
                        </a>
                      );
                    })()}

                    <button
                      type="button"
                      className="rescue-action"
                      onClick={() =>
                        void updateReportStatus(
                          selectedReport.id,
                          "ACKNOWLEDGED"
                        )
                      }
                    >
                      ACKNOWLEDGE
                    </button>

                    <button
                      type="button"
                      className="rescue-action"
                      onClick={() =>
                        void updateReportStatus(
                          selectedReport.id,
                          "CONTACTING"
                        )
                      }
                    >
                      CONTACTING
                    </button>

                    <button
                      type="button"
                      className="rescue-action"
                      onClick={() =>
                        void updateReportStatus(
                          selectedReport.id,
                          "ASSIGNED"
                        )
                      }
                    >
                      ASSIGN
                    </button>

                    <button
                      type="button"
                      className="rescue-action"
                      onClick={() =>
                        void updateReportStatus(
                          selectedReport.id,
                          "RESPONDING"
                        )
                      }
                    >
                      RESPONDING
                    </button>

                    <button
                      type="button"
                      className="rescue-action"
                      onClick={() =>
                        void updateReportStatus(
                          selectedReport.id,
                          "RESOLVED"
                        )
                      }
                    >
                      <AppIcon name="check" size={15} /> RESOLVED
                    </button>
                  </div>

                  <textarea
                    value={
                      noteText
                    }
                    onChange={(
                      event
                    ) =>
                      setNoteText(
                        event
                          .target
                          .value
                      )
                    }
                    placeholder="Response Team note..."
                    rows={
                      3
                    }
                    style={{
                      width:
                        "100%",
                      marginTop:
                        "10px",
                      padding:
                        "9px",
                      resize:
                        "vertical",
                      border:
                        "1px solid #d6e0e7",
                      borderRadius:
                        "6px",
                    }}
                  />

                  <button
                    className="authority-note-button"
                    type="button"
                    onClick={() =>
                      void addReportNote()
                    }
                    style={{
                      width:
                        "100%",
                      marginTop:
                        "6px",
                      padding:
                        "8px",
                      border:
                        "1px solid #d0dce4",
                      borderRadius:
                        "5px",
                      background:
                        "#fff",
                      color:
                        "#1769aa",
                      fontWeight:
                        800,
                    }}
                  >
                    ADD AUTHORITY NOTE
                  </button>

                  {selectedReport
                    .notes
                    ?.length >
                    0 && (
                    <div
                      style={{
                        marginTop:
                          "9px",
                      }}
                    >
                      <span
                        style={{
                          color:
                            "#7c8d99",
                          fontSize: "14px",
                          fontWeight:
                            900,
                        }}
                      >
                        NOTES
                      </span>

                      {selectedReport.notes.map(
                        (
                          note: AuthorityNote,
                          index: number
                        ) => (
                          <div
                            className="authority-note"
                            key={`${note.createdAt}-${index}`}
                            style={{
                              marginTop:
                                "5px",
                              padding:
                                "7px",
                              borderRadius:
                                "5px",
                              background:
                                "#f4f7f9",
                            }}
                          >
                            <strong>
                              {
                                note.byName ||
                                "Response Team"
                              }
                            </strong>

                            <div>
                              {
                                note.text
                              }
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </section>

        {/* =================================================
            COMMUNITY INCIDENTS
        ================================================= */}

        <section className="management">
          <div className="section-head">
            <div>
              <span>
                COMMUNITY INTELLIGENCE
              </span>

              <h2>
                Corroborated incidents
              </h2>
            </div>

            <small>
              Multiple citizen signals
            </small>
          </div>

          <div className="management-grid">
            {activeIncidents.length ===
              0 && (
              <div className="resource-none">
                No active community incidents.
              </div>
            )}

            {activeIncidents
              .slice(
                0,
                6
              )
              .map(
                (
                  incident
                ) => (
                  <button
                    type="button"
                    key={
                      incident.id
                    }
                    onClick={() => {
                      setSelectedIncident(
                        incident
                      );

                      setSelectedReport(
                        null
                      );

                      centerIncident(
                        incident
                      );
                    }}
                    className="management-card"
                    style={{
                      textAlign:
                        "left",
                      cursor:
                        "pointer",
                    }}
                  >
                    <div className="management-card-top">
                      <div>
                        <strong>
                          {
                            incident.type
                          }
                        </strong>

                        <span>
                          {
                            incident.evidence
                          }
                        </span>
                      </div>

                      <b
                        className={`status ${String(
                          incident.status ||
                            "NEW"
                        ).toLowerCase()}`}
                      >
                        {
                          incident.status
                        }
                      </b>
                    </div>

                    <div className="numbers">
                      <div>
                        <span>
                          REPORTS
                        </span>

                        <strong>
                          {
                            incident.reportCount
                          }
                        </strong>
                      </div>

                      <div>
                        <span>
                          CITIZENS
                        </span>

                        <strong>
                          {
                            incident.uniqueCitizenCount
                          }
                        </strong>
                      </div>

                      <div className="remaining">
                        <span>
                          MATCH CONFIDENCE
                        </span>

                        <strong>
                          {
                            incident.confidence
                          }
                          %
                        </strong>
                      </div>
                    </div>

                    <small
                      style={{
                        color: freshnessColor(
                          incident.lastReportedAt
                        ),
                      }}
                    >
                      Last report:{" "}
                      {new Date(
                        incident.lastReportedAt
                      ).toLocaleTimeString()}
                      {" "}·{" "}
                      {formatFreshness(
                        incident.lastReportedAt
                      )}
                    </small>
                  </button>
                )
              )}
          </div>

          {selectedIncident && (
            <div
              className="authority-incident-detail"
              style={{
                margin:
                  "0 12px 12px",
                padding:
                  "14px",
                border:
                  "1px solid #cde9db",
                borderRadius:
                  "8px",
                background:
                  "#f6fbf8",
              }}
            >
              <div className="management-card-top">
                <div>
                  <strong>
                    {
                      selectedIncident.type
                    }
                  </strong>

                  <span>
                    {
                      selectedIncident.evidence
                    }
                  </span>
                </div>

                <b>
                  {
                    selectedIncident.confidence
                  }
                  %
                </b>
              </div>

              <div className="case-location">
                <span>
                  COMMUNITY CENTRE
                </span>

                <strong>
                  {(() => {
                    const point =
                      incidentLocation(
                        selectedIncident
                      );

                    return point
                      ? `${point.lat.toFixed(
                          6
                        )}, ${point.lon.toFixed(
                          6
                        )}`
                      : "Location unavailable";
                  })()}
                </strong>
              </div>

              <div
                style={{
                  marginTop:
                    "10px",
                  display:
                    "grid",
                  gridTemplateColumns:
                    "repeat(5,1fr)",
                  gap:
                    "6px",
                }}
              >
                <button
                  type="button"
                  className="rescue-action"
                  onClick={() =>
                    void updateIncidentStatus(
                      selectedIncident.id,
                      "ACKNOWLEDGED"
                    )
                  }
                >
                  ACKNOWLEDGE
                </button>

                <button
                  type="button"
                  className="rescue-action"
                  onClick={() =>
                    void updateIncidentStatus(
                      selectedIncident.id,
                      "ASSIGNED"
                    )
                  }
                >
                  ASSIGN
                </button>

                <button
                  type="button"
                  className="rescue-action"
                  onClick={() =>
                    void updateIncidentStatus(
                      selectedIncident.id,
                      "RESPONDING"
                    )
                  }
                >
                  RESPONDING
                </button>

                <button
                  type="button"
                  className="rescue-action"
                  onClick={() =>
                    centerIncident(
                      selectedIncident
                    )
                  }
                >
                  CENTER MAP
                </button>

                <button
                  type="button"
                  className="rescue-action"
                  onClick={() =>
                    void updateIncidentStatus(
                      selectedIncident.id,
                      "RESOLVED"
                    )
                  }
                >
                  RESOLVE
                </button>
              </div>

              <textarea
                value={
                  noteText
                }
                onChange={(
                  event
                ) =>
                  setNoteText(
                    event
                      .target
                      .value
                  )
                }
                placeholder="Community incident note..."
                rows={
                  2
                }
                style={{
                  width:
                    "100%",
                  marginTop:
                    "9px",
                  padding:
                    "8px",
                  border:
                    "1px solid #d6e0e7",
                  borderRadius:
                    "6px",
                }}
              />

              <button
                className="authority-note-button"
                type="button"
                onClick={() =>
                  void addIncidentNote()
                }
                style={{
                  width:
                    "100%",
                  marginTop:
                    "5px",
                  padding:
                    "8px",
                  border:
                    "1px solid #cde2d5",
                  borderRadius:
                    "5px",
                  background:
                    "#fff",
                  color:
                    "#14764d",
                  fontWeight:
                    800,
                }}
              >
                ADD INCIDENT NOTE
              </button>
            </div>
          )}
        </section>

        {/* =================================================
            RESCUE CASES
        ================================================= */}

        <section className="rescue-command" id="authority-sos">
          <div className="section-head">
            <div>
              <span>
                RESCUE & WELFARE
              </span>

              <h2>
                People needing attention
              </h2>
            </div>

            <b>
              {
                rescueCases.length
              }
            </b>
          </div>

          <div className="rescue-layout">
            <div className="rescue-list">
              {rescueCases.length ===
                0 && (
                <div className="resource-none">
                  No active SOS or welfare cases.
                </div>
              )}

              {rescueCases.map(
                (
                  item
                ) => (
                  <button
                    type="button"
                    className={`rescue-row${item.eventType === "SOS" ? " is-sos" : ""} ${
                      selectedRescue?.id ===
                      item.id
                        ? "selected"
                        : ""
                    }`}
                    key={
                      item.id
                    }
                    onClick={() => {
                      setSelectedRescue(
                        item
                      );

                      setSelectedReport(
                        null
                      );

                      setSelectedIncident(
                        null
                      );

                      centerRescue(
                        item
                      );
                    }}
                  >
                    <span className="rescue-priority">
                      {item.eventType ===
                      "SOS"
                        ? "SOS"
                        : "WELFARE"}
                    </span>

                    <strong>
                      {
                        item
                          .citizen
                          ?.name
                      }
                    </strong>

                    <small>
                      {item
                        .household
                        ? (
                            Number(
                              item
                                .household
                                .adults
                            ) ||
                            0
                          ) +
                          (
                            Number(
                              item
                                .household
                                .children
                            ) ||
                            0
                          ) +
                          (
                            Number(
                              item
                                .household
                                .elderly
                            ) ||
                            0
                          )
                        : 0}{" "}
                      people ·{" "}
                      {
                        item.priority
                      }
                    </small>

                    <small
                      style={{
                        color: freshnessColor(
                          item.updatedAt ||
                            item.createdAt
                        ),
                      }}
                    >
                      {formatFreshness(
                        item.updatedAt ||
                          item.createdAt
                      )}
                    </small>
                  </button>
                )
              )}
            </div>

            <div className="rescue-detail">
              {!selectedRescue ? (
                <div className="rescue-empty">
                  Select a rescue case to see the real SOS
                  location, citizen contact, household,
                  nearest help and response controls.
                </div>
              ) : (
                <>
                  <div className="rescue-detail-header">
                    <div>
                      <span>
                        {
                          selectedRescue.eventType ===
                          "SOS"
                            ? "ASSISTANCE REQUIRED"
                            : "WELFARE REVIEW"
                        }
                      </span>

                      <h2>
                        {
                          selectedRescue
                            .citizen
                            ?.name
                        }
                      </h2>
                    </div>

                    <b>
                      {
                        selectedRescue
                          .priority
                      }
                    </b>
                  </div>

                  <div className="rescue-info-grid">
                    <div>
                      <span>
                        PHONE
                      </span>

                      <strong>
                        {
                          selectedRescue
                            .citizen
                            ?.phone ||
                          "Not provided"
                        }
                      </strong>
                    </div>

                    <div>
                      <span>
                        REQUEST
                      </span>

                      <strong>
                        {new Date(
                          selectedRescue.sosTime
                        ).toLocaleTimeString()}
                      </strong>
                    </div>

                    <div>
                      <span>
                        PEOPLE
                      </span>

                      <strong>
                        {selectedRescue
                          .household
                          ? (
                              Number(
                                selectedRescue
                                  .household
                                  .adults
                              ) || 0
                            ) +
                            (
                              Number(
                                selectedRescue
                                  .household
                                  .children
                              ) || 0
                            ) +
                            (
                              Number(
                                selectedRescue
                                  .household
                                  .elderly
                              ) || 0
                            )
                          : 0}
                      </strong>
                    </div>

                    <div>
                      <span>
                        SAFETY LEVEL
                      </span>

                      <strong>
                        {
                          selectedRescue.risk ??
                          "—"
                        }
                      </strong>
                    </div>
                  </div>

                  <div className="rescue-household">
                    <span>
                      HOUSEHOLD
                    </span>

                    <div>
                      <b>
                        Adults{" "}
                        {
                          selectedRescue
                            .household
                            ?.adults ||
                          0
                        }
                      </b>

                      <b>
                        Children{" "}
                        {
                          selectedRescue
                            .household
                            ?.children ||
                          0
                        }
                      </b>

                      <b>
                        Elderly{" "}
                        {
                          selectedRescue
                            .household
                            ?.elderly ||
                          0
                        }
                      </b>

                      <b>
                        Mobility{" "}
                        {
                          selectedRescue
                            .household
                            ?.mobilityNeeds ||
                          0
                        }
                      </b>
                    </div>
                  </div>

                  <div className="rescue-location">
                    <span>
                      SOS / LATEST LOCATION
                    </span>

                    <strong>
                      {(() => {
                        const point =
                          rescueLocation(
                            selectedRescue
                          );

                        return point
                          ? `${point.lat.toFixed(
                              6
                            )}, ${point.lon.toFixed(
                              6
                            )}`
                          : "Location unavailable";
                      })()}
                    </strong>

                    <small>
                      {selectedRescue
                        .sosLocation
                        ?.accuracy
                        ? `Accuracy ±${Math.round(
                            Number(
                              selectedRescue
                                .sosLocation
                                .accuracy
                            )
                          )} m`
                        : "GPS accuracy unavailable"}
                    </small>
                  </div>

                  <div className="nearest-help">
                    <span>
                      NEAREST HELP
                    </span>

                    {(
                      selectedRescue
                        .nearestHelp ||
                      []
                    )
                      .slice(
                        0,
                        5
                      )
                      .map(
                        (
                          resource
                        ) => (
                          <div
                            key={
                              resource.id
                            }
                          >
                            <strong>
                              {
                                resource.name
                              }
                            </strong>

                            <small>
                              {
                                resource.type
                              }{" "}
                              ·{" "}
                              {
                                resource.distance
                              }{" "}
                              km
                            </small>
                          </div>
                        )
                      )}

                    {selectedRescue
                      .nearestHelp
                      ?.length ===
                      0 && (
                      <small>
                        No nearby operational resources
                        returned.
                      </small>
                    )}
                  </div>

                  <div className="rescue-actions">
                    {selectedRescue
                      .citizen
                      ?.phone && (
                      <a
                        href={`tel:${selectedRescue.citizen.phone}`}
                        className="rescue-action call"
                      >
                        <AppIcon name="phone" size={15} /> CALL CITIZEN
                      </a>
                    )}

                    <button
                      type="button"
                      className="rescue-action"
                      onClick={() =>
                        centerRescue(
                          selectedRescue
                        )
                      }
                    >
                      CENTER MAP
                    </button>

                    {(() => {
                      const point =
                        rescueLocation(
                          selectedRescue
                        );

                      if (
                        !point
                      ) {
                        return null;
                      }

                      return (
                        <a
                          className="rescue-action"
                          href={`https://www.google.com/maps/search/?api=1&query=${point.lat},${point.lon}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          OPEN LOCATION
                        </a>
                      );
                    })()}

                    <button
                      type="button"
                      className="rescue-action"
                      onClick={() =>
                        void updateEventStatus(
                          selectedRescue.id,
                          "ACKNOWLEDGED"
                        )
                      }
                    >
                      ACKNOWLEDGE
                    </button>

                    <button
                      type="button"
                      className="rescue-action"
                      onClick={() =>
                        void updateEventStatus(
                          selectedRescue.id,
                          "CONTACTING"
                        )
                      }
                    >
                      CONTACTING
                    </button>

                    <button
                      type="button"
                      className="rescue-action"
                      onClick={() =>
                        void updateEventStatus(
                          selectedRescue.id,
                          "ASSIGNED"
                        )
                      }
                    >
                      ASSIGN
                    </button>

                    <button
                      type="button"
                      className="rescue-action"
                      onClick={() =>
                        void updateEventStatus(
                          selectedRescue.id,
                          "RESPONDING"
                        )
                      }
                    >
                      RESPONDING
                    </button>

                    <button
                      type="button"
                      className="rescue-action"
                      onClick={() =>
                        void updateEventStatus(
                          selectedRescue.id,
                          "RESOLVED"
                        )
                      }
                    >
                      <AppIcon name="check" size={15} /> RESOLVED
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        {/* =================================================
            HUMAN CONCENTRATION
        ================================================= */}
        <section className="management">
          <div className="section-head">
            <div>
              <span>LIVE POPULATION SIGNAL</span>
              <h2>Human concentration</h2>
            </div>
            <small>Last 15 minutes · active warning zone</small>
          </div>

          <div className="management-grid">
            {humanConcentrations.length === 0 ? (
              <div className="resource-none">
                No concentrated population signal detected in the active warning area.
              </div>
            ) : (
              humanConcentrations.slice(0, 6).map(cluster => (
                <div
                  key={cluster.id}
                  className="management-card"
                  style={{
                    borderLeft:
                      cluster.severity === "CRITICAL"
                        ? "5px solid #b4232d"
                        : cluster.severity === "HIGH"
                        ? "5px solid #d97706"
                        : "5px solid #6b8da3",
                  }}
                >
                  <div className="management-card-top">
                    <div>
                      <strong>
                        {cluster.citizenCount} people nearby
                      </strong>
                      <span>
                        {cluster.center.lat.toFixed(4)}, {cluster.center.lon.toFixed(4)}
                      </span>
                    </div>
                    <b>{cluster.severity}</b>
                  </div>
                  <small style={{ display: "block", marginTop: "7px", color: "var(--text-soft)", fontSize: "14px" }}>
                    Recent active locations inside the warning area.
                  </small>
                  {cluster.latestAt && (
                    <small
                      style={{
                        display: "block",
                        marginTop: "5px",
                        color: freshnessColor(cluster.latestAt),
                        fontSize: "14px",
                        fontWeight: 800,
                      }}
                    >
                      {formatFreshness(cluster.latestAt)}
                    </small>
                  )}
                </div>
              ))
            )}
          </div>

          <div
            className="authority-notice"
            style={{
              margin: "0 12px 12px",
              padding: "8px",
              borderRadius: "5px",
              background: "#fff9ef",
              color: "#815b00",
              fontSize: "14px",
              lineHeight: 1.5,
            }}
          >
            Area-level response signal only. Officers must verify the situation before dispatch or escalation.
          </div>
        </section>

        {/* =================================================
            RESPONSE PRIORITY
        ================================================= */}

        <section className="management" id="authority-actions">
          <div className="section-head">
            <div>
              <span>
                RESPONSE INTELLIGENCE
              </span>

              <h2>
                Priority areas & cases
              </h2>
            </div>

            <small>
              Ranked from current citizen signals
            </small>
          </div>

          <div className="management-grid">
            {responsePriorities.length === 0 && (
              <div className="resource-none">
                No active response priorities.
              </div>
            )}

            {responsePriorities
              .slice(0, 6)
              .map((item, index) => (
                <div
                  className="management-card"
                  key={item.id}
                  style={{
                    borderLeft:
                      item.responseLevel === "CRITICAL"
                        ? "5px solid #b4232d"
                        : item.responseLevel === "HIGH"
                        ? "5px solid #d97706"
                        : "5px solid #6b8da3",
                  }}
                >
                  <div className="management-card-top">
                    <div>
                      <strong>
                        #{index + 1} · {item.type}
                      </strong>

                      <span>
                        {item.citizenId ||
                          item.incidentId ||
                          "SYSTEM"}
                      </span>
                    </div>

                    <b>
                      {item.responseLevel}
                    </b>
                  </div>

                  <small
                    style={{
                      display: "block",
                      marginTop: "6px",
                      color: freshnessColor(
                        item.updatedAt ||
                          item.createdAt
                      ),
                      fontSize: "14px",
                      fontWeight: 800,
                    }}
                  >
                    {formatFreshness(
                      item.updatedAt ||
                        item.createdAt
                    )}
                  </small>

                  <div className="numbers">
                    <div>
                      <span>
                        SCORE
                      </span>
                      <strong>
                        {item.responseScore}
                      </strong>
                    </div>

                    <div>
                      <span>
                        STATUS
                      </span>
                      <strong>
                        {item.status}
                      </strong>
                    </div>

                    <div className="remaining">
                      <span>
                        REPORTS
                      </span>
                      <strong>
                        {item.reportCount || 0}
                      </strong>
                    </div>
                  </div>

                  <small>
                    {item.reasons.slice(0, 3).join(" · ")}
                  </small>
                </div>
              ))}
          </div>
        </section>

        {/* =================================================
            AUTHORITY MAP
        ================================================= */}

        <footer className="authority-footer">
          RAKSHA prototype · Real citizen reports, rescue
          cases, community intelligence and resources
          synchronized with the response service.
        </footer>
      </main>
    </div>
  );
}

/* =====================================================
   ROOT APP
===================================================== */

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [shelters, setShelters] = useState<Shelter[]>(INITIAL_SHELTERS);
  const [scenarioContext, setScenarioContext] = useState<ScenarioContext | null>(null);
  const [scenarioLoading, setScenarioLoading] = useState(false);
  const [scenarioError, setScenarioError] = useState("");

  useEffect(() => {
    const savedUser = appStorage.getItem("raksha_user");
    const savedToken = appStorage.getItem("raksha_token");
    if (savedUser && savedToken) {
      try {
        setUser(JSON.parse(savedUser));
        setToken(savedToken);
      } catch {
        appStorage.removeItem("raksha_user");
        appStorage.removeItem("raksha_token");
      }
    }
  }, []);

  const normalizeScenarioContext = useCallback((context: ScenarioContext): ScenarioContext => {
    const resources = (context.scenario.resources || []).map((resource) => ({
      ...resource,
      distance: Number.isFinite(Number(resource.distance)) ? Number(resource.distance) : 0,
    })) as Resource[];
    const shelters = resources
      .filter((resource): resource is Shelter => resource.type === "shelter")
      .map((shelter) => normalizeShelter({
        ...shelter,
        source: "DEMO",
        capacity: Number(shelter.capacity || 0),
        occupied: Number(shelter.occupied || 0),
        accessibility: Boolean(shelter.accessibility),
        status: shelter.status || "AVAILABLE",
      } as Shelter));

    return {
      ...context,
      scenario: {
        ...context.scenario,
        center: normalizeCoordinates(context.scenario.center) || {
          lat: FALLBACK_DEMO_CENTER[0],
          lon: FALLBACK_DEMO_CENTER[1],
        },
        resources,
        shelters,
        demoHazards: Array.isArray(context.scenario.demoHazards) ? context.scenario.demoHazards : [],
        evacuationRoute: Array.isArray(context.scenario.evacuationRoute) ? context.scenario.evacuationRoute : [],
      },
      viewerLocation: normalizeCoordinates(context.viewerLocation) || {
        lat: FALLBACK_DEMO_CENTER[0],
        lon: FALLBACK_DEMO_CENTER[1],
      },
    };
  }, []);

  const resolveScenario = useCallback(async (forceFreshLocation = false, bypassCache = false) => {
    if (!token) return;

    setScenarioLoading(true);
    setScenarioError("");

    try {
      if (!forceFreshLocation && !bypassCache) {
        try {
          const cached = window.sessionStorage.getItem(SCENARIO_SESSION_KEY);
          if (cached) {
            const parsed = normalizeScenarioContext(JSON.parse(cached));
            setScenarioContext(parsed);
            setShelters(parsed.scenario.shelters);
            setScenarioLoading(false);
            return;
          }
        } catch {
          window.sessionStorage.removeItem(SCENARIO_SESSION_KEY);
        }
      }

      let browserLocation: Coordinates | null = null;
      if (navigator.geolocation) {
        browserLocation = await new Promise<Coordinates | null>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (position) => resolve({
              lat: position.coords.latitude,
              lon: position.coords.longitude,
              accuracy: position.coords.accuracy,
              timestamp: new Date().toISOString(),
            }),
            () => resolve(null),
            {
              enableHighAccuracy: true,
              maximumAge: forceFreshLocation ? 0 : 120000,
              timeout: 12000,
            }
          );
        });
      }

      const data = await apiRequest<ScenarioContext & { success: boolean }>(
        "/api/demo/scenario/resolve",
        {
          method: "POST",
          body: JSON.stringify({ location: browserLocation }),
        },
        token
      );

      const normalized = normalizeScenarioContext(data);
      setScenarioContext(normalized);
      setShelters(normalized.scenario.shelters);
      try {
        window.sessionStorage.setItem(SCENARIO_SESSION_KEY, JSON.stringify(normalized));
      } catch {
        // Session caching is best-effort.
      }
    } catch (error) {
      setScenarioError(error instanceof Error ? error.message : "Unable to prepare the demo operating area.");
    } finally {
      setScenarioLoading(false);
    }
  }, [normalizeScenarioContext, token]);

  useEffect(() => {
    if (!token) {
      setScenarioContext(null);
      return;
    }
    void resolveScenario(false);
  }, [token, resolveScenario]);

  useEffect(() => {
    if (!token || !scenarioContext) return;
    const timer = window.setInterval(() => {
      void resolveScenario(false, true);
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [token, scenarioContext?.scenario.id, resolveScenario]);

  // Keep shelter occupancy synchronized between the Authority Team portal
  // and every Citizen portal/session. Authority updates are persisted on the
  // server, so citizens should read the same server-side values instead of
  // relying on their cached scenario snapshot.
  const activeScenarioId = scenarioContext?.scenario.id;

  useEffect(() => {
    if (!token || !activeScenarioId) return;

    let cancelled = false;

    const syncShelters = async () => {
      try {
        const data = await apiRequest<{ success: boolean; resources: Resource[] }>(
          `/api/resources/sync?scenarioId=${encodeURIComponent(activeScenarioId)}`,
          {},
          token
        );

        if (cancelled) return;

        const realShelters = data.resources
          .filter((resource) => resource.type === "shelter")
          .map((resource) =>
            normalizeShelter({ ...resource, distance: 0 } as Shelter)
          );

        if (realShelters.length === 0) return;

        setShelters(realShelters);

        // Also refresh the scenario snapshot so CitizenDashboard's resource
        // state and shelter-dependent logic use the same latest values.
        setScenarioContext((current) => {
          if (!current || current.scenario.id !== activeScenarioId) return current;

          const shelterById = new Map(
            realShelters.map((shelter) => [shelter.id, shelter])
          );

          const resources = current.scenario.resources.map((resource) =>
            resource.type === "shelter" && shelterById.has(resource.id)
              ? { ...resource, ...shelterById.get(resource.id) }
              : resource
          );

          return {
            ...current,
            scenario: {
              ...current.scenario,
              resources,
              shelters: realShelters,
              updatedAt: new Date().toISOString(),
            },
          };
        });
      } catch (error) {
        console.error("Resource sync failed:", error);
      }
    };

    void syncShelters();

    // Poll frequently enough that a Citizen portal reflects an Authority
    // occupancy change without requiring a page refresh.
    const timer = window.setInterval(syncShelters, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [token, activeScenarioId, normalizeScenarioContext]);

  function login(nextUser: User, nextToken: string) {
    setUser(nextUser);
    setToken(nextToken);
    appStorage.setItem("raksha_user", JSON.stringify(nextUser));
    appStorage.setItem("raksha_token", nextToken);
  }

  function logout() {
    if (token) {
      void apiRequest("/api/auth/logout", { method: "POST" }, token).catch(() => {});
    }
    setUser(null);
    setToken(null);
    setScenarioContext(null);
    appStorage.removeItem("raksha_user");
    appStorage.removeItem("raksha_token");
  }

  if (!user || !token) {
    return <Login onLogin={login} />;
  }

  if (!scenarioContext) {
    return (
      <div className="scenario-loading-screen">
        <div className="scenario-loading-card">
          <RakshaMark />
          <span>RAKSHA LOCATION-AWARE DEMO</span>
          <h1>{scenarioLoading ? "Preparing your operating area…" : "Operating area unavailable"}</h1>
          <p>
            RAKSHA asks the browser for location once per session. If permission is unavailable, it uses a clearly marked generic demo fallback.
          </p>
          {scenarioError && <div className="scenario-error">{scenarioError}</div>}
          {!scenarioLoading && (
            <button type="button" onClick={() => void resolveScenario(true)}>TRY LOCATION AGAIN</button>
          )}
          <button type="button" className="scenario-logout" onClick={logout}>Logout</button>
        </div>
      </div>
    );
  }

  if (isAuthority(user)) {
    return (
      <AuthorityDashboard
        user={user}
        token={token}
        logout={logout}
        shelters={shelters}
        setShelters={setShelters}
        scenarioContext={scenarioContext}
        onRefreshScenario={() => resolveScenario(true)}
      />
    );
  }

  return (
    <CitizenDashboard
      user={user}
      token={token}
      logout={logout}
      shelters={shelters}
      scenarioContext={scenarioContext}
      onRefreshScenario={() => resolveScenario(true)}
    />
  );
}

export { App, CitizenDashboard, AuthorityDashboard, Login, INITIAL_SHELTERS, DEFAULT_HOUSEHOLD };
export type { Shelter, User, Household };
