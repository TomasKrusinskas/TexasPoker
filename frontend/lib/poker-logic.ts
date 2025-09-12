import { GameState, Player, GameAction } from './types';
import { v4 as uuidv4 } from 'uuid';

const BIG_BLIND = 40;
const SMALL_BLIND = 20;
const NUM_PLAYERS = 6;

// Card deck for dealing
const DECK = [
    'As', 'Ah', 'Ad', 'Ac', 'Ks', 'Kh', 'Kd', 'Kc',
    'Qs', 'Qh', 'Qd', 'Qc', 'Js', 'Jh', 'Jd', 'Jc',
    'Ts', 'Th', 'Td', 'Tc', '9s', '9h', '9d', '9c',
    '8s', '8h', '8d', '8c', '7s', '7h', '7d', '7c',
    '6s', '6h', '6d', '6c', '5s', '5h', '5d', '5c',
    '4s', '4h', '4d', '4c', '3s', '3h', '3d', '3c',
    '2s', '2h', '2d', '2c'
];

export function createInitialGameState(stackSize: number, shouldDealCards: boolean = true): GameState {
    const handId = uuidv4();
    const dealerPosition = 3;
    const smallBlindPosition = 4;
    const bigBlindPosition = 5;

    // Initialize players
    const players: Player[] = [];
    for (let i = 1; i <= NUM_PLAYERS; i++) {
        players.push({
            position: i,
            cards: '',
            stack: stackSize,
            bet: 0,
            hasActed: false,
            hasFolded: false,
        });
    }

    const actions: GameAction[] = [];

    // Deal cards only if requested
    if (shouldDealCards) {
        const usedCards = new Set<string>();
        players.forEach(player => {
            const cards = dealCards(2, usedCards);
            player.cards = cards.join('');
        });

        // Post blinds only when cards are dealt
        players[smallBlindPosition - 1].bet = SMALL_BLIND;
        players[smallBlindPosition - 1].stack -= SMALL_BLIND;
        players[bigBlindPosition - 1].bet = BIG_BLIND;
        players[bigBlindPosition - 1].stack -= BIG_BLIND;
    }

    return {
        handId,
        players,
        dealerPosition,
        smallBlindPosition,
        bigBlindPosition,
        currentPlayer: shouldDealCards ? 6 : 1, // Player 6 acts first after blinds
        pot: shouldDealCards ? SMALL_BLIND + BIG_BLIND : 0,
        currentBet: shouldDealCards ? BIG_BLIND : 0,
        round: 'preflop',
        boardCards: '',
        actions,
        isComplete: false,
    };
}

export function dealCards(count: number, usedCards: Set<string>): string[] {
    const cards: string[] = [];
    const availableCards = DECK.filter(card => !usedCards.has(card));

    for (let i = 0; i < count; i++) {
        const randomIndex = Math.floor(Math.random() * availableCards.length);
        const card = availableCards[randomIndex];
        cards.push(card);
        usedCards.add(card);
        availableCards.splice(randomIndex, 1);
    }

    return cards;
}

export function getNextPlayer(state: GameState): number {
    let next = state.currentPlayer;
    let attempts = 0;

    do {
        next = (next % NUM_PLAYERS) + 1;
        attempts++;
        if (attempts > NUM_PLAYERS) break;
    } while (state.players[next - 1].hasFolded);

    return next;
}

export function isRoundComplete(state: GameState): boolean {
    const activePlayers = state.players.filter(p => !p.hasFolded);

    if (activePlayers.length === 1) {
        return true; // Only one player left
    }

    // In preflop, big blind gets option if no raises
    if (state.round === 'preflop') {
        const bigBlindPlayer = state.players[state.bigBlindPosition - 1];

        // Check if we're back to big blind with no raises
        if (state.currentPlayer === state.bigBlindPosition &&
            state.currentBet === BIG_BLIND &&
            !bigBlindPlayer.hasActed) {
            return false; // Big blind gets option to check or raise
        }
    }

    // Check if all active players have acted and bets are equal
    const allActed = activePlayers.every(p => p.hasActed);
    const betsEqual = activePlayers.every(p => p.bet === state.currentBet || p.stack === 0);

    return allActed && betsEqual;
}

