'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface CateringOrder {
  id: string;
  location_id: string;
  delivery_date: string;
  description: string;
  estimated_portions: number;
  food_cost: number;
  labor_cost: number;
  total_cost: number;
  status: 'draft' | 'ready_for_production' | 'delivered';
  created_at: string;
  locations: {
    name: string;
    slug: string;
  };
}

interface CateringOrderItem {
  id: string;
  catering_order_id: string;
  component_id: string;
  quantity_g: number;
  cost_per_kg: number;
  total_cost: number;
  components: {
    name: string;
  };
}

interface Component {
  id: string;
  name: string;
  cost_per_kg: number;
}

export default function KitchenCateringPage() {
  const supabase = createClient();

  const [orders, setOrders] = useState<CateringOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<CateringOrder | null>(null);
  const [orderItems, setOrderItems] = useState<CateringOrderItem[]>([]);
  const [laborCost, setLaborCost] = useState<number>(0);

  // Component search
  const [showComponentSearch, setShowComponentSearch] = useState(false);
  const [componentSearch, setComponentSearch] = useState('');
  const [components, setComponents] = useState<Component[]>([]);
  const [filteredComponents, setFilteredComponents] = useState<Component[]>([]);

  useEffect(() => {
    loadOrders();
    loadComponents();
  }, []);

  const loadOrders = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('catering_orders')
      .select('*, locations(name, slug)')
      .order('delivery_date', { ascending: true })
      .order('created_at', { ascending: false });

    if (data) {
      setOrders(data);
    }

    setLoading(false);
  };

  const loadComponents = async () => {
    const { data } = await supabase
      .from('components')
      .select('id, name, cost_per_kg')
      .order('name');

    if (data) {
      setComponents(data);
      setFilteredComponents(data);
    }
  };

  const loadOrderItems = async (orderId: string) => {
    const { data } = await supabase
      .from('catering_order_items')
      .select('*, components(name)')
      .eq('catering_order_id', orderId);

    if (data) {
      setOrderItems(data);
    }
  };

  const handleSelectOrder = async (order: CateringOrder) => {
    setSelectedOrder(order);
    setLaborCost(order.labor_cost);
    await loadOrderItems(order.id);
  };

  const handleAddComponent = async (component: Component) => {
    if (!selectedOrder) return;

    const { data, error } = await supabase
      .from('catering_order_items')
      .insert({
        catering_order_id: selectedOrder.id,
        component_id: component.id,
        quantity_g: 1000, // Default 1kg
        cost_per_kg: component.cost_per_kg,
        total_cost: component.cost_per_kg, // 1kg * cost_per_kg
      })
      .select('*, components(name)')
      .single();

    if (data) {
      setOrderItems([...orderItems, data]);
      calculateAndUpdateCosts([...orderItems, data], laborCost);
    }

    setShowComponentSearch(false);
    setComponentSearch('');
    setFilteredComponents(components);
  };

  const handleUpdateItemQuantity = async (item: CateringOrderItem, newQuantityG: number) => {
    const newTotalCost = (newQuantityG / 1000) * item.cost_per_kg;

    const { error } = await supabase
      .from('catering_order_items')
      .update({
        quantity_g: newQuantityG,
        total_cost: newTotalCost,
      })
      .eq('id', item.id);

    if (!error) {
      const updatedItems = orderItems.map(i =>
        i.id === item.id
          ? { ...i, quantity_g: newQuantityG, total_cost: newTotalCost }
          : i
      );
      setOrderItems(updatedItems);
      calculateAndUpdateCosts(updatedItems, laborCost);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    const { error } = await supabase
      .from('catering_order_items')
      .delete()
      .eq('id', itemId);

    if (!error) {
      const updatedItems = orderItems.filter(i => i.id !== itemId);
      setOrderItems(updatedItems);
      calculateAndUpdateCosts(updatedItems, laborCost);
    }
  };

  const handleUpdateLaborCost = (newLaborCost: number) => {
    setLaborCost(newLaborCost);
    calculateAndUpdateCosts(orderItems, newLaborCost);
  };

  const calculateAndUpdateCosts = async (items: CateringOrderItem[], labor: number) => {
    if (!selectedOrder) return;

    const foodCost = items.reduce((sum, item) => sum + item.total_cost, 0);
    const totalCost = foodCost + labor;

    const { error } = await supabase
      .from('catering_orders')
      .update({
        food_cost: foodCost,
        labor_cost: labor,
        total_cost: totalCost,
      })
      .eq('id', selectedOrder.id);

    if (!error) {
      setSelectedOrder({
        ...selectedOrder,
        food_cost: foodCost,
        labor_cost: labor,
        total_cost: totalCost,
      });

      // Update in orders list
      setOrders(orders.map(o =>
        o.id === selectedOrder.id
          ? { ...o, food_cost: foodCost, labor_cost: labor, total_cost: totalCost }
          : o
      ));
    }
  };

  const handleMarkReady = async () => {
    if (!selectedOrder) return;

    const { error } = await supabase
      .from('catering_orders')
      .update({ status: 'ready_for_production' })
      .eq('id', selectedOrder.id);

    if (!error) {
      setSelectedOrder({ ...selectedOrder, status: 'ready_for_production' });
      setOrders(orders.map(o =>
        o.id === selectedOrder.id
          ? { ...o, status: 'ready_for_production' }
          : o
      ));
    }
  };

  const handleComponentSearchChange = (search: string) => {
    setComponentSearch(search);
    if (search.trim() === '') {
      setFilteredComponents(components);
    } else {
      const filtered = components.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase())
      );
      setFilteredComponents(filtered);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'text-[#86868B] bg-[#F5F5F7]';
      case 'ready_for_production': return 'text-[#FF9500] bg-[#FFF4E5]';
      case 'delivered': return 'text-[#34C759] bg-[#E8F8EC]';
      default: return 'text-[#86868B] bg-[#F5F5F7]';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return 'New Request';
      case 'ready_for_production': return 'Ready for Production';
      case 'delivered': return 'Delivered';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0071E3]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Header */}
      <div className="bg-white border-b border-[#D2D2D7]">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <h1 className="text-[28px] font-semibold text-[#1D1D1F]">Catering Orders</h1>
          <p className="text-[13px] text-[#86868B] mt-1">Build and manage off-menu orders for locations</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {orders.length === 0 ? (
          <div className="bg-white border border-[#E8E8ED] rounded-xl p-12 text-center">
            <p className="text-[15px] text-[#86868B]">No catering orders yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Orders List */}
            <div className="lg:col-span-1 space-y-3">
              {orders.map((order) => (
                <div
                  key={order.id}
                  onClick={() => handleSelectOrder(order)}
                  className={`bg-white border rounded-xl p-4 cursor-pointer transition-all ${
                    selectedOrder?.id === order.id
                      ? 'border-[#0071E3] shadow-md'
                      : 'border-[#E8E8ED] hover:border-[#0071E3]'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="text-[13px] font-semibold text-[#0071E3]">{order.locations.name}</p>
                      <p className="text-[15px] font-semibold text-[#1D1D1F] mt-1">
                        {new Date(order.delivery_date).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-[11px] font-medium rounded-full ${getStatusColor(order.status)}`}>
                      {getStatusLabel(order.status)}
                    </span>
                  </div>
                  <p className="text-[13px] text-[#1D1D1F] line-clamp-2">{order.description}</p>
                  {order.total_cost > 0 && (
                    <p className="text-[13px] font-semibold text-[#1D1D1F] mt-2">€ {order.total_cost.toFixed(2)}</p>
                  )}
                </div>
              ))}
            </div>

            {/* Order Builder */}
            {selectedOrder && (
              <div className="lg:col-span-2 bg-white border border-[#E8E8ED] rounded-xl p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-[22px] font-semibold text-[#1D1D1F]">{selectedOrder.locations.name}</h2>
                    <p className="text-[15px] text-[#86868B] mt-1">
                      Delivery: {new Date(selectedOrder.delivery_date).toLocaleDateString('en-GB', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                  <span className={`px-3 py-1 text-[12px] font-medium rounded-full ${getStatusColor(selectedOrder.status)}`}>
                    {getStatusLabel(selectedOrder.status)}
                  </span>
                </div>

                <div className="bg-[#F5F5F7] border border-[#E8E8ED] rounded-lg p-4 mb-6">
                  <p className="text-[15px] text-[#1D1D1F]">{selectedOrder.description}</p>
                  {selectedOrder.estimated_portions > 0 && (
                    <p className="text-[13px] text-[#86868B] mt-2">Estimated portions: {selectedOrder.estimated_portions}</p>
                  )}
                </div>

                {/* Items List */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[17px] font-semibold text-[#1D1D1F]">Components</h3>
                    <button
                      onClick={() => setShowComponentSearch(true)}
                      className="px-4 py-2 text-[13px] font-medium text-[#0071E3] hover:text-[#0077ED] border border-[#0071E3] hover:border-[#0077ED] rounded-lg transition-colors"
                    >
                      + Add Component
                    </button>
                  </div>

                  {orderItems.length === 0 ? (
                    <div className="bg-[#F5F5F7] border border-[#E8E8ED] rounded-lg p-8 text-center">
                      <p className="text-[13px] text-[#86868B]">No components added yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {orderItems.map((item) => (
                        <div key={item.id} className="flex items-center gap-4 bg-[#F5F5F7] border border-[#E8E8ED] rounded-lg p-3">
                          <div className="flex-1">
                            <p className="text-[15px] font-medium text-[#1D1D1F]">{item.components.name}</p>
                            <p className="text-[13px] text-[#86868B]">€ {item.cost_per_kg.toFixed(2)}/kg</p>
                          </div>
                          <input
                            type="number"
                            value={item.quantity_g}
                            onChange={(e) => handleUpdateItemQuantity(item, parseInt(e.target.value) || 0)}
                            className="w-24 px-3 py-2 text-[13px] text-right border border-[#D2D2D7] rounded-lg focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 focus:outline-none"
                          />
                          <span className="text-[13px] text-[#86868B] w-8">g</span>
                          <span className="text-[15px] font-semibold text-[#1D1D1F] w-20 text-right">
                            € {item.total_cost.toFixed(2)}
                          </span>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="text-[#FF3B30] hover:text-[#FF453A] text-[13px] font-medium"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Cost Summary */}
                <div className="border-t border-[#E8E8ED] pt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[15px] text-[#86868B]">Food Cost</span>
                    <span className="text-[17px] font-semibold text-[#1D1D1F]">€ {selectedOrder.food_cost.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[15px] text-[#86868B]">Labor Cost</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[15px] text-[#86868B]">€</span>
                      <input
                        type="number"
                        value={laborCost || ''}
                        onChange={(e) => handleUpdateLaborCost(parseFloat(e.target.value) || 0)}
                        step="0.01"
                        className="w-28 px-3 py-2 text-[15px] text-right border border-[#D2D2D7] rounded-lg focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-[#E8E8ED]">
                    <span className="text-[17px] font-semibold text-[#1D1D1F]">Total Cost</span>
                    <span className="text-[22px] font-semibold text-[#1D1D1F]">€ {selectedOrder.total_cost.toFixed(2)}</span>
                  </div>
                </div>

                {/* Action Button */}
                {selectedOrder.status === 'draft' && (
                  <div className="mt-6">
                    <button
                      onClick={handleMarkReady}
                      disabled={orderItems.length === 0}
                      className="w-full px-6 py-3 text-[15px] font-semibold text-white bg-[#0071E3] hover:bg-[#0077ED] rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Mark Ready for Production
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Component Search Modal */}
      {showComponentSearch && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-[#E8E8ED]">
              <input
                type="text"
                value={componentSearch}
                onChange={(e) => handleComponentSearchChange(e.target.value)}
                placeholder="Search components..."
                autoFocus
                className="w-full px-4 py-3 text-[17px] border border-[#D2D2D7] rounded-lg focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 focus:outline-none"
              />
            </div>
            <div className="overflow-y-auto max-h-[60vh] p-4">
              {filteredComponents.length === 0 ? (
                <p className="text-[13px] text-[#86868B] text-center py-8">No components found</p>
              ) : (
                <div className="space-y-2">
                  {filteredComponents.map((component) => (
                    <div
                      key={component.id}
                      onClick={() => handleAddComponent(component)}
                      className="flex items-center justify-between p-4 hover:bg-[#F5F5F7] rounded-lg cursor-pointer transition-colors"
                    >
                      <div>
                        <p className="text-[15px] font-medium text-[#1D1D1F]">{component.name}</p>
                        <p className="text-[13px] text-[#86868B]">€ {component.cost_per_kg.toFixed(2)}/kg</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 border-t border-[#E8E8ED]">
              <button
                onClick={() => {
                  setShowComponentSearch(false);
                  setComponentSearch('');
                  setFilteredComponents(components);
                }}
                className="w-full px-6 py-3 text-[15px] font-medium text-[#1D1D1F] border border-[#D2D2D7] rounded-lg hover:bg-[#F5F5F7] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
