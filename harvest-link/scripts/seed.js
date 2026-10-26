// npm run seed  -> adds demo accounts + sample donations (safe to run more than once)
require("dotenv").config();
const connectDB = require("../config/db");
const ensureAdmin = require("../config/seedAdmin");
const User = require("../models/User");
const Ngo = require("../models/Ngo");
const Donation = require("../models/Donation");

function datePlusDays(n) {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d.toISOString().split("T")[0];
}

async function getOrCreateUser(name, email, role) {
    let user = await User.findOne({ email: email });
    if (!user) user = await User.create({ name, email, password: "demo123", role });
    return user;
}

async function run() {
    await connectDB();
    await ensureAdmin();

    const donor = await getOrCreateUser("Sunrise Bakery", "donor@demo.com", "donor");
    const ngoUser = await getOrCreateUser("Anna Foundation", "ngo@demo.com", "ngo");
    await getOrCreateUser("Vikram Volunteer", "volunteer@demo.com", "volunteer");

    let anna = await Ngo.findOne({ name: "Anna Foundation" });
    if (!anna) anna = await Ngo.create({ name: "Anna Foundation", verified: true, user: ngoUser._id });
    else if (!anna.user) { anna.user = ngoUser._id; anna.verified = true; await anna.save(); }
    if (!(await Ngo.findOne({ name: "Roti Ghar NGO" }))) await Ngo.create({ name: "Roti Ghar NGO", verified: true });
    if (!(await Ngo.findOne({ name: "Umeed Trust" }))) await Ngo.create({ name: "Umeed Trust", verified: false });

    if ((await Donation.countDocuments()) === 0) {
        await Donation.create([
            { donor: donor._id, donorName: "Sunrise Bakery", foodType: "Sourdough loaves", quantity: 20, unit: "loaves",
              expiryDate: datePlusDays(1), pickupLocation: "Sector 14, Rajpura", pickupTime: "18:00" },
            { donor: donor._id, donorName: "Green Leaf Hostel", foodType: "Vegetable pulao", quantity: 40, unit: "servings",
              expiryDate: datePlusDays(0), pickupLocation: "Model Town, Patiala", pickupTime: "20:30",
              status: "Claimed", claimedBy: "Anna Foundation", claimedByNgo: anna._id, pickupCode: "RC-482K" },
            { donor: donor._id, donorName: "City Events Co.", foodType: "Packed lunch boxes", quantity: 60, unit: "boxes",
              expiryDate: datePlusDays(2), pickupLocation: "Sector 14, Rajpura", pickupTime: "13:00",
              status: "Delivered", claimedBy: "Roti Ghar NGO", pickupCode: "RC-119A" }
        ]);
    }

    console.log("Seed done. Demo logins (password demo123): donor@demo.com, ngo@demo.com, volunteer@demo.com");
    process.exit(0);
}

run().catch(function (err) { console.error(err); process.exit(1); });
