from pathlib import Path
p=Path('/tmp/sc11/index.js')
s=p.read_text()
nav_old='<a href="/permissions">🔐 الصلاحيات</a>'
nav_new=nav_old+'<a href="/activity">📝 سجل النشاط</a>'
s=s.replace(nav_old, nav_new)
# Add activity page before dashboard
marker='async function dashboard(env) {'
page=r'''async function activityPage(env) {
  return htmlResponse(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>سجل النشاط | Syria Commerce</title>
  <style>*{box-sizing:border-box}body{margin:0;background:#f5f7fb;color:#172033;font-family:Arial,sans-serif}.top{background:#111827;color:#fff;padding:18px 22px}.wrap{max-width:1100px;margin:auto}.brand{font-size:24px;font-weight:700}.sub{opacity:.75;margin-top:5px}.layout{display:grid;grid-template-columns:220px 1fr;gap:18px;max-width:1100px;margin:22px auto;padding:0 16px}nav,.card{background:#fff;border:1px solid #e5e7eb;border-radius:16px;box-shadow:0 4px 18px #00000008}nav{padding:10px;height:max-content}nav a{display:block;padding:13px;border-radius:10px;color:#172033;text-decoration:none}nav a:hover{background:#f1f5f9}.section{padding:20px}.badge{display:inline-block;padding:6px 10px;border-radius:999px;background:#eef2ff}.muted{color:#667085}.notice{padding:12px;border-radius:10px;background:#fffbeb;color:#92400e;margin-bottom:16px}.toolbar{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}button{border:0;border-radius:10px;padding:11px 16px;background:#111827;color:#fff;cursor:pointer}.secondary{background:#eef2ff;color:#111827}table{width:100%;border-collapse:collapse}th,td{padding:12px;border-bottom:1px solid #eee;text-align:right}td.time{white-space:nowrap;color:#667085}.empty{text-align:center;padding:30px;color:#667085}.danger{background:#b42318}@media(max-width:700px){.layout{grid-template-columns:1fr}nav{display:grid;grid-template-columns:1fr 1fr}table{font-size:13px}}
  </style></head><body><header class="top"><div class="wrap"><div class="brand">Syria Commerce</div><div class="sub">مركز متابعة نشاط النظام</div></div></header><div class="layout"><nav>
  <a href="/">🏠 الرئيسية</a><a href="/dashboard">👥 المسوقون</a><a href="/products">📦 المنتجات</a><a href="/orders">🧾 الطلبات</a><a href="/commissions">💰 العمولات</a><a href="/customers">👤 العملاء</a><a href="/reports">📊 التقارير</a><a href="/settings">⚙️ الإعدادات</a><a href="/permissions">🔐 الصلاحيات</a><a href="/activity">📝 سجل النشاط</a>
  </nav><main><div class="card section"><span class="badge">Phase 11</span><h1>سجل النشاط</h1><p class="muted">مركز موحّد لمراجعة الأحداث المهمة في لوحة الإدارة قبل تفعيل قاعدة البيانات.</p><div class="notice">هذه النسخة تحفظ السجل على هذا المتصفح فقط. عند ربط قاعدة البيانات سيتم تحويله إلى سجل مركزي دائم.</div><div class="toolbar"><button id="add">＋ إضافة حدث تجريبي</button><button id="seed" class="secondary">إضافة أحداث النظام الأساسية</button><button id="clear" class="danger">مسح السجل</button></div><div class="card" style="box-shadow:none"><div style="overflow:auto"><table><thead><tr><th>الوقت</th><th>النوع</th><th>الحدث</th><th>المستخدم</th></tr></thead><tbody id="rows"></tbody></table></div><div id="empty" class="empty">لا توجد أحداث مسجلة حالياً.</div></div></div></main></div>
  <script>
  const KEY="sc_activity";
  const base=[{type:"SYSTEM",event:"تم تشغيل مركز النشاط",user:"النظام"},{type:"SETTINGS",event:"تم تجهيز نظام الإعدادات",user:"المدير"},{type:"PERMISSIONS",event:"تم تجهيز نظام الصلاحيات",user:"المدير"}];
  function get(){try{return JSON.parse(localStorage.getItem(KEY)||"[]")}catch{return []}}
  function save(x){localStorage.setItem(KEY,JSON.stringify(x.slice(0,200)));render()}
  function add(type,event,user="المدير"){save([{type,event,user,time:new Date().toISOString()},...get()])}
  function render(){const data=get(), body=document.getElementById("rows"), empty=document.getElementById("empty");body.innerHTML=data.map(x=>`<tr><td class="time">${new Date(x.time).toLocaleString("ar-JO")}</td><td><span class="badge">${x.type}</span></td><td>${String(x.event).replace(/[&<>]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[m]))}</td><td>${x.user||"—"}</td></tr>`).join("");empty.style.display=data.length?"none":"block"}
  document.getElementById("add").onclick=()=>add("ACTION","تمت إضافة حدث تجريبي");
  document.getElementById("seed").onclick=()=>{const now=Date.now();save(base.map((x,i)=>({...x,time:new Date(now-i*60000).toISOString()})).concat(get()))};
  document.getElementById("clear").onclick=()=>{if(confirm("مسح سجل النشاط من هذا الجهاز؟")){localStorage.removeItem(KEY);render()}};
  render();
  </script></body></html>`,`سجل النشاط`);
}

'''
s=s.replace(marker,page+marker)
s=s.replace('if (request.method === "GET" && url.pathname === "/permissions") return permissionsPage(env);', 'if (request.method === "GET" && url.pathname === "/permissions") return permissionsPage(env);\n    if (request.method === "GET" && url.pathname === "/activity") return activityPage(env);')
p.write_text(s)
