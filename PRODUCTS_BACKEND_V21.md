# Products Backend V21

Added D1 API routes:

- GET /api/products
- GET /api/products/:id
- GET /api/categories

Supports:
- status filtering
- category filtering
- search query
- product details
- product images
- category list

The routes return `DATABASE_NOT_BOUND`/empty data when D1 is not attached yet, so the UI can be developed without crashing.

Next: bind Cloudflare D1, run migration 0001, then connect Products UI to these endpoints.
