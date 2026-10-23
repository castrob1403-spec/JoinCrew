const express = require("express");
const cors = require("cors");
const { errorHandler } = require("./middleware/error-handler");
const { router: authRoutes } = require("./routes/auth");
const userRoutes = require("./routes/users");
const conversationRoutes = require("./routes/conversations");
const groupRoutes = require("./routes/groups");
const roomRoutes = require("./routes/rooms");
const contactRoutes = require("./routes/contact");
const meetingRoutes = require("./routes/meetings");
const adminRoutes = require("./routes/admin");
const calendarRoutes = require("./routes/calendar");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/meetings", meetingRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/calendar", calendarRoutes);

app.use(errorHandler);

module.exports = app;
