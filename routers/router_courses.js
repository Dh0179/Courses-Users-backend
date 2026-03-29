const express = require("express");
const controllers = require("../controllers/courses_controllers");
const { validateCourse } = require("../middleware/validation_course");
const {validateAdmin} = require("../middleware/validateUsers");
const { verifyAccessToken } = require("../middleware/verifytoken");
const router=express.Router();
router.get("/:id",verifyAccessToken, controllers.getCourseById);
router.route("/")
    .get(verifyAccessToken, controllers.ListCourses)
    .post(
            verifyAccessToken,
            validateAdmin,
            validateCourse(),
            controllers.addCourse
        );
router.patch("/update/:id", verifyAccessToken, validateAdmin, controllers.updateCourse);
router.delete("/delete/:id", verifyAccessToken, validateAdmin, controllers.deleteCourse);
module.exports=router;