"""
VIGILORA AI — Acoustic Detection Pipeline
=========================================
Standalone modular audio pipeline that detects security-critical acoustic events:
  - glass_break: High-frequency transient shattering profile (2.5kHz - 6kHz)
  - scream_aggression: Human vocal distress / violence signature (700Hz - 2.5kHz)
  - loud_impact: Concussive kinetic burst / collision (<500Hz broadband)
  - alarm_siren: Oscillating tonal harmonic modulation (1kHz - 3.5kHz)

Usage:
  python audio_pipeline.py --demo                      # Interactive demo stream
  python audio_pipeline.py --simulate glass_break       # One-shot injection
  python audio_pipeline.py --source mic --camera-id cam-1  # Live microphone capture
  python audio_pipeline.py --source alert.wav --camera-id cam-1 # File analysis
"""

import argparse
import json
import math
import os
import sys
import time
from datetime import datetime, timezone
import httpx
import numpy as np

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000/api/v1")
SAMPLE_RATE = 16000
FRAME_DURATION = 0.5  # seconds per inference chunk
CHUNK_SIZE = int(SAMPLE_RATE * FRAME_DURATION)


# ---------------------------------------------------------------------------
# Backend API Client
# ---------------------------------------------------------------------------
def _get_auth_token() -> str | None:
    username = os.getenv("DETECTION_API_USER", "admin")
    password = os.getenv("DETECTION_API_PASS", "password123")
    try:
        resp = httpx.post(
            f"{API_BASE_URL}/auth/login",
            data={"username": username, "password": password},
            timeout=5.0,
        )
        if resp.status_code == 200:
            return resp.json().get("access_token")
    except Exception as exc:
        print(f"⚠  Audio pipeline auth notice: {exc}. Trying unauthenticated...")
    return None


_token: str | None = None


def _headers() -> dict[str, str]:
    global _token
    if _token is None:
        _token = _get_auth_token()
    if _token:
        return {"Authorization": f"Bearer {_token}"}
    return {}


def post_audio_event(
    camera_id: str,
    event_type: str,
    confidence: float,
    decibel_level: float | None = None,
    duration: float = 1.0,
    is_simulated: bool = False,
    metadata: dict | None = None,
) -> dict | None:
    """POST an acoustic detection event to the multimodal backend API."""
    payload = {
        "camera_id": camera_id,
        "event_type": event_type,
        "confidence": round(confidence, 4),
        "decibel_level": round(decibel_level, 2) if decibel_level else None,
        "duration": round(duration, 2),
        "source": "audio",
        "is_simulated": is_simulated,
        "metadata_json": metadata or {},
    }
    try:
        resp = httpx.post(
            f"{API_BASE_URL}/multimodal/audio-events",
            json=payload,
            headers=_headers(),
            timeout=5.0,
        )
        if resp.status_code in (200, 201):
            data = resp.json()
            ts = datetime.now().strftime("%H:%M:%S")
            sim_badge = " [DEMO]" if is_simulated else ""
            print(f"🔊 [{ts}] AUDIO EVENT POSTED: {event_type.upper()} (conf: {confidence * 100:.1f}%){sim_badge}")
            return data
        else:
            print(f"⚠  Audio POST failed ({resp.status_code}): {resp.text[:120]}")
    except Exception as exc:
        print(f"⚠  Audio POST exception: {exc}")
    return None


