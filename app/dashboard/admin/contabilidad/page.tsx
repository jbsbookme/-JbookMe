'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DashboardNavbar } from '@/components/dashboard/navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, TrendingUp, TrendingDown, Wallet, AlertCircle, Plus, Trash2, Calendar, ArrowLeft, Check, ChevronsUpDown, ChevronDown } from 'lucide-react';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { toast } from 'sonner';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface BarberPayment {
  id: string;
  barberId: string;
  amount: number;
  weekStart: string;
  weekEnd: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE';
  paidAt: string | null;
  notes: string | null;
  barber: {
    id: string;
    user: {
      name: string;
      email: string;
      image: string | null;
    };
  };
}

interface Expense {
  id: string;
  category: string;
  customCategory: string | null;
  amount: number;
  description: string | null;
  date: string;
  notes: string | null;
}

interface AccountingSummary {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  totalPending: number;
  pendingPaymentsCount: number;
  barberPaymentsIncome: number;
  invoicesIncome: number;
  pendingPaymentsAmount: number;
  pendingInvoicesAmount: number;
  expensesByCategory: Array<{ category: string; total: number }>;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  type: 'BARBER_PAYMENT' | 'CLIENT_SERVICE';
  status: 'PENDING' | 'PAID' | 'CANCELLED';
  recipientId: string;
  recipientName: string;
  recipientEmail: string;
  amount: number;
  description: string;
  items: unknown;
  issueDate: string;
  dueDate: string | null;
  isPaid: boolean;
  paidAt: string | null;
  recipient: {
    id: string;
    name: string;
    email: string;
  };
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface BarberOption {
  id: string;
  user?: {
    name?: string | null;
    email?: string | null;
  } | null;
  [key: string]: unknown;
}

export default function ContabilidadPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  
  const [summary, setSummary] = useState<AccountingSummary | null>(null);
  const [payments, setPayments] = useState<BarberPayment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [barbers, setBarbers] = useState<BarberOption[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [customCategories, setCustomCategories] = useState<Array<{id: string, name: string}>>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('summary');
  
  // Date filter state
  const [dateRange, setDateRange] = useState<'all' | 'week' | 'month' | 'custom'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Payment form state
  const [paymentForm, setPaymentForm] = useState({
    barberId: '',
    amount: '',
    weekStart: format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    weekEnd: format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    status: 'PENDING',
    notes: '',
  });

  // Expense form state
  const [expenseForm, setExpenseForm] = useState({
    category: '',
    customCategory: '',
    amount: '',
    description: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
  });

  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [openBarberCombobox, setOpenBarberCombobox] = useState(false);
  const [openUserCombobox, setOpenUserCombobox] = useState(false);
  const [useExistingRecipient, setUseExistingRecipient] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');

  // Invoice form state
  const [invoiceForm, setInvoiceForm] = useState({
    type: 'CLIENT_SERVICE',
    recipientId: '',
    recipientName: '',
    recipientEmail: '',
    amount: '',
    description: '',
    dueDate: '',
  });

  // Invoice items state
  const [invoiceItems, setInvoiceItems] = useState<Array<{description: string, quantity: number, price: number}>>([]);
  const [currentItem, setCurrentItem] = useState({description: '', quantity: 1, price: 0});
  const [savedItems, setSavedItems] = useState<Array<{id: string, description: string, price: number}>>([]);
  const [_showSaveItemDialog, setShowSaveItemDialog] = useState(false);
  const [showSavedItems, setShowSavedItems] = useState(true);

  const getDateRangeParams = useCallback(() => {
    const today = new Date();
    let start = '';
    let end = '';

    switch (dateRange) {
      case 'week':
        start = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        end = format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        break;
      case 'month':
        start = format(new Date(today.getFullYear(), today.getMonth(), 1), 'yyyy-MM-dd');
        end = format(new Date(today.getFullYear(), today.getMonth() + 1, 0), 'yyyy-MM-dd');
        break;
      case 'custom':
        start = startDate;
        end = endDate;
        break;
      default:
        return '';
    }

    return start && end ? `?startDate=${start}&endDate=${end}` : '';
  }, [dateRange, startDate, endDate]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      const dateParams = getDateRangeParams();
      
      // Fetch summary with date filter
      const summaryRes = await fetch(`/api/accounting/summary${dateParams}`);
      if (summaryRes.ok) {
        const summaryData = await summaryRes.json();
        // Ensure expensesByCategory is always an array
        if (summaryData) {
          summaryData.expensesByCategory = Array.isArray(summaryData.expensesByCategory) 
            ? summaryData.expensesByCategory 
            : [];
          setSummary(summaryData);
        }
      }

      // Fetch payments
      const paymentsRes = await fetch('/api/barber-payments');
      if (paymentsRes.ok) {
        const paymentsData = await paymentsRes.json();
        setPayments(Array.isArray(paymentsData) ? paymentsData : []);
      }

      // Fetch expenses
      const expensesRes = await fetch('/api/expenses');
      if (expensesRes.ok) {
        const expensesData = await expensesRes.json();
        setExpenses(Array.isArray(expensesData) ? expensesData : []);
      }

      // Fetch invoices
      const invoicesRes = await fetch('/api/invoices');
      if (invoicesRes.ok) {
        const invoicesData = await invoicesRes.json();
        setInvoices(Array.isArray(invoicesData) ? invoicesData : []);
      }

      // Fetch barbers
      const barbersRes = await fetch('/api/barbers');
      if (barbersRes.ok) {
        const barbersData = await barbersRes.json();
        setBarbers(Array.isArray(barbersData.barbers) ? barbersData.barbers : (Array.isArray(barbersData) ? barbersData : []));
      }

      // Fetch users (for invoice recipients)
      const usersRes = await fetch('/api/user');
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(Array.isArray(usersData) ? usersData : []);
      }

      // Fetch custom expense categories
      const categoriesRes = await fetch('/api/expenses/categories');
      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        setCustomCategories(Array.isArray(categoriesData) ? categoriesData : []);
      }

