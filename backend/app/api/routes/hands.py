from fastapi import APIRouter, HTTPException, status
from typing import List
from app.schemas.hand import HandCreate, HandResponse, HandHistoryResponse
from app.models.hand import Hand
from app.repositories.hand_repository import hand_repository
from app.services.poker_service import poker_service

router = APIRouter(prefix="/hands", tags=["hands"])


@router.post("/", response_model=HandResponse, status_code=status.HTTP_201_CREATED)
async def create_hand(hand_data: HandCreate):
    """Create a new hand with calculated winnings."""

    try:
        if hand_repository.exists(hand_data.hand_id):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Hand with ID {hand_data.hand_id} already exists"
            )

        player_cards_int = {
            int(k): v for k, v in hand_data.player_cards.items()
        }

        winnings = poker_service.calculate_winnings(
            stack_size=hand_data.stack_size,
            player_cards=hand_data.player_cards,
            actions=hand_data.actions,
            board_cards=hand_data.board_cards
        )

        actions_short = poker_service.convert_actions_to_short_format(
            hand_data.actions
        )

        hand = Hand(
            hand_id=hand_data.hand_id,
            stack_size=hand_data.stack_size,
            dealer_position=hand_data.dealer_position,
            small_blind_position=hand_data.small_blind_position,
            big_blind_position=hand_data.big_blind_position,
            player_cards=player_cards_int,
            actions=actions_short,
            board_cards=hand_data.board_cards,
            winnings=winnings
        )

        saved_hand = hand_repository.create(hand)

        response_data = saved_hand.to_dict()
        response_data["player_cards"] = {
            str(k): v for k, v in response_data["player_cards"].items()
        }
        response_data["winnings"] = {
            str(k): v for k, v in response_data["winnings"].items()
        }

        return HandResponse(**response_data)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating hand: {str(e)}"
        )


@router.get("/{hand_id}", response_model=HandResponse)
async def get_hand(hand_id: str):
    """Get a specific hand by ID."""

    hand = hand_repository.get_by_id(hand_id)

    if not hand:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Hand with ID {hand_id} not found"
        )

    response_data = hand.to_dict()
    response_data["player_cards"] = {
        str(k): v for k, v in response_data["player_cards"].items()
    }
    response_data["winnings"] = {
        str(k): v for k, v in response_data["winnings"].items()
    }

    return HandResponse(**response_data)


@router.get("/", response_model=List[HandHistoryResponse])
async def get_hands(limit: int = 10):
    """Get recent hands for history display."""

    hands = hand_repository.get_recent(limit=limit)

    history_responses = []
    for hand in hands:
        display_lines = hand.format_for_history()
        history_responses.append(
            HandHistoryResponse(
                hand_id=hand.hand_id,
                display_lines=display_lines,
                created_at=hand.created_at
            )
        )

    return history_responses


@router.delete("/{hand_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_hand(hand_id: str):
    """Delete a hand by ID."""

    if not hand_repository.exists(hand_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Hand with ID {hand_id} not found"
        )

    hand_repository.delete(hand_id)
    return None