export function moveToNextRound(state: GameState): GameState {
    const newState = { ...state };

    // Collect bets into pot
    newState.players.forEach(p => {
        newState.pot += p.bet;
        p.bet = 0;
        p.hasActed = false;
    });

    newState.currentBet = 0;

    // Determine next round
    const rounds: Array<'preflop' | 'flop' | 'turn' | 'river' | 'showdown'> =
        ['preflop', 'flop', 'turn', 'river', 'showdown'];
    const currentIndex = rounds.indexOf(newState.round);

    if (currentIndex < rounds.length - 1) {
        newState.round = rounds[currentIndex + 1];

        // Deal community cards
        const usedCards = new Set<string>();
        newState.players.forEach(p => {
            if (p.cards) {
                for (let i = 0; i < p.cards.length; i += 2) {
                    usedCards.add(p.cards.substring(i, i + 2));
                }
            }
        });

        // Add existing board cards to used set
        for (let i = 0; i < newState.boardCards.length; i += 2) {
            usedCards.add(newState.boardCards.substring(i, i + 2));
        }

        if (newState.round === 'flop') {
            const cards = dealCards(3, usedCards);
            newState.boardCards = cards.join('');
            newState.actions.push({ round: 'flop', action: 'deal', cards: newState.boardCards });
        } else if (newState.round === 'turn') {
            const cards = dealCards(1, usedCards);
            newState.boardCards += cards[0];
            newState.actions.push({ round: 'turn', action: 'deal', cards: cards[0] });
        } else if (newState.round === 'river') {
            const cards = dealCards(1, usedCards);
            newState.boardCards += cards[0];
            newState.actions.push({ round: 'river', action: 'deal', cards: cards[0] });
        } else if (newState.round === 'showdown') {
            // Game is complete at showdown
            newState.isComplete = true;
            return newState;
        }

        // Set first to act (first active player left of dealer)
        let firstToAct = newState.dealerPosition;
        for (let i = 0; i < NUM_PLAYERS; i++) {
            firstToAct = (firstToAct % NUM_PLAYERS) + 1;
            if (!newState.players[firstToAct - 1].hasFolded) {
                newState.currentPlayer = firstToAct;
                break;
            }
        }
    } else {
        newState.isComplete = true;
    }

    return newState;
}

export function canPerformAction(
    state: GameState,
    action: string,
    amount?: number
): boolean {
    if (state.isComplete) return false;

    const player = state.players[state.currentPlayer - 1];
    if (player.hasFolded) return false;
    if (player.stack === 0) return false; // All-in players can't act

    switch (action) {
        case 'fold':
            return state.currentBet > player.bet; // Can only fold if facing a bet

        case 'check':
            return player.bet === state.currentBet;

        case 'call':
            return state.currentBet > player.bet && player.stack > 0;

        case 'bet':
            return state.currentBet === 0 && player.stack >= (amount || BIG_BLIND);

        case 'raise':
            // Must raise to at least double the current bet
            const minRaise = state.currentBet * 2;
            return state.currentBet > 0 &&
                amount !== undefined &&
                amount >= minRaise &&
                player.stack >= (amount - player.bet);

        case 'allin':
            return player.stack > 0;

        default:
            return false;
    }
}

