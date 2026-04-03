import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useInView } from '@/hooks/useInView';
import {
  PenLine, Users, WifiOff, Search, Zap,
  ChevronRight, Check, Github, Twitter, Mail,
  BookOpen, Folder, Clock, ArrowRight,
} from 'lucide-react';
import { cn } from '@/utils/cn';

// ─── Scroll-reveal wrapper ────────────────────────────────────────────────────
interface RevealProps {
  children: React.ReactNode;
  className?: string;
  animation?: string;
  delay?: string;
}
function Reveal({ children, className, animation = 'animate-fade-up', delay = '' }: RevealProps) {
  const { ref, inView } = useInView();
  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      className={cn(
        'transition-all',
        inView ? `${animation} ${delay}` : 'opacity-0',
        className
      )}
    >
      {children}
    </div>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
function Navbar() {
  const { isAuthenticated } = useAuth();
  return (
    <header className="fixed top-0 inset-x-0 z-50 border-b border-gray-200/60 dark:border-gray-800/60 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md animate-fade-down">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl text-gray-900 dark:text-white hover:opacity-80 transition-opacity">
          <PenLine className="h-6 w-6 text-brand-600" />
          NoteCraft
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
          {['#features', '#how-it-works', '#pricing', '#contact'].map((href, i) => (
            <a key={href} href={href}
              className="hover:text-gray-900 dark:hover:text-white transition-colors relative after:absolute after:bottom-0 after:left-0 after:h-px after:w-0 after:bg-brand-600 after:transition-all hover:after:w-full">
              {['Features', 'How it works', 'Pricing', 'Contact'][i]}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <Link to="/dashboard"
              className="inline-flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-all hover:shadow-md hover:shadow-brand-600/25 active:scale-95">
              Dashboard <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <>
              <Link to="/login"
                className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors px-3 py-2">
                Sign in
              </Link>
              <Link to="/signup"
                className="inline-flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-all hover:shadow-md hover:shadow-brand-600/25 active:scale-95">
                Get started free
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function Hero() {
  const { isAuthenticated } = useAuth();
  return (
    <section className="pt-32 pb-20 px-4 sm:px-6 text-center overflow-hidden">
      {/* Gradient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden -z-10">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-brand-400/20 dark:bg-brand-600/10 blur-3xl animate-float" />
        <div className="absolute -top-20 right-0 h-80 w-80 rounded-full bg-violet-400/15 dark:bg-violet-600/10 blur-3xl animate-float [animation-delay:2s]" />
      </div>

      <div className="max-w-3xl mx-auto">
        <div className="animate-fade-down [animation-delay:0.1s]">
          <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-800 px-3 py-1 rounded-full mb-6">
            <Zap className="h-3.5 w-3.5" /> Real-time collaboration, offline-first
          </span>
        </div>

        <h1 className="animate-fade-up [animation-delay:0.15s] text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 dark:text-white leading-tight tracking-tight mb-6">
          Notes that work{' '}
          <span className="bg-gradient-to-r from-brand-500 to-violet-500 bg-clip-text text-transparent animate-gradient-x bg-[length:200%_200%]">
            together
          </span>
        </h1>

        <p className="animate-fade-up [animation-delay:0.25s] text-lg sm:text-xl text-gray-500 dark:text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          NoteCraft is a collaborative note-taking app built for teams. Write, organise, and share — in real time, even offline.
        </p>

        <div className="animate-fade-up [animation-delay:0.35s] flex flex-col sm:flex-row items-center justify-center gap-3">
          {isAuthenticated ? (
            <Link to="/dashboard"
              className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold px-6 py-3 rounded-xl transition-all hover:shadow-lg hover:shadow-brand-600/30 hover:-translate-y-0.5 active:scale-95">
              Go to Dashboard <ArrowRight className="h-5 w-5" />
            </Link>
          ) : (
            <>
              <Link to="/signup"
                className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold px-6 py-3 rounded-xl transition-all hover:shadow-lg hover:shadow-brand-600/30 hover:-translate-y-0.5 active:scale-95">
                Start for free <ArrowRight className="h-5 w-5" />
              </Link>
              <Link to="/login"
                className="inline-flex items-center gap-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 font-semibold px-6 py-3 rounded-xl transition-all hover:-translate-y-0.5 active:scale-95">
                Sign in
              </Link>
            </>
          )}
        </div>
        <p className="animate-fade-up [animation-delay:0.45s] mt-4 text-xs text-gray-400 dark:text-gray-600">
          No credit card required · Free forever plan
        </p>
      </div>

      {/* Mock editor — floats gently */}
      <div className="animate-fade-up [animation-delay:0.5s] mt-16 max-w-4xl mx-auto animate-float [animation-duration:6s]">
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-2xl shadow-gray-300/40 dark:shadow-black/50 overflow-hidden">
          {/* Window chrome */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/80">
            <span className="h-3 w-3 rounded-full bg-red-400" />
            <span className="h-3 w-3 rounded-full bg-yellow-400" />
            <span className="h-3 w-3 rounded-full bg-green-400" />
            <span className="ml-4 text-xs text-gray-400 dark:text-gray-600 font-mono">notecraft.app/workspace/team-notes</span>
            <div className="ml-auto flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs text-gray-400">3 online</span>
            </div>
          </div>
          {/* Fake toolbar */}
          <div className="flex items-center gap-1 px-4 py-2 border-b border-gray-100 dark:border-gray-800">
            {['B', 'I', 'U', 'H1', 'H2', '≡', '•'].map(t => (
              <span key={t} className="text-xs font-medium text-gray-400 dark:text-gray-600 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 cursor-default transition-colors">{t}</span>
            ))}
          </div>
          {/* Fake content */}
          <div className="p-6 sm:p-10 text-left space-y-3">
            <div className="h-7 w-56 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
            <div className="h-4 w-full bg-gray-100 dark:bg-gray-800/60 rounded animate-pulse [animation-delay:0.1s]" />
            <div className="h-4 w-5/6 bg-gray-100 dark:bg-gray-800/60 rounded animate-pulse [animation-delay:0.2s]" />
            <div className="h-4 w-4/6 bg-gray-100 dark:bg-gray-800/60 rounded animate-pulse [animation-delay:0.3s]" />
            <div className="h-4 w-full bg-gray-100 dark:bg-gray-800/60 rounded animate-pulse [animation-delay:0.4s]" />
            <div className="h-4 w-3/4 bg-gray-100 dark:bg-gray-800/60 rounded animate-pulse [animation-delay:0.5s]" />
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Features ─────────────────────────────────────────────────────────────────
const features = [
  { icon: Users,    title: 'Real-time collaboration', desc: "See your teammates' cursors and edits live. Changes appear instantly via CRDT sync." },
  { icon: WifiOff,  title: 'Offline-first',           desc: 'Keep writing without internet. Notes sync automatically on reconnect with conflict resolution.' },
  { icon: Search,   title: 'Instant search',          desc: 'Find any note across all workspaces in milliseconds with highlighted snippet results.' },
  { icon: Folder,   title: 'Nested folders',          desc: 'Organise notes in deeply nested folder trees. Rename and move with a right-click menu.' },
  { icon: BookOpen, title: 'Rich text editor',        desc: 'Full toolbar — headings, lists, code blocks, blockquotes, and image uploads.' },
  { icon: Clock,    title: 'Auto-save',               desc: 'Every keystroke is saved with an 800ms debounce and a clear save status indicator.' },
];

const delays = ['[animation-delay:0s]','[animation-delay:0.08s]','[animation-delay:0.16s]','[animation-delay:0.24s]','[animation-delay:0.32s]','[animation-delay:0.4s]'];

function Features() {
  return (
    <section id="features" className="py-20 px-4 sm:px-6 bg-gray-50 dark:bg-gray-900/50">
      <div className="max-w-6xl mx-auto">
        <Reveal className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">Everything your team needs</h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto">Built for speed, reliability, and real collaboration — not just shared documents.</p>
        </Reveal>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, title, desc }, i) => (
            <Reveal key={title} delay={delays[i]}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 group hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-default">
              <div className="h-10 w-10 rounded-xl bg-brand-50 dark:bg-brand-950/40 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <Icon className="h-5 w-5 text-brand-600 dark:text-brand-400" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{desc}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── How it works ─────────────────────────────────────────────────────────────
const steps = [
  { step: '01', title: 'Create a workspace', desc: 'Set up a workspace for your team or personal projects in seconds.' },
  { step: '02', title: 'Invite collaborators', desc: 'Add teammates by email. They get instant access to shared folders and notes.' },
  { step: '03', title: 'Write together',      desc: 'Open any note and start typing. Everyone sees changes in real time.' },
];

function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <Reveal className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">Up and running in minutes</h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto">No complex setup. No onboarding calls. Just sign up and start writing.</p>
        </Reveal>
        <div className="grid sm:grid-cols-3 gap-8 relative">
          {/* connector line */}
          <div className="hidden sm:block absolute top-7 left-1/6 right-1/6 h-px bg-gradient-to-r from-transparent via-brand-300 dark:via-brand-700 to-transparent" />
          {steps.map(({ step, title, desc }, i) => (
            <Reveal key={step} delay={delays[i]} className="relative text-center">
              <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-brand-600 text-white text-xl font-bold mb-5 shadow-lg shadow-brand-600/25 hover:scale-110 transition-transform duration-300 cursor-default">
                {step}
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{desc}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Pricing ──────────────────────────────────────────────────────────────────
const plans = [
  {
    name: 'Free', price: '$0', period: 'forever',
    desc: 'Perfect for personal use and small teams getting started.',
    features: ['Up to 3 workspaces','5 collaborators per workspace','1 GB storage','Offline sync','Community support'],
    cta: 'Get started free', href: '/signup', highlight: false,
  },
  {
    name: 'Pro', price: '$9', period: 'per user / month',
    desc: 'For teams that need more power and unlimited collaboration.',
    features: ['Unlimited workspaces','Unlimited collaborators','50 GB storage','Priority sync','Email support','Version history'],
    cta: 'Start free trial', href: '/signup', highlight: true,
  },
  {
    name: 'Enterprise', price: 'Custom', period: 'contact us',
    desc: 'Tailored for large organisations with advanced security needs.',
    features: ['Everything in Pro','SSO / SAML','Audit logs','Custom data retention','Dedicated support','SLA guarantee'],
    cta: 'Contact sales', href: '#contact', highlight: false,
  },
];

function Pricing() {
  return (
    <section id="pricing" className="py-20 px-4 sm:px-6 bg-gray-50 dark:bg-gray-900/50">
      <div className="max-w-6xl mx-auto">
        <Reveal className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">Simple, transparent pricing</h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto">Start free. Upgrade when your team grows.</p>
        </Reveal>
        <div className="grid sm:grid-cols-3 gap-6 items-start">
          {plans.map((plan, i) => (
            <Reveal key={plan.name} delay={delays[i]}
              className={cn(
                'rounded-2xl border p-7 flex flex-col gap-5 transition-all duration-300 hover:-translate-y-1',
                plan.highlight
                  ? 'border-brand-500 bg-brand-600 text-white shadow-2xl shadow-brand-600/30 scale-105 hover:shadow-brand-600/40'
                  : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:shadow-lg'
              )}>
              <div>
                <p className={cn('text-sm font-semibold mb-1', plan.highlight ? 'text-brand-100' : 'text-brand-600 dark:text-brand-400')}>{plan.name}</p>
                <div className="flex items-end gap-1">
                  <span className={cn('text-4xl font-extrabold', plan.highlight ? 'text-white' : 'text-gray-900 dark:text-white')}>{plan.price}</span>
                  <span className={cn('text-sm mb-1', plan.highlight ? 'text-brand-200' : 'text-gray-400')}>/{plan.period}</span>
                </div>
                <p className={cn('text-sm mt-2', plan.highlight ? 'text-brand-100' : 'text-gray-500 dark:text-gray-400')}>{plan.desc}</p>
              </div>
              <ul className="space-y-2.5 flex-1">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <Check className={cn('h-4 w-4 shrink-0', plan.highlight ? 'text-brand-200' : 'text-brand-600 dark:text-brand-400')} />
                    <span className={plan.highlight ? 'text-brand-50' : 'text-gray-600 dark:text-gray-300'}>{f}</span>
                  </li>
                ))}
              </ul>
              <Link to={plan.href}
                className={cn(
                  'inline-flex items-center justify-center gap-2 font-semibold text-sm px-5 py-2.5 rounded-xl transition-all active:scale-95 hover:-translate-y-0.5',
                  plan.highlight ? 'bg-white text-brand-600 hover:bg-brand-50 hover:shadow-md' : 'bg-brand-600 hover:bg-brand-700 text-white hover:shadow-md hover:shadow-brand-600/25'
                )}>
                {plan.cta} <ChevronRight className="h-4 w-4" />
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Testimonials ─────────────────────────────────────────────────────────────
const testimonials = [
  { quote: 'NoteCraft replaced three tools for our team. The offline sync alone is worth it.', name: 'Sarah K.', role: 'Engineering Lead', initials: 'SK', color: '#0284c7' },
  { quote: 'The real-time cursors make remote standups so much smoother. Feels like being in the same room.', name: 'Marcus T.', role: 'Product Manager', initials: 'MT', color: '#7c3aed' },
  { quote: 'Clean UI, fast search, and it just works. We onboarded 20 people in an afternoon.', name: 'Priya N.', role: 'Startup Founder', initials: 'PN', color: '#059669' },
];

function Testimonials() {
  return (
    <section className="py-20 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <Reveal className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">Loved by teams</h2>
          <p className="text-gray-500 dark:text-gray-400">Don&apos;t take our word for it.</p>
        </Reveal>
        <div className="grid sm:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <Reveal key={t.name} delay={delays[i]}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 flex flex-col gap-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
              {/* Quote marks */}
              <span className="text-4xl leading-none text-brand-200 dark:text-brand-800 font-serif select-none">&ldquo;</span>
              <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed -mt-4">{t.quote}</p>
              <div className="flex items-center gap-3 mt-auto">
                <div className="h-9 w-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ring-2 ring-white dark:ring-gray-900"
                  style={{ backgroundColor: t.color }}>
                  {t.initials}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{t.name}</p>
                  <p className="text-xs text-gray-400">{t.role}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── CTA Banner ───────────────────────────────────────────────────────────────
function CTABanner() {
  const { isAuthenticated } = useAuth();
  return (
    <section className="py-20 px-4 sm:px-6 relative overflow-hidden bg-brand-600 dark:bg-brand-700">
      {/* animated background blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-white/10 blur-3xl animate-float" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-white/10 blur-3xl animate-float [animation-delay:2s]" />
      </div>
      <Reveal className="max-w-3xl mx-auto text-center relative">
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Ready to write better, together?</h2>
        <p className="text-brand-100 mb-8 text-lg">Join thousands of teams already using NoteCraft.</p>
        {isAuthenticated ? (
          <Link to="/dashboard"
            className="inline-flex items-center gap-2 bg-white text-brand-600 hover:bg-brand-50 font-semibold px-7 py-3.5 rounded-xl transition-all hover:shadow-xl hover:-translate-y-0.5 active:scale-95">
            Open Dashboard <ArrowRight className="h-5 w-5" />
          </Link>
        ) : (
          <Link to="/signup"
            className="inline-flex items-center gap-2 bg-white text-brand-600 hover:bg-brand-50 font-semibold px-7 py-3.5 rounded-xl transition-all hover:shadow-xl hover:-translate-y-0.5 active:scale-95">
            Get started free <ArrowRight className="h-5 w-5" />
          </Link>
        )}
      </Reveal>
    </section>
  );
}

// ─── Contact ──────────────────────────────────────────────────────────────────
function Contact() {
  return (
    <section id="contact" className="py-20 px-4 sm:px-6 bg-gray-50 dark:bg-gray-900/50">
      <div className="max-w-xl mx-auto">
        <Reveal className="text-center mb-10">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Get in touch</h2>
          <p className="text-gray-500 dark:text-gray-400">Have a question, feature request, or want to talk enterprise? We&apos;d love to hear from you.</p>
        </Reveal>
        <Reveal animation="animate-fade-up" delay="[animation-delay:0.1s]">
          <form className="space-y-4 text-left bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 sm:p-8 shadow-sm" onSubmit={e => e.preventDefault()}>
            <div className="grid sm:grid-cols-2 gap-4">
              {[{ label: 'Name', type: 'text', placeholder: 'Your name' }, { label: 'Email', type: 'email', placeholder: 'you@example.com' }].map(f => (
                <div key={f.label} className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{f.label}</label>
                  <input type={f.type} placeholder={f.placeholder}
                    className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-shadow" />
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Message</label>
              <textarea rows={4} placeholder="Tell us how we can help..."
                className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none transition-shadow" />
            </div>
            <button type="submit"
              className="w-full inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold px-5 py-2.5 rounded-xl transition-all hover:shadow-md hover:shadow-brand-600/25 hover:-translate-y-0.5 active:scale-95">
              <Mail className="h-4 w-4" /> Send message
            </button>
          </form>
        </Reveal>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 py-12 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid sm:grid-cols-4 gap-8 mb-10">
          <div className="sm:col-span-1">
            <Link to="/" className="flex items-center gap-2 font-bold text-lg text-gray-900 dark:text-white mb-3 hover:opacity-80 transition-opacity">
              <PenLine className="h-5 w-5 text-brand-600" /> NoteCraft
            </Link>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">Collaborative note-taking for modern teams.</p>
            <div className="flex items-center gap-3 mt-4">
              {[
                { href: 'https://github.com', label: 'GitHub', icon: Github },
                { href: 'https://twitter.com', label: 'Twitter', icon: Twitter },
                { href: 'mailto:hello@notecraft.app', label: 'Email', icon: Mail },
              ].map(({ href, label, icon: Icon }) => (
                <a key={label} href={href} target={href.startsWith('http') ? '_blank' : undefined}
                  rel="noreferrer" aria-label={label}
                  className="text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors hover:scale-110 inline-block">
                  <Icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>
          {[
            { title: 'Product', links: [{ label: 'Features', href: '#features' }, { label: 'Pricing', href: '#pricing' }, { label: 'How it works', href: '#how-it-works' }] },
            { title: 'Account', links: [{ label: 'Sign in', href: '/login' }, { label: 'Sign up', href: '/signup' }, { label: 'Dashboard', href: '/dashboard' }, { label: 'Settings', href: '/settings' }] },
            { title: 'Company', links: [{ label: 'Contact', href: '#contact' }, { label: 'Privacy policy', href: '#' }, { label: 'Terms of service', href: '#' }] },
          ].map(col => (
            <div key={col.title}>
              <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{col.title}</p>
              <ul className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                {col.links.map(l => (
                  <li key={l.label}>
                    {l.href.startsWith('/') ? (
                      <Link to={l.href} className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">{l.label}</Link>
                    ) : (
                      <a href={l.href} className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">{l.label}</a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-gray-100 dark:border-gray-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-gray-400">© {new Date().getFullYear()} NoteCraft. All rights reserved.</p>
          <p className="text-xs text-gray-400">Built with React, TypeScript &amp; TailwindCSS</p>
        </div>
      </div>
    </footer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export function LandingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white relative">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <Pricing />
        <Testimonials />
        <CTABanner />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}
