"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";

const WorldCanvas = dynamic(() => import("./WorldCanvas").then((module) => module.WorldCanvas), { ssr: false });

const GITHUB_URL = "https://github.com/NeedMeSomeAnimeTiddy/JPLearn";
const GITHUB_WATCH_URL = `${GITHUB_URL}/subscription`;

const studyAreas = [
  ["あ", "Hiragana"],
  ["カ", "Katakana"],
  ["漢", "Kanji"],
  ["言", "Vocabulary"],
  ["話", "Conversation"],
];

const practiceModes = [
  ["Recall", "Meaning", "思い出す"],
  ["Recognition", "Sound", "見分ける"],
  ["Handwriting", "Stroke", "書く"],
  ["Listening", "Voice", "聞く"],
  ["Conversation", "Respond", "話す"],
];

const whyCards = [
  ["一", "One path, not five apps", "SRS, kanji, grammar, handwriting and games live in a single daily route instead of five separate tools with five separate logins."],
  ["二", "Built for depth", "A structured curriculum from first hiragana to N5–N1, not a shallow set of tourist phrases."],
  ["三", "Practice that adapts", "Reviews are scheduled per item with spaced repetition, so you spend time on what you're actually forgetting."],
  ["四", "A tutor that stays local", "The optional AI tutor runs with a locally installed model — explanations work offline, and your study data stays on your device."],
] as const;

const faqItems = [
  ["When does JPLearn launch?", "There's no fixed date yet. Watch the repository on GitHub for updates as development progresses — it's the most current source of truth right now."],
  ["What platforms will it run on?", "JPLearn is being built for Windows first. Support for other platforms will depend on interest, so watching the repo helps that conversation."],
  ["Will JPLearn be free?", "Pricing hasn't been decided yet. It'll be shared closer to launch — keeping daily study accessible is a goal, not an afterthought."],
  ["Does the AI tutor need an internet connection?", "No. The tutor is optional and runs with a locally installed model on your own device, so explanations work offline and nothing about your study session leaves your machine."],
  ["Is JPLearn open source?", "Yes — development happens in the open on GitHub under the Apache 2.0 license. Issues, progress, and source are all visible there."],
] as const;

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className={compact ? "brand brand--compact" : "brand"}>
      <BrandMark />
      <span>JP<span>Learn</span></span>
    </span>
  );
}

function BrandMark() {
  return <span className="brand-mark" aria-hidden="true"><Image src="/jplearn-icon.png" width={256} height={256} unoptimized alt="" /></span>;
}

function DownloadButton({ final = false }: { final?: boolean }) {
  return (
    <button className={final ? "button button--paper" : "button button--primary"} disabled>
      <span>Download JPLearn</span>
      <small>Coming soon</small>
    </button>
  );
}

function WatchButton({ subtle = false }: { subtle?: boolean }) {
  return (
    <a className={subtle ? "button button--ghost" : "button button--primary"} href={GITHUB_WATCH_URL} target="_blank" rel="noreferrer">
      <span>Get notified on GitHub</span>
      <small>Watch this repo</small>
    </a>
  );
}

function GithubLink({ quiet = false }: { quiet?: boolean }) {
  return (
    <a className={quiet ? "text-link" : "button button--ghost"} href={GITHUB_URL} target="_blank" rel="noreferrer">
      View on GitHub <span aria-hidden="true">↗</span>
    </a>
  );
}

function HeroSignals() {
  return (
    <div className="hero-signals" aria-label="JPLearn product qualities">
      <span>DESKTOP APP</span><i aria-hidden="true" /><span>FOCUSED DAILY ROUTE</span><i aria-hidden="true" /><span>OPTIONAL LOCAL TUTOR</span>
    </div>
  );
}

function AppRail() {
  return (
    <div className="app-rail" aria-hidden="true">
      <BrandMark />
      <span className="rail-dot rail-dot--active" />
      <span className="rail-dot" />
      <span className="rail-dot" />
      <span className="rail-dot" />
      <span className="rail-spacer" />
      <span className="rail-avatar">R</span>
    </div>
  );
}

