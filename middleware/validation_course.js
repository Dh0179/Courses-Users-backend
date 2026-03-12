const { body } = require("express-validator");
const validateCourse = () => {
    return [
        body("name")
            .notEmpty().isLength({ min: 1 })
            .isString().withMessage("Name must be a string"),
        body("price")
            .isLength({ min: 4 }).notEmpty()
            .isNumeric().withMessage("Price must be a number")
    ];
};
module.exports = {
    validateCourse
};