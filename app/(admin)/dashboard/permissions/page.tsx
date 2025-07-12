
import PermissionGuard from "@/components/PermissionGuard";
import PermissionsPage from "./permissionsPage";

export default function Page() {
  return (
    <PermissionGuard permissions={["view-permissions", "create-permissions", "update-permissions", "delete-permissions", "show-permissions"]}>
      <PermissionsPage />
    </PermissionGuard>
  );
}
