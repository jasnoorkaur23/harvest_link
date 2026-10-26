require("dotenv").config();
const app = require("./app");
const connectDB = require("./config/db");
const ensureAdmin = require("./config/seedAdmin");

const PORT = process.env.PORT || 3000;

if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET is missing. Copy .env.example to .env and set it.");
    process.exit(1);
}

connectDB()
    .then(ensureAdmin)
    .then(function () {
        app.listen(PORT, function () {
            console.log("Harvest Link running at http://localhost:" + PORT);
        });
    })
    .catch(function (err) {
        console.error("Could not start server:", err.message);
        console.error("Is MongoDB running? (check MONGO_URI in .env)");
        process.exit(1);
    });
