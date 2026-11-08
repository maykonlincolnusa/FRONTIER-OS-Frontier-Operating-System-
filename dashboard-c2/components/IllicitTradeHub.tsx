'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  ShieldAlert,
  UserCheck,
  Building2,
  Ship,
  Package,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  Crosshair,
  ArrowRight,
  FileText,
  Sparkles,
  Flame,
  Truck,
  Anchor,
  Network,
  ExternalLink,
} from 'lucide-react';

export interface InvestigationCase {
  case_id: string;
  category: 'CRUDE_OIL_STS' | 'MARITIME_CONTAINER' | 'HIGHWAY_FREIGHT' | 'RIVERINE_COMMODITY';
  category_label: string;
  category_label_pt?: string;
  severity: string;
  risk_score: number;
  status: string;
  theater: string;
  syndicate: string;
  modal: string;
  coordinates: { latitude: number; longitude: number; location_name: string };
  title: string;
  title_pt?: string;
  problem_statement: string;
  problem_summary_pt?: string;
  listed_person: {
    person_id: string;
    full_name: string;
    aliases: string[];
    nationality: string;
    role: string;
    sanction_lists: string[];
    linked_syndicate: string;
  };
  companies: Array<{
    company_id: string;
    name: string;
    jurisdiction: string;
    registration_id: string;
    role: string;
    red_flag: string;
  }>;
  commodity_transaction: {
    manifest_id: string;
    commodity_type: string;
    declared_cargo: string;
    suspected_illicit_payload: string;
    declared_value_usd: number;
    estimated_illicit_value_usd: number;
    weight_discrepancy_kg: number;
    ais_gap_hours: number;
    origin_port: string;
    transshipment_hub: string;
    destination_port: string;
    payment_channel: string;
  };
  transport_asset: {
    asset_id: string;
    asset_name: string;
    asset_type: string;
    flag: string;
    speed_knots: number;
    heading: number;
    current_ring: string;
    lead_agency: string;
    partner_agencies: string[];
  };
  anomaly_evidence: string[];
  colab_onnx_telemetry?: {
    model_name: string;
    model_file: string;
    source_bundle: string;
    engine_status: string;
    epochs_trained: number;
    colab_training_loss: number;
    proxy_precision: number;
    cost_benefit_score: number;
    size_kb: number;
    live_onnx_anomaly_score: number;
    inference_latency_ms: number;
  };
  recommended_actions: Array<{
    action_id: string;
    label: string;
    label_pt?: string;
    agency: string;
    impact: string;
  }>;
}

interface ActionReceipt {
  receipt_id: string;
  case_id: string;
  case_title: string;
  action_id: string;
  action_label: string;
  executing_agency: string;
  expected_impact: string;
  target_person: string;
  target_asset: string;
  status: string;
  executed_at: string;
}

interface KnowledgeGraph {
  nodes: Array<{ id: string; type: string; label: string; sub: string; badge: string }>;
  edges: Array<{ source: string; target: string; label: string }>;
}

interface IllicitTradeHubProps {
  lang: 'en' | 'pt';
  apiBaseUrl: string;
  onLocateOnMap: (lat: number, lon: number, caseItem: InvestigationCase) => void;
  onAskCopilot: (prompt: string) => void;
}

