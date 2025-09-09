const {
  getCattle,
  getInfrastructure,
  getMapData,
} = require('../services/iotService');

module.exports = (app) => {
  app.get('/api/iot/cattle', async (req, res) => {
    try {
      const { page, limit, sort, order, search } = req.query;
      const data = await getCattle(
        parseInt(page),
        parseInt(limit),
        sort,
        order,
        search
      );
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: 'IoT Cattle error' });
    }
  });

  app.get('/api/iot/infrastructure', async (req, res) => {
    try {
      const { page, limit, sort, order, search } = req.query;
      const data = await getInfrastructure(
        parseInt(page),
        parseInt(limit),
        sort,
        order,
        search
      );
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: 'IoT Infrastructure error' });
    }
  });

  app.get('/api/iot/map', async (req, res) => {
    try {
      const data = await getMapData();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: 'IoT Map error' });
    }
  });
};
