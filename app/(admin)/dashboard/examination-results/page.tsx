
import PermissionGuard from "@/components/PermissionGuard";
import ExaminationResultsPage from "./examinationsPage";

export default function Page() {
  return (
    <PermissionGuard permissions={["view-examinations", "create-examinations", "update-examinations", "delete-examinations", "show-examinations"]}>
      <ExaminationResultsPage />
    </PermissionGuard>
  );
}
