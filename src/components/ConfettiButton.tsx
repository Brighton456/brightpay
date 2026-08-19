import { useCallback } from "react";
export default function ConfettiButton({ children, onClick, className = "" }: { children: React.ReactNode; onClick?: () => void; className?: string }) {
  const fire = useCallback(() => {
    const colors = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];
    for (let i = 0; i < 30; i++) {
      const el = document.createElement("div");
      el.style.cssText = `position:fixed;width:8px;height:8px;border-radius:50%;background:${colors[i % colors.length]};z-index:9999;pointer-events:none;top:50%;left:50%;`;
      document.body.appendChild(el);
      const angle = (Math.PI * 2 * i) / 30;
      const dist = 80 + Math.random() * 120;
      el.animate([
        { transform: "translate(-50%, -50%) scale(1)", opacity: 1 },
        { transform: `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist - 60}px) scale(0)`, opacity: 0 }
      ], { duration: 600 + Math.random() * 400, easing: "cubic-bezier(0,.9,.3,1)" }).onfinish = () => el.remove();
    }
    onClick?.();
  }, [onClick]);
  return <button onClick={fire} className={className}>{children}</button>;
}
