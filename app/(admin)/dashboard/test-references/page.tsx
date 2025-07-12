
import PermissionGuard from "@/components/PermissionGuard";
import TestReferencePage from "./testReferences";

export default function Page() {
  return (
    <PermissionGuard permissions={["view-test-references", "create-test-references", "update-test-references", "delete-test-references", "show-test-references"]}>
      <TestReferencePage />
    </PermissionGuard>
  );
}
