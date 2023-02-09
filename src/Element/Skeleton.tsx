import "./Skeleton.css";

interface ISkepetonProps {
  children?: React.ReactNode;
  loading?: boolean;
  width?: string;
  height?: string;
  margin?: string;
}

export default function Skeleton({ children, width, height, margin, loading = true }: ISkepetonProps) {
  if (!loading) {
    return <>{children}</>;
  }

  return (
    <div className="skeleton" style={{ width: width, height: height, margin: margin }}>
      {children}
    </div>
  );
}
