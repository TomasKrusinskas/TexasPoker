from typing import List, Optional
import json
from app.models.hand import Hand
from app.core.database import db


class HandRepository:
    """Repository for hand data access."""

    def create(self, hand: Hand) -> Hand:
        """Create a new hand in the database."""
        query = """
            INSERT INTO hands (
                hand_id, stack_size, dealer_position, 
                small_blind_position, big_blind_position,
                player_cards, actions, board_cards, winnings
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, created_at
        """

        params = (
            hand.hand_id,
            hand.stack_size,
            hand.dealer_position,
            hand.small_blind_position,
            hand.big_blind_position,
            json.dumps(hand.player_cards),
            hand.actions,
            hand.board_cards,
            json.dumps(hand.winnings)
        )

        result = db.fetch_one(query, params)
        hand.id = result["id"]
        hand.created_at = result["created_at"]

        return hand

    def get_by_id(self, hand_id: str) -> Optional[Hand]:
        """Get a hand by its ID."""
        query = """
            SELECT * FROM hands WHERE hand_id = %s
        """

        result = db.fetch_one(query, (hand_id,))

        if result:
            return Hand.from_dict(result)
        return None

    def get_all(self, limit: int = 100) -> List[Hand]:
        """Get all hands, ordered by creation date."""
        query = """
            SELECT * FROM hands 
            ORDER BY created_at DESC 
            LIMIT %s
        """

        results = db.fetch_all(query, (limit,))

        return [Hand.from_dict(row) for row in results]

    def get_recent(self, limit: int = 10) -> List[Hand]:
        """Get recent hands."""
        query = """
            SELECT * FROM hands 
            ORDER BY created_at DESC 
            LIMIT %s
        """

        results = db.fetch_all(query, (limit,))

        return [Hand.from_dict(row) for row in results]

    def delete(self, hand_id: str) -> bool:
        """Delete a hand by its ID."""
        query = """
            DELETE FROM hands WHERE hand_id = %s
        """

        with db.get_cursor() as cursor:
            cursor.execute(query, (hand_id,))
            return cursor.rowcount > 0

    def exists(self, hand_id: str) -> bool:
        """Check if a hand exists."""
        query = """
            SELECT EXISTS(SELECT 1 FROM hands WHERE hand_id = %s)
        """

        result = db.fetch_one(query, (hand_id,))
        return result["exists"] if result else False


hand_repository = HandRepository()