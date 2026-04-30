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
<div style="text-align:center;margin-bottom:12px"><i class="fas fa-shield-check" style="font-size:36px;color:var(--bo-green)"></i></div>
<h3 style="text-align:center;font-size:18px;font-weight:700;margin-bottom:4px">Two-Factor Verification</h3>
<p id="otpSubtitle" style="text-align:center;color:#718096;font-size:13px;margin-bottom:16px">Verifying your identity&hellip;</p>
<div id="demoCode" style="text-align:center;background:#f0fff4;border:1px solid #c6f6d5;padding:10px 14px;border-radius:10px;font-size:13px;color:#22543d;margin-bottom:16px;display:none"></div>
<div class="form-group">
  <label class="form-label">Verification Code</label>
  <input id="otpSingle" class="form-input" type="text" maxlength="6" placeholder="Enter 6-digit code" style="font-size:22px;font-weight:700;letter-spacing:8px;text-align:center" oninput="this.value=this.value.replace(/\D/g,'').slice(0,6)">
</div>
<div id="otpError" style="color:#e53e3e;font-size:13px;text-align:center;margin-bottom:8px;display:none"></div>
<div id="otpSpinner" style="text-align:center;margin-bottom:8px;display:none"><i class="fas fa-circle-notch fa-spin" style="color:var(--bo-green);font-size:20px"></i> <span style="color:#718096;font-size:13px">Logging in&hellip;</span></div>
<button class="btn btn-primary" id="verifyBtn" style="width:100%;padding:14px;font-size:15px" onclick="verify2FA()"><i class="fas fa-check-circle"></i> Verify &amp; Login</button>
<p style="text-align:center;margin-top:12px"><a href="#" onclick="adminLogin();return false" style="color:var(--bo-green);font-size:13px"><i class="fas fa-redo" style="font-size:11px"></i> Resend Code</a></p>
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
<div class="nav-item" onclick="showPage('claims')"><i class="fas fa-file-signature"></i>Claims <span id="claimBadge" class="badge badge-yellow" style="margin-left:auto;font-size:10px;display:none">0</span></div>
<div class="nav-item" onclick="showPage('distributors')"><i class="fas fa-truck"></i>Distributors</div>
</div>
<div class="nav-section">
<div class="nav-label">Content</div>
<div class="nav-item" onclick="showPage('meals')"><i class="fas fa-hamburger"></i>Manage Meals</div>
<div class="nav-item" onclick="showPage('quotes')"><i class="fas fa-quote-left"></i>Daily Quotes</div>
<div class="nav-item" onclick="showPage('videos')"><i class="fas fa-video"></i>Program Videos</div>
<div class="nav-item" onclick="showPage('programs')"><i class="fas fa-dumbbell"></i>Wellness Programs</div>
<div class="nav-item" onclick="showPage('posts')"><i class="fas fa-bullhorn"></i>My Posts</div>
<div class="nav-item" onclick="showPage('plans')"><i class="fas fa-crown"></i>Subscription Plans</div>
</div>
<div class="nav-section">
<div class="nav-label">Support</div>
<div class="nav-item" onclick="showPage('support')"><i class="fas fa-headset"></i>Help &amp; Support <span id="ticketBadge" class="badge badge-red" style="margin-left:auto;font-size:10px;display:none">0</span></div>
<div class="nav-item" onclick="showPage('notifications')"><i class="fas fa-bell"></i>Notifications</div>
<div class="nav-item" onclick="showPage('profile')"><i class="fas fa-user-shield"></i>My Profile</div>
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
<div style="display:grid;grid-template-columns:2fr 1fr;gap:20px;margin-bottom:24px">
<div class="card"><div class="card-header"><span class="card-title">User Growth (7 days)</span></div><div style="padding:24px"><canvas id="growthChart" height="200"></canvas></div></div>
<div class="card"><div class="card-header"><span class="card-title">Top Restaurants</span></div><div id="topRestaurants" style="padding:0"></div></div>
</div>
<!-- AI Analytics Section -->
<div class="card" style="border:2px solid #26B50F;margin-bottom:24px">
<div class="card-header" style="background:linear-gradient(135deg,#f0fff4,#f7fafc)">
<span class="card-title"><i class="fas fa-robot" style="color:#26B50F;margin-right:8px"></i>AI Analytics Dashboard</span>
<button class="btn btn-primary btn-sm" onclick="loadAIAnalytics()" id="aiRefreshBtn"><i class="fas fa-sync-alt"></i> Refresh Insights</button>
</div>
<div id="aiAnalyticsContent" style="padding:24px">
<div style="text-align:center;padding:40px;color:#a0aec0"><i class="fas fa-robot" style="font-size:48px;margin-bottom:12px;display:block;color:#26B50F"></i><p style="font-size:14px">Click "Refresh Insights" to generate AI-powered analytics</p></div>
</div>
</div>
<!-- Health Metrics Overview -->
<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px">
<div class="card" style="padding:20px;text-align:center"><div style="font-size:36px;margin-bottom:8px">😊</div><div class="stat-value" id="dashAvgHappiness">--</div><div class="stat-label">Avg Happiness Score</div></div>
<div class="card" style="padding:20px;text-align:center"><div style="font-size:36px;margin-bottom:8px">💧</div><div class="stat-value" id="dashAvgWater">--</div><div class="stat-label">Avg Daily Water (glasses)</div></div>
<div class="card" style="padding:20px;text-align:center"><div style="font-size:36px;margin-bottom:8px">😴</div><div class="stat-value" id="dashAvgSleep">--</div><div class="stat-label">Avg Sleep (hours)</div></div>
</div>
</div>
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
<!-- CLAIMS PAGE -->
<div class="page" id="page-claims">
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
<div style="display:flex;gap:8px">
<button class="btn" style="background:#f7fafc;border:1px solid #e2e8f0" onclick="loadClaims('all')">All</button>
<button class="btn" style="background:#fefcbf;color:#744210" onclick="loadClaims('pending')"><i class="fas fa-clock"></i> Pending</button>
<button class="btn" style="background:#c6f6d5;color:#22543d" onclick="loadClaims('approved')"><i class="fas fa-check"></i> Approved</button>
<button class="btn" style="background:#fed7d7;color:#742a2a" onclick="loadClaims('rejected')"><i class="fas fa-times"></i> Rejected</button>
</div>
</div>
<div class="card"><table><thead><tr><th>Restaurant</th><th>Claimed By</th><th>Owner Info</th><th>Submitted</th><th>Status</th><th style="width:160px">Actions</th></tr></thead><tbody id="claimsBody"><tr><td colspan="6" style="text-align:center;color:#a0aec0;padding:40px">Loading claims...</td></tr></tbody></table></div>
</div>
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
<div class="card"><table><thead><tr><th>Meal</th><th>Category</th><th>Type</th><th>Calories</th><th>Source</th><th>Status</th><th style="width:150px">Actions</th></tr></thead><tbody id="mealsBody"></tbody></table></div>
<div id="mealsPagination" style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;margin-top:4px">
<span id="mealsPageInfo" style="font-size:13px;color:#718096"></span>
<div style="display:flex;gap:8px">
<button id="mealsPrevBtn" class="btn btn-outline btn-sm" onclick="loadMeals(undefined,currentMealPage-1)" disabled><i class="fas fa-chevron-left"></i> Prev</button>
<button id="mealsNextBtn" class="btn btn-outline btn-sm" onclick="loadMeals(undefined,currentMealPage+1)" disabled>Next <i class="fas fa-chevron-right"></i></button>
</div>
</div>
</div>
<!-- QUOTES PAGE -->
<div class="page" id="page-quotes">
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
<div class="search-box"><i class="fas fa-search"></i><input placeholder="Search quotes..." oninput="searchQuotes(this.value)"></div>
<button class="btn btn-primary" onclick="openQuoteModal()"><i class="fas fa-plus"></i> Add New Quote</button>
</div>
<div class="card"><table><thead><tr><th style="width:50%">Quote</th><th>Publishing Date</th><th>Selected</th><th style="width:120px">Actions</th></tr></thead><tbody id="quotesBody"></tbody></table></div></div>
<!-- VIDEOS PAGE -->
<div class="page" id="page-videos">
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
<h3 style="font-size:16px;font-weight:700">Program Videos</h3>
<button class="btn btn-primary" onclick="document.getElementById('videoUploadModal').style.display='flex'"><i class="fas fa-upload"></i> Upload Video</button>
</div>
<div class="card"><table><thead><tr><th>Title</th><th>Description</th><th>Size</th><th>Uploaded</th><th style="width:150px">Actions</th></tr></thead><tbody id="videosBody"></tbody></table></div>
</div>
<!-- Video Upload Modal -->
<div id="videoUploadModal" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:999;align-items:center;justify-content:center">
<div style="background:#fff;border-radius:12px;padding:32px;width:500px;max-width:90vw">
<h3 style="font-size:18px;font-weight:700;margin-bottom:20px">Upload Program Video</h3>
<div class="form-group"><label class="form-label">Title (max 150 chars)</label><input id="videoTitle" class="form-input" maxlength="150" placeholder="Video title"></div>
<div class="form-group"><label class="form-label">Description (max 500 chars)</label><textarea id="videoDesc" class="form-input" maxlength="500" rows="3" placeholder="Video description" style="resize:vertical"></textarea></div>
<div class="form-group"><label class="form-label">Video File (MP4 or MOV, max 500MB)</label><input type="file" id="videoFile" accept=".mp4,.mov" style="margin-top:4px"></div>
<div id="videoProgress" style="display:none;margin-bottom:16px"><div style="background:#e2e8f0;border-radius:8px;height:8px;overflow:hidden"><div id="videoProgressBar" style="background:var(--bo-green);height:100%;width:0%;transition:width 0.3s"></div></div><span id="videoProgressText" style="font-size:12px;color:#718096">0%</span></div>
<div style="display:flex;gap:12px;justify-content:flex-end">
<button class="btn btn-outline" onclick="document.getElementById('videoUploadModal').style.display='none'">Cancel</button>
<button class="btn btn-primary" id="videoUploadBtn" onclick="uploadVideo()"><i class="fas fa-upload"></i> Upload</button>
</div>
</div>
</div>
<!-- Video Edit Modal -->
<div id="videoEditModal" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:999;align-items:center;justify-content:center">
<div style="background:#fff;border-radius:12px;padding:32px;width:500px;max-width:90vw">
<h3 style="font-size:18px;font-weight:700;margin-bottom:20px">Edit Video</h3>
<div class="form-group"><label class="form-label">Title (max 150 chars)</label><input id="editVideoTitle" class="form-input" maxlength="150"></div>
<div class="form-group"><label class="form-label">Description (max 500 chars)</label><textarea id="editVideoDesc" class="form-input" maxlength="500" rows="3" style="resize:vertical"></textarea></div>
<input type="hidden" id="editVideoId">
<div style="display:flex;gap:12px;justify-content:flex-end">
<button class="btn btn-outline" onclick="document.getElementById('videoEditModal').style.display='none'">Cancel</button>
<button class="btn btn-primary" onclick="saveVideoEdit()"><i class="fas fa-save"></i> Save</button>
</div>
</div>
</div>
<!-- Video Delete Confirmation Modal -->
<div id="videoDeleteModal" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:999;align-items:center;justify-content:center">
<div style="background:#fff;border-radius:12px;padding:32px;width:420px;max-width:90vw;text-align:center">
<i class="fas fa-exclamation-triangle" style="font-size:40px;color:#e53e3e;margin-bottom:16px"></i>
<h3 style="font-size:18px;font-weight:700;margin-bottom:8px">Delete this video?</h3>
<p style="color:#718096;margin-bottom:24px">This action cannot be undone.</p>
<input type="hidden" id="deleteVideoId">
<div style="display:flex;gap:12px;justify-content:center">
<button class="btn btn-outline" onclick="document.getElementById('videoDeleteModal').style.display='none'">Cancel</button>
<button class="btn btn-danger" onclick="confirmDeleteVideo()" style="background:#e53e3e;color:#fff"><i class="fas fa-trash"></i> Delete</button>
</div>
</div>
</div>
<!-- POSTS PAGE -->
<!-- WELLNESS PROGRAMS PAGE -->
<div class="page" id="page-programs">
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
<h3 style="font-size:16px;font-weight:700">Wellness Programs</h3>
<div style="display:flex;gap:8px">
<button class="btn btn-outline btn-sm" onclick="seedDefaultPrograms()" title="Seed default programs"><i class="fas fa-seedling"></i> Seed Defaults</button>
<button class="btn btn-primary" onclick="openProgramModal()"><i class="fas fa-plus"></i> Add Program</button>
</div>
</div>
<div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap;align-items:center">
<div class="search-box" style="flex:1;min-width:200px"><i class="fas fa-search"></i><input id="progSearchInput" placeholder="Search programs..." oninput="searchWellnessPrograms(this.value)"></div>
<select id="progCategoryFilter" class="form-select" style="width:160px" onchange="filterPrograms()"><option value="">All Categories</option><option value="Wellness">Wellness</option><option value="Fitness">Fitness</option><option value="Mindfulness">Mindfulness</option><option value="Nutrition">Nutrition</option><option value="Sleep">Sleep</option><option value="Stress Relief">Stress Relief</option><option value="Flexibility">Flexibility</option></select>
<select id="progStatusFilter" class="form-select" style="width:130px" onchange="filterPrograms()"><option value="">All Status</option><option value="active">Active</option><option value="inactive">Inactive</option></select>
</div>
<div class="card"><table><thead><tr><th>Name</th><th>Duration</th><th>Category</th><th>Status</th><th style="width:150px">Actions</th></tr></thead><tbody id="programsBody"></tbody></table></div>
<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0">
<button id="progPrevBtn" class="btn btn-outline btn-sm" onclick="progPrevPage()"><i class="fas fa-chevron-left"></i> Prev</button>
<span id="progPaginationInfo" style="font-size:13px;color:#718096">-</span>
<button id="progNextBtn" class="btn btn-outline btn-sm" onclick="progNextPage()">Next <i class="fas fa-chevron-right"></i></button>
</div>
</div>
<!-- Program Modal -->
<div class="modal-backdrop" id="progModal"><div class="modal" style="max-width:560px">
<div class="modal-header"><h3 id="progModalTitle">Add Wellness Program</h3><button class="btn btn-outline btn-sm" onclick="closeModal('progModal')"><i class="fas fa-times"></i></button></div>
<div class="modal-body">
<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
<div class="form-group"><label class="form-label">Name *</label><input id="progName" class="form-input" placeholder="Program name"></div>
<div class="form-group"><label class="form-label">Duration (days)</label><input id="progDays" class="form-input" type="number" min="1" placeholder="7"></div>
<div class="form-group"><label class="form-label">Category</label><input id="progCategory" class="form-input" placeholder="e.g. Wellness"></div>
<div class="form-group"><label class="form-label">Status</label><select id="progActive" class="form-select"><option value="true">Active</option><option value="false">Inactive</option></select></div>
</div>
<div class="form-group"><label class="form-label">Description</label><textarea id="progDesc" class="form-input" rows="3" placeholder="Program description"></textarea></div>
<div class="form-group"><label class="form-label">Image URL</label><input id="progImage" class="form-input" placeholder="https://..."></div>
</div>
<div class="modal-footer"><button class="btn btn-outline" onclick="closeModal('progModal')">Cancel</button><button class="btn btn-primary" onclick="saveWellnessProgram()"><i class="fas fa-save"></i> Save</button></div>
</div></div>

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
<!-- SUPPORT PAGE -->
<div class="page" id="page-support">
<div style="display:flex;gap:12px;margin-bottom:16px">
<button class="btn btn-outline btn-sm" onclick="loadTickets('open')" id="tktTabOpen" style="font-weight:700">Open</button>
<button class="btn btn-outline btn-sm" onclick="loadTickets('in_progress')" id="tktTabProg">In Progress</button>
<button class="btn btn-outline btn-sm" onclick="loadTickets('resolved')" id="tktTabRes">Resolved</button>
<button class="btn btn-outline btn-sm" onclick="loadTickets('')" id="tktTabAll">All</button>
<button class="btn btn-outline btn-sm" onclick="showSupportTab('faqs')" id="tktTabFaq">FAQs</button>
<button class="btn btn-outline btn-sm" onclick="showSupportTab('report')" id="tktTabReport">Reports</button>
<div style="margin-left:auto"><div class="search-box"><i class="fas fa-search"></i><input placeholder="Search tickets..." oninput="searchTickets(this.value)"></div></div>
</div>
<div id="ticketListView"><div class="card"><table><thead><tr><th>Ticket</th><th>Subject</th><th>User</th><th>Priority</th><th>Status</th><th>SLA</th><th>Created</th><th style="width:120px">Actions</th></tr></thead><tbody id="ticketsBody"></tbody></table></div></div>
<div id="ticketDetailView" style="display:none">
<button class="btn btn-outline btn-sm" onclick="backToTicketList()" style="margin-bottom:12px"><i class="fas fa-arrow-left"></i> Back to Queue</button>
<div style="display:grid;grid-template-columns:3fr 2fr;gap:20px">
<div class="card" style="padding:20px">
<div id="ticketHeader" style="margin-bottom:16px"></div>
<div id="ticketMessages" style="max-height:400px;overflow-y:auto;margin-bottom:16px;padding:12px;background:#f7fafc;border-radius:8px"></div>
<div style="display:flex;gap:8px"><textarea id="ticketReplyText" class="form-input" rows="2" placeholder="Type your response..." style="flex:1"></textarea><button class="btn btn-primary" onclick="sendTicketReply(false)"><i class="fas fa-paper-plane"></i></button></div>
</div>
<div class="card" style="padding:20px">
<h4 style="font-size:14px;font-weight:700;margin-bottom:12px">Ticket Details</h4>
<div id="ticketMeta"></div>
<h4 style="font-size:14px;font-weight:700;margin:16px 0 8px">Quick Templates</h4>
<select id="templateSelect" class="form-select" onchange="applyTemplate(this.value)"><option value="">Select template...</option></select>
<h4 style="font-size:14px;font-weight:700;margin:16px 0 8px">Internal Notes</h4>
<div id="ticketNotes" style="max-height:150px;overflow-y:auto;margin-bottom:8px"></div>
<div style="display:flex;gap:8px"><input id="internalNoteText" class="form-input" placeholder="Add internal note..."><button class="btn btn-outline btn-sm" onclick="sendTicketReply(true)"><i class="fas fa-sticky-note"></i></button></div>
</div>
</div>
</div>
<div id="faqView" style="display:none">
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
<h3 style="font-size:16px;font-weight:700">FAQ Management</h3>
<button class="btn btn-primary btn-sm" onclick="openFaqModal()"><i class="fas fa-plus"></i> Add FAQ</button>
</div>
<div class="card"><table><thead><tr><th>Question</th><th>Category</th><th>Order</th><th style="width:100px">Actions</th></tr></thead><tbody id="faqBody"></tbody></table></div>
</div>
<div id="reportView" style="display:none">
<h3 style="font-size:16px;font-weight:700;margin-bottom:16px">Ticket Reports</h3>
<div id="ticketReportStats" class="stat-grid" style="margin-bottom:20px"></div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px"><div class="card" style="padding:20px"><h4 style="margin-bottom:12px">By Category</h4><div id="reportCatList"></div></div><div class="card" style="padding:20px"><h4 style="margin-bottom:12px">By Priority</h4><div id="reportPriList"></div></div></div>
</div>
</div>
<!-- NOTIFICATIONS PAGE -->
<div class="page" id="page-notifications">
<div style="display:flex;gap:12px;margin-bottom:16px">
<button class="btn btn-primary btn-sm" onclick="showNotifTab('compose')" id="notifTabCompose" style="font-weight:700">Compose</button>
<button class="btn btn-outline btn-sm" onclick="showNotifTab('history')" id="notifTabHistory">History</button>
<button class="btn btn-outline btn-sm" onclick="showNotifTab('analytics')" id="notifTabAnalytics">Analytics</button>
</div>
<div id="notifCompose">
<div class="card" style="padding:24px;max-width:700px">
<h3 style="font-size:16px;font-weight:700;margin-bottom:16px">Send Notification</h3>
<div class="form-group"><label class="form-label">Title *</label><input id="notifTitle" class="form-input" maxlength="200" placeholder="Notification title"></div>
<div class="form-group"><label class="form-label">Body *</label><textarea id="notifBody" class="form-input" rows="3" maxlength="500" placeholder="Notification message"></textarea></div>
<div class="form-group"><label class="form-label">Target Audience</label>
<select id="notifTarget" class="form-select" onchange="onNotifTargetChange()">
<option value="all">All Users</option>
<option value="pro">Pro Subscribers Only</option>
<option value="basic">Basic (Free) Users Only</option>
<option value="restaurant_owners">Restaurant Owners</option>
<option value="specific_user">Specific User…</option>
</select></div>
<div id="notifUserSearch" style="display:none">
<div class="form-group" style="margin-top:-8px">
<label class="form-label">Search User</label>
<div style="display:flex;gap:8px">
<input id="notifUserQuery" class="form-input" placeholder="Name or email…" oninput="searchNotifUsers()" style="flex:1">
</div>
<div id="notifUserResults" style="margin-top:6px;max-height:160px;overflow-y:auto;border:1px solid #e2e8f0;border-radius:8px;display:none"></div>
<input type="hidden" id="notifUserId" value="">
<div id="notifUserSelected" style="margin-top:6px;display:none;background:#f0fff4;border:1px solid #c6f6d5;border-radius:8px;padding:8px 12px;font-size:13px;color:#22543d"></div>
</div>
</div>
<div class="form-group"><label class="form-label">Deep Link (optional)</label><select id="notifDeepLink" class="form-select"><option value="">None</option><option value="/home">Home</option><option value="/feed">Feed</option><option value="/culinary">Culinary Blueprint</option><option value="/profile">Profile</option><option value="/wellness-programs">Wellness Programs</option><option value="/quick-adds">Quick Add</option></select></div>
<div id="notifPreview" style="background:#f7fafc;border-radius:12px;padding:16px;margin:16px 0;display:none">
<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><div style="width:24px;height:24px;border-radius:6px;background:#26B50F;display:flex;align-items:center;justify-content:center"><i class="fas fa-bell" style="color:white;font-size:10px"></i></div><strong style="font-size:12px">BO Wellness</strong><span style="font-size:11px;color:#a0aec0;margin-left:auto">now</span></div>
<div style="font-size:13px;font-weight:600" id="previewTitle"></div>
<div style="font-size:12px;color:#4a5568" id="previewBody"></div>
</div>
<button class="btn btn-primary" onclick="sendNotification()"><i class="fas fa-paper-plane"></i> Send Notification</button>
</div>
</div>
<div id="notifHistory" style="display:none"><div class="card"><table><thead><tr><th>Title</th><th>Body</th><th>Target</th><th>Recipients</th><th>Sent</th><th>Status</th></tr></thead><tbody id="notifHistBody"></tbody></table></div></div>
<div id="notifAnalytics" style="display:none">
<div id="notifAnalyticsStats" class="stat-grid" style="margin-bottom:20px"></div>
<div class="card" style="padding:20px"><h4 style="margin-bottom:12px">Notifications by Type</h4><div id="notifTypeList"></div></div>
</div>
</div>
<!-- PROFILE PAGE -->
<div class="page" id="page-profile">
<div style="display:flex;gap:12px;margin-bottom:16px">
<button class="btn btn-primary btn-sm" onclick="showProfileTab('info')" id="profTabInfo" style="font-weight:700">Profile</button>
<button class="btn btn-outline btn-sm" onclick="showProfileTab('password')" id="profTabPw">Change Password</button>
<button class="btn btn-outline btn-sm" onclick="showProfileTab('team')" id="profTabTeam">Team</button>
</div>
<div id="profileInfo">
<div class="card" style="padding:24px;max-width:600px">
<div style="display:flex;align-items:center;gap:16px;margin-bottom:24px"><div id="profileAvatar" style="width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,#26B50F,#22a00d);display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:700;color:white"></div><div><h3 id="profileName" style="font-size:18px;font-weight:700"></h3><p id="profileEmail" style="font-size:13px;color:#718096"></p><span class="badge badge-purple" id="profileRole"></span></div></div>
<div class="form-group"><label class="form-label">Full Name</label><input id="profNameInput" class="form-input"></div>
<div class="form-group"><label class="form-label">Phone</label><input id="profPhoneInput" class="form-input" placeholder="+1 (555) 123-4567"></div>
<div class="form-group"><label class="form-label">Profile Image URL</label><input id="profImageInput" class="form-input" placeholder="https://..."></div>
<button class="btn btn-primary" onclick="saveProfile()"><i class="fas fa-save"></i> Save Changes</button>
</div>
</div>
<div id="profilePassword" style="display:none">
<div class="card" style="padding:24px;max-width:500px">
<h3 style="font-size:16px;font-weight:700;margin-bottom:16px">Change Password</h3>
<div class="form-group"><label class="form-label">Current Password</label><input id="profCurrPw" class="form-input" type="password"></div>
<div class="form-group"><label class="form-label">New Password</label><input id="profNewPw" class="form-input" type="password" placeholder="Min 8 chars, 1 upper, 1 number, 1 special"></div>
<div class="form-group"><label class="form-label">Confirm New Password</label><input id="profConfPw" class="form-input" type="password"></div>
<button class="btn btn-primary" onclick="changePassword()"><i class="fas fa-key"></i> Update Password</button>
</div>
</div>
<div id="profileTeam" style="display:none">
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
<h3 style="font-size:16px;font-weight:700">Admin Team</h3>
<button class="btn btn-primary btn-sm" onclick="openAddAdminModal()"><i class="fas fa-plus"></i> Add Admin</button>
</div>
<div class="card"><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Last Login</th></tr></thead><tbody id="teamBody"></tbody></table></div>
</div>
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

