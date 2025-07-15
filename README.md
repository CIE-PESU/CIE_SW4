# CIE - College Information Exchange

A comprehensive laboratory management system built with Next.js, Prisma, and PostgreSQL.

## 🚀 Quick Start with Docker (Recommended)

### Prerequisites
- Docker
- Docker Compose

### One-Command Setup
```bash
# Clone the repository
git clone https://github.com/preeeetham/CIE.git
cd CIE

# Start with Docker (includes database seeding)
docker-compose up --build app-dev postgres
```

Visit: http://localhost:3006

**For detailed Docker instructions, see [README-Docker.md](README-Docker.md)**

## 🛠 Local Development Setup

### 1. Clone the repository
```bash
git clone https://github.com/preeeetham/CIE.git
cd CIE
```

### 2. Install dependencies
```bash
pnpm install
```

### 3. Create `.env` file
Add a `.env` file in the root directory with the following content:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/database_name"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# App
NODE_ENV="development"
```

### 4. Prisma setup
```bash
pnpm prisma generate
pnpm prisma migrate dev --name init
pnpm prisma db seed
```

### 5. Run the dev server
```bash
pnpm dev
```

Visit: http://localhost:3000



## 📁 Tech Stack

- **Next.js** - React framework for production
- **TypeScript** - Type-safe JavaScript
- **Prisma** - Database ORM
- **PostgreSQL** - Database
- **NextAuth** - Authentication
- **Tailwind CSS** - Styling
- **Radix UI** - Component library

## 🧪 Development Notes

- Ensure PostgreSQL is running locally for manual setup
- Use Docker for the easiest setup experience
- The Docker setup includes automatic database seeding
- Live code editing is available in Docker development mode

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
