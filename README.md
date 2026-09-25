# Cortex AI Backend

Backend API developed as part of the **ZYROO Backend Development Internship**.

Cortex AI is a document-processing and semantic-search backend built with Node.js and Express.js. The project currently includes the backend foundation, user authentication, document ingestion and extraction, text chunking, vector embedding generation, vector storage, and semantic search.

The system allows authenticated users to upload PDF, DOCX, and TXT documents. Their contents are extracted, divided into overlapping chunks, converted into vector embeddings, and stored for semantic similarity search.

---

## Technologies Used

| Technology | Purpose |
| --- | --- |
| Node.js | JavaScript runtime |
| Express.js | Backend web framework |
| MongoDB Atlas | Stores users, documents, and chunks |
| Mongoose | MongoDB object modeling and connection |
| bcrypt | Password hashing |
| jsonwebtoken | JWT generation and verification |
| Multer | Multipart file upload handling |
| pdf-parse | Text extraction from PDF files |
| mammoth | Text extraction from DOCX files |
| Google Gemini Embeddings API | Generates vector embeddings |
| Qdrant | Vector database for semantic search |
| CORS | Enables frontend-backend communication |
| dotenv | Loads environment variables |
| Git | Version control |
| GitHub | Remote code repository |
| Postman | API testing |

---

# Features

## Week 1 — Backend Setup

- Express server setup
- MongoDB Atlas connection
- Health check API
- Request logging
- Centralized error handling
- Environment variable configuration
- CORS support

## Week 2 — User Authentication

- User registration
- Email validation
- Password validation
- Secure password hashing with bcrypt
- Duplicate email detection
- User login
- JWT token generation
- JWT authentication middleware
- Protected `/api/auth/me` route
- Invalid and expired token handling

## Weeks 3–4 — Document Processing & Semantic Search

- Authenticated document upload
- PDF, DOCX, and TXT file support
- File type and file size validation
- Text extraction from uploaded documents
- Overlapping text chunk generation
- Approximately 500-token chunks with approximately 50-token overlap
- Document metadata storage in MongoDB
- Chunk storage in MongoDB
- Document processing status tracking
- Vector embedding generation for document chunks
- Gemini embedding retry/backoff handling
- Qdrant vector storage
- Cosine similarity search
- Top-K semantic search results
- Search across all documents belonging to the authenticated user
- Search scoped to one selected document
- Qdrant payload filtering using owner and document IDs
- Qdrant payload indexes for filtered search
- Document listing and retrieval
- Document deletion
- Cascade deletion of associated chunks and vectors
- Processing failure handling

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
│   └── searchController.js
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
│   └── Chunk.js
│
├── routes/
│   ├── authRoutes.js
│   ├── documentRoutes.js
│   ├── healthRoutes.js
│   └── searchRoutes.js
│
├── services/
│   ├── chunkingService.js
│   ├── embeddingService.js
│   ├── extractionService.js
│   └── qdrantService.js
│
├── uploads/
│
├── .env
├── .gitignore
├── app.js
├── server.js
├── package.json
├── package-lock.json
└── README.md
```

The `uploads/` directory is used temporarily while processing uploaded files and is excluded from Git version control.

---

# System Workflow

The document-processing pipeline follows this workflow:

```text
Authenticated User
        |
        v
Upload PDF / DOCX / TXT
        |
        v
Multer File Validation
        |
        v
Text Extraction
        |
        v
Text Chunking
(~500 tokens, ~50 overlap)
        |
        v
Store Document + Chunks in MongoDB
        |
        v
Generate Gemini Embeddings
        |
        v
Store Vectors in Qdrant
        |
        v
Document Status = Ready
        |
        v
Semantic Search Available
```

For semantic search:

```text
User Search Query
        |
        v
Generate Query Embedding
        |
        v
Qdrant Cosine Similarity Search
        |
        v
Filter by Authenticated User
        |
  +-------------------------+
  |                         |
  v                         v
All User Documents      Selected Document
      |                     |
      +----------+----------+
                 |
                 v
           Top-K Chunks
                 |
                 v
        Source + Similarity Score
