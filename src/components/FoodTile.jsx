import { useNavigate } from 'react-router-dom';
import FoodImage from './FoodImage.jsx';
import { discountPercent, formatPrice } from '../utils.js';

/** Dish card used on the home page (flash sale, suggestions). */
export default function FoodTile({ food, restaurant, onAdd, showSoldBar }) {
  const navigate = useNavigate();
  const off = discountPercent(food);
  const soldRatio = Math.min(95, 30 + (food.sold % 70));

  return (
    <div className="food-tile" onClick={() => navigate(`/restaurants/${food.restaurantId}`)}>
      <div className="food-tile-img">
        <FoodImage food={food} size="tile" />
        {off > 0 && <span className="off-badge">-{off}%</span>}
      </div>
      <div className="food-tile-body">
        <strong className="clamp-2">{food.name}</strong>
        {restaurant && <span className="muted small ellipsis">{restaurant.name}</span>}
        {showSoldBar ? (
          <div className="sold-bar"><div style={{ width: soldRatio + '%' }} /><span>Đã bán {food.sold}</span></div>
        ) : (
          <span className="muted small">Đã bán {food.sold}+</span>
        )}
        <div className="food-tile-foot">
          <span>
            <b className="price">{formatPrice(food.price)}</b>
            {off > 0 && <s className="muted small"> {formatPrice(food.originalPrice)}</s>}
          </span>
          <button
            className="add-btn"
            title="Thêm vào giỏ"
            onClick={(e) => {
              e.stopPropagation();
              onAdd(food, restaurant);
            }}
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}
