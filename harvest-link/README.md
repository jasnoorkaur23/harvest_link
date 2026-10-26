# Harvest Link — Smart Food Rescue & Donation Platform (Evaluation 2)

Evaluation 1 was the front end (HTML / CSS / JS, localStorage). Evaluation 2 adds a real
backend: **Node.js + Express + MongoDB**, **JWT authentication & role-based authorization**,
and **Multer** photo uploads. The original UI is kept and now talks to the API with `fetch`.

## Run it
1. Install Node.js and MongoDB (Community Server / Compass) and make sure MongoDB is running.
2. In this folder:
   ```
   npm install
   cp .env.example .env      # (already included) edit JWT_SECRET if you like
   npm run seed              # optional: demo users + sample donations
   npm start
   ```
3. Open http://localhost:3000

Default admin (created automatically on first start from `.env`): `admin@harvestlink.com` / `admin123` (use the **Admin** tab).
Demo users after `npm run seed` (password `demo123`): `donor@demo.com`, `ngo@demo.com`, `volunteer@demo.com`.

## Syllabus coverage
| Topic | Where |
|---|---|
| HTML / CSS / JS | `public/index.html`, `public/style.css`, `public/app.js` |
| Node.js | `server.js`, `config/`, `scripts/seed.js` |
| Express.js | `app.js` (middleware, static files, error handler), `routes/*.js` |
| Multer | `middleware/upload.js` (disk storage, image-only filter, 2 MB limit), used in `POST /api/donations`; files served from `/uploads` |
| Authentication | `routes/auth.js` — register / login with bcrypt-hashed passwords, JWT issued, `GET /api/auth/me` |
| Authorization | `middleware/auth.js` — `protect` (valid token) and `allowRoles(...)` (donor / ngo / volunteer / admin) |
| MongoDB | Mongoose models in `models/` (User, Ngo, Donation); aggregation pipelines in `routes/stats.js` |
| React (optional) | not used — front end stays vanilla JS |

## Who can do what
| Action | Role |
|---|---|
| Register / log in | everyone (admin can't self-register) |
| List a donation (with photo) | donor |
| Browse / filter / sort available donations | any logged-in user |
| Claim a donation | **verified** NGO only |
| Mark picked up / delivered | volunteer, admin |
| Verify NGOs, register NGOs, delete donations | admin |
| Dashboard stats | any logged-in user |

## API
| Method & path | Notes |
|---|---|
| `POST /api/auth/register` · `POST /api/auth/login` · `GET /api/auth/me` | |
| `GET /api/donations?status=&location=&sort=expiry\|newest\|quantity&mine=true` | |
| `POST /api/donations` | multipart/form-data, field `image` optional |
| `PATCH /api/donations/:id/claim` · `/pickup` · `/deliver` | status can only move Available → Claimed → Picked Up → Delivered |
| `DELETE /api/donations/:id` | admin |
| `GET /api/ngos` · `POST /api/ngos` · `PATCH /api/ngos/:id/verify` | |
| `GET /api/stats` | counts by status, top donors, expiring soon, totals |

## Folder structure
```
harvest-link/
├── server.js            start-up: env, DB connection, listen
├── app.js               Express app + routes
├── config/              db.js, seedAdmin.js
├── models/              User.js, Ngo.js, Donation.js
├── middleware/          auth.js (JWT + roles), upload.js (Multer)
├── routes/              auth.js, donations.js, ngos.js, stats.js
├── scripts/seed.js      demo data
├── public/              index.html, style.css, app.js (front end)
├── uploads/             uploaded food photos
└── .env.example
```
