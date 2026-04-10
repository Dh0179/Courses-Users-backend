const crypto = require("node:crypto");
const jwt = require("jsonwebtoken");
const db = require("../data/db");
const User = require("../models/users");
const userModel = new User(db);
const bcrypt = require("bcryptjs");
const redisClient = require("../data/redisClient");
const generateAccessToken = (user) => {
    return jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: "15m" });
};
const generateRefreshToken = (user) => {
    return crypto.randomBytes(40).toString("hex");
};
const hashToken = (token) => {
    return crypto.createHash("sha256").update(token).digest("hex");
};
const addBlacklistToken = async (token, ttl) => {
    await redisClient.setEx(`blacklist:${token}`,ttl, "revoked");
};
const register = async (req, res) => {
    const {email, username, password} = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await userModel.addUser({ email, username, password: hashedPassword, avatar: req.file ? req.file.filename : null });
    res.status(201).json({
        message: "User added successfully",
        id: result.id,
        username: result.username,
        email: result.email,
        role: result.role,
        avatar: result.avatar,
        token
    });
};
const login = async (req, res) => {
    const {email, password} = req.body;
    const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) return res.status(404).json({ error: "User not found" });
    const isMatch = await bcrypt.compare(password, rows[0].password);
    if (!isMatch) return res.status(401).json({ error: "Invalid password" });
    const AccessToken = generateAccessToken(rows[0]);
    const RefreshToken = generateRefreshToken(rows[0]);
    const hash = hashToken(RefreshToken);
    await db.execute("INSERT INTO RefreshToken (user_id, token_hash,expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))", [rows[0].id, hash]);
    res.cookie("refreshToken", RefreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "Strict",
        maxAge: 7 * 24 * 60 * 60 * 1000
    });
    res.cookie("accessToken", AccessToken, {
        httpOnly: true,
        secure: true,
        sameSite: "Strict",
        maxAge: 15 * 60 * 1000
    });
    res.json(
        {
            message: "Login successful",
            user: {
                id: rows[0].id,
                username: rows[0].username,
                email: rows[0].email
            },
            token: AccessToken,
        });
};
const refreshToken = async (req, res) => {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) return res.status(401).json({ error: "No refresh token provided" });
    const hash = hashToken(refreshToken);
    const [rows] = await db.execute("SELECT id, user_id, revoked FROM RefreshToken WHERE token_hash = ? AND expires_at > NOW()", [hash]);
    if (rows.length === 0) return res.status(403).json({ error: "Invalid refresh token" });
    const token = rows[0];
    if(token.revoked) {
        await db.execute("UPDATE RefreshToken SET revoked = true WHERE user_id = ?", [token.user_id]);
        return res.status(403).json({ error: "Refresh token revoked" });
    }
    await db.execute("UPDATE RefreshToken SET revoked = true WHERE id = ?", [token.id]);
    const newRefreshToken = generateRefreshToken({ id: token.user_id });
    const newHash = hashToken(newRefreshToken);
    await db.execute("INSERT INTO RefreshToken (user_id, token_hash,expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))", [token.user_id, newHash]);
    const newAccessToken = generateAccessToken({ id: token.user_id });
    res.cookie("accessToken", newAccessToken, {
        httpOnly: true,
        secure: true,
        sameSite: "Strict",
        maxAge: 15 * 60 * 1000
    });
    res.cookie("refreshToken", newRefreshToken,
        {
            httpOnly: true,
            secure: true,
            sameSite: "Strict",
            maxAge: 7 * 24 * 60 * 60 * 1000
        });
    res.json({ token: newAccessToken });
};
const logout = async (req, res) => {
    const refreshToken = req.cookies.refreshToken;
    const AccessToken = req.cookies.accessToken;
    if (!refreshToken || !AccessToken) return res.status(400).json({ error: "No token provided" });
    const refreshHash = hashToken(refreshToken);
    await db.execute("UPDATE RefreshToken SET revoked = true WHERE token_hash = ?", [refreshHash]);
    const decoded = jwt.decode(AccessToken);
    const ttl = decoded.exp * 1000 - Date.now();
    if(ttl > 0) {
        await addBlacklistToken(AccessToken, ttl);
    }
    res.clearCookie("refreshToken",
        {
            httpOnly: true,
            secure: true,
            sameSite: "Strict"
        }
    );
    res.clearCookie("accessToken",
        {
            httpOnly: true,
            secure: true,
            sameSite: "Strict"
        }
    );
    res.json({ message: "Logout successful" });
}
module.exports = {
    generateAccessToken,
    generateRefreshToken,
    hashToken,
    register,
    login,
    refreshToken,
    logout
};