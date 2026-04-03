const db = require("../data/db");
const User = require("../models/users");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const redisClient = require("../data/redisClient");
const userModel = new User(db);
const register = async (req, res) => {
    const user = req.body;
    const hashedPassword = await bcrypt.hash(user.password, 10);
    const result = await userModel.addUser({ ...user, password: hashedPassword, avatar: req.file ? req.file.filename : null });
    const token = await jwt.sign({ id: result.id, email: result.email, role: result.role }, process.env.JWT_SECRET, { expiresIn: "15m" });
    const refreshToken = await jwt.sign({ id: result.id, email: result.email, role: result.role }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: "7d" });
    await db.execute("INSERT INTO RefreshToken (user_id, token) VALUES (?, ?)", [result.id, refreshToken]);
    res.cookie("refreshToken", refreshToken, { httpOnly: true, secure: false, sameSite: "Strict", maxAge: 7 * 24 * 60 * 60 * 1000 });
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
    const user = req.body;
    const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [user.email]);
    if (rows.length === 0) return res.status(404).json({ error: "User not found" });
    const isMatch = await bcrypt.compare(user.password, rows[0].password);
    if (!isMatch) return res.status(401).json({ error: "Invalid password" });
    const AccessToken = await jwt.sign({ id: rows[0].id, email: rows[0].email, role: rows[0].role }, process.env.JWT_SECRET, { expiresIn: "15m" });
    const RefreshToken = await jwt.sign({ id: rows[0].id, email: rows[0].email, role: rows[0].role }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: "7d" });
    await db.execute("INSERT INTO RefreshToken (user_id, token) VALUES (?, ?)", [rows[0].id, RefreshToken]);
    res.cookie("refreshToken", RefreshToken, { httpOnly: true, secure: false, sameSite: "Strict", maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.json({ message: "Login successful", user: { id: rows[0].id, username: rows[0].username, email: rows[0].email }, token: AccessToken, role: rows[0].role });
};
const refreshToken = async (req, res) => {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) return res.status(401).json({ error: "No refresh token provided" });
    const [rows] = await db.execute("SELECT * FROM RefreshToken WHERE token = ? and user_id=?", [refreshToken, req.user.id]);
    if (rows.length === 0) return res.status(403).json({ error: "Invalid refresh token" });
    jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, async (err, decoded) => {
        if (err) return res.status(403).json({ error: "Invalid refresh token" });
        await db.execute("DELETE FROM RefreshToken WHERE token = ?", [refreshToken]);
        const newRefreshToken = await jwt.sign({ id: decoded.id, email: decoded.email, role: decoded.role }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: "7d" });
        await db.execute("INSERT INTO RefreshToken (user_id, token) VALUES (?, ?)", [decoded.id, newRefreshToken]);
        res.cookie("refreshToken", newRefreshToken, { httpOnly: true, secure: false, sameSite: "Strict", maxAge: 7 * 24 * 60 * 60 * 1000 });
        const NewAccessToken = await jwt.sign({ id: decoded.id, email: decoded.email, role: decoded.role }, process.env.JWT_SECRET, { expiresIn: "15m" });
        res.json({ token: NewAccessToken });
    });
};
const logout = async (req, res) => {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) return res.status(400).json({ error: "No refresh token provided" });
    await db.execute("DELETE FROM RefreshToken WHERE token = ?", [refreshToken]);
    res.clearCookie("refreshToken");
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
    const rows = await userModel.getAllUsers(limit, page);
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
