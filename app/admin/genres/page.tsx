import { redirect } from "next/navigation";

/** Genres are one kind of taxonomy term; they're managed with all the others now. */
export default function AdminGenresPage() {
  redirect("/admin/taxonomy?kind=GENRE");
}
