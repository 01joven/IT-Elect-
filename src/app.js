const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const authRoutes = require("./routes/auth");
const taskRoutes = require("./routes/tasks");

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

app.get("/", (req, res) => {
  res.json({
    name: "IT Elective API",
    status: "ok",
    routes: {
      auth: ["/auth/signup", "/auth/verify-email", "/auth/login"],
      tasks: ["/tasks (auth required)"]
    }
  });
});

app.use("/auth", authRoutes);
app.use("/tasks", taskRoutes);

app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

module.exports = { app };

