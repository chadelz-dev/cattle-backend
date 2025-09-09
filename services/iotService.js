const { Pool } = require('pg');
const dotenv = require('dotenv');
const turf = require('@turf/turf');
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const getCattle = async (
  page = 1,
  limit = 10,
  sort = 'timestamp',
  order = 'DESC',
  search = ''
) => {
  const offset = (page - 1) * limit;
  const validSortColumns = [
    'animal_id',
    'age',
    'body_temp',
    'heart_rate',
    'movement',
    'location',
    'timestamp',
  ];
  const sanitizedSort = validSortColumns.includes(sort) ? sort : 'timestamp';
  const sanitizedOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  let query = 'SELECT * FROM cattle_health';
  const params = [limit, offset];
  if (search) {
    query += ` WHERE animal_id ILIKE $3 OR movement ILIKE $3 OR location ILIKE $3 OR CAST(age AS TEXT) ILIKE $3 OR CAST(body_temp AS TEXT) ILIKE $3 OR CAST(heart_rate AS TEXT) ILIKE $3`;
    params.push(`%${search}%`);
  }
  query += ` ORDER BY ${sanitizedSort} ${sanitizedOrder} LIMIT $1 OFFSET $2`;
  console.log('getCattle query:', query, 'params:', params);
  try {
    const result = await pool.query(query, params);
    const totalQuery = `SELECT COUNT(*) FROM cattle_health${
      search
        ? ` WHERE animal_id ILIKE $1 OR movement ILIKE $1 OR location ILIKE $1 OR CAST(age AS TEXT) ILIKE $1 OR CAST(body_temp AS TEXT) ILIKE $1 OR CAST(heart_rate AS TEXT) ILIKE $1`
        : ''
    }`;
    const totalParams = search ? [`%${search}%`] : [];
    console.log('getCattle total query:', totalQuery, 'params:', totalParams);
    const total = await pool.query(totalQuery, totalParams);
    const response = {
      data: result.rows,
      total: parseInt(total.rows[0].count),
    };
    console.log('getCattle response:', JSON.stringify(response, null, 2));
    return response;
  } catch (error) {
    console.error('getCattle error:', error.message);
    throw error;
  }
};

const getInfrastructure = async (
  page = 1,
  limit = 10,
  sort = 'timestamp',
  order = 'DESC',
  search = ''
) => {
  const offset = (page - 1) * limit;
  const validSortColumns = [
    'sector',
    'fence_integrity',
    'barn_temp',
    'humidity',
    'air_quality',
    'feed_level',
    'water_level',
    'pump_status',
    'condition',
    'capacity_level',
    'timestamp',
  ];
  const sanitizedSort = validSortColumns.includes(sort) ? sort : 'timestamp';
  const sanitizedOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  let query = 'SELECT * FROM infrastructure';
  const params = [limit, offset];
  if (search) {
    query += ` WHERE sector ILIKE $3 OR COALESCE(CAST(fence_integrity AS TEXT), '') ILIKE $3 OR COALESCE(CAST(barn_temp AS TEXT), '') ILIKE $3 OR COALESCE(CAST(humidity AS TEXT), '') ILIKE $3 OR COALESCE(air_quality, '') ILIKE $3 OR COALESCE(CAST(feed_level AS TEXT), '') ILIKE $3 OR COALESCE(CAST(water_level AS TEXT), '') ILIKE $3 OR COALESCE(pump_status, '') ILIKE $3 OR COALESCE(condition, '') ILIKE $3 OR COALESCE(CAST(capacity_level AS TEXT), '') ILIKE $3`;
    params.push(`%${search}%`);
  }
  query += ` ORDER BY ${sanitizedSort} ${sanitizedOrder} LIMIT $1 OFFSET $2`;
  console.log('getInfrastructure query:', query, 'params:', params);
  try {
    const result = await pool.query(query, params);
    const totalQuery = `SELECT COUNT(*) FROM infrastructure${
      search
        ? ` WHERE sector ILIKE $1 OR COALESCE(CAST(fence_integrity AS TEXT), '') ILIKE $1 OR COALESCE(CAST(barn_temp AS TEXT), '') ILIKE $1 OR COALESCE(CAST(humidity AS TEXT), '') ILIKE $1 OR COALESCE(air_quality, '') ILIKE $1 OR COALESCE(CAST(feed_level AS TEXT), '') ILIKE $1 OR COALESCE(CAST(water_level AS TEXT), '') ILIKE $1 OR COALESCE(pump_status, '') ILIKE $1 OR COALESCE(condition, '') ILIKE $1 OR COALESCE(CAST(capacity_level AS TEXT), '') ILIKE $1`
        : ''
    }`;
    const totalParams = search ? [`%${search}%`] : [];
    console.log(
      'getInfrastructure total query:',
      totalQuery,
      'params:',
      totalParams
    );
    const total = await pool.query(totalQuery, totalParams);
    const response = {
      data: result.rows,
      total: parseInt(total.rows[0].count),
    };
    console.log(
      'getInfrastructure response:',
      JSON.stringify(response, null, 2)
    );
    return response;
  } catch (error) {
    console.error('getInfrastructure error:', error.message);
    throw error;
  }
};

