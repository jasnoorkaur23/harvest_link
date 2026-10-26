const express = require("express");
const fs = require("fs");
const path = require("path");
const Donation = require("../models/Donation");
const Ngo = require("../models/Ngo");
const upload = require("../middleware/upload");
const { protect, allowRoles } = require("../middleware/auth");

const router = express.Router();
router.use(protect); // every donation route needs a logged-in user

function generatePickupCode() {
    return "RC-" + Math.random().toString(36).slice(2, 6).toUpperCase();
}

function todayString() {
    return new Date().toISOString().split("T")[0];
}

function removeImageFile(imagePath) {
    if (!imagePath) return;
    const full = path.join(__dirname, "..", imagePath);
    fs.unlink(full, function () {}); // ignore errors (file may already be gone)
}

function escapeRegex(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// GET /api/donations?status=Available&location=rajpura&sort=expiry|newest|quantity&mine=true
router.get("/", async (req, res) => {
    try {
        const filter = {};
        if (req.query.status) {
            filter.status = req.query.status;
        }
        if (req.query.location) {
            filter.pickupLocation = new RegExp(escapeRegex(req.query.location.trim()), "i");
        }
        if (req.query.mine === "true") {
            filter.donor = req.user._id;
        }

        let sortBy = { createdAt: -1 };
        if (req.query.sort === "expiry") sortBy = { expiryDate: 1 };
        if (req.query.sort === "quantity") sortBy = { quantity: -1 };

        const donations = await Donation.find(filter).sort(sortBy);
        res.json(donations);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST /api/donations  (donor only, multipart/form-data so a photo can be attached)
router.post("/", allowRoles("donor"), function (req, res) {
    upload.single("image")(req, res, async function (uploadErr) {
        if (uploadErr) {
            return res.status(400).json({ message: uploadErr.message });
        }
        try {
            const donorName = (req.body.donorName || req.user.name).trim();
            const foodType = (req.body.foodType || "").trim();
            const quantity = Number(req.body.quantity);
            const unit = req.body.unit || "servings";
            const expiryDate = req.body.expiryDate || "";
            const pickupLocation = (req.body.pickupLocation || "").trim();
            const pickupTime = req.body.pickupTime || "";
            const imagePath = req.file ? "/uploads/" + req.file.filename : "";

            let error = "";
            if (!donorName || !foodType || !pickupLocation || !expiryDate) {
                error = "Please fill in every required field.";
            } else if (!(quantity > 0)) {
                error = "Quantity must be a positive number.";
            } else if (expiryDate < todayString()) {
                error = "Expiry date can't be in the past.";
            }
            if (error) {
                removeImageFile(imagePath);
                return res.status(400).json({ message: error });
            }

            const donation = await Donation.create({
                donor: req.user._id,
                donorName,
                foodType,
                quantity,
                unit,
                expiryDate,
                pickupLocation,
                pickupTime,
                image: imagePath
            });
            res.status(201).json(donation);
        } catch (err) {
            removeImageFile(req.file ? "/uploads/" + req.file.filename : "");
            res.status(400).json({ message: err.message });
        }
    });
});

// PATCH /api/donations/:id/claim  (verified NGO only)
router.patch("/:id/claim", allowRoles("ngo"), async (req, res) => {
    try {
        const ngo = await Ngo.findOne({ user: req.user._id });
        if (!ngo) {
            return res.status(403).json({ message: "No NGO profile found for your account." });
        }
        if (!ngo.verified) {
            return res.status(403).json({ message: "Your NGO is not verified yet. Ask the admin to verify it." });
        }

        // only claim if still Available (atomic, so two NGOs can't claim the same donation)
        const donation = await Donation.findOneAndUpdate(
            { _id: req.params.id, status: "Available" },
            { status: "Claimed", claimedBy: ngo.name, claimedByNgo: ngo._id, pickupCode: generatePickupCode() },
            { new: true }
        );
        if (!donation) {
            return res.status(409).json({ message: "This donation is no longer available." });
        }
        res.json(donation);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// move a donation from one status to the next
async function moveStatus(req, res, fromStatus, toStatus) {
    try {
        const donation = await Donation.findOneAndUpdate(
            { _id: req.params.id, status: fromStatus },
            { status: toStatus },
            { new: true }
        );
        if (!donation) {
            return res.status(409).json({ message: "Donation must be \"" + fromStatus + "\" to become \"" + toStatus + "\"." });
        }
        res.json(donation);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
}

// PATCH /api/donations/:id/pickup   (volunteer or admin)
router.patch("/:id/pickup", allowRoles("volunteer", "admin"), function (req, res) {
    moveStatus(req, res, "Claimed", "Picked Up");
});

// PATCH /api/donations/:id/deliver  (volunteer or admin)
router.patch("/:id/deliver", allowRoles("volunteer", "admin"), function (req, res) {
    moveStatus(req, res, "Picked Up", "Delivered");
});

// DELETE /api/donations/:id  (admin only)
router.delete("/:id", allowRoles("admin"), async (req, res) => {
    try {
        const donation = await Donation.findByIdAndDelete(req.params.id);
        if (!donation) {
            return res.status(404).json({ message: "Donation not found." });
        }
        removeImageFile(donation.image);
        res.json({ message: "Donation removed." });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

module.exports = router;
