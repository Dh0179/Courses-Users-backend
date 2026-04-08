const db = require("../data/db");
const User = require("../models/users");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const redisClient = require("../data/redisClient");
const userModel = new User(db);
const crypto = require("node:crypto");
const { off } = require("node:cluster");
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
    const token = generateAccessToken(result);
    const refreshToken = generateRefreshToken(result);
    const hash = hashToken(refreshToken);
    await db.execute("INSERT INTO RefreshToken (user_id, token_hash,expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))", [result.id, hash]);
    res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "Strict",
        maxAge: 7 * 24 * 60 * 60 * 1000
    });
    res.cookie("accessToken", token, {
        httpOnly: true,
        secure: true,
        sameSite: "Strict",
        maxAge: 15 * 60 * 1000
    });
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
            role: rows[0].role
        });
};
const refreshToken = async (req, res) => {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) return res.status(401).json({ error: "No refresh token provided" });
    const hash = hashToken(refreshToken);
    const [rows] = await db.execute("SELECT * FROM RefreshToken WHERE token_hash = ?", [hash]);
    if (rows.length === 0) return res.status(403).json({ error: "Invalid refresh token" });
    const token = rows[0];
    if(token.revoked) {
        await db.execute("UPDATE RefreshToken SET revoked = true WHERE user_id = ?", [token.user_id]);
        return res.status(403).json({ error: "Refresh token revoked" });
    }
    if(Date.now() > new Date(token.expires_at).getTime()) {
        await db.execute("DELETE FROM RefreshToken WHERE token_hash = ?", [hash]);
        return res.status(403).json({ error: "Refresh token expired" });
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
const getUserById = async (req, res) => {
    try {
        const cachedUser = await redisClient.get(`user:${req.params.id}`);
        if (cachedUser) {
            return res.json(JSON.parse(cachedUser));
        }
        const user = await userModel.getUserById(req.params.id);
        await redisClient.setEx(`user:${req.params.id}`, 3600, JSON.stringify(user)); // Cache for 1 hour
        res.json({
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role
        });
    }
    catch (error) {
        res.status(500).json({ error: "Error fetching user: " + error.message });
    }
};
const getAllUsers = async (req, res) => {
    const limit = Number.parseInt(req.query.limit) || 2;
    const page = Number.parseInt(req.query.page) || 1;
    const cachedUsers = await redisClient.get(`users:page:${page}:limit:${limit}`);
    if (cachedUsers) {
        return res.json(JSON.parse(cachedUsers));
    }
    const rows = await userModel.getAllUsers(limit, page);
    await redisClient.setEx(`users:page:${page}:limit:${limit}`, 3600, JSON.stringify(rows)); // Cache for 1 hour
    res.json(rows);
};
const deleteUser = async (req, res) => {
    try {
        const result = await userModel.deleteUser(req.params.id);
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: "Error deleting user: " + error.message });
    }
};
const updateUser = async (req, res) => {
    try {
        const user = req.body;
        const result = await userModel.updateUser(req.params.id, user.email, user.username);
        await redisClient.del(`user:${req.params.id}`); // delete cache
        res.status(200).json({
            message: "User updated successfully",
            id: result.id,
            username: result.username,
            email: result.email
        });
    }
    catch (error) {
        res.status(500).json({ error: "Error updating user: " + error.message });
    }
};
const resetPassword = async (req, res) => {
    try {
        const { password, newPassword } = req.body;
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await userModel.updatePassword(req.params.id, password, hashedPassword);
        res.status(200).json({ message: "Password updated successfully" });
    }
    catch (error) {
        res.status(500).json({ error: "Error updating password: " + error.message });
    }
};
module.exports = {
    register,
    login,
    getUserById,
    getAllUsers,
    deleteUser,
    updateUser,
    resetPassword,
    refreshToken,
    logout
};
