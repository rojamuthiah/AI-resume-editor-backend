# AI Resume Editor – Backend

The **AI Resume Editor Backend** powers the AI-driven resume enhancement workflow.  
Built using **Node.js + Express**, it provides APIs for resume editing, file handling, authentication, and AI integration.

---

## 🚀 Features

- AI-powered resume enhancement API  
- PDF/DOC file upload support  
- JWT authentication  
- Modular folder structure  
- Centralized error handling  
- OpenAI/RAG compatible service layer  
- DB-ready setup (MongoDB/Postgres/MySQL)  
- CORS enabled  
- Lightweight & fast Express server

---

## 📂 Folder Structure

backend/
├── src/
│ ├── controllers/
│ ├── routes/
│ ├── services/
│ ├── utils/
│ ├── middleware/
│ ├── config/
│ └── index.js



---

## 🛠 Tech Stack

- Node.js  
- Express.js  
- JSON Web Tokens (JWT)  
- Multer (file uploads)  
- OpenAI API (optional)  
- Any SQL/NoSQL database

---

---

## 🔧 Installation

### 1. Clone the repository
git clone https://github.com/rojamuthiah/AI-resume-editor-backend.git
cd AI-resume-editor-backend

### 2. Install dependencies
npm install

### 3. Create a `.env` file in the project root
PORT=5000
JWT_SECRET=your_secret_key
OPENAI_API_KEY=your_openai_key

---

## ▶️ Run the Server

### Development mode
npm run dev

### Production mode
npm start

Server runs at:
http://localhost:5000
