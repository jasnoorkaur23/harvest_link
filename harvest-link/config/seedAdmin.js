const User = require("../models/User");

// make sure one admin account exists (credentials come from .env)
async function ensureAdmin() {
    const email = (process.env.ADMIN_EMAIL || "admin@harvestlink.com").toLowerCase();
    const existing = await User.findOne({ email: email });
    if (existing) return;
    await User.create({
        name: process.env.ADMIN_NAME || "Admin",
        email: email,
        password: process.env.ADMIN_PASSWORD || "admin123",
        role: "admin"
    });
    console.log("Admin account created:", email);
}

module.exports = ensureAdmin;
