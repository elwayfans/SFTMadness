import React, { useState, useEffect, useCallback } from 'react';
import { conversationLogsService } from '../../services/api/conversationLogsService';

//conversation logs component
export const ConversationLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  //state for pagination
  const [pagination, setPagination] = useState({
    total: 0,
    offset: 0,
    limit: 10,
    hasMore: false
  });
  
  //state for filters
  const [filters, setFilters] = useState({
    contactId: '',
    interactionType: '',
    startDate: '',
    endDate: ''
  });
  
  //state for new log form
  const [logForm, setLogForm] = useState({
    contactId: '',
    interactionType: 'call',
    subject: '',
    content: ''
  });
  
  const [userId, setUserId] = useState(null);
  
  //fetch userId on component mount
  useEffect(() => {
    const getUserId = async () => {
      try {
        setLoading(true);
        const id = await conversationLogsService.getUserByCognitoId();
        console.log('Fetched user database ID:', id);
        setUserId(id);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching user ID:', err);
        setError('Could not fetch user ID. Please try refreshing the page.');
        setLoading(false);
      }
    };
    
    getUserId();
  }, []);
  
  //fetch conversation logs
  const fetchLogs = useCallback(async (offset = 0) => {
    if (!userId) {
      console.log('No user ID available, cannot fetch logs');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      console.log(`Fetching logs for user ID: ${userId}`);
      const options = {
        ...filters,
        limit: pagination.limit,
        offset: offset
      };
      
      const result = await conversationLogsService.getConversationLogs(userId, options);
      
      setLogs(result.logs || []);
      //set pagination data if available
      setPagination(result.pagination || {
        total: 0,
        offset: 0,
        limit: 10,
        hasMore: false
      });
      
      setSuccess('Logs loaded successfully');
    } catch (err) {
      console.error('Error fetching logs:', err);
      setError(err.message || 'Failed to fetch conversation logs');
    } finally {
      setLoading(false);
    }
  }, [userId, filters, pagination.limit]);
  
  //fetch logs when userId or filters change
  useEffect(() => {
    if (userId) {
      console.log('User ID changed or filters updated, fetching logs');
      fetchLogs(0); //resets to first page when filters change
    }
  }, [userId, filters, fetchLogs]);
  
  //reset messages after 3 seconds
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess('');
        setError('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);
  
  const handleLogFormChange = (e) => {
    const { name, value } = e.target;
    setLogForm({
      ...logForm,
      [name]: value
    });
  };
  
  //handle filter changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters({
      ...filters,
      [name]: value
    });
  };
  
  //create a new conversation log
  const createLog = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await conversationLogsService.logConversation(logForm);
      setSuccess('Conversation logged successfully');
      
      //reset form
      setLogForm({
        contactId: '',
        interactionType: 'call',
        subject: '',
        content: ''
      });
      
      //refresh logs
      fetchLogs(0);
    } catch (err) {
      console.error('Error creating log:', err);
      setError(err.message || 'Failed to log conversation');
    } finally {
      setLoading(false);
    }
  };
  
  //handle pagination controls
  const handleNextPage = () => {
    if (pagination.hasMore) {
      const newOffset = pagination.offset + pagination.limit;
      fetchLogs(newOffset);
    }
  };
  
  const handlePrevPage = () => {
    if (pagination.offset > 0) {
      const newOffset = Math.max(0, pagination.offset - pagination.limit);
      fetchLogs(newOffset);
    }
  };
  
  //format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    try {
      const options = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      };
      
      return new Date(dateString).toLocaleString(undefined, options);
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  //helper method to capitalize a string
  const capitalizeFirstLetter = (string) => {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1);
  };
  
  //get interaction type display class
  const getInteractionTypeClass = (type) => {
    console.log('Raw interactionType received:', type);
    console.log('Type of interactionType:', typeof type);
    
    if (!type) return 'bg-gray-100 text-gray-800';
    
    const cleanType = type.replace(/"/g, '');
    console.log('Clean interactionType:', cleanType);
  
    //return appropriate class based on interaction type
    switch(cleanType.toLowerCase()) {
      case 'call':
        return 'bg-green-100 text-green-800';
      case 'email':
        return 'bg-blue-100 text-blue-800';
      case 'meeting':
        return 'bg-purple-100 text-purple-800';
      case 'text':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  //conversation logs form
  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Conversation Logs</h2>

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

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Column: Filters and New Log Form */}
        <div className="lg:w-1/3">
          {/* New Log Form */}
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <h3 className="text-lg font-semibold mb-4">Log New Conversation</h3>
            <form onSubmit={createLog} className="space-y-4">
              <div>
                <label className="block text-gray-700 mb-2">Contact ID <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  name="contactId"
                  value={logForm.contactId}
                  onChange={handleLogFormChange}
                  required
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter school contact ID"
                />
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2">Interaction Type <span className="text-red-500">*</span></label>
                <select
                  name="interactionType"
                  value={logForm.interactionType}
                  onChange={handleLogFormChange}
                  required
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                >
                  <option value="call">Call</option>
                  <option value="email">Email</option>
                  <option value="meeting">Meeting</option>
                  <option value="text">Text Message</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2">Subject</label>
                <input
                  type="text"
                  name="subject"
                  value={logForm.subject}
                  onChange={handleLogFormChange}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                  placeholder="Brief subject or title"
                />
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2">Content <span className="text-red-500">*</span></label>
                <textarea
                  name="content"
                  value={logForm.content}
                  onChange={handleLogFormChange}
                  required
                  rows="4"
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                  placeholder="Details of the conversation..."
                ></textarea>
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-2 px-4 rounded text-white font-semibold
                  ${loading ? 'bg-blue-300' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {loading ? 'Creating...' : 'Log Conversation'}
              </button>
            </form>
          </div>
          
          {/* Filters */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Filter Logs</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 mb-2">Contact ID</label>
                <input
                  type="text"
                  name="contactId"
                  value={filters.contactId}
                  onChange={handleFilterChange}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                  placeholder="Filter by contact ID"
                />
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2">Interaction Type</label>
                <select
                  name="interactionType"
                  value={filters.interactionType}
                  onChange={handleFilterChange}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Types</option>
                  <option value="call">Call</option>
                  <option value="email">Email</option>
                  <option value="meeting">Meeting</option>
                  <option value="text">Text Message</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2">Start Date</label>
                <input
                  type="date"
                  name="startDate"
                  value={filters.startDate}
                  onChange={handleFilterChange}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2">End Date</label>
                <input
                  type="date"
                  name="endDate"
                  value={filters.endDate}
                  onChange={handleFilterChange}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setFilters({
                    contactId: '',
                    interactionType: '',
                    startDate: '',
                    endDate: ''
                  })}
                  className="w-full py-2 px-4 bg-gray-300 hover:bg-gray-400 rounded text-gray-800 font-semibold"
                >
                  Reset Filters
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Right Column: Logs Display */}
        <div className="lg:w-2/3">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                Conversation Logs {loading && <span className="text-sm font-normal text-gray-500">(Loading...)</span>}
              </h3>
              <div className="text-sm text-gray-600">
                {pagination.total > 0 && (
                  <span>Showing {pagination.offset + 1}-{Math.min(pagination.offset + logs.length, pagination.total)} of {pagination.total}</span>
                )}
              </div>
            </div>
            
            {logs.length > 0 && console.log('All properties of first log:', Object.keys(logs[0]))}
            {logs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {loading ? 'Loading...' : userId ? 'No conversation logs found. Use the form to log a new conversation.' : 'Loading user information...'}
              </div>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {logs.length > 0 && console.log('First log object:', JSON.stringify(logs[0], null, 2))}
                {logs.map(log => (
                  <div key={log.id || Math.random()} className="border rounded p-4 bg-white">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-lg">
                          {log.subject || (log.interactionType ? 
                            `${capitalizeFirstLetter(log.interactionType)} with contact ${log.contactId}` : 
                            `Interaction with contact ${log.contactId}`)}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {formatDate(log.timestamp)}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${getInteractionTypeClass(log.interactionType)}`}>
                        {console.log('Display interactionType:', log.interactiontype)}
                        {capitalizeFirstLetter(log.interactiontype ? log.interactiontype.replace(/"/g, '') : 'Unknown')}
                      </span>
                    </div>
                    
                    {log.contact && (
                      <div className="mt-2 text-sm">
                        <p className="text-gray-600">
                          <span className="font-medium">Contact:</span> {log.contact.email || log.contactId}
                          {log.contact?.phoneNumber && ` | ${log.contact.phoneNumber}`}
                        </p>
                      </div>
                    )}
                    
                    <div className="mt-3">
                      <p className="text-gray-800 whitespace-pre-line">{log.content || 'No content'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Pagination Controls */}
            {pagination.total > 0 && (
              <div className="flex justify-between mt-4">
                <button
                  onClick={handlePrevPage}
                  disabled={pagination.offset === 0 || loading}
                  className={`px-4 py-2 rounded text-sm 
                    ${pagination.offset === 0 || loading ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-gray-300 hover:bg-gray-400 text-gray-800'}`}
                >
                  Previous
                </button>
                
                <button
                  onClick={handleNextPage}
                  disabled={!pagination.hasMore || loading}
                  className={`px-4 py-2 rounded text-sm 
                    ${!pagination.hasMore || loading ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-gray-300 hover:bg-gray-400 text-gray-800'}`}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConversationLogs;