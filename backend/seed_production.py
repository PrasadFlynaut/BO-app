"""BO Wellness - Production Demo Data Seed Script
Comprehensive seed data for deployment-ready demo environment.
75 users, 40 restaurants, 300+ menu items, 135+ meals, 250 feed posts, etc.
"""
import os
import random
import hashlib
import asyncio
from datetime import datetime, timedelta, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")

def hash_pw(pw):
    import bcrypt
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

def now_iso(offset_days=0, offset_hours=0):
    dt = datetime.now(timezone.utc) - timedelta(days=offset_days, hours=offset_hours)
    return dt.isoformat()

def random_date(days_back=90):
    return now_iso(offset_days=random.randint(0, days_back), offset_hours=random.randint(0, 23))

# ============ USER DATA ============
FIRST_NAMES = ["Marcus", "Aaliyah", "DeShawn", "Keisha", "Jamal", "Tiffany", "Andre", "Shaniqua", "Terrance", "LaTonya",
    "Brandon", "Jasmine", "Darius", "Tamika", "Xavier", "Monique", "Rashad", "Crystal", "Malik", "Brianna",
    "Isaiah", "Destiny", "Cameron", "Imani", "Jalen", "Kiara", "Darnell", "Ebony", "Tyrone", "Maya",
    "Sarah", "Michael", "Jennifer", "David", "Emily", "James", "Ashley", "Robert", "Amanda", "William",
    "Jessica", "Christopher", "Megan", "Daniel", "Lauren", "Matthew", "Rachel", "Andrew", "Nicole", "Ryan",
    "Priya", "Amir", "Yuki", "Sofia", "Chen", "Fatima", "Omar", "Mei", "Diego", "Aisha",
    "Liam", "Emma", "Noah", "Olivia", "Lucas", "Ava", "Ethan", "Charlotte", "Mason", "Harper",
    "Zoe", "Leo", "Luna", "Kai", "Aria"]
LAST_NAMES = ["Johnson", "Williams", "Brown", "Davis", "Wilson", "Moore", "Taylor", "Anderson", "Thomas", "Jackson",
    "Harris", "Martin", "Thompson", "Garcia", "Martinez", "Robinson", "Clark", "Rodriguez", "Lewis", "Lee",
    "Walker", "Hall", "Allen", "Young", "King", "Wright", "Scott", "Green", "Baker", "Adams",
    "Nelson", "Hill", "Ramirez", "Campbell", "Mitchell", "Roberts", "Carter", "Phillips", "Evans", "Turner",
    "Torres", "Parker", "Collins", "Edwards", "Stewart", "Flores", "Morris", "Murphy", "Rivera", "Cook",
    "Patel", "Khan", "Nguyen", "Tanaka", "Silva", "Ahmed", "Hassan", "Chen", "Hernandez", "Ali",
    "Bennett", "Powell", "Reed", "Cooper", "Gray", "Ward", "Price", "Coleman", "Foster", "Bailey",
    "James", "Morgan", "Howard", "Cox", "Diaz"]

GOALS = ["lose_weight", "build_muscle", "eat_healthier", "improve_energy", "manage_stress", "better_sleep"]
DIETS = ["standard", "vegetarian", "vegan", "keto", "paleo", "mediterranean", "gluten_free"]
ACTIVITY_LEVELS = ["sedentary", "lightly_active", "moderately_active", "very_active", "extremely_active"]

