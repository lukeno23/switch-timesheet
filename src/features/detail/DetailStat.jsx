export const DetailStat = ({ label, value, sub }) => (
  <div className="flex flex-col">
    <span className="font-playfair text-stone-500 text-sm mb-1">{label}</span>
    <span className="font-dm text-2xl font-bold text-switch-secondary">{value}</span>
    {sub && <span className="font-dm text-xs text-switch-primary font-medium">{sub}</span>}
  </div>
);
