import type { AssigningFee } from "@shared/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface AssigningFeeCellProps {
  value: AssigningFee;
  onChange: (next: AssigningFee) => void;
}

export function AssigningFeeCell({ value, onChange }: AssigningFeeCellProps) {
  return (
    <div className="flex items-center gap-1 min-w-[7rem]">
      <Input
        type="number"
        min={0}
        step={value.mode === "percent" ? 1 : 0.01}
        className="h-8 w-14 text-sm px-1.5"
        value={value.amount}
        onChange={(e) =>
          onChange({ ...value, amount: Number(e.target.value) || 0 })
        }
      />
      <RadioGroup
        value={value.mode}
        onValueChange={(m) =>
          onChange({ ...value, mode: m === "flat" ? "flat" : "percent" })
        }
        className="flex flex-col gap-0"
      >
        <div className="flex items-center gap-0.5">
          <RadioGroupItem value="flat" id={`af-flat-${value.amount}`} className="h-3 w-3" />
          <Label htmlFor={`af-flat-${value.amount}`} className="text-[10px] font-normal cursor-pointer">
            $
          </Label>
        </div>
        <div className="flex items-center gap-0.5">
          <RadioGroupItem value="percent" id={`af-pct-${value.amount}`} className="h-3 w-3" />
          <Label htmlFor={`af-pct-${value.amount}`} className="text-[10px] font-normal cursor-pointer">
            %
          </Label>
        </div>
      </RadioGroup>
    </div>
  );
}
