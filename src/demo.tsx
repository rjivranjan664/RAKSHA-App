import { useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { CitizenDashboard, AuthorityDashboard, Login, INITIAL_SHELTERS, DEFAULT_HOUSEHOLD, type Shelter } from "./main";

// Demo-only fixtures. This entry never calls the application backend or any external AI service.
const now = () => new Date().toISOString();
const warning = {
  id: "design-warning", hazardType: "Flood", severity: "HIGH", status: "ACTIVE",
  source: "RAKSHA demonstration", sourceStatus: "DEMO", issuedAt: now(),
  expiresAt: new Date(Date.now() + 86400000).toISOString(),
  affectedArea: { type: "Polygon", coordinates: [[[78.638,22.988],[78.676,22.992],[78.682,22.966],[78.649,22.955],[78.634,22.972],[78.638,22.988]]] },
  instructions: ["Follow verified instructions from your local authority.", "Avoid flooded roads and moving water.", "Keep your household and emergency contact information ready."]
};
let demoHousehold = { ...DEFAULT_HOUSEHOLD, mobilityNeeds: 1 };
let demoShelters = INITIAL_SHELTERS.map(s => ({ ...s }));
const demoLocation = { lat: 22.9734, lon: 78.6569 };
const demoScenarioContext: any = {
  locationMode: "DEMO_FALLBACK",
  viewerLocation: demoLocation,
  scenario: {
    id: "DESIGN-DEMO-AREA",
    areaLabel: "Design demo operating area",
    center: demoLocation,
    hazardType: "FLOOD",
    warning,
    resources: demoShelters,
    shelters: demoShelters,
    demoHazards: [
      { id: "design-hazard", type: "Rising water", location: { lat: 22.9762, lon: 78.6638 }, severity: "HIGH", createdAt: now(), scenarioId: "DESIGN-DEMO-AREA" }
    ],
    evacuationRoute: [
      demoLocation,
      { lat: 22.9805, lon: 78.6672 },
      { lat: 22.985, lon: 78.671 }
    ],
    generatedAt: now(),
    updatedAt: now()
  }
};
let events: any[] = [{id:"design-report", type:"HAZARD_REPORT", citizenId:"DEMO-041", status:"ACKNOWLEDGED", priority:"HIGH", createdAt:now(), payload:{reportType:"Rising water", description:"Demonstration report for interface review", location:{lat:22.975,lon:78.662}}}];
const realFetch = window.fetch.bind(window);
window.fetch = async (input, init) => {
  const raw = input instanceof Request ? input.url : String(input);
  const url = new URL(raw, window.location.href);
  if (!url.pathname.startsWith("/api/")) return realFetch(input, init);
  const path = url.pathname;
  const body = typeof init?.body === "string" ? JSON.parse(init.body) : {};
  let data: any = {success:true};
  if (path.includes("/auth/")) data = {success:false,message:"Use the Citizen / Authority controls in the design demo. Real sign-in is available in the main application."};
  else if (path === "/api/demo/scenario/resolve") Object.assign(data, demoScenarioContext);
  else if (path.startsWith("/api/demo/scenario/") && path.endsWith("/check")) Object.assign(data,{warning,insideDangerZone:true});
  else if (path.startsWith("/api/demo/scenario/") && path.includes("/shelter/")) {
    const resourceId = decodeURIComponent(path.split("/shelter/")[1] || "");
    demoShelters = demoShelters.map((s) => s.id === resourceId ? { ...s, ...body } : s);
    data.resource = demoShelters.find((s) => s.id === resourceId);
    data.scenario = { ...demoScenarioContext.scenario, resources: demoShelters, shelters: demoShelters };
  }
  else if (path === "/api/household") {
    if (init?.method === "POST") demoHousehold = {...demoHousehold,...body};
    data.household = demoHousehold;
  } else if (path === "/api/warnings/active") data.warnings = [warning];
  else if (path === "/api/warnings/check") Object.assign(data,{warnings:[warning],insideDangerZone:true});
  else if (path.includes("/resources")) {
    if (path.includes("/shelter/")) demoShelters = demoShelters.map(s => s.id === path.split("/").pop() ? {...s,...body} : s);
    Object.assign(data,{resources:demoShelters,shelters:demoShelters,resource:demoShelters.find(s => s.id === path.split("/").pop())});
  } else if (path === "/api/ai/chat") {
    data.answer = "This is a sample RAKSHA response for the design demo. Your dashboard shows your safety information, current warnings and nearby help. In the live app, the available AI service provides the response. Audio only plays when you choose it.";
    data.aiUsed = false;
  } else if (path === "/api/ai/agent/advice") Object.assign(data,{advice:"For this demo, please review the warning, keep your safety information up to date, and follow official instructions. This sample does not contact an external AI service.",generatedAt:now()});
  else if (path === "/api/ai/interpret-report") Object.assign(data,{summary:body.text || "Sample report",reportType:"Rising water",aiUsed:false});
  else if (path.startsWith("/api/events/")) {
    const type = ({sos:"SOS",report:"HAZARD_REPORT",welfare:"WELFARE","safe-checkin":"SAFE_CHECKIN",connectivity:"CONNECTIVITY","ai-assessment":"AI_ASSESSMENT"} as Record<string,string>)[path.split("/").pop()!] || "EVENT";
    const event = {id:`demo-${Date.now()}`,type,citizenId:"DEMO-041",priority:"HIGH",status:"NEW",createdAt:now(),payload:body};
    events = [event,...events]; data.event = event;
  } else if (path.endsWith("/events")) data.events = events;
  else if (path.includes("/rescue-cases")) data.cases = [];
  else if (path.includes("/hazard-reports")) data.reports = [];
  else if (path.includes("/response-priority")) data.items = [];
  else if (path.includes("/human-concentration")) data.clusters = [];
  else if (path.includes("/community-incidents")) data.incidents = [];
  return new Response(JSON.stringify(data), {status:200,headers:{"Content-Type":"application/json"}});
};

function Demo() {
  const initial = new URLSearchParams(location.search).get("portal");
  const [portal,setPortal] = useState(initial === "authority" || initial === "login" ? initial : "citizen");
  const [shelters,setShelters] = useState<Shelter[]>(demoShelters);
  const user = { id:"DEMO-041",name:"Demo Citizen",role:"CITIZEN",accountType:"CITIZEN",jurisdiction:"Location-aware demo area" };
  const logout = () => setPortal("login");
  return <>
    <div className="design-demo-banner"><strong>DESIGN DEMO</strong><span>Sample data · No real emergency requests or AI calls</span><div>
      <button onClick={()=>setPortal("citizen")} aria-pressed={portal === "citizen"}>Citizen</button>
      <button onClick={()=>setPortal("authority")} aria-pressed={portal === "authority"}>Authority</button>
      <button onClick={()=>setPortal("login")} aria-pressed={portal === "login"}>Sign-in design</button>
    </div></div>
    {portal === "citizen" ? (
      <CitizenDashboard
        user={user}
        token="design-demo"
        logout={logout}
        shelters={shelters}
        scenarioContext={{...demoScenarioContext, scenario:{...demoScenarioContext.scenario, resources:shelters, shelters}}}
        onRefreshScenario={async()=>{}}
      />
    ) : portal === "authority" ? (
      <AuthorityDashboard
        user={{...user,name:"Demo Officer",role:"AUTHORITY",accountType:"AUTHORITY"}}
        token="design-demo"
        logout={logout}
        shelters={shelters}
        setShelters={setShelters}
        scenarioContext={{...demoScenarioContext, scenario:{...demoScenarioContext.scenario, resources:shelters, shelters}}}
        onRefreshScenario={async()=>{}}
      />
    ) : <Login onLogin={()=>setPortal("citizen")}/>}
  </>;
}
const root: Root = import.meta.hot?.data.root ?? createRoot(document.getElementById("root")!);
if (import.meta.hot) {
  import.meta.hot.data.root = root;
  import.meta.hot.dispose(() => { window.fetch = realFetch; });
}
root.render(<Demo/>);
