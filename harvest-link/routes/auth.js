const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Ngo = require("../models/Ngo");
const { protect } = require("../middleware/auth");

const router = express.Router();

function signToken(user) {
    return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || "1d"
    });
}

function userPayload(user) {
    return { id: user._id, name: user.name, email: user.email, role: user.role };
}

// POST /api/auth/register  (donor / ngo / volunteer only - admin can't self-register)
router.post("/register", async (req, res) => {
    try {
        const name = (req.body.name || "").trim();
        const email = (req.body.email || "").trim().toLowerCase();
        const password = req.body.password || "";
        const role = req.body.role;

        if (!name || !email || !password || !role) {
            return res.status(400).json({ message: "Name, email, password and role are required." });
        }
        if (!["donor", "ngo", "volunteer"].includes(role)) {
            return res.status(400).json({ message: "Role must be donor, ngo or volunteer." });
        }
        if (!/^\S+@\S+\.\S+$/.test(email)) {
            return res.status(400).json({ message: "Please enter a valid email." });
        }
        if (password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters." });
        }
        if (await User.findOne({ email: email })) {
            return res.status(409).json({ message: "An account with this email already exists." });
        }
        if (role === "ngo" && (await Ngo.findOne({ name: name }))) {
            return res.status(409).json({ message: "An NGO with this name already exists." });
        }

        const user = await User.create({ name, email, password, role });

        // an NGO account gets its own NGO record, waiting for admin verification
        if (role === "ngo") {
            await Ngo.create({ name: name, user: user._id, verified: false });
        }

        res.status(201).json({ token: signToken(user), user: userPayload(user) });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST /api/auth/login  (everyone, including admin)
router.post("/login", async (req, res) => {
    try {
        const email = (req.body.email || "").trim().toLowerCase();
        const password = req.body.password || "";
        const wantAdmin = req.body.admin === true;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required." });
        }

        const user = await User.findOne({ email: email }).select("+password");
        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({ message: "Incorrect email or password." });
        }
        // the admin tab only accepts admin accounts, the user tab never accepts admin
        if (wantAdmin && user.role !== "admin") {
            return res.status(403).json({ message: "This account is not an admin." });
        }
        if (!wantAdmin && user.role === "admin") {
            return res.status(403).json({ message: "Admins must use the Admin Login tab." });
        }

        res.json({ token: signToken(user), user: userPayload(user) });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /api/auth/me  (used on page refresh to restore the session)
router.get("/me", protect, function (req, res) {
    res.json({ user: userPayload(req.user) });
});

module.exports = router;
