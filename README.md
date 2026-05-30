# Pricevana

Pricevana is a smart price tracking and product discovery web application. It is decoupled into a static frontend and a Python REST API backend.

---

## Local Development Setup

### Backend (Python Flask API)
The backend is built with Python Flask and provides the endpoints for product scraping and price prediction.

1. Navigate to the `backend/` directory:
   ```bash
   cd backend
   ```
2. Install the required dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Run the Flask application:
   ```bash
   python app.py
   ```
   The backend API will run locally on `http://127.0.0.1:5000` (without HTTPS).

### Frontend (Static Web App)
The frontend contains pure static HTML, CSS, and Javascript.

1. Navigate to the `frontend/` directory:
   ```bash
   cd frontend
   ```
2. Serve the static files using Python's built-in HTTP server:
   ```bash
   python -m http.server 8000
   ```
3. Open `http://localhost:8000` in your web browser.

---

## Production Deployment

This application is designed to be hosted separately: the frontend on Vercel and the backend on Render.

### Frontend Deployment on Vercel

Vercel hosts the static frontend files.

1. Install the Vercel CLI globally or use the Vercel Dashboard.
2. Log in to Vercel:
   ```bash
   vercel login
   ```
3. Initialize the deployment from the root directory by specifying the `frontend` folder as the root directory of your Vercel project, or by running:
   ```bash
   cd frontend
   vercel
   ```
4. Follow the setup prompts:
   - **Project Name**: `pricevana-frontend`
   - **Framework Preset**: Other (None/Static HTML)
   - **Directory**: `./` (inside the `frontend` folder)
5. Set up production environmental variables or configure the `frontend/static/script.js` to point to the live Render backend URL if needed.

### Backend Deployment on Render

Render hosts the Python Flask backend service.

1. Sign in to your Render dashboard and click **New > Web Service**.
2. Connect your Git repository.
3. Configure the following project parameters:
   - **Name**: `pricevana-backend`
   - **Environment**: `Python`
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app:app`
4. Select the Free tier and deploy.
5. Copy the live backend URL provided by Render (e.g. `https://pricevana-backend.onrender.com`).

---

## Connecting Frontend to Backend

The `frontend/static/script.js` detects the hosting environment:
- If hosted locally or opened via `file://`, it maps request calls to `http://127.0.0.1:5000` (using regular HTTP without SSL).
- In a production environment, if hosted on the same domain, it maps relatively. Alternatively, update the `API_BASE` variable in `frontend/static/script.js` to point to your live Render endpoint URL.
