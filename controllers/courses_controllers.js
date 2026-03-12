const db = require("../data/db");
const Course = require("../models/model_course");
const courseModel = new Course(db);
const {validationResult} = require("express-validator");
const ListCourses = async (req, res) => {
    const limit = Number.parseInt(req.query.limit) || 2;
    const page = Number.parseInt(req.query.page) || 1;
    const rows = await courseModel.getAllCourses(limit, page);
    res.json(rows);
};
const getCourseById = async (req, res) => {
    try {
        const course = await courseModel.getCourseById(req.params.id);
        res.json(course);
    }
    catch (error) {
        res.status(500).json({ error: "Error fetching course: " + error.message });
    }
};
const addCourse = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
        return res.status(400).json({ errors: errors.array() });
    const course = req.body;
    const result = await courseModel.addCourse(course);
    res.json(result);
};
const updateCourse = async (req, res) => {          //update course
    const course = req.body;
    await courseModel.updateCourse(req.params.id, course);
    res.json(course);
}
const deleteCourse = async (req, res) => {
    const [rows] = await db.execute(`SELECT * FROM courses WHERE id = ?`, [req.params.id]);
    if (rows.length === 0) return res.status(404).send("Course not found");
    await courseModel.deleteCourse(req.params.id);
    res.json({ message: "Course deleted successfully" });
};
module.exports = {
    ListCourses,
    getCourseById,
    addCourse,
    updateCourse,
    deleteCourse
};