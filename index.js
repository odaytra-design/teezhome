
const DEMO_PRODUCTS = [
  {
    id: 1,
    name: "منتج تجريبي",
    sku: "PRD-0001",
    price: 100,
    commission: 10,
    stock: 25,
    category: "عام",
    status: "active",
    description: "منتج تجريبي للنظام",
    created_at: new Date().toISOString()
  }
];

const DEMO_MARKETERS = [
  { id: 1, name: "مسوق تجريبي", phone: "0790000000", governorate: "عمّان", code: "SYR-0001", created_at: new Date().toISOString() }
];

function html(body, title = "Syria Commerce") {
  return `<!doctype html><html lang="ar" dir="rtl"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#f5f7fb;color:#172033;font-family:Arial,sans-serif}
header{background:#111827;color:#fff;padding:24px}main{max-width:1000px;margin:24px auto;padding:0 16px}
.card{background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:20px;margin-bottom:18px;box-shadow:0 4px 18px #00000008}
h1,h2{margin-top:0}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px}
.stat{font-size:28px;font-weight:700}.muted{color:#667085}.badge{display:inline-block;padding:6px 10px;border-radius:999px;background:#eef2ff}
table{width:100%;border-collapse:collapse}th,td{padding:12px;border-bottom:1px solid #eee;text-align:right}
a,button{display:inline-block;border:0;border-radius:10px;padding:11px 16px;text-decoration:none;cursor:pointer}
.btn{background:#111827;color:#fff}.btn2{background:#eef2ff;color:#111827}
input,select{width:100%;padding:12px;border:1px solid #d0d5dd;border-radius:10px;font-size:15px}
label{display:block;margin-bottom:6px;font-weight:600}.row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
@media(max-width:650px){.row{grid-template-columns:1fr}}
.notice{padding:12px;border-radius:10px;background:#fff7ed;color:#9a3412}
</style></head><body>${body}</body></html>`;
}


function htmlResponse(body, title = "Syria Commerce") {
  return new Response(html(body, title), {
    headers: {"content-type":"text/html; charset=utf-8"}
  });
}

function json(data, status=200) {
  return new Response(JSON.stringify(data), {status, headers: {"content-type":"application/json; charset=utf-8"}});
}

function getStore(env) {
  // Phase 2 is deploy-safe before D1 is connected.
  // Once env.DB is added, all writes/reads become persistent.
  return env.DB || null;
}

async function nextCode(db) {
  if (!db) return `SYR-${String(DEMO_MARKETERS.length + 1).padStart(4,"0")}`;
  const r = await db.prepare("SELECT COUNT(*) AS n FROM marketers").first();
  return `SYR-${String(Number(r?.n || 0) + 1).padStart(4,"0")}`;
}

async function listMarketers(db) {
  if (!db) return DEMO_MARKETERS;
  const r = await db.prepare("SELECT id,name,phone,governorate,code,created_at FROM marketers ORDER BY id DESC").all();
  return r.results || [];
}

async function register(request, env) {
  const data = await request.json().catch(() => ({}));
  const name = String(data.name || "").trim();
  const phone = String(data.phone || "").trim();
  const governorate = String(data.governorate || "").trim();
  if (!name || !phone || !governorate) return json({ok:false,error:"الاسم والهاتف والمحافظة مطلوبة"},400);

  const db = getStore(env);
  const code = await nextCode(db);
  const row = {name, phone, governorate, code, created_at:new Date().toISOString()};

  if (db) {
    await db.prepare(
      "INSERT INTO marketers (name,phone,governorate,code,created_at) VALUES (?,?,?,?,?)"
    ).bind(name,phone,governorate,code,row.created_at).run();
  } else {
    DEMO_MARKETERS.push({id:DEMO_MARKETERS.length+1,...row});
  }
  return json({ok:true, marketer:row});
}


function esc(v) {
  return String(v ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}

async function listProducts(db) {
  if (!db) return DEMO_PRODUCTS;
  const r = await db.prepare(
    "SELECT id,name,sku,price,commission,stock,category,status,description,created_at FROM products ORDER BY id DESC"
  ).all();
  return r.results || [];
}

async function createProduct(request, env) {
  const d = await request.json().catch(() => ({}));
  const name = String(d.name || "").trim();
  const sku = String(d.sku || "").trim();
  const category = String(d.category || "عام").trim();
  const description = String(d.description || "").trim();
  const price = Number(d.price);
  const commission = Number(d.commission || 0);
  const stock = Number(d.stock || 0);
  const status = d.status === "inactive" ? "inactive" : "active";

  if (!name || !sku || !Number.isFinite(price) || price < 0 || !Number.isFinite(commission) || commission < 0 || !Number.isFinite(stock) || stock < 0) {
    return json({ok:false,error:"تحقق من الاسم والكود والسعر والعمولة والمخزون"},400);
  }

  const db = getStore(env);
  const created_at = new Date().toISOString();

  if (db) {
    await db.prepare(
      "INSERT INTO products (name,sku,price,commission,stock,category,status,description,created_at) VALUES (?,?,?,?,?,?,?,?,?)"
    ).bind(name,sku,price,commission,stock,category,status,description,created_at).run();
    return json({ok:true});
  }

  if (DEMO_PRODUCTS.some(x => x.sku.toLowerCase() === sku.toLowerCase())) {
    return json({ok:false,error:"كود المنتج مستخدم مسبقاً"},409);
  }

  const id = Math.max(0, ...DEMO_PRODUCTS.map(x => x.id)) + 1;
  DEMO_PRODUCTS.unshift({id,name,sku,price,commission,stock,category,status,description,created_at});
  return json({ok:true,product:DEMO_PRODUCTS[0]});
}

async function deleteProduct(request, env) {
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isInteger(id)) return json({ok:false,error:"معرّف غير صالح"},400);

  const db = getStore(env);
  if (db) {
    await db.prepare("DELETE FROM products WHERE id=?").bind(id).run();
  } else {
    const i = DEMO_PRODUCTS.findIndex(x => x.id === id);
    if (i >= 0) DEMO_PRODUCTS.splice(i,1);
  }
  return json({ok:true});
}

async function productsPage(env) {
  const rows = await listProducts(getStore(env));
  const cards = rows.map(p => `
    <tr>
      <td><strong>${esc(p.name)}</strong><div class="muted">${esc(p.description || "")}</div></td>
      <td><span class="badge">${esc(p.sku)}</span></td>
      <td>${Number(p.price).toFixed(2)}</td>
      <td>${Number(p.commission).toFixed(2)}</td>
      <td>${Number(p.stock)}</td>
      <td>${esc(p.category)}</td>
      <td>${p.status === "active" ? '<span class="ok">نشط</span>' : '<span class="off">متوقف</span>'}</td>
      <td><button class="danger" onclick="delProduct(${p.id})">حذف</button></td>
    </tr>`).join("");

  return htmlResponse(`
<header class="top"><div class="wrap"><div class="brand">Syria Commerce</div><div class="sub">إدارة المنتجات</div></div></header>
<div class="layout">
<nav>
<a href="/">🏠 الرئيسية</a><a href="/dashboard">👥 المسوقون</a><a href="/products">📦 المنتجات</a>
<a href="/orders">🧾 الطلبات</a><a href="/commissions">💰 العمولات</a><a href="/customers">👤 العملاء</a>
<a href="/reports">📊 التقارير</a><a href="/settings">⚙️ الإعدادات</a><a href="/permissions">🔐 الصلاحيات</a><a href="/activity">📝 سجل النشاط</a><a href="/notifications">🔔 الإشعارات</a><a href="/support">🎧 دعم العملاء</a><a href="/payouts">💸 سحب العمولات</a>
</nav>
<main>
<div class="card hero"><span class="badge">المرحلة 4</span><h1>نظام المنتجات</h1>
<p class="muted">إضافة المنتجات وإدارتها قبل ربط قاعدة البيانات.</p></div>

<div class="card section">
<h2>إضافة منتج جديد</h2>
<form id="productForm">
<div class="row">
<div><label>اسم المنتج</label><input name="name" required></div>
<div><label>كود المنتج SKU</label><input name="sku" placeholder="PRD-0002" required></div>
</div>
<div class="row" style="margin-top:12px">
<div><label>السعر</label><input name="price" type="number" min="0" step="0.01" required></div>
<div><label>عمولة المسوق</label><input name="commission" type="number" min="0" step="0.01" value="0"></div>
</div>
<div class="row" style="margin-top:12px">
<div><label>المخزون</label><input name="stock" type="number" min="0" step="1" value="0"></div>
<div><label>التصنيف</label><input name="category" value="عام"></div>
</div>
<div class="row" style="margin-top:12px">
<div><label>الحالة</label><select name="status"><option value="active">نشط</option><option value="inactive">متوقف</option></select></div>
<div><label>الوصف</label><input name="description"></div>
</div>
<button class="btn" style="margin-top:14px">حفظ المنتج</button>
<span id="msg" class="muted"></span>
</form>
</div>

<div class="card section">
<h2>قائمة المنتجات <span class="muted">(${rows.length})</span></h2>
<div style="overflow:auto"><table>
<thead><tr><th>المنتج</th><th>SKU</th><th>السعر</th><th>العمولة</th><th>المخزون</th><th>التصنيف</th><th>الحالة</th><th></th></tr></thead>
<tbody>${cards || '<tr><td colspan="8">لا توجد منتجات</td></tr>'}</tbody>
</table></div>
</div>
</main></div>
<style>
*{box-sizing:border-box}body{margin:0;background:#f5f7fb;color:#172033;font-family:Arial,sans-serif}
.top{background:#111827;color:#fff;padding:18px 22px}.wrap{max-width:1100px;margin:auto}
.brand{font-size:24px;font-weight:700}.sub{opacity:.75;margin-top:5px}
.layout{display:grid;grid-template-columns:220px 1fr;gap:18px;max-width:1100px;margin:22px auto;padding:0 16px}
nav,.card{background:#fff;border:1px solid #e5e7eb;border-radius:16px;box-shadow:0 4px 18px #00000008}
nav{padding:10px;height:max-content}nav a{display:block;padding:13px;border-radius:10px;color:#172033;text-decoration:none}nav a:hover{background:#f1f5f9}
.hero,.section{padding:20px}.row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
label{display:block;margin-bottom:6px;font-weight:600}input,select{width:100%;padding:12px;border:1px solid #d0d5dd;border-radius:10px;font-size:15px}
.btn,.danger{border:0;border-radius:10px;padding:11px 16px;cursor:pointer}.btn{background:#111827;color:#fff}.danger{background:#fee2e2;color:#991b1b}
.badge{display:inline-block;padding:6px 10px;border-radius:999px;background:#eef2ff}.muted{color:#667085}
table{width:100%;border-collapse:collapse}th,td{padding:12px;border-bottom:1px solid #eee;text-align:right;white-space:nowrap}
.ok{background:#dcfce7;color:#166534;padding:5px 9px;border-radius:999px}.off{background:#fee2e2;color:#991b1b;padding:5px 9px;border-radius:999px}
@media(max-width:700px){.layout{grid-template-columns:1fr}nav{display:grid;grid-template-columns:1fr 1fr}.row{grid-template-columns:1fr}}
</style>
<script>
document.querySelector("#productForm").addEventListener("submit",async e=>{
 e.preventDefault();
 const msg=document.querySelector("#msg"); msg.textContent="جاري الحفظ...";
 const r=await fetch("/api/products",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(Object.fromEntries(new FormData(e.target)))});
 const d=await r.json();
 if(d.ok){msg.textContent="تم حفظ المنتج";setTimeout(()=>location.reload(),500)}
 else msg.textContent=d.error||"حدث خطأ";
});
async function delProduct(id){
 if(!confirm("حذف المنتج؟")) return;
 const r=await fetch("/api/products?id="+id,{method:"DELETE"});
 const d=await r.json();
 if(d.ok) location.reload(); else alert(d.error||"حدث خطأ");
}
</script>`, "المنتجات");
}


const DEMO_ORDERS = [
  {id:1, order_no:"ORD-0001", product_id:1, product_name:"منتج تجريبي", marketer_code:"SYR-0001", customer_name:"عميل تجريبي", customer_phone:"0790000001", governorate:"عمّان", quantity:1, total:100, commission:10, status:"new", created_at:new Date().toISOString()}
];

