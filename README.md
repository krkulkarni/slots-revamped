# Two-Armed Bandit Task (Placeholder README)
# Two-Armed Bandit Task (Three.js + FastAPI)

This project implements a web-based two-armed bandit slot machine task suitable for psychological research, built with a Three.js frontend and a FastAPI backend for data logging.

## Features

*   Orthographic 2D-style view using Three.js.
*   Player ID input (with URL pre-filling).
*   Addictive cue selection.
*   Three distinct phases: Practice, Addictive Cue, Monetary (randomized order for task phases).
*   Probabilistic rewards (80/20 split) with pseudorandom switching based on hardcoded sequences.
*   Programmatically generated reel textures based on phase/outcome.
*   Smooth animations for handle pull, shutter reveal, and decelerating reel spin landing on the correct outcome.
*   Craving and Mood ratings using sliders, scheduled based on hardcoded sequences.
*   Detailed data logging to a SQLite database via a FastAPI backend.
*   Pause functionality.
*   End-game screen with redirect button.
*   Debug mode features: URL parameter activation, trial count overrides, trial jump shortcut.
*   Security key requirement via URL parameter.

## Setup

**1. Backend:**

*   Navigate to the `backend` directory: `cd backend`
*   Create a virtual environment (recommended):
    *   `python -m venv venv`
    *   Activate:
        *   Windows: `.\venv\Scripts\activate`
        *   macOS/Linux: `source venv/bin/activate`
*   Install Python dependencies: `pip install -r requirements.txt`

**2. Frontend:**

*   Requires a web server capable of serving static files correctly, handling ES Modules. A simple way is using the "Live Server" extension in VS Code.
*   Place your image assets (`.png`) in `frontend/assets/images/`. Ensure filenames match those used in `frontend/js/config.js` (e.g., `machine_left.png`, `cue_beer.png`, `outcome_loss.png`, etc.).
*   Place your sound assets (`.wav`, `.mp3`) in `frontend/assets/audio/`. Ensure filenames match those used in `frontend/js/audio.js`.
*   **Crucially:** Edit `frontend/js/config.js` and replace `"YOUR_SECRET_KEY_12345"` with your actual desired secret key.

## Running the Application

**1. Start the Backend Server:**

*   Make sure your virtual environment is activated.
*   In the `backend` directory, run:
    ```bash
    uvicorn main:app --reload --host 0.0.0.0 --port 8000
    ```
    *   `--reload`: Automatically restarts the server when code changes.
    *   `--host 0.0.0.0`: Makes the server accessible on your local network (use `127.0.0.1` for local access only).
    *   `--port 8000`: Specifies the port (matches `API_BASE_URL` in frontend config).

**2. Serve the Frontend:**

*   Open the `frontend` directory in your code editor (e.g., VS Code).
*   Use the "Live Server" extension (or a similar tool like `python -m http.server 8080` from within the `frontend` directory, though Live Server handles module loading better).
*   Open your browser and navigate to the URL provided by your server (e.g., `http://127.0.0.1:5500` or `http://localhost:8080`).

**3. Access the Game:**

*   Append the required URL parameters to access the game:
    *   **Minimum:** `http://<your_frontend_url>/?key=YOUR_ACTUAL_SECRET_KEY`
    *   **With Player ID:** `http://<your_frontend_url>/?key=YOUR_ACTUAL_SECRET_KEY&playerId=TEST01`
    *   **With Debug Mode:** `http://<your_frontend_url>/?key=YOUR_ACTUAL_SECRET_KEY&playerId=DEBUG01&debug=true`
    *   **With Debug Mode & Trial Overrides:** `http://<your_frontend_url>/?key=YOUR_ACTUAL_SECRET_KEY&playerId=DEBUG01&debug=true&debugPractice=2&debugCue=5&debugMonetary=5`

## Data

*   The backend will create and write data to `backend/sql_app.db`. You can inspect this SQLite database using tools like DB Browser for SQLite.