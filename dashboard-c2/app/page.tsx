"use client";

import React, { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  Shield,
  Radio,
  AlertTriangle,
  Plane,
  Ship,
  Car,
  Activity,
  Layers,
  Crosshair,
  ArrowRight,
  Filter,
  Bot,
  Database,
  Info,
  Send,
  Search,
  ExternalLink,
  ChevronRight,
  RefreshCw,
} from "lucide-react";

// Dynamically import Leaflet TacticalMap with SSR disabled
const TacticalMap = dynamic(() => import("./components/TacticalMap"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center h-full w-full bg-[#070b12] text-sky-400 space-y-3">
      <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
      <span className="font-mono text-xs tracking-wider">CARREGANDO MAPA TÁTICO SATELITAL...</span>
    </div>
  ),
});

interface ThreatAlert {
  event_id: string;
  subsystem: string;
  ring: string;
  lead_agency: string;
  severity: number;
  latitude: number;
  longitude: number;
  target_id: string;
  threat_type: string;
  metadata?: Record<string, any>;
}

interface JurisdictionHandoff {
  handoff_id: string;
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

const DEFAULT_THREATS: ThreatAlert[] = [
  {
    event_id: "init-01",
    subsystem: "01-maritime-coastline",
    ring: "RING_1_MARITIME",
    lead_agency: "USCG",
    severity: 0.89,
    latitude: 26.15,
    longitude: -95.20,
    target_id: "MMSI-3678129",
    threat_type: "AIS_DARK_SHIP_OR_RENDEZVOUS",
    metadata: { sog_knots: 1.8, status: "DARK_VESSEL" },
  },
  {
    event_id: "init-02",
    subsystem: "02-airspace-shield",
    ring: "RING_2_FEDERAL",
    lead_agency: "USAF",
    severity: 0.94,
    latitude: 31.40,
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
    latitude: 27.50,
    longitude: -99.50,
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
    metadata: { hit: "I-10 Junction San Antonio", face_score: 0.96 },
  },
  {
    event_id: "init-05",
    subsystem: "05-geospatial-recon",
    ring: "RING_2_FEDERAL",
    lead_agency: "US_ARMY",
    severity: 0.82,
    latitude: 31.85,
    longitude: -110.20,
    target_id: "SAT-TILE-AZ77",
    threat_type: "DESERT_VEHICLE_CONVOY",
    metadata: { source: "Sentinel-2 Satellite", count: 4 },
  },
];

const DEFAULT_HANDOFFS: JurisdictionHandoff[] = [
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
    reason: "Embarcação clandestina encalhou em South Padre Island fora do Porto de Entrada; custódia transferida para a Patrulha de Fronteira (CBP).",
  },
  {
    handoff_id: "hd-02",
    timestamp: new Date(Date.now() - 120000).toISOString(),
    target_id: "CONVOY-AZ-19",
    from_ring: "RING_2_FEDERAL",
    to_ring: "RING_3_INTERSTATE",
    from_agency: "CBP",
    to_agency: "FBI",
    last_known_lat: 32.22,
    last_known_lon: -110.97,
    reason: "Comboio evadiu checkpoint federal e acessou a rodovia I-10 em Tucson; handoff automático para cerco conjunto com FBI e Polícia Rodoviária.",
  },
];

