import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendPath = path.join(__dirname, "../dist");

export default async function handler(req, res) {
  // API route
  if (req.url.startsWith("/api/hello")) {
    res.status(200).json({ message: "Hello from Backend!" });
    return;
  }

  // Serve frontend files for SPA
  let filePath = path.join(frontendPath, req.url === "/" ? "index.html" : req.url);

  if (!fs.existsSync(filePath)) {
    filePath = path.join(frontendPath, "index.html"); // fallback to index.html
  }

  const fileContents = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();

  const mimeTypes = {
    ".html": "text/html",
    ".js": "application/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".svg": "image/svg+xml",
  };

  res.setHeader("Content-Type", mimeTypes[ext] || "text/plain");
  res.status(200).end(fileContents);
}
