# IT Elective Backend (Express + Neon Postgres)

Backend API with:
- Signup
- Email verification
- Login (JWT)
- CRUD module (`tasks`) **scoped to the logged-in user**

## Requirements
- Node.js 18+ (recommended)
- A Neon PostgreSQL database (connection string)

## Setup
1) Install dependencies:

```bash
npm install
```

2) Create `.env` from `.env.example` and fill in:
- `DATABASE_URL` (your Neon connection string)
- `JWT_SECRET`
- `APP_BASE_URL` (usually `http://localhost:3000`)

3) Run migrations:

```bash
npm run migrate
```

4) Start the server:

```bash
npm run dev
```

Server runs at `http://localhost:3000`.

## Email verification (dev)
By default `EMAIL_TRANSPORT=ethereal`. When you sign up, the API will print an **Email preview URL** in the console. Open that URL in your browser and click the verification link.

## API

### Auth
- `POST /auth/signup`

Body:

```json
{ "email": "student@example.com", "password": "password123" }
```

- `GET /auth/verify-email?email=...&token=...`
- `POST /auth/login`

Body:

```json
{ "email": "student@example.com", "password": "password123" }
```

Response:

```json
{ "token": "JWT_HERE", "user": { "id": "...", "email": "...", "is_email_verified": true } }
```

### Tasks CRUD (requires Bearer token)
Add header: `Authorization: Bearer <token>`

- `POST /tasks`
- `GET /tasks`
- `GET /tasks/:id`
- `PUT /tasks/:id`
- `DELETE /tasks/:id`

All task queries are filtered by `user_id`, so one user can never read/update/delete another user’s tasks.

## Notes about Neon
Neon requires TLS in most setups. This project uses `ssl: { rejectUnauthorized: false }` on the Postgres client for convenience in student projects.

