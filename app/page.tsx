"use client";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";

// --- 1. Canvas Background: Financial Network ---
// Adapted from the ThreatNetwork to look like elegant financial data nodes
function FinancialNetwork() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let particles = [];
    let animationFrameId;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    const initParticles = () => {
      particles = [];
      const numParticles = Math.min(window.innerWidth / 20, 60); // Elegant, sparse density
      for (let i = 0; i < numParticles; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.3, // Slower, calmer movement
          vy: (Math.random() - 0.5) * 0.3,
          radius: Math.random() * 1.5 + 0.5,
          color: Math.random() > 0.7 ? "#1a1a1a" : "#8a7f6e", // Neobank charcoal and warm gray
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p, index) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();

        for (let j = index + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 120) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            const opacity = (1 - distance / 120) * 0.15; // Very subtle lines
            ctx.strokeStyle = `rgba(26, 26, 26, ${opacity})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    window.addEventListener("resize", resize);
    resize();
    draw();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full block pointer-events-none z-0"
      style={{ opacity: 0.4 }}
    />
  );
}

// --- 2. Typewriter Effect ---
// Adapted for a sophisticated fintech slogan
function ElegantTypewriter() {
  const textToType = "No hidden fees. No nonsense. Just seamless banking.";
  const [text, setText] = useState("");
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    if (!isTyping) return;

    const timeout = setTimeout(() => {
      if (text.length < textToType.length) {
        setText(textToType.slice(0, text.length + 1));
      } else {
        setIsTyping(false);
      }
    }, 40); // Fast, clean typing speed

    return () => clearTimeout(timeout);
  }, [text, isTyping]);

  return (
    <span className="text-[17px] leading-[1.7] text-[#6b6355]">
      {text}
      <span
        className={`inline-block w-1.5 h-4 ml-1 bg-[#1a1a1a] align-middle ${!isTyping ? "animate-pulse" : ""}`}
      ></span>
    </span>
  );
}

// --- 3. Scroll Animation Hook ---
function useAnimations() {
  useEffect(() => {
    const revealElements = document.querySelectorAll(".reveal-up");
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("opacity-100", "translate-y-0");
            e.target.classList.remove("opacity-0", "translate-y-12");
            revealObserver.unobserve(e.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" },
    );
    revealElements.forEach((el) => revealObserver.observe(el));

    const staggerElements = document.querySelectorAll(".reveal-stagger");
    const staggerObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const index = Array.from(staggerElements).indexOf(e.target);
            e.target.style.transitionDelay = `${index * 150}ms`;
            e.target.classList.add("opacity-100", "translate-y-0");
            e.target.classList.remove("opacity-0", "translate-y-12");
            staggerObserver.unobserve(e.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" },
    );
    staggerElements.forEach((el) => staggerObserver.observe(el));

    return () => {
      revealObserver.disconnect();
      staggerObserver.disconnect();
    };
  }, []);
}

