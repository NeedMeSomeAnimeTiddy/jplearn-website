"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { GITHUB_URL, GITHUB_WATCH_URL, tracks, modes, faq } from "./content";
import "./world.css";

const WorldScene = dynamic(() => import("./WorldScene").then((module) => module.WorldScene), { ssr: false });

const stops = ["The gate", "Threshold", "The route", "Lanterns", "Memory", "Tutor", "Stars", "Landing"];
const modeCategories = ["Recognition", "Recall", "Challenge", "Listening", "Blended"] as const;

function FaqStructuredData() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />;
}

export default function Home() {
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const page = pageRef.current;
    if (!page) return;

    const reveals = Array.from(page.querySelectorAll<HTMLElement>(".w-reveal"));
    const revealObserver = new IntersectionObserver(
      (entries) => entries.forEach((entry) => entry.isIntersecting && entry.target.classList.add("is-in")),
      { threshold: 0.2 },
    );
    reveals.forEach((element) => revealObserver.observe(element));

    const dots = Array.from(page.querySelectorAll<HTMLElement>(".w-rail button"));
    const sections = Array.from(page.querySelectorAll<HTMLElement>("[data-stop]"));
    const stopObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const index = Number(entry.target.getAttribute("data-stop"));
          dots.forEach((dot, dotIndex) => dot.classList.toggle("is-here", dotIndex === index));
        });
      },
      { threshold: 0.5 },
    );
    sections.forEach((section) => stopObserver.observe(section));

    return () => {
      revealObserver.disconnect();
      stopObserver.disconnect();
    };
  }, []);

  const flyTo = (index: number) => {
    const section = pageRef.current?.querySelector(`[data-stop="${index}"]`);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    section?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  };

  return (
    <div className="w" ref={pageRef}>
      <div className="w-sky" aria-hidden="true" />
      <WorldScene />

      <header className="w-nav">
        <Link className="w-brand" href="/">
          <Image src="/jplearn-icon.png" width={60} height={60} unoptimized alt="" />
          <span>JPLearn</span>
        </Link>
        <div className="w-nav-right">
          <a className="w-nav-link" href={GITHUB_URL} target="_blank" rel="noreferrer">GitHub ↗</a>
          <a className="w-btn w-btn--small" href={GITHUB_WATCH_URL} target="_blank" rel="noreferrer">Get notified</a>
        </div>
      </header>

      <nav className="w-rail" aria-label="Flight stops">
        {stops.map((stop, index) => (
          <button
            key={stop}
            type="button"
            className={index === 0 ? "is-here" : undefined}
            data-label={stop}
            aria-label={`Fly to ${stop}`}
            onClick={() => flyTo(index)}
          />
        ))}
      </nav>

      <main>
        <section className="w-sec w-sec--hero" data-stop="0">
          <div className="w-hero w-reveal is-in">
            <p className="w-kicker"><i /> A desktop app for Windows · <span lang="ja">夜間飛行</span></p>
            <h1>Step into<br /><span className="w-grad">Japanese.</span></h1>
            <p className="w-lede">
              JPLearn&apos;s menu is a floating Japanese world — and the learning inside is just as deliberate:
              spaced repetition, seventeen practice modes, and a tutor that never phones home.
            </p>
            <div className="w-actions">
              <a className="w-btn" href={GITHUB_WATCH_URL} target="_blank" rel="noreferrer">Get notified on GitHub</a>
              <a className="w-btn w-btn--ghost" href={GITHUB_URL} target="_blank" rel="noreferrer">View the source ↗</a>
            </div>
            <div className="w-signals" aria-label="Product qualities">
              <span>Kana to N1</span>
              <span>Open source · Apache 2.0</span>
              <span>Fully offline</span>
            </div>
          </div>
          <div className="w-scrollcue" aria-hidden="true"><span>Scroll to fly</span><i /></div>
        </section>

        <section className="w-sec w-sec--right" data-stop="1">
          <div className="w-card w-reveal">
            <span className="w-eyebrow">The app · <b lang="ja">空間</b></span>
            <h2>Menus you fly through, not tabs you hunt.</h2>
            <p>
              JPLearn&apos;s home screen is a 3D Japanese environment. Study areas are places, and moving
              between kana, kanji and conversation is a camera flight — like the one you&apos;re on now.
            </p>
            <div className="w-chips">
              <span>Spatial 3D menu</span>
              <span>Camera transitions</span>
              <span>Your desktop, not a browser</span>
            </div>
          </div>
        </section>

        <section className="w-sec" data-stop="2">
          <div className="w-card w-reveal">
            <span className="w-eyebrow">The route · <b lang="ja">道</b></span>
            <h2>Six islands, crossed in order.</h2>
            <p>
              A 16-node curriculum graph runs from your first hiragana to N1. Blocks unlock at 80% mastery
              of the one before — and every gate is soft: the app warns, you decide.
            </p>
            <div className="w-tracks">
              {tracks.map((track, index) => (
                <div className="w-track" key={track.name}>
                  <b lang="ja">{track.glyph}</b>
                  <span><strong>{track.name}</strong><small>{index + 1} / 6 · {track.jp}</small></span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="w-sec w-sec--right" data-stop="3">
          <div className="w-card w-card--wide w-reveal">
            <span className="w-eyebrow">Practice · <b lang="ja">灯</b></span>
            <h2>Seventeen lanterns, one flame.</h2>
            <p>
              Every mode is a different light on the same memory — so review never collapses
              into flipping flashcards. Handwriting is checked stroke by stroke on a canvas;
              speech is graded by ear.
            </p>
            <div className="w-modegroups">
              {modeCategories.map((category) => (
                <div className="w-modegroup" key={category}>
                  <small>{category}</small>
                  <div className="w-modes">
                    {modes.filter((mode) => mode.category === category).map((mode) => (
                      <span key={mode.name} title={mode.detail}>{mode.name}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p className="w-note">FSRS decides which lantern lights next.</p>
          </div>
        </section>

        <section className="w-sec" data-stop="4">
          <div className="w-card w-reveal">
            <span className="w-eyebrow">Memory · <b lang="ja">引力</b></span>
            <h2>Gravity for what you learn.</h2>
            <p>
              FSRS models your forgetting curve per card — stability, difficulty, retrievability — and
              schedules each review for the moment before a word slips out of orbit.
            </p>
            <ul className="w-list">
              <li><b>90%</b> target retention, tunable to your pace</li>
              <li><b>×3</b> priority for due cards, so nothing starves</li>
              <li><b>3 of 5</b> misses flags a leech for focused drilling</li>
            </ul>
          </div>
        </section>

        <section className="w-sec w-sec--right" data-stop="5">
          <div className="w-card w-reveal">
            <span className="w-eyebrow">The tutor · <b lang="ja">師</b></span>
            <h2>A guide who lives here.</h2>
            <p>
              The optional AI tutor is a local llama.cpp model sized to your RAM, from 1.4 to 5.5&nbsp;GB.
              VOICEVOX speaks Japanese aloud; Whisper grades your speech — all offline, on your own hardware.
            </p>
            <div className="w-chat">
              <span className="w-chat-tag"><i /> On this device</span>
              <div className="w-bubble w-bubble--user">Why does は sound like &ldquo;wa&rdquo; here?</div>
              <div className="w-bubble">As the topic particle, は is read <b>wa</b> — it marks what the sentence is about.</div>
            </div>
          </div>
        </section>

        <section className="w-sec" data-stop="6">
          <div className="w-card w-reveal">
            <span className="w-eyebrow">Progress · <b lang="ja">星</b></span>
            <h2>Your sky fills in.</h2>
            <p>
              XP to level 100, streaks that survive timezones, milestone badges, JLPT readiness for
              every level — stored in a local database, exportable to CSV whenever you like.
            </p>
            <ul className="w-list">
              <li><b>8-day</b> streak, UTC-and-local safe <em>(example save)</em></li>
              <li><b>126</b> characters and words mastered</li>
              <li><b>68%</b> ready for N5, tracked per level</li>
            </ul>
          </div>
        </section>

        <section className="w-sec w-sec--final" data-stop="7">
          <div className="w-final w-reveal">
            <Image className="w-final-mark" src="/jplearn-icon.png" width={96} height={96} unoptimized alt="" />
            <h2>The gate is open.</h2>
            <p>
              JPLearn is built in the open — watching the GitHub repo is how you hear about the
              Windows download and the Kickstarter the moment they land.
            </p>
            <div className="w-actions w-actions--center">
              <a className="w-btn" href={GITHUB_WATCH_URL} target="_blank" rel="noreferrer">Get notified on GitHub</a>
              <button className="w-btn w-btn--wait" disabled>Download for Windows · coming soon</button>
            </div>
            <p className="w-final-note">No mailing list, no tracking — GitHub is the only bell we ring.</p>
            <div className="w-faq">
              {faq.map((item) => (
                <details key={item.q}>
                  <summary>{item.q}<i aria-hidden="true">+</i></summary>
                  <p>{item.a}</p>
                </details>
              ))}
            </div>
            <footer className="w-footer">
              <span><b>JPLearn</b> · <span lang="ja">学びを、前へ。</span></span>
              <a href={GITHUB_URL} target="_blank" rel="noreferrer">Open source under Apache 2.0 ↗</a>
            </footer>
          </div>
        </section>
      </main>

      <FaqStructuredData />
    </div>
  );
}
