import Image from "next/image";
import styles from "./BrandMark.module.css";

type BrandMarkProps = {
  onClick: () => void;
};

export function BrandMark({ onClick }: BrandMarkProps) {
  return (
    <button type="button" className={styles.badge} onClick={onClick} aria-label="К первому экрану">
      <Image src="/assets/murabaha-logo.png" alt="Murabaha" width={100} height={38} priority />
    </button>
  );
}
