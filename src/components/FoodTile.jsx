import { Link } from 'react-router-dom';
import FoodImage from './FoodImage.jsx';
import { discountPercent, formatPrice } from '../utils.js';

function SoldIndicator({ food, showSoldBar, soldRatio }) {
  if (showSoldBar) {
    return (
      <div className="sold-bar">
        <div style={{ width: soldRatio + '%' }} />
        <span>Đã bán {food.sold}</span>
      </div>
    );
  }

  return <span className="muted small">Đã bán {food.sold}+</span>;
}

/** Dish preview on home. Opens the restaurant — items are added from the shop menu only. */
export default function FoodTile({ food, restaurant, showSoldBar }) {
  const off = discountPercent(food);
  const soldRatio = Math.min(95, 30 + (food.sold % 70));

  return (
    <Link className="food-tile" to={`/restaurants/${food.restaurantId}?dish=${food.id}`}>
      <div className="food-tile-img">
        <FoodImage food={food} size="tile" />
        {off > 0 && <span className="off-badge">-{off}%</span>}
      </div>
      <div className="food-tile-body">
        <strong className="clamp-2">{food.name}</strong>
        {restaurant && <span className="muted small ellipsis">{restaurant.name}</span>}
        <SoldIndicator food={food} showSoldBar={showSoldBar} soldRatio={soldRatio} />
        <div className="food-tile-foot">
          <span>
            <b className="price">{formatPrice(food.price)}</b>
            {off > 0 && <s className="muted small"> {formatPrice(food.originalPrice)}</s>}
          </span>
        </div>
      </div>
    </Link>
  );
}
