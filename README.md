# Navvora Video Stream

A Telegram-video catalog + Netflix-style web frontend.

## Important
This package intentionally does NOT contain Telegram/MongoDB secrets.
Add them as environment variables in Render.

The current implementation handles:
- Telegram video metadata ingestion
- MongoDB video catalog
- Netflix-style responsive frontend
- Search
- Watch page
- Render API

The actual large-file (4–5 GB) streaming adapter must be configured separately because the standard Telegram Bot API `getFile` download path is limited for large files.

## Backend environment variables

BOT_TOKEN=...
MONGODB_URI=...
FRONTEND_URL=https://your-site.netlify.app
PORT=10000

## Local backend

cd backend
npm install
npm start

## Netlify

Publish directory: frontend

Before deployment, edit frontend/js/config.js and set API_BASE_URL to your Render backend URL.
