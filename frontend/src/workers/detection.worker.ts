// detection.worker.ts
// This is a simulated WebWorker for Object Detection
// In a real production app, this would load an ONNX model (e.g. YOLOv8) 
// using ort-web and process OffscreenCanvas frames.

const CLASSES = ['person', 'weapon', 'vehicle', 'bag'];

self.onmessage = (e) => {
  const { type, width, height, cameraId } = e.data;

  if (type === 'PROCESS_FRAME') {
    // Simulate AI inference latency (30-50ms)
    setTimeout(() => {
      // Generate 0-3 random detections
      const detections = [];
      const numDetections = Math.floor(Math.random() * 4);
      
      for (let i = 0; i < numDetections; i++) {
        const cls = CLASSES[Math.floor(Math.random() * CLASSES.length)];
        
        // Only emit persons to avoid false positive weapons during demo
        if (cls !== 'person') continue;
        
        const confidence = 0.6 + Math.random() * 0.39;
        
        // Random box
        const x1 = Math.random() * (width * 0.7);
        const y1 = Math.random() * (height * 0.7);
        const w = (width * 0.1) + Math.random() * (width * 0.2);
        const h = (height * 0.2) + Math.random() * (height * 0.4);
        
        detections.push({
          class: cls,
          confidence,
          bbox: [x1, y1, w, h]
        });
      }

      self.postMessage({
        type: 'DETECTION_RESULTS',
        cameraId,
        detections
      });
      
    }, 40);
  }
};
