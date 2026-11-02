import { useState } from 'react';

export default function FoodImage({ food, size = 'md' }) {
  const [broken, setBroken] = useState(false);
  return (
    <div className={`food-img food-img-${size}`}>
      {food.image && !broken ? (
        <img src={food.image} alt={food.name} onError={() => setBroken(true)} />
      ) : (
        <span>{food.icon || '🍽️'}</span>
      )}
    </div>
  );
}
