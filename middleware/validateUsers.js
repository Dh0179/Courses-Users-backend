const { body ,validationResult} = require('express-validator');
const db = require("../data/db");
const validateUserEmail = () => {
    return [
        body("email")
            .notEmpty()
            .withMessage("Email is required")
            .isEmail()
            .withMessage("Please provide a valid email address")
            .isLength({ max: 255, min: 8 })
            .withMessage("Email must be between 8 and 255 characters long")
            .normalizeEmail()
            .custom(async (email) => {
                // Check if the email already exists in the database
                const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
                if (rows.length > 0) {
                    throw new Error("Email already in use");
                }
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(email)) {
                    throw new Error("Invalid email format");
                }
            })
    ];
};
const validateUserPassword = () => {
    return [
        body("password")
            .notEmpty()
            .withMessage("Password is required")
            .isString()
            .withMessage("Password must be a string")
            .isLength({ min: 6,max: 20 })
            .withMessage("Password must be at least 6 and at most 20 characters long")
            .trim()
            .matches(/\d/)
            .withMessage("Password must contain a number")
            .matches(/[!@#$%^&*(),.?":{}|<>]/)
            .withMessage("Password must contain a special character")
    ];
};
const validateUserName = () => {
    return [
            body("username")
            .notEmpty()
            .withMessage("Username is required")
            .isString()
            .withMessage("Username must be a string")
            .isLength({ min: 3, max: 50 })
            .withMessage("Username must be between 3 and 50 characters long")
    ];
};
const validationMiddleware = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};
const validateLogin = () => {
    return [
        body("email")
            .notEmpty()
            .withMessage("Email is required")
            .isEmail()
            .withMessage("Please provide a valid email address"),
        body("password")
            .notEmpty()
            .withMessage("Password is required")
    ];
};
const validateAdmin = (req, res, next) => {
    if (req.user.role !== "admin") {
        return res.status(403).json({ error: "Access denied: Admins only" });
    }
    next();
};
module.exports = {
    validateUserName,
    validateUserEmail,
    validateUserPassword,
    validationMiddleware,
    validateLogin,
    validateAdmin
};