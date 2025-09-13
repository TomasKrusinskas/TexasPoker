'use client';

import { useState, useEffect, useRef } from 'react';
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
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    const saveAttempted = useRef<Set<string>>(new Set());

    useEffect(() => {
        const newLogs = formatActionLog(gameState);
        setLogs(newLogs);
    }, [gameState]);

    useEffect(() => {
        if (gameState.isComplete &&
            !gameState.winnings &&
            !isSaving &&
            gameState.players[0].cards &&
            !saveAttempted.current.has(gameState.handId)) {

            saveAttempted.current.add(gameState.handId);
            saveHandToBackend();
        }
    }, [gameState.isComplete, gameState.winnings, isSaving, gameState.handId, gameState.players]);

    const saveHandToBackend = async () => {
        if (isSaving) {
            console.log('Already saving, skipping duplicate save attempt');
            return;
        }

        try {
            setIsSaving(true);
            setSaveError(null);

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

            console.log('Saving hand:', handData.hand_id);
            console.log('Actions being sent:', gameState.actions.length, 'actions');

            const response = await handsApi.create(handData);

            setGameState(prev => ({
                ...prev,
                winnings: response.winnings,
            }));

            const winningsLog: string[] = ['', 'Winnings:'];
            Object.entries(response.winnings).forEach(([player, amount]) => {
                const sign = amount > 0 ? '+' : '';
                winningsLog.push(`Player ${player}: ${sign}${amount}`);
            });
            setLogs(prev => [...prev, ...winningsLog]);

            console.log('Hand saved successfully');

        } catch (error) {
            console.error('Failed to save hand:', error);

            if (axios.isAxiosError(error)) {
                if (error.response?.status === 409) {
                    console.log('Hand already exists (409), not retrying');
                    setSaveError('Hand already saved');
                } else if (error.response?.status === 500) {
                    console.error('Server error (500):', error.response.data);
                    setSaveError('Server error - check backend logs');
                } else if (error.code === 'ERR_NETWORK') {
                    setSaveError('Network error - check if backend is running');
                } else {
                    setSaveError(`HTTP ${error.response?.status}: ${error.message}`);
                }
            } else {
                setSaveError(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }

            saveAttempted.current.delete(gameState.handId);

        } finally {
            setIsSaving(false);
        }
    };

    const handleAction = (action: string, amount?: number) => {
        const newState = applyAction(gameState, action, amount);
        setGameState(newState);
    };

    const handleReset = () => {
        const newState = createInitialGameState(stackSize, true);
        setGameState(newState);

        saveAttempted.current.clear();
        setSaveError(null);
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

                {/* Error Display */}
                {saveError && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                        <div className="font-bold">Save Error:</div>
                        <div>{saveError}</div>
                    </div>
                )}

                {/* Saving Indicator */}
                {isSaving && (
                    <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
                        Saving hand to backend...
                    </div>
                )}

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