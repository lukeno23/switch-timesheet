import { Card } from '../../shared/components/Card.jsx';

export const StatCard = ({ label, value, sub, onClick }) => (
  <Card onClick={onClick}>
    <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">{label}</p>
    <p className="text-3xl font-bold text-switch-secondary font-dm">{value}</p>
    {sub && <p className="text-sm text-switch-primary font-medium mt-1">{sub}</p>}
  </Card>
);
