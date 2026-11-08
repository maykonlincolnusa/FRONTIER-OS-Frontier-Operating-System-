"use client";

import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";

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

interface TacticalMapProps {
  threats: ThreatAlert[];
  selectedTarget: ThreatAlert | null;
  onSelectTarget: (t: ThreatAlert) => void;
  ringFilter: string;
}

type MapTheme = "satellite" | "dark" | "streets";

export default function TacticalMap({
  threats,
  selectedTarget,
  onSelectTarget,
  ringFilter,
}: TacticalMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const baseTilesRef = useRef<L.TileLayer | null>(null);

  // Layer references for clean toggle management
  const southAmericaLayerRef = useRef<L.GeoJSON | null>(null);
  const transitLayerRef = useRef<L.GeoJSON | null>(null);
  const usStatesLayerRef = useRef<L.GeoJSON | null>(null);
  const cartelsLayerRef = useRef<L.LayerGroup | null>(null);
  const ringsLayerRef = useRef<L.LayerGroup | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  // States for theme and visibility toggles
  const [mapTheme, setMapTheme] = useState<MapTheme>("satellite"); // Default to crystal clear satellite
  const [showSouthAmerica, setShowSouthAmerica] = useState<boolean>(true);
  const [showUSStates, setShowUSStates] = useState<boolean>(true);
  const [showTransit, setShowTransit] = useState<boolean>(true);
  const [showCartelRoutes, setShowCartelRoutes] = useState<boolean>(true);
  const [showRings, setShowRings] = useState<boolean>(true);
  const [showTargets, setShowTargets] = useState<boolean>(true);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Center on the Americas
    const map = L.map(mapContainerRef.current, {
      center: [12.0, -80.0],
      zoom: 3,
      minZoom: 2,
      maxZoom: 18,
      zoomControl: false,
      attributionControl: false,
    });

    // Custom Zoom control at bottom-right
    L.control.zoom({ position: "bottomright" }).addTo(map);

    // Initial Base Tiles: ESRI World Imagery (High-Definition Photorealistic Satellite)
    const baseTile = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        maxZoom: 18,
      }
    ).addTo(map);

    baseTilesRef.current = baseTile;

    // Create groups
    const cartelsGroup = L.layerGroup().addTo(map);
    const ringsGroup = L.layerGroup().addTo(map);
    const markersGroup = L.layerGroup().addTo(map);

    cartelsLayerRef.current = cartelsGroup;
    ringsLayerRef.current = ringsGroup;
    markersLayerRef.current = markersGroup;
    mapInstanceRef.current = map;

    // Initial View: Full Americas (North America + South America)
    map.fitBounds([
      [-56.0, -125.0], // Tierra del Fuego / Chile
      [52.0, -45.0],   // Northern US / Canada border
    ]);

    // ==========================================
    // 1. CARREGAR AMÉRICA DO SUL (Zero Mud, Clean Neon Outlines)
    // ==========================================
    fetch("/south_america.json")
      .then((res) => res.json())
      .then((data) => {
        if (!mapInstanceRef.current) return;
        const saLayer = L.geoJSON(data, {
          style: (feature) => {
            const iso = feature?.properties?.iso;
            const isOrigin = ["COL", "PER", "BOL"].includes(iso);
            const isBrazil = iso === "BRA";

            return {
              color: isOrigin ? "#10b981" : isBrazil ? "#06b6d4" : "#34d399",
              weight: isBrazil ? 1.6 : 1.3,
              opacity: 0.9,
              fillColor: "#10b981",
              fillOpacity: 0.02, // Ultra-clean, zero mud! Satellite shines through!
            };
          },
          onEachFeature: (feature, layer) => {
            const namePt = feature.properties?.name_pt || feature.properties?.name || "País";
            const threatRole = feature.properties?.threat_role || "Vigilância Hemisférica";

            let roleDescription = "Monitoramento Regional";
            if (threatRole === "ORIGIN_COCAINE") {
              roleDescription = "Zona Crítica de Cultivo e Laboratórios (Colômbia/Peru/Bolívia)";
            } else if (threatRole === "PRODUCER_TRANSIT") {
              roleDescription = "Hub de Trânsito Atlântico, Portos e Fronteira Amazônica";
            } else if (threatRole === "TRANSIT_AIR_MARITIME") {
              roleDescription = "Pista Clandestina & Corredor Aéreo/Marítimo Caribe";
            } else if (threatRole === "TRANSIT_PACIFIC") {
              roleDescription = "Corredor Marítimo Pacífico (Galápagos & Submersíveis)";
            }

            layer.bindTooltip(
              `<div style="font-family: system-ui, sans-serif; padding: 4px; font-size: 11px; color: #fff;">
                <div style="font-weight: 800; color: #34d399; font-size: 13px;">🇧🇷 ${namePt}</div>
                <div style="color: #94a3b8; font-size: 10px; margin-top: 2px;"><b>Papel Tático:</b> ${roleDescription}</div>
              </div>`,
              { sticky: true, className: "tactical-clean-tooltip" }
            );

            layer.on({
              mouseover: (e) => {
                const l = e.target;
                l.setStyle({
                  weight: 2.5,
                  color: "#a7f3d0",
                  fillOpacity: 0.12,
                });
                l.bringToFront();
              },
              mouseout: (e) => {
                if (southAmericaLayerRef.current) {
                  southAmericaLayerRef.current.resetStyle(e.target);
                }
              },
            });
          },
        }).addTo(map);

        southAmericaLayerRef.current = saLayer;
      })
      .catch((err) => console.debug("Could not load South America geojson:", err));

    // ==========================================
    // 2. CARREGAR REGIÕES DE TRÂNSITO (México & América Central & Caribe)
    // ==========================================
    fetch("/transit_regions.json")
      .then((res) => res.json())
      .then((data) => {
        if (!mapInstanceRef.current) return;
        const transitGjson = L.geoJSON(data, {
          style: (feature) => {
            const iso = feature?.properties?.iso;
            const isMexico = iso === "MEX";
            return {
              color: isMexico ? "#f97316" : "#fb923c",
              weight: isMexico ? 1.6 : 1.2,
              opacity: 0.85,
              fillColor: "#f97316",
              fillOpacity: 0.02,
            };
          },
          onEachFeature: (feature, layer) => {
            const namePt = feature.properties?.name_pt || feature.properties?.name || "";
            const role = feature.properties?.threat_role || "";
            layer.bindTooltip(
              `<div style="font-family: system-ui, sans-serif; padding: 4px; font-size: 11px; color: #fff;">
                <div style="font-weight: 800; color: #fb923c; font-size: 12px;">${namePt}</div>
                <div style="color: #cbd5e1; font-size: 10px; margin-top: 2px;">Trânsito e Infiltração para Anéis 1 e 2</div>
              </div>`,
              { sticky: true, className: "tactical-clean-tooltip" }
            );

            layer.on({
              mouseover: (e) => {
                const l = e.target;
                l.setStyle({ weight: 2.2, color: "#fed7aa", fillOpacity: 0.12 });
                l.bringToFront();
              },
              mouseout: (e) => {
                if (transitLayerRef.current) {
                  transitLayerRef.current.resetStyle(e.target);
                }
              },
            });
          },
        }).addTo(map);

        transitLayerRef.current = transitGjson;
      })
      .catch((err) => console.debug("Could not load transit geojson:", err));

    // ==========================================
    // 3. CARREGAR OS 50 ESTADOS DOS EUA (Zero Mud, Clean Vector Lines)
    // ==========================================
    fetch("/us_states.json")
      .then((res) => res.json())
      .then((data) => {
        if (!mapInstanceRef.current) return;
        const statesGjson = L.geoJSON(data, {
          style: (feature) => {
            const st = feature?.properties?.STUSPS;
            const isBorderState = ["TX", "CA", "AZ", "NM"].includes(st);
            const isCoastalState = ["FL", "LA", "MS", "AL", "GA", "SC", "NC"].includes(st);

            return {
              color: isBorderState ? "#f59e0b" : isCoastalState ? "#38bdf8" : "#94a3b8",
              weight: isBorderState ? 1.5 : 1.0,
              opacity: 0.75,
              fillColor: "#38bdf8",
              fillOpacity: 0.01, // 100% clean, no dirty brown/blue boxes!
            };
          },
          onEachFeature: (feature, layer) => {
            const name = feature.properties?.NAME || "Estado dos EUA";
            const code = feature.properties?.STUSPS || "";
            layer.bindTooltip(
              `<div style="font-family: system-ui, sans-serif; font-weight: 700; font-size: 11px; color: #38bdf8;">
                🇺🇸 ${name} (${code})
              </div>`,
              { sticky: true, className: "tactical-clean-tooltip" }
            );

            layer.on({
              mouseover: (e) => {
                const l = e.target;
                l.setStyle({ weight: 2.0, color: "#38bdf8", fillOpacity: 0.1 });
                l.bringToFront();
              },
              mouseout: (e) => {
                if (usStatesLayerRef.current) {
                  usStatesLayerRef.current.resetStyle(e.target);
                }
              },
            });
          },
        }).addTo(map);

        usStatesLayerRef.current = statesGjson;
      })
      .catch((err) => console.debug("Could not load US states geojson:", err));

    // ==========================================
    // 4. ROTAS TRANSNACIONAIS DE CARTÉIS (América do Sul -> EUA)
    // ==========================================
    // Rota 1: Corredor Marítimo Pacífico (Colômbia/Galápagos/Equador -> México -> Califórnia)
    const pacificNarcoRoute: L.LatLngExpression[] = [
      [3.88, -77.03],   // Buenaventura, Colômbia
      [0.90, -79.65],   // Esmeraldas, Equador
      [-0.95, -90.96],  // Arquipélago de Galápagos (Trânsito de Submersíveis)
      [8.5, -84.5],     // Costa Rica Pacífico
      [13.5, -90.5],    // Guatemala Pacífico
      [19.0, -104.5],   // Manzanillo, México
      [23.2, -106.4],   // Mazatlán (Cartel de Sinaloa)
      [32.5, -117.1],   // San Diego, Califórnia (Entrada Anel 1 / Anel 2)
    ];
    L.polyline(pacificNarcoRoute, {
      color: "#10b981",
      weight: 2.2,
      dashArray: "6, 6",
      opacity: 0.85,
    })
      .bindTooltip(
        "<b>Corredor Marítimo do Pacífico (JIATF-South)</b><br/>Submersíveis e Lanchas Rápidas: Colômbia ➔ Galápagos ➔ Sinaloa ➔ Califórnia",
        { sticky: true }
      )
      .addTo(cartelsGroup);

    // Rota 2: Corredor Marítimo do Caribe (Colômbia/Venezuela ➔ Rep. Dominicana ➔ Flórida)
    const caribbeanNarcoRoute: L.LatLngExpression[] = [
      [11.0, -74.8],    // Barranquilla, Colômbia
      [10.6, -71.6],    // Lago de Maracaibo, Venezuela
      [18.4, -69.9],    // Santo Domingo, República Dominicana
      [21.5, -73.0],    // Ilhas Turks & Caicos
      [24.5, -77.5],    // Bahamas
      [25.7, -80.2],    // Miami / Flórida Keys (Entrada Anel 1 Marítimo)
    ];
    L.polyline(caribbeanNarcoRoute, {
      color: "#06b6d4",
      weight: 2.2,
      dashArray: "6, 6",
      opacity: 0.85,
    })
      .bindTooltip(
        "<b>Corredor do Caribe (USCG / DEA / Joint Task Force)</b><br/>Lanchas Go-Fast e Cargas Clandestinas: Colômbia/Venezuela ➔ Caribe ➔ Flórida",
        { sticky: true }
      )
      .addTo(cartelsGroup);

    // Rota 3: Corredor Aéreo de Pistas Clandestinas (Venezuela/Colômbia ➔ Honduras ➔ México ➔ Texas)
    const airNarcoRoute: L.LatLngExpression[] = [
      [7.1, -67.5],     // Apure, Venezuela (Pistas Clandestinas)
      [15.5, -85.5],    // La Mosquitia, Honduras
      [16.5, -90.5],    // Petén, Guatemala
      [25.6, -100.3],   // Monterrey, México
      [27.5, -99.5],    // Laredo / Rio Grande Valley (Entrada Anel 2 Federal)
    ];
    L.polyline(airNarcoRoute, {
      color: "#eab308",
      weight: 2.0,
      dashArray: "4, 6",
      opacity: 0.8,
    })
      .bindTooltip(
        "<b>Corredor Aéreo Clandestino (USAF Air Shield / CBP AMO)</b><br/>Voos em Baixa Altitude: Pistas na Venezuela/Colômbia ➔ América Central ➔ Texas",
        { sticky: true }
      )
      .addTo(cartelsGroup);

    // ==========================================
    // 5. OS 3 ANÉIS DE DEFESA DA DOUTRINA C4ISR (Clean Perimeters)
    // ==========================================
    // Ring 1: ZEE Marítima (Linha Perimetral Azul)
    const ring1Coords: L.LatLngExpression[] = [
      [25.0, -97.8], [21.0, -97.5], [21.0, -82.0], [24.5, -80.0],
      [28.5, -82.0], [29.5, -88.0], [29.0, -94.0], [25.0, -97.8],
    ];
    L.polygon(ring1Coords, {
      color: "#38bdf8",
      weight: 1.8,
      dashArray: "6, 6",
      fillColor: "#0284c7",
      fillOpacity: 0.04, // Very subtle, clean
    })
      .bindTooltip("<b>ANEL 1 (MARÍTIMO - USCG / US NAVY)</b><br/>Zona Econômica Exclusiva (200 MN) e Acessos Oceânicos", {
        sticky: true,
      })
      .addTo(ringsGroup);

    // Ring 2: Fronteira Federal 100 Milhas (Linha Perimetral Âmbar)
    const ring2Coords: L.LatLngExpression[] = [
      [32.8, -117.5], [31.8, -117.2], [31.5, -114.5], [30.8, -111.0],
      [31.0, -108.0], [31.2, -106.5], [29.5, -104.0], [28.5, -101.0],
      [25.5, -97.5], [26.2, -96.8], [28.8, -99.5], [30.5, -103.5],
      [32.5, -106.0], [32.5, -111.0], [33.2, -115.0], [32.8, -117.5],
    ];
    L.polygon(ring2Coords, {
      color: "#f59e0b",
      weight: 1.8,
      dashArray: "5, 5",
      fillColor: "#d97706",
      fillOpacity: 0.04, // Very subtle, clean
    })
      .bindTooltip("<b>ANEL 2 (FRONTEIRA FEDERAL - CBP / EXÉRCITO / USAF)</b><br/>Faixa Legal de 100 Milhas ao longo da Fronteira Sul", {
        sticky: true,
      })
      .addTo(ringsGroup);

    // Ring 3: Corredores Rodoviários Interestaduais (Linhas Vermelhas/Roxas)
    // I-10
    const i10Coords: L.LatLngExpression[] = [
      [34.0, -118.2], [33.5, -112.0], [32.2, -110.9], [31.7, -106.4],
      [29.4, -98.5], [29.7, -95.3], [30.2, -92.0], [30.4, -89.0], [30.3, -81.6],
    ];
    L.polyline(i10Coords, {
      color: "#ef4444",
      weight: 2.5,
      opacity: 0.85,
    })
      .bindTooltip("<b>Interestadual I-10 (Corredor DEA/FBI)</b><br/>Califórnia ➔ Arizona ➔ Texas ➔ Flórida", { sticky: true })
      .addTo(ringsGroup);

    // I-35
    const i35Coords: L.LatLngExpression[] = [
      [27.5, -99.5], [29.4, -98.5], [30.2, -97.7], [32.7, -96.8],
      [37.7, -97.3], [39.1, -94.6], [41.6, -93.6], [44.9, -93.2],
    ];
    L.polyline(i35Coords, {
      color: "#c084fc",
      weight: 2.5,
      opacity: 0.85,
    })
      .bindTooltip("<b>Interestadual I-35 (Corredor Central HIDTA)</b><br/>Porto de Laredo ➔ San Antonio ➔ Dallas ➔ Kansas City", { sticky: true })
      .addTo(ringsGroup);

    // I-95
    const i95Coords: L.LatLngExpression[] = [
      [25.7, -80.2], [28.5, -81.3], [30.3, -81.6], [32.0, -81.1],
      [35.8, -78.6], [38.9, -77.0], [40.7, -74.0], [42.3, -71.0],
    ];
    L.polyline(i95Coords, {
      color: "#f472b6",
      weight: 2.2,
      opacity: 0.85,
    })
      .bindTooltip("<b>Interestadual I-95 (Corredor Atlântico)</b><br/>Miami ➔ Washington DC ➔ Nova York", { sticky: true })
      .addTo(ringsGroup);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Handle Map Theme Switching
  useEffect(() => {
    if (!mapInstanceRef.current || !baseTilesRef.current) return;
    const map = mapInstanceRef.current;
    map.removeLayer(baseTilesRef.current);

    let url = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
    let subdomains = "";
    let maxZoom = 18;

    if (mapTheme === "dark") {
      url = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
      subdomains = "abcd";
      maxZoom = 19;
    } else if (mapTheme === "streets") {
      url = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
      subdomains = "abc";
      maxZoom = 19;
    }

    const newTile = L.tileLayer(url, { subdomains, maxZoom }).addTo(map);
    baseTilesRef.current = newTile;
    newTile.bringToBack();
  }, [mapTheme]);

  // Toggle South America Layer
  useEffect(() => {
    if (!mapInstanceRef.current || !southAmericaLayerRef.current) return;
    const map = mapInstanceRef.current;
    if (showSouthAmerica) {
      if (!map.hasLayer(southAmericaLayerRef.current)) map.addLayer(southAmericaLayerRef.current);
    } else {
      if (map.hasLayer(southAmericaLayerRef.current)) map.removeLayer(southAmericaLayerRef.current);
    }
  }, [showSouthAmerica]);

  // Toggle Transit Layer (Mexico & Caribbean)
  useEffect(() => {
    if (!mapInstanceRef.current || !transitLayerRef.current) return;
    const map = mapInstanceRef.current;
    if (showTransit) {
      if (!map.hasLayer(transitLayerRef.current)) map.addLayer(transitLayerRef.current);
    } else {
      if (map.hasLayer(transitLayerRef.current)) map.removeLayer(transitLayerRef.current);
    }
  }, [showTransit]);

  // Toggle US States Layer
  useEffect(() => {
    if (!mapInstanceRef.current || !usStatesLayerRef.current) return;
    const map = mapInstanceRef.current;
    if (showUSStates) {
      if (!map.hasLayer(usStatesLayerRef.current)) map.addLayer(usStatesLayerRef.current);
    } else {
      if (map.hasLayer(usStatesLayerRef.current)) map.removeLayer(usStatesLayerRef.current);
    }
  }, [showUSStates]);

  // Toggle Cartel Routes
  useEffect(() => {
    if (!mapInstanceRef.current || !cartelsLayerRef.current) return;
    const map = mapInstanceRef.current;
    if (showCartelRoutes) {
      if (!map.hasLayer(cartelsLayerRef.current)) map.addLayer(cartelsLayerRef.current);
    } else {
      if (map.hasLayer(cartelsLayerRef.current)) map.removeLayer(cartelsLayerRef.current);
    }
  }, [showCartelRoutes]);

  // Toggle Rings Layer
  useEffect(() => {
    if (!mapInstanceRef.current || !ringsLayerRef.current) return;
    const map = mapInstanceRef.current;
    if (showRings) {
      if (!map.hasLayer(ringsLayerRef.current)) map.addLayer(ringsLayerRef.current);
    } else {
      if (map.hasLayer(ringsLayerRef.current)) map.removeLayer(ringsLayerRef.current);
    }
  }, [showRings]);

  // Update Target Markers (Clean, sleek, uncluttered pins)
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;
    const markersGroup = markersLayerRef.current;
    markersGroup.clearLayers();

    if (!showTargets) return;

    const filtered = threats.filter((t) => {
      if (ringFilter !== "ALL" && t.ring !== ringFilter) return false;
      return true;
    });

    filtered.forEach((t) => {
      const isSelected = selectedTarget?.event_id === t.event_id;
      const isHighRisk = t.severity > 0.85;

      let ringColor = "#0284c7"; // Blue (Ring 1)
      if (t.ring === "RING_2_FEDERAL") ringColor = "#f59e0b"; // Amber (Ring 2)
      if (t.ring === "RING_3_INTERSTATE") ringColor = "#ef4444"; // Red (Ring 3)

      const iconHtml = `
        <div class="relative flex items-center justify-center cursor-pointer">
          <div class="absolute w-7 h-7 rounded-full ${
            isHighRisk ? "bg-red-500/40 animate-ping" : "bg-sky-400/20"
          }"></div>
          <div style="background-color: ${ringColor};" class="w-6 h-6 rounded-md flex items-center justify-center shadow-lg border ${
        isSelected ? "border-white scale-125 ring-2 ring-sky-400" : "border-slate-900"
      } text-[11px] font-bold text-white transition-transform">
            ${
              t.subsystem.includes("maritime")
                ? "🚢"
                : t.subsystem.includes("airspace")
                ? "✈️"
                : t.subsystem.includes("narcotics")
                ? "⚠️"
                : "🚨"
            }
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

      const popupContent = `
        <div style="font-family: system-ui, sans-serif; color: #f8fafc; background: #0b1320; padding: 10px; border-radius: 8px; border: 1px solid #1e2f4a; min-width: 220px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <b style="color: #38bdf8; font-size: 13px; font-family: monospace;">${t.target_id}</b>
            <span style="background: ${t.severity > 0.85 ? '#ef4444' : '#f59e0b'}; color: #000; font-weight: bold; padding: 2px 6px; border-radius: 4px; font-size: 10px;">
              ${(t.severity * 100).toFixed(0)}% RISCO
            </span>
          </div>
          <div style="font-size: 11px; color: #cbd5e1; margin-bottom: 4px;">
            <b>Ameaça:</b> ${t.threat_type}
          </div>
          <div style="font-size: 11px; color: #94a3b8; margin-bottom: 3px;">
            <b>Agência Líder:</b> <span style="color: #38bdf8; font-weight: bold;">${t.lead_agency}</span>
          </div>
          <div style="font-size: 11px; color: #94a3b8; margin-bottom: 6px;">
            <b>Anel de Defesa:</b> ${t.ring.replace("RING_", "Anel ")}
          </div>
          <div style="font-size: 10px; color: #64748b; font-family: monospace; border-top: 1px solid #1e2f4a; padding-top: 4px;">
            ${t.latitude.toFixed(4)}°N, ${t.longitude.toFixed(4)}°W
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);
      marker.on("click", () => onSelectTarget(t));
      marker.addTo(markersGroup);
    });
  }, [threats, selectedTarget, ringFilter, showTargets, onSelectTarget]);

  // Quick Preset Pan/Zoom Buttons
  const handlePreset = (preset: "americas" | "south_america" | "us" | "border" | "caribbean") => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    if (preset === "americas") {
      map.fitBounds([
        [-56.0, -125.0],
        [52.0, -45.0],
      ]);
    } else if (preset === "south_america") {
      map.fitBounds([
        [-56.0, -82.0], // Chile / Argentina
        [13.0, -34.0],  // Colômbia / Brasil
      ]);
    } else if (preset === "us") {
      map.fitBounds([
        [24.0, -125.0],
        [49.5, -66.5],
      ]);
    } else if (preset === "border") {
      map.setView([31.5, -106.0], 6); // Texas / Mexico border
    } else if (preset === "caribbean") {
      map.setView([19.5, -75.0], 5); // Caribbean Basin / JIATF-South
    }
  };

  return (
    <div className="relative w-full h-full bg-[#050811] overflow-hidden">
      {/* Map Leaflet Canvas */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* TOP-RIGHT CONTROLS: PRESETS + THEMES + LAYER TOGGLES */}
      <div className="absolute top-3 right-4 z-[1000] flex flex-col space-y-2 pointer-events-auto max-w-[95vw]">
        {/* Presets de Visão Hemisférica */}
        <div className="flex flex-wrap items-center gap-1 bg-[#0b1320]/95 backdrop-blur-md border border-[#1e2f4a] p-1.5 rounded-lg text-xs shadow-2xl">
          <span className="text-[10px] text-slate-400 font-bold px-1 uppercase tracking-wider">Visão:</span>
          <button
            onClick={() => handlePreset("americas")}
            className="px-2 py-1 rounded bg-sky-500/20 hover:bg-sky-500 text-sky-300 hover:text-slate-950 font-bold text-xs transition"
          >
            🌎 Américas Completo
          </button>
          <button
            onClick={() => handlePreset("south_america")}
            className="px-2 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 font-bold text-xs transition"
          >
            🇧🇷 América do Sul
          </button>
          <button
            onClick={() => handlePreset("us")}
            className="px-2 py-1 rounded bg-[#111c2e] hover:bg-[#1e2f4a] text-slate-200 font-semibold text-xs transition"
          >
            🇺🇸 Estados Unidos
          </button>
          <button
            onClick={() => handlePreset("border")}
            className="px-2 py-1 rounded bg-[#111c2e] hover:bg-[#1e2f4a] text-slate-200 font-semibold text-xs transition"
          >
            🌵 Fronteira Sul
          </button>
          <button
            onClick={() => handlePreset("caribbean")}
            className="px-2 py-1 rounded bg-[#111c2e] hover:bg-[#1e2f4a] text-slate-200 font-semibold text-xs transition"
          >
            🌊 Caribe & Golfo
          </button>
        </div>

        {/* Camadas & Estilo do Mapa */}
        <div className="flex flex-wrap items-center justify-between gap-2 bg-[#0b1320]/95 backdrop-blur-md border border-[#1e2f4a] p-1.5 rounded-lg text-xs shadow-2xl">
          <div className="flex items-center space-x-1">
            <span className="text-[10px] text-slate-400 font-bold px-1 uppercase tracking-wider">Estilo:</span>
            <button
              onClick={() => setMapTheme("satellite")}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition ${
                mapTheme === "satellite" ? "bg-emerald-500 text-slate-950 shadow-sm" : "text-slate-400 hover:text-white"
              }`}
            >
              🛰️ Satélite Real HD
            </button>
            <button
              onClick={() => setMapTheme("dark")}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition ${
                mapTheme === "dark" ? "bg-sky-500 text-slate-950 shadow-sm" : "text-slate-400 hover:text-white"
              }`}
            >
              🌑 Tático Escuro
            </button>
            <button
              onClick={() => setMapTheme("streets")}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition ${
                mapTheme === "streets" ? "bg-amber-500 text-slate-950 shadow-sm" : "text-slate-400 hover:text-white"
              }`}
            >
              🗺️ Ruas/Cidades
            </button>
          </div>

          {/* Toggles de Camadas (Visão 100% Limpa) */}
          <div className="flex flex-wrap items-center gap-3 pl-3 border-l border-[#1e2f4a]">
            <label className="flex items-center space-x-1 cursor-pointer text-[11px] text-emerald-400 hover:text-emerald-300">
              <input
                type="checkbox"
                checked={showSouthAmerica}
                onChange={(e) => setShowSouthAmerica(e.target.checked)}
                className="rounded accent-emerald-500"
              />
              <span>América do Sul</span>
            </label>
            <label className="flex items-center space-x-1 cursor-pointer text-[11px] text-sky-400 hover:text-sky-300">
              <input
                type="checkbox"
                checked={showUSStates}
                onChange={(e) => setShowUSStates(e.target.checked)}
                className="rounded accent-sky-500"
              />
              <span>50 Estados EUA</span>
            </label>
            <label className="flex items-center space-x-1 cursor-pointer text-[11px] text-amber-400 hover:text-amber-300">
              <input
                type="checkbox"
                checked={showTransit}
                onChange={(e) => setShowTransit(e.target.checked)}
                className="rounded accent-amber-500"
              />
              <span>México / Caribe</span>
            </label>
            <label className="flex items-center space-x-1 cursor-pointer text-[11px] text-teal-300 hover:text-teal-200">
              <input
                type="checkbox"
                checked={showCartelRoutes}
                onChange={(e) => setShowCartelRoutes(e.target.checked)}
                className="rounded accent-teal-400"
              />
              <span>Rotas de Cartéis</span>
            </label>
            <label className="flex items-center space-x-1 cursor-pointer text-[11px] text-red-400 hover:text-red-300">
              <input
                type="checkbox"
                checked={showRings}
                onChange={(e) => setShowRings(e.target.checked)}
                className="rounded accent-red-500"
              />
              <span>3 Anéis</span>
            </label>
            <label className="flex items-center space-x-1 cursor-pointer text-[11px] text-white hover:text-slate-200">
              <input
                type="checkbox"
                checked={showTargets}
                onChange={(e) => setShowTargets(e.target.checked)}
                className="rounded accent-white"
              />
              <span>Alvos</span>
            </label>
          </div>
        </div>
      </div>

      {/* BOTTOM-LEFT HUD LEGEND (Visão Tática C4ISR) */}
      <div className="absolute bottom-3 left-4 z-[1000] flex flex-wrap items-center gap-4 bg-[#0b1320]/90 backdrop-blur-md border border-[#1e2f4a] px-3.5 py-2 rounded-lg text-xs shadow-2xl pointer-events-auto">
        <div className="flex items-center space-x-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <span className="text-slate-200 font-semibold">América do Sul (Origem / Portos)</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-teal-400 border border-teal-200" />
          <span className="text-slate-200 font-semibold">Rotas Marítimas/Aéreas (JIATF-South)</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-sky-400" />
          <span className="text-slate-200 font-semibold">Anel 1: ZEE Marítima (200 MN)</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="text-slate-200 font-semibold">Anel 2: Fronteira 100 Milhas</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <span className="text-slate-200 font-semibold">Anel 3: Corredores Interestaduais</span>
        </div>
      </div>
    </div>
  );
}
