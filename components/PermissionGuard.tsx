"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";

interface PermissionGuardProps {
  permissions: string[];
  requireAll?: boolean;
  children: React.ReactNode;
}

export default function PermissionGuard({
  permissions,
  requireAll = false,
  children,
}: PermissionGuardProps) {
  const [userPermissions, setUserPermissions] = useState<string[] | null>(null);

  useEffect(() => {
    const raw = Cookies.get("permissions") || "[]";
    try {
      const parsed = JSON.parse(raw);
      setUserPermissions(parsed);
    } catch {
      setUserPermissions([]);
    }
  }, []);

  // Saat belum siap, bisa render loading state / null
  if (userPermissions === null) return null;

  const hasPermission = requireAll
    ? permissions.every((p) => userPermissions.includes(p))
    : permissions.some((p) => userPermissions.includes(p));

  if (!hasPermission) return null;

  return <>{children}</>;
}
