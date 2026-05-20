import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { profilesApi, certificationLevelsApi } from "@/lib/resources";
import type { Profile, CertificationLevel } from "@shared/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

type FormValues = {
  full_name: string;
  email: string;
  cell_phone: string;
  jersey_number: string;
  date_of_birth: string;
  role: "ADMIN" | "ASSIGNOR" | "FINANCE" | "OFFICIAL" | "SUPERVISOR";
  official_type: "REFEREE" | "LINESMAN" | "";
  official_level_id: string;
};

const ROLES = [
  { value: "OFFICIAL", label: "Official" },
  { value: "SUPERVISOR", label: "Supervisor" },
  { value: "ADMIN", label: "Admin" },
  { value: "ASSIGNOR", label: "Assignor" },
  { value: "FINANCE", label: "Finance" },
] as const;

const OFFICIAL_TYPES = [
  { value: "REFEREE", label: "Referee" },
  { value: "LINESMAN", label: "Linesman" },
] as const;

interface Props {
  open: boolean;
  onClose: () => void;
  profile?: Profile | null;
}

export function OfficialDrawer({ open, onClose, profile }: Props) {
  const qc = useQueryClient();
  const isEdit = !!profile;

  const { data: levels = [] } = useQuery<CertificationLevel[]>({
    queryKey: ["certification-levels"],
    queryFn: certificationLevelsApi.list,
  });

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    defaultValues: {
      full_name: "",
      email: "",
      cell_phone: "",
      jersey_number: "",
      date_of_birth: "",
      role: "OFFICIAL",
      official_type: "",
      official_level_id: "",
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (open) {
      reset({
        full_name: profile?.full_name ?? "",
        email: profile?.email ?? "",
        cell_phone: profile?.cell_phone ?? "",
        jersey_number: profile?.jersey_number ?? "",
        date_of_birth: profile?.date_of_birth ?? "",
        role: profile?.role ?? "OFFICIAL",
        official_type: (profile?.official_type as "REFEREE" | "LINESMAN" | "") ?? "",
        official_level_id: profile?.official_level_id ?? "",
      });
    }
  }, [open, profile, reset]);

  const createMutation = useMutation({
    mutationFn: profilesApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profiles"] });
      toast.success("Official profile created");
      onClose();
    },
    onError: (e: Error) =>
      toast.error(
        e.message.includes("401") || e.message.includes("Unauthenticated")
          ? "Admin sign-in required to create profiles."
          : e.message
      ),
  });

  const updateMutation = useMutation({
    mutationFn: (data: FormValues) =>
      profilesApi.update(profile!.id, {
        ...data,
        official_type: data.official_type || undefined,
        official_level_id: data.official_level_id || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profiles"] });
      toast.success("Profile updated");
      onClose();
    },
    onError: (e: Error) =>
      toast.error(
        e.message.includes("401") || e.message.includes("Unauthenticated")
          ? "Admin sign-in required to update profiles."
          : e.message
      ),
  });

  const [sendInvite, setSendInvite] = useState(true);

  const isPending = createMutation.isPending || updateMutation.isPending;
  const role = watch("role");
  const showOfficialFields = role === "OFFICIAL" || role === "SUPERVISOR";

  const onSubmit = (data: FormValues) => {
    if (isEdit) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate({
        full_name: data.full_name,
        email: data.email,
        cell_phone: data.cell_phone || undefined,
        jersey_number: data.jersey_number || undefined,
        date_of_birth: data.date_of_birth || undefined,
        role: data.role,
        official_type: data.official_type || undefined,
        official_level_id: data.official_level_id || undefined,
        send_invite:
          sendInvite && (data.role === "OFFICIAL" || data.role === "SUPERVISOR"),
      });
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle>{isEdit ? "Edit Official" : "Add Official"}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Update this official's profile information."
              : "Create a new roster profile. The official will be invited via email."}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Identity */}
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Identity
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="full_name">
                Full Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="full_name"
                placeholder="Jane Smith"
                {...register("full_name", { required: "Name is required" })}
                className={errors.full_name ? "border-destructive" : ""}
              />
              {errors.full_name && (
                <p className="text-xs text-destructive">{errors.full_name.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="jane@example.com"
                {...register("email", {
                  required: "Email is required",
                  pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Invalid email" },
                })}
                className={errors.email ? "border-destructive" : ""}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cell_phone">Cell Phone</Label>
                <Input
                  id="cell_phone"
                  placeholder="(902) 555-0123"
                  {...register("cell_phone")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="jersey_number">Jersey #</Label>
                <Input
                  id="jersey_number"
                  placeholder="42"
                  {...register("jersey_number")}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="date_of_birth">Date of Birth</Label>
              <Input
                id="date_of_birth"
                type="date"
                {...register("date_of_birth")}
              />
            </div>
          </div>

          <Separator />

          {!isEdit && showOfficialFields ? (
            <div className="flex items-center gap-2 rounded-md border border-border px-3 py-2.5">
              <Checkbox
                id="send-invite-drawer"
                checked={sendInvite}
                onCheckedChange={(v) => setSendInvite(!!v)}
              />
              <Label htmlFor="send-invite-drawer" className="text-sm font-normal">
                Send login invite email
              </Label>
            </div>
          ) : null}

          {/* Role & Certification */}
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Role & Certification
            </p>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Controller
                name="role"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {showOfficialFields && (
              <>
                <div className="space-y-1.5">
                  <Label>Official Type</Label>
                  <Controller
                    name="official_type"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type…" />
                        </SelectTrigger>
                        <SelectContent>
                          {OFFICIAL_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Certification Level</Label>
                  <Controller
                    name="official_level_id"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              levels.length === 0 ? "No levels configured" : "Select level…"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {levels.map((lv) => (
                            <SelectItem key={lv.id} value={lv.id}>
                              {lv.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </>
            )}
          </div>

          <SheetFooter className="pt-4 gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending || (isEdit && !isDirty)}
              className="flex-1"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isEdit ? (
                "Save Changes"
              ) : (
                "Create Official"
              )}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
