const redis = require('redis');
require("dotenv").config();
const redisClient = redis.createClient({
    url: process.env.REDIS_URL
});
redisClient.on('connect', () => console.log('Connected to Redis'));
redisClient.on('ready', () => console.log('Redis client is ready'));
(async () => {
    try {
        await redisClient.connect();
    } catch (err) {
        console.error('Error connecting to Redis:', err);
    }
})();
module.exports = redisClient;