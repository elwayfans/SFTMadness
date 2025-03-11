import React, { useState, useEffect, useCallback } from 'react';
import { customsService } from '../../services/api/customsService';
import { Button } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import Slider from '@mui/material/Slider';
import Box from '@mui/material/Box';

//customs manager component
export const CustomsManager = () => {
  const [customs, setCustoms] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [customsForm, setCustomsForm] = useState({
    modelName: '',
    modelLogo: '',
    introduction: '',
    friendliness: 50,
    formality: 50,
    accent: '',
    instructions: ''
  });

  const [isEditing, setIsEditing] = useState(false);

  const fetchCustoms = useCallback(async () => {
    setLoading(true);
    setError('');
    
    try {
      const result = await customsService.getCustoms();
      setCustoms(result);
    
      //populate form with customs data
      if (result) {
        setCustomsForm({
          modelName: result.modelName || '',
          modelLogo: result.modelLogo || '',
          introduction: result.introduction || '',
          friendliness: result.friendliness || 50,
          formality: result.formality || 50,
          accent: result.accent || '',
          instructions: result.instructions || ''
        });
        setIsEditing(true);
      } else {
        resetForm();
      }
      
      setSuccess('Customs loaded successfully');
    } catch (err) {
      if (err.message.includes('404')) {
        //if no customs found, set customs to null
        setCustoms(null);
        setIsEditing(false);
      } else {
        console.error('Error fetching customs:', err);
        setError(err.message || 'Failed to fetch customs');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  //fetch customs on component mount
  useEffect(() => {
    fetchCustoms();
  }, [fetchCustoms]);

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

  //create new customs related to a user
  const createCustoms = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const result = await customsService.setCustoms(customsForm);
      setCustoms(result);
      setIsEditing(true);
      setSuccess('Customs created successfully');
    } catch (err) {
      console.error('Error creating customs:', err);
      setError(err.message || 'Failed to create customs');
    } finally {
      setLoading(false);
    }
  };

  //update existing customs related to a user
  const updateCustoms = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const result = await customsService.updateCustoms(customsForm);
      setCustoms(result);
      setSuccess('Customs updated successfully');
    } catch (err) {
      console.error('Error updating customs:', err);
      setError(err.message || 'Failed to update customs');
    } finally {
      setLoading(false);
    }
  };

  //delete customs related to a user
  const deleteCustoms = async () => {
    if (!window.confirm('Are you sure you want to delete your customs? This action cannot be undone.')) {
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      await customsService.deleteCustoms();
      setCustoms(null);
      resetForm();
      setIsEditing(false);
      setSuccess('Customs deleted successfully');
    } catch (err) {
      console.error('Error deleting customs:', err);
      setError(err.message || 'Failed to delete customs');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    
    //convert numeric values
    const processedValue = type === 'range' || type === 'number' 
      ? Number(value) 
      : value;
      
    setCustomsForm({
      ...customsForm,
      [name]: processedValue
    });
  };

  const resetForm = () => {
    setCustomsForm({
      modelName: '',
      modelLogo: '',
      introduction: '',
      friendliness: 50,
      formality: 50,
      accent: '',
      instructions: ''
    });
  };

  //customs form
  return (
    <div className="MainContent">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">AI Model Customization</h2>

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

      <div className="mb-6 flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">
            {isEditing ? 'Update Your AI Model Settings' : 'Create New AI Model Settings'}
          </h3>
          <b className="">
            Customize how your AI model appears and behaves
          </b>
        </div>
        <div className="flex space-x-2">
          <Button
          size='small'
           variant='contained'
            type="button"
            onClick={fetchCustoms}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded"
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Refresh'}
          </Button>
          
          {isEditing && (
            <Button
              type="button"
              variant='contained'
              size='small'
              color='error'
              onClick={deleteCustoms}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded"
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Delete'} <DeleteIcon/>
            </Button>
          )}
        </div>
      </div>

      <form onSubmit={isEditing ? updateCustoms : createCustoms} className="space-y-6">
        <div>
          <label className="block text-gray-700 mb-2 font-medium">Model Name <span className="text-red-500">*</span></label>
          <input
            type="text"
            name="modelName"
            value={customsForm.modelName}
            onChange={handleChange}
            required
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            placeholder="e.g. Assistant Pro, Helpful AI, etc."
          />
        </div>

        <div>
          <label className="block text-gray-700 mb-2 font-medium">Model Logo URL</label>
          <input
            type="text"
            name="modelLogo"
            value={customsForm.modelLogo}
            onChange={handleChange}
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            placeholder="https://example.com/logo.png"
          />
          <p className="text-xs text-gray-500 mt-1">Enter a URL to an image that represents your model</p>
        </div>

        <div>
          <label className="block text-gray-700 mb-2 font-medium">Introduction</label>
          <textarea
            name="introduction"
            value={customsForm.introduction}
            onChange={handleChange}
            rows="3"
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            placeholder="How the AI should introduce itself to users"
          ></textarea>
        </div>

        <div>
          <label className="block text-gray-700 mb-2 font-medium">
            Friendliness: {customsForm.friendliness}%
          </label>
          <Box width={300}>
          <Slider
            type="range"
            name="friendliness"
            
            value={customsForm.friendliness}
            onChange={handleChange}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          </Box>
          <div className="flex justify-between text-xs text-gray-500 px-1">
            <span>Formal</span>
            <span>Friendly</span>
          </div>
        </div>

        <div>
          <label className="block text-gray-700 mb-2 font-medium">
            Formality: {customsForm.formality}%
          </label>
          <Box width={300}>
          <Slider
            type="range"
            name="formality"
            value={customsForm.formality}
            onChange={handleChange}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          </Box>
          <div className="flex justify-between text-xs text-gray-500 px-1">
            <span>Casual</span>
            <span>Professional</span>
          </div>
        </div>

        <div>
          <label className="block text-gray-700 mb-2 font-medium">Accent/Dialect</label>
          <select
            name="accent"
            value={customsForm.accent}
            onChange={handleChange}
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
          >
            <option value="">No specific accent</option>
            <option value="american">American English</option>
            <option value="british">British English</option>
            <option value="australian">Australian English</option>
            <option value="canadian">Canadian English</option>
            <option value="indian">Indian English</option>
          </select>
        </div>

        <div>
          <label className="block text-gray-700 mb-2 font-medium">Special Instructions</label>
          <textarea
            name="instructions"
            value={customsForm.instructions}
            onChange={handleChange}
            rows="5"
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            placeholder="Any special instructions for how the AI should behave or respond"
          ></textarea>
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
            type="submit"
            variant='contained'
            size='small'
            color='success'
            disabled={loading}
            className={`px-6 py-2 rounded text-white font-semibold
              ${loading ? 'bg-blue-300' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {loading ? 'Processing...' : isEditing ? 'Update Customs' : 'Create Customs'}
          </Button>
        </div>
      </form>

      {customs && (
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Current Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <b className="">Model Name:</b>
              <p className="text-md">{customs.modelName}</p>
            </div>
            
            {customs.modelLogo && (
              <div>
                <p className="text-sm font-medium text-gray-600">Logo:</p>
                <div className="w-16 h-16 bg-gray-200 rounded overflow-hidden">
                  <img 
                    src={customs.modelLogo} 
                    alt="Model Logo" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="%23cccccc"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="14" fill="%23666666">Logo</text></svg>';
                    }}
                  />
                </div>
              </div>
            )}
            
            <div>
              <b className="">Friendliness:</b>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full" 
                  style={{ width: `${customs.friendliness}%` }}
                ></div>
              </div>
              <p className="text-xs text-right mt-1">{customs.friendliness}%</p>
            </div>
            
            <div>
              <b className="">Formality:</b>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-blue-600 h-2.5 rounded-ful" 
                  style={{ width: `${customs.formality}%` }}
                ></div>
              </div>
              <p className="text-xs text-right mt-1">{customs.formality}%</p>
            </div>
            
            {customs.accent && (
              <div>
                <b className="">Accent:</b>
                <p className="text-md capitalize">{customs.accent}</p>
              </div>
            )}

            {customs.introduction && (
              <div className="col-span-1 md:col-span-2">
                <b className="">Introduction:</b>
                <p className="text-md bg-white p-2 rounded border mt-1">{customs.introduction}</p>
              </div>
            )}
            
            {customs.instructions && (
              <div className="col-span-1 md:col-span-2">
                <b className="">Special Instructions:</b>
                <p className="text-md bg-white p-2 rounded border mt-1 whitespace-pre-line">{customs.instructions}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomsManager;