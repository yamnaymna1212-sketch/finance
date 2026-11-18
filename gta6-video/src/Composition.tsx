import React from "react";
import {
  AbsoluteFill,
  Composition,
  Easing,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Audio } from "@remotion/media";
import { loadFont } from "@remotion/google-fonts/Inter";
import durations from "./durations.json";
import lines from "../scripts/lines.json";

const { fontFamily } = loadFont("normal", { weights: ["500", "700", "900"], subsets: ["latin"] });

const FPS = 30;
const PAD = 6; // frames of breathing room after each line
type Key = keyof typeof durations;
const ORDER = lines.map((l) => l[0]) as Key[];
const TEXT = Object.fromEntries(lines) as Record<Key, string>;
const LEN = Object.fromEntries(
  ORDER.map((k) => [k, Math.ceil(durations[k] * FPS) + PAD]),
) as Record<Key, number>;
const TOTAL = ORDER.reduce((a, k) => a + LEN[k], 0);

// ---- the math (kept in code so the numbers on screen are always consistent)
const NIGHT = 120;
const PER_YEAR = NIGHT * 52; // 6,240
const YEARS = 12;
const SPENT = PER_YEAR * YEARS; // 74,880
const fv = (years: number) => {
  let v = 0;
  for (let i = 0; i < years; i++) v = (v + PER_YEAR) * 1.1;
  return v;
};
const AFTER12 = PER_YEAR * ((1.1 ** 12 - 1) / 0.1); // ≈ 133,438 (end-of-year deposits)
const FINAL = AFTER12 * 1.1 ** 30; // ≈ 2,328,000

const W = "#ffffff";
const DIM = "rgba(255,255,255,0.45)";
const GREEN = "#7CFFB2";
const glow = (r = 24, a = 0.55) => `drop-shadow(0 0 ${r}px rgba(255,255,255,${a}))`;
const ease = Easing.bezier(0.16, 1, 0.3, 1);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const money = (n: number) => "$" + Math.round(n).toLocaleString("en-US");

const useIn = (delay = 0, dur = 14) => {
  const f = useCurrentFrame();
  return interpolate(f, [delay, delay + dur], [0, 1], { ...clamp, easing: ease });
};

const Pop: React.FC<{ delay?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({
  delay = 0,
  children,
  style,
}) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f - delay, fps, config: { damping: 13, stiffness: 160 } });
  return (
    <div style={{ opacity: Math.min(1, s * 1.5), scale: String(0.6 + 0.4 * s), ...style }}>{children}</div>
  );
};

const Counter: React.FC<{ to: number; from?: number; start?: number; dur?: number; size?: number; color?: string; suffix?: string }> = ({
  to,
  from = 0,
  start = 0,
  dur = 40,
  size = 150,
  color = W,
  suffix = "",
}) => {
  const f = useCurrentFrame();
  const v = interpolate(f, [start, start + dur], [from, to], { ...clamp, easing: Easing.out(Easing.cubic) });
  return (
    <div
      style={{
        fontSize: size,
        fontWeight: 900,
        color,
        letterSpacing: -3,
        fontVariantNumeric: "tabular-nums",
        filter: glow(30, 0.45),
      }}
    >
      {money(v)}
      {suffix}
    </div>
  );
};

const Title: React.FC<{ children: React.ReactNode; size?: number }> = ({ children, size = 78 }) => {
  const o = useIn(0, 12);
  return (
    <div
      style={{
        position: "absolute",
        top: 330,
        width: "100%",
        textAlign: "center",
        fontSize: size,
        fontWeight: 900,
        color: W,
        textTransform: "uppercase",
        letterSpacing: -1,
        opacity: o,
        translate: `0 ${(1 - o) * 30}px`,
        filter: glow(18, 0.35),
        padding: "0 60px",
        boxSizing: "border-box",
      }}
    >
      {children}
    </div>
  );
};

const Label: React.FC<{ children: React.ReactNode; color?: string; size?: number }> = ({ children, color = DIM, size = 30 }) => (
  <div style={{ fontSize: size, fontWeight: 700, letterSpacing: 6, color, textTransform: "uppercase" }}>{children}</div>
);

