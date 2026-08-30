import { notFound } from "next/navigation";
import { WorldMapExplorer } from "@/features/universities/world-map-explorer";
import { SUPPORTED_COUNTRIES } from "@/lib/data/country-geo";
import { PreviewShell } from "../preview-shell";
import { FIXTURE_PROFILE_SIGNAL } from "@/lib/dev/fixtures";
import type { UniversityMapPin } from "@/lib/universities/map-pins";

// Dev-only harness for the 2026-08-31 map work (country fly-in + university pins + hover
// card). Real coordinates for real universities, so the pin placement being right is
// actually verifiable here rather than only against a live database — a fabricated
// coordinate would make this preview prove nothing.
const UK_PINS: UniversityMapPin[] = [
  { id: "p1", name: "University of Oxford", city: "Oxford", latitude: 51.7548, longitude: -1.2544, qsRank: "3", imageUrl: null },
  { id: "p2", name: "University of Cambridge", city: "Cambridge", latitude: 52.2043, longitude: 0.1149, qsRank: "5", imageUrl: null },
  { id: "p3", name: "Imperial College London", city: "London", latitude: 51.4988, longitude: -0.1749, qsRank: "2", imageUrl: null },
  { id: "p4", name: "London School of Economics", city: "London", latitude: 51.5144, longitude: -0.1165, qsRank: "50", imageUrl: null },
  { id: "p5", name: "University of Edinburgh", city: "Edinburgh", latitude: 55.9445, longitude: -3.1892, qsRank: "27", imageUrl: null },
  { id: "p6", name: "University of Manchester", city: "Manchester", latitude: 53.4668, longitude: -2.2339, qsRank: "34", imageUrl: null },
  { id: "p7", name: "University of Bristol", city: "Bristol", latitude: 51.4585, longitude: -2.6021, qsRank: "54", imageUrl: null },
  { id: "p8", name: "University of Glasgow", city: "Glasgow", latitude: 55.8721, longitude: -4.2882, qsRank: "78", imageUrl: null },
  { id: "p9", name: "Durham University", city: "Durham", latitude: 54.7645, longitude: -1.5760, qsRank: "89", imageUrl: null },
  { id: "p10", name: "University of Warwick", city: "Coventry", latitude: 52.3793, longitude: -1.5615, qsRank: "69", imageUrl: null },
];

const COUNTRY_COUNTS = SUPPORTED_COUNTRIES.map((c, i) => ({ country: c.name, count: [12, 8, 5, 4, 3, 21, 17][i % 7] ?? 1 }));

export default function MapPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <PreviewShell signal={FIXTURE_PROFILE_SIGNAL}>
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Map harness. Append <code>?country=United Kingdom</code> to the URL to see the fly-in and pins —
          the map reads the same <code>?country=</code> param the real explorer does.
        </p>
        <WorldMapExplorer countryCounts={COUNTRY_COUNTS} pins={UK_PINS} />
      </div>
    </PreviewShell>
  );
}
