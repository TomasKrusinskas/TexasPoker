'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import GameControls from './GameControls';
import PlayLog from './PlayLog';
import HandHistory from './HandHistory';
import { GameState, HandCreateRequest } from '@/lib/types';
import {
    createInitialGameState,
    applyAction,
    formatActionLog
} from '@/lib/poker-logic';
import { handsApi } from '@/lib/api';

export default function PokerGame() {
    const [stackSize, setStackSize] = useState(10000);
    const [gameState, setGameState] = useState<GameState>(() =>
        createInitialGameState(stackSize, false)
    );
    const [logs, setLogs] = useState<string[]>([]);
    const [handSaved, setHandSaved] = useState(false);

    useEffect(() => {
        const newLogs = formatActionLog(gameState);
        setLogs(newLogs);
    }, [gameState]);

    useEffect(() => {
        if (gameState.isComplete && !gameState.winnings && !handSaved) {
            saveHandToBackend();
        }
    }, [gameState.isComplete, gameState.winnings, handSaved]);

    const saveHandToBackend = async () => {
        try {
            if (!gameState.players[0].cards) {
                console.log('Cannot save hand: no cards dealt');
                return;
            }

            const playerCards: Record<string, string> = {};
            let hasValidCards = false;
            gameState.players.forEach(p => {
                if (p.cards && p.cards.length >= 4) {
                    playerCards[p.position.toString()] = p.cards;
                    hasValidCards = true;
                }
            });

            if (!hasValidCards) {
                console.log('Cannot save hand: invalid card data');
                return;
            }

            // Ensure board cards are properly formatted
            const boardCards = gameState.boardCards || null;

            const handData: HandCreateRequest = {
                hand_id: gameState.handId,
                stack_size: stackSize,
                dealer_position: gameState.dealerPosition,
                small_blind_position: gameState.smallBlindPosition,
                big_blind_position: gameState.bigBlindPosition,
                player_cards: playerCards,
                actions: gameState.actions,
                board_cards: boardCards,
            };

            console.log('Saving hand:', handData);
            console.log('Game state pot:', gameState.pot);
            console.log('Actions being sent:', JSON.stringify(handData.actions, null, 2));

            setHandSaved(true); // Prevent duplicate saves
            const response = await handsApi.create(handData);

            // Update state with winnings from backend
            setGameState(prev => ({
                ...prev,
                winnings: response.winnings,
            }));

            // Add winnings to log
            const winningsLog: string[] = ['', 'Winnings:'];
            Object.entries(response.winnings).forEach(([player, amount]) => {
                const sign = amount > 0 ? '+' : '';
                winningsLog.push(`Player ${player}: ${sign}${amount}`);
            });
            setLogs(prev => [...prev, ...winningsLog]);

        } catch (error) {
            console.error('Failed to save hand:', error);
            if (axios.isAxiosError(error) && error.response) {
                console.error('Server error:', error.response.data);
            }
            setHandSaved(false); // Allow retry on error
        }
    };

    const handleAction = (action: string, amount?: number) => {
        const newState = applyAction(gameState, action, amount);
        setGameState(newState);
    };

    const handleReset = () => {
        const newState = createInitialGameState(stackSize, true);
        setGameState(newState);
        setHandSaved(false); // Reset the saved flag for new hand
    };

    const handleStackChange = (newStack: number) => {
        setStackSize(newStack);
        if (!gameState.players[0].cards) {
            setGameState(prev => ({
                ...prev,
                players: prev.players.map(p => ({
                    ...p,
                    stack: newStack
                }))
            }));
        }
    };

    return (
        <div className="flex gap-6 p-6 h-screen">
            <div className="flex-1 flex flex-col gap-4">
                <GameControls
                    gameState={gameState}
                    onAction={handleAction}
                    onReset={handleReset}
                    onStackChange={handleStackChange}
                    stackSize={stackSize}
                />
                <div className="flex-1">
                    <PlayLog logs={logs} />
                </div>
            </div>
            <div className="w-96">
                <HandHistory />
            </div>
        </div>
    );
}