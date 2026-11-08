"use client";

import React, { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  Shield,
  Radio,
  AlertTriangle,
  Activity,
  Crosshair,
  ArrowRight,
  Bot,
  Database,
  Send,
  RefreshCw,
  Server,
  Cpu,
  Play,
  CheckCircle2,
  X,
  Globe,
  Layers,
  Zap,
  Terminal,
  FileText,
  Network,
  Clock,
} from "lucide-react";
import type { ThreatAlert, CameraPreset } from "./components/TacticalMap";
import IllicitTradeHub, { InvestigationCase } from "../components/IllicitTradeHub";
import EnterpriseModules from "../components/EnterpriseModules";

const TacticalMap = dynamic(() => import("./components/TacticalMap"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center h-full w-full bg-[#060a12] text-sky-400 space-y-3">
      <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
      <span className="font-mono text-xs tracking-widest uppercase">
        Initializing Hemispheric C4ISR Reconnaissance...
      </span>
    </div>
  ),
});

interface JurisdictionHandoff {
  handoff_id?: string;
  timestamp: string;
  target_id: string;
  from_ring: string;
  to_ring: string;
  from_agency: string;
  to_agency: string;
  last_known_lat: number;
  last_known_lon: number;
  reason: string;
}

interface MicroserviceInfo {
  service_id: string;
  name: string;
  port: number;
  ring: string;
  agencies: string[];
  model: string;
  description: string;
  status: string;
  latency_ms: number | null;
  uptime_sec?: number;
}

interface InfraInfo {
  name: string;
  port: number;
  role: string;
  status: string;
}

interface Fugitive {
  uid: string;
  title: string;
  description: string;
  warning_message: string;
  subjects: string[];
  field_offices: string[];
  image_url?: string;
}

interface Flight {
  icao24: string;
  callsign: string;
  origin_country: string;
  longitude: number;
  latitude: number;
  altitude_m: number;
  velocity_mps: number;
  heading_deg: number;
}

const INITIAL_THREATS: ThreatAlert[] = [
  {
    event_id: "init-01",
    subsystem: "01-maritime-coastline",
    ring: "RING_1_MARITIME",
    lead_agency: "USCG",
    severity: 0.89,
    latitude: 26.15,
    longitude: -95.2,
    target_id: "MMSI-3678129",
    threat_type: "AIS_DARK_SHIP_OR_RENDEZVOUS",
    syndicate: "CLAN_DEL_GOLFO",
    modal: "MARITIME_CONTAINER",
    speed_knots: 14.2,
    heading_deg: 320,
    metadata: { sog_knots: 14.2, status: "DARK_VESSEL_GULF" },
  },
  {
    event_id: "init-02",
    subsystem: "02-airspace-shield",
    ring: "RING_2_FEDERAL",
    lead_agency: "USAF",
    severity: 0.94,
    latitude: 31.4,
    longitude: -106.35,
    target_id: "AIR-CLANDESTINE-88",
    threat_type: "LOW_ALT_CLANDESTINE_FLIGHT",
    syndicate: "SINALOA_CARTEL",
    modal: "CLANDESTINE_AIRCRAFT",
    speed_knots: 125,
    heading_deg: 15,
    metadata: { altitude_ft: 520, velocity_knots: 125 },
  },
  {
    event_id: "init-03",
    subsystem: "03-narcotics-intel",
    ring: "RING_2_FEDERAL",
    lead_agency: "DEA",
    severity: 0.91,
    latitude: 27.5,
    longitude: -99.5,
    target_id: "POE-LAREDO",
    threat_type: "NARCOTICS_CORRIDOR_SURGE",
    syndicate: "SINALOA_CARTEL",
    modal: "HIGHWAY_FREIGHT",
    speed_knots: 45,
    heading_deg: 10,
    metadata: { corridor: "I-35 Corridor", risk_24h: 0.91 },
  },
  {
    event_id: "init-04",
    subsystem: "04-criminal-interstate",
    ring: "RING_3_INTERSTATE",
    lead_agency: "FBI",
    severity: 0.96,
    latitude: 29.42,
    longitude: -98.49,
    target_id: "FUGITIVE-FBI-TX09",
    threat_type: "FBI_WANTED_FUGITIVE_SIGHTING",
    syndicate: "CJNG",
    modal: "HIGHWAY_FREIGHT",
    speed_knots: 65,
    heading_deg: 60,
    metadata: { hit: "I-10 San Antonio Junction", face_score: 0.96 },
  },
  {
    event_id: "init-05",
    subsystem: "01-maritime-coastline",
    ring: "RING_1_MARITIME",
    lead_agency: "USCG",
    severity: 0.93,
    latitude: 5.2,
    longitude: -79.8,
    target_id: "JIATF-NARCO-SUB",
    threat_type: "SEMI_SUBMERSIBLE_VESSEL",
    syndicate: "CLAN_DEL_GOLFO",
    modal: "SEMI_SUBMERSIBLE",
    speed_knots: 8.5,
    heading_deg: 340,
    metadata: { origin: "Tumaco / Colombia", theater: "Eastern Pacific" },
  },
  {
    event_id: "init-06",
    subsystem: "01-maritime-coastline",
    ring: "RING_1_MARITIME",
    lead_agency: "DEA",
    severity: 0.88,
    latitude: 18.25,
    longitude: -68.4,
    target_id: "CARIBBEAN-GO-FAST",
    threat_type: "CARIBBEAN_NARCO_INTERCEPT",
    syndicate: "TREN_DE_ARAGUA",
    modal: "SEMI_SUBMERSIBLE",
    speed_knots: 38,
    heading_deg: 310,
    metadata: { corridor: "Mona Passage (Caribbean)" },
  },
  {
    event_id: "init-07",
    subsystem: "03-narcotics-intel",
    ring: "RING_3_INTERSTATE",
    lead_agency: "DEA",
    severity: 0.87,
    latitude: -23.95,
    longitude: -46.3,
    target_id: "SANTOS-CARGO-BR",
    threat_type: "MARITIME_CONTAINER_ANOMALY",
    syndicate: "PCC",
    modal: "MARITIME_CONTAINER",
    speed_knots: 19.5,
    heading_deg: 40,
    metadata: { port: "Port of Santos / Brazil", destination: "Antwerp / Houston" },
  },
  {
    event_id: "init-08-eu-uk",
    subsystem: "01-maritime-coastline",
    ring: "RING_1_MARITIME",
    lead_agency: "EUROPOL",
    severity: 0.98,
    latitude: 51.26,
    longitude: 4.358,
    target_id: "ANTWERP-FELIXSTOWE-MSCU552",
    threat_type: "EUROPOL_UK_NCA_RIP_OFF_CONTAINER",
    syndicate: "NDRANGHETA",
    modal: "MARITIME_CONTAINER",
    speed_knots: 14.2,
    heading_deg: 285,
    metadata: { origin: "Paranaguá/Santos -> Highway 10", clearing: "London LLP / BVI" },
  },
  {
    event_id: "init-09-africa-hw10",
    subsystem: "01-maritime-coastline",
    ring: "RING_1_MARITIME",
    lead_agency: "MAOC_N",
    severity: 0.95,
    latitude: 11.863,
    longitude: -15.597,
    target_id: "HIGHWAY10-BISSAU-MOTHERSHIP",
    threat_type: "WEST_AFRICA_AIS_DARK_TRANSSHIPMENT",
    syndicate: "PCC",
    modal: "MARITIME_CONTAINER",
    speed_knots: 6.4,
    heading_deg: 15,
    metadata: { corridor: "10°N Parallel (Natal BR -> Bissau -> Europe)" },
  },
  {
    event_id: "init-10-mea-dubai",
    subsystem: "03-narcotics-intel",
    ring: "RING_2_FEDERAL",
    lead_agency: "UK_OFSI",
    severity: 0.97,
    latitude: 25.204,
    longitude: 55.27,
    target_id: "DUBAI-DMCC-FUJAIRAH-GOLD",
    threat_type: "AMAZON_GOLD_FOR_SHADOW_OIL_SWAP",
    syndicate: "KINAHAN_CARTEL",
    modal: "CLANDESTINE_AIRCRAFT",
    speed_knots: 0,
    heading_deg: 0,
    metadata: { origin: "Pacaraima RR / Suriname", hub: "Dubai DMCC / Fujairah STS" },
  },
  {
    event_id: "init-11-sisfron-foz",
    subsystem: "04-criminal-interstate",
    ring: "RING_2_FEDERAL",
    lead_agency: "PRF_BR",
    severity: 0.99,
    latitude: -25.516,
    longitude: -54.585,
    target_id: "SISFRON-FOZ-BR277-BITREM",
    threat_type: "TACHOGRAPH_AND_MIC_DTA_SEAL_SPOOF",
    syndicate: "PCC",
    modal: "HIGHWAY_FREIGHT",
    speed_knots: 52,
    heading_deg: 95,
    metadata: { border: "Ponte da Amizade / Foz do Iguaçu (Arco Sul)" },
  },
  {
    event_id: "init-12-sisfron-roraima",
    subsystem: "02-airspace-shield",
    ring: "RING_2_FEDERAL",
    lead_agency: "FAB_BR",
    severity: 0.95,
    latitude: 4.479,
    longitude: -61.147,
    target_id: "RAB-CLONE-PTKJM-PACARAIMA",
    threat_type: "CLONED_RAB_AIRCRAFT_GOLD_SMUGGLING",
    syndicate: "PCC",
    modal: "CLANDESTINE_AIRCRAFT",
    speed_knots: 145,
    heading_deg: 35,
    metadata: { border: "Pacaraima / Yanomami (Arco Norte SISFRON)" },
  },
];

