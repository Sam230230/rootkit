import { notFound } from 'next/navigation';
import Rootkit from '@/components/rootkit';
import { isStage, parseSessionConfig } from '@/lib/learning';
export function generateStaticParams() { return ['0', '1', '2'].map(stage => ({ stage })); }
export default async function Page({ params, searchParams }: { params: Promise<{ stage: string }>; searchParams: Promise<{ count?: string | string[]; type?: string | string[] }> }) {
  const { stage: value } = await params;
  if (!/^[012]$/.test(value)) notFound();
  const stage = Number(value);
  if (!isStage(stage)) notFound();
  const config = parseSessionConfig(await searchParams);
  return <Rootkit key={stage} screen="learn" stage={stage} config={config} />;
}