const FALLBACK_CASES: InvestigationCase[] = [
  {
    case_id: 'CASE-OIL-2026-001',
    category: 'CRUDE_OIL_STS',
    category_label: 'Crude Oil & Dark Fleet Sanctions',
    severity: 'CRITICAL',
    risk_score: 0.96,
    status: 'OPEN_INTERDICTION',
    theater: 'USA',
    syndicate: 'TREN_DE_ARAGUA',
    modal: 'MARITIME_CONTAINER',
    coordinates: { latitude: 25.42, longitude: -93.85, location_name: 'Gulf of Mexico High Seas (Ring 1 EEZ)' },
    title: 'Dark Fleet Crude Oil Ship-to-Ship (STS) Sanctions Evasion & Narco-Fuel Swap',
    problem_statement:
      'Sanctioned Aframax tanker disabled AIS for 18.5 hours in the Caribbean/Gulf corridor to conduct covert Ship-to-Ship (STS) transfer of 420,000 barrels of Heavy Merey Crude Oil disguised as Malaysian Blend, financing cartel logistics via Trade-Based Money Laundering (TBML).',
    listed_person: {
      person_id: 'SDN-OFAC-88412',
      full_name: 'Alejandro Rafael Morales-Vargas',
      aliases: ['El Petrolero', 'A.R. Morales'],
      nationality: 'Venezuela / Panama',
      role: 'Beneficial Owner & Maritime Bunker Broker',
      sanction_lists: ['OFAC SDN List (EO 13850)', 'FinCEN Primary Money Laundering Concern', 'INTERPOL Blue Notice'],
      linked_syndicate: 'TREN_DE_ARAGUA',
    },
    companies: [
      {
        company_id: 'COMP-PA-9920',
        name: 'Oceanic Petro-Logistics S.A.',
        jurisdiction: 'Panama City, Panama',
        registration_id: 'RUC-1556982-1-2024',
        role: 'Charterer / Shell Front Company',
        red_flag: 'Registered 14 days before voyage; shares director with OFAC-blocked entity',
      },
      {
        company_id: 'COMP-MH-4410',
        name: 'Caspian Star Maritime Holdings Ltd',
        jurisdiction: 'Majuro, Marshall Islands',
        registration_id: 'MI-IBC-77812',
        role: 'Registered Vessel Owner',
        red_flag: 'Single-ship brass-plate company; 3 flag hops in 6 months (Gabon -> Cameroon -> Panama)',
      },
    ],
    commodity_transaction: {
      manifest_id: 'BOL-OIL-99481-PA',
      commodity_type: 'CRUDE_OIL (HS Code 2709.00)',
      declared_cargo: '420,000 BBL Light Sweet Malaysian Blend',
      suspected_illicit_payload: 'Sanctioned Heavy Crude Oil + 1.8 Tons Submerged Hull Parasite Pod (Cocaine)',
      declared_value_usd: 21400000,
      estimated_illicit_value_usd: 78500000,
      weight_discrepancy_kg: 184000,
      ais_gap_hours: 18.5,
      origin_port: 'Jose Terminal (Undisclosed STS), Caribbean',
      transshipment_hub: 'Colon Free Zone Anchorage, Panama',
      destination_port: 'Offshore Galveston Lightering Zone, TX, USA',
      payment_channel: 'Back-to-Back Crypto OTC / Dubai Hawala / Falsified Letter of Credit',
    },
    transport_asset: {
      asset_id: 'IMO-9284752 / MMSI-352981000',
      asset_name: 'M/T SOLARIS TITAN',
      asset_type: 'Aframax Crude Oil Tanker',
      flag: 'PA (Panama - Flag of Convenience)',
      speed_knots: 11.4,
      heading: 335.0,
      current_ring: 'RING_1_MARITIME',
      lead_agency: 'USCG',
      partner_agencies: ['CBP', 'DEA', 'ACP_PA', 'INTERPOL'],
    },
    anomaly_evidence: [
      'SAR Satellite Imagery confirmed side-by-side STS hose connection at 19.82°N, -81.14°W during 18.5h AIS blackout.',
      'Draft sensor telemetry increased by +4.2 meters without any recorded port call in ANTAQ/ACP/USCG port logs.',
      'Certificate of Origin forged: chemical sulfur fingerprint matches Venezuelan Merey-16, not Malaysian Tapis.',
      'Beneficial owner Alejandro Morales-Vargas matched 99.4% on OFAC SDN & FinCEN beneficial ownership graph.',
    ],
    recommended_actions: [
      {
        action_id: 'ACT-OIL-01',
        label: 'Issue USCG & OFAC Maritime Detention Order (Ring 1 Boarding)',
        agency: 'USCG + OFAC',
        impact: 'Prevents vessel from entering Galveston lightering zone; authorizes USCG LEDET boarding & hull ROV inspection.',
      },
      {
        action_id: 'ACT-OIL-02',
        label: 'Freeze USD Letter of Credit ($21.4M) via FinCEN 314(a) Notice',
        agency: 'FinCEN + CBP',
        impact: 'Halts clearing of trade-based money laundering settlement across correspondent banks.',
      },
    ],
  },
  {
    case_id: 'CASE-CARGO-2026-002',
    category: 'MARITIME_CONTAINER',
    category_label: 'Maritime Container & Port Manifests',
    severity: 'CRITICAL',
    risk_score: 0.94,
    status: 'OPEN_INTERDICTION',
    theater: 'BRAZIL',
    syndicate: 'PCC',
    modal: 'MARITIME_CONTAINER',
    coordinates: { latitude: -23.96, longitude: -46.31, location_name: 'Port of Santos Terminal 3, Brazil' },
    title: 'Reefer Container Rip-On/Rip-Off Contamination & Dual-Use Chemical Swap',
    problem_statement:
      'High-velocity export of 14 refrigerated containers declared as frozen concentrated orange juice from Santos (Brazil) via Panama to Miami (USA) exhibits +1,180 kg scale anomaly and unauthorized yard seal replacement linked to PCC port logistics cell.',
    listed_person: {
      person_id: 'INTERPOL-RED-2025-419',
      full_name: 'Marcos Vinícius Toledo-ferreira',
      aliases: ['Engenheiro do Porto', 'M.V. Ferreira'],
      nationality: 'Brazil',
      role: 'Customs Broker & Port Yard Dispatcher',
      sanction_lists: ['INTERPOL Red Notice', 'Polícia Federal Operation Kraken Target', 'DEA Priority Target'],
      linked_syndicate: 'PCC',
    },
    companies: [
      {
        company_id: 'COMP-BR-3109',
        name: 'Atlântico Sul Citrus & Agro Exportadora Ltda',
        jurisdiction: 'São Paulo / Santos, Brazil',
        registration_id: 'CNPJ 48.912.304/0001-88',
        role: 'Shipper / Exporter of Record',
        red_flag: 'Export volume spiked 640% in 60 days; zero agricultural land ownership in Receita Federal registry',
      },
      {
        company_id: 'COMP-US-8821',
        name: 'SunCoast Tropical Imports LLC',
        jurisdiction: 'Doral, Florida, USA',
        registration_id: 'FEI/EIN 88-4102931',
        role: 'Consignee / Importer',
        red_flag: 'Virtual office address; shares phone number with seized money transmitter in Miami',
      },
    ],
    commodity_transaction: {
      manifest_id: 'BOL-SSZ-MSCU8849201',
      commodity_type: 'FROZEN_CITRUS_PULP (HS Code 2009.11)',
      declared_cargo: '24,000 kg Frozen Concentrated Orange Juice (Reefer -18°C)',
      suspected_illicit_payload: '1,180 kg Cocaine Hydrochloride Bricks Concealed in Reefer Evaporator Compartment',
      declared_value_usd: 68500,
      estimated_illicit_value_usd: 35400000,
      weight_discrepancy_kg: 1180,
      ais_gap_hours: 0.0,
      origin_port: 'Port of Santos (SSZ), Brazil',
      transshipment_hub: 'Port of Balboa (ACP), Panama',
      destination_port: 'PortMiami, FL, USA',
      payment_channel: 'Under-Invoiced Trade Wire + USDT Tether Tron Settlement',
    },
    transport_asset: {
      asset_id: 'CNTR-MSCU8849201 / IMO-9461829',
      asset_name: 'M/V SOUTHERN CROSS EXPRESS',
      asset_type: 'Post-Panamax Container Vessel',
      flag: 'LR (Liberia)',
      speed_knots: 17.8,
      heading: 318.0,
      current_ring: 'RING_1_MARITIME',
      lead_agency: 'PF_BR',
      partner_agencies: ['ANTAQ_BR', 'ACP_PA', 'CBP', 'DEA'],
    },
    anomaly_evidence: [
      'ANTAQ & Receita Federal Weighbridge recorded +1,180 kg variance between gate-in weight and VGM manifest.',
      'Reefer telemetry logged a 22-minute power-off & evaporator access door opening in Stack Zone D at 02:14 UTC.',
      'Customs Broker RFID badge belongs to Marcos Vinícius Toledo-Ferreira (flagged on INTERPOL Red Notice).',
    ],
    recommended_actions: [
      {
        action_id: 'ACT-CARGO-01',
        label: 'Trigger Mandatory X-Ray & K9 Inspection Hold at Balboa / PortMiami',
        agency: 'PF_BR + ACP_PA + CBP',
        impact: 'Flags container MSCU8849201 in CBP ATS (Automated Targeting System) for immediate NII X-Ray scan.',
      },
      {
        action_id: 'ACT-CARGO-02',
        label: 'Suspend Exporter SISCOMEX / RADAR License & Alert Receita Federal',
        agency: 'PF_BR + ANTAQ_BR',
        impact: 'Blocks remaining 13 containers in the consignment from leaving Santos terminal.',
      },
    ],
  },
  {
    case_id: 'CASE-TRANS-2026-003',
    category: 'HIGHWAY_FREIGHT',
    category_label: 'Highway Freight & Precursor Chemicals',
    severity: 'HIGH',
    risk_score: 0.91,
    status: 'OPEN_INTERDICTION',
    theater: 'MEXICO',
    syndicate: 'SINALOA_CARTEL',
    modal: 'HIGHWAY_FREIGHT',
    coordinates: { latitude: 27.51, longitude: -99.51, location_name: 'World Trade Bridge POE Laredo -> I-35 Corridor, TX' },
    title: 'Cross-Border Chemical Precursor & Bulk Cash Tanker Convoy (I-35 Corridor)',
    problem_statement:
      'Fleet of 3 commercial pressurized chemical tankers crossing Laredo POE onto Interstate I-35 declared as industrial solvent exhibits falsified USDOT hazmat placards and LPR convoy synchronization linked to Sinaloa precursor network.',
    listed_person: {
      person_id: 'DEA-FUG-90418',
      full_name: 'Héctor Damián Salazar-Guzmán',
      aliases: ['El Químico de Culiacán', 'H. Salazar'],
      nationality: 'Mexico',
      role: 'Transnational Precursor & Freight Coordinator',
      sanction_lists: ['OFAC Kingpin Act SDN', 'DEA Most Wanted Fugitives', 'CBP TECS Lookout'],
      linked_syndicate: 'SINALOA_CARTEL',
    },
    companies: [
      {
        company_id: 'COMP-MX-7712',
        name: 'Transportes Industriales del Pacífico S.A. de C.V.',
        jurisdiction: 'Manzanillo / Monterrey, Mexico',
        registration_id: 'RFC-TIP210409-8A1',
        role: 'Cross-Border Motor Carrier',
        red_flag: 'Received 18 tons of dual-use precursors from unverified bulk vessel at Port of Manzanillo',
      },
      {
        company_id: 'COMP-US-5519',
        name: 'LoneStar PetroChem Distribution Inc',
        jurisdiction: 'San Antonio, Texas, USA',
        registration_id: 'USDOT-3994812',
        role: 'Domestic Consignee Warehouse',
        red_flag: 'USDOT safety audit flagged cloned VINs and ghost driver logbooks (ELD tampering)',
      },
    ],
    commodity_transaction: {
      manifest_id: 'ACE-MANIFEST-LRD-774102',
      commodity_type: 'INDUSTRIAL_SOLVENTS (HS Code 2914.11)',
      declared_cargo: '32,000 Liters Industrial Acetone & Cleaning Solvent',
      suspected_illicit_payload: 'Fentanyl Precursor Chemicals (4-ANPP / Piperidone) + False Bulkhead Compartment',
      declared_value_usd: 44000,
      estimated_illicit_value_usd: 19200000,
      weight_discrepancy_kg: 640,
      ais_gap_hours: 0.0,
      origin_port: 'Port of Manzanillo -> Monterrey Hub, Mexico',
      transshipment_hub: 'Laredo World Trade Bridge POE, TX',
      destination_port: 'I-35 Corridor Distribution Hub, Dallas/San Antonio, TX',
      payment_channel: 'Trade-Based Over/Under Invoicing + Mirror Peso-Dollar Broker Swap',
    },
    transport_asset: {
      asset_id: 'USDOT-3994812 / LPR-TX-994KLA',
      asset_name: 'Kenworth T680 Hazmat Tanker Convoy (3 Units)',
      asset_type: 'Highway Hazmat Tanker Truck',
      flag: 'US/MX Dual Plate',
      speed_knots: 58.0,
      heading: 18.0,
      current_ring: 'RING_3_INTERSTATE',
      lead_agency: 'DEA',
      partner_agencies: ['CBP', 'FBI', 'USDOT'],
    },
    anomaly_evidence: [
      'CBP Non-Intrusive Gamma-Ray Portal detected high-density double-wall baffle anomaly inside Tanker #2.',
      'License Plate Reader (LPR) on I-35 confirmed lead scout vehicle registered to associate of Héctor Salazar-Guzmán.',
      'Electronic Logging Device (ELD) GPS trace shows 4-hour unscheduled stop at clandestine warehouse in Nuevo Laredo.',
    ],
    recommended_actions: [
      {
        action_id: 'ACT-TRANS-01',
        label: 'Coordinate DEA + Texas DPS Hazmat Interdiction Stop at I-35 Checkpoint',
        agency: 'DEA + CBP + USDOT',
        impact: 'Safely diverts convoy to secondary hazmat containment bay for chemical spectrometer sampling.',
      },
      {
        action_id: 'ACT-TRANS-02',
        label: 'Revoke USDOT Operating Authority & FAST/CTPAT Commercial Clearance',
        agency: 'USDOT + CBP',
        impact: 'Immediately grounds all 19 trucks operated by LoneStar PetroChem Distribution across US highways.',
      },
    ],
  },
  {
    case_id: 'CASE-RIVER-2026-004',
    category: 'RIVERINE_COMMODITY',
    category_label: 'Riverine Barges, Illicit Gold & Timber',
    severity: 'HIGH',
    risk_score: 0.89,
    status: 'OPEN_INTERDICTION',
    theater: 'ARGENTINA',
    syndicate: 'CV',
    modal: 'RIVERINE_BARGE',
    coordinates: { latitude: -32.94, longitude: -60.63, location_name: 'Paraná-Paraguay Waterway (Rosario Port Hub)' },
    title: 'Paraná-Paraguay Waterway Soy/Iron Ore Barge Concealing Illicit Gold & Narcotics',
    problem_statement:
      'Convoy of 16 dry-bulk river barges descending the Paraná-Paraguay Hidrovia mixes uncertified conflict gold bullion, illegal Amazonian timber, and Bolivian/Peruvian cocaine paste inside iron-ore and soy meal hoppers bound for Atlantic transshipment.',
    listed_person: {
      person_id: 'INTERPOL-BLUE-7710',
      full_name: 'Rodrigo Otávio Mendonça-Silva',
      aliases: ['Barão do Rio', 'R.O. Mendonça'],
      nationality: 'Brazil / Paraguay',
      role: 'Riverine Fleet Financier & Gold Bullion Laundering Broker',
      sanction_lists: ['OFAC Global Magnitsky Environmental/Corruption Watchlist', 'Polícia Federal Target'],
      linked_syndicate: 'CV',
    },
    companies: [
      {
        company_id: 'COMP-PY-1104',
        name: 'Hidrovia del Sur Minerales & Granos S.A.',
        jurisdiction: 'Asunción, Paraguay',
        registration_id: 'RUC-80094122-3',
        role: 'Barge Convoy Operator',
        red_flag: 'Operates barges across Tri-Border Area without satellite AIS transponder compliance',
      },
    ],
    commodity_transaction: {
      manifest_id: 'HIDRO-BOL-ROS-44910',
      commodity_type: 'IRON_ORE_AND_SOY_PELLETS (HS Code 2601.11)',
      declared_cargo: '18,500 Metric Tons Bulk Iron Ore & Soy Pellets',
      suspected_illicit_payload: '140 kg Smuggled Amazonian Mercury-Mined Gold + 2.4 Tons Cocaine Base',
      declared_value_usd: 3200000,
      estimated_illicit_value_usd: 44800000,
      weight_discrepancy_kg: 2540,
      ais_gap_hours: 11.0,
      origin_port: 'Corumbá (BR) / Puerto Busch -> Asunción (PY)',
      transshipment_hub: 'Rosario / Buenos Aires River Port, Argentina',
      destination_port: 'Atlantic Ocean Bulk Carrier Rendezvous (Montevideo Anchorage)',
      payment_channel: 'Physical Gold Bullion Swap + Offshore Bearer Shares',
    },
    transport_asset: {
      asset_id: 'BARGE-PY-9012',
      asset_name: 'Pusher Tug RIO PARANAense + 16 Hopper Barges',
      asset_type: 'Riverine Bulk Barge Convoy',
      flag: 'PY (Paraguay)',
      speed_knots: 6.5,
      heading: 165.0,
      current_ring: 'RING_2_FEDERAL',
      lead_agency: 'PREFECTURA_AR',
      partner_agencies: ['PF_BR', 'MARINHA_BR', 'INTERPOL'],
    },
    anomaly_evidence: [
      'Synthetic Aperture Radar (SAR) detected nocturnal motorboat rendezvous along Pilcomayo river bend.',
      'Isotopic gold assay on prior seized tranche matched illegal garimpo extraction in Tapajós/Solimões basin.',
    ],
    recommended_actions: [
      {
        action_id: 'ACT-RIVER-01',
        label: 'Dispatch Prefectura Naval Argentina & PF_BR Joint Riverine Boarding',
        agency: 'PREFECTURA_AR + PF_BR',
        impact: 'Detains Barge Hopper #4 and #9 at Rosario anchorage for synthetic aperture radar probe & K9 sweep.',
      },
    ],
  },
];

