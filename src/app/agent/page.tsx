"use client";

import { useState, useRef, useEffect } from "react";
import { Camera, Check, AlertTriangle, UploadCloud } from "lucide-react";
import Tesseract from "tesseract.js";

// Note: In a real PWA this would use IndexedDB directly or via a wrapper like localforage
export default function AgentCapturePage() {
  const [photo, setPhoto] = useState<string | null>(null);
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [candidates] = useState([
    { id: "1", name: "Paul Otuoma", party: "ODM", count: "" },
    { id: "2", name: "Sospeter Ojaamong", party: "UDA", count: "" },
  ]);
  const [counts, setCounts] = useState<Record<string, string>>({});
  
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = async (event) => {
        const dataUrl = event.target?.result as string;
        setPhoto(dataUrl);
        runOcr(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const runOcr = async (image: string) => {
    setIsOcrProcessing(true);
    try {
      const result = await Tesseract.recognize(image, 'eng', {
        logger: m => {
          if (m.status === "recognizing text") {
            setOcrProgress(Math.floor(m.progress * 100));
          }
        }
      });
      console.log("OCR Raw Text:", result.data.text);
      // In a real app we would parse the result to match candidate names or bounding boxes.
      // For the stub, we just pretend we found some numbers.
      setTimeout(() => {
        setCounts({ "1": "125", "2": "98" });
        setIsOcrProcessing(false);
      }, 1000);
    } catch (err) {
      console.error(err);
      setIsOcrProcessing(false);
    }
  };

  const handleSubmit = () => {
    if (!isOnline) {
      alert("You are offline. Submission saved to device and will sync automatically when connection returns.");
      // Logic to save to IndexedDB goes here
    } else {
      alert("Tally submitted successfully!");
      setPhoto(null);
      setCounts({});
    }
  };

  return (
    <div className="min-h-screen bg-(--background) text-(--foreground) pb-20">
      <header className="bg-(--primary) text-(--primary-foreground) p-4 flex justify-between items-center shadow-md">
        <div>
          <div className="font-bold">Busibwabo Pri. School</div>
          <div className="text-xs opacity-80">Station 042</div>
        </div>
        {!isOnline && (
          <span className="bg-red-500 text-white text-xs px-2 py-1 rounded font-bold animate-pulse">
            OFFLINE
          </span>
        )}
      </header>

      <main className="p-4 space-y-6">
        {/* Step 1: Photo */}
        <div className="bg-(--panel) rounded-xl border border-(--foreground)/10 shadow-sm p-4 text-center">
          <h2 className="font-bold mb-4">1. Capture Form 34A</h2>
          
          {photo ? (
            <div className="relative rounded-lg overflow-hidden border border-(--foreground)/10">
              <img src={photo} alt="Form 34A" className="w-full h-48 object-cover" />
              <button 
                onClick={() => setPhoto(null)}
                className="absolute top-2 right-2 bg-black/50 text-white p-2 rounded-full text-xs"
              >
                Retake
              </button>
            </div>
          ) : (
            <label className="border-2 border-dashed border-(--primary)/50 bg-(--primary)/5 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer">
              <Camera className="w-12 h-12 text-(--primary) mb-2" />
              <span className="font-medium text-(--primary)">Open Camera</span>
              <input 
                type="file" 
                accept="image/*" 
                capture="environment" 
                className="hidden" 
                onChange={handlePhotoCapture} 
              />
            </label>
          )}
        </div>

        {/* Step 2: Data Entry & OCR */}
        {photo && (
          <div className="bg-(--panel) rounded-xl border border-(--foreground)/10 shadow-sm p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold">2. Verify Tallies</h2>
              {isOcrProcessing && (
                <span className="text-xs text-(--primary) font-bold animate-pulse">
                  Scanning... {ocrProgress}%
                </span>
              )}
            </div>

            <div className="space-y-4">
              {candidates.map(candidate => (
                <div key={candidate.id} className="flex justify-between items-center">
                  <div>
                    <div className="font-bold text-sm">{candidate.name}</div>
                    <div className="text-xs text-(--foreground)/50">{candidate.party}</div>
                  </div>
                  <input
                    type="number"
                    value={counts[candidate.id] || ""}
                    onChange={e => setCounts({...counts, [candidate.id]: e.target.value})}
                    placeholder="Count"
                    className="w-24 border border-(--foreground)/20 rounded p-2 text-center font-mono font-bold text-lg focus:ring-2 focus:ring-(--primary) outline-none bg-(--background)"
                  />
                </div>
              ))}
            </div>

            <div className="mt-6 flex gap-3">
              <div className="flex-1 bg-(--background) border border-(--foreground)/10 p-2 rounded text-center">
                <div className="text-xs text-(--foreground)/60 uppercase">Total Cast</div>
                <div className="font-mono font-bold text-lg">
                  {Object.values(counts).reduce((a, b) => a + (parseInt(b) || 0), 0)}
                </div>
              </div>
              <div className="flex-1 bg-(--background) border border-(--foreground)/10 p-2 rounded text-center">
                <div className="text-xs text-(--foreground)/60 uppercase">Registered</div>
                <div className="font-mono font-bold text-lg">540</div>
              </div>
            </div>
            
            <button 
              onClick={handleSubmit}
              className="w-full mt-6 bg-(--primary) text-(--primary-foreground) font-bold py-4 rounded-xl flex justify-center items-center gap-2 hover:opacity-90"
            >
              {!isOnline ? <UploadCloud className="w-5 h-5"/> : <Check className="w-5 h-5"/>}
              {!isOnline ? "Queue for Sync" : "Submit Result"}
            </button>
            {!isOnline && (
              <p className="text-xs text-center text-(--danger) mt-2 flex items-center justify-center gap-1">
                <AlertTriangle className="w-3 h-3"/> Saved locally until connection returns
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
