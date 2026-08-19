import { Share2 } from "lucide-react";
import { toast } from "sonner";
export default function ShareButton({ title, text, url }: { title: string; text: string; url?: string }) {
  const share = async () => {
    const shareUrl = url || window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title, text, url: shareUrl }); } catch {}
    } else {
      navigator.clipboard.writeText(`${title}\n${text}\n${shareUrl}`);
      toast.success("Copied to clipboard!");
    }
  };
  return (
    <button onClick={share} className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 btn-press">
      <Share2 className="w-3 h-3" /> Share
    </button>
  );
}