function buildClientGraph(c: InvestigationCase): KnowledgeGraph {
  const nodes = [
    {
      id: c.listed_person.person_id,
      type: 'LISTED_PERSON',
      label: c.listed_person.full_name,
      sub: c.listed_person.role,
      badge: c.listed_person.sanction_lists[0] || 'SANCTIONED',
    },
    ...c.companies.map((comp) => ({
      id: comp.company_id,
      type: 'SHELL_COMPANY',
      label: comp.name,
      sub: `${comp.role} (${comp.jurisdiction})`,
      badge: comp.registration_id,
    })),
    {
      id: c.commodity_transaction.manifest_id,
      type: 'COMMODITY_CARGO',
      label: c.commodity_transaction.commodity_type,
      sub: c.commodity_transaction.declared_cargo,
      badge: `$${(c.commodity_transaction.estimated_illicit_value_usd / 1_000_000).toFixed(1)}M Illicit Est.`,
    },
    {
      id: c.transport_asset.asset_id,
      type: 'TRANSPORT_ASSET',
      label: c.transport_asset.asset_name,
      sub: `${c.transport_asset.asset_type} [${c.transport_asset.flag}]`,
      badge: c.transport_asset.lead_agency,
    },
  ];
  const edges = [
    ...c.companies.map((comp) => ({
      source: c.listed_person.person_id,
      target: comp.company_id,
      label: 'BENEFICIAL_OWNER / BROKER',
    })),
    ...c.companies.map((comp) => ({
      source: comp.company_id,
      target: c.commodity_transaction.manifest_id,
      label: 'SHIPPER / CONSIGNEE',
    })),
    {
      source: c.commodity_transaction.manifest_id,
      target: c.transport_asset.asset_id,
      label: 'LOADED_ON_ASSET',
    },
  ];
  return { nodes, edges };
}

