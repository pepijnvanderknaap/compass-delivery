'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

interface CompanyData {
  id: string;
  company_name: string;
  address: string | null;
  main_telephone: string | null;
  po_workflow: string;
  requires_invoice_export: boolean;
  invoice_export_format: string | null;
  accounting_software: string | null;
  notes: string | null;
}

interface OfficeManager {
  id: string;
  name: string;
  email: string;
  telephone: string | null;
  department: string | null;
}

interface CompanyWithManagers extends CompanyData {
  managers: OfficeManager[];
}

export default function CompanySettingsViewPage() {
  const [companies, setCompanies] = useState<CompanyWithManagers[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        // Fetch all companies
        const { data: companiesData, error: companiesError } = await supabase
          .from('symphony_companies')
          .select('*')
          .order('company_name');

        if (companiesError) {
          console.error('Error fetching companies:', companiesError);
          return;
        }

        // Fetch office managers for all companies
        const { data: managersData, error: managersError } = await supabase
          .from('symphony_office_managers')
          .select('*')
          .order('created_at');

        if (managersError) {
          console.error('Error fetching managers:', managersError);
        }

        // Combine data
        const companiesWithManagers: CompanyWithManagers[] = (companiesData || []).map(company => ({
          ...company,
          managers: (managersData || []).filter(m => m.company_id === company.id),
        }));

        setCompanies(companiesWithManagers);
      } catch (err) {
        console.error('Unexpected error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCompanies();
  }, [supabase]);

  const getPOWorkflowLabel = (workflow: string) => {
    switch (workflow) {
      case 'provide_with_order':
        return 'Provide PO with order';
      case 'quote_then_po':
        return 'Request quote first';
      case 'no_po_required':
        return 'No PO required';
      default:
        return workflow;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0071E3]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-[24px] font-semibold text-[#1D1D1F] mb-2">
            Company Settings Overview
          </h1>
          <p className="text-[15px] text-[#6E6E73]">
            View configuration and contact information for all tenant companies
          </p>
        </div>

        {companies.length === 0 ? (
          <div className="bg-[#F5F5F7] border border-[#E8E8ED] rounded-lg p-12 text-center">
            <p className="text-[15px] text-[#6E6E73]">No companies found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {companies.map((company) => (
              <div
                key={company.id}
                className="bg-white border border-[#E8E8ED] rounded-lg shadow-sm overflow-hidden"
              >
                {/* Company Header */}
                <button
                  onClick={() => setExpandedCompany(expandedCompany === company.id ? null : company.id)}
                  className="w-full px-6 py-4 flex justify-between items-center hover:bg-[#F5F5F7] transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <h2 className="text-[17px] font-semibold text-[#1D1D1F]">
                      {company.company_name}
                    </h2>
                    {company.managers.length > 0 && (
                      <span className="text-[13px] text-[#86868B]">
                        {company.managers.length} manager{company.managers.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <svg
                    className={`w-5 h-5 text-[#86868B] transition-transform ${
                      expandedCompany === company.id ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Expanded Content */}
                {expandedCompany === company.id && (
                  <div className="px-6 pb-6 space-y-6 border-t border-[#E8E8ED] pt-6">
                    {/* Company Information */}
                    <div>
                      <h3 className="text-[15px] font-semibold text-[#1D1D1F] mb-3">
                        Company Information
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-[13px] text-[#86868B] mb-1">Address</div>
                          <div className="text-[15px] text-[#1D1D1F]">
                            {company.address || 'Not provided'}
                          </div>
                        </div>
                        <div>
                          <div className="text-[13px] text-[#86868B] mb-1">Main Telephone</div>
                          <div className="text-[15px] text-[#1D1D1F]">
                            {company.main_telephone || 'Not provided'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Office Managers */}
                    {company.managers.length > 0 && (
                      <div className="pt-4 border-t border-[#E8E8ED]">
                        <h3 className="text-[15px] font-semibold text-[#1D1D1F] mb-3">
                          Office Managers
                        </h3>
                        <div className="space-y-3">
                          {company.managers.map((manager) => (
                            <div
                              key={manager.id}
                              className="bg-[#F5F5F7] rounded-lg p-4"
                            >
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <div className="text-[13px] text-[#86868B] mb-1">Name</div>
                                  <div className="text-[15px] font-medium text-[#1D1D1F]">
                                    {manager.name}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-[13px] text-[#86868B] mb-1">Email</div>
                                  <div className="text-[15px] text-[#1D1D1F]">
                                    {manager.email}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-[13px] text-[#86868B] mb-1">Telephone</div>
                                  <div className="text-[15px] text-[#1D1D1F]">
                                    {manager.telephone || 'Not provided'}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-[13px] text-[#86868B] mb-1">Department</div>
                                  <div className="text-[15px] text-[#1D1D1F]">
                                    {manager.department || 'Not provided'}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Purchase Order Workflow */}
                    <div className="pt-4 border-t border-[#E8E8ED]">
                      <h3 className="text-[15px] font-semibold text-[#1D1D1F] mb-3">
                        Purchase Order Workflow
                      </h3>
                      <div className="text-[15px] text-[#1D1D1F]">
                        {getPOWorkflowLabel(company.po_workflow)}
                      </div>
                    </div>

                    {/* Invoice Management */}
                    <div className="pt-4 border-t border-[#E8E8ED]">
                      <h3 className="text-[15px] font-semibold text-[#1D1D1F] mb-3">
                        Invoice Management
                      </h3>
                      {company.requires_invoice_export ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <svg className="w-5 h-5 text-[#34C759]" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span className="text-[15px] text-[#1D1D1F]">
                              Requires invoice export files
                            </span>
                          </div>
                          <div className="ml-7 grid grid-cols-2 gap-4 mt-3">
                            {company.invoice_export_format && (
                              <div>
                                <div className="text-[13px] text-[#86868B] mb-1">Export Format</div>
                                <div className="text-[15px] text-[#1D1D1F]">
                                  {company.invoice_export_format}
                                </div>
                              </div>
                            )}
                            {company.accounting_software && (
                              <div>
                                <div className="text-[13px] text-[#86868B] mb-1">Accounting Software</div>
                                <div className="text-[15px] text-[#1D1D1F]">
                                  {company.accounting_software}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="text-[15px] text-[#6E6E73]">
                          No special invoice export requirements
                        </div>
                      )}
                    </div>

                    {/* Additional Notes */}
                    {company.notes && (
                      <div className="pt-4 border-t border-[#E8E8ED]">
                        <h3 className="text-[15px] font-semibold text-[#1D1D1F] mb-3">
                          Additional Notes
                        </h3>
                        <div className="text-[15px] text-[#1D1D1F] whitespace-pre-wrap">
                          {company.notes}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
