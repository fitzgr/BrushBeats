const express = require("express");
const fs = require("fs/promises");
const path = require("path");

const router = express.Router();
const LOCALES_DIR = path.resolve(__dirname, "../../../frontend/public/locales");

function getAdminPassword() {
  return process.env.ADMIN_WORKSHOP_PASSWORD || "";
}

function normalizeLanguage(language) {
  return String(language || "").trim().toLowerCase();
}

function ensureAuthorized(req, res) {
  const adminPassword = getAdminPassword();

  if (!adminPassword) {
    res.status(500).json({ error: "ADMIN_WORKSHOP_PASSWORD is not configured on the backend" });
    return false;
  }

  const suppliedPassword = req.get("x-admin-password") || req.body?.password || req.query?.password || "";

  if (suppliedPassword !== adminPassword) {
    res.status(401).json({ error: "Unauthorized admin access" });
    return false;
  }

  return true;
}

function getLocaleFilePath(language) {
  return path.join(LOCALES_DIR, language, "translation.json");
}

router.get("/languages", async (req, res, next) => {
  if (!ensureAuthorized(req, res)) {
    return;
  }

  try {
    const entries = await fs.readdir(LOCALES_DIR, { withFileTypes: true });
    const languages = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();

    res.json({ languages });
  } catch (error) {
    next(error);
  }
});

router.get("/:language", async (req, res, next) => {
  if (!ensureAuthorized(req, res)) {
    return;
  }

  const language = normalizeLanguage(req.params.language);
  if (!language) {
    return res.status(400).json({ error: "Language is required" });
  }

  try {
    const filePath = getLocaleFilePath(language);
    const fileText = await fs.readFile(filePath, "utf8");
    const stat = await fs.stat(filePath);
    const translation = JSON.parse(fileText);

    res.json({ language, translation, updatedAt: stat.mtime.toISOString() });
  } catch (error) {
    if (error.code === "ENOENT") {
      return res.status(404).json({ error: `Locale not found for ${language}` });
    }

    if (error instanceof SyntaxError) {
      return res.status(500).json({ error: `Locale JSON for ${language} is invalid` });
    }

    next(error);
  }
});

router.put("/:language", async (req, res, next) => {
  if (!ensureAuthorized(req, res)) {
    return;
  }

  const language = normalizeLanguage(req.params.language);
  const translation = req.body?.translation;

  if (!language) {
    return res.status(400).json({ error: "Language is required" });
  }

  if (!translation || typeof translation !== "object" || Array.isArray(translation)) {
    return res.status(400).json({ error: "translation must be an object" });
  }

  try {
    const filePath = getLocaleFilePath(language);
    const nextContent = `${JSON.stringify(translation, null, 2)}\n`;
    await fs.writeFile(filePath, nextContent, "utf8");
    const stat = await fs.stat(filePath);

    res.json({ ok: true, language, updatedAt: stat.mtime.toISOString() });
  } catch (error) {
    next(error);
  }
});

module.exports = router;