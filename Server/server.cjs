const express = require("express");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

function loadLocalEnv() {
  const envFile = path.join(__dirname, "..", ".env");
  if (!fs.existsSync(envFile)) return;

  for (const rawLine of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator <= 0) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

loadLocalEnv();

const app = express();

const PORT = Number(process.env.PORT || 4000);
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:5173";

/* =====================================================
   CORS
===================================================== */

app.use((req, res, next) => {
  res.header(
    "Access-Control-Allow-Origin",
    FRONTEND_ORIGIN
  );

  res.header(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,DELETE,OPTIONS"
  );

  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

app.use(
  express.json({
    limit: "15mb",
  })
);

/* =====================================================
   DATA FILES
===================================================== */

const DATA_DIR = path.join(
  __dirname,
  "Data"
);

const USERS_FILE = path.join(
  DATA_DIR,
  "users.json"
);

const EVENTS_FILE = path.join(
  DATA_DIR,
  "events.json"
);

const HOUSEHOLDS_FILE = path.join(
  DATA_DIR,
  "households.json"
);

const RESOURCES_FILE = path.join(
  DATA_DIR,
  "resources.json"
);

const LOCATIONS_FILE = path.join(
  DATA_DIR,
  "citizen_locations.json"
);

const INCIDENTS_FILE = path.join(
  DATA_DIR,
  "community_incidents.json"
);

const SESSIONS_FILE = path.join(
  DATA_DIR,
  "sessions.json"
);

const WARNINGS_FILE = path.join(
  DATA_DIR,
  "active_warnings.json"
);

const DEMO_SCENARIOS_FILE = path.join(
  DATA_DIR,
  "demo_scenarios.json"
);

const REPORT_MEDIA_DIR = path.join(
  DATA_DIR,
  "report-media"
);

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, {
    recursive: true,
  });
}

if (!fs.existsSync(REPORT_MEDIA_DIR)) {
  fs.mkdirSync(REPORT_MEDIA_DIR, {
    recursive: true,
  });
}

app.use(
  "/media/reports",
  express.static(REPORT_MEDIA_DIR, {
    maxAge: "1h",
  })
);

/* =====================================================
   HELPERS
===================================================== */

function hashPassword(password) {
  return crypto
    .createHash("sha256")
    .update(String(password))
    .digest("hex");
}

function createId(prefix) {
  return `${prefix}-${Date.now()}-${crypto
    .randomBytes(3)
    .toString("hex")}`;
}

function readJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) {
      fs.writeFileSync(
        file,
        JSON.stringify(
          fallback,
          null,
          2
        )
      );

      return fallback;
    }

    const text =
      fs.readFileSync(
        file,
        "utf8"
      );

    if (!text.trim()) {
      fs.writeFileSync(
        file,
        JSON.stringify(
          fallback,
          null,
          2
        )
      );

      return fallback;
    }

    return JSON.parse(text);
  } catch (error) {
    console.error(
      `Failed reading ${file}:`,
      error.message
    );

    return fallback;
  }
}

function writeJson(file, data) {
  fs.writeFileSync(
    file,
    JSON.stringify(
      data,
      null,
      2
    )
  );
}

/* =====================================================
   DEFAULT DATA
===================================================== */

const fallbackDemoCenter = {
  lat: Number.isFinite(Number(process.env.DEMO_FALLBACK_LAT))
    ? Number(process.env.DEMO_FALLBACK_LAT)
    : 22.9734,
  lon: Number.isFinite(Number(process.env.DEMO_FALLBACK_LON))
    ? Number(process.env.DEMO_FALLBACK_LON)
    : 78.6569,
};

const defaultUsers = [
  {
    id: "AUTH-DIST-001",
    name: "District Emergency Officer",
    email: "authority@raksha.demo",
    phone: "",
    passwordHash: hashPassword("Raksha@123"),
    role: "DISTRICT_OFFICER",
    jurisdiction: "Location-Aware Demo Area",
    accountType: "AUTHORITY",
    approved: true,
  },
];

function basicFallbackResources() {
  const { lat, lon } = fallbackDemoCenter;
  return [
    { id: "fallback-shelter-a", name: "Demo Welfare Centre A", type: "shelter", lat: lat + 0.012, lon: lon + 0.008, capacity: 500, occupied: 170, accessibility: true, status: "AVAILABLE", source: "DEMO" },
    { id: "fallback-shelter-b", name: "Demo Community Shelter B", type: "shelter", lat: lat - 0.008, lon: lon + 0.014, capacity: 850, occupied: 410, accessibility: true, status: "AVAILABLE", source: "DEMO" },
    { id: "fallback-shelter-c", name: "Demo Relief Centre C", type: "shelter", lat: lat + 0.006, lon: lon - 0.015, capacity: 650, occupied: 290, accessibility: false, status: "AVAILABLE", source: "DEMO" },
  ];
}

const defaultResources = basicFallbackResources();

/* =====================================================
   DATA ACCESS
===================================================== */

function getUsers() {
  return readJson(
    USERS_FILE,
    defaultUsers
  );
}

function saveUsers(users) {
  writeJson(
    USERS_FILE,
    users
  );
}

function getEvents() {
  return readJson(
    EVENTS_FILE,
    []
  );
}

function saveEvents(events) {
  writeJson(
    EVENTS_FILE,
    events
  );
}

function getHouseholds() {
  return readJson(
    HOUSEHOLDS_FILE,
    []
  );
}

function saveHouseholds(
  households
) {
  writeJson(
    HOUSEHOLDS_FILE,
    households
  );
}

function getResources() {
  return readJson(
    RESOURCES_FILE,
    defaultResources
  );
}

function saveResources(
  resources
) {
  writeJson(
    RESOURCES_FILE,
    resources
  );
}

function getLocations() {
  return readJson(
    LOCATIONS_FILE,
    []
  );
}

function saveLocations(
  locations
) {
  writeJson(
    LOCATIONS_FILE,
    locations
  );
}

function getIncidents() {
  return readJson(
    INCIDENTS_FILE,
    []
  );
}

function saveIncidents(
  incidents
) {
  writeJson(
    INCIDENTS_FILE,
    incidents
  );
}

function getWarnings() {
  return readJson(
    WARNINGS_FILE,
    []
  );
}

function saveWarnings(warnings) {
  writeJson(
    WARNINGS_FILE,
    warnings
  );
}

function getDemoScenarios() {
  return readJson(DEMO_SCENARIOS_FILE, {});
}

function saveDemoScenarios(scenarios) {
  writeJson(DEMO_SCENARIOS_FILE, scenarios);
}

/* Ensure files exist */

getUsers();
getEvents();
getHouseholds();
getResources();
getLocations();
getIncidents();
getWarnings();
getDemoScenarios();

/* =====================================================
   SESSION
   Sessions persist across backend restarts so a browser
   token does not become invalid just because node restarted.
===================================================== */

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const sessions = new Map();

function loadSessions() {
  const saved = readJson(SESSIONS_FILE, []);
  if (!Array.isArray(saved)) {
    return;
  }

  const now = Date.now();
  for (const item of saved) {
    if (!item?.token || !item?.userId) {
      continue;
    }

    const createdAt = Number(item.createdAt);
    if (!Number.isFinite(createdAt) || now - createdAt > SESSION_TTL_MS) {
      continue;
    }

    sessions.set(String(item.token), {
      userId: String(item.userId),
      createdAt,
    });
  }
}

function saveSessions() {
  const now = Date.now();
  const active = [];

  for (const [token, session] of sessions.entries()) {
    if (!session?.userId) {
      continue;
    }

    if (now - Number(session.createdAt) > SESSION_TTL_MS) {
      sessions.delete(token);
      continue;
    }

    active.push({
      token,
      userId: session.userId,
      createdAt: session.createdAt,
    });
  }

  writeJson(SESSIONS_FILE, active);
}

function clearExpiredSessions() {
  const now = Date.now();
  let changed = false;

  for (const [token, session] of sessions.entries()) {
    if (now - Number(session?.createdAt || 0) > SESSION_TTL_MS) {
      sessions.delete(token);
      changed = true;
    }
  }

  if (changed) {
    saveSessions();
  }
}

loadSessions();

function requireAuth(
  req,
  res,
  next
) {
  clearExpiredSessions();
  const header =
    req.headers.authorization;

  if (
    !header ||
    !header.startsWith(
      "Bearer "
    )
  ) {
    return res.status(401).json({
      success: false,
      message:
        "Authentication required.",
    });
  }

  const token =
    header.slice(7);

  const session =
    sessions.get(token);

  if (!session) {
    return res.status(401).json({
      success: false,
      message:
        "Invalid or expired session.",
    });
  }

  const user =
    getUsers().find(
      (item) =>
        item.id ===
        session.userId
    );

  if (!user) {
    return res.status(401).json({
      success: false,
      message:
        "User account not found.",
    });
  }

  req.user = user;
  req.token = token;

  next();
}

function requireAuthority(
  req,
  res,
  next
) {
  const account =
    String(
      req.user.accountType ||
        ""
    ).toUpperCase();

  const role =
    String(
      req.user.role ||
        ""
    ).toUpperCase();

  if (
    account !==
      "AUTHORITY" &&
    !role.includes(
      "OFFICER"
    ) &&
    !role.includes(
      "AUTHORITY"
    ) &&
    !role.includes(
      "ADMIN"
    )
  ) {
    return res.status(403).json({
      success: false,
      message:
        "Authority access denied.",
    });
  }

  next();
}

/* =====================================================
   GENERAL HELPERS
===================================================== */

function normalizeLocation(
  input
) {
  if (!input) {
    return null;
  }

  const lat =
    Number(
      input.lat ??
        input.latitude
    );

  const lon =
    Number(
      input.lon ??
        input.longitude
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
          input.accuracy
        )
      )
        ? Number(
            input.accuracy
          )
        : null,
    timestamp:
      input.timestamp ||
      input.capturedAt ||
      new Date().toISOString(),
  };
}

function distanceKm(
  lat1,
  lon1,
  lat2,
  lon2
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
    Math.sin(dLat / 2) ** 2 +
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
      Math.sqrt(1 - a)
    )
  );
}

function getHousehold(
  citizenId
) {
  return (
    getHouseholds().find(
      (item) =>
        item.citizenId ===
        citizenId
    ) || null
  );
}

function getLatestLocation(
  citizenId
) {
  return (
    getLocations().find(
      (item) =>
        item.citizenId ===
        citizenId
    ) || null
  );
}

function householdTotal(
  household
) {
  if (!household) {
    return 0;
  }

  return (
    Number(
      household.adults
    ) || 0
  ) +
    (
      Number(
        household.children
      ) || 0
    ) +
    (
      Number(
        household.elderly
      ) || 0
    );
}

/* =====================================================
   RESILIENCE
===================================================== */

function calculateResilience(
  household,
  connectivity,
  hasEmergencyContact
) {
  let score = 55;

  if (
    household?.children >
    0
  ) {
    score += 5;
  }

  if (
    household?.elderly >
    0
  ) {
    score += 5;
  }

  if (
    household?.mobilityNeeds >
    0
  ) {
    score += 3;
  }

  if (hasEmergencyContact) {
    score += 8;
  }

  if (
    connectivity ===
    "ONLINE"
  ) {
    score += 12;
  } else if (
    connectivity ===
    "DEGRADED"
  ) {
    score += 5;
  }

  score = Math.min(
    100,
    score
  );

  return {
    score,
    level:
      score >= 80
        ? "STRONG"
        : score >= 65
        ? "MODERATE"
        : "NEEDS PREPARATION",
  };
}

/* =====================================================
   EVENT HELPER
===================================================== */

function createEvent({
  type,
  citizenId = null,
  payload = {},
  priority = "NORMAL",
}) {
  const events =
    getEvents();

  const now =
    new Date().toISOString();

  const event = {
    id: createId("EVT"),
    type,
    citizenId,
    priority,
    status: "NEW",
    createdAt: now,
    updatedAt: now,
    assignedTo: null,
    notes: [],
    payload,
  };

  events.unshift(event);

  saveEvents(events);

  return event;
}

function updateEvent(
  eventId,
  changes
) {
  const events =
    getEvents();

  const index =
    events.findIndex(
      (event) =>
        event.id ===
        eventId
    );

  if (index === -1) {
    return null;
  }

  events[index] = {
    ...events[index],
    ...changes,
    updatedAt:
      new Date().toISOString(),
  };

  saveEvents(events);

  return events[index];
}

/* =====================================================
   COMMUNITY INCIDENT ENGINE
===================================================== */

const COMMUNITY_RADIUS_KM =
  0.75;

const COMMUNITY_WINDOW_MS =
  30 * 60 * 1000;

function normalizedType(
  value
) {
  return String(
    value ||
      ""
  )
    .trim()
    .toLowerCase();
}

function confidenceForIncident(
  reportCount,
  uniqueCitizenCount,
  ageMinutes
) {
  let score = 25;

  score += Math.min(
    35,
    reportCount * 8
  );

  score += Math.min(
    25,
    uniqueCitizenCount * 7
  );

  if (
    ageMinutes <= 5
  ) {
    score += 15;
  } else if (
    ageMinutes <= 15
  ) {
    score += 8;
  }

  return Math.min(
    99,
    Math.round(score)
  );
}

function priorityForIncident(
  reportCount,
  confidence,
  severity
) {
  if (
    severity ===
      "CRITICAL" ||
    (
      confidence >= 85 &&
      reportCount >= 3
    )
  ) {
    return "CRITICAL";
  }

  if (
    severity === "HIGH" ||
    confidence >= 65
  ) {
    return "HIGH";
  }

  return "NORMAL";
}

