import axios from 'axios';
import { BASE_URL } from './config';

// Add Advance Booking (Admin - Direct Approval)
export const addAdvanceBooking = async (bookingData, token) => {
  try {
    console.log('🔍 Adding advance booking with data:', bookingData);

    const formData = new FormData();

    // Add all text fields
    formData.append('clientId', bookingData.clientId);
    formData.append('clientName', bookingData.clientName);
    formData.append('date', bookingData.date);
    formData.append('time', bookingData.time);
    formData.append('advancePayment', bookingData.advancePayment.toString());
    formData.append('description', bookingData.description);
    formData.append('phoneNumber', bookingData.phoneNumber);

    // Add image if provided
    if (bookingData.image && bookingData.image.uri) {
      formData.append('image', {
        uri: bookingData.image.uri,
        type: bookingData.image.type || 'image/jpeg',
        name: bookingData.image.name || 'client_image.jpg',
      });
    }

    const config = {
      headers: {
        'Content-Type': 'multipart/form-data',
        Authorization: `Bearer ${token}`,
      },
      timeout: 15000, // 15 second timeout
    };

    console.log(
      '🔍 Making API request to:',
      `${BASE_URL}/advance-bookings/add`,
    );
    const response = await axios.post(
      `${BASE_URL}/advance-bookings/add`,
      formData,
      config,
    );

    console.log('✅ Advance booking added successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error(
      '❌ Error adding advance booking:',
      error.response?.data || error.message,
    );
    throw {
      message: error.response?.data?.message || 'Failed to add advance booking',
      status: error.response?.status,
      data: error.response?.data,
    };
  }
};

// Get All Advance Bookings
export const getAllAdvanceBookings = async token => {
  try {
    console.log('🔍 Fetching all advance bookings...');

    const config = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      timeout: 10000, // 10 second timeout
    };

    const response = await axios.get(
      `${BASE_URL}/advance-bookings/all`,
      config,
    );

    console.log('✅ Advance bookings fetched successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error(
      '❌ Error fetching advance bookings:',
      error.response?.data || error.message,
    );
    throw {
      message:
        error.response?.data?.message || 'Failed to fetch advance bookings',
      status: error.response?.status,
      data: error.response?.data,
    };
  }
};

// Get Advance Booking by ID
export const getAdvanceBookingById = async (bookingId, token) => {
  try {
    console.log('🔍 Fetching advance booking by ID:', bookingId);

    const config = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      timeout: 10000,
    };

    const response = await axios.get(
      `${BASE_URL}/advance-bookings/${bookingId}`,
      config,
    );

    console.log('✅ Advance booking fetched successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error(
      '❌ Error fetching advance booking:',
      error.response?.data || error.message,
    );
    throw {
      message:
        error.response?.data?.message || 'Failed to fetch advance booking',
      status: error.response?.status,
      data: error.response?.data,
    };
  }
};

// Update Advance Booking Status
export const updateAdvanceBookingStatus = async (bookingId, status, token) => {
  try {
    console.log('🔍 Updating advance booking status:', { bookingId, status });

    const config = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      timeout: 10000,
    };

    const response = await axios.put(
      `${BASE_URL}/advance-bookings/status/${bookingId}`,
      { status },
      config,
    );

    console.log(
      '✅ Advance booking status updated successfully:',
      response.data,
    );
    return response.data;
  } catch (error) {
    console.error(
      '❌ Error updating advance booking status:',
      error.response?.data || error.message,
    );
    throw {
      message:
        error.response?.data?.message ||
        'Failed to update advance booking status',
      status: error.response?.status,
      data: error.response?.data,
    };
  }
};

// Delete Advance Booking
export const deleteAdvanceBooking = async (bookingId, token) => {
  try {
    console.log('🔍 Deleting advance booking:', bookingId);

    const config = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      timeout: 10000,
    };

    const response = await axios.delete(
      `${BASE_URL}/advance-bookings/${bookingId}`,
      config,
    );

    console.log('✅ Advance booking deleted successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error(
      '❌ Error deleting advance booking:',
      error.response?.data || error.message,
    );
    throw {
      message:
        error.response?.data?.message || 'Failed to delete advance booking',
      status: error.response?.status,
      data: error.response?.data,
    };
  }
};

// Get Advance Booking Statistics
export const getAdvanceBookingStats = async token => {
  try {
    console.log('🔍 Fetching advance booking statistics...');

    const config = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      timeout: 10000,
    };

    const response = await axios.get(
      `${BASE_URL}/advance-bookings/stats`,
      config,
    );

    console.log(
      '✅ Advance booking statistics fetched successfully:',
      response.data,
    );
    return response.data;
  } catch (error) {
    console.error(
      '❌ Error fetching advance booking statistics:',
      error.response?.data || error.message,
    );
    throw {
      message:
        error.response?.data?.message ||
        'Failed to fetch advance booking statistics',
      status: error.response?.status,
      data: error.response?.data,
    };
  }
};

// Get Upcoming Reminders
export const getUpcomingReminders = async token => {
  try {
    console.log('🔍 Fetching upcoming reminders...');

    const config = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      timeout: 10000,
    };

    const response = await axios.get(
      `${BASE_URL}/advance-bookings/reminders`,
      config,
    );

    console.log('✅ Upcoming reminders fetched successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error(
      '❌ Error fetching upcoming reminders:',
      error.response?.data || error.message,
    );
    throw {
      message:
        error.response?.data?.message || 'Failed to fetch upcoming reminders',
      status: error.response?.status,
      data: error.response?.data,
    };
  }
};

// Mark Reminder as Sent
export const markReminderSent = async (bookingId, token) => {
  try {
    console.log('🔍 Marking reminder as sent for booking:', bookingId);

    const config = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      timeout: 10000,
    };

    const response = await axios.put(
      `${BASE_URL}/advance-bookings/reminder/${bookingId}`,
      {},
      config,
    );

    console.log('✅ Reminder marked as sent successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error(
      '❌ Error marking reminder as sent:',
      error.response?.data || error.message,
    );
    throw {
      message:
        error.response?.data?.message || 'Failed to mark reminder as sent',
      status: error.response?.status,
      data: error.response?.data,
    };
  }
};
