const express = require('express');
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
const { validateUser, validationMiddleware, validateLogin,validateAdmin } = require("../middleware/validateUsers");
const verifyToken = require("../middleware/verifyToken");
router
        .post("/register", upload.single("avatar"), validateUser(), validationMiddleware, controllers.register);
router
        .post("/login", validateLogin(), validationMiddleware, controllers.login);
router.route("/:id")
        .get(verifyToken, validationMiddleware, controllers.getUserById)
        .delete(verifyToken, validateAdmin, validationMiddleware, controllers.deleteUser);
router
        .get("/", verifyToken, validationMiddleware, controllers.getAllUsers);
module.exports = router;