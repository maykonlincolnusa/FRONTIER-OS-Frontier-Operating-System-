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
} from "lucide-react";
import type { ThreatAlert, CameraPreset } from "./components/TacticalMap";

const TacticalMap = dynamic(() => import("./components/TacticalMap"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center h-full w-full bg-[#060a12] text-sky-400 space-y-3">
      <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
      <span className="font-mono text-xs tracking-widest uppercase">
        Inicializando Satélite Hemisférico C4ISR...
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
    metadata: { sog_knots: 1.8, status: "DARK_VESSEL_GOLFO" },
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
    metadata: { altitude_ft: 520, velocity_knots: 115 },
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
    metadata: { hit: "I-10 San Antonio", face_score: 0.96 },
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
    metadata: { origin: "Tumaco / Colômbia", theater: "Pacífico Leste" },
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
    metadata: { corridor: "Passagem de Mona (Caribe)" },
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
    metadata: { port: "Porto de Santos / Brasil", destination: "Houston" },
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
      "Embarcação rápida encalhou em South Padre Island; jurisdição transferida da Guarda Costeira (Anel 1) para a Patrulha de Fronteira CBP (Anel 2).",
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
      "Comboio ingressou na rodovia interestadual I-10 em Tucson; custódia transferida para força-tarefa FBI / DEA (Anel 3).",
  },
];

export default function CommandCenterPage() {
  // Primary Command Mode
  const [activeView, setActiveView] = useState<
    "operations" | "microservices" | "copilot" | "govdata"
  >("operations");

  // Map & Telemetry State
  const [threats, setThreats] = useState<ThreatAlert[]>(INITIAL_THREATS);
  const [handoffs, setHandoffs] = useState<JurisdictionHandoff[]>(INITIAL_HANDOFFS);
  const [selectedTarget, setSelectedTarget] = useState<ThreatAlert | null>(null);
  const [ringFilter, setRingFilter] = useState<string>("ALL");
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>("americas");
  const [sidebarTab, setSidebarTab] = useState<"targets" | "handoffs">("targets");
  const [wsConnected, setWsConnected] = useState<boolean>(false);

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
      text: "**[COPILOTO C4ISR PRONTO]**\nConectado à malha de 7 microsserviços (Portas `8000`–`8006`), PostGIS Spatial Engine e Qdrant Vector DB.\n\nSelecione um comando rápido ou digite sua consulta tática abaixo.",
    },
  ]);
  const [copilotLoading, setCopilotLoading] = useState<boolean>(false);

  // Gov Data State
  const [fbiList, setFbiList] = useState<Fugitive[]>([]);
  const [flightsList, setFlightsList] = useState<Flight[]>([]);
  const [cbpSummary, setCbpSummary] = useState<Record<string, any> | null>(null);
  const [govSubTab, setGovSubTab] = useState<"fbi" | "opensky" | "cbp">("fbi");

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
    const interval = setInterval(fetchMeshStatus, 8000);
    return () => clearInterval(interval);
  }, [fetchMeshStatus]);

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
  useEffect(() => {
    if (activeView !== "govdata") return;
    fetch(`${gatewayUrl}/api/v1/gov-data/fbi?limit=18`)
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
  }, [activeView, gatewayUrl]);

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
          text: "Erro de comunicação com o Gateway C2 (`http://localhost:8000`).",
        },
      ]);
    }
    setCopilotLoading(false);
  };

  // Filtered Threats
  const filteredThreats = threats.filter(
    (t) => ringFilter === "ALL" || t.ring === ringFilter
  );

  const onlineServicesCount =
    microservices.filter((m) => m.status === "ONLINE").length || 7;

  return (
    <div className="flex flex-col h-screen w-screen bg-[#060a12] text-slate-100 overflow-hidden select-none">
      {/* =====================================================================
          TOP COMMAND BAR (Sleek 52px Military C4ISR Header)
         ===================================================================== */}
      <header className="h-13 shrink-0 bg-[#090e17] border-b border-slate-800/80 px-4 flex items-center justify-between z-30">
        {/* Brand & Live Mesh Indicator */}
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 rounded-lg bg-sky-500/15 border border-sky-500/40 flex items-center justify-center text-sky-400">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold tracking-wider text-sm text-white">
                FRONTIER-OS
              </span>
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 font-semibold">
                C4ISR v2.4
              </span>
            </div>
            <p className="text-[10px] text-slate-400 hidden sm:block">
              Comando Hemisférico Integrado — EUA & América do Sul
            </p>
          </div>
        </div>

        {/* Center Navigation Tabs (4 Clean Views) */}
        <nav className="flex items-center space-x-1 bg-[#060a12] p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveView("operations")}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              activeView === "operations"
                ? "bg-sky-500 text-slate-950 font-bold shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Teatro de Operações</span>
          </button>

          <button
            onClick={() => setActiveView("microservices")}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              activeView === "microservices"
                ? "bg-emerald-500 text-slate-950 font-bold shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Microsserviços ({onlineServicesCount}/7)</span>
          </button>

          <button
            onClick={() => setActiveView("copilot")}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              activeView === "copilot"
                ? "bg-purple-500 text-slate-950 font-bold shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Copiloto IA</span>
          </button>

          <button
            onClick={() => setActiveView("govdata")}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              activeView === "govdata"
                ? "bg-amber-500 text-slate-950 font-bold shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Dados Oficiais EUA</span>
          </button>
        </nav>

        {/* Right Telemetry Status */}
        <div className="flex items-center space-x-3">
          <div className="hidden lg:flex items-center space-x-2 bg-[#060a12] px-2.5 py-1 rounded-md border border-slate-800 text-[11px]">
            <span
              className={`h-2 w-2 rounded-full ${
                wsConnected ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
              }`}
            />
            <span className="font-mono text-slate-300">
              {wsConnected ? "STREAM C2 ATIVO" : "MODO LOCAL"}
            </span>
          </div>
        </div>
      </header>

      {/* =====================================================================
          VIEW 1: TEATRO DE OPERAÇÕES (Clean Full-Screen Map + Focused Sidebar)
         ===================================================================== */}
      {activeView === "operations" && (
        <div className="flex-1 flex overflow-hidden relative">
          {/* LEFT TACTICAL SIDEBAR (330px, Uncluttered) */}
          <aside className="w-80 shrink-0 bg-[#090e17] border-r border-slate-800/80 flex flex-col z-20">
            {/* Ring Filter Selector (3 Defense Rings) */}
            <div className="p-3 border-b border-slate-800/80">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Filtro por Anel de Defesa
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
                  Todos ({threats.length})
                </button>
                <button
                  onClick={() => setRingFilter("RING_1_MARITIME")}
                  className={`py-1.5 rounded text-[11px] font-bold transition ${
                    ringFilter === "RING_1_MARITIME"
                      ? "bg-sky-500 text-slate-950"
                      : "bg-[#060a12] text-sky-400 hover:bg-sky-500/10 border border-slate-800"
                  }`}
                >
                  Anel 1
                </button>
                <button
                  onClick={() => setRingFilter("RING_2_FEDERAL")}
                  className={`py-1.5 rounded text-[11px] font-bold transition ${
                    ringFilter === "RING_2_FEDERAL"
                      ? "bg-amber-500 text-slate-950"
                      : "bg-[#060a12] text-amber-400 hover:bg-amber-500/10 border border-slate-800"
                  }`}
                >
                  Anel 2
                </button>
                <button
                  onClick={() => setRingFilter("RING_3_INTERSTATE")}
                  className={`py-1.5 rounded text-[11px] font-bold transition ${
                    ringFilter === "RING_3_INTERSTATE"
                      ? "bg-red-500 text-slate-950"
                      : "bg-[#060a12] text-red-400 hover:bg-red-500/10 border border-slate-800"
                  }`}
                >
                  Anel 3
                </button>
              </div>
            </div>

            {/* Sub-Tabs: Alvos vs Handoffs */}
            <div className="flex border-b border-slate-800/80 text-xs font-semibold">
              <button
                onClick={() => setSidebarTab("targets")}
                className={`flex-1 py-2.5 text-center border-b-2 transition ${
                  sidebarTab === "targets"
                    ? "border-sky-400 text-sky-400 bg-sky-500/5"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                🎯 Alvos Monitorados ({filteredThreats.length})
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
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${ringBadge}`}
                        >
                          {t.lead_agency}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-300 font-medium truncate">
                        {t.threat_type.replace(/_/g, " ")}
                      </div>
                      <div className="flex items-center justify-between mt-2 text-[10px] text-slate-400 font-mono">
                        <span>
                          {t.latitude.toFixed(2)}°, {t.longitude.toFixed(2)}°
                        </span>
                        <span className="text-rose-400 font-semibold">
                          {(t.severity * 100).toFixed(0)}% Risco
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                handoffs.map((h, i) => (
                  <div
                    key={h.handoff_id || i}
                    className="p-3 rounded-lg bg-[#060a12] border border-slate-800 space-y-1.5"
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
                  </div>
                ))
              )}
            </div>
          </aside>

          {/* MAIN MAP WORKSPACE */}
          <main className="flex-1 relative h-full">
            {/* TOP-LEFT CAMERA PRESETS BAR (Clean Floating Pills) */}
            <div className="absolute top-3 left-3 z-[1000] flex flex-wrap items-center gap-1.5 bg-[#090e17]/90 backdrop-blur-md border border-slate-800 p-1.5 rounded-xl shadow-2xl">
              <button
                onClick={() => setCameraPreset("americas")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  cameraPreset === "americas"
                    ? "bg-sky-500 text-slate-950 font-bold"
                    : "text-slate-300 hover:bg-slate-800"
                }`}
              >
                🌎 Américas (Norte + Sul)
              </button>
              <button
                onClick={() => setCameraPreset("south_america")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  cameraPreset === "south_america"
                    ? "bg-emerald-500 text-slate-950 font-bold"
                    : "text-slate-300 hover:bg-slate-800"
                }`}
              >
                🇧🇷 América do Sul
              </button>
              <button
                onClick={() => setCameraPreset("us")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  cameraPreset === "us"
                    ? "bg-sky-500 text-slate-950 font-bold"
                    : "text-slate-300 hover:bg-slate-800"
                }`}
              >
                🇺🇸 Estados Unidos (50 Estados)
              </button>
              <button
                onClick={() => setCameraPreset("border")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  cameraPreset === "border"
                    ? "bg-amber-500 text-slate-950 font-bold"
                    : "text-slate-300 hover:bg-slate-800"
                }`}
              >
                🌵 Fronteira EUA-México
              </button>
              <button
                onClick={() => setCameraPreset("caribbean")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  cameraPreset === "caribbean"
                    ? "bg-teal-500 text-slate-950 font-bold"
                    : "text-slate-300 hover:bg-slate-800"
                }`}
              >
                🌊 Caribe & Golfo
              </button>
            </div>

            {/* Interactive Leaflet Map */}
            <TacticalMap
              threats={threats}
              selectedTarget={selectedTarget}
              onSelectTarget={setSelectedTarget}
              ringFilter={ringFilter}
              cameraPreset={cameraPreset}
              onPresetChange={setCameraPreset}
            />

            {/* RIGHT SLIDE-OVER TARGET DOSSIER (Only visible when a target is selected) */}
            {selectedTarget && (
              <div className="absolute top-3 right-3 w-80 bg-[#090e17]/95 backdrop-blur-md border border-slate-700 rounded-xl shadow-2xl p-4 z-[1000] space-y-3">
                <div className="flex items-start justify-between border-b border-slate-800 pb-2.5">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-sky-400">
                      Dossiê de Alvo Tático
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
                    <span className="text-slate-400">Classificação:</span>
                    <span className="font-semibold text-white">
                      {selectedTarget.threat_type.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Agência Líder:</span>
                    <span className="font-bold text-sky-400">
                      {selectedTarget.lead_agency}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Anel de Defesa:</span>
                    <span className="font-mono text-amber-400">
                      {selectedTarget.ring}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Coordenadas:</span>
                    <span className="font-mono text-slate-200">
                      {selectedTarget.latitude.toFixed(4)}°,{" "}
                      {selectedTarget.longitude.toFixed(4)}°
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Severidade IA:</span>
                    <span className="font-bold text-rose-400">
                      {(selectedTarget.severity * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex flex-col gap-2">
                  <button
                    onClick={() => {
                      setActiveView("copilot");
                      handleSendCopilot(
                        `Gere um plano de interceptação tática para o alvo ${selectedTarget.target_id} (${selectedTarget.threat_type}) sob jurisdição da ${selectedTarget.lead_agency}`
                      );
                    }}
                    className="w-full py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs flex items-center justify-center space-x-1.5 transition"
                  >
                    <Bot className="w-3.5 h-3.5" />
                    <span>Gerar Plano de Interceptação IA</span>
                  </button>
                </div>
              </div>
            )}
          </main>
        </div>
      )}

      {/* =====================================================================
          VIEW 2: MALHA DE MICROSSERVIÇOS (Service Mesh 8000-8006 + Live Trigger)
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
                    Malha de Microsserviços C4ISR (7 Serviços + 4 Motores de Dados)
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Todos os microsserviços operam de forma isolada com{" "}
                  <code className="text-sky-400">InferenceProcessPool</code>{" "}
                  (multiprocessing + locks) e comunicam-se via API Gateway e Redpanda Kafka.
                </p>
              </div>
              <button
                onClick={fetchMeshStatus}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${meshLoading ? "animate-spin" : ""}`}
                />
                <span>Atualizar Telemetria da Malha</span>
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
                          <span className="text-slate-500">Latência HTTP:</span>
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
                          ? "Executando Inferência..."
                          : "Executar Inferência ao Vivo"}
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
                      RESPOSTA EM TEMPO REAL DO MICROSSERVIÇO (EVENTO PUBLICADO NO MAPA)
                    </span>
                  </div>
                  <button
                    onClick={() => setLastInferenceOutput(null)}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    Fechar
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
                <span>Camada de Dados & Locks Distribuídos (Containers Ativos)</span>
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
                      Suíte de Treinamento GPU no Google Colab (PyTorch AMP + Exportação ONNX)
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Notebooks prontos em <code className="text-amber-300">notebooks/colab/</code> configurados para GPUs NVIDIA T4 / L4 / A100 com download automático dos pesos <code className="text-sky-300">.onnx</code>.
                  </p>
                </div>
                <a
                  href="https://colab.research.google.com/github/maykonlincolnusa/FRONTIER-OS-Frontier-Operating-System-/blob/main/notebooks/colab/00_FRONTIER_C4ISR_Master_Colab_Training_Suite.ipynb"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition"
                >
                  🚀 Abrir Master Notebook no Colab
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
          VIEW 3: COPILOTO TÁTICO IA (Multi-Agent RAG)
         ===================================================================== */}
      {activeView === "copilot" && (
        <div className="flex-1 flex flex-col max-w-5xl w-full mx-auto p-6 overflow-hidden">
          <div className="flex-1 bg-[#090e17] border border-slate-800 rounded-xl flex flex-col overflow-hidden">
            {/* Quick Prompts Bar */}
            <div className="p-3 border-b border-slate-800 flex flex-wrap gap-2 bg-[#060a12]">
              <button
                onClick={() =>
                  handleSendCopilot(
                    "Gere um SITREP completo do Anel 1 Marítimo e embarcações Dark Ship"
                  )
                }
                className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-xs text-sky-300 transition"
              >
                🚢 SITREP Anel 1 (Marítimo)
              </button>
              <button
                onClick={() =>
                  handleSendCopilot(
                    "Qual a previsão de risco de narcóticos nos corredores de Laredo e El Paso?"
                  )
                }
                className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-xs text-amber-300 transition"
              >
                ⚠️ Corredores DEA / CBP
              </button>
              <button
                onClick={() =>
                  handleSendCopilot(
                    "Listar alertas de fugitivos do FBI Wanted identificados nas interestaduais I-10 e I-35"
                  )
                }
                className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-xs text-rose-300 transition"
              >
                🚨 Procurados FBI (Anel 3)
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
                  Consultando agentes PostGIS, Qdrant e ST-GNN...
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
                placeholder="Pergunte ao Copiloto C4ISR sobre alvos, rotas da América do Sul, fugitivos do FBI ou apreensões..."
                className="flex-1 bg-[#090e17] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
              />
              <button
                onClick={() => handleSendCopilot()}
                className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs flex items-center space-x-1"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Enviar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          VIEW 4: DADOS OFICIAIS DO GOVERNO DOS EUA (FBI / OpenSky / CBP)
         ===================================================================== */}
      {activeView === "govdata" && (
        <div className="flex-1 overflow-y-auto p-6 bg-[#060a12]">
          <div className="max-w-7xl mx-auto space-y-4">
            <div className="flex items-center space-x-2">
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
                ✈️ Radar OpenSky ({flightsList.length})
              </button>
              <button
                onClick={() => setGovSubTab("cbp")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  govSubTab === "cbp"
                    ? "bg-amber-500 text-slate-950"
                    : "bg-[#090e17] text-slate-300 border border-slate-800"
                }`}
              >
                📦 Apreensões CBP (Fentanil / Cocaína)
              </button>
            </div>

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
                      <th className="p-3">País</th>
                      <th className="p-3">Posição</th>
                      <th className="p-3">Altitude (m)</th>
                      <th className="p-3">Velocidade (m/s)</th>
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
  );
}
