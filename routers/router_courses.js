const express = require("express");
const controllers = require("../controllers/courses_controllers");
const { validateCourse } = require("../middleware/validation_course");
const {validateAdmin} = require("../middleware/validateUsers");
const verifyToken = require("../middleware/verifyToken");
const router=express.Router();
router.get("/:id",verifyToken, controllers.getCourseById);
router.route("/")
    .get(verifyToken, controllers.ListCourses)
    .post(
            verifyToken,
            validateAdmin,
            validateCourse(),
            controllers.addCourse
        );
router.patch("/update/:id", verifyToken, validateAdmin, controllers.updateCourse);
router.delete("/delete/:id", verifyToken, validateAdmin, controllers.deleteCourse);
module.exports=router;