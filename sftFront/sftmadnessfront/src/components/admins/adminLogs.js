import React, { useState, useEffect, useCallback } from 'react';
import { adminsService } from '../../services/api/adminsService';

//admin logs component
export const AdminLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUserId, setCurrentUserId] = useState(null);
  
  //pagination state
  const [pagination, setPagination] = useState({
    total: 0,
    offset: 0,
    limit: 20,
    hasMore: false
  });
  
  //filters state
  const [filters, setFilters] = useState({
    userId: '',
    actionType: '',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    const fetchCurrentUserId = async () => {
      try {
        const dbUserId = await adminsService.getUserByCognitoId();
        console.log('Current user database ID:', dbUserId);
        setCurrentUserId(dbUserId);
      } catch (err) {
        console.error('Error fetching current user ID:', err);
        setError('Failed to fetch user information. Some features may be limited.');
      }
    };
    
    fetchCurrentUserId();
  }, []);

  const fetchLogs = useCallback(async (offset = 0) => {
    try {
      setLoading(true);
      setError('');

      let userIdToUse;
      
      //use given user Id
      if (filters.userId && filters.userId.trim() !== '') {
        const numericId = parseInt(filters.userId.trim(), 10);
        if (!isNaN(numericId)) {
          userIdToUse = numericId;
        } else {
          setError(`Invalid User ID: "${filters.userId}". Please enter a valid numeric ID.`);
          setLoading(false);
          return;
        }
      } else {
        //no user Id given - fetch all logs for all users
        userIdToUse = null;
      }
      
      //fetch logs with given options/filters
      const options = {
        actionType: filters.actionType,
        startDate: filters.startDate,
        endDate: filters.endDate,
        offset: offset,
        limit: pagination.limit
      };

      console.log(`Fetching logs with userId: ${userIdToUse || 'all'}`, options);
      const result = await adminsService.getLogs(userIdToUse, options);
      
      setLogs(result.logs || []);
      //set pagination controls
      setPagination(result.pagination || {
        total: 0,
        offset: 0,
        limit: 20,
        hasMore: false
      });
    } catch (err) {
      console.error('Error fetching logs:', err);
      setError(err.message || 'Failed to load logs');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.limit]);
  
  //fetch logs on initial load and when pagination offset changes
  useEffect(() => {
    fetchLogs(pagination.offset);
  }, [fetchLogs, pagination.offset]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters({
      ...filters,
      [name]: value
    });
  };

  //pagination controls
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
        minute: '2-digit',
        second: '2-digit'
      };
      
      return new Date(dateString).toLocaleString(undefined, options);
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  //get action class for styling
  const getActionClass = (actionType) => {
    if (!actionType) return 'bg-gray-100 text-gray-800';
    
    if (actionType.includes('create')) {
      return 'bg-green-100 text-green-800';
    } else if (actionType.includes('update') || actionType.includes('edit')) {
      return 'bg-blue-100 text-blue-800';
    } else if (actionType.includes('delete')) {
      return 'bg-red-100 text-red-800';
    } else if (actionType.includes('login') || actionType.includes('auth')) {
      return 'bg-purple-100 text-purple-800';
    } else {
      return 'bg-yellow-100 text-yellow-800';
    }
  };

  //reset filters
  const handleResetFilters = () => {
    setFilters({
      userId: '',
      actionType: '',
      startDate: '',
      endDate: ''
    });
  };

  //filter for current user's logs only
  const handleShowMyLogsOnly = () => {
    if (currentUserId) {
      setFilters({
        ...filters,
        userId: currentUserId.toString()
      });
    } else {
      setError('Unable to filter by current user - user ID is unavailable');
    }
  };

  //admin logs form
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Admin Activity Logs</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}
      
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-gray-700 mb-2 text-sm">User ID (Optional)</label>
          <div className="flex">
            <input
              type="text"
              name="userId"
              value={filters.userId}
              onChange={handleFilterChange}
              placeholder="Filter by user ID"
              className="w-full p-2 border rounded-l focus:ring-2 focus:ring-blue-500"
            />
            {currentUserId && (
              <button
                onClick={handleShowMyLogsOnly}
                className="bg-blue-100 hover:bg-blue-200 text-blue-800 p-2 rounded-r border-t border-r border-b"
                title="Show only my logs"
              >
                Me
              </button>
            )}
          </div>
        </div>
        
        <div>
          <label className="block text-gray-700 mb-2 text-sm">Action Type</label>
          <select
            name="actionType"
            value={filters.actionType}
            onChange={handleFilterChange}
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Actions</option>
            <option value="create_admin">Create Admin</option>
            <option value="update_role">Update Role</option>
            <option value="delete_user">Delete User</option>
            <option value="login">Login</option>
            <option value="logout">Logout</option>
          </select>
        </div>
        
        <div>
          <label className="block text-gray-700 mb-2 text-sm">Start Date</label>
          <input
            type="date"
            name="startDate"
            value={filters.startDate}
            onChange={handleFilterChange}
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-gray-700 mb-2 text-sm">End Date</label>
          <input
            type="date"
            name="endDate"
            value={filters.endDate}
            onChange={handleFilterChange}
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      
      <div className="mb-6 flex justify-end">
        <button
          onClick={handleResetFilters}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded"
        >
          Reset Filters
        </button>
      </div>
      
      {loading && logs.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">Loading logs...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No logs found. Try adjusting your filters.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-3 px-4 text-left font-semibold text-gray-700">ID</th>
                  <th className="py-3 px-4 text-left font-semibold text-gray-700">Admin</th>
                  <th className="py-3 px-4 text-left font-semibold text-gray-700">Action</th>
                  <th className="py-3 px-4 text-left font-semibold text-gray-700">Target</th>
                  <th className="py-3 px-4 text-left font-semibold text-gray-700">Details</th>
                  <th className="py-3 px-4 text-left font-semibold text-gray-700">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4">{log.id}</td>
                    <td className="py-3 px-4">
                      {log.admin_email || `Admin ID: ${log.adminId}`}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getActionClass(log.actiontype)}`}>
                        {log.actiontype}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {log.target_email || (log.targetId ? `ID: ${log.targetId}` : 'N/A')}
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate">
                      {log.details || 'No details provided'}
                    </td>
                    <td className="py-3 px-4">
                      {formatDate(log.timestamp)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex justify-between items-center mt-6">
            <div>
              <p className="text-sm text-gray-600">
                Showing {pagination.offset + 1} to {Math.min(pagination.offset + logs.length, pagination.total)} of {pagination.total} logs
              </p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handlePrevPage}
                disabled={pagination.offset === 0}
                className={`px-3 py-1 rounded text-sm ${
                  pagination.offset === 0
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                }`}
              >
                Previous
              </button>
              <button
                onClick={handleNextPage}
                disabled={!pagination.hasMore}
                className={`px-3 py-1 rounded text-sm ${
                  !pagination.hasMore
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                }`}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminLogs;