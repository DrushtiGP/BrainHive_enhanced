import React from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

const features = [
  {
    icon: '🔍',
    title: 'Intelligent Discovery',
    desc: 'Match with study partners based on your subjects, availability, and learning preferences — no manual searching required.',
  },
  {
    icon: '⚡',
    title: 'Structured Group Formation',
    desc: 'Create or join organised study groups in moments. Replace informal chats with a reliable, structured workflow.',
  },
  {
    icon: '📅',
    title: 'Session Scheduling',
    desc: 'Plan, track, and manage study sessions from a single dashboard. Eliminate the hours lost to back-and-forth coordination.',
  },
  {
    icon: '💬',
    title: 'Centralised Communication',
    desc: 'Keep all group discussions, resources, and updates in one place — no more switching between five different apps.',
  },
];

const stats = [
  { value: '2–3 hrs', label: 'Saved per student, per week' },
  { value: '45%', label: 'Of study sessions fail without coordination' },
  { value: '1 platform', label: 'Replaces all your coordination tools' },
];

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="lp-root">
      {/* NAV */}
      <nav className="lp-nav">
        <div className="lp-nav-brand">
          <span className="lp-brand-name">BrainHive</span>
        </div>
        <button className="lp-nav-login" onClick={() => navigate('/login')}>
          Log in
        </button>
      </nav>

      {/* HERO */}
      <section className="lp-hero">
        <div className="lp-hero-badge">Academic Collaboration, Reimagined</div>
        <h1 className="lp-hero-title">
          Study smarter, <span className="lp-gradient-text">together.</span>
        </h1>
        <p className="lp-hero-sub">
          BrainHive brings discovery, scheduling, and communication into one focused platform —
          so students spend less time coordinating and more time learning.
        </p>
        <div className="lp-hero-actions">
          <button className="lp-btn-primary" onClick={() => navigate('/login')}>
            Get started — it's free
          </button>
          <a href="#features" className="lp-btn-ghost">See how it works</a>
        </div>
      </section>

      {/* STATS */}
      <section className="lp-stats">
        {stats.map((s) => (
          <div className="lp-stat-card" key={s.label}>
            <span className="lp-stat-value">{s.value}</span>
            <span className="lp-stat-label">{s.label}</span>
          </div>
        ))}
      </section>

      {/* FEATURES */}
      <section className="lp-features" id="features">
        <h2 className="lp-section-title">Everything your study group needs</h2>
        <p className="lp-section-sub">
          One platform that replaces the fragmented tools students rely on today.
        </p>
        <div className="lp-features-grid">
          {features.map((f) => (
            <div className="lp-feature-card" key={f.title}>
              <div className="lp-feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="lp-cta">
        <h2>Stop losing time to coordination.</h2>
        <p>Join BrainHive and give your study sessions the structure they deserve.</p>
        <button className="lp-btn-primary" onClick={() => navigate('/login')}>
          Create your free account
        </button>
      </section>

      {/* FOOTER */}
      <footer className="lp-footer">
        <span className="lp-brand-name">BrainHive</span>
        <span>© {new Date().getFullYear()} BrainHive. All rights reserved.</span>
      </footer>
    </div>
  );
};

export default LandingPage;
