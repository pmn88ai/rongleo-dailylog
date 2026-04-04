// DailyJournal v3 — patched: focus fix, settings, supabase re-init, clean people, editor upgrade
import { useState, useEffect, useRef, useCallback, useMemo } from "react";

/* ══════════════════════════════════════════════════════════════
   CONSTANTS (stable, outside component → no re-creation)
═══════════════════════════════════════════════════════════════ */
const USER_ID   = "RongLeo";
const APP_ID    = "daily_log";
const LS_ENTRIES = `${APP_ID}_entries`;
const LS_CONFIG  = "app_config";

const DAYS_VI   = ["CN","T2","T3","T4","T5","T6","T7"];
const MONTHS_VI = ["Tháng 1","Tháng 2","Tháng 3","Tháng 4","Tháng 5","Tháng 6","Tháng 7","Tháng 8","Tháng 9","Tháng 10","Tháng 11","Tháng 12"];

const TYPE_OPTS = [
  { v:"work",     l:"💼 Công việc" },
  { v:"meeting",  l:"🤝 Cuộc gặp"  },
  { v:"learning", l:"📚 Học tập"   },
  { v:"personal", l:"🙂 Cá nhân"  },
];

const MOOD_LIST = [
  { v:"great",    e:"😄", l:"Tuyệt"  },
  { v:"good",     e:"😊", l:"Tốt"    },
  { v:"neutral",  e:"😐", l:"Bình"   },
  { v:"tired",    e:"😴", l:"Mệt"    },
  { v:"bad",      e:"😔", l:"Buồn"   },
  { v:"angry",    e:"😤", l:"Tức"    },
  { v:"love",     e:"🥰", l:"Yêu"    },
  { v:"strong",   e:"💪", l:"Mạnh"   },
  { v:"focus",    e:"🎯", l:"Focus"  },
  { v:"confused", e:"😵", l:"Rối"    },
];
const MOOD_MAP = Object.fromEntries(MOOD_LIST.map(m => [m.v, m.e]));
const DEFAULT_CONFIG = { sbUrl: "", sbKey: "", aiKey: "", aiEnabled: true };

