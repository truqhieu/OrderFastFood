// Finds real food photos on Wikimedia Commons and downloads them to public/images/foods.
// Usage: node scripts/fetch-images.cjs [key ...]   (no args = all missing)
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'public', 'images', 'foods');
const CREDITS = path.join(OUT, 'credits.json');
const UA = 'FastFoodDemo/1.0 (student project; contact: demo@fastfood.vn)';

// [key, regex on normalized dish name, Commons search query]
const RULES = [
  ['chicken-wings', /canh ga/, 'fried chicken wings'],
  ['popcorn-chicken', /popcorn/, 'popcorn chicken'],
  ['roast-chicken-leg', /dui ga/, 'roasted chicken drumstick'],
  ['korean-chicken', /ga sot cay|ga sot/, 'yangnyeom chicken'],
  ['chicken-combo', /combo/, 'fried chicken french fries meal'],
  ['fried-chicken', /ga ran/, 'fried chicken pieces'],
  ['sweet-potato-fries', /khoai lang/, 'sweet potato fries'],
  ['cheese-fries', /khoai.*pho mai/, 'cheese fries'],
  ['french-fries', /khoai tay/, 'french fries'],
  ['cola', /coca|pepsi/, 'glass of cola soft drink'],
  ['water', /nuoc suoi/, 'bottled water plastic bottle'],
  ['iced-tea', /^tra da$/, 'iced tea glass'],
  ['sugarcane', /nuoc mia/, 'sugarcane juice'],
  ['herbal-drink', /nuoc sam/, 'chrysanthemum tea'],
  ['kumquat-tea', /tra tac|nuoc sau/, 'calamansi juice'],
  ['lemon-tea', /tra chanh/, 'lemon iced tea'],
  ['fish-burger', /burger ca/, 'fish burger'],
  ['shrimp-burger', /burger tom/, 'shrimp burger'],
  ['chicken-burger', /burger ga/, 'chicken burger'],
  ['double-burger', /double/, 'double cheeseburger'],
  ['cheeseburger', /burger/, 'cheeseburger'],
  ['onion-rings', /hanh tay/, 'onion rings'],
  ['hot-dog', /hotdog/, 'hot dog sausage bun'],
  ['seafood-pizza', /pizza hai san/, 'seafood pizza'],
  ['pepperoni-pizza', /pepperoni/, 'pizza pepperoni salami'],
  ['cheese-pizza', /pizza/, 'pizza quattro formaggi'],
  ['carbonara', /carbonara/, 'spaghetti carbonara'],
  ['bolognese', /mi y/, 'spaghetti bolognese'],
  ['caesar-salad', /caesar/, 'caesar salad'],
  ['coleslaw', /bap cai/, 'coleslaw'],
  ['veg-salad', /salad/, 'vegetable salad bowl'],
  ['garlic-bread', /bo toi/, 'garlic bread'],
  ['matcha-latte', /matcha/, 'matcha latte iced'],
  ['taro-tea', /khoai mon/, 'taro bubble tea'],
  ['brown-sugar-boba', /duong den/, 'brown sugar bubble tea'],
  ['cheese-tea', /kem cheese/, 'iced milk tea'],
  ['peach-tea', /tra dao/, 'peach iced tea'],
  ['lychee-tea', /tra vai/, 'lychee tea'],
  ['bubble-tea', /tra sua/, 'bubble tea'],
  ['tapioca', /topping/, 'tapioca pearl dessert'],
  ['egg-tart', /tart trung/, 'pastel de nata'],
  ['flan', /flan/, 'creme caramel'],
  ['tiramisu', /tiramisu/, 'tiramisu'],
  ['sponge-cake', /bong lan/, 'chiffon cake slice'],
  ['profiterole', /su kem/, 'cream puff'],
  ['cheesecake', /cheesecake/, 'cheesecake slice'],
  ['com-tam', /com tam|com suon|cha trung/, 'cơm tấm'],
  ['chicken-rice', /com ga/, 'Hainanese chicken rice'],
  ['canh-chua', /canh chua/, 'canh chua'],
  ['ca-kho', /ca kho/, 'cá kho tộ'],
  ['bo-luc-lac', /luc lac/, 'bò lúc lắc'],
  ['thit-kho', /thit kho/, 'thịt kho trứng'],
  ['fried-rice', /com chien/, 'fried rice'],
  ['california-roll', /california/, 'california roll'],
  ['bento', /bento/, 'chicken teriyaki rice'],
  ['veg-rice', /com chay/, 'vegetarian rice tofu vegetables'],
  ['pho-ga', /pho ga/, 'phở gà'],
  ['tteokbokki', /tokbokki/, 'tteokbokki'],
  ['pho', /^pho /, 'phở bò'],
  ['youtiao', /^quay$/, 'youtiao'],
  ['poached-egg', /trung chan/, 'poached egg'],
  ['banh-trang-tron', /banh trang tron/, 'rice paper salad'],
  ['banh-trang-nuong', /banh trang nuong/, 'bánh tráng nướng'],
  ['mango', /xoai/, 'green mango slices'],
  ['fish-balls', /ca vien/, 'fish balls'],
  ['nem-chua', /nem chua/, 'nem chua rán'],
  ['bun-bo-hue', /bun bo|bun chay hue/, 'bún bò Huế'],
  ['crab-cake', /cha cua/, 'crab cake'],
  ['bun-rieu', /bun rieu/, 'bún riêu'],
  ['bun-cha', /bun cha/, 'bún chả'],
  ['hu-tieu', /hu tieu/, 'hủ tiếu'],
  ['mi-quang', /mi quang/, 'mì Quảng'],
  ['kimbap', /kimbap/, 'gimbap'],
  ['che-thai', /che thai/, 'chè dessert'],
  ['goi-cuon', /goi cuon/, 'gỏi cuốn'],
  ['banh-mi-chao', /banh mi chao|op la/, 'bánh mì ốp la'],
  ['banh-mi', /banh mi/, 'bánh mì thịt'],
  ['ca-phe-sua-da', /ca phe sua|bac xiu/, 'cà phê sữa đá'],
  ['salt-coffee', /ca phe muoi/, 'egg coffee'],
  ['black-coffee', /ca phe den/, 'vietnamese coffee phin'],
  ['cold-brew', /cold brew/, 'cold brew coffee'],
  ['croissant', /croissant/, 'croissant'],
  ['grilled-squid', /muc nuong/, 'grilled squid'],
  ['bo-la-lot', /la lot/, 'bò lá lốt'],
  ['samgyeopsal', /ba chi/, 'samgyeopsal'],
  ['tom-yum', /lau thai/, 'tom yum goong'],
  ['mushroom-hotpot', /lau nam/, 'mushroom hot pot'],
  ['hotpot', /lau/, 'hotpot meat vegetables broth'],
  ['salmon-sushi', /sushi/, 'salmon nigiri'],
  ['sashimi', /sashimi/, 'sashimi platter'],
  ['takoyaki', /takoyaki/, 'takoyaki'],
  ['ramen', /ramen/, 'tonkotsu ramen'],
  ['udon', /udon/, 'beef udon'],
  ['tofu-tomato', /dau hu/, 'tofu tomato sauce'],
  ['orange-juice', /cam$|ep cam/, 'orange juice glass'],
];

