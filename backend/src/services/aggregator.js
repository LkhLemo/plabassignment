const { searchUnsplash } = require("./unsplash");
const { searchPixabay } = require("./pixabay");
const { searchStoryblocks } = require("./storyblocks");

/**
 * @param {string} query      - User's search term
 * @param {number} [perPage]  - Images to request per source (default 10)
 * @returns {Promise<{ results: ImageResult[], errors: SourceError[] }>}
 */
async function aggregateSearch(query, perPage = 10) {
  // ── Fire all three simultaneously ──────────────────────────────────────────
  const [unsplashResult, pixabayResult, storyblocksResult] = await Promise.allSettled([
    searchUnsplash(query, perPage),
    searchPixabay(query, perPage),
    searchStoryblocks(query, perPage),
  ]);

  const results = [];
  const errors = [];

  // ── Process each settled promise ───────────────────────────────────────────
  const sources = [
    { name: "Unsplash",     settled: unsplashResult    },
    { name: "Pixabay",      settled: pixabayResult     },
    { name: "Storyblocks",  settled: storyblocksResult },
  ];

  for (const { name, settled } of sources) {
    if (settled.status === "fulfilled") {
      const images = settled.value;

      if (!Array.isArray(images) || images.length === 0) {
        errors.push({ source: name, message: "No results returned" });
      } else {
        results.push(...images);
      }
    } else {
      const message = settled.reason?.message ?? "Unknown error";
      console.error(`[${name}] API call failed: ${message}`);
      errors.push({ source: name, message });
    }
  }

  return { results, errors };
}

module.exports = { aggregateSearch };
