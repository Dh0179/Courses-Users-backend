const express = require("express");
const cookieParser = require("cookie-parser");
const coursesRouter = require("./routers/router_courses");
const usersRouter = require("./routers/routerUsers");
require("dotenv").config();
const app = express();
app.use(cookieParser());
const cors=require("cors");
app.use(cors({
    origin:process.env.Frontend_URL
}));
const path=require("node:path");
app.use('/uploads', express.static(path.join(__dirname, "uploads")));
app.use(express.json());
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