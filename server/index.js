import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve frontend (dist inside client folder)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendPath = path.join(__dirname, "../client/dist");
app.use(express.static(frontendPath));

// Example API route
app.get("/api/hello", (req, res) => {
  res.json({ message: "Hello from Backend!" });
});

// Catch-all route for SPA
app.get("*", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

// Start server
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));

export default app;
