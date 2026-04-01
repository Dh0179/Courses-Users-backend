const express = require('express');
const ratelimit = require("express-rate-limit");
const limiter = ratelimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
});
const router = express.Router();
const multer = require("multer");
const storage = multer.diskStorage({
        destination: function (req, file, cb) {
                cb(null, "uploads/");
        },
        filename: function (req, file, cb) {
                const ext=file.mimetype.split('/')[1];
                const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}.${ext}`;
                cb(null, uniqueSuffix + '-' + file.originalname);
        }
});
const fileFilter = (req, file, cb) => {
        if (file.mimetype.startsWith("image/")) {
                return cb(null, true);
        } else {
                return cb(new Error("Only image files are allowed"), false);
        }
};
const upload = multer({ storage: storage, fileFilter: fileFilter });
const controllers = require("../controllers/users_controllers");
const { validateUserName,validateUserEmail, validationMiddleware, validateLogin,validateAdmin, validateUserPassword } = require("../middleware/validateUsers");
const { verifyAccessToken } = require("../middleware/verifytoken");
router.use("/login", limiter);
router.use("/register", limiter);
router
        .post("/register", upload.single("avatar"), validateUserName, validateUserEmail, validateUserPassword, validationMiddleware, controllers.register);
router
        .post("/login", validateLogin, validationMiddleware, controllers.login);
router
        .post("/refreshToken", controllers.refreshToken);
router
        .patch("/resetPassword/:id", verifyAccessToken, validateUserPassword, validationMiddleware, controllers.resetPassword);
router
        .patch("/update/:id", verifyAccessToken, validateUserName, validateUserEmail, validateAdmin, validationMiddleware, controllers.updateUser);
router.route("/:id")
        .get(verifyAccessToken, validationMiddleware, controllers.getUserById)
        .delete(verifyAccessToken, validateAdmin, validationMiddleware, controllers.deleteUser);
router
        .get("/", verifyAccessToken, validateAdmin, validationMiddleware, controllers.getAllUsers);
router
        .post("/logout", verifyAccessToken, controllers.logout);
module.exports = router;
