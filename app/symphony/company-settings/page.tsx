'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';

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

export default function CompanySettingsPage() {
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [address, setAddress] = useState('');
  const [mainTelephone, setMainTelephone] = useState('');
  const [officeManagers, setOfficeManagers] = useState<OfficeManager[]>([]);
  const [poWorkflow, setPoWorkflow] = useState<'provide_with_order' | 'quote_then_po' | 'no_po_required'>('provide_with_order');
  const [requiresInvoiceExport, setRequiresInvoiceExport] = useState(false);
  const [invoiceExportFormat, setInvoiceExportFormat] = useState('');
  const [accountingSoftware, setAccountingSoftware] = useState('');
  const [notes, setNotes] = useState('');
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const loadCompanySettings = async () => {
      // Check authentication
      const companyData = sessionStorage.getItem('symphony_company');
      if (!companyData) {
        router.push('/symphony');
        return;
      }

      const parsedCompany = JSON.parse(companyData);

      // Fetch full company details including settings
      const { data, error } = await supabase
        .from('symphony_companies')
        .select('*')
        .eq('id', parsedCompany.id)
        .single();

      if (error) {
        console.error('Error loading company settings:', error);
        setLoading(false);
        return;
      }

      setCompany(data);
      setCompanyName(data.company_name || '');
      setAddress(data.address || '');
      setMainTelephone(data.main_telephone || '');
      setPoWorkflow(data.po_workflow || 'provide_with_order');
      setRequiresInvoiceExport(data.requires_invoice_export || false);
      setInvoiceExportFormat(data.invoice_export_format || '');
      setAccountingSoftware(data.accounting_software || '');
      setNotes(data.notes || '');

      // Fetch office managers
      const { data: managersData, error: managersError } = await supabase
        .from('symphony_office_managers')
        .select('*')
        .eq('company_id', parsedCompany.id)
        .order('created_at', { ascending: true });

      if (managersError) {
        console.error('Error loading office managers:', managersError);
      } else {
        setOfficeManagers(managersData || []);
      }

      setLoading(false);
    };

    loadCompanySettings();
  }, [supabase, router]);

  const handleSave = async () => {
    if (!company) return;

    setSaving(true);

    // Update company information
    const { error: companyError } = await supabase
      .from('symphony_companies')
      .update({
        company_name: companyName,
        address: address || null,
        main_telephone: mainTelephone || null,
        po_workflow: poWorkflow,
        requires_invoice_export: requiresInvoiceExport,
        invoice_export_format: requiresInvoiceExport ? invoiceExportFormat : null,
        accounting_software: requiresInvoiceExport ? accountingSoftware : null,
        notes: notes || null,
      })
      .eq('id', company.id);

    if (companyError) {
      console.error('Error saving company settings:', companyError);
      alert('Failed to save company settings. Please try again.');
      setSaving(false);
      return;
    }

    // Delete existing office managers and recreate them
    await supabase
      .from('symphony_office_managers')
      .delete()
      .eq('company_id', company.id);

    // Insert updated office managers
    if (officeManagers.length > 0) {
      const managersToInsert = officeManagers.map(manager => ({
        company_id: company.id,
        name: manager.name,
        email: manager.email,
        telephone: manager.telephone || null,
        department: manager.department || null,
      }));

      const { error: managersError } = await supabase
        .from('symphony_office_managers')
        .insert(managersToInsert);

      if (managersError) {
        console.error('Error saving office managers:', managersError);
        alert('Company settings saved, but failed to save office managers. Please try again.');
        setSaving(false);
        return;
      }
    }

    alert('Settings saved successfully!');

    // Update session storage with new company data
    const { data: updatedCompany } = await supabase
      .from('symphony_companies')
      .select('*')
      .eq('id', company.id)
      .single();

    if (updatedCompany) {
      sessionStorage.setItem('symphony_company', JSON.stringify(updatedCompany));
    }

    setSaving(false);
  };

  const handleAddManager = () => {
    setOfficeManagers([
      ...officeManagers,
      {
        id: `temp-${Date.now()}`,
        name: '',
        email: '',
        telephone: '',
        department: '',
      },
    ]);
  };

  const handleUpdateManager = (index: number, field: keyof OfficeManager, value: string) => {
    const updated = [...officeManagers];
    updated[index] = { ...updated[index], [field]: value };
    setOfficeManagers(updated);
  };

  const handleRemoveManager = (index: number) => {
    setOfficeManagers(officeManagers.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0071E3]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <nav className="bg-white border-b border-[#E8E8ED]">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex justify-between items-center">
            <Image
              src="/locations/symphony-offices.png"
              alt="Symphony Offices"
              width={180}
              height={60}
              className="object-contain"
            />
            <button
              onClick={() => router.push('/symphony/banqueting-orders')}
              className="px-6 py-2.5 border border-[#D2D2D7] text-[#1D1D1F] text-[15px] font-semibold rounded-sm hover:bg-[#F5F5F7] transition-colors"
            >
              Back to Orders
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-8 py-12">
        <h1 className="text-[28px] font-semibold text-[#1D1D1F] mb-2">Company Settings</h1>
        <p className="text-[15px] text-[#6E6E73] mb-8">
          Configure your ordering and invoicing preferences for {company?.company_name}
        </p>

        <div className="bg-white border border-[#E8E8ED] rounded-sm shadow-sm p-8 space-y-8">
          {/* Company Information Section */}
          <div>
            <h2 className="text-[17px] font-semibold text-[#1D1D1F] mb-4">Company Information</h2>
            <p className="text-[13px] text-[#6E6E73] mb-4">
              Basic information about your company
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-[#86868B] mb-2">
                  Company Name
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-4 py-3 border border-[#D2D2D7] rounded-sm text-[15px] text-[#1D1D1F] bg-white focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 transition-all"
                  placeholder="Enter company name"
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-[#86868B] mb-2">
                  Address
                </label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-[#D2D2D7] rounded-sm text-[15px] text-[#1D1D1F] bg-white focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 transition-all resize-none"
                  placeholder="Enter company address"
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-[#86868B] mb-2">
                  Main Telephone Number
                </label>
                <input
                  type="tel"
                  value={mainTelephone}
                  onChange={(e) => setMainTelephone(e.target.value)}
                  className="w-full px-4 py-3 border border-[#D2D2D7] rounded-sm text-[15px] text-[#1D1D1F] bg-white focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 transition-all"
                  placeholder="+31 20 123 4567"
                />
              </div>
            </div>
          </div>

          {/* Office Managers Section */}
          <div className="pt-6 border-t border-[#E8E8ED]">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-[17px] font-semibold text-[#1D1D1F]">Office Managers</h2>
                <p className="text-[13px] text-[#6E6E73] mt-1">
                  Contact persons for banqueting orders
                </p>
              </div>
              <button
                onClick={handleAddManager}
                className="px-4 py-2 text-[#0071E3] text-[15px] font-medium hover:text-[#0077ED] transition-colors"
              >
                + Add Manager
              </button>
            </div>

            {officeManagers.length === 0 ? (
              <div className="text-center py-8 text-[#86868B] text-[13px]">
                No office managers added yet. Click "Add Manager" to create one.
              </div>
            ) : (
              <div className="space-y-4">
                {officeManagers.map((manager, index) => (
                  <div
                    key={manager.id}
                    className="border border-[#E8E8ED] rounded-sm p-4 space-y-3"
                  >
                    <div className="flex justify-between items-start">
                      <h3 className="text-[15px] font-medium text-[#1D1D1F]">
                        Manager {index + 1}
                      </h3>
                      <button
                        onClick={() => handleRemoveManager(index)}
                        className="text-[#FF3B30] text-[13px] font-medium hover:text-[#FF453A] transition-colors"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[13px] font-medium text-[#86868B] mb-2">
                          Name
                        </label>
                        <input
                          type="text"
                          value={manager.name}
                          onChange={(e) => handleUpdateManager(index, 'name', e.target.value)}
                          className="w-full px-4 py-2.5 border border-[#D2D2D7] rounded-sm text-[15px] text-[#1D1D1F] bg-white focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 transition-all"
                          placeholder="Full name"
                        />
                      </div>

                      <div>
                        <label className="block text-[13px] font-medium text-[#86868B] mb-2">
                          Email
                        </label>
                        <input
                          type="email"
                          value={manager.email}
                          onChange={(e) => handleUpdateManager(index, 'email', e.target.value)}
                          className="w-full px-4 py-2.5 border border-[#D2D2D7] rounded-sm text-[15px] text-[#1D1D1F] bg-white focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 transition-all"
                          placeholder="email@company.com"
                        />
                      </div>

                      <div>
                        <label className="block text-[13px] font-medium text-[#86868B] mb-2">
                          Telephone
                        </label>
                        <input
                          type="tel"
                          value={manager.telephone || ''}
                          onChange={(e) => handleUpdateManager(index, 'telephone', e.target.value)}
                          className="w-full px-4 py-2.5 border border-[#D2D2D7] rounded-sm text-[15px] text-[#1D1D1F] bg-white focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 transition-all"
                          placeholder="+31 20 123 4567"
                        />
                      </div>

                      <div>
                        <label className="block text-[13px] font-medium text-[#86868B] mb-2">
                          Department
                        </label>
                        <input
                          type="text"
                          value={manager.department || ''}
                          onChange={(e) => handleUpdateManager(index, 'department', e.target.value)}
                          className="w-full px-4 py-2.5 border border-[#D2D2D7] rounded-sm text-[15px] text-[#1D1D1F] bg-white focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 transition-all"
                          placeholder="e.g., Operations, Finance"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* PO Workflow Section */}
          <div className="pt-6 border-t border-[#E8E8ED]">
            <h2 className="text-[17px] font-semibold text-[#1D1D1F] mb-4">Purchase Order Workflow</h2>
            <p className="text-[13px] text-[#6E6E73] mb-4">
              How does your company handle PO numbers for banqueting orders?
            </p>

            <div className="space-y-3">
              <label className="flex items-start p-4 border border-[#D2D2D7] rounded-sm cursor-pointer hover:bg-[#F5F5F7] transition-colors">
                <input
                  type="radio"
                  name="po_workflow"
                  value="provide_with_order"
                  checked={poWorkflow === 'provide_with_order'}
                  onChange={(e) => setPoWorkflow(e.target.value as any)}
                  className="mt-0.5 mr-3 text-[#0071E3] focus:ring-[#0071E3]"
                />
                <div>
                  <div className="text-[15px] font-medium text-[#1D1D1F]">Provide PO with order</div>
                  <div className="text-[13px] text-[#6E6E73] mt-1">
                    I can provide a PO number when placing each order
                  </div>
                </div>
              </label>

              <label className="flex items-start p-4 border border-[#D2D2D7] rounded-sm cursor-pointer hover:bg-[#F5F5F7] transition-colors">
                <input
                  type="radio"
                  name="po_workflow"
                  value="quote_then_po"
                  checked={poWorkflow === 'quote_then_po'}
                  onChange={(e) => setPoWorkflow(e.target.value as any)}
                  className="mt-0.5 mr-3 text-[#0071E3] focus:ring-[#0071E3]"
                />
                <div>
                  <div className="text-[15px] font-medium text-[#1D1D1F]">Request quote first</div>
                  <div className="text-[13px] text-[#6E6E73] mt-1">
                    I need a quote before I can obtain a PO number from finance
                  </div>
                </div>
              </label>

              <label className="flex items-start p-4 border border-[#D2D2D7] rounded-sm cursor-pointer hover:bg-[#F5F5F7] transition-colors">
                <input
                  type="radio"
                  name="po_workflow"
                  value="no_po_required"
                  checked={poWorkflow === 'no_po_required'}
                  onChange={(e) => setPoWorkflow(e.target.value as any)}
                  className="mt-0.5 mr-3 text-[#0071E3] focus:ring-[#0071E3]"
                />
                <div>
                  <div className="text-[15px] font-medium text-[#1D1D1F]">No PO required</div>
                  <div className="text-[13px] text-[#6E6E73] mt-1">
                    My company doesn't require PO numbers for catering orders
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Invoice Export Section */}
          <div className="pt-6 border-t border-[#E8E8ED]">
            <h2 className="text-[17px] font-semibold text-[#1D1D1F] mb-4">Invoice Management</h2>

            <label className="flex items-start p-4 border border-[#D2D2D7] rounded-sm cursor-pointer hover:bg-[#F5F5F7] transition-colors mb-4">
              <input
                type="checkbox"
                checked={requiresInvoiceExport}
                onChange={(e) => setRequiresInvoiceExport(e.target.checked)}
                className="mt-0.5 mr-3 w-5 h-5 text-[#0071E3] border-[#D2D2D7] rounded focus:ring-[#0071E3]/20"
              />
              <div>
                <div className="text-[15px] font-medium text-[#1D1D1F]">
                  I need invoice files for import into accounting software
                </div>
                <div className="text-[13px] text-[#6E6E73] mt-1">
                  Enable this if you import invoices directly into your accounting system
                </div>
              </div>
            </label>

            {requiresInvoiceExport && (
              <div className="ml-8 space-y-4">
                <div>
                  <label className="block text-[13px] font-medium text-[#86868B] mb-2">
                    Preferred Invoice Format
                  </label>
                  <select
                    value={invoiceExportFormat}
                    onChange={(e) => setInvoiceExportFormat(e.target.value)}
                    className="w-full px-4 py-3 border border-[#D2D2D7] rounded-sm text-[15px] text-[#1D1D1F] bg-white focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 transition-all"
                  >
                    <option value="">Select format...</option>
                    <option value="PDF">PDF</option>
                    <option value="CSV">CSV</option>
                    <option value="XML">XML</option>
                    <option value="UBL">UBL (Universal Business Language)</option>
                    <option value="Excel">Excel (.xlsx)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-[#86868B] mb-2">
                    Accounting Software
                  </label>
                  <select
                    value={accountingSoftware}
                    onChange={(e) => setAccountingSoftware(e.target.value)}
                    className="w-full px-4 py-3 border border-[#D2D2D7] rounded-sm text-[15px] text-[#1D1D1F] bg-white focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 transition-all"
                  >
                    <option value="">Select software...</option>
                    <optgroup label="Dutch Accounting Software">
                      <option value="Exact">Exact</option>
                      <option value="SnelStart">SnelStart</option>
                      <option value="AFAS Software">AFAS Software</option>
                      <option value="Moneybird">Moneybird</option>
                      <option value="Visma-eAccounting">Visma-eAccounting</option>
                      <option value="Kleisteen">Kleisteen</option>
                      <option value="InformerOnline">InformerOnline</option>
                    </optgroup>
                    <optgroup label="International Software">
                      <option value="Xero">Xero</option>
                      <option value="QuickBooks">QuickBooks</option>
                      <option value="Zoho Books">Zoho Books</option>
                      <option value="SAP">SAP</option>
                      <option value="Oracle">Oracle</option>
                      <option value="Microsoft Dynamics">Microsoft Dynamics</option>
                      <option value="TCS Ultimatix">TCS Ultimatix</option>
                    </optgroup>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Notes Section */}
          <div className="pt-6 border-t border-[#E8E8ED]">
            <h2 className="text-[17px] font-semibold text-[#1D1D1F] mb-4">Additional Notes</h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 border border-[#D2D2D7] rounded-sm text-[15px] text-[#1D1D1F] bg-white focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 transition-all resize-none"
              placeholder="Any special requirements, billing contact information, or other notes..."
            />
          </div>

          {/* Save Button */}
          <div className="pt-6 border-t border-[#E8E8ED]">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full px-6 py-3 bg-[#0071E3] text-white text-[15px] font-semibold rounded-sm hover:bg-[#0077ED] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
