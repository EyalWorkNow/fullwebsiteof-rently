import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import HeroLead from "@/components/HeroLead";
import Stats from "@/components/Stats";
import Problem from "@/components/Problem";
import HowItWorks from "@/components/HowItWorks";
import Features from "@/components/Features";
import Solution from "@/components/Solution";
import Audiences from "@/components/Audiences";
import ForLandlords from "@/components/ForLandlords";
import Testimonials from "@/components/Testimonials";
import Download from "@/components/Download";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <HeroLead />
        <Stats />
        <Problem />
        <HowItWorks />
        <Features />
        <Solution />
        <Audiences />
        <ForLandlords />
        <Testimonials />
        <Download />
      </main>
      <Footer />
    </>
  );
}
