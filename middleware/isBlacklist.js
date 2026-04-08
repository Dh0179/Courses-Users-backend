const redis=require("redis");
const redisClient=require("../data/redisClient");
const isBlacklisted = async (req, res, next) => {
    const token = req.cookies.accessToken;
    if (!token) return res.status(401).json({ error: "No token provided" });
    const result = await redisClient.get(`blacklist:${token}`);
    if (result) {
        return res.status(401).json({ error: "Token is blacklisted" });
    }
    next();
};
module.exports = {
    isBlacklisted
};