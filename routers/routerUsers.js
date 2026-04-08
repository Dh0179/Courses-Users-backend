const express = require('express');
const ratelimit = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const controllers = require("../controllers/users_controllers");
const redisClient = require('../data/redisClient');
const {isBlacklisted} = require("../middleware/isBlacklist");
const registerLimiter = ratelimit({
        store: new RedisStore({
                client: redisClient,
                prefix: "register",
                sendCommand: (...args) => redisClient.sendCommand(args),
        }),
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100,// limit each IP to 100 requests per windowMs
        handler:(req, res) => {                res.status(429).json({ error: "Too many requests, please try again later." });
        }
});
const loginLimiter = ratelimit({
        store: new RedisStore({
                client: redisClient,
                sendCommand: (...args) => redisClient.sendCommand(args),
                prefix: "login",
        }),
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100,// limit each IP to 100 requests per windowMs
        handler:(req, res) => {                res.status(429).json({ error: "Too many requests, please try again later." });
        }
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
const { validateUserName,validateUserEmail, validationMiddleware, validateLogin,validateAdmin, validateUserPassword } = require("../middleware/validateUsers");
const { verifyAccessToken } = require("../middleware/verifytoken");
router.use("/login", loginLimiter);
router.use("/register", registerLimiter);
router
        .post("/register", upload.single("avatar"), validateUserName(), validateUserEmail(), validateUserPassword(), validationMiddleware, controllers.register);
router
        .post("/login", validateLogin(), validationMiddleware, controllers.login);
router
        .post("/refreshToken", isBlacklisted,controllers.refreshToken);
router
        .patch("/resetPassword/:id", verifyAccessToken, isBlacklisted, validateUserPassword(), validationMiddleware, controllers.resetPassword);
router
        .patch("/update/:id", verifyAccessToken, isBlacklisted, validateUserName(), validateUserEmail(), validateAdmin, validationMiddleware, controllers.updateUser);
router.route("/:id")
        .get(verifyAccessToken, validationMiddleware, controllers.getUserById)
        .delete(verifyAccessToken, validateAdmin, validationMiddleware, controllers.deleteUser);
router
        .get("/", verifyAccessToken, validateAdmin, validationMiddleware, controllers.getAllUsers);
router
        .post("/logout", verifyAccessToken,isBlacklisted, controllers.logout);
module.exports = router;
