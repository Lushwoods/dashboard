import { useState, useMemo, useRef, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";

const C = {
  blp:"#475569",actual:"#22c55e",warn:"#ef4444",amber:"#f59e0b",
  bg:"#0a0e1a",panel:"#0f172a",border:"#1e293b",muted:"#334155",sub:"#64748b",text:"#e2e8f0",
};

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
          { key:"P4_L1",  label:"L1",          color:"#fb923c", prodKey:"P", taskZones:["Zone P-4","Zone P4","Zone P.4"], levelFilter:"L1",          desc:"P4 Level 1" },
          { key:"P4_L2",  label:"L2",          color:"#f97316", prodKey:"P", taskZones:["Zone P-4","Zone P4","Zone P.4"], levelFilter:"L2",          desc:"P4 Level 2" },
          { key:"P4_L3",  label:"L3",          color:"#ea580c", prodKey:"P", taskZones:["Zone P-4","Zone P4","Zone P.4"], levelFilter:"L3",          desc:"P4 Level 3" },
          { key:"P4_L4",  label:"L4",          color:"#f59e0b", prodKey:"P", taskZones:["Zone P-4","Zone P4","Zone P.4"], levelFilter:"L4",          desc:"P4 Level 4" },
          { key:"P4_L5",  label:"L5",          color:"#fbbf24", prodKey:"P", taskZones:["Zone P-4","Zone P4","Zone P.4"], levelFilter:"L5",          desc:"P4 Level 5" },
          { key:"P4_L5T", label:"Transfer L5", color:"#fde047", prodKey:"P", taskZones:["Zone P-4","Zone P4","Zone P.4"], levelFilter:"L5 Transfer", desc:"P4 L5 Transfer Plate" },
          { key:"P4_ALL", label:"All Levels",  color:"#fb923c", prodKey:"P", taskZones:["Zone P-4","Zone P4","Zone P.4"], levelFilter:null,          desc:"P4 All Levels combined" },
        ]},
    ]
  },
];

const ALL_ZONE_DEFS = AREA_GROUPS.flatMap(a => a.subgroups.flatMap(sg => sg.zones));
function getZoneDef(key) { if(!key) return null; return ALL_ZONE_DEFS.find(z => z.key === key) || null; }

