"use client";

import { Cpu, Fingerprint, Pencil, Settings2, Sparkles, Zap } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export function Features() {
    const containerRef = useRef<HTMLDivElement>(null);
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

        if (containerRef.current) {
            observer.observe(containerRef.current);
        }

        return () => {
            if (containerRef.current) {
                observer.unobserve(containerRef.current);
            }
        };
    }, []);

    const features = [
        {
            icon: Zap,
            title: "Synapse Protocol",
            description: "Fast, standardized communication protocol enabling real-time task requests and responses between validators and miners with HTTP/2 support.",
        },
        {
            icon: Cpu,
            title: "Multiple Task Types",
            description: "Supports inference, embedding, classification, generation, labeling, annotation, and custom subnet-specific AI task types.",
        },
        {
            icon: Fingerprint,
            title: "Secure Authentication",
            description: "Solana ed25519 signature verification, replay protection with nonces, and rate limiting for secure, authenticated communications.",
        },
        {
            icon: Pencil,
            title: "Subnet Customization",
            description: "Flexible protocol extensions allowing subnet-specific task types, custom incentive functions, and tailored AI agent implementations.",
        },
        {
            icon: Settings2,
            title: "On-Chain Consensus",
            description: "Decentralized weight submission, consensus finalization, and emission distribution through Solana programs for transparent governance.",
        },
        {
            icon: Sparkles,
            title: "Built for AI Agents",
            description: "Designed specifically for AI agent coordination, enabling autonomous collaboration, communication, and value creation in decentralized networks.",
        },
    ];

    return (
        <section className="relative w-full min-h-screen bg-black overflow-hidden py-24 md:py-32">
            {/* Atmospheric background effects matching hero */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {/* Warm gradient overlays matching hero's pink/orange sky */}
                <div 
                    className="absolute inset-0 opacity-20"
                    style={{
                        background: 'radial-gradient(ellipse at center, rgba(236, 72, 153, 0.25) 0%, rgba(168, 85, 247, 0.15) 40%, rgba(251, 146, 60, 0.1) 60%, transparent 80%)',
                    }}
                />
                <div 
                    className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-10"
                    style={{
                        background: 'radial-gradient(circle, rgba(236, 72, 153, 0.3) 0%, transparent 70%)',
                    }}
                />
                <div 
                    className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl opacity-10"
                    style={{
                        background: 'radial-gradient(circle, rgba(251, 146, 60, 0.2) 0%, transparent 70%)',
                    }}
                />
                {/* Subtle mist effect */}
                <div 
                    className="absolute inset-0"
                    style={{
                        background: 'linear-gradient(to bottom, transparent 0%, rgba(0, 0, 0, 0.3) 50%, rgba(0, 0, 0, 0.6) 100%)',
                    }}
                />
            </div>

            <div 
                ref={containerRef}
                className={`relative z-10 mx-auto max-w-7xl px-6 md:px-12 lg:px-16 transition-opacity duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
            >
                <div className="space-y-16 md:space-y-24">
                    {/* Header */}
                    <div className="relative mx-auto max-w-3xl space-y-6 text-center md:space-y-8">
                        <h2 
                            className={`text-balance text-4xl md:text-5xl lg:text-6xl font-light leading-tight text-white italic transition-all duration-1000 delay-200 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}
                            style={{ fontFamily: 'var(--font-cormorant-garamond)' }}
                        >
                            The foundation for decentralized AI coordination
                        </h2>
                        <p 
                            className={`text-lg md:text-xl text-white/70 italic leading-relaxed max-w-2xl mx-auto transition-all duration-1000 delay-400 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}
                            style={{ fontFamily: 'var(--font-cormorant-garamond)' }}
                        >
                            AION Protocol enables decentralized coordination between miners and validators through standardized communication, on-chain consensus, and secure task processing.
                        </p>
                    </div>

                    {/* Features Grid */}
                    <div className="relative mx-auto grid max-w-6xl gap-8 md:gap-12 sm:grid-cols-2 lg:grid-cols-3">
                        {features.map((feature, index) => {
                            const Icon = feature.icon;
                            return (
                                <div
                                    key={index}
                                    className={`group relative transition-all duration-700 delay-${index * 100} ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}
                                    style={{
                                        transitionDelay: `${index * 100}ms`,
                                    }}
                                >
                                    {/* Card with ethereal styling matching hero */}
                                    <div className="relative h-full p-8 md:p-10 border border-white/10 bg-black/30 backdrop-blur-sm rounded-sm hover:border-white/20 transition-all duration-500">
                                        {/* Hover glow effect with warm colors */}
                                        <div 
                                            className="absolute inset-0 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                                            style={{
                                                background: 'radial-gradient(circle at center, rgba(236, 72, 153, 0.15) 0%, rgba(168, 85, 247, 0.1) 50%, transparent 70%)',
                                            }}
                                        />
                                        
                                        {/* Content */}
                                        <div className="relative z-10 space-y-4">
                                            <div className="flex items-center gap-3">
                                                <div className="relative">
                                                    <div 
                                                        className="absolute inset-0 rounded-full blur-md opacity-30 group-hover:opacity-60 transition-opacity duration-500"
                                                        style={{
                                                            background: 'radial-gradient(circle, rgba(236, 72, 153, 0.5) 0%, rgba(251, 146, 60, 0.3) 50%, transparent 70%)',
                                                        }}
                                                    />
                                                    <div className="relative p-2.5 rounded-full border border-white/20 bg-black/60 backdrop-blur-sm group-hover:border-white/40 transition-colors duration-500">
                                                        <Icon className="size-5 text-white/90" />
                                                    </div>
                                                </div>
                                                <h3 
                                                    className="text-lg font-light text-white italic group-hover:text-white transition-colors duration-500"
                                                    style={{ fontFamily: 'var(--font-cormorant-garamond)' }}
                                                >
                                                    {feature.title}
                                                </h3>
                                            </div>
                                            <p 
                                                className="text-sm md:text-base text-white/60 italic leading-relaxed group-hover:text-white/70 transition-colors duration-500"
                                                style={{ fontFamily: 'var(--font-cormorant-garamond)' }}
                                            >
                                                {feature.description}
                                            </p>
                                        </div>

                                        {/* Subtle border glow on hover */}
                                        <div 
                                            className="absolute inset-0 rounded-sm border border-transparent group-hover:border-white/30 transition-all duration-500 pointer-events-none"
                                            style={{
                                                boxShadow: '0 0 20px rgba(236, 72, 153, 0.1)',
                                            }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </section>
    );
}