// --- 4. Interactive 3D Tilt Card ---
// Adapted for elegant light-mode feature cards
function InteractiveTiltCard({ children, delayClass }) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [rotate, setRotate] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef(null);

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setPosition({ x, y });
    setIsHovered(true);

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -4;
    const rotateY = ((x - centerX) / centerX) * 4;

    setRotate({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setRotate({ x: 0, y: 0 });
  };

  return (
    <div
      className={`reveal-stagger opacity-0 translate-y-12 transition-all duration-1000 ease-out ${delayClass}`}
      style={{ perspective: "1000px" }}
    >
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="group relative h-full w-full bg-white border border-[#e8e4dc] rounded-2xl p-7 overflow-hidden shadow-sm hover:shadow-xl transition-shadow duration-500"
        style={{
          transform: `rotateX(${rotate.x}deg) rotateY(${rotate.y}deg)`,
          transition: isHovered ? "none" : "transform 0.5s ease-out",
          transformStyle: "preserve-3d",
        }}
      >
        {/* Dynamic Spotlight Glow */}
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-300"
          style={{
            opacity: isHovered ? 1 : 0,
            background: `radial-gradient(400px circle at ${position.x}px ${position.y}px, rgba(26,26,26,0.03), transparent 40%)`,
          }}
        />

        <div
          className="relative z-10 transition-transform duration-300 ease-out"
          style={{
            transform: isHovered ? "translateZ(20px)" : "translateZ(0px)",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

// --- MAIN PAGE ---
export default function LandingPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useAnimations();

  return (
    <div
      className="min-h-screen selection:bg-[#e8e4dc] selection:text-[#1a1a1a] overflow-x-hidden relative"
      style={{
        fontFamily: "Inter, sans-serif",
        background: "#f8f7f4",
        color: "#1a1a1a",
      }}
    >
      {/* Navigation */}
      <nav className="fixed w-full top-0 z-50 backdrop-blur-xl bg-[#f8f7f4]/80 border-b border-[#e8e4dc]/80 transition-all duration-500">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group">
            <div className="w-8 h-8 bg-[#1a1a1a] rounded-lg flex items-center justify-center shadow-sm group-hover:rotate-12 transition-transform duration-500 ease-out">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <polyline
                  points="9,22 9,12 15,12 15,22"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <span className="font-bold text-[17px] tracking-tight group-hover:tracking-wide transition-all duration-300">
              neobank
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="hidden sm:block px-4 py-2 rounded-lg text-sm font-medium text-[#8a7f6e] hover:text-[#1a1a1a] transition-colors duration-300"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="px-5 py-2.5 rounded-lg bg-[#1a1a1a] text-white text-sm font-semibold hover:bg-black hover:shadow-lg hover:-translate-y-0.5 active:scale-95 transition-all duration-300"
            >
              Open account
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 max-w-6xl mx-auto px-6 flex flex-col lg:flex-row items-center gap-16 min-h-[90vh]">
        {/* Live Canvas Background */}
        {mounted && <FinancialNetwork />}

        <div className="flex-1 text-center lg:text-left z-10 reveal-up opacity-0 translate-y-12 transition-all duration-1000">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[#e8e4dc] text-xs font-medium text-[#6b6355] mb-8 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4ade80] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#4ade80]"></span>
            </span>
            Live globally across 50+ countries
          </div>

          <h1
            className="text-[clamp(44px,7vw,72px)] leading-[1.05] tracking-[-2px] mb-6 text-[#1a1a1a]"
            style={{ fontFamily: "DM Serif Display, serif" }}
          >
            Banking that
            <br className="hidden lg:block" />
            <em className="italic text-[#8a7f6e]">actually</em> works.
          </h1>

          <div className="mb-10 max-w-[480px] mx-auto lg:mx-0 h-[60px]">
            {mounted && <ElegantTypewriter />}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
            <Link
              href="/register"
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-[#1a1a1a] text-white text-[15px] font-semibold tracking-tight hover:shadow-xl hover:shadow-[#1a1a1a]/20 hover:-translate-y-1 transition-all duration-300"
            >
              Get started free
            </Link>
          </div>
        </div>

        {/* Hero Visual Mockup - Kept original floating logic but made it smoother */}
        <div className="flex-1 w-full max-w-md lg:max-w-none relative perspective-1000 hidden md:block z-10 reveal-up opacity-0 translate-y-12 transition-all duration-1000 delay-300">
          <div
            className="relative rounded-2xl bg-white border border-[#e8e4dc] shadow-2xl p-7 hover:!transform-none hover:scale-[1.02] transition-all duration-700 ease-out cursor-default"
            style={{
              transform: "rotateY(-12deg) rotateX(8deg)",
              animation: "float 8s ease-in-out infinite",
            }}
          >
            <style>{`
              @keyframes float {
                0%, 100% { transform: translateY(0px) rotateY(-12deg) rotateX(8deg); }
                50% { transform: translateY(-15px) rotateY(-8deg) rotateX(10deg); }
              }
            `}</style>

            <div className="flex items-center justify-between mb-8 border-b border-[#f0ede6] pb-6">
              <div>
                <p className="text-sm text-[#8a7f6e] font-medium mb-1">
                  Total Balance
                </p>
                <h3 className="text-3xl font-bold text-[#1a1a1a]">
                  $24,500.00
                </h3>
              </div>
              <div className="w-12 h-12 bg-[#f8f7f4] rounded-full flex items-center justify-center border border-[#e8e4dc]">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#1a1a1a"
                  strokeWidth="2"
                >
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </div>
            </div>
            <div className="space-y-2">
              {[
                {
                  name: "Apple Store",
                  amount: "-$999.00",
                  date: "Today, 2:45 PM",
                  init: "A",
                },
                {
                  name: "Salary Deposit",
                  amount: "+$5,400.00",
                  date: "Yesterday",
                  init: "S",
                },
              ].map((tx, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-[#f8f7f4] transition-colors duration-300"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#1a1a1a] text-white flex items-center justify-center text-sm font-bold">
                      {tx.init}
                    </div>
                    <div>
                      <p className="font-semibold text-[#1a1a1a] text-sm">
                        {tx.name}
                      </p>
                      <p className="text-xs text-[#8a7f6e]">{tx.date}</p>
                    </div>
                  </div>
                  <span
                    className={`font-semibold text-sm ${tx.amount.startsWith("+") ? "text-[#4ade80]" : "text-[#1a1a1a]"}`}
                  >
                    {tx.amount}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Stats (Intersection Observer Stagger) */}
      <section className="border-y border-[#e8e4dc] bg-white py-16">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <p className="text-[13px] font-semibold text-[#8a7f6e] tracking-[0.1em] uppercase mb-10 reveal-up opacity-0 translate-y-12 transition-all duration-700">
            Trusted by over 2 million customers
          </p>
          <div className="flex justify-center gap-10 md:gap-20 flex-wrap">
            {[
              { label: "Active users", value: "2M+" },
              { label: "Money moved", value: "$14B" },
              { label: "System uptime", value: "99.98%" },
              { label: "App rating", value: "4.9★" },
            ].map((s) => (
              <div
                key={s.label}
                className="reveal-stagger opacity-0 translate-y-12 transition-all duration-700 flex flex-col items-center"
              >
                <div className="text-3xl md:text-4xl font-bold tracking-tight text-[#1a1a1a] mb-2">
                  {s.value}
                </div>
                <div className="text-sm text-[#8a7f6e] font-medium">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid with 3D Mouse Tracking */}
      <section className="max-w-6xl mx-auto px-6 py-24 lg:py-32">
        <div className="text-center mb-16 reveal-up opacity-0 translate-y-12 transition-all duration-1000">
          <h2
            className="text-[clamp(32px,5vw,48px)] tracking-[-1px] mb-4 text-[#1a1a1a]"
            style={{ fontFamily: "DM Serif Display, serif" }}
          >
            Everything you need.
          </h2>
          <p className="text-lg text-[#8a7f6e]">
            Powerful infrastructure disguised as a simple app.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              icon: (
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
              ),
              title: "Instant transfers",
              desc: "Send money to anyone in seconds. No waiting, no delays.",
            },
            {
              icon: (
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 20V10M12 20V4M6 20v-6" />
                </svg>
              ),
              title: "Smart analytics",
              desc: "See exactly where your money goes with auto-categorization.",
            },
            {
              icon: (
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
              ),
              title: "Secure by design",
              desc: "Bank-grade security protocols active on every transaction.",
            },
            {
              icon: (
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                  <line x1="1" y1="10" x2="23" y2="10" />
                </svg>
              ),
              title: "Virtual cards",
              desc: "Create cards for online shopping, freeze them anytime.",
            },
          ].map((f, i) => (
            <InteractiveTiltCard key={f.title}>
              <div className="w-12 h-12 bg-[#f8f7f4] rounded-xl flex items-center justify-center text-[#1a1a1a] mb-6 group-hover:bg-[#1a1a1a] group-hover:text-white transition-colors duration-500 shadow-sm border border-[#e8e4dc]">
                {f.icon}
              </div>
              <div className="font-bold text-[16px] mb-2 tracking-[-0.3px] text-[#1a1a1a]">
                {f.title}
              </div>
              <div className="text-[14px] text-[#6b6355] leading-[1.6]">
                {f.desc}
              </div>
            </InteractiveTiltCard>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-4xl mx-auto px-6 py-20 text-center reveal-up opacity-0 translate-y-12 transition-all duration-1000 delay-200">
        <h2
          className="text-[clamp(32px,5vw,52px)] tracking-[-1.5px] mb-5 text-[#1a1a1a]"
          style={{ fontFamily: "DM Serif Display, serif" }}
        >
          Ready to get started?
        </h2>
        <p className="text-[16px] text-[#8a7f6e] mb-10 max-w-lg mx-auto">
          Open your account in under 2 minutes. No paperwork required. Welcome
          to the future of banking.
        </p>
        <Link
          href="/register"
          className="inline-flex items-center gap-3 px-9 py-4 rounded-xl bg-[#1a1a1a] text-white text-[15px] font-semibold tracking-[-0.3px] hover:bg-black hover:shadow-2xl hover:shadow-[#1a1a1a]/30 hover:-translate-y-1 transition-all duration-300 group"
        >
          Create your account
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="group-hover:translate-x-1 transition-transform duration-300"
          >
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#e8e4dc] py-10 px-6 mt-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 group cursor-pointer">
            <div className="w-6 h-6 bg-[#1a1a1a] rounded flex items-center justify-center group-hover:rotate-180 transition-transform duration-700">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path
                  d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <span className="font-bold tracking-[-0.5px] text-[15px]">
              neobank
            </span>
          </div>
          <span className="text-[13px] text-[#8a7f6e] font-medium">
            © 2026 Neobank Inc. All rights reserved.
          </span>
        </div>
      </footer>
    </div>
  );
}
