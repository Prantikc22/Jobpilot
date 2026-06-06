import Navbar from "../components/landing/Navbar";
import Hero from "../components/landing/Hero";
import ScrollStory from "../components/landing/ScrollStory";
import BentoFeatures from "../components/landing/BentoFeatures";
import ActivityFeed from "../components/landing/ActivityFeed";
import Statistics from "../components/landing/Statistics";
import Pricing from "../components/landing/Pricing";
import FinalCTA from "../components/landing/FinalCTA";
import Footer from "../components/landing/Footer";

export default function Landing() {
  return (
    <div className="relative" data-testid="landing-page">
      <Navbar />
      <main>
        <Hero />
        <ScrollStory />
        <BentoFeatures />
        <ActivityFeed />
        <Statistics />
        <Pricing />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