/* ══════════════════════════════════════════════════════════════
   HELPERS (outside component)
═══════════════════════════════════════════════════════════════ */
const todayStr    = () => new Date().toISOString().slice(0, 10);
const nowTime     = () => new Date().toTimeString().slice(0, 5);
const autoSession = (t) => parseInt((t || nowTime()).slice(0, 2)) < 12 ? "morning" : "evening";
const uuid        = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`);
const fmtDate     = (s) => { if (!s) return ""; const d = new Date(s + "T00:00:00"); return `${DAYS_VI[d.getDay()]}, ${d.getDate()} ${MONTHS_VI[d.getMonth()]} ${d.getFullYear()}`; };
const isToday     = (s) => s === todayStr();
const clamp       = (v, mn, mx) => Math.max(mn, Math.min(mx, v));
const avatarLet   = (n) => (n || "?").charAt(0).toUpperCase();
const lsGet       = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
const lsSet       = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

/* ══════════════════════════════════════════════════════════════
   SUPABASE — lazy singleton, re-created when config changes
   [FIX] client is NOT created at module load time
═══════════════════════════════════════════════════════════════ */
let _sbClient = null;
let _sbCreds  = { url: "", key: "" };

function getSupabase(url, key) {
  if (!url || !key) return null;
  if (_sbClient && _sbCreds.url === url && _sbCreds.key === key) return _sbClient;
  try {
    if (!window.supabase) return null;
    _sbClient = window.supabase.createClient(url, key);
    _sbCreds  = { url, key };
    return _sbClient;
  } catch { return null; }
}

/* ══════════════════════════════════════════════════════════════
   CSS (outside component — never recreated)
═══════════════════════════════════════════════════════════════ */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#f5f4f0;--bg2:#edecea;--sur:#fff;--sur2:#f9f8f6;
  --bdr:#e2e0db;--tx:#1a1917;--tx2:#6b6760;--tx3:#a09d98;
  --ac:#c0392b;--ac2:#e74c3c;
  --mor:#e67e22;--eve:#6c5ce7;--grn:#27ae60;--yel:#f39c12;--blu:#2980b9;
  --sh:0 1px 3px rgba(0,0,0,.06),0 2px 8px rgba(0,0,0,.04);
  --sh-md:0 4px 16px rgba(0,0,0,.08),0 1px 4px rgba(0,0,0,.04);
  --sh-lg:0 12px 40px rgba(0,0,0,.12),0 4px 12px rgba(0,0,0,.06);
  --r:12px;--r-sm:8px;--r-lg:20px;
  --font:'Be Vietnam Pro',sans-serif;--mono:'JetBrains Mono',monospace;
}
[data-theme=dark]{
  --bg:#141312;--bg2:#1c1b19;--sur:#222120;--sur2:#2a2927;
  --bdr:#333230;--tx:#f0ede8;--tx2:#9a9690;--tx3:#5a5753;
}
body{font-family:var(--font);background:var(--bg);color:var(--tx);font-size:15px;line-height:1.5;-webkit-font-smoothing:antialiased}
button{font-family:var(--font);cursor:pointer;border:none;background:none}
input,textarea,select{font-family:var(--font)}
::-webkit-scrollbar{width:4px;height:4px}
::-webkit-scrollbar-thumb{background:var(--bdr);border-radius:2px}
.app{display:flex;flex-direction:column;height:100vh;max-width:600px;margin:0 auto}
.hdr{height:56px;background:var(--sur);border-bottom:1px solid var(--bdr);display:flex;align-items:center;padding:0 16px;gap:12px;flex-shrink:0;z-index:10}
.hdr-logo{font-size:20px;font-weight:700;color:var(--ac);letter-spacing:-.5px;flex:1}
.hdr-logo span{color:var(--tx);font-weight:300}
.hdr-actions{display:flex;gap:6px;align-items:center}
.icon-btn{width:34px;height:34px;border-radius:var(--r-sm);display:flex;align-items:center;justify-content:center;color:var(--tx2);font-size:17px;transition:background .15s,color .15s}
.icon-btn:hover{background:var(--bg2);color:var(--tx)}
.views{flex:1;overflow-y:auto;overflow-x:hidden;padding-bottom:74px}
.view{display:none;padding:16px}
.view.active{display:block;animation:fadeUp .2s ease}
@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
.tabs{height:64px;background:var(--sur);border-top:1px solid var(--bdr);display:flex;align-items:center;flex-shrink:0;z-index:10}
.tab-btn{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;height:100%;color:var(--tx3);font-size:10px;font-weight:500;transition:color .15s;position:relative}
.tab-btn .ti{font-size:19px;line-height:1}
.tab-btn.active{color:var(--ac)}
.tab-btn.active::before{content:'';position:absolute;top:0;left:20%;right:20%;height:2px;background:var(--ac);border-radius:0 0 2px 2px}
.fab{position:fixed;right:20px;bottom:80px;width:52px;height:52px;border-radius:50%;background:var(--ac);color:#fff;font-size:26px;display:flex;align-items:center;justify-content:center;box-shadow:var(--sh-md);transition:transform .15s,box-shadow .15s;z-index:20}
.fab:hover{transform:scale(1.06);box-shadow:var(--sh-lg)}
.fab:active{transform:scale(.96)}
@media(min-width:600px){.fab{right:calc(50% - 280px)}}
.cal-hdr{display:flex;align-items:center;gap:8px;margin-bottom:14px}
.cal-nav{width:32px;height:32px;border-radius:var(--r-sm);background:var(--sur);border:1px solid var(--bdr);color:var(--tx2);font-size:16px;display:flex;align-items:center;justify-content:center}
.cal-nav:hover{background:var(--bg2)}
.cal-title{flex:1;text-align:center;font-size:14px;font-weight:600}
.cal-toggle{display:flex;background:var(--bg2);border-radius:20px;padding:2px}
.cal-toggle button{padding:4px 12px;border-radius:18px;font-size:12px;font-weight:500;color:var(--tx2);transition:all .15s}
.cal-toggle button.active{background:var(--sur);color:var(--ac);box-shadow:var(--sh)}
.week-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:5px;margin-bottom:14px}
.week-day{background:var(--sur);border:1.5px solid var(--bdr);border-radius:var(--r);padding:10px 3px;text-align:center;cursor:pointer;transition:border-color .15s;min-height:76px;display:flex;flex-direction:column;align-items:center;gap:3px}
.week-day:hover{border-color:var(--ac)}
.week-day.today{border-color:var(--ac);background:rgba(192,57,43,.04)}
.week-day.selected{background:var(--ac);border-color:var(--ac)}
.week-day.selected .wd-nm,.week-day.selected .wd-n,.week-day.selected .wd-md{color:#fff!important}
.wd-nm{font-size:9.5px;color:var(--tx3);font-weight:600;letter-spacing:.4px}
.wd-n{font-size:17px;font-weight:700;color:var(--tx);line-height:1}
.week-day.today .wd-n{color:var(--ac)}
.wd-md{font-size:13px;min-height:16px}
.wd-dots{display:flex;gap:2px;justify-content:center;min-height:7px}
.wd-dot{width:4px;height:4px;border-radius:50%;background:var(--ac);opacity:.55}
.month-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:3px;margin-bottom:14px}
.mhdr{font-size:9.5px;font-weight:600;text-align:center;color:var(--tx3);padding:5px 0;letter-spacing:.5px}
.mday{background:var(--sur);border:1px solid var(--bdr);border-radius:var(--r-sm);padding:5px 3px;text-align:center;cursor:pointer;transition:border-color .15s;min-height:44px;display:flex;flex-direction:column;align-items:center;gap:2px}
.mday:hover{border-color:var(--ac)}
.mday.today{border-color:var(--ac);background:rgba(192,57,43,.04)}
.mday.selected{background:var(--ac);border-color:var(--ac)}
.mday.selected .md-n{color:#fff}
.mday.other{opacity:.3}
.mday.missed{background:rgba(243,156,18,.06);border-color:rgba(243,156,18,.3)}
.md-n{font-size:12px;font-weight:600;color:var(--tx)}
.mday.today .md-n{color:var(--ac)}
.mday.selected .md-n{color:#fff}
.md-md{font-size:11px;min-height:13px}
.md-dot{width:4px;height:4px;border-radius:50%;background:var(--ac);opacity:.7}
.missed-sec{margin-bottom:12px}
.missed-hdr{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.7px;color:var(--yel);margin-bottom:7px}
.missed-chips{display:flex;flex-wrap:wrap;gap:5px}
.missed-chip{padding:4px 11px;border-radius:20px;font-size:12px;background:rgba(243,156,18,.1);color:var(--yel);border:1px solid rgba(243,156,18,.3);cursor:pointer}
.missed-chip:hover{background:rgba(243,156,18,.2)}
.day-panel{background:var(--sur);border:1px solid var(--bdr);border-radius:var(--r);padding:13px 15px;margin-bottom:13px}
.dp-hdr{display:flex;align-items:center;gap:10px;margin-bottom:10px}
.dp-date{flex:1}
.dp-main{font-size:15px;font-weight:600}
.dp-sub{font-size:11px;color:var(--tx3);font-family:var(--mono)}
.dp-add{padding:6px 14px;border-radius:20px;background:var(--ac);color:#fff;font-size:12px;font-weight:600}
.dp-empty{color:var(--tx3);font-size:13px;text-align:center;padding:8px 0}
.sess-blk{margin-bottom:16px}
.sess-hdr{display:flex;align-items:center;gap:8px;padding:7px 12px;border-radius:var(--r-sm);margin-bottom:8px;font-size:13px;font-weight:600}
.s-mor{background:rgba(230,126,34,.1);color:var(--mor);border-left:3px solid var(--mor)}
.s-eve{background:rgba(108,92,231,.1);color:var(--eve);border-left:3px solid var(--eve)}
.s-cnt{margin-left:auto;font-size:11px;font-weight:400;opacity:.7}
.ec{background:var(--sur);border-radius:var(--r);padding:13px 15px;margin-bottom:8px;box-shadow:var(--sh);border:1px solid var(--bdr);cursor:pointer;transition:box-shadow .15s,transform .15s;position:relative;overflow:hidden}
.ec:hover{box-shadow:var(--sh-md);transform:translateY(-1px)}
.ec::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--bdr)}
.ec-work::before{background:var(--blu)}.ec-meeting::before{background:var(--grn)}.ec-learning::before{background:var(--yel)}.ec-personal::before{background:var(--tx3)}
.ec-done{opacity:.6}
.ec-top{display:flex;align-items:flex-start;gap:8px;margin-bottom:5px}
.ec-time{font-family:var(--mono);font-size:11px;color:var(--tx3);padding-top:2px;white-space:nowrap}
.ec-title{font-size:14px;font-weight:600;color:var(--tx);flex:1;line-height:1.4}
.ec-mood{font-size:16px;flex-shrink:0}
.ec-body{font-size:13px;color:var(--tx2);line-height:1.5;margin-bottom:7px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.ec-meta{display:flex;flex-wrap:wrap;gap:5px;align-items:center}
.ec-links{display:flex;flex-wrap:wrap;gap:5px;margin-top:5px}
.ec-link{font-size:11px;color:var(--blu);text-decoration:none;background:rgba(41,128,185,.08);padding:2px 8px;border-radius:12px;border:1px solid rgba(41,128,185,.2)}
.ec-link:hover{background:rgba(41,128,185,.15)}
.ea{display:flex;gap:5px;margin-left:auto}
.ea-btn{width:28px;height:28px;border-radius:var(--r-sm);background:var(--bg2);color:var(--tx2);font-size:13px;display:flex;align-items:center;justify-content:center;transition:background .15s,color .15s}
.ea-btn:hover{background:var(--bdr);color:var(--tx)}
.ea-done:hover{background:rgba(39,174,96,.15);color:var(--grn)}
.ea-del:hover{background:rgba(192,57,43,.15);color:var(--ac)}
.chip{display:inline-flex;align-items:center;gap:3px;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:500;background:var(--bg2);color:var(--tx2);border:1px solid var(--bdr);white-space:nowrap}
.chip-person{background:rgba(41,128,185,.1);color:var(--blu);border-color:rgba(41,128,185,.2);cursor:pointer}
.chip-person:hover{background:rgba(41,128,185,.2)}
.chip-tag{background:rgba(108,92,231,.1);color:var(--eve);border-color:rgba(108,92,231,.2)}
.chip-work{background:rgba(41,128,185,.1);color:var(--blu);border-color:rgba(41,128,185,.2)}
.chip-meeting{background:rgba(39,174,96,.1);color:var(--grn);border-color:rgba(39,174,96,.2)}
.chip-learning{background:rgba(243,156,18,.12);color:var(--yel);border-color:rgba(243,156,18,.25)}
.chip-personal{background:var(--bg2);color:var(--tx3)}
.chip-fu{background:rgba(243,156,18,.12);color:var(--yel);border-color:rgba(243,156,18,.25)}
.search-bar{display:flex;align-items:center;gap:10px;background:var(--sur);border:1px solid var(--bdr);border-radius:var(--r);padding:10px 14px;margin-bottom:10px;box-shadow:var(--sh)}
.search-bar input{flex:1;border:none;outline:none;background:none;color:var(--tx);font-size:14px}
.search-bar input::placeholder{color:var(--tx3)}
.filter-row{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:13px}
.filter-chip{padding:5px 12px;border-radius:20px;font-size:12px;font-weight:500;background:var(--sur);border:1px solid var(--bdr);color:var(--tx2);cursor:pointer;transition:all .15s}
.filter-chip:hover,.filter-chip.active{background:var(--ac);color:#fff;border-color:var(--ac)}
.ppl-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px;margin-bottom:14px}
.ppl-card{background:var(--sur);border:1px solid var(--bdr);border-radius:var(--r);padding:14px 10px;text-align:center;cursor:pointer;transition:box-shadow .15s,transform .15s;box-shadow:var(--sh)}
.ppl-card:hover{box-shadow:var(--sh-md);transform:translateY(-1px)}
.ppl-av{width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,var(--ac),var(--eve));color:#fff;font-size:17px;font-weight:700;display:flex;align-items:center;justify-content:center;margin:0 auto 8px}
.ppl-name{font-size:12px;font-weight:600;color:var(--tx);margin-bottom:2px}
.ppl-cnt{font-size:11px;color:var(--tx3)}
.ppl-banner{background:var(--sur);border:1px solid var(--bdr);border-radius:var(--r);padding:10px 14px;margin-bottom:12px;display:flex;align-items:center;gap:10px;font-size:13px;color:var(--tx2)}
.clr-btn{margin-left:auto;font-size:12px;color:var(--ac);font-weight:500;cursor:pointer;padding:3px 8px;border-radius:20px;border:1px solid var(--ac)}
.clr-btn:hover{background:var(--ac);color:#fff}
.fu-stats{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:13px}
.stat-card{background:var(--sur);border:1px solid var(--bdr);border-radius:var(--r);padding:14px;box-shadow:var(--sh);text-align:center}
.stat-n{font-size:28px;font-weight:700;color:var(--ac);font-family:var(--mono)}
.stat-l{font-size:11px;color:var(--tx3);margin-top:2px}
.sec-title{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.8px;color:var(--tx3);margin-bottom:9px;padding-left:2px}
.empty{text-align:center;padding:40px 20px;color:var(--tx3)}
.empty .ei{font-size:40px;margin-bottom:12px}
.view-title{font-size:18px;font-weight:700;margin-bottom:13px}
.ovl{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:100;display:flex;align-items:flex-end;backdrop-filter:blur(4px);animation:fadeIn .2s ease}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
.modal{background:var(--sur);border-radius:var(--r-lg) var(--r-lg) 0 0;width:100%;max-width:600px;margin:0 auto;max-height:92vh;overflow-y:auto;animation:slideUp .25s ease}
@keyframes slideUp{from{transform:translateY(40px);opacity:0}to{transform:translateY(0);opacity:1}}
.modal::-webkit-scrollbar{display:none}
.modal-handle{width:36px;height:4px;background:var(--bdr);border-radius:2px;margin:12px auto 0}
.modal-hdr{padding:14px 20px 10px;display:flex;align-items:center;justify-content:space-between}
.modal-title{font-size:16px;font-weight:700}
.modal-x{width:32px;height:32px;border-radius:var(--r-sm);background:var(--bg2);color:var(--tx2);display:flex;align-items:center;justify-content:center;font-size:18px}
.modal-x:hover{background:var(--bdr)}
.modal-body{padding:0 20px 12px}
.fgrp{margin-bottom:13px}
.flbl{font-size:12px;font-weight:600;color:var(--tx2);margin-bottom:5px}
.finp{width:100%;padding:10px 12px;background:var(--bg);border:1px solid var(--bdr);border-radius:var(--r-sm);color:var(--tx);font-size:14px;outline:none;transition:border-color .15s}
.finp:focus{border-color:var(--ac)}
textarea.finp{resize:vertical;min-height:120px;line-height:1.6}
.frow{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.frow3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}
select.finp{cursor:pointer}
.mood-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:5px}
.mood-btn{display:flex;flex-direction:column;align-items:center;gap:3px;padding:8px 4px;border-radius:var(--r-sm);border:1px solid var(--bdr);background:var(--bg);cursor:pointer;transition:all .15s;font-size:19px}
.mood-btn .ml{font-size:9px;color:var(--tx3);font-family:var(--mono)}
.mood-btn:hover{border-color:var(--tx3);background:var(--bg2)}
.mood-btn.selected{border-color:var(--ac);background:rgba(192,57,43,.08)}
.ppl-picker{position:relative}
.ppl-wrap{display:flex;flex-wrap:wrap;gap:5px;align-items:center;min-height:42px;background:var(--bg);border:1px solid var(--bdr);border-radius:var(--r-sm);padding:7px 10px;cursor:text;transition:border-color .15s}
.ppl-wrap:focus-within{border-color:var(--ac)}
.ppl-wrap input{border:none;background:none;outline:none;color:var(--tx);font-size:13px;padding:0;min-width:80px;flex:1}
.ppl-chip{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:20px;font-size:12px;background:rgba(41,128,185,.12);color:var(--blu);border:1px solid rgba(41,128,185,.25)}
.pc-x{cursor:pointer;font-size:14px;opacity:.7}
.pc-x:hover{opacity:1}
.ppl-dd{position:absolute;top:calc(100% + 4px);left:0;right:0;background:var(--sur);border:1px solid var(--bdr);border-radius:var(--r-sm);box-shadow:var(--sh-md);max-height:180px;overflow-y:auto;z-index:50}
.pdi{padding:9px 14px;font-size:13px;color:var(--tx);cursor:pointer;display:flex;align-items:center;gap:8px;transition:background .1s}
.pdi:hover{background:var(--bg2)}
.pdi-av{width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,var(--ac),var(--eve));color:#fff;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.tags-wrap{display:flex;flex-wrap:wrap;gap:5px;align-items:center;min-height:42px;background:var(--bg);border:1px solid var(--bdr);border-radius:var(--r-sm);padding:7px 10px;cursor:text;transition:border-color .15s}
.tags-wrap:focus-within{border-color:var(--ac)}
.tags-wrap input{border:none;background:none;outline:none;color:var(--tx);font-size:13px;padding:0;min-width:80px;flex:1}
.tag-chip{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:20px;font-size:12px;background:rgba(108,92,231,.1);color:var(--eve);border:1px solid rgba(108,92,231,.2)}
.tc-x{cursor:pointer;font-size:14px;opacity:.7}
.links-list{display:flex;flex-direction:column;gap:5px;margin-bottom:6px}
.link-row{display:flex;align-items:center;gap:6px}
.link-inp{flex:1;padding:8px 10px;background:var(--bg);border:1px solid var(--bdr);border-radius:var(--r-sm);color:var(--tx);font-size:13px;outline:none}
.link-inp:focus{border-color:var(--ac)}
.link-add-btn{padding:7px 12px;border-radius:var(--r-sm);background:rgba(41,128,185,.1);color:var(--blu);border:1px solid rgba(41,128,185,.25);font-size:12px;font-weight:600}
.link-add-btn:hover{background:rgba(41,128,185,.2)}
.link-del-btn{width:28px;height:28px;border-radius:var(--r-sm);background:var(--bg2);color:var(--tx3);font-size:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.link-del-btn:hover{background:rgba(192,57,43,.12);color:var(--ac)}
.modal-foot{padding:10px 20px 24px;display:flex;gap:10px}
.btn{flex:1;padding:12px;border-radius:var(--r-sm);font-size:14px;font-weight:600;transition:all .15s}
.btn-pri{background:var(--ac);color:#fff}
.btn-pri:hover{background:var(--ac2)}
.btn-sec{background:var(--bg2);color:var(--tx2);border:1px solid var(--bdr)}
.btn-sec:hover{background:var(--bdr);color:var(--tx)}
.det-sec{margin-bottom:12px}
.dl{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:var(--tx3);margin-bottom:4px}
.dv{font-size:14px;color:var(--tx);line-height:1.6}
.dv-fu{background:rgba(243,156,18,.1);border:1px solid rgba(243,156,18,.25);border-radius:var(--r-sm);padding:10px 12px;font-size:13px;color:var(--yel)}
.ai-box{background:linear-gradient(135deg,rgba(192,57,43,.05),rgba(108,92,231,.05));border:1px solid rgba(192,57,43,.18);border-radius:var(--r);padding:14px 16px;margin-top:14px}
.ai-ttl{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--ac);margin-bottom:10px}
.ai-hl{font-size:14px;color:var(--tx);font-style:italic;border-left:3px solid var(--ac);padding-left:12px;margin-bottom:10px;line-height:1.6}
.ai-pt{display:flex;gap:8px;align-items:flex-start;margin-bottom:6px}
.ai-pt-n{width:20px;height:20px;border-radius:6px;background:rgba(192,57,43,.12);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--ac);flex-shrink:0;margin-top:1px}
.ai-pt-t{font-size:13px;line-height:1.55;color:var(--tx2)}
.toast{position:fixed;bottom:84px;left:50%;transform:translateX(-50%) translateY(20px);background:var(--tx);color:var(--bg);padding:9px 18px;border-radius:24px;font-size:13px;font-weight:500;opacity:0;transition:all .25s;pointer-events:none;z-index:200;white-space:nowrap;max-width:calc(100vw - 40px)}
.toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
.sync-dot{width:6px;height:6px;border-radius:50%;background:var(--grn);display:inline-block;margin-right:4px}
.sync-dot.off{background:var(--tx3)}
.sync-dot.sync{background:var(--yel);animation:pulse .8s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
.cfm-ovl{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:300;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)}
.cfm-box{background:var(--sur);border-radius:var(--r-lg);padding:24px 20px 20px;width:100%;max-width:300px;box-shadow:var(--sh-lg);text-align:center}
.cfm-ico{font-size:36px;margin-bottom:10px}
.cfm-ttl{font-size:16px;font-weight:700;margin-bottom:6px}
.cfm-msg{font-size:13px;color:var(--tx2);margin-bottom:20px;line-height:1.5}
.cfm-acts{display:flex;gap:10px}
.cfm-cancel{flex:1;padding:11px;border-radius:var(--r-sm);font-size:14px;font-weight:600;background:var(--bg2);color:var(--tx2);border:1px solid var(--bdr);cursor:pointer}
.cfm-ok{flex:1;padding:11px;border-radius:var(--r-sm);font-size:14px;font-weight:600;background:var(--ac);color:#fff;border:none;cursor:pointer}
.load-bar{height:2px;background:var(--ac);position:fixed;top:0;left:0;z-index:999;transition:width .3s ease}
.set-sec{background:var(--sur);border:1px solid var(--bdr);border-radius:var(--r);padding:16px;margin-bottom:14px}
.set-sec-ttl{font-size:13px;font-weight:700;color:var(--tx);margin-bottom:12px;display:flex;align-items:center;gap:6px}
.conn-badge{display:inline-flex;align-items:center;gap:5px;padding:5px 12px;border-radius:20px;font-size:12px;font-weight:600}
.conn-ok{background:rgba(39,174,96,.1);color:var(--grn);border:1px solid rgba(39,174,96,.2)}
.conn-fail{background:rgba(192,57,43,.1);color:var(--ac);border:1px solid rgba(192,57,43,.2)}
.conn-test{padding:9px 14px;border-radius:var(--r-sm);background:rgba(41,128,185,.1);color:var(--blu);border:1px solid rgba(41,128,185,.25);font-size:13px;font-weight:600}
.conn-test:hover{background:rgba(41,128,185,.2)}
.toggle-row{display:flex;align-items:center;justify-content:space-between;padding:8px 0}
.toggle-lbl{font-size:14px;color:var(--tx)}
.tgl{position:relative;width:40px;height:22px;flex-shrink:0}
.tgl input{opacity:0;width:0;height:0;position:absolute}
.tgl-sl{position:absolute;inset:0;background:var(--bdr);border-radius:11px;cursor:pointer;transition:background .2s}
.tgl input:checked + .tgl-sl{background:var(--ac)}
.tgl-sl::after{content:'';position:absolute;width:16px;height:16px;border-radius:50%;background:#fff;top:3px;left:3px;transition:transform .2s}
.tgl input:checked + .tgl-sl::after{transform:translateX(18px)}
@media(min-width:600px){.modal{border-radius:var(--r-lg);margin:auto;margin-bottom:20px}.ovl{align-items:center}}
@keyframes spin{to{transform:rotate(360deg)}}
`;