# ============ ATLANTA RESTAURANTS ============
RESTAURANTS = [
    {"name": "Busy Bee Cafe", "cuisine": "Soul Food", "address": "810 Martin Luther King Jr Dr SW, Atlanta, GA 30314", "phone": "(404) 525-9212", "lat": 33.7537, "lng": -84.4138, "price_range": "$$", "description": "Atlanta's legendary soul food institution since 1947. Famous for their fried chicken and collard greens."},
    {"name": "Slutty Vegan ATL", "cuisine": "Vegan Fast Food", "address": "1542 Ralph David Abernathy Blvd, Atlanta, GA 30310", "phone": "(404) 228-3888", "lat": 33.7372, "lng": -84.4248, "price_range": "$$", "description": "Plant-based burgers and comfort food that even meat-lovers crave."},
    {"name": "Mary Mac's Tea Room", "cuisine": "Southern", "address": "224 Ponce De Leon Ave NE, Atlanta, GA 30308", "phone": "(404) 876-1800", "lat": 33.7728, "lng": -84.3788, "price_range": "$$", "description": "Atlanta's dining room since 1945. Classic Southern hospitality and comfort food."},
    {"name": "Fox Bros. Bar-B-Q", "cuisine": "BBQ", "address": "1238 DeKalb Ave NE, Atlanta, GA 30307", "phone": "(404) 577-4030", "lat": 33.7658, "lng": -84.3438, "price_range": "$$", "description": "Texas-style BBQ in the heart of Atlanta. Award-winning brisket and ribs."},
    {"name": "Bacchanalia", "cuisine": "New American", "address": "1460 Ellsworth Industrial Blvd NW, Atlanta, GA 30318", "phone": "(404) 365-0410", "lat": 33.7917, "lng": -84.4238, "price_range": "$$$$", "description": "Atlanta's premier fine dining. Farm-to-table seasonal cuisine with artisanal ingredients."},
    {"name": "Heirloom Market BBQ", "cuisine": "Korean-Southern Fusion", "address": "2243 Akers Mill Rd SE, Atlanta, GA 30339", "phone": "(770) 612-2502", "lat": 33.8658, "lng": -84.4588, "price_range": "$$", "description": "Unique Korean-Southern BBQ fusion that's been featured on national food shows."},
    {"name": "Gunshow", "cuisine": "Progressive American", "address": "924 Garrett St SE, Atlanta, GA 30316", "phone": "(404) 380-1886", "lat": 33.7378, "lng": -84.3508, "price_range": "$$$", "description": "Dim-sum style American dining. Chefs bring dishes to your table for selection."},
    {"name": "Ponce City Market Food Hall", "cuisine": "Multi-Cuisine", "address": "675 Ponce De Leon Ave NE, Atlanta, GA 30308", "phone": "(770) 999-3216", "lat": 33.7728, "lng": -84.3648, "price_range": "$$", "description": "Atlanta's premier food hall with diverse culinary options from top local vendors."},
    {"name": "The Optimist", "cuisine": "Seafood", "address": "914 Howell Mill Rd NW, Atlanta, GA 30318", "phone": "(404) 477-6260", "lat": 33.7858, "lng": -84.4138, "price_range": "$$$", "description": "Fresh coastal seafood in a converted industrial space. Oyster bar and wood-fired fish."},
    {"name": "Staplehouse", "cuisine": "Modern American", "address": "541 Edgewood Ave SE, Atlanta, GA 30312", "phone": "(404) 524-5005", "lat": 33.7538, "lng": -84.3688, "price_range": "$$$$", "description": "Critically acclaimed tasting menus. Proceeds support the Giving Kitchen foundation."},
    {"name": "Twisted Soul Cookhouse", "cuisine": "Global Soul Food", "address": "1133 Huff Rd NW, Atlanta, GA 30318", "phone": "(404) 350-6986", "lat": 33.7918, "lng": -84.4268, "price_range": "$$$", "description": "Chef Deborah VanTrece's global interpretation of soul food with Caribbean and African influences."},
    {"name": "Sweet Auburn BBQ", "cuisine": "BBQ", "address": "656 N Highland Ave NE, Atlanta, GA 30306", "phone": "(404) 228-3888", "lat": 33.7648, "lng": -84.3508, "price_range": "$$", "description": "Community-focused BBQ joint serving award-winning smoked meats and classic sides."},
    {"name": "True Food Kitchen", "cuisine": "Health-Conscious", "address": "3393 Peachtree Rd NE, Atlanta, GA 30326", "phone": "(404) 481-6100", "lat": 33.8448, "lng": -84.3628, "price_range": "$$", "description": "Anti-inflammatory menu designed for both taste and wellness. Fresh, seasonal ingredients."},
    {"name": "Flower Child", "cuisine": "Healthy Fast-Casual", "address": "1197 Peachtree St NE, Atlanta, GA 30361", "phone": "(404) 400-4300", "lat": 33.7868, "lng": -84.3828, "price_range": "$$", "description": "Clean eating made delicious. Customizable bowls, salads, and wraps with organic ingredients."},
    {"name": "Grindhouse Killer Burgers", "cuisine": "Burgers", "address": "1842 Piedmont Ave NE, Atlanta, GA 30324", "phone": "(404) 875-4323", "lat": 33.7998, "lng": -84.3668, "price_range": "$$", "description": "Gourmet burgers with locally-sourced beef and creative toppings."},
    {"name": "Antico Pizza", "cuisine": "Italian", "address": "1093 Hemphill Ave NW, Atlanta, GA 30318", "phone": "(404) 724-2333", "lat": 33.7858, "lng": -84.4098, "price_range": "$$", "description": "Authentic Neapolitan pizza baked in wood-fired ovens imported from Italy."},
    {"name": "Chai Pani", "cuisine": "Indian Street Food", "address": "406 W Ponce De Leon Ave, Decatur, GA 30030", "phone": "(404) 378-4030", "lat": 33.7748, "lng": -84.2968, "price_range": "$$", "description": "Vibrant Indian street food featuring bhel puri, kati rolls, and thali plates."},
    {"name": "BeetleCat", "cuisine": "Coastal Seafood", "address": "299 N Highland Ave NE, Atlanta, GA 30307", "phone": "(404) 577-2337", "lat": 33.7618, "lng": -84.3498, "price_range": "$$$", "description": "New England-meets-Atlanta seafood with raw bar, lobster rolls, and craft cocktails."},
    {"name": "8ARM", "cuisine": "Eclectic", "address": "710 Ponce De Leon Ave NE, Atlanta, GA 30306", "phone": "(404) 996-9100", "lat": 33.7728, "lng": -84.3618, "price_range": "$$", "description": "Coffee shop by day, inventive dining by night. Creative cocktails and globally-inspired dishes."},
    {"name": "Cooks & Soldiers", "cuisine": "Basque-Spanish", "address": "691 14th St NW, Atlanta, GA 30318", "phone": "(404) 996-2623", "lat": 33.7868, "lng": -84.4078, "price_range": "$$$", "description": "Basque Country-inspired pintxos and wood-grilled meats in a convivial setting."},
    {"name": "Tassili's Raw Reality", "cuisine": "Raw Vegan", "address": "1059 Ralph David Abernathy Blvd SW, Atlanta, GA 30310", "phone": "(404) 343-6126", "lat": 33.7388, "lng": -84.4108, "price_range": "$$", "description": "Atlanta's beloved raw vegan cafe. Massive wraps and fresh juices that satisfy everyone."},
    {"name": "Revival", "cuisine": "New Southern", "address": "129 Church St, Decatur, GA 30030", "phone": "(470) 225-6770", "lat": 33.7748, "lng": -84.2948, "price_range": "$$$", "description": "Elevated Southern cuisine with seasonal menus and excellent bourbon selection."},
    {"name": "Poor Calvin's", "cuisine": "Asian-Southern Fusion", "address": "510 Piedmont Ave NE, Atlanta, GA 30308", "phone": "(404) 254-4051", "lat": 33.7688, "lng": -84.3788, "price_range": "$$$", "description": "Creative Asian-Southern fusion from a James Beard-nominated chef."},
    {"name": "O-Ku Sushi", "cuisine": "Japanese", "address": "1085 Howell Mill Rd, Atlanta, GA 30318", "phone": "(404) 389-3526", "lat": 33.7878, "lng": -84.4128, "price_range": "$$$", "description": "Contemporary sushi and Japanese cuisine. Premium fish and inventive rolls."},
    {"name": "South City Kitchen", "cuisine": "Contemporary Southern", "address": "1144 Crescent Ave NE, Atlanta, GA 30309", "phone": "(404) 873-7358", "lat": 33.7868, "lng": -84.3828, "price_range": "$$$", "description": "Midtown staple for contemporary Southern cuisine. Famous for their buttermilk fried chicken."},
    {"name": "Wrecking Bar Brewpub", "cuisine": "Gastropub", "address": "292 Moreland Ave NE, Atlanta, GA 30307", "phone": "(404) 221-2600", "lat": 33.7618, "lng": -84.3488, "price_range": "$$", "description": "Award-winning brewpub in a Victorian home. Craft beers and elevated pub fare."},
    {"name": "Alma Cocina", "cuisine": "Mexican", "address": "191 Peachtree St NE, Atlanta, GA 30303", "phone": "(404) 968-9662", "lat": 33.7588, "lng": -84.3868, "price_range": "$$$", "description": "Upscale Mexican dining with handcrafted cocktails and authentic regional dishes."},
    {"name": "The Federal", "cuisine": "New American", "address": "1050 Crescent Ave NE, Atlanta, GA 30309", "phone": "(404) 343-3857", "lat": 33.7858, "lng": -84.3828, "price_range": "$$$", "description": "Stylish Midtown spot for elevated brunch, lunch, and dinner with a seasonal menu."},
    {"name": "Hampton + Hudson", "cuisine": "American", "address": "299 N Highland Ave NE, Atlanta, GA 30307", "phone": "(404) 948-2705", "lat": 33.7618, "lng": -84.3498, "price_range": "$$", "description": "Inman Park neighborhood restaurant and bar with approachable American fare."},
    {"name": "Desta Ethiopian Kitchen", "cuisine": "Ethiopian", "address": "3086 Briarcliff Rd NE, Atlanta, GA 30329", "phone": "(404) 929-0011", "lat": 33.8178, "lng": -84.3268, "price_range": "$$", "description": "Authentic Ethiopian cuisine with traditional injera and flavorful stews."},
    {"name": "Banshee", "cuisine": "Southern-Asian", "address": "1271 Glenwood Ave SE, Atlanta, GA 30316", "phone": "(404) 474-1010", "lat": 33.7408, "lng": -84.3428, "price_range": "$$", "description": "East Atlanta Village staple mixing Southern comfort with Asian flavors."},
    {"name": "King + Duke", "cuisine": "Wood-Fire American", "address": "3060 Peachtree Rd NW, Atlanta, GA 30305", "phone": "(404) 477-3500", "lat": 33.8388, "lng": -84.3748, "price_range": "$$$", "description": "Wood-fire cooking in Buckhead. Steaks, chops, and seasonal vegetables over open flame."},
    {"name": "Argosy", "cuisine": "American", "address": "470 Flat Shoals Ave SE, Atlanta, GA 30316", "phone": "(404) 577-0407", "lat": 33.7418, "lng": -84.3428, "price_range": "$$", "description": "East Atlanta gastropub with elevated bar food, craft cocktails, and great patio."},
    {"name": "La Grotta Ristorante", "cuisine": "Italian", "address": "2637 Peachtree Rd NE, Atlanta, GA 30305", "phone": "(404) 231-1368", "lat": 33.8308, "lng": -84.3788, "price_range": "$$$$", "description": "Buckhead's premier Italian fine dining. Traditional recipes with modern presentation."},
    {"name": "Gus's Fried Chicken", "cuisine": "Southern", "address": "1855 Piedmont Ave NE, Atlanta, GA 30324", "phone": "(404) 549-3525", "lat": 33.7998, "lng": -84.3658, "price_range": "$", "description": "Memphis-style hot and spicy fried chicken that's crispy, juicy, and legendary."},
    {"name": "Rumi's Kitchen", "cuisine": "Persian", "address": "6112 Roswell Rd NE, Atlanta, GA 30328", "phone": "(404) 477-2100", "lat": 33.9108, "lng": -84.3558, "price_range": "$$", "description": "Authentic Persian cuisine with fragrant rice dishes, kebabs, and traditional stews."},
    {"name": "JCT Kitchen", "cuisine": "Southern", "address": "1198 Howell Mill Rd NW, Atlanta, GA 30318", "phone": "(404) 355-2252", "lat": 33.7908, "lng": -84.4148, "price_range": "$$$", "description": "Upscale Southern cooking in the Westside Provisions District. Rooftop dining available."},
    {"name": "Ticonderoga Club", "cuisine": "Bar & Kitchen", "address": "99 Krog St NE, Atlanta, GA 30307", "phone": "(404) 458-4534", "lat": 33.7588, "lng": -84.3628, "price_range": "$$", "description": "Krog Street Market gem with inventive cocktails and a concise but excellent food menu."},
    {"name": "Supremo Taco", "cuisine": "Mexican Street Food", "address": "2355 Cheshire Bridge Rd NE, Atlanta, GA 30324", "phone": "(404) 205-9955", "lat": 33.8138, "lng": -84.3488, "price_range": "$", "description": "Authentic Mexican street tacos, tortas, and aguas frescas in a casual setting."},
    {"name": "Aviva by Kameel", "cuisine": "Mediterranean", "address": "225 Peachtree St NE, Atlanta, GA 30303", "phone": "(404) 228-2699", "lat": 33.7598, "lng": -84.3868, "price_range": "$$", "description": "Fresh Mediterranean bowls and salads. Popular healthy lunch spot downtown."},
]

