const bcrypt = require("bcryptjs");
const { response } = require("express");
class User{
    constructor(db) {
        this.db = db;
    }
    async getAllUsers(limit = 2, page = 1) {
        const offset = (page - 1) * limit;
        const [rows] = await this.db.execute(`SELECT id, username, email ,role FROM users LIMIT ${limit} OFFSET ${offset}`);
        return rows;
    }
    async getUserById(id) {

        const [rows] = await this.db.execute('SELECT id, username, email, role FROM users WHERE id = ?', [id]);
        if (rows.length === 0) throw new Error("User not found");
        return rows[0];
    }
    async addUser(user) {
        const [result] = await this.db.execute("INSERT INTO users (username, email, password,avatar) VALUES (?, ?, ?, ?)", [user.username, user.email, user.password, user.avatar]);
        return { id: result.insertId, ...user };
    }
    async updateUser(id, NewEmail, NewUsername) {
        this.verifyId(id);
        await this.db.execute(`UPDATE users SET username = ?, email = ? WHERE id = ?`, [NewUsername, NewEmail, id]);
        return { id, email: NewEmail, username: NewUsername };
    }
    async verifyRole(id) {
        const [rows] = await this.db.execute(`SELECT role FROM users WHERE id = ?`, [id]);
        if (rows.length === 0) throw new Error("User not found");
        return rows[0].role;
    }
    async deleteUser(id) {
        const role = await this.verifyRole(id);
        if (role === "admin") throw new Error("Cannot delete an admin user");
        await this.verifyId(id);
        await this.db.execute(`DELETE FROM users WHERE id = ?`, [id]);
        return { message: "User deleted successfully" };
    }
    async updatePassword(id, password ,newPassword) {
        this.verifyId(id);
        const [rows] = await this.db.execute(`SELECT password FROM users WHERE id = ?`, [id]);
        const isMatch = await bcrypt.compare(password, rows[0].password);
        if (!isMatch) throw new Error("Current password is incorrect");
        await this.db.execute(`UPDATE users SET password = ? WHERE id = ?`, [newPassword, id]);
        return { message: "Password updated successfully" };
    }
};
module.exports = User;