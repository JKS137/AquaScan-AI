import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { WaterReport, UserProfile } from '../types';
import { 
  BarChart3, 
  MapPin, 
  Clock, 
  MoreVertical, 
  Trash2, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  ChevronDown,
  FlaskConical,
  ShieldAlert,
  Share2,
  Check
} from 'lucide-react';
import { formatDate, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export function ReportsList({ profile }: { profile: UserProfile | null }) {
  const [reports, setReports] = useState<WaterReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WaterReport));
      setReports(docs);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleStatusUpdate = async (id: string, status: 'verified' | 'rejected') => {
    if (!isAdmin) return;
    await updateDoc(doc(db, 'reports', id), { status });
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) return;
    if (confirm('Are you sure you want to delete this report?')) {
      await deleteDoc(doc(db, 'reports', id));
    }
  };

  const handleShare = async (report: WaterReport) => {
    const url = `${window.location.origin}?reportId=${report.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(report.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy link', err);
    }
  };

  if (loading) return (
    <div className="flex-1 flex items-center justify-center p-12">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 pb-24">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Active Reports</h2>
          <p className="text-sm text-gray-500 font-medium">Monitoring {reports.length} water sources globally</p>
        </div>
        <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
          <BarChart3 className="w-6 h-6" />
        </div>
      </div>

      <div className="space-y-6">
        <AnimatePresence>
          {reports.map((report) => (
            <motion.div
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={report.id}
              className="card-geometric overflow-hidden p-0 transition-shadow hover:shadow-md"
            >
              <div 
                className="aspect-video relative overflow-hidden group cursor-pointer"
                onClick={() => setExpandedReportId(expandedReportId === report.id ? null : report.id)}
              >
                <img 
                  src={report.imageUrl} 
                  className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-700" 
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-4 left-4 flex gap-2">
                  <span className={cn(
                    "badge-geometric",
                    report.contaminationLevel === 'safe' ? "bg-safe/20 text-safe" :
                    report.contaminationLevel === 'moderate' ? "bg-moderate/20 text-moderate" :
                    "bg-unsafe/20 text-unsafe"
                  )}>
                    {report.contaminationLevel}
                  </span>
                  {report.waterType && report.waterType !== 'unknown' && (
                    <span className="badge-geometric bg-dark/10 text-dark border border-dark/20 uppercase">
                      {report.waterType}
                    </span>
                  )}
                  {report.status !== 'pending' && (
                    <span className={cn(
                      "badge-geometric",
                      report.status === 'verified' ? "bg-primary/20 text-primary" : "bg-dark/20 text-dark"
                    )}>
                      {report.status}
                    </span>
                  )}
                </div>
                <div className="absolute bottom-4 right-4 bg-dark/40 backdrop-blur-md p-2 rounded-lg text-white">
                   <ChevronDown className={cn("w-5 h-5 transition-transform duration-300", expandedReportId === report.id ? "rotate-180" : "")} />
                </div>
              </div>

              <div className="p-8 space-y-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-text-main text-lg tracking-tight">{report.analystName}</h3>
                    <div className="flex items-center gap-4 text-[10px] text-text-sec font-bold uppercase tracking-widest mt-2">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" /> {report.location.lat.toFixed(4)}, {report.location.lng.toFixed(4)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" /> {formatDate(report.createdAt)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleShare(report)}
                      className={cn(
                        "p-2.5 rounded-lg transition-all flex items-center gap-2",
                        copiedId === report.id 
                          ? "bg-safe/10 text-safe" 
                          : "bg-bg border border-border text-text-sec hover:text-primary hover:border-primary/30"
                      )}
                      title="Share Report"
                    >
                      {copiedId === report.id ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span className="text-[10px] font-bold uppercase tracking-widest mr-1">Copied</span>
                        </>
                      ) : (
                        <Share2 className="w-4 h-4" />
                      )}
                    </button>

                    {isAdmin && (
                      <div className="h-8 w-[1px] bg-border mx-1" />
                    )}

                    {isAdmin && (
                      <div className="flex items-center gap-1.5">
                      <button 
                        onClick={() => handleStatusUpdate(report.id, 'verified')}
                        className="p-2.5 bg-safe/10 text-safe rounded-lg hover:bg-safe/20 transition-colors"
                        title="Verify"
                      >
                        <CheckCircle className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => handleStatusUpdate(report.id, 'rejected')}
                        className="p-2.5 bg-unsafe/10 text-unsafe rounded-lg hover:bg-unsafe/20 transition-colors"
                        title="Reject"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => handleDelete(report.id)}
                        className="p-2.5 bg-gray-100 text-gray-400 rounded-lg hover:text-red-600 transition-all font-bold"
                        title="Delete"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

                <div 
                  className="border-l-2 border-border pl-4 cursor-pointer"
                  onClick={() => setExpandedReportId(expandedReportId === report.id ? null : report.id)}
                >
                  <p className="text-sm text-text-sec leading-relaxed italic">
                    "{report.aiResult.explanation}"
                  </p>
                </div>

                <AnimatePresence>
                  {expandedReportId === report.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden space-y-6"
                    >
                      <div className="pt-4 border-t border-border grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-bg border border-border rounded-lg p-5">
                          <div className="flex items-center gap-3 mb-4">
                            <FlaskConical className="w-4 h-4 text-primary" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-text-sec">Detections</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {report.aiResult.detections.map((d, i) => (
                              <span key={i} className="px-2 py-1 bg-white border border-border rounded text-[10px] font-bold text-text-main uppercase tracking-wider">
                                {d}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="bg-bg border border-border rounded-lg p-5">
                          <div className="flex items-center gap-3 mb-4">
                            <ShieldAlert className="w-4 h-4 text-unsafe" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-text-sec">Health Risk</span>
                          </div>
                          <p className="text-sm font-bold text-text-main leading-snug">
                            {report.aiResult.healthRisk}
                          </p>
                        </div>
                      </div>

                      <div className="bg-primary/5 border border-primary/20 rounded-lg p-5">
                        <div className="flex items-center gap-3 mb-2">
                          <AlertCircle className="w-4 h-4 text-primary" />
                          <span className="text-[10px] font-bold uppercase tracking-widest text-text-sec">Safety Protocol</span>
                        </div>
                        <p className="text-sm font-semibold text-text-main leading-snug">
                          {report.purificationAdvice}
                        </p>
                      </div>

                      <div className="flex justify-between items-center text-[10px] font-bold text-text-sec uppercase tracking-[0.2em] px-2">
                        <span>AI Confidence: {Math.round(report.aiResult.confidence * 100)}%</span>
                        <span>Report ID: {report.id.slice(0, 8).toUpperCase()}</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                {expandedReportId !== report.id && (
                  <div className="bg-bg border border-border rounded-lg p-5 flex items-center justify-between group cursor-pointer" onClick={() => setExpandedReportId(report.id)}>
                    <div className="flex items-center gap-3">
                      <AlertCircle className="w-4 h-4 text-primary" />
                      <span className="text-sm font-semibold text-text-main">View Safety Advice & Analysis</span>
                    </div>
                    <ChevronDown className="w-4 h-4 text-text-sec transition-transform group-hover:translate-y-0.5" />
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {reports.length === 0 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-24 px-10 card-geometric border-dashed border-2 bg-bg/50"
          >
            <div className="relative w-32 h-32 mb-8">
              {/* Geometric Background Shapes */}
              <motion.div 
                animate={{ 
                  rotate: 360,
                  borderRadius: ["30% 70% 70% 30% / 30% 30% 70% 70%", "50% 50% 20% 80% / 25% 80% 20% 75%"]
                }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 bg-primary/10 border border-primary/20"
              />
              <motion.div 
                animate={{ 
                  rotate: -360,
                  borderRadius: ["70% 30% 30% 70% / 70% 70% 30% 30%", "20% 80% 50% 50% / 80% 25% 75% 20%"]
                }}
                transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                className="absolute inset-2 bg-primary/5 border border-primary/10"
              />
              
              {/* Central Icons */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative">
                  <BarChart3 className="w-12 h-12 text-primary/40" />
                  <motion.div
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 3, repeat: Infinity }}
                    className="absolute -top-4 -right-4 bg-white p-2 rounded-lg shadow-sm border border-border"
                  >
                    <FlaskConical className="w-5 h-5 text-primary" />
                  </motion.div>
                </div>
              </div>
            </div>

            <div className="text-center space-y-3 max-w-sm">
              <h3 className="text-xl font-bold text-text-main tracking-tight uppercase">Database Synchronized</h3>
              <p className="text-sm text-text-sec leading-relaxed">
                The global water quality grid is currently awaiting new telemetry data. 
                Deploy an analyst scan to populate this registry.
              </p>
            </div>

            <div className="mt-10 flex gap-4">
               <div className="badge-geometric bg-bg text-text-sec flex items-center gap-2 border border-border">
                 <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                 Monitoring Global Grid
               </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
