import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'rootkit — 우리 회사 문서로 배우는 첫 실무', description: '빈칸 채우기부터 직접 작성까지, 신입사원을 위한 비즈니스 영어 온보딩 학습 키트.' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="ko"><head><link rel="stylesheet" crossOrigin="anonymous" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" /></head><body>{children}</body></html>;
}
