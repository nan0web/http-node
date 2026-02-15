# @nan0web/auth-node

Authorization node.js server for nan0web ecosystem.

<!-- %PACKAGE_STATUS% -->

## Description

The `@nan0web/auth-node` package provides a standalone Authorization Server capable of:
- **User Management**: Creating and managing users with roles and permissions.
- **Token Issuance**: Generating Access and Refresh tokens (JWT/opaque).
- **Authentication**: Verifying credentials and tokens.
- **RBAC**: Role-Based Access Control logic for permissions.
- **Rate Limiting**: Built-in protection against brute-force attacks.

## Installation

How to install with npm?
```bash
npm install @nan0web/auth-node
```

## Usage

### Server Initialization

Initialize the AuthServer with configuration options like port and database path.

How to create and start AuthServer?
```js
import AuthServer from '@nan0web/auth-node'
import { NoConsole } from '@nan0web/log'

const server = new AuthServer({
	db: { cwd: './auth-data' },
	port: 3000,
	logger: new NoConsole(),
})

await server.start()
console.log('Server started on port:', server.port)

// Graceful shutdown
await server.stop()
```

### Authorization Flow

The server exposes endpoints for login and token refresh.

How to authenticate user?
```
POST /auth/login     - { username, password }
POST /auth/refresh   - { refreshToken }
GET  /auth/me        - (with Bearer token)
```

## CLI

You can run the auth server directly via CLI:

```bash
npx nan0auth
```

CLI command exists
