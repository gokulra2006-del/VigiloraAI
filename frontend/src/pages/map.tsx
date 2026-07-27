import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { MapContainer, TileLayer, Marker, Popup, LayersControl, Circle, LayerGroup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Search, Filter, Layers, Navigation, Settings } from 'lucide-react';

// Fix for default leaflet marker icons in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Icons
const createIcon = (color: string) => {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px ${color}"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6]
  });
};

const cameraIcon = createIcon('#3b82f6');
const incidentIcon = createIcon('#ef4444');
const policeIcon = createIcon('#8b5cf6');
const hospitalIcon = createIcon('#10b981');
const vehicleIcon = createIcon('#f59e0b');

// Mock Route
const patrolRoute: [number, number][] = [
  [40.7140, -74.0040],
  [40.7150, -74.0050],
  [40.7170, -74.0020],
  [40.7180, -73.9980],
  [40.7160, -73.9950]
];

export function MapPage() {
  const [mapReady, setMapReady] = useState(false);
  
  useEffect(() => {
    // Small delay to ensure container is fully sized before leaflet renders
    const timer = setTimeout(() => setMapReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 h-[calc(100vh-8rem)] flex flex-col relative z-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 z-10">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">GIS Command Center</h1>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Map Toolbar */}
          <div className="flex items-center bg-zinc-900 border border-white/10 rounded-lg p-1 shadow-sm">
            <button className="p-1.5 text-muted-foreground hover:text-white hover:bg-white/5 rounded transition-colors" title="Search Location"><Search size={16} /></button>
            <button className="p-1.5 text-muted-foreground hover:text-white hover:bg-white/5 rounded transition-colors" title="Filters"><Filter size={16} /></button>
            <button className="p-1.5 text-muted-foreground hover:text-white hover:bg-white/5 rounded transition-colors" title="Layers"><Layers size={16} /></button>
            <div className="w-[1px] h-4 bg-white/10 mx-1"></div>
            <button className="p-1.5 text-muted-foreground hover:text-white hover:bg-white/5 rounded transition-colors" title="Route Planning"><Navigation size={16} /></button>
            <button className="p-1.5 text-muted-foreground hover:text-white hover:bg-white/5 rounded transition-colors" title="Settings"><Settings size={16} /></button>
          </div>
        </div>
      </div>

      <Card className="bg-zinc-900 border-white/5 flex-1 relative overflow-hidden rounded-xl shadow-2xl">
        {mapReady ? (
          <MapContainer 
            center={[40.7140, -74.0040]} 
            zoom={14} 
            style={{ height: '100%', width: '100%', zIndex: 1 }}
            zoomControl={false}
          >
            <LayersControl position="topright">
              <LayersControl.BaseLayer checked name="Street Mode (Dark)">
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                />
              </LayersControl.BaseLayer>
              <LayersControl.BaseLayer name="Street Mode (Light)">
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                  attribution='&copy; OpenStreetMap &copy; CARTO'
                />
              </LayersControl.BaseLayer>
              <LayersControl.BaseLayer name="Satellite Mode">
                <TileLayer
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  attribution='Tiles &copy; Esri'
                />
              </LayersControl.BaseLayer>

              {/* Heatmap Mock Layer */}
              <LayersControl.Overlay name="Traffic Heatmap">
                <LayerGroup>
                  <Circle center={[40.7128, -74.0060]} radius={400} pathOptions={{ color: 'transparent', fillColor: '#ef4444', fillOpacity: 0.4 }} />
                  <Circle center={[40.7128, -74.0060]} radius={200} pathOptions={{ color: 'transparent', fillColor: '#ef4444', fillOpacity: 0.6 }} />
                  <Circle center={[40.7200, -73.9950]} radius={500} pathOptions={{ color: 'transparent', fillColor: '#f59e0b', fillOpacity: 0.3 }} />
                  <Circle center={[40.7250, -74.0100]} radius={300} pathOptions={{ color: 'transparent', fillColor: '#ef4444', fillOpacity: 0.5 }} />
                </LayerGroup>
              </LayersControl.Overlay>

              <LayersControl.Overlay checked name="Cameras">
                <LayerGroup>
                  <Marker position={[40.7128, -74.0060]} icon={cameraIcon}>
                    <Popup className="custom-popup">
                      <div className="font-semibold text-sm">CAM-01 (Main St)</div>
                      <div className="text-xs text-emerald-500">Status: Online</div>
                    </Popup>
                  </Marker>
                  <Marker position={[40.7200, -74.0100]} icon={cameraIcon} />
                  <Marker position={[40.7150, -73.9900]} icon={cameraIcon} />
                </LayerGroup>
              </LayersControl.Overlay>

              <LayersControl.Overlay checked name="Active Incidents">
                <LayerGroup>
                  <Marker position={[40.7100, -74.0000]} icon={incidentIcon}>
                    <Popup>
                      <div className="font-semibold text-sm text-red-500">INC-4022</div>
                      <div className="text-xs">Traffic Accident - 2 Vehicles</div>
                    </Popup>
                  </Marker>
                  <Circle center={[40.7100, -74.0000]} radius={150} pathOptions={{ color: 'red', fillColor: 'red', fillOpacity: 0.2, dashArray: '4, 4' }} />
                </LayerGroup>
              </LayersControl.Overlay>

              <LayersControl.Overlay checked name="Police Stations">
                <LayerGroup>
                  <Marker position={[40.7180, -74.0020]} icon={policeIcon} />
                </LayerGroup>
              </LayersControl.Overlay>

              <LayersControl.Overlay checked name="Hospitals">
                <LayerGroup>
                  <Marker position={[40.7300, -73.9950]} icon={hospitalIcon} />
                </LayerGroup>
              </LayersControl.Overlay>

              <LayersControl.Overlay checked name="Live Vehicles (Patrols)">
                <LayerGroup>
                  {/* Route Polyline */}
                  <Polyline positions={patrolRoute} pathOptions={{ color: '#f59e0b', weight: 3, opacity: 0.7, dashArray: '8, 8' }} />
                  
                  {/* Vehicle on Route */}
                  <Marker position={patrolRoute[0]} icon={vehicleIcon}>
                     <Popup>
                      <div className="font-semibold text-sm text-amber-500">Patrol Unit 07</div>
                      <div className="text-xs">Speed: 45 km/h<br/>Status: En Route</div>
                    </Popup>
                  </Marker>
                  <Marker position={[40.7220, -73.9850]} icon={vehicleIcon} />
                </LayerGroup>
              </LayersControl.Overlay>
            </LayersControl>
          </MapContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground animate-pulse text-sm">
            Initializing Geospatial Engine...
          </div>
        )}
      </Card>
      <style>{`
        .leaflet-container { background: #09090b; }
        .leaflet-popup-content-wrapper { background: #18181b; color: #fff; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; }
        .leaflet-popup-tip { background: #18181b; }
        .leaflet-control-layers { background: #18181b !important; color: #fff !important; border: 1px solid rgba(255,255,255,0.1) !important; border-radius: 8px !important; }
        .leaflet-control-layers-expanded { padding: 10px !important; }
        .leaflet-control-layers-separator { border-top: 1px solid rgba(255,255,255,0.1) !important; }
        .custom-div-icon { background: transparent; border: none; }
      `}</style>
    </div>
  );
}
