import { useState } from 'react';

function FoodImageContent({ food, broken, onError }) {
  if (food.image && !broken) {
    return <img src={food.image} alt={food.name} onError={onError} />;
  }

  return <span>{food.icon || '🍽️'}</span>;
}

export default function FoodImage({ food, size = 'md' }) {
  const [broken, setBroken] = useState(false);
  return (
    <div className={`food-img food-img-${size}`}>
      <FoodImageContent food={food} broken={broken} onError={() => setBroken(true)} />
    </div>
  );
}
