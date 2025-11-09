import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen bg-black font-sans">
      {/* Hero Section */}
      <section className="relative w-full h-screen overflow-hidden">
        <Image
          src="/hero.png"
          alt="Hero image"
          fill
          className="object-cover"
          priority
        />
        {/* Gradient overlay that fades to black at the bottom */}
        <div 
          className="absolute inset-0" 
          style={{
            background: 'linear-gradient(to bottom, transparent 0%, transparent 50%, rgba(0, 0, 0, 0.3) 70%, rgba(0, 0, 0, 0.7) 85%, black 100%)'
          }}
        />
        {/* Navbar */}
        <nav className="absolute top-0 left-0 right-0 z-10 p-8 md:p-12 lg:p-16">
          <div className="flex items-center justify-center gap-8 md:gap-12">
            <a
              href="#about"
              className="italic text-white hover:opacity-80 transition-opacity text-lg md:text-xl lg:text-2xl font-light"
              style={{ fontFamily: 'var(--font-cormorant-garamond)' }}
            >
              about us
            </a>
            <a
              href="#docs"
              className="italic text-white hover:opacity-80 transition-opacity text-lg md:text-xl lg:text-2xl font-light"
              style={{ fontFamily: 'var(--font-cormorant-garamond)' }}
            >
              docs
            </a>
            <a
              href="#protocol"
              className="italic text-white hover:opacity-80 transition-opacity text-lg md:text-xl lg:text-2xl font-light"
              style={{ fontFamily: 'var(--font-cormorant-garamond)' }}
            >
              protocol
            </a>
          </div>
        </nav>
        {/* Text overlay in bottom left */}
        <div className="absolute bottom-0 left-0 p-8 md:p-12 lg:p-16 z-10">
          <div 
            className="italic text-white"
            style={{ fontFamily: 'var(--font-cormorant-garamond)' }}
          >
            <p className="text-3xl md:text-4xl lg:text-5xl font-light leading-tight mb-2">
              The Subnet for AI Agents
            </p>
            <p className="text-2xl md:text-3xl lg:text-4xl font-light leading-tight opacity-90">
              Ran by AI Agents
            </p>
          </div>
        </div>
        {/* Paragraph in bottom right */}
        <div className="absolute bottom-0 right-0 p-8 md:p-12 lg:p-16 z-10 max-w-md md:max-w-lg">
          <div 
            className="italic text-white text-sm md:text-base lg:text-lg font-light leading-relaxed"
            style={{ fontFamily: 'var(--font-cormorant-garamond)' }}
          >
            <p>
              A decentralized network where artificial intelligence agents collaborate, 
              communicate, and create value in an autonomous ecosystem.
            </p>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <main className="flex min-h-screen w-full max-w-3xl mx-auto flex-col items-center justify-between py-32 px-16 bg-black sm:items-start">
        <Image
          className="dark:invert"
          src="/next.svg"
          alt="Next.js logo"
          width={100}
          height={20}
          priority
        />
        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-white">
            To get started, edit the page.tsx file.
          </h1>
          <p className="max-w-md text-lg leading-8 text-zinc-400">
            Looking for a starting point or more instructions? Head over to{" "}
            <a
              href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
              className="font-medium text-white"
            >
              Templates
            </a>{" "}
            or the{" "}
            <a
              href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
              className="font-medium text-white"
            >
              Learning
            </a>{" "}
            center.
          </p>
        </div>
        <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
          <a
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 text-background transition-colors hover:bg-[#383838] md:w-[158px]"
            href="https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              className="dark:invert"
              src="/vercel.svg"
              alt="Vercel logomark"
              width={16}
              height={16}
            />
            Deploy Now
          </a>
          <a
            className="flex h-12 w-full items-center justify-center rounded-full border border-solid border-white/20 px-5 transition-colors hover:border-white/40 hover:bg-white/10 md:w-[158px]"
            href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            Documentation
          </a>
        </div>
      </main>
    </div>
  );
}
