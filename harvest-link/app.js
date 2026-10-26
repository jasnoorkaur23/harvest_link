const express = require("express");
const path = require("path");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const donationRoutes = require("./routes/donations");
const ngoRoutes = require("./routes/ngos");
const statsRoutes = require("./routes/stats");

const app = express();

app.use(cors());
app.use(express.json());

// API
app.use("/api/auth", authRoutes);
app.use("/api/donations", donationRoutes);
app.use("/api/ngos", ngoRoutes);
app.use("/api/stats", statsRoutes);

// static files: uploaded food photos + the front end
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.static(path.join(__dirname, "public")));

// unknown API route
app.use("/api", function (req, res) {
    res.status(404).json({ message: "API route not found." });
});

// last-resort error handler
app.use(function (err, req, res, next) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong on the server." });
});

module.exports = app;
