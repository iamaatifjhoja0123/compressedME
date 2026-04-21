import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { UploadCloud, File, CheckCircle2, AlertCircle, Loader2, Download } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_API_URL; 

const FileUploader = () => {
    const [file, setFile] = useState(null);
    const [status, setStatus] = useState('IDLE'); // IDLE, UPLOADING, PROCESSING, COMPLETED, ERROR
    const [jobId, setJobId] = useState(null);
    const [downloadUrl, setDownloadUrl] = useState('');
    const fileInputRef = useRef(null);

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setStatus('IDLE');
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        try {
            setStatus('UPLOADING');
            const { data } = await axios.post(`${BACKEND_URL}/upload-url`, {
                filename: file.name,
                fileType: file.type
            });

            const { uploadUrl, jobId: newJobId } = data;
            setJobId(newJobId);

            await axios.put(uploadUrl, file, { headers: { 'Content-Type': file.type } });
            setStatus('PROCESSING');

        } catch (error) {
            console.error('Upload failed:', error);
            setStatus('ERROR');
        }
    };

    useEffect(() => {
        let interval;
        if (status === 'PROCESSING' && jobId) {
            interval = setInterval(async () => {
                try {
                    const { data } = await axios.get(`${BACKEND_URL}/status/${jobId}`);
                    if (data.status === 'COMPLETED') {
                        setStatus('COMPLETED');
                        setDownloadUrl(data.download_url);
                        clearInterval(interval);
                    } else if (data.status === 'ERROR') {
                        setStatus('ERROR');
                        clearInterval(interval);
                    }
                } catch (err) {
                    console.error("Status check error", err);
                }
            }, 3000);
        }
        return () => clearInterval(interval);
    }, [status, jobId]);

    return (
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 p-8 transition-all">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-extrabold text-slate-800">Optimize Your File</h2>
                <p className="text-slate-500 text-sm mt-2">Upload images or PDFs to reduce file size instantly.</p>
            </div>

            {/* Dropzone Area */}
            <div 
                onClick={() => status === 'IDLE' && fileInputRef.current.click()}
                className={`relative border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-all
                    ${status === 'IDLE' ? 'border-blue-300 bg-blue-50/50 hover:bg-blue-50 cursor-pointer' : 'border-slate-200 bg-slate-50 opacity-70 cursor-not-allowed'}
                `}
            >
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    className="hidden" 
                    disabled={status !== 'IDLE'}
                    accept=".jpg,.jpeg,.png,.jfif,.webp,.pdf"
                />
                
                {file ? (
                    <div className="flex flex-col items-center gap-3">
                        <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
                            <File size={28} />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-slate-700 truncate max-w-[200px]">{file.name}</p>
                            <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-3">
                        <div className="p-4 bg-white shadow-sm border border-slate-100 text-blue-500 rounded-full mb-2">
                            <UploadCloud size={32} />
                        </div>
                        <p className="text-sm font-medium text-slate-700">Click to browse files</p>
                        <p className="text-xs text-slate-400">Supports JPG, PNG, WEBP & PDF</p>
                    </div>
                )}
            </div>

            {/* Upload Button */}
            {file && status === 'IDLE' && (
                <button 
                    onClick={handleUpload}
                    className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
                >
                    Start Compression
                </button>
            )}

            {/* Status Indicators */}
            <div className="mt-6">
                {status === 'UPLOADING' && (
                    <div className="flex items-center gap-3 text-blue-600 justify-center p-4 bg-blue-50 rounded-xl">
                        <Loader2 className="animate-spin" size={20} />
                        <span className="font-medium text-sm">Uploading securely to S3...</span>
                    </div>
                )}
                
                {status === 'PROCESSING' && (
                    <div className="flex items-center gap-3 text-amber-600 justify-center p-4 bg-amber-50 rounded-xl">
                        <Loader2 className="animate-spin" size={20} />
                        <span className="font-medium text-sm">Compressing with Lambda...</span>
                    </div>
                )}

                {status === 'COMPLETED' && (
                    <div className="flex flex-col items-center gap-4 p-5 bg-green-50 border border-green-100 rounded-xl">
                        <div className="flex items-center gap-2 text-green-700 font-semibold">
                            <CheckCircle2 size={20} />
                            <span>Compression Successful!</span>
                        </div>
                        <a 
                            href={downloadUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg shadow-sm font-medium transition"
                        >
                            <Download size={18} /> Download Optimized File
                        </a>
                        <button 
                            onClick={() => { setFile(null); setStatus('IDLE'); }}
                            className="text-sm text-slate-500 hover:text-slate-700 underline underline-offset-2 mt-1"
                        >
                            Compress another file
                        </button>
                    </div>
                )}

                {status === 'ERROR' && (
                    <div className="flex items-center gap-2 text-red-600 justify-center p-4 bg-red-50 border border-red-100 rounded-xl">
                        <AlertCircle size={20} />
                        <span className="font-medium text-sm">Something went wrong. Try again.</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FileUploader;