function rebuildIncident(
  incidentId
) {
  const incidents =
    getIncidents();

  const index =
    incidents.findIndex(
      (item) =>
        item.id ===
        incidentId
    );

  if (index === -1) {
    return null;
  }

  const incident =
    incidents[index];

  const citizenIds =
    Array.from(
      new Set(
        incident.reports
          .map(
            (report) =>
              report.citizenId
          )
          .filter(Boolean)
      )
    );

  let latTotal = 0;
  let lonTotal = 0;
  let count = 0;

  for (
    const report of
      incident.reports
  ) {
    const point =
      normalizeLocation(
        report.location
      );

    if (!point) {
      continue;
    }

    latTotal +=
      point.lat;
    lonTotal +=
      point.lon;
    count += 1;
  }

  if (count > 0) {
    incident.center = {
      lat:
        latTotal /
        count,
      lon:
        lonTotal /
        count,
    };
  }

  const times =
    incident.reports
      .map(
        (report) =>
          new Date(
            report.createdAt
          ).getTime()
      )
      .filter(
        Number.isFinite
      )
      .sort(
        (a, b) =>
          b - a
      );

  const latest =
    times[0] ||
    Date.now();

  const ageMinutes =
    (
      Date.now() -
      latest
    ) /
    60000;

  const critical =
    incident.reports.some(
      (report) =>
        report.severity ===
        "CRITICAL"
    );

  const high =
    incident.reports.some(
      (report) =>
        report.severity ===
        "HIGH"
    );

  const highestSeverity =
    critical
      ? "CRITICAL"
      : high
      ? "HIGH"
      : "NORMAL";

  incident.reportCount =
    incident.reports.length;

  incident.uniqueCitizenCount =
    citizenIds.length;

  incident.confidence =
    confidenceForIncident(
      incident.reportCount,
      incident.uniqueCitizenCount,
      ageMinutes
    );

  incident.priority =
    priorityForIncident(
      incident.reportCount,
      incident.confidence,
      highestSeverity
    );

  incident.lastReportedAt =
    new Date(
      latest
    ).toISOString();

  incident.updatedAt =
    new Date().toISOString();

  incident.evidence =
    `${incident.reportCount} citizen report${
      incident.reportCount ===
      1
        ? ""
        : "s"
    } from ${
      incident.uniqueCitizenCount
    } citizen${
      incident.uniqueCitizenCount ===
      1
        ? ""
        : "s"
    }`;

  incidents[index] =
    incident;

  saveIncidents(
    incidents
  );

  return incident;
}

function findMatchingIncident(
  type,
  location,
  scenarioId = ""
) {
  const incidents =
    getIncidents();

  const point =
    normalizeLocation(
      location
    );

  if (!point) {
    return null;
  }

  const now =
    Date.now();

  return (
    incidents.find(
      (incident) => {
        if (scenarioId && !incidentMatchesScenario(incident, scenarioId)) {
          return false;
        }

        if (
          incident.status ===
          "RESOLVED"
        ) {
          return false;
        }

        if (
          normalizedType(
            incident.type
          ) !==
          normalizedType(
            type
          )
        ) {
          return false;
        }

        if (
          !incident.center
        ) {
          return false;
        }

        const updated =
          new Date(
            incident.updatedAt ||
              incident.createdAt
          ).getTime();

        if (
          now -
            updated >
          COMMUNITY_WINDOW_MS
        ) {
          return false;
        }

        return (
          distanceKm(
            point.lat,
            point.lon,
            incident.center.lat,
            incident.center.lon
          ) <=
          COMMUNITY_RADIUS_KM
        );
      }
    ) || null
  );
}

function processCommunityReport({
  eventId,
  citizenId,
  type,
  severity,
  description,
  location,
  createdAt,
  scenarioId = "",
}) {
  const point =
    normalizeLocation(
      location
    );

  if (!point) {
    return null;
  }

  let incident =
    findMatchingIncident(
      type,
      point,
      scenarioId
    );

  if (!incident) {
    incident = {
      id: createId("INC"),
      type:
        type ||
        "Hazard",
      status: "NEW",
      priority: "NORMAL",
      confidence: 25,
      reportCount: 0,
      uniqueCitizenCount: 0,
      center: point,
      createdAt:
        createdAt ||
        new Date().toISOString(),
      updatedAt:
        new Date().toISOString(),
      lastReportedAt:
        createdAt ||
        new Date().toISOString(),
      evidence:
        "1 citizen report",
      reports: [],
      notes: [],
      assignedTo: null,
      scenarioId,
    };

    const incidents =
      getIncidents();

    incidents.unshift(
      incident
    );

    saveIncidents(
      incidents
    );
  }

  /*
   * Prevent accidental duplicate submission
   * of the exact same report event.
   */
  const duplicate =
    incident.reports.some(
      (report) =>
        report.eventId ===
        eventId
    );

  if (!duplicate) {
    incident.reports.push({
      eventId,
      citizenId,
      type:
        type ||
        "Hazard",
      severity:
        severity ||
        "NORMAL",
      description:
        description ||
        "",
      location:
        point,
      createdAt:
        createdAt ||
        new Date().toISOString(),
      scenarioId,
    });
  }

  const updated =
    rebuildIncident(
      incident.id
    );

  /*
   * Keep one authority-visible event per
   * community incident.
   */
  const events =
    getEvents();

  let authorityEvent =
    events.find(
      (event) =>
        event.type ===
          "COMMUNITY_INCIDENT" &&
        event.payload
          ?.incidentId ===
          incident.id &&
        event.status !==
          "RESOLVED"
    );

  const payload = {
    incidentId:
      updated.id,
    hazardType:
      updated.type,
    center:
      updated.center,
    reportCount:
      updated.reportCount,
    uniqueCitizenCount:
      updated.uniqueCitizenCount,
    confidence:
      updated.confidence,
    evidence:
      updated.evidence,
    lastReportedAt:
      updated.lastReportedAt,
    scenarioId,
  };

  if (authorityEvent) {
    updateEvent(
      authorityEvent.id,
      {
        priority:
          updated.priority,
        payload,
      }
    );
  } else {
    createEvent({
      type:
        "COMMUNITY_INCIDENT",
      citizenId: null,
      priority:
        updated.priority,
      payload,
    });
  }

  return updated;
}

/* =====================================================
   WARNING / DANGER ZONE HELPERS
===================================================== */

function warningIsActive(warning) {
  if (!warning) return false;

  const status =
    String(
      warning.status || "ACTIVE"
    ).toUpperCase();

  if (
    status === "EXPIRED" ||
    status === "CANCELLED"
  ) {
    return false;
  }

  const expiresAt =
    warning.expiresAt ||
    warning.validUntil ||
    null;

  if (expiresAt) {
    const timestamp =
      new Date(expiresAt).getTime();

    if (
      Number.isFinite(timestamp) &&
      timestamp <= Date.now()
    ) {
      return false;
    }
  }

  return true;
}

function normalizeWarning(warning) {
  const expiresAt =
    warning.expiresAt ||
    warning.validUntil ||
    null;

  let sourceStatus =
    warning.sourceStatus;

  if (!sourceStatus) {
    sourceStatus =
      String(warning.source || "")
        .toUpperCase()
        .includes("SACHET") ||
      String(warning.source || "")
        .toUpperCase()
        .includes("CAP")
        ? "DEMO"
        : "UNVERIFIED";
  }

  return {
    ...warning,
    id:
      warning.id ||
      createId("WARN"),
    hazardType:
      warning.hazardType ||
      warning.type ||
      "UNKNOWN",
    severity:
      warning.severity ||
      "UNKNOWN",
    sourceStatus,
    expiresAt,
    status:
      warningIsActive(warning)
        ? "ACTIVE"
        : String(
            warning.status || ""
          ).toUpperCase() ===
          "CANCELLED"
        ? "CANCELLED"
        : "EXPIRED",
    updatedAt:
      warning.updatedAt ||
      warning.issuedAt ||
      new Date().toISOString(),
  };
}

function pointOnSegment(
  point,
  start,
  end
) {
  const [px, py] = point;
  const [sx, sy] = start;
  const [ex, ey] = end;

  const cross =
    (py - sy) * (ex - sx) -
    (px - sx) * (ey - sy);

  if (
    Math.abs(cross) >
    1e-10
  ) {
    return false;
  }

  return (
    px >=
      Math.min(sx, ex) -
        1e-10 &&
    px <=
      Math.max(sx, ex) +
        1e-10 &&
    py >=
      Math.min(sy, ey) -
        1e-10 &&
    py <=
      Math.max(sy, ey) +
        1e-10
  );
}

