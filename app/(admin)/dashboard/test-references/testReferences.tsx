"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  BookText,
  Search,
  PlusCircle,
  Edit,
  Trash2,
  X,
  Save,
} from "lucide-react";
import Cookies from "js-cookie";
import Swal from "sweetalert2";
import * as Dialog from "@radix-ui/react-dialog";

// --- Interface & Tipe Data ---
interface TestReference {
  id: number;
  test_code: string;
  value_descriptor: string | null;
  lower_bound: string | null;
  upper_bound: string | null;
  interpretation: string;
  notes: string | null;
}

// Tipe untuk data form, semua bisa string untuk kemudahan input
interface FormReference {
  id?: number;
  test_code: string;
  value_descriptor: string;
  lower_bound: string;
  upper_bound: string;
  interpretation: string;
  notes: string;
}

// --- Komponen Utama ---
export default function TestReferencePage() {
  // --- State Management ---
  const [references, setReferences] = useState<TestReference[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<FormReference>({
    test_code: "",
    value_descriptor: "",
    lower_bound: "",
    upper_bound: "",
    interpretation: "",
    notes: "",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const getPaginationNumbers = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];
    let l;

    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i);
    }

    if (range.length > 0) {
      if (range[0] > 2) {
        rangeWithDots.push("...");
      }
    }

    rangeWithDots.push(...range);

    if (range.length > 0) {
      if (range[range.length - 1] < totalPages - 1) {
        rangeWithDots.push("...");
      }
    }

    // Selalu sertakan halaman pertama dan terakhir jika ada
    const finalRange = [1, ...rangeWithDots];
    if (totalPages > 1) {
      finalRange.push(totalPages);
    }

    // Hapus duplikat dan urutkan
    return [...new Set(finalRange)];
  };

  // --- Fungsi API ---
  const fetchReferences = useCallback(
    async (page: number = 1, search: string = "") => {
      setLoading(true);
      try {
        const token = Cookies.get("token");
        const params = new URLSearchParams({ page: page.toString() });
        if (search) params.append("search", search);

        const res = await fetch(
          `http://verify-api.test/api/test-references?${params.toString()}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (!res.ok) throw new Error("Failed to fetch data");

        const json = await res.json();
        setReferences(json.data || []);
        setTotalPages(json.meta?.last_page || 1);
        setTotalItems(json.meta?.total || 0);
        setCurrentPage(json.meta?.current_page || 1);
      } catch (error) {
        console.error("Error fetching test references:", error);
        setReferences([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      fetchReferences(1, searchTerm);
    }, 400);
  }, [searchTerm, fetchReferences]);

  useEffect(() => {
    fetchReferences(currentPage, searchTerm);
  }, [currentPage, fetchReferences]);

  // --- Fungsi Handler untuk Form & Aksi ---
  const handleAdd = () => {
    setFormData({
      test_code: "",
      value_descriptor: "",
      lower_bound: "",
      upper_bound: "",
      interpretation: "",
      notes: "",
    });
    setIsModalOpen(true);
  };

  const handleEdit = (ref: TestReference) => {
    setFormData({
      id: ref.id,
      test_code: ref.test_code || "",
      value_descriptor: ref.value_descriptor || "",
      lower_bound: ref.lower_bound || "",
      upper_bound: ref.upper_bound || "",
      interpretation: ref.interpretation || "",
      notes: ref.notes || "",
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = Cookies.get("token");
    const method = formData.id ? "PUT" : "POST";
    const url = formData.id
      ? `http://verify-api.test/api/test-references/${formData.id}`
      : "http://verify-api.test/api/test-references";

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
          background: "#1f2937",
          color: "#F9FAFB",
        });
        setIsModalOpen(false);
        fetchReferences(currentPage, searchTerm);
      } else {
        const errors = Object.values(result.errors || {})
          .flat()
          .join("<br>");
        Swal.fire({
          title: "Error!",
          html: errors || result.message,
          icon: "error",
          background: "#1f2937",
          color: "#F9FAFB",
        });
      }
    } catch (error) {
      Swal.fire({
        title: "Error!",
        text: "An unexpected error occurred.",
        icon: "error",
        background: "#1f2937",
        color: "#F9FAFB",
      });
    }
  };

  const handleDelete = async (id: number) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
      background: "#111827",
      color: "#F9FAFB",
    });

    if (result.isConfirmed) {
      try {
        const token = Cookies.get("token");
        if (!token) {
          throw new Error("Token not found");
        }
        const referencesToDelete = references.find((ref) => ref.id === id);
        if (!references) {
            throw new Error("Reference not found");
        }
        const res = await fetch(`http://verify-api.test/api/test-references/${referencesToDelete}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });

        if (res.ok) {
          fetchReferences(currentPage, searchTerm);
          Swal.fire({
            title: "Deleted!",
            text: "Reference data has been deleted.",
            icon: "success",
            timer: 2000,
            showConfirmButton: false,
            background: "#1f2937",
            color: "#F9FAFB",
          });
        } else {
          const errorData = await res.json();
         Swal.fire({
            title: "Error!",
            text: "Failed to delete reference.",
            icon: "error",
            background: "#1f2937",
            color: "#F9FAFB",
          });
        }
      } catch (error) {
        console.error("Error deleting test reference:", error);
        Swal.fire({
          title: "Error!",
          text: "An unexpected error occurred.",
          icon: "error",
          background: "#1f2937",
          color: "#F9FAFB",
        });
      }
    }
  };

//   const handleDelete = async (id: number) => {
//     const result = await Swal.fire({
//       title: "Are you sure?",
//       text: "You won't be able to revert this!",
//       icon: "warning",
//       showCancelButton: true,
//       confirmButtonColor: "#d33",
//       confirmButtonText: "Yes, delete it!",
//       background: "#111827",
//       color: "#F9FAFB",
//     });

//     if (result.isConfirmed) {
//       try {
//         const token = Cookies.get("token");
//         const res = await fetch(
//           `http://verify-api.test/api/test-references/${formData.id}`,
//           {
//             method: "DELETE",
//             headers: {
//               Authorization: `Bearer ${token}`,
//               Accept: "application/json",
//             },
//           }
//         );
//         const json = await res.json();
//         if (!res.ok) {
//           throw new Error(json.message || "Failed to delete reference");
//         }
//         if (res.ok) {
//           Swal.fire({
//             title: "Deleted!",
//             text: "Reference data has been deleted.",
//             icon: "success",
//             timer: 2000,
//             showConfirmButton: false,
//             background: "#1f2937",
//             color: "#F9FAFB",
//           });
//           fetchReferences(currentPage, searchTerm);
//         } else {
//           Swal.fire({
//             title: "Error!",
//             text: "Failed to delete reference.",
//             icon: "error",
//             background: "#1f2937",
//             color: "#F9FAFB",
//           });
//         }
//       } catch (error) {
//         Swal.fire({
//           title: "Error!",
//           text: "An unexpected error occurred.",
//           icon: "error",
//           background: "#1f2937",
//           color: "#F9FAFB",
//         });
//       }
//     }
//   };

  // --- RENDER ---
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="text-white">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookText className="w-6 h-6" /> Test References
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Manage reference ranges for test results interpretation.
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
        >
          <PlusCircle className="w-5 h-5 mr-2" /> Add New Reference
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-gray-900 p-4 rounded-lg">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by test code or interpretation..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-800 rounded-lg bg-gray-800 text-white focus:ring-2 focus:ring-sky-500"
          />
        </div>
      </div>

      {/* Tabel Data Referensi */}
      <div className="bg-gray-900 rounded-lg overflow-x-auto">
        <table className="w-full min-w-max">
          <thead className="bg-gray-800 text-white">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase">
                Test Code
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase">
                Value / Range
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase">
                Interpretation
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {loading ? (
              <tr>
                <td colSpan={4} className="text-center py-10 text-gray-400">
                  Loading...
                </td>
              </tr>
            ) : references.length > 0 ? (
              references.map((ref, index) => (
                <tr key={index} className="hover:bg-gray-800">
                  <td className="px-6 py-4 text-sm font-medium text-sky-400">
                    <code>{ref.test_code}</code>
                  </td>
                  <td className="px-6 py-4 text-sm text-white">
                    {ref.value_descriptor ||
                      `${ref.lower_bound || "?"} - ${ref.upper_bound || "?"}`}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300">
                    {ref.interpretation}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleEdit(ref)}
                        className="text-green-400 hover:text-green-300"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(ref.id)}
                        className="text-red-400 hover:text-red-300"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="text-center py-10 text-gray-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <BookText className="w-12 h-12 text-gray-700" />
                    <span>No reference data found.</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-6 text-sm text-gray-400">
          {/* Informasi jumlah data */}
          <div>
            Showing{" "}
            <span className="font-bold text-white">
              {(currentPage - 1) * 15 + 1}
            </span>{" "}
            to{" "}
            <span className="font-bold text-white">
              {Math.min(currentPage * 15, totalItems)}
            </span>{" "}
            of <span className="font-bold text-white">{totalItems}</span>{" "}
            results
          </div>

          {/* Tombol Navigasi Halaman */}
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="cursor-pointer px-3 py-2 border border-gray-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 text-gray-300 transition-colors"
            >
              Previous
            </button>

            {getPaginationNumbers().map((page, index) => (
              <div key={index}>
                {page === "..." ? (
                  <span className="px-3 py-2 text-gray-500">...</span>
                ) : (
                  <button
                    onClick={() => setCurrentPage(page as number)}
                    className={`px-4 py-2 border rounded-md transition-colors cursor-pointer ${
                      currentPage === page
                        ? "bg-blue-600 text-white border-blue-600"
                        : "border-gray-600 text-gray-300 hover:bg-gray-700"
                    }`}
                  >
                    {page}
                  </button>
                )}
              </div>
            ))}

            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="cursor-pointer px-3 py-2 border border-gray-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 text-gray-300 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Modal untuk Tambah/Edit Referensi */}
      <Dialog.Root open={isModalOpen} onOpenChange={setIsModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-800 text-white rounded-lg w-[90%] max-w-2xl">
            <form onSubmit={handleSubmit}>
              <div className="px-6 py-4 flex justify-between items-center border-b border-gray-700">
                <Dialog.Title className="text-lg font-semibold">
                  {formData.id ? "Edit Reference" : "Add New Reference"}
                </Dialog.Title>
                <Dialog.Close asChild>
                  <button className="text-gray-400 hover:text-white">
                    <X />
                  </button>
                </Dialog.Close>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Test Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., LEU, PH, SG"
                    value={formData.test_code}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        test_code: e.target.value.toUpperCase(),
                      })
                    }
                    required
                    className="w-full px-3 py-2 rounded bg-gray-700 border border-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Interpretation
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Normal, High, Abnormal"
                    value={formData.interpretation}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        interpretation: e.target.value,
                      })
                    }
                    required
                    className="w-full px-3 py-2 rounded bg-gray-700 border border-gray-600"
                  />
                </div>
                <div className="md:col-span-2">
                  <p className="text-xs text-center text-gray-400 border-t border-b border-gray-700 py-1">
                    Fill either qualitative value OR quantitative range
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Value Descriptor (Qualitative)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., neg, +-, 1+, 2+"
                    value={formData.value_descriptor}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        value_descriptor: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded bg-gray-700 border border-gray-600"
                  />
                </div>
                <div />
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Lower Bound (Quantitative)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., 5.0"
                    value={formData.lower_bound}
                    onChange={(e) =>
                      setFormData({ ...formData, lower_bound: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded bg-gray-700 border border-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Upper Bound (Quantitative)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., 7.5"
                    value={formData.upper_bound}
                    onChange={(e) =>
                      setFormData({ ...formData, upper_bound: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded bg-gray-700 border border-gray-600"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    rows={2}
                    className="w-full px-3 py-2 rounded bg-gray-700 border border-gray-600 resize-none"
                  ></textarea>
                </div>
              </div>
              <div className="px-6 py-4 flex justify-end gap-2 bg-gray-700">
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="px-4 py-2 rounded bg-gray-600 hover:bg-gray-500"
                  >
                    Cancel
                  </button>
                </Dialog.Close>
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" /> {formData.id ? "Update" : "Save"}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