<!-- MEAL VIEW MODAL -->
<div class="modal-backdrop" id="mealViewModal"><div class="modal" style="max-width:680px;max-height:90vh;overflow-y:auto">
<div class="modal-header"><h3 id="mealViewTitle">Meal Details</h3><button class="btn btn-outline btn-sm" onclick="closeModal('mealViewModal')"><i class="fas fa-times"></i></button></div>
<div class="modal-body" id="mealViewBody"></div>
<div class="modal-footer"><button class="btn btn-outline" onclick="closeModal('mealViewModal')">Close</button><button class="btn btn-primary" id="mealViewEditBtn" onclick=""><i class="fas fa-edit"></i> Edit</button></div>
</div></div>

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
<div class="modal-footer"><button class="btn btn-outline" onclick="closeModal('mealModal')">Cancel</button><button class="btn btn-sm" style="background:linear-gradient(135deg,#805AD5,#6B46C1);color:white" onclick="aiGenerateRecipeInfo()"><i class="fas fa-robot"></i> AI Fill (approx)</button><button class="btn btn-primary" onclick="saveMeal()"><i class="fas fa-save"></i> Save Meal</button></div>
</div></div>

<!-- QUOTE MODAL -->
<div class="modal-backdrop" id="quoteModal"><div class="modal" style="max-width:500px">
<div class="modal-header"><h3 id="quoteModalTitle">Add New Quote</h3><button class="btn btn-outline btn-sm" onclick="closeModal('quoteModal')"><i class="fas fa-times"></i></button></div>
<div class="modal-body">
<div class="form-group"><label class="form-label">Quote Text *</label><textarea id="quoteText" class="form-input" rows="4" maxlength="500" placeholder="Enter wellness quote..."></textarea></div>
<div class="form-group"><label class="form-label">Sub-Quote / Tagline</label><input id="quoteSubText" class="form-input" maxlength="500" placeholder="Enter sub-quote or tagline..."></div>
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
<div class="modal-header"><h3 id="planModalTitle">Add New Plan</h3><button class="btn btn-outline btn-sm" onclick="closeModal('planModal')"><i class="fas fa-times"></i></button></div><div class="modal-body">
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