const ZONE_TO_PRODKEY = {
  "Zone A-1":"A1A3","Zone A-3":"A1A3","Zone A.1":"A1A3","Zone A.3":"A1A3",
  "Zone A-2.1":"A2","Zone A-2.2":"A2","Zone A2.1":"A2","Zone A2.2":"A2","Zone A.2.1":"A2","Zone A.2.2":"A2",
  "Zone B-2.1":"B","Zone B-2.2":"B","Zone B-3.1":"B","Zone B-3.2":"B","Zone B.2.1":"B","Zone B.3.1":"B",
  "Zone C-1":"C","Zone C-2":"C","Zone C-3":"C",
  "Zone C-1.1":"C","Zone C-1.2":"C","Zone C-2.1":"C","Zone C-2.2":"C","Zone C-3.1":"C","Zone C-3.2":"C",
  "Zone C.1":"C","Zone C.2":"C","Zone C.3":"C",
  "Zone P-1":"P","Zone P-2":"P","Zone P-3":"P","Zone P-4":"P",
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
const TODAY=new Date("2026-03-05").getTime(),TODAY_P=(TODAY-TL_START)/TL_MS*100;
function pct(d){if(!d)return null;return Math.max(0,Math.min(100,(new Date(d).getTime()-TL_START)/TL_MS*100));}
function barW(s,e){const p=pct(s),q=pct(e);return q&&p!==null?Math.max(0.25,q-p):0;}
function getMonthTicks(){
  const ticks=[],d=new Date(TL_START);d.setDate(1);
  while(d.getTime()<TL_END){
    ticks.push({p:(d.getTime()-TL_START)/TL_MS*100,label:d.toLocaleString("default",{month:"short"}),isJan:d.getMonth()===0,year:d.getFullYear()});
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
  const [activeZoneKey, setActiveZoneKey] = useState("P1");
  const [tab,           setTab]           = useState("gantt");
  const [tasks,         setTasks]         = useState([]);
  const [editing,       setEditing]       = useState(null);
  const [editVal,       setEditVal]       = useState({});
  const [filterLevel,   setFilterLevel]   = useState("all");
  const [activeMilestone,setActiveMilestone] = useState("26-Q1");
  const [uploadedFile,  setUploadedFile]  = useState(null);
  const [xlsxReady,     setXlsxReady]    = useState(!!window.XLSX);
  const fileInputRef = useRef(null);

  useEffect(() => {
    // Load Poppins font
    if (!document.getElementById("poppins-font")) {
      const link = document.createElement("link");
      link.id = "poppins-font";
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap";
      document.head.appendChild(link);
    }
    // Load XLSX
    if (window.XLSX) { setXlsxReady(true); return; }
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    script.onload = () => setXlsxReady(true);
    document.head.appendChild(script);
  }, []);

  // ── EXCEL PARSER ──────────────────────────────────────────────────────────
  // Column mapping (0-indexed):
  // A=0 Level, B=1 Zone, C=2 Activity, D=3 Milestone, E=4 BLP-S, F=5 BLP-E,
  // G=6 BLP Dur, H=7 BL Qty, I=8 BL Prod, J=9 CC-S, K=10 CC-E,
  // L=11 Site-S(actual), M=12 Site-E(actual), N=13 CC Dur, O=14 CC Qty, P=15 CC Prod,
  // R=17 ΔTime(node), S=18 ΔTime vs BLP
  function parseExcel(file) {
    if (!window.XLSX) { alert("XLSX library not loaded yet. Please wait a moment and try again."); return; }
    const reader = new FileReader();
    reader.onerror = () => alert("Failed to read file.");
    reader.onload = (e) => {
      try {
        const wb = window.XLSX.read(e.target.result, { type:"array", cellDates:true });

        // helper functions defined once
        function cellDate(ws2, ri, ci) {
          const addr = window.XLSX.utils.encode_cell({ r: ri, c: ci });
          const cell = ws2[addr];
          if (!cell) return null;
          // Try cell.w first — it's the formatted display string Excel shows (e.g. "13-Oct-25")
          // This is always correct regardless of timezone
          if (cell.w) {
            const parsed = fmtDate(cell.w);
            if (parsed) return parsed;
          }
          // XLSX date type (t==="d") — JS Date at midnight UTC, add 12hr to avoid tz shift
          if (cell.t === "d" && cell.v) {
            const d = new Date(new Date(cell.v).getTime() + 43200000);
            return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
          }
          // Excel date serial
          if (cell.t === "n" && cell.v > 40000 && cell.v < 60000) {
            const d = new Date(Math.round((cell.v - 25569) * 86400 * 1000) + 43200000);
            return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
          }
          // JS Date object
          if (cell.v instanceof Date) {
            const d = new Date(cell.v.getTime() + 43200000);
            return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
          }
          // String fallback
          return fmtDate(String(cell.v || "").trim());
        }
        function cellText(ws2, ri, ci) {
          const addr = window.XLSX.utils.encode_cell({ r: ri, c: ci });
          const cell = ws2[addr];
          if (!cell) return "";
          if (cell.t === "n" && cell.v > 40000 && cell.v < 60000) {
            const d = new Date(Math.round((cell.v - 25569) * 86400 * 1000) + 43200000);
            return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
          }
          return String(cell.w || cell.v || "").trim();
        }

        function fmtDate(v) {
          if (!v) return null;
          const s = String(v).trim();
          if (!s || s === "0" || s === "null" || s === "undefined") return null;
          // YYYY-MM-DD with optional time (e.g. "2025-07-21 00:00:00" or "2025-07-21T00:00:00")
          const m0 = s.match(/^(\d{4}-\d{2}-\d{2})/);
          if (m0) return m0[1];
          // DD-Mon-YY or DD-Mon-YYYY (e.g. "13-Oct-25", "07-Mar-26")
          const m1 = s.match(/^(\d{1,2})[-\/]([A-Za-z]{3})[-\/](\d{2,4})$/);
          if (m1) {
            const months={jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11};
            const mo = months[m1[2].toLowerCase()];
            const yr = m1[3].length===2 ? 2000+parseInt(m1[3]) : parseInt(m1[3]);
            return `${yr}-${String(mo+1).padStart(2,"0")}-${String(parseInt(m1[1])).padStart(2,"0")}`;
          }
          // MM/DD/YYYY
          const m2 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
          if (m2) return `${m2[3]}-${m2[1].padStart(2,"0")}-${m2[2].padStart(2,"0")}`;
          // Excel serial number (pure digits)
          const serial = parseInt(s);
          if (!isNaN(serial) && serial > 40000 && serial < 60000) {
            const d = new Date(Math.round((serial - 25569)*86400*1000) + 43200000);
            return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
          }
          return null;
        }

        function num(v) { const n=parseFloat(v); return isNaN(n)?null:n; }
        function str(v) { return String(v||"").trim(); }

        // Normalize header: strip CJK, punctuation, spaces → pure lowercase ASCII
        const normH = (s) => String(s||"").toLowerCase()
          .replace(/[\u0100-\uffff]/g,"").replace(/[^a-z0-9]/g,"");

        // Collect all sheets that look like schedule data
        const dataSheets = [];
        // Skip older revisions - if both QJr0 and QJr1 exist, skip QJr0
        const sheetNames = wb.SheetNames.filter(n => {
          if (n.includes('QJr0') && wb.SheetNames.some(x => x.includes('QJr1'))) return false;
          return true;
        });
        for (const name of sheetNames) {
          const sheet = wb.Sheets[name];
          const rows2 = window.XLSX.utils.sheet_to_json(sheet, { header:1, defval:"", raw:true });
          let zoneCol=-1, actCol=-1, levelCol=-1;
          // Scan first 8 rows, up to 15 columns
          for (let r = 0; r < Math.min(8, rows2.length); r++) {
            for (let col = 0; col < Math.min(15, (rows2[r]||[]).length); col++) {
              const v = normH(rows2[r][col]);
              if (v === "zone") zoneCol = col;
              if (v === "level") levelCol = col;
              // Activity col: check raw value for Chinese 工作内容 OR normalized for "activityname"
              const rawVal = String(rows2[r][col]||"").trim();
              if (rawVal === "工作内容" || rawVal.includes("工作内容") || v.includes("activityname") || v.includes("workingcont")) actCol = col;
            }
            if (zoneCol >= 0 && actCol >= 0) break;
          }
          if (zoneCol >= 0 && actCol >= 0) {
            // Scan all header rows for exact column positions
            let blpSCol=-1,blpECol=-1,blpDurCol=-1,blpQtyCol=-1,blpProdCol=-1;
            let ccSCol=-1,ccECol=-1,ccDurCol=-1,ccQtyCol=-1,ccProdCol=-1;
            let actSCol=-1,actECol=-1,devCol=-1,milestoneCol=-1;
            for (let r2 = 0; r2 < Math.min(8, rows2.length); r2++) {
              for (let col2 = 0; col2 < Math.min(30, (rows2[r2]||[]).length); col2++) {
                const v = normH(rows2[r2][col2]);
                if (!v) continue;
                // BLP dates — blps or blpstart or blpstartdate
                if (v === "blps" || v === "blpstart" || v === "blpstartdate" || v === "catchupstart" && col2 < zoneCol+5) blpSCol = col2;
                if ((v === "blpe" || v === "blpend" || v === "blpenddate") && String(rows2[r2][col2]||"").replace(/\s/g,"").length <= 6) blpECol = col2;
                // BLP duration
                if (v === "blpdur" || v === "blpworkingdays" || (v.startsWith("blp") && v.includes("dur")) || (v.startsWith("blp") && v.includes("day"))) blpDurCol = col2;
                // BL qty
                if ((v.startsWith("bl") || v.startsWith("base")) && (v.includes("qty") || v.includes("quant") || v.includes("area") || v.includes("m2") || v.includes("m3"))) blpQtyCol = col2;
                // BL productivity
                if ((v.startsWith("bl") || v === "blproductivity") && v.includes("prod")) blpProdCol = col2;
                // CC start
                if (v === "ccs" || v === "catchupstart" || v === "ccstart") ccSCol = col2;
                // CC end
                if (v === "cce" || v === "catchupend" || v === "ccend") ccECol = col2;
                // CC duration
                if (v === "ccdur" || v === "ccworkingdays" || (v.startsWith("cc") && (v.includes("dur") || v.includes("day")))) ccDurCol = col2;
                // CC qty
                if (v.startsWith("cc") && (v.includes("qty") || v.includes("quant") || v.includes("m3") || v.includes("m2"))) ccQtyCol = col2;
                // CC productivity
                if (v.startsWith("cc") && v.includes("prod")) ccProdCol = col2;
                // Actual site dates
                if (v.includes("datefromsite") && (v.endsWith("s") || v.includes("start"))) actSCol = col2;
                if (v.includes("datefromsite") && (v.endsWith("e") || v.includes("end"))) actECol = col2;
                // Milestone
                if (v === "milestone" || v === "jiedian" || v.includes("quarterly")) milestoneCol = col2;
                // Delta time vs BLP
                if (v.includes("deltatime") || v.includes("atime") || (v.includes("time") && v.includes("blp"))) devCol = col2;
              }
            }
            // Fallback: use positional offset from zoneCol
            const off = zoneCol - 1;
            if (blpSCol < 0) blpSCol = off+4;
            if (blpECol < 0) blpECol = off+5;
            if (blpDurCol < 0) blpDurCol = off+6;
            if (blpQtyCol < 0) blpQtyCol = off+7;
            if (blpProdCol < 0) blpProdCol = off+8;
            if (ccSCol < 0) ccSCol = off+9;
            if (ccECol < 0) ccECol = off+10;
            if (ccDurCol < 0) ccDurCol = off+11;
            if (ccQtyCol < 0) ccQtyCol = off+12;
            if (ccProdCol < 0) ccProdCol = off+13;
            if (actSCol < 0) actSCol = off+14;
            if (actECol < 0) actECol = off+15;
            if (devCol < 0) devCol = off+19;
            if (milestoneCol < 0) milestoneCol = off+3;
            const offset = zoneCol - 1;
            // fallback to offset-based if header scan missed
            if (blpSCol < 0) blpSCol = offset+4;
            if (blpECol < 0) blpECol = offset+5;
            if (blpDurCol < 0) blpDurCol = offset+6;
            if (blpQtyCol < 0) blpQtyCol = offset+7;
            if (blpProdCol < 0) blpProdCol = offset+8;
            if (ccSCol < 0) ccSCol = offset+10;
            if (ccECol < 0) ccECol = offset+11;
            if (ccDurCol < 0) ccDurCol = offset+12;
            if (ccQtyCol < 0) ccQtyCol = offset+13;
            if (ccProdCol < 0) ccProdCol = offset+14;
            if (actSCol < 0) actSCol = offset+15;
            if (actECol < 0) actECol = offset+16;
            if (devCol < 0) devCol = offset+19;
            dataSheets.push({ name, sheet, rows: rows2, zoneCol, actCol, levelCol: levelCol >= 0 ? levelCol : zoneCol-1,
              blpSCol, blpECol, blpDurCol, blpQtyCol, blpProdCol,
              ccSCol, ccECol, ccDurCol, ccQtyCol, ccProdCol,
              actSCol, actECol, devCol, milestoneCol });
            console.log(`Sheet "${name}": zone=${zoneCol} act=${actCol} blpS=${blpSCol} blpE=${blpECol} dur=${blpDurCol} ccS=${ccSCol} ccE=${ccECol} actS=${actSCol} actE=${actECol} dev=${devCol}`);
          }
        }

        if (dataSheets.length === 0) {
          alert(`No schedule sheets found. Scanned: ${wb.SheetNames.join(", ")}. Could not find 'Zone' + 'Activity' headers.`);
          return;
        }


        // Extract canonical zone + level from raw zone cell value
        // Handles: "Zone A-1", "P2-L4", "P4-L1", "Zone B-2.1", "L05 TRANSFER P", "P2-L05 Transfer plate"
        function parseZoneLevel(rawZone, rawLevel) {
          const s = String(rawZone||"").trim();
          const sl = s.toLowerCase().replace(/^zone\s+/i,"").trim();

          // Extract level from zone string if embedded (e.g. P2-L4, P4-L1, P2-L05)
          let extractedLevel = String(rawLevel||"").trim();
          // Transfer plate = L5 Transfer Plate
          if (sl.includes("transfer") || sl.includes("l05")) {
            extractedLevel = extractedLevel || "L5 Transfer Plate";
          } else {
            const lvlMatch = s.match(/[Ll]0?(\d+)/);
            if (lvlMatch && !extractedLevel) {
              extractedLevel = `L${parseInt(lvlMatch[1])}`;
            }
          }

          // Determine canonical zone
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
          else if (sl.match(/^c-?1/)) zone = "Zone C-1";
          else if (sl.match(/^c-?2/)) zone = "Zone C-2";
          else if (sl.match(/^c-?3/)) zone = "Zone C-3";
          else if (sl.match(/^p-?1/) || sl.match(/^p1/)) zone = "Zone P-1";
          else if (sl.match(/^p-?2/) || sl.match(/^p2/)) zone = "Zone P-2";
          else if (sl.match(/^p-?3/) || sl.match(/^p3/)) zone = "Zone P-3";
          else if (sl.match(/^p-?4/) || sl.match(/^p4/)) zone = "Zone P-4";
          else if (sl.match(/^t-?1/) || sl.match(/^t1/)) zone = "Zone T-1";
          else if (sl.match(/^t-?2/) || sl.match(/^t2/)) zone = "Zone T-2";
          else if (sl.match(/^t-?3/) || sl.match(/^t3/)) zone = "Zone T-3";
          else if (sl.match(/^t-?4/) || sl.match(/^t4/)) zone = "Zone T-4";

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
        let parsed = 0;

        for (const { name: sName, sheet: ws2, rows, zoneCol, actCol, levelCol,
              blpSCol, blpECol, blpDurCol, blpQtyCol, blpProdCol,
              ccSCol, ccECol, ccDurCol, ccQtyCol, ccProdCol,
              actSCol, actECol, devCol, milestoneCol } of dataSheets) {
          // Debug: log first data cell for blpS
          const dbgAddr = window.XLSX.utils.encode_cell({r:3, c:blpSCol});
          const dbgCell = ws2[dbgAddr];
          console.log(`Sheet "${sName}": blpSCol=${blpSCol}, cell=${dbgAddr}, t=${dbgCell?.t}, v=${dbgCell?.v}, w=${dbgCell?.w}`);
          for (let i = 0; i < rows.length; i++) {
            const zoneRaw  = cellText(ws2, i, zoneCol);
            const activity = cellText(ws2, i, actCol);
            if (!zoneRaw || !activity) continue;
            const zoneL = zoneRaw.toLowerCase();
            const actL  = activity.toLowerCase();
            if (["zone","b","level","zone "].includes(zoneL)) continue;
            if (actL.includes("activity") || activity === "工作内容" || actL.includes("baseline") || actL.includes("blp-start")) continue;
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
            const devRaw   = parseFloat(cellText(ws2, i, devCol));
            const dev      = !isNaN(devRaw) ? devRaw : (blp_dur&&cc_dur ? parseFloat(((cc_dur-blp_dur)/blp_dur*100).toFixed(1)) : 0);

            newTasks.push({
              id:`xl-${sName}-${i}`, zone:zoneNorm, level, activity,
              blp_s, blp_e, blp_dur, cc_s, cc_e, cc_dur, actual_s, actual_e,
              volume, cc_qty: ccQty
            });
            if (!prodByKey[prodKey]) prodByKey[prodKey] = [];
            prodByKey[prodKey].push({ task:activity, volume, blpDays:blp_dur, blpRate, ccDays:cc_dur, ccRate, idleWait:0, dev:isFinite(dev)?dev:0 });
            parsed++;
          }
        }

        if (parsed === 0) {
          alert("No data rows found. Check that your Excel has Zone names in column B and Activities in column C.");
          return;
        }


        setUploadedFile({ name: file.name, tasks: newTasks, prodData: prodByKey });
        setTasks(newTasks);
        // Auto-select first zone that has data
        const firstZoneWithData = newTasks[0]?.zone;
        if (firstZoneWithData) {
          const matchedDef = ALL_ZONE_DEFS.find(z => z.taskZones.includes(firstZoneWithData));
          if (matchedDef) {
            setActiveZoneKey(matchedDef.key);
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
    if(zoneDef?.prodKey) return activeProdData[zoneDef.prodKey]||[];
    // All zones view — collect all unique prodKeys for this area and merge
    const ag = AREA_GROUPS.find(a=>a.key===activeArea);
    if(!ag) return [];
    const keys = [...new Set(ag.subgroups.flatMap(sg=>sg.zones.map(z=>z.prodKey)))];
    return keys.flatMap(k=>activeProdData[k]||[]);
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
    // If no zone selected, show ALL tasks for the active area
    if(!zoneDef){
      return tasks.filter(t=>{
        if(!areaAllTaskZones.has(t.zone)) return false;
        if(filterLevel!=="all" && t.level && t.level!=="—" && !t.level.startsWith(filterLevel)) return false;
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
          if(!tl.startsWith("l5")) return false;
          if(tl.includes("transfer")) return false;
        } else {
          if(!tl.startsWith(lf)) return false;
        }
      }
      if(filterLevel!=="all" && t.level && t.level!=="—" && !t.level.startsWith(filterLevel)) return false;
      return true;
    });
  },[tasks,activeZoneKey,zoneDef,filterLevel,areaAllTaskZones]);

  function saveEdit(id){setTasks(p=>p.map(t=>t.id===id?{...t,actual_s:editVal.actual_s||null,actual_e:editVal.actual_e||null}:t));setEditing(null);}
  const ticks=getMonthTicks(),LW=230;

  return (
    <div style={{fontFamily:"'Poppins',sans-serif",background:C.bg,minHeight:"100vh",color:C.text,fontSize:13}}>

      {/* HEADER */}
      <div style={{background:"linear-gradient(135deg,#0f172a,#1e1b4b)",borderBottom:`1px solid ${C.border}`,padding:"12px 20px 0 20px"}}>

        {/* Row 1: Title + Milestone chips + KPIs */}
        <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap",marginBottom:10}}>
          <div>
            <div style={{fontSize:15,fontWeight:800,color:"#f8fafc",letterSpacing:-0.3,textTransform:"uppercase"}}>Construction Productivity & Schedule Board</div>

          </div>
          {/* Upload Excel button */}
          <div style={{display:"flex",alignItems:"center",gap:8,marginLeft:8}}>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" style={{display:"none"}}
              onChange={e=>{ if(e.target.files[0]) parseExcel(e.target.files[0]); e.target.value=""; }}/>
            <button onClick={()=>xlsxReady&&fileInputRef.current.click()} style={{
              padding:"6px 14px",borderRadius:7,border:`1.5px solid ${uploadedFile?"#22c55e":xlsxReady?C.muted:"#334155"}`,
              background:uploadedFile?"#22c55e22":"#1e293b",color:uploadedFile?"#22c55e":xlsxReady?C.sub:"#334155",
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
          <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:5,flexWrap:"wrap"}}>
            <span style={{color:C.sub,fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginRight:2}}>Milestone:</span>
            {MILESTONES.map(m=>(
              <button key={m} onClick={()=>setActiveMilestone(m)} style={{padding:"4px 9px",borderRadius:5,border:"none",cursor:"pointer",fontSize:11,fontFamily:"inherit",fontWeight:800,background:activeMilestone===m?"#ef4444":"#1e293b",color:activeMilestone===m?"#fff":C.sub}}>{m}</button>
            ))}
          </div>
          <div style={{display:"flex",gap:12,marginLeft:6}}>
            {[["Planned",plannedPct+"%",C.text],["Actual",actualPct+"%","#22c55e"]].map(([l,v,c])=>(
              <div key={l} style={{textAlign:"center"}}>
                <div style={{fontSize:9,color:C.sub,textTransform:"uppercase",letterSpacing:1}}>{l}</div>
                <div style={{fontSize:16,fontWeight:900,color:c}}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Row 2: AREA tabs */}
        <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",paddingBottom:8,borderBottom:`1px solid ${C.border}`}}>
          <span style={{color:C.sub,fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:0.8,marginRight:4}}>Area:</span>
          {AREA_GROUPS.map(ag=>(
            <button key={ag.key} onClick={()=>{setActiveArea(ag.key);setActiveZoneKey(null);setFilterLevel("all");}} style={{
              padding:"6px 16px",borderRadius:8,border:`1.5px solid ${activeArea===ag.key?ag.color:C.muted}`,
              background:activeArea===ag.key?ag.color+"33":"transparent",color:activeArea===ag.key?ag.color:C.sub,
              cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:800,display:"flex",alignItems:"center",gap:6}}>
              <span>{ag.icon}</span>{ag.label}
              <span style={{background:activeArea===ag.key?ag.color+"44":"#ffffff11",color:activeArea===ag.key?ag.color:C.muted,fontSize:9,fontWeight:800,padding:"1px 5px",borderRadius:99}}>
                {ag.subgroups.flatMap(sg=>sg.zones).length} zones
              </span>
            </button>
          ))}
          <div style={{flex:1}}/>
          <div style={{background:C.panel,border:`2px solid ${col}`,borderRadius:10,padding:"4px 14px",textAlign:"center"}}>
            <div style={{fontSize:9,color:C.sub,textTransform:"uppercase",letterSpacing:1}}>Mean Dev</div>
            <div style={{fontSize:17,fontWeight:900,color:col,fontStyle:"italic",lineHeight:1.1}}>{avgDev}%</div>
          </div>
        </div>

        {/* Row 3: Sub-group + zone chips */}
        <div style={{paddingTop:7,paddingBottom:7,borderBottom:`1px solid ${C.border}`}}>
          {area.subgroups.map(sg=>(
            <div key={sg.key} style={{display:"flex",alignItems:"center",gap:5,flexWrap:"wrap",marginBottom:4}}>
              <span style={{color:sg.color,fontSize:9,fontWeight:800,textTransform:"uppercase",letterSpacing:1,background:sg.color+"22",padding:"2px 8px",borderRadius:4,minWidth:100,textAlign:"center"}}>{sg.label}</span>
              {sg.zones.map(z=>(
                <button key={z.key} onClick={()=>setActiveZoneKey(z.key)} style={{
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

        {/* Row 4: Level filter + View tabs */}
        <div style={{display:"flex",alignItems:"center",gap:5,flexWrap:"wrap",paddingTop:7,paddingBottom:10}}>
          {!zoneDef?.levelFilter && <>
            <span style={{color:C.sub,fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:0.8,marginRight:2}}>Level:</span>
            {["all",...(AREA_LEVELS[activeArea]||[])].map(l=>(
              <button key={l} onClick={()=>setFilterLevel(l)} style={{
                padding:"3px 10px",borderRadius:20,border:`1px solid ${filterLevel===l?C.amber:C.muted}`,
                background:filterLevel===l?C.amber+"22":"transparent",color:filterLevel===l?C.amber:C.sub,
                cursor:"pointer",fontSize:10,fontFamily:"inherit",fontWeight:700}}>
                {l==="all"?"All":l}
              </button>
            ))}
          </>}
          <div style={{flex:1}}/>
          <div style={{display:"flex",gap:4}}>
            {[["gantt","📊 Gantt"],["analysis","📈 Productivity"],["input","📥 Input Dates"],["health","🏥 Schedule Health"],["hedging","⚖️ Hedging"]].map(([v,l])=>(
              <button key={v} onClick={()=>setTab(v)} style={{padding:"5px 13px",borderRadius:4,border:"none",cursor:"pointer",fontSize:11,fontFamily:"inherit",background:tab===v?col:"#1e293b",color:tab===v?"#fff":C.sub,fontWeight:700}}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      {/* STATS STRIP */}
      <div style={{display:"flex",background:C.panel,borderBottom:`1px solid ${C.border}`,flexWrap:"wrap"}}>
        {[["Area",area.label],["Zone",zoneDef?.label||"All Zones"],["Tasks",ganttTasks.length],["In Milestone",msTasks.length],["Avg Δ",`${avgDev}%`],["Sync",`${syncIdx.toFixed(0)}%`],["Actual",`${ganttTasks.filter(t=>t.actual_s).length}/${ganttTasks.length}`]].map(([l,v],i)=>(
          <div key={i} style={{flex:1,minWidth:90,padding:"7px 12px",borderRight:`1px solid ${C.border}`}}>
            <div style={{color:C.sub,fontSize:9,textTransform:"uppercase",letterSpacing:0.5}}>{l}</div>
            <div style={{color:col,fontSize:12,fontWeight:800,marginTop:1}}>{v}</div>
          </div>
        ))}
      </div>

      {/* LEGEND */}
      <div style={{display:"flex",gap:16,padding:"6px 20px",background:C.panel,borderBottom:`1px solid ${C.border}`,flexWrap:"wrap"}}>
        {[[C.blp,"BLP Baseline"],[col,"Catch Up Plan"],["#22c55e","Site Planned"]].map(([cl,lb])=>(
          <div key={lb} style={{display:"flex",alignItems:"center",gap:5}}>
            <div style={{width:16,height:4,background:cl,borderRadius:3}}/><span style={{color:C.sub,fontSize:10}}>{lb}</span>
          </div>
        ))}
        <div style={{marginLeft:"auto",display:"flex",gap:14,alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:2,height:11,background:C.amber}}/><span style={{color:C.sub,fontSize:10}}>Today 05 Mar 2026</span></div>
          <div style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:2,height:11,background:"#ef4444"}}/><span style={{color:C.sub,fontSize:10}}>Milestone: {activeMilestone}</span></div>
        </div>
      </div>

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
      {tasks.length > 0 && tab==="gantt"    && <GanttView    tasks={ganttTasks} col={col} ticks={ticks} LW={LW} msEndPct={msEndPct} activeMilestone={activeMilestone} MS_RANGES={MS_RANGES}/>}
      {tasks.length > 0 && tab==="analysis" && <AnalysisView rows={prodRows}    col={col} zoneDef={zoneDef} avgDev={avgDev} syncIdx={syncIdx} P1P3_STRUCT={P1P3_STRUCT}/>}
      {tasks.length > 0 && tab==="input"    && <InputView    tasks={ganttTasks} col={col} zoneDef={zoneDef} editing={editing} editVal={editVal} setEditVal={setEditVal}
                             startEdit={t=>{setEditing(t.id);setEditVal({actual_s:t.actual_s||"",actual_e:t.actual_e||""});}} saveEdit={saveEdit} cancel={()=>setEditing(null)}/>}
      {tab==="health"   && <HealthView   tasks={tasks} activeMilestone={activeMilestone} setActiveMilestone={setActiveMilestone} MS_RANGES={MS_RANGES} MILESTONES={MILESTONES}/>}
      {tab==="hedging"  && <HedgingView tasks={tasks} activeArea={activeArea} activeZoneKey={activeZoneKey} areaAllTaskZones={areaAllTaskZones} zoneDef={zoneDef} />}
    </div>
  );
}

// ─── GANTT ────────────────────────────────────────────────────────────────────
function GanttView({tasks,col,ticks,LW,msEndPct,activeMilestone,MS_RANGES}){
  const zones=[...new Set(tasks.map(t=>t.zone))];
  const [tooltip, setTooltip] = useState(null); // {task, x, y}
  return(
    <div style={{overflowX:"auto",position:"relative"}} onMouseLeave={()=>setTooltip(null)}>
      {/* Custom tooltip */}
      {tooltip && (
        <div style={{
          position:"fixed", left:tooltip.x+14, top:tooltip.y-10, zIndex:9999,
          background:"#1e293b", border:`1px solid #334155`, borderRadius:10,
          padding:"10px 14px", minWidth:260, maxWidth:340, pointerEvents:"none",
          boxShadow:"0 8px 32px #0008"
        }}>
          <div style={{fontWeight:700,color:"#f1f5f9",fontSize:12,marginBottom:6,lineHeight:1.4}}>{tooltip.task.activity}</div>
          <div style={{display:"grid",gridTemplateColumns:"90px 1fr",gap:"3px 8px",fontSize:11}}>
            <span style={{color:C.sub}}>Zone</span><span style={{color:"#94a3b8"}}>{tooltip.task.zone}</span>
            <span style={{color:C.sub}}>Level</span><span style={{color:"#94a3b8"}}>{tooltip.task.level||"—"}</span>
            <span style={{color:C.sub}}>BLP</span><span style={{color:"#64748b"}}>{tooltip.task.blp_s} → {tooltip.task.blp_e} ({tooltip.task.blp_dur}d)</span>
            <span style={{color:C.sub}}>Catch Up Plan</span><span style={{color:col}}>{tooltip.task.cc_s ? `${tooltip.task.cc_s} → ${tooltip.task.cc_e} (${tooltip.task.cc_dur}d)` : "—"}</span>
            <span style={{color:C.sub}}>Site Planned</span><span style={{color:"#22c55e"}}>{tooltip.task.actual_s ? `${tooltip.task.actual_s} → ${tooltip.task.actual_e||"ongoing"}${tooltip.task.actual_e ? ` (${Math.round((new Date(tooltip.task.actual_e)-new Date(tooltip.task.actual_s))/86400000)+1}d)` : ""}` : "—"}</span>
          </div>
        </div>
      )}

      <div style={{display:"flex",borderBottom:`1px solid ${C.border}`,position:"sticky",top:0,zIndex:10,background:C.bg}}>
        <div style={{width:LW,minWidth:LW,flexShrink:0,padding:"6px 14px",color:C.sub,fontSize:10,borderRight:`1px solid ${C.border}`}}>ACTIVITY</div>
        <div style={{flex:1,minWidth:700,position:"relative",height:26}}>
          {ticks.map((t,i)=>(
            <div key={i} style={{position:"absolute",left:`${t.p}%`,top:0,bottom:0,borderLeft:`1px solid ${C.border}`,paddingLeft:3,display:"flex",alignItems:"center"}}>
              <span style={{fontSize:9,color:t.isJan?C.sub:C.muted,fontWeight:t.isJan?700:400}}>{t.isJan?`${t.label} ${t.year}`:t.label}</span>
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
            <div style={{display:"flex",background:C.panel,borderBottom:`1px solid ${C.border}`}}>
              <div style={{width:LW,minWidth:LW,padding:"4px 14px",color:col,fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:0.5,borderRight:`1px solid ${C.border}`}}>{zone}</div>
              <div style={{flex:1,minWidth:700,position:"relative"}}>
                <div style={{position:"absolute",left:`${TODAY_P}%`,top:0,bottom:0,width:1,background:C.amber+"44"}}/>
                {msEndPct!==null&&<div style={{position:"absolute",left:`${msEndPct}%`,top:0,bottom:0,width:1,background:"#ef444466"}}/>}
              </div>
            </div>
            {zt.map(task=>{
              const siteDur = task.actual_s && task.actual_e ? Math.round((new Date(task.actual_e)-new Date(task.actual_s))/86400000)+1 : null;
              const dev = siteDur && task.cc_dur ? ((siteDur - task.cc_dur) / task.cc_dur * 100) : task.blp_dur ? ((task.cc_dur-task.blp_dur)/task.blp_dur*100) : null;
              const over=dev!==null&&dev>20&&!!task.cc_s;
              const [msS,msE]=(MS_RANGES[activeMilestone]||[null,null]);
              const inMs=msS&&task.cc_e>=msS&&task.cc_e<=msE;
              return(
                <div key={task.id} style={{display:"flex",borderBottom:`1px solid #111827`,height:28,alignItems:"center",background:inMs?"#ffffff06":"transparent"}}
                  onMouseEnter={e=>{e.currentTarget.style.background=C.panel;setTooltip({task,x:e.clientX,y:e.clientY});}}
                  onMouseMove={e=>setTooltip(tt=>tt?{...tt,x:e.clientX,y:e.clientY}:null)}
                  onMouseLeave={e=>{e.currentTarget.style.background=inMs?"#ffffff06":"transparent";}}>
                  <div style={{width:LW,minWidth:LW,padding:"0 14px",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"space-between",borderRight:`1px solid ${C.border}`,gap:4}}>
                    <span style={{fontSize:10,color:inMs?"#e2e8f0":"#94a3b8",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:168}} title={task.activity}>[{task.level}] {task.activity}</span>
                    <div style={{display:"flex",gap:3,alignItems:"center",flexShrink:0}}>
                      {inMs&&<span style={{fontSize:8,color:"#ef4444",fontWeight:800,background:"#ef444422",padding:"1px 4px",borderRadius:3}}>{activeMilestone}</span>}
                      {dev!==null&&<span style={{fontSize:9,color:dev>0?C.amber:"#22c55e",fontWeight:700}}>{dev>0?"+":""}{dev.toFixed(0)}%</span>}
                    </div>
                  </div>
                  <div style={{flex:1,position:"relative",height:"100%",minWidth:700}}>
                    {task.blp_s && task.blp_e && <div style={{position:"absolute",left:`${pct(task.blp_s)}%`,width:`${barW(task.blp_s,task.blp_e)}%`,top:4,height:7,background:C.blp,borderRadius:2,opacity:0.85}}/>}
                    {task.cc_s && task.cc_e && <div style={{position:"absolute",left:`${pct(task.cc_s)}%`,width:`${barW(task.cc_s,task.cc_e)}%`,top:15,height:7,background:col,borderRadius:2,opacity:inMs?1:0.55}}/>}
                    {task.actual_s&&<div style={{position:"absolute",left:`${pct(task.actual_s)}%`,width:`${Math.max(0.3,barW(task.actual_s,task.actual_e||task.actual_s))}%`,top:10,height:5,background:"#22c55e",borderRadius:2,opacity:0.9}}/>}
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
function AnalysisView({rows,col,zoneDef,avgDev,syncIdx,P1P3_STRUCT}){
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
            <thead><tr style={{background:C.bg,color:C.sub,fontSize:9,textTransform:"uppercase"}}>
              {["Zone","RC Cols","RC Walls","Core Walls","Steel Beams","Deep Deck","CIS Slab"].map(h=><th key={h} style={{padding:"6px 10px",textAlign:"center",borderBottom:`1px solid ${C.border}`}}>{h}</th>)}
            </tr></thead>
            <tbody>{P1P3_STRUCT.map((r,i)=>(
              <tr key={i} style={{background:i%2===0?"#0a0e1a":C.panel,borderBottom:`1px solid #111827`}}>
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
        <div style={{padding:"12px 16px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:4,height:18,background:col,borderRadius:2}}/>
          <span style={{fontWeight:800,fontSize:13,textTransform:"uppercase",letterSpacing:0.5}}>{zoneDef?.label||"All Zones"} — Productivity Matrix</span>
        </div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead><tr style={{background:C.bg,color:C.sub,fontSize:9,textTransform:"uppercase",letterSpacing:0.5}}>
              {["Task Description","Volume","BLP Days","BLP Rate","Catch Up Days","Catch Up Rate","Idle/Wait","Deviation"].map(h=>(
                <th key={h} style={{padding:"7px 12px",textAlign:h==="Task Description"?"left":"center",borderBottom:`1px solid ${C.border}`,whiteSpace:"nowrap"}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>{filtered.map((r,i)=>{
              const surplus=r.dev<0,over=r.dev>20;
              return(
                <tr key={i} style={{background:i%2===0?"#0a0e1a":C.panel,borderBottom:`1px solid #111827`}}
                  onMouseEnter={e=>e.currentTarget.style.background="#1e293b"}
                  onMouseLeave={e=>e.currentTarget.style.background=i%2===0?"#0a0e1a":C.panel}>
                  <td style={{padding:"6px 12px",color:"#cbd5e1",fontWeight:700}}>{r.task.replace(/^\[Z[\d.]+\]\s*/,"")}</td>
                  <td style={{padding:"6px 12px",textAlign:"right",color:col,fontWeight:800,fontFamily:"monospace"}}>{r.volume.toLocaleString()}</td>
                  <td style={{padding:"6px 12px",textAlign:"center",color:C.sub,fontFamily:"monospace",fontStyle:"italic"}}>{r.blpDays}d</td>
                  <td style={{padding:"6px 12px",textAlign:"center",color:C.sub,fontFamily:"monospace"}}>{r.blpRate?.toFixed?.(2)??r.blpRate}</td>
                  <td style={{padding:"6px 12px",textAlign:"center",background:col+"11",color:col,fontWeight:800}}>{r.ccDays}d</td>
                  <td style={{padding:"6px 12px",textAlign:"center",background:col+"11",color:col,fontFamily:"monospace",fontWeight:700}}>{r.ccRate?.toFixed?.(2)??r.ccRate??'—'}</td>
                  <td style={{padding:"6px 12px",textAlign:"center",color:C.amber,fontFamily:"monospace"}}>{r.idleWait??0}d</td>
                  <td style={{padding:"6px 12px",textAlign:"center"}}>
                    <span style={{padding:"2px 10px",borderRadius:20,fontSize:11,fontWeight:800,background:surplus?"#052e16":"#172554",color:surplus?"#22c55e":col,border:`1px solid ${surplus?"#22c55e33":col+"33"}`}}>
                      {surplus?"▲ Surplus":`${r.dev.toFixed(1)}%`}
                    </span>
                  </td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
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
              <Tooltip contentStyle={{background:"#1e293b",border:`1px solid ${C.border}`,fontSize:11,borderRadius:8,color:"#f1f5f9"}} labelStyle={{color:"#f1f5f9"}} itemStyle={{color:"#f1f5f9"}} formatter={(v,n)=>[v.toLocaleString()+" m³",n]}/>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div style={{background:"linear-gradient(135deg,#0f172a,#1e1b4b)",borderRadius:16,border:`1px solid ${C.border}`,padding:"24px 28px",display:"flex",alignItems:"center",gap:36,flexWrap:"wrap"}}>
        <div style={{flex:1,minWidth:260}}>
          <div style={{fontSize:18,fontWeight:900,color:col,textTransform:"uppercase",fontStyle:"italic",marginBottom:10}}>Final Analysis</div>
          <div style={{fontSize:12,lineHeight:1.8,color:"#e2e8f0bb",display:"flex",flexDirection:"column",gap:6}}>
            <p><span style={{color:col,fontWeight:800}}>ZONE:</span> {zoneDef?.label||"All Zones"} — {zoneDef?.desc||"Combined view of all zones in this area"}</p>
            <p><span style={{color:col,fontWeight:800}}>MEAN DEV:</span> <span style={{color:C.text,fontWeight:700}}>{avgDev}%</span> across {rows.length} tasks</p>
            <p><span style={{color:"#22c55e",fontWeight:800}}>SYNC INDEX:</span> <span style={{color:C.text,fontWeight:700}}>{syncIdx.toFixed(0)}%</span> target adherence</p>
          </div>
        </div>
        <div style={{width:190,height:190,background:"#ffffff08",border:`1px solid #ffffff11`,borderRadius:999,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          <div style={{color:col,fontSize:9,fontWeight:800,textTransform:"uppercase",letterSpacing:2,marginBottom:2}}>Sync Index</div>
          <div style={{position:"relative",width:130,height:130,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <svg width="130" height="130" style={{position:"absolute",top:0,left:0,transform:"rotate(-90deg)"}}>
              <circle cx="65" cy="65" r="55" fill="none" stroke="#ffffff15" strokeWidth="7"/>
              <circle cx="65" cy="65" r="55" fill="none" stroke={col} strokeWidth="7" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"/>
            </svg>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:26,fontWeight:900,lineHeight:1,color:C.text}}>{syncIdx.toFixed(0)}%</div>
              <div style={{fontSize:8,color:C.sub,textTransform:"uppercase",letterSpacing:2}}>Target</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── INPUT ────────────────────────────────────────────────────────────────────
function InputView({tasks,col,zoneDef,editing,editVal,setEditVal,startEdit,saveEdit,cancel}){
  return(
    <div style={{padding:"16px 20px"}}>
      <div style={{color:C.sub,marginBottom:12,fontSize:11}}>💡 Click any row to enter Site Planned Start / End dates — they appear as green bars on the Gantt. Actual Start & End can be added in a future update.</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 110px 110px 110px 110px 115px 115px",gap:6,padding:"6px 12px",background:C.panel,borderRadius:6,color:C.sub,fontSize:10,textTransform:"uppercase",letterSpacing:0.5,marginBottom:4}}>
        {["Activity","BLP Start","BLP End","Catch Up Start","Catch Up End","Site Planned Start","Site Planned End"].map(h=><div key={h}>{h}</div>)}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:3}}>
        {tasks.map(task=>{
          const isEdit=editing===task.id;
          const dev=task.blp_dur?((task.cc_dur-task.blp_dur)/task.blp_dur*100):null;
          const over=dev!==null&&dev>20;
          return(
            <div key={task.id} onClick={()=>!isEdit&&startEdit(task)}
              style={{display:"grid",gridTemplateColumns:"1fr 110px 110px 110px 110px 115px 115px",gap:6,padding:"6px 12px",background:isEdit?"#1e293b":"transparent",borderRadius:6,border:`1px solid ${isEdit?C.muted:"#111827"}`,alignItems:"center",cursor:isEdit?"default":"pointer"}}
              onMouseEnter={e=>{if(!isEdit)e.currentTarget.style.background=C.panel;}}
              onMouseLeave={e=>{if(!isEdit)e.currentTarget.style.background="transparent";}}>
              <div style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                <span style={{color:col,fontSize:10}}>{task.zone} · {task.level} </span>
                <span style={{color:"#94a3b8",fontSize:11}}>{task.activity}</span>
                
              </div>
              <div style={{color:C.sub,fontSize:10}}>{task.blp_s}</div>
              <div style={{color:C.sub,fontSize:10}}>{task.blp_e}</div>
              <div style={{color:col+"aa",fontSize:10}}>{task.cc_s}</div>
              <div style={{color:col+"aa",fontSize:10}}>{task.cc_e}</div>
              {isEdit?(
                <>
                  <input type="date" value={editVal.actual_s} onChange={e=>setEditVal(v=>({...v,actual_s:e.target.value}))} style={{background:C.panel,border:`1px solid ${col}`,color:"#22c55e",padding:"3px 6px",borderRadius:4,fontSize:11,fontFamily:"inherit",width:"100%"}}/>
                  <div style={{display:"flex",gap:4}}>
                    <input type="date" value={editVal.actual_e} onChange={e=>setEditVal(v=>({...v,actual_e:e.target.value}))} style={{background:C.panel,border:`1px solid #22c55e`,color:"#22c55e",padding:"3px 4px",borderRadius:4,fontSize:10,fontFamily:"inherit",flex:1}}/>
                    <button onClick={e=>{e.stopPropagation();saveEdit(task.id);}} style={{background:"#22c55e",color:"#000",border:"none",borderRadius:4,padding:"2px 8px",cursor:"pointer",fontWeight:800,flexShrink:0}}>✓</button>
                    <button onClick={e=>{e.stopPropagation();cancel();}} style={{background:C.muted,color:C.sub,border:"none",borderRadius:4,padding:"2px 6px",cursor:"pointer",flexShrink:0}}>✕</button>
                  </div>
                </>
              ):(
                <>
                  <div style={{color:"#22c55e",fontSize:10}}>{task.actual_s||<span style={{color:C.muted}}>— add planned</span>}</div>
                  <div style={{color:"#22c55e",fontSize:10}}>{task.actual_e||<span style={{color:C.muted}}>—</span>}</div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── SCHEDULE HEALTH ──────────────────────────────────────────────────────────
function HealthView({tasks,activeMilestone,setActiveMilestone,MS_RANGES,MILESTONES}){
  const [selMs,setSelMs]=useState(activeMilestone);
  function pick(m){setSelMs(m);setActiveMilestone(m);}
  function msData(ms){const[s,e]=MS_RANGES[ms];const due=tasks.filter(t=>t.cc_e>=s&&t.cc_e<=e);const done=due.filter(t=>t.actual_e&&t.actual_e<=e);return{due,rate:due.length?Math.round(done.length/due.length*100):100,end:e};}
  function diff(cc_e,end){return Math.round((new Date(end)-new Date(cc_e))/86400000);}
  const[selS,selE]=MS_RANGES[selMs];
  const detail=tasks.filter(t=>t.cc_e>=selS&&t.cc_e<=selE).sort((a,b)=>a.cc_e.localeCompare(b.cc_e));
  return(
    <div style={{background:"#f8fafc",minHeight:"100vh",padding:"28px 32px",fontFamily:"'Poppins',sans-serif"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24}}>
        <div>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
            <span style={{background:"#3b82f6",color:"#fff",fontSize:10,fontWeight:800,padding:"3px 10px",borderRadius:4,letterSpacing:1,textTransform:"uppercase"}}>CC Schedule Health</span>
            <span style={{color:"#94a3b8",fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:1}}>Quarterly Target Achievement</span>
          </div>
          <div style={{fontSize:22,fontWeight:900,color:C.panel}}>CC Schedule Milestone Achievement Board</div>
          <div style={{color:"#64748b",fontSize:12,marginTop:3}}>Evaluates alignment of current construction plan (CC) against quarterly milestone targets · All zones</div>
        </div>
        <div style={{border:"1.5px solid #e2e8f0",borderRadius:12,padding:"12px 18px",background:"#fff",textAlign:"right"}}>
          <div style={{color:"#94a3b8",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Project Deadline</div>
          <div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:16,color:"#3b82f6"}}>⏱</span><span style={{fontSize:20,fontWeight:900,color:C.panel}}>2027-03-19</span></div>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:12,marginBottom:24}}>
        {MILESTONES.map(ms=>{
          const{due,rate,end}=msData(ms);const isSel=ms===selMs;const ok=rate===100;
          return(
            <div key={ms} onClick={()=>pick(ms)} style={{background:"#fff",borderRadius:14,padding:"15px 16px",cursor:"pointer",border:isSel?"2px solid #3b82f6":"1.5px solid #e2e8f0",boxShadow:isSel?"0 0 0 3px #3b82f622":"0 1px 3px #0001"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <div style={{color:"#64748b",fontSize:11,fontWeight:700}}>{ms}</div>
                <div style={{color:"#94a3b8",fontSize:10}}>{due.length} tasks</div>
              </div>
              <div style={{display:"flex",alignItems:"baseline",gap:5,marginBottom:2}}>
                <span style={{fontSize:24,fontWeight:900,color:ok?"#10b981":"#ef4444",lineHeight:1}}>{rate}%</span>
                <span style={{fontSize:10,color:"#94a3b8",fontWeight:700}}>Achievement</span>
              </div>
              <div style={{height:4,background:"#f1f5f9",borderRadius:99,marginBottom:5,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${rate}%`,background:ok?"#10b981":"#ef4444",borderRadius:99}}/>
              </div>
              <div style={{fontSize:10,color:ok?"#10b981":"#ef4444",fontWeight:700}}>{ok?"All on schedule":`${due.length-Math.round(due.length*rate/100)} at risk`}</div>
              <div style={{fontSize:9,color:"#cbd5e1",marginTop:2}}>Deadline: {end}</div>
            </div>
          );
        })}
      </div>
      <div style={{background:"#fff",borderRadius:20,border:"1.5px solid #e2e8f0",overflow:"hidden",boxShadow:"0 2px 8px #0001"}}>
        <div style={{padding:"16px 28px",borderBottom:"1.5px solid #f1f5f9",display:"flex",alignItems:"center",gap:14}}>
          <div style={{width:40,height:40,borderRadius:12,background:"linear-gradient(135deg,#3b82f6,#6366f1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>🎯</div>
          <div>
            <div style={{fontSize:17,fontWeight:900,color:C.panel}}>{selMs} Milestone — Target Detail</div>
            <div style={{color:"#64748b",fontSize:11,marginTop:1}}>Deadline: {MS_RANGES[selMs][1]} · {detail.length} tasks in scope</div>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 155px 145px 155px",gap:12,padding:"8px 28px",background:"#f8fafc",borderBottom:"1px solid #f1f5f9"}}>
          {["Zone / Activity","CC Forecast (CC-E)","Days to Milestone","Status"].map(h=>(
            <div key={h} style={{color:"#94a3b8",fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:0.5}}>{h}</div>
          ))}
        </div>
        {detail.length===0?<div style={{padding:"40px 28px",textAlign:"center",color:"#94a3b8",fontSize:13}}>No tasks scheduled within this milestone window.</div>:(
          detail.map((t,i)=>{
            const end=MS_RANGES[selMs][1],d=diff(t.cc_e,end),late=d<0;
            return(
              <div key={t.id} style={{display:"grid",gridTemplateColumns:"1fr 155px 145px 155px",gap:12,padding:"13px 28px",borderBottom:i<detail.length-1?"1px solid #f1f5f9":"none",background:i%2===0?"#fff":"#fafafa"}}
                onMouseEnter={e=>e.currentTarget.style.background="#f0f9ff"}
                onMouseLeave={e=>e.currentTarget.style.background=i%2===0?"#fff":"#fafafa"}>
                <div>
                  <div style={{fontSize:10,fontWeight:800,color:"#3b82f6",textTransform:"uppercase",letterSpacing:0.5,marginBottom:3}}>{t.zone.replace("Zone ","")} · {t.level}</div>
                  <div style={{fontSize:13,fontWeight:800,color:C.panel}}>{t.activity}</div>
                </div>
                <div style={{display:"flex",flexDirection:"column",justifyContent:"center"}}>
                  <div style={{fontSize:14,fontWeight:800,color:C.panel}}>{t.cc_e}</div>
                  <div style={{fontSize:9,color:"#94a3b8",fontWeight:700,textTransform:"uppercase",marginTop:2}}>Current Forecast</div>
                </div>
                <div style={{display:"flex",flexDirection:"column",justifyContent:"center"}}>
                  <div style={{display:"inline-flex",alignItems:"center",background:late?"#fef2f2":d===0?"#fefce8":"#ecfdf5",border:`1px solid ${late?"#fca5a5":d===0?"#fde047":"#6ee7b7"}`,borderRadius:10,padding:"5px 11px",width:"fit-content"}}>
                    <span style={{fontSize:16,fontWeight:900,color:late?"#ef4444":d===0?"#ca8a04":"#10b981",lineHeight:1}}>{d>0?`-${d}`:d===0?"0":`+${Math.abs(d)}`}</span>
                    <span style={{fontSize:11,fontWeight:700,color:late?"#ef4444":"#10b981",marginLeft:3}}>days</span>
                  </div>
                  <div style={{fontSize:9,color:late?"#ef4444":"#10b981",fontWeight:700,marginTop:3}}>{late?"⚠ Exceeds milestone":d===0?"On milestone":"✓ Ahead"}</div>
                </div>
                <div style={{display:"flex",alignItems:"center"}}>
                  <div style={{display:"flex",alignItems:"center",gap:5,padding:"5px 12px",borderRadius:99,background:late?"#fef2f2":"#ecfdf5",border:`1px solid ${late?"#fca5a5":"#6ee7b7"}`}}>
                    <span style={{fontSize:12,color:late?"#ef4444":"#10b981"}}>{late?"⚠":"✓"}</span>
                    <span style={{fontSize:11,fontWeight:800,color:late?"#ef4444":"#10b981",whiteSpace:"nowrap"}}>{late?"Delayed":"On Time / Early"}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div style={{padding:"12px 28px",background:"#f8fafc",borderTop:"1.5px solid #f1f5f9",display:"flex",gap:22,flexWrap:"wrap"}}>
          {[["Total",detail.length,C.panel],["On Time / Early",detail.filter(t=>diff(t.cc_e,MS_RANGES[selMs][1])>=0).length,"#10b981"],["Delayed",detail.filter(t=>diff(t.cc_e,MS_RANGES[selMs][1])<0).length,"#ef4444"],["Achievement",msData(selMs).rate+"%","#3b82f6"]].map(([l,v,c])=>(
            <div key={l} style={{display:"flex",gap:7,alignItems:"center"}}>
              <span style={{color:"#94a3b8",fontSize:11,fontWeight:700}}>{l}:</span>
              <span style={{color:c,fontSize:14,fontWeight:900}}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── ZONE MAP VIEW ────────────────────────────────────────────────────────────
function ZoneMapView({ activeZoneKey, setActiveZoneKey, setActiveArea, setTab, tasks, MS_RANGES, activeMilestone }) {
  const [mapLevel, setMapLevel] = useState("BASEMENT");
  const [hovered, setHovered] = useState(null);

  // Zone task counts for badge
  const [msS, msE] = MS_RANGES[activeMilestone];
  function taskCount(taskZones) {
    return tasks.filter(t => taskZones.includes(t.zone) && t.cc_e >= msS && t.cc_e <= msE).length;
  }
  function actualCount(taskZones) {
    return tasks.filter(t => taskZones.includes(t.zone) && t.actual_s).length;
  }

  function handleClick(zoneKey, areaKey) {
    setActiveZoneKey(zoneKey);
    setActiveArea(areaKey);
    setTab("gantt");
  }

  // ── BASEMENT PLAN — traced from provided outline image (viewBox 0 0 800 620)
  // Site boundary: wide top (marine bay notch top-right), left wing (Marine Freeshow),
  // diagonal band (New Basement), jagged bottom-left (Existing Basement)
  //
  // Shared boundary lines (to ensure seamless joins):
  //   Marine Freeshow / Marine Deck divide: 175,175 → 265,145
  //   Marine Deck / New Basement diagonal:  130,295 → 265,145 → 530,195 → 660,260 → 680,330
  //   New Basement / Existing Basement:     130,295 → 280,330 → 480,380 → 600,380 → 680,330
  //   Outer site boundary traced clockwise from top-left

  const BASEMENT_ZONES = [
    // ── Marine Freeshow (green, left protruding wing)
    { key:"MFREE", label:"Marine Freeshow", areaKey:"BASEMENT", color:"#22c55e",
      taskZones:[], desc:"Marine Freeshow area",
      points:"60,180 100,130 140,115 175,120 175,175 265,145 255,200 200,230 150,250 100,255 65,230" },

    // ── Marine Deck (light blue, top-right large area with bay notch)
    { key:"C1",   label:"Zone C-1",   areaKey:"BASEMENT", color:"#06b6d4", taskZones:["Zone C-1"],
      points:"265,145 380,110 460,95 530,88 590,88 640,100 680,130 700,160 710,200 700,230 680,250 660,260 530,195" },
    { key:"C2",   label:"Zone C-2",   areaKey:"BASEMENT", color:"#0891b2", taskZones:["Zone C-2"],
      points:"660,260 680,250 700,230 710,200 700,160 680,130 720,140 755,160 770,205 760,255 730,285 690,300 660,300 640,280" },
    { key:"C3",   label:"Zone C-3",   areaKey:"BASEMENT", color:"#0e7490", taskZones:["Zone C-3"],
      points:"265,145 530,195 660,260 640,280 660,300 640,340 600,360 560,370 480,360 420,330 360,300 290,280 255,260 245,230 255,200" },

    // ── New Basement (pink/magenta, diagonal middle band)
    { key:"A1A3", label:"Zone A-1 & A-3", areaKey:"BASEMENT", color:"#6366f1", taskZones:["Zone A-1","Zone A-3"],
      points:"130,295 175,175 255,200 245,230 255,260 290,280 360,300 370,370 330,400 280,415 220,410 165,385 130,355" },
    { key:"A2",   label:"Zone A-2.1 & 2.2", areaKey:"BASEMENT", color:"#818cf8", taskZones:["Zone A-2.1","Zone A-2.2"],
      points:"360,300 420,330 480,360 560,370 600,360 640,340 660,300 680,330 660,390 600,410 520,420 440,415 370,400 370,370" },

    // ── Existing Basement (yellow, bottom irregular shape)
    { key:"B21",  label:"Zone B-2.1", areaKey:"BASEMENT", color:"#f59e0b", taskZones:["Zone B-2.1"],
      points:"130,295 130,355 165,385 220,410 280,415 290,460 260,490 210,500 165,480 130,450 110,410 110,360 120,320" },
    { key:"B31",  label:"Zone B-3.1", areaKey:"BASEMENT", color:"#d97706", taskZones:["Zone B-3.1"],
      points:"280,415 330,400 370,400 440,415 520,420 560,440 550,480 510,510 450,520 380,510 330,490 295,465" },
  ];

  // ── PODIUM PLAN SVG zones (viewBox 0 0 800 600, rotated site plan)
  const PODIUM_ZONES = [
    { key:"P1", label:"Zone P-1", areaKey:"PODIUM", color:"#a78bfa", taskZones:["Zone P-1"],
      points:"340,80 560,60 640,80 680,140 660,220 580,260 480,260 400,240 360,180 330,120" },
    { key:"P3", label:"Zone P-3", areaKey:"PODIUM", color:"#fb923c", taskZones:["Zone P-3"],
      points:"560,60 700,50 760,80 780,160 740,230 680,260 660,220 680,140 640,80" },
    { key:"P2", label:"Zone P-2", areaKey:"PODIUM", color:"#f97316", taskZones:["Zone P-2"],
      points:"200,220 340,180 360,180 400,240 480,260 500,340 460,400 380,420 300,400 230,360 190,300" },
    { key:"P4", label:"Zone P-4", areaKey:"PODIUM", color:"#fbbf24", taskZones:["Zone P-4"],
      points:"160,350 230,360 300,400 310,460 280,520 220,540 160,510 130,450 130,390" },
  ];

  // ── TOWER PLAN SVG zones (irregular H-shape hotel tower)
  const TOWER_ZONES = [
    { key:"T1", label:"Zone T-1", areaKey:"TOWER", color:"#ec4899", taskZones:["Zone T-1"],
      points:"380,160 460,140 520,160 540,220 520,300 480,340 440,340 400,300 370,240 360,190" },
    { key:"T2", label:"Zone T-2", areaKey:"TOWER", color:"#db2777", taskZones:["Zone T-2"],
      points:"180,260 280,240 340,260 380,300 370,380 330,430 270,450 210,430 170,380 160,320" },
    { key:"T3", label:"Zone T-3", areaKey:"TOWER", color:"#be185d", taskZones:["Zone T-3"],
      points:"540,160 640,140 700,160 720,220 700,300 650,340 590,340 550,300 530,240 520,180" },
    { key:"T4", label:"Zone T-4", areaKey:"TOWER", color:"#9d174d", taskZones:["Zone T-4"],
      points:"290,400 380,380 440,400 460,460 440,530 390,560 330,560 280,530 260,470 270,420" },
  ];

  const PLANS = {
    BASEMENT: { zones: BASEMENT_ZONES, label: "Basement → L1 Plan", subtitle: "Marine Freeshow · Marine Deck (C-1,C-2,C-3) · New Basement (A-1,A-2,A-3) · Existing Basement (B-2.1,B-3.1)", bg: "#0a1628" },
    PODIUM:   { zones: PODIUM_ZONES,   label: "Podium Plan",         subtitle: "Zone P-1, P-2, P-3, P-4",                         bg: "#1a0f00" },
    TOWER:    { zones: TOWER_ZONES,    label: "Hotel Tower Plan",    subtitle: "Zone T-1, T-2, T-3, T-4",                         bg: "#1a0018" },
  };

  const plan = PLANS[mapLevel];

  const AREA_MAP = { BASEMENT:"BASEMENT", PODIUM:"PODIUM", TOWER:"TOWER" };

  return (
    <div style={{ background: C.bg, minHeight:"100vh", padding:"20px" }}>

      {/* Plan switcher */}
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16, flexWrap:"wrap" }}>
        <span style={{ color:C.sub, fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:1 }}>Plan Level:</span>
        {[
          ["BASEMENT","⬇ Basement → L1","#3b82f6"],
          ["PODIUM","🏛 Podium","#f59e0b"],
          ["TOWER","🏢 Hotel Tower","#ec4899"],
        ].map(([key,label,col])=>(
          <button key={key} onClick={()=>setMapLevel(key)} style={{
            padding:"7px 18px", borderRadius:8, border:`1.5px solid ${mapLevel===key?col:C.muted}`,
            background:mapLevel===key?col+"33":"transparent", color:mapLevel===key?col:C.sub,
            cursor:"pointer", fontSize:12, fontFamily:"inherit", fontWeight:800
          }}>{label}</button>
        ))}
        <div style={{ marginLeft:"auto", color:C.sub, fontSize:11 }}>
          Click a zone to open its Gantt schedule
        </div>
      </div>

      {/* Plan title */}
      <div style={{ marginBottom:12 }}>
        <div style={{ fontSize:16, fontWeight:800, color:C.text }}>{plan.label}</div>
        <div style={{ fontSize:11, color:C.sub }}>{plan.subtitle} · Milestone: <span style={{ color:"#ef4444", fontWeight:700 }}>{activeMilestone}</span></div>
      </div>

      <div style={{ display:"flex", gap:20, flexWrap:"wrap", alignItems:"flex-start" }}>

        {/* SVG Map */}
        <div style={{ flex:"1 1 560px", background:plan.bg, borderRadius:16, border:`1px solid ${C.border}`, overflow:"hidden", position:"relative" }}>
          {/* Grid lines for atmosphere */}
          <svg width="100%" viewBox="0 0 800 560" style={{ display:"block" }}>
            {/* Background grid */}
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#ffffff08" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="800" height="580" fill={plan.bg}/>
            <rect width="800" height="580" fill="url(#grid)"/>

            {/* Compass rose */}
            <g transform="translate(740,50)">
              <circle cx="0" cy="0" r="18" fill="#ffffff11" stroke="#ffffff22" strokeWidth="1"/>
              <text x="0" y="-6" textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="800">N</text>
              <polygon points="0,-14 3,-4 0,-7 -3,-4" fill="#ef4444"/>
              <polygon points="0,14 3,4 0,7 -3,4" fill="#475569"/>
            </g>

            {/* Zone polygons */}
            {plan.zones.map(z => {
              const isActive = activeZoneKey === z.key;
              const isHover  = hovered === z.key;
              const tc = taskCount(z.taskZones);
              const ac = actualCount(z.taskZones);
              const pct = tc > 0 ? Math.round(ac/tc*100) : 0;

              // Label centroid
              const pts = z.points.split(" ").map(p => p.split(",").map(Number));
              const cx = pts.reduce((s,p)=>s+p[0],0)/pts.length;
              const cy = pts.reduce((s,p)=>s+p[1],0)/pts.length;

              return (
                <g key={z.key}
                  style={{ cursor:"pointer" }}
                  onClick={()=>handleClick(z.key, AREA_MAP[mapLevel])}
                  onMouseEnter={()=>setHovered(z.key)}
                  onMouseLeave={()=>setHovered(null)}>
                  <polygon
                    points={z.points}
                    fill={z.color}
                    fillOpacity={isActive ? 0.75 : isHover ? 0.55 : 0.35}
                    stroke={isActive ? "#fff" : isHover ? z.color : z.color}
                    strokeWidth={isActive ? 2.5 : isHover ? 2 : 1}
                    strokeOpacity={isActive ? 1 : 0.7}
                  />
                  {/* Glow on active */}
                  {isActive && (
                    <polygon points={z.points} fill="none" stroke="#fff" strokeWidth="4" strokeOpacity="0.15"/>
                  )}
                  {/* Zone label */}
                  <text x={cx} y={cy-8} textAnchor="middle" fill="#fff" fontSize="11" fontWeight="800"
                    style={{pointerEvents:"none", textShadow:"0 1px 3px #000"}}>
                    {z.label.replace("Zone ","")}
                  </text>
                  {/* Task count badge */}
                  {tc > 0 && (
                    <g transform={`translate(${cx},${cy+10})`} style={{pointerEvents:"none"}}>
                      <rect x="-18" y="-8" width="36" height="14" rx="7" fill={z.color} fillOpacity="0.9"/>
                      <text x="0" y="3" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="700">
                        {ac}/{tc} ✓
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* Today marker label */}
            <g transform="translate(10,565)">
              <rect x="0" y="-10" width="140" height="14" rx="4" fill="#f59e0b22"/>
              <text x="5" y="2" fill="#f59e0b" fontSize="9" fontWeight="700">● Data Date: 05 Mar 2026</text>
            </g>
          </svg>
        </div>

        {/* Zone legend + stats panel */}
        <div style={{ flex:"0 0 220px", display:"flex", flexDirection:"column", gap:8 }}>
          <div style={{ color:C.sub, fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:1, marginBottom:4 }}>Zones</div>
          {plan.zones.map(z => {
            const isActive = activeZoneKey === z.key;
            const tc = taskCount(z.taskZones);
            const ac = actualCount(z.taskZones);
            return (
              <div key={z.key}
                onClick={()=>handleClick(z.key, AREA_MAP[mapLevel])}
                style={{
                  display:"flex", alignItems:"center", gap:10, padding:"10px 12px",
                  borderRadius:10, cursor:"pointer",
                  background: isActive ? z.color+"33" : C.panel,
                  border:`1.5px solid ${isActive ? z.color : C.border}`,
                  transition:"all 0.15s"
                }}
                onMouseEnter={e=>e.currentTarget.style.background=z.color+"22"}
                onMouseLeave={e=>e.currentTarget.style.background=isActive?z.color+"33":C.panel}>
                <div style={{ width:12, height:36, borderRadius:3, background:z.color, flexShrink:0 }}/>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:11, fontWeight:800, color: isActive ? z.color : C.text }}>{z.label}</div>
                  <div style={{ fontSize:9, color:C.sub, marginTop:2 }}>
                    {tc > 0 ? `${ac}/${tc} tasks logged` : "No tasks in milestone"}
                  </div>
                  {tc > 0 && (
                    <div style={{ height:3, background:C.muted, borderRadius:99, marginTop:4, overflow:"hidden" }}>
                      <div style={{ height:"100%", width:`${Math.round(ac/tc*100)}%`, background:z.color, borderRadius:99 }}/>
                    </div>
                  )}
                </div>
                {isActive && <span style={{ fontSize:10, color:z.color, fontWeight:800 }}>▶</span>}
              </div>
            );
          })}

          {/* Instruction card */}
          <div style={{ marginTop:8, padding:"12px", background:C.panel, borderRadius:10, border:`1px solid ${C.border}` }}>
            <div style={{ fontSize:10, color:C.sub, lineHeight:1.6 }}>
              <div style={{ color:C.text, fontWeight:700, marginBottom:4 }}>How to use</div>
              <div>• Click any zone to open its Gantt</div>
              <div>• Badges show <span style={{color:"#22c55e"}}>actual / planned</span> tasks in current milestone</div>
              <div>• Switch plans using the tabs above</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── HEDGING VIEW ─────────────────────────────────────────────────────────────

const QUARTER_ORDER = ['q1','q2','q3','q4'];
const TYPE_LABELS = { all:'All', demolish:'Demolition', excavate:'Excavation', slab:'Slab / Platform', column:'Core / Column' };
const TYPE_COLORS = { demolish:'#f87171', excavate:'#fb923c', slab:'#34d399', column:'#818cf8' };

// Auto-classify activity name → type
function classifyType(activity) {
  const a = (activity||'').toLowerCase();
  if (a.includes('demol') || a.includes('remove') || a.includes('strip'))       return 'demolish';
  if (a.includes('excav') || a.includes('earthwork') || a.includes('berm'))     return 'excavate';
  if (a.includes('slab') || a.includes('deck') || a.includes('platform') ||
      a.includes('transfer') || a.includes('cast') || a.includes('double-t'))   return 'slab';
  if (a.includes('column') || a.includes('wall') || a.includes('core') ||
      a.includes('pile') || a.includes('shaft') || a.includes('pilecap') ||
      a.includes('substructure') || a.includes('steel beam'))                   return 'column';
  return 'slab'; // fallback
}

// Assign quarter from CC end date
function assignQuarter(cc_e) {
  if (!cc_e) return 'q4';
  const d = new Date(cc_e);
  if (d <= new Date('2026-06-30')) return 'q1';
  if (d <= new Date('2026-09-30')) return 'q2';
  if (d <= new Date('2026-12-31')) return 'q3';
  return 'q4';
}

// Classify zone into a/b/c/p bucket
function zoneGroup(zone) {
  const z = (zone||'').toLowerCase();
  if (z.includes('b-2') || z.includes('b-3') || z.includes('b.2') || z.includes('b.3')) return 'b';
  if (z.includes('c-') || z.includes('c.'))  return 'c';
  if (z.includes('p-') || z.includes('p.') || z.includes('p1') || z.includes('p2') || z.includes('p3') || z.includes('p4')) return 'p';
  return 'a'; // Zone A and anything else
}

function HedgingView({ tasks, activeArea, activeZoneKey, areaAllTaskZones, zoneDef }) {
  const [activeQ,   setActiveQ]   = useState('q1');
  const [activeCat, setActiveCat] = useState('all');

  // Derive hedging tasks from Excel-parsed tasks, filtered by active area/zone
  const hedgingTasks = useMemo(() => {
    if (!tasks || tasks.length === 0) return [];
    return tasks
      .filter(t => {
        if (zoneDef) {
          const allowed = new Set(zoneDef.taskZones || []);
          if (!allowed.has(t.zone)) return false;
          // Apply levelFilter for podium sub-zones (L1, L2 ... L5 Transfer)
          if (zoneDef.levelFilter) {
            const lf = zoneDef.levelFilter.toLowerCase();
            const tl = (t.level || '').toLowerCase();
            if (lf === 'l5 transfer') {
              if (!tl.includes('transfer') && !tl.includes('l5 t')) return false;
            } else if (lf === 'l5') {
              if (!tl.startsWith('l5')) return false;
              if (tl.includes('transfer')) return false;
            } else {
              if (!tl.startsWith(lf)) return false;
            }
          }
          return true;
        }
        return areaAllTaskZones ? areaAllTaskZones.has(t.zone) : true;
      })
      .map(t => ({
      l:       t.level || '—',
      z:       t.zone  || '—',
      s:       t.activity || '—',
      q:       t.volume || t.cc_qty || t.blp_dur || 1,
      bl:      t.blp_e || '—',
      cc:      t.cc_e  || '—',
      quarter: assignQuarter(t.cc_e),
      type:    classifyType(t.activity),
      group:   zoneGroup(t.zone),
    })).filter(t => t.z && t.z !== '—');
  }, [tasks, zoneDef, areaAllTaskZones]);

  // Compute totals per zone group from all tasks
  const hedgingTotals = useMemo(() => {
    const totals = { a:0, b:0, c:0, p:0 };
    hedgingTasks.forEach(t => { totals[t.group] = (totals[t.group]||0) + t.q; });
    return totals;
  }, [hedgingTasks]);

  // Compute cumulative done per quarter per zone group
  const qStats = useMemo(() => {
    const quarters = ['q1','q2','q3','q4'];
    const lagMap   = { q1:'-81d', q2:'-54d', q3:'-27d', q4:'0d' };
    const progMap  = { q1:25, q2:50, q3:75, q4:100 };
    return quarters.reduce((acc, q) => {
      const qIdx = quarters.indexOf(q);
      const done = { a:0, b:0, c:0, p:0 };
      hedgingTasks.forEach(t => {
        if (quarters.indexOf(t.quarter) <= qIdx) done[t.group] = (done[t.group]||0) + t.q;
      });
      const totalDone = Object.values(done).reduce((s,v)=>s+v,0);
      const grandTotal = Object.values(hedgingTotals).reduce((s,v)=>s+v,0);
      const totalRem   = grandTotal - totalDone;
      acc[q] = {
        lag:     lagMap[q],
        progress: progMap[q],
        status:  lagMap[q].replace('d',' DAYS').replace('-','–'),
        kpi_p:   grandTotal > 0 ? (totalDone/grandTotal*100).toFixed(1)+'%' : '0%',
        kpi_v:   totalDone.toLocaleString(),
        kpi_r:   totalRem.toLocaleString(),
        done,
      };
      return acc;
    }, {});
  }, [hedgingTasks, hedgingTotals]);

  const data = qStats[activeQ] || { lag:'—', progress:0, status:'—', kpi_p:'—', kpi_v:'—', kpi_r:'—', done:{a:0,b:0,c:0,p:0} };

  const filteredTasks = hedgingTasks.filter(t =>
    activeCat === 'all' || t.type === activeCat
  );

  function SummaryCard({ id, label, unit, color }) {
    const done  = data.done[id] || 0;
    const total = hedgingTotals[id] || 0;
    const pct   = total > 0 ? ((done / total) * 100).toFixed(1) : '0.0';
    const rem   = total - done;
    return (
      <div style={{ background:'#0f172a', border:`1px solid #1e293b`, borderRadius:12, padding:'16px 20px', flex:1, minWidth:180 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
          <span style={{ fontSize:10, color:'#64748b', fontWeight:700, textTransform:'uppercase' }}>{label} ({unit})</span>
          <span style={{ fontSize:10, background:color+'22', color:color, padding:'2px 8px', borderRadius:20, fontWeight:700 }}>{pct}% confirmed</span>
        </div>
        <div style={{ fontSize:18, fontWeight:900, color:'#f1f5f9', fontFamily:'monospace' }}>
          {done.toLocaleString()} <span style={{ fontSize:12, color:'#475569' }}>/ {total.toLocaleString()}</span>
        </div>
        <div style={{ marginTop:8 }}>
          <div style={{ height:4, background:'#1e293b', borderRadius:4, overflow:'hidden' }}>
            <div style={{ width:`${pct}%`, height:'100%', background:color, borderRadius:4, transition:'width 0.6s ease' }}/>
          </div>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', marginTop:4, fontSize:10, color:'#475569' }}>
          <span>Remaining: <span style={{ color:'#f59e0b' }}>{rem.toLocaleString()}</span></span>
          <span>{(100 - parseFloat(pct)).toFixed(1)}% left</span>
        </div>
      </div>
    );
  }

  if (!tasks || tasks.length === 0) {
    return (
      <div style={{ background:'#0a0e1a', minHeight:'40vh', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ textAlign:'center', color:'#475569' }}>
          <div style={{ fontSize:32, marginBottom:8 }}>📂</div>
          <div style={{ fontSize:14, fontWeight:700 }}>Upload your Excel file to populate the Hedging Board</div>
          <div style={{ fontSize:11, marginTop:4 }}>Data is read from the same sheet as the Gantt</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background:'#0a0e1a', minHeight:'60vh', padding:'20px' }}>

      {/* ── HEADER ── */}
      <div style={{ background:'linear-gradient(135deg,#0f172a,#1e1b4b)', borderRadius:12, border:'1px solid #1e293b', padding:'20px 24px', marginBottom:16 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12 }}>
          <div>
            <div style={{ fontSize:15, fontWeight:900, color:'#f8fafc', textTransform:'uppercase', letterSpacing:-0.3 }}>
              M22–M33 Schedule Hedging & Settlement Board
            </div>
            <div style={{ fontSize:10, color:'#475569', marginTop:3, fontStyle:'italic' }}>
              Lag regression path: -108d → 0d &nbsp;·&nbsp; Demolition works closed Q1 &nbsp;·&nbsp; Period: 2026.03 – 2027.03
              &nbsp;·&nbsp; <span style={{ color:'#3b82f6', fontWeight:700, fontStyle:'normal' }}>
                {zoneDef ? zoneDef.label : (AREA_GROUPS.find(a=>a.key===activeArea)?.label || 'All Areas')}
              </span>
            </div>
          </div>
          {/* Lag progress bar */}
          <div style={{ minWidth:280 }}>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'#94a3b8', marginBottom:4, fontWeight:700 }}>
              <span>Annual Lag Regression</span>
              <span style={{ color:'#3b82f6' }}>{data.lag} / 0 Days</span>
            </div>
            <div style={{ background:'#1e293b', borderRadius:999, height:8, overflow:'hidden', border:'1px solid #334155' }}>
              <div style={{ width:`${data.progress}%`, height:'100%', background:'#3b82f6', borderRadius:999, transition:'width 0.6s ease' }}/>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:9, color:'#334155', marginTop:3 }}>
              {['M22 (-108d)','M24 (-81d)','M27 (-54d)','M30 (-27d)','M33 (0d)'].map(l=><span key={l}>{l}</span>)}
            </div>
          </div>
        </div>

        {/* Quarter tabs */}
        <div style={{ display:'flex', gap:4, marginTop:14, flexWrap:'wrap' }}>
          {[['q1','Q1 · M22–24'],['q2','Q2 · M25–27'],['q3','Q3 · M28–30'],['q4','Q4 · M31–33']].map(([k,l])=>(
            <button key={k} onClick={()=>setActiveQ(k)} style={{
              padding:'5px 16px', borderRadius:6, border:`1px solid ${activeQ===k?'#3b82f6':'#1e293b'}`,
              background:activeQ===k?'#3b82f6':'#0f172a', color:activeQ===k?'#fff':'#64748b',
              cursor:'pointer', fontSize:11, fontWeight:700, fontFamily:'inherit'
            }}>{l}</button>
          ))}
        </div>
      </div>

      {/* ── KPI STRIP ── */}
      <div style={{ display:'flex', background:'#0f172a', border:'1px solid #1e293b', borderRadius:10, marginBottom:16, overflow:'hidden', flexWrap:'wrap' }}>
        {[
          ['Cumulative %',    data.kpi_p,  '#3b82f6'],
          ['Confirmed Vol.',  data.kpi_v,  '#22c55e'],
          ['Remaining Vol.',  data.kpi_r,  '#f59e0b'],
          ['Quarterly Target','+27d',      '#10b981'],
          ['Current Lag',     data.status, '#f87171'],
        ].map(([l,v,col],i)=>(
          <div key={i} style={{ flex:1, minWidth:120, padding:'10px 16px', borderRight:'1px solid #1e293b' }}>
            <div style={{ fontSize:9, color:'#64748b', textTransform:'uppercase', fontWeight:700, letterSpacing:0.5 }}>{l}</div>
            <div style={{ fontSize:16, fontWeight:900, color:col, marginTop:2, fontFamily:'monospace' }}>{v}</div>
          </div>
        ))}
      </div>

      {/* ── CATEGORY FILTER ── */}
      <div style={{ display:'flex', gap:6, marginBottom:14, flexWrap:'wrap', alignItems:'center' }}>
        <span style={{ fontSize:10, color:'#475569', fontWeight:700, textTransform:'uppercase' }}>Filter:</span>
        {Object.entries(TYPE_LABELS).map(([k,l])=>(
          <button key={k} onClick={()=>setActiveCat(k)} style={{
            padding:'4px 14px', borderRadius:20, fontSize:10, fontWeight:700, cursor:'pointer', fontFamily:'inherit',
            border:`1px solid ${activeCat===k?(k==='all'?'#3b82f6':TYPE_COLORS[k]):'#1e293b'}`,
            background:activeCat===k?(k==='all'?'#3b82f6':TYPE_COLORS[k])+'22':'transparent',
            color:activeCat===k?(k==='all'?'#3b82f6':TYPE_COLORS[k]):'#64748b',
          }}>{l}</button>
        ))}
        <span style={{ marginLeft:'auto', fontSize:10, color:'#334155', fontStyle:'italic' }}>
          {hedgingTasks.length} tasks · {zoneDef ? zoneDef.label : (AREA_GROUPS.find(a=>a.key===activeArea)?.label || 'All')} · auto-classified
        </span>
      </div>

      {/* ── TABLE ── */}
      <div style={{ background:'#0f172a', border:'1px solid #1e293b', borderRadius:10, overflow:'hidden', marginBottom:16 }}>
        <div style={{ overflowX:'auto', maxHeight:400, overflowY:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
            <thead>
              <tr style={{ background:'#0a0e1a', position:'sticky', top:0, zIndex:5 }}>
                {['Level','Zone','Work Scope','Total Qty','BLP End','Catch Up End','Qty Done','Remaining','Done %','Rem %'].map(h=>(
                  <th key={h} style={{ padding:'8px 12px', color:'#475569', fontSize:9, textTransform:'uppercase', fontWeight:700, textAlign:h==='Work Scope'?'left':'center', borderBottom:'1px solid #1e293b', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map((t,i)=>{
                const qIdx     = QUARTER_ORDER.indexOf(t.quarter);
                const activeIdx= QUARTER_ORDER.indexOf(activeQ);
                const isDone   = qIdx <= activeIdx;
                const doneQty  = isDone ? t.q : 0;
                const remQty   = t.q - doneQty;
                const donePct  = isDone ? 100 : 0;
                const typeCol  = TYPE_COLORS[t.type] || '#94a3b8';
                return (
                  <tr key={i} style={{ background:isDone?'#052e1622':'transparent', borderBottom:'1px solid #111827' }}
                    onMouseEnter={e=>e.currentTarget.style.background='#1e293b'}
                    onMouseLeave={e=>e.currentTarget.style.background=isDone?'#052e1622':'transparent'}>
                    <td style={{ padding:'6px 12px', textAlign:'center', color:'#94a3b8', fontWeight:700 }}>{t.l}</td>
                    <td style={{ padding:'6px 12px', textAlign:'center', color:'#94a3b8' }}>{t.z}</td>
                    <td style={{ padding:'6px 12px' }}>
                      <span style={{ background:typeCol+'22', color:typeCol, padding:'2px 8px', borderRadius:20, fontSize:9, fontWeight:700, marginRight:6 }}>{TYPE_LABELS[t.type]}</span>
                      <span style={{ color:'#cbd5e1' }}>{t.s}</span>
                    </td>
                    <td style={{ padding:'6px 12px', textAlign:'right', color:'#f1f5f9', fontWeight:800, fontFamily:'monospace' }}>{t.q.toLocaleString()}</td>
                    <td style={{ padding:'6px 12px', textAlign:'center', color:'#475569', fontStyle:'italic' }}>{t.bl}</td>
                    <td style={{ padding:'6px 12px', textAlign:'center', color:'#3b82f6' }}>{t.cc}</td>
                    <td style={{ padding:'6px 12px', textAlign:'right', color:'#22c55e', fontWeight:800 }}>{doneQty.toLocaleString()}</td>
                    <td style={{ padding:'6px 12px', textAlign:'right', color:'#f59e0b' }}>{remQty.toLocaleString()}</td>
                    <td style={{ padding:'6px 12px', textAlign:'center' }}>
                      <span style={{ color:donePct===100?'#22c55e':'#475569', fontWeight:700 }}>{donePct}%</span>
                    </td>
                    <td style={{ padding:'6px 12px', textAlign:'center', color:'#f59e0b' }}>{100-donePct}%</td>
                  </tr>
                );
              })}
              {filteredTasks.length === 0 && (
                <tr><td colSpan={10} style={{ padding:'24px', textAlign:'center', color:'#334155', fontStyle:'italic' }}>No tasks match this filter</td></tr>
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
