import { redirect } from "next/navigation";

export default async function LegacyExamStartPage() {
  redirect("/courses/system_design/exams");
}
