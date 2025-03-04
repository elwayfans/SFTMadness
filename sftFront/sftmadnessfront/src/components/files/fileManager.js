import React, { useState } from 'react';
import fileService from '../../services/api/filesService';

//file management component
export const FileManagement = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileId, setFileId] = useState('');
  const [customFilename, setCustomFilename] = useState('');
  
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fileDetails, setFileDetails] = useState(null);

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

  const handleFileIdChange = (e) => {
    setFileId(e.target.value);
    setSuccess('');
    setError('');
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    
    if (!selectedFile) {
      setError('Please select a file to upload');
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
      console.log('Starting upload for:', sanitizedFilename);
      
      const result = await fileService.uploadFile(
        selectedFile, 
        sanitizedFilename,
        selectedFile.type
      );
      
      setSuccess(`File uploaded successfully. File ID: ${result.fileId}`);
      setSelectedFile(null);
      setFileDetails(null);
      setCustomFilename('');
      
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

  //download file -> get file by id
  const handleDownload = async (e) => {
    e.preventDefault();
    
    if (!fileId.trim()) {
      setError('Please enter a file ID');
      return;
    }

    setError('');
    setSuccess('');
    setDownloading(true);

    try {
      await fileService.downloadFile(fileId);
      setSuccess('File download initiated');
    } catch (err) {
      console.error('Download error:', err);
      setError(`Download failed: ${err.message || 'The file may not exist or the API may be unavailable.'}`);
    } finally {
      setDownloading(false);
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
      const result = await fileService.deleteFile(fileId);
      setSuccess(result.message || 'File deleted successfully');
      setFileId('');
    } catch (err) {
      console.error('Delete error:', err);
      setError(`Delete failed: ${err.message || 'The file may not exist or the API may be unavailable.'}`);
    } finally {
      setDeleting(false);
    }
  };

  //file management form
  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">File Management</h2>

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

      {/* File Upload Section */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-4 text-gray-700">Upload File</h3>
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
          )}

          <button
            type="submit"
            disabled={uploading || !selectedFile}
            className={`w-full py-2 px-4 rounded text-white font-semibold
              ${uploading || !selectedFile ? 'bg-blue-300' : 'bg-blue-600 hover:bg-blue-700'}`}
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
              onClick={handleDownload}
              disabled={downloading || !fileId.trim()}
              className={`flex-1 py-2 px-4 rounded text-white font-semibold
                ${downloading || !fileId.trim() ? 'bg-blue-300' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              {downloading ? 'Downloading...' : 'Download'}
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
  );
};

export default FileManagement;