# Orders Backend V22

Added:
- POST /api/orders
- GET /api/orders
- GET /api/orders/:id

POST validates customer/address/cart, reads active products from D1, calculates subtotal/shipping/total, checks stock, creates order items, decrements stock, resolves referral_code to marketer_id, and creates a pending commission when the order came through a valid marketer referral.

Next: Referral System hardening + tracking, then Commission Engine.
