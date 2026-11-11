import { Suspense } from "react";
import { notFound } from "next/navigation";
import { PollDetail } from "@/components/poll-detail";

async function PollRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[1-9]\d*$/.test(id)) notFound();
  return <PollDetail pollId={BigInt(id)} />;
}

export default function PollPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<main className="shell detail"><p>Loading poll…</p></main>}>
      <PollRoute params={params} />
    </Suspense>
  );
}
