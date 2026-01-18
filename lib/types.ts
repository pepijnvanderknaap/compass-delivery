// Database types
export type DishCategory = 'soup' | 'salad_bar' | 'hot_dish_beef' | 'hot_dish_chicken' | 'hot_dish_pork' | 'hot_dish_fish' | 'hot_dish_vega' | 'off_menu';
export type UserRole = 'admin' | 'kitchen' | 'manager';

export interface Location {
  id: string;
  name: string;
  address?: string;
  contact_person?: string;
  contact_email?: string;
  contact_phone?: string;
  contact_name?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Dish {
  id: string;
  name: string;
  category: DishCategory;
  default_portion_size_ml: number | null;
  default_portion_size_g: number | null;
  is_active: boolean;
  description?: string;
  photo_url?: string;
  base_price?: number;
  allergen_gluten?: boolean;
  allergen_soy?: boolean;
  allergen_lactose?: boolean;
  allergen_sesame?: boolean;
  allergen_sulphites?: boolean;
  allergen_egg?: boolean;
  allergen_mustard?: boolean;
  allergen_celery?: boolean;
  created_at: string;
  updated_at: string;
}

export interface LocationDishPricing {
  id: string;
  location_id: string;
  dish_id: string;
  portion_size_ml: number | null;
  portion_size_g: number | null;
  price_per_portion: number;
  created_at: string;
  updated_at: string;
}

export interface MenuItem {
  id: string;
  weekly_menu_id: string;
  dish_id: string;
  day_of_week: number;
  created_at: string;
  updated_at: string;
}

export interface WeeklyMenu {
  id: string;
  week_start_date: string;
  soup_id: string | null;
  salad_bar_available: boolean;
  hot_dish_meat_id: string | null;
  hot_dish_veg_id: string | null;
  notes: string | null;
  order_deadline: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  menu_items?: MenuItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  dish_id: string;
  delivery_date: string;
  portions: number;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  location_id: string;
  week_start_date: string;
  notes: string | null;
  created_by: string | null;
  order_items?: OrderItem[];
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  location_id: string | null;
  full_name: string | null;
  locations?: { name: string };
  created_at: string;
  updated_at: string;
}

// Extended types with relations
export interface WeeklyMenuWithDishes extends WeeklyMenu {
  soup?: Dish;
  hot_dish_meat?: Dish;
  hot_dish_veg?: Dish;
}

export interface OrderWithDetails extends Order {
  location?: Location;
  weekly_menu?: WeeklyMenuWithDishes;
}

// View models for components
export interface DailyOrderSummary {
  date: string;
  location: string;
  location_id: string;
  soup: {
    name: string;
    portions: number;
    portion_size_ml: number;
    total_ml: number;
  };
  salad_bar: {
    portions: number;
    portion_size_g: number;
    total_g: number;
  };
  hot_dish_meat: {
    name: string;
    portions: number;
    portion_size_g: number;
    total_g: number;
  };
  hot_dish_veg: {
    name: string;
    portions: number;
    portion_size_g: number;
    total_g: number;
  };
}

export interface MonthlyInvoiceSummary {
  location: string;
  location_id: string;
  contact_email: string | null;
  items: {
    date: string;
    dish_name: string;
    category: string;
    portions: number;
    price_per_portion: number;
    total_price: number;
  }[];
  total_amount: number;
}