export default function C4ISRDashboard() {
  const [activeTab, setActiveTab] = useState<"map" | "targets" | "handoffs" | "copilot" | "datasets" | "guide">("map");
  const [threats, setThreats] = useState<ThreatAlert[]>(DEFAULT_THREATS);
  const [handoffs, setHandoffs] = useState<JurisdictionHandoff[]>(DEFAULT_HANDOFFS);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [agencyFilter, setAgencyFilter] = useState<string>("ALL");
  const [ringFilter, setRingFilter] = useState<string>("ALL");
  const [selectedTarget, setSelectedTarget] = useState<ThreatAlert | null>(DEFAULT_THREATS[0]);

  // Copilot State
  const [copilotInput, setCopilotInput] = useState<string>("");
  const [copilotMessages, setCopilotMessages] = useState<Array<{ sender: "user" | "bot"; text: string }>>([
    {
      sender: "bot",
      text: "👋 Olá, Comandante. Sou o Copiloto Tático C4ISR do Project Frontier. Você pode me fazer perguntas operacionais sobre os 3 Anéis de Segurança, alvos marítimos, voos na fronteira, alertas do FBI ou pedir um relatório SITREP.",
    },
  ]);
  const [isCopilotLoading, setIsCopilotLoading] = useState<boolean>(false);

  // Government Data State
  const [fugitives, setFugitives] = useState<Fugitive[]>([]);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [cbpSummary, setCbpSummary] = useState<any>(null);
  const [searchTarget, setSearchTarget] = useState<string>("");

  // Connect to C2 Gateway WebSocket
  useEffect(() => {
    let ws: WebSocket | null = null;
    let timer: NodeJS.Timeout | null = null;

    const connectWebSocket = () => {
      try {
        const wsUrl = process.env.NEXT_PUBLIC_C2_WS_URL || "ws://localhost:8000/ws/c2-stream";
        ws = new WebSocket(wsUrl);

        ws.onopen = () => setIsConnected(true);

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.event_type === "SNAPSHOT") {
              if (data.threats?.length) setThreats((prev) => [...data.threats, ...prev].slice(0, 50));
              if (data.handoffs?.length) setHandoffs((prev) => [...data.handoffs, ...prev].slice(0, 30));
            } else if (data.event_type === "JURISDICTION_HANDOFF" || data.from_ring) {
              setHandoffs((prev) => [data, ...prev].slice(0, 30));
            } else if (data.severity !== undefined) {
              setThreats((prev) => [data, ...prev].slice(0, 50));
            }
          } catch (e) {
            console.error("WS Parse Error", e);
          }
        };

        ws.onclose = () => {
          setIsConnected(false);
          timer = setTimeout(connectWebSocket, 4000);
        };

        ws.onerror = () => setIsConnected(false);
      } catch (err) {
        setIsConnected(false);
        timer = setTimeout(connectWebSocket, 4000);
      }
    };

    connectWebSocket();

    // Fetch Gov Datasets from Gateway API
    const fetchGovData = async () => {
      try {
        const fbiRes = await fetch("http://localhost:8000/api/v1/gov-data/fbi");
        if (fbiRes.ok) {
          const fbiData = await fbiRes.json();
          setFugitives(fbiData.fugitives || []);
        }

        const skyRes = await fetch("http://localhost:8000/api/v1/gov-data/opensky");
        if (skyRes.ok) {
          const skyData = await skyRes.json();
          setFlights(skyData.flights || []);
        }

        const cbpRes = await fetch("http://localhost:8000/api/v1/gov-data/cbp");
        if (cbpRes.ok) {
          const cbpData = await cbpRes.json();
          setCbpSummary(cbpData.cbp_summary || null);
        }
      } catch (err) {
        console.debug("Could not fetch remote datasets:", err);
      }
    };

    fetchGovData();

    return () => {
      if (ws) ws.close();
      if (timer) clearTimeout(timer);
    };
  }, []);

  // Filtered threats
  const filteredThreats = useMemo(() => {
    return threats.filter((t) => {
      const matchAgency = agencyFilter === "ALL" || t.lead_agency === agencyFilter;
      const matchRing = ringFilter === "ALL" || t.ring === ringFilter;
      const matchSearch =
        !searchTarget ||
        t.target_id.toLowerCase().includes(searchTarget.toLowerCase()) ||
        t.threat_type.toLowerCase().includes(searchTarget.toLowerCase());
      return matchAgency && matchRing && matchSearch;
    });
  }, [threats, agencyFilter, ringFilter, searchTarget]);

  // Send query to C2 Copilot
  const handleSendCopilot = async (textToSend?: string) => {
    const query = textToSend || copilotInput;
    if (!query.trim()) return;

    const newMessages = [...copilotMessages, { sender: "user" as const, text: query }];
    setCopilotMessages(newMessages);
    setCopilotInput("");
    setIsCopilotLoading(true);

    try {
      const res = await fetch("http://localhost:8000/api/v1/copilot/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: query }),
      });
      if (res.ok) {
        const data = await res.json();
        setCopilotMessages([...newMessages, { sender: "bot", text: data.answer }]);
      } else {
        setCopilotMessages([
          ...newMessages,
          { sender: "bot", text: "Erro de comunicação com o Copiloto Tático. Tente novamente." },
        ]);
      }
    } catch (e) {
      setCopilotMessages([
        ...newMessages,
        { sender: "bot", text: "Não foi possível conectar ao C2 Gateway. Verifique se o backend está ativo." },
      ]);
    } finally {
      setIsCopilotLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#070b12] text-slate-100 select-none overflow-hidden font-sans">
      {/* 1. TOP EXECUTIVE HEADER */}
      <header className="h-14 border-b border-[#1e2f4a] bg-[#0b1320] px-4 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-sky-500/10 border border-sky-500/40 text-sky-400">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-sm tracking-wider text-slate-100 font-mono">FRONTIER C4ISR</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 font-bold border border-sky-500/40">
                SISTEMA OPERACIONAL DE FRONTEIRA
              </span>
            </div>
            <p className="text-[10px] text-slate-400">Defesa Territorial em Profundidade nos 3 Anéis de Segurança</p>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <nav className="flex items-center space-x-1 bg-[#111c2e] p-1 rounded-lg border border-[#1e2f4a]">
          <button
            onClick={() => setActiveTab("map")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition ${
              activeTab === "map" ? "bg-sky-500 text-slate-950 shadow-md" : "text-slate-300 hover:text-white"
            }`}
          >
            <span>🗺️</span>
            <span>Mapa Tático</span>
          </button>
          <button
            onClick={() => setActiveTab("targets")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition ${
              activeTab === "targets" ? "bg-sky-500 text-slate-950 shadow-md" : "text-slate-300 hover:text-white"
            }`}
          >
            <span>🎯</span>
            <span>Alvos ({threats.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("handoffs")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition ${
              activeTab === "handoffs" ? "bg-sky-500 text-slate-950 shadow-md" : "text-slate-300 hover:text-white"
            }`}
          >
            <span>🔄</span>
            <span>Transições ({handoffs.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("copilot")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition ${
              activeTab === "copilot" ? "bg-purple-600 text-white shadow-md" : "text-slate-300 hover:text-white"
            }`}
          >
            <Bot className="h-3.5 w-3.5" />
            <span>Copiloto IA</span>
          </button>
          <button
            onClick={() => setActiveTab("datasets")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition ${
              activeTab === "datasets" ? "bg-emerald-600 text-white shadow-md" : "text-slate-300 hover:text-white"
            }`}
          >
            <Database className="h-3.5 w-3.5" />
            <span>Dados Reais EUA</span>
          </button>
          <button
            onClick={() => setActiveTab("guide")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition ${
              activeTab === "guide" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            <Info className="h-3.5 w-3.5" />
            <span>Guia dos 3 Anéis</span>
          </button>
        </nav>

        {/* STATUS BADGES */}
        <div className="flex items-center space-x-3 text-xs">
          <div className="flex items-center space-x-2 px-2.5 py-1 rounded bg-[#111c2e] border border-[#1e2f4a]">
            <Radio className={`h-3.5 w-3.5 ${isConnected ? "text-emerald-400 animate-pulse" : "text-amber-500"}`} />
            <span className={isConnected ? "text-emerald-400 font-semibold" : "text-amber-500 font-semibold"}>
              {isConnected ? "AO VIVO (WEBSOCKET)" : "SIMULAÇÃO LOCAL"}
            </span>
          </div>
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-red-950/50 border border-red-500/40 text-red-400 font-bold">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>DEFCON 3</span>
          </div>
        </div>
      </header>

      {/* 2. SUB-HEADER METRICS BAR */}
      <div className="h-10 bg-[#070b12] border-b border-[#1e2f4a] px-4 flex items-center justify-between text-xs text-slate-300 shrink-0">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <span className="h-2.5 w-2.5 rounded-full bg-sky-400" />
            <span>
              <b>Anel 1 (Marítimo):</b> {threats.filter((t) => t.ring === "RING_1_MARITIME").length} alvos costeiros (USCG / Marinha)
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            <span>
              <b>Anel 2 (Federal):</b> {threats.filter((t) => t.ring === "RING_2_FEDERAL").length} alvos de fronteira (CBP / USAF)
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <span>
              <b>Anel 3 (Interestadual):</b> {threats.filter((t) => t.ring === "RING_3_INTERSTATE").length} alvos rodoviários (FBI / DEA)
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-[11px] text-slate-400">
          <span>Agências: <b>USCG • US Navy • USAF • US Army • CBP • DEA • FBI</b></span>
          <span className="text-emerald-400 font-bold">● COBERTURA DE SENSORES 100%</span>
        </div>
      </div>

      {/* 3. MAIN DYNAMIC WORKSPACE */}
      <div className="flex-1 flex overflow-hidden">
        {/* ======================================================== */}
        {/* VIEW 1: MAPA TÁTICO INTERATIVO COM PAINEL LATERAL       */}
        {/* ======================================================== */}
        {activeTab === "map" && (
          <div className="flex-1 flex overflow-hidden">
            {/* Real Interactive Map Canvas */}
            <main className="flex-1 relative bg-[#070b12] flex flex-col overflow-hidden">
              {/* Map Floating Filters Bar */}
              <div className="absolute top-3 left-4 z-[1000] flex items-center space-x-3 bg-[#0b1320]/90 backdrop-blur border border-[#1e2f4a] p-2 rounded-lg text-xs shadow-xl">
                <div className="flex items-center space-x-1.5 text-slate-400 font-bold pr-2 border-r border-[#1e2f4a]">
                  <Filter className="h-3.5 w-3.5 text-sky-400" />
                  <span>FILTRAR AGÊNCIA:</span>
                </div>
                {["ALL", "USCG", "USAF", "CBP", "DEA", "FBI"].map((ag) => (
                  <button
                    key={ag}
                    onClick={() => setAgencyFilter(ag)}
                    className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                      agencyFilter === ag ? "bg-sky-500 text-slate-950 font-bold" : "text-slate-300 hover:bg-[#1e2f4a]"
                    }`}
                  >
                    {ag === "ALL" ? "TODAS" : ag}
                  </button>
                ))}

                <div className="flex items-center space-x-1.5 text-slate-400 font-bold px-2 border-l border-[#1e2f4a]">
                  <Layers className="h-3.5 w-3.5 text-amber-400" />
                  <span>ANEL:</span>
                </div>
                {["ALL", "RING_1_MARITIME", "RING_2_FEDERAL", "RING_3_INTERSTATE"].map((r) => (
                  <button
                    key={r}
                    onClick={() => setRingFilter(r)}
                    className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                      ringFilter === r ? "bg-amber-500 text-slate-950 font-bold" : "text-slate-300 hover:bg-[#1e2f4a]"
                    }`}
                  >
                    {r === "ALL" ? "TODOS" : r.replace("RING_1_MARITIME", "Anel 1 (Marítimo)").replace("RING_2_FEDERAL", "Anel 2 (Fronteira)").replace("RING_3_INTERSTATE", "Anel 3 (Rodovias)")}
                  </button>
                ))}
              </div>

              {/* The Real Interactive Map */}
              <div className="flex-1 w-full h-full">
                <TacticalMap
                  threats={filteredThreats}
                  selectedTarget={selectedTarget}
                  onSelectTarget={setSelectedTarget}
                  ringFilter={ringFilter}
                />
              </div>

              {/* Selected Target Inspector (Bottom Bar) */}
              {selectedTarget && (
                <div className="h-28 border-t border-[#1e2f4a] bg-[#0b1320] px-6 py-3 flex items-center justify-between shrink-0 z-20">
                  <div className="flex items-center space-x-4">
                    <div className="h-16 w-16 rounded-lg bg-[#111c2e] border border-sky-500/40 flex items-center justify-center text-sky-400">
                      <Crosshair className="h-8 w-8 animate-spin-slow" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2.5">
                        <span className="text-base font-bold text-slate-100 font-mono">{selectedTarget.target_id}</span>
                        <span className="text-xs px-2 py-0.5 rounded font-bold bg-sky-950 text-sky-400 border border-sky-500/40">
                          {selectedTarget.ring.replace("RING_", "Anel ")}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-bold">
                          AGÊNCIA: {selectedTarget.lead_agency}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Classificação de Ameaça: <span className="text-amber-400 font-semibold">{selectedTarget.threat_type}</span> | Coordenadas:{" "}
                        <span className="font-mono text-slate-200">{selectedTarget.latitude.toFixed(4)}°N, {selectedTarget.longitude.toFixed(4)}°W</span>
                      </p>
                    </div>
                  </div>

                  {/* Severity Risk Gauge */}
                  <div className="flex items-center space-x-6">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">
                        Índice de Risco (Deep Learning)
                      </span>
                      <span className="text-2xl font-bold font-mono text-red-400">
                        {(selectedTarget.severity * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-12 w-32 bg-[#111c2e] rounded-lg border border-[#1e2f4a] p-1.5 flex items-center">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-red-500 rounded"
                        style={{ width: `${selectedTarget.severity * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </main>

            {/* Right Live Handoffs Feed */}
            <aside className="w-96 border-l border-[#1e2f4a] bg-[#0b1320] flex flex-col z-20 shrink-0">
              <div className="p-3 border-b border-[#1e2f4a] flex items-center justify-between bg-[#0e1726]">
                <div className="flex items-center space-x-2">
                  <Activity className="h-4 w-4 text-sky-400 animate-pulse" />
                  <span className="text-xs font-bold tracking-wider text-slate-100 uppercase">
                    Transições Inter-Agências
                  </span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 font-bold">
                  POSTGIS EVENT BUS
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                <p className="text-[11px] text-slate-400 mb-2">
                  Quando um alvo cruza os limites de um anel, a custódia operacional é transferida automaticamente:
                </p>
                {handoffs.map((h, i) => (
                  <div
                    key={h.handoff_id || i}
                    className="p-3 rounded-lg bg-[#111c2e] border border-[#1e2f4a] hover:border-sky-500/50 transition"
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-bold text-slate-100 font-mono">{h.target_id}</span>
                      <span className="text-[10px] text-slate-400">{new Date(h.timestamp).toLocaleTimeString()}</span>
                    </div>

                    {/* Transition Badges */}
                    <div className="flex items-center space-x-2 my-2 text-[11px] font-bold">
                      <span className="px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-500/40">
                        {h.from_agency}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                      <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-500/40">
                        {h.to_agency}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed bg-[#070b12] p-2.5 rounded border border-[#1a2940]">
                      {h.reason}
                    </p>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 2: ALVOS E RADAR (TABELA CLARA E DETALHADA)        */}
        {/* ======================================================== */}
        {activeTab === "targets" && (
          <div className="flex-1 p-6 overflow-y-auto bg-[#070b12]">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
                  <span>🎯</span>
                  <span>Alvos Ativos nos 3 Anéis de Segurança</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Lista consolidada de alvos detectados pelos 5 subsistemas de inteligência em tempo real.
                </p>
              </div>

              {/* Search */}
              <div className="relative w-72">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por ID, Porto, Agência..."
                  value={searchTarget}
                  onChange={(e) => setSearchTarget(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#0b1320] border border-[#1e2f4a] text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            {/* Table */}
            <div className="bg-[#0b1320] rounded-xl border border-[#1e2f4a] overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#111c2e] text-slate-400 font-mono text-[11px] border-b border-[#1e2f4a]">
                  <tr>
                    <th className="p-3">IDENTIFICADOR</th>
                    <th className="p-3">ANEL DE SEGURANÇA</th>
                    <th className="p-3">AGÊNCIA LÍDER</th>
                    <th className="p-3">CLASSIFICAÇÃO DE AMEAÇA</th>
                    <th className="p-3">LOCALIZAÇÃO (LAT, LON)</th>
                    <th className="p-3">RISCO (DL SCORE)</th>
                    <th className="p-3 text-right">AÇÕES</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e2f4a]/60">
                  {filteredThreats.map((t) => (
                    <tr key={t.event_id} className="hover:bg-[#111c2e]/50 transition">
                      <td className="p-3 font-bold font-mono text-sky-400">{t.target_id}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            t.ring === "RING_1_MARITIME"
                              ? "bg-sky-950 text-sky-400 border border-sky-500/40"
                              : t.ring === "RING_2_FEDERAL"
                              ? "bg-amber-950 text-amber-400 border border-amber-500/40"
                              : "bg-red-950 text-red-400 border border-red-500/40"
                          }`}
                        >
                          {t.ring.replace("RING_1_MARITIME", "Anel 1 (Marítimo)").replace("RING_2_FEDERAL", "Anel 2 (Fronteira)").replace("RING_3_INTERSTATE", "Anel 3 (Rodovias)")}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-slate-200">{t.lead_agency}</td>
                      <td className="p-3 text-slate-300">{t.threat_type}</td>
                      <td className="p-3 font-mono text-slate-400">
                        {t.latitude.toFixed(4)}°, {t.longitude.toFixed(4)}°
                      </td>
                      <td className="p-3">
                        <div className="flex items-center space-x-2">
                          <div className="w-16 h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-amber-500 to-red-500"
                              style={{ width: `${t.severity * 100}%` }}
                            />
                          </div>
                          <span className="font-mono font-bold text-red-400">{(t.severity * 100).toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => {
                            setSelectedTarget(t);
                            setActiveTab("map");
                          }}
                          className="px-2.5 py-1 rounded bg-sky-500/20 text-sky-400 hover:bg-sky-500 hover:text-slate-950 font-bold transition text-[11px]"
                        >
                          Ver no Mapa
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 3: TRANSIÇÕES INTER-AGÊNCIAS (HISTÓRICO COMPLETO)  */}
        {/* ======================================================== */}
        {activeTab === "handoffs" && (
          <div className="flex-1 p-6 overflow-y-auto bg-[#070b12]">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
                <span>🔄</span>
                <span>Linha do Tempo de Transições de Jurisdição (Handoffs)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Garantia de Não-Duplicidade e Idempotência: como as agências (USCG, CBP, DEA, FBI) transferem alvos quando cruzam fronteiras.
              </p>
            </div>

            <div className="space-y-4 max-w-4xl">
              {handoffs.map((h, i) => (
                <div key={h.handoff_id || i} className="p-4 rounded-xl bg-[#0b1320] border border-[#1e2f4a] flex space-x-4">
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 font-bold text-sm">
                      #{i + 1}
                    </div>
                    <div className="w-0.5 h-full bg-[#1e2f4a] mt-2" />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-100 font-mono text-sm">{h.target_id}</span>
                      <span className="text-xs text-slate-400 font-mono">{new Date(h.timestamp).toLocaleString()}</span>
                    </div>

                    <div className="flex items-center space-x-3 my-3">
                      <div className="px-3 py-1.5 rounded-lg bg-sky-950 border border-sky-500/40 text-sky-400 text-xs font-bold">
                        {h.from_agency} ({h.from_ring.replace("RING_1_MARITIME", "Anel 1 Marítimo").replace("RING_2_FEDERAL", "Anel 2 Federal")})
                      </div>
                      <ArrowRight className="h-4 w-4 text-amber-400" />
                      <div className="px-3 py-1.5 rounded-lg bg-amber-950 border border-amber-500/40 text-amber-400 text-xs font-bold">
                        {h.to_agency} ({h.to_ring.replace("RING_2_FEDERAL", "Anel 2 Federal").replace("RING_3_INTERSTATE", "Anel 3 Interestadual")})
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 bg-[#070b12] p-3 rounded-lg border border-[#1e2f4a]">
                      <b>Motivo Tático:</b> {h.reason}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 4: COPILOTO TÁTICO IA (ASSISTENTE INTERATIVO)      */}
        {/* ======================================================== */}
        {activeTab === "copilot" && (
          <div className="flex-1 flex flex-col h-full bg-[#070b12] p-6 overflow-hidden">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
                <Bot className="h-5 w-5 text-purple-400" />
                <span>Copiloto Tático C4ISR (Multi-Agent RAG & Análise Espacial)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Converse diretamente com o agente de inteligência em linguagem natural (português ou inglês).
              </p>
            </div>

            {/* Quick Prompt Suggestions */}
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                onClick={() => handleSendCopilot("Qual a situação atual no Anel 1 Marítimo?")}
                className="px-3 py-1.5 rounded-lg bg-[#0b1320] border border-sky-500/30 hover:border-sky-500 text-sky-400 text-xs font-medium transition"
              >
                🌊 Situação no Anel 1 Marítimo
              </button>
              <button
                onClick={() => handleSendCopilot("Quais os alertas de narcóticos do CBP e DEA no Porto de Laredo?")}
                className="px-3 py-1.5 rounded-lg bg-[#0b1320] border border-amber-500/30 hover:border-amber-500 text-amber-400 text-xs font-medium transition"
              >
                🚨 Narcóticos e Drogas em Laredo (I-35)
              </button>
              <button
                onClick={() => handleSendCopilot("Onde foi avistado o fugitivo da lista do FBI?")}
                className="px-3 py-1.5 rounded-lg bg-[#0b1320] border border-red-500/30 hover:border-red-500 text-red-400 text-xs font-medium transition"
              >
                👤 Fugitivo do FBI no Anel 3
              </button>
              <button
                onClick={() => handleSendCopilot("Gere um relatório SITREP de situação geral para o comando")}
                className="px-3 py-1.5 rounded-lg bg-[#0b1320] border border-purple-500/30 hover:border-purple-500 text-purple-400 text-xs font-medium transition"
              >
                📋 Gerar SITREP Consolidado
              </button>
            </div>

            {/* Chat History */}
            <div className="flex-1 bg-[#0b1320] border border-[#1e2f4a] rounded-xl p-4 overflow-y-auto space-y-4">
              {copilotMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-2xl p-4 rounded-xl text-xs leading-relaxed ${
                      msg.sender === "user"
                        ? "bg-sky-600 text-white"
                        : "bg-[#111c2e] text-slate-200 border border-[#1e2f4a]"
                    }`}
                  >
                    <div className="font-bold text-[10px] uppercase text-slate-400 mb-1">
                      {msg.sender === "user" ? "COMANDANTE OPERACIONAL" : "COPILOTO TÁTICO C4ISR"}
                    </div>
                    <div className="whitespace-pre-wrap">{msg.text}</div>
                  </div>
                </div>
              ))}
              {isCopilotLoading && (
                <div className="flex items-center space-x-2 text-xs text-purple-400">
                  <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                  <span>Consultando modelos de inteligência e base PostGIS...</span>
                </div>
              )}
            </div>

            {/* Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendCopilot();
              }}
              className="mt-4 flex space-x-2"
            >
              <input
                type="text"
                placeholder="Digite sua pergunta ou instrução tática..."
                value={copilotInput}
                onChange={(e) => setCopilotInput(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-[#0b1320] border border-[#1e2f4a] text-xs text-slate-100 focus:outline-none focus:border-purple-500"
              />
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center space-x-2 transition"
              >
                <span>Enviar</span>
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 5: DADOS REAIS DO GOVERNO DOS EUA                   */}
        {/* ======================================================== */}
        {activeTab === "datasets" && (
          <div className="flex-1 p-6 overflow-y-auto bg-[#070b12]">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
                <Database className="h-5 w-5 text-emerald-400" />
                <span>Dados Reais do Governo dos EUA (Zero Mocks / Ingestão Oficial)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Amostras reais consumidas das APIs do FBI Wanted, OpenSky Network, MarineCadastre (NOAA/USCG) e CBP Data Portal.
              </p>
            </div>

            {/* Sub-Tabs / Grid of Datasets */}
            <div className="space-y-6">
              {/* 1. FBI Real Fugitives Gallery */}
              <div className="bg-[#0b1320] border border-[#1e2f4a] rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-sm text-slate-100 flex items-center space-x-2">
                    <span>👤</span>
                    <span>FBI Wanted List (100 Fugitivos Reais & Embeddings Faciais no Qdrant)</span>
                  </h3>
                  <span className="text-xs px-2 py-0.5 rounded bg-red-950 text-red-400 font-bold border border-red-500/40">
                    api.fbi.gov/wanted/v1/list
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {fugitives.slice(0, 8).map((f) => (
                    <div key={f.uid} className="bg-[#111c2e] p-3 rounded-lg border border-[#1e2f4a] flex flex-col justify-between">
                      <div>
                        {f.image_url ? (
                          <img
                            src={f.image_url}
                            alt={f.title}
                            className="w-full h-36 object-cover rounded-md mb-2 border border-[#1e2f4a]"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="w-full h-36 bg-slate-800 rounded-md mb-2 flex items-center justify-center text-slate-500 text-xs">
                            Sem Foto
                          </div>
                        )}
                        <h4 className="font-bold text-xs text-slate-100 line-clamp-1">{f.title}</h4>
                        <p className="text-[10px] text-red-400 font-semibold mt-0.5">{f.warning_message}</p>
                        <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{f.description}</p>
                      </div>
                      <div className="mt-2 pt-2 border-t border-[#1e2f4a] flex items-center justify-between text-[10px] text-slate-500 font-mono">
                        <span>QDRANT: 512-DIM</span>
                        <span className="text-sky-400">INDEXADO</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. OpenSky Real Border Flights */}
              <div className="bg-[#0b1320] border border-[#1e2f4a] rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-sm text-slate-100 flex items-center space-x-2">
                    <span>✈️</span>
                    <span>OpenSky Network (Tráfego Aéreo Real na Fronteira Sul dos EUA)</span>
                  </h3>
                  <span className="text-xs px-2 py-0.5 rounded bg-sky-950 text-sky-400 font-bold border border-sky-500/40">
                    opensky-network.org
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-[#111c2e] text-slate-400 text-[11px] border-b border-[#1e2f4a]">
                      <tr>
                        <th className="p-2.5">ICAO24</th>
                        <th className="p-2.5">CALLSIGN</th>
                        <th className="p-2.5">PAÍS DE ORIGEM</th>
                        <th className="p-2.5">LATITUDE / LONGITUDE</th>
                        <th className="p-2.5">ALTITUDE</th>
                        <th className="p-2.5">VELOCIDADE</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e2f4a]/60">
                      {flights.slice(0, 6).map((fl) => (
                        <tr key={fl.icao24} className="hover:bg-[#111c2e]/40">
                          <td className="p-2.5 text-sky-400 font-bold">{fl.icao24}</td>
                          <td className="p-2.5 text-slate-100 font-bold">{fl.callsign}</td>
                          <td className="p-2.5 text-slate-300">{fl.origin_country}</td>
                          <td className="p-2.5 text-slate-400">
                            {fl.latitude?.toFixed(4)}°, {fl.longitude?.toFixed(4)}°
                          </td>
                          <td className="p-2.5 text-slate-300">{fl.altitude_m ? `${Math.round(fl.altitude_m)} m` : "N/D"}</td>
                          <td className="p-2.5 text-slate-300">{fl.velocity_mps ? `${Math.round(fl.velocity_mps * 1.94)} nós` : "N/D"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 3. CBP Real Drug Seizures Summary */}
              {cbpSummary && cbpSummary.summary && (
                <div className="bg-[#0b1320] border border-[#1e2f4a] rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-sm text-slate-100 flex items-center space-x-2">
                      <span>⚖️</span>
                      <span>Estatísticas Oficiais de Apreensão de Drogas do CBP (Libras por Porto)</span>
                    </h3>
                    <span className="text-xs px-2 py-0.5 rounded bg-amber-950 text-amber-400 font-bold border border-amber-500/40">
                      cbp.gov/document/stats
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {Object.entries(cbpSummary.summary.top_aor_seizures_lbs || {}).map(([aor, lbs]: [string, any]) => (
                      <div key={aor} className="p-3 bg-[#111c2e] rounded-lg border border-[#1e2f4a]">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">
                          {aor.replace(" FIELD OFFICE", "")}
                        </span>
                        <span className="text-base font-bold text-amber-400 font-mono mt-1 block">
                          {Math.round(lbs).toLocaleString()} lbs
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 6: GUIA COMPLETO DOS 3 ANÉIS DE SEGURANÇA           */}
        {/* ======================================================== */}
        {activeTab === "guide" && (
          <div className="flex-1 p-8 overflow-y-auto bg-[#070b12] max-w-5xl mx-auto">
            <div className="mb-8">
              <h2 className="text-xl font-bold text-slate-100">Guia de Arquitetura: Os 3 Anéis de Defesa em Profundidade</h2>
              <p className="text-xs text-slate-400 mt-1">
                Entenda o fluxo operacional do Project Frontier e como cada agência dos EUA atua sem sobreposição ou conflito.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Ring 1 */}
              <div className="p-5 rounded-xl bg-[#0b1320] border-2 border-sky-500/50 flex flex-col justify-between">
                <div>
                  <div className="h-10 w-10 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-lg mb-3">
                    1
                  </div>
                  <h3 className="text-sm font-bold text-sky-400">ANEL 1: MARÍTIMO & COSTA AZUL</h3>
                  <p className="text-xs text-slate-400 font-semibold mt-1">USCG (Guarda Costeira) & US Navy</p>
                  <p className="text-xs text-slate-300 mt-3 leading-relaxed">
                    Vigilância oceânica contínua cobrindo a Zona Econômica Exclusiva (200 Milhas Náuticas) e o Mar Territorial (12 MN).
                  </p>
                  <ul className="text-xs text-slate-400 mt-4 space-y-2 list-disc list-inside">
                    <li>Detecção de navios sem AIS (*Dark Ships*).</li>
                    <li>Rendezvous de narcóticos no Golfo do México.</li>
                    <li>Deep Learning: Autoencoder LSTM de Anomalia de Trajetória.</li>
                  </ul>
                </div>
                <div className="mt-4 pt-3 border-t border-[#1e2f4a] text-[11px] text-sky-400 font-bold">
                  ➔ Handoff para Anel 2 quando o alvo atinge a costa
                </div>
              </div>

              {/* Ring 2 */}
              <div className="p-5 rounded-xl bg-[#0b1320] border-2 border-amber-500/50 flex flex-col justify-between">
                <div>
                  <div className="h-10 w-10 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-lg mb-3">
                    2
                  </div>
                  <h3 className="text-sm font-bold text-amber-400">ANEL 2: FRONTEIRA FEDERAL & AÉREA</h3>
                  <p className="text-xs text-slate-400 font-semibold mt-1">CBP, US Army, USAF & FAA</p>
                  <p className="text-xs text-slate-300 mt-3 leading-relaxed">
                    Perímetro estatuário de 100 milhas ao longo da fronteira terrestre EUA-México e Portos de Entrada oficiais (POEs).
                  </p>
                  <ul className="text-xs text-slate-400 mt-4 space-y-2 list-disc list-inside">
                    <li>Voos clandestinos em baixa altitude (OpenSky ADS-B).</li>
                    <li>Travessia não-autorizada no deserto (Visão por Satélite YOLOv8).</li>
                    <li>Inspeção de fentanil e cocaína nos portos (Laredo, Otay Mesa).</li>
                  </ul>
                </div>
                <div className="mt-4 pt-3 border-t border-[#1e2f4a] text-[11px] text-amber-400 font-bold">
                  ➔ Handoff para Anel 3 quando o alvo acessa rodovias
                </div>
              </div>

              {/* Ring 3 */}
              <div className="p-5 rounded-xl bg-[#0b1320] border-2 border-red-500/50 flex flex-col justify-between">
                <div>
                  <div className="h-10 w-10 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center font-bold text-lg mb-3">
                    3
                  </div>
                  <h3 className="text-sm font-bold text-red-400">ANEL 3: INTERIOR & INTERESTADUAIS</h3>
                  <p className="text-xs text-slate-400 font-semibold mt-1">FBI, DEA & Polícias Estaduais</p>
                  <p className="text-xs text-slate-300 mt-3 leading-relaxed">
                    Corredores rodoviários estratégicos (I-10, I-35, I-95) e malha de segurança interna dos 50 estados.
                  </p>
                  <ul className="text-xs text-slate-400 mt-4 space-y-2 list-disc list-inside">
                    <li>Busca de fugitivos da lista do FBI por reconhecimento facial (Qdrant).</li>
                    <li>Previsão de rotas de cartéis via Grafos Espaço-Temporais (ST-GNN).</li>
                    <li>Interdição interestadual com Polícias Rodoviárias.</li>
                  </ul>
                </div>
                <div className="mt-4 pt-3 border-t border-[#1e2f4a] text-[11px] text-red-400 font-bold">
                  ➔ Cerco e Mandado Judicial Federal
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
