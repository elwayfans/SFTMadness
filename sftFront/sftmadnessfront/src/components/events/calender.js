import React, { useState, useEffect, useCallback } from 'react';
import { eventService } from '../../services/api/eventsService';
import { Button } from '@mui/material';
import SvgIcon from '@mui/material/SvgIcon';
import DeleteIcon from '@mui/icons-material/Delete';

//event management component
export const Calender = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  //state for event details/form
  const [currentEvent, setCurrentEvent] = useState(null);
  const [eventForm, setEventForm] = useState({
    contactId: '',
    subject: '',
    type: 'meeting', //default value
    attendees: [],
    scheduledDate: '',
    status: 'pending' //default value
  });

  //initial state for filters
  const [filters, setFilters] = useState({
    status: '',
    contactId: '',
    startDate: '',
    endDate: ''
  });

  const [isEditing, setIsEditing] = useState(false);  
  const [eventIdInput, setEventIdInput] = useState('');  
  const [newAttendee, setNewAttendee] = useState('');

  //fetch events
  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError('');
    
    try {
      const result = await eventService.getEvents(filters);
      setEvents(result.events || []);
      setSuccess('Events loaded successfully');
    } catch (err) {
      console.error('Error fetching events:', err);
      setError(err.message || 'Failed to fetch events');
    } finally {
      setLoading(false);
    }
  }, [filters]); //applies filters if applicable

  //fetch events on component mount
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

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

  //handler for form input changes
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setEventForm({
      ...eventForm,
      [name]: value
    });
  };

  //handler for attendees
  const handleAddAttendee = (e) => {
    e.preventDefault();
    if (newAttendee.trim() && !eventForm.attendees.includes(newAttendee.trim())) {
      setEventForm({
        ...eventForm,
        attendees: [...eventForm.attendees, newAttendee.trim()]
      });
      setNewAttendee('');
    }
  };

  //handler for removing attendees
  const handleRemoveAttendee = (attendeeToRemove) => {
    setEventForm({
      ...eventForm,
      attendees: eventForm.attendees.filter(attendee => attendee !== attendeeToRemove)
    });
  };

  //handler for filter changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters({
      ...filters,
      [name]: value
    });
  };

  //fetch a single event by Id
  const fetchEventById = async (id) => {
    setLoading(true);
    setError('');
    
    try {
      const result = await eventService.getEventById(id);
      setCurrentEvent(result.event);
      
      //populate form for editing event or default values if not found
      const event = result.event;
      setEventForm({
        contactId: event.contactId || '',
        subject: event.subject || '',
        type: event.type || 'meeting',
        attendees: Array.isArray(event.attendees) ? event.attendees : [],
        scheduledDate: formatDateTimeForInput(event.scheduledDate) || '',
        status: event.status || 'pending'
      });
      
      setIsEditing(true);
      setSuccess('Event loaded successfully');
    } catch (err) {
      console.error('Error fetching event:', err);
      setError(err.message || 'Failed to fetch event');
    } finally {
      setLoading(false);
    }
  };

  //create/schedule a new event
  const scheduleEvent = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      //prepare payload
      const payload = {
        ...eventForm,
        //proper format for backend
        scheduledDate: new Date(eventForm.scheduledDate).toISOString()
      };

      await eventService.scheduleEvent(payload);
      setSuccess('Event created successfully');
      
      //reset form after successful creation
      resetForm();
      
      //refresh event list
      fetchEvents();
    } catch (err) {
      console.error('Error creating event:', err);
      setError(err.message || 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  //update an existing event
  const updateEvent = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const payload = {
        ...eventForm,
        scheduledDate: new Date(eventForm.scheduledDate).toISOString()
      };

      await eventService.updateEvent(currentEvent.id, payload);
      setSuccess('Event updated successfully');
      
      //reset form and editing state
      resetForm();
      setIsEditing(false);
      setCurrentEvent(null);
      
      //refresh event list
      fetchEvents();
    } catch (err) {
      console.error('Error updating event:', err);
      setError(err.message || 'Failed to update event');
    } finally {
      setLoading(false);
    }
  };

  //delete an event
  const deleteEvent = async (id) => {
    //deletion confirmfation
    if (!window.confirm('Are you sure you want to delete this event?')) {
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      await eventService.deleteEvent(id);
      setSuccess('Event deleted successfully');
      
      //if editing this event, reset the form
      if (currentEvent && currentEvent.id === id) {
        resetForm();
        setIsEditing(false);
        setCurrentEvent(null);
      }
      
      fetchEvents();
    } catch (err) {
      console.error('Error deleting event:', err);
      setError(err.message || 'Failed to delete event');
    } finally {
      setLoading(false);
    }
  };

  //reset the form
  const resetForm = () => {
    setEventForm({
      contactId: '',
      subject: '',
      type: 'meeting',
      attendees: [],
      scheduledDate: '',
      status: 'pending'
    });
    setNewAttendee('');
    setEventIdInput('');
    setIsEditing(false);
    setCurrentEvent(null);
  };

  //apply filters if any
  const applyFilters = (e) => {
    e.preventDefault();
    fetchEvents();
  };

  //reset filters to default
  const resetFilters = () => {
    setFilters({
      status: '',
      contactId: '',
      startDate: '',
      endDate: ''
    });
    //refetch without filters
    eventService.getEvents().then(result => {
      setEvents(result.events || []);
    });
  };

  //format date-time for input field
  const formatDateTimeForInput = (isoString) => {
    if (!isoString) return '';
    
    //convert ISO string to local datetime format (YYYY-MM-DDTHH:MM)
    const date = new Date(isoString);
    
    //check if valid date
    if (isNaN(date.getTime())) return '';
    
    return date.toISOString().slice(0, 16);
  };

  const formatDateTime = (isoString) => {
    if (!isoString) return 'N/A';
    
    const options = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    
    return new Date(isoString).toLocaleString(undefined, options);
  };

  //calender form
  return (
    <div className="MainContent">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Event Management</h2>

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

      {/* Event ID Lookup Section */}
      <div className="mb-6 bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Lookup Event by ID</h3>
        <div className="flex space-x-2">
          <input
            type="text"
            value={eventIdInput}
            onChange={(e) => setEventIdInput(e.target.value)}
            placeholder="Enter event ID"
            className="flex-1 p-2 border rounded focus:ring-2 focus:ring-blue-500"
          />
          <Button
            onClick={() => {
              if (eventIdInput.trim()) {
                fetchEventById(eventIdInput.trim());
              } else {
                setError("Please enter a valid event ID");
              }
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            disabled={loading}
            variant='contained'
            size='small'
          >
            {loading ? 'Loading...' : 'Fetch Event'}
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Event Form Section */}
        <div className="md:w-1/2">
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <h3 className="text-lg font-semibold mb-4">
              {isEditing ? `Edit Event: ${currentEvent?.subject}` : 'Create New Event'}
            </h3>
            
            <form onSubmit={isEditing ? updateEvent : scheduleEvent} className="space-y-4">
              <div>
                <label className="block text-gray-700 mb-2">Contact ID <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  name="contactId"
                  value={eventForm.contactId}
                  onChange={handleFormChange}
                  required
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter school contact ID"
                />
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2">Subject <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  name="subject"
                  value={eventForm.subject}
                  onChange={handleFormChange}
                  required
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Parent-Teacher Conference"
                />
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2">Event Type <span className="text-red-500">*</span></label>
                <select
                  name="type"
                  value={eventForm.type}
                  onChange={handleFormChange}
                  required
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                >
                  <option value="meeting">Meeting</option>
                  <option value="call">Call</option>
                  <option value="email">Email</option>
                  <option value="visit">Visit</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2">Scheduled Date & Time <span className="text-red-500">*</span></label>
                <input
                  type="datetime-local"
                  name="scheduledDate"
                  value={eventForm.scheduledDate}
                  onChange={handleFormChange}
                  required
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2">Attendees</label>
                <div className="flex space-x-2">
                  <input
                    type="email"
                    value={newAttendee}
                    onChange={(e) => setNewAttendee(e.target.value)}
                    placeholder="Add attendee email"
                    className="flex-1 p-2 border rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <Button
                    type="button"
                    onClick={handleAddAttendee}
                    className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
                    variant='contained'
                    size='small'
                    color='warning'
                  >
                    Add
                  </Button>
                </div>
                
                {eventForm.attendees.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-600 mb-1">Attendees:</p>
                    <div className="flex flex-wrap gap-2">
                      {eventForm.attendees.map((attendee, index) => (
                        <div key={index} className="bg-blue-100 text-blue-800 rounded-full px-3 py-1 text-sm flex items-center">
                          {attendee}
                          <button
                            type="button"
                            onClick={() => handleRemoveAttendee(attendee)}
                            className="ml-2 text-blue-600 hover:text-blue-800"
                          >
                            &times;
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {isEditing && (
                <div>
                  <label className="block text-gray-700 mb-2">Status</label>
                  <select
                    name="status"
                    value={eventForm.status}
                    onChange={handleFormChange}
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="accepted">Accepted</option>
                    <option value="denied">Denied</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              )}
              
              <div className="flex space-x-2">
                <Button
                  type="submit"
                  disabled={loading}
                  className={`py-2 px-4 rounded text-white font-semibold flex-1
                    ${loading ? 'bg-blue-300' : 'bg-blue-600 hover:bg-blue-700'}`}
                  variant='contained'
                  size='small'
                  color='warning'
                >
                  {loading ? 'Processing...' : isEditing ? 'Update Event' : 'Schedule Event'}
                </Button>
                
                {isEditing && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="py-2 px-4 bg-gray-300 hover:bg-gray-400 rounded text-gray-800 font-semibold"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
          
          {/* Filter Section */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Filter Events</h3>
            
            <form onSubmit={applyFilters} className="space-y-4">
              <div>
                <label className="block text-gray-700 mb-2">Status</label>
                <select
                  name="status"
                  value={filters.status}
                  onChange={handleFilterChange}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="accepted">Accepted</option>
                  <option value="denied">Denied</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2">Contact ID</label>
                <input
                  type="text"
                  name="contactId"
                  value={filters.contactId}
                  onChange={handleFilterChange}
                  placeholder="Filter by contact ID"
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2">Start Date (From)</label>
                <input
                  type="date"
                  name="startDate"
                  value={filters.startDate}
                  onChange={handleFilterChange}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2">End Date (To)</label>
                <input
                  type="date"
                  name="endDate"
                  value={filters.endDate}
                  onChange={handleFilterChange}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="flex space-x-2">
                <Button
                  type="submit"
                  className="py-2 px-4 bg-blue-600 hover:bg-blue-700 rounded text-white font-semibold flex-1"
                  size='small'
                  variant='contained'

                >
                  Apply Filters
                </Button>
                
                <Button
                  type="button"
                  onClick={resetFilters}
                  className=""
                  variant='contained'
                  color='warning'
                  size='small'
                >
                  Reset Filter 
                </Button>
              </div>
            </form>
          </div>
        </div>
        
        {/* Event List Section */}
        <div className="md:w-1/2">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">
              Events {loading && <span className="text-sm font-normal text-gray-500">(Loading...)</span>}
            </h3>
            
            {events.length === 0 ? (
              <p className="text-gray-500 italic">No events found. Create one using the form.</p>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {events.map(event => (
                  <div key={event.id} className="border rounded p-3 bg-white">
                    <div className="flex justify-between items-start">
                      <h4 className="font-semibold">{event.subject}</h4>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        event.status === 'completed' ? 'bg-green-100 text-green-800' :
                        event.status === 'denied' ? 'bg-red-100 text-red-800' :
                        event.status === 'accepted' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {event.status}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 mt-1">Type: {event.type}</p>
                    
                    <div className="mt-2 text-sm">
                      <p className="text-gray-600">
                        <span className="font-medium">Contact:</span> {event.contactId}
                        {event.contact && ` (${event.contact.email})`}
                      </p>
                      <p className="text-gray-600">
                        <span className="font-medium">Scheduled:</span> {formatDateTime(event.scheduledDate)}
                      </p>
                      {Array.isArray(event.attendees) && event.attendees.length > 0 && (
                        <div className="text-gray-600 mt-1">
                          <span className="font-medium">Attendees:</span>
                          <ul className="list-disc list-inside ml-2">
                            {event.attendees.map((attendee, index) => (
                              <li key={index} className="text-xs">{attendee}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-3 flex space-x-2">
                      <Button
                        onClick={() => fetchEventById(event.id)}
                        className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded"
                        variant='contained'
                        size='small'
                      >
                        {/** for the icone */}
                        <SvgIcon>
     
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                      >
                          <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4.5 12a7.5 7.5 0 0015 0m-15 0a7.5 7.5 0 1115 0m-15 0H3m16.5 0H21m-1.5 0H12m-8.457 3.077l1.41-.513m14.095-5.13l1.41-.513M5.106 17.785l1.15-.964m11.49-9.642l1.149-.964M7.501 19.795l.75-1.3m7.5-12.99l.75-1.3m-6.063 16.658l.26-1.477m2.605-14.772l.26-1.477m0 17.726l-.26-1.477M10.698 4.614l-.26-1.477M16.5 19.794l-.75-1.299M7.5 4.205L12 12m6.894 5.785l-1.149-.964M6.256 7.178l-1.15-.964m15.352 8.864l-1.41-.513M4.954 9.435l-1.41-.514M12.002 12l-3.75 6.495"
                          />
                        </svg>
                      </SvgIcon>
                        Edit
                      </Button>
                      <Button
                        onClick={() => deleteEvent(event.id)}
                        className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-sm rounded"
                        variant='contained'
                        color='error'
                        size='small'
                      >
                        <DeleteIcon />
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <Button
              onClick={fetchEvents}
              className="mt-4 w-full py-2 px-4 bg-gray-200 hover:bg-gray-300 rounded text-gray-800 font-semibold"
              
            >
              Refresh Events
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Calender;