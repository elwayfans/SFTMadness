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
  const [setIsBase64] = useState(false); //isBase64 not used in this component

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
        setContentType(result.contentType || 'text/plain');
        
        if (result.fileContent) {
          // Always set the raw content even if it's an image
          setFileContent(result.fileContent);
          
          // For image content, create a viewable URL
          if (result.contentType && result.contentType.includes('image/')) {
            // Check if the content is already base64 encoded (might be from API)
            let base64Content = result.fileContent;
            
            // If it doesn't start with the base64 prefix, assume it is already encoded
            if (!base64Content.startsWith('data:')) {
              // Create data URL with proper mimetype
              base64Content = `data:${result.contentType};base64,${base64Content}`;
            }
            
            setRetrievedFile(base64Content);
            setIsBase64(true);
          }
        } else if (result.fileData) {
          // For JSON data
          setFileContent(JSON.stringify(result.fileData, null, 2));
          setContentType('application/json');
        }
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
            src={retrievedFile || `data:${contentType};base64,${fileContent}`}
            alt="File preview" 
            className="max-w-full h-auto border rounded"
          />
          <button 
            onClick={() => downloadFile(fileContent, `image${getFileExtension(contentType)}`)}
            className="mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Download Image
          </button>
        </div>
      );
    } else if (contentType.includes('application/json') || contentType.includes('text/')) {
      return (
        <div className="mt-4">
          <h4 className="text-lg font-semibold mb-2">File Content:</h4>
          <pre className="bg-gray-100 p-4 rounded-lg overflow-auto max-h-96 whitespace-pre-wrap">
            {fileContent}
          </pre>
          <button 
            onClick={() => downloadTextFile(fileContent, `text${getFileExtension(contentType)}`)}
            className="mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Download Text
          </button>
        </div>
      );
    } else if (contentType.includes('application/pdf')) {
      return (
        <div className="mt-4">
          <h4 className="text-lg font-semibold mb-2">PDF Preview:</h4>
          <div className="border rounded p-4 bg-gray-100 text-center">
            <p>PDF document available for download</p>
            <button 
              onClick={() => downloadBinaryFile(fileContent, `document${getFileExtension(contentType)}`)}
              className="mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              Download PDF
            </button>
          </div>
        </div>
      );
    } else {
      return (
        <div className="mt-4">
          <h4 className="text-lg font-semibold mb-2">File Content:</h4>
          <p>Binary file content available. Content type: {contentType}</p>
          <button 
            onClick={() => downloadBinaryFile(fileContent, `file${getFileExtension(contentType)}`)}
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
    const blob = new Blob([content], { type: 'text/plain' });
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
      // First, we need to remove any potential data URL prefix
      let cleanBase64 = base64Content;
      if (base64Content.includes('base64,')) {
        cleanBase64 = base64Content.split('base64,')[1];
      }
      
      // Convert base64 to binary
      const byteCharacters = atob(cleanBase64);
      const byteArrays = [];
      
      // Handle UTF-8 characters properly
      for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        const slice = byteCharacters.slice(offset, offset + 512);
        
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
          byteNumbers[i] = slice.charCodeAt(i);
        }
        
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
      }
      
      // Create blob and download
      const blob = new Blob(byteArrays, { type: contentType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading binary file:', error);
      alert('Error downloading file. Please try again.');
    }
  };
  
  // General download function that determines the right method based on content
  const downloadFile = (content, filename) => {
    if (contentType.includes('text/') || contentType.includes('application/json')) {
      downloadTextFile(content, filename);
    } else {
      downloadBinaryFile(content, filename);
    }
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