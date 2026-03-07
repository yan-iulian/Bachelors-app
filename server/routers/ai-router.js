/**
 * AI Router — Proxy către micro-serviciul Python Flask (port 5000)
 * Rutele /ai/* sunt proxied la http://localhost:5000/analyze/*
 */
import { Router } from "express";
import { authMiddleware } from "../middleware/index.js";

const router = Router();
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:5000";

// Toate rutele AI necesită autentificare
router.use(authMiddleware);

/**
 * Generic proxy function to forward requests to the Python AI service
 */
async function proxyToAI(endpoint, body, res) {
  try {
    const response = await fetch(`${AI_SERVICE_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`AI Service error [${endpoint}]:`, errorText);
      return res.status(response.status).json({
        error: `Eroare serviciu AI: ${response.statusText}`,
        details: errorText,
      });
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error(`AI Service unavailable [${endpoint}]:`, err.message);
    res.status(503).json({
      error:
        "Serviciul AI nu este disponibil. Asigurați-vă că ai_service/app.py rulează pe portul 5000.",
      details: err.message,
    });
  }
}

// POST /ai/cosine — Cosine Similarity recommendation
router.post("/cosine", (req, res) => {
  proxyToAI("/analyze/cosine", req.body, res);
});

// POST /ai/pca — PCA analysis
router.post("/pca", (req, res) => {
  proxyToAI("/analyze/pca", req.body, res);
});

// POST /ai/hc — Hierarchical Clustering
router.post("/hc", (req, res) => {
  proxyToAI("/analyze/hc", req.body, res);
});

// POST /ai/kmeans — K-Means Clustering
router.post("/kmeans", (req, res) => {
  proxyToAI("/analyze/kmeans", req.body, res);
});

// POST /ai/anomaly — Anomaly Detection
router.post("/anomaly", (req, res) => {
  proxyToAI("/analyze/anomaly", req.body, res);
});

// POST /ai/fingerprint — Car DNA Fingerprint
router.post("/fingerprint", (req, res) => {
  proxyToAI("/analyze/fingerprint", req.body, res);
});

// GET /ai/health — Health check
router.get("/health", async (req, res) => {
  try {
    const response = await fetch(`${AI_SERVICE_URL}/health`);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(503).json({ status: "offline", error: err.message });
  }
});

export default router;
