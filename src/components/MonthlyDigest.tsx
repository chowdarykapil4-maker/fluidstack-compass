import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Newspaper, ExternalLink, ChevronDown } from "lucide-react";

interface DigestItem {
  headline: string;
  summary: string;
  source: string;
  url: string;
  category: string;
}

interface Digest {
  week: string;
  label: string;
  quiet: boolean;
  summary: string;
  items: DigestItem[];
}

function CategoryPill({ category }: { category: string }) {
  const highlight = category === "funding" || category === "partnership";
  return (
    <span
      className={`text-[10px] rounded px-1.5 py-0.5 ${
        highlight ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
      }`}
    >
      {category}
    </span>
  );
}

function DigestItemRow({ item }: { item: DigestItem }) {
  return (
    <div className="border-t border-border pt-1.5 flex items-center gap-2 flex-wrap">
      <CategoryPill category={item.category} />
      {item.url ? (
        <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs text-foreground hover:underline truncate">
          {item.headline}
        </a>
      ) : (
        <span className="text-xs text-foreground truncate">{item.headline}</span>
      )}
      <span className="text-[10px] text-muted-foreground/50 flex items-center gap-0.5 ml-auto shrink-0">
        {item.source}
        {item.url && <ExternalLink className="inline" size={9} />}
      </span>
    </div>
  );
}

export default function MonthlyDigest() {
  const [digests, setDigests] = useState<Digest[] | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/news.json")
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data) => {
        if (data?.digests?.length) setDigests(data.digests);
      })
      .catch(() => {});
  }, []);

  if (!digests || digests.length === 0) return null;

  const latest = digests[0];
  const older = digests.slice(1);

  return (
    <Card className="bg-card border-border rounded-lg p-3 sm:p-4 space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Newspaper size={14} className="text-primary" />
          <span className="text-sm font-medium text-foreground">{latest.label}</span>
        </div>
        <span className="text-[10px] text-muted-foreground">Updated monthly</span>
      </div>

      {latest.quiet ? (
        <p className="text-sm text-muted-foreground italic text-center py-2">
          Quiet month — no major FluidStack news.
        </p>
      ) : (
        latest.items.map((item, i) => <DigestItemRow key={i} item={item} />)
      )}

      {older.length > 0 && (
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors pt-1">
            <ChevronDown size={12} className={`transition-transform ${open ? "rotate-180" : ""}`} />
            Previous months
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-1.5 pt-2">
            {older.map((d) =>
              d.items.map((item, j) => (
                <div key={`${d.week}-${j}`} className="flex items-center gap-2 border-t border-border pt-1.5">
                  <CategoryPill category={item.category} />
                  {item.url ? (
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs text-foreground hover:underline">
                      {item.headline}
                    </a>
                  ) : (
                    <span className="text-xs text-foreground">{item.headline}</span>
                  )}
                </div>
              ))
            )}
          </CollapsibleContent>
        </Collapsible>
      )}
    </Card>
  );
}