const normalize = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase();
const keyFor = (name) => RULES.find(([, re]) => re.test(normalize(name)))?.[0];

async function findImage(query, skip = 0) {
  const params = new URLSearchParams({
    action: 'query', format: 'json', generator: 'search', gsrnamespace: '6', gsrlimit: '15',
    gsrsearch: `${query} filemime:image/jpeg`, prop: 'imageinfo', iiprop: 'url|size|extmetadata', iiurlwidth: '480',
  });
  const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, { headers: { 'User-Agent': UA } });
  const data = await res.json();
  const pages = Object.values(data.query?.pages || {}).sort((a, b) => a.index - b.index);
  const good = pages.filter((p) => {
    const ii = p.imageinfo?.[0];
    if (!ii || ii.width < 500) return false;
    const ratio = ii.width / ii.height;
    return ratio > 0.6 && ratio < 1.9;
  });
  return good[skip];
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const credits = fs.existsSync(CREDITS) ? JSON.parse(fs.readFileSync(CREDITS, 'utf8')) : {};
  // "key" or "key:N" (N = take the N-th candidate instead of the first)
  const only = process.argv.slice(2).map((a) => a.split(':'));
  const targets = only.length ? only : RULES.filter(([key]) => !credits[key]).map(([key]) => [key, '0']);

  for (const [key, skip = '0'] of targets) {
    const rule = RULES.find(([k]) => k === key);
    if (!rule) { console.log('unknown key', key); continue; }
    try {
      const page = await findImage(rule[2], Number(skip));
      if (!page) { console.log('NOT FOUND', key); continue; }
      const ii = page.imageinfo[0];
      const img = await fetch(ii.thumburl, { headers: { 'User-Agent': UA } });
      fs.writeFileSync(path.join(OUT, `${key}.jpg`), Buffer.from(await img.arrayBuffer()));
      const meta = ii.extmetadata || {};
      credits[key] = {
        title: page.title,
        page: ii.descriptionurl,
        author: (meta.Artist?.value || '').replace(/<[^>]+>/g, '').trim(),
        license: meta.LicenseShortName?.value || '',
      };
      console.log('ok', key, '<-', page.title);
    } catch (e) {
      console.log('FAIL', key, e.message);
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  fs.writeFileSync(CREDITS, JSON.stringify(credits, null, 2));
}

module.exports = { RULES, keyFor };
if (require.main === module) main();
