import React, { useState } from 'react';
import scrapedFileService from '../../services/api/scrapedFileService';

//file management component
export const ScrapedFileManagement = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileId, setFileId] = useState('');
  const [customFilename, setCustomFilename] = useState('');
  const [model, setModel] = useState('');
  
  const [uploading, setUploading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fileDetails, setFileDetails] = useState(null);

  //needed to display file content
  const [fileContent, setFileContent] = useState(null);
  const [contentType, setContentType] = useState('');
  const [retrievedFile, setRetrievedFile] = useState(null);
  const [, setIsBase64] = useState(false);

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      
      //extracts filename without extension to suggest as default custom name (safeFileName)
      const nameParts = file.name.split('.');
      const nameWithoutExtension = nameParts.length > 1 
        ? nameParts.slice(0, -1).join('.') 
        : file.name;
      
      setCustomFilename(nameWithoutExtension.replace(/[,#<>:"/\\|?*]+/g, '_'));
      
      setFileDetails({
        name: file.name,
        type: file.type,
        size: `${(file.size / 1024).toFixed(2)} KB`
      });
      
      setSuccess('');
      setError('');
    }
  };

  const handleCustomFilenameChange = (e) => {
    setCustomFilename(e.target.value);
  };

  const handleModelChange = (e) => {
    setModel(e.target.value);
  };

  const handleFileIdChange = (e) => {
    setFileId(e.target.value);
    setSuccess('');
    setError('');
    setFileContent(null);
    setContentType('');
    setRetrievedFile(null);
    setIsBase64(false);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    
    if (!selectedFile) {
      setError('Please select a file to upload');
      return;
    }

    if (!model.trim()) {
        setError('Please provide a model name');
        return;
    }

    //validate custom filename
    const sanitizedFilename = customFilename.trim().replace(/[,#<>:"/\\|?*\s]+/g, '_');
    if (!sanitizedFilename) {
      setError('Please provide a valid filename');
      return;
    }

    setError('');
    setSuccess('');
    setUploading(true);

    try {
      console.log('Starting upload for:', sanitizedFilename, 'with model:', model);
      
      const result = await scrapedFileService.uploadFile(
        selectedFile, 
        sanitizedFilename,
        selectedFile.type,
        model.trim()
      );
      
      setSuccess(`File uploaded successfully. File ID: ${result.fileId}`);
      setSelectedFile(null);
      setFileDetails(null);
      setCustomFilename('');
      setModel('');
      
      //reset file input after successful upload
      const fileInput = document.getElementById('file-upload');
      if (fileInput) fileInput.value = '';
      
    } catch (err) {
      console.error('Upload error:', err);
      setError(`Upload failed: ${err.message || 'The API may be unavailable. Check network connection.'}`);
    } finally {
      setUploading(false);
    }
  };

  const handleGetFile = async (e) => {
    e.preventDefault();
    
    if (!fileId.trim()) {
      setError('Please enter a file ID');
      return;
    }
  
    setError('');
    setSuccess('');
    setFetching(true);
    setFileContent(null);
    setContentType('');
    setRetrievedFile(null);
    setIsBase64(false);
  
    try {
      const result = await scrapedFileService.getFileById(fileId);
      
      if (result.success) {
        setSuccess('File retrieved successfully');
        setContentType(result.contentType || 'application/octet-stream');
        setFileContent(result.fileContent);
        setRetrievedFile(result);
        setIsBase64(true);
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setError(`Fetch failed: ${err.message || 'The file may not exist or the API may be unavailable.'}`);
    } finally {
      setFetching(false);
    }
  };

  const getFileExtension = (contentType) => {
    const extensionMap = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'application/pdf': '.pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
      'text/plain': '.txt',
      'text/html': '.html',
      'application/json': '.json'
    };
  
    return extensionMap[contentType] || '';
  };

  const renderFileContent = () => {
    if (!fileContent) {
      return null;
    }
  
    if (contentType.includes('image/')) {
      return (
        <div className="mt-4">
          <h4 className="text-lg font-semibold mb-2">File Preview:</h4>
          <img 
            src={`data:${contentType};base64,${fileContent}`}
            alt="File preview" 
            className="max-w-full h-auto border rounded"
          />
          <button 
            onClick={() => downloadBinaryFile(fileContent, `${retrievedFile.filename || 'image'}${getFileExtension(contentType)}`)}
            className="mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Download Image
          </button>
        </div>
      );
    } else if (contentType.includes('application/pdf')) {
      return (
        <div className="mt-4">
          <h4 className="text-lg font-semibold mb-2">PDF Preview:</h4>
          <iframe
            src={`data:${contentType};base64,${fileContent}`}
            width="100%"
            height="500px"
            title="PDF Viewer"
            className="border rounded"
          ></iframe>
          <button 
            onClick={() => downloadBinaryFile(fileContent, `${retrievedFile.filename || 'document'}${getFileExtension(contentType)}`)}
            className="mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Download PDF
          </button>
        </div>
      );
    } else if (contentType.includes('text/') || contentType.includes('application/json')) {
      let decodedText;
      try {
        // Properly decode base64 text and handle UTF-8 encoding
        const binaryString = atob(fileContent);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        // Use TextDecoder to properly decode UTF-8 content
        const decoder = new TextDecoder('utf-8');
        decodedText = decoder.decode(bytes);
      } catch (error) {
        console.error('Error decoding text content:', error);
        decodedText = 'Error decoding text content';
      }
  
      return (
        <div className="mt-4">
          <h4 className="text-lg font-semibold mb-2">File Content:</h4>
          <pre className="bg-gray-100 p-4 rounded-lg overflow-auto max-h-96 whitespace-pre-wrap">
            {decodedText}
          </pre>
          <button 
            onClick={() => downloadTextFile(decodedText, `${retrievedFile.filename || 'text'}${getFileExtension(contentType)}`)}
            className="mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Download Text
          </button>
        </div>
      );
    } else {
      return (
        <div className="mt-4">
          <h4 className="text-lg font-semibold mb-2">File Content:</h4>
          <div className="bg-gray-100 p-4 rounded-lg">
            <p>Binary file: {contentType}</p>
            <p>Size: {retrievedFile?.fileSize ? formatFileSize(retrievedFile.fileSize) : 'Unknown'}</p>
          </div>
          <button 
            onClick={() => downloadBinaryFile(fileContent, `${retrievedFile.filename || 'file'}${getFileExtension(contentType)}`)}
            className="mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Download File
          </button>
        </div>
      );
    }
  };
  
  // Add these helper functions for proper file downloading
  const downloadTextFile = (content, filename) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const downloadBinaryFile = (base64Content, filename) => {
    try {
      // For images and binary files, create a blob from the base64 data
      const byteCharacters = atob(base64Content);
      const byteNumbers = new Array(byteCharacters.length);
      
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: contentType });
      
      // Create a download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      setTimeout(() => {
        URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 100);
    } catch (error) {
      console.error('Error downloading file:', error);
      alert(`Error downloading file: ${error.message}`);
    }
  };
  
  //general download function
  const downloadFile = (content, filename) => {
    if (contentType.includes('text/') || contentType.includes('application/json')) {
      // For text files, first decode the base64 properly
      try {
        const binaryString = atob(content);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        const decoder = new TextDecoder('utf-8');
        const decodedText = decoder.decode(bytes);
        downloadTextFile(decodedText, filename);
      } catch (error) {
        console.error('Error decoding text for download:', error);
        // Fallback to binary download if decoding fails
        downloadBinaryFile(content, filename);
      }
    } else {
      downloadBinaryFile(content, filename);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' bytes';
    if (bytes < 1048576) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / 1048576).toFixed(2) + ' MB';
  };

  //delete file
  const handleDelete = async (e) => {
    e.preventDefault();
    
    if (!fileId.trim()) {
      setError('Please enter a file ID');
      return;
    }

    setError('');
    setSuccess('');
    setDeleting(true);

    try {
      const result = await scrapedFileService.deleteFile(fileId);
      setSuccess(result.message || 'File deleted successfully');
      setFileId('');
      setFileContent(null);
      setContentType('');
      setRetrievedFile(null);
      setIsBase64(false);
    } catch (err) {
      console.error('Delete error:', err);
      setError(`Delete failed: ${err.message || 'The file may not exist or the API may be unavailable.'}`);
    } finally {
      setDeleting(false);
    }
  };

