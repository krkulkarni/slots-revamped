from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional # Import Optional

# Import database setup, models, schemas, and crud operations
from . import crud, models, schemas, database

# Create DB tables on startup if they don't exist
database.create_db_and_tables()

app = FastAPI(title="Two-Armed Bandit API")

# --- CORS Middleware (Allow frontend origin) ---
from fastapi.middleware.cors import CORSMiddleware

origins = [
    "http://localhost",         # Base domain if serving on standard port
    "http://localhost:8080",    # Common port for frontend dev servers
    "http://127.0.0.1:8080",
    "http://localhost:3000", # <--- ADD THIS LINE
    "null", # Allow requests from file:// protocol (useful for local testing without server)
    # Add any other origins if deploying frontend elsewhere
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"], # Allow all methods (GET, POST, PUT, etc.)
    allow_headers=["*"], # Allow all headers
)
# --- End CORS ---


# Dependency Injection for DB Session
def get_db_session():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()


# === API Endpoints ===

@app.post("/api/session/start", response_model=schemas.Session)
def start_new_session(session: schemas.SessionCreate, db: Session = Depends(get_db_session)):
    """
    Starts a new game session for a player.
    """
    print(f"Received request to start session for player: {session.player_id}")
    # Optionally check if an active session exists first if needed by logic
    db_session = crud.create_session(db=db, session=session)
    if db_session is None:
        # This case currently isn't hit in crud, but good practice
         raise HTTPException(status_code=400, detail="Could not create session")
    print(f"Session created with ID: {db_session.id}")
    return db_session


@app.post("/api/trials/", response_model=schemas.Trial)
def log_trial(trial: schemas.TrialCreate, db: Session = Depends(get_db_session)):
    """
    Logs the data for a single completed trial.
    """
    # print(f"Received trial data: Global Trial {trial.trial_number_global}, Player {trial.player_id}") # Verbose logging
    db_trial = crud.create_trial(db=db, trial=trial)
    if db_trial is None:
         # crud function handles printing error, raise HTTP error to inform frontend
         raise HTTPException(status_code=404, detail=f"No active session found for player {trial.player_id}")
    return db_trial


@app.post("/api/ratings/", response_model=schemas.Rating)
def log_rating(rating: schemas.RatingCreate, db: Session = Depends(get_db_session)):
    """
    Logs a single rating submitted by the player.
    """
    # print(f"Received rating data: Type {rating.rating_type}, Player {rating.player_id}") # Verbose logging
    db_rating = crud.create_rating(db=db, rating=rating)
    if db_rating is None:
         raise HTTPException(status_code=404, detail=f"No active session found for player {rating.player_id}")
    return db_rating


@app.put("/api/session/end/{player_id}", response_model=Optional[schemas.Session])
def end_player_session(player_id: str, db: Session = Depends(get_db_session)):
    """
    Marks the latest active session for a given player_id as complete.
    """
    print(f"Received request to end session for player: {player_id}")
    db_session = crud.mark_session_complete(db=db, player_id=player_id)
    if db_session is None:
        # Don't necessarily raise 404, maybe just log warning and return success?
        # Or raise 404 if frontend *expects* a session to exist.
         print(f"No active session found for player {player_id} to end.")
         # Return None or {} maybe? Let's return None with status 200 for now.
         return None # FastAPI will handle None correctly if response_model includes Optional
        # raise HTTPException(status_code=404, detail=f"No active session found for player {player_id}")
    return db_session


# Basic root endpoint for testing
@app.get("/")
def read_root():
    return {"message": "Two-Armed Bandit API is running"}
