# BizCamp

A business management application with a modern UI built with Next.js, FastAPI, and MongoDB.

## Project Structure

- `frontend/`: Next.js application with TypeScript and Tailwind CSS
- `backend/`: FastAPI backend with MongoDB integration

## Setup

### Prerequisites

- Node.js (v18 or higher)
- Python 3.8+ with pip
- MongoDB connection (local or Atlas)

### Backend Setup

1. Create a virtual environment and activate it:

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Create a `.env` file in the `backend` folder with your MongoDB connection string:

```
MONGODB_URI=mongodb+srv://<username>:<password>@<your-cluster>.mongodb.net/?retryWrites=true&w=majority
```

### Frontend Setup

1. Install dependencies:

```bash
cd frontend
npm install
```

## Running the Application

### Method 1: Run Frontend and Backend Separately

#### Backend:

```bash
cd backend
# Activate virtual environment if not already active
uvicorn main:app --reload
```

The API will be available at http://localhost:8000

#### Frontend:

```bash
cd frontend
npm run dev
```

The web app will be available at http://localhost:3000

### Method 2: Run Both with Concurrently

1. Install root dependencies:

```bash
npm install
```

2. Run both frontend and backend:

```bash
npm run dev
```

## Features

- View and manage departments
- Add new departments with name and description
- Modern UI with glass effect and gradient design
