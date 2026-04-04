import { useState, useEffect, useRef, useCallback } from "react";

/* ══════════════════════════════════════════════════════════════
   CONFIG
═══════════════════════════════════════════════════════════════ */
const USER_ID = "RongLeo";
const APP_ID  = "daily_log";
const SB_URL  = "https://ejxummgrpimhvzrwatjr.supabase.co";
const SB_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqeHVtbWdycGltaHZ6cndhdGpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5MjgxMzcsImV4cCI6MjA5MDUwNDEzN30.uqDtqlTVfTlzYNkqj5HoPuXBgrbIBxcvbUuEFCYTWCE";
const LS_KEY  = `${APP_ID}_entries_cache`;
const LS_SB   = `${APP_ID}_sb_creds`;

/* ══════════════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════════════ */
const DAYS_VI   = ["CN","T2","T3","T4","T5","T6","T7"];
const MONTHS_VI = ["Tháng 1","Tháng 2","Tháng 3","Tháng 4","Tháng 5","Tháng 6","Tháng 7","Tháng 8","Tháng 9","Tháng 10","Tháng 11","Tháng 12"];
const TYPE_OPTS = [
  { v:"work",     l:"💼 Công việc",  c:"#2980b9" },
  { v:"meeting",  l:"🤝 Cuộc gặp",   c:"#27ae60" },
  { v:"learning", l:"📚 Học tập",     c:"#f39c12" },
  { v:"personal", l:"🙂 Cá nhân",    c:"#8e44ad" },
];
const MOOD_LIST = [
  { v:"great",   e:"😄", l:"Tuyệt" },
  { v:"good",    e:"😊", l:"Tốt"   },
  { v:"neutral", e:"😐", l:"Bình"  },
  { v:"tired",   e:"😴", l:"Mệt"   },
  { v:"bad",     e:"😔", l:"Buồn"  },
  { v:"angry",   e:"😤", l:"Tức"   },
  { v:"love",    e:"🥰", l:"Yêu"   },
  { v:"strong",  e:"💪", l:"Mạnh"  },
  { v:"focus",   e:"🎯", l:"Focus" },
  { v:"confused",e:"😵", l:"Rối"   },
];
const MOOD_MAP  = Object.fromEntries(MOOD_LIST.map(m => [m.v, m.e]));
const SAMPLE_CONTACTS = [
  { id:"c1", name:"Nguyễn Văn An" },
  { id:"c2", name:"Trần Thị Bích" },
  { id:"c3", name:"Lê Minh Châu"  },
  { id:"c4", name:"Phạm Thu Dung" },
  { id:"c5", name:"Hoàng Văn Em"  },
];

/* ══════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════ */
const todayStr  = () => new Date().toISOString().slice(0,10);
const nowTime   = () => new Date().toTimeString().slice(0,5);
const autoSession = (t) => { const h = parseInt((t||nowTime()).slice(0,2)); return h < 12 ? "morning" : "evening"; };
const uuid      = () => crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36)+Math.random().toString(36).slice(2);
const fmtDate   = (s) => { if (!s) return ""; const d = new Date(s+"T00:00:00"); return `${DAYS_VI[d.getDay()]}, ${d.getDate()} ${MONTHS_VI[d.getMonth()]} ${d.getFullYear()}`; };
const isToday   = (s) => s === todayStr();
const clamp     = (v,min,max) => Math.max(min, Math.min(max, v));
const avatarLetter = (n) => (n||"?").charAt(0).toUpperCase();

/* ══════════════════════════════════════════════════════════════
   SUPABASE CLIENT (lazy, no npm)
═══════════════════════════════════════════════════════════════ */
let _sb = null;
function getSB(url, key) {
  if (_sb) return _sb;
  try {
    if (window.supabase) { _sb = window.supabase.createClient(url, key); return _sb; }
  } catch(e) {}
  return null;
}

/* ══════════════════════════════════════════════════════════════
   LOCAL STORAGE
═══════════════════════════════════════════════════════════════ */
const lsGet  = (k)    => { try { return JSON.parse(localStorage.getItem(k)); } catch(e){ return null; } };
const lsSet  = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} };

/* ══════════════════════════════════════════════════════════════
   CSS
═══════════════════════════════════════════════════════════════ */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#f5f4f0;--bg2:#edecea;--surface:#fff;--surface2:#f9f8f6;
  --border:#e2e0db;--text:#1a1917;--text2:#6b6760;--text3:#a09d98;
  --accent:#c0392b;--accent2:#e74c3c;
  --morning:#e67e22;--evening:#6c5ce7;--green:#27ae60;--yellow:#f39c12;--blue:#2980b9;
  --shadow:0 1px 3px rgba(0,0,0,.06),0 2px 8px rgba(0,0,0,.04);
  --shadow-md:0 4px 16px rgba(0,0,0,.08),0 1px 4px rgba(0,0,0,.04);
  --shadow-lg:0 12px 40px rgba(0,0,0,.12),0 4px 12px rgba(0,0,0,.06);
  --r:12px;--r-sm:8px;--r-lg:20px;
  --font:'Be Vietnam Pro',sans-serif;--mono:'JetBrains Mono',monospace;
}
[data-theme=dark]{
  --bg:#141312;--bg2:#1c1b19;--surface:#222120;--surface2:#2a2927;
  --border:#333230;--text:#f0ede8;--text2:#9a9690;--text3:#5a5753;
}
body{font-family:var(--font);background:var(--bg);color:var(--text);font-size:15px;line-height:1.5;-webkit-font-smoothing:antialiased}
button{font-family:var(--font);cursor:pointer;border:none;background:none}
input,textarea,select{font-family:var(--font)}
::-webkit-scrollbar{width:4px;height:4px}
::-webkit-scrollbar-thumb{background:var(--border);border-radius:2px}

/* ── APP SHELL ── */
.app{display:flex;flex-direction:column;height:100vh;max-width:600px;margin:0 auto;position:relative}
.header{height:56px;background:var(--surface);border-bottom:1px solid var(--border);display:flex;align-items:center;padding:0 16px;gap:12px;flex-shrink:0;position:relative;z-index:10}
.header-logo{font-size:20px;font-weight:700;color:var(--accent);letter-spacing:-.5px;flex:1}
.header-logo span{color:var(--text);font-weight:300}
.header-actions{display:flex;gap:6px;align-items:center}
.icon-btn{width:34px;height:34px;border-radius:var(--r-sm);display:flex;align-items:center;justify-content:center;color:var(--text2);font-size:17px;transition:background .15s,color .15s}
.icon-btn:hover{background:var(--bg2);color:var(--text)}
.views{flex:1;overflow-y:auto;overflow-x:hidden;padding-bottom:74px}
.view{display:none;padding:16px;animation:fadeInUp .2s ease}
.view.active{display:block}
@keyframes fadeInUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}

/* ── TABS ── */
.tabs{height:64px;background:var(--surface);border-top:1px solid var(--border);display:flex;align-items:center;flex-shrink:0;z-index:10}
.tab-btn{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;height:100%;color:var(--text3);font-size:10.5px;font-weight:500;transition:color .15s;position:relative}
.tab-btn .ti{font-size:20px;line-height:1}
.tab-btn.active{color:var(--accent)}
.tab-btn.active::before{content:'';position:absolute;top:0;left:20%;right:20%;height:2px;background:var(--accent);border-radius:0 0 2px 2px}

