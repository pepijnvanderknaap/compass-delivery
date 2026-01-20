import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { subWeeks, format } from 'date-fns';

interface DishUsage {
  dishId: string;
  lastUsed: string; // ISO date string
  weekNumber: number; // 1-4 (how many weeks ago)
}

export function useRecentDishes() {
  const [usedDishes, setUsedDishes] = useState<Map<string, DishUsage>>(new Map());
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchRecentDishes();
  }, []);

  const fetchRecentDishes = async () => {
    try {
      // Get date 4 weeks ago
      const fourWeeksAgo = subWeeks(new Date(), 4);
      const startDate = format(fourWeeksAgo, 'yyyy-MM-dd');

      // Fetch all order items from last 4 weeks
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('dish_id, delivery_date')
        .gte('delivery_date', startDate)
        .order('delivery_date', { ascending: false });

      if (!orderItems) {
        setLoading(false);
        return;
      }

      // Build map of dish_id -> last usage info
      const usageMap = new Map<string, DishUsage>();
      const now = new Date();

      orderItems.forEach((item) => {
        // Only track the first (most recent) occurrence
        if (!usageMap.has(item.dish_id)) {
          const deliveryDate = new Date(item.delivery_date);
          const weeksDiff = Math.ceil(
            (now.getTime() - deliveryDate.getTime()) / (1000 * 60 * 60 * 24 * 7)
          );

          usageMap.set(item.dish_id, {
            dishId: item.dish_id,
            lastUsed: item.delivery_date,
            weekNumber: Math.min(weeksDiff, 4), // Cap at 4 weeks
          });
        }
      });

      setUsedDishes(usageMap);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching recent dishes:', error);
      setLoading(false);
    }
  };

  return {
    usedDishes,
    loading,
    isUsedInCycle: (dishId: string) => usedDishes.has(dishId),
    getUsageInfo: (dishId: string) => usedDishes.get(dishId),
  };
}
