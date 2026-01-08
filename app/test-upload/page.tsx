'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';

export default function TestUploadPage() {
  const { data: session } = useSession();
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const testPresign = async () => {
    setStatus('Testing presign endpoint...');
    setError('');
    
    try {
      const res = await fetch('/api/posts/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: 'test.jpg',
          fileType: 'image/jpeg',
          fileSize: 100000,
        }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        setError(`Presign failed: ${JSON.stringify(data, null, 2)}`);
        return;
      }

      setStatus(`✅ Presign OK\n${JSON.stringify(data, null, 2)}`);
    } catch (err: any) {
      setError(`Error: ${err.message}`);
    }
  };

  const testUpload = async () => {
    if (!selectedFile) {
      setError('Select a file first');
      return;
    }

    setStatus('Uploading to Vercel Blob...');
    setError('');

    try {
      // Upload using Vercel Blob
      const formData = new FormData();
      formData.append('file', selectedFile);

      const uploadRes = await fetch('/api/posts/upload-blob', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        const errorData = await uploadRes.json();
        setError(`Upload failed: ${JSON.stringify(errorData, null, 2)}`);
        return;
      }

      const { cloud_storage_path, fileUrl } = await uploadRes.json();
      setStatus(`Step 2: Creating post record...\nFile URL: ${fileUrl}`);

      // Step 3: Create post
      const postFormData = new FormData();
      postFormData.append('caption', 'Test upload');
      postFormData.append('cloud_storage_path', cloud_storage_path);
      postFormData.append('hashtags', JSON.stringify(['test']));

      const postRes = await fetch('/api/posts', {
        method: 'POST',
        body: postFormData,
      });

      if (!postRes.ok) {
        const errorData = await postRes.json();
        setError(`Post creation failed: ${JSON.stringify(errorData, null, 2)}`);
        return;
      }

      const postData = await postRes.json();
      setStatus(`✅ SUCCESS!\n\nPost created: ${postData.post?.id}\nFile URL: ${fileUrl}`);

    } catch (err: any) {
      setError(`Error: ${err.message}\n${err.stack || ''}`);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-2xl font-bold mb-4">Upload Test</h1>
      
      <div className="mb-4">
        <p className="mb-2">Session: {session ? '✅ Logged in' : '❌ Not logged in'}</p>
        {session && (
          <div className="text-sm">
            <p>User ID: {session.user?.id}</p>
            <p>Role: {session.user?.role}</p>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <button 
          onClick={testPresign}
          className="bg-blue-600 px-4 py-2 rounded"
        >
          Test Presign Endpoint
        </button>

        <div>
          <input 
            type="file" 
            accept="image/*,video/*"
            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
            className="mb-2"
          />
          {selectedFile && <p className="text-sm">File: {selectedFile.name} ({Math.round(selectedFile.size / 1024)}KB)</p>}
        </div>

        <button 
          onClick={testUpload}
          disabled={!selectedFile}
          className="bg-green-600 px-4 py-2 rounded disabled:opacity-50"
        >
          Test Full Upload Flow
        </button>
      </div>

      {status && (
        <div className="mt-4 p-4 bg-green-900/20 border border-green-500 rounded">
          <pre className="whitespace-pre-wrap text-sm">{status}</pre>
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-900/20 border border-red-500 rounded">
          <pre className="whitespace-pre-wrap text-sm">{error}</pre>
        </div>
      )}
    </div>
  );
}
