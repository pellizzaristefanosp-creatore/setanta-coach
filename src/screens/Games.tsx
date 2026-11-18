import { useEffect, useMemo, useRef, useState } from "react";
import {
  checkOrder,
  gamePacks,
  shuffle,
  shuffledSteps,
  verdict,
  whoPoints,
  type OrderItem,
  type TrueFalseItem,
  type WhoItem,
} from "../lib/games";
import { episodesFor, type Episode } from "../data/episodes";
import { finishGame, useStore } from "../lib/store";
import { Icon, Progress, beep, unlockAudio } from "../ui";

type Game = "order" | "who" | "tf";
type Tagged<T> = T & { code: string };

const ALL = "tutte";

/** Ripasso a giochi: tre giochi sui concetti delle lezioni. */
export function Games() {
  const s = useStore();
  const packs = gamePacks();
  // di partenza: l'ultima lezione con almeno una parte fatta
  const started = packs.filter((p) => s.presentations.some((x) => x.code === p.code && x.steps.some((st) => st.done)));
  const [code, setCode] = useState<string>(() => started.at(-1)?.code ?? packs[0]?.code ?? ALL);
  const [game, setGame] = useState<Game | null>(null);
  const [seed, setSeed] = useState(() => Date.now() % 100000);

  const chosen = code === ALL ? packs : packs.filter((p) => p.code === code);
  const tag = <T,>(pick: (p: (typeof packs)[number]) => T[]) => chosen.flatMap((p) => pick(p).map((x) => ({ ...x, code: p.code })));
  const order = useMemo(() => shuffle(tag((p) => p.order), seed).slice(0, 3), [code, seed]); // eslint-disable-line react-hooks/exhaustive-deps
  const who = useMemo(() => shuffle(tag((p) => p.who), seed).slice(0, 6), [code, seed]); // eslint-disable-line react-hooks/exhaustive-deps
  const tf = useMemo(() => shuffle(tag((p) => p.truefalse), seed), [code, seed]); // eslint-disable-line react-hooks/exhaustive-deps

  if (packs.length === 0) return <p className="muted center">Nessun gioco disponibile per ora.</p>;

  const end = () => {
    setGame(null);
    setSeed((x) => x + 1);
  };
  if (game === "order") return <OrderGame items={order} seed={seed} onEnd={end} />;
  if (game === "who") return <WhoGame items={who} seed={seed} onEnd={end} />;
  if (game === "tf") return <TrueFalseGame items={tf} onEnd={end} />;

  return (
    <div className="stack">
      <div className="games-lessons" role="radiogroup" aria-label="Lezione">
        {packs.map((p) => (
          <button key={p.code} className={`chip ${code === p.code ? "on" : ""}`} role="radio" aria-checked={code === p.code} onClick={() => setCode(p.code)}>
            {p.code}
          </button>
        ))}
        <button className={`chip ${code === ALL ? "on" : ""}`} role="radio" aria-checked={code === ALL} onClick={() => setCode(ALL)}>
          Tutte
        </button>
      </div>
      {episodesFor(code === ALL ? null : code).map((e) => (
        <EpisodeCard key={e.src} episode={e} />
      ))}
      <GameCard
        emoji="🧩"
        title="Metti in ordine"
        text="Rimetti in fila i passaggi di un processo. Allena le sequenze che all'esame chiedono spesso."
        meta={`${order.length} ${order.length === 1 ? "sequenza" : "sequenze"}`}
        disabled={order.length === 0}
        onPlay={() => setGame("order")}
      />
      <GameCard
        emoji="🕵️"
        title="Chi sono?"
        text="Tre indizi, un concetto. Meno indizi usi, più punti fai."
        meta={`${who.length} indovinelli`}
        disabled={who.length === 0}
        onPlay={() => setGame("who")}
      />
      <GameCard
        emoji="⏱️"
        title="Vero o falso · 60 secondi"
        text="Quante ne azzecchi in un minuto? Le frasi false sono gli errori tipici."
        meta={`${tf.length} frasi`}
        disabled={tf.length === 0}
        onPlay={() => {
          unlockAudio();
          setGame("tf");
        }}
      />
    </div>
  );
}

