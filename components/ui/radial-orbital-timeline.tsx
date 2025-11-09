"use client";

import { useState, useEffect, useRef } from "react";

import { ArrowRight, Link, Zap } from "lucide-react";

import { Badge } from "@/components/ui/badge";

import { Button } from "@/components/ui/button";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TimelineItem {
  id: number;
  title: string;
  date: string;
  content: string;
  category: string;
  icon: React.ElementType;
  relatedIds: number[];
  status: "completed" | "in-progress" | "pending";
  energy: number;
}

interface RadialOrbitalTimelineProps {
  timelineData: TimelineItem[];
}

export default function RadialOrbitalTimeline({
  timelineData,
}: RadialOrbitalTimelineProps) {
  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>(
    {}
  );
  const [viewMode, setViewMode] = useState<"orbital">("orbital");
  const [rotationAngle, setRotationAngle] = useState<number>(0);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [pulseEffect, setPulseEffect] = useState<Record<number, boolean>>({});
  const [centerOffset, setCenterOffset] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [activeNodeId, setActiveNodeId] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const orbitRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === containerRef.current || e.target === orbitRef.current) {
      setExpandedItems({});
      setActiveNodeId(null);
      setPulseEffect({});
      setAutoRotate(true);
    }
  };

  const toggleItem = (id: number) => {
    setExpandedItems((prev) => {
      const newState = { ...prev };
      Object.keys(newState).forEach((key) => {
        if (parseInt(key) !== id) {
          newState[parseInt(key)] = false;
        }
      });
      newState[id] = !prev[id];
      if (!prev[id]) {
        setActiveNodeId(id);
        setAutoRotate(false);
        const relatedItems = getRelatedItems(id);
        const newPulseEffect: Record<number, boolean> = {};
        relatedItems.forEach((relId) => {
          newPulseEffect[relId] = true;
        });
        setPulseEffect(newPulseEffect);
        centerViewOnNode(id);
      } else {
        setActiveNodeId(null);
        setAutoRotate(true);
        setPulseEffect({});
      }
      return newState;
    });
  };

  useEffect(() => {
    let rotationTimer: NodeJS.Timeout;
    if (autoRotate && viewMode === "orbital") {
      rotationTimer = setInterval(() => {
        setRotationAngle((prev) => {
          const newAngle = (prev + 0.3) % 360;
          return Number(newAngle.toFixed(3));
        });
      }, 50);
    }
    return () => {
      if (rotationTimer) {
        clearInterval(rotationTimer);
      }
    };
  }, [autoRotate, viewMode]);

  const centerViewOnNode = (nodeId: number) => {
    if (viewMode !== "orbital" || !nodeRefs.current[nodeId]) return;
    const nodeIndex = timelineData.findIndex((item) => item.id === nodeId);
    const totalNodes = timelineData.length;
    const targetAngle = (nodeIndex / totalNodes) * 360;
    setRotationAngle(270 - targetAngle);
  };

  const calculateNodePosition = (index: number, total: number) => {
    const angle = ((index / total) * 360 + rotationAngle) % 360;
    const radius = 200;
    const radian = (angle * Math.PI) / 180;
    const x = radius * Math.cos(radian) + centerOffset.x;
    const y = radius * Math.sin(radian) + centerOffset.y;
    const zIndex = Math.round(100 + 50 * Math.cos(radian));
    const opacity = Math.max(
      0.5,
      Math.min(1, 0.5 + 0.5 * ((1 + Math.sin(radian)) / 2))
    );
    return { x, y, angle, zIndex, opacity };
  };

  const getRelatedItems = (itemId: number): number[] => {
    const currentItem = timelineData.find((item) => item.id === itemId);
    return currentItem ? currentItem.relatedIds : [];
  };

  const isRelatedToActive = (itemId: number): boolean => {
    if (!activeNodeId) return false;
    const relatedItems = getRelatedItems(activeNodeId);
    return relatedItems.includes(itemId);
  };

  const getStatusStyles = (status: TimelineItem["status"]): string => {
    switch (status) {
      case "completed":
        return "text-white bg-black/60 border-white/30";
      case "in-progress":
        return "text-black bg-white/90 border-white";
      case "pending":
        return "text-white/70 bg-black/40 border-white/20";
      default:
        return "text-white/70 bg-black/40 border-white/20";
    }
  };

  return (
    <div
      className="relative w-full min-h-screen flex flex-col items-center justify-center bg-black overflow-hidden"
      ref={containerRef}
      onClick={handleContainerClick}
    >
      {/* Atmospheric background effects matching hero */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Warm gradient overlays matching hero's pink/orange sky */}
        <div 
          className="absolute inset-0 opacity-15"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(236, 72, 153, 0.2) 0%, rgba(168, 85, 247, 0.15) 40%, rgba(251, 146, 60, 0.1) 60%, transparent 80%)',
          }}
        />
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-3xl opacity-5"
          style={{
            background: 'radial-gradient(circle, rgba(236, 72, 153, 0.4) 0%, rgba(251, 146, 60, 0.2) 50%, transparent 70%)',
          }}
        />
        {/* Subtle mist effect */}
        <div 
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(circle at 50% 50%, transparent 0%, rgba(0, 0, 0, 0.4) 100%)',
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-5xl h-full flex items-center justify-center py-24 md:py-32">
        <div
          className="absolute w-full h-full flex items-center justify-center"
          ref={orbitRef}
          style={{
            perspective: "1000px",
            transform: `translate(${centerOffset.x}px, ${centerOffset.y}px)`,
          }}
        >
          {/* Center core with warm gradient matching hero */}
          <div 
            className="absolute w-20 h-20 rounded-full flex items-center justify-center z-10 animate-pulse"
            style={{
              background: 'radial-gradient(circle, rgba(251, 146, 60, 0.8) 0%, rgba(236, 72, 153, 0.6) 50%, rgba(168, 85, 247, 0.4) 100%)',
              boxShadow: '0 0 40px rgba(236, 72, 153, 0.5), 0 0 80px rgba(251, 146, 60, 0.3)',
            }}
          >
            <div 
              className="absolute w-32 h-32 rounded-full border animate-ping opacity-30"
              style={{
                borderColor: 'rgba(236, 72, 153, 0.4)',
                animationDuration: '2s',
              }}
            ></div>
            <div 
              className="absolute w-40 h-40 rounded-full border animate-ping opacity-20"
              style={{
                borderColor: 'rgba(251, 146, 60, 0.3)',
                animationDuration: '3s',
                animationDelay: '0.5s',
              }}
            ></div>
            <div 
              className="relative w-12 h-12 rounded-full backdrop-blur-md border border-white/30"
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
              }}
            ></div>
          </div>
          
          {/* Orbital ring with ethereal styling */}
          <div 
            className="absolute w-[400px] h-[400px] rounded-full border"
            style={{
              borderColor: 'rgba(255, 255, 255, 0.1)',
              boxShadow: '0 0 20px rgba(236, 72, 153, 0.1)',
            }}
          ></div>
          
          {timelineData.map((item, index) => {
            const position = calculateNodePosition(index, timelineData.length);
            const isExpanded = expandedItems[item.id];
            const isRelated = isRelatedToActive(item.id);
            const isPulsing = pulseEffect[item.id];
            const Icon = item.icon;
            const nodeStyle = {
              transform: `translate(${position.x}px, ${position.y}px)`,
              zIndex: isExpanded ? 200 : position.zIndex,
              opacity: isExpanded ? 1 : position.opacity,
            };

            return (
              <div
                key={item.id}
                ref={(el) => (nodeRefs.current[item.id] = el)}
                className="absolute transition-all duration-700 cursor-pointer"
                style={nodeStyle}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleItem(item.id);
                }}
              >
                {/* Energy pulse effect with warm colors */}
                <div
                  className={`absolute rounded-full -inset-1 ${
                    isPulsing ? "animate-pulse" : ""
                  }`}
                  style={{
                    background: `radial-gradient(circle, rgba(236, 72, 153, 0.3) 0%, rgba(251, 146, 60, 0.2) 50%, rgba(255,255,255,0) 70%)`,
                    width: `${item.energy * 0.5 + 40}px`,
                    height: `${item.energy * 0.5 + 40}px`,
                    left: `-${(item.energy * 0.5 + 40 - 40) / 2}px`,
                    top: `-${(item.energy * 0.5 + 40 - 40) / 2}px`,
                    animationDuration: isPulsing ? '1.5s' : '2s',
                  }}
                ></div>
                
                {/* Node with ethereal styling */}
                <div
                  className={`
                  w-12 h-12 rounded-full flex items-center justify-center
                  border-2 transition-all duration-300
                  ${
                    isExpanded
                      ? "bg-white text-black border-white shadow-lg"
                      : isRelated
                      ? "bg-white/60 text-black border-white/80"
                      : "bg-black/60 text-white border-white/30 backdrop-blur-sm"
                  }
                  ${isExpanded ? "scale-150" : ""}
                `}
                  style={{
                    boxShadow: isExpanded 
                      ? '0 0 30px rgba(236, 72, 153, 0.4), 0 0 60px rgba(251, 146, 60, 0.2)'
                      : isRelated
                      ? '0 0 20px rgba(236, 72, 153, 0.3)'
                      : '0 0 10px rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <Icon size={18} />
                </div>
                
                {/* Title with elegant typography */}
                <div
                  className={`
                  absolute top-14 whitespace-nowrap
                  text-xs font-light tracking-wide
                  transition-all duration-300
                  ${isExpanded ? "text-white scale-110" : "text-white/70"}
                  italic
                `}
                  style={{ fontFamily: 'var(--font-cormorant-garamond)' }}
                >
                  {item.title}
                </div>
                
                {/* Expanded card with hero aesthetic */}
                {isExpanded && (
                  <Card 
                    className="absolute top-24 left-1/2 -translate-x-1/2 w-72 bg-black/90 backdrop-blur-lg border-white/20 shadow-2xl overflow-visible"
                    style={{
                      boxShadow: '0 0 40px rgba(236, 72, 153, 0.2), 0 0 80px rgba(0, 0, 0, 0.5)',
                    }}
                  >
                    <div 
                      className="absolute -top-3 left-1/2 -translate-x-1/2 w-px h-3"
                      style={{
                        background: 'linear-gradient(to top, rgba(236, 72, 153, 0.5), transparent)',
                      }}
                    ></div>
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-center">
                        <Badge
                          className={`px-3 text-xs border ${getStatusStyles(
                            item.status
                          )}`}
                        >
                          {item.status === "completed"
                            ? "COMPLETE"
                            : item.status === "in-progress"
                            ? "IN PROGRESS"
                            : "PENDING"}
                        </Badge>
                        <span 
                          className="text-xs font-light text-white/50 italic"
                          style={{ fontFamily: 'var(--font-cormorant-garamond)' }}
                        >
                          {item.date}
                        </span>
                      </div>
                      <CardTitle 
                        className="text-base mt-3 font-light text-white italic"
                        style={{ fontFamily: 'var(--font-cormorant-garamond)' }}
                      >
                        {item.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-white/70 italic leading-relaxed">
                      <p style={{ fontFamily: 'var(--font-cormorant-garamond)' }}>{item.content}</p>
                      <div className="mt-5 pt-4 border-t border-white/10">
                        <div className="flex justify-between items-center text-xs mb-2">
                          <span className="flex items-center text-white/60 italic" style={{ fontFamily: 'var(--font-cormorant-garamond)' }}>
                            <Zap size={12} className="mr-2" />
                            Energy Level
                          </span>
                          <span className="font-light text-white/50 italic" style={{ fontFamily: 'var(--font-cormorant-garamond)' }}>{item.energy}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ 
                              width: `${item.energy}%`,
                              background: 'linear-gradient(to right, rgba(251, 146, 60, 0.8), rgba(236, 72, 153, 0.8), rgba(168, 85, 247, 0.8))',
                            }}
                          ></div>
                        </div>
                      </div>
                      {item.relatedIds.length > 0 && (
                        <div className="mt-5 pt-4 border-t border-white/10">
                          <div className="flex items-center mb-3">
                            <Link size={12} className="text-white/50 mr-2" />
                            <h4 
                              className="text-xs tracking-wider font-light text-white/60 italic uppercase"
                              style={{ fontFamily: 'var(--font-cormorant-garamond)' }}
                            >
                              Connected Nodes
                            </h4>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {item.relatedIds.map((relatedId) => {
                              const relatedItem = timelineData.find(
                                (i) => i.id === relatedId
                              );
                              return (
                                <Button
                                  key={relatedId}
                                  variant="outline"
                                  size="sm"
                                  className="flex items-center h-7 px-3 py-0 text-xs rounded-sm border-white/20 bg-black/40 hover:bg-white/10 text-white/70 hover:text-white transition-all italic backdrop-blur-sm"
                                  style={{ fontFamily: 'var(--font-cormorant-garamond)' }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleItem(relatedId);
                                  }}
                                >
                                  {relatedItem?.title}
                                  <ArrowRight
                                    size={10}
                                    className="ml-2 text-white/50"
                                  />
                                </Button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
