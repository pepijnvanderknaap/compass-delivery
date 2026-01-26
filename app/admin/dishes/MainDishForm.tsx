'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Dish, DishWithComponents, DishSubcategory } from '@/lib/types';
import QuickComponentForm from './QuickComponentForm';

interface MainDishFormProps {
  dish: DishWithComponents | null;
  onClose: () => void;
  onSave: (dishId?: string) => void;
  contextCategory?: string; // Category from menu planner context (soup, hot_meat, hot_veg)
}

export default function MainDishForm({ dish, onClose, onSave, contextCategory }: MainDishFormProps) {
  const supabase = createClient();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'soup' as 'soup' | 'hot_dish_meat' | 'hot_dish_fish' | 'hot_dish_veg' | 'component' | 'off_menu',
    subcategory: null as DishSubcategory | null,
    portion_size: '150', // Default to 150ml for soups
    portion_unit: 'milliliters' as 'pieces' | 'grams' | 'kilograms' | 'milliliters' | 'liters' | 'trays',
    salad_total_portion_g: '',
    warm_veggie_total_portion_g: '',
    allergen_gluten: false,
    allergen_soy: false,
    allergen_lactose: false,
    allergen_sesame: false,
    allergen_sulphites: false,
    allergen_egg: false,
    allergen_mustard: false,
    allergen_celery: false,
    contains_pork: false,
    contains_beef: false,
    contains_lamb: false,
    is_vegetarian: false,
    is_vegan: false,
    portion_display: '',
    calories_display: '',
    origin_display: '',
    cooking_method: '',
    prep_time: '',
    chef_note: '',
  });

  const [selectedComponents, setSelectedComponents] = useState<{
    topping: string[];
    carb: string[];
    warm_veggie: string[];
    salad: string[];
    condiment: string[];
  }>({
    topping: [],
    carb: [],
    warm_veggie: [],
    salad: [],
    condiment: [],
  });

  // Salad components with percentages
  interface SaladComponentRow {
    tempId: string;
    component_dish_id: string | null;
    component_name: string;
    percentage: string;
  }
  const [saladComponents, setSaladComponents] = useState<SaladComponentRow[]>([
    { tempId: '1', component_dish_id: null, component_name: '', percentage: '' }
  ]);

  // Warm veggie components with percentages
  interface WarmVeggieComponentRow {
    tempId: string;
    component_dish_id: string | null;
    component_name: string;
    percentage: string;
  }
  const [warmVeggieComponents, setWarmVeggieComponents] = useState<WarmVeggieComponentRow[]>([
    { tempId: '1', component_dish_id: null, component_name: '', percentage: '' }
  ]);

  const [availableComponents, setAvailableComponents] = useState<Dish[]>([]);
  const [componentUsageCounts, setComponentUsageCounts] = useState<Record<string, number>>({});
  const [componentSearchTerms, setComponentSearchTerms] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [quickFormType, setQuickFormType] = useState<'component' | 'carb' | 'warm_veggie' | 'condiment' | null>(null);

  // Copy components modal state
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copySearchTerm, setCopySearchTerm] = useState('');
  const [availableHotDishes, setAvailableHotDishes] = useState<Dish[]>([]);

  useEffect(() => {
    fetchComponents();
    fetchHotDishes();
    if (dish) {
      setFormData({
        name: dish.name,
        description: dish.description || '',
        category: dish.category,
        subcategory: dish.subcategory || null,
        portion_size: dish.portion_size ? String(dish.portion_size) : '',
        portion_unit: (dish.portion_unit || 'milliliters') as any,
        salad_total_portion_g: (dish as any).salad_total_portion_g ? String((dish as any).salad_total_portion_g) : '',
        warm_veggie_total_portion_g: (dish as any).warm_veggie_total_portion_g ? String((dish as any).warm_veggie_total_portion_g) : '',
        allergen_gluten: dish.allergen_gluten || false,
        allergen_soy: dish.allergen_soy || false,
        allergen_lactose: dish.allergen_lactose || false,
        allergen_sesame: dish.allergen_sesame || false,
        allergen_sulphites: dish.allergen_sulphites || false,
        allergen_egg: dish.allergen_egg || false,
        allergen_mustard: dish.allergen_mustard || false,
        allergen_celery: dish.allergen_celery || false,
        contains_pork: dish.contains_pork || false,
        contains_beef: dish.contains_beef || false,
        contains_lamb: dish.contains_lamb || false,
        is_vegetarian: dish.is_vegetarian || false,
        is_vegan: dish.is_vegan || false,
        portion_display: dish.portion_display || '',
        calories_display: dish.calories_display || '',
        origin_display: dish.origin_display || '',
        cooking_method: dish.cooking_method || '',
        prep_time: dish.prep_time || '',
        chef_note: dish.chef_note || '',
      });

      // Set selected components (excluding salad - salad is handled separately)
      if (dish.components) {
        setSelectedComponents({
          topping: dish.components.topping?.map(c => c.id) || [],
          carb: dish.components.carb?.map(c => c.id) || [],
          warm_veggie: dish.components.warm_veggie?.map(c => c.id) || [],
          salad: [], // Salad no longer uses checkboxes
          condiment: dish.components.condiment?.map(c => c.id) || [],
        });
      }

      // Load salad components with percentages
      loadSaladComponents(dish.id);
      // Load warm veggie components with percentages
      loadWarmVeggieComponents(dish.id);
    } else {
      // Reset form for creating a new dish
      // Use contextCategory to pre-select the appropriate category
      let initialCategory: 'soup' | 'hot_dish_meat' | 'hot_dish_fish' | 'hot_dish_veg' | 'component' | 'off_menu' = 'soup';
      let initialPortionSize = '150';
      let initialPortionUnit: 'pieces' | 'grams' | 'kilograms' | 'milliliters' | 'liters' | 'trays' = 'milliliters';

      if (contextCategory) {
        if (contextCategory === 'soup') {
          initialCategory = 'soup';
          initialPortionSize = '150';
          initialPortionUnit = 'milliliters';
        } else if (contextCategory === 'hot_meat') {
          initialCategory = 'hot_dish_meat';
          initialPortionSize = '200';
          initialPortionUnit = 'grams';
        } else if (contextCategory === 'hot_veg') {
          initialCategory = 'hot_dish_veg';
          initialPortionSize = '200';
          initialPortionUnit = 'grams';
        }
      }

      setFormData({
        name: '',
        description: '',
        category: initialCategory,
        subcategory: null,
        portion_size: initialPortionSize,
        portion_unit: initialPortionUnit,
        allergen_gluten: false,
        allergen_soy: false,
        allergen_lactose: false,
        allergen_sesame: false,
        allergen_sulphites: false,
        allergen_egg: false,
        allergen_mustard: false,
        allergen_celery: false,
        contains_pork: false,
        contains_beef: false,
        contains_lamb: false,
        is_vegetarian: false,
        is_vegan: false,
        portion_display: '',
        calories_display: '',
        origin_display: '',
        cooking_method: '',
        prep_time: '',
        chef_note: '',
        salad_total_portion_g: '',
        warm_veggie_total_portion_g: '',
      });

      // Reset selected components
      setSelectedComponents({
        topping: [],
        carb: [],
        warm_veggie: [],
        salad: [],
        condiment: [],
      });

      // Reset salad and warm veggie components to empty
      setSaladComponents([
        { tempId: '1', component_dish_id: null, component_name: '', percentage: '' }
      ]);
      setWarmVeggieComponents([
        { tempId: '1', component_dish_id: null, component_name: '', percentage: '' }
      ]);
    }
  }, [dish]);

  const loadSaladComponents = async (dishId: string) => {
    const { data } = await supabase
      .from('salad_components')
      .select('*, component_dish:dishes!component_dish_id(*)')
      .eq('main_dish_id', dishId);

    if (data && data.length > 0) {
      setSaladComponents(data.map((sc, index) => ({
        tempId: `existing-${index}`,
        component_dish_id: sc.component_dish_id,
        component_name: sc.component_dish?.name || '',
        percentage: String(sc.percentage),
      })));
    } else {
      // Reset to default empty row
      setSaladComponents([
        { tempId: '1', component_dish_id: null, component_name: '', percentage: '' }
      ]);
    }
  };

  const loadWarmVeggieComponents = async (dishId: string) => {
    const { data } = await supabase
      .from('warm_veggie_components')
      .select('*, component_dish:dishes!component_dish_id(*)')
      .eq('main_dish_id', dishId);

    if (data && data.length > 0) {
      setWarmVeggieComponents(data.map((wv, index) => ({
        tempId: `existing-${index}`,
        component_dish_id: wv.component_dish_id,
        component_name: wv.component_dish?.name || '',
        percentage: String(wv.percentage),
      })));
    } else {
      // Reset to default empty row
      setWarmVeggieComponents([
        { tempId: '1', component_dish_id: null, component_name: '', percentage: '' }
      ]);
    }
  };

  const fetchComponents = async () => {
    const { data } = await supabase
      .from('dishes')
      .select('*')
      .not('subcategory', 'is', null)
      .order('name');

    if (data) {
      setAvailableComponents(data);

      // Fetch usage counts for popularity sorting
      fetchComponentUsageCounts(data.map(d => d.id));
    }
  };

  const fetchComponentUsageCounts = async (componentIds: string[]) => {
    // Count how many times each component is used in dish_components
    const { data } = await supabase
      .from('dish_components')
      .select('component_dish_id');

    if (data) {
      const counts: Record<string, number> = {};
      data.forEach(dc => {
        counts[dc.component_dish_id] = (counts[dc.component_dish_id] || 0) + 1;
      });
      setComponentUsageCounts(counts);
    }
  };

  const fetchHotDishes = async () => {
    const { data } = await supabase
      .from('dishes')
      .select('*')
      .in('category', ['hot_dish_meat', 'hot_dish_fish', 'hot_dish_veg'])
      .order('name');

    if (data) setAvailableHotDishes(data);
  };

  // Salad component management functions
  const addSaladRow = () => {
    setSaladComponents(prevComponents => [
      ...prevComponents,
      { tempId: Date.now().toString(), component_dish_id: null, component_name: '', percentage: '' }
    ]);
  };

  const removeSaladRow = (tempId: string) => {
    setSaladComponents(prevComponents => {
      if (prevComponents.length > 1) {
        return prevComponents.filter(sc => sc.tempId !== tempId);
      }
      return prevComponents;
    });
  };

  const updateSaladRow = (tempId: string, field: keyof SaladComponentRow, value: string) => {
    setSaladComponents(prevComponents => prevComponents.map(sc =>
      sc.tempId === tempId ? { ...sc, [field]: value } : sc
    ));
  };

  const getTotalSaladPercentage = () => {
    return saladComponents.reduce((sum, sc) => {
      const percentage = parseFloat(sc.percentage) || 0;
      return sum + percentage;
    }, 0);
  };

  // Warm veggie component management functions
  const addWarmVeggieRow = () => {
    setWarmVeggieComponents(prevComponents => [
      ...prevComponents,
      { tempId: Date.now().toString(), component_dish_id: null, component_name: '', percentage: '' }
    ]);
  };

  const removeWarmVeggieRow = (tempId: string) => {
    setWarmVeggieComponents(prevComponents => {
      if (prevComponents.length > 1) {
        return prevComponents.filter(wv => wv.tempId !== tempId);
      }
      return prevComponents;
    });
  };

  const updateWarmVeggieRow = (tempId: string, field: keyof WarmVeggieComponentRow, value: string) => {
    setWarmVeggieComponents(prevComponents => prevComponents.map(wv =>
      wv.tempId === tempId ? { ...wv, [field]: value } : wv
    ));
  };

  const getTotalWarmVeggiePercentage = () => {
    return warmVeggieComponents.reduce((sum, wv) => {
      const percentage = parseFloat(wv.percentage) || 0;
      return sum + percentage;
    }, 0);
  };

  // Copy components from another dish
  const copyComponentsFromDish = async (sourceDishId: string) => {
    try {
      // Fetch salad components from source dish
      const { data: saladData } = await supabase
        .from('salad_components')
        .select('*, component_dish:dishes!component_dish_id(*)')
        .eq('main_dish_id', sourceDishId);

      if (saladData && saladData.length > 0) {
        setSaladComponents(saladData.map((sc, index) => ({
          tempId: `copied-salad-${index}`,
          component_dish_id: sc.component_dish_id,
          component_name: sc.component_dish?.name || '',
          percentage: String(sc.percentage),
        })));
      }

      // Fetch warm veggie components from source dish
      const { data: warmVeggieData } = await supabase
        .from('warm_veggie_components')
        .select('*, component_dish:dishes!component_dish_id(*)')
        .eq('main_dish_id', sourceDishId);

      if (warmVeggieData && warmVeggieData.length > 0) {
        setWarmVeggieComponents(warmVeggieData.map((wv, index) => ({
          tempId: `copied-veggie-${index}`,
          component_dish_id: wv.component_dish_id,
          component_name: wv.component_dish?.name || '',
          percentage: String(wv.percentage),
        })));
      }

      // Close modal and reset search
      setShowCopyModal(false);
      setCopySearchTerm('');
    } catch (error) {
      console.error('Error copying components:', error);
      alert('Failed to copy components. Please try again.');
    }
  };

  // Create new component on the fly
  const createNewComponent = async (name: string): Promise<string | null> => {
    const trimmedName = name.trim();

    // Check if component already exists with this name (for salad/warm veggie components)
    const { data: existingComponent } = await supabase
      .from('dishes')
      .select('*')
      .eq('category', 'component')
      .ilike('name', trimmedName)
      .maybeSingle();

    if (existingComponent) {
      // Component already exists - return its ID
      return existingComponent.id;
    }

    // Component doesn't exist - create it
    const { data, error } = await supabase
      .from('dishes')
      .insert([{
        name: trimmedName,
        category: 'component',
        subcategory: null, // Components for salads don't need subcategory
        is_active: true,
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating component:', error);
      return null;
    }

    // Refresh available components
    await fetchComponents();

    return data.id;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      let dishId = dish?.id;

      // Prepare data with converted types
      const dataToSave = {
        ...formData,
        portion_size: formData.portion_size ? parseFloat(formData.portion_size) : null,
        salad_total_portion_g: formData.salad_total_portion_g ? parseInt(formData.salad_total_portion_g) : null,
        warm_veggie_total_portion_g: formData.warm_veggie_total_portion_g ? parseInt(formData.warm_veggie_total_portion_g) : null,
      };

      if (dish) {
        // Update existing dish
        const { error } = await supabase
          .from('dishes')
          .update(dataToSave)
          .eq('id', dish.id);
        if (error) throw error;
      } else {
        // Create new dish
        const { data: newDish, error } = await supabase
          .from('dishes')
          .insert([{ ...dataToSave, is_active: true }])
          .select()
          .single();
        if (error) throw error;
        dishId = newDish.id;
      }

      // Update components
      if (dishId) {
        // Delete existing components
        await supabase
          .from('dish_components')
          .delete()
          .eq('main_dish_id', dishId);

        // Prepare all components to insert into dish_components table
        const componentsToInsert: any[] = [];

        // Add regular components (toppings, condiments, carbs, etc.)
        Object.entries(selectedComponents).forEach(([type, ids]) => {
          if (type !== 'salad' && type !== 'warm_veggie') {
            ids.forEach(id => {
              componentsToInsert.push({
                main_dish_id: dishId,
                component_dish_id: id,
                component_type: type,
                percentage: null,
              });
            });
          }
        });

        // Add salad components with percentages
        const validSaladComponents = saladComponents.filter(
          sc => sc.component_dish_id && sc.percentage
        );

        if (validSaladComponents.length > 0) {
          // Validate total percentage
          const totalPercentage = validSaladComponents.reduce((sum, sc) => {
            return sum + parseFloat(sc.percentage);
          }, 0);

          if (Math.abs(totalPercentage - 100) > 0.01) {
            throw new Error(`Salad percentages must total 100%. Current total: ${totalPercentage.toFixed(2)}%`);
          }

          validSaladComponents.forEach(sc => {
            componentsToInsert.push({
              main_dish_id: dishId,
              component_dish_id: sc.component_dish_id,
              component_type: 'salad',
              percentage: parseFloat(sc.percentage),
            });
          });
        }

        // Add warm veggie components with percentages
        const validWarmVeggieComponents = warmVeggieComponents.filter(
          wv => wv.component_dish_id && wv.percentage
        );

        if (validWarmVeggieComponents.length > 0) {
          // Validate total percentage
          const totalPercentage = validWarmVeggieComponents.reduce((sum, wv) => {
            return sum + parseFloat(wv.percentage);
          }, 0);

          if (Math.abs(totalPercentage - 100) > 0.01) {
            throw new Error(`Warm veggie percentages must total 100%. Current total: ${totalPercentage.toFixed(2)}%`);
          }

          validWarmVeggieComponents.forEach(wv => {
            componentsToInsert.push({
              main_dish_id: dishId,
              component_dish_id: wv.component_dish_id,
              component_type: 'warm_veggie',
              percentage: parseFloat(wv.percentage),
            });
          });
        }

        // Insert all components at once into dish_components table
        if (componentsToInsert.length > 0) {
          const { error } = await supabase
            .from('dish_components')
            .insert(componentsToInsert);
          if (error) throw error;
        }
      }

      setMessage({ type: 'success', text: dish ? 'Dish updated!' : 'Dish created!' });
      setTimeout(() => {
        onSave(dishId);
        onClose();
      }, 1000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const getComponentsByType = (type: DishSubcategory) => {
    let filtered = availableComponents.filter(c => c.subcategory === type);
    const searchTerm = componentSearchTerms[type] || '';
    if (searchTerm) {
      filtered = filtered.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    // Sort by: 1) Currently selected, 2) Most popular (usage count), 3) Alphabetically
    filtered.sort((a, b) => {
      const aSelected = selectedComponents[type]?.includes(a.id);
      const bSelected = selectedComponents[type]?.includes(b.id);

      // Selected items first
      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;

      // Then by popularity (usage count)
      const aUsage = componentUsageCounts[a.id] || 0;
      const bUsage = componentUsageCounts[b.id] || 0;
      if (aUsage !== bUsage) {
        return bUsage - aUsage; // Descending (most used first)
      }

      // Finally alphabetically
      return a.name.localeCompare(b.name);
    });

    return filtered.slice(0, 12); // Show up to 12 items
  };

  const getVisibleSubcategories = () => {
    if (formData.category === 'soup') {
      return [{ key: 'topping' as DishSubcategory, label: 'Soup Toppings' }];
    }
    // For all hot dishes (meat, fish, veg)
    return [
      { key: 'carb' as DishSubcategory, label: 'Carbs' },
      { key: 'warm_veggie' as DishSubcategory, label: 'Warm Veggies' },
      { key: 'salad' as DishSubcategory, label: 'Salads' },
      { key: 'condiment' as DishSubcategory, label: 'Hot Dish Add-ons' },
    ];
  };

  const toggleComponent = (type: DishSubcategory, id: string) => {
    setSelectedComponents(prev => {
      const isCurrentlySelected = prev[type].includes(id);

      // If we're selecting (checking) a component, clear the search term to show full list
      if (!isCurrentlySelected) {
        setComponentSearchTerms(prevSearch => ({
          ...prevSearch,
          [type]: ''
        }));
      }

      return {
        ...prev,
        [type]: isCurrentlySelected
          ? prev[type].filter(cid => cid !== id)
          : [...prev[type], id]
      };
    });
  };

  const handleQuickComponentCreated = async (newComponent: { id: string; name: string }) => {
    // Refresh components list to include the new one
    await fetchComponents();

    // Auto-select the new component in the appropriate category
    if (quickFormType) {
      const categoryKey = quickFormType === 'component' ? 'topping' : quickFormType;
      setSelectedComponents(prev => ({
        ...prev,
        [categoryKey]: [...prev[categoryKey], newComponent.id]
      }));

      // Set search term to show the newly created component
      // This ensures it's visible even if there are more than 10 components
      setComponentSearchTerms(prev => ({
        ...prev,
        [categoryKey]: newComponent.name
      }));

      // Clear the search after a short delay so user sees it was added
      setTimeout(() => {
        setComponentSearchTerms(prev => ({
          ...prev,
          [categoryKey]: ''
        }));
      }, 2000);
    }

    // Close the quick form
    setQuickFormType(null);
  };


  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-apple">
      <div className="flex gap-0 max-h-[90vh]">
        {/* Main Form */}
        <div className="bg-white rounded-2xl max-w-4xl w-full flex flex-col max-h-[90vh]">
        <div className="p-8 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 100px)' }}>
          <h2 className="text-apple-title-lg text-apple-gray1 mb-8">
            {dish ? 'Edit Main Dish' : 'Create Main Dish'}
          </h2>

          {message && (
            <div className={`mb-6 px-4 py-3 rounded-xl text-apple-subheadline ${message.type === 'success' ? 'bg-apple-green/10 text-apple-green border border-apple-green/20' : 'bg-apple-red/10 text-apple-red border border-apple-red/20'}`}>
              {message.text}
            </div>
          )}

          <form id="main-dish-form" onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-apple-footnote font-medium text-apple-gray3 mb-2">Dish Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full px-4 py-3 border border-apple-gray4 rounded-lg text-apple-subheadline focus:border-apple-blue focus:ring-2 focus:ring-apple-blue/20 outline-none transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-apple-footnote font-medium text-apple-gray3 mb-2">Dish Category</label>
                {contextCategory === 'soup' ? (
                  // Soup context - show as read-only text
                  <div className="w-full px-4 py-3 bg-apple-gray6 border border-apple-gray4 rounded-lg text-apple-subheadline text-apple-gray2">
                    Soup
                  </div>
                ) : contextCategory === 'hot_meat' ? (
                  // Hot meat/fish context - show dropdown with only meat and fish
                  <select
                    value={formData.category === 'component' ? '' : formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any, subcategory: null })}
                    className="w-full px-4 py-3 border border-apple-gray4 rounded-lg text-apple-subheadline focus:border-apple-blue focus:ring-2 focus:ring-apple-blue/20 outline-none transition-all"
                  >
                    <option value="hot_dish_meat">Hot Dish - Meat</option>
                    <option value="hot_dish_fish">Hot Dish - Fish</option>
                  </select>
                ) : contextCategory === 'hot_veg' ? (
                  // Hot veg context - show as read-only text
                  <div className="w-full px-4 py-3 bg-apple-gray6 border border-apple-gray4 rounded-lg text-apple-subheadline text-apple-gray2">
                    Hot Dish - Veg
                  </div>
                ) : (
                  // No context (dishes page) - show all options
                  <select
                    value={formData.category === 'component' ? '' : formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any, subcategory: null })}
                    className="w-full px-4 py-3 border border-apple-gray4 rounded-lg text-apple-subheadline focus:border-apple-blue focus:ring-2 focus:ring-apple-blue/20 outline-none transition-all"
                  >
                    <option value="">-- Select if Main Dish --</option>
                    <option value="soup">Soup</option>
                    <option value="hot_dish_meat">Hot Dish - Meat</option>
                    <option value="hot_dish_fish">Hot Dish - Fish</option>
                    <option value="hot_dish_veg">Hot Dish - Veg</option>
                    <option value="off_menu">Off-Menu</option>
                  </select>
                )}
              </div>
              <div>
                <label className="block text-apple-footnote font-medium text-apple-gray3 mb-2">Component Type</label>
                <select
                  value={formData.subcategory || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    category: e.target.value ? 'component' : formData.category,
                    subcategory: e.target.value as DishSubcategory || null
                  })}
                  className="w-full px-4 py-3 border border-apple-gray4 rounded-lg text-apple-subheadline focus:border-apple-blue focus:ring-2 focus:ring-apple-blue/20 outline-none transition-all"
                >
                  <option value="">-- Select if Component --</option>
                  <option value="topping">Soup Topping</option>
                  <option value="carb">Carb</option>
                  <option value="warm_veggie">Warm Veggie</option>
                  <option value="salad">Salad</option>
                  <option value="condiment">Condiment</option>
                </select>
              </div>
            </div>

            {formData.category !== 'component' && (
              <div>
                <label className="block text-apple-footnote font-medium text-apple-gray3 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border border-apple-gray4 rounded-lg text-apple-subheadline focus:border-apple-blue focus:ring-2 focus:ring-apple-blue/20 outline-none transition-all resize-none"
                />
              </div>
            )}

            {/* Portion Size - Hidden for soups (managed by location settings) */}
            {formData.category !== 'soup' && (
              <div>
                <h3 className="text-apple-headline text-apple-gray1 mb-3">Portion Size *</h3>
                <p className="text-apple-subheadline text-apple-gray2 mb-4">
                  Specify the size of one portion for production calculations (required)
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-apple-footnote font-medium text-apple-gray3 mb-2">Portion Size *</label>
                    <input
                      type="number"
                      step="1"
                      value={formData.portion_size}
                      onChange={(e) => setFormData({ ...formData, portion_size: e.target.value })}
                      placeholder="e.g., 150"
                      className="w-full px-4 py-3 border border-apple-gray4 rounded-lg text-apple-subheadline focus:border-apple-blue focus:ring-2 focus:ring-apple-blue/20 outline-none transition-all"
                      required
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-apple-footnote font-medium text-apple-gray3 mb-2">Unit *</label>
                    <select
                      value={formData.portion_unit}
                      onChange={(e) => setFormData({ ...formData, portion_unit: e.target.value as any })}
                      className="w-full px-4 py-3 border border-apple-gray4 rounded-lg text-apple-subheadline focus:border-apple-blue focus:ring-2 focus:ring-apple-blue/20 outline-none transition-all"
                      required
                    >
                      <option value="pieces">Pieces</option>
                      <option value="grams">Grams (g)</option>
                      <option value="kilograms">Kilograms (kg)</option>
                      <option value="milliliters">Milliliters (ml)</option>
                      <option value="liters">Liters (L)</option>
                      <option value="trays">Trays</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Allergens - For main dish */}
            {formData.category !== 'component' && (
              <div>
                <h3 className="text-apple-headline text-apple-gray1 mb-3">Allergens</h3>
                <p className="text-apple-subheadline text-apple-gray2 mb-4">
                  Select allergens present in this {formData.category === 'soup' ? 'soup' : 'main dish'} only (not components)
                </p>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { key: 'allergen_gluten', label: 'Gluten' },
                    { key: 'allergen_soy', label: 'Soy' },
                    { key: 'allergen_lactose', label: 'Lactose' },
                    { key: 'allergen_sesame', label: 'Sesame' },
                    { key: 'allergen_sulphites', label: 'Sulphites' },
                    { key: 'allergen_egg', label: 'Egg' },
                    { key: 'allergen_mustard', label: 'Mustard' },
                    { key: 'allergen_celery', label: 'Celery' },
                  ].map(allergen => (
                    <label key={allergen.key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={(formData as any)[allergen.key]}
                        onChange={(e) => setFormData({ ...formData, [allergen.key]: e.target.checked })}
                        className="w-5 h-5 text-apple-blue border-apple-gray4 rounded focus:ring-apple-blue/20"
                      />
                      <span className="text-apple-subheadline text-apple-gray1">{allergen.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Components Selection - Only show for soups and hot dishes */}
            {formData.category !== 'component' && (
              <div>
                <h3 className="text-apple-headline text-apple-gray1 mb-3">Linked Components</h3>
                <p className="text-apple-subheadline text-apple-gray2 mb-4">
                  {formData.category === 'soup'
                    ? 'Select toppings for this soup'
                    : 'Select components for this hot dish'}
                </p>
                <div className="space-y-4">
                  {getVisibleSubcategories().map(subcat => {
                    const allComponents = availableComponents.filter(c => c.subcategory === subcat.key);
                    const components = getComponentsByType(subcat.key);
                    const totalCount = allComponents.length;

                    // Special rendering for Salad - inline editor with percentages
                    if (subcat.key === 'salad') {
                      return (
                        <div key={subcat.key} className="border border-apple-gray5 rounded-xl p-5">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-apple-subheadline font-medium text-apple-gray1">
                              {subcat.label}
                            </h4>
                            <button
                              type="button"
                              onClick={() => setShowCopyModal(true)}
                              className="text-apple-footnote text-apple-blue hover:text-apple-blue-hover font-medium transition-colors"
                            >
                              Copy from...
                            </button>
                          </div>

                          {/* Total Salad Portion Size */}
                          <div className="mb-4">
                            <label className="block text-apple-footnote font-medium text-apple-gray3 mb-2">
                              Total Salad Portion Size (grams)
                            </label>
                            <input
                              type="number"
                              step="1"
                              value={formData.salad_total_portion_g}
                              onChange={(e) => setFormData({ ...formData, salad_total_portion_g: e.target.value })}
                              placeholder="e.g., 220"
                              className="w-full px-4 py-3 border border-apple-gray4 rounded-lg text-apple-subheadline focus:border-apple-blue focus:ring-2 focus:ring-apple-blue/20 outline-none transition-all"
                              min="1"
                            />
                            <p className="text-apple-footnote text-apple-gray3 mt-1">
                              Total weight for the entire salad combination (percentages below will be calculated from this)
                            </p>
                          </div>

                          <div className="space-y-2">
                            {saladComponents.map((sc, index) => (
                              <div key={sc.tempId} className="flex gap-2 items-start">
                                <div className="flex-1">
                                  <input
                                    type="text"
                                    value={sc.component_name}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      updateSaladRow(sc.tempId, 'component_name', value);

                                      // Check if this matches an existing component
                                      const existingComponent = availableComponents.find(
                                        c => c.name.toLowerCase() === value.toLowerCase()
                                      );

                                      if (existingComponent) {
                                        updateSaladRow(sc.tempId, 'component_dish_id', existingComponent.id);
                                      } else {
                                        updateSaladRow(sc.tempId, 'component_dish_id', '');
                                      }
                                    }}
                                    onBlur={async (e) => {
                                      const value = e.target.value.trim();
                                      if (value && !sc.component_dish_id) {
                                        // Create new component
                                        const newId = await createNewComponent(value);
                                        if (newId) {
                                          updateSaladRow(sc.tempId, 'component_dish_id', newId);
                                        }
                                      }
                                    }}
                                    placeholder="Type to search or create..."
                                    className="w-full px-3 py-2 border border-apple-gray4 rounded-lg text-apple-subheadline focus:border-apple-blue focus:ring-2 focus:ring-apple-blue/20 outline-none transition-all"
                                  />
                                </div>
                                <div className="w-24">
                                  <input
                                    type="number"
                                    step="1"
                                    min="0"
                                    max="100"
                                    value={sc.percentage}
                                    onChange={(e) => updateSaladRow(sc.tempId, 'percentage', e.target.value)}
                                    onWheel={(e) => e.preventDefault()}
                                    placeholder="%"
                                    className="w-full px-2 py-2 border border-apple-gray4 rounded-lg text-apple-subheadline text-center focus:border-apple-blue focus:ring-2 focus:ring-apple-blue/20 outline-none transition-all"
                                  />
                                </div>
                                {saladComponents.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => removeSaladRow(sc.tempId)}
                                    className="text-apple-gray3 hover:text-apple-red transition-colors mt-2"
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>

                          {/* Add Row Button */}
                          <button
                            type="button"
                            onClick={addSaladRow}
                            className="mt-3 text-apple-subheadline text-apple-blue hover:text-apple-blue-hover font-medium transition-colors"
                          >
                            + Add Row
                          </button>

                          {/* Total Percentage */}
                          <div className="mt-3 text-apple-footnote text-right">
                            <span className={getTotalSaladPercentage() === 100 ? 'text-apple-green font-medium' : 'text-apple-orange font-medium'}>
                              Total: {getTotalSaladPercentage().toFixed(2)}%
                            </span>
                          </div>

                          <p className="text-apple-footnote text-apple-gray2 bg-apple-gray6 p-3 rounded-lg mt-3">
                            Type to search existing components or create new ones. Percentages must total 100%.
                          </p>
                        </div>
                      );
                    }

                    // Special rendering for Warm Veggies - inline editor with percentages
                    if (subcat.key === 'warm_veggie') {
                      return (
                        <div key={subcat.key} className="border border-apple-gray5 rounded-xl p-5">
                          <div className="mb-3">
                            <h4 className="text-apple-subheadline font-medium text-apple-gray1">
                              {subcat.label}
                            </h4>
                          </div>

                          {/* Total Warm Veggie Portion Size */}
                          <div className="mb-4">
                            <label className="block text-apple-footnote font-medium text-apple-gray3 mb-2">
                              Total Warm Veggie Portion Size (grams)
                            </label>
                            <input
                              type="number"
                              step="1"
                              value={formData.warm_veggie_total_portion_g}
                              onChange={(e) => setFormData({ ...formData, warm_veggie_total_portion_g: e.target.value })}
                              placeholder="e.g., 180"
                              className="w-full px-4 py-3 border border-apple-gray4 rounded-lg text-apple-subheadline focus:border-apple-blue focus:ring-2 focus:ring-apple-blue/20 outline-none transition-all"
                              min="1"
                            />
                            <p className="text-apple-footnote text-apple-gray3 mt-1">
                              Total weight for the entire warm veggie combination (percentages below will be calculated from this)
                            </p>
                          </div>

                          <div className="space-y-2">
                            {warmVeggieComponents.map((wv, index) => (
                              <div key={wv.tempId} className="flex gap-2 items-start">
                                <div className="flex-1">
                                  <input
                                    type="text"
                                    value={wv.component_name}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      updateWarmVeggieRow(wv.tempId, 'component_name', value);

                                      // Check if this matches an existing component
                                      const existingComponent = availableComponents.find(
                                        c => c.name.toLowerCase() === value.toLowerCase()
                                      );

                                      if (existingComponent) {
                                        updateWarmVeggieRow(wv.tempId, 'component_dish_id', existingComponent.id);
                                      } else {
                                        updateWarmVeggieRow(wv.tempId, 'component_dish_id', '');
                                      }
                                    }}
                                    onBlur={async (e) => {
                                      const value = e.target.value.trim();
                                      if (value && !wv.component_dish_id) {
                                        // Create new component
                                        const newId = await createNewComponent(value);
                                        if (newId) {
                                          updateWarmVeggieRow(wv.tempId, 'component_dish_id', newId);
                                        }
                                      }
                                    }}
                                    placeholder="Type to search or create..."
                                    className="w-full px-3 py-2 border border-apple-gray4 rounded-lg text-apple-subheadline focus:border-apple-blue focus:ring-2 focus:ring-apple-blue/20 outline-none transition-all"
                                  />
                                </div>
                                <div className="w-24">
                                  <input
                                    type="number"
                                    step="1"
                                    min="0"
                                    max="100"
                                    value={wv.percentage}
                                    onChange={(e) => updateWarmVeggieRow(wv.tempId, 'percentage', e.target.value)}
                                    onWheel={(e) => e.preventDefault()}
                                    placeholder="%"
                                    className="w-full px-2 py-2 border border-apple-gray4 rounded-lg text-apple-subheadline text-center focus:border-apple-blue focus:ring-2 focus:ring-apple-blue/20 outline-none transition-all"
                                  />
                                </div>
                                {warmVeggieComponents.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => removeWarmVeggieRow(wv.tempId)}
                                    className="text-apple-gray3 hover:text-apple-red transition-colors mt-2"
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>

                          {/* Add Row Button */}
                          <button
                            type="button"
                            onClick={addWarmVeggieRow}
                            className="mt-3 text-apple-subheadline text-apple-blue hover:text-apple-blue-hover font-medium transition-colors"
                          >
                            + Add Row
                          </button>

                          {/* Total Percentage */}
                          <div className="mt-3 text-apple-footnote text-right">
                            <span className={getTotalWarmVeggiePercentage() === 100 ? 'text-apple-green font-medium' : 'text-apple-orange font-medium'}>
                              Total: {getTotalWarmVeggiePercentage().toFixed(2)}%
                            </span>
                          </div>

                          <p className="text-apple-footnote text-apple-gray2 bg-apple-gray6 p-3 rounded-lg mt-3">
                            Type to search existing components or create new ones. Percentages must total 100%.
                          </p>
                        </div>
                      );
                    }

                    // Regular component rendering for other types
                    return (
                      <div key={subcat.key} className="border border-apple-gray5 rounded-xl p-5">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-apple-subheadline font-medium text-apple-gray1">
                            {subcat.label}
                            <span className="text-apple-footnote text-apple-gray3 ml-2 font-normal">
                              (Showing {components.length} of {totalCount})
                            </span>
                          </h4>
                          <button
                            type="button"
                            onClick={() => {
                              if (subcat.key === 'topping') {
                                setQuickFormType('component');
                              } else if (subcat.key === 'carb') {
                                setQuickFormType('carb');
                              } else if (subcat.key === 'warm_veggie') {
                                setQuickFormType('warm_veggie');
                              } else if (subcat.key === 'condiment') {
                                setQuickFormType('condiment');
                              }
                            }}
                            className="text-apple-subheadline text-apple-blue hover:text-apple-blue-hover font-medium transition-colors"
                          >
                            + New
                          </button>
                        </div>
                        {totalCount > 12 && (
                          <input
                            type="text"
                            placeholder="Search..."
                            value={componentSearchTerms[subcat.key] || ''}
                            onChange={(e) => setComponentSearchTerms({ ...componentSearchTerms, [subcat.key]: e.target.value })}
                            className="w-full px-4 py-3 text-apple-subheadline border border-apple-gray4 rounded-lg mb-3 focus:border-apple-blue focus:ring-2 focus:ring-apple-blue/20 outline-none transition-all"
                          />
                        )}
                        {components.length === 0 ? (
                          <p className="text-apple-gray3 text-apple-subheadline text-center py-2">No components found</p>
                        ) : (
                          <div className="grid grid-cols-2 gap-3">
                            {components.map(component => (
                              <label key={component.id} className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={selectedComponents[subcat.key].includes(component.id)}
                                  onChange={() => toggleComponent(subcat.key, component.id)}
                                  className="w-5 h-5 text-apple-blue border-apple-gray4 rounded focus:ring-apple-blue/20"
                                />
                                <span className="text-apple-subheadline text-apple-gray1">{component.name}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Dietary/Protein Categories Section - Keep at bottom */}
            {formData.category !== 'component' && (
              <div>
                <h3 className="text-apple-headline text-apple-gray1 mb-3">Dietary & Protein Categories</h3>
                <div className="grid grid-cols-5 gap-3">
                  {[
                    { key: 'contains_pork', label: 'Pork' },
                    { key: 'contains_beef', label: 'Beef' },
                    { key: 'contains_lamb', label: 'Lamb' },
                    { key: 'is_vegetarian', label: 'Vegetarian' },
                    { key: 'is_vegan', label: 'Vegan' },
                  ].map(dietary => (
                    <label key={dietary.key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={(formData as any)[dietary.key]}
                        onChange={(e) => setFormData({ ...formData, [dietary.key]: e.target.checked })}
                        className="w-5 h-5 text-apple-blue border-apple-gray4 rounded focus:ring-apple-blue/20"
                      />
                      <span className="text-apple-subheadline text-apple-gray1">{dietary.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

          </form>
        </div>

        {/* Sticky Footer with Buttons - Always Visible */}
        <div className="flex justify-end gap-3 px-8 py-6 bg-white rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 text-apple-subheadline font-medium border border-apple-gray4 rounded-lg hover:bg-apple-gray6 transition-colors"
            
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              const form = document.getElementById('main-dish-form') as HTMLFormElement;
              if (form) form.requestSubmit();
            }}
            disabled={saving}
            className="px-6 py-3 text-apple-subheadline font-semibold text-[#1D1D1F] bg-slate-200 hover:bg-slate-300 rounded-lg transition-colors"
          >
            {saving ? 'Saving...' : (dish ? 'Update' : 'Create')}
          </button>
        </div>
      </div>

      {/* Quick Component Form - Side by Side */}
      {quickFormType && (
        <QuickComponentForm
          type={quickFormType}
          onClose={() => setQuickFormType(null)}
          onCreated={handleQuickComponentCreated}
        />
      )}
      </div>

      {/* Copy Components Modal */}
      {showCopyModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl border border-apple-gray5 w-full max-w-md">
            <div className="px-6 py-5 border-b border-apple-gray5">
              <div className="flex items-center justify-between">
                <h3 className="text-apple-headline text-apple-gray1">Copy Salad & Warm Veggies From...</h3>
                <button
                  onClick={() => {
                    setShowCopyModal(false);
                    setCopySearchTerm('');
                  }}
                  className="text-apple-gray3 hover:text-apple-gray1 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Search Input */}
              <div className="mb-4">
                <input
                  type="text"
                  value={copySearchTerm}
                  onChange={(e) => setCopySearchTerm(e.target.value)}
                  placeholder="Search hot dishes..."
                  className="w-full px-4 py-3 border border-apple-gray4 rounded-lg text-apple-subheadline focus:border-apple-blue focus:ring-2 focus:ring-apple-blue/20 outline-none transition-all"
                  autoFocus
                />
              </div>

              {/* Dish List */}
              <div className="max-h-[400px] overflow-y-auto space-y-2">
                {availableHotDishes
                  .filter(d => d.name.toLowerCase().includes(copySearchTerm.toLowerCase()))
                  .map(hotDish => (
                    <button
                      key={hotDish.id}
                      type="button"
                      onClick={() => copyComponentsFromDish(hotDish.id)}
                      className="w-full px-4 py-3 text-left border border-apple-gray5 rounded-lg hover:bg-apple-gray6 hover:border-apple-blue transition-all"
                    >
                      <div className="text-apple-subheadline font-medium text-apple-gray1">{hotDish.name}</div>
                      <div className="text-apple-footnote text-apple-gray3 mt-1">
                        {hotDish.category === 'hot_dish_meat' && 'Hot Dish - Meat'}
                        {hotDish.category === 'hot_dish_fish' && 'Hot Dish - Fish'}
                        {hotDish.category === 'hot_dish_veg' && 'Hot Dish - Veg'}
                      </div>
                    </button>
                  ))
                }
              </div>

              {availableHotDishes.filter(d => d.name.toLowerCase().includes(copySearchTerm.toLowerCase())).length === 0 && (
                <div className="text-center py-8 text-apple-gray3 text-apple-subheadline">
                  No dishes found
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
