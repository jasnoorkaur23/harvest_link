// ===============================================
// HARVEST LINK - front end (talks to the Express + MongoDB API)
// Same plain-JS style as before: let, functions, getElementById,
// addEventListener, forEach + innerHTML. Data now comes from fetch()
// instead of localStorage, and every request carries a JWT token.
// ===============================================

// ---------- state ----------
let donations = [];     // donations visible in the current panel (loaded from the API)
let ngos = [];
let stats = null;       // dashboard numbers computed by MongoDB aggregation
let notifications = []; // activity log (this browser session only)
let currentRole = "donor";
let currentUser = null; // { id, name, email, role }
let token = sessionStorage.getItem("token") || "";

// ---------- small helpers ----------
function escapeHtml(text) {
    // donations are typed in by users, so never put them in innerHTML raw
    return String(text === undefined || text === null ? "" : text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

// one function for every API call: adds the token, parses JSON, throws on errors
async function api(path, method, body) {
    let options = { method: method || "GET", headers: {} };
    if (token) {
        options.headers["Authorization"] = "Bearer " + token;
    }
    if (body instanceof FormData) {
        options.body = body; // multipart (photo upload) - the browser sets the headers
    } else if (body) {
        options.headers["Content-Type"] = "application/json";
        options.body = JSON.stringify(body);
    }

    let response = await fetch("/api" + path, options);
    let data = {};
    try {
        data = await response.json();
    } catch (err) {
        data = {};
    }
    if (!response.ok) {
        if (response.status === 401 && token) {
            clearSession(); // token expired
        }
        throw new Error(data.message || "Request failed (" + response.status + ")");
    }
    return data;
}

// ---------- LOGIN / REGISTER ----------
let loginScreen = document.getElementById("loginScreen");
let appScreen = document.getElementById("appScreen");

let userTabBtn = document.getElementById("userTabBtn");
let registerTabBtn = document.getElementById("registerTabBtn");
let adminTabBtn = document.getElementById("adminTabBtn");
let userLoginForm = document.getElementById("userLoginForm");
let registerForm = document.getElementById("registerForm");
let adminLoginForm = document.getElementById("adminLoginForm");
let userLoginError = document.getElementById("userLoginError");
let registerError = document.getElementById("registerError");
let adminLoginError = document.getElementById("adminLoginError");

let loggedInAs = document.getElementById("loggedInAs");
let logoutBtn = document.getElementById("logoutBtn");

function showLoginTab(which) {
    let tabs = { user: userTabBtn, register: registerTabBtn, admin: adminTabBtn };
    let forms = { user: userLoginForm, register: registerForm, admin: adminLoginForm };
    for (let key in tabs) {
        if (key === which) {
            tabs[key].classList.add("active");
            forms[key].classList.remove("hidden");
        } else {
            tabs[key].classList.remove("active");
            forms[key].classList.add("hidden");
        }
    }
}

userTabBtn.addEventListener("click", function () { showLoginTab("user"); });
registerTabBtn.addEventListener("click", function () { showLoginTab("register"); });
adminTabBtn.addEventListener("click", function () { showLoginTab("admin"); });

function showError(box, message) {
    box.innerText = message;
    box.classList.remove("hidden");
}

userLoginForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    userLoginError.classList.add("hidden");
    try {
        let data = await api("/auth/login", "POST", {
            email: document.getElementById("loginEmail").value.trim(),
            password: document.getElementById("loginPassword").value
        });
        startSession(data);
    } catch (err) {
        showError(userLoginError, err.message);
    }
});

registerForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    registerError.classList.add("hidden");
    try {
        let data = await api("/auth/register", "POST", {
            name: document.getElementById("regName").value.trim(),
            email: document.getElementById("regEmail").value.trim(),
            password: document.getElementById("regPassword").value,
            role: document.getElementById("regRole").value
        });
        startSession(data);
    } catch (err) {
        showError(registerError, err.message);
    }
});

adminLoginForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    adminLoginError.classList.add("hidden");
    try {
        let data = await api("/auth/login", "POST", {
            email: document.getElementById("adminUsername").value.trim(),
            password: document.getElementById("adminPassword").value,
            admin: true
        });
        startSession(data);
    } catch (err) {
        showError(adminLoginError, err.message);
    }
});

function startSession(data) {
    token = data.token;
    currentUser = data.user;
    sessionStorage.setItem("token", token);

    userLoginForm.reset();
    registerForm.reset();
    adminLoginForm.reset();

    showApp();
}