function pointInRing(
  point,
  ring
) {
  if (
    !Array.isArray(ring) ||
    ring.length < 3
  ) {
    return false;
  }

  let inside = false;

  for (
    let i = 0;
    i < ring.length;
    i += 1
  ) {
    const current =
      ring[i];
    const next =
      ring[
        (i + 1) %
          ring.length
      ];

    if (
      pointOnSegment(
        point,
        current,
        next
      )
    ) {
      return true;
    }

    const [xi, yi] =
      current;
    const [xj, yj] =
      next;

    const intersects =
      yi > point[1] !==
        yj > point[1] &&
      point[0] <
        ((xj - xi) *
          (point[1] - yi)) /
          (yj - yi) +
          xi;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

function pointInGeometry(
  lat,
  lon,
  geometry
) {
  if (!geometry) {
    return false;
  }

  if (
    geometry.type ===
    "Polygon"
  ) {
    const rings =
      geometry.coordinates ||
      [];

    if (
      !pointInRing(
        [lon, lat],
        rings[0]
      )
    ) {
      return false;
    }

    for (
      let i = 1;
      i < rings.length;
      i += 1
    ) {
      if (
        pointInRing(
          [lon, lat],
          rings[i]
        )
      ) {
        return false;
      }
    }

    return true;
  }

  if (
    geometry.type ===
    "MultiPolygon"
  ) {
    return (
      geometry.coordinates ||
      []
    ).some(
      polygon =>
        pointInGeometry(
          lat,
          lon,
          {
            type: "Polygon",
            coordinates:
              polygon,
          }
        )
    );
  }

  return false;
}

function getActiveWarnings() {
  const warnings =
    getWarnings();

  let changed = false;

  const normalized =
    warnings.map(
      warning => {
        const next =
          normalizeWarning(
            warning
          );

        if (
          next.status !==
            warning.status ||
          next.expiresAt !==
            (
              warning.expiresAt ||
              warning.validUntil ||
              null
            ) ||
          next.sourceStatus !==
            warning.sourceStatus
        ) {
          changed = true;
        }

        return next;
      }
    );

  let active =
    normalized.filter(
      warning =>
        warning.status ===
        "ACTIVE"
    );

  /*
   * Demo convenience only:
   * if every demo warning has expired and no active
   * warning exists, refresh the demonstration warning
   * for another six hours. Official warnings are never
   * auto-extended.
   */
  if (
    active.length === 0
  ) {
    const demoIndex =
      normalized.findIndex(
        warning =>
          String(
            warning.sourceStatus ||
              ""
          ).toUpperCase() ===
            "DEMO" ||
          String(
            warning.source ||
              ""
          ).toUpperCase().includes(
            "DEMO"
          )
      );

    if (
      demoIndex >= 0
    ) {
      const now =
        new Date();

      const renewed = {
        ...normalized[
          demoIndex
        ],
        issuedAt:
          now.toISOString(),
        updatedAt:
          now.toISOString(),
        expiresAt:
          new Date(
            now.getTime() +
              6 * 60 * 60 * 1000
          ).toISOString(),
        validUntil:
          new Date(
            now.getTime() +
              6 * 60 * 60 * 1000
          ).toISOString(),
        status:
          "ACTIVE",
        sourceStatus:
          "DEMO",
      };

      normalized[
        demoIndex
      ] = renewed;
      active = [renewed];
      changed = true;
    }
  }

  if (changed) {
    saveWarnings(
      normalized
    );
  }

  return active;
}



/* =====================================================
   LOCATION-AWARE DEMO SCENARIOS
   One deterministic operating-area scenario is shared by
   citizen and authority users in the same local grid cell.
===================================================== */

function scenarioNumber(value) {
  return Number(Number(value).toFixed(6));
}

function offsetLocation(center, northKm, eastKm) {
  const latDelta = northKm / 111.32;
  const lonScale = Math.max(0.2, Math.cos((center.lat * Math.PI) / 180));
  const lonDelta = eastKm / (111.32 * lonScale);
  return {
    lat: scenarioNumber(center.lat + latDelta),
    lon: scenarioNumber(center.lon + lonDelta),
  };
}

function scenarioCellForLocation(location) {
  const point = normalizeLocation(location) || fallbackDemoCenter;
  // A coarse operating-area key keeps citizen and authority users in the
  // same locality on one shared persisted scenario. The scenario itself is
  // generated around the first real browser location that creates the area.
  const step = 0.25;
  const latIndex = Math.round(point.lat / step);
  const lonIndex = Math.round(point.lon / step);
  return {
    id: `AREA-${latIndex}-${lonIndex}`,
    center: {
      lat: scenarioNumber(point.lat),
      lon: scenarioNumber(point.lon),
    },
  };
}

function scenarioSeed(id, rotationKey = "") {
  return parseInt(crypto.createHash("sha256").update(`${String(id)}|${String(rotationKey)}`).digest("hex").slice(0, 8), 16) >>> 0;
}

function demoRotationKey(date = new Date()) {
  // The demo changes in predictable time windows so a presentation feels live
  // without pretending that the data comes from a real emergency feed.
  const slot = Math.floor(date.getTime() / (30 * 60 * 1000));
  return `DEMO-SLOT-${slot}`;
}

function dangerPolygon(center, radiusKm = 1.8) {
  const ring = [];
  for (let index = 0; index < 12; index += 1) {
    const angle = (Math.PI * 2 * index) / 12;
    const point = offsetLocation(
      center,
      Math.cos(angle) * radiusKm,
      Math.sin(angle) * radiusKm
    );
    ring.push([point.lon, point.lat]);
  }
  ring.push(ring[0]);
  return { type: "Polygon", coordinates: [ring] };
}

function scenarioResource(id, name, type, center, northKm, eastKm, extra = {}) {
  const point = offsetLocation(center, northKm, eastKm);
  return {
    id,
    name,
    type,
    lat: point.lat,
    lon: point.lon,
    source: "DEMO",
    ...extra,
  };
}

function buildDemoScenario(location) {
  const cell = scenarioCellForLocation(location);
  const rotationKey = demoRotationKey();
  const seed = scenarioSeed(cell.id, rotationKey);
  const hazardTypes = ["FLOOD", "SEVERE STORM", "LANDSLIDE", "FIRE", "EARTHQUAKE", "CYCLONE"];
  const hazardType = hazardTypes[seed % hazardTypes.length];
  const now = new Date();
  const resources = [
    scenarioResource(`${cell.id}-shelter-a`, "Welfare Centre A — Community Hall", "shelter", cell.center, 1.05, 0.7, { capacity: 500, occupied: 170, accessibility: true, status: "AVAILABLE" }),
    scenarioResource(`${cell.id}-shelter-b`, "Relief Shelter B — Public School", "shelter", cell.center, -0.8, 1.35, { capacity: 850, occupied: 410, accessibility: true, status: "AVAILABLE" }),
    scenarioResource(`${cell.id}-shelter-c`, "Emergency Shelter C — Sports Centre", "shelter", cell.center, 0.45, -1.45, { capacity: 650, occupied: 290, accessibility: false, status: "AVAILABLE" }),
    scenarioResource(`${cell.id}-hospital-a`, "Nearby Emergency Hospital", "hospital", cell.center, 1.7, -0.45),
    scenarioResource(`${cell.id}-fire-a`, "Nearby Fire & Rescue Station", "fire", cell.center, -1.4, -1.05),
  ];

  const shelter = resources.find((item) => item.type === "shelter" && item.status === "AVAILABLE");
  const hazardPoint = offsetLocation(cell.center, 0.35, 0.25);
  const roadPoint = offsetLocation(cell.center, -0.3, 0.55);
  const route = shelter
    ? [
        cell.center,
        offsetLocation(cell.center, 0.15, 0.35),
        offsetLocation(cell.center, 0.25, 0.75),
        { lat: shelter.lat, lon: shelter.lon },
      ]
    : [cell.center];

  return {
    id: cell.id,
    rotationKey,
    areaLabel: `Local demo operating area · ${cell.center.lat.toFixed(2)}, ${cell.center.lon.toFixed(2)}`,
    center: cell.center,
    hazardType,
    warning: {
      id: `${cell.id}-warning`,
      title: `${hazardType} demonstration warning`,
      hazardType,
      type: hazardType,
      severity: seed % 3 === 0 ? "CRITICAL" : "HIGH",
      source: "RAKSHA DEMO ENGINE",
      sourceStatus: "DEMO",
      issuedAt: now.toISOString(),
      updatedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 6 * 60 * 60 * 1000).toISOString(),
      validUntil: new Date(now.getTime() + 6 * 60 * 60 * 1000).toISOString(),
      status: "ACTIVE",
      instructions: [
        "Follow verified local authority instructions.",
        "Avoid visibly damaged, flooded, burning or unstable routes.",
        "Keep household members together and use the nearest suitable relief centre if movement is required.",
      ],
      affectedArea: dangerPolygon(cell.center, 1.8),
    },
    resources,
    shelters: resources.filter((item) => item.type === "shelter"),
    demoHazards: [
      { id: `${cell.id}-hazard-a`, type: `${hazardType} impact`, location: hazardPoint, severity: "HIGH", createdAt: now.toISOString() },
      { id: `${cell.id}-hazard-b`, type: "Blocked / unsafe route", location: roadPoint, severity: "HIGH", createdAt: now.toISOString() },
    ],
    evacuationRoute: route,
    generatedAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

function getOrCreateDemoScenario(location) {
  const cell = scenarioCellForLocation(location);
  const scenarios = getDemoScenarios();
  let scenario = scenarios[cell.id];

  if (!scenario) {
    scenario = buildDemoScenario(location);
    scenarios[cell.id] = scenario;
    saveDemoScenarios(scenarios);
  }

  const currentRotationKey = demoRotationKey();
  const expiry = new Date(scenario.warning?.expiresAt || 0).getTime();
  if (scenario.rotationKey !== currentRotationKey || !Number.isFinite(expiry) || expiry <= Date.now()) {
    // Keep the same operating-area ID so citizen and authority views remain
    // connected, while changing the demonstration situation over time.
    scenario = buildDemoScenario(location);
    scenarios[cell.id] = scenario;
    saveDemoScenarios(scenarios);
  }

  return scenario;
}

function getDemoScenarioById(id) {
  const scenarios = getDemoScenarios();
  return scenarios[String(id || "")] || null;
}

function eventMatchesScenario(event, scenarioId) {
  if (!scenarioId) return true;
  return String(event?.payload?.scenarioId || event?.scenarioId || "") === String(scenarioId);
}

function incidentMatchesScenario(incident, scenarioId) {
  if (!scenarioId) return true;
  return String(incident?.scenarioId || "") === String(scenarioId);
}

function scenarioResources(scenarioId) {
  const scenario = getDemoScenarioById(scenarioId);
  return Array.isArray(scenario?.resources) ? scenario.resources : getResources();
}

app.post(
  "/api/demo/scenario/resolve",
  requireAuth,
  (req, res) => {
    const requestedLocation = normalizeLocation(req.body?.location);
    const usingFallback = !requestedLocation;
    const viewerLocation = requestedLocation || {
      ...fallbackDemoCenter,
      accuracy: null,
      timestamp: new Date().toISOString(),
    };
    const scenario = getOrCreateDemoScenario(viewerLocation);

    res.json({
      success: true,
      scenario,
      viewerLocation,
      locationMode: usingFallback ? "DEMO_FALLBACK" : "LIVE_BROWSER_LOCATION",
    });
  }
);

app.get(
  "/api/demo/scenario/:id/check",
  requireAuth,
  (req, res) => {
    const scenario = getDemoScenarioById(req.params.id);
    if (!scenario) {
      return res.status(404).json({ success: false, message: "Demo scenario not found." });
    }
    const lat = Number(req.query.lat);
    const lon = Number(req.query.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return res.status(400).json({ success: false, message: "Valid coordinates are required." });
    }
    res.json({
      success: true,
      insideDangerZone: pointInGeometry(lat, lon, scenario.warning?.affectedArea),
      warning: scenario.warning,
    });
  }
);

app.put(
  "/api/demo/scenario/:id/shelter/:resourceId",
  requireAuth,
  requireAuthority,
  (req, res) => {
    const scenarios = getDemoScenarios();
    const scenario = scenarios[req.params.id];
    if (!scenario) return res.status(404).json({ success: false, message: "Demo scenario not found." });
    const index = scenario.resources.findIndex((resource) => resource.id === req.params.resourceId && resource.type === "shelter");
    if (index < 0) return res.status(404).json({ success: false, message: "Shelter not found." });

    const resource = scenario.resources[index];
    if (req.body?.occupied !== undefined) {
      const occupied = Number(req.body.occupied);
      if (!Number.isFinite(occupied) || occupied < 0 || occupied > Number(resource.capacity || 0)) {
        return res.status(400).json({ success: false, message: "Invalid occupied value." });
      }
      resource.occupied = occupied;
    }
    if (req.body?.capacity !== undefined) {
      const capacity = Number(req.body.capacity);
      if (!Number.isFinite(capacity) || capacity < 0 || capacity < Number(resource.occupied || 0)) {
        return res.status(400).json({ success: false, message: "Invalid capacity value." });
      }
      resource.capacity = capacity;
    }
    const remaining = Math.max(0, Number(resource.capacity || 0) - Number(resource.occupied || 0));
    resource.status = remaining <= 0 ? "FULL" : remaining <= Math.max(10, Number(resource.capacity || 1) * 0.15) ? "LIMITED" : "AVAILABLE";
    scenario.shelters = scenario.resources.filter((item) => item.type === "shelter");
    scenario.updatedAt = new Date().toISOString();
    scenarios[scenario.id] = scenario;
    saveDemoScenarios(scenarios);
    res.json({ success: true, resource, scenario });
  }
);

/* =====================================================
   ACTIVE WARNINGS
===================================================== */

app.get(
  "/api/warnings/active",
  (req, res) => {
    res.json({
      success: true,
      warnings:
        getActiveWarnings(),
    });
  }
);

app.get(
  "/api/warnings/check",
  (req, res) => {
    const lat =
      Number(req.query.lat);
    const lon =
      Number(req.query.lon);

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lon)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Valid latitude and longitude are required.",
      });
    }

    const warnings =
      getActiveWarnings();

    const affected =
      warnings.filter(
        warning =>
          pointInGeometry(
            lat,
            lon,
            warning.affectedArea
          )
      );

    res.json({
      success: true,
      insideDangerZone:
        affected.length > 0,
      warnings:
        affected,
    });
  }
);

app.get(
  "/api/authority/warnings",
  requireAuth,
  requireAuthority,
  (req, res) => {
    res.json({
      success: true,
      warnings:
        getWarnings().map(
          normalizeWarning
        ),
    });
  }
);

/* =====================================================
   HEALTH
===================================================== */

app.get(
  "/api/health",
  (req, res) => {
    res.json({
      success: true,
      system: "RAKSHA",
      status: "ONLINE",
      timestamp:
        new Date().toISOString(),
    });
  }
);

/* =====================================================
   AUTH
===================================================== */

app.post(
  "/api/auth/login",
  (req, res) => {
    const {
      email,
      password,
    } =
      req.body || {};

    if (
      !email ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Email and password are required.",
      });
    }

    const user =
      getUsers().find(
        (item) =>
          String(
            item.email
          ).toLowerCase() ===
          String(
            email
          ).toLowerCase()
      );

    if (!user) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid email or password.",
      });
    }

    if (
      user.passwordHash !==
      hashPassword(
        password
      )
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid email or password.",
      });
    }

    if (
      user.accountType ===
        "AUTHORITY" &&
      !user.approved
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Authority account is not approved.",
      });
    }

    const token =
      crypto
        .randomBytes(32)
        .toString("hex");

    sessions.set(
      token,
      {
        userId:
          user.id,
        createdAt:
          Date.now(),
      }
    );

    saveSessions();

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone:
          user.phone ||
          "",
        role: user.role,
        jurisdiction:
          user.jurisdiction,
        accountType:
          user.accountType,
      },
    });
  }
);

app.post(
  "/api/auth/register",
  (req, res) => {
    const {
      name,
      phone,
      email,
      password,
    } =
      req.body || {};

    if (
      !name ||
      !email ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Name, email and password are required.",
      });
    }

    const users =
      getUsers();

    if (
      users.some(
        (user) =>
          String(
            user.email
          ).toLowerCase() ===
          String(
            email
          ).toLowerCase()
      )
    ) {
      return res.status(409).json({
        success: false,
        message:
          "An account with this email already exists.",
      });
    }

    const citizen = {
      id: createId("CIT"),
      name,
      phone:
        phone || "",
      email,
      passwordHash:
        hashPassword(
          password
        ),
      role: "CITIZEN",
      jurisdiction:
        "Unassigned",
      accountType:
        "CITIZEN",
      approved: true,
    };

    users.push(
      citizen
    );

    saveUsers(
      users
    );

    res.status(201).json({
      success: true,
      message:
        "Citizen account created successfully.",
      user: {
        id:
          citizen.id,
        name:
          citizen.name,
        phone:
          citizen.phone,
        email:
          citizen.email,
        role:
          citizen.role,
        jurisdiction:
          citizen.jurisdiction,
        accountType:
          citizen.accountType,
      },
    });
  }
);

app.get(
  "/api/auth/me",
  requireAuth,
  (req, res) => {
    res.json({
      success: true,
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        phone:
          req.user.phone ||
          "",
        role: req.user.role,
        jurisdiction:
          req.user.jurisdiction,
        accountType:
          req.user.accountType,
      },
    });
  }
);

app.post(
  "/api/auth/logout",
  requireAuth,
  (req, res) => {
    sessions.delete(
      req.token
    );
    saveSessions();

    res.json({
      success: true,
      message:
        "Logged out successfully.",
    });
  }
);

/* =====================================================
   HOUSEHOLD
===================================================== */

app.get(
  "/api/household",
  requireAuth,
  (req, res) => {
    res.json({
      success: true,
      household:
        getHousehold(
          req.user.id
        ),
    });
  }
);

