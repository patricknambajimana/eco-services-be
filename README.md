# eco-services-be
# eco-services Business Management System - Backend API

Express.js + PostgreSQL REST API for the Restaurant, Bakery and Decoration departments.
Swagger docs, JWT auth, role-based access control (RBAC).

## 0. Requirements and one-time installation

Install these on your PC first:
- **Node.js 18 or newer** (https://nodejs.org) - check with `node -v` and `npm -v`
- **PostgreSQL + pgAdmin 4** (already installed on your PC)

### Option A - You pasted all the files, including `package.json` (easiest)
Open a terminal in the `npgroup-backend` folder and run ONE command. It installs every package listed in `package.json`:
```bash
npm install
```

### Option B - Build the project from zero (install every package by command)
Create the folders, then run these commands inside `npgroup-backend`:
```bash
# 1. create package.json
npm init -y

# 2. runtime packages
npm install express pg dotenv cors helmet morgan bcryptjs jsonwebtoken joi express-rate-limit hpp compression cookie-parser swagger-jsdoc swagger-ui-express

# 3. development package (auto-restart on file changes)
npm install --save-dev nodemon

# 4. add the npm commands to package.json
npm pkg set main=src/server.js
npm pkg set scripts.start="node src/server.js"
npm pkg set scripts.dev="nodemon src/server.js"
npm pkg set scripts.migrate="node scripts/migrate.js"
npm pkg set scripts.seed="node scripts/seed.js"
npm pkg set scripts.db:setup="node scripts/migrate.js && node scripts/seed.js"
```

### What each package is for
| Package | Purpose |
|---|---|
| `express` | the web framework / REST API |
| `pg` | PostgreSQL driver |
| `dotenv` | loads secrets from the `.env` file |
| `cors` | allows your frontend to call the API |
| `helmet` | secure HTTP headers |
| `hpp` | blocks HTTP parameter pollution |
| `express-rate-limit` | stops brute-force login attempts |
| `bcryptjs` | hashes passwords and PINs |
| `jsonwebtoken` | login tokens (JWT) |
| `joi` | validates request data |
| `morgan` | request logging in the terminal |
| `compression` | compresses responses |
| `cookie-parser` | cookie support (ready for later use) |
| `swagger-jsdoc` + `swagger-ui-express` | builds and shows the API docs at `/api-docs` |
| `nodemon` (dev only) | restarts the server when you save a file |

## 1. Setup (5 steps)

1. **Create the database in pgAdmin 4**: right-click *Databases* -> *Create* -> *Database...* -> name it `eco_db`.
2. **Install packages** (skip if you already did section 0):
   ```bash
   npm install
   ```
3. **Configure environment**: copy `.env.example` to `.env` and set `DB_PASSWORD` (your postgres password) and a long random `JWT_SECRET`.
4. **Create tables + seed data** (departments, all 19 roles, first super admin):
   ```bash
   npm run db:setup
   ```
   > Already ran your own SQL script in pgAdmin? That's fine. `schema.sql` uses `IF NOT EXISTS`, and the only change it makes to your tables is widening `credentials.pin_code` to `VARCHAR(255)` (PINs are stored hashed).
5. **Start the server**:
   ```bash
   npm run dev      # auto-restart on changes
   npm start        # production
   ```

- API base URL: `http://localhost:5000/api/v1`
- **Swagger docs: `http://localhost:5000/api-docs`**
- First login: `admin` / `Admin@12345` (from `.env`) - **change it right away**.

## 2. Testing in Swagger
1. Open `/api-docs` -> `POST /auth/login` -> *Try it out* -> Execute.
2. Copy the `token` from the response.
3. Click **Authorize** (top right), paste the token, Authorize.
4. All other endpoints now work (if your role allows them).

Suggested first calls: create a staff member (`POST /staff`), add inventory (`POST /inventory/items`),
add a product (`POST /products`), create an order (`POST /orders`), pay it (`POST /payments`).

## 5. Security built in
- **Passwords and PINs hashed** with bcrypt (12 rounds); login timing is equalised so usernames can't be guessed
- **JWT** (HS256, expiry from `.env`); the user is re-checked in the DB on every request, so suspended users or deactivated credentials lose access immediately
- **RBAC** per route + **department scoping**: non-admin staff only see and change their own department's data
- **Parameterised SQL everywhere** (no string-built values) -> no SQL injection
- **Joi validation** on every body/query/param; unknown fields are stripped
- `helmet` headers, `cors` allow-list, `hpp`, 100kb body limit
- **Rate limiting**: 300 requests / 15 min on the API, 10 / 15 min on login and forgot-password
- Prices are never trusted from the client; payments cannot exceed the balance due
- Errors are sanitised in production (no stack traces)

## 6. Known gaps / next steps
- **Forgot password** generates a temporary password but does not send it yet (returned only in development). Plug in an email/SMS provider in `auth.service.js`.
- **Notifications** (section 13 of the frontend doc) have no table in the ERD, so they are not built. Say the word and I will add a `notifications` table and endpoints.
- **Session-expiry warning** is a frontend concern; the API simply returns 401 when the token expires.
- No automated tests yet.




GET  /communications/messages
POST /communications/messages

GET  /communications/emails
POST /communications/emails

postgresql://eco_services_user:aCjbCdxEZVG8VmOYC0cz0pQP4ygODUBX@dpg-dbag5h67bikc73egqu9g-a/eco_services