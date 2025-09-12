from pydantic import BaseModel, Field
from typing import Dict, List, Optional
from datetime import datetime


class HandCreate(BaseModel):
    """Schema for creating a hand."""

    hand_id: str = Field(..., description="Unique hand identifier")
    stack_size: int = Field(..., description="Starting stack size for all players")
    dealer_position: int = Field(..., ge=1, le=6, description="Dealer position (1-6)")
    small_blind_position: int = Field(..., ge=1, le=6, description="Small blind position")
    big_blind_position: int = Field(..., ge=1, le=6, description="Big blind position")
    player_cards: Dict[str, str] = Field(..., description="Player cards mapping")
    actions: List[Dict] = Field(..., description="List of actions taken")
    board_cards: Optional[str] = Field(None, description="Community cards")

    class Config:
        json_schema_extra = {
            "example": {
                "hand_id": "39b5999a-cdc1-4469-947e-649d30aa6158",
                "stack_size": 10000,
                "dealer_position": 3,
                "small_blind_position": 4,
                "big_blind_position": 5,
                "player_cards": {
                    "1": "Tc2c",
                    "2": "5d4c",
                    "3": "Ah4s",
                    "4": "QcTd",
                    "5": "Js9d",
                    "6": "8h6s"
                },
                "actions": [
                    {"round": "preflop", "player": 6, "action": "fold"},
                    {"round": "preflop", "player": 1, "action": "fold"},
                    {"round": "preflop", "player": 2, "action": "fold"},
                    {"round": "preflop", "player": 3, "action": "raise", "amount": 300},
                    {"round": "preflop", "player": 4, "action": "call", "amount": 300},
                    {"round": "preflop", "player": 5, "action": "fold"},
                    {"round": "flop", "cards": "3hKdQs"},
                    {"round": "flop", "player": 4, "action": "check"},
                    {"round": "flop", "player": 3, "action": "bet", "amount": 100}
                ],
                "board_cards": "3hKdQs"
            }
        }


class HandResponse(BaseModel):
    """Schema for hand response."""

    id: int
    hand_id: str
    stack_size: int
    dealer_position: int
    small_blind_position: int
    big_blind_position: int
    player_cards: Dict[str, str]
    actions: str
    board_cards: Optional[str]
    winnings: Dict[str, int]
    created_at: datetime

    class Config:
        from_attributes = True


class HandHistoryResponse(BaseModel):
    """Schema for hand history response."""

    hand_id: str
    display_lines: List[str]
    created_at: datetime