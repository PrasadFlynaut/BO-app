# BO Health & Wellness App - Product Requirements Document

## Overview
BO is a comprehensive health, wellness, and nutrition mobile platform built with React Native/Expo (frontend) and FastAPI/MongoDB (backend). The app enables users to track nutrition, water intake, browse diet plans, chat with an AI wellness coach, and engage with a social feed.

## Brand Identity
- **Colors**: BO Green #26B50F, BO Lime #DBFF02, White #FFFFFF
- **Accent Colors**: Nutrition Orange #FF9F1C, Water Blue #3A86FF, Fitness Purple #8338EC, Social Teal #06D6A0
- **Typography**: System fonts (Inter-inspired), weights 400/600/700/800
- **Theme**: Light, vibrant enterprise design with organic & earthy feel. No grey cards — all surfaces use brand-tinted colors.
- **Logo**: Intertwined "bo" letterform in green/lime gradient
- **Animations**: react-native-reanimated FadeInDown, spring scale micro-interactions, staggered list entries

## MVP Features Implemented

### 1. Authentication
- Email/password registration and login
- JWT Bearer token auth (24h access, 30d refresh)
- Token storage in AsyncStorage
- Auto-redirect based on auth/onboarding status

### 2. Onboarding Flow (3 steps)
- **Goals**: Stay Fit, Lose Weight, Eat Healthy, Be Active, Build Muscle, Mental Wellness
- **Dietary Preferences**: Keto, Vegan, Mediterranean, Clean Eating, High Protein, Balanced + Allergies
- **Health Data**: Gender, Height, Weight, Target Weight, Activity Level

### 3. Dashboard/Home
- Personalized greeting with time-of-day awareness
- Daily stats: Water intake, Calories, Meals logged
- Macros breakdown: Protein, Carbs, Fat
- Quick-add buttons: Water (+250ml), Breakfast, Lunch, Dinner
- Weight progress tracker

### 4. Smart Menu
- 6 curated diet plans: Keto, Mediterranean, Vegan, Clean Eating, High Protein, Balanced
- 18 pre-seeded meals with images, nutrition info, prep times, ingredients
- Log meals directly from menu to nutrition tracker

### 5. Social Feed
- Create posts to share wellness journey
- Like/unlike posts
- Comment system with nested replies
- Time-ago formatting

### 6. AI Wellness Coach
- Powered by OpenAI GPT-4.1-mini via emergentintegrations
- Context-aware (user goals, dietary preferences, health data)
- Suggestion chips for quick prompts
- Full chat history persistence

### 7. Profile
- User info display (name, email, subscription tier)
- Daily stats summary
- Goals and dietary preference chips
- Body stats grid
- Settings menu (Notifications, Invite, Help, Subscription, Privacy, About)
- Upgrade to BO Pro banner
- Logout functionality

## Tech Stack
- **Frontend**: React Native / Expo SDK 54 / Expo Router (file-based routing)
- **Backend**: FastAPI / Python 3.x
- **Database**: MongoDB (Motor async driver)
- **AI**: OpenAI GPT-4.1-mini via emergentintegrations
- **Auth**: JWT Bearer tokens with bcrypt password hashing

## API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login with email/password |
| GET | /api/auth/me | Get current user |
| POST | /api/auth/refresh | Refresh access token |
| PUT | /api/profile/onboarding | Save onboarding data |
| GET | /api/profile | Get user profile |
| PUT | /api/profile | Update profile |
| GET | /api/dashboard | Get daily summary |
| GET | /api/diet-plans | List diet plans |
| GET | /api/diet-plans/{id} | Get plan with meals |
| GET | /api/meals | List meals |
| GET | /api/meals/{id} | Get meal detail |
| POST | /api/nutrition/log | Log a meal |
| GET | /api/nutrition/daily | Daily nutrition summary |
| POST | /api/water/log | Log water intake |
| GET | /api/water/daily | Daily water summary |
| GET | /api/feed | Get social feed |
| POST | /api/feed | Create post |
| POST | /api/feed/{id}/like | Toggle like |
| POST | /api/feed/{id}/comment | Add comment |
| GET | /api/feed/{id}/comments | Get comments |
| POST | /api/chat | Send message to AI |
| GET | /api/chat/history | Get chat history |

