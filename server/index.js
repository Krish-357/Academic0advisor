import express from "express";
import cors from "cors";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Example API route
app.get("/api/hello", (req, res) => {
  res.status(200).json({ message: "Hello from Backend!" });
});

// Optional: Additional API routes can go here
// app.get("/api/other", (req, res) => { ... });

export default app;
