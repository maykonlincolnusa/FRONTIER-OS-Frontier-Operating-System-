'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Network,
  Clock,
  Cpu,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Play,
  Download,
  Building2,
  UserCheck,
  Ship,
  DollarSign,
  Scale,
  Radio,
  ArrowRight,
  Sparkles,
  Layers,
  Database,
} from 'lucide-react';

interface EnterpriseModulesProps {
  mode: 'scanner' | 'network' | 'timeline' | 'colab' | 'cyber' | 'borders_emea' | 'ross_anderson';
  lang: 'pt' | 'en';
  apiBaseUrl: string;
  onJumpToMap?: (lat: number, lon: number, label: string) => void;
  onJumpToCopilot?: (prompt: string) => void;
}

const PRESET_MANIFESTS = [
  {
    id: 'PRESET_OIL',
    label_pt: '🛢️ Petroleiro MT VOLANS DARK (320k Barris - Subfaturado + 18.5h AIS Off)',
    label_en: '🛢️ Tanker MT VOLANS DARK (320k BBL - Under-Invoiced + 18.5h Dark AIS)',
    payload: {
      commodity_type: 'CRUDE_OIL_2709',
      exporter_name: 'Marítima Petróleo del Sur S.A. (Colón, Panama)',
      importer_name: 'Gulf Horizon Refining LLC',
      person_name: 'Alejandro Ruiz-Velasco',
      asset_id: 'IMO-9283741 / MT VOLANS DARK',
      flag: 'Cameroon',
      origin_port: 'Caribbean STS Zone -> Colón, Panama',
      destination_port: 'Galveston / Houston Lightering Zone, TX',
      declared_units: 320000,
      declared_value_usd: 14080000,
      manifest_weight_kg: 43800000,
      scale_weight_kg: 43984000,
      ais_gap_hours: 18.5,
    },
  },
  {
    id: 'PRESET_SANTOS',
    label_pt: '📦 Contêiner Santos MSCU-908412-0 (Suco de Laranja +1.180kg na Balança)',
    label_en: '📦 Santos Container MSCU-908412-0 (Orange Juice +1,180kg Scale Anomaly)',
    payload: {
      commodity_type: 'CITRUS_PULP_2009',
      exporter_name: 'Exportadora Atlântico Verde Ltda (CNPJ 41.882.901/0001-55)',
      importer_name: 'CaribTrade Logistics Corp (Miami/Panama)',
      person_name: 'Marcos Vinícius Almeida',
      asset_id: 'MSCU-908412-0 / MV SOUTHERN CROSS',
      flag: 'Panama',
      origin_port: 'Port of Santos (SSZ), Brazil',
      destination_port: 'Balboa (PA) -> PortMiami, FL, USA',
      declared_units: 26.4,
      declared_value_usd: 48000,
      manifest_weight_kg: 26400,
      scale_weight_kg: 27580,
      ais_gap_hours: 0.0,
    },
  },
  {
    id: 'PRESET_LAREDO',
    label_pt: '🚛 Caminhão Químico Laredo I-35 (Precursores Sintéticos + Alvo FBI)',
    label_en: '🚛 Laredo I-35 Chemical Truck (Synthetic Precursors + FBI Target)',
    payload: {
      commodity_type: 'INDUSTRIAL_CHEMICALS_2914',
      exporter_name: 'Química Industrial del Pacífico S.A. de C.V.',
      importer_name: 'Alamo Border Freight & Warehousing Inc (USDOT #3910442)',
      person_name: 'Hector Emilio Valenzuela-Garza',
      asset_id: 'TRUCK-TX-881KLP / USDOT-3910442',
      flag: 'Mexico / USA Dual Plate',
      origin_port: 'Port of Manzanillo -> Nuevo Laredo',
      destination_port: 'San Antonio I-35 Hub, TX, USA',
      declared_units: 24,
      declared_value_usd: 19500,
      manifest_weight_kg: 24000,
      scale_weight_kg: 24680,
      ais_gap_hours: 4.0,
    },
  },
  {
    id: 'PRESET_CLEAN',
    label_pt: '✅ Carga Regular Limpa (Exportação Auditada sem Anomalias)',
    label_en: '✅ Clean Compliant Shipment (Verified Normal Trade)',
    payload: {
      commodity_type: 'CITRUS_PULP_2009',
      exporter_name: 'Citrosuco Paulista S.A.',
      importer_name: 'Florida Beverage Bottling Inc.',
      person_name: 'Roberto Carlos Mendes',
      asset_id: 'MAEU-441092-1 / MV ATLANTIC STAR',
      flag: 'United States',
      origin_port: 'Port of Santos, Brazil',
      destination_port: 'Port of Newark, NJ, USA',
      declared_units: 25.0,
      declared_value_usd: 71250,
      manifest_weight_kg: 25000,
      scale_weight_kg: 25015,
      ais_gap_hours: 0.0,
    },
  },
];