const INITIAL_HANDOFFS: JurisdictionHandoff[] = [
  {
    handoff_id: "hd-01",
    timestamp: new Date().toISOString(),
    target_id: "VESSEL-NARCO-41",
    from_ring: "RING_1_MARITIME",
    to_ring: "RING_2_FEDERAL",
    from_agency: "USCG",
    to_agency: "CBP",
    last_known_lat: 26.04,
    last_known_lon: -97.14,
    reason:
      "Go-fast vessel ran aground on South Padre Island; tactical jurisdiction handed off from USCG (Ring 1) to CBP Border Patrol (Ring 2).",
  },
  {
    handoff_id: "hd-02",
    timestamp: new Date().toISOString(),
    target_id: "CONVOY-AZ-19",
    from_ring: "RING_2_FEDERAL",
    to_ring: "RING_3_INTERSTATE",
    from_agency: "CBP",
    to_agency: "FBI",
    last_known_lat: 32.22,
    last_known_lon: -110.97,
    reason:
      "Convoy entered Interstate I-10 in Tucson; command custody transferred to joint FBI / DEA strike force (Ring 3).",
  },
  {
    handoff_id: "hd-03",
    timestamp: new Date().toISOString(),
    target_id: "CONTAINER-PCC-SANTOS",
    from_ring: "RING_1_MARITIME",
    to_ring: "RING_1_MARITIME",
    from_agency: "PF_BR",
    to_agency: "ACP_PA",
    last_known_lat: 8.95,
    last_known_lon: -79.56,
    reason:
      "PCC container vessel entered Miraflores Locks; jurisdiction transferred from Brazilian Federal Police to ACP and USCG liaison.",
  },
];

