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
      // Fetch dishes filtered by category to prevent wrong dish types in slots
      let query = supabase
        .from('dishes')
        .select('*')
        .eq('is_active', true)
        .neq('category', 'component'); // Exclude components

      // Filter by category if provided
      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query.order('name');

      console.log('[useDishSearch] Fetched dishes:', data?.length, 'dishes');
      console.log('[useDishSearch] Category context (not filtered):', category);
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
      keys: ['name'], // Only search in dish name, not description
      threshold: 0.1, // Very strict matching (only 10% difference allowed)
      includeScore: true,
      ignoreLocation: true, // Match anywhere in the string
    });
  }, [dishes]);

  // Smart ranking algorithm
  const rankedDishes = useMemo(() => {
    const trimmedQuery = searchQuery.trim();

    let results;
    if (!trimmedQuery) {
      results = dishes;
    } else {
      // Use simple case-insensitive substring matching
      // More predictable and prevents false positives
      const lowerQuery = trimmedQuery.toLowerCase();
      results = dishes.filter(dish =>
        dish.name.toLowerCase().includes(lowerQuery)
      );
    }

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