async function listOrders(db) {
  if (!db) return DEMO_ORDERS;
  const r = await db.prepare("SELECT * FROM orders ORDER BY id DESC").all();
  return r.results || [];
}

async function createOrder(request, env) {
  const d=await request.json().catch(()=>({}));
  const product_id=Number(d.product_id), quantity=Number(d.quantity||1);
  const product=(await listProducts(getStore(env))).find(x=>x.id===product_id);
  if(!product) return json({ok:false,error:"المنتج غير موجود"},404);
  if(!Number.isInteger(quantity)||quantity<1) return json({ok:false,error:"الكمية غير صحيحة"},400);
  if(Number(product.stock)<quantity) return json({ok:false,error:"الكمية المطلوبة غير متوفرة"},400);

  const customer_name=String(d.customer_name||"").trim();
  const customer_phone=String(d.customer_phone||"").trim();
  const governorate=String(d.governorate||"").trim();
  const marketer_code=String(d.marketer_code||"").trim();
  if(!customer_name||!customer_phone||!governorate||!marketer_code)
    return json({ok:false,error:"بيانات العميل وكود المسوق مطلوبة"},400);

  const total=Number(product.price)*quantity;
  const commission=Number(product.commission)*quantity;
  const order_no="ORD-"+String(Date.now()).slice(-8);
  const created_at=new Date().toISOString();
  const row={order_no,product_id,product_name:product.name,marketer_code,customer_name,customer_phone,governorate,quantity,total,commission,status:"new",created_at};

  const db=getStore(env);
  if(db){
    await db.prepare(`INSERT INTO orders
      (order_no,product_id,product_name,marketer_code,customer_name,customer_phone,governorate,quantity,total,commission,status,created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).bind(order_no,product_id,product.name,marketer_code,customer_name,customer_phone,governorate,quantity,total,commission,"new",created_at).run();
  } else {
    DEMO_ORDERS.unshift({id:Math.max(0,...DEMO_ORDERS.map(x=>x.id))+1,...row});
  }
  return json({ok:true,order:row});
}

async function updateOrder(request,env){
  const d=await request.json().catch(()=>({}));
  const id=Number(d.id), status=String(d.status||"");
  const allowed=["new","confirmed","preparing","shipped","delivered","cancelled"];
  if(!Number.isInteger(id)||!allowed.includes(status)) return json({ok:false,error:"بيانات غير صالحة"},400);
  const db=getStore(env);
  if(db) await db.prepare("UPDATE orders SET status=? WHERE id=?").bind(status,id).run();
  else { const o=DEMO_ORDERS.find(x=>x.id===id); if(o)o.status=status; }
  return json({ok:true});
}

async function ordersPage(env){
 const rows=await listOrders(getStore(env));
 const labels={new:"جديد",confirmed:"مؤكد",preparing:"قيد التجهيز",shipped:"تم الشحن",delivered:"تم التسليم",cancelled:"ملغي"};
 const tr=rows.map(o=>`<tr><td>${esc(o.order_no)}</td><td>${esc(o.product_name)}</td><td>${esc(o.customer_name)}<div class="muted">${esc(o.customer_phone)}</div></td><td>${esc(o.marketer_code)}</td><td>${o.quantity}</td><td>${Number(o.total).toFixed(2)}</td><td>${Number(o.commission).toFixed(2)}</td><td><select onchange="setStatus(${o.id},this.value)">${Object.entries(labels).map(([k,v])=>`<option value="${k}" ${o.status===k?"selected":""}>${v}</option>`).join("")}</select></td></tr>`).join("");
 const products=await listProducts(getStore(env));
 const opts=products.map(x=>`<option value="${x.id}">${esc(x.name)} — ${x.price}</option>`).join("");
 return htmlResponse(`<header class="top"><div class="wrap"><div class="brand">Syria Commerce</div><div class="sub">إدارة الطلبات</div></div></header>
 <div class="layout"><nav><a href="/">🏠 الرئيسية</a><a href="/dashboard">👥 المسوقون</a><a href="/products">📦 المنتجات</a><a href="/orders">🧾 الطلبات</a><a href="/commissions">💰 العمولات</a><a href="/customers">👤 العملاء</a><a href="/reports">📊 التقارير</a><a href="/settings">⚙️ الإعدادات</a><a href="/permissions">🔐 الصلاحيات</a><a href="/activity">📝 سجل النشاط</a><a href="/notifications">🔔 الإشعارات</a></nav>
 <main><div class="card section"><span class="badge">المرحلة 5</span><h1>نظام الطلبات</h1><p class="muted">تسجيل الطلب، ربطه بالمنتج والمسوق، ومتابعة حالته حتى التسليم.</p></div>
 <div class="card section"><h2>تسجيل طلب</h2><form id="orderForm"><div class="row"><div><label>المنتج</label><select name="product_id" required>${opts}</select></div><div><label>الكمية</label><input name="quantity" type="number" min="1" value="1" required></div></div>
 <div class="row"><div><label>اسم العميل</label><input name="customer_name" required></div><div><label>هاتف العميل</label><input name="customer_phone" required></div></div>
 <div class="row"><div><label>المحافظة</label><input name="governorate" required></div><div><label>كود المسوق</label><input name="marketer_code" placeholder="SYR-0001" required></div></div>
 <button class="btn" style="margin-top:14px">تسجيل الطلب</button> <span id="msg" class="muted"></span></form></div>
 <div class="card section"><h2>الطلبات (${rows.length})</h2><div style="overflow:auto"><table><thead><tr><th>رقم الطلب</th><th>المنتج</th><th>العميل</th><th>المسوق</th><th>الكمية</th><th>الإجمالي</th><th>العمولة</th><th>الحالة</th></tr></thead><tbody>${tr||"<tr><td colspan=8>لا توجد طلبات</td></tr>"}</tbody></table></div></div>
 </main></div><style>
 *{box-sizing:border-box}body{margin:0;background:#f5f7fb;color:#172033;font-family:Arial,sans-serif}.top{background:#111827;color:#fff;padding:18px 22px}.wrap{max-width:1100px;margin:auto}.brand{font-size:24px;font-weight:700}.sub{opacity:.75;margin-top:5px}.layout{display:grid;grid-template-columns:220px 1fr;gap:18px;max-width:1100px;margin:22px auto;padding:0 16px}nav,.card{background:#fff;border:1px solid #e5e7eb;border-radius:16px;box-shadow:0 4px 18px #00000008}nav{padding:10px;height:max-content}nav a{display:block;padding:13px;border-radius:10px;color:#172033;text-decoration:none}nav a:hover{background:#f1f5f9}.section{padding:20px}.row{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px}label{display:block;margin-bottom:6px;font-weight:600}input,select{width:100%;padding:12px;border:1px solid #d0d5dd;border-radius:10px;font-size:15px}.btn{border:0;border-radius:10px;padding:11px 16px;background:#111827;color:#fff;cursor:pointer}.badge{display:inline-block;padding:6px 10px;border-radius:999px;background:#eef2ff}.muted{color:#667085}table{width:100%;border-collapse:collapse}th,td{padding:12px;border-bottom:1px solid #eee;text-align:right;white-space:nowrap}@media(max-width:700px){.layout{grid-template-columns:1fr}nav{display:grid;grid-template-columns:1fr 1fr}.row{grid-template-columns:1fr}}
 </style><script>
 document.querySelector("#orderForm").addEventListener("submit",async e=>{e.preventDefault();let m=document.querySelector("#msg");m.textContent="جاري الحفظ...";let r=await fetch("/api/orders",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(Object.fromEntries(new FormData(e.target)))});let d=await r.json();m.textContent=d.ok?"تم تسجيل الطلب: "+d.order.order_no:(d.error||"حدث خطأ");if(d.ok)setTimeout(()=>location.reload(),600)});
 async function setStatus(id,status){let r=await fetch("/api/orders",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({id,status})});let d=await r.json();if(!d.ok)alert(d.error||"حدث خطأ");}
 </script>`,"الطلبات");
}


async function commissionsPage(env){
  const orders = await listOrders(getStore(env));
  const delivered = orders.filter(o => o.status === "delivered");
  const pending = orders.filter(o => !["delivered","cancelled"].includes(o.status));
  const cancelled = orders.filter(o => o.status === "cancelled");

  const due = delivered.reduce((sum,o) => sum + Number(o.commission || 0), 0);
  const waiting = pending.reduce((sum,o) => sum + Number(o.commission || 0), 0);
  const cancelledAmount = cancelled.reduce((sum,o) => sum + Number(o.commission || 0), 0);

  const marketers = {};
  for (const o of delivered) {
    const code = o.marketer_code || "غير محدد";
    if (!marketers[code]) marketers[code] = {code, orders:0, amount:0};
    marketers[code].orders++;
    marketers[code].amount += Number(o.commission || 0);
  }

  const rows = Object.values(marketers).sort((a,b)=>b.amount-a.amount).map(m=>`
    <tr>
      <td><strong>${esc(m.code)}</strong></td>
      <td>${m.orders}</td>
      <td>${m.amount.toFixed(2)}</td>
      <td><span class="ok">مستحقة</span></td>
    </tr>`).join("");

  return htmlResponse(`<!doctype html><html lang="ar" dir="rtl">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>العمولات | Syria Commerce</title>
  <style>
  *{box-sizing:border-box}body{margin:0;background:#f5f7fb;color:#172033;font-family:Arial,sans-serif}
  .top{background:#111827;color:#fff;padding:18px 22px}.wrap{max-width:1100px;margin:auto}
  .brand{font-size:24px;font-weight:700}.sub{opacity:.75;margin-top:5px}
  .layout{display:grid;grid-template-columns:220px 1fr;gap:18px;max-width:1100px;margin:22px auto;padding:0 16px}
  nav,.card{background:#fff;border:1px solid #e5e7eb;border-radius:16px;box-shadow:0 4px 18px #00000008}
  nav{padding:10px;height:max-content}nav a{display:block;padding:13px;border-radius:10px;color:#172033;text-decoration:none}
  nav a:hover{background:#f1f5f9}.section,.stat{padding:20px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin:14px 0}
  .num{font-size:28px;font-weight:700;margin-top:8px}.muted{color:#667085}.badge{display:inline-block;padding:6px 10px;border-radius:999px;background:#eef2ff}
  .ok{background:#dcfce7;color:#166534;padding:5px 9px;border-radius:999px}
  table{width:100%;border-collapse:collapse}th,td{padding:12px;border-bottom:1px solid #eee;text-align:right;white-space:nowrap}
  @media(max-width:700px){.layout{grid-template-columns:1fr}nav{display:grid;grid-template-columns:1fr 1fr}}
  </style></head><body>
  <header class="top"><div class="wrap"><div class="brand">Syria Commerce</div><div class="sub">نظام العمولات</div></div></header>
  <div class="layout">
  <nav>
    <a href="/">🏠 الرئيسية</a><a href="/dashboard">👥 المسوقون</a><a href="/products">📦 المنتجات</a>
    <a href="/orders">🧾 الطلبات</a><a href="/commissions">💰 العمولات</a>
  </nav>
  <main>
    <div class="card section"><span class="badge">Phase 6</span>
      <h1>العمولات</h1>
      <p class="muted">العمولة تصبح مستحقة للمسوق فقط بعد تسليم الطلب.</p>
    </div>
    <div class="grid">
      <div class="card stat"><div class="muted">عمولات مستحقة</div><div class="num">${due.toFixed(2)}</div></div>
      <div class="card stat"><div class="muted">قيد الانتظار</div><div class="num">${waiting.toFixed(2)}</div></div>
      <div class="card stat"><div class="muted">ملغاة</div><div class="num">${cancelledAmount.toFixed(2)}</div></div>
      <div class="card stat"><div class="muted">طلبات مسلّمة</div><div class="num">${delivered.length}</div></div>
    </div>
    <div class="card section">
      <h2>عمولات المسوقين المستحقة</h2>
      <div style="overflow:auto"><table>
      <thead><tr><th>المسوق</th><th>طلبات مسلّمة</th><th>العمولة</th><th>الحالة</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="4">لا توجد عمولات مستحقة بعد</td></tr>'}</tbody>
      </table></div>
    </div>
  </main></div></body></html>`,"العمولات");
}


async function listCustomers(db) {
  if (!db) {
    const map = new Map();
    for (const o of DEMO_ORDERS) {
      const phone = String(o.customer_phone || "").trim();
      if (!phone) continue;
      if (!map.has(phone)) {
        map.set(phone,{name:o.customer_name,phone,governorate:o.governorate,orders:0,total:0,last_order:o.created_at});
      }
      const c=map.get(phone);
      c.orders++;
      c.total += Number(o.total || 0);
      if (new Date(o.created_at) > new Date(c.last_order)) c.last_order=o.created_at;
    }
    return [...map.values()].sort((a,b)=>b.orders-a.orders);
  }

  const r=await db.prepare(`
    SELECT customer_name AS name, customer_phone AS phone, governorate,
           COUNT(*) AS orders, COALESCE(SUM(total),0) AS total,
           MAX(created_at) AS last_order
    FROM orders
    GROUP BY customer_phone, customer_name, governorate
    ORDER BY last_order DESC
  `).all();
  return r.results || [];
}


async function reportsPage(env) {
  const orders = await listOrders(getStore(env));
  const products = await listProducts(getStore(env));

  const delivered = orders.filter(o => o.status === "delivered");
  const cancelled = orders.filter(o => o.status === "cancelled");
  const active = orders.filter(o => !["delivered","cancelled"].includes(o.status));

  const sales = delivered.reduce((a,o)=>a+Number(o.total||0),0);
  const allSales = orders.reduce((a,o)=>a+Number(o.total||0),0);
  const dueCommission = delivered.reduce((a,o)=>a+Number(o.commission||0),0);

  const statusNames = {
    new:"جديد", confirmed:"مؤكد", preparing:"قيد التجهيز",
    shipped:"تم الشحن", delivered:"تم التسليم", cancelled:"ملغي"
  };
  const statusMap = {};
  for (const o of orders) {
    const key=o.status||"new";
    statusMap[key]=(statusMap[key]||0)+1;
  }

  const productMap = {};
  for (const o of delivered) {
    const key=o.product_name||"غير محدد";
    if(!productMap[key]) productMap[key]={name:key,orders:0,qty:0,sales:0};
    productMap[key].orders++;
    productMap[key].qty += Number(o.quantity||0);
    productMap[key].sales += Number(o.total||0);
  }

  const marketerMap = {};
  for (const o of orders) {
    const key=o.marketer_code||"غير محدد";
    if(!marketerMap[key]) marketerMap[key]={code:key,orders:0,sales:0};
    marketerMap[key].orders++;
    marketerMap[key].sales += Number(o.total||0);
  }

  const statusRows=Object.entries(statusMap).map(([k,n])=>`
    <tr><td>${esc(statusNames[k]||k)}</td><td>${n}</td><td>${orders.length ? ((n/orders.length)*100).toFixed(1) : "0.0"}%</td></tr>
  `).join("");

  const productRows=Object.values(productMap).sort((a,b)=>b.sales-a.sales).map(x=>`
    <tr><td><strong>${esc(x.name)}</strong></td><td>${x.orders}</td><td>${x.qty}</td><td>${x.sales.toFixed(2)}</td></tr>
  `).join("");

  const marketerRows=Object.values(marketerMap).sort((a,b)=>b.sales-a.sales).map(x=>`
    <tr><td><strong>${esc(x.code)}</strong></td><td>${x.orders}</td><td>${x.sales.toFixed(2)}</td></tr>
  `).join("");

  return htmlResponse(`<!doctype html><html lang="ar" dir="rtl">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>التقارير | Syria Commerce</title>
  <style>
  *{box-sizing:border-box}body{margin:0;background:#f5f7fb;color:#172033;font-family:Arial,sans-serif}
  .top{background:#111827;color:#fff;padding:18px 22px}.wrap{max-width:1100px;margin:auto}
  .brand{font-size:24px;font-weight:700}.sub{opacity:.75;margin-top:5px}
  .layout{display:grid;grid-template-columns:220px 1fr;gap:18px;max-width:1100px;margin:22px auto;padding:0 16px}
  nav,.card{background:#fff;border:1px solid #e5e7eb;border-radius:16px;box-shadow:0 4px 18px #00000008}
  nav{padding:10px;height:max-content}nav a{display:block;padding:13px;border-radius:10px;color:#172033;text-decoration:none}
  nav a:hover{background:#f1f5f9}.section,.stat{padding:20px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin:14px 0}
  .num{font-size:28px;font-weight:700;margin-top:8px}.muted{color:#667085}.badge{display:inline-block;padding:6px 10px;border-radius:999px;background:#eef2ff}
  table{width:100%;border-collapse:collapse}th,td{padding:12px;border-bottom:1px solid #eee;text-align:right}
  @media(max-width:700px){.layout{grid-template-columns:1fr}nav{display:grid;grid-template-columns:1fr 1fr}}
  </style></head><body>
  <header class="top"><div class="wrap"><div class="brand">Syria Commerce</div><div class="sub">التقارير والإحصائيات</div></div></header>
  <div class="layout">
  <nav>
    <a href="/">🏠 الرئيسية</a><a href="/dashboard">👥 المسوقون</a><a href="/products">📦 المنتجات</a>
    <a href="/orders">🧾 الطلبات</a><a href="/commissions">💰 العمولات</a><a href="/customers">👤 العملاء</a>
    <a href="/reports">📊 التقارير</a><a href="/settings">⚙️ الإعدادات</a><a href="/permissions">🔐 الصلاحيات</a><a href="/activity">📝 سجل النشاط</a><a href="/notifications">🔔 الإشعارات</a>
  </nav>
  <main>
    <div class="card section"><span class="badge">Phase 8</span><h1>التقارير</h1>
      <p class="muted">ملخص المبيعات والطلبات والمنتجات والمسوقين. البيانات حالياً تعمل بدون قاعدة بيانات.</p>
    </div>
    <div class="grid">
      <div class="card stat"><div class="muted">إجمالي الطلبات</div><div class="num">${orders.length}</div></div>
      <div class="card stat"><div class="muted">تم التسليم</div><div class="num">${delivered.length}</div></div>
      <div class="card stat"><div class="muted">طلبات قيد المتابعة</div><div class="num">${active.length}</div></div>
      <div class="card stat"><div class="muted">ملغاة</div><div class="num">${cancelled.length}</div></div>
      <div class="card stat"><div class="muted">مبيعات المسلّم</div><div class="num">${sales.toFixed(2)}</div></div>
      <div class="card stat"><div class="muted">عمولات مستحقة</div><div class="num">${dueCommission.toFixed(2)}</div></div>
    </div>

    <div class="card section"><h2>حالة الطلبات</h2>
      <div style="overflow:auto"><table><thead><tr><th>الحالة</th><th>العدد</th><th>النسبة</th></tr></thead>
      <tbody>${statusRows || '<tr><td colspan="3">لا توجد بيانات</td></tr>'}</tbody></table></div>
    </div>

    <div class="card section"><h2>أداء المنتجات</h2>
      <div style="overflow:auto"><table><thead><tr><th>المنتج</th><th>الطلبات</th><th>الكمية</th><th>المبيعات المسلّمة</th></tr></thead>
      <tbody>${productRows || '<tr><td colspan="4">لا توجد مبيعات مسلّمة بعد</td></tr>'}</tbody></table></div>
    </div>

    <div class="card section"><h2>أداء المسوقين</h2>
      <div style="overflow:auto"><table><thead><tr><th>كود المسوق</th><th>الطلبات</th><th>قيمة الطلبات</th></tr></thead>
      <tbody>${marketerRows || '<tr><td colspan="3">لا توجد بيانات</td></tr>'}</tbody></table></div>
    </div>
  </main></div></body></html>`,"التقارير");
}

async function customersPage(env) {
  const rows=await listCustomers(getStore(env));
  const total=rows.reduce((a,c)=>a+Number(c.total||0),0);

  const tr=rows.map(c=>`
    <tr>
      <td><strong>${esc(c.name)}</strong></td>
      <td>${esc(c.phone)}</td>
      <td>${esc(c.governorate)}</td>
      <td>${c.orders}</td>
      <td>${Number(c.total).toFixed(2)}</td>
      <td>${c.last_order ? new Date(c.last_order).toLocaleDateString("ar-JO") : "-"}</td>
    </tr>`).join("");

  return htmlResponse(`<!doctype html><html lang="ar" dir="rtl">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>العملاء | Syria Commerce</title>
  <style>
  *{box-sizing:border-box}body{margin:0;background:#f5f7fb;color:#172033;font-family:Arial,sans-serif}
  .top{background:#111827;color:#fff;padding:18px 22px}.wrap{max-width:1100px;margin:auto}
  .brand{font-size:24px;font-weight:700}.sub{opacity:.75;margin-top:5px}
  .layout{display:grid;grid-template-columns:220px 1fr;gap:18px;max-width:1100px;margin:22px auto;padding:0 16px}
  nav,.card{background:#fff;border:1px solid #e5e7eb;border-radius:16px;box-shadow:0 4px 18px #00000008}
  nav{padding:10px;height:max-content}nav a{display:block;padding:13px;border-radius:10px;color:#172033;text-decoration:none}
  nav a:hover{background:#f1f5f9}.section,.stat{padding:20px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:14px;margin:14px 0}
  .num{font-size:28px;font-weight:700;margin-top:8px}.muted{color:#667085}.badge{display:inline-block;padding:6px 10px;border-radius:999px;background:#eef2ff}
  table{width:100%;border-collapse:collapse}th,td{padding:12px;border-bottom:1px solid #eee;text-align:right;white-space:nowrap}
  @media(max-width:700px){.layout{grid-template-columns:1fr}nav{display:grid;grid-template-columns:1fr 1fr}}
  </style></head><body>
  <header class="top"><div class="wrap"><div class="brand">Syria Commerce</div><div class="sub">إدارة العملاء</div></div></header>
  <div class="layout">
  <nav>
    <a href="/">🏠 الرئيسية</a><a href="/dashboard">👥 المسوقون</a><a href="/products">📦 المنتجات</a>
    <a href="/orders">🧾 الطلبات</a><a href="/commissions">💰 العمولات</a><a href="/customers">👤 العملاء</a>
  </nav>
  <main>
    <div class="card section"><span class="badge">Phase 7</span>
      <h1>العملاء</h1>
      <p class="muted">يتم تجميع العميل تلقائياً من الطلبات باستخدام رقم الهاتف.</p>
    </div>
    <div class="grid">
      <div class="card stat"><div class="muted">عدد العملاء</div><div class="num">${rows.length}</div></div>
      <div class="card stat"><div class="muted">إجمالي المشتريات</div><div class="num">${total.toFixed(2)}</div></div>
    </div>
    <div class="card section">
      <h2>قائمة العملاء</h2>
      <div style="overflow:auto"><table>
      <thead><tr><th>الاسم</th><th>الهاتف</th><th>المحافظة</th><th>الطلبات</th><th>إجمالي الشراء</th><th>آخر طلب</th></tr></thead>
      <tbody>${tr || '<tr><td colspan="6">لا يوجد عملاء بعد</td></tr>'}</tbody>
      </table></div>
    </div>
  </main></div></body></html>`,"العملاء");
}


async function settingsPage(env) {
  return htmlResponse(`<!doctype html><html lang="ar" dir="rtl">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>الإعدادات | Syria Commerce</title>
  <style>
  *{box-sizing:border-box}body{margin:0;background:#f5f7fb;color:#172033;font-family:Arial,sans-serif}
  .top{background:#111827;color:#fff;padding:18px 22px}.wrap{max-width:1100px;margin:auto}
  .brand{font-size:24px;font-weight:700}.sub{opacity:.75;margin-top:5px}
  .layout{display:grid;grid-template-columns:220px 1fr;gap:18px;max-width:1100px;margin:22px auto;padding:0 16px}
  nav,.card{background:#fff;border:1px solid #e5e7eb;border-radius:16px;box-shadow:0 4px 18px #00000008}
  nav{padding:10px;height:max-content}nav a{display:block;padding:13px;border-radius:10px;color:#172033;text-decoration:none}
  nav a:hover{background:#f1f5f9}.section{padding:20px;margin-bottom:14px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
  label{display:block;font-weight:600;margin-bottom:7px}input,select{width:100%;padding:12px;border:1px solid #d0d5dd;border-radius:10px;font-size:15px}
  .row{margin-bottom:14px}.check{display:flex;align-items:center;gap:10px;padding:12px 0}.check input{width:auto}
  button{border:0;border-radius:10px;padding:12px 18px;background:#111827;color:#fff;cursor:pointer;font-size:15px}
  .secondary{background:#eef2ff;color:#111827;margin-right:8px}.notice{padding:12px;border-radius:10px;background:#fffbeb;color:#92400e;margin-bottom:16px}
  .ok{display:none;padding:12px;border-radius:10px;background:#ecfdf3;color:#067647;margin-top:12px}
  @media(max-width:700px){.layout{grid-template-columns:1fr}.grid{grid-template-columns:1fr}nav{display:grid;grid-template-columns:1fr 1fr}}
  </style></head><body>
  <header class="top"><div class="wrap"><div class="brand">Syria Commerce</div><div class="sub">إعدادات النظام</div></div></header>
  <div class="layout">
  <nav>
    <a href="/">🏠 الرئيسية</a><a href="/dashboard">👥 المسوقون</a><a href="/products">📦 المنتجات</a>
    <a href="/orders">🧾 الطلبات</a><a href="/commissions">💰 العمولات</a><a href="/customers">👤 العملاء</a>
    <a href="/reports">📊 التقارير</a><a href="/settings">⚙️ الإعدادات</a><a href="/permissions">🔐 الصلاحيات</a><a href="/activity">📝 سجل النشاط</a><a href="/notifications">🔔 الإشعارات</a>
  </nav>
  <main>
    <div class="card section"><h1>إعدادات المتجر</h1>
      <p style="color:#667085">المرحلة 9: تجهيز مركز التحكم قبل ربط قاعدة البيانات.</p>
      <div class="notice">حالياً يتم حفظ الإعدادات على هذا المتصفح فقط. عند مرحلة قاعدة البيانات سيتم نقلها للحفظ المركزي.</div>
      <form id="settingsForm">
        <div class="grid">
          <div class="row"><label>اسم المتجر</label><input id="storeName" value="Syria Commerce"></div>
          <div class="row"><label>العملة</label><select id="currency"><option value="USD">USD — دولار</option><option value="JOD">JOD — دينار أردني</option><option value="SYP">SYP — ليرة سورية</option></select></div>
          <div class="row"><label>هاتف المتجر</label><input id="phone" placeholder="07xxxxxxxx"></div>
          <div class="row"><label>نسبة العمولة الافتراضية %</label><input id="commission" type="number" min="0" step="0.1" value="10"></div>
        </div>
        <div class="card section" style="box-shadow:none;background:#fafafa">
          <h2>تشغيل الإشعارات</h2>
          <label class="check"><input id="newOrder" type="checkbox" checked> تنبيه عند وصول طلب جديد</label>
          <label class="check"><input id="delivered" type="checkbox" checked> تنبيه عند تسليم الطلب</label>
          <label class="check"><input id="commissionNotice" type="checkbox" checked> تنبيه عند استحقاق العمولة</label>
        </div>
        <button type="submit">حفظ الإعدادات</button>
        <button type="button" class="secondary" id="reset">إعادة الافتراضي</button>
        <div id="ok" class="ok">تم حفظ الإعدادات على هذا الجهاز ✅</div>
      </form>
    </div>
  </main></div>
  <script>
  const ids=["storeName","currency","phone","commission","newOrder","delivered","commissionNotice"];
  const defaults={storeName:"Syria Commerce",currency:"USD",phone:"",commission:10,newOrder:true,delivered:true,commissionNotice:true};
  function load(){
    let x={...defaults,...JSON.parse(localStorage.getItem("sc_settings")||"{}")};
    ids.forEach(id=>document.getElementById(id).type==="checkbox"
      ? document.getElementById(id).checked=!!x[id]
      : document.getElementById(id).value=x[id]);
  }
  document.getElementById("settingsForm").onsubmit=e=>{
    e.preventDefault();let x={};
    ids.forEach(id=>x[id]=document.getElementById(id).type==="checkbox"
      ? document.getElementById(id).checked : document.getElementById(id).value);
    localStorage.setItem("sc_settings",JSON.stringify(x));
    document.getElementById("ok").style.display="block";
    setTimeout(()=>document.getElementById("ok").style.display="none",2200);
  };
  document.getElementById("reset").onclick=()=>{localStorage.removeItem("sc_settings");load()};
  load();
  </script></body></html>`,"الإعدادات");
}

async function permissionsPage(env) {
  return htmlResponse(`<!doctype html><html lang="ar" dir="rtl">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>الصلاحيات | Syria Commerce</title>
  <style>
  *{box-sizing:border-box}body{margin:0;background:#f5f7fb;color:#172033;font-family:Arial,sans-serif}
  .top{background:#111827;color:#fff;padding:18px 22px}.wrap{max-width:1100px;margin:auto}
  .brand{font-size:24px;font-weight:700}.sub{opacity:.75;margin-top:5px}
  .layout{display:grid;grid-template-columns:220px 1fr;gap:18px;max-width:1100px;margin:22px auto;padding:0 16px}
  nav,.card{background:#fff;border:1px solid #e5e7eb;border-radius:16px;box-shadow:0 4px 18px #00000008}
  nav{padding:10px;height:max-content}nav a{display:block;padding:13px;border-radius:10px;color:#172033;text-decoration:none}
  nav a:hover{background:#f1f5f9}.section{padding:20px;margin-bottom:14px}
  .badge{display:inline-block;padding:6px 10px;border-radius:999px;background:#eef2ff}
  .muted{color:#667085}.notice{padding:12px;border-radius:10px;background:#fffbeb;color:#92400e;margin-bottom:16px}
  table{width:100%;border-collapse:collapse}th,td{padding:12px;border-bottom:1px solid #eee;text-align:right}
  .check{display:flex;align-items:center;gap:8px;justify-content:center}.check input{width:18px;height:18px}
  button{border:0;border-radius:10px;padding:12px 18px;background:#111827;color:#fff;cursor:pointer;font-size:15px}
  .secondary{background:#eef2ff;color:#111827;margin-right:8px}.ok{display:none;padding:12px;border-radius:10px;background:#ecfdf3;color:#067647;margin-top:12px}
  .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px}
  .role{padding:16px;border:1px solid #e5e7eb;border-radius:12px}.role h3{margin-top:0}
  @media(max-width:700px){.layout{grid-template-columns:1fr}nav{display:grid;grid-template-columns:1fr 1fr}}
  </style></head><body>
  <header class="top"><div class="wrap"><div class="brand">Syria Commerce</div><div class="sub">إدارة الصلاحيات</div></div></header>
  <div class="layout">
  <nav>
    <a href="/">🏠 الرئيسية</a><a href="/dashboard">👥 المسوقون</a><a href="/products">📦 المنتجات</a>
    <a href="/orders">🧾 الطلبات</a><a href="/commissions">💰 العمولات</a><a href="/customers">👤 العملاء</a>
    <a href="/reports">📊 التقارير</a><a href="/settings">⚙️ الإعدادات</a><a href="/permissions">🔐 الصلاحيات</a><a href="/activity">📝 سجل النشاط</a><a href="/notifications">🔔 الإشعارات</a>
  </nav>
  <main>
    <div class="card section"><span class="badge">Phase 10</span>
      <h1>الصلاحيات والأدوار</h1>
      <p class="muted">تجهيز نظام التحكم بصلاحيات المستخدمين قبل ربط قاعدة البيانات.</p>
      <div class="notice">حالياً يتم حفظ الصلاحيات على هذا المتصفح فقط. عند ربط قاعدة البيانات سيتم نقلها للحفظ المركزي.</div>
    </div>

    <div class="grid">
      <div class="card role"><h3>👑 مدير النظام</h3><p class="muted">صلاحية كاملة على جميع الأنظمة.</p></div>
      <div class="card role"><h3>📦 مدير المنتجات</h3><p class="muted">المنتجات والمخزون والطلبات.</p></div>
      <div class="card role"><h3>💰 المحاسبة</h3><p class="muted">العمولات والتقارير المالية.</p></div>
      <div class="card role"><h3>👥 خدمة العملاء</h3><p class="muted">العملاء والطلبات والمتابعة.</p></div>
    </div>

    <div class="card section" style="margin-top:14px">
      <h2>صلاحيات الأدوار</h2>
      <div style="overflow:auto"><table>
      <thead><tr><th>النظام</th><th>مدير النظام</th><th>المنتجات</th><th>المحاسبة</th><th>خدمة العملاء</th></tr></thead>
      <tbody>
        <tr><td>المسوقون</td><td><input type="checkbox" data-k="admin-marketers" checked></td><td><input type="checkbox" data-k="products-marketers"></td><td><input type="checkbox" data-k="finance-marketers"></td><td><input type="checkbox" data-k="support-marketers" checked></td></tr>
        <tr><td>المنتجات</td><td><input type="checkbox" data-k="admin-products" checked></td><td><input type="checkbox" data-k="products-products" checked></td><td><input type="checkbox" data-k="finance-products"></td><td><input type="checkbox" data-k="support-products"></td></tr>
        <tr><td>الطلبات</td><td><input type="checkbox" data-k="admin-orders" checked></td><td><input type="checkbox" data-k="products-orders" checked></td><td><input type="checkbox" data-k="finance-orders" checked></td><td><input type="checkbox" data-k="support-orders" checked></td></tr>
        <tr><td>العمولات</td><td><input type="checkbox" data-k="admin-commissions" checked></td><td><input type="checkbox" data-k="products-commissions"></td><td><input type="checkbox" data-k="finance-commissions" checked></td><td><input type="checkbox" data-k="support-commissions"></td></tr>
        <tr><td>العملاء</td><td><input type="checkbox" data-k="admin-customers" checked></td><td><input type="checkbox" data-k="products-customers"></td><td><input type="checkbox" data-k="finance-customers"></td><td><input type="checkbox" data-k="support-customers" checked></td></tr>
        <tr><td>التقارير</td><td><input type="checkbox" data-k="admin-reports" checked></td><td><input type="checkbox" data-k="products-reports"></td><td><input type="checkbox" data-k="finance-reports" checked></td><td><input type="checkbox" data-k="support-reports" checked></td></tr>
        <tr><td>الإعدادات</td><td><input type="checkbox" data-k="admin-settings" checked></td><td><input type="checkbox" data-k="products-settings"></td><td><input type="checkbox" data-k="finance-settings"></td><td><input type="checkbox" data-k="support-settings"></td></tr>
      </tbody></table></div>
      <button id="save" style="margin-top:14px">حفظ الصلاحيات</button>
      <button id="reset" class="secondary">إعادة الافتراضي</button>
      <div id="ok" class="ok">تم حفظ الصلاحيات على هذا الجهاز ✅</div>
    </div>
  </main></div>
  <script>
  const boxes=[...document.querySelectorAll('input[type="checkbox"]')];
  function load(){const x=JSON.parse(localStorage.getItem("sc_permissions")||"{}");boxes.forEach(b=>{if(Object.prototype.hasOwnProperty.call(x,b.dataset.k))b.checked=!!x[b.dataset.k]})}
  document.getElementById("save").onclick=()=>{const x={};boxes.forEach(b=>x[b.dataset.k]=b.checked);localStorage.setItem("sc_permissions",JSON.stringify(x));document.getElementById("ok").style.display="block";setTimeout(()=>document.getElementById("ok").style.display="none",2200)};
  document.getElementById("reset").onclick=()=>{localStorage.removeItem("sc_permissions");location.reload()};
  load();
  </script></body></html>`,"الصلاحيات");
}

async function activityPage(env) {
  return htmlResponse(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>سجل النشاط | Syria Commerce</title>
  <style>*{box-sizing:border-box}body{margin:0;background:#f5f7fb;color:#172033;font-family:Arial,sans-serif}.top{background:#111827;color:#fff;padding:18px 22px}.wrap{max-width:1100px;margin:auto}.brand{font-size:24px;font-weight:700}.sub{opacity:.75;margin-top:5px}.layout{display:grid;grid-template-columns:220px 1fr;gap:18px;max-width:1100px;margin:22px auto;padding:0 16px}nav,.card{background:#fff;border:1px solid #e5e7eb;border-radius:16px;box-shadow:0 4px 18px #00000008}nav{padding:10px;height:max-content}nav a{display:block;padding:13px;border-radius:10px;color:#172033;text-decoration:none}nav a:hover{background:#f1f5f9}.section{padding:20px}.badge{display:inline-block;padding:6px 10px;border-radius:999px;background:#eef2ff}.muted{color:#667085}.notice{padding:12px;border-radius:10px;background:#fffbeb;color:#92400e;margin-bottom:16px}.toolbar{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}button{border:0;border-radius:10px;padding:11px 16px;background:#111827;color:#fff;cursor:pointer}.secondary{background:#eef2ff;color:#111827}table{width:100%;border-collapse:collapse}th,td{padding:12px;border-bottom:1px solid #eee;text-align:right}td.time{white-space:nowrap;color:#667085}.empty{text-align:center;padding:30px;color:#667085}.danger{background:#b42318}@media(max-width:700px){.layout{grid-template-columns:1fr}nav{display:grid;grid-template-columns:1fr 1fr}table{font-size:13px}}
  </style></head><body><header class="top"><div class="wrap"><div class="brand">Syria Commerce</div><div class="sub">مركز متابعة نشاط النظام</div></div></header><div class="layout"><nav>
  <a href="/">🏠 الرئيسية</a><a href="/dashboard">👥 المسوقون</a><a href="/products">📦 المنتجات</a><a href="/orders">🧾 الطلبات</a><a href="/commissions">💰 العمولات</a><a href="/customers">👤 العملاء</a><a href="/reports">📊 التقارير</a><a href="/settings">⚙️ الإعدادات</a><a href="/permissions">🔐 الصلاحيات</a><a href="/activity">📝 سجل النشاط</a><a href="/notifications">🔔 الإشعارات</a>
  </nav><main><div class="card section"><span class="badge">Phase 11</span><h1>سجل النشاط</h1><p class="muted">مركز موحّد لمراجعة الأحداث المهمة في لوحة الإدارة قبل تفعيل قاعدة البيانات.</p><div class="notice">هذه النسخة تحفظ السجل على هذا المتصفح فقط. عند ربط قاعدة البيانات سيتم تحويله إلى سجل مركزي دائم.</div><div class="toolbar"><button id="add">＋ إضافة حدث تجريبي</button><button id="seed" class="secondary">إضافة أحداث النظام الأساسية</button><button id="clear" class="danger">مسح السجل</button></div><div class="card" style="box-shadow:none"><div style="overflow:auto"><table><thead><tr><th>الوقت</th><th>النوع</th><th>الحدث</th><th>المستخدم</th></tr></thead><tbody id="rows"></tbody></table></div><div id="empty" class="empty">لا توجد أحداث مسجلة حالياً.</div></div></div></main></div>
  <script>
  const KEY="sc_activity";
  const base=[{type:"SYSTEM",event:"تم تشغيل مركز النشاط",user:"النظام"},{type:"SETTINGS",event:"تم تجهيز نظام الإعدادات",user:"المدير"},{type:"PERMISSIONS",event:"تم تجهيز نظام الصلاحيات",user:"المدير"}];
  function get(){try{return JSON.parse(localStorage.getItem(KEY)||"[]")}catch{return []}}
  function save(x){localStorage.setItem(KEY,JSON.stringify(x.slice(0,200)));render()}
  function add(type,event,user="المدير"){save([{type,event,user,time:new Date().toISOString()},...get()])}
   function render(){const data=get(), body=document.getElementById("rows"), empty=document.getElementById("empty");body.innerHTML=data.map(function(x){var ev=String(x.event||"").replace(/[&<>]/g,function(m){return {"&":"&amp;","<":"&lt;",">":"&gt;"}[m]});return "<tr><td class=\"time\">"+new Date(x.time).toLocaleString("ar-JO")+"</td><td><span class=\"badge\">"+String(x.type||"")+"</span></td><td>"+ev+"</td><td>"+String(x.user||"—")+"</td></tr>"}).join("");empty.style.display=data.length?"none":"block"}
  document.getElementById("add").onclick=()=>add("ACTION","تمت إضافة حدث تجريبي");
  document.getElementById("seed").onclick=()=>{const now=Date.now();save(base.map((x,i)=>({...x,time:new Date(now-i*60000).toISOString()})).concat(get()))};
  document.getElementById("clear").onclick=()=>{if(confirm("مسح سجل النشاط من هذا الجهاز؟")){localStorage.removeItem(KEY);render()}};
  render();
  </script></body></html>`,`سجل النشاط`);
}


async function notificationsPage(env) {
  return htmlResponse(`<!doctype html><html lang="ar" dir="rtl"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>الإشعارات | Syria Commerce</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#f5f7fb;color:#172033;font-family:Arial,sans-serif}
.top{background:#111827;color:#fff;padding:18px 22px}.wrap{max-width:1100px;margin:auto}
.brand{font-size:24px;font-weight:700}.sub{opacity:.75;margin-top:5px}
.layout{display:grid;grid-template-columns:220px 1fr;gap:18px;max-width:1100px;margin:22px auto;padding:0 16px}
nav,.card{background:#fff;border:1px solid #e5e7eb;border-radius:16px;box-shadow:0 4px 18px #00000008}
nav{padding:10px;height:max-content}nav a{display:block;padding:13px;border-radius:10px;color:#172033;text-decoration:none}
nav a:hover{background:#f1f5f9}.section{padding:20px}.badge{display:inline-block;padding:6px 10px;border-radius:999px;background:#eef2ff}
.muted{color:#667085}.toolbar{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}
button{border:0;border-radius:10px;padding:11px 16px;background:#111827;color:#fff;cursor:pointer}
.secondary{background:#eef2ff;color:#111827}.danger{background:#b42318}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px}
.stat{padding:18px}.num{font-size:28px;font-weight:700;margin-top:8px}
.notice{padding:12px;border-radius:10px;background:#fffbeb;color:#92400e;margin-bottom:16px}
.item{border:1px solid #e5e7eb;border-radius:14px;padding:15px;margin-bottom:10px;display:flex;justify-content:space-between;gap:12px;align-items:center}
.item.unread{border-right:4px solid #111827;background:#fafafa}.title{font-weight:700;margin-bottom:5px}.time{font-size:13px;color:#667085}
.pill{display:inline-block;padding:5px 9px;border-radius:999px;background:#f1f5f9;font-size:12px}
.empty{text-align:center;padding:30px;color:#667085}
@media(max-width:700px){.layout{grid-template-columns:1fr}nav{display:grid;grid-template-columns:1fr 1fr}.item{align-items:flex-start;flex-direction:column}}
</style></head><body>
<header class="top"><div class="wrap"><div class="brand">Syria Commerce</div><div class="sub">مركز الإشعارات والتنبيهات</div></div></header>
<div class="layout"><nav>
<a href="/">🏠 الرئيسية</a><a href="/dashboard">👥 المسوقون</a><a href="/products">📦 المنتجات</a><a href="/orders">🧾 الطلبات</a><a href="/commissions">💰 العمولات</a><a href="/customers">👤 العملاء</a><a href="/reports">📊 التقارير</a><a href="/settings">⚙️ الإعدادات</a><a href="/permissions">🔐 الصلاحيات</a><a href="/activity">📝 سجل النشاط</a><a href="/notifications">🔔 الإشعارات</a>
</nav><main>
<div class="card section"><span class="badge">Phase 12</span><h1>الإشعارات</h1>
<p class="muted">مركز موحّد للتنبيهات المهمة. هذه المرحلة تعمل محلياً إلى أن نربط قاعدة البيانات لاحقاً.</p>
<div class="notice">الإشعارات محفوظة على هذا المتصفح فقط حالياً، ولن يتم حذف الأنظمة السابقة.</div>
<div class="grid">
<div class="card stat"><div class="muted">إجمالي الإشعارات</div><div class="num" id="total">0</div></div>
<div class="card stat"><div class="muted">غير المقروءة</div><div class="num" id="unread">0</div></div>
</div>
<div class="toolbar" style="margin-top:14px">
<button id="demo">＋ إضافة تنبيه تجريبي</button>
<button id="read" class="secondary">✓ تحديد الكل كمقروء</button>
<button id="clear" class="danger">مسح الكل</button>
</div>
<div class="card" style="box-shadow:none"><div id="list"></div><div id="empty" class="empty">لا توجد إشعارات حالياً.</div></div>
</div></main></div>
<script>
const KEY="sc_notifications";
function get(){try{return JSON.parse(localStorage.getItem(KEY)||"[]")}catch{return []}}
function save(x){localStorage.setItem(KEY,JSON.stringify(x.slice(0,200)));render()}
function esc(v){return String(v??"").replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function add(type,title,text){
  save([{id:Date.now()+Math.random(),type,title,text,time:new Date().toISOString(),read:false},...get()])
}
function render(){
  const data=get(), list=document.getElementById("list"), empty=document.getElementById("empty");
  document.getElementById("total").textContent=data.length;
  document.getElementById("unread").textContent=data.filter(x=>!x.read).length;
  list.innerHTML=data.map(function(x){
    return '<div class="item '+(x.read?'':'unread')+'">'+
      '<div><div class="title">'+esc(x.title)+' <span class="pill">'+esc(x.type)+'</span></div>'+
      '<div>'+esc(x.text)+'</div><div class="time">'+new Date(x.time).toLocaleString("ar-JO")+'</div></div>'+
      '<button class="secondary" data-id="'+esc(x.id)+'">'+(x.read?'مقروء':'تحديد كمقروء')+'</button></div>';
  }).join("");
  empty.style.display=data.length?"none":"block";
  list.querySelectorAll("button[data-id]").forEach(function(btn){
    btn.onclick=function(){
      const id=String(btn.dataset.id);
      save(get().map(function(x){return String(x.id)===id?Object.assign({},x,{read:true}):x}));
    };
  });
}
document.getElementById("demo").onclick=function(){add("SYSTEM","تنبيه تجريبي","تم إنشاء تنبيه جديد داخل مركز الإشعارات.")};
document.getElementById("read").onclick=function(){save(get().map(function(x){return Object.assign({},x,{read:true})}))};
document.getElementById("clear").onclick=function(){if(confirm("مسح جميع الإشعارات من هذا الجهاز؟")){localStorage.removeItem(KEY);render()}};
render();
</script></body></html>`,"الإشعارات");
}


function searchPage() {
  return htmlResponse(`<!doctype html><html lang="ar" dir="rtl"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>البحث | Syria Commerce</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#f5f7fb;color:#172033;font-family:Arial,sans-serif}
.top{background:#111827;color:#fff;padding:18px 22px}.wrap{max-width:1100px;margin:auto}.brand{font-size:24px;font-weight:700}.sub{opacity:.75;margin-top:5px}
.layout{display:grid;grid-template-columns:220px 1fr;gap:18px;max-width:1100px;margin:22px auto;padding:0 16px}
nav,.card{background:#fff;border:1px solid #e5e7eb;border-radius:16px;box-shadow:0 4px 18px #00000008}
nav{padding:10px;height:max-content}nav a{display:block;padding:11px;border-radius:10px;color:#172033;text-decoration:none}nav a:hover{background:#f1f5f9}
.section{padding:22px}.search{display:flex;gap:10px}.search input{flex:1;padding:13px;border:1px solid #d0d5dd;border-radius:10px;font-size:16px}
button{border:0;border-radius:10px;padding:12px 18px;background:#111827;color:#fff;cursor:pointer}.item{padding:14px;border:1px solid #e5e7eb;border-radius:12px;margin-top:10px}.muted{color:#667085}.empty{text-align:center;padding:28px;color:#667085}
@media(max-width:700px){.layout{grid-template-columns:1fr}nav{display:grid;grid-template-columns:1fr 1fr}.search{flex-direction:column}}
</style></head><body><header class="top"><div class="wrap"><div class="brand">Syria Commerce</div><div class="sub">البحث</div></div></header>
<div class="layout"><nav><a href="/">🏠 الرئيسية</a><a href="/dashboard">👥 المسوقون</a><a href="/products">📦 المنتجات</a><a href="/orders">🧾 الطلبات</a><a href="/commissions">💰 العمولات</a><a href="/customers">👤 العملاء</a><a href="/reports">📊 التقارير</a><a href="/settings">⚙️ الإعدادات</a><a href="/notifications">🔔 الإشعارات</a><a href="/search">🔎 البحث</a></nav>
<main><div class="card section"><h1>🔎 البحث الموحد</h1><p class="muted">بحث مبدئي في بيانات الواجهة. البحث الحقيقي يأتي مع قاعدة البيانات.</p>
<div class="search"><input id="q" placeholder="ابحث عن منتج، عميل، طلب أو مسوق..."><button id="go">بحث</button></div><div id="results" style="margin-top:16px"></div></div></main></div>
<script>
const demo=[{type:"منتج",name:"منتج تجريبي",info:"قسم المنتجات"},{type:"عميل",name:"عميل تجريبي",info:"قسم العملاء"},{type:"طلب",name:"طلب #1001",info:"قسم الطلبات"},{type:"مسوق",name:"مسوق تجريبي",info:"قسم المسوقين"}];
function esc(v){return String(v).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function search(){const q=document.getElementById("q").value.trim().toLowerCase();const r=demo.filter(x=>(x.name+" "+x.type+" "+x.info).toLowerCase().includes(q));document.getElementById("results").innerHTML=q?(r.length?r.map(x=>'<div class="item"><b>'+esc(x.type)+': '+esc(x.name)+'</b><div class="muted">'+esc(x.info)+'</div></div>').join(""):'<div class="empty">لا توجد نتائج تجريبية.</div>'):'<div class="empty">اكتب كلمة للبحث.</div>'}
document.getElementById("go").onclick=search;document.getElementById("q").onkeydown=e=>{if(e.key==="Enter")search()};
</script></body></html>`,"البحث");
}


function authPage() {
  return htmlResponse(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>الدخول | Syria Commerce</title><style>*{box-sizing:border-box}body{margin:0;background:#f5f7fb;color:#172033;font-family:Arial,sans-serif}.wrap{max-width:430px;margin:70px auto;padding:16px}.card{background:#fff;border:1px solid #e5e7eb;border-radius:18px;padding:26px;box-shadow:0 8px 28px #0000000d}h1{margin:0 0 7px}.muted{color:#667085}.row{margin:16px 0}label{display:block;font-weight:700;margin-bottom:7px}input{width:100%;padding:13px;border:1px solid #d0d5dd;border-radius:10px;font-size:16px}button{width:100%;border:0;border-radius:10px;padding:13px;background:#111827;color:#fff;font-size:16px;cursor:pointer}.notice{display:none;margin-top:14px;padding:11px;border-radius:10px}.ok{background:#ecfdf3;color:#067647}.err{background:#fef3f2;color:#b42318}a{display:block;text-align:center;margin-top:16px;color:#344054;text-decoration:none}</style></head><body><main class="wrap"><div class="card"><h1>تسجيل الدخول</h1><p class="muted">Syria Commerce</p><form id="f"><div class="row"><label>البريد الإلكتروني</label><input id="email" type="email" required placeholder="name@example.com"></div><div class="row"><label>كلمة المرور</label><input id="password" type="password" required minlength="4" placeholder="••••••••"></div><button>دخول تجريبي</button></form><div id="msg" class="notice"></div><a href="/register">إنشاء حساب</a><a href="/">العودة للرئيسية</a></div></main><script>document.getElementById("f").onsubmit=function(e){e.preventDefault();const email=document.getElementById("email").value.trim();const msg=document.getElementById("msg");localStorage.setItem("sc_session",JSON.stringify({email:email,at:new Date().toISOString()}));msg.className="notice ok";msg.textContent="تم تسجيل الدخول تجريبياً ✅";msg.style.display="block"};</script></body></html>`,"تسجيل الدخول");
}


function registerPage() {
  return htmlResponse(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>إنشاء حساب | Syria Commerce</title><style>*{box-sizing:border-box}body{margin:0;background:#f5f7fb;color:#172033;font-family:Arial,sans-serif}.wrap{max-width:470px;margin:55px auto;padding:16px}.card{background:#fff;border:1px solid #e5e7eb;border-radius:18px;padding:26px;box-shadow:0 8px 28px #0000000d}h1{margin:0 0 7px}.muted{color:#667085}.row{margin:14px 0}label{display:block;font-weight:700;margin-bottom:7px}input,select{width:100%;padding:13px;border:1px solid #d0d5dd;border-radius:10px;font-size:16px}button{width:100%;border:0;border-radius:10px;padding:13px;background:#111827;color:#fff;font-size:16px;cursor:pointer}.notice{display:none;margin-top:14px;padding:11px;border-radius:10px}.ok{background:#ecfdf3;color:#067647}.err{background:#fef3f2;color:#b42318}a{display:block;text-align:center;margin-top:16px;color:#344054;text-decoration:none}</style></head><body><main class="wrap"><div class="card"><h1>إنشاء حساب</h1><p class="muted">أنشئ حسابك في Syria Commerce</p><form id="f"><div class="row"><label>الاسم</label><input id="name" required minlength="2" placeholder="الاسم الكامل"></div><div class="row"><label>البريد الإلكتروني</label><input id="email" type="email" required placeholder="name@example.com"></div><div class="row"><label>نوع الحساب</label><select id="role"><option value="customer">عميل</option><option value="marketer">مسوق</option></select></div><div class="row"><label>كلمة المرور</label><input id="password" type="password" required minlength="4" placeholder="••••••••"></div><div class="row"><label>تأكيد كلمة المرور</label><input id="confirm" type="password" required minlength="4" placeholder="••••••••"></div><button>إنشاء الحساب</button></form><div id="msg" class="notice"></div><a href="/login">لديك حساب؟ تسجيل الدخول</a><a href="/">العودة للرئيسية</a></div></main><script>document.getElementById("f").onsubmit=function(e){e.preventDefault();const name=document.getElementById("name").value.trim(),email=document.getElementById("email").value.trim().toLowerCase(),pass=document.getElementById("password").value,confirm=document.getElementById("confirm").value,role=document.getElementById("role").value,msg=document.getElementById("msg");if(pass!==confirm){msg.className="notice err";msg.textContent="كلمتا المرور غير متطابقتين.";msg.style.display="block";return}let users=[];try{users=JSON.parse(localStorage.getItem("sc_users")||"[]")}catch(e){}if(users.some(x=>x.email===email)){msg.className="notice err";msg.textContent="هذا البريد مسجل مسبقاً.";msg.style.display="block";return}users.push({id:Date.now(),name,email,role,createdAt:new Date().toISOString()});localStorage.setItem("sc_users",JSON.stringify(users));msg.className="notice ok";msg.textContent="تم إنشاء الحساب تجريبياً ✅";msg.style.display="block"};</script></body></html>`,"إنشاء حساب");
}


function supportPage() {
  return htmlResponse(`<!doctype html><html lang="ar" dir="rtl"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>دعم العملاء | Syria Commerce</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#f5f7fb;color:#172033;font-family:Arial,sans-serif}
.top{background:#111827;color:#fff;padding:18px 22px}.wrap{max-width:1100px;margin:auto}
.brand{font-size:24px;font-weight:700}.sub{opacity:.75;margin-top:5px}
.layout{display:grid;grid-template-columns:220px 1fr;gap:18px;max-width:1100px;margin:22px auto;padding:0 16px}
nav,.card{background:#fff;border:1px solid #e5e7eb;border-radius:16px;box-shadow:0 4px 18px #00000008}
nav{padding:10px;height:max-content}nav a{display:block;padding:11px;border-radius:10px;color:#172033;text-decoration:none}
nav a:hover{background:#f1f5f9}.section{padding:22px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.stat{padding:16px;border:1px solid #e5e7eb;border-radius:12px}.num{font-size:25px;font-weight:700;margin-top:5px}
.ticket{margin-top:12px;padding:15px;border:1px solid #e5e7eb;border-radius:12px}
.status{display:inline-block;padding:5px 9px;border-radius:999px;font-size:13px}.open{background:#fff7ed;color:#9a3412}.closed{background:#ecfdf3;color:#067647}
button{border:0;border-radius:9px;padding:9px 13px;background:#111827;color:#fff;cursor:pointer;margin-top:10px}
.muted{color:#667085}
@media(max-width:700px){.layout{grid-template-columns:1fr}nav{display:grid;grid-template-columns:1fr 1fr}.grid{grid-template-columns:1fr}}
</style></head><body>
<header class="top"><div class="wrap"><div class="brand">Syria Commerce</div><div class="sub">دعم العملاء</div></div></header>
<div class="layout"><nav>
<a href="/">🏠 الرئيسية</a><a href="/dashboard">👥 المسوقون</a><a href="/products">📦 المنتجات</a>
<a href="/orders">🧾 الطلبات</a><a href="/commissions">💰 العمولات</a><a href="/customers">👤 العملاء</a>
<a href="/reports">📊 التقارير</a><a href="/notifications">🔔 الإشعارات</a><a href="/search">🔎 البحث</a>
<a href="/support">🎧 دعم العملاء</a>
</nav><main><div class="card section">
<h1>🎧 دعم العملاء</h1><p class="muted">إدارة ومتابعة طلبات الدعم من مكان واحد.</p>
<div class="grid">
<div class="stat"><div class="muted">مفتوحة</div><div class="num" id="open">2</div></div>
<div class="stat"><div class="muted">قيد المتابعة</div><div class="num">1</div></div>
<div class="stat"><div class="muted">مغلقة</div><div class="num">4</div></div>
</div>
<div id="tickets">
<div class="ticket"><b>#SUP-1001 — مشكلة في الطلب</b><p class="muted">العميل: عميل تجريبي</p><span class="status open">مفتوحة</span><br><button onclick="closeTicket(this)">إغلاق التذكرة</button></div>
<div class="ticket"><b>#SUP-1002 — استفسار عن التوصيل</b><p class="muted">العميل: عميل تجريبي</p><span class="status open">مفتوحة</span><br><button onclick="closeTicket(this)">إغلاق التذكرة</button></div>
</div>
</div></main></div>
<script>
function closeTicket(btn){
 const ticket=btn.parentElement, status=ticket.querySelector(".status");
 if(status.classList.contains("closed"))return;
 status.className="status closed";status.textContent="مغلقة";btn.remove();
 const n=document.getElementById("open");n.textContent=Math.max(0,Number(n.textContent)-1);
}
</script></body></html>`,"دعم العملاء");
}


function payoutsPage() {
  return htmlResponse(`<!doctype html><html lang="ar" dir="rtl"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>سحب العمولات | Syria Commerce</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#f5f7fb;color:#172033;font-family:Arial,sans-serif}
.top{background:#111827;color:#fff;padding:18px 22px}.wrap{max-width:1100px;margin:auto}
.brand{font-size:24px;font-weight:700}.sub{opacity:.75;margin-top:5px}
.layout{display:grid;grid-template-columns:220px 1fr;gap:18px;max-width:1100px;margin:22px auto;padding:0 16px}
nav,.card{background:#fff;border:1px solid #e5e7eb;border-radius:16px;box-shadow:0 4px 18px #00000008}
nav{padding:10px;height:max-content}nav a{display:block;padding:11px;border-radius:10px;color:#172033;text-decoration:none}
nav a:hover{background:#f1f5f9}.section{padding:22px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.stat{padding:16px;border:1px solid #e5e7eb;border-radius:12px}.num{font-size:25px;font-weight:700;margin-top:5px}
.request{margin-top:12px;padding:15px;border:1px solid #e5e7eb;border-radius:12px}
.status{display:inline-block;padding:5px 9px;border-radius:999px;font-size:13px}.pending{background:#fff7ed;color:#9a3412}.approved{background:#ecfdf3;color:#067647}.rejected{background:#fef3f2;color:#b42318}
button{border:0;border-radius:9px;padding:9px 13px;background:#111827;color:#fff;cursor:pointer;margin:8px 5px 0 0}
.reject{background:#fff;border:1px solid #d0d5dd;color:#344054}.muted{color:#667085}
@media(max-width:700px){.layout{grid-template-columns:1fr}nav{display:grid;grid-template-columns:1fr 1fr}.grid{grid-template-columns:1fr}}
</style></head><body>
<header class="top"><div class="wrap"><div class="brand">Syria Commerce</div><div class="sub">سحب العمولات</div></div></header>
<div class="layout"><nav>
<a href="/">🏠 الرئيسية</a><a href="/dashboard">👥 المسوقون</a><a href="/products">📦 المنتجات</a>
<a href="/orders">🧾 الطلبات</a><a href="/commissions">💰 العمولات</a><a href="/customers">👤 العملاء</a>
<a href="/reports">📊 التقارير</a><a href="/notifications">🔔 الإشعارات</a><a href="/search">🔎 البحث</a>
<a href="/support">🎧 دعم العملاء</a><a href="/payouts">💸 سحب العمولات</a>
</nav><main><div class="card section">
<h1>💸 سحب العمولات</h1><p class="muted">مراجعة طلبات سحب العمولات وتغيير حالتها.</p>
<div class="grid">
<div class="stat"><div class="muted">طلبات معلقة</div><div class="num" id="pendingCount">2</div></div>
<div class="stat"><div class="muted">تمت الموافقة</div><div class="num">5</div></div>
<div class="stat"><div class="muted">إجمالي المبلغ المعلق</div><div class="num" id="total">85 د.أ</div></div>
</div>
<div id="requests">
<div class="request"><b>#PAY-2001 — أحمد</b><p class="muted">المبلغ: 50 د.أ · طريقة السحب: تحويل بنكي</p><span class="status pending">معلق</span><br><button onclick="approve(this)">موافقة</button><button class="reject" onclick="reject(this)">رفض</button></div>
<div class="request"><b>#PAY-2002 — محمد</b><p class="muted">المبلغ: 35 د.أ · طريقة السحب: محفظة إلكترونية</p><span class="status pending">معلق</span><br><button onclick="approve(this)">موافقة</button><button class="reject" onclick="reject(this)">رفض</button></div>
</div>
</div></main></div>
<script>
function finish(btn,text,cls){
 const box=btn.parentElement,status=box.querySelector(".status");
 status.className="status "+cls;status.textContent=text;
 box.querySelectorAll("button").forEach(x=>x.remove());
 const n=document.getElementById("pendingCount");n.textContent=Math.max(0,Number(n.textContent)-1);
}
function approve(btn){finish(btn,"تمت الموافقة","approved")}
function reject(btn){finish(btn,"مرفوض","rejected")}
</script></body></html>`,"سحب العمولات");
}


function dataManagementPage() {
  return htmlResponse(`<!doctype html><html lang="ar" dir="rtl"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>إدارة البيانات | Syria Commerce</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#f5f7fb;color:#172033;font-family:Arial,sans-serif}
.top{background:#111827;color:#fff;padding:18px 22px}.wrap{max-width:1100px;margin:auto}
.brand{font-size:24px;font-weight:700}.sub{opacity:.75;margin-top:5px}
.layout{display:grid;grid-template-columns:220px 1fr;gap:18px;max-width:1100px;margin:22px auto;padding:0 16px}
nav,.card{background:#fff;border:1px solid #e5e7eb;border-radius:16px;box-shadow:0 4px 18px #00000008}
nav{padding:10px;height:max-content}nav a{display:block;padding:11px;border-radius:10px;color:#172033;text-decoration:none}
nav a:hover{background:#f1f5f9}.section{padding:22px}
.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;margin-top:18px}
.box{padding:18px;border:1px solid #e5e7eb;border-radius:13px}.box h3{margin-top:0}
button{border:0;border-radius:9px;padding:10px 15px;background:#111827;color:#fff;cursor:pointer;margin-top:8px}
.muted{color:#667085}.status{margin-top:18px;padding:13px;border-radius:10px;background:#ecfdf3;color:#067647}
.note{margin-top:18px;padding:14px;border:1px dashed #d0d5dd;border-radius:12px}
@media(max-width:700px){.layout{grid-template-columns:1fr}nav{display:grid;grid-template-columns:1fr 1fr}.grid{grid-template-columns:1fr}}
</style></head><body>
<header class="top"><div class="wrap"><div class="brand">Syria Commerce</div><div class="sub">إدارة البيانات</div></div></header>
<div class="layout"><nav>
<a href="/">🏠 الرئيسية</a><a href="/dashboard">👥 المسوقون</a><a href="/products">📦 المنتجات</a>
<a href="/orders">🧾 الطلبات</a><a href="/commissions">💰 العمولات</a><a href="/customers">👤 العملاء</a>
<a href="/reports">📊 التقارير</a><a href="/notifications">🔔 الإشعارات</a><a href="/search">🔎 البحث</a>
<a href="/support">🎧 دعم العملاء</a><a href="/payouts">💸 سحب العمولات</a><a href="/data">🗄️ إدارة البيانات</a>
</nav>
<main><div class="card section"><h1>🗄️ إدارة البيانات</h1>
<p class="muted">مركز التحكم ببيانات الموقع وتجهيز أدوات الاستيراد والتصدير والنسخ الاحتياطي.</p>
<div class="grid">
<div class="box"><h3>📦 بيانات المنتجات</h3><p class="muted">إدارة بيانات المنتجات عند ربط قاعدة البيانات.</p><button onclick="info()">فتح</button></div>
<div class="box"><h3>👥 بيانات العملاء</h3><p class="muted">عرض وتعديل بيانات العملاء لاحقاً.</p><button onclick="info()">فتح</button></div>
<div class="box"><h3>👨‍💼 بيانات المسوقين</h3><p class="muted">إدارة بيانات المسوقين وحساباتهم.</p><button onclick="info()">فتح</button></div>
<div class="box"><h3>🧾 بيانات الطلبات</h3><p class="muted">مراجعة وتنظيم بيانات الطلبات.</p><button onclick="info()">فتح</button></div>
<div class="box"><h3>📥 استيراد البيانات</h3><p class="muted">واجهة تجهيز للاستيراد الجماعي.</p><button onclick="info()">تجهيز</button></div>
<div class="box"><h3>📤 تصدير البيانات</h3><p class="muted">واجهة تجهيز لتصدير البيانات CSV/Excel.</p><button onclick="info()">تجهيز</button></div>
</div>
<div id="msg" class="status">الواجهة جاهزة — الربط الفعلي بقاعدة البيانات يأتي لاحقاً ✅</div>
<div class="note"><b>ملاحظة:</b> هذه المرحلة لا تحذف أو تعدّل بيانات حقيقية، ولا تعتمد على قاعدة البيانات.</div>
</div></main></div>
<script>function info(){document.getElementById("msg").textContent="تم اختيار القسم. سيتم تفعيل العملية عند ربط قاعدة البيانات.";}</script>
</body></html>`,"إدارة البيانات");
}

async function dashboard(env) {
  const rows = await listMarketers(getStore(env));
  const dbState = getStore(env) ? "متصل" : "وضع تجريبي — قاعدة البيانات لم تُربط بعد";
  const tr = rows.map(x => `<tr><td>${x.code}</td><td>${x.name}</td><td>${x.phone}</td><td>${x.governorate}</td><td>${new Date(x.created_at).toLocaleString("ar-JO")}</td></tr>`).join("");
  return htmlResponse(`<header><main><h1>Syria Commerce</h1><span class="badge">لوحة المسوقين — المرحلة 2</span></main></header>
<main>
<div class="card"><div class="notice">${dbState}</div></div>
<div class="grid">
<div class="card"><div class="muted">عدد المسوقين</div><div class="stat">${rows.length}</div></div>
<div class="card"><div class="muted">حالة النظام</div><div class="stat">✓</div></div>
</div>
<div class="card"><h2>إضافة مسوق</h2>
<form id="f"><div class="row">
<div><label>الاسم</label><input name="name" required></div>
<div><label>الهاتف</label><input name="phone" required></div>
</div><div style="margin-top:12px"><label>المحافظة</label><select name="governorate" required>
<option value="">اختر المحافظة</option><option>دمشق</option><option>ريف دمشق</option><option>حلب</option><option>حمص</option><option>حماة</option><option>اللاذقية</option><option>طرطوس</option><option>إدلب</option><option>درعا</option><option>السويداء</option><option>القنيطرة</option><option>دير الزور</option><option>الرقة</option><option>الحسكة</option>
</select></div><button class="btn" style="margin-top:14px">تسجيل المسوق</button></form>
<p id="msg" class="muted"></p></div>
<div class="card"><h2>المسوقون</h2><div style="overflow:auto"><table><thead><tr><th>الكود</th><th>الاسم</th><th>الهاتف</th><th>المحافظة</th><th>التاريخ</th></tr></thead><tbody>${tr || "<tr><td colspan=5>لا يوجد مسوقون</td></tr>"}</tbody></table></div></div>
</main>
<script>
document.querySelector("#f").addEventListener("submit",async e=>{
 e.preventDefault(); const f=new FormData(e.target); const msg=document.querySelector("#msg");
 const r=await fetch("/api/marketers",{headers:{"content-type":"application/json"},method:"POST",body:JSON.stringify(Object.fromEntries(f))});
 const d=await r.json(); msg.textContent=d.ok?"تم التسجيل — الكود: "+d.marketer.code:(d.error||"حدث خطأ");
 if(d.ok) setTimeout(()=>location.reload(),700);
});
</script>`, "لوحة المسوقين");
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/") {
      return htmlResponse(`<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Syria Commerce | سوقك أسهل</title>
<style>
:root{--ink:#111827;--muted:#667085;--line:#e8eaef;--bg:#f6f7f9;--card:#fff;--soft:#f0f2f5;--accent:#111827;--accent2:#2563eb}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--bg);color:var(--ink);font-family:Arial,Tahoma,sans-serif}
a{text-decoration:none;color:inherit}.wrap{max-width:1220px;margin:auto;padding:0 20px}
.top{background:#fff;border-bottom:1px solid var(--line);position:sticky;top:0;z-index:50}.nav{height:72px;display:flex;align-items:center;gap:22px}
.logo{font-size:23px;font-weight:900;letter-spacing:-.4px;white-space:nowrap}.logo span{font-weight:500;color:#667085}
.links{display:flex;align-items:center;gap:3px;flex:1}.links a{padding:10px 12px;border-radius:10px;color:#475467;font-weight:600}.links a:hover{background:var(--soft);color:var(--ink)}
.navActions{display:flex;gap:8px}.btn{display:inline-flex;align-items:center;justify-content:center;border:0;border-radius:11px;padding:11px 17px;font-weight:800;cursor:pointer}.dark{background:var(--accent);color:#fff}.light{background:var(--soft);color:var(--ink)}.blue{background:var(--accent2);color:#fff}
.hero{background:#fff;padding:55px 0 32px}.heroGrid{display:grid;grid-template-columns:1fr 1fr;gap:50px;align-items:center}
.eyebrow{display:inline-flex;padding:7px 11px;background:#eef2ff;color:#3730a3;border-radius:999px;font-size:13px;font-weight:800}
h1{font-size:52px;line-height:1.1;letter-spacing:-1.6px;margin:18px 0 15px}.lead{font-size:18px;line-height:1.9;color:var(--muted);max-width:650px;margin:0 0 24px}.heroBtns{display:flex;gap:10px;flex-wrap:wrap}
.searchBox{margin-top:25px;background:#f8fafc;border:1px solid var(--line);border-radius:15px;padding:8px;display:flex;gap:8px;max-width:650px}.searchBox input{border:0;outline:0;background:transparent;flex:1;padding:11px;font-size:15px;direction:rtl}.searchBox button{border:0;border-radius:10px;padding:11px 17px;font-weight:800;background:#111827;color:#fff}
.heroVisual{background:#111827;border-radius:27px;padding:16px;box-shadow:0 22px 55px #00000016}.shop{background:#fff;border-radius:18px;padding:16px}.shopHead{display:flex;justify-content:space-between;align-items:center;padding-bottom:13px;border-bottom:1px solid var(--line)}.shopHead b{font-size:17px}.avatar{width:34px;height:34px;border-radius:50%;background:var(--soft)}
.shopSearch{margin:13px 0;background:var(--bg);border-radius:10px;padding:11px;color:#98a2b3;font-size:12px}.chips{display:flex;gap:7px;overflow:hidden}.chip{background:var(--soft);padding:7px 10px;border-radius:999px;font-size:11px;white-space:nowrap}
.showcase{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-top:12px}.item{border:1px solid var(--line);border-radius:12px;padding:9px}.itemPic{height:105px;border-radius:9px;background:var(--soft);display:flex;align-items:center;justify-content:center;font-size:35px}.item b{display:block;margin-top:8px;font-size:12px}.item small{display:block;color:var(--muted);margin-top:4px}
.section{padding:43px 0}.sectionHead{display:flex;align-items:end;justify-content:space-between;gap:15px;margin-bottom:18px}.sectionHead h2{margin:0;font-size:29px}.sectionHead p{margin:7px 0 0;color:var(--muted)}
.categories{display:grid;grid-template-columns:repeat(6,1fr);gap:11px}.cat{background:#fff;border:1px solid var(--line);border-radius:15px;padding:19px 12px;text-align:center;font-weight:800}.cat .catIcon{font-size:28px;margin-bottom:9px}.cat:hover{transform:translateY(-2px);box-shadow:0 10px 24px #0000000a}
.products{display:grid;grid-template-columns:repeat(4,1fr);gap:15px}.product{background:#fff;border:1px solid var(--line);border-radius:17px;padding:11px}.productPic{height:190px;background:var(--soft);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:45px}.product h3{font-size:16px;margin:13px 2px 5px}.desc{font-size:13px;color:var(--muted);margin:0 2px 10px}.price{font-size:19px;font-weight:900;margin:0 2px 12px}.product .btn{width:100%}
.how{display:grid;grid-template-columns:repeat(3,1fr);gap:15px}.step{background:#fff;border:1px solid var(--line);border-radius:17px;padding:22px}.num{width:35px;height:35px;border-radius:10px;background:#111827;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:900}.step h3{margin:13px 0 7px}.step p{color:var(--muted);line-height:1.75;margin:0}
.marketer{background:#111827;color:#fff;border-radius:25px;padding:36px}.marketerGrid{display:grid;grid-template-columns:1fr auto;align-items:center;gap:25px}.marketer h2{font-size:30px;margin:0 0 9px}.marketer p{color:#cbd5e1;line-height:1.8;margin:0;max-width:700px}.marketer .light{background:#fff}
.trust{display:grid;grid-template-columns:repeat(3,1fr);gap:15px}.trustCard{background:#fff;border:1px solid var(--line);border-radius:17px;padding:21px}.trustCard b{display:block;margin-bottom:7px}.trustCard span{color:var(--muted);line-height:1.7;font-size:14px}
.footer{background:#fff;border-top:1px solid var(--line);margin-top:15px;padding:27px 0}.footerGrid{display:flex;justify-content:space-between;gap:20px;color:var(--muted);font-size:13px}.footerLinks{display:flex;gap:18px}.footerLinks a:hover{color:var(--ink)}
@media(max-width:950px){.heroGrid{grid-template-columns:1fr}.categories{grid-template-columns:repeat(3,1fr)}.products{grid-template-columns:repeat(2,1fr)}}
@media(max-width:600px){.links{display:none}.nav{justify-content:space-between}.navActions .light{display:none}h1{font-size:38px}.hero{padding-top:38px}.categories,.products,.how,.trust{grid-template-columns:1fr}.showcase{grid-template-columns:1fr}.marketerGrid{grid-template-columns:1fr}.footerGrid{flex-direction:column}.searchBox{display:none}}
</style>
</head>
<body>
<header class="top"><div class="wrap nav">
<a class="logo" href="/">Syria Commerce <span>سوريا</span></a>
<nav class="links">
<a href="/">الرئيسية</a><a href="/products">المنتجات</a><a href="/cart">السلة</a><a href="/marketer">المسوّق</a>
</nav>
<div class="navActions"><a class="btn light" href="/login">تسجيل الدخول</a><a class="btn dark" href="/products">تسوّق الآن</a></div>
</div></header>

<main>
<section class="hero"><div class="wrap heroGrid">
<div>
<span class="eyebrow">منصة تجارة إلكترونية للسوق السوري</span>
<h1>كل ما تحتاجه للتجارة،<br>في مكان واحد.</h1>
<p class="lead">اكتشف المنتجات، اطلب بسهولة، أو ابدأ كمسوّق واختر المنتجات التي تريد تسويقها. تجربة مصممة لتكون بسيطة وسريعة من أول خطوة.</p>
<div class="heroBtns"><a class="btn dark" href="/products">ابدأ التسوق</a><a class="btn light" href="/register">ابدأ كمسوّق</a></div>
<form class="searchBox" action="/products" method="get"><input name="q" placeholder="ابحث عن منتج..." aria-label="البحث عن منتج"><button type="submit">بحث</button></form>
</div>
<div class="heroVisual"><div class="shop">
<div class="shopHead"><b>Syria Commerce</b><div class="avatar"></div></div>
<div class="shopSearch">🔎 ابحث عن منتج أو تصنيف...</div>
<div class="chips"><span class="chip">الأكثر مبيعاً</span><span class="chip">عروض اليوم</span><span class="chip">جديد</span></div>
<div class="showcase"><div class="item"><div class="itemPic">🛍️</div><b>منتجات مميزة</b><small>اكتشف الآن</small></div><div class="item"><div class="itemPic">🔥</div><b>عروض حصرية</b><small>شاهد العروض</small></div></div>
</div></div>
</div></section>

<section class="section"><div class="wrap">
<div class="sectionHead"><div><h2>تصفح حسب التصنيف</h2><p>وصل للمنتج الذي تبحث عنه بسرعة</p></div><a class="btn light" href="/products">كل المنتجات</a></div>
<div class="categories">
<a class="cat" href="/products"><div class="catIcon">👕</div>ملابس</a>
<a class="cat" href="/products"><div class="catIcon">💄</div>جمال</a>
<a class="cat" href="/products"><div class="catIcon">🏠</div>منزل</a>
<a class="cat" href="/products"><div class="catIcon">📱</div>إلكترونيات</a>
<a class="cat" href="/products"><div class="catIcon">🧴</div>عناية</a>
<a class="cat" href="/products"><div class="catIcon">🎁</div>عروض</a>
</div></div></section>

<section class="section"><div class="wrap">
<div class="sectionHead"><div><h2>منتجات مختارة</h2><p>اكتشف بعض المنتجات المتاحة على المنصة</p></div><a class="btn light" href="/products">عرض الكل</a></div>
<div class="products">
<article class="product"><div class="productPic">📦</div><h3>منتج مميز</h3><p class="desc">تفاصيل المنتج ستظهر هنا</p><div class="price">—</div><a class="btn dark" href="/products">عرض المنتج</a></article>
<article class="product"><div class="productPic">🛍️</div><h3>اختيار جديد</h3><p class="desc">اكتشف المنتجات الجديدة</p><div class="price">—</div><a class="btn dark" href="/products">عرض المنتج</a></article>
<article class="product"><div class="productPic">⭐</div><h3>الأكثر طلباً</h3><p class="desc">منتجات يفضلها العملاء</p><div class="price">—</div><a class="btn dark" href="/products">عرض المنتج</a></article>
<article class="product"><div class="productPic">🔥</div><h3>عرض مميز</h3><p class="desc">تابع أحدث العروض</p><div class="price">—</div><a class="btn dark" href="/products">عرض المنتج</a></article>
</div></div></section>

<section class="section"><div class="wrap">
<div class="sectionHead"><div><h2>كيف تعمل Syria Commerce؟</h2><p>ثلاث خطوات وتبدأ</p></div></div>
<div class="how">
<div class="step"><div class="num">1</div><h3>اختر</h3><p>تصفح المنتجات والتصنيفات واختر ما يناسبك.</p></div>
<div class="step"><div class="num">2</div><h3>اطلب</h3><p>أضف المنتج إلى السلة وأرسل طلبك بسهولة.</p></div>
<div class="step"><div class="num">3</div><h3>تابع</h3><p>تابع طلباتك من حسابك واستمتع بتجربة واضحة.</p></div>
</div></div></section>

<section class="section"><div class="wrap">
<div class="marketer"><div class="marketerGrid">
<div><h2>حوّل التسويق إلى فرصة دخل</h2><p>كمسوّق، تستطيع اختيار المنتجات المناسبة وتسويقها لعملائك، ثم متابعة طلباتك وعمولاتك من حسابك.</p></div>
<a class="btn light" href="/register">انضم كمسوّق</a>
</div></div>
</div></section>

<section class="section"><div class="wrap">
<div class="sectionHead"><div><h2>تجربة مصممة لك</h2><p>وضوح في كل خطوة</p></div></div>
<div class="trust">
<div class="trustCard"><b>🛒 تسوق واضح</b><span>واجهة بسيطة تساعدك على اكتشاف المنتج وإكمال الطلب بسرعة.</span></div>
<div class="trustCard"><b>⚡ تجربة سريعة</b><span>الوصول للمنتجات والحساب والسلة بدون خطوات غير ضرورية.</span></div>
<div class="trustCard"><b>🤝 للمسوّق والعميل</b><span>كل مستخدم لديه تجربة مناسبة لدوره داخل المنصة.</span></div>
</div></div></section>
</main>

<footer class="footer"><div class="wrap footerGrid"><div>© Syria Commerce — جميع الحقوق محفوظة</div><div class="footerLinks"><a href="/products">المنتجات</a><a href="/login">دخول</a><a href="/register">التسجيل</a></div></div></footer>
</body></html>`,"Syria Commerce | الرئيسية");
    }
    
    
    
    if (request.method === "GET" && url.pathname === "/products") return productsPage(env);
    if (request.method === "GET" && url.pathname === "/orders") return ordersPage(env);
    if (request.method === "GET" && url.pathname === "/commissions") return commissionsPage(env);
    if (request.method === "GET" && url.pathname === "/customers") return customersPage(env);
    if (request.method === "GET" && url.pathname === "/reports") return reportsPage(env);
    if (request.method === "GET" && url.pathname === "/settings") return settingsPage(env);
    if (request.method === "GET" && url.pathname === "/permissions") return permissionsPage(env);
    if (request.method === "GET" && url.pathname === "/activity") return activityPage(env);
    if (request.method === "GET" && url.pathname === "/notifications") return notificationsPage(env);


        if (request.method === "GET" && url.pathname === "/search") return searchPage();
    if (request.method === "GET" && url.pathname === "/login") return authPage();
    if (request.method === "GET" && url.pathname === "/register") return registerPage();
    if (request.method === "GET" && url.pathname === "/support") return supportPage();
    if (request.method === "GET" && url.pathname === "/payouts") return payoutsPage();
    if (request.method === "GET" && url.pathname === "/data") return dataManagementPage();
if (request.method === "GET" && url.pathname === "/dashboard") return dashboard(env);
    if (request.method === "GET" && url.pathname === "/api/health") return json({ok:true,phase:"2",service:"syria-commerce"});
    if (request.method === "GET" && url.pathname === "/api/marketers") return json({ok:true,marketers:await listMarketers(getStore(env))});
    if (request.method === "GET" && url.pathname === "/api/products") return json({ok:true,products:await listProducts(getStore(env))});
    if (request.method === "GET" && url.pathname === "/api/orders") return json({ok:true,orders:await listOrders(getStore(env))});
    if (request.method === "POST" && url.pathname === "/api/orders") return createOrder(request,env);
    if (request.method === "PATCH" && url.pathname === "/api/orders") return updateOrder(request,env);
    if (request.method === "POST" && url.pathname === "/api/products") return createProduct(request,env);
    if (request.method === "DELETE" && url.pathname === "/api/products") return deleteProduct(request,env);
    if (request.method === "POST" && url.pathname === "/api/marketers") return register(request,env);
    return json({ok:false,error:"Not Found"},404);
  }
};
