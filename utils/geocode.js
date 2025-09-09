const axios = require('axios');

const geocode = async (location) => {
  try {
    const response = await axios.get(
      'https://nominatim.openstreetmap.org/search',
      {
        params: {
          q: location,
          format: 'json',
          limit: 1,
          addressdetails: 1,
        },
        headers: { 'User-Agent': 'FarmManagementApp/1.0' }, // Required by Nominatim
      }
    );
    const data = response.data[0];
    if (!data) {
      throw new Error(`Location not found: ${location}`);
    }
    return {
      latitude: parseFloat(data.lat),
      longitude: parseFloat(data.lon),
      display_name: data.display_name,
    };
  } catch (error) {
    console.error(`Geocode error for ${location}:`, error.message);
    return {
      latitude: 45.677,
      longitude: -111.0429,
      display_name: 'Bozeman, MT, USA',
    }; // Fallback to Bozeman
  }
};

const getLocationSuggestions = async (query) => {
  if (!query || query.length < 2) return [];
  try {
    const response = await axios.get(
      'https://nominatim.openstreetmap.org/search',
      {
        params: {
          q: query,
          format: 'json',
          limit: 3,
        },
        headers: { 'User-Agent': 'FarmManagementApp/1.0' },
      }
    );
    return response.data.map((item) => ({
      value: item.display_name,
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
    }));
  } catch (error) {
    console.error('Location suggestions error:', error.message);
    return [];
  }
};

module.exports = { geocode, getLocationSuggestions };
