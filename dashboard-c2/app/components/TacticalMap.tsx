"use client";

import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";

export interface ThreatAlert {
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

export type CameraPreset = "americas" | "us" | "south_america" | "border" | "caribbean";
type MapTheme = "hybrid" | "dark" | "political";

interface TacticalMapProps {
  threats: ThreatAlert[];
  selectedTarget: ThreatAlert | null;
  onSelectTarget: (t: ThreatAlert | null) => void;
  ringFilter: string;
  cameraPreset: CameraPreset;
  onPresetChange: (preset: CameraPreset) => void;
}

export default function TacticalMap({
  threats,
  selectedTarget,
  onSelectTarget,
  ringFilter,
  cameraPreset,
}: TacticalMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const baseTilesRef = useRef<L.TileLayer | null>(null);
  const labelsTilesRef = useRef<L.TileLayer | null>(null);

  const southAmericaLayerRef = useRef<L.GeoJSON | null>(null);
  const usStatesLayerRef = useRef<L.GeoJSON | null>(null);
  const cartelsLayerRef = useRef<L.LayerGroup | null>(null);
  const ringsLayerRef = useRef<L.LayerGroup | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  const [mapTheme, setMapTheme] = useState<MapTheme>("hybrid");
  const [showSouthAmerica, setShowSouthAmerica] = useState<boolean>(true);
  const [showUSStates, setShowUSStates] = useState<boolean>(true);
  const [showCartelRoutes, setShowCartelRoutes] = useState<boolean>(true);
  const [showRings, setShowRings] = useState<boolean>(true);

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [14.0, -82.0],
      zoom: 3,
      minZoom: 2,
      maxZoom: 18,
      zoomControl: false,
      attributionControl: false,
    });

    L.control.zoom({ position: "bottomright" }).addTo(map);

    const baseTile = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      { maxZoom: 18 }
    ).addTo(map);

    const labelsTile = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
      { maxZoom: 18, opacity: 0.9 }
    ).addTo(map);

    baseTilesRef.current = baseTile;
    labelsTilesRef.current = labelsTile;

    const cartelsGroup = L.layerGroup().addTo(map);
    const ringsGroup = L.layerGroup().addTo(map);
    const markersGroup = L.layerGroup().addTo(map);

    cartelsLayerRef.current = cartelsGroup;
    ringsLayerRef.current = ringsGroup;
    markersLayerRef.current = markersGroup;
    mapInstanceRef.current = map;

    map.fitBounds([
      [-55.0, -125.0],
      [50.0, -34.0],
    ]);

    // 1. South America Interactive Intelligence Layer
    fetch("/south_america.json")
      .then((res) => res.json())
      .then((data) => {
        if (!mapInstanceRef.current) return;
        const saLayer = L.geoJSON(data, {
          style: (feature) => {
            const iso = feature?.properties?.iso;
            const isOrigin = ["COL", "PER", "BOL"].includes(iso);
            return {
              color: isOrigin ? "#10b981" : "#06b6d4",
              weight: 1.0,
              opacity: 0.45,
              fillColor: "#10b981",
              fillOpacity: 0.0,
            };
          },
          onEachFeature: (feature, layer) => {
            const name = feature.properties?.name || "Country";
            const threatRole = feature.properties?.threat_role || "MONITORING";
            const roleMap: Record<string, string> = {
              ORIGIN_COCAINE: "Primary Narcotics Production & Lab Zone (DEA Surveillance)",
              PRODUCER_TRANSIT: "Atlantic Maritime Hub, Ports & Amazon Basin Corridor",
              TRANSIT_AIR_MARITIME: "Clandestine Airstrips & Caribbean Maritime Departure",
              TRANSIT_PACIFIC: "Eastern Pacific Semi-Submersible Transit Corridor",
            };
            const desc = roleMap[threatRole] || "Hemispheric Strategic Surveillance";

            layer.bindTooltip(
              `<div style="font-family: system-ui, sans-serif; padding: 2px 4px;">
                <div style="font-weight: 700; color: #34d399; font-size: 12px;">${name}</div>
                <div style="color: #cbd5e1; font-size: 10px;">${desc}</div>
              </div>`,
              { sticky: true, className: "tactical-clean-tooltip" }
            );

            layer.on({
              mouseover: (e) => {
                e.target.setStyle({ weight: 2.2, color: "#34d399", opacity: 0.95, fillOpacity: 0.08 });
              },
              mouseout: (e) => {
                saLayer.resetStyle(e.target);
              },
            });
          },
        }).addTo(map);
        southAmericaLayerRef.current = saLayer;
      })
      .catch(() => {});

    // 2. US 50 States Interactive Layer
    fetch("/us_states.json")
      .then((res) => res.json())
      .then((data) => {
        if (!mapInstanceRef.current) return;
        const statesLayer = L.geoJSON(data, {
          style: (feature) => {
            const st = feature?.properties?.STUSPS;
            const isBorder = ["TX", "CA", "AZ", "NM"].includes(st);
            return {
              color: isBorder ? "#f59e0b" : "#38bdf8",
              weight: isBorder ? 1.2 : 0.7,
              opacity: isBorder ? 0.65 : 0.3,
              fillColor: "#38bdf8",
              fillOpacity: 0.0,
            };
          },
          onEachFeature: (feature, layer) => {
            const name = feature.properties?.NAME || "State";
            const code = feature.properties?.STUSPS || "";
            const isBorder = ["TX", "CA", "AZ", "NM"].includes(code);
            layer.bindTooltip(
              `<div style="font-family: system-ui, sans-serif; padding: 2px 4px;">
                <span style="font-weight: 700; color: ${isBorder ? "#fbbf24" : "#38bdf8"}; font-size: 12px;">
                  ${name} (${code})
                </span>
                <div style="color: #94a3b8; font-size: 10px;">
                  ${isBorder ? "Ring 2 (Federal Border) & Ring 3" : "Interstate Jurisdiction (Ring 3 - FBI/DEA)"}
                </div>
              </div>`,
              { sticky: true, className: "tactical-clean-tooltip" }
            );

            layer.on({
              mouseover: (e) => {
                e.target.setStyle({ weight: 2.0, color: "#38bdf8", opacity: 0.9, fillOpacity: 0.08 });
              },
              mouseout: (e) => {
                statesLayer.resetStyle(e.target);
              },
            });
          },
        }).addTo(map);
        usStatesLayerRef.current = statesLayer;
      })
      .catch(() => {});

    // 3. Transnational Maritime & Air Supply Routes
    const routes: Array<{ coords: L.LatLngExpression[]; color: string; label: string }> = [
      {
        coords: [
          [3.88, -77.03],
          [-0.95, -90.96],
          [13.5, -92.0],
          [23.2, -106.4],
          [32.5, -117.1],
        ],
        color: "#10b981",
        label: "<b>Eastern Pacific Maritime Route (JIATF-South)</b><br/>Colombia ➔ Galapagos ➔ Sinaloa ➔ California",
      },
      {
        coords: [
          [11.0, -74.8],
          [18.4, -69.9],
          [25.7, -80.2],
        ],
        color: "#06b6d4",
        label: "<b>Caribbean Maritime Corridor (USCG / DEA)</b><br/>Colombia/Venezuela ➔ Dominican Republic ➔ Florida (Ring 1)",
      },
      {
        coords: [
          [-23.95, -46.3],
          [-5.0, -34.5],
          [10.5, -61.5],
          [29.7, -95.0],
        ],
        color: "#38bdf8",
        label: "<b>Atlantic Container Route</b><br/>Port of Santos (Brazil) ➔ Caribbean ➔ Gulf of Mexico (Houston)",
      },
    ];

    routes.forEach((r) => {
      L.polyline(r.coords, {
        color: r.color,
        weight: 1.8,
        dashArray: "5, 7",
        opacity: 0.75,
      })
        .bindTooltip(r.label, { sticky: true, className: "tactical-clean-tooltip" })
        .addTo(cartelsGroup);
    });

    // 4. The 3 C4ISR Defense Rings
    const southernBorderLine: L.LatLngExpression[] = [
      [32.53, -117.12],
      [32.72, -114.72],
      [31.33, -110.94],
      [31.76, -106.48],
      [29.56, -104.41],
      [27.50, -99.50],
      [25.90, -97.49],
    ];
    L.polyline(southernBorderLine, {
      color: "#f59e0b",
      weight: 2.5,
      opacity: 0.9,
    })
      .bindTooltip("<b>RING 2: US-Mexico Federal Border (CBP / US Army / USAF)</b>", {
        sticky: true,
        className: "tactical-clean-tooltip",
      })
      .addTo(ringsGroup);

    const maritimePerimeter: L.LatLngExpression[] = [
      [25.90, -97.49],
      [23.50, -90.00],
      [24.00, -81.50],
      [27.00, -79.50],
    ];
    L.polyline(maritimePerimeter, {
      color: "#38bdf8",
      weight: 2.0,
      dashArray: "4, 6",
      opacity: 0.85,
    })
      .bindTooltip("<b>RING 1: Maritime EEZ Perimeter (USCG / US Navy)</b>", {
        sticky: true,
        className: "tactical-clean-tooltip",
      })
      .addTo(ringsGroup);

    const i10Line: L.LatLngExpression[] = [
      [34.0, -118.2],
      [32.2, -110.9],
      [31.7, -106.4],
      [29.4, -98.5],
      [29.7, -95.3],
      [30.3, -81.6],
    ];
    L.polyline(i10Line, {
      color: "#ef4444",
      weight: 1.8,
      opacity: 0.75,
    })
      .bindTooltip("<b>RING 3: Interstate I-10 Corridor (DEA / FBI)</b>", {
        sticky: true,
        className: "tactical-clean-tooltip",
      })
      .addTo(ringsGroup);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (cameraPreset === "americas") {
      map.flyToBounds(
        [
          [-55.0, -125.0],
          [50.0, -34.0],
        ],
        { duration: 1.0 }
      );
    } else if (cameraPreset === "south_america") {
      map.flyToBounds(
        [
          [-55.0, -82.0],
          [13.0, -34.0],
        ],
        { duration: 1.0 }
      );
    } else if (cameraPreset === "us") {
      map.flyToBounds(
        [
          [24.5, -125.0],
          [49.5, -66.5],
        ],
        { duration: 1.0 }
      );
    } else if (cameraPreset === "border") {
      map.flyTo([30.5, -105.5], 6, { duration: 1.0 });
    } else if (cameraPreset === "caribbean") {
      map.flyTo([18.5, -76.0], 5, { duration: 1.0 });
    }
  }, [cameraPreset]);

  useEffect(() => {
    if (!mapInstanceRef.current || !selectedTarget) return;
    mapInstanceRef.current.flyTo([selectedTarget.latitude, selectedTarget.longitude], 6, {
      duration: 1.1,
    });
  }, [selectedTarget]);

  useEffect(() => {
    if (!mapInstanceRef.current || !baseTilesRef.current) return;
    const map = mapInstanceRef.current;
    map.removeLayer(baseTilesRef.current);
    if (labelsTilesRef.current && map.hasLayer(labelsTilesRef.current)) {
      map.removeLayer(labelsTilesRef.current);
    }

    if (mapTheme === "hybrid") {
      const sat = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 18 }
      ).addTo(map);
      sat.bringToBack();
      const lbl = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 18, opacity: 0.9 }
      ).addTo(map);
      baseTilesRef.current = sat;
      labelsTilesRef.current = lbl;
    } else if (mapTheme === "dark") {
      const dark = L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        { subdomains: "abcd", maxZoom: 19 }
      ).addTo(map);
      dark.bringToBack();
      baseTilesRef.current = dark;
    } else {
      const pol = L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
        { subdomains: "abcd", maxZoom: 19 }
      ).addTo(map);
      pol.bringToBack();
      baseTilesRef.current = pol;
    }
  }, [mapTheme]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = southAmericaLayerRef.current;
    if (!map || !layer) return;
    showSouthAmerica ? map.addLayer(layer) : map.removeLayer(layer);
  }, [showSouthAmerica]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = usStatesLayerRef.current;
    if (!map || !layer) return;
    showUSStates ? map.addLayer(layer) : map.removeLayer(layer);
  }, [showUSStates]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = cartelsLayerRef.current;
    if (!map || !layer) return;
    showCartelRoutes ? map.addLayer(layer) : map.removeLayer(layer);
  }, [showCartelRoutes]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = ringsLayerRef.current;
    if (!map || !layer) return;
    showRings ? map.addLayer(layer) : map.removeLayer(layer);
  }, [showRings]);

  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;
    const markersGroup = markersLayerRef.current;
    markersGroup.clearLayers();

    const filtered = threats.filter((t) => {
      if (ringFilter !== "ALL" && t.ring !== ringFilter) return false;
      return true;
    });

    filtered.forEach((t) => {
      const isSelected = selectedTarget?.event_id === t.event_id;
      let color = "#38bdf8";
      if (t.ring === "RING_2_FEDERAL") color = "#f59e0b";
      if (t.ring === "RING_3_INTERSTATE") color = "#ef4444";

      const iconHtml = `
        <div class="relative flex items-center justify-center cursor-pointer group">
          ${
            isSelected
              ? `<div class="absolute w-9 h-9 rounded-full border-2 border-white animate-ping opacity-60"></div>`
              : `<div style="background:${color};" class="absolute w-6 h-6 rounded-full opacity-25"></div>`
          }
          <div style="background:#090d16; border: 2px solid ${
            isSelected ? "#ffffff" : color
          }; box-shadow: 0 0 12px ${color}80;" class="w-6 h-6 rounded-full flex items-center justify-center text-[11px] transition-transform ${
        isSelected ? "scale-125" : "group-hover:scale-110"
      }">
            <span style="color:${color}; font-size:10px; font-weight:900;">●</span>
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: "custom-tactical-pin",
        html: iconHtml,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([t.latitude, t.longitude], { icon: customIcon });
      marker.bindTooltip(
        `<div style="font-family: system-ui, sans-serif; padding: 2px 4px;">
          <b style="color: ${color}; font-family: monospace;">${t.target_id}</b>
          <span style="color: #94a3b8; font-size: 10px; margin-left: 6px;">${t.lead_agency}</span>
          <div style="color: #e2e8f0; font-size: 10px;">${t.threat_type}</div>
        </div>`,
        { direction: "top", offset: [0, -10], className: "tactical-clean-tooltip" }
      );

      marker.on("click", () => onSelectTarget(t));
      marker.addTo(markersGroup);
    });
  }, [threats, selectedTarget, ringFilter, onSelectTarget]);

  return (
    <div className="relative w-full h-full bg-[#060a12] overflow-hidden select-none">
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* FLOATING BOTTOM CONTROL DOCK */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] flex flex-wrap items-center gap-2 bg-[#090e17]/90 backdrop-blur-md border border-slate-800 px-3 py-1.5 rounded-full shadow-2xl pointer-events-auto">
        <div className="flex items-center space-x-1 pr-2 border-r border-slate-800">
          <button
            onClick={() => setMapTheme("hybrid")}
            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition ${
              mapTheme === "hybrid"
                ? "bg-sky-500 text-slate-950 font-bold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            🛰️ Hybrid Satellite
          </button>
          <button
            onClick={() => setMapTheme("dark")}
            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition ${
              mapTheme === "dark"
                ? "bg-sky-500 text-slate-950 font-bold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            🌑 Dark Radar
          </button>
          <button
            onClick={() => setMapTheme("political")}
            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition ${
              mapTheme === "political"
                ? "bg-sky-500 text-slate-950 font-bold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            🗺️ Political Map
          </button>
        </div>

        <div className="flex items-center space-x-1.5 text-[11px]">
          <button
            onClick={() => setShowSouthAmerica(!showSouthAmerica)}
            className={`px-2.5 py-1 rounded-full border transition ${
              showSouthAmerica
                ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-300"
                : "border-transparent text-slate-500 hover:text-slate-300"
            }`}
          >
            🇧🇷 South America
          </button>
          <button
            onClick={() => setShowUSStates(!showUSStates)}
            className={`px-2.5 py-1 rounded-full border transition ${
              showUSStates
                ? "bg-sky-500/15 border-sky-500/50 text-sky-300"
                : "border-transparent text-slate-500 hover:text-slate-300"
            }`}
          >
            🇺🇸 US 50 States
          </button>
          <button
            onClick={() => setShowCartelRoutes(!showCartelRoutes)}
            className={`px-2.5 py-1 rounded-full border transition ${
              showCartelRoutes
                ? "bg-teal-500/15 border-teal-500/50 text-teal-300"
                : "border-transparent text-slate-500 hover:text-slate-300"
            }`}
          >
            🚢 Transnational Routes
          </button>
          <button
            onClick={() => setShowRings(!showRings)}
            className={`px-2.5 py-1 rounded-full border transition ${
              showRings
                ? "bg-amber-500/15 border-amber-500/50 text-amber-300"
                : "border-transparent text-slate-500 hover:text-slate-300"
            }`}
          >
            🛡️ 3 C4ISR Rings
          </button>
        </div>
      </div>
    </div>
  );
}
