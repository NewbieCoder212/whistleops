import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarPlus,
  Copy,
  Download,
  Link2,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { calendarApi } from "@/lib/resources";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

async function copyText(text: string, successMessage: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(successMessage);
  } catch {
    toast.error("Could not copy to clipboard");
  }
}

export function CalendarSubscribeMenu() {
  const qc = useQueryClient();
  const [regenerateOpen, setRegenerateOpen] = useState(false);

  const { data: feed, isLoading } = useQuery({
    queryKey: ["calendar", "feed-url"],
    queryFn: () => calendarApi.getFeedUrl(),
  });

  const { mutate: regenerate, isPending: isRegenerating } = useMutation({
    mutationFn: () => calendarApi.regenerateToken(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calendar", "feed-url"] });
      setRegenerateOpen(false);
      toast.success("Calendar link regenerated");
    },
    onError: () => toast.error("Could not regenerate calendar link"),
  });

  const handleDownload = async () => {
    if (!feed?.feedUrl) return;
    try {
      const response = await fetch(feed.feedUrl);
      if (!response.ok) throw new Error("Download failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "whistleops-schedule.ics";
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success("Calendar file downloaded");
    } catch {
      toast.error("Could not download calendar file");
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5" disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CalendarPlus className="h-4 w-4" />
            )}
            Add to calendar
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem
            disabled={!feed?.webcalUrl}
            onClick={() =>
              feed?.webcalUrl
                ? copyText(feed.webcalUrl, "Subscription link copied")
                : undefined
            }
          >
            <Link2 className="h-4 w-4 mr-2" />
            Copy subscription link
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!feed?.feedUrl}
            onClick={() =>
              feed?.feedUrl ? copyText(feed.feedUrl, "HTTPS link copied") : undefined
            }
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy HTTPS link
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!feed?.feedUrl} onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download .ics file
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setRegenerateOpen(true)}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Regenerate link
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={regenerateOpen} onOpenChange={setRegenerateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate calendar link?</AlertDialogTitle>
            <AlertDialogDescription>
              Your current subscription link will stop working. You will need to re-subscribe in
              Apple Calendar, Google Calendar, or Outlook.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRegenerating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isRegenerating}
              onClick={(e) => {
                e.preventDefault();
                regenerate();
              }}
            >
              {isRegenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Regenerate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
