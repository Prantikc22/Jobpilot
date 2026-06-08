import { lazy, Suspense } from "react";
import Navbar from "../components/landing/Navbar";
import Hero from "../components/landing/Hero";

const ScrollStory = lazy(() => import("../components/landing/ScrollStory"));
const BentoFeatures = lazy(() => import("../components/landing/BentoFeatures"));
const ActivityFeed = lazy(() => import("../components/landing/ActivityFeed"));
const Statistics = lazy(() => import("../components/landing/Statistics"));
const Pricing = lazy(() => import("../components/landing/Pricing"));
const FinalCTA = lazy(() => import("../components/landing/FinalCTA"));
const Footer = lazy(() => import("../components/landing/Footer"));

const Skeleton = () => <div className="h-32" aria-hidden />;

export default function Landing() {
  return (
    <div className="relative" data-testid="landing-page">
      <Navbar />
      <main>
        <Hero />
        <Suspense fallback={<Skeleton />}>
          <ScrollStory />
          <BentoFeatures />
          <ActivityFeed />
          <Statistics />
          <Pricing />
          <FinalCTA />
        </Suspense>
      </main>
      <Suspense fallback={<Skeleton />}>
        <Footer />
      </Suspense>
    </div>
  );
}
