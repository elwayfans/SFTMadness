
import React, { useState, useEffect } from 'react';
import { signOut } from 'aws-amplify/auth';

// Services
import { userService } from '../services/api/userService';

// User components
import { UserProfileForm } from './users/profile';
import { ForgotPasswordForm } from './users/forgotPass';
import { ConfirmPasswordResetForm } from './users/confirmPassRe';
import { DeleteAccountForm } from './users/deleteUser';

import { SchoolContactProfile } from './schoolContact/schoolContactProfile';
import { CreateContact } from './schoolContact/createSchoolContact';

import { FileManagement } from './files/fileManager';

import { Calender } from './events/calender';

import { EmailForm } from './email/emailForm';

import { CustomsManager } from './customs/customForm';

import { ConversationLogs } from './conversationLogs/conversationLogs';

//admin components
import { AdminUsersList } from './admins/adminUsersList';
import { AdminCreateUser } from './admins/createUser';
import { AdminUpdateRole } from './admins/updateUserRole';
import { AdminLogs } from './admins/adminLogs';

//button compents/Style
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import Grow from '@mui/material/Grow';
import Paper from '@mui/material/Paper';
import Popper from '@mui/material/Popper';
import MenuItem from '@mui/material/MenuItem';
import MenuList from '@mui/material/MenuList';
import './adminDashboard.css';

import { createTheme } from '@mui/material/styles';
import { ThemeProvider } from 'styled-components';


//for drop down options
const map = new Map();
map.set("delete", "Delete Account");
map.set("password", "Reset Password");
map.set("logs", "Conversation Logs");
map.set("customs", "AI Settings");
const options = ["customs", 'logs','password', 'delete'];

