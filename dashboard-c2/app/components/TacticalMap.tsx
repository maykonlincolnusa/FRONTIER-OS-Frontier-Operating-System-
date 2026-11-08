"use client";

import React, { useEffect, useRef } from "react";
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

export default function TacticalMap({
  threats,
  selectedTarget,
  onSelectTarget,
  ringFilter,
}: TacticalMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const ringsLayerRef = useRef<L.LayerGroup | null>(null);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [29.5, -98.0],
      zoom: 5,
      minZoom: 4,
      maxZoom: 12,
      zoomControl: true,
      attributionControl: false,
    });

    // Dark Matter Tactical Basemap
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      {
        subdomains: "abcd",
        maxZoom: 19,
      }
    ).addTo(map);

    const ringsGroup = L.layerGroup().addTo(map);
    const markersGroup = L.layerGroup().addTo(map);

    ringsLayerRef.current = ringsGroup;
    markersLayerRef.current = markersGroup;
    mapInstanceRef.current = map;

    // Draw the 3 Security Rings
    // Ring 1: Maritime EEZ (Blue)
    const ring1Coords: L.LatLngExpression[] = [
      [25.0, -97.8], [21.0, -97.5], [21.0, -82.0], [24.5, -80.0],
      [28.5, -82.0], [29.5, -88.0], [29.0, -94.0], [25.0, -97.8],
    ];
    L.polygon(ring1Coords, {
      color: "#0284c7",
      weight: 2,
      dashArray: "6, 6",
      fillColor: "#0369a1",
      fillOpacity: 0.12,
    })
      .bindTooltip("<b>ANEL 1 (MARÍTIMO)</b><br/>ZEE & Acessos Costeiros (USCG / US Navy)", {
        sticky: true,
        className: "tactical-tooltip",
      })
      .addTo(ringsGroup);

    // Ring 2: Federal Land Border 100-mile statutory zone (Amber)
    const ring2Coords: L.LatLngExpression[] = [
      [32.8, -117.5], [31.8, -117.2], [31.5, -114.5], [30.8, -111.0],
      [31.0, -108.0], [31.2, -106.5], [29.5, -104.0], [28.5, -101.0],
      [25.5, -97.5], [26.2, -96.8], [28.8, -99.5], [30.5, -103.5],
      [32.5, -106.0], [32.5, -111.0], [33.2, -115.0], [32.8, -117.5],
    ];
    L.polygon(ring2Coords, {
      color: "#f59e0b",
      weight: 2.5,
      fillColor: "#d97706",
      fillOpacity: 0.15,
    })
      .bindTooltip("<b>ANEL 2 (FEDERAL)</b><br/>Faixa de Fronteira 100 Milhas (CBP / Exército / USAF)", {
        sticky: true,
        className: "tactical-tooltip",
      })
      .addTo(ringsGroup);

    // Ring 3: Interstate Corridors (Red)
    // I-10 Corridor (San Diego / Tucson / El Paso / San Antonio / Houston / Jacksonville)
    const i10Coords: L.LatLngExpression[] = [
      [32.7, -117.1], [32.2, -110.9], [31.7, -106.4], [29.4, -98.5],
      [29.7, -95.3], [30.4, -91.1], [30.3, -81.6],
    ];
    L.polyline(i10Coords, {
      color: "#ef4444",
      weight: 3,
      dashArray: "4, 4",
    })
      .bindTooltip("<b>Corredor HIDTA I-10</b> (Rota Crítica de Trânsito)", { sticky: true })
      .addTo(ringsGroup);

    // I-35 Corridor (Laredo -> San Antonio -> Austin -> Dallas)
    const i35Coords: L.LatLngExpression[] = [
      [27.5, -99.5], [29.4, -98.5], [30.2, -97.7], [32.7, -96.8],
    ];
    L.polyline(i35Coords, {
      color: "#a855f7",
      weight: 3,
      dashArray: "4, 4",
    })
      .bindTooltip("<b>Corredor HIDTA I-35</b> (Porto de Laredo -> Interior)", { sticky: true })
      .addTo(ringsGroup);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Markers when threats change
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
      const isHighRisk = t.severity > 0.85;

      // Color by Ring
      let ringColor = "#0284c7"; // Blue (Ring 1)
      if (t.ring === "RING_2_FEDERAL") ringColor = "#f59e0b"; // Amber (Ring 2)
      if (t.ring === "RING_3_INTERSTATE") ringColor = "#ef4444"; // Red (Ring 3)

      const iconHtml = `
        <div class="relative flex items-center justify-center">
          <div class="absolute w-8 h-8 rounded-full ${
            isHighRisk ? "bg-red-500/40 animate-ping" : "bg-sky-500/30"
          }"></div>
          <div style="background-color: ${ringColor};" class="w-6 h-6 rounded-md flex items-center justify-center shadow-lg border-2 ${
        isSelected ? "border-white scale-125" : "border-slate-900"
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
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([t.latitude, t.longitude], { icon: customIcon });

      const popupContent = `
        <div style="font-family: monospace; color: #f8fafc; background: #0b1320; padding: 8px; border-radius: 6px; border: 1px solid #1e2f4a; min-width: 200px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <b style="color: #38bdf8; font-size: 13px;">${t.target_id}</b>
            <span style="background: ${t.severity > 0.85 ? '#ef4444' : '#f59e0b'}; color: #000; font-weight: bold; padding: 2px 5px; border-radius: 4px; font-size: 10px;">
              ${(t.severity * 100).toFixed(0)}% RISCO
            </span>
          </div>
          <div style="font-size: 11px; color: #94a3b8; margin-bottom: 2px;">
            <b>Classificação:</b> ${t.threat_type}
          </div>
          <div style="font-size: 11px; color: #94a3b8; margin-bottom: 2px;">
            <b>Agência Líder:</b> <span style="color: #f1f5f9; font-weight: bold;">${t.lead_agency}</span>
          </div>
          <div style="font-size: 11px; color: #94a3b8; margin-bottom: 4px;">
            <b>Anel:</b> ${t.ring.replace("RING_", "Anel ")}
          </div>
          <div style="font-size: 10px; color: #64748b;">
            Coords: ${t.latitude.toFixed(4)}°N, ${t.longitude.toFixed(4)}°W
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, { className: "custom-leaflet-popup" });
      marker.on("click", () => onSelectTarget(t));
      marker.addTo(markersGroup);
    });
  }, [threats, selectedTarget, ringFilter, onSelectTarget]);

  return (
    <div className="relative w-full h-full bg-[#070b12] overflow-hidden">
      <div ref={mapContainerRef} className="w-full h-full z-0" />
    </div>
  );
}
