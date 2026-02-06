import { createNanoEvents } from 'nanoevents';

type Log = {
  timestamp: string;
  source: string;
  level: 'info' | 'error' | 'success';
  message: string;
  data?: any;
};

export const logger = createNanoEvents<{
  log: (log: Log) => void;
}>();

export const logEvent = (source: string, level: 'info' | 'error' | 'success', message: string, data?: any) => {
  logger.emit('log', {
    timestamp: new Date().toISOString(),
    source,
    level,
    message,
    data: data ? JSON.parse(JSON.stringify(data, (key, value) =>
        typeof value === 'bigint'
            ? value.toString()
            : value
    )) : undefined,
  });
};
