import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { MemorySpark } from '../components/MemorySpark';

export function SparkPage() {
  const now = useMemo(() => new Date(), []);
  return (
    <div>
      <div className="reader-top">
        <Link className="back-link" to="/">
          ← Back to Today
        </Link>
      </div>
      <MemorySpark now={now} />
    </div>
  );
}
