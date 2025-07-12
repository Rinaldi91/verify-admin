
import PermissionGuard from "@/components/PermissionGuard";
import ExaminationPage from "./examinationsPage";

export default function Page() {
  return (
    <PermissionGuard permissions={["view-examinations", "create-examinations", "update-examinations", "delete-examinations", "show-patient"]}>
      <ExaminationPage />
    </PermissionGuard>
  );
}
