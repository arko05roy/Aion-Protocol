"use client";

import { useEffect, useRef, useState } from 'react';
import { Github, Twitter, Mail } from 'lucide-react';

export function Footer() {
    const footerRef = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                }
            },
            { threshold: 0.1 }
        );

        if (footerRef.current) {
            observer.observe(footerRef.current);
        }

        return () => {
            if (footerRef.current) {
                observer.unobserve(footerRef.current);
            }
        };
    }, []);

    const links = [
        { name: "Protocol", href: "#protocol" },
        { name: "Documentation", href: "#docs" },
        { name: "About", href: "#about" },
    ];

    const socialLinks = [
        { icon: Github, href: "#", label: "GitHub" },
        { icon: Twitter, href: "#", label: "Twitter" },
        { icon: Mail, href: "#", label: "Email" },
    ];

    return (
        <footer 
            ref={footerRef}
            className="relative w-full bg-black overflow-hidden border-t border-white/10"
        >
            {/* Atmospheric background effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {/* Warm gradient overlays matching hero */}
                <div 
                    className="absolute inset-0 opacity-15"
                    style={{
                        background: 'radial-gradient(ellipse at center top, rgba(236, 72, 153, 0.2) 0%, rgba(168, 85, 247, 0.15) 30%, rgba(251, 146, 60, 0.1) 50%, transparent 70%)',
                    }}
                />
                <div 
                    className="absolute bottom-0 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-5"
                    style={{
                        background: 'radial-gradient(circle, rgba(236, 72, 153, 0.3) 0%, transparent 70%)',
                    }}
                />
                <div 
                    className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full blur-3xl opacity-5"
                    style={{
                        background: 'radial-gradient(circle, rgba(251, 146, 60, 0.2) 0%, transparent 70%)',
                    }}
                />
                {/* Subtle mist effect */}
                <div 
                    className="absolute inset-0"
                    style={{
                        background: 'linear-gradient(to top, rgba(0, 0, 0, 0.6) 0%, transparent 100%)',
                    }}
                />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 lg:px-16 py-16 md:py-24">
                <div className="flex flex-col items-center space-y-12 md:space-y-16">
                    {/* AION Logo with glowy text */}
                    <div 
                        className={`transition-all duration-1000 ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
                    >
                        <h2 
                            className="text-6xl md:text-7xl lg:text-8xl font-light tracking-wider italic relative inline-block"
                            style={{ 
                                fontFamily: 'var(--font-cormorant-garamond)',
                            }}
                        >
                            {/* Outer glow layer */}
                            <span 
                                className="absolute inset-0 blur-3xl opacity-60 pointer-events-none"
                                style={{
                                    backgroundImage: 'linear-gradient(135deg, rgba(236, 72, 153, 0.9) 0%, rgba(251, 146, 60, 0.9) 50%, rgba(168, 85, 247, 0.9) 100%)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    backgroundClip: 'text',
                                }}
                            >
                                AION
                            </span>
                            {/* Middle glow layer */}
                            <span 
                                className="absolute inset-0 blur-xl opacity-80 pointer-events-none"
                                style={{
                                    backgroundImage: 'linear-gradient(135deg, rgba(236, 72, 153, 0.95) 0%, rgba(251, 146, 60, 0.95) 50%, rgba(168, 85, 247, 0.95) 100%)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    backgroundClip: 'text',
                                }}
                            >
                                AION
                            </span>
                            {/* Main text with gradient and glow animation */}
                            <span 
                                className="relative inline-block aion-glow"
                                style={{
                                    backgroundImage: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(236, 72, 153, 0.9) 25%, rgba(251, 146, 60, 0.95) 50%, rgba(168, 85, 247, 0.9) 75%, rgba(255, 255, 255, 0.98) 100%)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    backgroundClip: 'text',
                                }}
                            >
                                AION
                            </span>
                        </h2>
                    </div>

                    {/* Navigation Links */}
                    <nav 
                        className={`flex flex-wrap items-center justify-center gap-6 md:gap-10 transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                    >
                        {links.map((link, index) => (
                            <a
                                key={index}
                                href={link.href}
                                className="group relative text-white/60 hover:text-white italic transition-all duration-300 text-base md:text-lg"
                                style={{ fontFamily: 'var(--font-cormorant-garamond)' }}
                            >
                                <span className="relative z-10">{link.name}</span>
                                <span 
                                    className="absolute -bottom-1 left-0 w-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent group-hover:w-full transition-all duration-300"
                                />
                            </a>
                        ))}
                    </nav>

                    {/* Social Links */}
                    <div 
                        className={`flex items-center justify-center gap-6 transition-all duration-1000 delay-400 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                    >
                        {socialLinks.map((social, index) => {
                            const Icon = social.icon;
                            return (
                                <a
                                    key={index}
                                    href={social.href}
                                    aria-label={social.label}
                                    className="group relative p-3 border border-white/10 rounded-full bg-black/40 backdrop-blur-sm hover:border-white/30 transition-all duration-300 hover:scale-110"
                                >
                                    <Icon 
                                        className="size-5 text-white/60 group-hover:text-white transition-colors duration-300" 
                                    />
                                    {/* Hover glow effect */}
                                    <div 
                                        className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                        style={{
                                            background: 'radial-gradient(circle, rgba(236, 72, 153, 0.2) 0%, transparent 70%)',
                                            boxShadow: '0 0 20px rgba(236, 72, 153, 0.3)',
                                        }}
                                    />
                                </a>
                            );
                        })}
                    </div>

                    {/* Divider */}
                    <div 
                        className={`w-full max-w-2xl h-px transition-all duration-1000 delay-600 ${isVisible ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0'}`}
                        style={{
                            background: 'linear-gradient(to right, transparent, rgba(255, 255, 255, 0.1), transparent)',
                        }}
                    />

                    {/* Copyright */}
                    <div 
                        className={`text-center transition-all duration-1000 delay-800 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                    >
                        <p 
                            className="text-sm text-white/40 italic"
                            style={{ fontFamily: 'var(--font-cormorant-garamond)' }}
                        >
                            © {new Date().getFullYear()} AION Protocol. All rights reserved.
                        </p>
                        <p 
                            className="text-xs text-white/30 italic mt-2"
                            style={{ fontFamily: 'var(--font-cormorant-garamond)' }}
                        >
                            Decentralized AI coordination for the future
                        </p>
                    </div>
                </div>
            </div>
        </footer>
    );
}

