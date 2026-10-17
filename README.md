# Cortex AI Backend

Backend API developed as part of the **ZYROO Backend Development Internship**.

Cortex AI is an AI-powered document processing, semantic search, Retrieval-Augmented Generation (RAG) chat, and subscription billing backend built using Node.js and Express.js.

The system allows authenticated users to upload documents, search their contents using vector similarity, interact with an AI chatbot that generates document-grounded answers with source citations, and manage subscription plans with usage limits.

---

## Technologies Used

| Technology | Purpose |
|---|---|
| Node.js & Express.js | Backend API development |
| MongoDB Atlas & Mongoose | Database and data modeling |
| bcrypt & JWT | Authentication and security |
| Multer, pdf-parse, mammoth | Document upload and text extraction |
| Google Gemini API | Embeddings and AI chat generation |
| Qdrant | Vector storage and semantic retrieval |
| Stripe | Subscription billing, Checkout, and webhooks |
| node-cron | Scheduled billing-cycle usage resets |
| CORS & dotenv | Application configuration |
| Git & GitHub | Version control |
| Postman | API testing |

---

# Features

## Week 1 — Backend Setup

- Express server and MongoDB Atlas connection
- Health check API
- Request logging and centralized error handling
- Environment configuration and CORS support

## Week 2 — User Authentication

- User registration and login
- Password hashing using bcrypt
- JWT generation and authentication middleware
- Protected user profile endpoint
- Input validation and authentication error handling

## Weeks 3–4 — Document Processing & Semantic Search

- Authenticated PDF, DOCX, and TXT uploads
- Text extraction and overlapping chunk generation
- Document and chunk storage in MongoDB
- Gemini embedding generation (1536 dimensions)
- Qdrant vector storage with cosine similarity
- Top-K semantic search with document ownership filtering
- Document listing, retrieval, and cascade deletion
- Processing status tracking and embedding retry handling

## Week 5 — RAG-Powered Chat API

- Chat session creation, listing, and deletion
- Optional document-scoped conversations
- User and assistant message storage in MongoDB
- Gemini-powered AI answer generation
- Retrieval of relevant document chunks from Qdrant
- AI-generated answers with source citations
- Conversation history retrieval
- JWT-protected chat endpoints
- Prompt-injection guardrails
- Context truncation to control prompt size

## Week 6 — Subscription & Billing System

- Free, Pro, and Team subscription plans
- Stripe Checkout for paid subscription upgrades
- Stripe Sandbox payment testing
- Subscription records stored in MongoDB
- JWT-protected billing endpoints
- Verified Stripe webhook processing
- Subscription activation, updates, and cancellation handling
- Document upload, chat message, and storage quotas
- Usage tracking and quota enforcement middleware
- Quota refunds for unsuccessful operations
- Storage quota release when documents are deleted
- Billing-cycle usage resets using node-cron
- Subscription details and remaining usage through the billing API

---

# Project Structure

```text
cortex-ai-backend/
│
├── config/
│   ├── db.js
│   ├── plans.js
│   └── stripe.js
│
├── controllers/
│   ├── authController.js
│   ├── documentController.js
│   ├── healthController.js
│   ├── searchController.js
│   ├── chatController.js
│   ├── billingController.js
│   └── stripeWebhookController.js
│
├── middleware/
│   ├── authMiddleware.js
│   ├── errorHandler.js
│   ├── logger.js
│   ├── uploadMiddleware.js
│   ├── quotaMiddleware.js
│   └── storageQuotaMiddleware.js
│
├── models/
│   ├── User.js
│   ├── Document.js
│   ├── Chunk.js
│   ├── ChatSession.js
│   ├── Message.js
│   └── Subscription.js
│
├── routes/
│   ├── authRoutes.js
│   ├── documentRoutes.js
│   ├── healthRoutes.js
│   ├── searchRoutes.js
│   ├── chatRoutes.js
│   ├── billingRoutes.js
│   └── webhookRoutes.js
│
├── services/
│   ├── chunkingService.js
│   ├── embeddingService.js
│   ├── extractionService.js
│   ├── qdrantService.js
│   ├── ragService.js
│   └── subscriptionService.js
│
├── jobs/
│   └── usageResetJob.js
│
├── uploads/
├── .env
├── .gitignore
├── app.js
├── server.js
├── package.json
├── package-lock.json
└── README.md
```

