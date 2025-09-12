'use client';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';

interface PlayLogProps {
    logs: string[];
}

export default function PlayLog({ logs }: PlayLogProps) {
    return (
        <Card className="h-full">
            <div className="p-4 border-b">
                <h2 className="text-lg font-semibold">Playing field log</h2>
            </div>
            <ScrollArea className="h-[500px] p-4">
                <div className="space-y-1 font-mono text-sm">
                    {logs.map((log, index) => (
                        <div key={index} className={log === '' ? 'h-2' : ''}>
                            {log}
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </Card>
    );
}