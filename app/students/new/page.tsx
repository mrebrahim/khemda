import NavBar from "@/components/NavBar";
import NewStudentForm from "@/components/NewStudentForm";

export const dynamic = "force-dynamic";

export default function NewStudentPage() {
  return (
    <>
      <NavBar title="إضافة مخدوم جديد" back="/students" />
      <main className="max-w-lg mx-auto px-3 py-4">
        <NewStudentForm />
      </main>
    </>
  );
}
