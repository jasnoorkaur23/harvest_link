const mongoose = require("mongoose");

const donationSchema = new mongoose.Schema(
    {
        donor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        donorName: { type: String, required: true, trim: true },
        foodType: { type: String, required: true, trim: true },
        quantity: { type: Number, required: true, min: [1, "Quantity must be a positive number."] },
        unit: { type: String, enum: ["servings", "kg", "boxes", "loaves", "packets"], default: "servings" },
        expiryDate: { type: String, required: true }, // stored as YYYY-MM-DD, same as the date input
        pickupLocation: { type: String, required: true, trim: true },
        pickupTime: { type: String, default: "" },
        image: { type: String, default: "" }, // path like /uploads/123-photo.jpg (uploaded with Multer)
        status: { type: String, enum: ["Available", "Claimed", "Picked Up", "Delivered"], default: "Available" },
        claimedBy: { type: String, default: "" },
        claimedByNgo: { type: mongoose.Schema.Types.ObjectId, ref: "Ngo", default: null },
        pickupCode: { type: String, default: "" }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Donation", donationSchema);
