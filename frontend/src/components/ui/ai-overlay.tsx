import React, { useEffect, useState, useRef } from 'react';

interface BoundingBox {
  class: string;
  confidence: number;
  bbox: [number, number, number, number];
}

export function AiOverlay({ cameraId }: { cameraId: string }) {
  const [detections, setDetections] = useState<BoundingBox[]>([]);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    // Initialize WebWorker
    workerRef.current = new Worker(new URL('../../workers/detection.worker.ts', import.meta.url), {
      type: 'module'
    });

    workerRef.current.onmessage = (e) => {
      if (e.data.type === 'DETECTION_RESULTS' && e.data.cameraId === cameraId) {
        setDetections(e.data.detections);
      }
    };

    // Simulate sending frames to the worker every 500ms
    const interval = setInterval(() => {
      workerRef.current?.postMessage({
        type: 'PROCESS_FRAME',
        cameraId,
        width: 640,
        height: 360
      });
    }, 500);

    return () => {
      clearInterval(interval);
      workerRef.current?.terminate();
    };
  }, [cameraId]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {detections.map((d, i) => (
        <div
          key={i}
          className="absolute border-2 border-red-500 bg-red-500/10 flex flex-col justify-start items-start transition-all duration-300 ease-in-out"
          style={{
            left: `${(d.bbox[0] / 640) * 100}%`,
            top: `${(d.bbox[1] / 360) * 100}%`,
            width: `${(d.bbox[2] / 640) * 100}%`,
            height: `${(d.bbox[3] / 360) * 100}%`,
          }}
        >
          <span className="bg-red-500 text-white text-[9px] font-bold px-1 uppercase tracking-wider shadow-sm">
            {d.class} {(d.confidence * 100).toFixed(0)}%
          </span>
        </div>
      ))}
    </div>
  );
}
