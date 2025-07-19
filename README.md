# 🎓 Student Attendance System

## 📘 Project Overview

The **Student Attendance System** is a full-stack web application that helps educational institutions easily manage and track student attendance digitally. Instead of maintaining paper registers or spreadsheets, this system allows teachers, admins, and students to access everything from one intuitive online platform.

This project is divided into two main parts:
- **Backend:** Built using Node.js and Express (handles data and logic).
- **Frontend:** Built using React with Vite and TypeScript (what users see and interact with).

---

## 🛠️ Technologies Used

### Backend
- **Runtime Environment:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB (for storing all data securely)
- **Authentication:** JWT (JSON Web Tokens)

### Frontend
- **Library:** React
- **Bundler:** Vite (for fast performance during development)
- **Language:** TypeScript (adds safety and clarity to the code)

---

## 🗃️ Backend (Server Side)

This part of the application handles:
- Saving and retrieving data like student lists, attendance, and users.
- Managing user access (admin, teacher, student).
- Responding to frontend requests (via APIs).

### ✨ Key Features
- RESTful APIs for:
  - Students
  - Classes
  - Attendance Records
  - User Management (Admins & Teachers)
- Secure login and protected routes (middleware)
- File upload support (e.g., bulk student data)
- Clean and modular code

### 📂 Directory Structure
```
fsd_v4/backend/
├── controllers/     # Logic for each functionality
├── models/          # MongoDB data models
├── routes/          # API endpoint definitions
├── middleware/      # Custom logic like authentication
├── uploads/         # Uploaded files (if any)
├── scripts/         # Utility scripts (e.g., dummy data)
└── server.js        # Entry point for backend
```

---

## 🖥️ Frontend (Client Side)

This is what the user interacts with: login screens, dashboards, attendance forms, etc.

### ✨ Key Features
- Beautiful and responsive interface
- Different dashboards for:
  - Admin
  - Teacher
  - Student
- Real-time data fetching from backend
- Attendance marking/editing tools
- Role-based access (users see only what's relevant to them)

### 📂 Directory Structure
```
fsd_v4/frontend/
├── public/              # Static assets (e.g., logo, index.html)
└── src/
    ├── components/      # Reusable UI blocks (e.g., Navbar, Form)
    ├── pages/           # Different screens (e.g., Login, Dashboard)
    ├── services/        # API call logic
    ├── utils/           # Helper functions
    └── main.tsx         # App entry point
```

---

## 🚀 Getting Started (Step-by-Step)

### ✅ Prerequisites
Make sure you have these installed on your computer:
- [Node.js (v14+)](https://nodejs.org/)
- npm or yarn
- [MongoDB](https://www.mongodb.com/) (Local or Cloud like Atlas)

---

### ⚙️ Backend Setup

1. Open your terminal and go to the backend folder:
   ```bash
   cd fsd_v4/backend
   ```

2. Install backend dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file and add:
   ```
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_secret_key
   ```

4. Start the backend server:
   ```bash
   npm start
   ```

---

### 🎨 Frontend Setup

1. Go to the frontend folder:
   ```bash
   cd fsd_v4/frontend
   ```

2. Install frontend dependencies:
   ```bash
   npm install
   ```

3. Start the React development server:
   ```bash
   npm run dev
   ```

4. Open your browser and go to:
   ```
   http://localhost:5173
   ```

---

## 🎯 Core Features

- 🔐 User Authentication (Login & Logout)
- 👥 Role-Based Access:
  - Admin: Full control (manage classes, teachers, students)
  - Teacher: Mark attendance, view classes
  - Student: View personal attendance reports
- 📅 Attendance Management:
  - Mark, edit, and view daily attendance
- 📊 Reports and Analytics:
  - Visual stats of attendance trends