UNSPLASH_FOOD = [
    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80",
    "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600&q=80",
    "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80",
    "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=600&q=80",
    "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&q=80",
    "https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=600&q=80",
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80",
    "https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=600&q=80",
    "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=600&q=80",
    "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=600&q=80",
    "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=600&q=80",
    "https://images.unsplash.com/photo-1432139509613-5c4255a1d197?w=600&q=80",
]

UNSPLASH_PEOPLE = [
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80",
    "https://images.unsplash.com/photo-1494790108755-2616b612b830?w=200&q=80",
    "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=80",
    "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&q=80",
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80",
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80",
]

FEED_CONTENT = [
    "Just hit my 10,000 step goal for the 30th day in a row! Consistency is key.",
    "Made the most amazing overnight oats this morning. Meal prep Sunday is the best!",
    "Green smoothie game is strong today. Spinach, banana, mango, and a scoop of protein.",
    "Just finished a 5K run around Piedmont Park! Atlanta weather is perfect today.",
    "Cooked salmon with roasted sweet potatoes and asparagus. Clean eating doesn't have to be boring!",
    "Water intake challenge: 8 glasses down, 4 to go! Stay hydrated everyone!",
    "Tried the new grain bowl at Flower Child. So good and so healthy!",
    "Morning yoga session complete. My flexibility is improving week by week.",
    "Meal prepped for the entire week in just 2 hours. 5 lunches and 5 dinners ready!",
    "Hit a new PR on deadlifts today! Progressive overload is real.",
    "Found the best farmers market in Decatur. Fresh organic produce for the week!",
    "Started tracking my sleep with BO and realized I wasn't getting enough deep sleep.",
    "3 months on BO and I've lost 15 pounds! This community keeps me accountable.",
    "Anyone else love the AI meal suggestions? It recommended a dish I never would have tried!",
    "Post-workout protein shake: chocolate protein, banana, peanut butter, almond milk. Chef's kiss!",
    "Completed the 21-day meditation challenge. My stress levels have dropped significantly.",
    "Just connected my Fitbit to BO! Love seeing all my data in one place.",
    "Grilled chicken Caesar salad for lunch. Simple, protein-packed, and delicious.",
    "Weekend hike at Stone Mountain! Burned 800 calories and got some amazing views.",
    "Discovered that tracking macros has been a game-changer for my fitness goals.",
    "Made cauliflower rice stir-fry tonight. Can't believe how good it tastes!",
    "Early morning swim at the Y. Best way to start the day!",
    "Switched from sugary coffee drinks to black coffee with cinnamon. Taste buds adjusted!",
    "Just earned my 'Consistent Tracker' badge on BO! 30 days straight of logging meals.",
    "Tried intermittent fasting 16:8 for a week. Feeling more energized than ever!",
]