function clearSession() {
    token = "";
    currentUser = null;
    sessionStorage.removeItem("token");
    appScreen.classList.add("hidden");
    loginScreen.classList.remove("hidden");
}

logoutBtn.addEventListener("click", clearSession);

// which nav tabs each role may see (the server enforces this too)
function allowedPanels(role) {
    if (role === "admin") return ["admin", "donor", "ngo", "volunteer", "dashboard"];
    return [role, "dashboard"];
}

function showApp() {
    loggedInAs.innerText = currentUser.name + " (" + currentUser.role + ")";
    loginScreen.classList.add("hidden");
    appScreen.classList.remove("hidden");

    let allowed = allowedPanels(currentUser.role);
    let buttons = document.getElementsByClassName("role-btn");
    for (let i = 0; i < buttons.length; i++) {
        if (allowed.indexOf(buttons[i].getAttribute("data-role")) === -1) {
            buttons[i].classList.add("hidden");
        } else {
            buttons[i].classList.remove("hidden");
        }
    }

    setRole(currentUser.role);
}

// ---------- grab elements ----------
let roleNav = document.getElementById("roleNav");
let bellBtn = document.getElementById("bellBtn");
let bellCount = document.getElementById("bellCount");
let notifPanel = document.getElementById("notifPanel");
let notifList = document.getElementById("notifList");
let clearNotifsBtn = document.getElementById("clearNotifs");

let donationForm = document.getElementById("donationForm");
let formError = document.getElementById("formError");
let donorList = document.getElementById("donorList");

let ngoList = document.getElementById("ngoList");
let ngoStatusNote = document.getElementById("ngoStatusNote");
let locationFilter = document.getElementById("locationFilter");
let sortDonationsSel = document.getElementById("sortDonations");

let volunteerList = document.getElementById("volunteerList");

let ngoTable = document.getElementById("ngoTable");
let adminLog = document.getElementById("adminLog");
let addNgoForm = document.getElementById("addNgoForm");
let newNgoName = document.getElementById("newNgoName");

let statusBars = document.getElementById("statusBars");
let topDonors = document.getElementById("topDonors");
let expiryWatch = document.getElementById("expiryWatch");

let statMeals = document.getElementById("statMeals");
let statActive = document.getElementById("statActive");
let statNgo = document.getElementById("statNgo");
let quoteBox = document.getElementById("quoteBox");
let toastHost = document.getElementById("toastHost");

// ---------- role tabs (show/hide panels) ----------
let roleButtons = document.getElementsByClassName("role-btn");

roleNav.addEventListener("click", function (e) {
    if (!e.target.classList.contains("role-btn")) return;
    setRole(e.target.getAttribute("data-role"));
});

async function setRole(role) {
    currentRole = role;

    for (let i = 0; i < roleButtons.length; i++) {
        if (roleButtons[i].getAttribute("data-role") === role) {
            roleButtons[i].classList.add("active");
        } else {
            roleButtons[i].classList.remove("active");
        }
    }

    let panels = document.getElementsByClassName("panel");
    for (let i = 0; i < panels.length; i++) {
        if (panels[i].id === "panel-" + role) {
            panels[i].classList.remove("hidden");
        } else {
            panels[i].classList.add("hidden");
        }
    }

    await loadData();
}

// ---------- load data from the API for the visible panel ----------
async function loadData() {
    try {
        stats = await api("/stats");
        renderHeroStats();

        if (currentRole === "donor") {
            // admins see everyone's listings, donors only their own
            let path = currentUser.role === "admin" ? "/donations" : "/donations?mine=true";
            donations = await api(path);
            renderDonorPanel();
        } else if (currentRole === "ngo") {
            await loadNgoPanel();
        } else if (currentRole === "volunteer") {
            let all = await api("/donations");
            donations = all.filter(function (d) {
                return d.status === "Claimed" || d.status === "Picked Up";
            });
            renderVolunteerPanel();
        } else if (currentRole === "admin") {
            ngos = await api("/ngos");
            donations = await api("/donations");
            renderAdminPanel();
        } else if (currentRole === "dashboard") {
            renderDashboard();
        }
        renderNotifications();
    } catch (err) {
        showToast(err.message);
    }
}

async function loadNgoPanel() {
    let query = "?status=Available&sort=" + encodeURIComponent(sortDonationsSel.value);
    let loc = locationFilter.value.trim();
    if (loc !== "") {
        query += "&location=" + encodeURIComponent(loc);
    }
    donations = await api("/donations" + query);

    // show whether this NGO is verified yet
    if (currentUser.role === "ngo") {
        let allNgos = await api("/ngos");
        let mine = allNgos.find(function (n) {
            return n.user === currentUser.id;
        });
        if (mine && mine.verified) {
            ngoStatusNote.innerText = "✓ " + mine.name + " is verified — you can claim donations.";
        } else {
            ngoStatusNote.innerText = "Your NGO is awaiting admin verification — you can browse but not claim yet.";
        }
    } else {
        ngoStatusNote.innerText = "";
    }
    renderNgoPanel();
}

