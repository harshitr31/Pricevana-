# Pricevana

Pricevana is an intelligent price tracking and product discovery web application that helps shoppers make strategic buying decisions. By analyzing historical price trends, predicting future price drops using machine learning, and scanning for active discount coupons, Pricevana optimizes checkout timing to maximize user savings.

---

## Technical Architecture

Pricevana is built as a decoupled, two-tier web application to ensure portability and high performance:

1. **Frontend (Presentation Layer)**:
   - Pure static client-side bundle built with HTML5, Vanilla CSS, and modular ES6 Javascript.
   - Utilizes custom responsive styles, modern typography, glassmorphic card overlays, and dynamic conic-gradient needle gauges to deliver an engaging dashboard interface.
   - Auto-detects local vs production environments to direct HTTP requests dynamically.

2. **Backend (Application & Analytics Layer)**:
   - Python Flask REST API backend providing CORS-enabled JSON endpoints.
   - Integrates a lightweight HTML meta-parser to extract OpenGraph (`og:image`) and Twitter product photos in under 50 milliseconds.
   - Incorporates a machine learning model utilizing linear regression (via scikit-learn) to predict 7-day price trajectories and identify historical lowest values.
   - Implements automated Selenium scraping pipelines for Flipkart and Amazon, complete with local catalog bypass routines.

---

## Core Features

- **Checked Price Analytics**: Paste any product URL from Amazon India, Flipkart, or Myntra to instantly view current cost details, store retailer badges, ratings, and active price statistics.
- **Dynamic Need-Arc Gauge**: Visualizes price health scores dynamically on a conic-gradient needle gauge (Bad Time, Stable, Good Time) to recommend optimal buying times.
- **Predictive Price Charts**: Simulates 30-day historical fluctuations and fits linear regression models to graph upcoming 7-day price trajectories on interactive canvas charts.
- **Fast Meta-Image Showcase**: Instantly retrieves and renders actual high-resolution product photos scraped directly from target URL metadata tags, falling back to clean inline SVGs.
- **Smart Promo Code Scanner**: Dynamically tests active discount coupons with live progress testing bars to calculate optimal checkout cart reductions.
- **Integrated Workspace Dashboard**: Tracks verified cashbacks, manage active email notifications, simulate shipment timelines, and set automated custom price drop alerts.

---

## Folder Structure

```
pricevana/
├── backend/
│   ├── app.py                  # Pure JSON REST API with CORS support
│   └── requirements.txt        # Backend dependencies (Flask, scikit-learn, etc.)
└── frontend/
    ├── index.html              # Portable HTML5 dashboard interface
    └── static/
        ├── style.css           # Vanilla CSS rules, theme variables, and keyframe animations
        ├── script.js           # Client-side routing, API sync, chart binding, and UI logic
        ├── logo.jpg            # Brand logo
        └── images/
            └── stores/         # Square store logos (Amazon, Flipkart, Dominos, PVR, etc.)
```

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

Live : https://pricevana.vercel.app/

### Backend Deployment on Render

Render hosts the Python Flask backend service.

Live : https://pricevana.onrender.com

---

Created with ❤️ for Pricevana by Deepanshu.
