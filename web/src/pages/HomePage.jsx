import { useNavigate } from 'react-router-dom'

export default function HomePage() {
  const navigate = useNavigate()

  const goToLogin = () => {
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">

      {/* ================= NAVBAR ================= */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">

          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-400 text-slate-950 shadow-lg shadow-amber-400/20">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-6 w-6"
              >
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2" />
                <path d="M12 20v2" />
                <path d="m4.93 4.93 1.41 1.41" />
                <path d="m17.66 17.66 1.41 1.41" />
                <path d="M2 12h2" />
                <path d="M20 12h2" />
                <path d="m6.34 17.66-1.41 1.41" />
                <path d="m19.07 4.93-1.41 1.41" />
              </svg>
            </div>

            <div>
              <h1 className="text-lg font-bold tracking-tight">
                SolarGrid
              </h1>
              <p className="text-xs text-slate-400">
                Smart Energy Network
              </p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-8 md:flex">
            <a
              href="#home"
              className="text-sm text-slate-300 transition hover:text-white"
            >
              Home
            </a>

            <a
              href="#features"
              className="text-sm text-slate-300 transition hover:text-white"
            >
              Features
            </a>

            <a
              href="#how-it-works"
              className="text-sm text-slate-300 transition hover:text-white"
            >
              How It Works
            </a>

            <a
              href="#about"
              className="text-sm text-slate-300 transition hover:text-white"
            >
              About
            </a>
          </nav>

          {/* Login */}
          <button
            onClick={goToLogin}
            className="rounded-xl bg-amber-400 px-6 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-amber-300"
          >
            Login
          </button>
        </div>
      </header>

      <main>

        {/* ================= HERO ================= */}
        <section
          id="home"
          className="relative overflow-hidden"
        >
          {/* Decorative backgrounds */}
          <div className="absolute -left-40 top-20 h-96 w-96 rounded-full bg-amber-400/10 blur-3xl" />
          <div className="absolute -right-40 top-0 h-[500px] w-[500px] rounded-full bg-emerald-400/10 blur-3xl" />

          <div className="relative mx-auto grid min-h-[88vh] max-w-7xl items-center gap-16 px-6 py-24 lg:grid-cols-2 lg:px-8">

            {/* Hero Text */}
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-4 py-2 text-sm font-medium text-amber-300">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                Smarter renewable energy management
              </div>

              <h2 className="max-w-3xl text-5xl font-bold leading-[1.08] tracking-tight sm:text-6xl lg:text-7xl">
                Powering a smarter
                <span className="block text-amber-400">
                  energy future.
                </span>
              </h2>

              <p className="mt-7 max-w-xl text-lg leading-8 text-slate-400">
                A connected solar microgrid platform designed to simplify
                energy slot reservations, manage grid nodes and support
                efficient energy trading between prosumers and grid operators.
              </p>

              <div className="mt-10 flex flex-wrap gap-4">
                <button
                  onClick={goToLogin}
                  className="flex items-center gap-2 rounded-xl bg-amber-400 px-7 py-3.5 font-semibold text-slate-950 transition hover:bg-amber-300"
                >
                  Access Platform

                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="h-5 w-5"
                  >
                    <path d="M5 12h14" />
                    <path d="m13 6 6 6-6 6" />
                  </svg>
                </button>

                <a
                  href="#features"
                  className="rounded-xl border border-white/15 px-7 py-3.5 font-semibold text-white transition hover:bg-white/5"
                >
                  Explore Features
                </a>
              </div>

              {/* Mini stats */}
              <div className="mt-14 grid max-w-lg grid-cols-3 gap-6 border-t border-white/10 pt-8">
                <div>
                  <p className="text-2xl font-bold text-white">24/7</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Platform Access
                  </p>
                </div>

                <div>
                  <p className="text-2xl font-bold text-white">Smart</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Grid Management
                  </p>
                </div>

                <div>
                  <p className="text-2xl font-bold text-white">Secure</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Role Access
                  </p>
                </div>
              </div>
            </div>

            {/* Hero Visual */}
            <div className="relative hidden lg:block">
              <div className="absolute inset-0 rounded-full bg-amber-400/10 blur-3xl" />

              <div className="relative rounded-[2rem] border border-white/10 bg-white/[0.05] p-7 shadow-2xl backdrop-blur-xl">

                <div className="mb-7 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400">
                      Microgrid Network
                    </p>
                    <h3 className="mt-1 text-xl font-semibold">
                      Energy Overview
                    </h3>
                  </div>

                  <div className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                    ● Network Active
                  </div>
                </div>

                {/* Solar illustration */}
                <div className="relative flex h-72 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800">

                  <div className="absolute right-10 top-8 h-20 w-20 rounded-full bg-amber-400 shadow-[0_0_80px_rgba(251,191,36,0.45)]" />

                  <svg
                    viewBox="0 0 500 250"
                    className="absolute bottom-0 w-full"
                  >
                    <path
                      d="M0 190 C80 140 130 180 210 140 C290 100 360 160 500 100 V250 H0 Z"
                      fill="#1e293b"
                    />

                    <g transform="translate(130,125)">
                      <polygon
                        points="0,60 150,35 195,105 40,130"
                        fill="#0f172a"
                        stroke="#64748b"
                        strokeWidth="3"
                      />

                      <line
                        x1="50"
                        y1="52"
                        x2="88"
                        y2="122"
                        stroke="#64748b"
                        strokeWidth="2"
                      />

                      <line
                        x1="100"
                        y1="44"
                        x2="140"
                        y2="114"
                        stroke="#64748b"
                        strokeWidth="2"
                      />

                      <line
                        x1="20"
                        y1="82"
                        x2="170"
                        y2="58"
                        stroke="#64748b"
                        strokeWidth="2"
                      />

                      <line
                        x1="30"
                        y1="106"
                        x2="184"
                        y2="82"
                        stroke="#64748b"
                        strokeWidth="2"
                      />
                    </g>
                  </svg>

                  <div className="absolute bottom-5 left-5 rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 backdrop-blur">
                    <p className="text-xs text-slate-400">
                      Renewable Network
                    </p>
                    <p className="mt-1 font-semibold text-amber-400">
                      Solar Powered
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div className="rounded-xl bg-white/[0.04] p-4">
                    <p className="text-xs text-slate-500">
                      Energy Network
                    </p>
                    <p className="mt-2 text-lg font-semibold">
                      Connected
                    </p>
                  </div>

                  <div className="rounded-xl bg-white/[0.04] p-4">
                    <p className="text-xs text-slate-500">
                      Grid Status
                    </p>
                    <p className="mt-2 text-lg font-semibold text-emerald-400">
                      Operational
                    </p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* ================= FEATURES ================= */}
        <section
          id="features"
          className="bg-white py-24 text-slate-900"
        >
          <div className="mx-auto max-w-7xl px-6 lg:px-8">

            <div className="mx-auto max-w-2xl text-center">
              <p className="font-semibold uppercase tracking-[0.2em] text-amber-600">
                Platform Features
              </p>

              <h2 className="mt-4 text-4xl font-bold tracking-tight">
                Everything needed to manage a modern microgrid
              </h2>

              <p className="mt-5 leading-7 text-slate-500">
                Bringing prosumers, grid operators and backoffice management
                together through one connected energy platform.
              </p>
            </div>

            <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">

              <FeatureCard
                title="Microgrid Nodes"
                text="Manage solar microgrid hubs, locations, energy capacity and operational schedules."
                icon="solar"
              />

              <FeatureCard
                title="Energy Reservations"
                text="Reserve available energy slots through a simple and controlled scheduling process."
                icon="calendar"
              />

              <FeatureCard
                title="Nearby Grid Nodes"
                text="Discover available microgrid nodes and access useful station information."
                icon="location"
              />

              <FeatureCard
                title="Prosumer Management"
                text="Support registered solar owners with secure account and profile management."
                icon="user"
              />

              <FeatureCard
                title="QR Verification"
                text="Support fast verification of approved energy transactions using QR technology."
                icon="qr"
              />

              <FeatureCard
                title="Grid Operations"
                text="Give authorized operators the tools required to manage availability and energy transfers."
                icon="grid"
              />

            </div>
          </div>
        </section>

        {/* ================= HOW IT WORKS ================= */}
        <section
          id="how-it-works"
          className="bg-slate-50 py-24 text-slate-900"
        >
          <div className="mx-auto max-w-7xl px-6 lg:px-8">

            <div className="grid items-center gap-16 lg:grid-cols-2">

              <div>
                <p className="font-semibold uppercase tracking-[0.2em] text-amber-600">
                  Simple & Connected
                </p>

                <h2 className="mt-4 text-4xl font-bold tracking-tight">
                  From solar energy to a connected microgrid.
                </h2>

                <p className="mt-6 max-w-xl leading-7 text-slate-600">
                  The platform connects registered prosumers with managed
                  microgrid nodes while allowing authorized operators and
                  backoffice users to control the network through a centralized
                  service.
                </p>
              </div>

              <div className="space-y-4">

                <Step
                  number="01"
                  title="Find a Grid Node"
                  text="View available microgrid nodes and their operating information."
                />

                <Step
                  number="02"
                  title="Reserve an Energy Slot"
                  text="Select an appropriate energy slot within the available schedule."
                />

                <Step
                  number="03"
                  title="Receive Confirmation"
                  text="Track the reservation and receive the approved transaction information."
                />

                <Step
                  number="04"
                  title="Complete the Transfer"
                  text="The grid operator verifies the transaction and completes the energy transfer."
                />

              </div>
            </div>
          </div>
        </section>

        {/* ================= ABOUT / CTA ================= */}
        <section
          id="about"
          className="bg-slate-950 py-24"
        >
          <div className="mx-auto max-w-7xl px-6 lg:px-8">

            <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-amber-400/15 via-slate-900 to-emerald-400/10 px-8 py-16 text-center md:px-16">

              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-400">
                Smart Solar Microgrid
              </p>

              <h2 className="mx-auto mt-5 max-w-3xl text-4xl font-bold tracking-tight md:text-5xl">
                Building a smarter way to manage renewable energy.
              </h2>

              <p className="mx-auto mt-6 max-w-2xl leading-7 text-slate-400">
                A centralized digital platform for managing solar microgrid
                operations, energy reservations and secure interactions between
                prosumers, grid operators and backoffice users.
              </p>

              <button
                onClick={goToLogin}
                className="mt-9 rounded-xl bg-amber-400 px-8 py-3.5 font-semibold text-slate-950 transition hover:bg-amber-300"
              >
                Login to Platform
              </button>

            </div>
          </div>
        </section>

      </main>

      {/* ================= FOOTER ================= */}
      <footer className="border-t border-white/10 bg-slate-950">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-6 py-8 text-sm text-slate-500 md:flex-row md:items-center md:justify-between lg:px-8">

          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400 font-bold text-slate-950">
              S
            </div>

            <span className="font-semibold text-slate-300">
              SolarGrid
            </span>
          </div>

          <p>
            Smart Solar Microgrid Trading System
          </p>

          <p>
            © 2026 SolarGrid
          </p>

        </div>
      </footer>

    </div>
  )
}


