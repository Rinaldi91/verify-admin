"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  User,
  Search,
  PlusCircle,
  Edit,
  Trash2,
  X,
  Save,
  Pencil,
  Plus,
} from "lucide-react";
import Cookies from "js-cookie";
import Swal from "sweetalert2";
import * as Dialog from "@radix-ui/react-dialog";
import { useRouter, useSearchParams } from "next/navigation";

// --- Interface & Tipe Data ---
interface Patient {
  id: number;
  patient_code: string;
  name: string;
  nik: string | null;
  date_of_birth: string | null;
  address: string | null;
  phone_number: string | null;
  updated_at: string;
}

interface FormPatient {
  id?: number;
  name: string;
  nik: string;
  date_of_birth: string;
  address: string;
  phone_number: string;
}

// --- Komponen Utama ---
export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const searchParams = useSearchParams();
  const initialSearch = searchParams?.get("search") || "";
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPatients, setTotalPatients] = useState(0);
  const [permissions, setPermissions] = useState<string[]>([]);
  const router = useRouter();
  const hasPermission = (permission: string) => {
    return permissions.includes(permission);
  };
  const [formData, setFormData] = useState<FormPatient>({
    name: "",
    nik: "",
    date_of_birth: "",
    address: "",
    phone_number: "",
  });

  useEffect(() => {
    fetchPatients();
  }, []);

  useEffect(() => {
    const stored = Cookies.get("permissions");
    if (stored) {
      setPermissions(JSON.parse(stored));
    }
  }, []);

  // --- Fungsi API ---
  const fetchPatients = useCallback(
    async (page: number = 1, search: string = "") => {
      setLoading(true);
      try {
        const token = Cookies.get("token");
        const params = new URLSearchParams({ page: page.toString() });
        if (search) params.append("search", search);

        const res = await fetch(
          `http://verify-api.test/api/patients?${params.toString()}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (!res.ok) throw new Error("Failed to fetch data");

        const json = await res.json();
        setPatients(json.data || []);
        setTotalPages(json.meta?.last_page || 1);
        setTotalPatients(json.meta?.total || 0);
        setCurrentPage(json.meta?.current_page || 1);
      } catch (error) {
        console.error("Error fetching patients:", error);
        setPatients([]);
      } finally {
        setLoading(false);
      }
    },
    [setPatients, setLoading, setTotalPages, setTotalPatients, setCurrentPage, setPermissions]
  );

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (searchTerm.length === 0 || searchTerm.length >= 3) {
        fetchPatients(1, searchTerm);

        const params = new URLSearchParams();
        if (searchTerm) params.set("search", searchTerm);
        else params.delete("search");

        router.replace(`/dashboard/patients?${params.toString()}`);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchTerm, router, fetchPatients]);

  useEffect(() => {
    if (initialSearch.length === 0 || initialSearch.length >= 3) {
      fetchPatients(1, initialSearch);
    }
  }, [initialSearch, fetchPatients]);

  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    } else {
      fetchPatients(currentPage, searchTerm);
    }
  }, [currentPage, searchTerm, fetchPatients]);

  // --- Fungsi Handler untuk Form & Aksi ---
  const handleAdd = () => {
    setFormData({
      name: "",
      nik: "",
      date_of_birth: "",
      address: "",
      phone_number: "",
    });
    setIsModalOpen(true);
  };

  const handleEdit = (patient: Patient) => {
    setFormData({
      id: patient.id,
      name: patient.name || "",
      nik: patient.nik || "",
      date_of_birth: patient.date_of_birth || "",
      address: patient.address || "",
      phone_number: patient.phone_number || "",
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = Cookies.get("token");
    const method = formData.id ? "PUT" : "POST";
    const url = formData.id
      ? `http://verify-api.test/api/patients/${formData.id}`
      : "http://verify-api.test/api/patients";

    try {
      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      if (response.ok) {
        Swal.fire({
          title: "Success!",
          text: result.message,
          icon: "success",
          timer: 2000,
          showConfirmButton: false,
        });
        setIsModalOpen(false);
        fetchPatients(currentPage, searchTerm); // Refresh data
      } else {
        const errors = Object.values(result.errors || {})
          .flat()
          .join("<br>");
        Swal.fire("Error!", errors || result.message, "error");
      }
      // --- PERBAIKAN 2: Menggunakan '_error' untuk menandai variabel tidak terpakai ---
    } catch (_error) {
      Swal.fire("Error!", "An unexpected error occurred.", "error");
    }
  };

  const handleDelete = async (id: number) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
      background: "#111827",
      color: "#F9FAFB",
    });

    if (result.isConfirmed) {
      try {
        const token = Cookies.get("token");
        const response = await fetch(
          `http://verify-api.test/api/patients/${id}`,
          {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (response.ok) {
          Swal.fire("Deleted!", "Patient data has been deleted.", "success");
          fetchPatients(currentPage, searchTerm);
        } else {
          Swal.fire("Error!", "Failed to delete patient.", "error");
        }
        // --- PERBAIKAN 3: Menggunakan '_error' untuk menandai variabel tidak terpakai ---
      } catch (_error) {
        Swal.fire("Error!", "An unexpected error occurred.", "error");
      }
    }
  };

  const handleMultiDelete = async () => {
    if (selectedItems.size === 0) return;

    const confirmed = await Swal.fire({
      title: "Delete Selected Patients?",
      html: `You are about to delete <strong>${selectedItems.size}</strong> patients. This action cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete all!",
      background: "#111827",
      color: "#F9FAFB",
    });

    if (!confirmed.isConfirmed) return;

    setIsDeleting(true);
    try {
      const token = Cookies.get("token");
      const ids = Array.from(selectedItems);
      await Promise.all(
        ids.map((id) =>
          fetch(`http://verify-api.test/api/patients/${id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          })
        )
      );
      Swal.fire(
        "Success",
        "Selected patients deleted successfully.",
        "success"
      );
      setSelectedItems(new Set());
      fetchPatients(currentPage, searchTerm);
    } catch (error) {
      console.error(error);
      Swal.fire("Error", "Failed to delete selected patients.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSelectItem = (id: number, checked: boolean) => {
    const newSelected = new Set(selectedItems);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedItems(newSelected);
  };

  const isAllSelected =
    patients.length > 0 && patients.every((pat) => selectedItems.has(pat.id));
  const isIndeterminate = selectedItems.size > 0 && !isAllSelected;

  // --- RENDER ---
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="text-white">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <User className="w-6 h-6" /> Patient Management
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Management all patient data.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedItems.size > 0 && hasPermission("delete-patient") && (
            <button
              onClick={handleMultiDelete}
              disabled={isDeleting}
              className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 cursor-pointer"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {isDeleting
                ? "Deleting..."
                : `Delete ${selectedItems.size} Selected`}
            </button>
          )}

          {hasPermission("create-patient") && (
            <button
              onClick={handleAdd}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
            >
              <PlusCircle className="w-5 h-5 mr-2" /> Add New Patient
            </button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-gray-900 p-4 rounded-lg">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search patient by name, NIK, or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-800 rounded-lg bg-gray-800 text-white focus:ring-2 focus:ring-sky-500"
          />
          {searchTerm && (
            <X
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 cursor-pointer hover:text-white"
              onClick={() => setSearchTerm("")}
            />
          )}
        </div>
      </div>

      {/* Tabel Data Pasien */}
      {selectedItems.size > 0 && (
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3 text-blue-300 text-sm">
          {selectedItems.size} patient(s) selected
          <button
            onClick={() => setSelectedItems(new Set())}
            className="ml-2 underline hover:text-blue-200 cursor-pointer"
          >
            Clear
          </button>
        </div>
      )}

      <div className="bg-gray-900 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-800 text-white">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={
                      patients.length > 0 &&
                      patients.every((p) => selectedItems.has(p.id))
                    }
                    ref={(el) => {
                      if (el)
                        el.indeterminate =
                          selectedItems.size > 0 &&
                          selectedItems.size < patients.length;
                    }}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setSelectedItems(
                        checked ? new Set(patients.map((p) => p.id)) : new Set()
                      );
                    }}
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase">
                  No
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase">
                  Patient Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase">
                  NIK
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase">
                  Phone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase">
                  Last Updated
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {patients.map((patient, index) => (
                <tr key={patient.id} className="hover:bg-gray-800">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedItems.has(patient.id)}
                      onChange={(e) => {
                        const newSet = new Set(selectedItems);
                        if (e.target.checked) newSet.add(patient.id);
                        else newSet.delete(patient.id);
                        setSelectedItems(newSet);
                      }}
                      className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                    />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300">
                    {(currentPage - 1) * 10 + index + 1}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300">
                    <code>{patient.patient_code}</code>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-white">
                    {patient.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300">
                    {patient.nik || "-"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300">
                    {patient.phone_number || "-"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300">
                    {new Date(patient.updated_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleEdit(patient)}
                        className="text-green-400 hover:text-green-300 cursor-pointer"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(patient.id)}
                        className="text-red-400 hover:text-red-300 cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {patients.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="flex flex-col items-center justify-center gap-2">
              <User className="w-12 h-12 text-gray-700" />
              <span>No patient data found.</span>
            </div>
            <div className="text-gray-500 text-sm">
              {searchTerm
                ? "Try adjusting your search criteria"
                : "No users available"}
            </div>
          </div>
        )}
        {loading && (
          <div className="flex flex-col items-center justify-center min-h-[40vh] bg-gray-900 rounded-lg">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
            <p className="mt-4 text-gray-400">Loading users...</p>
          </div>
        )}

        
      </div>

      {/* Pagination (jika ada) */}
      {totalPatients > 10 && (
        <div className="flex justify-between items-center text-sm text-gray-400">
          <p>
            Showing {(currentPage - 1) * 10 + 1} to{" "}
            {Math.min(currentPage * 10, totalPatients)} of {totalPatients}{" "}
            results
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-gray-600 rounded disabled:opacity-50"
            >
              Prev
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-gray-600 rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Modal untuk Tambah/Edit Pasien */}
      <Dialog.Root
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        modal={true}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" />
          {/* <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-800 text-white rounded-lg w-[90%] max-w-2xl"> */}
          <Dialog.Content
            onPointerDownOutside={(e) => e.preventDefault()}
            onEscapeKeyDown={(e) => e.preventDefault()}
            className="fixed top-1/2 left-1/2 bg-gray-800 text-white rounded-lg w-[95%] md:w-[900px] lg:w-[1000px] -translate-x-1/2 -translate-y-1/2 max-h-[90vh] overflow-y-auto z-50"
          >
            <div className="bg-blue-600 px-6 py-4 flex items-center gap-2 rounded-t-lg">
              {formData.id ? (
                <>
                  <Pencil className="w-5 h-5 text-white" />
                  <Dialog.Title className="text-lg font-semibold text-white">
                    Edit Patient
                  </Dialog.Title>
                </>
              ) : (
                <>
                  <PlusCircle className="w-5 h-5 text-white" />
                  <Dialog.Title className="text-lg font-semibold text-white">
                    Add Patient
                  </Dialog.Title>
                </>
              )}
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g., John Doe"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                  className="w-full px-3 py-2 rounded bg-gray-700 border border-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">NIK</label>
                <input
                  type="text"
                  placeholder="16-digit National ID"
                  value={formData.nik}
                  onChange={(e) =>
                    setFormData({ ...formData, nik: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded bg-gray-700 border border-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      date_of_birth: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded bg-gray-700 border border-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="e.g., 081234567890"
                  value={formData.phone_number}
                  onChange={(e) =>
                    setFormData({ ...formData, phone_number: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded bg-gray-700 border border-gray-600"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">
                  Address
                </label>
                <textarea
                  placeholder="Full address"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  rows={3}
                  className="w-full px-3 py-2 rounded bg-gray-700 border border-gray-600 resize-none"
                ></textarea>
              </div>
            </div>
            <div className="px-6 py-4 flex justify-end gap-2 bg-gray-700">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="px-4 py-2 rounded bg-gray-600 hover:bg-gray-500 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <X className="w-4 h-4" />
                    Cancel
                  </div>
                </button>
              </Dialog.Close>
              <button
                onClick={handleSubmit}
                type="submit"
                className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 flex items-center gap-2 cursor-pointer"
              >
                {formData.id ? (
                  <>
                    <Save className="w-4 h-4" />
                    Update
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Create
                  </>
                )}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
