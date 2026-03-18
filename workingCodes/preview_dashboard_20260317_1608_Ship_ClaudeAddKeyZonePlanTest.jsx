import { useState, useMemo, useRef, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";

function makeC(light){
  return light ? {
    blp:"#94a3b8",actual:"#16a34a",warn:"#dc2626",amber:"#d97706",
    bg:"#f0f4f8",panel:"#ffffff",border:"#e8ecf3",muted:"#d4dbe8",sub:"#5a6a85",text:"#0f172a",
    card:"#f8fafc",nav:"#fafbfd",navBorder:"#e2e8f0",tabActive:"#0f172a",tabInactive:"#f1f5f9",tabInactiveText:"#64748b",
    tableHead:"#dde8f5",tableRow0:"#ffffff",tableRow1:"#f8fafc",tableHover:"#e0eeff",
    inputBg:"#eef2f7",inputBorder:"#c8d3e0",
    headerText:"#0f172a",subText:"#5a6a85",
  } : {
    blp:"#475569",actual:"#22c55e",warn:"#ef4444",amber:"#f59e0b",
    bg:"#080d18",panel:"#0f172a",border:"#1e3a5f",muted:"#2d4a6e",sub:"#94a3b8",text:"#f1f5f9",
    card:"#0f172a",nav:"#0a1020",navBorder:"#1e3a5f",tabActive:"#162444",tabInactive:"#0a1020",tabInactiveText:"#94a3b8",
    tableHead:"#0a1628",tableRow0:"#0d1a30",tableRow1:"#0f1d35",tableHover:"#1a2e50",
    inputBg:"#162030",inputBorder:"#2d4a6e",
    headerText:"#f8fafc",subText:"#94a3b8",
  };
}
// C is defined reactively inside App() via makeC(lightMode)

function AnimatedDashboardIcon({ C }) {
  return (
    <svg width="26" height="26" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style={{flexShrink:0}}>
      <style>
        {`
          @keyframes dash-bar1 { 0%, 15% { width: 0; } 35%, 100% { width: 14px; } }
          @keyframes dash-bar2 { 0%, 35% { width: 0; } 55%, 100% { width: 20px; } }
          @keyframes dash-bar3 { 0%, 55% { width: 0; } 75%, 100% { width: 10px; } }
          .bg-rect { fill: ${C.panel}; stroke: ${C.border}; stroke-width: 2.5; }
          .db-bar1 { animation: dash-bar1 6s cubic-bezier(0.4, 0, 0.2, 1) infinite; fill: #8b5cf6; }
          .db-bar2 { animation: dash-bar2 6s cubic-bezier(0.4, 0, 0.2, 1) infinite; fill: #3b82f6; }
          .db-bar3 { animation: dash-bar3 6s cubic-bezier(0.4, 0, 0.2, 1) infinite; fill: #10b981; }
        `}
      </style>
      <rect className="bg-rect" x="2" y="2" width="28" height="28" rx="6" />
      <rect x="6" y="7" width="12" height="3" rx="1.5" fill={C.muted} />
      <rect x="22" y="7" width="4" height="3" rx="1.5" fill={C.muted} />
      <rect className="db-bar1" x="6" y="14" width="14" height="3" rx="1.5" />
      <rect className="db-bar2" x="6" y="19" width="20" height="3" rx="1.5" />
      <rect className="db-bar3" x="6" y="24" width="10" height="3" rx="1.5" />
    </svg>
  );
}

// ─── WEATHER WIDGET ───────────────────────────────────────────────────────────
const WEATHER_EMOJI_MAP = {
  sunny:         { emoji:"☀️",  anim:"spin",    label:"Sunny" },
  clear:         { emoji:"☀️",  anim:"spin",    label:"Clear" },
  partly_cloudy: { emoji:"⛅",  anim:"drift",   label:"Partly Sunny" },
  cloudy:        { emoji:"☁️",  anim:"drift",   label:"Cloudy" },
  overcast:      { emoji:"🌥️", anim:"drift",   label:"Overcast" },
  rain:          { emoji:"🌧️", anim:"drip",    label:"Rainy" },
  drizzle:       { emoji:"🌦️", anim:"drip",    label:"Drizzle" },
  thunderstorm:  { emoji:"⛈️", anim:"flash",   label:"Thunderstorm" },
  snow:          { emoji:"❄️",  anim:"fall",    label:"Snowy" },
  fog:           { emoji:"🌫️", anim:"drift",   label:"Foggy" },
  windy:         { emoji:"🌬️", anim:"shake",   label:"Windy" },
  hail:          { emoji:"🌨️", anim:"drip",    label:"Hail" },
};
function WeatherWidget({ C }) {
  const [weather, setWeather] = useState(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    // Inject keyframes once
    if (!document.getElementById("weather-keyframes")) {
      const s = document.createElement("style");
      s.id = "weather-keyframes";
      s.textContent = `
        @keyframes wx-spin  { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
        @keyframes wx-drift { 0%,100%{transform:translateX(0)} 50%{transform:translateX(4px)} }
        @keyframes wx-drip  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(3px)} }
        @keyframes wx-flash { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes wx-fall  { 0%,100%{transform:translateY(0) rotate(0deg)} 50%{transform:translateY(4px) rotate(20deg)} }
        @keyframes wx-shake { 0%,100%{transform:rotate(0deg)} 25%{transform:rotate(-8deg)} 75%{transform:rotate(8deg)} }
        @keyframes wx-pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }
      `;
      document.head.appendChild(s);
    }
    // Fetch Singapore weather via Open-Meteo (free, no key)
    fetch("https://api.open-meteo.com/v1/forecast?latitude=1.3521&longitude=103.8198&current=temperature_2m,weathercode,is_day&temperature_unit=celsius&timezone=Asia%2FSingapore")
      .then(r => r.json())
      .then(d => {
        const code = d.current?.weathercode ?? 1;
        const temp = Math.round(d.current?.temperature_2m ?? 28);
        const isDay = d.current?.is_day ?? 1;
        // WMO code → condition
        let cond = "sunny";
        if (code === 0) cond = isDay ? "sunny" : "clear";
        else if (code <= 2) cond = "partly_cloudy";
        else if (code <= 3) cond = "cloudy";
        else if (code <= 49) cond = "fog";
        else if (code <= 57) cond = "drizzle";
        else if (code <= 67) cond = "rain";
        else if (code <= 77) cond = "snow";
        else if (code <= 82) cond = "rain";
        else if (code <= 99) cond = "thunderstorm";
        setWeather({ cond, temp });
      })
      .catch(() => setWeather({ cond: "partly_cloudy", temp: 28 })); // fallback
    // Pulse tick for glow animation
    const id = setInterval(() => setTick(t => t + 1), 2000);
    return () => clearInterval(id);
  }, []);

  if (!weather) return (
    <div style={{ display:"flex", alignItems:"center", gap:5, padding:"4px 10px", borderRadius:20,
      border:`1px solid ${C.border}`, background:C.inputBg, fontSize:11, color:C.sub }}>
      <span style={{ animation:"wx-pulse 1.2s ease-in-out infinite", display:"inline-block" }}>🌡️</span>
      <span style={{ fontSize:10 }}>SG...</span>
    </div>
  );
  const { emoji, anim, label } = WEATHER_EMOJI_MAP[weather.cond] || WEATHER_EMOJI_MAP.partly_cloudy;
  const animStyle = { animation:`wx-${anim} ${anim==="spin"?8:anim==="flash"?1.5:2.5}s ease-in-out infinite`, display:"inline-block", fontSize:18, lineHeight:1 };
  return (
    <div title={`Singapore · ${label} · ${weather.temp}°C`} style={{
      display:"flex", alignItems:"center", gap:6, padding:"4px 11px", borderRadius:20,
      border:`1px solid ${C.border}`, background:C.inputBg, cursor:"default",
      boxShadow: tick%2===0 ? `0 0 8px ${C.amber}33` : "none",
      transition:"box-shadow 0.8s ease",
    }}>
      <span style={animStyle}>{emoji}</span>
      <div style={{ display:"flex", flexDirection:"column", lineHeight:1.1 }}>
        <span style={{ fontSize:11, fontWeight:800, color:C.text }}>{weather.temp}°C</span>
        <span style={{ fontSize:8, color:C.sub, whiteSpace:"nowrap" }}>SG · {label}</span>
      </div>
    </div>
  );
}

// ─── ZONE KEY PLAN SVG SCHEMATIC ─────────────────────────────────────────────
// Polygon shapes derived from PPT reference: "20260303 Podium Catch-up vs baseline.pptx"
// Slide 25 – Zone P2 Podium Superstructure Overall Zoning Strategy (key plan diagram)
// SVG viewBox "0 0 280 200" maps slide region x=4.8–13.0" → 0–280, y=1.0–7.2" → 0–200
function ZoneKeyPlan({ activeZoneKey, activeArea, setActiveZoneKey, setActiveArea, C }) {
  const [hovered, setHovered] = useState(null);

  // Each entry maps to a clickable zone region on the SVG schematic.
  // Points come from the freeform polygon paths on the PPT key plan slide.
  const ZONE_SHAPES = [
    {
      id: "P2",
      label: "P2",
      sublabel: "New Basement",
      areaKey: "NEW_BASEMENT",
      selectKey: "P2_ALL",
      color: "#8b5cf6",
      // Freeform 54 – overall Zone P2 / New Basement podium footprint
      points: "46,36 172,93 141,154 14,95",
      labelXY: [39, 100],
    },
    {
      id: "P1",
      label: "P1",
      sublabel: "Marine",
      areaKey: "MARINE",
      selectKey: "P1",
      color: "#f59e0b",
      // Left portion of Freeform 56 (P1+P3 split at slide x≈9.25")
      points: "86,55 152,37 152,93",
      labelXY: [108, 61],
    },
    {
      id: "P3",
      label: "P3",
      sublabel: "Marine",
      areaKey: "MARINE",
      selectKey: "P3",
      color: "#fb923c",
      // Right portion of Freeform 56
      points: "152,93 179,108 230,105 252,68 249,20 209,22 152,37",
      labelXY: [205, 60],
    },
    {
      id: "P4",
      label: "P4",
      sublabel: "Exist. Basement",
      areaKey: "EXIST_BASEMENT",
      selectKey: "P4_ALL",
      color: "#f59e0b",
      // Freeform 57 – existing basement podium footprint
      points: "39,107 128,148 129,162 125,169 82,187 31,146 31,118",
      labelXY: [57, 150],
    },
  ];

  function handleClick(shape) {
    if (shape.areaKey !== activeArea) setActiveArea(shape.areaKey);
    setActiveZoneKey(shape.selectKey);
    // Reset level filter implicitly handled by setActiveZoneKey + area change
  }

  function isActive(shape) {
    if (!activeZoneKey) return false;
    if (shape.id === "P2") return activeZoneKey.startsWith("P2_");
    if (shape.id === "P4") return activeZoneKey.startsWith("P4_");
    return activeZoneKey === shape.selectKey;
  }

  return (
    <div style={{ flexShrink: 0, borderLeft: `1px solid ${C.border}`, paddingLeft: 12, marginLeft: 4 }}>
      <div style={{ fontSize: 8, fontWeight: 700, color: C.sub, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 3 }}>
        Key Plan · Podium Zones
      </div>
      <svg viewBox="0 0 280 200" width={196} height={140} style={{ display: "block", overflow: "visible" }}>
        {/* Area boundary guide labels */}
        <text x="225" y="11" fontSize="6.5" fill={C.sub} fontWeight="600" textAnchor="middle" opacity="0.7">Marine Zone</text>
        <text x="225" y="18" fontSize="6.5" fill={C.sub} fontWeight="600" textAnchor="middle" opacity="0.7">Podium</text>
        <text x="23" y="76" fontSize="6" fill={C.sub} fontWeight="600" textAnchor="middle" transform="rotate(-30,23,76)" opacity="0.6">New Bmt</text>
        <text x="14" y="152" fontSize="6" fill={C.sub} fontWeight="600" textAnchor="middle" opacity="0.6">Exist.</text>
        <text x="14" y="160" fontSize="6" fill={C.sub} fontWeight="600" textAnchor="middle" opacity="0.6">Bmt</text>

        {/* Zone polygons — draw P2 first (back), then P4, then P1/P3 on top */}
        {[ZONE_SHAPES[0], ZONE_SHAPES[3], ZONE_SHAPES[1], ZONE_SHAPES[2]].map(shape => {
          const active   = isActive(shape);
          const areaLit  = activeArea === shape.areaKey;
          const hov      = hovered === shape.id;
          const fillOp   = active ? 0.55 : hov ? 0.32 : areaLit ? 0.22 : 0.12;
          const strokeW  = active ? 2.5 : hov ? 1.8 : 0.8;
          const strokeOp = active ? 1 : hov ? 0.9 : areaLit ? 0.7 : 0.4;
          return (
            <g key={shape.id}>
              <polygon
                points={shape.points}
                fill={shape.color}
                fillOpacity={fillOp}
                stroke={shape.color}
                strokeWidth={strokeW}
                strokeOpacity={strokeOp}
                style={{ cursor: "pointer", transition: "fill-opacity 0.15s, stroke-width 0.15s" }}
                onClick={() => handleClick(shape)}
                onMouseEnter={() => setHovered(shape.id)}
                onMouseLeave={() => setHovered(null)}
              />
              <text
                x={shape.labelXY[0]}
                y={shape.labelXY[1]}
                fontSize={active ? 10 : 9}
                fontWeight={active ? "800" : "600"}
                fill={active ? shape.color : hov ? shape.color : C.sub}
                textAnchor="middle"
                dominantBaseline="middle"
                style={{ pointerEvents: "none", userSelect: "none", transition: "fill 0.15s" }}
              >
                {shape.label}
              </text>
            </g>
          );
        })}

        {/* Compass / north indicator */}
        <text x="270" y="190" fontSize="7" fill={C.sub} opacity="0.4" textAnchor="middle">N↑</text>
      </svg>
    </div>
  );
}

// ─── ZONE HIERARCHY ───────────────────────────────────────────────────────────
// 3 main areas matching drawings:
//   BASEMENT→L1: Marine Deck (C) | New Basement (A) | Existing Basement (B)
//   PODIUM:      P1, P2, P3, P4 (each with deck/CIS subzones + levels L1–L5)
//   TOWER:       T1, T2, T3, T4
const AREA_GROUPS = [
  {
    key:"MARINE", label:"Marine Deck", icon:"⚓", color:"#06b6d4",
    subgroups:[
            { key:"MARINE_P", label:"Podium P-3", color:"#f59e0b",
        zones:[
          { key:"P1", label:"Zone P-1", color:"#f59e0b", prodKey:"P", taskZones:["Zone P-1","Zone P1","Zone P.1"], levelFilter:null, desc:"Podium · L1–L4" },
          { key:"P3", label:"Zone P-3", color:"#fb923c", prodKey:"P", taskZones:["Zone P-3","Zone P3","Zone P.3"], levelFilter:null, desc:"Podium · L1–L4" },
        ]},
      { key:"MARINE_C", label:"Marine L1", color:"#06b6d4",
        zones:[
          { key:"C1", label:"Zone C-1", color:"#06b6d4", prodKey:"C", taskZones:["Zone C-1","Zone C-1.1","Zone C-1.2","Zone C.1"], levelFilter:null, desc:"L1 · Temp Deck · Bored Pile · Double-T" },
          { key:"C2", label:"Zone C-2", color:"#0891b2", prodKey:"C", taskZones:["Zone C-2","Zone C-2.1","Zone C-2.2","Zone C.2"], levelFilter:null, desc:"L1 · Temp Deck · Bored Pile · Double-T" },
          { key:"C3", label:"Zone C-3", color:"#0e7490", prodKey:"C", taskZones:["Zone C-3","Zone C-3.1","Zone C-3.2","Zone C.3"], levelFilter:null, desc:"L1 · Marine Deck · Bored Pile · Double-T" },
        ]},
      { key:"MARINE_A", label:"Basement", color:"#3b82f6",
        zones:[
          { key:"A1", label:"Zone A-1", color:"#3b82f6", prodKey:"A1A3", taskZones:["Zone A-1","Zone A-1 "], levelFilter:null, desc:"B1/B2 · Excavation & Structure" },
          { key:"A3", label:"Zone A-3", color:"#6366f1", prodKey:"A1A3", taskZones:["Zone A-3","Zone A-3 "], levelFilter:null, desc:"B1/B2 · Excavation & Structure" },
          { key:"A4", label:"Zone A-4", color:"#818cf8", prodKey:"A1A3", taskZones:["Zone A-4","Zone A-4 "], levelFilter:null, desc:"B1/B2 · Excavation & Structure" },
        ]},
    ]
  },
  {
    key:"NEW_BASEMENT", label:"New Basement", icon:"🏗", color:"#3b82f6",
    subgroups:[
            { key:"NEW_A", label:"Basement", color:"#3b82f6",
        zones:[
          { key:"A21", label:"Zone A-2.1", color:"#3b82f6", prodKey:"A2", taskZones:["Zone A-2.1","Zone A-2.1 ","Zone A2.1","Zone A.2.1"], levelFilter:null, desc:"B1/B2 · Excavation & Structure" },
          { key:"A22", label:"Zone A-2.2", color:"#6366f1", prodKey:"A2", taskZones:["Zone A-2.2","Zone A-2.2 ","Zone A2.2","Zone A.2.2"], levelFilter:null, desc:"B1/B2 · Excavation & Structure" },
        ]},
      { key:"NEW_P2", label:"Podium P-2", color:"#8b5cf6",
        zones:[
          { key:"P2_L1",  label:"L1",          color:"#a78bfa", prodKey:"P", taskZones:["Zone P-2","Zone P2","Zone P.2"], levelFilter:"L1",              desc:"P2 Level 1" },
          { key:"P2_L2",  label:"L2",          color:"#8b5cf6", prodKey:"P", taskZones:["Zone P-2","Zone P2","Zone P.2"], levelFilter:"L2",              desc:"P2 Level 2" },
          { key:"P2_L3",  label:"L3",          color:"#7c3aed", prodKey:"P", taskZones:["Zone P-2","Zone P2","Zone P.2"], levelFilter:"L3",              desc:"P2 Level 3" },
          { key:"P2_L4",  label:"L4",          color:"#6d28d9", prodKey:"P", taskZones:["Zone P-2","Zone P2","Zone P.2"], levelFilter:"L4",              desc:"P2 Level 4" },
          { key:"P2_L5",  label:"L5",          color:"#a855f7", prodKey:"P", taskZones:["Zone P-2","Zone P2","Zone P.2"], levelFilter:"L5",              desc:"P2 Level 5" },
          { key:"P2_L5T", label:"Transfer L5", color:"#c084fc", prodKey:"P", taskZones:["Zone P-2","Zone P2","Zone P.2"], levelFilter:"L5 Transfer",     desc:"P2 L5 Transfer Plate" },
          { key:"P2_ALL", label:"All Levels",  color:"#8b5cf6", prodKey:"P", taskZones:["Zone P-2","Zone P2","Zone P.2"], levelFilter:null,              desc:"P2 All Levels combined" },
        ]},
    ]
  },
  {
    key:"EXIST_BASEMENT", label:"Existing Basement", icon:"🏚", color:"#f59e0b",
    subgroups:[
            { key:"EXIST_B", label:"Basement", color:"#f59e0b",
        zones:[
          { key:"B21", label:"Zone B-2.1", color:"#f59e0b", prodKey:"B", taskZones:["Zone B-2.1","Zone B-2.2","Zone B.2.1"], levelFilter:null, desc:"Demolish · LHR Bored Pile · Pilecap · B1 Beam & Slab" },
          { key:"B31", label:"Zone B-3.1", color:"#d97706", prodKey:"B", taskZones:["Zone B-3.1","Zone B-3.2","Zone B.3.1"], levelFilter:null, desc:"Demolish · Pilecap · B1 Beam & Slab" },
        ]},
      { key:"EXIST_P4", label:"Podium P-4", color:"#fb923c",
        zones:[
          { key:"P4_L1",  label:"L1",          color:"#fb923c", prodKey:"P", taskZones:["Zone P-4","Zone P4","Zone P.4","Zone T-4","Zone T4"], levelFilter:"L1",          desc:"P4 Level 1" },
          { key:"P4_L2",  label:"L2",          color:"#f97316", prodKey:"P", taskZones:["Zone P-4","Zone P4","Zone P.4","Zone T-4","Zone T4"], levelFilter:"L2",          desc:"P4 Level 2" },
          { key:"P4_L3",  label:"L3",          color:"#ea580c", prodKey:"P", taskZones:["Zone P-4","Zone P4","Zone P.4","Zone T-4","Zone T4"], levelFilter:"L3",          desc:"P4 Level 3" },
          { key:"P4_L4",  label:"L4",          color:"#f59e0b", prodKey:"P", taskZones:["Zone P-4","Zone P4","Zone P.4","Zone T-4","Zone T4"], levelFilter:"L4",          desc:"P4 Level 4" },
          { key:"P4_L5",  label:"L5",          color:"#fbbf24", prodKey:"P", taskZones:["Zone P-4","Zone P4","Zone P.4","Zone T-4","Zone T4"], levelFilter:"L5",          desc:"P4 Level 5" },
          { key:"P4_L5T", label:"Transfer L5", color:"#fde047", prodKey:"P", taskZones:["Zone P-4","Zone P4","Zone P.4","Zone T-4","Zone T4"], levelFilter:"L5 Transfer", desc:"P4 L5 Transfer Plate" },
          { key:"P4_ALL", label:"All Levels",  color:"#fb923c", prodKey:"P", taskZones:["Zone P-4","Zone P4","Zone P.4","Zone T-4","Zone T4"], levelFilter:null,          desc:"P4 All Levels combined" },
        ]},
    ]
  },
];

const ALL_ZONE_DEFS = AREA_GROUPS.flatMap(a => a.subgroups.flatMap(sg => sg.zones));
function getZoneDef(key) { if(!key) return null; return ALL_ZONE_DEFS.find(z => z.key === key) || null; }

const ZONE_TO_PRODKEY = {
  "Zone A-1":"A1A3","Zone A-3":"A1A3","Zone A-4":"A1A3","Zone A.1":"A1A3","Zone A.3":"A1A3",
  "Zone A-2.1":"A2","Zone A-2.2":"A2","Zone A2.1":"A2","Zone A2.2":"A2","Zone A.2.1":"A2","Zone A.2.2":"A2",
  "Zone B-2.1":"B","Zone B-2.2":"B","Zone B-3.1":"B","Zone B-3.2":"B","Zone B.2.1":"B","Zone B.3.1":"B",
  "Zone C-1":"C","Zone C-2":"C","Zone C-3":"C",
  "Zone C-1.1":"C","Zone C-1.2":"C","Zone C-2.1":"C","Zone C-2.2":"C","Zone C-3.1":"C","Zone C-3.2":"C",
  "Zone C.1":"C","Zone C.2":"C","Zone C.3":"C",
  "Zone P-1":"P","Zone P-2":"P","Zone P-3":"P","Zone P-4":"P","Zone T-4":"P","Zone T4":"P",
  "Zone P1":"P","Zone P2":"P","Zone P3":"P","Zone P4":"P",
  "Zone P.1":"P","Zone P.2":"P","Zone P.3":"P","Zone P.4":"P",
};

// ─── P1/P3 STRUCTURAL REFERENCE ───────────────────────────────────────────────
const P1P3_STRUCT = [
  { zone:"Zone 1.1", rcCols:13, rcWalls:1, coreWalls:"—",         steelBeams:22, deepDeck:"Yes", cisSlab:"No"  },
  { zone:"Zone 3.1", rcCols:15, rcWalls:0, coreWalls:"—",         steelBeams:18, deepDeck:"Yes", cisSlab:"No"  },
  { zone:"Zone 3.2", rcCols:13, rcWalls:1, coreWalls:"—",         steelBeams:20, deepDeck:"Yes", cisSlab:"No"  },
  { zone:"Zone 3.3", rcCols:10, rcWalls:0, coreWalls:"—",         steelBeams:20, deepDeck:"Yes", cisSlab:"No"  },
  { zone:"Zone 3.4", rcCols:4,  rcWalls:2, coreWalls:"Staircase", steelBeams:20, deepDeck:"No",  cisSlab:"Yes" },
  { zone:"Zone 3.5", rcCols:5,  rcWalls:5, coreWalls:"Core 1",    steelBeams:12, deepDeck:"No",  cisSlab:"Yes" },
];

// ─── PRODUCTIVITY DATA ────────────────────────────────────────────────────────
const PROD_DATA = {};

// ─── GANTT TASKS ──────────────────────────────────────────────────────────────
const ALL_TASKS = [];

