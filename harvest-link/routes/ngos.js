const express = require("express");
const Ngo = require("../models/Ngo");
const { protect, allowRoles } = require("../middleware/auth");

const router = express.Router();
router.use(protect);

// GET /api/ngos
router.get("/", async (req, res) => {
    try {
        res.json(await Ngo.find().sort({ createdAt: 1 }));
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST /api/ngos  (admin registers an NGO by name)
router.post("/", allowRoles("admin"), async (req, res) => {
    try {
        const name = (req.body.name || "").trim();
        if (!name) {
            return res.status(400).json({ message: "NGO name is required." });
        }
        if (await Ngo.findOne({ name: name })) {
            return res.status(409).json({ message: "An NGO with this name already exists." });
        }
        const ngo = await Ngo.create({ name: name, verified: false });
        res.status(201).json(ngo);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// PATCH /api/ngos/:id/verify  (admin toggles verified on/off)
router.patch("/:id/verify", allowRoles("admin"), async (req, res) => {
    try {
        const ngo = await Ngo.findById(req.params.id);
        if (!ngo) {
            return res.status(404).json({ message: "NGO not found." });
        }
        ngo.verified = !ngo.verified;
        await ngo.save();
        res.json(ngo);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

module.exports = router;
