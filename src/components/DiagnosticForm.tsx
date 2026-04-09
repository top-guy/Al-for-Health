import React, { useState, useRef } from 'react';
import { User } from 'firebase/auth';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { getDiagnosticAssessment, getMalnutritionAssessment, DiagnosisResult } from '../services/gemini';
import { Camera, Send, Loader2, AlertTriangle, CheckCircle2, Info, UserPlus, Search, Activity } from 'lucide-react';
import { cn } from '../lib/utils';
import ReactMarkdown from 'react-markdown';

interface DiagnosticFormProps {
  user: User;
  profile: any;
}

export function DiagnosticForm({ user, profile }: DiagnosticFormProps) {
  const [patientId, setPatientId] = useState('');
  const [ageMonths, setAgeMonths] = useState<number>(0);
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [village, setVillage] = useState(profile?.village || '');
  const [symptoms, setSymptoms] = useState('');
  const [temperature, setTemperature] = useState<number | undefined>(undefined);
  const [image, setImage] = useState<string | null>(null);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [malnutrition, setMalnutrition] = useState<{ status: string, reasoning: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symptoms) return;

    setIsAnalyzing(true);
    setError(null);
    setResult(null);
    setMalnutrition(null);

    try {
      // 1. Get Diagnostic Assessment
      const diagResult = await getDiagnosticAssessment(symptoms, ageMonths, temperature);
      setResult(diagResult);

      // 2. Get Malnutrition Assessment if image exists
      let malnutResult = null;
      if (image) {
        const base64 = image.split(',')[1];
        malnutResult = await getMalnutritionAssessment(base64, symptoms);
        setMalnutrition(malnutResult);
      }

      // 3. Save to Firestore
      const caseData = {
        patientId: patientId || 'anonymous',
        chvId: user.uid,
        village,
        ageMonths,
        gender,
        symptoms: symptoms.split(',').map(s => s.trim()),
        temperature,
        diagnosis: diagResult.diagnosis,
        confidence: diagResult.confidence,
        severity: diagResult.urgency,
        malnutritionStatus: malnutResult?.status || 'Normal',
        actionPlan: diagResult.actionPlan,
        dangerSigns: diagResult.dangerSignsDetected,
        timestamp: serverTimestamp(),
        isReferred: diagResult.urgency === 'Critical'
      };
      
      await addDoc(collection(db, 'cases'), caseData);

      // 4. Client-side Outbreak Detection Logic (Simulation of Cloud Function)
      const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
      const recentCasesQuery = query(
        collection(db, 'cases'),
        where('village', '==', village),
        where('diagnosis', '==', diagResult.diagnosis),
        where('timestamp', '>=', fortyEightHoursAgo)
      );
      
      const recentCasesSnap = await getDocs(recentCasesQuery);
      if (recentCasesSnap.size >= 3) {
        // Trigger Outbreak Alert
        await addDoc(collection(db, 'alerts'), {
          type: diagResult.diagnosis,
          village,
          caseCount: recentCasesSnap.size,
          timestamp: serverTimestamp(),
          status: 'active'
        });
      }

    } catch (err: any) {
      console.error(err);
      setError('Failed to complete assessment. Please check your connection and try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-1">New Assessment</h2>
        <p className="text-slate-500">Enter patient details and symptoms for AI-assisted diagnosis.</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Patient Info Section */}
        <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Info className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-slate-900">Patient Information</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Village / Ward</label>
              <input 
                type="text" 
                value={village}
                onChange={(e) => setVillage(e.target.value)}
                placeholder="Enter village name"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Age (Months)</label>
              <input 
                type="number" 
                value={ageMonths}
                onChange={(e) => setAgeMonths(parseInt(e.target.value) || 0)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Gender</label>
              <select 
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Temperature (°C)</label>
              <input 
                type="number" 
                step="0.1"
                value={temperature || ''}
                onChange={(e) => setTemperature(parseFloat(e.target.value) || undefined)}
                placeholder="Optional"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
          </div>
        </section>

        {/* Symptoms Section */}
        <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-slate-900">Symptoms & Observations</h3>
          </div>
          
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Describe Symptoms</label>
            <textarea 
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              placeholder="e.g. Cough for 3 days, fast breathing, lethargic, unable to feed..."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all min-h-[120px]"
              required
            />
            <p className="text-xs text-slate-400">Be as descriptive as possible. Mention duration and severity.</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Malnutrition Photo (Optional)</label>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all",
                image ? "border-blue-400 bg-blue-50" : "border-slate-200 hover:border-blue-400 hover:bg-slate-50"
              )}
            >
              {image ? (
                <div className="relative w-full max-w-[200px]">
                  <img src={image} alt="Preview" className="rounded-xl shadow-md" referrerPolicy="no-referrer" />
                  <button 
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setImage(null); }}
                    className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg"
                  >
                    <AlertTriangle className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <Camera className="w-10 h-10 text-slate-400 mb-2" />
                  <p className="text-sm text-slate-500 font-medium">Capture or Upload Photo</p>
                  <p className="text-xs text-slate-400 mt-1">Face, MUAC tape, or full body</p>
                </>
              )}
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageUpload} 
              accept="image/*" 
              className="hidden" 
              capture="environment"
            />
          </div>
        </section>

        <button
          type="submit"
          disabled={isAnalyzing}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-blue-200 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              Analyzing Symptoms...
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              Submit Assessment
            </>
          )}
        </button>
      </form>

      {/* Results Section */}
      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-2xl flex items-start gap-3 text-red-700">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {result && (
        <div className="space-y-6 animate-in zoom-in-95 duration-500">
          <div className={cn(
            "p-6 rounded-2xl border shadow-sm",
            result.urgency === 'Critical' ? "bg-red-50 border-red-200" : 
            result.urgency === 'Urgent' ? "bg-amber-50 border-amber-200" : "bg-green-50 border-green-200"
          )}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {result.urgency === 'Critical' ? <AlertTriangle className="text-red-600" /> : 
                 result.urgency === 'Urgent' ? <Info className="text-amber-600" /> : <CheckCircle2 className="text-green-600" />}
                <h3 className={cn(
                  "text-xl font-bold",
                  result.urgency === 'Critical' ? "text-red-900" : 
                  result.urgency === 'Urgent' ? "text-amber-900" : "text-green-900"
                )}>
                  {result.urgency} Severity
                </h3>
              </div>
              <span className="text-sm font-bold px-3 py-1 rounded-full bg-white/50 border border-current/20">
                {Math.round(result.confidence * 100)}% Confidence
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm font-bold uppercase tracking-wider opacity-60 mb-1">Primary Diagnosis</p>
                <p className="text-lg font-semibold">{result.diagnosis}</p>
              </div>

              {result.dangerSignsDetected.length > 0 && (
                <div className="bg-white/60 p-4 rounded-xl border border-red-100">
                  <p className="text-sm font-bold text-red-700 mb-2">Danger Signs Detected:</p>
                  <ul className="list-disc list-inside text-sm text-red-900 space-y-1">
                    {result.dangerSignsDetected.map((sign, i) => <li key={i}>{sign}</li>)}
                  </ul>
                </div>
              )}

              {malnutrition && (
                <div className={cn(
                  "p-4 rounded-xl border",
                  malnutrition.status === 'SAM' ? "bg-red-100 border-red-200 text-red-900" :
                  malnutrition.status === 'MAM' ? "bg-amber-100 border-amber-200 text-amber-900" : "bg-green-100 border-green-200 text-green-900"
                )}>
                  <p className="text-sm font-bold mb-1">Malnutrition Status: {malnutrition.status}</p>
                  <p className="text-xs opacity-80">{malnutrition.reasoning}</p>
                </div>
              )}

              <div className="prose prose-sm max-w-none bg-white/40 p-4 rounded-xl">
                <p className="text-sm font-bold uppercase tracking-wider opacity-60 mb-2">Action Plan</p>
                <div className="text-slate-800">
                  <ReactMarkdown>{result.actionPlan}</ReactMarkdown>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