/* ── FAB ── */
.fab{position:fixed;right:20px;bottom:80px;width:52px;height:52px;border-radius:50%;background:var(--accent);color:#fff;font-size:26px;display:flex;align-items:center;justify-content:center;box-shadow:var(--shadow-md);transition:transform .15s,box-shadow .15s;z-index:20;line-height:1}
.fab:hover{transform:scale(1.06);box-shadow:var(--shadow-lg)}
.fab:active{transform:scale(.96)}
@media(min-width:600px){.fab{right:calc(50% - 280px)}}

/* ── CALENDAR WEEK VIEW ── */
.cal-header{display:flex;align-items:center;gap:12px;margin-bottom:14px}
.cal-nav{width:32px;height:32px;border-radius:var(--r-sm);background:var(--surface);border:1px solid var(--border);color:var(--text2);font-size:16px;display:flex;align-items:center;justify-content:center;transition:background .15s}
.cal-nav:hover{background:var(--bg2)}
.cal-title{flex:1;text-align:center;font-size:15px;font-weight:600}
.cal-toggle{display:flex;background:var(--bg2);border-radius:20px;padding:2px}
.cal-toggle button{padding:4px 14px;border-radius:18px;font-size:12px;font-weight:500;color:var(--text2);transition:all .15s}
.cal-toggle button.active{background:var(--surface);color:var(--accent);box-shadow:var(--shadow)}
.week-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin-bottom:16px}
.week-day{background:var(--surface);border:1.5px solid var(--border);border-radius:var(--r);padding:10px 4px;text-align:center;cursor:pointer;transition:all .15s;min-height:80px;display:flex;flex-direction:column;align-items:center;gap:4px}
.week-day:hover{border-color:var(--accent);box-shadow:var(--shadow)}
.week-day.today{border-color:var(--accent);background:rgba(192,57,43,.04)}
.week-day.selected{background:var(--accent);border-color:var(--accent)}
.week-day.selected .wd-name,.week-day.selected .wd-num,.week-day.selected .wd-mood{color:#fff}
.week-day.has-entry{border-color:var(--text3)}
.week-day.today.selected{background:var(--accent)}
.wd-name{font-size:10px;color:var(--text3);font-weight:600;letter-spacing:.5px}
.wd-num{font-size:18px;font-weight:700;color:var(--text);line-height:1}
.wd-mood{font-size:14px;min-height:18px}
.wd-dots{display:flex;gap:2px;justify-content:center;min-height:8px}
.wd-dot{width:5px;height:5px;border-radius:50%;background:var(--accent);opacity:.6}
.week-day.today .wd-num{color:var(--accent)}

/* ── MONTH GRID ── */
.month-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:3px;margin-bottom:16px}
.month-day-header{font-size:10px;font-weight:600;text-align:center;color:var(--text3);padding:6px 0;letter-spacing:.5px}
.month-day{background:var(--surface);border:1px solid var(--border);border-radius:var(--r-sm);padding:6px 4px;text-align:center;cursor:pointer;transition:all .15s;min-height:48px;display:flex;flex-direction:column;align-items:center;gap:2px}
.month-day:hover{border-color:var(--accent)}
.month-day.today{border-color:var(--accent);background:rgba(192,57,43,.04)}
.month-day.selected{background:var(--accent);border-color:var(--accent)}
.month-day.selected .md-num{color:#fff}
.month-day.other-month{opacity:.35}
.month-day.missed{background:rgba(243,156,18,.06);border-color:rgba(243,156,18,.3)}
.md-num{font-size:13px;font-weight:600;color:var(--text)}
.month-day.today .md-num{color:var(--accent)}
.month-day.selected .md-num{color:#fff}
.md-mood{font-size:11px;min-height:14px}
.md-dot{width:4px;height:4px;border-radius:50%;background:var(--accent);opacity:.7}

/* ── DAY PANEL (below calendar) ── */
.day-panel{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:14px 16px;margin-bottom:14px}
.day-panel-header{display:flex;align-items:center;gap:10px;margin-bottom:12px}
.day-panel-date{flex:1}
.day-panel-date .dp-main{font-size:15px;font-weight:600}
.day-panel-date .dp-sub{font-size:11px;color:var(--text3);font-family:var(--mono)}
.day-panel-add{padding:6px 14px;border-radius:20px;background:var(--accent);color:#fff;font-size:12px;font-weight:600}

/* ── MISSED DAYS ── */
.missed-section{margin-bottom:14px}
.missed-header{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.8px;color:var(--yellow);margin-bottom:8px;display:flex;align-items:center;gap:6px}
.missed-chips{display:flex;flex-wrap:wrap;gap:6px}
.missed-chip{padding:4px 12px;border-radius:20px;font-size:12px;background:rgba(243,156,18,.1);color:var(--yellow);border:1px solid rgba(243,156,18,.3);cursor:pointer;transition:background .15s}
.missed-chip:hover{background:rgba(243,156,18,.2)}

/* ── ENTRY CARD ── */
.session-block{margin-bottom:18px}
.session-header{display:flex;align-items:center;gap:8px;padding:7px 12px;border-radius:var(--r-sm);margin-bottom:8px;font-size:13px;font-weight:600;letter-spacing:.3px}
.s-morning{background:rgba(230,126,34,.1);color:var(--morning);border-left:3px solid var(--morning)}
.s-evening{background:rgba(108,92,231,.1);color:var(--evening);border-left:3px solid var(--evening)}
.s-count{margin-left:auto;font-size:11px;font-weight:400;opacity:.7}
.entry-card{background:var(--surface);border-radius:var(--r);padding:13px 15px;margin-bottom:8px;box-shadow:var(--shadow);border:1px solid var(--border);cursor:pointer;transition:box-shadow .15s,transform .15s;position:relative;overflow:hidden}
.entry-card:hover{box-shadow:var(--shadow-md);transform:translateY(-1px)}
.entry-card::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--border)}
.ec-work::before{background:var(--blue)}
.ec-meeting::before{background:var(--green)}
.ec-learning::before{background:var(--yellow)}
.ec-personal::before{background:var(--text3)}
.entry-top{display:flex;align-items:flex-start;gap:8px;margin-bottom:5px}
.entry-time{font-family:var(--mono);font-size:11px;color:var(--text3);padding-top:2px;white-space:nowrap}
.entry-title{font-size:14px;font-weight:600;color:var(--text);flex:1;line-height:1.4}
.entry-mood{font-size:16px;flex-shrink:0}
.entry-content{font-size:13px;color:var(--text2);line-height:1.5;margin-bottom:7px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.entry-meta{display:flex;flex-wrap:wrap;gap:5px;align-items:center}
.entry-actions{display:flex;gap:5px;margin-left:auto}
.ea-btn{width:28px;height:28px;border-radius:var(--r-sm);background:var(--bg2);color:var(--text2);font-size:13px;display:flex;align-items:center;justify-content:center;transition:background .15s,color .15s}
.ea-btn:hover{background:var(--border);color:var(--text)}
.ea-done:hover{background:rgba(39,174,96,.15);color:var(--green)}
.ea-del:hover{background:rgba(192,57,43,.15);color:var(--accent)}
.entry-done{opacity:.6}

/* ── CHIPS ── */
.chip{display:inline-flex;align-items:center;gap:3px;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:500;background:var(--bg2);color:var(--text2);border:1px solid var(--border);white-space:nowrap}
.chip-person{background:rgba(41,128,185,.1);color:var(--blue);border-color:rgba(41,128,185,.2);cursor:pointer}
.chip-person:hover{background:rgba(41,128,185,.2)}
.chip-tag{background:rgba(108,92,231,.1);color:var(--evening);border-color:rgba(108,92,231,.2)}
.chip-work{background:rgba(41,128,185,.1);color:var(--blue);border-color:rgba(41,128,185,.2)}
.chip-meeting{background:rgba(39,174,96,.1);color:var(--green);border-color:rgba(39,174,96,.2)}
.chip-learning{background:rgba(243,156,18,.12);color:var(--yellow);border-color:rgba(243,156,18,.25)}
.chip-personal{background:var(--bg2);color:var(--text3)}
.chip-followup{background:rgba(243,156,18,.12);color:var(--yellow);border-color:rgba(243,156,18,.25)}

/* ── SEARCH VIEW ── */
.search-bar{display:flex;align-items:center;gap:10px;background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:10px 14px;margin-bottom:10px;box-shadow:var(--shadow)}
.search-bar input{flex:1;border:none;outline:none;background:none;color:var(--text);font-size:14px}
.search-bar input::placeholder{color:var(--text3)}
.filter-row{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px}
.filter-chip{padding:5px 12px;border-radius:20px;font-size:12px;font-weight:500;background:var(--surface);border:1px solid var(--border);color:var(--text2);cursor:pointer;transition:all .15s}
.filter-chip:hover,.filter-chip.active{background:var(--accent);color:#fff;border-color:var(--accent)}

/* ── PEOPLE VIEW ── */
.people-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px;margin-bottom:16px}
.person-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:14px 10px;text-align:center;cursor:pointer;transition:box-shadow .15s,transform .15s;box-shadow:var(--shadow)}
.person-card:hover{box-shadow:var(--shadow-md);transform:translateY(-1px)}
.person-avatar{width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--evening));color:#fff;font-size:17px;font-weight:700;display:flex;align-items:center;justify-content:center;margin:0 auto 8px}
.person-name{font-size:12px;font-weight:600;color:var(--text);margin-bottom:2px}
.person-count{font-size:11px;color:var(--text3)}
.people-filter-banner{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:10px 14px;margin-bottom:12px;display:flex;align-items:center;gap:10px;font-size:13px;color:var(--text2)}
.clear-filter-btn{margin-left:auto;font-size:12px;color:var(--accent);font-weight:500;cursor:pointer;padding:3px 8px;border-radius:20px;border:1px solid var(--accent)}
.clear-filter-btn:hover{background:var(--accent);color:#fff}

/* ── FOLLOW-UP VIEW ── */
.fu-stats{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px}
.stat-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:14px;box-shadow:var(--shadow);text-align:center}
.stat-num{font-size:28px;font-weight:700;color:var(--accent);font-family:var(--mono)}
.stat-label{font-size:11px;color:var(--text3);margin-top:2px}

