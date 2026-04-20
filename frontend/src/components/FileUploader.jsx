import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_API_URL; 

const FileUploader = () => {
    const [file, setFile] = useState(null);
    const [status, setStatus] = useState('IDLE'); // IDLE, UPLOADING, PROCESSING, COMPLETED, ERROR
    const [jobId, setJobId] = useState(null);
    const [downloadUrl, setDownloadUrl] = useState('');

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const handleUpload = async () => {
        if (!file) {
            alert('Please select a file first!');
            return;
        }

        try {
            setStatus('UPLOADING');

            // 1. Backend se Presigned URL lena
            const { data } = await axios.post(`${BACKEND_URL}/upload-url`, {
                filename: file.name,
                fileType: file.type
            });

            const { uploadUrl, jobId: newJobId } = data;
            setJobId(newJobId);

            // 2. Direct S3 par file upload karna (PUT request)
            await axios.put(uploadUrl, file, {
                headers: {
                    'Content-Type': file.type
                }
            });

            // 3. Upload success! Ab backend se status check karna shuru karo
            setStatus('PROCESSING');

        } catch (error) {
            console.error('Upload failed:', error);
            setStatus('ERROR');
        }
    };

    // 4. Polling Logic: Har 3 second mein status check karega jab tak file process na ho jaye
    useEffect(() => {
        let interval;
        if (status === 'PROCESSING' && jobId) {
            interval = setInterval(async () => {
                try {
                    const { data } = await axios.get(`${BACKEND_URL}/status/${jobId}`);
                    
                    if (data.status === 'COMPLETED') {
                        setStatus('COMPLETED');
                        setDownloadUrl(data.download_url); // Yeh URL DynamoDB se aayega
                        clearInterval(interval);
                    } else if (data.status === 'ERROR') {
                        setStatus('ERROR');
                        clearInterval(interval);
                    }
                } catch (err) {
                    console.error("Status check error", err);
                }
            }, 3000); // 3 seconds
        }
        return () => clearInterval(interval);
    }, [status, jobId]);

    return (
        <div style={{ padding: '20px', maxWidth: '400px', margin: 'auto', fontFamily: 'sans-serif' }}>
            <h2>Upload & Compress File</h2>
            
            <input type="file" onChange={handleFileChange} disabled={status === 'UPLOADING' || status === 'PROCESSING'} />
            
            <br /><br />
            
            <button 
                onClick={handleUpload} 
                disabled={!file || status === 'UPLOADING' || status === 'PROCESSING'}
            >
                {status === 'UPLOADING' ? 'Uploading to S3...' : 'Upload'}
            </button>

            <div style={{ marginTop: '20px' }}>
                {status === 'PROCESSING' && <p>⏳ File is being compressed... Please wait.</p>}
                {status === 'COMPLETED' && (
                    <div style={{ color: 'green' }}>
                        <p>✅ Compression Successful!</p>
                        <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
                            <button>Download Compressed File</button>
                        </a>
                    </div>
                )}
                {status === 'ERROR' && <p style={{ color: 'red' }}>❌ Something went wrong.</p>}
            </div>
        </div>
    );
};

export default FileUploader;