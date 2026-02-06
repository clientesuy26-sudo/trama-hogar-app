'use client';

import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { cn } from '@/lib/utils';
import { ScrollArea } from './ui/scroll-area';
import { Button } from './ui/button';
import { X, Trash2, Bug } from 'lucide-react';

type Log = {
  timestamp: string;
  source: string;
  level: 'info' | 'error' | 'success';
  message: string;
  data?: any;
};

export function DevLogger() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    const unbind = logger.on('log', (log) => {
      setLogs((prevLogs) => [log, ...prevLogs].slice(0, 100)); // Keep last 100 logs
    });

    return () => {
      unbind();
    };
  }, []);

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 left-6 z-50 h-14 w-14 rounded-full shadow-2xl"
        variant="destructive"
      >
        <Bug className="h-6 w-6" />
      </Button>
    );
  }

  const getLevelColor = (level: Log['level']) => {
    switch (level) {
      case 'info':
        return 'text-blue-400';
      case 'success':
        return 'text-green-400';
      case 'error':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="fixed bottom-6 left-6 w-[calc(100vw-3rem)] sm:w-[450px] h-[40vh] bg-neutral-900/90 backdrop-blur-sm text-white rounded-lg shadow-2xl flex flex-col overflow-hidden border border-neutral-700 z-50">
      <div className="p-2 border-b border-neutral-700 flex justify-between items-center bg-neutral-800">
        <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-2"><Bug className="w-4 h-4"/><span>Maya Chat - Dev Log</span></h3>
        <div>
          <Button variant="ghost" size="icon" className="w-7 h-7 text-neutral-400 hover:bg-neutral-700" onClick={() => setLogs([])}>
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="w-7 h-7 text-neutral-400 hover:bg-neutral-700" onClick={() => setIsOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-3 font-mono text-xs">
          {logs.length === 0 && <p className="text-neutral-500">Awaiting logs...</p>}
          {logs.map((log, i) => (
            <div key={i} className="mb-2 pb-2 border-b border-neutral-800 last:border-b-0">
              <div className="flex justify-between items-center">
                <span className={cn('font-bold', getLevelColor(log.level))}>
                  [{log.source}] {log.message}
                </span>
                <span className="text-neutral-500 text-[10px]">{new Date(log.timestamp).toLocaleTimeString()}</span>
              </div>
              {log.data && (
                <pre className="mt-1 text-neutral-400 bg-neutral-800 p-2 rounded text-[10px] overflow-x-auto">
                  {typeof log.data === 'object' ? JSON.stringify(log.data, null, 2) : log.data}
                </pre>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