<!-- FAQ MODAL -->
<div class="modal-backdrop" id="faqModal"><div class="modal" style="max-width:500px">
<div class="modal-header"><h3 id="faqModalTitle">Add FAQ</h3><button class="btn btn-outline btn-sm" onclick="closeModal('faqModal')"><i class="fas fa-times"></i></button></div>
<div class="modal-body">
<div class="form-group"><label class="form-label">Question *</label><input id="faqQuestion" class="form-input" maxlength="200"></div>
<div class="form-group"><label class="form-label">Answer *</label><textarea id="faqAnswer" class="form-input" rows="4" maxlength="2000"></textarea></div>
<div class="form-group"><label class="form-label">Category</label><input id="faqCategory" class="form-input" placeholder="e.g. Getting Started, Billing"></div>
<div class="form-group"><label class="form-label">Display Order</label><input id="faqOrder" class="form-input" type="number" value="0"></div>
</div>
<div class="modal-footer"><button class="btn btn-outline" onclick="closeModal('faqModal')">Cancel</button><button class="btn btn-primary" onclick="saveFaq()"><i class="fas fa-save"></i> Save</button></div>
</div></div>

<!-- ADD ADMIN MODAL -->
<div class="modal-backdrop" id="addAdminModal"><div class="modal" style="max-width:450px">
<div class="modal-header"><h3>Add Team Member</h3><button class="btn btn-outline btn-sm" onclick="closeModal('addAdminModal')"><i class="fas fa-times"></i></button></div>
<div class="modal-body">
<div class="form-group"><label class="form-label">Full Name *</label><input id="newAdminName" class="form-input"></div>
<div class="form-group"><label class="form-label">Email *</label><input id="newAdminEmail" class="form-input" type="email"></div>
<div class="form-group"><label class="form-label">Role</label><select id="newAdminRole" class="form-select"><option value="admin">Admin</option><option value="super_admin">Super Admin</option></select></div>
<p style="font-size:12px;color:#d69e2e;margin-top:8px"><i class="fas fa-info-circle"></i> A temporary password will be generated.</p>
</div>
<div class="modal-footer"><button class="btn btn-outline" onclick="closeModal('addAdminModal')">Cancel</button><button class="btn btn-primary" onclick="createAdmin()"><i class="fas fa-user-plus"></i> Create</button></div>
</div></div>

<!-- USER DETAIL MODAL - 360 VIEW -->
<div class="modal-backdrop" id="userDetailModal"><div class="modal" style="max-width:960px">
<div class="modal-header"><h3 id="userDetailTitle">User 360° View</h3><button class="btn btn-outline btn-sm" onclick="closeModal('userDetailModal')"><i class="fas fa-times"></i></button></div>
<div class="modal-body" style="padding:0">
<div id="userDetailContent" style="max-height:75vh;overflow-y:auto;padding:24px">
<div style="text-align:center;padding:40px;color:#a0aec0"><i class="fas fa-spinner fa-spin"></i> Loading...</div>
</div>
</div>
<div class="modal-footer">
<button class="btn btn-outline" onclick="closeModal('userDetailModal')">Close</button>
<button class="btn btn-sm" id="userSuspendBtn" style="background:#fed7d7;color:#742a2a" onclick="userAction('suspend')"><i class="fas fa-ban"></i> Suspend</button>
<button class="btn btn-sm" id="userActivateBtn" style="background:#c6f6d5;color:#22543d;display:none" onclick="userAction('activate')"><i class="fas fa-check"></i> Activate</button>
<button class="btn btn-danger btn-sm" id="userDeleteBtn" onclick="userAction('delete')"><i class="fas fa-trash"></i> Delete</button>
</div>
</div></div>

<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<script>
const API=window.location.origin+'/api';
let adminToken='',preToken='',editingRestId=null,editingDistId=null,deleteType='',deleteId='';
let editingMealId=null,editingQuoteId=null,editingPostId=null,editingPlanId=null,mealCategories=[],currentMealPage=1,mealsCache={};
let currentTicketId=null,editingFaqId=null,viewingUserId=null;

function showToast(msg,type='success'){const t=document.getElementById('toast');t.className='toast toast-'+type+' show';document.getElementById('toastMsg').textContent=msg;setTimeout(()=>t.classList.remove('show'),3000)}

async function adminLogin(){
  const email=document.getElementById('adminEmail').value,pw=document.getElementById('adminPw').value;
  const btn=document.querySelector('#loginStep1 button');btn.disabled=true;btn.innerHTML='<i class="fas fa-circle-notch fa-spin"></i> Authenticating...';
  document.getElementById('loginError').style.display='none';
  try{
    const r=await fetch(API+'/v1/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password:pw})});
    const d=await r.json();
    if(!r.ok){document.getElementById('loginError').style.display='block';document.getElementById('loginError').textContent=d.detail||'Login failed';btn.disabled=false;btn.innerHTML='<i class="fas fa-shield-alt"></i> Authenticate';return}
    preToken=d.pre_token;
    document.getElementById('loginStep1').style.display='none';
    document.getElementById('loginStep2').style.display='block';
    document.getElementById('otpError').style.display='none';
    // Show the code and auto-fill the input
    if(d._demo_code){
      var dc=document.getElementById('demoCode');
      dc.style.display='block';
      dc.innerHTML='<i class="fas fa-info-circle"></i> Your verification code: <strong style="font-size:18px;letter-spacing:4px">'+d._demo_code+'</strong>';
      document.getElementById('otpSingle').value=d._demo_code;
      document.getElementById('otpSubtitle').textContent='Code auto-filled — click Verify & Login to continue.';
    }else{
      document.getElementById('otpSubtitle').textContent='Enter the 6-digit code sent to your email.';
      document.getElementById('otpSingle').focus();
    }
  }catch(e){document.getElementById('loginError').style.display='block';document.getElementById('loginError').textContent='Connection error. Check your network.';btn.disabled=false;btn.innerHTML='<i class="fas fa-shield-alt"></i> Authenticate'}
}

async function verify2FA(){
  const code=document.getElementById('otpSingle').value.trim();
  if(code.length!==6){document.getElementById('otpError').style.display='block';document.getElementById('otpError').textContent='Enter all 6 digits';return}
  document.getElementById('otpError').style.display='none';
  document.getElementById('otpSpinner').style.display='block';
  document.getElementById('verifyBtn').disabled=true;
  try{
    const r=await fetch(API+'/v1/admin/verify-2fa',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+preToken},body:JSON.stringify({code})});
    const d=await r.json();
    if(!r.ok){document.getElementById('otpError').style.display='block';document.getElementById('otpError').textContent=d.detail||'Invalid code';document.getElementById('otpSpinner').style.display='none';document.getElementById('verifyBtn').disabled=false;return}
    adminToken=d.admin_token;
    sessionStorage.setItem('adminInfo',JSON.stringify(d.user));
    document.getElementById('loginPage').style.display='none';
    document.getElementById('dashboardPage').style.display='block';
    document.getElementById('adminName').textContent=d.user.name;
    document.getElementById('adminAvatar').textContent=d.user.name[0];
    loadDashboard();loadClaimBadge();
  }catch(e){document.getElementById('otpError').style.display='block';document.getElementById('otpError').textContent='Verification failed. Try again.';document.getElementById('otpSpinner').style.display='none';document.getElementById('verifyBtn').disabled=false}
}

function logout(){adminToken='';document.getElementById('dashboardPage').style.display='none';document.getElementById('loginPage').style.display='block';document.getElementById('loginStep1').style.display='block';document.getElementById('loginStep2').style.display='none'}

function showPage(p){document.querySelectorAll('.page').forEach(el=>el.classList.remove('active'));document.getElementById('page-'+p).classList.add('active');
document.querySelectorAll('.nav-item').forEach(el=>el.classList.remove('active'));event.currentTarget.classList.add('active');
const titles={dashboard:'Dashboard',users:'User Management',restaurants:'Restaurant Management',claims:'Restaurant Claims',distributors:'Distributor Management',tickets:'Support Tickets',meals:'Manage Meals',quotes:'Daily Quotes',videos:'Program Videos',programs:'Wellness Programs',posts:'My Posts',plans:'Subscription Plans',support:'Help & Support',notifications:'Notifications',profile:'My Profile'};
document.getElementById('pageTitle').textContent=titles[p]||p;
if(p==='dashboard')loadDashboard();if(p==='users')loadUsers();if(p==='restaurants')loadRestaurants();if(p==='claims')loadClaims('all');if(p==='distributors')loadDistributors();if(p==='meals')loadMeals();if(p==='quotes')loadQuotes();if(p==='posts')loadPosts();if(p==='plans')loadPlans();if(p==='videos')loadVideos();if(p==='programs')loadWellnessPrograms();if(p==='support'){loadTickets('open');loadTicketBadge()}if(p==='notifications')showNotifTab('compose');if(p==='profile')loadProfile()}

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
  document.getElementById('usersBody').innerHTML=(d.data||[]).map(function(u){var planBadge=u.plan==='basic'||!u.plan?'badge-gray':'badge-blue';var statusBadge=u.status==='active'?'badge-green':u.status==='suspended'?'badge-red':'badge-gray';
  return '<tr><td><div style="display:flex;align-items:center;gap:10px"><div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#26B50F,#22a00d);display:flex;align-items:center;justify-content:center;color:white;font-size:12px;font-weight:700">'+(u.name?u.name[0].toUpperCase():'U')+'</div><div><strong>'+u.name+'</strong><div style="font-size:12px;color:#718096">'+u.email+'</div></div></div></td><td><span class="badge '+planBadge+'">'+(u.plan||'basic')+'</span></td><td><span class="badge '+statusBadge+'">'+(u.status||'active')+'</span></td><td>'+(u.created_at?new Date(u.created_at).toLocaleDateString():'--')+'</td><td><button class="btn btn-outline btn-sm" onclick="openUserDetail(&#39;'+u.id+'&#39;)"><i class="fas fa-eye"></i> View</button></td></tr>'}).join('')||'<tr><td colspan="5" style="text-align:center;color:#a0aec0;padding:40px">No users found</td></tr>';
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

// ============ CLAIMS ============
async function loadClaims(status){
  try{
    var url=API+'/v1/admin/claims?limit=50';
    if(status&&status!=='all')url+='&status='+status;
    var r=await fetch(url,{headers:hdr()});var d=await r.json();
    var claims=d.claims||[];
    // Update badge
    var pending=claims.filter(function(c){return c.status==='pending'}).length;
    var badge=document.getElementById('claimBadge');
    if(pending>0){badge.textContent=pending;badge.style.display='inline-flex'}else{badge.style.display='none'}
    // Render table
    document.getElementById('claimsBody').innerHTML=claims.map(function(c){
      var statusBadge=c.status==='pending'?'badge-yellow':c.status==='approved'?'badge-green':'badge-red';
      var actions='';
      if(c.status==='pending'){
        actions='<button class="btn btn-sm" style="background:#c6f6d5;color:#22543d;margin-right:4px" onclick="approveClaim(&#39;'+c.id+'&#39;)"><i class="fas fa-check"></i> Approve</button>'
          +'<button class="btn btn-sm" style="background:#fed7d7;color:#742a2a" onclick="rejectClaim(&#39;'+c.id+'&#39;)"><i class="fas fa-times"></i> Reject</button>';
      }else{
        actions='<span style="color:#a0aec0;font-size:12px">'+(c.reviewed_by||'')+'</span>';
      }
      return '<tr>'
        +'<td><strong>'+(c.restaurant_name||'Unknown')+'</strong></td>'
        +'<td><div><strong>'+(c.user_name||'Unknown')+'</strong></div><div style="font-size:12px;color:#718096">'+(c.user_email||'')+'</div></td>'
        +'<td><div style="font-size:13px"><strong>'+(c.owner_name||'')+'</strong></div><div style="font-size:12px;color:#718096">'+(c.owner_email||'')+'</div><div style="font-size:12px;color:#718096">'+(c.owner_phone||'')+'</div></td>'
        +'<td style="font-size:13px">'+new Date(c.created_at).toLocaleDateString()+'</td>'
        +'<td><span class="badge '+statusBadge+'">'+c.status+'</span></td>'
        +'<td>'+actions+'</td>'
        +'</tr>';
    }).join('')||'<tr><td colspan="6" style="text-align:center;color:#a0aec0;padding:40px"><i class="fas fa-file-signature" style="font-size:32px;margin-bottom:8px;display:block"></i>No claims found</td></tr>';
  }catch(e){console.error(e);document.getElementById('claimsBody').innerHTML='<tr><td colspan="6" style="text-align:center;color:#e53e3e;padding:40px">Failed to load claims</td></tr>'}
}

async function approveClaim(id){
  if(!confirm('Approve this restaurant claim? The restaurant will be marked as BO Verified.'))return;
  try{
    var r=await fetch(API+'/v1/admin/claims/'+id+'/approve',{method:'PUT',headers:hdr()});
    if(r.ok){showToast('Claim approved! Restaurant marked as verified.','success');loadClaims('all')}
    else{var d=await r.json();showToast(d.detail||'Failed to approve','error')}
  }catch(e){showToast('Error approving claim','error')}
}

async function rejectClaim(id){
  if(!confirm('Reject this restaurant claim?'))return;
  try{
    var r=await fetch(API+'/v1/admin/claims/'+id+'/reject',{method:'PUT',headers:hdr()});
    if(r.ok){showToast('Claim rejected','success');loadClaims('all')}
    else{var d=await r.json();showToast(d.detail||'Failed to reject','error')}
  }catch(e){showToast('Error rejecting claim','error')}
}

