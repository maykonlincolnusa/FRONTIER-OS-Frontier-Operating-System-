"use client";

import React, { useEffect, useState, useMemo } from "react";
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
} from "lucide-react";

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
    reason: "Dark vessel beached at South Padre Island outside POE; transferred to CBP Border Patrol.",
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
    reason: "Target bypassed federal checkpoint entering I-10 corridor; tactical handoff to FBI / State Troopers.",
  },
];

export default function C4ISRDashboard() {
  const [threats, setThreats] = useState<ThreatAlert[]>(DEFAULT_THREATS);
  const [handoffs, setHandoffs] = useState<JurisdictionHandoff[]>(DEFAULT_HANDOFFS);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [agencyFilter, setAgencyFilter] = useState<string>("ALL");
  const [ringFilter, setRingFilter] = useState<string>("ALL");
  const [selectedTarget, setSelectedTarget] = useState<ThreatAlert | null>(DEFAULT_THREATS[0]);

  // Connect to C2 Gateway WebSocket
  useEffect(() => {
    let ws: WebSocket | null = null;
    let timer: NodeJS.Timeout | null = null;

    const connectWebSocket = () => {
      try {
        const wsUrl = process.env.NEXT_PUBLIC_C2_WS_URL || "ws://localhost:8000/ws/c2-stream";
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          setIsConnected(true);
        };

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

        ws.onerror = () => {
          setIsConnected(false);
        };
      } catch (err) {
        setIsConnected(false);
        timer = setTimeout(connectWebSocket, 4000);
      }
    };

    connectWebSocket();

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
      return matchAgency && matchRing;
    });
  }, [threats, agencyFilter, ringFilter]);

  // Projection conversion: (lon, lat) -> (x%, y%) on tactical US Map canvas
  // Bounds: Lon [-126 to -66], Lat [23 to 50]
  const projectCoords = (lon: number, lat: number) => {
    const x = ((lon - (-126.0)) / ((-66.0) - (-126.0))) * 100;
    const y = (1.0 - (lat - 23.0) / (50.0 - 23.0)) * 100;
    return {
      left: `${Math.max(2, Math.min(96, x))}%`,
      top: `${Math.max(2, Math.min(96, y))}%`,
    };
  };

  const getRingColor = (ring: string) => {
    switch (ring) {
      case "RING_1_MARITIME":
        return "text-sky-400 border-sky-500 bg-sky-950/40";
      case "RING_2_FEDERAL":
        return "text-amber-400 border-amber-500 bg-amber-950/40";
      case "RING_3_INTERSTATE":
        return "text-red-400 border-red-500 bg-red-950/40";
      default:
        return "text-purple-400 border-purple-500 bg-purple-950/40";
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#070b12] text-slate-100 select-none overflow-hidden font-mono">
      {/* 1. TOP HEADER / TACTICAL STATUS BAR */}
      <header className="h-14 border-b border-[#1e2f4a] bg-[#0b1320] px-4 flex items-center justify-between z-20">
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-sm tracking-wider text-slate-100">FRONTIER-OS</span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400 font-semibold border border-sky-500/30">
                C4ISR SOVEREIGN DEFENSE
              </span>
            </div>
            <p className="text-[10px] text-slate-400">Joint Inter-Agency Territorial Security System</p>
          </div>
        </div>

        {/* Agency Readiness Strip */}
        <div className="hidden lg:flex items-center space-x-2 text-[11px]">
          {["USCG", "US_NAVY", "USAF", "US_ARMY", "CBP", "DEA", "FBI"].map((agency) => (
            <span
              key={agency}
              className="px-2 py-0.5 rounded bg-[#111c2e] border border-[#1e2f4a] text-slate-300 font-medium hover:border-sky-500 cursor-pointer"
            >
              {agency}
            </span>
          ))}
        </div>

        {/* WebSocket Stream & Threat Status */}
        <div className="flex items-center space-x-4 text-xs">
          <div className="flex items-center space-x-2 px-2.5 py-1 rounded bg-[#111c2e] border border-[#1e2f4a]">
            <Radio className={`h-3.5 w-3.5 ${isConnected ? "text-emerald-400 animate-pulse" : "text-amber-500"}`} />
            <span className={isConnected ? "text-emerald-400 font-medium" : "text-amber-500"}>
              {isConnected ? "C2 STREAM ACTIVE" : "SIMULATION MODE"}
            </span>
          </div>
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-red-950/40 border border-red-500/40 text-red-400 font-semibold">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>DEFCON 3 / ELEVATED</span>
          </div>
        </div>
      </header>

      {/* 2. MAIN WORKSPACE (TACTICAL MAP + LATERAL LIVE FEED) */}
      <div className="flex-1 flex overflow-hidden">
        {/* CENTER: TACTICAL 2D/3D MAP VIEWPORT */}
        <main className="flex-1 relative bg-[#070b12] flex flex-col overflow-hidden">
          {/* Map Top Control Bar */}
          <div className="absolute top-3 left-4 z-10 flex items-center space-x-2 bg-[#0b1320]/90 backdrop-blur border border-[#1e2f4a] p-1.5 rounded-lg text-xs">
            <div className="flex items-center space-x-1 px-2 py-1 text-slate-400">
              <Filter className="h-3.5 w-3.5" />
              <span>AGENCY:</span>
            </div>
            {["ALL", "USCG", "USAF", "CBP", "DEA", "FBI"].map((ag) => (
              <button
                key={ag}
                onClick={() => setAgencyFilter(ag)}
                className={`px-2 py-1 rounded text-[11px] transition ${
                  agencyFilter === ag
                    ? "bg-sky-500 text-slate-950 font-bold"
                    : "text-slate-300 hover:bg-[#1e2f4a]"
                }`}
              >
                {ag}
              </button>
            ))}
          </div>

          <div className="absolute top-3 right-4 z-10 flex items-center space-x-2 bg-[#0b1320]/90 backdrop-blur border border-[#1e2f4a] p-1.5 rounded-lg text-xs">
            <div className="flex items-center space-x-1 px-2 py-1 text-slate-400">
              <Layers className="h-3.5 w-3.5" />
              <span>RING:</span>
            </div>
            {["ALL", "RING_1_MARITIME", "RING_2_FEDERAL", "RING_3_INTERSTATE"].map((r) => (
              <button
                key={r}
                onClick={() => setRingFilter(r)}
                className={`px-2 py-1 rounded text-[11px] transition ${
                  ringFilter === r
                    ? "bg-amber-500 text-slate-950 font-bold"
                    : "text-slate-300 hover:bg-[#1e2f4a]"
                }`}
              >
                {r.replace("RING_", "R").replace("_", " ")}
              </button>
            ))}
          </div>

          {/* Tactical Spatial Canvas */}
          <div className="flex-1 relative w-full h-full bg-[#060a10] overflow-hidden flex items-center justify-center">
            {/* Grid Coordinates Grid lines */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30" />

            {/* Schematic Territorial Polygons Overlay */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40">
              {/* Ring 1 - Outer Maritime Buffer */}
              <path
                d="M 50,650 Q 200,800 650,850 T 1150,700 T 1350,300"
                fill="none"
                stroke="#0ea5e9"
                strokeWidth="2.5"
                strokeDasharray="6 4"
              />
              {/* Ring 2 - Southern Border Statutory Buffer */}
              <path
                d="M 120,550 L 260,540 L 420,560 L 580,630 L 680,720"
                fill="none"
                stroke="#f59e0b"
                strokeWidth="3.5"
              />
              {/* Ring 3 - Interstate Corridors (I-10 / I-35 / I-95) */}
              <line x1="120" y1="520" x2="1100" y2="600" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="3 3" />
              <line x1="580" y1="720" x2="620" y2="250" stroke="#a855f7" strokeWidth="1.5" strokeDasharray="3 3" />
            </svg>

            {/* Target Entities Projected on Tactical Map */}
            {filteredThreats.map((t) => {
              const pos = projectCoords(t.longitude, t.latitude);
              const isSelected = selectedTarget?.event_id === t.event_id;

              return (
                <div
                  key={t.event_id}
                  onClick={() => setSelectedTarget(t)}
                  style={{ left: pos.left, top: pos.top }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group z-20"
                >
                  {/* Radar pulse beacon */}
                  <div className="relative flex items-center justify-center">
                    <span
                      className={`absolute h-8 w-8 rounded-full opacity-60 radar-pulse ${
                        t.severity > 0.85 ? "bg-red-500" : "bg-amber-400"
                      }`}
                    />
                    <div
                      className={`h-7 w-7 rounded-lg flex items-center justify-center border transition-transform duration-200 group-hover:scale-125 ${
                        isSelected
                          ? "ring-2 ring-white scale-110 shadow-lg shadow-sky-500/50"
                          : ""
                      } ${
                        t.ring === "RING_1_MARITIME"
                          ? "bg-sky-950 border-sky-400 text-sky-400"
                          : t.ring === "RING_2_FEDERAL"
                          ? "bg-amber-950 border-amber-400 text-amber-400"
                          : "bg-red-950 border-red-400 text-red-400"
                      }`}
                    >
                      {t.subsystem.includes("maritime") ? (
                        <Ship className="h-3.5 w-3.5" />
                      ) : t.subsystem.includes("airspace") ? (
                        <Plane className="h-3.5 w-3.5" />
                      ) : t.subsystem.includes("narcotics") ? (
                        <AlertTriangle className="h-3.5 w-3.5 text-purple-400" />
                      ) : (
                        <Car className="h-3.5 w-3.5" />
                      )}
                    </div>
                  </div>

                  {/* Target Tooltip */}
                  <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-[#0b1320] border border-[#1e2f4a] px-2 py-1 rounded text-[10px] whitespace-nowrap shadow-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="font-bold text-slate-100">{t.target_id}</span>
                    <span className="ml-1.5 text-red-400 font-semibold">{(t.severity * 100).toFixed(0)}%</span>
                  </div>
                </div>
              );
            })}

            {/* Bottom HUD Legend */}
            <div className="absolute bottom-3 left-4 flex items-center space-x-3 bg-[#0b1320]/90 backdrop-blur border border-[#1e2f4a] px-3 py-1.5 rounded-lg text-[11px]">
              <div className="flex items-center space-x-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-sky-400" />
                <span className="text-slate-300">Ring 1: Maritime EEZ</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <span className="text-slate-300">Ring 2: Federal Land/Air</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                <span className="text-slate-300">Ring 3: Interstate Corridors</span>
              </div>
            </div>
          </div>

          {/* Target Inspector Card (Bottom Floating) */}
          {selectedTarget && (
            <div className="h-28 border-t border-[#1e2f4a] bg-[#0b1320] px-4 py-2 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="h-14 w-14 rounded-lg bg-[#111c2e] border border-[#1e2f4a] flex items-center justify-center text-sky-400">
                  <Crosshair className="h-7 w-7" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-bold text-slate-100">{selectedTarget.target_id}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${getRingColor(selectedTarget.ring)}`}>
                      {selectedTarget.ring}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">
                      LEAD: {selectedTarget.lead_agency}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Classification: <span className="text-amber-400 font-semibold">{selectedTarget.threat_type}</span> | Coords:{" "}
                    {selectedTarget.latitude.toFixed(4)}°N, {selectedTarget.longitude.toFixed(4)}°W
                  </p>
                </div>
              </div>

              {/* Severity Gauge */}
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">DL Risk Score</span>
                  <span className="text-2xl font-bold text-red-400">{(selectedTarget.severity * 100).toFixed(1)}%</span>
                </div>
                <div className="h-10 w-28 bg-[#111c2e] rounded border border-[#1e2f4a] p-1 flex items-center">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-red-500 rounded"
                    style={{ width: `${selectedTarget.severity * 100}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </main>

        {/* RIGHT LATERAL PANEL: LIVE JURISDICTION HANDOFF FEED */}
        <aside className="w-96 border-l border-[#1e2f4a] bg-[#0b1320] flex flex-col z-20">
          <div className="p-3 border-b border-[#1e2f4a] flex items-center justify-between bg-[#0e1726]">
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 text-sky-400 animate-pulse" />
              <span className="text-xs font-bold tracking-wider text-slate-100 uppercase">
                Jurisdiction Handoff Feed
              </span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400 font-bold">
              POSTGIS EVENT BUS
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {handoffs.map((h, i) => (
              <div
                key={h.handoff_id || i}
                className="p-3 rounded-lg bg-[#111c2e] border border-[#1e2f4a] hover:border-sky-500/50 transition"
              >
                <div className="flex items-center justify-between text-[11px] mb-2">
                  <span className="font-bold text-slate-100">{h.target_id}</span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(h.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                {/* Transition Flow Badges */}
                <div className="flex items-center space-x-2 my-2 text-[10px] font-bold">
                  <span className="px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-500/40">
                    {h.from_agency} ({h.from_ring.replace("RING_", "R")})
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                  <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-500/40">
                    {h.to_agency} ({h.to_ring.replace("RING_", "R")})
                  </span>
                </div>

                <p className="text-[11px] text-slate-300 leading-relaxed bg-[#070b12] p-2 rounded border border-[#1a2940]">
                  {h.reason}
                </p>
              </div>
            ))}
          </div>

          {/* Tactical Hotspots Footer */}
          <div className="p-3 border-t border-[#1e2f4a] bg-[#070b12] text-[11px] text-slate-400 flex items-center justify-between">
            <span>Active Defense Nodes: 13</span>
            <span className="text-emerald-400 font-semibold">● 100% SENSOR COVERAGE</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
