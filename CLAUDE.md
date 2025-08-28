# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Pure Ocean is an educational platform for Wando High School students. "Pure Ocean" refers to the students themselves, not a project name. The codebase contains two main applications:

1. **AI Research Paper Feedback System** (Python/Streamlit) - Located in `/chatbot-examples/`
2. **Pure Ocean Platform** (Next.js/TypeScript) - AI coaching chatbot for students

## Common Development Commands

### Python Application (Research Paper Feedback)
```bash
# Navigate to the Python app
cd chatbot-examples

# Install dependencies
pip install -r requirements.txt

# Run the Streamlit app locally
streamlit run app.py

# Deploy to Streamlit Cloud
# Push to GitHub and connect via Streamlit Cloud dashboard
```

### Next.js Application (Main Platform)
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Database commands
npx prisma db push          # Sync schema with database
npx prisma studio           # Open database GUI
npm run db:seed            # Initialize sample data (via tsx scripts/init-db.ts)
npx prisma generate         # Generate Prisma client

# Linting and type checking
npm run lint               # Run ESLint
npx tsc --noEmit          # TypeScript type check

# EC2 deployment
npm run deploy:ec2         # Deploy to EC2 server (15.164.202.209)
```

## High-Level Architecture

### System Components

1. **Authentication Layer**
   - NextAuth.js with Google OAuth (open to all Google accounts)
   - Role-based access control: Student, Teacher, Admin
   - Session management with Prisma adapter

2. **AI Integration**
   - Socratic coaching chatbot using Upstage Solar-Pro2 model (Next.js app)
   - Document feedback system using Anthropic Claude (Python app)
   - Google Docs API integration for automated commenting

3. **Data Layer**
   - PostgreSQL database with Prisma ORM
   - Schema includes: User, Team, TeamMember, Progress, Task, Message, Conversation, Analytics
   - Real-time progress tracking and team management
   - Role-based access control with Student/Teacher/Admin roles

4. **Deployment Architecture**
   - EC2 server for Next.js hosting (15.164.202.209)
   - PostgreSQL on EC2 server
   - Streamlit Cloud for Python feedback app
   - Environment-based configuration

### Key Integration Points

1. **Google Docs Feedback Flow**
   - Students share Google Docs with comment permissions
   - Python app fetches document content via Google Drive API
   - Claude API analyzes and generates feedback
   - Feedback posted as comments via Google Docs API

2. **Chatbot Conversation Flow**
   - Frontend sends messages to `/api/chat` endpoint
   - Backend validates user session
   - OpenAI API processes with Socratic method prompt
   - Conversations stored in database for continuity

3. **Analytics Pipeline**
   - User actions tracked via `/api/analytics` endpoint
   - Progress calculations based on team activities
   - Teacher dashboard aggregates class-wide metrics

4. **Team Management Flow**
   - Students join teams via invite codes
   - Team members assigned roles and tasks via `/api/teams/[teamId]/tasks`
   - Progress tracking through task completion status
   - Role recommendations based on member profiles

## Environment Variables

Both applications require specific environment variables:

### Next.js App
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_URL` - Application URL
- `NEXTAUTH_SECRET` - Auth encryption key
- `GOOGLE_CLIENT_ID/SECRET` - OAuth credentials
- `UPSTAGE_API_KEY` - Upstage Solar-Pro2 model access
- `ALLOWED_EMAIL_DOMAIN` - School domain restriction

### Python App
- `ANTHROPIC_API_KEY` - Claude API access
- Google service account credentials (JSON format)

## Important Considerations

1. **School Domain Restriction**: Only @wando.hs.kr emails can authenticate
2. **Korean Language**: UI and documentation primarily in Korean
3. **Educational Context**: Features designed for high school project-based learning
4. **Security**: No sensitive data in code, all secrets in environment variables
5. **Deployment**: EC2 server for Next.js, Streamlit Cloud for Python app
6. **Note**: "Pure Ocean" is the name for Wando High School students, not a project name