// ---------- bell / notifications ----------
bellBtn.addEventListener("click", function () {
    notifPanel.classList.toggle("hidden");
});

clearNotifsBtn.addEventListener("click", function () {
    notifications = [];
    renderNotifications();
});

function addNotification(message) {
    let now = new Date();
    notifications.unshift({ message: message, time: now.toLocaleTimeString() });
    renderNotifications();
}

function renderNotifications() {
    bellCount.innerText = notifications.length;

    if (notifications.length === 0) {
        notifList.innerHTML = "<li class='empty-state'>No activity yet.</li>";
        return;
    }

    let html = "";
    notifications.forEach(function (n) {
        html += "<li>" + escapeHtml(n.message) + "<span class='n-time'>" + n.time + "</span></li>";
    });
    notifList.innerHTML = html;
}

function showToast(message) {
    let box = document.createElement("div");
    box.className = "toast";
    box.innerText = message;
    toastHost.appendChild(box);
    setTimeout(function () {
        box.remove();
    }, 2600);
}

// ---------- donor: add a donation (form + validation + photo upload) ----------
donationForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    formError.classList.add("hidden");

    let donorName = document.getElementById("donorName").value.trim();
    let foodType = document.getElementById("foodType").value.trim();
    let quantity = Number(document.getElementById("quantity").value);
    let unit = document.getElementById("unit").value;
    let expiryDate = document.getElementById("expiryDate").value;
    let pickupLocation = document.getElementById("pickupLocation").value.trim();
    let pickupTime = document.getElementById("pickupTime").value;
    let imageFile = document.getElementById("foodImage").files[0];

    // quick checks in the browser (the server checks again)
    if (donorName === "" || foodType === "" || pickupLocation === "" || expiryDate === "") {
        showError(formError, "Please fill in every required field.");
        return;
    }
    if (quantity <= 0) {
        showError(formError, "Quantity must be a positive number.");
        return;
    }
    let today = new Date().toISOString().split("T")[0];
    if (expiryDate < today) {
        showError(formError, "Expiry date can't be in the past.");
        return;
    }
    if (imageFile && imageFile.size > 2 * 1024 * 1024) {
        showError(formError, "Photo must be smaller than 2 MB.");
        return;
    }

    // FormData because we are sending a file as well as text fields
    let formData = new FormData();
    formData.append("donorName", donorName);
    formData.append("foodType", foodType);
    formData.append("quantity", quantity);
    formData.append("unit", unit);
    formData.append("expiryDate", expiryDate);
    formData.append("pickupLocation", pickupLocation);
    formData.append("pickupTime", pickupTime);
    if (imageFile) {
        formData.append("image", imageFile);
    }

    try {
        await api("/donations", "POST", formData);
        addNotification("New donation listed: " + quantity + " " + unit + " of " + foodType + " from " + donorName + ".");
        donationForm.reset();
        showToast("Donation added");
        await loadData();
    } catch (err) {
        showError(formError, err.message);
    }
});

// ---------- admin: register a new NGO ----------
addNgoForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    let name = newNgoName.value.trim();
    if (name === "") return;

    try {
        await api("/ngos", "POST", { name: name });
        newNgoName.value = "";
        addNotification(name + " registered and awaiting verification.");
        await loadData();
    } catch (err) {
        showToast(err.message);
    }
});

// ---------- ngo panel filters (re-query the API) ----------
locationFilter.addEventListener("input", function () {
    loadNgoPanel().catch(function (err) { showToast(err.message); });
});
sortDonationsSel.addEventListener("change", function () {
    loadNgoPanel().catch(function (err) { showToast(err.message); });
});

// ---------- actions: claim / pickup / deliver / delete / verify ----------
// (called from the onclick attributes in the generated card HTML, so they stay global functions)
async function claimDonation(id) {
    try {
        let d = await api("/donations/" + id + "/claim", "PATCH");
        addNotification(d.claimedBy + " claimed a donation.");
        showToast("Donation claimed — code " + d.pickupCode);
        await loadData();
    } catch (err) {
        showToast(err.message);
        await loadData();
    }
}

async function markPickedUp(id) {
    await changeStatus(id, "pickup", "Marked picked up");
}