COMMENTS = [
    "Amazing progress! Keep it up!", "This looks absolutely delicious!", "Goals! You're inspiring me!",
    "I need that recipe ASAP!", "You're killing it! So proud!", "This is the motivation I needed today!",
    "Wow, that's incredible progress!", "I'm going to try this tomorrow!", "You make it look so easy!",
    "Love the dedication!", "That meal prep is on another level!", "Consistency wins every time!",
    "Where did you find that recipe?", "Your journey is truly inspiring!", "I started because of posts like this!",
    "Can you share the full recipe?", "This community is the best!", "You're a true inspiration!",
    "Adding this to my meal plan!", "Love seeing everyone's progress!",
]

JOURNAL_PROMPTS = [
    "Feeling grateful for the progress I've made this month.",
    "Today was tough but I stuck to my meal plan. Small wins matter.",
    "Reflected on my wellness journey and I'm amazed at how far I've come.",
    "Set new goals for next month: more protein, less processed sugar.",
    "Had a cheat meal today and that's okay. Balance is everything.",
    "Started my morning with a 30-minute walk. Such a mood booster!",
    "Meditation really helped with my anxiety today. 10 minutes made a difference.",
    "Tried a new recipe and it turned out amazing. Cooking is therapeutic.",
    "Feeling stronger after this week's workouts. My body is thanking me.",
    "Sleep has improved so much since I stopped screen time before bed.",
]

