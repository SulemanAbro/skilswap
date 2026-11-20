# SkillSwap — Student Skill Exchange Platform

SkillSwap is a peer-to-peer educational collaboration web application connecting university students who want to teach skills they know and learn skills they want without monetary transactions.

## Technology Stack

- **Frontend:** Semantic HTML5, Modular CSS3 (Flexbox, Grid, Media Queries), Vanilla JavaScript (ES Modules + Fetch API)
- **Backend:** Node.js, Express.js REST API, scrypt password hashing, HMAC-SHA256 JWT authentication
- **Database:** MongoDB-structured document collections (`users`, `skills`, `requests`, `sessions`, `reviews`, `reports`) with `MONGO_URI` support and automatic local document-store persistence seeded from `database/sample-data.json`

## Folder Structure

- `frontend/` — Multi-page HTML5, CSS3, and Vanilla JavaScript client
- `backend/` — Express server, config, models, controllers, routes, middleware, and `node:test` unit tests
- `database/` — MongoDB schema design (`database-design.md`) and seed dataset (`sample-data.json`)

## Demo Accounts

- **CS Student:** `ahmed@skillswap.edu` / `Password123!`
- **Design Student:** `sara@skillswap.edu` / `Password123!`
- **Administrator:** `admin@skillswap.edu` / `Admin123!`

## Running Locally

```bash
npm install
npm test
npm run dev
```

Open `http://localhost:3000` in your browser.
