import React, { useState, useRef, useMemo } from 'react';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import { GoogleGenAI } from '@google/genai';
import { canvasPreview } from './utils/imageUtils';
import { ExtractedData, ProcessingStatus } from './types';

// Icons
const UploadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
  </svg>
);

const CropIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 3.75H6A2.25 2.25 0 0 0 3.75 6v1.5M16.5 3.75H18A2.25 2.25 0 0 1 20.25 6v1.5m0 9V18A2.25 2.25 0 0 1 18 20.25h-1.5m-9 0H6A2.25 2.25 0 0 1 3.75 18v-1.5M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
  </svg>
);

const DocumentIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
  </svg>
);

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
  </svg>
);

const CopyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
  </svg>
);

export default function App() {
  const [imgSrc, setImgSrc] = useState('');
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [status, setStatus] = useState<ProcessingStatus>(ProcessingStatus.IDLE);
  const [history, setHistory] = useState<ExtractedData[]>([]);
  const imgRef = useRef<HTMLImageElement>(null);
  
  // Initialize AI client safely
  const ai = useMemo(() => {
    try {
      if (!process.env.API_KEY) {
        console.warn("API_KEY is missing from environment variables.");
        return null;
      }
      return new GoogleGenAI({ apiKey: process.env.API_KEY });
    } catch (e) {
      console.error("Failed to initialize GoogleGenAI:", e);
      return null;
    }
  }, []);

  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setCrop(undefined); 
      setCompletedCrop(undefined);
      const reader = new FileReader();
      reader.addEventListener('load', () => setImgSrc(reader.result?.toString() || ''));
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleExtract = async (source: 'selection' | 'full') => {
    if (!ai) {
      alert("API Key not configured. Cannot generate content.");
      return;
    }
    if (!imgRef.current) return;
    if (source === 'selection' && !completedCrop) return;

    setStatus(ProcessingStatus.PROCESSING);

    try {
      let base64Data = '';
      let thumbUrl = undefined;

      if (source === 'selection' && completedCrop) {
        const canvas = document.createElement('canvas');
        await canvasPreview(imgRef.current, canvas, completedCrop);
        const dataUrl = canvas.toDataURL('image/png');
        base64Data = dataUrl.split(',')[1];
        thumbUrl = dataUrl;
      } else {
        const dataUrl = imgSrc;
        base64Data = dataUrl.split(',')[1];
        thumbUrl = dataUrl; 
      }

      // Use the image model for OCR
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { inlineData: { mimeType: 'image/png', data: base64Data } },
            { text: "Extract all legible text from this image. Output only the raw text content without markdown code blocks or explanatory commentary. Preserve the original layout structure where possible (e.g. lists, paragraphs)." }
          ]
        }
      });

      const text = response.text || "No text found.";

      const newEntry: ExtractedData = {
        id: Date.now().toString(),
        text,
        timestamp: Date.now(),
        thumbnail: thumbUrl,
        source
      };

      setHistory(prev => [newEntry, ...prev]);
      setStatus(ProcessingStatus.SUCCESS);

    } catch (error) {
      console.error('Extraction error:', error);
      setStatus(ProcessingStatus.ERROR);
      // alert('Failed to extract text. Please try again.'); // Optional: reduce alert noise
    }
  };

  const handleClear = () => {
    setImgSrc('');
    setCrop(undefined);
    setCompletedCrop(undefined);
    setStatus(ProcessingStatus.IDLE);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 text-white p-2 rounded-xl shadow-md">
             <CropIcon />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 leading-tight">OptiSelect</h1>
            <p className="text-xs text-slate-500 font-medium tracking-wide">AI OPTICAL TEXT SELECTOR</p>
          </div>
        </div>
        <div>
          {status === ProcessingStatus.PROCESSING && (
             <div className="flex items-center gap-2 text-indigo-700 bg-indigo-50 border border-indigo-100 px-4 py-1.5 rounded-full text-sm font-medium animate-pulse shadow-sm">
               <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
               </svg>
               Extracting Text...
             </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Image Area */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-h-[500px] flex flex-col relative transition-all">
            
            {/* Toolbar */}
            <div className="border-b border-slate-100 p-3 flex gap-2 items-center bg-white z-10">
               {!imgSrc ? (
                 <span className="text-sm text-slate-500 px-2 font-medium">Upload a document to start</span>
               ) : (
                 <>
                   <button 
                     onClick={() => handleExtract('selection')}
                     disabled={!completedCrop || status === ProcessingStatus.PROCESSING}
                     className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-all shadow-sm active:scale-95"
                   >
                     <CropIcon /> Extract Selection
                   </button>
                   <button 
                     onClick={() => handleExtract('full')}
                     disabled={status === ProcessingStatus.PROCESSING}
                     className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 hover:border-slate-400 text-slate-700 text-sm font-medium rounded-lg transition-all shadow-sm active:scale-95"
                   >
                     <DocumentIcon /> Extract Full Page
                   </button>
                   <div className="flex-1"></div>
                   <button 
                     onClick={handleClear}
                     className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                     title="Remove Image"
                   >
                     <TrashIcon />
                   </button>
                 </>
               )}
            </div>

            {/* Stage */}
            <div className={`flex-1 bg-slate-100 relative flex items-center justify-center p-8 overflow-auto ${!imgSrc ? 'cursor-default' : 'cursor-crosshair'}`}>
              {!imgSrc ? (
                <div className="text-center animate-in fade-in zoom-in duration-300">
                  <label className="cursor-pointer group flex flex-col items-center gap-4">
                    <div className="w-24 h-24 bg-white rounded-2xl shadow-md border-2 border-dashed border-indigo-100 group-hover:border-indigo-400 group-hover:scale-105 transition-all duration-300 flex items-center justify-center text-indigo-500">
                      <UploadIcon />
                    </div>
                    <div>
                      <span className="block text-lg font-semibold text-slate-700 group-hover:text-indigo-600 transition-colors">Click to upload image</span>
                      <span className="text-slate-500 text-sm">or drag and drop</span>
                      <p className="text-xs text-slate-400 mt-2 font-medium">Supports JPG, PNG, WEBP</p>
                    </div>
                    <input type="file" accept="image/*" onChange={onSelectFile} className="hidden" />
                  </label>
                </div>
              ) : (
                <div className="shadow-2xl rounded-sm overflow-hidden bg-white">
                   <ReactCrop
                      crop={crop}
                      onChange={(_, percentCrop) => setCrop(percentCrop)}
                      onComplete={(c) => setCompletedCrop(c)}
                      className="max-h-[70vh]"
                    >
                      <img
                        ref={imgRef}
                        alt="Upload"
                        src={imgSrc}
                        className="max-w-full block"
                        style={{ maxHeight: '70vh', objectFit: 'contain' }}
                      />
                    </ReactCrop>
                </div>
              )}
            </div>
            
            {/* Help Text overlay */}
            {imgSrc && !completedCrop && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white text-sm px-5 py-2.5 rounded-full backdrop-blur-md shadow-lg pointer-events-none fade-in font-medium">
                Drag on the image to select text
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Results Sidebar */}
        <div className="lg:col-span-1 flex flex-col h-full min-h-[500px]">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col h-full overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-white">
              <h2 className="font-bold text-slate-800 text-lg">Extraction History</h2>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
              {history.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center p-8">
                  <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-300">
                    <DocumentIcon />
                  </div>
                  <p className="font-medium text-slate-500">No text extracted yet</p>
                  <p className="text-sm mt-1">Select an area and click Extract to see results here.</p>
                </div>
              ) : (
                history.map((item) => (
                  <div key={item.id} className="group bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col fade-in">
                    
                    {/* Item Header */}
                    <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-100 flex items-center gap-3">
                       {item.thumbnail ? (
                         <div className="h-10 w-10 bg-slate-200 rounded-md overflow-hidden flex-shrink-0 border border-slate-300 shadow-sm">
                           <img src={item.thumbnail} alt="Crop" className="w-full h-full object-cover" />
                         </div>
                       ) : (
                         <div className="h-10 w-10 bg-indigo-100 text-indigo-600 rounded-md flex items-center justify-center">
                           <DocumentIcon />
                         </div>
                       )}
                       <div className="flex-1 min-w-0">
                         <div className="flex items-center justify-between">
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${item.source === 'selection' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
                              {item.source === 'selection' ? 'Selection' : 'Full Page'}
                            </span>
                            <span className="text-xs text-slate-400">
                              {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                         </div>
                       </div>
                    </div>

                    {/* Extracted Text */}
                    <div className="p-4 relative">
                      <div className="max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                        <p className="text-sm text-slate-700 whitespace-pre-wrap font-mono leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                          {item.text}
                        </p>
                      </div>
                      
                      {/* Actions */}
                      <div className="mt-3 pt-2 flex justify-end">
                        <button 
                          onClick={() => copyToClipboard(item.text)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-md transition-colors"
                        >
                          <CopyIcon /> Copy Text
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}