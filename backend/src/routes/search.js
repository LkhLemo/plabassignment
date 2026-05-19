const express = require("express");
const router = express.Router();
const { aggregateSearch } = require("../services/aggregator");

function extractParams(req) {
  const q = req.query.q || req.body?.q;
  const perPage = parseInt(req.query.perPage || req.body?.perPage || "10", 10);
  return { q, perPage };
}

async function handleSearch(req, res, next) {
  try {
    const { q, perPage } = extractParams(req);

    if (!q || typeof q !== "string" || q.trim() === "") {
      return res.status(400).json({ error: "Query parameter 'q' is required and must be a non-empty string" });
    }

    if (isNaN(perPage) || perPage < 1 || perPage > 50) {
      return res.status(400).json({ error: "'perPage' must be a number between 1 and 50" });
    }

    const { results, errors } = await aggregateSearch(q.trim(), perPage);

    const response = {
      query: q.trim(),
      total: results.length,
      results,
    };

    if (errors.length > 0) {
      response.warnings = errors.map((e) => `${e.source}: ${e.message}`);
    }

    res.json(response);
  } catch (err) {
    next(err);
  }
}

router.get("/", handleSearch);
router.post("/", handleSearch);

module.exports = router;
