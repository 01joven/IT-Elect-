const express = require("express");
const { z } = require("zod");
const { getPool } = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.use(requireAuth);

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  is_completed: z.boolean().optional()
});

router.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const pool = getPool();
  const { title, description, is_completed } = parsed.data;
  const created = await pool.query(
    `insert into tasks (user_id, title, description, is_completed)
     values ($1, $2, $3, $4)
     returning id, user_id, title, description, is_completed, created_at, updated_at`,
    [req.user.id, title, description ?? null, is_completed ?? false]
  );
  return res.status(201).json({ task: created.rows[0] });
});

router.get("/", async (req, res) => {
  const pool = getPool();
  const tasks = await pool.query(
    `select id, user_id, title, description, is_completed, created_at, updated_at
     from tasks
     where user_id = $1
     order by created_at desc`,
    [req.user.id]
  );
  return res.json({ tasks: tasks.rows });
});

router.get("/:id", async (req, res) => {
  const pool = getPool();
  const task = await pool.query(
    `select id, user_id, title, description, is_completed, created_at, updated_at
     from tasks
     where id = $1 and user_id = $2`,
    [req.params.id, req.user.id]
  );
  if (task.rowCount === 0) return res.status(404).json({ error: "Task not found" });
  return res.json({ task: task.rows[0] });
});

const updateSchema = createSchema.partial();

router.put("/:id", async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { title, description, is_completed } = parsed.data;
  const pool = getPool();

  const updated = await pool.query(
    `update tasks
     set title = coalesce($1, title),
         description = coalesce($2, description),
         is_completed = coalesce($3, is_completed),
         updated_at = now()
     where id = $4 and user_id = $5
     returning id, user_id, title, description, is_completed, created_at, updated_at`,
    [title ?? null, description ?? null, is_completed ?? null, req.params.id, req.user.id]
  );

  if (updated.rowCount === 0) return res.status(404).json({ error: "Task not found" });
  return res.json({ task: updated.rows[0] });
});

router.delete("/:id", async (req, res) => {
  const pool = getPool();
  const deleted = await pool.query("delete from tasks where id = $1 and user_id = $2", [
    req.params.id,
    req.user.id
  ]);
  if (deleted.rowCount === 0) return res.status(404).json({ error: "Task not found" });
  return res.status(204).send();
});

module.exports = router;

