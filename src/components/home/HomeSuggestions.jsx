import { useMemo, useRef, useState } from 'react';
import FoodTile from '../FoodTile.jsx';
import Pagination from '../Pagination.jsx';
import { paginate } from '../../utils.js';

const SUGGEST_PAGE_SIZE = 12;

export default function HomeSuggestions({ categories, suggested, shopById }) {
  const [page, setPage] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState(0);
  const suggestRef = useRef(null);
  const suggestedInCategory = useMemo(
    () => selectedCategory
      ? suggested.filter((food) => shopById.get(food.restaurantId)?.categoryId === selectedCategory)
      : suggested,
    [selectedCategory, shopById, suggested],
  );
  const totalPages = Math.max(1, Math.ceil(suggestedInCategory.length / SUGGEST_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  if (suggested.length === 0) return null;

  return (
    <section ref={suggestRef}>
      <div className="section-head">
        <h2>Gợi ý cho bạn</h2>
      </div>
      <div className="chips filter-chips">
        {[{ id: 0, name: 'Tất cả' }, ...categories].map((category) => (
          <button
            key={category.id}
            className={selectedCategory === category.id ? 'chip active' : 'chip'}
            onClick={() => {
              setSelectedCategory(category.id);
              setPage(1);
            }}
          >
            {category.name}
          </button>
        ))}
      </div>
      {suggestedInCategory.length === 0 && (
        <p className="muted center">Danh mục này hiện chưa có món đang bán.</p>
      )}
      <div className="tile-grid">
        {paginate(suggestedInCategory, currentPage, SUGGEST_PAGE_SIZE).map((food) => (
          <FoodTile key={food.id} food={food} restaurant={shopById.get(food.restaurantId)} />
        ))}
      </div>
      <Pagination
        page={currentPage}
        totalPages={totalPages}
        total={suggestedInCategory.length}
        onChange={(nextPage) => {
          setPage(nextPage);
          suggestRef.current?.scrollIntoView({ behavior: 'smooth' });
        }}
      />
    </section>
  );
}