```

---

# Data Models

## User

Stores registered user information such as:

- Name
- Email
- Hashed password

Passwords are hashed using bcrypt before being stored.

## Document

Stores metadata for an uploaded document, including:

- Owner
- Filename
- File type
- Processing status
- Page count
- Upload date

Document status can be:

```text
processing
ready
failed
```

A newly uploaded document begins in the `processing` state.

After successful extraction, chunking, embedding generation, and vector storage, its status becomes `ready`.

If processing fails, its status becomes `failed`.

## Chunk

Stores individual pieces of extracted document text, including:

- Parent document reference
- Chunk index
- Chunk text
- Token count
- Embedding processing status
- Embedding attempts

Chunks are associated with their parent document.

---

# Document Processing

## Supported File Types

The upload API supports:

```text
PDF
DOCX
TXT
```

File validation is performed before document processing.

The maximum upload size can be configured through the environment variables.

## Text Extraction

Different extraction methods are used depending on the uploaded file type:

| File Type | Extraction Method |
| --- | --- |
| PDF | `pdf-parse` |
| DOCX | `mammoth` |
| TXT | Node.js file reading |

The extracted text is cleaned before being sent to the chunking process.

---

# Text Chunking

Extracted document text is divided into smaller overlapping chunks.

The approximate configuration is:

```text
Chunk size: 500 tokens
Overlap: 50 tokens
```

Overlap helps preserve contextual information between neighboring chunks.

Each chunk contains:

```text
document
chunkIndex
text
tokenCount
```

The chunks are stored in MongoDB before vector processing.

---

# Vector Embeddings

Each document chunk is converted into a numerical vector using the Google Gemini Embeddings API.

Embedding model:

```text
gemini-embedding-001
```

Embedding dimensionality used by the project:

```text
1536
```

Embedding generation includes retry handling so temporary API failures do not immediately terminate processing.

If embedding generation continues to fail after the configured attempts, the failure is recorded and the parent document is marked as failed.

---

# Vector Storage with Qdrant

Generated embeddings are stored in a Qdrant collection.

Default collection name:

```text
cortex_chunks
```

The collection uses:

```text
Vector size: 1536
Distance metric: Cosine
```

Each Qdrant point also contains payload information such as:

```text
chunkId
documentId
ownerId
filename
chunkIndex
text
```

This allows semantic-search results to include their original source information.

Payload indexes are created for:

```text
ownerId
documentId
```

These indexes support efficient and valid filtered semantic-search queries.

---

# Semantic Search

Semantic search finds chunks according to **meaning and vector similarity**, rather than requiring exact keyword matches.

The process is:

1. Receive the user's search query.
2. Generate an embedding for the query.
3. Send the query vector to Qdrant.
4. Apply the authenticated user's `ownerId` filter.
5. Optionally apply a `documentId` filter.
6. Perform cosine similarity search.
7. Return the Top-K most similar chunks.

Each result includes information such as:

```json
{
    "score": 0.741,
    "documentId": "DOCUMENT_ID",
    "filename": "example.pdf",
    "chunkId": "CHUNK_ID",
    "chunkIndex": 0,
    "text": "Relevant document text..."
}
```

Higher similarity scores generally indicate greater semantic similarity to the query.

---

# Uploading a Document

## Endpoint

```text
POST /api/documents
```

Authentication:

```text
Bearer Token
```

The request must use:

```text
multipart/form-data
```

Form-data field:

| Key | Type | Value |
| --- | --- | --- |
| `file` | File | PDF, DOCX, or TXT file |

Example processing sequence:

```text
Upload
   ↓
Validate
   ↓
Extract
   ↓
Chunk
   ↓
Embed
   ↓
Store vectors
   ↓
Ready
```

A successful response includes document information such as filename, type, processing status, page count, and chunk count.

---

# Get All Documents

## Endpoint

```text
GET /api/documents
```

Authentication is required.

The endpoint only returns documents owned by the authenticated user.

---

# Get One Document

## Endpoint

```text
GET /api/documents/:id
```

Example:

```text
GET /api/documents/DOCUMENT_ID
```

The endpoint verifies that the requested document belongs to the authenticated user.

It also returns the number of chunks associated with the document.

---

# Delete a Document

## Endpoint

```text
DELETE /api/documents/:id
```

Deleting a document performs cascade cleanup.

```text
Delete Request
      |
      v
Delete Qdrant Vectors
      |
      v
Delete MongoDB Chunks
      |
      v