app.post(
  "/api/household",
  requireAuth,
  (req, res) => {
    const body =
      req.body ||
      {};

    const household = {
      id:
        getHousehold(
          req.user.id
        )?.id ||
        createId("HH"),

      citizenId:
        req.user.id,

      adults:
        Math.max(
          0,
          Number(
            body.adults
          ) || 0
        ),

      children:
        Math.max(
          0,
          Number(
            body.children
          ) || 0
        ),

      elderly:
        Math.max(
          0,
          Number(
            body.elderly
          ) || 0
        ),

      mobilityNeeds:
        Math.max(
          0,
          Number(
            body.mobilityNeeds
          ) || 0
        ),

      emergencyContact:
        body.emergencyContact ||
        "",

      totalPeople:
        householdTotal(
          body
        ),

      updatedAt:
        new Date().toISOString(),
    };

    const households =
      getHouseholds();

    const index =
      households.findIndex(
        (item) =>
          item.citizenId ===
          req.user.id
      );

    if (index >= 0) {
      households[index] =
        household;
    } else {
      households.push(
        household
      );
    }

    saveHouseholds(
      households
    );

    createEvent({
      type:
        "HOUSEHOLD_UPDATED",
      citizenId:
        req.user.id,
      priority:
        household.children >
          0 ||
        household.elderly >
          0 ||
        household.mobilityNeeds >
          0
          ? "HIGH"
          : "NORMAL",
      payload:
        household,
    });

    res.json({
      success: true,
      household,
    });
  }
);

/* =====================================================
   LIVE LOCATION
===================================================== */

app.post(
  "/api/citizen/location",
  requireAuth,
  (req, res) => {
    const location =
      normalizeLocation(
        req.body?.location
      );

    if (!location) {
      return res.status(400).json({
        success: false,
        message:
          "Valid location required.",
      });
    }

    const locations =
      getLocations();

    const record = {
      citizenId:
        req.user.id,
      location,
      connectivity:
        req.body?.connectivity ||
        "ONLINE",
      scenarioId: String(req.body?.scenarioId || ""),
      updatedAt:
        new Date().toISOString(),
    };

    const index =
      locations.findIndex(
        (item) =>
          item.citizenId ===
          req.user.id
      );

    if (index >= 0) {
      locations[index] =
        record;
    } else {
      locations.push(
        record
      );
    }

    saveLocations(
      locations
    );

    res.json({
      success: true,
      location:
        record,
    });
  }
);

app.get(
  "/api/citizen/location",
  requireAuth,
  (req, res) => {
    res.json({
      success: true,
      location:
        getLatestLocation(
          req.user.id
        ),
    });
  }
);


function normalizeEmergencyRecipients(value) {
  const pieces = Array.isArray(value) ? value : String(value || "").split(/[;,]/);
  const normalized = [];
  for (const piece of pieces) {
    let text = String(piece || "").trim().replace(/[\s()-]/g, "");
    if (!text) continue;
    if (/^\d{10}$/.test(text)) text = `+91${text}`;
    if (!/^\+[1-9]\d{7,14}$/.test(text)) continue;
    if (!normalized.includes(text)) normalized.push(text);
  }
  return normalized.slice(0, 5);
}

async function sendFamilyEmergencyNotification({ contacts, citizenName, location }) {
  const recipients = normalizeEmergencyRecipients(contacts);
  const point = normalizeLocation(location);
  const mapLink = point ? `https://www.google.com/maps?q=${point.lat},${point.lon}` : "Location unavailable";
  const message = `RAKSHA EMERGENCY ALERT: ${citizenName || "A family member"} triggered SOS and may need assistance. Location: ${mapLink}. Please contact them immediately.`;

  if (!recipients.length) {
    return { status: "NO_CONTACT", accepted: false, recipients: 0, message: "No valid emergency family contact is configured.", familyMessage: message };
  }

  const textBeeApiKey = String(process.env.TEXTBEE_API_KEY || "").trim();
  const textBeeBaseUrl = String(
    process.env.TEXTBEE_BASE_URL || "https://api.textbee.dev/api/v1"
  ).trim().replace(/\/$/, "");
  const genericEndpoint = String(process.env.SMS_GATEWAY_URL || "").trim();
  const genericApiKey = String(process.env.SMS_GATEWAY_API_KEY || "").trim();
  const genericHeaderName = String(process.env.SMS_GATEWAY_HEADER_NAME || "x-api-key").trim();

  const useTextBee = Boolean(textBeeApiKey);
  const endpoint = useTextBee
    ? `${textBeeBaseUrl}/gateway/send-sms`
    : genericEndpoint;
  const apiKey = useTextBee ? textBeeApiKey : genericApiKey;
  const headerName = useTextBee ? "x-api-key" : genericHeaderName;

  if (!endpoint || !apiKey) {
    return { status: "NOT_CONFIGURED", accepted: false, recipients: recipients.length, message: "Family notification gateway is not configured.", familyMessage: message };
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [headerName]: apiKey,
      },
      body: JSON.stringify({ recipients, message }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const status = response.status === 401 ? "AUTH_ERROR" : response.status === 429 ? "RATE_LIMIT" : response.status === 400 ? "REQUEST_ERROR" : "FAILED";
      return { status, accepted: false, recipients: recipients.length, httpStatus: response.status, message: data?.message || `Notification gateway returned ${response.status}.` };
    }

    return {
      status: "ACCEPTED",
      accepted: true,
      recipients: recipients.length,
      reference: data?.data?.smsBatchId || data?.smsBatchId || null,
      message: "Emergency family notification accepted by the configured gateway.",
      familyMessage: message,
    };
  } catch (error) {
    console.error("Family notification request failed:", error?.message || error);
    return { status: "NETWORK_ERROR", accepted: false, recipients: recipients.length, message: "Family notification gateway could not be reached.", familyMessage: message };
  }
}

const REPORT_MEDIA_TYPES = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
  ["video/mp4", ".mp4"],
  ["video/webm", ".webm"],
  ["video/quicktime", ".mov"],
]);

