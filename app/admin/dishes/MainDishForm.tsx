'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Dish, DishWithComponents, DishSubcategory } from '@/lib/types';
import QuickComponentForm from './QuickComponentForm';
import SaladSelectionModal from './SaladSelectionModal';
import SaladCreateModal from './SaladCreateModal';
import WarmVeggieSimpleModal from './WarmVeggieSimpleModal';

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
    photo_url: '',
    category: 'soup' as 'soup' | 'hot_dish_meat' | 'hot_dish_fish' | 'hot_dish_veg' | 'component',
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
    allergen_fish: false,
    allergen_shellfish: false,
    allergen_nuts: false,
    allergen_peanuts: false,
    contains_pork: false,
    contains_beef: false,
    contains_lamb: false,
    contains_chicken: false,
    contains_fish: false,
    is_halal: false,
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


  const [availableComponents, setAvailableComponents] = useState<Dish[]>([]);
  const [componentUsageCounts, setComponentUsageCounts] = useState<Record<string, number>>({});
  const [componentSearchTerms, setComponentSearchTerms] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [quickFormType, setQuickFormType] = useState<'component' | 'carb' | 'warm_veggie' | 'condiment' | null>(null);

  // Media and description toggle
  const [showMediaSection, setShowMediaSection] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Copy from other dish state
  const [copyAllSideDishes, setCopyAllSideDishes] = useState(false);
  const [copyCarbFromOther, setCopyCarbFromOther] = useState(false);
  const [copySaladFromOther, setCopySaladFromOther] = useState(false);
  const [copyWarmVeggieFromOther, setCopyWarmVeggieFromOther] = useState(false);
  const [copyCondimentFromOther, setCopyCondimentFromOther] = useState(false);

  // Salad combination modal state
  const [showSaladSelectionModal, setShowSaladSelectionModal] = useState(false);
  const [showSaladCreateModal, setShowSaladCreateModal] = useState(false);
  const [selectedSaladComboId, setSelectedSaladComboId] = useState<string | null>(null);
  const [selectedSaladName, setSelectedSaladName] = useState<string | null>(null);

  // Warm veggie simple modal state
  const [showWarmVeggieModal, setShowWarmVeggieModal] = useState(false);
  const [warmVeggies, setWarmVeggies] = useState<Array<{component_dish_id: string; percentage: number}>>([]);

  useEffect(() => {
    fetchComponents();
    if (dish) {
      // Open media section if dish has photo or description
      if (dish.description || (dish as any).photo_url) {
        setShowMediaSection(true);
      }

      setFormData({
        name: dish.name,
        description: dish.description || '',
        photo_url: (dish as any).photo_url || '',
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
        allergen_fish: (dish as any).allergen_fish || false,
        allergen_shellfish: (dish as any).allergen_shellfish || false,
        allergen_nuts: (dish as any).allergen_nuts || false,
        allergen_peanuts: (dish as any).allergen_peanuts || false,
        contains_pork: dish.contains_pork || false,
        contains_beef: dish.contains_beef || false,
        contains_lamb: dish.contains_lamb || false,
        contains_chicken: (dish as any).contains_chicken || false,
        contains_fish: (dish as any).contains_fish || false,
        is_halal: (dish as any).is_halal || false,
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
      let initialCategory: 'soup' | 'hot_dish_meat' | 'hot_dish_fish' | 'hot_dish_veg' | 'component' = 'soup';
      let initialPortionSize = '150';
      let initialPortionUnit: 'pieces' | 'grams' | 'kilograms' | 'milliliters' | 'liters' | 'trays' = 'milliliters';

      if (contextCategory) {
        if (contextCategory === 'soup') {
          initialCategory = 'soup';
          initialPortionSize = '150';
          initialPortionUnit = 'milliliters';
        } else if (contextCategory === 'hot_dish_meat') {
          initialCategory = 'hot_dish_meat';
          initialPortionSize = '200';
          initialPortionUnit = 'grams';
        } else if (contextCategory === 'hot_dish_veg') {
          initialCategory = 'hot_dish_veg';
          initialPortionSize = '200';
          initialPortionUnit = 'grams';
        }
      }

      setFormData({
        name: '',
        description: '',
        photo_url: '',
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
        allergen_fish: false,
        allergen_shellfish: false,
        allergen_nuts: false,
        allergen_peanuts: false,
        contains_pork: false,
        contains_beef: false,
        contains_lamb: false,
        contains_chicken: false,
        contains_fish: false,
        is_halal: false,
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
      setWarmVeggies([]);
    }
  }, [dish]);

  const loadSaladComponents = async (dishId: string) => {
    // First check if this dish uses a salad combination (NEW SYSTEM)
    const { data: dishSaladData } = await supabase
      .from('dish_salad_combinations')
      .select('salad_combination_id, total_portion_g')
      .eq('main_dish_id', dishId)
      .single();

    if (dishSaladData) {
      // Load the salad combination details
      const { data: saladCombo } = await supabase
        .from('v_salad_combinations_full')
        .select('*')
        .eq('id', dishSaladData.salad_combination_id)
        .single();

      if (saladCombo) {
        // Store the salad combo ID and name for later saving
        setSelectedSaladComboId(saladCombo.id);
        setSelectedSaladName(saladCombo.name);

        // Set the total portion size
        setFormData(prev => ({
          ...prev,
          salad_total_portion_g: String(dishSaladData.total_portion_g || '')
        }));

        // Load the components from the salad combination
        setSaladComponents(saladCombo.components.map((comp: any, index: number) => ({
          tempId: `existing-${index}`,
          component_dish_id: comp.component_id,
          component_name: comp.component_name,
          percentage: String(comp.percentage),
        })));
      }
    } else {
      // Fallback: Check OLD SYSTEM (dish_components with component_type='salad')
      const { data: oldSaladData } = await supabase
        .from('dish_components')
        .select('component_dish_id, percentage, component_dish:dishes!component_dish_id(name)')
        .eq('main_dish_id', dishId)
        .eq('component_type', 'salad');

      if (oldSaladData && oldSaladData.length > 0) {
        // Load old format salad components
        setSaladComponents(oldSaladData.map((sc: any, index: number) => ({
          tempId: `old-${index}`,
          component_dish_id: sc.component_dish_id,
          component_name: sc.component_dish?.name || '',
          percentage: String(sc.percentage || ''),
        })));
        setSelectedSaladComboId(null);
        setSelectedSaladName(null); // No name for old format
      } else {
        // No salad data found - reset to default empty row
        setSaladComponents([
          { tempId: '1', component_dish_id: null, component_name: '', percentage: '' }
        ]);
        setSelectedSaladComboId(null);
        setSelectedSaladName(null);
      }
    }
  };

  const loadWarmVeggieComponents = async (dishId: string) => {
    // Load warm veggies using the simplified system (direct dish -> vegetable links)
    const { data } = await supabase
      .from('dish_warm_veggie_components')
      .select('component_dish_id, percentage')
      .eq('dish_id', dishId);

    if (data && data.length > 0) {
      setWarmVeggies(data);
    } else {
      setWarmVeggies([]);
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

  // Salad combination modal handlers
  const handleSelectSaladCombination = async (saladComboId: string, components: Array<{component_name: string; percentage: number}>) => {
    // Store the selected combo ID for saving later
    setSelectedSaladComboId(saladComboId);

    // Fetch the full salad details to get the name
    const { data: saladCombo } = await supabase
      .from('v_salad_combinations_full')
      .select('name')
      .eq('id', saladComboId)
      .single();

    if (saladCombo) {
      setSelectedSaladName(saladCombo.name);
    }

    // Populate the salad components table with the selected combination
    const newComponents = components.map((comp, idx) => ({
      tempId: `loaded-${idx}`,
      component_dish_id: null, // Will be resolved when we fetch full details
      component_name: comp.component_name,
      percentage: String(comp.percentage),
    }));

    setSaladComponents(newComponents);

    // Close modal
    setShowSaladSelectionModal(false);
  };

  const handleCreateNewSalad = () => {
    setShowSaladCreateModal(true);
  };

  const handleAddCustomSalad = (items: Array<{id: string; percentage: number}>, totalPortion: number) => {
    // Update the salad components state
    const newComponents = items.map((item, idx) => ({
      tempId: `custom-${idx}`,
      component_dish_id: item.id,
      component_name: '', // Will be resolved when rendering
      percentage: String(item.percentage),
    }));

    setSaladComponents(newComponents);
    setFormData(prev => ({
      ...prev,
      salad_total_portion_g: totalPortion.toString(),
    }));

    // Clear selected salad combo (this is a custom salad)
    setSelectedSaladComboId(null);
    setSelectedSaladName(null);
  };

  // Warm veggie simple modal handler
  const handleSaveWarmVeggies = (vegetables: Array<{id: string; percentage: number}>, totalPortion: number) => {
    // Update the warm veggies state
    setWarmVeggies(vegetables.map(v => ({
      component_dish_id: v.id,
      percentage: v.percentage,
    })));

    // Update the total portion
    setFormData(prev => ({
      ...prev,
      warm_veggie_total_portion_g: totalPortion.toString(),
    }));
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
    console.log('[MainDishForm] handleSubmit called');
    console.log('[MainDishForm] formData:', formData);
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

        // Delete existing salad combination link (new system)
        await supabase
          .from('dish_salad_combinations')
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

        // Handle salad combination (NEW SYSTEM)
        // If user selected an existing salad combo, link it
        if (selectedSaladComboId && formData.salad_total_portion_g) {
          const { error: saladLinkError } = await supabase
            .from('dish_salad_combinations')
            .insert({
              main_dish_id: dishId,
              salad_combination_id: selectedSaladComboId,
              total_portion_g: parseInt(formData.salad_total_portion_g),
            });

          if (saladLinkError) {
            console.error('Error linking salad combination:', saladLinkError);
            throw new Error('Failed to link salad combination');
          }
        }

        // Insert regular components into dish_components table
        if (componentsToInsert.length > 0) {
          const { error } = await supabase
            .from('dish_components')
            .insert(componentsToInsert);
          if (error) throw error;
        }

        // Handle warm veggies (SIMPLIFIED SYSTEM - direct vegetable links)
        // Delete existing warm veggie components
        await supabase
          .from('dish_warm_veggie_components')
          .delete()
          .eq('dish_id', dishId);

        // Insert new warm veggie components
        if (warmVeggies.length > 0 && formData.warm_veggie_total_portion_g) {
          const warmVeggieInserts = warmVeggies.map(v => ({
            dish_id: dishId,
            component_dish_id: v.component_dish_id,
            percentage: v.percentage,
          }));

          const { error: warmVeggieError } = await supabase
            .from('dish_warm_veggie_components')
            .insert(warmVeggieInserts);

          if (warmVeggieError) {
            console.error('Error inserting warm veggie components:', warmVeggieError);
            throw new Error('Failed to add warm vegetables');
          }
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

  const uploadFile = async (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB');
      return;
    }

    setUploading(true);

    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `dish-photos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('dishes')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('dishes')
        .getPublicUrl(filePath);

      // Update form data
      setFormData(prev => ({ ...prev, photo_url: publicUrl }));

      setMessage({ type: 'success', text: 'Photo uploaded successfully!' });
    } catch (error: any) {
      console.error('Upload error:', error);
      setMessage({ type: 'error', text: `Failed to upload photo: ${error.message}` });
    } finally {
      setUploading(false);
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await uploadFile(file);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await uploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDeletePhoto = () => {
    setFormData(prev => ({ ...prev, photo_url: '' }));
  };


  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="flex gap-0 max-h-[90vh]">
        {/* Main Form */}
        <div className="bg-white rounded-sm shadow-2xl max-w-4xl w-full flex flex-col max-h-[90vh]">
        <div className="p-8 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 100px)' }}>
          <h2 className="text-[28px] font-semibold text-[#1D1D1F] mb-8">
            {dish ? 'Edit Main Dish' : 'Create Main Dish'}
          </h2>

          {message && (
            <div className={`mb-6 px-5 py-4 rounded-sm text-[15px] ${message.type === 'success' ? 'bg-[#34C759]/10 text-[#34C759] border border-[#34C759]/20' : 'bg-[#FF3B30]/10 text-[#FF3B30] border border-[#FF3B30]/20'}`}>
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
                autoFocus
                className="w-full px-4 py-3 border border-apple-gray4 rounded-sm text-apple-subheadline focus:border-apple-blue focus:ring-2 focus:ring-apple-blue/20 outline-none transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-apple-footnote font-medium text-apple-gray3 mb-2">Dish Category</label>
                {contextCategory === 'soup' ? (
                  // Soup context - show as read-only text
                  <div className="w-full px-4 py-3 bg-apple-gray6 border border-apple-gray4 rounded-sm text-apple-subheadline text-apple-gray2">
                    Soup
                  </div>
                ) : contextCategory === 'hot_dish_meat' ? (
                  // Hot meat/fish context - show dropdown with only meat and fish
                  <select
                    value={formData.category === 'component' ? '' : formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any, subcategory: null })}
                    className="w-full px-4 py-3 border border-apple-gray4 rounded-sm text-apple-subheadline focus:border-apple-blue focus:ring-2 focus:ring-apple-blue/20 outline-none transition-all"
                  >
                    <option value="hot_dish_meat">Hot Dish - Meat</option>
                    <option value="hot_dish_fish">Hot Dish - Fish</option>
                  </select>
                ) : contextCategory === 'hot_dish_veg' ? (
                  // Hot veg context - show as read-only text
                  <div className="w-full px-4 py-3 bg-apple-gray6 border border-apple-gray4 rounded-sm text-apple-subheadline text-apple-gray2">
                    Hot Dish - Veg
                  </div>
                ) : (
                  // No context (dishes page) - show all options
                  <select
                    value={formData.category === 'component' ? '' : formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any, subcategory: null })}
                    className="w-full px-4 py-3 border border-apple-gray4 rounded-sm text-apple-subheadline focus:border-apple-blue focus:ring-2 focus:ring-apple-blue/20 outline-none transition-all"
                  >
                    <option value="">-- Select if Main Dish --</option>
                    <option value="soup">Soup</option>
                    <option value="hot_dish_meat">Hot Dish - Meat</option>
                    <option value="hot_dish_fish">Hot Dish - Fish</option>
                    <option value="hot_dish_veg">Hot Dish - Veg</option>
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
                  className="w-full px-4 py-3 border border-apple-gray4 rounded-sm text-apple-subheadline focus:border-apple-blue focus:ring-2 focus:ring-apple-blue/20 outline-none transition-all"
                >
                  <option value="">-- Select if Component --</option>
                  <option value="topping">Soup Topping</option>
                  <option value="carb">Carb</option>
                  <option value="warm_veggie">Warm Vegetables</option>
                  <option value="salad">Salad</option>
                  <option value="condiment">Add-ons</option>
                </select>
              </div>
            </div>

            {formData.category !== 'component' && (
              <div>
                {/* Toggle Button */}
                <button
                  type="button"
                  onClick={() => setShowMediaSection(!showMediaSection)}
                  className={`w-full flex items-center justify-between px-4 py-3 border-2 rounded-sm text-apple-subheadline font-medium transition-all ${
                    showMediaSection
                      ? 'border-[#34C759] bg-[#34C759]/10 text-[#34C759]'
                      : 'border-apple-gray4 text-apple-gray2 hover:border-apple-gray3'
                  }`}
                >
                  <span>Add media and description</span>
                  <svg
                    className={`w-5 h-5 transition-transform ${showMediaSection ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Collapsible Section */}
                {showMediaSection && (
                  <div className="mt-4 p-6 border border-apple-gray5 rounded-sm bg-apple-gray7 space-y-6">
                    {/* Hidden File Input */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />

                    {/* Media Upload/Preview */}
                    <div>
                      <label className="block text-apple-footnote font-medium text-apple-gray3 mb-2">Photo</label>
                      {formData.photo_url ? (
                        /* Photo Preview */
                        <div className="relative">
                          <img
                            src={formData.photo_url}
                            alt="Dish preview"
                            className="w-full h-48 object-cover rounded-sm border border-apple-gray4"
                          />
                          <button
                            type="button"
                            onClick={handleDeletePhoto}
                            className="absolute top-3 right-3 bg-[#FF3B30] text-white p-2 rounded-md hover:bg-[#FF453A] transition-colors"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        /* Upload Area */
                        <div
                          onClick={() => fileInputRef.current?.click()}
                          onDrop={handleDrop}
                          onDragOver={handleDragOver}
                          className="border-2 border-dashed border-apple-gray4 rounded-sm p-8 text-center cursor-pointer hover:border-apple-blue hover:bg-white transition-all"
                        >
                          {uploading ? (
                            <div className="text-apple-gray2">Uploading...</div>
                          ) : (
                            <>
                              <svg
                                className="w-12 h-12 mx-auto text-apple-gray3 mb-3"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                              </svg>
                              <p className="text-apple-subheadline text-apple-gray2 mb-1">
                                Click to upload or drag and drop
                              </p>
                              <p className="text-apple-footnote text-apple-gray3">
                                PNG, JPG up to 5MB
                              </p>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Description Field */}
                    <div>
                      <label className="block text-apple-footnote font-medium text-apple-gray3 mb-2">Description</label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={3}
                        placeholder="Add a description for this dish..."
                        className="w-full px-4 py-3 border border-apple-gray4 rounded-sm text-apple-subheadline focus:border-apple-blue focus:ring-2 focus:ring-apple-blue/20 outline-none transition-all resize-none bg-white"
                      />
                    </div>
                  </div>
                )}
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
                      className="w-full px-4 py-3 border border-apple-gray4 rounded-sm text-apple-subheadline focus:border-apple-blue focus:ring-2 focus:ring-apple-blue/20 outline-none transition-all"
                      required
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-apple-footnote font-medium text-apple-gray3 mb-2">Unit *</label>
                    <select
                      value={formData.portion_unit}
                      onChange={(e) => setFormData({ ...formData, portion_unit: e.target.value as any })}
                      className="w-full px-4 py-3 border border-apple-gray4 rounded-sm text-apple-subheadline focus:border-apple-blue focus:ring-2 focus:ring-apple-blue/20 outline-none transition-all"
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
                    { key: 'allergen_fish', label: 'Fish' },
                    { key: 'allergen_shellfish', label: 'Shellfish' },
                    { key: 'allergen_nuts', label: 'Nuts' },
                    { key: 'allergen_peanuts', label: 'Peanuts' },
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
                {/* Copy all side dishes checkbox - Only for hot dishes */}
                {formData.category !== 'soup' && (
                  <div className="mb-6 p-5 bg-[#0071E3]/5 border-2 border-[#0071E3] rounded-sm">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={copyAllSideDishes}
                        onChange={(e) => setCopyAllSideDishes(e.target.checked)}
                        className="w-6 h-6 text-[#0071E3] border-[#0071E3] rounded focus:ring-[#0071E3]/20"
                      />
                      <span className="text-[17px] font-semibold text-[#0071E3]">
                        Copy all side dishes from other Hot Dish on this Day
                      </span>
                    </label>
                  </div>
                )}
                <div className="space-y-4">
                  {getVisibleSubcategories().map(subcat => {
                    const allComponents = availableComponents.filter(c => c.subcategory === subcat.key);
                    const components = getComponentsByType(subcat.key);
                    const totalCount = allComponents.length;

                    // Special rendering for Salad - inline editor with percentages
                    if (subcat.key === 'salad') {
                      return (
                        <div key={subcat.key} className="border border-apple-gray5 rounded-sm p-5">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-apple-subheadline font-medium text-apple-gray1">
                              {subcat.label}
                            </h4>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={copySaladFromOther}
                                onChange={(e) => setCopySaladFromOther(e.target.checked)}
                                className="w-4 h-4 text-apple-blue border-apple-gray4 rounded focus:ring-apple-blue/20"
                              />
                              <span className="text-apple-footnote text-apple-gray2">
                                Copy from other Hot Dish
                              </span>
                            </label>
                          </div>

                          {/* Salad Selection Buttons */}
                          <div className="flex gap-3 mb-4">
                            <button
                              type="button"
                              onClick={() => setShowSaladSelectionModal(true)}
                              className="flex-1 px-4 py-3 text-[15px] font-medium text-white bg-[#0071E3] hover:bg-[#0077ED] rounded-sm transition-colors flex items-center justify-center gap-2"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                              </svg>
                              Add Existing Salad
                            </button>
                            <button
                              type="button"
                              onClick={handleCreateNewSalad}
                              className="flex-1 px-4 py-3 text-[15px] font-medium text-[#0071E3] border-2 border-[#0071E3] hover:bg-[#F5F5F7] rounded-sm transition-colors flex items-center justify-center gap-2"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                              Create New Salad
                            </button>
                          </div>

                          {/* Salad Summary Display */}
                          {(selectedSaladName || saladComponents.length > 0) && (
                            <div className="mt-4 p-5 bg-[#F5F5F7] border border-[#D2D2D7] rounded-sm">
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <div className="text-[13px] font-medium text-[#86868B] mb-1">
                                    {selectedSaladName ? 'Selected Salad' : 'Custom Salad'}
                                  </div>
                                  {selectedSaladName && (
                                    <div className="text-[17px] font-semibold text-[#1D1D1F] mb-2">
                                      {selectedSaladName}
                                    </div>
                                  )}
                                  {formData.salad_total_portion_g && (
                                    <div className="text-[13px] text-[#6E6E73]">
                                      Total portion: {formData.salad_total_portion_g}g
                                    </div>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={handleCreateNewSalad}
                                  className="text-[13px] text-[#0071E3] hover:text-[#0077ED] font-medium transition-colors"
                                >
                                  Clear
                                </button>
                              </div>

                              {/* Component List */}
                              {saladComponents.length > 0 && (
                                <div className="space-y-1.5 mt-3">
                                  {saladComponents.map((sc) => {
                                    const component = availableComponents.find(c => c.id === sc.component_dish_id);
                                    return (
                                      <div key={sc.tempId} className="flex items-center justify-between text-[13px]">
                                        <span className="text-[#6E6E73]">• {component?.name || sc.component_name}</span>
                                        <span className="text-[#1D1D1F] font-medium">{sc.percentage}%</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    }

                    // Special rendering for Warm Veggies - inline editor with percentages
                    if (subcat.key === 'warm_veggie') {
                      return (
                        <div key={subcat.key} className="border border-apple-gray5 rounded-sm p-5">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-apple-subheadline font-medium text-apple-gray1">
                              {subcat.label}
                            </h4>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={copyWarmVeggieFromOther}
                                onChange={(e) => setCopyWarmVeggieFromOther(e.target.checked)}
                                className="w-4 h-4 text-apple-blue border-apple-gray4 rounded focus:ring-apple-blue/20"
                              />
                              <span className="text-apple-footnote text-apple-gray2">
                                Copy from other Hot Dish
                              </span>
                            </label>
                          </div>

                          {/* Add Warm Vegetables Button */}
                          <button
                            type="button"
                            onClick={() => setShowWarmVeggieModal(true)}
                            className="w-full px-4 py-3 text-[15px] font-medium text-white bg-[#0071E3] hover:bg-[#0077ED] rounded-sm transition-colors flex items-center justify-center gap-2 mb-4"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            {warmVeggies.length > 0 ? 'Edit Warm Vegetables' : 'Add Warm Vegetables'}
                          </button>

                          {/* Display current warm vegetables */}
                          {warmVeggies.length > 0 && formData.warm_veggie_total_portion_g && (
                            <div className="p-4 bg-[#F5F5F7] border border-[#D2D2D7] rounded-sm space-y-2">
                              <div className="text-[13px] font-medium text-[#86868B] mb-2">
                                Total: {formData.warm_veggie_total_portion_g}g
                              </div>
                              {/* Note: We'll need to fetch vegetable names for display */}
                              <div className="text-[13px] text-[#6E6E73]">
                                {warmVeggies.length} vegetable{warmVeggies.length !== 1 ? 's' : ''} selected
                              </div>
                            </div>
                          )}

                          <p className="text-apple-footnote text-apple-gray2 bg-apple-gray6 p-3 rounded-sm mt-3">
                            Click the button above to select vegetables and set portions & percentages
                          </p>
                        </div>
                      );
                    }

                    // Regular component rendering for other types
                    return (
                      <div key={subcat.key} className="border border-apple-gray5 rounded-sm p-5">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-4">
                            <h4 className="text-apple-subheadline font-medium text-apple-gray1">
                              {subcat.label}
                              <span className="text-apple-footnote text-apple-gray3 ml-2 font-normal">
                                (Showing {components.length} of {totalCount})
                              </span>
                            </h4>
                            {/* Add copy checkbox for carbs and condiments */}
                            {(subcat.key === 'carb' || subcat.key === 'condiment') && (
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={subcat.key === 'carb' ? copyCarbFromOther : copyCondimentFromOther}
                                  onChange={(e) => {
                                    if (subcat.key === 'carb') {
                                      setCopyCarbFromOther(e.target.checked);
                                    } else {
                                      setCopyCondimentFromOther(e.target.checked);
                                    }
                                  }}
                                  className="w-4 h-4 text-apple-blue border-apple-gray4 rounded focus:ring-apple-blue/20"
                                />
                                <span className="text-apple-footnote text-apple-gray2">
                                  Copy from other Hot Dish
                                </span>
                              </label>
                            )}
                          </div>
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
                            className="w-full px-4 py-3 text-apple-subheadline border border-apple-gray4 rounded-sm mb-3 focus:border-apple-blue focus:ring-2 focus:ring-apple-blue/20 outline-none transition-all"
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
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { key: 'contains_pork', label: 'Pork' },
                    { key: 'contains_beef', label: 'Beef' },
                    { key: 'contains_lamb', label: 'Lamb' },
                    { key: 'contains_chicken', label: 'Chicken' },
                    { key: 'contains_fish', label: 'Fish' },
                    { key: 'is_halal', label: 'Halal' },
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

        {/* Sticky Footer with Buttons */}
        <div className="flex justify-end gap-3 px-8 py-6 bg-white border-t border-[#E8E8ED] rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 text-[15px] font-medium text-[#1D1D1F] border border-[#D2D2D7] rounded-sm hover:bg-[#F5F5F7] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              const form = document.getElementById('main-dish-form') as HTMLFormElement;
              if (form) {
                form.requestSubmit();
              }
            }}
            disabled={saving}
            className="px-6 py-3 text-[15px] font-medium text-white bg-[#0071E3] hover:bg-[#0077ED] rounded-sm transition-colors disabled:opacity-40"
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

      {/* Salad Selection Modal */}
      <SaladSelectionModal
        isOpen={showSaladSelectionModal}
        onClose={() => setShowSaladSelectionModal(false)}
        onSelect={handleSelectSaladCombination}
      />

      {/* Salad Create Modal */}
      <SaladCreateModal
        isOpen={showSaladCreateModal}
        onClose={() => setShowSaladCreateModal(false)}
        onAdd={handleAddCustomSalad}
        existingItems={saladComponents.map(sc => ({
          component_dish_id: sc.component_dish_id || '',
          percentage: parseInt(sc.percentage) || 0,
        })).filter(sc => sc.component_dish_id)}
        existingTotalPortion={parseInt(formData.salad_total_portion_g) || 0}
      />

      {/* Warm Vegetable Simple Modal */}
      <WarmVeggieSimpleModal
        isOpen={showWarmVeggieModal}
        onClose={() => setShowWarmVeggieModal(false)}
        onAdd={handleSaveWarmVeggies}
        existingVegetables={warmVeggies}
        existingTotalPortion={parseInt(formData.warm_veggie_total_portion_g) || 0}
      />
    </div>
  );
}
