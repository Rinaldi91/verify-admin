"use client";

import { useEffect, useState, useMemo } from "react";
import Cookies from "js-cookie";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  LayoutDashboard,
  Users,
  FlaskConical,
  Clock,
  AlertTriangle,
} from "lucide-react";

// --- Tipe Data untuk User dan API ---
type Permission = {
  id: number;
  name: string;
  slug: string;
};

type Role = {
  id: number;
  name: string;
  slug: string;
  permissions: Permission[];
};

type User = {
  id?: number;
  name: string;
  email?: string;
  role?: Role | { name: string };
};

type ApiResponse = {
  status: boolean;
  message: string;
  data: User;
};

interface ChartDataItem {
  date: number;
  tests: number;
}

const getUserDataFromCookies = (): {
  user: User | null;
  token: string | null;
} => {
  try {
    const token = Cookies.get("token") || null;
    const userCookie = Cookies.get("user");
    const user: User | null = userCookie ? JSON.parse(userCookie) : null;
    return { user, token };
  } catch (error) {
    console.error("Error parsing cookie data:", error);
    return { user: null, token: null };
  }
};

const fetchUserProfile = async (token: string): Promise<User | null> => {
  try {
    const response = await fetch("http://verify-api.test/api/profile", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: ApiResponse = await response.json();
    return result.status && result.data ? result.data : null;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
};

// --- Data Dummy ---
// const testDistributionData = [
//   { name: "Hematology", value: 450 },
//   { name: "Urinalysis", value: 320 },
//   { name: "Chemistry", value: 280 },
//   { name: "Immunology", value: 150 },
// ];
// const COLORS = ["#38bdf8", "#34d399", "#facc15", "#c084fc"];

const testDistributionData = [
  { name: "Urinalysis", value: 100 }, // Hanya menampilkan Urinalysis
];
const COLORS = ["#38bdf8"];

const recentPatients = [
  {
    id: "PAT-0725",
    name: "Budi Santoso",
    test: "Complete Blood Count",
    status: "Completed",
  },
  {
    id: "PAT-0724",
    name: "Citra Lestari",
    test: "Urinalysis",
    status: "Completed",
  },
  {
    id: "PAT-0723",
    name: "Agus Wijaya",
    test: "Lipid Panel",
    status: "Pending",
  },
  {
    id: "PAT-0722",
    name: "Dewi Anggraini",
    test: "Glucose Test",
    status: "Completed",
  },
  {
    id: "PAT-0721",
    name: "Eko Prasetyo",
    test: "Thyroid Function",
    status: "Critical",
  },
];

// --- Komponen Utama ---
export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadUserData = async () => {
      setLoading(true);
      setError(null);
      const { user: cookieUser, token } = getUserDataFromCookies();

      if (cookieUser && token) {
        // Data dari cookie ditampilkan dulu untuk laoding cepat
        setUser(cookieUser);
        setLoading(false);

        // Kemudian, update dengan data terbaru dari API di background
        const freshUser = await fetchUserProfile(token);
        if (freshUser) {
          setUser(freshUser);
          Cookies.set("user", JSON.stringify(freshUser), { expires: 1 });
          if (
            freshUser.role &&
            typeof freshUser.role === "object" &&
            "permissions" in freshUser.role &&
            Array.isArray((freshUser.role as Role).permissions)
          ) {
            const permissionSlugs = (freshUser.role as Role).permissions.map(
              (p) => p.slug
            );
            Cookies.set("permissions", JSON.stringify(permissionSlugs), {
              expires: 1,
            });
          }
        }
      } else if (token) {
        // Jika cookie user tidak ada tapi token ada, fetch dari API
        const apiUser = await fetchUserProfile(token);
        if (apiUser) {
          setUser(apiUser);
          Cookies.set("user", JSON.stringify(apiUser), { expires: 1 });
          if (
            apiUser.role &&
            typeof apiUser.role === "object" &&
            "permissions" in apiUser.role &&
            Array.isArray((apiUser.role as Role).permissions)
          ) {
            const permissionSlugs = (apiUser.role as Role).permissions.map(
              (p) => p.slug
            );
            Cookies.set("permissions", JSON.stringify(permissionSlugs), {
              expires: 1,
            });
          }
        } else {
          setError("Failed to fetch user data. Please try logging in again.");
        }
        setLoading(false);
      } else {
        // Tidak ada token, user harus login
        setError("Authentication required. Please login.");
        setLoading(false);
        // Anda bisa tambahkan redirect ke halaman login di sini
        // window.location.href = '/login';
      }
    };

    loadUserData();
  }, []);

  // State untuk filter grafik
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1); // 1-12
  const [volumeChartData, setVolumeChartData] = useState<ChartDataItem[]>([]);

  // Fungsi untuk membuat data grafik dinamis
  const generateChartDataForMonth = (year: number, month: number): ChartDataItem[] => {
  const daysInMonth = new Date(year, month, 0).getDate();
  const data: ChartDataItem[] = [];
  
  for (let i = 1; i <= daysInMonth; i++) {
    data.push({
      date: i,
      tests: 50 + Math.floor(Math.random() * 70),
    });
  }
  
  return data;
};

  // useEffect untuk memperbarui grafik saat filter berubah
  useEffect(() => {
  setVolumeChartData(generateChartDataForMonth(selectedYear, selectedMonth));
}, [selectedYear, selectedMonth]);

