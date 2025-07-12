"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Cookies from "js-cookie";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  UserCheck,
  UserX,
  Users,
  Eye,
  X,
  Save,
  EyeOff,
  User,
  Mail,
  Shield,
  CheckCircle,
  XCircle,
  Key,
  Pencil,
  PlusCircle,
} from "lucide-react";
import Swal from "sweetalert2";
import * as Dialog from "@radix-ui/react-dialog";

interface User {
  password_confirmation: string;
  password: string;
  id: number;
  name: string;
  email: string;
  role_id: number;
  email_verified_at: string | null;
  created_at: string;
  updated_at: string;
  role: {
    id: number;
    name: string;
    slug: string;
    description: string;
    permissions?: Permission[];
  };
}

interface Permission {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  pivot?: {
    role_id: number;
    permission_id: number;
  };
}

interface Role {
  id: number;
  name: string;
  slug: string;
  description: string;
}

interface ApiResponse {
  status: boolean;
  message: string;
  data: User[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
  links: {
    first: string;
    last: string;
    prev: string | null;
    next: string | null;
  };
}

type UserFormData = {
  id: string;
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  role_id: string;
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [perPage, setPerPage] = useState(10);
  const [permissions, setPermissions] = useState<string[]>([]);
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialSearch = searchParams?.get("search") || "";
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    id: "",
    name: "",
    email: "",
    password: "",
    password_confirmation: "",
    role_id: "",
  });

  // Get user permissions from cookies
  useEffect(() => {
    const stored = Cookies.get("permissions");
    if (stored) {
      setPermissions(JSON.parse(stored));
    }
  }, []);

  // Fetch roles
  const fetchRoles = useCallback(async () => {
    try {
      const token = Cookies.get("token");
      if (!token) return;

      const response = await fetch("http://verify-api.test/api/roles", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.status && result.data) {
          setRoles(result.data);
        }
      }
    } catch (err) {
      console.error("Error fetching roles:", err);
    }
  }, []);

  // Fetch users from API
  const fetchUsers = useCallback(
    async (page: number = 1, search: string = "") => {
      try {
        setLoading(true);
        setError(null);

        const token = Cookies.get("token");
        if (!token) {
          throw new Error("No authentication token found");
        }

        const params = new URLSearchParams();
        params.append("page", page.toString());
        if (search.trim()) {
          params.append("search", search.trim());
        }

        const response = await fetch(
          `http://verify-api.test/api/users?${params.toString()}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
              Accept: "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result: ApiResponse = await response.json();

        if (result.status && result.data) {
          setUsers(result.data);
          setCurrentPage(result.meta.current_page);
          setTotalPages(result.meta.last_page);
          setTotalUsers(result.meta.total);
          setPerPage(result.meta.per_page);
        } else {
          throw new Error(result.message || "Failed to fetch users");
        }
      } catch (err) {
        console.error("Error fetching users:", err);
        setError(err instanceof Error ? err.message : "Failed to load users");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Fetch single user
  const fetchUserID = async (id: number): Promise<User | null> => {
    try {
      const token = Cookies.get("token");
      if (!token) return null;

      const response = await fetch(`http://verify-api.test/api/users/${id}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.status && result.user) {
          return result.user;
        }
      }
      return null;
    } catch (err) {
      console.error("Error fetching user:", err);
      return null;
    }
  };

  // Initialize data
  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  // Search debounce effect
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (searchTerm.length === 0 || searchTerm.length >= 3) {
        fetchUsers(1, searchTerm);

        const params = new URLSearchParams();
        if (searchTerm) params.set("search", searchTerm);
        else params.delete("search");

        router.replace(`/dashboard/users?${params.toString()}`);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchTerm, router, fetchUsers]);

  // Initial load
  useEffect(() => {
    if (initialSearch.length === 0 || initialSearch.length >= 3) {
      fetchUsers(1, initialSearch);
    }
  }, [initialSearch, fetchUsers]);

  // Check if user has specific permission
  const hasPermission = (permission: string) => {
    return permissions.includes(permission);
  };

  // Handle pagination
  const handlePageChange = useCallback(
    (page: number) => {
      if (page >= 1 && page <= totalPages) {
        setCurrentPage(page);
        fetchUsers(page, searchTerm);
      }
    },
    [searchTerm, totalPages, fetchUsers]
  );

  // Generate pagination numbers
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

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const closeModal = () => {
    setIsModalOpen(false); // <- ini yang kurang
    setSelectedUser(null);
    setFormData({
      id: "",
      name: "",
      email: "",
      password: "",
      password_confirmation: "",
      role_id: "",
    });
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const token = Cookies.get("token");
      const isEdit = !!selectedUser?.id;
      const url = isEdit
        ? `http://verify-api.test/api/users/${selectedUser.id}`
        : `http://verify-api.test/api/users`;

      const method = isEdit ? "PATCH" : "POST"; // Changed from PUT to PATCH

      // Buat salinan payload
      const payload: Omit<Partial<UserFormData>, "role_id"> & {
        role_id: number;
      } = {
        ...formData,
        role_id: parseInt(formData.role_id),
      };

      // DEBUG: Log data yang akan dikirim
      console.log("=== FRONTEND DEBUG ===");
      console.log("Is Edit:", isEdit);
      console.log("Selected User ID:", selectedUser?.id);
      console.log("Form Data:", formData);
      console.log("Payload before cleanup:", payload);

      // Jika edit dan password kosong, hapus field password
      if (isEdit && (!formData.password || formData.password.trim() === "")) {
        delete payload.password;
        delete payload.password_confirmation;
      }

      console.log("Payload after cleanup:", payload);
      console.log("Method:", method);
      console.log("URL:", url);

      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (res.ok) {
        await fetchUsers(currentPage, searchTerm);
        closeModal();
        Swal.fire({
          title: "Success",
          text: "User has been saved",
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
        const errorText =
          Object.values(json.errors || {})
            .flat()
            .join("\n") || json.message;
        Swal.fire({
          title: "Warning",
          text: errorText,
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
    } catch (err) {
      console.log("err", err);
      Swal.fire({
        title: "Warning",
        text: "Failed to save user",
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
      setLoading(false);
    }
  };

  const handleEditUser = (users: User) => {
  setFormData({
    id: users.id.toString(),
    role_id: users.role_id.toString(),
    name: users.name || "",
    email: users.email || "",
    password: "", // Kosongkan saat edit
    password_confirmation: "", // Kosongkan saat edit
  });
  setIsModalOpen(true);
};


  const handleDeleteUser = async (user: User) => {
    const result = await Swal.fire({
      title: "Delete User?",
      text: `Are you sure to delete ${user.name}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
      background: "#111827",
      color: "#F9FAFB",
    });

    if (result.isConfirmed) {
      try {
        const token = Cookies.get("token");
        const res = await fetch(`http://verify-api.test/api/users/${user.id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });
        const json = await res.json();

        if (res.ok) {
          await fetchUsers(currentPage, searchTerm);
          Swal.fire({
            title: "Deleted!",
            text: "User has been deleted.",
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
          Swal.fire("Error", json.message || "Failed to delete user", "error");
        }
      } catch {
        Swal.fire("Error", "Failed to delete user", "error");
      }
    }
  };

  const handleViewUser = async (id: number) => {
    const user = await fetchUserID(id);
    if (user) {
      setSelectedUser(user);
      setShowViewModal(true);
    } else {
      Swal.fire("Error", "Failed to load user detail", "error");
    }
  };

  const handleAdd = () => {
    setFormData({
      id: "",
      role_id: "",
      name: "",
      email: "",
      password: "",
      password_confirmation: "",
    });
    setIsModalOpen(true);
  };

  // Multi-delete functions
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(users.map((item) => item.id));
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

    const selectedUsers = users.filter((cat) => selectedItems.has(cat.id));
    const healthFacilityNames = selectedUsers.map((cat) => cat.name).join(", ");

    const result = await Swal.fire({
      title: "Delete Multiple Users?",
      html: `
            <p>You are about to delete <strong>${selectedItems.size}</strong> users:</p>
            <p style="font-size: 14px; color: #9CA3AF; margin-top: 8px;">${healthFacilityNames}</p>
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

        const deletePromises = selectedUsers.map((item) =>
          fetch(`http://verify-api.test/api/users/${item.id}`, {
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
        await fetchUsers();

        // Show result
        if (failedCount === 0) {
          Swal.fire({
            title: "Success!",
            text: `Successfully deleted ${successCount} users.`,
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
            text: `Deleted ${successCount} users successfully. ${failedCount} failed to delete.`,
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
          text: "Failed to delete users. Please try again.",
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

  const isAllSelected =
    users.length > 0 && users.every((cat) => selectedItems.has(cat.id));
  const isIndeterminate = selectedItems.size > 0 && !isAllSelected;

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Users className="w-6 h-6" />
              Users Management
            </h1>
            <p className="text-white mt-1">
              Manage system users and their roles
            </p>
          </div>
          <div className="flex items-center gap-2">
            {selectedItems.size > 0 && hasPermission("delete-users") && (
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

            {hasPermission("create-users") && (
              <button
                onClick={handleAdd}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add User
              </button>
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

        {/* Error notification */}
        {error && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Search and Filters */}
        <div className="bg-gray-900 p-4 rounded-lg shadow-sm">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search users by name or email..."
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
          </div>
        </div>

        {/* Results Summary */}
        <div className="text-sm text-gray-400">
          Showing {users.length} of {totalUsers} results
        </div>
        {/* Users Table */}
        <div className="bg-gray-900 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800 text-gray-800 border-b">
                <tr>
                  {hasPermission("delete-users") && (
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = isIndeterminate;
                        }}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="w-4 h-4 text-red-600 bg-gray-700 border-gray-600 rounded focus:ring-red-500 focus:ring-2 cursor-pointer"
                      />
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    No
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Last Update
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-900 divide-y divide-gray-800">
                {users.map((user, index) => (
                  <tr key={user.id} className="hover:bg-gray-800">
                    {hasPermission("delete-users") && (
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedItems.has(user.id)}
                          onChange={(e) =>
                            handleSelectItem(user.id, e.target.checked)
                          }
                          className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                        />
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      {(currentPage - 1) * perPage + index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-300 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-medium">
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-white">
                            {user.name}
                          </div>
                          <div className="text-sm text-gray-400">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                        {user.role.name}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {user.email_verified_at ? (
                          <>
                            <UserCheck className="w-4 h-4 text-green-500 mr-1" />
                            <span className="text-sm text-green-400">
                              Verified
                            </span>
                          </>
                        ) : (
                          <>
                            <UserX className="w-4 h-4 text-yellow-500 mr-1" />
                            <span className="text-sm text-yellow-400">
                              Unverified
                            </span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {formatDate(user.updated_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        {hasPermission("show-users") && (
                          <button
                            onClick={() => handleViewUser(user.id)}
                            className="text-blue-400 hover:text-blue-300 p-1 cursor-pointer"
                            title="View User"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                        {hasPermission("update-users") && (
                          <button
                            onClick={() => handleEditUser(user)}
                            className="text-green-400 hover:text-green-300 p-1 cursor-pointer"
                            title="Edit User"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                        {hasPermission("delete-users") && (
                          <button
                            onClick={() => handleDeleteUser(user)}
                            className="text-red-400 hover:text-red-300 p-1 cursor-pointer"
                            title="Delete User"
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
          </div>

          {/* Empty state */}
          {users.length === 0 && !loading && (
            <div className="text-center py-12">
              <div className="text-gray-400 text-lg mb-2">No users found</div>
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-400">
              Showing {(currentPage - 1) * perPage + 1} to{" "}
              {Math.min(currentPage * perPage, totalUsers)} of {totalUsers}{" "}
              results
            </div>

            <div className="flex items-center space-x-1">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="cursor-pointer px-3 py-2 text-sm border border-gray-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 text-gray-300 transition-colors"
              >
                Previous
              </button>

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
      {/* modal user */}
      <Dialog.Root
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        modal={true}
      >
        <Dialog.Portal>
          {/* Overlay + Blur */}
          <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" />

          {/* Content */}
          <Dialog.Content
            onPointerDownOutside={(e) => e.preventDefault()}
            onEscapeKeyDown={(e) => e.preventDefault()}
            className="fixed top-1/2 left-1/2 bg-gray-800 text-white rounded-lg w-[95%] md:w-[900px] lg:w-[1000px] -translate-x-1/2 -translate-y-1/2 max-h-[90vh] overflow-y-auto z-50"
          >
            {/* Header */}
            <div className="bg-blue-600 px-6 py-4 flex items-center gap-2 rounded-t-lg">
              {formData.id ? (
                <>
                  <Pencil className="w-5 h-5 text-white" />
                  <Dialog.Title className="text-lg font-semibold text-white">
                    Edit User
                  </Dialog.Title>
                </>
              ) : (
                <>
                  <PlusCircle className="w-5 h-5 text-white" />
                  <Dialog.Title className="text-lg font-semibold text-white">
                    Add User
                  </Dialog.Title>
                </>
              )}
            </div>

            {/* Body */}
            <div className="px-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="e.g., John Doe"
                    className="w-full px-3 py-2 rounded bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Email *
                  </label>
                  <input
                    type="text"
                    name="new-email"
                    autoComplete="off"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="e.g., john@email.com"
                    className="w-full px-3 py-2 rounded bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium mb-1">
                    Password *
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="new-password"
                    autoComplete="new-password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    placeholder="Enter your password"
                    className="w-full px-3 py-2 pr-10 rounded bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute top-9 right-3 text-gray-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium mb-1">
                    Confirm Password *
                  </label>
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={formData.password_confirmation}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        password_confirmation: e.target.value,
                      })
                    }
                    placeholder="Re-enter your password"
                    className="w-full px-3 py-2 pr-10 rounded bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute top-9 right-3 text-gray-400 hover:text-white"
                  >
                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium mb-1">
                  Roles *
                </label>
                <select
                  value={formData.role_id}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      role_id: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select role</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-700 px-6 py-4 flex justify-end gap-2 rounded-b-lg">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded bg-gray-600 hover:bg-gray-500 flex items-center gap-2 cursor-pointer"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!formData.name.trim() || !formData.role_id}
                className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
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

      <Dialog.Root open={showViewModal} onOpenChange={setShowViewModal}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-in fade-in duration-200" />
          <Dialog.Content
            className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] md:w-[900px] max-h-[90vh] animate-in fade-in zoom-in-95 duration-200"
            onPointerDownOutside={(e) => e.preventDefault()}
          >
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden h-full max-h-[90vh] flex flex-col">
              {/* Header with gradient - Fixed */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-600 p-3 relative overflow-hidden flex-shrink-0">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-blue-600/20 backdrop-blur-3xl"></div>
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <Dialog.Title className="text-xl font-bold text-white">
                      User Details
                    </Dialog.Title>
                  </div>
                  <button
                    onClick={() => setShowViewModal(false)}
                    className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-all duration-200 backdrop-blur-sm group cursor-pointer"
                  >
                    <X className="w-5 h-5 text-white group-hover:rotate-90 transition-transform duration-200" />
                  </button>
                </div>
              </div>

              {selectedUser ? (
                <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
                  {/* User Info Grid */}
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Name */}
                    <div className="group">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                          <User className="w-4 h-4 text-blue-400" />
                        </div>
                        <label className="text-sm font-medium text-slate-300 uppercase tracking-wider">
                          Full Name
                        </label>
                      </div>
                      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 group-hover:border-blue-500/30 transition-colors duration-200">
                        <p className="text-white font-medium text-lg">
                          {selectedUser.name}
                        </p>
                      </div>
                    </div>

                    {/* Email */}
                    <div className="group">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                          <Mail className="w-4 h-4 text-emerald-400" />
                        </div>
                        <label className="text-sm font-medium text-slate-300 uppercase tracking-wider">
                          Email Address
                        </label>
                      </div>
                      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 group-hover:border-emerald-500/30 transition-colors duration-200">
                        <p className="text-white font-medium text-lg">
                          {selectedUser.email}
                        </p>
                      </div>
                    </div>

                    {/* Email Verification */}
                    <div className="group">
                      <div className="flex items-center gap-3 mb-2">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            selectedUser.email_verified_at
                              ? "bg-green-500/20"
                              : "bg-blue-500/20"
                          }`}
                        >
                          {selectedUser.email_verified_at ? (
                            <CheckCircle className="w-4 h-4 text-green-400" />
                          ) : (
                            <XCircle className="w-4 h-4 text-blue-400" />
                          )}
                        </div>
                        <label className="text-sm font-medium text-slate-300 uppercase tracking-wider">
                          Email Status
                        </label>
                      </div>
                      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 group-hover:border-slate-600/50 transition-colors duration-200">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
                              selectedUser.email_verified_at
                                ? "bg-green-500/20 text-green-300 border border-green-500/30"
                                : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                            }`}
                          >
                            {selectedUser.email_verified_at ? (
                              <>
                                <CheckCircle className="w-3 h-3" />
                                Verified
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3 h-3" />
                                Not Verified
                              </>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Role */}
                    <div className="group">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                          <Shield className="w-4 h-4 text-purple-400" />
                        </div>
                        <label className="text-sm font-medium text-slate-300 uppercase tracking-wider">
                          Role
                        </label>
                      </div>
                      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 group-hover:border-purple-500/30 transition-colors duration-200">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm font-medium border border-purple-500/30">
                          <Shield className="w-4 h-4" />
                          {selectedUser.role.name}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Permissions Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center">
                        <Key className="w-4 h-4 text-amber-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-white">
                        Permissions
                      </h3>
                    </div>

                    <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6">
                      {selectedUser.role.permissions &&
                      selectedUser.role.permissions.length > 0 ? (
                        <div className="grid sm:grid-cols-2 gap-3">
                          {selectedUser.role.permissions.map((perm) => (
                            <div
                              key={perm.id}
                              className="flex items-center gap-3 p-3 bg-slate-700/30 hover:bg-slate-700/50 rounded-lg border border-slate-600/30 hover:border-slate-500/50 transition-all duration-200 group"
                            >
                              <div className="w-2 h-2 bg-blue-400 rounded-full group-hover:scale-125 transition-transform duration-200"></div>
                              <div>
                                <p className="text-white font-medium text-sm">
                                  {perm.name}
                                </p>
                                <p className="text-slate-400 text-xs font-mono">
                                  {perm.slug}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-slate-400 text-center py-4">
                          No permissions assigned
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 flex items-center justify-center">
                  <div className="flex items-center gap-3 text-slate-400">
                    <div className="w-6 h-6 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                    <span>Loading user details...</span>
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="bg-slate-800/50 border-t border-slate-700/50 p-3 flex justify-end"></div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
