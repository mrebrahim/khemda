import { notFound } from "next/navigation";
import NavBar from "@/components/NavBar";
import EditStudentForm, { type StudentData } from "@/components/EditStudentForm";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function EditStudentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const studentId = Number(id);
  if (!Number.isInteger(studentId)) notFound();

  const supabase = await createClient();
  const { data } = await supabase
    .from("students")
    .select(
      "id, full_name, phone, father_phone, mother_phone, address, birth_date, confession_father, notes, is_active, classes(area, stage)",
    )
    .eq("id", studentId)
    .maybeSingle();

  if (!data) notFound();

  const cls = data.classes as unknown as { area: string; stage: string } | null;

  const student: StudentData = {
    id: data.id,
    full_name: data.full_name,
    area: cls?.area ?? "",
    stage: cls?.stage ?? "",
    phone: data.phone,
    father_phone: data.father_phone,
    mother_phone: data.mother_phone,
    address: data.address,
    birth_date: data.birth_date,
    confession_father: data.confession_father,
    notes: data.notes,
    is_active: data.is_active,
  };

  return (
    <>
      <NavBar title="تعديل بيانات المخدوم" back={`/students/${studentId}`} />
      <main className="max-w-xl mx-auto px-3 py-4">
        <EditStudentForm student={student} />
      </main>
    </>
  );
}
