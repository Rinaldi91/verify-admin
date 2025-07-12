"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Cookies from "js-cookie";
import { LogOut, Search, ChevronLeft, MonitorSmartphone } from "lucide-react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

const MySwal = withReactContent(Swal);

interface UserInfo {
  name: string;
  role?: {
    name: string;
  };
}

interface MenuItem {
  label: string;
  href?: string;
  permission?: string;
  children?: MenuItem[];
}

interface HeaderProps {
  onToggleSidebar?: () => void;
  isSidebarCollapsed?: boolean;
}

// Menu items data (same as in Sidebar.tsx)
const menuItems: MenuItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
  },
  {
    label: "Users",
    href: "/dashboard/users",
    permission: "view-users",
  },
  {
    label: "Roles",
    href: "/dashboard/roles",
    permission: "view-roles",
  },
  {
    label: "Permissions",
    href: "/dashboard/permissions",
    permission: "view-roles",
  },
  {
    label: "Roles",
    href: "/dashboard/roles",
    permission: "view-roles",
  },
  {
    label: "Test References",
    href: "/dashboard/test-references",
    permission: "view-test-references",
  },
  {
    label: "Connection Settings",
    href: "/dashboard/devices",
    permission: "view-connection",
  },
  {
    label: "Patients",
    href: "/dashboard/patients",
    permission: "view-patient",
  },
  {
    label: "Examinations",
    href: "/dashboard/examinations",
    permission: "view-examinations",
  },
  {
    label: "Examinations Results",
    href: "/dashboard/examination-results",
    permission: "view-examinations",
  },
];

export default function Header({
  onToggleSidebar,
  isSidebarCollapsed = false,
}: HeaderProps) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredMenus, setFilteredMenus] = useState<MenuItem[]>([]);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const stored = Cookies.get("user");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setUser(parsed);
      } catch {
        setUser(null);
      }
    }

    const storedPermissions = Cookies.get("permissions");
    if (storedPermissions) {
      setPermissions(JSON.parse(storedPermissions));
    }
  }, []);

  // Flatten menu items for searching
  const getAllMenuItems = (items: MenuItem[]): MenuItem[] => {
    const result: MenuItem[] = [];

    items.forEach((item) => {
      if (item.children) {
        // Add children items
        item.children.forEach((child) => {
          result.push(child);
        });
      } else if (item.href) {
        // Add parent item if it has href
        result.push(item);
      }
    });

    return result;
  };

  // Moved hasPermission inside useCallback to fix dependency issue
  const hasPermission = useCallback(
    (perm?: string) => {
      if (!perm) return true;
      return permissions.includes(perm);
    },
    [permissions]
  );

  // Filter menus based on search term
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredMenus([]);
      return;
    }

    const allMenus = getAllMenuItems(menuItems);
    const filtered = allMenus.filter(
      (menu) =>
        hasPermission(menu.permission) &&
        menu.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    setFilteredMenus(filtered);
  }, [searchTerm, hasPermission]); // Added hasPermission to dependencies

  // Handle click outside to close search dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setSearchTerm("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleMenuClick = (href: string) => {
    setSearchTerm("");
    // Store active menu in localStorage like in Sidebar
    localStorage.setItem("activeMenu", href);
    router.push(href);
  };

  const handleToggleSidebar = () => {
    if (onToggleSidebar) {
      onToggleSidebar();
    }
  };

  const handleLogout = async () => {
    const result = await MySwal.fire({
      title: "Are you sure?",
      text: "You will be logged out from your account.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#1696f2", // Tailwind blue-500
      cancelButtonColor: "#6b7280", // Tailwind gray-500
      confirmButtonText: "Yes, log out",
      cancelButtonText: "No",
      background: "#111827", // Tailwind bg-gray-900
      color: "#F9FAFB", // Tailwind text-gray-100
      customClass: {
        popup: "rounded-xl", // optional styling
      },
    });

    if (result.isConfirmed) {
      Cookies.remove("token");
      Cookies.remove("user");
      Cookies.remove("role");
      Cookies.remove("permissions");

      await MySwal.fire({
        icon: "success",
        title: "Logged out",
        text: "You have been logged out successfully.",
        timer: 1500,
        showConfirmButton: false,
        background: "#111827",
        color: "#F9FAFB",
        customClass: {
          popup: "rounded-xl",
        },
      });

      router.push("/login");
    }
  };

  return (
    <header className="w-auto bg-blue-700 border-b border-blue-800 px-4 py-2 flex items-center justify-between sticky top-0 z-50 shadow-sm">
      {/* Logo/Brand Section */}
      <div className="flex items-center flex-1">
        <div className="flex items-center mr-4">
          <div className="p-2 rounded-lg mr-3 border-2">
            <MonitorSmartphone className="w-6 h-6" />
          </div>
          <span className="text-xl font-bold">Smart Connection</span>
        </div>

        {/* Navigation Back Button - Now with toggle functionality */}
        <button
          onClick={handleToggleSidebar}
          className="p-2 hover:bg-blue-600 rounded-lg transition-colors mr-2 cursor-pointer"
          title={isSidebarCollapsed ? "Show Sidebar" : "Hide Sidebar"}
        >
          <ChevronLeft
            className={`w-5 h-5 text-white transition-transform duration-200 ${
              isSidebarCollapsed ? "rotate-180" : ""
            }`}
          />
        </button>

        <div
          className="flex-1 max-w-2xl mx-4 relative"
          ref={searchContainerRef}
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search for results..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-gray-900 bg-white border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-500 transition-all"
            />
          </div>

          {/* Search Results Dropdown */}
          {filteredMenus.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-60 overflow-y-auto">
              {filteredMenus.map((menu, index) => (
                <button
                  key={`${menu.href}-${index}`}
                  onClick={() => handleMenuClick(menu.href!)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 text-gray-900"
                >
                  <div className="font-medium">{menu.label}</div>
                  <div className="text-sm text-gray-500">{menu.href}</div>
                </button>
              ))}
            </div>
          )}

          {/* No Results Message */}
          {searchTerm.trim() !== "" && filteredMenus.length === 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 z-50 p-4 text-center text-gray-500">
              No menu items found for &quot;{searchTerm}&quot;
            </div>
          )}
        </div>
      </div>

      {/* Search Section */}

      {/* Right Side Icons */}
      <div className="flex items-center gap-2 ml-auto">
        {user && (
          <div className="flex items-center ml-2">
            <div className="w-8 h-8 bg-white rounded-full mr-2 flex items-center justify-center">
              <span className="text-blue-700 text-sm font-medium">
                {user.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="text-sm text-white hidden lg:block">
              <div className="font-medium">{user.name}</div>
              <div className="text-xs text-blue-200">{user.role?.name}</div>
            </div>
          </div>
        )}

        <button
          onClick={handleLogout}
          className="p-2 hover:bg-blue-600 rounded-lg transition-colors ml-2 cursor-pointer mr-2"
          title="Logout"
        >
          <LogOut className="w-5 h-5 text-white hover:text-blue-200 transition-colors" />
        </button>
      </div>
    </header>
  );
}
