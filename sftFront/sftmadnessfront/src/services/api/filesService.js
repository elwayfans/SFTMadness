import { getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';

//upload file
//get file by Id
//download a file
//delete a file by Id
//files:

export const fileService = {
    
  //upload file
  uploadFile: async (file, filename, filetype) => {
    try {
      const session = await fetchAuthSession();
      if (!session.tokens?.idToken) {
        throw new Error('Authentication required');
      }
      const token = session.tokens.idToken.toString();
      
      //sets a safe filename, if original filename is not provided or is invalid with special characters
      let safeFilename = filename || file.name || 'file';
      safeFilename = safeFilename.replace(/[,#<>:"/\\|?*\s]+/g, '_').trim();
      
      //sets a safe filetype, if original filetype is not provided
      //(fallback) base type
      const safeFiletype = filetype || file.type || 'application/octet-stream';
      
      console.log(`Uploading file. Name: ${safeFilename}, Type: ${safeFiletype}, Size: ${file.size} bytes`);
      
      //creates form data object to send file and metadata (filename, filetype, content-type, and boundary)
      const formData = new FormData();
      
      formData.append('file', file);      
      formData.append('filename', safeFilename);
      formData.append('filetype', safeFiletype);
      
      console.log('Sending form data with fields:');
      console.log(`- file: [Binary File] (${file.name}, size: ${file.size})`);
      console.log(`- filename: "${safeFilename}"`);
      console.log(`- filetype: "${safeFiletype}"`);
      
      const response = await fetch(`${process.env.REACT_APP_API_ENDPOINT}/files`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Origin': window.location.origin
        },
      });
      
      if (!response.ok) {
        let errorDetails;
        try {
          errorDetails = await response.text();
          console.error(`API Error Response: ${errorDetails}`);
        } catch (e) {
          console.error('Could not read error response:', e);
          errorDetails = 'Unknown error';
        }
        throw new Error(`Upload failed (${response.status}): ${errorDetails}`);
      }
      
      const responseData = await response.json();
      console.log('Upload successful:', responseData);
      
      return {
        success: true,
        fileId: responseData.file?.id,
        file: responseData.file
      };
    } catch (error) {
      console.error('Error in uploadFile:', error);
      throw error;
    }
  },

  //get file by Id
  getFileById: async (fileId) => {
    try {
      const session = await fetchAuthSession();
      if (!session.tokens?.idToken) {
        throw new Error('Authentication required');
      }
      const token = session.tokens.idToken.toString();
      
      console.log(`Fetching file with ID: ${fileId}`);
      
      const response = await fetch(`${process.env.REACT_APP_API_ENDPOINT}/files/${fileId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Origin': window.location.origin
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error (${response.status}): ${errorText}`);
        throw new Error(`Failed to fetch file: ${response.status}`);
      }
      
      const responseData = await response.json();
      
      return {
        success: true,
        fileData: responseData.file,
        downloadUrl: responseData.downloadUrl
      }
    } catch (error) {
      console.error('Error fetching file:', error);
      throw error;
    }
  },

  //download a file -> get file by Id and open download URL in new tab
  downloadFile: async (fileId) => {
    try {
      const { success, downloadUrl } = await fileService.getFileById(fileId);
      
      if (success && downloadUrl) {
        //triggers download to user system
        window.open(downloadUrl, '_blank');
        return true;
      } else {
        throw new Error('Failed to get download URL');
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      throw error;
    }
  },

  //delete a file by Id
  deleteFile: async (fileId) => {
    try {
      const session = await fetchAuthSession();
      if (!session.tokens?.idToken) {
        throw new Error('Authentication required');
      }
      const token = session.tokens.idToken.toString();
      
      console.log(`Deleting file with Id: ${fileId}`);
      
      const response = await fetch(`${process.env.REACT_APP_API_ENDPOINT}/files/${fileId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Origin': window.location.origin
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error (${response.status}): ${errorText}`);
        throw new Error(`Failed to delete file: ${response.status}`);
      }
      
      const result = await response.json();
      return {
        success: true,
        message: result.message
      };
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  },

  //check if user is authenticated
  isAuthenticated: async () => {
    try {
      const user = await getCurrentUser();
      const session = await fetchAuthSession();
      return !!user && !!session?.tokens?.idToken;
    } catch (error) {
      console.error('Auth check error:', error);
      return false;
    }
  }
};

export default fileService;