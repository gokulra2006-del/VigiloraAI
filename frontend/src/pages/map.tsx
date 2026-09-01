import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { MapContainer, TileLayer, Marker, Popup, LayersControl, Circle, LayerGroup, Polyline, Polygon } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Search, Filter, Layers, Navigation, Settings, Plus, RefreshCw, Shield, Zap } from 'lucide-react';
import { fetchRiskHeatmap, recomputeRiskScores, RiskZone } from '@/services/api/risk-scores';
import { fetchObjectAlerts } from '@/services/api/object-alerts';
import { fetchZones, Zone } from '@/services/api/geofence';
import { fetchCameras, Camera } from '@/services/api/cameras';
import { fetchIncidents, Incident } from '@/services/api/incidents';
import { motion, AnimatePresence } from 'framer-motion';

// Fix for default leaflet marker icons in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Icons
const createIcon = (color: string, glow = false) =>
  L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color:${color};width:12px;height:12px;border-radius:50%;border:2px solid white;box-shadow:0 0 ${glow ? 16 : 8}px ${color}"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6]
  });

const cameraIcon   = createIcon('#3b82f6');
const incidentIcon = createIcon('#ef4444', true);
const policeIcon   = createIcon('#8b5cf6');
const hospitalIcon = createIcon('#10b981');
const vehicleIcon  = createIcon('#f59e0b');
const weaponIcon   = createIcon('#ef4444', true);

// Removed hardcoded patrolRoute

function riskColor(level: string): string {
  switch (level) {
    case 'critical': return '#ef4444';
    case 'high':     return '#f97316';
    case 'medium':   return '#eab308';
    case 'low':      return '#22c55e';
    default:         return '#6b7280';
  }
}

// Helper to compute centroid of a polygon
function computeCentroid(coords: [number, number][]): [number, number] {
  if (!coords || coords.length === 0) return [40.7128, -74.0060];
  let lat = 0, lng = 0;
  for (const [x, y] of coords) {
    lat += x;
    lng += y;
  }
  return [lat / coords.length, lng / coords.length];
}

