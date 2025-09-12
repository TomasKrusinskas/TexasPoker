export interface Player {
    position: number;
    cards: string;
    stack: number;
    bet: number;
    hasActed: boolean;
    hasFolded: boolean;
}

export interface GameState {
    handId: string;
    players: Player[];
    dealerPosition: number;
    smallBlindPosition: number;
    bigBlindPosition: number;
    currentPlayer: number;
    pot: number;
    currentBet: number;
    round: 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
    boardCards: string;
    actions: GameAction[];
    isComplete: boolean;
    winnings?: Record<number, number>;
}

export interface GameAction {
    round: string;
    player?: number;
    action: string;
    amount?: number;
    cards?: string;
}

export interface HandCreateRequest {
    hand_id: string;
    stack_size: number;
    dealer_position: number;
    small_blind_position: number;
    big_blind_position: number;
    player_cards: Record<string, string>;
    actions: GameAction[];
    board_cards: string | null;
}

export interface HandResponse {
    id: number;
    hand_id: string;
    stack_size: number;
    dealer_position: number;
    small_blind_position: number;
    big_blind_position: number;
    player_cards: Record<string, string>;
    actions: string;
    board_cards: string | null;
    winnings: Record<string, number>;
    created_at: string;
}

export interface HandHistoryItem {
    hand_id: string;
    display_lines: string[];
    created_at: string;
}