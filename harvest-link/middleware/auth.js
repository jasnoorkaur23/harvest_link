const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Authentication: is there a valid token? -> sets req.user
async function protect(req, res, next) {
    try {
        const header = req.headers.authorization || "";
        if (!header.startsWith("Bearer ")) {
            return res.status(401).json({ message: "Please log in first." });
        }
        const token = header.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(401).json({ message: "This account no longer exists." });
        }
        req.user = user;
        next();
    } catch (err) {
        return res.status(401).json({ message: "Session expired or invalid. Please log in again." });
    }
}

// Authorization: is this user's role allowed on this route?
function allowRoles(...roles) {
    return function (req, res, next) {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: "Your role (" + req.user.role + ") is not allowed to do this." });
        }
        next();
    };
}

module.exports = { protect, allowRoles };
