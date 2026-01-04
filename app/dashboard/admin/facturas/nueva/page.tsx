'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, Trash2, ChevronDown, X } from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';

interface InvoiceItem {
  description: string;
  quantity: number;
  price: number;
}

interface SavedItem {
  id: string;
  description: string;
  price: number;
}

interface SavedCustomer {
  name: string;
  email: string;
  phone: string;
}

export default function NuevaFacturaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  
  const [formData, setFormData] = useState({
    recipientName: '',
    recipientEmail: '',
    recipientPhone: '',
    invoiceTitle: '',
    description: '',
    weekStart: format(weekStart, 'yyyy-MM-dd'),
    weekEnd: format(weekEnd, 'yyyy-MM-dd'),
  });
  const [items, setItems] = useState<InvoiceItem[]>([
    { description: 'Rent chair week', quantity: 1, price: 200 }
  ]);
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [showSavedItems, setShowSavedItems] = useState(false);
  const [savedCustomers, setSavedCustomers] = useState<SavedCustomer[]>([]);
  const [showCustomers, setShowCustomers] = useState(false);

  useEffect(() => {
    fetchSavedItems();
    fetchSavedCustomers();
  }, []);

  const fetchSavedItems = async () => {
    try {
      const res = await fetch('/api/invoice-items');
      if (res.ok) {
        const data = await res.json();
        setSavedItems(data);
      }
    } catch (error) {
      console.error('Error fetching saved items:', error);
    }
  };

  const fetchSavedCustomers = async () => {
    try {
      const res = await fetch('/api/invoices');
      if (res.ok) {
        const invoices: unknown = await res.json();
        if (!Array.isArray(invoices)) {
          setSavedCustomers([]);
          return;
        }

        // Get unique customers
        const customers = invoices.reduce<SavedCustomer[]>((acc, inv) => {
          if (typeof inv !== 'object' || inv === null) return acc;
          const recipientEmail = (inv as { recipientEmail?: unknown }).recipientEmail;
          const recipientName = (inv as { recipientName?: unknown }).recipientName;
          const recipientPhone = (inv as { recipientPhone?: unknown }).recipientPhone;
          if (typeof recipientEmail !== 'string' || !recipientEmail) return acc;

          if (!acc.find((c) => c.email === recipientEmail)) {
            acc.push({
              name: typeof recipientName === 'string' ? recipientName : '',
              email: recipientEmail,
              phone: typeof recipientPhone === 'string' ? recipientPhone : '',
            });
          }
          return acc;
        }, []);

        setSavedCustomers(customers);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const addItem = () => {
    setItems([...items, { description: '', quantity: 1, price: 0 }]);
  };

  const addSavedItem = (savedItem: SavedItem) => {
    setItems([...items, { description: savedItem.description, quantity: 1, price: savedItem.price }]);
    toast.success('Item added!');
  };

  const selectCustomer = (customer: SavedCustomer) => {
    setFormData({
      ...formData,
      recipientName: customer.name,
      recipientEmail: customer.email,
      recipientPhone: customer.phone
    });
    setShowCustomers(false);
    toast.success('Customer selected!');
  };

  const deleteCustomer = (customerToDelete: SavedCustomer, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedCustomers = savedCustomers.filter(
      customer => !(customer.name === customerToDelete.name && customer.email === customerToDelete.email)
    );
    setSavedCustomers(updatedCustomers);
    toast.success('Customer removed from list!');
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const newItems = [...items];
    if (field === 'quantity' || field === 'price') {
      // Allow empty string for editing, convert to number when not empty
      newItems[index] = { ...newItems[index], [field]: value === '' ? 0 : Number(value) };
    } else {
      newItems[index] = { ...newItems[index], description: String(value) };
    }
    setItems(newItems);
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.price)), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const total = calculateTotal();
      
      const invoiceData = {
        type: 'BARBER_PAYMENT',
        issuerName: "Jb's Barbershop",
        issuerAddress: '98 Union Street, Lynn, Massachusetts 01902 3602, Estados Unidos',
        issuerPhone: '781 355 2007',
        issuerEmail: 'jb@jbbarbershop.com',
        recipientName: formData.recipientName,
        recipientEmail: formData.recipientEmail,
        recipientPhone: formData.recipientPhone,
        amount: total,
        description: formData.description || `Weekly chair rent: ${format(new Date(formData.weekStart), 'MMM d')} - ${format(new Date(formData.weekEnd), 'MMM d, yyyy')}`,
        items: items.map(item => ({
          description: item.description,
          quantity: Number(item.quantity),
          price: Number(item.price)
        })),
        dueDate: formData.weekEnd ? new Date(formData.weekEnd).toISOString() : null,
        weekStart: formData.weekStart ? new Date(formData.weekStart).toISOString() : null,
        weekEnd: formData.weekEnd ? new Date(formData.weekEnd).toISOString() : null,
      };

      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoiceData),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success('Invoice created! Redirecting...');
        // Redirect to invoice view where they can send email
        setTimeout(() => {
          router.push(`/dashboard/admin/facturas/${data.id}`);
        }, 500);
      } else {
        const error = await res.json();
        toast.error(error.error || 'Error creating invoice');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error creating invoice');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Botones de acción - en la parte superior */}
      <div className="print:hidden sticky top-0 z-50 bg-gray-900 border-b shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex justify-between items-center">
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard/admin/facturas')}
            className="text-white hover:text-[#00f0ff]"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/dashboard/admin/facturas')}
              className="border-gray-600 text-white hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="bg-[#00f0ff] text-black hover:bg-[#00d0df]"
            >
              {loading ? 'Creating...' : 'Create Invoice'}
            </Button>
          </div>
        </div>
      </div>

      {/* Formulario con formato de factura estilo WIX mejorado */}
      <div className="max-w-4xl mx-auto p-6 bg-gradient-to-br from-white to-gray-50 shadow-xl rounded-lg" style={{ fontFamily: 'Arial, sans-serif' }}>
        <form onSubmit={handleSubmit}>
          {/* Header - Logo y número de invoice */}
          <div className="flex justify-between items-start mb-4 pb-4 border-b-2 border-gradient-to-r from-cyan-500 to-blue-500">
            {/* Logo y Business info juntos */}
            <div className="flex items-center gap-3">
              <Image
                src="/logo.png"
                alt="JB Barbershop"
                width={56}
                height={56}
                className="w-14 h-14 object-contain rounded-full shadow-lg ring-2 ring-cyan-100"
              />
              <div className="text-xs text-gray-700">
                <p className="font-bold text-base text-gray-900 mb-0.5">Jb&apos;s Barbershop</p>
                <p className="text-xs">98 Union Street, Lynn, MA 01902</p>
                <p className="text-xs text-cyan-600 font-medium">jb@jbbarbershop.com • 781-355-2007</p>
              </div>
            </div>

            {/* Número de Invoice y fechas */}
            <div className="text-right">
              <div className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-4 py-2 rounded-lg shadow-md mb-2">
                <h2 className="text-lg font-bold">Invoice #NEW</h2>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-end gap-2">
                  <label className="text-gray-600 font-medium">Issue:</label>
                  <input
                    type="date"
                    value={formData.weekStart}
                    onChange={(e) => setFormData({ ...formData, weekStart: e.target.value })}
                    className="border-2 border-cyan-300 rounded px-2 py-1 text-xs text-gray-900 focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
                  />
                </div>
                <div className="flex items-center justify-end gap-2">
                  <label className="text-gray-600 font-medium">Due:</label>
                  <input
                    type="date"
                    value={formData.weekEnd}
                    onChange={(e) => setFormData({ ...formData, weekEnd: e.target.value })}
                    className="border-2 border-cyan-300 rounded px-2 py-1 text-xs text-gray-900 focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Cliente */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-gray-700">
                Customer <span className="text-red-500">*</span>
              </label>
              {savedCustomers.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowCustomers(!showCustomers)}
                  className="text-xs text-cyan-600 hover:text-cyan-700 font-medium flex items-center gap-1"
                >
                  <ChevronDown className={`h-3 w-3 transition-transform ${showCustomers ? 'rotate-180' : ''}`} />
                  Saved ({savedCustomers.length})
                </button>
              )}
            </div>
            
            {showCustomers && savedCustomers.length > 0 && (
              <div className="mb-2 bg-gray-50 border border-gray-200 rounded-lg p-2 max-h-32 overflow-y-auto">
                <div className="space-y-1">
                  {savedCustomers.map((customer, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between w-full px-2 py-1.5 text-xs hover:bg-cyan-50 rounded border border-transparent hover:border-cyan-200 transition-colors group"
                    >
                      <button
                        type="button"
                        onClick={() => selectCustomer(customer)}
                        className="flex-1 text-left"
                      >
                        <p className="font-medium text-gray-900">{customer.name}</p>
                        <p className="text-gray-600">{customer.email}</p>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => deleteCustomer(customer, e)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-100 rounded text-red-600 hover:text-red-700"
                        title="Delete customer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <input
              type="text"
              value={formData.recipientName}
              onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
              className="w-full border-2 border-gray-300 rounded-lg px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 transition-all"
              placeholder="Choose a contact or type new"
              required
            />
          </div>

          {/* Email */}
          <div className="mb-3">
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={formData.recipientEmail}
              onChange={(e) => setFormData({ ...formData, recipientEmail: e.target.value })}
              className="w-full border-2 border-gray-300 rounded-lg px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 transition-all"
              placeholder="customer@email.com"
              required
            />
          </div>

          {/* Phone y Invoice Title en la misma línea */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                value={formData.recipientPhone}
                onChange={(e) => setFormData({ ...formData, recipientPhone: e.target.value })}
                className="w-full border-2 border-gray-300 rounded-lg px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 transition-all"
                placeholder="+1 (555) 000-0000"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Invoice title</label>
              <input
                type="text"
                value={formData.invoiceTitle}
                onChange={(e) => setFormData({ ...formData, invoiceTitle: e.target.value })}
                className="w-full border-2 border-gray-300 rounded-lg px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 transition-all"
                placeholder="Chair Rent - Week 1"
              />
            </div>
          </div>

          {/* Tabla de items - Estilo WIX */}
          <div className="mb-4">
            {/* Saved Items Dropdown */}
            {savedItems.length > 0 && (
              <div className="mb-2 bg-blue-50 border border-blue-200 rounded overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowSavedItems(!showSavedItems)}
                  className="w-full flex items-center justify-between p-1.5 hover:bg-blue-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-blue-700">💾 Saved Items</span>
                    <Badge className="bg-blue-600 text-white text-xs h-4">
                      {savedItems.length}
                    </Badge>
                  </div>
                  <ChevronDown 
                    className={`h-3 w-3 text-blue-600 transition-transform ${showSavedItems ? 'rotate-180' : ''}`}
                  />
                </button>
                
                {showSavedItems && (
                  <div className="p-2 border-t border-blue-200 grid grid-cols-4 gap-1">
                    {savedItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => addSavedItem(item)}
                        className="bg-white hover:bg-blue-50 border border-blue-200 rounded p-1.5 text-left text-xs"
                      >
                        <p className="font-medium text-gray-900 truncate text-xs">{item.description}</p>
                        <p className="text-blue-600 font-bold text-xs">${item.price.toFixed(2)}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Header de la tabla */}
            <div className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white py-2 px-2 grid grid-cols-12 gap-2 text-xs font-semibold mb-1 rounded-t-lg">
              <div className="col-span-4">Product or Service</div>
              <div className="col-span-2 text-center">Qty</div>
              <div className="col-span-2 text-center">Price</div>
              <div className="col-span-2 text-center">Tax</div>
              <div className="col-span-2 text-right">Total</div>
            </div>

            {/* Items */}
            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-3 hover:border-blue-300 transition-colors">
                  <div className="grid grid-cols-12 gap-2 items-center mb-2">
                    {/* Product/Service name */}
                    <div className="col-span-4">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Type, select or search"
                        required
                      />
                    </div>

                    {/* Quantity */}
                    <div className="col-span-2 flex justify-center">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity || ''}
                        onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                        onBlur={(e) => {
                          if (e.target.value === '' || Number(e.target.value) < 1) {
                            updateItem(index, 'quantity', 1);
                          }
                        }}
                        className="w-20 text-center border border-gray-300 rounded px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        required
                      />
                    </div>

                    {/* Price */}
                    <div className="col-span-2 flex justify-center">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.price || ''}
                        onChange={(e) => updateItem(index, 'price', e.target.value)}
                        onBlur={(e) => {
                          if (e.target.value === '' || Number(e.target.value) < 0) {
                            updateItem(index, 'price', 0);
                          }
                        }}
                        className="w-24 text-center border border-gray-300 rounded px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        required
                      />
                    </div>

                    {/* Tax */}
                    <div className="col-span-2 text-center">
                      <span className="text-blue-600 text-xs cursor-pointer hover:underline">+ Add Tax</span>
                    </div>

                    {/* Line Total */}
                    <div className="col-span-2 text-right font-semibold text-gray-900">
                      ${(Number(item.quantity) * Number(item.price)).toFixed(2)}
                    </div>
                  </div>

                  {/* Description textarea */}
                  <div className="mt-2">
                    <textarea
                      placeholder="Write a description"
                      rows={2}
                      className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                    />
                  </div>

                  {/* Delete button */}
                  {items.length > 1 && (
                    <div className="mt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-red-500 hover:text-red-700 text-xs flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Add Line Item button */}
            <button
              type="button"
              onClick={addItem}
              className="mt-4 text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              Add Line Item
            </button>
          </div>

          {/* Totales estilo WIX */}
          <div className="border-t border-gray-300 pt-6 mt-8">
            <div className="flex justify-end">
              <div className="w-80 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700">Subtotal</span>
                  <span className="font-semibold">${calculateTotal().toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between text-sm border-b border-gray-300 pb-3">
                  <span className="text-gray-700">Invoice total</span>
                  <span className="font-bold text-base">${calculateTotal().toFixed(2)}</span>
                </div>

                <button
                  type="button"
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Add Discount
                </button>

                <button
                  type="button"
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Request Deposit
                </button>

                <div className="flex justify-between text-sm pt-3">
                  <span className="text-gray-700">Amount paid</span>
                  <span>$0.00</span>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded p-3 flex justify-between">
                  <span className="font-bold text-gray-800">Balance Due</span>
                  <span className="font-bold text-lg text-gray-900">${calculateTotal().toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notas */}
          <div className="mt-8">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Add any additional notes or payment terms..."
              rows={3}
            />
          </div>

          {/* Mensaje de agradecimiento con más estilo */}
          <div className="mt-4 pt-3 border-t-2 border-cyan-200 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-lg p-3 text-center">
            <div className="text-2xl mb-1">💈</div>
            <p className="text-cyan-700 font-semibold text-sm mb-1">
              Thank you for being part of the JB&apos;s Barbershop family!
            </p>
            <p className="text-gray-600 text-xs">
              We appreciate your trust and commitment to excellence.
            </p>
            <div className="mt-2 flex items-center justify-center gap-2 text-xs text-gray-500">
              <span>📧 jb@jbbarbershop.com</span>
              <span>•</span>
              <span>📞 781-355-2007</span>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
