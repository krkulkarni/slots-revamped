from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Float, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func # For server-side default timestamp

from .database import Base

class Session(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)
    player_id = Column(String, index=True, nullable=False)
    selected_cue = Column(String, nullable=False)
    phase_order = Column(String, nullable=False) # Store comma-separated e.g., "ADDICTIVE_CUE,MONETARY"
    probability_sequence_id = Column(String, nullable=False) # e.g., "A", "B", "C", "D"
    rating_sequence_id = Column(String, nullable=False)      # e.g., "A", "B", "C", "D"
    start_time = Column(DateTime(timezone=True), server_default=func.now())
    end_time = Column(DateTime(timezone=True), nullable=True)
    completed = Column(Boolean, default=False)

    # Relationships (optional but useful)
    trials = relationship("Trial", back_populates="session")
    ratings = relationship("Rating", back_populates="session")


class Trial(Base):
    __tablename__ = "trials"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False)
    player_id = Column(String, index=True, nullable=False) # Denormalize for easier querying?
    trial_number_global = Column(Integer, index=True, nullable=False)
    trial_number_phase = Column(Integer, nullable=False)
    phase = Column(String, nullable=False) # e.g., "PRACTICE", "ADDICTIVE_CUE", "MONETARY"
    is_practice = Column(Boolean, default=False)
    winning_cue_type = Column(String) # e.g., PRACTICE_CUE, ADDICTIVE_CUE, MONETARY
    left_machine_prob = Column(Float, nullable=False)
    right_machine_prob = Column(Float, nullable=False)
    probability_switched_this_trial = Column(Boolean, default=False)
    choice = Column(String, nullable=True) # "left", "right", "NO_RESPONSE"
    response_time_ms = Column(Float, nullable=True)
    outcome = Column(String, nullable=True) # "WIN", "LOSS"
    # outcome_image = Column(String) # This was informational, maybe less crucial to store
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    session = relationship("Session", back_populates="trials")


class Rating(Base):
    __tablename__ = "ratings"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False)
    player_id = Column(String, index=True, nullable=False) # Denormalize
    trial_number_before_rating = Column(Integer, index=True, nullable=False)
    rating_type = Column(String, nullable=False) # "CRAVING", "MOOD"
    rating_value = Column(Integer, nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    session = relationship("Session", back_populates="ratings")