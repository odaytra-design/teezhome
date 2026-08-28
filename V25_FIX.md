# V25 — Deployment Syntax Fix

Fixed the structural JavaScript error that caused Cloudflare/Wrangler to report:
`Expected "}" but found "if"` around index.js line 1272.

Cause:
The fetch() method was closed before the account/API route blocks, leaving `if` statements inside the `export default` object.

Fix:
All route blocks now remain inside fetch(), and the file closes fetch() and export default correctly.

Validated with Node ES-module syntax check.
