import React, { useCallback, useEffect, useState } from 'react';
import {
  Camera as CameraIcon, CircleDot, Radio, RefreshCw, Video, Plus,
  Trash2, Laptop, Smartphone, Film, Shield, Scan, CheckCircle2,
  AlertCircle, Eye, X, Settings2
} from 'lucide-react';
import {
  Camera, fetchCameras, updateCameraStatus, createCamera,
  deleteCamera, discoverDevices, getCameraLiveStreamUrl, DiscoveredDevice
} from '@/services/api/cameras';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';

const statusStyle: Record<Camera['status'], string> = {
  online: 'bg-emerald-500',
  offline: 'bg-red-500',
  degraded: 'bg-amber-500'
};

const sourceIcons: Record<string, any> = {
  webcam: Laptop,
  rtsp_phone: Smartphone,
  real_hardware: Video,
  video_file: Film,
};

export function CamerasPage() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [previewCam, setPreviewCam] = useState<Camera | null>(null);
  const [scanning, setScanning] = useState(false);
  const [discoveredDevices, setDiscoveredDevices] = useState<DiscoveredDevice[]>([]);

  // Form State
  const [sourceType, setSourceType] = useState<'webcam' | 'rtsp_phone' | 'real_hardware' | 'video_file'>('webcam');
  const [camName, setCamName] = useState('');
  const [camLocation, setCamLocation] = useState('Sector 1, Primary Entry');
  const [streamUrl, setStreamUrl] = useState('0');
  const [resolution, setResolution] = useState('1080p');
  const [fps, setFps] = useState(30);
  const [selectedModels, setSelectedModels] = useState<string[]>(['YOLOv8']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const load = useCallback(async () => {
    try {
      setCameras(await fetchCameras());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleStatusToggle = async (camera: Camera) => {
    setUpdating(camera.id);
    try {
      const nextStatus = camera.status === 'offline' ? 'online' : 'offline';
      await updateCameraStatus(camera.id, nextStatus);
      await load();
    } finally {
      setUpdating(null);
    }
  };

  const handleDelete = async (camera: Camera) => {
    if (!confirm(`Are you sure you want to remove '${camera.name}' (${camera.id})?`)) return;
    try {
      await deleteCamera(camera.id);
      await load();
      if (previewCam?.id === camera.id) setPreviewCam(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleScanDevices = async () => {
    setScanning(true);
    try {
      const res = await discoverDevices();
      setDiscoveredDevices(res.devices);
    } catch (err) {
      console.error(err);
    } finally {
      setScanning(false);
    }
  };

  const handleSelectPreset = (type: 'webcam' | 'rtsp_phone' | 'real_hardware' | 'video_file') => {
    setSourceType(type);
    if (type === 'webcam') {
      setStreamUrl('0');
      if (!camName) setCamName('Integrated / USB Webcam');
    } else if (type === 'rtsp_phone') {
      setStreamUrl('http://192.168.1.100:8080/video');
      if (!camName) setCamName('Phone IP Camera');
    } else if (type === 'real_hardware') {
      setStreamUrl('rtsp://admin:password@192.168.1.50:554/stream1');
      if (!camName) setCamName('CCTV Security Cam');
    } else if (type === 'video_file') {
      setStreamUrl('sample_traffic.mp4');
      if (!camName) setCamName('Surveillance Footage Node');
    }
  };

  const handleCreateCamera = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!camName.trim()) {
      setFormError('Please enter a camera name');
      return;
    }

    setIsSubmitting(true);
    try {
      await createCamera({
        name: camName.trim(),
        location: camLocation.trim(),
        source_type: sourceType,
        stream_url: streamUrl.trim(),
        resolution,
        fps: Number(fps),
        active_models: selectedModels,
        status: 'online',
      });
      setShowAddModal(false);
      // Reset form
      setCamName('');
      setStreamUrl('0');
      await load();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create camera');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-semibold text-cyan-400 uppercase tracking-widest">Device Registry</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-white flex gap-2 items-center">
            <Video className="text-cyan-400" size={22} />
            Camera & Hardware Management
          </h1>
          <p className="text-muted-foreground mt-1 text-[13px]">
            Connect real webcams, smartphone RTSP feeds, IP cameras, and local surveillance video nodes.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              handleScanDevices();
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 px-3.5 h-9 bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20 rounded-lg text-[12px] font-semibold transition-all shadow-sm"
          >
            <Plus size={14} />
            Add Real Camera
          </button>
          <button
            onClick={load}
            className="p-2 rounded-lg bg-zinc-900 border border-white/10 text-muted-foreground hover:text-white transition-colors"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Camera Grid */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          [1, 2, 3].map(i => <div className="h-64 rounded-xl bg-zinc-900/40 border border-white/5 animate-pulse" key={i} />)
        ) : cameras.length === 0 ? (
          <Card className="col-span-full p-12 bg-zinc-900/40 border-white/5 text-center">
            <Video size={36} className="text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="text-white font-medium text-base">No cameras registered yet</h3>
            <p className="text-muted-foreground text-xs mt-1 mb-4">Add your laptop webcam or smartphone to begin real-time streaming.</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold"
            >
              + Add Camera Now
            </button>
          </Card>
        ) : (
          cameras.map(camera => {
            const Icon = sourceIcons[camera.source_type || 'webcam'] || Video;
            return (
              <Card key={camera.id} className="overflow-hidden bg-zinc-900/40 border-white/5 hover:border-white/15 transition-all group">
                {/* Camera Viewport Header */}
                <div
                  className="h-32 relative bg-zinc-950 border-b border-white/5 flex items-center justify-center cursor-pointer overflow-hidden"
                  style={{
                    backgroundImage: 'linear-gradient(rgba(34,211,238,.04) 1px, transparent 1px),linear-gradient(90deg, rgba(34,211,238,.04) 1px, transparent 1px)',
                    backgroundSize: '20px 20px'
                  }}
                  onClick={() => setPreviewCam(camera)}
                >
                  <Icon className="text-cyan-400/40 group-hover:scale-110 transition-transform duration-300" size={38} />
                  
                  {/* Status badge */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-white bg-black/60 px-2 py-0.5 rounded-full border border-white/10">
                    <span className={`h-2 w-2 rounded-full ${statusStyle[camera.status]}`} />
                    {camera.status}
                  </div>

                  {/* Camera ID */}
                  <span className="absolute right-3 top-3 text-[10px] font-mono text-zinc-400 bg-black/60 px-2 py-0.5 rounded border border-white/10">
                    {camera.id}
                  </span>

                  {/* Live Stream Click Hint */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <span className="text-[11px] font-medium text-white flex items-center gap-1.5 bg-black/80 px-2.5 py-1 rounded-lg border border-white/10">
                      <Eye size={12} className="text-cyan-400" /> Click to View Live Feed
                    </span>
                  </div>
                </div>

                {/* Body Details */}
                <div className="p-4 space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h2 className="text-[14px] font-semibold text-white group-hover:text-cyan-300 transition-colors">
                        {camera.name}
                      </h2>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Zone: <span className="text-zinc-300">{camera.location || 'Primary Sector'}</span>
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[9px] uppercase font-mono px-1.5 py-0 bg-white/5 border-white/10 text-cyan-400">
                      {camera.source_type?.replace(/_/g, ' ') || 'webcam'}
                    </Badge>
                  </div>

                  {/* Metadata line */}
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono bg-zinc-950/60 p-2 rounded-lg border border-white/5">
                    <span>{camera.resolution || '1080p'}</span>
                    <span>•</span>
                    <span>{camera.fps || 30} FPS</span>
                    <span>•</span>
                    <span className="truncate max-w-[120px]" title={camera.stream_url || 'Device 0'}>
                      {camera.stream_url ? `Src: ${camera.stream_url}` : 'Src: Dev 0'}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      disabled={updating === camera.id}
                      onClick={() => handleStatusToggle(camera)}
                      className={`flex-1 py-1.5 text-[11px] font-medium rounded-lg border transition-colors ${
                        camera.status === 'offline'
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                          : 'bg-zinc-900 border-white/10 text-zinc-300 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {camera.status === 'offline' ? 'Mark Online' : 'Take Offline'}
                    </button>
                    <button
                      onClick={() => setPreviewCam(camera)}
                      title="Live Stream Preview"
                      className="p-2 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 hover:bg-cyan-500/20 transition-colors"
                    >
                      <Radio size={13} />
                    </button>
                    <button
                      onClick={() => handleDelete(camera)}
                      title="Remove Camera"
                      className="p-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Add Real Camera Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-900 border border-white/10 rounded-2xl p-6 max-w-lg w-full shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <button
                onClick={() => setShowAddModal(false)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-white p-1 rounded-lg hover:bg-white/5"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-2.5 mb-4">
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <Video size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Add Real Camera Stream</h2>
                  <p className="text-xs text-muted-foreground">Register a local webcam, smartphone stream, or CCTV feed.</p>
                </div>
              </div>

              {/* Source Preset Selector */}
              <div className="grid grid-cols-1 gap-2 mb-4">
                {[
                  { id: 'webcam', label: 'Laptop Webcam', icon: Laptop },
                ].map(item => {
                  const Icon = item.icon;
                  const isSelected = sourceType === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectPreset(item.id as any)}
                      className={`p-2.5 rounded-xl border text-left flex flex-col items-center justify-center gap-1.5 transition-all ${
                        isSelected
                          ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                          : 'bg-zinc-950/60 border-white/5 text-muted-foreground hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <Icon size={18} />
                      <span className="text-[11px] font-semibold text-center">{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Discovered Webcams Banner (if source is webcam) */}
              {sourceType === 'webcam' && (
                <div className="mb-4 p-3 rounded-xl bg-zinc-950/80 border border-cyan-500/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-cyan-300 flex items-center gap-1.5">
                      <Scan size={13} className={scanning ? 'animate-spin' : ''} />
                      Detected Hardware Cameras
                    </span>
                    <button
                      type="button"
                      onClick={handleScanDevices}
                      disabled={scanning}
                      className="text-[10px] text-muted-foreground hover:text-white underline"
                    >
                      {scanning ? 'Scanning...' : 'Re-scan'}
                    </button>
                  </div>
                  {discoveredDevices.length > 0 ? (
                    <div className="space-y-1.5">
                      {discoveredDevices.map(d => (
                        <div key={d.device_index} className="flex items-center justify-between p-2 rounded-lg bg-zinc-900/60 border border-white/5 text-[11px]">
                          <span className="text-white font-medium">{d.name} ({d.resolution})</span>
                          <button
                            type="button"
                            onClick={() => {
                              setStreamUrl(String(d.device_index));
                              setCamName(`Webcam Device #${d.device_index}`);
                            }}
                            className="px-2 py-0.5 bg-cyan-500/20 text-cyan-300 rounded text-[10px] hover:bg-cyan-500/30"
                          >
                            Use Index {d.device_index}
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">
                      Index 0 is selected (Default integrated camera).
                    </p>
                  )}
                </div>
              )}

              {/* Smartphone RTSP Instructions */}
              {sourceType === 'rtsp_phone' && (
                <div className="mb-4 p-3 rounded-xl bg-zinc-950/80 border border-purple-500/20 text-[11px] text-zinc-300 space-y-1">
                  <span className="font-semibold text-purple-300 flex items-center gap-1">
                    📱 Free Phone IP Camera Setup:
                  </span>
                  <p className="text-muted-foreground">1. Install <b>IP Webcam</b> (Android) or <b>EpocCam / Iriun</b>.</p>
                  <p className="text-muted-foreground">2. Connect phone to same Wi-Fi network and start server.</p>
                  <p className="text-muted-foreground">3. Enter the URL shown on phone (e.g. <code>http://192.168.1.X:8080/video</code>).</p>
                </div>
              )}

              {formError && (
                <div className="mb-4 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle size={14} />
                  {formError}
                </div>
              )}

              <form onSubmit={handleCreateCamera} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Camera Name</label>
                  <input
                    type="text"
                    required
                    value={camName}
                    onChange={e => setCamName(e.target.value)}
                    placeholder="e.g. Main Laptop Webcam / Lobby Gate"
                    className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Zone / Sector</label>
                  <input
                    type="text"
                    value={camLocation}
                    onChange={e => setCamLocation(e.target.value)}
                    placeholder="e.g. Sector 4, North Entrance"
                    className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    {sourceType === 'webcam' ? 'Device Index (0 for default webcam, 1 for USB)' : 'Stream URL / File Path'}
                  </label>
                  <input
                    type="text"
                    required
                    value={streamUrl}
                    onChange={e => setStreamUrl(e.target.value)}
                    placeholder={sourceType === 'webcam' ? '0' : 'rtsp://... or http://...'}
                    className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">Resolution</label>
                    <select
                      value={resolution}
                      onChange={e => setResolution(e.target.value)}
                      className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="1080p">1080p (FHD)</option>
                      <option value="720p">720p (HD)</option>
                      <option value="4K">4K (UHD)</option>
                      <option value="480p">480p (SD)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">Target FPS</label>
                    <input
                      type="number"
                      value={fps}
                      onChange={e => setFps(Number(e.target.value))}
                      min={5}
                      max={60}
                      className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div className="pt-3 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white bg-zinc-800 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg shadow-md transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? 'Registering...' : 'Register Camera'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Live Stream Preview Modal */}
      <AnimatePresence>
        {previewCam && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-900 border border-white/15 rounded-2xl overflow-hidden max-w-3xl w-full shadow-2xl relative"
            >
              <div className="p-4 border-b border-white/10 flex items-center justify-between bg-zinc-950">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-sm font-semibold text-white">{previewCam.name}</span>
                  <Badge variant="outline" className="text-[10px] text-cyan-400 font-mono">
                    {previewCam.id}
                  </Badge>
                </div>
                <button
                  onClick={() => setPreviewCam(null)}
                  className="text-muted-foreground hover:text-white p-1 rounded-lg hover:bg-white/5"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Video Player */}
              <div className="aspect-video bg-black relative flex items-center justify-center">
                <img
                  src={getCameraLiveStreamUrl(previewCam.id)}
                  alt={previewCam.name}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    // Fallback to offline message
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                <div className="absolute top-3 right-3 text-[10px] font-mono bg-red-500/80 text-white px-2 py-0.5 rounded font-bold">
                  LIVE MJPEG
                </div>
              </div>

              <div className="p-3 bg-zinc-950 text-xs text-muted-foreground flex items-center justify-between">
                <span>Location: {previewCam.location}</span>
                <span>Resolution: {previewCam.resolution} @ {previewCam.fps} FPS</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}