const mongoose = require("mongoose");

const ngoSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true, unique: true },
        verified: { type: Boolean, default: false },
        // set when the NGO was created by an NGO user signing up; empty when admin registered it manually
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Ngo", ngoSchema);
