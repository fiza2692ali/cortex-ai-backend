# Cortex AI Backend

A backend project developed as part of the **ZYROO Backend Development Internship – Week 1**.

---

## Week 1 Objectives

The Week 1 project focuses on backend fundamentals and project setup.

The following components have been implemented:

- Node.js project initialization
- Express.js server setup
- Organized backend folder structure
- MongoDB Atlas database connection
- Environment variable configuration using dotenv
- CORS support
- Global error-handling middleware
- Request logging middleware
- Health check API endpoint
- Postman API testing
- Git version control
- GitHub repository setup
- `.gitignore` configuration

---

## Technologies Used

| Technology | Purpose |
|------------|---------|
| Node.js | JavaScript runtime |
| Express.js | Backend web framework |
| MongoDB Atlas | Cloud database |
| Mongoose | MongoDB object modeling and connection |
| CORS | Allows frontend-backend communication |
| dotenv | Loads environment variables |
| Nodemon | Automatically restarts the server during development |
| Git | Version control |
| GitHub | Remote code repository |
| Postman | API testing |

---

## Project Structure

The backend follows an organized structure separating routes, controllers, configuration, middleware, models, and utilities.

    cortex-ai-backend/
    │
    ├── config/
    │   └── db.js
    │
    ├── controllers/
    │   └── healthController.js
    │
    ├── middleware/
    │   ├── errorHandler.js
    │   └── logger.js
    │
    ├── models/
    │
    ├── routes/
    │   └── healthRoutes.js
    │
    ├── utils/
    │
    ├── .env
    ├── .gitignore
    ├── app.js
    ├── server.js
    ├── package.json
    ├── package-lock.json
    └── README.md

---

## Backend Components

### Express Server

The application uses Express.js to create and run the backend server.

The server starts on port 5000 by default.

### MongoDB Connection

MongoDB Atlas is used as the database.

Mongoose is used to establish the connection between the Node.js backend and MongoDB Atlas.

The database connection is stored in the `config` folder.

Sensitive database credentials are stored in environment variables instead of being hardcoded in the source code.

### CORS

CORS support has been added so that a frontend application can communicate with the backend.

### Request Logger

A request logger middleware records incoming HTTP requests.

For example, a request may produce a log similar to:

    GET /api/health 200 - 11ms

The log contains:

- HTTP method
- Requested endpoint
- HTTP response status
- Request processing time

### Global Error Handler

A global error-handling middleware is included to provide consistent JSON error responses instead of uncontrolled errors.

---

## Health Check API

The project includes the required health-check endpoint.

### Endpoint

    GET /api/health

### Purpose

The endpoint confirms that the backend server is running correctly.

### Expected Response

The API returns a JSON response similar to:

    {
        "success": true,
        "message": "Cortex AI Backend is running"
    }

The endpoint has been tested successfully using Postman.

---

## Environment Variables

Sensitive configuration values are stored in a `.env` file.

The `.env` file should contain values similar to the following:

    PORT=5000
    MONGODB_URI=your_mongodb_connection_string

Replace `your_mongodb_connection_string` with your own MongoDB Atlas connection string.

### Important

The actual `.env` file should never be uploaded to GitHub because it contains sensitive information such as database credentials.

The `.env` file is excluded through `.gitignore`.

---

## Installation

### 1. Clone the Repository

Clone the repository from GitHub using Git:

    git clone https://github.com/fiza2692ali/cortex-ai-backend

### 2. Open the Project Folder

Navigate into the project directory:

    cd cortex-ai-backend

### 3. Install Dependencies

Install the required Node.js packages:

    npm install

### 4. Create the Environment File

Create a file named:

    .env

Add your environment variables to the file.

Example:

    PORT=5000
    MONGODB_URI=your_mongodb_connection_string

Do not use the example connection string as an actual database connection.

---

## Running the Backend

### Start the Server

Run:

    node server.js

If the setup is correct, the terminal should display messages similar to:

    MongoDB connected successfully
    Server running on port 5000

### Development Mode

Nodemon can be used during development so that the server automatically restarts when files are changed.

Run:

    npx nodemon server.js

---

## Testing the API

The API can be tested using Postman.

### Health Check Request

Method:

    GET

URL:

    http://localhost:5000/api/health

The expected response is:

    {
        "success": true,
        "message": "Cortex AI Backend is running"
    }

A successful request should return an HTTP success status.

---

## Security

Sensitive information is not hardcoded into the source code.

Environment variables are used for configuration values such as:

- Server port
- MongoDB connection string
- Future API keys and other sensitive values

The `.env` file is excluded from Git using `.gitignore`.

---

## Internship

This project is part of the:

**ZYROO Internship Program**

**Track:** Cortex AI Backend Development

**Task:** Week 1 – Project Setup and Basic Server

Week 1 focuses on establishing the backend foundation that future features will be built upon.

---

## Author

**Fiza Ali**

ZYROO Backend Softeware Engineering Internship