const {
  getWeather,
  processWeatherData,
  getWeatherSuggestions,
} = require('../services/weatherService');

module.exports = (app) => {
  app.get('/api/weather', async (req, res) => {
    try {
      const { latitude, longitude } = req.query;
      const data = await getWeather(latitude || -32.2968, longitude || 26.4194);
      const processed = processWeatherData(data);
      res.json(processed);
    } catch (error) {
      console.error('Weather route error:', error);
      res
        .status(500)
        .json({ error: 'Weather fetch error', details: error.message });
    }
  });

  app.get('/api/weather/suggestions', async (req, res) => {
    try {
      const { q } = req.query;
      if (!q)
        return res.status(400).json({ error: 'Query parameter required' });
      const suggestions = await getWeatherSuggestions(q);
      res.json(suggestions);
    } catch (error) {
      console.error('Weather suggestions route error:', error);
      res
        .status(500)
        .json({ error: 'Suggestions fetch error', details: error.message });
    }
  });
};