const getMapData = async () => {
  const bbox = [24.4, -33.7, 24.6, -33.5]; // Centered on -33.6°N, 24.5°E
  const points = turf.randomPoint(144, { bbox });
  const clusters = turf.clustersDbscan(points, 0.05);
  return clusters;
};

const simulateIotUpdate = async () => {
  const breeds = ['Angus', 'Hereford'];
  await pool.query(
    'INSERT INTO cattle_health (animal_id, age, body_temp, heart_rate, movement, location) VALUES ($1, $2, $3, $4, $5, $6)',
    [
      `${breeds[Math.floor(Math.random() * 2)]}${
        Math.floor(Math.random() * 144) + 1
      }`,
      Math.floor(Math.random() * 5) + 2,
      38.5 + Math.random(),
      Math.floor(70 + Math.random() * 10),
      'Grazing',
      'Pasture 1',
    ]
  );
  const sectors = [
    'Pasture 1',
    'Pasture 2',
    'Pasture 3',
    'Pasture 4',
    'Main Barn',
    'Horse Stables',
    'Feed Silo',
    'Hay Barn',
    'Water Pump Station',
    'Calf Roping Arena',
    'Equipment Shed',
    'Perimeter Fencing',
    'Cattle Corrals',
    'Manure Storage',
    'Veterinary Station',
  ];
  const sector = sectors[Math.floor(Math.random() * sectors.length)];
  if (
    [
      'Pasture 1',
      'Pasture 2',
      'Pasture 3',
      'Pasture 4',
      'Perimeter Fencing',
      'Cattle Corrals',
    ].includes(sector)
  ) {
    await pool.query(
      'INSERT INTO infrastructure (sector, fence_integrity, water_level, timestamp) VALUES ($1, $2, $3, CURRENT_TIMESTAMP) ON CONFLICT (sector) DO UPDATE SET fence_integrity = EXCLUDED.fence_integrity, water_level = EXCLUDED.water_level, timestamp = EXCLUDED.timestamp',
      [
        sector,
        Math.floor(90 + Math.random() * 10),
        Math.floor(70 + Math.random() * 30),
      ]
    );
  } else if (
    [
      'Main Barn',
      'Horse Stables',
      'Calf Roping Arena',
      'Veterinary Station',
    ].includes(sector)
  ) {
    await pool.query(
      'INSERT INTO infrastructure (sector, barn_temp, humidity, air_quality, timestamp) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) ON CONFLICT (sector) DO UPDATE SET barn_temp = EXCLUDED.barn_temp, humidity = EXCLUDED.humidity, air_quality = EXCLUDED.air_quality, timestamp = EXCLUDED.timestamp',
      [
        sector,
        Math.floor(20 + Math.random() * 10),
        Math.floor(50 + Math.random() * 30),
        Math.random() > 0.2 ? 'Good' : 'Excellent',
      ]
    );
  } else if (sector === 'Feed Silo') {
    await pool.query(
      'INSERT INTO infrastructure (sector, feed_level, timestamp) VALUES ($1, $2, CURRENT_TIMESTAMP) ON CONFLICT (sector) DO UPDATE SET feed_level = EXCLUDED.feed_level, timestamp = EXCLUDED.timestamp',
      [sector, Math.floor(80 + Math.random() * 20)]
    );
  } else if (sector === 'Hay Barn') {
    await pool.query(
      'INSERT INTO infrastructure (sector, feed_level, humidity, timestamp) VALUES ($1, $2, $3, CURRENT_TIMESTAMP) ON CONFLICT (sector) DO UPDATE SET feed_level = EXCLUDED.feed_level, humidity = EXCLUDED.humidity, timestamp = EXCLUDED.timestamp',
      [
        sector,
        Math.floor(80 + Math.random() * 20),
        Math.floor(40 + Math.random() * 30),
      ]
    );
  } else if (sector === 'Water Pump Station') {
    await pool.query(
      'INSERT INTO infrastructure (sector, water_level, pump_status, timestamp) VALUES ($1, $2, $3, CURRENT_TIMESTAMP) ON CONFLICT (sector) DO UPDATE SET water_level = EXCLUDED.water_level, pump_status = EXCLUDED.pump_status, timestamp = EXCLUDED.timestamp',
      [
        sector,
        Math.floor(70 + Math.random() * 30),
        Math.random() > 0.1 ? 'Operational' : 'Faulty',
      ]
    );
  } else if (sector === 'Equipment Shed') {
    await pool.query(
      'INSERT INTO infrastructure (sector, condition, timestamp) VALUES ($1, $2, CURRENT_TIMESTAMP) ON CONFLICT (sector) DO UPDATE SET condition = EXCLUDED.condition, timestamp = EXCLUDED.timestamp',
      [sector, Math.random() > 0.1 ? 'Operational' : 'Needs Repair']
    );
  } else if (sector === 'Manure Storage') {
    await pool.query(
      'INSERT INTO infrastructure (sector, capacity_level, timestamp) VALUES ($1, $2, CURRENT_TIMESTAMP) ON CONFLICT (sector) DO UPDATE SET capacity_level = EXCLUDED.capacity_level, timestamp = EXCLUDED.timestamp',
      [sector, Math.floor(50 + Math.random() * 50)]
    );
  }
};

module.exports = {
  getCattle,
  getInfrastructure,
  getMapData,
  simulateIotUpdate,
};
