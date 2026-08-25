"use client";

import { useCallback } from "react";
import { BrandMark } from "./BrandMark";
import { NavigationDots } from "./NavigationDots";
import { PartnerBadge } from "./PartnerBadge";
import { CalculatorSection } from "./sections/CalculatorSection";
import { ConditionsSection } from "./sections/ConditionsSection";
import { ContactsSection } from "./sections/ContactsSection";
import { usePartnerReferral } from "@/hooks/usePartnerReferral";
import { useSectionNavigator } from "@/hooks/useSectionNavigator";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import styles from "./LandingExperience.module.css";

const SECTION_COUNT = 3;
const SECTION_IDS = ["section-conditions", "section-calculator", "section-contacts"];

export function LandingExperience() {
  const { activeIndex, navigateTo, handleWheel, handleTouchEnd, handleTouchMove, handleTouchStart } =
    useSectionNavigator(SECTION_COUNT);
  const partner = usePartnerReferral();

  const isMobile = useMediaQuery("(max-width: 740px)");

  const handleNavigate = useCallback(
    (index: number) => {
      navigateTo(index);
      if (isMobile) {
        document.getElementById(SECTION_IDS[index])?.scrollIntoView({ behavior: "smooth" });
      }
    },
    [isMobile, navigateTo],
  );

  return (
    <main
      className={styles.viewport}
      onWheel={isMobile ? undefined : handleWheel}
      onTouchEnd={isMobile ? undefined : handleTouchEnd}
      onTouchMove={isMobile ? undefined : handleTouchMove}
      onTouchStart={isMobile ? undefined : handleTouchStart}
    >
      {!isMobile && <NavigationDots activeIndex={activeIndex} onSelect={handleNavigate} />}
      {partner && <PartnerBadge name={partner.name} />}

      <div
        className={styles.track}
        style={isMobile ? undefined : { transform: `translate3d(0, calc(${activeIndex} * -100dvh), 0)` }}
      >
        <section id={SECTION_IDS[0]} className={styles.section} aria-label="Условия">
          <BrandMark onClick={() => handleNavigate(0)} />
          <ConditionsSection active={isMobile || activeIndex === 0} onNext={() => handleNavigate(1)} />
        </section>

        <section id={SECTION_IDS[1]} className={styles.section} aria-label="Калькулятор">
          <CalculatorSection active={isMobile || activeIndex === 1} onNext={() => handleNavigate(2)} />
        </section>

        <section id={SECTION_IDS[2]} className={styles.section} aria-label="Контакты">
          <ContactsSection active={isMobile || activeIndex === 2} onReset={() => handleNavigate(0)} />
        </section>
      </div>
    </main>
  );
}
