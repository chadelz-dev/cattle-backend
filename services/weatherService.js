const axios = require('axios');
const { geocode } = require('../utils/geocode');
const formatDate = require('../utils/formatDate');

const getWeatherSuggestions = async (query) => {
  try {
    console.log('weatherService.js: Fetching suggestions for query:', query);
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      query
    )}&count=5`;
    const response = await axios.get(url);
    console.log(
      'weatherService.js: Suggestions response:',
      JSON.stringify(response.data, null, 2)
    );
    return response.data;
  } catch (error) {
    console.error(
      'weatherService.js: getWeatherSuggestions error:',
      error.message
    );
    throw error;
  }
};

const getWeather = async (latitude = -32.2968, longitude = 26.4194) => {
  const params = {
    latitude,
    longitude,
    hourly: [
      'temperature_2m',
      'relative_humidity_2m',
      'wind_speed_10m',
      'precipitation',
      'soil_moisture_0_to_1cm',
      'uv_index',
      'apparent_temperature',
      'wind_gusts_10m',
      'evapotranspiration',
      'cloud_cover',
      'precipitation_probability',
      'snowfall',
    ],
    daily: [
      'temperature_2m_max',
      'temperature_2m_min',
      'precipitation_sum',
      'sunrise',
      'sunset',
      'precipitation_probability_max',
      'snowfall_sum',
    ],
    timezone: 'auto',
    forecast_days: 8,
  };

  try {
    const url = 'https://api.open-meteo.com/v1/forecast';
    const queryString = new URLSearchParams({
      latitude: params.latitude.toString(),
      longitude: params.longitude.toString(),
      hourly: params.hourly.join(','),
      daily: params.daily.join(','),
      timezone: params.timezone,
      forecast_days: params.forecast_days.toString(),
    }).toString();
    console.log(
      'weatherService.js: Weather API request URL:',
      `${url}?${queryString}`
    );
    const response = await axios.get(`${url}?${queryString}`, {
      timeout: 5000,
      headers: { Accept: 'application/json' },
    });
    console.log('weatherService.js: Raw axios response:', {
      status: response.status,
      headers: response.headers,
      data: JSON.stringify(response.data, null, 2),
    });
    if (!response.data || typeof response.data !== 'object') {
      throw new Error('Invalid API response: empty or non-JSON data');
    }
    return response.data;
  } catch (error) {
    console.error('weatherService.js: Weather API fetch error:', {
      message: error.message,
      code: error.code,
      response: error.response
        ? {
            status: error.response.status,
            data: error.response.data,
          }
        : null,
    });
    throw new Error(`Weather API fetch failed: ${error.message}`);
  }
};

const processWeatherData = (data) => {
  console.log(
    'weatherService.js: Processing weather data:',
    JSON.stringify(data, null, 2)
  );
  if (!data || !data.daily || !data.hourly) {
    console.error('weatherService.js: Invalid data structure:', {
      hasData: !!data,
      hasDaily: !!data?.daily,
      hasHourly: !!data?.hourly,
    });
    throw new Error('Missing daily or hourly data in response');
  }

  const getWeatherCondition = (
    precipitationProbability,
    snowfall,
    cloudCover
  ) => {
    if (snowfall > 0) return 'snowy';
    if (precipitationProbability > 50) return 'rainy';
    if (cloudCover > 80) return 'cloudy';
    return 'sunny';
  };

  const todayIndex = 0;
  const currentHour = new Date().toISOString().slice(0, 13);
  const currentIndex =
    data.hourly.time.findIndex((time) => time.startsWith(currentHour)) || 0;

  const today = {
    temperature: data.hourly.temperature_2m[currentIndex] ?? 0,
    humidity: data.hourly.relative_humidity_2m[currentIndex] ?? 0,
    windSpeed: data.hourly.wind_speed_10m[currentIndex] ?? 0,
    precipitation: data.hourly.precipitation[currentIndex] ?? 0,
    soilMoisture: data.hourly.soil_moisture_0_to_1cm[currentIndex] ?? 0,
    sunExposure: {
      sunrise: data.daily.sunrise[todayIndex] ?? null,
      sunset: data.daily.sunset[todayIndex] ?? null,
    },
    heatIndex: data.hourly.apparent_temperature[currentIndex] ?? 0,
    windChill: data.hourly.wind_gusts_10m[currentIndex] ?? 0,
    uvIndex: data.hourly.uv_index[currentIndex] ?? 0,
    evapotranspiration: data.hourly.evapotranspiration[currentIndex] ?? 0,
    condition: getWeatherCondition(
      data.hourly.precipitation_probability[currentIndex] ?? 0,
      data.hourly.snowfall[currentIndex] ?? 0,
      data.hourly.cloud_cover[currentIndex] ?? 0
    ),
  };

  // Compute daily averages for hourly fields
  const getDailyAverage = (hourlyData, date) => {
    const startHour = data.hourly.time.findIndex((time) =>
      time.startsWith(date)
    );
    if (startHour === -1) return 0;
    const endHour = startHour + 24;
    const dayData = hourlyData.slice(startHour, endHour);
    if (dayData.length === 0) return 0;
    return dayData.reduce((sum, val) => sum + (val || 0), 0) / dayData.length;
  };

  const sevenDay = data.daily.time.slice(1, 8).map((time, i) => ({
    date: formatDate(time),
    maxTemp: data.daily.temperature_2m_max[i + 1] ?? 0,
    minTemp: data.daily.temperature_2m_min[i + 1] ?? 0,
    precipitation: data.daily.precipitation_sum[i + 1] ?? 0,
    precipitationProbability:
      data.daily.precipitation_probability_max[i + 1] ?? 0,
    snowfall: data.daily.snowfall_sum[i + 1] ?? 0,
    sunrise: data.daily.sunrise[i + 1] ?? null,
    sunset: data.daily.sunset[i + 1] ?? null,
    windSpeed: getDailyAverage(data.hourly.wind_speed_10m, time),
    humidity: getDailyAverage(data.hourly.relative_humidity_2m, time),
    condition: getWeatherCondition(
      data.daily.precipitation_probability_max[i + 1] ?? 0,
      data.daily.snowfall_sum[i + 1] ?? 0,
      getDailyAverage(data.hourly.cloud_cover, time)
    ),
  }));

  return { today, sevenDay };
};

module.exports = { getWeather, processWeatherData, getWeatherSuggestions };
