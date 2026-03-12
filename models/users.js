class User{
    constructor(db) {
        this.db = db;
    }
    async getAllUsers(limit = 2, page = 1) {
        const offset = (page - 1) * limit;
        const [rows] = await this.db.execute(`SELECT id, username, email ,role FROM users LIMIT ${limit} OFFSET ${offset}`);
        return rows;
    }
    verifyId(id) {
        if (!id || Number.isNaN(Number(id))) throw new Error("Invalid user ID");
    }
    verifyEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailRegex.test(email)) throw new Error("Invalid email format");
    }
    verifyPassword(password) {
        if (!password || password.length < 6) throw new Error("Invalid password format");
    }
    async getUserById(id) {
        this.verifyId(id);
        const [rows] = await this.db.execute('SELECT id, username, email, role FROM users WHERE id = ?', [id]);
        if (rows.length === 0) throw new Error("User not found");
        return rows[0];
    }
    async addUser(user) {
        this.verifyEmail(user.email);
        this.verifyPassword(user.password);
        const [result] = await this.db.execute("INSERT INTO users (username, email, password,avatar) VALUES (?, ?, ?, ?)", [user.username, user.email, user.password, user.avatar]);
        return { id: result.insertId, ...user };
    }
    async deleteUser(id) {
        this.verifyId(id);
        const [rows] = await this.db.execute(`SELECT * FROM users WHERE id = ?`, [id]);
        if (rows.length === 0) throw new Error("User not found");
        await this.db.execute(`DELETE FROM users WHERE id = ?`, [id]);
        return { message: "User deleted successfully" };
    }
};
module.exports = User;