async function markDelivered(id) {
    await changeStatus(id, "deliver", "Marked delivered");
}

async function changeStatus(id, action, toastText) {
    try {
        let d = await api("/donations/" + id + "/" + action, "PATCH");
        addNotification(d.foodType + " is now \"" + d.status + "\".");
        showToast(toastText);
        await loadData();
    } catch (err) {
        showToast(err.message);
        await loadData();
    }
}

async function deleteDonation(id) {
    if (!confirm("Delete this donation entry?")) return;
    try {
        await api("/donations/" + id, "DELETE");
        addNotification("A donation entry was removed by admin.");
        await loadData();
    } catch (err) {
        showToast(err.message);
    }
}

async function toggleVerify(id) {
    try {
        let n = await api("/ngos/" + id + "/verify", "PATCH");
        addNotification(n.name + (n.verified ? " was verified." : " was unverified."));
        await loadData();
    } catch (err) {
        showToast(err.message);
    }
}

// ---------- expiry / freshness helpers ----------
function daysUntil(dateStr) {
    let today = new Date(new Date().toDateString());
    let target = new Date(dateStr);
    let diffMs = target - today;
    return Math.round(diffMs / 86400000);
}

function getFreshness(dateStr) {
    let days = daysUntil(dateStr);
    let pct, color, label;

    if (days < 0) {
        pct = 0; color = "#B33F3F"; label = "Expired";
    } else if (days === 0) {
        pct = 15; color = "#B33F3F"; label = "Expires today";
    } else if (days === 1) {
        pct = 45; color = "#D9A441"; label = "1 day left";
    } else if (days <= 3) {
        pct = 70; color = "#D9A441"; label = days + " days left";
    } else {
        pct = 100; color = "#8FA787"; label = days + " days left";
    }
    return { pct: pct, color: color, label: label };
}

// ---------- build one donation card as HTML text ----------
function buildDonationCard(d, showClaim, showVolunteerActions, showDelete) {
    let fresh = getFreshness(d.expiryDate);
    let statusClass = "status-" + d.status.replace(" ", "-");
    let id = d._id; // MongoDB ids are strings, so they go in quotes inside onclick

    let html = "";
    html += "<div class='donation-card'>";
    html += "  <div class='dc-top'>";
    html += "    <div>";
    html += "      <div class='dc-food'>" + escapeHtml(d.foodType) + "</div>";
    html += "      <div class='dc-meta'>" + d.quantity + " " + escapeHtml(d.unit) + " · from " + escapeHtml(d.donorName) + "</div>";
    html += "      <div class='dc-meta'>📍 " + escapeHtml(d.pickupLocation) + (d.pickupTime ? " · ⏰ " + escapeHtml(d.pickupTime) : "") + "</div>";
    html += "    </div>";
    html += "    <span class='status-pill " + statusClass + "'>" + d.status + "</span>";
    html += "  </div>";

    if (d.image) {
        html += "  <img class='dc-image' src='" + escapeHtml(d.image) + "' alt='Photo of " + escapeHtml(d.foodType) + "' />";
    }

    html += "  <div class='freshness'>";
    html += "    <div class='freshness-track'><div class='freshness-fill' style='width:" + fresh.pct + "%;background:" + fresh.color + "'></div></div>";
    html += "    <div class='freshness-label'><span>" + fresh.label + "</span><span>use by " + escapeHtml(d.expiryDate) + "</span></div>";
    html += "  </div>";

    if (d.claimedBy) {
        html += "  <p class='dc-meta'>Claimed by <strong>" + escapeHtml(d.claimedBy) + "</strong> · code <span class='pickup-code'>" + escapeHtml(d.pickupCode) + "</span></p>";
    }

    html += "  <div class='dc-actions'>";
    if (showClaim) {
        html += "<button class='btn primary small' onclick=\"claimDonation('" + id + "')\">Claim</button>";
    }
    if (showVolunteerActions && d.status === "Claimed") {
        html += "<button class='btn primary small' onclick=\"markPickedUp('" + id + "')\">Mark picked up</button>";
    }
    if (showVolunteerActions && d.status === "Picked Up") {
        html += "<button class='btn primary small' onclick=\"markDelivered('" + id + "')\">Mark delivered</button>";
    }
    if (showDelete) {
        html += "<button class='btn warn small' onclick=\"deleteDonation('" + id + "')\">Delete</button>";
    }
    html += "  </div>";
    html += "</div>";

    return html;
}

