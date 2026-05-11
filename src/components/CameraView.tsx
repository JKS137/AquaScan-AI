import React, { useRef, useState, useEffect } from 'react';
import { 
  Camera, 
  RefreshCcw, 
  FlaskConical, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  ChevronRight, 
  Send, 
  Loader2,
  ZoomIn,
  X 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { analyzeWaterQuality, WaterAnalysisResult } from '../lib/gemini';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile } from '../types';
import { cn } from '../lib/utils';

export function CameraView({ profile }: { profile: UserProfile | null }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<WaterAnalysisResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isFullscreenZoom, setIsFullscreenZoom] = useState(false);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      const constraints = {
        video: { facingMode: 'environment' },
        audio: false,
      };
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Camera access failed", err);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const captureFrame = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(dataUrl);
        stopCamera();
        handleAnalyze(dataUrl);
      }
    }
  };

  const handleAnalyze = async (imageData: string) => {
    setAnalyzing(true);
    try {
      const base64 = imageData.split(',')[1];
      const result = await analyzeWaterQuality(base64);
      setAnalysis(result);
    } catch (err) {
      console.error(err);
    } finally {
      setAnalyzing(false);
    }
  };

  const resetScanner = () => {
    setCapturedImage(null);
    setAnalysis(null);
    setSubmitted(false);
    startCamera();
  };

  const submitReport = async () => {
    if (!analysis || !capturedImage || !profile) return;
    setSubmitting(true);
    try {
      // In a real app, we'd upload to Firebase Storage, then link.
      // For this demo, we'll store the base64 or a placeholder if large.
      // Actually, base64 is okay for small scale or testing.
      
      const pos = await new Promise<GeolocationPosition>((res, rej) => {
        navigator.geolocation.getCurrentPosition(res, rej);
      });

      await addDoc(collection(db, 'reports'), {
        analystId: profile.uid,
        analystName: profile.displayName,
        imageUrl: capturedImage,
        location: {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        },
        waterType: analysis.waterType,
        contaminationLevel: analysis.contaminationLevel,
        aiResult: {
          confidence: analysis.confidence,
          detections: analysis.detections,
          healthRisk: analysis.healthRisk,
          explanation: analysis.explanation
        },
        purificationAdvice: analysis.recommendation,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      setSubmitted(true);
    } catch (err) {
      console.error("Report submission failed", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-black relative">
      <AnimatePresence mode="wait">
        {!capturedImage ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 relative overflow-hidden"
          >
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className="w-full h-full object-cover"
            />
            {/* Camera Overlays */}
            <div className="absolute inset-0 pointer-events-none border-[24px] border-dark/30">
              <div className="w-full h-full border border-white/30 relative">
                <div className="absolute top-1/2 left-0 w-full border-t border-white/10 -translate-y-1/2" />
                <div className="absolute top-0 left-1/2 h-full border-l border-white/10 -translate-x-1/2" />
                <div className="absolute inset-0 flex items-center justify-center">
                   <div className="w-24 h-24 border border-primary relative">
                     <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary" />
                     <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-primary" />
                     <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-primary" />
                     <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary" />
                   </div>
                </div>
              </div>
            </div>

            <div className="absolute bottom-12 left-0 w-full flex flex-col items-center gap-6 px-8">
              <div className="bg-dark/80 backdrop-blur-md px-6 py-2 border border-white/10 flex items-center gap-3">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <p className="text-white text-[10px] uppercase font-bold tracking-widest">
                  Live Camera Feed • CH 01
                </p>
              </div>
              <button 
                onClick={captureFrame}
                className="w-16 h-16 bg-white rounded-full flex items-center justify-center border-4 border-white/20 active:scale-90 transition-transform shadow-2xl"
              >
                <div className="w-10 h-10 bg-transparent rounded-full border-2 border-dark" />
              </button>
            </div>
            <canvas ref={canvasRef} className="hidden" />
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1 overflow-y-auto bg-bg flex flex-col pt-4"
          >
            {/* Results UI */}
            <div className="px-6 md:px-10 space-y-6 pb-20">
              <div 
                className="relative aspect-video rounded-xl overflow-hidden shadow-sm border border-border bg-white cursor-zoom-in group"
                onClick={() => setIsFullscreenZoom(true)}
              >
                <img src={capturedImage} className="w-full h-full object-cover" />
                
                {/* Zoom Hint Overlay */}
                <div className="absolute top-4 right-4 bg-dark/40 backdrop-blur-md p-2 rounded-lg text-white opacity-0 group-hover:opacity-100 transition-opacity">
                   <ZoomIn className="w-5 h-5" />
                </div>
                <div className="absolute bottom-4 left-4 bg-dark/40 backdrop-blur-md px-3 py-1 rounded-lg text-white text-[10px] uppercase font-bold tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                   Click to Inspect Details
                </div>

                {analyzing && (
                  <div className="absolute inset-0 bg-dark/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
                    <div className="relative">
                      <div className="w-16 h-16 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <FlaskConical className="w-8 h-8 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <p className="mt-6 text-white font-bold text-lg tracking-tight uppercase">Quantifying Impurities...</p>
                    <p className="text-primary text-[10px] mt-1 font-bold tracking-[0.2em] uppercase">Gemini Neural Analysis Active</p>
                  </div>
                )}
              </div>

              {/* Fullscreen Zoom Modal */}
              <AnimatePresence>
                {isFullscreenZoom && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] bg-dark/95 flex flex-col items-center justify-center p-4 md:p-12"
                  >
                    <button 
                      onClick={() => setIsFullscreenZoom(false)}
                      className="absolute top-6 right-6 p-4 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
                    >
                      <X className="w-8 h-8" />
                    </button>
                    
                    <div className="w-full h-full flex items-center justify-center">
                      <motion.img 
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        src={capturedImage} 
                        className="max-w-full max-h-full object-contain rounded-lg shadow-2xl border border-white/10"
                      />
                    </div>
                    
                    <div className="absolute bottom-12 bg-white/10 backdrop-blur-xl border border-white/10 p-6 rounded-2xl text-center max-w-md">
                      <p className="text-white font-bold mb-1">Detailed Inspection Mode</p>
                      <p className="text-gray-400 text-xs uppercase tracking-widest font-bold">
                        Analyze high-resolution capture for physical sediments
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {analysis && (
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="space-y-6"
                >
                  {/* Status Card */}
                  <div className="card-geometric flex items-center gap-6">
                    <div className={cn(
                      "w-16 h-16 rounded-lg flex items-center justify-center shadow-inner",
                      analysis.contaminationLevel === 'safe' ? "bg-safe/10 text-safe" :
                      analysis.contaminationLevel === 'moderate' ? "bg-moderate/10 text-moderate" :
                      "bg-unsafe/10 text-unsafe"
                    )}>
                      {analysis.contaminationLevel === 'safe' ? <CheckCircle2 className="w-8 h-8" /> :
                       analysis.contaminationLevel === 'moderate' ? <Info className="w-8 h-8" /> : 
                       <AlertTriangle className="w-8 h-8" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-xl font-bold capitalize text-text-main tracking-tight">
                          {analysis.contaminationLevel} {analysis.waterType !== 'unknown' ? analysis.waterType : 'Water'}
                        </h3>
                        <span className={cn(
                          "badge-geometric",
                          analysis.contaminationLevel === 'safe' ? "bg-safe/20 text-safe" :
                          analysis.contaminationLevel === 'moderate' ? "bg-moderate/20 text-moderate" :
                          "bg-unsafe/20 text-unsafe"
                        )}>
                          Analyzed
                        </span>
                      </div>
                      <p className="text-[10px] font-bold text-text-sec uppercase tracking-widest mt-1">
                        Confidence Index: {Math.round(analysis.confidence * 100)}%
                      </p>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="card-geometric">
                      <h4 className="text-[10px] uppercase tracking-widest font-bold text-text-sec mb-4 flex items-center gap-2">
                        <FlaskConical className="w-4 h-4" /> Impurity Profile
                      </h4>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {analysis.detections.map((d, i) => (
                          <span key={i} className="px-3 py-1.5 bg-bg border border-border rounded text-[11px] font-bold text-text-main">
                            {d}
                          </span>
                        ))}
                      </div>
                      <p className="text-xs text-text-sec leading-relaxed">
                        {analysis.explanation}
                      </p>
                    </div>

                    <div className="card-geometric border-primary/20 bg-primary/5">
                      <h4 className="text-[10px] uppercase tracking-widest font-bold text-primary mb-4 flex items-center gap-2">
                        <Info className="w-4 h-4" /> Recommended Action
                      </h4>
                      <p className="font-bold text-text-main mb-2">{analysis.healthRisk}</p>
                      <p className="text-text-sec text-xs leading-relaxed">{analysis.recommendation}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row gap-4 py-8">
                    {!submitted ? (
                      <button 
                        onClick={submitReport}
                        disabled={submitting}
                        className="btn-geometric-primary flex-1 flex items-center justify-center gap-3"
                      >
                        {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-4 h-4" />}
                        Submit Environmental Report
                      </button>
                    ) : (
                      <div className="flex-1 py-4 bg-safe text-white rounded-lg font-bold flex items-center justify-center gap-3">
                         <CheckCircle2 className="w-5 h-5" /> Transmission Complete
                      </div>
                    )}
                    <button 
                      onClick={resetScanner}
                      className="btn-geometric-outline flex items-center justify-center gap-3"
                    >
                      <RefreshCcw className="w-4 h-4" /> New Analysis
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
