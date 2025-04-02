from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

# --- Base Schemas ---
# Define common fields, allowing ORM mode for automatic conversion from DB models

class TrialBase(BaseModel):
    player_id: str
    trial_number_global: int
    trial_number_phase: int
    phase: str
    is_practice: bool
    winning_cue_type: Optional[str] = None
    left_machine_prob: float
    right_machine_prob: float
    probability_switched_this_trial: bool
    choice: Optional[str] = None
    response_time_ms: Optional[float] = None
    outcome: Optional[str] = None
    # outcome_image: Optional[str] = None # Optional if not essential

class TrialCreate(TrialBase):
    pass # No extra fields needed for creation beyond base + player_id (handled by endpoint/crud)

class Trial(TrialBase):
    id: int
    session_id: int
    timestamp: datetime

    class Config:
        orm_mode = True


class RatingBase(BaseModel):
    player_id: str
    trial_number_before_rating: int
    rating_type: str # "CRAVING" or "MOOD"
    rating_value: int

class RatingCreate(RatingBase):
    pass

class Rating(RatingBase):
    id: int
    session_id: int
    timestamp: datetime

    class Config:
        orm_mode = True


class SessionBase(BaseModel):
    player_id: str
    selected_cue: str
    phase_order: str # Comma-separated string
    probability_sequence_id: str
    rating_sequence_id: str

class SessionCreate(SessionBase):
    pass

class Session(SessionBase):
    id: int
    start_time: datetime
    end_time: Optional[datetime] = None
    completed: bool
    # Include related data when reading a session (optional)
    # trials: List[Trial] = []
    # ratings: List[Rating] = []

    class Config:
        orm_mode = True