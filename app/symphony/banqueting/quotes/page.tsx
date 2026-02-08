'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

interface BanquetingQuote {
  id: string;
  po_number: string | null;
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

export default function BanquetingQuotesPage() {
  const [quotes, setQuotes] = useState<BanquetingQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchQuotes();
  }, []);

  const fetchQuotes = async () => {
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
        setQuotes([]);
        setLoading(false);
        return;
      }

      // Fetch quotes (orders with status 'quoted')
      const { data, error } = await supabase
        .from('banqueting_orders')
        .select('*')
        .eq('location_id', location.id)
        .eq('status', 'quoted')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching quotes:', error);
        setQuotes([]);
      } else {
        setQuotes(data || []);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setQuotes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveQuote = async (quoteId: string) => {
    const confirmApproval = window.confirm('Approve this quote and convert to confirmed order?');
    if (!confirmApproval) return;

    try {
      const { error } = await supabase
        .from('banqueting_orders')
        .update({ status: 'confirmed' })
        .eq('id', quoteId);

      if (error) {
        console.error('Error approving quote:', error);
        alert('Failed to approve quote. Please try again.');
      } else {
        alert('Quote approved successfully!');
        fetchQuotes(); // Refresh the list
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      alert('An error occurred. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <main className="max-w-7xl mx-auto px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-[22px] font-semibold text-[#1D1D1F] mb-1">Quote Requests</h1>
          <p className="text-[15px] text-[#6E6E73]">
            Review and approve pending quote requests from Symphony office managers
          </p>
        </div>

        {/* Quotes Table */}
        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0071E3] mx-auto"></div>
            <p className="mt-4 text-[15px] text-[#86868B]">Loading quotes...</p>
          </div>
        ) : quotes.length === 0 ? (
          <div className="bg-white border border-[#E8E8ED] rounded-sm p-12 text-center">
            <svg className="w-16 h-16 text-[#D2D2D7] mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-[17px] font-semibold text-[#1D1D1F] mb-2">No pending quotes</h3>
            <p className="text-[15px] text-[#86868B] max-w-md mx-auto">
              When office managers request quotes for banqueting services, they will appear here for review.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-sm border border-[#E8E8ED] shadow-sm overflow-x-auto">
            <table className="min-w-full divide-y divide-[#E8E8ED]">
              <thead className="bg-[#FAFAFA]">
                <tr>
                  <th className="px-6 py-4 text-left text-[13px] font-semibold text-[#86868B] uppercase tracking-wide">
                    PO Number
                  </th>
                  <th className="px-6 py-4 text-left text-[13px] font-semibold text-[#86868B] uppercase tracking-wide">
                    Requested
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
                  <th className="px-6 py-4 text-right text-[13px] font-semibold text-[#86868B] uppercase tracking-wide">
                    Total
                  </th>
                  <th className="px-6 py-4 text-right text-[13px] font-semibold text-[#86868B] uppercase tracking-wide">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-[#E8E8ED]">
                {quotes.map((quote) => (
                  <tr key={quote.id} className="hover:bg-[#F5F5F7] transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-[15px] font-semibold text-[#0071E3]">
                        {quote.po_number || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-[15px] text-[#1D1D1F]">
                        {format(new Date(quote.created_at), 'MMM d, yyyy')}
                      </div>
                      <div className="text-[13px] text-[#86868B]">
                        {format(new Date(quote.created_at), 'h:mm a')}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-[15px] font-medium text-[#1D1D1F]">{quote.company_name}</div>
                      {quote.floor_number && (
                        <div className="text-[13px] text-[#86868B]">Floor {quote.floor_number}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-[15px] text-[#1D1D1F]">{quote.contact_name}</div>
                      <div className="text-[13px] text-[#86868B]">{quote.contact_email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-[15px] text-[#1D1D1F]">
                        {format(new Date(quote.delivery_date), 'MMM d, yyyy')}
                      </div>
                      <div className="text-[13px] text-[#86868B]">{quote.delivery_time}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-[15px] font-semibold text-[#1D1D1F]">
                      €{quote.total_amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => handleApproveQuote(quote.id)}
                        className="px-4 py-2 text-[13px] font-semibold text-white bg-[#0071E3] hover:bg-[#0077ED] rounded-sm transition-colors"
                      >
                        Approve
                      </button>
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