/** Glowing minimal person, like the reference style. */
const Person: React.FC<{ scale?: number; label?: string; dim?: boolean }> = ({ scale = 1, label, dim }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18 * scale }}>
    <svg width={140 * scale} height={190 * scale} viewBox="0 0 140 190" style={{ filter: dim ? undefined : glow(26, 0.7) }}>
      <circle cx="70" cy="40" r="34" fill={dim ? "#555" : W} />
      <path d="M20 190 V118 a50 44 0 0 1 100 0 V190 Z" fill={dim ? "#555" : W} />
    </svg>
    {label && <Label size={24 * scale}>{label}</Label>}
  </div>
);

const Ground: React.FC<{ y?: number }> = ({ y = 1240 }) => {
  const o = useIn(0, 20);
  return (
    <div
      style={{
        position: "absolute",
        top: y,
        left: 0,
        width: `${o * 100}%`,
        borderTop: "4px dashed rgba(255,255,255,0.35)",
      }}
    />
  );
};

const LogoCard: React.FC<{ width?: number }> = ({ width = 520 }) => (
  <div
    style={{
      width,
      borderRadius: 26,
      border: "6px solid #fff",
      overflow: "hidden",
      boxShadow: "0 0 60px rgba(255,255,255,0.35), 0 0 140px rgba(255,90,200,0.25)",
      lineHeight: 0,
    }}
  >
    <Img src={staticFile("gta6-logo.png")} style={{ width: "100%" }} />
  </div>
);

const Chip: React.FC<{ label: string; value: string; delay: number }> = ({ label, value, delay }) => (
  <Pop delay={delay}>
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        width: 720,
        padding: "26px 40px",
        border: "3px solid rgba(255,255,255,0.8)",
        borderRadius: 999,
        fontSize: 48,
        fontWeight: 700,
        color: W,
        boxShadow: "0 0 30px rgba(255,255,255,0.18)",
      }}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  </Pop>
);

const Center: React.FC<{ children: React.ReactNode; top?: number; gap?: number }> = ({ children, top = 520, gap = 30 }) => (
  <div
    style={{
      position: "absolute",
      top,
      width: "100%",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap,
    }}
  >
    {children}
  </div>
);

// ----------------------------------------------------------------- scenes

const Hook = () => {
  const f = useCurrentFrame();
  return (
    <>
      <Title size={92}>Why buying GTA 6</Title>
      <Center top={490} gap={36}>
        <Pop delay={2}>
          <LogoCard width={560} />
        </Pop>
        <Pop delay={10}>
          <Counter to={FINAL} start={10} dur={70} size={150} color={GREEN} />
        </Pop>
      </Center>
      <div style={{ position: "absolute", top: 1180, width: "100%", display: "flex", justifyContent: "center" }}>
        <Pop delay={16}>
          <Person label="you" scale={0.85} />
        </Pop>
      </div>
      {/* falling coins */}
      {Array.from({ length: 8 }).map((_, i) => {
        const t = f - 20 - i * 6;
        const y = interpolate(t, [0, 30], [1080, 1300], clamp);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 540 + ((i * 53) % 220) - 110,
              top: y,
              opacity: t > 0 && t < 30 ? 1 : 0,
              width: 46,
              height: 46,
              borderRadius: 99,
              border: "4px solid #fff",
              color: W,
              fontSize: 26,
              fontWeight: 900,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              filter: glow(10, 0.6),
            }}
          >
            $
          </div>
        );
      })}
      <Ground y={1365} />
    </>
  );
};

const Price = () => (
  <>
    <Title>The math</Title>
    <Center top={540} gap={44}>
      <Pop delay={0}>
        <LogoCard width={420} />
      </Pop>
      <div style={{ display: "flex", alignItems: "center", gap: 40, color: W, fontWeight: 900 }}>
        <Pop delay={20}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 130, filter: glow() }}>$80</div>
            <Label>price</Label>
          </div>
        </Pop>
        <Pop delay={55}>
          <div style={{ fontSize: 100, color: DIM }}>÷</div>
        </Pop>
        <Pop delay={60}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 130, filter: glow() }}>200</div>
            <Label>hours</Label>
          </div>
        </Pop>
      </div>
      <Pop delay={110}>
        <div style={{ fontSize: 120, fontWeight: 900, color: GREEN, filter: glow(30, 0.4) }}>
          40¢<span style={{ fontSize: 60, color: DIM }}> / hour</span>
        </div>
      </Pop>
    </Center>
  </>
);