/* ================= COMPONENTS ================= */

function FeatureCard({ title, text, icon }) {
  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-7 transition duration-300 hover:-translate-y-1 hover:border-amber-300 hover:shadow-xl hover:shadow-slate-200/70">

      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
        <FeatureIcon type={icon} />
      </div>

      <h3 className="text-lg font-bold">
        {title}
      </h3>

      <p className="mt-3 text-sm leading-6 text-slate-500">
        {text}
      </p>

    </div>
  )
}


function Step({ number, title, text }) {
  return (
    <div className="flex gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-950 font-bold text-amber-400">
        {number}
      </div>

      <div>
        <h3 className="font-bold">
          {title}
        </h3>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          {text}
        </p>
      </div>

    </div>
  )
}


function FeatureIcon({ type }) {
  const className = "h-6 w-6"

  if (type === 'location') {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className={className}
      >
        <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2" />
      </svg>
    )
  }

  if (type === 'calendar') {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className={className}
      >
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 11h18" />
      </svg>
    )
  }

  if (type === 'user') {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className={className}
      >
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </svg>
    )
  }

  if (type === 'qr') {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className={className}
      >
        <rect x="3" y="3" width="6" height="6" />
        <rect x="15" y="3" width="6" height="6" />
        <rect x="3" y="15" width="6" height="6" />
        <path d="M15 15h3v3h3M15 21v-3M21 15v3" />
      </svg>
    )
  }

  if (type === 'grid') {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className={className}
      >
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
      </svg>
    )
  }

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
      <path d="m4.93 4.93 1.41 1.41M17.66 17.66l1.41 1.41" />
      <path d="m4.93 19.07 1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  )
}