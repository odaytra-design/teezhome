# Database V20

هذه أول طبقة حقيقية للبيانات في Syria Commerce.

## التقنية
Schema متوافق مع SQLite وCloudflare D1.

## العلاقات الأساسية
Users
→ Customer / Marketer profiles
→ Products / Categories
→ Referrals
→ Orders → Order Items
→ Commissions → Payouts

## أهم قاعدة
أي طلب يأتي من رابط مسوّق يخزن:
- marketer_id
- referral_code

وبالتالي لا تضيع إحالة المسوّق حتى لو العميل نفسه نفّذ الطلب.

## الملفات
- schema.sql: الجداول والفهارس
- seed.sql: بيانات تجريبية فقط

## المرحلة التالية
ربط الـWorker/Backend بهذا الـDB، ثم نقل Products وOrders من البيانات التجريبية إلى D1.