function HeroInterface() {
  return (
    <div className="hero-interface depth-card">
      <div className="window-topline">
        <span>JPLearn</span>
        <span className="window-dots"><i /><i /><i /></span>
      </div>
      <div className="app-shell">
        <AppRail />
        <div className="app-home">
          <div className="app-greeting">
            <div>
              <small>おかえりなさい</small>
              <strong>Ready for today?</strong>
            </div>
            <span className="streak-pill">火 <b>8</b> day streak</span>
          </div>
          <div className="session-card">
            <div className="session-copy">
              <span className="eyebrow eyebrow--red">TODAY&apos;S PATH</span>
              <h3>Daily study</h3>
              <p>18 min · lessons + reviews</p>
              <button tabIndex={-1}>Begin session <span>→</span></button>
            </div>
            <div className="session-ring"><span>68<small>%</small></span></div>
          </div>
          <div className="mini-row">
            <div><span>Mastery</span><strong>126</strong><small>+ 8 this week</small></div>
            <div><span>Review queue</span><strong>24</strong><small>Focused for today</small></div>
            <div className="mini-row__paper"><span>Next lesson</span><strong>日</strong><small>Sun · day</small></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PathChips() {
  return (
    <div className="path-chips depth-card">
      <div className="path-chips__head"><span lang="ja">学びの道</span><small>THE STUDY PATH</small></div>
      <div className="path-chips__row">
        {studyAreas.map(([jp, label], index) => (
          <div className="path-chip" key={label}>
            <span className="path-chip__glyph" lang="ja" aria-hidden="true">{jp}</span>
            <small>0{index + 1}</small>
            <strong>{label}</strong>
          </div>
        ))}
      </div>
      <div className="path-chips__foot"><span>BUILDING BLOCKS</span><i aria-hidden="true" /><span>CHARACTERS</span><i aria-hidden="true" /><span>WORDS IN CONTEXT</span></div>
    </div>
  );
}

function DailyPlan() {
  return (
    <div className="daily-demo depth-card">
      <div className="demo-topbar"><Logo compact /><span>Daily plan · Friday</span><i /></div>
      <div className="daily-layout">
        <AppRail />
        <div className="daily-main">
          <div className="daily-heading"><div><small>今日の勉強</small><strong>Your focused session</strong></div><span>22 min</span></div>
          <div className="route-list">
            <div className="route-item route-item--done"><i>✓</i><span><small>WARM UP</small><strong>Quick recall</strong></span><em>4 min</em></div>
            <div className="route-item route-item--current"><i>02</i><span><small>REVIEW</small><strong>24 due cards</strong></span><em>Now</em></div>
            <div className="route-item"><i>03</i><span><small>LEARN</small><strong>Kanji: 日 · 月 · 火</strong></span><em>8 min</em></div>
            <div className="route-item"><i>04</i><span><small>PLAY</small><strong>Listening sprint</strong></span><em>5 min</em></div>
          </div>
        </div>
        <div className="daily-aside">
          <div className="focus-ring"><span>72<small>%</small></span></div>
          <strong>Today</strong><p>One clear route.<br />No tab hunting.</p>
          <div className="tiny-bars"><i /><i /><i /><i /><i /><i /><i /></div>
        </div>
      </div>
    </div>
  );
}

function PracticeStage() {
  return (
    <div className="practice-viewport" aria-label="Five practice modes shown as moving JPLearn interfaces">
      <div className="practice-track">
        {[...practiceModes, ...practiceModes].map(([label, cue, jp], index) => (
          <article className={`game-panel game-panel--${(index % 5) + 1}`} key={`${label}-${index}`} aria-hidden={index >= 5}>
            <div className="game-panel__top"><span>{cue}</span><b>0{(index % 5) + 1}</b></div>
            <span className="game-panel__jp">{jp}</span>
            <h3>{label}</h3>
            <div className="game-ui"><i /><i /><i /></div>
          </article>
        ))}
      </div>
    </div>
  );
}

function HandwritingDemo() {
  return (
    <div className="writing-panel depth-card">
      <div className="writing-panel__top"><span>Handwriting practice</span><b>3 / 8</b></div>
      <div className="writing-prompt"><small>WRITE FROM MEMORY</small><strong>water</strong><span>みず</span></div>
      <div className="writing-canvas"><span lang="ja">水</span><i className="canvas-grid" /></div>
      <div className="writing-actions"><button tabIndex={-1}>Show stroke order</button><button tabIndex={-1}>Check</button></div>
    </div>
  );
}

function TutorDemo() {
  return (
    <div className="tutor-demo depth-card">
      <div className="tutor-top"><span><BrandMark /> Tutor</span><em><i /> On this device</em></div>
      <div className="tutor-body">
        <div className="tutor-context"><small>STUDY CONTEXT</small><strong>Why does は sound like “wa” here?</strong><span>私は学生です。</span></div>
        <div className="chat-bubble chat-bubble--tutor"><small>JPLEARN TUTOR</small><p>As a topic particle, は is pronounced <b>wa</b>. It marks what the sentence is about.</p></div>
        <div className="chat-bubble chat-bubble--user"><p>Can I see another example?</p></div>
        <div className="chat-compose"><span>Ask about this lesson…</span><i>↑</i></div>
      </div>
    </div>
  );
}

function ProgressScene() {
  const cells = Array.from({ length: 56 }, (_, i) => i);
  return (
    <div className="progress-scene depth-card">
      <div className="progress-top"><Logo compact /><span>Progress</span><small>Last 8 weeks</small></div>
      <div className="progress-grid">
        <div className="progress-number"><span>MASTERED</span><strong>126</strong><small>characters & words</small></div>
        <div className="streak-number"><span>STUDY STREAK</span><strong>8<small> days</small></strong><em>続けよう</em></div>
        <div className="activity-map" aria-label="Example eight-week study activity map">
          {cells.map((cell) => <i className={`cell cell--${(cell * 7 + 3) % 5}`} key={cell} />)}
        </div>
        <div className="mastery-arc"><span><b>68%</b><small>N5 path</small></span></div>
      </div>
    </div>
  );
}

function WhyGrid() {
  return (
    <div className="why-grid" aria-label="Reasons JPLearn is one app instead of several">
      {whyCards.map(([mark, title, body]) => (
        <article className="why-card" key={title}>
          <span className="why-card__mark" lang="ja" aria-hidden="true">{mark}</span>
          <h3>{title}</h3>
          <p>{body}</p>
        </article>
      ))}
    </div>
  );
}

function FaqList() {
  return (
    <div className="faq-list">
      {faqItems.map(([question, answer]) => (
        <details className="faq-item" key={question}>
          <summary><span>{question}</span><i aria-hidden="true" /></summary>
          <p>{answer}</p>
        </details>
      ))}
    </div>
  );
}

function FeatureRow({ id, eyebrow, title, description, media, reverse = false }: { id?: string; eyebrow: string; title: ReactNode; description: string; media: ReactNode; reverse?: boolean }) {
  return (
    <section className={reverse ? "feature-row feature-row--reverse section" : "feature-row section"} id={id}>
      <div className="feature-row__copy reveal">
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <div className="feature-row__media reveal">{media}</div>
    </section>
  );
}

export default function Home() {
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const page = pageRef.current;
    if (!page) return;

    const reveals = Array.from(page.querySelectorAll<HTMLElement>(".reveal"));
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => entry.isIntersecting && entry.target.classList.add("is-visible")),
      { threshold: 0.16 },
    );
    reveals.forEach((element) => observer.observe(element));

    let frame = 0;
    const updateScroll = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      page.style.setProperty("--page-progress", `${max > 0 ? window.scrollY / max : 0}`);
      page.classList.toggle("is-scrolled", window.scrollY > 48);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(updateScroll);
    };
    const onPointer = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      page.style.setProperty("--pointer-x", `${event.clientX / window.innerWidth - 0.5}`);
      page.style.setProperty("--pointer-y", `${event.clientY / window.innerHeight - 0.5}`);
    };
    updateScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointermove", onPointer, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onPointer);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="site" ref={pageRef}>
      <div className="washi-grain" aria-hidden="true" />
      <div className="page-progress" aria-hidden="true" />
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="nav-wrap">
        <nav className="nav" aria-label="Main navigation">
          <a href="#top" className="brand-link" aria-label="JPLearn home"><Logo /></a>
          <div className="nav-links">
            <a href="#why">Why JPLearn</a><a href="#how-it-works">How it works</a><a href="#faq">FAQ</a>
            <a href={GITHUB_URL} target="_blank" rel="noreferrer">GitHub</a>
          </div>
          <button className="nav-download" disabled><span>Download</span><small>Soon</small></button>
        </nav>
      </header>

      <main id="main">
        <section className="hero" id="top">
          <WorldCanvas />
          <div className="hero-atmosphere" aria-hidden="true">
            <span className="kanji-cloud kanji-cloud--one">学</span><span className="kanji-cloud kanji-cloud--two">進</span>
            <span className="enso-mark"><b lang="ja">学</b></span>
            <span className="hero-tategaki" lang="ja"><b>学びを、前へ。</b><small>毎日、少しずつ。</small></span>
          </div>
          <div className="hero-copy reveal is-visible">
            <Image className="hero-logo" src="/jplearn-lockup.png" width={900} height={234} priority unoptimized alt="JPLearn" />
            <span className="kicker"><i /> JAPANESE, WITH DIRECTION · 学びの道</span>
            <h1>Learn Japanese.<br /><em>Keep moving forward.</em></h1>
            <p>Lessons, reviews, games and handwriting practice—plus an AI tutor that runs locally on your machine, not in the cloud. One focused desktop app, not five browser tabs.</p>
            <div className="hero-actions"><WatchButton /><GithubLink /></div>
            <HeroSignals />
          </div>
          <div className="hero-stage" aria-label="A preview of the JPLearn desktop application">
            <HeroInterface />
          </div>
          <div className="scroll-cue" aria-hidden="true"><span>SCROLL TO EXPLORE</span><i /></div>
        </section>

        <section className="why-section section" id="why">
          <div className="section-heading section-heading--center reveal">
            <span className="eyebrow">WHY ONE APP · 由</span>
            <h2>Stop juggling apps.<br /><em>Start finishing lessons.</em></h2>
            <p className="why-lede">Most learners end up stitching together a flashcard app, a kanji app, a grammar tool and a conversation partner. JPLearn puts the whole loop in one place.</p>
          </div>
          <div className="reveal"><WhyGrid /></div>
        </section>

        <FeatureRow
          id="path"
          eyebrow="A STRUCTURED PATH · 道"
          title={<>Everything builds<br /><em>on what came before.</em></>}
          description="Hiragana and katakana first, then kanji built from their components, then vocabulary and grammar in real context. Nothing you're asked to learn is a surprise."
          media={<PathChips />}
        />

        <FeatureRow
          id="how-it-works"
          eyebrow="DAILY RHYTHM · 縁"
          title={<>Know what to<br />study next.</>}
          description="JPLearn turns your progress into a focused daily session — a short warm-up, your due reviews, one new lesson, and a quick round of play. Open it, follow the route, done."
          media={<DailyPlan />}
          reverse
        />

        <section className="practice-band section" id="practice">
          <div className="practice-band__heading reveal">
            <span className="eyebrow eyebrow--light">PRACTICE THROUGH PLAY · 遊ぶ</span>
            <h2>Practice without repeating<br />the same screen.</h2>
          </div>
          <div className="reveal"><PracticeStage /></div>
        </section>

        <FeatureRow
          eyebrow="HANDWRITING · 書道"
          title={<>Learn how Japanese<br />is written.</>}
          description="Follow stroke order, practise from memory, and build confidence character by character."
          media={<HandwritingDemo />}
        />

        <FeatureRow
          eyebrow="QUIET HELP · 問う"
          title={<>Ask when you<br />get stuck.</>}
          description="An optional, locally installed AI tutor gives explanations, examples, and conversation practice — no internet connection required, nothing you type leaves your device."
          media={<TutorDemo />}
          reverse
        />

        <FeatureRow
          eyebrow="PROGRESS · 積み重ね"
          title={<>See the work<br />adding up.</>}
          description="Every review, lesson, and completed session moves your Japanese forward — and shows up here."
          media={<ProgressScene />}
        />

        <section className="faq-section section" id="faq">
          <div className="section-heading section-heading--center reveal">
            <span className="eyebrow">BEFORE YOU ASK · 問</span>
            <h2>Questions worth<br />answering honestly.</h2>
          </div>
          <div className="reveal"><FaqList /></div>
        </section>

        <section className="closing-section section" id="kickstarter">
          <div className="closing-copy reveal">
            <span className="eyebrow eyebrow--light">BUILT IN THE OPEN · 集まる</span>
            <h2>Follow the build.<br />Back the next chapter.</h2>
            <p>JPLearn is developed in the open on GitHub. Watch the repo to see progress land, weigh in on platforms and features, and hear about the Kickstarter the moment it opens.</p>
            <div className="closing-actions">
              <WatchButton />
              <button className="button button--ghost" disabled><span>View the Kickstarter</span><small>Coming soon</small></button>
            </div>
          </div>
        </section>

        <section className="final-bar">
          <Logo />
          <p>Your Japanese journey, in one place. <span lang="ja">学びを、前へ。</span></p>
          <div className="final-bar__actions"><WatchButton subtle /><DownloadButton final /></div>
        </section>
      </main>

      <footer><Logo compact /><p>Study with direction.</p><GithubLink quiet /></footer>
    </div>
  );
}
