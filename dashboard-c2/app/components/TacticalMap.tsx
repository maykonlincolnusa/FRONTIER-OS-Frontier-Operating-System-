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
  syndicate?: string;
  modal?: string;
  theater?: string;
  speed_knots?: number;
  heading_deg?: number;
  photo_url?: string;
  metadata?: Record<string, any>;
}

export type CameraPreset =
  | "panamerican"
  | "usa"
  | "brazil"
  | "colombia"
  | "mexico"
  | "panama"
  | "chile"
  | "argentina"
  | "americas"
  | "us"
  | "south_america"
  | "border"
  | "caribbean";

type MapTheme = "hybrid" | "dark" | "political";

interface TacticalMapProps {
  threats: ThreatAlert[];
  selectedTarget: ThreatAlert | null;
  onSelectTarget: (t: ThreatAlert | null) => void;
  ringFilter: string;
  syndicateFilter?: string;
  modalFilter?: string;
  cameraPreset: CameraPreset;
  onPresetChange: (preset: CameraPreset) => void;
  onAuthorizeHandoff?: (targetId: string) => void;
}

// Strategic Transnational Logistics Arcs (Pan-American Crime Corridors)
const TRANSNATIONAL_ARCS = [
  {
    id: "arc-colombia-panama-us",
    name: "Pacific Maritime & Submersible Corridor",
    syndicate: "CLAN_DEL_GOLFO",
    modal: "SEMI_SUBMERSIBLE",
    color: "#10b981", // Emerald
    coords: [
      [1.798, -78.815],   // Tumaco (Colombia)
      [3.882, -77.031],   // Buenaventura
      [8.956, -79.567],   // Balboa (Panama Canal)
      [19.053, -104.316], // Manzanillo (Mexico)
      [32.53, -117.12],   // San Diego / Tijuana
    ] as L.LatLngExpression[],
    flow: "Colombia ➔ Panama Chokepoint ➔ Pacific Mexico ➔ US Ring 1/2",
  },
  {
    id: "arc-brazil-atlantic-houston",
    name: "Transatlantic Container Export Route",
    syndicate: "PCC",
    modal: "MARITIME_CONTAINER",
    color: "#38bdf8", // Sky blue
    coords: [
      [-23.967, -46.301], // Port of Santos (Brazil)
      [-5.0, -34.5],      // Atlantic Turn / Natal
      [9.359, -79.901],   // Colón Terminal (Panama)
      [25.7, -80.2],      // Miami / Florida Straits
      [29.683, -95.011],  // Port of Houston (Ring 1)
    ] as L.LatLngExpression[],
    flow: "Port of Santos (PCC) ➔ Panama Canal ➔ Gulf of Mexico / Houston",
  },
  {
    id: "arc-solimoes-amazon-air",
    name: "Amazon Riverine & Clandestine Air Axis",
    syndicate: "CV",
    modal: "RIVERINE_BARGE",
    color: "#f59e0b", // Amber
    coords: [
      [-4.241, -69.938],  // Tabatinga / Solimões
      [-3.119, -60.021],  // Manaus
      [7.1, -67.5],       // Orinoco / Clandestine Strip
      [15.5, -85.5],      // Central America Air Bridge
      [27.599, -99.531],  // Laredo POE (Ring 2)
    ] as L.LatLngExpression[],
    flow: "Tabatinga / Solimões (CV) ➔ Air Corridors ➔ US-Mexico Border",
  },
  {
    id: "arc-cone-sur-hidrovia",
    name: "Hidrovía Paraná-Paraguay Bulk Route",
    syndicate: "PCC",
    modal: "RIVERINE_BARGE",
    color: "#a855f7", // Purple
    coords: [
      [-32.946, -60.639], // Rosario (Argentina)
      [-25.513, -54.587], // Foz do Iguaçu (BR-277)
      [-25.501, -48.508], // Port of Paranaguá
      [-23.967, -46.301], // Santos Export Terminal
    ] as L.LatLngExpression[],
    flow: "Hidrovía Paraná-Paraguay ➔ Tri-Border BR-277 ➔ Santos Deepwater Port",
  },
];

