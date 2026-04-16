#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { buildRoadmapMarkdown, getRoadmapData } from "../src/data/roadmapData.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function main() {
  const roadmapData = getRoadmapData();
  const roadmapMarkdown = buildRoadmapMarkdown();
  const publicDir = path.join(__dirname, "../public");
  const rootRoadmapPath = path.join(__dirname, "../../ROADMAP.md");
  const rootRoadmapJsonPath = path.join(__dirname, "../../brushbeats_roadmap_aligned.json");
  const publicJsonPath = path.join(publicDir, "roadmap.json");
  const publicMarkdownPath = path.join(publicDir, "roadmap.md");

  fs.mkdirSync(publicDir, { recursive: true });
  fs.writeFileSync(publicJsonPath, `${JSON.stringify(roadmapData, null, 2)}\n`, "utf-8");
  fs.writeFileSync(publicMarkdownPath, roadmapMarkdown, "utf-8");
  fs.writeFileSync(rootRoadmapPath, roadmapMarkdown, "utf-8");
  fs.writeFileSync(rootRoadmapJsonPath, `${JSON.stringify(roadmapData, null, 2)}\n`, "utf-8");

  console.log("✓ Roadmap exported: public/roadmap.json, public/roadmap.md, ROADMAP.md, brushbeats_roadmap_aligned.json");
}

main();