/* ══════════════════════════════════════════════════════════════
   SUB-COMPONENTS — DEFINED OUTSIDE MAIN COMPONENT
   ❗ This is the critical fix for input focus loss.
   Components defined inside parent = new type each render
   → React unmounts + remounts → focus destroyed.
   Defined outside = stable reference = no unmount.
═══════════════════════════════════════════════════════════════ */

function EntryCard({ entry, showDate, onOpen, onEdit, onDelete, onDone, onDuplicate, onPersonClick }) {
  const people = Array.isArray(entry.people) ? entry.people : [];
  const tags   = Array.isArray(entry.tags)   ? entry.tags   : [];
  const links  = Array.isArray(entry.links)  ? entry.links  : [];
  const hostname = (url) => { try { return new URL(url).hostname; } catch { return url.slice(0, 28); } };
  return (
    <div className={`ec ec-${entry.type || "work"}${entry.status === "done" ? " ec-done" : ""}`}
         onClick={() => onOpen(entry)}>
      {showDate && <div style={{fontSize:11,color:"var(--tx3)",marginBottom:6,fontFamily:"var(--mono)"}}>{fmtDate(entry.date)}</div>}
      <div className="ec-top">
        <span className="ec-time">{entry.time || "--:--"}</span>
        <span className="ec-title">{entry.title}</span>
        {entry.mood && <span className="ec-mood">{MOOD_MAP[entry.mood]}</span>}
      </div>
      {entry.content && <div className="ec-body">{entry.content}</div>}
      <div className="ec-meta">
        <span className={`chip chip-${entry.type || "work"}`}>
          {TYPE_OPTS.find(t => t.v === entry.type)?.l || entry.type}
        </span>
        {people.slice(0, 2).map(p => (
          <span key={p.contact_id} className="chip chip-person"
            onClick={e => { e.stopPropagation(); onPersonClick(p); }}>👤 {p.name}</span>
        ))}
        {tags.slice(0, 2).map(t => <span key={t} className="chip chip-tag">#{t}</span>)}
        {entry.follow_up && entry.status === "open" && <span className="chip chip-fu">📌</span>}
        <div className="ea" onClick={e => e.stopPropagation()}>
          {entry.status !== "done" && <button className="ea-btn ea-done" onClick={() => onDone(entry)}>✓</button>}
          <button className="ea-btn" onClick={() => onDuplicate(entry.id)}>📄</button>
          <button className="ea-btn" onClick={() => onEdit(entry)}>✏️</button>
          <button className="ea-btn ea-del" onClick={() => onDelete(entry.id)}>🗑</button>
        </div>
      </div>
      {links.filter(Boolean).length > 0 && (
        <div className="ec-links" onClick={e => e.stopPropagation()}>
          {links.filter(Boolean).map((l, i) => (
            <a key={i} href={l} target="_blank" rel="noopener noreferrer" className="ec-link">🔗 {hostname(l)}</a>
          ))}
        </div>
      )}
    </div>
  );
}

function EntryModal({
  formMode,
  formTitle,    setFormTitle,
  formContent,  setFormContent,
  formDate,     setFormDate,
  formTime,     setFormTime,
  formSession,  setFormSession,
  formType,     setFormType,
  formStatus,   setFormStatus,
  formFollowUp, setFormFollowUp,
  formMood,     setFormMood,
  formPeople,   setFormPeople,
  formTags,     setFormTags,
  formLinks,    setFormLinks,
  contacts,
  onClose, onSave,
}) {
  const titleRef            = useRef(null);
  const [pSearch, setPSearch] = useState("");
  const [showPDD, setShowPDD] = useState(false);
  const [tagInp,  setTagInp]  = useState("");
  const [linkInp, setLinkInp] = useState("");

  useEffect(() => { setTimeout(() => titleRef.current?.focus(), 280); }, []);

  const handleTimeChange = (v) => { setFormTime(v); setFormSession(autoSession(v)); };

  const filteredC = contacts.filter(c =>
    c.name.toLowerCase().includes(pSearch.toLowerCase()) &&
    !formPeople.find(p => p.contact_id === c.id)
  );

  const addPerson = (c) => {
    setFormPeople(prev => [...prev, { contact_id: c.id, name: c.name }]);
    setPSearch(""); setShowPDD(false);
  };
  const addNewPerson = (name) => {
    const id = `tmp_${uuid()}`;
    setFormPeople(prev => [...prev, { contact_id: id, name }]);
    setPSearch(""); setShowPDD(false);
  };
  const remPerson = (id) => setFormPeople(prev => prev.filter(x => x.contact_id !== id));

  const addTag = (v) => {
    const t = v.trim().replace(/^#/, "");
    if (t && !formTags.includes(t)) setFormTags(prev => [...prev, t]);
  };

  const addLink = () => {
    const v = linkInp.trim();
    if (v) { setFormLinks(prev => [...prev, v]); setLinkInp(""); }
  };

  return (
    <div className="ovl" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-handle" />
        <div className="modal-hdr">
          <div className="modal-title">{formMode === "add" ? "➕ Ghi nhanh" : "✏️ Sửa bản ghi"}</div>
          <button className="modal-x" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">

          <div className="fgrp">
            <div className="flbl">Tiêu đề *</div>
            <input ref={titleRef} className="finp" placeholder="Hôm nay làm gì?"
              value={formTitle} onChange={e => setFormTitle(e.target.value)} />
          </div>

          <div className="fgrp">
            <div className="flbl">Nội dung</div>
            <textarea className="finp" placeholder="Chi tiết…"
              value={formContent} onChange={e => setFormContent(e.target.value)} />
          </div>

          <div className="frow fgrp">
            <div>
              <div className="flbl">Ngày</div>
              <input type="date" className="finp" value={formDate}
                onChange={e => setFormDate(e.target.value)} />
            </div>
            <div>
              <div className="flbl">Giờ</div>
              <input type="time" className="finp" value={formTime}
                onChange={e => handleTimeChange(e.target.value)} />
            </div>
          </div>

          <div className="frow3 fgrp">
            <div>
              <div className="flbl">Phiên</div>
              <select className="finp" value={formSession} onChange={e => setFormSession(e.target.value)}>
                <option value="morning">☀️ Sáng</option>
                <option value="evening">🌙 Tối</option>
              </select>
            </div>
            <div>
              <div className="flbl">Loại</div>
              <select className="finp" value={formType} onChange={e => setFormType(e.target.value)}>
                {TYPE_OPTS.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
              </select>
            </div>
            <div>
              <div className="flbl">Trạng thái</div>
              <select className="finp" value={formStatus} onChange={e => setFormStatus(e.target.value)}>
                <option value="open">🔴 Open</option>
                <option value="done">✅ Done</option>
              </select>
            </div>
          </div>

          <div className="fgrp">
            <div className="flbl">Tâm trạng</div>
            <div className="mood-grid">
              {MOOD_LIST.map(m => (
                <button key={m.v} className={`mood-btn${formMood === m.v ? " selected" : ""}`}
                  onClick={() => setFormMood(formMood === m.v ? null : m.v)}>
                  {m.e}<span className="ml">{m.l}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="fgrp">
            <div className="flbl">Người liên quan</div>
            <div className="ppl-picker">
              <div className="ppl-wrap" onClick={() => document.getElementById("_ppl_inp")?.focus()}>
                {formPeople.map(p => (
                  <span key={p.contact_id} className="ppl-chip">
                    {p.name}<span className="pc-x" onClick={() => remPerson(p.contact_id)}>✕</span>
                  </span>
                ))}
                <input id="_ppl_inp" placeholder="Tìm hoặc thêm tên…"
                  value={pSearch}
                  onChange={e => { setPSearch(e.target.value); setShowPDD(true); }}
                  onFocus={() => setShowPDD(true)}
                  onBlur={() => setTimeout(() => setShowPDD(false), 150)} />
              </div>
              {showPDD && (
                <div className="ppl-dd">
                  {filteredC.map(c => (
                    <div key={c.id} className="pdi" onMouseDown={() => addPerson(c)}>
                      <div className="pdi-av">{avatarLet(c.name)}</div>{c.name}
                    </div>
                  ))}
                  {pSearch.trim() && !filteredC.find(c => c.name.toLowerCase() === pSearch.trim().toLowerCase()) && (
                    <div className="pdi" onMouseDown={() => addNewPerson(pSearch.trim())}>
                      <div className="pdi-av">+</div>Thêm "{pSearch.trim()}"
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="fgrp">
            <div className="flbl">Tags (Enter để thêm)</div>
            <div className="tags-wrap" onClick={() => document.getElementById("_tag_inp")?.focus()}>
              {formTags.map(t => (
                <span key={t} className="tag-chip">{t}
                  <span className="tc-x" onClick={() => setFormTags(prev => prev.filter(x => x !== t))}>✕</span>
                </span>
              ))}
              <input id="_tag_inp" placeholder="#tag…"
                value={tagInp}
                onChange={e => setTagInp(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(tagInp); setTagInp(""); }
                  if (e.key === "Backspace" && !tagInp && formTags.length) setFormTags(prev => prev.slice(0, -1));
                }} />
            </div>
          </div>

          <div className="fgrp">
            <div className="flbl">Links</div>
            {formLinks.length > 0 && (
              <div className="links-list">
                {formLinks.map((l, i) => (
                  <div key={i} className="link-row">
                    <input className="link-inp" placeholder="https://…" value={l}
                      onChange={e => { const c = [...formLinks]; c[i] = e.target.value; setFormLinks(c); }} />
                    <button className="link-del-btn" onClick={() => setFormLinks(prev => prev.filter((_, j) => j !== i))}>✕</button>
                  </div>
                ))}
              </div>
            )}
            <div className="link-row">
              <input className="link-inp" placeholder="https://…" value={linkInp}
                onChange={e => setLinkInp(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addLink(); } }} />
              <button className="link-add-btn" onClick={addLink}>+ Thêm link</button>
            </div>
          </div>

          <div className="fgrp">
            <div className="flbl">Follow-up</div>
            <input className="finp" placeholder="Cần làm gì sau…"
              value={formFollowUp} onChange={e => setFormFollowUp(e.target.value)} />
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-sec" onClick={onClose}>Hủy</button>
          <button className="btn btn-pri" onClick={onSave}>💾 Lưu</button>
        </div>
      </div>
    </div>
  );
}

function DetailModal({ entry, aiLoading, onClose, onEdit, onDone, onSummarize }) {
  if (!entry) return null;
  const people = Array.isArray(entry.people) ? entry.people : [];
  const tags   = Array.isArray(entry.tags)   ? entry.tags   : [];
  const links  = Array.isArray(entry.links)  ? entry.links  : [];
  const hostname = (url) => { try { return new URL(url).hostname; } catch { return url.slice(0, 28); } };
  return (
    <div className="ovl" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-handle" />
        <div className="modal-hdr">
          <div className="modal-title">{entry.title}</div>
          <button className="modal-x" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="det-sec">
            <div className="dl">Thời gian</div>
            <div className="dv">{fmtDate(entry.date)} {entry.time || ""} — {entry.session === "morning" ? "☀️ Sáng" : "🌙 Tối"}</div>
          </div>
          {entry.content && (
            <div className="det-sec">
              <div className="dl">Nội dung</div>
              <div className="dv" style={{ whiteSpace:"pre-wrap" }}>{entry.content}</div>
            </div>
          )}
          <div className="det-sec">
            <div className="dl">Loại & Tâm trạng</div>
            <div style={{ display:"flex",gap:6,flexWrap:"wrap",alignItems:"center" }}>
              <span className={`chip chip-${entry.type}`}>{TYPE_OPTS.find(t=>t.v===entry.type)?.l||entry.type}</span>
              {entry.mood && <span className="chip">{MOOD_MAP[entry.mood]} {entry.mood}</span>}
              <span className="chip">{entry.status==="done"?"✅ Done":"🔴 Open"}</span>
            </div>
          </div>
          {people.length > 0 && (
            <div className="det-sec">
              <div className="dl">Gặp ai</div>
              <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>
                {people.map(p => <span key={p.contact_id} className="chip chip-person">👤 {p.name}</span>)}
              </div>
            </div>
          )}
          {tags.length > 0 && (
            <div className="det-sec">
              <div className="dl">Tags</div>
              <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>
                {tags.map(t => <span key={t} className="chip chip-tag">#{t}</span>)}
              </div>
            </div>
          )}
          {links.filter(Boolean).length > 0 && (
            <div className="det-sec">
              <div className="dl">Links</div>
              <div style={{ display:"flex",flexWrap:"wrap",gap:6 }}>
                {links.filter(Boolean).map((l, i) => (
                  <a key={i} href={l} target="_blank" rel="noopener noreferrer" className="ec-link">🔗 {hostname(l)}</a>
                ))}
              </div>
            </div>
          )}
          {entry.follow_up && (
            <div className="det-sec">
              <div className="dl">Follow-up</div>
              <div className="dv-fu">📌 {entry.follow_up}</div>
            </div>
          )}
          {entry._summary && (
            <div className="ai-box">
              <div className="ai-ttl">✨ AI Tóm tắt</div>
              {entry._summary.highlight && <div className="ai-hl">{entry._summary.highlight}</div>}
              {(entry._summary.points || []).map((p, i) => (
                <div key={i} className="ai-pt">
                  <div className="ai-pt-n">{i+1}</div>
                  <div className="ai-pt-t">{p}</div>
                </div>
              ))}
            </div>
          )}
          {!entry._summary && (
            <button onClick={() => onSummarize(entry)} disabled={aiLoading}
              style={{ width:"100%",marginTop:12,padding:"10px",borderRadius:"var(--r-sm)",background:"rgba(192,57,43,.1)",color:"var(--ac)",border:"1px solid rgba(192,57,43,.25)",fontSize:14,fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",gap:8,cursor:aiLoading?"not-allowed":"pointer" }}>
              {aiLoading
                ? <><span style={{width:16,height:16,border:"2px solid var(--ac)",borderTopColor:"transparent",borderRadius:"50%",animation:"spin .8s linear infinite",display:"inline-block"}}/>Đang tóm tắt...</>
                : "✨ AI Tóm tắt bản ghi này"}
            </button>
          )}
        </div>
        <div className="modal-foot">
          <button className="btn btn-sec" onClick={() => { onDone(entry); onClose(); }}>
            {entry.status === "done" ? "🔴 Mở lại" : "✅ Mark Done"}
          </button>
          <button className="btn btn-pri" onClick={() => { onClose(); setTimeout(() => onEdit(entry), 40); }}>✏️ Sửa</button>
        </div>
      </div>
    </div>
  );
}

function ConfirmModal({ data, onClose }) {
  if (!data) return null;
  return (
    <div className="cfm-ovl">
      <div className="cfm-box">
        <div className="cfm-ico">{data.icon}</div>
        <div className="cfm-ttl">{data.title}</div>
        <div className="cfm-msg">{data.msg}</div>
        <div className="cfm-acts">
          <button className="cfm-cancel" onClick={onClose}>Hủy</button>
          <button className="cfm-ok" onClick={() => { onClose(); data.onOk(); }}>OK</button>
        </div>
      </div>
    </div>
  );
}

function SettingsView({ config, onSave }) {
  const [url,     setUrl]     = useState(config.sbUrl  || "");
  const [key,     setKey]     = useState(config.sbKey  || "");
  const [aiKey,   setAiKey]   = useState(config.aiKey  || "");
  const [aiOn,    setAiOn]    = useState(config.aiEnabled !== false);
  const [conn,    setConn]    = useState(null);
  const [testing, setTesting] = useState(false);

  const testConn = async () => {
    if (!url || !key) { setConn("fail"); return; }
    setTesting(true); setConn(null);
    try {
      if (!window.supabase) throw new Error();
      const sb = window.supabase.createClient(url, key);
      const { error } = await sb.from("daily_logs").select("id").limit(1);
      setConn(error ? "fail" : "ok");
    } catch { setConn("fail"); }
    setTesting(false);
  };

  return (
    <div>
      <div className="view-title">⚙️ Cài đặt</div>

      <div className="set-sec">
        <div className="set-sec-ttl">🗄️ Supabase</div>
        <div className="fgrp">
          <div className="flbl">Project URL</div>
          <input className="finp" placeholder="https://xxxx.supabase.co" value={url} onChange={e => setUrl(e.target.value)} />
        </div>
        <div className="fgrp">
          <div className="flbl">Anon Key</div>
          <input className="finp" placeholder="eyJhbGci…" type="password" value={key} onChange={e => setKey(e.target.value)} />
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:10,flexWrap:"wrap" }}>
          <button className="conn-test" onClick={testConn} disabled={testing}>{testing ? "Testing…" : "🔌 Test kết nối"}</button>
          {conn === "ok"   && <span className="conn-badge conn-ok">✅ Kết nối OK</span>}
          {conn === "fail" && <span className="conn-badge conn-fail">❌ Thất bại</span>}
        </div>
      </div>

      <div className="set-sec">
        <div className="set-sec-ttl">✨ AI (Anthropic)</div>
        <div className="fgrp">
          <div className="flbl">API Key (optional — dùng built-in nếu trống)</div>
          <input className="finp" placeholder="sk-ant-…" type="password" value={aiKey} onChange={e => setAiKey(e.target.value)} />
        </div>
        <div className="toggle-row">
          <span className="toggle-lbl">Bật AI tóm tắt</span>
          <label className="tgl">
            <input type="checkbox" checked={aiOn} onChange={e => setAiOn(e.target.checked)} />
            <span className="tgl-sl" />
          </label>
        </div>
      </div>

      <div className="set-sec">
        <div className="set-sec-ttl">⚡ Thao tác</div>
        <div style={{ display:"flex",gap:10 }}>
          <button className="btn btn-pri" style={{ flex:1,padding:"11px" }}
            onClick={() => onSave({ sbUrl:url, sbKey:key, aiKey, aiEnabled:aiOn })}>
            💾 Lưu cài đặt
          </button>
          <button className="btn btn-sec" style={{ flex:1,padding:"11px" }}
            onClick={() => { setUrl(""); setKey(""); setAiKey(""); setAiOn(true); setConn(null); onSave(DEFAULT_CONFIG); }}>
            🗑 Reset
          </button>
        </div>
      </div>

      <div style={{ fontSize:11,color:"var(--tx3)",lineHeight:1.8,padding:"0 2px" }}>
        Config lưu trong <code style={{background:"var(--bg2)",padding:"1px 5px",borderRadius:4}}>localStorage["app_config"]</code>.<br/>
        Supabase key không gửi lên server — chỉ dùng từ browser.<br/>
        SQL schema: xem comment cuối file.
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════ */
export default function DailyJournal() {

  // ── config ──────────────────────────────────────────────────
  const [config, setConfig] = useState(DEFAULT_CONFIG);

  const saveConfig = useCallback((newCfg) => {
    setConfig(newCfg);
    lsSet(LS_CONFIG, newCfg);
  }, []);

  // [FIX] Supabase re-init when config.sbUrl / config.sbKey changes
  useEffect(() => {
    if (config.sbUrl && config.sbKey) {
      getSupabase(config.sbUrl, config.sbKey); // re-init singleton
      loadEntries(config.sbUrl, config.sbKey);
    }
  }, [config.sbUrl, config.sbKey]); // eslint-disable-line

  // ── app state ────────────────────────────────────────────────
  const [entries,      setEntries]      = useState([]);
  const [syncStatus,   setSyncStatus]   = useState("offline");
  const [theme,        setTheme]        = useState("light");
  const [activeTab,    setActiveTab]    = useState("calendar");
  const [calMode,      setCalMode]      = useState("week");
  const [calDate,      setCalDate]      = useState(() => todayStr());
  const [selectedDay,  setSelectedDay]  = useState(() => todayStr());
  const [searchQ,      setSearchQ]      = useState("");
  const [searchFilter, setSearchFilter] = useState("all");
  const [personFilter, setPersonFilter] = useState(null);
  const [toast,        setToast]        = useState(null);
  const [loadPct,      setLoadPct]      = useState(0);
  const [aiLoading,    setAiLoading]    = useState(false);
  const [showEntry,    setShowEntry]    = useState(false);
  const [showDetail,   setShowDetail]   = useState(false);
  const [detailEntry,  setDetailEntry]  = useState(null);
  const [confirmData,  setConfirmData]  = useState(null);

  // ── flat form state ──────────────────────────────────────────
  // [FIX] Each field is its own state atom.
  // No object wrapper → no identity change on render → no remount → no focus loss.
  const [formMode,     setFormMode]     = useState("add");
  const [editId,       setEditId]       = useState(null);
  const [formTitle,    setFormTitle]    = useState("");
  const [formContent,  setFormContent]  = useState("");
  const [formDate,     setFormDate]     = useState(() => todayStr());
  const [formTime,     setFormTime]     = useState(() => nowTime());
  const [formSession,  setFormSession]  = useState("morning");
  const [formType,     setFormType]     = useState("work");
  const [formStatus,   setFormStatus]   = useState("open");
  const [formFollowUp, setFormFollowUp] = useState("");
  const [formMood,     setFormMood]     = useState(null);
  const [formPeople,   setFormPeople]   = useState([]);
  const [formTags,     setFormTags]     = useState([]);
  const [formLinks,    setFormLinks]    = useState([]);

  // ── init ─────────────────────────────────────────────────────
  useEffect(() => {
    const saved = lsGet(LS_CONFIG);
    if (saved) setConfig({ ...DEFAULT_CONFIG, ...saved });
    const th = localStorage.getItem("dl_theme") || "light";
    setTheme(th);
    document.documentElement.setAttribute("data-theme", th);
    const cached = lsGet(LS_ENTRIES) || [];
    setEntries(cached);
  }, []);

  // ── db ────────────────────────────────────────────────────────
  const loadEntries = async (url, key) => {
    setLoadPct(30);
    const sb = getSupabase(url, key);
    if (sb) {
      setSyncStatus("syncing");
      try {
        const { data, error } = await sb
          .from("daily_logs").select("*")
          .eq("id_user", USER_ID).eq("id_app", APP_ID)
          .order("date", { ascending: false });
        if (!error && data) {
          setEntries(data); lsSet(LS_ENTRIES, data);
          setSyncStatus("online"); setLoadPct(100);
          setTimeout(() => setLoadPct(0), 500);
          return;
        }
      } catch {}
    }
    setSyncStatus("offline"); setLoadPct(100);
    setTimeout(() => setLoadPct(0), 500);
  };

  const dbInsert = async (payload) => {
    const sb = getSupabase(config.sbUrl, config.sbKey);
    if (sb && syncStatus === "online") {
      try {
        const { data, error } = await sb.from("daily_logs").insert([payload]).select().single();
        if (!error && data) return data;
      } catch {}
    }
    return payload;
  };

  const dbUpdate = async (id, changes) => {
    const sb = getSupabase(config.sbUrl, config.sbKey);
    if (sb && syncStatus === "online") {
      try {
        await sb.from("daily_logs")
          .update({ ...changes, updated_at: new Date().toISOString() })
          .eq("id", id).eq("id_user", USER_ID).eq("id_app", APP_ID);
      } catch {}
    }
  };

  const dbDelete = async (id) => {
    const sb = getSupabase(config.sbUrl, config.sbKey);
    if (sb && syncStatus === "online") {
      try { await sb.from("daily_logs").delete().eq("id", id).eq("id_user", USER_ID).eq("id_app", APP_ID); } catch {}
    }
  };

  // ── helpers ───────────────────────────────────────────────────
  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  const toggleTheme = () => {
    const t = theme === "light" ? "dark" : "light";
    setTheme(t);
    document.documentElement.setAttribute("data-theme", t);
    localStorage.setItem("dl_theme", t);
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type:"application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a"); a.href = url; a.download = `daily_log_${todayStr()}.json`; a.click();
    URL.revokeObjectURL(url);
    showToast("📤 Đã export");
  };

  const importData = (file) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target.result);
        if (!Array.isArray(data)) throw new Error();
        setConfirmData({ icon:"📥", title:"Import?", msg:`Thêm ${data.length} bản ghi, dữ liệu hiện tại giữ nguyên.`, onOk: async () => {
          let added = 0; const toAdd = [];
          for (const item of data) {
            if (!item.title || !item.date) continue;
            if (entries.some(e => e.id === item.id)) continue;
            if (item.id_user !== USER_ID || item.id_app !== APP_ID) continue;
            const s = await dbInsert(item); toAdd.push(s); added++;
          }
          const updated = [...toAdd, ...entries];
          setEntries(updated); lsSet(LS_ENTRIES, updated);
          showToast(`📥 Import ${added} bản ghi`);
        }});
      } catch { showToast("❌ File không hợp lệ"); }
    };
    reader.readAsText(file);
  };

  // ── calendar ──────────────────────────────────────────────────
  const weekDates = useMemo(() => {
    const d = new Date(calDate + "T00:00:00");
    const mon = new Date(d); mon.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return Array.from({ length: 7 }, (_, i) => { const x = new Date(mon); x.setDate(mon.getDate() + i); return x.toISOString().slice(0, 10); });
  }, [calDate]);

  const monthCells = useMemo(() => {
    const d = new Date(calDate + "T00:00:00");
    const y = d.getFullYear(), m = d.getMonth();
    const first = new Date(y, m, 1), last = new Date(y, m + 1, 0);
    const pad = (first.getDay() + 6) % 7;
    const cells = [];
    for (let i = pad - 1; i >= 0; i--) { const x = new Date(y, m, -i); cells.push({ d: x.toISOString().slice(0, 10), other: true }); }
    for (let i = 1; i <= last.getDate(); i++) cells.push({ d: new Date(y, m, i).toISOString().slice(0, 10), other: false });
    while (cells.length < 42) { const x = new Date(y, m + 1, cells.length - last.getDate() - pad + 1); cells.push({ d: x.toISOString().slice(0, 10), other: true }); }
    return cells;
  }, [calDate]);

  const navCal = (dir) => {
    const d = new Date(calDate + "T00:00:00");
    calMode === "week" ? d.setDate(d.getDate() + dir * 7) : d.setMonth(d.getMonth() + dir);
    setCalDate(d.toISOString().slice(0, 10));
  };

  const calTitle = () => {
    const d = new Date(calDate + "T00:00:00");
    if (calMode === "week") {
      const a = new Date(weekDates[0] + "T00:00:00"), b = new Date(weekDates[6] + "T00:00:00");
      return `${a.getDate()}/${a.getMonth()+1} – ${b.getDate()}/${b.getMonth()+1}/${b.getFullYear()}`;
    }
    return `${MONTHS_VI[d.getMonth()]} ${d.getFullYear()}`;
  };

  const dayCount = useCallback((d) => entries.filter(e => e.date === d).length, [entries]);
  const dayMood  = useCallback((d) => { const es = entries.filter(e => e.date === d); return es.length ? (MOOD_MAP[es[0].mood] || "") : ""; }, [entries]);

  const missedDays = useMemo(() => {
    const res = [];
    for (let i = 1; i <= 14; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const s = d.toISOString().slice(0, 10);
      if (!dayCount(s)) res.push(s);
    }
    return res.slice(0, 7);
  }, [dayCount]);

  // ── contacts: derived, no fake data ───────────────────────────
  const contacts = useMemo(() => {
    const map = {};
    entries.forEach(e => (e.people || []).forEach(p => {
      if (!map[p.contact_id]) map[p.contact_id] = { id: p.contact_id, name: p.name };
    }));
    return Object.values(map);
  }, [entries]);

  // ── form ──────────────────────────────────────────────────────
  const openAdd = useCallback((date, session) => {
    const d = date || selectedDay;
    setFormMode("add"); setEditId(null);
    setFormTitle(""); setFormContent("");
    setFormDate(d); setFormTime(nowTime());
    setFormSession(session || autoSession()); setFormType("work");
    setFormStatus("open"); setFormFollowUp("");
    setFormMood(null); setFormPeople([]); setFormTags([]); setFormLinks([]);
    setShowEntry(true);
  }, [selectedDay]);

  const openEdit = useCallback((entry) => {
    setFormMode("edit"); setEditId(entry.id);
    setFormTitle(entry.title || "");
    setFormContent(entry.content || "");
    setFormDate(entry.date || todayStr());
    setFormTime(entry.time || nowTime());
    setFormSession(entry.session || "morning");
    setFormType(entry.type || "work");
    setFormStatus(entry.status || "open");
    setFormFollowUp(entry.follow_up || "");
    setFormMood(entry.mood || null);
    setFormPeople(Array.isArray(entry.people) ? [...entry.people] : []);
    setFormTags(Array.isArray(entry.tags) ? [...entry.tags] : []);
    setFormLinks(Array.isArray(entry.links) ? [...entry.links] : []);
    setShowEntry(true);
  }, []);

  const saveForm = useCallback(async () => {
    if (!formTitle.trim()) { showToast("Vui lòng nhập tiêu đề"); return; }
    const payload = {
      id_user: USER_ID, id_app: APP_ID,
      date: formDate, time: formTime, session: formSession,
      title: formTitle.trim(), content: formContent.trim(),
      people: formPeople, tags: formTags, links: formLinks.filter(Boolean),
      type: formType, follow_up: formFollowUp.trim() || null,
      status: formStatus, mood: formMood,
    };
    if (formMode === "add") {
      payload.id = uuid(); payload.created_at = new Date().toISOString();
      const saved = await dbInsert(payload);
      const updated = [saved, ...entries];
      setEntries(updated); lsSet(LS_ENTRIES, updated);
      showToast("✅ Đã thêm");
    } else {
      payload.updated_at = new Date().toISOString();
      await dbUpdate(editId, payload);
      const updated = entries.map(e => e.id === editId ? { ...e, ...payload } : e);
      setEntries(updated); lsSet(LS_ENTRIES, updated);
      showToast("✅ Đã cập nhật");
    }
    setShowEntry(false);
  }, [formTitle, formContent, formDate, formTime, formSession, formType, formStatus, formFollowUp, formMood, formPeople, formTags, formLinks, formMode, editId, entries, showToast]);

  const handleDelete = useCallback((id) => {
    setConfirmData({ icon:"🗑", title:"Xoá bản ghi?", msg:"Không thể hoàn tác.", onOk: async () => {
      await dbDelete(id);
      const updated = entries.filter(e => e.id !== id);
      setEntries(updated); lsSet(LS_ENTRIES, updated);
      setShowDetail(false); showToast("🗑 Đã xoá");
    }});
  }, [entries, showToast]);

  const handleDone = useCallback(async (entry) => {
    const ns = entry.status === "done" ? "open" : "done";
    await dbUpdate(entry.id, { status: ns });
    const updated = entries.map(e => e.id === entry.id ? { ...e, status: ns } : e);
    setEntries(updated); lsSet(LS_ENTRIES, updated);
    setDetailEntry(d => d?.id === entry.id ? { ...d, status: ns } : d);
  }, [entries]);

  const handleDuplicate = useCallback((id) => {
    const e = entries.find(x => x.id === id);
    if (!e) return;
    openAdd(e.date, e.session);
    setTimeout(() => {
      setFormTitle((e.title || "") + " (copy)");
      setFormContent(e.content || "");
      setFormType(e.type || "work");
      setFormMood(e.mood || null);
      setFormPeople(e.people || []);
      setFormTags(e.tags || []);
      setFormLinks(e.links || []);
    }, 40);
  }, [entries, openAdd]);

  const summarizeEntry = useCallback(async (entry) => {
    if (!entry.content?.trim()) { showToast("Chưa có nội dung"); return; }
    if (!config.aiEnabled) { showToast("AI bị tắt trong Cài đặt"); return; }
    setAiLoading(true);
    try {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 1000,
          messages: [{ role:"user", content:
            `Tóm tắt nhật ký ngày ${fmtDate(entry.date)} thành ý chính. JSON only, không markdown:\n{"points":["ý 1"],"highlight":"1 câu tổng quan"}\n\nNhật ký:\n${entry.content}`
          }]
        })
      });
      const data   = await resp.json();
      const raw    = data.content?.find(b => b.type === "text")?.text || "{}";
      const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
      const updated = entries.map(e => e.id === entry.id ? { ...e, _summary: parsed } : e);
      setEntries(updated);
      setDetailEntry(d => d?.id === entry.id ? { ...d, _summary: parsed } : d);
      showToast("✨ AI tóm tắt xong");
    } catch { showToast("❌ Lỗi AI"); }
    setAiLoading(false);
  }, [config.aiEnabled, entries, showToast]);

  const handlePersonClick = useCallback((p) => {
    setPersonFilter({ id: p.contact_id, name: p.name });
    setActiveTab("people");
  }, []);

  // ── derived ───────────────────────────────────────────────────
  const searchResults = useMemo(() => {
    let r = entries;
    if (searchFilter !== "all") r = r.filter(e => e.type === searchFilter);
    if (searchQ) {
      const q = searchQ.toLowerCase();
      r = r.filter(e =>
        (e.title||"").toLowerCase().includes(q) ||
        (e.content||"").toLowerCase().includes(q) ||
        (e.people||[]).some(p => p.name.toLowerCase().includes(q)) ||
        (e.tags||[]).some(t => t.toLowerCase().includes(q))
      );
    }
    return r;
  }, [entries, searchQ, searchFilter]);

  const groupByDate = (list) => {
    const g = {};
    list.forEach(e => { const d = e.date || "x"; if (!g[d]) g[d] = []; g[d].push(e); });
    return Object.keys(g).sort((a, b) => b.localeCompare(a)).map(d => ({ d, es: g[d] }));
  };

  const peopleMap = useMemo(() => {
    const m = {};
    entries.forEach(e => (e.people || []).forEach(p => {
      if (!m[p.contact_id]) m[p.contact_id] = { ...p, count: 0 };
      m[p.contact_id].count++;
    }));
    return Object.values(m).sort((a, b) => b.count - a.count);
  }, [entries]);

  const filteredPeopleEntries = useMemo(() =>
    personFilter ? entries.filter(e => (e.people||[]).some(p => p.contact_id === personFilter.id)) : [],
    [entries, personFilter]
  );

  // ── day panel (inline — reads stable callbacks above) ─────────
  const renderDayPanel = (date) => {
    const es      = entries.filter(e => e.date === date);
    const morning = es.filter(e => e.session === "morning").sort((a,b) => (b.time||"").localeCompare(a.time||""));
    const evening = es.filter(e => e.session === "evening").sort((a,b) => (b.time||"").localeCompare(a.time||""));
    const ecProps  = { onOpen:(e)=>{setDetailEntry(e);setShowDetail(true);}, onEdit:openEdit, onDelete:handleDelete, onDone:handleDone, onDuplicate:handleDuplicate, onPersonClick:handlePersonClick };
    return (
      <div>
        <div className="day-panel">
          <div className="dp-hdr">
            <div className="dp-date">
              <div className="dp-main">{isToday(date) ? "Hôm nay" : fmtDate(date)}</div>
              <div className="dp-sub">{date}</div>
            </div>
            <button className="dp-add" onClick={() => openAdd(date)}>+ Thêm</button>
          </div>
          {es.length === 0 && <div className="dp-empty">{isToday(date) ? "Hôm nay bạn làm gì?" : "Ngày này chưa có ghi chú."}</div>}
        </div>
        {morning.length > 0 && (
          <div className="sess-blk">
            <div className="sess-hdr s-mor">☀️ Phiên Sáng<span className="s-cnt">{morning.length} bản ghi</span></div>
            {morning.map(e => <EntryCard key={e.id} entry={e} {...ecProps} />)}
          </div>
        )}
        {evening.length > 0 && (
          <div className="sess-blk">
            <div className="sess-hdr s-eve">🌙 Phiên Tối<span className="s-cnt">{evening.length} bản ghi</span></div>
            {evening.map(e => <EntryCard key={e.id} entry={e} {...ecProps} />)}
          </div>
        )}
      </div>
    );
  };

  const ecProps = { onOpen:(e)=>{setDetailEntry(e);setShowDetail(true);}, onEdit:openEdit, onDelete:handleDelete, onDone:handleDone, onDuplicate:handleDuplicate, onPersonClick:handlePersonClick };

  /* ── render ── */
  return (
    <>
      <style>{CSS}</style>
      {loadPct > 0 && <div className="load-bar" style={{ width:`${loadPct}%` }} />}

      <div className="app">
        <header className="hdr">
          <div className="hdr-logo">🐉 Daily<span>Log</span></div>
          <div className="hdr-actions">
            <span style={{ fontSize:11,color:"var(--tx3)",display:"flex",alignItems:"center" }}>
              <span className={`sync-dot${syncStatus==="offline"?" off":syncStatus==="syncing"?" sync":""}`}/>
              {syncStatus}
            </span>
            <button className="icon-btn" onClick={toggleTheme}>{theme==="light"?"🌙":"☀️"}</button>
            <button className="icon-btn" onClick={exportData}>📤</button>
            <label className="icon-btn" style={{ cursor:"pointer" }}>
              📥<input type="file" accept=".json" style={{ display:"none" }}
                onChange={e => { if (e.target.files[0]) { importData(e.target.files[0]); e.target.value=""; } }}/>
            </label>
          </div>
        </header>

        <div className="views">

          {/* CALENDAR */}
          <div className={`view${activeTab==="calendar"?" active":""}`}>
            <div className="cal-hdr">
              <button className="cal-nav" onClick={() => navCal(-1)}>‹</button>
              <div className="cal-title">{calTitle()}</div>
              <button className="cal-nav" onClick={() => navCal(1)}>›</button>
              <div className="cal-toggle">
                <button className={calMode==="week"?"active":""} onClick={() => setCalMode("week")}>Tuần</button>
                <button className={calMode==="month"?"active":""} onClick={() => setCalMode("month")}>Tháng</button>
              </div>
            </div>

            {calMode === "week" && (
              <div className="week-grid">
                {weekDates.map(d => {
                  const cnt = dayCount(d), mood = dayMood(d);
                  return (
                    <div key={d} className={`week-day${isToday(d)?" today":""}${d===selectedDay?" selected":""}${cnt>0&&d!==selectedDay?" he":""}`}
                         onClick={() => setSelectedDay(d)}>
                      <div className="wd-nm">{DAYS_VI[new Date(d+"T00:00:00").getDay()]}</div>
                      <div className="wd-n">{new Date(d+"T00:00:00").getDate()}</div>
                      <div className="wd-md">{mood}</div>
                      <div className="wd-dots">{Array.from({length:clamp(cnt,0,3)}).map((_,i)=><div key={i} className="wd-dot"/>)}</div>
                    </div>
                  );
                })}
              </div>
            )}

            {calMode === "month" && (
              <div className="month-grid">
                {["T2","T3","T4","T5","T6","T7","CN"].map(d => <div key={d} className="mhdr">{d}</div>)}
                {monthCells.map(({ d, other }) => {
                  const cnt = dayCount(d), mood = dayMood(d);
                  const missed = !cnt && !other && d < todayStr() && !isToday(d);
                  return (
                    <div key={d} className={`mday${other?" other":""}${isToday(d)?" today":""}${d===selectedDay?" selected":""}${missed?" missed":""}`}
                         onClick={() => setSelectedDay(d)}>
                      <div className="md-n">{new Date(d+"T00:00:00").getDate()}</div>
                      {mood ? <div className="md-md">{mood}</div> : cnt > 0 ? <div className="md-dot"/> : null}
                    </div>
                  );
                })}
              </div>
            )}

            {missedDays.length > 0 && (
              <div className="missed-sec">
                <div className="missed-hdr">⚠️ Ngày chưa ghi ({missedDays.length})</div>
                <div className="missed-chips">
                  {missedDays.map(d => (
                    <div key={d} className="missed-chip" onClick={() => { setSelectedDay(d); openAdd(d); }}>
                      {new Date(d+"T00:00:00").getDate()}/{new Date(d+"T00:00:00").getMonth()+1}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {renderDayPanel(selectedDay)}
          </div>

          {/* SEARCH */}
          <div className={`view${activeTab==="search"?" active":""}`}>
            <div className="search-bar">
              <span>🔍</span>
              <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Tìm tiêu đề, nội dung, người…"/>
              {searchQ && <button style={{ color:"var(--tx3)" }} onClick={() => setSearchQ("")}>✕</button>}
            </div>
            <div className="filter-row">
              {[{v:"all",l:"Tất cả"}, ...TYPE_OPTS].map(t => (
                <button key={t.v} className={`filter-chip${searchFilter===t.v?" active":""}`} onClick={() => setSearchFilter(t.v)}>{t.l}</button>
              ))}
            </div>
            {groupByDate(searchResults).length === 0
              ? <div className="empty"><div className="ei">🔍</div><p>Không tìm thấy kết quả.</p></div>
              : groupByDate(searchResults).map(({ d, es }) => (
                  <div key={d}>
                    <div className="sec-title">{isToday(d)?"Hôm nay":fmtDate(d)}</div>
                    {es.map(e => <EntryCard key={e.id} entry={e} {...ecProps}/>)}
                  </div>
                ))
            }
          </div>

          {/* PEOPLE */}
          <div className={`view${activeTab==="people"?" active":""}`}>
            <div className="view-title">👥 Người liên quan</div>
            {personFilter && (
              <div className="ppl-banner">
                <span>Lọc: <strong>{personFilter.name}</strong></span>
                <button className="clr-btn" onClick={() => setPersonFilter(null)}>Xoá bộ lọc</button>
              </div>
            )}
            {!personFilter && (
              <div className="ppl-grid">
                {peopleMap.length === 0
                  ? <div className="empty" style={{gridColumn:"1/-1"}}><div className="ei">👥</div><p>Thêm người vào bản ghi để hiện ở đây.</p></div>
                  : peopleMap.map(p => (
                      <div key={p.contact_id} className="ppl-card" onClick={() => setPersonFilter({id:p.contact_id,name:p.name})}>
                        <div className="ppl-av">{avatarLet(p.name)}</div>
                        <div className="ppl-name">{p.name}</div>
                        <div className="ppl-cnt">{p.count} bản ghi</div>
                      </div>
                    ))
                }
              </div>
            )}
            {personFilter && (
              filteredPeopleEntries.length === 0
                ? <div className="empty"><div className="ei">📭</div><p>Chưa có bản ghi.</p></div>
                : groupByDate(filteredPeopleEntries).map(({ d, es }) => (
                    <div key={d}>
                      <div className="sec-title">{isToday(d)?"Hôm nay":fmtDate(d)}</div>
                      {es.map(e => <EntryCard key={e.id} entry={e} {...ecProps}/>)}
                    </div>
                  ))
            )}
          </div>

          {/* FOLLOW-UP */}
          <div className={`view${activeTab==="followup"?" active":""}`}>
            <div className="view-title">📌 Follow-up</div>
            <div className="fu-stats">
              <div className="stat-card"><div className="stat-n">{entries.filter(e=>e.follow_up&&e.status==="open").length}</div><div className="stat-l">Cần làm</div></div>
              <div className="stat-card"><div className="stat-n">{entries.filter(e=>e.follow_up&&e.status==="done").length}</div><div className="stat-l">Đã xong</div></div>
            </div>
            {(() => {
              const open = entries.filter(e => e.follow_up && e.status === "open");
              if (!open.length) return <div className="empty"><div className="ei">🎉</div><p>Không có việc gì cần làm!</p></div>;
              return open.map(e => (
                <div key={e.id} className={`ec ec-${e.type||"work"}`} onClick={() => { setDetailEntry(e); setShowDetail(true); }}>
                  <div className="ec-top"><span className="ec-time">{e.date} {e.time||""}</span><span className="ec-title">{e.title}</span></div>
                  <div className="dv-fu" style={{marginTop:6}}>📌 {e.follow_up}</div>
                  <div style={{marginTop:8}} onClick={ev => ev.stopPropagation()}>
                    <button style={{fontSize:12,padding:"4px 12px",borderRadius:20,background:"rgba(39,174,96,.15)",color:"var(--grn)",border:"none",cursor:"pointer"}}
                      onClick={() => handleDone(e)}>✓ Mark done</button>
                  </div>
                </div>
              ));
            })()}
          </div>

          {/* SETTINGS */}
          <div className={`view${activeTab==="settings"?" active":""}`}>
            <SettingsView config={config} onSave={(cfg) => { saveConfig(cfg); showToast("✅ Đã lưu cài đặt"); }} />
          </div>
        </div>

        <nav className="tabs">
          {[
            {id:"calendar", icon:"📅", label:"Lịch"   },
            {id:"search",   icon:"🔍", label:"Tìm"    },
            {id:"people",   icon:"👥", label:"Người"  },
            {id:"followup", icon:"📌", label:"Việc"   },
            {id:"settings", icon:"⚙️", label:"Cài đặt"},
          ].map(t => (
            <button key={t.id} className={`tab-btn${activeTab===t.id?" active":""}`} onClick={() => setActiveTab(t.id)}>
              <span className="ti">{t.icon}</span>{t.label}
            </button>
          ))}
        </nav>

        {activeTab === "calendar" && (
          <button className="fab" onClick={() => openAdd(selectedDay)}>+</button>
        )}
      </div>

      {showEntry && (
        <EntryModal
          formMode={formMode}
          formTitle={formTitle}         setFormTitle={setFormTitle}
          formContent={formContent}     setFormContent={setFormContent}
          formDate={formDate}           setFormDate={setFormDate}
          formTime={formTime}           setFormTime={setFormTime}
          formSession={formSession}     setFormSession={setFormSession}
          formType={formType}           setFormType={setFormType}
          formStatus={formStatus}       setFormStatus={setFormStatus}
          formFollowUp={formFollowUp}   setFormFollowUp={setFormFollowUp}
          formMood={formMood}           setFormMood={setFormMood}
          formPeople={formPeople}       setFormPeople={setFormPeople}
          formTags={formTags}           setFormTags={setFormTags}
          formLinks={formLinks}         setFormLinks={setFormLinks}
          contacts={contacts}
          onClose={() => setShowEntry(false)}
          onSave={saveForm}
        />
      )}

      {showDetail && detailEntry && (
        <DetailModal
          entry={detailEntry}
          aiLoading={aiLoading}
          onClose={() => setShowDetail(false)}
          onEdit={openEdit}
          onDone={handleDone}
          onSummarize={summarizeEntry}
        />
      )}

      {confirmData && (
        <ConfirmModal data={confirmData} onClose={() => setConfirmData(null)} />
      )}

      <div className={`toast${toast?" show":""}`}>{toast}</div>
    </>
  );
}

/*
══════════════════════════════════════════════════════════════
SQL SETUP — chạy trong Supabase SQL Editor
══════════════════════════════════════════════════════════════

create table if not exists daily_logs (
  id          uuid primary key default gen_random_uuid(),
  id_user     text not null,
  id_app      text not null,
  date        text,
  session     text,
  time        text,
  title       text,
  content     text,
  people      jsonb,
  tags        text[],
  links       text[],
  type        text,
  follow_up   text,
  status      text default 'open',
  mood        text,
  created_at  timestamp default now(),
  updated_at  timestamp default now()
);

create index if not exists idx_dl_user_app on daily_logs (id_user, id_app);
create index if not exists idx_dl_date     on daily_logs (date);

alter table daily_logs enable row level security;
create policy "RongLeo" on daily_logs for all using (id_user = 'RongLeo');
*/
