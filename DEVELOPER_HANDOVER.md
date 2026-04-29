# CIE App — Developer Handover Guide

> **Last Updated:** April 29, 2026  
> **Original Developer:** Anant Sharma  
> **Stack:** Next.js 14 · React 18 · PostgreSQL · Prisma ORM · TailwindCSS · shadcn/ui

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Prerequisites & Software Requirements](#2-prerequisites--software-requirements)
3. [First-Time Setup (Step-by-Step)](#3-first-time-setup-step-by-step)
4. [Environment Variables](#4-environment-variables)
5. [Project Structure](#5-project-structure)
6. [Architecture & How It Works](#6-architecture--how-it-works)
7. [Database Schema Overview](#7-database-schema-overview)
8. [Authentication System](#8-authentication-system)
9. [Role-Based Dashboards](#9-role-based-dashboards)
10. [API Routes Reference](#10-api-routes-reference)
11. [Frontend Components Map](#11-frontend-components-map)
12. [File Storage & Encryption](#12-file-storage--encryption)
13. [AI Features](#13-ai-features)
14. [Adding New Features (How-To)](#14-adding-new-features-how-to)
15. [Common Issues & Troubleshooting](#15-common-issues--troubleshooting)
16. [Default Login Credentials](#16-default-login-credentials)
17. [Useful Commands](#17-useful-commands)

---

## 1. Project Overview

The **CIE App** (Centre for Innovation and Experimentation) is a full-stack web application for managing academic operations including:

- **Courses** — Creation, enrollment (with approval workflow), units, feedback, AI analysis
- **Projects** — Faculty-assigned or student-proposed, with application/approval, submissions, AI resume shortlisting
- **Lab Components** — Inventory management, student/faculty borrow requests, coordinator approval, fines
- **Library** — Book/item inventory, borrow/return workflow with fines
- **Opportunities** — TA/RA/Intern postings with student applications
- **Programs** — Multi-year structured programs with stages and enrollments
- **Locations** — Room/lab booking system with calendar
- **Attendance** — Faculty can mark, students can view
- **Feedback System** — Faculty submit UI feedback, Platform Managers approve, Developers fix
- **Notifications** — In-app notification system
- **Coordinator System** — Domain-based coordinator assignments for lab/library oversight

---

## 2. Prerequisites & Software Requirements

Install these **before** setting up the project:

| Software | Version | Download |
|---|---|---|
| **Node.js** | v20+ (LTS recommended) | https://nodejs.org |
| **PostgreSQL** | v15+ | https://www.postgresql.org/download/windows/ |
| **Git** | Latest | https://git-scm.com |
| **Python** | 3.10+ (only for AI features) | https://www.python.org |
| **VS Code** | Latest (recommended editor) | https://code.visualstudio.com |

### Recommended VS Code Extensions
- ESLint
- Prettier
- Tailwind CSS IntelliSense
- Prisma

---

## 3. First-Time Setup (Step-by-Step)

### Step 1: Clone the Repository
```bash
git clone <repository-url>
cd CIE_SW4
```

### Step 2: Install Node.js Dependencies
```bash
npm install
```

### Step 3: Install PostgreSQL
1. Download installer from https://www.postgresql.org/download/windows/
2. Run installer → keep all defaults → set superuser password → port **5432** → finish
3. Open **SQL Shell (psql)** from Start Menu
4. Press Enter through defaults (server: localhost, database: postgres, port: 5432, username: postgres)
5. Enter your superuser password
6. Run these SQL commands:

```sql
CREATE USER cie_user WITH PASSWORD 'cie_password';
ALTER USER cie_user CREATEDB;
CREATE DATABASE cie_database OWNER cie_user;
GRANT ALL PRIVILEGES ON DATABASE cie_database TO cie_user;
\q
```

### Step 4: Configure Environment
Create a `.env` file in the project root (or verify the existing one):

```env
DATABASE_URL="postgresql://cie_user:cie_password@localhost:5432/cie_database"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="ToN0qkE8HIDGRMgizpmdBOJPcKWewZaF"
MISTRAL_API_KEY="your-mistral-api-key"
GEMINI_API_KEY="your-gemini-api-key"
NODE_ENV="development"

Mistral Key is used for Resume analysis
-visit Mistral Website and create key and paste it in the .env file
-set the key to never expire.

Gemini key was being used for Image analysis of components
```

### Step 5: Push Database Schema
```bash
npx prisma db push
```

### Step 6: Generate Prisma Client
```bash
npx prisma generate
```

### Step 7: Seed the Database
```bash
npx prisma db seed
```
This creates default admin, faculty, and student users plus lab components from CSV.

### Step 8: Run the App
```bash
npm run dev
```
Open http://localhost:3000 in your browser.

### Step 9 (Optional): Setup Python for AI Features
Only needed if you want AI resume shortlisting to work:
```bash
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
```

---

## 4. Environment Variables

| Variable | Purpose | Required |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | ✅ Yes |
| `NEXTAUTH_URL` | App base URL | ✅ Yes |
| `NEXTAUTH_SECRET` | Session encryption key | ✅ Yes |
| `MISTRAL_API_KEY` | AI resume analysis (Mistral API) | Optional |
| `GEMINI_API_KEY` | AI image analysis (Google Gemini) | Optional |
| `NODE_ENV` | `development` or `production` | ✅ Yes |

---

## 5. Project Structure

```
CIE_SW4/
├── app/                        # Next.js App Router
│   ├── api/                    # All backend API routes
│   │   ├── auth/               # Login, logout, session
│   │   ├── courses/            # Course CRUD + enrollments
│   │   ├── projects/           # Project CRUD + shortlist
│   │   ├── lab-components/     # Lab inventory APIs
│   │   ├── library-items/      # Library inventory APIs
│   │   ├── component-requests/ # Lab borrow request APIs
│   │   ├── library-requests/   # Library borrow request APIs
│   │   ├── opportunities/      # Opportunity CRUD
│   │   ├── programs/           # Programs CRUD
│   │   ├── locations/          # Room management
│   │   ├── location-bookings/  # Room booking APIs
│   │   ├── files/              # Encrypted file retrieval
│   │   ├── feedbacks/          # Developer feedback system
│   │   └── ...                 # Other routes
│   ├── globals.css             # Global styles + design tokens
│   ├── layout.tsx              # Root layout (providers)
│   └── page.tsx                # Login page (entry point)
│
├── components/
│   ├── auth-provider.tsx       # Authentication context (React Context)
│   ├── notification-provider.tsx # Notification context
│   ├── theme-provider.tsx      # Dark/light theme
│   ├── navbar.tsx              # Top navigation bar
│   ├── login-form.tsx          # Login form component
│   ├── common/
│   │   └── user-profile.tsx    # Shared user profile page
│   ├── dashboards/
│   │   ├── admin-dashboard.tsx    # Admin shell + routing
│   │   ├── faculty-dashboard.tsx  # Faculty shell + routing
│   │   └── student-dashboard.tsx  # Student shell + routing
│   ├── layout/
│   │   └── dashboard-layout.tsx   # Sidebar + content layout
│   ├── pages/
│   │   ├── admin/              # Admin-only page components
│   │   ├── faculty/            # Faculty-only page components
│   │   ├── student/            # Student-only page components
│   │   └── common/             # Shared page components
│   └── ui/                     # shadcn/ui components (DO NOT EDIT)
│
├── lib/
│   ├── auth.ts                 # Authentication functions (login, getUserById)
│   ├── prisma.ts               # Prisma client singleton
│   ├── storage.ts              # File encryption/decryption
│   ├── data.ts                 # Static data constants
│   └── utils.ts                # Utility functions (cn)
│
├── hooks/
│   ├── use-toast.ts            # Toast notification hook
│   └── use-mobile.tsx          # Mobile detection hook
│
├── features/
│   └── programs/               # Programs feature module
│
├── scripts/                    # Utility & maintenance scripts
│   ├── resume_selector_main_class.py  # AI resume analysis (Python)
│   ├── seed-students-and-requests.ts  # Bulk student seeding
│   ├── clean-database.ts              # Database cleanup
│   └── ...
│
├── prisma/
│   ├── schema.prisma           # ⭐ DATABASE SCHEMA (most important file)
│   ├── seed.ts                 # Database seeder
│   └── lab-components.csv      # Lab component seed data
│
├── uploads/                    # Encrypted file storage (resumes, images)
├── public/                     # Static assets
├── .env                        # Environment variables (DO NOT COMMIT)
├── package.json                # Dependencies & scripts
└── tailwind.config.ts          # Tailwind configuration
```

---

## 6. Architecture & How It Works

### Request Flow
```
Browser → Next.js Page (React) → API Route (/api/*) → Prisma ORM → PostgreSQL
```

### Key Architectural Patterns

1. **No traditional auth library** — Auth is implemented manually:
   - Login sends credentials to `/api/auth/login`
   - Server validates with bcrypt, returns user object
   - Client stores user in `localStorage` via `AuthProvider`
   - Every API call sends `x-user-id` header for authorization

2. **Single-page dashboard** — After login, the entire app lives on one page (`page.tsx`). The correct dashboard (`AdminDashboard`, `FacultyDashboard`, or `StudentDashboard`) loads based on user role. Sidebar navigation swaps components in-place (no page reloads).

3. **API routes** — All backend logic lives in `app/api/`. Each route file exports HTTP method handlers (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`).

4. **Prisma ORM** — All database queries go through Prisma. The schema is defined in `prisma/schema.prisma`. After any schema change, you MUST run:
   ```bash
   npx prisma db push    # Apply schema to database
   npx prisma generate   # Regenerate TypeScript types
   ```

---

## 7. Database Schema Overview

### Core Models

| Model | Purpose |
|---|---|
| `User` | Base user (email, password, role). Has one of: Admin, Faculty, or Student |
| `Admin` | Admin profile (department, office) |
| `Faculty` | Faculty profile (department, specialization, resume) |
| `Student` | Student profile (program, year, section, GPA, resume) |

### Academic Models

| Model | Purpose |
|---|---|
| `Course` | Course definition (name, code, dates) |
| `CourseUnit` | Individual units within a course |
| `Enrollment` | Student course enrollment (with PENDING/ACCEPTED/REJECTED status) |
| `CourseFeedback` | Student feedback on course units |
| `AISummary` | AI-generated feedback analysis |
| `ClassSchedule` | Timetable entries |
| `AttendanceRecord` | Attendance session records |
| `StudentAttendance` | Individual student attendance |

### Project Models

| Model | Purpose |
|---|---|
| `Project` | Project definition (name, description, status, enrollment settings) |
| `ProjectRequest` | Student application to join a project (with resume) |
| `ProjectSubmission` | Student project submission (with grading) |

### Inventory Models

| Model | Purpose |
|---|---|
| `Domain` | Organizational domain (e.g., "Lab", "Library") |
| `DomainCoordinator` | Faculty assigned as domain coordinator |
| `LabComponent` | Lab inventory item |
| `ComponentRequest` | Student/faculty borrow request for lab items |
| `LibraryItem` | Library inventory item |
| `LibraryRequest` | Borrow request for library items |

### Other Models

| Model | Purpose |
|---|---|
| `Location` | Physical rooms/labs |
| `LocationBooking` | Room reservation |
| `Opportunity` | TA/RA/Intern posting |
| `OpportunityApplication` | Student application to opportunity |
| `Feedback` | UI/platform feedback from faculty |
| `PlatformManagerAssignment` | Faculty assigned as platform manager |
| `DeveloperAssignment` | Faculty assigned as developer |
| `BaseProgram` / `ProgramYear` / `ProgramStage` | Structured programs |
| `ProgramEnrollment` | Student enrollment in program year |

### Key Enums
- `UserRole`: ADMIN, FACULTY, STUDENT
- `RequestStatus`: PENDING → APPROVED → COLLECTED → RETURNED (or REJECTED/OVERDUE)
- `ApplicationStatus`: PENDING, ACCEPTED, REJECTED
- `ProjectStatus`: PENDING, APPROVED, ONGOING, COMPLETED, OVERDUE, REJECTED

---

## 8. Authentication System

**Files:**
- `lib/auth.ts` — Server-side auth functions
- `components/auth-provider.tsx` — Client-side auth context
- `app/api/auth/login/route.ts` — Login endpoint
- `app/api/auth/me/route.ts` — Session refresh endpoint

**How it works:**
1. User enters email + password on login page
2. `POST /api/auth/login` validates credentials using bcrypt
3. On success, returns full user object (including role-specific profile data)
4. Client stores user in `localStorage` and React Context
5. All subsequent API calls include `x-user-id` in request headers
6. API routes read `request.headers.get("x-user-id")` for authorization

**Important:** There are NO JWTs or session tokens. Auth is based on the user ID stored client-side. This is a known simplification.

---

## 9. Role-Based Dashboards

Each role has its own dashboard shell that controls sidebar navigation and page rendering:

### Admin Dashboard (`components/dashboards/admin-dashboard.tsx`)
Pages: Dashboard, Coordinators, Users, Faculty, Students, Courses, Room Bookings, Lab Components, Library, Projects, Programs, Opportunities, Class Schedules

### Faculty Dashboard (`components/dashboards/faculty-dashboard.tsx`)
Pages: Dashboard, CIE Coordinator (if assigned), Courses, Book Rooms, Projects, Programs, Lab Components, Library, Opportunities, Feedbacks, Attendance, Calendar

### Student Dashboard (`components/dashboards/student-dashboard.tsx`)
Pages: Dashboard, Calendar, Courses, Projects, Programs, Lab Components, Library, Opportunities, Attendance, Class Locations

**To add a new page to a dashboard:**
1. Create the component in `components/pages/<role>/`
2. Import it in the dashboard file
3. Add entry to `menuItems` array
4. Add `case` to `renderPage()` switch

---

## 10. API Routes Reference

All routes are in `app/api/`. Each folder has a `route.ts` file.

| Route | Methods | Purpose |
|---|---|---|
| `/api/auth/login` | POST | User login |
| `/api/auth/me` | GET | Get current user |
| `/api/courses` | GET, POST, PUT, PATCH | Course CRUD + enrollment |
| `/api/courses/enrollments` | GET, PATCH | Manage enrollment approvals |
| `/api/courses/feedback` | GET, POST | Course feedback |
| `/api/courses/feedback/analyze` | POST | AI feedback analysis |
| `/api/course-units` | GET, POST, PUT, DELETE | Course unit management |
| `/api/projects` | GET, POST, PUT, PATCH | Project CRUD |
| `/api/projects/shortlist` | POST | AI resume shortlisting |
| `/api/project-requests` | GET, POST, PATCH | Project applications |
| `/api/project-submissions` | GET, POST, PATCH | Project submissions |
| `/api/lab-components` | GET, POST, PUT, DELETE | Lab inventory |
| `/api/component-requests` | GET, POST, PATCH | Lab borrow requests |
| `/api/library-items` | GET, POST, PUT, DELETE | Library inventory |
| `/api/library-requests` | GET, POST, PATCH | Library borrow requests |
| `/api/locations` | GET, POST, PUT, DELETE | Room management |
| `/api/location-bookings` | GET, POST, DELETE | Room bookings |
| `/api/opportunities` | GET, POST, PUT, DELETE | Opportunity CRUD |
| `/api/programs` | GET, POST, PUT, DELETE | Program management |
| `/api/domains` | GET, POST, DELETE | Domain management |
| `/api/coordinators` | GET, POST, DELETE | Coordinator assignments |
| `/api/feedbacks` | GET, POST, PATCH | Platform feedback system |
| `/api/files/[...path]` | GET | Serve encrypted files |
| `/api/students` | GET | List students |
| `/api/faculty` | GET | List faculty |
| `/api/dashboard` | GET | Dashboard statistics |
| `/api/admin/users` | GET, POST, DELETE | Admin user management |

---

## 11. Frontend Components Map

### Admin Pages (`components/pages/admin/`)
| File | Purpose |
|---|---|
| `admin-home.tsx` | Admin dashboard home with stats |
| `manage-courses.tsx` | Course CRUD + enrollment approval + feedback |
| `manage-lab-components.tsx` | Lab inventory + request management |
| `manage-library.tsx` | Library inventory + request management |
| `manage-projects.tsx` | Read-only project overview |
| `manage-faculty.tsx` | Faculty user management |
| `manage-students.tsx` | Student user management |
| `manage-users.tsx` | User CRUD |
| `manage-locations.tsx` | Room/lab management |
| `manage-domains.tsx` | Domain + coordinator assignment |
| `manage-class-schedules.tsx` | Class timetable |
| `manage-opportunity.tsx` | Opportunity management |
| `manage-programs.tsx` | Program management |

### Faculty Pages (`components/pages/faculty/`)
| File | Purpose |
|---|---|
| `faculty-home.tsx` | Faculty dashboard home |
| `project-management.tsx` | Full project lifecycle (create, requests, submissions, AI shortlist) |
| `coordinator-dashboard.tsx` | Domain coordinator view (lab/library oversight) |
| `lab-components-management.tsx` | Lab coordinator inventory management |
| `lab-components-request.tsx` | Faculty borrow requests |
| `library-management.tsx` | Library coordinator management |
| `location-booking.tsx` | Room booking with calendar |
| `faculty-opportunity.tsx` | Opportunity management + applications |
| `faculty-project-requests.tsx` | View project applications |
| `attendance-management.tsx` | Mark student attendance |
| `feedbacks.tsx` | Submit platform feedback |
| `developer-feedbacks.tsx` | Developer view of assigned feedbacks |
| `platform-manager-feedbacks.tsx` | Platform manager approval view |
| `view-courses.tsx` | Faculty course redirect |
| `faculty-calendar.tsx` | Faculty calendar view |

### Student Pages (`components/pages/student/`)
| File | Purpose |
|---|---|
| `student-home.tsx` | Student dashboard home |
| `view-courses.tsx` | Browse & apply for courses (with registration dialog) |
| `view-projects.tsx` | Browse & apply for projects |
| `view-programs.tsx` | Browse programs |
| `lab-components-request.tsx` | Request lab components |
| `library-request.tsx` | Request library items |
| `request-history.tsx` | View past borrow requests |
| `student-opportunity.tsx` | Browse & apply for opportunities |
| `view-attendance.tsx` | View attendance records |
| `student-calendar.tsx` | Student calendar |

### Shared Components
| File | Purpose |
|---|---|
| `components/common/user-profile.tsx` | User profile page (all roles) |
| `components/pages/common/library-dashboard.tsx` | Shared library browsing |
| `components/pages/common/notifications-page.tsx` | Notifications view |

---

## 12. File Storage & Encryption

**File:** `lib/storage.ts`

All uploaded files (resumes, images) are **encrypted at rest** using AES-256-GCM.

- Files are stored in the `uploads/` directory with subdirectories (e.g., `uploads/resumes/`, `uploads/lab-images/`)
- On upload: file → encrypt → save to disk
- On download: read from disk → decrypt → serve to browser
- File retrieval API: `GET /api/files/<subDir>/<fileName>?userId=<id>`

**Important:** The `userId` query parameter is REQUIRED for authorization when accessing files.

---

## 13. AI Features

### 1. AI Resume Shortlisting (Projects)
- **Backend:** `app/api/projects/shortlist/route.ts`
- **Python Script:** `scripts/resume_selector_main_class.py`
- **How it works:** Decrypts student resumes → saves to temp folder → Python script analyzes with Mistral AI → returns ranked candidates
- **Requires:** Python venv + `requirements.txt` installed + valid `MISTRAL_API_KEY`

### 2. AI Course Feedback Analysis
- **Backend:** `app/api/courses/feedback/analyze/route.ts`
- **How it works:** Collects all feedback for a course unit → sends to Gemini AI → generates summary, sentiment, and recommendations
- **Requires:** Valid `GEMINI_API_KEY`

---

## 14. Adding New Features (How-To)

### Adding a New Page

1. **Create the component:**
   ```
   components/pages/<role>/my-new-page.tsx
   ```

2. **Create the API route (if needed):**
   ```
   app/api/my-feature/route.ts
   ```
   Export `GET`, `POST`, `PUT`, `PATCH`, or `DELETE` functions.

3. **Register in the dashboard:**
   Open `components/dashboards/<role>-dashboard.tsx`:
   - Import your component
   - Add to `menuItems` array
   - Add `case` to `renderPage()` switch

### Adding a New Database Model

1. **Edit schema:** Add model to `prisma/schema.prisma`
2. **Push to DB:** `npx prisma db push`
3. **Regenerate client:** `npx prisma generate`
   - **IMPORTANT:** Stop the dev server first (`Ctrl+C`) before running `prisma generate`, otherwise you'll get an EPERM file lock error on Windows.
4. **Use in code:** `import { prisma } from "@/lib/prisma"` then `prisma.myModel.findMany()`

### Adding a New API Route

Create `app/api/my-route/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  const userId = request.headers.get("x-user-id")
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  
  // Your logic here
  const data = await prisma.myModel.findMany()
  return NextResponse.json({ data })
}
```

### Adding a New UI Component (shadcn/ui)

```bash
npx shadcn@latest add <component-name>
```
Components are installed to `components/ui/`. Do NOT manually edit these files.

---

## 15. Common Issues & Troubleshooting

### "EPERM: operation not permitted" when running `prisma generate`
**Cause:** The dev server is locking the Prisma engine file.  
**Fix:** Stop the dev server (`Ctrl+C`), run `npx prisma generate`, then restart.

### "Internal server error" after schema changes
**Cause:** Database schema is out of sync with code.  
**Fix:**
```bash
npx prisma db push
npx prisma generate
```

### Login not working
**Cause:** User doesn't exist in the database or password is wrong.  
**Fix:** Check `prisma/seed.ts` for default credentials, or use Prisma Studio:
```bash
npx prisma studio
```

### Files/resumes showing "Unauthorized"
**Cause:** The file retrieval URL is missing the `?userId=<id>` parameter.  
**Fix:** Always append `?userId=${user.id}` to file URLs.

### Port 3000 already in use
**Fix (Windows):**
```bash
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### `.next` cache corruption
**Fix:**
```bash
Remove-Item -Recurse -Force .next
npm run dev
```

---

## 16. Default Login Credentials

After running `npx prisma db seed`, these users are available:

| Role | Email | Password |
|---|---|---|
| Admin | `admin@pes.edu` | `admin123` |
| Faculty | `faculty@pes.edu` | `admin123` |
| Student | `student@pes.edu` | `admin123` |

Additional users seeded (check `prisma/seed.ts` for full list):
- `madhukar.n@pes.edu` (Faculty) — password: `admin123`
- `anant.sharma@pes.edu` (Student) — password: `admin123`

---

## 17. Useful Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npx prisma studio` | Open database GUI in browser |
| `npx prisma db push` | Sync schema → database |
| `npx prisma generate` | Regenerate Prisma client types |
| `npx prisma db seed` | Run database seeder |
| `npx prisma migrate dev` | Create a migration (for production) |
| `npx tsx scripts/<script>.ts` | Run a utility script |

---

## Quick Reference: Key Files

| What you need | Where to look |
|---|---|
| Database schema | `prisma/schema.prisma` |
| Default seed data | `prisma/seed.ts` |
| Authentication logic | `lib/auth.ts` + `components/auth-provider.tsx` |
| File encryption | `lib/storage.ts` |
| Global CSS / Design tokens | `app/globals.css` |
| Prisma client | `lib/prisma.ts` |
| Environment config | `.env` |

---

*This document should give any new developer everything they need to understand, set up, and extend the CIE App. For questions, refer to the codebase comments or the existing markdown docs in the project root (`README.md`, `cie-app-workflows.md`, `Project_Knowledge_Base.md`).*