// Daftar opsi untuk filter dropdown dengan type yang jelas
const years = useMemo((): number[] => {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 5 }, (_, i) => currentYear - i);
}, []);

  const months = [
    { value: 1, name: "January" },
    { value: 2, name: "February" },
    { value: 3, name: "March" },
    { value: 4, name: "April" },
    { value: 5, name: "May" },
    { value: 6, name: "June" },
    { value: 7, name: "July" },
    { value: 8, name: "August" },
    { value: 9, name: "September" },
    { value: 10, name: "October" },
    { value: 11, name: "November" },
    { value: 12, name: "December" },
  ];

  // Efek untuk memuat data pengguna
  useEffect(() => {
    const userCookie = Cookies.get("user");
    if (userCookie) {
      try {
        setUser(JSON.parse(userCookie));
      } catch (e) {
        console.error("Failed to parse user cookie", e);
        setUser({ name: "Guest", role: { name: "Guest" } });
      }
    } else {
      setUser({ name: "Dr. Amelia", role: { name: "Lab Supervisor" } });
    }
    setLoading(false);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed":
        return "bg-green-500/20 text-green-400";
      case "Pending":
        return "bg-yellow-500/20 text-yellow-400";
      case "Critical":
        return "bg-blue-500/20 text-blue-400";
      default:
        return "bg-gray-500/20 text-gray-400";
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-400"></div>
        <p className="mt-4 text-gray-400">Loading Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Dashboard */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <LayoutDashboard className="w-6 h-6" />
          Laboratory Dashboard
        </h1>
        <p className="text-gray-400 mt-1">
          Welcome back, {user?.name || "User"}. Here is your labs overview.
        </p>
      </div>

      {/* Kartu Statistik Utama (KPI) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-sky-500/20 rounded-lg">
              <Users className="w-6 h-6 text-sky-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Patients Today</p>
              <p className="text-2xl font-bold text-white">124</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500/20 rounded-lg">
              <FlaskConical className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Tests Processed</p>
              <p className="text-2xl font-bold text-white">357</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-500/20 rounded-lg">
              <Clock className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Pending Results</p>
              <p className="text-2xl font-bold text-white">18</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-rose-500/20 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-rose-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Critical Alerts</p>
              <p className="text-2xl font-bold text-white">4</p>
            </div>
          </div>
        </div>
      </div>

      {/* Konten Utama: Grafik dan Daftar Pasien */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kartu Grafik Volume Tes Harian */}
        <div className="lg:col-span-2 bg-gray-900 p-6 rounded-lg border border-gray-800">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">
              Daily Test Volume
            </h2>
            <div className="flex items-center gap-2 mt-2 sm:mt-0">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg focus:ring-sky-500 focus:border-sky-500 block w-full p-2"
              >
                {months.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.name}
                  </option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg focus:ring-sky-500 focus:border-sky-500 block w-full p-2"
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={volumeChartData}>
              <XAxis
                dataKey="date"
                name="Date"
                stroke="#9ca3af"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#9ca3af"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1f2937",
                  border: "1px solid #374151",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "white" }}
              />
              <Bar
                dataKey="tests"
                fill="#38bdf8"
                radius={[4, 4, 0, 0]}
                name="Total Tests"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Daftar Pasien Terbaru */}
        <div className="bg-gray-900 p-6 rounded-lg border border-gray-800">
          <h2 className="text-lg font-semibold mb-4 text-white">
            Recent Patient Tests
          </h2>
          <div className="space-y-4 max-h-[300px] overflow-y-auto">
            {recentPatients.map((patient) => (
              <div
                key={patient.id}
                className="flex items-center justify-between"
              >
                <div>
                  <p className="font-medium text-white">{patient.name}</p>
                  <p className="text-sm text-gray-400">{patient.test}</p>
                </div>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                    patient.status
                  )}`}
                >
                  {patient.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Grafik Distribusi Tes */}
      <div className="bg-gray-900 p-6 rounded-lg border border-gray-800">
        <h2 className="text-lg font-semibold mb-4 text-white">
          Test Type Distribution
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={testDistributionData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              fill="#8884d8"
              paddingAngle={5}
              label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
            >
              {testDistributionData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "#1f2937",
                border: "1px solid #374151",
                borderRadius: "8px",
              }}
              labelStyle={{ color: "white" }}
            />
            <Legend
              formatter={(value) => (
                <span style={{ color: "white" }}>{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
