import { CircleAlert } from "lucide-react";

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="error-state" role="alert">
      <CircleAlert size={24} />
      <div>
        <strong>Não foi possível carregar</strong>
        <p>{message}</p>
      </div>
      {onRetry && (
        <button className="button secondary small" type="button" onClick={onRetry}>
          Tentar novamente
        </button>
      )}
    </div>
  );
}
