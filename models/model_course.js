class Course {
    constructor(db) {
        this.db = db;
    }
    async getAllCourses(limit = 2, page = 1) {
        const offset = (page - 1) * limit;
        const [rows] = await this.db.execute(`SELECT * FROM courses LIMIT ${limit} OFFSET ${offset}`);
        return rows;
    }
    verifyId(id) {
        if (!id || Number.isNaN(Number(id))) throw new Error("Invalid course ID");
    }
    async getCourseById(id) {
        this.verifyId(id);
        const [rows] = await this.db.execute(`SELECT * FROM courses WHERE id = ?`, [id]);
        if (rows.length === 0) throw new Error("Course not found");
        return rows[0];
    }
    async addCourse(course) {
        const [result] = await this.db.execute("INSERT INTO courses (name, price) VALUES (?, ?)", [course.name, course.price]);
        return { id: result.insertId, ...course };
    }
    async updateCourse(id, course) {
        this.verifyId(id);
        await this.db.execute(`UPDATE courses SET name = ?, price = ? WHERE id = ?`, [course.name, course.price, id]);
        return course;
    }
    async deleteCourse(id) {
        this.verifyId(id);
        const [rows] = await this.db.execute(`SELECT * FROM courses WHERE id = ?`, [id]);
        if (rows.length === 0) throw new Error("Course not found");
        await this.db.execute(`DELETE FROM courses WHERE id = ?`, [id]);
        return { message: "Course deleted successfully" };
    }
}
module.exports = Course;