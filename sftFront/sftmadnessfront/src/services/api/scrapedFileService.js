import { getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';

//upload file
//get file content by Id
//delete a file by Id
//files:

export const scrapedFileService = {
    
  //upload scraped file
  uploadFile: async (file, filename, filetype, model) => {
    try {
      const session = await fetchAuthSession();
      if (!session.tokens?.idToken) {
        throw new Error('Authentication required');
      }
      const token = session.tokens.idToken.toString();
      
      //set a safe filename
      let safeFilename = filename || file.name || 'file';
      safeFilename = safeFilename.replace(/[,#<>:"/\\|?*\s]+/g, '_').trim();
      
      //set a safe filetype
      const safeFiletype = filetype || file.type || 'application/octet-stream';
      
      console.log(`Uploading scraped file. Name: ${safeFilename}, Type: ${safeFiletype}, Model: ${model}, Size: ${file.size} bytes`);
      
      const formData = new FormData();
      
      formData.append('file', file);      
      formData.append('filename', safeFilename);
      formData.append('filetype', safeFiletype);
      formData.append('model', model);
      
      const response = await fetch(`${process.env.REACT_APP_API_ENDPOINT}/scrapedFiles`, {
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
      console.error('Error in uploadScrapedFile:', error);
      throw error;
    }
  },

  //get scraped file by Id
  getFileById: async (fileId) => {
    try {
      const session = await fetchAuthSession();
      if (!session.tokens?.idToken) {
        throw new Error('Authentication required');
      }
      const token = session.tokens.idToken.toString();
      
      console.log(`Fetching scraped file with ID: ${fileId}`);
      
      // First, fetch just the metadata to determine the response type
      const response = await fetch(`${process.env.REACT_APP_API_ENDPOINT}/scrapedFiles/${fileId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Origin': window.location.origin,
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch file metadata: ${response.status}`);
      }

      const responseData = await response.json();

      return {
        success: true,
        fileId: responseData.id,
        fileContent: responseData.content,
        contentType: responseData.filetype,
        filename: responseData.filename,
        model: responseData.model,
        size: responseData.size,
      };

    } catch (error) {
      console.error('Error fetching scraped file:', error);
      throw error
    } 
  },

  //delete a scraped file by Id
  deleteFile: async (fileId) => {
    try {
      const session = await fetchAuthSession();
      if (!session.tokens?.idToken) {
        throw new Error('Authentication required');
      }
      const token = session.tokens.idToken.toString();
      
      console.log(`Deleting scraped file with Id: ${fileId}`);
      
      const response = await fetch(`${process.env.REACT_APP_API_ENDPOINT}/scrapedFiles/${fileId}`, {
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
        throw new Error(`Failed to delete scraped file: ${response.status}`);
      }
      
      const result = await response.json();
      return {
        success: true,
        message: result.message
      };
    } catch (error) {
      console.error('Error deleting scraped file:', error);
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

export default scrapedFileService;