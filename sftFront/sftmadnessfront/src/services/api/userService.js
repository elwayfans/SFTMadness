import { post, get, put, del } from 'aws-amplify/api';
import { fetchAuthSession } from 'aws-amplify/auth';

const API_NAME = 'sftMadnessApi';

export const userService = {
  register: async (userData) => {
    try {
      const response = await post({
        apiName: API_NAME,
        path: '/users',
        options: {
          body: userData
        }
      });
      return response;
    } catch (error) {
      console.error('Error registering user:', error);
      throw error;
    }
  },

  getUser: async (userId) => {
    try {
      const response = await get({
        apiName: API_NAME,
        path: `/users/${userId}`
      });
      return response;
    } catch (error) {
      console.error('Error getting user:', error);
      throw error;
    }
  },

  updateUser: async (userId, userData) => {
    try {
      const response = await put({
        apiName: API_NAME,
        path: `/users/${userId}`,
        options: {
          body: userData
        }
      });
      return response;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  },

  deleteUser: async (userId) => {
    try {
      const response = await del({
        apiName: API_NAME,
        path: `/users/${userId}`
      });
      return response;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }
};