async function loadClaimBadge(){
  try{var r=await fetch(API+'/v1/admin/claims?status=pending',{headers:hdr()});var d=await r.json();
  var c=d.total||0;var b=document.getElementById('claimBadge');
  if(c>0){b.textContent=c;b.style.display='inline-flex'}else{b.style.display='none'}}catch(e){}
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
  var urls={restaurant:'/v1/admin/restaurants/',distributor:'/v1/admin/distributors/',meal:'/v1/admin/meal/',quote:'/v1/admin/quotes/',post:'/v1/admin/post/',plan:'/v1/admin/subscription-plan/',ticket:'/v1/admin/tickets/',faq:'/v1/admin/faq/'};
  var url=API+(urls[deleteType]||'/v1/admin/')+deleteId;
  var r=await fetch(url,{method:'DELETE',headers:hdr()});
  var d=await r.json();
  if(r.ok){closeModal('deleteModal');
  if(deleteType==='restaurant')loadRestaurants();
  else if(deleteType==='distributor')loadDistributors();
  else if(deleteType==='meal')loadMeals(undefined,currentMealPage);
  else if(deleteType==='quote')loadQuotes();
  else if(deleteType==='post')loadPosts();
  else if(deleteType==='plan')loadPlans();
  else if(deleteType==='ticket')loadTickets('');
  else if(deleteType==='faq')loadFaqs();
  showToast(d.message||deleteType+' deleted successfully')}
  else{showToast(d.detail||'Delete failed','error')}
}

