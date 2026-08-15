"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import worldTopology from "world-atlas/countries-110m.json";
import { SUPPORTED_COUNTRIES } from "@/lib/data/country-geo";

const worldGeo = feature(
  worldTopology as unknown as Topology,
  (worldTopology as unknown as Topology).objects.countries as GeometryCollection
);

export interface CountryCount {
  country: string;
  count: number;
}

export function WorldMapExplorer({ countryCounts }: { countryCounts: CountryCount[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selected = searchParams.get("country");

  const countByName = useMemo(() => new Map(countryCounts.map((c) => [c.country, c.count])), [countryCounts]);
  const maxCount = Math.max(1, ...countryCounts.map((c) => c.count));
  const supportedIds = useMemo(() => new Set(SUPPORTED_COUNTRIES.map((c) => c.numericId)), []);

  function selectCountry(name: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (selected === name) {
      params.delete("country");
    } else {
      params.set("country", name);
    }
    router.push(`/universities${params.toString() ? `?${params.toString()}` : ""}`, { scroll: false });
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border bg-[oklch(0.13_0.02_264)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,oklch(0.3_0.08_264/0.5),transparent_60%)]"
      />
      <ComposableMap
        projection="geoNaturalEarth1"
        projectionConfig={{ scale: 155 }}
        width={800}
        height={420}
        style={{ width: "100%", height: "auto" }}
        className="relative"
      >
        <Geographies geography={worldGeo}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const isSupported = supportedIds.has(String(geo.id));
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  tabIndex={-1}
                  style={{
                    default: {
                      fill: isSupported ? "oklch(0.32 0.06 264)" : "oklch(0.22 0.01 264)",
                      stroke: "oklch(0.13 0.02 264)",
                      strokeWidth: 0.5,
                      outline: "none",
                    },
                    hover: { fill: isSupported ? "oklch(0.4 0.08 264)" : "oklch(0.26 0.01 264)", outline: "none" },
                    pressed: { fill: "oklch(0.4 0.08 264)", outline: "none" },
                  }}
                />
              );
            })
          }
        </Geographies>
        {SUPPORTED_COUNTRIES.map((c) => {
          const count = countByName.get(c.name) ?? 0;
          const isSelected = selected === c.name;
          const radius = 3 + (count / maxCount) * 6;
          return (
            <Marker
              key={c.name}
              coordinates={[c.centroid[1], c.centroid[0]]}
              onClick={() => selectCountry(c.name)}
              className="cursor-pointer outline-none"
            >
              {isSelected ? (
                <circle r={radius + 6} className="fill-primary/25 motion-safe:animate-ping" />
              ) : null}
              <circle
                r={radius}
                className={isSelected ? "fill-primary" : "fill-primary/70 hover:fill-primary"}
                stroke="oklch(0.13 0.02 264)"
                strokeWidth={1}
              />
              <text
                textAnchor="middle"
                y={-radius - 6}
                className={`pointer-events-none select-none font-medium ${isSelected ? "fill-white" : "fill-white/70"}`}
                style={{ fontSize: 10 }}
              >
                {c.name}
              </text>
            </Marker>
          );
        })}
      </ComposableMap>
      <p className="relative border-t border-white/10 px-4 py-2.5 text-center text-xs text-white/50">
        {countryCounts.length > 0
          ? "Tap a region to explore its universities."
          : "University data is still being added for these regions."}
      </p>
    </div>
  );
}