// Strategic ST-GNN Risk Hotspot Nodes
const STRATEGIC_HOTSPOTS = [
  { name: "Porto de Santos (PCC)", lat: -23.967, lon: -46.301, risk: 0.88, color: "#38bdf8" },
  { name: "Tumaco Submersible Hub (Clan del Golfo)", lat: 1.798, lon: -78.815, risk: 0.96, color: "#10b981" },
  { name: "Panama Canal Transit (Balboa / Colón)", lat: 8.956, lon: -79.567, risk: 0.92, color: "#06b6d4" },
  { name: "Manzanillo Pacific Entry (CJNG)", lat: 19.053, lon: -104.316, risk: 0.95, color: "#f43f5e" },
  { name: "Laredo World Trade Bridge (Sinaloa)", lat: 27.599, lon: -99.531, risk: 0.97, color: "#ef4444" },
  { name: "Tabatinga Riverine Basin (CV)", lat: -4.241, lon: -69.938, risk: 0.91, color: "#eab308" },
];

export default function TacticalMap({
  threats,
  selectedTarget,
  onSelectTarget,
  ringFilter,
  syndicateFilter = "ALL",
  modalFilter = "ALL",
  cameraPreset,
  onAuthorizeHandoff,
}: TacticalMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const baseTilesRef = useRef<L.TileLayer | null>(null);
  const labelsTilesRef = useRef<L.TileLayer | null>(null);

  const southAmericaLayerRef = useRef<L.GeoJSON | null>(null);
  const usStatesLayerRef = useRef<L.GeoJSON | null>(null);
  const strategicArcsLayerRef = useRef<L.LayerGroup | null>(null);
  const operationalRingsLayerRef = useRef<L.LayerGroup | null>(null);
  const tacticalMarkersLayerRef = useRef<L.LayerGroup | null>(null);
  const velocityVectorsLayerRef = useRef<L.LayerGroup | null>(null);
  const heatmapLayerRef = useRef<L.LayerGroup | null>(null);

  const [mapTheme, setMapTheme] = useState<MapTheme>("hybrid");
  const [currentZoom, setCurrentZoom] = useState<number>(3.0);
  const [showSouthAmerica, setShowSouthAmerica] = useState<boolean>(true);
  const [showUSStates, setShowUSStates] = useState<boolean>(true);
  const [showTransnationalArcs, setShowTransnationalArcs] = useState<boolean>(true);
  const [showDefenseRings, setShowDefenseRings] = useState<boolean>(true);

  // Semantic Zoom Tiers:
  // Tier 1: Strategic (zoom < 4) - Continental flow arcs & ST-GNN risk heatmap, NO cluttered pins
  // Tier 2: Operational (4 <= zoom < 7) - Defense Rings (Ring 1/2/3) + Chokepoints/Freeways
  // Tier 3: Tactical (zoom >= 7) - Real-time individual targets + Velocity Vectors + Wanted Cards
  const isStrategic = currentZoom < 4;
  const isOperational = currentZoom >= 4 && currentZoom < 7;
  const isTactical = currentZoom >= 7;

  // Initialize Map
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
      { maxZoom: 18, opacity: 0.85 }
    ).addTo(map);

    baseTilesRef.current = baseTile;
    labelsTilesRef.current = labelsTile;

    // Tactical Layer Groups
    strategicArcsLayerRef.current = L.layerGroup().addTo(map);
    operationalRingsLayerRef.current = L.layerGroup().addTo(map);
    heatmapLayerRef.current = L.layerGroup().addTo(map);
    tacticalMarkersLayerRef.current = L.layerGroup().addTo(map);
    velocityVectorsLayerRef.current = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;

    // Track zoom for Semantic Zoom UX
    map.on("zoomend", () => {
      setCurrentZoom(map.getZoom());
    });

    map.fitBounds([
      [-55.0, -125.0],
      [50.0, -34.0],
    ]);

    // 1. South America GeoJSON Intelligence Layer
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
            layer.bindTooltip(
              `<div style="font-family: system-ui, sans-serif; padding: 2px 4px;">
                <div style="font-weight: 700; color: #34d399; font-size: 11px;">${name}</div>
                <div style="color: #cbd5e1; font-size: 9px;">${threatRole}</div>
              </div>`,
              { sticky: true, className: "tactical-clean-tooltip" }
            );
          },
        }).addTo(map);
        southAmericaLayerRef.current = saLayer;
      })
      .catch(() => {});

    // 2. US 50 States GeoJSON Intelligence Layer
    fetch("/us_states.json")
      .then((res) => res.json())
      .then((data) => {
        if (!mapInstanceRef.current) return;
        const usLayer = L.geoJSON(data, {
          style: (feature) => {
            const name = feature?.properties?.name;
            const isBorder = ["Texas", "California", "Arizona", "New Mexico", "Florida"].includes(name);
            return {
              color: isBorder ? "#f59e0b" : "#38bdf8",
              weight: isBorder ? 1.4 : 0.8,
              opacity: 0.45,
              fillColor: "#38bdf8",
              fillOpacity: 0.0,
            };
          },
        }).addTo(map);
        usStatesLayerRef.current = usLayer;
      })
      .catch(() => {});

    // 3. Build Operational Defense Rings (Ring 1 Maritime, Ring 2 Federal Border, Ring 3 Interstate)
    const ringsGroup = operationalRingsLayerRef.current;
    if (ringsGroup) {
      // Ring 1: Maritime EEZ Perimeter (USCG / US Navy)
      L.polyline(
        [
          [25.9, -97.49],
          [23.5, -90.0],
          [24.0, -81.5],
          [27.0, -79.5],
          [31.0, -79.0],
        ],
        { color: "#38bdf8", weight: 2.2, dashArray: "4, 6", opacity: 0.9 }
      )
        .bindTooltip("<b>RING 1: Maritime EEZ Perimeter (USCG / US Navy)</b>", {
          sticky: true,
          className: "tactical-clean-tooltip",
        })
        .addTo(ringsGroup);

      // Ring 2: US-Mexico Border (CBP / US Army / USAF)
      L.polyline(
        [
          [32.53, -117.12],
          [32.72, -114.72],
          [31.33, -110.94],
          [31.76, -106.48],
          [29.56, -104.41],
          [27.5, -99.5],
          [25.9, -97.49],
        ],
        { color: "#f59e0b", weight: 2.5, opacity: 0.95 }
      )
        .bindTooltip("<b>RING 2: US-Mexico Federal Border (CBP / US Army / USAF)</b>", {
          sticky: true,
          className: "tactical-clean-tooltip",
        })
        .addTo(ringsGroup);

      // Ring 3: Interstate I-10 & I-35 High-Speed Corridor (DEA / FBI)
      L.polyline(
        [
          [34.0, -118.2],
          [32.2, -110.9],
          [31.7, -106.4],
          [29.4, -98.5],
          [29.7, -95.3],
          [30.3, -81.6],
        ],
        { color: "#ef4444", weight: 2.0, opacity: 0.85 }
      )
        .bindTooltip("<b>RING 3: Interstate I-10 Homeland Corridor (DEA / FBI)</b>", {
          sticky: true,
          className: "tactical-clean-tooltip",
        })
        .addTo(ringsGroup);

      // Interstate I-35 North-South Spine
      L.polyline(
        [
          [27.5, -99.5],  // Laredo
          [29.4, -98.5],  // San Antonio
          [30.3, -97.7],  // Austin
          [32.8, -96.8],  // Dallas
        ],
        { color: "#ef4444", weight: 1.8, dashArray: "3, 5", opacity: 0.8 }
      )
        .bindTooltip("<b>RING 3: Interstate I-35 Narcotics Arterial (DEA / HIDTA)</b>", {
          sticky: true,
          className: "tactical-clean-tooltip",
        })
        .addTo(ringsGroup);

      // Brazilian Corridors (BR-163 & BR-277)
      L.polyline(
        [
          [-25.513, -54.587], // Foz do Iguaçu
          [-25.501, -48.508], // Paranaguá
        ],
        { color: "#10b981", weight: 2.0, opacity: 0.8 }
      )
        .bindTooltip("<b>BRAZIL CORRIDOR: BR-277 Tri-Border Supply Line (PRF / PF_BR)</b>", {
          sticky: true,
          className: "tactical-clean-tooltip",
        })
        .addTo(ringsGroup);

      L.polyline(
        [
          [-12.548, -55.722], // Mato Grosso
          [-23.967, -46.301], // Santos
        ],
        { color: "#10b981", weight: 1.8, dashArray: "4, 6", opacity: 0.75 }
      )
        .bindTooltip("<b>BRAZIL CORRIDOR: BR-163 Rota Caipira (PRF / PF_BR)</b>", {
          sticky: true,
          className: "tactical-clean-tooltip",
        })
        .addTo(ringsGroup);
    }

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Map Themes
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
        { maxZoom: 18, opacity: 0.85 }
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

  // Layer Visibility Sync
  useEffect(() => {
    const map = mapInstanceRef.current;
    const sa = southAmericaLayerRef.current;
    if (map && sa) {
      showSouthAmerica ? map.addLayer(sa) : map.removeLayer(sa);
    }
  }, [showSouthAmerica]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const us = usStatesLayerRef.current;
    if (map && us) {
      showUSStates ? map.addLayer(us) : map.removeLayer(us);
    }
  }, [showUSStates]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const arcs = strategicArcsLayerRef.current;
    if (map && arcs) {
      showTransnationalArcs ? map.addLayer(arcs) : map.removeLayer(arcs);
    }
  }, [showTransnationalArcs]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const rings = operationalRingsLayerRef.current;
    if (map && rings) {
      showDefenseRings ? map.addLayer(rings) : map.removeLayer(rings);
    }
  }, [showDefenseRings]);

  // Camera Presets (8 Theaters of Operations)
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    switch (cameraPreset) {
      case "panamerican":
      case "americas":
        map.flyToBounds([[-55.0, -125.0], [50.0, -34.0]], { duration: 1.0 });
        break;
      case "usa":
      case "us":
        map.flyTo([38.5, -97.0], 4.5, { duration: 1.0 });
        break;
      case "brazil":
      case "south_america":
        map.flyTo([-14.23, -51.92], 4.5, { duration: 1.0 });
        break;
      case "colombia":
        map.flyTo([4.57, -74.29], 6.0, { duration: 1.0 });
        break;
      case "mexico":
      case "border":
        map.flyTo([23.63, -102.55], 5.2, { duration: 1.0 });
        break;
      case "panama":
        map.flyTo([8.95, -79.6], 7.8, { duration: 1.0 });
        break;
      case "chile":
        map.flyTo([-33.45, -70.66], 5.2, { duration: 1.0 });
        break;
      case "argentina":
        map.flyTo([-34.6, -58.38], 5.2, { duration: 1.0 });
        break;
      case "caribbean":
        map.flyTo([18.5, -76.0], 5.5, { duration: 1.0 });
        break;
      default:
        break;
    }
  }, [cameraPreset]);

  // Selected Target Centering
  useEffect(() => {
    if (!mapInstanceRef.current || !selectedTarget) return;
    mapInstanceRef.current.flyTo([selectedTarget.latitude, selectedTarget.longitude], 7.5, {
      duration: 1.1,
    });
  }, [selectedTarget]);

  // =========================================================================
  // SEMANTIC ZOOM RENDERING LOGIC
  // =========================================================================
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    const arcsGroup = strategicArcsLayerRef.current;
    const heatmapGroup = heatmapLayerRef.current;
    const markersGroup = tacticalMarkersLayerRef.current;
    const vectorsGroup = velocityVectorsLayerRef.current;

    if (!arcsGroup || !heatmapGroup || !markersGroup || !vectorsGroup) return;

    arcsGroup.clearLayers();
    heatmapGroup.clearLayers();
    markersGroup.clearLayers();
    vectorsGroup.clearLayers();

    // -----------------------------------------------------------------------
    // LEVEL 1: STRATEGIC (zoom < 4) - Flow Arcs + ST-GNN Heatmap, NO CLUTTER
    // -----------------------------------------------------------------------
    if (isStrategic) {
      TRANSNATIONAL_ARCS.forEach((arc) => {
        if (syndicateFilter !== "ALL" && arc.syndicate !== syndicateFilter) return;
        if (modalFilter !== "ALL" && arc.modal !== modalFilter) return;

        L.polyline(arc.coords, {
          color: arc.color,
          weight: 3.0,
          dashArray: "6, 8",
          opacity: 0.85,
        })
          .bindTooltip(
            `<div style="font-family: system-ui, sans-serif; padding: 3px 6px;">
              <b style="color: ${arc.color}; font-size: 11px;">${arc.name}</b>
              <div style="color: #94a3b8; font-size: 9px;">Syndicate: ${arc.syndicate} | Modal: ${arc.modal}</div>
              <div style="color: #e2e8f0; font-size: 10px; margin-top: 2px;">${arc.flow}</div>
            </div>`,
            { sticky: true, className: "tactical-clean-tooltip" }
          )
          .addTo(arcsGroup);
      });

      // ST-GNN Risk Heatmap Glow Circles
      STRATEGIC_HOTSPOTS.forEach((spot) => {
        L.circleMarker([spot.lat, spot.lon], {
          radius: 14 * spot.risk,
          color: spot.color,
          fillColor: spot.color,
          fillOpacity: 0.25,
          weight: 1.5,
        })
          .bindTooltip(
            `<div style="font-family: system-ui; padding: 2px 4px;">
              <b style="color: ${spot.color}; font-size: 11px;">ST-GNN HOTSPOT</b>
              <div style="color: #fff; font-size: 10px;">${spot.name}</div>
              <div style="color: #f43f5e; font-size: 9px; font-weight: bold;">Risk Score: ${(spot.risk * 100).toFixed(0)}%</div>
            </div>`,
            { sticky: true, className: "tactical-clean-tooltip" }
          )
          .addTo(heatmapGroup);
      });

      // In Strategic Mode, DO NOT draw cluttered individual pins!
      return;
    }

    // -----------------------------------------------------------------------
    // LEVEL 2 & 3: OPERATIONAL (4 <= zoom < 7) & TACTICAL (zoom >= 7)
    // -----------------------------------------------------------------------
    const filteredThreats = threats.filter((t) => {
      if (ringFilter !== "ALL" && t.ring !== ringFilter) return false;
      if (syndicateFilter !== "ALL" && t.syndicate && t.syndicate !== syndicateFilter) return false;
      if (modalFilter !== "ALL" && t.modal && t.modal !== modalFilter) return false;
      return true;
    });

    filteredThreats.forEach((t) => {
      const isSelected = selectedTarget?.event_id === t.event_id;
      let color = "#38bdf8";
      if (t.ring === "RING_2_FEDERAL") color = "#f59e0b";
      if (t.ring === "RING_3_INTERSTATE") color = "#ef4444";

      // Tactical Level (zoom >= 7): Rich Pins with Velocity Vectors
      if (isTactical) {
        // Render Velocity Vector Arrow (Heading + Speed)
        const speed = t.speed_knots || 18.0;
        const heading = t.heading_deg !== undefined ? t.heading_deg : 45.0;
        const rad = (heading * Math.PI) / 180.0;
        // 0.15 degree vector projection scaled by speed
        const vLength = (speed / 30.0) * 0.12;
        const endLat = t.latitude + vLength * Math.cos(rad);
        const endLon = t.longitude + vLength * Math.sin(rad);

        L.polyline(
          [
            [t.latitude, t.longitude],
            [endLat, endLon],
          ],
          { color: color, weight: 2.2, opacity: 0.9 }
        ).addTo(vectorsGroup);

        L.circleMarker([endLat, endLon], {
          radius: 3.5,
          color: color,
          fillColor: color,
          fillOpacity: 1.0,
        }).addTo(vectorsGroup);
      }

      const iconHtml = `
        <div class="relative flex items-center justify-center cursor-pointer group">
          ${
            isSelected
              ? `<div class="absolute w-10 h-10 rounded-full border-2 border-white animate-ping opacity-60"></div>`
              : `<div style="background:${color};" class="absolute w-6 h-6 rounded-full opacity-20"></div>`
          }
          <div style="background:#090d16; border: 2px solid ${
            isSelected ? "#ffffff" : color
          }; box-shadow: 0 0 14px ${color}90;" class="w-6 h-6 rounded-full flex items-center justify-center text-[11px] transition-transform ${
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

      // Rich Tactical Tooltip
      marker.bindTooltip(
        `<div style="font-family: system-ui, sans-serif; padding: 4px 6px; min-width: 140px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
            <b style="color: ${color}; font-family: monospace; font-size: 11px;">${t.target_id}</b>
            <span style="background: #1e293b; color: #94a3b8; font-size: 9px; padding: 1px 4px; border-radius: 3px;">${t.lead_agency}</span>
          </div>
          <div style="color: #e2e8f0; font-size: 10px;">${t.threat_type.replace(/_/g, " ")}</div>
          ${
            isTactical
              ? `<div style="color: #38bdf8; font-size: 9px; margin-top: 3px; font-family: monospace;">
                   SPD: ${(t.speed_knots || 18).toFixed(1)} kts | HDG: ${(t.heading_deg || 45).toFixed(0)}°
                 </div>`
              : ""
          }
          <div style="color: #f43f5e; font-size: 9px; font-weight: 700; margin-top: 2px;">
            Risk: ${(t.severity * 100).toFixed(0)}%
          </div>
        </div>`,
        { direction: "top", offset: [0, -10], className: "tactical-clean-tooltip" }
      );

      marker.on("click", () => onSelectTarget(t));
      marker.addTo(markersGroup);
    });
  }, [
    threats,
    selectedTarget,
    ringFilter,
    syndicateFilter,
    modalFilter,
    currentZoom,
    isStrategic,
    isOperational,
    isTactical,
    onSelectTarget,
  ]);

  return (
    <div className="relative w-full h-full bg-[#060a12] overflow-hidden select-none">
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* TOP-RIGHT SEMANTIC ZOOM HUD INDICATOR */}
      <div className="absolute top-3 right-3 z-[1000] flex items-center space-x-2 bg-[#090e17]/90 backdrop-blur-md border border-slate-800 px-3 py-1.5 rounded-xl shadow-2xl pointer-events-auto">
        <div className="flex items-center space-x-1.5">
          <span className="h-2 w-2 rounded-full bg-sky-400 animate-pulse" />
          <span className="font-mono text-[10px] text-slate-400 uppercase tracking-wider">
            ZOOM {currentZoom.toFixed(1)}
          </span>
        </div>
        <div className="h-3 w-px bg-slate-800" />
        <span
          className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded border ${
            isStrategic
              ? "bg-purple-500/10 border-purple-500/40 text-purple-300"
              : isOperational
              ? "bg-amber-500/10 border-amber-500/40 text-amber-300"
              : "bg-emerald-500/10 border-emerald-500/40 text-emerald-300"
          }`}
        >
          {isStrategic
            ? "TIER 1: STRATEGIC FLOWS"
            : isOperational
            ? "TIER 2: OPERATIONAL RINGS"
            : "TIER 3: TACTICAL INTERCEPT"}
        </span>
      </div>

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
            🛰️ High-Res Satellite
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
            onClick={() => setShowTransnationalArcs(!showTransnationalArcs)}
            className={`px-2.5 py-1 rounded-full border transition ${
              showTransnationalArcs
                ? "bg-teal-500/15 border-teal-500/50 text-teal-300"
                : "border-transparent text-slate-500 hover:text-slate-300"
            }`}
          >
            🌐 Transnational Arcs
          </button>
          <button
            onClick={() => setShowDefenseRings(!showDefenseRings)}
            className={`px-2.5 py-1 rounded-full border transition ${
              showDefenseRings
                ? "bg-amber-500/15 border-amber-500/50 text-amber-300"
                : "border-transparent text-slate-500 hover:text-slate-300"
            }`}
          >
            🛡️ 3 Defense Rings
          </button>
        </div>
      </div>
    </div>
  );
}
