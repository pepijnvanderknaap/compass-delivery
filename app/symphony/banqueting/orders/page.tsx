'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns';

interface BanquetingOrder {
  id: string;
  company_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  delivery_date: string;
  delivery_time: string;
  floor_number: string | null;
  status: string;
  notes: string | null;
  total_amount: number;
  created_at: string;
}

export default function BanquetingOrdersPage() {
  const [orders, setOrders] = useState<BanquetingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const supabase = createClient();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      // Get Symphony location ID
      const { data: location } = await supabase
        .from('locations')
        .select('id')
        .eq('name', 'Symphony')
        .single();

      if (!location) {
        console.error('Symphony location not found');
        setOrders([]);
        setLoading(false);
        return;
      }

      // Fetch orders for Symphony location
      const { data, error } = await supabase
        .from('banqueting_orders')
        .select('*')
        .eq('location_id', location.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching orders:', error);
        setOrders([]);
      } else {
        setOrders(data || []);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-[#FF9500]/10 text-[#FF9500]',
      confirmed: 'bg-[#0071E3]/10 text-[#0071E3]',
      completed: 'bg-[#34C759]/10 text-[#34C759]',
      cancelled: 'bg-[#FF3B30]/10 text-[#FF3B30]',
    };

    return (
      <span className={`px-3 py-1 text-[12px] font-semibold rounded-full ${styles[status as keyof typeof styles]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-white">
      <main className="max-w-7xl mx-auto px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-[22px] font-semibold text-[#1D1D1F] mb-1">Incoming Orders</h1>
            <p className="text-[15px] text-[#6E6E73]">Manage banqueting orders from Symphony office managers</p>
          </div>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2.5 border border-[#D2D2D7] rounded-sm text-[15px] text-[#1D1D1F] bg-white focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 transition-all"
          >
            <option value="all">All Orders</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Orders Table */}
        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0071E3] mx-auto"></div>
            <p className="mt-4 text-[15px] text-[#86868B]">Loading orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white border border-[#E8E8ED] rounded-sm p-12 text-center">
            <svg className="w-16 h-16 text-[#D2D2D7] mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className="text-[17px] font-semibold text-[#1D1D1F] mb-2">No orders yet</h3>
            <p className="text-[15px] text-[#86868B] max-w-md mx-auto">
              When customers place banqueting orders, they will appear here. The order submission system will be completed soon.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-sm border border-[#E8E8ED] shadow-sm overflow-x-auto">
            <table className="min-w-full divide-y divide-[#E8E8ED]">
              <thead className="bg-[#FAFAFA]">
                <tr>
                  <th className="px-6 py-4 text-left text-[13px] font-semibold text-[#86868B] uppercase tracking-wide">
                    Order Date
                  </th>
                  <th className="px-6 py-4 text-left text-[13px] font-semibold text-[#86868B] uppercase tracking-wide">
                    Company
                  </th>
                  <th className="px-6 py-4 text-left text-[13px] font-semibold text-[#86868B] uppercase tracking-wide">
                    Contact
                  </th>
                  <th className="px-6 py-4 text-left text-[13px] font-semibold text-[#86868B] uppercase tracking-wide">
                    Event Date/Time
                  </th>
                  <th className="px-6 py-4 text-left text-[13px] font-semibold text-[#86868B] uppercase tracking-wide">
                    Status
                  </th>
                  <th className="px-6 py-4 text-right text-[13px] font-semibold text-[#86868B] uppercase tracking-wide">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-[#E8E8ED]">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-[#F5F5F7] transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-[15px] text-[#1D1D1F]">
                        {format(new Date(order.created_at), 'MMM d, yyyy')}
                      </div>
                      <div className="text-[13px] text-[#86868B]">
                        {format(new Date(order.created_at), 'h:mm a')}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-[15px] font-medium text-[#1D1D1F]">{order.company_name}</div>
                      {order.floor_number && (
                        <div className="text-[13px] text-[#86868B]">Floor {order.floor_number}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-[15px] text-[#1D1D1F]">{order.contact_name}</div>
                      <div className="text-[13px] text-[#86868B]">{order.contact_email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-[15px] text-[#1D1D1F]">
                        {format(new Date(order.delivery_date), 'MMM d, yyyy')}
                      </div>
                      <div className="text-[13px] text-[#86868B]">{order.delivery_time}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(order.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-[15px] font-semibold text-[#1D1D1F]">
                      €{order.total_amount.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
