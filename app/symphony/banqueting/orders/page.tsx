'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

interface TimeslotItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface Timeslot {
  id: string;
  delivery_time: string;
  floor_number: string | null;
  guest_count: number;
  notes: string | null;
  items: TimeslotItem[];
}

interface Order {
  id: string;
  order_number: string;
  order_date: string;
  po_number: string | null;
  status: string;
  total_amount: number;
  order_type: string;
  notes: string | null;
  created_at: string;
  symphony_companies: {
    company_name: string;
  };
  timeslots: Timeslot[];
}

export default function BanquetingOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchOrders();
  }, [selectedDate]);

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('symphony_banqueting_orders')
      .select(`
        *,
        symphony_companies(company_name)
      `)
      .eq('order_date', selectedDate)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching orders:', error);
    } else {
      setOrders(data || []);
    }
    setLoading(false);
  };

  const fetchOrderDetails = async (orderId: string) => {
    const { data: timeslotsData, error: timeslotsError } = await supabase
      .from('symphony_banqueting_timeslots')
      .select(`
        *,
        symphony_banqueting_timeslot_items(*)
      `)
      .eq('order_id', orderId)
      .order('delivery_time', { ascending: true });

    if (timeslotsError) {
      console.error('Error fetching timeslots:', timeslotsError);
      return;
    }

    const order = orders.find(o => o.id === orderId);
    if (order) {
      const formattedTimeslots = (timeslotsData || []).map(ts => ({
        ...ts,
        items: ts.symphony_banqueting_timeslot_items || [],
      }));

      setSelectedOrder({
        ...order,
        timeslots: formattedTimeslots,
      });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-[#FF9500] text-white';
      case 'confirmed':
        return 'bg-[#0071E3] text-white';
      case 'completed':
        return 'bg-[#34C759] text-white';
      case 'cancelled':
        return 'bg-[#FF3B30] text-white';
      default:
        return 'bg-[#86868B] text-white';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0071E3]"></div>
      </div>
    );
  }

  // Worksheet View
  if (selectedOrder) {
    return (
      <div className="min-h-screen bg-white">
        {/* Print Header */}
        <div className="print:block hidden text-center mb-8">
          <h1 className="text-[32px] font-bold text-[#1D1D1F]">Symphony Offices</h1>
          <p className="text-[17px] text-[#6E6E73]">Banqueting Order Worksheet</p>
        </div>

        {/* Screen Header */}
        <div className="print:hidden sticky top-0 bg-white border-b border-[#E8E8ED] z-10 px-8 py-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <button
              onClick={() => setSelectedOrder(null)}
              className="text-[15px] text-[#0071E3] font-medium hover:text-[#0077ED] transition-colors"
            >
              ← Back to Orders
            </button>
            <button
              onClick={handlePrint}
              className="px-6 py-2.5 bg-[#0071E3] text-white text-[15px] font-semibold rounded-lg hover:bg-[#0077ED] transition-colors"
            >
              Print Worksheet
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-8 py-8">
          {/* Order Header */}
          <div className="mb-8 pb-6 border-b-2 border-[#1D1D1F]">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="text-[13px] text-[#86868B] uppercase tracking-wide mb-1">Order Number</div>
                <div className="text-[28px] font-bold text-[#1D1D1F]">{selectedOrder.order_number}</div>
              </div>
              <div className={`px-4 py-2 rounded-lg text-[13px] font-semibold uppercase ${getStatusColor(selectedOrder.status)}`}>
                {selectedOrder.status}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div>
                <div className="text-[13px] text-[#86868B] mb-1">Company</div>
                <div className="text-[17px] font-semibold text-[#1D1D1F]">{selectedOrder.symphony_companies.company_name}</div>
              </div>
              <div>
                <div className="text-[13px] text-[#86868B] mb-1">Event Date</div>
                <div className="text-[17px] font-semibold text-[#1D1D1F]">
                  {format(new Date(selectedOrder.order_date), 'EEEE, MMMM d, yyyy')}
                </div>
              </div>
              {selectedOrder.po_number && (
                <div>
                  <div className="text-[13px] text-[#86868B] mb-1">PO Number</div>
                  <div className="text-[17px] font-semibold text-[#1D1D1F]">{selectedOrder.po_number}</div>
                </div>
              )}
              <div>
                <div className="text-[13px] text-[#86868B] mb-1">Order Type</div>
                <div className="text-[17px] font-semibold text-[#1D1D1F] uppercase">{selectedOrder.order_type}</div>
              </div>
            </div>
          </div>

          {/* Timeslots */}
          <div className="space-y-8">
            {selectedOrder.timeslots.map((timeslot, index) => (
              <div key={timeslot.id} className="border-2 border-[#E8E8ED] rounded-lg overflow-hidden break-inside-avoid">
                <div className="bg-[#F5F5F7] px-6 py-4 border-b-2 border-[#E8E8ED]">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-[13px] text-[#86868B] font-medium uppercase tracking-wide">
                        Delivery {index + 1}
                      </div>
                      <div className="text-[22px] font-bold text-[#1D1D1F]">
                        {timeslot.delivery_time}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[13px] text-[#86868B]">Guests</div>
                      <div className="text-[22px] font-bold text-[#1D1D1F]">{timeslot.guest_count}</div>
                    </div>
                  </div>
                  {timeslot.floor_number && (
                    <div className="mt-2 text-[15px] text-[#6E6E73]">
                      Floor: <span className="font-semibold text-[#1D1D1F]">{timeslot.floor_number}</span>
                    </div>
                  )}
                </div>

                <div className="p-6">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-[#E8E8ED]">
                        <th className="text-left py-3 text-[13px] font-semibold text-[#86868B] uppercase tracking-wide">
                          Product
                        </th>
                        <th className="text-center py-3 text-[13px] font-semibold text-[#86868B] uppercase tracking-wide">
                          Quantity
                        </th>
                        <th className="text-right py-3 text-[13px] font-semibold text-[#86868B] uppercase tracking-wide">
                          Unit Price
                        </th>
                        <th className="text-right py-3 text-[13px] font-semibold text-[#86868B] uppercase tracking-wide">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {timeslot.items.map(item => (
                        <tr key={item.id} className="border-b border-[#E8E8ED]">
                          <td className="py-4 text-[15px] text-[#1D1D1F]">{item.product_name}</td>
                          <td className="py-4 text-[15px] text-[#1D1D1F] text-center font-semibold">{item.quantity}</td>
                          <td className="py-4 text-[15px] text-[#6E6E73] text-right">€{item.unit_price.toFixed(2)}</td>
                          <td className="py-4 text-[15px] text-[#1D1D1F] text-right font-semibold">
                            €{item.total_price.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {timeslot.notes && (
                    <div className="mt-6 p-4 bg-[#FFF8E1] border border-[#FFD54F] rounded-lg">
                      <div className="text-[13px] font-semibold text-[#86868B] uppercase tracking-wide mb-2">
                        Special Instructions:
                      </div>
                      <div className="text-[15px] text-[#1D1D1F] whitespace-pre-wrap">{timeslot.notes}</div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t-2 border-[#1D1D1F]">
            <div className="flex justify-between items-center">
              <div className="text-[22px] font-bold text-[#1D1D1F]">Total Amount</div>
              <div className="text-[32px] font-bold text-[#0071E3]">
                €{selectedOrder.total_amount.toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        <style jsx global>{`
          @media print {
            body {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .print\\:hidden {
              display: none !important;
            }
            .print\\:block {
              display: block !important;
            }
            @page {
              margin: 2cm;
              size: A4;
            }
          }
        `}</style>
      </div>
    );
  }

  // Orders List
  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-[24px] font-semibold text-[#1D1D1F] mb-4">Banqueting Orders</h1>

          <div className="flex items-center gap-4">
            <div>
              <label className="block text-[13px] font-medium text-[#86868B] mb-2">Filter by Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-4 py-2 border border-[#D2D2D7] rounded-lg text-[15px] text-[#1D1D1F] focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20"
              />
            </div>
            <div className="text-[15px] text-[#6E6E73] mt-6">
              {orders.length} order{orders.length !== 1 ? 's' : ''} found
            </div>
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="bg-[#F5F5F7] border border-[#E8E8ED] rounded-lg p-12 text-center">
            <p className="text-[17px] text-[#6E6E73]">No orders found for this date</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {orders.map(order => (
              <button
                key={order.id}
                onClick={() => fetchOrderDetails(order.id)}
                className="bg-white border border-[#E8E8ED] rounded-lg p-6 hover:border-[#0071E3] hover:shadow-md transition-all text-left"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="text-[17px] font-semibold text-[#1D1D1F]">{order.order_number}</div>
                      <div className={`px-3 py-1 rounded-full text-[11px] font-semibold uppercase ${getStatusColor(order.status)}`}>
                        {order.status}
                      </div>
                    </div>
                    <div className="text-[15px] text-[#6E6E73]">{order.symphony_companies.company_name}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[22px] font-semibold text-[#0071E3]">
                      €{order.total_amount.toFixed(2)}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
