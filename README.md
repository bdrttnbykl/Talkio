# Talkio

Full-stack realtime chat application scaffold.

## Structure

- `frontend`: React, TypeScript, Vite client
- `backend`: Express, TypeScript, Prisma, Socket.IO API

## Quick Start

Install dependencies in both folders, configure `.env` files, then run each app in development mode.

```bash
cd backend
npm install
npm run dev
```

```bash
cd frontend
npm install
npm run dev
```

## Deployment

- Frontend: Vercel, root directory `frontend`.
- Backend: Render Web Service, root directory `backend`.
- Database: Neon PostgreSQL, set Render `DATABASE_URL` with Neon pooled connection string.

Production environment variables:

Backend:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DB?sslmode=require"
JWT_SECRET="replace-with-a-long-random-secret"
CLIENT_URLS="https://your-talkio-app.vercel.app"
```

Frontend:

```bash
VITE_API_URL="https://your-talkio-backend.onrender.com/api"
VITE_SOCKET_URL="https://your-talkio-backend.onrender.com"
```
