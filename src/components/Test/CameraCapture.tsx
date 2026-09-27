import React, { useRef, useState, useCallback } from 'react';
import { Camera, Upload, FlipHorizontal, RefreshCcw, Check, AlertCircle, Zap } from 'lucide-react';

interface DetectionStatus {
  referenceCard: boolean;
  testRegion: boolean;
  lighting: boolean;
  sharpness: boolean;
  alignment: boolean;
}

interface CameraCaptureProps {
  onCapture: (dataUrl: string | null) => void;
  demoMode?: boolean;
}

// Demo placeholder colours for the simulated camera view
const DEMO_TEST_COLOR = '#8E44AD'; // purple = positive reaction

export function CameraCapture({ onCapture, demoMode = true }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<'demo' | 'camera' | 'upload'>('demo');
  const [cameraActive, setCameraActive] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [detected, setDetected] = useState<DetectionStatus>({
    referenceCard: false, testRegion: false, lighting: false, sharpness: false, alignment: false,
  });
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const [readyToCapture, setReadyToCapture] = useState(false);

  // Simulate detection sequence
  const simulateDetection = useCallback(async () => {
    setDetecting(true);
    setDetected({ referenceCard: false, testRegion: false, lighting: false, sharpness: false, alignment: false });

    const checks: (keyof DetectionStatus)[] = ['referenceCard', 'testRegion', 'lighting', 'sharpness', 'alignment'];
    for (const key of checks) {
      await new Promise(r => setTimeout(r, 350 + Math.random() * 200));
      setDetected(prev => ({ ...prev, [key]: true }));
    }
    setDetecting(false);
    setReadyToCapture(true);
  }, []);

  const startCamera = async () => {
    setMode('camera');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
        await simulateDetection();
      }
    } catch {
      setMode('demo');
      alert('Camera not available. Using demo mode.');
    }
  };

  const stopCamera = () => {
    const stream = videoRef.current?.srcObject as MediaStream;
    stream?.getTracks().forEach(t => t.stop());
    setCameraActive(false);
    setMode('demo');
  };

  const captureFromCamera = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d')!;
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    ctx.drawImage(videoRef.current, 0, 0);
    const url = canvasRef.current.toDataURL('image/jpeg', 0.9);
    setCapturedUrl(url);
    stopCamera();
    onCapture(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const url = ev.target?.result as string;
      setCapturedUrl(url);
      onCapture(url);
    };
    reader.readAsDataURL(file);
    setMode('upload');
    setDetected({ referenceCard: true, testRegion: true, lighting: true, sharpness: true, alignment: true });
    setReadyToCapture(true);
  };

  const useDemoCapture = async () => {
    setMode('demo');
    setDetected({ referenceCard: false, testRegion: false, lighting: false, sharpness: false, alignment: false });
    setReadyToCapture(false);
    await simulateDetection();
    onCapture('DEMO_CAPTURE'); // sentinel = demo mode; pipeline uses simulated data
  };

  const reset = () => {
    stopCamera();
    setCapturedUrl(null);
    setDetected({ referenceCard: false, testRegion: false, lighting: false, sharpness: false, alignment: false });
    setReadyToCapture(false);
    onCapture(null);
    setMode('demo');
  };

  if (capturedUrl) {
    return (
      <div className="space-y-4">
        <div className="relative rounded-xl overflow-hidden border border-emerald-600/30 bg-black">
          <img src={capturedUrl} alt="Captured test" className="w-full object-contain max-h-64" />
          <div className="absolute top-2 right-2 px-2 py-1 rounded bg-emerald-900/80 text-emerald-300 text-xs font-mono flex items-center gap-1">
            <Check className="w-3 h-3" /> CAPTURED
          </div>
        </div>
        <button onClick={reset} className="btn-secondary text-sm">
          <RefreshCcw className="w-4 h-4" /> Retake Image
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Camera view area */}
      <div className="relative rounded-xl overflow-hidden border border-slate-700/60 bg-black aspect-video max-h-64">
        {mode === 'camera' && cameraActive ? (
          <>
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            {/* Corner overlays */}
            <div className="absolute inset-4">
              <div className="relative w-full h-full">
                <div className="corner-tl" /><div className="corner-tr" />
                <div className="corner-bl" /><div className="corner-br" />
                {detecting && <div className="scan-line" />}
                {/* Reference card zone */}
                <div className="absolute top-[5%] left-[5%] w-[30%] h-[40%] border border-dashed border-indigo-400/50 rounded">
                  <div className="absolute -top-4 left-0 text-[9px] text-indigo-400 font-mono">REF CARD</div>
                </div>
                {/* Test region zone */}
                <div className="absolute top-[20%] right-[10%] w-[35%] h-[45%] border border-dashed border-emerald-400/50 rounded">
                  <div className="absolute -top-4 left-0 text-[9px] text-emerald-400 font-mono">TEST REGION</div>
                </div>
              </div>
            </div>
          </>
        ) : mode === 'demo' ? (
          /* Simulated camera frame */
          <div className="absolute inset-0 flex items-center justify-center bg-[#0d1117]">
            <div className="relative w-full h-full">
              {/* Simulated scene */}
              <div className="absolute inset-6 rounded-lg bg-[#1a1a2e] flex items-center justify-center">
                <div className="absolute left-4 top-4 w-24 h-16 bg-[#2a2a4a] rounded border border-slate-600 flex flex-col items-center justify-center gap-1 text-[9px] text-slate-400 font-mono">
                  <div className="text-[8px] text-slate-500">REF CARD</div>
                  {/* Colour patches */}
                  <div className="flex gap-1">
                    {['#F5F5F0', '#9E9E9E', '#424242', '#C62828', '#1565C0'].map((c, i) => (
                      <div key={i} className="w-3 h-3 rounded" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>
                {/* Reaction vial */}
                <div className="w-16 h-24 rounded-full border-2 border-slate-600 overflow-hidden flex flex-col items-center justify-end p-1"
                  style={{ background: 'linear-gradient(to bottom, #1a1a2e 30%, ' + DEMO_TEST_COLOR + ')' }}>
                  <div className="text-[8px] text-slate-300 font-mono">VIAL</div>
                </div>
              </div>

              {/* Corner overlays */}
              <div className="absolute inset-0">
                <div className="corner-tl" /><div className="corner-tr" />
                <div className="corner-bl" /><div className="corner-br" />
                {detecting && <div className="scan-line" />}
              </div>

              {/* Demo badge */}
              <div className="absolute top-2 left-2 text-[10px] font-mono text-amber-400/60 bg-amber-900/20 px-2 py-0.5 rounded">
                DEMO PREVIEW
              </div>
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-slate-600">
            <Camera className="w-12 h-12" />
          </div>
        )}

        {/* Canvas (hidden) for capture */}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Detection status */}
      <div className="grid grid-cols-5 gap-2">
        {(Object.entries(detected) as [keyof DetectionStatus, boolean][]).map(([key, val]) => (
          <div key={key}
            className={`flex flex-col items-center gap-1 px-2 py-1.5 rounded text-center transition-all duration-300 ${
              val ? 'bg-emerald-900/20 border border-emerald-700/30' : 'bg-slate-800/30 border border-slate-700/30'
            }`}
          >
            {val
              ? <Check className="w-3 h-3 text-emerald-400" />
              : detecting
              ? <div className="w-3 h-3 border border-slate-600 rounded-full border-t-blue-400 spinner" />
              : <div className="w-3 h-3 rounded-full border border-slate-700" />
            }
            <span className={`text-[9px] font-mono leading-tight ${val ? 'text-emerald-400' : 'text-slate-600'}`}>
              {key === 'referenceCard' ? 'Ref Card' :
               key === 'testRegion' ? 'Test Region' :
               key === 'lighting' ? 'Lighting' :
               key === 'sharpness' ? 'Sharpness' : 'Alignment'}
            </span>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        {!cameraActive ? (
          <>
            <button onClick={useDemoCapture} className="btn-primary text-sm flex-1">
              <Zap className="w-4 h-4" />
              Use Demo Capture
            </button>
            <button onClick={startCamera} className="btn-secondary text-sm">
              <Camera className="w-4 h-4" /> Live Camera
            </button>
            <button onClick={() => fileRef.current?.click()} className="btn-secondary text-sm">
              <Upload className="w-4 h-4" /> Upload Image
            </button>
          </>
        ) : (
          <>
            <button
              onClick={captureFromCamera}
              disabled={!readyToCapture}
              className={`btn-primary text-sm flex-1 ${!readyToCapture ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Camera className="w-4 h-4" />
              {readyToCapture ? 'Capture' : 'Detecting…'}
            </button>
            <button onClick={stopCamera} className="btn-secondary text-sm">
              <FlipHorizontal className="w-4 h-4" /> Cancel
            </button>
          </>
        )}
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
      </div>

      {readyToCapture && mode === 'demo' && (
        <div className="text-xs text-emerald-300 bg-emerald-900/10 border border-emerald-700/20 rounded-lg px-3 py-2 flex items-center gap-2">
          <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
          Demo capture ready. The CV pipeline will run with simulated reference data.
        </div>
      )}
    </div>
  );
}
