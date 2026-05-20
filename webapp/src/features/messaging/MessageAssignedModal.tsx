import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Mail } from "lucide-react";
import { gamesApi } from "@/lib/resources";
import { ApiError } from "@/lib/api";
import { useTranslation } from "@/i18n/I18nProvider";
import type { GameMessageAssigned } from "@shared/types";
import type { ScheduleGame } from "@/features/schedule/scheduleTypes";
import { formatGameTime } from "@/features/schedule/scheduleTypes";
import { collectMessageRecipients } from "./recipients";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface MessageAssignedModalProps {
  game: ScheduleGame | null;
  onClose: () => void;
}

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "");
}

export function MessageAssignedModal({ game, onClose }: MessageAssignedModalProps) {
  const { t } = useTranslation();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    if (game) {
      setSubject("");
      setBody("");
    }
  }, [game?.id]);

  const { recipients, count: recipientCount } = useMemo(
    () => (game ? collectMessageRecipients(game) : { recipients: [], count: 0 }),
    [game]
  );

  const { mutate: send, isPending } = useMutation({
    mutationFn: (payload: GameMessageAssigned) =>
      gamesApi.messageAssigned(game!.id, payload),
    onSuccess: (result) => {
      toast.success(
        interpolate(t("message.sentSuccess"), { count: String(result.sent_count) })
      );
      onClose();
    },
    onError: (e: Error) => {
      if (e instanceof ApiError) {
        toast.error(e.message);
        return;
      }
      toast.error(e.message);
    },
  });

  const open = !!game;
  const { timeStr, dayAbbr } = game
    ? formatGameTime(game.date_time)
    : { timeStr: "", dayAbbr: "" };

  const handleSend = () => {
    if (!game || !subject.trim() || !body.trim()) return;
    send({ subject: subject.trim(), body: body.trim() });
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" />
            {t("message.title")}
          </DialogTitle>
          <DialogDescription>{t("message.description")}</DialogDescription>
        </DialogHeader>

        {game ? (
          <div className="space-y-4">
            <div className="rounded-md border border-border bg-muted/40 px-3 py-2.5 space-y-1">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Game
              </p>
              <p className="text-sm font-semibold">
                {game.home_team ?? "TBD"}{" "}
                <span className="font-normal text-muted-foreground">vs</span>{" "}
                {game.away_team ?? "TBD"}
              </p>
              <p className="text-xs text-muted-foreground">
                {dayAbbr} · {timeStr}
                {game.venue ? ` · ${game.venue.name}` : ""}
              </p>
            </div>

            <div className="space-y-2">
              <div>
                <Label className="text-sm font-medium">{t("message.recipients")}</Label>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {t("message.recipientHint")}
                </p>
              </div>
              <div className="rounded-md border border-border bg-card max-h-[140px] overflow-y-auto">
                {recipientCount === 0 ? (
                  <p className="px-3 py-4 text-xs text-muted-foreground text-center">
                    {t("message.noRecipients")}
                  </p>
                ) : (
                  <ul className="divide-y divide-border">
                    {recipients.map((r) => (
                      <li key={r.id} className="px-3 py-2">
                        <p className="text-sm font-medium leading-tight">{r.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{r.email}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {recipientCount > 0 ? (
                <p className="text-[11px] text-muted-foreground">
                  {recipientCount} recipient{recipientCount !== 1 ? "s" : ""}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="msg-subject">{t("message.subject")}</Label>
              <Input
                id="msg-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={t("message.subjectPlaceholder")}
                maxLength={200}
                disabled={isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="msg-body">{t("message.body")}</Label>
              <Textarea
                id="msg-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={t("message.bodyPlaceholder")}
                rows={5}
                maxLength={5000}
                disabled={isPending}
                className="resize-y min-h-[100px]"
              />
            </div>
          </div>
        ) : null}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            {t("message.cancel")}
          </Button>
          <Button
            onClick={handleSend}
            disabled={!game || !subject.trim() || !body.trim() || isPending || recipientCount === 0}
            className="gap-1.5"
          >
            {isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {t("message.sending")}
              </>
            ) : (
              <>
                <Mail className="h-3.5 w-3.5" />
                {t("message.send")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
