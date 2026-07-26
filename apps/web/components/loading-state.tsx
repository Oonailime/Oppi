export function LoadingState({ label = "Carregando dados" }: { label?: string }) {
  return (
    <div className="loading-state" role="status">
      <span className="loader" />
      <p>{label}</p>
    </div>
  );
}