//admin dashboard
export const AdminDashboard = ({ onSignOut }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('profile');

  //password reset state - not yet implemented
  const [passwordResetEmail, setPasswordResetEmail] = useState('');
  const [showPasswordResetConfirmation, setShowPasswordResetConfirmation] = useState(false);
  
  //school contact state
  const [contactId, setContactId] = useState('');
  const [showContactIdInput, setShowContactIdInput] = useState(false);

  //admin state
  const [selectedUserId, setSelectedUserId] = useState(null);


  useEffect(() => {
    fetchUser();
  }, []);

  //user handlers
  //fetch user data
  const fetchUser = async () => {
    try {
      setLoading(true);
      setError('');

      const userData = await userService.getCurrentUser();
      
      console.log('User data loaded:', userData);
      
      setUser(userData);
      
      if (userData.createdFromCognito) {
        setError('Some profile information could not be loaded from the database. You can still update your profile.');
      }
    } catch (err) {
      console.error('Error fetching user data:', err);
      setError('Failed to load complete user data. Using basic profile information.');
      
      try {
        //fallback to get user data from cognito
        const cognitoUser = await userService.getCurrentUser();
        setUser({
          email: cognitoUser.username,
          username: cognitoUser.username,
          userId: cognitoUser.userId,
          companyName: '',
          phoneNumber: '',
          id: '1',
          createdFromCognito: true
        });
      } catch (cognitoErr) {
        console.error('Failed to get Cognito user data:', cognitoErr);
        setError('Failed to load user data. Please sign in again.');
      }
    } finally {
      setLoading(false);
    }
  };

  //sign out handler
  const handleSignOut = async () => {
    try {
      await signOut();
      
      if (onSignOut) {
        onSignOut();
      } else {
        //fallback if onSignOut prop not provided
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Sign out error:', error);
      setError('Error signing out. Please try again.');
    }
  };

  //delete user acct handler
  const handleDeleteSuccess = () => {
    if (onSignOut) {
      onSignOut();
    } else {
      //fallback if onSignOut prop not provided
      window.location.href = '/';
    }
  };

  //password reset handlers - not yet implemented
  const handlePasswordResetRequest = (email) => {
    setPasswordResetEmail(email);
    setShowPasswordResetConfirmation(true);
  };

  //password reset success handler - not yet implemented
  const handlePasswordResetSuccess = () => {
    setShowPasswordResetConfirmation(false);
    setActiveTab('profile');
    alert('Password has been reset successfully. Please log in with your new password.');
    handleSignOut();
  };

  //school contact handlers  
  //contact id input handler
  const handleContactIdChange = (e) => {
    setContactId(e.target.value);
  };

  //constact id submission handler
  const handleContactIdSubmit = (e) => {
    e.preventDefault();
    if (contactId.trim()) {
      setShowContactIdInput(false);
    } else {
      setError('Please enter a valid contact ID');
    }
  };
  
  //contact creation handler
  const handleContactCreated = (newContact) => {
    setContactId(newContact.id);
    setActiveTab('view-contact');
    alert(`Contact created with ID: ${newContact.id}`);
  };
  
  //contact update handlers
  const handleContactUpdate = () => {
    alert('Contact updated successfully!');
  };
  
  //contact delete handler
  const handleContactDelete = () => {
    setContactId('');
    setActiveTab('profile');
    alert('Contact deleted successfully!');
  };

  //admin handlers
  //user select handler
  const handleUserSelect = (userId) => {
    setSelectedUserId(userId);
    setActiveTab('admin-view-user');
  };

  //user creation handler
  const handleUserCreated = () => {
    alert('User created successfully!');
    setActiveTab('admin-users');
  };

  //user role update handler
  const handleRoleUpdated = () => {
    alert('User role updated successfully!');
    setActiveTab('admin-users');
  };

  //drop down btn function
  const [open, setOpen] = React.useState(false);
  const anchorRef = React.useRef(null);
  const [selectedIndex, setSelectedIndex] = React.useState(1);

  const handleClick = () => {
    console.info(`You clicked ${options[selectedIndex]}`);
    setActiveTab(options[selectedIndex]);
  };

  const handleMenuItemClick = (event, index) => {
    setSelectedIndex(index);
    setOpen(false);
  };

  const handleToggle = () => {
    setOpen((prevOpen) => !prevOpen);
  };

  const handleClose = (event) => {
    if (anchorRef.current && anchorRef.current.contains(event.target)) {
      return;
    }

    setOpen(false);
  };


  //loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  //get display name
  const displayName = user?.username || user?.email || 'User';

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto"> {/* Increased width for admin dashboard */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-blue-600">
                Admin Dashboard
              </h1>
              <p className="text-gray-600" >Welcome, {displayName}</p>
            </div>
            <Button color='secondary'
              onClick={handleSignOut}              
            >
              Sign out
            </Button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
              {error}
            </div>
          )}

          <div className="border-b border-gray-200 mb-6 overflow-x-auto">
            <nav className="flex flex-wrap space-x-4 pb-1">
              {/* Admin Tabs */}
              <div className="border-b-2 border-purple-500 px-2 py-1 mb-3 w-full">
                <h3 className="text-purple-700 font-semibold">Administration</h3>
              </div>
            
            <ButtonGroup className='BntGroup1'>
              <Button
                onClick={() => setActiveTab('admin-users')}
                variant="contained"
                
              >
                Manage Users
              </Button>
              
              <Button
                className={`py-2 px-3 border-b-2 font-medium text-sm ${
                  activeTab === 'admin-create-user'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                onClick={() => setActiveTab('admin-create-user')}
                variant="contained"
              >
                Create User
              </Button>
              <Button
                className={`py-2 px-3 border-b-2 font-medium text-sm ${
                  activeTab === 'admin-roles'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                onClick={() => setActiveTab('admin-roles')}
                variant="contained"
              >
                Manage Roles
              </Button>
              <Button
                className={`py-2 px-3 border-b-2 font-medium text-sm ${
                  activeTab === 'admin-logs'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                onClick={() => setActiveTab('admin-logs')}
                variant="contained"
              >
                Admin Logs
              </Button>
              </ButtonGroup>
              {/* Standard (customer) Tabs */}
              <div className="border-b-2 border-blue-500 px-2 py-1 mb-3 mt-4 w-full">
                <h3 className="text-blue-700 font-semibold">Standard Features</h3>
              </div>
             
            <ButtonGroup size='small'  color='warning' className='BtnGroup2'>
              <Button
                variant="contained"
                onClick={() => setActiveTab('profile')}
              >
                Profile
              </Button>
              
              <Button
                className={`py-2 px-3 border-b-2 font-medium text-sm ${
                  activeTab === 'files'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                variant="contained"
                onClick={() => setActiveTab('files')}
              >
                Files
              </Button>
              <Button
                className={`py-2 px-3 border-b-2 font-medium text-sm ${
                  activeTab === 'create-contact'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                variant="contained"
                onClick={() => {
                  setActiveTab('create-contact');
                  setShowContactIdInput(false);
                }}
              >
                Create Contact
              </Button>
              <Button
                className={`py-2 px-3 border-b-2 font-medium text-sm ${
                  activeTab === 'view-contact'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                variant="contained"
                onClick={() => {
                  setActiveTab('view-contact');
                  setShowContactIdInput(true);
                }}
              >
                View Contact
              </Button>
              <Button
                className={`py-2 px-3 border-b-2 font-medium text-sm ${
                  activeTab === 'events'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                variant="contained"
                onClick={() => setActiveTab('events')}
              >
                Events
              </Button>
              <Button
                className={`py-2 px-3 border-b-2 font-medium text-sm ${
                  activeTab === 'email'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                variant="contained"
                onClick={() => setActiveTab('email')}
              >
                Email
              </Button>

              <ButtonGroup
             variant="contained"
             ref={anchorRef}
             aria-label="Button group with a nested menu"
             size='small'
             color='warning'
             className='btnDropDownGroup'
            >
              <Button onClick={handleClick}>{map.get(options[selectedIndex])}</Button>
              <Button
                size='small'
                aria-controls={open ? 'split-button-menu' : undefined}
                aria-expanded={open ? 'true' : undefined}
                aria-label="select merge strategy"
                aria-haspopup="menu"
                onClick={handleToggle}
              >
                <ArrowDropDownIcon/>
              </Button>
            </ButtonGroup>
            <Popper
              sx={{ zIndex: 1 }}
              open={open}
              anchorEl={anchorRef.current}
              role={undefined}
              transition
              disablePortal
            >
              {({TransitionProps, placement})=> (
                <Grow
                  {...TransitionProps}
                  style={{transformOrigin:
                    placement === 'bottom' ? 'center top' : 'center bottom',
                }}
                >
                  <Paper>
                    <ClickAwayListener onClickAway={handleClose}>
                    <MenuList id="split-button-menu" autoFocusItem>
                  {options.map((option, index) => (
                    <MenuItem
                      key={option}
                      selected={index === selectedIndex}
                      onClick={(event) => handleMenuItemClick(event, index)}
                    >
                      {map.get(option)}
                    </MenuItem>
                  ))}
                </MenuList>
                    </ClickAwayListener>
                  </Paper>
                </Grow>
              )}

            </Popper>
            </ButtonGroup>
            
           
            
            
          </nav>
          </div>

          {/* ***************************************************** */}
          {/* Dashboard Content - Components */}
          {/* ***************************************************** */}

          <div className="mt-6">
            {/* Admin Components */}
            {/* User Select Component */}
            {activeTab === 'admin-users' && (
              <AdminUsersList onUserSelect={handleUserSelect} />
            )}
            
            {/* Create User Component */}
            {activeTab === 'admin-create-user' && (
              <AdminCreateUser onSuccess={handleUserCreated} />
            )}
            
            {/* Update Role Component */}
            {activeTab === 'admin-roles' && (
              <AdminUpdateRole onSuccess={handleRoleUpdated} />
            )}
            
            {/* Get Admin Logs Component */}
            {activeTab === 'admin-logs' && (
              <AdminLogs />
            )}
            
            {activeTab === 'admin-view-user' && selectedUserId && (
              <div>
                <h3 className="text-xl font-semibold mb-4">User Details</h3>
                {/* Placeholder for user details component */}
                <p>Viewing user ID: {selectedUserId}</p>
              </div>
            )}
            
            {/* Profile Component */}
            {activeTab === 'profile' && (
              <UserProfileForm 
                user={user}
                onProfileUpdate={fetchUser}
              />
            )}

            {/* Password Reset Component - not yet implemented */}
            {activeTab === 'password' && (
              <>
                {showPasswordResetConfirmation ? (
                  <ConfirmPasswordResetForm
                    email={passwordResetEmail}
                    onSuccess={handlePasswordResetSuccess}
                    onCancel={() => setShowPasswordResetConfirmation(false)}
                  />
                ) : (
                  <ForgotPasswordForm 
                    onSuccess={handlePasswordResetRequest}
                    defaultEmail={user?.email}
                  />
                )}
              </>
            )}
            
            {/* Delete Profile Component */}
            {activeTab === 'delete' && (
              <DeleteAccountForm 
                onSuccess={handleDeleteSuccess} 
                user={user}
              />
            )}
            
            {/* File Management Component */}
            {activeTab === 'files' && (
              <FileManagement />
            )}
            
            {/* School Contact Components */}
            {/* Create Contact Component */}
            {activeTab === 'create-contact' && (
              <CreateContact onSuccess={handleContactCreated} />
            )}
            
            {/* View Contact Component */}
            {activeTab === 'view-contact' && (
              <>
                {showContactIdInput && (
                  <div className="mb-6">
                    <form onSubmit={handleContactIdSubmit} className="flex space-x-2">
                      <input
                        type="text"
                        value={contactId}
                        onChange={handleContactIdChange}
                        placeholder="Enter Contact ID"
                        className="flex-1 p-2 border rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="submit"
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                      >
                        Load Contact
                      </button>
                    </form>
                  </div>
                )}
                
                {/* Contact Profile Component */}calender
                {contactId ? (
                  <SchoolContactProfile
                    contactId={contactId}
                    onUpdate={handleContactUpdate}
                    onDelete={handleContactDelete}
                  />
                ) : !showContactIdInput && (
                  <div className="text-center py-8 text-gray-500">
                    No contact ID provided. Please use the "View Contact" tab to enter an ID.
                  </div>
                )}
              </>
            )}

            {/* Calendar Component */}
            {activeTab === 'events' && (
              <Calender />
            )}

            {/* Email Component */}
            {activeTab === 'email' && (
              <EmailForm />
            )}

            {/* Customs Component */}
            {activeTab === 'customs' && (
              <CustomsManager />
            )}

            {/* Conversation Logs Component */}
            {activeTab === 'logs' && (
              <ConversationLogs />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
