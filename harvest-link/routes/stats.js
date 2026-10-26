const express = require("express");
const Donation = require("../models/Donation");
const Ngo = require("../models/Ngo");
const { protect } = require("../middleware/auth");

const router = express.Router();

// GET /api/stats  - dashboard numbers computed with MongoDB aggregation
router.get("/", protect, async (req, res) => {
    try {
        const statuses = ["Available", "Claimed", "Picked Up", "Delivered"];

        const byStatus = await Donation.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]);
        const counts = {};
        statuses.forEach(function (s) { counts[s] = 0; });
        byStatus.forEach(function (row) { counts[row._id] = row.count; });

        const totalsAgg = await Donation.aggregate([
            { $group: { _id: null, units: { $sum: "$quantity" }, total: { $sum: 1 } } }
        ]);
        const totalUnits = totalsAgg.length ? totalsAgg[0].units : 0;
        const totalDonations = totalsAgg.length ? totalsAgg[0].total : 0;

        const topDonors = await Donation.aggregate([
            { $group: { _id: "$donorName", units: { $sum: "$quantity" } } },
            { $sort: { units: -1 } },
            { $limit: 3 },
            { $project: { _id: 0, name: "$_id", units: 1 } }
        ]);

        // expiring today/tomorrow (or already expired) and not delivered yet
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split("T")[0];
        const expiringSoon = await Donation.find({
            expiryDate: { $lte: tomorrowStr },
            status: { $ne: "Delivered" }
        }).sort({ expiryDate: 1 });

        const verifiedNgos = await Ngo.countDocuments({ verified: true });

        res.json({
            counts,
            totalUnits,
            totalDonations,
            activeCount: totalDonations - counts["Delivered"],
            verifiedNgos,
            topDonors,
            expiringSoon
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