function saveReportMedia(media) {
  if (!Array.isArray(media) || !media.length) return [];
  if (media.length > 3) throw new Error("A maximum of 3 media files is allowed.");

  let totalBytes = 0;
  const saved = [];
  for (const item of media) {
    const type = String(item?.type || "").toLowerCase();
    const extension = REPORT_MEDIA_TYPES.get(type);
    if (!extension) throw new Error("Unsupported media type.");
    const dataUrl = String(item?.data || "");
    const marker = `data:${type};base64,`;
    if (!dataUrl.startsWith(marker)) throw new Error("Invalid media encoding.");
    const buffer = Buffer.from(dataUrl.slice(marker.length), "base64");
    if (!buffer.length || buffer.length > 4 * 1024 * 1024) throw new Error("Each media file must be 4 MB or smaller.");
    totalBytes += buffer.length;
    if (totalBytes > 8 * 1024 * 1024) throw new Error("Total media evidence must be 8 MB or smaller.");

    const filename = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${extension}`;
    fs.writeFileSync(path.join(REPORT_MEDIA_DIR, filename), buffer, { flag: "wx" });
    saved.push({
      name: String(item?.name || `evidence${extension}`).replace(/[^a-zA-Z0-9._ -]/g, "_").slice(0, 120),
      type,
      size: buffer.length,
      url: `/media/reports/${encodeURIComponent(filename)}`,
    });
  }
  return saved;
}

/* =====================================================
   SOS
===================================================== */

app.post(
  "/api/events/sos",
  requireAuth,
  async (req, res) => {
    const location = normalizeLocation(req.body?.location) || normalizeLocation(getLatestLocation(req.user.id)?.location);
    const household = req.body?.household || getHousehold(req.user.id);
    const scenarioId = String(req.body?.scenarioId || "");

    const event = createEvent({
      type: "SOS",
      citizenId: req.user.id,
      priority: "CRITICAL",
      payload: {
        location,
        household,
        scenarioId,
        risk: req.body?.risk ?? null,
        connectivity: req.body?.connectivity || "UNKNOWN",
        evacuationPlan: req.body?.evacuationPlan || null,
        description: req.body?.description || "Citizen requested emergency assistance.",
        sosTime: new Date().toISOString(),
        emergencyState: "HELP_REQUESTED",
      },
    });

    const familyNotification = await sendFamilyEmergencyNotification({
      contacts: household?.emergencyContact,
      citizenName: req.user?.name || "Citizen",
      location,
    });

    event.payload.familyNotification = {
      status: familyNotification.status,
      accepted: familyNotification.accepted,
      recipients: familyNotification.recipients,
      attemptedAt: new Date().toISOString(),
      reference: familyNotification.reference || null,
    };
    event.updatedAt = new Date().toISOString();
    const events = getEvents();
    const index = events.findIndex((item) => item.id === event.id);
    if (index >= 0) {
      events[index] = event;
      saveEvents(events);
    }

    res.status(201).json({
      success: true,
      message: familyNotification.accepted
        ? "SOS received. Emergency family notification was accepted."
        : "SOS received by the authority workflow. Family notification was not delivered by the configured gateway.",
      familyNotification,
      event,
    });
  }
);

/* =====================================================
   SAFE CHECK-IN
===================================================== */

app.post(
  "/api/events/safe-checkin",
  requireAuth,
  (req, res) => {
    const event =
      createEvent({
        type:
          "SAFE_CHECKIN",
        citizenId:
          req.user.id,
        priority:
          "NORMAL",
        payload: {
          location:
            normalizeLocation(
              req.body?.location
            ) ||
            normalizeLocation(
              getLatestLocation(
                req.user.id
              )?.location
            ),
          shelterName:
            req.body
              ?.shelterName ||
            "",
          message:
            req.body
              ?.message ||
            "Citizen confirmed they are safe.",
          scenarioId: String(req.body?.scenarioId || ""),
          emergencyState:
            "SAFE",
        },
      });

    res.status(201).json({
      success: true,
      event,
    });
  }
);

/* =====================================================
   HAZARD REPORT
===================================================== */

app.post(
  "/api/events/report",
  requireAuth,
  (req, res) => {
    const { reportType, description, severity } = req.body || {};
    if (!reportType) return res.status(400).json({ success: false, message: "Report type is required." });

    const location = normalizeLocation(req.body?.location) || normalizeLocation(getLatestLocation(req.user.id)?.location);
    const scenarioId = String(req.body?.scenarioId || "");
    let media = [];
    try {
      media = saveReportMedia(req.body?.media || []);
    } catch (error) {
      return res.status(400).json({ success: false, message: error instanceof Error ? error.message : "Invalid media evidence." });
    }

    const event = createEvent({
      type: "HAZARD_REPORT",
      citizenId: req.user.id,
      priority: severity === "CRITICAL" ? "CRITICAL" : severity === "HIGH" ? "HIGH" : "NORMAL",
      payload: {
        reportType,
        description: description || "",
        location,
        scenarioId,
        severity: severity || "NORMAL",
        verificationStatus: "PENDING",
        sourceLanguage: req.body?.sourceLanguage || "",
        aiSummary: req.body?.aiSummary || "",
        media,
      },
    });

    processCommunityReport({
      eventId: event.id,
      citizenId: req.user.id,
      type: reportType,
      severity: severity || "NORMAL",
      description: description || "",
      location,
      createdAt: event.createdAt,
      scenarioId,
    });

    res.status(201).json({ success: true, message: "Hazard report received and added to community intelligence.", media, event });
  }
);

/* =====================================================
   WELFARE
===================================================== */

app.post(
  "/api/events/welfare",
  requireAuth,
  (req, res) => {
    const {
      connection,
      reason,
      household,
      lastActiveAt,
      noResponseReview,
    } =
      req.body ||
      {};

    let priority =
      "NORMAL";

    if (
      connection ===
        "OFFLINE" ||
      noResponseReview === true
    ) {
      priority =
        "HIGH";
    }

    if (
      (connection ===
        "OFFLINE" ||
        noResponseReview === true) &&
      household &&
      (
        Number(
          household.children
        ) > 0 ||
        Number(
          household.elderly
        ) > 0 ||
        Number(
          household.mobilityNeeds
        ) > 0
      )
    ) {
      priority =
        "CRITICAL";
    }

    const event =
      createEvent({
        type: "WELFARE",
        citizenId:
          req.user.id,
        priority,
        payload: {
          connection:
            connection ||
            "UNKNOWN",
          scenarioId: String(req.body?.scenarioId || ""),
          location:
            normalizeLocation(
              req.body?.location
            ) ||
            normalizeLocation(
              getLatestLocation(
                req.user.id
              )?.location
            ),
          lastActiveAt:
            lastActiveAt ||
            new Date().toISOString(),
          reason:
            reason ||
            "Connectivity state changed.",
          noResponseReview:
            noResponseReview === true,
          household:
            household ||
            getHousehold(
              req.user.id
            ),
        },
      });

    res.status(201).json({
      success: true,
      event,
    });
  }
);

/* =====================================================
   CONNECTIVITY
===================================================== */

app.post(
  "/api/events/connectivity",
  requireAuth,
  (req, res) => {
    const state =
      [
        "ONLINE",
        "DEGRADED",
        "OFFLINE",
      ].includes(
        req.body?.state
      )
        ? req.body.state
        : "UNKNOWN";

    const event =
      createEvent({
        type:
          "CONNECTIVITY_CHANGE",
        citizenId:
          req.user.id,
        priority:
          state ===
          "OFFLINE"
            ? "HIGH"
            : "NORMAL",
        payload: {
          state,
          scenarioId: String(req.body?.scenarioId || ""),
          location:
            normalizeLocation(
              req.body
                ?.location
            ) ||
            normalizeLocation(
              getLatestLocation(
                req.user.id
              )?.location
            ),
          timestamp:
            new Date().toISOString(),
        },
      });

    res.status(201).json({
      success: true,
      event,
    });
  }
);

/* =====================================================
   AI
===================================================== */

app.post(
  "/api/events/ai-assessment",
  requireAuth,
  (req, res) => {
    const event =
      createEvent({
        type:
          "AI_ASSESSMENT",
        citizenId:
          req.user.id,
        priority:
          req.body?.level ===
          "CRITICAL"
            ? "CRITICAL"
            : req.body?.level ===
              "HIGH"
            ? "HIGH"
            : "NORMAL",
        payload: {
          score:
            req.body?.score ??
            null,
          level:
            req.body?.level ||
            "UNKNOWN",
          action:
            req.body?.action ||
            "",
          shelter:
            req.body?.shelter ||
            null,
          confidence:
            req.body?.confidence ??
            null,
          reasons:
            Array.isArray(
              req.body?.reasons
            )
              ? req.body.reasons
              : [],
          scenarioId: String(req.body?.scenarioId || ""),
        },
      });

    res.status(201).json({
      success: true,
      event,
    });
  }
);

/* =====================================================
   CITIZEN EVENTS
===================================================== */

app.get(
  "/api/citizen/events",
  requireAuth,
  (req, res) => {
    res.json({
      success: true,
      events:
        getEvents().filter(
          (event) =>
            event.citizenId === req.user.id &&
            eventMatchesScenario(event, String(req.query?.scenarioId || ""))
        ),
    });
  }
);

/* =====================================================
   HUMAN CONCENTRATION
===================================================== */

app.get(
  "/api/authority/human-concentration",
  requireAuth,
  requireAuthority,
  (req, res) => {
    const radiusKm =
      Math.max(
        0.1,
        Math.min(
          2,
          Number(
            req.query.radiusKm
          ) || 0.5
        )
      );

    const windowMinutes =
      Math.max(
        1,
        Math.min(
          60,
          Number(
            req.query.windowMinutes
          ) || 15
        )
      );

    const cutoff =
      Date.now() -
      windowMinutes *
        60 *
        1000;

    const scenarioId = String(req.query?.scenarioId || "");
    const locations =
      getLocations()
        .filter((item) => !scenarioId || String(item.scenarioId || "") === scenarioId)
        .map(item => ({
          citizenId:
            item.citizenId,
          location:
            normalizeLocation(
              item.location
            ),
          updatedAt:
            item.updatedAt ||
            item.location?.timestamp ||
            null,
        }))
        .filter(item => {
          if (
            !item.location ||
            !item.updatedAt
          ) {
            return false;
          }

          const updatedAt =
            new Date(
              item.updatedAt
            ).getTime();

          return (
            Number.isFinite(
              updatedAt
            ) &&
            updatedAt >= cutoff
          );
        });

    const warnings =
      getActiveWarnings();

    const affectedLocations =
      locations.filter(item =>
        warnings.some(
          warning =>
            pointInGeometry(
              item.location.lat,
              item.location.lon,
              warning.affectedArea
            )
        )
      );

    const clusters = [];

    for (
      const item of
        affectedLocations
    ) {
      let cluster =
        clusters.find(
          candidate =>
            distanceKm(
              item.location.lat,
              item.location.lon,
              candidate.center.lat,
              candidate.center.lon
            ) <= radiusKm
        );

      if (!cluster) {
        cluster = {
          id: createId("CLUSTER"),
          center: {
            lat:
              item.location.lat,
            lon:
              item.location.lon,
          },
          citizenIds: [],
          citizenCount: 0,
          severity: "LOW",
          latestAt:
            item.updatedAt,
        };

        clusters.push(
          cluster
        );
      }

      if (
        item.citizenId &&
        !cluster.citizenIds.includes(
          item.citizenId
        )
      ) {
        cluster.citizenIds.push(
          item.citizenId
        );
      }

      cluster.citizenCount =
        cluster.citizenIds
          .length;

      cluster.latestAt =
        new Date(
          item.updatedAt
        ).getTime() >
        new Date(
          cluster.latestAt
        ).getTime()
          ? item.updatedAt
          : cluster.latestAt;

      cluster.severity =
        cluster.citizenCount >=
        20
          ? "CRITICAL"
          : cluster.citizenCount >=
            10
          ? "HIGH"
          : cluster.citizenCount >=
            3
          ? "WATCH"
          : "LOW";
    }

    clusters.sort(
      (a, b) =>
        b.citizenCount -
        a.citizenCount
    );

    res.json({
      success: true,
      radiusKm,
      windowMinutes,
      totalPeopleTracked:
        affectedLocations.length,
      clusters:
        clusters.map(
          cluster => ({
            ...cluster,
            citizenIds: undefined,
          })
        ),
    });
  }
);

/* =====================================================
   RESOURCES
===================================================== */

app.get(
  "/api/resources",
  (req, res) => {
    res.json({
      success: true,
      resources:
        getResources(),
    });
  }
);

app.get(
  "/api/resources/sync",
  requireAuth,
  (req, res) => {
    res.json({
      success: true,
      resources:
        req.query?.scenarioId
          ? scenarioResources(String(req.query.scenarioId))
          : getResources(),
    });
  }
);

app.put(
  "/api/resources/shelter/:id",
  requireAuth,
  requireAuthority,
  (req, res) => {
    const resources =
      getResources();

    const index =
      resources.findIndex(
        (resource) =>
          resource.id ===
            req.params.id &&
          resource.type ===
            "shelter"
      );

    if (index === -1) {
      return res.status(404).json({
        success: false,
        message:
          "Shelter not found.",
      });
    }

    const resource =
      resources[index];

    if (
      req.body
        ?.capacity !==
      undefined
    ) {
      const capacity =
        Number(
          req.body.capacity
        );

      if (
        !Number.isFinite(
          capacity
        ) ||
        capacity < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid capacity.",
        });
      }

      resource.capacity =
        capacity;
    }

    if (
      req.body
        ?.occupied !==
      undefined
    ) {
      const occupied =
        Number(
          req.body.occupied
        );

      if (
        !Number.isFinite(
          occupied
        ) ||
        occupied < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid occupancy.",
        });
      }

      resource.occupied =
        Math.min(
          occupied,
          resource.capacity
        );
    }

    if (
      req.body
        ?.accessibility !==
      undefined
    ) {
      resource.accessibility =
        Boolean(
          req.body
            .accessibility
        );
    }

    resource.status =
      resource.occupied >=
      resource.capacity
        ? "FULL"
        : resource.capacity -
              resource.occupied <=
            Math.max(
              10,
              resource.capacity *
                0.15
            )
        ? "LIMITED"
        : "AVAILABLE";

    saveResources(
      resources
    );

    createEvent({
      type:
        "RESOURCE_UPDATED",
      payload: {
        resourceId:
          resource.id,
        capacity:
          resource.capacity,
        occupied:
          resource.occupied,
        status:
          resource.status,
        accessibility:
          resource.accessibility,
        updatedBy:
          req.user.id,
      },
    });

    res.json({
      success: true,
      resource,
    });
  }
);

/* =====================================================
   AUTHORITY EVENTS
===================================================== */

app.get(
  "/api/authority/events",
  requireAuth,
  requireAuthority,
  (req, res) => {
    let events =
      getEvents();

    const scenarioId = String(req.query?.scenarioId || "");
    if (scenarioId) {
      events = events.filter((event) => eventMatchesScenario(event, scenarioId));
    }

    if (
      req.query?.type
    ) {
      events =
        events.filter(
          (event) =>
            event.type ===
            req.query.type
        );
    }

    if (
      req.query?.status
    ) {
      events =
        events.filter(
          (event) =>
            event.status ===
            req.query.status
        );
    }

    const limit =
      Math.min(
        Math.max(
          Number(
            req.query?.limit
          ) || 100,
          1
        ),
        500
      );

    res.json({
      success: true,
      events:
        events.slice(
          0,
          limit
        ),
      total:
        events.length,
    });
  }
);

/* =====================================================
   AUTHORITY EVENT STATUS
===================================================== */

app.put(
  "/api/authority/events/:id/status",
  requireAuth,
  requireAuthority,
  (req, res) => {
    const allowed = [
      "NEW",
      "ACKNOWLEDGED",
      "CONTACTING",
      "ASSIGNED",
      "RESPONDING",
      "ESCALATED",
      "RESOLVED",
      "REJECTED",
    ];

    const status =
      req.body?.status;

    if (
      !allowed.includes(
        status
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid event status.",
      });
    }

    const event =
      getEvents().find(
        (item) =>
          item.id ===
          req.params.id
      );

    if (!event) {
      return res.status(404).json({
        success: false,
        message:
          "Event not found.",
      });
    }

    const changes = {
      status,
    };

    if (
      status ===
      "ASSIGNED"
    ) {
      changes.assignedTo =
        req.body?.assignedTo ||
        req.user.id;

      changes.assignedAt =
        new Date().toISOString();
    }

    if (
      req.body?.note
    ) {
      changes.notes = [
        ...(event.notes ||
          []),
        {
          text:
            String(
              req.body.note
            ),
          by:
            req.user.id,
          byName:
            req.user.name,
          createdAt:
            new Date().toISOString(),
        },
      ];
    }

    const updated =
      updateEvent(
        event.id,
        changes
      );

    /*
     * Keep community incident status in sync.
     */
    if (
      event.type ===
      "COMMUNITY_INCIDENT"
    ) {
      const incidentId =
        event.payload
          ?.incidentId;

      if (incidentId) {
        const incidents =
          getIncidents();

        const index =
          incidents.findIndex(
            (incident) =>
              incident.id ===
              incidentId
          );

        if (index >= 0) {
          incidents[index].status =
            status;

          if (
            status ===
            "ASSIGNED"
          ) {
            incidents[index].assignedTo =
              req.body
                ?.assignedTo ||
              req.user.id;
          }

          incidents[index].updatedAt =
            new Date().toISOString();

          saveIncidents(
            incidents
          );
        }
      }
    }

    res.json({
      success: true,
      event:
        updated,
    });
  }
);

/* =====================================================
   AUTHORITY EVENT NOTES
===================================================== */

app.post(
  "/api/authority/events/:id/note",
  requireAuth,
  requireAuthority,
  (req, res) => {
    const text =
      String(
        req.body?.note ||
          ""
      ).trim();

    if (!text) {
      return res.status(400).json({
        success: false,
        message:
          "Note cannot be empty.",
      });
    }

    const event =
      getEvents().find(
        (item) =>
          item.id ===
          req.params.id
      );

    if (!event) {
      return res.status(404).json({
        success: false,
        message:
          "Event not found.",
      });
    }

    const updated =
      updateEvent(
        event.id,
        {
          notes: [
            ...(event.notes ||
              []),
            {
              text,
              by:
                req.user.id,
              byName:
                req.user.name,
              createdAt:
                new Date().toISOString(),
            },
          ],
        }
      );

    res.status(201).json({
      success: true,
      event:
        updated,
    });
  }
);

/* =====================================================
   AUTHORITY HAZARD REPORTS
===================================================== */

/*
 * Returns REAL citizen hazard reports.
 * Each report is enriched with citizen identity,
 * phone, household, exact location and community
 * incident information.
 */
app.get(
  "/api/authority/hazard-reports",
  requireAuth,
  requireAuthority,
  (req, res) => {
    const scenarioId = String(req.query?.scenarioId || "");
    const events =
      getEvents().filter((event) => eventMatchesScenario(event, scenarioId));

    const users =
      getUsers();

    const incidents =
      getIncidents();

    const reports =
      events
        .filter(
          (event) =>
            event.type ===
            "HAZARD_REPORT"
        )
        .map(
          (event) => {
            const citizen =
              users.find(
                (user) =>
                  user.id ===
                  event.citizenId
              );

            const household =
              getHousehold(
                event.citizenId
              ) ||
              event.payload
                ?.household ||
              null;

            const location =
              normalizeLocation(
                event.payload
                  ?.location
              ) ||
              normalizeLocation(
                getLatestLocation(
                  event.citizenId
                )?.location
              );

            const matchingIncident =
              incidents.find(
                (incident) =>
                  incident.reports?.some(
                    (report) =>
                      report.eventId ===
                      event.id
                  )
              );

            return {
              id:
                event.id,

              citizen: {
                id:
                  citizen?.id ||
                  event.citizenId ||
                  "UNKNOWN",

                name:
                  citizen?.name ||
                  "Citizen",

                phone:
                  citizen?.phone ||
                  "",

                email:
                  citizen?.email ||
                  "",
              },

              household,

              reportType:
                event.payload
                  ?.reportType ||
                "Hazard",

              description:
                event.payload
                  ?.description ||
                "",

              media:
                Array.isArray(event.payload?.media)
                  ? event.payload.media
                  : [],

              scenarioId:
                event.payload?.scenarioId || "",

              severity:
                event.payload
                  ?.severity ||
                event.priority ||
                "NORMAL",

              priority:
                event.priority ||
                "NORMAL",

              status:
                event.status ||
                "NEW",

              createdAt:
                event.createdAt,

              updatedAt:
                event.updatedAt ||
                event.createdAt,

              location,

              incident:
                matchingIncident
                  ? {
                      id:
                        matchingIncident.id,

                      reportCount:
                        matchingIncident.reportCount,

                      uniqueCitizenCount:
                        matchingIncident.uniqueCitizenCount,

                      confidence:
                        matchingIncident.confidence,

                      priority:
                        matchingIncident.priority,

                      status:
                        matchingIncident.status,

                      center:
                        matchingIncident.center,
                    }
                  : null,

              notes:
                event.notes ||
                [],

              assignedTo:
                event.assignedTo ||
                null,
            };
          }
        );

    res.json({
      success: true,
      reports,
    });
  }
);

/*
 * Add authority note specifically to a report.
 */
app.post(
  "/api/authority/hazard-reports/:id/note",
  requireAuth,
  requireAuthority,
  (req, res) => {
    const text =
      String(
        req.body?.note ||
          ""
      ).trim();

    if (!text) {
      return res.status(400).json({
        success: false,
        message:
          "Report note cannot be empty.",
      });
    }

    const event =
      getEvents().find(
        (item) =>
          item.id ===
            req.params.id &&
          item.type ===
            "HAZARD_REPORT"
      );

    if (!event) {
      return res.status(404).json({
        success: false,
        message:
          "Hazard report not found.",
      });
    }

    const updated =
      updateEvent(
        event.id,
        {
          notes: [
            ...(event.notes ||
              []),
            {
              text,
              by:
                req.user.id,
              byName:
                req.user.name,
              createdAt:
                new Date().toISOString(),
            },
          ],
        }
      );

    res.status(201).json({
      success: true,
      report:
        updated,
    });
  }
);

/*
 * Change the status of one REAL hazard report.
 */
app.put(
  "/api/authority/hazard-reports/:id/status",
  requireAuth,
  requireAuthority,
  (req, res) => {
    const allowed = [
      "NEW",
      "ACKNOWLEDGED",
      "CONTACTING",
      "ASSIGNED",
      "RESPONDING",
      "RESOLVED",
      "REJECTED",
    ];

    const status =
      req.body?.status;

    if (
      !allowed.includes(
        status
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid report status.",
      });
    }

    const event =
      getEvents().find(
        (item) =>
          item.id ===
            req.params.id &&
          item.type ===
            "HAZARD_REPORT"
      );

    if (!event) {
      return res.status(404).json({
        success: false,
        message:
          "Hazard report not found.",
      });
    }

    const changes = {
      status,
    };

    if (
      status ===
      "ASSIGNED"
    ) {
      changes.assignedTo =
        req.body?.assignedTo ||
        req.user.id;

      changes.assignedAt =
        new Date().toISOString();
    }

    if (
      req.body?.note
    ) {
      changes.notes = [
        ...(event.notes ||
          []),
        {
          text:
            String(
              req.body.note
            ),
          by:
            req.user.id,
          byName:
            req.user.name,
          createdAt:
            new Date().toISOString(),
        },
      ];
    }

    const updated =
      updateEvent(
        event.id,
        changes
      );

    /*
     * If the report belongs to a community incident,
     * synchronize the incident when the report is resolved.
     */
    const incidents =
      getIncidents();

    const incidentIndex =
      incidents.findIndex(
        (incident) =>
          incident.reports?.some(
            (report) =>
              report.eventId ===
              event.id
          )
      );

    if (
      incidentIndex >= 0
    ) {
      if (
        status ===
        "RESOLVED"
      ) {
        const activeReports =
          incidents[
            incidentIndex
          ].reports.filter(
            (report) => {
              const reportEvent =
                getEvents().find(
                  (candidate) =>
                    candidate.id ===
                    report.eventId
                );

              return (
                reportEvent &&
                reportEvent.status !==
                  "RESOLVED" &&
                reportEvent.status !==
                  "REJECTED"
              );
            }
          );

        if (
          activeReports.length ===
          0
        ) {
          incidents[
            incidentIndex
          ].status =
            "RESOLVED";
        }
      }

      incidents[
        incidentIndex
      ].updatedAt =
        new Date().toISOString();

      saveIncidents(
        incidents
      );
    }

    res.json({
      success: true,
      report:
        updated,
    });
  }
);

/* =====================================================
   RESPONSE PRIORITY
===================================================== */

function responsePriorityForEvent(event) {
  let score = 40;
  const reasons = [];

  const type = String(event.type || "").toUpperCase();
  const priority = String(event.priority || "NORMAL").toUpperCase();
  const payload = event.payload || {};
  const household = payload.household || null;

  if (type === "SOS") {
    score += 40;
    reasons.push("Explicit SOS request");
  } else if (type === "WELFARE") {
    score += 28;
    reasons.push("Welfare concern");
  } else if (type === "CONNECTIVITY_CHANGE") {
    score += 18;
    reasons.push("Connectivity signal");
  } else if (type === "HAZARD_REPORT") {
    score += 20;
    reasons.push("Citizen ground report");
  } else if (type === "COMMUNITY_INCIDENT") {
    score += 24;
    reasons.push("Corroborated community incident");
  }

  if (priority === "CRITICAL") {
    score += 20;
    reasons.push("Critical priority");
  } else if (priority === "HIGH") {
    score += 12;
    reasons.push("High priority");
  }

  if (household) {
    if (Number(household.children) > 0) {
      score += 5;
      reasons.push("Children in household");
    }
    if (Number(household.elderly) > 0) {
      score += 5;
      reasons.push("Elderly household member");
    }
    if (Number(household.mobilityNeeds) > 0) {
      score += 7;
      reasons.push("Mobility support required");
    }
  }

  const ageMinutes = Math.max(
    0,
    (Date.now() - new Date(event.createdAt || Date.now()).getTime()) / 60000
  );

  if (ageMinutes <= 5) {
    score += 8;
    reasons.push("Very recent event");
  } else if (ageMinutes <= 15) {
    score += 4;
    reasons.push("Recent event");
  }

  score = Math.min(100, Math.round(score));

  return {
    score,
    level:
      score >= 90
        ? "CRITICAL"
        : score >= 75
        ? "HIGH"
        : score >= 55
        ? "WATCH"
        : "NORMAL",
    reasons,
  };
}

app.get(
  "/api/authority/response-priority",
  requireAuth,
  requireAuthority,
  (req, res) => {
    const scenarioId = String(req.query?.scenarioId || "");
    const events = getEvents()
      .filter(
        (event) =>
          eventMatchesScenario(event, scenarioId) &&
          event.status !== "RESOLVED" &&
          event.status !== "REJECTED"
      )
      .map((event) => {
        const assessment = responsePriorityForEvent(event);

        return {
          id: event.id,
          type: event.type,
          citizenId: event.citizenId || null,
          status: event.status || "NEW",
          priority: event.priority || "NORMAL",
          responseScore: assessment.score,
          responseLevel: assessment.level,
          reasons: assessment.reasons,
          createdAt: event.createdAt,
          updatedAt: event.updatedAt || event.createdAt,
          location:
            normalizeLocation(event.payload?.location) ||
            normalizeLocation(getLatestLocation(event.citizenId)?.location),
          household:
            event.payload?.household ||
            getHousehold(event.citizenId),
          incidentId: event.payload?.incidentId || null,
          reportCount: Number(event.payload?.reportCount || 0),
          uniqueCitizenCount: Number(
            event.payload?.uniqueCitizenCount || 0
          ),
        };
      })
      .sort((a, b) => {
        if (b.responseScore !== a.responseScore) {
          return b.responseScore - a.responseScore;
        }
        return (
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime()
        );
      })
      .slice(0, 30);

    res.json({
      success: true,
      items: events,
    });
  }
);

/* =====================================================
   HAZARD REPORT VERIFICATION
===================================================== */

app.put(
  "/api/authority/hazard-reports/:id/verification",
  requireAuth,
  requireAuthority,
  (req, res) => {
    const allowed = [
      "PENDING",
      "VERIFIED",
      "UNVERIFIED",
    ];

    const verificationStatus =
      String(
        req.body?.verificationStatus ||
          ""
      ).toUpperCase();

    if (
      !allowed.includes(
        verificationStatus
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid verification status.",
      });
    }

    const events =
      getEvents();

    const index =
      events.findIndex(
        event =>
          event.id ===
            req.params.id &&
          event.type ===
            "HAZARD_REPORT"
      );

    if (index === -1) {
      return res.status(404).json({
        success: false,
        message:
          "Hazard report not found.",
      });
    }

    events[index].payload = {
      ...(events[index].payload ||
        {}),
      verificationStatus,
      verifiedAt:
        new Date().toISOString(),
      verifiedBy:
        req.user.id,
      verifiedByName:
        req.user.name,
    };

    events[index].updatedAt =
      new Date().toISOString();

    saveEvents(events);

    res.json({
      success: true,
      verificationStatus,
      event:
        events[index],
    });
  }
);

/* =====================================================
   COMMUNITY INCIDENTS
===================================================== */

app.get(
  "/api/authority/community-incidents",
  requireAuth,
  requireAuthority,
  (req, res) => {
    const scenarioId = String(req.query?.scenarioId || "");
    const incidents =
      getIncidents().filter((incident) => incidentMatchesScenario(incident, scenarioId)).sort(
        (a, b) =>
          new Date(
            b.updatedAt
          ).getTime() -
          new Date(
            a.updatedAt
          ).getTime()
      );

    res.json({
      success: true,
      incidents,
    });
  }
);

app.get(
  "/api/citizen/community-incidents",
  requireAuth,
  (req, res) => {
    const scenarioId = String(req.query?.scenarioId || "");
    const incidents =
      getIncidents().filter(
        (incident) =>
          incidentMatchesScenario(incident, scenarioId) &&
          incident.status !==
          "RESOLVED"
      );

    res.json({
      success: true,
      incidents:
        incidents.slice(
          0,
          50
        ),
    });
  }
);

app.put(
  "/api/authority/community-incidents/:id/status",
  requireAuth,
  requireAuthority,
  (req, res) => {
    const allowed = [
      "NEW",
      "ACKNOWLEDGED",
      "ASSIGNED",
      "RESPONDING",
      "RESOLVED",
      "REJECTED",
    ];

    const status =
      req.body?.status;

    if (
      !allowed.includes(
        status
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid incident status.",
      });
    }

    const incidents =
      getIncidents();

    const index =
      incidents.findIndex(
        (incident) =>
          incident.id ===
          req.params.id
      );

    if (
      index === -1
    ) {
      return res.status(404).json({
        success: false,
        message:
          "Community incident not found.",
      });
    }

    incidents[index].status =
      status;

    if (
      status ===
      "ASSIGNED"
    ) {
      incidents[index].assignedTo =
        req.body
          ?.assignedTo ||
        req.user.id;
    }

    incidents[index].updatedAt =
      new Date().toISOString();

    saveIncidents(
      incidents
    );

    const events =
      getEvents();

    const eventIndex =
      events.findIndex(
        (event) =>
          event.type ===
            "COMMUNITY_INCIDENT" &&
          event.payload
            ?.incidentId ===
            req.params.id
      );

    if (
      eventIndex >=
      0
    ) {
      events[
        eventIndex
      ].status =
        status;

      if (
        status ===
        "ASSIGNED"
      ) {
        events[
          eventIndex
        ].assignedTo =
          req.body
            ?.assignedTo ||
          req.user.id;
      }

      events[
        eventIndex
      ].updatedAt =
        new Date().toISOString();

      saveEvents(
        events
      );
    }

    res.json({
      success: true,
      incident:
        incidents[index],
    });
  }
);

app.post(
  "/api/authority/community-incidents/:id/note",
  requireAuth,
  requireAuthority,
  (req, res) => {
    const text =
      String(
        req.body?.note ||
          ""
      ).trim();

    if (!text) {
      return res.status(400).json({
        success: false,
        message:
          "Note cannot be empty.",
      });
    }

    const incidents =
      getIncidents();

    const index =
      incidents.findIndex(
        (incident) =>
          incident.id ===
          req.params.id
      );

    if (
      index === -1
    ) {
      return res.status(404).json({
        success: false,
        message:
          "Community incident not found.",
      });
    }

    incidents[
      index
    ].notes = [
      ...(incidents[
        index
      ].notes || []),
      {
        text,
        by:
          req.user.id,
        byName:
          req.user.name,
        createdAt:
          new Date().toISOString(),
      },
    ];

    incidents[
      index
    ].updatedAt =
      new Date().toISOString();

    saveIncidents(
      incidents
    );

    res.status(201).json({
      success: true,
      incident:
        incidents[index],
    });
  }
);

/* =====================================================
   AUTHORITY RESCUE CASES
===================================================== */

app.get(
  "/api/authority/rescue-cases",
  requireAuth,
  requireAuthority,
  (req, res) => {
    const scenarioId = String(req.query?.scenarioId || "");
    const events =
      getEvents().filter((event) => eventMatchesScenario(event, scenarioId));

    const users =
      getUsers();

    const resources =
      scenarioResources(scenarioId);

    const active =
      events.filter(
        (event) =>
          (
            event.type ===
              "SOS" ||
            event.type ===
              "WELFARE"
          ) &&
          event.status !==
            "RESOLVED" &&
          event.status !==
            "REJECTED"
      );

    const cases =
      active.map(
        (event) => {
          const citizen =
            users.find(
              (user) =>
                user.id ===
                event.citizenId
            );

          const household =
            getHousehold(
              event.citizenId
            ) ||
            event.payload
              ?.household ||
            null;

          const location =
            normalizeLocation(
              event.payload
                ?.location
            ) ||
            normalizeLocation(
              getLatestLocation(
                event.citizenId
              )?.location
            );

          const nearest =
            location
              ? resources
                  .map(
                    (
                      resource
                    ) => ({
                      ...resource,
                      distance:
                        Number(
                          distanceKm(
                            location.lat,
                            location.lon,
                            resource.lat,
                            resource.lon
                          ).toFixed(
                            2
                          )
                        ),
                    })
                  )
                  .sort(
                    (a, b) =>
                      a.distance -
                      b.distance
                  )
                  .slice(
                    0,
                    6
                  )
              : [];

          return {
            id:
              event.id,

            citizen: {
              id:
                citizen?.id ||
                event.citizenId ||
                "UNKNOWN",

              name:
                citizen?.name ||
                "Citizen",

              phone:
                citizen?.phone ||
                "",

              email:
                citizen?.email ||
                "",
            },

            eventType:
              event.type,

            priority:
              event.priority ||
              "NORMAL",

            status:
              event.status ||
              "NEW",

            createdAt:
              event.createdAt,

            sosTime:
              event.payload
                ?.sosTime ||
              event.createdAt,

            sosLocation:
              location
                ? {
                    latitude:
                      location.lat,
                    longitude:
                      location.lon,
                    accuracy:
                      location.accuracy,
                    capturedAt:
                      location.timestamp,
                  }
                : null,

            household,

            risk:
              event.payload
                ?.risk ??
              null,

            connectivity:
              event.payload
                ?.connectivity ||
              "UNKNOWN",

            emergencyState:
              event.payload
                ?.emergencyState ||
              "UNKNOWN",

            nearestHelp:
              nearest,

            notes:
              event.notes ||
              [],

            assignedTo:
              event.assignedTo ||
              null,

            resilience:
              calculateResilience(
                household,
                event.payload
                  ?.connectivity ||
                  "UNKNOWN",
                Boolean(
                  household?.emergencyContact ||
                  citizen?.phone
                )
              ),
          };
        }
      );

    res.json({
      success: true,
      cases,
    });
  }
);

/* =====================================================
   AUTHORITY SUMMARY
===================================================== */

app.get(
  "/api/authority/summary",
  requireAuth,
  requireAuthority,
  (req, res) => {
    const scenarioId = String(req.query?.scenarioId || "");
    const events =
      getEvents().filter((event) => eventMatchesScenario(event, scenarioId));

    const resources =
      scenarioResources(scenarioId);

    const openSOS =
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
              "CONNECTIVITY_CHANGE"
          ) &&
          event.status !==
            "RESOLVED"
      );

    const reports =
      events.filter(
        (event) =>
          event.type ===
          "HAZARD_REPORT"
      );

    const incidents =
      getIncidents().filter(
        (incident) =>
          incidentMatchesScenario(incident, scenarioId) &&
          incident.status !==
          "RESOLVED"
      );

    const availableShelterSpaces =
      resources
        .filter(
          (resource) =>
            resource.type ===
            "shelter"
        )
        .reduce(
          (
            total,
            resource
          ) =>
            total +
            Math.max(
              0,
              resource.capacity -
                resource.occupied
            ),
          0
        );

    res.json({
      success: true,
      summary: {
        criticalSOS:
          openSOS.filter(
            (event) =>
              event.priority ===
              "CRITICAL"
          ).length,

        openSOS:
          openSOS.length,

        welfareConcerns:
          welfare.length,

        groundReports:
          reports.length,

        communityIncidents:
          incidents.length,

        availableShelterSpaces,
      },
    });
  }
);



function getAiGatewayConfig() {
  const geminiKey = String(process.env.GEMINI_API_KEY || "").trim();
  const geminiModel = String(process.env.GEMINI_MODEL || "gemini-3.5-flash-lite").trim();
  const geminiBaseUrl = String(
    process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta"
  ).trim().replace(/\/$/, "");

  if (geminiKey) {
    const generateUrl = `${geminiBaseUrl}/models/${encodeURIComponent(geminiModel)}:generateContent`;
    return {
      provider: "gemini",
      apiKey: geminiKey,
      apiKeyHeader: "x-goog-api-key",
      interactionsUrl: generateUrl,
      generateUrl,
      model: geminiModel,
    };
  }

  return {
    provider: "gateway",
    apiKey: String(process.env.AI_API_KEY || "").trim(),
    apiKeyHeader: String(process.env.AI_API_KEY_HEADER || "x-api-key").trim(),
    interactionsUrl: String(process.env.AI_INTERACTIONS_URL || "").trim(),
    generateUrl: String(process.env.AI_GENERATE_URL || "").trim(),
    model: String(process.env.AI_MODEL || "").trim(),
  };
}

function localRakshaChatFallback(message, context = {}) {
  const text = String(message || "").toLowerCase();
  const danger = Boolean(context?.dangerZoneActive);
  const warning = context?.warning || {};
  const risk = String(context?.risk?.level || "").toUpperCase();
  const language = String(context?.language || "en-IN").toLowerCase();
  const hindi = language.startsWith("hi") || /\b(kya|kaise|madad|khatra|surakshit|bachao|aag|paani|baadh|baarish|ghar|nikalna)\b/i.test(text);

  const immediate = /immediate|danger|help|sos|trapped|injur|fire|burn|stuck|following me|attack|unsafe|emergency|khatra|madad|bachao|phans|aag|hamla/i.test(text);
  const flood = /flood|water|flooded|rising water|baadh|paani|jalbharav/i.test(text);
  const fire = /fire|smoke|aag|dhua/i.test(text);
  const road = /road|blocked|bridge|traffic|sadak|raasta|pul/i.test(text);

  const steps = [];
  if (fire) {
    steps.push(hindi ? "Aag aur dhuẽ se door, kisi safe jagah par chale jaiye." : "Move away from the fire and smoke and get to a safer place.");
    steps.push(hindi ? "Lift ke bajay safe exit ka use karein, agar available ho." : "Use a safe exit rather than a lift, if one is available.");
  } else if (flood) {
    steps.push(hindi ? "Tez ya gehre paani mẽ na utarẽ aur flooded road cross na karẽ." : "Do not enter fast-moving or deep water, and avoid flooded roads.");
    steps.push(hindi ? "Bijli ke taar ya paani mẽ electrical danger se door rahẽ." : "Stay away from electrical wires and electrical hazards in water.");
  } else if (road) {
    steps.push(hindi ? "Blocked ya damaged raaste se bachkar safer route use karein." : "Avoid the blocked or damaged route and use a safer route if one is available.");
  } else if (immediate || danger || risk === "CRITICAL" || risk === "HIGH") {
    steps.push(hindi ? "Agar abhi turant khatra hai, safe jagah par jaiye aur RAKSHA SOS ka use karein." : "If you are in immediate danger, move to a safer place and use RAKSHA SOS.");
  } else {
    steps.push(hindi ? "Abhi di gayi RAKSHA safety guidance aur official instructions ko follow karein." : "Follow the RAKSHA safety guidance on screen and any official instructions.");
  }

  if (warning?.instructions?.length) {
    steps.push(hindi ? "Screen par diye gaye current warning instructions ko priority dein." : "Give priority to the current warning instructions shown on screen.");
  }

  const lead = hindi
    ? (immediate || danger ? "Aapki safety sabse pehle hai." : "Main aapko simple next step batata hoon.")
    : (immediate || danger ? "Your safety comes first." : "Here is the most useful next step.");

  return `${lead}\n\n${steps.slice(0, 3).map((x, i) => `${i + 1}. ${x}`).join("\n")}\n\n${hindi ? "Agar situation turant dangerous ho, RAKSHA SOS ya official emergency help ka use karein." : "If the situation becomes immediately dangerous, use RAKSHA SOS or official emergency help."}`;
}

function cleanAiAgentText(value) {
  let text = String(value || "").trim();
  if (!text) return "";
  text = text.replace(/^```(?:json|text|markdown)?\s*/i, "").replace(/\s*```$/i, "").trim();
  if ((text.startsWith("{") && text.endsWith("}")) || (text.startsWith("[") && text.endsWith("]"))) {
    try {
      const parsed = JSON.parse(text);
      const candidate = parsed?.answer || parsed?.advice || parsed?.message || parsed?.response || parsed?.text;
      if (typeof candidate === "string") text = candidate.trim();
    } catch {
      // Keep the original text when it is not valid JSON.
    }
  }
  text = text
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/\b(SYSTEM|INPUT|OUTPUT|FUNCTION|TOOL CALL|DEBUG|MODEL RESPONSE)\s*:/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
  return text;
}

function buildFriendlyAgentFallback(role, context = {}) {
  const warning = context?.warning || {};
  const danger = Boolean(context?.dangerZoneActive);
  const risk = String(context?.risk?.level || "").toUpperCase();
  const citizen = String(role || "CITIZEN").toUpperCase() === "CITIZEN";

  if (citizen) {
    if (danger || risk === "CRITICAL" || risk === "HIGH") {
      return "Your safety comes first. Move to a safer place if you can do so safely, follow the current warning on screen, and use SOS if you need immediate help. If official instructions are available, follow them.";
    }
    if (warning?.hazardType || warning?.type) {
      return `RAKSHA is showing a ${warning.hazardType || warning.type} warning for this area. Follow the warning instructions, avoid unsafe routes, and use the nearest suitable help or shelter if needed.`;
    }
    return "Follow the current RAKSHA safety guidance and official instructions. If the situation becomes immediately dangerous, use SOS or contact official emergency help.";
  }

  const observations = [];
  if (Array.isArray(context?.openSOS) && context.openSOS.length) observations.push(`${context.openSOS.length} active SOS request${context.openSOS.length === 1 ? "" : "s"}`);
  if (Array.isArray(context?.welfareEvents) && context.welfareEvents.length) observations.push(`${context.welfareEvents.length} welfare case${context.welfareEvents.length === 1 ? "" : "s"}`);
  if (Array.isArray(context?.communityIncidents) && context.communityIncidents.length) observations.push(`${context.communityIncidents.length} community report${context.communityIncidents.length === 1 ? "" : "s"}`);
  const lead = observations.length ? `Current RAKSHA information shows ${observations.join(", ")}.` : "No high-priority response signal is visible in the information provided.";
  return `${lead} Review the highest-priority case first, check the available local resources, and follow authorized official procedures. RAKSHA provides decision support only; no response action is taken automatically.`;
}

function extractGeminiText(data) {
  return Array.isArray(data?.candidates?.[0]?.content?.parts)
    ? data.candidates[0].content.parts
        .filter((part) => typeof part?.text === "string")
        .map((part) => part.text)
        .join("")
        .trim()
    : "";
}

async function callAiInteractions(aiGateway, { systemInstruction, input }) {
  if (aiGateway.provider === "gemini") {
    const response = await fetch(aiGateway.interactionsUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": aiGateway.apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: [{ role: "user", parts: [{ text: input }] }],
        generationConfig: { responseMimeType: "text/plain" },
      }),
    });
    const data = await response.json().catch(() => ({}));
    return { response, data, outputText: extractGeminiText(data) };
  }

  const response = await fetch(aiGateway.interactionsUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      [aiGateway.apiKeyHeader]: aiGateway.apiKey,
    },
    body: JSON.stringify({
      model: aiGateway.model,
      system_instruction: systemInstruction,
      input,
      store: false,
    }),
  });
  const data = await response.json().catch(() => ({}));
  let outputText = typeof data.output_text === "string" ? data.output_text.trim() : "";
  if (!outputText && Array.isArray(data.steps)) {
    for (const step of data.steps) {
      if (step?.type !== "model_output" || !Array.isArray(step.content)) continue;
      for (const block of step.content) {
        if (block?.type === "text" && typeof block.text === "string") outputText += block.text;
      }
    }
  }
  return { response, data, outputText: outputText.trim() };
}

/* =====================================================
   RAKSHA AI REPORT INTERPRETATION
===================================================== */

app.post(
  "/api/ai/interpret-report",
  requireAuth,
  async (req, res) => {
    try {
      const aiGateway = getAiGatewayConfig();
      const apiKey = aiGateway.apiKey;

      const text =
        typeof req.body?.text === "string"
          ? req.body.text.trim()
          : "";

      const language =
        typeof req.body?.language === "string"
          ? req.body.language
          : "en-IN";

      const location =
        req.body?.location &&
        typeof req.body.location === "object"
          ? req.body.location
          : null;

      if (!text) {
        return res.status(400).json({
          success: false,
          message: "Report text is required.",
        });
      }

      if (!apiKey || !aiGateway.interactionsUrl || !aiGateway.model) {
        return res.json({
          success: true,
          reportType: "Citizen report",
          severity: "HIGH",
          summary: "",
          aiUsed: false,
        });
      }

      const systemInstruction = `
You are RAKSHA REPORT INTERPRETER.

Convert a citizen's free-form emergency report into structured evidence for human-authority review.
Do not dispatch anyone, declare an emergency, declare a person safe or missing, or make an operational decision.
Do not invent facts.
Preserve uncertainty.
The original citizen text is always retained.

Return ONLY valid JSON with exactly these fields:
{
  "reportType": "Flooded road | Rising water | Blocked road | Infrastructure damage | Fire | Landslide | Cyclone damage | Other hazard",
  "severity": "NORMAL | HIGH | CRITICAL",
  "summary": "brief factual summary in English",
  "language": "input language code"
}

Use CRITICAL only when the text clearly describes immediate life-threatening danger, injury, trapped people, fire, collapse, or a similar immediate threat.
Use HIGH for substantial disruption or significant hazard.
Use NORMAL for low-severity observations.
`;

      const input = [
        `INPUT LANGUAGE: ${language}`,
        `LOCATION: ${JSON.stringify(location || {})}`,
        `CITIZEN REPORT: ${text}`,
      ].join("\\n");

      const { response, data, outputText } = await callAiInteractions(aiGateway, {
        systemInstruction,
        input,
      });

      if (!response.ok) {
        console.error("RAKSHA report interpretation error:", data);
        return res.json({
          success: true,
          reportType: "Citizen report",
          severity: "HIGH",
          summary: "",
          aiUsed: false,
        });
      }

      let output = outputText;
      let parsed = null;
      try {
        parsed = JSON.parse(output);
      } catch {
        parsed = null;
      }

      const allowedTypes = new Set([
        "Flooded road",
        "Rising water",
        "Blocked road",
        "Infrastructure damage",
        "Fire",
        "Landslide",
        "Cyclone damage",
        "Other hazard",
      ]);

      const allowedSeverity = new Set([
        "NORMAL",
        "HIGH",
        "CRITICAL",
      ]);

      const reportType = allowedTypes.has(
        parsed?.reportType
      )
        ? parsed.reportType
        : "Other hazard";

      const severity = allowedSeverity.has(
        parsed?.severity
      )
        ? parsed.severity
        : "HIGH";

      const summary =
        typeof parsed?.summary === "string"
          ? parsed.summary.slice(0, 500)
          : "";

      return res.json({
        success: true,
        reportType,
        severity,
        summary,
        language,
        aiUsed: true,
      });
    } catch (error) {
      console.error("RAKSHA report interpretation failed:", error);
      return res.json({
        success: true,
        reportType: "Other hazard",
        severity: "HIGH",
        summary: "",
        aiUsed: false,
      });
    }
  }
);

/* =====================================================
   RAKSHA AI CHAT
   The configured AI gateway is called only from the server;
   its credentials never reach the browser.
===================================================== */

app.post(
  "/api/ai/chat",
  requireAuth,
  async (req, res) => {
    try {
      const aiGateway = getAiGatewayConfig();
      const apiKey = aiGateway.apiKey;

      if (!apiKey || !aiGateway.generateUrl) {
        return res.json({
          success: true,
          answer: localRakshaChatFallback(req.body?.message, req.body?.context),
          aiUsed: false,
          mode: "local",
        });
      }

      const message =
        typeof req.body?.message === "string"
          ? req.body.message.trim()
          : "";

      const context =
        req.body?.context &&
        typeof req.body.context === "object"
          ? req.body.context
          : {};

      const history =
        Array.isArray(req.body?.history)
          ? req.body.history
              .filter(
                (turn) =>
                  turn &&
                  (turn.role === "user" ||
                    turn.role === "assistant") &&
                  typeof turn.text === "string"
              )
              .slice(-10)
          : [];

      if (!message) {
        return res.status(400).json({
          success: false,
          message:
            "Message is required.",
        });
      }

      const isNewConversation =
        history.length === 0;

      const systemInstruction = `
You are RAKSHA AI, the conversational assistant inside the RAKSHA disaster-resilience platform.

Help the citizen understand their current situation and choose the safest practical next step using only the RAKSHA information provided.

CONVERSATION:
${
  isNewConversation
    ? `
This is the first message of a new conversation or the first message after chat was cleared.
You may use ONE brief, natural greeting in the user's own language and script.
Then answer immediately.
`
    : `
This is an ongoing conversation.
Do NOT greet the citizen again.
Do NOT start with Hello, Hi, Namaste, Welcome, Dear citizen, Good morning, or similar salutations.
Start directly with the useful answer.
`
}

NATURAL, USER-FRIENDLY STYLE:
- Sound like a helpful human assistant, not a government notice or scripted chatbot.
- Understand the intent behind the question.
- Answer the exact question first.
- Use recent conversation history for follow-up questions.
- Do not restart the explanation on every turn.
- Do not repeat the user's question.
- Do not introduce yourself unless asked.
- Avoid filler such as "Certainly", "Of course", "I understand", "Sure", "As an AI", or "I am here to help".
- Avoid unnecessary formal language, long disclaimers, and repeated summaries.
- Keep normal answers short, clear, and practical.
- Use 1-4 short paragraphs unless a few steps make the answer clearer.
- Do not end every answer with a generic invitation for more questions.

LANGUAGE AND SCRIPT:
- English -> English.
- Hindi or Hinglish -> natural Hinglish in Latin/Roman script by default, even when the citizen typed Hindi in Devanagari.
- Use Devanagari Hindi only when the citizen explicitly asks for Hindi script / Devanagari.
- Preserve the writing script for Bengali, Gujarati, Kannada, Malayalam, Marathi, Odia, Punjabi, Tamil, Telugu, Urdu, and other recognizable non-Hindi languages where practical.
- For mixed-language input, follow the dominant language, while keeping Hindi/Hinglish in natural Roman script unless the citizen requests Devanagari.

SAFETY:
- When the supplied situation calls for a precaution, include the most relevant practical action.
- Do not only describe a hazard when the citizen needs to know what to do.
- Do not give a generic disaster checklist.
- For flooding/rising water: advise avoiding fast-moving water, flooded roads, unsafe crossings, and electrical hazards when relevant.
- For fire: advise moving away from fire and smoke and following official emergency instructions.
- For damaged or unstable structures: advise moving away and avoiding entry.
- For blocked/damaged roads: advise avoiding the obstruction and using a safer RAKSHA route when available.
- For evacuation: advise following official instructions and using the recommended safer route or suitable shelter.
- For immediate danger: put the urgent action first and recommend SOS when appropriate.
- Do not create panic or exaggerate risk.

GROUNDING:
- Use ONLY the supplied RAKSHA context and recent conversation.
- The deterministic RAKSHA safety engine is the source of truth for risk level, danger-zone state, shelter availability, and operational status.
- Never invent warnings, shelters, routes, capacities, locations, emergency services, contacts, verification results, or authority actions.
- Never claim RAKSHA contacted authorities, dispatched responders, verified a report, changed a case status, rescued someone, or declared someone safe or missing unless explicitly supplied.
- Preserve uncertainty when information is missing or stale.
- Never override official emergency instructions.

HUMAN CONTROL:
- RAKSHA AI is advisory and conversational.
- It does not independently execute operational actions.
- Human and authorized control is retained.
- Mention this only when relevant, not in every answer.

RESPONSE PRIORITY:
1. Answer the user's actual question.
2. Give the most relevant precaution or next action when needed.
3. Mention important uncertainty only when it affects the answer.
4. Keep it concise and natural.

Think like a good human emergency assistant:
Understand -> Answer -> Guide.
`;
  const contents = [];

      for (const turn of history) {
        contents.push({
          role:
            turn.role === "assistant"
              ? "model"
              : "user",
          parts: [
            {
              text: String(
                turn.text
              ).slice(0, 1200),
            },
          ],
        });
      }

      const currentPrompt = [
        "RAKSHA CURRENT CONTEXT:",
        JSON.stringify(context),
        "",
        "CITIZEN MESSAGE:",
        message,
      ].join("\n");

      contents.push({
        role: "user",
        parts: [
          {
            text: currentPrompt,
          },
        ],
      });

      const controller =
        new AbortController();

      const timeoutId =
        setTimeout(
          () => controller.abort(),
          15000
        );

      let response;

      try {
        response = await fetch(
          aiGateway.generateUrl,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
              [aiGateway.apiKeyHeader]: apiKey,
            },
            body: JSON.stringify({
              systemInstruction: {
                parts: [
                  {
                    text:
                      systemInstruction,
                  },
                ],
              },
              contents,
              generationConfig: {
                temperature: 0.2,
                maxOutputTokens: 350,
              },
            }),
            signal: controller.signal,
          }
        );
      } finally {
        clearTimeout(
          timeoutId
        );
      }

      const data =
        await response.json();

      if (!response.ok) {
        console.error(
          "RAKSHA AI gateway error:",
          { status: response.status, data }
        );

        return res.json({
          success: true,
          answer: localRakshaChatFallback(message, context),
          aiUsed: false,
          mode: response.status === 429 ? "local-quota" : "local-fallback",
        });
      }

      const answer =
        Array.isArray(
          data?.candidates?.[0]
            ?.content?.parts
        )
          ? data.candidates[0].content.parts
              .filter(
                (part) =>
                  typeof part?.text ===
                  "string"
              )
              .map(
                (part) =>
                  part.text
              )
              .join("")
          : "";

      if (!answer.trim()) {
        return res.status(502).json({
          success: false,
          message:
            "RAKSHA AI could not generate a response right now.",
        });
      }

      return res.json({
        success: true,
        answer:
          answer.trim(),
      });
    } catch (error) {
      console.error(
        "RAKSHA AI request failed:",
        error
      );

      return res.json({
        success: true,
        answer: localRakshaChatFallback(req.body?.message, req.body?.context),
        aiUsed: false,
        mode: error?.name === "AbortError" ? "local-timeout" : "local-fallback",
      });
    }
  }
);


/* =====================================================
   RAKSHA AI RESPONSE AGENT — ADVISORY ONLY
===================================================== */

app.post(
  "/api/ai/agent/advice",
  requireAuth,
  async (req, res) => {
    try {
      const aiGateway = getAiGatewayConfig();
      const apiKey = aiGateway.apiKey;
      const role = String(
        req.body?.role || "CITIZEN"
      ).toUpperCase();
      const context =
        req.body?.context &&
        typeof req.body.context === "object"
          ? req.body.context
          : {};

      if (!apiKey || !aiGateway.interactionsUrl || !aiGateway.model) {
        const warning =
          context.warning || {};
        const observations = [];
        const nextSteps = [];

        if (context.dangerZoneActive) {
          observations.push(
            "Citizen location is inside an active danger zone."
          );
          nextSteps.push(
            "Review evacuation guidance and the nearest suitable shelter."
          );
        }

        if (
          context.connectivity ===
          "OFFLINE"
        ) {
          observations.push(
            "Connectivity is currently offline."
          );
          if (
            context.dangerZoneActive
          ) {
            nextSteps.push(
              "Review the welfare signal because connectivity was lost inside the affected area."
            );
          } else {
            nextSteps.push(
              "Do not treat offline status alone as an emergency."
            );
          }
        }

        if (context.household) {
          const household =
            context.household;
          const vulnerable =
            Number(
              household.children || 0
            ) +
            Number(
              household.elderly || 0
            ) +
            Number(
              household.mobilityNeeds || 0
            );

          if (vulnerable > 0) {
            observations.push(
              `Household includes ${vulnerable} vulnerable member${
                vulnerable === 1
                  ? ""
                  : "s"
              }.`
            );
            nextSteps.push(
              "Consider accessibility and assistance needs before evacuation."
            );
          }
        }

        if (
          Array.isArray(
            context.nearbyCommunityIncidents
          ) &&
          context.nearbyCommunityIncidents
            .length
        ) {
          observations.push(
            `${context.nearbyCommunityIncidents.length} nearby community incident signal${
              context.nearbyCommunityIncidents.length ===
              1
                ? ""
                : "s"
            } are available.`
          );
          nextSteps.push(
            "Review corroborated ground reports before operational action."
          );
        }

        if (context.risk?.level) {
          observations.push(
            `RAKSHA risk assessment: ${context.risk.level} (${
              context.risk.score ??
              "n/a"
            }/100).`
          );
        }

        if (
          warning.hazardType ||
          warning.type
        ) {
          observations.push(
            `${warning.hazardType || warning.type} warning severity is ${
              warning.severity ||
              "UNKNOWN"
            }.`
          );
        }

        if (!observations.length) {
          observations.push(
            "No high-priority operational signal is present in the supplied RAKSHA context."
          );
        }

        if (!nextSteps.length) {
          nextSteps.push(
            "Continue monitoring current RAKSHA signals and official instructions."
          );
        }

        const advice = buildFriendlyAgentFallback(role, context);

        return res.json({
          success: true,
          advisoryOnly: true,
          advice,
          generatedAt:
            new Date().toISOString(),
          aiUsed: false,
        });
      }

      const systemInstruction = `
You are RAKSHA, a calm and helpful safety assistant.

Use only the information supplied by RAKSHA. Give a direct, practical answer in simple everyday language. Never invent facts. Never claim that emergency services, family members, rescue teams, notifications, or other actions happened unless the supplied information confirms it. Do not take actions, change statuses, change resources, dispatch anyone, or override official instructions.

ROLE: ${role}

If the role is CITIZEN, speak like a trusted safety helper: short natural paragraphs or simple numbered steps, clear and reassuring without being casual or alarmist.
If the role is AUTHORITY, give a short practical situation summary, the most important things to review, and sensible next steps. Keep human/authorized control with the authority.

Do not output JSON, XML, code, tables, API syntax, variable names, field names, debug logs, or computer-style labels. Do not use labels such as SYSTEM, INPUT, OUTPUT, FUNCTION, TOOL CALL, DEBUG, MODEL RESPONSE, SITUATION, KEY OBSERVATIONS, RECOMMENDED NEXT STEPS, or CONTROL NOTE. Avoid unnecessary headings. Do not repeat the supplied data. Keep the response concise and natural.
`;

      const { response, data, outputText } = await callAiInteractions(aiGateway, {
        systemInstruction,
        input: JSON.stringify(context, null, 2),
      });
      if (!response.ok) {
        console.error("RAKSHA AI Agent error:", data);
        return res.json({
          success: true,
          advisoryOnly: true,
          advice: buildFriendlyAgentFallback(role, context),
          generatedAt: new Date().toISOString(),
          aiUsed: false,
        });
      }

      let advice = cleanAiAgentText(outputText);
      if (!advice) advice = buildFriendlyAgentFallback(role, context);

      return res.json({
        success: true,
        advisoryOnly: true,
        advice,
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("RAKSHA AI Agent request failed:", error);
      return res.json({
        success: true,
        advisoryOnly: true,
        advice: buildFriendlyAgentFallback(role, context),
        generatedAt: new Date().toISOString(),
        aiUsed: false,
      });
    }
  }
);

/* =====================================================
   SERVER
===================================================== */

app.listen(
  PORT,
  () => {
    console.log("");
    console.log(
      "======================================"
    );
    console.log(
      "       RAKSHA BACKEND SERVER"
    );
    console.log(
      "======================================"
    );
    console.log(
      `Server: http://localhost:${PORT}`
    );
    console.log(
      `Health: http://localhost:${PORT}/api/health`
    );
    console.log("");
    console.log(
      "Demo Authority:"
    );
    console.log(
      "Email: authority@raksha.demo"
    );
    console.log(
      "Password: Raksha@123"
    );
    console.log("");
    console.log(
      "Hazard Reports: ENABLED"
    );
    console.log(
      "Community Ground Truth: ENABLED"
    );
    console.log("");
  }
);