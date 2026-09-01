import React, { useState, useEffect, useRef } from 'react';
import {
  Eye, Upload, Shield, AlertTriangle, CheckCircle2, Flame, User,
  Package, Car, Activity, Clock, Download, RefreshCw, Copy, Check,
  Camera, Zap, Layers, Sparkles, FileText, ArrowRight, CornerDownRight,
  ShieldAlert, Radio, HelpCircle, X, ChevronRight, Sliders
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  analyzeVisionFrame,
  fetchVisionScenarios,
  fetchVisionIncidents,
  saveVisionIncident,
  VisionAnalysisResponse,
  VisionScenario,
  VisionIncidentRecord,
} from '@/services/api/vision';

export function VisionAIPage() {
  const [scenarios, setScenarios] = useState<VisionScenario[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [cameraName, setCameraName] = useState('Camera 04 (Main Security)');
  const [sector, setSector] = useState('Sector 7 (Perimeter)');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<VisionAnalysisResponse | null>(null);
  const [isScenarioModalOpen, setIsScenarioModalOpen] = useState(false);
  const [incidentHistory, setIncidentHistory] = useState<VisionIncidentRecord[]>([]);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadScenarios();
    loadIncidentHistory();
  }, []);

  const loadScenarios = async () => {
    try {
      const data = await fetchVisionScenarios();
      setScenarios(data);
    } catch (e) {
      console.error('Failed to load scenarios', e);
    }
  };

  const loadIncidentHistory = async () => {
    try {
      const data = await fetchVisionIncidents();
      setIncidentHistory(data);
    } catch (e) {
      console.error('Failed to load history', e);
    }
  };

  const handleFileSelect = (file: File) => {
    setErrorMessage(null);
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setErrorMessage('Invalid file format. Please upload a PNG, JPG, JPEG, or WEBP image.');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setErrorMessage('File size exceeds 15 MB limit.');
      return;
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setAnalysisResult(null);
    setIsSaved(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleClear = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setAnalysisResult(null);
    setErrorMessage(null);
    setIsSaved(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSelectScenario = (sc: VisionScenario) => {
    setSelectedFile(null);
    setPreviewUrl(sc.image_url);
    setCameraName(sc.camera_name);
    setSector(sc.sector);
    setAnalysisResult(null);
    setIsSaved(false);
    setErrorMessage(null);
    setIsScenarioModalOpen(false);
  };

  const handleAnalyze = async () => {
    if (!previewUrl) return;

    setIsAnalyzing(true);
    setErrorMessage(null);
    setAnalysisStep(1);

    const t1 = setTimeout(() => setAnalysisStep(2), 400);
    const t2 = setTimeout(() => setAnalysisStep(3), 850);
    const t3 = setTimeout(() => setAnalysisStep(4), 1300);
    const t4 = setTimeout(() => setAnalysisStep(5), 1700);

    try {
      const matchingScenario = scenarios.find(s => s.image_url === previewUrl);
      const scenarioId = matchingScenario ? matchingScenario.id : undefined;

      const result = await analyzeVisionFrame(
        selectedFile || undefined,
        scenarioId,
        cameraName,
        sector
      );

      setTimeout(() => {
        setAnalysisResult(result);
        setIsAnalyzing(false);
        setAnalysisStep(0);
      }, 2000);
    } catch (err: any) {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      setIsAnalyzing(false);
      setAnalysisStep(0);
      setErrorMessage(err.message || 'Vision analysis failed. Please try again.');
    }
  };

  const handleSave = async () => {
    if (!analysisResult) return;
    setIsSaving(true);
    try {
      await saveVisionIncident(analysisResult);
      setIsSaved(true);
      await loadIncidentHistory();
    } catch (e: any) {
      setErrorMessage(e.message || 'Failed to save incident dossier');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyReport = () => {
    if (!analysisResult) return;
    const reportText = `======================================================
VIGILORA AI // SECURITY INCIDENT REPORT
======================================================
Incident ID: ${analysisResult.analysis_id}
Threat Level: ${analysisResult.threat_level} (${analysisResult.threat_score}%)
Confidence: ${(analysisResult.confidence * 100).toFixed(0)}%
Detection Time: ${analysisResult.timestamp}
Camera: ${analysisResult.camera_name}
Sector: ${analysisResult.sector}

EXECUTIVE SUMMARY:
${analysisResult.summary}

VISUAL OBSERVATIONS:
${analysisResult.visual_observations.map(o => `• ${o}`).join('\n')}

THREAT ASSESSMENT:
${analysisResult.threats.map(t => `[${t.severity}] ${t.type.toUpperCase()}: ${t.description}`).join('\n') || 'None'}

RECOMMENDED RESPONSE:
${analysisResult.recommended_actions.map((a, i) => `${i + 1}. ${a}`).join('\n')}
======================================================`;

    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReopenIncident = (rec: VisionIncidentRecord) => {
    setAnalysisResult({
      analysis_id: rec.id,
      camera_name: rec.camera_name,
      sector: rec.sector,
      threat_level: rec.threat_level as any,
      threat_score: rec.threat_score,
      confidence: rec.confidence,
      summary: rec.summary,
      incident_title: rec.incident_title,
      incident_description: rec.incident_description || '',
      detected_objects: rec.detected_objects_json || [],
      threats: rec.threats_json || [],
      location_context: `${rec.sector} — ${rec.camera_name}`,
      visual_observations: rec.visual_observations_json || [],
      recommended_actions: rec.recommended_actions_json || [],
      image_url: rec.image_url,
      timestamp: rec.created_at || 'Recorded Archive',
      is_demo_mode: rec.is_demo_mode,
      model_provider: 'VIGILORA Incident Vault',
    });
    if (rec.image_url) {
      setPreviewUrl(rec.image_url);
    }
    setIsSaved(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getSeverityBadgeClass = (sev: string) => {
    switch (sev) {
      case 'CRITICAL':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'HIGH':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'MEDIUM':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'LOW':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default:
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    }
  };

  const getObjectIcon = (category?: string, label?: string) => {
    const l = (label || '').toLowerCase();
    if (l.includes('person') || l.includes('intruder') || l.includes('group')) return <User size={14} className="text-cyan-400" />;
    if (l.includes('flame') || l.includes('fire') || l.includes('smoke')) return <Flame size={14} className="text-red-400" />;
    if (l.includes('backpack') || l.includes('bag') || l.includes('package')) return <Package size={14} className="text-amber-400" />;
    if (l.includes('vehicle') || l.includes('car') || l.includes('truck')) return <Car size={14} className="text-blue-400" />;
    return <Layers size={14} className="text-zinc-400" />;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/5 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 tracking-wide">
              <Eye size={12} className="animate-pulse" /> VISION ENGINE ONLINE
            </span>
            {analysisResult?.is_demo_mode && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/30">
                ● DEMO PRESET MODE
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <ShieldAlert className="text-cyan-400" size={24} />
            VISION AI — Multimodal Threat Analysis
          </h1>
          <p className="text-muted-foreground text-[13px] mt-1">
            Analyze security-camera frames using AI-powered visual threat detection and automated incident reporting.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => setIsScenarioModalOpen(true)}
            className="flex items-center gap-2 px-3.5 h-9 bg-zinc-900 border border-cyan-500/30 hover:border-cyan-500/60 rounded-lg text-xs font-semibold text-cyan-300 hover:bg-cyan-950/30 transition-all shadow-sm"
          >
            <Sparkles size={14} /> Load Demo Scenario
          </button>
          {previewUrl && (
            <button
              onClick={handleClear}
              className="flex items-center gap-1.5 px-3 h-9 bg-zinc-900 border border-white/10 hover:bg-white/5 rounded-lg text-xs text-muted-foreground hover:text-white transition-all"
            >
              <X size={14} /> Clear
            </button>
          )}
        </div>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/40 text-red-200 text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <AlertTriangle size={16} className="text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-white">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-zinc-950 border border-white/10 rounded-2xl p-4 relative overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/5 text-[11px] font-mono">
              <div className="flex items-center gap-2 text-zinc-300">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <span className="font-semibold text-white">{cameraName}</span>
              </div>
              <div className="text-cyan-400/90 font-medium">
                {sector}
              </div>
            </div>

            {!previewUrl ? (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 min-h-[340px] ${
                  isDragging
                    ? 'border-cyan-400 bg-cyan-950/20'
                    : 'border-white/10 hover:border-cyan-500/40 bg-zinc-900/30'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                />
                <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4 shadow-inner">
                  <Upload size={24} />
                </div>
                <div className="text-sm font-bold text-white uppercase tracking-wider mb-1">
                  Drop Security Camera Frame
                </div>
                <p className="text-xs text-muted-foreground mb-4 max-w-[260px]">
                  Upload CCTV snapshot for AI visual threat analysis
                </p>
                <span className="px-3 py-1 rounded-md bg-white/5 text-[10px] font-mono text-zinc-400 border border-white/5 mb-4">
                  PNG • JPG • JPEG • WEBP (Max 15MB)
                </span>
                <button
                  type="button"
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-cyan-600/20 transition-all"
                >
                  Select Camera Image
                </button>
              </div>
            ) : (
              <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-white/10 group">
                <img
                  src={previewUrl}
                  alt="Surveillance Feed"
                  className="w-full h-full object-contain"
                />

                {isAnalyzing && (
                  <motion.div
                    initial={{ top: '0%' }}
                    animate={{ top: '100%' }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                    className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#22d3ee] z-20"
                  />
                )}

                {analysisResult && !isAnalyzing && analysisResult.detected_objects.map((obj, idx) => {
                  if (!obj.bbox || obj.bbox.length < 4) return null;
                  const [y1, x1, y2, x2] = [obj.bbox[1] / 7.2, obj.bbox[0] / 12.8, obj.bbox[3] / 7.2, obj.bbox[2] / 12.8];
                  return (
                    <div
                      key={idx}
                      style={{
                        top: `${Math.min(y1, 80)}%`,
                        left: `${Math.min(x1, 80)}%`,
                        width: `${Math.max(15, Math.abs(x2 - x1))}%`,
                        height: `${Math.max(15, Math.abs(y2 - y1))}%`,
                      }}
                      className="absolute border-2 border-cyan-400/80 bg-cyan-500/10 rounded pointer-events-none z-10"
                    >
                      <span className="absolute -top-5 left-0 px-1.5 py-0.5 bg-black/80 text-[9px] font-mono text-cyan-300 rounded border border-cyan-400/40 uppercase">
                        {obj.label} {(obj.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  );
                })}

                <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-cyan-400/80 pointer-events-none" />
                <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-cyan-400/80 pointer-events-none" />
                <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-cyan-400/80 pointer-events-none" />
                <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-cyan-400/80 pointer-events-none" />

                <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/70 rounded backdrop-blur text-[10px] font-mono text-zinc-300 border border-white/10">
                  {new Date().toISOString().replace('T', ' ').slice(0, 19)} UTC
                </div>
                <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/70 rounded backdrop-blur text-[10px] font-mono text-cyan-300 border border-white/10">
                  {isAnalyzing ? '● PROCESSING' : '● ANALYSIS READY'}
                </div>
              </div>
            )}

            {previewUrl && (
              <div className="mt-4 pt-3 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-[11px] text-muted-foreground">
                  {selectedFile ? `File: ${selectedFile.name}` : 'Demo Scenario Loaded'}
                </div>
                <button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {isAnalyzing ? (
                    <>
                      <Activity className="animate-spin" size={15} />
                      Analyzing Security Frame...
                    </>
                  ) : (
                    <>
                      <Zap size={15} />
                      Analyze Threat
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {isAnalyzing && (
            <div className="p-4 rounded-2xl bg-zinc-950 border border-cyan-500/30 shadow-2xl space-y-2.5 animate-in fade-in">
              <div className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                <Activity size={14} className="animate-pulse" />
                Vision Engine Analysis Sequence
              </div>
              <div className="space-y-1.5 text-xs font-mono">
                <div className={`flex items-center gap-2 ${analysisStep >= 1 ? 'text-emerald-400' : 'text-zinc-600'}`}>
                  {analysisStep > 1 ? <CheckCircle2 size={13} /> : <span className="w-3.5 text-center">●</span>}
                  Image frame received & validated
                </div>
                <div className={`flex items-center gap-2 ${analysisStep >= 2 ? 'text-emerald-400' : 'text-zinc-600'}`}>
                  {analysisStep > 2 ? <CheckCircle2 size={13} /> : <span className="w-3.5 text-center">●</span>}
                  Optical luminance & visual contours extracted
                </div>
                <div className={`flex items-center gap-2 ${analysisStep >= 3 ? 'text-emerald-400' : 'text-zinc-600'}`}>
                  {analysisStep > 3 ? <CheckCircle2 size={13} /> : <span className="w-3.5 text-center">●</span>}
                  Detecting security objects & spatial anomalies
                </div>
                <div className={`flex items-center gap-2 ${analysisStep >= 4 ? 'text-emerald-400' : 'text-zinc-600'}`}>
                  {analysisStep > 4 ? <CheckCircle2 size={13} /> : <span className="w-3.5 text-center">●</span>}
                  Evaluating threat severity score & MITRE vector
                </div>
                <div className={`flex items-center gap-2 ${analysisStep >= 5 ? 'text-emerald-400' : 'text-zinc-600'}`}>
                  {analysisStep >= 5 ? <CheckCircle2 size={13} /> : <span className="w-3.5 text-center">○</span>}
                  Synthesizing executive incident dossier
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-6 space-y-4">
          {analysisResult ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="p-5 rounded-2xl bg-zinc-950 border border-white/10 shadow-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Threat Assessment
                    </span>
                    <div className="text-lg font-bold text-white flex items-center gap-2.5">
                      <Badge variant="outline" className={`text-xs px-2.5 py-0.5 font-bold uppercase ${getSeverityBadgeClass(analysisResult.threat_level)}`}>
                        {analysisResult.threat_level} SEVERITY
                      </Badge>
                      <span className="text-xs text-zinc-400 font-mono">
                        {(analysisResult.confidence * 100).toFixed(0)}% Confidence
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-2xl font-black font-mono text-cyan-400">
                      {analysisResult.threat_score.toFixed(1)}%
                    </div>
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase">Threat Score</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="w-full h-2.5 bg-zinc-900 rounded-full overflow-hidden border border-white/5">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${analysisResult.threat_score}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className={`h-full rounded-full ${
                        analysisResult.threat_level === 'CRITICAL'
                          ? 'bg-gradient-to-r from-orange-500 to-red-500'
                          : analysisResult.threat_level === 'HIGH'
                          ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                          : analysisResult.threat_level === 'MEDIUM'
                          ? 'bg-gradient-to-r from-cyan-500 to-amber-500'
                          : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                      }`}
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-2">
                    Detected Visual Entities
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {analysisResult.detected_objects.map((obj, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-zinc-900/80 border border-white/5 text-xs text-zinc-200"
                      >
                        {getObjectIcon(obj.category, obj.label)}
                        <span className="font-medium capitalize">{obj.label.replace('_', ' ')}</span>
                        <span className="font-mono text-[10px] text-cyan-400 font-bold">
                          {(obj.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    ))}
                    {analysisResult.detected_objects.length === 0 && (
                      <span className="text-xs text-muted-foreground italic">No distinct objects cataloged</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-zinc-950 border border-white/10 shadow-2xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-cyan-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      AI Incident Investigation Dossier
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400">
                    ID: {analysisResult.analysis_id}
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                    1. Executive Summary
                  </span>
                  <p className="text-xs text-zinc-300 leading-relaxed bg-zinc-900/40 p-3 rounded-xl border border-white/5">
                    {analysisResult.summary}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                    2. Visual Observations
                  </span>
                  <ul className="space-y-1 text-xs text-zinc-300">
                    {analysisResult.visual_observations.map((obs, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-cyan-400 mt-0.5">•</span>
                        <span>{obs}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Shield size={13} /> 3. Recommended Operator Response
                  </span>
                  <ol className="space-y-1.5 text-xs text-zinc-200">
                    {analysisResult.recommended_actions.map((act, idx) => (
                      <li key={idx} className="flex items-start gap-2 bg-cyan-950/20 border border-cyan-500/20 p-2 rounded-lg">
                        <span className="font-mono font-bold text-cyan-400">{idx + 1}.</span>
                        <span>{act}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-3">
                  <button
                    onClick={handleCopyReport}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/10 hover:bg-white/5 text-xs text-zinc-300 hover:text-white transition-all"
                  >
                    {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                    {copied ? 'Copied' : 'Copy Report'}
                  </button>

                  <button
                    onClick={handleSave}
                    disabled={isSaved || isSaving}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold shadow-lg transition-all ${
                      isSaved
                        ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-600/20'
                    }`}
                  >
                    {isSaving ? (
                      <>
                        <Activity className="animate-spin" size={14} /> Saving...
                      </>
                    ) : isSaved ? (
                      <>
                        <CheckCircle2 size={14} /> Incident Saved to Vault
                      </>
                    ) : (
                      <>
                        <Shield size={14} /> Save Incident Dossier
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[420px] rounded-2xl bg-zinc-950/60 border border-white/5 flex flex-col items-center justify-center p-8 text-center text-muted-foreground space-y-3">
              <Eye size={36} className="text-cyan-400/40 animate-pulse" />
              <div className="text-sm font-bold text-zinc-300">No Active Analysis</div>
              <p className="text-xs max-w-[280px]">
                Select a demo scenario or upload a surveillance camera snapshot to trigger multimodal threat detection.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="p-5 rounded-2xl bg-zinc-950 border border-white/10 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-cyan-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Vision Incident History Vault
            </span>
          </div>
          <Badge variant="outline" className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 border-cyan-500/30">
            {incidentHistory.length} Recorded Dossiers
          </Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-[11px] font-semibold text-muted-foreground uppercase">
                <th className="px-3 py-2.5">Incident ID</th>
                <th className="px-3 py-2.5">Severity</th>
                <th className="px-3 py-2.5">Location</th>
                <th className="px-3 py-2.5">Executive Summary</th>
                <th className="px-3 py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {incidentHistory.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-xs text-muted-foreground">
                    No vision incident dossiers recorded yet. Analyze and save a security frame above.
                  </td>
                </tr>
              ) : (
                incidentHistory.map((rec) => (
                  <tr key={rec.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-3 py-3 font-mono text-xs font-bold text-zinc-300">
                      {rec.id}
                    </td>
                    <td className="px-3 py-3">
                      <Badge variant="outline" className={`text-[10px] uppercase font-bold ${getSeverityBadgeClass(rec.threat_level)}`}>
                        {rec.threat_level} ({rec.threat_score.toFixed(0)}%)
                      </Badge>
                    </td>
                    <td className="px-3 py-3 text-xs text-zinc-300">
                      <div>{rec.sector}</div>
                      <div className="text-[10px] text-muted-foreground">{rec.camera_name}</div>
                    </td>
                    <td className="px-3 py-3 text-xs text-zinc-400 max-w-xs truncate">
                      {rec.summary}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <button
                        onClick={() => handleReopenIncident(rec)}
                        className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-[11px] font-medium text-cyan-300 hover:text-white transition-all"
                      >
                        Reopen
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isScenarioModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
            >
              <div className="p-4 border-b border-white/10 flex justify-between items-center bg-zinc-900/60">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-cyan-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Select Live Demo Scenario
                  </h3>
                </div>
                <button
                  onClick={() => setIsScenarioModalOpen(false)}
                  className="text-muted-foreground hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[70vh] overflow-y-auto">
                {scenarios.map((sc) => (
                  <div
                    key={sc.id}
                    onClick={() => handleSelectScenario(sc)}
                    className="p-3.5 rounded-xl bg-zinc-900/50 hover:bg-zinc-900 border border-white/5 hover:border-cyan-500/50 cursor-pointer transition-all space-y-2 group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-cyan-400 font-semibold uppercase">
                        {sc.category}
                      </span>
                      <Badge variant="outline" className={`text-[9px] uppercase ${getSeverityBadgeClass(sc.threat_level)}`}>
                        {sc.threat_level}
                      </Badge>
                    </div>
                    <h4 className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                      {sc.title}
                    </h4>
                    <p className="text-[11px] text-muted-foreground line-clamp-2">
                      {sc.description}
                    </p>
                    <div className="text-[10px] font-mono text-zinc-500 pt-1 border-t border-white/5 flex justify-between">
                      <span>{sc.sector}</span>
                      <span>{sc.camera_name}</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
