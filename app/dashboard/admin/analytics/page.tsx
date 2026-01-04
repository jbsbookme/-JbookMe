'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, Calendar, Users, Star, Clock } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface AnalyticsData {
  revenue: {
    total: number;
    currentMonth: number;
    lastMonth: number;
    growth: number;
    byMonth: { month: string; amount: number }[];
  };
  appointments: {
    total: number;
    completed: number;
    pending: number;
    cancelled: number;
    currentMonth: number;
  };
  services: {
    top: {
      id: string;
      name: string;
      price: number;
      bookings: number;
      revenue: number;
    }[];
  };
  barbers: {
    top: {
      id: string;
      name: string;
      appointments: number;
      reviews: number;
      rating: number;
      revenue: number;
    }[];
  };
  clients: {
    total: number;
    newThisMonth: number;
  };
  reviews: {
    total: number;
    averageRating: number;
  };
  peakHours: { time: string; count: number }[];
}

const COLORS = ['#00f0ff', '#ffd700', '#8b5cf6', '#ec4899', '#10b981'];

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/stats/analytics');
      if (!response.ok) throw new Error('Failed to fetch analytics');
      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-[#00f0ff] text-xl">Loading analytics...</div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-red-500 text-xl">Failed to load analytics data</div>
      </div>
    );
  }

  const appointmentStatusData = [
    { name: 'Completed', value: analytics.appointments.completed, color: '#10b981' },
    { name: 'Pending', value: analytics.appointments.pending, color: '#ffd700' },
    { name: 'Cancelled', value: analytics.appointments.cancelled, color: '#ef4444' },
  ];

  return (
    <div className="min-h-screen bg-black pb-24">
      {/* Header */}
      <div className="border-b border-gray-800 bg-black/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-6 max-w-7xl">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard/admin">
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-[#00f0ff]">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-white">Analytics Dashboard</h1>
              <p className="text-gray-400 text-sm mt-1">Business performance insights</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-7xl space-y-8">
        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Revenue */}
          <Card className="bg-gradient-to-br from-[#00f0ff]/10 to-transparent border-[#00f0ff]/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-400 flex items-center">
                <DollarSign className="w-4 h-4 mr-2" />
                Total Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">
                ${analytics.revenue.total.toFixed(2)}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                This month: ${analytics.revenue.currentMonth.toFixed(2)}
              </p>
              <div className="flex items-center mt-2">
                {analytics.revenue.growth >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                )}
                <span
                  className={`text-sm font-medium ${
                    analytics.revenue.growth >= 0 ? 'text-green-500' : 'text-red-500'
                  }`}
                >
                  {analytics.revenue.growth >= 0 ? '+' : ''}
                  {analytics.revenue.growth.toFixed(1)}%
                </span>
                <span className="text-xs text-gray-500 ml-2">vs last month</span>
              </div>
            </CardContent>
          </Card>

          {/* Total Appointments */}
          <Card className="bg-gradient-to-br from-[#ffd700]/10 to-transparent border-[#ffd700]/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-400 flex items-center">
                <Calendar className="w-4 h-4 mr-2" />
                Total Appointments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{analytics.appointments.total}</div>
              <p className="text-xs text-gray-400 mt-2">
                Completed: {analytics.appointments.completed}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                This month: {analytics.appointments.currentMonth}
              </p>
            </CardContent>
          </Card>

          {/* Total Clients */}
          <Card className="bg-gradient-to-br from-purple-500/10 to-transparent border-purple-500/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-400 flex items-center">
                <Users className="w-4 h-4 mr-2" />
                Total Clients
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{analytics.clients.total}</div>
              <p className="text-xs text-gray-400 mt-2">
                New this month: {analytics.clients.newThisMonth}
              </p>
            </CardContent>
          </Card>

          {/* Average Rating */}
          <Card className="bg-gradient-to-br from-pink-500/10 to-transparent border-pink-500/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-400 flex items-center">
                <Star className="w-4 h-4 mr-2" />
                Average Rating
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">
                {analytics.reviews.averageRating.toFixed(1)}
              </div>
              <p className="text-xs text-gray-400 mt-2">From {analytics.reviews.total} reviews</p>
              <div className="flex items-center mt-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${
                      star <= analytics.reviews.averageRating
                        ? 'fill-[#ffd700] text-[#ffd700]'
                        : 'text-gray-600'
                    }`}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Revenue Chart */}
        <Card className="bg-black/40 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Revenue Trend (Last 6 Months)</CardTitle>
            <CardDescription className="text-gray-400">
              Monthly revenue breakdown
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.revenue.byMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="month" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: '#fff' }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="#00f0ff"
                  strokeWidth={3}
                  dot={{ fill: '#00f0ff', r: 5 }}
                  activeDot={{ r: 8 }}
                  name="Revenue ($)"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Appointment Status Pie Chart */}
          <Card className="bg-black/40 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Appointment Status</CardTitle>
              <CardDescription className="text-gray-400">
                Distribution of appointment statuses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={appointmentStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {appointmentStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Peak Hours Chart */}
          <Card className="bg-black/40 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Clock className="w-5 h-5 mr-2" />
                Peak Hours
              </CardTitle>
              <CardDescription className="text-gray-400">
                Most popular booking times
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.peakHours}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="time" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="count" fill="#ffd700" name="Bookings" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Top Services */}
        <Card className="bg-black/40 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Top Services</CardTitle>
            <CardDescription className="text-gray-400">
              Most booked services and their revenue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Service</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Price</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Bookings</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.services.top.map((service, index) => (
                    <tr
                      key={service.id}
                      className="border-b border-gray-800/50 hover:bg-gray-900/50 transition"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          <div
                            className="w-8 h-8 rounded-full mr-3 flex items-center justify-center text-white font-bold"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          >
                            {index + 1}
                          </div>
                          <span className="text-white font-medium">{service.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-300">${service.price.toFixed(2)}</td>
                      <td className="py-3 px-4 text-gray-300">{service.bookings}</td>
                      <td className="py-3 px-4 text-[#00f0ff] font-semibold">
                        ${service.revenue.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Top Barbers */}
        <Card className="bg-black/40 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Top Barbers</CardTitle>
            <CardDescription className="text-gray-400">
              Most popular barbers by appointments and revenue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Barber</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Appointments</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Rating</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Reviews</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.barbers.top.map((barber, index) => (
                    <tr
                      key={barber.id}
                      className="border-b border-gray-800/50 hover:bg-gray-900/50 transition"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          <div
                            className="w-8 h-8 rounded-full mr-3 flex items-center justify-center text-white font-bold"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          >
                            {index + 1}
                          </div>
                          <span className="text-white font-medium">{barber.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-300">{barber.appointments}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          <Star className="w-4 h-4 fill-[#ffd700] text-[#ffd700] mr-1" />
                          <span className="text-white">{barber.rating.toFixed(1)}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-300">{barber.reviews}</td>
                      <td className="py-3 px-4 text-[#ffd700] font-semibold">
                        ${barber.revenue.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