export function applyAction(
    state: GameState,
    action: string,
    amount?: number
): GameState {
    if (!canPerformAction(state, action, amount)) {
        return state; // Invalid action, return unchanged state
    }

    const newState = { ...state, players: [...state.players] };
    const player = { ...newState.players[newState.currentPlayer - 1] };
    newState.players[newState.currentPlayer - 1] = player;

    switch (action) {
        case 'fold':
            player.hasFolded = true;
            newState.actions.push({
                round: newState.round,
                player: newState.currentPlayer,
                action: 'fold'
            });
            break;

        case 'check':
            player.hasActed = true;
            newState.actions.push({
                round: newState.round,
                player: newState.currentPlayer,
                action: 'check'
            });
            break;

        case 'call':
            const callAmount = Math.min(state.currentBet - player.bet, player.stack);
            player.stack -= callAmount;
            player.bet += callAmount;
            player.hasActed = true;
            newState.actions.push({
                round: newState.round,
                player: newState.currentPlayer,
                action: 'call',
                amount: state.currentBet
            });
            break;

        case 'bet':
            const betAmount = amount || BIG_BLIND;
            player.stack -= betAmount;
            player.bet = betAmount;
            player.hasActed = true;
            newState.currentBet = betAmount;
            // Reset other players' hasActed flag
            newState.players.forEach((p, i) => {
                if (i !== newState.currentPlayer - 1 && !p.hasFolded) {
                    p.hasActed = false;
                }
            });
            newState.actions.push({
                round: newState.round,
                player: newState.currentPlayer,
                action: 'bet',
                amount: betAmount
            });
            break;

        case 'raise':
            const raiseAmount = amount || state.currentBet * 2;
            const toCall = raiseAmount - player.bet;
            player.stack -= toCall;
            player.bet = raiseAmount;
            player.hasActed = true;
            newState.currentBet = raiseAmount;
            // Reset other players' hasActed flag
            newState.players.forEach((p, i) => {
                if (i !== newState.currentPlayer - 1 && !p.hasFolded) {
                    p.hasActed = false;
                }
            });
            newState.actions.push({
                round: newState.round,
                player: newState.currentPlayer,
                action: 'raise',
                amount: raiseAmount
            });
            break;

        case 'allin':
            const allinAmount = player.stack + player.bet;
            player.bet = allinAmount;
            player.stack = 0;
            player.hasActed = true;
            if (allinAmount > newState.currentBet) {
                newState.currentBet = allinAmount;
                // Reset other players' hasActed flag
                newState.players.forEach((p, i) => {
                    if (i !== newState.currentPlayer - 1 && !p.hasFolded) {
                        p.hasActed = false;
                    }
                });
            }
            newState.actions.push({
                round: newState.round,
                player: newState.currentPlayer,
                action: 'allin',
                amount: allinAmount
            });
            break;
    }

    // Check if only one player left (everyone else folded)
    const activePlayers = newState.players.filter(p => !p.hasFolded);
    if (activePlayers.length === 1) {
        // Collect all bets into pot before ending - ONLY uncollected bets
        newState.players.forEach(p => {
            newState.pot += p.bet;
            p.bet = 0;
        });
        newState.isComplete = true;
        return newState;
    }

    // Check if round is complete
    if (isRoundComplete(newState)) {
        if (newState.round === 'river') {
            // Collect final bets and end game
            newState.players.forEach(p => {
                newState.pot += p.bet;
                p.bet = 0;
            });
            newState.isComplete = true;
        } else {
            // Move to next round
            return moveToNextRound(newState);
        }
    } else {
        // Move to next player
        newState.currentPlayer = getNextPlayer(newState);
    }

    return newState;
}

export function formatActionLog(state: GameState): string[] {
    const log: string[] = [];

    if (!state.players[0].cards) {
        return ['Waiting for game to start...'];
    }

    // Initial setup
    state.players.forEach((p, i) => {
        if (p.cards) {
            log.push(`Player ${i + 1} is dealt ${p.cards}`);
        }
    });

    if (state.players[0].cards) {
        log.push('');
        log.push(`Player ${state.dealerPosition} is the dealer`);
        log.push(`Player ${state.smallBlindPosition} posts small blind - ${SMALL_BLIND} chips`);
        log.push(`Player ${state.bigBlindPosition} posts big blind - ${BIG_BLIND} chips`);
    }

    // Actions
    let currentRound = '';
    state.actions.forEach(action => {
        if (action.round !== currentRound) {
            log.push('');
            if (action.action === 'deal' && action.cards) {
                if (action.round === 'flop') {
                    log.push(`Flop cards dealt: ${action.cards}`);
                } else if (action.round === 'turn') {
                    log.push(`Turn card dealt: ${action.cards}`);
                } else if (action.round === 'river') {
                    log.push(`River card dealt: ${action.cards}`);
                }
            }
            currentRound = action.round;
        }

        if (action.player && action.action !== 'deal') {
            const actionStr = formatAction(action);
            log.push(`Player ${action.player} ${actionStr}`);
        }
    });

    if (state.isComplete) {
        // Calculate actual pot including uncollected bets
        const totalPot = state.pot + state.players.reduce((sum, p) => sum + p.bet, 0);

        log.push('');
        log.push(`Hand #${state.handId} ended`);
        log.push(`Final pot was ${totalPot - 60}`);

        if (state.winnings) {
            log.push('');
            log.push('Winnings:');
            Object.entries(state.winnings).forEach(([player, amount]) => {
                const sign = amount > 0 ? '+' : '';
                log.push(`Player ${player}: ${sign}${amount}`);
            });
        }
    }

    return log;
}

function formatAction(action: GameAction): string {
    switch (action.action) {
        case 'fold':
            return 'folds';
        case 'check':
            return 'checks';
        case 'call':
            return `calls ${action.amount || ''}`;
        case 'bet':
            return `bets ${action.amount || 0}`;
        case 'raise':
            return `raises to ${action.amount || 0} chips`;
        case 'allin':
            return `goes all-in${action.amount ? ` for ${action.amount}` : ''}`;
        default:
            return action.action;
    }
}