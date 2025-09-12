from dataclasses import dataclass, field
from typing import Dict, List, Optional
from datetime import datetime
import json


@dataclass
class Hand:
    """Hand entity model."""

    hand_id: str
    stack_size: int
    dealer_position: int
    small_blind_position: int
    big_blind_position: int
    player_cards: Dict[int, str]  # {player_number: cards}
    actions: str  # Short format action sequence
    board_cards: Optional[str] = None
    winnings: Dict[int, int] = field(default_factory=dict)  # {player_number: amount}
    id: Optional[int] = None
    created_at: Optional[datetime] = None

    def to_dict(self) -> Dict:
        """Convert to dictionary."""
        return {
            "id": self.id,
            "hand_id": self.hand_id,
            "stack_size": self.stack_size,
            "dealer_position": self.dealer_position,
            "small_blind_position": self.small_blind_position,
            "big_blind_position": self.big_blind_position,
            "player_cards": self.player_cards,
            "actions": self.actions,
            "board_cards": self.board_cards,
            "winnings": self.winnings,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

    @classmethod
    def from_dict(cls, data: Dict) -> "Hand":
        """Create from dictionary."""
        if isinstance(data.get("player_cards"), str):
            data["player_cards"] = json.loads(data["player_cards"])
        if isinstance(data.get("winnings"), str):
            data["winnings"] = json.loads(data["winnings"])

        return cls(
            id=data.get("id"),
            hand_id=data["hand_id"],
            stack_size=data["stack_size"],
            dealer_position=data["dealer_position"],
            small_blind_position=data["small_blind_position"],
            big_blind_position=data["big_blind_position"],
            player_cards=data["player_cards"],
            actions=data["actions"],
            board_cards=data.get("board_cards"),
            winnings=data["winnings"],
            created_at=data.get("created_at")
        )

    def format_for_history(self) -> List[str]:
        """Format hand for history display."""
        lines = []

        lines.append(f"Hand #{self.hand_id}")

        lines.append(
            f"Stack {self.stack_size}; Dealer: Player {self.dealer_position}; "
            f"Player {self.small_blind_position} Small blind; Player {self.big_blind_position} Big blind"
        )

        cards_str = "Hands: "
        for player_num in sorted(self.player_cards.keys()):
            cards_str += f"Player {player_num}: {self.player_cards[player_num]}; "
        lines.append(cards_str.rstrip("; "))

        lines.append(f"Actions: {self.actions}")

        winnings_str = "Winnings: "
        for player_num in sorted(self.winnings.keys()):
            amount = self.winnings[player_num]
            sign = "+" if amount > 0 else ""
            winnings_str += f"Player {player_num}: {sign}{amount}; "
        lines.append(winnings_str.rstrip("; "))

        return lines