## Seed Data
- Admin user: admin@bo.com
- 6 diet plans with metadata
- 18 meals (3 per plan: breakfast, lunch, dinner)

## Sprint 3 Features (Quick Adds, Goals, Journaling, Wellness Enrollment)

### 8. Quick Adds Tab (3rd Tab)
- **4-zone navigation**: Quick Add (meals), Journal, Trackers, Timeline
- **Meal Logging**: Breakfast/Lunch/Dinner/Snack slots with calorie tracking
- **Water Tracker**: Circular progress ring, daily goal of 8 glasses
- **Sleep Tracker**: Hours/minutes input, quality rating (1-5 moons)
- **Walking Tracker**: Step counter with auto-calculated distance/calories
- **MET Tracker**: Activity type selector (Walking/Cycling/Swimming/Running/Yoga/Strength), duration input, MET-minutes calculation
- **Journal Zone**: Create/view/like/delete journal entries
- **Timeline Zone**: Chronological view of all daily activities

### 9. My Goals Tab (4th Tab)
- Life goals pills with edit capability
- Happiness Level gauge with emoji selector (5-point scale)
- Goal Progress cards: Walking, Nutrition, Activity, Hydration
- Milestone badges (25%, 50%, 75%, 100%)
- Streak tracking (consecutive days)
- Health Profile review (questionnaire data)

### 10. Wellness Program Enrollment
- Enroll in wellness programs from home screen
- Daily check-in system
- Progress tracking with day-by-day status
- Active program widget

### 11. Reports
- 30-day progress report across all tracker categories

## Sprint 3 API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/meals/log | Log a meal entry |
| GET | /api/v1/meals/log | Get meal logs for a date |
| DELETE | /api/v1/meals/log/{id} | Delete meal log |
| POST | /api/v1/trackers/water | Log water intake |
| GET | /api/v1/trackers/water | Get water logs |
| POST | /api/v1/trackers/sleep | Log sleep data |
| GET | /api/v1/trackers/sleep | Get sleep logs |
| POST | /api/v1/trackers/walking | Log walking data |
| GET | /api/v1/trackers/walking | Get walking logs |
| POST | /api/v1/trackers/met | Log MET activity |
| GET | /api/v1/trackers/met | Get MET logs |
| POST | /api/v1/trackers/happiness | Log happiness level |
| GET | /api/v1/trackers/happiness | Get happiness logs |
| GET | /api/v1/trackers/summary | Daily tracker summary |
| GET | /api/v1/trackers/timeline | Daily activity timeline |
| POST | /api/v1/journal | Create journal entry |
| GET | /api/v1/journal | List journal entries |
| GET | /api/v1/journal/{id} | Get journal entry |
| PUT | /api/v1/journal/{id} | Update journal entry |
| DELETE | /api/v1/journal/{id} | Delete journal entry |
| POST | /api/v1/journal/like | Toggle journal like |
| GET | /api/v1/goals | Get user goals |
| GET | /api/v1/goals/progress | Get goal progress |
| POST | /api/v1/wellness-programs/{id}/enroll | Enroll in program |
| POST | /api/v1/wellness-programs/checkin | Daily check-in |
| GET | /api/v1/wellness-programs/progress/{id} | Program progress |
| GET | /api/v1/wellness-programs/active | Active program |
| POST | /api/v1/reports/generate | Generate 30-day report |

## Future Enhancements
- Wearable device integration (Apple Watch, Fitbit, Garmin)
- Workout tracking with step counter
- Recipe creation and sharing
- Daily journaling
- Badges and rewards gamification
- Shopping lists from meal plans
- BO Pro subscription with Stripe payments
- Push notifications and email drip campaigns
- Family bundle plans
- HIPAA compliance features
