"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  BookOpen,
  Search,
  Eye,
  X,
  FlaskConical,
  User,
  Calendar,
  Hash,
  Printer,
  Download,
  FileText,
  RefreshCw,
} from "lucide-react";
import Cookies from "js-cookie";
import * as Dialog from "@radix-ui/react-dialog";
import Swal from "sweetalert2";

// --- Interface & Tipe Data ---
interface Patient {
  id: number;
  name: string;
}
interface Operator {
  id: number;
  name: string;
}
interface TestResult {
  test_code: string;
  value: string;
  unit: string | null;
  flag: string | null;
  interpretation: string;
  reference_range: string;
}
interface Examination {
  id: number;
  patient: Patient;
  operator: Operator;
  sequence_number: string;
  examination_datetime: string;
  results: TestResult[];
}

// --- Komponen Utama ---
export default function ExaminationResultsPage() {
  // --- State Management ---
  const [examinations, setExaminations] = useState<Examination[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedExamination, setSelectedExamination] =
    useState<Examination | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Print States
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printLoading, setPrintLoading] = useState(false);

  // Ganti fungsi lama dengan versi baru yang lebih andal ini
  const getPaginationNumbers = () => {
    if (totalPages <= 1) {
      return [];
    }

    const delta = 1;
    const left = currentPage - delta;
    const right = currentPage + delta;
    const range = [];
    const rangeWithDots: (number | string)[] = [];

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= left && i <= right)) {
        range.push(i);
      }
    }

    let last: number | undefined;
    for (const num of range) {
      if (last) {
        if (num - last > 1) {
          rangeWithDots.push("...");
        }
      }
      rangeWithDots.push(num);
      last = num;
    }

    return rangeWithDots;
  };

  // --- Fungsi API ---
  const fetchExaminations = useCallback(
    async (page: number = 1, search: string = "") => {
      setLoading(true);
      try {
        const token = Cookies.get("token");
        const params = new URLSearchParams({ page: page.toString() });
        if (search) params.append("search", search);

        const res = await fetch(
          `http://verify-api.test/api/examinations?${params.toString()}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (!res.ok) throw new Error("Failed to fetch data");

        const json = await res.json();
        setExaminations(json.data || []);
        setTotalPages(json.meta?.last_page || 1);
        setTotalItems(json.meta?.total || 0);
        setCurrentPage(json.meta?.current_page || 1);
      } catch (error) {
        console.error("Error fetching examinations:", error);
        setExaminations([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      fetchExaminations(1, searchTerm);
    }, 400);
  }, [searchTerm, fetchExaminations]);

  useEffect(() => {
    fetchExaminations(currentPage, searchTerm);
  }, [currentPage, fetchExaminations]);

  // --- Fungsi Helper ---
  const handleViewDetails = async (exam: Examination) => {
    setIsModalOpen(true);
    setSelectedExamination(null);
    setLoading(true);

    try {
      const token = Cookies.get("token");
      const response = await fetch(
        `http://verify-api.test/api/examinations/${exam.id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) throw new Error("Failed to fetch details");

      const result = await response.json();
      if (result.data) {
        setSelectedExamination(result.data);
      }
    } catch (error) {
      console.error("Error fetching examination details:", error);
      setIsModalOpen(false);
      Swal.fire({
        title: "Error",
        text: "Failed to load examination details.",
        icon: "error",
        background: "#1f2937",
        color: "#F9FAFB",
      });
    } finally {
      setLoading(false);
    }
  };

  const getInterpretationColor = (interpretation: string) => {
    if (!interpretation) return "text-gray-400";
    const lowerCaseInterp = interpretation.toLowerCase();
    if (
      lowerCaseInterp.includes("abnormal") ||
      lowerCaseInterp.includes("positive") ||
      lowerCaseInterp.includes("high")
    ) {
      return "text-red-400";
    }
    if (
      lowerCaseInterp.includes("trace") ||
      lowerCaseInterp.includes("attention")
    ) {
      return "text-yellow-400";
    }
    return "text-green-400";
  };

  // --- Print Functions ---
  const generatePrintHTML = (examination: Examination) => {
  const currentDate = new Date().toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const examDate = new Date(
    examination.examination_datetime
  ).toLocaleString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return `
    <!DOCTYPE html>
    <html lang="id">
      <head>
        <meta charset="UTF-8">
        <title>Hasil Pemeriksaan - LAB-${examination.id}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
          body {
            font-family: 'Inter', Arial, sans-serif;
            margin: 0;
            background-color: #f8fafc;
            color: #334155;
          }
          .page {
            width: 210mm;
            min-height: 297mm;
            padding: 20mm;
            margin: auto;
            background: white;
            box-shadow: 0 0 5px rgba(0, 0, 0, 0.1);
            page-break-after: always;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #3b82f6;
            padding-bottom: 15px;
          }
          .header-logo h1 {
            margin: 0;
            color: #2563eb;
            font-size: 24px;
          }
          .header-logo p {
            margin: 2px 0;
            font-size: 14px;
            color: #64748b;
          }
          .header-info {
            text-align: right;
            font-size: 12px;
            color: #475569;
          }

          /* Info Box */
          .info-box {
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 16px;
            margin: 30px 0;
            background-color: #f1f5f9;
          }

          .info-section {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px 25px;
          }

          .info-item .label {
            font-size: 12px;
            color: #64748b;
            margin-bottom: 2px;
            text-transform: uppercase;
          }

          .info-item .value {
            font-size: 14px;
            font-weight: 600;
            color: #1e293b;
          }

          /* Table */
          .results-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
            font-size: 14px;
          }

          .results-table th, .results-table td {
            padding: 12px 15px;
            text-align: left;
          }

          .results-table thead {
            background-color: #e2e8f0;
            color: #334155;
            font-size: 12px;
            text-transform: uppercase;
          }

          .results-table tbody tr {
            border-bottom: 1px solid #e2e8f0;
          }

          .interpretation-badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 9999px;
            font-weight: 600;
            font-size: 12px;
          }
          .interpretation-normal { background-color: #dcfce7; color: #166534; }
          .interpretation-abnormal { background-color: #fee2e2; color: #991b1b; }
          .interpretation-attention { background-color: #fef3c7; color: #92400e; }
          .interpretation-undefined { background-color: #e5e7eb; color: #4b5563; }

          /* Footer & Signature */
          .footer {
            margin-top: 50px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            font-size: 12px;
            color: #64748b;
          }

          .signature {
            text-align: center;
            margin-top: 40px;
            width: 200px;
          }

          .signature p {
            margin: 0;
            padding: 0;
          }

          .signature .line {
            margin-top: 50px;
            border-top: 1px solid #000;
            font-weight: 600;
            padding-top: 4px;
          }

          @media print {
            body {
              margin: 0;
              background: white;
            }
            .page {
              margin: 0;
              box-shadow: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="header">
            <div class="header-logo">
              <h1>LabResult</h1>
              <p>Laboratorium Klinik Terpadu</p>
              <p>Jl. Sehat No. 123, Medan</p>
              <p>Telp: (061) 1234567</p>
            </div>
            <div class="header-info">
              <strong>Dicetak pada:</strong> ${currentDate}<br>
              <strong>Nomor Lab:</strong> LAB-${examination.id}
            </div>
          </div>

          <div class="info-box">
            <div class="info-section">
              <div class="info-item">
                <p class="label">Nama Pasien</p>
                <p class="value">${examination.patient.name}</p>
              </div>
              <div class="info-item">
                <p class="label">Operator</p>
                <p class="value">${examination.operator?.name || "N/A"}</p>
              </div>
              <div class="info-item">
                <p class="label">Waktu Pemeriksaan</p>
                <p class="value">${examDate}</p>
              </div>
              <div class="info-item">
                <p class="label">Nomor Urut Alat</p>
                <p class="value">${examination.sequence_number}</p>
              </div>
            </div>
          </div>

          <table class="results-table">
            <thead>
              <tr>
                <th>Parameter</th>
                <th>Hasil</th>
                <th>Referensi</th>
                <th style="text-align: right;">Interpretasi</th>
              </tr>
            </thead>
            <tbody>
              ${examination.results
                .map((result) => {
                  const interp = result.interpretation?.toLowerCase() || "";
                  let interpretationClass = "interpretation-undefined";

                  if (
                    interp.includes("abnormal") ||
                    interp.includes("positive") ||
                    interp.includes("high")
                  ) {
                    interpretationClass = "interpretation-abnormal";
                  } else if (
                    interp.includes("trace") ||
                    interp.includes("attention")
                  ) {
                    interpretationClass = "interpretation-attention";
                  } else if (interp.includes("normal")) {
                    interpretationClass = "interpretation-normal";
                  }

                  return `
                    <tr>
                      <td style="font-weight: 600;">${result.test_code}</td>
                      <td>${result.value} ${result.unit || ""}</td>
                      <td>${result.reference_range}</td>
                      <td style="text-align: right;">
                        <span class="interpretation-badge ${interpretationClass}">
                          ${result.interpretation || "-"}
                        </span>
                      </td>
                    </tr>
                  `;
                })
                .join("")}
            </tbody>
          </table>

          <div class="footer">
            <p>Dokumen ini dicetak otomatis dari Sistem Informasi Laboratorium.</p>
            <div class="signature">
              <p>TTD Operator</p>
              <div class="line">${examination.operator?.name || "______________"}</div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
};


  const printSingleExamination = (examination: Examination) => {
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(generatePrintHTML(examination));
      printWindow.document.close();

      // --- PERBAIKAN DI SINI ---
      // Tunggu sesaat agar konten di-render sebelum mencetak
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        // Opsi: tutup otomatis setelah cetak
        // printWindow.close();
      }, 500); // Jeda 500 milidetik
    }
  };

  const printAllExaminations = async () => {
    setPrintLoading(true);
    try {
      const token = Cookies.get("token");
      // Fetch all examinations without pagination
      const response = await fetch(
        `http://verify-api.test/api/examinations?all=true`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) throw new Error("Failed to fetch all examinations");

      const result = await response.json();
      const allExaminations = result.data || [];

      const printWindow = window.open("", "_blank");
      if (printWindow) {
        const currentDate = new Date().toLocaleDateString("id-ID");

        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
          // printWindow.close();
        }, 500);

        let htmlContent = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <title>Laporan Semua Hasil Pemeriksaan</title>
              <style>
                body {
                  font-family: Arial, sans-serif;
                  margin: 20px;
                  color: #333;
                }
                .header {
                  text-align: center;
                  border-bottom: 2px solid #333;
                  padding-bottom: 10px;
                  margin-bottom: 20px;
                }
                .header h1 {
                  margin: 0;
                  color: #2563eb;
                }
                .examination-card {
                  border: 1px solid #ddd;
                  margin-bottom: 30px;
                  padding: 20px;
                  border-radius: 8px;
                  page-break-inside: avoid;
                }
                .examination-header {
                  background-color: #f8f9fa;
                  padding: 10px;
                  border-radius: 5px;
                  margin-bottom: 15px;
                }
                .results-table {
                  width: 100%;
                  border-collapse: collapse;
                  margin-top: 10px;
                }
                .results-table th,
                .results-table td {
                  border: 1px solid #ddd;
                  padding: 8px;
                  text-align: left;
                }
                .results-table th {
                  background-color: #f2f2f2;
                  font-weight: bold;
                }
                .interpretation-normal { color: #059669; font-weight: bold; }
                .interpretation-abnormal { color: #dc2626; font-weight: bold; }
                .interpretation-attention { color: #d97706; font-weight: bold; }
                @media print {
                  body { margin: 0; }
                  .examination-card { page-break-after: always; }
                }
              </style>
            </head>
            <body>
              <div class="header">
                <h1>LAPORAN SEMUA HASIL PEMERIKSAAN</h1>
                <p>Sistem Informasi Laboratorium</p>
                <p>Tanggal Cetak: ${currentDate}</p>
                <p>Total Pemeriksaan: ${allExaminations.length}</p>
              </div>
        `;

        allExaminations.forEach((exam: Examination) => {
          const examDate = new Date(exam.examination_datetime).toLocaleString(
            "id-ID"
          );
          htmlContent += `
            <div class="examination-card">
              <div class="examination-header">
                <h3>LAB-${exam.id} - ${exam.patient.name}</h3>
                <p><strong>Operator:</strong> ${exam.operator?.name || "N/A"} | 
                   <strong>Tanggal:</strong> ${examDate}</p>
              </div>
              <table class="results-table">
                <thead>
                  <tr>
                    <th>Parameter</th>
                    <th>Hasil</th>
                    <th>Referensi</th>
                    <th>Interpretasi</th>
                  </tr>
                </thead>
                <tbody>
                  ${exam.results
                    .map((result) => {
                      const interpretationClass =
                        result.interpretation
                          .toLowerCase()
                          .includes("abnormal") ||
                        result.interpretation
                          .toLowerCase()
                          .includes("positive") ||
                        result.interpretation.toLowerCase().includes("high")
                          ? "interpretation-abnormal"
                          : result.interpretation
                              .toLowerCase()
                              .includes("trace") ||
                            result.interpretation
                              .toLowerCase()
                              .includes("attention")
                          ? "interpretation-attention"
                          : "interpretation-normal";

                      return `
                      <tr>
                        <td>${result.test_code}</td>
                        <td>${result.value} ${result.unit || ""}</td>
                        <td>${result.reference_range}</td>
                        <td class="${interpretationClass}">${
                        result.interpretation
                      }</td>
                      </tr>
                    `;
                    })
                    .join("")}
                </tbody>
              </table>
            </div>
          `;
        });

        htmlContent += `
            </body>
          </html>
        `;

        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
      }
    } catch (error) {
      console.error("Error printing all examinations:", error);
      Swal.fire({
        title: "Error",
        text: "Failed to print all examinations.",
        icon: "error",
        background: "#1f2937",
        color: "#F9FAFB",
      });
    } finally {
      setPrintLoading(false);
      setIsPrintModalOpen(false);
    }
  };

  // --- RENDER ---
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="text-white">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="w-6 h-6" /> Examination Results
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Browse and view all patient test results.
          </p>
        </div>

        {/* Print Button */}
        <button
          onClick={() => setIsPrintModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Printer className="w-4 h-4" />
          Print Reports
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-gray-900 p-4 rounded-lg">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by patient name or lab number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-800 rounded-lg bg-gray-800 text-white focus:ring-2 focus:ring-sky-500"
          />
        </div>
      </div>

      {/* Tabel Hasil Pemeriksaan */}
      <div className="bg-gray-900 rounded-lg overflow-x-auto">
        <table className="w-full min-w-max">
          <thead className="bg-gray-800 text-white">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase">
                Lab Number
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase">
                Patient Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase">
                Operator
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase">
                Examination Time
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center py-10 text-gray-400">
                  Loading...
                </td>
              </tr>
            ) : examinations.length > 0 ? (
              examinations.map((exam, index) => (
                <tr key={index} className="hover:bg-gray-800">
                  <td className="px-6 py-4 text-sm text-gray-300">
                    <code>LAB-{exam.id}</code>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-white">
                    {exam.patient.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300">
                    {exam.operator?.name || "N/A"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300">
                    {new Date(exam.examination_datetime).toLocaleString(
                      "id-ID"
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => handleViewDetails(exam)}
                        className="text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" /> View
                      </button>
                      <button
                        onClick={() => printSingleExamination(exam)}
                        className="text-green-400 hover:text-green-300 flex items-center gap-1"
                        title="Print This Examination"
                      >
                        {/* <Printer className="w-4 h-4" /> Print */}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="text-center py-10 text-gray-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <FlaskConical className="w-12 h-12 text-gray-700" />
                    <span>No examination data found.</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-6 text-sm text-gray-400">
          <div>
            Showing{" "}
            <span className="font-bold text-white">
              {(currentPage - 1) * 10 + 1}
            </span>{" "}
            to{" "}
            <span className="font-bold text-white">
              {Math.min(currentPage * 10, totalItems)}
            </span>{" "}
            of <span className="font-bold text-white">{totalItems}</span>{" "}
            results
          </div>

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

      {/* Modal Detail Hasil */}

      <Dialog.Root open={isModalOpen} onOpenChange={setIsModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-800 text-white rounded-lg w-[95%] max-w-5xl max-h-[70vh] flex flex-col">
            <div className="px-6 py-4 flex justify-between items-center border-b border-gray-700">
              <Dialog.Title className="text-lg font-semibold flex items-center gap-2">
                <FlaskConical className="text-emerald-400" /> Examination
                Details
              </Dialog.Title>
              <div className="flex items-center gap-2">
                {/* Tombol Print hanya muncul jika data sudah ada */}
                {!loading && selectedExamination && (
                  <button
                    onClick={() => printSingleExamination(selectedExamination)}
                    className="text-green-400 hover:text-green-300 flex items-center gap-1 cursor-pointer"
                    title="Print This Examination"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                )}
                <Dialog.Close asChild>
                  <button className="text-gray-400 hover:text-white">
                    <X />
                  </button>
                </Dialog.Close>
              </div>
            </div>

            {/* --- PERBAIKAN UTAMA DI SINI --- */}
            <div className="p-6 overflow-y-auto space-y-4">
              {/* Tampilkan loading indicator jika data sedang diambil */}
              {loading && (
                <div className="flex items-center justify-center py-10 gap-2 text-gray-400">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Loading Details...</span>
                </div>
              )}

              {/* Tampilkan konten HANYA jika loading selesai DAN data ada */}
              {!loading && selectedExamination && (
                <>
                  {/* Metadata Pemeriksaan */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-400">Lab No.</p>
                      <p className="font-semibold">
                        LAB-{selectedExamination.id}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400">Patient</p>
                      <p className="font-semibold">
                        {selectedExamination.patient.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400">Operator</p>
                      <p className="font-semibold">
                        {selectedExamination.operator?.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400">Seq. No.</p>
                      <p className="font-semibold">
                        {selectedExamination.sequence_number}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-gray-400">Date/Time</p>
                      <p className="font-semibold">
                        {new Date(
                          selectedExamination.examination_datetime
                        ).toLocaleString("id-ID")}
                      </p>
                    </div>
                  </div>
                  <hr className="border-gray-700" />

                  {/* Tabel Hasil Tes */}
                  <div>
                    <h4 className="font-semibold text-white mb-2">
                      Test Results
                    </h4>
                    <div className="space-y-1">
                      <div className="grid grid-cols-5 gap-4 text-xs text-gray-400 font-bold px-2">
                        <span className="col-span-2">Parameter</span>
                        <span>Result</span>
                        <span>Reference</span>
                        <span className="text-right">Interpretation</span>
                      </div>
                      <hr className="border-gray-700 my-1" />

                      {/* Gunakan optional chaining (?.) untuk keamanan ekstra */}
                      {selectedExamination.results?.map((res, i) => (
                        <div
                          key={i}
                          className="grid grid-cols-5 gap-4 p-2 rounded-md even:bg-gray-700/50 items-center"
                        >
                          <span className="col-span-2 text-gray-300">
                            {res.test_code}
                          </span>
                          <span className="font-semibold text-white">
                            {res.value} {res.unit}
                          </span>
                          <span className="text-gray-400">
                            {res.reference_range}
                          </span>
                          <span
                            className={`text-right font-bold ${getInterpretationColor(
                              res.interpretation
                            )}`}
                          >
                            {res.interpretation}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="px-6 py-3 flex justify-end bg-gray-700/50 border-t border-gray-700">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="px-4 py-2 rounded bg-gray-600 hover:bg-gray-500"
                >
                  Close
                </button>
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Modal Print Options */}
      <Dialog.Root open={isPrintModalOpen} onOpenChange={setIsPrintModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" />
          <Dialog.Content
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-800 text-white rounded-lg w-[90%] max-w-md z-50"
            onPointerDownOutside={(e) => e.preventDefault()}
          >
            <div className="px-6 py-4 flex justify-between items-center border-b border-gray-700">
              <Dialog.Title className="text-lg font-semibold flex items-center gap-2">
                <Printer className="w-5 h-5 text-blue-400" />
                Print Options
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="text-gray-400 hover:text-white">
                  <X />
                </button>
              </Dialog.Close>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-gray-300">
                Choose an option to print or download the examination reports.
              </p>
              <button
                onClick={printAllExaminations}
                disabled={printLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {printLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4" />
                )}
                {printLoading ? "Generating..." : "Print All Examinations"}
              </button>
              <button
                // Anda bisa membuat fungsi serupa bernama 'downloadAllExaminations' untuk PDF
                // onClick={downloadAllExaminations}
                disabled={true} // Nonaktifkan sementara
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50 cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                Download All as PDF (Coming Soon)
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
