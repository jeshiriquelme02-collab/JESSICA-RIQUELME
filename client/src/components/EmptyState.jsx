export default function EmptyState({ icon: Icon, title, text, children }) {
  return (
    <div className="empty">
      {Icon && (
        <div className="empty-icon">
          <Icon size={28} strokeWidth={1.8} />
        </div>
      )}
      <h3>{title}</h3>
      {text && <p className="muted">{text}</p>}
      {children}
    </div>
  );
}
