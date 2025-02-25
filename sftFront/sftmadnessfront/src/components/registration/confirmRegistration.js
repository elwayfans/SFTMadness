import React, { useState } from 'react';
import { confirmSignUp } from 'aws-amplify/auth';

export const ConfirmSignUp = ({ email, onSuccess, onCancel }) => {
  const [confirmationCode, setConfirmationCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await confirmSignUp({
        username: email,
        confirmationCode
      });
      onSuccess();
    } catch (err) {
      console.error('Confirmation error:', err);
      setError(err.message || 'Failed to confirm registration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Confirm Registration</h2>
      <p className="mb-4 text-gray-600">
        Please enter the confirmation code sent to {email}
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-gray-700 mb-2">Confirmation Code</label>
          <input
            type="text"
            value={confirmationCode}
            onChange={(e) => setConfirmationCode(e.target.value)}
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className={`flex-1 py-2 px-4 rounded text-white font-semibold
              ${loading ? 'bg-blue-300' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {loading ? 'Confirming...' : 'Confirm'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2 px-4 rounded text-gray-700 font-semibold border border-gray-300 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};