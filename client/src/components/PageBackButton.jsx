export default function PageBackButton({ onClick }) {
  return (
    <button className="back-btn premium-back-btn" onClick={onClick}>
      <span className="back-btn-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M14.5 6.5L9 12l5.5 5.5" />
        </svg>
      </span>
    </button>
  );
}