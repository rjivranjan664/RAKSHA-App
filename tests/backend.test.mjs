import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, rm, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { once } from "node:events";
import { fileURLToPath } from "node:url";

test("location-aware RAKSHA keeps one shared scenario and preserves SOS/report workflows", async () => {
  const dir = await mkdtemp(join(tmpdir(), "raksha-check-"));
  const socket = createServer();
  await new Promise((resolve) => socket.listen(0, "127.0.0.1", resolve));
  const port = socket.address().port;
  await new Promise((resolve) => socket.close(resolve));

  const source = await readFile(new URL("../Server/server.cjs", import.meta.url), "utf8");
  await writeFile(join(dir, "server.cjs"), source);
  await mkdir(join(dir, "Data"), { recursive: true });

  const server = spawn(process.execPath, [join(dir, "server.cjs")], {
    env: {
      ...process.env,
      PORT: String(port),
      NODE_PATH: fileURLToPath(new URL("../node_modules", import.meta.url)),
      AI_API_KEY: "",
      SMS_GATEWAY_URL: "",
      SMS_GATEWAY_API_KEY: "",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let errorOutput = "";
  server.stderr.on("data", (data) => { errorOutput += data; });

  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Backend did not start: " + errorOutput)), 7000);
      server.stdout.on("data", (data) => {
        if (String(data).includes("Server:")) {
          clearTimeout(timer);
          resolve();
        }
      });
      server.on("exit", () => {
        clearTimeout(timer);
        reject(new Error(errorOutput));
      });
    });

    const call = async (path, method = "GET", body, token) => {
      const response = await fetch(`http://127.0.0.1:${port}${path}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      return { status: response.status, data: await response.json() };
    };

    assert.equal((await call("/api/health")).status, 200);

    const reg = await call("/api/auth/register", "POST", {
      name: "Verification Citizen",
      email: "verification@example.test",
      password: "Test-only-8391!",
      phone: "",
    });
    assert.ok(reg.data.success);

    const citizen = await call("/api/auth/login", "POST", {
      email: "verification@example.test",
      password: "Test-only-8391!",
    });
    assert.ok(citizen.data.token);
    const citizenToken = citizen.data.token;

    const officer = await call("/api/auth/login", "POST", {
      email: "authority@raksha.demo",
      password: "Raksha@123",
    });
    assert.ok(officer.data.token);
    const officerToken = officer.data.token;

    const delhiLocation = { lat: 28.6139, lon: 77.2090, accuracy: 25 };
    const nearbyDelhiLocation = { lat: 28.62, lon: 77.22, accuracy: 40 };
    const mumbaiLocation = { lat: 19.0760, lon: 72.8777, accuracy: 30 };

    const citizenScenario = await call(
      "/api/demo/scenario/resolve",
      "POST",
      { location: delhiLocation },
      citizenToken
    );
    const authorityScenario = await call(
      "/api/demo/scenario/resolve",
      "POST",
      { location: nearbyDelhiLocation },
      officerToken
    );
    const otherScenario = await call(
      "/api/demo/scenario/resolve",
      "POST",
      { location: mumbaiLocation },
      officerToken
    );

    assert.equal(citizenScenario.status, 200);
    assert.equal(citizenScenario.data.scenario.id, authorityScenario.data.scenario.id);
    assert.notEqual(citizenScenario.data.scenario.id, otherScenario.data.scenario.id);
    assert.ok(citizenScenario.data.scenario.shelters.length >= 3);
    assert.ok(citizenScenario.data.scenario.warning.affectedArea);
    const scenarioId = citizenScenario.data.scenario.id;

    const household = await call(
      "/api/household",
      "POST",
      {
        adults: 2,
        children: 1,
        elderly: 1,
        mobilityNeeds: 1,
        emergencyContact: "+919999999999",
      },
      citizenToken
    );
    assert.equal(household.status, 200);

    assert.equal(
      (await call("/api/citizen/location", "POST", {
        location: delhiLocation,
        connectivity: "ONLINE",
        scenarioId,
      }, citizenToken)).status,
      200
    );

    const sos = await call("/api/events/sos", "POST", {
      location: delhiLocation,
      household: household.data.household,
      connectivity: "ONLINE",
      scenarioId,
    }, citizenToken);
    assert.equal(sos.status, 201);
    assert.equal(sos.data.event.payload.scenarioId, scenarioId);
    assert.equal(sos.data.familyNotification.accepted, false);
    assert.equal(sos.data.familyNotification.status, "NOT_CONFIGURED");

    const tinyPng = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB";
    const report = await call("/api/events/report", "POST", {
      location: delhiLocation,
      reportType: "Rising water",
      description: "Synthetic verification report",
      severity: "HIGH",
      scenarioId,
      media: [{ name: "evidence.png", type: "image/png", size: 24, data: tinyPng }],
    }, citizenToken);
    assert.equal(report.status, 201);
    assert.equal(report.data.event.payload.scenarioId, scenarioId);
    assert.equal(report.data.event.payload.media.length, 1);

    const filteredEvents = await call(
      `/api/authority/events?limit=200&scenarioId=${encodeURIComponent(scenarioId)}`,
      "GET",
      null,
      officerToken
    );
    assert.ok(filteredEvents.data.events.some((event) => event.type === "SOS"));
    assert.ok(filteredEvents.data.events.some((event) => event.type === "HAZARD_REPORT"));

    const otherEvents = await call(
      `/api/authority/events?limit=200&scenarioId=${encodeURIComponent(otherScenario.data.scenario.id)}`,
      "GET",
      null,
      officerToken
    );
    assert.equal(otherEvents.data.events.some((event) => event.citizenId === citizen.data.user?.id), false);

    const shelter = citizenScenario.data.scenario.shelters[0];
    const citizenUpdate = await call(
      `/api/demo/scenario/${encodeURIComponent(scenarioId)}/shelter/${encodeURIComponent(shelter.id)}`,
      "PUT",
      { occupied: Number(shelter.occupied) + 1 },
      citizenToken
    );
    assert.equal(citizenUpdate.status, 403);

    const authorityUpdate = await call(
      `/api/demo/scenario/${encodeURIComponent(scenarioId)}/shelter/${encodeURIComponent(shelter.id)}`,
      "PUT",
      { occupied: Number(shelter.occupied) + 1 },
      officerToken
    );
    assert.equal(authorityUpdate.status, 200);
    assert.equal(authorityUpdate.data.resource.occupied, Number(shelter.occupied) + 1);

    assert.equal((await call("/api/auth/logout", "POST", {}, citizenToken)).status, 200);
    assert.equal((await call("/api/household", "GET", null, citizenToken)).status, 401);
  } finally {
    if (server.exitCode === null && server.signalCode === null) {
      const exited = once(server, "exit");
      server.kill("SIGTERM");
      await exited;
    }
    await rm(dir, { recursive: true, force: true });
  }
});
