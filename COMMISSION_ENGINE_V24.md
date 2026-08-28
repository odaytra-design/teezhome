# Commission Engine V24

Added:
- GET /api/commissions?marketer_id=...
- PATCH /api/commissions/:id

Commission lifecycle:
pending → approved → paid
pending → rejected
approved → rejected

Balances:
- New valid referral order adds to pending_balance.
- Approval moves amount from pending_balance to balance.
- Payment removes amount from balance.
- Rejection reverses the corresponding balance.

Next: connect admin controls and marketer commission UI to these APIs.