      // Fetch saved invoice items
      const savedItemsRes = await fetch('/api/invoice-items');
      if (savedItemsRes.ok) {
        const savedItemsData = await savedItemsRes.json();
        setSavedItems(Array.isArray(savedItemsData) ? savedItemsData : []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error loading data');
      // Reset to empty arrays on error
      setPayments([]);
      setExpenses([]);
      setInvoices([]);
      setBarbers([]);
      setUsers([]);
      setCustomCategories([]);
    } finally {
      setLoading(false);
    }
  }, [getDateRangeParams]);

  useEffect(() => {
    if (status === 'loading') return;

    if (!session || session.user.role !== 'ADMIN') {
      router.push('/login');
      return;
    }

    fetchData();
  }, [session, status, router, fetchData]);

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const res = await fetch('/api/barber-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentForm),
      });

      if (res.ok) {
        toast.success('Payment registered successfully');
        setShowPaymentDialog(false);
        setPaymentForm({
          barberId: '',
          amount: '',
          weekStart: format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
          weekEnd: format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
          status: 'PENDING',
          notes: '',
        });
        fetchData();
      } else {
        toast.error('Error registering payment');
      }
    } catch (error) {
      console.error('Error creating payment:', error);
      toast.error('Error registering payment');
    }
  };

  const handleUpdatePaymentStatus = async (paymentId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/barber-payments/${paymentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        toast.success('Status updated');
        fetchData();
      } else {
        toast.error('Error updating status');
      }
    } catch (error) {
      console.error('Error updating payment status:', error);
      toast.error('Error updating status');
    }
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Build expense data with proper custom category handling
    const expenseData = {
      ...expenseForm,
      // If category is OTHER and customCategory is '__new__', use the newCategoryInput value
      customCategory: expenseForm.category === 'OTHER' 
        ? (expenseForm.customCategory === '__new__' ? newCategoryInput : expenseForm.customCategory)
        : '',
    };

    // Validate custom category
    if (expenseData.category === 'OTHER' && !expenseData.customCategory) {
      toast.error('Please enter the custom category name');
      return;
    }
    
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expenseData),
      });

      if (res.ok) {
        toast.success('Expense registered successfully');
        setShowExpenseDialog(false);
        setExpenseForm({
          category: '',
          customCategory: '',
          amount: '',
          description: '',
          date: format(new Date(), 'yyyy-MM-dd'),
          notes: '',
        });
        setNewCategoryInput('');
        fetchData();
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || 'Error registering expense');
      }
    } catch (error) {
      console.error('Error creating expense:', error);
      toast.error('Error registering expense');
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;

    try {
      const res = await fetch(`/api/expenses/${expenseId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('Expense deleted');
        fetchData();
      } else {
        toast.error('Error deleting expense');
      }
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast.error('Error deleting expense');
    }
  };

  const handleToggleInvoicePayment = async (invoiceId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    const action = newStatus ? 'paid' : 'pending';
    
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          isPaid: newStatus,
          paidAt: newStatus ? new Date().toISOString() : null
        }),
      });

      if (res.ok) {
        toast.success(`Invoice marked as ${action}`);
        fetchData();
      } else {
        toast.error('Error updating invoice status');
      }
    } catch (error) {
      console.error('Error updating invoice:', error);
      toast.error('Error updating invoice status');
    }
  };

  const handleAddItem = () => {
    if (!currentItem.description || !currentItem.description.trim()) {
      toast.error('Please enter a description for the item');
      return;
    }
    if (!currentItem.price || currentItem.price <= 0) {
      toast.error('Please enter a valid price (greater than 0)');
      return;
    }
    if (!currentItem.quantity || currentItem.quantity < 1) {
      toast.error('Quantity must be at least 1');
      return;
    }
    
    const newItem = {
      description: currentItem.description.trim(),
      quantity: currentItem.quantity,
      price: currentItem.price
    };
    
    setInvoiceItems([...invoiceItems, newItem]);
    setCurrentItem({description: '', quantity: 1, price: 0});
    toast.success('Item added successfully');
  };

  const handleRemoveItem = (index: number) => {
    setInvoiceItems(invoiceItems.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return invoiceItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  };

  // Add a saved item to the form
  const handleAddSavedItem = (savedItem: {id: string, description: string, price: number}) => {
    const newItem = {
      description: savedItem.description,
      quantity: 1,
      price: savedItem.price
    };
    setInvoiceItems([...invoiceItems, newItem]);
    toast.success('Item added');
  };

  // Save current item as a template
  const handleSaveAsTemplate = async () => {
    if (!currentItem.description || !currentItem.description.trim()) {
      toast.error('Add a description first');
      return;
    }
    if (!currentItem.price || currentItem.price <= 0) {
      toast.error('Add a valid price first');
      return;
    }

    try {
      const res = await fetch('/api/invoice-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: currentItem.description.trim(),
          price: currentItem.price
        }),
      });

      if (res.ok) {
        const newItem = await res.json();
        setSavedItems([...savedItems, newItem]);
        toast.success('Item saved for later use');
        setShowSaveItemDialog(false);
      } else {
        toast.error('Error saving item');
      }
    } catch (error) {
      console.error('Error saving item template:', error);
      toast.error('Error saving item');
    }
  };

  // Delete saved item
  const handleDeleteSavedItem = async (id: string) => {
    try {
      const res = await fetch(`/api/invoice-items?id=${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setSavedItems(savedItems.filter(item => item.id !== id));
        toast.success('Item deleted');
      } else {
        toast.error('Error deleting item');
      }
    } catch (error) {
      console.error('Error deleting item template:', error);
      toast.error('Error deleting item');
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (useExistingRecipient) {
      if (!invoiceForm.recipientId) {
        toast.error('Please select a recipient');
        return;
      }
    } else {
      if (!invoiceForm.recipientName || !invoiceForm.recipientEmail) {
        toast.error('Please complete the recipient name and email');
        return;
      }
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(invoiceForm.recipientEmail)) {
        toast.error('Please enter a valid email');
        return;
      }
    }

    if (invoiceItems.length === 0) {
      toast.error('Please add at least one item to the invoice');
      return;
    }
    
    const total = calculateTotal();
    
    // Prepare invoice data
    const invoiceData: Record<string, unknown> = {
      type: invoiceForm.type,
      amount: total,
      items: invoiceItems,
      description: invoiceForm.description || 'Service invoice',
      dueDate: invoiceForm.dueDate || null,
    };

    // Only include recipientId if we're using an existing recipient
    if (useExistingRecipient) {
      invoiceData.recipientId = invoiceForm.recipientId;
    } else {
      // For new recipients, send name and email
      invoiceData.recipientName = invoiceForm.recipientName;
      invoiceData.recipientEmail = invoiceForm.recipientEmail;
    }
    
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoiceData),
      });

      if (res.ok) {
        const invoice = await res.json();
        toast.success('Invoice created successfully');
        setShowInvoiceDialog(false);
        setInvoiceForm({
          type: 'CLIENT_SERVICE',
          recipientId: '',
          recipientName: '',
          recipientEmail: '',
          amount: '',
          description: '',
          dueDate: '',
        });
        setInvoiceItems([]);
        setCurrentItem({description: '', quantity: 1, price: 0});
        setUseExistingRecipient(false);
        fetchData();
        
        // Ask if they want to send via email
        if (confirm('Do you want to send this invoice by email?')) {
          const emailRes = await fetch(`/api/invoices/${invoice.id}/send`, {
            method: 'POST',
          });
          if (emailRes.ok) {
            toast.success('Invoice sent by email');
          } else {
            toast.error('Error sending email');
          }
        }
      } else {
        const data = await res.json();
        toast.error(data.error || 'Error creating invoice');
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast.error('Error creating invoice');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      PAID: 'default',
      PENDING: 'secondary',
      OVERDUE: 'destructive',
    };

    const labels: Record<string, string> = {
      PAID: 'Paid',
      PENDING: 'Pending',
      OVERDUE: 'Overdue',
    };

    return (
      <Badge variant={variants[status]} className="capitalize">
        {labels[status]}
      </Badge>
    );
  };

  const getCategoryLabel = (category: string, customCategory?: string | null) => {
    const labels: Record<string, string> = {
      RENT: 'Rent',
      UTILITIES_WATER: 'Water',
      UTILITIES_ELECTRICITY: 'Electricity',
      SUPPLIES: 'Supplies',
      MAINTENANCE: 'Maintenance',
      MARKETING: 'Marketing',
      SALARIES: 'Salaries',
      OTHER: 'Other',
    };
    
    // If category is "OTHER" and customCategory exists, show the custom category
    if (category === 'OTHER' && customCategory) {
      return customCategory;
    }
    
    return labels[category] || category;
  };

  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen bg-black">
        <DashboardNavbar />
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <DashboardNavbar />
      
      <div className="container mx-auto p-6 space-y-6">
        <div className="mb-6">
          <Button
            onClick={() => router.push('/dashboard/admin')}
            variant="outline"
            size="icon"
            className="border-gray-700 text-gray-300 hover:bg-gray-800 active:bg-gray-800 active:text-gray-300"
            aria-label="Back to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Accounting</h1>
            <p className="text-gray-400">Manage your barbershop&apos;s income and expenses</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full bg-zinc-900 gap-2 p-2 h-auto">
            <TabsTrigger 
              value="summary" 
              onClick={() => setActiveTab('summary')} 
              className="text-xs sm:text-sm py-3 px-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-600 data-[state=active]:to-green-700 data-[state=active]:text-white"
            >
              Summary
            </TabsTrigger>
            <TabsTrigger 
              value="payments" 
              onClick={() => setActiveTab('payments')} 
              className="text-xs sm:text-sm py-3 px-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-blue-700 data-[state=active]:text-white"
            >
              <span className="hidden sm:inline">Barber Payments</span>
              <span className="sm:hidden">Payments</span>
            </TabsTrigger>
            <TabsTrigger 
              value="expenses" 
              onClick={() => setActiveTab('expenses')} 
              className="text-xs sm:text-sm py-3 px-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-600 data-[state=active]:to-orange-700 data-[state=active]:text-white"
            >
              Expenses
            </TabsTrigger>
            <TabsTrigger 
              value="invoices" 
              onClick={() => setActiveTab('invoices')} 
              className="text-xs sm:text-sm py-3 px-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-purple-700 data-[state=active]:text-white"
            >
              Invoices
            </TabsTrigger>
          </TabsList>

          {/* Summary Tab */}
          <TabsContent value="summary" className="space-y-6">
            {/* Date Range Filter */}
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                  <div className="flex-1">
                    <label className="text-sm font-medium text-gray-300 mb-2 block">
                      Period:
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant={dateRange === 'all' ? 'default' : 'outline'}
                        onClick={() => setDateRange('all')}
                        className={dateRange === 'all' ? 'bg-cyan-600' : 'border-zinc-700 text-white hover:bg-zinc-800'}
                      >
                        All Time
                      </Button>
                      <Button
                        size="sm"
                        variant={dateRange === 'week' ? 'default' : 'outline'}
                        onClick={() => setDateRange('week')}
                        className={dateRange === 'week' ? 'bg-cyan-600' : 'border-zinc-700 text-white hover:bg-zinc-800'}
                      >
                        This Week
                      </Button>
                      <Button
                        size="sm"
                        variant={dateRange === 'month' ? 'default' : 'outline'}
                        onClick={() => setDateRange('month')}
                        className={dateRange === 'month' ? 'bg-cyan-600' : 'border-zinc-700 text-white hover:bg-zinc-800'}
                      >
                        This Month
                      </Button>
                      <Button
                        size="sm"
                        variant={dateRange === 'custom' ? 'default' : 'outline'}
                        onClick={() => setDateRange('custom')}
                        className={dateRange === 'custom' ? 'bg-cyan-600' : 'border-zinc-700 text-white hover:bg-zinc-800'}
                      >
                        Custom Range
                      </Button>
                    </div>
                  </div>

                  {dateRange === 'custom' && (
                    <div className="flex flex-col sm:flex-row gap-2 flex-1">
                      <div className="flex-1">
                        <label className="text-xs text-gray-400 mb-1 block">From:</label>
                        <Input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="bg-zinc-800 border-zinc-700 text-white"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs text-gray-400 mb-1 block">To:</label>
                        <Input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="bg-zinc-800 border-zinc-700 text-white"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {summary && (
              <>
                {/* Summary Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card className="bg-gradient-to-br from-green-900/30 to-green-950/30 border-green-800/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-green-100">Total Income</CardTitle>
                      <TrendingUp className="h-4 w-4 text-green-400" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-400">
                        ${summary.totalIncome.toFixed(2)}
                      </div>
                      <div className="mt-2 space-y-1">
                        {summary.barberPaymentsIncome > 0 && (
                          <p className="text-xs text-green-200/60">
                            💈 Payments: ${summary.barberPaymentsIncome.toFixed(2)}
                          </p>
                        )}
                        {summary.invoicesIncome > 0 && (
                          <p className="text-xs text-green-200/60">
                            📄 Invoices: ${summary.invoicesIncome.toFixed(2)}
                          </p>
                        )}
                        {!summary.barberPaymentsIncome && !summary.invoicesIncome && (
                          <p className="text-xs text-green-200/60">
                            From barber payments
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-red-900/30 to-red-950/30 border-red-800/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-red-100">Total Expenses</CardTitle>
                      <TrendingDown className="h-4 w-4 text-red-400" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-red-400">
                        ${summary.totalExpenses.toFixed(2)}
                      </div>
                      <p className="text-xs text-red-200/60 mt-1">
                        Operating costs
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-cyan-900/30 to-cyan-950/30 border-cyan-800/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-cyan-100">Net Balance</CardTitle>
                      <Wallet className="h-4 w-4 text-cyan-400" />
                    </CardHeader>
                    <CardContent>
                      <div className={`text-2xl font-bold ${summary.balance >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
                        ${summary.balance.toFixed(2)}
                      </div>
                      <p className="text-xs text-cyan-200/60 mt-1">
                        Income - Expenses
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-yellow-900/30 to-yellow-950/30 border-yellow-800/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-yellow-100">Pending</CardTitle>
                      <AlertCircle className="h-4 w-4 text-yellow-400" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-yellow-400">
                        ${summary.totalPending.toFixed(2)}
                      </div>
                      <div className="mt-2 space-y-1">
                        {summary.pendingPaymentsAmount > 0 && (
                          <p className="text-xs text-yellow-200/60">
                            💈 Payments: ${summary.pendingPaymentsAmount.toFixed(2)}
                          </p>
                        )}
                        {summary.pendingInvoicesAmount > 0 && (
                          <p className="text-xs text-yellow-200/60">
                            📄 Invoices: ${summary.pendingInvoicesAmount.toFixed(2)}
                          </p>
                        )}
                        <p className="text-xs text-yellow-200/60">
                          {summary.pendingPaymentsCount} items pending
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Expenses by Category */}
                <Card className="bg-zinc-900/50 border-zinc-800">
                  <CardHeader>
                    <CardTitle className="text-white">Expenses by Category</CardTitle>
                    <CardDescription className="text-gray-400">
                      Breakdown of operating expenses
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Array.isArray(summary.expensesByCategory) && summary.expensesByCategory.map((item) => (
                        <div key={item.category} className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-2 h-2 rounded-full bg-cyan-400"></div>
                            <span className="text-gray-300">{getCategoryLabel(item.category)}</span>
                          </div>
                          <span className="font-semibold text-white">${item.total.toFixed(2)}</span>
                        </div>
                      ))}
                      {(!summary.expensesByCategory || summary.expensesByCategory.length === 0) && (
                        <p className="text-gray-500 text-center py-8">No expenses recorded for this period</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Barber Payments Tab */}
          <TabsContent value="payments" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-cyan-600 hover:bg-cyan-700">
                    <Plus className="mr-2 h-4 w-4" />
                    Register Payment
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-zinc-900 border-zinc-800">
                  <DialogHeader>
                    <DialogTitle className="text-white">Register Barber Payment</DialogTitle>
                    <DialogDescription className="text-gray-400">
                      Register weekly barber payment
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreatePayment} className="space-y-4">
                    <div>
                      <Label htmlFor="barberId" className="text-gray-300">Barber</Label>
                      <Popover open={openBarberCombobox} onOpenChange={setOpenBarberCombobox}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openBarberCombobox}
                            className="w-full justify-between bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700 hover:text-white"
                          >
                            {paymentForm.barberId
                              ? (() => {
                                  const selectedBarber = Array.isArray(barbers) ? barbers.find((barber) => barber?.id === paymentForm.barberId) : null;
                                  return selectedBarber?.user?.name || "Select barber";
                                })()
                              : "Select barber"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[400px] p-0 bg-zinc-800 border-zinc-700">
                          <Command className="bg-zinc-800">
                            <CommandInput placeholder="Search barber..." className="text-white" />
                            <CommandEmpty className="text-gray-400 py-6 text-center">Barber not found.</CommandEmpty>
                            <CommandGroup className="max-h-64 overflow-auto">
                              {Array.isArray(barbers) && barbers.length > 0 ? (
                                barbers
                                  .filter(barber => barber && barber.user && barber.id)
                                  .map((barber) => (
                                    <CommandItem
                                      key={barber.id}
                                      value={barber.user?.name || ''}
                                      onSelect={() => {
                                        setPaymentForm({ ...paymentForm, barberId: barber.id });
                                        setOpenBarberCombobox(false);
                                      }}
                                      className="text-white hover:bg-zinc-700"
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          paymentForm.barberId === barber.id ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      {barber.user?.name || 'No name'}
                                    </CommandItem>
                                  ))
                              ) : (
                                <div className="py-6 text-center text-gray-400">No barbers available</div>
                              )}
                            </CommandGroup>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div>
                      <Label htmlFor="amount" className="text-gray-300">Amount</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={paymentForm.amount}
                        onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                        className="bg-zinc-800 border-zinc-700 text-white"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="weekStart" className="text-gray-300">Week Start</Label>
                        <Input
                          id="weekStart"
                          type="date"
                          value={paymentForm.weekStart}
                          onChange={(e) => setPaymentForm({ ...paymentForm, weekStart: e.target.value })}
                          className="bg-zinc-800 border-zinc-700 text-white"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="weekEnd" className="text-gray-300">Week End</Label>
                        <Input
                          id="weekEnd"
                          type="date"
                          value={paymentForm.weekEnd}
                          onChange={(e) => setPaymentForm({ ...paymentForm, weekEnd: e.target.value })}
                          className="bg-zinc-800 border-zinc-700 text-white"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="status" className="text-gray-300">Status</Label>
                      <Select
                        value={paymentForm.status}
                        onValueChange={(value) => setPaymentForm({ ...paymentForm, status: value })}
                      >
                        <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-800 border-zinc-700">
                          <SelectItem value="PENDING" className="text-white">Pending</SelectItem>
                          <SelectItem value="PAID" className="text-white">Paid</SelectItem>
                          <SelectItem value="OVERDUE" className="text-white">Overdue</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="notes" className="text-gray-300">Notes (optional)</Label>
                      <Textarea
                        id="notes"
                        placeholder="Additional notes..."
                        value={paymentForm.notes}
                        onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                        className="bg-zinc-800 border-zinc-700 text-white"
                      />
                    </div>

                    <DialogFooter>
                      <Button type="submit" className="bg-cyan-600 hover:bg-cyan-700">
                        Register Payment
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white">Barber Payments</CardTitle>
                <CardDescription className="text-gray-400">
                  Weekly payment history
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Array.isArray(payments) && payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg border border-zinc-700/50 hover:border-cyan-500/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="font-semibold text-white">{payment.barber.user.name}</h3>
                          {getStatusBadge(payment.status)}
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-400">
                          <span className="flex items-center">
                            <Calendar className="mr-1 h-3 w-3" />
                            {format(new Date(payment.weekStart), 'dd MMM', { locale: enUS })} - {format(new Date(payment.weekEnd), 'dd MMM yyyy', { locale: enUS })}
                          </span>
                          <span className="flex items-center">
                            <DollarSign className="mr-1 h-3 w-3" />
                            ${payment.amount.toFixed(2)}
                          </span>
                        </div>
                        {payment.notes && (
                          <p className="text-xs text-gray-500 mt-2">{payment.notes}</p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        {payment.status === 'PENDING' && (
                          <Button
                            size="sm"
                            onClick={() => handleUpdatePaymentStatus(payment.id, 'PAID')}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Mark as Paid
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  {(!Array.isArray(payments) || payments.length === 0) && (
                    <p className="text-center text-gray-400 py-8">
                      No payments recorded
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Expenses Tab */}
          <TabsContent value="expenses" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={showExpenseDialog} onOpenChange={setShowExpenseDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-cyan-600 hover:bg-cyan-700">
                    <Plus className="mr-2 h-4 w-4" />
                    Record Expense
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-zinc-900 border-zinc-800">
                  <DialogHeader>
                    <DialogTitle className="text-white">Record Expense</DialogTitle>
                    <DialogDescription className="text-gray-400">
                      Record a new operating expense
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateExpense} className="space-y-4">
                    <div>
                      <Label htmlFor="category" className="text-gray-300">Category</Label>
                      <Select
                        value={expenseForm.category}
                        onValueChange={(value) => setExpenseForm({ ...expenseForm, category: value, customCategory: value === 'OTHER' ? expenseForm.customCategory : '' })}
                      >
                        <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-800 border-zinc-700">
                          <SelectItem value="RENT" className="text-white">Rent</SelectItem>
                          <SelectItem value="UTILITIES_WATER" className="text-white">Water</SelectItem>
                          <SelectItem value="UTILITIES_ELECTRICITY" className="text-white">Electricity</SelectItem>
                          <SelectItem value="SUPPLIES" className="text-white">Supplies</SelectItem>
                          <SelectItem value="MAINTENANCE" className="text-white">Maintenance</SelectItem>
                          <SelectItem value="MARKETING" className="text-white">Marketing</SelectItem>
                          <SelectItem value="SALARIES" className="text-white">Salaries</SelectItem>
                          <SelectItem value="OTHER" className="text-white">Other (Customize)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Custom Category Input - Only shows when OTHER is selected */}
                    {expenseForm.category === 'OTHER' && (
                      <div>
                        <Label htmlFor="customCategory" className="text-gray-300">Custom Category</Label>
                        {customCategories.length > 0 ? (
                          <div className="space-y-2">
                            <Select
                              value={expenseForm.customCategory}
                              onValueChange={(value) => setExpenseForm({ ...expenseForm, customCategory: value })}
                            >
                              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                                <SelectValue placeholder="Select or type new..." />
                              </SelectTrigger>
                              <SelectContent className="bg-zinc-800 border-zinc-700">
                                <SelectItem value="__new__" className="text-cyan-400 font-semibold">+ Create new category</SelectItem>
                                {Array.isArray(customCategories) && customCategories.length > 0 ? (
                                  customCategories.map((cat) => (
                                    <SelectItem key={cat.id} value={cat.name} className="text-white">
                                      {cat.name}
                                    </SelectItem>
                                  ))
                                ) : null}
                              </SelectContent>
                            </Select>
                            {expenseForm.customCategory === '__new__' && (
                              <Input
                                type="text"
                                placeholder="New category name..."
                                value={newCategoryInput}
                                onChange={(e) => setNewCategoryInput(e.target.value)}
                                className="bg-zinc-800 border-zinc-700 text-white"
                                required
                                autoFocus
                              />
                            )}
                          </div>
                        ) : (
                          <Input
                            id="customCategory"
                            type="text"
                            placeholder="E.g: Equipment repair, Online advertising, etc."
                            value={expenseForm.customCategory}
                            onChange={(e) => setExpenseForm({ ...expenseForm, customCategory: e.target.value })}
                            className="bg-zinc-800 border-zinc-700 text-white"
                            required
                          />
                        )}
                      </div>
                    )}

                    <div>
                      <Label htmlFor="amount" className="text-gray-300">Amount</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={expenseForm.amount}
                        onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                        className="bg-zinc-800 border-zinc-700 text-white"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="date" className="text-gray-300">Date</Label>
                      <Input
                        id="date"
                        type="date"
                        value={expenseForm.date}
                        onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                        className="bg-zinc-800 border-zinc-700 text-white"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="description" className="text-gray-300">Description</Label>
                      <Input
                        id="description"
                        placeholder="Expense description"
                        value={expenseForm.description}
                        onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                        className="bg-zinc-800 border-zinc-700 text-white"
                      />
                    </div>

                    <div>
                      <Label htmlFor="notes" className="text-gray-300">Notes (optional)</Label>
                      <Textarea
                        id="notes"
                        placeholder="Additional notes..."
                        value={expenseForm.notes}
                        onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                        className="bg-zinc-800 border-zinc-700 text-white"
                      />
                    </div>

                    <DialogFooter>
                      <Button type="submit" className="bg-cyan-600 hover:bg-cyan-700">
                        Record Expense
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white">Operating Expenses</CardTitle>
                <CardDescription className="text-gray-400">
                  History of all expenses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Array.isArray(expenses) && expenses.map((expense) => (
                    <div
                      key={expense.id}
                      className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg border border-zinc-700/50 hover:border-cyan-500/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="font-semibold text-white">{getCategoryLabel(expense.category, expense.customCategory)}</h3>
                          <Badge variant="outline" className="text-gray-400">
                            ${expense.amount.toFixed(2)}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-400">
                          <span className="flex items-center">
                            <Calendar className="mr-1 h-3 w-3" />
                            {format(new Date(expense.date), 'dd MMM yyyy', { locale: enUS })}
                          </span>
                          {expense.description && (
                            <span>{expense.description}</span>
                          )}
                        </div>
                        {expense.notes && (
                          <p className="text-xs text-gray-500 mt-2">{expense.notes}</p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteExpense(expense.id)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {(!Array.isArray(expenses) || expenses.length === 0) && (
                    <p className="text-center text-gray-400 py-8">
                      No expenses recorded
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Invoices Tab */}
          <TabsContent value="invoices" className="space-y-4">
            <div className="flex justify-end">
              <Link href="/dashboard/admin/facturas/nueva">
                <Button className="bg-cyan-600 hover:bg-cyan-700">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Invoice
                </Button>
              </Link>
              <Dialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
                <DialogTrigger asChild>
                  <Button className="hidden">
                    Hidden
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-zinc-900 border-zinc-800 max-h-[90vh] overflow-y-auto max-w-3xl">
                  <DialogHeader className="sticky top-0 bg-zinc-900 z-10 pb-4">
                    <DialogTitle className="text-white">Create Invoice</DialogTitle>
                    <DialogDescription className="text-gray-400">
                      Generate an invoice for a client or barber
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateInvoice} className="space-y-4 px-1">
                    <div>
                      <Label htmlFor="type" className="text-gray-300">Invoice Type</Label>
                      <Select
                        value={invoiceForm.type}
                        onValueChange={(value) => setInvoiceForm({ ...invoiceForm, type: value })}
                      >
                        <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-800 border-zinc-700">
                          <SelectItem value="CLIENT_SERVICE" className="text-white">Client Service</SelectItem>
                          <SelectItem value="BARBER_PAYMENT" className="text-white">Barber Payment</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Toggle between new recipient and existing user */}
                    <div className="flex items-center space-x-2 mb-4">
                      <input
                        type="checkbox"
                        id="useExistingRecipient"
                        checked={useExistingRecipient}
                        onChange={(e) => setUseExistingRecipient(e.target.checked)}
                        className="w-4 h-4 text-cyan-600 bg-zinc-900 border-zinc-700 rounded focus:ring-cyan-600"
                      />
                      <Label htmlFor="useExistingRecipient" className="text-gray-300">
                        Use existing user
                      </Label>
                    </div>

                    {useExistingRecipient ? (
                      <div>
                        <Label htmlFor="recipientId" className="text-gray-300">Recipient</Label>
                        <Popover open={openUserCombobox} onOpenChange={setOpenUserCombobox}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={openUserCombobox}
                              className="w-full justify-between bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700 hover:text-white"
                            >
                              {invoiceForm.recipientId
                                ? users.find((user) => user.id === invoiceForm.recipientId)?.name || "Select recipient"
                                : "Select recipient"}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[400px] p-0 bg-zinc-800 border-zinc-700">
                            <Command className="bg-zinc-800">
                              <CommandInput placeholder="Search user..." className="text-white" />
                              <CommandEmpty className="text-gray-400 py-6 text-center">User not found.</CommandEmpty>
                              <CommandGroup className="max-h-64 overflow-auto">
                                {Array.isArray(users) && users.map((user) => (
                                  <CommandItem
                                    key={user.id}
                                    value={`${user.name} ${user.email}`}
                                    onSelect={() => {
                                      setInvoiceForm({ ...invoiceForm, recipientId: user.id });
                                      setOpenUserCombobox(false);
                                    }}
                                    className="text-white hover:bg-zinc-700"
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        invoiceForm.recipientId === user.id ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    <div>
                                      <div>{user.name}</div>
                                      <div className="text-xs text-gray-400">{user.email}</div>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                    ) : (
                      <>
                        <div>
                          <Label htmlFor="recipientName" className="text-gray-300">Recipient Name *</Label>
                          <Input
                            id="recipientName"
                            value={invoiceForm.recipientName}
                            onChange={(e) => setInvoiceForm({ ...invoiceForm, recipientName: e.target.value })}
                            placeholder="E.g: Juan Perez"
                            className="bg-zinc-800 border-zinc-700 text-white"
                          />
                        </div>
                        <div>
                          <Label htmlFor="recipientEmail" className="text-gray-300">Recipient Email *</Label>
                          <Input
                            id="recipientEmail"
                            type="email"
                            value={invoiceForm.recipientEmail}
                            onChange={(e) => setInvoiceForm({ ...invoiceForm, recipientEmail: e.target.value })}
                            placeholder="E.g: juan@example.com"
                            className="bg-zinc-800 border-zinc-700 text-white"
                          />
                        </div>
                      </>
                    )}

                    <div>
                      <Label htmlFor="description" className="text-gray-300">Description (optional)</Label>
                      <Textarea
                        id="description"
                        placeholder="General invoice description (optional)..."
                        value={invoiceForm.description}
                        onChange={(e) => setInvoiceForm({ ...invoiceForm, description: e.target.value })}
                        className="bg-zinc-800 border-zinc-700 text-white"
                      />
                    </div>

                    {/* Items Section */}
                    <div className="border-2 border-cyan-500/50 rounded-lg p-5 space-y-4 bg-gradient-to-br from-cyan-950/20 to-zinc-900/50">
                      <div className="flex items-center justify-between border-b border-cyan-600/20 pb-3">
                        <div>
                          <Label className="text-white text-xl font-bold flex items-center gap-2">
                            <span className="text-cyan-400">📋</span>
                            Invoice Items
                            <span className="text-red-400">*</span>
                          </Label>
                          <p className="text-xs text-gray-400 mt-1">
                            Add the products or services that make up this invoice
                          </p>
                        </div>
                        <Badge variant="outline" className="text-sm text-cyan-400 border-cyan-400 px-3 py-1">
                          {invoiceItems.length} {invoiceItems.length === 1 ? 'item' : 'items'}
                        </Badge>
                      </div>

                      {/* Saved Items */}
                      {savedItems.length > 0 && (
                        <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 rounded-lg border border-purple-500/30 space-y-3">
                          {/* Header - Always visible */}
                          <button
                            type="button"
                            onClick={() => setShowSavedItems(!showSavedItems)}
                            className="w-full flex items-center justify-between p-4 hover:bg-purple-900/10 transition-colors rounded-lg"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-xl">💾</span>
                              <Label className="text-purple-400 font-semibold cursor-pointer">Saved Items - Click to Add</Label>
                              <Badge variant="outline" className="text-xs text-purple-300 border-purple-400">
                                {savedItems.length} saved
                              </Badge>
                            </div>
                            <ChevronDown 
                              className={`h-5 w-5 text-purple-400 transition-transform duration-200 ${showSavedItems ? 'rotate-180' : ''}`}
                            />
                          </button>
                          
                          {/* Content - Collapsible */}
                          {showSavedItems && (
                            <div className="px-4 pb-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {savedItems.map((item) => (
                                  <div
                                    key={item.id}
                                    className="group bg-zinc-800/50 hover:bg-zinc-800 rounded-lg p-3 border border-zinc-700 hover:border-purple-500/50 transition-all cursor-pointer"
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <div 
                                        onClick={() => handleAddSavedItem(item)}
                                        className="flex-1"
                                      >
                                        <p className="text-white font-medium text-sm line-clamp-1">{item.description}</p>
                                        <p className="text-cyan-400 text-xs font-bold">${item.price.toFixed(2)}</p>
                                      </div>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDeleteSavedItem(item.id)}
                                        className="text-red-400 hover:text-red-300 hover:bg-red-900/30 p-1 h-auto opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Delete saved item"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <p className="text-xs text-gray-400 italic flex items-center gap-1">
                                <span>💡</span>
                                Click an item to add it to the invoice. Hover to see delete button.
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Add Item Form - Destacado */}
                      <div className="bg-zinc-800 rounded-lg p-4 border border-cyan-600/40 space-y-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Plus className="h-5 w-5 text-cyan-400" />
                            <Label className="text-cyan-400 font-semibold">Add New Item</Label>
                          </div>
                          {currentItem.description && currentItem.price > 0 && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={handleSaveAsTemplate}
                              className="text-xs text-purple-400 border-purple-500 hover:bg-purple-900/30"
                            >
                              💾 Save for later
                            </Button>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                          <div className="md:col-span-6">
                            <Label className="text-gray-300 mb-2 block font-medium">
                              Description <span className="text-red-400">*</span>
                            </Label>
                            <Input
                              placeholder="E.g: Premium haircut"
                              value={currentItem.description}
                              onChange={(e) => setCurrentItem({ ...currentItem, description: e.target.value })}
                              className="bg-zinc-900 border-zinc-600 text-white focus:border-cyan-500 focus:ring-cyan-500"
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddItem();
                                }
                              }}
                            />
                          </div>
                          <div className="md:col-span-2">
                            <Label className="text-gray-300 mb-2 block font-medium">
                              Quantity
                            </Label>
                            <Input
                              type="number"
                              placeholder="1"
                              min="1"
                              value={currentItem.quantity || ''}
                              onChange={(e) => setCurrentItem({ ...currentItem, quantity: parseInt(e.target.value) || 1 })}
                              className="bg-zinc-900 border-zinc-600 text-white focus:border-cyan-500 focus:ring-cyan-500"
                            />
                          </div>
                          <div className="md:col-span-3">
                            <Label className="text-gray-300 mb-2 block font-medium">
                              Unit Price <span className="text-red-400">*</span>
                            </Label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              value={currentItem.price || ''}
                              onChange={(e) => setCurrentItem({ ...currentItem, price: parseFloat(e.target.value) || 0 })}
                              className="bg-zinc-900 border-zinc-600 text-white focus:border-cyan-500 focus:ring-cyan-500"
                            />
                          </div>
                          <div className="md:col-span-1 flex items-end">
                            <Button
                              type="button"
                              onClick={handleAddItem}
                              className="bg-cyan-600 hover:bg-cyan-700 w-full h-10 flex items-center justify-center gap-1 font-semibold shadow-lg shadow-cyan-600/30"
                              title="Add item"
                            >
                              <Plus className="h-5 w-5" />
                            </Button>
                          </div>
                        </div>
                        
                        <p className="text-xs text-gray-500 italic flex items-center gap-1">
                          <span>💡</span>
                          Press Enter or click the + button to add the item
                        </p>
                      </div>

                      {/* Items List */}
                      {invoiceItems.length > 0 ? (
                        <div className="space-y-3 mt-4">
                          <div className="flex items-center gap-2 px-2">
                            <Label className="text-gray-300 font-semibold">Added Items:</Label>
                          </div>
                          
                          <div className="bg-zinc-900/50 rounded-lg border border-zinc-700/50 overflow-hidden">
                            <div className="grid grid-cols-12 gap-3 text-xs text-cyan-400 font-bold uppercase px-4 py-3 bg-zinc-800/50 border-b border-zinc-700">
                              <div className="col-span-6">Description</div>
                              <div className="col-span-2 text-center">Qty</div>
                              <div className="col-span-3 text-right">Unit Price</div>
                              <div className="col-span-1"></div>
                            </div>
                            {invoiceItems.map((item, index) => (
                              <div key={index} className="grid grid-cols-12 gap-3 px-4 py-3 items-center hover:bg-zinc-800/50 transition-colors border-b border-zinc-800/50 last:border-0">
                                <div className="col-span-6 text-white font-medium">{item.description}</div>
                                <div className="col-span-2 text-center">
                                  <Badge variant="outline" className="border-zinc-600 text-white">
                                    {item.quantity}x
                                  </Badge>
                                </div>
                                <div className="col-span-3 text-right">
                                  <div className="flex flex-col items-end">
                                    <span className="text-xs text-gray-400">${item.price.toFixed(2)} c/u</span>
                                    <span className="text-white font-bold text-sm">
                                      ${(item.quantity * item.price).toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                                <div className="col-span-1 flex justify-end">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveItem(index)}
                                    className="text-red-400 hover:text-red-300 hover:bg-red-900/30 p-2 h-auto rounded-md transition-all"
                                    title="Delete item"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                          
                          {/* Highlighted total */}
                          <div className="bg-gradient-to-r from-cyan-900/30 to-cyan-800/20 rounded-lg p-4 border border-cyan-600/40">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-300 text-lg font-semibold">Invoice Total:</span>
                              <div className="text-right">
                                <div className="text-3xl font-bold text-cyan-400">
                                  ${calculateTotal().toFixed(2)}
                                </div>
                                <div className="text-xs text-gray-400">
                                  {invoiceItems.length} {invoiceItems.length === 1 ? 'item' : 'items'}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8 bg-zinc-900/30 rounded-lg border-2 border-dashed border-zinc-700">
                          <div className="flex flex-col items-center gap-2">
                            <div className="text-4xl mb-2">📝</div>
                            <p className="text-gray-400 font-medium">
                              No items added yet
                            </p>
                            <p className="text-gray-500 text-sm">
                              Add at least one item using the form above
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="dueDate" className="text-gray-300">Due Date (optional)</Label>
                      <Input
                        id="dueDate"
                        type="date"
                        value={invoiceForm.dueDate}
                        onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })}
                        className="bg-zinc-800 border-zinc-700 text-white"
                      />
                    </div>

                    <DialogFooter className="sticky bottom-0 bg-zinc-900 pt-4 mt-4 border-t border-zinc-800">
                      <Button type="submit" className="bg-cyan-600 hover:bg-cyan-700 w-full">
                        Create Invoice
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white">Generated Invoices</CardTitle>
                <CardDescription className="text-gray-400">
                  List of all created invoices
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Array.isArray(invoices) && invoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-zinc-800/50 rounded-lg border border-zinc-700/50 hover:border-cyan-500/50 transition-colors gap-4"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <h3 className="font-semibold text-white text-sm sm:text-base">{invoice.invoiceNumber}</h3>
                          <Badge variant={invoice.isPaid ? 'default' : 'secondary'} className={invoice.isPaid ? 'bg-green-600' : ''}>
                            {invoice.isPaid ? 'Paid' : 'Pending'}
                          </Badge>
                          <Badge variant="outline" className="text-cyan-400 border-cyan-400 text-xs">
                            {invoice.type === 'CLIENT_SERVICE' ? 'Service' : 'Barber Payment'}
                          </Badge>
                        </div>
                        <div className="space-y-1">
                          <p className="text-gray-400 text-xs sm:text-sm break-words">
                            <strong>Recipient:</strong> {invoice.recipientName} ({invoice.recipientEmail})
                          </p>
                          <p className="text-gray-400 text-xs sm:text-sm break-words">
                            <strong>Description:</strong> {invoice.description}
                          </p>
                          <p className="text-gray-400 text-xs sm:text-sm">
                            <strong>Date:</strong> {format(new Date(invoice.issueDate), 'MM/dd/yyyy', { locale: enUS })}
                            {invoice.dueDate && ` - Due: ${format(new Date(invoice.dueDate), 'MM/dd/yyyy', { locale: enUS })}`}
                          </p>
                          {invoice.isPaid && invoice.paidAt && (
                            <p className="text-green-400 text-xs sm:text-sm">
                              <strong>Paid on:</strong> {format(new Date(invoice.paidAt), 'MM/dd/yyyy HH:mm', { locale: enUS })}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-row sm:flex-col items-center justify-between sm:justify-center gap-3 sm:gap-2 sm:text-right shrink-0">
                        <p className="text-xl sm:text-2xl font-bold text-white whitespace-nowrap">${invoice.amount.toFixed(2)}</p>
                        <Button
                          onClick={() => handleToggleInvoicePayment(invoice.id, invoice.isPaid)}
                          variant={invoice.isPaid ? 'outline' : 'default'}
                          size="sm"
                          className={cn(
                            'whitespace-nowrap text-xs sm:text-sm',
                            invoice.isPaid 
                              ? 'border-orange-500 text-orange-400 hover:bg-orange-500/20' 
                              : 'bg-green-600 hover:bg-green-700 text-white'
                          )}
                        >
                          {invoice.isPaid ? 'Mark Pending' : 'Mark Paid'}
                        </Button>
                      </div>
                    </div>
                  ))}
                  {(!Array.isArray(invoices) || invoices.length === 0) && (
                    <p className="text-center text-gray-400 py-8">
                      No invoices recorded
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
