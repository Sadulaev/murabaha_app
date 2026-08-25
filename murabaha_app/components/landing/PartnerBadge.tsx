import styles from "./PartnerBadge.module.css";

type PartnerBadgeProps = {
  name: string;
};

export function PartnerBadge({ name }: PartnerBadgeProps) {
  return (
    <div className={styles.badge} aria-label={`Партнёр: ${name}`}>
      <span className={styles.label}>Партнёр</span>
      <strong className={styles.name}>{name}</strong>
    </div>
  );
}