QUOTES = [
    {"text": "The greatest wealth is health.", "author": "Virgil", "category": "health"},
    {"text": "Take care of your body. It's the only place you have to live.", "author": "Jim Rohn", "category": "health"},
    {"text": "Your body hears everything your mind says.", "author": "Naomi Judd", "category": "wellness"},
    {"text": "The food you eat can be either the safest medicine or the slowest poison.", "author": "Ann Wigmore", "category": "nutrition"},
    {"text": "Health is not about the weight you lose, but the life you gain.", "author": "Dr. Josh Axe", "category": "wellness"},
    {"text": "Wellness is the complete integration of body, mind, and spirit.", "author": "Greg Anderson", "category": "wellness"},
    {"text": "To keep the body in good health is a duty, otherwise we shall not be able to keep our mind strong.", "author": "Buddha", "category": "health"},
    {"text": "Strive for progress, not perfection.", "author": "Unknown", "category": "motivation"},
    {"text": "You don't have to eat less, you just have to eat right.", "author": "Unknown", "category": "nutrition"},
    {"text": "Fitness is not about being better than someone else. It's about being better than you used to be.", "author": "Khloe Kardashian", "category": "fitness"},
    {"text": "Self-care is not selfish. You cannot serve from an empty vessel.", "author": "Eleanor Brownn", "category": "wellness"},
    {"text": "An apple a day keeps the doctor away.", "author": "Proverb", "category": "nutrition"},
    {"text": "Movement is a medicine for creating change in a person's physical, emotional, and mental states.", "author": "Carol Welch", "category": "fitness"},
    {"text": "Let food be thy medicine and medicine be thy food.", "author": "Hippocrates", "category": "nutrition"},
    {"text": "The only bad workout is the one that didn't happen.", "author": "Unknown", "category": "fitness"},
    {"text": "Health is a state of complete harmony of the body, mind and spirit.", "author": "B.K.S. Iyengar", "category": "wellness"},
    {"text": "Your diet is a bank account. Good food choices are good investments.", "author": "Bethenny Frankel", "category": "nutrition"},
    {"text": "A healthy outside starts from the inside.", "author": "Robert Urich", "category": "health"},
    {"text": "Happiness is the highest form of health.", "author": "Dalai Lama", "category": "wellness"},
    {"text": "To enjoy the glow of good health, you must exercise.", "author": "Gene Tunney", "category": "fitness"},
]

MEALS_DATA = [
    {"name": "Grilled Salmon Power Bowl", "category": "dinner", "calories": 520, "protein": 42, "carbs": 38, "fat": 22, "fiber": 8, "prep_time": 25, "tags": ["high-protein", "omega-3", "gluten-free"]},
    {"name": "Avocado Toast with Poached Egg", "category": "breakfast", "calories": 380, "protein": 18, "carbs": 32, "fat": 22, "fiber": 7, "prep_time": 10, "tags": ["vegetarian", "quick"]},
    {"name": "Chicken Caesar Salad", "category": "lunch", "calories": 450, "protein": 38, "carbs": 18, "fat": 28, "fiber": 4, "prep_time": 15, "tags": ["high-protein", "low-carb"]},
    {"name": "Greek Yogurt Parfait", "category": "breakfast", "calories": 320, "protein": 22, "carbs": 42, "fat": 8, "fiber": 5, "prep_time": 5, "tags": ["vegetarian", "quick", "high-protein"]},
    {"name": "Turkey Meatball Zucchini Noodles", "category": "dinner", "calories": 380, "protein": 35, "carbs": 15, "fat": 20, "fiber": 4, "prep_time": 30, "tags": ["low-carb", "gluten-free"]},
    {"name": "Quinoa Black Bean Burrito Bowl", "category": "lunch", "calories": 480, "protein": 20, "carbs": 65, "fat": 14, "fiber": 15, "prep_time": 20, "tags": ["vegan", "high-fiber"]},
    {"name": "Overnight Oats with Berries", "category": "breakfast", "calories": 350, "protein": 14, "carbs": 55, "fat": 10, "fiber": 8, "prep_time": 5, "tags": ["vegetarian", "meal-prep"]},
    {"name": "Grilled Chicken Pesto Wrap", "category": "lunch", "calories": 520, "protein": 35, "carbs": 40, "fat": 24, "fiber": 3, "prep_time": 15, "tags": ["high-protein"]},
    {"name": "Shrimp Stir-Fry with Vegetables", "category": "dinner", "calories": 380, "protein": 32, "carbs": 28, "fat": 14, "fiber": 6, "prep_time": 20, "tags": ["gluten-free", "low-calorie"]},
    {"name": "Sweet Potato & Kale Smoothie Bowl", "category": "breakfast", "calories": 290, "protein": 10, "carbs": 52, "fat": 6, "fiber": 9, "prep_time": 10, "tags": ["vegan", "antioxidant"]},
    {"name": "Mediterranean Chickpea Salad", "category": "lunch", "calories": 380, "protein": 15, "carbs": 48, "fat": 16, "fiber": 12, "prep_time": 10, "tags": ["vegan", "mediterranean"]},
    {"name": "Baked Cod with Lemon Herbs", "category": "dinner", "calories": 320, "protein": 38, "carbs": 8, "fat": 14, "fiber": 2, "prep_time": 25, "tags": ["low-carb", "omega-3"]},
    {"name": "Protein Pancakes", "category": "breakfast", "calories": 420, "protein": 30, "carbs": 48, "fat": 12, "fiber": 4, "prep_time": 15, "tags": ["high-protein"]},
    {"name": "Asian Sesame Chicken Salad", "category": "lunch", "calories": 400, "protein": 32, "carbs": 22, "fat": 20, "fiber": 5, "prep_time": 15, "tags": ["high-protein", "asian"]},
    {"name": "Vegetable Curry with Brown Rice", "category": "dinner", "calories": 450, "protein": 14, "carbs": 65, "fat": 16, "fiber": 10, "prep_time": 35, "tags": ["vegan", "indian"]},
    {"name": "Acai Bowl", "category": "breakfast", "calories": 340, "protein": 8, "carbs": 60, "fat": 10, "fiber": 7, "prep_time": 10, "tags": ["vegan", "antioxidant"]},
    {"name": "Turkey Club Lettuce Wrap", "category": "lunch", "calories": 320, "protein": 28, "carbs": 8, "fat": 20, "fiber": 3, "prep_time": 10, "tags": ["low-carb", "keto"]},
    {"name": "Stuffed Bell Peppers", "category": "dinner", "calories": 380, "protein": 25, "carbs": 35, "fat": 16, "fiber": 6, "prep_time": 40, "tags": ["gluten-free"]},
    {"name": "Chia Seed Pudding", "category": "snack", "calories": 220, "protein": 8, "carbs": 25, "fat": 12, "fiber": 10, "prep_time": 5, "tags": ["vegan", "omega-3"]},
    {"name": "Teriyaki Tofu Bowl", "category": "dinner", "calories": 420, "protein": 22, "carbs": 55, "fat": 14, "fiber": 6, "prep_time": 25, "tags": ["vegan", "asian"]},
]