function EpisodeCard({ episode }: { episode: Episode }) {
  return (
    <div className="card stack episode-card" style={{ gap: 10 }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <span className="tag">🎬 Puntata · lezione {episode.code}</span>
        <span className="tiny">{episode.minutes} min</span>
      </div>
      <video className="episode-video" src={episode.src} poster={episode.poster} controls playsInline preload="none" />
      <h2>{episode.title}</h2>
      <p className="muted">{episode.subtitle}</p>
    </div>
  );
}

function GameCard({ emoji, title, text, meta, disabled, onPlay }: { emoji: string; title: string; text: string; meta: string; disabled?: boolean; onPlay: () => void }) {
  return (
    <div className="card game-card">
      <span className="game-emoji" aria-hidden="true">{emoji}</span>
      <div className="stack" style={{ gap: 6, flex: 1 }}>
        <h2>{title}</h2>
        <p className="muted">{text}</p>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <span className="tiny">{meta}</span>
          <button className="btn primary sm" disabled={disabled} onClick={onPlay}>
            <Icon.play /> Gioca
          </button>
        </div>
      </div>
    </div>
  );
}

function Source({ code, slide }: { code: string; slide: number }) {
  return <span className="tiny">Lezione {code} · slide {slide}</span>;
}

function GameHeader({ title, round, total, onEnd }: { title: string; round: number; total: number; onEnd: () => void }) {
  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <span className="tag">{title}</span>
        <button className="btn ghost sm" onClick={onEnd} aria-label="Esci dal gioco">
          <Icon.close />
        </button>
      </div>
      <Progress value={round} max={total} size="thin" />
    </div>
  );
}

function Result({ title, right, total, unit, onAgain, onEnd, children }: { title: string; right: number; total: number; unit: string; onAgain: () => void; onEnd: () => void; children?: React.ReactNode }) {
  return (
    <div className="stack fade-in">
      <div className="card stack center">
        <span className="tag">{title}</span>
        <p className="big-num">
          {right}/{total}
        </p>
        <p className="muted">{unit}</p>
        <p style={{ fontWeight: 700 }}>{verdict(right, total)}</p>
        <div className="row" style={{ justifyContent: "center" }}>
          <button className="btn primary" onClick={onAgain}>Rigioca</button>
          <button className="btn ghost" onClick={onEnd}>Altri giochi</button>
        </div>
      </div>
      {children}
    </div>
  );
}

/* ——— Metti in ordine ——— */

function OrderGame({ items, seed, onEnd }: { items: Tagged<OrderItem>[]; seed: number; onEnd: () => void }) {
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  if (done) return <Result title="Metti in ordine" right={score} total={items.length} unit="sequenze perfette" onAgain={() => { setRound(0); setScore(0); setDone(false); }} onEnd={onEnd} />;
  const item = items[round]!;
  return (
    <div className="stack fade-in">
      <GameHeader title="Metti in ordine" round={round} total={items.length} onEnd={onEnd} />
      <OrderRound
        key={`${round}-${item.title}`}
        item={item}
        seed={seed + round}
        onNext={(perfect) => {
          const nextScore = score + (perfect ? 1 : 0);
          setScore(nextScore);
          if (round + 1 < items.length) setRound(round + 1);
          else {
            finishGame("order", nextScore, items.length);
            setDone(true);
          }
        }}
      />
    </div>
  );
}

