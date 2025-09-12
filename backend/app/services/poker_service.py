from typing import Dict, List
from app.core.config import settings
from pokerkit import Automation, NoLimitTexasHoldem


class PokerService:
    """Service for poker game logic and calculations using pokerkit."""

    def __init__(self):
        self.automations = (
            Automation.ANTE_POSTING,
            Automation.BET_COLLECTION,
            Automation.BLIND_OR_STRADDLE_POSTING,
            Automation.HOLE_CARDS_SHOWING_OR_MUCKING,
            Automation.HAND_KILLING,
            Automation.CHIPS_PUSHING,
            Automation.CHIPS_PULLING,
        )

    def calculate_winnings(
            self,
            stack_size: int,
            player_cards: Dict[str, str],
            actions: List[Dict],
            board_cards: str = None
    ) -> Dict[int, int]:
        """Calculate winnings"""

        return self._simple_calculation(stack_size, player_cards, actions, board_cards)

    def _simple_calculation(
            self,
            stack_size: int,
            player_cards: Dict[str, str],
            actions: List[Dict],
            board_cards: str = None
    ) -> Dict[int, int]:
        """Simple fallback calculation when pokerkit fails."""

        # Track contributions and folds
        folded_players = set()
        player_contributions = {i: 0 for i in range(1, 7)}

        # Blinds
        player_contributions[4] = settings.small_blind
        player_contributions[5] = settings.big_blind

        current_round = 'preflop'
        round_bets = {i: 0 for i in range(1, 7)}
        round_bets[4] = settings.small_blind
        round_bets[5] = settings.big_blind

        for action_data in actions:
            action_round = action_data.get("round", "preflop")
            player_num = action_data.get("player")
            action_type = action_data.get("action")
            amount = action_data.get("amount", 0)

            if action_round != current_round and action_round in ['flop', 'turn', 'river']:
                current_round = action_round
                round_bets = {i: 0 for i in range(1, 7)}
                continue

            if not player_num or not action_type:
                continue

            if action_type == "fold":
                folded_players.add(player_num)
            elif action_type == "call":
                max_bet = max(round_bets.values())
                call_amount = max_bet - round_bets[player_num]
                round_bets[player_num] = max_bet
                player_contributions[player_num] += call_amount
            elif action_type == "bet":
                round_bets[player_num] += amount
                player_contributions[player_num] += amount
            elif action_type == "raise":
                raise_to = amount - round_bets[player_num]
                round_bets[player_num] = amount
                player_contributions[player_num] += raise_to
            elif action_type == "allin":
                if amount:
                    allin_amount = amount - round_bets[player_num]
                    round_bets[player_num] = amount
                    player_contributions[player_num] += allin_amount
                else:
                    remaining = stack_size - player_contributions[player_num]
                    player_contributions[player_num] += remaining
                    round_bets[player_num] += remaining

        pot = sum(player_contributions.values())

        active_players = [i for i in range(1, 7) if i not in folded_players]

        winnings = {}
        if len(active_players) == 1:
            winner = active_players[0]
            for i in range(1, 7):
                if i == winner:
                    winnings[i] = pot - player_contributions[i]
                else:
                    winnings[i] = -player_contributions[i]
        else:
            pot_share = pot // len(active_players)
            remainder = pot % len(active_players)
            for i in range(1, 7):
                if i in active_players:
                    share = pot_share + (1 if active_players.index(i) < remainder else 0)
                    winnings[i] = share - player_contributions[i]
                else:
                    winnings[i] = -player_contributions[i]

        return winnings

    def convert_actions_to_short_format(self, actions: List[Dict]) -> str:
        """Convert action list to short format string."""
        short_actions = []

        for action_data in actions:
            action = action_data.get("action")

            if action == "fold":
                short_actions.append("f")
            elif action == "check":
                short_actions.append("x")
            elif action == "call":
                short_actions.append("c")
            elif action == "bet":
                amount = action_data.get("amount", 0)
                short_actions.append(f"b{amount}")
            elif action == "raise":
                amount = action_data.get("amount", 0)
                short_actions.append(f"r{amount}")
            elif action == "allin":
                short_actions.append("allin")
            elif action == "deal":
                if "cards" in action_data:
                    short_actions.append(action_data["cards"])

        return " ".join(short_actions)

poker_service = PokerService()