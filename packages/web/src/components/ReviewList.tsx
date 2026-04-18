import type { Review } from '../api/types';
import Badge from './Badge';

export interface ReviewListProps {
  reviews: Review[];
  onSelect?: (r: Review) => void;
  emptyMessage?: string;
}

const ReviewList = ({ reviews, onSelect, emptyMessage }: ReviewListProps) => {
  if (reviews.length === 0) {
    return <p className="muted">{emptyMessage ?? 'No unresolved findings.'}</p>;
  }
  return (
    <ul className="review-list">
      {reviews.map((r) => (
        <li
          key={r.id}
          className={`review-item severity-${r.severity}`}
          onClick={() => onSelect?.(r)}
        >
          <div className="review-head">
            <Badge kind="severity" value={r.severity} />
            <span className="review-category">{r.category}</span>
            {r.node_id && <span className="review-target">{r.node_id}</span>}
            {r.cr_id && <span className="review-target">{r.cr_id}</span>}
          </div>
          <div className="review-message">{r.message}</div>
        </li>
      ))}
    </ul>
  );
};

export default ReviewList;
