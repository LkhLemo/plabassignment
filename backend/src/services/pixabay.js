const axios = require("axios");

const BASE_URL = "https://pixabay.com/api/";

/**
 * @param {string} query   - Search term
 * @param {number} perPage - Results per page (max 200)
 * @returns {Promise<ImageResult[]>}
 */
async function searchPixabay(query, perPage = 10) {
  const apiKey = process.env.PIXABAY_API_KEY;
  if (!apiKey) throw new Error("PIXABAY_API_KEY is not set");

  const response = await axios.get(BASE_URL, {
    params: { key: apiKey, q: query, per_page: perPage, image_type: "photo" },
    timeout: 8000,
  });

  const hits = response.data?.hits ?? [];

  if (hits.length === 0) {
    return [];
  }

  return hits.map((hit) => ({
    image_ID: String(hit.id),
    thumbnails: hit.previewURL ?? null,
    preview: hit.webformatURL ?? null,
    title: null,
    source: "Pixabay",
    tags: hit.tags ? hit.tags.split(",").map((t) => t.trim()) : [],
  }));
}

module.exports = { searchPixabay };
