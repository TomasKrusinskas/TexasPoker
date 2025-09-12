import {
    createInitialGameState,
    applyAction,
    canPerformAction,
    isRoundComplete,
    getNextPlayer,
    formatActionLog
} from '@/lib/poker-logic';
import { GameState } from '@/lib/types';

describe('Poker Game Logic Tests', () => {
    describe('createInitialGameState', () => {
        it('should create initial game state with correct setup', () => {
            const state = createInitialGameState(10000, true);

            expect(state.players).toHaveLength(6);
            expect(state.dealerPosition).toBe(3);
            expect(state.smallBlindPosition).toBe(4);
            expect(state.bigBlindPosition).toBe(5);
            expect(state.currentPlayer).toBe(6);
            expect(state.currentBet).toBe(40);
            expect(state.round).toBe('preflop');
            expect(state.isComplete).toBe(false);

            expect(state.players[3].bet).toBe(20);
            expect(state.players[4].bet).toBe(40);
        });

        it('should not deal cards when shouldDealCards is false', () => {
            const state = createInitialGameState(10000, false);

            expect(state.players[0].cards).toBe('');
            expect(state.currentBet).toBe(0);
            expect(state.currentPlayer).toBe(1);
        });

        it('should deal unique cards to each player', () => {
            const state = createInitialGameState(10000, true);
            const allCards = state.players.map(p => p.cards).join('');
            const cardSet = new Set();

            for (let i = 0; i < allCards.length; i += 2) {
                const card = allCards.substring(i, i + 2);
                if (card.length === 2) {
                    expect(cardSet.has(card)).toBe(false);
                    cardSet.add(card);
                }
            }
        });
    });

    describe('applyAction', () => {
        let state: GameState;

        beforeEach(() => {
            state = createInitialGameState(10000, true);
        });

        it('should handle fold action correctly', () => {
            const newState = applyAction(state, 'fold');

            expect(newState.players[5].hasFolded).toBe(true);
            expect(newState.actions).toHaveLength(1);
            expect(newState.actions[0].action).toBe('fold');
        });

        it('should handle call action correctly', () => {
            const newState = applyAction(state, 'call');

            expect(newState.players[5].bet).toBe(40);
            expect(newState.players[5].stack).toBe(9960);
            expect(newState.actions[0].action).toBe('call');
        });

        it('should handle raise action correctly', () => {
            const newState = applyAction(state, 'raise', 80);

            expect(newState.players[5].bet).toBe(80);
            expect(newState.currentBet).toBe(80);
            expect(newState.actions[0].action).toBe('raise');
        });

        it('should end game when only one player remains', () => {
            let newState = state;
            for (let i = 0; i < 5; i++) {
                newState = applyAction(newState, 'fold');
            }

            expect(newState.isComplete).toBe(true);
        });
    });

    describe('canPerformAction', () => {
        let state: GameState;

        beforeEach(() => {
            state = createInitialGameState(10000, true);
        });

        it('should allow fold at any time', () => {
            expect(canPerformAction(state, 'fold')).toBe(true);
        });

        it('should not allow check when there is a bet', () => {
            expect(canPerformAction(state, 'check')).toBe(false);
        });

        it('should allow call when there is a bet to match', () => {
            expect(canPerformAction(state, 'call')).toBe(true);
        });

        it('should not allow bet when there is already a bet', () => {
            expect(canPerformAction(state, 'bet', 40)).toBe(false);
        });

        it('should allow raise when there is a bet', () => {
            expect(canPerformAction(state, 'raise', 80)).toBe(true);
        });
    });

    describe('isRoundComplete', () => {
        it('should return true when only one player remains', () => {
            const state = createInitialGameState(10000, true);
            state.players.forEach((p, i) => {
                if (i !== 0) p.hasFolded = true;
            });

            expect(isRoundComplete(state)).toBe(true);
        });

        it('should return false when players still need to act', () => {
            const state = createInitialGameState(10000, true);

            expect(isRoundComplete(state)).toBe(false);
        });
    });

    describe('getNextPlayer', () => {
        let state: GameState;

        beforeEach(() => {
            state = createInitialGameState(10000, true);
        });

        it('should get next active player', () => {
            const next = getNextPlayer(state);
            expect(next).toBe(1);
        });

        it('should skip folded players', () => {
            state.players[0].hasFolded = true;
            const next = getNextPlayer(state);
            expect(next).toBe(2);
        });

        it('should wrap around to player 1 after player 6', () => {
            state.currentPlayer = 6;
            const next = getNextPlayer(state);
            expect(next).toBe(1);
        });
    });

    describe('formatActionLog', () => {
        it('should format initial game state correctly', () => {
            const state = createInitialGameState(10000, true);
            const log = formatActionLog(state);

            expect(log[0]).toContain('Player 1 is dealt');
            expect(log).toContain('Player 3 is the dealer');
            expect(log).toContain('Player 4 posts small blind - 20 chips');
            expect(log).toContain('Player 5 posts big blind - 40 chips');
        });

        it('should include player actions in log', () => {
            const state = createInitialGameState(10000, true);
            const newState = applyAction(state, 'call');
            const log = formatActionLog(newState);

            expect(log.some(line => line.includes('calls'))).toBe(true);
        });

        it('should show final pot when game completes', () => {
            let state = createInitialGameState(10000, true);
            for (let i = 0; i < 5; i++) {
                state = applyAction(state, 'fold');
            }

            const log = formatActionLog(state);
            expect(log.some(line => line.includes('Hand #') && line.includes('ended'))).toBe(true);
        });
    });
});