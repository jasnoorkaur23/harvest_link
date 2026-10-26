# 🌿 Harvest Link — Smart Food Rescue & Donation Platform

Harvest Link connects people who have surplus food with NGOs that can distribute it.

- **Donors** list surplus food (with an optional photo).
- **Verified NGOs** claim donations and get a pickup code.
- **Volunteers** pick up and deliver claimed food.
- **Admin** verifies NGOs and manages all listings.
- **Dashboard** shows live stats: status breakdown, top donors, and food about to expire.

**Tech stack:** HTML, CSS, JavaScript (front end) · Node.js · Express.js · MongoDB (Mongoose) · JWT authentication · bcrypt · Multer (image uploads)

---

## Prerequisites

Install these first:

1. **Node.js** (v18 or newer) — https://nodejs.org  
   Check with: `node -v`
2. **A MongoDB database** — choose **one**:
   - **Option A: MongoDB Atlas** (free cloud database, no installation) — https://www.mongodb.com/atlas
   - **Option B: MongoDB Community Server** installed locally — https://www.mongodb.com/try/download/community  
     (choose Windows x64 / msi, keep "Install as a Service" ticked)

---

## Setup

### 1. Get the project

Download or clone the project, then open a terminal **inside the folder that contains `package.json`**.

```bash
cd harvest-link
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create the `.env` file

Copy the example file:

```bash
# Windows (PowerShell)
copy .env.example .env

# macOS / Linux
cp .env.example .env
```

Open `.env` and set your values:

```env
PORT=3000
MONGO_URI=<your MongoDB connection string - see below>
JWT_SECRET=put_a_long_random_string_here
JWT_EXPIRES_IN=1d
ADMIN_NAME=Admin
ADMIN_EMAIL=admin@harvestlink.com
ADMIN_PASSWORD=admin123
```

**`MONGO_URI` for Option A (Atlas):**

1. Create a free **M0** cluster on Atlas.
2. **Database Access** → add a database user (username + password; avoid special characters like `@` or `#` in the password).
3. **Network Access** → add IP address `0.0.0.0/0` (allow access from anywhere — fine for development).
4. **Connect → Drivers** → copy the connection string and add the database name `harvest_link`:

```env
MONGO_URI=mongodb+srv://USERNAME:PASSWORD@cluster0.xxxxx.mongodb.net/harvest_link
```

**`MONGO_URI` for Option B (local MongoDB):**

```env
MONGO_URI=mongodb://127.0.0.1:27017/harvest_link
```

### 4. (Optional) Add demo data

```bash
npm run seed
```

This creates demo accounts and sample donations. It is safe to run more than once.

### 5. Start the server

```bash
npm start
```

You should see:

```
MongoDB connected: ...
Harvest Link running at http://localhost:3000
```

### 6. Open the app

Go to **http://localhost:3000** in your browser.

> Don't open `public/index.html` directly or with Live Server — the page only works when served by the Node server.

---

## Login details

| Role | Where to log in | Email | Password |
|---|---|---|---|
| Admin | **Admin** tab | `admin@harvestlink.com` | `admin123` |
| Donor | **Log in** tab | `donor@demo.com` | `demo123` |
| NGO | **Log in** tab | `ngo@demo.com` | `demo123` |
| Volunteer | **Log in** tab | `volunteer@demo.com` | `demo123` |

The admin account is created automatically on first start using the values in `.env`.
Demo users exist only if you ran `npm run seed`. You can also create your own accounts on the **Register** tab.

---

## How to try it (suggested walkthrough)

1. **Register** a new account with role **NGO** → try to claim a donation → it is blocked because the NGO isn't verified.
2. Log in as **Admin** → open the **Admin** tab → click **Unverified** next to that NGO to verify it.
3. Log in as a **Donor** → list a donation (add a photo if you like).
4. Log in as the **NGO** → claim the donation → a pickup code appears.
5. Log in as a **Volunteer** → mark it **Picked up**, then **Delivered**.
6. Open the **Dashboard** to see the updated stats.

---

## Who can do what

| Action | Allowed roles |
|---|---|
| Register / log in | Everyone (admin accounts can't self-register) |
| List a donation (with photo) | Donor |
| Browse, filter and sort available donations | Any logged-in user |
| Claim a donation | **Verified** NGO only |
| Mark picked up / delivered | Volunteer, Admin |
| Verify NGOs, register NGOs, delete donations | Admin |
| View dashboard stats | Any logged-in user |

---

## API reference

All routes except register/login need the header `Authorization: Bearer <token>`.

| Method & path | Description |
|---|---|
| `POST /api/auth/register` | Create an account (donor / ngo / volunteer) |
| `POST /api/auth/login` | Log in, returns a JWT |
| `GET /api/auth/me` | Current user from the token |
| `GET /api/donations` | List donations. Query: `status`, `location`, `sort=expiry\|newest\|quantity`, `mine=true` |
| `POST /api/donations` | Create a donation (`multipart/form-data`, optional `image` file) |
| `PATCH /api/donations/:id/claim` | Claim (verified NGO) |
| `PATCH /api/donations/:id/pickup` | Mark picked up (volunteer/admin) |
| `PATCH /api/donations/:id/deliver` | Mark delivered (volunteer/admin) |
| `DELETE /api/donations/:id` | Delete (admin) |
| `GET /api/ngos` · `POST /api/ngos` | List / register NGOs (register: admin) |
| `PATCH /api/ngos/:id/verify` | Toggle NGO verification (admin) |
| `GET /api/stats` | Dashboard numbers (MongoDB aggregation) |

---

## Project structure

```
harvest-link/
├── server.js            Starts the app: loads .env, connects to MongoDB, listens
├── app.js               Express app: middleware and routes
├── config/              db.js (connection), seedAdmin.js (creates admin)
├── models/              User.js, Ngo.js, Donation.js (Mongoose schemas)
├── middleware/          auth.js (JWT + role checks), upload.js (Multer)
├── routes/              auth.js, donations.js, ngos.js, stats.js
├── scripts/seed.js      Demo data
├── public/              Front end: index.html, style.css, app.js
├── uploads/             Uploaded food photos
└── .env.example         Template for environment variables
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `npm install` says it can't find `package.json` | You're in the wrong folder. `cd` into the folder that contains `package.json`. |
| `ECONNREFUSED 127.0.0.1:27017` | Local MongoDB isn't running. Start the MongoDB service, or switch `MONGO_URI` to an Atlas string. |
| `querySrv ENOTFOUND` / `ENOTFOUND` | Typo in the Atlas connection string. Re-copy it from Atlas. |
| `Authentication failed` | Wrong database username/password in `MONGO_URI`. |
| `Server selection timed out` (Atlas) | Add `0.0.0.0/0` under Atlas → Network Access and wait a minute. |
| `JWT_SECRET is missing` | You haven't created `.env`. Copy `.env.example` to `.env`. |
| `EADDRINUSE` | Port 3000 is in use. Stop the other server or change `PORT` in `.env`. |
| Blank page / login not working | Open **http://localhost:3000**, not the HTML file directly. |
| NGO can't claim food | The admin must verify that NGO first (Admin tab). |

---

## Security notes

- Passwords are hashed with bcrypt and are never stored in plain text.
- Role checks happen on the server, not just in the UI.
- Uploads are limited to images up to 2 MB.
- **Never commit `.env`** (it's in `.gitignore`). Change `JWT_SECRET` and the admin password before any real deployment.
- Allowing `0.0.0.0/0` in Atlas is for development only.
