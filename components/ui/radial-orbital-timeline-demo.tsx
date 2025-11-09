"use client";

import { 
  Network, 
  Server, 
  Send, 
  CheckCircle, 
  TrendingUp, 
  Coins 
} from "lucide-react";

import RadialOrbitalTimeline from "@/components/ui/radial-orbital-timeline";

const timelineData = [
  {
    id: 1,
    title: "Network Discovery",
    date: "Step 1",
    content: "Discover active miners and validators through the on-chain Registry Program. Query for active neurons in your subnet and retrieve Axon endpoints for direct communication.",
    category: "Discovery",
    icon: Network,
    relatedIds: [2],
    status: "completed" as const,
    energy: 100,
  },
  {
    id: 2,
    title: "Deploy Endpoint",
    date: "Step 2",
    content: "Deploy your Axon server (for miners) or configure Dendrite client (for validators). Set up HTTP/2 endpoints, configure authentication with Solana hotkeys, and advertise your capabilities.",
    category: "Setup",
    icon: Server,
    relatedIds: [1, 3],
    status: "completed" as const,
    energy: 95,
  },
  {
    id: 3,
    title: "Send Synapse Request",
    date: "Step 3",
    content: "Validators send structured Synapse requests to miners with task specifications, authentication signatures, and metadata. Supports multiple task types: inference, embedding, classification, and custom tasks.",
    category: "Communication",
    icon: Send,
    relatedIds: [2, 4],
    status: "in-progress" as const,
    energy: 85,
  },
  {
    id: 4,
    title: "Process & Validate",
    date: "Step 4",
    content: "Miners process AI tasks and return Synapse responses with results, metrics (latency, confidence, quality scores), and signed authentication. Validators evaluate responses using subnet-specific incentive functions.",
    category: "Processing",
    icon: CheckCircle,
    relatedIds: [3, 5],
    status: "in-progress" as const,
    energy: 70,
  },
  {
    id: 5,
    title: "Submit Weights",
    date: "Step 5",
    content: "Validators calculate weights (0-10000 scale) for each miner based on evaluation metrics and submit them to the Consensus Program on-chain. Wait for consensus finalization across the network.",
    category: "Consensus",
    icon: TrendingUp,
    relatedIds: [4, 6],
    status: "pending" as const,
    energy: 50,
  },
  {
    id: 6,
    title: "Receive Emissions",
    date: "Step 6",
    content: "Receive token emissions based on consensus alignment and performance. The Emission Program distributes rewards to miners and validators according to their contributions and consensus participation.",
    category: "Rewards",
    icon: Coins,
    relatedIds: [5],
    status: "pending" as const,
    energy: 30,
  },
];

export function RadialOrbitalTimelineDemo() {
  return (
    <section className="relative w-full bg-black">
      {/* Optional header - can be removed if not needed */}
      <div className="absolute top-8 left-0 right-0 z-20 flex justify-center pointer-events-none">
        <h2 
          className="text-2xl md:text-3xl font-light text-white/40 italic"
          style={{ fontFamily: 'var(--font-cormorant-garamond)' }}
        >
          Protocol Journey
        </h2>
      </div>
      <RadialOrbitalTimeline timelineData={timelineData} />
    </section>
  );
}

export default {
  RadialOrbitalTimelineDemo,
};

