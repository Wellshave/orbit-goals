import { Avatar } from "@/components/ui";
import type { Profile } from "@/lib/types";

/** Multi-select van teamleden via checkboxes (werkt zonder JavaScript). */
export function PeoplePicker({ name, members, selected = [], legend, exclude = [] }: { name: string; members: Profile[]; selected?: string[]; legend: string; exclude?: string[] }) {
  const list = members.filter((m) => !exclude.includes(m.id));
  return (
    <fieldset className="well p-2 max-h-56 overflow-y-auto">
      <legend className="sr-only">{legend}</legend>
      {list.length === 0 && <p className="text-xs text-muted p-2">Geen teamleden beschikbaar.</p>}
      <ul className="grid sm:grid-cols-2 gap-0.5">
        {list.map((m) => (
          <li key={m.id}>
            <label className="flex items-center gap-2.5 px-2 py-1.5 rounded-[4px] hover:bg-ice/5 cursor-pointer has-[:checked]:bg-cobalt/12">
              <input type="checkbox" name={name} value={m.id} defaultChecked={selected.includes(m.id)} className="accent-[#496CFF] size-4" />
              <Avatar name={m.full_name} src={m.avatar_url} size="xs" />
              <span className="min-w-0">
                <span className="block text-sm font-medium truncate">{m.full_name}</span>
                <span className="block text-[0.6875rem] text-muted truncate">{m.job_title}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}