const Night = () => {
  const items: [string, number, number][] = [
    ["🍸 Bar tab", 45, 60],
    ["💵 Tip", 10, 85],
    ["🍔 DoorDash, 2 a.m.", 25, 108],
    ["🚗 Uber home", 40, 135],
  ];
  return (
    <>
      <Title>One night out in America</Title>
      <Center top={560} gap={28}>
        {items.map(([l, v, d]) => (
          <Chip key={l} label={l} value={"$" + v} delay={d} />
        ))}
        <Pop delay={170}>
          <div style={{ marginTop: 30, textAlign: "center" }}>
            <Label>total</Label>
            <Counter to={NIGHT} start={170} dur={25} size={180} color="#FF7A7A" />
          </div>
        </Pop>
      </Center>
    </>
  );
};

const Week = () => {
  const f = useCurrentFrame();
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  return (
    <>
      <Title>One night a week</Title>
      <Center top={600} gap={70}>
        <div style={{ display: "flex", gap: 22 }}>
          {days.map((d, i) => {
            const on = i === 5;
            const lit = on && f > 40;
            return (
              <Pop key={i} delay={4 + i * 4}>
                <div
                  style={{
                    width: 112,
                    height: 150,
                    borderRadius: 22,
                    border: `3px solid ${lit ? GREEN : "rgba(255,255,255,0.4)"}`,
                    background: lit ? "rgba(124,255,178,0.15)" : "transparent",
                    color: lit ? GREEN : W,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 52,
                    fontWeight: 900,
                    boxShadow: lit ? "0 0 40px rgba(124,255,178,0.5)" : undefined,
                  }}
                >
                  {d}
                  {lit && <div style={{ fontSize: 22, letterSpacing: 2 }}>GTA</div>}
                </div>
              </Pop>
            );
          })}
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 80 }}>
          <Pop delay={40}>
            <Person label="on the couch" />
          </Pop>
        </div>
        <Pop delay={95}>
          <div style={{ fontSize: 120, fontWeight: 900, color: GREEN, filter: glow(30, 0.4) }}>
            +$120<span style={{ fontSize: 56, color: DIM }}> / week</span>
          </div>
        </Pop>
      </Center>
    </>
  );
};

const Year = () => {
  const f = useCurrentFrame();
  return (
    <>
      <Title>Every year</Title>
      <Center top={560} gap={60}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(13, 52px)", gap: 14 }}>
          {Array.from({ length: 52 }).map((_, i) => {
            const on = f > 4 + i * 1.2;
            return (
              <div
                key={i}
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 99,
                  background: on ? GREEN : "rgba(255,255,255,0.12)",
                  boxShadow: on ? "0 0 16px rgba(124,255,178,0.6)" : undefined,
                }}
              />
            );
          })}
        </div>
        <Label>52 weeks × $120</Label>
        <Counter to={PER_YEAR} start={4} dur={62} size={170} color={GREEN} suffix="" />
        <Pop delay={80}>
          <div
            style={{
              marginTop: 30,
              padding: "22px 40px",
              borderRadius: 24,
              border: "3px solid rgba(255,255,255,0.6)",
              fontSize: 42,
              fontWeight: 700,
              color: W,
            }}
          >
            💬 “just one drink…”
          </div>
        </Pop>
      </Center>
    </>
  );
};

const Decade = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const barsStart = Math.round(4.6 * fps);
  return (
    <>
      <Title>It doesn't end after a year</Title>
      <Center top={570} gap={34}>
        <Pop delay={30}>
          <div style={{ display: "flex", alignItems: "center", gap: 30, color: W, fontSize: 54, fontWeight: 900 }}>
            <span>GTA 5</span>
            <span style={{ color: DIM, fontSize: 40 }}>2013 ──────▶ still played</span>
          </div>
        </Pop>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 16, height: 400, marginTop: 20 }}>
          {Array.from({ length: YEARS }).map((_, i) => {
            const p = interpolate(f, [barsStart + i * 6, barsStart + i * 6 + 12], [0, 1], { ...clamp, easing: ease });
            return (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 54,
                    height: ((i + 1) / YEARS) * 360 * p,
                    background: W,
                    borderRadius: 10,
                    boxShadow: "0 0 18px rgba(255,255,255,0.4)",
                  }}
                />
                <div style={{ color: DIM, fontSize: 22, fontWeight: 700 }}>Y{i + 1}</div>
              </div>
            );
          })}
        </div>
        <Label>never spent</Label>
        <Counter to={SPENT} start={barsStart} dur={80} size={140} />
      </Center>
    </>
  );
};