return (
<div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
  <h2 className="text-2xl font-bold mb-6 text-gray-800">Scraped File Management</h2>

  {error && (
    <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
      {error}
    </div>
  )}

  {success && (
    <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">
      {success}
    </div>
  )}

  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
    {/* File Upload Section */}
    <div className="mb-8">
      <h3 className="text-xl font-semibold mb-4 text-gray-700">Upload Scraped File</h3>
      <form onSubmit={handleUpload} className="space-y-4">
        <div>
          <label className="block text-gray-700 mb-2">Select File</label>
          <input
            id="file-upload"
            type="file"
            onChange={handleFileChange}
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
          />
          
          {fileDetails && (
            <div className="mt-2 text-sm text-gray-600">
              <p>Original name: {fileDetails.name}</p>
              <p>Type: {fileDetails.type}</p>
              <p>Size: {fileDetails.size}</p>
            </div>
          )}
        </div>

        {selectedFile && (
          <>
            <div>
              <label className="block text-gray-700 mb-2">Custom Filename</label>
              <input
                type="text"
                value={customFilename}
                onChange={handleCustomFilenameChange}
                placeholder="Enter custom filename"
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Special characters will be replaced with underscores
              </p>
            </div>
            
            <div>
              <label className="block text-gray-700 mb-2">Model</label>
              <input
                type="text"
                value={model}
                onChange={handleModelChange}
                placeholder="Enter model name"
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Required for categorizing scraped files
              </p>
            </div>
          </>
        )}

        <button
          type="submit"
          disabled={uploading || !selectedFile || !model.trim()}
          className={`w-full py-2 px-4 rounded text-white font-semibold
            ${uploading || !selectedFile || !model.trim() ? 'bg-blue-300' : 'bg-blue-600 hover:bg-blue-700'}`}
        >
          {uploading ? 'Uploading...' : 'Upload File'}
        </button>
      </form>
    </div>

    {/* File Operations Section */}
    <div>
      <h3 className="text-xl font-semibold mb-4 text-gray-700">File Operations</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-gray-700 mb-2">File ID</label>
          <input
            type="text"
            value={fileId}
            onChange={handleFileIdChange}
            placeholder="Enter file ID"
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex space-x-2">
          <button
            onClick={handleGetFile}
            disabled={fetching || !fileId.trim()}
            className={`flex-1 py-2 px-4 rounded text-white font-semibold
              ${fetching || !fileId.trim() ? 'bg-blue-300' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {fetching ? 'Fetching...' : 'Get File'}
          </button>
          
          <button
            onClick={handleDelete}
            disabled={deleting || !fileId.trim()}
            className={`flex-1 py-2 px-4 rounded text-white font-semibold
              ${deleting || !fileId.trim() ? 'bg-red-300' : 'bg-red-600 hover:bg-red-700'}`}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  </div>

  {/* File Content Display Section */}
  {fileContent && (
    <div className="mt-8 p-4 border rounded-lg">
      {renderFileContent()}
    </div>
    )}
  </div>
  );
};

export default ScrapedFileManagement;