function OrderRound({ item, seed, onNext }: { item: Tagged<OrderItem>; seed: number; onNext: (perfect: boolean) => void }) {
  const [pool, setPool] = useState(() => shuffledSteps(item.steps, seed));
  const [answer, setAnswer] = useState<string[]>([]);
  const [checked, setChecked] = useState<boolean[] | null>(null);
  const perfect = checked?.every(Boolean) ?? false;

  return (
    <div className="stack">
      <div className="card stack" style={{ gap: 8 }}>
        <h2>{item.title}</h2>
        <p className="tiny">Tocca i passaggi nell'ordine giusto. Tocca un passaggio messo per toglierlo.</p>
        <ol className="order-list" aria-label="Il tuo ordine">
          {item.steps.map((_, i) => {
            const step = answer[i];
            // si vedono solo i passaggi già messi e il prossimo posto libero: le scelte restano sullo schermo
            if (!step && i !== answer.length) return null;
            const state = checked ? (checked[i] ? "right" : "wrong") : "";
            return (
              <li key={i} className={`order-slot ${step ? "filled" : ""} ${state}`}>
                <span className="order-n">{i + 1}</span>
                {step ? (
                  <button
                    className="order-step"
                    disabled={!!checked}
                    onClick={() => {
                      setAnswer(answer.filter((x) => x !== step));
                      setPool([...pool, step]);
                    }}
                  >
                    {step}
                  </button>
                ) : (
                  <span className="order-empty">Tocca il passaggio n. {i + 1}</span>
                )}
              </li>
            );
          })}
        </ol>
      </div>
      {!checked && pool.length > 0 && (
        <div className="order-pool">
          {pool.map((step) => (
            <button
              key={step}
              className="chip order-chip"
              onClick={() => {
                setAnswer([...answer, step]);
                setPool(pool.filter((x) => x !== step));
              }}
            >
              {step}
            </button>
          ))}
        </div>
      )}
      {!checked && pool.length === 0 && (
        <button className="btn primary block" onClick={() => setChecked(checkOrder(answer, item.steps))}>
          Controlla
        </button>
      )}
      {checked && (
        <div className="card soft stack fade-in" style={{ gap: 8 }}>
          <p style={{ fontWeight: 750 }}>{perfect ? "✓ Ordine perfetto!" : `${checked.filter(Boolean).length} su ${checked.length} al posto giusto. L'ordine giusto:`}</p>
          {!perfect && (
            <ol className="order-correct">
              {item.steps.map((st) => (
                <li key={st}>{st}</li>
              ))}
            </ol>
          )}
          <Source code={item.code} slide={item.slide} />
          <button className="btn primary block" onClick={() => onNext(perfect)}>
            Avanti
          </button>
        </div>
      )}
    </div>
  );
}

/* ——— Chi sono? ——— */

function WhoGame({ items, seed, onEnd }: { items: Tagged<WhoItem>[]; seed: number; onEnd: () => void }) {
  const [round, setRound] = useState(0);
  const [points, setPoints] = useState(0);
  const [right, setRight] = useState(0);
  const [done, setDone] = useState(false);
  if (done)
    return (
      <Result title="Chi sono?" right={right} total={items.length} unit="concetti indovinati" onAgain={() => { setRound(0); setPoints(0); setRight(0); setDone(false); }} onEnd={onEnd}>
        <p className="muted center">Punti: {points} su {items.length * 3}</p>
      </Result>
    );
  const item = items[round]!;
  return (
    <div className="stack fade-in">
      <GameHeader title="Chi sono?" round={round} total={items.length} onEnd={onEnd} />
      <WhoRound
        key={`${round}-${item.answer}`}
        item={item}
        seed={seed + round}
        onNext={(p, ok) => {
          setPoints(points + p);
          const r = right + (ok ? 1 : 0);
          setRight(r);
          if (round + 1 < items.length) setRound(round + 1);
          else {
            finishGame("who", r, items.length);
            setDone(true);
          }
        }}
      />
    </div>
  );
}

function WhoRound({ item, seed, onNext }: { item: Tagged<WhoItem>; seed: number; onNext: (points: number, correct: boolean) => void }) {
  const [shown, setShown] = useState(1);
  const [picked, setPicked] = useState<string | null>(null);
  const options = useMemo(() => shuffle([item.answer, ...item.distractors], seed), [item, seed]);
  const correct = picked === item.answer;
  const pts = picked ? whoPoints(shown, correct) : 0;

  return (
    <div className="stack">
      <div className="card stack" style={{ gap: 10 }}>
        <p className="tiny">Indizio {Math.min(shown, 3)} di 3 · {whoPoints(shown, true)} punti se indovini ora</p>
        {item.clues.slice(0, picked ? 3 : shown).map((c, i) => (
          <p key={i} className={`who-clue ${i === shown - 1 && !picked ? "fresh" : ""}`}>
            {c}
          </p>
        ))}
        {!picked && shown < 3 && (
          <button className="btn ghost sm" onClick={() => setShown(shown + 1)}>
            Altro indizio
          </button>
        )}
      </div>
      <div className="stack" style={{ gap: 8 }}>
        {options.map((o) => {
          const state = picked ? (o === item.answer ? "right" : o === picked ? "wrong" : "") : "";
          return (
            <button key={o} className={`btn option block ${state}`} disabled={!!picked} onClick={() => setPicked(o)}>
              {o}
            </button>
          );
        })}
      </div>
      {picked && (
        <div className="card soft stack fade-in" style={{ gap: 8 }}>
          <p style={{ fontWeight: 750 }}>{correct ? `✓ Giusto! +${pts} ${pts === 1 ? "punto" : "punti"}` : `Era: ${item.answer}`}</p>
          <Source code={item.code} slide={item.slide} />
          <button className="btn primary block" onClick={() => onNext(pts, correct)}>
            Avanti
          </button>
        </div>
      )}
    </div>
  );
}