export function MapPage() {
  const [mapReady, setMapReady] = useState(false);
  const [riskZones, setRiskZones] = useState<RiskZone[]>([]);
  const [geofences, setGeofences] = useState<Zone[]>([]);
  const [recentWeapons, setRecentWeapons] = useState<any[]>([]);
  const [showRiskPanel, setShowRiskPanel] = useState(false);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [computing, setComputing] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMapReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    fetchRiskHeatmap().then(res => setRiskZones(res || [])).catch(() => {});
    fetchObjectAlerts({ threat_only: true, limit: 10 }).then(res => setRecentWeapons(res || [])).catch(() => {});
    fetchZones().then(res => setGeofences(res || [])).catch(() => {});
    fetchCameras().then(res => setCameras(res || [])).catch(() => {});
    fetchIncidents().then(res => setIncidents(res || [])).catch(() => {});

    // Live Telemetry Tracking
    const ws = new WebSocket('ws://127.0.0.1:8000/api/v1/telemetry/ws');
    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'VEHICLE_TELEMETRY') {
          setVehicles(payload.data);
        }
      } catch (e) {}
    };
    return () => ws.close();
  }, []);

  const handleRecompute = async () => {
    setComputing(true);
    try {
      await recomputeRiskScores();
      const zones = await fetchRiskHeatmap();
      setRiskZones(zones);
    } finally {
      setComputing(false);
    }
  };


  return (
    <div className="space-y-4 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 h-[calc(100vh-8rem)] flex flex-col relative z-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 z-10 shrink-0">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">GIS Command Center</h1>
          <p className="text-muted-foreground text-[13px] mt-0.5">
            Live camera nodes, geofence zones, and predictive risk heatmap.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowRiskPanel(p => !p)}
            className={`flex items-center gap-2 px-3 h-8 rounded-md text-[12px] font-medium border transition-all ${
              showRiskPanel ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' : 'bg-zinc-900 border-white/10 text-muted-foreground hover:text-white'
            }`}
          >
            <Shield size={13} />
            Risk Panel
          </button>
          <button
            onClick={handleRecompute}
            disabled={computing}
            className="flex items-center gap-2 px-3 h-8 bg-zinc-900 border border-white/10 rounded-md text-[12px] text-muted-foreground hover:text-white transition-colors"
          >
            <RefreshCw size={13} className={computing ? 'animate-spin' : ''} />
            Recompute Risk
          </button>
          <div className="flex items-center bg-zinc-900 border border-white/10 rounded-lg p-1 shadow-sm">
            <button className="p-1.5 text-muted-foreground hover:text-white hover:bg-white/5 rounded transition-colors" title="Search"><Search size={16} /></button>
            <button className="p-1.5 text-muted-foreground hover:text-white hover:bg-white/5 rounded transition-colors" title="Filters"><Filter size={16} /></button>
            <button className="p-1.5 text-muted-foreground hover:text-white hover:bg-white/5 rounded transition-colors" title="Layers"><Layers size={16} /></button>
            <div className="w-[1px] h-4 bg-white/10 mx-1" />
            <button className="p-1.5 text-muted-foreground hover:text-white hover:bg-white/5 rounded transition-colors" title="Add Zone"><Plus size={16} /></button>
          </div>
        </div>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Risk Panel */}
        <AnimatePresence>
          {showRiskPanel && (
            <motion.div
              initial={{ opacity: 0, x: -20, width: 0 }}
              animate={{ opacity: 1, x: 0, width: 256 }}
              exit={{ opacity: 0, x: -20, width: 0 }}
              className="shrink-0 overflow-hidden"
            >
              <div className="w-64 bg-zinc-900/80 border border-white/5 rounded-xl h-full flex flex-col overflow-hidden backdrop-blur-sm">
                <div className="p-3 border-b border-white/5">
                  <div className="text-[12px] font-semibold text-white">Risk Heatmap</div>
                  <div className="text-[11px] text-muted-foreground">Hourly zone risk scores</div>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {riskZones.length === 0 ? (
                    <div className="text-[11px] text-muted-foreground text-center py-4">
                      No zones computed yet. Click "Recompute Risk".
                    </div>
                  ) : (
                    riskZones.map(zone => (
                      <div key={zone.zone_id} className="p-3 bg-zinc-950/50 rounded-lg border border-white/5">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[12px] font-medium text-white truncate">{zone.zone_name}</span>
                          <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded`} style={{
                            background: riskColor(zone.level) + '20',
                            color: riskColor(zone.level),
                          }}>
                            {zone.level}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${zone.score}%`,
                                background: riskColor(zone.level),
                              }}
                            />
                          </div>
                          <span className="text-[11px] font-mono" style={{ color: riskColor(zone.level) }}>
                            {zone.score.toFixed(0)}
                          </span>
                        </div>
                        <div className="text-[10px] text-muted-foreground/60 mt-1">
                          {zone.factors?.recent_alerts ?? 0} recent alerts · hr {zone.factors?.hour ?? '—'}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Legend */}
                <div className="p-3 border-t border-white/5">
                  <div className="text-[10px] text-muted-foreground mb-2 uppercase font-semibold tracking-wider">Risk Levels</div>
                  <div className="space-y-1">
                    {['critical', 'high', 'medium', 'low'].map(level => (
                      <div key={level} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm" style={{ background: riskColor(level) }} />
                        <span className="text-[11px] text-muted-foreground capitalize">{level}</span>
                        <span className="text-[10px] text-muted-foreground/40 ml-auto">
                          {level === 'critical' ? '75-100' : level === 'high' ? '50-74' : level === 'medium' ? '25-49' : '0-24'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
                  />
                </LayersControl.BaseLayer>
                <LayersControl.BaseLayer name="Street Mode (Light)">
                  <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" attribution='&copy; OpenStreetMap &copy; CARTO' />
                </LayersControl.BaseLayer>
                <LayersControl.BaseLayer name="Satellite Mode">
                  <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" attribution='Tiles &copy; Esri' />
                </LayersControl.BaseLayer>

                {/* Geofence Zones */}
                <LayersControl.Overlay checked name="Geofence Zones">
                  <LayerGroup>
                    {geofences.map(zone => (
                      <Polygon
                        key={zone.id}
                        positions={zone.polygon_coords}
                        pathOptions={{
                          color: zone.color || '#ef4444',
                          fillColor: zone.color || '#ef4444',
                          fillOpacity: 0.1,
                          weight: 2,
                          dashArray: '6, 4',
                        }}
                      >
                        <Popup>
                          <div className="font-semibold text-sm" style={{ color: zone.color || '#ef4444' }}>{zone.name}</div>
                          <div className="text-xs text-gray-400 mt-1">{zone.rule || 'No specific rules'}</div>
                        </Popup>
                      </Polygon>
                    ))}
                  </LayerGroup>
                </LayersControl.Overlay>

                {/* Risk Heatmap */}
                <LayersControl.Overlay checked name="Risk Heatmap">
                  <LayerGroup>
                    {riskZones.map((zone, i) => {
                      const level = zone.level || 'medium';
                      const color = riskColor(level);
                      const score = zone.score || 0;
                      const centroid = zone.polygon_coords ? computeCentroid(zone.polygon_coords) : [40.7128, -74.0060] as [number, number];
                      return (
                        <React.Fragment key={zone.zone_id || i}>
                          <Circle center={centroid} radius={450} pathOptions={{ color: 'transparent', fillColor: color, fillOpacity: 0.15 }} />
                          <Circle center={centroid} radius={200} pathOptions={{ color: 'transparent', fillColor: color, fillOpacity: 0.25 }} />
                          <Marker position={centroid} icon={createIcon(color)}>
                            <Popup>
                              <div className="font-semibold text-sm" style={{ color }}>{zone.zone_name}</div>
                              <div className="text-xs">Score: {score.toFixed(0)} / 100</div>
                              <div className="text-xs" style={{ color }}>Level: {level.toUpperCase()}</div>
                            </Popup>
                          </Marker>
                        </React.Fragment>
                      );
                    })}
                  </LayerGroup>
                </LayersControl.Overlay>

                {/* Object Alert Locations */}
                {recentWeapons.length > 0 && (
                  <LayersControl.Overlay checked name="Weapon Alerts">
                    <LayerGroup>
                      {recentWeapons.slice(0, 5).map((alert, i) => {
                        const jitter: [number, number] = [
                          40.7128 + (i * 0.003) - 0.006,
                          -74.0060 + (i * 0.005) - 0.01
                        ];
                        return (
                          <Marker key={alert.id} position={jitter} icon={weaponIcon}>
                            <Popup>
                              <div className="font-semibold text-sm text-red-500">⚠ {alert.class_name.toUpperCase()}</div>
                              <div className="text-xs">Confidence: {alert.confidence_pct}%</div>
                              <div className="text-xs text-gray-400">{alert.camera_id}</div>
                            </Popup>
                          </Marker>
                        );
                      })}
                    </LayerGroup>
                  </LayersControl.Overlay>
                )}

                {/* Dynamic Live Cameras */}
                <LayersControl.Overlay checked name="Cameras">
                  <LayerGroup>
                    {cameras.map(cam => (
                      cam.location_lat && cam.location_lng && (
                        <Marker key={cam.id} position={[cam.location_lat, cam.location_lng]} icon={cameraIcon}>
                          <Popup>
                            <div className="font-semibold text-sm">{cam.name}</div>
                            <div className={`text-xs ${cam.status === 'online' ? 'text-emerald-500' : 'text-red-500'}`}>Status: {cam.status}</div>
                          </Popup>
                        </Marker>
                      )
                    ))}
                  </LayerGroup>
                </LayersControl.Overlay>

                {/* Dynamic Active Incidents */}
                <LayersControl.Overlay checked name="Active Incidents">
                  <LayerGroup>
                    {incidents.filter(inc => inc.status !== 'resolved' && inc.status !== 'closed').map(inc => {
                      // Find camera coordinates for incident
                      const cam = cameras.find(c => c.id === inc.camera_id);
                      const pos: [number, number] = cam?.location_lat && cam?.location_lng 
                        ? [cam.location_lat, cam.location_lng] 
                        : [40.7100, -74.0000]; // Fallback

                      return (
                        <React.Fragment key={inc.id}>
                          <Marker position={pos} icon={incidentIcon}>
                            <Popup>
                              <div className="font-semibold text-sm text-red-500">{inc.type.toUpperCase()}</div>
                              <div className="text-xs">Severity: {inc.severity}</div>
                            </Popup>
                          </Marker>
                          <Circle center={pos} radius={150} pathOptions={{ color: 'red', fillColor: 'red', fillOpacity: 0.15, dashArray: '4, 4' }} />
                        </React.Fragment>
                      )
                    })}
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

                {/* Dynamic Live Vehicles from Telemetry WebSocket */}
                <LayersControl.Overlay checked name="Live Vehicles (Patrols)">
                  <LayerGroup>
                    {vehicles.map(v => (
                      <Marker key={v.id} position={[v.lat, v.lng]} icon={vehicleIcon}>
                        <Popup>
                          <div className="font-semibold text-sm text-amber-500">{v.name}</div>
                          <div className="text-xs">Heading: {v.heading.toFixed(0)}°<br />Status: {v.status}</div>
                        </Popup>
                      </Marker>
                    ))}
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
      </div>

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
