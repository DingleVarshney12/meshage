# Modern Chat App

A fresh TypeScript monorepo for a secure realtime chat application.

## Workspace layout

- `apps/web` - Next.js web client
- `apps/api` - NestJS API and WebSocket server

## Planned platform

- Supabase-hosted PostgreSQL, accessed by the NestJS API through TypeORM
- Supabase Storage for profile photos and chat attachments
- Upstash Redis for short-lived realtime state and rate limits
- Next.js, NestJS, TypeScript, shadcn/ui, and Socket.IO
- End-to-end encryption is an architectural requirement; protocol and key lifecycle must be selected before private messaging is considered production-ready.

## Local setup

1. Install Node.js 24 LTS or newer compatible active LTS.
2. Copy `.env.example` to `.env` and fill in service credentials.
3. Run `npm install` from the repository root.
4. Run `npm run dev` to start the API and web app.

The API defaults to port `4000`; the web app defaults to port `3000`.

## Environment services

The API expects a Supabase Postgres connection string, Supabase project URL and server-side storage key, and Upstash Redis REST credentials. Never expose server secrets through `NEXT_PUBLIC_` variables or commit `.env`.
