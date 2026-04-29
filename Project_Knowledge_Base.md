# 📘 CIE Project Knowledge Base

This document serves as a comprehensive reference for the CIE Laboratory Management System's architecture, components, and specialized features.

---

## 🏗️ Core Architecture

- **Framework**: [Next.js](https://nextjs.org/) (App Router, Version 14+)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **ORM**: [Prisma](https://www.prisma.io/)
- **Database**: [PostgreSQL](https://www.postgresql.org/)
- **Authentication**: [NextAuth.js](https://next-auth.js.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [Radix UI](https://www.radix-ui.com/) + [Lucide Icons](https://lucide.dev/)

---

## 🚀 Key Modules & Domains

### 1. Programs & Recruitment
- **Structure**: `Base Program` ➡️ `Program Year` ➡️ `Program Stage`.
- **Logic**: Manages multi-year academic programs and recruitment stages.
- **Service**: [programs.service.ts](file:///c:/Users/Lenovo/CIE_SW4/features/programs/services/programs.service.ts)
- **Hooks**: [useProgramStages.ts](file:///c:/Users/Lenovo/CIE_SW4/features/programs/hooks/useProgramStages.ts)

### 2. AI Resume Analysis (Integrated)
- **Feature**: Bulk upload PDF resumes (single or ZIP) and rank them using Semantic AI.
- **Engine**: 
    - **Frontend**: [ResumeAnalysisModal.tsx](file:///c:/Users/Lenovo/CIE_SW4/features/programs/components/ResumeAnalysisModal.tsx) (Streaming Progress Bar UI).
    - **Backend API**: [analyze/route.ts](file:///c:/Users/Lenovo/CIE_SW4/app/api/programs/[programId]/years/[yearId]/stages/[stageId]/analyze/route.ts) (Event-Stream / NDJSON).
    - **AI Core**: [resume_selector_optimized.py](file:///c:/Users/Lenovo/CIE_SW4/scripts/resume_selector_optimized.py) (Mistral AI + FAISS Similarity Search).
- **Persistence**: Results are stored permanently in the `ProgramStage` model (`analysis_results` JSON field).

### 3. Lab & Library Management
- **Lab**: Tracking and requesting laboratory components.
- **Library**: Book management and checkout flows.
- **AI Integration**: Uses **Google Gemini** for automated image analysis of components.

### 4. Projects & Courses
- **Projects**: Faculty and student project management.
- **Courses**: Course unit feedback and approval workflows.

---

## 🛠️ Specialized Technical Systems

### 🐍 Python AI Bridge
The system utilizes a Python-based processing layer for heavy ML tasks:
- **Location**: `scripts/` directory.
- **Venv**: Automatically detects local `.venv` or system Python.
- **Dependencies**: `numpy`, `faiss-cpu`, `mistralai`, `sentence-transformers`, `pdfplumber`.
- **Communication**: The Node.js API spawns Python processes and consumes `stdout` JSON and `stderr` progress logs.

### 💾 Data Modeling (Prisma)
- **Identity**: Uses `cuid()` for primary keys.
- **Mapping**: All models are mapped to snake_case table names in PostgreSQL (e.g., `ProgramStage` -> `program_stages`).
- **Extensions**: Supports `Json` fields for high-performance storage of AI-generated insights.

---

## 🔑 Environment Requirements (`.env`)

- `DATABASE_URL`: PostgreSQL connection string.
- `NEXTAUTH_SECRET`: Encryption key for session tokens.
- `MISTRAL_API_KEY`: API key for Resume Analysis (Mistral AI).
- `GEMINI_API_KEY`: API key for Image Analysis (Google Gemini).

---

## 📂 Key Directory Map

| Path | Purpose |
| :--- | :--- |
| `app/` | Next.js Page and API Routes |
| `features/` | Modularized business logic (components, hooks, services) |
| `components/` | Global UI components (Shared layout, Auth providers) |
| `lib/` | Core utility libraries (Prisma client, Auth wrappers) |
| `scripts/` | Python AI scripts and environment setup utilities |
| `prisma/` | Database schema and seed data |
| `public/` | Static assets and temporary processing folders |

---

## 📜 Role-Based Access Control (RBAC)
- **ADMIN**: Full system access, config management.
- **FACULTY**: Program management, resume analysis, student feedback.
- **STUDENT**: Profile management, resume upload, project requests.
