
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
<title>Syria Commerce — ابنِ تجارتك من جمهورك</title>
<style>
:root{--neon:#19f0a0;--green:#0bc77d;--teal:#00b9a5;--ink:#071a18;--muted:#70817d;--line:#e3ece8;--soft:#f4f8f6;--dark:#031617;--dark2:#062a27;--white:#fff;--violet:#806cff}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--soft);color:var(--ink);font-family:Arial,Tahoma,sans-serif;overflow-x:hidden}a{text-decoration:none;color:inherit}.wrap{max-width:1320px;margin:auto;padding:0 26px}
.top{height:34px;background:#020e10;color:#a9c8c1;font-size:10px}.topIn{height:100%;display:flex;justify-content:space-between;align-items:center}.topIn div{display:flex;gap:20px}
.nav{height:82px;background:#fff;border-bottom:1px solid var(--line);position:sticky;top:0;z-index:80}.navIn{height:100%;display:flex;align-items:center;gap:35px}.brand{display:flex;align-items:center;gap:10px;font-weight:950;font-size:22px;white-space:nowrap}.mark{width:44px;height:44px;border-radius:14px;background:linear-gradient(145deg,var(--neon),#0cae72);color:#03231d;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:1000;box-shadow:0 10px 28px #19f0a044}.brand small{display:block;color:#7b8985;font-size:7px;letter-spacing:2.7px;margin-top:2px}.links{display:flex;gap:1px;flex:1}.links a{padding:11px 13px;border-radius:10px;color:#394b47;font-weight:850;font-size:12px}.links a.active,.links a:hover{color:#087e5a;background:#edfbf5}.navActions{display:flex;gap:8px}.btn{display:inline-flex;align-items:center;justify-content:center;border-radius:12px;padding:13px 19px;font-size:12px;font-weight:950;border:1px solid transparent;transition:.2s;cursor:pointer}.btn:hover{transform:translateY(-2px)}.g{background:linear-gradient(135deg,var(--neon),#0bbd78);color:#03231d;box-shadow:0 9px 22px #12d99038}.d{background:#062f2c;color:#fff}.l{background:#fff;color:#07352f}.outline{background:#fff;border-color:#b9d9cf;color:#0a5949}
.hero{position:relative;background:var(--dark);color:#fff;min-height:710px;overflow:hidden}.hero:before{content:"";position:absolute;inset:-40% -10% auto auto;width:850px;height:850px;background:radial-gradient(circle,#0a6b55 0,transparent 65%);opacity:.85}.hero:after{content:"";position:absolute;inset:auto auto -70% -15%;width:750px;height:750px;background:radial-gradient(circle,#006f65 0,transparent 67%);opacity:.38}.grid{position:absolute;inset:0;background-image:linear-gradient(#ffffff06 1px,transparent 1px),linear-gradient(90deg,#ffffff06 1px,transparent 1px);background-size:55px 55px;mask-image:linear-gradient(to bottom,black,transparent 90%)}.heroIn{position:relative;z-index:2;min-height:710px;display:grid;grid-template-columns:1fr 1fr;align-items:center;gap:55px}.copy{padding:70px 0 80px}.eyebrow{display:inline-flex;align-items:center;gap:8px;padding:8px 13px;border:1px solid #20d99855;background:#0a4038;border-radius:999px;color:#c8f9e8;font-size:10px;font-weight:950;box-shadow:inset 0 0 20px #13df9320}.eyebrow i{width:6px;height:6px;background:var(--neon);border-radius:50%;box-shadow:0 0 12px var(--neon)}.copy h1{font-size:72px;line-height:1.01;letter-spacing:-4px;margin:23px 0 20px}.copy h1 .shine{background:linear-gradient(100deg,#fff 0%,var(--neon) 45%,#7fffd0 100%);-webkit-background-clip:text;color:transparent}.copy p{font-size:18px;line-height:1.9;color:#b8d2cc;max-width:670px;margin:0 0 27px}.heroBtns{display:flex;gap:9px;flex-wrap:wrap}.heroBtns .g{padding:15px 23px}.heroBtns .l{background:#ffffff12;border-color:#ffffff2b;color:#fff}.proof{display:flex;gap:20px;flex-wrap:wrap;margin-top:18px;color:#91b5ad;font-size:10px}.proof span:before{content:"✓";color:var(--neon);font-weight:1000;margin-left:5px}
.visual{height:610px;position:relative;display:flex;align-items:center;justify-content:center}.halo{position:absolute;width:540px;height:540px;border-radius:50%;background:radial-gradient(circle,#12d89022,transparent 68%);filter:blur(5px)}.dashboard{width:570px;background:#f9fcfb;border:1px solid #ffffff33;color:var(--ink);border-radius:25px;padding:17px;box-shadow:0 45px 110px #000b;transform:perspective(1000px) rotateY(-5deg) rotateX(2deg) rotateZ(1deg);z-index:3}.dashbar{height:31px;display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}.dots{display:flex;gap:4px}.dots i{width:6px;height:6px;border-radius:50%;background:#c9d4d0}.dashTitle{font-size:12px;font-weight:950}.dashTitle span{font-size:8px;color:#7a8985;font-weight:normal;margin-right:5px}.metrics{display:grid;grid-template-columns:1.35fr 1fr 1fr;gap:8px}.metric{background:#f0f6f3;border:1px solid #e3ece8;border-radius:12px;padding:11px}.metric small{display:block;color:#778680;font-size:8px;margin-bottom:6px}.metric b{font-size:16px}.metric.main{background:linear-gradient(145deg,#e4fbf1,#f5fcf9);border-color:#c7ecdd}.metric.main b{font-size:21px;color:#079765}.trend{font-size:8px;color:#079765;margin-top:4px;font-weight:900}.panel{background:#fff;border:1px solid #e2eae7;border-radius:13px;margin-top:9px;padding:12px}.panelHead{display:flex;justify-content:space-between;align-items:center;font-size:9px}.panelHead b{font-size:10px}.panelHead span{color:#08a36d;font-weight:900}.chart{height:145px;margin-top:4px;position:relative}.chart svg{width:100%;height:100%}.miniGrid line{stroke:#dfe8e4;stroke-dasharray:3 4}.area{fill:url(#fade)}.curve{fill:none;stroke:#09bd7b;stroke-width:4;stroke-linecap:round;stroke-linejoin:round}.dot{fill:#fff;stroke:#09bd7b;stroke-width:3}.dashGrid{display:grid;grid-template-columns:1.2fr .8fr;gap:9px;margin-top:9px}.orders,.best{background:#fff;border:1px solid #e2eae7;border-radius:13px;padding:11px}.row{display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-top:1px solid #edf1ef;font-size:8px}.row:first-child{border-top:0}.row span{color:#75847f}.ok{color:#079765;font-weight:950}.float{position:absolute;z-index:5;background:#fff;color:#0c2b26;border-radius:15px;padding:12px 15px;box-shadow:0 20px 45px #0008;border:1px solid #ffffff33}.float small{display:block;color:#71827e;font-size:8px}.float b{font-size:12px;display:block;margin-top:4px}.f1{top:83px;right:-4px}.f1 b{color:#079765}.f2{left:-10px;bottom:82px}.f2 b{font-size:15px}.f2 strong{color:#079765}.spark{position:absolute;right:50px;bottom:18px;color:#75cdb0;font-size:8px;letter-spacing:2px}
.section{padding:70px 0}.white{background:#fff}.head{text-align:center;margin-bottom:31px}.head .kicker{color:#079765;font-size:10px;font-weight:950;letter-spacing:1px}.head h2{font-size:36px;letter-spacing:-1.2px;margin:8px 0}.head p{color:var(--muted);font-size:13px;margin:0}
.steps{display:grid;grid-template-columns:repeat(4,1fr);gap:13px}.step{position:relative;background:#fff;border:1px solid var(--line);border-radius:19px;padding:25px;overflow:hidden}.step:before{content:"";position:absolute;top:0;right:0;left:0;height:3px;background:linear-gradient(90deg,transparent,var(--green),transparent);opacity:.5}.num{font-size:10px;color:#079765;background:#e9faf3;border-radius:9px;padding:7px 9px;display:inline-block;font-weight:1000}.step h3{font-size:16px;margin:16px 0 7px}.step p{font-size:11px;color:var(--muted);line-height:1.8;margin:0}
.market{background:#071c1b;color:#fff;position:relative;overflow:hidden}.market:before{content:"";position:absolute;width:600px;height:600px;left:-250px;top:-200px;background:radial-gradient(circle,#08c98218,transparent 65%)}.marketIn{position:relative}.market .head p{color:#99b8b1}.market .head h2{color:#fff}.productTop{display:flex;align-items:end;justify-content:space-between;margin-bottom:22px}.productTop h2{font-size:29px;margin:0 0 5px}.productTop p{font-size:11px;color:#93b4ad;margin:0}.productTop .btn{background:#ffffff0c;border-color:#ffffff20;color:#fff}.products{display:grid;grid-template-columns:repeat(4,1fr);gap:13px}.pcard{background:#0b2927;border:1px solid #1a4641;border-radius:18px;padding:11px;transition:.2s}.pcard:hover{transform:translateY(-4px);border-color:#2a6b60}.pimage{height:180px;border-radius:12px;background:linear-gradient(145deg,#173a36,#0c2826);display:flex;align-items:center;justify-content:center;font-size:54px;box-shadow:inset 0 0 40px #0003}.ptag{display:inline-block;background:#0d4d40;color:#79efc1;font-size:8px;font-weight:950;padding:5px 7px;border-radius:6px;margin-top:10px}.pcard h3{font-size:13px;margin:8px 2px 5px}.pcard p{font-size:10px;color:#8eada6;margin:0 2px 10px}.profitRow{display:flex;align-items:center;justify-content:space-between;background:#0e312e;border:1px solid #1a4943;border-radius:10px;padding:9px}.profitRow small{display:block;color:#88a9a1;font-size:7px}.profitRow b{display:block;color:#48e4ad;font-size:12px;margin-top:3px}.marketBtn{padding:8px 10px;font-size:9px}
.features{display:grid;grid-template-columns:1fr 1fr;gap:15px}.feature{min-height:320px;border-radius:23px;padding:34px}.feature.dark{background:linear-gradient(140deg,#062e2b,#041c1e);color:#fff}.feature.dark p{color:#a8c5be}.feature.mint{background:linear-gradient(140deg,#e7faf2,#f8fcfa);border:1px solid #d3eee2}.feature h2{font-size:27px;margin:0 0 9px}.feature p{font-size:12px;line-height:1.8;margin:0}.toolGrid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:23px}.tool{background:#0b3b36;border:1px solid #19564e;border-radius:11px;padding:12px}.tool b{display:block;font-size:10px}.tool span{display:block;color:#93b9b0;font-size:8px;margin-top:3px}.bigProfit{font-size:48px;letter-spacing:-2px;font-weight:1000;color:#078f64;margin-top:30px}.profitMeta{color:#71817d;font-size:9px}.barWrap{margin-top:22px}.barLine{height:9px;background:#dcece5;border-radius:99px;overflow:hidden}.barFill{height:100%;width:78%;background:linear-gradient(90deg,#0bbd78,var(--neon));border-radius:99px}.barLabels{display:flex;justify-content:space-between;color:#6e807b;font-size:8px;margin-top:6px}
.statsBand{background:#fff;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}.statsIn{display:grid;grid-template-columns:repeat(4,1fr)}.band{padding:28px;text-align:center;border-left:1px solid var(--line)}.band:last-child{border-left:0}.band b{font-size:25px;display:block}.band span{font-size:9px;color:var(--muted);display:block;margin-top:4px}
.cta{position:relative;overflow:hidden;background:linear-gradient(120deg,#052d2b,#08745a 58%,#0a9e70);border-radius:26px;padding:48px;color:#fff;display:flex;align-items:center;justify-content:space-between;gap:30px;box-shadow:0 25px 60px #064a3b2a}.cta:after{content:"";position:absolute;width:300px;height:300px;left:-90px;bottom:-160px;border-radius:50%;background:#19f0a02b}.cta h2{font-size:35px;margin:0 0 8px;position:relative;z-index:2}.cta p{color:#c5ded8;margin:0;font-size:12px;position:relative;z-index:2}.cta .l{position:relative;z-index:2;background:#fff;color:#06352f;padding:14px 23px;white-space:nowrap}
.footer{background:#fff;border-top:1px solid var(--line);padding:31px 0}.foot{display:flex;justify-content:space-between;color:#73817e;font-size:10px}.footLinks{display:flex;gap:18px}.footLinks a:hover{color:#078f64}
@media(max-width:1050px){.links{display:none}.heroIn{grid-template-columns:1fr}.copy{padding-bottom:0}.visual{height:570px}.steps,.products{grid-template-columns:repeat(2,1fr)}.statsIn{grid-template-columns:repeat(2,1fr)}.band{border-bottom:1px solid var(--line)}.features{grid-template-columns:1fr}}
@media(max-width:620px){.top{display:none}.nav{height:68px}.navIn{gap:0;justify-content:space-between}.navActions .l{display:none}.brand{font-size:18px}.hero,.heroIn{min-height:auto}.copy{padding:48px 0 10px}.copy h1{font-size:45px;letter-spacing:-2px}.copy p{font-size:15px}.visual{height:415px}.dashboard{width:100%;max-width:370px;padding:11px;transform:rotate(.5deg)}.float{padding:9px}.f1{right:0;top:20px}.f2{left:0;bottom:27px}.metrics{gap:4px}.metric{padding:8px}.metric b{font-size:12px}.metric.main b{font-size:15px}.chart{height:110px}.dashGrid{display:none}.section{padding:48px 0}.head h2{font-size:28px}.steps,.products,.statsIn{grid-template-columns:1fr}.productTop{align-items:start}.productTop .btn{display:none}.feature{padding:26px;min-height:auto}.bigProfit{font-size:39px}.cta{padding:31px 25px;flex-direction:column;align-items:flex-start}.cta h2{font-size:28px}.foot{flex-direction:column;gap:14px}}
</style>
</head>
<body>
<div class="top"><div class="wrap topIn"><div><span>✦ بدون مخزون</span><span>✦ منتجات جاهزة للتسويق</span><span>✦ تتبع أرباحك</span></div><div><span>دعم المسوّقين</span><span>مركز المساعدة</span></div></div></div>
<header class="nav"><div class="wrap navIn">
<a class="brand" href="/"><span class="mark">SC</span><span>Syria Commerce<small>COMMERCE • SELL • EARN</small></span></a>
<nav class="links"><a class="active" href="/">الرئيسية</a><a href="/products">المنتجات</a><a href="/marketer">كيف تربح؟</a><a href="/marketer">أدوات التسويق</a><a href="/login">لوحة المسوّق</a></nav>
<div class="navActions"><a class="btn l" href="/login">دخول</a><a class="btn g" href="/register">ابدأ الآن ↗</a></div>
</div></header>

<main>
<section class="hero"><div class="grid"></div><div class="wrap heroIn">
<div class="copy"><span class="eyebrow"><i></i> المنصة التي تحوّل التسويق إلى تجارة</span>
<h1>عندك جمهور؟<br><span class="shine">خلّيه يجيبلك أرباح.</span></h1>
<p>اختر منتجات رابحة، سوّقها بالطريقة التي تناسبك، وتابع كل طلب وكل دينار من أرباحك — بدون مستودع وبدون رأس مال كبير.</p>
<div class="heroBtns"><a class="btn g" href="/register">🚀 ابدأ كمسوّق مجاناً</a><a class="btn l" href="/products">شوف المنتجات ↗</a></div>
<div class="proof"><span>بدون مخزون</span><span>أدوات تسويق جاهزة</span><span>تتبع الطلبات والأرباح</span></div></div>
<div class="visual"><div class="halo"></div>
<div class="float f1"><small>نمو المبيعات</small><b>↗ +28.4%</b></div>
<div class="float f2"><small>أرباح متاحة</small><b>1,840,000 <strong>SYP</strong></b></div>
<div class="spark">SELL • TRACK • EARN</div>
<div class="dashboard">
<div class="dashbar"><div class="dots"><i></i><i></i><i></i></div><div class="dashTitle">لوحة تحكم المسوّق <span>Live overview</span></div></div>
<div class="metrics"><div class="metric main"><small>أرباح هذا الشهر</small><b>1,840,000</b><div class="trend">+28.4% ↑</div></div><div class="metric"><small>الطلبات</small><b>86</b><div class="trend">+14%</div></div><div class="metric"><small>المبيعات</small><b>12.4M</b><div class="trend">+21%</div></div></div>
<div class="panel"><div class="panelHead"><b>أداء المبيعات</b><span>آخر 30 يوم</span></div><div class="chart"><svg viewBox="0 0 520 145" preserveAspectRatio="none"><defs><linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0bc77d" stop-opacity=".20"/><stop offset="1" stop-color="#0bc77d" stop-opacity="0"/></linearGradient></defs><g class="miniGrid"><line x1="0" y1="30" x2="520" y2="30"/><line x1="0" y1="70" x2="520" y2="70"/><line x1="0" y1="110" x2="520" y2="110"/></g><path class="area" d="M0 122 L65 111 L125 118 L190 82 L255 91 L320 62 L380 70 L445 35 L520 16 L520 145 L0 145 Z"/><polyline class="curve" points="0,122 65,111 125,118 190,82 255,91 320,62 380,70 445,35 520,16"/><circle class="dot" cx="520" cy="16" r="5"/></svg></div></div>
<div class="dashGrid"><div class="orders"><div class="panelHead"><b>آخر الطلبات</b><span>عرض الكل</span></div><div class="row"><b>#SC-1842</b><span class="ok">تم التأكيد ✓</span></div><div class="row"><b>#SC-1839</b><span class="ok">تم الشحن ✓</span></div><div class="row"><b>#SC-1835</b><span>قيد المعالجة</span></div></div><div class="best"><div class="panelHead"><b>الأعلى ربحاً</b></div><div class="row"><b>ساعة رجالية</b><span class="ok">+80K</span></div><div class="row"><b>عطر رجالي</b><span class="ok">+65K</span></div><div class="row"><b>سماعة</b><span class="ok">+45K</span></div></div></div>
</div></div></div></section>

<section class="statsBand"><div class="wrap statsIn"><div class="band"><b>+1,200</b><span>مسوّق على المنصة</span></div><div class="band"><b>+8,500</b><span>طلب تم تسجيله</span></div><div class="band"><b>+320</b><span>منتج قابل للتسويق</span></div><div class="band"><b>24/7</b><span>منصة تعمل معك</span></div></div></section>

<section class="section"><div class="wrap"><div class="head"><div class="kicker">THE SIMPLE LOOP</div><h2>أربع خطوات. والباقي علينا.</h2><p>أنت ركّز على الوصول والبيع — Syria Commerce مصممة لتسهّل عليك الباقي.</p></div>
<div class="steps"><div class="step"><span class="num">01</span><h3>أنشئ حسابك</h3><p>سجّل كمسوّق وادخل إلى مساحة العمل الخاصة بك.</p></div><div class="step"><span class="num">02</span><h3>اختر منتجاً رابحاً</h3><p>شاهد السعر والربح المتوقع واختر ما يناسب جمهورك.</p></div><div class="step"><span class="num">03</span><h3>ابدأ التسويق</h3><p>استخدم الصور والمحتوى والروابط الجاهزة وابدأ البيع.</p></div><div class="step"><span class="num">04</span><h3>تابع أرباحك</h3><p>كل طلب وكل نتيجة تظهر لك بوضوح داخل حسابك.</p></div></div></div></section>

<section class="section market"><div class="wrap marketIn"><div class="head"><div class="kicker">HOT PRODUCTS</div><h2>منتجات تقدر تبدأ تسوّقها اليوم 🔥</h2><p>لا تبحث طويلاً — اختيارات جاهزة لتبدأ منها.</p></div>
<div class="products">
<article class="pcard"><div class="pimage">🎧</div><span class="ptag">الأكثر طلباً</span><h3>سماعة بلوتوث لاسلكية</h3><p>منتج واسع الجمهور وسهل الإعلان.</p><div class="profitRow"><div><small>ربح متوقع / بيع</small><b>45,000 SYP</b></div><a class="btn g marketBtn" href="/products">سوّق ↗</a></div></article>
<article class="pcard"><div class="pimage">⌚</div><span class="ptag">هامش قوي</span><h3>ساعة رجالية فاخرة</h3><p>منتج جذاب للمناسبات والاستخدام اليومي.</p><div class="profitRow"><div><small>ربح متوقع / بيع</small><b>80,000 SYP</b></div><a class="btn g marketBtn" href="/products">سوّق ↗</a></div></article>
<article class="pcard"><div class="pimage">🧴</div><span class="ptag">اختيار المسوّقين</span><h3>عطر رجالي أصلي</h3><p>مناسب للمحتوى والإعلانات المباشرة.</p><div class="profitRow"><div><small>ربح متوقع / بيع</small><b>65,000 SYP</b></div><a class="btn g marketBtn" href="/products">سوّق ↗</a></div></article>
<article class="pcard"><div class="pimage">🎒</div><span class="ptag">جديد</span><h3>حقيبة متعددة الاستخدام</h3><p>استخدام يومي وسهلة العرض للجمهور.</p><div class="profitRow"><div><small>ربح متوقع / بيع</small><b>38,000 SYP</b></div><a class="btn g marketBtn" href="/products">سوّق ↗</a></div></article>
</div></div></section>

<section class="section white"><div class="wrap"><div class="head"><div class="kicker">BUILT FOR SELLERS</div><h2>مش مجرد كتالوج منتجات.</h2><p>أعطينا المسوّق الأدوات التي يحتاجها حتى يتحول من ناشر إلى بائع.</p></div>
<div class="features"><div class="feature dark"><h2>كل أدوات التسويق في مكان واحد</h2><p>اختصر ساعات تجهيز المحتوى. افتح المنتج وخذ ما تحتاجه لتبدأ الحملة.</p><div class="toolGrid"><div class="tool"><b>📸 صور جاهزة</b><span>محتوى للمنشورات والإعلانات</span></div><div class="tool"><b>🎬 فيديوهات</b><span>مواد قصيرة للمنتج</span></div><div class="tool"><b>🔗 روابط تتبع</b><span>اعرف من أين جاء طلبك</span></div><div class="tool"><b>📊 تحليلات</b><span>شوف ما الذي يبيع فعلاً</span></div></div></div>
<div class="feature mint"><h2>أرقامك أمامك دائماً</h2><p>لا تخمّن. اعرف أداءك، راقب أرباحك، وركّز على المنتجات التي تستحق وقتك.</p><div class="bigProfit">1,840,000</div><div class="profitMeta">SYP أرباح مثال هذا الشهر</div><div class="barWrap"><div class="barLine"><div class="barFill"></div></div><div class="barLabels"><span>هدف الشهر</span><span>78% مكتمل</span></div></div><a class="btn d" href="/register" style="margin-top:22px">افتح مساحة عملك ↗</a></div></div></div></section>

<section class="section"><div class="wrap"><div class="head"><div class="kicker">WHY SYRIA COMMERCE</div><h2>كل شيء حول هدف واحد: البيع.</h2><p>تجربة مصممة للمسوّق من أول تسجيل حتى أول ربح.</p></div>
<div class="steps"><div class="step"><span class="num">⚡</span><h3>سرعة البداية</h3><p>بدون تجهيز مخزون أو عمليات معقدة قبل أن تبدأ.</p></div><div class="step"><span class="num">🎯</span><h3>اختيارات أذكى</h3><p>شوف الربح المتوقع قبل أن تضيع وقتك في التسويق.</p></div><div class="step"><span class="num">📈</span><h3>قرار بالأرقام</h3><p>تابع الطلبات والأداء بدل الاعتماد على التخمين.</p></div><div class="step"><span class="num">💚</span><h3>مساحتك الخاصة</h3><p>كل منتجاتك وروابطك ونتائجك في مكان واحد.</p></div></div></div></section>

<section class="section" style="padding-top:0"><div class="wrap"><div class="cta"><div><h2>جاهز تخلي جمهورك يبيع معك؟</h2><p>أنشئ حسابك مجاناً واختر أول منتج وابدأ.</p></div><a class="btn l" href="/register">ابدأ كمسوّق الآن ↗</a></div></div></section>
</main>

<footer class="footer"><div class="wrap foot"><div>© 2026 Syria Commerce — منصة التجارة للمسوّقين</div><div class="footLinks"><a href="/products">المنتجات</a><a href="/marketer">أدوات التسويق</a><a href="/login">دخول</a><a href="/register">التسجيل</a></div></div></footer>
</body></html>`,"Syria Commerce — منصة المسوقين");
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
