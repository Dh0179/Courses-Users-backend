const express = require("express");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const coursesRouter = require("./routers/router_courses");
const usersRouter = require("./routers/routerUsers");
const rateLimit = require("express-rate-limit");
require("dotenv").config();
const app = express();
app.use(express.json());
const cors=require("cors");
const path=require("node:path");
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
});
app.use(cookieParser());
app.use(helmet());
app.use(limiter);
app.use(cors({
    origin: process.env.Frontend_URL,
    credentials: true
}));
//middleware
app.use('/api/courses', coursesRouter);
app.use('/api/users', usersRouter);
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: "Internal Server Error" });
    next();
});
app.listen(process.env.PORT, () => {
    console.log("Server is running on port " + process.env.PORT);
})