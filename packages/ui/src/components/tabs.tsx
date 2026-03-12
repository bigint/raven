"use client";

interface Tab {
  count?: number;
  label: string;
  value: string;
}

interface TabsProps {
  onChange: (value: string) => void;
  tabs: Tab[];
  value: string;
}

const Tabs = ({ onChange, tabs, value }: TabsProps) => (
  <div className="mb-6 flex gap-1 border-b border-border">
    {tabs.map((tab) => (
      <button
        className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
          value === tab.value
            ? "border-primary text-foreground"
            : "border-transparent text-muted-foreground hover:text-foreground"
        }`}
        key={tab.value}
        onClick={() => onChange(tab.value)}
        type="button"
      >
        {tab.label}
        {tab.count !== undefined && (
          <span
            className={`rounded-full px-1.5 py-0.5 text-xs ${
              value === tab.value
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {tab.count}
          </span>
        )}
      </button>
    ))}
  </div>
);

export { Tabs };
export type { Tab, TabsProps };