// ─── TIMELINE ─────────────────────────────────────────────────────────────────
const TL_START=new Date("2025-09-01").getTime(),TL_END=new Date("2027-04-30").getTime(),TL_MS=TL_END-TL_START;
const TODAY=Date.now(),TODAY_P=(TODAY-TL_START)/TL_MS*100;
const TODAY_LABEL=(()=>{const d=new Date(TODAY);return d.toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"});})();
function pct(d){if(!d)return null;return Math.max(0,Math.min(100,(new Date(d).getTime()-TL_START)/TL_MS*100));}
function barW(s,e){const p=pct(s),q=pct(e);return q&&p!==null?Math.max(0.25,q-p):0;}
// Project Month 1 = Sep 2024
const PROJECT_START_DATE = new Date("2024-09-01");
function getProjectMonth(date) {
  const d = new Date(date);
  return (d.getFullYear() - PROJECT_START_DATE.getFullYear()) * 12 + (d.getMonth() - PROJECT_START_DATE.getMonth()) + 1;
}
function getMonthTicks(){
  const ticks=[],d=new Date(TL_START);d.setDate(1);
  while(d.getTime()<TL_END){
    const mNum = getProjectMonth(d);
    ticks.push({p:(d.getTime()-TL_START)/TL_MS*100,label:d.toLocaleString("default",{month:"short"}),isJan:d.getMonth()===0,year:d.getFullYear(),mNum});
    d.setMonth(d.getMonth()+1);
  }
  return ticks;
}

const MILESTONES=["25-Q3","25-Q4","26-Q1","26-Q2","26-Q3","26-Q4","27-Q1","FINAL"];
const MS_RANGES={"25-Q3":["2025-07-01","2025-09-30"],"25-Q4":["2025-10-01","2025-12-31"],"26-Q1":["2026-01-01","2026-03-31"],"26-Q2":["2026-04-01","2026-06-30"],"26-Q3":["2026-07-01","2026-09-30"],"26-Q4":["2026-10-01","2026-12-31"],"27-Q1":["2027-01-01","2027-03-31"],"FINAL":["2025-07-01","2027-04-30"]};
const AREA_LEVELS={
  "MARINE":         ["B1","B2","L1","L2","L3","L4"],
  "NEW_BASEMENT":   ["B1","B2","L1","L2","L3","L4","L5"],
  "EXIST_BASEMENT": ["B1","B2","L1","L2","L3","L4","L5"],
};

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [activeArea,    setActiveArea]    = useState("MARINE");
  const [activeZoneKey, setActiveZoneKey] = useState(null);
  const [tab,           setTab]           = useState("gantt");
  const [tasks,         setTasks]         = useState([]);
  const [editing,       setEditing]       = useState(null);
  const [editVal,       setEditVal]       = useState({});
  const [filterLevel,   setFilterLevel]   = useState("all");
  const [activeMilestone,setActiveMilestone] = useState("26-Q1");
  const [lightMode,     setLightMode]     = useState(false);
  const [uploadedFile,  setUploadedFile]  = useState(null);
  const [xlsxReady,     setXlsxReady]    = useState(!!window.XLSX);
  const fileInputRef = useRef(null);

  const C = makeC(lightMode);

  // Inject animated SVG favicon
  useEffect(() => {
    const svgFav = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
      <style>
        @keyframes f1{0%,15%{width:0}35%,100%{width:14px}}
        @keyframes f2{0%,35%{width:0}55%,100%{width:20px}}
        @keyframes f3{0%,55%{width:0}75%,100%{width:10px}}
        .fb1{animation:f1 6s cubic-bezier(.4,0,.2,1) infinite}
        .fb2{animation:f2 6s cubic-bezier(.4,0,.2,1) infinite}
        .fb3{animation:f3 6s cubic-bezier(.4,0,.2,1) infinite}
      </style>
      <rect x="2" y="2" width="28" height="28" rx="6" fill="#0f172a" stroke="#1e3a5f" stroke-width="2.5"/>
      <rect x="6" y="7" width="12" height="3" rx="1.5" fill="#2d4a6e"/>
      <rect x="22" y="7" width="4" height="3" rx="1.5" fill="#2d4a6e"/>
      <rect class="fb1" x="6" y="14" width="14" height="3" rx="1.5" fill="#8b5cf6"/>
      <rect class="fb2" x="6" y="19" width="20" height="3" rx="1.5" fill="#3b82f6"/>
      <rect class="fb3" x="6" y="24" width="10" height="3" rx="1.5" fill="#10b981"/>
    </svg>`;
    const blob = new Blob([svgFav], { type: 'image/svg+xml' });
    const url  = URL.createObjectURL(blob);
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.type = 'image/svg+xml';
    link.href = url;
    return () => URL.revokeObjectURL(url);
  }, []);

  useEffect(() => {
    // Load Poppins font
    if (!document.getElementById("poppins-font")) {
      const link = document.createElement("link");
      link.id = "poppins-font";
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap";
      document.head.appendChild(link);
    }
    if (!document.getElementById("dash-responsive")) {
      const style = document.createElement("style");
      style.id = "dash-responsive";
      style.textContent = `
        *{box-sizing:border-box;}
        html,body{margin:0;padding:0;width:100%;max-width:100%;overflow-x:hidden;}
        #root,#app{width:100%;max-width:100%;}
        .dash-root{width:100vw;max-width:100vw;min-width:0;overflow-x:hidden;}
        .dash-header{padding:12px 20px;}
        .dash-content{padding:0 16px 16px;}
        .dash-tab-content{width:100%;overflow-x:auto;}
        .dash-table{width:100%;min-width:700px;table-layout:auto;}
        .dash-grid-2{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
        .dash-gantt-row{min-height:26px;}
        @media(max-width:1024px){
          .dash-grid-2{grid-template-columns:1fr;}
          .dash-header{padding:10px 14px;}
        }
        @media(max-width:768px){
          .dash-grid-2{grid-template-columns:1fr;}
          .dash-header{padding:8px 10px;}
          .dash-content{padding:0 8px 12px;}
          .dash-table{min-width:580px;}
          body{font-size:11px;}
        }
        @media(max-width:480px){
          .dash-table{min-width:420px;}
          body{font-size:10px;}
        }
      `;
      document.head.appendChild(style);
    }
    // Load XLSX
    if (window.XLSX) { setXlsxReady(true); return; }
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    script.onload = () => setXlsxReady(true);
    document.head.appendChild(script);
  }, []);

  // ── EXCEL PARSER ──────────────────────────────────────────────────────────
  function parseExcel(file) {
    if (!window.XLSX) { alert("XLSX library not loaded yet. Please wait a moment and try again."); return; }
    const reader = new FileReader();
    reader.onerror = () => alert("Failed to read file.");
    reader.onload = (e) => {
      try {
        const wb = window.XLSX.read(e.target.result, { type:"array", cellDates:true });

        function cellDate(ws2, ri, ci) {
          const addr = window.XLSX.utils.encode_cell({ r: ri, c: ci });
          const cell = ws2[addr];
          if (!cell) return null;
          if (cell.w) {
            const parsed = fmtDate(cell.w);
            if (parsed) return parsed;
          }
          if (cell.t === "d" && cell.v) {
            const d = new Date(new Date(cell.v).getTime() + 43200000);
            return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
          }
          if (cell.t === "n" && cell.v > 40000 && cell.v < 60000) {
            const d = new Date(Math.round((cell.v - 25569) * 86400 * 1000) + 43200000);
            return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
          }
          if (cell.v instanceof Date) {
            const d = new Date(cell.v.getTime() + 43200000);
            return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
          }
          return fmtDate(String(cell.v || "").trim());
        }
        function cellText(ws2, ri, ci) {
          const addr = window.XLSX.utils.encode_cell({ r: ri, c: ci });
          const cell = ws2[addr];
          if (!cell) return "";
          // Only treat as date serial if the cell has a date/time number format (nf contains date tokens)
          // or cell type is 'd' — do NOT convert plain quantity numbers like 40,703
          if (cell.t === "n" && cell.v > 40000 && cell.v < 60000) {
            const nf = (cell.z || cell.w || "");
            const isDateFmt = /[ymd\-\/]/i.test(nf) && !/^[\d,\.]+$/.test(String(cell.w||""));
            if (isDateFmt || cell.t === "d") {
              const d = new Date(Math.round((cell.v - 25569) * 86400 * 1000) + 43200000);
              return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
            }
          }
          if (cell.t === "d") {
            const d = new Date(cell.v.getTime() + 43200000);
            return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
          }
          // For numeric cells use raw .v — avoids comma-formatted "34,013" truncating at comma
          if (cell.t === "n") return String(cell.v);
          return String(cell.w || cell.v || "").trim();
        }

        function fmtDate(v) {
          if (!v) return null;
          const s = String(v).trim();
          if (!s || s === "0" || s === "null" || s === "undefined") return null;
          const m0 = s.match(/^(\d{4}-\d{2}-\d{2})/);
          if (m0) return m0[1];
          const m1 = s.match(/^(\d{1,2})[-\/]([A-Za-z]{3})[-\/](\d{2,4})$/);
          if (m1) {
            const months={jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11};
            const mo = months[m1[2].toLowerCase()];
            const yr = m1[3].length===2 ? 2000+parseInt(m1[3]) : parseInt(m1[3]);
            return `${yr}-${String(mo+1).padStart(2,"0")}-${String(parseInt(m1[1])).padStart(2,"0")}`;
          }
          const m2 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
          if (m2) return `${m2[3]}-${m2[1].padStart(2,"0")}-${m2[2].padStart(2,"0")}`;
          const serial = parseInt(s);
          if (!isNaN(serial) && serial > 40000 && serial < 60000) {
            const d = new Date(Math.round((serial - 25569)*86400*1000) + 43200000);
            return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
          }
          return null;
        }

        // normH strips non-ASCII and non-alphanumeric — used for normalised matching
        const normH = (s) => String(s||"").toLowerCase()
          .replace(/[\u0100-\uffff]/g,"").replace(/[^a-z0-9]/g,"");

        // For raw header matching (keeps Chinese chars for exact substring checks)
        const rawH = (s) => String(s||"").trim();

        const dataSheets = [];
        const sheetNames = (() => {
          const all = wb.SheetNames;
          // Skip summary/QJ/M33/Sheet2 sheets
          const skip = (n) => /M33-28|QJr|_QJ|QJ_|^M33|^Sheet2/i.test(n);
          const filtered = all.filter(n => !skip(n));

          // Normalize: lowercase, collapse spaces/underscores, fix common typos
          const norm = (n) => n.toLowerCase()
            .replace(/ext\s+baseme\b/i, 'ext bas')  // normalize "baseme" typo
            .replace(/exting\s+basement/i, 'ext bas') // normalize "exting basement"
            .replace(/[\s_]+/g, ' ').trim();

          // Strip revision suffix (r0/r1/r2/rN) and date variants (Oct26, Jan27, L4 etc)
          // to get a stable base key for grouping
          const baseOf = (n) => norm(n)
            .replace(/\s*r\d+\s*$/i, '')           // strip r0/r1/r2
            .replace(/\s*(oct|jan|feb|mar|apr|may|jun|jul|aug|sep|nov|dec)\d+\s*/i, ' ') // strip month+year
            .replace(/\s*l\d+\s*/i, ' ')            // strip L4/L3 etc
            .replace(/\s+/g, ' ').trim();

          // Revision score: higher = newer. r2 > r1 > r0 > no revision
          // Also: Jan27 > Oct26 (later milestone date)
          const revScore = (n) => {
            let score = 0;
            const rMatch = n.match(/r(\d+)\s*$/i); if (rMatch) score += parseInt(rMatch[1]) * 10;
            if (/jan27/i.test(n)) score += 5;
            if (/oct26/i.test(n)) score += 1;
            return score;
          };

          const groups = {};
          for (const n of filtered) {
            const base = baseOf(n);
            if (!groups[base]) groups[base] = [];
            groups[base].push(n);
          }

          return Object.values(groups).map(grp => grp.sort((a,b) => revScore(b) - revScore(a))[0]);
        })();
        for (const name of sheetNames) {
          const sheet = wb.Sheets[name];
          const rows2 = window.XLSX.utils.sheet_to_json(sheet, { header:1, defval:"", raw:true });

          // --- Step 1: find zone/level/activity cols by scanning ALL header rows (up to row 8)
          // We don't break early — scan all rows and keep last/best match so multi-row headers work
          let zoneCol=-1, actCol=-1, levelCol=-1;
          let headerEndRow = 0;
          for (let r = 0; r < Math.min(8, rows2.length); r++) {
            let foundSomething = false;
            for (let col = 0; col < Math.min(20, (rows2[r]||[]).length); col++) {
              const v   = normH(rows2[r][col]);
              const raw = rawH(rows2[r][col]);
              if (v === "zone" || raw === "Zone") { zoneCol = col; foundSomething = true; }
              if (v === "level") { levelCol = col; foundSomething = true; }
              if (raw === "工作内容" || raw.includes("工作内容") || v.includes("activityname") || v.includes("activitynamedetails") || v.includes("workingcont") || raw.includes("Activity Name")) { actCol = col; foundSomething = true; }
            }
            if (foundSomething) headerEndRow = r;
          }
          if (zoneCol >= 0 && actCol >= 0) {
            let blpSCol=-1,blpECol=-1,blpDurCol=-1,blpQtyCol=-1,blpProdCol=-1;
            let ccSCol=-1,ccECol=-1,ccDurCol=-1,ccQtyCol=-1,ccProdCol=-1;
            let actSCol=-1,actECol=-1,siteDurCol=-1,siteQtyCol=-1,devCol=-1,milestoneCol=-1;
            // Scan all header rows and all columns — first match wins per column
            for (let r2 = 0; r2 <= Math.min(headerEndRow + 1, 7); r2++) {
              for (let col2 = 0; col2 < Math.min(40, (rows2[r2]||[]).length); col2++) {
                const v   = normH(rows2[r2][col2]);  // strips Chinese + symbols
                const raw = rawH(rows2[r2][col2]);   // original trimmed
                if (!v && !raw) continue;

                // BLP Start: normH "blps" | raw "BLP-S"
                if (blpSCol < 0 && (v==="blps"||raw==="BLP-S"||raw==="BLP-Start"||v==="baselinestart")) blpSCol=col2;

                // BLP End: normH "blpe" — EXCLUDE BLP-E(参考) which also → "blpe"
                if (blpECol < 0 && (v==="blpe"||raw==="BLP-E"||raw==="BLP-End") && !raw.includes("参考")) blpECol=col2;

                // BLP Duration:
                //   Sheet 1 "BLP工期(d)" → "blpd"
                //   Sheet 2/3 "BLP Duration (Day)" → "blpdurationday"
                if (blpDurCol < 0 && (
                  v==="blpd"||v==="blpdurationday"||v==="blpworkingdays"||v==="blpdur"||v==="blpsminusblpe"||
                  raw.includes("BLP工期")||raw.includes("BLP Duration")||raw.includes("BLP Working Days")
                )) blpDurCol=col2;

                // BLP Volume:
                //   Sheet 1 "BL原始量(m³)" → "blm"
                //   Sheet 2 "Baseline Quantity (m3)" → "baselinequantitym3"
                //   Sheet 3 "BL原始量 (m³, m2, nos)" → "blmm2nos"
                if (blpQtyCol < 0 && (
                  v==="blm"||v==="blmm2nos"||v==="baselinequantitym3"||
                  raw.includes("BL原始量")||raw.includes("Baseline Quantity")||raw.includes("BL Qty")
                )) blpQtyCol=col2;

                // BLP Rate:
                //   Sheet 1 "BL工效(m³/d)" → "blmd"
                //   Sheet 2/3 "BL Productivity" → "blproductivity"
                if (blpProdCol < 0 && (
                  v==="blmd"||v==="blproductivity"||v==="blprate"||
                  raw.includes("BL工效")||raw.includes("BL效率")||raw.includes("BL Productivity")
                )) blpProdCol=col2;

                // CC Start: "CC-S(节点)" → "ccs"
                if (ccSCol < 0 && (
                  v==="ccs"||raw==="CC-S"||raw.includes("CC-S(")||
                  raw==="Catch Up-Start"||v==="catchupstart"||v==="ccstart"||v==="cc_start"
                )) ccSCol=col2;

                // CC End: "CC-E(节点)" → "cce"
                if (ccECol < 0 && (
                  v==="cce"||raw==="CC-E"||raw.includes("CC-E(")||
                  raw==="Catch Up-End"||v==="catchupend"||v==="ccend"
                )) ccECol=col2;

                // CC Duration:
                //   Sheet 1 "CC Dur(d)" → "ccdurd"
                //   Sheet 2/3 "Catch Up Duration (Day)" → "catchupdurationday"
                if (ccDurCol < 0 && (
                  v==="ccdurd"||v==="ccdur"||v==="catchupdurationday"||v==="ccworkingdays"||v==="cceminusccs"||
                  raw.includes("CC Dur")||raw.includes("Catch Up Duration")||raw.includes("CC Working Days")
                )) ccDurCol=col2;

                // CC Volume:
                //   All sheets "CC Qty 默认(m³)" → "ccqtym"
                //   Sheet 2/3 "Catch Up Quantity (m3)" → "catchupquantitym3"
                if (ccQtyCol < 0 && (
                  v==="ccqtym"||v==="catchupquantitym3"||v==="ccqtydefault"||
                  raw.includes("CC Qty")||raw.includes("Catch Up Quantity")||
                  (raw.includes("默认")&&raw.toLowerCase().startsWith("cc"))
                )) ccQtyCol=col2;

                // CC Rate:
                //   Sheet 1 "CC 工效(m³/d)" → "ccmd" (note space before 工)
                //   Sheet 2/3 "CC Productivity" → "ccproductivity"
                if (ccProdCol < 0 && (
                  v==="ccmd"||v==="ccproductivity"||v==="cproductivity"||v==="ccrate"||
                  raw.includes("CC工效")||raw.includes("CC 工效")||
                  raw.includes("CC Productivity")||raw.includes("Catch Up Productivity")
                )) ccProdCol=col2;

                // Site Start: "Date from Site -S" → "datefromsites"
                if (actSCol < 0 && (
                  v==="datefromsites"||v==="datefromsitestart"||
                  (raw.toLowerCase().replace(/[\s-]/g,"").includes("datefromsite")&&
                   (raw.trimEnd().endsWith("S")||raw.toLowerCase().includes("start")))
                )) actSCol=col2;

                // Site End: "Date from Site-E" → "datefromsitee"
                if (actECol < 0 && (
                  v==="datefromsitee"||v==="datefromsiteend"||
                  (raw.toLowerCase().replace(/[\s-]/g,"").includes("datefromsite")&&
                   (raw.trimEnd().endsWith("E")||raw.toLowerCase().includes("end")))
                )) actECol=col2;

                // Site Duration: "Site Dur(d)" → "sitedurd"
                if (siteDurCol < 0 && (v==="sitedurd"||v==="siteduration"||raw.toLowerCase().includes("site dur"))) siteDurCol=col2;

                // Site Qty
                if (siteQtyCol < 0 && (v.includes("siteqty")||v.includes("sitequant")||raw.toLowerCase().includes("site qty"))) siteQtyCol=col2;

                // Milestone / 节点
                if (milestoneCol < 0 && (raw.includes("节点")||v==="milestone"||v.includes("quarterly"))) milestoneCol=col2;

                // Delta time
                if (devCol < 0 && (raw.includes("ΔTime")||v.includes("deltatime"))) devCol=col2;
              }
            }
            // Positional fallbacks — only used if header scan missed
            const off = zoneCol;
            if (blpSCol    < 0) blpSCol    = off+3;
            if (blpECol    < 0) blpECol    = off+4;
            if (blpDurCol  < 0) blpDurCol  = off+5;
            if (blpQtyCol  < 0) blpQtyCol  = off+6;
            if (blpProdCol < 0) blpProdCol = off+7;
            if (ccSCol     < 0) ccSCol     = off+8;
            if (ccECol     < 0) ccECol     = off+9;
            if (ccDurCol   < 0) ccDurCol   = off+10;
            if (ccQtyCol   < 0) ccQtyCol   = off+11;
            if (ccProdCol  < 0) ccProdCol  = off+12;
            if (actSCol    < 0) actSCol    = off+13;
            if (actECol    < 0) actECol    = off+14;
            if (siteDurCol < 0) siteDurCol = off+15;
            if (siteQtyCol < 0) siteQtyCol = off+16;
            if (milestoneCol < 0) milestoneCol = off+2;
            // Collision guard: if two fields landed on same col, the later one steps forward
            // Order of priority: blpDur < blpQty < blpProd < ccS < ccE < ccDur < ccQty < ccProd
            const usedCols = new Set();
            const assignUnique = (col, fallback) => {
              if (!usedCols.has(col)) { usedCols.add(col); return col; }
              while (usedCols.has(fallback)) fallback++;
              usedCols.add(fallback); return fallback;
            };
            [blpSCol,blpECol].forEach(c=>usedCols.add(c));
            blpDurCol  = assignUnique(blpDurCol,  blpECol+1);
            blpQtyCol  = assignUnique(blpQtyCol,  blpDurCol+1);
            blpProdCol = assignUnique(blpProdCol, blpQtyCol+1);
            [ccSCol,ccECol].forEach(c=>usedCols.add(c));
            ccDurCol   = assignUnique(ccDurCol,   ccECol+1);
            ccQtyCol   = assignUnique(ccQtyCol,   ccDurCol+1);
            ccProdCol  = assignUnique(ccProdCol,  ccQtyCol+1);
            dataSheets.push({ name, sheet, rows: rows2, zoneCol, actCol, levelCol: levelCol >= 0 ? levelCol : zoneCol-1,
              headerEndRow,
              blpSCol, blpECol, blpDurCol, blpQtyCol, blpProdCol,
              ccSCol, ccECol, ccDurCol, ccQtyCol, ccProdCol,
              actSCol, actECol, siteDurCol, siteQtyCol, devCol, milestoneCol });
            console.log(`[COLS] ${name}: zone=${zoneCol} act=${actCol} blpQty=${blpQtyCol} ccS=${ccSCol} ccE=${ccECol} ccDur=${ccDurCol} ccQty=${ccQtyCol}`);
          }
        }

        if (dataSheets.length === 0) {
          alert(`No schedule sheets found. Scanned: ${wb.SheetNames.join(", ")}. Could not find 'Zone' + 'Activity' headers.`);
          return;
        }

        function parseZoneLevel(rawZone, rawLevel) {
          const s = String(rawZone||"").trim();
          const sl = s.toLowerCase().replace(/^zone\s+/i,"").trim();
          let extractedLevel = String(rawLevel||"").trim();
          if (sl.includes("transfer") || sl.includes("l05")) {
            extractedLevel = extractedLevel || "L5 Transfer Plate";
          } else {
            const lvlMatch = s.match(/[Ll]0?(\d+)/);
            if (lvlMatch && !extractedLevel) {
              extractedLevel = `L${parseInt(lvlMatch[1])}`;
            }
          }
          let zone = "OTHER";
          if (sl.match(/^a-?2\.?1/) || sl.match(/^a2\.?1/)) zone = "Zone A-2.1";
          else if (sl.match(/^a-?2\.?2/) || sl.match(/^a2\.?2/)) zone = "Zone A-2.2";
          else if (sl.match(/^a-?2/)) zone = "Zone A-2.1";
          else if (sl.match(/^a-?1/)) zone = "Zone A-1";
          else if (sl.match(/^a-?3/)) zone = "Zone A-3";
          else if (sl.match(/^a-?4/)) zone = "Zone A-4";
          else if (sl.match(/^b-?2\.?1/)) zone = "Zone B-2.1";
          else if (sl.match(/^b-?2\.?2/)) zone = "Zone B-2.2";
          else if (sl.match(/^b-?3\.?1/)) zone = "Zone B-3.1";
          else if (sl.match(/^b-?3\.?2/)) zone = "Zone B-3.2";
          else if (sl.match(/^c[-._]?1/) || sl.match(/^marine.*c[-._]?1/) || sl.match(/^c1/)) zone = "Zone C-1";
          else if (sl.match(/^c[-._]?2/) || sl.match(/^marine.*c[-._]?2/) || sl.match(/^c2/)) zone = "Zone C-2";
          else if (sl.match(/^c[-._]?3/) || sl.match(/^marine.*c[-._]?3/) || sl.match(/^c3/)) zone = "Zone C-3";
          else if (sl.match(/^p-?1/) || sl.match(/^p1/)) zone = "Zone P-1";
          else if (sl.match(/^p-?2/) || sl.match(/^p2/)) zone = "Zone P-2";
          else if (sl.match(/^p-?3/) || sl.match(/^p3/)) zone = "Zone P-3";
          else if (sl.match(/^p-?4/) || sl.match(/^p4/)) zone = "Zone P-4";
          else if (sl.match(/^t-?1/) || sl.match(/^t1/)) zone = "Zone T-1";
          else if (sl.match(/^t-?2/) || sl.match(/^t2/)) zone = "Zone T-2";
          else if (sl.match(/^t-?3/) || sl.match(/^t3/)) zone = "Zone T-3";
          else if (sl.match(/^t-?4/) || sl.match(/^t4/)) zone = "Zone P-4"; // T-4 = transfer/core extension of P-4
          // Last resort: try to infer from raw string if still OTHER
          if (zone === "OTHER") {
            const rs = s.replace(/^zone\s*/i,"").trim();
            if (/^[Cc][-_\s]?1/i.test(rs)) zone = "Zone C-1";
            else if (/^[Cc][-_\s]?2/i.test(rs)) zone = "Zone C-2";
            else if (/^[Cc][-_\s]?3/i.test(rs)) zone = "Zone C-3";
            else if (/^[Cc][-_\s]?[Pp][-_\s]?[123]/i.test(rs)) zone = "Zone C-1"; // CP variants
          }
          return { zone, level: extractedLevel };
        }

        function getZoneProdKey(raw) {
          const s = String(raw||"").toLowerCase().replace(/^zone\s+/i,"").trim();
          if (s.match(/^a-?[134]/)) return "A1A3";
          if (s.match(/^a-?2/)) return "A2";
          if (s.match(/^b/)) return "B";
          if (s.match(/^c/)) return "C";
          if (s.match(/^p/)) return "P";
          if (s.match(/^t/)) return "T";
          return "OTHER";
        }

        const newTasks = [];
        const prodByKey = {};
        const seenKeys = new Set(); // dedup: zone+activity+blp_s
        let parsed = 0;

        for (const { name: sName, sheet: ws2, rows, zoneCol, actCol, levelCol,
              headerEndRow,
              blpSCol, blpECol, blpDurCol, blpQtyCol, blpProdCol,
              ccSCol, ccECol, ccDurCol, ccQtyCol, ccProdCol,
              actSCol, actECol, siteDurCol, siteQtyCol, devCol, milestoneCol } of dataSheets) {
          for (let i = headerEndRow + 1; i < rows.length; i++) {
            const zoneRaw  = cellText(ws2, i, zoneCol);
            const activity = cellText(ws2, i, actCol);
            if (!zoneRaw || !activity) continue;
            const zoneL = zoneRaw.toLowerCase();
            const actL  = activity.toLowerCase();
            if (["zone","b","level","zone "].includes(zoneL)) continue;
            if (actL.includes("activity") || activity === "工作内容" || actL.includes("baseline") || actL.includes("blp-start")) continue;
            // Skip rows where activity is just a zone label, level label, or section header
            if (/^(zone|marine|p4-l|p4 l|level|area)\b/i.test(activity.trim())) continue;
            if (/^(zone [a-z][-.\d]*|[abcpt]\d[-.\d]*)\s*$/i.test(activity.trim())) continue;
            if (!zoneRaw.match(/[A-Za-z]/)) continue;
            if (activity.match(/^\d{4}-\d{2}-\d{2}$/) || activity.match(/^\d{1,2}-[A-Za-z]{3}-\d{2,4}$/)) continue;

            const levelRaw = cellText(ws2, i, levelCol);
            const { zone: zoneNorm, level } = parseZoneLevel(zoneRaw, levelRaw);
            const prodKey  = getZoneProdKey(zoneRaw);
            const blp_s    = cellDate(ws2, i, blpSCol);
            const blp_e    = cellDate(ws2, i, blpECol);
            const blp_dur  = parseFloat(cellText(ws2, i, blpDurCol)) || 0;
            const volume   = parseFloat(cellText(ws2, i, blpQtyCol)) || 0;
            const blpRate  = parseFloat(cellText(ws2, i, blpProdCol)) || null;
            const cc_s     = cellDate(ws2, i, ccSCol);
            const cc_e     = cellDate(ws2, i, ccECol);
            const cc_dur   = parseFloat(cellText(ws2, i, ccDurCol)) || 0;
            const ccQty    = parseFloat(cellText(ws2, i, ccQtyCol)) || null;
            const ccRate   = parseFloat(cellText(ws2, i, ccProdCol)) || null;
            const actual_s = cellDate(ws2, i, actSCol);
            const actual_e = cellDate(ws2, i, actECol);
            const site_dur = parseFloat(cellText(ws2, i, siteDurCol)) || null;
            const site_qty = parseFloat(cellText(ws2, i, siteQtyCol)) || null;
            const devRaw   = parseFloat(cellText(ws2, i, devCol));
            const dev      = !isNaN(devRaw) ? devRaw : (blp_dur&&cc_dur ? parseFloat(((cc_dur-blp_dur)/blp_dur*100).toFixed(1)) : 0);

            const dedupKey = `${zoneNorm}||${activity}||${level||""}||${blp_s||""}||${ccQty||""}||${cc_e||""}`;
            if (seenKeys.has(dedupKey)) continue;
            seenKeys.add(dedupKey);
            newTasks.push({
              id:`xl-${sName}-${i}`, zone:zoneNorm, level, activity,
              blp_s, blp_e, blp_dur, cc_s, cc_e, cc_dur, actual_s, actual_e,
              site_dur, site_qty, volume, cc_qty: ccQty
            });
            if (!prodByKey[prodKey]) prodByKey[prodKey] = [];
            // Only add to prod matrix if not already present (same zone + level + task)
            if (!prodByKey[prodKey].some(r=>r.task===activity && r.zone===zoneNorm && r.level===level)) {
              prodByKey[prodKey].push({ task:activity, zone:zoneNorm, level, volume, blpDays:blp_dur, blpRate, ccDays:cc_dur, ccRate, ccQty, idleWait:0, dev:isFinite(dev)?dev:0 });
            }
            parsed++;
          }
        }

        if (parsed === 0) {
          alert("No data rows found. Check that your Excel has Zone names in column B and Activities in column C.");
          return;
        }
        setUploadedFile({ name: file.name, tasks: newTasks, prodData: prodByKey });
        setTasks(newTasks);
        // DEBUG: log unique zones parsed
        const uniqueZones = [...new Set(newTasks.map(t=>t.zone))].sort();
        console.log("[PARSE] Unique zones found:", uniqueZones);
        console.log("[PARSE] Total tasks:", newTasks.length);

        const firstZoneWithData = newTasks[0]?.zone;
        if (firstZoneWithData) {
          const matchedDef = ALL_ZONE_DEFS.find(z => z.taskZones.includes(firstZoneWithData));
          if (matchedDef) {
            setActiveZoneKey(null); // default to full area overview, user can drill into zone
            const matchedArea = AREA_GROUPS.find(a => a.subgroups.some(sg => sg.zones.some(z => z.key === matchedDef.key)));
            if (matchedArea) setActiveArea(matchedArea.key);
          }
        }
      } catch(err) {
        alert("Error parsing Excel: " + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  const area    = AREA_GROUPS.find(a=>a.key===activeArea)||AREA_GROUPS[0];
  const zoneDef = getZoneDef(activeZoneKey);
  const col     = zoneDef?.color || area.color;
  const activeProdData = uploadedFile?.prodData || PROD_DATA;
  const prodRows = useMemo(()=>{
    const ag = AREA_GROUPS.find(a=>a.key===activeArea);
    if(!ag) return [];
    if(zoneDef) {
      // Specific zone selected — filter by taskZones list so P-3 rows don't bleed into P-4
      const allowed = new Set(zoneDef.taskZones.map(z=>z.toLowerCase().trim()));
      const base = activeProdData[zoneDef.prodKey]||[];
      const filtered = base.filter(r => r.zone && allowed.has(r.zone.toLowerCase().trim()));
      // Fall back to unfiltered if zone field not yet populated (demo data)
      return filtered.length > 0 ? filtered : base;
    }
    // No zone selected — show all rows for the active area, filtered by area's taskZones
    const areaZones = new Set(
      ag.subgroups.flatMap(sg=>sg.zones.flatMap(z=>z.taskZones.map(tz=>tz.toLowerCase().trim())))
    );
    const keys = [...new Set(ag.subgroups.flatMap(sg=>sg.zones.map(z=>z.prodKey)))];
    const all = keys.flatMap(k=>activeProdData[k]||[]);
    const filtered = all.filter(r => r.zone && areaZones.has(r.zone.toLowerCase().trim()));
    return filtered.length > 0 ? filtered : all;
  },[activeProdData, zoneDef, activeArea]);

  const avgDev = useMemo(()=>{
    const d=prodRows.map(r=>Math.abs(r.dev)).filter(v=>isFinite(v)&&Math.abs(v)<300);
    return d.length?(d.reduce((a,b)=>a+b,0)/d.length).toFixed(1):"—";
  },[prodRows]);
  const syncIdx=Math.max(0,Math.min(100,100-parseFloat(avgDev||0)));

  const [msS,msE]=MS_RANGES[activeMilestone];
  const msTasks=tasks.filter(t=>t.cc_e>=msS&&t.cc_e<=msE);
  const plannedPct=msTasks.length?(msTasks.length/tasks.length*100).toFixed(1):"0.0";
  const actualPct=msTasks.filter(t=>t.actual_e).length?(msTasks.filter(t=>t.actual_e).length/msTasks.length*100).toFixed(1):"0.0";
  const msEndPct=useMemo(()=>{const e=MS_RANGES[activeMilestone]?.[1];return e?Math.max(0,Math.min(100,(new Date(e).getTime()-TL_START)/TL_MS*100)):null;},[activeMilestone]);

  const areaAllTaskZones = useMemo(()=>{
    const ag = AREA_GROUPS.find(a=>a.key===activeArea);
    if(!ag) return new Set();
    return new Set(ag.subgroups.flatMap(sg=>sg.zones.flatMap(z=>z.taskZones)));
  },[activeArea]);

  const ganttTasks=useMemo(()=>{
    if(!zoneDef){
      return tasks.filter(t=>{
        if(!areaAllTaskZones.has(t.zone)) return false;
        if(filterLevel!=="all" && t.level && t.level!=="—" && !t.level.startsWith(filterLevel) && !t.level.toLowerCase().includes("-"+filterLevel.toLowerCase())) return false;
        return true;
      });
    }
    const allowed=new Set(zoneDef?.taskZones||[]);
    return tasks.filter(t=>{
      if(!allowed.has(t.zone))return false;
      if(zoneDef?.levelFilter){
        const lf = zoneDef?.levelFilter?.toLowerCase();
        const tl = (t.level||"").toLowerCase();
        if(lf === "l5 transfer"){
          if(!tl.includes("transfer") && !tl.includes("l5 t")) return false;
        } else if(lf === "l5"){
          if(!tl.includes("l5") && !tl.startsWith("l5")) return false;
          if(tl.includes("transfer")) return false;
        } else {
          // match "L1" against both "L1" and "P2-L1" style level values
          if(!tl.startsWith(lf) && !tl.includes("-"+lf) && !tl.endsWith(lf)) return false;
        }
      }
      if(filterLevel!=="all" && t.level && t.level!=="—" && !t.level.startsWith(filterLevel) && !t.level.toLowerCase().includes("-"+filterLevel.toLowerCase())) return false;
      return true;
    });
  },[tasks,activeZoneKey,zoneDef,filterLevel,areaAllTaskZones]);

  function saveEdit(id){setTasks(p=>p.map(t=>t.id===id?{...t,actual_s:editVal.actual_s||null,actual_e:editVal.actual_e||null}:t));setEditing(null);}
  const ticks=getMonthTicks(),LW=230;

  return (
    <div className="dash-root" style={{fontFamily:"'Poppins',sans-serif",background:C.bg,minHeight:"100vh",width:"100vw",maxWidth:"100vw",color:C.text,fontSize:13,overflowX:"hidden"}}>

      {/* HEADER */}
      <div style={{background:C.nav,borderBottom:`1px solid ${C.border}`,padding:"12px 20px 0 20px"}}>

        {/* ROW 1: Title + Upload  |  Weather top-right */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8,gap:12}}>
          <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
            <AnimatedDashboardIcon C={C}/>
            <div style={{fontSize:15,fontWeight:800,color:C.headerText,letterSpacing:-0.3,textTransform:"uppercase"}}>Construction Productivity & Schedule Board</div>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" style={{display:"none"}}
              onChange={e=>{ if(e.target.files[0]) parseExcel(e.target.files[0]); e.target.value=""; }}/>
            <button onClick={()=>xlsxReady&&fileInputRef.current.click()} style={{
              padding:"5px 12px",borderRadius:7,border:`1.5px solid ${uploadedFile?"#22c55e":C.muted}`,
              background:uploadedFile?"#22c55e22":C.inputBg,color:uploadedFile?"#22c55e":xlsxReady?C.sub:C.muted,
              cursor:xlsxReady?"pointer":"default",fontSize:11,fontFamily:"inherit",fontWeight:800,display:"flex",alignItems:"center",gap:6
            }}>
              <span>📂</span>
              {uploadedFile ? `✓ ${uploadedFile.name}` : xlsxReady ? "Upload Excel" : "Loading..."}
            </button>
            {uploadedFile && (
              <button onClick={()=>{setUploadedFile(null);setTasks(ALL_TASKS);}} style={{
                padding:"4px 10px",borderRadius:7,border:`1px solid ${C.muted}`,
                background:"transparent",color:C.sub,cursor:"pointer",fontSize:10,fontFamily:"inherit"
              }}>✕ Reset</button>
            )}
          </div>
          {/* Weather — top right, same line as title */}
          <WeatherWidget C={C}/>
        </div>

        {/* ROW 2: Light/Dark toggle + Milestones */}
        <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",marginBottom:8}}>
          <button onClick={()=>setLightMode(m=>!m)} style={{
            display:"flex",alignItems:"center",gap:6,padding:"4px 12px",borderRadius:20,
            border:`1.5px solid ${C.border}`,background:C.inputBg,color:C.text,
            cursor:"pointer",fontSize:11,fontFamily:"inherit",fontWeight:700,
            transition:"all 0.2s",whiteSpace:"nowrap"
          }}>
            {lightMode ? "🌙 Dark Mode" : "☀️ Light Mode"}
          </button>
          {(tab==="gantt" || tab==="health") && <>
          <span style={{color:C.sub,fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginRight:2}}>Milestone:</span>
          {MILESTONES.map(m=>(
            <button key={m} onClick={()=>setActiveMilestone(m)} style={{padding:"4px 9px",borderRadius:5,border:"none",cursor:"pointer",fontSize:11,fontFamily:"inherit",fontWeight:800,background:activeMilestone===m?"#ef4444":C.tabInactive,color:activeMilestone===m?"#fff":C.tabInactiveText}}>{m}</button>
          ))}</>}
        </div>

        <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",paddingBottom:8,borderBottom:`1px solid ${C.border}`}}>
          <span style={{color:C.sub,fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:0.8,marginRight:4}}>Area:</span>
          {AREA_GROUPS.map(ag=>(
            <button key={ag.key} onClick={()=>{setActiveArea(ag.key);setActiveZoneKey(null);setFilterLevel("all");}} style={{
              padding:"6px 16px",borderRadius:8,border:`1.5px solid ${activeArea===ag.key?ag.color:C.muted}`,
              background:activeArea===ag.key?ag.color+"33":"transparent",color:activeArea===ag.key?ag.color:C.sub,
              cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:800,display:"flex",alignItems:"center",gap:6}}>
              <span>{ag.icon}</span>{ag.label}
              <span style={{background:activeArea===ag.key?ag.color+"33":C.muted+"44",color:activeArea===ag.key?ag.color:C.sub,fontSize:9,fontWeight:800,padding:"1px 5px",borderRadius:99}}>
                {ag.subgroups.flatMap(sg=>sg.zones).length} zones
              </span>
            </button>
          ))}
          <div style={{flex:1}}/>
        </div>

        {tab!=="analysis" && <div style={{paddingTop:7,paddingBottom:7,borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"flex-start",gap:0}}>
          <div style={{flex:1,minWidth:0}}>
          {area.subgroups.map(sg=>(
            <div key={sg.key} style={{display:"flex",alignItems:"center",gap:5,flexWrap:"wrap",marginBottom:4}}>
              <span style={{color:sg.color,fontSize:9,fontWeight:800,textTransform:"uppercase",letterSpacing:1,background:sg.color+"22",padding:"2px 8px",borderRadius:4,minWidth:100,textAlign:"center"}}>{sg.label}</span>
              {sg.zones.map(z=>(
                <button key={z.key} onClick={()=>{setActiveZoneKey(z.key);setFilterLevel("all");}} style={{
                  padding:"3px 12px",borderRadius:20,border:`1px solid ${(activeZoneKey===z.key)?z.color:C.muted}`,
                  background:activeZoneKey===z.key?z.color+"33":"transparent",color:activeZoneKey===z.key?z.color:C.sub,
                  cursor:"pointer",fontSize:10,fontFamily:"inherit",fontWeight:700,transition:"all 0.12s"}}>
                  {z.label}
                </button>
              ))}
              {sg.zones.find(z=>z.key===activeZoneKey)&&(
                <span style={{color:C.muted,fontSize:9,fontStyle:"italic",marginLeft:4}}>{sg.zones.find(z=>z.key===activeZoneKey).desc}</span>
              )}
            </div>
          ))}
          </div>
          <ZoneKeyPlan
            activeZoneKey={activeZoneKey}
            activeArea={activeArea}
            setActiveZoneKey={(key)=>{setActiveZoneKey(key);setFilterLevel("all");}}
            setActiveArea={(areaKey)=>{setActiveArea(areaKey);setActiveZoneKey(null);setFilterLevel("all");}}
            C={C}
          />
        </div>}

        <div style={{display:"flex",alignItems:"center",gap:5,flexWrap:"wrap",paddingTop:7,paddingBottom:10}}>
          {!zoneDef?.levelFilter && tab!=="analysis" && (() => {
            const activeAG = AREA_GROUPS.find(a => a.key === activeArea);
            const activeSG = activeAG?.subgroups.find(sg => sg.zones.some(z => z.key === activeZoneKey));
            const activeSGKey = activeSG?.key;

            let levels = AREA_LEVELS[activeArea] || [];

            if (activeArea === 'MARINE') {
              if (['P1','P3'].includes(activeZoneKey))       levels = ['L1','L2','L3','L4'];
              else if (['C1','C2','C3'].includes(activeZoneKey)) levels = ['L1'];
              else if (['A1','A3','A4'].includes(activeZoneKey)) levels = ['B1','B2','L1'];
              else if (activeSGKey === 'MARINE_P')           levels = ['L1','L2','L3','L4'];
              else if (activeSGKey === 'MARINE_C')           levels = ['L1'];
              else if (activeSGKey === 'MARINE_A')           levels = ['B1','B2','L1'];
            } else if (activeArea === 'NEW_BASEMENT') {
              if (['A21','A22'].includes(activeZoneKey))     levels = ['B1','B2','L1'];
              else if (activeZoneKey === 'P2_ALL' || activeSGKey === 'NEW_P2') levels = ['L1','L2','L3','L4','L5'];
              else if (activeSGKey === 'NEW_A')              levels = ['B1','B2','L1'];
            } else if (activeArea === 'EXIST_BASEMENT') {
              if (['B21','B31'].includes(activeZoneKey))     levels = ['B1','B2','L1'];
              else if (activeZoneKey === 'P4_ALL' || activeSGKey === 'EXIST_P4') levels = ['L1','L2','L3','L4','L5'];
              else if (activeSGKey === 'EXIST_B')            levels = ['B1','B2','L1'];
            }

            return <>
              <span style={{color:C.sub,fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:0.8,marginRight:2}}>Level:</span>
              {["all",...levels].map(l=>(
                <button key={l} onClick={()=>setFilterLevel(l)} style={{
                  padding:"3px 10px",borderRadius:20,border:`1px solid ${filterLevel===l?C.amber:C.muted}`,
                  background:filterLevel===l?C.amber+"22":"transparent",color:filterLevel===l?C.amber:C.sub,
                  cursor:"pointer",fontSize:10,fontFamily:"inherit",fontWeight:700}}>
                  {l==="all"?"All":l}
                </button>
              ))}
            </>;
          })()}
          <div style={{flex:1}}/>
          <div style={{display:"flex",gap:4,flexWrap:"wrap",alignItems:"center"}}>
            {[["gantt","📊 Gantt",false],["analysis","📈 Productivity",false],["cards","🃏 Prod Cards",false],["resources","📋 Resources",true],["scurve","📉 S-Curve",true],["settlement","🏦 Settlement",true],["health","🏥 Schedule Health",true],["hedging","⚖️ Hedging",true]].map(([v,l,playground])=>(
              <div key={v} style={{position:'relative',display:'inline-flex',flexDirection:'column',alignItems:'center',gap:1}}>
                <button onClick={()=>setTab(v)} title={playground?"⚠️ Playground only — do not extract data from this page":undefined} style={{
                  padding:"5px 13px",borderRadius:4,border:playground?`1px dashed ${C.muted}`:"none",
                  cursor:"pointer",fontSize:11,fontFamily:"inherit",
                  background: tab===v ? (playground?'#475569':col) : playground ? 'transparent' : C.tabInactive,
                  color: tab===v ? "#fff" : playground ? C.muted : C.tabInactiveText,
                  fontWeight:700,
                  opacity: playground && tab!==v ? 0.55 : 1,
                }}>{l}</button>
                {playground && <span style={{fontSize:6,color:C.muted,fontWeight:600,letterSpacing:0.3,textTransform:'uppercase',lineHeight:1}}>playground</span>}
              </div>
            ))}
          </div>
          {['resources','scurve','settlement','health','hedging'].includes(tab) && (
            <div style={{margin:'0 20px 0',padding:'4px 12px',background:'#f59e0b18',border:'1px dashed #f59e0b',borderRadius:6,display:'flex',alignItems:'center',gap:6}}>
              <span style={{fontSize:12}}>⚠️</span>
              <span style={{fontSize:9,color:'#f59e0b',fontWeight:700}}>PLAYGROUND — Data on this page is not validated. Do not use for reporting or decision-making.</span>
            </div>
          )}
        </div>
      </div>

      {/* STATS STRIP + LEGEND — Gantt only */}
      {tab==="gantt" && <>
      <div style={{display:"flex",background:C.panel,borderBottom:`1px solid ${C.border}`,flexWrap:"wrap"}}>
        {[["Area",area.label],["Zone",zoneDef?.label||"All Zones"],["Tasks",ganttTasks.length],["In Milestone",msTasks.length]].map(([l,v],i)=>(
          <div key={i} style={{flex:1,minWidth:90,padding:"7px 12px",borderRight:`1px solid ${C.border}`}}>
            <div style={{color:C.sub,fontSize:9,textTransform:"uppercase",letterSpacing:0.5}}>{l}</div>
            <div style={{color:col,fontSize:12,fontWeight:800,marginTop:1}}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{display:"flex",gap:16,padding:"6px 20px",background:C.panel,borderBottom:`1px solid ${C.border}`,flexWrap:"wrap"}}>
        {[[C.blp,"BLP Baseline"],["#3b82f6","Catch Up Plan"],["#84cc16","Site Planned"]].map(([cl,lb])=>(
          <div key={lb} style={{display:"flex",alignItems:"center",gap:5}}>
            <div style={{width:16,height:4,background:cl,borderRadius:3}}/><span style={{color:C.sub,fontSize:10}}>{lb}</span>
          </div>
        ))}
        <div style={{marginLeft:"auto",display:"flex",gap:14,alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:2,height:11,background:C.amber}}/><span style={{color:C.sub,fontSize:10}}>Today {TODAY_LABEL}</span></div>
          <div style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:2,height:11,background:"#ef4444"}}/><span style={{color:C.sub,fontSize:10}}>Milestone: {activeMilestone}</span></div>
        </div>
      </div>
      </>}

      {tasks.length === 0 && (
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:400,gap:20,color:C.sub}}>
          <div style={{fontSize:48}}>📂</div>
          <div style={{fontSize:18,fontWeight:700,color:C.text}}>No Data Loaded</div>
          <div style={{fontSize:13}}>Upload your Excel file to get started</div>
          <button onClick={()=>fileInputRef.current?.click()} style={{
            padding:"10px 28px",borderRadius:8,border:`2px solid #3b82f6`,
            background:"#3b82f622",color:"#3b82f6",cursor:"pointer",
            fontSize:14,fontWeight:700,fontFamily:"inherit"
          }}>📤 Upload Excel</button>
        </div>
      )}

      {tasks.length > 0 && ['gantt','analysis','cards'].includes(tab) && (
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 20px', background:'#f59e0b18', borderBottom:`1px solid #f59e0b44` }}>
          <span style={{ fontSize:14 }}>⚠️</span>
          <span style={{ fontSize:10, color:'#d97706', fontWeight:600 }}>
            Please double-check parsed data — column detection may vary across Excel versions. Verify key figures before use.
          </span>
        </div>
      )}

      {tasks.length > 0 && tab==="gantt"    && <GanttView    tasks={ganttTasks} col={col} ticks={ticks} LW={LW} msEndPct={msEndPct} activeMilestone={activeMilestone} MS_RANGES={MS_RANGES} C={C}/>}
      {tasks.length > 0 && tab==="analysis" && <AnalysisView rows={prodRows}    col={col} zoneDef={zoneDef} avgDev={avgDev} syncIdx={syncIdx} P1P3_STRUCT={P1P3_STRUCT} C={C}/>}
      {tasks.length > 0 && tab==="cards"    && <ProductivityCardView tasks={ganttTasks} col={col} areaAllTaskZones={areaAllTaskZones} zoneDef={zoneDef} areaLabel={area.label} C={C}/>}
      {tasks.length > 0 && tab==="resources" && <ResourceTrackerView tasks={ganttTasks} col={col} areaAllTaskZones={areaAllTaskZones} zoneDef={zoneDef} C={C}/>}
      {tasks.length > 0 && tab==="scurve"   && <SCurveView   tasks={ganttTasks} col={col} areaAllTaskZones={areaAllTaskZones} zoneDef={zoneDef} C={C}/>}
      {tasks.length > 0 && tab==="settlement" && <SettlementView tasks={ganttTasks} col={col} areaAllTaskZones={areaAllTaskZones} zoneDef={zoneDef} filterLevel={filterLevel} C={C}/>}
      {tasks.length > 0 && tab==="health"   && <HealthView   tasks={tasks}      activeMilestone={activeMilestone} setActiveMilestone={setActiveMilestone} MS_RANGES={MS_RANGES} MILESTONES={MILESTONES} C={C} lightMode={lightMode}/>}
      {tasks.length > 0 && tab==="hedging"  && <HedgingView  tasks={tasks}      activeArea={activeArea} activeZoneKey={activeZoneKey} areaAllTaskZones={areaAllTaskZones} zoneDef={zoneDef} C={C} lightMode={lightMode}/>}
    </div>
  );
}

