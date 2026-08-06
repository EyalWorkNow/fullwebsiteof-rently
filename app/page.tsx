import Hero from "@/components/keyz/Hero";
import ListingRows from "@/components/keyz/ListingRows";
import AiBanner from "@/components/keyz/AiBanner";
import AppDownloadBanner from "@/components/keyz/AppDownloadBanner";
import Services from "@/components/keyz/Services";

export default function Home() {
  return (
    <main>
      <Hero />
      <ListingRows />
      <AiBanner />
      <Services />
      <AppDownloadBanner />
    </main>
  );
}
