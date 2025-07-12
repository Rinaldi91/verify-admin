"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  User,
  Search,
  FlaskConical,
  Save,
  ChevronDown,
  ChevronUp,
  X,
  FileText,
  Calendar,
  Phone,
  MapPin,
  UserPlus,
  Wifi,
  WifiOff,
  RefreshCw,
  Hash,
  Activity,
} from "lucide-react";
import Cookies from "js-cookie";
import { useDevice } from "@/app/contexts/DeviceContext";
import Swal from "sweetalert2";

// --- INTERFACE & TIPE DATA (Beberapa ditambahkan untuk menerima data dari bridge) ---
interface Patient {
  id: number;
  patient_code: string;
  name: string;
  nik: string | null;
  date_of_birth: string | null;
  address: string | null;
  phone_number: string | null;
}

interface LoggedInUser {
  id: number;
  name: string;
}

// --- Komponen Utama ---
export default function ExaminationPage() {
  const { device, isBridgeConnected } = useDevice();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [loggedInUser, setLoggedInUser] = useState<LoggedInUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isPatientListCollapsed, setIsPatientListCollapsed] = useState(false);
  const [isNewPatientFormVisible, setIsNewPatientFormVisible] = useState(false);
  const [newPatientForm, setNewPatientForm] = useState({
    name: "",
    nik: "",
    date_of_birth: "",
    address: "",
    phone_number: "",
  });

  const calculateAge = (dobString: string | null): string => {
    if (!dobString) return "N/A";

    const birthDate = new Date(dobString);
    if (isNaN(birthDate.getTime())) return "Invalid Date";

    const today = new Date();

    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    let days = today.getDate() - birthDate.getDate();

    // Koreksi jika hari atau bulan bernilai negatif
    if (days < 0) {
      months--;
      days += new Date(today.getFullYear(), today.getMonth(), 0).getDate();
    }

    if (months < 0) {
      years--;
      months += 12;
    }

    const yearText = years > 0 ? `${years} Tahun` : "";
    const monthText = months > 0 ? `${months} Bulan` : "";
    const dayText = days > 0 ? `${days} Hari` : "";

    const ageParts = [yearText, monthText, dayText].filter(Boolean);

    return ageParts.length > 0 ? ageParts.join(" ") : "Hari ini";
  };

  const formatDateToIndonesian = (dateString: string | null): string => {
    if (!dateString) return "N/A";
    try {
      // Asumsi input adalah 'YYYY-MM-DD'
      const [year, month, day] = dateString.split("-");
      return `${day}-${month}-${year}`;
    } catch (error) {
      console.error("anonimous error:", error);
      return "Invalid Date";
    }
  };

  // --- STATE BARU: Untuk mendengarkan status koneksi dari Bridge ---

  // --- FUNGSI API (Tidak berubah) ---
  const searchPatients = useCallback(async (term: string) => {
    if (term.length < 2) {
      setPatients([]);
      return;
    }
    setIsLoading(true);
    try {
      const token = Cookies.get("token");
      const response = await fetch(
        `http://verify-api.test/api/patients?search=${encodeURIComponent(
          term
        )}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );
      if (!response.ok) throw new Error("Failed to fetch patient data");
      const result = await response.json();
      if (result && Array.isArray(result.data)) {
        setPatients(result.data);
      } else {
        setPatients([]);
      }
    } catch (error) {
      console.error("Failed to search patients:", error);
      setPatients([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const token = Cookies.get("token");
      const response = await fetch("http://verify-api.test/api/patients", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(newPatientForm),
      });
      const data = await response.json();
      if (response.ok) {
        handleSelectPatient(data.data); // Gunakan handleSelectPatient untuk konsistensi
        setIsNewPatientFormVisible(false);
        setNewPatientForm({
          name: "",
          nik: "",
          date_of_birth: "",
          address: "",
          phone_number: "",
        });
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (error) {
      console.error("Failed to create patient:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveExamination = useCallback(async () => {
    if (
      !selectedPatient ||
      !loggedInUser ||
      !device?.testData?.results?.length
    ) {
      alert("Patient not selected or no results to save.");
      return;
    }

    setIsSaving(true);
    try {
      const token = Cookies.get("token");

      // Tentukan waktu pemeriksaan. Gunakan waktu dari alat jika ada, jika tidak gunakan waktu saat ini.
      const examinationTime = device.testData.date
        ? new Date(device.testData.date)
        : new Date();

      const payload = {
        patient_id: selectedPatient.id,
        user_id: loggedInUser.id,
        sequence_number: device.testData.sequenceNumber,
        serial_number_device: device.testData.serialNumber,
        // Gunakan fungsi helper untuk format waktu lokal yang benar
        examination_datetime: formatDateToLocalMySQL(examinationTime),
        results: device.testData.results.map((r) => ({
          test_code: r.test,
          value: r.value,
          unit: r.unit,
          flag: r.flag || null,
        })),
      };

      const response = await fetch("http://verify-api.test/api/examinations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        Swal.fire({
          title: "Success",
          text: "Examination results saved successfully.",
          icon: "success",
          timer: 2000,
          showConfirmButton: false,
          timerProgressBar: true,
          background: "#1f2937",
          color: "#F9FAFB",
          customClass: {
            popup: "rounded-xl p-6",
          },
        });

        setSelectedPatient(null);
      } else {
        const errorData = await response.json();
        Swal.fire({
          title: "Warning",
          text: `Failed to save: ${errorData.message || "Unknown error"}`,
          icon: "error",
          timer: 5000,
          showConfirmButton: false,
          timerProgressBar: true,
          background: "#1f2937",
          color: "#F9FAFB",
          customClass: {
            popup: "rounded-xl p-6",
          },
        });
      }
    } catch (error) {
      console.error("Failed to save examination:", error);
      Swal.fire({
        title: "Warning",
        text: "Failed to examination test.",
        icon: "error",
        timer: 5000,
        showConfirmButton: false,
        timerProgressBar: true,
        background: "#1f2937",
        color: "#F9FAFB",
        customClass: {
          popup: "rounded-xl p-6",
        },
      });
    } finally {
      setIsSaving(false);
    }
  }, [selectedPatient, loggedInUser, device]);

  useEffect(() => {
    const fetchAndSetUser = async () => {
      let user: LoggedInUser | null = null;

      // 1. Coba ambil dari cookie dulu untuk kecepatan
      const userCookie = Cookies.get("user");
      if (userCookie) {
        try {
          user = JSON.parse(userCookie);
        } catch (e) {
          console.error("Gagal mem-parsing cookie user:", e);
        }
      }

      // 2. Jika dari cookie tidak ada, coba fetch dari API menggunakan token
      if (!user) {
        const token = Cookies.get("token");
        if (token) {
          try {
            const response = await fetch("http://verify-api.test/api/profile", {
              headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/json",
              },
            });
            if (response.ok) {
              const result = await response.json();
              // Asumsi respons API memiliki struktur { data: { id: ..., name: ... } }
              user = result.data;
              // Simpan lagi ke cookie untuk mempercepat load berikutnya
              if (user)
                Cookies.set("user", JSON.stringify(user), { expires: 1 });
            }
          } catch (apiError) {
            console.error("Gagal mengambil profil user dari API:", apiError);
          }
        }
      }

      if (user) {
        setLoggedInUser(user);
      } else {
        console.error(
          "Tidak dapat menentukan pengguna yang login. Silakan coba login ulang."
        );
        // Tampilkan pesan error ke pengguna jika perlu
        Swal.fire(
          "Authentication Error",
          "Could not verify user. Please try logging in again.",
          "error"
        );
      }
    };

    fetchAndSetUser();
  }, []);

  // --- EFEK & HELPER ---

  // Debounce untuk pencarian (Tidak berubah)
  useEffect(() => {
    const handler = setTimeout(() => {
      searchPatients(searchTerm);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm, searchPatients]);

  useEffect(() => {
    // useEffect ini sekarang hanya untuk memuat data user
    const userCookie = Cookies.get("user");
    if (userCookie) setLoggedInUser(JSON.parse(userCookie));
  }, []);

  const handleSelectPatient = useCallback((patient: Patient) => {
    setSelectedPatient(patient);
    setSearchTerm("");
    setPatients([]);
    setIsPatientListCollapsed(true);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header Utama Halaman */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <FileText className="w-6 h-6" />
          Examination
        </h1>
        <p className="text-gray-400 mt-1">
          Register patient and record examination results from the instrument.
        </p>
      </div>

      {/* Indikator Koneksi Bridge di Halaman Ini */}
      <div
        className={`flex items-center gap-2 p-2 rounded-lg text-sm border ${
          isBridgeConnected
            ? "bg-green-900/20 text-green-300 border-green-700"
            : "bg-red-900/20 text-red-300 border-red-700"
        }`}
      >
        {isBridgeConnected ? (
          <Wifi className="w-4 h-4" />
        ) : (
          <WifiOff className="w-4 h-4" />
        )}
        <span>
          {isBridgeConnected
            ? "Successfully connected to Bridge Server."
            : "Bridge connection offline."}
        </span>
      </div>

      {/* --- BAGIAN 1: MANAJEMEN PASIEN (UI Tidak Berubah) --- */}
      <div className="bg-gray-900 rounded-lg border border-gray-800">
        <div
          className="p-4 flex justify-between items-center cursor-pointer"
          onClick={() => setIsPatientListCollapsed(!isPatientListCollapsed)}
        >
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <User className="w-5 h-5 text-sky-400" />
            Patient Selection
          </h2>
          {isPatientListCollapsed ? (
            <ChevronDown className="text-gray-400" />
          ) : (
            <ChevronUp className="text-gray-400" />
          )}
        </div>

        {!isPatientListCollapsed && (
          <div className="p-4 border-t border-gray-800 space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search patient by name, NIK, or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-700 rounded-lg focus:ring-2 focus:ring-sky-500 bg-gray-800 text-white"
              />
            </div>

            {/* Hasil Pencarian */}
            {isLoading && (
              <p className="text-center text-gray-400">Searching...</p>
            )}
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {patients.map((p) => (
                <div
                  key={p.id}
                  onClick={() => handleSelectPatient(p)}
                  className="p-3 bg-gray-800 hover:bg-sky-900/50 rounded-lg cursor-pointer flex justify-between items-center"
                >
                  <div>
                    <p className="font-medium text-white">{p.name}</p>
                    <p className="text-sm text-gray-400">
                      Code: {p.patient_code} | NIK: {p.nik || "N/A"}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Tombol untuk mendaftarkan pasien baru */}
            <div className="text-center pt-2">
              <button
                onClick={() =>
                  setIsNewPatientFormVisible(!isNewPatientFormVisible)
                }
                className="text-sky-400 hover:text-sky-300 text-sm font-medium flex items-center gap-2 mx-auto cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                {isNewPatientFormVisible
                  ? "Cancel Registration"
                  : "Register New Patient"}
              </button>
            </div>

            {/* Form Pasien Baru (Versi Modern) */}
            {isNewPatientFormVisible && (
              <form
                onSubmit={handleCreatePatient}
                className="p-4 bg-gray-800/50 rounded-lg space-y-4 mt-4 border border-gray-700 animate-fade-in"
              >
                <h3 className="font-semibold text-white text-lg border-b border-gray-700 pb-3 flex items-center gap-2">
                  <UserPlus className="text-white" />
                  New Patient
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div>
                    <label
                      htmlFor="name"
                      className="block text-sm font-medium text-gray-300 mb-1"
                    >
                      Full Name
                    </label>
                    <input
                      id="name"
                      type="text"
                      placeholder="e.g., Jhon Doe"
                      value={newPatientForm.name}
                      onChange={(e) =>
                        setNewPatientForm({
                          ...newPatientForm,
                          name: e.target.value,
                        })
                      }
                      required
                      className="w-full px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  {/* NIK */}
                  <div>
                    <label
                      htmlFor="nik"
                      className="block text-sm font-medium text-gray-300 mb-1"
                    >
                      NIK
                    </label>
                    <input
                      id="nik"
                      type="text"
                      placeholder="16-digit National ID"
                      value={newPatientForm.nik}
                      onChange={(e) =>
                        setNewPatientForm({
                          ...newPatientForm,
                          nik: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  {/* Date of Birth */}
                  <div>
                    <label
                      htmlFor="dob"
                      className="block text-sm font-medium text-gray-300 mb-1"
                    >
                      Date of Birth
                    </label>
                    <input
                      id="dob"
                      type="date"
                      value={newPatientForm.date_of_birth}
                      onChange={(e) =>
                        setNewPatientForm({
                          ...newPatientForm,
                          date_of_birth: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  {/* Phone Number */}
                  <div>
                    <label
                      htmlFor="phone"
                      className="block text-sm font-medium text-gray-300 mb-1"
                    >
                      Phone Number
                    </label>
                    <input
                      id="phone"
                      type="tel"
                      placeholder="e.g., 08123456789"
                      value={newPatientForm.phone_number}
                      onChange={(e) =>
                        setNewPatientForm({
                          ...newPatientForm,
                          phone_number: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  {/* Address */}
                  <div className="md:col-span-2">
                    <label
                      htmlFor="address"
                      className="block text-sm font-medium text-gray-300 mb-1"
                    >
                      Address
                    </label>
                    <textarea
                      id="address"
                      placeholder="Full address"
                      value={newPatientForm.address}
                      onChange={(e) =>
                        setNewPatientForm({
                          ...newPatientForm,
                          address: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-sky-500 resize-y"
                      rows={3}
                    ></textarea>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full flex justify-center items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-4 rounded-lg disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save and Select Patient</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      {/* --- BAGIAN 2: FORM PEMERIKSAAN --- */}
      <div className="bg-gray-900 p-6 rounded-lg border border-gray-800 space-y-6">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <FlaskConical className="w-5 h-5 text-emerald-400" />
          Examination
        </h2>

        {/* Detail Pasien Terpilih (UI Tidak Berubah) */}
        {selectedPatient ? (
          <div className="bg-gray-800 p-4 rounded-lg relative animate-fade-in border border-gray-700">
            <button
              onClick={() => setSelectedPatient(null)}
              className="absolute top-3 right-3 text-gray-500 hover:text-white transition-colors"
              title="Deselect Patient"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Bagian Nama dan Umur */}
            <div className="flex items-center gap-4 mb-3">
              <div className="flex-shrink-0 bg-sky-500/20 p-3 rounded-full">
                <User className="w-6 h-6 text-sky-400" />
              </div>
              <div>
                <h3 className="font-bold text-white text-xl">
                  {selectedPatient.name}
                </h3>
                <p className="font-semibold text-sky-300 text-sm">
                  {calculateAge(selectedPatient.date_of_birth)}
                </p>
              </div>
            </div>

            <hr className="border-gray-700" />

            {/* Bagian Detail Lainnya */}
            <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div className="flex flex-col">
                <dt className="text-gray-400 font-medium flex items-center gap-2">
                  <FileText size={14} /> Patient Code
                </dt>
                <dd className="text-gray-200 font-semibold ml-6">
                  {selectedPatient.patient_code}
                </dd>
              </div>
              <div className="flex flex-col">
                <dt className="text-gray-400 font-medium flex items-center gap-2">
                  <FileText size={14} /> NIK
                </dt>
                <dd className="text-gray-200 font-semibold ml-6">
                  {selectedPatient.nik || "N/A"}
                </dd>
              </div>
              <div className="flex flex-col">
                <dt className="text-gray-400 font-medium flex items-center gap-2">
                  <Calendar size={14} /> Date of Birth
                </dt>
                <dd className="text-gray-200 font-semibold ml-6">
                  {formatDateToIndonesian(selectedPatient.date_of_birth)}
                </dd>
              </div>
              <div className="flex flex-col">
                <dt className="text-gray-400 font-medium flex items-center gap-2">
                  <Phone size={14} /> Phone
                </dt>
                <dd className="text-gray-200 font-semibold ml-6">
                  {selectedPatient.phone_number || "N/A"}
                </dd>
              </div>
              <div className="flex flex-col sm:col-span-2">
                <dt className="text-gray-400 font-medium flex items-center gap-2">
                  <MapPin size={14} /> Address
                </dt>
                <dd className="text-gray-200 font-semibold ml-6">
                  {selectedPatient.address || "N/A"}
                </dd>
              </div>
            </dl>
          </div>
        ) : (
          <div className="text-center py-10 border-2 border-dashed border-gray-700 rounded-lg">
            <FlaskConical className="mx-auto h-12 w-12 text-gray-600" />
            <p className="mt-2 text-gray-400">
              Please select a patient to begin the examination.
            </p>
          </div>
        )}

        {/* --- PERBAIKAN: Hasil Pemeriksaan dari Alat (Tombol Simulate Dihapus) --- */}
        {selectedPatient && (
          <div className="space-y-4">
            <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-400" />
              <span>Instrument Results</span>
            </h3>

            {/* Menampilkan Detail dan Hasil Tes Jika Ada */}
            {device?.testData ? (
              <div className="bg-gray-800 p-4 rounded-lg animate-fade-in">
                <h3 className="font-semibold text-gray-200 mb-4 text-lg">
                  Last Test Details
                </h3>
                {/* Metadata */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4 text-sm">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-gray-400">Date & Time</p>
                      <p className="font-medium text-white">
                        {device.testData.date || "N/A"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-gray-400">Operator</p>
                      <p className="font-medium text-white">
                        {device.testData.operator || "N/A"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Hash className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-gray-500">Seq. No.</p>
                      <p className="font-medium text-white">
                        {device.testData.sequenceNumber || "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
                <hr className="my-4 border-gray-700" />

                {/* Results Table */}
                <h4 className="font-semibold text-gray-200 mb-2">Results</h4>
                <div className="space-y-1 text-sm max-h-auto overflow-y-auto">
                  <div className="grid grid-cols-3 gap-4 font-bold text-gray-400 px-2">
                    <span>Test</span>
                    <span>Result</span>
                    <span>Unit</span>
                  </div>
                  {device.testData.results.map((res, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-3 gap-4 p-2 rounded-md even:bg-gray-900/50"
                    >
                      <span className="text-gray-300">{res.test}</span>
                      <span className="font-semibold text-white">
                        {res.value}
                      </span>
                      <span className="text-gray-400">{res.unit}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              // Tampilan jika belum ada data tes
              <div className="bg-gray-800 p-4 rounded-lg text-center text-gray-500 min-h-[150px] flex items-center justify-center">
                {isBridgeConnected && device?.status === "connected"
                  ? "Ready. Perform a test on the U120 device."
                  : "Device not connected. Please connect from the Connection Settings page."}
              </div>
            )}
          </div>
        )}

        {/* Tombol Aksi untuk Menyimpan (UI Tidak Berubah) */}
        {selectedPatient && device?.testData && (
          <div className="flex justify-end pt-4 border-t border-gray-800">
            <button
              onClick={handleSaveExamination}
              disabled={isSaving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              {isSaving ? "Saving..." : "Save Examination"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
const formatDateToLocalMySQL = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const seconds = date.getSeconds().toString().padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};