/** Line chart of the S&P 500 account balance. */
const GrowthChart: React.FC<{ years: number; reveal: number; maxY: number; highlight?: number }> = ({ years, reveal, maxY, highlight }) => {
  const w = 900;
  const h = 500;
  const pts = Array.from({ length: years + 1 }).map((_, i) => {
    const v = i <= 12 ? fv(i) : AFTER12 * 1.1 ** (i - 12);
    return [(i / years) * w, h - (v / maxY) * h] as const;
  });
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const area = `${d} L${w} ${h} L0 ${h} Z`;
  return (
    <svg width={w} height={h + 60} viewBox={`0 -20 ${w} ${h + 60}`} style={{ overflow: "visible" }}>
      <defs>
        <clipPath id="rv">
          <rect x={0} y={-40} width={w * reveal} height={h + 80} />
        </clipPath>
        <linearGradient id="ga" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={GREEN} stopOpacity={0.35} />
          <stop offset="1" stopColor={GREEN} stopOpacity={0} />
        </linearGradient>
      </defs>
      <line x1={0} y1={h} x2={w} y2={h} stroke="rgba(255,255,255,0.35)" strokeWidth={3} strokeDasharray="12 10" />
      {highlight !== undefined && (
        <line
          x1={(highlight / years) * w}
          x2={(highlight / years) * w}
          y1={0}
          y2={h}
          stroke="rgba(255,255,255,0.3)"
          strokeWidth={3}
          strokeDasharray="6 8"
        />
      )}
      <g clipPath="url(#rv)">
        <path d={area} fill="url(#ga)" />
        <path d={d} fill="none" stroke={GREEN} strokeWidth={9} strokeLinejoin="round" style={{ filter: "drop-shadow(0 0 14px rgba(124,255,178,0.8))" }} />
      </g>
      <text x={0} y={h + 50} fill={DIM} fontSize={28} fontWeight={700}>
        YEAR 0
      </text>
      <text x={w} y={h + 50} fill={DIM} fontSize={28} fontWeight={700} textAnchor="end">
        YEAR {years}
      </text>
    </svg>
  );
};

const Invest = () => {
  const f = useCurrentFrame();
  return (
    <>
      <Title>Invest it instead</Title>
      <Center top={520} gap={40}>
        <Pop delay={40}>
          <div
            style={{
              padding: "18px 44px",
              borderRadius: 999,
              border: `3px solid ${GREEN}`,
              color: GREEN,
              fontSize: 52,
              fontWeight: 900,
              boxShadow: "0 0 30px rgba(124,255,178,0.35)",
            }}
          >
            S&P 500 INDEX FUND
          </div>
        </Pop>
        <GrowthChart years={12} maxY={fv(12) * 1.05} reveal={interpolate(f, [60, 220], [0, 1], { ...clamp, easing: ease })} />
        <Pop delay={150}>
          <div style={{ fontSize: 110, fontWeight: 900, color: W, filter: glow() }}>
            ~10%<span style={{ fontSize: 50, color: DIM }}> / year avg.</span>
          </div>
        </Pop>
      </Center>
    </>
  );
};

const Grow = () => (
  <>
    <Title>After 12 years</Title>
    <Center top={560} gap={40}>
      <GrowthChart years={12} maxY={fv(12) * 1.05} reveal={1} />
      <Label>you'd have</Label>
      <Counter from={SPENT} to={AFTER12} start={0} dur={60} size={170} color={GREEN} />
    </Center>
  </>
);

const Million = () => {
  const f = useCurrentFrame();
  return (
    <>
      <Title>Leave it 30 more years</Title>
      <Center top={560} gap={40}>
        <GrowthChart
          years={42}
          maxY={FINAL * 1.05}
          highlight={12}
          reveal={interpolate(f, [0, 100], [12 / 42, 1], { ...clamp, easing: Easing.in(Easing.quad) })}
        />
        <Counter from={AFTER12} to={FINAL} start={0} dur={100} size={170} color={GREEN} />
      </Center>
    </>
  );
};

