"""Admin Panel - HubSpot-style enterprise admin dashboard served as HTML from FastAPI"""
from fastapi import APIRouter
from fastapi.responses import HTMLResponse

admin_panel_router = APIRouter()

ADMIN_HTML = """<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>BO Admin Portal</title>
<link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
<link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" rel="stylesheet">
<style>
:root{--bo-green:#26B50F;--bo-dark:#1E8F0C;--sidebar-w:260px}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc;color:#1a202c}
.sidebar{width:var(--sidebar-w);background:#1a202c;min-height:100vh;position:fixed;top:0;left:0;z-index:50;transition:transform .3s}
.sidebar-header{padding:24px 20px;border-bottom:1px solid #2d3748}
.sidebar-logo{color:#fff;font-size:22px;font-weight:900;display:flex;align-items:center;gap:10px}
.sidebar-logo span{background:var(--bo-green);width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:14px}
.nav-section{padding:12px 0}
.nav-label{color:#718096;font-size:11px;font-weight:600;letter-spacing:1.5px;padding:8px 20px;text-transform:uppercase}
.nav-item{display:flex;align-items:center;gap:12px;padding:10px 20px;color:#a0aec0;cursor:pointer;transition:all .15s;font-size:14px;font-weight:500;border-left:3px solid transparent}
.nav-item:hover,.nav-item.active{background:#2d3748;color:#fff;border-left-color:var(--bo-green)}
.nav-item i{width:20px;text-align:center;font-size:15px}
.main{margin-left:var(--sidebar-w);padding:0}
.topbar{background:#fff;border-bottom:1px solid #e2e8f0;padding:16px 32px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:40}
.topbar-title{font-size:20px;font-weight:700}
.topbar-user{display:flex;align-items:center;gap:12px}
.topbar-avatar{width:36px;height:36px;border-radius:50%;background:var(--bo-green);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px}
.content{padding:32px}
.page{display:none}.page.active{display:block}
.stat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:20px;margin-bottom:32px}
.stat-card{background:#fff;border-radius:12px;padding:24px;border:1px solid #e2e8f0;transition:box-shadow .2s}
.stat-card:hover{box-shadow:0 4px 12px rgba(0,0,0,.08)}
.stat-label{font-size:13px;color:#718096;font-weight:500;margin-bottom:4px}
.stat-value{font-size:28px;font-weight:800;color:#1a202c}
.stat-icon{width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:18px;margin-bottom:12px}
.card{background:#fff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden}
.card-header{padding:20px 24px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between}
.card-title{font-size:16px;font-weight:700}
table{width:100%;border-collapse:collapse}
th{text-align:left;padding:12px 24px;font-size:12px;font-weight:600;color:#718096;text-transform:uppercase;letter-spacing:.5px;background:#f7fafc;border-bottom:1px solid #e2e8f0}
td{padding:14px 24px;border-bottom:1px solid #f0f0f0;font-size:14px}
tr:hover td{background:#f7fafc}
.badge{display:inline-block;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:600}
.badge-green{background:#c6f6d5;color:#22543d}.badge-blue{background:#bee3f8;color:#2a4365}
.badge-red{background:#fed7d7;color:#742a2a}.badge-yellow{background:#fefcbf;color:#744210}
.badge-gray{background:#edf2f7;color:#4a5568}.badge-purple{background:#e9d8fd;color:#44337a}
.btn{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;border:none;transition:all .15s}
.btn-primary{background:var(--bo-green);color:#fff}.btn-primary:hover{background:var(--bo-dark)}
.btn-outline{background:#fff;border:1px solid #e2e8f0;color:#4a5568}.btn-outline:hover{background:#f7fafc}
.btn-danger{background:#fff;border:1px solid #fed7d7;color:#e53e3e}.btn-danger:hover{background:#fff5f5}
.btn-sm{padding:6px 12px;font-size:12px}
.search-box{display:flex;align-items:center;background:#f7fafc;border:1px solid #e2e8f0;border-radius:8px;padding:0 12px;width:280px}
.search-box input{border:none;background:none;padding:10px 8px;width:100%;font-size:14px;outline:none}
.search-box i{color:#a0aec0}
.form-group{margin-bottom:16px}
.form-label{display:block;font-size:13px;font-weight:600;color:#4a5568;margin-bottom:6px}
.form-input{width:100%;padding:10px 14px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;outline:none;transition:border .15s}
.form-input:focus{border-color:var(--bo-green)}
.form-select{width:100%;padding:10px 14px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;outline:none;background:#fff}
.modal-backdrop{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.5);z-index:100;display:none;align-items:center;justify-content:center}
.modal-backdrop.show{display:flex}
.modal{background:#fff;border-radius:16px;width:100%;max-width:560px;max-height:90vh;overflow-y:auto;box-shadow:0 25px 50px rgba(0,0,0,.15)}
.modal-header{padding:20px 24px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between}
.modal-body{padding:24px}
.modal-footer{padding:16px 24px;border-top:1px solid #e2e8f0;display:flex;gap:8px;justify-content:flex-end}
.delete-modal .modal{max-width:420px;text-align:center}
.delete-icon{width:56px;height:56px;border-radius:50%;background:#fff5f5;color:#e53e3e;display:flex;align-items:center;justify-content:center;font-size:24px;margin:0 auto 16px}
.login-page{min-height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#f0fff4,#f7fafc)}
.login-card{background:#fff;border-radius:16px;padding:48px 40px;width:100%;max-width:420px;box-shadow:0 25px 50px rgba(0,0,0,.08)}
.login-logo{text-align:center;margin-bottom:32px}
.login-logo .icon{width:60px;height:60px;border-radius:16px;background:var(--bo-green);color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:22px;font-weight:900;margin-bottom:12px}
.otp-input{display:flex;gap:8px;justify-content:center;margin:24px 0}
.otp-input input{width:48px;height:56px;text-align:center;font-size:24px;font-weight:700;border:2px solid #e2e8f0;border-radius:12px;outline:none}
.otp-input input:focus{border-color:var(--bo-green)}
.toast{position:fixed;top:24px;right:24px;background:#fff;border-radius:12px;padding:16px 20px;box-shadow:0 10px 25px rgba(0,0,0,.1);display:flex;align-items:center;gap:12px;z-index:200;transform:translateX(120%);transition:transform .3s}
.toast.show{transform:translateX(0)}
.toast-success{border-left:4px solid var(--bo-green)}.toast-error{border-left:4px solid #e53e3e}
</style></head>
<body>
<div id="app">
<!-- LOGIN PAGE -->
<div id="loginPage" class="login-page">
<div class="login-card">
<div class="login-logo"><div class="icon">BO</div><h2 style="font-size:22px;font-weight:800">Admin Portal</h2><p style="color:#718096;font-size:14px;margin-top:4px">NIST 800-63B Compliant Authentication</p></div>
<div id="loginStep1">
<div class="form-group"><label class="form-label">Admin Email</label><input id="adminEmail" class="form-input" type="email" placeholder="admin@bo.com" value="admin@bo.com"></div>
<div class="form-group"><label class="form-label">Password</label><input id="adminPw" class="form-input" type="password" placeholder="Enter password" value="BoAdmin2026!"></div>
<div id="loginError" style="color:#e53e3e;font-size:13px;margin-bottom:12px;display:none"></div>
<button class="btn btn-primary" style="width:100%;padding:14px;font-size:15px" onclick="adminLogin()"><i class="fas fa-shield-alt"></i> Authenticate</button>
<p style="text-align:center;color:#a0aec0;font-size:12px;margin-top:16px"><i class="fas fa-lock"></i> HIPAA & CMMC Compliant · AES-256 Encrypted</p>
</div>
<div id="loginStep2" style="display:none">
<div style="text-align:center;margin-bottom:8px"><i class="fas fa-envelope" style="font-size:32px;color:var(--bo-green)"></i></div>
<h3 style="text-align:center;font-size:18px;font-weight:700;margin-bottom:4px">Two-Factor Verification</h3>
<p style="text-align:center;color:#718096;font-size:13px">Enter the 6-digit code sent to your email</p>
<div class="otp-input" id="otpInputs"><input maxlength="1" autofocus><input maxlength="1"><input maxlength="1"><input maxlength="1"><input maxlength="1"><input maxlength="1"></div>
<div id="otpError" style="color:#e53e3e;font-size:13px;text-align:center;display:none"></div>
<p id="demoCode" style="text-align:center;background:#f0fff4;padding:8px;border-radius:8px;font-size:13px;color:#22543d;margin-top:8px"></p>
<button class="btn btn-primary" style="width:100%;padding:14px;font-size:15px;margin-top:16px" onclick="verify2FA()"><i class="fas fa-check-circle"></i> Verify & Login</button>
<p style="text-align:center;margin-top:12px"><a href="#" onclick="adminLogin();return false" style="color:var(--bo-green);font-size:13px">Resend Code</a></p>
</div>
</div></div>

<!-- DASHBOARD -->
<div id="dashboardPage" style="display:none">
<div class="sidebar">
<div class="sidebar-header"><div class="sidebar-logo"><span>BO</span>Admin Portal</div></div>
<div class="nav-section">
<div class="nav-label">Overview</div>
<div class="nav-item active" onclick="showPage('dashboard')"><i class="fas fa-chart-line"></i>Dashboard</div>
</div>
<div class="nav-section">
<div class="nav-label">Management</div>
<div class="nav-item" onclick="showPage('users')"><i class="fas fa-users"></i>Users</div>
<div class="nav-item" onclick="showPage('restaurants')"><i class="fas fa-utensils"></i>Restaurants</div>
<div class="nav-item" onclick="showPage('distributors')"><i class="fas fa-truck"></i>Distributors</div>
</div>
<div class="nav-section">
<div class="nav-label">Content</div>
<div class="nav-item" onclick="showPage('meals')"><i class="fas fa-hamburger"></i>Manage Meals</div>
<div class="nav-item" onclick="showPage('quotes')"><i class="fas fa-quote-left"></i>Daily Quotes</div>
<div class="nav-item" onclick="showPage('posts')"><i class="fas fa-bullhorn"></i>My Posts</div>
<div class="nav-item" onclick="showPage('plans')"><i class="fas fa-crown"></i>Subscription Plans</div>
</div>
<div class="nav-section">
<div class="nav-label">Support</div>
<div class="nav-item" onclick="showPage('tickets')"><i class="fas fa-ticket-alt"></i>Tickets</div>
</div>
<div class="nav-section" style="position:absolute;bottom:0;left:0;right:0;border-top:1px solid #2d3748">
<div class="nav-item" onclick="logout()"><i class="fas fa-sign-out-alt"></i>Logout</div>
</div>
</div>
<div class="main">
<div class="topbar">
<div class="topbar-title" id="pageTitle">Dashboard</div>
<div class="topbar-user"><span id="adminName" style="font-size:14px;color:#718096"></span><div class="topbar-avatar" id="adminAvatar">A</div></div>
</div>
<div class="content">
<!-- DASHBOARD PAGE -->
<div class="page active" id="page-dashboard">
<div class="stat-grid" id="statsGrid"></div>
<div style="display:grid;grid-template-columns:2fr 1fr;gap:20px">
<div class="card"><div class="card-header"><span class="card-title">User Growth (7 days)</span></div><div style="padding:24px"><canvas id="growthChart" height="200"></canvas></div></div>
<div class="card"><div class="card-header"><span class="card-title">Top Restaurants</span></div><div id="topRestaurants" style="padding:0"></div></div>
</div></div>
<!-- USERS PAGE -->
<div class="page" id="page-users">
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
<div class="search-box"><i class="fas fa-search"></i><input placeholder="Search users..." oninput="searchUsers(this.value)"></div>
</div>
<div class="card"><table><thead><tr><th>User</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th></tr></thead><tbody id="usersBody"></tbody></table></div></div>
<!-- RESTAURANTS PAGE -->
<div class="page" id="page-restaurants">
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
<div class="search-box"><i class="fas fa-search"></i><input placeholder="Search restaurants..." oninput="searchRestaurants(this.value)"></div>
<button class="btn btn-primary" onclick="openRestModal()"><i class="fas fa-plus"></i> Add Restaurant</button>
</div>
<div class="card"><table><thead><tr><th>Restaurant</th><th>Cuisine</th><th>Rating</th><th>Status</th><th style="width:120px">Actions</th></tr></thead><tbody id="restBody"></tbody></table></div></div>
<!-- DISTRIBUTORS PAGE -->
<div class="page" id="page-distributors">
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
<div class="search-box"><i class="fas fa-search"></i><input placeholder="Search distributors..." oninput="searchDistributors(this.value)"></div>
<button class="btn btn-primary" onclick="openDistModal()"><i class="fas fa-plus"></i> Add Distributor</button>
</div>
<div class="card"><table><thead><tr><th>Name</th><th>Company</th><th>Plan</th><th>Region</th><th>Status</th><th style="width:120px">Actions</th></tr></thead><tbody id="distBody"></tbody></table></div></div>
<!-- TICKETS PAGE -->
<div class="page" id="page-tickets">
<div style="margin-bottom:20px"><div class="search-box"><i class="fas fa-search"></i><input placeholder="Search tickets..."></div></div>
<div class="card" id="ticketsCard"><div style="padding:40px;text-align:center;color:#a0aec0"><i class="fas fa-ticket-alt" style="font-size:40px;margin-bottom:12px"></i><p>Tickets are managed per-user. View user details to see their tickets.</p></div></div></div>
<!-- MEALS PAGE -->
<div class="page" id="page-meals">
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:12px">
<div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
<div class="search-box"><i class="fas fa-search"></i><input placeholder="Search meals..." oninput="searchMeals(this.value)"></div>
<select class="form-select" style="width:150px" onchange="filterMeals()" id="mealCatFilter"><option value="">All Categories</option></select>
<select class="form-select" style="width:130px" onchange="filterMeals()" id="mealTypeFilter"><option value="">All Types</option><option>Breakfast</option><option>Lunch</option><option>Dinner</option><option>Snack</option><option>All-Day</option></select>
<select class="form-select" style="width:120px" onchange="filterMeals()" id="mealSourceFilter"><option value="">All Sources</option><option value="admin">Admin</option><option value="user">User</option></select>
</div>
<button class="btn btn-primary" onclick="openMealModal()"><i class="fas fa-plus"></i> Add New Meal</button>
</div>
<div class="card"><table><thead><tr><th>Meal</th><th>Category</th><th>Type</th><th>Calories</th><th>Source</th><th>Status</th><th style="width:150px">Actions</th></tr></thead><tbody id="mealsBody"></tbody></table></div></div>
<!-- QUOTES PAGE -->
<div class="page" id="page-quotes">
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
<div class="search-box"><i class="fas fa-search"></i><input placeholder="Search quotes..." oninput="searchQuotes(this.value)"></div>
<button class="btn btn-primary" onclick="openQuoteModal()"><i class="fas fa-plus"></i> Add New Quote</button>
</div>
<div class="card"><table><thead><tr><th style="width:50%">Quote</th><th>Publishing Date</th><th>Selected</th><th style="width:120px">Actions</th></tr></thead><tbody id="quotesBody"></tbody></table></div></div>
<!-- POSTS PAGE -->
<div class="page" id="page-posts">
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
<div class="search-box"><i class="fas fa-search"></i><input placeholder="Search posts..." oninput="searchPosts(this.value)"></div>
<button class="btn btn-primary" onclick="openPostModal()"><i class="fas fa-plus"></i> Add Your Post</button>
</div>
<div class="card"><table><thead><tr><th>Image</th><th style="width:45%">Description</th><th>Published</th><th>Likes</th><th style="width:120px">Actions</th></tr></thead><tbody id="postsBody"></tbody></table></div></div>
<!-- PLANS PAGE -->
<div class="page" id="page-plans">
<div id="plansSummary" style="margin-bottom:20px"></div>
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
<h3 style="font-size:16px;font-weight:700">All Plans</h3>
<button class="btn btn-primary" onclick="openPlanModal()"><i class="fas fa-plus"></i> Add New Plan</button>
</div>
<div id="plansGrid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:20px"></div>
</div>
</div></div></div>
</div>

<!-- MODALS -->
<div class="modal-backdrop" id="restModal"><div class="modal">
<div class="modal-header"><h3 id="restModalTitle">Add Restaurant</h3><button class="btn btn-outline btn-sm" onclick="closeModal('restModal')"><i class="fas fa-times"></i></button></div>
<div class="modal-body">
<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
<div class="form-group"><label class="form-label">Name *</label><input id="restName" class="form-input" placeholder="Restaurant name"></div>
<div class="form-group"><label class="form-label">Cuisine</label><input id="restCuisine" class="form-input" placeholder="e.g. Italian"></div>
<div class="form-group"><label class="form-label">Address</label><input id="restAddress" class="form-input" placeholder="Full address"></div>
<div class="form-group"><label class="form-label">Phone</label><input id="restPhone" class="form-input" placeholder="+1-555-0100"></div>
<div class="form-group"><label class="form-label">Rating</label><input id="restRating" class="form-input" type="number" step="0.1" min="0" max="5" placeholder="4.5"></div>
<div class="form-group"><label class="form-label">Price Level</label><select id="restPrice" class="form-select"><option value="1">$ Budget</option><option value="2">$$ Moderate</option><option value="3">$$$ Upscale</option></select></div>
</div>
<div class="form-group"><label class="form-label">Description</label><textarea id="restDesc" class="form-input" rows="2" placeholder="Brief description"></textarea></div>
<div style="display:flex;gap:16px"><label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" id="restVerified"> BO Verified</label><label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" id="restPartner"> BO Partner</label></div>
</div>
<div class="modal-footer"><button class="btn btn-outline" onclick="closeModal('restModal')">Cancel</button><button class="btn btn-primary" onclick="saveRestaurant()"><i class="fas fa-save"></i> Save</button></div>
</div></div>

<div class="modal-backdrop" id="distModal"><div class="modal">
<div class="modal-header"><h3 id="distModalTitle">Add Distributor</h3><button class="btn btn-outline btn-sm" onclick="closeModal('distModal')"><i class="fas fa-times"></i></button></div>
<div class="modal-body">
<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
<div class="form-group"><label class="form-label">Name *</label><input id="distName" class="form-input" placeholder="Distributor name"></div>
<div class="form-group"><label class="form-label">Contact Person</label><input id="distContact" class="form-input" placeholder="Full name"></div>
<div class="form-group"><label class="form-label">Email</label><input id="distEmail" class="form-input" type="email" placeholder="email@example.com"></div>
<div class="form-group"><label class="form-label">Phone</label><input id="distPhone" class="form-input" placeholder="+1-555-0100"></div>
<div class="form-group"><label class="form-label">Company</label><input id="distCompany" class="form-input" placeholder="Company name"></div>
<div class="form-group"><label class="form-label">Region</label><input id="distRegion" class="form-input" placeholder="e.g. Southeast"></div>
<div class="form-group"><label class="form-label">Plan</label><select id="distPlan" class="form-select"><option value="basic">Basic</option><option value="pro">Pro</option><option value="premium">Premium</option></select></div>
<div class="form-group"><label class="form-label">Status</label><select id="distStatus" class="form-select"><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
</div>
<div class="form-group"><label class="form-label">Notes</label><textarea id="distNotes" class="form-input" rows="2" placeholder="Additional notes"></textarea></div>
</div>
<div class="modal-footer"><button class="btn btn-outline" onclick="closeModal('distModal')">Cancel</button><button class="btn btn-primary" onclick="saveDistributor()"><i class="fas fa-save"></i> Save</button></div>
</div></div>

<div class="modal-backdrop delete-modal" id="deleteModal"><div class="modal">
<div class="modal-body" style="padding:32px">
<div class="delete-icon"><i class="fas fa-exclamation-triangle"></i></div>
<h3 style="font-size:18px;font-weight:700;margin-bottom:8px">Confirm Deletion</h3>
<p id="deleteMsg" style="color:#718096;font-size:14px;margin-bottom:24px">Are you sure you want to delete this item? This action cannot be undone.</p>
<div style="display:flex;gap:8px;justify-content:center">
<button class="btn btn-outline" onclick="closeModal('deleteModal')">Cancel</button>
<button class="btn" style="background:#e53e3e;color:#fff" onclick="confirmDelete()"><i class="fas fa-trash"></i> Delete Permanently</button>
</div></div></div></div>

<div class="toast" id="toast"><i class="fas fa-check-circle" style="color:var(--bo-green)"></i><span id="toastMsg"></span></div>

<!-- MEAL MODAL -->
<div class="modal-backdrop" id="mealModal"><div class="modal" style="max-width:700px">
<div class="modal-header"><h3 id="mealModalTitle">Add New Meal</h3><button class="btn btn-outline btn-sm" onclick="closeModal('mealModal')"><i class="fas fa-times"></i></button></div>
<div class="modal-body">
<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
<div class="form-group" style="grid-column:span 2"><label class="form-label">Meal Title *</label><input id="mealTitle" class="form-input" maxlength="200" placeholder="e.g. Acai Power Bowl"></div>
<div class="form-group" style="grid-column:span 2"><label class="form-label">About</label><textarea id="mealAbout" class="form-input" rows="2" maxlength="500" placeholder="Brief description"></textarea></div>
<div class="form-group"><label class="form-label">Category</label><select id="mealCategory" class="form-select"></select></div>
<div class="form-group"><label class="form-label">Menu Type</label><select id="mealMenuType" class="form-select"><option>Breakfast</option><option>Lunch</option><option>Dinner</option><option>Snack</option><option selected>All-Day</option></select></div>
<div class="form-group"><label class="form-label">Calories *</label><input id="mealCalories" class="form-input" type="number" placeholder="380"></div>
<div class="form-group"><label class="form-label">Proteins (g)</label><input id="mealProteins" class="form-input" type="number" step="0.1" placeholder="8"></div>
<div class="form-group"><label class="form-label">Fat (g)</label><input id="mealFat" class="form-input" type="number" step="0.1" placeholder="12"></div>
<div class="form-group"><label class="form-label">Carbs (g)</label><input id="mealCarbs" class="form-input" type="number" step="0.1" placeholder="Auto-calculated"></div>
<div class="form-group"><label class="form-label">Servings</label><input id="mealServings" class="form-input" type="number" value="1" min="1"></div>
<div class="form-group"><label class="form-label">Image URL</label><input id="mealImage" class="form-input" placeholder="https://..."></div>
<div class="form-group" style="grid-column:span 2"><label class="form-label">Video URL</label><input id="mealVideo" class="form-input" placeholder="YouTube/Vimeo URL (optional)"></div>
</div>
<div class="form-group"><label class="form-label">Ingredients</label><div id="ingredientsList"></div><button class="btn btn-outline btn-sm" onclick="addIngredientRow()" style="margin-top:8px"><i class="fas fa-plus"></i> Add Ingredient</button></div>
<div class="form-group"><label class="form-label">Directions</label><div id="directionsList"></div><button class="btn btn-outline btn-sm" onclick="addDirectionRow()" style="margin-top:8px"><i class="fas fa-plus"></i> Add Step</button></div>
<div class="form-group"><label class="form-label">Notes</label><textarea id="mealNotes" class="form-input" rows="2" placeholder="Optional notes"></textarea></div>
</div>
<div class="modal-footer"><button class="btn btn-outline" onclick="closeModal('mealModal')">Cancel</button><button class="btn btn-primary" onclick="saveMeal()"><i class="fas fa-save"></i> Save Meal</button></div>
</div></div>

<!-- QUOTE MODAL -->
<div class="modal-backdrop" id="quoteModal"><div class="modal" style="max-width:500px">
<div class="modal-header"><h3 id="quoteModalTitle">Add New Quote</h3><button class="btn btn-outline btn-sm" onclick="closeModal('quoteModal')"><i class="fas fa-times"></i></button></div>
<div class="modal-body">
<div class="form-group"><label class="form-label">Quote Text *</label><textarea id="quoteText" class="form-input" rows="4" maxlength="500" placeholder="Enter wellness quote..."></textarea></div>
<div class="form-group"><label class="form-label">Publishing Date *</label><input id="quoteDate" class="form-input" type="date"></div>
</div>
<div class="modal-footer"><button class="btn btn-outline" onclick="closeModal('quoteModal')">Cancel</button><button class="btn btn-primary" onclick="saveQuote()"><i class="fas fa-save"></i> Save Quote</button></div>
</div></div>

<!-- POST MODAL -->
<div class="modal-backdrop" id="postModal"><div class="modal" style="max-width:560px">
<div class="modal-header"><h3 id="postModalTitle">Add Your Post</h3><button class="btn btn-outline btn-sm" onclick="closeModal('postModal')"><i class="fas fa-times"></i></button></div>
<div class="modal-body">
<div class="form-group"><label class="form-label">Image URL *</label><input id="postImage" class="form-input" placeholder="https://..."></div>
<div id="postImagePreview" style="margin-bottom:16px;display:none"><img id="postPreviewImg" style="width:100%;max-height:200px;object-fit:cover;border-radius:8px"></div>
<div class="form-group"><label class="form-label">Description *</label><textarea id="postDesc" class="form-input" rows="4" maxlength="2000" placeholder="Enter post content..."></textarea></div>
<label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-top:8px"><input type="checkbox" id="postNotify"> <span style="font-size:13px">Send Push Notification to all users</span></label>
</div>
<div class="modal-footer"><button class="btn btn-outline" onclick="closeModal('postModal')">Cancel</button><button class="btn btn-primary" onclick="savePost()"><i class="fas fa-save"></i> Publish</button></div>
</div></div>

<!-- PLAN MODAL -->
<div class="modal-backdrop" id="planModal"><div class="modal" style="max-width:600px">
<div class="modal-header"><h3 id="planModalTitle">Add New Plan</h3><button class="btn btn-outline btn-sm" onclick="closeModal('planModal')"><i class="fas fa-times"></i></button></div>
<div class="modal-body">
<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
<div class="form-group" style="grid-column:span 2"><label class="form-label">Plan Title *</label><input id="planTitle" class="form-input" maxlength="100" placeholder="e.g. Pro Monthly"></div>
<div class="form-group" style="grid-column:span 2"><label class="form-label">Description</label><textarea id="planDescription" class="form-input" rows="2" maxlength="500" placeholder="Plan description"></textarea></div>
<div class="form-group"><label class="form-label">Charge Type</label><select id="planChargeType" class="form-select" onchange="togglePlanPrice()"><option value="Free">Free</option><option value="Paid">Paid</option></select></div>
<div class="form-group" id="planBillingGroup"><label class="form-label">Billing Period</label><select id="planBilling" class="form-select"><option>Monthly</option><option>Annual</option><option>Lifetime</option></select></div>
<div class="form-group" id="planAmountGroup"><label class="form-label">Amount (cents)</label><input id="planAmount" class="form-input" type="number" placeholder="999 = $9.99"></div>
<div class="form-group"><label class="form-label">Status</label><select id="planStatus" class="form-select"><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
</div>
<div class="form-group"><label class="form-label">Plan Benefits</label><div id="benefitsList"></div><button class="btn btn-outline btn-sm" onclick="addBenefitRow()" style="margin-top:8px"><i class="fas fa-plus"></i> Add Benefit</button></div>
<p style="font-size:12px;color:#d69e2e;margin-top:8px"><i class="fas fa-info-circle"></i> Price changes will not affect existing subscribers.</p>
</div>
<div class="modal-footer"><button class="btn btn-outline" onclick="closeModal('planModal')">Cancel</button><button class="btn btn-primary" onclick="savePlan()"><i class="fas fa-save"></i> Save Plan</button></div>
</div></div>

<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<script>
const API=window.location.origin+'/api';
let adminToken='',preToken='',editingRestId=null,editingDistId=null,deleteType='',deleteId='';
let editingMealId=null,editingQuoteId=null,editingPostId=null,editingPlanId=null,mealCategories=[];

function showToast(msg,type='success'){const t=document.getElementById('toast');t.className='toast toast-'+type+' show';document.getElementById('toastMsg').textContent=msg;setTimeout(()=>t.classList.remove('show'),3000)}

async function adminLogin(){
  const email=document.getElementById('adminEmail').value,pw=document.getElementById('adminPw').value;
  try{const r=await fetch(API+'/v1/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password:pw})});
  const d=await r.json();if(!r.ok){document.getElementById('loginError').style.display='block';document.getElementById('loginError').textContent=d.detail;return}
  preToken=d.pre_token;document.getElementById('loginStep1').style.display='none';document.getElementById('loginStep2').style.display='block';
  document.getElementById('demoCode').innerHTML='<i class="fas fa-info-circle"></i> Demo code: <strong>'+d._demo_code+'</strong>';
  document.getElementById('loginError').style.display='none';
  const inputs=document.querySelectorAll('.otp-input input');inputs.forEach((inp,i)=>{inp.value='';inp.addEventListener('input',e=>{if(e.target.value&&i<5)inputs[i+1].focus()});inp.addEventListener('keydown',e=>{if(e.key==='Backspace'&&!e.target.value&&i>0)inputs[i-1].focus()})});inputs[0].focus();
  }catch(e){document.getElementById('loginError').style.display='block';document.getElementById('loginError').textContent='Connection error'}
}

async function verify2FA(){
  const code=Array.from(document.querySelectorAll('.otp-input input')).map(i=>i.value).join('');
  if(code.length!==6){document.getElementById('otpError').style.display='block';document.getElementById('otpError').textContent='Enter all 6 digits';return}
  try{const r=await fetch(API+'/v1/admin/verify-2fa',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+preToken},body:JSON.stringify({code})});
  const d=await r.json();if(!r.ok){document.getElementById('otpError').style.display='block';document.getElementById('otpError').textContent=d.detail;return}
  adminToken=d.admin_token;document.getElementById('loginPage').style.display='none';document.getElementById('dashboardPage').style.display='block';
  document.getElementById('adminName').textContent=d.user.name;document.getElementById('adminAvatar').textContent=d.user.name[0];
  loadDashboard();
  }catch(e){document.getElementById('otpError').style.display='block';document.getElementById('otpError').textContent='Verification failed'}
}

function logout(){adminToken='';document.getElementById('dashboardPage').style.display='none';document.getElementById('loginPage').style.display='block';document.getElementById('loginStep1').style.display='block';document.getElementById('loginStep2').style.display='none'}

function showPage(p){document.querySelectorAll('.page').forEach(el=>el.classList.remove('active'));document.getElementById('page-'+p).classList.add('active');
document.querySelectorAll('.nav-item').forEach(el=>el.classList.remove('active'));event.currentTarget.classList.add('active');
const titles={dashboard:'Dashboard',users:'User Management',restaurants:'Restaurant Management',distributors:'Distributor Management',tickets:'Support Tickets',meals:'Manage Meals',quotes:'Daily Quotes',posts:'My Posts',plans:'Subscription Plans'};
document.getElementById('pageTitle').textContent=titles[p]||p;
if(p==='dashboard')loadDashboard();if(p==='users')loadUsers();if(p==='restaurants')loadRestaurants();if(p==='distributors')loadDistributors();if(p==='meals')loadMeals();if(p==='quotes')loadQuotes();if(p==='posts')loadPosts();if(p==='plans')loadPlans()}

const hdr=()=>({'Authorization':'Bearer '+adminToken,'Content-Type':'application/json'});

async function loadDashboard(){
  try{const r=await fetch(API+'/v1/admin/dashboard',{headers:hdr()});const d=await r.json();
  const s=d.stats,icons=[{k:'totalUsers',l:'Total Users',i:'fa-users',c:'#26B50F',bg:'#f0fff4'},{k:'activeUsers',l:'Active Users',i:'fa-user-check',c:'#3182ce',bg:'#ebf8ff'},{k:'totalRestaurants',l:'Restaurants',i:'fa-utensils',c:'#d69e2e',bg:'#fffff0'},{k:'totalMeals',l:'Total Meals',i:'fa-hamburger',c:'#e53e3e',bg:'#fff5f5'},{k:'proSubscriptions',l:'Pro Subscriptions',i:'fa-crown',c:'#805ad5',bg:'#faf5ff'},{k:'totalPosts',l:'Feed Posts',i:'fa-comments',c:'#38a169',bg:'#f0fff4'},{k:'openTickets',l:'Open Tickets',i:'fa-ticket-alt',c:'#dd6b20',bg:'#fffaf0'},{k:'totalTickets',l:'Total Tickets',i:'fa-headset',c:'#718096',bg:'#f7fafc'}];
  document.getElementById('statsGrid').innerHTML=icons.map(i=>'<div class="stat-card"><div class="stat-icon" style="background:'+i.bg+';color:'+i.c+'"><i class="fas '+i.i+'"></i></div><div class="stat-label">'+i.l+'</div><div class="stat-value">'+(s[i.k]||0)+'</div></div>').join('');
  // Chart
  const ctx=document.getElementById('growthChart');if(ctx&&d.userGrowth){const ch=Chart.getChart(ctx);if(ch)ch.destroy();new Chart(ctx,{type:'bar',data:{labels:d.userGrowth.map(g=>g.date),datasets:[{label:'New Users',data:d.userGrowth.map(g=>g.count),backgroundColor:'rgba(38,181,15,.6)',borderRadius:6}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,ticks:{stepSize:1}}}}})}
  // Top restaurants
  const tr=d.topRestaurants||[];document.getElementById('topRestaurants').innerHTML=tr.length?tr.map((r,i)=>'<div style="display:flex;align-items:center;padding:14px 24px;border-bottom:1px solid #f0f0f0"><span style="width:28px;height:28px;border-radius:50%;background:#f0fff4;color:#26B50F;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;margin-right:12px">'+(i+1)+'</span><div style="flex:1"><div style="font-weight:600;font-size:14px">'+r.name+'</div><div style="font-size:12px;color:#a0aec0">'+r.cuisine+'</div></div><span style="color:#d69e2e;font-weight:700"><i class="fas fa-star" style="font-size:12px"></i> '+r.rating.toFixed(1)+'</span></div>').join(''):'<p style="padding:24px;color:#a0aec0;text-align:center">No restaurants yet</p>';
  }catch(e){console.error(e)}
}

async function loadUsers(search=''){
  try{const r=await fetch(API+'/v1/admin/users?limit=50&search='+encodeURIComponent(search),{headers:hdr()});const d=await r.json();
  document.getElementById('usersBody').innerHTML=(d.data||[]).map(u=>'<tr><td><strong>'+u.name+'</strong></td><td>'+u.email+'</td><td><span class="badge '+(u.role==='admin'?'badge-purple':'badge-blue')+'">'+u.role+'</span></td><td><span class="badge '+(u.status==='active'?'badge-green':'badge-red')+'">'+(u.status||'active')+'</span></td><td>'+(u.createdAt?new Date(u.createdAt).toLocaleDateString():'—')+'</td></tr>').join('')||'<tr><td colspan="5" style="text-align:center;color:#a0aec0;padding:40px">No users found</td></tr>';
  }catch(e){console.error(e)}
}
function searchUsers(v){loadUsers(v)}

async function loadRestaurants(search=''){
  try{const r=await fetch(API+'/v1/admin/restaurants?limit=50&search='+encodeURIComponent(search),{headers:hdr()});const d=await r.json();
  document.getElementById('restBody').innerHTML=(d.data||[]).map(function(r){var sn=r.name.replace(/'/g,"&#39;");return '<tr><td><strong>'+r.name+'</strong></td><td>'+r.cuisine+'</td><td><i class="fas fa-star" style="color:#d69e2e;font-size:12px"></i> '+r.rating.toFixed(1)+'</td><td>'+(r.boVerified?'<span class="badge badge-green">Verified</span> ':'')+(r.boPartner?'<span class="badge badge-blue">Partner</span>':'<span class="badge badge-gray">Standard</span>')+'</td><td><button class="btn btn-outline btn-sm" onclick="editRestaurant(&#39;'+r.id+'&#39;)"><i class="fas fa-edit"></i></button> <button class="btn btn-danger btn-sm" onclick="deleteItem(&#39;restaurant&#39;,&#39;'+r.id+'&#39;,&#39;'+sn+'&#39;)"><i class="fas fa-trash"></i></button></td></tr>'}).join('')||'<tr><td colspan="5" style="text-align:center;color:#a0aec0;padding:40px">No restaurants</td></tr>';
  }catch(e){console.error(e)}
}
function searchRestaurants(v){loadRestaurants(v)}

function openRestModal(id=null){editingRestId=id;document.getElementById('restModalTitle').textContent=id?'Edit Restaurant':'Add Restaurant';
['restName','restCuisine','restAddress','restPhone','restRating','restDesc'].forEach(f=>document.getElementById(f).value='');document.getElementById('restPrice').value='1';document.getElementById('restVerified').checked=false;document.getElementById('restPartner').checked=false;
document.getElementById('restModal').classList.add('show')}
function closeModal(id){document.getElementById(id).classList.remove('show')}

async function editRestaurant(id){
  const r=await fetch(API+'/v1/admin/restaurants?limit=100',{headers:hdr()});const d=await r.json();
  const rest=(d.data||[]).find(x=>x.id===id);if(!rest)return;editingRestId=id;
  document.getElementById('restModalTitle').textContent='Edit Restaurant';
  document.getElementById('restName').value=rest.name;document.getElementById('restCuisine').value=rest.cuisine;document.getElementById('restAddress').value=rest.address||'';
  document.getElementById('restPhone').value=rest.phone||'';document.getElementById('restRating').value=rest.rating||0;document.getElementById('restPrice').value=rest.priceLevel||1;
  document.getElementById('restVerified').checked=rest.boVerified;document.getElementById('restPartner').checked=rest.boPartner;
  document.getElementById('restModal').classList.add('show');
}

async function saveRestaurant(){
  const body={name:document.getElementById('restName').value,cuisine:document.getElementById('restCuisine').value,address:document.getElementById('restAddress').value,phone:document.getElementById('restPhone').value,rating:parseFloat(document.getElementById('restRating').value)||0,price_level:parseInt(document.getElementById('restPrice').value),bo_verified:document.getElementById('restVerified').checked,bo_partner:document.getElementById('restPartner').checked,description:document.getElementById('restDesc').value||'',image_url:''};
  if(!body.name){alert('Name is required');return}
  const url=editingRestId?API+'/v1/admin/restaurants/'+editingRestId:API+'/v1/admin/restaurants';
  const method=editingRestId?'PUT':'POST';
  const r=await fetch(url,{method,headers:hdr(),body:JSON.stringify(body)});
  if(r.ok){closeModal('restModal');loadRestaurants();showToast(editingRestId?'Restaurant updated':'Restaurant created')}else{const d=await r.json();alert(d.detail||'Error')}
}

async function loadDistributors(search=''){
  try{const r=await fetch(API+'/v1/admin/distributors?limit=50&search='+encodeURIComponent(search),{headers:hdr()});const d=await r.json();
  const planBadge=function(p){return p==='premium'?'badge-purple':p==='pro'?'badge-blue':'badge-gray'};
  document.getElementById('distBody').innerHTML=(d.data||[]).map(function(d){var sn=d.name.replace(/'/g,"&#39;");return '<tr><td><strong>'+d.name+'</strong></td><td>'+d.company+'</td><td><span class="badge '+planBadge(d.plan)+'">'+d.plan+'</span></td><td>'+d.region+'</td><td><span class="badge '+(d.status==='active'?'badge-green':'badge-red')+'">'+d.status+'</span></td><td><button class="btn btn-outline btn-sm" onclick="editDistributor(&#39;'+d.id+'&#39;)"><i class="fas fa-edit"></i></button> <button class="btn btn-danger btn-sm" onclick="deleteItem(&#39;distributor&#39;,&#39;'+d.id+'&#39;,&#39;'+sn+'&#39;)"><i class="fas fa-trash"></i></button></td></tr>'}).join('')||'<tr><td colspan="6" style="text-align:center;color:#a0aec0;padding:40px">No distributors</td></tr>';
  }catch(e){console.error(e)}
}
function searchDistributors(v){loadDistributors(v)}

function openDistModal(id=null){editingDistId=id;document.getElementById('distModalTitle').textContent=id?'Edit Distributor':'Add Distributor';
['distName','distContact','distEmail','distPhone','distCompany','distRegion','distNotes'].forEach(f=>document.getElementById(f).value='');document.getElementById('distPlan').value='basic';document.getElementById('distStatus').value='active';
document.getElementById('distModal').classList.add('show')}

async function editDistributor(id){
  const r=await fetch(API+'/v1/admin/distributors?limit=100',{headers:hdr()});const d=await r.json();
  const dist=(d.data||[]).find(x=>x.id===id);if(!dist)return;editingDistId=id;
  document.getElementById('distModalTitle').textContent='Edit Distributor';
  document.getElementById('distName').value=dist.name;document.getElementById('distContact').value=dist.contactPerson;document.getElementById('distEmail').value=dist.email;
  document.getElementById('distPhone').value=dist.phone;document.getElementById('distCompany').value=dist.company;document.getElementById('distRegion').value=dist.region;
  document.getElementById('distPlan').value=dist.plan;document.getElementById('distStatus').value=dist.status;
  document.getElementById('distModal').classList.add('show');
}

async function saveDistributor(){
  const body={name:document.getElementById('distName').value,contact_person:document.getElementById('distContact').value,email:document.getElementById('distEmail').value,phone:document.getElementById('distPhone').value,company:document.getElementById('distCompany').value,region:document.getElementById('distRegion').value,plan:document.getElementById('distPlan').value,status:document.getElementById('distStatus').value,notes:document.getElementById('distNotes').value};
  if(!body.name){alert('Name is required');return}
  const url=editingDistId?API+'/v1/admin/distributors/'+editingDistId:API+'/v1/admin/distributors';
  const method=editingDistId?'PUT':'POST';
  const r=await fetch(url,{method,headers:hdr(),body:JSON.stringify(body)});
  if(r.ok){closeModal('distModal');loadDistributors();showToast(editingDistId?'Distributor updated':'Distributor created')}else{const d=await r.json();alert(d.detail||'Error')}
}

function deleteItem(type,id,name){deleteType=type;deleteId=id;document.getElementById('deleteMsg').textContent='Are you sure you want to delete "'+name+'"? This action cannot be undone.';document.getElementById('deleteModal').classList.add('show')}

async function confirmDelete(){
  var urls={restaurant:'/v1/admin/restaurants/',distributor:'/v1/admin/distributors/',meal:'/v1/admin/meal/',quote:'/v1/admin/quotes/',post:'/v1/admin/post/',plan:'/v1/admin/subscription-plan/'};
  var url=API+(urls[deleteType]||'/v1/admin/')+deleteId;
  var r=await fetch(url,{method:'DELETE',headers:hdr()});
  var d=await r.json();
  if(r.ok){closeModal('deleteModal');
  if(deleteType==='restaurant')loadRestaurants();
  else if(deleteType==='distributor')loadDistributors();
  else if(deleteType==='meal')loadMeals();
  else if(deleteType==='quote')loadQuotes();
  else if(deleteType==='post')loadPosts();
  else if(deleteType==='plan')loadPlans();
  showToast(d.message||deleteType+' deleted successfully')}
  else{showToast(d.detail||'Delete failed','error')}
}

// ======== MEALS ========
async function loadMeals(search=''){
  try{var cat=document.getElementById('mealCatFilter').value;var mt=document.getElementById('mealTypeFilter').value;var src=document.getElementById('mealSourceFilter').value;
  var url=API+'/v1/admin/meal?limit=50&search='+encodeURIComponent(search);
  if(cat)url+='&category='+encodeURIComponent(cat);if(mt)url+='&menuType='+encodeURIComponent(mt);if(src)url+='&source='+src;
  var r=await fetch(url,{headers:hdr()});var d=await r.json();
  if(d.categories&&mealCategories.length===0){mealCategories=d.categories;var sel=document.getElementById('mealCatFilter');d.categories.forEach(function(c){var o=document.createElement('option');o.textContent=c;o.value=c;sel.appendChild(o)})}
  document.getElementById('mealsBody').innerHTML=(d.data||[]).map(function(m){var sn=m.title.replace(/'/g,'&#39;');
  var statusBadge=m.status==='active'?'badge-green':m.status==='pending_review'?'badge-yellow':'badge-red';
  var sourceBadge=m.source==='Admin'?'badge-green':'badge-blue';
  var actions='<button class="btn btn-outline btn-sm" onclick="editMeal(&#39;'+m.id+'&#39;)"><i class="fas fa-edit"></i></button> <button class="btn btn-danger btn-sm" onclick="deleteItem(&#39;meal&#39;,&#39;'+m.id+'&#39;,&#39;'+sn+'&#39;)"><i class="fas fa-trash"></i></button>';
  if(m.status==='pending_review')actions+=' <button class="btn btn-sm" style="background:#c6f6d5;color:#22543d" onclick="approveMeal(&#39;'+m.id+'&#39;)"><i class="fas fa-check"></i></button> <button class="btn btn-sm" style="background:#fed7d7;color:#742a2a" onclick="rejectMeal(&#39;'+m.id+'&#39;)"><i class="fas fa-times"></i></button>';
  return '<tr><td><div style="display:flex;align-items:center;gap:10px">'+(m.imageUrl?'<img src="'+m.imageUrl+'" style="width:48px;height:48px;border-radius:8px;object-fit:cover">':'<div style="width:48px;height:48px;border-radius:8px;background:#f0f0f0;display:flex;align-items:center;justify-content:center"><i class="fas fa-image" style="color:#ccc"></i></div>')+'<strong>'+m.title+'</strong></div></td><td><span class="badge badge-gray">'+m.category+'</span></td><td>'+m.menuType+'</td><td>'+m.calories+' kcal</td><td><span class="badge '+sourceBadge+'">'+m.source+'</span></td><td><span class="badge '+statusBadge+'">'+m.status+'</span></td><td>'+actions+'</td></tr>'}).join('')||'<tr><td colspan="7" style="text-align:center;color:#a0aec0;padding:40px"><i class="fas fa-hamburger" style="font-size:30px;margin-bottom:8px;display:block"></i>No meals found. Add your first meal!</td></tr>';
  }catch(e){console.error(e)}
}
function searchMeals(v){loadMeals(v)}
function filterMeals(){loadMeals(document.querySelector('#page-meals .search-box input').value||'')}

function openMealModal(id){editingMealId=id||null;document.getElementById('mealModalTitle').textContent=id?'Edit Meal':'Add New Meal';
['mealTitle','mealAbout','mealCalories','mealProteins','mealFat','mealCarbs','mealImage','mealVideo','mealNotes'].forEach(function(f){document.getElementById(f).value=''});
document.getElementById('mealServings').value='1';
var catSel=document.getElementById('mealCategory');catSel.innerHTML='';mealCategories.forEach(function(c){var o=document.createElement('option');o.textContent=c;o.value=c;catSel.appendChild(o)});
document.getElementById('mealMenuType').value='All-Day';
document.getElementById('ingredientsList').innerHTML='';addIngredientRow();
document.getElementById('directionsList').innerHTML='';addDirectionRow();
document.getElementById('mealModal').classList.add('show')}

async function editMeal(id){
  var r=await fetch(API+'/v1/admin/meal?limit=100',{headers:hdr()});var d=await r.json();
  var meal=(d.data||[]).find(function(x){return x.id===id});if(!meal)return;
  openMealModal(id);editingMealId=id;
  document.getElementById('mealTitle').value=meal.title;document.getElementById('mealAbout').value=meal.about||'';
  document.getElementById('mealCalories').value=meal.calories||'';document.getElementById('mealProteins').value=meal.proteins||'';
  document.getElementById('mealFat').value=meal.fat||'';document.getElementById('mealCarbs').value=meal.carbs||'';
  document.getElementById('mealServings').value=meal.servings||1;document.getElementById('mealImage').value=meal.imageUrl||'';
  document.getElementById('mealVideo').value=meal.videoUrl||'';document.getElementById('mealNotes').value=meal.notes||'';
  document.getElementById('mealCategory').value=meal.category||'';document.getElementById('mealMenuType').value=meal.menuType||'All-Day';
  document.getElementById('ingredientsList').innerHTML='';
  (meal.ingredients||[]).forEach(function(ing){addIngredientRow(ing.name,ing.quantity,ing.unit)});
  if((meal.ingredients||[]).length===0)addIngredientRow();
  document.getElementById('directionsList').innerHTML='';
  (meal.directions||[]).forEach(function(dir){addDirectionRow(dir)});
  if((meal.directions||[]).length===0)addDirectionRow();
}

function addIngredientRow(name,qty,unit){
  var div=document.createElement('div');div.style.cssText='display:flex;gap:8px;margin-bottom:8px;align-items:center';
  div.innerHTML='<input class="form-input ing-name" placeholder="Ingredient" value="'+(name||'')+'" style="flex:2"><input class="form-input ing-qty" placeholder="Qty" value="'+(qty||'')+'" style="flex:1"><select class="form-select ing-unit" style="flex:1"><option value="g">g</option><option value="kg">kg</option><option value="ml">ml</option><option value="cup">cup</option><option value="tbsp">tbsp</option><option value="tsp">tsp</option><option value="piece">piece</option><option value="oz">oz</option></select><button class="btn btn-danger btn-sm" onclick="this.parentElement.remove()"><i class="fas fa-trash"></i></button>';
  if(unit)div.querySelector('.ing-unit').value=unit;
  document.getElementById('ingredientsList').appendChild(div);
}

function addDirectionRow(text){
  var div=document.createElement('div');div.style.cssText='display:flex;gap:8px;margin-bottom:8px;align-items:start';
  var num=document.getElementById('directionsList').children.length+1;
  div.innerHTML='<span style="min-width:28px;height:28px;border-radius:50%;background:#f0fff4;color:#26B50F;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;margin-top:10px">'+num+'</span><textarea class="form-input dir-text" rows="2" placeholder="Step '+num+' instructions...">'+(text||'')+'</textarea><button class="btn btn-danger btn-sm" style="margin-top:6px" onclick="this.parentElement.remove()"><i class="fas fa-trash"></i></button>';
  document.getElementById('directionsList').appendChild(div);
}

async function saveMeal(){
  var ings=[];document.querySelectorAll('#ingredientsList > div').forEach(function(row){
    var n=row.querySelector('.ing-name').value.trim();if(n)ings.push({name:n,quantity:row.querySelector('.ing-qty').value,unit:row.querySelector('.ing-unit').value});
  });
  var dirs=[];document.querySelectorAll('#directionsList .dir-text').forEach(function(ta){if(ta.value.trim())dirs.push(ta.value.trim())});
  var body={title:document.getElementById('mealTitle').value,about:document.getElementById('mealAbout').value,category:document.getElementById('mealCategory').value,menuType:document.getElementById('mealMenuType').value,description:document.getElementById('mealAbout').value,calories:parseInt(document.getElementById('mealCalories').value)||0,proteins:parseFloat(document.getElementById('mealProteins').value)||0,fat:parseFloat(document.getElementById('mealFat').value)||0,carbs:parseFloat(document.getElementById('mealCarbs').value)||0,servings:parseInt(document.getElementById('mealServings').value)||1,ingredients:ings,directions:dirs,imageUrl:document.getElementById('mealImage').value,videoUrl:document.getElementById('mealVideo').value,notes:document.getElementById('mealNotes').value};
  if(!body.title){alert('Meal title is required');return}
  var url=editingMealId?API+'/v1/admin/meal/'+editingMealId:API+'/v1/admin/meal';
  var method=editingMealId?'PUT':'POST';
  var r=await fetch(url,{method:method,headers:hdr(),body:JSON.stringify(body)});
  if(r.ok){closeModal('mealModal');loadMeals();showToast(editingMealId?'Meal updated successfully.':'Meal added successfully.')}else{var d=await r.json();alert(d.detail||'Error')}
}

async function approveMeal(id){
  var r=await fetch(API+'/v1/admin/meal/'+id+'/approve',{method:'PUT',headers:hdr()});
  if(r.ok){loadMeals();showToast('Meal approved successfully.')}else{var d=await r.json();showToast(d.detail||'Approve failed','error')}
}
async function rejectMeal(id){
  var reason=prompt('Reason for rejection (optional):');
  var r=await fetch(API+'/v1/admin/meal/'+id+'/reject',{method:'PUT',headers:hdr(),body:JSON.stringify({reason:reason||''})});
  if(r.ok){loadMeals();showToast('Meal rejected.')}else{var d=await r.json();showToast(d.detail||'Reject failed','error')}
}

// ======== QUOTES ========
async function loadQuotes(search=''){
  try{var r=await fetch(API+'/v1/admin/quotes?limit=50&search='+encodeURIComponent(search),{headers:hdr()});var d=await r.json();
  document.getElementById('quotesBody').innerHTML=(d.data||[]).map(function(q){var sn=q.text.replace(/'/g,'&#39;').substring(0,80);
  return '<tr><td style="line-height:1.5">'+q.text.substring(0,100)+(q.text.length>100?'...':'')+'</td><td>'+(q.publishingDate||'--')+'</td><td>'+(q.isSelected?'<span class="badge badge-green" style="cursor:pointer" onclick="toggleQuote(&#39;'+q.id+'&#39;)"><i class="fas fa-check-circle"></i> Active</span>':'<button class="btn btn-outline btn-sm" onclick="toggleQuote(&#39;'+q.id+'&#39;)">Select</button>')+'</td><td><button class="btn btn-outline btn-sm" onclick="editQuote(&#39;'+q.id+'&#39;)"><i class="fas fa-edit"></i></button> <button class="btn btn-danger btn-sm" onclick="deleteItem(&#39;quote&#39;,&#39;'+q.id+'&#39;,&#39;'+sn+'&#39;)"><i class="fas fa-trash"></i></button></td></tr>'}).join('')||'<tr><td colspan="4" style="text-align:center;color:#a0aec0;padding:40px">No quotes yet</td></tr>';
  }catch(e){console.error(e)}
}
function searchQuotes(v){loadQuotes(v)}

function openQuoteModal(id){editingQuoteId=id||null;document.getElementById('quoteModalTitle').textContent=id?'Edit Quote':'Add New Quote';
document.getElementById('quoteText').value='';document.getElementById('quoteDate').value=new Date().toISOString().split('T')[0];
document.getElementById('quoteModal').classList.add('show')}

async function editQuote(id){
  var r=await fetch(API+'/v1/admin/quotes?limit=100',{headers:hdr()});var d=await r.json();
  var q=(d.data||[]).find(function(x){return x.id===id});if(!q)return;
  openQuoteModal(id);editingQuoteId=id;
  document.getElementById('quoteText').value=q.text;document.getElementById('quoteDate').value=q.publishingDate||'';
}

async function saveQuote(){
  var body={text:document.getElementById('quoteText').value,publishingDate:document.getElementById('quoteDate').value};
  if(!body.text){alert('Quote text is required');return}
  var url=editingQuoteId?API+'/v1/admin/quotes/'+editingQuoteId:API+'/v1/admin/quotes';
  var method=editingQuoteId?'PUT':'POST';
  var r=await fetch(url,{method:method,headers:hdr(),body:JSON.stringify(body)});
  if(r.ok){closeModal('quoteModal');loadQuotes();showToast(editingQuoteId?'Quote updated.':'Quote added successfully.')}else{var d=await r.json();alert(d.detail||'Error')}
}

async function toggleQuote(id){
  var r=await fetch(API+'/v1/admin/select/quotes/'+id,{method:'POST',headers:hdr()});
  if(r.ok){loadQuotes();showToast('Quote selection updated.')}
}

// ======== POSTS ========
async function loadPosts(search=''){
  try{var r=await fetch(API+'/v1/admin/posts?limit=50&search='+encodeURIComponent(search),{headers:hdr()});var d=await r.json();
  document.getElementById('postsBody').innerHTML=(d.data||[]).map(function(p){var sn=p.description.replace(/'/g,'&#39;').substring(0,40);
  return '<tr><td>'+(p.imageUrl?'<img src="'+p.imageUrl+'" style="width:64px;height:48px;border-radius:6px;object-fit:cover">':'--')+'</td><td style="line-height:1.5">'+p.description.substring(0,120)+(p.description.length>120?'...':'')+'</td><td>'+(p.publishedDate?new Date(p.publishedDate).toLocaleDateString():'--')+'</td><td>'+p.likesCount+'</td><td><button class="btn btn-outline btn-sm" onclick="editPost(&#39;'+p.id+'&#39;)"><i class="fas fa-edit"></i></button> <button class="btn btn-danger btn-sm" onclick="deleteItem(&#39;post&#39;,&#39;'+p.id+'&#39;,&#39;'+sn+'&#39;)"><i class="fas fa-trash"></i></button></td></tr>'}).join('')||'<tr><td colspan="5" style="text-align:center;color:#a0aec0;padding:40px">No posts yet. Add your first post!</td></tr>';
  }catch(e){console.error(e)}
}
function searchPosts(v){loadPosts(v)}

function openPostModal(id){editingPostId=id||null;document.getElementById('postModalTitle').textContent=id?'Edit Post':'Add Your Post';
document.getElementById('postImage').value='';document.getElementById('postDesc').value='';document.getElementById('postNotify').checked=false;
document.getElementById('postImagePreview').style.display='none';
document.getElementById('postModal').classList.add('show');
document.getElementById('postImage').addEventListener('input',function(){var v=this.value;if(v){document.getElementById('postPreviewImg').src=v;document.getElementById('postImagePreview').style.display='block'}else{document.getElementById('postImagePreview').style.display='none'}})}

async function editPost(id){
  var r=await fetch(API+'/v1/admin/posts?limit=100',{headers:hdr()});var d=await r.json();
  var p=(d.data||[]).find(function(x){return x.id===id});if(!p)return;
  openPostModal(id);editingPostId=id;
  document.getElementById('postImage').value=p.imageUrl||'';document.getElementById('postDesc').value=p.description;
  if(p.imageUrl){document.getElementById('postPreviewImg').src=p.imageUrl;document.getElementById('postImagePreview').style.display='block'}
}

async function savePost(){
  var body={imageUrl:document.getElementById('postImage').value,description:document.getElementById('postDesc').value,sendNotification:document.getElementById('postNotify').checked};
  if(!body.description){alert('Description is required');return}
  if(body.sendNotification&&!confirm('This will send a push notification to all users. Continue?'))return;
  var url=editingPostId?API+'/v1/admin/post/'+editingPostId:API+'/v1/admin/post';
  var method=editingPostId?'PUT':'POST';
  var r=await fetch(url,{method:method,headers:hdr(),body:JSON.stringify(body)});
  if(r.ok){closeModal('postModal');loadPosts();showToast(editingPostId?'Post updated.':'Post published successfully.')}else{var d=await r.json();alert(d.detail||'Error')}
}

// ======== SUBSCRIPTION PLANS ========
async function loadPlans(){
  try{
  var ar=await fetch(API+'/v1/admin/subscription-plans/analytics',{headers:hdr()});var ad=await ar.json();
  var s=ad.summary||{};
  document.getElementById('plansSummary').innerHTML='<div class="stat-grid"><div class="stat-card"><div class="stat-icon" style="background:#faf5ff;color:#805ad5"><i class="fas fa-crown"></i></div><div class="stat-label">Total Pro Subscribers</div><div class="stat-value">'+s.totalProSubscribers+'</div></div><div class="stat-card"><div class="stat-icon" style="background:#f0fff4;color:#26B50F"><i class="fas fa-dollar-sign"></i></div><div class="stat-label">Monthly Revenue (MRR)</div><div class="stat-value">$'+s.totalMRR+'</div></div><div class="stat-card"><div class="stat-icon" style="background:#ebf8ff;color:#3182ce"><i class="fas fa-chart-line"></i></div><div class="stat-label">Annual Revenue (ARR)</div><div class="stat-value">$'+s.totalARR+'</div></div></div>';
  var r=await fetch(API+'/v1/admin/subscription-plans',{headers:hdr()});var d=await r.json();
  var pa=(ad.plans||[]);
  document.getElementById('plansGrid').innerHTML=(d.plans||[]).map(function(p){
  var analytics=pa.find(function(a){return a.id===p.id})||{};
  var isDefault=p.isDefault;
  return '<div class="card" style="padding:24px"><div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:16px"><div><h3 style="font-size:18px;font-weight:700;margin-bottom:4px">'+p.title+'</h3><p style="font-size:13px;color:#718096">'+p.description+'</p></div><span class="badge '+(p.status==='active'?'badge-green':'badge-red')+'">'+p.status+'</span></div><div style="font-size:28px;font-weight:800;color:#1a202c;margin-bottom:12px">'+(p.chargeType==='Free'?'Free':'$'+(p.amountCents/100).toFixed(2)+'<span style="font-size:14px;color:#718096;font-weight:400">/'+p.billingPeriod+'</span>')+'</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px"><div style="background:#f7fafc;padding:10px;border-radius:8px;text-align:center"><div style="font-size:20px;font-weight:700">'+(analytics.activeSubscribers||0)+'</div><div style="font-size:11px;color:#718096">Subscribers</div></div><div style="background:#f7fafc;padding:10px;border-radius:8px;text-align:center"><div style="font-size:20px;font-weight:700">'+(analytics.newThisMonth||0)+'</div><div style="font-size:11px;color:#718096">New This Month</div></div></div>'+(p.benefits&&p.benefits.length?'<ul style="list-style:none;padding:0;margin:0 0 16px 0">'+p.benefits.map(function(b){return '<li style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:13px"><i class="fas fa-check-circle" style="color:#26B50F"></i>'+b+'</li>'}).join('')+'</ul>':'')+'<div style="display:flex;gap:8px;margin-top:auto">'+(isDefault?'<span class="badge badge-blue">Default Plan</span>':'<button class="btn btn-outline btn-sm" onclick="editPlan(&#39;'+p.id+'&#39;)"><i class="fas fa-edit"></i> Edit</button> <button class="btn btn-danger btn-sm" onclick="deleteItem(&#39;plan&#39;,&#39;'+p.id+'&#39;,&#39;'+p.title+'&#39;)"><i class="fas fa-trash"></i> Delete</button>')+'</div></div>'}).join('')||'<p style="text-align:center;color:#a0aec0;padding:40px">No plans configured</p>';
  }catch(e){console.error(e)}
}

function togglePlanPrice(){var t=document.getElementById('planChargeType').value;var show=t==='Paid';document.getElementById('planBillingGroup').style.display=show?'block':'none';document.getElementById('planAmountGroup').style.display=show?'block':'none'}

function openPlanModal(id){editingPlanId=id||null;document.getElementById('planModalTitle').textContent=id?'Edit Plan':'Add New Plan';
['planTitle','planDescription','planAmount'].forEach(function(f){document.getElementById(f).value=''});
document.getElementById('planChargeType').value='Free';document.getElementById('planBilling').value='Monthly';document.getElementById('planStatus').value='active';
document.getElementById('benefitsList').innerHTML='';addBenefitRow();togglePlanPrice();
document.getElementById('planModal').classList.add('show')}

async function editPlan(id){
  var r=await fetch(API+'/v1/admin/subscription-plans',{headers:hdr()});var d=await r.json();
  var p=(d.plans||[]).find(function(x){return x.id===id});if(!p)return;
  openPlanModal(id);editingPlanId=id;
  document.getElementById('planTitle').value=p.title;document.getElementById('planDescription').value=p.description||'';
  document.getElementById('planChargeType').value=p.chargeType;document.getElementById('planBilling').value=p.billingPeriod||'Monthly';
  document.getElementById('planAmount').value=p.amountCents||'';document.getElementById('planStatus').value=p.status||'active';
  togglePlanPrice();
  document.getElementById('benefitsList').innerHTML='';
  (p.benefits||[]).forEach(function(b){addBenefitRow(b)});
  if((p.benefits||[]).length===0)addBenefitRow();
}

function addBenefitRow(text){
  var div=document.createElement('div');div.style.cssText='display:flex;gap:8px;margin-bottom:8px;align-items:center';
  div.innerHTML='<input class="form-input benefit-text" placeholder="e.g. Unlimited meal plans" value="'+(text||'')+'"><button class="btn btn-danger btn-sm" onclick="this.parentElement.remove()"><i class="fas fa-trash"></i></button>';
  document.getElementById('benefitsList').appendChild(div);
}

async function savePlan(){
  var benefits=[];document.querySelectorAll('#benefitsList .benefit-text').forEach(function(inp){if(inp.value.trim())benefits.push(inp.value.trim())});
  var body={title:document.getElementById('planTitle').value,description:document.getElementById('planDescription').value,chargeType:document.getElementById('planChargeType').value,billingPeriod:document.getElementById('planBilling').value,currency:'USD',amountCents:parseInt(document.getElementById('planAmount').value)||0,benefits:benefits,appleProductId:'',googleProductId:'',status:document.getElementById('planStatus').value};
  if(!body.title){alert('Plan title is required');return}
  if(body.chargeType==='Paid'&&!body.amountCents){alert('Amount is required for paid plans');return}
  var url=editingPlanId?API+'/v1/admin/subscription-plan/'+editingPlanId:API+'/v1/admin/subscription-plan';
  var method=editingPlanId?'PUT':'POST';
  var r=await fetch(url,{method:method,headers:hdr(),body:JSON.stringify(body)});
  if(r.ok){closeModal('planModal');loadPlans();showToast('Plan saved.')}else{var d=await r.json();alert(d.detail||'Error')}
}
</script>
</body></html>"""


@admin_panel_router.get("/admin-panel", response_class=HTMLResponse)
async def admin_panel():
    return HTMLResponse(content=ADMIN_HTML)
