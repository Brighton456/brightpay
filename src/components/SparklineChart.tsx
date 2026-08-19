import { useMemo } from "react";
export default function SparklineChart({ data, color = "#10b981", height = 32 }: { data: number[]; color?: string; height?: number }) {
  const path = useMemo(() => {
    if (data.length < 2) return "";
    const max = Math.max(...data, 1);
    const min = Math.min(...data, 0);
    const range = max - min || 1;
    const w = 100; const h = height;
    const step = w / (data.length - 1);
    return data.map((v, i) => `${i === 0 ? "M" : "L"} ${i * step} ${h - ((v - min) / range) * (h - 4) - 2}`).join(" ");
  }, [data, height]);
  if (!path) return null;
  return (
    <svg viewBox={`0 0 100 ${height}`} className="w-full" style={{ height }} preserveAspectRatio="none">
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