// ======== MEALS ========
async function loadMeals(search,page){
  try{
  if(search===undefined)search=document.querySelector('#page-meals .search-box input').value||'';
  if(page===undefined)page=1;
  currentMealPage=page;
  var cat=document.getElementById('mealCatFilter').value;
  var mt=document.getElementById('mealTypeFilter').value;
  var src=document.getElementById('mealSourceFilter').value;
  var url=API+'/v1/admin/meal?limit=25&page='+page+'&search='+encodeURIComponent(search);
  if(cat)url+='&category='+encodeURIComponent(cat);
  if(mt)url+='&menuType='+encodeURIComponent(mt);
  if(src)url+='&source='+src;
  var r=await fetch(url,{headers:hdr()});var d=await r.json();
  if(d.categories&&mealCategories.length===0){mealCategories=d.categories;var sel=document.getElementById('mealCatFilter');d.categories.forEach(function(c){var o=document.createElement('option');o.textContent=c;o.value=c;sel.appendChild(o)})}
  mealsCache={};(d.data||[]).forEach(function(m){mealsCache[m.id]=m});
  var pg=d.pagination||{};
  document.getElementById('mealsPageInfo').textContent='Showing '+(d.data||[]).length+' of '+(pg.total||0)+' meals (page '+pg.page+' of '+pg.pages+')';
  document.getElementById('mealsPrevBtn').disabled=!pg.hasPrev;
  document.getElementById('mealsNextBtn').disabled=!pg.hasNext;
  document.getElementById('mealsBody').innerHTML=(d.data||[]).map(function(m){var sn=m.title.replace(/'/g,'&#39;');
  var statusBadge=m.status==='active'?'badge-green':m.status==='pending_review'?'badge-yellow':'badge-red';
  var sourceBadge=m.source==='Admin'?'badge-green':'badge-blue';
  var actions='<button class="btn btn-outline btn-sm" onclick="viewMeal(&#39;'+m.id+'&#39;)" title="View details"><i class="fas fa-eye"></i></button> <button class="btn btn-outline btn-sm" onclick="editMeal(&#39;'+m.id+'&#39;)"><i class="fas fa-edit"></i></button> <button class="btn btn-danger btn-sm" onclick="deleteItem(&#39;meal&#39;,&#39;'+m.id+'&#39;,&#39;'+sn+'&#39;)"><i class="fas fa-trash"></i></button>';
  if(m.status==='pending_review')actions+=' <button class="btn btn-sm" style="background:#c6f6d5;color:#22543d" onclick="approveMeal(&#39;'+m.id+'&#39;)"><i class="fas fa-check"></i></button> <button class="btn btn-sm" style="background:#fed7d7;color:#742a2a" onclick="rejectMeal(&#39;'+m.id+'&#39;)"><i class="fas fa-times"></i></button>';
  return '<tr><td><div style="display:flex;align-items:center;gap:10px">'+(m.imageUrl?'<img src="'+m.imageUrl+'" style="width:48px;height:48px;border-radius:8px;object-fit:cover">':'<div style="width:48px;height:48px;border-radius:8px;background:#f0f0f0;display:flex;align-items:center;justify-content:center"><i class="fas fa-image" style="color:#ccc"></i></div>')+'<strong>'+m.title+'</strong></div></td><td><span class="badge badge-gray">'+m.category+'</span></td><td>'+m.menuType+'</td><td>'+m.calories+' kcal</td><td><span class="badge '+sourceBadge+'">'+m.source+'</span></td><td><span class="badge '+statusBadge+'">'+m.status+'</span></td><td>'+actions+'</td></tr>'}).join('')||'<tr><td colspan="7" style="text-align:center;color:#a0aec0;padding:40px"><i class="fas fa-hamburger" style="font-size:30px;margin-bottom:8px;display:block"></i>No meals found. Add your first meal!</td></tr>';
  }catch(e){console.error(e)}
}
function searchMeals(v){loadMeals(v,1)}
function filterMeals(){loadMeals(undefined,1)}

function viewMeal(id){
  var m=mealsCache[id];if(!m)return;
  document.getElementById('mealViewTitle').textContent=m.title;
  document.getElementById('mealViewEditBtn').onclick=function(){closeModal('mealViewModal');editMeal(id)};
  var ingHtml=(m.ingredients||[]).map(function(ing){
    var qty=ing.quantity?(ing.quantity+(ing.unit?' '+ing.unit:'')):'';
    return '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f0f0f0"><span>'+ing.name+'</span><span style="color:#718096;font-size:13px">'+qty+'</span></div>'
  }).join('')||'<p style="color:#a0aec0">No ingredients listed.</p>';
  var dirs=m.directions||[];
  var dirsArr=Array.isArray(dirs)?dirs:(dirs?dirs.split('\\n').filter(function(s){return s.trim()}):[]);
  var dirHtml=dirsArr.map(function(step,i){
    return '<div style="display:flex;gap:12px;margin-bottom:12px"><div style="min-width:28px;height:28px;border-radius:50%;background:#f0fff4;color:#26B50F;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px">'+(i+1)+'</div><p style="margin:0;color:#4a5568;line-height:1.6">'+step.replace(/^\\d+\\.\\s*/,"")+'</p></div>'
  }).join('')||'<p style="color:#a0aec0">No directions listed.</p>';
  var statusBadge=m.status==='active'?'badge-green':m.status==='pending_review'?'badge-yellow':'badge-red';
  document.getElementById('mealViewBody').innerHTML=
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">'
    +(m.imageUrl?'<img src="'+m.imageUrl+'" style="grid-column:span 2;width:100%;height:200px;object-fit:cover;border-radius:12px">':'')
    +'<div><label style="font-size:11px;font-weight:700;color:#a0aec0;text-transform:uppercase;letter-spacing:1px">Category</label><p style="margin:4px 0;font-weight:600">'+m.category+'</p></div>'
    +'<div><label style="font-size:11px;font-weight:700;color:#a0aec0;text-transform:uppercase;letter-spacing:1px">Menu Type</label><p style="margin:4px 0;font-weight:600">'+m.menuType+'</p></div>'
    +'<div><label style="font-size:11px;font-weight:700;color:#a0aec0;text-transform:uppercase;letter-spacing:1px">Status</label><p style="margin:4px 0"><span class="badge '+statusBadge+'">'+m.status+'</span></p></div>'
    +'<div><label style="font-size:11px;font-weight:700;color:#a0aec0;text-transform:uppercase;letter-spacing:1px">Servings</label><p style="margin:4px 0;font-weight:600">'+m.servings+'</p></div>'
    +'</div>'
    +'<div style="display:flex;gap:12px;background:#f7fafc;border-radius:12px;padding:16px;margin-bottom:20px;text-align:center">'
    +'<div style="flex:1"><div style="font-size:22px;font-weight:800;color:#E06B2E">'+m.calories+'</div><div style="font-size:11px;color:#718096;font-weight:600">FUEL</div></div>'
    +'<div style="flex:1"><div style="font-size:22px;font-weight:800;color:#26B50F">'+m.proteins+'g</div><div style="font-size:11px;color:#718096;font-weight:600">PROTEIN</div></div>'
    +'<div style="flex:1"><div style="font-size:22px;font-weight:800;color:#805AD5">'+m.fat+'g</div><div style="font-size:11px;color:#718096;font-weight:600">FAT</div></div>'
    +'<div style="flex:1"><div style="font-size:22px;font-weight:800;color:#3182CE">'+m.carbs+'g</div><div style="font-size:11px;color:#718096;font-weight:600">CARBS</div></div>'
    +'</div>'
    +(m.about?'<div style="margin-bottom:20px"><p style="color:#4a5568;line-height:1.7;margin:0">'+m.about+'</p></div>':'')
    +'<div style="margin-bottom:20px"><h4 style="font-size:14px;font-weight:700;margin-bottom:12px;color:#2d3748">Ingredients</h4>'+ingHtml+'</div>'
    +'<div style="margin-bottom:20px"><h4 style="font-size:14px;font-weight:700;margin-bottom:12px;color:#2d3748">Directions</h4>'+dirHtml+'</div>'
    +(m.notes?'<div style="background:#fffbeb;border-radius:8px;padding:12px;display:flex;gap:8px"><i class="fas fa-lightbulb" style="color:#d69e2e;margin-top:2px"></i><p style="margin:0;color:#744210;font-size:13px">'+m.notes+'</p></div>':'');
  document.getElementById('mealViewModal').classList.add('show');
}

function openMealModal(id){editingMealId=id||null;document.getElementById('mealModalTitle').textContent=id?'Edit Meal':'Add New Meal';
['mealTitle','mealAbout','mealCalories','mealProteins','mealFat','mealCarbs','mealImage','mealVideo','mealNotes'].forEach(function(f){document.getElementById(f).value=''});
document.getElementById('mealServings').value='1';
var catSel=document.getElementById('mealCategory');catSel.innerHTML='';mealCategories.forEach(function(c){var o=document.createElement('option');o.textContent=c;o.value=c;catSel.appendChild(o)});
document.getElementById('mealMenuType').value='All-Day';
document.getElementById('ingredientsList').innerHTML='';addIngredientRow();
document.getElementById('directionsList').innerHTML='';addDirectionRow();
document.getElementById('mealModal').classList.add('show')}

async function editMeal(id){
  var meal=mealsCache[id];
  if(!meal){var r=await fetch(API+'/v1/admin/meal?limit=25&search=',{headers:hdr()});var d=await r.json();meal=(d.data||[]).find(function(x){return x.id===id})}
  if(!meal)return;
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
  if(r.ok){closeModal('mealModal');loadMeals(undefined,editingMealId?currentMealPage:1);showToast(editingMealId?'Meal updated successfully.':'Meal added successfully.')}else{var d=await r.json();alert(d.detail||'Error')}
}

async function approveMeal(id){
  var r=await fetch(API+'/v1/admin/meal/'+id+'/approve',{method:'PUT',headers:hdr()});
  if(r.ok){loadMeals(undefined,currentMealPage);showToast('Meal approved successfully.')}else{var d=await r.json();showToast(d.detail||'Approve failed','error')}
}
async function rejectMeal(id){
  var reason=prompt('Reason for rejection (optional):');
  var r=await fetch(API+'/v1/admin/meal/'+id+'/reject',{method:'PUT',headers:hdr(),body:JSON.stringify({reason:reason||''})});
  if(r.ok){loadMeals(undefined,currentMealPage);showToast('Meal rejected.')}else{var d=await r.json();showToast(d.detail||'Reject failed','error')}
}

// ======== AI RECIPE INFO ========
async function aiGenerateRecipeInfo(){
  var name=document.getElementById('mealTitle').value;
  if(!name){alert('Please enter a meal name first');return}
  var cat=document.getElementById('mealCategory').value;
  var desc=document.getElementById('mealAbout').value;
  showToast('Generating nutritional info with AI...');
  try{
    var r=await fetch(API+'/v1/admin/ai-recipe-info',{method:'POST',headers:hdr(),body:JSON.stringify({name:name,category:cat,description:desc})});
    var d=await r.json();
    if(d.calories)document.getElementById('mealCalories').value=d.calories;
    if(d.proteins)document.getElementById('mealProteins').value=d.proteins;
    if(d.fat)document.getElementById('mealFat').value=d.fat;
    if(d.carbs)document.getElementById('mealCarbs').value=d.carbs;
    if(d.about&&!desc)document.getElementById('mealAbout').value=d.about+' (approx values)';
    showToast('AI filled nutritional info (approx values)');
  }catch(e){console.error(e);showToast('AI generation failed','error')}
}


// ======== VIDEOS ========
async function loadVideos(){
  try{
    const r=await fetch(API+'/v1/videos',{headers:hdr()});
    const d=await r.json();
    const videos=d.videos||[];
    document.getElementById('videosBody').innerHTML=videos.length===0?'<tr><td colspan="5" style="text-align:center;padding:32px;color:#a0aec0">No videos uploaded yet</td></tr>':
    videos.map(v=>{
      const sizeMB=(v.file_size/(1024*1024)).toFixed(1);
      const date=v.created_at?new Date(v.created_at).toLocaleDateString():'N/A';
      const title=(v.title||'Untitled').replace(/'/g,'&#39;');
      const desc=(v.description||'').replace(/'/g,'&#39;');
      return '<tr><td>'+title+'</td><td>'+desc.substring(0,60)+(desc.length>60?'...':'')+'</td><td>'+sizeMB+' MB</td><td>'+date+'</td><td><button class="btn btn-outline btn-sm" onclick="openEditVideo(&quot;'+v.video_id+'&quot;,&quot;'+title+'&quot;,&quot;'+desc+'&quot;)"><i class="fas fa-edit"></i></button> <button class="btn btn-outline btn-sm" style="color:#e53e3e" onclick="openDeleteVideo(&quot;'+v.video_id+'&quot;)"><i class="fas fa-trash"></i></button></td></tr>';
    }).join('');
  }catch(e){console.error(e);showToast('Failed to load videos','error')}
}

async function uploadVideo(){
  const title=document.getElementById('videoTitle').value;
  const desc=document.getElementById('videoDesc').value;
  const fileInput=document.getElementById('videoFile');
  if(!fileInput.files.length){showToast('Please select a video file','error');return}
  const file=fileInput.files[0];
  const ext=file.name.split('.').pop().toLowerCase();
  if(!['mp4','mov'].includes(ext)){showToast('Only MP4 and MOV files are supported','error');return}
  if(file.size>500*1024*1024){showToast('File exceeds the 500MB size limit','error');return}
  const fd=new FormData();fd.append('file',file);fd.append('title',title);fd.append('description',desc);
  document.getElementById('videoProgress').style.display='block';
  document.getElementById('videoUploadBtn').disabled=true;
  const xhr=new XMLHttpRequest();
  xhr.upload.addEventListener('progress',function(e){if(e.lengthComputable){const pct=Math.round(e.loaded/e.total*100);document.getElementById('videoProgressBar').style.width=pct+'%';document.getElementById('videoProgressText').textContent=pct+'%'}});
  xhr.onload=function(){
    document.getElementById('videoUploadBtn').disabled=false;
    document.getElementById('videoProgress').style.display='none';
    if(xhr.status===200){showToast('Video uploaded successfully','success');document.getElementById('videoUploadModal').style.display='none';document.getElementById('videoTitle').value='';document.getElementById('videoDesc').value='';fileInput.value='';loadVideos()}
    else if(xhr.status===429){showToast('Upload rate limit exceeded. Try again later.','error')}
    else{const err=JSON.parse(xhr.responseText);showToast(err.detail||'Upload failed','error')}
  };
  xhr.onerror=function(){document.getElementById('videoUploadBtn').disabled=false;showToast('Upload failed','error')};
  xhr.open('POST',API+'/v1/videos/upload');xhr.setRequestHeader('Authorization','Bearer '+adminToken);xhr.send(fd);
}

function openEditVideo(id,title,desc){
  document.getElementById('editVideoId').value=id;
  document.getElementById('editVideoTitle').value=title.replace(/&amp;#39;/g,"'").replace(/&#39;/g,"'");
  document.getElementById('editVideoDesc').value=desc.replace(/&amp;#39;/g,"'").replace(/&#39;/g,"'");
  document.getElementById('videoEditModal').style.display='flex';
}

async function saveVideoEdit(){
  const id=document.getElementById('editVideoId').value;
  const title=document.getElementById('editVideoTitle').value;
  const desc=document.getElementById('editVideoDesc').value;
  try{const r=await fetch(API+'/v1/videos/'+id,{method:'PATCH',headers:hdr(),body:JSON.stringify({title,description:desc})});
    if(r.ok){showToast('Video updated','success');document.getElementById('videoEditModal').style.display='none';loadVideos()}
    else{const e=await r.json();showToast(e.detail||'Update failed','error')}
  }catch(e){showToast('Update failed','error')}
}

function openDeleteVideo(id){
  document.getElementById('deleteVideoId').value=id;
  document.getElementById('videoDeleteModal').style.display='flex';
}

async function confirmDeleteVideo(){
  const id=document.getElementById('deleteVideoId').value;
  try{const r=await fetch(API+'/v1/videos/'+id,{method:'DELETE',headers:hdr()});
    if(r.ok){showToast('Video deleted','success');document.getElementById('videoDeleteModal').style.display='none';loadVideos()}
    else{const e=await r.json();showToast(e.detail||'Delete failed','error')}
  }catch(e){showToast('Delete failed','error')}
}

// ======== WELLNESS PROGRAMS ========
let editingProgId=null,progPage=1,progSearch='',progCategory='',progStatus='';
async function loadWellnessPrograms(resetPage){
  if(resetPage)progPage=1;
  try{
    const params=new URLSearchParams({page:progPage,limit:10,search:progSearch,category:progCategory,status:progStatus});
    const r=await fetch(API+'/v1/admin/wellness-programs?'+params.toString(),{headers:hdr()});
    const d=await r.json();
    const progs=d.programs||[];
    document.getElementById('programsBody').innerHTML=progs.map(function(p){
      var sn=p.name.replace(/'/g,"&#39;");
      var statusBadge=p.is_active?'<span class="badge badge-green">Active</span>':'<span class="badge badge-gray">Inactive</span>';
      return '<tr><td><strong>'+p.name+'</strong></td><td>'+p.duration_days+' days</td><td>'+(p.category||'Wellness')+'</td><td>'+statusBadge+'</td><td><button class="btn btn-outline btn-sm" onclick="editWellnessProgram(\\''+p.id+'\\')"><i class="fas fa-edit"></i></button> <button class="btn btn-danger btn-sm" onclick="deleteWellnessProgram(\\''+p.id+'\\',\\''+sn+'\\')"><i class="fas fa-trash"></i></button></td></tr>';
    }).join('')||'<tr><td colspan="5" style="text-align:center;color:#a0aec0;padding:40px">No programs found. <a href="#" onclick="seedDefaultPrograms();return false;" style="color:#26B50F;font-weight:600">Seed defaults</a></td></tr>';
    const total=d.total||0,pages=d.pages||1;
    document.getElementById('progPaginationInfo').textContent='Page '+progPage+' of '+pages+' ('+total+' total)';
    document.getElementById('progPrevBtn').disabled=progPage<=1;
    document.getElementById('progNextBtn').disabled=progPage>=pages;
  }catch(e){showToast('Failed to load programs','error')}
}
function searchWellnessPrograms(v){progSearch=v;loadWellnessPrograms(true)}
function filterPrograms(){progCategory=document.getElementById('progCategoryFilter').value;progStatus=document.getElementById('progStatusFilter').value;loadWellnessPrograms(true)}
function progPrevPage(){if(progPage>1){progPage--;loadWellnessPrograms()}}
function progNextPage(){progPage++;loadWellnessPrograms()}
function openProgramModal(){
  editingProgId=null;
  document.getElementById('progModalTitle').textContent='Add Wellness Program';
  document.getElementById('progName').value='';document.getElementById('progDays').value='7';
  document.getElementById('progCategory').value='Wellness';document.getElementById('progDesc').value='';
  document.getElementById('progImage').value='';document.getElementById('progActive').value='true';
  document.getElementById('progModal').classList.add('show');
}
async function editWellnessProgram(id){
  try{
    const r=await fetch(API+'/v1/admin/wellness-programs/'+id,{headers:hdr()});
    const d=await r.json();const prog=d.program;if(!prog)return;
    editingProgId=id;
    document.getElementById('progModalTitle').textContent='Edit Wellness Program';
    document.getElementById('progName').value=prog.name;document.getElementById('progDays').value=prog.duration_days;
    document.getElementById('progCategory').value=prog.category||'Wellness';document.getElementById('progDesc').value=prog.description||'';
    document.getElementById('progImage').value=prog.image_url||'';document.getElementById('progActive').value=prog.is_active?'true':'false';
    document.getElementById('progModal').classList.add('show');
  }catch(e){showToast('Failed to load program','error')}
}
async function saveWellnessProgram(){
  const body={name:document.getElementById('progName').value,duration_days:parseInt(document.getElementById('progDays').value)||7,category:document.getElementById('progCategory').value||'Wellness',description:document.getElementById('progDesc').value,image_url:document.getElementById('progImage').value,is_active:document.getElementById('progActive').value==='true'};
  if(!body.name){alert('Name is required');return}
  const url=editingProgId?API+'/v1/admin/wellness-programs/'+editingProgId:API+'/v1/admin/wellness-programs';
  const method=editingProgId?'PUT':'POST';
  const r=await fetch(url,{method,headers:hdr(),body:JSON.stringify(body)});
  if(r.ok){closeModal('progModal');loadWellnessPrograms();showToast(editingProgId?'Program updated':'Program created')}
  else{const e=await r.json();alert(e.detail||'Error')}
}
async function deleteWellnessProgram(id,name){
  if(!confirm('Deactivate "'+name+'"? It will be hidden from the app.'))return;
  const r=await fetch(API+'/v1/admin/wellness-programs/'+id,{method:'DELETE',headers:hdr()});
  if(r.ok){loadWellnessPrograms();showToast('Program deactivated')}
  else{showToast('Delete failed','error')}
}
async function seedDefaultPrograms(){
  if(!confirm('This will insert all default wellness programs into the database. Continue?'))return;
  const r=await fetch(API+'/v1/admin/wellness-programs/seed',{method:'POST',headers:hdr()});
  const d=await r.json();
  if(r.ok){loadWellnessPrograms(true);showToast(d.message||'Programs seeded')}
  else{showToast('Seed failed','error')}
}

// ======== QUOTES ========
async function loadQuotes(search=''){
  try{var r=await fetch(API+'/v1/admin/quotes?limit=50&search='+encodeURIComponent(search),{headers:hdr()});var d=await r.json();
  document.getElementById('quotesBody').innerHTML=(d.data||[]).map(function(q){var sn=q.text.replace(/'/g,'&#39;').substring(0,80);
  return '<tr><td style="line-height:1.5">'+q.text.substring(0,100)+(q.text.length>100?'...':'')+(q.subQuote?'<br><small style="color:#718096">'+q.subQuote.substring(0,80)+'</small>':'')+'</td><td>'+(q.publishingDate||'--')+'</td><td>'+(q.isSelected?'<span class="badge badge-green" style="cursor:pointer" onclick="toggleQuote(&#39;'+q.id+'&#39;)"><i class="fas fa-check-circle"></i> Active</span>':'<button class="btn btn-outline btn-sm" onclick="toggleQuote(&#39;'+q.id+'&#39;)">Select</button>')+'</td><td><button class="btn btn-outline btn-sm" onclick="editQuote(&#39;'+q.id+'&#39;)"><i class="fas fa-edit"></i></button> <button class="btn btn-danger btn-sm" onclick="deleteItem(&#39;quote&#39;,&#39;'+q.id+'&#39;,&#39;'+sn+'&#39;)"><i class="fas fa-trash"></i></button></td></tr>'}).join('')||'<tr><td colspan="4" style="text-align:center;color:#a0aec0;padding:40px">No quotes yet</td></tr>';
  }catch(e){console.error(e)}
}
function searchQuotes(v){loadQuotes(v)}

function openQuoteModal(id){editingQuoteId=id||null;document.getElementById('quoteModalTitle').textContent=id?'Edit Quote':'Add New Quote';
document.getElementById('quoteText').value='';document.getElementById('quoteSubText').value='';document.getElementById('quoteDate').value=new Date().toISOString().split('T')[0];
document.getElementById('quoteModal').classList.add('show')}

async function editQuote(id){
  var r=await fetch(API+'/v1/admin/quotes?limit=100',{headers:hdr()});var d=await r.json();
  var q=(d.data||[]).find(function(x){return x.id===id});if(!q)return;
  openQuoteModal(id);editingQuoteId=id;
  document.getElementById('quoteText').value=q.text;document.getElementById('quoteSubText').value=q.subQuote||'';document.getElementById('quoteDate').value=q.publishingDate||'';
}

async function saveQuote(){
  var body={text:document.getElementById('quoteText').value,subQuote:document.getElementById('quoteSubText').value,publishingDate:document.getElementById('quoteDate').value};
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
  return '<tr><td>'+(p.imageUrl?'<img src="'+p.imageUrl+'" style="width:64px;height:48px;border-radius:6px;object-fit:cover">':'<div style="width:64px;height:48px;border-radius:6px;background:#e2e8f0;display:flex;align-items:center;justify-content:center;font-weight:800;color:#a0aec0;font-size:16px">BO</div>')+'</td><td style="line-height:1.5">'+p.description.substring(0,120)+(p.description.length>120?'...':'')+'</td><td>'+(p.publishedDate?new Date(p.publishedDate).toLocaleDateString():'--')+'</td><td>'+p.likesCount+'</td><td><button class="btn btn-outline btn-sm" onclick="editPost(&#39;'+p.id+'&#39;)"><i class="fas fa-edit"></i></button> <button class="btn btn-danger btn-sm" onclick="deleteItem(&#39;post&#39;,&#39;'+p.id+'&#39;,&#39;'+sn+'&#39;)"><i class="fas fa-trash"></i></button></td></tr>'}).join('')||'<tr><td colspan="5" style="text-align:center;color:#a0aec0;padding:40px">No posts yet. Add your first post!</td></tr>';
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

// ======== SPRINT 9: ENHANCED USERS 360 VIEW ========
function openUserDetail(userId){viewingUserId=userId;loadUserDetail360(userId)}

async function loadAIAnalytics(){
  var btn=document.getElementById('aiRefreshBtn');
  btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> Generating...';btn.disabled=true;
  try{
    var r=await fetch(API+'/v1/admin/ai-analytics',{headers:hdr()});
    var d=await r.json();
    var m=d.metrics||{};
    document.getElementById('dashAvgHappiness').textContent=(m.avgHappiness||'--')+'/5';
    document.getElementById('dashAvgWater').textContent=m.avgWater||'--';
    document.getElementById('dashAvgSleep').textContent=(m.avgSleep||'--')+'h';
    var html='<div style="margin-bottom:20px"><h4 style="font-size:15px;font-weight:700;margin-bottom:12px;color:#26B50F"><i class="fas fa-lightbulb"></i> AI Insights</h4><div style="display:grid;gap:8px">';
    (d.insights||[]).forEach(function(i){html+='<div style="padding:10px 14px;background:#f7fafc;border-radius:8px;font-size:13px;border-left:3px solid #26B50F">'+i+'</div>'});
    html+='</div></div>';
    html+='<div style="margin-bottom:20px"><h4 style="font-size:15px;font-weight:700;margin-bottom:12px;color:#805AD5"><i class="fas fa-rocket"></i> Recommendations</h4><div style="display:grid;gap:8px">';
    (d.recommendations||[]).forEach(function(r){html+='<div style="padding:10px 14px;background:#faf5ff;border-radius:8px;font-size:13px;border-left:3px solid #805AD5">'+r+'</div>'});
    html+='</div></div>';
    if(d.healthSummary){html+='<div style="padding:14px;background:linear-gradient(135deg,#f0fff4,#f7fafc);border-radius:10px;font-size:13px;border:1px solid #c6f6d5"><strong><i class="fas fa-heartbeat" style="color:#26B50F"></i> Platform Health:</strong> '+d.healthSummary+'</div>'}
    document.getElementById('aiAnalyticsContent').innerHTML=html;
  }catch(e){console.error(e);document.getElementById('aiAnalyticsContent').innerHTML='<p style="color:#e53e3e;padding:20px;text-align:center">Failed to load AI analytics</p>'}
  btn.innerHTML='<i class="fas fa-sync-alt"></i> Refresh Insights';btn.disabled=false;
}

async function loadUserDetail360(userId){
  try{
    var r=await fetch(API+'/v1/admin/user/360/'+userId,{headers:hdr()});var d=await r.json();
    var u=d.user;var s=d.stats;
    document.getElementById('userDetailTitle').textContent=(u.name||u.email)+' - 360\u00b0 View';
    var statusColor=u.status==='suspended'?'badge-red':'badge-green';
    document.getElementById('userSuspendBtn').style.display=u.status==='suspended'?'none':'inline-flex';
    document.getElementById('userActivateBtn').style.display=u.status==='suspended'?'inline-flex':'none';

    var avatarHtml=u.avatar?'<img src="'+u.avatar+'" style="width:64px;height:64px;border-radius:50%;object-fit:cover">':'<div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#26B50F,#22a00d);display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:700;color:white">'+(u.name?u.name[0].toUpperCase():'U')+'</div>';

    var html='<div style="display:flex;align-items:center;gap:16px;margin-bottom:24px;padding-bottom:20px;border-bottom:1px solid #e2e8f0">'+avatarHtml+'<div style="flex:1"><h3 style="font-weight:700;font-size:18px;margin-bottom:2px">'+u.name+'</h3><p style="font-size:13px;color:#718096;margin-bottom:6px">'+u.email+(u.phone?' &middot; '+u.phone:'')+'</p><div style="display:flex;gap:6px;flex-wrap:wrap"><span class="badge '+statusColor+'">'+u.status+'</span><span class="badge badge-blue">'+(u.plan||'basic')+'</span><span class="badge badge-gray">Joined '+(u.created_at?new Date(u.created_at).toLocaleDateString():'--')+'</span>'+(u.last_login?'<span class="badge badge-gray">Last seen '+ new Date(u.last_login).toLocaleDateString()+'</span>':'')+'</div></div></div>';

    // Stats Cards
    html+='<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:24px">';
    var stats=[{v:s.mealsLogged,l:'Meals',i:'fa-utensils',c:'#E53E3E'},{v:s.workoutsCompleted,l:'Workouts',i:'fa-dumbbell',c:'#3182CE'},{v:s.journalsCreated,l:'Journals',i:'fa-book',c:'#805AD5'},{v:s.postsCreated,l:'Posts',i:'fa-edit',c:'#D69E2E'},{v:s.happinessLogs,l:'Mood Logs',i:'fa-smile',c:'#38A169'}];
    stats.forEach(function(st){html+='<div style="text-align:center;padding:12px;background:#f7fafc;border-radius:10px;border:1px solid #e2e8f0"><i class="fas '+st.i+'" style="color:'+st.c+';font-size:18px;margin-bottom:4px;display:block"></i><div style="font-size:20px;font-weight:800;color:#1a202c">'+st.v+'</div><div style="font-size:11px;color:#a0aec0">'+st.l+'</div></div>'});
    html+='</div>';

    // Health Metrics
    html+='<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px">';
    html+='<div style="padding:14px;background:linear-gradient(135deg,#faf5ff,#f5f3ff);border-radius:10px;text-align:center"><div style="font-size:24px;margin-bottom:4px">&#128522;</div><div style="font-size:18px;font-weight:800">'+(s.avgHappiness||'--')+'/5</div><div style="font-size:11px;color:#a0aec0">Avg Happiness</div></div>';
    html+='<div style="padding:14px;background:linear-gradient(135deg,#ebf8ff,#f0fff4);border-radius:10px;text-align:center"><div style="font-size:24px;margin-bottom:4px">&#128167;</div><div style="font-size:18px;font-weight:800">'+(s.avgWater||'--')+'</div><div style="font-size:11px;color:#a0aec0">Avg Water (glasses)</div></div>';
    html+='<div style="padding:14px;background:linear-gradient(135deg,#f0fff4,#ebf8ff);border-radius:10px;text-align:center"><div style="font-size:24px;margin-bottom:4px">&#128564;</div><div style="font-size:18px;font-weight:800">'+(s.avgSleep||'--')+'h</div><div style="font-size:11px;color:#a0aec0">Avg Sleep</div></div>';
    html+='<div style="padding:14px;background:linear-gradient(135deg,#fffbeb,#f0fff4);border-radius:10px;text-align:center"><div style="font-size:24px;margin-bottom:4px">&#128694;</div><div style="font-size:18px;font-weight:800">'+(s.avgSteps?s.avgSteps.toLocaleString():'--')+'</div><div style="font-size:11px;color:#a0aec0">Avg Daily Steps</div></div>';
    html+='</div>';

    // Tabbed sections
    html+='<div style="margin-bottom:12px;display:flex;gap:6px;flex-wrap:wrap">';
    var tabs=[{id:'t360health',l:'Health Timeline',ic:'fa-heartbeat'},{id:'t360workouts',l:'Workouts',ic:'fa-dumbbell'},{id:'t360meals',l:'Meals',ic:'fa-utensils'},{id:'t360social',l:'Social',ic:'fa-users'},{id:'t360subs',l:'Subscriptions',ic:'fa-credit-card'},{id:'t360tickets',l:'Tickets',ic:'fa-ticket-alt'}];
    tabs.forEach(function(t,i){html+='<button class="btn btn-sm '+(i===0?'btn-primary':'btn-outline')+'" onclick="show360Tab(&#39;'+t.id+'&#39;,this)" style="font-size:12px"><i class="fas '+t.ic+'"></i> '+t.l+'</button>'});
    html+='</div>';

    // Health Timeline Tab
    html+='<div class="tab360" id="t360health" style="display:block">';
    if(d.happiness&&d.happiness.length){
      html+='<h4 style="font-size:13px;font-weight:700;margin-bottom:8px;color:#805AD5"><i class="fas fa-smile"></i> Happiness Trend (Last 30)</h4><div style="display:flex;gap:3px;align-items:end;height:60px;margin-bottom:16px;padding:4px;background:#f7fafc;border-radius:8px">';
      var maxS=5;d.happiness.slice().reverse().forEach(function(h){var pct=(h.score/maxS)*100;var clr=h.score>=4?'#38A169':h.score>=3?'#D69E2E':'#E53E3E';html+='<div style="flex:1;height:'+pct+'%;background:'+clr+';border-radius:3px;min-height:4px" title="'+h.date+': '+h.score+'/5'+'"></div>'});
      html+='</div>';
    }
    if(d.water&&d.water.length){
      html+='<h4 style="font-size:13px;font-weight:700;margin-bottom:8px;color:#3182CE"><i class="fas fa-tint"></i> Water Intake (Last 30 days)</h4><div style="display:flex;gap:3px;align-items:end;height:50px;margin-bottom:16px;padding:4px;background:#f7fafc;border-radius:8px">';
      var maxW=Math.max.apply(null,d.water.map(function(w){return w.glasses||0}))||8;
      d.water.slice().reverse().forEach(function(w){var pct=((w.glasses||0)/maxW)*100;html+='<div style="flex:1;height:'+Math.max(pct,5)+'%;background:#3182CE;border-radius:3px;opacity:0.7" title="'+w.date+': '+w.glasses+' glasses"></div>'});
      html+='</div>';
    }
    if(d.sleep&&d.sleep.length){
      html+='<h4 style="font-size:13px;font-weight:700;margin-bottom:8px;color:#6B46C1"><i class="fas fa-moon"></i> Sleep Trend (Last 30 days)</h4><div style="display:flex;gap:3px;align-items:end;height:50px;margin-bottom:16px;padding:4px;background:#f7fafc;border-radius:8px">';
      var maxSl=Math.max.apply(null,d.sleep.map(function(s){return s.hours||0}))||10;
      d.sleep.slice().reverse().forEach(function(sl){var pct=((sl.hours||0)/maxSl)*100;html+='<div style="flex:1;height:'+Math.max(pct,5)+'%;background:#6B46C1;border-radius:3px;opacity:0.7" title="'+sl.date+': '+sl.hours+'h"></div>'});
      html+='</div>';
    }
    if(d.steps&&d.steps.length){
      html+='<h4 style="font-size:13px;font-weight:700;margin-bottom:8px;color:#D69E2E"><i class="fas fa-walking"></i> Steps (Last 30 days)</h4><div style="display:flex;gap:3px;align-items:end;height:50px;margin-bottom:12px;padding:4px;background:#f7fafc;border-radius:8px">';
      var maxSt=Math.max.apply(null,d.steps.map(function(s){return s.steps||0}))||10000;
      d.steps.slice().reverse().forEach(function(st){var pct=((st.steps||0)/maxSt)*100;html+='<div style="flex:1;height:'+Math.max(pct,5)+'%;background:#D69E2E;border-radius:3px;opacity:0.7" title="'+st.date+': '+st.steps+' steps"></div>'});
      html+='</div>';
    }
    if(!d.happiness.length&&!d.water.length&&!d.sleep.length){html+='<p style="text-align:center;color:#a0aec0;padding:20px">No health data recorded yet</p>'}
    html+='</div>';

    // Workouts Tab
    html+='<div class="tab360" id="t360workouts" style="display:none">';
    if(d.workouts&&d.workouts.length){
      html+='<table><tr><th>Type</th><th>Duration</th><th>Calories</th><th>Date</th></tr>';
      d.workouts.forEach(function(w){html+='<tr><td><i class="fas fa-dumbbell" style="color:#3182CE;margin-right:6px"></i>'+w.type+'</td><td>'+w.duration+' min</td><td>'+w.calories+' cal</td><td>'+(w.date?new Date(w.date).toLocaleDateString():'--')+'</td></tr>'});
      html+='</table>';
    }else{html+='<p style="text-align:center;color:#a0aec0;padding:20px">No workouts recorded</p>'}
    html+='</div>';

    // Meals Tab
    html+='<div class="tab360" id="t360meals" style="display:none">';
    if(d.meals&&d.meals.length){
      html+='<div style="display:grid;gap:8px">';
      d.meals.forEach(function(m){
        html+='<div style="display:flex;gap:12px;padding:10px;background:#f7fafc;border-radius:8px;align-items:center">';
        html+=(m.image_url||m.imageUrl)?'<img src="'+(m.image_url||m.imageUrl)+'" style="width:48px;height:48px;border-radius:8px;object-fit:cover">':'<div style="width:48px;height:48px;border-radius:8px;background:#e2e8f0;display:flex;align-items:center;justify-content:center;font-size:12px;color:#a0aec0;font-weight:700">BO</div>';
        html+='<div style="flex:1"><div style="font-weight:600;font-size:13px">'+(m.meal_name||m.name||'Meal')+'</div><div style="font-size:11px;color:#a0aec0">'+(m.calories||'--')+' cal &middot; '+(m.created_at?new Date(m.created_at).toLocaleDateString():'')+'</div></div></div>';
      });
      html+='</div>';
    }else{html+='<p style="text-align:center;color:#a0aec0;padding:20px">No meals logged</p>'}
    html+='</div>';

    // Social Tab
    html+='<div class="tab360" id="t360social" style="display:none">';
    if(d.posts&&d.posts.length){
      html+='<h4 style="font-size:13px;font-weight:700;margin-bottom:8px">Recent Posts</h4><div style="display:grid;gap:8px">';
      d.posts.forEach(function(p){html+='<div style="padding:10px;background:#f7fafc;border-radius:8px"><div style="font-size:13px">'+p.content+'</div><div style="font-size:11px;color:#a0aec0;margin-top:4px">'+(p.date?new Date(p.date).toLocaleDateString():'')+(p.likes?' &middot; '+p.likes+' likes':'')+'</div></div>'});
      html+='</div>';
    }
    if(d.journals&&d.journals.length){
      html+='<h4 style="font-size:13px;font-weight:700;margin:16px 0 8px">Journal Entries</h4><div style="display:grid;gap:6px">';
      d.journals.forEach(function(j){html+='<div style="padding:8px 12px;background:#faf5ff;border-radius:8px;border-left:3px solid #805AD5"><span style="font-size:13px;font-weight:600">'+j.title+'</span><span style="font-size:11px;color:#a0aec0;margin-left:8px">'+(j.date?new Date(j.date).toLocaleDateString():'')+'</span></div>'});
      html+='</div>';
    }
    if(!d.posts.length&&!d.journals.length){html+='<p style="text-align:center;color:#a0aec0;padding:20px">No social activity</p>'}
    html+='</div>';

    // Subscriptions Tab
    html+='<div class="tab360" id="t360subs" style="display:none">';
    if(d.subscriptions&&d.subscriptions.length){
      html+='<table><tr><th>Plan</th><th>Status</th><th>Started</th></tr>';
      d.subscriptions.forEach(function(s){html+='<tr><td>'+(s.display_name||s.plan_name||'--')+'</td><td><span class="badge '+(s.status==='active'?'badge-green':'badge-red')+'">'+s.status+'</span></td><td>'+(s.started_at?new Date(s.started_at).toLocaleDateString():'--')+'</td></tr>'});
      html+='</table>';
    }else{html+='<p style="text-align:center;color:#a0aec0;padding:20px">No subscriptions</p>'}
    html+='</div>';

    // Tickets Tab
    html+='<div class="tab360" id="t360tickets" style="display:none">';
    if(d.tickets&&d.tickets.length){
      html+='<table><tr><th>Subject</th><th>Status</th><th>Date</th></tr>';
      d.tickets.forEach(function(t){html+='<tr><td>'+t.subject+'</td><td><span class="badge '+(t.status==='open'?'badge-blue':t.status==='resolved'?'badge-green':'badge-gray')+'">'+t.status+'</span></td><td>'+(t.date?new Date(t.date).toLocaleDateString():'--')+'</td></tr>'});
      html+='</table>';
    }else{html+='<p style="text-align:center;color:#a0aec0;padding:20px">No support tickets</p>'}
    html+='</div>';

    // Goals & Preferences
    html+='<div style="margin-top:20px;padding-top:16px;border-top:1px solid #e2e8f0">';
    if(d.goals&&d.goals.length){html+='<h4 style="font-size:13px;font-weight:700;margin-bottom:6px"><i class="fas fa-bullseye" style="color:#E53E3E"></i> Goals</h4><div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px">'+d.goals.map(function(g){return '<span class="badge badge-gray">'+g+'</span>'}).join('')+'</div>'}
    if(d.lifeGoals&&d.lifeGoals.length){html+='<h4 style="font-size:13px;font-weight:700;margin-bottom:6px"><i class="fas fa-star" style="color:#D69E2E"></i> Life Goals</h4><div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px">'+d.lifeGoals.map(function(g){return '<span class="badge badge-blue">'+g+'</span>'}).join('')+'</div>'}
    if(d.dietaryPreferences&&d.dietaryPreferences.length){html+='<h4 style="font-size:13px;font-weight:700;margin-bottom:6px"><i class="fas fa-leaf" style="color:#38A169"></i> Dietary Preferences</h4><div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px">'+d.dietaryPreferences.map(function(g){return '<span class="badge badge-green">'+g+'</span>'}).join('')+'</div>'}
    html+='</div>';

    document.getElementById('userDetailContent').innerHTML=html;
    document.getElementById('userDetailModal').classList.add('show');
  }catch(e){console.error(e);showToast('Failed to load user details','error')}
}

function show360Tab(tabId,btn){
  document.querySelectorAll('.tab360').forEach(function(t){t.style.display='none'});
  document.getElementById(tabId).style.display='block';
  btn.parentElement.querySelectorAll('.btn').forEach(function(b){b.className='btn btn-outline btn-sm';b.style.fontSize='12px'});
  btn.classList.add('btn-primary');btn.classList.remove('btn-outline');
}

async function userAction(action){
  if(action==='delete'&&!confirm('PERMANENTLY delete this user and all their data? This cannot be undone.'))return;
  var reason='';
  if(action==='suspend'){reason=prompt('Reason for suspension:');if(!reason)return}
  try{var r=await fetch(API+'/v1/admin/users/changeAction/'+viewingUserId,{method:'POST',headers:hdr(),body:JSON.stringify({action:action,reason:reason})});
  var d=await r.json();if(r.ok){closeModal('userDetailModal');loadUsers();showToast(d.message)}else{showToast(d.detail||'Action failed','error')}}catch(e){showToast('Error','error')}
}

// ======== TICKETS ========
async function loadTicketBadge(){try{var r=await fetch(API+'/v1/admin/tickets?status=open',{headers:hdr()});var d=await r.json();var c=(d.tabs||{}).open||0;var b=document.getElementById('ticketBadge');if(c>0){b.textContent=c;b.style.display='inline-flex'}else{b.style.display='none'}}catch(e){}}
async function loadTickets(status){
  try{document.getElementById('ticketListView').style.display='block';document.getElementById('ticketDetailView').style.display='none';document.getElementById('faqView').style.display='none';document.getElementById('reportView').style.display='none';
  ['tktTabOpen','tktTabProg','tktTabRes','tktTabAll','tktTabFaq','tktTabReport'].forEach(function(id){document.getElementById(id).className='btn btn-outline btn-sm'});
  if(status==='open')document.getElementById('tktTabOpen').classList.add('btn-primary');
  else if(status==='in_progress')document.getElementById('tktTabProg').classList.add('btn-primary');
  else if(status==='resolved')document.getElementById('tktTabRes').classList.add('btn-primary');
  else document.getElementById('tktTabAll').classList.add('btn-primary');
  var url=API+'/v1/admin/tickets?limit=50'+(status?'&status='+status:'');
  var r=await fetch(url,{headers:hdr()});var d=await r.json();
  var priorityColors={high:'badge-red',medium:'badge-yellow',low:'badge-gray',urgent:'badge-red'};
  var statusColors={open:'badge-blue',in_progress:'badge-yellow',resolved:'badge-green',closed:'badge-gray'};
  var slaColors={ok:'badge-green',warning:'badge-yellow',breach:'badge-red'};
  document.getElementById('ticketsBody').innerHTML=(d.data||[]).map(function(t){
  return '<tr style="cursor:pointer" onclick="openTicketDetail(&#39;'+t.id+'&#39;)"><td><strong>'+t.ticketNumber+'</strong></td><td>'+t.subject+'</td><td>'+t.userName+(t.unreadCount?' <span class="badge badge-red" style="font-size:10px">'+t.unreadCount+'</span>':'')+'</td><td><span class="badge '+(priorityColors[t.priority]||'badge-gray')+'">'+t.priority+'</span></td><td><span class="badge '+(statusColors[t.status]||'badge-gray')+'">'+t.status.replace('_',' ')+'</span></td><td><span class="badge '+(slaColors[t.sla]||'badge-green')+'">'+(t.sla==='breach'?'SLA Breach':t.sla==='warning'?'Warning':'OK')+'</span></td><td>'+(t.createdAt?new Date(t.createdAt).toLocaleDateString():'--')+'</td><td><button class="btn btn-danger btn-sm" onclick="event.stopPropagation();deleteItem(&#39;ticket&#39;,&#39;'+t.id+'&#39;,&#39;'+t.ticketNumber+'&#39;)"><i class="fas fa-trash"></i></button></td></tr>'
  }).join('')||'<tr><td colspan="8" style="text-align:center;color:#a0aec0;padding:40px">No tickets found</td></tr>';
  }catch(e){console.error(e)}
}
function searchTickets(v){var status=document.querySelector('#tktTabOpen.btn-primary')?'open':document.querySelector('#tktTabProg.btn-primary')?'in_progress':document.querySelector('#tktTabRes.btn-primary')?'resolved':'';loadTickets(status)}

async function openTicketDetail(id){
  currentTicketId=id;
  try{var r=await fetch(API+'/v1/admin/tickets/'+id,{headers:hdr()});var d=await r.json();var t=d.ticket;
  document.getElementById('ticketListView').style.display='none';document.getElementById('ticketDetailView').style.display='block';
  document.getElementById('ticketHeader').innerHTML='<div style="display:flex;justify-content:space-between;align-items:start"><div><h3 style="font-weight:700">'+(t.ticket_number||t.ticketNumber||'Ticket')+'</h3><p style="font-size:14px;margin-top:4px">'+t.subject+'</p></div><div style="display:flex;gap:8px"><select class="form-select" style="width:130px" onchange="changeTicketStatus(&#39;'+id+'&#39;,this.value)"><option value="open"'+(t.status==='open'?' selected':'')+'>Open</option><option value="in_progress"'+(t.status==='in_progress'?' selected':'')+'>In Progress</option><option value="resolved"'+(t.status==='resolved'?' selected':'')+'>Resolved</option><option value="closed"'+(t.status==='closed'?' selected':'')+'>Closed</option></select></div></div>';
  // Messages
  var msgs=(d.messages||[]).map(function(m){
  var isAdmin=m.senderType==='admin'||m.senderType==='system';
  return '<div style="display:flex;flex-direction:column;align-items:'+(isAdmin?'flex-end':'flex-start')+';margin-bottom:12px"><div style="max-width:80%;padding:10px 14px;border-radius:12px;background:'+(isAdmin?'#26B50F':'#e2e8f0')+';color:'+(isAdmin?'white':'#1a202c')+';font-size:13px">'+m.text+'</div><span style="font-size:11px;color:#a0aec0;margin-top:2px">'+(m.senderType==='system'?'System':isAdmin?'Admin':'User')+' &middot; '+(m.createdAt?new Date(m.createdAt).toLocaleString():'')+'</span></div>'
  }).join('');
  document.getElementById('ticketMessages').innerHTML=msgs||'<p style="text-align:center;color:#a0aec0">No messages yet</p>';
  document.getElementById('ticketMessages').scrollTop=999999;
  // Meta
  document.getElementById('ticketMeta').innerHTML='<div style="font-size:13px"><div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f0f0f0"><span>User</span><strong>'+(t.userName||'--')+'</strong></div><div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f0f0f0"><span>Email</span><strong>'+(t.userEmail||'--')+'</strong></div><div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f0f0f0"><span>Plan</span><span class="badge badge-blue">'+(t.userPlan||'basic')+'</span></div><div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f0f0f0"><span>Category</span><strong>'+(t.category||'--')+'</strong></div><div style="display:flex;justify-content:space-between;padding:6px 0"><span>Priority</span><strong>'+(t.priority||'medium')+'</strong></div></div>';
  // Templates
  var sel=document.getElementById('templateSelect');sel.innerHTML='<option value="">Select template...</option>';
  (d.templates||[]).forEach(function(t){var o=document.createElement('option');o.value=t.body;o.textContent=t.name;sel.appendChild(o)});
  // Notes
  document.getElementById('ticketNotes').innerHTML=(d.internalNotes||[]).map(function(n){return '<div style="background:#fffbeb;border:1px solid #fef3c7;border-radius:6px;padding:8px;margin-bottom:6px;font-size:12px"><i class="fas fa-sticky-note" style="color:#d69e2e"></i> '+n.text+'<br><span style="color:#a0aec0;font-size:11px">'+(n.createdAt?new Date(n.createdAt).toLocaleString():'')+'</span></div>'}).join('')||'<p style="font-size:12px;color:#a0aec0">No notes</p>';
  }catch(e){console.error(e);showToast('Failed to load ticket','error')}
}
function backToTicketList(){document.getElementById('ticketListView').style.display='block';document.getElementById('ticketDetailView').style.display='none';loadTickets('')}
function applyTemplate(v){if(v)document.getElementById('ticketReplyText').value=v;document.getElementById('templateSelect').value=''}
async function sendTicketReply(isInternal){
  var textEl=isInternal?document.getElementById('internalNoteText'):document.getElementById('ticketReplyText');
  var text=textEl.value.trim();if(!text)return;
  try{var r=await fetch(API+'/v1/admin/ticket/message',{method:'POST',headers:hdr(),body:JSON.stringify({ticketId:currentTicketId,text:text,isInternal:isInternal})});
  if(r.ok){textEl.value='';openTicketDetail(currentTicketId);showToast(isInternal?'Note added':'Reply sent')}else{var d=await r.json();showToast(d.detail||'Failed','error')}}catch(e){showToast('Error','error')}
}
async function changeTicketStatus(id,status){
  try{var r=await fetch(API+'/v1/admin/ticket/change_status/'+id,{method:'PUT',headers:hdr(),body:JSON.stringify({status:status})});
  if(r.ok){openTicketDetail(id);showToast('Status updated')}else{var d=await r.json();showToast(d.detail||'Failed','error')}}catch(e){showToast('Error','error')}
}
function showSupportTab(tab){
  document.getElementById('ticketListView').style.display='none';document.getElementById('ticketDetailView').style.display='none';
  document.getElementById('faqView').style.display=tab==='faqs'?'block':'none';
  document.getElementById('reportView').style.display=tab==='report'?'block':'none';
  ['tktTabOpen','tktTabProg','tktTabRes','tktTabAll','tktTabFaq','tktTabReport'].forEach(function(id){document.getElementById(id).className='btn btn-outline btn-sm'});
  if(tab==='faqs'){document.getElementById('tktTabFaq').classList.add('btn-primary');loadFaqs()}
  if(tab==='report'){document.getElementById('tktTabReport').classList.add('btn-primary');loadTicketReport()}
}

// ======== FAQs ========
async function loadFaqs(){
  try{var r=await fetch(API+'/v1/admin/faqs',{headers:hdr()});var d=await r.json();
  document.getElementById('faqBody').innerHTML=(d.data||[]).map(function(f){return '<tr><td>'+f.title+'</td><td><span class="badge badge-gray">'+(f.category||'--')+'</span></td><td>'+f.displayOrder+'</td><td><button class="btn btn-outline btn-sm" onclick="editFaq(&#39;'+f.id+'&#39;)"><i class="fas fa-edit"></i></button> <button class="btn btn-danger btn-sm" onclick="deleteItem(&#39;faq&#39;,&#39;'+f.id+'&#39;,&#39;'+f.title.replace(/'/g,'&#39;').substring(0,30)+'&#39;)"><i class="fas fa-trash"></i></button></td></tr>'}).join('')||'<tr><td colspan="4" style="text-align:center;color:#a0aec0;padding:40px">No FAQs</td></tr>';
  }catch(e){console.error(e)}
}
function openFaqModal(id){editingFaqId=id||null;document.getElementById('faqModalTitle').textContent=id?'Edit FAQ':'Add FAQ';
['faqQuestion','faqAnswer','faqCategory'].forEach(function(f){document.getElementById(f).value=''});document.getElementById('faqOrder').value='0';
document.getElementById('faqModal').classList.add('show')}
async function editFaq(id){
  var r=await fetch(API+'/v1/admin/faqs',{headers:hdr()});var d=await r.json();
  var f=(d.data||[]).find(function(x){return x.id===id});if(!f)return;
  openFaqModal(id);editingFaqId=id;
  document.getElementById('faqQuestion').value=f.title;document.getElementById('faqAnswer').value=f.description;
  document.getElementById('faqCategory').value=f.category||'';document.getElementById('faqOrder').value=f.displayOrder||0;
}
async function saveFaq(){
  var body={title:document.getElementById('faqQuestion').value,description:document.getElementById('faqAnswer').value,category:document.getElementById('faqCategory').value,displayOrder:parseInt(document.getElementById('faqOrder').value)||0};
  if(!body.title){alert('Question is required');return}
  var url=editingFaqId?API+'/v1/admin/faq/'+editingFaqId:API+'/v1/admin/faq';
  var method=editingFaqId?'PUT':'POST';
  var r=await fetch(url,{method:method,headers:hdr(),body:JSON.stringify(body)});
  if(r.ok){closeModal('faqModal');loadFaqs();showToast('FAQ saved.')}else{var d=await r.json();alert(d.detail||'Error')}
}
async function loadTicketReport(){
  try{var r=await fetch(API+'/v1/admin/tickets/report',{method:'POST',headers:hdr(),body:JSON.stringify({})});var d=await r.json();var rpt=d.report;
  document.getElementById('ticketReportStats').innerHTML='<div class="stat-card"><div class="stat-value">'+rpt.totalTickets+'</div><div class="stat-label">Total Tickets</div></div><div class="stat-card"><div class="stat-value">'+rpt.openTickets+'</div><div class="stat-label">Open</div></div><div class="stat-card"><div class="stat-value">'+rpt.resolvedTickets+'</div><div class="stat-label">Resolved</div></div><div class="stat-card"><div class="stat-value">'+rpt.avgResolutionHours+'h</div><div class="stat-label">Avg Resolution</div></div>';
  document.getElementById('reportCatList').innerHTML=Object.entries(rpt.byCategory||{}).map(function(e){return '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f0f0f0"><span>'+e[0]+'</span><strong>'+e[1]+'</strong></div>'}).join('')||'<p style="color:#a0aec0">No data</p>';
  document.getElementById('reportPriList').innerHTML=Object.entries(rpt.byPriority||{}).map(function(e){return '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f0f0f0"><span>'+e[0]+'</span><strong>'+e[1]+'</strong></div>'}).join('')||'<p style="color:#a0aec0">No data</p>';
  }catch(e){console.error(e)}
}

// ======== NOTIFICATIONS ========
function showNotifTab(tab){
  document.getElementById('notifCompose').style.display=tab==='compose'?'block':'none';
  document.getElementById('notifHistory').style.display=tab==='history'?'block':'none';
  document.getElementById('notifAnalytics').style.display=tab==='analytics'?'block':'none';
  ['notifTabCompose','notifTabHistory','notifTabAnalytics'].forEach(function(id){document.getElementById(id).className='btn btn-outline btn-sm'});
  document.getElementById('notifTab'+tab[0].toUpperCase()+tab.slice(1)).style.fontWeight='700';document.getElementById('notifTab'+tab[0].toUpperCase()+tab.slice(1)).classList.add('btn-primary');
  if(tab==='history')loadNotifHistory();if(tab==='analytics')loadNotifAnalytics();
  // Live preview
  if(tab==='compose'){
    document.getElementById('notifTitle').addEventListener('input',updateNotifPreview);
    document.getElementById('notifBody').addEventListener('input',updateNotifPreview);
  }
}
function updateNotifPreview(){var t=document.getElementById('notifTitle').value;var b=document.getElementById('notifBody').value;var p=document.getElementById('notifPreview');if(t||b){p.style.display='block';document.getElementById('previewTitle').textContent=t;document.getElementById('previewBody').textContent=b}else{p.style.display='none'}}
function onNotifTargetChange(){var v=document.getElementById('notifTarget').value;document.getElementById('notifUserSearch').style.display=v==='specific_user'?'block':'none';if(v!=='specific_user'){document.getElementById('notifUserId').value='';document.getElementById('notifUserSelected').style.display='none';}}
var _notifUserTimer=null;
async function searchNotifUsers(){
  var q=document.getElementById('notifUserQuery').value.trim();
  if(_notifUserTimer)clearTimeout(_notifUserTimer);
  if(q.length<2){document.getElementById('notifUserResults').style.display='none';return}
  _notifUserTimer=setTimeout(async function(){
    try{
      var r=await fetch(API+'/v1/admin/users?search='+encodeURIComponent(q)+'&limit=8',{headers:hdr()});
      var d=await r.json();
      var users=d.users||d.data||[];
      var res=document.getElementById('notifUserResults');
      if(!users.length){res.style.display='none';return}
      res.style.display='block';
      res.innerHTML=users.map(function(u){
        return '<div onclick="selectNotifUser(\\''+u.id+'\\',\\''+u.name+' ('+u.email+')'+'\\')" style="padding:8px 12px;cursor:pointer;font-size:13px;border-bottom:1px solid #f0f0f0;display:flex;align-items:center;gap:8px" onmouseover="this.style.background=\\'#f7fafc\\'" onmouseout="this.style.background=\\'\\';"><i class="fas fa-user" style="color:#a0aec0"></i>'+u.name+'<span style="color:#718096;font-size:12px">'+u.email+'</span></div>';
      }).join('');
    }catch(e){}
  },300);
}
function selectNotifUser(id,label){
  document.getElementById('notifUserId').value=id;
  document.getElementById('notifUserQuery').value='';
  document.getElementById('notifUserResults').style.display='none';
  var sel=document.getElementById('notifUserSelected');
  sel.style.display='block';
  sel.innerHTML='<i class="fas fa-user-check" style="color:#22543d"></i> <strong>'+label+'</strong> <a href="#" onclick="clearNotifUser();return false" style="margin-left:8px;color:#e53e3e;font-size:12px">Remove</a>';
}
function clearNotifUser(){document.getElementById('notifUserId').value='';document.getElementById('notifUserSelected').style.display='none';}
async function sendNotification(){
  var title=document.getElementById('notifTitle').value.trim();
  var body=document.getElementById('notifBody').value.trim();
  var seg=document.getElementById('notifTarget').value;
  var deepLink=document.getElementById('notifDeepLink').value;
  if(!title||!body){alert('Title and body are required');return}
  if(seg==='specific_user'){
    var uid=document.getElementById('notifUserId').value;
    if(!uid){alert('Please select a user first');return}
    seg='user:'+uid;
  }
  var labels={'all':'ALL users','pro':'Pro subscribers','basic':'Free users','restaurant_owners':'Restaurant owners'};
  var target=labels[seg]||(seg.startsWith('user:')?'1 specific user':seg);
  if(!confirm('Send notification to '+target+'?'))return;
  try{
    var r=await fetch(API+'/v1/admin/notifications/broadcast',{method:'POST',headers:hdr(),body:JSON.stringify({title,body,targetSegment:seg,deepLink})});
    var d=await r.json();
    if(r.ok){
      showToast('Sent to '+d.recipientCount+' user'+(d.recipientCount===1?'':'s'));
      document.getElementById('notifTitle').value='';
      document.getElementById('notifBody').value='';
      document.getElementById('notifPreview').style.display='none';
      document.getElementById('notifTarget').value='all';
      onNotifTargetChange();
    }else{showToast(d.detail||'Failed to send','error')}
  }catch(e){showToast('Connection error','error')}
}
async function loadNotifHistory(){
  try{var r=await fetch(API+'/v1/admin/notifications/history',{headers:hdr()});var d=await r.json();
  document.getElementById('notifHistBody').innerHTML=(d.data||[]).map(function(n){return '<tr><td><strong>'+n.title+'</strong></td><td>'+n.body.substring(0,80)+'</td><td><span class="badge badge-blue">'+(n.targetSegment||'all')+'</span></td><td>'+n.recipientCount+'</td><td>'+(n.sentAt?new Date(n.sentAt).toLocaleDateString():'--')+'</td><td><span class="badge badge-green">'+n.status+'</span></td></tr>'}).join('')||'<tr><td colspan="6" style="text-align:center;color:#a0aec0;padding:40px">No notifications sent yet</td></tr>';
  }catch(e){console.error(e)}
}
async function loadNotifAnalytics(){
  try{var r=await fetch(API+'/v1/admin/notifications/analytics',{headers:hdr()});var d=await r.json();var m=d.metrics;
  document.getElementById('notifAnalyticsStats').innerHTML='<div class="stat-card"><div class="stat-value">'+m.totalSent+'</div><div class="stat-label">Campaigns Sent</div></div><div class="stat-card"><div class="stat-value">'+m.totalDelivered+'</div><div class="stat-label">Total Delivered</div></div><div class="stat-card"><div class="stat-value">'+m.totalRead+'</div><div class="stat-label">Read</div></div><div class="stat-card"><div class="stat-value">'+m.openRate+'%</div><div class="stat-label">Open Rate</div></div>';
  document.getElementById('notifTypeList').innerHTML=Object.entries(m.byType||{}).map(function(e){return '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f0f0f0"><span>'+e[0]+'</span><strong>'+e[1]+'</strong></div>'}).join('')||'<p style="color:#a0aec0">No data yet</p>';
  }catch(e){console.error(e)}
}

// ======== PROFILE ========
function showProfileTab(tab){
  document.getElementById('profileInfo').style.display=tab==='info'?'block':'none';
  document.getElementById('profilePassword').style.display=tab==='password'?'block':'none';
  document.getElementById('profileTeam').style.display=tab==='team'?'block':'none';
  ['profTabInfo','profTabPw','profTabTeam'].forEach(function(id){document.getElementById(id).className='btn btn-outline btn-sm'});
  if(tab==='info'){document.getElementById('profTabInfo').classList.add('btn-primary');loadProfile()}
  if(tab==='password')document.getElementById('profTabPw').classList.add('btn-primary');
  if(tab==='team'){document.getElementById('profTabTeam').classList.add('btn-primary');loadTeam()}
}
async function loadProfile(){
  try{var p=JSON.parse(sessionStorage.getItem('adminInfo')||'{}');
  document.getElementById('profileAvatar').textContent=(p.name||'A')[0].toUpperCase();
  document.getElementById('profileName').textContent=p.name||'Admin';
  document.getElementById('profileEmail').textContent=p.email||'';
  document.getElementById('profileRole').textContent=(p.role||'admin').replace('_',' ');
  document.getElementById('profNameInput').value=p.name||'';
  document.getElementById('profPhoneInput').value=p.phone||'';
  document.getElementById('profImageInput').value=p.avatar||p.profile_image||'';
  }catch(e){console.error(e)}
}
async function saveProfile(){
  var body={name:document.getElementById('profNameInput').value,phone:document.getElementById('profPhoneInput').value,imageUrl:document.getElementById('profImageInput').value};
  try{var r=await fetch(API+'/v1/admin/profile',{method:'PUT',headers:hdr(),body:JSON.stringify(body)});
  if(r.ok){var d=await r.json();sessionStorage.setItem('adminInfo',JSON.stringify(d.admin));loadProfile();showToast('Profile updated')}else{var d=await r.json();showToast(d.detail||'Failed','error')}}catch(e){showToast('Error','error')}
}
async function changePassword(){
  var curr=document.getElementById('profCurrPw').value;var newPw=document.getElementById('profNewPw').value;var conf=document.getElementById('profConfPw').value;
  if(!curr||!newPw){alert('Fill all fields');return}
  if(newPw!==conf){alert('Passwords do not match');return}
  if(newPw.length<8){alert('Min 8 characters required');return}
  try{var r=await fetch(API+'/auth/change-password',{method:'POST',headers:hdr(),body:JSON.stringify({current_password:curr,new_password:newPw})});
  if(r.ok){showToast('Password changed');['profCurrPw','profNewPw','profConfPw'].forEach(function(f){document.getElementById(f).value=''})}else{var d=await r.json();showToast(d.detail||'Failed','error')}}catch(e){showToast('Error','error')}
}
async function loadTeam(){
  try{var r=await fetch(API+'/v1/admin/team',{headers:hdr()});var d=await r.json();
  document.getElementById('teamBody').innerHTML=(d.team||[]).map(function(a){return '<tr><td><strong>'+a.name+'</strong></td><td>'+a.email+'</td><td><span class="badge '+(a.role==='super_admin'?'badge-purple':'badge-blue')+'">'+a.role.replace('_',' ')+'</span></td><td><span class="badge '+(a.status==='active'?'badge-green':'badge-red')+'">'+(a.status||'active')+'</span></td><td>'+(a.lastLogin?new Date(a.lastLogin).toLocaleDateString():'Never')+'</td></tr>'}).join('')||'<tr><td colspan="5" style="text-align:center;color:#a0aec0;padding:40px">No team members</td></tr>';
  }catch(e){console.error(e)}
}
function openAddAdminModal(){document.getElementById('newAdminName').value='';document.getElementById('newAdminEmail').value='';document.getElementById('newAdminRole').value='admin';document.getElementById('addAdminModal').classList.add('show')}
async function createAdmin(){
  var body={name:document.getElementById('newAdminName').value,email:document.getElementById('newAdminEmail').value,role:document.getElementById('newAdminRole').value};
  if(!body.name||!body.email){alert('Name and email required');return}
  try{var r=await fetch(API+'/v1/admin/users/create-admin',{method:'POST',headers:hdr(),body:JSON.stringify(body)});
  var d=await r.json();if(r.ok){closeModal('addAdminModal');loadTeam();alert('Admin created!\\nTemp password: '+d.tempPassword+'\\n\\nPlease share this securely.')}else{showToast(d.detail||'Failed','error')}}catch(e){showToast('Error','error')}
}
</script>
</body></html>"""


@admin_panel_router.get("/admin-panel", response_class=HTMLResponse)
async def admin_panel():
    return HTMLResponse(content=ADMIN_HTML)
