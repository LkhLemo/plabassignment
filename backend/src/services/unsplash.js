const axios = require("axios");

const BASE_URL = "https://api.unsplash.com";

/**
 * @param {string} query   - Search term
 * @param {number} perPage - Results per page (max 30)
 * @returns {Promise<ImageResult[]>}
 */
async function searchUnsplash(query, perPage = 10) {
  const apiKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!apiKey) throw new Error("UNSPLASH_ACCESS_KEY is not set");

  const response = await axios.get(`${BASE_URL}/search/photos`, {
    params: { query, per_page: perPage, client_id: apiKey },
    timeout: 8000,
  });

  const photos = response.data?.results ?? [];

  return photos.map((photo) => ({
    image_ID: String(photo.id),
    thumbnails: photo.urls?.thumb ?? null,
    preview: photo.urls?.regular ?? null,
    title: photo.description || photo.alt_description || null,
    source: "Unsplash",
    tags: photo.tags?.map((t) => t.title).filter(Boolean) ?? [],
  }));
}

module.exports = { searchUnsplash };
