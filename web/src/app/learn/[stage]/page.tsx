import { notFound } from 'next/navigation';
import Rootkit from '@/components/rootkit';
import { isStage } from '@/lib/learning';
export function generateStaticParams() { return ['0', '1', '2'].map(stage => ({ stage })); }
export default async function Page({ params }: { params: Promise<{ stage: string }> }) {
  const { stage: value } = await params;
  if (!/^[012]$/.test(value)) notFound();
  const stage = Number(value);
  if (!isStage(stage)) notFound();
  return <Rootkit key={stage} screen="learn" stage={stage} />;
}
