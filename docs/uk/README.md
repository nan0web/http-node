# @nan0web/http-node

Цей документ доступний іншими мовами:
- [English 🏴󠁧󠁢󠁥󠁮󠁧󠁿](../README.md)

Node.js HTTP клієнт та сервер, побудовані на нативних модулях з мінімальними залежностями.

|[Статус](https://github.com/nan0web/monorepo/blob/main/system.md#написання-сценаріїв)|Документація|Покриття тестами|Функції|Версія Npm|
|---|---|---|---|---|
 |🟢 `98.6%` |🧪 [English 🏴󠁧󠁢󠁥󠁮󠁧󠁿](https://github.com/nan0web/http-node/blob/main/README.md)<br />[Українською 🇺🇦](https://github.com/nan0web/http-node/blob/main/docs/uk/README.md) |🟢 `93.4%` |✅ d.ts 📜 system.md 🕹️ playground |— |

## Опис

Пакет `@nan0web/http-node` надає легковаговий, тестований HTTP-фреймворк для Node.js.
Він включає:

- **Клієнт**: Функції, сумісні з Fetch API (`fetch`, `get`, `post`, тощо) з підтримкою HTTP/2.
- **Сервер**: Просте створення сервера (`createServer`) з маршрутизацією та middleware.
- **Повідомлення**: Кастомні `IncomingMessage` та `ResponseMessage` для обробки запитів/відповідей.
- **Middleware**: Вбудовані парсери, такі як `bodyParser` і обмеження швидкості (`bruteForce`).
- **Маршрутизатор**: Маршрутизація на основі методів з витягуванням параметрів.

Розроблено для monorepos та мінімальних конфігурацій, що відповідає філософії nan0web: нуль залежностей,
повне тестове покриття та чистий JavaScript з JSDoc типізацією.

## Встановлення

Як встановити через npm?
```bash
npm install @nan0web/http-node
```

Як встановити через pnpm?
```bash
pnpm add @nan0web/http-node
```

Як встановити через yarn?
```bash
yarn add @nan0web/http-node
```

## Використання

### Створення сервера

Створіть та запустіть базовий HTTP-сервер з маршрутами.

Як створити та запустити базовий HTTP-сервер?
```js
import { createServer, fetch } from "@nan0web/http-node"
const server = createServer()
server.get("/hello", (req, res) => {
  res.json({ message: "Привіт, світе" })
})

await server.listen()
const port = server.port
const response = await fetch(`http://localhost:${port}/hello`)
const data = await response.json()
console.info(data)
await server.close()

```
### Додавання маршрутів

Підтримка методів GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS.

Як додати маршрути для різних HTTP-методів?
```js
import { createServer, post } from "@nan0web/http-node"
import { bodyParser } from "@nan0web/http-node/middlewares"
const server = createServer()
server.use(bodyParser())

server.post("/user", async (req, res) => {
  const body = req.body || {}
  res.statusCode = 201
  res.json({ id: 1, ...body })
})

await server.listen()
const port = server.port
const response = await post(`http://localhost:${port}/user`, { name: "Аліса" })
const data = await response.json()
console.info(data)
await server.close()

```

Як обробити DELETE запити зі статусом 204?
```js
import { createServer, del } from "@nan0web/http-node"
const server = createServer()

server.delete("/user/:id", async (req, res) => {
  const { id } = req.params
  if (id === "1") {
    res.writeHead(204, 'No Content')
    res.end()
  } else {
    res.writeHead(404, 'Not Found')
    res.end(JSON.stringify({ error: "Не знайдено" }))
  }
})

await server.listen()
const port = server.port
const response = await del(`http://localhost:${port}/user/1`)
console.info(response.status)
await server.close()

```
### Використання middleware

Застосування глобального middleware, як-от парсер тіла запиту.

Як використовувати middleware bodyParser?
```js
import { createServer } from "@nan0web/http-node"
import { bodyParser } from "@nan0web/http-node/middlewares"
const server = createServer()

server.use(bodyParser())
server.post("/echo", async (req, res) => {
  res.json(req.body)
})

await server.listen()
const port = server.port
const response = await post(`http://localhost:${port}/echo`, { key: "значення" })
const data = await response.json()
console.info(data)
await server.close()

```

Як використовувати обмеження частоти запитів bruteForce?
```js
import { createServer } from "@nan0web/http-node"
import { bruteForce } from "@nan0web/http-node/middlewares"
const server = createServer()

server.use(bruteForce({ max: 1, windowMs: 1000 }))
server.get("/protected", (req, res) => {
  res.json({ message: "Захищено" })
})

await server.listen()
const port = server.port
await get(`http://localhost:${port}/protected`) // Перший запит OK
const response = await get(`http://localhost:${port}/protected`) // Другий заблоковано
console.info(response.status)
await server.close()

```
### Клієнтські запити

Використання `fetch` або допоміжних функцій: `get`, `post` тощо.

Як зробити GET запит через fetch?
```js
import { fetch, createServer } from "@nan0web/http-node"
const server = createServer()

server.get("/data", (req, res) => {
  res.json({ result: "успіх" })
})

await server.listen()
const port = server.port
const response = await fetch(`http://localhost:${port}/data`, { timeout: 5000 })
const data = await response.json()
console.info(data)
await server.close()

```

Як використовувати APIRequest для управління base URL?
```js
import { APIRequest, createServer } from "@nan0web/http-node"
const server = createServer()

server.get("/api/info", (req, res) => {
  res.json({ version: "1.0" })
})

await server.listen()
const port = server.port
const baseUrl = `http://localhost:${port}/api`
const api = new APIRequest(baseUrl)
const response = await api.get("info")
const data = await response.json()
console.info(data)
await server.close()

```
### Кастомні повідомлення

Розширення `IncomingMessage` та `ResponseMessage` для власної обробки.
Класи можна імпортувати напряму з /messages.

Як створити власний IncomingMessage?
```js
import { IncomingMessage } from "@nan0web/http-node/messages"
const socket = { remoteAddress: "127.0.0.1" }
const req = new IncomingMessage(socket, {
  method: "POST",
  url: "/custom",
  headers: { "content-type": "application/json" }
})

console.info(req.method) // "POST"
console.info(req.url) // "/custom"
console.info(req.headers["content-type"] || '') // "application/json"
```

Як створити ResponseMessage з тілом?
```js
import { ResponseMessage } from "@nan0web/http-node/messages"
const response = new ResponseMessage("Привіт із кастомної відповіді", {
  status: 200,
  statusText: "OK",
  headers: { "content-type": "text/plain" }
})

const text = await response.text()
console.info(text) // "Привіт із кастомної відповіді"
```
### Самостійний маршрутизатор (Router)

Використання `Router` окремо для додаткової маршрутизації.

Як використовувати маршрутизатор для витягування параметрів?
```js
import { Router } from "@nan0web/http-node/server"
const router = new Router()
let capturedParams = null

router.get("/user/:id", (req, res) => {
  capturedParams = req.params.id
})

const req = { method: "GET", url: "/user/123" }
const res = {}
router.handle(req, res, () => { })

console.info(capturedParams)
```
## API

### Клієнтські функції

- `fetch(url, options)` – Основна функція fetch з параметрами `method`, `body`, `timeout`, `protocol: 'http2'`.
- `get/post/put/patch/del/head/options(url, body?, options?)` – Допоміжні функції.
- `APIRequest(baseUrl, defaults)` – Клас для API-клієнтів з методами ланцюжка.

**Параметри**: `method`, `headers`, `body`, `type` ('json'|'binary'|'sockets'), `protocol`, `timeout`, `rejectUnauthorized`.

### Сервер

- `createServer(options)` – Створює екземпляр сервера.
- Клас `Server`: `.use(middleware)`, `.get/post/put/delete/patch(head|options)(path, handler)`.
- `.listen()` / `.close()` для керування життєвим циклом.

### Маршрутизатор

- `new Router()`: `.get/post/.../use(path|middleware)`.
- `.handle(req, res, notFoundHandler)` – Обробляє запит.
- Підтримка параметрів типу `/user/:id` та wildcard `*`.

### Повідомлення

- `IncomingMessage`: Розширює Node.js з `params`, `body`.
- `ResponseMessage`: Readable потік з `json()`, `text()`, `buffer()`, `status`, `headers`.
- `ServerResponse`: Розширення Node.js з `.json(data)`, допоміжними методами маршрутизації.

### Middleware

- `Middlewares.bodyParser()` – Парсить JSON/form тіла у `req.body`.
- `Middlewares.bruteForce(options)` – Обмеження частоти запитів по IP/шляху (наприклад, `{ max: 100, windowMs: 60000 }`).

## Java•Script

Використовує `d.ts` файли для автодоповнення

## CLI-пісочниця

Як запустити пісочницю?
```bash
# Клонувати репозиторій та запустити CLI-пісочницю
git clone https://github.com/nan0web/http-node.git
cd http-node
npm install
# Запустити тести або власну пісочницю, якщо є
npm run playground
```

## Участь у проєкті

Як внести свій вклад? - [подивіться тут](../CONTRIBUTING.md)

## Ліцензія

Як ліцензувати ISC? - [подивіться тут](../LICENSE)
