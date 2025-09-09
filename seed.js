const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
  connectionString:
    'postgresql://neondb_owner:mypw@ep-misty-waterfall-ada3nos2-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: { rejectUnauthorized: true },
});

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
const workerNames = [
  'James Smith',
  'Emma Johnson',
  'Liam Brown',
  'Olivia Davis',
  'Noah Wilson',
  'Ava Taylor',
  'William Moore',
  'Sophia Anderson',
  'Michael Clark',
  'Isabella Lewis',
];

async function seed() {
  try {
    // Clear existing data
    await pool.query('DELETE FROM work_to_do');
    await pool.query('DELETE FROM work_done');
    await pool.query('DELETE FROM trash');
    await pool.query('DELETE FROM infrastructure');
    await pool.query('DELETE FROM workers');
    await pool.query('DELETE FROM cattle_health');
    await pool.query('DELETE FROM farmer_details');

    // Farmer_details (1 farmer, South Africa Eastern Cape)
    const hashedPassword = await bcrypt.hash('Farmer123!', 10);
    await pool.query(
      'INSERT INTO farmer_details (name, location, password_hash) VALUES ($1, $2, $3)',
      ['John Doe', 'South Africa Eastern Cape', hashedPassword]
    );

    // Cattle_health (55: 30 Angus, 25 Hereford)
    for (let i = 1; i <= 30; i++) {
      await pool.query(
        'INSERT INTO cattle_health (animal_id, age, body_temp, heart_rate, movement, location, "timestamp") VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [
          `Angus${i}`,
          Math.floor(Math.random() * 5) + 2,
          38.5 + Math.random(),
          Math.floor(70 + Math.random() * 10),
          'Grazing',
          'Pasture 1',
          '2025-09-08 20:17:00',
        ]
      );
    }
    for (let i = 1; i <= 25; i++) {
      await pool.query(
        'INSERT INTO cattle_health (animal_id, age, body_temp, heart_rate, movement, location, "timestamp") VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [
          `Hereford${i}`,
          Math.floor(Math.random() * 5) + 2,
          38.5 + Math.random(),
          Math.floor(70 + Math.random() * 10),
          'Grazing',
          'Pasture 1',
          '2025-09-08 20:17:00',
        ]
      );
    }

    // Infrastructure (15 assets)
    await pool.query(
      'INSERT INTO infrastructure (sector, fence_integrity, barn_temp, humidity, air_quality, feed_level, water_level, pump_status, condition, capacity_level, "timestamp") VALUES ' +
        '($1, $2, NULL, NULL, NULL, NULL, $3, NULL, NULL, NULL, $45), ' +
        '($4, $5, NULL, NULL, NULL, NULL, $6, NULL, NULL, NULL, $45), ' +
        '($7, $8, NULL, NULL, NULL, NULL, $9, NULL, NULL, NULL, $45), ' +
        '($10, $11, NULL, NULL, NULL, NULL, $12, NULL, NULL, NULL, $45), ' +
        '($13, NULL, $14, $15, $16, NULL, NULL, NULL, NULL, NULL, $45), ' +
        '($17, NULL, $18, $19, $20, NULL, NULL, NULL, NULL, NULL, $45), ' +
        '($21, NULL, NULL, NULL, NULL, $22, NULL, NULL, NULL, NULL, $45), ' +
        '($23, NULL, NULL, $24, NULL, $25, NULL, NULL, NULL, NULL, $45), ' +
        '($26, NULL, NULL, NULL, NULL, NULL, $27, $28, NULL, NULL, $45), ' +
        '($29, NULL, $30, $31, $32, NULL, NULL, NULL, NULL, NULL, $45), ' +
        '($33, NULL, NULL, NULL, NULL, NULL, NULL, NULL, $34, NULL, $45), ' +
        '($35, $36, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, $45), ' +
        '($37, $38, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, $45), ' +
        '($39, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, $40, $45), ' +
        '($41, NULL, $42, $43, $44, NULL, NULL, NULL, NULL, NULL, $45)',
      [
        'Pasture 1',
        95,
        80,
        'Pasture 2',
        92,
        75,
        'Pasture 3',
        90,
        70,
        'Pasture 4',
        93,
        78,
        'Main Barn',
        22,
        60,
        'Good',
        'Horse Stables',
        20,
        55,
        'Excellent',
        'Feed Silo',
        85,
        'Hay Barn',
        50,
        90,
        'Water Pump Station',
        82,
        'Operational',
        'Calf Roping Arena',
        21,
        58,
        'Good',
        'Equipment Shed',
        'Operational',
        'Perimeter Fencing',
        98,
        'Cattle Corrals',
        90,
        'Manure Storage',
        60,
        'Veterinary Station',
        23,
        62,
        'Good',
        '2025-09-08 20:17:00',
      ]
    );

    // Workers (10)
    for (let i = 0; i < 10; i++) {
      await pool.query(
        'INSERT INTO workers (name, role, contact, hours, sector) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [
          workerNames[i],
          'Herder',
          `${workerNames[i].toLowerCase().replace(' ', '.')}@email.com`,
          Math.floor(40 + Math.random() * 20),
          sectors[Math.floor(Math.random() * sectors.length)],
        ]
      );
    }

    // Fetch worker IDs
    const workerResult = await pool.query('SELECT id FROM workers');
    const workerIds = workerResult.rows.map((row) => row.id);

    // Work_done (30)
    for (let i = 1; i <= 30; i++) {
      const workerId = workerIds[Math.floor(Math.random() * workerIds.length)];
      await pool.query(
        'INSERT INTO work_done (task, date, worker_id, sector, cattle_count, cost, duration, equipment, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
        [
          `Task Done ${i}`,
          '2025-09-08',
          workerId,
          sectors[Math.floor(Math.random() * sectors.length)],
          Math.floor(Math.random() * 50),
          Math.random() * 100,
          Math.random() * 8,
          'Tractor',
          'completed',
        ]
      );
    }

    // Work_to_do (30)
    for (let i = 1; i <= 30; i++) {
      const workerId = workerIds[Math.floor(Math.random() * workerIds.length)];
      await pool.query(
        'INSERT INTO work_to_do (task, due_date, worker_id, sector, cattle_count, cost, duration, equipment, priority, nb, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
        [
          `Task To Do ${i}`,
          '2025-09-15',
          workerId,
          sectors[Math.floor(Math.random() * sectors.length)],
          Math.floor(Math.random() * 50),
          Math.random() * 100,
          Math.random() * 8,
          'Tractor',
          'High',
          false,
          'pending',
        ]
      );
    }

    // Trash (10)
    for (let i = 1; i <= 10; i++) {
      await pool.query(
        'INSERT INTO trash (item_type, item_data, deleted_at) VALUES ($1, $2, $3)',
        ['Deleted Item', `{"item": "Old Record ${i}"}`, '2025-09-08 20:17:00']
      );
    }

    console.log('Seeded ~157 rows');
  } catch (error) {
    console.error('Seeding error:', error);
  } finally {
    await pool.end();
  }
}

seed();
