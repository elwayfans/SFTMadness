import { getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';

//send email
//get conversation history  - not yet implemented
//email:

export const emailService = {
  //send email
  sendEmail: async (emailData) => {
    try {
      const session = await fetchAuthSession();
      if (!session.tokens?.idToken) {
        throw new Error('Authentication required');
      }
      const token = session.tokens.idToken.toString();
      
      //checks for required email data and if not provided, sets default values
      const requestBody = {
        email: emailData.email || emailData.recipient || emailData.to,
        subject: emailData.subject || 'Message from SFT AI',
        body_text: emailData.body_text || emailData.text || emailData.plainText || '',
        body_html: emailData.body_html || emailData.html || emailData.htmlContent || '',
        thread_id: emailData.thread_id || emailData.threadId || null
      };
            
      const response = await fetch(`${process.env.REACT_APP_API_ENDPOINT}/sendEmail`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Origin': window.location.origin
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error (${response.status}): ${errorText}`);
        throw new Error(`Failed to send email: ${response.status}`);
      }
      
      const responseData = await response.json();
      return {
        success: true,
        messageId: responseData.messageId,
        message: responseData.message
      };
    } catch (error) {
      console.error('Error sending email:', error);
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

export default emailService;