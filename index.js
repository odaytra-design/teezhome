
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
<title>Syria Commerce | منصة المسوّقين</title>
<style>
:root{--ink:#171414;--muted:#6f6460;--paper:#fbf8f5;--white:#ffffff;--line:#e9e1dc;--dark:#171414;--soft:#f5e7e2;--accent:#e54845;--hot:#e54845;--yellow:#e54845;--pink:#e54845;--green:#171414}
*{box-sizing:border-box}html{scroll-behavior:smooth}
body{margin:0;background:var(--paper);color:var(--ink);font-family:Arial,Tahoma,sans-serif}
a{text-decoration:none;color:inherit}.wrap{max-width:1240px;margin:auto;padding:0 22px}

/* header */
.utility{height:34px;background:var(--ink);color:#fff1d7;font-size:11px}
.utilityIn{height:100%;display:flex;align-items:center;justify-content:space-between}
.utilityIn div{display:flex;gap:18px}.utility b{color:var(--accent)}
.nav{height:76px;background:#fffdf8;border-bottom:1px solid var(--line);position:sticky;top:0;z-index:50}
.navIn{height:100%;display:flex;align-items:center;gap:28px}
.brand{display:flex;align-items:center;gap:10px;font-weight:950;font-size:21px;white-space:nowrap}
.mark{width:42px;height:42px;border-radius:12px;background:var(--accent);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:950;box-shadow:0 8px 22px rgba(23,20,20,.08)}
.brand small{display:block;font-size:7px;letter-spacing:2px;color:#8a7568;margin-top:2px}
.links{display:flex;align-items:center;gap:2px;flex:1}
.links a{padding:10px 12px;border-radius:9px;font-weight:800;font-size:13px;color:#4b3c33}
.links a:hover,.links a.active{background:#fff0d2;color:var(--orange)}
.navActions{display:flex;gap:8px}.btn{display:inline-flex;align-items:center;justify-content:center;border-radius:10px;border:0;padding:12px 18px;font-weight:950;font-size:13px;cursor:pointer}
.btn.yellow{background:var(--soft);color:var(--ink);box-shadow:0 8px 20px rgba(23,20,20,.12)}
.btn.dark{background:var(--ink);color:#fff}.btn.light{background:#fff;border:1px solid var(--line)}
.btn.coral{background:var(--accent);color:#fff}

/* hero */
.hero{background:var(--cream);border-bottom:1px solid var(--line);overflow:hidden}
.heroIn{min-height:610px;display:grid;grid-template-columns:1fr 1fr;align-items:center;gap:30px}
.copy{padding:65px 0;position:relative;z-index:2}
.kicker{display:inline-flex;align-items:center;gap:8px;background:var(--ink);color:var(--accent);padding:9px 13px;border-radius:999px;font-weight:950;font-size:11px}
.copy h1{font-size:66px;line-height:1.03;letter-spacing:-3px;margin:20px 0 17px}
.copy h1 .hot{color:var(--coral)}
.copy h1 .markText{background:var(--soft);padding:0 8px;box-decoration-break:clone;-webkit-box-decoration-break:clone}
.copy p{max-width:600px;color:var(--muted);font-size:18px;line-height:1.9;margin:0 0 24px}
.heroBtns{display:flex;gap:10px;flex-wrap:wrap}
.proof{display:flex;gap:18px;flex-wrap:wrap;margin-top:20px;font-size:11px;font-weight:800;color:#5e4d42}
.proof span:before{content:"✓";display:inline-flex;width:18px;height:18px;align-items:center;justify-content:center;background:var(--soft);border-radius:50%;margin-left:5px;color:var(--ink);font-weight:950}

/* hero visual — editorial, not card-grid */
.stage{height:535px;position:relative;display:flex;align-items:center;justify-content:center}
.sun{position:absolute;width:410px;height:410px;border-radius:50%;background:var(--soft);right:35px;top:65px}
.sun:after{content:"";position:absolute;width:145px;height:145px;border-radius:50%;background:var(--accent);left:18px;bottom:18px}
.poster{position:relative;z-index:2;width:455px;min-height:390px;background:var(--ink);color:#fff;border-radius:28px;padding:28px;transform:rotate(-1deg);box-shadow:0 24px 60px rgba(23,20,20,.16)}
.poster:before{content:"";position:absolute;inset:14px;border:1px solid #ffffff24;border-radius:18px;pointer-events:none}
.posterTop{display:flex;justify-content:space-between;align-items:center;color:#ffdca8;font-size:10px;font-weight:900}
.posterLogo{width:48px;height:48px;border-radius:14px;background:var(--soft);color:var(--ink);display:flex;align-items:center;justify-content:center;font-weight:950;font-size:13px}
.poster h2{font-size:40px;line-height:1.08;margin:30px 0 12px;letter-spacing:-1.5px}
.poster h2 span{color:var(--accent)}
.poster p{color:#e7d7c8;font-size:13px;line-height:1.8;max-width:330px}
.posterLine{height:1px;background:#ffffff22;margin:20px 0}
.posterStats{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}
.posterStat{background:#fff9ef;color:var(--ink);border-radius:11px;padding:10px}
.posterStat small{display:block;color:#78685d;font-size:8px;margin-bottom:5px}.posterStat b{font-size:15px}
.tape{position:absolute;z-index:3;right:12px;top:42px;background:var(--accent);color:#fff;padding:9px 13px;font-size:11px;font-weight:950;transform:rotate(3deg);box-shadow:0 8px 20px rgba(23,20,20,.12)}
.sticker{position:absolute;z-index:4;left:4px;bottom:55px;background:#fff;border:2px solid var(--ink);padding:13px 16px;border-radius:13px;box-shadow:6px 6px 0 var(--yellow);font-weight:950}
.sticker b{display:block;color:var(--accent);font-size:17px}.sticker span{font-size:9px;color:var(--muted)}

/* sections */
.section{padding:78px 0}.section.alt{background:#fff2df}
.center{text-align:center;margin-bottom:34px}.eyebrow{color:var(--orange);font-size:11px;font-weight:950;letter-spacing:.3px}
.center h2{font-size:38px;letter-spacing:-1.3px;margin:5px 0 8px}.center p{color:var(--muted);margin:0;font-size:14px}

/* process */
.process{display:grid;grid-template-columns:repeat(4,1fr);gap:0;border-top:2px solid var(--ink);border-bottom:2px solid var(--ink)}
.processItem{padding:25px 22px;border-left:1px solid #d8c3ae;min-height:185px}
.processItem:last-child{border-left:0}.processNo{font-size:12px;font-weight:950;color:var(--coral)}
.processItem h3{font-size:19px;margin:18px 0 7px}.processItem p{font-size:12px;line-height:1.8;color:var(--muted);margin:0}

/* products */
.productHead{display:flex;align-items:end;justify-content:space-between;margin-bottom:22px}
.productHead h2{font-size:34px;margin:0 0 6px}.productHead p{margin:0;color:var(--muted);font-size:13px}
.products{display:grid;grid-template-columns:repeat(4,1fr);gap:13px}
.pcard{background:#fff;border:1px solid var(--line);border-radius:18px;overflow:hidden;transition:.2s}
.pcard:hover{transform:translateY(-4px);box-shadow:8px 10px 0 #e5484520}
.pimage{height:175px;background:#f5eadb;display:flex;align-items:center;justify-content:center;font-size:58px}
.pbody{padding:15px}.ptag{display:inline-block;background:var(--soft);font-size:9px;font-weight:950;padding:5px 7px;border-radius:6px}
.pcard h3{font-size:14px;margin:10px 0 5px}.pcard p{font-size:11px;color:var(--muted);line-height:1.6;margin:0 0 12px}
.profitRow{display:flex;align-items:center;justify-content:space-between;border-top:1px solid var(--line);padding-top:11px}
.profitRow small{display:block;color:var(--muted);font-size:8px}.profitRow b{font-size:13px;color:var(--accent)}
.market{padding:9px 11px;font-size:10px}

/* value strip */
.value{display:grid;grid-template-columns:1.2fr .8fr;gap:16px}
.valueMain{background:var(--ink);color:#fff;padding:35px;border-radius:24px;min-height:320px;position:relative;overflow:hidden}
.valueMain:after{content:"";position:absolute;width:250px;height:250px;border:35px solid var(--yellow);border-radius:50%;left:-80px;bottom:-130px}
.valueMain h2{font-size:31px;margin:0 0 9px}.valueMain p{color:#ead7e5;font-size:13px;line-height:1.8;max-width:520px}
.tools{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:22px}.tool{border:1px solid #ffffff25;background:#ffffff0c;border-radius:11px;padding:12px}
.tool b{display:block;font-size:11px}.tool span{font-size:9px;color:#d8c1d2}
.valueSide{background:var(--soft);border-radius:24px;padding:35px;min-height:320px;display:flex;flex-direction:column;justify-content:space-between}
.valueSide h2{font-size:28px;margin:0}.earn{font-size:48px;font-weight:950;letter-spacing:-2px}.earn small{display:block;font-size:10px;letter-spacing:0;font-weight:700}.valueSide p{font-size:11px;line-height:1.7;color:#5e4b38}

/* proof / CTA */
.proofGrid{display:grid;grid-template-columns:repeat(4,1fr);border:1px solid var(--line);border-radius:18px;overflow:hidden;background:#fff}
.proofBox{padding:25px;border-left:1px solid var(--line)}.proofBox:last-child{border-left:0}
.proofBox i{font-style:normal;font-size:25px}.proofBox b{display:block;margin:10px 0 5px;font-size:13px}.proofBox span{font-size:10px;color:var(--muted);line-height:1.6}
.cta{background:var(--orange);color:#fff;border-radius:28px;padding:43px 46px;display:flex;align-items:center;justify-content:space-between;gap:20px;position:relative;overflow:hidden}
.cta:after{content:"";position:absolute;width:220px;height:220px;border:34px solid var(--yellow);border-radius:50%;left:-90px;bottom:-130px}
.cta h2{font-size:34px;margin:0 0 7px}.cta p{margin:0;color:#ffe5dc;font-size:13px}.cta .btn{position:relative;z-index:2;background:var(--soft);color:var(--ink)}

/* footer */
.footer{background:var(--ink);color:#d9c8ba;padding:30px 0}.foot{display:flex;justify-content:space-between;gap:15px;font-size:11px}.footLinks{display:flex;gap:18px}.footLinks a:hover{color:var(--accent)}

@media(max-width:1000px){
  .links{display:none}.heroIn{grid-template-columns:1fr}.stage{height:500px}.process{grid-template-columns:1fr 1fr}.products{grid-template-columns:1fr 1fr}.value{grid-template-columns:1fr}.proofGrid{grid-template-columns:1fr 1fr}
}
@media(max-width:600px){
  .utility{display:none}.nav{height:68px}.navIn{justify-content:space-between;gap:0}.navActions .light{display:none}
  .brand{font-size:18px}.copy{padding:42px 0 15px}.copy h1{font-size:43px;letter-spacing:-1.5px}.copy p{font-size:16px}
  .heroIn{min-height:auto}.stage{height:410px}.sun{width:300px;height:300px;right:12px;top:50px}
  .poster{width:92%;min-height:330px;padding:22px;border-radius:20px}.poster h2{font-size:31px;margin:24px 0 10px}.posterStats{gap:5px}.posterStat{padding:8px}.posterStat b{font-size:12px}
  .tape{right:0;top:30px}.sticker{left:0;bottom:25px}
  .section{padding:55px 0}.center h2{font-size:29px}.process,.products,.value,.proofGrid{grid-template-columns:1fr}
  .processItem{border-left:0;border-bottom:1px solid #d8c3ae;min-height:auto}.processItem:last-child{border-bottom:0}
  .productHead{align-items:start;gap:10px}.productHead .btn{display:none}.products{gap:11px}
  .valueMain,.valueSide{min-height:auto;padding:26px}.earn{font-size:40px}.tools{grid-template-columns:1fr 1fr}
  .proofBox{border-left:0;border-bottom:1px solid var(--line)}.proofBox:last-child{border-bottom:0}
  .cta{padding:31px 24px;flex-direction:column;align-items:flex-start}.cta h2{font-size:28px}
  .foot{flex-direction:column}.footLinks{flex-wrap:wrap}
}
</style>
</head>
<body>

<div class="utility"><div class="wrap utilityIn">
<div><span><b>⚡</b> منتجات جاهزة للبيع</span><span><b>✓</b> بدون مخزون</span><span><b>↗</b> ربح واضح</span></div>
<div><span>مساحة المسوّق</span><span>الدعم</span></div>
</div></div>

<header class="nav"><div class="wrap navIn">
<a class="brand" href="/"><span class="mark">SC</span><span>Syria Commerce<small>SELL • TRACK • EARN</small></span></a>
<nav class="links"><a class="active" href="/">الرئيسية</a><a href="/products">المنتجات</a><a href="/marketer">كيف تربح؟</a><a href="/marketer">أدوات التسويق</a><a href="/login">لوحة المسوّق</a></nav>
<div class="navActions"><a class="btn light" href="/login">دخول</a><a class="btn yellow" href="/register">ابدأ الآن ↗</a></div>
</div></header>

<main>
<section class="hero"><div class="wrap heroIn">
<div class="copy">
<span class="kicker">⚡ منصة مبنية للمسوّقين</span>
<h1>أنت تجيب <span class="hot">البيع.</span><br>نحن نرتّب لك <span class="markText">الباقي.</span></h1>
<p>اختَر المنتج، سوّقه لجمهورك، وتابع كل طلب وربح من مكان واحد. لا مخزون، لا تعقيد، ولا تشتّت بين عشر أدوات.</p>
<div class="heroBtns"><a class="btn yellow" href="/register">🚀 ابدأ كمسوّق مجاناً</a><a class="btn dark" href="/products">شاهد المنتجات</a></div>
<div class="proof"><span>لا تحتاج مخزون</span><span>أدوات تسويق جاهزة</span><span>تتبع الطلبات والأرباح</span></div>
</div>

<div class="stage">
<div class="sun"></div>
<div class="tape">جاهز للبيع 🔥</div>
<div class="poster">
<div class="posterTop"><span>SYRIA COMMERCE / MARKETER OS</span><span class="posterLogo">SC</span></div>
<h2>حوّل كل <span>مشاهدة</span><br>إلى فرصة بيع.</h2>
<p>مساحة عمل تجمع المنتجات، أدوات التسويق، الطلبات، والعمولات في تجربة واحدة واضحة.</p>
<div class="posterLine"></div>
<div class="posterStats">
<div class="posterStat"><small>طلبات</small><b>86</b></div>
<div class="posterStat"><small>مبيعات</small><b>12.4M</b></div>
<div class="posterStat"><small>ربح</small><b>1.84M</b></div>
</div>
</div>
<div class="sticker"><b>+28.4%</b><span>نمو المبيعات — مثال توضيحي</span></div>
</div>
</div></section>

<section class="section"><div class="wrap">
<div class="center"><div class="eyebrow">كيف تبدأ؟</div><h2>من أول منتج إلى أول ربح</h2><p>أربع خطوات واضحة. بدون لف ودوران.</p></div>
<div class="process">
<div class="processItem"><div class="processNo">01 / حسابك</div><h3>سجّل كمسوّق</h3><p>أنشئ حسابك وادخل إلى مساحة العمل الخاصة بك.</p></div>
<div class="processItem"><div class="processNo">02 / اختيار</div><h3>اختر منتجاً</h3><p>قارن المنتجات وشاهد السعر والربح المتوقع قبل أن تبدأ.</p></div>
<div class="processItem"><div class="processNo">03 / تسويق</div><h3>سوّق لجمهورك</h3><p>استخدم الصور والمحتوى والروابط الجاهزة وابدأ البيع.</p></div>
<div class="processItem"><div class="processNo">04 / متابعة</div><h3>تابع واربح</h3><p>راقب الطلبات والمبيعات والعمولات من مكان واحد.</p></div>
</div>
</div></section>

<section class="section alt"><div class="wrap">
<div class="productHead"><div><div class="eyebrow">اختيارات جاهزة</div><h2>منتجات تستاهل تسويقك 🔥</h2><p>اختَر المنتج الذي يناسب جمهورك وابدأ.</p></div><a class="btn dark" href="/products">عرض كل المنتجات ←</a></div>
<div class="products">
<article class="pcard"><div class="pimage">🎧</div><div class="pbody"><span class="ptag">الأكثر طلباً</span><h3>سماعة بلوتوث لاسلكية</h3><p>منتج سهل التسويق ومناسب لجمهور واسع.</p><div class="profitRow"><div><small>ربحك المتوقع</small><b>45,000 SYP</b></div><a class="btn yellow market" href="/products">سوّق الآن</a></div></div></article>
<article class="pcard"><div class="pimage">⌚</div><div class="pbody"><span class="ptag">هامش ربح قوي</span><h3>ساعة رجالية فاخرة</h3><p>تصميم مطلوب للمناسبات والاستخدام اليومي.</p><div class="profitRow"><div><small>ربحك المتوقع</small><b>80,000 SYP</b></div><a class="btn yellow market" href="/products">سوّق الآن</a></div></div></article>
<article class="pcard"><div class="pimage">🧴</div><div class="pbody"><span class="ptag">اختيار المسوّقين</span><h3>عطر رجالي أصلي</h3><p>منتج جذاب وسهل عرضه في الإعلانات.</p><div class="profitRow"><div><small>ربحك المتوقع</small><b>65,000 SYP</b></div><a class="btn yellow market" href="/products">سوّق الآن</a></div></div></article>
<article class="pcard"><div class="pimage">🎒</div><div class="pbody"><span class="ptag">جديد</span><h3>حقيبة متعددة الاستخدام</h3><p>مناسبة للعمل والسفر والاستخدام اليومي.</p><div class="profitRow"><div><small>ربحك المتوقع</small><b>38,000 SYP</b></div><a class="btn yellow market" href="/products">سوّق الآن</a></div></div></article>
</div>
</div></section>

<section class="section"><div class="wrap">
<div class="center"><div class="eyebrow">مساحة عملك</div><h2>كل ما تحتاجه للبيع، بمكان واحد</h2><p>أنت ركّز على التسويق. المنصة ترتّب لك التفاصيل.</p></div>
<div class="value">
<div class="valueMain"><h2>أدوات تسويق بدون وجع رأس.</h2><p>بدل ما تجمع أدواتك من أماكن مختلفة، خلي المنتجات والروابط والمحتوى ومتابعة الأداء داخل مساحة واحدة.</p>
<div class="tools">
<div class="tool"><b>📸 صور المنتجات</b><span>محتوى جاهز للنشر</span></div>
<div class="tool"><b>🎬 مواد تسويقية</b><span>جهّز حملتك أسرع</span></div>
<div class="tool"><b>🔗 روابط تتبع</b><span>اعرف مصدر كل طلب</span></div>
<div class="tool"><b>📊 أرقام واضحة</b><span>مبيعاتك وأرباحك أمامك</span></div>
</div></div>
<div class="valueSide"><div><h2>أرباحك تحت السيطرة.</h2><p>مثال توضيحي للوحة المسوّق.</p></div><div class="earn">1,840,000<small>SYP أرباح هذا الشهر</small></div><div><p>تابع الطلبات، العمولات، وأداء المنتجات بدون جداول معقدة.</p><a class="btn dark" href="/register">افتح مساحة عملك ↗</a></div></div>
</div>
</div></section>

<section class="section alt"><div class="wrap">
<div class="center"><div class="eyebrow">ليش Syria Commerce؟</div><h2>مصمم حول شغل المسوّق</h2><p>مش منصة تجارية عامة — هذه مساحة عملك للبيع.</p></div>
<div class="proofGrid">
<div class="proofBox"><i>📦</i><b>بدون تخزين</b><span>لا تشتري مخزون قبل ما تبدأ البيع.</span></div>
<div class="proofBox"><i>⚡</i><b>ابدأ بسرعة</b><span>منتجات وأدوات جاهزة من أول يوم.</span></div>
<div class="proofBox"><i>📈</i><b>اعرف أرقامك</b><span>طلبات ومبيعات وعمولات بصورة واضحة.</span></div>
<div class="proofBox"><i>🤝</i><b>دعم للمسوّق</b><span>تجربة مبنية حول احتياجاتك اليومية.</span></div>
</div>
</div></section>

<section class="section" style="padding-top:0"><div class="wrap"><div class="cta">
<div><h2>جاهز تبدأ أول عملية بيع؟</h2><p>سجّل مجاناً، اختَر منتجك، وابدأ التسويق اليوم.</p></div>
<a class="btn" href="/register">ابدأ كمسوّق الآن ↗</a>
</div></div></section>
</main>

<footer class="footer"><div class="wrap foot"><div>© 2026 Syria Commerce — منصة التجارة للمسوّقين</div><div class="footLinks"><a href="/products">المنتجات</a><a href="/marketer">أدوات التسويق</a><a href="/login">تسجيل الدخول</a><a href="/register">التسجيل</a></div></div></footer>
</body></html>`,"Syria Commerce | منصة المسوّقين");
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
