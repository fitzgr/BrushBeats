const express = require("express");
const { checkDatabaseHealth, isDatabaseConfigured } = require("../config/database");

const router = express.Router();

router.get("/", (_req, res) => {
  res.json({
    ok: true,
    name: "BrushBeats API",
    databaseConfigured: isDatabaseConfigured(),
    databaseHealth: "/api/health/db"
  });
});

router.get("/db", async (_req, res) => {
  const health = await checkDatabaseHealth();
  const status = health.ok ? 200 : 503;
  res.status(status).json(health);
});

module.exports = router;