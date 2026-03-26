type BadgeProps = {
  status: 'Por Revisar' | 'Enviada' | 'Rechazada' | 'Aprobada';
};

export default function Badge({ status }: BadgeProps) {
  let colorStyles = '';

  switch (status) {
    case 'Por Revisar':
      colorStyles = 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20';
      break;
    case 'Enviada':
    case 'Aprobada':
      colorStyles = 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20';
      break;
    case 'Rechazada':
      colorStyles = 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20';
      break;
    default:
      colorStyles = 'bg-gray-500/10 text-gray-500 border-gray-500/20';
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${colorStyles}`}
    >
      {status}
    </span>
  );
}