/* ── SECTION TITLE ── */
.sec-title{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.8px;color:var(--text3);margin-bottom:10px;padding-left:2px}

/* ── EMPTY STATE ── */
.empty{text-align:center;padding:40px 20px;color:var(--text3)}
.empty .ei{font-size:40px;margin-bottom:12px}
.empty p{font-size:14px}

/* ── MODAL ── */
.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:100;display:flex;align-items:flex-end;backdrop-filter:blur(4px);animation:fadeIn .2s ease}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
.modal{background:var(--surface);border-radius:var(--r-lg) var(--r-lg) 0 0;width:100%;max-width:600px;margin:0 auto;max-height:92vh;overflow-y:auto;animation:slideUp .25s ease}
@keyframes slideUp{from{transform:translateY(40px);opacity:0}to{transform:translateY(0);opacity:1}}
.modal::-webkit-scrollbar{display:none}
.modal-handle{width:36px;height:4px;background:var(--border);border-radius:2px;margin:12px auto 0}
.modal-header{padding:14px 20px 10px;display:flex;align-items:center;justify-content:space-between}
.modal-title{font-size:16px;font-weight:700}
.modal-close{width:32px;height:32px;border-radius:var(--r-sm);background:var(--bg2);color:var(--text2);display:flex;align-items:center;justify-content:center;font-size:18px}
.modal-close:hover{background:var(--border)}
.modal-body{padding:0 20px 12px}
.field-group{margin-bottom:14px}
.field-label{font-size:12px;font-weight:600;color:var(--text2);margin-bottom:6px}
.field-input{width:100%;padding:10px 12px;background:var(--bg);border:1px solid var(--border);border-radius:var(--r-sm);color:var(--text);font-size:14px;outline:none;transition:border-color .15s}
.field-input:focus{border-color:var(--accent)}
textarea.field-input{resize:vertical;min-height:90px;line-height:1.5}
.field-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.field-row-3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}
select.field-input{cursor:pointer}

/* mood grid */
.mood-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:5px}
.mood-btn{display:flex;flex-direction:column;align-items:center;gap:3px;padding:8px 4px;border-radius:var(--r-sm);border:1px solid var(--border);background:var(--bg);cursor:pointer;transition:all .15s;font-size:19px}
.mood-btn .ml{font-size:9px;color:var(--text3);font-family:var(--mono)}
.mood-btn:hover{border-color:var(--text3);background:var(--bg2)}
.mood-btn.selected{border-color:var(--accent);background:rgba(192,57,43,.08)}

/* people picker */
.people-picker{position:relative}
.people-input-wrap{display:flex;flex-wrap:wrap;gap:5px;align-items:center;min-height:42px;background:var(--bg);border:1px solid var(--border);border-radius:var(--r-sm);padding:7px 10px;cursor:text;transition:border-color .15s}
.people-input-wrap:focus-within{border-color:var(--accent)}
.people-input-wrap input{border:none;background:none;outline:none;color:var(--text);font-size:13px;padding:0;min-width:80px;flex:1}
.people-chip{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:20px;font-size:12px;background:rgba(41,128,185,.12);color:var(--blue);border:1px solid rgba(41,128,185,.25)}
.pc-remove{cursor:pointer;font-size:14px;opacity:.7}
.pc-remove:hover{opacity:1}
.people-dropdown{position:absolute;top:calc(100% + 4px);left:0;right:0;background:var(--surface);border:1px solid var(--border);border-radius:var(--r-sm);box-shadow:var(--shadow-md);max-height:180px;overflow-y:auto;z-index:50}
.pdi{padding:9px 14px;font-size:13px;color:var(--text);cursor:pointer;display:flex;align-items:center;gap:8px;transition:background .1s}
.pdi:hover,.pdi.focused{background:var(--bg2)}
.pdi-av{width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--evening));color:#fff;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0}

/* tags */
.tags-wrap{display:flex;flex-wrap:wrap;gap:5px;align-items:center;min-height:42px;background:var(--bg);border:1px solid var(--border);border-radius:var(--r-sm);padding:7px 10px;cursor:text;transition:border-color .15s}
.tags-wrap:focus-within{border-color:var(--accent)}
.tags-wrap input{border:none;background:none;outline:none;color:var(--text);font-size:13px;padding:0;min-width:80px;flex:1}
.tag-chip{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:20px;font-size:12px;background:rgba(108,92,231,.1);color:var(--evening);border:1px solid rgba(108,92,231,.2)}
.tc-remove{cursor:pointer;font-size:14px;opacity:.7}

/* modal footer */
.modal-footer{padding:10px 20px 24px;display:flex;gap:10px}
.btn{flex:1;padding:12px;border-radius:var(--r-sm);font-size:14px;font-weight:600;transition:all .15s}
.btn-primary{background:var(--accent);color:#fff}
.btn-primary:hover{background:var(--accent2)}
.btn-secondary{background:var(--bg2);color:var(--text2);border:1px solid var(--border)}
.btn-secondary:hover{background:var(--border);color:var(--text)}

/* ── DETAIL MODAL ── */
.detail-sec{margin-bottom:12px}
.dl{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:var(--text3);margin-bottom:4px}
.dv{font-size:14px;color:var(--text);line-height:1.6}
.dv-followup{background:rgba(243,156,18,.1);border:1px solid rgba(243,156,18,.25);border-radius:var(--r-sm);padding:10px 12px;font-size:13px;color:var(--yellow)}
.ai-box{background:linear-gradient(135deg,rgba(192,57,43,.06),rgba(108,92,231,.06));border:1px solid rgba(192,57,43,.2);border-radius:var(--r);padding:14px 16px;margin-top:14px}
.ai-box-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--accent);margin-bottom:10px;display:flex;align-items:center;gap:6px}
.ai-highlight{font-size:14px;color:var(--text);font-style:italic;border-left:3px solid var(--accent);padding-left:12px;margin-bottom:10px;line-height:1.6}
.ai-point{display:flex;gap:8px;align-items:flex-start;margin-bottom:6px}
.ai-pt-num{width:20px;height:20px;border-radius:6px;background:rgba(192,57,43,.12);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--accent);flex-shrink:0;margin-top:1px}
.ai-pt-text{font-size:13px;line-height:1.55;color:var(--text2)}

