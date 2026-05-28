"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

/* Displacement map for the subtle barrel/fisheye lens.
   Black base + screen-blended R(x) and G(y) gradients →
   R varies left→right, G top→bottom, center ≈ neutral (128).
   Nonlinear stops bias the curvature toward the edges. */
const LENS_MAP =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='220'>
<defs>
<linearGradient id='x' x1='0' y1='0' x2='1' y2='0'>
<stop offset='0' stop-color='rgb(0,0,0)'/>
<stop offset='0.3' stop-color='rgb(100,0,0)'/>
<stop offset='0.5' stop-color='rgb(128,0,0)'/>
<stop offset='0.7' stop-color='rgb(156,0,0)'/>
<stop offset='1' stop-color='rgb(255,0,0)'/>
</linearGradient>
<linearGradient id='y' x1='0' y1='0' x2='0' y2='1'>
<stop offset='0' stop-color='rgb(0,0,0)'/>
<stop offset='0.3' stop-color='rgb(0,100,0)'/>
<stop offset='0.5' stop-color='rgb(0,128,0)'/>
<stop offset='0.7' stop-color='rgb(0,156,0)'/>
<stop offset='1' stop-color='rgb(0,255,0)'/>
</linearGradient>
</defs>
<rect width='100%' height='100%' fill='black'/>
<rect width='100%' height='100%' fill='url(#x)' style='mix-blend-mode:screen'/>
<rect width='100%' height='100%' fill='url(#y)' style='mix-blend-mode:screen'/>
</svg>`,
  );

export type FxSettings = {
  lens: boolean; // subtle barrel on media (posters/trailers)
  aberration: boolean; // faint global RGB-split overlay
  fisheye: boolean; // experimental global lens curvature
};

const DEFAULTS: FxSettings = { lens: true, aberration: true, fisheye: false };
const STORAGE_KEY = "wtw:fx";

type FxContextValue = FxSettings & {
  set: (patch: Partial<FxSettings>) => void;
  ready: boolean;
};

const FxContext = createContext<FxContextValue | null>(null);

export function useFx(): FxContextValue {
  const ctx = useContext(FxContext);
  if (!ctx) throw new Error("useFx must be used within <FxLayer>");
  return ctx;
}

export function FxLayer({ children }: { children: React.ReactNode }) {
  const [fx, setFx] = useState<FxSettings>(DEFAULTS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setFx({ ...DEFAULTS, ...JSON.parse(raw) });
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  const set = useCallback((patch: Partial<FxSettings>) => {
    setFx((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  return (
    <FxContext.Provider value={{ ...fx, set, ready }}>
      {/* Hidden SVG holding the reusable lens filter */}
      <svg
        aria-hidden
        width="0"
        height="0"
        style={{ position: "absolute", width: 0, height: 0 }}
      >
        <defs>
          <filter
            id="wtw-lens"
            x="-8%"
            y="-8%"
            width="116%"
            height="116%"
            colorInterpolationFilters="sRGB"
          >
            <feImage
              href={LENS_MAP}
              result="map"
              preserveAspectRatio="none"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="map"
              scale="9"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      <div className={ready && fx.fisheye ? "fisheye" : undefined}>
        {children}
      </div>

      {ready && fx.aberration ? <div className="ab-overlay" aria-hidden /> : null}
    </FxContext.Provider>
  );
}