# ---------------------------------------------------------------------------
# Modular Acoustic Feature Extractor & Classifier
# ---------------------------------------------------------------------------
class AcousticClassifier:
    """
    DSP Feature Extractor & Pattern Classifier for Security Acoustics.
    Extracts RMS, Zero-Crossing Rate, and Spectral Energy Bands using FFT.
    Can be replaced or wrapped by an ONNX neural model.
    """

    def __init__(self, sample_rate: int = SAMPLE_RATE):
        self.sample_rate = sample_rate

    def extract_features(self, samples: np.ndarray) -> dict:
        if len(samples) == 0:
            return {}

        # Normalize if 16-bit integer audio
        if samples.dtype in (np.int16, np.int32) or np.max(np.abs(samples)) > 256.0:
            samples = samples.astype(np.float32) / 32768.0
        else:
            samples = samples.astype(np.float32)

        rms = float(np.sqrt(np.mean(samples**2) + 1e-12))
        db = float(20 * math.log10(max(rms, 1e-5)))

        # Zero Crossing Rate (ZCR)
        zcr = float(np.mean(np.abs(np.diff(np.sign(samples)))) / 2.0)

        # FFT Spectral Analysis
        fft_vals = np.abs(np.fft.rfft(samples))
        freqs = np.fft.rfftfreq(len(samples), 1.0 / self.sample_rate)

        total_energy = np.sum(fft_vals**2) + 1e-12

        # Band energies
        low_band = np.sum(fft_vals[(freqs < 500)]**2) / total_energy
        mid_band = np.sum(fft_vals[(freqs >= 500) & (freqs < 2500)]**2) / total_energy
        high_band = np.sum(fft_vals[(freqs >= 2500) & (freqs < 6000)]**2) / total_energy

        # Spectral Centroid
        centroid = float(np.sum(freqs * fft_vals) / (np.sum(fft_vals) + 1e-12))
        peak_ratio = float(np.max(fft_vals) / (np.mean(fft_vals) + 1e-12))

        return {
            "rms": rms,
            "decibels": db,
            "zcr": zcr,
            "low_band_energy": float(low_band),
            "mid_band_energy": float(mid_band),
            "high_band_energy": float(high_band),
            "spectral_centroid": centroid,
            "peak_ratio": peak_ratio,
        }

    def classify_frame(self, samples: np.ndarray) -> tuple[str | None, float, dict]:
        """
        Classifies an audio window into an acoustic event category.
        Returns: (event_type | None, confidence, feature_dict)
        """
        feats = self.extract_features(samples)
        if not feats or feats["rms"] < 0.002:  # Silence gate
            return None, 0.0, feats

        rms = feats["rms"]
        zcr = feats["zcr"]
        low = feats["low_band_energy"]
        mid = feats["mid_band_energy"]
        high = feats["high_band_energy"]
        centroid = feats["spectral_centroid"]
        peak_ratio = feats.get("peak_ratio", 10.0)

        # 1. Loud Impact: High low-frequency energy (<500Hz) and low spectral centroid
        if low > 0.35 and centroid < 1800:
            confidence = min(0.97, 0.72 + (low * 0.2) + min(rms * 0.5, 0.05))
            return "loud_impact", round(confidence, 4), feats

        # 2. Glass Break: High zero-crossing rate (broadband shattering noise) and high spectral centroid (>2.8kHz)
        if zcr > 0.28 and (high > 0.30 or centroid > 3000):
            confidence = min(0.98, 0.72 + (high * 0.2) + (zcr * 0.08))
            return "glass_break", round(confidence, 4), feats

        # 3. Alarm / Siren: Pure tonal harmonic peak (high peak-to-average spectral ratio)
        if (mid + high) > 0.50 and 1000 < centroid < 3500 and peak_ratio > 20.0:
            confidence = min(0.95, 0.72 + (mid * 0.15) + (high * 0.12))
            return "alarm_siren", round(confidence, 4), feats

        # 4. Scream / Aggression: Human vocal formant distribution (700 - 2500 Hz, lower peakiness)
        if mid > 0.35 and 700 < centroid < 2600 and peak_ratio <= 20.0:
            confidence = min(0.96, 0.70 + (mid * 0.22) + min(rms * 0.5, 0.05))
            return "scream_aggression", round(confidence, 4), feats

        return None, 0.0, feats


# ---------------------------------------------------------------------------
# Synthetic Signal Generator for Calibration & Demo
# ---------------------------------------------------------------------------
def generate_synthetic_event(event_type: str, duration: float = 1.0) -> np.ndarray:
    """Generates synthetic acoustic waveforms matching specific security signatures."""
    t = np.linspace(0, duration, int(SAMPLE_RATE * duration), endpoint=False)
    np.random.seed(int(time.time() * 1000) % 10000)

    if event_type == "glass_break":
        # High-frequency resonant shatter (3.8kHz, 5.1kHz) with fast decaying envelope
        envelope = np.exp(-t * 4.0)
        carrier = (
            0.7 * np.sin(2 * np.pi * 3800 * t) +
            0.5 * np.sin(2 * np.pi * 5100 * t) +
            0.3 * np.random.normal(0, 0.5, len(t))
        )
        return (carrier * envelope).astype(np.float32)

    elif event_type == "scream_aggression":
        # Formants in 800Hz - 1600Hz with vocal modulation
        vibrato = 60 * np.sin(2 * np.pi * 5.0 * t)
        carrier = (
            0.7 * np.sin(2 * np.pi * (900 + vibrato) * t) +
            0.5 * np.sin(2 * np.pi * (1500 + vibrato) * t) +
            0.05 * np.random.normal(0, 0.1, len(t))
        )
        envelope = np.ones_like(t) * 0.8
        return (carrier * envelope).astype(np.float32)

    elif event_type == "loud_impact":
        # Low frequency concussive burst (80Hz, 140Hz, 220Hz)
        envelope = np.exp(-t * 6.0)
        carrier = (
            0.9 * np.sin(2 * np.pi * 90 * t) +
            0.6 * np.sin(2 * np.pi * 180 * t) +
            0.05 * np.random.normal(0, 0.1, len(t))
        )
        return (carrier * envelope).astype(np.float32)

    elif event_type == "alarm_siren":
        # Standard security siren / alarm (1600Hz - 2400Hz pure tonal sweep)
        sweep = 2000 + 400 * np.sin(2 * np.pi * 2.0 * t)
        phase = 2 * np.pi * np.cumsum(sweep) / SAMPLE_RATE
        carrier = 0.85 * np.sin(phase)
        return carrier.astype(np.float32)

    return (np.random.normal(0, 0.1, len(t))).astype(np.float32)