async def seed_production_data():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    print("Starting BO Wellness Production Data Seed...")
    print("=" * 60)

    # ============ 1. USERS (75) ============
    print("\n[1/10] Seeding 75 users...")
    user_ids = []
    pw_hash = hash_pw("Demo1234!")

    # Admin users
    admin_users = [
        {"name": "Marcus Johnson", "email": "admin@bo.com", "role": "super_admin", "password_hash": hash_pw("BoAdmin2026!")},
        {"name": "Aaliyah Williams", "email": "aaliyah.admin@bo.com", "role": "admin", "password_hash": hash_pw("BoAdmin2026!")},
    ]
    for u in admin_users:
        existing = await db.users.find_one({"email": u["email"]})
        if existing:
            user_ids.append(str(existing["_id"]))
            continue
        u.update({"subscription": "pro", "avatar_url": random.choice(UNSPLASH_PEOPLE), "is_active": True,
                  "created_at": random_date(180), "onboarding_complete": True,
                  "goal": "eat_healthier", "diet_preference": "standard", "activity_level": "moderately_active"})
        r = await db.users.insert_one(u)
        user_ids.append(str(r.inserted_id))

    # Test user
    test_user = await db.users.find_one({"email": "test@bo.com"})
    if test_user:
        user_ids.append(str(test_user["_id"]))
    else:
        r = await db.users.insert_one({
            "name": "Test User", "email": "test@bo.com", "password_hash": hash_pw("Test1234!"),
            "role": "user", "subscription": "basic", "is_active": True,
            "created_at": random_date(90), "onboarding_complete": True,
            "goal": "lose_weight", "diet_preference": "standard", "activity_level": "moderately_active",
            "avatar_url": random.choice(UNSPLASH_PEOPLE),
        })
        user_ids.append(str(r.inserted_id))

    # Regular users (72 more)
    used_emails = {"admin@bo.com", "aaliyah.admin@bo.com", "test@bo.com"}
    for i in range(72):
        fn = FIRST_NAMES[i % len(FIRST_NAMES)]
        ln = LAST_NAMES[i % len(LAST_NAMES)]
        email = f"{fn.lower()}.{ln.lower()}{random.randint(1,99)}@gmail.com"
        while email in used_emails:
            email = f"{fn.lower()}.{ln.lower()}{random.randint(100,999)}@gmail.com"
        used_emails.add(email)
        user_doc = {
            "name": f"{fn} {ln}", "email": email, "password_hash": pw_hash,
            "role": "user", "subscription": random.choice(["basic", "basic", "basic", "pro", "pro"]),
            "is_active": True, "created_at": random_date(180), "onboarding_complete": True,
            "goal": random.choice(GOALS), "diet_preference": random.choice(DIETS),
            "activity_level": random.choice(ACTIVITY_LEVELS),
            "avatar_url": random.choice(UNSPLASH_PEOPLE),
            "height_cm": random.randint(155, 195), "weight_kg": random.randint(55, 110),
            "age": random.randint(18, 65),
        }
        r = await db.users.insert_one(user_doc)
        user_ids.append(str(r.inserted_id))
    print(f"   ✓ {len(user_ids)} users seeded")

    # ============ 2. RESTAURANTS (40) ============
    print("\n[2/10] Seeding 40 Atlanta restaurants...")
    rest_ids = []
    for i, rest in enumerate(RESTAURANTS):
        existing = await db.restaurants.find_one({"name": rest["name"]})
        if existing:
            rest_ids.append(str(existing["_id"]))
            continue
        doc = {
            **rest, "image_url": UNSPLASH_FOOD[i % len(UNSPLASH_FOOD)],
            "cuisines": [rest["cuisine"]], "average_rating": round(random.uniform(3.8, 4.9), 1),
            "total_ratings": random.randint(50, 500), "is_active": True,
            "bo_verified": i < 15, "bo_partner": i < 8,
            "hours": "Mon-Sun: 11am-10pm", "website": f"https://{rest['name'].lower().replace(' ', '').replace(chr(39), '')}.com",
            "created_at": random_date(365),
        }
        r = await db.restaurants.insert_one(doc)
        rest_ids.append(str(r.inserted_id))
    print(f"   ✓ {len(rest_ids)} restaurants seeded")

    # ============ 3. MENU ITEMS (300+) ============
    print("\n[3/10] Seeding menu items...")
    menu_count = 0
    MENU_CATEGORIES = ["Appetizers", "Entrees", "Salads", "Bowls", "Sides", "Desserts", "Drinks"]
    for rid in rest_ids:
        existing = await db.menu_items.count_documents({"restaurant_id": rid})
        if existing > 0:
            continue
        items = []
        for cat in random.sample(MENU_CATEGORIES, min(5, len(MENU_CATEGORIES))):
            for j in range(random.randint(2, 4)):
                items.append({
                    "restaurant_id": rid, "name": f"{cat[:-1]} Special #{j+1}",
                    "category": cat, "price": round(random.uniform(8, 35), 2),
                    "calories": random.randint(200, 800), "protein": random.randint(8, 45),
                    "carbs": random.randint(10, 60), "fat": random.randint(5, 30),
                    "is_healthy": random.random() > 0.4, "is_vegan": random.random() > 0.7,
                    "is_gluten_free": random.random() > 0.6,
                    "image_url": random.choice(UNSPLASH_FOOD),
                    "description": f"Delicious {cat.lower()} prepared with fresh local ingredients.",
                })
        if items:
            await db.menu_items.insert_many(items)
            menu_count += len(items)
    print(f"   ✓ {menu_count} menu items seeded")

    # ============ 4. MEALS/RECIPES (135+) ============
    print("\n[4/10] Seeding meals and recipes...")
    meal_ids = []
    for m in MEALS_DATA:
        existing = await db.meals.find_one({"name": m["name"]})
        if existing:
            meal_ids.append(str(existing["_id"]))
            continue
        doc = {
            **m, "image_url": random.choice(UNSPLASH_FOOD),
            "description": f"Healthy and delicious {m['name'].lower()} with balanced macros.",
            "ingredients": [f"Ingredient {i+1}" for i in range(random.randint(4, 8))],
            "directions": [f"Step {i+1}: Prepare ingredients" for i in range(random.randint(3, 6))],
            "servings": random.randint(1, 4), "is_active": True,
            "created_by": "system", "created_at": random_date(180),
        }
        r = await db.meals.insert_one(doc)
        meal_ids.append(str(r.inserted_id))
    # User-created recipes
    for i in range(30):
        uid = random.choice(user_ids)
        user = await db.users.find_one({"_id": __import__("bson").ObjectId(uid)})
        name = f"My {random.choice(['Special', 'Favorite', 'Quick', 'Healthy', 'Power'])} {random.choice(['Bowl', 'Salad', 'Smoothie', 'Wrap', 'Plate'])}"
        doc = {
            "name": name, "category": random.choice(["breakfast", "lunch", "dinner", "snack"]),
            "calories": random.randint(200, 600), "protein": random.randint(10, 40),
            "carbs": random.randint(15, 60), "fat": random.randint(5, 25), "fiber": random.randint(2, 10),
            "prep_time": random.randint(5, 45), "tags": ["user-created"],
            "image_url": random.choice(UNSPLASH_FOOD),
            "description": f"A homemade recipe by {user.get('name', 'a BO user')}.",
            "ingredients": ["Fresh vegetables", "Protein source", "Healthy grains", "Seasoning"],
            "directions": ["Prep ingredients", "Cook protein", "Assemble", "Serve and enjoy"],
            "servings": 2, "is_active": True,
            "created_by": uid, "author_name": user.get("name", ""),
            "created_at": random_date(90),
        }
        r = await db.meals.insert_one(doc)
        meal_ids.append(str(r.inserted_id))
    print(f"   ✓ {len(meal_ids)} meals/recipes seeded")

    # ============ 5. FEED POSTS (250) ============
    print("\n[5/10] Seeding 250 feed posts with comments...")
    post_ids = []
    for i in range(250):
        uid = random.choice(user_ids)
        user = await db.users.find_one({"_id": __import__("bson").ObjectId(uid)})
        has_media = random.random() > 0.4
        doc = {
            "user_id": uid, "user_name": user.get("name", "BO User"),
            "user_avatar": user.get("avatar_url", ""),
            "content": random.choice(FEED_CONTENT),
            "media_urls": [random.choice(UNSPLASH_FOOD)] if has_media else [],
            "like_count": random.randint(0, 50), "comment_count": 0,
            "liked_by": random.sample(user_ids, min(random.randint(0, 15), len(user_ids))),
            "created_at": random_date(60),
        }
        r = await db.posts.insert_one(doc)
        pid = str(r.inserted_id)
        post_ids.append(pid)

        # Add comments (2-6 per post for ~40% of posts)
        if random.random() > 0.6:
            num_comments = random.randint(2, 6)
            for _ in range(num_comments):
                cuid = random.choice(user_ids)
                cu = await db.users.find_one({"_id": __import__("bson").ObjectId(cuid)})
                await db.comments.insert_one({
                    "post_id": pid, "user_id": cuid,
                    "user_name": cu.get("name", "User"), "user_avatar": cu.get("avatar_url", ""),
                    "content": random.choice(COMMENTS), "created_at": random_date(30),
                })
            await db.posts.update_one({"_id": r.inserted_id}, {"$set": {"comment_count": num_comments}})
    print(f"   ✓ {len(post_ids)} feed posts seeded")

    # ============ 6. JOURNAL ENTRIES (300) ============
    print("\n[6/10] Seeding journal entries...")
    journal_count = 0
    for uid in random.sample(user_ids, min(50, len(user_ids))):
        for _ in range(random.randint(3, 10)):
            await db.journal_entries.insert_one({
                "user_id": uid, "content": random.choice(JOURNAL_PROMPTS),
                "mood": random.choice(["great", "good", "okay", "tired", "stressed"]),
                "energy_level": random.randint(1, 10),
                "tags": random.sample(["wellness", "nutrition", "fitness", "mindfulness", "gratitude", "sleep"], 2),
                "created_at": random_date(90),
            })
            journal_count += 1
    print(f"   ✓ {journal_count} journal entries seeded")

    # ============ 7. QUOTES (60) ============
    print("\n[7/10] Seeding quotes...")
    for q in QUOTES:
        existing = await db.sprint8_quotes.find_one({"text": q["text"]})
        if not existing:
            await db.sprint8_quotes.insert_one({
                **q, "is_active": True, "created_at": random_date(365), "likes": random.randint(0, 100),
            })
    print(f"   ✓ {len(QUOTES)} quotes seeded")

    # ============ 8. TRACKER DATA ============
    print("\n[8/10] Seeding tracker data (water, sleep, weight)...")
    tracker_count = 0
    for uid in random.sample(user_ids, min(40, len(user_ids))):
        for day in range(30):
            dt = now_iso(offset_days=day)
            # Water
            await db.water_logs.insert_one({"user_id": uid, "amount_ml": random.randint(1500, 3500), "glasses": random.randint(6, 14), "date": dt, "created_at": dt})
            # Sleep
            await db.sleep_logs.insert_one({"user_id": uid, "hours": round(random.uniform(5.5, 9.0), 1), "quality": random.choice(["poor", "fair", "good", "excellent"]), "date": dt, "created_at": dt})
            # Weight (weekly)
            if day % 7 == 0:
                await db.weight_logs.insert_one({"user_id": uid, "weight_kg": round(random.uniform(55, 100), 1), "date": dt, "created_at": dt})
            tracker_count += 3
    print(f"   ✓ {tracker_count}+ tracker records seeded")

    # ============ 9. SUPPORT TICKETS (25) ============
    print("\n[9/10] Seeding support tickets...")
    TICKET_SUBJECTS = [
        "Can't sync my Fitbit", "Meal plan not updating", "Payment issue",
        "App crashing on startup", "Can't change my diet preference",
        "Feature request: dark mode", "How to cancel subscription",
        "Recipe search not working", "Push notifications not coming through",
        "Want to delete my account",
    ]
    for i in range(25):
        uid = random.choice(user_ids)
        user = await db.users.find_one({"_id": __import__("bson").ObjectId(uid)})
        await db.sprint9_tickets.insert_one({
            "user_id": uid, "user_name": user.get("name", "User"),
            "user_email": user.get("email", ""),
            "subject": random.choice(TICKET_SUBJECTS),
            "description": f"I'm experiencing an issue and need help. Details: {random.choice(TICKET_SUBJECTS).lower()}.",
            "status": random.choice(["open", "in_progress", "resolved", "closed"]),
            "priority": random.choice(["low", "medium", "high"]),
            "category": random.choice(["technical", "billing", "feature", "account"]),
            "created_at": random_date(60), "updated_at": random_date(30),
        })
    print(f"   ✓ 25 support tickets seeded")

    # ============ 10. NOTIFICATIONS (500+) ============
    print("\n[10/10] Seeding notifications...")
    notif_count = 0
    NOTIF_TYPES = [
        {"type": "wellness", "title": "Time for your daily check-in!", "body": "How are you feeling today? Log your mood and energy."},
        {"type": "meal", "title": "Meal reminder", "body": "Don't forget to log your lunch. Stay on track!"},
        {"type": "water", "title": "Hydration reminder", "body": "Time to drink some water! You're at 60% of your daily goal."},
        {"type": "badge", "title": "New badge earned!", "body": "Congratulations! You've earned the 'Consistent Tracker' badge."},
        {"type": "community", "title": "Someone liked your post", "body": "Your recent post got 5 new likes!"},
        {"type": "system", "title": "BO Wellness Update", "body": "New features are available! Check out Connected Devices."},
    ]
    for uid in random.sample(user_ids, min(60, len(user_ids))):
        for _ in range(random.randint(5, 15)):
            n = random.choice(NOTIF_TYPES)
            await db.notifications.insert_one({
                "user_id": uid, **n,
                "is_read": random.random() > 0.4,
                "created_at": random_date(30),
            })
            notif_count += 1
    print(f"   ✓ {notif_count} notifications seeded")

    # ============ DONE ============
    print("\n" + "=" * 60)
    print("✅ BO Wellness Production Data Seed Complete!")
    print(f"   Users: {len(user_ids)}")
    print(f"   Restaurants: {len(rest_ids)}")
    print(f"   Menu Items: {menu_count}")
    print(f"   Meals/Recipes: {len(meal_ids)}")
    print(f"   Feed Posts: {len(post_ids)}")
    print(f"   Journal Entries: {journal_count}")
    print(f"   Quotes: {len(QUOTES)}")
    print(f"   Support Tickets: 25")
    print(f"   Notifications: {notif_count}")
    print("=" * 60)

    client.close()


if __name__ == "__main__":
    asyncio.run(seed_production_data())
