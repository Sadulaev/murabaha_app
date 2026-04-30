import styles from "./NavigationDots.module.css";

type NavigationDotsProps = {
  activeIndex: number;
  onSelect: (index: number) => void;
};

const labels = ["Условия", "Калькулятор", "Контакты"];

export function NavigationDots({ activeIndex, onSelect }: NavigationDotsProps) {
  return (
    <div className={styles.wrapper} aria-label="Навигация по секциям">
      {labels.map((label, index) => (
        <button
          key={label}
          type="button"
          className={index === activeIndex ? `${styles.dot} ${styles.active}` : styles.dot}
          onClick={() => onSelect(index)}
          aria-label={label}
          aria-current={index === activeIndex}
        >
          <span className="srOnly">{label}</span>
        </button>
      ))}
    </div>
  );
}
