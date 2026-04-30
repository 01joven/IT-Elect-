const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { z } = require("zod");
const { getPool } = require("../db");
const { sha256Hex, randomToken } = require("../utils/security");
const { sendVerificationEmail } = require("../email/mailer");

const router = express.Router();

function mustGetEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72)
});

router.post("/signup", async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { email, password } = parsed.data;
  const passwordHash = await bcrypt.hash(password, 10);

  const rawToken = randomToken(32);
  const tokenHash = sha256Hex(rawToken);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

  const pool = getPool();
  try {
    const created = await pool.query(
      `insert into users (email, password_hash, email_verification_token_hash, email_verification_expires_at)
       values ($1, $2, $3, $4)
       returning id, email, is_email_verified, created_at`,
      [email.toLowerCase(), passwordHash, tokenHash, expiresAt]
    );

    const appBaseUrl = mustGetEnv("APP_BASE_URL").replace(/\/+$/, "");
    const verifyUrl = `${appBaseUrl}/auth/verify-email?token=${rawToken}&email=${encodeURIComponent(
      email.toLowerCase()
    )}`;
    await sendVerificationEmail({ to: email, verifyUrl });

    return res.status(201).json({
      user: created.rows[0],
      message: "Signup successful. Please verify your email."
    });
  } catch (err) {
    if (String(err.message || "").includes("duplicate key")) {
      return res.status(409).json({ error: "Email already in use" });
    }
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

const verifySchema = z.object({
  email: z.string().email(),
  token: z.string().min(10)
});

router.get("/verify-email", async (req, res) => {
  const parsed = verifySchema.safeParse({ email: req.query.email, token: req.query.token });
  if (!parsed.success) return res.status(400).json({ error: "Invalid verification link" });

  const { email, token } = parsed.data;
  const tokenHash = sha256Hex(token);

  const pool = getPool();
  const now = new Date();

  const result = await pool.query(
    `update users
     set is_email_verified = true,
         email_verification_token_hash = null,
         email_verification_expires_at = null,
         updated_at = now()
     where email = $1
       and email_verification_token_hash = $2
       and email_verification_expires_at is not null
       and email_verification_expires_at > $3
       and is_email_verified = false
     returning id, email, is_email_verified`,
    [email.toLowerCase(), tokenHash, now]
  );

  if (result.rowCount === 0) {
    return res.status(400).json({ error: "Verification token is invalid or expired" });
  }

  return res.json({ message: "Email verified successfully", user: result.rows[0] });
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { email, password } = parsed.data;
  const pool = getPool();

  const userRes = await pool.query(
    "select id, email, password_hash, is_email_verified from users where email = $1",
    [email.toLowerCase()]
  );
  if (userRes.rowCount === 0) return res.status(401).json({ error: "Invalid email or password" });

  const user = userRes.rows[0];
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: "Invalid email or password" });
  if (!user.is_email_verified) return res.status(403).json({ error: "Email not verified" });

  const token = jwt.sign(
    { sub: user.id, email: user.email },
    mustGetEnv("JWT_SECRET"),
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );

  return res.json({
    token,
    user: { id: user.id, email: user.email, is_email_verified: user.is_email_verified }
  });
});

module.exports = router;

