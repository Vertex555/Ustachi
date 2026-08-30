const { connectDB } = require('../config/db');
const { Device } = require('../models');

async function seedDevices() {
  const devices = [
    { name: 'iPhone 13', brand: 'Apple', model: 'A2633', category: 'smartphone' },
    { name: 'Samsung Galaxy S22', brand: 'Samsung', category: 'smartphone' },
    { name: 'MacBook Pro 14', brand: 'Apple', category: 'laptop' },
    { name: 'Dell XPS 15', brand: 'Dell', category: 'laptop' },
    { name: 'LG TV 55"', brand: 'LG', category: 'tv' },
    { name: 'Samsung Refrigerator', brand: 'Samsung', category: 'refrigerator' },
    { name: 'LG Washing Machine', brand: 'LG', category: 'washing_machine' },
  ];

  await Device.deleteMany({});
  await Device.insertMany(devices);
  console.log(`Seeded ${devices.length} devices`);
}

async function run() {
  await connectDB();
  await seedDevices();
  process.exit(0);
}

if (require.main === module) {
  run().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { seedDevices };