export default function EnterpriseModules({
  mode,
  lang,
  apiBaseUrl,
  onJumpToMap,
  onJumpToCopilot,
}: EnterpriseModulesProps) {
  // 1. Scanner State
  const [form, setForm] = useState(PRESET_MANIFESTS[0].payload);
  const [auditResult, setAuditResult] = useState<any>(null);
  const [auditing, setAuditing] = useState(false);

  // 2. Network Graph State
  const [networkChains, setNetworkChains] = useState<any[]>([]);
  const [selectedChainCase, setSelectedChainCase] = useState<string>('ALL');

  // 3. Timeline & Dossier State
  const [timelineCaseId, setTimelineCaseId] = useState<string>('CASE-OIL-2026-01');
  const [timelineData, setTimelineData] = useState<any>(null);

  // 4. Colab Telemetry State
  const [colabData, setColabData] = useState<any>(null);
  const [runningColab, setRunningColab] = useState(false);

  // 5. Cyber & Digital Forensics State
  const [cyberSubTab, setCyberSubTab] = useState<'osint' | 'ot_alerts' | 'custody'>('osint');
  const [cyberForm, setCyberForm] = useState({
    case_id: 'CASE-OIL-2026-01',
    company_domain: 'maritimapetroleo-pa.com',
    manifest_ip: '185.220.101.42',
    pdf_software: 'Adobe Illustrator 2025 (Modified XMP — Caracas/Colón)',
    crypto_wallet: 'TLa2f6VPqDgRE67v1736s7bJ8Ray5wYjU7',
  });
  const [cyberScanResult, setCyberScanResult] = useState<any>(null);
  const [otAlerts, setOtAlerts] = useState<any[]>([]);
  const [custodyData, setCustodyData] = useState<any>(null);

  const runCyberScan = useCallback(
    async (overridePayload?: typeof cyberForm) => {
      const target = overridePayload || cyberForm;
      try {
        const res = await fetch(`${apiBaseUrl}/api/v1/intel/cyber-scan`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(target),
        });
        if (res.ok) {
          const d = await res.json();
          setCyberScanResult(d);
        }
      } catch {}
    },
    [apiBaseUrl, cyberForm]
  );

  const fetchCyberAlertsAndCustody = useCallback(async () => {
    try {
      const [r1, r2] = await Promise.all([
        fetch(`${apiBaseUrl}/api/v1/intel/cyber-alerts`),
        fetch(`${apiBaseUrl}/api/v1/intel/custody-and-stix`),
      ]);
      if (r1.ok) {
        const d1 = await r1.json();
        setOtAlerts(d1.alerts || []);
      }
      if (r2.ok) {
        const d2 = await r2.json();
        setCustodyData(d2);
      }
    } catch {}
  }, [apiBaseUrl]);

  const runManifestAudit = useCallback(
    async (customPayload?: typeof form) => {
      const targetPayload = customPayload || form;
      setAuditing(true);
      try {
        const res = await fetch(`${apiBaseUrl}/api/v1/intel/audit-manifest`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(targetPayload),
        });
        if (res.ok) {
          const data = await res.json();
          setAuditResult(data);
        }
      } catch {}
      setAuditing(false);
    },
    [apiBaseUrl, form]
  );

  const fetchNetwork = useCallback(async () => {
    try {
      const res = await fetch(
        `${apiBaseUrl}/api/v1/intel/corporate-network?case_id=${encodeURIComponent(selectedChainCase)}`
      );
      if (res.ok) {
        const data = await res.json();
        setNetworkChains(data.chains || []);
      }
    } catch {}
  }, [apiBaseUrl, selectedChainCase]);

  const fetchTimeline = useCallback(async () => {
    try {
      const res = await fetch(
        `${apiBaseUrl}/api/v1/intel/cases/${encodeURIComponent(timelineCaseId)}/timeline-and-dossier`
      );
      if (res.ok) {
        const data = await res.json();
        setTimelineData(data);
      }
    } catch {}
  }, [apiBaseUrl, timelineCaseId]);

  const [colabSandboxForm, setColabSandboxForm] = useState({
    ais_gap_hours: 18.0,
    vessel_speed_knots: 1.5,
    flight_altitude_ft: 150.0,
    flight_speed_knots: 165.0,
    cargo_weight_delta_kg: 1420.0,
    corridor_node_idx: 2,
  });
  const [colabSandboxResult, setColabSandboxResult] = useState<any>(null);

  const runColabSandbox = useCallback(
    async (overrideForm?: any) => {
      try {
        const res = await fetch(`${apiBaseUrl}/api/v1/intel/colab-live-sandbox`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(overrideForm || colabSandboxForm),
        });
        if (res.ok) {
          setColabSandboxResult(await res.json());
        }
      } catch {}
    },
    [apiBaseUrl, colabSandboxForm]
  );

  const fetchColabTelemetry = useCallback(async () => {
    setRunningColab(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/intel/colab-telemetry`);
      if (res.ok) {
        const data = await res.json();
        setColabData(data);
      }
      await runColabSandbox();
    } catch {}
    setRunningColab(false);
  }, [apiBaseUrl, runColabSandbox]);

  // 6. Europol, UK, EMEA & Brazil Borders (16,886 km SISFRON) State
  const [bordersEmeaData, setBordersEmeaData] = useState<any>(null);
  const [selectedBorderArc, setSelectedBorderArc] = useState<string>('ALL');
  const [borderVerifyForm, setBorderVerifyForm] = useState({
    sector_id: 'BR-ARCO-SUL-08',
    vehicle_or_tail: 'MERCOSUL-BRA2E19 / Carreta Scania R500',
    document_id: 'MIC-DTA-PY-884120 / NFe-35261141882',
    declared_cargo: 'Soja em Grãos (NCM 1201.90) - 32.000 kg',
    origin_declared: 'Pedro Juan Caballero / Ponta Porã (MS)',
    destination_declared: 'Porto de Paranaguá (PR) -> Antuérpia (BE)',
    lpr_delta_min: 142,
    expected_transit_min: 65,
    seal_id: 'RFB-LACRE-99412-CLONE',
  });
  const [borderVerifyResult, setBorderVerifyResult] = useState<any>(null);
  const [verifyingBorder, setVerifyingBorder] = useState(false);

  const fetchBordersEmea = useCallback(async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/intel/europol-uk-emea-brazil`);
      if (res.ok) {
        setBordersEmeaData(await res.json());
      }
    } catch {}
  }, [apiBaseUrl]);

  const runBrazilBorderVerify = useCallback(
    async (customPayload?: any) => {
      setVerifyingBorder(true);
      try {
        const res = await fetch(`${apiBaseUrl}/api/v1/intel/brazil-border-verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(customPayload || borderVerifyForm),
        });
        if (res.ok) {
          setBorderVerifyResult(await res.json());
        }
      } catch {}
      setVerifyingBorder(false);
    },
    [apiBaseUrl, borderVerifyForm]
  );

  // 7. Ross Anderson Security Engineering Suite State
  const [rossAndersonData, setRossAndersonData] = useState<any>(null);
  const [rossAndersonExecResult, setRossAndersonExecResult] = useState<any>(null);
  const [executingAnderson, setExecutingAnderson] = useState(false);

  const fetchRossAndersonSuite = useCallback(async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/intel/ross-anderson-suite`);
      if (res.ok) {
        setRossAndersonData(await res.json());
      }
    } catch {}
  }, [apiBaseUrl]);

  const executeRossAndersonAction = async (action_type: string, agency: string, target_ref: string) => {
    setExecutingAnderson(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/intel/ross-anderson-execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action_type, agency, target_ref }),
      });
      if (res.ok) {
        setRossAndersonExecResult(await res.json());
      }
    } catch {}
    setExecutingAnderson(false);
  };

  useEffect(() => {
    if (mode === 'scanner' && !auditResult) {
      runManifestAudit(PRESET_MANIFESTS[0].payload);
    } else if (mode === 'network') {
      fetchNetwork();
    } else if (mode === 'timeline') {
      fetchTimeline();
    } else if (mode === 'colab') {
      fetchColabTelemetry();
    } else if (mode === 'cyber') {
      if (!cyberScanResult) runCyberScan();
      fetchCyberAlertsAndCustody();
    } else if (mode === 'borders_emea') {
      fetchBordersEmea();
      fetchRossAndersonSuite();
      if (!borderVerifyResult) runBrazilBorderVerify();
    } else if (mode === 'ross_anderson') {
      fetchRossAndersonSuite();
    }
  }, [
    mode,
    auditResult,
    cyberScanResult,
    borderVerifyResult,
    runManifestAudit,
    fetchNetwork,
    fetchTimeline,
    fetchColabTelemetry,
    runCyberScan,
    fetchCyberAlertsAndCustody,
    fetchBordersEmea,
    runBrazilBorderVerify,
    fetchRossAndersonSuite,
  ]);

  const handleDownloadDossier = () => {
    if (!timelineData?.compliance_dossier) return;
    const blob = new Blob([JSON.stringify(timelineData.compliance_dossier, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${timelineData.compliance_dossier.report_id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ===========================================================================
  // VIEW A: MANIFEST, CARGO, OIL PRICE (TBML) & COLAB ONNX SCANNER
  // ===========================================================================
  if (mode === 'scanner') {
    return (
      <div className="flex-1 overflow-y-auto p-6 bg-slate-950 space-y-5">
        {/* Preset Selector Bar */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <div className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-2.5 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            {lang === 'pt'
              ? 'Cenários Rápidos de Teste (1-Clique) ou Preencha Qualquer Manifesto Abaixo:'
              : 'Quick Test Scenarios (1-Click) or Enter Any Custom Manifest Below:'}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
            {PRESET_MANIFESTS.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setForm(p.payload);
                  runManifestAudit(p.payload);
                }}
                className="text-left p-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/50 text-xs font-medium text-slate-200 transition-all"
              >
                {lang === 'pt' ? p.label_pt : p.label_en}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* LEFT: Interactive Form (5 cols) */}
          <div className="lg:col-span-5 bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-white">
                {lang === 'pt' ? 'Dados do Conhecimento de Embarque (B/L & Invoice)' : 'Bill of Lading & Commercial Invoice Input'}
              </span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-700/50">
                ONNX + OFAC + TBML
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="sm:col-span-2">
                <label className="text-slate-400 block mb-1">
                  {lang === 'pt' ? 'Commodity / Código HS (NCM):' : 'Commodity / HS Code:'}
                </label>
                <select
                  value={form.commodity_type}
                  onChange={(e) => setForm({ ...form, commodity_type: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                >
                  <option value="CRUDE_OIL_2709">🛢️ Crude Oil / Petróleo Bruto (HS 2709.00 — Benchmark: $74/bbl)</option>
                  <option value="CITRUS_PULP_2009">📦 Frozen Orange Juice / Suco Concentrado (HS 2009.11 — Benchmark: $2,850/t)</option>
                  <option value="INDUSTRIAL_CHEMICALS_2914">🧪 Industrial Solvents / Químicos (HS 2914.11 — Benchmark: $1,400/t)</option>
                  <option value="GOLD_ORE_7108">🪙 Gold / Precious Bulk / Ouro (HS 7108 — Benchmark: $82,000/kg)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">
                  {lang === 'pt' ? 'Beneficiário Final / Operador (Pessoa):' : 'Beneficial Owner / Person:'}
                </label>
                <input
                  type="text"
                  value={form.person_name}
                  onChange={(e) => setForm({ ...form, person_name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">
                  {lang === 'pt' ? 'Navio IMO / Contêiner / Placa:' : 'Vessel IMO / Container / Truck ID:'}
                </label>
                <input
                  type="text"
                  value={form.asset_id}
                  onChange={(e) => setForm({ ...form, asset_id: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">
                  {lang === 'pt' ? 'Empresa Exportadora (CNPJ/RUC):' : 'Exporter Company:'}
                </label>
                <input
                  type="text"
                  value={form.exporter_name}
                  onChange={(e) => setForm({ ...form, exporter_name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">
                  {lang === 'pt' ? 'Empresa Importadora / Consignatário:' : 'Importer / Consignee:'}
                </label>
                <input
                  type="text"
                  value={form.importer_name}
                  onChange={(e) => setForm({ ...form, importer_name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">
                  {lang === 'pt' ? 'Quantidade Declarada (Barris/Ton):' : 'Declared Quantity (BBL/Tons):'}
                </label>
                <input
                  type="number"
                  value={form.declared_units}
                  onChange={(e) => setForm({ ...form, declared_units: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">
                  {lang === 'pt' ? 'Valor Total Declarado na Invoice (USD):' : 'Declared Invoice Value (USD):'}
                </label>
                <input
                  type="number"
                  value={form.declared_value_usd}
                  onChange={(e) => setForm({ ...form, declared_value_usd: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">
                  {lang === 'pt' ? 'Peso no Manifesto (kg):' : 'Manifest Weight (kg):'}
                </label>
                <input
                  type="number"
                  value={form.manifest_weight_kg}
                  onChange={(e) => setForm({ ...form, manifest_weight_kg: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">
                  {lang === 'pt' ? 'Peso Real na Balança / Calado (kg):' : 'Measured Scale / Draft Weight (kg):'}
                </label>
                <input
                  type="number"
                  value={form.scale_weight_kg}
                  onChange={(e) => setForm({ ...form, scale_weight_kg: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">
                  {lang === 'pt' ? 'Horas de Apagão AIS/GPS (Dark Ship):' : 'AIS/GPS Dark Gap (Hours):'}
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={form.ais_gap_hours}
                  onChange={(e) => setForm({ ...form, ais_gap_hours: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">
                  {lang === 'pt' ? 'Bandeira / Jurisdição do Ativo:' : 'Vessel Flag / Jurisdiction:'}
                </label>
                <input
                  type="text"
                  value={form.flag}
                  onChange={(e) => setForm({ ...form, flag: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                />
              </div>
            </div>

            <button
              onClick={() => runManifestAudit()}
              disabled={auditing}
              className="w-full py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all"
            >
              <Play className="w-4 h-4" />
              {auditing
                ? lang === 'pt'
                  ? 'Auditando via ONNX + OFAC + TBML...'
                  : 'Running ONNX + OFAC + TBML Audit...'
                : lang === 'pt'
                ? 'Executar Auditoria Completa (Sanções + Preço + Balança + ONNX Colab)'
                : 'Run Full Forensic Audit (Sanctions + TBML Price + Scale + Colab ONNX)'}
            </button>
          </div>

          {/* RIGHT: Forensic Diagnostic Results (7 cols) */}
          <div className="lg:col-span-7 bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-4">
            {auditResult && (
              <>
                {/* Top Verdict Banner */}
                <div
                  className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    auditResult.composite_risk_score >= 0.8
                      ? 'bg-red-950/35 border-red-500/60'
                      : auditResult.composite_risk_score >= 0.55
                      ? 'bg-amber-950/35 border-amber-500/60'
                      : 'bg-emerald-950/35 border-emerald-500/60'
                  }`}
                >
                  <div>
                    <div className="text-[10px] font-mono uppercase text-slate-400">
                      {auditResult.audit_id} • {auditResult.timestamp}
                    </div>
                    <div className="text-base font-bold text-white mt-0.5">
                      {lang === 'pt' ? 'Veredito da Auditoria:' : 'Audit Verdict:'}{' '}
                      <span
                        className={
                          auditResult.composite_risk_score >= 0.8
                            ? 'text-red-400'
                            : auditResult.composite_risk_score >= 0.55
                            ? 'text-amber-300'
                            : 'text-emerald-400'
                        }
                      >
                        {auditResult.verdict}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase text-slate-400">
                      {lang === 'pt' ? 'Score Composto (Regras + ONNX)' : 'Composite Risk Score'}
                    </div>
                    <div className="text-2xl font-mono font-extrabold text-white">
                      {(auditResult.composite_risk_score * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>

                {/* 4 Forensic Pillar Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {/* Pillar 1: Sanctions */}
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
                    <div className="font-bold text-red-400 uppercase mb-2 flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4" />
                      {lang === 'pt' ? '1. Checagem OFAC SDN / FBI / Interpol' : '1. OFAC SDN / FBI / Interpol Screening'}
                    </div>
                    <div className="text-slate-300">
                      Status:{' '}
                      <strong
                        className={
                          auditResult.sanctions_check.status === 'MATCH_FOUND'
                            ? 'text-red-400'
                            : 'text-emerald-400'
                        }
                      >
                        {auditResult.sanctions_check.status}
                      </strong>
                    </div>
                    {auditResult.sanctions_check.hits.length > 0 ? (
                      <ul className="mt-2 space-y-1 text-[11px] text-red-300">
                        {auditResult.sanctions_check.hits.map((h: string, i: number) => (
                          <li key={i}>🚨 {h}</li>
                        ))}
                      </ul>
                    ) : (
                      <div className="mt-2 text-[11px] text-emerald-400">
                        ✅ {lang === 'pt' ? 'Nenhuma restrição encontrada nas listas.' : 'No watchlist matches found.'}
                      </div>
                    )}
                  </div>

                  {/* Pillar 2: TBML Financial Price Audit */}
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
                    <div className="font-bold text-amber-400 uppercase mb-2 flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4" />
                      {lang === 'pt'
                        ? '2. Auditoria de Preço & Lavagem (TBML)'
                        : '2. Price Benchmark & TBML Audit'}
                    </div>
                    <div className="space-y-1 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-slate-400">
                          {lang === 'pt' ? 'Preço Unitário Declarado:' : 'Declared Unit Price:'}
                        </span>
                        <span className="font-mono text-white">
                          ${auditResult.tbml_financial_audit.declared_unit_price_usd} USD
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">
                          {lang === 'pt' ? 'Preço Internacional (Benchmark):' : 'Market Benchmark Price:'}
                        </span>
                        <span className="font-mono text-cyan-300">
                          ${auditResult.tbml_financial_audit.benchmark_unit_price_usd} USD
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">
                          {lang === 'pt' ? 'Desvio / Subfaturamento:' : 'Price Deviation:'}
                        </span>
                        <span className="font-mono font-bold text-red-400">
                          {auditResult.tbml_financial_audit.price_deviation_pct}% ($
                          {auditResult.tbml_financial_audit.estimated_tbml_gap_usd.toLocaleString()} USD)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Pillar 3: Weighbridge & AIS Physical Forensics */}
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
                    <div className="font-bold text-purple-400 uppercase mb-2 flex items-center gap-1.5">
                      <Scale className="w-4 h-4" />
                      {lang === 'pt'
                        ? '3. Forense Física (Balança, Calado & AIS)'
                        : '3. Physical Scale & AIS Telemetry'}
                    </div>
                    <div className="space-y-1 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-slate-400">
                          {lang === 'pt' ? 'Diferença na Balança/Calado:' : 'Weighbridge Discrepancy:'}
                        </span>
                        <span className="font-mono font-bold text-amber-300">
                          {auditResult.physical_forensics.weight_discrepancy_kg >= 0 ? '+' : ''}
                          {auditResult.physical_forensics.weight_discrepancy_kg.toLocaleString()} kg
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">
                          {lang === 'pt' ? 'Tempo de Apagão AIS/GPS:' : 'AIS/GPS Dark Gap:'}
                        </span>
                        <span className="font-mono font-bold text-red-400">
                          {auditResult.physical_forensics.ais_dark_gap_hours} h
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Pillar 4: Real Colab ONNX Neural Scores */}
                  <div className="bg-slate-950 border border-cyan-500/40 rounded-xl p-3.5">
                    <div className="font-bold text-cyan-400 uppercase mb-2 flex items-center gap-1.5">
                      <Cpu className="w-4 h-4" />
                      {lang === 'pt'
                        ? '4. Inferência Neural Ao Vivo (Colab ONNX)'
                        : '4. Live Colab ONNX Neural Scoring'}
                    </div>
                    <div className="space-y-1 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-slate-400">maritime_lstm.onnx:</span>
                        <span className="font-mono font-bold text-cyan-300">
                          {(auditResult.colab_onnx_scores.maritime_lstm_onnx_score * 100).toFixed(1)}% Risk
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">narcotics_stgnn.onnx:</span>
                        <span className="font-mono font-bold text-purple-300">
                          {(auditResult.colab_onnx_scores.narcotics_stgnn_onnx_score * 100).toFixed(1)}% Risk
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-500 pt-1">
                        Source: {auditResult.colab_onnx_scores.weights_source}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Findings List */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
                  <div className="text-xs font-bold uppercase text-white mb-2">
                    {lang === 'pt' ? 'Anomalias e Provas Detectadas:' : 'Detected Forensic Anomalies:'}
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-200">
                    {auditResult.findings.map((f: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-red-400 font-bold">•</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ===========================================================================
  // VIEW B: CORPORATE NETWORK & UBO SHELL COMPANY GRAPH
  // ===========================================================================
  if (mode === 'network') {
    return (
      <div className="flex-1 overflow-y-auto p-6 bg-slate-950 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Network className="w-4 h-4 text-cyan-400" />
              {lang === 'pt'
                ? 'Rastreamento de Rede Societária, Offshores e Beneficiários Finais (UBO)'
                : 'Corporate Shell Network & Ultimate Beneficial Owner (UBO) Discovery'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {lang === 'pt'
                ? 'Desmascara as camadas de empresas de fachada (Panamá, Ilhas Marshall, Santos, Miami) entre a Pessoa Listada e o Navio/Carga.'
                : 'Uncovers multi-jurisdiction shell company layers connecting Sanctioned Individuals to Physical Cargo & Vessels.'}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {['ALL', 'CASE-OIL-2026-01', 'CASE-CARGO-2026-02', 'CASE-TRANS-2026-03'].map((cid) => (
              <button
                key={cid}
                onClick={() => setSelectedChainCase(cid)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  selectedChainCase === cid
                    ? 'bg-cyan-500 text-slate-950'
                    : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                }`}
              >
                {cid === 'ALL' ? (lang === 'pt' ? 'Todas as Redes' : 'All Networks') : cid}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {networkChains.map((chain) => (
            <div
              key={chain.case_id}
              className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                    {chain.case_id}
                  </span>
                  <span className="text-sm font-bold text-white">
                    👤 UBO: {chain.ubo_name}
                  </span>
                </div>
                <span className="text-xs px-2.5 py-0.5 rounded bg-red-500/15 border border-red-500/40 text-red-300 font-semibold">
                  {chain.ubo_list}
                </span>
              </div>

              {/* 5-Layer Ownership Chain */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5">
                {chain.ownership_hops.map((hop: any, idx: number) => (
                  <div
                    key={idx}
                    className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col justify-between relative"
                  >
                    <div>
                      <div className="text-[10px] font-bold uppercase text-cyan-400 mb-1">
                        {hop.layer}
                      </div>
                      <div className="text-xs font-bold text-white">{hop.entity}</div>
                      <div className="text-[11px] text-amber-300 mt-0.5">{hop.jurisdiction}</div>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-800/80">
                      {hop.detail}
                    </div>
                  </div>
                ))}
              </div>

              {/* Shared Corporate Red Flags */}
              <div className="bg-red-950/25 border border-red-500/30 rounded-lg p-2.5 flex flex-wrap gap-3 text-xs text-red-200">
                {chain.shared_red_flags.map((rf: string, i: number) => (
                  <span key={i} className="flex items-center gap-1.5">
                    🚩 <strong>Red Flag Societária:</strong> {rf}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ===========================================================================
  // VIEW C: VOYAGE REPLAY TIMELINE & OFFICIAL COAF / FINCEN DOSSIER EXPORT
  // ===========================================================================
  if (mode === 'timeline') {
    return (
      <div className="flex-1 overflow-y-auto p-6 bg-slate-950 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              {lang === 'pt'
                ? 'Linha do Tempo de Reconstrução da Viagem & Dossiê Oficial COAF / FinCEN / OFAC'
                : 'Step-by-Step Voyage Replay Timeline & Exportable FinCEN / COAF Dossier'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {lang === 'pt'
                ? 'Reconstrução cronológica de cada sensor (AIS, Balança Portuária, Satélite SAR, ONNX Colab) e exportação formal.'
                : 'Chronological multi-sensor reconstruction and formal law-enforcement compliance report.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {['CASE-OIL-2026-01', 'CASE-CARGO-2026-02'].map((cid) => (
              <button
                key={cid}
                onClick={() => setTimelineCaseId(cid)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  timelineCaseId === cid
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                }`}
              >
                {cid}
              </button>
            ))}
            <button
              onClick={handleDownloadDossier}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow"
            >
              <Download className="w-3.5 h-3.5" />
              {lang === 'pt' ? 'Baixar Dossiê COAF/FinCEN (.JSON)' : 'Export FinCEN/COAF Dossier (.JSON)'}
            </button>
          </div>
        </div>

        {timelineData && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Step-by-step timeline (7 cols) */}
            <div className="lg:col-span-7 bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="text-xs font-bold uppercase text-amber-400 mb-2">
                {lang === 'pt' ? 'Cronologia Auditada dos Eventos (Hora a Hora)' : 'Chronological Multi-Sensor Event Replay'}
              </div>
              <div className="space-y-3">
                {timelineData.timeline.map((item: any) => (
                  <div
                    key={item.step}
                    className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-3"
                  >
                    <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center justify-center shrink-0">
                      0{item.step}
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-400">
                        <span>{item.time}</span>
                        <span className="text-cyan-400">{item.sensor}</span>
                      </div>
                      <div className="text-xs font-bold text-white mt-0.5">📍 {item.location}</div>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">{item.event}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Official Compliance Report Preview (5 cols) */}
            <div className="lg:col-span-5 bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3">
                <span className="text-xs font-bold uppercase text-emerald-400">
                  {lang === 'pt' ? 'Relatório Oficial SAR / COAF / FinCEN 314(a)' : 'Official SAR / FinCEN 314(a) Report'}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {timelineData.compliance_dossier.report_id}
                </span>
              </div>
              <pre className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-3 text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-[520px]">
                {JSON.stringify(timelineData.compliance_dossier, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ===========================================================================
  // VIEW E: CYBERSECURITY, DIGITAL OSINT, PORT OT INTRUSION & SHA-256 / STIX 2.1
  // ===========================================================================
  if (mode === 'cyber') {
    const handleDownloadStix = () => {
      if (!custodyData?.stix2_bundle) return;
      const blob = new Blob([JSON.stringify(custodyData.stix2_bundle, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'frontier-os-stix2-threat-intel-bundle.json';
      a.click();
      URL.revokeObjectURL(url);
    };

    return (
      <div className="flex-1 overflow-y-auto p-6 bg-slate-950 space-y-5">
        {/* Sub-Navigation Pills for the 3 Cyber Tools */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 border border-slate-800 rounded-xl p-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setCyberSubTab('osint')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                cyberSubTab === 'osint'
                  ? 'bg-cyan-500 text-slate-950 shadow'
                  : 'bg-slate-950 text-slate-300 border border-slate-800 hover:text-white'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              {lang === 'pt'
                ? '1. Scanner OSINT de Empresas, PDF Falso & Cripto OFAC'
                : '1. Shell Domain OSINT, PDF Forensics & OFAC Crypto'}
            </button>
            <button
              onClick={() => {
                setCyberSubTab('ot_alerts');
                fetchCyberAlertsAndCustody();
              }}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                cyberSubTab === 'ot_alerts'
                  ? 'bg-rose-500 text-slate-950 shadow'
                  : 'bg-slate-950 text-slate-300 border border-slate-800 hover:text-white'
              }`}
            >
              <Radio className="w-4 h-4" />
              {lang === 'pt'
                ? '2. Detector de Ataques Portuários (TOS/RFID) & Spoofing AIS'
                : '2. Port OT/RFID Intrusion & AIS/GNSS Spoofing'}
            </button>
            <button
              onClick={() => {
                setCyberSubTab('custody');
                fetchCyberAlertsAndCustody();
              }}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                cyberSubTab === 'custody'
                  ? 'bg-emerald-500 text-slate-950 shadow'
                  : 'bg-slate-950 text-slate-300 border border-slate-800 hover:text-white'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              {lang === 'pt'
                ? '3. Cadeia de Custódia SHA-256 & Exportação STIX 2.1 (OpenCTI)'
                : '3. SHA-256 Chain of Custody & STIX 2.1 Export'}
            </button>
          </div>
        </div>

        {/* SUB-TAB 1: DIGITAL FRAUD, DOMAIN OSINT, PDF FORENSICS & CRYPTO */}
        {cyberSubTab === 'osint' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-5 bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="text-xs font-bold uppercase text-cyan-400 border-b border-slate-800 pb-2">
                {lang === 'pt'
                  ? 'Auditoria Cibernética (SpiderFoot + Shodan + YARA + GraphSense)'
                  : 'Digital Footprint & Blockchain Forensics Input'}
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">
                    {lang === 'pt' ? 'Domínio da Empresa Exportadora/Importadora (WHOIS/SSL):' : 'Company Domain (WHOIS/SSL):'}
                  </label>
                  <input
                    type="text"
                    value={cyberForm.company_domain}
                    onChange={(e) => setCyberForm({ ...cyberForm, company_domain: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">
                    {lang === 'pt' ? 'Endereço IP que Registrou o Manifesto (Shodan/ASN):' : 'Manifest Submission IP (Shodan/ASN):'}
                  </label>
                  <input
                    type="text"
                    value={cyberForm.manifest_ip}
                    onChange={(e) => setCyberForm({ ...cyberForm, manifest_ip: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">
                    {lang === 'pt' ? 'Assinatura de Metadados do PDF (ExifTool / YARA):' : 'Document PDF Exif/XMP Metadata:'}
                  </label>
                  <input
                    type="text"
                    value={cyberForm.pdf_software}
                    onChange={(e) => setCyberForm({ ...cyberForm, pdf_software: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">
                    {lang === 'pt' ? 'Carteira Cripto de Liquidação (USDT TRC-20 / ERC-20):' : 'Settlement Crypto Wallet (USDT/ETH):'}
                  </label>
                  <input
                    type="text"
                    value={cyberForm.crypto_wallet}
                    onChange={(e) => setCyberForm({ ...cyberForm, crypto_wallet: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <button
                onClick={() => runCyberScan()}
                className="w-full py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg"
              >
                <Play className="w-4 h-4" />
                {lang === 'pt'
                  ? 'Executar Varredura Cyber OSINT, YARA & Blockchain'
                  : 'Run Cyber OSINT, YARA & Blockchain Scan'}
              </button>
            </div>

            <div className="lg:col-span-7 bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-3">
              {cyberScanResult && (
                <>
                  <div className="p-3.5 rounded-xl bg-red-950/35 border border-red-500/50 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-mono text-slate-400">
                        {cyberScanResult.scan_id} • {cyberScanResult.timestamp}
                      </div>
                      <div className="text-sm font-bold text-red-300 mt-0.5">{cyberScanResult.verdict}</div>
                    </div>
                    <div className="text-2xl font-mono font-extrabold text-white">
                      {(cyberScanResult.composite_cyber_risk * 100).toFixed(1)}%
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1">
                      <div className="font-bold text-cyan-400 uppercase">🌐 SpiderFoot / WHOIS / SSL OSINT</div>
                      <div>
                        Domain Age: <strong className="text-red-400">{cyberScanResult.domain_osint.whois_age_days} days old</strong>
                      </div>
                      <div>Registrar: {cyberScanResult.domain_osint.registrar}</div>
                      <div className="text-[11px] text-amber-300">
                        Shared SSL Cert: {(cyberScanResult.domain_osint.ssl_shared_with_sanctioned || []).join(', ') || 'None'}
                      </div>
                    </div>

                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1">
                      <div className="font-bold text-purple-400 uppercase">📡 Shodan / ASN Network Recon</div>
                      <div>
                        IP: <strong className="font-mono text-white">{cyberScanResult.network_ip_intel.manifest_submission_ip}</strong>
                      </div>
                      <div>ASN: {cyberScanResult.network_ip_intel.asn_org}</div>
                      <div className="text-[11px] text-red-300">{cyberScanResult.network_ip_intel.reputation}</div>
                    </div>

                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1">
                      <div className="font-bold text-amber-400 uppercase">📄 ExifTool & YARA PDF Forensics</div>
                      <div className="text-slate-300">{cyberScanResult.document_pdf_forensics.software_signature}</div>
                      <div className="text-[11px] font-mono text-red-400">
                        {cyberScanResult.document_pdf_forensics.yara_verdict}
                      </div>
                    </div>

                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1">
                      <div className="font-bold text-emerald-400 uppercase">₿ OFAC Crypto & Mixer Forensics</div>
                      <div className="font-mono text-[11px] text-white truncate">
                        {cyberScanResult.blockchain_forensics.wallet_address}
                      </div>
                      <div className="text-[11px] text-red-300">
                        {cyberScanResult.blockchain_forensics.mixer_or_otc_exposure}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* SUB-TAB 2: PORT OT/RFID & MARITIME AIS SPOOFING ALERTS */}
        {cyberSubTab === 'ot_alerts' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {otAlerts.map((alert: any) => (
              <div
                key={alert.cyber_alert_id}
                className="bg-slate-900/70 border border-rose-500/40 rounded-xl p-4 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800">
                    {alert.cyber_alert_id} • {alert.category}
                  </span>
                  <span className="text-xs font-mono text-cyan-300">{alert.case_id}</span>
                </div>
                <h3 className="text-sm font-bold text-white">{alert.title}</h3>
                <div className="text-xs text-amber-300 font-mono">
                  🛠️ Sensor: {alert.detector_tool}
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{alert.technical_detail}</p>
                <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-500/30 text-xs text-emerald-200">
                  <strong>🛡️ Resposta / Mitigação Automática:</strong> {alert.mitigation}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* SUB-TAB 3: SHA-256 TAMPER-PROOF CHAIN OF CUSTODY & STIX 2.1 EXPORT */}
        {cyberSubTab === 'custody' && custodyData && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-7 bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div>
                  <span className="text-xs font-bold uppercase text-emerald-400 block">
                    🔐 Cadeia de Custódia Imutável (SHA-256 Hash Chain)
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Garante que nenhuma prova, pesagem de balança ou ordem de interdição possa ser adulterada.
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono text-xs font-bold">
                  {custodyData.total_blocks} BLOCKS VERIFIED
                </span>
              </div>

              <div className="space-y-2.5 max-h-[500px] overflow-y-auto">
                {custodyData.custody_chain.map((blk: any) => (
                  <div
                    key={blk.block_index}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between font-mono text-[11px]">
                      <span className="text-cyan-400 font-bold">
                        BLOCK #{blk.block_index} • {blk.event_type}
                      </span>
                      <span className="text-emerald-400">{blk.integrity}</span>
                    </div>
                    <div className="text-slate-200 font-medium">{blk.evidence_summary}</div>
                    <div className="text-[10px] font-mono text-slate-500 truncate">
                      Prev: {blk.prev_hash}
                    </div>
                    <div className="text-[10px] font-mono text-emerald-300 truncate">
                      SHA256: {blk.block_hash}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5 bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3">
                <span className="text-xs font-bold uppercase text-cyan-400">
                  🕸️ OASIS STIX 2.1 Threat Intel (OpenCTI / MISP)
                </span>
                <button
                  onClick={handleDownloadStix}
                  className="px-3 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  STIX 2.1 (.JSON)
                </button>
              </div>
              <pre className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-3 text-[11px] font-mono text-cyan-300 overflow-x-auto max-h-[480px]">
                {JSON.stringify(custodyData.stix2_bundle, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ===========================================================================
  // ===========================================================================
  // VIEW F: BRAZIL BORDERS (16,886 KM SISFRON) + EUROPOL + UK NCA/OFSI + EMEA
  // ===========================================================================
  if (mode === 'borders_emea') {
    const sectors = (bordersEmeaData?.brazil_border_sectors || []).filter(
      (s: any) => selectedBorderArc === 'ALL' || s.arc === selectedBorderArc
    );
    const emeaFeeds = bordersEmeaData?.europol_uk_emea_feeds || [];

    return (
      <div className="flex-1 overflow-y-auto p-6 bg-slate-950 space-y-6">
        {/* Header Banner */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider">
              <Radio className="w-4 h-4" />
              {lang === 'pt'
                ? 'FRONTEIRAS DO BRASIL (16.886 KM / 10 PAÍSES / SISFRON) + EUROPOL + REINO UNIDO (NCA/OFSI) + ÁFRICA & ORIENTE MÉDIO'
                : 'BRAZIL BORDERS (16,886 KM / 10 COUNTRIES / SISFRON) + EUROPOL + UK (NCA/OFSI) + AFRICA & MIDDLE EAST'}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {lang === 'pt'
                ? 'Rastreamento integrado desde a fronteira terrestre/fluvial brasileira (Arco Norte, Central e Sul), passando pelo corredor atlântico da África Ocidental (Highway 10) até Antuérpia/Roterdã (Europol), Londres/BVI (UK NCA/OFSI) e Dubai/Fujairah (Oriente Médio).'
                : 'End-to-end tracking from Brazil land/riverine borders through West Africa (Highway 10) to Antwerp/Rotterdam (Europol), London/BVI (UK NCA/OFSI), and Dubai/Fujairah (Middle East).'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-mono">
            <span className="px-2.5 py-1 rounded bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-bold">
              🇧🇷 16.886 km (10 Países)
            </span>
            <span className="px-2.5 py-1 rounded bg-blue-500/15 border border-blue-500/40 text-blue-300 font-bold">
              🇪🇺 Europol ENFAST + MAOC-N
            </span>
            <span className="px-2.5 py-1 rounded bg-purple-500/15 border border-purple-500/40 text-purple-300 font-bold">
              🇬🇧 UK NCA + HM Treasury OFSI
            </span>
            <span className="px-2.5 py-1 rounded bg-amber-500/15 border border-amber-500/40 text-amber-300 font-bold">
              🌍 Highway 10 (África) + 🇦🇪 Dubai DMCC
            </span>
          </div>
        </div>

        {/* SECTION 1: EUROPOL, UK NCA/OFSI, WEST AFRICA & MIDDLE EAST ACTIVE FEEDS */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" />
            {lang === 'pt'
              ? '1. Inteligência Transcontinental Ativa: Europol (UE), Reino Unido (NCA/OFSI), África Ocidental & Oriente Médio'
              : '1. Active Transcontinental Intelligence: Europol (EU), United Kingdom (NCA/OFSI), West Africa & Middle East'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {emeaFeeds.map((f: any) => (
              <div
                key={f.feed_id}
                className="bg-slate-900/75 border border-slate-800 hover:border-cyan-500/50 rounded-xl p-4 space-y-2.5 transition-all"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-700/50">
                    {f.agency}
                  </span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/40">
                    {(f.risk_score * 100).toFixed(0)}% RISCO
                  </span>
                </div>
                <div className="text-sm font-bold text-white">{f.hub}</div>
                <div className="text-xs text-amber-300 font-medium">🎯 Alvo: {f.target_name}</div>
                <div className="text-[11px] text-slate-300 leading-relaxed">
                  {lang === 'pt' ? f.modus_operandi_pt : f.modus_operandi}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800 text-[11px]">
                  <span className="text-emerald-400 font-mono font-semibold">{f.seizure_metric}</span>
                  {onJumpToMap && (
                    <button
                      onClick={() => onJumpToMap(f.latitude, f.longitude, f.hub)}
                      className="px-2.5 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-bold text-[10px]"
                    >
                      📍 Voar no Mapa ({f.region})
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 2: DETAILED BRAZILIAN BORDERS (ARCO NORTE, ARCO CENTRAL, ARCO SUL) */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
              <Layers className="w-4 h-4" />
              {lang === 'pt'
                ? '2. Setores Táticos das Fronteiras do Brasil (SISFRON / PF / PRF / Receita Federal / FAB)'
                : '2. Brazilian Border Tactical Sectors (SISFRON / Federal Police / Customs / Air Force)'}
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'ALL', label: 'Todos os 3 Arcos (9 Setores)' },
                { id: 'ARCO_NORTE', label: '🌲 Arco Norte (Amazônia / Guianas / UE)' },
                { id: 'ARCO_CENTRAL', label: '🐊 Arco Central (Bolívia / Pantanal / Rota Caipira)' },
                { id: 'ARCO_SUL', label: '⚡ Arco Sul (Ponta Porã / Foz / Tríplice Fronteira)' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedBorderArc(tab.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                    selectedBorderArc === tab.id
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {sectors.map((sec: any) => (
              <div
                key={sec.sector_id}
                className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between space-y-2.5"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-700/40">
                      {sec.sector_id}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-rose-400">
                      {(sec.risk_score * 100).toFixed(0)}% RISCO
                    </span>
                  </div>
                  <div className="text-xs font-bold text-white leading-snug">{sec.name}</div>
                  <div className="text-[11px] text-cyan-300 font-mono">🛣️ Gargalo: {sec.chokepoint}</div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">{sec.primary_threats}</p>
                </div>

                <div className="pt-2 border-t border-slate-800/80 space-y-2">
                  <div className="text-[10px] text-slate-400">
                    <strong className="text-amber-300">Sensores Ativos:</strong> {sec.active_sensors}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => {
                        const presetPayload = {
                          sector_id: sec.sector_id,
                          vehicle_or_tail:
                            sec.arc === 'ARCO_NORTE'
                              ? 'Cessna 208 Caravan (Prefixo Clonado PT-KJM)'
                              : 'Bitrem Scania R500 (Placa MERCOSUL-BRA2E19)',
                          document_id:
                            sec.arc === 'ARCO_NORTE'
                              ? 'ANM-DOF-RR-4419-FAKE'
                              : 'MIC-DTA-PY-884120 / NFe-35261141882',
                          declared_cargo:
                            sec.arc === 'ARCO_NORTE'
                              ? 'Lote 640 kg Ouro Doré declarado como Liga de Cobre'
                              : 'Soja em Grãos (NCM 1201.90) - 32.000 kg',
                          origin_declared: sec.name,
                          destination_declared:
                            sec.arc === 'ARCO_NORTE'
                              ? 'Georgetown / Paramaribo -> Dubai DMCC'
                              : 'Porto de Paranaguá / Santos -> Antuérpia (Europol)',
                          lpr_delta_min: 148,
                          expected_transit_min: 62,
                          seal_id: 'RFB-LACRE-99412-CLONE',
                        };
                        setBorderVerifyForm(presetPayload);
                        runBrazilBorderVerify(presetPayload);
                      }}
                      className="px-2.5 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold"
                    >
                      🔍 Auditar Cruzamento Neste Setor
                    </button>
                    {onJumpToMap && (
                      <button
                        onClick={() => onJumpToMap(sec.latitude, sec.longitude, sec.name)}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[10px] font-bold"
                      >
                        📍 Mapa
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 3: FUNCTIONAL SISFRON + PRF LPR + RECEITA FEDERAL + ANAC RAB BORDER VERIFIER */}
        <div className="bg-slate-900/80 border border-cyan-500/40 rounded-xl p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                {lang === 'pt'
                  ? '3. Verificador Operacional de Fronteira (SISFRON + PRF OCR/Tacógrafo + Receita Federal MIC-DTA/Lacre + ANAC RAB)'
                  : '3. Operational Border Crossing Verifier (SISFRON + Highway LPR/Tachograph + Customs E-Seal + Aviation RAB)'}
              </h3>
              <p className="text-xs text-slate-400">
                {lang === 'pt'
                  ? 'Ferramenta prática de fiscalização: cruza tempo físico entre pórticos LPR da PRF com o tacógrafo digital, valida assinatura criptográfica do lacre aduaneiro (RFB) e detecta aeronaves com prefixo RAB clonado.'
                  : 'Practical inspection tool: cross-checks highway LPR transit physics against digital tachographs, validates RFID customs seals, and detects cloned aircraft tail numbers.'}
              </p>
            </div>
            <button
              onClick={() => runBrazilBorderVerify()}
              disabled={verifyingBorder}
              className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md"
            >
              {verifyingBorder ? 'Verificando Sensores...' : '⚡ Executar Perícia de Fronteira'}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div className="sm:col-span-2">
                <label className="text-slate-400 block mb-1">Placa Mercosul / Prefixo Aeronave RAB:</label>
                <input
                  value={borderVerifyForm.vehicle_or_tail}
                  onChange={(e) => setBorderVerifyForm({ ...borderVerifyForm, vehicle_or_tail: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Documento (MIC-DTA / NF-e / DOF):</label>
                <input
                  value={borderVerifyForm.document_id}
                  onChange={(e) => setBorderVerifyForm({ ...borderVerifyForm, document_id: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">ID do Lacre Eletrônico RFB:</label>
                <input
                  value={borderVerifyForm.seal_id}
                  onChange={(e) => setBorderVerifyForm({ ...borderVerifyForm, seal_id: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Tempo Medido Pórticos PRF (min):</label>
                <input
                  type="number"
                  value={borderVerifyForm.lpr_delta_min}
                  onChange={(e) => setBorderVerifyForm({ ...borderVerifyForm, lpr_delta_min: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Tempo Físico Esperado (min):</label>
                <input
                  type="number"
                  value={borderVerifyForm.expected_transit_min}
                  onChange={(e) =>
                    setBorderVerifyForm({ ...borderVerifyForm, expected_transit_min: Number(e.target.value) })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                />
              </div>
            </div>

            <div className="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
              {borderVerifyResult && (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
                    <div>
                      <span className="text-[10px] font-mono text-cyan-400 block">{borderVerifyResult.route}</span>
                      <span className="text-sm font-bold text-white">{borderVerifyResult.verdict}</span>
                    </div>
                    <span className="px-3 py-1 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 font-mono font-bold text-xs">
                      SCORE: {(borderVerifyResult.risk_score * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="space-y-2">
                    {borderVerifyResult.red_flags?.map((rf: any, idx: number) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-red-950/30 border border-red-500/30 text-xs">
                        <div className="font-bold text-red-300 mb-0.5">⚠️ {rf.layer}</div>
                        <div className="text-slate-300 text-[11px]">{rf.detail}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 4: INTEGRATED SECURITY ENGINEERING IN CONTEXT (MULTILATERAL CO-SIGNING & ANTI-LEAK CANARY) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-slate-900/75 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="text-xs font-bold uppercase text-cyan-400">
              4. Co-Assinatura Conjunta Inter-Agências (PF Brasil + Europol + UK NCA) — Anti-Vazamento
            </div>
            <p className="text-xs text-slate-300">
              O alvo exato da operação transatlântica fica criptografado (compartimentado) até que 3 das 4 agências co-assinem a ordem, impedindo vazamento prévio em terminais portuários locais.
            </p>
            {rossAndersonData?.multilateral_security?.active_warrants?.map((w: any) => (
              <div key={w.warrant_id} className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-2 text-xs">
                <div className="font-bold text-white">{w.operation_codename}</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {w.custodian_shares.map((s: any) => (
                    <div key={s.share_id} className="flex items-center justify-between bg-slate-900 px-2 py-1 rounded text-[11px]">
                      <span className="text-slate-300 truncate">{s.agency.split(' (')[0]}</span>
                      <span className={s.status === 'SIGNED' ? 'text-emerald-400 font-mono font-bold' : 'text-amber-300 font-mono'}>
                        {s.status === 'SIGNED' ? '✓ ASSINADO' : 'PENDENTE'}
                      </span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => executeRossAndersonAction('CO_SIGN_WARRANT', 'UK_NCA', w.warrant_id)}
                  disabled={executingAnderson}
                  className="w-full py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs"
                >
                  🔐 Co-Assinar Ordem Conjunta (PF + Europol + UK NCA) e Deslacrar Cais de Abordagem
                </button>
              </div>
            ))}
            {rossAndersonExecResult?.unsealed_intelligence && (
              <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-xs space-y-1">
                <div className="font-bold text-emerald-300">✅ Quorum 3-de-4 Atingido — Dados Deslacrados:</div>
                <div className="text-slate-200">🎯 <strong>Alvo:</strong> {rossAndersonExecResult.unsealed_intelligence.target_container}</div>
                <div className="text-slate-200">⚓ <strong>Local:</strong> {rossAndersonExecResult.unsealed_intelligence.exact_interception_quay}</div>
                <div className="text-slate-200">🚐 <strong>Célula:</strong> {rossAndersonExecResult.unsealed_intelligence.extraction_cell_vehicles}</div>
              </div>
            )}
          </div>

          <div className="bg-slate-900/75 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="text-xs font-bold uppercase text-amber-400">
              5. Proteção Contra Corrupção Interna (Registro-Isca / Honeytoken) & Pagamento Espelhado
            </div>
            <p className="text-xs text-slate-300">
              Detecta se algum operador interno consultar contêineres/placas na madrugada sem ordem de serviço (isolando o terminal em Shadow Sandbox) e rastreia compensação financeira sem SWIFT (Brasil ⇄ Dubai ⇄ Londres LLP).
            </p>
            {rossAndersonData?.canary_honeytoken_traps?.map((c: any) => (
              <div key={c.trap_id} className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-1 text-xs">
                <div className="font-bold text-rose-300">🚨 {c.canary_entity}</div>
                <div className="text-slate-300 text-[11px]">{c.trigger_event}</div>
                <div className="text-emerald-400 font-mono text-[11px]">🛡️ {c.automated_response}</div>
              </div>
            ))}
            <button
              onClick={() =>
                executeRossAndersonAction(
                  'DEPLOY_CANARY_TRAP',
                  'PF_BR + EUROPOL + UK_NCA',
                  'Terminais Santos / Foz do Iguaçu / Antuérpia / Felixstowe'
                )
              }
              disabled={executingAnderson}
              className="w-full py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
            >
              🛡️ Ativar Registro-Isca Anti-Vazamento nos Terminais (Santos / Foz / Antuérpia / UK)
            </button>
            {rossAndersonExecResult?.canary_id && (
              <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-500/40 text-xs text-amber-200">
                <strong>Isca Ativa ({rossAndersonExecResult.canary_id}):</strong> {rossAndersonExecResult.trap_behavior}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ===========================================================================
  // VIEW G: ROSS ANDERSON'S SECURITY ENGINEERING WORKBENCH (CAMBRIDGE 3RD ED.)
  // ===========================================================================
  if (mode === 'ross_anderson') {
    const ml = rossAndersonData?.multilateral_security;
    const tampers = rossAndersonData?.tachograph_and_seal_physics || [];
    const mirrors = rossAndersonData?.mirror_trading_bookkeeping || [];
    const canaries = rossAndersonData?.canary_honeytoken_traps || [];

    return (
      <div className="flex-1 overflow-y-auto p-6 bg-slate-950 space-y-6">
        <div className="bg-slate-900/80 border border-purple-500/40 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-purple-300 text-xs font-bold uppercase tracking-wider">
              <Scale className="w-4 h-4" />
              {lang === 'pt'
                ? 'ENGENHARIA DE SEGURANÇA DE ROSS ANDERSON (CAMBRIDGE UNIVERSITY — 3ª EDIÇÃO APLICADA AO C4ISR)'
                : "ROSS ANDERSON'S SECURITY ENGINEERING SUITE (CAMBRIDGE 3RD ED. APPLIED TO C4ISR)"}
            </div>
            <p className="text-xs text-slate-300 mt-1">
              {lang === 'pt'
                ? 'Sistemas críticos falham por incentivos errados, vazamento interno (insiders), manipulação física de sensores (tacógrafos/lacres) e compensação financeira invisível (Hawala/Mirror-Trading). Abaixo estão as 4 ferramentas práticas baseadas nos capítulos de Ross Anderson:'
                : 'Critical systems fail due to insider threats, sensor/tachograph manipulation, multilateral compartmentalization gaps, and underground bookkeeping.'}
            </p>
          </div>
        </div>

        {rossAndersonExecResult && (
          <div className="bg-emerald-950/30 border border-emerald-500/50 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-300 uppercase">
                ✅ Protocolo Ross Anderson Executado: {rossAndersonExecResult.protocol}
              </span>
              <span className="text-[11px] font-mono text-emerald-400">
                Status: {rossAndersonExecResult.status}
              </span>
            </div>
            {rossAndersonExecResult.unsealed_intelligence && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs bg-slate-950/90 p-3 rounded-lg border border-emerald-500/30">
                <div>
                  <strong className="text-cyan-300">Alvo Deslacrado (Quorum 3-de-4):</strong>{' '}
                  {rossAndersonExecResult.unsealed_intelligence.target_container}
                </div>
                <div>
                  <strong className="text-amber-300">Ponto Exato de Interdição:</strong>{' '}
                  {rossAndersonExecResult.unsealed_intelligence.exact_interception_quay}
                </div>
                <div>
                  <strong className="text-rose-300">Veículos da Célula de Extração:</strong>{' '}
                  {rossAndersonExecResult.unsealed_intelligence.extraction_cell_vehicles}
                </div>
                <div>
                  <strong className="text-purple-300">Chinese Wall Ativa:</strong>{' '}
                  {rossAndersonExecResult.unsealed_intelligence.chinese_wall_enforcement}
                </div>
              </div>
            )}
            {rossAndersonExecResult.canary_id && (
              <div className="text-xs text-slate-200 bg-slate-950/90 p-3 rounded-lg border border-emerald-500/30">
                <strong className="text-amber-300">Honeytoken Canário Plantado ({rossAndersonExecResult.canary_id}):</strong>{' '}
                {rossAndersonExecResult.trap_behavior}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* 1. MULTILATERAL SECURITY (CHINESE WALL & BELL-LAPADULA SPLIT-KEY) */}
          <div className="bg-slate-900/75 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="text-xs font-bold uppercase text-cyan-400">
              1. {ml?.principle || 'Cap. 9 & 10 — Segurança Multilateral (Chinese Wall & Split-Key)'}
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">{ml?.problem_solved_pt}</p>
            {ml?.active_warrants?.map((w: any) => (
              <div key={w.warrant_id} className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-2.5 text-xs">
                <div className="font-bold text-white">{w.operation_codename}</div>
                <div className="text-[11px] font-mono text-amber-300">{w.classification}</div>
                <div className="space-y-1.5">
                  {w.custodian_shares.map((s: any) => (
                    <div key={s.share_id} className="flex items-center justify-between bg-slate-900 px-2.5 py-1.5 rounded">
                      <span className="text-slate-200 font-medium">{s.agency}</span>
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                          s.status === 'SIGNED'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {s.status} ({s.hash_prefix})
                      </span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => executeRossAndersonAction('CO_SIGN_WARRANT', 'UK_NCA', w.warrant_id)}
                  disabled={executingAnderson}
                  className="w-full py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs"
                >
                  🔐 Co-Assinar Chave Dividida (Quorum 3-de-4 UK NCA + Europol + PF) e Deslacrar Alvo
                </button>
              </div>
            ))}
          </div>

          {/* 2. INSIDER THREAT & CANARY HONEYTOKENS (CAP. 2 & 26) */}
          <div className="bg-slate-900/75 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="text-xs font-bold uppercase text-amber-400">
              2. Cap. 2, 3 & 26 — Psicologia, Ameaça Interna (Insiders) & Armadilhas Canário (Honeytokens)
            </div>
            {canaries.map((c: any) => (
              <div key={c.trap_id} className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-rose-400">{c.trap_id}</span>
                  <span className="text-[10px] bg-red-500/20 text-red-300 px-2 py-0.5 rounded font-bold">
                    {c.insider_risk}
                  </span>
                </div>
                <div className="text-white font-semibold">{c.canary_entity}</div>
                <div className="text-slate-300 text-[11px]">{c.trigger_event}</div>
                <div className="text-amber-300 text-[11px]">{c.ross_anderson_diagnosis}</div>
                <div className="text-emerald-400 font-mono text-[11px]">🛡️ {c.automated_response}</div>
              </div>
            ))}
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={() =>
                  executeRossAndersonAction(
                    'DEPLOY_CANARY_TRAP',
                    'PF_BR + EUROPOL + UK_NCA',
                    'Terminal Portuário Santos (BR) / Foz do Iguaçu (BR-277) / Antuérpia (BE)'
                  )
                }
                disabled={executingAnderson}
                className="flex-1 py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
              >
                🐤 Plantar Novo Honeytoken Canário nos Terminais (Santos / Foz / Antuérpia / Felixstowe)
              </button>
            </div>
          </div>

          {/* 3. TACHOGRAPH, E-SEAL & SENSOR TAMPER RESISTANCE (CAP. 14 & 19) */}
          <div className="bg-slate-900/75 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="text-xs font-bold uppercase text-emerald-400">
              3. Cap. 14 & 19 — Fraude em Tacógrafo Digital, Lacre RFID & Telemetria Física
            </div>
            {tampers.map((t: any) => (
              <div key={t.audit_id} className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-1.5 text-xs">
                <div className="font-bold text-white">{t.target}</div>
                <div className="text-cyan-300 text-[11px]">📡 Alegação Digital: {t.digital_claim}</div>
                <div className="text-rose-300 text-[11px]">⚖️ Realidade Física Medida: {t.physical_reality}</div>
                <div className="text-slate-400 text-[11px]">🔬 Diagnóstico Ross Anderson: {t.attack_vector}</div>
                <div className="text-emerald-400 font-semibold text-[11px]">✅ Contramedida: {t.countermeasure}</div>
              </div>
            ))}
          </div>

          {/* 4. BANKING, BOOKKEEPING & HAWALA / MIRROR-TRADING RECONCILER (CAP. 12) */}
          <div className="bg-slate-900/75 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="text-xs font-bold uppercase text-purple-400">
              4. Cap. 12 — Banking, Bookkeeping & Reconciliação de Mirror-Trading (Hawala / UK LLP / USDT)
            </div>
            {mirrors.map((m: any) => (
              <div key={m.reconcile_id} className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-2 text-xs">
                <div className="font-bold text-white">{m.corridor}</div>
                <div className="text-amber-300 text-[11px]">🚢 Perna Física (Subfaturamento): {m.physical_leg}</div>
                <div className="text-purple-300 text-[11px]">💷 Perna Financeira Espelhada: {m.financial_mirror_leg}</div>
                <div className="text-slate-300 text-[11px]">{m.ross_anderson_diagnosis}</div>
                <div className="text-emerald-400 font-bold text-[11px]">⚡ {m.actionable_freeze}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // VIEW D: GOOGLE COLAB DEPLOYMENT TELEMETRY, LIVE SANDBOX & CONTINUOUS LEARNING
  // ===========================================================================
  const handleDownloadColabV2Package = () => {
    if (!colabData) return;
    const bundle = {
      generated_at: new Date().toISOString(),
      purpose: 'FRONTIER-OS Continuous Learning Package for Google Colab Run v2',
      diagnosed_bottlenecks_from_run_v1: colabData.models?.map((m: any) => ({
        model_file: m.model_file,
        status_grade: m.status_grade,
        bottleneck: m.bottleneck_detected_pt,
        recommended_fix: m.next_colab_fix_pt,
      })),
      stgnn_13_corridors_empirical_labels: colabData.stgnn_13_nodes_mapping,
      colab_v2_script: colabData.continuous_learning?.colab_v2_script_preview,
    };
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'frontier_colab_continuous_learning_v2.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-slate-950 space-y-6">
      {/* TOP HEADER: CLEAR EXPLANATION & CONTINUOUS LEARNING EXPORT */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/90 border border-emerald-500/40 rounded-xl p-4">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Cpu className="w-4 h-4 text-emerald-400" />
            {lang === 'pt'
              ? 'Extração Real do Seu Treino no Google Colab (`frontier_c4isr_deployment`) & Ciclo de Aprendizado Contínuo'
              : 'Deep Extraction of Your Google Colab Deployment & Continuous Learning Pipeline'}
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            {lang === 'pt'
              ? 'Inspecionamos os grafos e tensores reais dos seus 4 arquivos `.onnx`: veja abaixo o que cada rede aprendeu na prática, teste os modelos ao vivo com sliders e baixe o pacote de Aprendizado Contínuo (v2) para corrigir os gargalos no próximo treino do Colab.'
              : 'Inspected the real ONNX graphs and tensors from your 4 Colab models: test them live below and export the Continuous Learning v2 dataset.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={fetchColabTelemetry}
            disabled={runningColab}
            className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/40 font-bold text-xs flex items-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5" />
            {runningColab ? 'Lendo Tensores ONNX...' : 'Recalcular Diagnóstico ONNX'}
          </button>
          <button
            onClick={handleDownloadColabV2Package}
            className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md"
          >
            <Download className="w-3.5 h-3.5" />
            {lang === 'pt'
              ? 'Baixar Dataset & Script para Próximo Treino Colab (v2)'
              : 'Download Continuous Learning v2 Package'}
          </button>
        </div>
      </div>

      {/* SECTION 1: INTERACTIVE LIVE SANDBOX — TEST YOUR COLAB ONNX WEIGHTS RIGHT NOW */}
      <div className="bg-slate-900/80 border border-cyan-500/40 rounded-xl p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400">
              1. Simulador Interativo ao Vivo — Teste Seus Pesos `.ONNX` com Dados Reais Agora
            </h3>
            <p className="text-[11px] text-slate-400">
              Altere os valores abaixo e clique em &quot;Rodar nos Modelos .ONNX&quot; para ver o erro de reconstrução (MSE) e a saída real das suas redes neurais:
            </p>
          </div>
          <button
            onClick={() => runColabSandbox()}
            className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow"
          >
            ⚡ Rodar nos Modelos .ONNX Agora
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
          <div className="lg:col-span-5 grid grid-cols-2 gap-3 text-xs bg-slate-950 p-3.5 rounded-xl border border-slate-800">
            <div>
              <label className="text-slate-400 block mb-1">Horas AIS Desligado (Navio):</label>
              <input
                type="number"
                value={colabSandboxForm.ais_gap_hours}
                onChange={(e) => {
                  const next = { ...colabSandboxForm, ais_gap_hours: Number(e.target.value) };
                  setColabSandboxForm(next);
                  runColabSandbox(next);
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white font-mono"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Velocidade Navio (Nós):</label>
              <input
                type="number"
                step="0.5"
                value={colabSandboxForm.vessel_speed_knots}
                onChange={(e) => {
                  const next = { ...colabSandboxForm, vessel_speed_knots: Number(e.target.value) };
                  setColabSandboxForm(next);
                  runColabSandbox(next);
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white font-mono"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Altitude Voo Fronteira (Pés):</label>
              <input
                type="number"
                step="50"
                value={colabSandboxForm.flight_altitude_ft}
                onChange={(e) => {
                  const next = { ...colabSandboxForm, flight_altitude_ft: Number(e.target.value) };
                  setColabSandboxForm(next);
                  runColabSandbox(next);
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white font-mono"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Excesso Peso Balança (kg):</label>
              <input
                type="number"
                step="100"
                value={colabSandboxForm.cargo_weight_delta_kg}
                onChange={(e) => {
                  const next = { ...colabSandboxForm, cargo_weight_delta_kg: Number(e.target.value) };
                  setColabSandboxForm(next);
                  runColabSandbox(next);
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white font-mono"
              />
            </div>
          </div>

          {colabSandboxResult && (
            <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1.5">
                <span className="text-[10px] font-mono text-cyan-400">maritime_lstm.onnx</span>
                <div className="font-bold text-white">{colabSandboxResult.maritime_lstm?.verdict}</div>
                <div className="text-[11px] text-slate-400">
                  MSE Tensor: <strong className="text-white font-mono">{colabSandboxResult.maritime_lstm?.raw_reconstruction_mse}</strong>
                </div>
                <div className="text-xs font-mono font-bold text-emerald-400">
                  Risco: {(colabSandboxResult.maritime_lstm?.anomaly_probability * 100).toFixed(1)}%
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1.5">
                <span className="text-[10px] font-mono text-amber-400">airspace_ae.onnx</span>
                <div className="font-bold text-white">{colabSandboxResult.airspace_ae?.verdict}</div>
                <div className="text-[11px] text-slate-400">
                  MSE Tensor: <strong className="text-white font-mono">{colabSandboxResult.airspace_ae?.raw_reconstruction_mse}</strong>
                </div>
                <div className="text-xs font-mono font-bold text-amber-300">
                  Risco: {(colabSandboxResult.airspace_ae?.anomaly_probability * 100).toFixed(1)}%
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1.5">
                <span className="text-[10px] font-mono text-purple-400">narcotics_stgnn.onnx</span>
                <div className="font-bold text-white">{colabSandboxResult.narcotics_stgnn?.verdict}</div>
                <div className="text-[11px] text-slate-400">
                  Saída Pura ONNX: <strong className="text-slate-200 font-mono">{colabSandboxResult.narcotics_stgnn?.raw_onnx_node_output}</strong>
                </div>
                <div className="text-xs font-mono font-bold text-rose-400">
                  Calibrado SoS: {(colabSandboxResult.narcotics_stgnn?.sos_calibrated_risk * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 2: DEEP EXTRACTION OF ALL 4 COLAB MODELS (WHAT WORKED VS WHAT NEEDS RETRAINING) */}
      {colabData && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
            2. Raio-X Técnico dos 4 Modelos Extraídos do Colab (O Que Foi Aprendido vs. Gargalos para o Treino v2)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {colabData.models.map((m: any) => (
              <div
                key={m.model_file}
                className="bg-slate-900/75 border border-slate-800 rounded-xl p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-2.5">
                  <div>
                    <span className="text-xs font-mono text-cyan-400 block">
                      {m.model_file} + {m.external_data_file}
                    </span>
                    <h3 className="text-sm font-bold text-white">{m.model_name}</h3>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                      m.status_grade?.includes('PRONTO')
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                        : 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                    }`}
                  >
                    {m.status_grade}
                  </span>
                </div>

                {/* Graph & Tensor Specs */}
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-[11px] space-y-1 font-mono">
                  <div className="text-slate-300">
                    <strong className="text-cyan-400">Entrada:</strong> {m.input_signature}
                  </div>
                  <div className="text-slate-300">
                    <strong className="text-purple-400">Saída:</strong> {m.output_signature}
                  </div>
                  <div className="text-slate-400">
                    Nós ONNX: <strong className="text-white">{m.onnx_nodes_count}</strong> | Loss Colab:{' '}
                    <strong className="text-white">{m.loss}</strong> | Teste:{' '}
                    <strong className="text-emerald-400">{m.empirical_test?.separation_factor}</strong>
                  </div>
                </div>

                {/* Plain-Portuguese Diagnosis */}
                <div className="space-y-2 text-xs">
                  <div className="p-2 rounded bg-emerald-950/25 border border-emerald-500/30 text-slate-200">
                    <strong className="text-emerald-300 block mb-0.5">✅ O que este modelo extraiu e contribui ao SoS:</strong>
                    {m.what_was_extracted_pt}
                  </div>
                  <div className="p-2 rounded bg-amber-950/25 border border-amber-500/30 text-slate-200">
                    <strong className="text-amber-300 block mb-0.5">⚠️ Gargalo detectado nos pesos atuais (Run #1):</strong>
                    {m.bottleneck_detected_pt}
                  </div>
                  <div className="p-2 rounded bg-cyan-950/25 border border-cyan-500/30 text-slate-200">
                    <strong className="text-cyan-300 block mb-0.5">🚀 Como preparar o próximo treino no Colab (Run #2):</strong>
                    {m.next_colab_fix_pt}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 3: CONTINUOUS LEARNING TABLE (13 GLOBAL CORRIDOR NODES FOR ST-GNN RETRAINING) */}
      {colabData?.stgnn_13_nodes_mapping && (
        <div className="bg-slate-900/80 border border-purple-500/40 rounded-xl p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-purple-300">
                3. Tabela de Aprendizado Contínuo — Calibração dos 13 Nós da `narcotics_stgnn.onnx` para o Próximo Colab
              </h3>
              <p className="text-[11px] text-slate-400">
                Veja por que o seu modelo ST-GNN precisa de retreino: no Colab v1 todos os 13 nós saíram perto de ~0.49 (dados sintéticos uniformes). O SoS já coletou os novos rótulos empíricos abaixo para o seu Colab v2:
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
            {colabData.stgnn_13_nodes_mapping.map((node: any) => (
              <div key={node.node_idx} className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 space-y-1">
                <div className="text-[10px] font-mono text-slate-400">Nó #{node.node_idx} ({node.events_logged} eventos)</div>
                <div className="font-bold text-white truncate">{node.hub}</div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 font-mono text-[11px]">
                  <span className="text-amber-300">Colab v1: {node.colab_v1_score}</span>
                  <span className="text-emerald-400 font-bold">➔ Alvo v2: {node.sos_empirical_target}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