export default function CommandCenterPage() {
  // Primary Command Mode
  const [activeView, setActiveView] = useState<
    | "intel"
    | "operations"
    | "borders_emea"
    | "ross_anderson"
    | "scanner"
    | "network"
    | "timeline"
    | "cyber"
    | "colab"
    | "microservices"
    | "copilot"
    | "govdata"
  >("intel");
  const [lang, setLang] = useState<"en" | "pt">("pt");

  // Map & Telemetry State
  const [threats, setThreats] = useState<ThreatAlert[]>(INITIAL_THREATS);
  const [handoffs, setHandoffs] = useState<JurisdictionHandoff[]>(INITIAL_HANDOFFS);
  const [selectedTarget, setSelectedTarget] = useState<ThreatAlert | null>(null);
  const [ringFilter, setRingFilter] = useState<string>("ALL");
  const [syndicateFilter, setSyndicateFilter] = useState<string>("ALL");
  const [modalFilter, setModalFilter] = useState<string>("ALL");
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>("panamerican");
  const [sidebarTab, setSidebarTab] = useState<"targets" | "handoffs">("targets");
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [isSimulatingPanam, setIsSimulatingPanam] = useState<boolean>(false);
  const [authorizedHandoffs, setAuthorizedHandoffs] = useState<string[]>([]);

  // Microservices Mesh State
  const [microservices, setMicroservices] = useState<MicroserviceInfo[]>([]);
  const [infraServices, setInfraServices] = useState<InfraInfo[]>([]);
  const [meshLoading, setMeshLoading] = useState<boolean>(false);
  const [triggeringSvc, setTriggeringSvc] = useState<string | null>(null);
  const [lastInferenceOutput, setLastInferenceOutput] = useState<Record<string, any> | null>(
    null
  );

  // Copilot State
  const [copilotPrompt, setCopilotPrompt] = useState<string>("");
  const [copilotMessages, setCopilotMessages] = useState<
    Array<{ role: "user" | "assistant"; text: string }>
  >([
    {
      role: "assistant",
      text: "**[C4ISR COPILOT ACTIVE]**\nConnected to 7-service mesh (Ports `8000`–`8006`), PostGIS Spatial Sharding, and Qdrant Vector Engine.\n\nSelect a quick command or enter your tactical intelligence query below.",
    },
  ]);
  const [copilotLoading, setCopilotLoading] = useState<boolean>(false);

  // Gov Data State
  const [ofacList, setOfacList] = useState<any[]>([]);
  const [fbiList, setFbiList] = useState<Fugitive[]>([]);
  const [flightsList, setFlightsList] = useState<Flight[]>([]);
  const [cbpSummary, setCbpSummary] = useState<Record<string, any> | null>(null);
  const [missingHtData, setMissingHtData] = useState<any>(null);
  const [missingSearch, setMissingSearch] = useState<string>("");
  const [syncingFbiLive, setSyncingFbiLive] = useState<boolean>(false);
  const [govSubTab, setGovSubTab] = useState<"missing_ht" | "ofac" | "fbi" | "opensky" | "cbp">("missing_ht");

  const gatewayUrl =
    process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:8000";

  // 1. WebSocket Real-Time Stream
  useEffect(() => {
    const wsUrl =
      process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws/c2-stream";
    let ws: WebSocket | null = null;
    let retryTimer: NodeJS.Timeout;

    const connect = () => {
      try {
        ws = new WebSocket(wsUrl);
        ws.onopen = () => setWsConnected(true);
        ws.onmessage = (evt) => {
          try {
            const data = JSON.parse(evt.data);
            if (data.event_type === "SNAPSHOT") {
              if (data.threats?.length) setThreats(data.threats);
              if (data.handoffs?.length) setHandoffs(data.handoffs);
            } else if (data.event_type === "JURISDICTION_HANDOFF") {
              setHandoffs((prev) => [data, ...prev.slice(0, 29)]);
            } else if (data.target_id && data.latitude !== undefined) {
              setThreats((prev) => {
                const filtered = prev.filter((item) => item.target_id !== data.target_id);
                return [{ ...data, event_id: data.event_id || `${Date.now()}` }, ...filtered].slice(
                  0,
                  40
                );
              });
            }
          } catch {}
        };
        ws.onclose = () => {
          setWsConnected(false);
          retryTimer = setTimeout(connect, 4000);
        };
      } catch {}
    };

    connect();
    return () => {
      if (ws) ws.close();
      clearTimeout(retryTimer);
    };
  }, []);

  // 2. Fetch Microservices Mesh Status
  const fetchMeshStatus = useCallback(async () => {
    setMeshLoading(true);
    try {
      const res = await fetch(`${gatewayUrl}/api/v1/microservices/status`);
      if (res.ok) {
        const data = await res.json();
        setMicroservices(data.microservices || []);
        setInfraServices(data.infrastructure || []);
      }
    } catch {}
    setMeshLoading(false);
  }, [gatewayUrl]);

  useEffect(() => {
    fetchMeshStatus();
    if (activeView !== "microservices") return;
    const interval = setInterval(fetchMeshStatus, 10000);
    return () => clearInterval(interval);
  }, [fetchMeshStatus, activeView]);

  // 3. Trigger Live Microservice Inference
  const handleTriggerService = async (serviceId: string) => {
    setTriggeringSvc(serviceId);
    try {
      const res = await fetch(
        `${gatewayUrl}/api/v1/microservices/${serviceId}/trigger`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      );
      const data = await res.json();
      setLastInferenceOutput(data);
      fetchMeshStatus();
    } catch (e: any) {
      setLastInferenceOutput({ status: "ERROR", error: String(e) });
    }
    setTriggeringSvc(null);
  };

  // 4. Fetch Real Gov Data when tab opens
  const fetchMissingHt = useCallback(
    async (queryStr = "", refreshLive = false) => {
      if (refreshLive) setSyncingFbiLive(true);
      try {
        const res = await fetch(
          `${gatewayUrl}/api/v1/intel/human-trafficking-missing?query=${encodeURIComponent(
            queryStr
          )}&refresh_live=${refreshLive ? "true" : "false"}`
        );
        if (res.ok) {
          const d = await res.json();
          setMissingHtData(d);
        }
      } catch {}
      if (refreshLive) setSyncingFbiLive(false);
    },
    [gatewayUrl]
  );

  useEffect(() => {
    if (activeView !== "govdata") return;
    fetchMissingHt(missingSearch, false);
    fetch(`${gatewayUrl}/api/v1/intel/ofac-sdn`)
      .then((r) => r.json())
      .then((d) => setOfacList(d.entries || []))
      .catch(() => {});
    fetch(`${gatewayUrl}/api/v1/gov-data/fbi?limit=24`)
      .then((r) => r.json())
      .then((d) => setFbiList(d.fugitives || []))
      .catch(() => {});
    fetch(`${gatewayUrl}/api/v1/gov-data/opensky?limit=30`)
      .then((r) => r.json())
      .then((d) => setFlightsList(d.flights || []))
      .catch(() => {});
    fetch(`${gatewayUrl}/api/v1/gov-data/cbp`)
      .then((r) => r.json())
      .then((d) => setCbpSummary(d.cbp_summary || null))
      .catch(() => {});
  }, [activeView, gatewayUrl, fetchMissingHt, missingSearch]);

  // 5. Ask AI Copilot
  const handleSendCopilot = async (customPrompt?: string) => {
    const q = (customPrompt ?? copilotPrompt).trim();
    if (!q) return;
    setCopilotMessages((prev) => [...prev, { role: "user", text: q }]);
    if (!customPrompt) setCopilotPrompt("");
    setCopilotLoading(true);
    try {
      const res = await fetch(`${gatewayUrl}/api/v1/copilot/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: q }),
      });
      const data = await res.json();
      setCopilotMessages((prev) => [
        ...prev,
        { role: "assistant", text: data.answer || "Sem resposta." },
      ]);
    } catch {
      setCopilotMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "Communication timeout with C2 Tactical Gateway (`http://localhost:8000`).",
        },
      ]);
    }
    setCopilotLoading(false);
  };

  // 6. Simulate Pan-American Transnational Corridor Passage
  const handleSimulatePanamerican = async () => {
    setIsSimulatingPanam(true);
    try {
      const res = await fetch(`${gatewayUrl}/api/v1/panamerican/corridor/simulate`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.handoffs?.length) {
        setHandoffs((prev) => [...data.handoffs, ...prev].slice(0, 30));
      }
    } catch {}
    setIsSimulatingPanam(false);
  };

  // 7. Authorize Cross-Agency Interception Order
  const handleAuthorizeHandoff = async (handoffId: string) => {
    setAuthorizedHandoffs((prev) => [...prev, handoffId]);
    try {
      await fetch(`${gatewayUrl}/api/v1/handoffs/${handoffId}/authorize`, {
        method: "POST",
      });
    } catch {}
  };

  // Filtered Threats across Defense Rings, Syndicates, and Modals
  const filteredThreats = threats.filter((t) => {
    if (ringFilter !== "ALL" && t.ring !== ringFilter) return false;
    if (syndicateFilter !== "ALL" && t.syndicate && t.syndicate !== syndicateFilter) return false;
    if (modalFilter !== "ALL" && t.modal && t.modal !== modalFilter) return false;
    return true;
  });

  const onlineServicesCount =
    microservices.filter((m) => m.status === "ONLINE").length || 7;

  return (
    <div className="flex h-screen w-screen bg-[#060a12] text-slate-100 overflow-hidden select-none">
      {/* =====================================================================
          ENTERPRISE LEFT NAVIGATION SIDEBAR (Clean, Structured SaaS Menu)
         ===================================================================== */}
      <aside className="w-64 shrink-0 bg-[#090e17] border-r border-slate-800/90 flex flex-col justify-between z-40">
        {/* Top Brand Logo */}
        <div>
          <div className="h-14 px-4 border-b border-slate-800/90 flex items-center space-x-3">
            <div className="h-8 w-8 rounded-lg bg-cyan-500/15 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
              <Shield className="w-4 h-4" />
            </div>
            <div className="overflow-hidden">
              <div className="flex items-center space-x-1.5">
                <span className="font-bold tracking-wider text-sm text-white">
                  FRONTIER-OS
                </span>
                <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold">
                  v3.0
                </span>
              </div>
              <p className="text-[10px] text-slate-400 truncate">
                {lang === "pt"
                  ? "Inteligência, Carga, Petróleo & C4ISR"
                  : "Illicit Trade, Oil, Cargo & C4ISR"}
              </p>
            </div>
          </div>

          {/* Navigation Sections — Simplified 5-Step Guided Workflow */}
          <div className="p-3 space-y-2.5 overflow-y-auto max-h-[calc(100vh-130px)]">
            <div className="px-2 mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {lang === "pt" ? "Fluxo Operacional (5 Passos)" : "Operational Workflow (5 Steps)"}
            </div>

            {/* 1. CASOS, EMPRESAS LARANJAS & LINHA DO TEMPO */}
            <button
              onClick={() => setActiveView("intel")}
              className={`w-full text-left p-2.5 rounded-xl border transition-all ${
                activeView === "intel" || activeView === "network" || activeView === "timeline"
                  ? "bg-cyan-500/15 border-cyan-500/60 text-white shadow-md"
                  : "bg-slate-900/50 border-slate-800/80 text-slate-300 hover:bg-slate-800/70 hover:text-white"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center space-x-2 text-xs font-bold">
                  <Shield className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>{lang === "pt" ? "1. Casos & Investigação" : "1. Cases & Investigation"}</span>
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-700/50">
                  6 Casos
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1 pl-6 leading-snug">
                {lang === "pt"
                  ? "Petróleo, Contêineres, Empresas Laranjas e Replay"
                  : "Oil, Containers, Shell Companies & Voyage Replay"}
              </p>
            </button>

            {/* 2. MAPA TÁTICO GLOBAL */}
            <button
              onClick={() => setActiveView("operations")}
              className={`w-full text-left p-2.5 rounded-xl border transition-all ${
                activeView === "operations"
                  ? "bg-sky-500/15 border-sky-500/60 text-white shadow-md"
                  : "bg-slate-900/50 border-slate-800/80 text-slate-300 hover:bg-slate-800/70 hover:text-white"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center space-x-2 text-xs font-bold">
                  <Globe className="w-4 h-4 text-sky-400 shrink-0" />
                  <span>{lang === "pt" ? "2. Mapa Tático Global" : "2. Global Tactical Map"}</span>
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-700/50">
                  LIVE
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1 pl-6 leading-snug">
                {lang === "pt"
                  ? "Rotas Brasil, Américas, Europol/UK, África e Dubai"
                  : "Brazil, Americas, Europol/UK, Africa & Dubai Routes"}
              </p>
            </button>

            {/* 3. FRONTEIRAS DO BRASIL (SISFRON) + EUROPOL / UK / EMEA */}
            <button
              onClick={() => setActiveView("borders_emea")}
              className={`w-full text-left p-2.5 rounded-xl border transition-all ${
                activeView === "borders_emea"
                  ? "bg-emerald-500/15 border-emerald-500/60 text-white shadow-md"
                  : "bg-slate-900/50 border-slate-800/80 text-slate-300 hover:bg-slate-800/70 hover:text-white"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center space-x-2 text-xs font-bold">
                  <Radio className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    {lang === "pt" ? "3. Fronteiras BR & Europa/UK" : "3. BR Borders & Europol/UK"}
                  </span>
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/50">
                  SISFRON
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1 pl-6 leading-snug">
                {lang === "pt"
                  ? "9 Setores (16.886 km), Perícia PRF/RFB, Europol e UK NCA"
                  : "9 Border Sectors, Highway/Seal Audit, Europol & UK NCA"}
              </p>
            </button>

            {/* 4. AUDITAR CARGA, LACRE, EMPRESA OU CRIPTO */}
            <button
              onClick={() => setActiveView("scanner")}
              className={`w-full text-left p-2.5 rounded-xl border transition-all ${
                activeView === "scanner" || activeView === "cyber"
                  ? "bg-amber-500/15 border-amber-500/60 text-white shadow-md"
                  : "bg-slate-900/50 border-slate-800/80 text-slate-300 hover:bg-slate-800/70 hover:text-white"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center space-x-2 text-xs font-bold">
                  <FileText className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    {lang === "pt" ? "4. Auditar Carga ou Empresa" : "4. Audit Cargo or Company"}
                  </span>
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700/50">
                  SCAN
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1 pl-6 leading-snug">
                {lang === "pt"
                  ? "Testar Manifesto, Balança, Domínio Fantasma, Cripto e SHA-256"
                  : "Test Manifest, Weighbridge, Shell Domain, Crypto & SHA-256"}
              </p>
            </button>

            {/* 5. COPILOTO IA, LISTAS OFICIAIS & MODELOS COLAB */}
            <button
              onClick={() => setActiveView("colab")}
              className={`w-full text-left p-2.5 rounded-xl border transition-all ${
                activeView === "colab" ||
                activeView === "copilot" ||
                activeView === "govdata" ||
                activeView === "microservices"
                  ? "bg-purple-500/15 border-purple-500/60 text-white shadow-md"
                  : "bg-slate-900/50 border-slate-800/80 text-slate-300 hover:bg-slate-800/70 hover:text-white"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center space-x-2 text-xs font-bold">
                  <Cpu className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>
                    {lang === "pt" ? "5. Colab IA, Sanções & Sistema" : "5. Colab AI, Sanctions & System"}
                  </span>
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-700/50">
                  ONNX 4/4
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1 pl-6 leading-snug">
                {lang === "pt"
                  ? "Modelos Colab (.ONNX), Copiloto IA, OFAC/FBI e Microsserviços"
                  : "Colab ONNX Models, AI Copilot, OFAC/FBI & Microservices"}
              </p>
            </button>
          </div>
        </div>

        {/* Bottom Status & Language Footer */}
        <div className="p-3 border-t border-slate-800/90 space-y-2 bg-[#060a12]/60">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase text-slate-400">
              {lang === "pt" ? "Idioma / Language" : "Language"}
            </span>
            <div className="flex items-center bg-[#090e17] border border-slate-800 rounded-md p-0.5 text-[11px] font-bold">
              <button
                onClick={() => setLang("pt")}
                className={`px-2 py-0.5 rounded transition ${
                  lang === "pt"
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                🇧🇷 PT
              </button>
              <button
                onClick={() => setLang("en")}
                className={`px-2 py-0.5 rounded transition ${
                  lang === "en"
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                🇺🇸 EN
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-[#090e17] border border-slate-800 text-[10px]">
            <span className="flex items-center space-x-1.5">
              <span
                className={`h-2 w-2 rounded-full ${
                  wsConnected ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
                }`}
              />
              <span className="font-mono text-slate-300">
                {wsConnected ? "C2 STREAM ONLINE" : "LOCAL RECON"}
              </span>
            </span>
            <span className="font-mono text-emerald-400">ONNX OK</span>
          </div>
        </div>
      </aside>

      {/* =====================================================================
          RIGHT MAIN WORKSPACE AREA (Header Breadcrumb + Active Module)
         ===================================================================== */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Clean Contextual Top Bar */}
        <header className="h-14 shrink-0 bg-[#090e17] border-b border-slate-800/80 px-5 flex items-center justify-between z-20">
          <div>
            <h1 className="text-sm font-bold text-white">
              {activeView === "intel" &&
                (lang === "pt"
                  ? "🎯 Central de Dossiês & Cruzamento de Dados (Petróleo, Cargas, Empresas & Pessoas Listadas)"
                  : "🎯 Investigation & Cross-Reference Hub (Crude Oil, Cargo, Shell Companies & Listed Persons)")}
              {activeView === "operations" &&
                (lang === "pt"
                  ? "🌎 Centro Geoespacial C4ISR — 3 Anéis de Defesa & Corredores Pan-Americanos"
                  : "🌎 Geospatial C4ISR Theater — 3 Defense Rings & Pan-American Corridors")}
              {activeView === "scanner" &&
                (lang === "pt"
                  ? "📄 Scanner & Auditor de Manifesto, Fatura de Petróleo/Carga, Balança e Sanções (+ Colab ONNX)"
                  : "📄 Real-Time Manifest, TBML Price, Weighbridge & Sanctions Auditor (+ Colab ONNX)")}
              {activeView === "network" &&
                (lang === "pt"
                  ? "🕸️ Grafo Societário de Empresas Laranjas, Offshores e Beneficiários Finais (UBO)"
                  : "🕸️ Corporate Shell Network & Ultimate Beneficial Owner (UBO) Link Analysis")}
              {activeView === "timeline" &&
                (lang === "pt"
                  ? "⏱️ Linha do Tempo de Reconstrução da Viagem & Relatório Oficial COAF / FinCEN / OFAC"
                  : "⏱️ Step-by-Step Voyage Replay Timeline & Official FinCEN / COAF / OFAC Dossier")}
              {activeView === "borders_emea" &&
                (lang === "pt"
                  ? "🇧🇷🇪🇺🇬🇧 Fronteiras do Brasil (16.886 km SISFRON) + Europol (UE) + Reino Unido (NCA/OFSI) + África & Oriente Médio"
                  : "🇧🇷🇪🇺🇬🇧 Brazil Borders (16,886 km SISFRON) + Europol (EU) + UK (NCA/OFSI) + West Africa & Middle East")}
              {activeView === "ross_anderson" &&
                (lang === "pt"
                  ? "🔐 Engenharia de Segurança de Ross Anderson (Segurança Multilateral, Tacógrafos/Lacres, Mirror-Trading & Honeytokens)"
                  : "🔐 Ross Anderson's Security Engineering (Multilateral Security, Tachograph/Seal Physics, Mirror-Trading & Canary Traps)")}
              {activeView === "cyber" &&
                (lang === "pt"
                  ? "🛡️ Cyber Security, OSINT de Empresas, Intrusion Portuária (TOS/RFID) & Custódia SHA-256 / STIX 2.1"
                  : "🛡️ Cyber Security, Shell Domain OSINT, Port OT/RFID Intrusion & SHA-256 / STIX 2.1")}
              {activeView === "colab" &&
                (lang === "pt"
                  ? "🧠 Telemetria & Inferência Real dos Modelos Treinados no Google Colab (frontier_c4isr_deployment)"
                  : "🧠 Google Colab Trained ONNX Deployment Telemetry & Live Inference")}
              {activeView === "govdata" &&
                (lang === "pt"
                  ? "🏛️ Base Oficial: Lista de Sanções OFAC SDN, Procurados FBI Wanted, Radar OpenSky & Apreensões CBP"
                  : "🏛️ Official Datasets: OFAC SDN Sanctions, FBI Wanted API, OpenSky Radar & CBP Seizures")}
              {activeView === "copilot" &&
                (lang === "pt"
                  ? "🤖 Copiloto Analista IA — Investigação Assistida & Planos Táticos Inter-Agências"
                  : "🤖 AI Case Analyst Copilot — Assisted Investigation & Inter-Agency Playbooks")}
              {activeView === "microservices" &&
                (lang === "pt"
                  ? "⚙️ Malha de Microsserviços Distribuídos (Portas 8000–8006) & Infraestrutura"
                  : "⚙️ Distributed Microservices Mesh (Ports 8000–8006) & Infrastructure")}
            </h1>
          </div>

          {/* Contextual Sub-Tabs for the Active Step */}
          <div className="flex flex-wrap items-center gap-1.5">
            {(activeView === "intel" || activeView === "network" || activeView === "timeline") && (
              <>
                <button
                  onClick={() => setActiveView("intel")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                    activeView === "intel"
                      ? "bg-cyan-500 text-slate-950 border-cyan-400"
                      : "bg-slate-900 text-slate-300 border-slate-800 hover:text-white"
                  }`}
                >
                  📋 Dossiês & Bloqueio
                </button>
                <button
                  onClick={() => setActiveView("network")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                    activeView === "network"
                      ? "bg-purple-500 text-slate-950 border-purple-400"
                      : "bg-slate-900 text-slate-300 border-slate-800 hover:text-white"
                  }`}
                >
                  🕸️ Empresas Laranjas (UBO)
                </button>
                <button
                  onClick={() => setActiveView("timeline")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                    activeView === "timeline"
                      ? "bg-amber-500 text-slate-950 border-amber-400"
                      : "bg-slate-900 text-slate-300 border-slate-800 hover:text-white"
                  }`}
                >
                  ⏱️ Replay da Viagem & COAF
                </button>
              </>
            )}

            {(activeView === "scanner" || activeView === "cyber") && (
              <>
                <button
                  onClick={() => setActiveView("scanner")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                    activeView === "scanner"
                      ? "bg-emerald-500 text-slate-950 border-emerald-400"
                      : "bg-slate-900 text-slate-300 border-slate-800 hover:text-white"
                  }`}
                >
                  📦 Auditar Manifesto / Carga / Peso
                </button>
                <button
                  onClick={() => setActiveView("cyber")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                    activeView === "cyber"
                      ? "bg-rose-500 text-slate-950 border-rose-400"
                      : "bg-slate-900 text-slate-300 border-slate-800 hover:text-white"
                  }`}
                >
                  🛡️ Auditar Empresa, Cripto & Custódia SHA-256
                </button>
              </>
            )}

            {(activeView === "colab" ||
              activeView === "copilot" ||
              activeView === "govdata" ||
              activeView === "microservices") && (
              <>
                <button
                  onClick={() => setActiveView("colab")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                    activeView === "colab"
                      ? "bg-emerald-400 text-slate-950 border-emerald-300"
                      : "bg-slate-900 text-slate-300 border-slate-800 hover:text-white"
                  }`}
                >
                  🧠 Modelos Colab (.ONNX)
                </button>
                <button
                  onClick={() => setActiveView("copilot")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                    activeView === "copilot"
                      ? "bg-purple-500 text-slate-950 border-purple-400"
                      : "bg-slate-900 text-slate-300 border-slate-800 hover:text-white"
                  }`}
                >
                  🤖 Copiloto IA
                </button>
                <button
                  onClick={() => setActiveView("govdata")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                    activeView === "govdata"
                      ? "bg-rose-500 text-slate-950 border-rose-400"
                      : "bg-slate-900 text-slate-300 border-slate-800 hover:text-white"
                  }`}
                >
                  🏛️ Listas Oficiais (OFAC/FBI)
                </button>
                <button
                  onClick={() => setActiveView("microservices")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                    activeView === "microservices"
                      ? "bg-sky-500 text-slate-950 border-sky-400"
                      : "bg-slate-900 text-slate-300 border-slate-800 hover:text-white"
                  }`}
                >
                  ⚙️ Microsserviços ({onlineServicesCount}/7)
                </button>
              </>
            )}
          </div>
        </header>

        {/* Enterprise Problem-Solving Views (Scanner, Corporate Network, Timeline, Cyber, Borders/EMEA, Ross Anderson, Colab ONNX) */}
        {(activeView === "scanner" ||
          activeView === "network" ||
          activeView === "timeline" ||
          activeView === "cyber" ||
          activeView === "borders_emea" ||
          activeView === "ross_anderson" ||
          activeView === "colab") && (
          <EnterpriseModules
            mode={activeView}
            lang={lang}
            apiBaseUrl={gatewayUrl}
            onJumpToMap={(lat, lon, label) => {
              const jumpTarget: ThreatAlert = {
                event_id: `jump-${Date.now()}`,
                target_id: label,
                subsystem: "GLOBAL-C4ISR-EMEA-SISFRON",
                threat_type: label,
                ring: "RING_1_MARITIME",
                lead_agency: "EUROPOL",
                latitude: lat,
                longitude: lon,
                severity: 0.96,
              };
              setThreats((prev) => [jumpTarget, ...prev.filter((t) => t.target_id !== label)]);
              setSelectedTarget(jumpTarget);
              setActiveView("operations");
            }}
          />
        )}

      {/* =====================================================================
          VIEW 0: ILLICIT TRADE, OIL, CARGO & SANCTIONS CROSS-REFERENCE HUB
         ===================================================================== */}
      {activeView === "intel" && (
        <IllicitTradeHub
          lang={lang}
          apiBaseUrl={gatewayUrl}
          onLocateOnMap={(lat, lon, caseItem: InvestigationCase) => {
            const newTarget: ThreatAlert = {
              event_id: caseItem.case_id,
              target_id: caseItem.transport_asset.asset_name,
              subsystem: caseItem.category,
              threat_type: `${caseItem.category} — ${caseItem.listed_person.full_name}`,
              ring: caseItem.transport_asset.current_ring,
              lead_agency: caseItem.transport_asset.lead_agency,
              latitude: lat,
              longitude: lon,
              severity: caseItem.risk_score,
              theater: caseItem.theater,
              syndicate: caseItem.syndicate,
              modal: caseItem.modal,
            };
            setThreats((prev) => [
              newTarget,
              ...prev.filter((t) => t.target_id !== newTarget.target_id),
            ]);
            setSelectedTarget(newTarget);
            setActiveView("operations");
          }}
          onAskCopilot={(prompt) => {
            setActiveView("copilot");
            handleSendCopilot(prompt);
          }}
        />
      )}

      {/* =====================================================================
          VIEW 1: THEATER OF OPERATIONS (Clean Full-Screen Map + Focused Sidebar)
         ===================================================================== */}
      {activeView === "operations" && (
        <div className="flex-1 flex overflow-hidden relative">
          {/* LEFT TACTICAL SIDEBAR (330px, Uncluttered) */}
          <aside className="w-80 shrink-0 bg-[#090e17] border-r border-slate-800/80 flex flex-col z-20">
            {/* Ring Filter Selector (3 Defense Rings) */}
            <div className="p-3 border-b border-slate-800/80">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Defense Ring Primacy
              </div>
              <div className="grid grid-cols-4 gap-1">
                <button
                  onClick={() => setRingFilter("ALL")}
                  className={`py-1.5 rounded text-[11px] font-bold transition ${
                    ringFilter === "ALL"
                      ? "bg-slate-200 text-slate-950"
                      : "bg-[#060a12] text-slate-400 hover:text-white border border-slate-800"
                  }`}
                >
                  All ({threats.length})
                </button>
                <button
                  onClick={() => setRingFilter("RING_1_MARITIME")}
                  className={`py-1.5 rounded text-[11px] font-bold transition ${
                    ringFilter === "RING_1_MARITIME"
                      ? "bg-sky-500 text-slate-950"
                      : "bg-[#060a12] text-sky-400 hover:bg-sky-500/10 border border-slate-800"
                  }`}
                >
                  Ring 1
                </button>
                <button
                  onClick={() => setRingFilter("RING_2_FEDERAL")}
                  className={`py-1.5 rounded text-[11px] font-bold transition ${
                    ringFilter === "RING_2_FEDERAL"
                      ? "bg-amber-500 text-slate-950"
                      : "bg-[#060a12] text-amber-400 hover:bg-amber-500/10 border border-slate-800"
                  }`}
                >
                  Ring 2
                </button>
                <button
                  onClick={() => setRingFilter("RING_3_INTERSTATE")}
                  className={`py-1.5 rounded text-[11px] font-bold transition ${
                    ringFilter === "RING_3_INTERSTATE"
                      ? "bg-red-500 text-slate-950"
                      : "bg-[#060a12] text-red-400 hover:bg-red-500/10 border border-slate-800"
                  }`}
                >
                  Ring 3
                </button>
              </div>
            </div>

            {/* Sub-Tabs: Targets vs Handoffs */}
            <div className="flex border-b border-slate-800/80 text-xs font-semibold">
              <button
                onClick={() => setSidebarTab("targets")}
                className={`flex-1 py-2.5 text-center border-b-2 transition ${
                  sidebarTab === "targets"
                    ? "border-sky-400 text-sky-400 bg-sky-500/5"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                🎯 Monitored Targets ({filteredThreats.length})
              </button>
              <button
                onClick={() => setSidebarTab("handoffs")}
                className={`flex-1 py-2.5 text-center border-b-2 transition ${
                  sidebarTab === "handoffs"
                    ? "border-amber-400 text-amber-400 bg-amber-500/5"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                🔄 Handoffs ({handoffs.length})
              </button>
            </div>

            {/* Scrollable List */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
              {sidebarTab === "targets" ? (
                filteredThreats.map((t) => {
                  const isSelected = selectedTarget?.target_id === t.target_id;
                  const ringBadge =
                    t.ring === "RING_1_MARITIME"
                      ? "text-sky-400 border-sky-500/30 bg-sky-500/10"
                      : t.ring === "RING_2_FEDERAL"
                      ? "text-amber-400 border-amber-500/30 bg-amber-500/10"
                      : "text-red-400 border-red-500/30 bg-red-500/10";

                  return (
                    <div
                      key={t.event_id || t.target_id}
                      onClick={() => setSelectedTarget(t)}
                      className={`p-2.5 rounded-lg border cursor-pointer transition ${
                        isSelected
                          ? "bg-sky-500/15 border-sky-400 shadow-lg"
                          : "bg-[#060a12] border-slate-800/90 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono font-bold text-xs text-white">
                          {t.target_id}
                        </span>
                        <div className="flex items-center space-x-1">
                          {t.syndicate && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              {t.syndicate}
                            </span>
                          )}
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${ringBadge}`}
                          >
                            {t.lead_agency}
                          </span>
                        </div>
                      </div>
                      <div className="text-[11px] text-slate-300 font-medium truncate">
                        {t.threat_type.replace(/_/g, " ")}
                      </div>
                      <div className="flex items-center justify-between mt-2 text-[10px] text-slate-400 font-mono">
                        <span>
                          {t.latitude.toFixed(2)}°, {t.longitude.toFixed(2)}°
                        </span>
                        <span className="text-rose-400 font-semibold">
                          {(t.severity * 100).toFixed(0)}% Risk
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                handoffs.map((h, i) => {
                  const isAuth = authorizedHandoffs.includes(h.handoff_id || `${i}`);
                  return (
                    <div
                      key={h.handoff_id || i}
                      className="p-3 rounded-lg bg-[#060a12] border border-slate-800 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-xs text-amber-400">
                          {h.target_id}
                        </span>
                        <div className="flex items-center space-x-1 text-[10px] font-bold">
                          <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300">
                            {h.from_agency}
                          </span>
                          <ArrowRight className="w-3 h-3 text-slate-500" />
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                            {h.to_agency}
                          </span>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        {h.reason}
                      </p>
                      <button
                        onClick={() => handleAuthorizeHandoff(h.handoff_id || `${i}`)}
                        disabled={isAuth}
                        className={`w-full py-1 rounded text-[10px] font-bold uppercase transition ${
                          isAuth
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                            : "bg-sky-500/20 text-sky-300 border border-sky-500/40 hover:bg-sky-500/30"
                        }`}
                      >
                        {isAuth ? "✓ Interception Authorized" : "Authorize Interception"}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </aside>

          {/* MAIN MAP WORKSPACE */}
          <main className="flex-1 relative h-full">
            {/* TOP COMMAND BAR (8 THEATER PRESETS + SYNDICATE & MODAL FILTERS + SIMULATION) */}
            <div className="absolute top-3 left-3 z-[1000] flex flex-wrap items-center gap-2 bg-[#090e17]/95 backdrop-blur-md border border-slate-800 p-2 rounded-xl shadow-2xl max-w-[calc(100vw-360px)]">
              {/* Theater Buttons */}
              <div className="flex items-center space-x-1 pr-2 border-r border-slate-800 overflow-x-auto">
                <button
                  onClick={() => setCameraPreset("panamerican")}
                  className={`px-2 py-1 rounded-md text-[11px] font-bold transition ${
                    cameraPreset === "panamerican" || cameraPreset === "americas"
                      ? "bg-sky-500 text-slate-950 font-bold"
                      : "text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  🌎 Pan-American
                </button>
                <button
                  onClick={() => setCameraPreset("usa")}
                  className={`px-2 py-1 rounded-md text-[11px] font-bold transition ${
                    cameraPreset === "usa" || cameraPreset === "us"
                      ? "bg-sky-500 text-slate-950 font-bold"
                      : "text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  🇺🇸 USA
                </button>
                <button
                  onClick={() => setCameraPreset("brazil")}
                  className={`px-2 py-1 rounded-md text-[11px] font-bold transition ${
                    cameraPreset === "brazil" || cameraPreset === "south_america"
                      ? "bg-emerald-500 text-slate-950 font-bold"
                      : "text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  🇧🇷 Brazil
                </button>
                <button
                  onClick={() => setCameraPreset("brazil_borders")}
                  className={`px-2 py-1 rounded-md text-[11px] font-bold transition ${
                    cameraPreset === "brazil_borders"
                      ? "bg-emerald-400 text-slate-950 font-bold"
                      : "text-emerald-300 hover:bg-slate-800"
                  }`}
                >
                  🛡️ Fronteiras BR (SISFRON)
                </button>
                <button
                  onClick={() => setCameraPreset("uk_europe")}
                  className={`px-2 py-1 rounded-md text-[11px] font-bold transition ${
                    cameraPreset === "uk_europe"
                      ? "bg-indigo-400 text-slate-950 font-bold"
                      : "text-indigo-300 hover:bg-slate-800"
                  }`}
                >
                  🇬🇧🇪🇺 UK & Europol
                </button>
                <button
                  onClick={() => setCameraPreset("west_africa")}
                  className={`px-2 py-1 rounded-md text-[11px] font-bold transition ${
                    cameraPreset === "west_africa"
                      ? "bg-orange-400 text-slate-950 font-bold"
                      : "text-orange-300 hover:bg-slate-800"
                  }`}
                >
                  🌍 África (Highway 10)
                </button>
                <button
                  onClick={() => setCameraPreset("middle_east")}
                  className={`px-2 py-1 rounded-md text-[11px] font-bold transition ${
                    cameraPreset === "middle_east"
                      ? "bg-rose-400 text-slate-950 font-bold"
                      : "text-rose-300 hover:bg-slate-800"
                  }`}
                >
                  🇦🇪 Oriente Médio (Dubai)
                </button>
                <button
                  onClick={() => setCameraPreset("colombia")}
                  className={`px-2 py-1 rounded-md text-[11px] font-bold transition ${
                    cameraPreset === "colombia"
                      ? "bg-yellow-500 text-slate-950 font-bold"
                      : "text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  🇨🇴 Colombia
                </button>
                <button
                  onClick={() => setCameraPreset("mexico")}
                  className={`px-2 py-1 rounded-md text-[11px] font-bold transition ${
                    cameraPreset === "mexico" || cameraPreset === "border"
                      ? "bg-amber-500 text-slate-950 font-bold"
                      : "text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  🇲🇽 Mexico
                </button>
                <button
                  onClick={() => setCameraPreset("panama")}
                  className={`px-2 py-1 rounded-md text-[11px] font-bold transition ${
                    cameraPreset === "panama"
                      ? "bg-cyan-500 text-slate-950 font-bold"
                      : "text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  🇵🇦 Panama
                </button>
                <button
                  onClick={() => setCameraPreset("chile")}
                  className={`px-2 py-1 rounded-md text-[11px] font-bold transition ${
                    cameraPreset === "chile"
                      ? "bg-rose-500 text-slate-950 font-bold"
                      : "text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  🇨🇱 Chile
                </button>
                <button
                  onClick={() => setCameraPreset("argentina")}
                  className={`px-2 py-1 rounded-md text-[11px] font-bold transition ${
                    cameraPreset === "argentina"
                      ? "bg-blue-500 text-slate-950 font-bold"
                      : "text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  🇦🇷 Argentina
                </button>
              </div>

              {/* Syndicate Filter Dropdown */}
              <div className="flex items-center space-x-1.5 text-[11px]">
                <span className="text-slate-400 font-mono">Syndicate:</span>
                <select
                  value={syndicateFilter}
                  onChange={(e) => setSyndicateFilter(e.target.value)}
                  className="bg-[#060a12] border border-slate-700 text-slate-200 rounded px-2 py-1 text-[11px] font-semibold focus:outline-none focus:border-sky-500"
                >
                  <option value="ALL">All Syndicates</option>
                  <option value="PCC">PCC (Brasil / Transatlântico)</option>
                  <option value="CV">CV (Comando Vermelho / Solimões)</option>
                  <option value="NDRANGHETA">&apos;Ndrangheta (Europol / Antuérpia)</option>
                  <option value="MOCRO_MAFFIA">Mocro Maffia (Roterdã / Antuérpia)</option>
                  <option value="KINAHAN_CARTEL">Kinahan Cartel (UK / Dubai)</option>
                  <option value="BALKAN_CARTEL">Balkan Cartel (Transatlântico)</option>
                  <option value="SINALOA_CARTEL">Sinaloa Cartel</option>
                  <option value="CJNG">CJNG (Jalisco)</option>
                  <option value="CLAN_DEL_GOLFO">Clan del Golfo</option>
                  <option value="TREN_DE_ARAGUA">Tren de Aragua</option>
                </select>
              </div>

              {/* Modal Filter Dropdown */}
              <div className="flex items-center space-x-1.5 text-[11px]">
                <span className="text-slate-400 font-mono">Modal:</span>
                <select
                  value={modalFilter}
                  onChange={(e) => setModalFilter(e.target.value)}
                  className="bg-[#060a12] border border-slate-700 text-slate-200 rounded px-2 py-1 text-[11px] font-semibold focus:outline-none focus:border-sky-500"
                >
                  <option value="ALL">All Modals</option>
                  <option value="MARITIME_CONTAINER">Maritime Container</option>
                  <option value="SEMI_SUBMERSIBLE">Semi-Submersible</option>
                  <option value="RIVERINE_BARGE">Riverine Barge</option>
                  <option value="CLANDESTINE_AIRCRAFT">Clandestine Aircraft</option>
                  <option value="HIGHWAY_FREIGHT">Highway Freight</option>
                  <option value="PANAMA_CANAL_TRANSIT">Panama Canal Transit</option>
                </select>
              </div>

              {/* Simulation Trigger Button */}
              <button
                onClick={handleSimulatePanamerican}
                disabled={isSimulatingPanam}
                className="flex items-center space-x-1 px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-[11px] font-bold transition disabled:opacity-50"
              >
                <Zap className={`w-3.5 h-3.5 ${isSimulatingPanam ? "animate-spin" : ""}`} />
                <span>{isSimulatingPanam ? "SIMULATING..." : "RUN CORRIDOR SIM"}</span>
              </button>
            </div>

            {/* Interactive Tactical Map with 3-Level Semantic Zoom */}
            <TacticalMap
              threats={threats}
              selectedTarget={selectedTarget}
              onSelectTarget={setSelectedTarget}
              ringFilter={ringFilter}
              syndicateFilter={syndicateFilter}
              modalFilter={modalFilter}
              cameraPreset={cameraPreset}
              onPresetChange={setCameraPreset}
              onAuthorizeHandoff={handleAuthorizeHandoff}
            />

            {/* RIGHT SLIDE-OVER TARGET DOSSIER (Only visible when a target is selected) */}
            {selectedTarget && (
              <div className="absolute top-3 right-3 w-80 bg-[#090e17]/95 backdrop-blur-md border border-slate-700 rounded-xl shadow-2xl p-4 z-[1000] space-y-3">
                <div className="flex items-start justify-between border-b border-slate-800 pb-2.5">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-sky-400">
                      Tactical Target Dossier
                    </span>
                    <h3 className="font-mono font-bold text-base text-white">
                      {selectedTarget.target_id}
                    </h3>
                  </div>
                  <button
                    onClick={() => setSelectedTarget(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Classification:</span>
                    <span className="font-semibold text-white">
                      {selectedTarget.threat_type.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Lead Agency:</span>
                    <span className="font-bold text-sky-400">
                      {selectedTarget.lead_agency}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Defense Ring:</span>
                    <span className="font-mono text-amber-400">
                      {selectedTarget.ring}
                    </span>
                  </div>
                  {selectedTarget.syndicate && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Attributed Syndicate:</span>
                      <span className="font-semibold text-purple-300">
                        {selectedTarget.syndicate}
                      </span>
                    </div>
                  )}
                  {selectedTarget.modal && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Transport Modal:</span>
                      <span className="font-mono text-cyan-300">
                        {selectedTarget.modal}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-400">Coordinates:</span>
                    <span className="font-mono text-slate-200">
                      {selectedTarget.latitude.toFixed(4)}°,{" "}
                      {selectedTarget.longitude.toFixed(4)}°
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">AI Risk Severity:</span>
                    <span className="font-bold text-rose-400">
                      {(selectedTarget.severity * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex flex-col gap-2">
                  <button
                    onClick={() => setActiveView("intel")}
                    className="w-full py-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-bold text-xs flex items-center justify-center space-x-1.5 transition"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>
                      {lang === "pt"
                        ? "🎯 Cruzar Dados (Pessoa Listada, Empresa & Carga)"
                        : "🎯 Open Cross-Reference Dossier (Person & Cargo)"}
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveView("copilot");
                      handleSendCopilot(
                        `Generate tactical interdiction plan for target ${selectedTarget.target_id} (${selectedTarget.threat_type}) under ${selectedTarget.lead_agency} jurisdiction.`
                      );
                    }}
                    className="w-full py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs flex items-center justify-center space-x-1.5 transition"
                  >
                    <Bot className="w-3.5 h-3.5" />
                    <span>Generate AI Interception Plan</span>
                  </button>

                  <button
                    onClick={() => handleAuthorizeHandoff(selectedTarget.target_id)}
                    className="w-full py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center justify-center space-x-1.5 transition"
                  >
                    <Crosshair className="w-3.5 h-3.5" />
                    <span>Authorize Jurisdiction Handoff</span>
                  </button>
                </div>
              </div>
            )}
          </main>
        </div>
      )}

      {/* =====================================================================
          VIEW 2: C4ISR MICROSERVICES MESH (Services 8000-8006 + Live Trigger)
         ===================================================================== */}
      {activeView === "microservices" && (
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#060a12]">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-[#090e17] p-5 rounded-xl border border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                  <Server className="w-5 h-5 text-emerald-400" />
                  <span>
                    C4ISR Microservices Mesh (7 Services + 4 Core Data Engines)
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  All microservices execute independently using{" "}
                  <code className="text-sky-400">InferenceProcessPool</code>{" "}
                  (spawn multiprocessing + locks + H3 sharding) and communicate via C2 Gateway and Redpanda Kafka.
                </p>
              </div>
              <button
                onClick={fetchMeshStatus}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${meshLoading ? "animate-spin" : ""}`}
                />
                <span>Refresh Mesh Telemetry</span>
              </button>
            </div>

            {/* 7 Domain Microservices Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {microservices.map((svc) => {
                const isOnline = svc.status === "ONLINE";
                const isRunning = triggeringSvc === svc.service_id;
                return (
                  <div
                    key={svc.service_id}
                    className="bg-[#090e17] border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-4 hover:border-slate-700 transition"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-sky-400">
                          :{svc.port} // {svc.service_id}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center space-x-1 ${
                            isOnline
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                              : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isOnline ? "bg-emerald-400" : "bg-amber-400"
                            }`}
                          />
                          <span>{svc.status}</span>
                        </span>
                      </div>

                      <h3 className="font-bold text-sm text-white">{svc.name}</h3>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {svc.description}
                      </p>

                      <div className="pt-2 space-y-1 text-[11px]">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Modelo IA:</span>
                          <span className="font-mono text-slate-300 truncate max-w-[190px]">
                            {svc.model}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Agências:</span>
                          <span className="font-semibold text-amber-400">
                            {svc.agencies?.join(", ")}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">HTTP Latency:</span>
                          <span className="font-mono text-emerald-400">
                            {svc.latency_ms !== null ? `${svc.latency_ms} ms` : "—"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleTriggerService(svc.service_id)}
                      disabled={isRunning}
                      className="w-full py-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500 hover:text-slate-950 text-emerald-300 border border-emerald-500/30 font-bold text-xs flex items-center justify-center space-x-1.5 transition"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>
                        {isRunning
                          ? "Executing DL Inference..."
                          : "Execute Live DL Inference"}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Live Inference Terminal Output */}
            {lastInferenceOutput && (
              <div className="bg-[#090e17] border border-emerald-500/40 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-xs font-bold text-emerald-400">
                    <Terminal className="w-4 h-4" />
                    <span>
                      MICROSERVICE REAL-TIME DL OUTPUT (EVENT BROADCAST TO TACTICAL MAP)
                    </span>
                  </div>
                  <button
                    onClick={() => setLastInferenceOutput(null)}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    Dismiss
                  </button>
                </div>
                <pre className="bg-[#05080f] p-3 rounded-lg text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-60">
                  {JSON.stringify(lastInferenceOutput, null, 2)}
                </pre>
              </div>
            )}

            {/* Stateful Data Infrastructure */}
            <div className="bg-[#090e17] border border-slate-800 rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Cpu className="w-4 h-4 text-sky-400" />
                <span>Stateful Data Mesh & Distributed Concurrency Locks</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {infraServices.map((inf) => (
                  <div
                    key={inf.port}
                    className="p-3 rounded-lg bg-[#060a12] border border-slate-800 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-sky-400">
                        :{inf.port}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-400">
                        ● {inf.status}
                      </span>
                    </div>
                    <div className="font-bold text-xs text-white">{inf.name}</div>
                    <div className="text-[11px] text-slate-400">{inf.role}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Google Colab GPU Training Notebooks Suite */}
            <div className="bg-[#090e17] border border-amber-500/30 rounded-xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span>
                      Google Colab GPU Training Suite (PyTorch AMP + ONNX Runtime Export)
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Production-ready notebooks in <code className="text-amber-300">notebooks/colab/</code> optimized for NVIDIA T4 / L4 / A100 GPUs with automated <code className="text-sky-300">.onnx</code> weight export.
                  </p>
                </div>
                <a
                  href="https://colab.research.google.com/github/maykonlincolnusa/FRONTIER-OS-Frontier-Operating-System-/blob/main/notebooks/colab/00_FRONTIER_C4ISR_Master_Colab_Training_Suite.ipynb"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition"
                >
                  🚀 Open Master Suite in Google Colab
                </a>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                {[
                  {
                    title: "01. Maritime AIS LSTM",
                    file: "01_Maritime_AIS_LSTM_Colab_GPU.ipynb",
                    model: "maritime_lstm.onnx",
                    agency: "USCG / US Navy",
                  },
                  {
                    title: "02. Airspace ADS-B AE",
                    file: "02_Airspace_ADSB_Autoencoder_Colab_GPU.ipynb",
                    model: "airspace_ae.onnx",
                    agency: "USAF / CBP AMO",
                  },
                  {
                    title: "03. Narcotics ST-GNN",
                    file: "03_Narcotics_STGNN_Corridors_Colab_GPU.ipynb",
                    model: "narcotics_stgnn.onnx",
                    agency: "DEA / CBP / HIDTA",
                  },
                  {
                    title: "04. Satellite YOLOv8 Recon",
                    file: "04_Satellite_YOLOv8_xView_Recon_Colab_GPU.ipynb",
                    model: "frontier_sat_yolov8.onnx",
                    agency: "US Army / NGA / FBI",
                  },
                ].map((nb) => (
                  <a
                    key={nb.file}
                    href={`https://colab.research.google.com/github/maykonlincolnusa/FRONTIER-OS-Frontier-Operating-System-/blob/main/notebooks/colab/${nb.file}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-3 rounded-lg bg-[#060a12] border border-slate-800 hover:border-amber-500/60 transition flex flex-col justify-between space-y-2"
                  >
                    <div>
                      <div className="font-bold text-white">{nb.title}</div>
                      <div className="text-[10px] text-amber-400 font-semibold mt-0.5">
                        {nb.agency}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-2 border-t border-slate-800/80">
                      <span>{nb.model}</span>
                      <span className="text-sky-400 font-sans font-bold">
                        Colab ↗
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          VIEW 3: C4ISR TACTICAL AI COPILOT (Multi-Agent RAG)
         ===================================================================== */}
      {activeView === "copilot" && (
        <div className="flex-1 flex flex-col max-w-5xl w-full mx-auto p-6 overflow-hidden">
          <div className="flex-1 bg-[#090e17] border border-slate-800 rounded-xl flex flex-col overflow-hidden">
            {/* Quick Prompts Bar */}
            <div className="p-3 border-b border-slate-800 flex flex-wrap gap-2 bg-[#060a12]">
              <button
                onClick={() =>
                  handleSendCopilot(
                    "Generate a comprehensive SITREP for Ring 1 Maritime and dark rendezvous vessels."
                  )
                }
                className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-xs text-sky-300 transition"
              >
                🚢 Ring 1 Maritime SITREP
              </button>
              <button
                onClick={() =>
                  handleSendCopilot(
                    "Forecast high-risk trafficking corridor surges along the Laredo and El Paso POEs."
                  )
                }
                className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-xs text-amber-300 transition"
              >
                ⚠️ DEA / CBP Narcotics Forecast
              </button>
              <button
                onClick={() =>
                  handleSendCopilot(
                    "List FBI Wanted fugitive sightings detected along Interstate I-10 and I-35."
                  )
                }
                className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-xs text-rose-300 transition"
              >
                🚨 FBI Wanted Sightings (Ring 3)
              </button>
              <button
                onClick={() =>
                  handleSendCopilot(
                    "Summarize transnational multimodal logistics routes for PCC and Comando Vermelho connecting Brazil to Panama and the US."
                  )
                }
                className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-xs text-purple-300 transition"
              >
                🌎 Pan-American Syndicates (PCC / CV)
              </button>
            </div>

            {/* Chat History */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {copilotMessages.map((m, i) => (
                <div
                  key={i}
                  className={`p-3.5 rounded-xl text-xs leading-relaxed whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-sky-500/15 border border-sky-500/30 text-sky-100 ml-12"
                      : "bg-[#060a12] border border-slate-800 text-slate-200 mr-12"
                  }`}
                >
                  {m.text}
                </div>
              ))}
              {copilotLoading && (
                <div className="text-xs text-sky-400 font-mono animate-pulse px-2">
                  Querying PostGIS Spatial Shards, Qdrant Vector DB, and ST-GNN models...
                </div>
              )}
            </div>

            {/* Input Box */}
            <div className="p-3 border-t border-slate-800 flex items-center space-x-2 bg-[#060a12]">
              <input
                type="text"
                value={copilotPrompt}
                onChange={(e) => setCopilotPrompt(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendCopilot()}
                placeholder="Ask C4ISR Copilot about targets, South American syndicates, FBI wanted persons, or seizures..."
                className="flex-1 bg-[#090e17] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
              />
              <button
                onClick={() => handleSendCopilot()}
                className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs flex items-center space-x-1"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          VIEW 4: OFFICIAL US GOVERNMENT DATA (OFAC SDN / FBI / OpenSky / CBP)
         ===================================================================== */}
      {activeView === "govdata" && (
        <div className="flex-1 overflow-y-auto p-6 bg-[#060a12]">
          <div className="max-w-7xl mx-auto space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setGovSubTab("missing_ht")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  govSubTab === "missing_ht"
                    ? "bg-emerald-500 text-slate-950 shadow-md"
                    : "bg-[#090e17] text-slate-300 border border-slate-800"
                }`}
              >
                🆘 Tráfico de Pessoas & Desaparecidos (FBI ViCAP / Interpol / PF) ({missingHtData?.total_records ?? 28})
              </button>
              <button
                onClick={() => setGovSubTab("ofac")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  govSubTab === "ofac"
                    ? "bg-cyan-500 text-slate-950"
                    : "bg-[#090e17] text-slate-300 border border-slate-800"
                }`}
              >
                🏛️ OFAC SDN & Interpol Watchlist ({ofacList.length})
              </button>
              <button
                onClick={() => setGovSubTab("fbi")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  govSubTab === "fbi"
                    ? "bg-rose-500 text-slate-950"
                    : "bg-[#090e17] text-slate-300 border border-slate-800"
                }`}
              >
                🚨 FBI Wanted API ({fbiList.length})
              </button>
              <button
                onClick={() => setGovSubTab("opensky")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  govSubTab === "opensky"
                    ? "bg-sky-500 text-slate-950"
                    : "bg-[#090e17] text-slate-300 border border-slate-800"
                }`}
              >
                ✈️ OpenSky Airspace Radar ({flightsList.length})
              </button>
              <button
                onClick={() => setGovSubTab("cbp")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  govSubTab === "cbp"
                    ? "bg-amber-500 text-slate-950"
                    : "bg-[#090e17] text-slate-300 border border-slate-800"
                }`}
              >
                📦 CBP Seizure Metrics (Fentanyl / Cocaine)
              </button>
            </div>

            {govSubTab === "missing_ht" && (
              <div className="space-y-4">
                {/* Connected APIs & Live Sync Header */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/50 via-slate-900 to-cyan-950/40 border border-emerald-500/40 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                        🆘 Monitoramento Global de Tráfico de Pessoas & Pessoas Desaparecidas (FBI API + Interpol + PF Brasil + Europol/UK)
                      </div>
                      <p className="text-[11px] text-slate-300 mt-0.5">
                        Integração direta com <code>https://api.fbi.gov/wanted/v1/list</code> (<em>Kidnappings and Missing Persons</em>, <em>ViCAP Missing Persons</em>, <em>Crimes Against Children</em>), Difusão Amarela da Interpol (<em>Yellow Notices</em>), Amber Alert / SINESP (PF Brasil) e Europol EMPACT THB.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={missingSearch}
                        onChange={(e) => setMissingSearch(e.target.value)}
                        placeholder="Filtrar nome, cidade, ViCAP, Pacaraima..."
                        className="bg-[#060a12] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white w-64"
                      />
                      <button
                        onClick={() => fetchMissingHt(missingSearch, true)}
                        disabled={syncingFbiLive}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition"
                      >
                        {syncingFbiLive ? "Sincronizando api.fbi.gov..." : "🔄 Sincronizar API Oficial do FBI Agora"}
                      </button>
                    </div>
                  </div>

                  {/* Corridors Summary */}
                  {missingHtData?.trafficking_corridors && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1">
                      {missingHtData.trafficking_corridors.map((c: any) => (
                        <div key={c.corridor_id} className="p-3 rounded-lg bg-[#060a12]/90 border border-slate-800 space-y-1 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[10px] text-emerald-400 font-bold">{c.corridor_id}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 font-bold">{c.risk_level}</span>
                          </div>
                          <div className="font-bold text-white">{c.name}</div>
                          <div className="text-[11px] text-slate-400">{c.modus_operandi}</div>
                          <div className="text-[10px] font-mono text-cyan-300 pt-1">Sensores: {c.active_sensors}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Missing Persons & Trafficking Records Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(missingHtData?.records || []).map((rec: any) => (
                    <div
                      key={rec.uid}
                      className="p-3.5 rounded-xl bg-[#090e17] border border-slate-800 hover:border-emerald-500/50 transition flex flex-col justify-between space-y-2.5"
                    >
                      <div className="flex space-x-3">
                        {rec.image_url ? (
                          <img
                            src={rec.image_url}
                            alt={rec.name}
                            className="w-16 h-20 object-cover rounded-lg border border-slate-700 shrink-0"
                          />
                        ) : (
                          <div className="w-16 h-20 rounded-lg bg-emerald-950/60 border border-emerald-500/40 flex flex-col items-center justify-center text-center p-1 shrink-0">
                            <span className="text-lg">🆘</span>
                            <span className="text-[9px] font-mono text-emerald-300 leading-tight">ALERTA ATIVO</span>
                          </div>
                        )}
                        <div className="space-y-1 overflow-hidden flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 truncate">
                              {rec.badge_label}
                            </span>
                          </div>
                          <div className="font-bold text-xs text-white line-clamp-1" title={rec.name}>
                            {rec.name}
                          </div>
                          <div className="text-[10px] text-amber-300 font-semibold line-clamp-1">
                            {rec.source_agency}
                          </div>
                          <div className="text-[11px] text-slate-400 line-clamp-2">
                            {rec.description}
                          </div>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono">
                        <span className="text-cyan-400 truncate">
                          📍 {(rec.field_offices || []).slice(0, 2).join(", ").toUpperCase()}
                        </span>
                        <a
                          href={rec.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-400 hover:underline font-sans font-bold shrink-0"
                        >
                          Ficha Oficial ↗
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {govSubTab === "ofac" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {ofacList.map((entry: any) => (
                  <div
                    key={entry.sdn_id}
                    className="p-4 rounded-xl bg-[#090e17] border border-slate-800 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono text-cyan-400 font-bold">
                        {entry.sdn_id} • {entry.type}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/40">
                        {(entry.risk_score * 100).toFixed(0)}% RISK
                      </span>
                    </div>
                    <div className="text-sm font-bold text-white">{entry.name}</div>
                    <div className="text-xs text-amber-300">{entry.program}</div>
                    <div className="text-xs text-slate-400">
                      Jurisdiction: <strong className="text-slate-200">{entry.nationality}</strong> • Syndicate:{" "}
                      <strong className="text-purple-300">{entry.syndicate}</strong>
                    </div>
                    <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-300">
                      <strong>Linked Entities:</strong> {(entry.linked_entities || []).join(" | ")}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {govSubTab === "fbi" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {fbiList.map((f) => (
                  <div
                    key={f.uid}
                    className="p-3.5 rounded-xl bg-[#090e17] border border-slate-800 flex space-x-3"
                  >
                    {f.image_url && (
                      <img
                        src={f.image_url}
                        alt={f.title}
                        className="w-16 h-20 object-cover rounded-lg border border-slate-700 shrink-0"
                      />
                    )}
                    <div className="space-y-1 overflow-hidden">
                      <div className="font-bold text-xs text-white truncate">
                        {f.title}
                      </div>
                      <div className="text-[10px] text-rose-400 font-semibold line-clamp-1">
                        {f.warning_message}
                      </div>
                      <div className="text-[11px] text-slate-400 line-clamp-2">
                        {f.description || f.subjects?.join(", ")}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {govSubTab === "opensky" && (
              <div className="bg-[#090e17] border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#060a12] text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-3">ICAO24</th>
                      <th className="p-3">Callsign</th>
                      <th className="p-3">Origin Country</th>
                      <th className="p-3">Position</th>
                      <th className="p-3">Altitude (m)</th>
                      <th className="p-3">Velocity (m/s)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {flightsList.map((fl, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/30">
                        <td className="p-3 text-sky-400">{fl.icao24}</td>
                        <td className="p-3 font-bold text-white">{fl.callsign}</td>
                        <td className="p-3 text-slate-300">{fl.origin_country}</td>
                        <td className="p-3 text-slate-400">
                          {fl.latitude?.toFixed(2)}°, {fl.longitude?.toFixed(2)}°
                        </td>
                        <td className="p-3 text-amber-300">{fl.altitude_m ?? 0}</td>
                        <td className="p-3 text-emerald-300">{fl.velocity_mps ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {govSubTab === "cbp" && (
              <div className="bg-[#090e17] border border-slate-800 rounded-xl p-4">
                <pre className="text-xs font-mono text-amber-300 overflow-x-auto">
                  {JSON.stringify(cbpSummary, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
