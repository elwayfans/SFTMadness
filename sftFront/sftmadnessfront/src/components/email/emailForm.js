import React, { useState } from 'react';
import { emailService } from '../../services/api/emailService';
import '../../components/users/users.css'
import { Button } from '@mui/material';
//email form component
export const EmailForm = () => {
  const [emailForm, setEmailForm] = useState({
    email: '',
    subject: '',
    body_text: '',
    body_html: '',
    thread_id: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showHtmlEditor, setShowHtmlEditor] = useState(false);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setEmailForm({
      ...emailForm,
      [name]: value
    });

    //update HTML content if in plain text mode and if HTML content is empty or matches previous text
    //if the name is body_text and the showHtmlEditor is false
    //then update the emailForm with the body_html value
    if (name === 'body_text' && !showHtmlEditor) {
      setEmailForm(prevForm => ({
        ...prevForm,
        body_html: formatTextToHtml(value)
      }));
    }
  };

  //format plain text to basic HTML
  const formatTextToHtml = (text) => {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^(.*)$/gm, '$1');
  };

  //send email
  const sendEmail = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      //validate form
      if (!emailForm.email) {
        throw new Error('Recipient email is required');
      }

      if (!emailForm.subject) {
        throw new Error('Subject is required');
      }

      if (!emailForm.body_text && !emailForm.body_html) {
        throw new Error('Message content is required');
      }

      const result = await emailService.sendEmail(emailForm);
      setSuccess(`Email sent successfully! Message ID: ${result.messageId}`);
      
      //clear form except thread_id for follow-up emails
      const threadId = emailForm.thread_id;
      setEmailForm({
        email: '',
        subject: '',
        body_text: '',
        body_html: '',
        thread_id: threadId
      });
    } catch (err) {
      console.error('Error sending email:', err);
      setError(err.message || 'Failed to send email');
    } finally {
      setLoading(false);
    }
  };

  //reset form
  const resetForm = () => {
    setEmailForm({
      email: '',
      subject: '',
      body_text: '',
      body_html: '',
      thread_id: ''
    });
    setShowHtmlEditor(false);
  };

  //toggle between plain text and HTML editor
  const toggleHtmlEditor = () => {
    setShowHtmlEditor(!showHtmlEditor);
  };

  //email form
  return (
    <div className="MainContent">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Send Email</h2>

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

      <form onSubmit={sendEmail} className="space-y-4">
        <div>
          <label className="block text-gray-700 mb-2">Recipient Email <span className="text-red-500">*</span></label>
          <input
            type="email"
            name="email"
            value={emailForm.email}
            onChange={handleFormChange}
            required
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            placeholder="recipient@example.com"
          />
        </div>

        <div>
          <label className="block text-gray-700 mb-2">Subject <span className="text-red-500">*</span></label>
          <input
            type="text"
            name="subject"
            value={emailForm.subject}
            onChange={handleFormChange}
            required
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            placeholder="Email subject"
          />
        </div>

        <div>
          <div className="Swap Content btn">
            <label className="block text-gray-700">Message Content <span className="text-red-500">*</span></label>
            <Button
              type="button"
              onClick={toggleHtmlEditor}
              className="text-sm text-blue-600 hover:text-blue-800"
              variant='contained'
              size='small'
              color='warning'
            >
              {showHtmlEditor ? 'Switch to Plain Text' : 'Switch to HTML Editor'}
            </Button>
          </div>

          {!showHtmlEditor ? (
            <textarea
              name="body_text"
              value={emailForm.body_text}
              onChange={handleFormChange}
              rows="8"
              required
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 font-mono"
              placeholder="Type your message here..."
            ></textarea>
          ) : (
            <textarea
              name="body_html"
              value={emailForm.body_html}
              onChange={handleFormChange}
              rows="12"
              required
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 font-mono"
              placeholder="<p>Enter your HTML content here...</p>"
            ></textarea>
          )}

          {showHtmlEditor && (
            <div className="mt-2 text-sm text-gray-600">
              <p>HTML Tips:</p>
              <ul className="list-disc list-inside ml-2">
                <li>Use &lt;p&gt;...&lt;/p&gt; for paragraphs</li>
                <li>Use &lt;br&gt; for line breaks</li>
                <li>Use &lt;strong&gt;...&lt;/strong&gt; for bold text</li>
                <li>Use &lt;em&gt;...&lt;/em&gt; for italic text</li>
                <li>Use &lt;a href="..."&gt;...&lt;/a&gt; for links</li>
              </ul>
            </div>
          )}
        </div>

        <div>
          <label className="block text-gray-700 mb-2">Thread ID (optional)</label>
          <input
            type="text"
            name="thread_id"
            value={emailForm.thread_id}
            onChange={handleFormChange}
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            placeholder="For reply/follow-up to existing conversation"
          />
          <p className="mt-1 text-sm text-gray-500">Leave blank for new conversations</p>
        </div>

        <div className="flex justify-between pt-4">
          <Button
          variant='contained'
          size='small'
            type="button"
            onClick={resetForm}
            className="px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded text-gray-800 font-semibold"
          >
            Reset Form
          </Button>

          <Button
          variant='contained'
          size='small'
          color='success'
            type="submit"
            disabled={loading}
            className={`px-6 py-2 rounded text-white font-semibold
              ${loading ? 'bg-blue-300' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {loading ? 'Sending...' : 'Send Email'}
          </Button>
        </div>
      </form>

      {!showHtmlEditor && emailForm.body_text && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-2">Preview:</h3>
          <div className="border p-4 rounded bg-gray-50">
            <div dangerouslySetInnerHTML={{ __html: `<p>${formatTextToHtml(emailForm.body_text)}</p>` }} />
          </div>
        </div>
      )}

      {showHtmlEditor && emailForm.body_html && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-2">Preview:</h3>
          <div className="border p-4 rounded bg-gray-50">
            <div dangerouslySetInnerHTML={{ __html: emailForm.body_html }} />
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailForm;