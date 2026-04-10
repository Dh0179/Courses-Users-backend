const db = require("../data/db");
const User = require("../models/users");
const bcrypt = require("bcryptjs");
const redisClient = require("../data/redisClient");
const userModel = new User(db);
const getUserById = async (req, res) => {
    try {
        const cachedUser = await redisClient.get(`user:${req.params.id}`);
        if (cachedUser) {
            return res.json(JSON.parse(cachedUser));
        }
        if (cachedUser) {

            return res.json(JSON.parse(cachedUser));
        }
        const user = await userModel.getUserById(req.params.id);
        await redisClient.setEx(`user:${req.params.id}`, 60 * 60 * 24, JSON.stringify(user)); // Cache for 1 day
        res.json({
            id: user.id,
            username: user.username,
            email: user.email
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
    const formattedRows = rows.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email
    }));
    await redisClient.setEx(`users:page:${page}:limit:${limit}`, 60 * 60 * 24, JSON.stringify(formattedRows)); // Cache for 1 day
    res.json(formattedRows);
};
const deleteUser = async (req, res) => {
    try {
        const result = await userModel.deleteUser(req.params.id);
        res.json(result);
    }
    catch (error) {
        res.status(500).json(
            {
                error: "Error deleting user: " + error.message
            }
        );
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
        res.status(500).json(
            {
                error: "Error updating user: " + error.message
            }
        );
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
        res.status(500).json(
            {
                error: "Error updating password: " + error.message
            }
        );
    }
};
const changeToAdmin = async (req, res) => {
    try {
        const result = await userModel.changeToAdmin(req.params.id);
        await redisClient.del(`user:${req.params.id}`); // delete cache
        res.status(200).json({
            message: "User role updated to admin successfully",
            id: result.id,
            username: result.username,
            email: result.email,
            role: result.role
        });
    }
    catch (error) {
        res.status(500).json(
            {
                error: "Error updating user role: " + error.message
            }
        );
    }
};
const changeToUser = async (req, res) => {
    try {
        const result = await userModel.changeToUser(req.params.id);
        await redisClient.del(`user:${req.params.id}`); // delete cache
        res.status(200).json({
            message: "User role updated to user successfully",
            id: result.id,
            username: result.username,
            email: result.email,
            role: result.role
        });
    }
    catch (error) {
        res.status(500).json(
            {
                error: "Error updating user role: " + error.message
            }
        );
    }
};
module.exports = {
    getUserById,
    getAllUsers,
    deleteUser,
    updateUser,
    resetPassword,
    changeToAdmin,
    changeToUser
};
