import { getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';

//schedule event
//get event by Id
//get events - with query parameters
//update event
//delete event
//events:

export const eventService = {
  //schedule event
  scheduleEvent: async (eventData) => {
    try {
      const session = await fetchAuthSession();
      if (!session.tokens?.idToken) {
        throw new Error('Authentication required');
      }
      const token = session.tokens.idToken.toString();
      
      console.log('Event scheduled:', eventData);
      
      const response = await fetch(`${process.env.REACT_APP_API_ENDPOINT}/sftEvents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Origin': window.location.origin
        },
        body: JSON.stringify(eventData)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error (${response.status}): ${errorText}`);
        throw new Error(`Failed to schedule event: ${response.status}`);
      }
      
      const responseData = await response.json();
      return {
        success: true,
        event: responseData.event
      }
    } catch (error) {
      console.error('Error scheduling event:', error);
      throw error;
    }
  },

  //get event by Id
  getEventById: async (eventId) => {
    try {
      const session = await fetchAuthSession();
      if (!session.tokens?.idToken) {
        throw new Error('Authentication required');
      }
      const token = session.tokens.idToken.toString();
      
      console.log(`Fetching event with ID: ${eventId}`);
      
      const response = await fetch(`${process.env.REACT_APP_API_ENDPOINT}/sftEvents/${eventId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Origin': window.location.origin
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error (${response.status}): ${errorText}`);
        throw new Error(`Failed to fetch event: ${response.status}`);
      }
      
      const responseData = await response.json();
      return {
        success: true,
        event: responseData.event
      }
    } catch (error) {
      console.error('Error fetching event:', error);
      throw error;
    }
  },

  //get events - with query parameters
  getEvents: async (filters = {}) => {
    try {
      const session = await fetchAuthSession();
      if (!session.tokens?.idToken) {
        throw new Error('Authentication required');
      }
      const token = session.tokens.idToken.toString();
      
      //build query string from filters
      const queryParams = new URLSearchParams();
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.contactId) queryParams.append('contactId', filters.contactId);
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);
      
      //if filters are empty, query string is not appended
      const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
            
      const response = await fetch(`${process.env.REACT_APP_API_ENDPOINT}/sftEvents${queryString}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Origin': window.location.origin
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error (${response.status}): ${errorText}`);
        throw new Error(`Failed to fetch events: ${response.status}`);
      }
      
      const responseData = await response.json();
      return {
        success: true,
        events: responseData.events
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      throw error;
    }
  },

  //update event
  updateEvent: async (eventId, eventData) => {
    try {
      const session = await fetchAuthSession();
      if (!session.tokens?.idToken) {
        throw new Error('Authentication required');
      }
      const token = session.tokens.idToken.toString();
      
      console.log(`Updating event for ID: ${eventId}`, eventData);
      
      const response = await fetch(`${process.env.REACT_APP_API_ENDPOINT}/sftEvents/${eventId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Origin': window.location.origin
        },
        body: JSON.stringify(eventData)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error (${response.status}): ${errorText}`);
        throw new Error(`Failed to update event: ${response.status}`);
      }
      
      const responseData = await response.json();
      return {
        success: true,
        event: responseData.event
      }
    } catch (error) {
      console.error('Error updating event:', error);
      throw error;
    }
  },

  //delete event
  deleteEvent: async (eventId) => {
    try {
      const session = await fetchAuthSession();
      if (!session.tokens?.idToken) {
        throw new Error('Authentication required');
      }
      const token = session.tokens.idToken.toString();
      
      console.log(`Deleting event with Id: ${eventId}`);
      
      const response = await fetch(`${process.env.REACT_APP_API_ENDPOINT}/sftEvents/${eventId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Origin': window.location.origin
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error (${response.status}): ${errorText}`);
        throw new Error(`Failed to delete event: ${response.status}`);
      }
      
      const responseData = await response.json();
      return {
        success: true,
        message: responseData.message,
        eventId: responseData.eventId
      }
    } catch (error) {
      console.error('Error deleting event:', error);
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

export default eventService;