The `.env`, `node_modules/`, and `uploads/` files/directories are excluded from Git version control.

---

# System Workflow

### Document Processing

```text
Authenticated User Uploads Document
               ↓
Check Document Upload Quota
               ↓
Validate File and Check Storage Quota
               ↓
Extract Text from Document
               ↓
Generate Overlapping Chunks
               ↓
Store Metadata in MongoDB
               ↓
Generate Gemini Embeddings
               ↓
Store Vectors in Qdrant
               ↓
Mark Document as Ready
               ↓
Update Usage Counters
```

### RAG-Powered Chat

```text
Authenticated User Sends Message
               ↓
Check Message Quota
               ↓
Generate Query Embedding
               ↓
Retrieve Relevant Chunks (Qdrant)
               ↓
Build Prompt with Document Context
               ↓
Gemini Generates Answer
               ↓
Attach Source Citations
               ↓
Save Messages in MongoDB
               ↓
Return AI Answer to User
```

### Stripe Subscription Billing

```text
Authenticated User Selects Plan
               ↓
POST /api/billing/checkout
               ↓
Backend Creates Stripe Checkout Session
               ↓
User Completes Payment in Stripe Sandbox
               ↓
Stripe Sends Webhook Event
               ↓
Backend Verifies Webhook Signature
               ↓
Update Subscription in MongoDB
               ↓
Apply Subscription Plan and Quotas
               ↓
GET /api/billing/me
```

---

# Data Models

| Model | Description |
|---|---|
| User | Stores user information and hashed passwords |
| Document | Stores document metadata, ownership, file size, and processing status |
| Chunk | Stores extracted text chunks and processing information |
| ChatSession | Stores chat title, owner, selected document IDs, and creation date |
| Message | Stores user/assistant messages, session references, and cited sources |
| Subscription | Stores subscription plan, billing status, Stripe identifiers, billing period, and usage counters |

---

# API Endpoints

Registration, login, health check, public plan information, and Stripe webhook delivery do not require JWT authentication.

Other endpoints require a valid JWT access token.

## Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Login user |
| GET | `/api/auth/me` | Retrieve authenticated user |

## Document Management

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/documents` | Upload PDF, DOCX, or TXT with quota validation |
| GET | `/api/documents` | List user's documents |
| GET | `/api/documents/:id` | Retrieve document details |
| DELETE | `/api/documents/:id` | Delete document, associated data, and release storage quota |

## Semantic Search

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/search` | Search document chunks using vector similarity |

## RAG Chat

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/chat/sessions` | Create chat session |
| GET | `/api/chat/sessions` | List chat sessions |
| POST | `/api/chat/sessions/:id/messages` | Send message with quota enforcement |
| GET | `/api/chat/sessions/:id/messages` | Retrieve message history |
| DELETE | `/api/chat/sessions/:id` | Delete session and messages |

## Subscription & Billing

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/billing/plans` | Retrieve available subscription plans |
| GET | `/api/billing/me` | Retrieve subscription details and usage |
| POST | `/api/billing/checkout` | Create Stripe Checkout Session |
| POST | `/api/billing/cancel` | Request subscription cancellation |
| POST | `/api/webhooks/stripe` | Receive and verify Stripe webhook events |

---

# Week 6 — Subscription & Billing Implementation

## 1. Subscription Plans

Cortex AI provides three subscription tiers with different usage limits.

| Feature | Free | Pro | Team |
|---|---:|---:|---:|
| Document uploads per billing period | 5 | 50 | 500 |
| Chat messages per billing period | 20 | 500 | 5,000 |
| Storage quota | 25 MB | 500 MB | 5 GB |
| Subscription type | Free | Monthly | Monthly |

The sample Stripe Sandbox prices used for testing are $10/month for Pro and $30/month for Team. These are configurable development prices.

Plan limits are defined in `config/plans.js`.

## 2. Subscription Management

The `Subscription` model stores each user's plan and billing information, including:

- User ownership reference
- Current subscription plan and status
- Stripe customer and subscription IDs
- Stripe Price ID
- Billing period start and end dates
- Document upload usage
- Chat message usage
- Storage usage in bytes
- Cancellation-at-period-end status

A default Free subscription is available to users who have not purchased a paid plan.

## 3. Stripe Checkout Integration

Authenticated users can request a paid subscription using:

**POST** `/api/billing/checkout`

Example request:

```json
{
  "plan": "pro"
}
```

