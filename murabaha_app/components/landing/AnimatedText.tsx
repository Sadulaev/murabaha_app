import {
  type CSSProperties,
  type ComponentPropsWithoutRef,
  type ElementType,
  type ReactNode,
} from "react";
import styles from "./AnimatedText.module.css";

type AnimatedTextProps<T extends ElementType> = {
  as?: T;
  active: boolean;
  delay?: number;
  className?: string;
  children: ReactNode;
};

export function AnimatedText<T extends ElementType = "div">({
  as,
  active,
  delay = 0,
  className,
  children,
  style,
  ...restProps
}: AnimatedTextProps<T> & Omit<ComponentPropsWithoutRef<T>, keyof AnimatedTextProps<T>>) {
  const Component = as ?? "div";
  const resolvedClassName = [styles.reveal, active ? styles.visible : "", className]
    .filter(Boolean)
    .join(" ");

  return (
    <Component
      {...restProps}
      className={resolvedClassName}
      style={{ ...(style as CSSProperties), transitionDelay: `${delay}ms` }}
    >
      {children}
    </Component>
  );
}
