const redis = require('redis');
require("dotenv").config();
const redisClient = redis.createClient({
    url: process.env.REDIS_URL
});
redisClient.connect();
redisClient.on('error', (err) => console.error('Redis Client Error', err));
module.exports = redisClient;