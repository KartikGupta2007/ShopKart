/**
 * Fills the products collection with a demo catalogue.
 *
 *   npm run seed
 *
 * This REPLACES every existing product, so it stays a development-only tool.
 * The catalogue is deliberately mixed: four categories, a few low-stock items
 * and one sold-out product, so every UI state has something to render.
 */
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Product = require("../models/product.model");

const image = (id) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=800&q=80`;

const PRODUCTS = [
  {
    name: "Noise Cancelling Headphones",
    description:
      "Wireless over-ear headphones with active noise cancellation, 40-hour battery life and a memory-foam headband built for long listening sessions.",
    price: 4999,
    category: "Electronics",
    image: image("1505740420928-5e560c06d30e"),
    stock: 25,
  },
  {
    name: "Mechanical Keyboard",
    description:
      "RGB mechanical keyboard with hot-swappable blue switches, a solid aluminium frame and per-key backlighting you can program from the desktop app.",
    price: 2999,
    category: "Electronics",
    image: image("1587829741301-dc798b83add3"),
    stock: 10,
  },
  {
    name: "Fitness Smartwatch",
    description:
      "Tracks heart rate, sleep and 20 workout modes on a bright AMOLED display. Water resistant to 50 m and runs a full week on one charge.",
    price: 3499,
    category: "Electronics",
    image: image("1523275335684-37898b6baf30"),
    stock: 4,
  },
  {
    name: 'Ultrabook 14" Laptop',
    description:
      "A 1.2 kg aluminium ultrabook with a 14-inch 2.8K display, 16 GB of RAM and a 512 GB SSD — enough for a full dev environment without the weight.",
    price: 68999,
    category: "Electronics",
    image: image("1496181133206-80ce9b88a853"),
    stock: 6,
  },
  {
    name: "Smartphone Pro 5G",
    description:
      "6.7-inch 120 Hz display, triple 50 MP camera system and a 5000 mAh battery with 65 W fast charging. Dual SIM with 5G on both slots.",
    price: 27999,
    category: "Electronics",
    image: image("1511707171634-5f897ff02aa9"),
    stock: 0,
  },
  {
    name: "Bluetooth Party Speaker",
    description:
      "A 30 W portable speaker with deep bass, IPX7 water resistance and 24 hours of playback. Pair two of them for true stereo sound.",
    price: 2199,
    category: "Electronics",
    image: image("1608043152269-423dbba4e7e1"),
    stock: 18,
  },
  {
    name: "Wireless Mouse",
    description:
      "Silent-click wireless mouse with a 4000 DPI optical sensor, six programmable buttons and a rechargeable battery that lasts two months.",
    price: 899,
    category: "Electronics",
    image: image("1527864550417-7fd91fc51a46"),
    stock: 40,
  },
  {
    name: "Everyday Running Sneakers",
    description:
      "Breathable knit uppers over a responsive foam midsole, built for daily runs and long days on your feet. Available in a neutral colourway.",
    price: 2499,
    category: "Fashion",
    image: image("1542291026-7eec264c27ff"),
    stock: 15,
  },
  {
    name: "Cotton Crew T-Shirt",
    description:
      "A heavyweight 240 GSM combed-cotton tee with a ribbed crew neck that keeps its shape. Pre-shrunk, so it fits the same after every wash.",
    price: 699,
    category: "Fashion",
    image: image("1521572163474-6864f9cf17ab"),
    stock: 60,
  },
  {
    name: "Canvas Laptop Backpack",
    description:
      'Water-resistant canvas backpack with a padded 15" laptop sleeve, a hidden anti-theft pocket and a luggage strap for travel days.',
    price: 1499,
    category: "Fashion",
    image: image("1553062407-98eeb64c6a62"),
    stock: 22,
  },
  {
    name: "Polarised Sunglasses",
    description:
      "UV400 polarised lenses in a lightweight acetate frame that cuts glare without dulling colour. Ships with a hard case and cleaning cloth.",
    price: 1299,
    category: "Fashion",
    image: image("1511499767150-a48a237f0083"),
    stock: 3,
  },
  {
    name: "Classic Leather Watch",
    description:
      "A 40 mm stainless steel case on a genuine leather strap, with sapphire-coated glass and a Japanese quartz movement rated for 5 ATM.",
    price: 3999,
    category: "Fashion",
    image: image("1524592094714-0f0654e20314"),
    stock: 9,
  },
  {
    name: "Denim Jacket",
    description:
      "Mid-wash rigid denim with a classic trucker cut, copper buttons and two chest pockets. Wears in beautifully over a season.",
    price: 2799,
    category: "Fashion",
    image: image("1551028719-00167b16eac5"),
    stock: 12,
  },
  {
    name: "Atomic Habits",
    description:
      "James Clear's practical guide to building good habits and breaking bad ones, using small changes that compound into remarkable results.",
    price: 499,
    category: "Books",
    image: image("1544947950-fa07a98d237f"),
    stock: 35,
  },
  {
    name: "The Pragmatic Programmer",
    description:
      "The 20th anniversary edition of the classic on software craftsmanship — from DRY code and orthogonality to debugging and pragmatic testing.",
    price: 1150,
    category: "Books",
    image: image("1512820790803-83ca734da794"),
    stock: 8,
  },
  {
    name: "Ceramic Coffee Mug Set",
    description:
      "Four 350 ml stoneware mugs with a reactive glaze, so every piece comes out slightly different. Microwave and dishwasher safe.",
    price: 799,
    category: "Home",
    image: image("1514228742587-6b1558fcca3d"),
    stock: 30,
  },
  {
    name: "Scandinavian Table Lamp",
    description:
      "An oak-base table lamp with a linen shade that throws a warm, even light. Fitted with an inline dimmer and an E27 socket.",
    price: 1899,
    category: "Home",
    image: image("1507473885765-e6ed057f782c"),
    stock: 14,
  },
  {
    name: "Indoor Plant with Pot",
    description:
      "A low-maintenance snake plant in a matte ceramic pot. Tolerates low light, needs watering roughly once a fortnight, and filters indoor air.",
    price: 649,
    category: "Home",
    image: image("1485955900006-10f4d324d411"),
    stock: 26,
  },
  {
    name: "Drip Coffee Maker",
    description:
      "A 1.2 litre glass-carafe drip brewer with a reusable mesh filter, adjustable warming plate and a 24-hour programmable timer.",
    price: 3299,
    category: "Home",
    image: image("1495474472287-4d71bcdd2085"),
    stock: 7,
  },
  {
    name: "Ergonomic Study Chair",
    description:
      "Breathable mesh back with adjustable lumbar support, 3D armrests and a synchro-tilt mechanism that locks at four reclining positions.",
    price: 7499,
    category: "Home",
    image: image("1586023492125-27b2c045efd7"),
    stock: 5,
  },
];

const seed = async () => {
  await connectDB();

  const removed = await Product.deleteMany({});
  console.log(`Removed ${removed.deletedCount} existing product(s)`);

  // insertMany runs the schema validators, so a bad row fails here
  // rather than sitting in MongoDB waiting to break the UI.
  const inserted = await Product.insertMany(PRODUCTS);
  console.log(`Inserted ${inserted.length} product(s)`);

  const byCategory = inserted.reduce((counts, product) => {
    counts[product.category] = (counts[product.category] || 0) + 1;
    return counts;
  }, {});

  console.table(byCategory);
};

// Only run when this file is executed directly (`npm run seed`), so that
// tests can require PRODUCTS without also wiping a database.
if (require.main === module) {
  seed()
    .then(() => mongoose.disconnect())
    .then(() => process.exit(0))
    .catch(async (error) => {
      console.error("Seeding failed:", error.message);
      await mongoose.disconnect().catch(() => {});
      process.exit(1);
    });
}

module.exports = { PRODUCTS, seed };
