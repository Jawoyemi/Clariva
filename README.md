# Clariva

A full-stack AI document workflow app built with FastAPI, React, Vite, and React Router.

## Overview

This project includes a FastAPI backend and a React frontend for creating, clarifying, outlining, compiling, and exporting structured product and project documents.

Core backend capabilities include:

- Google OAuth authentication
- Guest session access
- Refresh token handling
- User and session management
- AI-powered chat and document generation
- Document intake, clarification, and outlining flows
- PRD and SOW compilation workflows
- PDF/export support
- Email delivery
- Local storage for generated files and assets

Core frontend pages include:

- Landing page
- Dashboard page

The backend is organized around routers, services, schemas, models, prompts, and shared auth/security utilities. The frontend is organized with route-level pages and reusable UI components.

## Tech Stack

### Backend

- Python 3.11
- FastAPI
- Uvicorn
- SQLAlchemy
- PostgreSQL
- Pydantic Settings
- Authlib
- Python JOSE
- Passlib
- Boto3
- Groq
- Anthropic
- WeasyPrint
- FastAPI Mail
- Docker

### Frontend

- React 19
- Vite 8
- React Router DOM 7
- ESLint 9

## Getting Started

## Backend Setup

### 1. Create and activate a virtual environment

```bash
python -m venv venv
venv\Scripts\activate
```

### 2. Install backend dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure environment variables

Create a `.env` file in the project root with the required backend settings.

Required settings are defined in `app/config.py`.

Important environment variable groups include:

- Database connection
- JWT and session security
- Google OAuth credentials
- Email settings
- Groq API key

### 4. Run the backend development server

```bash
uvicorn app.main:app --reload
```

The backend API will run at:

```text
http://localhost:8000
```

## Frontend Setup

### 1. Move into the frontend directory

```bash
cd frontend
```

### 2. Install frontend dependencies

```bash
npm install
```

### 3. Run the frontend development server

```bash
npm run dev
```

The frontend will run at the local Vite URL shown in the terminal.

## Docker

The backend can also be run with Docker Compose from the project root:

```bash
docker compose up --build
```

Docker Compose starts:

- Clariva FastAPI API service
- Mounted local `storage/` directory for generated files and persisted assets

The container exposes the API on:

```text
http://localhost:8000
```

## Scripts and Commands

### Backend

```bash
uvicorn app.main:app --reload
```

Start the backend development server.

```bash
docker compose up --build
```

Build and run the backend API with Docker Compose.

### Frontend

```bash
npm run dev
```

Start the frontend development server.

```bash
npm run build
```

Create a production frontend build.

```bash
npm run preview
```

Preview the production frontend build locally.

```bash
npm run lint
```

Run ESLint across the frontend project.

## API Documentation

Interactive API documentation is available when the backend server is running:

- Swagger UI: `/docs`
- ReDoc: `/redoc`
- OpenAPI JSON: `/openapi.json`

Health check endpoint:

```text
/health
```

## API Routing

Routes are registered in `app/main.py` and organized in `app/routers/`.

### Auth Routes

Defined in `app/routers/auth.py`:

- `/auth/me` - Get the current authenticated user
- `/auth/login` - Start Google OAuth login
- `/auth/callback` - Handle Google OAuth callback
- `/auth/refresh` - Refresh access credentials
- `/auth/guest` - Create guest access
- `/auth/logout` - Log out the current user

### Document Routes

Defined in `app/routers/documents.py`:

- `/documents/intake` - Process document intake input
- `/documents/clarify` - Generate clarification questions
- `/documents/outline` - Generate a document outline
- `/documents/sow/compile` - Compile a Statement of Work
- `/documents/prd/compile` - Compile a Product Requirements Document

### Chat Routes

Defined in `app/routers/chat.py`:

- `/chat/message` - Send a chat message to the AI workflow

### Export Routes

Defined in `app/routers/export.py`:

- `/export` - Export-related routes

### Token Routes

Defined in `app/routers/token.py`:

- `/token` - Token-related routes

## Frontend Routing

Routes are defined in `frontend/src/App.jsx`:

- `/` - Landing page
- `/dashboard` - Dashboard page

The dashboard route uses a loader to request the current user from:

```text
http://localhost:8000/auth/me
```

Unauthenticated users are redirected back to the landing page.

## Project Structure

```text
Clariva/
    app/
        core/               # Auth, security, and shared dependencies
        models/             # SQLAlchemy database models
        prompts/            # AI prompt modules
            prd/            # PRD prompt builders and compiler logic
            sow/            # SOW prompt builders and compiler logic
        routers/            # FastAPI route modules
        schemas/            # Pydantic request/response schemas
        services/           # AI, email, PDF, and storage services
        templates/
            email/          # Email HTML templates
        config.py           # Environment-based settings
        database.py         # SQLAlchemy database setup
        main.py             # FastAPI app entry point

    frontend/
        public/             # Static public assets
        src/
            assets/         # Frontend image and SVG assets
            pages/          # Route-level page components
            App.jsx         # React Router setup
            main.jsx        # React entry point
            App.css         # App-level styles
            index.css       # Global styles
        package.json        # Frontend dependencies and scripts
        vite.config.js      # Vite configuration

    scratch/                # Local prompt testing scripts
    storage/                # Local file storage
    docker-compose.yml      # Backend Docker Compose setup
    Dockerfile              # Backend container image
    requirements.txt        # Backend Python dependencies
```

## Backend Notes

The FastAPI app is created in `app/main.py`.

Database tables are created on startup with:

```python
Base.metadata.create_all(bind=engine)
```

The database connection is configured in `app/database.py` using the `DATABASE_URL` environment variable.

CORS is currently configured to allow all origins during development.

Session middleware uses `SECRET_KEY` from the environment.

## AI Workflow Notes

Clariva uses prompt modules under `app/prompts/` to support document generation workflows.

Prompt areas include:

- Intake processing
- Clarification generation
- Outline generation
- PRD compilation
- SOW compilation
- Feature and story generation
- Scope and timeline generation

AI service logic lives in:

```text
app/services/ai.py
```

## Storage and Export Notes

Generated files and local assets are stored under:

```text
storage/
```

PDF generation support is provided through WeasyPrint.

Storage helper logic lives in:

```text
app/services/storage.py
```

PDF helper logic lives in:

```text
app/services/pdf.py
```

## Environment Notes

Configuration is loaded from `.env`.

Important settings include:

- `DATABASE_URL`
- `SECRET_KEY`
- `ALGORITHM`
- `ACCESS_TOKEN_EXPIRE_MINUTES`
- `REFRESH_TOKEN_EXPIRE_DAYS`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- `MAIL_USERNAME`
- `MAIL_PASSWORD`
- `MAIL_FROM`
- `MAIL_PORT`
- `MAIL_SERVER`
- `MAIL_FROM_NAME`
- `MAIL_STARTTLS`
- `MAIL_SSL_TLS`
- `LLM_API_KEY`

Do not commit real secrets or production credentials.

## Contributing

- Create a feature branch.
- Keep API route handlers focused and move business logic into services.
- Keep Pydantic schemas aligned with request and response shapes.
- Keep prompt changes organized by document workflow.
- Run frontend linting before opening a PR.
- Build the frontend before shipping UI changes.
- Verify API docs at `/docs` when changing backend routes.
- Keep generated files and local secrets out of commits.

## License

This repository is currently private and intended for internal/product use.
