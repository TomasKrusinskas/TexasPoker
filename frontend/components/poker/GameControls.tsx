'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GameState } from '@/lib/types';
import { canPerformAction } from '@/lib/poker-logic';
import { useState, useEffect } from 'react';

interface GameControlsProps {
    gameState: GameState;
    onAction: (action: string, amount?: number) => void;
    onReset: () => void;
    onStackChange: (stack: number) => void;
    stackSize: number;
}

export default function GameControls({
                                         gameState,
                                         onAction,
                                         onReset,
                                         onStackChange,
                                         stackSize,
                                     }: GameControlsProps) {
    const [betAmount, setBetAmount] = useState(40);
    const [raiseAmount, setRaiseAmount] = useState(80);
    const [localStack, setLocalStack] = useState(stackSize);

    useEffect(() => {
        setLocalStack(stackSize);
    }, [stackSize]);

    useEffect(() => {
        // Update raise amount based on current bet
        if (gameState.currentBet > 0) {
            setRaiseAmount(Math.max(gameState.currentBet * 2, 80));
        }
    }, [gameState.currentBet]);

    const handleStackApply = () => {
        onStackChange(localStack);
    };

    const adjustAmount = (type: 'bet' | 'raise', increment: number) => {
        if (type === 'bet') {
            setBetAmount(Math.max(40, betAmount + increment));
        } else {
            const minRaise = gameState.currentBet > 0 ? gameState.currentBet * 2 : 80;
            setRaiseAmount(Math.max(minRaise, raiseAmount + increment));
        }
    };

    const isButtonDisabled = (action: string, amount?: number) => {
        if (gameState.isComplete) return true;
        if (!gameState.players[0].cards) return true;
        return !canPerformAction(gameState, action, amount);
    };

    const hasGameStarted = gameState.actions.length > 0 ||
        gameState.pot > 0 ||
        gameState.players[0].cards !== '';

    // Show current game status
    const getCurrentPlayerInfo = () => {
        if (gameState.isComplete) {
            return "Hand Complete";
        }
        if (!gameState.players[0].cards) {
            return "Press Start to begin";
        }
        const currentPlayer = gameState.players[gameState.currentPlayer - 1];
        const toCall = gameState.currentBet - currentPlayer.bet;

        return `Player ${gameState.currentPlayer}'s turn${toCall > 0 ? ` (${toCall} to call)` : ''}`;
    };

    return (
        <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Setup</h3>
                <div className="flex items-center gap-2">
                    <label className="text-sm">Stacks</label>
                    <Input
                        type="number"
                        value={localStack}
                        onChange={(e) => setLocalStack(Number(e.target.value))}
                        className="w-24"
                        disabled={hasGameStarted}
                    />
                    <Button
                        onClick={handleStackApply}
                        variant="outline"
                        disabled={hasGameStarted}
                    >
                        Apply
                    </Button>
                    <Button
                        onClick={onReset}
                        variant="destructive"
                    >
                        {hasGameStarted ? 'Reset' : 'Start'}
                    </Button>
                </div>
                <div className="mt-2 text-sm text-gray-600">
                    {getCurrentPlayerInfo()}
                </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Actions</h3>
                <div className="grid grid-cols-3 gap-2">
                    <Button
                        onClick={() => onAction('fold')}
                        disabled={isButtonDisabled('fold')}
                        className="bg-blue-500 hover:bg-blue-600"
                    >
                        Fold
                    </Button>
                    <Button
                        onClick={() => onAction('check')}
                        disabled={isButtonDisabled('check')}
                        className="bg-green-500 hover:bg-green-600"
                    >
                        Check
                    </Button>
                    <Button
                        onClick={() => onAction('call')}
                        disabled={isButtonDisabled('call')}
                        className="bg-green-600 hover:bg-green-700"
                    >
                        Call {gameState.currentBet > 0 ? gameState.currentBet - gameState.players[gameState.currentPlayer - 1]?.bet || 0 : ''}
                    </Button>

                    <div className="flex items-center gap-1">
                        <Button
                            size="sm"
                            onClick={() => adjustAmount('bet', -40)}
                            disabled={gameState.isComplete || gameState.currentBet > 0}
                        >
                            -
                        </Button>
                        <Button
                            onClick={() => onAction('bet', betAmount)}
                            disabled={isButtonDisabled('bet', betAmount)}
                            className="bg-orange-500 hover:bg-orange-600 flex-1"
                        >
                            Bet {betAmount}
                        </Button>
                        <Button
                            size="sm"
                            onClick={() => adjustAmount('bet', 40)}
                            disabled={gameState.isComplete || gameState.currentBet > 0}
                        >
                            +
                        </Button>
                    </div>

                    <div className="flex items-center gap-1">
                        <Button
                            size="sm"
                            onClick={() => adjustAmount('raise', -40)}
                            disabled={gameState.isComplete || gameState.currentBet === 0}
                        >
                            -
                        </Button>
                        <Button
                            onClick={() => onAction('raise', raiseAmount)}
                            disabled={isButtonDisabled('raise', raiseAmount)}
                            className="bg-orange-600 hover:bg-orange-700 flex-1"
                        >
                            Raise {raiseAmount}
                        </Button>
                        <Button
                            size="sm"
                            onClick={() => adjustAmount('raise', 40)}
                            disabled={gameState.isComplete || gameState.currentBet === 0}
                        >
                            +
                        </Button>
                    </div>

                    <Button
                        onClick={() => onAction('allin')}
                        disabled={isButtonDisabled('allin')}
                        className="bg-red-500 hover:bg-red-600"
                    >
                        ALL IN
                    </Button>
                </div>

                <div className="mt-4 text-sm text-gray-600">
                    <div>Pot: {gameState.pot - 60} chips</div>
                    <div>Current bet: {gameState.currentBet} chips</div>
                    <div>Round: {gameState.round}</div>
                    {gameState.boardCards && (
                        <div>Board: {gameState.boardCards}</div>
                    )}
                </div>
            </div>
        </div>
    );
}