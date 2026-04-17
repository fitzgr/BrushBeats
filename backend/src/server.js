const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

const bpmRoute = require("./routes/bpm");
const songsRoute = require("./routes/songs");
const youtubeRoute = require("./routes/youtube");
const adminLocalesRoute = require("./routes/adminLocales");
const geoRoute = require("./routes/geo");
const healthRoute = require("./routes/health");
const householdsRoute = require("./routes/households");

const app = express();
const port = Number(process.env.PORT || 4000);

app.set("trust proxy", true);

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    ok: true,
    name: "BrushBeats API",
    frontend: "http://localhost:5173/BrushBeats/",
    health: "/api/health",
    databaseHealth: "/api/health/db"
  });
});

app.use("/api/health", healthRoute);

app.use("/api/bpm", bpmRoute);
app.use("/api/songs", songsRoute);
app.use("/api/youtube", youtubeRoute);
app.use("/api/admin/locales", adminLocalesRoute);
app.use("/api/geo", geoRoute);
app.use("/api/households", householdsRoute);

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({
    error: "Something went wrong",
    detail: error.message
  });
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`BrushBeats API listening on http://localhost:${port}`);
  });
}

module.exports = app;
