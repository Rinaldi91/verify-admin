
import PermissionGuard from "@/components/PermissionGuard";
import UsersPage from "./usersPage";

export default function Page() {
  return (
    <PermissionGuard permissions={["view-users", "create-users", "update-users", "delete-users", "show-users"]}>
      <UsersPage />
    </PermissionGuard>
  );
}
