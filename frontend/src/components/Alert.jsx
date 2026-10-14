import React from 'react';
import { AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

const variants = {
  error:   { bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-800',    Icon: AlertCircle },
  success: { bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-800',  Icon: CheckCircle },
  info:    { bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-800',   Icon: Info },
  warning: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-800', Icon: AlertTriangle },
};

export default function Alert({ type = 'info', message, className = '' }) {
  if (!message) return null;
  const { bg, border, text, Icon } = variants[type] || variants.info;
  return (
    <div className={`flex items-start gap-2 p-3 rounded-lg border ${bg} ${border} ${text} text-sm ${className}`}>
      <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}

