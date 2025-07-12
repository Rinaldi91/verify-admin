"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Cookies from "js-cookie";
import {
  Edit,
  Trash2,
  Shield,
  Plus,
  Search,
  X,
  Save,
  Pencil,
  PlusCircle,
} from "lucide-react";
import Swal from "sweetalert2";
import * as Dialog from "@radix-ui/react-dialog";

interface Permission {
  id: number;
  name: string;
  slug: string;
}

interface Role {
  id: number;
  name: string;
  slug: string;
  description: string;
  created_at: string;
  updated_at: string;
  permissions: Permission[];
}

interface FormRole {
  id?: number;
  name: string;
  description: string;
  permission_ids: number[];
}

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRoles, setTotalRoles] = useState(0);
  const [perPage, setPerPage] = useState(10);

  const [searchTerm, setSearchTerm] = useState<string>("");
  const [permissions, setPermissions] = useState<string[]>([]);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<FormRole>({
    name: "",
    description: "",
    permission_ids: [],
  });
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);

  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  const hasPermission = (slug: string) => permissions.includes(slug);

  const fetchPermissions = async () => {
    try {
      const token = Cookies.get("token");
      if (!token) {
        throw new Error("Token not found");
      }

      const res = await fetch("http://verify-api.test/api/permission", {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (!res.ok) {
        throw new Error("Failed to fetch permissions");
      }

      const json = await res.json();
      console.log("Permissions response:", json); // Debug log

      // Handle different response structures
      let permissionsData = [];
      if (Array.isArray(json.data)) {
        permissionsData = json.data;
      } else if (Array.isArray(json)) {
        permissionsData = json;
      } else if (json.permissions && Array.isArray(json.permissions)) {
        permissionsData = json.permissions;
      }

      console.log("Processed permissions:", permissionsData); // Debug log
      setAllPermissions(permissionsData);
    } catch (error) {
      console.error("Error fetching permissions:", error);
      setAllPermissions([]);
    }
  };

  const fetchRoles = useCallback(
    async (page: number = 1, search: string = "") => {
      try {
        setLoading(true);
        setError(null);
        const token = Cookies.get("token");
        if (!token) throw new Error("Unauthorized");

        const params = new URLSearchParams();
        params.append("page", page.toString());
        if (search.trim()) params.append("search", search);

        const res = await fetch(
          `http://verify-api.test/api/roles?${params.toString()}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
          }
        );

        if (!res.ok) throw new Error("Failed to fetch roles");
        const json = await res.json();

        const rolesData = Array.isArray(json.data)
          ? json.data.map((r: Partial<Role>) => ({
              id: r.id || 0,
              name: r.name || "",
              slug: r.slug || "",
              description: r.description || "",
              created_at: r.created_at || "",
              updated_at: r.updated_at || "",
              permissions: Array.isArray(r.permissions) ? r.permissions : [],
            }))
          : [];

        setRoles(rolesData);
        setCurrentPage(json.meta.current_page);
        setTotalPages(json.meta.last_page);
        setTotalRoles(json.meta.total);
        setPerPage(json.meta.per_page);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Error fetching roles");
        setRoles([]);
      } finally {
        setLoading(false);
      }
    },
    [] // atau tambahkan dep jika fetchRoles perlu akses ke dependen state
  );

  const handleEdit = (role: Role) => {
    setFormData({
      id: role.id,
      name: role.name || "",
      description: role.description || "",
      permission_ids: Array.isArray(role.permissions)
        ? role.permissions.map((p) => p.id)
        : [],
    });
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setFormData({ name: "", description: "", permission_ids: [] });
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const token = Cookies.get("token");
      if (!token) {
        throw new Error("Token not found");
      }

      const method = formData.id ? "PUT" : "POST";
      const url = formData.id
        ? `http://verify-api.test/api/roles/${formData.id}`
        : "http://verify-api.test/api/roles";

      // Prepare JSON payload
      const payload = {
        name: formData.name,
        description: formData.description,
        permission_ids: Array.isArray(formData.permission_ids)
          ? formData.permission_ids
          : [],
      };

      console.log("Submitting payload:", payload); // Debug log

      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      console.log("Response status:", res.status); // Debug log

      if (res.ok) {
        setIsModalOpen(false);
        setFormData({ name: "", description: "", permission_ids: [] }); // Reset form
        fetchRoles();
        Swal.fire({
          title: "Success",
          text: "Role has been saved",
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
      } else {
        const errorData = await res.json();
        console.error("Error response:", errorData); // Debug log

        // Handle validation errors
        if (errorData.errors) {
          const errorMessages = Object.values(errorData.errors)
            .flat()
            .join("\n");
          Swal.fire("Validation Error", errorMessages, "error");
        } else {
          Swal.fire(
            "Error",
            errorData.message || "Failed to save role",
            "error"
          );
        }
      }
    } catch (error) {
      console.error("Error saving role:", error);
      Swal.fire("Error", "Network error or server unavailable", "error");
    }
  };

  const handleDelete = async (id: number) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "You will not be able to recover this role!",
      icon: "warning",
      showCancelButton: true,
      background: "#111827",
      color: "#F9FAFB",
      customClass: {
        popup: "rounded-xl",
      },
      confirmButtonText: "Yes, delete it!",
    });

    if (result.isConfirmed) {
      try {
        const token = Cookies.get("token");
        if (!token) {
          throw new Error("Token not found");
        }

        const res = await fetch(`http://verify-api.test/api/roles/${id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });

        if (res.ok) {
          fetchRoles();
          Swal.fire({
            title: "Deleted!",
            text: "Role has been deleted.",
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
        } else {
          const errorData = await res.json();
          Swal.fire(
            "Error",
            errorData.message || "Failed to delete role",
            "error"
          );
        }
      } catch (error) {
        console.error("Error deleting role:", error);
        Swal.fire("Error", "Failed to delete role", "error");
      }
    }
  };

  // Multi-delete functions
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(roles.map((item) => item.id));
      setSelectedItems(allIds);
    } else {
      setSelectedItems(new Set());
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

  const handleMultiDelete = async () => {
    if (selectedItems.size === 0) return;

    const selectedPermissions = roles.filter((cat) =>
      selectedItems.has(cat.id)
    );
    const roleNames = selectedPermissions.map((cat) => cat.name).join(", ");

    const result = await Swal.fire({
      title: "Delete Multiple Roles?",
      html: `
            <p>You are about to delete <strong>${selectedItems.size}</strong> roles:</p>
            <p style="font-size: 14px; color: #9CA3AF; margin-top: 8px;">${roleNames}</p>
            <p style="color: #EF4444; margin-top: 12px;">This action cannot be undone!</p>
          `,
      icon: "warning",
      showCancelButton: true,
      background: "#111827",
      color: "#F9FAFB",
      customClass: {
        popup: "rounded-xl",
      },
      confirmButtonText: "Yes, delete all!",
      confirmButtonColor: "#EF4444",
      cancelButtonText: "Cancel",
    });

    if (result.isConfirmed) {
      setIsDeleting(true);
      try {
        const token = Cookies.get("token");
        if (!token) {
          throw new Error("Token not found");
        }

        const deletePromises = selectedPermissions.map((item) =>
          fetch(`http://verify-api.test/api/roles/${item.id}`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
          })
        );

        const results = await Promise.allSettled(deletePromises);

        // Count successful deletions
        const successCount = results.filter(
          (result) => result.status === "fulfilled" && result.value.ok
        ).length;

        const failedCount = selectedItems.size - successCount;

        // Refresh data
        await fetchRoles();

        // Show result
        if (failedCount === 0) {
          Swal.fire({
            title: "Success!",
            text: `Successfully deleted ${successCount} roles.`,
            icon: "success",
            timer: 3000,
            showConfirmButton: false,
            timerProgressBar: true,
            background: "#1f2937",
            color: "#F9FAFB",
            customClass: {
              popup: "rounded-xl p-6",
            },
          });
        } else {
          Swal.fire({
            title: "Partially Completed",
            text: `Deleted ${successCount} roles successfully. ${failedCount} failed to delete.`,
            icon: "warning",
            background: "#1f2937",
            color: "#F9FAFB",
            customClass: {
              popup: "rounded-xl p-6",
            },
          });
        }
      } catch (error) {
        console.error("Error in multi-delete:", error);
        Swal.fire({
          title: "Error",
          text: "Failed to delete roles. Please try again.",
          icon: "error",
          background: "#1f2937",
          color: "#F9FAFB",
        });
      } finally {
        setIsDeleting(false);
        setSelectedItems(new Set());
      }
    }
  };

  // Initial load
  useEffect(() => {
    const initializeData = async () => {
      // Load permissions from cookies
      const stored = Cookies.get("permissions");
      if (stored) {
        try {
          setPermissions(JSON.parse(stored));
        } catch {
          setPermissions([]);
        }
      }

      // Fetch data
      await Promise.all([fetchRoles(), fetchPermissions()]);
    };

    initializeData();
  }, [fetchRoles]);

  // Search debounce
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      fetchRoles(1, searchTerm);
    }, 400);
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [searchTerm, fetchRoles]);

  // Handle pagination
  const handlePageChange = useCallback(
    (page: number) => {
      if (page >= 1 && page <= totalPages) {
        setCurrentPage(page);
        fetchRoles(page, searchTerm);
      }
    },
    [searchTerm, totalPages, fetchRoles]
  );

  const getPaginationNumbers = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, "...");
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push("...", totalPages);
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  const isAllSelected =
    roles.length > 0 && roles.every((cat) => selectedItems.has(cat.id));
  const isIndeterminate = selectedItems.size > 0 && !isAllSelected;

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="text-white">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="w-6 h-6" /> Roles Management
            </h1>
            <p className="mt-1 text-sm text-gray-400">
              Manage access roles and permissions
            </p>
          </div>

          <div className="flex items-center gap-2">
            {selectedItems.size > 0 && hasPermission("delete-roles") && (
              <button
                onClick={handleMultiDelete}
                disabled={isDeleting}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {isDeleting
                  ? "Deleting..."
                  : `Delete ${selectedItems.size} Items`}
              </button>
            )}

            {hasPermission("create-roles") && (
              <button
                onClick={handleAdd}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4 mr-2" /> Add Role
              </button>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="bg-gray-900 p-4 rounded-lg">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search roles by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-800 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none bg-gray-800 text-white"
            />
            {searchTerm && (
              <X
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 cursor-pointer hover:text-white"
                onClick={() => setSearchTerm("")}
              />
            )}
          </div>
        </div>

        {selectedItems.size > 0 && (
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
            <p className="text-blue-300 text-sm">
              {selectedItems.size} item{selectedItems.size > 1 ? "s" : ""}{" "}
              selected
              <button
                onClick={() => setSelectedItems(new Set())}
                className="ml-2 text-blue-400 hover:text-blue-300 underline cursor-pointer"
              >
                Clear selection
              </button>
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="bg-gray-900 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-800 text-white">
              <tr>
                {hasPermission("delete-roles") && (
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = isIndeterminate;
                      }}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                    />
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider w-[7%]">
                  No
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider w-[15%]">
                  Role Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Permissions
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {Array.isArray(roles) &&
                roles.map((role, index) => (
                  <tr key={role.id} className="hover:bg-gray-800">
                    {hasPermission("delete-roles") && (
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedItems.has(role.id)}
                          onChange={(e) =>
                            handleSelectItem(role.id, e.target.checked)
                          }
                          className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                        />
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      {(currentPage - 1) * perPage + index + 1}
                    </td>
                    <td className="px-6 py-4 text-white w-[15%]">
                      {role.name || ""}
                    </td>
                    <td className="px-6 py-4 text-gray-300 text-sm">
                      <div className="flex flex-wrap gap-1">
                        {Array.isArray(role.permissions) &&
                          role.permissions.map((p) => (
                            <span
                              key={p.id}
                              className="inline-block px-2 py-1 text-xs font-medium rounded-full bg-blue-700 text-white"
                            >
                              {p.name || ""}
                            </span>
                          ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* {hasPermission("show-roles") && (
                        <button className="text-blue-400 hover:text-blue-300 p-1 cursor-pointer">
                          <Eye className="w-4 h-4" />
                        </button>
                      )} */}
                        {hasPermission("update-roles") && (
                          <button
                            onClick={() => handleEdit(role)}
                            className="text-green-400 hover:text-green-300 p-1 cursor-pointer"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                        {hasPermission("delete-roles") && (
                          <button
                            onClick={() => handleDelete(role.id)}
                            className="text-red-400 hover:text-red-300 p-1 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>

          {roles.length === 0 && !loading && (
            <div className="text-center py-12">
              <div className="text-gray-400 text-lg mb-2">No roles found</div>
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
              <p className="mt-4 text-gray-400">Loading roles...</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-400">
              Showing {(currentPage - 1) * perPage + 1} to{" "}
              {Math.min(currentPage * perPage, totalRoles)} of {totalRoles}{" "}
              results
            </div>

            <div className="flex items-center space-x-1">
              {/* Previous button */}
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="cursor-pointer px-3 py-2 text-sm border border-gray-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 text-gray-300 transition-colors"
              >
                Previous
              </button>

              {/* Page numbers */}
              {getPaginationNumbers().map((page, index) => (
                <div key={index}>
                  {page === "..." ? (
                    <span className="px-3 py-2 text-sm text-gray-500 cursor-pointer">
                      ...
                    </span>
                  ) : (
                    <button
                      onClick={() => handlePageChange(page as number)}
                      className={`px-3 py-2 text-sm border rounded-md transition-colors cursor-pointer ${
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

              {/* Next button */}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="cursor-pointer px-3 py-2 text-sm border border-gray-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 text-gray-300 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      <Dialog.Root
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        modal={true}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" />
          <Dialog.Content
            className="fixed top-1/2 left-1/2 bg-gray-800 text-white rounded-lg w-[90%] max-w-2xl -translate-x-1/2 -translate-y-1/2 max-h-[90vh] overflow-y-auto z-50"
            onPointerDownOutside={(e) => e.preventDefault()}
          >
            {/* Header */}
            <div className="bg-blue-600 px-6 py-4 flex items-center gap-2">
              {formData?.id ? (
                <>
                  <Pencil className="w-5 h-5 text-white" />
                  <Dialog.Title className="text-lg font-semibold text-white">
                    Edit Role
                  </Dialog.Title>
                </>
              ) : (
                <>
                  <PlusCircle className="w-5 h-5 text-white" />
                  <Dialog.Title className="text-lg font-semibold text-white">
                    Add Role
                  </Dialog.Title>
                </>
              )}
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Role name"
                className="w-full px-3 py-2 rounded bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />

              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Description"
                className="w-full px-3 py-2 rounded bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />

              <div>
                <label className="block text-sm font-medium mb-1">
                  Permissions
                </label>
                {allPermissions.length === 0 ? (
                  <div className="text-gray-400 text-sm">
                    Loading permissions...
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-600 rounded p-2 bg-gray-700">
                    {allPermissions.map((perm) => (
                      <label
                        key={perm.id}
                        className="flex items-center space-x-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={formData.permission_ids.includes(perm.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                permission_ids: [
                                  ...formData.permission_ids,
                                  perm.id,
                                ],
                              });
                            } else {
                              setFormData({
                                ...formData,
                                permission_ids: formData.permission_ids.filter(
                                  (id) => id !== perm.id
                                ),
                              });
                            }
                          }}
                          className="rounded"
                        />
                        <span className="text-sm text-white">
                          {perm.name || ""}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-700 px-6 py-4 flex justify-end gap-2">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded bg-gray-600 hover:bg-gray-500 cursor-pointer flex items-center gap-2 text-white"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!formData.name.trim()}
                className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2 text-white"
              >
                {formData?.id ? (
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
    </>
  );
}
