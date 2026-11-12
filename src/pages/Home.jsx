import { useHomeData } from '../hooks/useHomeData.js';
import useDeliveryLocation from '../hooks/useDeliveryLocation.js';
import HomeHeader from '../components/home/HomeHeader.jsx';
import HomePromotions from '../components/home/HomePromotions.jsx';
import HomeSuggestions from '../components/home/HomeSuggestions.jsx';

export default function Home() {
  const [location, setLocation] = useDeliveryLocation();
  const { data, loading, shopById, saleFoods, suggested, banners, dealShops } = useHomeData(location);

  return (
    <div className="home">
      <HomeHeader location={location} setLocation={setLocation} />
      <HomePromotions
        categories={data.categories}
        banners={banners}
        saleFoods={saleFoods}
        dealShops={dealShops}
        shopById={shopById}
        loading={loading}
      />
      <HomeSuggestions
        categories={data.categories}
        suggested={suggested}
        shopById={shopById}
      />
    </div>
  );
}
