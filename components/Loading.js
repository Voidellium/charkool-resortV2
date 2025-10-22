import styles from './Loading.module.css';

export default function Loading({ 
  size = 'medium', 
  text = 'Loading...', 
  color = '#febe52',
  overlay = false,
  fullPage = false 
}) {
  const sizeClass = {
    small: styles.small,
    medium: styles.medium,
    large: styles.large
  }[size];

  const LoadingSpinner = () => (
    <div className={`${styles.loadingContainer} ${fullPage ? styles.fullPage : ''}`}>
      <div 
        className={`${styles.spinner} ${sizeClass}`}
        style={{ 
          borderTopColor: color,
          borderRightColor: color
        }}
      ></div>
      {text && <div className={styles.loadingText}>{text}</div>}
    </div>
  );

  if (overlay) {
    return (
      <div className={styles.overlay}>
        <LoadingSpinner />
      </div>
    );
  }

  return <LoadingSpinner />;
}

// Specialized loading variants
export function TableLoading({ text = 'Loading data...' }) {
  return (
    <tr>
      <td colSpan="100%" className={styles.tableLoadingCell}>
        <Loading size="medium" text={text} />
      </td>
    </tr>
  );
}

export function CardLoading({ text = 'Loading...' }) {
  return (
    <div className={styles.cardLoading}>
      <Loading size="small" text={text} />
    </div>
  );
}

export function ButtonLoading({ size = 'small', color = '#ffffff' }) {
  return (
    <div 
      className={`${styles.spinner} ${styles[size]}`}
      style={{ 
        borderTopColor: color,
        borderRightColor: color,
        borderBottomColor: 'transparent',
        borderLeftColor: 'transparent'
      }}
    ></div>
  );
}