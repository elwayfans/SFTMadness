import React, { useState, useEffect, useCallback } from 'react';
import { adminsService } from '../../services/api/adminsService';
import { userService } from '../../services/api/userService';

//admin update user role component
export const AdminUpdateRole = ({ onSuccess }) => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [userLoading, setUserLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentUserId, setCurrentUserId] = useState(null);

  //fetch users
  const fetchUsers = useCallback(async () => {
    try {
      setUserLoading(true);
      const result = await adminsService.getUsers({ limit: 100 });
      setUsers(result.users || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users. Please try again.');
    } finally {
      setUserLoading(false);
    }
  }, []);

  //get current user id on mount
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
    fetchUsers();
  }, [fetchUsers]);

  const handleUserSelect = (userId) => {
    const user = users.find(u => u.id === userId);
    setSelectedUser(user || null);
    setError('');
    setSuccess('');
  };

  //update user role
  const handleRoleChange = async (newRole) => {
    if (!selectedUser) {
      setError('No user selected');
      return;
    }

    if (selectedUser.role === newRole) {
      setError(`User is already a ${newRole}`);
      return;
    }

    //prevent users from demoting themselves from admin
    if (selectedUser.id === currentUserId && selectedUser.role === 'admin' && newRole !== 'admin') {
      setError("You cannot demote yourself from admin role. Another admin must do this.");
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      await adminsService.updateUserRole({
        userId: selectedUser.id,
        role: newRole
      });

      //update local state
      setUsers(users.map(user => 
        user.id === selectedUser.id 
          ? { ...user, role: newRole } 
          : user
      ));
      
      setSelectedUser({
        ...selectedUser,
        role: newRole
      });
      
      setSuccess(`User ${selectedUser.email} updated to ${newRole} successfully`);
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error('Error updating user role:', err);
      setError(err.message || 'Failed to update user role');
    } finally {
      setLoading(false);
    }
  };

  //filter users by search term
  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.companyName && user.companyName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  //user role form
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Manage User Roles</h2>

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User Selection */}
        <div>
          <h3 className="text-lg font-semibold mb-4 border-b pb-2">Select User</h3>
          
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search by email or company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          {userLoading ? (
            <div className="text-center py-4 text-gray-500">Loading users...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-4 text-gray-500">No users found</div>
          ) : (
            <div className="overflow-y-auto max-h-96 border rounded">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredUsers.map(user => (
                    <tr 
                      key={user.id}
                      onClick={() => handleUserSelect(user.id)}
                      className={`cursor-pointer hover:bg-gray-50 ${
                        selectedUser && selectedUser.id === user.id ? 'bg-blue-50' : ''
                      }`}
                    >
                      <td className="py-2 px-3 text-sm">
                        {user.email}
                        {user.id === currentUserId && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                            You
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          user.role === 'admin' 
                            ? 'bg-purple-100 text-purple-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {user.role || 'customer'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        {/* Role Management */}
        <div>
          <h3 className="text-lg font-semibold mb-4 border-b pb-2">Update Role</h3>
          
          {!selectedUser ? (
            <div className="text-center py-8 text-gray-500">
              Select a user from the list to manage their role
            </div>
          ) : (
            <div className="bg-gray-50 p-4 rounded">
              <div className="mb-4">
                <h4 className="font-medium">Selected User</h4>
                <p className="text-lg text-blue-600">
                  {selectedUser.email}
                  {selectedUser.id === currentUserId && (
                    <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                      You
                    </span>
                  )}
                </p>
                <p className="text-sm text-gray-500">
                  {selectedUser.companyName && `${selectedUser.companyName} • `}
                  ID: {selectedUser.id}
                </p>
              </div>
              
              <div className="mb-4">
                <h4 className="font-medium mb-2">Current Role</h4>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  selectedUser.role === 'admin' 
                    ? 'bg-purple-100 text-purple-800' 
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {selectedUser.role || 'customer'}
                </span>
              </div>
              
              <div className="mt-6">
                <h4 className="font-medium mb-3">Change Role To</h4>
                <div className="flex space-x-3">
                  <button
                    onClick={() => handleRoleChange('customer')}
                    disabled={
                      loading || 
                      selectedUser.role === 'customer' || 
                      (selectedUser.id === currentUserId && selectedUser.role === 'admin')
                    }
                    className={`px-4 py-2 rounded text-sm font-medium ${
                      loading || selectedUser.role === 'customer' || 
                      (selectedUser.id === currentUserId && selectedUser.role === 'admin')
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    }`}
                    title={
                      selectedUser.id === currentUserId && selectedUser.role === 'admin' 
                        ? "You cannot demote yourself from admin role" 
                        : ""
                    }
                  >
                    Customer
                  </button>
                  
                  <button
                    onClick={() => handleRoleChange('admin')}
                    disabled={loading || selectedUser.role === 'admin'}
                    className={`px-4 py-2 rounded text-sm font-medium ${
                      loading || selectedUser.role === 'admin'
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                    }`}
                  >
                    Administrator
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminUpdateRole;