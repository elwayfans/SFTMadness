import React, { useState, useEffect, useCallback } from 'react';
import { adminsService } from '../../services/api/adminsService';
import { userService } from '../../services/api/userService';

//admin user list component
export const AdminUsersList = ({ onUserSelect }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentUserId, setCurrentUserId] = useState(null);
  
  const [pagination, setPagination] = useState({
    total: 0,
    offset: 0,
    limit: 10,
    hasMore: false
  });
  
  const [filters, setFilters] = useState({
    role: '',
    search: ''
  });

  useEffect(() => {
    const fetchCurrentUserId = async () => {
      try {
        const dbUserId = await userService.getUserByCognitoId();
        console.log('Current user database ID:', dbUserId);
        setCurrentUserId(dbUserId);
      } catch (err) {
        console.error('Error fetching current user ID:', err);
      }
    };
    
    fetchCurrentUserId();
  }, []);

  const fetchUsers = useCallback(async (offset = 0) => {
    try {
      setLoading(true);
      setError('');

      const options = {
        ...filters,
        offset: offset,
        limit: pagination.limit
      };

      const result = await adminsService.getUsers(options);
      setUsers(result.users || []);
      setPagination(result.pagination || {
        total: 0,
        offset: 0,
        limit: 10,
        hasMore: false
      });
      
      setSuccess('Users loaded successfully');
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.limit]);

  //fetch users on initial load and when pagination changes
  useEffect(() => {
    fetchUsers(pagination.offset);
  }, [fetchUsers, pagination.offset]);

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
      fetchUsers(newOffset);
    }
  };

  const handlePrevPage = () => {
    if (pagination.offset > 0) {
      const newOffset = Math.max(0, pagination.offset - pagination.limit);
      fetchUsers(newOffset);
    }
  };

  //format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    try {
      const options = {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      };
      
      return new Date(dateString).toLocaleString(undefined, options);
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  //delete user function
  const handleDeleteUser = async (userId) => {
    //prevent users from deleting their own account
    if (userId === currentUserId) {
      setError("You cannot delete your own account from this interface. Please use the 'Delete Account' option in your profile settings.");
      return;
    }

    //delete confirmation
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      await adminsService.deleteUser(userId);
      
      //refresh user list
      fetchUsers(pagination.offset);
      
      setSuccess('User deleted successfully');
    } catch (err) {
      console.error('Error deleting user:', err);
      setError(err.message || 'Failed to delete user');
    } finally {
      setLoading(false);
    }
  };

  //reset success/error messages after 3 seconds
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess('');
        setError('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  //admin user list form
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">User Management</h2>
        
        <div className="flex space-x-2">
          <select 
            name="role"
            value={filters.role}
            onChange={handleFilterChange}
            className="p-2 border rounded"
          >
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="customer">Customer</option>
          </select>
          
          <input
            type="text"
            name="search"
            value={filters.search}
            onChange={handleFilterChange}
            placeholder="Search users..."
            className="p-2 border rounded w-64"
          />
        </div>
      </div>
      
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
      
      {loading && users.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">Loading users...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No users found. Try adjusting your filters.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-3 px-4 text-left font-semibold text-gray-700">ID</th>
                  <th className="py-3 px-4 text-left font-semibold text-gray-700">Email</th>
                  <th className="py-3 px-4 text-left font-semibold text-gray-700">Company</th>
                  <th className="py-3 px-4 text-left font-semibold text-gray-700">Role</th>
                  <th className="py-3 px-4 text-left font-semibold text-gray-700">Join Date</th>
                  <th className="py-3 px-4 text-left font-semibold text-gray-700">Data</th>
                  <th className="py-3 px-4 text-left font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map(user => (
                  <tr 
                    key={user.id} 
                    className={`hover:bg-gray-50 ${user.id === currentUserId ? 'bg-blue-50' : ''}`}
                  >
                    <td className="py-3 px-4">{user.id}</td>
                    <td className="py-3 px-4">
                      {user.email}
                      {user.id === currentUserId && (
                        <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                          You
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">{user.companyname || 'N/A'}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        user.role === 'admin' 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {user.role || 'customer'}
                      </span>
                    </td>
                    <td className="py-3 px-4">{formatDate(user.joindate)}</td>
                    <td className="py-3 px-4">
                      <div className="flex space-x-2">
                        <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-full">
                          Contacts: {user.contact_count || 0}
                        </span>
                        <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-full">
                          Files: {user.file_count || 0}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => onUserSelect(user.id)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          View
                        </button>
                        {user.id !== currentUserId ? (
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                        ) : (
                          <span className="text-gray-400 cursor-not-allowed" title="You cannot delete your own account here">
                            Delete
                          </span>
                        )}
                      </div>
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
                Showing {pagination.offset + 1} to {Math.min(pagination.offset + users.length, pagination.total)} of {pagination.total} users
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

export default AdminUsersList;