The backend creates a Stripe Checkout Session using the configured recurring Price ID.

The returned Checkout URL redirects the user to Stripe's hosted payment page.

Checkout is tested in Stripe Sandbox, without charging real payment cards.

## 4. Stripe Webhook Integration

Stripe sends subscription-related events to:

**POST** `/api/webhooks/stripe`

The backend verifies the Stripe signature using `STRIPE_WEBHOOK_SECRET`.

Stripe CLI is used to forward sandbox webhook events to the local backend during development.

## 5. Usage Tracking and Quota Enforcement

The backend enforces plan-specific limits through middleware.

**Document quota:** Checks the number of document uploads allowed within the billing period.

**Message quota:** Checks whether the user has remaining chat messages before processing a RAG request.

**Storage quota:** Checks whether the uploaded file's size fits within the user's remaining storage allocation.

Quota reservations are refunded when an upload or message fails, where supported by the middleware and controller flow.

When a document is deleted, its recorded file size is released from storage usage.

The system uses the original uploaded file size as the document's storage allocation for quota accounting.

## 6. Subscription Cancellation

**POST** `/api/billing/cancel`

Authenticated users can request cancellation of their paid subscription.

The backend communicates with Stripe and stores the updated cancellation state.

For subscriptions configured to cancel at the end of the billing period, access continues until that period ends, subject to Stripe's subscription status.

## 7. Billing-Cycle Usage Resets

The backend uses `node-cron` to support scheduled usage resets for Free subscriptions.

Paid subscription billing periods are synchronized using Stripe subscription events.

Document upload and message usage counters are reset when a new billing period begins.

Storage usage is tracked separately because existing stored documents may continue consuming storage across billing periods.

## 8. Billing Information

**GET** `/api/billing/me`

The authenticated user can retrieve subscription information such as:

- Current plan
- Subscription status
- Billing period dates
- Usage counters
- Plan limits
- Remaining usage
- Cancellation status

This endpoint helps verify subscription upgrades and quota tracking during testing.

# Environment Variables

Create a `.env` file in the project root:

```env
# Server
PORT=5000

# MongoDB
MONGODB_URI=your_mongodb_connection_string

# Authentication
JWT_SECRET=your_secure_jwt_secret

# Google Gemini
GEMINI_API_KEY=your_gemini_api_key
GEMINI_CHAT_MODEL=your_available_gemini_chat_model

# Qdrant
QDRANT_URL=your_qdrant_cluster_url
QDRANT_API_KEY=your_qdrant_api_key
QDRANT_COLLECTION=cortex_chunks

# File Upload
UPLOAD_DIR=uploads
MAX_FILE_SIZE_MB=10

# Stripe Sandbox
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PRO_PRICE_ID=price_your_pro_price_id
STRIPE_TEAM_PRICE_ID=price_your_team_price_id
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_signing_secret

# Checkout Redirect
CLIENT_URL=http://localhost:3000
```

**Important:**

- Never commit real API keys, database credentials, JWT secrets, or webhook signing secrets to GitHub.
- Keep Stripe Sandbox keys and prices from the same sandbox environment.
- The Stripe CLI webhook secret is used for local webhook forwarding.

---

# Installation and Setup

### 1. Clone the Repository

```bash
git clone https://github.com/fiza2692ali/cortex-ai-backend.git
```

### 2. Open the Project

```bash
cd cortex-ai-backend
```

To use the Week 6 implementation:

```bash
git switch week-6-stripe-billing
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Configure Environment Variables

Create a `.env` file in the project root and add the required configuration.

Set up MongoDB Atlas, Google Gemini, Qdrant, and Stripe Sandbox credentials.

### 5. Start the Backend Server

```bash
node server.js
```

Default local URL:

```text
http://localhost:5000
```

### 6. Configure Stripe CLI for Local Webhook Testing

Install Stripe CLI following the official Stripe documentation:

https://docs.stripe.com/stripe-cli

Log in:

```powershell
stripe.cmd login
```

Forward the required events:

```powershell
stripe.cmd listen --events checkout.session.completed,customer.subscription.updated,customer.subscription.deleted --forward-to localhost:5000/api/webhooks/stripe
```

Copy the displayed webhook signing secret into `.env` as `STRIPE_WEBHOOK_SECRET`.

Restart the backend after changing environment variables.

---

# Author

**Fiza Ali**  
BS Computer Science  
ZYROO Backend Development Internship