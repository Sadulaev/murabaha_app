import { AnimatedText } from "../AnimatedText";
import styles from "./ContactsSection.module.css";

type ContactsSectionProps = {
  active: boolean;
  onReset: () => void;
};

const contactCards = [
  // {
  //   title: "Телефон",
  //   value: "+7 (928) 895-80-95",
  //   href: "tel:+79288958095",
  // },
  // {
  //   title: "WhatsApp",
  //   value: "Написать в WhatsApp",
  //   href: "https://wa.me/79288958095",
  // },
  {
    title: "Адрес",
    value: "г. Грозный, ул. Ярославского, д. 12",
    href: "https://maps.yandex.ru/?text=г. Грозный, ул. Ярославского, д. 12",
  },
];

export function ContactsSection({ active, onReset }: ContactsSectionProps) {
  return (
    <div className={styles.section}>
      <div className={styles.shell}>
        <div className={styles.copyColumn}>
          <AnimatedText as="span" active={active} delay={0} className={styles.eyebrow}>
            Контакты
          </AnimatedText>

          <AnimatedText as="h2" active={active} delay={80} className={styles.title}>
            Быстрый выход на связь без длинной переписки.
          </AnimatedText>

          <AnimatedText as="p" active={active} delay={160} className={styles.description}>
            Можно сразу позвонить, написать в WhatsApp или прийти по адресу. Подскажем по документам,
            взносу и поручителям.
          </AnimatedText>

          <AnimatedText as="div" active={active} delay={220} className={styles.scheduleCard}>
            <span className={styles.scheduleLabel}>Режим работы</span>
            <strong>Ежедневно</strong>
            <strong>9:00 – 18:00</strong>
            <strong>Вс: выходной</strong>
          </AnimatedText>
        </div>

        <div className={styles.cardsColumn}>
          <AnimatedText as="div" active={active} delay={280} className={styles.actionRow}>
            <a href="tel:+79288958095" className={styles.primaryButton}>
              Позвонить
            </a>
            <a href="https://wa.me/79288958095" target="_blank" rel="noreferrer" className={styles.whatsappButton}>
              WhatsApp
            </a>
          </AnimatedText>
          {contactCards.map((card, index) => (
            <AnimatedText
              key={card.title}
              as="a"
              active={active}
              delay={120 + index * 90}
              className={styles.contactCard}
              href={card.href}
              target={card.href.startsWith("http") ? "_blank" : undefined}
              rel={card.href.startsWith("http") ? "noreferrer" : undefined}
            >
              <span className={styles.cardLabel}>{card.title}</span>
              <strong className={styles.cardValue}>{card.value}</strong>
            </AnimatedText>
          ))}

          <AnimatedText as="button" active={active} delay={420} className={styles.resetButton} onClick={onReset}>
            Главная страница
          </AnimatedText>
        </div>
      </div>
    </div>
  );
}
