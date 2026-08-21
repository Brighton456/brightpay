import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ThumbsUp, ThumbsDown, MessageSquare, Star, CheckCircle } from "lucide-react";

export default function FeedbackWidget() {
  const [rating, setRating] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [helpful, setHelpful] = useState<"yes" | "no" | null>(null);

  if (submitted) {
    return (
      <Card className="border-green-500/30 bg-green-500/5">
        <CardContent className="p-6 text-center">
          <CheckCircle className="w-10 h-10 mx-auto text-green-500 mb-2" />
          <p className="font-medium">Thanks for your feedback!</p>
          <p className="text-sm text-muted-foreground mt-1">It helps us improve our documentation.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><MessageSquare className="w-4 h-4" /> Was this page helpful?</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button variant={helpful === "yes" ? "default" : "outline"} size="sm" onClick={() => setHelpful("yes")}><ThumbsUp className="w-4 h-4 mr-1" /> Yes</Button>
          <Button variant={helpful === "no" ? "default" : "outline"} size="sm" onClick={() => setHelpful("no")}><ThumbsDown className="w-4 h-4 mr-1" /> No</Button>
        </div>
        <div className="flex gap-1">
          <span className="text-sm text-muted-foreground mr-2">Rate this page:</span>
          {[1, 2, 3, 4, 5].map((s) => (
            <button key={s} onClick={() => setRating(s)}>
              <Star className={`w-5 h-5 ${s <= (rating || 0) ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground"}`} />
            </button>
          ))}
        </div>
        <Textarea placeholder="Tell us how we can improve this page..." rows={3} value={feedback} onChange={(e) => setFeedback(e.target.value)} />
        <Button size="sm" onClick={() => setSubmitted(true)} disabled={!helpful}>Submit Feedback</Button>
      </CardContent>
    </Card>
  );
}
