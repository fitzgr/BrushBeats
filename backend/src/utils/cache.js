const NodeCache = require("node-cache");

const songsCache = new NodeCache({ stdTTL: 60 * 10, checkperiod: 120 });
const youtubeCache = new NodeCache({ stdTTL: 60 * 60 * 24, checkperiod: 300 });

module.exports = {
  songsCache,
  youtubeCache
};
