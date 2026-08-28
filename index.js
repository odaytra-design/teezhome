
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

async function marketerProductsPage(env) {
  const rows = await listProducts(getStore(env));
  const products = rows.filter(p => p.status === "active");
  const cards = products.map(p => `
    <article class="product" data-name="${esc(p.name)}" data-category="${esc(p.category || "عام")}">
      <div class="visual"><span class="tag">${esc(p.category || "منتج")}</span><div class="productIcon">✦</div><button class="heart" aria-label="حفظ المنتج">♡</button></div>
      <div class="body">
        <div class="meta"><span>${esc(p.sku)}</span><span>متاح ${Number(p.stock)}</span></div>
        <h3>${esc(p.name)}</h3>
        <p>${esc(p.description || "منتج جاهز للتسويق لجمهورك.")}</p>
        <div class="money"><div><small>سعر البيع</small><strong>${Number(p.price).toFixed(2)} <i>ر.س</i></strong></div><div class="profit"><small>عمولتك</small><b>+${Number(p.commission).toFixed(2)} <i>ر.س</i></b></div></div>
        <div class="actions"><a href="/product?id=${encodeURIComponent(p.id)}" class="more">التفاصيل</a><button onclick="startMarketing(${Number(p.id)})" class="market">سوّق المنتج ↗</button></div>
      </div>
    </article>`).join("");
  const cats = [...new Set(products.map(p => p.category || "عام"))];
  return htmlResponse(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>المنتجات | Syria Commerce</title><style>
:root{--ink:#171414;--muted:#716762;--paper:#fbf8f5;--white:#fff;--line:#e9e1dc;--brand:#e54845;--soft:#f5e8e4}
*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font-family:Arial,Tahoma,sans-serif}a{text-decoration:none;color:inherit}.wrap{max-width:1220px;margin:auto;padding:0 22px}
.top{height:72px;background:#fff;border-bottom:1px solid var(--line);display:flex;align-items:center;position:sticky;top:0;z-index:30}.nav{display:flex;align-items:center;gap:30px}.brand{display:flex;align-items:center;gap:10px;font-weight:950;font-size:19px}.mark{width:39px;height:39px;border-radius:12px;background:var(--brand);color:#fff;display:grid;place-items:center}.brand small{display:block;color:#8a7b75;font-size:7px;letter-spacing:1.6px;margin-top:2px}.links{display:flex;gap:4px;flex:1}.links a{padding:10px 12px;border-radius:9px;font-size:13px;font-weight:800;color:#544942}.links a:hover,.links a.active{background:var(--soft);color:var(--brand)}.account{display:flex;gap:8px}.account a{padding:10px 13px;border:1px solid var(--line);border-radius:10px;font-size:12px;font-weight:900}.account .primary{background:var(--ink);color:#fff;border-color:var(--ink)}
.hero{padding:66px 0 38px}.heroGrid{display:grid;grid-template-columns:1.25fr .75fr;gap:35px;align-items:end}.eyebrow{font-size:11px;font-weight:950;color:var(--brand);margin-bottom:13px}.hero h1{font-size:54px;line-height:1.04;letter-spacing:-2.4px;margin:0 0 13px}.hero p{font-size:16px;line-height:1.8;color:var(--muted);max-width:650px;margin:0}.heroNote{justify-self:end;text-align:left;direction:rtl;border-right:3px solid var(--brand);padding-right:18px}.heroNote strong{display:block;font-size:24px}.heroNote span{font-size:11px;color:var(--muted)}
.toolbar{display:flex;gap:10px;align-items:center;border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:16px 0;margin-bottom:26px}.search{flex:1;position:relative}.search input{width:100%;height:44px;border:1px solid var(--line);border-radius:12px;background:#fff;padding:0 43px 0 14px;font-size:13px;outline:none}.search input:focus{border-color:#c9aaa5}.search span{position:absolute;right:15px;top:12px;color:#93837c}.filter{height:44px;border:1px solid var(--line);background:#fff;border-radius:12px;padding:0 13px;font-weight:800;color:#53453e}.count{font-size:11px;color:var(--muted);white-space:nowrap}.chips{display:flex;gap:6px;overflow:auto;padding-bottom:2px}.chip{border:1px solid var(--line);background:#fff;border-radius:999px;padding:8px 12px;font-size:10px;font-weight:900;white-space:nowrap}.chip.active{background:var(--ink);color:#fff;border-color:var(--ink)}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;padding-bottom:80px}.product{background:#fff;border:1px solid var(--line);border-radius:20px;overflow:hidden;transition:transform .2s,box-shadow .2s}.product:hover{transform:translateY(-3px);box-shadow:0 18px 45px rgba(23,20,20,.09)}.visual{height:245px;background:#f3ece7;position:relative;display:grid;place-items:center}.productIcon{width:112px;height:112px;border-radius:32px;background:#fff;display:grid;place-items:center;font-size:45px;color:var(--brand);box-shadow:0 15px 35px rgba(23,20,20,.08)}.tag{position:absolute;right:15px;top:15px;background:var(--ink);color:#fff;border-radius:999px;padding:7px 10px;font-size:9px;font-weight:900}.heart{position:absolute;left:15px;top:15px;width:35px;height:35px;border:1px solid var(--line);border-radius:50%;background:#fff;font-size:19px;cursor:pointer}.body{padding:18px}.meta{display:flex;justify-content:space-between;color:#9a8c85;font-size:9px}.product h3{font-size:18px;margin:12px 0 7px}.product p{font-size:11px;color:var(--muted);line-height:1.7;min-height:37px;margin:0}.money{display:flex;justify-content:space-between;align-items:end;border-top:1px solid var(--line);margin-top:17px;padding-top:14px}.money small{display:block;font-size:8px;color:#93847c;margin-bottom:4px}.money strong{font-size:17px}.money i{font-size:8px;font-style:normal;color:#81736d}.profit{text-align:left}.profit b{font-size:17px;color:var(--brand)}.actions{display:grid;grid-template-columns:.72fr 1.28fr;gap:7px;margin-top:14px}.more,.market{height:42px;border-radius:10px;display:grid;place-items:center;font-size:11px;font-weight:950}.more{border:1px solid var(--line);background:#fff}.market{border:0;background:var(--brand);color:#fff;cursor:pointer}.market:hover{filter:brightness(.95)}.empty{grid-column:1/-1;text-align:center;padding:70px;color:var(--muted);border:1px dashed var(--line);border-radius:20px;background:#fff}
.bottom{border-top:1px solid var(--line);padding:28px 0;color:var(--muted);font-size:10px}.bottomIn{display:flex;justify-content:space-between}.toast{position:fixed;bottom:22px;left:22px;background:var(--ink);color:#fff;padding:13px 17px;border-radius:12px;font-size:11px;opacity:0;transform:translateY(10px);transition:.2s;z-index:50}.toast.show{opacity:1;transform:none}
@media(max-width:900px){.links{display:none}.heroGrid{grid-template-columns:1fr}.heroNote{justify-self:start;text-align:right}.grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:600px){.top{height:64px}.account a:first-child{display:none}.hero{padding:45px 0 28px}.hero h1{font-size:40px}.hero p{font-size:14px}.toolbar{align-items:stretch;flex-wrap:wrap}.search{flex-basis:100%}.chips{order:3;width:100%}.grid{grid-template-columns:1fr;gap:13px}.visual{height:230px}.bottomIn{flex-direction:column;gap:10px}}
</style></head><body>
<header class="top"><div class="wrap nav"><a class="brand" href="/"><span class="mark">SC</span><span>Syria Commerce<small>SELL • TRACK • EARN</small></span></a><nav class="links"><a href="/">الرئيسية</a><a class="active" href="/products">المنتجات</a><a href="/marketer">كيف تربح؟</a><a href="/marketer">أدوات التسويق</a><a href="/login">لوحة المسوّق</a></nav><div class="account"><a href="/login">دخول</a><a class="primary" href="/register">ابدأ الآن</a></div></div></header>
<main><section class="hero"><div class="wrap heroGrid"><div><div class="eyebrow">مكتبة المنتجات</div><h1>اختَر منتجك.<br>وخلي التسويق علينا.</h1><p>منتجات جاهزة للبيع، مع عمولتك واضحة من أول نظرة. ابحث، قارن، واختَر المنتج المناسب لجمهورك.</p></div><div class="heroNote"><strong>${products.length} منتجات</strong><span>متاحة الآن للمسوّقين</span></div></div></section>
<section class="wrap"><div class="toolbar"><div class="search"><span>⌕</span><input id="search" placeholder="ابحث عن منتج..."></div><select class="filter" id="sort"><option value="featured">الأبرز</option><option value="profit">الأعلى عمولة</option><option value="price">الأقل سعراً</option></select><span class="count" id="count">${products.length} منتج</span></div><div class="chips" id="chips"><button class="chip active" data-cat="all">الكل</button>${cats.map(c=>`<button class="chip" data-cat="${esc(c)}">${esc(c)}</button>`).join("")}</div><div class="grid" id="grid">${cards || '<div class="empty">لا توجد منتجات متاحة حالياً.</div>'}</div></section></main>
<footer class="bottom"><div class="wrap bottomIn"><span>© 2026 Syria Commerce — مساحة عمل للمسوّقين</span><span>منتجات • أدوات تسويق • أرباح</span></div></footer><div class="toast" id="toast">تم اختيار المنتج للتسويق ✓</div>
<script>
const grid=document.getElementById('grid'), search=document.getElementById('search'), sort=document.getElementById('sort'), count=document.getElementById('count'); let cat='all';
function render(){const q=search.value.trim().toLowerCase();let items=[...grid.querySelectorAll('.product')];items.forEach(x=>{const ok=(!q||x.dataset.name.toLowerCase().includes(q))&&(cat==='all'||x.dataset.category===cat);x.style.display=ok?'':'none'});count.textContent=items.filter(x=>x.style.display!=='none').length+' منتج'}
search.addEventListener('input',render);document.querySelectorAll('.chip').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.chip').forEach(x=>x.classList.remove('active'));b.classList.add('active');cat=b.dataset.cat;render()}));
function startMarketing(id){localStorage.setItem('sc_selected_product',String(id));const t=document.getElementById('toast');t.classList.add('show');setTimeout(()=>{t.classList.remove('show');location.href='/marketer'},900)}
</script></body></html>`,`المنتجات | Syria Commerce`);
}


async function cartPage(env) {
  const products = (await listProducts(getStore(env))).filter(p => p.status === "active");
  const productData = products.map(p => ({id:Number(p.id),name:p.name,price:Number(p.price),commission:Number(p.commission),stock:Number(p.stock),category:p.category||"منتج"}));
  return htmlResponse(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>سلة التسويق | Syria Commerce</title><style>
:root{--ink:#171414;--muted:#716762;--paper:#fbf8f5;--white:#fff;--line:#e9e1dc;--brand:#e54845;--soft:#f5e8e4;--green:#14755b}
*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font-family:Arial,Tahoma,sans-serif}a{text-decoration:none;color:inherit}.wrap{max-width:1180px;margin:auto;padding:0 22px}
.top{height:72px;background:#fff;border-bottom:1px solid var(--line);display:flex;align-items:center;position:sticky;top:0;z-index:20}.nav{display:flex;align-items:center;gap:28px}.brand{display:flex;align-items:center;gap:10px;font-weight:950;font-size:19px;flex:1}.mark{width:39px;height:39px;border-radius:12px;background:var(--brand);color:#fff;display:grid;place-items:center}.brand small{display:block;color:#8a7b75;font-size:7px;letter-spacing:1.6px;margin-top:2px}.back{font-size:12px;font-weight:900;color:#5a4b44}.account{display:flex;gap:8px}.account a{padding:10px 13px;border:1px solid var(--line);border-radius:10px;font-size:12px;font-weight:900}.account .primary{background:var(--ink);color:#fff;border-color:var(--ink)}
.hero{padding:55px 0 25px}.eyebrow{font-size:11px;font-weight:950;color:var(--brand);margin-bottom:12px}.hero h1{font-size:47px;letter-spacing:-2px;margin:0 0 10px}.hero p{font-size:14px;color:var(--muted);margin:0;line-height:1.8}
.layout{display:grid;grid-template-columns:1fr 350px;gap:22px;padding-bottom:80px}.panel{background:#fff;border:1px solid var(--line);border-radius:22px}.items{padding:8px 20px}.item{display:grid;grid-template-columns:82px 1fr auto;gap:15px;align-items:center;padding:20px 0;border-bottom:1px solid var(--line)}.item:last-child{border-bottom:0}.visual{width:82px;height:82px;background:#f3ece7;border-radius:17px;display:grid;place-items:center;color:var(--brand);font-size:30px}.name{font-size:15px;font-weight:950;margin-bottom:7px}.meta{font-size:10px;color:#978983}.price{font-size:14px;font-weight:950;margin-top:9px}.commission{display:inline-flex;background:var(--soft);color:var(--brand);padding:5px 8px;border-radius:7px;font-size:9px;font-weight:950;margin-top:7px}.qty{display:flex;align-items:center;gap:7px;margin-top:10px}.qty button{width:28px;height:28px;border:1px solid var(--line);background:#fff;border-radius:8px;font-weight:950;cursor:pointer}.qty span{min-width:20px;text-align:center;font-size:11px;font-weight:900}.remove{border:0;background:none;color:#a3948d;font-size:10px;cursor:pointer;margin-top:9px}.side{padding:23px;position:sticky;top:95px;height:max-content}.side h2{font-size:18px;margin:0 0 20px}.line{display:flex;justify-content:space-between;padding:11px 0;font-size:12px;color:#66574f}.line.total{border-top:1px solid var(--line);margin-top:7px;padding-top:17px;color:var(--ink);font-weight:950;font-size:17px}.profit{margin:16px 0;background:#f5f1ee;border-radius:13px;padding:14px}.profit small{display:block;color:var(--muted);font-size:9px;margin-bottom:5px}.profit b{color:var(--green);font-size:16px}.checkout{width:100%;border:0;background:var(--brand);color:#fff;border-radius:12px;height:48px;font-weight:950;cursor:pointer;font-size:13px;margin-top:6px}.note{font-size:9px;line-height:1.8;color:#8b7d76;margin:13px 0 0}.empty{padding:70px 20px;text-align:center}.emptyIcon{font-size:42px;margin-bottom:12px}.empty h2{font-size:20px;margin:0 0 8px}.empty p{color:var(--muted);font-size:12px;margin:0 0 20px}.btn{display:inline-flex;justify-content:center;align-items:center;padding:12px 18px;border-radius:10px;background:var(--ink);color:#fff;font-size:12px;font-weight:950}
.source{display:flex;align-items:center;gap:8px;background:#fff;border:1px solid var(--line);border-radius:12px;padding:12px 14px;margin-top:15px;font-size:10px;color:var(--muted)}.source b{color:var(--ink)}.dot{width:8px;height:8px;border-radius:50%;background:var(--brand)}
@media(max-width:850px){.layout{grid-template-columns:1fr}.side{position:static}.hero h1{font-size:38px}.item{grid-template-columns:64px 1fr}.visual{width:64px;height:64px}.item>div:last-child{grid-column:2}}
@media(max-width:520px){.account a:first-child{display:none}.top{height:66px}.nav{gap:10px}.brand{font-size:16px}.hero{padding-top:38px}.items{padding:0 14px}.item{gap:11px}.price{font-size:13px}}
</style></head><body>
<header class="top"><div class="wrap nav"><a class="brand" href="/"><span class="mark">SC</span><span>Syria Commerce<small>SELL • TRACK • EARN</small></span></a><a class="back" href="/products">← المنتجات</a><div class="account"><a href="/login">دخول</a><a class="primary" href="/marketer">مساحة المسوّق</a></div></div></header>
<main><section class="hero"><div class="wrap"><div class="eyebrow">سلة التسويق</div><h1>رتّب طلبك، ثم خلّينا نكمل.</h1><p>السلة هنا للمسوّق. أضف المنتجات التي تريد بيعها ثم انتقل لبيانات العميل وإرسال الطلب.</p><div class="source"><span class="dot"></span><span>مصدر الطلب: <b>المسوّق</b> — عند إنشاء الطلب يتم حفظ كود الإحالة معه.</span></div></div></section>
<section class="wrap layout"><div class="panel"><div class="items" id="items"></div></div><aside class="panel side"><h2>ملخص الطلب</h2><div class="line"><span>عدد المنتجات</span><b id="count">0</b></div><div class="line"><span>قيمة المنتجات</span><b id="subtotal">0.00</b></div><div class="line"><span>الشحن</span><b id="shipping">يُحدد عند الطلب</b></div><div class="line total"><span>الإجمالي</span><b id="total">0.00</b></div><div class="profit"><small>عمولتك المتوقعة من السلة</small><b id="commission">+0.00</b></div><button class="checkout" id="checkout">متابعة بيانات العميل →</button><p class="note">لن يتم إنشاء طلب الآن. الخطوة التالية هي إدخال بيانات العميل وربط الطلب بكود المسوّق.</p></aside></section></main>
<script>
const products=${JSON.stringify(productData)};
let cart=JSON.parse(localStorage.getItem('sc_cart')||'[]');
function data(){return cart.map(x=>{const p=products.find(y=>y.id===Number(x.id));return p?{...p,qty:Math.max(1,Number(x.qty||1))}:null}).filter(Boolean)}
function save(){localStorage.setItem('sc_cart',JSON.stringify(cart));render()}
function render(){
 const items=document.getElementById('items'), rows=data();
 if(!rows.length){items.innerHTML='<div class="empty"><div class="emptyIcon">🛒</div><h2>السلة فاضية</h2><p>اختَر منتجاً من مكتبة المنتجات وأضفه إلى سلة التسويق.</p><a class="btn" href="/products">استكشف المنتجات</a></div>';document.getElementById('count').textContent='0';document.getElementById('subtotal').textContent='0.00';document.getElementById('total').textContent='0.00';document.getElementById('commission').textContent='+0.00';return}
 items.innerHTML=rows.map(p=>'<article class="item"><div class="visual">✦</div><div><div class="name">'+esc(p.name)+'</div><div class="meta">'+esc(p.category)+' • متوفر '+p.stock+'</div><div class="price">'+p.price.toFixed(2)+' ر.س</div><span class="commission">عمولتك +'+p.commission.toFixed(2)+' ر.س / قطعة</span><div class="qty"><button onclick="change('+p.id+',-1)">−</button><span>'+p.qty+'</span><button onclick="change('+p.id+',1)">+</button></div><button class="remove" onclick="removeItem('+p.id+')">حذف من السلة</button></div></article>').join('');
 const subtotal=rows.reduce((s,p)=>s+p.price*p.qty,0), commission=rows.reduce((s,p)=>s+p.commission*p.qty,0), count=rows.reduce((s,p)=>s+p.qty,0);
 document.getElementById('count').textContent=count;document.getElementById('subtotal').textContent=subtotal.toFixed(2);document.getElementById('total').textContent=subtotal.toFixed(2);document.getElementById('commission').textContent='+'+commission.toFixed(2);
}
function esc(s){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function change(id,d){const x=cart.find(x=>Number(x.id)===id);if(x){x.qty=Math.max(1,Number(x.qty||1)+d);save()}}
function removeItem(id){cart=cart.filter(x=>Number(x.id)!==id);save()}
document.getElementById('checkout').onclick=()=>{if(!data().length)return;localStorage.setItem('sc_checkout_cart',JSON.stringify(data().map(p=>({id:p.id,qty:p.qty}))));location.href='/checkout'}
render();
</script></body></html>`,`السلة | Syria Commerce`);
}

async function productDetailsPage(env, id) {
  const rows = await listProducts(getStore(env));
  const product = rows.find(p => Number(p.id) === Number(id)) || rows.find(p => p.status === "active");
  if (!product) return htmlResponse(`<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><body style="font-family:Arial;padding:50px"><h1>المنتج غير موجود</h1><a href="/products">العودة للمنتجات</a></body></html>`,`المنتج غير موجود | Syria Commerce`,404);
  const related = rows.filter(p => p.status === "active" && Number(p.id) !== Number(product.id)).slice(0,3);
  const price = Number(product.price).toFixed(2), commission = Number(product.commission).toFixed(2);
  return htmlResponse(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(product.name)} | Syria Commerce</title><style>
:root{--ink:#171414;--muted:#716762;--paper:#fbf8f5;--white:#fff;--line:#e9e1dc;--brand:#e54845;--soft:#f5e8e4;--green:#16735a}
*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font-family:Arial,Tahoma,sans-serif}a{text-decoration:none;color:inherit}.wrap{max-width:1220px;margin:auto;padding:0 22px}
.top{height:72px;background:#fff;border-bottom:1px solid var(--line);display:flex;align-items:center;position:sticky;top:0;z-index:30}.nav{display:flex;align-items:center;gap:30px}.brand{display:flex;align-items:center;gap:10px;font-weight:950;font-size:19px}.mark{width:39px;height:39px;border-radius:12px;background:var(--brand);color:#fff;display:grid;place-items:center}.brand small{display:block;color:#8a7b75;font-size:7px;letter-spacing:1.6px;margin-top:2px}.links{display:flex;gap:4px;flex:1}.links a{padding:10px 12px;border-radius:9px;font-size:13px;font-weight:800;color:#544942}.links a:hover{background:var(--soft);color:var(--brand)}.account{display:flex;gap:8px}.account a{padding:10px 13px;border:1px solid var(--line);border-radius:10px;font-size:12px;font-weight:900}.account .primary{background:var(--ink);color:#fff;border-color:var(--ink)}
.crumb{padding:25px 0 8px;color:#9a8d86;font-size:10px}.crumb a:hover{color:var(--brand)}
.detail{display:grid;grid-template-columns:1fr 1fr;gap:58px;align-items:start;padding:25px 0 70px}.gallery{position:sticky;top:100px}.mainVisual{height:550px;border-radius:28px;background:#f1ebe6;display:grid;place-items:center;position:relative;overflow:hidden}.mainVisual:before{content:"";width:290px;height:290px;border-radius:50%;background:#fff;position:absolute;box-shadow:0 25px 60px rgba(23,20,20,.08)}.mainIcon{position:relative;z-index:2;width:150px;height:150px;border-radius:42px;background:#fff;display:grid;place-items:center;font-size:62px;color:var(--brand);box-shadow:0 20px 50px rgba(23,20,20,.12)}.label{position:absolute;right:22px;top:22px;background:var(--ink);color:#fff;padding:9px 12px;border-radius:999px;font-size:10px;font-weight:950;z-index:3}.sku{position:absolute;left:22px;bottom:22px;color:#8c7e77;font-size:9px;z-index:3}.info{padding:8px 0}.eyebrow{color:var(--brand);font-size:11px;font-weight:950;margin-bottom:12px}.info h1{font-size:49px;line-height:1.08;letter-spacing:-2px;margin:0 0 13px}.desc{font-size:15px;line-height:1.9;color:var(--muted);margin:0 0 25px;max-width:600px}.availability{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:23px}.pill{border:1px solid var(--line);background:#fff;border-radius:999px;padding:8px 11px;font-size:9px;font-weight:900;color:#5d504a}.pill.good{color:var(--green);background:#eef7f3;border-color:#cfe7dd}
.moneyBox{border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:22px 0;display:grid;grid-template-columns:1fr 1fr;gap:15px}.priceBlock small,.profitBlock small{display:block;font-size:9px;color:#91827a;margin-bottom:7px}.priceBlock strong{font-size:29px}.priceBlock i,.profitBlock i{font-size:10px;font-style:normal;color:#81736d}.profitBlock{background:var(--soft);border-radius:16px;padding:15px}.profitBlock b{display:block;color:var(--brand);font-size:25px}.profitBlock span{font-size:9px;color:#806f68}
.actions{display:grid;grid-template-columns:1.5fr .7fr;gap:9px;margin-top:20px}.btn{height:51px;border-radius:12px;display:grid;place-items:center;font-size:12px;font-weight:950}.btn.brand{background:var(--brand);color:#fff}.btn.dark{background:var(--ink);color:#fff}.btn.light{background:#fff;border:1px solid var(--line)}.subtle{display:flex;gap:18px;margin-top:17px;color:#897a73;font-size:9px}.subtle span:before{content:"✓";color:var(--brand);font-weight:950;margin-left:5px}
.infoBlock{margin-top:34px}.infoBlock h2{font-size:18px;margin:0 0 14px}.facts{display:grid;grid-template-columns:1fr 1fr;border-top:1px solid var(--line)}.fact{padding:14px 0;border-bottom:1px solid var(--line)}.fact:nth-child(odd){padding-left:15px;border-left:1px solid var(--line)}.fact small{display:block;color:#968881;font-size:8px;margin-bottom:5px}.fact b{font-size:11px}
.related{border-top:1px solid var(--line);padding:58px 0 80px}.head{display:flex;align-items:end;justify-content:space-between;margin-bottom:20px}.head h2{font-size:29px;margin:0 0 6px}.head p{margin:0;color:var(--muted);font-size:11px}.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:15px}.card{background:#fff;border:1px solid var(--line);border-radius:18px;overflow:hidden}.cardVisual{height:180px;background:#f1ebe6;display:grid;place-items:center}.cardIcon{width:82px;height:82px;border-radius:25px;background:#fff;display:grid;place-items:center;color:var(--brand);font-size:34px}.cardBody{padding:15px}.cardBody small{color:#95867f;font-size:8px}.cardBody h3{font-size:15px;margin:7px 0}.cardFoot{display:flex;justify-content:space-between;align-items:end;border-top:1px solid var(--line);padding-top:11px;margin-top:12px}.cardFoot b{color:var(--brand);font-size:13px}.cardFoot a{font-size:10px;font-weight:950}
.bottom{border-top:1px solid var(--line);padding:28px 0;color:var(--muted);font-size:10px}.bottomIn{display:flex;justify-content:space-between}
@media(max-width:900px){.links{display:none}.detail{grid-template-columns:1fr;gap:30px}.gallery{position:static}.mainVisual{height:430px}.cards{grid-template-columns:1fr 1fr}}
@media(max-width:600px){.top{height:64px}.account a:first-child{display:none}.detail{padding-bottom:45px}.mainVisual{height:340px;border-radius:22px}.mainVisual:before{width:220px;height:220px}.mainIcon{width:115px;height:115px;border-radius:32px;font-size:48px}.info h1{font-size:36px;letter-spacing:-1.2px}.desc{font-size:13px}.moneyBox{grid-template-columns:1fr}.actions{grid-template-columns:1fr}.subtle{flex-wrap:wrap}.facts{grid-template-columns:1fr}.fact:nth-child(odd){padding-left:0;border-left:0}.cards{grid-template-columns:1fr}.bottomIn{flex-direction:column;gap:8px}}
</style></head><body>
<header class="top"><div class="wrap nav"><a class="brand" href="/"><span class="mark">SC</span><span>Syria Commerce<small>SELL • TRACK • EARN</small></span></a><nav class="links"><a href="/">الرئيسية</a><a href="/products">المنتجات</a><a href="/marketer">كيف تربح؟</a><a href="/marketer">أدوات التسويق</a><a href="/login">لوحة المسوّق</a></nav><div class="account"><a href="/login">دخول</a><a class="primary" href="/register">ابدأ الآن</a></div></div></header>
<main><div class="wrap"><div class="crumb"><a href="/">الرئيسية</a>　/　<a href="/products">المنتجات</a>　/　${esc(product.name)}</div>
<section class="detail"><div class="gallery"><div class="mainVisual"><span class="label">${esc(product.category || "منتج")}</span><div class="mainIcon">✦</div><span class="sku">SKU · ${esc(product.sku)}</span></div></div>
<div class="info"><div class="eyebrow">تفاصيل المنتج للمسوّق</div><h1>${esc(product.name)}</h1><p class="desc">${esc(product.description || "منتج جاهز للتسويق لجمهورك. استخدم أدوات المنصة وابدأ البيع لجمهورك بطريقة واضحة وسريعة.")}</p>
<div class="availability"><span class="pill good">● متاح الآن</span><span class="pill">مخزون ${Number(product.stock)}</span><span class="pill">جاهز للتسويق</span></div>
<div class="moneyBox"><div class="priceBlock"><small>سعر البيع</small><strong>${price}</strong> <i>ر.س</i></div><div class="profitBlock"><small>عمولتك من الطلب</small><b>+${commission} <i>ر.س</i></b><span>تُحتسب عند تأكيد الطلب</span></div></div>
<div class="actions"><a class="btn brand" href="/marketer" onclick="selectProduct(${Number(product.id)})">سوّق هذا المنتج ↗</a><a class="btn light" href="/products">رجوع</a></div>
<div class="subtle"><span>بدون تخزين</span><span>رابط تتبع</span><span>متابعة الطلب</span></div>
<div class="infoBlock"><h2>تفاصيل تساعدك تبيع</h2><div class="facts"><div class="fact"><small>التصنيف</small><b>${esc(product.category || "عام")}</b></div><div class="fact"><small>الحالة</small><b>متاح للمسوّقين</b></div><div class="fact"><small>الربح المتوقع</small><b>${commission} ر.س لكل طلب مؤكد</b></div><div class="fact"><small>المخزون</small><b>${Number(product.stock)} قطعة</b></div></div></div>
</div></section></div>
<section class="related"><div class="wrap"><div class="head"><div><h2>منتجات ممكن تناسب جمهورك</h2><p>إذا هذا المنتج مش مناسب، عندك خيارات ثانية بنفس المساحة.</p></div><a href="/products" style="font-size:11px;font-weight:950">كل المنتجات ←</a></div><div class="cards">${related.map((p,i)=>`<article class="card"><div class="cardVisual"><div class="cardIcon">${["✦","◈","◇"][i%3]}</div></div><div class="cardBody"><small>${esc(p.category || "منتج")}</small><h3>${esc(p.name)}</h3><div class="cardFoot"><b>+${Number(p.commission).toFixed(2)} ر.س</b><a href="/product?id=${Number(p.id)}">التفاصيل ↗</a></div></div></article>`).join("")}</div></div></section>
</main><footer class="bottom"><div class="wrap bottomIn"><span>© 2026 Syria Commerce — مساحة عمل للمسوّقين</span><span>منتجات • أدوات تسويق • أرباح</span></div></footer>
<script>function selectProduct(id){localStorage.setItem('sc_selected_product',String(id))}</script></body></html>`,`${esc(product.name)} | Syria Commerce`);
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


async function checkoutPage(env) {
  const products = await listProducts(getStore(env));
  const catalog = products.map(p => ({id:p.id,name:p.name,price:Number(p.price)||0,commission:Number(p.commission)||0,stock:Number(p.stock)||0}));
  return htmlResponse(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>إتمام الطلب | Syria Commerce</title>
<style>
:root{--brand:#c9363d;--ink:#151515;--muted:#746d69;--paper:#faf9f7;--line:#e8e3df;--soft:#f5e8e6;--white:#fff}*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font-family:"Noto Sans Arabic","IBM Plex Sans Arabic",Tahoma,Arial,sans-serif}a{text-decoration:none;color:inherit}.wrap{max-width:1100px;margin:auto;padding:0 22px}.top{height:74px;background:var(--brand);color:#fff}.nav{height:100%;display:flex;align-items:center;justify-content:space-between}.logo{display:flex;align-items:center;gap:10px;font-weight:950}.mark{width:38px;height:38px;border-radius:11px;background:#fff;color:var(--brand);display:grid;place-items:center;font-size:10px}.back{font-size:11px;font-weight:800;opacity:.95}.page{padding:48px 0 70px}.eyebrow{font-size:9px;color:var(--brand);font-weight:950}.title{font-size:38px;letter-spacing:-1.2px;margin:7px 0}.intro{font-size:12px;color:var(--muted);margin:0 0 28px}.layout{display:grid;grid-template-columns:1fr .62fr;gap:16px;align-items:start}.box{background:#fff;border:1px solid var(--line);border-radius:20px;padding:25px}.box h2{font-size:18px;margin:0 0 5px}.box .sub{font-size:10px;color:var(--muted);margin:0 0 20px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:11px}.field{display:flex;flex-direction:column;gap:6px}.field.full{grid-column:1/-1}label{font-size:10px;font-weight:900}input,select,textarea{width:100%;border:1px solid var(--line);background:#fff;border-radius:10px;padding:12px;font:inherit;font-size:11px;outline:none}input:focus,select:focus,textarea:focus{border-color:var(--brand);box-shadow:0 0 0 3px var(--soft)}textarea{min-height:82px;resize:vertical}.ref{background:var(--soft);border:1px solid #ead1ce;border-radius:12px;padding:13px;margin-bottom:18px}.ref b{font-size:10px}.ref p{margin:4px 0 0;font-size:9px;color:var(--muted);line-height:1.7}.summary{position:sticky;top:20px}.items{border-top:1px solid var(--line);margin-top:15px}.item{display:flex;justify-content:space-between;gap:10px;padding:13px 0;border-bottom:1px solid var(--line)}.itemName{font-size:10px;font-weight:900}.itemMeta{font-size:8px;color:var(--muted);margin-top:4px}.itemPrice{text-align:left;font-size:10px;font-weight:950;white-space:nowrap}.totals{padding-top:14px}.totalRow{display:flex;justify-content:space-between;font-size:10px;margin:10px 0}.totalRow strong{font-size:17px}.commission{margin-top:13px;background:var(--ink);color:#fff;border-radius:13px;padding:13px;display:flex;justify-content:space-between;align-items:center}.commission span{font-size:9px;color:#d7d0cc}.commission b{color:#fff;font-size:16px}.btn{width:100%;border:0;border-radius:11px;padding:14px;background:var(--brand);color:#fff;font-weight:950;font-size:11px;cursor:pointer;margin-top:16px}.note{font-size:8px;color:var(--muted);line-height:1.7;margin-top:10px;text-align:center}.status{display:none;margin-top:13px;padding:12px;border-radius:11px;font-size:10px;background:var(--soft);color:var(--ink)}.empty{padding:20px 0;color:var(--muted);font-size:10px;text-align:center}.success{display:none;text-align:center;padding:35px 15px}.success .check{width:58px;height:58px;border-radius:50%;background:var(--brand);color:#fff;display:grid;place-items:center;margin:0 auto 15px;font-size:24px}.success h2{font-size:24px;margin:0 0 7px}.success p{font-size:10px;color:var(--muted);line-height:1.8}.success a{display:inline-flex;margin-top:8px;padding:11px 17px;border-radius:10px;background:var(--ink);color:#fff;font-size:10px;font-weight:900}@media(max-width:800px){.layout{grid-template-columns:1fr}.summary{position:static}.title{font-size:31px}}@media(max-width:520px){.grid{grid-template-columns:1fr}.field.full{grid-column:auto}.box{padding:19px}.page{padding-top:35px}}
</style></head><body>
<header class="top"><div class="wrap nav"><a class="logo" href="/"><span class="mark">SC</span><span>Syria Commerce</span></a><a class="back" href="/cart">← العودة للسلة</a></div></header>
<main class="page"><div class="wrap"><div class="eyebrow">CHECKOUT / إنشاء الطلب</div><h1 class="title">أكمل بيانات العميل</h1><p class="intro">أدخل بيانات العميل حتى نجهّز الطلب ونحافظ على نسبة الإحالة والعمولة للمسوّق.</p>
<div id="checkoutLayout" class="layout"><section class="box"><div class="ref"><b>🔗 الطلب مرتبط بالمسوّق</b><p id="refText">سيتم استخدام كود الإحالة الموجود في الرابط أو الكود المحفوظ في السلة.</p></div><h2>بيانات العميل</h2><p class="sub">هذه البيانات تستخدم لتنفيذ الطلب والتواصل مع العميل.</p><form id="orderForm"><div class="grid"><div class="field"><label>اسم العميل *</label><input id="customer_name" required placeholder="الاسم الكامل"></div><div class="field"><label>رقم الهاتف *</label><input id="customer_phone" required inputmode="tel" placeholder="07XXXXXXXX"></div><div class="field"><label>المحافظة *</label><select id="governorate" required><option value="">اختر المحافظة</option><option>دمشق</option><option>ريف دمشق</option><option>حلب</option><option>حمص</option><option>حماة</option><option>اللاذقية</option><option>طرطوس</option><option>إدلب</option><option>درعا</option><option>السويداء</option><option>القنيطرة</option><option>دير الزور</option><option>الرقة</option><option>الحسكة</option></select></div><div class="field"><label>المنطقة / المدينة</label><input id="city" placeholder="المنطقة"></div><div class="field full"><label>العنوان بالتفصيل</label><input id="address" placeholder="الحي، الشارع، أقرب نقطة دالة"></div><div class="field full"><label>ملاحظات</label><textarea id="notes" placeholder="أي ملاحظات خاصة بالطلب"></textarea></div></div><button class="btn" id="submitBtn">تأكيد وإنشاء الطلب ↗</button><div class="status" id="status"></div><div class="note">بإتمام الطلب سيتم ربطه بكود المسوّق الموجود في الإحالة. الدفع والتنفيذ الفعلي يُفعلان مع الربط النهائي بالنظام.</div></form></section>
<aside class="box summary"><h2>ملخص الطلب</h2><p class="sub">راجع المنتجات والعمولة قبل التأكيد.</p><div id="items" class="items"></div><div class="totals"><div class="totalRow"><span>إجمالي المنتجات</span><b id="total">0 SYP</b></div><div class="totalRow"><span>الشحن</span><span>يحدد حسب التنفيذ</span></div><div class="totalRow"><strong>الإجمالي</strong><strong id="grand">0 SYP</strong></div><div class="commission"><span>عمولتك المتوقعة</span><b id="commission">0 SYP</b></div></div></aside></div>
<div id="success" class="box success"><div class="check">✓</div><h2>تم إنشاء الطلب</h2><p id="successText">تم تسجيل الطلب بنجاح وربطه بالمسوّق.</p><a href="/products">العودة للمنتجات</a></div>
</div></main><script>
const CATALOG=${JSON.stringify(catalog)};
const qs=new URLSearchParams(location.search);
const ref=qs.get("ref")||localStorage.getItem("marketer_code")||localStorage.getItem("referral_code")||"";
if(ref) document.getElementById("refText").textContent="كود الإحالة: "+ref+" — سيتم ربط الطلب بهذا المسوّق.";
let cart=[];try{cart=JSON.parse(localStorage.getItem("sc_cart")||"[]")}catch(e){cart=[]}
function norm(){return cart.map(x=>{const p=CATALOG.find(y=>Number(y.id)===Number(x.id));return p?{...p,qty:Math.max(1,Number(x.qty||x.quantity||1))}:null}).filter(Boolean)}
cart=norm();
const fmt=n=>Number(n||0).toLocaleString("en-US")+" SYP";
function render(){const el=document.getElementById("items");if(!cart.length){el.innerHTML='<div class="empty">السلة فارغة. ارجع للمنتجات وأضف منتجاً أولاً.</div>';document.getElementById("submitBtn").disabled=true;document.getElementById("submitBtn").style.opacity=.5;return}let total=0,com=0;el.innerHTML=cart.map(x=>{total+=x.price*x.qty;com+=x.commission*x.qty;return '<div class="item"><div><div class="itemName">'+x.name+'</div><div class="itemMeta">الكمية: '+x.qty+' × '+fmt(x.price)+'</div></div><div class="itemPrice">'+fmt(x.price*x.qty)+'</div></div>'}).join('');document.getElementById("total").textContent=fmt(total);document.getElementById("grand").textContent=fmt(total);document.getElementById("commission").textContent=fmt(com)}
render();
document.getElementById("orderForm").addEventListener("submit",async e=>{e.preventDefault();if(!cart.length)return;const btn=document.getElementById("submitBtn"),status=document.getElementById("status");if(!ref){status.style.display="block";status.textContent="لا يمكن إنشاء الطلب بدون كود مسوّق أو رابط إحالة.";return}btn.disabled=true;btn.textContent="جارٍ إنشاء الطلب…";const base={customer_name:document.getElementById("customer_name").value.trim(),customer_phone:document.getElementById("customer_phone").value.trim(),governorate:document.getElementById("governorate").value,marketer_code:ref};try{const made=[];for(const x of cart){const r=await fetch("/api/orders",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({...base,product_id:x.id,quantity:x.qty})});const d=await r.json();if(!r.ok||!d.ok)throw new Error(d.error||"تعذر إنشاء الطلب");made.push(d.order)}localStorage.removeItem("sc_cart");document.getElementById("checkoutLayout").style.display="none";document.getElementById("success").style.display="block";document.getElementById("successText").textContent="تم إنشاء "+made.length+" طلب وربطها بكود المسوّق "+ref+"."}catch(err){status.style.display="block";status.textContent=err.message;btn.disabled=false;btn.textContent="تأكيد وإنشاء الطلب ↗"}});
</script></body></html>` , "إتمام الطلب | Syria Commerce");
}

export default {
  async fetch(request, env) {

    function jsonResponse(data, status=200) {
      return new Response(JSON.stringify(data), {
        status,
        headers: {"content-type":"application/json; charset=utf-8"}
      });
    }


    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/") {
      return htmlResponse(`<!doctype html>
<html lang="ar" dir="rtl">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Syria Commerce | منصة المسوّقين</title>
<style>
:root{--brand:#c9363d;--brand2:#a9252c;--ink:#151515;--muted:#706b68;--paper:#faf9f7;--line:#e9e6e3;--soft:#f4e6e4;--white:#fff}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--paper);color:var(--ink);font-family:"Noto Sans Arabic","IBM Plex Sans Arabic",Tahoma,Arial,sans-serif;-webkit-font-smoothing:antialiased}a{text-decoration:none;color:inherit}.wrap{max-width:1160px;margin:auto;padding:0 24px}
.top{height:76px;background:var(--brand);color:#fff;position:sticky;top:0;z-index:100}.nav{height:100%;display:flex;align-items:center;justify-content:space-between;gap:24px}.logo{display:flex;align-items:center;gap:10px;font-weight:950;font-size:18px}.logoMark{width:40px;height:40px;border-radius:12px;background:#fff;color:var(--brand);display:grid;place-items:center;font-size:11px}.links{display:flex;gap:4px;flex:1;justify-content:center}.links a{font-size:11px;font-weight:800;padding:10px 13px;border-radius:9px;color:#fff;opacity:.9}.links a:hover{background:#fff1;opacity:1}.navBtns{display:flex;gap:7px}.btn{display:inline-flex;align-items:center;justify-content:center;border-radius:10px;padding:12px 17px;font-size:11px;font-weight:950;border:0;cursor:pointer}.btn.white{background:#fff;color:var(--ink)}.btn.dark{background:var(--ink);color:#fff}.btn.red{background:var(--brand);color:#fff}.btn.out{background:transparent;color:var(--ink);border:1px solid var(--line)}
.hero{background:var(--paper);border-bottom:1px solid var(--line)}.heroIn{min-height:620px;display:grid;grid-template-columns:1.05fr .95fr;align-items:center;gap:55px}.copy{padding:72px 0}.kicker{display:inline-flex;align-items:center;gap:8px;font-size:10px;font-weight:950;color:var(--brand);margin-bottom:18px}.kicker i{display:block;width:24px;height:2px;background:var(--brand)}h1{font-size:67px;line-height:1.04;letter-spacing:-3px;margin:0 0 18px;font-weight:950}h1 em{font-style:normal;color:var(--brand)}.copy p{font-size:15px;line-height:2;color:var(--muted);max-width:560px;margin:0 0 25px}.actions{display:flex;gap:8px;flex-wrap:wrap}.proof{display:flex;gap:18px;flex-wrap:wrap;margin-top:20px;font-size:9px;font-weight:800;color:#68615d}.proof span:before{content:"✓";color:var(--brand);font-weight:950;margin-left:5px}
.visual{height:510px;position:relative;display:grid;place-items:center}.visual:before{content:"";position:absolute;width:430px;height:430px;border-radius:50%;background:var(--soft);top:45px;right:10px}.panel{position:relative;width:410px;background:#fff;border:1px solid var(--line);border-radius:25px;padding:22px;box-shadow:0 25px 70px #15151516}.panelTop{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--line);padding-bottom:13px}.miniBrand{display:flex;align-items:center;gap:8px;font-size:10px;font-weight:950}.miniMark{width:29px;height:29px;border-radius:9px;background:var(--brand);color:#fff;display:grid;place-items:center;font-size:8px}.panelTop small{font-size:8px;color:#918985}.panel h2{font-size:25px;line-height:1.25;margin:22px 0 7px;letter-spacing:-.7px}.panel h2 span{color:var(--brand)}.panelSub{font-size:9px;color:var(--muted);line-height:1.8;margin-bottom:17px}.stats{display:grid;grid-template-columns:1fr 1fr;gap:8px}.stat{border:1px solid var(--line);border-radius:14px;padding:14px}.stat.hot{background:var(--brand);border-color:var(--brand);color:#fff}.stat small{display:block;font-size:8px;opacity:.7;margin-bottom:8px}.stat b{font-size:19px}.list{margin-top:9px;border-top:1px solid var(--line)}.row{display:flex;justify-content:space-between;padding:11px 2px;font-size:9px;border-bottom:1px solid #f0edeb}.row b{color:var(--brand)}.bubble{position:absolute;z-index:2;background:var(--ink);color:#fff;border-radius:12px;padding:11px 14px;left:-18px;top:80px;font-size:9px;font-weight:900}.bubble b{display:block;font-size:15px;margin-top:2px}.seal{position:absolute;right:8px;bottom:38px;width:94px;height:94px;border-radius:50%;background:var(--brand);color:#fff;display:grid;place-items:center;text-align:center;font-size:9px;font-weight:950;line-height:1.4;box-shadow:0 15px 35px #c9363d35}
.section{padding:82px 0}.white{background:#fff}.head{text-align:center;margin-bottom:34px}.label{font-size:9px;color:var(--brand);font-weight:950}.head h2{font-size:35px;letter-spacing:-1.3px;margin:7px 0}.head p{font-size:11px;color:var(--muted);margin:0;line-height:1.9}
.steps{display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid var(--ink);border-bottom:1px solid var(--ink)}.step{padding:27px 21px;min-height:190px;border-left:1px solid var(--line)}.step:last-child{border-left:0}.num{font-size:10px;color:var(--brand);font-weight:950}.step h3{font-size:18px;margin:29px 0 7px}.step p{font-size:10px;line-height:1.9;color:var(--muted);margin:0}.line{width:25px;height:2px;background:var(--brand);margin-top:18px}
.split{display:grid;grid-template-columns:.9fr 1.1fr;gap:18px;align-items:stretch}.redBlock{background:var(--brand);color:#fff;border-radius:24px;padding:37px;min-height:390px;display:flex;flex-direction:column;justify-content:space-between}.redBlock h2{font-size:34px;line-height:1.2;margin:0;letter-spacing:-1px}.redBlock p{font-size:11px;line-height:2;color:#ffe9e9;max-width:390px}.redBlock .big{font-size:62px;line-height:1;font-weight:950;letter-spacing:-3px}.redBlock .big small{display:block;font-size:9px;letter-spacing:0;font-weight:800;margin-top:7px}.toolGrid{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:var(--line);border:1px solid var(--line);border-radius:24px;overflow:hidden}.tool{background:#fff;padding:30px;min-height:194px}.toolNo{font-size:9px;color:var(--brand);font-weight:950}.tool h3{font-size:17px;margin:25px 0 7px}.tool p{font-size:10px;color:var(--muted);line-height:1.9;margin:0}
.products{display:grid;grid-template-columns:repeat(4,1fr);gap:11px}.product{border:1px solid var(--line);border-radius:18px;overflow:hidden;background:#fff}.productVisual{height:150px;background:#f5f2ef;display:grid;place-items:center;position:relative}.productVisual:after{content:"";width:72px;height:72px;border-radius:24px;background:var(--brand);opacity:.9}.productVisual span{position:absolute;z-index:2;color:#fff;font-size:24px;font-weight:950}.productBody{padding:15px}.tag{font-size:8px;font-weight:950;color:var(--brand);background:var(--soft);padding:5px 7px;border-radius:6px}.product h3{font-size:13px;margin:10px 0 5px}.product p{font-size:9px;line-height:1.7;color:var(--muted);margin:0 0 12px}.price{display:flex;justify-content:space-between;align-items:end;border-top:1px solid var(--line);padding-top:10px}.price small{font-size:8px;color:var(--muted)}.price b{display:block;font-size:12px;margin-top:2px}.price .btn{padding:9px 11px;font-size:9px}
.statement{background:var(--ink);color:#fff;padding:78px 0}.statementIn{display:grid;grid-template-columns:1fr 1fr;gap:60px;align-items:center}.statement h2{font-size:43px;line-height:1.12;letter-spacing:-1.7px;margin:0}.statement h2 em{font-style:normal;color:#ef666b}.statement p{font-size:12px;line-height:2;color:#bdb7b3;margin:0 0 22px}.statement ul{list-style:none;padding:0;margin:0;display:grid;gap:10px}.statement li{font-size:10px;border-bottom:1px solid #ffffff16;padding-bottom:10px}.statement li b{color:#fff}.statement li:before{content:"—";color:#ef666b;margin-left:7px}.cta{padding:75px 0}.ctaBox{background:var(--brand);color:#fff;border-radius:25px;padding:43px 46px;display:flex;align-items:center;justify-content:space-between;gap:20px}.ctaBox h2{font-size:33px;margin:0 0 6px}.ctaBox p{font-size:10px;color:#ffe7e7;margin:0}.footer{background:#111;color:#aaa;padding:27px 0;font-size:9px}.foot{display:flex;justify-content:space-between;gap:15px}.footLinks{display:flex;gap:18px}.footLinks a:hover{color:#fff}
@media(max-width:950px){.links{display:none}.heroIn,.statementIn,.split{grid-template-columns:1fr}.copy{padding:55px 0 10px}.visual{height:470px}.steps,.products{grid-template-columns:1fr 1fr}.step:nth-child(2){border-left:0}.redBlock{min-height:300px}}
@media(max-width:600px){.top{height:66px}.logo{font-size:16px}.navBtns .out{display:none}.wrap{padding:0 18px}h1{font-size:44px;letter-spacing:-1.8px}.copy p{font-size:13px}.visual{height:390px}.visual:before{width:285px;height:285px;right:0}.panel{width:94%;padding:15px;border-radius:19px}.panel h2{font-size:21px}.bubble{left:-2px;top:48px}.seal{width:70px;height:70px;right:0;bottom:28px;font-size:7px}.section{padding:58px 0}.head h2{font-size:29px}.steps,.products{grid-template-columns:1fr}.step{border-left:0;border-bottom:1px solid var(--line);min-height:auto;padding:23px}.step:last-child{border-bottom:0}.toolGrid{grid-template-columns:1fr}.tool{min-height:auto}.redBlock{padding:28px;border-radius:20px}.redBlock h2{font-size:29px}.redBlock .big{font-size:47px}.statement h2{font-size:34px}.statementIn{gap:30px}.ctaBox{display:block;padding:31px 25px}.ctaBox h2{font-size:27px}.ctaBox .btn{margin-top:18px}.foot{display:block}.footLinks{margin-top:13px;flex-wrap:wrap}}

.numbers{background:var(--ink);color:#fff;padding:26px 0}
.numbersGrid{display:grid;grid-template-columns:repeat(4,1fr);border:1px solid #ffffff20;border-radius:18px;overflow:hidden}
.numbersGrid>div{padding:22px 24px;border-left:1px solid #ffffff18}
.numbersGrid>div:last-child{border-left:0}
.numbersGrid b{display:block;font-size:28px;letter-spacing:-1px}
.numbersGrid span{display:block;margin-top:5px;color:#cfc5bf;font-size:11px}
.testimonials{background:#fbf8f5}
.quotes{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.quotes article{background:#fff;border:1px solid var(--line);border-radius:18px;padding:24px;min-height:210px;display:flex;flex-direction:column;justify-content:space-between}
.stars{color:var(--brand);letter-spacing:2px;font-size:13px}
.quotes p{font-size:14px;line-height:1.9;margin:18px 0;color:#39312d}
.quotes b{display:block;font-size:11px}.quotes small{display:block;color:var(--muted);font-size:9px;margin-top:4px}
@media(max-width:800px){.numbersGrid{grid-template-columns:1fr 1fr}.numbersGrid>div:nth-child(2){border-left:0}.quotes{grid-template-columns:1fr}}
@media(max-width:600px){.numbersGrid b{font-size:22px}.numbersGrid>div{padding:17px 14px}}
</style></head><body>
<header class="top"><div class="wrap nav"><a class="logo" href="/"><span class="logoMark">SC</span><span>Syria Commerce</span></a><nav class="links"><a href="/">الرئيسية</a><a href="/products">المنتجات</a><a href="/marketer">كيف تعمل</a><a href="/marketer">أدوات المسوّق</a><a href="/login">حسابي</a></nav><div class="navBtns"><a class="btn out" href="/login" style="color:#fff;border-color:#ffffff55">دخول</a><a class="btn white" href="/register">ابدأ الآن</a></div></div></header>
<main>
<section class="hero"><div class="wrap heroIn"><div class="copy"><div class="kicker"><i></i> منصة البيع للمسوّقين</div><h1>بيع بذكاء.<br><em>واربح بثقة.</em></h1><p>اختر المنتج، خذ أدواتك، سوّق لجمهورك وتابع كل طلب وعمولة من مكان واحد. تجربة مصممة للمسوّق، لا للمتاهة.</p><div class="actions"><a class="btn red" href="/register">ابدأ كمسوّق مجاناً ↗</a><a class="btn out" href="/products">استكشف المنتجات</a></div><div class="proof"><span>بدون مخزون</span><span>روابط تتبع</span><span>عمولات واضحة</span></div></div><div class="visual"><div class="panel"><div class="panelTop"><div class="miniBrand"><span class="miniMark">SC</span><span>مساحة المسوّق</span></div><small>محدّث الآن</small></div><h2>كل شغلك <span>واضح.</span></h2><div class="panelSub">الطلبات والأرباح والمنتجات التي تسوّق لها، في نظرة واحدة.</div><div class="stats"><div class="stat hot"><small>الأرباح الحالية</small><b>1,840,000</b><small>SYP</small></div><div class="stat"><small>الطلبات</small><b>86</b><small>طلب</small></div></div><div class="list"><div class="row"><span>سماعة بلوتوث · طلب جديد</span><b>+45,000</b></div><div class="row"><span>ساعة رجالية · تم التأكيد</span><b>+80,000</b></div><div class="row"><span>عطر رجالي · قيد المتابعة</span><b>+65,000</b></div></div></div><div class="bubble">عمولتك<br><b>واضحة دائماً</b></div><div class="seal">SELL<br>TRACK<br>EARN</div></div></div></section>
<section class="section"><div class="wrap"><div class="head"><div class="label">كيف تعمل</div><h2>من المنتج إلى الربح — بدون تعقيد</h2><p>أربع خطوات واضحة، والباقي علينا.</p></div><div class="steps"><div class="step"><div class="num">01</div><h3>سجّل حسابك</h3><p>أنشئ مساحة العمل الخاصة بك خلال دقائق.</p><div class="line"></div></div><div class="step"><div class="num">02</div><h3>اختر منتجاً</h3><p>شاهد السعر والعمولة قبل أن تبدأ التسويق.</p><div class="line"></div></div><div class="step"><div class="num">03</div><h3>سوّق بطريقتك</h3><p>استخدم المحتوى والروابط ووصّل المنتج لجمهورك.</p><div class="line"></div></div><div class="step"><div class="num">04</div><h3>تابع واربح</h3><p>كل طلب وكل عمولة تظهر لك بصورة مفهومة.</p><div class="line"></div></div></div></div></section>
<section class="section white"><div class="wrap"><div class="head"><div class="label">أدواتك في مكان واحد</div><h2>ركز على البيع. وخلي الترتيب علينا.</h2><p>لا تحتاج عشر أدوات حتى تدير عملية بيع واحدة.</p></div><div class="split"><div class="redBlock"><div><h2>من أول رابط<br>إلى آخر عمولة.</h2><p>كل جزء من رحلة البيع مصمم ليكون سريعاً، واضحاً، وسهل الرجوع إليه.</p></div><div class="big">1,840,000<small>SYP مثال على أرباح شهرية</small></div></div><div class="toolGrid"><div class="tool"><div class="toolNo">01 / المنتج</div><h3>منتجات جاهزة</h3><p>اختر من المنتجات المتاحة وشاهد هامش الربح قبل التسويق.</p></div><div class="tool"><div class="toolNo">02 / المحتوى</div><h3>أدوات نشر</h3><p>معلومات وصور وروابط تساعدك تبدأ بدون تجهيز طويل.</p></div><div class="tool"><div class="toolNo">03 / التتبع</div><h3>اعرف نتيجة شغلك</h3><p>تابع مصدر الطلب وحالته بدون تخمين.</p></div><div class="tool"><div class="toolNo">04 / الأرباح</div><h3>عمولة مفهومة</h3><p>رقم واضح تعرف من خلاله أين وصلت وماذا تستحق.</p></div></div></div></div></section>
<section class="section"><div class="wrap"><div class="head"><div class="label">منتجات مختارة</div><h2>ابدأ من منتج يستاهل التسويق</h2><p>اختيارات واضحة بدل عشرات المنتجات المربكة.</p></div><div class="products"><article class="product"><div class="productVisual"><span>01</span></div><div class="productBody"><span class="tag">الأكثر طلباً</span><h3>سماعة بلوتوث لاسلكية</h3><p>منتج واسع الجمهور وسهل العرض.</p><div class="price"><div><small>عمولتك</small><b>45,000 SYP</b></div><a class="btn red" href="/products">سوّق</a></div></div></article><article class="product"><div class="productVisual"><span>02</span></div><div class="productBody"><span class="tag">هامش قوي</span><h3>ساعة رجالية</h3><p>منتج مناسب للهدايا والاستخدام اليومي.</p><div class="price"><div><small>عمولتك</small><b>80,000 SYP</b></div><a class="btn red" href="/products">سوّق</a></div></div></article><article class="product"><div class="productVisual"><span>03</span></div><div class="productBody"><span class="tag">اختيار المسوّقين</span><h3>عطر رجالي</h3><p>منتج بصري وسهل التسويق بالمحتوى.</p><div class="price"><div><small>عمولتك</small><b>65,000 SYP</b></div><a class="btn red" href="/products">سوّق</a></div></div></article><article class="product"><div class="productVisual"><span>04</span></div><div class="productBody"><span class="tag">جديد</span><h3>حقيبة متعددة الاستخدام</h3><p>مناسبة للعمل والسفر والاستخدام اليومي.</p><div class="price"><div><small>عمولتك</small><b>38,000 SYP</b></div><a class="btn red" href="/products">سوّق</a></div></div></article></div></div></section>

<section class="numbers"><div class="wrap"><div class="numbersGrid">
<div><b>25K+</b><span>طلب تم شحنه</span></div>
<div><b>8,500+</b><span>عميل وصلته طلباته</span></div>
<div><b>1,200+</b><span>مسوّق على المنصة</span></div>
<div><b>4.9/5</b><span>متوسط تقييم العملاء</span></div>
</div></div></section>
<section class="section testimonials"><div class="wrap"><div class="head"><div class="label">من أرض الواقع</div><h2>المسوّقين والعملاء هم الدليل.</h2><p>أرقامنا ورسائلنا نعرضها ببساطة، بدون مبالغة.</p></div>
<div class="quotes">
<article><div class="stars">★★★★★</div><p>“اللي عجبني إن كل شيء واضح. بعرف المنتج، العمولة، والطلبات بدون ما أضيع وقت.”</p><div><b>مسوّق على المنصة</b><small>منذ 2026</small></div></article>
<article><div class="stars">★★★★★</div><p>“التجربة مرتبة وسريعة، والطلب وصلني مثل ما توقعت. أكثر شيء ريّحني وضوح المتابعة.”</p><div><b>عميل</b><small>طلب مؤكد</small></div></article>
<article><div class="stars">★★★★★</div><p>“أخيراً عندي مكان واحد أعرف منه شو أسوّق وكم ربحت من كل طلب.”</p><div><b>مسوّق</b><small>نشط على المنصة</small></div></article>
</div></div></section>
<section class="statement"><div class="wrap statementIn"><div><div class="label">Syria Commerce</div><h2>مش مجرد متجر.<br><em>مساحة عملك.</em></h2></div><div><p>نبني تجربة تجعل المسوّق يفهم ماذا يبيع، كيف يبيعه، وكم ربح منه — بدون ضوضاء.</p><ul><li><b>واجهة واضحة</b> — كل إجراء له مكان منطقي.</li><li><b>تجربة سريعة</b> — أقل نقرات، أقل تشتت.</li><li><b>هوية موثوقة</b> — تصميم يليق ببراند حقيقي.</li></ul></div></div></section>
<section class="cta"><div class="wrap"><div class="ctaBox"><div><h2>جاهز تبدأ؟</h2><p>أنشئ حسابك واختر أول منتج اليوم.</p></div><a class="btn white" href="/register">ابدأ كمسوّق ↗</a></div></div></section>
</main><footer class="footer"><div class="wrap foot"><div>© 2026 Syria Commerce</div><div class="footLinks"><a href="/products">المنتجات</a><a href="/login">تسجيل الدخول</a><a href="/register">التسجيل</a></div></div></footer>
</body></html>`,"Syria Commerce | منصة المسوّقين");
    }
    if (request.method === "GET" && url.pathname === "/checkout") return checkoutPage(env);
    if (request.method === "GET" && url.pathname === "/product") return productDetailsPage(env, url.searchParams.get("id"));
    if (request.method === "GET" && url.pathname === "/cart") return cartPage(env);
    if (request.method === "GET" && url.pathname === "/products") return marketerProductsPage(env);
    if (request.method === "GET" && url.pathname === "/admin/products") return productsPage(env);
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

    /* ===== Admin data API V26 ===== */
    if (url.pathname === "/api/admin/stats" && request.method === "GET") {
      if (!env || !env.DB) return jsonResponse({ok:false,error:"DATABASE_NOT_BOUND"},503);
      const [orders, revenue, customers, marketers, products, pending] = await Promise.all([
        env.DB.prepare(`SELECT COUNT(*) AS count FROM orders`).first(),
        env.DB.prepare(`SELECT COALESCE(SUM(total),0) AS total FROM orders WHERE status NOT IN ('cancelled','returned')`).first(),
        env.DB.prepare(`SELECT COUNT(*) AS count FROM users WHERE role='customer' AND status='active'`).first(),
        env.DB.prepare(`SELECT COUNT(*) AS count FROM users WHERE role='marketer' AND status='active'`).first(),
        env.DB.prepare(`SELECT COUNT(*) AS count FROM products WHERE status='active'`).first(),
        env.DB.prepare(`SELECT COALESCE(SUM(amount),0) AS total FROM commissions WHERE status='pending'`).first()
      ]);
      return jsonResponse({ok:true,stats:{
        orders:Number(orders?.count||0),revenue:Number(revenue?.total||0),
        customers:Number(customers?.count||0),marketers:Number(marketers?.count||0),
        products:Number(products?.count||0),pending_commissions:Number(pending?.total||0)
      }});
    }

    if (url.pathname === "/api/admin/products" && request.method === "GET") {
      if (!env || !env.DB) return jsonResponse({ok:false,error:"DATABASE_NOT_BOUND"},503);
      const result = await env.DB.prepare(
        `SELECT p.*,c.name AS category_name FROM products p
         LEFT JOIN categories c ON c.id=p.category_id
         ORDER BY p.created_at DESC LIMIT 500`
      ).all();
      return jsonResponse({ok:true,products:result.results||[]});
    }

    if (url.pathname === "/api/admin/orders" && request.method === "GET") {
      if (!env || !env.DB) return jsonResponse({ok:false,error:"DATABASE_NOT_BOUND"},503);
      const status = url.searchParams.get("status");
      let sql = `SELECT o.*,m.full_name AS marketer_name FROM orders o LEFT JOIN users m ON m.id=o.marketer_id`;
      const params = [];
      if (status) { sql += ` WHERE o.status=?`; params.push(status); }
      sql += ` ORDER BY o.created_at DESC LIMIT 500`;
      const result = await env.DB.prepare(sql).bind(...params).all();
      return jsonResponse({ok:true,orders:result.results||[]});
    }

    if (url.pathname.startsWith("/api/admin/orders/") && request.method === "PATCH") {
      if (!env || !env.DB) return jsonResponse({ok:false,error:"DATABASE_NOT_BOUND"},503);
      const id = url.pathname.split("/").pop();
      let body; try { body=await request.json(); } catch { return jsonResponse({ok:false,error:"INVALID_JSON"},400); }
      const allowed=["pending","confirmed","processing","shipped","delivered","cancelled","returned"];
      if (!allowed.includes(body.status)) return jsonResponse({ok:false,error:"INVALID_ORDER_STATUS"},400);
      const order=await env.DB.prepare(`SELECT * FROM orders WHERE id=? LIMIT 1`).bind(id).first();
      if (!order) return jsonResponse({ok:false,error:"ORDER_NOT_FOUND"},404);
      await env.DB.prepare(`UPDATE orders SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(body.status,id).run();

      if (["cancelled","returned"].includes(body.status) &&
          !["cancelled","returned"].includes(order.status) && order.marketer_id) {
        const pending=await env.DB.prepare(
          `SELECT id,amount FROM commissions WHERE order_id=? AND status='pending' LIMIT 1`
        ).bind(id).first();
        if (pending) {
          await env.DB.prepare(`UPDATE commissions SET status='rejected' WHERE id=?`).bind(pending.id).run();
          await env.DB.prepare(
            `UPDATE marketer_profiles SET pending_balance=pending_balance-?,updated_at=CURRENT_TIMESTAMP WHERE user_id=?`
          ).bind(pending.amount,order.marketer_id).run();
        }
      }
      return jsonResponse({ok:true,order_id:id,status:body.status});
    }

    if (url.pathname === "/api/admin/marketers" && request.method === "GET") {
      if (!env || !env.DB) return jsonResponse({ok:false,error:"DATABASE_NOT_BOUND"},503);
      const result=await env.DB.prepare(
        `SELECT u.id,u.full_name,u.email,u.phone,u.status,mp.referral_code,mp.commission_rate,
                mp.balance,mp.pending_balance,mp.total_sales,mp.total_orders
         FROM users u JOIN marketer_profiles mp ON mp.user_id=u.id
         WHERE u.role='marketer' ORDER BY u.created_at DESC LIMIT 500`
      ).all();
      return jsonResponse({ok:true,marketers:result.results||[]});
    }

    if (url.pathname === "/api/admin/commissions" && request.method === "GET") {
      if (!env || !env.DB) return jsonResponse({ok:false,error:"DATABASE_NOT_BOUND"},503);
      const status=url.searchParams.get("status");
      let sql=`SELECT c.*,o.order_number,o.status AS order_status,u.full_name AS marketer_name
               FROM commissions c JOIN orders o ON o.id=c.order_id JOIN users u ON u.id=c.marketer_id`;
      const params=[];
      if (status){sql+=` WHERE c.status=?`;params.push(status);}
      sql+=` ORDER BY c.created_at DESC LIMIT 500`;
      const result=await env.DB.prepare(sql).bind(...params).all();
      return jsonResponse({ok:true,commissions:result.results||[]});
    }

    if (url.pathname.startsWith("/api/admin/commissions/") && request.method === "PATCH") {
      if (!env || !env.DB) return jsonResponse({ok:false,error:"DATABASE_NOT_BOUND"},503);
      const id=url.pathname.split("/").pop();
      let body; try {body=await request.json();} catch {return jsonResponse({ok:false,error:"INVALID_JSON"},400);}
      const next=body.status;
      if (!["approved","rejected","paid"].includes(next)) return jsonResponse({ok:false,error:"INVALID_STATUS"},400);
      const c=await env.DB.prepare(`SELECT * FROM commissions WHERE id=? LIMIT 1`).bind(id).first();
      if (!c) return jsonResponse({ok:false,error:"COMMISSION_NOT_FOUND"},404);
      const now=new Date().toISOString();
      if(next==="approved" && c.status==="pending"){
        await env.DB.prepare(`UPDATE commissions SET status='approved',approved_at=? WHERE id=?`).bind(now,id).run();
        await env.DB.prepare(`UPDATE marketer_profiles SET balance=balance+?,pending_balance=pending_balance-?,updated_at=CURRENT_TIMESTAMP WHERE user_id=?`)
          .bind(c.amount,c.amount,c.marketer_id).run();
      } else if(next==="rejected" && ["pending","approved"].includes(c.status)){
        if(c.status==="approved")
          await env.DB.prepare(`UPDATE marketer_profiles SET balance=balance-?,updated_at=CURRENT_TIMESTAMP WHERE user_id=?`).bind(c.amount,c.marketer_id).run();
        else
          await env.DB.prepare(`UPDATE marketer_profiles SET pending_balance=pending_balance-?,updated_at=CURRENT_TIMESTAMP WHERE user_id=?`).bind(c.amount,c.marketer_id).run();
        await env.DB.prepare(`UPDATE commissions SET status='rejected' WHERE id=?`).bind(id).run();
      } else if(next==="paid" && c.status==="approved"){
        await env.DB.prepare(`UPDATE commissions SET status='paid',paid_at=? WHERE id=?`).bind(now,id).run();
        await env.DB.prepare(`UPDATE marketer_profiles SET balance=balance-?,updated_at=CURRENT_TIMESTAMP WHERE user_id=?`).bind(c.amount,c.marketer_id).run();
      } else return jsonResponse({ok:false,error:"INVALID_TRANSITION"},409);
      return jsonResponse({ok:true,commission_id:id,status:next});
    }


    return json({ok:false,error:"Not Found"},404);
    if (request.method === "GET" && url.pathname === "/account") {
      return htmlResponse(`<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>حسابي | Syria Commerce</title>
<style>
:root{--ink:#171414;--paper:#fbf8f5;--white:#fff;--brand:#e54845;--soft:#f5e7e2;--line:#e9e1dc;--muted:#756a65}
*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font-family:Arial,Tahoma,sans-serif}
.wrap{max-width:1180px;margin:auto;padding:0 22px}a{text-decoration:none;color:inherit}
.nav{height:74px;background:#fff;border-bottom:1px solid var(--line)}.navin{height:100%;display:flex;align-items:center;gap:28px}
.logo{display:flex;align-items:center;gap:10px;font-weight:950;font-size:19px}.logo i{font-style:normal;background:var(--brand);color:#fff;border-radius:11px;padding:11px 12px}
.links{display:flex;gap:18px;flex:1}.links a{font-size:12px;font-weight:800;color:#554b47}.links a:hover{color:var(--brand)}
.btn{border:0;border-radius:11px;padding:12px 17px;font-weight:900;cursor:pointer}.brand{background:var(--brand);color:#fff}.dark{background:var(--ink);color:#fff}.light{background:#fff;border:1px solid var(--line)}
.hero{padding:55px 0 25px}.eyebrow{font-size:11px;color:var(--brand);font-weight:950}.hero h1{font-size:42px;letter-spacing:-1.4px;margin:7px 0}.hero p{color:var(--muted);font-size:14px;margin:0}
.layout{display:grid;grid-template-columns:280px 1fr;gap:16px;padding:20px 0 70px}
.side,.panel{background:#fff;border:1px solid var(--line);border-radius:20px}.side{padding:18px;height:max-content}.user{display:flex;gap:12px;align-items:center;padding-bottom:18px;border-bottom:1px solid var(--line)}
.avatar{width:50px;height:50px;border-radius:15px;background:var(--soft);display:grid;place-items:center;font-weight:950;color:var(--brand)}
.user b{display:block;font-size:13px}.user span{font-size:10px;color:var(--muted)}
.menu{padding-top:10px}.menu a{display:block;padding:12px;border-radius:10px;font-size:12px;font-weight:800;color:#625852}.menu a.active{background:var(--soft);color:var(--brand)}
.panel{padding:22px}.panelhead{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px}.panel h2{font-size:19px;margin:0}.panelhead span{font-size:10px;color:var(--muted)}
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-bottom:18px}.stat{border:1px solid var(--line);border-radius:14px;padding:16px}.stat small{display:block;color:var(--muted);font-size:9px;margin-bottom:8px}.stat b{font-size:21px}
.order{border-top:1px solid var(--line);padding:17px 0;display:grid;grid-template-columns:1fr auto auto;align-items:center;gap:15px}.order:first-of-type{border-top:0}.order b{font-size:12px}.order span{display:block;font-size:10px;color:var(--muted);margin-top:5px}.status{font-size:9px;font-weight:900;background:#f1eee9;padding:7px 9px;border-radius:999px}.status.live{background:var(--soft);color:var(--brand)}.price{font-size:12px;font-weight:950}
.notice{margin-top:16px;background:var(--ink);color:#fff;padding:17px;border-radius:15px;font-size:11px;line-height:1.7}.notice b{color:#fff}
@media(max-width:800px){.links{display:none}.layout{grid-template-columns:1fr}.side{order:2}.stats{grid-template-columns:1fr 1fr}.order{grid-template-columns:1fr auto}.price{grid-column:1}.hero h1{font-size:34px}}
</style>
</head>
<body>
<header class="nav"><div class="wrap navin">
<a class="logo" href="/"><i>SC</i><span>Syria Commerce</span></a>
<nav class="links"><a href="/">الرئيسية</a><a href="/products">المنتجات</a><a href="/cart">السلة</a><a href="/marketer">للمسوّقين</a></nav>
<a class="btn brand" href="/products">تسوق الآن</a>
</div></header>

<main class="wrap">
<section class="hero"><div class="eyebrow">مساحتك الشخصية</div><h1>مرحباً بك في حسابك</h1><p>تابع طلباتك وبياناتك من مكان واحد.</p></section>
<section class="layout">
<aside class="side">
<div class="user"><div class="avatar">SC</div><div><b>حساب العميل</b><span>عضو في Syria Commerce</span></div></div>
<nav class="menu">
<a class="active" href="/account">نظرة عامة</a>
<a href="/account/orders">طلباتي</a>
<a href="/account/profile">بياناتي</a>
<a href="/account/addresses">عناويني</a>
<a href="/products">تصفح المنتجات</a>
</nav>
</aside>

<section class="panel">
<div class="panelhead"><h2>ملخص الحساب</h2><span>آخر تحديث تلقائي</span></div>
<div class="stats">
<div class="stat"><small>إجمالي الطلبات</small><b>8</b></div>
<div class="stat"><small>طلبات قيد التنفيذ</small><b>2</b></div>
<div class="stat"><small>طلبات مكتملة</small><b>6</b></div>
</div>

<div class="panelhead"><h2>آخر الطلبات</h2><span>عرض الكل</span></div>
<div class="order"><div><b>#SC-10482</b><span>3 منتجات · 28 أغسطس 2026</span></div><span class="status live">قيد التجهيز</span><div class="price">185,000 SYP</div></div>
<div class="order"><div><b>#SC-10391</b><span>منتجان · 22 أغسطس 2026</span></div><span class="status">تم التسليم</span><div class="price">120,000 SYP</div></div>
<div class="order"><div><b>#SC-10277</b><span>منتج واحد · 15 أغسطس 2026</span></div><span class="status">تم التسليم</span><div class="price">75,000 SYP</div></div>

<div class="notice"><b>طلبك عبر مسوّق؟</b><br>إذا وصلت إلى المتجر من رابط مسوّق، يتم حفظ الإحالة مع الطلب تلقائياً حتى لا تضيع العمولة.</div>
</section>
</section>
</main>
</body></html>`, "حسابي | Syria Commerce");
    }

    if (request.method === "GET" && url.pathname === "/marketer") {
      return htmlResponse(`<!doctype html><html lang="ar" dir="rtl"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>مساحة المسوّق | Syria Commerce</title>
<style>
:root{--ink:#171414;--paper:#fbf8f5;--white:#fff;--brand:#e54845;--soft:#f5e7e2;--line:#e9e1dc;--muted:#756a65}
*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font-family:Arial,Tahoma,sans-serif}.wrap{max-width:1220px;margin:auto;padding:0 22px}a{text-decoration:none;color:inherit}
.top{height:32px;background:var(--ink);color:#eee;font-size:10px}.topin{height:100%;display:flex;justify-content:space-between;align-items:center}.top b{color:#ffaaa6}
.nav{height:74px;background:#fff;border-bottom:1px solid var(--line);position:sticky;top:0;z-index:5}.navin{height:100%;display:flex;align-items:center;gap:24px}.logo{display:flex;gap:10px;align-items:center;font-size:19px;font-weight:950}.logo i{font-style:normal;background:var(--brand);color:#fff;padding:11px 12px;border-radius:11px}.links{display:flex;gap:3px;flex:1}.links a{font-size:12px;font-weight:850;padding:10px 11px;border-radius:9px;color:#554b47}.links a.active,.links a:hover{background:var(--soft);color:var(--brand)}.avatar{width:34px;height:34px;border-radius:10px;background:var(--soft);display:grid;place-items:center;color:var(--brand);font-weight:900;font-size:10px}
.hero{padding:42px 0 20px}.heroIn{display:flex;justify-content:space-between;align-items:end}.eyebrow{font-size:10px;color:var(--brand);font-weight:950}.hero h1{font-size:39px;letter-spacing:-1.5px;margin:7px 0}.hero p{font-size:13px;color:var(--muted);margin:0}.period{font-size:10px;background:#fff;border:1px solid var(--line);padding:10px 12px;border-radius:10px;color:var(--muted)}
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:20px 0 13px}.kpi,.panel{background:#fff;border:1px solid var(--line);border-radius:19px}.kpi{padding:18px}.kpiTop{display:flex;justify-content:space-between;color:var(--muted);font-size:10px}.dot{width:8px;height:8px;border-radius:50%;background:var(--brand)}.kpi b{display:block;font-size:25px;margin-top:12px}.trend{font-size:9px;color:#19745d;font-weight:900;margin-top:6px}
.grid{display:grid;grid-template-columns:1.25fr .75fr;gap:12px}.panel{padding:20px}.head{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}.head h2{font-size:17px;margin:0}.head span{font-size:9px;color:var(--muted)}
.chart{height:220px;display:flex;align-items:end;gap:9px;border-bottom:1px solid var(--line);padding:15px 4px 0}.bar{flex:1;background:var(--soft);border-radius:7px 7px 0 0}.bar.hot{background:var(--brand)}
.rank{display:flex;align-items:center;gap:10px;padding:12px 0;border-top:1px solid var(--line)}.rank:first-child{border-top:0}.rankImg{width:42px;height:42px;border-radius:12px;background:#f3eee9;display:grid;place-items:center}.rankMain{flex:1}.rankMain b{display:block;font-size:11px}.rankMain span{font-size:9px;color:var(--muted)}.profit{font-size:11px;font-weight:950;color:#19745d}
.tools{display:grid;grid-template-columns:1fr 1fr;gap:9px}.tool{border:1px solid var(--line);border-radius:14px;padding:15px}.tool b{display:block;font-size:11px;margin:8px 0 4px}.tool span{font-size:9px;color:var(--muted);line-height:1.6}.tool a{display:block;color:var(--brand);font-size:9px;font-weight:900;margin-top:9px}
.ref{background:var(--ink);color:#fff;border-radius:19px;padding:20px}.ref h2{font-size:17px;margin:0 0 5px}.ref p{font-size:10px;color:#c9bfba;line-height:1.6}.refbox{background:#fff;color:var(--ink);border-radius:10px;padding:11px;font-size:9px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.refrow{display:flex;gap:7px;margin-top:8px}.btn{border:0;border-radius:10px;padding:10px 13px;font-weight:900;font-size:10px;cursor:pointer}.brand{background:var(--brand);color:#fff}.light{background:#fff;color:var(--ink)}
.orders{margin-top:12px}.order{display:grid;grid-template-columns:1fr auto auto;gap:12px;align-items:center;padding:14px 0;border-top:1px solid var(--line)}.order:first-of-type{border-top:0}.order b{font-size:11px}.order small{display:block;color:var(--muted);font-size:9px;margin-top:4px}.status{font-size:8px;font-weight:900;background:#f0ede9;padding:7px 9px;border-radius:99px}.pending{background:var(--soft);color:var(--brand)}.amount{font-size:11px;font-weight:950}
.footer{padding:30px 0 45px;color:var(--muted);font-size:10px}.foot{display:flex;justify-content:space-between}
@media(max-width:900px){.links{display:none}.kpis{grid-template-columns:1fr 1fr}.grid{grid-template-columns:1fr}.heroIn{align-items:start;gap:15px;flex-direction:column}}
@media(max-width:600px){.top{display:none}.hero h1{font-size:32px}.kpi{padding:14px}.kpi b{font-size:21px}.tools{grid-template-columns:1fr}.order{grid-template-columns:1fr auto}.amount{grid-column:1}.foot{flex-direction:column;gap:8px}}
</style></head><body>
<div class="top"><div class="wrap topin"><span>مساحة المسوّق · كل أرقامك في مكان واحد</span><span>دعم المسوّقين · Syria Commerce</span></div></div>
<header class="nav"><div class="wrap navin"><a class="logo" href="/"><i>SC</i><span>Syria Commerce</span></a>
<nav class="links"><a class="active" href="/marketer">نظرة عامة</a><a href="/products">المنتجات</a><a href="/marketer/orders">الطلبات</a><a href="/marketer/commissions">العمولات</a><a href="/marketer/tools">أدوات التسويق</a></nav><a href="/account" class="avatar">مس</a></div></header>
<main class="wrap"><section class="hero"><div class="heroIn"><div><div class="eyebrow">MARKETER WORKSPACE</div><h1>مساحتك للبيع والنمو.</h1><p>تابع مبيعاتك وعمولاتك وروابط منتجاتك من لوحة واحدة.</p></div><div class="period">آخر 30 يومًا ▾</div></div></section>
<section class="kpis">
<div class="kpi"><div class="kpiTop"><span>إجمالي المبيعات</span><i class="dot"></i></div><b>12.4M</b><div class="trend">↑ 18.6%</div></div>
<div class="kpi"><div class="kpiTop"><span>عمولاتك</span><i class="dot"></i></div><b>1.84M</b><div class="trend">↑ 12.2%</div></div>
<div class="kpi"><div class="kpiTop"><span>الطلبات</span><i class="dot"></i></div><b>86</b><div class="trend">↑ 9 طلبات جديدة</div></div>
<div class="kpi"><div class="kpiTop"><span>نسبة التحويل</span><i class="dot"></i></div><b>6.8%</b><div class="trend">↑ 1.1 نقطة</div></div></section>
<section class="grid"><div class="panel"><div class="head"><h2>أداء المبيعات</h2><span>آخر 30 يومًا</span></div><div class="chart">
<div class="bar" style="height:34%"></div><div class="bar" style="height:42%"></div><div class="bar hot" style="height:55%"></div><div class="bar" style="height:47%"></div><div class="bar" style="height:63%"></div><div class="bar hot" style="height:70%"></div><div class="bar" style="height:58%"></div><div class="bar" style="height:78%"></div><div class="bar hot" style="height:88%"></div><div class="bar" style="height:74%"></div><div class="bar" style="height:92%"></div><div class="bar hot" style="height:100%"></div></div></div>
<div class="panel"><div class="head"><h2>أفضل المنتجات</h2><span>حسب الربح</span></div>
<div class="rank"><div class="rankImg">🎧</div><div class="rankMain"><b>سماعة بلوتوث</b><span>24 طلب</span></div><div class="profit">+420K</div></div>
<div class="rank"><div class="rankImg">⌚</div><div class="rankMain"><b>ساعة رجالية</b><span>18 طلب</span></div><div class="profit">+360K</div></div>
<div class="rank"><div class="rankImg">🧴</div><div class="rankMain"><b>عطر رجالي</b><span>15 طلب</span></div><div class="profit">+285K</div></div></div></section>
<section class="grid" style="margin-top:12px"><div class="panel"><div class="head"><h2>أدوات التسويق</h2><span>كل ما تحتاجه</span></div><div class="tools">
<div class="tool"><b>🔗 روابط الإحالة</b><span>أنشئ رابطًا خاصًا لأي منتج وتتبع مبيعاتك.</span><a href="/products">اختيار منتج ←</a></div>
<div class="tool"><b>📸 محتوى جاهز</b><span>صور ونصوص تساعدك على إطلاق الإعلان أسرع.</span><a href="/marketer/tools">فتح الأدوات ←</a></div>
<div class="tool"><b>📊 تقرير الأداء</b><span>اعرف المنتجات التي تحقق أفضل نتيجة.</span><a href="/marketer/commissions">عرض التقرير ←</a></div>
<div class="tool"><b>💳 العمولات</b><span>تابع المستحق والمعلّق والمدفوع بوضوح.</span><a href="/marketer/commissions">عرض العمولات ←</a></div></div></div>
<div class="ref"><h2>رابطك التسويقي</h2><p>أي طلب يأتي من رابطك يُنسب لحسابك.</p><div class="refbox">https://syria-commerce.com/r/marketer-demo</div><div class="refrow"><button class="btn brand" onclick="navigator.clipboard&&navigator.clipboard.writeText('https://syria-commerce.com/r/marketer-demo');this.textContent='تم النسخ ✓'">نسخ الرابط</button><a class="btn light" href="/products">اختيار منتج</a></div></div></section>
<section class="panel orders"><div class="head"><h2>آخر الطلبات</h2><a href="/marketer/orders" style="font-size:9px;color:var(--brand);font-weight:900">عرض الكل ←</a></div>
<div class="order"><div><b>#SC-10482</b><small>سماعة بلوتوث · عبر رابطك</small></div><span class="status pending">قيد التجهيز</span><div class="amount">185,000 SYP</div></div>
<div class="order"><div><b>#SC-10391</b><small>ساعة رجالية · عبر رابطك</small></div><span class="status">مكتمل</span><div class="amount">120,000 SYP</div></div>
<div class="order"><b>#SC-10340</b><small>عطر رجالي · عبر رابطك</small><span class="status">مكتمل</span><div class="amount">95,000 SYP</div></div></section></main>
<footer class="footer"><div class="wrap foot"><span>© 2026 Syria Commerce</span><span>مساحة المسوّق · الدعم · سياسة الاستخدام</span></div></footer>
</body></html>`, "مساحة المسوّق | Syria Commerce");
    }


    if (request.method === "GET" && (url.pathname === "/login" || url.pathname === "/register" || url.pathname === "/forgot-password")) {
      const mode = url.pathname === "/register" ? "register" : url.pathname === "/forgot-password" ? "forgot" : "login";
      return htmlResponse(`<!doctype html><html lang="ar" dir="rtl"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${mode==="register"?"إنشاء حساب":mode==="forgot"?"استعادة كلمة المرور":"تسجيل الدخول"} | Syria Commerce</title>
<style>
:root{--ink:#171414;--paper:#fbf8f5;--white:#fff;--brand:#e54845;--soft:#f5e7e2;--line:#e9e1dc;--muted:#756a65}
*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font-family:Arial,Tahoma,sans-serif}.wrap{max-width:1120px;margin:auto;padding:0 22px}
.nav{height:74px;background:#fff;border-bottom:1px solid var(--line)}.navin{height:100%;display:flex;align-items:center;justify-content:space-between}.logo{display:flex;align-items:center;gap:10px;font-size:19px;font-weight:950}.logo i{font-style:normal;background:var(--brand);color:#fff;border-radius:11px;padding:11px 12px}.nav a{font-size:11px;font-weight:900}.back{color:var(--muted)}
.main{min-height:calc(100vh - 74px);display:grid;grid-template-columns:1fr 420px;gap:70px;align-items:center;padding:55px 0}.copy .eyebrow{font-size:10px;color:var(--brand);font-weight:950}.copy h1{font-size:50px;letter-spacing:-2px;line-height:1.05;margin:9px 0 14px}.copy p{font-size:13px;color:var(--muted);line-height:1.8;max-width:500px}.points{margin-top:25px;display:grid;gap:11px}.point{display:flex;gap:10px;align-items:center;font-size:11px;font-weight:800}.point i{width:27px;height:27px;border-radius:9px;background:var(--soft);display:grid;place-items:center;color:var(--brand);font-style:normal}
.card{background:#fff;border:1px solid var(--line);border-radius:22px;padding:27px;box-shadow:0 18px 50px rgba(23,20,20,.06)}.card h2{font-size:22px;margin:0 0 7px}.sub{font-size:10px;color:var(--muted);margin-bottom:22px}.field{margin-bottom:13px}.field label{display:block;font-size:10px;font-weight:850;margin-bottom:6px}.field input,.field select{width:100%;height:45px;border:1px solid var(--line);border-radius:11px;padding:0 12px;font-size:11px;background:#fff;color:var(--ink);outline:0}.field input:focus,.field select:focus{border-color:var(--brand);box-shadow:0 0 0 3px var(--soft)}.row{display:flex;gap:9px}.row>*{flex:1}.btn{width:100%;height:46px;border:0;border-radius:11px;background:var(--brand);color:#fff;font-weight:950;cursor:pointer}.links{display:flex;justify-content:space-between;margin-top:14px;font-size:10px}.links a{color:var(--brand);font-weight:900}.terms{font-size:9px;color:var(--muted);line-height:1.7;margin-top:13px}.role{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-bottom:15px}.role label{border:1px solid var(--line);border-radius:10px;padding:11px;text-align:center;font-size:10px;font-weight:900;cursor:pointer}.role input{display:none}.role input:checked+span{color:var(--brand)}.role label:has(input:checked){border-color:var(--brand);background:var(--soft)}
@media(max-width:800px){.main{grid-template-columns:1fr;gap:25px;padding:35px 0}.copy h1{font-size:38px}.copy{order:1}.card{order:2}}
</style></head><body>
<header class="nav"><div class="wrap navin"><a class="logo" href="/"><i>SC</i><span>Syria Commerce</span></a><a class="back" href="/">العودة للرئيسية ←</a></div></header>
<main class="wrap main">
<section class="copy"><div class="eyebrow">SYRIA COMMERCE</div><h1>${mode==="register"?"ابدأ تجارتك من هنا.":mode==="forgot"?"استرجع وصولك بسهولة.":"أهلاً بعودتك."}</h1><p>${mode==="register"?"أنشئ حسابك وابدأ بالتسوق أو التسويق من مساحة واحدة مصممة ببساطة.":mode==="forgot"?"أدخل بريدك الإلكتروني وسنرسل لك خطوات إعادة تعيين كلمة المرور.":"سجّل دخولك للوصول إلى طلباتك أو مساحة المسوّق الخاصة بك."}</p>
<div class="points"><div class="point"><i>✓</i> حساب آمن وتجربة بسيطة</div><div class="point"><i>✓</i> طلباتك وبياناتك في مكان واحد</div><div class="point"><i>✓</i> مساحة مستقلة للمسوّقين</div></div></section>
<section class="card">
<h2>${mode==="register"?"إنشاء حساب":mode==="forgot"?"نسيت كلمة المرور؟":"تسجيل الدخول"}</h2>
<div class="sub">${mode==="register"?"أنشئ حسابًا جديدًا خلال دقائق.":mode==="forgot"?"لا تقلق، سنساعدك على استعادة الحساب.":"أدخل بيانات حسابك للمتابعة."}</div>
${mode==="register"?'<div class="role"><label><input type="radio" name="role" checked><span>عميل</span></label><label><input type="radio" name="role"><span>مسوّق</span></label></div>':''}
${mode==="register"?'<div class="field"><label>الاسم الكامل</label><input placeholder="مثال: محمد أحمد"></div>':''}
<div class="field"><label>البريد الإلكتروني</label><input type="email" placeholder="name@example.com"></div>
${mode!=="forgot"?'<div class="field"><label>كلمة المرور</label><input type="password" placeholder="••••••••"></div>':''}
${mode==="register"?'<div class="field"><label>تأكيد كلمة المرور</label><input type="password" placeholder="••••••••"></div>':''}
<button class="btn">${mode==="register"?"إنشاء الحساب":mode==="forgot"?"إرسال رابط الاستعادة":"دخول"}</button>
<div class="links">${mode!=="forgot"?'<a href="/forgot-password">نسيت كلمة المرور؟</a>':''}<a href="${mode==="register"?"/login":"/register"}">${mode==="register"?"لديك حساب؟ تسجيل الدخول":"إنشاء حساب جديد"}</a></div>
<div class="terms">بالاستمرار، أنت توافق على شروط الاستخدام وسياسة الخصوصية.</div>
</section></main></body></html>`, "Authentication | Syria Commerce");
    }


    if (url.pathname === "/api/products" && request.method === "GET") {
      if (!env || !env.DB) {
        return jsonResponse({ ok: true, products: [], source: "database-not-bound" });
      }
      const status = url.searchParams.get("status") || "active";
      const category = url.searchParams.get("category");
      const q = url.searchParams.get("q");
      let sql = `SELECT p.*, c.name AS category_name
                 FROM products p LEFT JOIN categories c ON c.id=p.category_id
                 WHERE p.status = ?`;
      const params = [status];
      if (category) { sql += " AND p.category_id = ?"; params.push(category); }
      if (q) { sql += " AND (p.name LIKE ? OR p.description LIKE ?)"; params.push("%"+q+"%", "%"+q+"%"); }
      sql += " ORDER BY p.created_at DESC";
      const result = await env.DB.prepare(sql).bind(...params).all();
      return jsonResponse({ ok: true, products: result.results || [] });
    }

    if (url.pathname.startsWith("/api/products/") && request.method === "GET") {
      const id = url.pathname.split("/").pop();
      if (!env || !env.DB) {
        return jsonResponse({ ok: false, error: "DATABASE_NOT_BOUND" }, 503);
      }
      const result = await env.DB.prepare(
        `SELECT p.*, c.name AS category_name
         FROM products p LEFT JOIN categories c ON c.id=p.category_id
         WHERE p.id=? OR p.slug=? LIMIT 1`
      ).bind(id, id).first();
      if (!result) return jsonResponse({ ok: false, error: "PRODUCT_NOT_FOUND" }, 404);
      const images = await env.DB.prepare(
        `SELECT * FROM product_images WHERE product_id=? ORDER BY sort_order`
      ).bind(result.id).all();
      return jsonResponse({ ok: true, product: result, images: images.results || [] });
    }

    if (url.pathname === "/api/categories" && request.method === "GET") {
      if (!env || !env.DB) return jsonResponse({ ok: true, categories: [], source: "database-not-bound" });
      const result = await env.DB.prepare(
        `SELECT * FROM categories WHERE is_active=1 ORDER BY sort_order, name`
      ).all();
      return jsonResponse({ ok: true, categories: result.results || [] });
    }


    if (url.pathname === "/api/orders" && request.method === "POST") {
      if (!env || !env.DB) return jsonResponse({ok:false,error:"DATABASE_NOT_BOUND"},503);
      let body;
      try { body = await request.json(); } catch { return jsonResponse({ok:false,error:"INVALID_JSON"},400); }

      const items = Array.isArray(body.items) ? body.items : [];
      if (!items.length) return jsonResponse({ok:false,error:"EMPTY_CART"},400);
      if (!body.customer_name || !body.customer_phone || !body.governorate || !body.address_line)
        return jsonResponse({ok:false,error:"MISSING_CUSTOMER_DATA"},400);

      const ids = items.map(x => x.product_id).filter(Boolean);
      if (!ids.length) return jsonResponse({ok:false,error:"INVALID_ITEMS"},400);

      const placeholders = ids.map(() => "?").join(",");
      const products = await env.DB.prepare(
        `SELECT * FROM products WHERE id IN (${placeholders}) AND status='active'`
      ).bind(...ids).all();
      const productMap = Object.fromEntries((products.results || []).map(p => [p.id, p]));

      let subtotal = 0;
      const normalized = [];
      for (const item of items) {
        const p = productMap[item.product_id];
        const qty = Math.max(1, Number(item.quantity || 1));
        if (!p) return jsonResponse({ok:false,error:"PRODUCT_NOT_FOUND",product_id:item.product_id},404);
        if (Number(p.stock) < qty) return jsonResponse({ok:false,error:"INSUFFICIENT_STOCK",product_id:p.id},409);
        const line = Number(p.price) * qty;
        const commission = line * (Number(p.commission_rate || 0) / 100);
        subtotal += line;
        normalized.push({p, qty, line, commission});
      }

      const shipping = Number(body.shipping_fee || 0);
      const total = subtotal + shipping;
      const orderId = crypto.randomUUID();
      const orderNumber = "SC-" + String(Date.now()).slice(-8);

      // Referral attribution: marketer_id may be supplied by a trusted session later;
      // referral_code is resolved server-side to avoid trusting a raw marketer id.
      let marketerId = null;
      let referralCode = body.referral_code || null;
      if (referralCode) {
        const ref = await env.DB.prepare(
          `SELECT user_id, referral_code FROM marketer_profiles WHERE referral_code=? LIMIT 1`
        ).bind(referralCode).first();
        if (ref) {
          marketerId = ref.user_id;
          referralCode = ref.referral_code;
        } else {
          referralCode = null;
        }
      }

      await env.DB.prepare(
        `INSERT INTO orders
        (id,order_number,customer_id,marketer_id,referral_code,status,customer_name,customer_phone,
         governorate,area,address_line,notes,subtotal,shipping_fee,total)
         VALUES (?,?,?,?,?,'pending',?,?,?,?,?,?,?,?,?,?)`
      ).bind(
        orderId, orderNumber, body.customer_id || null, marketerId, referralCode,
        body.customer_name, body.customer_phone, body.governorate, body.area || null,
        body.address_line, body.notes || null, subtotal, shipping, total
      ).run();

      for (const x of normalized) {
        await env.DB.prepare(
          `INSERT INTO order_items
          (id,order_id,product_id,product_name,unit_price,quantity,commission_rate,commission_amount,line_total)
          VALUES (?,?,?,?,?,?,?,?,?)`
        ).bind(
          crypto.randomUUID(), orderId, x.p.id, x.p.name, x.p.price, x.qty,
          x.p.commission_rate || 0, marketerId ? x.commission : 0, x.line
        ).run();

        await env.DB.prepare(
          `UPDATE products SET stock=stock-?, updated_at=CURRENT_TIMESTAMP WHERE id=?`
        ).bind(x.qty, x.p.id).run();
      }

      if (marketerId) {
        const commissionTotal = normalized.reduce((a,x) => a + x.commission, 0);
        await env.DB.prepare(
          `INSERT INTO commissions (id,order_id,marketer_id,amount,status)
           VALUES (?,?,?,?,'pending')`
        ).bind(crypto.randomUUID(), orderId, marketerId, commissionTotal).run();
        await env.DB.prepare(
          `UPDATE marketer_profiles
           SET pending_balance=pending_balance+?, total_sales=total_sales+?, total_orders=total_orders+1,
               updated_at=CURRENT_TIMESTAMP WHERE user_id=?`
        ).bind(commissionTotal, total, marketerId).run();
      }

      return jsonResponse({
        ok:true, order_id:orderId, order_number:orderNumber,
        subtotal, shipping_fee:shipping, total, marketer_id:marketerId,
        referral_code:referralCode
      },201);
    }

    if (url.pathname === "/api/orders" && request.method === "GET") {
      if (!env || !env.DB) return jsonResponse({ok:false,error:"DATABASE_NOT_BOUND"},503);
      const customerId = url.searchParams.get("customer_id");
      const marketerId = url.searchParams.get("marketer_id");
      let sql = `SELECT * FROM orders WHERE 1=1`;
      const params = [];
      if (customerId) { sql += " AND customer_id=?"; params.push(customerId); }
      if (marketerId) { sql += " AND marketer_id=?"; params.push(marketerId); }
      sql += " ORDER BY created_at DESC LIMIT 100";
      const result = await env.DB.prepare(sql).bind(...params).all();
      return jsonResponse({ok:true,orders:result.results || []});
    }

    if (url.pathname.startsWith("/api/orders/") && request.method === "GET") {
      if (!env || !env.DB) return jsonResponse({ok:false,error:"DATABASE_NOT_BOUND"},503);
      const id = url.pathname.split("/").pop();
      const order = await env.DB.prepare(
        `SELECT * FROM orders WHERE id=? OR order_number=? LIMIT 1`
      ).bind(id,id).first();
      if (!order) return jsonResponse({ok:false,error:"ORDER_NOT_FOUND"},404);
      const items = await env.DB.prepare(
        `SELECT * FROM order_items WHERE order_id=?`
      ).bind(order.id).all();
      return jsonResponse({ok:true,order,items:items.results || []});
    }


    if (url.pathname === "/api/referrals/resolve" && request.method === "GET") {
      if (!env || !env.DB) return jsonResponse({ok:false,error:"DATABASE_NOT_BOUND"},503);
      const code = (url.searchParams.get("code") || "").trim();
      if (!code) return jsonResponse({ok:false,error:"MISSING_REFERRAL_CODE"},400);
      const marketer = await env.DB.prepare(
        `SELECT u.id AS marketer_id,u.full_name,mp.referral_code,mp.commission_rate
         FROM marketer_profiles mp JOIN users u ON u.id=mp.user_id
         WHERE mp.referral_code=? AND u.role='marketer' AND u.status='active' LIMIT 1`
      ).bind(code).first();
      if (!marketer) return jsonResponse({ok:false,error:"INVALID_REFERRAL"},404);
      return jsonResponse({ok:true,referral:{
        marketer_id:marketer.marketer_id,
        marketer_name:marketer.full_name,
        referral_code:marketer.referral_code,
        commission_rate:marketer.commission_rate
      }});
    }

    if (url.pathname === "/api/referrals/click" && request.method === "POST") {
      if (!env || !env.DB) return jsonResponse({ok:false,error:"DATABASE_NOT_BOUND"},503);
      let body;
      try { body = await request.json(); } catch { return jsonResponse({ok:false,error:"INVALID_JSON"},400); }
      const code = (body.referral_code || "").trim();
      if (!code) return jsonResponse({ok:false,error:"MISSING_REFERRAL_CODE"},400);
      const marketer = await env.DB.prepare(
        `SELECT user_id,referral_code FROM marketer_profiles WHERE referral_code=? LIMIT 1`
      ).bind(code).first();
      if (!marketer) return jsonResponse({ok:false,error:"INVALID_REFERRAL"},404);
      const id = crypto.randomUUID();
      await env.DB.prepare(
        `INSERT INTO referrals(id,marketer_id,referral_code,product_id,customer_id,clicks,last_clicked_at)
         VALUES(?,?,?,?,?,1,CURRENT_TIMESTAMP)`
      ).bind(id,marketer.user_id,marketer.referral_code,body.product_id || null,body.customer_id || null).run();
      return jsonResponse({ok:true,tracked:true,referral_id:id});
    }

    if (url.pathname === "/api/referrals/marketer" && request.method === "GET") {
      if (!env || !env.DB) return jsonResponse({ok:false,error:"DATABASE_NOT_BOUND"},503);
      const marketerId = url.searchParams.get("marketer_id");
      if (!marketerId) return jsonResponse({ok:false,error:"MISSING_MARKETER_ID"},400);
      const result = await env.DB.prepare(
        `SELECT referral_code, product_id, SUM(clicks) AS clicks,
                MAX(last_clicked_at) AS last_clicked_at, MAX(created_at) AS created_at
         FROM referrals WHERE marketer_id=? GROUP BY referral_code,product_id
         ORDER BY last_clicked_at DESC LIMIT 200`
      ).bind(marketerId).all();
      return jsonResponse({ok:true,referrals:result.results || []});
    }


    if (url.pathname === "/api/commissions" && request.method === "GET") {
      if (!env || !env.DB) return jsonResponse({ok:false,error:"DATABASE_NOT_BOUND"},503);
      const marketerId = url.searchParams.get("marketer_id");
      if (!marketerId) return jsonResponse({ok:false,error:"MISSING_MARKETER_ID"},400);
      const result = await env.DB.prepare(
        `SELECT c.*,o.order_number,o.status AS order_status,o.total AS order_total
         FROM commissions c JOIN orders o ON o.id=c.order_id
         WHERE c.marketer_id=? ORDER BY c.created_at DESC LIMIT 200`
      ).bind(marketerId).all();
      const totals = await env.DB.prepare(
        `SELECT
          COALESCE(SUM(amount),0) AS total,
          COALESCE(SUM(CASE WHEN status='pending' THEN amount ELSE 0 END),0) AS pending,
          COALESCE(SUM(CASE WHEN status='approved' THEN amount ELSE 0 END),0) AS approved,
          COALESCE(SUM(CASE WHEN status='paid' THEN amount ELSE 0 END),0) AS paid
         FROM commissions WHERE marketer_id=?`
      ).bind(marketerId).first();
      return jsonResponse({ok:true,commissions:result.results || [],totals});
    }

    if (url.pathname.startsWith("/api/commissions/") && request.method === "PATCH") {
      if (!env || !env.DB) return jsonResponse({ok:false,error:"DATABASE_NOT_BOUND"},503);
      const id = url.pathname.split("/").pop();
      let body;
      try { body = await request.json(); } catch { return jsonResponse({ok:false,error:"INVALID_JSON"},400); }
      const next = body.status;
      if (!["approved","rejected","paid"].includes(next))
        return jsonResponse({ok:false,error:"INVALID_STATUS"},400);

      const commission = await env.DB.prepare(
        `SELECT * FROM commissions WHERE id=? LIMIT 1`
      ).bind(id).first();
      if (!commission) return jsonResponse({ok:false,error:"COMMISSION_NOT_FOUND"},404);

      const now = new Date().toISOString();
      if (next === "approved") {
        if (commission.status !== "pending")
          return jsonResponse({ok:false,error:"INVALID_TRANSITION"},409);
        await env.DB.prepare(
          `UPDATE commissions SET status='approved',approved_at=? WHERE id=?`
        ).bind(now,id).run();
        await env.DB.prepare(
          `UPDATE marketer_profiles
           SET balance=balance+?, pending_balance=pending_balance-?,
               updated_at=CURRENT_TIMESTAMP WHERE user_id=?`
        ).bind(commission.amount,commission.amount,commission.marketer_id).run();
      } else if (next === "rejected") {
        if (!["pending","approved"].includes(commission.status))
          return jsonResponse({ok:false,error:"INVALID_TRANSITION"},409);
        if (commission.status === "approved") {
          await env.DB.prepare(
            `UPDATE marketer_profiles SET balance=balance-?,updated_at=CURRENT_TIMESTAMP WHERE user_id=?`
          ).bind(commission.amount,commission.marketer_id).run();
        } else {
          await env.DB.prepare(
            `UPDATE marketer_profiles SET pending_balance=pending_balance-?,updated_at=CURRENT_TIMESTAMP WHERE user_id=?`
          ).bind(commission.amount,commission.marketer_id).run();
        }
        await env.DB.prepare(
          `UPDATE commissions SET status='rejected' WHERE id=?`
        ).bind(id).run();
      } else if (next === "paid") {
        if (commission.status !== "approved")
          return jsonResponse({ok:false,error:"INVALID_TRANSITION"},409);
        await env.DB.prepare(
          `UPDATE commissions SET status='paid',paid_at=? WHERE id=?`
        ).bind(now,id).run();
        await env.DB.prepare(
          `UPDATE marketer_profiles SET balance=balance-?,updated_at=CURRENT_TIMESTAMP WHERE user_id=?`
        ).bind(commission.amount,commission.marketer_id).run();
      }
      return jsonResponse({ok:true,commission_id:id,status:next});
    }


  }
};
