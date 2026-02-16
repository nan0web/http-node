# @nan0web/auth-node

Authorization server for the nan0web ecosystem.

<!-- %PACKAGE_STATUS% -->

## Description

A standalone, zero-framework Authorization Server with:
- **User Management** — signup, verification, password reset, account deletion
- **Token System** — access + refresh tokens with rotation registry
- **Access Control** — role-based permissions for private resources
- **Rate Limiting** — built-in brute-force protection
- **Playground** — interactive CLI to explore all flows

## Installation

How to install with npm?
```bash
npm install @nan0web/auth-node
```

## Server Initialization

Create and start the auth server with configuration options.

How to create and start AuthServer?
```js
import AuthServer from '@nan0web/auth-node'
import Logger from '@nan0web/log'

const server = new AuthServer({
	db: { cwd: './auth-data' },
	port: 4320,
	logger: new Logger(),
})

await server.start()
console.info('Server started on port:', server.port)
// Server started on port: 4320

// Graceful shutdown
await server.stop()
```

## API Reference

All endpoints are prefixed with `/auth`. Examples use `curl` with `localhost:3000`.

---

### POST /auth/signup — Register

The user must verify their email before logging in.

How to create a new user account?
```bash
curl -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","email":"alice@example.com","password":"secret123"}'
```

**Response** `200`:
```json
{ "message": "Verification code sent" }
```

| Status | Meaning |
|--------|---------|
| `200`  | Success — verification code sent (via email) |
| `400`  | Missing required fields |
| `409`  | User already exists |

### PUT /auth/signup/:username — Verify Account

Confirms user registration with the 6-digit code.
Returns token pair on success.

How to verify user account?
```bash
curl -X PUT http://localhost:3000/auth/signup/alice \
  -H "Content-Type: application/json" \
  -d '{"code":"123456"}'
```

**Response** `200`:
```json
{ "message": "Account verified", "accessToken": "...", "refreshToken": "..." }
```

| Status | Meaning |
|--------|---------|
| `200`  | Verified — tokens issued |
| `400`  | Already verified |
| `401`  | Invalid code |
| `404`  | User not found |

### POST /auth/signin/:username — Login

Authenticate with username and password. Account must be verified first.

How to login with password?
```bash
curl -X POST http://localhost:3000/auth/signin/alice \
  -H "Content-Type: application/json" \
  -d '{"password":"secret123"}'
```

**Response** `200`:
```json
{ "accessToken": "...", "refreshToken": "..." }
```

| Status | Meaning |
|--------|---------|
| `200`  | Success — tokens issued |
| `401`  | Invalid password |
| `403`  | Account not verified |
| `404`  | User not found |

### PUT /auth/refresh/:token — Refresh Tokens

Exchange a valid refresh token for a new token pair.
Pass `{ "replace": true }` to invalidate the old refresh token.

How to refresh access tokens?
```bash
curl -X PUT http://localhost:3000/auth/refresh/YOUR_REFRESH_TOKEN \
  -H "Content-Type: application/json" \
  -d '{"replace":true}'
```

**Response** `200`:
```json
{ "accessToken": "new_access", "refreshToken": "new_refresh" }
```

| Status | Meaning |
|--------|---------|
| `200`  | New tokens issued |
| `401`  | Invalid or expired refresh token |

---

### POST /auth/forgot/:username — Request Password Reset

Sends a 6-digit reset code to the user (via email in production).

How to request password reset?
```bash
curl -X POST http://localhost:3000/auth/forgot/alice
```

**Response** `200`:
```json
{ "message": "Reset code sent" }
```

| Status | Meaning |
|--------|---------|
| `200`  | Reset code generated |
| `404`  | User not found |

### PUT /auth/forgot/:username — Reset Password

Set a new password using the reset code.
All previous tokens are invalidated.

How to reset password with code?
```bash
curl -X PUT http://localhost:3000/auth/forgot/alice \
  -H "Content-Type: application/json" \
  -d '{"code":"654321","password":"newSecret456"}'
```

**Response** `200`:
```json
{ "message": "Password reset successful", "accessToken": "...", "refreshToken": "..." }
```

| Status | Meaning |
|--------|---------|
| `200`  | Password changed — new tokens issued |
| `401`  | Invalid reset code |
| `404`  | User not found |

---

### GET /auth/signin/:username — User Info

Returns user profile. Visibility depends on the requester's role.
Requires `Authorization: Bearer <token>`.

How to get user profile info?
```bash
curl http://localhost:3000/auth/signin/alice \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Response** `200` (own profile or admin):
```json
{ "name": "alice", "email": "alice@example.com", "verified": true, "roles": ["user"] }
```

| Access Level | Visible Fields |
|-------------|----------------|
| Own profile | All except password, codes |
| Admin       | All except password, codes |
| Other user  | name, email, createdAt |

### GET /auth/info — List Users (Admin)

Returns a list of all registered usernames. Admin role required.

How to list all users as admin?
```bash
curl http://localhost:3000/auth/info \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

