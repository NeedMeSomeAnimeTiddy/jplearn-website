"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";

const WorldCanvas = dynamic(() => import("./WorldCanvas").then((module) => module.WorldCanvas), { ssr: false });

const GITHUB_URL = "https://github.com/NeedMeSomeAnimeTiddy/JPLearn";

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

function GithubLink({ quiet = false }: { quiet?: boolean }) {
  return (
    <a className={quiet ? "text-link" : "button button--ghost"} href={GITHUB_URL} target="_blank" rel="noreferrer">
      View on GitHub <span aria-hidden="true">↗</span>
    </a>
  );
}

function ChapterRail() {
  const chapters = [
    ["01", "道", "Path", "features"],
    ["02", "習", "Route", "how-it-works"],
    ["03", "遊", "Play", "practice"],
    ["04", "積", "Progress", "progress"],
    ["05", "次", "Back", "kickstarter"],
  ];

  return (
    <aside className="chapter-rail" aria-label="Page chapters">
      {chapters.map(([number, kanji, label, id]) => <a href={`#${id}`} key={id}><i aria-hidden="true" /><small>{number}</small><span><b lang="ja">{kanji}</b>{label}</span></a>)}
    </aside>
  );
}

function ChapterMark({ number, kanji, phrase, light = false }: { number: string; kanji: string; phrase: string; light?: boolean }) {
  return (
    <div className={light ? "chapter-mark chapter-mark--light" : "chapter-mark"} aria-hidden="true">
      <span>{number}</span>
      <b lang="ja">{kanji}</b>
      <small lang="ja">{phrase}</small>
    </div>
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
    <div className="hero-interface depth-card" data-depth="hero">
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

function PathMap() {
  return (
    <div className="path-stage" aria-label="A connected study path from Hiragana to conversation">
      <div className="path-paper path-paper--back" aria-hidden="true" />
      <div className="path-paper">
        <span className="path-caption">YOUR STUDY PATH · 学びの道</span>
        <div className="path-line" aria-hidden="true"><span /></div>
        {studyAreas.map(([jp, label], index) => (
          <div className={`path-stop path-stop--${index + 1}`} key={label}>
            <span className="path-stop__mark" aria-hidden="true">{jp}</span>
            <span className="path-stop__number">0{index + 1}</span>
            <strong>{label}</strong>
          </div>
        ))}
        <div className="path-progression" aria-label="Kanji builds from components to characters and words in context">
          <span>BUILDING BLOCKS</span><i aria-hidden="true">→</i><strong>CHARACTERS</strong><i aria-hidden="true">→</i><span>WORDS IN CONTEXT</span>
        </div>
        <span className="ink-seal" aria-hidden="true">学</span>
      </div>
    </div>
  );
}

function DailyRhythm() {
  return (
    <div className="rhythm-strip reveal" aria-label="A focused daily study rhythm">
      <div className="rhythm-lede"><span>A SMALL DAILY LOOP</span><strong>Open a route.<br />Finish with momentum.</strong></div>
      <div className="rhythm-steps" aria-hidden="true">
        <span><b>01</b> Learn</span><i>→</i><span><b>02</b> Recall</span><i>→</i><span><b>03</b> Use</span><i>→</i><span><b>04</b> Review</span>
      </div>
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
    <div className="writing-scene">
      <div className="character-sheet">
        <span className="sheet-label">STROKE 01 / 05</span>
        <span className="grid-lines" aria-hidden="true" />
        <span className="draw-character" lang="ja">永</span>
        <span className="brush-cursor" aria-hidden="true" />
        <span className="sheet-meaning">eternity · ながい</span>
      </div>
      <div className="writing-panel depth-card">
        <div className="writing-panel__top"><span>Handwriting practice</span><b>3 / 8</b></div>
        <div className="writing-prompt"><small>WRITE FROM MEMORY</small><strong>water</strong><span>みず</span></div>
        <div className="writing-canvas"><span lang="ja">水</span><i className="canvas-grid" /></div>
        <div className="writing-actions"><button tabIndex={-1}>Show stroke order</button><button tabIndex={-1}>Check</button></div>
      </div>
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
    const chapterLinks = Array.from(page.querySelectorAll<HTMLAnchorElement>(".chapter-rail a"));
    const chapterTargets = chapterLinks.map((link) => document.getElementById(link.hash.slice(1))).filter((target): target is HTMLElement => Boolean(target));

    let frame = 0;
    const updateScroll = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      page.style.setProperty("--page-progress", `${max > 0 ? window.scrollY / max : 0}`);
      page.classList.toggle("is-scrolled", window.scrollY > 48);
      const activeIndex = chapterTargets.reduce((active, target, index) => target.getBoundingClientRect().top <= window.innerHeight * 0.42 ? index : active, -1);
      chapterLinks.forEach((link, index) => {
        link.classList.toggle("is-current", index === activeIndex);
        if (index === activeIndex) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      });
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
      <WorldCanvas />
      <div className="washi-grain" aria-hidden="true" />
      <div className="page-progress" aria-hidden="true" />
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="nav-wrap">
        <nav className="nav" aria-label="Main navigation">
          <a href="#top" className="brand-link" aria-label="JPLearn home"><Logo /></a>
          <div className="nav-links">
            <a href="#features">Features</a><a href="#how-it-works">How it works</a><a href="#kickstarter">Kickstarter</a>
            <a href={GITHUB_URL} target="_blank" rel="noreferrer">GitHub</a>
          </div>
          <button className="nav-download" disabled><span>Download</span><small>Soon</small></button>
        </nav>
      </header>
      <ChapterRail />

      <main id="main">
        <section className="hero" id="top" data-scene="home">
          <div className="hero-atmosphere" aria-hidden="true">
            <span className="kanji-cloud kanji-cloud--one">学</span><span className="kanji-cloud kanji-cloud--two">進</span><i /><i />
            <span className="enso-mark"><b lang="ja">学</b></span>
            <span className="hero-tategaki" lang="ja"><b>学びを、前へ。</b><small>毎日、少しずつ。</small></span>
          </div>
          <div className="hero-copy reveal is-visible">
            <Image className="hero-logo" src="/jplearn-lockup.png" width={900} height={234} priority unoptimized alt="JPLearn" />
            <span className="kicker"><i /> JAPANESE, WITH DIRECTION</span>
            <h1>Learn Japanese.<br /><em>Keep moving forward.</em></h1>
            <p>Lessons, reviews, games, handwriting and an AI tutor—all in one focused desktop app.</p>
            <div className="hero-actions"><DownloadButton /><GithubLink /></div>
            <HeroSignals />
          </div>
          <div className="hero-stage" aria-label="A dimensional preview of the JPLearn desktop application">
            <div className="hero-study-card" aria-hidden="true"><span>DAILY PATH</span><strong lang="ja">学</strong><small>N5 · 68%</small></div>
            <div className="origami-plane" aria-hidden="true"><i /><i /><i /></div>
            <HeroInterface />
            <div className="float-note float-note--left" aria-hidden="true"><small>NEXT REVIEW</small><strong lang="ja">木</strong><span>tree · Thursday</span></div>
            <div className="float-note float-note--right" aria-hidden="true"><small>DAILY GOAL</small><strong>7 / 10</strong><span>Keep your rhythm</span></div>
          </div>
          <div className="scroll-cue" aria-hidden="true"><span>SCROLL TO STUDY</span><i /></div>
        </section>

        <section className="path-section section" id="features" data-scene="path">
          <ChapterMark number="一" kanji="道" phrase="ひとつの道" />
          <div className="section-heading section-heading--center reveal">
            <span className="eyebrow">ONE APP · ONE PATH</span>
            <h2>Everything you need to study.<br /><em>Nothing pulling you away.</em></h2>
          </div>
          <DailyRhythm />
          <PathMap />
        </section>

        <section className="adaptive-section section" id="how-it-works" data-scene="route">
          <ChapterMark number="二" kanji="習" phrase="今日の一歩" />
          <div className="adaptive-sticky">
            <div className="section-heading reveal">
              <span className="eyebrow">STUDY THAT ADAPTS</span>
              <h2>Know what to<br />study next.</h2>
              <p>JPLearn turns your progress into a focused daily session.</p>
              <span className="japanese-aside" lang="ja">今日の一歩</span>
            </div>
            <div className="demo-wrap reveal"><DailyPlan /></div>
          </div>
        </section>

        <section className="practice-section section" id="practice" data-scene="play">
          <ChapterMark number="三" kanji="遊" phrase="遊んで覚える" light />
          <div className="practice-title reveal">
            <span className="eyebrow eyebrow--light">PRACTICE THROUGH PLAY</span>
            <h2>Practice without repeating<br />the same screen.</h2>
          </div>
          <PracticeStage />
          <div className="practice-line" aria-hidden="true"><span /></div>
        </section>

        <section className="handwriting-section section" data-scene="write">
          <ChapterMark number="四" kanji="書" phrase="一画ずつ" />
          <div className="handwriting-copy reveal">
            <span className="eyebrow">HANDWRITING · 書く</span>
            <h2>Learn how Japanese<br />is written.</h2>
            <p>Follow stroke order, practise from memory, and build confidence character by character.</p>
          </div>
          <div className="reveal"><HandwritingDemo /></div>
        </section>

        <section className="tutor-section section" data-scene="tutor">
          <ChapterMark number="五" kanji="話" phrase="迷ったときに" light />
          <div className="local-orbit" aria-hidden="true"><i /><i /><span>LOCAL</span></div>
          <div className="tutor-copy reveal">
            <span className="eyebrow eyebrow--light">OPTIONAL LOCAL TUTOR</span>
            <h2>Ask when you<br />get stuck.</h2>
            <p>Use an optional locally installed AI tutor for explanations, examples, and conversation practice.</p>
            <span className="local-note"><i /> Runs with a locally installed model</span>
          </div>
          <div className="reveal"><TutorDemo /></div>
        </section>

        <section className="progress-section section" id="progress" data-scene="progress">
          <ChapterMark number="六" kanji="積" phrase="積み重ね" />
          <div className="progress-copy reveal">
            <span className="eyebrow">PROGRESS · 積み重ね</span>
            <h2>See the work<br />adding up.</h2>
            <p>Every review, lesson, and completed session moves your Japanese forward.</p>
          </div>
          <div className="reveal"><ProgressScene /></div>
        </section>

        <section className="kickstarter-section" id="kickstarter" data-scene="back">
          <ChapterMark number="七" kanji="次" phrase="次の章へ" />
          <div className="kickstarter-paper reveal">
            <span className="paper-fold paper-fold--one" aria-hidden="true" /><span className="paper-fold paper-fold--two" aria-hidden="true" />
            <span className="kickstarter-label">BACK THE NEXT CHAPTER · 次へ</span>
            <h2>Help shape JPLearn 1.0.</h2>
            <p>Support the final development, join the backer beta, and help bring the complete release to life.</p>
            <button className="button button--ink" disabled>View the Kickstarter</button>
            <small className="placeholder-note">Campaign link coming soon</small>
          </div>
        </section>

        <section className="final-section" data-scene="final">
          <ChapterMark number="結" kanji="道" phrase="学びの道" light />
          <span className="final-kanji" aria-hidden="true">道</span>
          <div className="final-inner reveal">
            <Logo />
            <span className="eyebrow eyebrow--light">ONE FOCUSED PLACE</span>
            <h2>Your Japanese journey,<br /><em>in one place.</em></h2>
            <div className="final-actions"><DownloadButton final /><GithubLink /></div>
          </div>
        </section>
      </main>

      <footer><Logo compact /><p>Study with direction. <span lang="ja">学びを、前へ。</span></p><GithubLink quiet /></footer>
    </div>
  );
}
