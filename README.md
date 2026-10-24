# Cortex AI Backend

An AI-powered backend developed during the **ZYROO Backend Development Internship**, using Node.js and Express.js.

Cortex AI allows users to upload documents, perform semantic searches, chat with their documents using Retrieval-Augmented Generation (RAG), manage subscriptions, and collaborate through team workspaces.

## Technologies Used

- **Backend:** Node.js, Express.js
- **Database:** MongoDB Atlas, Mongoose
- **AI:** Google Gemini API, Qdrant Vector Database
- **Authentication:** JWT, bcrypt
- **Document Processing:** Multer, pdf-parse, mammoth
- **Payments:** Stripe
- **Security:** Helmet, rate limiting, input validation
- **Testing & Documentation:** Jest, Supertest, Swagger/OpenAPI

## Features & Internship Progress

| Week | Implementation |
|---|---|
| **Week 1** | Express server, MongoDB connection, health checks, error handling |
| **Week 2** | User registration, login, password hashing, JWT authentication |
| **Weeks 3–4** | PDF/DOCX/TXT uploads, text extraction, chunking, Gemini embeddings, Qdrant semantic search |
| **Week 5** | RAG-powered AI chat, conversation history, document-grounded answers with citations |
| **Week 6** | Free/Pro/Team plans, Stripe Checkout, webhooks, usage quotas, subscription management |
| **Weeks 7–8** | Team workspaces, member management, shared documents and chat, admin APIs, security improvements, automated tests, Swagger documentation |

## Installation & Setup

**1. Clone the repository**

```bash
git clone https://github.com/fiza2692ali/cortex-ai-backend.git
cd cortex-ai-backend
```

**2. Install dependencies**

```bash
npm install
```

**3. Configure environment variables**

Copy `.env.example` to `.env` and provide your MongoDB Atlas, Gemini, Qdrant, Stripe, and JWT configuration.

Never commit actual API keys or secrets.

**4. Start the server**

```bash
npm start
```

The backend runs locally at `http://localhost:5000` by default.

## API Documentation

Interactive Swagger documentation is available at:

`http://localhost:5000/api-docs`

The API includes authentication, document management, semantic search, RAG chat, subscription billing, team workspaces, and administration.

Protected endpoints use JWT Bearer authentication.

## Testing

Run the automated test suite using:

```bash
npm test
```

Tests cover authentication, document processing, quotas, RAG integration, and security-related functionality.

## Author

**Fiza Ali**  
ZYROO Backend Development Internship