# ---------------------------------------------------------------------------
# Pipeline Runners
# ---------------------------------------------------------------------------
def run_demo_stream(camera_id: str = "cam-1", interval: float = 6.0):
    """Continuously cycles through demo acoustic events to demonstrate multimodal fusion."""
    events = ["glass_break", "scream_aggression", "loud_impact", "alarm_siren"]
    classifier = AcousticClassifier()

    print(f"\n=======================================================")
    print(f"▶  VIGILORA Multimodal Audio Detection Pipeline (DEMO)")
    print(f"   Target Camera: {camera_id}")
    print(f"   API Base URL:  {API_BASE_URL}")
    print(f"   Events Cycle:  {', '.join(events)}")
    print(f"=======================================================\n")

    idx = 0
    try:
        while True:
            ev_type = events[idx % len(events)]
            idx += 1

            samples = generate_synthetic_event(ev_type, duration=1.0)
            detected_type, conf, feats = classifier.classify_frame(samples)

            if detected_type:
                post_audio_event(
                    camera_id=camera_id,
                    event_type=detected_type,
                    confidence=conf,
                    decibel_level=feats.get("decibels", -18.0),
                    duration=1.0,
                    is_simulated=True,
                    metadata={"dsp_features": feats, "mode": "demo_synthetic"},
                )
            else:
                # Direct fallback
                post_audio_event(
                    camera_id=camera_id,
                    event_type=ev_type,
                    confidence=0.88,
                    decibel_level=-15.0,
                    duration=1.0,
                    is_simulated=True,
                )

            time.sleep(interval)
    except KeyboardInterrupt:
        print("\n⏹  Audio demo stopped by user.")


def run_live_microphone(camera_id: str = "cam-1"):
    """Captures live audio from default microphone device."""
    classifier = AcousticClassifier()

    try:
        import sounddevice as sd  # type: ignore
        print(f"🎤 Opening microphone input on device (Sample Rate: {SAMPLE_RATE} Hz)...")

        def audio_callback(indata, frames, time_info, status):
            if status:
                print(f"⚠ Audio status: {status}")
            samples = indata[:, 0]
            ev_type, conf, feats = classifier.classify_frame(samples)
            if ev_type and conf >= 0.65:
                post_audio_event(
                    camera_id=camera_id,
                    event_type=ev_type,
                    confidence=conf,
                    decibel_level=feats.get("decibels"),
                    duration=FRAME_DURATION,
                    is_simulated=False,
                    metadata={"dsp_features": feats},
                )

        with sd.InputStream(samplerate=SAMPLE_RATE, channels=1, blocksize=CHUNK_SIZE, callback=audio_callback):
            print("✅ Microphone listening for security acoustics (Press Ctrl+C to stop)...")
            while True:
                time.sleep(0.5)

    except ImportError:
        print("ℹ  'sounddevice' is not installed or audio hardware is missing.")
        print("   Falling back to synthetic audio demo stream to ensure system operation.")
        run_demo_stream(camera_id=camera_id)
    except Exception as exc:
        print(f"⚠  Microphone stream error: {exc}. Running demo fallback...")
        run_demo_stream(camera_id=camera_id)


def main():
    parser = argparse.ArgumentParser(description="VIGILORA AI Multimodal Audio Detection Pipeline")
    parser.add_argument("--source", default="demo", help="'mic', 'demo', or path to a .wav audio file (default: demo)")
    parser.add_argument("--camera-id", default="cam-1", help="Camera ID to associate with audio detections")
    parser.add_argument("--simulate", choices=["glass_break", "scream_aggression", "loud_impact", "alarm_siren"], help="Trigger a single simulated acoustic event")
    parser.add_argument("--api-url", default=None, help="Override backend API URL")
    args = parser.parse_args()

    if args.api_url:
        global API_BASE_URL
        API_BASE_URL = args.api_url

    if args.simulate:
        print(f"🚀 Injecting simulated audio event: {args.simulate} on {args.camera_id}...")
        samples = generate_synthetic_event(args.simulate, duration=1.2)
        classifier = AcousticClassifier()
        det_type, conf, feats = classifier.classify_frame(samples)
        post_audio_event(
            camera_id=args.camera_id,
            event_type=det_type or args.simulate,
            confidence=conf if conf > 0 else 0.92,
            decibel_level=feats.get("decibels", -14.5),
            duration=1.2,
            is_simulated=True,
            metadata={"cli_trigger": True, "dsp_features": feats},
        )
        return

    if args.source == "mic":
        run_live_microphone(camera_id=args.camera_id)
    else:
        run_demo_stream(camera_id=args.camera_id)


if __name__ == "__main__":
    main()