/* ── TOAST ── */
.toast{position:fixed;bottom:84px;left:50%;transform:translateX(-50%) translateY(20px);background:var(--text);color:var(--bg);padding:9px 18px;border-radius:24px;font-size:13px;font-weight:500;opacity:0;transition:all .25s;pointer-events:none;z-index:200;white-space:nowrap;max-width:calc(100vw - 40px)}
.toast.show{opacity:1;transform:translateX(-50%) translateY(0)}

/* ── SYNC DOT ── */
.sync-dot{width:6px;height:6px;border-radius:50%;background:var(--green);display:inline-block;margin-right:4px}
.sync-dot.offline{background:var(--text3)}
.sync-dot.syncing{background:var(--yellow);animation:pulse .8s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}

/* ── CONFIRM ── */
.confirm-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:300;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)}
.confirm-box{background:var(--surface);border-radius:var(--r-lg);padding:24px 20px 20px;width:100%;max-width:300px;box-shadow:var(--shadow-lg);text-align:center}
.confirm-icon{font-size:36px;margin-bottom:10px}
.confirm-title{font-size:16px;font-weight:700;margin-bottom:6px}
.confirm-msg{font-size:13px;color:var(--text2);margin-bottom:20px;line-height:1.5}
.confirm-actions{display:flex;gap:10px}
.confirm-cancel{flex:1;padding:11px;border-radius:var(--r-sm);font-size:14px;font-weight:600;background:var(--bg2);color:var(--text2);border:1px solid var(--border)}
.confirm-ok{flex:1;padding:11px;border-radius:var(--r-sm);font-size:14px;font-weight:600;background:var(--accent);color:#fff;border:none}

/* ── LOADING BAR ── */
.loading-bar{height:2px;background:var(--accent);position:fixed;top:0;left:0;z-index:999;transition:width .3s ease}

/* ── VIEW TITLE ── */
.view-title{font-size:18px;font-weight:700;margin-bottom:14px}

@media(min-width:600px){.modal{border-radius:var(--r-lg);margin:auto;margin-bottom:20px}.modal-overlay{align-items:center}}
`;

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════ */
export default function DailyJournal() {
  // ── state ──────────────────────────────────────────────────
  const [entries, setEntries]         = useState([]);
  const [contacts, setContacts]       = useState(SAMPLE_CONTACTS);
  const [sbUrl, setSbUrl]             = useState(SB_URL);
  const [sbKey, setSbKey]             = useState(SB_KEY);
  const [syncStatus, setSyncStatus]   = useState("offline"); // online|offline|syncing
  const [theme, setTheme]             = useState("light");
  const [activeTab, setActiveTab]     = useState("calendar");
  const [calMode, setCalMode]         = useState("week"); // week|month
  const [calDate, setCalDate]         = useState(todayStr());
  const [selectedDay, setSelectedDay] = useState(todayStr());
  const [searchQ, setSearchQ]         = useState("");
  const [searchFilter, setSearchFilter] = useState("all");
  const [personFilter, setPersonFilter] = useState(null); // {id,name}
  const [toast, setToast]             = useState(null);
  const [loadingPct, setLoadingPct]   = useState(0);
  const [modal, setModal]             = useState(null); // null | "entry" | "detail" | "confirm"
  const [detailEntry, setDetailEntry] = useState(null);
  const [aiLoading, setAiLoading]     = useState(false);
  const [confirmData, setConfirmData] = useState(null);
  // form state
  const [form, setForm] = useState({});
  const [formPeople, setFormPeople]   = useState([]);
  const [formTags, setFormTags]       = useState([]);
  const [formMood, setFormMood]       = useState(null);
  const [formMode, setFormMode]       = useState("add"); // add|edit
  const [editId, setEditId]           = useState(null);
  const [peopleSearch, setPeopleSearch] = useState("");
  const [showPDD, setShowPDD]         = useState(false);
  const [tagInput, setTagInput]       = useState("");
  const titleRef = useRef(null);

  // ── init ───────────────────────────────────────────────────
  useEffect(() => {
    const creds = lsGet(LS_SB);
    if (creds) { setSbUrl(creds.url||SB_URL); setSbKey(creds.key||SB_KEY); }
    const th = localStorage.getItem("dl_theme") || "light";
    setTheme(th);
    document.documentElement.setAttribute("data-theme", th);
    loadEntries(creds ? creds.url : SB_URL, creds ? creds.key : SB_KEY);
  }, []);

  // ── db helpers ─────────────────────────────────────────────
  const loadEntries = async (url, key) => {
    setLoadingPct(30);
    const sb = getSB(url||sbUrl, key||sbKey);
    if (sb) {
      setSyncStatus("syncing");
      try {
        const { data, error } = await sb
          .from("daily_logs")
          .select("*")
          .eq("id_user", USER_ID)
          .eq("id_app", APP_ID)
          .order("date", { ascending: false });
        if (!error && data) {
          setEntries(data);
          lsSet(LS_KEY, data);
          setSyncStatus("online");
          setLoadingPct(100);
          setTimeout(() => setLoadingPct(0), 500);
          return;
        }
      } catch(e) {}
    }
    // fallback
    const cached = lsGet(LS_KEY) || [];
    setEntries(cached);
    setSyncStatus("offline");
    setLoadingPct(100);
    setTimeout(() => setLoadingPct(0), 500);
  };

  const dbInsert = async (entry) => {
    const sb = getSB(sbUrl, sbKey);
    if (sb && syncStatus === "online") {
      try {
        const { data, error } = await sb.from("daily_logs").insert([entry]).select().single();
        if (!error && data) return data;
      } catch(e) {}
    }
    return { ...entry, id: entry.id || uuid() };
  };

  const dbUpdate = async (id, changes) => {
    const sb = getSB(sbUrl, sbKey);
    if (sb && syncStatus === "online") {
      try {
        await sb.from("daily_logs").update({ ...changes, updated_at: new Date().toISOString() })
          .eq("id", id).eq("id_user", USER_ID).eq("id_app", APP_ID);
      } catch(e) {}
    }
  };

  const dbDelete = async (id) => {
    const sb = getSB(sbUrl, sbKey);
    if (sb && syncStatus === "online") {
      try {
        await sb.from("daily_logs").delete().eq("id", id).eq("id_user", USER_ID).eq("id_app", APP_ID);
      } catch(e) {}
    }
  };

  // ── entries helpers ────────────────────────────────────────
  const entriesForDay   = (d) => entries.filter(e => e.date === d);
  const moodForDay      = (d) => { const es = entriesForDay(d); return es.length ? (MOOD_MAP[es[0].mood]||"") : ""; };
  const countForDay     = (d) => entriesForDay(d).length;

  // ── calendar helpers ───────────────────────────────────────
  const weekDates = (anchor) => {
    const d = new Date(anchor+"T00:00:00");
    const dow = d.getDay();
    const mon = new Date(d); mon.setDate(d.getDate() - ((dow+6)%7));
    return Array.from({length:7}, (_,i) => { const x=new Date(mon); x.setDate(mon.getDate()+i); return x.toISOString().slice(0,10); });
  };
  const monthDates = (anchor) => {
    const d   = new Date(anchor+"T00:00:00");
    const y   = d.getFullYear(), m = d.getMonth();
    const first = new Date(y,m,1);
    const last  = new Date(y,m+1,0);
    const startPad = (first.getDay()+6)%7;
    const cells = [];
    for(let i=startPad-1;i>=0;i--){ const x=new Date(y,m,-i); cells.push({d:x.toISOString().slice(0,10),other:true}); }
    for(let i=1;i<=last.getDate();i++){ cells.push({d:new Date(y,m,i).toISOString().slice(0,10),other:false}); }
    const rem = 42 - cells.length;
    for(let i=1;i<=rem;i++){ cells.push({d:new Date(y,m+1,i).toISOString().slice(0,10),other:true}); }
    return cells;
  };

  const navCal = (dir) => {
    const d = new Date(calDate+"T00:00:00");
    if (calMode==="week") d.setDate(d.getDate() + dir*7);
    else d.setMonth(d.getMonth() + dir);
    setCalDate(d.toISOString().slice(0,10));
  };
  const calTitle = () => {
    const d = new Date(calDate+"T00:00:00");
    if (calMode==="week") {
      const w = weekDates(calDate);
      const a = new Date(w[0]+"T00:00:00"), b = new Date(w[6]+"T00:00:00");
      return `${a.getDate()}/${a.getMonth()+1} – ${b.getDate()}/${b.getMonth()+1}/${b.getFullYear()}`;
    }
    return `${MONTHS_VI[d.getMonth()]} ${d.getFullYear()}`;
  };

  // missed days: past 14 days with no entry
  const missedDays = () => {
    const res = [];
    for(let i=1;i<=14;i++){
      const d=new Date(); d.setDate(d.getDate()-i);
      const s=d.toISOString().slice(0,10);
      if(!countForDay(s)) res.push(s);
    }
    return res.slice(0,7);
  };

  // ── toast ──────────────────────────────────────────────────
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  // ── theme ──────────────────────────────────────────────────
  const toggleTheme = () => {
    const t = theme==="light" ? "dark" : "light";
    setTheme(t);
    document.documentElement.setAttribute("data-theme", t);
    localStorage.setItem("dl_theme", t);
  };

  // ── form helpers ───────────────────────────────────────────
  const setF = (k, v) => setForm(p => ({...p, [k]:v}));

  const openAdd = (date, session) => {
    const d = date || selectedDay;
    const s = session || autoSession();
    setForm({ date:d, time:nowTime(), session:s, type:"work", status:"open", follow_up:"", content:"", title:"" });
    setFormPeople([]); setFormTags([]); setFormMood(null);
    setFormMode("add"); setEditId(null);
    setModal("entry");
    setTimeout(() => titleRef.current?.focus(), 300);
  };

  const openEdit = (entry) => {
    setForm({
      date:entry.date, time:entry.time||nowTime(), session:entry.session||"morning",
      type:entry.type||"work", status:entry.status||"open",
      follow_up:entry.follow_up||"", content:entry.content||"", title:entry.title||""
    });
    setFormPeople(Array.isArray(entry.people) ? [...entry.people] : []);
    setFormTags(Array.isArray(entry.tags) ? [...entry.tags] : []);
    setFormMood(entry.mood||null);
    setFormMode("edit"); setEditId(entry.id);
    setModal("entry");
  };

  const saveForm = async () => {
    if (!form.title?.trim()) { showToast("Vui lòng nhập tiêu đề"); return; }
    const payload = {
      id_user: USER_ID, id_app: APP_ID,
      date: form.date, time: form.time, session: form.session,
      title: form.title.trim(), content: form.content?.trim()||"",
      people: formPeople, tags: formTags,
      type: form.type, follow_up: form.follow_up?.trim()||null,
      status: form.status, mood: formMood,
    };
    if (formMode==="add") {
      payload.id = uuid();
      payload.created_at = new Date().toISOString();
      const saved = await dbInsert(payload);
      setEntries(p => [saved, ...p]);
      lsSet(LS_KEY, [saved, ...entries]);
      showToast("✅ Đã thêm bản ghi");
    } else {
      payload.updated_at = new Date().toISOString();
      await dbUpdate(editId, payload);
      const updated = entries.map(e => e.id===editId ? {...e,...payload} : e);
      setEntries(updated);
      lsSet(LS_KEY, updated);
      showToast("✅ Đã cập nhật");
    }
    setModal(null);
  };

  const deleteEntry = (id) => {
    setConfirmData({ icon:"🗑", title:"Xoá bản ghi?", msg:"Thao tác không thể hoàn tác.", onOk: async () => {
      await dbDelete(id);
      const updated = entries.filter(e => e.id!==id);
      setEntries(updated); lsSet(LS_KEY, updated);
      setModal(null); showToast("🗑 Đã xoá");
    }});
    setModal("confirm");
  };

  const markDone = async (id, forceTo) => {
    const entry = entries.find(e => e.id===id);
    if (!entry) return;
    const ns = forceTo || (entry.status==="done" ? "open" : "done");
    await dbUpdate(id, { status:ns });
    const updated = entries.map(e => e.id===id ? {...e, status:ns} : e);
    setEntries(updated); lsSet(LS_KEY, updated);
  };

  const duplicateEntry = (id) => {
    const entry = entries.find(e => e.id===id);
    if (!entry) return;
    openAdd(entry.date, entry.session);
    setTimeout(() => {
      setForm(p => ({...p, title:entry.title+" (copy)", content:entry.content||"", type:entry.type, follow_up:entry.follow_up||""}));
      setFormPeople(entry.people||[]); setFormTags(entry.tags||[]); setFormMood(entry.mood||null);
    }, 50);
  };

  // ── AI summary ─────────────────────────────────────────────
  const summarizeEntry = async (entry) => {
    if (!entry.content?.trim()) { showToast("Chưa có nội dung để tóm tắt"); return; }
    setAiLoading(true);
    try {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          model:"claude-sonnet-4-20250514", max_tokens:1000,
          messages:[{ role:"user", content:
            `Tóm tắt nhật ký ngày ${fmtDate(entry.date)} thành ý chính. JSON only, không markdown:\n{"points":["ý 1","ý 2"],"highlight":"1 câu tổng quan"}\n\nNhật ký:\n${entry.content}`
          }]
        })
      });
      const data = await resp.json();
      const raw = data.content?.find(b=>b.type==="text")?.text||"{}";
      const parsed = JSON.parse(raw.replace(/```json|```/g,"").trim());
      const updated = entries.map(e => e.id===entry.id ? {...e, _summary:parsed} : e);
      setEntries(updated);
      setDetailEntry(d => d ? {...d, _summary:parsed} : d);
      showToast("✨ AI tóm tắt xong");
    } catch(e) { showToast("❌ Lỗi AI"); }
    setAiLoading(false);
  };

  // ── export / import ────────────────────────────────────────
  const exportData = () => {
    const blob = new Blob([JSON.stringify(entries, null, 2)], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download=`daily_log_${todayStr()}.json`; a.click();
    URL.revokeObjectURL(url);
    showToast("📤 Đã export");
  };

  const importData = (file) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target.result);
        if (!Array.isArray(data)) throw new Error();
        setConfirmData({ icon:"📥", title:"Import dữ liệu?", msg:`Thêm ${data.length} bản ghi. Dữ liệu hiện tại không bị xoá.`, onOk: async () => {
          let added = 0;
          const toAdd = [];
          for (const item of data) {
            if (!item.title || !item.date) continue;
            if (entries.some(e => e.id===item.id)) continue;
            if (item.id_user !== USER_ID || item.id_app !== APP_ID) continue;
            const saved = await dbInsert(item);
            toAdd.push(saved); added++;
          }
          const updated = [...toAdd, ...entries];
          setEntries(updated); lsSet(LS_KEY, updated);
          showToast(`📥 Đã import ${added} bản ghi`);
        }});
        setModal("confirm");
      } catch(e) { showToast("❌ File không hợp lệ"); }
    };
    reader.readAsText(file);
  };

  // ── people picker ──────────────────────────────────────────
  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(peopleSearch.toLowerCase()) &&
    !formPeople.find(p => p.contact_id===c.id)
  );

  const addPerson = (c) => {
    setFormPeople(p => [...p, {contact_id:c.id, name:c.name}]);
    setPeopleSearch(""); setShowPDD(false);
  };
  const removePerson = (id) => setFormPeople(p => p.filter(x => x.contact_id!==id));

  const addTag = (v) => {
    const t = v.trim().replace(/^#/,"");
    if (t && !formTags.includes(t)) setFormTags(p => [...p, t]);
  };

  // ── search ─────────────────────────────────────────────────
  const searchResults = () => {
    let r = entries;
    if (searchFilter!=="all") r = r.filter(e => e.type===searchFilter);
    if (searchQ) {
      const q = searchQ.toLowerCase();
      r = r.filter(e =>
        (e.title||"").toLowerCase().includes(q) ||
        (e.content||"").toLowerCase().includes(q) ||
        (e.people||[]).some(p=>p.name.toLowerCase().includes(q)) ||
        (e.tags||[]).some(t=>t.toLowerCase().includes(q))
      );
    }
    return r;
  };
  const groupByDate = (list) => {
    const g = {};
    list.forEach(e => { const d=e.date||"unknown"; if(!g[d])g[d]=[]; g[d].push(e); });
    return Object.keys(g).sort((a,b)=>b.localeCompare(a)).map(d => ({d, es:g[d]}));
  };

  // ── people view helpers ───────────────────────────────────
  const buildPeopleMap = () => {
    const m = {};
    entries.forEach(e => {
      (e.people||[]).forEach(p => {
        if (!m[p.contact_id]) m[p.contact_id] = {...p, count:0};
        m[p.contact_id].count++;
      });
    });
    return Object.values(m).sort((a,b)=>b.count-a.count);
  };
  const filteredPeopleEntries = personFilter
    ? entries.filter(e => (e.people||[]).some(p=>p.contact_id===personFilter.id))
    : [];

  // ── render helpers ─────────────────────────────────────────
  const EntryCard = ({entry, showDate=false}) => {
    const people = Array.isArray(entry.people)?entry.people:[];
    const tags   = Array.isArray(entry.tags)?entry.tags:[];
    return (
      <div className={`entry-card ec-${entry.type||"work"} ${entry.status==="done"?"entry-done":""}`}
           onClick={()=>{ setDetailEntry(entry); setModal("detail"); }}>
        {showDate && <div style={{fontSize:11,color:"var(--text3)",marginBottom:6,fontFamily:"var(--mono)"}}>{fmtDate(entry.date)}</div>}
        <div className="entry-top">
          <span className="entry-time">{entry.time||"--:--"}</span>
          <span className="entry-title">{entry.title}</span>
          {entry.mood && <span className="entry-mood">{MOOD_MAP[entry.mood]}</span>}
        </div>
        {entry.content && <div className="entry-content">{entry.content}</div>}
        <div className="entry-meta">
          <span className={`chip chip-${entry.type||"work"}`}>{TYPE_OPTS.find(t=>t.v===entry.type)?.l||entry.type}</span>
          {people.slice(0,2).map(p=><span key={p.contact_id} className="chip chip-person" onClick={e=>{e.stopPropagation();setPersonFilter({id:p.contact_id,name:p.name});setActiveTab("people")}}>👤 {p.name}</span>)}
          {tags.slice(0,2).map(t=><span key={t} className="chip chip-tag">#{t}</span>)}
          {entry.follow_up && entry.status==="open" && <span className="chip chip-followup">📌</span>}
          <div className="entry-actions" onClick={ev=>ev.stopPropagation()}>
            {entry.status!=="done" && <button className="ea-btn ea-done" title="Done" onClick={()=>markDone(entry.id)}>✓</button>}
            <button className="ea-btn" title="Nhân bản" onClick={()=>duplicateEntry(entry.id)}>📄</button>
            <button className="ea-btn" title="Sửa" onClick={()=>openEdit(entry)}>✏️</button>
            <button className="ea-btn ea-del" title="Xoá" onClick={()=>deleteEntry(entry.id)}>🗑</button>
          </div>
        </div>
      </div>
    );
  };

  const DayPanel = ({date}) => {
    const es = entriesForDay(date);
    const morning = es.filter(e=>e.session==="morning").sort((a,b)=>(b.time||"").localeCompare(a.time||""));
    const evening = es.filter(e=>e.session==="evening").sort((a,b)=>(b.time||"").localeCompare(a.time||""));
    return (
      <div>
        <div className="day-panel">
          <div className="day-panel-header">
            <div className="day-panel-date">
              <div className="dp-main">{isToday(date)?"Hôm nay":fmtDate(date)}</div>
              <div className="dp-sub">{date}</div>
            </div>
            <button className="day-panel-add" onClick={()=>openAdd(date)}>+ Thêm</button>
          </div>
          {es.length===0 && <div style={{color:"var(--text3)",fontSize:13,textAlign:"center",padding:"10px 0"}}>Chưa có bản ghi — {isToday(date)?"hôm nay bạn làm gì?":"quá khứ chưa ghi lại"}</div>}
        </div>
        {morning.length>0 && <div className="session-block">
          <div className="session-header s-morning">☀️ Phiên Sáng<span className="s-count">{morning.length} bản ghi</span></div>
          {morning.map(e=><EntryCard key={e.id} entry={e}/>)}
        </div>}
        {evening.length>0 && <div className="session-block">
          <div className="session-header s-evening">🌙 Phiên Tối<span className="s-count">{evening.length} bản ghi</span></div>
          {evening.map(e=><EntryCard key={e.id} entry={e}/>)}
        </div>}
      </div>
    );
  };

  /* ── CALENDAR VIEW ── */
  const CalendarView = () => {
    const missed = missedDays();
    return (
      <div>
        {/* cal header */}
        <div className="cal-header">
          <button className="cal-nav" onClick={()=>navCal(-1)}>‹</button>
          <div className="cal-title">{calTitle()}</div>
          <button className="cal-nav" onClick={()=>navCal(1)}>›</button>
          <div className="cal-toggle">
            <button className={calMode==="week"?"active":""} onClick={()=>setCalMode("week")}>Tuần</button>
            <button className={calMode==="month"?"active":""} onClick={()=>setCalMode("month")}>Tháng</button>
          </div>
        </div>

        {/* week grid */}
        {calMode==="week" && (
          <div className="week-grid">
            {weekDates(calDate).map(d=>{
              const cnt = countForDay(d);
              const mood = moodForDay(d);
              const sel = d===selectedDay;
              const tod = isToday(d);
              return (
                <div key={d} className={`week-day${tod?" today":""}${sel?" selected":""}${cnt>0&&!sel?" has-entry":""}`}
                     onClick={()=>setSelectedDay(d)}>
                  <div className="wd-name">{DAYS_VI[new Date(d+"T00:00:00").getDay()]}</div>
                  <div className="wd-num">{new Date(d+"T00:00:00").getDate()}</div>
                  <div className="wd-mood">{mood}</div>
                  <div className="wd-dots">
                    {Array.from({length:clamp(cnt,0,3)}).map((_,i)=><div key={i} className="wd-dot"/>)}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* month grid */}
        {calMode==="month" && (
          <div>
            <div className="month-grid">
              {["T2","T3","T4","T5","T6","T7","CN"].map(d=><div key={d} className="month-day-header">{d}</div>)}
              {monthDates(calDate).map(({d,other})=>{
                const cnt = countForDay(d);
                const mood = moodForDay(d);
                const sel = d===selectedDay;
                const tod = isToday(d);
                const isMissed = !cnt && !other && d<todayStr() && !isToday(d);
                return (
                  <div key={d} className={`month-day${other?" other-month":""}${tod?" today":""}${sel?" selected":""}${isMissed?" missed":""}`}
                       onClick={()=>setSelectedDay(d)}>
                    <div className="md-num">{new Date(d+"T00:00:00").getDate()}</div>
                    {mood && <div className="md-mood">{mood}</div>}
                    {!mood && cnt>0 && <div className="md-dot"/>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* missed days */}
        {missed.length>0 && (
          <div className="missed-section">
            <div className="missed-header">⚠️ Ngày chưa ghi ({missed.length})</div>
            <div className="missed-chips">
              {missed.map(d=>(
                <div key={d} className="missed-chip" onClick={()=>{setSelectedDay(d);openAdd(d);}}>
                  {new Date(d+"T00:00:00").getDate()}/{new Date(d+"T00:00:00").getMonth()+1}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* day panel */}
        <DayPanel date={selectedDay}/>
      </div>
    );
  };

  /* ── SEARCH VIEW ── */
  const SearchView = () => {
    const results = searchResults();
    const grouped = groupByDate(results);
    return (
      <div>
        <div className="search-bar">
          <span>🔍</span>
          <input autoFocus value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="Tìm theo tiêu đề, nội dung, người…"/>
          {searchQ && <button onClick={()=>setSearchQ("")} style={{color:"var(--text3)"}}>✕</button>}
        </div>
        <div className="filter-row">
          {[{v:"all",l:"Tất cả"},...TYPE_OPTS].map(t=>(
            <button key={t.v} className={`filter-chip${searchFilter===t.v?" active":""}`} onClick={()=>setSearchFilter(t.v)}>{t.l}</button>
          ))}
        </div>
        {grouped.length===0 && <div className="empty"><div className="ei">🔍</div><p>Không tìm thấy kết quả.</p></div>}
        {grouped.map(({d,es})=>(
          <div key={d}>
            <div className="sec-title">{isToday(d)?"Hôm nay":fmtDate(d)}</div>
            {es.map(e=><EntryCard key={e.id} entry={e}/>)}
          </div>
        ))}
      </div>
    );
  };

  /* ── PEOPLE VIEW ── */
  const PeopleView = () => {
    const pmap = buildPeopleMap();
    return (
      <div>
        <div className="view-title">👥 Người liên quan</div>
        {personFilter && (
          <div className="people-filter-banner">
            <span>Lọc: <strong>{personFilter.name}</strong></span>
            <button className="clear-filter-btn" onClick={()=>setPersonFilter(null)}>Xoá bộ lọc</button>
          </div>
        )}
        {!personFilter && (
          <div className="people-grid">
            {pmap.map(p=>(
              <div key={p.contact_id} className="person-card" onClick={()=>setPersonFilter({id:p.contact_id,name:p.name})}>
                <div className="person-avatar">{avatarLetter(p.name)}</div>
                <div className="person-name">{p.name}</div>
                <div className="person-count">{p.count} bản ghi</div>
              </div>
            ))}
            {pmap.length===0 && <div className="empty" style={{gridColumn:"1/-1"}}><div className="ei">👥</div><p>Chưa có ai trong nhật ký.</p></div>}
          </div>
        )}
        {personFilter && (
          <>
            {filteredPeopleEntries.length===0 && <div className="empty"><div className="ei">📭</div><p>Chưa có bản ghi.</p></div>}
            {groupByDate(filteredPeopleEntries).map(({d,es})=>(
              <div key={d}>
                <div className="sec-title">{isToday(d)?"Hôm nay":fmtDate(d)}</div>
                {es.map(e=><EntryCard key={e.id} entry={e}/>)}
              </div>
            ))}
          </>
        )}
      </div>
    );
  };

  /* ── FOLLOW-UP VIEW ── */
  const FollowupView = () => {
    const open = entries.filter(e=>e.follow_up&&e.status==="open");
    const done = entries.filter(e=>e.follow_up&&e.status==="done");
    return (
      <div>
        <div className="view-title">📌 Follow-up</div>
        <div className="fu-stats">
          <div className="stat-card"><div className="stat-num">{open.length}</div><div className="stat-label">Cần làm</div></div>
          <div className="stat-card"><div className="stat-num">{done.length}</div><div className="stat-label">Đã xong</div></div>
        </div>
        {open.length===0 && <div className="empty"><div className="ei">🎉</div><p>Không có việc gì cần làm!</p></div>}
        {open.length>0 && <>
          <div className="sec-title">Cần làm ({open.length})</div>
          {open.map(e=>(
            <div key={e.id} className={`entry-card ec-${e.type||"work"}`} onClick={()=>{setDetailEntry(e);setModal("detail")}}>
              <div className="entry-top">
                <span className="entry-time">{e.date} {e.time||""}</span>
                <span className="entry-title">{e.title}</span>
              </div>
              <div className="dv-followup" style={{marginTop:6}}>📌 {e.follow_up}</div>
              <div style={{marginTop:8}} onClick={ev=>ev.stopPropagation()}>
                <button style={{fontSize:12,padding:"4px 12px",borderRadius:20,background:"rgba(39,174,96,.15)",color:"var(--green)",border:"none"}} onClick={()=>markDone(e.id)}>✓ Mark done</button>
              </div>
            </div>
          ))}
        </>}
      </div>
    );
  };

  /* ── ENTRY MODAL ── */
  const EntryModal = () => (
    <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)setModal(null)}}>
      <div className="modal">
        <div className="modal-handle"/>
        <div className="modal-header">
          <div className="modal-title">{formMode==="add"?"➕ Ghi nhanh":"✏️ Sửa bản ghi"}</div>
          <button className="modal-close" onClick={()=>setModal(null)}>✕</button>
        </div>
        <div className="modal-body">
          <div className="field-group">
            <div className="field-label">Tiêu đề *</div>
            <input ref={titleRef} className="field-input" placeholder="Hôm nay làm gì?" value={form.title||""} onChange={e=>setF("title",e.target.value)}/>
          </div>
          <div className="field-group">
            <div className="field-label">Nội dung</div>
            <textarea className="field-input" placeholder="Chi tiết…" value={form.content||""} onChange={e=>setF("content",e.target.value)}/>
          </div>
          <div className="field-row field-group">
            <div>
              <div className="field-label">Ngày</div>
              <input type="date" className="field-input" value={form.date||""} onChange={e=>setF("date",e.target.value)}/>
            </div>
            <div>
              <div className="field-label">Giờ</div>
              <input type="time" className="field-input" value={form.time||""} onChange={e=>{setF("time",e.target.value);setF("session",autoSession(e.target.value));}}/>
            </div>
          </div>
          <div className="field-row-3 field-group">
            <div>
              <div className="field-label">Phiên</div>
              <select className="field-input" value={form.session||"morning"} onChange={e=>setF("session",e.target.value)}>
                <option value="morning">☀️ Sáng</option>
                <option value="evening">🌙 Tối</option>
              </select>
            </div>
            <div>
              <div className="field-label">Loại</div>
              <select className="field-input" value={form.type||"work"} onChange={e=>setF("type",e.target.value)}>
                {TYPE_OPTS.map(t=><option key={t.v} value={t.v}>{t.l}</option>)}
              </select>
            </div>
            <div>
              <div className="field-label">Trạng thái</div>
              <select className="field-input" value={form.status||"open"} onChange={e=>setF("status",e.target.value)}>
                <option value="open">🔴 Open</option>
                <option value="done">✅ Done</option>
              </select>
            </div>
          </div>

          {/* Mood */}
          <div className="field-group">
            <div className="field-label">Tâm trạng</div>
            <div className="mood-grid">
              {MOOD_LIST.map(m=>(
                <button key={m.v} className={`mood-btn${formMood===m.v?" selected":""}`} onClick={()=>setFormMood(formMood===m.v?null:m.v)}>
                  {m.e}<span className="ml">{m.l}</span>
                </button>
              ))}
            </div>
          </div>

          {/* People */}
          <div className="field-group">
            <div className="field-label">Người liên quan</div>
            <div className="people-picker">
              <div className="people-input-wrap" onClick={()=>document.getElementById("people-input")?.focus()}>
                {formPeople.map(p=>(
                  <span key={p.contact_id} className="people-chip">
                    {p.name}<span className="pc-remove" onClick={()=>removePerson(p.contact_id)}>✕</span>
                  </span>
                ))}
                <input id="people-input" placeholder="Tìm người…" value={peopleSearch}
                  onChange={e=>{setPeopleSearch(e.target.value);setShowPDD(true)}}
                  onFocus={()=>setShowPDD(true)}
                  onBlur={()=>setTimeout(()=>setShowPDD(false),150)}/>
              </div>
              {showPDD && filteredContacts.length>0 && (
                <div className="people-dropdown">
                  {filteredContacts.map(c=>(
                    <div key={c.id} className="pdi" onMouseDown={()=>addPerson(c)}>
                      <div className="pdi-av">{avatarLetter(c.name)}</div>
                      {c.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Tags */}
          <div className="field-group">
            <div className="field-label">Tags (Enter để thêm)</div>
            <div className="tags-wrap" onClick={()=>document.getElementById("tag-input")?.focus()}>
              {formTags.map(t=>(
                <span key={t} className="tag-chip">{t}<span className="tc-remove" onClick={()=>setFormTags(p=>p.filter(x=>x!==t))}>✕</span></span>
              ))}
              <input id="tag-input" placeholder="#tag…" value={tagInput}
                onChange={e=>setTagInput(e.target.value)}
                onKeyDown={e=>{
                  if(e.key==="Enter"||e.key===","){e.preventDefault();addTag(tagInput);setTagInput("");}
                  if(e.key==="Backspace"&&!tagInput&&formTags.length){setFormTags(p=>p.slice(0,-1));}
                }}/>
            </div>
          </div>

          {/* Follow-up */}
          <div className="field-group">
            <div className="field-label">Follow-up</div>
            <input className="field-input" placeholder="Cần làm gì sau…" value={form.follow_up||""} onChange={e=>setF("follow_up",e.target.value)}/>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={()=>setModal(null)}>Hủy</button>
          <button className="btn btn-primary" onClick={saveForm}>💾 Lưu</button>
        </div>
      </div>
    </div>
  );

  /* ── DETAIL MODAL ── */
  const DetailModal = () => {
    if (!detailEntry) return null;
    const e = detailEntry;
    const people = Array.isArray(e.people)?e.people:[];
    const tags   = Array.isArray(e.tags)?e.tags:[];
    return (
      <div className="modal-overlay" onClick={ev=>{if(ev.target===ev.currentTarget)setModal(null)}}>
        <div className="modal">
          <div className="modal-handle"/>
          <div className="modal-header">
            <div className="modal-title">{e.title}</div>
            <button className="modal-close" onClick={()=>setModal(null)}>✕</button>
          </div>
          <div className="modal-body">
            <div className="detail-sec">
              <div className="dl">Thời gian</div>
              <div className="dv">{fmtDate(e.date)} {e.time||""} — {e.session==="morning"?"☀️ Sáng":"🌙 Tối"}</div>
            </div>
            {e.content && <div className="detail-sec">
              <div className="dl">Nội dung</div>
              <div className="dv" style={{whiteSpace:"pre-wrap"}}>{e.content}</div>
            </div>}
            <div className="detail-sec">
              <div className="dl">Loại & Tâm trạng</div>
              <div className="dv" style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
                <span className={`chip chip-${e.type}`}>{TYPE_OPTS.find(t=>t.v===e.type)?.l||e.type}</span>
                {e.mood && <span className="chip">{MOOD_MAP[e.mood]} {e.mood}</span>}
                <span className="chip">{e.status==="done"?"✅ Done":"🔴 Open"}</span>
              </div>
            </div>
            {people.length>0 && <div className="detail-sec">
              <div className="dl">Gặp ai</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {people.map(p=><span key={p.contact_id} className="chip chip-person" onClick={()=>{setPersonFilter({id:p.contact_id,name:p.name});setModal(null);setActiveTab("people")}}>👤 {p.name}</span>)}
              </div>
            </div>}
            {tags.length>0 && <div className="detail-sec">
              <div className="dl">Tags</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {tags.map(t=><span key={t} className="chip chip-tag">#{t}</span>)}
              </div>
            </div>}
            {e.follow_up && <div className="detail-sec">
              <div className="dl">Follow-up</div>
              <div className="dv-followup">📌 {e.follow_up}</div>
            </div>}

            {/* AI Summary */}
            {e._summary && (
              <div className="ai-box">
                <div className="ai-box-title">✨ AI Tóm tắt</div>
                {e._summary.highlight && <div className="ai-highlight">{e._summary.highlight}</div>}
                {(e._summary.points||[]).map((p,i)=>(
                  <div key={i} className="ai-point">
                    <div className="ai-pt-num">{i+1}</div>
                    <div className="ai-pt-text">{p}</div>
                  </div>
                ))}
              </div>
            )}
            {!e._summary && (
              <button onClick={()=>summarizeEntry(e)} disabled={aiLoading}
                style={{width:"100%",marginTop:12,padding:"10px",borderRadius:"var(--r-sm)",background:"rgba(192,57,43,.1)",color:"var(--accent)",border:"1px solid rgba(192,57,43,.25)",fontSize:14,fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                {aiLoading ? <><span style={{width:16,height:16,border:"2px solid var(--accent)",borderTopColor:"transparent",borderRadius:"50%",animation:"spin .8s linear infinite",display:"inline-block"}}/>Đang tóm tắt...</> : "✨ AI Tóm tắt bản ghi này"}
              </button>
            )}
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={()=>{ const id=e.id; setModal(null); setTimeout(()=>markDone(id,e.status==="done"?"open":"done"),50); }}>
              {e.status==="done"?"🔴 Mở lại":"✅ Mark Done"}
            </button>
            <button className="btn btn-primary" onClick={()=>{ setModal(null); setTimeout(()=>openEdit(e),50); }}>✏️ Sửa</button>
          </div>
        </div>
      </div>
    );
  };

  /* ── CONFIRM MODAL ── */
  const ConfirmModal = () => {
    if (!confirmData) return null;
    return (
      <div className="confirm-overlay">
        <div className="confirm-box">
          <div className="confirm-icon">{confirmData.icon}</div>
          <div className="confirm-title">{confirmData.title}</div>
          <div className="confirm-msg">{confirmData.msg}</div>
          <div className="confirm-actions">
            <button className="confirm-cancel" onClick={()=>setModal(null)}>Hủy</button>
            <button className="confirm-ok" onClick={()=>{setModal(null);confirmData.onOk();}}>OK</button>
          </div>
        </div>
      </div>
    );
  };

  /* ════ RENDER ════ */
  return (
    <>
      <style>{CSS}</style>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      {/* loading bar */}
      {loadingPct>0 && <div className="loading-bar" style={{width:`${loadingPct}%`}}/>}

      <div className="app">
        {/* HEADER */}
        <header className="header">
          <div className="header-logo">🐉 Daily<span>Log</span></div>
          <div className="header-actions">
            <span title="Sync status">
              <span className={`sync-dot${syncStatus==="offline"?" offline":syncStatus==="syncing"?" syncing":""}`}/>
              <span style={{fontSize:11,color:"var(--text3)"}}>{syncStatus}</span>
            </span>
            <button className="icon-btn" onClick={toggleTheme} title="Dark mode">{theme==="light"?"🌙":"☀️"}</button>
            <button className="icon-btn" onClick={exportData} title="Export">📤</button>
            <label className="icon-btn" title="Import" style={{cursor:"pointer"}}>
              📥<input type="file" accept=".json" style={{display:"none"}} onChange={e=>{if(e.target.files[0]){importData(e.target.files[0]);e.target.value=""}}}/>
            </label>
          </div>
        </header>

        {/* VIEWS */}
        <div className="views">
          <div className={`view${activeTab==="calendar"?" active":""}`}><CalendarView/></div>
          <div className={`view${activeTab==="search"?" active":""}`}><SearchView/></div>
          <div className={`view${activeTab==="people"?" active":""}`}><PeopleView/></div>
          <div className={`view${activeTab==="followup"?" active":""}`}><FollowupView/></div>
        </div>

        {/* TABS */}
        <nav className="tabs">
          {[
            {id:"calendar",icon:"📅",label:"Lịch"},
            {id:"search",  icon:"🔍",label:"Tìm"},
            {id:"people",  icon:"👥",label:"Người"},
            {id:"followup",icon:"📌",label:"Việc"},
          ].map(t=>(
            <button key={t.id} className={`tab-btn${activeTab===t.id?" active":""}`} onClick={()=>setActiveTab(t.id)}>
              <span className="ti">{t.icon}</span>{t.label}
            </button>
          ))}
        </nav>

        {/* FAB */}
        {activeTab==="calendar" && (
          <button className="fab" onClick={()=>openAdd(selectedDay)} title="Ghi nhanh (Ctrl+K)">+</button>
        )}
      </div>

      {/* MODALS */}
      {modal==="entry"   && <EntryModal/>}
      {modal==="detail"  && <DetailModal/>}
      {modal==="confirm" && <ConfirmModal/>}

      {/* TOAST */}
      <div className={`toast${toast?" show":""}`}>{toast}</div>
    </>
  );
}