/* ——— Vero o falso a tempo ——— */

const TF_MS = 60_000;

function TrueFalseGame({ items, onEnd }: { items: Tagged<TrueFalseItem>[]; onEnd: () => void }) {
  const [start, setStart] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<{ item: Tagged<TrueFalseItem>; ok: boolean }[]>([]);
  const [flash, setFlash] = useState<{ ok: boolean; why: string } | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const saved = useRef(false);
  const left = Math.max(0, TF_MS - (now - start));
  const over = left === 0 || i >= items.length;

  useEffect(() => {
    if (over) return;
    const id = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(id);
  }, [over]);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const right = answers.filter((a) => a.ok).length;
  useEffect(() => {
    if (over && !saved.current) {
      saved.current = true;
      beep();
      finishGame("tf", right, answers.length);
    }
  }, [over, right, answers.length]);

  if (over) {
    const wrong = answers.filter((a) => !a.ok);
    return (
      <Result
        title="Vero o falso"
        right={right}
        total={answers.length}
        unit="risposte giuste in 60 secondi"
        onAgain={() => {
          saved.current = false;
          setStart(Date.now());
          setNow(Date.now());
          setI(0);
          setAnswers([]);
          setFlash(null);
        }}
        onEnd={onEnd}
      >
        {wrong.length > 0 && (
          <div className="card stack" style={{ gap: 10 }}>
            <h2>Da ripassare</h2>
            {wrong.map(({ item }) => (
              <div key={item.text} className="stack" style={{ gap: 2 }}>
                <p style={{ fontWeight: 650 }}>
                  {item.true ? "Vera" : "Falsa"}: {item.text}
                </p>
                <p className="muted">{item.why}</p>
                <Source code={item.code} slide={item.slide} />
              </div>
            ))}
          </div>
        )}
      </Result>
    );
  }

  const item = items[i]!;
  const answer = (value: boolean) => {
    if (flash) return;
    const ok = value === item.true;
    setAnswers([...answers, { item, ok }]);
    setFlash({ ok, why: item.why });
    timer.current = window.setTimeout(() => {
      setFlash(null);
      setI((x) => x + 1);
    }, ok ? 700 : 1600);
  };

  return (
    <div className="stack fade-in">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <span className="tag">Vero o falso</span>
        <span className={`tf-clock ${left < 10_000 ? "hot" : ""}`}>{Math.ceil(left / 1000)} s</span>
        <button className="btn ghost sm" onClick={onEnd} aria-label="Esci dal gioco">
          <Icon.close />
        </button>
      </div>
      <Progress value={TF_MS - left} max={TF_MS} size="thin" />
      <div className={`card tf-card ${flash ? (flash.ok ? "right" : "wrong") : ""}`} aria-live="polite">
        <p className="tf-text">{item.text}</p>
        {flash && <p className="tf-why">{flash.ok ? "✓ Giusto" : `✗ ${flash.why}`}</p>}
      </div>
      <div className="tf-buttons">
        <button className="btn huge tf-true" disabled={!!flash} onClick={() => answer(true)}>
          Vero
        </button>
        <button className="btn huge tf-false" disabled={!!flash} onClick={() => answer(false)}>
          Falso
        </button>
      </div>
      <p className="tiny center">
        {right} giuste · {answers.length - right} sbagliate
      </p>
    </div>
  );
}
