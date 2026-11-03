import ShowForm from "@/components/admin/ShowForm";

export default function EditShowPage({ params }: { params: { id: string } }) {
  return <ShowForm showId={params.id} />;
}
