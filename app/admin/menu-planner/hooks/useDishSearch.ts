import { useState, useEffect, useMemo } from 'react';
import Fuse from 'fuse.js';
import { createClient } from '@/lib/supabase/client';

interface Dish {
  id: string;
  name: string;
  description: string | null;
  category: string;
  subcategory: string | null;
  portion_size: number | null;
  portion_unit: string | null;
  default_portion_size_ml: number | null;
  default_portion_size_g: number | null;
  is_favorite?: boolean;
}

interface DishUsage {
  dishId: string;
  lastUsed: string;
  weekNumber: number;
}

interface UseDishSearchOptions {
  category?: string;
  usedDishes: Map<string, DishUsage>;
}

export function useDishSearch({ category, usedDishes }: UseDishSearchOptions) {
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchDishes();
  }, [category]);

  const fetchDishes = async () => {
    try {
      let query = supabase
        .from('dishes')
        .select('*')
        .eq('is_active', true);

      // Filter by category if provided
      if (category) {
        // Special case: hot_dish_meat should include BOTH meat AND fish
        if (category === 'hot_dish_meat') {
          query = query.in('category', ['hot_dish_meat', 'hot_dish_fish']);
        } else {
          query = query.eq('category', category);
        }
      }

      const { data, error } = await query.order('name');

      console.log('[useDishSearch] Fetched dishes:', data?.length, 'dishes');
      console.log('[useDishSearch] Category filter:', category);
      console.log('[useDishSearch] Error:', error);
      console.log('[useDishSearch] First 5 dishes:', data?.slice(0, 5).map(d => d.name));

      setDishes(data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching dishes:', error);
      setLoading(false);
    }
  };

  // Configure Fuse.js for fuzzy search
  const fuse = useMemo(() => {
    return new Fuse(dishes, {
      keys: ['name', 'description'],
      threshold: 0.3, // Lower = stricter matching
      includeScore: true,
    });
  }, [dishes]);

  // Smart ranking algorithm
  const rankedDishes = useMemo(() => {
    let results = searchQuery.trim()
      ? fuse.search(searchQuery).map((result) => result.item)
      : dishes;

    // Sort by priority:
    // 1. Favorites (if we implement favorites later)
    // 2. NOT used in 4-week cycle
    // 3. Used in cycle (pushed to bottom)
    // 4. Fuzzy match score (if searching)
    return results.sort((a, b) => {
      const aUsed = usedDishes.has(a.id);
      const bUsed = usedDishes.has(b.id);

      // Favorites first (placeholder for future)
      if (a.is_favorite && !b.is_favorite) return -1;
      if (!a.is_favorite && b.is_favorite) return 1;

      // Fresh dishes (not used) before used dishes
      if (!aUsed && bUsed) return -1;
      if (aUsed && !bUsed) return 1;

      // If both used or both not used, maintain alphabetical order
      return a.name.localeCompare(b.name);
    });
  }, [dishes, searchQuery, usedDishes, fuse]);

  return {
    dishes: rankedDishes,
    searchQuery,
    setSearchQuery,
    loading,
    refetch: fetchDishes,
  };
}
