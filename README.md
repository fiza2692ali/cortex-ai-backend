# Cortex AI Backend

Backend API developed as part of the **ZYROO Backend Development Internship**.

Cortex AI is an AI-powered document processing, semantic search, and Retrieval-Augmented Generation (RAG) chat backend built using Node.js and Express.js.

The system allows authenticated users to upload documents, search their contents using vector similarity, and interact with an AI chatbot that generates document-grounded answers with source citations.

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

---

# Project Structure

```text
cortex-ai-backend/
│
├── config/
│   └── db.js
│
├── controllers/
│   ├── authController.js
│   ├── documentController.js
│   ├── healthController.js
│   ├── searchController.js
│   └── chatController.js
│
├── middleware/
│   ├── authMiddleware.js
│   ├── errorHandler.js
│   ├── logger.js
│   └── uploadMiddleware.js
│
├── models/
│   ├── User.js
│   ├── Document.js
│   ├── Chunk.js
│   ├── ChatSession.js
│   └── Message.js
│
├── routes/
│   ├── authRoutes.js
│   ├── documentRoutes.js
│   ├── healthRoutes.js
│   ├── searchRoutes.js
│   └── chatRoutes.js
│
├── services/
│   ├── chunkingService.js
│   ├── embeddingService.js
│   ├── extractionService.js
│   ├── qdrantService.js
│   └── ragService.js
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

The `.env`, `node_modules/`, and `uploads/` directories/files are excluded from Git version control.

---

# System Workflow

### Document Processing

```text
Upload Document
       ↓
Validate and Extract Text
       ↓
Generate Overlapping Chunks
       ↓
Store Metadata in MongoDB
       ↓
Generate Gemini Embeddings
       ↓
Store Vectors in Qdrant
       ↓
Document Ready for Search
```

### RAG-Powered Chat

```text
User Sends Message
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

---

# Data Models

| Model | Description |
|---|---|
| User | Stores user information and hashed passwords |
| Document | Stores document metadata, ownership, and processing status |
| Chunk | Stores extracted text chunks and processing information |
| ChatSession | Stores chat title, owner, selected document IDs, and creation date |
| Message | Stores user/assistant messages, session references, and cited sources |

---

# API Endpoints

All endpoints except registration, login, and health check require JWT authentication.

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Login user |
| GET | `/api/auth/me` | Retrieve authenticated user |

### Document Management

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/documents` | Upload PDF, DOCX, or TXT |
| GET | `/api/documents` | List user's documents |
| GET | `/api/documents/:id` | Retrieve document details |
| DELETE | `/api/documents/:id` | Delete document and associated data |

### Semantic Search

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/search` | Search document chunks using vector similarity |

### RAG Chat

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/chat/sessions` | Create chat session |
| GET | `/api/chat/sessions` | List chat sessions |
| POST | `/api/chat/sessions/:id/messages` | Send message and generate AI answer |
| GET | `/api/chat/sessions/:id/messages` | Retrieve message history |
| DELETE | `/api/chat/sessions/:id` | Delete session and messages |

---

# Week 5 — RAG Chat Implementation

## 1. Chat Session Management

Authenticated users can create chat sessions with an optional list of document IDs.

**POST** `/api/chat/sessions`

```json
{
  "title": "AI Prompting Discussion",
  "documentIds": []
}
```

An empty `documentIds` array allows retrieval across all ready documents owned by the authenticated user.

## 2. Sending a Message

**POST** `/api/chat/sessions/:id/messages`

```json
{
  "content": "What are the best practices for writing effective AI prompts?"
}
```

The backend generates a query embedding, retrieves relevant chunks from Qdrant, constructs a grounded prompt, and calls the Gemini Chat API.

## 3. AI-Generated Response with Citations

Example assistant response:

```json
{
  "role": "assistant",
  "content": "Effective prompts should be clear, specific, and provide relevant context [Source 1].",
  "sources": [
    {
      "documentId": "DOCUMENT_ID",
      "chunkId": "CHUNK_ID",
      "filename": "Prompting best practices (1).pdf",
      "chunkIndex": 0,
      "score": 0.772995
    }
  ]
}
```

Source references allow users to identify the document chunks supplied to the AI for answer generation.

## 4. Conversation History

Messages are stored in MongoDB with their roles, content, timestamps, and source references.

The history endpoint returns user and assistant messages in chronological order.

## 5. Prompt-Injection Guardrails

Retrieved document text is treated as untrusted content. The system prompt instructs Gemini not to execute commands embedded within uploaded documents.

A prompt-injection test was performed using a document containing malicious instructions. The assistant treated those instructions as document content rather than following them.

These are basic prompt-level safeguards and do not guarantee protection against every attack.

## 6. Context Management

The RAG service limits retrieved context to avoid unnecessarily large prompts.

```text
Maximum context: 12,000 characters
Maximum chunk text: 2,500 characters
Top-K retrieved chunks: 5
Recent history: 10 messages
```

Context-limit testing confirmed that the constructed context remained within the configured character limit.

---

# Environment Variables

Create a `.env` file in the project root:

```env
PORT=5000

MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_secure_jwt_secret

GEMINI_API_KEY=your_gemini_api_key
GEMINI_CHAT_MODEL=your_available_gemini_chat_model

QDRANT_URL=your_qdrant_cluster_url
QDRANT_API_KEY=your_qdrant_api_key
QDRANT_COLLECTION=cortex_chunks

UPLOAD_DIR=uploads
MAX_FILE_SIZE_MB=10
```

Never commit real API keys, database credentials, or JWT secrets to GitHub.

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

To use the Week 5 implementation:

```bash
git switch week-5-rag-chat
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Configure Environment Variables

Create `.env` and add the required configuration.

### 5. Start the Server

```bash
node server.js
```

Default local URL:

```text
http://localhost:5000
```

---

# Author

**Fiza Ali**

BS Computer Science

ZYROO Backend Development Internship