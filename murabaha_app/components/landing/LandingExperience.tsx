"use client";

import { BrandMark } from "./BrandMark";
import { NavigationDots } from "./NavigationDots";
import { CalculatorSection } from "./sections/CalculatorSection";
import { ConditionsSection } from "./sections/ConditionsSection";
import { ContactsSection } from "./sections/ContactsSection";
import { useSectionNavigator } from "@/hooks/useSectionNavigator";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import styles from "./LandingExperience.module.css";

const SECTION_COUNT = 3;

export function LandingExperience() {
  const { activeIndex, navigateTo, handleWheel, handleTouchEnd, handleTouchMove, handleTouchStart } =
    useSectionNavigator(SECTION_COUNT);

  const isMobile = useMediaQuery("(max-width: 740px)");

  return (
    <main
      className={styles.viewport}
      onWheel={isMobile ? undefined : handleWheel}
      onTouchEnd={isMobile ? undefined : handleTouchEnd}
      onTouchMove={isMobile ? undefined : handleTouchMove}
      onTouchStart={isMobile ? undefined : handleTouchStart}
    >
      <BrandMark onClick={() => navigateTo(0)} />
      {!isMobile && <NavigationDots activeIndex={activeIndex} onSelect={navigateTo} />}

      <div
        className={styles.track}
        style={isMobile ? undefined : { transform: `translate3d(0, calc(${activeIndex} * -100dvh), 0)` }}
      >
        <section className={styles.section} aria-label="Условия">
          <ConditionsSection active={isMobile || activeIndex === 0} onNext={() => navigateTo(1)} />
        </section>

        <section className={styles.section} aria-label="Калькулятор">
          <CalculatorSection active={isMobile || activeIndex === 1} onNext={() => navigateTo(2)} />
        </section>

        <section className={styles.section} aria-label="Контакты">
          <ContactsSection active={isMobile || activeIndex === 2} onReset={() => navigateTo(0)} />
        </section>
      </div>
    </main>
  );
}