Delete MongoDB Document
```

This prevents orphaned chunks and vectors from remaining after a document is removed.

---

# Semantic Search Examples

## Search Across All User Documents

**POST** `/api/search`

```json
{
    "query": "What are prompting best practices?",
    "topK": 5
}
```

Because no `documentId` is supplied, Qdrant searches across documents belonging to the authenticated user.

Example response structure:

```json
{
    "success": true,
    "query": "What are prompting best practices?",
    "documentId": null,
    "topK": 5,
    "count": 5,
    "results": [
        {
            "score": 0.741,
            "documentId": "DOCUMENT_ID",
            "filename": "example.pdf",
            "chunkId": "CHUNK_ID",
            "chunkIndex": 0,
            "text": "Relevant document text..."
        }
    ]
}
```

---

## Search Within One Document

To restrict the search to one document:

```json
{
    "query": "What are prompting best practices?",
    "documentId": "DOCUMENT_ID",
    "topK": 3
}
```

The search then applies both:

```text
ownerId = authenticated user
AND
documentId = selected document
```

This prevents chunks from other documents from appearing in the scoped results.

---

# Error Handling

The backend includes centralized error handling and validation for situations such as:

- Missing required fields
- Invalid email format
- Short passwords
- Duplicate email registration
- Incorrect login credentials
- Missing JWT
- Invalid JWT
- Expired JWT
- Missing uploaded file
- Unsupported file types
- File size violations
- Empty extracted document text
- Document processing failures
- Embedding API failures
- Vector database failures
- Invalid semantic-search queries
- Invalid `topK`
- Unauthorized document access
- Document not found

Appropriate HTTP status codes and JSON error responses are returned to the client.

---

# Embedding Retry Handling

Embedding API calls use retry handling.

If an embedding request fails, the backend retries the operation before considering it unsuccessful.

The general flow is:

```text
Embedding Request
      |
      v
   Success? ------ Yes ------> Continue Processing
      |
      No
      |
      v
Wait / Backoff
      |
      v
Retry Request
      |
      v
Maximum Attempts Reached?
      |
      Yes
      |
      v
Mark Processing as Failed
```

This makes document processing more resilient to temporary embedding API errors.

---

# Environment Variables

Create a `.env` file in the project root.

Example:

```env
PORT=5000

MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_secure_jwt_secret

GEMINI_API_KEY=your_gemini_api_key

QDRANT_URL=your_qdrant_cluster_url
QDRANT_API_KEY=your_qdrant_api_key
QDRANT_COLLECTION=cortex_chunks

UPLOAD_DIR=uploads
MAX_FILE_SIZE_MB=10
```

Never place actual passwords, database credentials, JWT secrets, or API keys in the README.

The `.env` file must not be committed to GitHub.

---

# Installation

## 1. Clone the Repository

```bash
git clone https://github.com/fiza2692ali/cortex-ai-backend.git
```

## 2. Open the Project Directory

```bash
cd cortex-ai-backend
```

## 3. Install Dependencies

```bash
npm install
```

## 4. Configure Environment Variables

Create:

```text
.env
```

Add all required environment variables shown in the Environment Variables section.

---

# Running the Backend

Start the application with:

```bash
node server.js
```

If the configuration is valid, the server connects to MongoDB and starts listening on the configured port.

Default local URL:

```text
http://localhost:5000
```

---

# Testing with Postman

The API was tested using Postman.

The main test workflow is:

1. Register a user.
2. Login and obtain a JWT.
3. Add the JWT as a Bearer Token.
4. Upload a PDF document.
5. Verify successful extraction and chunk creation.
6. Upload DOCX and TXT documents.
7. Verify document status becomes `ready`.
8. Retrieve all documents.
9. Retrieve a single document.
10. Perform semantic search across the user's documents.
11. Perform semantic search scoped to one document.
12. Verify that relevant chunks are ranked by similarity.
13. Delete a test document.
14. Verify that its associated chunks and vectors are also removed.
15. Test invalid/missing authentication and invalid requests.

---

# Security

- Passwords are hashed using bcrypt.
- Passwords are never stored in plain text.
- JWT authentication protects private endpoints.
- Users can only retrieve their own documents.
- Semantic search is filtered using the authenticated user's ID.
- Document-scoped searches verify document ownership.
- Sensitive credentials are stored in environment variables.
- `.env` is excluded from version control.
- Uploaded temporary files are excluded from version control.
- File uploads are validated by supported type and size.

---

# Author

**Fiza Ali**

BS Computer Science

ZYROO Backend Development Internship