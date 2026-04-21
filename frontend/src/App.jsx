import React from 'react';
import FileUploader from './components/FileUploader';

function App() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-blue-200">
      {/* Modern Header */}
      <nav className="bg-white border-b border-gray-200 px-8 py-4 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">C</span>
          </div>
          <h1 className="text-xl font-bold text-gray-800">Compressed<span className="text-blue-600">ME</span></h1>
        </div>
        <p className="text-sm text-gray-500 hidden sm:block">Serverless File Optimization Pipeline</p>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-12 flex justify-center items-start pt-20">
        <FileUploader />
      </main>
    </div>
  );
}

export default App;