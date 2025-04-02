from sqlalchemy.orm import Session
from sqlalchemy.sql import func # For now()

from . import models, schemas
from datetime import datetime

# === Session CRUD ===

def get_session_by_player_id(db: Session, player_id: str):
    # Might return multiple sessions if player ID isn't unique constraint,
    # or the latest one based on start_time.
    # For now, let's assume we might want the latest active one if exists.
    return db.query(models.Session).filter(models.Session.player_id == player_id, models.Session.completed == False).order_by(models.Session.start_time.desc()).first()

def create_session(db: Session, session: schemas.SessionCreate):
    # Check if an active session for this player already exists? Optional.
    # existing_session = get_session_by_player_id(db, player_id=session.player_id)
    # if existing_session:
    #     # Handle this case - maybe return existing session or raise error?
    #     print(f"Warning: Active session already exists for player {session.player_id}")
    #     # return existing_session # Or raise exception

    db_session = models.Session(
        player_id=session.player_id,
        selected_cue=session.selected_cue,
        phase_order=session.phase_order,
        probability_sequence_id=session.probability_sequence_id,
        rating_sequence_id=session.rating_sequence_id,
        start_time=datetime.now() # Record start time accurately here
        # completed defaults to False
    )
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    print(f"Created session {db_session.id} for player {db_session.player_id}")
    return db_session

def mark_session_complete(db: Session, player_id: str):
    # Mark the latest *incomplete* session for this player as complete
    db_session = db.query(models.Session)\
                   .filter(models.Session.player_id == player_id, models.Session.completed == False)\
                   .order_by(models.Session.start_time.desc())\
                   .first()

    if db_session:
        db_session.completed = True
        db_session.end_time = datetime.now() # Record end time
        db.commit()
        db.refresh(db_session)
        print(f"Marked session {db_session.id} for player {player_id} as complete.")
        return db_session
    else:
        print(f"Warning: No active session found for player {player_id} to mark as complete.")
        return None


# === Trial CRUD ===

def create_trial(db: Session, trial: schemas.TrialCreate):
    # Find the LATEST session for this player_id (assuming they might restart?)
    # Or require session_id to be passed? For simplicity, let's find latest active session.
    db_session = get_session_by_player_id(db, player_id=trial.player_id)
    if not db_session:
        # Handle error: Cannot log trial without an active session
        print(f"Error: No active session found for player {trial.player_id} when logging trial {trial.trial_number_global}")
        # Consider raising an HTTPException here to send back to frontend
        return None # Or raise exception

    db_trial = models.Trial(
        **trial.dict(), # Unpack pydantic model fields
        session_id=db_session.id, # Link to the found session
        timestamp=datetime.now() # Add timestamp
        )
    db.add(db_trial)
    db.commit()
    db.refresh(db_trial)
    # print(f"Logged trial {db_trial.trial_number_global} for session {db_session.id}") # Can be verbose
    return db_trial


# === Rating CRUD ===

def create_rating(db: Session, rating: schemas.RatingCreate):
    # Find the LATEST active session for this player_id
    db_session = get_session_by_player_id(db, player_id=rating.player_id)
    if not db_session:
        print(f"Error: No active session found for player {rating.player_id} when logging rating after trial {rating.trial_number_before_rating}")
        return None # Or raise exception

    db_rating = models.Rating(
         **rating.dict(),
         session_id=db_session.id,
         timestamp=datetime.now()
         )
    db.add(db_rating)
    db.commit()
    db.refresh(db_rating)
    # print(f"Logged {rating.rating_type} rating for session {db_session.id}") # Can be verbose
    return db_rating