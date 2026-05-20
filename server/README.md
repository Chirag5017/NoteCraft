# NoteCraft Backend

Node.js 20 / Express.js 4 REST API and Socket.IO server for the NoteCraft collaborative note-taking app.

## Setup

```bash
cd server
cp .env.example .env   # fill in your values
npm install
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `PORT` | HTTP port (default: 3000) |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret for signing JWTs (min 32 chars) |
| `JWT_EXPIRES_IN` | JWT expiry (default: 7d) |
| `FRONTEND_URL` | Allowed CORS origin |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `GOOGLE_CALLBACK_URL` | Google OAuth callback URL |
| `NODE_ENV` | `development` or `production` |

## Running

```bash
# Production
npm start

# Development (with file watching)
npm run dev
```

## Docker

```bash
# From the server/ directory
docker compose up
```

This starts the Node.js server and a MongoDB 7 instance.

## Tests

```bash
# Unit + integration tests (Jest)
npm test

# Socket.IO tests (Mocha)
npm run test:sockets
```
