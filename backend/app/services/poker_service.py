from typing import Dict, List, Optional, Tuple
from app.core.config import settings
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

try:
    from pokerkit import Automation, NoLimitTexasHoldem, Mode

    POKERKIT_AVAILABLE = True
    logger.info("PokerKit successfully imported")
except ImportError as e:
    POKERKIT_AVAILABLE = False
    logger.warning(f"PokerKit not available: {e}. Using simple calculation only.")


class PokerService:
    """Service for poker game logic and calculations."""

    def __init__(self):
        if POKERKIT_AVAILABLE:
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
        """Calculate winnings with proper player tracking."""

        logger.info("=== STARTING CALCULATE_WINNINGS ===")
        logger.info(f"Stack size: {stack_size}")
        logger.info(f"Player cards: {player_cards}")
        logger.info(f"Actions count: {len(actions)}")
        logger.info(f"Board cards: {board_cards}")

        result = self._simple_calculation_fixed(stack_size, player_cards, actions, board_cards)
        logger.info(f"Final calculated winnings: {result}")
        return result

    def _simple_calculation_fixed(
            self,
            stack_size: int,
            player_cards: Dict[str, str],
            actions: List[Dict],
            board_cards: str = None
    ) -> Dict[int, int]:
        """Fixed calculation that properly tracks players."""

        logger.info("=== USING FIXED SIMPLE CALCULATION ===")

        folded_players = set()
        player_contributions = {i: 0 for i in range(1, 7)}

        player_contributions[4] = settings.small_blind
        player_contributions[5] = settings.big_blind

        logger.info(f"Initial contributions (blinds): Player 4: {settings.small_blind}, Player 5: {settings.big_blind}")

        current_round = 'preflop'
        round_bets = {i: 0 for i in range(1, 7)}
        round_bets[4] = settings.small_blind
        round_bets[5] = settings.big_blind

        for action_data in actions:
            action_round = action_data.get("round", "preflop")
            player_num = action_data.get("player")
            action_type = action_data.get("action")
            amount = action_data.get("amount", 0)

            logger.info(f"Processing action: Player {player_num} {action_type} {amount} in {action_round}")

            if action_round != current_round and action_round in ['flop', 'turn', 'river']:
                logger.info(f"Round transition: {current_round} -> {action_round}")
                current_round = action_round
                round_bets = {i: 0 for i in range(1, 7)}
                continue

            if not player_num or not action_type:
                continue

            if action_type == "fold":
                folded_players.add(player_num)
                logger.info(f"Player {player_num} folded")
            elif action_type == "call":
                max_bet = max(round_bets.values())
                call_amount = max_bet - round_bets[player_num]
                round_bets[player_num] = max_bet
                player_contributions[player_num] += call_amount
                logger.info(
                    f"Player {player_num} called {call_amount} (total contribution: {player_contributions[player_num]})")
            elif action_type == "check":
                logger.info(f"Player {player_num} checked")
            elif action_type == "bet":
                round_bets[player_num] += amount
                player_contributions[player_num] += amount
                logger.info(
                    f"Player {player_num} bet {amount} (total contribution: {player_contributions[player_num]})")
            elif action_type == "raise":
                raise_to = amount - round_bets[player_num]
                round_bets[player_num] = amount
                player_contributions[player_num] += raise_to
                logger.info(
                    f"Player {player_num} raised to {amount} (total contribution: {player_contributions[player_num]})")

        total_pot = sum(player_contributions.values())

        active_players = [i for i in range(1, 7) if i not in folded_players and player_contributions[i] > 0]

        logger.info(f"Total pot: {total_pot}")
        logger.info(f"Player contributions: {player_contributions}")
        logger.info(f"Folded players: {folded_players}")
        logger.info(f"Active players (made it to showdown): {active_players}")

        winnings = {}
        for i in range(1, 7):
            winnings[i] = -player_contributions[i]

        if len(active_players) == 0:
            logger.error("No active players found!")
            return winnings
        elif len(active_players) == 1:
            winner = active_players[0]
            winnings[winner] = total_pot - player_contributions[winner]
            logger.info(f"Single winner: Player {winner} wins {total_pot - player_contributions[winner]}")
        else:
            winner = self._determine_winner_fixed(active_players, player_cards, board_cards)
            if winner:
                winnings[winner] = total_pot - player_contributions[winner]
                logger.info(
                    f"Winner by hand evaluation: Player {winner} wins {total_pot - player_contributions[winner]}")
            else:
                share = total_pot
                remainder = total_pot % len(active_players)
                for i, player in enumerate(active_players):
                    player_share = share + (1 if i < remainder else 0)
                    winnings[player] = player_share - player_contributions[player]
                logger.info(f"Split pot among {len(active_players)} active players")

        logger.info(f"Final winnings calculation: {winnings}")
        return winnings

    def _determine_winner_fixed(self, active_players: List[int], player_cards: Dict[str, str], board_cards: str) -> \
    Optional[int]:
        """Determine winner based on hand strength."""
        try:
            if not board_cards or len(board_cards) < 10:
                logger.warning("Insufficient board cards for evaluation")
                return None

            logger.info(f"Evaluating hands for players: {active_players}")
            logger.info(f"Board cards: {board_cards}")

            board = [board_cards[i:i + 2] for i in range(0, min(10, len(board_cards)), 2)]
            logger.info(f"Board parsed: {board}")

            best_player = None
            best_hand_rank = -1
            best_kickers = []

            for player in active_players:
                player_key = str(player)
                if player_key not in player_cards:
                    logger.warning(f"Player {player} not found in player_cards")
                    continue

                hole_cards_str = player_cards[player_key]
                if len(hole_cards_str) < 4:
                    logger.warning(f"Invalid hole cards for Player {player}: {hole_cards_str}")
                    continue

                hole = [hole_cards_str[i:i + 2] for i in range(0, 4, 2)]
                all_cards = hole + board

                logger.info(f"Player {player}: hole={hole}, all_cards={all_cards}")

                hand_rank, kickers = self._evaluate_hand_simple(all_cards)

                logger.info(f"Player {player}: hand_rank={hand_rank}, kickers={kickers}")

                if (hand_rank > best_hand_rank or
                        (hand_rank == best_hand_rank and kickers > best_kickers)):
                    best_hand_rank = hand_rank
                    best_kickers = kickers
                    best_player = player

            logger.info(f"Best hand: Player {best_player} with rank {best_hand_rank}")
            return best_player

        except Exception as e:
            logger.error(f"Hand evaluation failed: {e}")
            return None

    def _evaluate_hand_simple(self, cards: List[str]) -> Tuple[int, List[int]]:
        """Simple hand evaluation returning (hand_rank, kickers)."""
        try:
            ranks = []
            suits = []

            for card in cards:
                if len(card) >= 2:
                    rank = self._card_rank(card)
                    suit = card[1]
                    ranks.append(rank)
                    suits.append(suit)

            rank_counts = {}
            for rank in ranks:
                rank_counts[rank] = rank_counts.get(rank, 0) + 1

            sorted_by_count = sorted(rank_counts.items(), key=lambda x: (x[1], x[0]), reverse=True)

            counts = [count for rank, count in sorted_by_count]
            kickers = [rank for rank, count in sorted_by_count]

            if counts[0] == 4:
                return (7, kickers)
            elif counts[0] == 3 and counts[1] == 2:
                return (6, kickers)
            elif counts[0] == 3:
                return (3, kickers)
            elif counts[0] == 2 and counts[1] == 2:
                return (2, kickers)
            elif counts[0] == 2:
                return (1, kickers)
            else:
                return (0, sorted(ranks, reverse=True)[:5])

        except Exception as e:
            logger.error(f"Hand evaluation error: {e}")
            return (0, [0])

    def _card_rank(self, card: str) -> int:
        """Convert card rank to numeric value."""
        if len(card) < 1:
            return 0
        rank = card[0]
        rank_map = {'2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
                    'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14}
        return rank_map.get(rank, 0)

    def convert_actions_to_short_format(self, actions: List[Dict]) -> str:
        """Convert action list to short format string."""
        short_actions = []

        for action_data in actions:
            action = action_data.get("action")
            round_name = action_data.get("round", "preflop")

            if action == "deal" or "cards" in action_data:
                if round_name == "flop":
                    cards = action_data.get("cards", "")
                    short_actions.append(f"flop:{cards}")
                elif round_name == "turn":
                    cards = action_data.get("cards", "")
                    short_actions.append(f"turn:{cards}")
                elif round_name == "river":
                    cards = action_data.get("cards", "")
                    short_actions.append(f"river:{cards}")
                continue

            player = action_data.get("player", "")

            if action == "fold":
                short_actions.append(f"p{player}:f")
            elif action == "check":
                short_actions.append(f"p{player}:x")
            elif action == "call":
                short_actions.append(f"p{player}:c")
            elif action == "bet":
                amount = action_data.get("amount", 0)
                short_actions.append(f"p{player}:b{amount}")
            elif action == "raise":
                amount = action_data.get("amount", 0)
                short_actions.append(f"p{player}:r{amount}")
            elif action == "allin":
                short_actions.append(f"p{player}:allin")

        return " ".join(short_actions)


poker_service = PokerService()