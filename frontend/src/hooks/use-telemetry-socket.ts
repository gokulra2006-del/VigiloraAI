import { useEffect, useState } from 'react';

const WS_URL = 'ws://127.0.0.1:8000/api/v1/telemetry/ws';

export type TelemetryEvent = {
  type: string;
  data: any;
};

export const useTelemetrySocket = (onEvent: (event: TelemetryEvent) => void) => {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    let ws: WebSocket;
    let reconnectTimer: ReturnType<typeof setTimeout>;

    const connect = () => {
      ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        setIsConnected(true);
        console.log('Telemetry WebSocket connected');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onEvent(data);
        } catch (e) {
          console.error('Failed to parse telemetry event', e);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        console.log('Telemetry WebSocket disconnected. Reconnecting in 3s...');
        reconnectTimer = setTimeout(connect, 3000);
      };

      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        ws.close();
      };
    };

    connect();

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) ws.close();
    };
  }, [onEvent]);

  return { isConnected };
};
