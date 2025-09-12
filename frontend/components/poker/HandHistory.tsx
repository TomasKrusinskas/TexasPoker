'use client';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { HandHistoryItem } from '@/lib/types';
import { useEffect, useState } from 'react';
import { handsApi } from '@/lib/api';

export default function HandHistory() {
    const [history, setHistory] = useState<HandHistoryItem[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchHistory = async () => {
        try {
            const data = await handsApi.list(10);
            setHistory(data);
        } catch (error) {
            console.error('Failed to fetch hand history:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
        const interval = setInterval(fetchHistory, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <Card className="h-full">
            <div className="p-4 border-b">
                <h2 className="text-lg font-semibold">Hand history</h2>
            </div>
            <ScrollArea className="h-[500px] p-4">
                {loading ? (
                    <div className="text-gray-500">Loading...</div>
                ) : history.length === 0 ? (
                    <div className="text-gray-500">No hands played yet</div>
                ) : (
                    <div className="space-y-4">
                        {history.map((hand) => (
                            <div
                                key={hand.hand_id}
                                className="bg-blue-50 p-3 rounded text-xs font-mono space-y-1"
                            >
                                {hand.display_lines.map((line, index) => (
                                    <div key={index}>{line}</div>
                                ))}
                            </div>
                        ))}
                    </div>
                )}
            </ScrollArea>
        </Card>
    );
}