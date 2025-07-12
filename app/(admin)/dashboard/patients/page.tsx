
import PermissionGuard from "@/components/PermissionGuard";
import PatientsPage from "./patientsPage";

export default function Page() {
  return (
    <PermissionGuard permissions={["view-patient", "create-patient", "update-patient", "delete-patient", "show-patient"]}>
      <PatientsPage />
    </PermissionGuard>
  );
}
