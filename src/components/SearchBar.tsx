import { Search, X } from "lucide-react";

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
};

export default function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <label className="search-bar" aria-label="Search folders">
      <Search size={17} />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search..."
        spellCheck={false}
      />
      {value ? (
        <button
          className="icon-button quiet"
          type="button"
          title="Clear search"
          onClick={() => onChange("")}
        >
          <X size={15} />
        </button>
      ) : null}
    </label>
  );
}