export default function IllicitTradeHub({
  lang,
  apiBaseUrl,
  onLocateOnMap,
  onAskCopilot,
}: IllicitTradeHubProps) {
  const [cases, setCases] = useState<InvestigationCase[]>(FALLBACK_CASES);
  const [selectedCase, setSelectedCase] = useState<InvestigationCase>(FALLBACK_CASES[0]);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [graph, setGraph] = useState<KnowledgeGraph>(() => buildClientGraph(FALLBACK_CASES[0]));
  const [fbiCrossMatches, setFbiCrossMatches] = useState<Array<{ uid?: string; title?: string; subjects?: string[] }>>([]);
  const [actionHistory, setActionHistory] = useState<ActionReceipt[]>([]);
  const [executingActionId, setExecutingActionId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const t = {
    step1Title: lang === 'en' ? '1. Select Domain or Search Entity' : '1. Selecionar Domínio ou Buscar Entidade',
    step1Sub:
      lang === 'en'
        ? 'Filter by Crude Oil, Containers, Trucks, Barges or search any Person, Company, Ship IMO, or B/L'
        : 'Filtre por Petróleo, Contêineres, Caminhões, Barcaças ou busque Pessoa, Empresa, Navio IMO ou B/L',
    step2Title: lang === 'en' ? '2. Cross-Reference Entity Chain & Evidence' : '2. Cruzar Dados: Pessoas, Empresas, Cargas e Rotas',
    step2Sub:
      lang === 'en'
        ? 'Links Listed Persons (OFAC/FBI/Interpol) ↔ Shell Companies ↔ Cargo Manifests ↔ Vessels/Trucks'
        : 'Conecta Pessoas Listadas (OFAC/FBI/Interpol) ↔ Empresas de Fachada ↔ Cargas ↔ Navios/Caminhões',
    step3Title: lang === 'en' ? '3. Execute Problem-Solving Playbook' : '3. Executar Ação de Resolução e Bloqueio',
    step3Sub:
      lang === 'en'
        ? 'Issue Customs Holds, Freeze Letters of Credit, or Dispatch Tactical Interception'
        : 'Emitir Retenção Aduaneira, Bloquear Carta de Crédito ou Acionar Interceptação Tática',
    searchPlaceholder:
      lang === 'en'
        ? 'Cross-check Person (Morales, Toledo, Salazar), Ship IMO, Container (MSCU8849201), Oil, Gold, CNPJ/EIN...'
        : 'Cruzar Pessoa (Morales, Toledo, Salazar), Navio IMO, Contêiner (MSCU8849201), Petróleo, Ouro, CNPJ...',
    allCases: lang === 'en' ? 'All Investigations' : 'Todos os Casos',
    oilCases: lang === 'en' ? '🛢️ Crude Oil & Dark Fleet' : '🛢️ Petróleo & Frota Escura',
    cargoCases: lang === 'en' ? '📦 Maritime Containers' : '📦 Contêineres & Portos',
    truckCases: lang === 'en' ? '🚛 Highway & Precursors' : '🚛 Rodovias & Precursores',
    riverCases: lang === 'en' ? '🛥️ Riverine, Gold & Timber' : '🛥️ Hidrovias, Ouro & Minério',
    locateOnMap: lang === 'en' ? '📍 Locate & Intercept on Tactical Map' : '📍 Localizar Alvo no Mapa Tático',
    askAiAnalyst: lang === 'en' ? '🤖 Deep-Dive with AI Analyst' : '🤖 Analisar Caso no Copiloto IA',
    listedPersonTitle: lang === 'en' ? 'Listed Person / Sanctioned Target' : 'Pessoa Listada / Alvo Sancionado',
    shellCompaniesTitle: lang === 'en' ? 'Linked Shell Companies & Exporters' : 'Empresas Vinculadas (Exportador / Importador)',
    cargoAnomalyTitle: lang === 'en' ? 'Commodity, Manifest & Financial Discrepancy' : 'Transação de Carga, Manifesto & Fraude Financeira',
    transportAssetTitle: lang === 'en' ? 'Transport Vessel / Vehicle Asset' : 'Embarcação / Veículo de Transporte Monitorado',
    evidenceTitle: lang === 'en' ? 'Multi-Sensor & Documentary Anomaly Evidence' : 'Evidências Físicas, Satelitais e Documentais',
    playbookTitle: lang === 'en' ? 'Actionable Resolution Playbook' : 'Plano de Ação e Resolução Imediata',
    auditLogTitle: lang === 'en' ? 'Executed Enforcement & Compliance Orders' : 'Ordens de Bloqueio e Interceptação Executadas',
    executeBtn: lang === 'en' ? 'Execute Order Now' : 'Executar Ordem Agora',
    executedBadge: lang === 'en' ? 'ORDER EXECUTED' : 'ORDEM EXECUTADA',
  };

  const fetchCasesAndCrossRef = useCallback(
    async (query: string, category: string) => {
      try {
        if (query.trim().length > 0) {
          const res = await fetch(`${apiBaseUrl}/api/v1/intel/cross-reference?q=${encodeURIComponent(query)}`);
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data.matched_cases) && data.matched_cases.length > 0) {
              setCases(data.matched_cases);
              setSelectedCase(data.matched_cases[0]);
              if (data.knowledge_graph) setGraph(data.knowledge_graph);
              setFbiCrossMatches(data.fbi_wanted_cross_matches || []);
              return;
            }
          }
        } else {
          const res = await fetch(`${apiBaseUrl}/api/v1/intel/cases?category=${encodeURIComponent(category)}`);
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data.cases) && data.cases.length > 0) {
              setCases(data.cases);
              setSelectedCase((prev) => data.cases.find((c: InvestigationCase) => c.case_id === prev.case_id) || data.cases[0]);
              if (Array.isArray(data.action_history)) setActionHistory(data.action_history);
              return;
            }
          }
        }
      } catch {
        // Fallback offline filter
      }

      const filtered = FALLBACK_CASES.filter((c) => {
        const matchesCat = category === 'ALL' || c.category === category;
        const matchesQuery =
          !query.trim() || JSON.stringify(c).toLowerCase().includes(query.trim().toLowerCase());
        return matchesCat && matchesQuery;
      });
      const list = filtered.length > 0 ? filtered : FALLBACK_CASES;
      setCases(list);
      setSelectedCase(list[0]);
      setGraph(buildClientGraph(list[0]));
    },
    [apiBaseUrl]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCasesAndCrossRef(searchQuery, categoryFilter);
    }, searchQuery.trim().length > 0 ? 180 : 0);
    return () => clearTimeout(timer);
  }, [categoryFilter, searchQuery, fetchCasesAndCrossRef]);

  useEffect(() => {
    if (selectedCase) {
      setGraph(buildClientGraph(selectedCase));
    }
  }, [selectedCase]);

  const handleExecuteAction = async (caseItem: InvestigationCase, actionId: string, actionLabel: string, agency: string, impact: string) => {
    setExecutingActionId(actionId);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/intel/cases/${caseItem.case_id}/execute-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action_id: actionId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.action_history)) {
          setActionHistory(data.action_history);
        }
        setToastMessage(`${data.result?.receipt_id || 'EXEC-OK'}: ${actionLabel} (${agency})`);
        setTimeout(() => setToastMessage(null), 5000);
        setExecutingActionId(null);
        return;
      }
    } catch {
      // Local fallback execution
    }

    const fallbackReceipt: ActionReceipt = {
      receipt_id: `EXEC-LOCAL-${100 + actionHistory.length + 1}`,
      case_id: caseItem.case_id,
      case_title: caseItem.title,
      action_id: actionId,
      action_label: actionLabel,
      executing_agency: agency,
      expected_impact: impact,
      target_person: caseItem.listed_person.full_name,
      target_asset: caseItem.transport_asset.asset_name,
      status: 'EXECUTED_AND_DISPATCHED',
      executed_at: new Date().toISOString(),
    };
    setActionHistory((prev) => [fallbackReceipt, ...prev]);
    setToastMessage(`${fallbackReceipt.receipt_id}: ${actionLabel}`);
    setTimeout(() => setToastMessage(null), 5000);
    setExecutingActionId(null);
  };

  const getCategoryIcon = (cat: InvestigationCase['category']) => {
    switch (cat) {
      case 'CRUDE_OIL_STS':
        return <Flame className="w-4 h-4 text-amber-400" />;
      case 'MARITIME_CONTAINER':
        return <Package className="w-4 h-4 text-cyan-400" />;
      case 'HIGHWAY_FREIGHT':
        return <Truck className="w-4 h-4 text-orange-400" />;
      case 'RIVERINE_COMMODITY':
        return <Anchor className="w-4 h-4 text-emerald-400" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-950 overflow-y-auto p-5 gap-4">
      {/* Top 3-Step Problem-Solving Guide Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 shadow-lg">
        <div className="flex items-start gap-3 border-b md:border-b-0 md:border-r border-slate-800 pb-2 md:pb-0 md:pr-3">
          <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 font-bold text-xs shrink-0">
            01
          </div>
          <div>
            <div className="text-xs font-bold text-white">{t.step1Title}</div>
            <div className="text-[11px] text-slate-400 leading-snug mt-0.5">{t.step1Sub}</div>
          </div>
        </div>
        <div className="flex items-start gap-3 border-b md:border-b-0 md:border-r border-slate-800 pb-2 md:pb-0 md:pr-3">
          <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 font-bold text-xs shrink-0">
            02
          </div>
          <div>
            <div className="text-xs font-bold text-white">{t.step2Title}</div>
            <div className="text-[11px] text-slate-400 leading-snug mt-0.5">{t.step2Sub}</div>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300 font-bold text-xs shrink-0">
            03
          </div>
          <div>
            <div className="text-xs font-bold text-white">{t.step3Title}</div>
            <div className="text-[11px] text-slate-400 leading-snug mt-0.5">{t.step3Sub}</div>
          </div>
        </div>
      </div>

      {/* Universal Cross-Reference Search Bar & Domain Filters */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-slate-900/70 border border-slate-800 rounded-xl p-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-cyan-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full bg-slate-950 border border-slate-700/80 rounded-lg pl-10 pr-24 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white"
            >
              {lang === 'en' ? 'Clear' : 'Limpar'}
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'ALL', label: t.allCases },
            { id: 'CRUDE_OIL_STS', label: t.oilCases },
            { id: 'MARITIME_CONTAINER', label: t.cargoCases },
            { id: 'HIGHWAY_FREIGHT', label: t.truckCases },
            { id: 'RIVERINE_COMMODITY', label: t.riverCases },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                categoryFilter === cat.id
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm'
                  : 'bg-slate-950/80 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Toast Notification when an order is executed */}
      {toastMessage && (
        <div className="flex items-center justify-between bg-emerald-950/90 border border-emerald-500/60 text-emerald-200 px-4 py-2.5 rounded-xl text-xs font-medium shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>{lang === 'en' ? 'INTER-AGENCY ORDER DISPATCHED:' : 'ORDEM INTER-AGÊNCIAS DISPARADA:'}</strong>{' '}
              {toastMessage}
            </span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-emerald-400 hover:text-white text-[11px]">
            ✕
          </button>
        </div>
      )}

      {/* Main 3-Column Problem-Solving Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0">
        {/* LEFT COLUMN (3 cols): Investigation Cases Queue */}
        <div className="lg:col-span-3 flex flex-col gap-2.5 bg-slate-900/60 border border-slate-800 rounded-xl p-3 overflow-y-auto max-h-[760px]">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              {lang === 'en' ? 'Active Illicit Trade Cases' : 'Casos de Comércio Ilegal'} ({cases.length})
            </span>
            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/50">
              OFAC + ANTAQ + CBP
            </span>
          </div>

          {cases.map((c) => {
            const isSelected = selectedCase.case_id === c.case_id;
            return (
              <div
                key={c.case_id}
                onClick={() => setSelectedCase(c)}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-slate-800/95 border-cyan-500/70 shadow-md ring-1 ring-cyan-500/30'
                    : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    {getCategoryIcon(c.category)}
                    <span className="text-[10px] font-mono font-bold text-slate-400">{c.case_id}</span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                      c.risk_score >= 0.93
                        ? 'bg-red-500/15 text-red-400 border-red-500/40'
                        : 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                    }`}
                  >
                    {(c.risk_score * 100).toFixed(0)}% {lang === 'en' ? 'RISK' : 'RISCO'}
                  </span>
                </div>

                <div className="text-xs font-bold text-slate-100 leading-snug mb-1.5">
                  {lang === 'pt' && c.title_pt ? c.title_pt : c.title}
                </div>

                <div className="text-[11px] text-slate-400 line-clamp-2 mb-2">
                  {lang === 'pt' && c.problem_summary_pt ? c.problem_summary_pt : c.problem_statement}
                </div>

                {/* Quick Cross-Ref Pills */}
                <div className="flex flex-wrap gap-1 pt-1.5 border-t border-slate-800/80 text-[10px]">
                  <span className="px-1.5 py-0.5 rounded bg-red-950/60 border border-red-800/50 text-red-300 truncate max-w-full">
                    👤 {c.listed_person.full_name}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-cyan-300">
                    🚢 {c.transport_asset.asset_name}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* CENTER COLUMN (6 cols): Cross-Reference Entity Graph & Full Case Dossier */}
        <div className="lg:col-span-6 flex flex-col gap-3.5 bg-slate-900/60 border border-slate-800 rounded-xl p-4 overflow-y-auto max-h-[760px]">
          {/* Case Header & Map Action */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-[11px] font-mono font-bold text-cyan-400 bg-cyan-950/70 px-2 py-0.5 rounded border border-cyan-800/60">
                  {selectedCase.case_id}
                </span>
                <span className="text-[11px] font-semibold text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/50">
                  {lang === 'pt' && selectedCase.category_label_pt ? selectedCase.category_label_pt : selectedCase.category_label}
                </span>
                <span className="text-[11px] font-mono text-purple-300 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800/50">
                  {selectedCase.syndicate}
                </span>
              </div>
              <h2 className="text-base font-bold text-white leading-snug">
                {lang === 'pt' && selectedCase.title_pt ? selectedCase.title_pt : selectedCase.title}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">📍 {selectedCase.coordinates.location_name}</p>
            </div>

            <div className="flex flex-wrap sm:flex-col gap-1.5 shrink-0">
              <button
                onClick={() =>
                  onLocateOnMap(
                    selectedCase.coordinates.latitude,
                    selectedCase.coordinates.longitude,
                    selectedCase
                  )
                }
                className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md transition-all"
              >
                <Crosshair className="w-3.5 h-3.5" />
                {t.locateOnMap}
              </button>
              <button
                onClick={() =>
                  onAskCopilot(
                    `Cross-reference case ${selectedCase.case_id}: ${selectedCase.listed_person.full_name}, company ${selectedCase.companies[0]?.name}, cargo ${selectedCase.commodity_transaction.manifest_id} on ${selectedCase.transport_asset.asset_name}. Recommend immediate interdiction protocol.`
                  )
                }
                className="px-3 py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/40 font-semibold text-xs flex items-center gap-1.5 transition-all"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                {t.askAiAnalyst}
              </button>
            </div>
          </div>

          {/* Problem Diagnosis Box */}
          <div className="bg-red-950/25 border border-red-500/30 rounded-xl p-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-red-400 mb-1 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              {lang === 'en' ? 'DETECTED ILLICIT TRADE PROBLEM & MODUS OPERANDI' : 'DIAGNÓSTICO DO PROBLEMA E FRAUDE DETECTADA'}
            </div>
            <p className="text-xs text-slate-200 leading-relaxed">
              {lang === 'pt' && selectedCase.problem_summary_pt
                ? selectedCase.problem_summary_pt
                : selectedCase.problem_statement}
            </p>
          </div>

          {/* Live Colab ONNX Model Cross-Reference Bar */}
          {selectedCase.colab_onnx_telemetry && (
            <div className="bg-emerald-950/25 border border-emerald-500/40 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold border border-emerald-500/40">
                  COLAB ONNX ACTIVE
                </span>
                <span className="font-bold text-white">
                  {selectedCase.colab_onnx_telemetry.model_name} (
                  <code className="text-cyan-300">{selectedCase.colab_onnx_telemetry.model_file}</code>)
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 font-mono text-[11px]">
                <span className="text-slate-300">
                  Loss: <strong className="text-white">{selectedCase.colab_onnx_telemetry.colab_training_loss}</strong>
                </span>
                <span className="text-slate-300">
                  Precision: <strong className="text-emerald-400">{selectedCase.colab_onnx_telemetry.proxy_precision}</strong>
                </span>
                <span className="text-slate-300">
                  ONNX Score:{' '}
                  <strong className="text-rose-400">
                    {(selectedCase.colab_onnx_telemetry.live_onnx_anomaly_score * 100).toFixed(1)}%
                  </strong>{' '}
                  ({selectedCase.colab_onnx_telemetry.inference_latency_ms}ms)
                </span>
              </div>
            </div>
          )}

          {/* Visual Entity Link Chain (Person -> Shell Company -> Cargo Manifest -> Transport Asset) */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3.5">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <Network className="w-4 h-4" />
                {lang === 'en'
                  ? 'Cross-Referenced Entity Link Graph (Sanctions ↔ Corporate ↔ Cargo ↔ Vessel)'
                  : 'Grafo de Cruzamento de Dados (Pessoa Listada ↔ Empresa ↔ Carga ↔ Transporte)'}
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {graph.nodes.length} {lang === 'en' ? 'Nodes' : 'Entidades'} • {graph.edges.length}{' '}
                {lang === 'en' ? 'Verified Links' : 'Vínculos'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-stretch">
              {/* Node 1: Listed Person */}
              <div className="bg-red-950/30 border border-red-500/40 rounded-lg p-2.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-[10px] text-red-400 font-bold mb-1">
                    <span className="flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5" />
                      {lang === 'en' ? 'LISTED PERSON' : 'PESSOA LISTADA'}
                    </span>
                    <ArrowRight className="w-3 h-3 hidden md:inline text-slate-500" />
                  </div>
                  <div className="text-xs font-bold text-white">{selectedCase.listed_person.full_name}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{selectedCase.listed_person.role}</div>
                </div>
                <div className="mt-2 pt-1.5 border-t border-red-900/50 text-[10px] font-mono text-red-300 truncate">
                  {selectedCase.listed_person.sanction_lists[0]}
                </div>
              </div>

              {/* Node 2: Shell Company */}
              <div className="bg-amber-950/25 border border-amber-500/40 rounded-lg p-2.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-[10px] text-amber-300 font-bold mb-1">
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5" />
                      {lang === 'en' ? 'FRONT COMPANY' : 'EMPRESA / CNPJ'}
                    </span>
                    <ArrowRight className="w-3 h-3 hidden md:inline text-slate-500" />
                  </div>
                  <div className="text-xs font-bold text-white">{selectedCase.companies[0]?.name}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{selectedCase.companies[0]?.jurisdiction}</div>
                </div>
                <div className="mt-2 pt-1.5 border-t border-amber-900/50 text-[10px] font-mono text-amber-300 truncate">
                  {selectedCase.companies[0]?.registration_id}
                </div>
              </div>

              {/* Node 3: Commodity & B/L */}
              <div className="bg-purple-950/25 border border-purple-500/40 rounded-lg p-2.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-[10px] text-purple-300 font-bold mb-1">
                    <span className="flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" />
                      {lang === 'en' ? 'CARGO / MANIFEST' : 'MANIFESTO / CARGA'}
                    </span>
                    <ArrowRight className="w-3 h-3 hidden md:inline text-slate-500" />
                  </div>
                  <div className="text-xs font-bold text-white">{selectedCase.commodity_transaction.commodity_type}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{selectedCase.commodity_transaction.manifest_id}</div>
                </div>
                <div className="mt-2 pt-1.5 border-t border-purple-900/50 text-[10px] font-mono text-purple-300">
                  Est. ${(selectedCase.commodity_transaction.estimated_illicit_value_usd / 1_000_000).toFixed(1)}M USD
                </div>
              </div>

              {/* Node 4: Vessel / Truck */}
              <div className="bg-cyan-950/25 border border-cyan-500/40 rounded-lg p-2.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-[10px] text-cyan-300 font-bold mb-1">
                    <span className="flex items-center gap-1">
                      <Ship className="w-3.5 h-3.5" />
                      {lang === 'en' ? 'TRANSPORT ASSET' : 'TRANSPORTE / ATIVO'}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-white">{selectedCase.transport_asset.asset_name}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{selectedCase.transport_asset.asset_id}</div>
                </div>
                <div className="mt-2 pt-1.5 border-t border-cyan-900/50 text-[10px] font-mono text-cyan-300">
                  Lead: {selectedCase.transport_asset.lead_agency}
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Cross-Referenced Panels: Person + Companies */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Listed Person Card */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
              <div className="text-xs font-bold text-red-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4" />
                {t.listedPersonTitle}
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">{lang === 'en' ? 'Full Name:' : 'Nome:'}</span>
                  <span className="font-bold text-white">{selectedCase.listed_person.full_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">{lang === 'en' ? 'Dossier ID:' : 'Registro:'}</span>
                  <span className="font-mono text-red-300">{selectedCase.listed_person.person_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">{lang === 'en' ? 'Aliases:' : 'Codinomes:'}</span>
                  <span className="text-slate-200">{selectedCase.listed_person.aliases.join(', ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">{lang === 'en' ? 'Nationality:' : 'Nacionalidade:'}</span>
                  <span className="text-slate-200">{selectedCase.listed_person.nationality}</span>
                </div>
                <div className="pt-1.5 border-t border-slate-800">
                  <div className="text-[10px] text-slate-400 mb-1">
                    {lang === 'en' ? 'Active Watchlists & Sanctions:' : 'Listas de Sanções e Mandados Ativos:'}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {selectedCase.listed_person.sanction_lists.map((sl, i) => (
                      <span
                        key={i}
                        className="text-[10px] px-2 py-0.5 rounded bg-red-500/15 border border-red-500/40 text-red-300 font-medium"
                      >
                        {sl}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Shell Companies Card */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
              <div className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Building2 className="w-4 h-4" />
                {t.shellCompaniesTitle}
              </div>
              <div className="space-y-2.5">
                {selectedCase.companies.map((comp) => (
                  <div key={comp.company_id} className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 text-xs">
                    <div className="flex items-center justify-between font-bold text-white">
                      <span>{comp.name}</span>
                      <span className="text-[10px] font-mono text-amber-300">{comp.registration_id}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {comp.role} • {comp.jurisdiction}
                    </div>
                    <div className="text-[11px] text-red-300 mt-1 bg-red-950/40 border border-red-900/40 px-2 py-1 rounded">
                      🚩 {comp.red_flag}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Commodity, Manifest & Financial TBML Comparison */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5">
            <div className="text-xs font-bold text-purple-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4" />
              {t.cargoAnomalyTitle}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-lg">
                <div className="text-[10px] uppercase text-slate-400 font-bold">
                  {lang === 'en' ? 'Declared on Bill of Lading' : 'Declarado no Manifesto Oficial (B/L)'}
                </div>
                <div className="text-slate-100 font-semibold mt-1">{selectedCase.commodity_transaction.declared_cargo}</div>
                <div className="text-slate-400 text-[11px] mt-1">
                  {lang === 'en' ? 'Declared Value:' : 'Valor Declarado:'}{' '}
                  <strong className="text-slate-200">
                    ${selectedCase.commodity_transaction.declared_value_usd.toLocaleString()} USD
                  </strong>
                </div>
              </div>

              <div className="bg-red-950/30 border border-red-500/40 p-2.5 rounded-lg">
                <div className="text-[10px] uppercase text-red-300 font-bold">
                  {lang === 'en' ? 'Cross-Referenced Illicit Payload' : 'Carga Ilícita Real Detectada no Cruzamento'}
                </div>
                <div className="text-red-200 font-semibold mt-1">
                  {selectedCase.commodity_transaction.suspected_illicit_payload}
                </div>
                <div className="text-red-300 text-[11px] mt-1">
                  {lang === 'en' ? 'Illicit Street/Market Value:' : 'Valor Ilícito Estimado:'}{' '}
                  <strong>${selectedCase.commodity_transaction.estimated_illicit_value_usd.toLocaleString()} USD</strong>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2.5 pt-2.5 border-t border-slate-800 text-[11px]">
              <div>
                <span className="text-slate-500 block">{lang === 'en' ? 'Origin:' : 'Origem:'}</span>
                <span className="text-slate-200 font-medium">{selectedCase.commodity_transaction.origin_port}</span>
              </div>
              <div>
                <span className="text-slate-500 block">{lang === 'en' ? 'Transshipment:' : 'Transbordo:'}</span>
                <span className="text-amber-300 font-medium">{selectedCase.commodity_transaction.transshipment_hub}</span>
              </div>
              <div>
                <span className="text-slate-500 block">{lang === 'en' ? 'Destination:' : 'Destino:'}</span>
                <span className="text-cyan-300 font-medium">{selectedCase.commodity_transaction.destination_port}</span>
              </div>
              <div>
                <span className="text-slate-500 block">{lang === 'en' ? 'Scale / AIS Discrepancy:' : 'Anomalia Física:'}</span>
                <span className="text-red-400 font-mono font-bold">
                  +{selectedCase.commodity_transaction.weight_discrepancy_kg.toLocaleString()} kg
                  {selectedCase.commodity_transaction.ais_gap_hours > 0
                    ? ` | ${selectedCase.commodity_transaction.ais_gap_hours}h Dark AIS`
                    : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Multi-Sensor Evidence List */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
            <div className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2">{t.evidenceTitle}</div>
            <ul className="space-y-1.5">
              {selectedCase.anomaly_evidence.map((ev, idx) => (
                <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                  <span className="text-cyan-400 font-mono font-bold">[{idx + 1}]</span>
                  <span>{ev}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* RIGHT COLUMN (3 cols): Actionable Resolution Playbook & Audit Log */}
        <div className="lg:col-span-3 flex flex-col gap-3 bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 overflow-y-auto max-h-[760px]">
          <div className="pb-2 border-b border-slate-800">
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4" />
              {t.playbookTitle}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {lang === 'en'
                ? 'Execute direct enforcement holds & inter-agency warrants for this case:'
                : 'Execute bloqueios financeiros, retenção alfandegária e interceptação imediata:'}
            </p>
          </div>

          {/* Recommended Playbook Actions */}
          <div className="space-y-2.5">
            {selectedCase.recommended_actions.map((act) => {
              const alreadyExecuted = actionHistory.some(
                (h) => h.case_id === selectedCase.case_id && h.action_id === act.action_id
              );
              return (
                <div
                  key={act.action_id}
                  className={`p-3 rounded-xl border transition-all ${
                    alreadyExecuted
                      ? 'bg-emerald-950/30 border-emerald-500/50'
                      : 'bg-slate-950/90 border-slate-800 hover:border-emerald-500/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                      {act.agency}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">{act.action_id}</span>
                  </div>

                  <div className="text-xs font-bold text-white leading-snug mb-1.5">
                    {lang === 'pt' && act.label_pt ? act.label_pt : act.label}
                  </div>
                  <div className="text-[11px] text-slate-400 leading-snug mb-2.5">{act.impact}</div>

                  <button
                    onClick={() =>
                      handleExecuteAction(
                        selectedCase,
                        act.action_id,
                        lang === 'pt' && act.label_pt ? act.label_pt : act.label,
                        act.agency,
                        act.impact
                      )
                    }
                    disabled={executingActionId === act.action_id}
                    className={`w-full py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      alreadyExecuted
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {alreadyExecuted ? t.executedBadge : t.executeBtn}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Live FBI Wanted Cross-Reference Matches if user searched */}
          {fbiCrossMatches.length > 0 && (
            <div className="p-3 rounded-xl bg-red-950/30 border border-red-500/40">
              <div className="text-[11px] font-bold text-red-300 uppercase mb-1.5">
                🚨 Live FBI Wanted API Matches ({fbiCrossMatches.length})
              </div>
              <div className="space-y-1.5">
                {fbiCrossMatches.map((f, i) => (
                  <div key={i} className="text-xs text-slate-200 bg-slate-950/70 p-2 rounded border border-red-900/40">
                    <div className="font-bold text-white">{f.title}</div>
                    <div className="text-[10px] text-red-300">{(f.subjects || []).join(', ')}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Executed Orders Audit Trail */}
          <div className="pt-2 border-t border-slate-800 flex-1 flex flex-col">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2 flex items-center justify-between">
              <span>{t.auditLogTitle}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                {actionHistory.length}
              </span>
            </div>

            {actionHistory.length === 0 ? (
              <div className="text-[11px] text-slate-500 bg-slate-950/50 border border-slate-800/80 rounded-lg p-3 text-center">
                {lang === 'en'
                  ? 'No enforcement actions executed yet in this session. Click "Execute Order Now" above to dispatch inter-agency holds.'
                  : 'Nenhuma ordem executada ainda nesta sessão. Clique em "Executar Ordem Agora" acima para disparar bloqueios.'}
              </div>
            ) : (
              <div className="space-y-2 overflow-y-auto">
                {actionHistory.map((item) => (
                  <div
                    key={item.receipt_id}
                    className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/30 text-[11px]"
                  >
                    <div className="flex items-center justify-between font-mono text-[10px] text-emerald-400 mb-0.5">
                      <span>{item.receipt_id}</span>
                      <span>{item.executing_agency}</span>
                    </div>
                    <div className="font-bold text-slate-100">{item.action_label}</div>
                    <div className="text-slate-400 text-[10px] mt-0.5">
                      Target: {item.target_person} • {item.target_asset}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
