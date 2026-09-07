# Cortex AI Backend

Backend API developed as part of the **ZYROO Backend Development Internship**.

The project currently includes the Week 1 backend setup and Week 2 **User Authentication** system using Node.js, Express, MongoDB, bcrypt, and JWT.

---

## Technologies Used

| Technology    | Purpose                                              |
| ------------- | ---------------------------------------------------- |
| Node.js       | JavaScript runtime                                   |
| Express.js    | Backend web framework                                |
| MongoDB Atlas | Cloud database                                       |
| Mongoose      | MongoDB object modeling and connection               |
| bcrypt        | Password hashing                                     |
| jsonwebtoken  | JWT generation and verification                      |
| CORS          | Allows frontend-backend communication                |
| dotenv        | Loads environment variables                          |
| Nodemon       | Automatically restarts the server during development |
| Git           | Version control                                      |
| GitHub        | Remote code repository                               |
| Postman       | API testing                                          |

---

## Features

### Week 1 — Backend Setup

* Express server setup
* MongoDB Atlas connection
* Health check API
* Request logging
* Centralized error handling
* Environment variable configuration
* CORS support

### Week 2 — User Authentication

* User registration
* Email validation
* Password validation
* Secure password hashing with bcrypt
* Duplicate email detection
* User login
* JWT token generation
* JWT authentication middleware
* Protected `/api/auth/me` route
* Invalid and expired token handling

---

## Project Structure

```text
cortex-ai-backend/
│
├── config/
│   └── db.js
│
├── controllers/
│   ├── authController.js
│   └── healthController.js
│
├── middleware/
│   ├── authMiddleware.js
│   ├── errorHandler.js
│   └── logger.js
│
├── models/
│   └── User.js
│
├── routes/
│   ├── authRoutes.js
│   └── healthRoutes.js
│
├── .env
├── .gitignore
├── app.js
├── server.js
├── package.json
└── README.md
```

---

## API Endpoints

| Method | Endpoint             | Description                      | Authentication |
| ------ | -------------------- | -------------------------------- | -------------- |
| GET    | `/api/health`        | Check server status              | No             |
| POST   | `/api/auth/register` | Register a new user              | No             |
| POST   | `/api/auth/login`    | Login and receive JWT            | No             |
| GET    | `/api/auth/me`       | Get logged-in user's information | Yes            |

---

## Authentication

### Register

**POST** `/api/auth/register`

Request body:

```json
{
  "name": "Test User",
  "email": "test@example.com",
  "password": "password123"
}
```

The password is hashed using bcrypt before being stored in MongoDB.

---

### Login

**POST** `/api/auth/login`

Request body:

```json
{
  "email": "test@example.com",
  "password": "password123"
}
```

A successful login returns a JWT token.

---

### Protected Route

**GET** `/api/auth/me`

Send the JWT using the Authorization header:

```text
Authorization: Bearer YOUR_JWT_TOKEN
```

The middleware verifies the token and attaches the decoded user information to the request.

---

## Validation & Error Handling

The authentication system handles:

* Missing required fields
* Invalid email format
* Passwords shorter than 6 characters
* Duplicate email registration
* Incorrect login credentials
* Missing JWT token
* Invalid JWT token
* Expired JWT token
* Server errors

Invalid authentication requests return **HTTP 401 Unauthorized**.

---

# Installation

## 1. Clone the Repository

Clone the repository from GitHub:

```bash
git clone https://github.com/fiza2692ali/cortex-ai-backend.git
```

## 2. Open the Project Folder

```bash
cd cortex-ai-backend
```

## 3. Install Dependencies

```bash
npm install
```

## 4. Create the Environment File

Create a file named:

```text
.env
```

Add the required environment variables:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_secure_jwt_secret
```

Do not use example values as actual credentials.

---

# Running the Backend

## Start the Server

Run:

```bash
node server.js
```

If the setup is correct, the terminal should display messages similar to:

```text
MongoDB connected successfully
Server running on port 5000
```

---

## Testing with Postman

The authentication APIs were tested using Postman.

Test the following:

1. Register a new user using `/api/auth/register`.
2. Verify that the password is stored as a bcrypt hash in MongoDB.
3. Login using `/api/auth/login` and copy the returned JWT.
4. Use the JWT as a Bearer Token for `/api/auth/me`.
5. Verify that requests without a token or with an invalid/expired token are rejected with `401 Unauthorized`.

---

## Security

* Passwords are never stored in plain text.
* JWT authentication is used for protected routes.
* Sensitive configuration is stored in environment variables.
* `.env` is excluded from version control.

---

# Internship Progress

### Week 1

Backend and database foundation completed.

### Week 2

User authentication and JWT-based authorization completed.

---

## Author

**Fiza Ali**

BS Computer Science
ZYROO Backend Development Internship