**Response** `200`:
```json
{ "users": ["alice", "bob", "carol"] }
```

| Status | Meaning |
|--------|---------|
| `200`  | User list returned |
| `403`  | Not admin |

### GET /auth/access/info — Access Control Rules

Returns the current user's permissions: personal rules, group rules, and global rules.

How to get access control rules?
```bash
curl http://localhost:3000/auth/access/info \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Response** `200`:
```json
{ "userAccess": [], "groupRules": [], "globalRules": [], "groups": [] }
```

| Status | Meaning |
|--------|---------|
| `200`  | Access rules returned |
| `401`  | Not authenticated |

---

## Private Resources

All `/private/*` routes require `Authorization: Bearer <token>`.
Access is controlled by `.access` rules (see Access Control).

### POST /private/:path — Create/Update Resource

How to write a private resource?
```bash
curl -X POST http://localhost:3000/private/notes.json \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"My Note","content":"Hello World"}'
```

| Status | Meaning |
|--------|---------|
| `201`  | Created |
| `401`  | Not authenticated |
| `403`  | No write permission |

### GET /private/:path — Read Resource

How to read a private resource?
```bash
curl http://localhost:3000/private/notes.json \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

| Status | Meaning |
|--------|---------|
| `200`  | Resource data returned |
| `401`  | Not authenticated |
| `403`  | No read permission |
| `404`  | Resource not found |

### HEAD /private/:path — Check Resource Exists

How to check if private resource exists?
```bash
curl -I http://localhost:3000/private/notes.json \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

| Status | Meaning |
|--------|---------|
| `200`  | Exists |
| `401`  | Not authenticated |
| `403`  | No read permission |
| `404`  | Not found |

### DELETE /private/:path — Delete Resource

How to delete a private resource?
```bash
curl -X DELETE http://localhost:3000/private/notes.json \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

| Status | Meaning |
|--------|---------|
| `200`  | Deleted |
| `401`  | Not authenticated |
| `403`  | No delete permission |
| `404`  | Resource not found |

### DELETE /auth/signin/:username — Logout

Invalidates all tokens for the authenticated user.
Requires `Authorization: Bearer <token>` header.

How to logout user?
```bash
curl -X DELETE http://localhost:3000/auth/signin/alice \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Response** `200`:
```json
{ "message": "Logged out successfully" }
```

| Status | Meaning |
|--------|---------|
| `200`  | Logged out — all tokens cleared |
| `401`  | Not authenticated |
| `403`  | Not authorized (if trying to logout someone else) |
| `404`  | User not found |

### DELETE /auth/signup/:username — Delete Account

Permanently deletes the user account and all associated tokens.

How to delete user account?
```bash
curl -X DELETE http://localhost:3000/auth/signup/alice
```

**Response** `200`:
```json
{ "message": "Account deleted" }
```

| Status | Meaning |
|--------|---------|
| `200`  | Account deleted |
| `404`  | User not found |

---

## Authentication Flow

```
┌──────────┐     POST /auth/signup          ┌──────────┐
│  Client  │ ───────────────────────── >    │  Server  │
│          │ < ─ { message: "code sent" }   │          │
│          │                                │          │
│          │   PUT /auth/signup/:user       │          │
│          │ ──── { code: "123456" } ──── > │          │
│          │ < ── { accessToken, refresh }  │          │
│          │                                │          │
│          │   POST /auth/signin/:user      │          │
│          │ ──── { password } ──────── >   │          │
│          │ < ── { accessToken, refresh }  │          │
│          │                                │          │
│          │   GET /private/data.json       │          │
│          │ ── Bearer <accessToken> ── >   │          │
│          │ < ── { ... data ... }          │          │
│          │                                │          │
│          │   PUT /auth/refresh/:token     │          │
│          │ ──────────────────────────── > │          │
│          │ < ── { new accessToken }       │          │
│          │                                │          │
│          │   DELETE /auth/signin/:user    │          │
│          │ ── Bearer <accessToken> ── >   │          │
│          │ < ── { "Logged out" }          │          │
└──────────┘                                └──────────┘
```

## CLI

Run the auth server directly:

```bash
npx nan0auth
```

How to run auth server from CLI?

## Playground (Interactive CLI)

Explore all authentication flows interactively without writing code.

```bash
npm run play
```

**Available scenarios:**

| Scenario      | What it tests |
|---------------|---------------|
| `demo`        | Full flow: signup → verify → login → private resources → logout |
| `error-cases` | Duplicate signup, wrong password, unauthorized access |
| `token-flow`  | Token refresh, HEAD checks, resource lifecycle |

In playground mode, verification codes are automatically read from the database.

## Contributing

How to contribute? - [check here]($pkgURL/blob/main/CONTRIBUTING.md)

## License

How to license? - [ISC LICENSE]($pkgURL/blob/main/LICENSE) file.
