
import PermissionGuard from "@/components/PermissionGuard";
import RolesPage from "./rolesPage";

export default function Page() {
  return (
    <PermissionGuard permissions={["view-roles", "create-roles", "update-roles", "delete-roles", "show-roles"]}>
      <RolesPage />
    </PermissionGuard>
  );
}
