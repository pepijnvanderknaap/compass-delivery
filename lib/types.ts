// Database types
export type DishCategory = 'soup' | 'hot_dish_meat' | 'hot_dish_fish' | 'hot_dish_veg' | 'component';
export type DishSubcategory = 'topping' | 'carb' | 'warm_veggie' | 'salad' | 'condiment';
export type PortionUnit = 'pieces' | 'grams' | 'kilograms' | 'milliliters' | 'liters' | 'trays';
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
  subcategory?: DishSubcategory | null;
  default_portion_size_ml: number | null;
  default_portion_size_g: number | null;
  portion_unit?: PortionUnit | null;
  portion_size?: number | null;
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
  contains_pork?: boolean;
  contains_beef?: boolean;
  contains_lamb?: boolean;
  contains_chicken?: boolean;
  contains_fish?: boolean;
  is_halal?: boolean;
  is_vegetarian?: boolean;
  is_vegan?: boolean;
  portion_display?: string | null;
  calories_display?: string | null;
  origin_display?: string | null;
  cooking_method?: string | null;
  prep_time?: string | null;
  chef_note?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DishComponent {
  id: string;
  main_dish_id: string;
  component_dish_id: string;
  component_type: DishSubcategory;
  created_at: string;
  updated_at: string;
}

export interface SaladComponent {
  id: string;
  main_dish_id: string;
  component_dish_id: string;
  percentage: number;
  created_at: string;
  updated_at: string;
}

export interface SaladComponentWithDish extends SaladComponent {
  component_dish: Dish;
}

export interface WarmVeggieComponent {
  id: string;
  dish_id: string;
  component_dish_id: string;
  percentage: number;
  created_at: string;
  updated_at: string;
}

export interface WarmVeggieComponentWithDish extends WarmVeggieComponent {
  component_dish: Dish;
}

export interface DishWithComponents extends Dish {
  components?: {
    topping?: Dish[];
    carb?: Dish[];
    warm_veggie?: Dish[];
    salad?: Dish[];
    condiment?: Dish[];
  };
}

export interface DishWithSaladComponents extends Dish {
  salad_components?: SaladComponentWithDish[];
}

export interface DishWithWarmVeggieComponents extends Dish {
  warm_veggie_components?: WarmVeggieComponentWithDish[];
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

export interface LocationSettings {
  id: string;
  location_id: string;

  // Client Details
  general_phone?: string | null;
  contact_person_name?: string | null;
  contact_person_email?: string | null;
  contact_person_mobile?: string | null;
  billing_contact_name?: string | null;
  billing_contact_email?: string | null;
  billing_contact_phone?: string | null;
  delivery_directions?: string | null;

  // Compass Team
  site_manager_name?: string | null;
  site_manager_email?: string | null;
  site_manager_mobile?: string | null;
  site_manager_gross_monthly_salary?: number | null;
  site_manager_contractual_hours?: number | null;
  regional_manager_name?: string | null;
  regional_manager_email?: string | null;
  regional_manager_mobile?: string | null;

  // Dish Settings
  soup_portion_size_ml?: number | null;
  salad_bar_portion_size_g?: number | null;

  // Salad Bar Composition (percentages 0-1, must sum to 1.00)
  salad_leaves_percentage?: number | null;
  cucumber_percentage?: number | null;
  tomato_percentage?: number | null;
  carrot_julienne_percentage?: number | null;
  radish_julienne_percentage?: number | null;
  pickled_beetroot_percentage?: number | null;
  mixed_blanched_veg_percentage?: number | null;
  roasted_veg_1_percentage?: number | null;
  roasted_veg_2_percentage?: number | null;
  roasted_veg_3_percentage?: number | null;
  potato_salad_percentage?: number | null;
  composed_salad_percentage?: number | null;
  pasta_salad_percentage?: number | null;
  carb_percentage?: number | null;

  // Key Interest Points
  key_interest_points?: string | null;

  // Satisfaction Score
  satisfaction_score?: number | null;

  created_at: string;
  updated_at: string;
}

export interface LocationStaff {
  id: string;
  location_id: string;
  staff_name: string;
  staff_role?: string | null;
  staff_mobile?: string | null;
  gross_monthly_salary?: number | null;
  contractual_hours?: number | null;
  created_at: string;
  updated_at: string;
}

export interface LocationWithSettings extends Location {
  settings?: LocationSettings;
  staff?: LocationStaff[];
}

export interface LocationBillingSettings {
  id: string;
  location_id: string;

  // Dutch Employer Cost Percentages
  employer_social_security_percentage: number; // Werkgeverslasten (~17.9%)
  pension_contribution_percentage: number; // Pensioen (~8%)
  holiday_allowance_percentage: number; // Vakantiegeld (8% required in NL)
  other_employer_costs_percentage: number; // Insurance, etc. (~2%)

  // Other Overhead
  management_fee_percentage: number;
  overhead_percentage: number;

  // Portion Pricing
  soup_price_per_portion: number;
  salad_bar_price_per_portion: number;
  hot_dish_meat_fish_price_per_portion: number;
  hot_dish_veg_price_per_portion: number;

  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  location_id: string;

  // Invoice Details
  invoice_number: string;
  month: string; // Format: "YYYY-MM"

  // Invoice Data (line items and calculations)
  invoice_data: {
    location_name: string;
    billing_contact: {
      name?: string;
      email?: string;
      phone?: string;
    };
    period: {
      start: string;
      end: string;
    };
    line_items: {
      date: string;
      description: string;
      category: string;
      quantity: number;
      unit_price: number;
      total: number;
    }[];
    costs: {
      staff_cost: number;
      management_fee: number;
      overhead: number;
    };
  };

  // Financial
  subtotal: number;
  tax_amount: number;
  total_amount: number;

  // Status
  status: 'draft' | 'sent' | 'paid' | 'cancelled';

  // PDF Storage
  pdf_url?: string | null;

  // Timestamps
  created_at: string;
  updated_at: string;
  sent_at?: string | null;
  paid_at?: string | null;

  // Notes
  notes?: string | null;
}
