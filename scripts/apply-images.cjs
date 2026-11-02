const fs = require('fs');
const path = require('path');
const { keyFor } = require('./fetch-images.cjs');

const file = path.join(__dirname, '..', 'database.json');
const db = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const SIDE = ['Đồ uống', 'Topping', 'Món phụ', 'Món thêm'];
const exists = (key) => fs.existsSync(path.join(__dirname, '..', 'public', 'images', 'foods', `${key}.jpg`));

let foodCount = 0;
db.foods = db.foods.map((f) => {
  const key = keyFor(f.name);
  if (!key || !exists(key)) return f;
  foodCount++;
  return { ...f, image: `/images/foods/${key}.jpg` };
});

db.restaurants = db.restaurants.map((r) => {
  const menu = db.foods.filter((f) => f.restaurantId === r.id && f.image);
  const main = menu.filter((f) => !SIDE.includes(f.section));
  const best = (main.length ? main : menu).sort((a, b) => b.sold - a.sold)[0];
  return best ? { ...r, image: best.image } : r;
});

fs.writeFileSync(file, JSON.stringify(db, null, 2));
console.log(`foods with photo: ${foodCount}/${db.foods.length}, restaurants with photo: ${db.restaurants.filter((r) => r.image).length}/${db.restaurants.length}`);
