import "./Skeleton.css";

export function Skeleton({
  width,
  height,
  borderRadius = "4px",
  className = "",
}) {
  return (
    <div
      className={`skeleton-base ${className}`}
      style={{ width, height, borderRadius }}
    />
  );
}

export function BookCardSkeleton() {
  return (
    <div className="skeleton-card">
      <Skeleton width="100%" height="100%" borderRadius="16px" />
    </div>
  );
}

export function GenreCardSkeleton() {
  return (
    <div className="skeleton-genre">
      <Skeleton width="40px" height="40px" borderRadius="10px" />
      <div className="skeleton-genre-info">
        <Skeleton width="100px" height="14px" className="mb-1" />
        <Skeleton width="60px" height="10px" />
      </div>
    </div>
  );
}
