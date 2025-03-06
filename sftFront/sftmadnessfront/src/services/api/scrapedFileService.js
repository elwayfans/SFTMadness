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
      const headResponse = await fetch(`${process.env.REACT_APP_API_ENDPOINT}/scrapedFiles/${fileId}`, {
        method: 'HEAD',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Origin': window.location.origin
        }
      });
      
      if (!headResponse.ok) {
        throw new Error(`Failed to fetch file metadata: ${headResponse.status}`);
      }
      
      const contentType = headResponse.headers.get('Content-Type');
      console.log(`File content type: ${contentType}`);
      
      // For binary files like PDFs, images, etc., use blob response type
      if (contentType && 
          (contentType.includes('image/') || 
           contentType.includes('application/pdf') ||
           contentType.includes('application/vnd.openxmlformats-officedocument'))) {
        
        const response = await fetch(`${process.env.REACT_APP_API_ENDPOINT}/scrapedFiles/${fileId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Origin': window.location.origin,
            'Accept': contentType
          },
          // Request as blob for binary data
          responseType: 'blob'
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch file: ${response.status}`);
        }
        
        // Convert the blob to base64
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            // reader.result contains the base64 data URL
            const base64data = reader.result;
            // Extract just the base64 part without the prefix
            const base64Content = base64data.split(',')[1];
            
            resolve({
              success: true,
              fileContent: base64Content,
              contentType: contentType,
              isBase64: true
            });
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } 
      // For JSON and text files, use regular text response
      else {
        const response = await fetch(`${process.env.REACT_APP_API_ENDPOINT}/scrapedFiles/${fileId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Origin': window.location.origin
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch file: ${response.status}`);
        }
        
        const contentType = response.headers.get('Content-Type');
        
        // Handle JSON responses
        if (contentType && contentType.includes('application/json')) {
          try {
            const responseData = await response.json();
            return {
              success: true,
              fileData: responseData,
              contentType: contentType
            };
          } catch (e) {
            // If response isn't valid JSON but has JSON content type, get as text
            const content = await response.text();
            return {
              success: true,
              fileContent: content,
              contentType: contentType
            };
          }
        } 
        // For all other text responses
        else {
          const content = await response.text();
          return {
            success: true,
            fileContent: content,
            contentType: contentType
          };
        }
      }
    } catch (error) {
      console.error('Error fetching scraped file:', error);
      throw error;
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