// ---------- donor panel ----------
function renderDonorPanel() {
    if (donations.length === 0) {
        donorList.innerHTML = "<div class='empty-state'>Nothing here yet.</div>";
        return;
    }
    let html = "";
    donations.forEach(function (d) {
        html += buildDonationCard(d, false, false, false);
    });
    donorList.innerHTML = html;
}

// ---------- ngo panel (filtering + sorting is now done by the API) ----------
function renderNgoPanel() {
    if (donations.length === 0) {
        ngoList.innerHTML = "<div class='empty-state'>Nothing here yet.</div>";
        return;
    }
    let html = "";
    donations.forEach(function (d) {
        html += buildDonationCard(d, currentUser.role === "ngo", false, false);
    });
    ngoList.innerHTML = html;
}

// ---------- volunteer panel ----------
function renderVolunteerPanel() {
    if (donations.length === 0) {
        volunteerList.innerHTML = "<div class='empty-state'>Nothing here yet.</div>";
        return;
    }
    let html = "";
    donations.forEach(function (d) {
        html += buildDonationCard(d, false, true, false);
    });
    volunteerList.innerHTML = html;
}

// ---------- admin panel ----------
function renderAdminPanel() {
    if (ngos.length === 0) {
        ngoTable.innerHTML = "<div class='empty-state'>No NGOs registered.</div>";
    } else {
        let html = "";
        ngos.forEach(function (n) {
            let cls = n.verified ? "yes" : "no";
            let label = n.verified ? "Verified ✓" : "Unverified";
            html += "<div class='ngo-row'>";
            html += "<span>" + escapeHtml(n.name) + "</span>";
            html += "<button class='verify-toggle " + cls + "' onclick=\"toggleVerify('" + n._id + "')\">" + label + "</button>";
            html += "</div>";
        });
        ngoTable.innerHTML = html;
    }

    if (donations.length === 0) {
        adminLog.innerHTML = "<div class='empty-state'>Nothing here yet.</div>";
    } else {
        let html2 = "";
        donations.forEach(function (d) {
            html2 += buildDonationCard(d, false, false, true);
        });
        adminLog.innerHTML = html2;
    }
}

// ---------- dashboard panel (numbers come from /api/stats) ----------
function renderDashboard() {
    if (!stats) return;

    let statuses = ["Available", "Claimed", "Picked Up", "Delivered"];
    let barsHtml = "";
    statuses.forEach(function (s) {
        let count = stats.counts[s] || 0;
        let pct = stats.totalDonations === 0 ? 0 : Math.round((count / stats.totalDonations) * 100);
        barsHtml += "<div class='bar-row'>";
        barsHtml += "<div class='bar-label'><span>" + s + "</span><span>" + count + "</span></div>";
        barsHtml += "<div class='bar-track'><div class='bar-fill' style='width:" + pct + "%'></div></div>";
        barsHtml += "</div>";
    });
    statusBars.innerHTML = barsHtml;

    let topHtml = "";
    stats.topDonors.forEach(function (row) {
        topHtml += "<li>" + escapeHtml(row.name) + " — <strong>" + row.units + "</strong> units</li>";
    });
    topDonors.innerHTML = topHtml === "" ? "<li>No donations yet.</li>" : topHtml;

    if (stats.expiringSoon.length === 0) {
        expiryWatch.innerHTML = "<div class='empty-state'>Nothing here yet.</div>";
    } else {
        let soonHtml = "";
        stats.expiringSoon.forEach(function (d) {
            soonHtml += buildDonationCard(d, false, false, false);
        });
        expiryWatch.innerHTML = soonHtml;
    }
}

// ---------- hero stats ----------
function renderHeroStats() {
    if (!stats) return;
    statMeals.innerText = stats.totalUnits;
    statActive.innerText = stats.activeCount;
    statNgo.innerText = stats.verifiedNgos;
}

// ---------- fetch a quote from a public API (falls back if offline / API is down) ----------
fetch("https://api.quotable.io/random?tags=inspirational")
    .then(function (response) {
        return response.json();
    })
    .then(function (data) {
        quoteBox.innerText = "“" + data.content + "” — " + data.author;
    })
    .catch(function (error) {
        console.log(error);
        quoteBox.innerText = "“The smallest act of kindness is worth more than the grandest intention.”";
    });

// ---------- start up ----------
document.getElementById("expiryDate").min = new Date().toISOString().split("T")[0];

async function restoreSession() {
    if (!token) return; // not logged in - login screen stays visible
    try {
        let data = await api("/auth/me");
        currentUser = data.user;
        showApp();
    } catch (err) {
        clearSession();
    }
}

restoreSession();