// ─── GANTT ────────────────────────────────────────────────────────────────────
function GanttView({tasks,col,ticks,LW,msEndPct,activeMilestone,MS_RANGES,C}){
  const zones=[...new Set(tasks.map(t=>t.zone))];
  const [tooltip, setTooltip] = useState(null);
  return(
    <div style={{overflowX:"auto",position:"relative"}} onMouseLeave={()=>setTooltip(null)}>
      {tooltip && (
        <div style={{
          position:"fixed", left:tooltip.x+14, top:tooltip.y-10, zIndex:9999,
          background:C.panel, border:`1px solid ${C.border}`, borderRadius:12,
          padding:"12px 16px", minWidth:260, maxWidth:340, pointerEvents:"none",
          boxShadow:"0 4px 24px rgba(0,0,0,0.15)"
        }}>
          <div style={{fontWeight:700,color:C.text,fontSize:12,marginBottom:6,lineHeight:1.4}}>{tooltip.task.activity}</div>
          <div style={{display:"grid",gridTemplateColumns:"90px 1fr",gap:"3px 8px",fontSize:11}}>
            <span style={{color:C.sub}}>Zone</span><span style={{color:C.text}}>{tooltip.task.zone}</span>
            <span style={{color:C.sub}}>Level</span><span style={{color:C.text}}>{tooltip.task.level||"—"}</span>
            <span style={{color:C.sub}}>BLP</span><span style={{color:C.text}}>{tooltip.task.blp_s} → {tooltip.task.blp_e} ({tooltip.task.blp_dur}d)</span>
            <span style={{color:C.sub}}>Catch Up Plan</span>
            <span style={{color:col,display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
              {tooltip.task.cc_s ? `${tooltip.task.cc_s} → ${tooltip.task.cc_e} (${tooltip.task.cc_dur}d)` : "—"}
              {tooltip.task.blp_dur && tooltip.task.cc_dur ? (()=>{
                const d = tooltip.task.cc_dur - tooltip.task.blp_dur;
                return d < 0
                  ? <span style={{background:"#22c55e22",color:"#22c55e",fontSize:9,fontWeight:800,padding:"1px 7px",borderRadius:20,border:"1px solid #22c55e66",whiteSpace:"nowrap"}}>⚡ {d}d faster</span>
                  : d > 0
                  ? <span style={{background:C.amber+"22",color:C.amber,fontSize:9,fontWeight:800,padding:"1px 7px",borderRadius:20,border:`1px solid ${C.amber}55`,whiteSpace:"nowrap"}}>⚠ +{d}d slower</span>
                  : <span style={{color:C.sub,fontSize:9}}>= same</span>;
              })() : null}
            </span>
            <span style={{color:C.sub}}>Site Planned</span><span style={{color:"#22c55e"}}>{tooltip.task.actual_s ? `${tooltip.task.actual_s} → ${tooltip.task.actual_e||"ongoing"}${tooltip.task.actual_e ? ` (${Math.round((new Date(tooltip.task.actual_e)-new Date(tooltip.task.actual_s))/86400000)+1}d)` : ""}` : "—"}</span>
          </div>
          {(tooltip.task.volume > 0 || tooltip.task.cc_qty > 0 || tooltip.task.site_qty > 0) && (
            <div style={{marginTop:8,paddingTop:8,borderTop:`1px solid ${C.border}`,display:"flex",gap:12,flexWrap:"wrap"}}>
              {tooltip.task.volume > 0 && (
                <div style={{display:"flex",flexDirection:"column",gap:1}}>
                  <span style={{fontSize:8,color:C.sub,fontWeight:700,textTransform:"uppercase",letterSpacing:0.5}}>BLP Qty</span>
                  <span style={{fontSize:13,fontWeight:800,color:C.text,fontFamily:"monospace"}}>{tooltip.task.volume.toLocaleString()}<span style={{fontSize:9,color:C.sub,marginLeft:2}}>m³</span></span>
                </div>
              )}
              {tooltip.task.cc_qty > 0 && (
                <div style={{display:"flex",flexDirection:"column",gap:1}}>
                  <span style={{fontSize:8,color:col,fontWeight:700,textTransform:"uppercase",letterSpacing:0.5}}>CC Qty</span>
                  <span style={{fontSize:13,fontWeight:800,color:col,fontFamily:"monospace"}}>{tooltip.task.cc_qty.toLocaleString()}<span style={{fontSize:9,color:C.sub,marginLeft:2}}>m³</span></span>
                </div>
              )}
              {tooltip.task.site_qty > 0 && (
                <div style={{display:"flex",flexDirection:"column",gap:1}}>
                  <span style={{fontSize:8,color:"#22c55e",fontWeight:700,textTransform:"uppercase",letterSpacing:0.5}}>Site Qty</span>
                  <span style={{fontSize:13,fontWeight:800,color:"#22c55e",fontFamily:"monospace"}}>{tooltip.task.site_qty.toLocaleString()}<span style={{fontSize:9,color:C.sub,marginLeft:2}}>m³</span></span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div style={{display:"flex",borderBottom:`1px solid ${C.border}`,position:"sticky",top:0,zIndex:10,background:C.bg,minWidth:"max-content"}}>
        <div style={{width:LW,minWidth:LW,flexShrink:0,padding:"6px 14px",color:C.sub,fontSize:10,borderRight:`1px solid ${C.border}`,display:"flex",alignItems:"center"}}>ACTIVITY</div>
        <div style={{flex:1,minWidth:700,position:"relative",height:40}}>
          {ticks.map((t,i)=>(
            <div key={i} style={{position:"absolute",left:`${t.p}%`,top:0,bottom:0,borderLeft:`1px solid ${C.muted}55`,paddingLeft:3,display:"flex",flexDirection:"column",justifyContent:"center",gap:1}}>
              <span style={{fontSize:8,color:"#3b82f6",fontWeight:800,lineHeight:1,whiteSpace:"nowrap"}}>M{t.mNum}</span>
              <span style={{fontSize:9,color:t.isJan?C.text:C.sub,fontWeight:t.isJan?700:500,lineHeight:1,whiteSpace:"nowrap"}}>{t.isJan?`${t.label} ${t.year}`:t.label}</span>
            </div>
          ))}
          <div style={{position:"absolute",left:`${TODAY_P}%`,top:0,bottom:0,width:2,background:C.amber,zIndex:5}}/>
          {msEndPct!==null&&<div style={{position:"absolute",left:`${msEndPct}%`,top:0,bottom:0,width:2,background:"#ef4444",zIndex:6}}>
            <div style={{position:"absolute",top:2,left:3,background:"#ef4444",color:"#fff",fontSize:8,fontWeight:800,padding:"1px 5px",borderRadius:3,whiteSpace:"nowrap"}}>{activeMilestone}</div>
          </div>}
        </div>
      </div>
      {zones.map(zone=>{
        const zt=tasks.filter(t=>t.zone===zone);
        return(
          <div key={zone}>
            <div style={{display:"flex",background:col+"10",borderBottom:`1px solid ${col}33`}}>
              <div style={{width:LW,minWidth:LW,padding:"5px 14px",color:col,fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:0.5,borderRight:`1px solid ${C.border}`,background:col+"28"}}>{zone}</div>
              <div style={{flex:1,minWidth:700,position:"relative"}}>
                <div style={{position:"absolute",left:`${TODAY_P}%`,top:0,bottom:0,width:1,background:C.amber+"44"}}/>
                {msEndPct!==null&&<div style={{position:"absolute",left:`${msEndPct}%`,top:0,bottom:0,width:1,background:"#ef444466"}}/>}
              </div>
            </div>
            {zt.map((task,rowIdx)=>{
              // prefer site_dur from Excel; fall back to CC vs BLP
              const effDur = task.site_dur || task.cc_dur;
              const dayDiff = task.blp_dur && effDur ? effDur - task.blp_dur : null;
              const [msS,msE]=(MS_RANGES[activeMilestone]||[null,null]);
              const inMs=msS&&task.cc_e>=msS&&task.cc_e<=msE;
              const rowBg = inMs ? col+"18" : rowIdx%2===0 ? C.tableRow0 : C.tableRow1;
              return(
                <div key={task.id} style={{display:"flex",borderBottom:`1px solid ${C.border}`,height:28,alignItems:"center",background:rowBg}}
                  onMouseEnter={e=>{e.currentTarget.style.background=C.tableHover;setTooltip({task,x:e.clientX,y:e.clientY});}}
                  onMouseMove={e=>setTooltip(tt=>tt?{...tt,x:e.clientX,y:e.clientY}:null)}
                  onMouseLeave={e=>{e.currentTarget.style.background=rowBg;}}>
                  <div style={{width:LW,minWidth:LW,padding:"0 14px",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"space-between",borderRight:`1px solid ${C.border}`,gap:4}}>
                    <span style={{fontSize:10,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:168}} title={task.activity}>[{task.level}] {task.activity}</span>
                    <div style={{display:"flex",gap:3,alignItems:"center",flexShrink:0}}>
                      {inMs&&<span style={{fontSize:8,color:"#ef4444",fontWeight:800,background:"#ef444422",padding:"1px 4px",borderRadius:3}}>{activeMilestone}</span>}
                      {dayDiff!==null&&<span style={{fontSize:9,color:dayDiff<0?"#22c55e":dayDiff>0?C.amber:C.sub,fontWeight:700,whiteSpace:"nowrap"}}>{dayDiff>0?`+${dayDiff}d`:dayDiff<0?`${dayDiff}d`:"—"}</span>}
                    </div>
                  </div>
                  <div style={{flex:1,position:"relative",height:"100%",minWidth:700}}>
                    {task.blp_s && task.blp_e && <div style={{position:"absolute",left:`${pct(task.blp_s)}%`,width:`${barW(task.blp_s,task.blp_e)}%`,top:4,height:7,background:C.blp,borderRadius:2,opacity:1}}/>}
                    {task.cc_s && task.cc_e && <div style={{position:"absolute",left:`${pct(task.cc_s)}%`,width:`${barW(task.cc_s,task.cc_e)}%`,top:15,height:7,background:"#3b82f6",borderRadius:2,opacity:inMs?1:0.8}}/>}
                    {task.actual_s&&<div style={{position:"absolute",left:`${pct(task.actual_s)}%`,width:`${Math.max(0.3,barW(task.actual_s,task.actual_e||task.actual_s))}%`,top:10,height:5,background:"#84cc16",borderRadius:2,opacity:0.95}}/>}
                    <div style={{position:"absolute",left:`${TODAY_P}%`,top:0,bottom:0,width:1,background:C.amber+"55"}}/>
                    {msEndPct!==null&&<div style={{position:"absolute",left:`${msEndPct}%`,top:0,bottom:0,width:1,background:"#ef444477"}}/>}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ─── ANALYSIS ─────────────────────────────────────────────────────────────────
const PIE_COLORS=["#3b82f6","#10b981","#6366f1","#f59e0b","#06b6d4","#ef4444","#8b5cf6","#22c55e"];
function AnalysisView({rows,col,zoneDef,avgDev,syncIdx,P1P3_STRUCT,C}){
  const [subzone,setSubzone]=useState("all");
  const marineSubzones=[...new Set(rows.filter(r=>r.subzone).map(r=>r.subzone))];
  const filtered=marineSubzones.length&&subzone!=="all"?rows.filter(r=>r.subzone===subzone):rows;
  const chartRows=filtered.filter(r=>Math.abs(r.dev)<250);
  const circ=534,offset=circ-(circ*syncIdx/100);
  return(
    <div style={{padding:"16px 20px",display:"flex",flexDirection:"column",gap:18}}>
      {marineSubzones.length>0&&(
        <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
          <span style={{color:C.sub,fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:0.8}}>Sub-Zone:</span>
          {["all",...marineSubzones].map(sz=>(
            <button key={sz} onClick={()=>setSubzone(sz)} style={{padding:"3px 12px",borderRadius:20,border:`1px solid ${subzone===sz?col:C.muted}`,background:subzone===sz?col+"33":"transparent",color:subzone===sz?col:C.sub,cursor:"pointer",fontSize:10,fontFamily:"inherit",fontWeight:700}}>
              {sz==="all"?"All Sub-Zones":sz}
            </button>
          ))}
        </div>
      )}
      {(zoneDef?.key==="P1"||zoneDef?.key==="P3")&&(
        <div style={{background:C.panel,borderRadius:12,border:`1px solid ${C.border}`,overflow:"hidden"}}>
          <div style={{padding:"10px 16px",borderBottom:`1px solid ${C.border}`,color:col,fontSize:11,fontWeight:800,textTransform:"uppercase"}}>Zone P1 & P3 — Structural Reference</div>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead><tr style={{background:C.tableHead,color:C.sub,fontSize:9,textTransform:"uppercase"}}>
              {["Zone","RC Cols","RC Walls","Core Walls","Steel Beams","Deep Deck","CIS Slab"].map(h=><th key={h} style={{padding:"6px 10px",textAlign:"center",borderBottom:`1px solid ${C.border}`}}>{h}</th>)}
            </tr></thead>
            <tbody>{P1P3_STRUCT.map((r,i)=>(
              <tr key={i} style={{background:i%2===0?C.tableRow0:C.tableRow1,borderBottom:`1px solid ${C.border}`}}>
                <td style={{padding:"5px 10px",color:col,fontWeight:700,textAlign:"center"}}>{r.zone}</td>
                <td style={{padding:"5px 10px",textAlign:"center",color:C.text}}>{r.rcCols}</td>
                <td style={{padding:"5px 10px",textAlign:"center",color:C.text}}>{r.rcWalls}</td>
                <td style={{padding:"5px 10px",textAlign:"center",color:C.sub}}>{r.coreWalls}</td>
                <td style={{padding:"5px 10px",textAlign:"center",color:C.text}}>{r.steelBeams}</td>
                <td style={{padding:"5px 10px",textAlign:"center",color:r.deepDeck==="Yes"?"#22c55e":C.sub,fontWeight:700}}>{r.deepDeck}</td>
                <td style={{padding:"5px 10px",textAlign:"center",color:r.cisSlab==="Yes"?C.amber:C.sub,fontWeight:700}}>{r.cisSlab}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      <div style={{background:C.panel,borderRadius:12,border:`1px solid ${C.border}`,overflow:"hidden"}}>
        <div style={{padding:"10px 16px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:4,height:16,background:col,borderRadius:2}}/>
          <span style={{fontWeight:800,fontSize:11,textTransform:"uppercase",letterSpacing:0.5,color:C.text}}>{zoneDef?.label||"All Zones"} — Productivity Matrix</span>
        </div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:10}}>
            <thead>
              {/* Group header row */}
              <tr style={{background:C.bg}}>
                <th style={{padding:"5px 12px",textAlign:"left",borderBottom:`1px solid ${C.border}`,borderRight:`1px solid ${C.border}`,color:C.sub,fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:0.5}} rowSpan={2}>Task Description</th>
                <th colSpan={3} style={{padding:"5px 12px",textAlign:"center",borderBottom:`1px solid ${C.muted}`,borderRight:`1px solid ${C.border}`,color:C.sub,fontSize:9,fontWeight:800,textTransform:"uppercase",letterSpacing:0.5,background:C.tableHead}}>BLP Baseline</th>
                <th colSpan={3} style={{padding:"5px 12px",textAlign:"center",borderBottom:`1px solid ${C.muted}`,borderRight:`1px solid ${C.border}`,color:col,fontSize:9,fontWeight:800,textTransform:"uppercase",letterSpacing:0.5,background:col+"11"}}>Catch Up Plan</th>
                <th colSpan={2} style={{padding:"5px 12px",textAlign:"center",borderBottom:`1px solid ${C.muted}`,borderRight:`1px solid ${C.border}`,color:"#a78bfa",fontSize:9,fontWeight:800,textTransform:"uppercase",letterSpacing:0.5,background:"#a78bfa11"}}>Variance</th>
                <th style={{padding:"5px 12px",textAlign:"center",borderBottom:`1px solid ${C.border}`,color:C.sub,fontSize:9,fontWeight:800,textTransform:"uppercase",letterSpacing:0.5}} rowSpan={2}>Flag</th>
              </tr>
              {/* Sub-header row */}
              <tr style={{background:C.tableHead,color:C.sub,fontSize:9,textTransform:"uppercase",letterSpacing:0.5}}>
                {["Volume","Days","Rate"].map(h=>(
                  <th key={"blp-"+h} style={{padding:"4px 12px",textAlign:"center",borderBottom:`1px solid ${C.border}`,whiteSpace:"nowrap",color:C.sub,fontWeight:700}}>{h}</th>
                ))}
                {["Volume","Days","Rate"].map(h=>(
                  <th key={"cc-"+h} style={{padding:"4px 12px",textAlign:"center",borderBottom:`1px solid ${C.border}`,whiteSpace:"nowrap",color:col,fontWeight:700,background:col+"08",borderLeft:h==="Volume"?`1px solid ${C.border}`:"none"}}>{h}</th>
                ))}
                <th style={{padding:"4px 12px",textAlign:"center",borderBottom:`1px solid ${C.border}`,whiteSpace:"nowrap",color:"#a78bfa",fontWeight:700,borderLeft:`1px solid ${C.border}`,background:"#a78bfa08"}}>Dur Δ</th>
                <th style={{padding:"4px 12px",textAlign:"center",borderBottom:`1px solid ${C.border}`,whiteSpace:"nowrap",color:"#a78bfa",fontWeight:700,borderRight:`1px solid ${C.border}`,background:"#a78bfa08"}}>Eff Δ</th>
              </tr>
            </thead>
            <tbody>{(()=>{
              // Group rows by zone, preserving order
              const zoneOrder = [];
              const byZone = {};
              filtered.forEach(r => {
                const z = r.zone || "—";
                if (!byZone[z]) { byZone[z] = []; zoneOrder.push(z); }
                byZone[z].push(r);
              });
              const rows = [];
              let totalDurDelta = 0, durDeltaCount = 0;
              let totalEffDelta = 0, effDeltaCount = 0;
              zoneOrder.forEach(z => {
                // Zone group header row
                rows.push(
                  <tr key={`hdr-${z}`} style={{background:col+"18",borderBottom:`1px solid ${col}33`}}>
                    <td colSpan={10} style={{padding:"4px 12px 4px 14px",color:col,fontSize:9,fontWeight:800,textTransform:"uppercase",letterSpacing:0.8,width:"100%"}}>
                      {z}
                    </td>
                  </tr>
                );
                // Task rows for this zone
                byZone[z].forEach((r, i) => {
                  const blpR  = r.blpRate ?? null;
                  const ccR   = r.ccRate  ?? null;
                  const ccVol = r.ccQty != null ? r.ccQty : null;
                  const ratio = blpR && ccR ? ccR / blpR : null;
                  // Dur Δ = CC days - BLP days (negative = faster)
                  const durDelta = (r.ccDays && r.blpDays) ? r.ccDays - r.blpDays : null;
                  // Eff Δ = (CC Rate - BLP Rate) / BLP Rate × 100
                  const effDelta = (blpR && ccR && blpR > 0) ? ((ccR - blpR) / blpR * 100) : null;
                  let flag = null;
                  if (ratio !== null) {
                    if (ratio > 1.5)      flag = "adjust";
                    else if (ratio > 1.0) flag = "ontrack";
                    else                  flag = "baseline";
                  }
                  if (durDelta !== null) { totalDurDelta += durDelta; durDeltaCount++; }
                  if (effDelta !== null) { totalEffDelta += effDelta; effDeltaCount++; }
                  const durCol = durDelta === null ? C.muted : durDelta < 0 ? "#22c55e" : durDelta > 0 ? "#f87171" : C.sub;
                  const effCol = effDelta === null ? C.muted : effDelta > 0 ? "#22c55e" : effDelta < 0 ? "#f87171" : C.sub;
                  rows.push(
                    <tr key={`${z}-${i}`} style={{background:i%2===0?C.tableRow0:C.tableRow1,borderBottom:`1px solid ${C.border}`}}
                      onMouseEnter={e=>e.currentTarget.style.background=C.tableHover}
                      onMouseLeave={e=>e.currentTarget.style.background=i%2===0?C.tableRow0:C.tableRow1}>
                      <td style={{padding:"5px 12px 5px 18px",color:C.text,fontWeight:600,fontSize:10,borderRight:`1px solid ${C.border}`,maxWidth:220,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.level&&<span style={{color:C.sub,fontSize:9,fontWeight:700,marginRight:5}}>[{r.level}]</span>}{r.task.replace(/^\[Z[\d.]+\]\s*/,"")}</td>
                      <td style={{padding:"5px 12px",textAlign:"right",color:C.text,fontFamily:"monospace",fontSize:10}}>{r.volume>0?r.volume.toLocaleString():"—"}</td>
                      <td style={{padding:"5px 12px",textAlign:"center",color:C.text,fontFamily:"monospace",fontSize:10}}>{r.blpDays?`${r.blpDays}d`:"—"}</td>
                      <td style={{padding:"5px 12px",textAlign:"center",color:C.text,fontFamily:"monospace",fontSize:10,borderRight:`1px solid ${C.border}`}}>{blpR!=null?blpR.toFixed(2):"—"}</td>
                      <td style={{padding:"5px 12px",textAlign:"right",color:col,fontFamily:"monospace",fontSize:10,background:col+"0a",borderLeft:`1px solid ${C.border}`}}>{ccVol!=null?ccVol.toLocaleString():"—"}</td>
                      <td style={{padding:"5px 12px",textAlign:"center",color:col,fontFamily:"monospace",fontSize:10,background:col+"0a"}}>{r.ccDays?`${r.ccDays}d`:"—"}</td>
                      <td style={{padding:"5px 12px",textAlign:"center",color:col,fontFamily:"monospace",fontWeight:700,fontSize:10,background:col+"0a",borderRight:`1px solid ${C.border}`}}>{ccR!=null?ccR.toFixed(2):"—"}</td>
                      <td style={{padding:"5px 12px",textAlign:"center",fontFamily:"monospace",fontSize:10,fontWeight:700,borderLeft:`1px solid ${C.border}`,background:"#a78bfa08"}}>
                        {durDelta!==null ? <span style={{color:durCol}}>{durDelta>0?`+${durDelta}`:durDelta} d</span> : <span style={{color:C.muted}}>—</span>}
                      </td>
                      <td style={{padding:"5px 12px",textAlign:"center",fontFamily:"monospace",fontSize:10,fontWeight:700,borderRight:`1px solid ${C.border}`,background:"#a78bfa08"}}>
                        {effDelta!==null ? <span style={{color:effCol}}>{effDelta>0?"↗":"↘"} {Math.abs(effDelta).toFixed(1)}%</span> : <span style={{color:C.muted}}>—</span>}
                      </td>
                      <td style={{padding:"5px 12px",textAlign:"center"}}>
                        <span style={{
                          display:"inline-block", width:10, height:10, borderRadius:"50%",
                          background: flag==="adjust" ? "#ef4444" : "#22c55e",
                          boxShadow: flag==="adjust" ? "0 0 6px #ef444488" : "0 0 6px #22c55e88"
                        }}/>
                      </td>
                    </tr>
                  );
                });
              });
              // Footer summary row
              const avgDurDelta = durDeltaCount > 0 ? (totalDurDelta / durDeltaCount) : null;
              const avgEffDelta = effDeltaCount > 0 ? (totalEffDelta / effDeltaCount) : null;
              rows.push(
                <tr key="footer" style={{background:C.panel,borderTop:`2px solid ${C.muted}`}}>
                  <td colSpan={7} style={{padding:"6px 12px",textAlign:"right",color:C.sub,fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:0.5}}>Average Variance</td>
                  <td style={{padding:"6px 12px",textAlign:"center",fontFamily:"monospace",fontSize:11,fontWeight:900,background:"#a78bfa11",borderLeft:`1px solid ${C.border}`}}>
                    {avgDurDelta!==null ? <span style={{color:avgDurDelta<0?"#22c55e":avgDurDelta>0?"#f87171":C.sub}}>{avgDurDelta>0?"+":""}{avgDurDelta.toFixed(1)} d</span> : "—"}
                  </td>
                  <td style={{padding:"6px 12px",textAlign:"center",fontFamily:"monospace",fontSize:11,fontWeight:900,background:"#a78bfa11",borderRight:`1px solid ${C.border}`}}>
                    {avgEffDelta!==null ? <span style={{color:avgEffDelta>0?"#22c55e":avgEffDelta<0?"#f87171":C.sub}}>{avgEffDelta>0?"↗":"↘"} {Math.abs(avgEffDelta).toFixed(1)}%</span> : "—"}
                  </td>
                  <td style={{padding:"6px 12px"}}/>
                </tr>
              );
              return rows;
            })()}</tbody>
          </table>
        </div>
      </div>
      <div className="dash-grid-2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        <div style={{background:C.panel,borderRadius:12,border:`1px solid ${C.border}`,padding:16}}>
          <div style={{color:C.sub,fontSize:11,fontWeight:700,textTransform:"uppercase",marginBottom:12,textAlign:"center"}}>Output Intensity Comparison</div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartRows} margin={{top:0,right:10,bottom:0,left:0}}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={C.border}/>
              <XAxis dataKey="task" hide/><YAxis tick={{fontSize:10,fill:C.sub}}/>
              <Tooltip contentStyle={{background:C.panel,border:`1px solid ${C.border}`,fontSize:11,borderRadius:8}} labelStyle={{color:C.text}} itemStyle={{color:C.text}}/>
              <Legend verticalAlign="top" wrapperStyle={{fontSize:11}} formatter={v=><span style={{color:C.sub}}>{v}</span>}/>
              <Bar name="BLP Benchmark" dataKey="blpRate" fill={C.blp} radius={[3,3,0,0]}/>
              <Bar name="Catch Up Intensity"  dataKey="ccRate"  fill={col}   radius={[3,3,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{background:C.panel,borderRadius:12,border:`1px solid ${C.border}`,padding:16}}>
          <div style={{color:C.sub,fontSize:11,fontWeight:700,textTransform:"uppercase",marginBottom:12,textAlign:"center"}}>Workload by Volume</div>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={chartRows.filter(r=>r.volume>0)} innerRadius={65} outerRadius={100} paddingAngle={4} dataKey="volume" nameKey="task" stroke="none">
                {chartRows.map((_,i)=><Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]}/>)}
              </Pie>
              <Tooltip contentStyle={{background:C.panel,border:`1px solid ${C.border}`,fontSize:11,borderRadius:8,color:C.text}} labelStyle={{color:C.text}} itemStyle={{color:C.text}} formatter={(v,n)=>[v.toLocaleString()+" m³",n]}/>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ─── INPUT ────────────────────────────────────────────────────────────────────
function HealthView({tasks,activeMilestone,setActiveMilestone,MS_RANGES,MILESTONES,C,lightMode}){
  const [selMs,setSelMs]=useState(activeMilestone);
  function pick(m){setSelMs(m);setActiveMilestone(m);}
  function msData(ms){const[s,e]=MS_RANGES[ms];const due=tasks.filter(t=>t.cc_e>=s&&t.cc_e<=e);const done=due.filter(t=>t.actual_e&&t.actual_e<=e);return{due,rate:due.length?Math.round(done.length/due.length*100):100,end:e};}
  function diff(cc_e,end){return Math.round((new Date(end)-new Date(cc_e))/86400000);}
  const[selS,selE]=MS_RANGES[selMs];
  const detail=tasks.filter(t=>t.cc_e>=selS&&t.cc_e<=selE).sort((a,b)=>a.cc_e.localeCompare(b.cc_e));
  return(
    <div style={{background:C.bg,minHeight:"100vh",padding:"28px 32px",fontFamily:"'Poppins',sans-serif",color:C.text}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24}}>
        <div>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
            <span style={{background:"#3b82f6",color:"#fff",fontSize:10,fontWeight:800,padding:"3px 10px",borderRadius:4,letterSpacing:1,textTransform:"uppercase"}}>CC Schedule Health</span>
            <span style={{color:C.sub,fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:1}}>Quarterly Target Achievement</span>
          </div>
          <div style={{fontSize:22,fontWeight:900,color:C.text}}>CC Schedule Milestone Achievement Board</div>
          <div style={{color:C.sub,fontSize:12,marginTop:3}}>Evaluates alignment of current construction plan (CC) against quarterly milestone targets · All zones</div>
        </div>
        <div style={{border:`1.5px solid ${C.border}`,borderRadius:12,padding:"12px 18px",background:C.panel,textAlign:"right"}}>
          <div style={{color:C.sub,fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Project Deadline</div>
          <div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:16,color:"#3b82f6"}}>⏱</span><span style={{fontSize:20,fontWeight:900,color:C.text}}>2027-03-19</span></div>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:12,marginBottom:24}}>
        {MILESTONES.map(ms=>{
          const{due,rate,end}=msData(ms);const isSel=ms===selMs;const ok=rate===100;
          return(
            <div key={ms} onClick={()=>pick(ms)} style={{background:C.panel,borderRadius:14,padding:"15px 16px",cursor:"pointer",border:isSel?`2px solid #3b82f6`:`1.5px solid ${C.border}`,boxShadow:isSel?"0 0 0 3px #3b82f622":"0 1px 3px rgba(0,0,0,0.08)"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <div style={{color:C.sub,fontSize:11,fontWeight:700}}>{ms}</div>
                <div style={{color:C.sub,fontSize:10}}>{due.length} tasks</div>
              </div>
              <div style={{display:"flex",alignItems:"baseline",gap:5,marginBottom:2}}>
                <span style={{fontSize:24,fontWeight:900,color:ok?"#10b981":"#ef4444",lineHeight:1}}>{rate}%</span>
                <span style={{fontSize:10,color:C.sub,fontWeight:700}}>Achievement</span>
              </div>
              <div style={{height:4,background:C.muted,borderRadius:99,marginBottom:5,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${rate}%`,background:ok?"#10b981":"#ef4444",borderRadius:99}}/>
              </div>
              <div style={{fontSize:10,color:ok?"#10b981":"#ef4444",fontWeight:700}}>{ok?"All on schedule":`${due.length-Math.round(due.length*rate/100)} at risk`}</div>
              <div style={{fontSize:9,color:C.sub,marginTop:2}}>Deadline: {end}</div>
            </div>
          );
        })}
      </div>
      <div style={{background:C.panel,borderRadius:20,border:`1.5px solid ${C.border}`,overflow:"hidden",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
        <div style={{padding:"16px 28px",borderBottom:`1.5px solid ${C.border}`,display:"flex",alignItems:"center",gap:14}}>
          <div style={{width:40,height:40,borderRadius:12,background:"linear-gradient(135deg,#3b82f6,#6366f1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>🎯</div>
          <div>
            <div style={{fontSize:17,fontWeight:900,color:C.text}}>{selMs} Milestone — Target Detail</div>
            <div style={{color:C.sub,fontSize:11,marginTop:1}}>Deadline: {MS_RANGES[selMs][1]} · {detail.length} tasks in scope</div>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 155px 145px 155px",gap:12,padding:"8px 28px",background:C.tableHead,borderBottom:`1px solid ${C.border}`}}>
          {["Zone / Activity","CC Forecast (CC-E)","Days to Milestone","Status"].map(h=>(
            <div key={h} style={{color:C.sub,fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:0.5}}>{h}</div>
          ))}
        </div>
        {detail.length===0?<div style={{padding:"40px 28px",textAlign:"center",color:C.sub,fontSize:13}}>No tasks scheduled within this milestone window.</div>:(
          detail.map((t,i)=>{
            const end=MS_RANGES[selMs][1],d=diff(t.cc_e,end),late=d<0;
            return(
              <div key={t.id} style={{display:"grid",gridTemplateColumns:"1fr 155px 145px 155px",gap:12,padding:"13px 28px",borderBottom:i<detail.length-1?`1px solid ${C.border}`:"none",background:i%2===0?C.tableRow0:C.tableRow1}}
                onMouseEnter={e=>e.currentTarget.style.background=C.tableHover}
                onMouseLeave={e=>e.currentTarget.style.background=i%2===0?C.tableRow0:C.tableRow1}>
                <div>
                  <div style={{fontSize:10,fontWeight:800,color:"#3b82f6",textTransform:"uppercase",letterSpacing:0.5,marginBottom:3}}>{t.zone.replace("Zone ","")} · {t.level}</div>
                  <div style={{fontSize:13,fontWeight:800,color:C.text}}>{t.activity}</div>
                </div>
                <div style={{display:"flex",flexDirection:"column",justifyContent:"center"}}>
                  <div style={{fontSize:14,fontWeight:800,color:C.text}}>{t.cc_e}</div>
                  <div style={{fontSize:9,color:C.sub,fontWeight:700,textTransform:"uppercase",marginTop:2}}>Current Forecast</div>
                </div>
                <div style={{display:"flex",flexDirection:"column",justifyContent:"center"}}>
                  <div style={{display:"inline-flex",alignItems:"center",background:late?"#ef444422":d===0?"#f59e0b22":"#22c55e22",border:`1px solid ${late?"#ef444455":d===0?"#f59e0b55":"#22c55e55"}`,borderRadius:10,padding:"5px 11px",width:"fit-content"}}>
                    <span style={{fontSize:16,fontWeight:900,color:late?"#ef4444":d===0?"#d97706":"#16a34a",lineHeight:1}}>{d>0?`-${d}`:d===0?"0":`+${Math.abs(d)}`}</span>
                    <span style={{fontSize:11,fontWeight:700,color:late?"#ef4444":"#16a34a",marginLeft:3}}>days</span>
                  </div>
                  <div style={{fontSize:9,color:late?"#ef4444":"#10b981",fontWeight:700,marginTop:3}}>{late?"⚠ Exceeds milestone":d===0?"On milestone":"✓ Ahead"}</div>
                </div>
                <div style={{display:"flex",alignItems:"center"}}>
                  <div style={{display:"flex",alignItems:"center",gap:5,padding:"5px 12px",borderRadius:99,background:late?"#ef444422":"#22c55e22",border:`1px solid ${late?"#ef444466":"#22c55e66"}`}}>
                    <span style={{fontSize:12,color:late?"#ef4444":"#16a34a"}}>{late?"⚠":"✓"}</span>
                    <span style={{fontSize:11,fontWeight:800,color:late?"#ef4444":"#16a34a",whiteSpace:"nowrap"}}>{late?"Delayed":"On Time / Early"}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div style={{padding:"12px 28px",background:C.tableHead,borderTop:`1.5px solid ${C.border}`,display:"flex",gap:22,flexWrap:"wrap"}}>
          {[["Total",detail.length,C.text],["On Time / Early",detail.filter(t=>diff(t.cc_e,MS_RANGES[selMs][1])>=0).length,"#10b981"],["Delayed",detail.filter(t=>diff(t.cc_e,MS_RANGES[selMs][1])<0).length,"#ef4444"],["Achievement",msData(selMs).rate+"%","#3b82f6"]].map(([l,v,c])=>(
            <div key={l} style={{display:"flex",gap:7,alignItems:"center"}}>
              <span style={{color:C.sub,fontSize:11,fontWeight:700}}>{l}:</span>
              <span style={{color:c,fontSize:14,fontWeight:900}}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


// ─── PRODUCTIVITY CARD VIEW ───────────────────────────────────────────────────
const PC_QUARTERS = [
  { key:'Q1-26', label:'Q1', sub:'19 Mar – 18 Jun 2026', mRange:'M19–M22', s:'2026-03-19', e:'2026-06-18' },
  { key:'Q2-26', label:'Q2', sub:'19 Jun – 18 Sep 2026', mRange:'M22–M25', s:'2026-06-19', e:'2026-09-18' },
  { key:'Q3-26', label:'Q3', sub:'19 Sep – 18 Dec 2026', mRange:'M25–M28', s:'2026-09-19', e:'2026-12-18' },
  { key:'Q4-26', label:'Q4', sub:'19 Dec 2026 – 19 May 2027', mRange:'M28–M33', s:'2026-12-19', e:'2027-05-19' },
];
const PC_TYPE_COLORS = { demolish:'#f87171', excavate:'#fb923c', slab:'#34d399', column:'#818cf8' };
const PC_TYPE_LABELS = { demolish:'Demolition', excavate:'Excavation', slab:'Slab / Platform', column:'Core / Column' };
function pcClassify(activity) {
  const a = activity.toLowerCase();
  if (a.includes('demolish') || a.includes('demolit') || a.includes('removal') ||
      a.includes('remove existing') || a.includes('strip') || a.includes('break out') ||
      (a.includes('remove') && !a.includes('berm'))) return 'demolish';
  if (a.includes('excavat') || a.includes('berm')) return 'excavate';
  // Explicit Core/Column: bored pile, pilecap/substructure, core wall, core erection prep
  if (a.includes('bored pile') || a.includes('kingpost')) return 'column';
  if (a.includes('pilecap') || a.includes('substructure')) return 'column';
  if (a.includes('core wall')) return 'column';
  if (a.includes('prepare') && a.includes('core')) return 'column';
  // Explicit Slab/Platform: marine deck, double-t deck, raised slab, steel beam, transfer plate, cast in-fill
  if (a.includes('marine deck') || a.includes('temp marine')) return 'slab';
  if (a.includes('double t') || a.includes('doube t') || a.includes('double-t')) return 'slab';
  if (a.includes('transfer plate')) return 'slab';
  if (a.includes('steel beam')) return 'slab';
  if (a.includes('cast in-fill') || a.includes('cast infill') || a.includes('in-fill')) return 'slab';
  // General slab/platform keywords
  if (a.includes('slab') || a.includes('platform') || a.includes('stitch') || a.includes('deck')) return 'slab';
  return 'column';
}

// ── Quarter summary card (the "how far behind" tile) ─────────────────────────
function QSummaryCard({ qDef, qIdx, tasks, areaAllTaskZones, zoneDef, areaLabel, isSelected, col, C, onClick }) {
  const allowed  = zoneDef ? new Set(zoneDef.taskZones) : areaAllTaskZones;
  const qTasks   = tasks.filter(t => allowed.has(t.zone) && t.cc_e >= qDef.s && t.cc_e <= qDef.e);
  const total    = qTasks.length;
  const withSite = qTasks.filter(t => t.actual_s).length;
  const today    = new Date().toISOString().slice(0,10);
  const isCurr   = today >= qDef.s && today <= qDef.e;
  const isFuture = today < qDef.s;

  const fmtV = v => v > 0 ? Math.round(v).toLocaleString() : '—';
  const fmtD = v => v > 0 ? `${Math.round(v)}d` : '—';
  const fmtR = v => v > 0 ? v.toFixed(1) : '—';
  const lagSign  = v => v > 0 ? `+${Math.round(v)}d` : v < 0 ? `${Math.round(v)}d` : '0d';
  const rateDiff = v => v != null ? (v >= 0 ? `+${v.toFixed(1)}` : v.toFixed(1)) : '—';
  const lagColor = v => v > 5 ? '#ef4444' : v < -5 ? '#22c55e' : '#f59e0b';
  const rateColor= v => v == null ? C.muted : v >= 0 ? '#22c55e' : '#ef4444';

  // Per work-type aggregation
  const wtKeys   = ['excavate','demolish','slab','column'];
  const wtStats  = wtKeys.map(wk => {
    const wTasks = qTasks.filter(t => pcClassify(t.activity) === wk);
    // All tasks of this work type across all quarters (same zone filter)
    const allWTasks = tasks.filter(t => allowed.has(t.zone) && pcClassify(t.activity) === wk);
    // Vol from quarters strictly before this one (tasks whose cc_e falls within a prior quarter)
    const prevQuarters = PC_QUARTERS.slice(0, qIdx);
    const prevCCVol = prevQuarters.length === 0 ? 0
      : allWTasks.filter(t => prevQuarters.some(q => t.cc_e >= q.s && t.cc_e <= q.e))
                 .reduce((s,t) => s+(t.cc_qty||t.volume||0), 0);
    const blpDur = wTasks.reduce((s,t)=>s+(t.blp_dur||0),0);
    const ccDur  = wTasks.reduce((s,t)=>s+(t.cc_dur||0),0);
    const sitDur = wTasks.filter(t=>t.actual_s).reduce((s,t)=>s+(t.site_dur||0),0);
    const blpVol = wTasks.reduce((s,t)=>s+(t.volume||0),0);
    const ccVol  = wTasks.reduce((s,t)=>s+(t.cc_qty||t.volume||0),0);
    const sitVol = wTasks.filter(t=>t.actual_s).reduce((s,t)=>s+(t.site_qty||t.cc_qty||t.volume||0),0);
    const totalCCVol = allWTasks.reduce((s,t)=>s+(t.cc_qty||t.volume||0),0);
    const blpR   = blpDur > 0 ? blpVol / blpDur : null;
    const ccR    = ccDur  > 0 ? ccVol  / ccDur  : null;
    const sitR   = sitDur > 0 ? sitVol / sitDur : null;
    const durLagBlp = ccDur  - blpDur;
    const durLagCC  = sitDur - ccDur;
    const rDeltaCC  = (ccR  != null && blpR != null) ? ccR  - blpR : null;
    const rDeltaSite= (sitR != null && ccR  != null) ? sitR - ccR  : null;
    const hasSite   = wTasks.some(t => t.actual_s);
    return { wk, blpDur, ccDur, sitDur, blpVol, ccVol, sitVol, totalCCVol, prevCCVol, blpR, ccR, sitR,
             durLagBlp, durLagCC, rDeltaCC, rDeltaSite, hasSite, count: wTasks.length };
  }).filter(w => w.count > 0);

  // Overall status from total dur lag vs BLP
  const totBlpDur = qTasks.reduce((s,t)=>s+(t.blp_dur||0),0);
  const totCCDur  = qTasks.reduce((s,t)=>s+(t.cc_dur||0),0);
  const durLagTotal = totCCDur - totBlpDur;
  const behindPct   = totBlpDur > 0 ? durLagTotal / totBlpDur * 100 : 0;
  let statusKey = isFuture ? 'future'
    : withSite === 0       ? 'pending'
    : behindPct <= 5       ? 'on-track'
    : behindPct <= 15      ? 'at-risk'
    : 'behind';
  const statusCfg = {
    'on-track':{ label:'On Track',    color:'#22c55e' },
    'at-risk': { label:'At Risk',     color:'#f59e0b' },
    'behind':  { label:'Behind',      color:'#ef4444' },
    'pending': { label:'No Site Data',color:C.sub     },
    'future':  { label:'Upcoming',    color:C.sub     },
  };
  const sc = statusCfg[statusKey];
  const borderCol = isSelected ? col : sc.color;

  return (
    <div onClick={onClick} style={{
      background: isSelected ? col+'12' : C.panel,
      border: `1.5px solid ${isSelected ? col : C.border}`,
      borderTop: `3px solid ${borderCol}`,
      borderRadius: 10, padding: '14px 16px', cursor: 'pointer',
      minWidth: 260, flex: 1,
      boxShadow: isSelected ? `0 0 0 2px ${col}33` : '0 1px 4px rgba(0,0,0,0.06)',
      transition: 'all 0.15s',
    }}
      onMouseEnter={e=>{ if(!isSelected) e.currentTarget.style.borderColor=col+'66'; }}
      onMouseLeave={e=>{ if(!isSelected) e.currentTarget.style.borderColor=C.border; }}
    >
      {/* ── Card header ── */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
        <div>
          <div style={{ fontSize:15, fontWeight:900, color:isSelected?col:C.text, letterSpacing:-0.3 }}>{qDef.label}</div>
          <div style={{ fontSize:9, color:isSelected?col:C.sub, fontWeight:700, marginTop:1 }}>{qDef.mRange}</div>
          <div style={{ fontSize:8, color:C.sub, marginTop:1 }}>{qDef.sub}</div>
          {/* Area › Zone breadcrumb */}
          <div style={{ display:'flex', alignItems:'center', gap:3, marginTop:5 }}>
            <span style={{ fontSize:8, color:C.muted, fontWeight:600 }}>{areaLabel||'All Areas'}</span>
            <span style={{ fontSize:8, color:C.muted }}>›</span>
            <span style={{ fontSize:8, fontWeight:700, color:col, background:col+'18',
              padding:'1px 7px', borderRadius:20, border:`1px solid ${col}33` }}>
              {zoneDef ? zoneDef.label : 'All Zones'}
            </span>
          </div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:3 }}>
        </div>
      </div>

      {/* ── Task count bar ── */}
      <div style={{ height:2, background:C.inputBg, borderRadius:99, overflow:'hidden', marginBottom:10 }}>
        <div style={{ width:`${total>0?withSite/total*100:0}%`, height:'100%',
          background:sc.color, borderRadius:99, transition:'width 0.4s' }}/>
      </div>

      {/* ── Work-type breakdown table ── */}
      {wtStats.length === 0 ? (
        <div style={{ fontSize:12, color:C.muted, textAlign:'center', padding:'8px 0' }}>No task data in this quarter</div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
          {/* Column headers */}
          <div style={{ display:'grid', gridTemplateColumns:'80px 1fr 1fr 1fr', gap:3,
            marginBottom:4, paddingBottom:4, borderBottom:`1px solid ${C.border}` }}>
            <div style={{ fontSize:10, color:C.muted, fontWeight:700, textTransform:'uppercase' }}></div>
            {[['BLP',C.sub],[`CC`,col],['Site','#22c55e']].map(([l,c])=>(
              <div key={l} style={{ fontSize:10, color:c, fontWeight:800, textTransform:'uppercase',
                letterSpacing:0.5, textAlign:'center' }}>{l}</div>
            ))}
          </div>

          {wtStats.map(w => {
            const wc = PC_TYPE_COLORS[w.wk];
            return (
              <div key={w.wk} style={{ marginBottom:8, paddingBottom:8,
                borderBottom:`1px dashed ${C.border}` }}>
                {/* Work type label + vol coverage */}
                <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:5, flexWrap:'wrap' }}>
                  <span style={{ fontSize:13, fontWeight:800, color:wc, background:wc+'18',
                    padding:'2px 10px', borderRadius:20, border:`1px solid ${wc}33` }}>
                    {PC_TYPE_LABELS[w.wk]}
                  </span>
                  <span style={{ fontSize:11, color:C.sub }}>{w.count} tasks</span>
                  {w.totalCCVol > 0 && (() => {
                    const cumVol = w.prevCCVol + w.ccVol;
                    const pct = Math.round(cumVol / w.totalCCVol * 100);
                    return (
                      <span style={{ marginLeft:'auto', fontSize:10, fontFamily:'monospace', textAlign:'right', display:'flex', alignItems:'center', gap:4, flexWrap:'wrap', justifyContent:'flex-end' }}>
                        {w.prevCCVol > 0 && <>
                          <span style={{ color:wc, fontWeight:600, opacity:0.45 }}>{Math.round(w.prevCCVol).toLocaleString()}</span>
                          <span style={{ color:C.muted }}>+</span>
                        </>}
                        <span style={{ color:wc, fontWeight:800 }}>{Math.round(w.ccVol).toLocaleString()}</span>
                        <span style={{ color:C.muted }}>/</span>
                        <span style={{ color:C.sub, fontWeight:600 }}>{Math.round(w.totalCCVol).toLocaleString()} m³</span>
                        <span style={{ fontSize:9, fontWeight:800, color:wc,
                          background:wc+'22', border:`1px solid ${wc}44`,
                          padding:'1px 6px', borderRadius:20 }}>{pct}%</span>
                      </span>
                    );
                  })()}
                </div>
                {w.totalCCVol > 0 && (
                  <div style={{ height:5, background:C.inputBg, borderRadius:99, overflow:'hidden', marginBottom:7, display:'flex' }}>
                    {/* Done — quarters before this one */}
                    {w.prevCCVol > 0 && <div style={{ width:`${Math.min(100, w.prevCCVol/w.totalCCVol*100)}%`, height:'100%',
                      background:wc, opacity:0.22, flexShrink:0 }}/>}
                    {/* This quarter — bright highlight */}
                    <div style={{ width:`${Math.min(100, w.ccVol/w.totalCCVol*100)}%`, height:'100%',
                      background:wc, opacity:0.9, flexShrink:0 }}/>
                    {/* Remaining implicit via dark bg */}
                  </div>
                )}

                {/* Vol row */}
                <div style={{ display:'grid', gridTemplateColumns:'80px 1fr 1fr 1fr', gap:3, marginBottom:2 }}>
                  <span style={{ fontSize:11, color:C.sub }}>Vol</span>
                  <span style={{ fontSize:11, fontWeight:700, color:C.text, fontFamily:'monospace', textAlign:'center' }}>{fmtV(w.blpVol)}</span>
                  <span style={{ fontSize:11, fontWeight:700, color:col,   fontFamily:'monospace', textAlign:'center' }}>{fmtV(w.ccVol)}</span>
                  <span style={{ fontSize:11, fontWeight:700, color:w.hasSite?'#22c55e':C.muted, fontFamily:'monospace', textAlign:'center' }}>{w.hasSite?fmtV(w.sitVol):'—'}</span>
                </div>
                {/* Dur row */}
                <div style={{ display:'grid', gridTemplateColumns:'80px 1fr 1fr 1fr', gap:3, marginBottom:2 }}>
                  <span style={{ fontSize:11, color:C.sub }}>Dur</span>
                  <span style={{ fontSize:11, fontWeight:700, color:C.text, fontFamily:'monospace', textAlign:'center' }}>{fmtD(w.blpDur)}</span>
                  <span style={{ fontSize:11, fontWeight:700, color:col,   fontFamily:'monospace', textAlign:'center' }}>{fmtD(w.ccDur)}</span>
                  <span style={{ fontSize:11, fontWeight:700, color:w.hasSite?'#22c55e':C.muted, fontFamily:'monospace', textAlign:'center' }}>{w.hasSite?fmtD(w.sitDur):'—'}</span>
                </div>
                {/* Rate row with CC vs BLP arrow badge */}
                <div style={{ display:'grid', gridTemplateColumns:'80px 1fr 1fr 1fr', gap:3, marginBottom:6 }}>
                  <span style={{ fontSize:11, color:C.sub }}>Rate</span>
                  <span style={{ fontSize:11, fontWeight:700, color:C.sub,  fontFamily:'monospace', textAlign:'center' }}>{fmtR(w.blpR)}</span>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:3 }}>
                    <span style={{ fontSize:11, fontWeight:700, color:col, fontFamily:'monospace' }}>{fmtR(w.ccR)}</span>
                    {w.rDeltaCC != null && (
                      <span style={{ fontSize:12, fontWeight:900,
                        color: w.rDeltaCC >= 0 ? '#22c55e' : '#ef4444' }}>
                        {w.rDeltaCC >= 0 ? '▲' : '▼'}
                      </span>
                    )}
                  </div>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:3 }}>
                    <span style={{ fontSize:11, fontWeight:700, color:w.hasSite?'#22c55e':C.muted, fontFamily:'monospace' }}>{w.hasSite?fmtR(w.sitR):'—'}</span>
                    {w.hasSite && w.rDeltaSite != null && (
                      <span style={{ fontSize:12, fontWeight:900,
                        color: w.rDeltaSite >= 0 ? '#22c55e' : '#ef4444' }}>
                        {w.rDeltaSite >= 0 ? '▲' : '▼'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Lag + rate delta mini rows */}
                <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:4, fontSize:11 }}>
                    <span style={{ color:C.text, fontWeight:700, minWidth:50 }}>CC↔BLP</span>
                    <span style={{ fontWeight:800, fontFamily:'monospace',
                      color: w.durLagBlp>0?'#ef4444':'#22c55e' }}>{lagSign(w.durLagBlp)}</span>
                    <span style={{ color:C.muted }}>·</span>
                    <span style={{ fontWeight:800, fontFamily:'monospace', color:rateColor(w.rDeltaCC) }}>
                      {w.rDeltaCC != null ? (w.rDeltaCC >= 0 ? '▲' : '▼') : ''}{rateDiff(w.rDeltaCC)}
                    </span>
                    {w.rDeltaCC != null && (
                      <span style={{ fontSize:9, color:C.sub }}>m³/d</span>
                    )}
                  </div>
                  {w.hasSite && (
                    <div style={{ display:'flex', alignItems:'center', gap:4, fontSize:11 }}>
                      <span style={{ color:C.text, fontWeight:700, minWidth:50 }}>Site↔CC</span>
                      <span style={{ fontWeight:800, fontFamily:'monospace',
                        color:lagColor(w.durLagCC) }}>{lagSign(w.durLagCC)}</span>
                      <span style={{ color:C.muted }}>·</span>
                      <span style={{ fontWeight:800, fontFamily:'monospace', color:rateColor(w.rDeltaSite) }}>
                        {w.rDeltaSite != null ? (w.rDeltaSite >= 0 ? '▲' : '▼') : ''}{rateDiff(w.rDeltaSite)}
                      </span>
                      {w.rDeltaSite != null && (
                        <span style={{ fontSize:9, color:C.sub }}>m³/d</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Individual activity card ───────────────────────────────────────────────────
function MetricCol({ label, days, vol, rate, color, dimmed, C }) {
  const fmt  = v => v != null && v > 0 ? Math.round(v).toLocaleString() : '—';
  const fmtD = v => v ? `${v}d` : '—';
  const fmtR = v => v != null && v > 0 ? v.toFixed(2) : '—';
  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', gap:4, opacity: dimmed ? 0.45 : 1 }}>
      <div style={{ fontSize:9, fontWeight:800, textTransform:'uppercase', letterSpacing:0.6,
        color, borderBottom:`1.5px solid ${color}44`, paddingBottom:3, marginBottom:2 }}>{label}</div>
      <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
        {[['Days', fmtD(days)],['Vol', fmt(vol)],['Rate', fmtR(rate)]].map(([l,v])=>(
          <div key={l} style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:9, color:C.sub }}>{l}</span>
            <span style={{ fontSize:11, fontWeight:700, color: dimmed?C.sub:l==='Rate'?color:C.text, fontFamily:'monospace' }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProdCard({ task, col, C }) {
  const hasSite  = !!(task.actual_s);
  const blpRate  = task.blp_dur && task.volume ? task.volume / task.blp_dur : null;
  const ccRate   = task.cc_dur  && task.volume ? task.volume / task.cc_dur  : null;
  const siteRate = task.site_dur && (task.site_qty || task.volume)
    ? (task.site_qty || task.volume) / task.site_dur : null;

  // Derive area label from task zone
  const areaLabel = (() => {
    for (const ag of AREA_GROUPS) {
      for (const sg of ag.subgroups) {
        if (sg.zones.some(z => z.taskZones && z.taskZones.includes(task.zone) || z.key === task.zone)) return ag.label;
      }
    }
    return null;
  })();

  let score = 0, cnt = 0;
  if (hasSite) {
    if (ccRate && siteRate)               { score += siteRate >= ccRate ? 1:0; cnt++; }
    if (task.cc_dur && task.site_dur)     { score += task.site_dur <= task.cc_dur ? 1:0; cnt++; }
    const sv = task.site_qty||task.volume, cv = task.volume;
    if (cv && sv)                         { score += sv >= cv*0.9 ? 1:0; cnt++; }
  }
  const pct    = cnt > 0 ? score/cnt : null;
  const status = !hasSite ? 'pending' : pct>=0.67 ? 'on-track' : pct>=0.34 ? 'at-risk' : 'behind';
  const sm     = { 'on-track':{ color:'#22c55e', label:'✓ On Track' }, 'at-risk':{ color:'#f59e0b', label:'⚠ At Risk' },
                   'behind':  { color:'#ef4444', label:'✗ Behind'  }, 'pending':{ color:C.sub,    label:'○ Not Started' }};
  const { color:sc, label:sl } = sm[status];
  const type    = pcClassify(task.activity);
  const typeCol = PC_TYPE_COLORS[type]||'#94a3b8';
  const durDelta = (task.cc_dur && task.blp_dur) ? task.cc_dur - task.blp_dur : null;

  return (
    <div style={{ background:C.panel, border:`1px solid ${C.border}`, borderLeft:`3.5px solid ${sc}`,
      borderRadius:10, padding:'12px 14px', display:'flex', flexDirection:'column', gap:10,
      boxShadow:'0 1px 4px rgba(0,0,0,0.06)', transition:'box-shadow 0.15s' }}
      onMouseEnter={e=>e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,0.12)'}
      onMouseLeave={e=>e.currentTarget.style.boxShadow='0 1px 4px rgba(0,0,0,0.06)'}
    >
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:3, flexWrap:'wrap' }}>
            <span style={{ fontSize:8, background:typeCol+'22', color:typeCol, padding:'1px 6px',
              borderRadius:20, fontWeight:700, border:`1px solid ${typeCol}44` }}>{PC_TYPE_LABELS[type]}</span>
            {task.level && <span style={{ fontSize:8, color:C.sub, fontWeight:700 }}>{task.level}</span>}
          </div>
          {/* Area › Zone breadcrumb */}
          <div style={{ display:'flex', alignItems:'center', gap:3, marginBottom:4 }}>
            {areaLabel && <span style={{ fontSize:8, color:C.muted, fontWeight:600 }}>{areaLabel}</span>}
            {areaLabel && <span style={{ fontSize:8, color:C.muted }}>›</span>}
            <span style={{ fontSize:8, color:C.sub, fontWeight:700 }}>{task.zone}</span>
          </div>
          <div style={{ fontSize:11, fontWeight:700, color:C.text, lineHeight:1.3,
            overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={task.activity}>
            {task.activity}
          </div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:3, flexShrink:0 }}>
          <span style={{ fontSize:9, fontWeight:800, color:sc, background:sc+'18',
            padding:'2px 7px', borderRadius:20, border:`1px solid ${sc}44` }}>{sl}</span>
          {durDelta !== null && <span style={{ fontSize:8, fontWeight:700,
            color: durDelta<0?'#22c55e':durDelta>0?'#f59e0b':C.sub }}>
            {durDelta>0?`+${durDelta}d`:durDelta<0?`${durDelta}d`:'= same'}
          </span>}
        </div>
      </div>
      <div style={{ height:1, background:C.border }}/>
      <div style={{ display:'flex', gap:10 }}>
        <MetricCol label="BLP"      days={task.blp_dur}  vol={task.volume}              rate={blpRate}  color={C.sub}              dimmed={false}   C={C}/>
        <div style={{ width:1, background:C.border }}/>
        <MetricCol label="Catch Up" days={task.cc_dur}   vol={task.volume}              rate={ccRate}   color={col}                dimmed={false}   C={C}/>
        <div style={{ width:1, background:C.border }}/>
        <MetricCol label="Site"     days={task.site_dur} vol={task.site_qty||task.volume} rate={siteRate} color={hasSite?'#22c55e':C.muted} dimmed={!hasSite} C={C}/>
      </div>
      {hasSite && task.cc_dur > 0 && (
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:8, color:C.sub, marginBottom:2 }}>
            <span>Site vs CC duration progress</span>
            <span style={{ color:sc }}>{Math.round(Math.min(100,(task.site_dur||0)/task.cc_dur*100))}%</span>
          </div>
          <div style={{ height:3, background:C.inputBg, borderRadius:99, overflow:'hidden' }}>
            <div style={{ width:`${Math.min(100,(task.site_dur||0)/task.cc_dur*100)}%`,
              height:'100%', background:sc, borderRadius:99, transition:'width 0.4s' }}/>
          </div>
        </div>
      )}
    </div>
  );
}

function ProductivityCardView({ tasks, col, areaAllTaskZones, zoneDef, areaLabel, C }) {
  const today    = new Date().toISOString().slice(0,10);
  const defaultQ = PC_QUARTERS.find(q => today >= q.s && today <= q.e)?.key || 'Q1-26';
  const [activeQ,    setActiveQ]    = useState(defaultQ);
  const [showNoSite, setShowNoSite] = useState(false);

  const qDef   = PC_QUARTERS.find(q=>q.key===activeQ);
  const allowed = zoneDef ? new Set(zoneDef.taskZones) : areaAllTaskZones;

  const qTasks = useMemo(() => {
    if (!qDef) return [];
    return tasks.filter(t => allowed.has(t.zone) && t.cc_e && t.cc_e >= qDef.s && t.cc_e <= qDef.e);
  }, [tasks, activeQ, qDef, allowed]);

  const visibleTasks = showNoSite ? qTasks : qTasks.filter(t=>t.actual_s);
  const noSiteCount  = qTasks.filter(t=>!t.actual_s).length;

  // Zone → type → tasks
  const grouped = useMemo(() => {
    const m = {};
    visibleTasks.forEach(t => {
      if (!m[t.zone]) m[t.zone] = {};
      const ty = pcClassify(t.activity);
      if (!m[t.zone][ty]) m[t.zone][ty] = [];
      m[t.zone][ty].push(t);
    });
    return m;
  }, [visibleTasks]);

  return (
    <div style={{ background:C.bg, minHeight:'100vh', padding:'20px 24px', fontFamily:"'Poppins',sans-serif" }}>


      <div style={{ marginBottom:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
          <span style={{ background:'#8b5cf6', color:'#fff', fontSize:10, fontWeight:800,
            padding:'3px 10px', borderRadius:4, letterSpacing:1, textTransform:'uppercase' }}>Productivity Cards</span>
          <span style={{ color:C.sub, fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:1 }}>Quarterly Target Review</span>
        </div>
        <div style={{ fontSize:18, fontWeight:900, color:C.text }}>{zoneDef?.label||'All Zones'} — BLP · CC · Site Comparison</div>
        <div style={{ color:C.sub, fontSize:11, marginTop:2 }}>Select a quarter to drill into individual activities</div>
      </div>

      {/* ── QUARTER BOARD (always visible) ── */}
      <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:20 }}>
        {PC_QUARTERS.map((q, qi) => (
          <QSummaryCard key={q.key} qDef={q} qIdx={qi} tasks={tasks} areaAllTaskZones={areaAllTaskZones}
            zoneDef={zoneDef} areaLabel={areaLabel} isSelected={q.key===activeQ} col={col} C={C}
            onClick={()=>setActiveQ(q.key===activeQ ? null : q.key)}/>
        ))}
      </div>

      {/* ── DRILL-DOWN: selected quarter cards ── */}
      <div style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:12,
        padding:'16px 20px', marginBottom:16 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8 }}>
          <div>
            <span style={{ fontSize:13, fontWeight:800, color:C.text }}>{qDef?.label} · {qDef?.mRange} · {qDef?.sub}</span>
            <span style={{ fontSize:11, color:C.sub, marginLeft:10 }}>
              {qTasks.length} activities · {qTasks.filter(t=>t.actual_s).length} with site data
            </span>
          </div>
          <button onClick={()=>setShowNoSite(s=>!s)} style={{
            display:'flex', alignItems:'center', gap:6, padding:'5px 12px', borderRadius:20,
            border:`1.5px solid ${showNoSite?'#8b5cf6':C.border}`,
            background: showNoSite?'#8b5cf622':C.inputBg,
            color: showNoSite?'#8b5cf6':C.sub,
            cursor:'pointer', fontSize:10, fontFamily:'inherit', fontWeight:700
          }}>
            {showNoSite ? '▲ Hide Not Started' : `▼ Show Not Started (${noSiteCount})`}
          </button>
        </div>
      </div>

      {/* Cards */}
      {Object.keys(grouped).length === 0 ? (
        <div style={{ textAlign:'center', padding:'60px 20px', color:C.sub }}>
          <div style={{ fontSize:36, marginBottom:12 }}>📭</div>
          <div style={{ fontSize:15, fontWeight:700, color:C.text, marginBottom:6 }}>
            No tasks with site data in {activeQ}
          </div>
          <div style={{ fontSize:12 }}>
            {noSiteCount>0 ? `${noSiteCount} tasks exist but have no site dates yet. Toggle "Show Not Started" to reveal.`
              : 'No activities have CC end dates within this quarter window.'}
          </div>
        </div>
      ) : (
        Object.entries(grouped).sort(([a],[b])=>a.localeCompare(b)).map(([zone, typeMap])=>(
          <div key={zone} style={{ marginBottom:24 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
              <div style={{ height:1, flex:1, background:C.border }}/>
              <span style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:1,
                color:col, background:col+'18', padding:'3px 12px', borderRadius:20, border:`1px solid ${col}33` }}>{zone}</span>
              <div style={{ height:1, flex:1, background:C.border }}/>
            </div>
            {Object.entries(typeMap).sort(([a],[b])=>a.localeCompare(b)).map(([type, typeTasks])=>{
              const tc = PC_TYPE_COLORS[type]||'#94a3b8';
              return (
                <div key={type} style={{ marginBottom:16 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
                    <span style={{ fontSize:9, fontWeight:800, color:tc, background:tc+'18',
                      padding:'2px 8px', borderRadius:4, border:`1px solid ${tc}33`,
                      textTransform:'uppercase', letterSpacing:0.5 }}>{PC_TYPE_LABELS[type]}</span>
                    <span style={{ fontSize:9, color:C.sub }}>{typeTasks.length} activities</span>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:10 }}>
                    {typeTasks.map(t=><ProdCard key={t.id} task={t} col={col} C={C}/>)}
                  </div>
                </div>
              );
            })}
          </div>
        ))
      )}
    </div>
  );
}


// ─── RESOURCE TRACKER VIEW ────────────────────────────────────────────────────
const RES_ZONES = [
  'Zone A-1','Zone A-3','Zone A-4',
  'Zone C-1','Zone C-2','Zone C-3',
  'Zone P-1','Zone P-3',
  'Zone A-2.1','Zone A-2.2',
  'Zone B-2.1','Zone B-2.2','Zone B-3.1','Zone B-3.2',
  'Zone P-2','Zone P-4',
];
const RES_WORK_TYPES = ['Excavation','Demolition','Slab / Platform','Core / Column'];
const RES_EQUIP_TYPES = ['Excavators','Cranes','Dump Trucks','Concrete Pumps'];

const DEFAULT_BENCHMARKS = {
  'Excavation':     { manOutput:8,   equip:'Excavators',     equipOutput:150 },
  'Demolition':     { manOutput:6,   equip:'Excavators',     equipOutput:80  },
  'Slab / Platform':{ manOutput:12,  equip:'Concrete Pumps', equipOutput:120 },
  'Core / Column':  { manOutput:10,  equip:'Cranes',         equipOutput:60  },
};

function ResourceTrackerView({ tasks, col, areaAllTaskZones, zoneDef, C }) {

  // Benchmarks: output per man per day (m³), output per machine per day (m³)
  const [benchmarks, setBenchmarks] = useState({ ...DEFAULT_BENCHMARKS });
  const [editing, setEditing] = useState(null); // { zone, workType, field }

  // Resource register: { [zone]: { [workType]: { planMan, actMan, planEquip, actEquip } } }
  const [register, setRegister] = useState(() => {
    const r = {};
    RES_ZONES.forEach(z => {
      r[z] = {};
      RES_WORK_TYPES.forEach(wt => {
        r[z][wt] = { planMan:0, actMan:0, planEquip:0, actEquip:0 };
      });
    });
    return r;
  });

  const [activeZone,  setActiveZone]  = useState(null);
  const [showBench,   setShowBench]   = useState(false);
  const [activeWType, setActiveWType] = useState('All');

  // Derive CC rate per zone+worktype from tasks
  const ccRates = useMemo(() => {
    const map = {};
    const allowed = zoneDef ? new Set(zoneDef.taskZones) : areaAllTaskZones;
    tasks.filter(t => allowed.has(t.zone)).forEach(t => {
      const a = t.activity.toLowerCase();
      let wt = 'Core / Column';
      if (a.includes('excavat') || a.includes('berm'))            wt = 'Excavation';
      else if (a.includes('demolish')||a.includes('remov'))       wt = 'Demolition';
      else if (a.includes('slab')||a.includes('stitch')||a.includes('platform')) wt = 'Slab / Platform';
      const key = `${t.zone}||${wt}`;
      if (!map[key]) map[key] = { totalVol:0, totalDays:0 };
      map[key].totalVol  += (t.volume || 0);
      map[key].totalDays += (t.cc_dur  || 0);
    });
    const rates = {};
    Object.entries(map).forEach(([k,v]) => {
      rates[k] = v.totalDays > 0 ? v.totalVol / v.totalDays : 0;
    });
    return rates;
  }, [tasks, zoneDef, areaAllTaskZones]);

  function setReg(zone, wt, field, val) {
    setRegister(prev => ({
      ...prev,
      [zone]: { ...prev[zone], [wt]: { ...prev[zone][wt], [field]: Math.max(0, parseInt(val)||0) } }
    }));
  }

  // Compute derived values for a zone+worktype
  function compute(zone, wt) {
    const b   = benchmarks[wt] || DEFAULT_BENCHMARKS[wt];
    const reg = register[zone]?.[wt] || { planMan:0, actMan:0, planEquip:0, actEquip:0 };
    const ccRate = ccRates[`${zone}||${wt}`] || 0;
    // How many resources NEEDED to hit CC rate
    const reqMan   = b.manOutput   > 0 ? Math.ceil(ccRate / b.manOutput)   : 0;
    const reqEquip = b.equipOutput > 0 ? Math.ceil(ccRate / b.equipOutput) : 0;
    // Actual output achievable with current deployment
    const actOutput = Math.min(reg.actMan * b.manOutput, reg.actEquip * b.equipOutput || Infinity);
    const rateGap   = ccRate - (reg.actEquip > 0 ? reg.actEquip * b.equipOutput : reg.actMan * b.manOutput);
    const manGap    = reqMan   - reg.actMan;
    const equipGap  = reqEquip - reg.actEquip;
    return { ccRate, reqMan, reqEquip, manGap, equipGap, rateGap, b, reg };
  }

  // Visible zones
  const visZones = useMemo(() => {
    const allowed = zoneDef ? new Set(zoneDef.taskZones) : areaAllTaskZones;
    return RES_ZONES.filter(z => allowed.has(z) && tasks.some(t => t.zone === z));
  }, [tasks, zoneDef, areaAllTaskZones]);

  const selZones = activeZone ? [activeZone] : visZones;

  // Summary totals across visible zones
  const summary = useMemo(() => {
    let totalManGap=0, totalEquipGap=0, totalRateGap=0, atRisk=0;
    visZones.forEach(z => {
      RES_WORK_TYPES.forEach(wt => {
        const { manGap, equipGap, rateGap } = compute(z, wt);
        totalManGap   += Math.max(0, manGap);
        totalEquipGap += Math.max(0, equipGap);
        totalRateGap  += rateGap;
        if (manGap > 0 || equipGap > 0) atRisk++;
      });
    });
    return { totalManGap, totalEquipGap, totalRateGap, atRisk };
  }, [register, benchmarks, visZones, ccRates]);

  const wtColors = { 'Excavation':'#fb923c','Demolition':'#f87171','Slab / Platform':'#34d399','Core / Column':'#818cf8' };
  const equipIcons = { 'Excavators':'🚜','Cranes':'🏗','Dump Trucks':'🚛','Concrete Pumps':'🔩' };

  function NumInput({ value, onChange, color }) {
    return (
      <input type="number" min={0} value={value||''} placeholder="0"
        onChange={e => onChange(e.target.value)}
        style={{ width:48, padding:'3px 6px', borderRadius:5, border:`1px solid ${color}55`,
          background:C.inputBg, color:C.text, fontSize:11, fontWeight:700,
          fontFamily:'monospace', textAlign:'center', outline:'none' }}/>
    );
  }

  return (
    <div style={{ background:C.bg, minHeight:'100vh', padding:'20px 24px', fontFamily:"'Poppins',sans-serif" }}>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16, flexWrap:'wrap', gap:10 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
            <span style={{ background:'#f59e0b', color:'#000', fontSize:10, fontWeight:800,
              padding:'3px 10px', borderRadius:4, letterSpacing:1, textTransform:'uppercase' }}>Resource Tracker</span>
            <span style={{ color:C.sub, fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:1 }}>Manpower & Equipment vs Rate</span>
          </div>
          <div style={{ fontSize:18, fontWeight:900, color:C.text }}>{zoneDef?.label||'All Zones'} — Deployment vs CC Target</div>
          <div style={{ color:C.sub, fontSize:11, marginTop:2 }}>Key in planned & actual resources · gap auto-calculated from CC rate ÷ benchmark output</div>
        </div>
        <button onClick={()=>setShowBench(s=>!s)} style={{
          padding:'6px 14px', borderRadius:8, border:`1.5px solid ${showBench?'#f59e0b':C.border}`,
          background:showBench?'#f59e0b22':C.inputBg, color:showBench?'#f59e0b':C.sub,
          cursor:'pointer', fontSize:11, fontFamily:'inherit', fontWeight:700
        }}>⚙️ {showBench?'Hide':'Edit'} Benchmarks</button>
      </div>

      {/* Benchmark editor */}
      {showBench && (
        <div style={{ background:C.panel, border:`1px solid #f59e0b44`, borderLeft:`3px solid #f59e0b`,
          borderRadius:10, padding:'14px 18px', marginBottom:16 }}>
          <div style={{ fontSize:11, fontWeight:800, color:'#f59e0b', marginBottom:10, textTransform:'uppercase', letterSpacing:0.5 }}>
            Output Benchmarks (edit to match your site conditions)
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:10 }}>
            {RES_WORK_TYPES.map(wt => {
              const b = benchmarks[wt];
              const wc = wtColors[wt]||col;
              return (
                <div key={wt} style={{ background:C.inputBg, borderRadius:8, padding:'10px 12px',
                  border:`1px solid ${wc}33` }}>
                  <div style={{ fontSize:9, fontWeight:800, color:wc, textTransform:'uppercase',
                    letterSpacing:0.5, marginBottom:8 }}>{wt}</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <span style={{ fontSize:10, color:C.sub }}>👷 m³/worker/day</span>
                      <input type="number" value={b.manOutput} min={1}
                        onChange={e=>setBenchmarks(p=>({...p,[wt]:{...p[wt],manOutput:parseFloat(e.target.value)||1}}))}
                        style={{ width:52, padding:'3px 6px', borderRadius:5, border:`1px solid ${wc}44`,
                          background:C.bg, color:C.text, fontSize:11, fontWeight:700, fontFamily:'monospace', textAlign:'center' }}/>
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <span style={{ fontSize:10, color:C.sub }}>{equipIcons[b.equip]||'🔧'} {b.equip} m³/unit/day</span>
                      <input type="number" value={b.equipOutput} min={1}
                        onChange={e=>setBenchmarks(p=>({...p,[wt]:{...p[wt],equipOutput:parseFloat(e.target.value)||1}}))}
                        style={{ width:52, padding:'3px 6px', borderRadius:5, border:`1px solid ${wc}44`,
                          background:C.bg, color:C.text, fontSize:11, fontWeight:700, fontFamily:'monospace', textAlign:'center' }}/>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Summary strip */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:20 }}>
        {[
          { label:'Manpower Gap',   val:`+${summary.totalManGap} pax`,  sub:'Additional workers needed', color:'#ef4444', icon:'👷' },
          { label:'Equipment Gap',  val:`+${summary.totalEquipGap} units`, sub:'Additional machines needed', color:'#f59e0b', icon:'🚜' },
          { label:'Rate Shortfall', val:`${summary.totalRateGap>0?'+':''}${Math.round(summary.totalRateGap)} m³/d`, sub:'vs CC plan across all zones', color: summary.totalRateGap>0?'#ef4444':'#22c55e', icon:'📉' },
          { label:'At-Risk Zones',  val:`${summary.atRisk}`, sub:'Zone × work type combos under-resourced', color:'#f59e0b', icon:'⚠️' },
        ].map(({label,val,sub,color,icon})=>(
          <div key={label} style={{ background:C.panel, border:`1px solid ${C.border}`,
            borderTop:`3px solid ${color}`, borderRadius:10, padding:'12px 16px' }}>
            <div style={{ fontSize:9, color:C.sub, fontWeight:700, textTransform:'uppercase', letterSpacing:0.5, marginBottom:4 }}>{icon} {label}</div>
            <div style={{ fontSize:20, fontWeight:900, color, fontFamily:'monospace' }}>{val}</div>
            <div style={{ fontSize:9, color:C.sub, marginTop:3 }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Zone filter pills */}
      <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:12, alignItems:'center' }}>
        <span style={{ fontSize:9, color:C.sub, fontWeight:700, textTransform:'uppercase' }}>Zone:</span>
        <button onClick={()=>setActiveZone(null)} style={{
          padding:'3px 10px', borderRadius:20, border:`1px solid ${!activeZone?col:C.border}`,
          background:!activeZone?col+'22':C.panel, color:!activeZone?col:C.sub,
          cursor:'pointer', fontSize:10, fontWeight:700, fontFamily:'inherit' }}>All</button>
        {visZones.map(z=>(
          <button key={z} onClick={()=>setActiveZone(z===activeZone?null:z)} style={{
            padding:'3px 10px', borderRadius:20, border:`1px solid ${activeZone===z?col:C.border}`,
            background:activeZone===z?col+'22':C.panel, color:activeZone===z?col:C.sub,
            cursor:'pointer', fontSize:10, fontWeight:700, fontFamily:'inherit' }}>{z}</button>
        ))}
        <div style={{ flex:1 }}/>
        <span style={{ fontSize:9, color:C.sub, fontWeight:700, textTransform:'uppercase' }}>Work Type:</span>
        {['All',...RES_WORK_TYPES].map(wt=>{
          const wc = wtColors[wt]||col;
          return (
            <button key={wt} onClick={()=>setActiveWType(wt)} style={{
              padding:'3px 10px', borderRadius:20, border:`1px solid ${activeWType===wt?wc:C.border}`,
              background:activeWType===wt?wc+'22':C.panel, color:activeWType===wt?wc:C.sub,
              cursor:'pointer', fontSize:10, fontWeight:700, fontFamily:'inherit' }}>{wt}</button>
          );
        })}
      </div>

      {/* Main table */}
      <div style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:12, overflow:'hidden' }}>
        {/* Table header */}
        <div style={{ display:'grid', gridTemplateColumns:'160px 100px 1fr 1fr 1fr', background:C.tableHead,
          borderBottom:`1px solid ${C.border}`, fontSize:8, fontWeight:800, textTransform:'uppercase',
          letterSpacing:0.5, color:C.sub }}>
          <div style={{ padding:'8px 14px' }}>Zone / Work Type</div>
          <div style={{ padding:'8px 10px', textAlign:'center' }}>CC Rate<br/><span style={{fontSize:7,opacity:0.7}}>m³/day</span></div>
          <div style={{ padding:'8px 10px', textAlign:'center', borderLeft:`1px solid ${C.border}` }}>
            👷 Manpower<br/>
            <div style={{ display:'flex', justifyContent:'space-around', fontSize:7, marginTop:2, color:C.muted }}>
              <span>Plan</span><span>Act</span><span>Req</span><span>Gap</span>
            </div>
          </div>
          <div style={{ padding:'8px 10px', textAlign:'center', borderLeft:`1px solid ${C.border}` }}>
            🚜 Equipment<br/>
            <div style={{ display:'flex', justifyContent:'space-around', fontSize:7, marginTop:2, color:C.muted }}>
              <span>Plan</span><span>Act</span><span>Req</span><span>Gap</span>
            </div>
          </div>
          <div style={{ padding:'8px 10px', textAlign:'center', borderLeft:`1px solid ${C.border}` }}>
            Rate Achievement<br/>
            <div style={{ display:'flex', justifyContent:'space-around', fontSize:7, marginTop:2, color:C.muted }}>
              <span>Output</span><span>Target</span><span>Gap</span><span>Status</span>
            </div>
          </div>
        </div>

        {selZones.length === 0 ? (
          <div style={{ padding:'40px', textAlign:'center', color:C.sub }}>
            <div style={{ fontSize:28, marginBottom:8 }}>📋</div>
            <div style={{ fontWeight:700, color:C.text }}>No zones with task data in current filter</div>
          </div>
        ) : selZones.map((zone, zi) => {
          const wtRows = RES_WORK_TYPES.filter(wt => activeWType==='All' || wt===activeWType);
          return (
            <div key={zone}>
              {/* Zone divider */}
              <div style={{ padding:'6px 14px', background:col+'10', borderTop:`1px solid ${col}22`,
                borderBottom:`1px solid ${col}22`, fontSize:9, fontWeight:800,
                textTransform:'uppercase', letterSpacing:0.8, color:col }}>
                {zone}
              </div>

              {wtRows.map((wt, wi) => {
                const wc = wtColors[wt]||col;
                const { ccRate, reqMan, reqEquip, manGap, equipGap, rateGap, b, reg } = compute(zone, wt);
                const actOutput = reg.actEquip > 0
                  ? reg.actEquip * b.equipOutput
                  : reg.actMan * b.manOutput;
                const gapColor  = rateGap > 10 ? '#ef4444' : rateGap > 0 ? '#f59e0b' : '#22c55e';
                const statusLabel = !reg.actMan && !reg.actEquip ? '○ Unset'
                  : rateGap > 10 ? '✗ Under'
                  : rateGap > 0  ? '⚠ Risk'
                  : '✓ OK';
                const rowBg = wi%2===0 ? C.tableRow0 : C.tableRow1;

                return (
                  <div key={wt} style={{ display:'grid', gridTemplateColumns:'160px 100px 1fr 1fr 1fr',
                    background:rowBg, borderBottom:`1px solid ${C.border}`,
                    transition:'background 0.1s' }}
                    onMouseEnter={e=>e.currentTarget.style.background=C.tableHover}
                    onMouseLeave={e=>e.currentTarget.style.background=rowBg}
                  >
                    {/* Zone / Work Type */}
                    <div style={{ padding:'8px 14px', display:'flex', alignItems:'center' }}>
                      <span style={{ fontSize:8, background:wc+'22', color:wc, padding:'1px 6px',
                        borderRadius:20, fontWeight:700, border:`1px solid ${wc}33`, whiteSpace:'nowrap' }}>{wt}</span>
                    </div>

                    {/* CC Rate */}
                    <div style={{ padding:'8px 10px', textAlign:'center', display:'flex',
                      alignItems:'center', justifyContent:'center' }}>
                      <span style={{ fontSize:12, fontWeight:800, color: ccRate>0?col:C.muted,
                        fontFamily:'monospace' }}>{ccRate>0?ccRate.toFixed(1):'—'}</span>
                    </div>

                    {/* Manpower */}
                    <div style={{ padding:'6px 10px', borderLeft:`1px solid ${C.border}`,
                      display:'flex', alignItems:'center', justifyContent:'space-around', gap:4 }}>
                      <NumInput value={reg.planMan} onChange={v=>setReg(zone,wt,'planMan',v)} color='#94a3b8'/>
                      <NumInput value={reg.actMan}  onChange={v=>setReg(zone,wt,'actMan',v)}  color='#22c55e'/>
                      <span style={{ fontSize:11, fontWeight:700, color:C.sub, fontFamily:'monospace',
                        minWidth:28, textAlign:'center' }}>{ccRate>0?reqMan:'—'}</span>
                      <span style={{ fontSize:11, fontWeight:800, fontFamily:'monospace', minWidth:28, textAlign:'center',
                        color: manGap>0?'#ef4444':manGap<0?'#22c55e':C.sub }}>
                        {ccRate>0?(manGap>0?`+${manGap}`:manGap):'—'}
                      </span>
                    </div>

                    {/* Equipment */}
                    <div style={{ padding:'6px 10px', borderLeft:`1px solid ${C.border}`,
                      display:'flex', alignItems:'center', justifyContent:'space-around', gap:4 }}>
                      <NumInput value={reg.planEquip} onChange={v=>setReg(zone,wt,'planEquip',v)} color='#94a3b8'/>
                      <NumInput value={reg.actEquip}  onChange={v=>setReg(zone,wt,'actEquip',v)} color='#22c55e'/>
                      <span style={{ fontSize:11, fontWeight:700, color:C.sub, fontFamily:'monospace',
                        minWidth:28, textAlign:'center' }}>{ccRate>0?reqEquip:'—'}</span>
                      <span style={{ fontSize:11, fontWeight:800, fontFamily:'monospace', minWidth:28, textAlign:'center',
                        color: equipGap>0?'#ef4444':equipGap<0?'#22c55e':C.sub }}>
                        {ccRate>0?(equipGap>0?`+${equipGap}`:equipGap):'—'}
                      </span>
                    </div>

                    {/* Rate achievement */}
                    <div style={{ padding:'6px 14px', borderLeft:`1px solid ${C.border}`,
                      display:'flex', alignItems:'center', justifyContent:'space-around', gap:6 }}>
                      <span style={{ fontSize:11, fontWeight:700, color:actOutput>0?C.text:C.muted,
                        fontFamily:'monospace' }}>{actOutput>0?actOutput.toFixed(0):'—'}</span>
                      <span style={{ fontSize:11, fontWeight:700, color:col, fontFamily:'monospace' }}>
                        {ccRate>0?ccRate.toFixed(0):'—'}</span>
                      <span style={{ fontSize:11, fontWeight:800, color:gapColor, fontFamily:'monospace' }}>
                        {ccRate>0&&actOutput>0?(rateGap>0?`+${Math.round(rateGap)}`:Math.round(rateGap)):'—'}</span>
                      <span style={{ fontSize:9, fontWeight:800, color:gapColor,
                        background:gapColor+'18', padding:'1px 6px', borderRadius:20,
                        border:`1px solid ${gapColor}33`, whiteSpace:'nowrap' }}>{statusLabel}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop:10, fontSize:9, color:C.muted, textAlign:'right' }}>
        💡 Plan = target deployment · Act = current site deployment · Req = calculated from CC rate ÷ benchmark · Gap = Req − Act
      </div>
    </div>
  );
}

// ─── HEDGING VIEW ─────────────────────────────────────────────────────────────
const QUARTER_ORDER = ['q1','q2','q3','q4'];
const TYPE_LABELS = { all:'All', demolish:'Demolition', excavate:'Excavation', slab:'Slab / Platform', column:'Core / Column' };
const TYPE_COLORS = { demolish:'#f87171', excavate:'#fb923c', slab:'#34d399', column:'#818cf8' };

function classifyType(activity) {
  const a = (activity||'').toLowerCase();
  if (a.includes('demol') || a.includes('remove') || a.includes('strip'))       return 'demolish';
  if (a.includes('excav') || a.includes('earthwork') || a.includes('berm'))     return 'excavate';
  if (a.includes('slab') || a.includes('deck') || a.includes('platform') ||
      a.includes('transfer') || a.includes('cast') || a.includes('double-t'))   return 'slab';
  if (a.includes('column') || a.includes('wall') || a.includes('core') ||
      a.includes('pile') || a.includes('shaft') || a.includes('pilecap') ||
      a.includes('substructure') || a.includes('steel beam'))                   return 'column';
  return 'slab';
}

function assignQuarter(cc_e) {
  if (!cc_e) return 'q4';
  const d = new Date(cc_e);
  if (d <= new Date('2026-06-30')) return 'q1';
  if (d <= new Date('2026-09-30')) return 'q2';
  if (d <= new Date('2026-12-31')) return 'q3';
  return 'q4';
}

function zoneGroup(zone) {
  const z = (zone||'').toLowerCase();
  if (z.includes('b-2') || z.includes('b-3') || z.includes('b.2') || z.includes('b.3')) return 'b';
  if (z.includes('c-') || z.includes('c.'))  return 'c';
  if (z.includes('p-') || z.includes('p.') || z.includes('p1') || z.includes('p2') || z.includes('p3') || z.includes('p4')) return 'p';
  return 'a';
}

// ─── SETTLEMENT ───────────────────────────────────────────────────────────────
const SETTLEMENT_QUARTERS = PC_QUARTERS.map((q, i) => ({
  key: `q${i+1}`,
  label: q.label,
  mRange: q.mRange,
  period: q.sub,
  start: q.s,
  end: q.e,
  rec:   ['+15d','+20d','+30d','+43d'][i] || '—',
  delay: ['-93d','-73d','-43d','0d'][i]   || '—',
  prog:  [15, 35, 65, 100][i]             || 100,
}));
const SETT_CAT_LABELS = { demolish:'Demolition', excavate:'Excavation', slab:'Slab / Platform', column:'Core / Column' };
const SETT_CAT_COLORS = { demolish:'#f87171', excavate:'#fb923c', slab:'#34d399', column:'#818cf8' };

function SettlementView({ tasks, col, areaAllTaskZones, zoneDef, filterLevel, C }) {
  const [activeQ,       setActiveQ]       = useState('q1');
  const [activeCat,     setActiveCat]     = useState('all');
  const [hideFinished,  setHideFinished]  = useState(false);
  const [hideUnstarted, setHideUnstarted] = useState(false);

  const qDef = SETTLEMENT_QUARTERS.find(q => q.key === activeQ);
  // tasks is already ganttTasks — pre-filtered by area/zone/level
  const allTasks = tasks;

  // Per-task time-ratio settlement
  const settled = useMemo(() => {
    if (!qDef) return [];
    return allTasks.filter(t => t.cc_s && t.cc_e).map(t => {
      const tS = new Date(t.cc_s), tE = new Date(t.cc_e);
      const qS = new Date(qDef.start), qE = new Date(qDef.end);
      const totalDur   = Math.max(1, (tE - tS) / 86400000);
      const ovS        = new Date(Math.max(tS, qS));
      const ovE        = new Date(Math.min(tE, qE));
      const overlapDur = Math.max(0, (ovE - ovS) / 86400000 + 1);
      const cumE       = new Date(Math.min(tE, qE));
      const cumDur     = Math.max(0, (cumE - tS) / 86400000 + 1);
      const qty        = t.cc_qty || t.volume || 0;
      const qQty       = Math.floor((overlapDur / totalDur) * qty);
      const cumDone    = Math.floor(Math.min(1, cumDur / totalDur) * qty);
      const cumPct     = Math.min(100, Math.round((cumDone / Math.max(qty, 1)) * 100));
      const allocPct   = Math.round((overlapDur / totalDur) * 100);
      const type       = pcClassify(t.activity);
      const isActive   = overlapDur > 0;
      const isDone     = cumPct >= 100;
      return { ...t, overlapDur:Math.round(overlapDur), totalDur:Math.round(totalDur),
               qQty, cumDone, cumPct, allocPct, qty, type, active:isActive, isDone };
    });
  }, [allTasks, activeQ]);

  // Category totals
  const catTotals = useMemo(() => {
    const agg = {};
    ['demolish','excavate','slab','column'].forEach(c => agg[c] = {total:0, done:0});
    settled.forEach(t => { if (agg[t.type]) { agg[t.type].total += t.qty; agg[t.type].done += t.cumDone; } });
    return agg;
  }, [settled]);

  const projTotal = settled.reduce((s,t) => s + t.qty, 0);
  const projDone  = settled.reduce((s,t) => s + t.cumDone, 0);
  const projPct   = projTotal > 0 ? ((projDone/projTotal)*100).toFixed(1) : '0';
  const qVol      = settled.filter(t => t.active).reduce((s,t) => s + t.qQty, 0);
  const carryCount= settled.filter(t => !t.isDone && t.cc_e > (qDef?.end||'')).length;
  const fmtN      = v => Math.round(v).toLocaleString();

  // Visible tasks (filtered)
  const visibleTasks = useMemo(() => settled.filter(t => {
    if (!t.active && !t.cumDone) return false;
    if (activeCat !== 'all' && t.type !== activeCat) return false;
    if (hideFinished && t.isDone) return false;
    if (hideUnstarted && t.overlapDur <= 0) return false;
    return true;
  }), [settled, activeCat, hideFinished, hideUnstarted]);

  return (
    <div style={{ background:C.bg, minHeight:'60vh', padding:'20px 24px', fontFamily:"'Poppins',sans-serif" }}>

      {/* ── HEADER CARD (Hedging style) ── */}
      <div style={{ background:C.nav, borderRadius:12, border:`1px solid ${C.border}`, padding:'20px 24px', marginBottom:16 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12 }}>
          <div>
            <div style={{ fontSize:15, fontWeight:900, color:C.text, textTransform:'uppercase', letterSpacing:-0.3 }}>
              M19–M33 Settlement Board · 15-20-30-43 Scheme
            </div>
            <div style={{ fontSize:10, color:C.sub, marginTop:3, fontStyle:'italic' }}>
              19-Day Milestone Cycle · Time-Ratio Settlement · Target: 108d Hedge Recovery
              &nbsp;·&nbsp;<span style={{ color:'#3b82f6', fontWeight:700, fontStyle:'normal' }}>{qDef?.rec}</span>
              &nbsp;this quarter
            </div>
          </div>
          {/* Trajectory bar */}
          <div style={{ minWidth:300 }}>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:C.sub, marginBottom:4, fontWeight:700 }}>
              <span>Annual Hedge Trajectory (−108d → 0d)</span>
              <span style={{ color:'#3b82f6', fontFamily:'monospace' }}>{qDef?.delay} / 0d</span>
            </div>
            <div style={{ background:C.inputBg, borderRadius:999, height:8, overflow:'hidden', border:`1px solid ${C.border}` }}>
              <div style={{ width:`${qDef?.prog||0}%`, height:'100%', background:'#3b82f6', borderRadius:999, transition:'width 0.6s ease' }}/>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:8, color:C.muted, marginTop:5 }}>
              <span>Start (-108)</span><span>Q1 (-93)</span><span>Q2 (-73)</span><span>Q3 (-43)</span>
              <span style={{ color:'#34d399', fontWeight:800 }}>Q4 (0d)</span>
            </div>
          </div>
        </div>

        {/* Quarter tabs */}
        <div style={{ display:'flex', gap:4, marginTop:16, flexWrap:'wrap', background:C.tableRow1, borderRadius:8, padding:4, border:`1px solid ${C.border}`, alignSelf:'flex-start', width:'fit-content' }}>
          {SETTLEMENT_QUARTERS.map(q => (
            <button key={q.key} onClick={()=>setActiveQ(q.key)} style={{
              padding:'7px 14px', borderRadius:6, border:'none', cursor:'pointer',
              background: activeQ===q.key ? C.panel : 'transparent',
              color: activeQ===q.key ? C.text : C.sub,
              borderBottom: activeQ===q.key ? '2px solid #3b82f6' : '2px solid transparent',
              fontFamily:'inherit', textAlign:'left', minWidth:130,
              boxShadow: activeQ===q.key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            }}>
              <div style={{ fontSize:13, fontWeight:900 }}>{q.label}</div>
              <div style={{ fontSize:8, fontWeight:700, color:'#3b82f6', letterSpacing:0.5, marginTop:2 }}>{q.mRange}</div>
              <div style={{ fontSize:8, fontWeight:400, opacity:0.7, marginTop:1, whiteSpace:'nowrap' }}>{q.period}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ── KPI STRIP ── */}
      <div style={{ display:'flex', background:C.panel, border:`1px solid ${C.border}`, borderRadius:10, marginBottom:16, overflow:'hidden', flexWrap:'wrap' }}>
        {[
          ['Quarter Hedge Recovery', qDef?.rec,              '#22c55e'],
          ['Remaining Delay Gap',    qDef?.delay,            '#ef4444'],
          ['Quarter Settled Vol',    fmtN(qVol)+' m³',       '#3b82f6'],
          ['Carry to Next Qtr ↗',   carryCount+' tasks',    '#f59e0b'],
          ['Overall Progress',       projPct+'%',            col     ],
        ].map(([l,v,c],i) => (
          <div key={i} style={{ flex:1, minWidth:120, padding:'10px 16px', borderRight:`1px solid ${C.border}` }}>
            <div style={{ fontSize:9, color:C.sub, textTransform:'uppercase', fontWeight:700, letterSpacing:0.5 }}>{l}</div>
            <div style={{ fontSize:16, fontWeight:900, color:c, marginTop:2, fontFamily:'monospace' }}>{v}</div>
          </div>
        ))}
      </div>

      {/* ── CATEGORY SUMMARY CARDS ── */}
      <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
        {Object.entries(SETT_CAT_LABELS).map(([key, label]) => {
          const { total, done } = catTotals[key] || { total:0, done:0 };
          const rem  = Math.max(0, total - done);
          const pct  = total > 0 ? ((done/total)*100).toFixed(1) : '0.0';
          const wc   = SETT_CAT_COLORS[key];
          return (
            <div key={key} style={{ background:C.panel, border:`1px solid ${wc}44`, borderLeft:`3px solid ${wc}`, borderRadius:8, padding:'10px 14px', flex:1, minWidth:180 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                <span style={{ fontSize:9, color:wc, fontWeight:800, textTransform:'uppercase', background:wc+'18', padding:'2px 8px', borderRadius:20, border:`1px solid ${wc}33` }}>{label}</span>
                <span style={{ fontSize:10, fontWeight:900, color:wc, fontFamily:'monospace' }}>{pct}%</span>
              </div>
              <div style={{ fontSize:13, fontWeight:900, color:C.text, fontFamily:'monospace' }}>{fmtN(done)}</div>
              <div style={{ fontSize:9, color:C.sub, marginBottom:6 }}>of {fmtN(total)} m³ · {fmtN(rem)} remaining</div>
              <div style={{ background:C.inputBg, borderRadius:4, height:4, overflow:'hidden' }}>
                <div style={{ width:`${Math.min(100,parseFloat(pct))}%`, height:'100%', background:wc, borderRadius:4, transition:'width 0.6s ease' }}/>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── FILTER + TOGGLES ── */}
      <div style={{ display:'flex', gap:6, marginBottom:14, flexWrap:'wrap', alignItems:'center' }}>
        <span style={{ fontSize:10, color:C.sub, fontWeight:700, textTransform:'uppercase' }}>Filter:</span>
        {[['all','All'], ...Object.entries(SETT_CAT_LABELS)].map(([k,l]) => {
          const wc = k === 'all' ? '#3b82f6' : SETT_CAT_COLORS[k];
          return (
            <button key={k} onClick={()=>setActiveCat(k)} style={{
              padding:'4px 14px', borderRadius:20, fontSize:10, fontWeight:700, cursor:'pointer', fontFamily:'inherit',
              border:`1px solid ${activeCat===k ? wc : C.border}`,
              background: activeCat===k ? wc+'22' : 'transparent',
              color: activeCat===k ? wc : C.sub,
            }}>{l}</button>
          );
        })}
        <div style={{ marginLeft:'auto', display:'flex', gap:10, alignItems:'center' }}>
          {[[hideFinished, setHideFinished,'Hide 100% done','#22c55e'],
            [hideUnstarted,setHideUnstarted,'Hide 0% started','#ef4444']
          ].map(([val,setter,label,c]) => (
            <label key={label} style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', fontSize:10, color:C.sub, fontWeight:700 }}>
              <div onClick={()=>setter(v=>!v)} style={{
                width:32, height:16, borderRadius:999, background:val?c+'44':C.muted,
                border:`1px solid ${val?c:C.muted}`, position:'relative', cursor:'pointer', transition:'all 0.2s'
              }}>
                <div style={{ position:'absolute', top:2, left:val?14:2, width:12, height:12, borderRadius:999, background:val?c:'#475569', transition:'left 0.2s' }}/>
              </div>
              {label}
            </label>
          ))}
          <span style={{ fontSize:10, color:C.muted, fontStyle:'italic' }}>{visibleTasks.length}/{settled.filter(t=>t.active||t.cumDone).length} tasks</span>
        </div>
      </div>

      {/* ── TASK TABLE ── */}
      <div style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:10, overflow:'hidden', marginBottom:16 }}>
        <div style={{ overflowX:'auto', maxHeight:460, overflowY:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
            <thead>
              <tr style={{ background:C.bg, position:'sticky', top:0, zIndex:5 }}>
                {['Level','Zone','Activity','Total Qty','Q Days','Q Alloc','Remaining','Alloc %','Cum %','Status'].map(h => (
                  <th key={h} style={{ padding:'8px 12px', color:C.sub, fontSize:9, textTransform:'uppercase', fontWeight:700,
                    textAlign: h==='Activity'?'left':'center', borderBottom:`1px solid ${C.border}`, whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleTasks.map((t,i) => {
                const wc  = SETT_CAT_COLORS[t.type] || '#94a3b8';
                const rowBg = i%2===0 ? C.tableRow0 : C.tableRow1;
                return (
                  <tr key={t.id||i} style={{ background: t.isDone?'#22c55e08':rowBg, borderBottom:`1px solid ${C.border}`,
                    borderLeft:`3px solid ${t.isDone?'#22c55e':t.active?'#3b82f6':C.border}` }}
                    onMouseEnter={e=>e.currentTarget.style.background=C.tableHover}
                    onMouseLeave={e=>e.currentTarget.style.background=t.isDone?'#22c55e08':rowBg}>
                    <td style={{ padding:'6px 12px', textAlign:'center', color:C.text, fontWeight:700, fontSize:10 }}>{t.level}</td>
                    <td style={{ padding:'6px 12px', textAlign:'center', color:C.sub, fontSize:10 }}>{t.zone.replace('Zone ','')}</td>
                    <td style={{ padding:'6px 12px', verticalAlign:'middle' }}>
                      <span style={{ background:wc+'22', color:wc, padding:'2px 8px', borderRadius:20, fontSize:9, fontWeight:700, marginRight:6, whiteSpace:'nowrap' }}>{SETT_CAT_LABELS[t.type]}</span>
                      <span style={{ color:C.text, fontSize:10 }}>{t.activity}</span>
                    </td>
                    <td style={{ padding:'6px 12px', textAlign:'right', color:C.text, fontFamily:'monospace', fontSize:10 }}>{fmtN(t.qty)}</td>
                    <td style={{ padding:'6px 12px', textAlign:'center', color:'#3b82f6', fontWeight:700, fontFamily:'monospace', fontSize:10 }}>{t.overlapDur}d</td>
                    <td style={{ padding:'6px 12px', textAlign:'right', color:'#22c55e', fontWeight:800, fontFamily:'monospace', fontSize:10 }}>{fmtN(t.qQty)}</td>
                    <td style={{ padding:'6px 12px', textAlign:'right', color:'#f59e0b', fontFamily:'monospace', fontSize:10 }}>{fmtN(t.qty - t.cumDone)}</td>
                    <td style={{ padding:'6px 12px', textAlign:'center', fontWeight:800, color:'#3b82f6', fontSize:10 }}>{t.allocPct}%</td>
                    <td style={{ padding:'6px 12px', textAlign:'center' }}>
                      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
                        <span style={{ color:t.cumPct>=100?'#22c55e':t.cumPct>0?'#f59e0b':'#ef4444', fontWeight:900, fontSize:10 }}>{t.cumPct}%</span>
                        <div style={{ width:48, height:3, background:C.inputBg, borderRadius:99 }}>
                          <div style={{ width:`${t.cumPct}%`, height:'100%', background:t.cumPct>=100?'#22c55e':'#3b82f6', borderRadius:99 }}/>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding:'6px 12px', textAlign:'center' }}>
                      {t.isDone
                        ? <span style={{ fontSize:8, background:'#22c55e22', color:'#16a34a', padding:'2px 6px', borderRadius:10, fontWeight:700, border:'1px solid #22c55e44' }}>✓ Done</span>
                        : t.active
                        ? <span style={{ fontSize:8, background:'#3b82f622', color:'#3b82f6', padding:'2px 6px', borderRadius:10, fontWeight:700, border:'1px solid #3b82f644' }}>⚡ Active</span>
                        : <span style={{ fontSize:8, background:'#f59e0b22', color:'#d97706', padding:'2px 6px', borderRadius:10, fontWeight:700, border:'1px solid #f59e0b44' }}>↗ Carry</span>}
                    </td>
                  </tr>
                );
              })}
              {visibleTasks.length === 0 && (
                <tr><td colSpan={10} style={{ padding:'32px', textAlign:'center', color:C.muted, fontStyle:'italic' }}>No tasks match this filter</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 16px', background:C.tableHead, borderRadius:8, border:`1px solid ${C.border}` }}>
        <div style={{ display:'flex', gap:32 }}>
          <div>
            <div style={{ fontSize:8, color:C.sub, textTransform:'uppercase', fontWeight:700 }}>Overall Progress</div>
            <div style={{ fontSize:18, fontWeight:900, color:'#3b82f6', fontFamily:'monospace' }}>{projPct}%</div>
          </div>
          <div>
            <div style={{ fontSize:8, color:'#f59e0b', textTransform:'uppercase', fontWeight:700 }}>Total Remaining</div>
            <div style={{ fontSize:18, fontWeight:900, color:'#f59e0b', fontFamily:'monospace' }}>{fmtN(projTotal - projDone)} m³</div>
          </div>
          <div>
            <div style={{ fontSize:8, color:C.sub, textTransform:'uppercase', fontWeight:700 }}>Tasks Loaded</div>
            <div style={{ fontSize:18, fontWeight:900, color:C.text, fontFamily:'monospace' }}>{settled.length}</div>
          </div>
        </div>
        <div style={{ fontSize:10, color:'#3b82f6', fontWeight:700, fontStyle:'italic', textTransform:'uppercase' }}>
          Settlement Core · Time-Ratio Model
        </div>
      </div>
    </div>
  );
}


// ─── S-CURVE ──────────────────────────────────────────────────────────────────
function SCurveView({ tasks, col, areaAllTaskZones, zoneDef, C }) {
  const [metric, setMetric] = useState('volume');
  const [activeType, setActiveType] = useState('all');

  const allowed = zoneDef ? new Set(zoneDef.taskZones) : areaAllTaskZones;
  const WK_TYPES = ['all','excavate','demolish','slab','column'];
  const WK_LABELS = { all:'Overall', excavate:'Excavation', demolish:'Demolition', slab:'Slab/Platform', column:'Core/Column' };
  const WK_COLORS = { all: col, excavate:'#fb923c', demolish:'#f87171', slab:'#34d399', column:'#818cf8' };

  // Build monthly data points from project start to last date
  const { points, maxVal } = useMemo(() => {
    const filtered = tasks.filter(t => allowed.has(t.zone) &&
      (activeType === 'all' || pcClassify(t.activity) === activeType));

    // Collect all dates to determine range
    const allDates = [];
    filtered.forEach(t => {
      if (t.blp_e) allDates.push(t.blp_e);
      if (t.cc_e)  allDates.push(t.cc_e);
      if (t.actual_e) allDates.push(t.actual_e);
    });
    if (allDates.length === 0) return { points: [], maxVal: 1 };

    const minDate = '2026-03-19';
    const maxDate = allDates.sort().reverse()[0];

    // Generate monthly ticks
    const ticks = [];
    let cur = new Date(minDate);
    const end = new Date(maxDate);
    while (cur <= end) {
      ticks.push(cur.toISOString().slice(0, 7)); // YYYY-MM
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    }

    const getValue = (t, plan) => {
      if (metric === 'volume')   return t.cc_qty || t.volume || 0;
      if (metric === 'tasks')    return 1;
      if (metric === 'duration') {
        if (plan === 'blp')  return t.blp_dur || 0;
        if (plan === 'cc')   return t.cc_dur  || 0;
        if (plan === 'site') return t.site_dur || 0;
      }
      return 0;
    };

    const getEndDate = (t, plan) => {
      if (plan === 'blp')  return t.blp_e;
      if (plan === 'cc')   return t.cc_e;
      if (plan === 'site') return t.actual_e || t.actual_s;
      return null;
    };

    // Cumulative per tick per plan
    const plans = ['blp','cc','site'];
    const cum = { blp:{}, cc:{}, site:{} };
    plans.forEach(plan => {
      let running = 0;
      ticks.forEach(tick => {
        const monthEnd = tick + '-31'; // tasks ending in or before this month
        running += filtered.reduce((s, t) => {
          const d = getEndDate(t, plan);
          if (!d) return s;
          if (d.slice(0,7) === tick) return s + getValue(t, plan);
          return s;
        }, 0);
        cum[plan][tick] = running;
      });
      // Make truly cumulative
      let total = 0;
      ticks.forEach(tick => {
        total += cum[plan][tick];
        cum[plan][tick] = total;
      });
    });

    const points = ticks.map(tick => ({
      tick,
      label: new Date(tick + '-15').toLocaleDateString('en-SG', { month: 'short', year: '2-digit' }),
      blp:  cum.blp[tick]  || 0,
      cc:   cum.cc[tick]   || 0,
      site: cum.site[tick] || 0,
    }));

    const maxVal = Math.max(...points.map(p => Math.max(p.blp, p.cc, p.site)), 1);
    return { points, maxVal };
  }, [tasks, allowed, activeType, metric]);

  const unitLabel = metric === 'volume' ? 'm³' : metric === 'tasks' ? 'tasks' : 'days';
  const fmtVal = v => v >= 1000 ? `${(v/1000).toFixed(1)}k` : Math.round(v).toString();

  const PLAN_COLORS = { blp: C.blp, cc: '#3b82f6', site: '#84cc16' };
  const PLAN_LABELS = { blp: 'BLP', cc: 'Catch Up', site: 'Site Actual' };

  const svgW = 900, svgH = 320, padL = 56, padR = 20, padT = 16, padB = 48;
  const chartW = svgW - padL - padR;
  const chartH = svgH - padT - padB;

  const xPos = (i) => padL + (i / Math.max(points.length - 1, 1)) * chartW;
  const yPos = (v) => padT + chartH - (v / maxVal) * chartH;

  const makePath = (key) => points.map((p, i) =>
    `${i === 0 ? 'M' : 'L'}${xPos(i).toFixed(1)},${yPos(p[key]).toFixed(1)}`
  ).join(' ');

  // X-axis ticks — show every 2nd month if many
  const xTicks = points.filter((_, i) => points.length <= 12 || i % 2 === 0);

  return (
    <div style={{ background:C.bg, minHeight:'100vh', padding:'20px 24px', fontFamily:"'Poppins',sans-serif" }}>
      {/* Header */}
      <div style={{ marginBottom:16, display:'flex', justifyContent:'space-between', alignItems:'flex-end', flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
            <span style={{ background:'#3b82f6', color:'#fff', fontSize:10, fontWeight:800, padding:'3px 10px', borderRadius:4, letterSpacing:1, textTransform:'uppercase' }}>S-Curve</span>
            <span style={{ color:C.sub, fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:1 }}>Cumulative Progress</span>
          </div>
          <div style={{ fontSize:18, fontWeight:900, color:C.text }}>{zoneDef?.label||'All Zones'} — BLP · CC · Site</div>
        </div>
        {/* Metric toggle */}
        <div style={{ display:'flex', gap:6 }}>
          {[['volume','Volume (m³)'],['tasks','Tasks'],['duration','Duration (d)']].map(([v,l]) => (
            <button key={v} onClick={()=>setMetric(v)} style={{
              padding:'5px 12px', borderRadius:20, border:`1.5px solid ${metric===v?'#3b82f6':C.border}`,
              background: metric===v?'#3b82f622':C.inputBg, color: metric===v?'#3b82f6':C.sub,
              cursor:'pointer', fontSize:11, fontWeight:700, fontFamily:'inherit'
            }}>{l}</button>
          ))}
        </div>
      </div>

      {/* Work type filter */}
      <div style={{ display:'flex', gap:6, marginBottom:16, flexWrap:'wrap' }}>
        {WK_TYPES.map(wt => {
          const wc = WK_COLORS[wt];
          return (
            <button key={wt} onClick={()=>setActiveType(wt)} style={{
              padding:'4px 14px', borderRadius:20,
              border:`1.5px solid ${activeType===wt ? wc : C.border}`,
              background: activeType===wt ? wc+'22' : C.inputBg,
              color: activeType===wt ? wc : C.sub,
              cursor:'pointer', fontSize:11, fontWeight:700, fontFamily:'inherit'
            }}>{WK_LABELS[wt]}</button>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display:'flex', gap:20, marginBottom:12 }}>
        {Object.entries(PLAN_LABELS).map(([k,l]) => (
          <div key={k} style={{ display:'flex', alignItems:'center', gap:6 }}>
            <div style={{ width:24, height:3, background:PLAN_COLORS[k], borderRadius:2 }}/>
            <span style={{ fontSize:11, color:C.sub }}>{l}</span>
          </div>
        ))}
        <span style={{ marginLeft:'auto', fontSize:10, color:C.muted }}>Cumulative {unitLabel}</span>
      </div>

      {/* SVG Chart */}
      {points.length === 0 ? (
        <div style={{ textAlign:'center', padding:60, color:C.sub }}>No data — upload Excel first</div>
      ) : (
        <div style={{ background:C.panel, borderRadius:12, border:`1px solid ${C.border}`, padding:'16px 8px 8px', overflowX:'auto' }}>
          <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width:'100%', minWidth:500, display:'block' }}>
            {/* Grid lines */}
            {[0,.25,.5,.75,1].map(frac => {
              const y = padT + chartH * (1-frac);
              return (
                <g key={frac}>
                  <line x1={padL} y1={y} x2={svgW-padR} y2={y} stroke={C.border} strokeDasharray="3 3" strokeWidth={0.5}/>
                  <text x={padL-6} y={y+4} textAnchor="end" fontSize={9} fill={C.sub}>{fmtVal(maxVal*frac)}</text>
                </g>
              );
            })}

            {/* Today line */}
            {(() => {
              const todayTick = new Date().toISOString().slice(0,7);
              const idx = points.findIndex(p => p.tick >= todayTick);
              if (idx < 0) return null;
              const x = xPos(idx);
              return <line x1={x} y1={padT} x2={x} y2={padT+chartH} stroke={C.amber} strokeWidth={1.5} strokeDasharray="4 2"/>;
            })()}

            {/* S-Curves */}
            {['blp','cc','site'].map(plan => (
              <g key={plan}>
                <path d={makePath(plan)} fill="none" stroke={PLAN_COLORS[plan]}
                  strokeWidth={plan==='site'?2:2.5} strokeDasharray={plan==='blp'?'5 3':undefined}
                  strokeLinecap="round" strokeLinejoin="round" opacity={0.9}/>
                {/* Dots at last point */}
                {points.length > 0 && (() => {
                  const last = points[points.length-1];
                  return <circle cx={xPos(points.length-1)} cy={yPos(last[plan])} r={3} fill={PLAN_COLORS[plan]}/>;
                })()}
              </g>
            ))}

            {/* X-axis labels */}
            {xTicks.map((p) => {
              const i = points.indexOf(p);
              return (
                <text key={p.tick} x={xPos(i)} y={padT+chartH+14} textAnchor="middle" fontSize={9} fill={C.sub}>{p.label}</text>
              );
            })}

            {/* Axis lines */}
            <line x1={padL} y1={padT} x2={padL} y2={padT+chartH} stroke={C.muted} strokeWidth={1}/>
            <line x1={padL} y1={padT+chartH} x2={svgW-padR} y2={padT+chartH} stroke={C.muted} strokeWidth={1}/>
          </svg>
        </div>
      )}

      {/* Summary table */}
      {points.length > 0 && (
        <div style={{ marginTop:16, display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:10 }}>
          {['blp','cc','site'].map(plan => {
            const last = points[points.length-1];
            const first = points[0];
            return (
              <div key={plan} style={{ background:C.panel, border:`1px solid ${C.border}`, borderLeft:`3px solid ${PLAN_COLORS[plan]}`, borderRadius:8, padding:'12px 16px' }}>
                <div style={{ fontSize:10, color:C.sub, fontWeight:700, textTransform:'uppercase', marginBottom:4 }}>{PLAN_LABELS[plan]}</div>
                <div style={{ fontSize:22, fontWeight:900, color:PLAN_COLORS[plan], fontFamily:'monospace' }}>{fmtVal(last[plan])}</div>
                <div style={{ fontSize:10, color:C.muted, marginTop:2 }}>cumulative {unitLabel}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function HedgingView({ tasks, activeArea, activeZoneKey, areaAllTaskZones, zoneDef, C, lightMode }) {
  const [activeQ,        setActiveQ]        = useState('q1');
  const [activeCat,      setActiveCat]      = useState('all');
  const [hideDone,       setHideDone]       = useState(false);
  const [hideUnstarted,  setHideUnstarted]  = useState(false);

  // Quarter date boundaries (end of each quarter)
  const Q_BOUNDS = { q1:'2026-05-31', q2:'2026-08-31', q3:'2026-11-30', q4:'2027-03-31' };
  const Q_PREV   = { q1:'2026-02-28', q2:'2026-05-31', q3:'2026-08-31', q4:'2026-11-30' };
  // Management target: lag to recover each quarter
  const MGT_LAG  = { q1:-90, q2:-60, q3:-30, q4:0 };
  const MGT_PROG = { q1:17,  q2:45,  q3:75,  q4:100 };

  const hedgingTasks = useMemo(() => {
    if (!tasks || tasks.length === 0) return [];
    return tasks
      .filter(t => {
        if (zoneDef) {
          const allowed = new Set(zoneDef.taskZones || []);
          if (!allowed.has(t.zone)) return false;
          if (zoneDef.levelFilter) {
            const lf = zoneDef.levelFilter.toLowerCase();
            const tl = (t.level || '').toLowerCase();
            if (lf === 'l5 transfer') {
              if (!tl.includes('transfer') && !tl.includes('l5 t')) return false;
            } else if (lf === 'l5') {
              if (!tl.startsWith('l5')) return false;
              if (tl.includes('transfer')) return false;
            } else {
              if (!tl.startsWith(lf) && !tl.includes('-'+lf) && !tl.endsWith(lf)) return false;
            }
          }
          return true;
        }
        return areaAllTaskZones ? areaAllTaskZones.has(t.zone) : true;
      })
      .map(t => ({
        l: t.level || '—', z: t.zone || '—', s: t.activity || '—',
        q: t.volume || t.cc_qty || t.blp_dur || 1,
        bl: t.blp_e || '—', cc: t.cc_e || '—',
        siteE: t.actual_e || t.cc_e || null,   // use site actual end if available
        blpDur: t.blp_dur || 0, ccDur: t.cc_dur || 0,
        quarter: assignQuarter(t.cc_e), type: classifyType(t.activity),
        group: zoneGroup(t.zone),
      })).filter(t => t.z && t.z !== '—');
  }, [tasks, zoneDef, areaAllTaskZones]);

  const hedgingTotals = useMemo(() => {
    const totals = { a:0, b:0, c:0, p:0 };
    hedgingTasks.forEach(t => { totals[t.group] = (totals[t.group]||0) + t.q; });
    return totals;
  }, [hedgingTasks]);

  // Bottom-up lag: sum of (cc_dur - blp_dur) across all tasks
  const totalDataLag = useMemo(() => {
    const lag = hedgingTasks.reduce((s, t) => s + Math.max(0, t.ccDur - t.blpDur), 0);
    return lag;
  }, [hedgingTasks]);

  // Per-quarter dynamic recovery targets (spread lag evenly, weighted by tasks completing that Q)
  const qStats = useMemo(() => {
    const quarters = ['q1','q2','q3','q4'];
    return quarters.reduce((acc, q, qIdx) => {
      const done = { a:0, b:0, c:0, p:0 };
      hedgingTasks.forEach(t => {
        if (quarters.indexOf(t.quarter) <= qIdx) done[t.group] = (done[t.group]||0) + t.q;
      });
      const totalDone  = Object.values(done).reduce((s,v)=>s+v,0);
      const grandTotal = Object.values(hedgingTotals).reduce((s,v)=>s+v,0);
      const totalRem   = grandTotal - totalDone;
      // carry = tasks whose siteE is after this quarter's end
      const carryCount = hedgingTasks.filter(t => t.siteE && t.siteE > Q_BOUNDS[q]).length;
      // Dynamic recovery: proportion of tasks done this Q × total data lag
      const prevDone = qIdx > 0
        ? hedgingTasks.filter(t => quarters.indexOf(t.quarter) <= qIdx-1).reduce((s,t)=>s+t.q,0)
        : 0;
      const qDone    = totalDone - prevDone;
      const recovered = grandTotal > 0 ? Math.round((qDone / grandTotal) * totalDataLag) : 0;
      // Management target lag for this quarter
      const mgtLag   = MGT_LAG[q];
      const mgtProg  = MGT_PROG[q];
      acc[q] = {
        mgtLag, mgtProg,
        kpi_p:   grandTotal > 0 ? (totalDone/grandTotal*100).toFixed(1)+'%' : '0%',
        kpi_v:   totalDone.toLocaleString(),
        kpi_r:   totalRem.toLocaleString(),
        kpi_carry: carryCount,
        recovered, done,
      };
      return acc;
    }, {});
  }, [hedgingTasks, hedgingTotals, totalDataLag]);

  // Lever computation: sum days saved per strategy type from CC vs BLP
  const levers = useMemo(() => {
    const gap      = hedgingTasks.filter(t=>['column','wall'].includes(t.type)).reduce((s,t)=>s+Math.max(0,t.blpDur-t.ccDur),0);
    const maritime = hedgingTasks.filter(t=>t.type==='demolish').reduce((s,t)=>s+Math.max(0,t.blpDur-t.ccDur),0);
    const mirror   = hedgingTasks.filter(t=>t.type==='excavate').reduce((s,t)=>s+Math.max(0,t.blpDur-t.ccDur),0);
    const transfer = hedgingTasks.filter(t=>t.type==='slab').reduce((s,t)=>s+Math.max(0,t.blpDur-t.ccDur),0);
    return { gap, maritime, mirror, transfer };
  }, [hedgingTasks]);

  const data = qStats[activeQ] || { mgtLag:0, mgtProg:0, kpi_p:'—', kpi_v:'—', kpi_r:'—', kpi_carry:0, recovered:0, done:{a:0,b:0,c:0,p:0} };

  // Filter with hide toggles using siteE
  const filteredTasks = hedgingTasks.filter(t => {
    if (activeCat !== 'all' && t.type !== activeCat) return false;
    const prevEnd  = Q_PREV[activeQ];
    const qEnd     = Q_BOUNDS[activeQ];
    const doneByQ  = t.siteE && t.siteE <= qEnd;
    const donePrev = t.siteE && t.siteE <= prevEnd;
    if (hideDone   && doneByQ)   return false;
    if (hideUnstarted && !doneByQ) return false;
    return true;
  });

  function LeverCard({ label, val, target, color }) {
    const pct  = Math.min(100, target > 0 ? (val/target)*100 : 0);
    const tag  = val === 0 ? ['Not Started',C.sub,C.muted+'66']
               : val < target ? ['In Progress','#d97706','#d97706cc']
               : ['Achieved','#22c55e','#22c55e33'];
    return (
      <div style={{ background:C.panel, border:`1px solid ${color}44`, borderLeft:`3px solid ${color}`, borderRadius:8, padding:'10px 14px', flex:1, minWidth:160 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
          <span style={{ fontSize:9, color:C.sub, fontWeight:700, textTransform:'uppercase' }}>{label}</span>
          <span style={{ fontSize:8, background:tag[2], color:tag[1], padding:'1px 6px', borderRadius:4, fontWeight:700, border:`1px solid ${tag[1]}55` }}>{tag[0]}</span>
        </div>
        <div style={{ fontSize:9, color:C.sub, marginBottom:6 }}>{label}</div>
        <div style={{ fontSize:16, fontWeight:900, color, fontFamily:'monospace' }}>+{val}d <span style={{ fontSize:10, color:C.muted }}>/ {target}d target</span></div>
        <div style={{ marginTop:6, background:C.inputBg, borderRadius:4, height:3, overflow:'hidden' }}>
          <div style={{ width:`${pct}%`, height:'100%', background:color, transition:'width 0.6s ease' }}/>
        </div>
      </div>
    );
  }

  function SummaryCard({ id, label, unit, color }) {
    const done  = data.done[id] || 0;
    const total = hedgingTotals[id] || 0;
    const pct   = total > 0 ? ((done / total) * 100).toFixed(1) : '0.0';
    const rem   = total - done;
    return (
      <div style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:12, padding:'16px 20px', flex:1, minWidth:180 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
          <span style={{ fontSize:10, color:C.sub, fontWeight:700, textTransform:'uppercase' }}>{label} ({unit})</span>
          <span style={{ fontSize:10, background:color+'22', color:color, padding:'2px 8px', borderRadius:20, fontWeight:700 }}>{pct}% confirmed</span>
        </div>
        <div style={{ fontSize:18, fontWeight:900, color:C.text, fontFamily:'monospace' }}>
          {done.toLocaleString()} <span style={{ fontSize:12, color:C.sub }}>/ {total.toLocaleString()}</span>
        </div>
        <div style={{ marginTop:8 }}>
          <div style={{ height:4, background:C.inputBg, borderRadius:4, overflow:'hidden' }}>
            <div style={{ width:`${pct}%`, height:'100%', background:color, borderRadius:4, transition:'width 0.6s ease' }}/>
          </div>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', marginTop:4, fontSize:10, color:C.sub }}>
          <span>Remaining: <span style={{ color:'#f59e0b' }}>{rem.toLocaleString()}</span></span>
          <span>{(100 - parseFloat(pct)).toFixed(1)}% left</span>
        </div>
      </div>
    );
  }

  if (!tasks || tasks.length === 0) {
    return (
      <div style={{ background:C.bg, minHeight:'40vh', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ textAlign:'center', color:C.sub }}>
          <div style={{ fontSize:32, marginBottom:8 }}>📂</div>
          <div style={{ fontSize:14, fontWeight:700 }}>Upload your Excel file to populate the Hedging Board</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background:C.bg, minHeight:'60vh', padding:'20px' }}>

      {/* ── HEADER + DUAL TRAJECTORY ── */}
      <div style={{ background:C.nav, borderRadius:12, border:`1px solid ${C.border}`, padding:'20px 24px', marginBottom:16 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12 }}>
          <div>
            <div style={{ fontSize:15, fontWeight:900, color:C.text, textTransform:'uppercase', letterSpacing:-0.3 }}>
              M22–M33 Schedule Hedging & Settlement Board
            </div>
            <div style={{ fontSize:10, color:C.sub, marginTop:3, fontStyle:'italic' }}>
              Lag Regression: -108d → 0d  ·  Period: 2026.03 – 2027.03
              &nbsp;·&nbsp; <span style={{ color:'#3b82f6', fontWeight:700, fontStyle:'normal' }}>
                {zoneDef ? zoneDef.label : (AREA_GROUPS.find(a=>a.key===activeArea)?.label || 'All Areas')}
              </span>
              &nbsp;·&nbsp; <span style={{ color:C.sub }}>Bottom-up lag: <span style={{ color:'#f87171', fontWeight:700 }}>{totalDataLag}d</span></span>
            </div>
          </div>
          {/* Dual trajectory bar */}
          <div style={{ minWidth:320 }}>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:C.sub, marginBottom:4, fontWeight:700 }}>
              <span>Mgmt Target Trajectory</span>
              <span style={{ color:'#3b82f6' }}>{data.mgtLag}d / 0d</span>
            </div>
            <div style={{ position:'relative', background:C.inputBg, borderRadius:999, height:8, overflow:'hidden', border:`1px solid ${C.border}`, marginBottom:4 }}>
              <div style={{ width:`${data.mgtProg}%`, height:'100%', background:'#3b82f6', borderRadius:999, transition:'width 0.6s ease' }}/>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:9, color:C.sub, marginBottom:8 }}>
              {['M22(-108d)','Q1(-90d)','Q2(-60d)','Q3(-30d)','M33(0d)'].map(l=><span key={l}>{l}</span>)}
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:C.sub, marginBottom:4, fontWeight:700 }}>
              <span>Data-Driven Recovery</span>
              <span style={{ color:'#22c55e' }}>+{data.recovered}d this quarter</span>
            </div>
            <div style={{ background:C.inputBg, borderRadius:999, height:5, overflow:'hidden', border:`1px solid ${C.border}` }}>
              <div style={{ width:`${Math.min(100, totalDataLag > 0 ? (data.recovered/totalDataLag)*100 : 0)}%`, height:'100%', background:'#22c55e', borderRadius:999, transition:'width 0.6s ease' }}/>
            </div>
          </div>
        </div>
        <div style={{ display:'flex', gap:4, marginTop:14, flexWrap:'wrap' }}>
          {[['q1','Q1 · Mar–May 26'],['q2','Q2 · Jun–Aug 26'],['q3','Q3 · Sep–Nov 26'],['q4','Q4 · Dec 26–M33']].map(([k,l])=>(
            <button key={k} onClick={()=>setActiveQ(k)} style={{
              padding:'5px 16px', borderRadius:6, border:`1px solid ${activeQ===k?'#3b82f6':C.border}`,
              background:activeQ===k?'#3b82f6':C.inputBg, color:activeQ===k?'#fff':C.sub,
              cursor:'pointer', fontSize:11, fontWeight:700, fontFamily:'inherit'
            }}>{l}</button>
          ))}
        </div>
      </div>

      {/* ── LEVER CARDS ── */}
      <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
        <LeverCard chinese="Handover Gap" label="Handover Gap Elimination"   val={levers.gap}      target={15} color="#3b82f6" />
        <LeverCard chinese="Maritime Port" label="Maritime Port Activation"    val={levers.maritime} target={15} color="#10b981" />
        <LeverCard chinese="Mirror Construction" label="Mirror Construction / Accel" val={levers.mirror}   target={30} color="#8b5cf6" />
        <LeverCard chinese="Transfer Slab" label="Transfer Slab Compression"  val={levers.transfer} target={48} color="#f59e0b" />
      </div>

      {/* ── KPI STRIP ── */}
      <div style={{ display:'flex', background:C.panel, border:`1px solid ${C.border}`, borderRadius:10, marginBottom:16, overflow:'hidden', flexWrap:'wrap' }}>
        {[
          ['Cumulative %',         data.kpi_p,                       '#3b82f6'],
          ['Confirmed Vol.',        data.kpi_v,                       '#22c55e'],
          ['Carry to Next Qtr ↗',  `${data.kpi_carry} tasks`,        '#f59e0b'],
          ['Qtr Recovery (data)',   `+${data.recovered}d`,            '#10b981'],
          ['Mgmt Target',          `${data.mgtLag}d`,                '#f87171'],
        ].map(([l,v,col],i)=>(
          <div key={i} style={{ flex:1, minWidth:120, padding:'10px 16px', borderRight:`1px solid ${C.border}` }}>
            <div style={{ fontSize:9, color:C.sub, textTransform:'uppercase', fontWeight:700, letterSpacing:0.5 }}>{l}</div>
            <div style={{ fontSize:16, fontWeight:900, color:col, marginTop:2, fontFamily:'monospace' }}>{v}</div>
          </div>
        ))}
      </div>

      {/* ── FILTER + HIDE TOGGLES ── */}
      <div style={{ display:'flex', gap:6, marginBottom:14, flexWrap:'wrap', alignItems:'center' }}>
        <span style={{ fontSize:10, color:C.sub, fontWeight:700, textTransform:'uppercase' }}>Filter:</span>
        {Object.entries(TYPE_LABELS).map(([k,l])=>(
          <button key={k} onClick={()=>setActiveCat(k)} style={{
            padding:'4px 14px', borderRadius:20, fontSize:10, fontWeight:700, cursor:'pointer', fontFamily:'inherit',
            border:`1px solid ${activeCat===k?(k==='all'?'#3b82f6':TYPE_COLORS[k]):C.border}`,
            background:activeCat===k?(k==='all'?'#3b82f6':TYPE_COLORS[k])+'22':'transparent',
            color:activeCat===k?(k==='all'?'#3b82f6':TYPE_COLORS[k]):'#64748b',
          }}>{l}</button>
        ))}
        <div style={{ marginLeft:'auto', display:'flex', gap:10, alignItems:'center' }}>
          {/* Hide toggles */}
          {[
            [hideDone,      setHideDone,      'Hide 100% done',    '#22c55e'],
            [hideUnstarted, setHideUnstarted, 'Hide 0% started',   '#ef4444'],
          ].map(([val, setter, label, col])=>(
            <label key={label} style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', fontSize:10, color:C.sub, fontWeight:700 }}>
              <div onClick={()=>setter(!val)} style={{
                width:32, height:16, borderRadius:999, background:val?col+'44':C.muted,
                border:`1px solid ${val?col:C.muted}`, position:'relative', cursor:'pointer', transition:'all 0.2s'
              }}>
                <div style={{ position:'absolute', top:2, left:val?14:2, width:12, height:12, borderRadius:999, background:val?col:'#475569', transition:'left 0.2s' }}/>
              </div>
              {label}
            </label>
          ))}
          <span style={{ fontSize:10, color:C.muted, fontStyle:'italic' }}>
            {filteredTasks.length}/{hedgingTasks.length} tasks
          </span>
        </div>
      </div>

      {/* ── TABLE ── */}
      <div style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:10, overflow:'hidden', marginBottom:16 }}>
        <div style={{ overflowX:'auto', maxHeight:400, overflowY:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
            <thead>
              <tr style={{ background:C.bg, position:'sticky', top:0, zIndex:5 }}>
                {['Level','Zone','Work Scope','Total Qty','BLP End','CC End','Site End','Qty Done','Remaining','Done %','Status'].map(h=>(
                  <th key={h} style={{ padding:'8px 12px', color:C.sub, fontSize:9, textTransform:'uppercase', fontWeight:700, textAlign:h==='Work Scope'?'left':'center', borderBottom:`1px solid ${C.border}`, whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map((t,i)=>{
                const qEnd     = Q_BOUNDS[activeQ];
                const prevEnd  = Q_PREV[activeQ];
                // Use siteE if available, else cc end date
                const effectiveEnd = t.siteE || t.cc;
                const isDone       = effectiveEnd && effectiveEnd <= qEnd;
                const isCarry      = effectiveEnd && effectiveEnd > qEnd;
                const wasDonePrev  = effectiveEnd && effectiveEnd <= prevEnd;
                const doneQty  = isDone ? t.q : 0;
                const remQty   = t.q - doneQty;
                const donePct  = isDone ? 100 : 0;
                const typeCol  = TYPE_COLORS[t.type] || '#94a3b8';
                const rowBg    = i % 2 === 0 ? C.tableRow0 : C.tableRow1;
                return (
                  <tr key={i} style={{ background:rowBg, borderBottom:`1px solid ${C.border}` }}
                    onMouseEnter={e=>e.currentTarget.style.background=C.tableHover}
                    onMouseLeave={e=>e.currentTarget.style.background=rowBg}>
                    <td style={{ padding:'6px 12px', textAlign:'center', color:C.text, fontWeight:700, fontSize:10 }}>{t.l}</td>
                    <td style={{ padding:'6px 12px', textAlign:'center', color:C.text, fontSize:10 }}>{t.z}</td>
                    <td style={{ padding:'6px 12px', verticalAlign:'middle' }}>
                      <span style={{ background:typeCol+'22', color:typeCol, padding:'2px 8px', borderRadius:20, fontSize:9, fontWeight:700, marginRight:6 }}>{TYPE_LABELS[t.type]}</span>
                      <span style={{ color:C.text, fontSize:10 }}>{t.s}</span>
                    </td>
                    <td style={{ padding:'6px 12px', textAlign:'right', color:C.text, fontWeight:800, fontFamily:'monospace', fontSize:10 }}>{t.q.toLocaleString()}</td>
                    <td style={{ padding:'6px 12px', textAlign:'center', color:C.sub, fontStyle:'italic', fontSize:10 }}>{t.bl}</td>
                    <td style={{ padding:'6px 12px', textAlign:'center', color:'#3b82f6', fontSize:10 }}>{t.cc}</td>
                    <td style={{ padding:'6px 12px', textAlign:'center', color: t.siteE ? '#22c55e' : C.muted, fontSize:10 }}>{t.siteE || '—'}</td>
                    <td style={{ padding:'6px 12px', textAlign:'right', color:'#22c55e', fontWeight:800, fontSize:10 }}>{doneQty.toLocaleString()}</td>
                    <td style={{ padding:'6px 12px', textAlign:'right', color:'#f59e0b', fontSize:10 }}>{remQty.toLocaleString()}</td>
                    <td style={{ padding:'6px 12px', textAlign:'center' }}>
                      <span style={{ color:donePct===100?'#22c55e':C.sub, fontWeight:700, fontSize:10 }}>{donePct}%</span>
                    </td>
                    <td style={{ padding:'6px 12px', textAlign:'center' }}>
                      {wasDonePrev && <span style={{ fontSize:8, background:'#22c55e22', color:'#16a34a', padding:'2px 6px', borderRadius:10, fontWeight:700, border:'1px solid #22c55e44' }}>✓ Prior</span>}
                      {isDone && !wasDonePrev && <span style={{ fontSize:8, background:'#22c55e22', color:'#16a34a', padding:'2px 6px', borderRadius:10, fontWeight:700, border:'1px solid #22c55e44' }}>✓ Done</span>}
                      {isCarry && <span style={{ fontSize:8, background:'#f59e0b22', color:'#d97706', padding:'2px 6px', borderRadius:10, fontWeight:700, border:'1px solid #f59e0b44' }}>↗ Carry</span>}
                    </td>
                  </tr>
                );
              })}
              {filteredTasks.length === 0 && (
                <tr><td colSpan={11} style={{ padding:'24px', textAlign:'center', color:C.muted, fontStyle:'italic' }}>No tasks match this filter</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── ZONE SUMMARY CARDS ── */}
      <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
        <SummaryCard id="a" label="Zone A – Excavation"  unit="m³" color="#3b82f6" />
        <SummaryCard id="b" label="Zone B – Demolition"  unit="m³" color="#f87171" />
        <SummaryCard id="c" label="Zone C – Marine Deck" unit="m²" color="#06b6d4" />
        <SummaryCard id="p" label="Zone P – Structure"   unit="m²" color="#a78bfa" />
      </div>
    </div>
  );
}