const Outro = () => {
  const f = useCurrentFrame();
  const strike = interpolate(f, [30, 45], [0, 100], clamp);
  return (
    <>
      <Center top={460} gap={50}>
        <Pop delay={0}>
          <LogoCard width={480} />
        </Pop>
        <Pop delay={10}>
          <div style={{ position: "relative", fontSize: 120, fontWeight: 900, color: DIM }}>
            costs $80
            <div
              style={{
                position: "absolute",
                left: 0,
                top: "52%",
                height: 12,
                width: `${strike}%`,
                background: "#FF5C5C",
                borderRadius: 6,
                boxShadow: "0 0 20px #FF5C5C",
              }}
            />
          </div>
        </Pop>
        <Pop delay={60}>
          <div style={{ textAlign: "center" }}>
            <Label color={W}>could make you</Label>
            <div style={{ fontSize: 210, fontWeight: 900, color: GREEN, filter: glow(40, 0.5), letterSpacing: -4 }}>$2.3M</div>
          </div>
        </Pop>
      </Center>
    </>
  );
};

const SCENES: Record<Key, React.FC> = {
  hook: Hook,
  price: Price,
  night: Night,
  week: Week,
  year: Year,
  decade: Decade,
  invest: Invest,
  grow: Grow,
  million: Million,
  outro: Outro,
};

/** Word-chunk captions timed by character share of the voice line. */
const Captions: React.FC<{ text: string; dur: number }> = ({ text, dur }) => {
  const f = useCurrentFrame();
  const shown = text
    .replace("S and P 500", "S&P 500")
    .replace(/two point three million( dollars)?/g, (_m, d) => (d ? "$2.3 million" : "$2.3 million"))
    .replace("eighty bucks", "$80")
    .replace("eighty dollars", "$80");
  const words = shown.split(" ");
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += 4) chunks.push(words.slice(i, i + 4).join(" "));
  const totalChars = chunks.reduce((a, c) => a + c.length + 1, 0);
  let acc = 0;
  let current = chunks[0];
  let startF = 0;
  for (const c of chunks) {
    const s = (acc / totalChars) * dur * FPS;
    if (f >= s) {
      current = c;
      startF = s;
    }
    acc += c.length + 1;
  }
  const s = interpolate(f - startF, [0, 5], [0.85, 1], clamp);
  return (
    <div
      style={{
        position: "absolute",
        top: 1480,
        width: "100%",
        padding: "0 80px",
        boxSizing: "border-box",
        textAlign: "center",
        fontSize: 62,
        fontWeight: 900,
        color: W,
        textTransform: "uppercase",
        lineHeight: 1.15,
        scale: String(s),
        textShadow: "0 0 24px rgba(0,0,0,0.9), 0 4px 0 #000",
      }}
    >
      {current}
    </div>
  );
};

const Background = () => (
  <AbsoluteFill
    style={{
      backgroundColor: "#000",
      backgroundImage:
        "radial-gradient(circle at 50% 45%, rgba(255,255,255,0.07), transparent 60%), radial-gradient(rgba(255,255,255,0.10) 1.5px, transparent 1.5px)",
      backgroundSize: "100% 100%, 44px 44px",
    }}
  />
);

export const GTA6Video: React.FC = () => {
  let from = 0;
  return (
    <AbsoluteFill style={{ fontFamily }}>
      <Background />
      {ORDER.map((k) => {
        const Scene = SCENES[k];
        const start = from;
        from += LEN[k];
        return (
          <Sequence key={k} name={k} from={start} durationInFrames={LEN[k]}>
            <SceneFade len={LEN[k]}>
              <Scene />
            </SceneFade>
            <Captions text={TEXT[k]} dur={durations[k]} />
            <Audio src={staticFile(`vo/${k}.mp3`)} />
          </Sequence>
        );
      })}
      <div
        style={{
          position: "absolute",
          bottom: 250,
          width: "100%",
          textAlign: "center",
          color: "rgba(255,255,255,0.35)",
          fontSize: 22,
          fontWeight: 500,
        }}
      >
        Illustration only · not financial advice · past S&P 500 returns don't guarantee future results
      </div>
    </AbsoluteFill>
  );
};

const SceneFade: React.FC<{ len: number; children: React.ReactNode }> = ({ len, children }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 6, len - 6, len], [0, 1, 1, 0], clamp);
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
};

export const MyComposition = () => (
  <Composition id="GTA6Video" component={GTA6Video} durationInFrames={TOTAL} fps={FPS} width={1080} height={1920} />
);
