# Referral System V23

Added referral endpoints:
- GET /api/referrals/resolve?code=...
- POST /api/referrals/click
- GET /api/referrals/marketer?marketer_id=...

Referral resolution validates that the code belongs to an active marketer.
Order creation already resolves referral_code server-side and stores marketer_id, so the commission chain remains tied to the order.

Next: Commission Engine — approval/rejection/payment state transitions and marketer balances.
