const axios = require("axios");
const crypto = require("crypto");

const BASE_URL = "https://api.storyblocks.com/api/v2/images/search";

/**
 * @param {string} query   - Search term
 * @param {number} perPage - Results per page
 * @returns {Promise<ImageResult[]>}
 */
async function searchStoryblocks(query, perPage = 10) {
  const publicKey = process.env.STORYBLOCKS_PUBLIC_KEY;
  const privateKey = process.env.STORYBLOCKS_PRIVATE_KEY;

  if (!publicKey || !privateKey) {
    throw new Error("STORYBLOCKS_PUBLIC_KEY or STORYBLOCKS_PRIVATE_KEY is not set");
  }

  if (publicKey.startsWith("test_")) {
    console.warn("[Storyblocks] Test key detected: returning mock data.");
    return Array.from({ length: perPage }, (_, i) => ({
      image_ID: `mock_${i + 1}`,
      thumbnails: `https://placehold.co/200x200?text=Storyblocks+${i + 1}`,
      preview: `https://placehold.co/1080x720?text=Storyblocks+${i + 1}`,
      title: `Mock Storyblocks result ${i + 1} for "${query}"`,
      source: "Storyblocks",
      tags: [query, "mock", "storyblocks"],
    }));
  }

  const expires = Math.floor(Date.now() / 1000) + 60;

  const hmac = crypto
    .createHmac("sha256", privateKey + String(expires))
    .update(publicKey)
    .digest("hex");

  const response = await axios.get(BASE_URL, {
    params: {
      APIKEY: publicKey,
      EXPIRES: expires,
      HMAC: hmac,
      keyword: query,
      results_per_page: perPage,
      page: 1,
    },
    timeout: 8000,
  });

  const results = response.data?.results ?? [];

  return results.map((item) => ({
    image_ID: String(item.id),
    thumbnails: item.thumbnail_url ?? null,
    preview: item.preview_url ?? null,
    title: item.title ?? null,
    source: "Storyblocks",
    tags: Array.isArray(item.keywords) ? item.keywords : [],
  }));
}

module.exports = { searchStoryblocks };
